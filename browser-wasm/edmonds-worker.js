/* global createEdmonds, importScripts */
'use strict';

importScripts('./vendor/edmonds/edmonds.js');

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

self.addEventListener('message', async (event) => {
  const id = event.data && event.data.id;
  try {
    const edges = await calculate(event.data.matrix);
    self.postMessage({ id, edges });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
});
