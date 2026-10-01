# Browser review: PR #118 against master

The reviewed PR source was `d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`; the frozen master source was `f993e82f9efa1ebdde938eff5c81756076bf1314`. The opt-in Playwright review suite uses visible controls, file choosers, paste, drag and drop, pointer actions, and browser downloads. Assertions inspect the resulting tree and downloaded bytes. Fixtures include a small profile, Newick, Nexus, synthetic metadata, real Yersinia cgMLSTv1 profiles, and a 1,000-tip Salmonella cgMLST tree.

**Final runs:** 17/17 candidate workflow tests passed in Chromium; 2/2 fresh-process master common-journey tests passed; 1/1 paired master/candidate UI probe passed. Results are in `/private/tmp/grapetree-pr118-review/results/browser/`.

| Journey | PR result | Master comparison |
|---|---|---|
| Import Newick with chooser, Nexus by paste, and a tree by drop | Passed; exact sample IDs retained | Trees load; a long multi-import sequence produced a `Cannot read properties of undefined (reading 'search')` console error on master |
| Upload a profile and calculate MSTreeV2 | Passed through visible parameter and estimate dialogs | Passed on a fresh master server with MSTreeV2 chosen explicitly; master's initial method is ninja, whereas the PR initially selects MSTreeV2 |
| Import metadata, join IDs, colour groups, pies, grouped labels, and legend colour editing | Passed | Basic metadata join and colouring passed; the PR's “Show all IDs in grouped nodes” control is absent on master |
| Filter/select/edit the metadata table, add a column, export and reimport metadata | Passed; exact edits and reopened bytes checked | Basic table selection/editing passed |
| Close metadata table with the real close icon at 1280px and 600px widths | Passed after the narrow layout fix | The 700px table starts at x=640 on master at 1280px, so its right edge and close icon extend to x=1340; the click fails. The PR table starts at x=290 and ends at x=990; the click succeeds |
| Branch shortening/hiding/restoration, collapse, zoom, redraw, labels, fonts, tooltip, node drag/rotation, subtree hide/restore | Passed | Common branch controls work; malformed Newick in a longer master session left “Collapsing Nodes:1” showing indefinitely |
| Download JSON, Newick, SVG and reopen JSON in a fresh page | Passed; downloaded bytes and metadata checked | Fresh master common journey passed with exact four-ID metadata join and JSON reopening |
| Static visualiser | Newick worked; profile upload showed the expected missing-backend message | Same backend boundary |
| Browser WASM | Real Yersinia n10 profile calculated with exact ten IDs and no `/maketree` request | New PR feature, so no master equivalent |
| Real Yersinia cgMLSTv1 profile and synthetic metadata | Flask and WASM results retained all ten source IDs | Fresh master MSTreeV2 common journey retained the same ten IDs |
| Malformed profile then valid tree | Clear error, dismiss and recovery passed | Main produced a clear error and recovered in a fresh session |
| MicroReact button | Visible submit journey tested with request intercepted locally | No live external publication attempted |
| 1,000-tip real Salmonella cgMLST tree | Loaded; exact leaf set, generated metadata join, table filter, category colour and Newick export passed | Scale smoke is candidate-only |

Master mutates its shared `app.config['PARAMS']` in `module/views.py`. After profile submission, a later blank `/maketree` availability request can reuse the previous profile and return 500. We restarted the master server for each final common journey. Those process-state failures are not counted as PR regressions.

The metadata table close-button bug was independently reproduced on master and corrected in the PR with a centred, viewport-clamped initial position and viewport-limited width. The paired probe records the exact geometry and successful/failed real pointer clicks in `ui-parity-probes.json`; the candidate desktop and narrow-width tests pass.

Evidence includes `candidate-final.json`, `master-common.json`, `parity-probe.json`, traces, the rendered `evidence/metadata-table-and-coloured-tree.png` and `evidence/salmonella-n1000-rendered.png`, and downloaded `evidence/saved-grapetree.json`, `saved-tree.nwk`, `saved-tree.svg`, `edited-metadata.txt`, and `salmonella-n1000-saved.nwk`. The tests assert actual bytes and fresh-page reopening, rather than treating a click alone as success.

Run the opt-in suite against local Flask and static servers:

```sh
GRAPETREE_REVIEW_BASE_URL=http://127.0.0.1:8000 \
GRAPETREE_REVIEW_STATIC_URL=http://127.0.0.1:8001 \
GRAPETREE_REVIEW_DATA=/path/to/frozen-review-data \
GRAPETREE_REVIEW_LARGE_NEWICK=/path/to/salmonella-n1000-newick \
node_modules/.bin/playwright test --config tests/browser/review.config.js \
  --grep-invert 'records baseline'
```

The small fixture tests run without downloaded species data. The paired probe also needs `GRAPETREE_REVIEW_BASELINE_URL` and `GRAPETREE_REVIEW_CANDIDATE_URL`. The evidence covers Chromium and local services. Other browser engines, live EnteroBase embedding, real MicroReact publication, and trees larger than 1,000 tips were outside this run.
