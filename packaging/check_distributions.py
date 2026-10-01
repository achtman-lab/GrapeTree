"""Install each distribution in a fresh environment and exercise its public interfaces.

Run from the checkout: python packaging/check_distributions.py dist/*
Uses tiny synthetic profiles; downloads dependencies from the configured pip index.
"""
import argparse
import importlib.metadata
import os
import platform
from pathlib import Path
import runpy
import shutil
import socket
import subprocess
import sys
import sysconfig
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import venv
from html.parser import HTMLParser

PROFILE = "#Strain\tA\tB\tC\nalpha\t1\t1\t1\nbeta\t1\t1\t2\ngamma\t2\t2\t2\ndelta\t2\t3\t2\n"


def run(command, **kwargs):
    return subprocess.run(command, check=True, timeout=180, **kwargs)


class Assets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        for key, value in attrs:
            if key in ('src', 'href') and value and value.startswith(('static/', '/static/')):
                self.urls.add('/' + value.lstrip('/'))


def smoke(expected_version, required_architecture=None):
    machine = platform.machine().lower()
    machine = {'amd64': 'x86_64', 'aarch64': 'arm64'}.get(machine, machine)
    print(f'Platform: {platform.system()} {machine}', flush=True)
    if required_architecture and machine != required_architecture:
        raise RuntimeError(f'Expected {required_architecture} Python, got {machine}')

    # Imported only inside the new environment, with isolated Python (-I).
    import grapetree
    from grapetree.module import MSTrees
    from ete3 import Tree

    installed = Path(grapetree.__file__).resolve()
    assert installed.is_relative_to(Path(sys.prefix).resolve()), installed
    assert importlib.metadata.version('grapetree') == grapetree.__version__ == expected_version
    assert MSTrees.__version__ == expected_version
    if platform.system() == 'Darwin':
        for method in ('edmonds', 'NJ', 'RapidNJ'):
            binary = MSTrees.DEFAULT_PARAMS[method + '_Darwin']
            architectures = run(['lipo', '-archs', binary], capture_output=True, text=True).stdout.split()
            assert architectures == [machine], (binary, architectures, machine)
        print('All three bundled Mac backends match Python architecture', flush=True)
    profile = Path('profile.tsv').resolve()
    profile.write_text(PROFILE)

    def check_tree(text):
        tree = Tree(text.strip(), format=1)
        assert sorted(tree.get_leaf_names()) == ['alpha', 'beta', 'delta', 'gamma'], text
        assert all(node.dist >= 0 for node in tree.traverse()), text
        return tree.write(format=1)

    # Exercise Edmonds directly: an architecture mismatch must not be hidden by
    # MSTreeV2's intentional NetworkX fallback.
    matrix = Path('edmonds.dist').resolve()
    matrix.write_text('1\t6\t5\t9\n4\t1\t3\t7\n2\t8\t1\t4\n6\t2\t5\t1\n')
    edmonds = MSTrees.DEFAULT_PARAMS['edmonds_' + platform.system()]
    result = run([edmonds, str(matrix)], capture_output=True, text=True)
    edges = {tuple(map(int, row.split())) for row in result.stdout.splitlines()}
    assert edges == {(1, 2, 3), (3, 1, 2), (2, 0, 2)}, result.stdout
    print('Bundled Edmonds executable: calculation passed', flush=True)

    methods = ('MSTreeV2', 'NJ', 'RapidNJ')
    trees = {}
    for name in ('grapetree', 'MSTrees' if os.name == 'nt' else 'MSTrees.py'):
        executable = shutil.which(name, path=sysconfig.get_path('scripts'))
        assert executable, f'Missing installed command: {name}'
        version = run([executable, '--version'], capture_output=True, text=True).stdout
        assert version.strip().split()[-1] == expected_version, version
        for method in methods:
            arguments = ['--profile', str(profile), '--method', method, '--n_proc', '1']
            result = run([executable, *arguments], capture_output=True, text=True)
            observed = check_tree(result.stdout)
            if method in trees:
                assert observed == trees[method], f'{name}: {method} disagrees'
            trees[method] = observed
            print(f'{name}: {method} calculation passed', flush=True)

    standalone = Path('standalone/MSTrees.py')
    standalone.parent.mkdir()
    shutil.copyfile(MSTrees.__file__, standalone)
    arguments = ['--profile', str(profile), '--method', 'MSTreeV2', '--n_proc', '1']
    result = run([sys.executable, '-I', str(standalone), *arguments], capture_output=True, text=True)
    assert check_tree(result.stdout) == trees['MSTreeV2'], 'Copied script disagrees'
    print('Copied single-file MSTrees.py: calculation passed', flush=True)

    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    # Exercise the installed CLI's no-argument path on an unused port without
    # opening a desktop browser on CI. Application code is not replaced.
    bootstrap = f'''import sys, webbrowser, faulthandler
faulthandler.dump_traceback_later(20)
from importlib.metadata import distribution
from grapetree.module import app
app.config['PORT'] = {port}
webbrowser.open = lambda *args, **kwargs: False
sys.argv = ['grapetree']
entry = next(e for e in distribution('grapetree').entry_points if e.group == 'console_scripts' and e.name == 'grapetree')
entry.load()()
'''
    base = f'http://127.0.0.1:{port}'
    # Local application checks must not inherit a runner's HTTP proxy.
    http = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    print(f'Starting installed web application at {base}', flush=True)
    with open('server.log', 'w+') as log:
        server = subprocess.Popen([sys.executable, '-I', '-u', '-c', bootstrap], stdout=log, stderr=log)
        try:
            # macOS 15+ hosted runners can spend over 30 seconds in the stdlib
            # HTTPServer's loopback reverse lookup (actions/setup-python#1223).
            # Keep exercising the real server without replacing DNS behaviour.
            startup_timeout = 90 if platform.system() == 'Darwin' else 30
            deadline = time.monotonic() + startup_timeout
            while True:
                try:
                    with http.open(base, timeout=2) as response:
                        html = response.read().decode()
                    break
                except (urllib.error.URLError, TimeoutError):
                    if server.poll() is not None or time.monotonic() > deadline:
                        raise RuntimeError('Installed web application failed to start')
                    time.sleep(0.2)
            assert 'GrapeTree' in html
            assets = Assets()
            assets.feed(html)
            assert any('.js' in url for url in assets.urls), 'No packaged JavaScript referenced'
            assert any('.css' in url for url in assets.urls), 'No packaged CSS referenced'
            for url in sorted(assets.urls):
                with http.open(base + url, timeout=5) as response:
                    assert response.read(), f'Empty asset: {url}'
            for method in methods:
                data = urllib.parse.urlencode({'profile': PROFILE, 'method': method, 'n_proc': 1, 'checkEnv': 0}).encode()
                with http.open(base + '/maketree', data=data, timeout=30) as response:
                    assert check_tree(response.read().decode()) == trees[method]
                print(f'Installed web application: {method} calculation passed', flush=True)
            print(f'Installed web application: HTTP and {len(assets.urls)} assets passed', flush=True)
        except BaseException as error:
            if isinstance(error, urllib.error.HTTPError):
                print(error.read().decode(errors='replace'), file=sys.stderr)
            log.flush()
            log.seek(0)
            print(log.read(), file=sys.stderr)
            raise
        finally:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archives', nargs='*', type=Path)
    parser.add_argument('--expected-version')
    parser.add_argument('--require-architecture', choices=('x86_64', 'arm64'))
    parser.add_argument('--installed', action='store_true', help='Check the active environment only')
    args = parser.parse_args()
    if args.installed:
        if not args.expected_version:
            parser.error('--installed requires --expected-version')
        original = Path.cwd()
        with tempfile.TemporaryDirectory(prefix='grapetree-smoke-') as directory:
            try:
                os.chdir(directory)
                smoke(args.expected_version, args.require_architecture)
            finally:
                os.chdir(original)
        return
    if not args.archives:
        parser.error('Supply built wheel and/or source archives')
    version = args.expected_version or runpy.run_path(
        str(Path(__file__).resolve().parents[1] / 'grapetree/_version.py')
    )['__version__']
    for archive in args.archives:
        archive = archive.resolve(strict=True)
        if not archive.name.endswith(('.whl', '.tar.gz')):
            parser.error(f'Not a distribution archive: {archive}')
        started = time.monotonic()
        with tempfile.TemporaryDirectory(prefix='grapetree-install-') as directory:
            root = Path(directory)
            environment = root / 'venv'
            venv.EnvBuilder(with_pip=True, symlinks=os.name != 'nt').create(environment)
            python = environment / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
            work = root / 'work'
            work.mkdir()
            check = work / 'check_distributions.py'
            shutil.copyfile(__file__, check)
            clean_env = dict(os.environ, PYTHONPATH='', PYTHONNOUSERSITE='1')
            print(f'Checking {archive.name} in a fresh environment', flush=True)
            run([str(python), '-I', '-m', 'pip', 'install', str(archive)], cwd=work, env=clean_env)
            run([str(python), '-I', '-m', 'pip', 'check'], cwd=work, env=clean_env)
            command = [str(python), '-I', str(check), '--installed', '--expected-version', version]
            if args.require_architecture:
                command += ['--require-architecture', args.require_architecture]
            run(command, cwd=work, env=clean_env)
        print(f'PASS {archive.name} ({time.monotonic() - started:.1f}s)', flush=True)


if __name__ == '__main__':
    main()
