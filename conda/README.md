# Conda/Bioconda recipe

The recipe builds from `master`, the repository's default branch. The recipe
version must match that source; its package tests reject a version mismatch.

Pull-request CI explicitly sets `GRAPETREE_CONDA_SOURCE_PATH` to the checkout
under review so changes are tested before merging. Builds on `master` use the
normal remote source. To test a local change, set that variable to the absolute
path of a clean checkout; this override also copies any uncommitted files.

For the Bioconda submission after publishing the next version:

1. Build the source distribution from the release commit and upload the
   resulting `grapetree-<version>.tar.gz` as a release asset.
2. Replace the recipe's `source` block with that asset's immutable download URL and its
   `sha256`, computed from the uploaded source distribution. The GitHub
   automatically generated source archive is a different file and its checksum
   is not supplied by the project's `SHA256SUMS` unless explicitly added.
3. Reset `build:number` to `0` for the new version.
4. Run `conda-build conda --override-channels -c conda-forge -c bioconda`.
5. Copy the final recipe into a fork of `bioconda-recipes` and open its normal
   pull request; do not publish an ad-hoc package from this repository.

The recipe is deliberately platform-specific because GrapeTree currently
ships x86-64 FastME, RapidNJ, and Edmonds executables. Pure-Python `noarch`
metadata would produce installations whose advertised methods cannot run.
