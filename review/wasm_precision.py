#!/usr/bin/env python3
"""Check each unrooted NJ branch against printed six-significant-digit precision."""

import argparse
import json
import math
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent / 'harness'))
from compare_outputs import NewickParser, _nodes


def edge_lengths(newick):
    root = NewickParser(newick).parse()
    nodes = list(_nodes(root))
    leaves = {node.name for node in nodes if not node.children}
    if not leaves:
        raise ValueError('Tree has no leaves')
    descendants = {}

    def collect(node):
        result = ({node.name} if not node.children else
                  set().union(*(collect(child) for child in node.children)))
        descendants[node] = result
        return result

    collect(root)
    edges = {}
    for node in nodes:
        if node.parent is None:
            continue
        side = tuple(sorted(descendants[node]))
        other = tuple(sorted(leaves - descendants[node]))
        key = min(side, other)
        entry = edges.setdefault(key, {'length': 0.0, 'uncertainty': 0.0})
        entry['length'] += node.length
        if node.length != 0:
            # Python ete3 serialises format=1 branch lengths with %0.6g.
            # Half a unit in the sixth significant digit is the largest
            # rounding error of one independently printed branch.
            order = math.floor(math.log10(abs(node.length)))
            entry['uncertainty'] += 0.5 * 10 ** (order - 5)
    return edges


def compare_edges(expected, observed, arithmetic_floor=1e-9):
    left = edge_lengths(expected)
    right = edge_lengths(observed)
    differences = []
    for split in sorted(left.keys() | right.keys()):
        if split not in left or split not in right:
            differences.append({'kind': 'split', 'side': split,
                                'missing': split not in right,
                                'extra': split not in left})
            continue
        a, b = left[split], right[split]
        allowance = a['uncertainty'] + b['uncertainty'] + arithmetic_floor
        difference = abs(a['length'] - b['length'])
        if difference > allowance:
            differences.append({'kind': 'branch_length', 'side': split,
                                'expected': a['length'], 'observed': b['length'],
                                'difference': difference,
                                'precision_allowance': allowance})
    return {'pass': not differences, 'difference_count': len(differences),
            'differences': differences[:100], 'edge_count': len(left)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('expected', type=Path)
    parser.add_argument('observed', type=Path)
    args = parser.parse_args()
    result = compare_edges(args.expected.read_text(), args.observed.read_text())
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result['pass'] else 1)


if __name__ == '__main__':
    main()
