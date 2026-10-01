#!/usr/bin/env python3
"""Independent ETE-based edge audit of saved browser/reference tree pairs."""
import argparse
import json
import math
from pathlib import Path

from ete3 import Tree


def edges(text):
    tree = Tree(text.strip(), format=1)
    names = tree.get_leaf_names()
    assert len(names) == len(set(names)), 'duplicate leaves'
    all_names = set(names)
    result = {}
    for node in tree.iter_descendants():
        side = set(node.get_leaf_names())
        key = min(tuple(sorted(side)), tuple(sorted(all_names - side)))
        length, precision = result.get(key, (0, 0))
        assert math.isfinite(node.dist)
        unit = 0 if node.dist == 0 else 10 ** (math.floor(math.log10(abs(node.dist))) - 5)
        result[key] = (length + node.dist, precision + unit / 2)
    return all_names, result


def compare(left_text, right_text, nj=False):
    left_names, left = edges(left_text)
    right_names, right = edges(right_text)
    errors = []
    if left_names != right_names:
        errors.append('leaf sets differ')
    if left.keys() != right.keys():
        errors.append('unrooted edge splits differ')
    maximum = 0
    for key in left.keys() & right.keys():
        a, ap = left[key]
        b, bp = right[key]
        # Six significant digits are ETE's published tree representation.
        allowance = ap + bp + 1e-9 if nj else 1e-5 + 1e-6 * max(abs(a), abs(b))
        difference = abs(a - b)
        maximum = max(maximum, difference)
        if difference > allowance:
            errors.append({'split': key, 'expected': a, 'observed': b,
                           'difference': difference, 'allowance': allowance})
    return {'pass': not errors, 'errors': errors[:20], 'max_edge_delta': maximum}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    # This must reject a short-edge scientific error even beside a large edge.
    tree = '((a:1000,b:1):0.01,(c:2,d:3):0);'
    assert not compare(tree, tree.replace(':0.01', ':0.02'), nj=True)['pass']
    results = []
    for browser in sorted(args.directory.glob('*.browser.nwk')):
        reference = browser.with_name(browser.name.replace('.browser.nwk', '.python.nwk'))
        item = compare(reference.read_text(), browser.read_text(), nj='.NJ.' in browser.name)
        results.append({'case': browser.stem, **item})
    assert results, 'No saved tree pairs found'
    (args.directory / 'lead-ete-edge-audit.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({'count': len(results), 'passed': sum(r['pass'] for r in results),
                      'failures': [r for r in results if not r['pass']]}, indent=2))
    raise SystemExit(0 if all(r['pass'] for r in results) else 1)


if __name__ == '__main__':
    main()
