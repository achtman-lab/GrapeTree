/* global Worker */
'use strict';

// Download static assets in the page: some browser/network environments reject
// importScripts requests from a worker even when page requests succeed. The
// calculation still runs in a worker, with no network access needed there.
window.createGrapeTreeWorker = (() => {
  let cachedRuntime;

  async function loadRuntime(workerURL) {
    const scripts = ['vendor/edmonds/edmonds.js', 'vendor/rapidnj/rapidnj.js',
      'browser-backend.js', 'edmonds-worker.js'];
    const binaries = ['vendor/edmonds/edmonds.wasm', 'vendor/rapidnj/rapidnj.wasm'];
    const assets = await Promise.all([...scripts, ...binaries].map(async (path) => {
      const url = new URL(path, workerURL);
      url.search = workerURL.search;
      try {
        const response = await fetch(url, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return path.endsWith('.wasm') ? await response.arrayBuffer() : await response.text();
      } catch (error) {
        throw new Error(`Could not load GrapeTree's calculation files (${path}). Please reload the page and try again. ${error.message}`);
      }
    }));
    const bootstrap = `self.GRAPETREE_BUNDLED = true; self.GRAPETREE_WORKER_URL = ${JSON.stringify(workerURL.href)};\n`;
    const blob = new Blob([bootstrap, assets.slice(0, scripts.length).join('\n;\n')],
      { type: 'application/javascript' });
    return { blob, binaries: { edmonds: assets[4], rapidNJ: assets[5] } };
  }

  return async function createGrapeTreeWorker(workerURL) {
    if (!cachedRuntime || cachedRuntime.url !== workerURL.href) {
      const pending = { url: workerURL.href, promise: loadRuntime(workerURL) };
      cachedRuntime = pending;
      pending.promise.catch(() => {
        if (cachedRuntime === pending) cachedRuntime = null;
      });
    }
    const runtime = await cachedRuntime.promise;
    const url = URL.createObjectURL(runtime.blob);
    try {
      const worker = new Worker(url);
      return { worker, binaries: runtime.binaries, dispose() {
        worker.terminate();
        URL.revokeObjectURL(url);
      } };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  };
})();
