#!/usr/bin/env bash
set -euo pipefail

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
