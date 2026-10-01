#!/usr/bin/env python3
"""Run held-back scientific cases against master, pinned PR and current dependencies.

Run with the development Python (ete3 required). Inputs are complete downloaded
EnteroBase archives; generated manifests record the exact source and sample IDs.
"""

import argparse
import hashlib
import itertools
import json
from pathlib import Path
import subprocess
import sys

from ete3 import Tree

sys.path.insert(0, str(Path(__file__).parent / 'harness'))
from sample_profiles import sample_archive
from compare_outputs import compare_matrices, compare_trees


def independent_tree_check(left, right):
    """Use ETE as a second parser, independent of the review comparator."""
    a, b = Tree(left, format=1), Tree(right, format=1)
    assert sorted(a.get_leaf_names()) == sorted(b.get_leaf_names())
    for x, y in itertools.combinations(a.get_leaf_names(), 2):
        assert abs(a.get_distance(x, y) - b.get_distance(x, y)) < 1e-5


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data-root', type=Path, required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--python-reference', type=Path, required=True)
    parser.add_argument('--python-current', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[1]
    worker = repo / 'review/harness/worker.py'
    args.output.mkdir(parents=True, exist_ok=True)
    sample_dir = args.output / 'samples'
    for species, scheme in [('Yersinia', 'cgMLSTv1'),
                            ('Escherichia', 'cgMLSTv1'),
                            ('Salmonella', 'cgMLSTv2')]:
        sample_archive(args.data_root / 'raw' / f'{species}.{scheme}.profiles.list.gz',
                       sample_dir, species, [37, 137], [103],
                       f'https://enterobase.warwick.ac.uk/schemes/{species}.{scheme}/profiles.list.gz')
    records = []
    for profile in sorted(sample_dir.glob('*.profile')):
        for method in ['MSTree', 'MSTreeV2', 'distance']:
            outputs = {}
            for name, source, python, revision in [
                ('master', args.baseline, args.python_reference, 'baseline'),
                ('review-pinned', repo, args.python_reference, 'candidate'),
                ('review-current', repo, args.python_current, 'candidate'),
            ]:
                directory = args.output / profile.stem / method / name
                directory.mkdir(parents=True, exist_ok=True)
                command = [str(python.absolute()), str(worker), '--source', str(source),
                           '--revision', revision, '--profile', str(profile.resolve()),
                           '--method', method, '--matrix-type', 'symmetric',
                           '--handle-missing', 'pair_delete', '--heuristic', 'eBurst',
                           '--n-proc', '1']
                result = subprocess.run(command, cwd=directory, capture_output=True,
                                        text=True, timeout=180)
                (directory / 'stdout.txt').write_text(result.stdout)
                (directory / 'stderr.txt').write_text(result.stderr)
                (directory / 'command.json').write_text(json.dumps(command, indent=2))
                if result.returncode:
                    raise RuntimeError(f'{profile.stem} {method} {name}: {result.stderr}')
                outputs[name] = result.stdout
            comparator = compare_matrices if method == 'distance' else compare_trees
            for name in ['review-pinned', 'review-current']:
                comparison = comparator(outputs['master'], outputs[name])
                if method != 'distance' and comparison['pass']:
                    independent_tree_check(outputs['master'], outputs[name])
                records.append({'dataset': profile.name, 'method': method,
                                'candidate': name, **comparison})
                (args.output / 'summary.json').write_text(json.dumps(records, indent=2))
                print(profile.name, method, name, comparison['pass'], flush=True)
    source_hashes = {}
    for path in [repo / 'grapetree/module/MSTrees.py',
                 args.baseline / 'module/MSTrees.py', worker]:
        source_hashes[str(path)] = hashlib.sha256(path.read_bytes()).hexdigest()
    (args.output / 'source-hashes.json').write_text(json.dumps(source_hashes, indent=2))
    raise SystemExit(0 if all(item['pass'] for item in records) else 1)


if __name__ == '__main__':
    main()
