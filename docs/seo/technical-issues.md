# Technische Befunde – deutschezulassung.de

Stand: 09.11.2026 · Quelle: Live-Crawl (`scripts/seo-crawl.py`, 1.214 URLs), `scripts/check-site.mjs`, Code-Analyse, CRO/Performance-Agent

Status: **behoben** (Branch `seo/sprint-1`) · **offen** · **Info**

## Crawlbarkeit, Indexierung, Sitemap

| ID | Befund | Schwere | Status |
|---|---|---|---|
| T01 | Alle 1.214 Sitemap-URLs liefern 200, keine Weiterleitungsketten in der Sitemap, keine verwaisten Seiten (jede hat ≥ 1 internen Link) | Info (positiv) | – |
| T02 | `robots.txt` erlaubt alles und verweist auf die Sitemap; Staging (GitHub Pages) korrekt `noindex,nofollow` | Info (positiv) | – |
| T03 | 743 Seiten ohne ausreichenden Einzelwert indexierbar (706 Kennzeichen, 16 Behörden, 21 Städte) → Doorway-/Thin-Content-Risiko | Hoch | **behoben**: `lib/indexGate.ts`, `noindex,follow`, raus aus Sitemap und `/llms.txt`; Sitemap 1.214 → 471 |
| T04 | Index-Gate läuft gegen das Prüfdatum: Behördenangaben älter als 183 Tage verlieren beim nächsten Build automatisch den Index | Info | Neuprüfung halbjährlich einplanen (`npm run import:zulassungsstellen`) |
| T05 | Sitemap-`lastmod` = Build-Zeitpunkt für statische Seiten; signalisiert Änderungen, die es nicht gab | Niedrig | offen (auf echtes Änderungsdatum je Seite umstellen) |
| T06 | Rechtsseiten (`/impressum/`, `/datenschutz/`, `/widerruf/`) und `/unterlagen/` nicht in der Sitemap | Info | gewollt |
| T07 | Kreis Paderborn und St. Ingbert ohne Behördenseite; Wiesbaden fällt durch das Gate (Zuständigkeit nur § 75 FZV) | Niedrig | offen (Nachrecherche); `docs/UMSETZUNG-2026-11.md` nennt Frankfurt noch als fehlend – die Seite ist aber live und besteht das Gate |
| T08 | 301-Weiterleitungen und eigene 404 nur in `public/.htaccess`, also nur auf all-inkl wirksam, nicht lokal testbar | Info | nach Deploy per `curl -I` prüfen |

## Metadaten und strukturierte Daten

| ID | Befund | Schwere | Status |
|---|---|---|---|
| T10 | Genau eine H1 je Seite, Canonical = URL, og:url = Canonical, keine doppelten Titel und Descriptions | Info (positiv) | – |
| T11 | 98 Titel über 60 Zeichen | Mittel | **behoben** bis auf 9 (lange amtliche Kreisnamen, 61–71 Zeichen); `lib/seo.ts → fitTitle()` hängt den Markenzusatz nur an, wenn er passt |
| T12 | Startseite und `/kfz-zulassung-ohne-eid/` mit fast identischem Titel (Kannibalisierung) | Mittel | **behoben**: Startseite „Kfz-Zulassung online ohne Behördentermin“ |
| T13 | Behördentitel „Zulassungsstelle X: Adresse & Termin“ suggeriert Terminvergabe durch die Seite | Mittel | **behoben**: „Adresse & Zuständigkeit“ |
| T14 | 21 Descriptions über 160 Zeichen (Startseite 176, einige Stadtseiten 168) | Niedrig | offen |
| T15 | Unternehmen als `LocalBusiness` ohne Publikumsstandort, auf jeder Seite neu beschrieben | Mittel | **behoben**: `Organization` mit `@id`, alle `provider` verweisen darauf |
| T16 | Service-Offers aus anderer Quelle als die sichtbare Preisbox | Mittel | **behoben**: `lib/catalog.ts → serviceJsonLd()` |
| T17 | FAQ-Markup nur für sichtbare FAQ, kein AggregateRating ohne echte Bewertungen | Info (positiv) | – |

## Performance

| ID | Befund | Schwere | Status |
|---|---|---|---|
| T20 | PageSpeed-API: Kontingent erschöpft (HTTP 429), keine Lighthouse-Werte | – | offen: mit API-Schlüssel oder in Search Console (CWV-Bericht) messen |
| T21 | TTFB 0,16–0,35 s, LCP-Element überall Text, keine Drittanbieter-Skripte; JS ca. 122 KB (Startseite) bzw. 175 KB (`/auftrag/`) komprimiert | Info | – |
| T22 | framer-motion lädt auf `/auftrag/` 129 KB rohes JS nur für eine Einblendung beim Schrittwechsel | Mittel | offen (Sprint 2: CSS-Übergang) |
| T23 | Header-Logo 600×200-PNG für 108×36 px Anzeige; Bilder ohne `Cache-Control` | Niedrig | offen |
| T24 | Zwei variable Webfonts vorgeladen (68,5 KB); Altlasten-Keyframes im CSS | Niedrig | offen |
| T25 | Lokaler Build brach mit „Failed to allocate memory“ ab (20 Kerne → ~19 Worker für OG-Bilder) | Mittel (Entwicklung) | **behoben**: `NEXT_BUILD_CPUS` in `next.config.ts`, lokal `NEXT_BUILD_CPUS=4 npm run build` |

## Barrierefreiheit (Auszug, vollständig in cro-a11y-performance.md)

| ID | Befund | Status |
|---|---|---|
| T30 | Gold-Text auf hellem Grund 1,7–2,4 : 1 | **behoben** (`accent-600` #8a5a00 = 5,9 : 1; H1 Navy mit Gold-Unterstreichung) |
| T31 | Formularrahmen 1,23 : 1, Platzhalter 2,56 : 1 | **behoben** (`ink-500`) |
| T32 | Weiß auf WhatsApp-Grün 1,98 : 1, WhatsApp-Icon 1,77 : 1 | **behoben** (Navy-Schrift, dunkleres Icon-Grün) |
| T33 | Unsichtbarer Fokus am Kundentyp-Radio; globaler Fokusring auf Navy-Flächen unsichtbar | **behoben** |
| T34 | Mobilmenü ohne Escape, ohne Fokusrückgabe, schließt nicht beim Seitenwechsel | **behoben** |
| T35 | `aria-live` auf der gesamten Konfigurator-Zusammenfassung; `aria-current` auf illustrativer Schrittleiste | **behoben** |
| T36 | Kontaktfehler nicht per `aria-describedby` mit E-Mail und Telefon verknüpft | **behoben** |
| T37 | Leistungsauswahl im Formular ohne ARIA-Radio-Muster, kein `<form>`-Element, keine Live-Region beim Senden | offen (Sprint 2) |
| T38 | Preistabellen scrollen auf dem Handy horizontal | offen (Sprint 2) |

## Tracking und Datenschutz

| ID | Befund | Status |
|---|---|---|
| T40 | Abbruch-Ereignis feuerte bei Kamera-/App-Wechsel (`visibilitychange`) | **behoben** (`pagehide`) |
| T41 | Matomo-Link-Tracking hätte vorbefüllte WhatsApp-Texte mit Kontaktdaten erfasst; volle URLs mit Referenznummern | **behoben** (Link-Tracking aus, nur Pfade) |
| T42 | Matomo zählte clientseitige Seitenwechsel nicht | **behoben** |
| T43 | Fehlende Soll-Ereignisse: Preisbox gesehen, B2B-Anfrage, Tool verwendet; Footer-Kontakte ungetrackt | **behoben** |
| T44 | CSP in `.htaccess` erlaubt nur `'self'`, eine aktivierte Analyse würde blockiert | offen: beim Aktivieren Analyse-Host ergänzen (`docs/TRACKING.md`) |
| T45 | `/unterlagen/?ref=DZ-…`: Plausible wertet `ref` als Quelle | offen (Parameter umbenennen, alte Links weiter akzeptieren) |

## Daten-Konsistenz (Single Source of Truth)

| ID | Befund | Status |
|---|---|---|
| T50 | Preise: zentral und konsistent (`config/preise.json`, `check:preise`) | Info (positiv) |
| T51 | Zeitangaben in über 100 Freitextstellen, widersprüchliche Minutenangaben (2/10/15) | **behoben**: `config/betrieb.json`, `lib/betrieb.ts`, `check:daten` |
| T52 | PDF `public/downloads/anleitung-online-zulassung.pdf` (21.08.2026) ist ein Bild-PDF mit alten Aussagen (Aufwand 15 Min., Schildermacher, „eine Unterschrift“) | offen: nach Entscheidung A1/A5 aus `/anleitung/` neu erzeugen (`scripts/build-anleitung-pdf.sh`) |
