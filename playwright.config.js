const os = require('os');
const { defineConfig } = require('@playwright/test');

const flaskPort = process.env.GRAPETREE_TEST_PORT || '8000';
const wasmPort = process.env.GRAPETREE_WASM_PORT || '8001';
const flaskURL = `http://127.0.0.1:${flaskPort}`;
const wasmURL = process.env.GRAPETREE_WASM_BASE_URL || `http://127.0.0.1:${wasmPort}`;

module.exports = defineConfig({
  testDir: './tests/browser',
  // Real-data review suites use downloaded archives and their own configuration.
  testIgnore: ['**/review*.spec.js', '**/wasm-review-parity.spec.js'],
  timeout: 30_000,
  use: {
    baseURL: flaskURL,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: process.env.GRAPETREE_SERVER_COMMAND ||
        `python3 -m flask --app grapetree.module:app run --port ${flaskPort}`,
      cwd: process.env.GRAPETREE_SERVER_CWD || os.tmpdir(),
      url: flaskURL,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: `python3 -m http.server ${wasmPort} --bind 127.0.0.1`,
      cwd: __dirname,
      url: `${wasmURL}/browser-wasm/`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
