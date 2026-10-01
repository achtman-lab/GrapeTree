#!/usr/bin/env bash
set -euo pipefail

# Build with a native Python for the intended Mac architecture.
mac_arch=$(python -c 'import platform; print(platform.machine().lower())')
case "$mac_arch" in
    arm64) binary_suffix=-arm64 ;;
    x86_64) binary_suffix= ;;
    *) echo "Unsupported Mac Python architecture: $mac_arch" >&2; exit 1 ;;
esac
python - <<'PYTHON'
import platform
import subprocess

if platform.system() != 'Darwin':
    raise SystemExit('Build the Mac application on macOS.')
architecture = platform.machine().lower()
suffix = '-arm64' if architecture == 'arm64' else ''
for name in ('edmonds-osx', 'fastme-2.1.5-osx', 'rapidnj-osx'):
    binary = name + suffix
    architectures = subprocess.check_output(['lipo', '-archs', 'binaries/' + binary], text=True).split()
    if architectures != [architecture]:
        raise SystemExit(f'{binary} must contain only {architecture}, found {architectures}')
PYTHON

python -m PyInstaller.utils.cliutils.makespec --name GrapeTree --windowed \
    --icon=GT_icon.icns --target-architecture "$mac_arch" \
    --add-binary "binaries/edmonds-osx${binary_suffix}:binaries/" \
    --add-binary "binaries/fastme-2.1.5-osx${binary_suffix}:binaries/" \
    --add-binary "binaries/rapidnj-osx${binary_suffix}:binaries/" \
    --add-data MSTree_holder.html:. \
    --add-data LICENSE:. \
    --add-data packaging/native/LICENSES:native-licenses/ \
    --add-data static/:static \
    --hidden-import psutil \
    grapetree.py

# PyInstaller's CLI cannot set bundle versions. Add them to its generated spec
# before the build so the final bundle is signed with the correct Info.plist.
python packaging/native_version.py mac-spec GrapeTree.spec
python -m PyInstaller --noconfirm --clean GrapeTree.spec
