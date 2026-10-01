"""Fast checks for desktop bundle metadata generated from the package version."""

import ast
from pathlib import Path
import runpy
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'packaging' / 'native_version.py'
VERSION = runpy.run_path(str(ROOT / 'grapetree' / '_version.py'))['__version__']


def test_generated_macos_spec_has_both_bundle_versions(tmp_path):
    spec = tmp_path / 'GrapeTree.spec'
    spec.write_text('app = BUNDLE(\n    coll,\n    name="GrapeTree.app",\n)\n')
    subprocess.run([sys.executable, str(HELPER), 'mac-spec', str(spec)], check=True)
    tree = ast.parse(spec.read_text())
    call = tree.body[0].value
    settings = {keyword.arg: ast.literal_eval(keyword.value)
                for keyword in call.keywords if keyword.arg in {'version', 'info_plist'}}
    assert settings == {'version': VERSION, 'info_plist': {'CFBundleVersion': VERSION}}


def test_windows_resource_matches_package_version(tmp_path):
    resource = tmp_path / 'GrapeTree-version.txt'
    subprocess.run([sys.executable, str(HELPER), 'windows-resource', str(resource)], check=True)
    text = resource.read_text()
    ast.parse(text)
    parts = tuple(int(part) for part in VERSION.split('.')) + (0,)
    assert f'filevers={parts!r}, prodvers={parts!r}' in text
    assert f"StringStruct('FileVersion', {VERSION!r})" in text
    assert f"StringStruct('ProductVersion', {VERSION!r})" in text
