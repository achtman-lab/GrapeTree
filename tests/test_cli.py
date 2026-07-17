import os
import shutil
import subprocess
import sys


def run_cli(*arguments):
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
