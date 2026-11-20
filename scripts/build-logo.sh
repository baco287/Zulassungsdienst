#!/usr/bin/env bash
# Erzeugt alle Logo-Dateien von KFZ-Zulassungsprofis aus einer Quelle.
#
#   npm run build && bash scripts/build-logo.sh [Zielordner für die Markendateien]
#
# Die Formen entsprechen components/Logo.tsx. Die Wortmarke wird mit Manrope
# gesetzt – der Schriftdatei, die der Build ohnehin lokal ablegt (out/_next/static/media).
# Gerendert wird mit Headless Chrome; es wird nichts aus dem Netz geladen.
#
# Ergebnis im Projekt:
#   app/icon.svg            Favicon (Vektor)
#   app/apple-icon.png      App-Icon 180 × 180
#   public/logo.svg         Bildmarke als Vektor
#   public/logo.png         Logo quer auf Weiß (strukturierte Daten, 1200 × 300)
#   assets/brand/logo-negativ.png  Logo quer, weiß, transparent (für die Vorschaubilder)
# Mit Zielordner zusätzlich: Varianten in hoher Auflösung für Druck und Social Media.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || { echo "Google Chrome nicht gefunden: $CHROME"; exit 1; }
FONT="$(grep -oh 'font-family:Manrope;[^}]*src:url([^)]*-s\.p\.woff2)' out/_next/static/css/*.css 2>/dev/null | grep -o '/_next/[^)]*' | head -1 || true)"
[ -n "$FONT" ] && [ -f "out$FONT" ] || { echo "Manrope nicht im Build gefunden – erst 'npm run build' ausführen."; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
cp "out$FONT" "$WORK/manrope.woff2"
mkdir -p assets/brand

NAVY="#0b1f3a"; BLUE="#2563eb"; TEAL="#14b8a6"; TEAL_HELL="#2dd4bf"

mark() { # $1 Kennzeichenfarbe, $2 Häkchenfarbe
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 32" fill="none">
  <rect width="48" height="32" rx="8" fill="$1"/>
  <path d="M0 8a8 8 0 0 1 8-8h5v32H8a8 8 0 0 1-8-8V8Z" fill="$BLUE"/>
  <circle cx="6.5" cy="10" r="2.1" stroke="#ffffff" stroke-width="1.4"/>
  <path d="M21 16.5l5.6 5.6L38.5 10" stroke="$2" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
}

# Quadratisches Zeichen für Favicon und App-Icon: dasselbe Kennzeichen, auf ein Quadrat gestaucht.
icon() {
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="$1" fill="$NAVY"/>
  <path d="M0 $1a$1 $1 0 0 1 $1-$1h$((19 - $1))v64H$1a$1 $1 0 0 1-$1-$1V$1Z" fill="$BLUE"/>
  <circle cx="9.5" cy="17" r="3" stroke="#ffffff" stroke-width="2"/>
  <path d="M28 33l8 8 17-18" stroke="$TEAL_HELL" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
}

mark "$NAVY" "$TEAL_HELL" > public/logo.svg
icon 14 > app/icon.svg

# $1 Datei, $2 Breite, $3 Höhe, $4 Hintergrund (CSS), $5 HTML-Inhalt
render() {
  cat > "$WORK/seite.html" <<EOF
<!doctype html><meta charset="utf-8">
<style>
  @font-face { font-family: "Manrope"; src: url("manrope.woff2") format("woff2"); font-weight: 200 800; }
  html, body { margin: 0; width: $2px; height: $3px; background: $4; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; font-family: "Manrope", sans-serif; }
  .logo { display: flex; align-items: center; }
  .wort { font-weight: 800; letter-spacing: -0.03em; line-height: 1; white-space: nowrap; }
  svg { display: block; flex: none; }
</style>
$5
EOF
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --virtual-time-budget=3000 \
    --window-size="$2,$3" --screenshot="$1" "file://$WORK/seite.html" >/dev/null 2>&1
  echo "  $1 ($2 × $3)"
}

quer() { # $1 Höhe der Bildmarke in px, $2 Kennzeichenfarbe, $3 Häkchen, $4 Textfarbe
  local h=$1 w=$(( $1 * 3 / 2 ))
  echo "<div class=\"logo\" style=\"gap:$(( h * 30 / 100 ))px\"><div style=\"width:${w}px;height:${h}px\">$(mark "$2" "$3")</div><div class=\"wort\" style=\"font-size:$(( h * 66 / 100 ))px;color:$4\">KFZ-Zulassungsprofis</div></div>"
}
zeichen() { echo "<div style=\"width:$1px;height:$1px\">$(icon "$2")</div>"; }

echo "Projektdateien:"
render "$PWD/app/apple-icon.png" 180 180 "$NAVY" "$(zeichen 180 0)"
render "$PWD/public/logo.png" 1200 300 "#ffffff" "$(quer 120 "$NAVY" "$TEAL_HELL" "$NAVY")"
render "$PWD/assets/brand/logo-negativ.png" 900 120 "transparent" "$(quer 84 "#ffffff" "$TEAL" "#ffffff")"

if [ -n "${1:-}" ]; then
  ZIEL="$1"; mkdir -p "$ZIEL"
  echo "Markendateien in $ZIEL:"
  cp public/logo.svg "$ZIEL/kfz-zulassungsprofis_bildmarke.svg"
  mark "#ffffff" "$TEAL" > "$ZIEL/kfz-zulassungsprofis_bildmarke-negativ.svg"
  cp app/icon.svg "$ZIEL/kfz-zulassungsprofis_app-icon.svg"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_transparent.png" 3000 600 "transparent" "$(quer 300 "$NAVY" "$TEAL_HELL" "$NAVY")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_weiss.png" 3000 600 "#ffffff" "$(quer 300 "$NAVY" "$TEAL_HELL" "$NAVY")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_negativ-auf-navy.png" 3000 600 "$NAVY" "$(quer 300 "#ffffff" "$TEAL" "#ffffff")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_negativ-transparent.png" 3000 600 "transparent" "$(quer 300 "#ffffff" "$TEAL" "#ffffff")"
  render "$ZIEL/kfz-zulassungsprofis_bildmarke_transparent.png" 1200 800 "transparent" "<div style=\"width:1200px;height:800px\">$(mark "$NAVY" "$TEAL_HELL")</div>"
  render "$ZIEL/kfz-zulassungsprofis_app-icon_1024.png" 1024 1024 "transparent" "$(zeichen 1024 14)"
  render "$ZIEL/kfz-zulassungsprofis_profilbild_1024.png" 1024 1024 "$NAVY" "$(zeichen 1024 0)"
fi
echo "Fertig."
