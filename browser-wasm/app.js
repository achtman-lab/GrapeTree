'use strict';

const visualiser = document.querySelector('#visualiser');
const status = document.querySelector('#browser-status');
const WORKER_ASSET_VERSION = '3.0.0';
let activeWorker = null;
let calculationSequence = 0;

function setStatus(message, state = 'ready') {
  status.textContent = message;
  status.dataset.state = state;
}

async function calculateProfile(profile, options) {
  const sequence = ++calculationSequence;
  if (activeWorker) activeWorker.dispose();
  activeWorker = null;
  setStatus('Loading calculation files…', 'working');

  const workerUrl = new URL('./edmonds-worker.js', window.location.href);
  workerUrl.searchParams.set('v', WORKER_ASSET_VERSION);
  let runtime;
  try {
    runtime = await window.createGrapeTreeWorker(workerUrl);
  } catch (error) {
    if (sequence === calculationSequence) setStatus('Calculation files could not be loaded', 'error');
    throw error;
  }
  if (sequence !== calculationSequence) {
    runtime.dispose();
    throw new Error('Calculation replaced by a newer request');
  }
  const worker = runtime.worker;
  const id = crypto.randomUUID();
  activeWorker = runtime;
  setStatus('Calculating locally…', 'working');

  return new Promise((resolve, reject) => {
    worker.addEventListener('message', (event) => {
      if (event.data.id !== id) return;
      runtime.dispose();
      if (activeWorker === runtime) activeWorker = null;

      if (event.data.error) {
        setStatus('Local calculation failed', 'error');
        reject(new Error(event.data.error));
      } else {
        window.lastGrapeTreeResult = event.data.result;
        setStatus('Calculated locally · data stayed on this device');
        resolve(event.data.result);
      }
    });
    worker.addEventListener('error', (event) => {
      runtime.dispose();
      if (activeWorker === runtime) activeWorker = null;
      setStatus('Local calculation failed', 'error');
      reject(new Error(event.message || 'The browser worker failed'));
    });
    worker.postMessage({ id, profile, options, wasmBinaries: runtime.binaries });
  });
}

async function calculateAndDisplay(profile) {
  const grapeTree = visualiser.contentWindow;
  const method = grapeTree.$('#method-select').val();
  grapeTree.$('#information-div').modal('show');
  grapeTree.$('#waiting-information').text('Computing tree locally in this browser');

  try {
    const result = await calculateProfile(profile, {
      method,
      handleMissing: 'pair_delete',
    });
    grapeTree.tree_raw = {
      nwk: result.newick,
      layout_algorithm: grapeTree.$('#layout-select').val(),
    };
    grapeTree.$('#headertag').text(`${grapeTree.$('#headertag').text()} (${method}, browser)`);
    grapeTree.loadMSTree(grapeTree.tree_raw);
    return result;
  } catch (error) {
    grapeTree.loadFailed(error.message);
    return null;
  }
}

function installBrowserBackend() {
  const grapeTree = visualiser.contentWindow;
  if (typeof grapeTree.processProfileFile !== 'function' || typeof grapeTree.$ !== 'function') {
    setTimeout(installBrowserBackend, 50);
    return;
  }

  const originalDistributeFile = grapeTree.distributeFile;
  grapeTree.distributeFile = function distributeBrowserFile(text, filename) {
    // The static visualiser normally disables profiles when Flask is absent.
    // This entry point supplies its own calculation backend instead.
    grapeTree.cannot_connect = false;
    return originalDistributeFile.call(grapeTree, text, filename);
  };
  grapeTree.profile2check = calculateAndDisplay;
  grapeTree.profile2tree = calculateAndDisplay;
  grapeTree.cannot_connect = false;
  grapeTree.backend_unavailable_message = 'The browser calculation worker is unavailable.';

  const methodSelect = grapeTree.$('#method-select');
  methodSelect.find('option[value="ninja"]').remove();
  grapeTree.$('#check-memory').prop('checked', false).closest('label').hide();
  grapeTree.$('#show-in-microreact').hide();
  methodSelect.after('<span id="browser-method-note"> Runs locally on this device</span>');
  setStatus('Browser-only · data stays on this device');
}

// Public integration hook used by tests and future browser-only front ends.
window.calculateGrapeTreeProfile = calculateProfile;
visualiser.addEventListener('load', installBrowserBackend);
