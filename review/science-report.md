# PR 118 scientific parity and performance review

Review date: 1 October 2026. Reference source is `master`
`f993e82f9efa1ebdde938eff5c81756076bf1314`; original PR head is
`d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`. Frozen source snapshots are
under `/private/tmp/grapetree-pr118-review/{baseline,candidate}`. This report
records scientific results on that original PR head. Any later working-tree
fix is assessed separately below against the current checkout.

## Method and reproducibility

Both branches ran unchanged in one isolated Python 3.12.7 environment with
NumPy 1.26.4, NetworkX 2.8.8, Numba 0.61.2, ete3 3.1.3 and psutil 7.0.0.
The baseline used real Numba, including its compilation cost. The harness
launches each branch in a fresh process, records input and source digests,
captures raw output/error files, and saves wall time, sampled process-tree RSS,
CPU time, and optional temporary-disk peak. Benchmark runs were exclusive on
one macOS 14.6.1 arm64 host with 8 logical CPUs and 32 GiB physical RAM.
They used one backend process and a 6,000 MiB sampled RSS stop threshold.

The tree comparator checks exact leaf identity, positive and raw unrooted
splits, and all pairwise path lengths for up to 1,000 leaves. For larger
trees, byte-identical outputs pass after linear Newick and leaf validation;
nonidentical large trees are explicitly blocked pending a scalable topology
comparison. Matrix comparison keys rows and columns by taxon and checks every
directed cell; the file comparator streams large matrices in bounded memory.
Mutation tests show that altered labels, one directed cell, branch length and
topology are detected. Newick strings are never assumed equivalent merely
because total tree weight matches.

Source archives were downloaded from the [EnteroBase scheme directory](https://enterobase.warwick.ac.uk/schemes/)
and sampled by seeded reservoir over **every** source row. All allele columns
are retained. Smaller samples are deterministic uniform subsets of each
seed's maximum reservoir and therefore statistically dependent across sizes.
The 81 sample manifests record the source URL/checksum, row and column counts,
Python/RNG details, reservoir capacity, selected record IDs and output hash.
All 81 profile hashes were reverified after provenance fields were added.

| Species and scheme | Source profiles | Columns including ID | Compressed SHA-256 |
|---|---:|---:|---|
| Yersinia cgMLSTv1 | 11,208 | 1,554 | `ff2f5ef25c9e3bffa66888d15a1de8685a7dbfd1da4e4a00ca460311d8e56e70` |
| Escherichia cgMLSTv1 | 425,294 | 2,514 | `d2c4e2217a36c741845277242bbf211c6ba9cb9a7b3bd60669ef193ab09a0fd4` |
| Salmonella cgMLSTv2 | 734,532 | 3,003 | `839f93c9e3a6b000236a3b98f68a1e2f4005d83434f2ed1bfd9d594eb687d2e8` |

The synthetic outbreak fixture contains one exact duplicate, near neighbours,
missing calls and a distant profile. Its metadata is explicitly synthetic and
includes categorical, numeric, coordinate, blank and Unicode fields. Separate
fixtures exercise all-missing calls and duplicate taxon IDs.

## Parity and deliberate scientific changes

The first small suite produced 14 matching output cases out of 16. On a
one-profile input, both branches produce a distance matrix but both `MSTree`
and `MSTreeV2` fail at `_network2tree` with `IndexError: list index out of
range`. This is a baseline functionality limitation, not a PR regression.

The valid option suite produced 20 matching cases and three explained changes
across 23 final-checkout cases. Numeric blockwise penalties `0.01`, `0.1` and `1.0` worked
and matched for both distance and MSTree. String missing-data modes are not
applicable to blockwise and are excluded. Two `complete_delete` distance cases
changed because master mistakenly retains loci **with** missing calls; the PR
retains fully called loci. An independent allele-table oracle verified every
PR distance after keeping 1,446 fully called loci. Master had 22 incorrect
directed values on that fixture. The `wgMLST=True` flag also changes behaviour:
master assigns a local matrix-type variable without applying it, whereas the
PR dispatches to the wgMLST calculation. In a hand-calculated three-profile
case, both low-level directed wgMLST matrices matched the expected values;
the PR's backend flag matched all nine expected cells and master's differed
in four. These are corrected behaviours, not silent parity passes.

The initial original-head native-method suite found RapidNJ parity. NJ initially produced
empty FastME tree files on both branches during concurrent runs; isolated
retries of both branches succeeded and the resulting 10-tip trees compared
identically. `ninja` failed in both original snapshots under Java 25
because of the obsolete invocation. On the edge fixtures, six output cases matched. Master accepts
duplicate taxon IDs; the PR rejects them explicitly in three methods. The
rejection is an intentional invalid-input correction. All-missing behaviour
is recorded separately rather than being normalised away.

The 81-case routine matrix across three species, sizes 100/500/1,000,
seeds 7/19/43 and methods distance/MSTree/MSTreeV2 passed **81/81** paired
comparisons: 27/27 for each species. Every distance comparison included all
directed cells, and every tree comparison included all leaf-pair path lengths.

## Final edited checkout acceptance

The final Python backend file had SHA-256
`7a1701e7898624a158fd1397b32fcf81e491dfa3313dc795dd318762f4066064`
throughout these acceptance runs. Per-run manifests also contain the checkout
commit, dirty flag and whole Python-source digest. The latter changed while
other reviewers edited separate Python files; the backend digest remained
stable. These results therefore apply to that backend content, not an
unqualified claim that every file in the shared checkout was frozen.

The final checkout passed **23/23 valid option cases**: 20 parity matches and
three independently verified corrections (two `complete_delete`, one wgMLST).
The three 1,000-profile Salmonella seed-7 spot checks passed for distance,
MSTree and MSTreeV2 against master. Native methods passed their functional
checks: NJ and RapidNJ matched master by leaf set, splits and path lengths;
`ninja` failed on master with the obsolete Java invocation but succeeded on the
final candidate and produced a parseable tree with all ten expected tips. This
is a candidate improvement rather than a tree-parity result.

The nine final edge cases comprise three outbreak parity passes, three
intentional duplicate-ID rejections, and three shared all-missing exclusions.
Both master and candidate silently drop the all-missing taxon from all three
method outputs; that is an existing functionality limitation. The edge suite
exits nonzero because it flags this limitation, not because of a new candidate
regression. On the outbreak fixture, the exact duplicate profile retained
zero pairwise distance in all three methods.

Runner fault checks used a 2 MiB output stream, a forced timeout, and a
sampled RSS overrun. The stream finished without a pipe deadlock; the two
stopped workers recorded their distinct termination reasons. On a restricted
sandbox, child enumeration can fail, so the runner now marks incomplete
cleanup if process-group termination is denied and it cannot prove child
termination. None of these fault checks is counted as a scientific pass.

## Controlled benchmark

The table reports three alternating master/PR pairs on the **same** 1,000
Salmonella profiles (seed 7), and three alternating pairs at 2,500 for
MSTreeV2. Every output comparison passed. Lower time is better; these are
whole fresh-process times, including import and baseline Numba compilation.

| Profiles | Method | Master median (range), s | PR median (range), s | PR/master | Median peak RSS master → PR |
|---:|---|---:|---:|---:|---:|
| 1,000 | MSTreeV2 | 11.35 (11.06–11.54) | 10.80 (10.75–10.81) | 0.952 | 1.17 → 1.15 GB |
| 1,000 | MSTree | 7.00 (6.84–7.08) | 6.70 (6.68–6.99) | 0.957 | 1.14 → 1.12 GB |
| 1,000 | distance | 5.61 (5.51–5.62) | 5.11 (5.10–5.29) | 0.911 | 0.95 → 0.92 GB |
| 2,500 | MSTreeV2 | 52.18 (51.92–52.31) | 52.03 (50.87–52.89) | 0.997 | 2.73 → 2.60 GB |

A single 5,000-profile MSTreeV2 probe completed on both branches: master
174.36 s / 4.39 GB sampled peak RSS; PR 172.43 s / 4.51 GB. Their 5,000-tip
Newick files had identical SHA-256 values. This is a successful parity and
resource probe, but one run per branch is insufficient for a precise speed
claim. The 10,000-profile master probe reached the 6,000 MiB sampled RSS threshold
at 436.63 s and was killed; PR was not run at that size under the same conservative
limit. **10,000 profiles are resource-limited here, not passed.**

RSS values are sampled across the process tree every 50 ms and may miss very
short peaks. In benchmark runs, child-process visibility was confirmed. The
reusable benchmark suite now refuses to start if that visibility is denied. The
runner records the host's available RAM and load before each paired run.
`RLIMIT_AS` could not be set in the macOS sandbox; automatic process-group
termination enforced the sampled threshold. The measured PR changes are below
the review's 20% time / 25% memory investigation triggers on these cases, but
they do not establish performance on other hardware or every option.

## Evidence and next checks

- Reusable commands, valid option matrix and caveats: `review/harness/README.md`.
- Sampling and results: `/private/tmp/grapetree-pr118-review/data` and
  `/private/tmp/grapetree-pr118-review/results/science`.
- Paired benchmark logs, per-run host state and medians:
  `results/science/benchmark-repeat-1000` and `benchmark-repeat-2500`.
- Complete-delete and wgMLST independent checks:
  `results/science/options-final` and `wgmlst-hand-{baseline,candidate}.json`.
- Final checkout native, edge and 1,000-profile checks:
  `results/science/native-final-rerun`, `edges-final`, and
  `routine-final-1000`.

The review lead is checking the browser and WASM surfaces independently. No
merge decision is made by this report.
