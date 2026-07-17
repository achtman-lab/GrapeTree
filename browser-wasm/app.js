'use strict';

const example = [
  [1, 6, 5, 9],
  [4, 1, 3, 7],
  [2, 8, 1, 4],
  [6, 2, 5, 1],
];

const input = document.querySelector('#matrix');
const output = document.querySelector('#result');
const button = document.querySelector('#calculate');
input.value = JSON.stringify(example, null, 2);

button.addEventListener('click', () => {
  button.disabled = true;
  output.textContent = 'Calculating in a Web Worker…';
  let matrix;
  try {
    matrix = JSON.parse(input.value);
  } catch (error) {
    output.textContent = `Invalid JSON: ${error.message}`;
    button.disabled = false;
    return;
  }

  const worker = new Worker('./edmonds-worker.js');
  const id = crypto.randomUUID();
  worker.addEventListener('message', (event) => {
    if (event.data.id !== id) return;
    output.textContent = event.data.error || JSON.stringify(event.data.edges, null, 2);
    button.disabled = false;
    worker.terminate();
  });
  worker.postMessage({ id, matrix });
});
