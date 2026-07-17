# GrapeTree modernization notes

Last updated: 2026-07-17

This is the living handoff and decision log for the modernization work. Update
it whenever a decision, verification result, or work priority changes.

## Repository state

- Repository: `achtman-lab/GrapeTree`
- Working branch: `codex/modernize-packaging-ci`
- Draft pull request: <https://github.com/achtman-lab/GrapeTree/pull/118>
- `master` is protected. All work must continue through the branch and PR.
- Keep the established application's behaviour working while adding tests and
  fixing demonstrated defects.

## Product tracks

There are three distinct delivery tracks. Do not collapse them into one rewrite.

1. **Server/standalone GrapeTree**: the established interface backed by Python,
   Flask, and native executables. Flask may be reassessed later, but changing to
   FastAPI alone would not enable browser-only calculation.
2. **Browser-only GrapeTree**: a separate implementation under
   [`browser-wasm/`](browser-wasm/) using a Web Worker and WASM/Pyodide where
   appropriate. It must prove output compatibility against the established
   backend before it can be considered complete.
3. **Native desktop distributions**: packaged forms of the established backend
   application for macOS and Windows, with Linux continuing through wheel and
   Conda packages. These require operating-system CI and artifact smoke tests.

## Completed on this branch

- Protected `master` and created draft PR #118.
- Replaced legacy setuptools packaging with `pyproject.toml` and Hatchling.
- Added Python 3.10 through 3.14 CI and installed-wheel testing.
- Added a Conda/Bioconda recipe draft.
- Removed Python 2 support and excluded broken obsolete simulation modules from
  the wheel.
- Added backend characterisation, security, concurrency, distance, route,
  geocoding, and package tests.
- Removed user-controlled `eval`, isolated per-request backend configuration,
  fixed wgMLST selection and complete deletion, and narrowed Edmonds fallback.
- Added an initial Playwright browser gate and CI job.
- Moved the Python code into a conventional `grapetree/` package while keeping
  the root static site intact, restoring editable installs.
- Established `grapetree/_version.py` as the authoritative 2.3.0 version source
  for package metadata, the UI, and CLI `--version` output.
- Fixed the large-profile Flask 3.1 form-field regression corresponding to
  issue #115 by setting bounded 64 MiB request/form limits.
- Fixed `checkEnv` for the `distance` method, part of issue #99.
- Made web calculations single-process for current macOS/Windows spawn safety;
  CLI parallel-worker selection remains available.
- Changed the UI's out-of-box calculation default from Java-dependent NINJA to
  MSTreeV2. NINJA remains selectable and is labelled as requiring Java.
- Fixed duplicate and sanitisation-colliding taxon names being silently merged
  (issue #65). The backend now reports a deterministic input error, the Flask
  route preserves 400 and 413 status codes, and the browser displays the
  backend's duplicate-name explanation.
- Removed the Numba reflected-list call in MSTreeV2 branch recrafting (issue
  #100). `contemporary` now accepts scalar distances. The small scalar helper
  no longer uses Numba at all, removing an unnecessary LLVM runtime dependency
  and restoring installation on Intel macOS with supported Python versions.
- Expanded the installed-command tests across MSTree, MSTreeV2, NJ, RapidNJ,
  distance output, standard-input profiles, and concise invalid-input errors.
  The CLI now validates enumerated options and supports `--profile -`.
- Modernised the PyInstaller scripts and added Python 3.12 installed-package
  jobs for Windows and Intel macOS plus native application artefact jobs. Each
  packaged application must run MSTreeV2, NJ, and RapidNJ before upload.
- Replaced MSTreeV2's quadratic shortcut-coordinate allocation from issue #107
  with a column-wise selector. Randomised equivalence tests lock the legacy
  edge/tie behaviour, while a dense test proves only one edge per target is
  retained without calling `numpy.where` on the full matrix.
- Removed the retired EnteroBase proxy from linked tree/metadata loading (issue
  #112), fetching CORS-enabled source URLs directly with visible failures.
  Added valid `.tree` file loading and malformed-tree error tests so issue #97
  can no longer leave the interface indefinitely on “Loading Data”.
- Added a persisted “Show all IDs in grouped nodes” label option for issue #81,
  using the existing grouped-isolate data rather than discarding all but the
  representative ID.
- Added shared, implementation-neutral compatibility fixtures for MSTree,
  MSTreeV2, NJ, RapidNJ, and all four missing-data modes. Tree expectations use
  pairwise path distances so harmless Newick rooting/order changes do not mask
  or manufacture scientific differences; browser-WASM must use the same JSON.
- Added a supported, unprivileged Python 3.12/Gunicorn container and a CI smoke
  test that starts the server and calculates an MSTreeV2 tree, resolving the
  deployment gap in issue #111 without embedding SSH or a development server.

## Current verification

- Clean wheel and source distribution build successfully with Hatchling.
- 62 Python tests pass on Python 3.12.
- 10 Playwright/Chromium tests pass against the Flask app, covering Newick
  rendering, profile calculation, selected-subtree collapse, MicroReact export
  without metadata, exact long-branch cutoff behaviour, and visible duplicate
  taxon errors, direct linked trees, `.tree` file dispatch, and malformed-tree
  failures.
- PR #118 CI is green through the conventional-package-layout batch: Python
  3.10-3.14, distribution build and wheel smoke test, and Chromium browser
  smoke tests all pass. The first native-platform run exposed Numba's missing
  Intel macOS wheels, Windows console-script discovery, and the `.exe` suffix
  in CLI version output. The next run passed every job except the installed
  Windows version assertion; CLI output now strips executable suffixes and
  awaits one final platform rerun.
- A local unsigned Apple-silicon PyInstaller application builds and runs all
  three native backends. Its Python launcher is arm64 while the bundled macOS
  executables remain x86_64 and therefore rely on Rosetta 2. CI deliberately
  publishes an Intel macOS artefact until native backend builds exist.
- Current Python line coverage is about 61%; `grapetree.py` has no direct
  coverage. Coverage alone understates the larger risk: the legacy JavaScript
  editor previously had no project-owned browser tests.

## Known packaging/release gaps

- Standard, editable, wheel, and source-checkout installations now work. Keep
  all package assets and backend binaries covered when changing the layout.
- Code and Conda metadata now use 2.3.0 from one Python version source. The
  latest public GitHub release remains 1.5.0 until the modernization release is
  ready.
- Add trusted PyPI publishing and release automation. PyPI 2.2 has no useful
  `Requires-Python` metadata, so issue #93 is not fully resolved until a new
  release is published.
- Windows and Intel macOS CI/application jobs are now defined and must be
  validated on GitHub. The next packaging gaps are signed/notarised macOS
  `.dmg`, signed Windows installer/portable release archives, and native
  Apple-silicon builds of FastME, RapidNJ, and Edmonds.

## GitHub issue triage

Twenty-five issues were open at the 2026-07-17 audit.

- Close after the modernization release verifies them: #93, #108.
- Already answered/resolved; confirm and close with documentation links: #92,
  #103.
- Fixed with regression tests and awaiting release/closure: #65, #96, #97,
  #99, #100, #102, #107, #109, #112, #115.
- Reproduce and investigate with supplied or generated fixtures: #82, #104,
  #116.
- Features/API work: #89, #94, #101.
- Documentation/scientific guidance: #110, #117.
- Browser-only architecture: #113 is the direct static-site `/maketree` gap.
- Fixed feature awaiting release/closure: #81, #111.

Notes from representative checks:

- #115 reproduced as Flask's newer 500 KiB non-file form-field limit; a test and
  fix are now present.
- #99 still failed for `distance` estimates but not NINJA; a test and fix are now
  present.
- #100 reproduced on the current supported dependency set by calling the exact
  `contemporary` signature: Numba compiled `List(float64, True)` and emitted
  `NumbaPendingDeprecationWarning`. Passing its two values as scalars preserves
  the calculation. Since this was the only JIT-compiled helper, Numba was then
  removed rather than retaining its LLVM dependency and platform wheel gaps.
- Old PR #98 changes one collapse call from an implicit argument to `false`, but
  contains distracting whitespace edits. Its functional fix has now been
  independently reproduced, ported, and covered for #96.
- #109 was an undefined metadata grid column when exporting a tree with no
  selected category. Export now omits colours when no matching column exists.
- #102 was an equality inconsistency: “longer than X” hiding used `>= X` while
  shortening used `> X`. Both now honour the visible `> X` contract.
- #65 allowed duplicate identifiers, including collisions introduced by legacy
  name sanitisation, to reach deduplication/tree construction. These are now
  rejected before calculation with an HTTP 400 response and visible UI error.
- #112 was caused by the hard-coded EnteroBase URL proxy. GitHub, Dropbox, and
  Google Drive links are now normalised and fetched directly by the browser;
  CORS/network/parse failures are displayed instead of hanging silently.
- #107's reported failure was in a dense `numpy.where` coordinate list inside
  shortcut selection. That allocation is now linear in sample count and output
  is equivalent across random fixtures. The distance matrix itself remains
  O(n-squared); larger architectural work is still needed for extreme inputs
  and browser WASM will not make that constraint disappear by itself.

## Test expansion order

1. Add Playwright coverage for file loading, metadata loading, save/reload JSON,
   collapse/hide/shorten, selection, layout switching, MicroReact request
   formation, remote URLs, and visible error messages.
2. Add golden compatibility fixtures for MSTree, MSTreeV2, distance, NJ,
   RapidNJ, missing-data modes, duplicate taxa, and issue attachments (#82 and
   #107). Compare topology/weights appropriately rather than relying only on
   Newick text order.
3. Add CLI tests for help, version, stdin/files, output, invalid input, and all
   supported methods.
4. Add Windows/macOS runners and distinguish bundled-backend tests by platform.
5. Add separate performance tests for #107/#115 so normal CI remains fast.
6. Give browser-WASM and native backends the same compatibility-fixture suite.

## Browser-only investigation

- First proof: compile the in-repository Edmonds C++ source with Emscripten and
  compare it with native outputs in a Web Worker harness.
- Next candidates: RapidNJ and FastME after locating canonical source and
  verifying licences. Do not attempt to carry the bundled x86 binaries into the
  browser.
- Pyodide supplies NumPy, pandas, and NetworkX, but not the existing subprocess
  model. Numba is no longer a dependency. Pyodide is useful for prototyping,
  not a complete drop-in backend.
- Use triangular/chunked distance storage and a Worker. Browser `wasm32` memory
  and the existing O(n-squared) algorithms remain constraints. WASM threads
  would additionally require COOP/COEP deployment headers.

## Immediate next steps

1. Keep running the complete installed-wheel and Playwright suites for each
   implementation batch and inspect the resulting CI on PR #118.
2. Extend the shared golden topology and distance fixtures with the issue #82
   attachment before changing its scientific algorithm behaviour.
3. Add Windows/macOS CI and assess the existing native build scripts and bundled
   executable architecture/licensing.
4. Work through the issue buckets, posting clear closure/update comments only
   after fixes are pushed and verified.
5. Start the Edmonds WASM parity proof under `browser-wasm/` only after shared
   golden fixtures exist.

## Useful verification commands

Build and test both the editable checkout and installed wheel. The Hatchling
editable-layout problem was fixed by moving the package under `grapetree/`.

```bash
python -m build
python -m pip install -e .
python -m pip install --force-reinstall dist/*.whl pytest
python -m pytest -q
npm ci
npx playwright install chromium
npm run test:browser
```
