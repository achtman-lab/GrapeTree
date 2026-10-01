"""Check a native Mac bundle before archiving it (no Rosetta fallback)."""
import argparse
from pathlib import Path
import platform
import plistlib
import subprocess
import tempfile

from ete3 import Tree
from check_distributions import PROFILE


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True, timeout=90).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('app', type=Path)
    parser.add_argument('--architecture', required=True, choices=['arm64', 'x86_64'])
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    assert platform.machine().lower() == args.architecture, 'Test on the native architecture'
    contents = args.app.resolve() / 'Contents'
    with (contents / 'Info.plist').open('rb') as stream:
        info = plistlib.load(stream)
    assert info['CFBundleShortVersionString'] == info['CFBundleVersion'] == args.version
    launcher = contents / 'MacOS/GrapeTree'
    suffix = '-arm64' if args.architecture == 'arm64' else ''
    # PyInstaller places dependencies here, with Resources symlinks for the UI.
    tools = [contents / 'Frameworks/binaries' / (name + suffix)
             for name in ('edmonds-osx', 'fastme-2.1.5-osx', 'rapidnj-osx')]
    for binary in [launcher, *tools]:
        assert run(['lipo', '-archs', str(binary)]).split() == [args.architecture], binary
    assert run([str(launcher), '--version']).strip() == 'GrapeTree ' + args.version
    with tempfile.TemporaryDirectory(prefix='grapetree-app-check-') as directory:
        profile = Path(directory) / 'profile.tsv'
        profile.write_text(PROFILE)
        matrix = Path(directory) / 'edmonds.dist'
        matrix.write_text('1\t6\t5\t9\n4\t1\t3\t7\n2\t8\t1\t4\n6\t2\t5\t1\n')
        edges = {tuple(map(int, row.split())) for row in run([str(tools[0]), str(matrix)]).splitlines()}
        assert edges == {(1, 2, 3), (3, 1, 2), (2, 0, 2)}
        for method in ('MSTreeV2', 'NJ', 'RapidNJ'):
            result = run([str(launcher), '--profile', str(profile), '--method', method, '--n_proc', '1'])
            tree = Tree(result.strip(), format=1)
            assert sorted(tree.get_leaf_names()) == ['alpha', 'beta', 'delta', 'gamma'], result
            assert all(node.dist >= 0 for node in tree.traverse()), result
            print(f'{args.architecture} app: {method} passed', flush=True)


if __name__ == '__main__':
    main()
