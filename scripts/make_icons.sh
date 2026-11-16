#!/bin/sh
# Render icons/icon.svg to the PNG sizes the web app manifest and iOS need, with headless Chrome (no other tools needed).
cd "$(dirname "$0")/.." || exit 1
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="${TMPDIR:-/tmp}/pinpoint-icons"; mkdir -p "$TMP"
for s in 512 192 180; do
  printf '<!doctype html><html><body style="margin:0;background:#0d2a3a"><img src="%s" width="%s" height="%s" style="display:block"></body></html>' "file://$PWD/icons/icon.svg" "$s" "$s" > "$TMP/i$s.html"
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=$s,$s --screenshot="$TMP/i$s.png" "file://$TMP/i$s.html" >/dev/null 2>&1
done
cp "$TMP/i512.png" icons/icon-512.png; cp "$TMP/i192.png" icons/icon-192.png; cp "$TMP/i180.png" icons/apple-touch-icon.png
sips -g pixelWidth -g pixelHeight icons/*.png | grep -v '^/' | paste - - 
