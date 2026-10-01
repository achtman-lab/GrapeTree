# Findings register

The initial PR head was `d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`.
Repairs below are included with this report on top of that commit. The retained
evidence describes the local review before publication; the PR records the
current commit and platform CI status. Executed counts are in the final report.

| ID | Finding and impact | Repair / acceptance evidence |
|---|---|---|
| R1 | Direct `MSTrees.py --help` failed on a package-relative import. The single-file entry point was lost. | Core parser moved back into `MSTrees.py`; installed application extends it. Copied-file tests cover help, stdin, one/two processes and native tools. |
| R2 | Browser MSTree produced different trees on real Escherichia/Yersinia samples and separated identical profiles in a synthetic case. | Preserve fractional tie scores until edge selection, reproduce stable NetworkX edge order/zero-entry semantics and NumPy rounding. Expanded scientific suite passed after repair; permanent outbreak regression added. |
| R3 | Browser NJ differed in short-branch postprocessing, root placement, input float precision and the order of a pair of short leaf branches. The lead's held-back Yersinia case exposed a 0.010026-allele branch assigned to the wrong sample. | Match ETE rooting and postprocessing, store symmetric distances as float32, and follow FastME numeric leaf-pair order. Per-edge precision checks and independent ETE audits pass; a reduced eight-profile regression preserves the held-back failure. |
| R4 | A truncated browser profile row silently converted an absent column to an allele. FASTA embedded whitespace also differed from Python parsing. | Reject absent/blank selected locus fields with a clear error; preserve explicit `0`/`-` missing calls; ignore FASTA whitespace. Parser regressions added. |
| R5 | Valid leaf names such as `_hypo_0` collided with generated internal network IDs. | Generate internal IDs outside the full leaf-name set. All three network formats preserve weighted paths in independent round-trip tests. |
| R6 | Quoted multiline CSV metadata silently lost embedded newlines. | Read CSV from the original text stream; preserve leading blank-line handling and reject excess fields deliberately. Independent value-preservation test passes. |
| R7 | Ninja invoked obsolete Java `-d64` and tried to parse empty output after Java rejected it. This also affects master with modern Java. | Remove obsolete option, check process status and surface diagnostics. Real Java/JAR copied-script test passes. |
| R8 | The metadata table's initial `left:50%` put its close control offscreen at common viewport widths; also present on master. | Centre/clamp initial position and width. Actual close-control clicks pass at 1280px and 600px; the paired baseline probe confirms the original offscreen geometry. |

## Scientific changes already present in the original PR

These are not exact parity and must not be hidden in a green total:

- **Complete deletion:** master retained loci containing missing calls instead
  of retaining fully called loci. PR output differs deliberately. The review's
  complete-deletion oracle computes expected Hamming fractions independently.
- **wgMLST flag:** master assigned the selected matrix to an unused local
  variable; the PR actually selects the weighted asymmetric model. This can
  change scientific output. Separate tests cover model arithmetic and dispatch.
- **Duplicate taxon IDs:** master accepted ambiguous repeated identifiers;
  the PR rejects these inputs with an explicit error.

The standalone module path also changed from `module/MSTrees.py` to
`grapetree/module/MSTrees.py`. The core script is again independently runnable,
but historical source imports (`import module.MSTrees`) are not restored.

## Baseline limitations and scope boundaries

- A one-profile MSTree/MSTreeV2 calculation fails on both frozen versions.
  Matching failures are not successful functionality checks.
- Both branches silently exclude an all-missing taxon. The harness records
  this as a shared functionality limitation, not an ordinary parity pass.
- Master's Flask endpoint mutates shared request parameters, contaminating
  later backend-availability probes. Browser comparisons need fresh baseline
  processes; the PR's isolated configuration fixes this behaviour.
- Some native FastME runs initially produced empty output but succeeded when
  repeated on retained input. Preserve both attempts and investigate rather
  than counting a retry alone as evidence of reliable execution.
- The static visualiser cannot calculate profiles. Its expected result is a
  useful explanation; Python and the separate WASM application supply tree
  calculation.
- Live EnteroBase embedding and publication to MicroReact are not established
  by standalone tests. MicroReact payload tests intercept the external request.
- Historical green CI belongs to the original PR commit. Local repair tests
  on macOS do not substitute for fresh Linux/Windows/release-build CI.

## Lead audit of worker evidence

The lead found and required correction of a subprocess-pipe deadlock risk in
the benchmark runner, incomplete sampling provenance, unsuitable all-pairs
storage for large comparisons, failure-status propagation, invalid blockwise
test combinations and source-relative tests that would fail installed-package
CI. The lead independently verified fixes using a clean wheel installation,
held-back real species cases, a second tree parser and direct UI interaction.
