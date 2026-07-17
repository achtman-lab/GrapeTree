/* global createEdmonds, createRapidNJ, importScripts */
'use strict';

const assetVersion = new URL(self.location.href).searchParams.get('v') || 'development';

function versionedAsset(relativePath) {
  const url = new URL(relativePath, self.location.href);
  url.searchParams.set('v', assetVersion);
  return url.href;
}

function importWorkerAsset(relativePath) {
  const url = versionedAsset(relativePath);
  try {
    importScripts(url);
  } catch (error) {
    // A newly promoted static deployment can briefly meet a stale edge/browser
    // cache entry. Retry only network-load failures; script errors must surface.
    if (!(error instanceof DOMException) || error.name !== 'NetworkError') throw error;
    const retryUrl = new URL(url);
    retryUrl.searchParams.set('retry', Date.now().toString());
    importScripts(retryUrl.href);
  }
}

importWorkerAsset('./vendor/edmonds/edmonds.js');
importWorkerAsset('./vendor/rapidnj/rapidnj.js');
importWorkerAsset('./browser-backend.js');

function normaliseMatrix(matrix) {
  if (!Array.isArray(matrix) || matrix.length < 2) {
    throw new Error('Distance matrix must contain at least two rows.');
  }
  const size = matrix.length;
  return matrix.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== size) {
      throw new Error(`Distance matrix row ${rowIndex + 1} must contain ${size} values.`);
    }
    return row.map((value) => {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        throw new Error('Distance matrix values must be finite numbers.');
      }
      return number;
    });
  });
}

async function calculate(matrix) {
  const rows = normaliseMatrix(matrix);
  const stdout = [];
  const stderr = [];
  const module = await createEdmonds({
    noInitialRun: true,
    locateFile: (path) => new URL(`./vendor/edmonds/${path}`, self.location.href).href,
    print: (line) => stdout.push(String(line)),
    printErr: (line) => stderr.push(String(line)),
  });
  const filename = '/distances.tsv';
  module.FS.writeFile(filename, `${rows.map((row) => row.join('\t')).join('\n')}\n`);
  module.callMain([filename]);

  const edges = stdout.filter(Boolean).map((line) => {
    const fields = line.trim().split(/\s+/).map(Number);
    if (fields.length !== 3 || fields.some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid Edmonds output: ${line}`);
    }
    return { source: fields[0], target: fields[1], weight: fields[2] };
  });
  if (edges.length !== rows.length - 1) {
    throw new Error(stderr.join('\n') || 'Edmonds did not return a complete branching.');
  }
  return edges;
}

async function calculateRapidNJ(matrix) {
  const stderr = [];
  const module = await createRapidNJ({
    noInitialRun: true,
    locateFile: (path) => new URL(`./vendor/rapidnj/${path}`, self.location.href).href,
    print: () => {},
    printErr: (line) => stderr.push(String(line)),
  });
  const input = '/distances.phy';
  const output = '/rapidnj.nwk';
  module.FS.writeFile(input, `${matrix.length}\n${matrix.map((row, index) => (
    `${index} ${row.map((value) => Number(value).toFixed(6)).join(' ')}`
  )).join('\n')}\n`);
  module.callMain(['-n', '-x', output, '-i', 'pd', input]);
  try {
    return module.FS.readFile(output, { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error(stderr.join('\n') || `RapidNJ did not create a tree: ${error.message}`);
  }
}

self.addEventListener('message', async (event) => {
  const id = event.data && event.data.id;
  try {
    if (event.data.profile !== undefined) {
      const result = await self.GrapeTreeBrowserBackend.calculateProfile(
        event.data.profile,
        event.data.options || {},
        { edmonds: calculate, rapidNJ: calculateRapidNJ },
      );
      self.postMessage({ id, result });
    } else {
      const edges = await calculate(event.data.matrix);
      self.postMessage({ id, edges });
    }
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
