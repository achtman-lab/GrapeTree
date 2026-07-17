const { test, expect } = require('@playwright/test');
const fixture = require('../fixtures/compatibility/edmonds.json');

test('runs the Edmonds backend entirely in a Web Worker', async ({ page }) => {
  await page.goto('http://127.0.0.1:8001/browser-wasm/');
  await page.getByRole('button', { name: 'Calculate branching' }).click();

  const output = page.locator('#result');
  await expect(output).toContainText('"source"', { timeout: 20_000 });
  const edges = JSON.parse(await output.textContent());

  expect(edges).toHaveLength(fixture.matrix.length - 1);
  expect(edges).toEqual(fixture.edges);
});
