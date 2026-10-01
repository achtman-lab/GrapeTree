@echo off
python packaging\native_version.py windows-resource build\GrapeTree-version.txt
if errorlevel 1 exit /b %errorlevel%
python -m PyInstaller --noconfirm --clean --name GrapeTree --icon=GT_icon.ico ^
    --version-file build\GrapeTree-version.txt ^
    --add-binary binaries/rapidnj.exe;binaries/ ^
    --add-binary binaries/edmonds.exe;binaries/ ^
    --add-binary binaries/fastme.exe;binaries/ ^
    --add-data MSTree_holder.html;. ^
    --add-data static/;static/ ^
    --hidden-import psutil ^
    grapetree.py
if errorlevel 1 exit /b %errorlevel%
