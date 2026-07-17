const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const fixture = require('../fixtures/compatibility/edmonds.json');
const expected = require('../fixtures/compatibility/expected.json');

const fixtureText = (name) => fs.readFileSync(
  path.join(__dirname, '..', 'fixtures', name),
  'utf8',
);

async function workerCalculate(page, profile, options) {
  return page.evaluate(({ profileText, calculationOptions }) => new Promise((resolve, reject) => {
    const worker = new Worker('./edmonds-worker.js');
    const id = crypto.randomUUID();
    worker.onmessage = (event) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.result);
    };
    worker.postMessage({ id, profile: profileText, options: calculationOptions });
  }), { profileText: profile, calculationOptions: options });
}

function pairwiseDistances(result) {
  const adjacency = Object.fromEntries(result.names.map((name) => [name, []]));
  for (const [source, target, weight] of result.links) {
    const left = result.names[source];
    const right = result.names[target];
    adjacency[left].push([right, weight]);
    adjacency[right].push([left, weight]);
  }
  const distances = {};
  for (let left = 0; left < result.names.length; left += 1) {
    for (let right = left + 1; right < result.names.length; right += 1) {
      const start = result.names[left];
      const finish = result.names[right];
      const pending = [[start, 0, null]];
      while (pending.length) {
        const [node, distance, parent] = pending.pop();
        if (node === finish) {
          distances[[start, finish].sort().join('|')] = distance;
          break;
        }
        for (const [next, weight] of adjacency[node]) {
          if (next !== parent) pending.push([next, distance + weight, node]);
        }
      }
    }
  }
  return distances;
}

function newickPairwiseDistances(newick) {
  const tokens = newick.match(/[^\s(),:;]+|[(),:;]/g);
  let position = 0;
  function parseNode() {
    const node = { children: [], name: null, length: 0 };
    if (tokens[position] === '(') {
      position += 1;
      do {
        node.children.push(parseNode());
        if (tokens[position] === ',') position += 1;
        else break;
      } while (position < tokens.length);
      if (tokens[position] !== ')') throw new Error('Invalid Newick fixture output');
      position += 1;
    } else {
      node.name = tokens[position];
      position += 1;
    }
    if (tokens[position] === ':') {
      position += 1;
      node.length = Number(tokens[position]);
      position += 1;
    }
    return node;
  }
  const root = parseNode();
  const adjacency = {};
  const leaves = [];
  let nextInternal = 0;
  function connect(node, parent = null) {
    const id = node.name || `__internal_${nextInternal++}`;
    adjacency[id] ||= [];
    if (node.name) leaves.push(id);
    if (parent) {
      adjacency[id].push([parent, node.length]);
      adjacency[parent].push([id, node.length]);
    }
    node.children.forEach((child) => connect(child, id));
  }
  connect(root);
  const result = {};
  for (let left = 0; left < leaves.length; left += 1) {
    for (let right = left + 1; right < leaves.length; right += 1) {
      const pending = [[leaves[left], 0, null]];
      while (pending.length) {
        const [node, distance, parent] = pending.pop();
        if (node === leaves[right]) {
          result[[leaves[left], leaves[right]].sort().join('|')] = distance;
          break;
        }
        adjacency[node].forEach(([next, weight]) => {
          if (next !== parent) pending.push([next, distance + weight, node]);
        });
      }
    }
  }
  return result;
}

test('calculates MSTreeV2 from a profile entirely in a Web Worker', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  await page.getByRole('button', { name: 'Calculate tree' }).click();

  const output = page.locator('#result');
  await expect(output).toContainText(';', { timeout: 20_000 });
  const result = await page.evaluate(() => window.lastGrapeTreeResult);

  expect(result.method).toBe('MSTreeV2');
  expect(pairwiseDistances(result)).toEqual({
    'alpha|beta': 1,
    'alpha|delta': 4,
    'alpha|gamma': 3,
    'beta|delta': 3,
    'beta|gamma': 2,
    'delta|gamma': 1,
  });
  await page.waitForFunction(() => (
    document.querySelector('#visualiser').contentWindow.the_tree?.force_nodes?.length >= 4
  ));
  const visualisedIds = await page.evaluate(() => (
    document.querySelector('#visualiser').contentWindow.the_tree.force_nodes.map((node) => node.id)
  ));
  expect(visualisedIds).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma', 'delta']));
});

test('low-level browser Edmonds output matches the native fixture', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  const edges = await page.evaluate((matrix) => new Promise((resolve, reject) => {
    const worker = new Worker('./edmonds-worker.js');
    const id = crypto.randomUUID();
    worker.onmessage = (event) => {
      if (event.data.id !== id) return;
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.edges);
    };
    worker.postMessage({ id, matrix });
  }), fixture.matrix);

  expect(edges).toEqual(fixture.edges);
});

test('standard MSTree profile calculation matches the shared fixture', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  await page.locator('#method').selectOption('MSTree');
  await page.getByRole('button', { name: 'Calculate tree' }).click();
  await expect(page.locator('#result')).toContainText(';');

  const result = await page.evaluate(() => window.lastGrapeTreeResult);
  expect(pairwiseDistances(result)).toEqual({
    'alpha|beta': 1,
    'alpha|delta': 4,
    'alpha|gamma': 3,
    'beta|delta': 3,
    'beta|gamma': 2,
    'delta|gamma': 1,
  });
});

for (const mode of ['pair_delete', 'absolute_distance', 'as_allele', 'complete_delete']) {
  test(`browser distance calculation matches ${mode} fixture`, async ({ page }) => {
    await page.goto('http://127.0.0.1:8001/browser-wasm/');
    const result = await workerCalculate(
      page,
      fixtureText('compatibility/missing.profile'),
      { method: 'distance', handleMissing: mode },
    );
    const observed = {};
    for (let left = 0; left < result.names.length; left += 1) {
      for (let right = left + 1; right < result.names.length; right += 1) {
        observed[[result.names[left], result.names[right]].sort().join('|')] = result.matrix[left][right];
      }
    }
    for (const [pair, value] of Object.entries(expected.missing_data_distances[mode])) {
      expect(observed[pair]).toBeCloseTo(value, 5);
    }
  });
}

test('issue 82 technical-replicate behaviour matches both established methods', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  const profile = fixtureText('issues/82/ST5210_problem.chew');
  const mstree = await workerCalculate(page, profile, { method: 'MSTree' });
  const mstreeV2 = await workerCalculate(page, profile, { method: 'MSTreeV2' });

  expect(pairwiseDistances(mstree)['iso1-run1|iso1-run2']).toBe(1);
  expect(pairwiseDistances(mstreeV2)['iso1-run1|iso1-run2']).toBe(17);
});

test('RapidNJ WASM matches the established backend fixture', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  const result = await workerCalculate(
    page,
    fixtureText('compatibility/basic.profile'),
    { method: 'RapidNJ', handleMissing: 'pair_delete' },
  );
  const observed = newickPairwiseDistances(result.newick);
  for (const [pair, value] of Object.entries(expected.tree_pairwise_distances.RapidNJ)) {
    expect(observed[pair]).toBeCloseTo(value, 4);
  }
});

test('browser standard NJ matches the FastME backend fixture', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  const result = await workerCalculate(
    page,
    fixtureText('compatibility/basic.profile'),
    { method: 'NJ', handleMissing: 'pair_delete' },
  );
  const observed = newickPairwiseDistances(result.newick);
  for (const [pair, value] of Object.entries(expected.tree_pairwise_distances.NJ)) {
    expect(observed[pair]).toBeCloseTo(value, 4);
  }
});
