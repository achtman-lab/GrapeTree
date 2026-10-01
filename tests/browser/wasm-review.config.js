const path = require('path');
const fs = require('fs');
const { defineConfig } = require('@playwright/test');

const port = process.env.GRAPETREE_WASM_PORT || '8001';
const baseURL = process.env.GRAPETREE_WASM_BASE_URL || `http://127.0.0.1:${port}`;
const results = process.env.GRAPETREE_WASM_RESULTS ||
  path.resolve(__dirname, '../../test-results/wasm-review');
fs.mkdirSync(results, { recursive: true });

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'wasm-review-parity.spec.js',
  timeout: 120_000,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: path.join(results, 'playwright-final.json') }]],
  outputDir: path.join(results, 'artifacts'),
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: {
    command: `python3 -m http.server ${port} --bind 127.0.0.1`,
    cwd: path.resolve(__dirname, '../..'),
    url: `${baseURL}/browser-wasm/`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
