#!/usr/bin/env python3
"""Check directed wgMLST distances against a hand-calculated three-tip case."""

import argparse
import json
import math
import sys
from pathlib import Path

from compare_outputs import parse_matrix


EXPECTED_RAW = {
    "a": {"a": 0, "b": 1.5, "c": 1.5},
    "b": {"a": 4 / 3, "b": 0, "c": 2},
    "c": {"a": 4 / 3, "b": 2, "c": 0},
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--revision", choices=["baseline", "candidate"], required=True)
    parser.add_argument("--profile", type=Path, default=Path(__file__).parent / "fixtures/wgmlst_hand.profile")
    args = parser.parse_args()
    sys.path.insert(0, str(args.source.resolve()))
    if args.revision == "baseline":
        from module.MSTrees import backend, distance_matrix
    else:
        from grapetree.module.MSTrees import backend, distance_matrix
    import numpy as np

    profiles = np.array([[1, 1, 1], [1, 0, 2], [2, 1, 0]])
    actual_raw = distance_matrix.asymmetric_wgMLST(profiles, "pair_delete")
    expected = np.array([[EXPECTED_RAW[left][right] for right in "abc"] for left in "abc"])
    raw_pass = bool(np.allclose(actual_raw, expected, rtol=0, atol=1e-6))
    rendered = backend(profile=str(args.profile.resolve()), method="distance",
                       matrix_type="asymmetric", wgMLST=True,
                       handle_missing="pair_delete", n_proc=1)
    parsed, names = parse_matrix(rendered)
    backend_differences = []
    for left in names:
        for column, right in enumerate(names):
            observed = parsed[left][column]
            wanted = EXPECTED_RAW[left][right] / 3
            if not math.isclose(observed, wanted, abs_tol=1e-5, rel_tol=0):
                backend_differences.append({"source": left, "target": right,
                                            "expected": wanted, "observed": observed})
    result = {"revision": args.revision, "raw_distance_oracle_pass": raw_pass,
              "backend_flag_oracle_pass": not backend_differences,
              "backend_differences": backend_differences,
              "expected_raw": expected.tolist(), "actual_raw": actual_raw.tolist()}
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if raw_pass and not backend_differences else 1)


if __name__ == "__main__":
    main()
