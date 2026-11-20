#!/usr/bin/env bash
# Testet die Weiterleitungen des Domainumzugs gegen einen lokalen Apache.
#
# Startet den mit macOS gelieferten Apache auf einem freien Port mit zwei
# virtuellen Hosts – genau wie später bei all-inkl:
#   kfz-zulassungsprofis.de (+ www)  →  ./out mit public/.htaccess
#   deutschezulassung.de    (+ www)  →  Ordner mit der bisherigen Website
#                                       und deploy/alte-domain/.htaccess
# Danach fragt scripts/check-weiterleitungen.mjs jede Seite ab.
#
#   npm run build && bash scripts/weiterleitungen-lokal-testen.sh
#
# PHP läuft hier nicht; der Formular-Endpunkt wird nur auf seine Weiterleitung geprüft.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-8099}"
HTTPD="${HTTPD:-/usr/sbin/httpd}"
MODS="${MODS:-/usr/libexec/apache2}"
[ -d out ] || { echo "Bitte zuerst 'npm run build' ausführen."; exit 1; }
[ -x "$HTTPD" ] || { echo "Apache nicht gefunden: $HTTPD"; exit 1; }

WORK="$(mktemp -d)"
ALT_ROOT="$WORK/alte-domain"
mkdir -p "$ALT_ROOT/preise" "$WORK/logs"
# Wie auf dem Server: Die alten Dateien liegen noch im Ordner. Der Test zeigt,
# dass sie trotzdem nicht mehr ausgeliefert werden.
echo "ALTE WEBSITE – darf nie ausgeliefert werden" > "$ALT_ROOT/index.html"
echo "ALTE WEBSITE – darf nie ausgeliefert werden" > "$ALT_ROOT/preise/index.html"
cp deploy/alte-domain/.htaccess "$ALT_ROOT/.htaccess"

cat > "$WORK/httpd.conf" <<EOF
ServerRoot "$WORK"
PidFile "$WORK/httpd.pid"
Listen 127.0.0.1:$PORT
ServerName localhost
LoadModule mpm_prefork_module $MODS/mod_mpm_prefork.so
LoadModule unixd_module $MODS/mod_unixd.so
LoadModule authz_core_module $MODS/mod_authz_core.so
LoadModule dir_module $MODS/mod_dir.so
LoadModule mime_module $MODS/mod_mime.so
LoadModule alias_module $MODS/mod_alias.so
LoadModule rewrite_module $MODS/mod_rewrite.so
LoadModule headers_module $MODS/mod_headers.so
LoadModule log_config_module $MODS/mod_log_config.so
TypesConfig /private/etc/apache2/mime.types
ErrorLog "$WORK/logs/error.log"
LogLevel warn
DirectoryIndex index.html
<Directory "/">
  Require all granted
  AllowOverride All
  Options FollowSymLinks
</Directory>
<VirtualHost 127.0.0.1:$PORT>
  ServerName kfz-zulassungsprofis.de
  ServerAlias www.kfz-zulassungsprofis.de
  DocumentRoot "$PWD/out"
</VirtualHost>
<VirtualHost 127.0.0.1:$PORT>
  ServerName deutschezulassung.de
  ServerAlias www.deutschezulassung.de
  DocumentRoot "$ALT_ROOT"
</VirtualHost>
EOF

"$HTTPD" -f "$WORK/httpd.conf" -k start
trap '"$HTTPD" -f "$WORK/httpd.conf" -k stop >/dev/null 2>&1 || true; sleep 0.5; rm -rf "$WORK"' EXIT
for _ in $(seq 1 30); do
  curl -s -o /dev/null "http://127.0.0.1:$PORT/" -H "Host: kfz-zulassungsprofis.de" && break
  sleep 0.2
done

echo "== Kopfzeilen der neuen Startseite =="
curl -s -o /dev/null -D - "http://127.0.0.1:$PORT/" -H "Host: kfz-zulassungsprofis.de" | grep -iE "^(HTTP|strict-transport|content-security|x-frame|x-content-type)" | cut -c1-110
echo "== Beispiel: alte Unterseite =="
curl -s -o /dev/null -D - "http://127.0.0.1:$PORT/auftrag/?leistung=abmeldung" -H "Host: deutschezulassung.de" | grep -iE "^(HTTP|location)"
echo
node scripts/check-weiterleitungen.mjs --server "127.0.0.1:$PORT" "$@"
STATUS=$?
if [ -s "$WORK/logs/error.log" ]; then echo "== Apache-Fehlerprotokoll =="; tail -5 "$WORK/logs/error.log"; fi
exit $STATUS
