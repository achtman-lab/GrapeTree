const { expect, test } = require('@playwright/test');

test('loads the application shell and renders a Newick tree', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page.locator('#headertag')).toHaveText('GrapeTree');
  await expect(page.locator('#button-files')).toBeVisible();

  await page.evaluate(() => {
    loadTreeText('(alpha:1,beta:1,gamma:2);');
  });
  await page.waitForFunction(() => window.the_tree?.force_nodes?.length >= 3);

  await expect(page.locator('#graph-div .node')).toHaveCount(4);
  expect(pageErrors).toEqual([]);
});

test('calculates and displays a profile through the Flask endpoint', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#method-select')).toHaveValue('MSTreeV2');

  await page.evaluate(() => {
    profile2tree(`#Strain\tA\tB\nalpha\t1\t1\nbeta\t1\t2\ngamma\t2\t2\n`);
  });
  await page.waitForFunction(() => window.the_tree?.force_nodes?.length >= 3);

  const nodeIds = await page.evaluate(() =>
    window.the_tree.force_nodes.map(node => node.id)
  );
  expect(nodeIds).toEqual(expect.arrayContaining(['alpha', 'beta', 'gamma']));
});
