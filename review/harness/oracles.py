"""Small independent allele-table oracles for reviewable intentional changes."""

import csv
import math

from compare_outputs import parse_matrix


MISSING = {"0", "N", "-"}


def complete_delete_distance_oracle(profile, distance_text, atol=1e-5):
    """Check Hamming fraction after discarding loci missing in any input row."""
    with open(profile, newline="") as handle:
        source = list(csv.reader(handle, delimiter="\t"))
    header, rows = source[0], source[1:]
    if not rows or any(len(row) != len(header) for row in rows):
        raise ValueError("nonrectangular profile table")
    retained = [index for index in range(1, len(header))
                if all(row[index].upper() not in MISSING for row in rows)]
    if not retained:
        raise ValueError("no complete loci for oracle")
    alleles = {row[0]: row for row in rows}
    matrix, names = parse_matrix(distance_text)
    if set(names) != set(alleles):
        return {"pass": False, "reason": "label mismatch", "retained_loci": len(retained)}
    differences = []
    for left in names:
        for column, right in enumerate(names):
            expected = sum(alleles[left][index].upper() != alleles[right][index].upper()
                           for index in retained) / len(retained)
            observed = matrix[left][column]
            if not math.isclose(expected, observed, abs_tol=atol, rel_tol=0):
                differences.append({"source": left, "target": right,
                                    "expected": expected, "observed": observed})
    return {"pass": not differences, "retained_loci": len(retained),
            "differences": differences[:20], "difference_count": len(differences)}
