# PR 118 scientific parity harness

This harness runs frozen `master` (`f993e82f9efa1ebdde938eff5c81756076bf1314`)
and PR 118 (`d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`) snapshots in separate
processes. Both use the same pinned Python environment. The source archives and
large generated samples stay outside Git; every sample has a source URL, SHA-256,
record IDs and output hash in an adjacent manifest.

## Prepare the pinned environment

```sh
export REVIEW=/private/tmp/grapetree-pr118-review
UV_CACHE_DIR="$REVIEW/uv-cache" uv venv --python python3.12 "$REVIEW/venv-science"
UV_CACHE_DIR="$REVIEW/uv-cache" uv pip install --python "$REVIEW/venv-science/bin/python" \
  'numpy==1.26.4' 'networkx==2.8.8' 'numba==0.61.2' 'ete3==3.1.3' \
  'psutil==7.0.0' 'pytest==8.4.2' 'pandas==2.3.2' 'flask==3.1.2' \
  'unidecode==1.4.0' 'requests==2.32.5'
```

The reference runs with real Numba. Do not replace it with a stub. `uv pip freeze`
should be saved with benchmark evidence. The frozen source directories must be
materialised from the exact commit IDs above, without edits.

## Prepare data

Use the documented source URL for each species. Download each archive once into
`$REVIEW/data/raw`, then run:

```sh
python3 review/harness/sample_profiles.py "$REVIEW/data/raw/Yersinia.cgMLSTv1.profiles.list.gz" \
  "$REVIEW/data/samples" --species Yersinia --sizes 1 2 3 10 50 100 500 1000 \
  --seeds 7 19 43 \
  --source-url https://enterobase.warwick.ac.uk/schemes/Yersinia.cgMLSTv1/profiles.list.gz
python3 review/harness/sample_profiles.py "$REVIEW/data/raw/Escherichia.cgMLSTv1.profiles.list.gz" \
  "$REVIEW/data/samples" --species Escherichia --sizes 1 2 3 10 50 100 500 1000 \
  --seeds 7 19 43 \
  --source-url https://enterobase.warwick.ac.uk/schemes/Escherichia.cgMLSTv1/profiles.list.gz
python3 review/harness/sample_profiles.py "$REVIEW/data/raw/Salmonella.cgMLSTv2.profiles.list.gz" \
  "$REVIEW/data/samples" --species Salmonella \
  --sizes 1 2 3 10 50 100 500 1000 2500 5000 10000 --seeds 7 19 43 \
  --source-url https://enterobase.warwick.ac.uk/schemes/Salmonella.cgMLSTv2/profiles.list.gz
python3 review/harness/make_scenarios.py "$REVIEW/data/samples/Yersinia.n10.s7.profile" \
  "$REVIEW/data/scenarios"
```

Sampling uses one reservoir per seed over the entire archive. Smaller sizes
are seeded uniform subsets of that reservoir, so sizes from one seed are
statistically dependent. The manifest records the reservoir capacity and full
requested-size set needed to regenerate a sample. It preserves all allele columns.
Metadata and challenge modifications are explicitly synthetic.

## Compare results

```sh
"$REVIEW/venv-science/bin/python" review/harness/parity_suite.py small \
  --data "$REVIEW/data" --baseline "$REVIEW/baseline" --candidate "$REVIEW/candidate" \
  --python "$REVIEW/venv-science/bin/python" --output "$REVIEW/results/science/small"
"$REVIEW/venv-science/bin/python" review/harness/parity_suite.py options \
  --data "$REVIEW/data" --baseline "$REVIEW/baseline" --candidate "$REVIEW/candidate" \
  --python "$REVIEW/venv-science/bin/python" --output "$REVIEW/results/science/options-valid"
"$REVIEW/venv-science/bin/python" review/harness/parity_suite.py routine \
  --data "$REVIEW/data" --baseline "$REVIEW/baseline" --candidate "$REVIEW/candidate" \
  --python "$REVIEW/venv-science/bin/python" --output "$REVIEW/results/science/routine-50-100" \
  --sizes 50 100
```

The `routine` tier accepts `--sizes`, `--seeds`, `--methods` and `--species`
filters for staged runs. The `native` and `edges` tiers cover their named
algorithms and invalid input cases. Every case stores raw stdout, stderr, run
metadata and a comparison JSON. The summary counts distinguish ordinary
parity, independently verified intentional corrections, matching baseline
failures, and new failures.

The option matrix is deliberately not a Cartesian product. `blockwise` takes
numeric penalties such as `0.01`, `0.1` and `1.0`; the string missing-data
modes do not apply to it. `complete_delete` is expected to differ from master
only when the independent retained-locus Hamming oracle verifies the PR result.
The `wgMLST=True` flag is checked against a hand-calculated directed matrix
in `verify_wgmlst.py`. Duplicate taxon IDs are an invalid-input case; the PR's
explicit rejection is recorded separately from a regression. A suite exits
nonzero for unexplained differences, resource failures, or functionality
failures, and writes an incremental summary after every case.

## Benchmark

Run the benchmark suite alone on the host. Its order alternates master/PR,
then PR/master, and each pair checks output before contributing to medians.

```sh
"$REVIEW/venv-science/bin/python" review/harness/benchmark_suite.py \
  --data "$REVIEW/data" --baseline "$REVIEW/baseline" --candidate "$REVIEW/candidate" \
  --python "$REVIEW/venv-science/bin/python" \
  --output "$REVIEW/results/science/benchmark-repeat-1000" \
  --sizes 1000 --methods MSTreeV2 MSTree distance --repetitions 3 \
  --max-rss-mb 6000 --min-available-mb 8500
"$REVIEW/venv-science/bin/python" review/harness/benchmark_suite.py \
  --data "$REVIEW/data" --baseline "$REVIEW/baseline" --candidate "$REVIEW/candidate" \
  --python "$REVIEW/venv-science/bin/python" \
  --output "$REVIEW/results/science/benchmark-repeat-2500" \
  --sizes 2500 --methods MSTreeV2 --repetitions 3 \
  --max-rss-mb 6000 --min-available-mb 8500
python3 review/harness/summarise_benchmarks.py \
  "$REVIEW/results/science/benchmark-repeat-1000/summary.json" \
  "$REVIEW/results/science/benchmark-repeat-1000/medians.json"
```

The method and size arguments can be narrowed for pilots. A stopped case is
not accepted as a performance comparison. The summary utility records medians,
run ranges, and sampled process-tree memory from already completed evidence.
The benchmark suite requires process-tree visibility before starting a case;
run it with permissions that allow the resource monitor to see descendants.

For trees of at most 1,000 leaves, the comparator checks labels, positive and
raw splits, and every pairwise branch distance. For larger trees, an exact byte
match passes only after linear Newick structure and leaf validation. A large
nonidentical pair is explicitly blocked for further topology review. Distances
always compare every directed matrix entry, keyed by row and column labels.

The runner redirects stdout/stderr directly to files, so large matrix output
cannot fill a pipe. It records wall time, sampled CPU, sampled resident memory,
source content digest and an optional temporary-disk sample. On this macOS
sandbox, child-process enumeration and `RLIMIT_AS` may be denied. In that case
the manifest marks child visibility false and memory is a sampled parent value;
multi-process memory ratios must not be reported as complete. Timeout and
sampled RSS limits request process-group termination. If the sandbox denies
that operation, the runner attempts known children before the parent and marks
cleanup incomplete unless it can prove no child remains. Large cases should
run one process at a time with a separately monitored host memory cap and
permissions that allow process-group cleanup.
