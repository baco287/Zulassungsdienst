# SEO-Autopilot – KFZ-Zulassungsprofis

Automatische SEO-Überwachung für https://kfz-zulassungsprofis.de: täglicher Prüflauf
(Technik, Titel/Beschreibungen, Preise, Marke), wöchentlich und monatlich zusätzlich
strukturierte Daten, Inhalte, FAQ, Search Console und Optimierungschancen. Ergebnis sind
Befunde mit Schweregrad und Freigabestufe, Berichte und die Daten für das **SEO Center**
(`/seo/`).

Anleitung für den Betrieb (Zeitplan, Benachrichtigungen, Search Console, Fehlerfälle):
[`docs/SEO-AUTOPILOT.md`](../docs/SEO-AUTOPILOT.md). Diese Datei beschreibt die Technik.

## Grundsätze

- **Nur lesend.** Zugriffe auf die Live-Website sind ausschließlich GET/HEAD, höflich
  (3 parallel, 200 ms Pause). Schnittstellen und geschützte Bereiche (`/api/`,
  `/analytics/`, `/seo/`, `/_next/`) werden nie abgerufen. Der Autopilot ändert nichts an
  der Website und deployt nichts.
- **Keine Abhängigkeiten.** CommonJS, nur Node-Bordmittel (Node ≥ 22: `fetch`,
  `node:test`, `node:crypto`, `node:tls`). Kein `npm install` nötig.
- **Läuft nie auf dem Webspace.** Dort gibt es kein Node. Geprüft wird in GitHub Actions
  oder lokal; der Webspace bewahrt nur den Stand auf und zeigt ihn an.
- **Öffentliches Repository.** Keine Zugangsdaten und keine Prüfdaten im Repo
  (`data/` ist ausgeschlossen). Konsolen-Ausgaben enthalten nur Zahlen und Status, weil
  die Actions-Protokolle öffentlich sind: keine Befundtexte, keine Suchanfragen, keine
  Adressen.

## Datenfluss

```
GitHub Actions (.github/workflows/seo-autopilot.yml)      Webspace (Apache + PHP)
┌───────────────────────────────────────┐                ┌──────────────────────────────────────┐
│ 1 Stand holen      bin/sync.js pull   │◀── HTTPS ─────▶│ /seo/daten.php   (Login wie          │
│ 2 Prüflauf         bin/autopilot.js   │   Basic-Auth   │                   /analytics/)       │
│   crawlt die Live-Website             │                │   liest/schreibt <Kontowurzel>/      │
│   verschickt ggf. Mail (lib/smtp.js)  │                │   seo-daten (außerhalb des Web-      │
│ 3 Stand hochladen  bin/sync.js push   │                │   Ordners)                           │
│   bei Fehler 2. Versuch nach 2 Min.   │                │ /seo/ → index.php → center.html      │
└───────────────────────────────────────┘                └──────────────────────────────────────┘
Lokal: node seo-autopilot/server.js → http://localhost:3500/seo/ (gleiche Oberfläche, gleicher Daten-Vertrag)
```

Der Zustand zwischen zwei Läufen (`issues.json`, `last-crawl.json`, …) liegt auf dem
Webspace. Ohne ihn wäre jeder Lauf ein Erstlauf: alles gälte als neu, Meldungen kämen
doppelt. `review.json` (Bearbeitungsstatus) schreibt nur das Center; der Prüflauf holt
die Datei, lädt sie aber nie hoch.

## Aufbau

```
seo-autopilot/
  config.js              Basis-URL, Crawl-Grenzen, wichtige Pfade, noindex-Ausnahmen,
                         Weiterleitungsprüfungen, Firmendaten, Search Console, Mail, Center
  bin/autopilot.js       Prüfläufe und Hilfsbefehle (siehe Befehle)
  bin/sync.js            Stand mit dem Webspace abgleichen: pull | push | status
  bin/local-check.js     Vorher/Nachher: lokaler Build (out/) gegen die Live-Befunde → local-check.json
  bin/preview-mails.js   Vorschau der E-Mails nach data/previews/ (verschickt nichts)
  server.js              SEO Center lokal (nur 127.0.0.1, ohne Login)
  lib/util.js            norm(), pathOf(), pageType(), family(), isNoindex(), JSON atomar schreiben
  lib/crawler.js         Crawl (Sitemap + Links), Weiterleitungs- und Dateiprüfungen, Offline-Modus
  lib/html.js            HTML-Auswertung (Title, Meta, Überschriften, Text, JSON-LD)
  lib/soll.js            Sollwerte aus <repo>/config/preise.json und config/betrieb.json
  lib/rules/             technical, meta, kfz (täglich) · schema, content, faq (wöchentlich)
  lib/aggregate.js       Bündelung von Massenbefunden je Seitenfamilie
  lib/issues.js          Befundspeicher: offen → behoben → wieder aufgetreten
  lib/report.js          Score und Berichte (Markdown + JSON)
  lib/actions.js         wichtigste Maßnahmen, wiederkehrende Probleme
  lib/opportunities.js   Optimierungschancen
  lib/suggest.js         Vorschlagstexte, Prüfschritte und Quelldatei je Befund
  lib/gsc.js             Search Console (Dienstkonto, nur lesend) · lib/gsc-analyze.js Auswertung
  lib/notify.js          Zusammenfassungen und Sofortmeldung · lib/smtp.js Versand
  lib/center-data.js     uebersicht.json und reports/index.json für das Center
  lib/api.js             Daten-Vertrag für den lokalen Server (identisch zu daten.php), Sync-Listen
  lib/review.js          Bearbeitungsstatus je Befund (review.json), atomares Schreiben
  test/                  node:test, ohne Netz
  data/                  Zustand und Berichte – nicht in Git
```

Die Oberfläche liegt nicht hier, sondern in der Website: `public/seo/center.html`
(einzige Quelle, alles inline, keine externen Ressourcen), `public/seo/index.php`
(Login), `public/seo/daten.php` (Daten-Schnittstelle), `public/seo/.htaccess`.

## Befehle (aus dem Repo-Wurzelordner)

```bash
node seo-autopilot/bin/autopilot.js daily      # technical + meta + kfz, Tagesbericht
node seo-autopilot/bin/autopilot.js weekly     # zusätzlich schema, content, faq, Search Console, Chancen
node seo-autopilot/bin/autopilot.js monthly    # wie weekly, dazu der Monatsbericht
node seo-autopilot/bin/autopilot.js crawl      # nur crawlen: page-cache.json + last-crawl.json (keine Regeln, keine Mails)
node seo-autopilot/bin/autopilot.js crawl --trotzdem  # last-crawl.json auch bei unplausiblem Crawl schreiben
node seo-autopilot/bin/autopilot.js status     # Kurzstatus (ohne Adressen und Zugangsdaten)
node seo-autopilot/bin/autopilot.js gsc        # nur Search-Console-Abruf
node seo-autopilot/bin/autopilot.js gsc-check  # Verbindung und Berechtigung des Dienstkontos prüfen
node seo-autopilot/bin/sync.js pull            # Stand vom Webspace nach data/ holen
node seo-autopilot/bin/sync.js push            # data/ auf den Webspace laden (überschreibt den Stand dort)
node seo-autopilot/bin/sync.js status          # Erreichbarkeit, Schreibrecht, Dateien Server ↔ lokal
node seo-autopilot/bin/local-check.js          # Vorher/Nachher gegen den lokalen Build (--details: mit Befundtiteln)
node seo-autopilot/bin/preview-mails.js        # Mail-Vorschauen nach data/previews/ (--beispiel: eingebaute Beispiele)
node seo-autopilot/server.js [port]            # SEO Center lokal: http://localhost:3500/seo/
node --test "seo-autopilot/test/**/*.test.js"  # Tests
```

Kurzformen in `package.json`: `npm run seo:daily`, `seo:weekly`, `seo:center`, `seo:test`.
Claude-Desktop: `.claude/launch.json` enthält den Eintrag `seo-center` (Port 3500).

`autopilot.js` beendet sich mit Exit 0 auch bei einem „unsicheren“ Lauf; nur ein Abbruch
(z. B. beschädigte `issues.json`) ergibt Exit 1. `crawl` endet mit Exit 1 und lässt
`last-crawl.json` unverändert, wenn der Crawl unplausibel ist (siehe Plausibilität), außer
mit `--trotzdem`. `sync.js` gibt bei jedem Fehler Exit 1 zurück; `pull` schreibt dann
lokal nichts.

**Offline-Modus:** `SEO_OFFLINE=1` baut das Crawl-Ergebnis ohne Netz aus dem Seitencache
(`data/page-cache.json` nach einem echten Lauf, oder die Datei aus `SEO_CACHE_FILE`) – für
die Regelentwicklung und schnelle Wiederholungen. Offline gibt es keinen
Search-Console-Abruf und keinen Mailversand. Ein Lauf in einem eigenen Ordner, ohne den
echten Stand anzufassen:

```bash
SEO_OFFLINE=1 SEO_CACHE_FILE=seo-autopilot/data/page-cache.json SEO_DATA_DIR="$(mktemp -d)" node seo-autopilot/bin/autopilot.js weekly
```

`sync.js push` vom eigenen Rechner ersetzt den Stand, den das SEO Center auf dem Server
zeigt. Nur bewusst verwenden; im Normalbetrieb macht das allein der Workflow.

## Einstellungen (Umgebungsvariablen)

Ein leerer Wert zählt wie „nicht gesetzt“, dann gilt der Standard.

| Variable | Standard | Zweck |
|---|---|---|
| `SEO_BASE` | `https://kfz-zulassungsprofis.de` | zu prüfende Website (ohne `www`, Schrägstrich am Ende wird entfernt) |
| `SEO_DATA_DIR` | `seo-autopilot/data` | Datenordner |
| `SEO_BUILD_DIR` | `<repo>/out` | Build für `local-check.js` |
| `SEO_OFFLINE` | – | `1` = Crawl aus dem Seitencache, ohne Netz (kein Search-Console-Abruf, kein Mailversand) |
| `SEO_CACHE_FILE` | `<Datenordner>/page-cache.json` | Seitencache des Crawlers; erlaubt Offline-Läufe in einem eigenen Datenordner mit dem Cache eines anderen |
| `SEO_HTML_DIR` | – | nur für die Parser-Entwicklung: Roh-HTML je Seite (gzip) in diesen Ordner schreiben |
| `SEO_NOTIFY` | aus | `1` = E-Mails versenden |
| `SEO_NOTIFY_TO` | – | Empfänger (mehrere mit Komma); ohne Empfänger kein Versand. Im Workflow ein **Secret** (nicht Variable), damit die Adresse nicht im öffentlichen Log steht |
| `SMTP_USER`, `SMTP_PASSWORD` | – | Postfach für den Versand (`SMTP_PASS` wird ebenfalls gelesen) |
| `SMTP_HOST`, `SMTP_PORT` | wie `scripts/mail-zugang.mjs` | Mailserver, falls abweichend |
| `GSC_CREDENTIALS_JSON` | – | Inhalt des Dienstkonto-Schlüssels (roh oder base64); im Workflow ein Secret |
| `GSC_CREDENTIALS_FILE` | – | lokal: Pfad zur Schlüsseldatei außerhalb des Repos |
| `GSC_PROPERTY` | `sc-domain:kfz-zulassungsprofis.de` | bei URL-Präfix-Property `https://kfz-zulassungsprofis.de/` |
| `SEO_CENTER_URL` | `https://kfz-zulassungsprofis.de/seo/` | Adresse des Centers (für `sync.js` und Mail-Fußzeile) |
| `SEO_CENTER_USER`, `SEO_CENTER_PASSWORD` | – | Login für `sync.js`; im Workflow die Secrets `ANALYTICS_USER` / `ANALYTICS_PASSWORD` |
| `SEO_CENTER_PORT` | `3500` | Port des lokalen Servers (`server.js`) |
| `KZP_SEO_DIR` (nur PHP) | `<Kontowurzel>/seo-daten` | Datenordner von `daten.php`, lokal umlenkbar |
| `KZP_ANALYTICS_DIR` (nur PHP) | `<Kontowurzel>/analytics-daten` | Datenordner des Analytics-Dashboards (`public/api/analytics-lib.php`), lokal umlenkbar |

Preise und Zeiten stehen nicht in `config.js`: `lib/soll.js` liest sie bei jedem Lauf aus
`config/preise.json` und `config/betrieb.json` der Website. Sind sie nicht lesbar,
überspringen die Regeln die Preisprüfungen und melden `soll-nicht-lesbar`.

## Läufe

| Lauf | Module | Zusätzlich |
|---|---|---|
| `daily` | `technical`, `meta`, `kfz` | Tagesbericht |
| `weekly` | + `schema`, `content`, `faq` | Search Console, Chancen, Wochenbericht |
| `monthly` | wie `weekly` | Monatsbericht |

- **Plausibilität:** Weicht ein Lauf massiv vom Vorlauf ab (unter 50 URLs, URL-Zahl um mehr
  als 40 % gesunken, unter 70 % Status 200, über 20 % Server-/Netzfehler, interne Fehler
  oder Abbruch des Crawlers, mindestens 10 neue kritische Befunde), gilt er als „unsicher“:
  Befunde werden gespeichert, aber nichts wird als behoben geschlossen, es gibt keine
  Befund-Meldungen, und `last-crawl.json` (Vergleichsbasis) bleibt stehen. Der zweite
  unsichere Lauf in Folge verschickt einmal einen Hinweis; nach drei unsicheren Läufen in
  Folge wird die Vergleichsbasis übernommen.
- **Notbremse im Crawler:** Abbruch nach 20 Minuten (`cfg.crawl.maxDauerMs`) oder wenn mehr
  als die Hälfte der Abrufe scheitert.
- **Score:** `100 − min(30, 10 × kritisch) − min(20, 4 × hoch) − min(10, 1 × mittel)
  − min(5, 1 × niedrig)`, mindestens 0 (`lib/report.js`, `score()`). Jeder offene Befund zählt
  einmal (ein Bündel für viele Seiten = ein Befund), `info` gar nicht. 100 heißt also: keine
  offenen Befunde außer `info`. Nach Seiten wird bewusst nicht gezählt, sonst drückte ein
  niedriger Hinweis auf Hunderten nicht indexierten Detailseiten den Wert stärker als ein
  kritischer Fehler.
- **Aufräumen:** Berichte und Indexeinträge älter als 180 Tage entfallen, ebenso Befunde,
  die länger als 180 Tage behoben sind.
- Am Ende jedes Laufs (auch eines unsicheren) schreibt `lib/center-data.js`
  `uebersicht.json` und `reports/index.json`. Alle JSON-Dateien werden atomar geschrieben.

## Verträge

### Regelmodule

Jedes Modul unter `lib/rules/` exportiert `run(ctx)` → Befunde, `rules` (Liste seiner
Regel-IDs), `gruppe` (Anzeigename im Center) und `labels` (`{ regel: Kurztext }`, landet in
`uebersicht.ruleLabels`). `ctx = { crawl, prev, cfg, hostChecks, soll, offen }`; `offen`
sind die offenen Befunde vor diesem Lauf (`store.open()`).

- **`geprueft(ctx)`** (optional; `kfz`, `content`, `faq`): die Regel-IDs, die in diesem Lauf
  wirklich geprüft wurden. Nur sie dürfen offene Befunde schließen. Ohne lesbare Sollwerte
  (`ctx.soll` ist `null`) fallen die Preisregeln von `kfz` bzw. `zeitangabe-abweichend`
  und `rechtsinfo-abweichend` heraus – offene Preisbefunde gelten dann nicht als behoben.
  Ohne `geprueft` gilt `rules`.
- **`ctx.soll`** kommt aus `lib/soll.js` (`load(cfg)`): Preise und Aktion aus
  `config/preise.json`, Zeiten aus `config/betrieb.json`, dazu die feste Liste früherer
  Preise. Wirft `load` (Datei fehlt oder ist unvollständig), ist `soll = null`, und `kfz`
  meldet `soll-nicht-lesbar` (info).
- **Ausfall eines Moduls:** Wirft `run(ctx)` oder fehlt die Schnittstelle, läuft der Lauf
  weiter und es entsteht der Befund `autopilot-modul` (hoch, `key` = Modulname, `file` =
  `seo-autopilot/lib/rules/<modul>.js`). Ein fehlerfrei gelaufenes Modul trägt
  `autopilot-modul:<modul>` in den Umfang ein; nur dann schließt sich dieser eine Befund.
  Der Tageslauf lässt einen Ausfall von `schema`, `content` oder `faq` also offen. Eine
  fehlende Moduldatei steht nur im Log und im Bericht.
- **Umfang (`scope`):** `IssueStore.apply` schließt nur offene Befunde, deren Regel im
  Umfang steht, oder bei einem Eintrag `regel:schlüssel` nur Befunde mit genau diesem
  Schlüssel.

`crawl.pages` ist eine `Map<url, rec>`. Garantiert sind unter anderem:

| Feld | Bedeutung |
|---|---|
| `rec.path` | Pfad der URL (`/preise/`); Query-Strings und Fragmente werden vor dem Einreihen entfernt |
| `rec.typ` | Seitentyp aus `util.pageType(path)`: `start`, `leistung`, `ratgeber`, `stadt`, `behoerde`, `kennzeichen`, `gewerbe`, `rechner`, `vorlage`, `landing`, `recht`, `hub`, `sonst` |
| `rec.noindex` | Meta robots oder `X-Robots-Tag`; bei mehreren Angaben gilt die strengste |
| `rec.indexable` | Status 200, HTML, nicht noindex, nicht per robots.txt gesperrt |
| `rec.contentHash` | sha1 über deploy-stabile Inhalte (Title, Description, Canonical, robots, H1, Haupttext, JSON-LD) – ändert sich nicht durch Build-IDs |
| `rec.changed` | `contentHash` weicht vom Vorlauf ab |
| `rec.page.text` / `textFull` | Hauptinhalt ohne Kopf, Fuß, Skip-Link und Brotkrumen / ganze Seite; beide über `util.norm()` normalisiert |

`prev` ist `last-crawl.json` des Vorlaufs, `hostChecks` das Ergebnis der
Weiterleitungsprüfungen aus `cfg.redirectChecks`
(`{ von, erwartet, final, status, spruenge, maxSpruenge, ok, grund }`).

### Befunde

Felder: `rule, severity, approval, url|file, title, detail, suggestion, key, current,
proposed, reason, risk, count, examples`.

- `severity`: `kritisch`, `hoch`, `mittel`, `niedrig`, `info`.
- `approval`: `auto` (technisch), `manuell` (Inhalt), `preis` (Preisfreigabe über
  `config/preise.json`), `recht` (rechtliche Prüfung).
- `key` muss stabil sein: keine Messwerte, Daten oder Zähler. Die Befund-ID ist
  `sha1(rule | url oder file | key oder title)`, gekürzt auf 12 Hex-Zeichen. Ein Messwert
  im Schlüssel ergäbe bei jeder Änderung einen neuen Befund.
- `file` verweist auf Quelldateien der Website (`app/sitemap.ts`, `lib/staedte.ts`,
  `config/preise.json`, `public/.htaccess`), nie auf `out/…`.
- Befunde auf Seitenfamilien (`/zulassungsstelle/*/`, `/kennzeichen/*/`,
  `/kfz-zulassung/*/`, `/ratgeber/*/`, `/leistungen/*/`) werden gebündelt: ein Befund je
  Regel und Familie mit `count` und bis zu 20 `examples`, schon ab einem Treffer (so bleibt
  die ID gleich, wenn die Zahl der Seiten zwischen eins und mehreren wechselt). Kernseiten
  (`importantPaths` in `config.js`, exakter Pfad) werden in `lib/aggregate.js` nie gebündelt
  (eigene Sammelbefunde einzelner Regeln, z. B. der Behördenhinweis, können sie enthalten): Fällt eine zweite
  Kernseite derselben Familie aus, bekommt sie ihre eigene Sofortmeldung.

### Regeln für diese Website

Die vollständige Liste mit Kurztext liefert `labels` je Modul (im Center unter jeder
Ansicht). Besonderheiten:

**`technical` – Indexierung und Erreichbarkeit** (täglich)

| Regel | Stufe | Auslöser |
|---|---|---|
| `vorschau-noindex` | kritisch | Startseite auf noindex. Stehen außerdem über 50 % der Kern- und Sitemap-Seiten auf noindex (vermutlich Vorschau-Build live), entfallen in diesem Lauf die Einzelmeldungen zu noindex, Indexverlust und Sitemap. Ebenso meldet `robots-wichtig` einmal, wenn robots.txt die ganze Website sperrt. |
| `index-verlust` | hoch | Seite war im Vorlauf indexierbar und ist jetzt noindex. Bei `importantPaths` kommt stattdessen `noindex-wichtig` (kritisch). |
| `index-drift` | kritisch | Zahl der indexierbaren Seiten eines Seitentyps sinkt gegenüber dem Vorlauf um mindestens 20 oder um mehr als 10 % (dann mindestens 3 Seiten). Die Einzelmeldungen `index-verlust` dieses Typs entfallen. |
| `sitemap-index-abweichung` | mittel | indexierbar, aber nicht in der Sitemap, oder noindex und trotzdem in der Sitemap (Seiten des Index-Gates); gebündelt je Familie |
| `entwurf-oeffentlich` | hoch, `recht` | Seite aus `cfg.entwurfSeiten` ist indexierbar oder steht in der Sitemap |
| `alte-domain-weiterleitung` | kritisch, bei richtigem Ziel über Umwege hoch | Weiterleitungsprüfung (`hostChecks`) der früheren Domain schlägt fehl; Quelle `deploy/alte-domain/.htaccess` |
| `host-weiterleitung` | hoch, bei richtigem Ziel über Umwege mittel | dasselbe für http/www der eigenen Domain und die Themen-Weiterleitungen (`public/.htaccess`) |
| `datei-defekt` | hoch | verlinkte Nicht-HTML-Datei (z. B. PDF) antwortet per HEAD nicht mit 200 |

`index-verlust`, `index-drift`, `erreichbarkeit-verlust`, `status-aenderung` und
`seite-geaendert` vergleichen mit dem Vorlauf (`prev`); ohne Vorlauf entstehen sie nicht
neu. `erreichbarkeit-verlust`, `index-verlust` und `index-drift` bleiben offen, solange der
Zustand anhält: Ihre offenen Befunde (`ctx.offen`) werden mit gleichem Schlüssel erneut
ausgegeben, solange die Seite nicht erreichbar bzw. noindex ist oder der Seitentyp unter
seinem Ausgangswert (`basis`) liegt. Erst danach schließen sie als behoben, ohne zweite
Sofortmeldung. Ist ein noindex gewollt, gehört die Adresse in `cfg.allowNoindex`.
`status-aenderung` und `seite-geaendert` (info) erscheinen nur beim Wechsel.

`cfg.entwurfSeiten` (in `config.js`) listet Seiten, die als Entwurf noindex und außerhalb
der Sitemap bleiben müssen (heute `/servicebedingungen/`). Ist eine Seite rechtlich
geprüft und bewusst freigegeben, wird sie aus der Liste genommen; sonst meldet
`entwurf-oeffentlich` sie nach der Freigabe als Fehler.

**`kfz` – Preise, Marke, Pflichtangaben** (täglich): `preis-alt`, `preis-abweichend`,
`aktionspreis-abgelaufen`, `aktion-laeuft-aus`, `preis-gebuehren-widerspruch` (Freigabe
`preis`), `streichpreis` (`recht`), `altmarke-sichtbar` (auch Sitemap und robots.txt),
`alte-mailadresse`, `platzhalter-sichtbar`, `render-fehler`, `entwicklerhinweis`,
`impressum-pflichtangabe` (gegen `cfg.company`), `behoerdendaten-pruefdatum` (Vorwarnung vor
dem Index-Gate: mittel 33 Tage, kritisch 7 Tage vor dessen Frist, bei 183 Tagen also ab 150
bzw. 176 Tagen, mit Stichtag im Text) und `soll-nicht-lesbar` (info). Die Preisregeln
vergleichen nur mit `ctx.soll`; im Code steht kein gültiger Betrag. Angaben der Behörden auf
`/zulassungsstelle/*` gelten nicht als Eigenaussagen.

### Datendateien (`data/`)

| Datei | Schreiber | Abgleich mit dem Webspace |
|---|---|---|
| `issues.json`, `last-crawl.json`, `crawl-history.json`, `suggestions.json`, `opportunities.json`, `notifications.json` | Autopilot | hoch und runter |
| `gsc.json`, `gsc-analysis.json`, `gsc-status.json` | Autopilot | hoch und runter |
| `uebersicht.json`, `reports/index.json` | `lib/center-data.js` | hoch (Index auch runter) |
| `reports/<art>-<datum>….md` / `.json`, `reports/latest-<art>.md` / `.json` | Autopilot | nur hoch |
| `review.json` | nur das Center (PHP bzw. lokaler Server) | nur runter |
| `local-check.json` | `bin/local-check.js` | nicht |
| `page-cache.json`, `run-*.log`, `previews/` | lokal | nie |

`reports/latest-<art>.json` enthält die Kennzahlen des Laufs (`score, open, kritisch,
hoch, mittel, niedrig, neu, behoben, wieder`); der Workflow liest daraus die Zahlen für
seine Zusammenfassung.

### Daten-Vertrag Center ↔ Server

Identisch für `public/seo/daten.php` (Webspace) und `lib/api.js` über `server.js` (lokal).
Basis ist die relative Adresse `daten.php` neben der Oberfläche. Alle Antworten tragen
`Cache-Control: no-store` und `X-Robots-Tag: noindex, nofollow`.

| Aufruf | Wirkung |
|---|---|
| `GET daten.php?d=<name>` | Datensatz aus einer festen Liste (`uebersicht`, `issues`, `review`, `suggestions`, `opportunities`, `notifications`, `crawl-history`, `gsc`, `gsc-analysis`, `gsc-status`, `reports`, `local-check`, `last-crawl`). Fehlt die Datei: 404 mit `{"ok":false,"fehlt":true,"d":"<name>"}` |
| `GET daten.php?bericht=<datei>` | Bericht aus `reports/` (Muster `^(daily\|weekly\|monthly\|latest)-[A-Za-z0-9._-]+\.(md\|json)$`) |
| `GET daten.php?zustand=1` | Diagnose ohne Inhalte: vorhandene Dateien, Zahl der Berichte, Schreibbarkeit, Version |
| `POST daten.php?review=<id>` | Bearbeitungsstatus speichern, Body `{state, note}`; `state` ∈ `offen`, `in_pruefung`, `lokal_behoben`, `freigegeben`; Notiz höchstens 500 Zeichen; die ID muss in `issues.json` vorkommen |
| `POST daten.php?ablage=<name>` | Upload durch `sync.js push`, roh oder gzip (`X-Body-Encoding: gzip`), höchstens 16 MB; `.json` muss gültiges JSON sein. Mit dem Berichtsindex räumt der Server Berichte ab, die nicht mehr im Index stehen |

- Jeder POST braucht die Kopfzeile `X-Requested-With` (`XMLHttpRequest` im Browser,
  `SEO-Autopilot` vom Prüflauf). Ist `Origin` gesetzt, muss dessen Host dem `Host`
  entsprechen. Sonst 403.
- Fehler kommen als `{"ok":false,"error":"…"}` mit passendem Status. Unbekannte
  Parameter ergeben 400.
- Namen aus der Anfrage werden nur mit festen Listen oder dem Muster verglichen und
  fließen nie ungeprüft in einen Pfad.
- Webspace: Jede PHP-Datei ruft zuerst `kzp_require_auth()` aus
  `public/api/analytics-lib.php` auf (derselbe Login wie `/analytics/`). Fehlt die
  Zugangsdatei `api/analytics-zugang.php` (entsteht nur beim Deploy aus den Secrets), kommt
  503. Nach 10 Fehlversuchen je Anschluss in 15 Minuten kommt 429, für `/seo/` und
  `/analytics/` gemeinsam. Zähler lesen, Passwort vergleichen und Fehlversuch schreiben
  geschehen unter einer Dateisperre, damit auch gleichzeitige Anfragen nicht mehr als 10
  Passwörter prüfen. Richtige Logins und Anfragen ohne Zugangsdaten zählen nicht.
- Webspace: `daten.php` legt in den Datenordner eine `.htaccess` mit `Require all denied`,
  falls sie fehlt (zweite Sicherung; der Ordner liegt ohnehin außerhalb des Web-Ordners).
  `?zustand=1` und die Ablage kennen sie nicht.
- Lokal: gleiche Routen unter `/seo/daten.php`, ohne Login, nur an 127.0.0.1 gebunden.

## Zeitplan (GitHub Actions)

`.github/workflows/seo-autopilot.yml` startet täglich um 04:30 UTC und von Hand
(`workflow_dispatch`, Eingabe `art`: `auto`, `daily`, `weekly`, `monthly`). `auto` heißt:
am 1. des Monats `monthly`, sonst montags `weekly`, sonst `daily` (Datum in
Europe/Berlin). Ablauf:

1. Zugang prüfen (Secrets `ANALYTICS_USER`, `ANALYTICS_PASSWORD`).
2. Bis zu 25 Minuten warten, falls der Workflow „Build & Deploy“ läuft – während eines
   Deploys ist die Website ein Gemisch aus altem und neuem Stand.
3. `sync.js pull` (Exit ≠ 0 beendet den Job) → `autopilot.js <art>` (höchstens 30 Minuten;
   verschickt die Mails selbst, also vor dem Hochladen) → `sync.js push`, nur nach
   fehlerfreiem Prüflauf. Scheitert `push`, folgt nach 2 Minuten ein zweiter Versuch;
   scheitert auch der, wird der Job rot. `push` lädt zuerst `issues.json`, dann
   `last-crawl.json` und bricht ab, wenn eine der beiden scheitert; danach die übrigen
   Daten, Berichte und zuletzt den Index.
4. Zusammenfassung in Zahlen aus `data/reports/latest-<art>.json`.

Einstellungen: Variablen `SEO_NOTIFY`, `GSC_PROPERTY`, `SEO_CENTER_URL`; Secrets
`ANALYTICS_USER`/`ANALYTICS_PASSWORD` (→ `SEO_CENTER_USER`/`SEO_CENTER_PASSWORD`, nur für
`sync.js`), `SEO_NOTIFY_TO`, `SMTP_*`, `GSC_CREDENTIALS_JSON` (nur für den Prüflauf). Leere
Werte entfernt jeder Schritt per `unset`, damit die Standardwerte aus `config.js` gelten.
Jede Adresse aus `SEO_NOTIFY_TO` wird zusätzlich einzeln maskiert (`::add-mask::`).

Der Workflow hat nur Leserechte (`contents: read`, `actions: read`), eine eigene
`concurrency`-Gruppe, kein FTP, kein Artefakt-Upload und keinen Commit. Zeitpläne laufen
nur vom Standard-Branch. Die Gesamtgrenze steht als `timeout-minutes` am Job (Warten auf
den Deploy, Prüflauf und beide Upload-Versuche zusammen).

## Tests

```bash
npm run seo:test        # entspricht: node --test "seo-autopilot/test/**/*.test.js"
```

- Tests laufen ohne Netz und schreiben nur in eigene Temp-Ordner (`os.tmpdir()`), nie
  nach `seo-autopilot/data/`.
- `test/php.test.js` startet den eingebauten PHP-Server (`php -S`) gegen Kopien von
  `public/seo/`, `public/analytics/` und `public/api/analytics-lib.php` in einem
  Temp-Ordner, mit eigener Zugangsdatei und eigenem Temp-Ordner für den Login-Zähler. Ohne
  installiertes PHP werden diese Tests übersprungen. `.htaccess` wertet `php -S` nicht aus;
  sie wird nur als Text geprüft.
- Neue Logik braucht einen Test. Neue oder geänderte Regeln werden zusätzlich gegen die
  echten Seiten geprüft (Offline-Crawl aus dem Cache oder Build in `out/`): Jeder Treffer
  ist entweder ein echter Befund oder ein Grund, die Regel nachzuschärfen.
- Angaben der Behörden auf `/zulassungsstelle/*` (Gebühren, Zeiten, Zahlarten) sind keine
  Eigenaussagen der Website und dürfen keine Befunde auslösen.

## Eine Regel ergänzen

1. Im passenden Modul unter `lib/rules/` die Prüfung schreiben und die ID in `rules`
   aufnehmen. Über `rules` weiß der Befundspeicher, welche Befunde ein Lauf schließen darf.
2. Stabilen `key` wählen, Schweregrad und Freigabestufe festlegen, `file` auf die
   Quelldatei der Website setzen.
3. Test schreiben (Treffer und Nicht-Treffer), dann gegen den echten Stand prüfen.
4. Die Zuordnung zur Ansicht im Center entsteht aus `gruppe` und landet über
   `lib/center-data.js` in `uebersicht.ruleGroups` – in `center.html` ist nichts zu ändern.
