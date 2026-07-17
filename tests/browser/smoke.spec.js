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

test('collapses the selected subtree', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.goto('/');
  await page.evaluate(() => {
    loadTreeText('((alpha:1,beta:1):1,(gamma:1,delta:1):1);');
  });
  await page.waitForFunction(() => window.the_tree?.force_nodes?.length >= 7);

  const selectedId = await page.evaluate(() => {
    const collapsibleId = Object.values(window.the_tree.hypo_record)[0];
    const node = window.the_tree.force_nodes.find(
      candidate => candidate.id === collapsibleId
    );
    node.selected = true;
    window.the_tree._updateSelectionStatus();
    return collapsibleId;
  });
  await page.evaluate(() => document.querySelector('#collapse_node').click());

  await page.waitForFunction(
    id => window.the_tree.manual_collapsing[id] === 2,
    selectedId
  );
  expect(pageErrors).toEqual([]);
});

test('prepares a MicroReact submission when no metadata category is selected', async ({ page }) => {
  const pageErrors = [];
  let submittedForm;
  page.on('pageerror', error => pageErrors.push(error.message));
  await page.route('**/sendToMicroReact', async route => {
    submittedForm = new URLSearchParams(route.request().postData());
    await route.fulfill({
      body: 'https://example.test/microreact-project',
      contentType: 'text/plain',
      status: 200,
    });
  });
  await page.goto('/');
  await page.evaluate(() => {
    window.open = () => null;
    loadTreeText('(c:2,e:2,d:1,(a:0,b:0):0);');
  });
  await page.waitForFunction(
    () => window.metadata_grid && window.the_tree?.force_nodes?.length >= 4
  );

  await page.evaluate(() => {
    window.microReactCallbackComplete = false;
    window.metadata_grid.sendToMicroReact(
      () => { window.microReactCallbackComplete = true; },
      true
    );
  });
  await page.waitForFunction(() => window.microReactCallbackComplete);

  expect(submittedForm.get('tree')).toContain('(c:2,e:2,d:1');
  expect(JSON.parse(submittedForm.get('colors'))).toEqual({});
  expect(pageErrors).toEqual([]);
});

test('applies long-branch actions only above the selected threshold', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    loadTreeText('(equal:9,longer:10,shorter:2);');
  });
  await page.waitForFunction(() => window.the_tree?.force_nodes?.length >= 4);

  const styles = await page.evaluate(() => {
    window.the_tree.setHideLinkLength(9);
    window.the_tree.setMaxLinkLength(9);
    const observed = {};
    window.the_tree.link_elements.each(function(link) {
      observed[link.value] = {
        dash: d3.select(this).select('line').attr('stroke-dasharray'),
        opacity: Number(d3.select(this).select('line').style('opacity')),
      };
    });
    return observed;
  });

  expect(styles['9'].opacity).toBe(1);
  expect(styles['9'].dash).toBe('');
  expect(styles['10'].opacity).toBe(0);
  expect(styles['10'].dash).toBe('3,5');
});

test('shows a clear error for duplicate taxon names', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(() => {
    profile2tree(`#Strain\tA\tB\nalpha\t1\t1\nalpha\t1\t2\n`);
  });

  await expect(page.locator('#waiting-information')).toHaveText(
    'Duplicate taxon names after sanitising: alpha'
  );
});
