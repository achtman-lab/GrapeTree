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
