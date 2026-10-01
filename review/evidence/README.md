# Retained review evidence

Start with [the acceptance report](../final-report.md). These compact records
are retained with the review; raw outputs, downloaded archives and Playwright
traces remain under `/private/tmp/grapetree-pr118-review`.

- `final-source-manifest.json` identifies the files at completion of the local
  review by SHA-256 and verifies the tested package production files. Later
  publication notes and CI edits are recorded in Git, not this historical snapshot.
- `remote-pr-at-completion.json` records the original PR commit before the
  reviewed repairs were prepared for publication. It is not current PR status.
- `routine-*.json`, `options-final.json`, `edges-final.json` and
  `native-final-rerun.json` preserve scientific case classifications.
- `benchmark-*.json` retains repeated timings, single-run 5,000-profile
  results and the 10,000-profile memory stop. The latter is not a pass.
- `lead-wasm-initial-47-of-48.json` preserves the held-back failure before
  its repair. `lead-final-nj-9-tests.json`,
  `lead-wasm-final-51-checks.json` and `lead-independent-ete-27-trees.json`
  record the final independent validation without counting repeated cases twice.
- `worker-wasm-44-checks.json` and `worker-post-fix-nj-7-checks.json` are
  aggregates of saved per-case comparisons; their raw directories are recorded.
- The wheel/source test logs each show 101 passes. The final default browser
  log shows 31 passes; browser JSON reports preserve the 17 extended journeys,
  two common master journeys and paired UI probe.
- PNGs, saved JSON/Newick/SVG and metadata files document real rendered
  results and actual browser downloads. Metadata values are synthetic.

Earlier successful counts (such as the 30-test browser run) remain as earlier
evidence, not additional independent passes. The final reports identify which
results supersede them.
