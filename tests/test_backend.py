import gzip
import json

import pytest
from ete3 import Tree

from grapetree.module import MSTrees
from grapetree.module.MSTrees import backend, estimate_Consumption


PROFILE = """#Strain\tA\tB\tC
alpha\t1\t1\t1
beta\t1\t1\t2
gamma\t2\t2\t2
delta\t2\t3\t2
"""

PROFILE_WITH_METADATA = """#Strain\tST\tA\tB\t#note
alpha one\t10\t1\t1\tx
beta\t11\t1\t1\ty
gamma,three\t12\t2\t2\tz
"""

FASTA = """>alpha description
AACT
>beta
AATT
>gamma
TTTT
"""

BACKEND_DEFAULTS = {
    'matrix_type': 'symmetric',
    'handle_missing': 'pair_delete',
    'n_proc': 1,
    'wgMLST': False,
    'checkEnv': False,
    'branch_recraft': False,
    'heuristic': 'eBurst',
}


def run_backend(profile, method, **overrides):
    arguments = dict(BACKEND_DEFAULTS)
    arguments.update(overrides)
    return backend(profile=profile, method=method, **arguments)


def test_profile_metadata_duplicate_profiles_and_label_sanitising():
    matrix = run_backend(PROFILE_WITH_METADATA, 'distance')
    tree = run_backend(PROFILE_WITH_METADATA, 'MSTreeV2')

    assert matrix == """    3
alpha_one  0.000000 0.000000 1.000000
beta       0.000000 0.000000 1.000000
gamma_three 1.000000 1.000000 0.000000"""
    assert tree == '(gamma_three:2,(alpha_one:0,beta:0):0);'


def test_fasta_input_characterisation():
    matrix = run_backend(
        FASTA,
        'distance',
        handle_missing='absolute_distance',
    )

    assert matrix == """    3
alpha      0.000000 1.000000 3.000000
beta       1.000000 0.000000 2.000000
gamma      3.000000 2.000000 0.000000"""


def test_plain_and_gzipped_profile_files_match_inline_input(tmp_path):
    plain_path = tmp_path / 'profiles.tsv'
    gzip_path = tmp_path / 'profiles.tsv.gz'
    plain_path.write_text(PROFILE)
    with gzip.open(gzip_path, 'wt') as profile_file:
        profile_file.write(PROFILE)

    expected = run_backend(PROFILE, 'distance')

    assert run_backend(str(plain_path), 'distance') == expected
    assert run_backend(str(gzip_path), 'distance') == expected


def test_empty_profile_has_a_clear_error():
    with pytest.raises(
        ValueError,
        match='Profile input contains no sequence or profile records',
    ):
        run_backend('## comment only\n', 'distance')


def test_environment_estimate_contract(monkeypatch):
    monkeypatch.setattr(MSTrees.platform, 'system', lambda: 'Linux')
    monkeypatch.setattr(
        MSTrees.psutil,
        'virtual_memory',
        lambda: type('Memory', (), {'available': 10**12})(),
    )

    result = json.loads(
        run_backend(PROFILE, 'MSTreeV2', checkEnv=True)
    )
    expected_time, expected_memory = estimate_Consumption(
        'Linux', 'MSTree', 'asymmetric', 1, 3, 4
    )

    assert result == {
        'time': expected_time,
        'memory': expected_memory,
        'affordable': True,
    }


@pytest.mark.parametrize('method', ['NJ', 'RapidNJ'])
def test_bundled_neighbour_joining_backends_return_valid_trees(method):
    tree = Tree(run_backend(PROFILE, method), format=1)

    assert sorted(tree.get_leaf_names()) == ['alpha', 'beta', 'delta', 'gamma']
    assert all(node.dist >= 0 for node in tree.traverse())
