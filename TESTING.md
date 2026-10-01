# Testing GrapeTree

Keep routine CI small and repeatable. Keep larger scientific comparisons and
performance measurements as deliberate local runs against frozen data.

| Level | When | Scope |
|---|---|---|
| Quick regression checks | Every PR and push to master; locally while developing | Small committed fixtures, Python and browser regressions, package/platform smoke tests |
| Scientific review | Suggested monthly, and whenever algorithms, parsing or scientific dependencies change | Three species, missing-data options, held-back profiles, extended browser journeys |
| Performance review | Before releases and changes likely to affect calculation cost | Paired timing/memory measurements on the same idle machine |

These are recommended review intervals, not an installed schedule. The CI
workflow can also be started manually from GitHub Actions. Large data downloads,
archive sampling, full parity sweeps and benchmarks never run in routine CI.

## Quick checks

From a development checkout with GrapeTree, pytest and Playwright installed:

```sh
python -m pytest -q tests review/harness review/test_wasm_precision.py
npm run test:browser
```

Initial setup is `python -m pip install -e . pytest`, `npm ci` and
`npx playwright install chromium`. Activate the Python environment before running
the browser tests. See [review/README.md](review/README.md) for isolated server
ports when the default ports are busy.

On [CI run 36903310888](https://github.com/achtman-lab/GrapeTree/actions/runs/36903310888),
the Python suite took 12–22 seconds on Linux and the browser suite 14 seconds.
The slowest complete job took 151 seconds, including setup/build work. All 14
jobs run independently; their times should not be added to estimate the wait
for a PR. Runner queues and dependency downloads can still increase elapsed time.

Retain this coverage while it stays inexpensive. Linux Python, browser, package
and Docker jobs have five-minute limits; native/platform, Conda and WASM builds
have ten-minute limits. A timeout fails the job. These limits catch hangs;
they are not expected running times. Investigate if normal jobs repeatedly
exceed five minutes before adding coverage or increasing limits.

New regressions should use the smallest input that reproduces the defect.
The reduced eight-profile NJ fixture is an example. Do not add full archive
downloads, thousand-profile calculations or timing assertions to these tests.

## Periodic local scientific review

Prepare the cached archives, samples, synthetic scenarios and pinned Python
environment once using [review/harness/README.md](review/harness/README.md).
Keep them in a persistent directory outside the checkout. Reuse that data for
comparisons; refresh archives deliberately and retain their manifests/hashes.

Use an explicit, retained baseline. For this review it is master at
`f993e82f9efa1ebdde938eff5c81756076bf1314`. Do not silently advance the baseline
to the candidate or accept new golden outputs. For reproducible acceptance,
commit changes first and use a clean candidate checkout or archive.

The following shell setup assumes `baseline`, `data` and `venv-science` have
been prepared in the external directory. Replace the first path for your machine:

```sh
GT_REVIEW=/path/to/grapetree-review
GT_CANDIDATE_SHA=$(git rev-parse HEAD)
GT_RUN="$GT_REVIEW/results/$(date -u +%Y%m%dT%H%M%SZ)-$GT_CANDIDATE_SHA"
GT_PYTHON="$GT_REVIEW/venv-science/bin/python"
```

Start with a bounded nine-case comparison: three species, 100 profiles, one
seed, MSTree/MSTreeV2/distance. Then check the option matrix, whose independent
oracles distinguish intended corrections from regressions:

```sh
"$GT_PYTHON" review/harness/parity_suite.py routine \
  --data "$GT_REVIEW/data" --baseline "$GT_REVIEW/baseline" --candidate "$PWD" \
  --candidate-sha "$GT_CANDIDATE_SHA" --python "$GT_PYTHON" \
  --output "$GT_RUN/parity" --sizes 100 --seeds 7 \
  --timeout 120 --max-rss-mb 6000
"$GT_PYTHON" review/harness/parity_suite.py options \
  --data "$GT_REVIEW/data" --baseline "$GT_REVIEW/baseline" --candidate "$PWD" \
  --candidate-sha "$GT_CANDIDATE_SHA" --python "$GT_PYTHON" \
  --output "$GT_RUN/options" --timeout 120 --max-rss-mb 6000
```

Both commands return nonzero on a failure and save incremental results. Do not
interpret matching crashes or skipped/missing data as successful functionality.
For changes to scientific code, extend to sizes 100/500/1,000 and seeds 7/19/43,
then run the independent held-back checks in [review/README.md](review/README.md).
The historic baseline requires the pinned environment, including real Numba.

Exercise the UI separately using the opt-in commands in
[review/browser-report.md](review/browser-report.md) and the worker comparisons in
[review/wasm-report.md](review/wasm-report.md). These suites are excluded from
`npm run test:browser`. Supply their data and local servers explicitly, and inspect
the report for skips. Include metadata editing, colouring, tree controls,
exports and reopening saved files. External publication remains a separate test.

## Performance review

Run benchmarks alone on the machine after correctness passes. Do not overlap
them with browser tests, builds or other scientific calculations. Use the same
Python environment, frozen profiles and process count for both revisions:

```sh
"$GT_PYTHON" review/harness/benchmark_suite.py \
  --data "$GT_REVIEW/data" --baseline "$GT_REVIEW/baseline" --candidate "$PWD" \
  --candidate-sha "$GT_CANDIDATE_SHA" --python "$GT_PYTHON" \
  --output "$GT_RUN/benchmark" --sizes 1000 --methods MSTreeV2 \
  --repetitions 3 --timeout 300 --max-rss-mb 6000 --min-available-mb 8500
```

This alternates baseline/candidate order and validates outputs before reporting
medians. Review `summary.json`, `medians.json`, resource measurements and errors.
Investigate a repeatable 20% slowdown or 25% peak-memory increase; do not make
noisy timing results on shared CI runners a merge gate. Scientific differences
and crashes always require investigation.

Add MSTree and distance when affected; use 2,500/5,000 profiles before a release
when resources allow. Set a suitable explicit timeout for larger sizes. The
10,000-profile baseline exceeded the original review's sampled memory cap and
remains unverified. A resource-limited run is not a pass. The resource monitor
needs permission to observe child processes and terminate the process group.

Retain the input manifests, both source commit IDs/content hashes, environment,
raw outputs, comparisons and resource records with each run. Keep bulk evidence
outside Git; commit only a concise report and small regression fixtures for newly
found defects. Periodic results describe the tested revisions, not future changes.
