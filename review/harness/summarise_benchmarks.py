#!/usr/bin/env python3
"""Summarise completed paired benchmark runs without rerunning them."""

import argparse
import json
import statistics
from collections import defaultdict
from pathlib import Path


def summarise(rows):
    grouped = defaultdict(list)
    for row in rows:
        if not row["comparison"]["pass"]:
            continue
        grouped[(row["size"], row["method"])].append(row)
    result = []
    for (size, method), group in sorted(grouped.items()):
        def series(revision, metric):
            return [item["runs"][revision][metric] for item in group]
        base = series("baseline", "elapsed_seconds")
        cand = series("candidate", "elapsed_seconds")
        base_mem = series("baseline", "sampled_peak_process_tree_rss_bytes")
        cand_mem = series("candidate", "sampled_peak_process_tree_rss_bytes")
        result.append({
            "size": size, "method": method, "repetitions": len(group),
            "baseline_seconds": base, "candidate_seconds": cand,
            "baseline_median_seconds": statistics.median(base),
            "candidate_median_seconds": statistics.median(cand),
            "baseline_range_seconds": [min(base), max(base)],
            "candidate_range_seconds": [min(cand), max(cand)],
            "candidate_over_baseline": statistics.median(cand) / statistics.median(base),
            "baseline_peak_rss_bytes": base_mem,
            "candidate_peak_rss_bytes": cand_mem,
            "baseline_median_peak_rss_bytes": statistics.median(base_mem),
            "candidate_median_peak_rss_bytes": statistics.median(cand_mem),
        })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("summary", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    rows = json.loads(args.summary.read_text())
    report = summarise(rows)
    if not report:
        raise SystemExit("no successful paired benchmark cases")
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
