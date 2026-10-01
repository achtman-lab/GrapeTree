const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const fixture = (name) => path.join(__dirname, 'review-fixtures', name);
const fixtureText = (name) => fs.readFileSync(fixture(name), 'utf8');
const staticBaseUrl = process.env.GRAPETREE_REVIEW_STATIC_URL || 'http://127.0.0.1:8001';
const evidenceDir = process.env.GRAPETREE_REVIEW_EVIDENCE ||
  path.join(__dirname, '..', '..', 'test-results', 'review', 'evidence');

function evidencePath(name) {
  fs.mkdirSync(evidenceDir, { recursive: true });
  return path.join(evidenceDir, name);
}

function errors(page) {
  const observed = [];
  page.on('pageerror', (error) => observed.push(error.message));
  return observed;
}

async function loadFile(page, name) {
  await page.locator('#button-files').click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  const chooser = await chooserEvent;
  await chooser.setFiles(fixture(name));
}

async function pasteText(page, text) {
  await page.locator('#button-files').click();
  await page.locator('#paste-text').fill(text);
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
}

async function loadedIds(page, ids) {
  await expect.poll(() => page.evaluate(() =>
    window.the_tree?.force_nodes?.map((node) => node.id).filter((id) => !id.startsWith('_hypo_')).sort() || []
  ), { timeout: 20_000 }).toEqual([...ids].sort());
  await expect(page.locator('#mst-svg')).toBeVisible();
}

async function openPanel(page, id) {
  if (!(await page.locator(`#${id}-panel`).isVisible())) {
    await page.locator(`#${id}`).click();
  }
}

async function saveFromButton(page, selector, suggestedName) {
  await page.locator(selector).click();
  await expect(page.locator('#filename')).toHaveValue(suggestedName);
  const event = page.waitForEvent('download');
  await page.locator('#savedailog').getByRole('button', { name: 'Save' }).click();
  return event;
}

const ids = ['case_a', 'case_b', 'case_c', 'case_d'];
const reviewDataDir = process.env.GRAPETREE_REVIEW_DATA;

test('file chooser, paste and drop load Newick and Nexus trees', async ({ page }) => {
  const pageErrors = errors(page);
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await expect(page.locator('#headertag')).toHaveText('outbreak.nwk');

  await pasteText(page, fixtureText('outbreak.nex'));
  await loadedIds(page, ids);

  await page.locator('#graph-div').dispatchEvent('drop', {
    dataTransfer: await page.evaluateHandle((text) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([text], 'dropped.nwk', { type: 'text/plain' }));
      return transfer;
    }, '(drop_a:1,drop_b:2);'),
  });
  await loadedIds(page, ['drop_a', 'drop_b']);
  expect(pageErrors).toEqual([]);
});

test('profile calculation through visible chooser and parameter dialog', async ({ page }) => {
  const pageErrors = errors(page);
  const treeRequests = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/maketree')) treeRequests.push(request);
  });
  await page.goto('/');
  await loadFile(page, 'outbreak.profile');
  await expect(page.locator('#modal-title')).toHaveText('Parameters For Tree Creation');
  await page.locator('#method-select').selectOption('MSTreeV2');
  await page.locator('#modal-ok-button').click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await loadedIds(page, ids);
  expect(treeRequests.some((request) => request.method() === 'POST')).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('metadata colours, labels, pies, table filter and exports round trip', async ({ page, context }) => {
  const pageErrors = errors(page);
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await expect(page.locator('#metadata-select option[value="Country"]')).toHaveCount(1);
  await openPanel(page, 'tree-menu');
  await openPanel(page, 'mst-node-menu');
  await expect(page.locator('#metadata-select')).toHaveValue('Country');
  await page.locator('#show-individual-segments').check();
  await page.locator('#show-all-node-labels').check();
  await page.locator('#node-label-text').selectOption('ID');
  await page.locator('#metadata-select').selectOption('Source');
  await expect.poll(() => page.evaluate(() => window.the_tree?.display_category)).toBe('Source');

  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await expect(page.locator('#metadata-div')).toBeVisible();
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(4);
  await page.screenshot({ path: evidencePath('metadata-table-and-coloured-tree.png') });
  const filter = page.locator('#myGrid .slick-headerrow-column input').last();
  await filter.fill('2024');
  await filter.press('Tab');
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(1);
  await page.locator('#metadata-filter').click();
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(4);

  await page.locator('#metadata-close').click();
  await expect(page.locator('#metadata-div')).toBeHidden();
  const json = await saveFromButton(page, '#save-tree-json', 'ms_tree.json');
  const jsonPath = await json.path();
  const saved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  await json.saveAs(evidencePath('saved-grapetree.json'));
  expect(JSON.stringify(saved)).toContain('case_a');
  expect(JSON.stringify(saved)).toContain('Country');

  const newick = await saveFromButton(page, '#save-tree-nwk', 'ms_tree.nwk');
  const newickText = fs.readFileSync(await newick.path(), 'utf8');
  await newick.saveAs(evidencePath('saved-tree.nwk'));
  expect(newickText.trim()).toMatch(/;$/);
  for (const id of ids) expect(newickText).toContain(id);

  const svg = await saveFromButton(page, '#mst-download-svg', 'MSTree.svg');
  const svgText = fs.readFileSync(await svg.path(), 'utf8');
  await svg.saveAs(evidencePath('saved-tree.svg'));
  expect(svgText).toContain('<svg');

  const reopened = await context.newPage();
  await reopened.goto('/');
  await reopened.locator('#button-files').click();
  const chooserEvent = reopened.waitForEvent('filechooser');
  await reopened.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles({ name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(saved)) });
  await loadedIds(reopened, ids);
  await expect.poll(() => reopened.evaluate(() => window.the_tree?.metadata?.case_a?.Country)).toBe('UK');
  expect(pageErrors).toEqual([]);
});

test('branch controls, zoom, redraw, tree recovery and invalid input', async ({ page }) => {
  const pageErrors = errors(page);
  await page.goto('/');
  await pasteText(page, fixtureText('outbreak.nwk'));
  await loadedIds(page, ids);
  await openPanel(page, 'tree-menu');
  await openPanel(page, 'mst-link-menu');
  await page.locator('#spinner-link-length').fill('2');
  await page.locator('#spinner-link-length').press('Enter');
  await page.locator('#handle-long-branch-hide').check();
  await expect.poll(() => page.evaluate(() => Number(window.the_tree?.hide_link_length))).toBe(2);
  await page.locator('#handle-long-branch-cap').check();
  await expect.poll(() => page.evaluate(() => Number(window.the_tree?.max_link_length))).toBe(2);
  await page.locator('#handle-long-branch-display').check();
  await page.locator('#link-log-scale').check();
  await page.locator('#show-link-labels').check();
  await page.locator('#spinner-collapse-nodes').fill('1');
  await page.locator('#spinner-collapse-nodes').press('Enter');
  await expect.poll(() => page.evaluate(() => window.the_tree?.node_collapsed_value)).toBe(1);
  await page.locator('.glyphicon-zoom-in').click();
  await page.locator('.glyphicon-zoom-out').click();
  await page.locator('#center-graph-button').click();
  await page.locator('#button-refresh').click();
  await page.locator('#button-goback').click();
  await loadedIds(page, ids);

  await pasteText(page, '(broken;');
  await expect(page.locator('#waiting-information')).toContainText('Unable to load tree');
  await page.locator('#information-div .close').click();
  await pasteText(page, fixtureText('outbreak.nwk'));
  await loadedIds(page, ids);
  expect(pageErrors).toEqual([]);
});

test('static visualiser loads a tree and explains profile calculation boundary', async ({ page }) => {
  await page.goto(`${staticBaseUrl}/MSTree_holder.html`);
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.profile');
  await expect(page.locator('#waiting-information')).toContainText('Tree calculation is unavailable on this static page');
});

test('browser WASM profile uses visible upload and never calls Flask', async ({ page }) => {
  const backendRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/maketree')) backendRequests.push(request.url());
  });
  await page.goto(`${staticBaseUrl}/browser-wasm/`);
  const frame = page.frameLocator('#visualiser');
  await frame.locator('#button-files').click();
  const chooserEvent = page.waitForEvent('filechooser');
  await frame.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(fixture('outbreak.profile'));
  await expect(frame.locator('#modal-title')).toHaveText('Parameters For Tree Creation');
  await frame.locator('#modal-ok-button').click();
  await expect.poll(() => page.evaluate(() => window.lastGrapeTreeResult?.newick || ''), { timeout: 30_000 }).toContain(';');
  await expect.poll(() => frame.locator('#graph-div .node').count()).toBeGreaterThanOrEqual(4);
  expect(backendRequests).toEqual([]);
});

test('real Yersinia cgMLST sample calculates in Flask and browser WASM', async ({ page }) => {
  test.setTimeout(90_000);
  test.skip(!reviewDataDir, 'Set GRAPETREE_REVIEW_DATA to the frozen review dataset directory');
  const profilePath = path.join(reviewDataDir, 'samples', 'Yersinia.n10.s7.profile');
  const metadataPath = path.join(reviewDataDir, 'scenarios', 'Yersinia.n10.s7.metadata.tsv');
  test.skip(!fs.existsSync(profilePath) || !fs.existsSync(metadataPath), 'Download the versioned review dataset first');
  const realIds = fs.readFileSync(profilePath, 'utf8').trim().split(/\r?\n/).slice(1)
    .map((line) => line.split('\t')[0]);

  await page.goto('/');
  await page.locator('#button-files').click();
  let chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(profilePath);
  await expect(page.locator('#modal-title')).toHaveText('Parameters For Tree Creation');
  await page.locator('#method-select').selectOption('MSTreeV2');
  await page.locator('#modal-ok-button').click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await loadedIds(page, realIds);

  await page.locator('#button-files').click();
  chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(metadataPath);
  await expect(page.locator('#metadata-select option[value="Country"]')).toHaveCount(1);
  await expect.poll(() => page.evaluate((id) => window.the_tree?.metadata?.[id]?.Country, realIds[0])).not.toBeFalsy();

  const browserPage = await page.context().newPage();
  await browserPage.goto(`${staticBaseUrl}/browser-wasm/`);
  const frame = browserPage.frameLocator('#visualiser');
  await frame.locator('#button-files').click();
  chooserEvent = browserPage.waitForEvent('filechooser');
  await frame.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(profilePath);
  await frame.locator('#modal-ok-button').click();
  await expect.poll(() => browserPage.evaluate(() => window.lastGrapeTreeResult?.names?.length || 0), { timeout: 45_000 }).toBe(10);
  const wasmIds = await browserPage.evaluate(() => window.lastGrapeTreeResult.names.slice().sort());
  expect(wasmIds).toEqual(realIds.sort());
});

test('malformed profile error leaves upload workflow recoverable', async ({ page }) => {
  await page.goto('/');
  await page.locator('#button-files').click();
  const chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles({
    name: 'malformed.profile',
    mimeType: 'text/plain',
    buffer: Buffer.from('#Strain\tA\tB\na\t1\t1\nb\t2\n'),
  });
  await expect(page.locator('#modal-title')).toHaveText('Parameters For Tree Creation');
  await page.locator('#modal-ok-button').click();
  await expect(page.getByText('There server returned an error. Is the profile file in the right format?')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByText('There server returned an error. Is the profile file in the right format?')).toBeHidden();
  await pasteText(page, fixtureText('outbreak.nwk'));
  await loadedIds(page, ids);
});

test('table selection, selected-only view and cell editing reach the tree', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(4);

  const firstRow = page.locator('#myGrid .slick-row').first();
  await firstRow.locator('.slick-cell').first().click();
  await expect.poll(() => page.evaluate(() => window.the_tree?.force_nodes?.find((n) => n.id === 'case_a')?.selected)).toBe(true);
  await page.locator('#selected-only').check();
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(1);
  await page.locator('#selected-only').uncheck();

  const country = firstRow.locator('.slick-cell').nth(4);
  await country.dblclick();
  const editor = page.locator('#myGrid .slick-row').first().locator('.slick-cell').nth(4).locator('input');
  await editor.fill('Spain');
  await editor.press('Enter');
  await expect.poll(() => page.evaluate(() => window.the_tree?.metadata?.case_a?.Country)).toBe('Spain');
  await expect(page.locator('#legend-svg')).toBeVisible();
  const tableDownload = await saveFromButton(page, '#metadata-download', 'metadata.txt');
  const metadataText = fs.readFileSync(await tableDownload.path(), 'utf8');
  await tableDownload.saveAs(evidencePath('edited-metadata.txt'));
  expect(metadataText).toContain('Spain');
  expect(metadataText).toContain('case_a');
});

test('metadata table remains fully on screen and its close icon works at narrow width', async ({ page }) => {
  await page.setViewportSize({ width: 600, height: 800 });
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  const tableBounds = await page.locator('#metadata-div').boundingBox();
  expect(tableBounds.x).toBeGreaterThanOrEqual(0);
  expect(tableBounds.x + tableBounds.width).toBeLessThanOrEqual(600);
  await page.locator('#metadata-close').click();
  await expect(page.locator('#metadata-div')).toBeHidden();
});

test('MicroReact button prepares tree and metadata without contacting external service', async ({ page }) => {
  let submitted;
  await page.route('https://example.invalid/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.route('**/sendToMicroReact', async (route) => {
    submitted = new URLSearchParams(route.request().postData());
    await route.fulfill({ status: 200, contentType: 'text/plain', body: 'https://example.invalid/project' });
  });
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await page.locator('#show-in-microreact').click();
  await expect.poll(() => Boolean(submitted)).toBe(true);
  expect(submitted.get('tree')).toContain('case_a');
  expect(submitted.get('metadata')).toContain('Country');
});

test('add a metadata column, edit it, export and reimport it', async ({ page, context }) => {
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await page.locator('#metadata-add-icon').click();
  await page.locator('#metadata-add-colname').fill('ReviewNote');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('#myGrid .slick-header-column').filter({ hasText: 'ReviewNote' })).toHaveCount(1);

  const reviewCell = page.locator('#myGrid .slick-row').first().locator('.slick-cell').nth(7);
  await reviewCell.dblclick();
  const editor = reviewCell.locator('input');
  await editor.fill('checked');
  await editor.press('Enter');
  await expect.poll(() => page.evaluate(() => window.the_tree?.metadata?.case_a?.ReviewNote)).toBe('checked');
  const tableDownload = await saveFromButton(page, '#metadata-download', 'metadata.txt');
  const saved = fs.readFileSync(await tableDownload.path(), 'utf8');
  expect(saved).toContain('ReviewNote');
  expect(saved).toContain('checked');

  const reopened = await context.newPage();
  await reopened.goto('/');
  await loadFile(reopened, 'outbreak.nwk');
  await loadedIds(reopened, ids);
  await reopened.locator('#button-files').click();
  const chooserEvent = reopened.waitForEvent('filechooser');
  await reopened.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles({ name: 'review-metadata.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(saved) });
  await expect.poll(() => reopened.evaluate(() => window.the_tree?.metadata?.case_a?.ReviewNote)).toBe('checked');
});

test('legend palette, labels, tooltip and figure legend controls', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await openPanel(page, 'tree-menu');
  await openPanel(page, 'mst-node-menu');
  await page.locator('#show-node-labels').check();
  await page.locator('#spinner-node-fontsize').fill('18');
  await page.locator('#spinner-node-fontsize').press('Enter');
  await expect(page.locator('#graph-div .node-group-number').first()).toHaveAttribute('font-size', '18');
  await page.locator('#show-node-labels').uncheck();
  await page.locator('#case_a .node-paths').hover();
  await expect(page.locator('body > .tooltip')).toContainText('UK');

  await expect(page.locator('#legend-svg .legend-item')).toHaveCount(3);
  await page.locator('#legend-svg .legend-item circle').first().click();
  await expect(page.locator('.sp-container:visible')).toBeVisible();
  await page.locator('.sp-container:visible .sp-input').fill('#ff0000');
  await page.locator('.sp-container:visible .sp-choose').click();
  await expect(page.locator('#legend-svg .legend-item circle').first()).toHaveCSS('fill', 'rgb(255, 0, 0)');

  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-legend').click();
  await expect(page.locator('#legend-svg')).toBeHidden();
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-legend').click();
  await expect(page.locator('#legend-svg')).toBeVisible();
});

test('node drag, rotation, hide selected subtree and restore whole tree', async ({ page }) => {
  await page.goto('/');
  await loadFile(page, 'outbreak.nwk');
  await loadedIds(page, ids);
  await loadFile(page, 'outbreak.metadata.tsv');
  await openPanel(page, 'tree-menu');
  const leaf = page.locator('#case_c .node-paths');
  const before = await page.evaluate(() => {
    const node = window.the_tree.force_nodes.find((item) => item.id === 'case_c');
    return { x: node.x, y: node.y };
  });
  const leafBox = await leaf.boundingBox();
  await page.mouse.move(leafBox.x + leafBox.width / 2, leafBox.y + leafBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(leafBox.x + leafBox.width / 2 + 30, leafBox.y + leafBox.height / 2 + 30, { steps: 6 });
  await page.mouse.up();
  const after = await page.evaluate(() => {
    const node = window.the_tree.force_nodes.find((item) => item.id === 'case_c');
    return { x: node.x, y: node.y };
  });
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(1);

  const beforeRotation = await page.evaluate(() => window.the_tree.force_nodes
    .filter((node) => !node.hypothetical).map((node) => [node.id, node.x, node.y]));
  await page.locator('#rotation-icon').scrollIntoViewIfNeeded();
  await page.locator('#rotation-icon').dragTo(page.locator('#center-graph-button'), { steps: 8 });
  await expect(page.locator('#mst-svg')).toBeVisible();
  const afterRotation = await page.evaluate(() => window.the_tree.force_nodes
    .filter((node) => !node.hypothetical).map((node) => [node.id, node.x, node.y]));
  const totalMovement = beforeRotation.reduce((sum, [id, x, y]) => {
    const moved = afterRotation.find((node) => node[0] === id);
    return sum + Math.abs(moved[1] - x) + Math.abs(moved[2] - y);
  }, 0);
  expect(totalMovement).toBeGreaterThan(1);

  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .selectAll').click();
  await expect.poll(() => page.evaluate(() => window.the_tree.force_nodes.every((node) => node.selected))).toBe(true);
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .clearSelection').click();
  await expect.poll(() => page.evaluate(() => window.the_tree.force_nodes.every((node) => !node.selected))).toBe(true);

  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await page.locator('#myGrid .slick-row').first().locator('.slick-cell').first().click();
  await expect.poll(() => page.evaluate(() => window.the_tree.force_nodes.find((node) => node.id === 'case_a')?.selected)).toBe(true);
  await page.locator('#metadata-close').click();
  await page.locator('#mst-svg-x').click();
  await page.locator('#delete-node').click();
  await expect.poll(() => page.evaluate(() => window.the_tree.force_nodes.some((node) => node.id === 'case_a'))).toBe(false);
  await page.locator('#mst-svg-x').click();
  await page.locator('#show-all').click();
  await loadedIds(page, ids);
});

test('one-thousand-tip Newick rendering, metadata filtering and export', async ({ page }) => {
  test.setTimeout(120_000);
  const largeNewick = process.env.GRAPETREE_REVIEW_LARGE_NEWICK;
  test.skip(!reviewDataDir || !largeNewick || !fs.existsSync(largeNewick),
    'Set GRAPETREE_REVIEW_DATA and GRAPETREE_REVIEW_LARGE_NEWICK');
  const profilePath = path.join(reviewDataDir, 'samples', 'Salmonella.n1000.s7.profile');
  test.skip(!fs.existsSync(profilePath), 'Frozen Salmonella n1000 profile is absent');
  const sourceIds = fs.readFileSync(profilePath, 'utf8').trim().split(/\r?\n/).slice(1)
    .map((line) => line.split('\t')[0]).sort();
  expect(sourceIds).toHaveLength(1000);
  const metadata = ['ID\tCountry\tYear\tCluster', ...sourceIds.map((id, index) =>
    `${id}\t${['UK', 'France', 'Germany'][index % 3]}\t${2018 + index % 7}\tC${index % 11}`)].join('\n');

  await page.goto('/');
  await page.locator('#button-files').click();
  let chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles(largeNewick);
  await expect.poll(() => page.evaluate(() => window.the_tree?.original_nodes?.filter((id) => !id.startsWith('_hypo_')).length || 0),
    { timeout: 60_000 }).toBe(1000);
  const loaded = await page.evaluate(() => window.the_tree.original_nodes.filter((id) => !id.startsWith('_hypo_')).sort());
  expect(loaded).toEqual(sourceIds);
  await expect(page.locator('#mst-svg')).toBeVisible();

  await page.locator('#button-files').click();
  chooserEvent = page.waitForEvent('filechooser');
  await page.locator('#button-load-nwk').click();
  await (await chooserEvent).setFiles({ name: 'synthetic-n1000.tsv', mimeType: 'text/tab-separated-values', buffer: Buffer.from(metadata) });
  await expect.poll(() => page.evaluate((id) => window.the_tree?.metadata?.[id]?.Country, sourceIds[0])).toBe('UK');
  await openPanel(page, 'tree-menu');
  await openPanel(page, 'mst-node-menu');
  await page.locator('#metadata-select').selectOption('Cluster');
  await expect.poll(() => page.evaluate(() => window.the_tree?.display_category)).toBe('Cluster');
  await openPanel(page, 'right-menu');
  await page.locator('#mst-svg-x').click();
  await page.locator('#mst-svg-menu .toggle-metadata').click();
  await expect(page.locator('#metadata-div')).toBeVisible();
  const idFilter = page.locator('#myGrid .slick-headerrow-column input').nth(2);
  await idFilter.fill(sourceIds[0]);
  await idFilter.press('Tab');
  await expect(page.locator('#myGrid .slick-row')).toHaveCount(1);
  await page.locator('#metadata-close').click();

  const downloaded = await saveFromButton(page, '#save-tree-nwk', 'ms_tree.nwk');
  const savedText = fs.readFileSync(await downloaded.path(), 'utf8');
  for (const id of sourceIds) expect(savedText).toContain(id);
  await downloaded.saveAs(evidencePath('salmonella-n1000-saved.nwk'));
  await page.screenshot({ path: evidencePath('salmonella-n1000-rendered.png') });
});
