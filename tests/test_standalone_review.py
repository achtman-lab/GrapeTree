"""Contract tests for the original single-file MSTrees entry point."""

import ast
import os
from pathlib import Path
import shutil
import subprocess
import sys
import platform

from ete3 import Tree
import pytest

from grapetree.module import MSTrees
from grapetree import __version__
from grapetree.module.MSTrees import DEFAULT_PARAMS, backend


SCRIPT = Path(MSTrees.__file__).resolve()
PROFILE = '#Strain\tA\tB\tC\nalpha\t1\t1\t1\nbeta\t1\t1\t2\ngamma\t2\t2\t2\n'


def run_standalone(tmp_path, *args, input_text=None):
    isolated_script = tmp_path / 'MSTrees.py'
    shutil.copy2(SCRIPT, isolated_script)
    environment = dict(os.environ)
    environment['PYTHONPATH'] = ''
    return subprocess.run(
        [sys.executable, str(isolated_script), *args],
        cwd=tmp_path,
        env=environment,
        input=input_text,
        text=True,
        capture_output=True,
        check=False,
    )


def test_copied_script_runs_outside_package_checkout(tmp_path):
    result = run_standalone(tmp_path, '--help')
    assert result.returncode == 0, result.stderr
    assert '--profile' in result.stdout
    assert '--total-loci' in result.stdout


def test_copied_script_reports_package_version_without_profile(tmp_path):
    result = run_standalone(tmp_path, '--version')
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == 'MSTrees.py ' + __version__


def test_script_has_no_package_or_relative_imports():
    syntax = ast.parse(SCRIPT.read_text())
    for node in ast.walk(syntax):
        if isinstance(node, ast.ImportFrom):
            assert node.level == 0
            assert not (node.module or '').startswith('grapetree')
        elif isinstance(node, ast.Import):
            assert all(not item.name.startswith('grapetree') for item in node.names)


@pytest.mark.parametrize('method', ['MSTree', 'MSTreeV2', 'distance'])
def test_copied_script_calculates_with_one_and_two_processes(tmp_path, method):
    profile = tmp_path / 'profile.tsv'
    profile.write_text(PROFILE)
    for n_proc in ('1', '2'):
        result = run_standalone(
            tmp_path, '--profile', str(profile), '--method', method,
            '--n_proc', n_proc,
        )
        assert result.returncode == 0, result.stderr
        if method == 'distance':
            assert result.stdout.startswith('    3\n')
        else:
            assert sorted(Tree(result.stdout, format=1).get_leaf_names()) == [
                'alpha', 'beta', 'gamma'
            ]


def test_copied_script_reads_stdin_and_imported_backend_still_works(tmp_path):
    direct = run_standalone(
        tmp_path, '--profile', '-', '--method', 'MSTree', '--n_proc', '1',
        input_text=PROFILE,
    )
    assert direct.returncode == 0, direct.stderr
    imported = backend(profile=PROFILE, method='MSTree', n_proc=1)
    assert sorted(Tree(direct.stdout, format=1).get_leaf_names()) == sorted(
        Tree(imported, format=1).get_leaf_names()
    )


@pytest.mark.parametrize('method,binary_key', [
    ('NJ', 'NJ'),
    ('RapidNJ', 'RapidNJ'),
    ('ninja', 'ninja'),
])
def test_copied_script_finds_adjacent_native_tools(
    tmp_path, method, binary_key
):
    key = '{0}_{1}'.format(binary_key, platform.system())
    if key not in DEFAULT_PARAMS:
        pytest.skip('No native binary mapping for this test platform')
    if method == 'ninja' and not shutil.which('java'):
        pytest.skip('Java is not available')
    binary_path = Path(DEFAULT_PARAMS[key])
    binary_dir = tmp_path / 'binaries'
    binary_dir.mkdir()
    shutil.copy2(binary_path, binary_dir)
    profile = tmp_path / 'profile.tsv'
    profile.write_text(PROFILE + 'delta\t2\t3\t2\n')
    result = run_standalone(
        tmp_path, '--profile', str(profile), '--method', method, '--n_proc', '1'
    )
    assert result.returncode == 0, result.stderr
    assert sorted(Tree(result.stdout, format=1).get_leaf_names()) == [
        'alpha', 'beta', 'delta', 'gamma'
    ]
