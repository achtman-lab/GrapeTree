#!/usr/bin/env python3
"""Isolated backend entry point, invoked by run_case.py."""

import argparse
import sys
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--revision", choices=["baseline", "candidate"], required=True)
    parser.add_argument("--profile", required=True)
    parser.add_argument("--method", required=True)
    parser.add_argument("--matrix-type", required=True)
    parser.add_argument("--handle-missing", required=True)
    parser.add_argument("--heuristic", required=True)
    parser.add_argument("--n-proc", type=int, required=True)
    parser.add_argument("--total-loci", type=int)
    parser.add_argument("--branch-recraft", action="store_true")
    parser.add_argument("--wgmlst", action="store_true")
    parser.add_argument("--output-self-test-bytes", type=int, default=0)
    parser.add_argument("--self-test-sleep-seconds", type=float, default=0)
    parser.add_argument("--self-test-allocate-mb", type=int, default=0)
    args = parser.parse_args()
    if (args.output_self_test_bytes or args.self_test_sleep_seconds or
        args.self_test_allocate_mb):
        reserved = bytearray(args.self_test_allocate_mb * 1024 * 1024)
        for index in range(0, len(reserved), 4096):
            reserved[index] = 1
        if args.self_test_sleep_seconds:
            time.sleep(args.self_test_sleep_seconds)
        chunk = "x" * 65536
        remaining = args.output_self_test_bytes
        while remaining:
            amount = min(remaining, len(chunk))
            sys.stdout.write(chunk[:amount])
            remaining -= amount
        return
    sys.path.insert(0, args.source)
    if args.revision == "baseline":
        from module.MSTrees import backend
    else:
        from grapetree.module.MSTrees import backend
    missing = (float(args.handle_missing) if args.matrix_type == "blockwise"
               else args.handle_missing)
    options = dict(profile=args.profile, method=args.method,
                   matrix_type=args.matrix_type, handle_missing=missing,
                   heuristic=args.heuristic, n_proc=args.n_proc,
                   branch_recraft=args.branch_recraft, wgMLST=args.wgmlst)
    if args.total_loci is not None:
        options["total_loci"] = args.total_loci
    sys.stdout.write(str(backend(**options)))


if __name__ == "__main__":
    main()
