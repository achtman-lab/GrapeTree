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
- Fixed the large-profile Flask 3.1 form-field regression corresponding to
  issue #115 by setting bounded 64 MiB request/form limits.
- Fixed `checkEnv` for the `distance` method, part of issue #99.
- Made web calculations single-process for current macOS/Windows spawn safety;
  CLI parallel-worker selection remains available.
- Changed the UI's out-of-box calculation default from Java-dependent NINJA to
  MSTreeV2. NINJA remains selectable and is labelled as requiring Java.

## Current verification

- Clean wheel built successfully with Hatchling.
- 34 Python tests pass from the installed wheel on Python 3.12.
- 2 Playwright/Chromium tests pass against the installed-wheel Flask app:
  loading/rendering Newick and calculating/rendering a profile through
  `/maketree`.
- Previous CI on PR #118 was green across Python 3.10-3.14 before the latest
  local additions. Push and re-check CI after the current changes are committed.
- Current Python line coverage is about 61%; `grapetree.py` has no direct
  coverage. Coverage alone understates the larger risk: the legacy JavaScript
  editor previously had no project-owned browser tests.

## Known packaging/release gaps

- `pip install .` and wheel installation work, but `pip install -e .` currently
  fails because the Hatchling root-to-`grapetree` source-prefix rewrite cannot
  be represented by the editable-install mechanism. Resolve with a conventional
  package layout rather than relying on a fragile checkout-directory trick.
- Versions disagree: project/Conda currently say 2.2, the UI config says 1.3.5,
  and the latest GitHub release is 1.5.0. The intended modernization release is
  2.3.0, with one authoritative version source.
- Add trusted PyPI publishing and release automation. PyPI 2.2 has no useful
  `Requires-Python` metadata, so issue #93 is not fully resolved until a new
  release is published.
- Add Windows and macOS CI before claiming platform support. Then restore or
  replace the old PyInstaller build scripts and smoke-test `.app`/`.dmg` and
  Windows installer/portable artifacts.

## GitHub issue triage

Twenty-five issues were open at the 2026-07-17 audit.

- Close after the modernization release verifies them: #93, #108.
- Already answered/resolved; confirm and close with documentation links: #92,
  #103.
- Regression-sized fixes needing tests first: #65, #96, #99, #100, #102, #109.
- Reproduce and investigate with supplied or generated fixtures: #82, #97,
  #104, #107, #112, #115, #116.
- Features/API work: #81, #89, #94, #101, #111.
- Documentation/scientific guidance: #110, #117.
- Browser-only architecture: #113 is the direct static-site `/maketree` gap.

Notes from representative checks:

- #115 reproduced as Flask's newer 500 KiB non-file form-field limit; a test and
  fix are now present.
- #99 still failed for `distance` estimates but not NINJA; a test and fix are now
  present.
- #100's historical Numba reflected-list warning did not reproduce on the
  current supported dependency set. Keep it open until CI and a targeted fixture
  establish whether it is obsolete.
- Old PR #98 changes one collapse call from an implicit argument to `false`, but
  contains distracting whitespace edits. Port the behaviour only with a browser
  regression test.
- #112 is related to the hard-coded EnteroBase URL proxy in
  `grapetree_fileHandler.js` and needs a CORS-aware remote-loading redesign.
- #107 is an O(n-squared) memory/performance problem in shortcut/distance work;
  browser WASM alone will not make it disappear.

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
  model and apparently not Numba. It is useful for prototyping, not a complete
  drop-in backend.
- Use triangular/chunked distance storage and a Worker. Browser `wasm32` memory
  and the existing O(n-squared) algorithms remain constraints. WASM threads
  would additionally require COOP/COEP deployment headers.

## Immediate next steps

1. Run the complete installed-wheel and Playwright suites after every current
   diff is finalized; inspect the resulting CI on PR #118.
2. Resolve editable installs and consolidate the version to 2.3.0.
3. Expand browser tests around issue #96 before porting its collapse fix, then
   cover and fix #109 and #102.
4. Add Windows/macOS CI and assess the existing native build scripts and bundled
   executable architecture/licensing.
5. Work through the issue buckets, posting clear closure/update comments only
   after fixes are pushed and verified.
6. Start the Edmonds WASM parity proof under `browser-wasm/` only after shared
   golden fixtures exist.

## Useful verification commands

Build and test the installed wheel from outside the checkout. Avoid editable
installation until the known Hatchling layout issue is fixed.

```bash
python -m build
python -m pip install --force-reinstall dist/*.whl pytest
python -m pytest -q
npm ci
npx playwright install chromium
npm run test:browser
```
