# Publishing GrapeTree to PyPI

GrapeTree uses `pyproject.toml`, Hatchling, and standard console entry points.
A pip installation includes the local web application (`grapetree`) and the
single-file tree builder (`MSTrees.py`, or `MSTrees` on Windows). Python 3.10–3.14 are covered by CI.
The bundled native backends have platform-specific requirements; a successful
pip installation alone does not establish support for every CPU architecture.

## Check the release files locally

Use a virtual environment, then build and inspect both distributions:

```sh
python -m pip install build twine
python -m build
python -m twine check dist/*
python packaging/check_distributions.py dist/*.tar.gz dist/*.whl
```

Use an empty `dist` directory for a new version. The checker installs each
archive into its own temporary virtual environment, resolves dependencies,
and runs `pip check`. Outside the checkout, it checks both installed commands,
copies `MSTrees.py` and runs it independently, starts the installed web app,
fetches the page's local assets, and submits a small profile for calculation.
MSTreeV2, NJ and RapidNJ must agree between the installed commands and HTTP.
Edmonds is also exercised directly so its Python fallback cannot hide an
executable that fails to run. The copied script is checked with MSTreeV2. Temporary
environments and the server are removed afterwards.

This small check runs on pull requests and before PyPI publication. Release
publication also waits for the exact wheel to pass clean installation on Intel
macOS and Windows x64, in addition to the Linux AMD64 build job. Use
`--require-architecture x86_64` to fail if the interpreter has the wrong CPU
architecture. AMD64, x64 and x86-64 describe the same CPU architecture; the
executables are still specific to each operating system.

The Mac application builder requires x86-64 Python and verifies that all three
bundled tools contain x86-64 code. Apple silicon users currently need Rosetta 2;
native ARM64 binaries need a separate build and scientific parity review. The larger
scientific and browser suites are described in [TESTING.md](../TESTING.md).
The packaging check checks HTTP behaviour and asset availability; it does not
replace the browser interaction suite.

## Configure PyPI once

An owner of the existing `grapetree` project on PyPI must register this GitHub
Trusted Publisher:

- Owner: `achtman-lab`
- Repository: `GrapeTree`
- Workflow filename: `release.yml`
- Environment: `pypi`

Create the matching GitHub `pypi` environment, restrict its release access and
configure a required reviewer where supported. Trusted Publishing obtains a
short-lived token through GitHub's identity service; no long-lived PyPI token
needs to be stored in this repository. This setup must be verified in the
PyPI owner's account before publishing the first release with this workflow.

## Publish

After the release changes are merged and CI passes, create the version tag
from that tested commit and publish its GitHub release. The tag must match
`v` followed by the package version (for example, `v3.0.0`). The release
workflow builds and tests a wheel and source archive, then passes those same
files to the PyPI publisher. It also builds the native and browser archives.
Publishing the GitHub release triggers PyPI publication; keeping a release as
a draft does not.

After publication, check the actual PyPI installation in a fresh environment:

```sh
python -m venv /tmp/grapetree-pypi-check
/tmp/grapetree-pypi-check/bin/python -m pip install --index-url https://pypi.org/simple 'grapetree==3.0.0'
/tmp/grapetree-pypi-check/bin/python -m pip check
/tmp/grapetree-pypi-check/bin/python -I /path/to/GrapeTree/packaging/check_distributions.py --installed --expected-version 3.0.0
```

Use the environment's actual path in the final command (on Windows, its
Python executable is under `Scripts`). The checker creates its own temporary
working directory. For an optional TestPyPI rehearsal, configure a separate
TestPyPI publisher: TestPyPI has separate accounts and is not a complete
mirror of runtime dependencies. Follow its installation guidance rather
than using an additional untrusted dependency index.

## References

- [PyPA: writing pyproject.toml](https://packaging.python.org/en/latest/guides/writing-pyproject-toml/)
- [PyPA: publishing with GitHub Actions](https://packaging.python.org/en/latest/guides/publishing-package-distribution-releases-using-github-actions-ci-cd-workflows/)
- [PyPI: adding a Trusted Publisher](https://docs.pypi.org/trusted-publishers/adding-a-publisher/)
- [PyPA: using TestPyPI](https://packaging.python.org/en/latest/guides/using-testpypi/)
