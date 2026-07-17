const os = require('os');
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/browser',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:8000',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: process.env.GRAPETREE_SERVER_COMMAND ||
        'python3 -m flask --app grapetree.module:app run --port 8000',
      cwd: process.env.GRAPETREE_SERVER_CWD || os.tmpdir(),
      url: 'http://127.0.0.1:8000',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'python3 -m http.server 8001 --bind 127.0.0.1',
      cwd: __dirname,
      url: 'http://127.0.0.1:8001/browser-wasm/',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
