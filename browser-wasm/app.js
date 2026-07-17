'use strict';

const example = `#Strain\tA\tB\tC
alpha\t1\t1\t1
beta\t1\t1\t2
gamma\t2\t2\t2
delta\t2\t3\t2
`;

const input = document.querySelector('#profile');
const fileInput = document.querySelector('#profile-file');
const method = document.querySelector('#method');
const output = document.querySelector('#result');
const button = document.querySelector('#calculate');
const visualiser = document.querySelector('#visualiser');
input.value = example;

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  if (file) input.value = await file.text();
});

button.addEventListener('click', () => {
  button.disabled = true;
  output.textContent = 'Calculating in a Web Worker…';
  const worker = new Worker('./edmonds-worker.js');
  const id = crypto.randomUUID();
  worker.addEventListener('message', (event) => {
    if (event.data.id !== id) return;
    if (event.data.error) {
      output.textContent = event.data.error;
    } else {
      window.lastGrapeTreeResult = event.data.result;
      output.textContent = event.data.result.newick;
      visualiser.hidden = false;
      const loadTree = () => {
        if (typeof visualiser.contentWindow.loadTreeText === 'function') {
          visualiser.contentWindow.loadTreeText(event.data.result.newick);
        } else {
          setTimeout(loadTree, 50);
        }
      };
      loadTree();
    }
    button.disabled = false;
    worker.terminate();
  });
  worker.postMessage({
    id,
    profile: input.value,
    options: { method: method.value, handleMissing: 'pair_delete' },
  });
});
