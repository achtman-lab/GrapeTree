const { defineConfig } = require('@playwright/test');
const path = require('path');

const reviewResults = path.join(__dirname, '..', '..', 'test-results', 'review');

module.exports = defineConfig({
  testDir: '.',
  testMatch: 'review*.spec.js',
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: process.env.GRAPETREE_REVIEW_RESULTS || path.join(reviewResults, 'playwright-results.json') }]],
  outputDir: process.env.GRAPETREE_REVIEW_ARTIFACTS || path.join(reviewResults, 'artifacts'),
  use: {
    baseURL: process.env.GRAPETREE_REVIEW_BASE_URL || 'http://127.0.0.1:8000',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    acceptDownloads: true,
  },
});
