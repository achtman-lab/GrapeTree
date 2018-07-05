pyinstaller -n GrapeTree_win  --icon=GT_icon.ico ^
    --add-binary binaries/rapidnj.exe;binaries/ ^
    --add-binary binaries/edmonds.exe;binaries/ ^
    --add-binary binaries/fastme.exe;binaries/ ^
    --add-data MSTree_holder.html;. ^
    --add-data static/;static/ ^
    --hidden-import psutil ^
    grapetree.py 