#!/usr/bin/env bash
set -euo pipefail

# This archive contains Intel executables. Match the Python launcher to them
# rather than accidentally publishing a mixed ARM/Intel app from an M-series Mac.
python - <<'PYTHON'
import platform
import subprocess

if platform.system() != 'Darwin' or platform.machine().lower() != 'x86_64':
    raise SystemExit('The Intel Mac app requires x86_64 macOS Python. On Apple silicon, use an Intel Python under Rosetta 2; a native ARM app is not yet supported.')
for binary in ('edmonds-osx', 'fastme-2.1.5-osx', 'rapidnj-osx'):
    architectures = subprocess.check_output(['lipo', '-archs', 'binaries/' + binary], text=True).split()
    if 'x86_64' not in architectures:
        raise SystemExit(f'{binary} does not contain an Intel x86_64 executable')
PYTHON

python -m PyInstaller.utils.cliutils.makespec --name GrapeTree --windowed \
    --icon=GT_icon.icns \
    --add-binary binaries/edmonds-osx:binaries/ \
    --add-binary binaries/fastme-2.1.5-osx:binaries/ \
    --add-binary binaries/rapidnj-osx:binaries/ \
    --add-data MSTree_holder.html:. \
    --add-data static/:static \
    --hidden-import psutil \
    grapetree.py

# PyInstaller's CLI cannot set bundle versions. Add them to its generated spec
# before the build so the final bundle is signed with the correct Info.plist.
python packaging/native_version.py mac-spec GrapeTree.spec
python -m PyInstaller --noconfirm --clean GrapeTree.spec
