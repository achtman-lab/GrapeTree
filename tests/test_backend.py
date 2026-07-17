import gzip
import json
from concurrent.futures import ThreadPoolExecutor

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

PROFILE_WITH_MISSING_DATA = """#Strain\tA\tB\tC
alpha\t1\t0\t1
beta\t1\t2\t2
gamma\t2\t2\t2
delta\t2\t3\t0
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


def test_snp_only_profile_can_preserve_original_alignment_length():
    variable_rows = {
        'alpha': ['1', '1', '1'],
        'beta': ['1', '1', '2'],
        'gamma': ['2', '2', '2'],
        'delta': ['2', '3', '2'],
    }
    invariant_count = 20
    full_profile = '#Strain\t' + '\t'.join(
        ['V1', 'V2', 'V3']
        + ['I{0}'.format(index) for index in range(invariant_count)]
    ) + '\n'
    snp_profile = '#Strain\tV1\tV2\tV3\n'
    for name, alleles in variable_rows.items():
        full_profile += '\t'.join(
            [name] + alleles + ['1'] * invariant_count
        ) + '\n'
        snp_profile += '\t'.join([name] + alleles) + '\n'

    expected = run_backend(full_profile, 'MSTreeV2')
    observed = run_backend(
        snp_profile,
        'MSTreeV2',
        total_loci=3 + invariant_count,
    )

    assert observed == expected


def test_total_loci_cannot_be_shorter_than_the_supplied_alignment():
    with pytest.raises(ValueError, match='total_loci cannot be smaller'):
        run_backend(PROFILE, 'MSTreeV2', total_loci=2)


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


@pytest.mark.parametrize(
    ('profile', 'duplicate_name'),
    [
        (
            """#Strain\tA\tB
alpha\t1\t1
alpha\t1\t2
""",
            'alpha',
        ),
        (
            """#Strain\tA\tB
alpha one\t1\t1
alpha_one\t1\t2
""",
            'alpha_one',
        ),
    ],
)
def test_duplicate_or_colliding_taxon_names_are_rejected(
    profile, duplicate_name
):
    with pytest.raises(
        ValueError,
        match=(
            '^Duplicate taxon names after sanitising: '
            f'{duplicate_name}$'
        ),
    ):
        run_backend(profile, 'distance')


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


def test_distance_environment_estimate_contract():
    result = json.loads(run_backend(PROFILE, 'distance', checkEnv=True))

    assert result['time'] >= 5
    assert result['memory'] >= 50 * 1024 * 1024
    assert isinstance(result['affordable'], bool)


@pytest.mark.parametrize('false_value', ['', '0', 'false', 'off'])
def test_false_like_http_boolean_values_do_not_trigger_an_estimate(false_value):
    result = backend(
        profile=PROFILE,
        method='MSTreeV2',
        checkEnv=false_value,
        n_proc=1,
    )

    assert result.endswith(';')


def test_invalid_http_boolean_value_is_rejected_clearly():
    with pytest.raises(ValueError, match='Invalid boolean for checkEnv'):
        backend(
            profile=PROFILE,
            method='MSTreeV2',
            checkEnv='perhaps',
            n_proc=1,
        )


def test_backend_calls_do_not_inherit_previous_options():
    run_backend(
        PROFILE_WITH_MISSING_DATA,
        'distance',
        matrix_type='asymmetric',
        handle_missing='absolute_distance',
    )

    observed = backend(
        profile=PROFILE_WITH_MISSING_DATA,
        method='distance',
        n_proc=1,
    )
    expected = run_backend(PROFILE_WITH_MISSING_DATA, 'distance')

    assert observed == expected


def test_concurrent_backend_calls_keep_independent_options():
    expected_symmetric = run_backend(PROFILE_WITH_MISSING_DATA, 'distance')
    expected_asymmetric = run_backend(
        PROFILE_WITH_MISSING_DATA,
        'distance',
        matrix_type='asymmetric',
        handle_missing='absolute_distance',
    )

    with ThreadPoolExecutor(max_workers=2) as executor:
        symmetric = executor.submit(
            backend,
            profile=PROFILE_WITH_MISSING_DATA,
            method='distance',
            n_proc=1,
        )
        asymmetric = executor.submit(
            run_backend,
            PROFILE_WITH_MISSING_DATA,
            'distance',
            matrix_type='asymmetric',
            handle_missing='absolute_distance',
        )

    assert symmetric.result() == expected_symmetric
    assert asymmetric.result() == expected_asymmetric


def test_wgmlst_selects_its_asymmetric_distance_implementation():
    standard = run_backend(
        PROFILE_WITH_MISSING_DATA,
        'distance',
        matrix_type='asymmetric',
    )
    wgmlst = run_backend(
        PROFILE_WITH_MISSING_DATA,
        'distance',
        matrix_type='asymmetric',
        wgMLST=True,
    )

    assert wgmlst != standard
    assert 'delta      0.000000 0.750000 0.833333 0.500000' in wgmlst


@pytest.mark.parametrize(
    ('override', 'message'),
    [
        ({'method': "__import__('os').system('id')"}, 'Unknown method'),
        ({'method': 'MSTree', 'matrix_type': '__class__'}, 'Unknown matrix type'),
        ({'method': 'MSTree', 'heuristic': '__class__'}, 'Unknown heuristic'),
    ],
)
def test_algorithm_dispatch_rejects_unknown_names(override, message):
    arguments = dict(BACKEND_DEFAULTS)
    arguments.update(override)

    with pytest.raises(ValueError, match=message):
        backend(profile=PROFILE, **arguments)


@pytest.mark.parametrize('method', ['NJ', 'RapidNJ'])
def test_bundled_neighbour_joining_backends_return_valid_trees(method):
    tree = Tree(run_backend(PROFILE, method), format=1)

    assert sorted(tree.get_leaf_names()) == ['alpha', 'beta', 'delta', 'gamma']
    assert all(node.dist >= 0 for node in tree.traverse())
