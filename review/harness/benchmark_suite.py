#!/usr/bin/env python3
"""Exclusive, staged A/B benchmark with correctness checks and raw evidence."""

import argparse
import json
import os
import platform
import statistics
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

import psutil

from compare_outputs import compare_matrix_files, compare_trees
from run_case import run_case


def host_state():
    memory = psutil.virtual_memory()
    return {"utc": datetime.now(timezone.utc).isoformat(),
            "platform": platform.platform(), "logical_cpus": os.cpu_count(),
            "available_memory_bytes": memory.available,
            "total_memory_bytes": memory.total,
            "loadavg": os.getloadavg(),
            "cpu_percent_1s": psutil.cpu_percent(interval=1)}


def run_pair(args, size, method, repetition):
    try:
        psutil.Process().children(recursive=True)
    except (psutil.AccessDenied, PermissionError) as error:
        raise RuntimeError(
            "process-tree visibility is required before a benchmark run"
        ) from error
    profile = args.data / "samples" / f"Salmonella.n{size}.s{args.seed}.profile"
    if not profile.exists():
        raise FileNotFoundError(profile)
    pair_dir = args.output / f"n{size}-{method}-s{args.seed}-r{repetition}"
    pair_dir.mkdir(parents=True, exist_ok=True)
    order = ("baseline", "candidate") if repetition % 2 else ("candidate", "baseline")
    results = {}
    for revision in order:
        state = host_state()
        (pair_dir / f"host-before-{revision}.json").write_text(
            json.dumps(state, indent=2) + "\n")
        if state["available_memory_bytes"] < args.min_available_mb * 1024 * 1024:
            raise RuntimeError(f"available memory below {args.min_available_mb} MiB")
        source = args.baseline if revision == "baseline" else args.candidate
        source_sha = args.baseline_sha if revision == "baseline" else args.candidate_sha
        options = dict(source=source, source_sha=source_sha, revision=revision,
                       profile=profile, output=pair_dir / revision,
                       python=args.python, method=method, matrix_type="symmetric",
                       handle_missing="pair_delete", heuristic="eBurst",
                       n_proc=1, total_loci=None, branch_recraft=False,
                       wgmlst=False, timeout=args.timeout,
                       max_rss_mb=args.max_rss_mb, track_temp_disk=True,
                       output_self_test_bytes=0)
        results[revision] = run_case(SimpleNamespace(**options))
        print(size, method, repetition, revision,
              results[revision]["elapsed_seconds"],
              results[revision]["sampled_peak_process_tree_rss_bytes"],
              results[revision]["termination_reason"], flush=True)
        if results[revision]["exit_code"] != 0 or \
           results[revision]["termination_reason"] != "normal_exit":
            comparison = {"pass": False, "blocked": True,
                          "reason": f"{revision} did not complete"}
            (pair_dir / "comparison.json").write_text(json.dumps(comparison, indent=2) + "\n")
            return {"size": size, "method": method, "repetition": repetition,
                    "runs": results, "comparison": comparison}
    left = pair_dir / "baseline" / "result.txt"
    right = pair_dir / "candidate" / "result.txt"
    if method == "distance":
        comparison = compare_matrix_files(left, right)
    else:
        comparison = compare_trees(left.read_text(), right.read_text())
    (pair_dir / "comparison.json").write_text(json.dumps(comparison, indent=2) + "\n")
    return {"size": size, "method": method, "repetition": repetition,
            "runs": results, "comparison": comparison}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--baseline-sha", default="f993e82f9efa1ebdde938eff5c81756076bf1314")
    parser.add_argument("--candidate-sha", default="d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc")
    parser.add_argument("--python", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sizes", type=int, nargs="+", required=True)
    parser.add_argument("--methods", nargs="+", default=["MSTreeV2", "MSTree", "distance"])
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--timeout", type=float, default=900)
    parser.add_argument("--max-rss-mb", type=int, default=6000)
    parser.add_argument("--min-available-mb", type=int, default=8500)
    args = parser.parse_args()
    if args.repetitions < 1 or not args.sizes or any(size < 1 for size in args.sizes):
        parser.error("at least one positive size and one repetition are required")
    valid_methods = {"MSTreeV2", "MSTree", "distance"}
    if not args.methods or set(args.methods) - valid_methods:
        parser.error("methods must be MSTreeV2, MSTree or distance")
    args.output.mkdir(parents=True, exist_ok=True)
    rows = []
    stop = False
    for size in args.sizes:
        for method in args.methods:
            for repetition in range(1, args.repetitions + 1):
                result = run_pair(args, size, method, repetition)
                rows.append(result)
                (args.output / "summary.json").write_text(json.dumps(rows, indent=2) + "\n")
                if not result["comparison"]["pass"]:
                    stop = True
                    break
            if stop:
                break
        if stop:
            break
    grouped = {}
    for row in rows:
        if not row["comparison"]["pass"]:
            continue
        key = (row["size"], row["method"])
        grouped.setdefault(key, {"baseline": [], "candidate": []})
        for revision in ("baseline", "candidate"):
            grouped[key][revision].append(row["runs"][revision]["elapsed_seconds"])
    report = []
    for (size, method), times in grouped.items():
        base = statistics.median(times["baseline"])
        cand = statistics.median(times["candidate"])
        report.append({"size": size, "method": method, "repetitions": len(times["baseline"]),
                       "baseline_median_seconds": base, "candidate_median_seconds": cand,
                       "baseline_min_seconds": min(times["baseline"]),
                       "baseline_max_seconds": max(times["baseline"]),
                       "candidate_min_seconds": min(times["candidate"]),
                       "candidate_max_seconds": max(times["candidate"]),
                       "baseline_median_peak_rss_bytes": statistics.median(
                           row["runs"]["baseline"]["sampled_peak_process_tree_rss_bytes"]
                           for row in rows if row["size"] == size and row["method"] == method
                           and row["comparison"]["pass"]),
                       "candidate_median_peak_rss_bytes": statistics.median(
                           row["runs"]["candidate"]["sampled_peak_process_tree_rss_bytes"]
                           for row in rows if row["size"] == size and row["method"] == method
                           and row["comparison"]["pass"]),
                       "candidate_over_baseline": cand / base})
    (args.output / "medians.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    raise SystemExit(1 if stop else 0)


if __name__ == "__main__":
    main()
