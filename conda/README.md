# Conda/Bioconda recipe

The recipe is built and tested on Linux x86-64 in pull-request CI. Its local
`source:path: ..` builds the exact checked-out source, including the commit
under review, without depending on a branch that may later be renamed or
deleted. For a reproducible local check, use a clean checkout of the intended
commit; a local-path source also copies uncommitted files.

For the Bioconda submission after publishing the next version:

1. Build the source distribution from the release commit and upload the
   resulting `grapetree-<version>.tar.gz` as a release asset.
2. Replace `source:path` with that asset's immutable download URL and its
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
