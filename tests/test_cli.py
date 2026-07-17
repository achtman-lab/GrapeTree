import os
import shutil
import subprocess
import sys

import pytest
from ete3 import Tree


PROFILE = """#Strain\tA\tB\tC
alpha\t1\t1\t1
beta\t1\t1\t2
gamma\t2\t2\t2
delta\t2\t3\t2
"""


def run_cli(*arguments, input_text=None):
    environment = dict(os.environ)
    environment['PYTHONPATH'] = ''
    executable = shutil.which(
        'grapetree',
        path=os.path.dirname(sys.executable),
    )
    assert executable is not None
    return subprocess.run(
        [executable, *arguments],
        check=False,
        capture_output=True,
        cwd=os.path.dirname(sys.executable),
        env=environment,
        input=input_text,
        text=True,
    )


def test_cli_help_is_available_without_a_profile():
    completed = run_cli('--help')

    assert completed.returncode == 0
    assert 'GrapeTree generates a NEWICK tree' in completed.stdout


def test_cli_reports_the_package_version():
    completed = run_cli('--version')

    assert completed.returncode == 0
    assert completed.stdout.strip() == 'grapetree 2.3.0'


@pytest.mark.parametrize('method', ['MSTree', 'MSTreeV2', 'NJ', 'RapidNJ'])
def test_cli_tree_methods_accept_a_profile_file(tmp_path, method):
    profile_path = tmp_path / 'profile.tsv'
    profile_path.write_text(PROFILE)

    completed = run_cli(
        '--profile', str(profile_path),
        '--method', method,
        '--n_proc', '1',
    )

    assert completed.returncode == 0, completed.stderr
    tree = Tree(completed.stdout, format=1)
    assert sorted(tree.get_leaf_names()) == [
        'alpha', 'beta', 'delta', 'gamma'
    ]


def test_cli_distance_method_writes_phylip_to_standard_output(tmp_path):
    profile_path = tmp_path / 'profile.tsv'
    profile_path.write_text(PROFILE)

    completed = run_cli(
        '-p', str(profile_path),
        '-m', 'distance',
        '-n', '1',
    )

    assert completed.returncode == 0, completed.stderr
    assert completed.stdout.startswith('    4\nalpha')
    assert 'gamma' in completed.stdout


def test_cli_reads_a_profile_from_standard_input():
    completed = run_cli(
        '--profile', '-',
        '--method', 'MSTreeV2',
        '--n_proc', '1',
        input_text=PROFILE,
    )

    assert completed.returncode == 0, completed.stderr
    assert sorted(Tree(completed.stdout, format=1).get_leaf_names()) == [
        'alpha', 'beta', 'delta', 'gamma'
    ]


@pytest.mark.parametrize(
    ('arguments', 'message'),
    [
        (('--profile', 'missing.tsv'), 'profile file does not exist'),
        (('--profile', '-', '--method', 'unknown'), 'invalid choice'),
    ],
)
def test_cli_reports_invalid_input_without_a_traceback(
    arguments, message
):
    completed = run_cli(*arguments, input_text='')

    assert completed.returncode == 2
    assert message in completed.stderr
    assert 'Traceback' not in completed.stderr
