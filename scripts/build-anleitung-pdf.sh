#!/usr/bin/env bash
# Erzeugt die PDF-Version der Bilderanleitung (/anleitung) mit Headless Chrome
# aus dem statischen Export. Ablauf: npm run build → dieses Skript → npm run build
# (damit die frische PDF in out/ landet). Die PDF liegt unter public/downloads/.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT="public/downloads/anleitung-online-zulassung.pdf"
PORT=8765

[ -d out ] || { echo "Bitte zuerst 'npm run build' ausführen."; exit 1; }
[ -x "$CHROME" ] || { echo "Google Chrome nicht gefunden: $CHROME"; exit 1; }

python3 -m http.server "$PORT" --directory out >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true' EXIT
sleep 1

"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUT" "http://localhost:$PORT/anleitung/" 2>/dev/null

echo "PDF erzeugt: $OUT ($(du -h "$OUT" | cut -f1))"
