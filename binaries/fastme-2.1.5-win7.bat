@echo off
cls
color 1B
mode con:cols=98
mode con:lines=50
if not exist fastme.exe goto error
if exist fastme.exe goto launch
echo on


:launch
fastme
goto end

:error
echo Error - can't find `fastme.exe'
pause
goto end


:end
echo Execution finished
pause
