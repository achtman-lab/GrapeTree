pyinstaller -n GrapeTree_win  --icon=GT_icon.ico ^
    --add-binary binaries/edmonds.exe;binaries/ ^
    --add-binary binaries/fastme.exe;binaries/ ^
    --add-data MSTree_holder.html;grapetree/MSTree_holder.html ^
    --add-data static/;grapetree/static/ ^
    grapetree.py 