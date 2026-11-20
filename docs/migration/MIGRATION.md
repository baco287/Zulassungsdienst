# Rebranding und Domainumzug: DeutscheZulassung → KFZ-Zulassungsprofis

Stand: 20.11.2026 · Branch `rebrand/kfz-zulassungsprofis` · **nicht veröffentlicht, nicht gepusht**

| | bisher | neu |
|---|---|---|
| Marke | DeutscheZulassung | KFZ-Zulassungsprofis |
| Domain | deutschezulassung.de | kfz-zulassungsprofis.de |
| Betreiber | Volt Gas UG (haftungsbeschränkt) | unverändert |

Die Live-Website unter deutschezulassung.de ist unverändert. Es wurden keine
DNS-, Hosting-, Google- oder GitHub-Einstellungen angefasst.

## 1. Ausgangslage

| Bereich | Befund |
|---|---|
| Technik | Next.js 15 (statischer Export), React 19, Tailwind 4. Einziger Server-Code: `public/api/auftrag.php` |
| Hosting | all-inkl (Server `w0216162.kasserver.com`, 85.13.168.82), Upload per FTPS aus GitHub Actions bei Push auf `main` |
| Staging | GitHub Pages (`baco287.github.io/Zulassungsdienst`), noindex, ohne PHP |
| Datenbank | keine. Aufträge gehen als E-Mail mit Anhängen an `info@deutschezulassung.de` |
| Zahlung | keine Integration aktiv (Überweisung). Mollie ist vorbereitet und aus, siehe `docs/CHECKOUT-MOLLIE.md` |
| Analyse, Consent | vorbereitet und aus, siehe `docs/TRACKING.md` |
| Neue Domain | seit 20.11.2026 registriert, liegt im selben all-inkl-Vertrag, zeigt die Platzhalterseite. **Noch kein eigenes SSL-Zertifikat** (https schlägt fehl) |
| Umfang | 1.220 HTML-Seiten, davon 471 indexierbar und in der Sitemap |

Seitenbestand (alle erhalten, gleiche Pfade):

| Bereich | Seiten | davon indexierbar |
|---|---|---|
| Kennzeichen (`/kennzeichen/…`) | 710 | 4 |
| Zulassungsstellen (`/zulassungsstelle/…`) | 405 | 389 |
| Stadtseiten (`/kfz-zulassung/…`) | 41 | 20 |
| Ratgeber | 16 | 16 |
| Leistungen | 14 | 14 |
| Gewerbe | 5 | 5 |
| Rechner, Vorlagen | 6 | 6 |
| Landingpages und Einzelseiten | 23 | 17 |

Dass viele lokale Seiten `noindex` tragen, ist die bestehende Regel aus
`lib/indexGate.ts` (nur belegte Behördendaten im Index) und wurde nicht verändert.

## 2. Was umgestellt wurde

- **Marke und Domain zentral** in `lib/site.ts` und `config/migration.json`.
  Daraus entstehen Canonicals, `og:url`, Sitemap, `robots.txt`, strukturierte
  Daten und `/llms.txt`.
- **Markenname** in allen Seiten, Landingpages, Ratgebern, Stadt- und
  Leistungstexten, FAQ, WhatsApp-Vorlagen, Formulartexten, im Auftrags-Endpunkt
  und in den Skripten (146 Stellen in 45 Dateien).
- **Rechtliches:** Betreiber bleibt die Volt Gas UG (haftungsbeschränkt).
  Impressum, Fußzeile, FAQ und strukturierte Daten (`legalName`) nennen sie
  unverändert; „KFZ-Zulassungsprofis ist ein Angebot der Volt Gas UG
  (haftungsbeschränkt)“.
- **E-Mail-Adressen bleiben** `info@deutschezulassung.de` und
  `no-reply@deutschezulassung.de`, bis die neuen Postfächer eingerichtet sind.
  Die FAQ „Woran erkenne ich echte Nachrichten“ nennt deshalb beide Domains.
- **Referenznummern** beginnen neu mit `KZP-`. Alte `DZ-`-Nummern bleiben auf
  der Upload-Seite gültig.
- **Logo und Auftritt:** neue Bildmarke (Kennzeichen mit Häkchen, ohne
  Nationalfarben), Wortmarke in Manrope, Favicon, App-Icon, Vorschaubilder
  (Open Graph) im neuen Design. Die schwarz-rot-goldene Linie unter der
  Kopfzeile ist entfernt. Erzeugt mit `scripts/build-logo.sh`.
- **Startseite:** Unterüberschrift nach Vorgabe. Alle anderen Texte, Preise
  und Überschriften sind unverändert.
- **Titel:** Der neue Name ist drei Zeichen länger. Die Grenze für den
  Markenzusatz liegt deshalb bei 63 statt 60 Zeichen (`lib/seo.ts`), damit kein
  Titel seinen Zusatz verliert. Einzige inhaltliche Titeländerung: `/ueber-uns/`
  ohne doppelten Markennamen.

Nicht umbenannt, mit Absicht: `docs/seo/*`, `docs/UMSETZUNG-2026-11.md`,
`docs/REDESIGN-2026-11.md`, `docs/recherche/*` (Berichte und Rohdaten zum alten
Stand), die E-Mail-Adressen und die technischen Einträge der alten Domain.

## 3. Weiterleitungen

Server-seitig per Apache (`.htaccess`), HTTP 301, pfadgleich, Parameter bleiben erhalten.

| Datei | Wirkt auf | Inhalt |
|---|---|---|
| `deploy/alte-domain/.htaccess` | deutschezulassung.de (mit und ohne www) | jede Adresse → gleiche Adresse auf `https://kfz-zulassungsprofis.de`. Vier Themen-Weiterleitungen direkt aufs Endziel. Formular-Endpunkt mit 308, damit eine laufende Übermittlung erhalten bleibt |
| `public/.htaccess` | kfz-zulassungsprofis.de | `www` → ohne `www`, Themen-Weiterleitungen, Sicherheits-Kopfzeilen, 404-Seite |

Die Datei für die alte Domain wird erst im Livegang hochgeladen. Die
bisherigen Dateien im alten Ordner werden dabei **nicht gelöscht**, nur nicht
mehr ausgeliefert. Rückweg: die frühere `.htaccess` zurücklegen
(`git show main:public/.htaccess`).

Vollständige Zuordnung alt → neu: `docs/migration/url-mapping.csv` (1.224 Zeilen).

## 4. Ablauf in zwei Stufen

`config/migration.json` → `"stufe"` steuert den Deploy (`.github/workflows/deploy.yml`):

| Stufe | Neue Domain | Alte Domain |
|---|---|---|
| `vorschau` (aktuell) | neue Website wird hochgeladen, **noindex**, Formular funktioniert | bleibt unverändert die bisherige Website |
| `live` | neue Website indexierbar | bekommt die Weiterleitungs-`.htaccess` |

Solange der Branch nicht nach `main` gemergt wird, passiert nichts.

### Reihenfolge bis zum Livegang

1. **all-inkl (KAS), von Hand:**
   - Domain `kfz-zulassungsprofis.de`: Zielordner prüfen. Erwartet wird
     `/kfz-zulassungsprofis.de/`; weicht er ab, `neu.ftpOrdner` in
     `config/migration.json` anpassen.
   - SSL-Zertifikat (Let's Encrypt) für `kfz-zulassungsprofis.de` und
     `www.kfz-zulassungsprofis.de` aktivieren, „SSL erzwingen“ einschalten.
   - PHP 8.x für die Domain, `post_max_size` ≥ 25M, `upload_max_filesize` ≥ 10M.
   - Postfächer `info@` und `no-reply@kfz-zulassungsprofis.de` anlegen
     (kann auch nach dem Livegang geschehen).
2. **Vorschau:** Branch nach `main` mergen. Der Deploy lädt die neue Website
   mit noindex auf die neue Domain. Die alte Website läuft weiter, wird ab
   dann aber nicht mehr aktualisiert.
3. **Auf der neuen Domain testen:**
   - `https://kfz-zulassungsprofis.de/api/auftrag.php?check=1` muss
     `"limitsOk": true` melden.
   - Einen Testauftrag mit Foto absenden, Eingang in `info@` prüfen
     (Absender nicht im Spam, Referenz `KZP-…`).
   - Upload-Seite `/unterlagen/` mit Datei testen.
4. **Livegang nach Freigabe:** in `config/migration.json` `"stufe": "live"`
   setzen und nach `main` pushen.
5. **Direkt danach prüfen:** `node scripts/check-weiterleitungen.mjs --live`
   (alle Seiten) oder `--live --stichprobe 40`.
6. **Google:** Checkliste in `docs/GOOGLE-EINRICHTUNG.md`, Abschnitt 1.

## 5. Prüfungen (20.11.2026)

| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit`, `npx eslint app components lib` | ohne Fehler |
| `npm run build` | 1.220 Seiten |
| `scripts/migration.mjs vergleich` | 1.220 von 1.220 Seiten vorhanden, 471 von 471 indexierbar, Sitemap 471 von 471, alle Canonicals und `og:url` auf der neuen Domain. Abweichungen außer Marke und Domain: 1 Titel (`/ueber-uns/`), 3 Texte (Startseite, FAQ, Impressum). Details: `vergleich-alt-neu.md` |
| `scripts/check-site.mjs` | bestanden (Links, Bilder, H1, Canonical, JSON-LD, Sitemap) |
| `scripts/check-preise.mjs --out`, `check-daten.mjs --out` | bestanden, Preise unverändert |
| `scripts/weiterleitungen-lokal-testen.sh` | 1.690 Weiterleitungen gegen einen lokalen Apache mit den echten `.htaccess`-Dateien: jede der 1.219 Seiten und 130 Dateien, dazu `www`, ohne Schrägstrich, mit Parametern, unbekannte Adresse (→ 404, nicht Startseite), Formular-Endpunkt (308). Keine Ketten, keine Schleifen |
| Alte Marke im Build | in keiner HTML-Seite, nicht in `llms.txt`, Sitemap, `robots.txt` |
| Vorschau-Modus (`NEXT_PUBLIC_NOINDEX=1`) | alle 1.220 Seiten tragen `noindex`. Dabei gefunden und behoben: 410 lokale Seiten blieben bisher auch auf Staging indexierbar (`lib/indexGate.ts`) |
| Darstellung | 28 Seitentypen in 375, 390, 768, 1024 und 1440 px ohne horizontales Scrollen, je eine H1. Dabei behoben: Kopfzeile lief bei 1024 px über. Auftragsseite und Stadtseite ohne Konsolenfehler |

**Nicht geprüft, weil lokal nicht möglich:**

- `auftrag.php` wurde nicht ausgeführt (auf diesem Rechner ist kein PHP
  installiert). Die Änderungen dort sind Konstanten und Texte; der echte Test
  ist Schritt 3 oben.
- E-Mail-Zustellung, SSL, „SSL erzwingen“ und das Verhalten der echten
  all-inkl-Server. Der lokale Apache prüft die Regeln, nicht das Hosting.
- Absenden des Auftragsformulars bis zur Zustellung. Geprüft ist nur, dass
  Formular und Upload-Seite laden und keine Fehler in der Konsole stehen.

**Bekannte offene Punkte:**

- Die PDF-Anleitung wurde mit dem neuen Namen neu erzeugt, ist aber 11 MB groß
  (vorher 2 MB): Chrome bettet die WebP-Bilder verlustfrei ein. Vor dem
  Livegang verkleinern.
- Der Build lädt die Schriften von Google und scheitert gelegentlich an einem
  Netzwerkfehler (`next/font`), heute einmal bei acht Läufen. Ein zweiter
  Versuch läuft durch. Abhilfe wie in `docs/REDESIGN-2026-11.md` beschrieben:
  Schriftdateien ins Repository legen.
- Die Vorschaubilder nutzen für Überschriften weiter Lexend; nur das Logo
  darin ist in Manrope gesetzt.

## 6. Risiken

| Risiko | Einordnung |
|---|---|
| **kfz-zulassungsprofi.de** (Einzahl) gehört einem anderen Anbieter und leitet auf kfzgo.de weiter | Tippfehler-Besucher landen beim Wettbewerb; mögliche Verwechslung der Namen. Vor dem Livegang Marken- und Namensrecht prüfen lassen (DPMA-Recherche) |
| Vorübergehender Rückgang der Sichtbarkeit | Bei Domainumzügen üblich, meist einige Wochen. Weiterleitungen mindestens ein Jahr, besser dauerhaft bestehen lassen |
| Alte Domain läuft aus oder verliert ihr Zertifikat | Dann brechen alle Weiterleitungen. Domain und SSL dauerhaft verlängern |
| E-Mails kommen noch von `@deutschezulassung.de` | Für Kunden ungewohnt. Hinweis steht in der FAQ; nach Einrichtung der neuen Postfächer umstellen |
| Offene Betreiberentscheidungen A1–A6 | Bestehen unabhängig vom Umzug weiter, siehe `docs/seo/OWNER-DECISIONS.md`. Punkt B12 (Nationalfarben im Logo) ist mit dem neuen Logo erledigt |
| Externe Einträge | Google-Unternehmensprofil, Verzeichnisse, WhatsApp-Business-Profil, Rechnungs- und E-Mail-Signaturen nennen noch den alten Namen |

## 7. Postfächer später umstellen

1. Postfächer im KAS anlegen, Empfang und Versand testen.
2. `site.contact.email` in `lib/site.ts` ändern.
3. `RECIPIENT` und `SENDER` in `public/api/auftrag.php` ändern.
4. Alte Adressen als Weiterleitung auf die neuen bestehen lassen.
