@echo off
title BelleCord (new)
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist "node_modules\electron\dist\electron.exe" goto install
fc /b package.json "node_modules\.parts" >nul 2>nul
if errorlevel 1 goto install
goto run

:install
echo Getting BelleCord's parts ready. The first time this downloads about 100 MB, so give it a few minutes...
call npm install --include=dev --include=prod --no-audit --no-fund --ignore-scripts=false
if errorlevel 1 goto installfail
rem Electron fetches its program in a second step; if that step was skipped, do it now
if not exist "node_modules\electron\dist\electron.exe" if exist "node_modules\electron\install.js" (
  echo Downloading the app itself...
  call node "node_modules\electron\install.js"
)
if not exist "node_modules\electron\dist\electron.exe" goto installfail
copy /y package.json "node_modules\.parts" >nul

:run
start "" "node_modules\electron\dist\electron.exe" .
exit /b

:nonode
echo Node.js isn't installed yet. Opening the download page: install the LTS version, then double-click this file again.
start "" https://nodejs.org/en/download
pause
exit /b

:installfail
echo.
echo The download didn't finish, so BelleCord can't start yet.
echo Check your internet connection and double-click this file again.
echo If it keeps happening, send a screenshot of this window.
pause
exit /b
