#!/usr/bin/env python3
"""Independent, label-aware comparison of GrapeTree distance and Newick output."""

import argparse
import json
import math
from dataclasses import dataclass, field
from pathlib import Path


def parse_matrix(value):
    lines = [line.strip() for line in value.splitlines() if line.strip()]
    if not lines:
        raise ValueError("empty distance matrix")
    size = int(lines[0])
    if len(lines) != size + 1:
        raise ValueError(f"expected {size} rows, received {len(lines) - 1}")
    names, rows = [], []
    for line in lines[1:]:
        cells = line.split()
        if len(cells) != size + 1:
            raise ValueError(f"expected {size} distances in row: {line[:80]}")
        names.append(cells[0])
        row = [float(item) for item in cells[1:]]
        if not all(map(math.isfinite, row)):
            raise ValueError("non-finite distance")
        rows.append(row)
    if len(set(names)) != size:
        raise ValueError("duplicate matrix labels")
    return dict(zip(names, rows)), names


def compare_matrices(expected, observed, atol=1e-5, rtol=1e-6):
    a, an = parse_matrix(expected)
    b, bn = parse_matrix(observed)
    problems = []
    if set(an) != set(bn):
        problems.append({"kind": "labels", "missing": sorted(set(an) - set(bn)),
                         "extra": sorted(set(bn) - set(an))})
    if not problems:
        bindex = {name: index for index, name in enumerate(bn)}
        for source in an:
            for target_index, target in enumerate(an):
                x = a[source][target_index]
                y = b[source][bindex[target]]
                if not math.isclose(x, y, abs_tol=atol, rel_tol=rtol):
                    problems.append({"kind": "distance", "source": source,
                                     "target": target, "expected": x, "observed": y})
    return {"pass": not problems, "differences": problems[:100],
            "difference_count": len(problems), "size": len(an)}


def _matrix_file_index(path):
    offsets = {}
    names = []
    with open(path, "rb") as handle:
        count = int(handle.readline().strip())
        for _ in range(count):
            offset = handle.tell()
            line = handle.readline()
            if not line:
                raise ValueError("matrix file ended before declared row count")
            name = line.split(maxsplit=1)[0].decode("utf-8")
            if name in offsets:
                raise ValueError("duplicate matrix label")
            offsets[name] = offset
            names.append(name)
        if handle.read().strip():
            raise ValueError("matrix has trailing rows")
    return offsets, names


def compare_matrix_files(expected, observed, atol=1e-5, rtol=1e-6):
    """Compare every directed cell while holding only two matrix rows in memory."""
    expected_offsets, expected_names = _matrix_file_index(expected)
    observed_offsets, observed_names = _matrix_file_index(observed)
    if set(expected_names) != set(observed_names):
        return {"pass": False, "differences": [{"kind": "labels",
                "missing": sorted(set(expected_names) - set(observed_names)),
                "extra": sorted(set(observed_names) - set(expected_names))}],
                "difference_count": 1, "size": len(expected_names)}
    observed_columns = {name: index for index, name in enumerate(observed_names)}
    differences = []
    count = 0
    with open(expected, "rb") as left, open(observed, "rb") as right:
        for source in expected_names:
            left.seek(expected_offsets[source])
            right.seek(observed_offsets[source])
            x = left.readline().split()
            y = right.readline().split()
            if len(x) != len(expected_names) + 1 or len(y) != len(observed_names) + 1:
                raise ValueError("matrix row has wrong number of cells")
            for column, target in enumerate(expected_names):
                a = float(x[column + 1])
                b = float(y[observed_columns[target] + 1])
                if not math.isfinite(a) or not math.isfinite(b):
                    raise ValueError("non-finite matrix distance")
                if not math.isclose(a, b, abs_tol=atol, rel_tol=rtol):
                    count += 1
                    if len(differences) < 100:
                        differences.append({"kind": "distance", "source": source,
                                            "target": target, "expected": a,
                                            "observed": b})
    return {"pass": count == 0, "differences": differences,
            "difference_count": count, "size": len(expected_names),
            "comparison": "streaming_all_directed_cells"}


@dataclass(eq=False)
class Node:
    name: str = ""
    length: float = 0.0
    children: list = field(default_factory=list)
    parent: object = None


class NewickParser:
    def __init__(self, value):
        self.value = value.strip()
        self.pos = 0

    def token(self):
        if self.pos < len(self.value) and self.value[self.pos] in "\"'":
            quote = self.value[self.pos]
            self.pos += 1
            start = self.pos
            while self.pos < len(self.value) and self.value[self.pos] != quote:
                self.pos += 1
            if self.pos == len(self.value):
                raise ValueError("unclosed quoted label")
            result = self.value[start:self.pos]
            self.pos += 1
            return result
        start = self.pos
        while self.pos < len(self.value) and self.value[self.pos] not in ",():;":
            self.pos += 1
        return self.value[start:self.pos].strip()

    def subtree(self):
        node = Node()
        if self.pos < len(self.value) and self.value[self.pos] == "(":
            self.pos += 1
            while True:
                child = self.subtree()
                child.parent = node
                node.children.append(child)
                if self.pos >= len(self.value):
                    raise ValueError("unclosed group")
                mark = self.value[self.pos]
                self.pos += 1
                if mark == ")":
                    break
                if mark != ",":
                    raise ValueError(f"unexpected character {mark!r}")
        node.name = self.token()
        if self.pos < len(self.value) and self.value[self.pos] == ":":
            self.pos += 1
            value = self.token()
            node.length = float(value)
            if not math.isfinite(node.length):
                raise ValueError("non-finite branch length")
        return node

    def parse(self):
        root = self.subtree()
        if self.value[self.pos:] != ";":
            raise ValueError("Newick must end with one semicolon")
        return root


def _nodes(root):
    yield root
    for child in root.children:
        yield from _nodes(child)


def tree_signature(value):
    root = NewickParser(value).parse()
    nodes = list(_nodes(root))
    leaves = [node for node in nodes if not node.children]
    names = [node.name for node in leaves]
    if any(not name for name in names) or len(set(names)) != len(names):
        raise ValueError("tree has unnamed or duplicate leaves")
    name_set = frozenset(names)
    descendants = {}

    def visit(node):
        result = frozenset([node.name]) if not node.children else frozenset().union(
            *(visit(child) for child in node.children)
        )
        descendants[node] = result
        return result

    visit(root)
    splits = set()
    positive_splits = set()
    for node in nodes:
        if node.parent is None:
            continue
        side = descendants[node]
        other = name_set - side
        if len(side) > 1 and len(other) > 1:
            split = tuple(sorted(tuple(sorted(part)) for part in (side, other)))
            splits.add(split)
            if abs(node.length) > 1e-9:
                positive_splits.add(split)

    def ancestors(node):
        distances = {node: 0.0}
        distance = 0.0
        while node.parent is not None:
            distance += node.length
            node = node.parent
            distances[node] = distance
        return distances

    ancestry = {node.name: ancestors(node) for node in leaves}
    pair_distances = {}
    for i, left in enumerate(sorted(names)):
        for right in sorted(names)[i + 1:]:
            left_path = ancestry[left]
            right_path = ancestry[right]
            common = next(node for node in left_path if node in right_path)
            pair_distances[(left, right)] = left_path[common] + right_path[common]
    return {"leaves": sorted(names), "splits": splits,
            "positive_splits": positive_splits,
            "pair_distances": pair_distances}


def validated_leaf_labels(value):
    """Validate Newick structure and labels in linear space for large trees."""
    value = value.strip()
    if not value.endswith(";") or value.count(";") != 1:
        raise ValueError("Newick must end with one semicolon")
    depth = 0
    leaves = []
    previous = "start"
    pos = 0
    while pos < len(value) - 1:
        char = value[pos]
        if char.isspace():
            pos += 1
            continue
        if char == "(":
            if previous not in {"start", "open", "comma"}:
                raise ValueError("unexpected open parenthesis")
            depth += 1
            previous = "open"
            pos += 1
        elif char == ")":
            if depth == 0 or previous in {"start", "open", "comma", "colon"}:
                raise ValueError("unbalanced or empty group")
            depth -= 1
            previous = "close"
            pos += 1
        elif char == ",":
            if depth == 0 or previous in {"start", "open", "comma", "colon"}:
                raise ValueError("unexpected comma")
            previous = "comma"
            pos += 1
        elif char == ":":
            if previous not in {"name", "close"}:
                raise ValueError("unexpected branch length")
            previous = "colon"
            pos += 1
        else:
            if char in "\"'":
                quote = char
                end = value.find(quote, pos + 1)
                if end < 0:
                    raise ValueError("unclosed quoted label")
                token = value[pos + 1:end]
                pos = end + 1
            else:
                start = pos
                while pos < len(value) - 1 and value[pos] not in "(),:;":
                    pos += 1
                token = value[start:pos].strip()
            if not token:
                raise ValueError("empty Newick token")
            if previous == "colon":
                if not math.isfinite(float(token)):
                    raise ValueError("non-finite branch length")
                previous = "length"
            elif previous in {"start", "open", "comma"}:
                leaves.append(token)
                previous = "name"
            elif previous == "close":
                previous = "name"  # optional internal node label
            else:
                raise ValueError("unexpected Newick token")
    if depth or previous in {"start", "open", "comma", "colon"}:
        raise ValueError("incomplete Newick tree")
    if not leaves or len(set(leaves)) != len(leaves):
        raise ValueError("unnamed or duplicate Newick leaves")
    return sorted(leaves)


def compare_trees(expected, observed, atol=1e-5, rtol=1e-6,
                  max_exhaustive_leaves=1000):
    expected_leaves = validated_leaf_labels(expected)
    observed_leaves = validated_leaf_labels(observed)
    if len(expected_leaves) > max_exhaustive_leaves or len(observed_leaves) > max_exhaustive_leaves:
        if expected == observed and expected_leaves == observed_leaves:
            return {"pass": True, "comparison": "exact_bytes_validated_newick",
                    "differences": [], "difference_count": 0,
                    "leaf_count": len(expected_leaves)}
        return {"pass": False, "blocked": True,
                "reason": "large nonidentical trees need a scalable topology and branch comparator",
                "comparison": "large_nonidentical_unresolved",
                "differences": [{"kind": "large_tree_difference"}],
                "difference_count": 1, "leaf_count": len(expected_leaves),
                "observed_leaf_count": len(observed_leaves)}
    try:
        a, b = tree_signature(expected), tree_signature(observed)
    except RecursionError:
        return {"pass": False, "blocked": True,
                "reason": "tree depth exceeds exhaustive parser recursion limit",
                "differences": [{"kind": "tree_depth"}],
                "difference_count": 1, "leaf_count": len(expected_leaves)}
    problems = []
    if a["leaves"] != b["leaves"]:
        problems.append({"kind": "leaves",
                         "missing": sorted(set(a["leaves"]) - set(b["leaves"])),
                         "extra": sorted(set(b["leaves"]) - set(a["leaves"]))})
    if a["positive_splits"] != b["positive_splits"]:
        problems.append({"kind": "positive_topology",
                         "missing": len(a["positive_splits"] - b["positive_splits"]),
                         "extra": len(b["positive_splits"] - a["positive_splits"])})
    if a["splits"] != b["splits"]:
        problems.append({"kind": "raw_topology",
                         "missing": len(a["splits"] - b["splits"]),
                         "extra": len(b["splits"] - a["splits"])})
    for pair in sorted(a["pair_distances"].keys() & b["pair_distances"].keys()):
        x, y = a["pair_distances"][pair], b["pair_distances"][pair]
        if not math.isclose(x, y, abs_tol=atol, rel_tol=rtol):
            problems.append({"kind": "path_length", "pair": pair,
                             "expected": x, "observed": y})
    return {"pass": not problems, "differences": problems[:100],
            "difference_count": len(problems), "leaf_count": len(a["leaves"])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["distance", "tree"])
    parser.add_argument("expected", type=Path)
    parser.add_argument("observed", type=Path)
    parser.add_argument("--atol", type=float, default=1e-5)
    parser.add_argument("--rtol", type=float, default=1e-6)
    args = parser.parse_args()
    method = compare_matrices if args.kind == "distance" else compare_trees
    result = method(args.expected.read_text(), args.observed.read_text(),
                    atol=args.atol, rtol=args.rtol)
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["pass"] else 1)


if __name__ == "__main__":
    main()
