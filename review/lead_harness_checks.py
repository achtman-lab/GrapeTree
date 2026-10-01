#!/usr/bin/env python3
"""Lead-owned fault injection: the review harness must reject wrong results."""
import argparse
import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent / 'harness'))
from compare_outputs import compare_matrices, compare_trees, compare_matrix_files
from run_case import run_case


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    checks = []

    def check(name, condition):
        checks.append({'name': name, 'pass': bool(condition)})
        if not condition:
            raise AssertionError(name)

    tree = '((a:1,b:2):3,(c:4,d:5):6);'
    check('accept sibling order changes', compare_trees(
        tree, '((d:5,c:4):6,(b:2,a:1):3);')['pass'])
    for name, mutant in [
        ('reject leaf substitution', tree.replace('d:', 'e:')),
        ('reject changed branch length', tree.replace('d:5', 'd:5.2')),
        ('reject changed topology', '((a:1,c:4):3,(b:2,d:5):6);'),
    ]:
        check(name, not compare_trees(tree, mutant)['pass'])
    try:
        compare_trees(tree, tree.replace('d:5', 'd:nan'))
    except ValueError:
        check('reject nonfinite lengths', True)
    else:
        check('reject nonfinite lengths', False)

    matrix = '3\na 0 1 2\nb 3 0 4\nc 5 6 0\n'
    reordered = '3\nc 0 5 6\na 2 0 1\nb 4 3 0\n'
    check('accept labelled matrix permutation', compare_matrices(matrix, reordered)['pass'])
    changed = matrix.replace('b 3 0 4', 'b 9 0 4')
    check('reject one directed cell change', not compare_matrices(matrix, changed)['pass'])
    first, second = args.output / 'matrix.phy', args.output / 'mutant.phy'
    first.write_text(matrix)
    second.write_text(changed)
    check('streaming comparator rejects directed mutation',
          not compare_matrix_files(first, second)['pass'])
    large = '(' + ','.join(f'n{i}:1' for i in range(1001)) + ');'
    check('large exact trees validate', compare_trees(large, large)['pass'])
    changed_large = compare_trees(large, large.replace('n999:1', 'n999:2'))
    check('large differences remain blocked', not changed_large['pass'] and changed_large['blocked'])
    invalid_large = large.replace('n999:1', 'n999:1:2')
    try:
        compare_trees(invalid_large, invalid_large)
    except ValueError:
        check('identical malformed large trees fail validation', True)
    else:
        check('identical malformed large trees fail validation', False)

    repo = Path(__file__).resolve().parents[1]
    for name, overrides, reason in [
        ('large_stdout', {}, 'normal_exit'),
        ('timeout', {'timeout': 0}, 'timeout'),
        ('rss_limit', {'max_rss_mb': 0}, 'sampled_rss_limit'),
    ]:
        options = dict(source=repo, source_sha='d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc',
                       revision='candidate', profile=repo / 'examples/simulated_data.profile',
                       output=args.output / name, python=Path(sys.executable),
                       method='MSTreeV2', matrix_type='symmetric',
                       handle_missing='pair_delete', heuristic='eBurst', n_proc=1,
                       total_loci=None, branch_recraft=False, wgmlst=False,
                       timeout=10, max_rss_mb=6000, track_temp_disk=True,
                       output_self_test_bytes=1024 * 1024)
        options.update(overrides)
        result = run_case(SimpleNamespace(**options))
        check(f'{name} termination reason', result['termination_reason'] == reason)
        if reason == 'normal_exit':
            check('large stdout completes without deadlock', result['exit_code'] == 0 and
                  (args.output / name / 'result.txt').stat().st_size == 1024 * 1024)
        else:
            check(f'{name} has failing process status', result['exit_code'] != 0)
    (args.output / 'summary.json').write_text(json.dumps(checks, indent=2) + '\n')
    print(json.dumps({'passed': len(checks), 'checks': checks}, indent=2))


if __name__ == '__main__':
    main()
