# PR #118 backend and single-script review

Reference: `f993e82f9efa1ebdde938eff5c81756076bf1314` (`master`). Candidate initially inspected: `d1a11219b4ef3ba4c660eabcb6253ab7fcc67fcc`; this report covers local review fixes on top of that commit. Platform: macOS arm64, Python 3.11.14, OpenJDK 25.0.1.

## Confirmed defects and repairs

1. Running `grapetree/module/MSTrees.py --help` at the PR head raised `ImportError: attempted relative import with no known parent package`. The core parser and normalisation now live in `MSTrees.py`; the installed application's export parser extends the same parser. All original core option descriptions were preserved. The file has no imports from another GrapeTree Python module. The script resolves native tools placed beside a copied script as well as packaged or checkout binaries.
2. A valid Newick leaf named `_hypo_0` collided with the generated root ID during network/cluster export. Internal IDs now skip every actual leaf name. Duplicate leaf names remain errors.
3. CSV metadata with a quoted embedded newline silently lost the newline. Parsing now reads the original text as a stream. Leading blank lines remain accepted, and excess fields yield a deliberate error.
4. Ninja failed on modern Java because `-d64` is no longer accepted; its empty stdout was then parsed as a Newick tree. The obsolete option is removed, Java exit status is checked, and errors include Ninja's stderr. A 1,200 MB retry remains for memory-related startup failures.

The PR moves the historic `module/MSTrees.py` path to `grapetree/module/MSTrees.py`. Direct execution of the current script and the installed `grapetree` command now work, but the old path and `import module.MSTrees` no longer resolve. That is a source-layout compatibility change for callers using the former module path; this review does not add a duplicate implementation or claim those imports are preserved.

## Verification performed

- `python -m pytest -q tests/test_review_acceptance.py tests/test_standalone_review.py tests/test_cli.py tests/test_mst_algorithms.py tests/test_compatibility.py`: **57 passed** on the current working tree.
- The standalone test copies only `MSTrees.py` to a temporary directory outside the checkout. An AST check rejects relative or GrapeTree package imports in that script, so an installed package cannot mask a new sibling import. Help, stdin, imported backend, MSTree, MSTreeV2 and distance methods pass with one and two processes. With the required native executable/JAR placed in an adjacent `binaries` directory, NJ, RapidNJ and Ninja each return a parseable four-leaf tree. Existing tests exercise Edmonds fallback and malformed output handling.
- `python -m build --wheel --no-isolation --outdir /private/tmp/grapetree-pr118-review/results/backend/dist` built `grapetree-2.3.0-py3-none-any.whl`. It was installed into a separate virtual environment. From outside the checkout, the installed CLI printed version `2.3.0`, calculated an MSTreeV2 on `examples/simulated_data.profile`, Flask `/` returned HTTP 200, and the packaged Edmonds binary path existed. The smoke test borrowed third-party dependencies from the development environment through `PYTHONPATH`; it did load GrapeTree itself from the separate wheel installation.
- The lead independently built wheel and source archives with isolated PEP 517, installed each into its own fresh environment without borrowed paths, copied tests outside the checkout, and recorded **101 passing tests for each installation** in `results/lead/clean-wheel-tests.txt` and `results/lead/final-source-tests.txt`. Dependency checks passed in both environments. My initial isolated build attempt could not fetch hatchling under default sandbox network restrictions; the lead's escalated build resolved that limitation.
- `file binaries/{edmonds-osx,fastme-2.1.5-osx,rapidnj-osx}` reports x86_64 Mach-O. The release workflow targets `macos-15-intel`, so the macOS archive is correctly labelled Intel. Native macOS arm64 support is not established by this review.

## Remaining limits

Only macOS was exercised locally. Linux, Windows, Conda builds and PyInstaller applications remain for CI or a matching host. The direct script requires native tools for NJ/RapidNJ and Java plus Ninja.jar for Ninja, as before. Scientific parity and performance are covered by separate review work packages.
