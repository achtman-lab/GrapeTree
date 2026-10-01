"""Opt-in ARM/Intel parity check on a Mac with Rosetta and cached cgMLST samples.

Run with the checkout on PYTHONPATH. This comparison is not part of routine CI.
"""
import argparse
import contextlib
import io
import json
import os
import tempfile
from itertools import combinations
from pathlib import Path
import platform
import subprocess

import numpy as np
from ete3 import Tree
from grapetree.module.MSTrees import backend


def distances(newick):
    tree = Tree(newick, format=1)
    names = sorted(tree.get_leaf_names())
    return names, [tree.get_distance(a, b) for a, b in combinations(names, 2)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--samples', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    args.samples = args.samples.resolve()
    args.output = args.output.resolve()
    assert platform.system() == 'Darwin'
    root = Path(__file__).resolve().parents[1]
    binaries = root / 'binaries'
    configurations = {}
    for architecture, suffix in [('x86_64', ''), ('arm64', '-arm64')]:
        configurations[architecture] = {}
        for key, name in [('edmonds', 'edmonds-osx'), ('NJ', 'fastme-2.1.5-osx'), ('RapidNJ', 'rapidnj-osx')]:
            binary = binaries / (name + suffix)
            observed = subprocess.check_output(['lipo', '-archs', str(binary)], text=True).split()
            assert observed == [architecture], (binary, observed)
            configurations[architecture][key + '_Darwin'] = str(binary)
    profiles = [args.samples / f'{species}.n100.s7.profile'
                for species in ('Salmonella', 'Escherichia', 'Yersinia')]
    profiles += sorted((root / 'tests/fixtures/compatibility').glob('*.profile'))
    results = []
    for profile in profiles:
        for method in ('MSTreeV2', 'NJ', 'RapidNJ'):
            for missing in ('pair_delete', 'complete_delete', 'as_allele', 'absolute_distance'):
                outputs, errors = [], []
                for config in configurations.values():
                    original = Path.cwd()
                    with tempfile.TemporaryDirectory(prefix='gt-parity-', dir='/tmp') as directory:
                        try:
                            os.chdir(directory)
                            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                                outputs.append(backend(profile=str(profile), method=method, handle_missing=missing,
                                                       n_proc=1, **config))
                            errors.append(None)
                        except Exception as error:
                            outputs.append(None)
                            errors.append(type(error).__name__ + ': ' + str(error))
                        finally:
                            os.chdir(original)
                if any(errors):
                    # Existing FastME fails on these complete-deletion edge cases.
                    # Do not count matching crashes
                    # as successful tree calculations or hide new failure cases.
                    assert (profile.name, method, missing) in {
                        ('missing.profile', 'NJ', 'complete_delete'),
                        ('review_outbreak.profile', 'NJ', 'complete_delete'),
                    }, errors
                    assert errors[0] == errors[1] and errors[0].startswith('NewickError:'), errors
                    results.append(dict(profile=profile.name, method=method, missing=missing,
                                        passed=False, preexisting_failure=errors[0]))
                    args.output.write_text(json.dumps(results, indent=2) + '\n')
                    print(f'{profile.name} {method} {missing}: KNOWN INTEL/ARM FAILURE', flush=True)
                    continue
                names, intel = distances(outputs[0])
                arm_names, arm = distances(outputs[1])
                assert names == arm_names, (profile, method, missing)
                maximum_error = max((abs(a - b) for a, b in zip(intel, arm)), default=0)
                passed = bool(np.allclose(intel, arm, rtol=0, atol=1e-4))
                results.append(dict(profile=profile.name, method=method, missing=missing,
                                    taxa=len(names), max_distance_error=maximum_error,
                                    identical_newick=outputs[0] == outputs[1], passed=passed))
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps(results, indent=2) + '\n')
                print(f'{profile.name} {method} {missing}: {"PASS" if passed else "FAIL"}', flush=True)
                assert passed, results[-1]
    passed = sum(item['passed'] for item in results)
    print(f'{passed} comparisons passed, {len(results) - passed} pre-existing failures; evidence: {args.output}')


if __name__ == '__main__':
    main()
