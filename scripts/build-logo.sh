#!/usr/bin/env bash
# Erzeugt alle Logo-Dateien von KFZ-Zulassungsprofis aus einer Quelle.
#
#   npm run build && bash scripts/build-logo.sh [Zielordner für die Markendateien]
#
# Logo seit 20.11.2026: das Kennzeichen „D · Z ✓“ (Bildmarke) und der Name in
# Manrope ExtraBold (Wortmarke). Die Formen entsprechen components/Logo.tsx
# (viewBox 808 × 306). Die Wortmarke wird mit Manrope gesetzt – der Schriftdatei,
# die der Build ohnehin lokal ablegt (out/_next/static/media).
# Gerendert wird mit Headless Chrome; es wird nichts aus dem Netz geladen.
#
# Ergebnis im Projekt:
#   app/icon.svg            Favicon (Vektor, quadratisches Kennzeichen „D ✓“)
#   app/apple-icon.png      App-Icon 180 × 180
#   public/logo.svg         Bildmarke als Vektor
#   public/logo.png         Logo quer auf Weiß (strukturierte Daten, 1200 × 300)
#   assets/brand/logo-negativ.png  Logo quer für dunklen Grund, transparent (Vorschaubilder)
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

# Farben wie components/Logo.tsx (logoColors) und app/globals.css
NAVY="#04183f"; BLUE="#0058f8"; PUNKT="#0b0f1a"

# Bildmarke 808 × 306. $1 = Rahmenfarbe (Navy auf hellem, Weiß auf dunklem Grund).
mark() {
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 808 306" fill="none">
  <rect width="808" height="306" rx="52" fill="$1"/>
  <rect x="20" y="20" width="768" height="266" rx="34" fill="#ffffff"/>
  <path d="M20 54a34 34 0 0 1 34-34h195v266H54a34 34 0 0 1-34-34V54Z" fill="$BLUE"/>
  <path fill-rule="evenodd" d="M67 58h72c45 0 70 34 70 96s-25 96-70 96H67V58Zm40 34v124h28c22 0 33-20 33-62s-11-62-33-62h-28Z" fill="#ffffff"/>
  <circle cx="286" cy="153" r="17.5" fill="$PUNKT"/>
  <circle cx="752" cy="153" r="17.5" fill="$PUNKT"/>
  <path d="M356 58h155v35L402 216h109v34H354v-35L463 92H356V58Z" fill="$NAVY"/>
  <path d="M560 158l44 58 98-128" stroke="$BLUE" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
}

# Quadratisches Zeichen für Favicon und App-Icon: dasselbe Kennzeichen, auf ein
# Quadrat verkürzt – Rahmen, blaues Feld mit „D“, Haken. $1 = Eckenradius außen.
icon() {
  local r=$1 ri=$(( $1 > 4 ? $1 - 4 : 6 ))
  cat <<EOF
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <rect width="64" height="64" rx="$r" fill="$NAVY"/>
  <rect x="5" y="5" width="54" height="54" rx="$ri" fill="#ffffff"/>
  <path d="M5 $(( 5 + ri ))a$ri $ri 0 0 1 $ri-${ri}h$(( 23 - ri ))v54H$(( 5 + ri ))a$ri $ri 0 0 1-$ri-${ri}V$(( 5 + ri ))Z" fill="$BLUE"/>
  <path fill-rule="evenodd" transform="translate(-1.44 11.98) scale(0.13)" d="M67 58h72c45 0 70 34 70 96s-25 96-70 96H67V58Zm40 34v124h28c22 0 33-20 33-62s-11-62-33-62h-28Z" fill="#ffffff"/>
  <path d="M34.2 32.8l6.1 8.1 13.7-17.9" stroke="$BLUE" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
EOF
}

mark "$NAVY" > public/logo.svg
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
  .wort { font-weight: 800; letter-spacing: -0.025em; line-height: 1; white-space: nowrap; }
  svg { display: block; flex: none; width: 100%; height: 100%; }
</style>
$5
EOF
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --virtual-time-budget=3000 \
    --window-size="$2,$3" --screenshot="$1" "file://$WORK/seite.html" >/dev/null 2>&1
  echo "  $1 ($2 × $3)"
}

quer() { # $1 Höhe der Bildmarke in px, $2 Rahmenfarbe, $3 Textfarbe
  local h=$1 w=$(( $1 * 808 / 306 ))
  echo "<div class=\"logo\" style=\"gap:$(( h * 36 / 100 ))px\"><div style=\"width:${w}px;height:${h}px\">$(mark "$2")</div><div class=\"wort\" style=\"font-size:$(( h * 72 / 100 ))px;color:$3\">KFZ-Zulassungsprofis</div></div>"
}
zeichen() { echo "<div style=\"width:$1px;height:$1px\">$(icon "$2")</div>"; }

echo "Projektdateien:"
render "$PWD/app/apple-icon.png" 180 180 "$NAVY" "$(zeichen 180 0)"
render "$PWD/public/logo.png" 1200 300 "#ffffff" "$(quer 104 "$NAVY" "$NAVY")"
# linksbündig, damit es in den Vorschaubildern bündig über dem Text steht
render "$PWD/assets/brand/logo-negativ.png" 900 120 "transparent" "<div style=\"width:900px;display:flex\">$(quer 70 "#ffffff" "#ffffff")</div>"

if [ -n "${1:-}" ]; then
  ZIEL="$1"; mkdir -p "$ZIEL"
  echo "Markendateien in $ZIEL:"
  cp public/logo.svg "$ZIEL/kfz-zulassungsprofis_bildmarke.svg"
  mark "#ffffff" > "$ZIEL/kfz-zulassungsprofis_bildmarke-negativ.svg"
  cp app/icon.svg "$ZIEL/kfz-zulassungsprofis_app-icon.svg"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_transparent.png" 3000 600 "transparent" "$(quer 260 "$NAVY" "$NAVY")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_weiss.png" 3000 600 "#ffffff" "$(quer 260 "$NAVY" "$NAVY")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_negativ-auf-navy.png" 3000 600 "$NAVY" "$(quer 260 "#ffffff" "#ffffff")"
  render "$ZIEL/kfz-zulassungsprofis_logo-quer_negativ-transparent.png" 3000 600 "transparent" "$(quer 260 "#ffffff" "#ffffff")"
  render "$ZIEL/kfz-zulassungsprofis_bildmarke_transparent.png" 1616 612 "transparent" "<div style=\"width:1616px;height:612px\">$(mark "$NAVY")</div>"
  render "$ZIEL/kfz-zulassungsprofis_app-icon_1024.png" 1024 1024 "transparent" "$(zeichen 1024 14)"
  render "$ZIEL/kfz-zulassungsprofis_profilbild_1024.png" 1024 1024 "$NAVY" "$(zeichen 1024 0)"
fi
echo "Fertig."
