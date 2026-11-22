#!/usr/bin/env bash
#
# Legt den Claude-API-Schlüssel für den KI-Assistenten ab, ohne dass er in einer
# Befehlszeile, im Terminal-Verlauf oder im Repository landet.
#
#   1. lokal in .env.assistent  – nur für Tests am Mac; „.env*“ steht in .gitignore,
#                                 Next.js lädt diese Datei nicht in den Build
#   2. als GitHub-Secret ANTHROPIC_API_KEY – der Produktiv-Deploy schreibt ihn von dort
#                                 in eine gesperrte Datei auf dem Webspace
#   3. Probe bei Anthropic (Modell-Liste abrufen, kostet nichts) – zeigt sofort, ob der
#                                 Schlüssel angenommen wird
#
# Aufruf:  bash scripts/ki-schluessel-einrichten.sh
# Erneut ausführen, wenn der Schlüssel getauscht wird – der alte Wert wird überschrieben.
#
# Der Schlüssel wird nie ausgegeben; angezeigt werden nur Sternchen, die Länge und die
# letzten vier Zeichen.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO="baco287/Zulassungsdienst"
DATEI=".env.assistent"

# Zerlegt eine Eingabe an jedem „sk-ant-“ und gibt den längsten Teil aus – aber nur, wenn
# alle anderen Teile Anfangsstücke davon sind. Das fängt mehrfaches Einfügen desselben
# Schlüssels ab (auch ein abgeschnittenes Einfügen), nicht aber zwei verschiedene Schlüssel.
vereinzeln() {
  local rest="$1" teil laengster="" anzahl=0
  rest="${rest//sk-ant-/$'\n'sk-ant-}"
  while IFS= read -r teil; do
    [ -n "$teil" ] || continue
    anzahl=$((anzahl + 1))
    [ "${#teil}" -gt "${#laengster}" ] && laengster="$teil"
  done <<< "$rest"
  [ "$anzahl" -gt 0 ] || return 1
  while IFS= read -r teil; do
    [ -n "$teil" ] || continue
    case "$laengster" in "$teil"*) ;; *) return 1 ;; esac
  done <<< "$rest"
  printf '%s' "$laengster"
}

# Ist schon ein Wert gespeichert, der sich bereinigen lässt (mehrfach eingefügt)?
VORHANDEN=""
if [ -f "$DATEI" ]; then
  ALT="$(sed -n 's/^ANTHROPIC_API_KEY=//p' "$DATEI" | head -1)"
  if [ -n "$ALT" ] && BEREINIGT="$(vereinzeln "$ALT")" && [ "$BEREINIGT" != "$ALT" ]; then
    VORHANDEN="$BEREINIGT"
  fi
  unset ALT BEREINIGT
fi

echo
if [ -n "$VORHANDEN" ]; then
  echo "Der Schlüssel wurde beim letzten Mal mehrfach eingefügt (das Feld zeigte nichts an)."
  echo "Einfach nur Enter drücken – dann wird er einmal sauber übernommen."
  echo "(Oder einen anderen Schlüssel mit Cmd+V einfügen und Enter drücken.)"
else
  echo "Claude-Schlüssel für KFZ-Zulassungsprofis einfügen (Cmd+V), dann Enter drücken."
  echo "Statt des Schlüssels erscheinen Sternchen. Einmal einfügen genügt."
fi
printf '> '

# Zeichenweise lesen, damit beim Einfügen sofort Sternchen erscheinen.
KEY=""
while IFS= read -rsn1 ZEICHEN; do
  [ -z "$ZEICHEN" ] && break                       # Enter
  if [ "$ZEICHEN" = $'\x7f' ] || [ "$ZEICHEN" = $'\b' ]; then
    if [ -n "$KEY" ]; then KEY="${KEY%?}"; printf '\b \b'; fi
    continue
  fi
  KEY="$KEY$ZEICHEN"
  printf '*'
done
echo

# Leerzeichen und Zeilenumbrüche vom Kopieren entfernen.
KEY="$(printf '%s' "$KEY" | tr -d '[:space:]')"

if [ -z "$KEY" ] && [ -n "$VORHANDEN" ]; then
  KEY="$VORHANDEN"
fi
unset VORHANDEN

case "$KEY" in
  "")
    echo "Nichts eingegeben – abgebrochen. Es wurde nichts geändert."
    exit 1
    ;;
  sk-ant-*) ;;
  *)
    echo "Das sieht nicht nach einem Claude-Schlüssel aus (er beginnt mit „sk-ant-“) – abgebrochen."
    echo "Es wurde nichts geändert."
    exit 1
    ;;
esac

if ! EINZELN="$(vereinzeln "$KEY")"; then
  echo "Die Eingabe enthält mehrere verschiedene Schlüssel – abgebrochen. Es wurde nichts geändert."
  echo "Bitte nur den einen Schlüssel für KFZ-Zulassungsprofis einfügen."
  exit 1
fi
if [ "$EINZELN" != "$KEY" ]; then
  echo "Hinweis: Der Schlüssel war mehrfach eingefügt – er wird einmal übernommen."
fi
KEY="$EINZELN"
unset EINZELN

umask 077
printf 'ANTHROPIC_API_KEY=%s\n' "$KEY" > "$DATEI"
echo "1/3  Lokal gespeichert ($DATEI, nicht im Repository)."

if printf '%s' "$KEY" | gh secret set ANTHROPIC_API_KEY --repo "$REPO" >/dev/null 2>&1; then
  echo "2/3  Bei GitHub hinterlegt (Secret ANTHROPIC_API_KEY)."
else
  echo "2/3  GitHub hat den Schlüssel nicht angenommen – bitte Claude Bescheid geben."
fi

# Probe: Modell-Liste abrufen (kein Modellaufruf, keine Kosten). Der Schlüssel geht über die
# Standardeingabe an curl, damit er nicht in der Prozessliste erscheint.
probe() {
  printf '%s\n' "$1" | curl -sS -o /dev/null -w '%{http_code}' --max-time 20 \
    -H @- -H 'anthropic-version: 2023-06-01' 'https://api.anthropic.com/v1/models?limit=1' 2>/dev/null || true
}
STATUS="$(probe "x-api-key: $KEY")"
if [ "$STATUS" = "200" ]; then
  echo "3/3  Anthropic nimmt den Schlüssel an."
elif [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  echo "3/3  Anthropic lehnt den Schlüssel ab (Antwort $STATUS) – bitte Claude Bescheid geben."
else
  echo "3/3  Probe bei Anthropic ohne klares Ergebnis (Antwort ${STATUS:-keine}) – bitte Claude Bescheid geben."
fi

echo
echo "Fertig. Der Schlüssel hat ${#KEY} Zeichen und endet auf …${KEY: -4}"
unset KEY STATUS
