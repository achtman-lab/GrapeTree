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
- Added programmatic reloadable visualisation JSON output (#94) and portable
  GraphML, edge-list CSV, and JSON network exports (#101). Both accept an
  existing Newick tree or a profile calculated by the normal CLI.
- Added multi-threshold cluster assignment output (#89) using the interface's
  exact inclusive collapse rule (links at or below the cutoff), with stable
  component labels and regression coverage.
- Documented SeqSphere+'s dedicated two-file GrapeTree export and large-table
  workflow (#116), linking the current vendor instructions. Added
  `--total-loci` so SNP-only alignments can retain MSTreeV2's original
  branch-recrafting model, with full-vs-variable-site parity tests (#110).
- Replaced the static site's opaque “Cannot Connect” failure (#104/#113) with
  an explicit visualiser-only explanation and standalone install path, covered
  in Chromium. Documented how to reopen `ms_tree.json` (#117). Browser-side
  calculation remains tracked separately and is not falsely presented as done.
- Hardened HTTP boolean parsing after the Docker smoke test found that an empty
  `checkEnv` form field reached `int()`. Empty/false-like values now remain
  false and invalid strings receive a clear 400-level input error.
- Added the complete public issue #82 attachment as a golden regression. The
  reported star is caused by MSTreeV2's directed missing-data model when
  technical runs have non-nested missing loci, not the renderer. Both the
  established MSTree and MSTreeV2 outputs are locked; UI and README guidance
  now tells replicate-focused users when pairwise-overlap MSTree is preferable.
- Established the separate browser-only track under `browser-wasm/`. The
  in-repository C++ Edmonds branching backend now compiles reproducibly with
  pinned Emscripten 3.1.50, runs inside a Web Worker, and passes a real Chromium
  test against a shared fixture also exercised by each platform's bundled
  native executable. CI rebuilds the committed WASM artefacts to catch drift.
- Added a no-server profile pipeline for browser MSTree and MSTreeV2, including
  profile/FASTA parsing, non-redundant grouping, all four missing-data modes,
  float32-compatible heuristic ordering, branch recrafting, Newick output, and
  loading into the established interactive visualiser. Shared browser fixtures
  cover the basic topology and full issue #82 replicate behaviour.
- Added standard NJ in browser-native JavaScript and compiled canonical
  RapidNJ 2.2.3 to WebAssembly with SIMD. The GPL-2 source is pinned, checksumed,
  and distributed beside the generated module and licence. Both methods match
  the established backend's shared pairwise-distance fixtures, including the
  legacy ETE midpoint/unroot branch transformation.
- Added release automation triggered only by a published GitHub release. It
  verifies the `vX.Y.Z` tag against the package version, builds and checks wheel
  and sdist, publishes to PyPI through short-lived OIDC trusted publishing,
  packages smoke-tested Intel macOS and Windows applications, packages the
  complete static browser application, and attaches all artefacts plus SHA-256
  checksums to the existing GitHub release.
- Added an x86-64 Linux CI build of the Conda recipe and a Bioconda submission
  checklist. The recipe intentionally is not `noarch`: the established NJ,
  RapidNJ, and Edmonds executables are platform binaries. Its source switches
  from the modernisation branch to the release tarball and checksum only after
  v2.3.0 exists.

## Current verification

- Clean wheel and source distribution build successfully with Hatchling.
- 84 Python tests pass on Python 3.12.
- 22 Playwright/Chromium tests pass. Twelve run against the Flask app, covering Newick
  rendering, profile calculation, selected-subtree collapse, MicroReact export
  without metadata, exact long-branch cutoff behaviour, and visible duplicate
  taxon errors, direct linked trees, `.tree` file dispatch, and malformed-tree
  failures, plus loading visualisation JSON generated by the installed CLI.
  Ten exercise the separate static browser backend: real MSTree/MSTreeV2/NJ/RapidNJ
  profiles, four missing-data modes, issue #82, native/WASM Edmonds parity, and
  rendering the calculated tree in the established visualiser.
- PR #118 CI is green at commit `75ec87d`: Python 3.10-3.14, distribution,
  wheel, Chromium, Docker, Windows, Intel macOS, and both native application
  builds pass. The new browser-WASM build/reproducibility job is awaiting its
  first pushed run.
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
- Trusted PyPI and GitHub release automation is defined. A project owner must
  configure the PyPI trusted publisher for `achtman-lab/GrapeTree`, workflow
  `release.yml`, environment `pypi`, and require environment approval before
  publishing 2.3.0. PyPI 2.2 has no useful `Requires-Python` metadata, so issue
  #93 is not fully resolved until that release is actually published.
- Windows and Intel macOS CI/application jobs are now defined and must be
  validated on GitHub. The next packaging gaps are signed/notarised macOS
  `.dmg`, signed Windows installer/portable release archives, and native
  Apple-silicon builds of FastME, RapidNJ, and Edmonds.

## GitHub issue triage

Twenty-five issues were open at the 2026-07-17 audit.

- Close after the modernization release verifies them: #93, #108.
- Already answered/resolved; confirm and close with documentation links: #92,
  #103. Both were confirmed and closed on 2026-07-17.
- Fixed with regression tests and awaiting release/closure: #65, #96, #97,
  #99, #100, #102, #107, #109, #112, #115.
- Reproduce and investigate with supplied or generated fixtures: none.
- Features/API work: none from the current open-issue set.
- Documentation/scientific guidance: none from the current open-issue set.
- Browser-only architecture: #113 is the direct static-site `/maketree` gap.
- Fixed feature/documentation awaiting release/closure: #81, #82, #89, #94,
  #101, #104, #110, #111, #116, #117.

Status comments linking the implemented evidence in draft PR #118 were posted
to every remaining open issue on 2026-07-17. Merge-linked fixes use `Closes`
references in the PR body so GitHub will close them only after review and merge;
#93 intentionally remains open through merge until 2.3.0 is published.

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

- First proof complete: the in-repository Edmonds C++ source is compiled with
  Emscripten and compared with native outputs in a Web Worker harness.
- RapidNJ is now built from canonical GPL-2 source. Standard NJ is implemented
  directly in the Worker and verified against FastME output, avoiding another
  large legacy binary while preserving current fixture behaviour.
- Pyodide supplies NumPy, pandas, and NetworkX, but not the existing subprocess
  model. Numba is no longer a dependency. The working browser path uses a
  purpose-built JavaScript profile/distance layer plus Edmonds WASM, avoiding a
  large Python runtime download.
- Use triangular/chunked distance storage and a Worker. Browser `wasm32` memory
  and the existing O(n-squared) algorithms remain constraints. WASM threads
  would additionally require COOP/COEP deployment headers.

## Strict maintainability review

The thermonuclear maintainability review was repeated after the functional,
packaging, native, and browser work was complete.

- `MSTrees.py` briefly crossed the review's 1,000-line hard limit. Its public
  CLI parser now lives in `grapetree/arguments.py`; the compatibility import in
  `MSTrees.py` is retained, and the algorithm module is back to 953 lines.
- The standalone browser backend is 623 hand-written lines. It is deliberately
  kept as one Worker implementation for this PR because parsing, distances,
  tree construction, and Newick output are exercised together by parity tests;
  generated Emscripten/RapidNJ files are third-party build products, not
  hand-maintained application modules.
- No new duplicate algorithm implementation was added to the Flask path. The
  separate Worker backend exists for the explicitly separate browser-only
  product and is guarded by shared native/browser golden fixtures.
- Final local verification after the extraction: 84 Python tests and 22
  Playwright tests pass. GitHub CI run 29605234829 also passes every job,
  including Python 3.10-3.14, packaging, Conda, Docker, browser/WASM rebuild,
  Windows, Intel macOS, and native application archives.

## Immediate next steps

The implementation work for draft PR #118 is complete. The remaining actions
are intentionally owner/release gates and must not be performed from this
feature branch:

1. Review and merge PR #118 through the protected-branch workflow; do not push
   it directly to `master`.
2. Configure the PyPI trusted publisher for repository
   `achtman-lab/GrapeTree`, workflow `release.yml`, environment `pypi`, with a
   required environment approval.
3. Publish release 2.3.0 after merge. The release workflow builds and checks the
   Python distributions and uploads Python, browser-only, Intel macOS, and
   Windows archives with SHA-256 files.
4. Replace the Conda recipe's branch source with the 2.3.0 release tarball and
   checksum before submitting it to Bioconda.
5. Keep issue #93 open until the new PyPI release is installed successfully on
   supported Python versions. Merge-linked issue references close the other
   implemented issue reports only after PR review and merge.
6. Code signing/notarisation and native Apple-silicon algorithm binaries remain
   follow-up release-infrastructure work because they require external signing
   credentials or upstream native binaries. The CI-tested unsigned Intel macOS
   and Windows archives remain usable deliverables.

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
