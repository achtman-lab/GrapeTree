/** Scientific comparison of browser workers against the Python candidate. */
const { test, expect } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repo = path.resolve(__dirname, '../..');
const python = process.env.GRAPETREE_REVIEW_PYTHON || path.join(repo, '.venv/bin/python');
const data = process.env.GRAPETREE_REVIEW_DATA || '/private/tmp/grapetree-pr118-review/data';
const output = process.env.GRAPETREE_WASM_RESULTS || path.join(repo, 'test-results', 'wasm-review');
fs.mkdirSync(output, { recursive: true });

// The initial gate was 0.05/1e-4 for NJ and RapidNJ. Saved-output analysis
// tightened RapidNJ to the MST/matrix gate and NJ to 0.012/1e-6. NJ's gate
// remains interim while ETE root placement is validated on held-back data;
// tree topology is always checked separately from path-length tolerance.
const tolerance = {
  MSTree: { atol: 1e-5, rtol: 1e-6 },
  MSTreeV2: { atol: 1e-5, rtol: 1e-6 },
  NJ: { atol: 0.012, rtol: 1e-6 },
  RapidNJ: { atol: 1e-5, rtol: 1e-6 },
  distance: { atol: 1e-5, rtol: 1e-6 },
};

const species = ['Salmonella', 'Escherichia', 'Yersinia'];
const defaultCases = [
  ...species.map((name) => ({ label: `${name}.n10.s19`, file: path.join(data, 'samples', `${name}.n10.s19.profile`) })),
  ...species.map((name) => ({ label: `${name}.n50.s19`, file: path.join(data, 'samples', `${name}.n50.s19.profile`) })),
  { label: 'synthetic_outbreak', file: path.join(data, 'scenarios', 'synthetic_outbreak.profile') },
];
// A JSON array of {label,file} objects lets the lead rerun held-back species,
// sizes, and seeds without editing the comparison code or its tolerances.
const cases = process.env.GRAPETREE_WASM_CASES
  ? JSON.parse(process.env.GRAPETREE_WASM_CASES)
  : defaultCases;
const methods = ['MSTreeV2', 'MSTree', 'NJ', 'RapidNJ'];
const modes = ['pair_delete', 'complete_delete', 'as_allele', 'absolute_distance'];

function pythonReference(file, method, mode = 'pair_delete') {
  const source = `import sys\nfrom grapetree.module.MSTrees import backend\nprint(backend(profile=sys.argv[1], method=sys.argv[2], handle_missing=sys.argv[3], n_proc=1))`;
  const child = spawnSync(python, ['-c', source, file, method, mode], {
    cwd: repo, encoding: 'utf8', timeout: 120_000, maxBuffer: 20 * 1024 * 1024,
  });
  if (child.error || child.status !== 0) {
    throw new Error(`Python ${method} ${file}: ${child.error || child.stderr}`);
  }
  return child.stdout.trim();
}

async function workerCalculate(page, profile, options) {
  return page.evaluate(({ text, options }) => new Promise((resolve, reject) => {
    const worker = new Worker('./edmonds-worker.js');
    const id = crypto.randomUUID();
    worker.onmessage = (event) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message || 'Browser worker failed'));
    };
    worker.postMessage({ id, profile: text, options });
  }), { text: profile, options });
}

function matrixAsPhylip(result) {
  const lines = [`    ${result.names.length}`];
  result.names.forEach((name, index) => {
    lines.push(`${name} ${result.matrix[index].map((value) => Number(value).toFixed(6)).join(' ')}`);
  });
  return `${lines.join('\n')}\n`;
}

function compare(kind, expected, observed, options, stem) {
  const expectedPath = path.join(output, `${stem}.python.${kind === 'tree' ? 'nwk' : 'phy'}`);
  const observedPath = path.join(output, `${stem}.browser.${kind === 'tree' ? 'nwk' : 'phy'}`);
  fs.writeFileSync(expectedPath, `${expected.trim()}\n`);
  fs.writeFileSync(observedPath, `${observed.trim()}\n`);
  const command = [path.join(repo, 'review/harness/compare_outputs.py'), kind,
    expectedPath, observedPath, '--atol', String(options.atol), '--rtol', String(options.rtol)];
  const child = spawnSync(python, command, {
    cwd: repo, encoding: 'utf8', timeout: 120_000, maxBuffer: 20 * 1024 * 1024,
  });
  if (child.error) throw child.error;
  if (![0, 1].includes(child.status)) throw new Error(child.stderr);
  const report = JSON.parse(child.stdout);
  if (kind === 'tree' && stem.endsWith('.NJ')) {
    const precision = spawnSync(python,
      [path.join(repo, 'review/wasm_precision.py'), expectedPath, observedPath],
      { cwd: repo, encoding: 'utf8', timeout: 120_000, maxBuffer: 20 * 1024 * 1024 });
    if (precision.error || ![0, 1].includes(precision.status)) {
      throw new Error(`NJ edge comparison failed: ${precision.error || precision.stderr}`);
    }
    report.edge_precision = JSON.parse(precision.stdout);
    report.pass = report.pass && report.edge_precision.pass;
  }
  fs.writeFileSync(path.join(output, `${stem}.comparison.json`), JSON.stringify(report, null, 2));
  return report;
}

for (const fixture of cases) {
  for (const method of methods) {
    test(`${fixture.label} ${method} browser/Python tree parity`, async ({ page }) => {
      test.setTimeout(120_000);
      const profile = fs.readFileSync(fixture.file, 'utf8');
      const expected = pythonReference(fixture.file, method);
      await page.goto('/browser-wasm/');
      const result = await workerCalculate(page, profile, { method, handleMissing: 'pair_delete' });
      const report = compare('tree', expected, result.newick, tolerance[method], `${fixture.label}.${method}`);
      expect(report, JSON.stringify(report.differences.slice(0, 4))).toMatchObject({ pass: true });
    });
  }
}

const distanceCases = process.env.GRAPETREE_WASM_CASES
  ? cases
  : cases.filter(({ label }) => label.includes('n10') || label === 'synthetic_outbreak');
for (const fixture of distanceCases) {
  for (const mode of modes) {
    test(`${fixture.label} ${mode} full distance matrix parity`, async ({ page }) => {
      test.setTimeout(120_000);
      const profile = fs.readFileSync(fixture.file, 'utf8');
      const expected = pythonReference(fixture.file, 'distance', mode);
      await page.goto('/browser-wasm/');
      const result = await workerCalculate(page, profile, { method: 'distance', handleMissing: mode });
      const report = compare('distance', expected, matrixAsPhylip(result), tolerance.distance,
        `${fixture.label}.distance.${mode}`);
      expect(report, JSON.stringify(report.differences.slice(0, 4))).toMatchObject({ pass: true });
    });
  }
}
