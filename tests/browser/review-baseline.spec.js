const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const treePath = path.join(__dirname, 'review-fixtures', 'outbreak.nwk');
const metadataPath = path.join(__dirname, 'review-fixtures', 'outbreak.metadata.tsv');
const resultsPath = process.env.GRAPETREE_REVIEW_PARITY_RESULTS ||
  path.join(__dirname, '..', '..', 'test-results', 'review', 'ui-parity-probes.json');

async function upload(page, file) {
  await page.locator('#button-files').click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(file);
}

async function names(page) {
  return page.evaluate(() => window.the_tree?.force_nodes?.map((node) => node.id).filter((id) => !id.startsWith('_hypo_')).sort() || []);
}

async function probe(page, baseUrl) {
  await page.goto(baseUrl);
  await upload(page, treePath);
  await expect.poll(() => names(page)).toEqual(['case_a', 'case_b', 'case_c', 'case_d']);
  await upload(page, metadataPath);
  await page.locator('#right-menu').click();
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await expect(page.locator('#metadata-div')).toBeVisible();
  await expect.poll(async () => (await page.locator('#metadata-div').boundingBox()).width).toBeGreaterThan(600);
  const tableBox = await page.locator('#metadata-div').boundingBox();
  const viewportWidth = page.viewportSize().width;
  const initiallyInViewport = tableBox.x >= 0 && tableBox.x + tableBox.width <= viewportWidth;
  let closeIconWorks = true;
  try {
    await page.locator('#metadata-close').click({ timeout: 3_000 });
    await expect(page.locator('#metadata-div')).toBeHidden({ timeout: 1_500 });
  } catch {
    closeIconWorks = false;
  }
  if (!closeIconWorks) {
    await page.locator('#myGrid .slick-row').first().click({ button: 'right' });
    await page.locator('#myGrid-menu .toggle-metadata').click();
  }

  await page.locator('#button-files').click();
  await page.locator('#paste-text').fill('(replacement_a:1,replacement_b:2);');
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect.poll(() => names(page)).toEqual(['replacement_a', 'replacement_b']);
  await upload(page, treePath);
  await page.waitForTimeout(1_000);
  const sameFileReloadWorks = (await names(page)).includes('case_a');
  return { tableBox, viewportWidth, initiallyInViewport, closeIconWorks, sameFileReloadWorks, afterRetryIds: await names(page) };
}

test('records baseline versus candidate parity for table close and same-file retry', async ({ browser }) => {
  test.skip(!process.env.GRAPETREE_REVIEW_BASELINE_URL || !process.env.GRAPETREE_REVIEW_CANDIDATE_URL,
    'Set baseline and candidate URLs for the parity probe');
  const observed = {};
  for (const [revision, baseUrl] of [
    ['master', process.env.GRAPETREE_REVIEW_BASELINE_URL],
    ['pr118', process.env.GRAPETREE_REVIEW_CANDIDATE_URL],
  ]) {
    const page = await browser.newPage();
    observed[revision] = await probe(page, baseUrl);
    await page.close();
  }
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, `${JSON.stringify(observed, null, 2)}\n`);
  expect(observed.master.initiallyInViewport).toBe(false);
  expect(observed.pr118.initiallyInViewport).toBe(true);
  expect(observed.pr118.closeIconWorks).toBe(true);
  expect(observed.pr118.sameFileReloadWorks).toBe(observed.master.sameFileReloadWorks);
});
