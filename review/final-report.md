# PR #118: independent acceptance review

**The original PR required the repairs included with this report.** PR revision
`d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc` contains defects found by this
review. The repairs and regression tests are included in this change set and
pass the local acceptance checks below. Require fresh platform CI before
merging and review the deliberate scientific behaviour changes explicitly.
The current commit and checks are shown on [PR #118](https://github.com/achtman-lab/GrapeTree/pull/118).
This review does not merge, release or deploy GrapeTree.

The reference is `master` at
`f993e82f9efa1ebdde938eff5c81756076bf1314`. Three GPT-6 Sol workers handled
scientific testing, backend compatibility and browser journeys. The lead
reviewer audited their harness and conclusions, required corrections, and
ran independent held-back tests, clean installation checks and manual browser
interaction. Worker reports alone were not used as acceptance evidence.

## Findings

The [findings register](findings.md) records eight defects and their repairs.
The most consequential were a broken standalone `MSTrees.py` entry point,
browser MSTree tie handling that changed trees, browser NJ branch processing
that changed distances, and network exports that could corrupt a real sample
ID. Smaller repairs address malformed browser profiles, multiline metadata,
modern Java support for Ninja, and the metadata table close button.

`grapetree/module/MSTrees.py` again contains the scientific implementation and
core argument parser in one directly runnable Python script. It can be copied
without other GrapeTree Python files. Third-party packages and optional native
executables/Java remain dependencies. The historic `module/MSTrees.py` source
path and `import module.MSTrees` were not restored.

The lead's held-back tests found a further NJ ordering defect after the worker's
original suite passed: Yersinia ST301 and ST297 exchanged a 0.010026-allele
pendant branch. The broad path tolerance missed this; the per-edge check and
independent ETE parser both rejected it. Native FastME leaf-pair order explains
the difference. The repair has a reduced eight-profile permanent regression,
and all nine final NJ validation datasets pass. This was not resolved by
widening a numerical tolerance.

## Scientific parity and performance

Real profiles were sampled reproducibly from complete EnteroBase archives for
Salmonella, Escherichia and Yersinia, retaining all loci. Archive hashes, seeds,
source rows and sample hashes are recorded. See the [review contract](README.md)
and [harness instructions](harness/README.md).

The lead's 36 held-back comparisons passed: three species, 37 and 137 profiles,
seed 103, MSTree/MSTreeV2/distance, and both pinned and current dependency
environments. Tree paths were also checked with ETE as a second parser.

| Scientific check | Executed result |
|---|---|
| Original PR versus master: 3 species × 3 sizes × 3 seeds × 3 methods | 81/81 parity matches |
| Final Python checkout, valid options | 20 parity matches + 3 independently verified corrections |
| Final Python checkout, Salmonella 1,000-profile spot checks | 3/3 parity matches |
| Lead Python held-back cases, two dependency environments | 36/36 parity matches |
| Browser scientific development corpus | 44/44; affected NJ cases rerun after the ordering fix |
| Lead browser validation | 51 unique checks accepted: 42 unaffected original checks + 9 final NJ checks |
| Lead independent ETE audit of final saved browser trees | 27/27 edge audits passed |

The browser validation comprises four tree methods and four distance modes on
the six held-back species/size combinations, plus NJ on three fresh 73-profile
subsamples. The initial held-back run was 47/48, and remains in the evidence;
all six affected NJ cases were rerun after repair, together with the three new
samples. Precision is evaluated on each named edge, so a long branch cannot
hide an error on a short one.

Timed tests used the frozen original revisions, pinned dependencies and one
worker process on the same macOS host. Other review test runs were paused.
These are measurements from this host, not universal speed claims.

| Salmonella size / method | Master | Original PR | Evidence |
|---|---:|---:|---|
| 1,000 / MSTreeV2 | 11.348 s | 10.800 s | Median of 3 alternating paired runs; parity passed |
| 1,000 / MSTree | 6.998 s | 6.699 s | Median of 3 alternating paired runs; parity passed |
| 1,000 / distance | 5.607 s | 5.107 s | Median of 3 alternating paired runs; all directed cells compared |
| 2,500 / MSTreeV2 | 52.175 s | 52.031 s | Median of 3 alternating paired runs; each Newick identical |
| 5,000 / MSTreeV2 | 174.36 s | 172.43 s | One exploratory pair; identical 5,000-tip Newick |
| 10,000 / MSTreeV2 | Stopped at memory limit | Not run | Baseline hit sampled 6,000 MiB limit after 436.63 s |

The 5,000-profile peak sampled process-tree RSS was 4.387 GB on master and
4.505 GB on the PR, a 2.7% increase. Temporary disk use peaked at about 462 MB
on each. Sampled RSS includes child processes and is not a hard address-space
limit. The 10,000-profile result is explicitly unverified, not a successful
benchmark or evidence of a PR-specific failure.

## Changes that are not exact parity

The original PR corrects complete deletion to retain only fully called loci;
an independent allele-table oracle verifies that correction. It also makes the
experimental wgMLST flag take effect where master assigned an unused local
variable. These changes can alter scientific output and need explicit review
as intended corrections. A green aggregate must not hide them.

Single-profile MSTree/MSTreeV2 fails on both frozen versions. Some native
FastME invocations returned empty output before succeeding on retained-input
retries. Both the first failure and retry remain in the evidence.
Both branches also silently exclude an all-missing taxon; the harness flags
that behaviour as a shared limitation. Repeated sample IDs are deliberately
rejected by the PR. These input behaviours should be visible in release notes.

## Scope and evidence

The wheel and source archive were built with isolated PEP 517. Each was
installed and tested outside the checkout: **101 Python tests passed against
the wheel and 101 against the source archive**. The source archive used another
fresh environment, and dependency checks passed in both environments. No
borrowed checkout or dependency path was used. The lead's 17 harness fault
checks also passed, including deliberately wrong trees/matrices, large stdout,
timeouts, memory stops and malformed large Newick validation.
The separate review-harness unit suite passed all 12 tests. Review-only
comparator tests are kept outside the installed-package suite so they do not
introduce imports from an unpackaged review directory into release CI.

The lead manually loaded a real 50-profile Salmonella dataset, calculated and
inspected its tree, and exercised synthetic metadata, grouped labels and
branch controls. A fresh manual check also confirmed all four metadata joins
and that the repaired table closes through its visible icon. Automated browser journeys additionally verify file chooser,
paste, drag/drop, calculations, metadata editing, filtering, exports and saved
JSON reopening.

| Browser/UI verification | Result |
|---|---:|
| Default browser suite on dedicated test ports, including all new regressions | 31/31 passed |
| Extended PR click-through journeys, including a real 1,000-tip tree | 17/17 passed |
| Fresh-master common workflows: metadata/JSON roundtrip and real profile calculation | 2/2 passed |
| Paired master/PR UI probe | 1/1 passed |

An earlier default-suite attempt reused unrelated servers on ports 8000/8001
and displayed a directory listing. That infrastructure failure is retained;
the final run used isolated ports and refused to reuse existing servers. Test
ports are now configurable, so this failure is reproducibly avoidable.

Raw evidence and bulk datasets are in
`/private/tmp/grapetree-pr118-review`. Small final summaries and selected
screenshots are retained in [review/evidence](evidence/). The [backend report](backend-report.md),
[browser report](browser-report.md) and [WASM report](wasm-report.md) give
commands, fixtures and limitations.

Historical CI was green on the original PR commit. It does not validate these
repairs. Fresh Linux/Windows/packaging CI is required before a merge; consult
the current PR checks rather than treating this local report as CI evidence.
Live EnteroBase embedding, a real MicroReact publication and browsers other
than Chromium are outside the locally verified results. MicroReact payload
tests intercept submission and send no external publication.
