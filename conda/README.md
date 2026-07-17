# Conda/Bioconda recipe

The recipe is built and tested on Linux x86-64 in pull-request CI. During the
modernisation branch it installs from that branch so the recipe can be
validated before a release exists.

For the Bioconda submission after publishing v2.3.0:

1. Replace `git_url` and `git_rev` with the v2.3.0 GitHub release source archive.
2. Add the archive's SHA-256 from the release `SHA256SUMS` file.
3. Reset `build:number` to `0` for the new version.
4. Run `conda build conda --override-channels -c conda-forge -c bioconda`.
5. Copy the final recipe into a fork of `bioconda-recipes` and open its normal
   pull request; do not publish an ad-hoc package from this repository.

The recipe is deliberately platform-specific because GrapeTree currently
ships x86-64 FastME, RapidNJ, and Edmonds executables. Pure-Python `noarch`
metadata would produce installations whose advertised methods cannot run.
