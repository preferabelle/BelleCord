#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed yet. Install the LTS version from https://nodejs.org, then open this again."
  open "https://nodejs.org/en/download"
  read -r -p "Press Enter to close." _
  exit 1
fi
if [ ! -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ] || ! cmp -s package.json node_modules/.parts; then
  echo "Getting BelleCord ready. The first time this downloads about 100 MB, so give it a few minutes..."
  npm install --include=dev --include=prod --no-audit --no-fund || { echo "The download didn't finish. Check your internet and try again."; read -r -p "Press Enter to close." _; exit 1; }
  [ -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ] || node node_modules/electron/install.js
  [ -x "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ] || { echo "The download didn't finish. Check your internet and try again."; read -r -p "Press Enter to close." _; exit 1; }
  cp package.json node_modules/.parts
fi
nohup "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" . >/dev/null 2>&1 &
exit 0
