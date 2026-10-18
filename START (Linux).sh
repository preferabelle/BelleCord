#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js isn't installed yet. Install the LTS version from https://nodejs.org, then open this again."
  (xdg-open "https://nodejs.org/en/download" >/dev/null 2>&1 &)
  read -r -p "Press Enter to close." _
  exit 1
fi
if [ ! -x "node_modules/electron/dist/electron" ] || ! cmp -s package.json node_modules/.parts; then
  echo "Getting BelleCord ready. The first time this downloads about 100 MB, so give it a few minutes..."
  npm install --include=dev --include=prod --no-audit --no-fund || { echo "The download didn't finish. Check your internet and try again."; read -r -p "Press Enter to close." _; exit 1; }
  [ -x "node_modules/electron/dist/electron" ] || node node_modules/electron/install.js
  [ -x "node_modules/electron/dist/electron" ] || { echo "The download didn't finish. Check your internet and try again."; read -r -p "Press Enter to close." _; exit 1; }
  cp package.json node_modules/.parts
fi
SB="node_modules/electron/dist/chrome-sandbox"
# Linux needs Electron's sandbox helper to belong to the system once (asks for your password one time)
if [ -f "$SB" ] && [ "$(stat -c %u "$SB")" != "0" -o "$(stat -c %a "$SB")" != "4755" ]; then
  if ! unshare -Ur true 2>/dev/null; then
    echo "One-time setup: BelleCord needs your password to finish installing its security sandbox."
    sudo chown root:root "$SB" && sudo chmod 4755 "$SB"
  fi
fi
nohup "node_modules/electron/dist/electron" . >/dev/null 2>&1 &
exit 0
