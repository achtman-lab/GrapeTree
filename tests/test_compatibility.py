import json
from itertools import combinations
from pathlib import Path

import pytest
from ete3 import Tree

from grapetree.module.MSTrees import backend


FIXTURE_DIR = Path(__file__).parent / 'fixtures' / 'compatibility'
EXPECTED = json.loads((FIXTURE_DIR / 'expected.json').read_text())
BACKEND_OPTIONS = {
    'matrix_type': 'symmetric',
    'handle_missing': 'pair_delete',
    'n_proc': 1,
    'wgMLST': False,
    'checkEnv': False,
    'branch_recraft': False,
    'heuristic': 'eBurst',
}


def calculate(method, profile='basic.profile', **overrides):
    options = dict(BACKEND_OPTIONS)
    options.update(overrides)
    return backend(
        profile=str(FIXTURE_DIR / profile),
        method=method,
        **options,
    )


def pairwise_tree_distances(newick):
    tree = Tree(newick, format=1)
    return {
        f'{left}|{right}': tree.get_distance(left, right)
        for left, right in combinations(sorted(tree.get_leaf_names()), 2)
    }


def pairwise_phylip_distances(phylip):
    rows = [line.split() for line in phylip.splitlines()[1:]]
    names = [row[0] for row in rows]
    matrix = [[float(value) for value in row[1:]] for row in rows]
    return {
        '|'.join(sorted((names[left], names[right]))): matrix[left][right]
        for left in range(len(names))
        for right in range(left + 1, len(names))
    }


@pytest.mark.parametrize('method', ['MSTree', 'MSTreeV2', 'NJ', 'RapidNJ'])
def test_tree_backends_match_shared_pairwise_golden_fixture(method):
    observed = pairwise_tree_distances(calculate(method))

    assert observed == pytest.approx(
        EXPECTED['tree_pairwise_distances'][method],
        abs=1e-4,
    )


@pytest.mark.parametrize(
    'missing_mode',
    ['pair_delete', 'absolute_distance', 'as_allele', 'complete_delete'],
)
def test_missing_data_modes_match_shared_distance_golden_fixture(
    missing_mode,
):
    observed = pairwise_phylip_distances(
        calculate(
            'distance',
            profile='missing.profile',
            handle_missing=missing_mode,
        )
    )

    assert observed == pytest.approx(
        EXPECTED['missing_data_distances'][missing_mode],
        abs=1e-6,
    )


def test_issue_82_resequencing_fixture_locks_both_algorithm_behaviours():
    profile = Path(__file__).parent / 'fixtures' / 'issues' / '82' / (
        'ST5210_problem.chew'
    )
    mstree = backend(profile=str(profile), method='MSTree', n_proc=1)
    mstree_v2 = backend(profile=str(profile), method='MSTreeV2', n_proc=1)

    assert mstree == (
        '(iso6:9,(iso5-run1:1,iso5-run2:0):4,'
        '(iso1-run2:1,iso1-run1:0):3,iso2-run2:2,'
        '(iso4-run1:1,iso4-run2:0):2,iso2-run1:2,'
        'iso3-run1:1,iso3-run2:0);'
    )
    assert mstree_v2 == (
        '(iso6:15,iso1-run2:9,iso1-run1:8,iso4-run1:6,'
        'iso4-run2:6,iso2-run2:5,iso3-run1:5,iso2-run1:4,'
        'iso3-run2:4,iso5-run1:1,iso5-run2:0);'
    )
    assert Tree(mstree, format=1).get_distance(
        'iso1-run1', 'iso1-run2'
    ) == 1
    assert Tree(mstree_v2, format=1).get_distance(
        'iso1-run1', 'iso1-run2'
    ) == 17
