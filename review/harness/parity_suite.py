#!/usr/bin/env python3
"""Run the same profile cases against frozen main and PR source snapshots."""

import argparse
import json
import subprocess
from pathlib import Path
from types import SimpleNamespace

from compare_outputs import (compare_matrices, compare_trees, parse_matrix,
                             tree_signature, validated_leaf_labels)
from oracles import complete_delete_distance_oracle
from run_case import run_case


BASELINE_SHA = "f993e82f9efa1ebdde938eff5c81756076bf1314"
CANDIDATE_SHA = "d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc"


def cases_for(tier, data):
    samples = data / "samples"
    scenarios = data / "scenarios"
    if tier == "small":
        for size in (1, 2, 3, 10):
            for method in ("distance", "MSTree", "MSTreeV2"):
                yield dict(name=f"Yersinia-n{size}-s7-{method}",
                           profile=samples / f"Yersinia.n{size}.s7.profile",
                           method=method)
        for species in ("Escherichia", "Salmonella"):
            for method in ("distance", "MSTreeV2"):
                yield dict(name=f"{species}-n10-s7-{method}",
                           profile=samples / f"{species}.n10.s7.profile",
                           method=method)
    elif tier == "options":
        challenge = scenarios / "synthetic_outbreak.profile"
        for matrix in ("symmetric", "asymmetric"):
            for missing in ("pair_delete", "absolute_distance", "as_allele", "complete_delete"):
                yield dict(name=f"distance-{matrix}-{missing}", profile=challenge,
                           method="distance", matrix_type=matrix,
                           handle_missing=missing)
        for penalty in (0.01, 0.1, 1.0):
            yield dict(name=f"distance-blockwise-{penalty}", profile=challenge,
                       method="distance", matrix_type="blockwise",
                       handle_missing=str(penalty))
        for matrix in ("symmetric", "asymmetric"):
            for heuristic in ("eBurst", "harmonic"):
                yield dict(name=f"MSTree-{matrix}-{heuristic}", profile=challenge,
                           method="MSTree", matrix_type=matrix,
                           heuristic=heuristic)
        for penalty in (0.01, 0.1, 1.0):
            yield dict(name=f"MSTree-blockwise-{penalty}", profile=challenge,
                       method="MSTree", matrix_type="blockwise",
                       handle_missing=str(penalty))
        for method in ("distance", "MSTree", "MSTreeV2"):
            yield dict(name=f"{method}-multiprocess", profile=challenge,
                       method=method, n_proc=2)
        yield dict(name="MSTree-wgMLST", profile=challenge, method="MSTree",
                   matrix_type="asymmetric", wgmlst=True)
        yield dict(name="MSTree-recraft", profile=challenge, method="MSTree",
                   matrix_type="symmetric", branch_recraft=True)
    elif tier == "routine":
        for species in ("Yersinia", "Escherichia", "Salmonella"):
            for size in (50, 100, 500, 1000):
                for seed in (7, 19, 43):
                    for method in ("distance", "MSTree", "MSTreeV2"):
                        yield dict(name=f"{species}-n{size}-s{seed}-{method}",
                                   profile=samples / f"{species}.n{size}.s{seed}.profile",
                                   method=method, species=species, size=size,
                                   seed=seed)
    elif tier == "native":
        for method in ("NJ", "RapidNJ", "ninja"):
            yield dict(name=f"Yersinia-n10-{method}",
                       profile=samples / "Yersinia.n10.s7.profile", method=method)
    elif tier == "edges":
        for name in ("synthetic_outbreak", "synthetic_all_missing",
                     "synthetic_duplicate_id"):
            for method in ("distance", "MSTree", "MSTreeV2"):
                yield dict(name=f"{name}-{method}",
                           profile=scenarios / f"{name}.profile", method=method)
    else:
        raise ValueError(tier)


def _last_error(stderr):
    lines = [line.strip() for line in stderr.splitlines() if line.strip()]
    return lines[-1] if lines else ""


def verify_wgmlst_flag(args):
    script = Path(__file__).with_name("verify_wgmlst.py")
    observed = {}
    for revision, source in (("baseline", args.baseline),
                             ("candidate", args.candidate)):
        process = subprocess.run(
            [str(args.python), str(script), "--source", str(source),
             "--revision", revision], capture_output=True, text=True,
            cwd=args.output,
        )
        if not process.stdout:
            return {"pass": False, "error": process.stderr[-1000:]}
        observed[revision] = json.loads(process.stdout)
    return {"pass": bool(
        observed["baseline"]["raw_distance_oracle_pass"] and
        observed["candidate"]["raw_distance_oracle_pass"] and
        not observed["baseline"]["backend_flag_oracle_pass"] and
        observed["candidate"]["backend_flag_oracle_pass"]),
        "observed": observed}


def execute_case(case, args):
    case_dir = args.output / case["name"]
    results = {}
    for revision, source, sha in (
        ("baseline", args.baseline, BASELINE_SHA),
        ("candidate", args.candidate, CANDIDATE_SHA),
    ):
        options = dict(source=source, source_sha=sha, revision=revision,
                       profile=case["profile"], output=case_dir / revision,
                       python=args.python, method=case["method"],
                       matrix_type=case.get("matrix_type", "symmetric"),
                       handle_missing=case.get("handle_missing", "pair_delete"),
                       heuristic=case.get("heuristic", "eBurst"),
                       n_proc=case.get("n_proc", 1),
                       total_loci=case.get("total_loci"),
                       branch_recraft=case.get("branch_recraft", False),
                       wgmlst=case.get("wgmlst", False), timeout=args.timeout,
                       max_rss_mb=args.max_rss_mb, track_temp_disk=args.track_temp_disk,
                       output_self_test_bytes=0)
        results[revision] = run_case(SimpleNamespace(**options))
    base, candidate = results["baseline"], results["candidate"]
    base_output = (case_dir / "baseline" / "result.txt").read_text()
    candidate_output = (case_dir / "candidate" / "result.txt").read_text()
    if (not base["resource_cleanup_complete"] or
        not candidate["resource_cleanup_complete"]):
        comparison = {"pass": False,
                      "baseline_cleanup_complete": base["resource_cleanup_complete"],
                      "candidate_cleanup_complete": candidate["resource_cleanup_complete"]}
        status = "resource_cleanup_incomplete"
        functionality_pass = False
    elif (base["termination_reason"] != "normal_exit" or
        candidate["termination_reason"] != "normal_exit"):
        comparison = {"pass": False,
                      "baseline_termination": base["termination_reason"],
                      "candidate_termination": candidate["termination_reason"]}
        status = "resource_or_timeout_failure"
        functionality_pass = False
    elif base["exit_code"] == candidate["exit_code"] == 0:
        compare = compare_matrices if case["method"] == "distance" else compare_trees
        try:
            comparison = compare(base_output, candidate_output)
        except Exception as error:
            comparison = {"pass": False, "comparison_error": repr(error)}
        status = "parity_pass" if comparison["pass"] else "parity_fail"
        functionality_pass = True
        if case["name"].startswith("synthetic_outbreak-"):
            try:
                if case["method"] == "distance":
                    matrix, names = parse_matrix(candidate_output)
                    indexed = {name: index for index, name in enumerate(names)}
                    duplicate_zero = (
                        matrix["outbreak_ref"][indexed["outbreak_duplicate"]] == 0 and
                        matrix["outbreak_duplicate"][indexed["outbreak_ref"]] == 0)
                else:
                    signature = tree_signature(candidate_output)
                    duplicate_zero = signature["pair_distances"][
                        ("outbreak_duplicate", "outbreak_ref")] == 0
                comparison["duplicate_profile_zero_distance"] = duplicate_zero
                if not duplicate_zero:
                    status = "duplicate_group_failure"
                    functionality_pass = False
            except (KeyError, ValueError) as error:
                comparison["duplicate_profile_error"] = repr(error)
                status = "duplicate_group_failure"
                functionality_pass = False
        if case["name"].startswith("synthetic_all_missing-"):
            labels = {}
            for revision, value in (("baseline", base_output),
                                    ("candidate", candidate_output)):
                if case["method"] == "distance":
                    _, labels[revision] = parse_matrix(value)
                else:
                    labels[revision] = validated_leaf_labels(value)
            expected = {line.split("\t", 1)[0] for line in
                        case["profile"].read_text().splitlines()[1:]}
            exclusions = {revision: sorted(expected - set(actual))
                          for revision, actual in labels.items()}
            comparison["input_taxa_excluded"] = exclusions
            if exclusions == {"baseline": ["all_missing"],
                              "candidate": ["all_missing"]}:
                status = "both_exclude_all_missing"
                functionality_pass = False
            elif any(exclusions.values()):
                status = "input_taxa_mismatch"
                functionality_pass = False
        if (case["method"] == "distance" and
            case.get("handle_missing") == "complete_delete" and
            status == "parity_fail"):
            oracle = complete_delete_distance_oracle(case["profile"], candidate_output)
            comparison["independent_candidate_oracle"] = oracle
            if oracle["pass"]:
                status = "intentional_correction_verified"
        if case["name"] == "MSTree-wgMLST" and status == "parity_fail":
            oracle = verify_wgmlst_flag(args)
            comparison["independent_wgmlst_oracle"] = oracle
            if oracle["pass"]:
                status = "intentional_correction_verified"
    elif base["exit_code"] != 0 and candidate["exit_code"] != 0:
        base_error = _last_error((case_dir / "baseline" / "stderr.txt").read_text())
        candidate_error = _last_error((case_dir / "candidate" / "stderr.txt").read_text())
        comparison = {"pass": base_error == candidate_error,
                      "baseline_error": base_error, "candidate_error": candidate_error}
        status = ("both_failed_same_error" if comparison["pass"] and base_error
                  else "both_failed_differently")
        functionality_pass = False
    else:
        comparison = {"pass": False, "baseline_exit": base["exit_code"],
                      "candidate_exit": candidate["exit_code"]}
        status = "candidate_only_failure" if candidate["exit_code"] else "baseline_only_failure"
        functionality_pass = candidate["exit_code"] == 0
        if (case["name"].startswith("synthetic_duplicate_id-") and
            base["exit_code"] == 0 and candidate["exit_code"] != 0):
            candidate_error = _last_error(
                (case_dir / "candidate" / "stderr.txt").read_text())
            if candidate_error.startswith("ValueError: Duplicate taxon names"):
                status = "intentional_input_rejection_verified"
                comparison["expected_invalid_input"] = True
                comparison["candidate_error"] = candidate_error
                functionality_pass = True
        if (case["method"] == "ninja" and base["exit_code"] != 0 and
            candidate["exit_code"] == 0):
            expected = {line.split("\t", 1)[0] for line in
                        case["profile"].read_text().splitlines()[1:]}
            try:
                actual = set(validated_leaf_labels(candidate_output))
            except ValueError:
                actual = set()
            comparison["candidate_valid_leaf_set"] = actual == expected
            if actual == expected:
                status = "baseline_native_tool_incompatible_candidate_valid"
            else:
                functionality_pass = False
    result = {"case": case, "status": status, "comparison": comparison,
              "functionality_pass": functionality_pass,
              "baseline_run": str((case_dir / "baseline" / "run.json").resolve()),
              "candidate_run": str((case_dir / "candidate" / "run.json").resolve())}
    result["case"]["profile"] = str(case["profile"])
    (case_dir / "comparison.json").write_text(json.dumps(result, indent=2) + "\n")
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("tier", choices=["small", "options", "routine", "native", "edges"])
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--candidate", type=Path, required=True)
    parser.add_argument("--python", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--timeout", type=float, default=120)
    parser.add_argument("--max-rss-mb", type=int, default=6000)
    parser.add_argument("--track-temp-disk", action="store_true")
    parser.add_argument("--sizes", type=int, nargs="+", help="filter routine sample sizes")
    parser.add_argument("--seeds", type=int, nargs="+", help="filter routine seeds")
    parser.add_argument("--methods", nargs="+", help="filter routine methods")
    parser.add_argument("--species", nargs="+", help="filter routine species")
    args = parser.parse_args()
    if args.tier == "routine":
        valid = {"Yersinia", "Escherichia", "Salmonella"}
        if args.species and set(args.species) - valid:
            parser.error("unknown species filter")
        valid_methods = {"distance", "MSTree", "MSTreeV2"}
        if args.methods and set(args.methods) - valid_methods:
            parser.error("unknown method filter")
    args.output.mkdir(parents=True, exist_ok=True)
    results = []
    def save_summary():
        accepted = {"parity_pass", "intentional_correction_verified",
                    "intentional_input_rejection_verified", "both_failed_same_error",
                    "both_exclude_all_missing",
                    "baseline_native_tool_incompatible_candidate_valid"}
        summary = {"tier": args.tier, "count": len(results),
                   "statuses": {status: sum(r["status"] == status for r in results)
                                for status in sorted(set(r["status"] for r in results))},
                   "parity_acceptable": bool(results) and all(
                       r["status"] in accepted for r in results),
                   "all_functionality_pass": bool(results) and all(
                       r["functionality_pass"] for r in results),
                   "results": results}
        (args.output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        return summary
    for case in cases_for(args.tier, args.data):
        if args.tier == "routine" and any((
            args.sizes and case["size"] not in args.sizes,
            args.seeds and case["seed"] not in args.seeds,
            args.methods and case["method"] not in args.methods,
            args.species and case["species"] not in args.species,
        )):
            continue
        if not case["profile"].exists():
            raise FileNotFoundError(case["profile"])
        result = execute_case(case, args)
        results.append(result)
        save_summary()
        print(result["status"], case["name"], flush=True)
    summary = save_summary()
    print(json.dumps({key: summary[key] for key in (
        "tier", "count", "statuses", "parity_acceptable", "all_functionality_pass")},
        indent=2))
    raise SystemExit(0 if summary["parity_acceptable"] and
                     summary["all_functionality_pass"] else 1)


if __name__ == "__main__":
    main()
