const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const fixtures = path.join(__dirname, 'review-fixtures');
const dataDir = process.env.GRAPETREE_REVIEW_DATA;

async function upload(page, file) {
  await page.locator('#button-files').click();
  const fileEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await fileEvent).setFiles(file);
}

async function sampleIds(page) {
  return page.evaluate(() => window.the_tree?.force_nodes?.map((node) => node.id)
    .filter((id) => !id.startsWith('_hypo_')).sort() || []);
}

test('common Newick, metadata and saved JSON round trip', async ({ page, context }) => {
  await page.goto('/');
  await upload(page, path.join(fixtures, 'outbreak.nwk'));
  await expect.poll(() => sampleIds(page)).toEqual(['case_a', 'case_b', 'case_c', 'case_d']);
  await upload(page, path.join(fixtures, 'outbreak.metadata.tsv'));
  await expect.poll(() => page.evaluate(() =>
    ['case_a', 'case_b', 'case_c', 'case_d'].map((id) => window.the_tree?.metadata?.[id]?.Country)
  )).toEqual(['UK', 'UK', 'France', 'Germany']);

  await page.locator('#save-tree-json').click();
  await expect(page.locator('#filename')).toHaveValue('ms_tree.json');
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#savedailog').getByRole('button', { name: 'Save' }).click();
  const downloaded = await downloadEvent;
  const payload = JSON.parse(fs.readFileSync(await downloaded.path(), 'utf8'));
  expect(JSON.stringify(payload)).toContain('case_a');

  const reopened = await context.newPage();
  await reopened.goto('/');
  await upload(reopened, { name: 'roundtrip.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload)) });
  await expect.poll(() => sampleIds(reopened)).toEqual(['case_a', 'case_b', 'case_c', 'case_d']);
  await expect.poll(() => reopened.evaluate(() =>
    ['case_a', 'case_b', 'case_c', 'case_d'].map((id) => window.the_tree?.metadata?.[id]?.Country)
  )).toEqual(['UK', 'UK', 'France', 'Germany']);
});

test('common real Yersinia cgMLST profile calculates with explicit MSTreeV2', async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!dataDir, 'Set GRAPETREE_REVIEW_DATA to the frozen review dataset directory');
  const profile = path.join(dataDir, 'samples', 'Yersinia.n10.s7.profile');
  test.skip(!fs.existsSync(profile), 'Frozen Yersinia sample is absent');
  const sourceIds = fs.readFileSync(profile, 'utf8').trim().split(/\r?\n/).slice(1)
    .map((line) => line.split('\t')[0]).sort();
  await page.goto('/');
  await upload(page, profile);
  await expect(page.locator('#modal-title')).toHaveText('Parameters For Tree Creation');
  await page.locator('#method-select').selectOption('MSTreeV2');
  await page.locator('#modal-ok-button').click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect.poll(() => sampleIds(page), { timeout: 45_000 }).toEqual(sourceIds);
});
