# GrapeTree PR #118 acceptance review

This review compares `master` at `f993e82f9efa1ebdde938eff5c81756076bf1314`
with PR #118 at `d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`, then checks
the local repairs made during the review. No merge, release or deployment is
part of the review. Results for the original PR and repaired working tree must
not be conflated.

## Acceptance contract

1. Preserve scientific outputs for supported existing options. Compare named
   taxa, complete directed matrices, topology and weighted tree paths, not
   just whether a Newick string parses.
2. Record intentional corrections separately, with a baseline reproducer and
   independent expected result. An unexplained difference blocks acceptance.
3. Keep the core tree calculation and its original CLI in a directly runnable
   `MSTrees.py`. A copied script must not depend on other GrapeTree Python files.
   External Python packages, native executables and Java remain dependencies.
4. Measure paired time and memory on the same machine, with the same inputs
   and pinned dependencies. Do not run other agent tests during timed runs.
5. Exercise real browser controls and inspect saved outputs. Worker-level
   scientific tests supplement, rather than replace, UI interaction tests.
6. The lead reviewer inspects the harness, injects comparator faults, reruns
   held-back cases and verifies the final combined state independently.

Every result is a pass, failure, verified intentional correction, or explicit
limitation. A skipped, timed-out or resource-limited calculation is not a pass.
Existing master bugs are distinguished from PR regressions. A 20% reproducible
time increase or 25% sampled peak-memory increase triggers investigation;
crashes and scientific discrepancies always require investigation.

## Work packages

The requested worker configuration is GPT-6 Sol with medium reasoning. The
lead owns acceptance and integration; workers cannot approve their own work.

| Owner | Work | Evidence |
|---|---|---|
| Scientific worker | Archive sampling, baseline environment, parity and performance harness | [Harness instructions](harness/README.md), science report |
| Backend worker | Single script, CLI, exports, native tools and WASM scientific parity | [Backend report](backend-report.md), WASM report |
| Browser worker | Visible UI journeys, metadata, saved artifacts, baseline comparison | Browser report and Playwright artifacts |
| Lead reviewer | Harness audit, held-back samples, export checks, clean install, manual UI and final decision | `lead_acceptance.py`, final report |

Workers own separate files in the shared checkout. Baseline and original PR
source archives are immutable copies; evidence and bulk data live outside the
checkout. Original source copies are never patched to make parity pass.

## Data

Full archives were obtained from the following public EnteroBase directories:

| Scheme | Archive records | Columns including ID |
|---|---:|---:|
| [Salmonella cgMLSTv2](https://enterobase.warwick.ac.uk/schemes/Salmonella.cgMLSTv2/) | 734,532 | 3,003 |
| [Escherichia cgMLSTv1](https://enterobase.warwick.ac.uk/schemes/Escherichia.cgMLSTv1/) | 425,294 | 2,514 |
| [Yersinia cgMLSTv1](https://enterobase.warwick.ac.uk/schemes/Yersinia.cgMLSTv1/) | 11,208 | 1,554 |

Counts describe the downloaded snapshot, not a promise about future archive
versions. Each sample manifest contains the source URL and SHA-256, source row
numbers and IDs, seed, output hash, and sample size. Sampling reads the whole
archive with bounded reservoirs. All loci are retained. Synthetic metadata
and modified outbreak/missingness cases are labelled as synthetic.

Worker seeds are 7, 19 and 43. The lead's held-back seed is 103, with 37 and
137 samples per species. Holding back these cases tests whether worker fixes
generalise beyond their development fixtures.

## Reproduction and suite boundaries

Use [harness/README.md](harness/README.md) for archive sampling and scientific
runs. On the review host the external evidence root is
`/private/tmp/grapetree-pr118-review`; it contains `baseline`, `candidate`,
`data`, pinned environments and `results`. These paths can be replaced with
another local directory when rerunning. Large source archives are not committed.

The normal fast suites remain:

```sh
python -m pytest -q
npm run test:browser
```

When the default ports are occupied, use `GRAPETREE_TEST_PORT` for Flask and
`GRAPETREE_WASM_PORT` plus `GRAPETREE_WASM_BASE_URL` for the static WASM server.
If setting `GRAPETREE_SERVER_COMMAND`, use the same Flask port there. `CI=1`
refuses to reuse existing servers. The final isolated browser run used ports
8134/8135 and passed all 31 default tests.

The larger browser review suites are opt-in and excluded from the default
Playwright configuration because they use separate servers and downloaded
species samples. Their configurations and environment variables are documented
in the browser/WASM reports. Tests requiring archives must be reported as
unexecuted if those inputs are absent; the small permanent regression cases
run in the default suite.

The lead's held-back scientific command is:

```sh
python review/lead_acceptance.py \
  --data-root /path/to/review/data \
  --baseline /path/to/review/baseline \
  --python-reference /path/to/pinned-env/bin/python \
  --python-current /path/to/current-env/bin/python \
  --output /path/to/review/results/lead/heldout
```

This compares master with the repaired candidate in both dependency
environments and checks tree paths using a second parser (ETE). It saves raw
stdout/stderr, commands, comparisons, sample manifests and source hashes.

## Evidence and final decision

See the [acceptance report](final-report.md) for the decision, measured results
and remaining limits, and the [findings register](findings.md) for repairs.

The final report must give exact executed counts and measured results, identify
which revision each result covers, and retain unresolved limits. Historical
green CI applies to the original commit, not to these repairs. Windows,
Linux, release archives and service integrations cannot be called locally
verified from a macOS-only run.

Any later code change invalidates affected evidence and requires the relevant
tests to run again. A review recommendation never authorises a merge.
