"""CPU routing must also work when MSTrees.py is copied out of the package."""
from pathlib import Path
import runpy

import pytest
from grapetree.module import MSTrees


@pytest.mark.parametrize('machine,suffix', [('arm64', '-arm64'), ('aarch64', '-arm64'), ('x86_64', '')])
def test_mac_backends_follow_python_architecture(monkeypatch, machine, suffix):
    monkeypatch.setattr('platform.machine', lambda: machine)
    params = runpy.run_path(MSTrees.__file__)['DEFAULT_PARAMS']
    for method, name in [('edmonds', 'edmonds-osx'), ('NJ', 'fastme-2.1.5-osx'), ('RapidNJ', 'rapidnj-osx')]:
        assert Path(params[method + '_Darwin']).name == name + suffix
    assert Path(params['NJ_Linux']).name == 'fastme-2.1.5-linux64'
    assert Path(params['NJ_Windows']).name == 'fastme.exe'
