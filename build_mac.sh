pyinstaller -n GrapeTree_mac --windowed --icon=GT_icon.icns \
    --add-binary binaries/edmonds-osx:binaries/ \
    --add-binary binaries/fastme-2.1.5-osx:binaries/ \
    --add-binary binaries/rapidnj-osx:binaries/ \
    --add-data MSTree_holder.html:. \
    --add-data static/:static \
    --hidden-import psutil \
    -p .venv/lib/ \
    grapetree.py
