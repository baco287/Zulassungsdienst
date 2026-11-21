# Neugestaltung „Das Schild“ – November 2026

Stand: 21.11.2026 · Branch `redesign/neugestaltung-2026-11` (von `main` @ dccd89aa) · **nicht veröffentlicht**

Ersetzt die Gestaltung aus `docs/REDESIGN-2026-11.md` (Designsystem v4). Verlauf auf diesem
Branch: zuerst v5 „Preistafel“ (20.11.), dann mit dem neuen Logo v6 „Das Schild“ (21.11.,
vom Betreiber aus zwei Entwürfen gewählt). Preise, Zeiten, URLs und strukturierte Daten sind
unverändert; Textänderungen nur wie unten unter „Texte“ aufgeführt.

## Leitidee

Alles kommt aus dem neuen Logo, dem Kennzeichen „D · Z ✓“: dunkelblauer Rahmen, kräftig blaues
Band mit „D“, weißes Feld, blauer Haken. Das Erkennungsstück ist das **große Kennzeichen** im
Kopf der Startseite: Es zeigt die gewählte Leistung („NEUZULASSUNG ✓“), darunter Auswahl,
Festpreis und der direkte Start. Daneben bleibt alles ruhig: Weiß, ein kühles Hellgrau,
Linien statt Karten.

## Designsystem v6 (`app/globals.css`)

| Rolle | Wert |
|---|---|
| Navy (Text, Rahmen, dunkle Flächen, Fußzeile) – Logo | `#04183f` |
| Logo-Blau (Hauptschaltflächen, Links, Fokus, Auswahl, Band) | `#0058f8`, Hover `#0045c4` |
| Haken | `#0058f8` auf Hell, `#5591fb` auf Navy |
| Fläche hell (canvas, Kopf jeder Seite) | `#eef1f6` |
| Linien | `#d3d9e3` |
| Sekundärtext | `#3d4a5f` |
| Schraubenpunkte des Schilds | `#0b0f1a` |
| Hinweis (nur Zustände wie „Versand fehlgeschlagen“) | `hinweis-50/300/900` |

Kontraste (WCAG 2.2 AA): Weiß auf Navy 18,3 : 1 · Weiß auf Logo-Blau 5,6 : 1 · Logo-Blau auf
Weiß 5,6 : 1 · Sekundärtext auf Weiß 9,0 : 1.

Schrift: **Archivo** (variable Breite) für alles; Überschriften breit (`wdth` 114), die
Schrift auf dem Kennzeichen schmal (`wdth` 62). **Manrope** nur für die Wortmarke. Beide über
`next/font`, ausgeliefert vom eigenen Server (Schriften wie bisher – Datenschutzerklärung
unberührt).

Ein einziger Schatten (`--shadow-buehne`) unter der Bühne des Kennzeichens; sonst keine
Schatten, keine Verläufe, keine Icon-Kacheln, keine Mini-Labels über Überschriften, kein Pfeil
in Schaltflächen. Ecken nach Größe gestuft (Schaltfläche 10 px, Tafel 16 px, Bühne 22 px).

### Bausteine

| Klasse / Komponente | Zweck |
|---|---|
| `components/Logo.tsx` | Logo als Vektor (Bildmarke 808 × 306 + Wortmarke) |
| `.buehne`, `.schild*` + `components/home/SchildAuswahl.tsx` | großes Kennzeichen mit Leistungsauswahl (Startseite) |
| `.schritt-nr` | Schrittnummer als Mini-Kennzeichen „D 01“ (nur echte Reihenfolgen) |
| `.h-kopf`, `.h-seite`, `.h-abschnitt` | Überschriften Startseite, Unterseiten-Kopf, Abschnitt |
| `.seitenkopf` | Kopf jeder Unterseite (Hellgrau wie die Startseite, Linie unten); auch Rechtsseiten |
| `.tafel`, `.tafel-breit` | Kasten mit Logo-Rahmen und blauem Band; die breite Tafel trägt das „D“ |
| `.pt-*` + `components/ui/Preistafel.tsx` | Preistafel (Preisabschnitt der Startseite); auch `ServicePriceGrid` |
| `.liste` | Liste mit Linien – Ersatz für Kartenreihen |
| `.link` | unterstrichener Textlink |
| `.btn` + `-primary` (Logo-Blau), `-navy`, `-secondary` (Umriss), `-wa`, `-hell`, `-on-dark` | Schaltflächen |
| `.auswahl-zeile`, `.auswahl-punkt` | Leistungswahl im Online-Auftrag (Rolle „radio“) |
| `components/ui/Haken.tsx` | Haken aus dem Logo, einziges Listenzeichen |
| `components/ui/SectionHeading.tsx` | Abschnittskopf ohne Mini-Label |

### Das Kennzeichen (`SchildAuswahl`)

- Sechs Leistungen als `radiogroup` (Pfeiltasten, Pos1/Ende, nur die gewählte ist per Tab
  erreichbar). Das Schild ist Dekoration (`aria-hidden`); Name, Preis, Inhalt und Dauer stehen
  als Text in einer `aria-live`-Zeile.
- Schriftgröße auf dem Schild nach Wortlänge (höchstens 7,4 cqw), damit „WIEDERZULASSUNG“
  nicht an die Schraubenpunkte stößt. Alle Maße in `cqw` – das Schild skaliert als Ganzes.
- Beim Wechsel kommen Schrift und Haken kurz von unten (nur nach Klick, nicht beim Laden;
  bei „Bewegung reduzieren“ aus).
- Ohne JavaScript steht die erste Leistung fest da, der Start-Link funktioniert.
- Analyse: `service_selected` und `cta_click` mit `position: "hero_schild"`,
  `price_box_view` beim Sichtbarwerden (siehe `docs/TRACKING.md`).
- Am Handy steht das Kennzeichen direkt unter Überschrift und Einleitung (linker Block mit
  `display: contents`, Reihenfolge per `order`); ab 1100 px rechts neben dem Text.

## Was sich geändert hat

- **Logo:** neues Kennzeichen-Logo in Kopf- und Fußzeile, Favicon (`app/icon.svg`, quadratisch
  „D ✓“), App-Icon, `public/logo.svg/.png`, Logo in den Vorschaubildern. Alles erzeugt
  `scripts/build-logo.sh` aus denselben Formen wie `components/Logo.tsx`.
- **Vorschaubilder** (`lib/og.tsx`): neue Farben, blaues Band mit „D“, kein Verlauf mehr.
- **Startseite:** Kopf mit großem Kennzeichen; vollständige Preistafel jetzt im Abschnitt
  „Festpreise ohne Überraschungen“ (Leistungsnamen dort `h3`), Preis-Fußnote direkt darunter;
  Ablauf mit Mini-Kennzeichen; Vertrauensleiste auf Weiß.
- **Kopfzeile:** ausgeschriebenes Menü erst ab 1180 px (das neue Logo ist breiter; vorher lief
  die Zeile bei 1024 px über), darunter Menü-Knopf.
- **Alle Unterseiten:** hellgrauer Seitenkopf wie die Startseite; Rechtsseiten bekommen den
  gleichen Kopf (`LegalPage`, nur Gestaltung); alle Hauptschaltflächen in Logo-Blau
  (18 handgebaute Navy-Schaltflächen umgestellt).
- **Leistungsseiten:** Im Kasten „Komplettpreis“ lief „optional zzgl. 29,00 €“ aus dem Kasten
  und überlagerte „Kennzeichenschilder“ – jetzt Umbruch im Kasten.
- **Online-Auftrag:** Auswahlpunkt in Logo-Blau; sonst wie v5 (Liste mit Pfeiltasten,
  Zusammenfassung als Tafel, Eingaben bleiben im offenen Tab erhalten).

## Texte

Auf Wunsch des Betreibers (21.11.2026) steht der Firmenname der Betreibergesellschaft nicht
mehr in den normalen Seiten: Vertrauensleiste und FAQ der Startseite, `lib/faq.ts` (zwei
Antworten), zwei Landingpages, „Über uns“ (Absatz und Zeilen „Unternehmen“, „Handelsregister“),
„Datensicherheit“ (Verweis auf die Datenschutzerklärung), Fußzeile, Zusammenfassung und
Abschluss im Online-Auftrag (Verweis aufs Impressum) sowie `legalName` in den strukturierten
Daten. **Unverändert** und weiter mit vollem Namen, weil gesetzlich nötig: Impressum,
Datenschutzerklärung, Widerrufsbelehrung, Servicebedingungen (`lib/site.ts` → `company`).

## Behobene Fehler (bestanden schon vorher)

- Online-Auftrag: Bei „Bewegung reduzieren“ blieb Schritt 1 leer (Server-Ausgabe mit
  `opacity: 0`, die nie eingeblendet wurde).
- Chat-Vorschau (WhatsApp-Seite): Hydration-Fehler durch unterschiedlichen Startwert.
- WhatsApp-Knöpfe auf WhatsApp- und Maxx-Seite: weiße Schrift auf Grün (Kontrast ≈ 2:1).
- Fokusrahmen: Die globale Regel lag außerhalb einer Ebene und überschrieb Feld-Fokus und
  `outline-none`; jetzt in `@layer base`.
- Upload: zusätzlicher, unbenannter Tab-Stopp am versteckten Dateifeld.
- `lib/order.ts`: „Gesendet“ nur noch bei HTTP 2xx **und** `ok === true` **und**
  Referenznummer; sonst Rückfallebene (WhatsApp/E-Mail).
- Logo: `clipPath`-ID kam doppelt vor, wenn das Logo mehrfach auf der Seite steht.

## Formular-Versand: von `mail()` auf angemeldeten SMTP-Versand (20.11.2026)

**Befund:** Eine echte Testanfrage über das Live-Formular (Referenz `KZP-20261120-35WD`)
wurde von der Website als „eingegangen“ bestätigt, kam aber nie in `info@deutschezulassung.de`
an. Normale E-Mails an diese Adresse kommen an. Laut Betreiber ist über das Formular noch nie
eine Anfrage angekommen. PHP `mail()` meldete Erfolg, die Nachricht ging danach verloren.

**Umbau** (`public/api/auftrag.php`): Versand angemeldet per SMTP (STARTTLS, Port 587) über
den Mailserver des all-inkl-Vertrags (`w0216162.kasserver.com`, Zertifikat `*.kasserver.com`).
„Eingegangen“ nur, wenn der Mailserver die Nachricht nach der Anmeldung mit 250 annimmt.
Ohne Zugangsdaten: ehrlicher Fehler, das Formular bietet WhatsApp und E-Mail an.

**Zugangsdaten** stehen nie im Repository. Der Deploy (Job `deploy-allinkl`) schreibt sie aus
GitHub-Secrets mit `scripts/mail-zugang.mjs` nach `out/api/mail-zugang.php`
(per `.htaccess` gesperrt, in `.gitignore`):

| Secret | Inhalt |
|---|---|
| `SMTP_USER` | Postfach-Adresse, empfohlen ein eigenes Versand-Postfach, z. B. `no-reply@deutschezulassung.de` |
| `SMTP_PASSWORD` | Passwort dieses Postfachs |
| `SMTP_HOST`, `SMTP_PORT` | optional (Standard `w0216162.kasserver.com`, `587`) |

Ist `SMTP_USER` eine E-Mail-Adresse, ist sie zugleich Absender (all-inkl nimmt nach der
Anmeldung nur eigene Adressen an). Empfänger bleibt `RECIPIENT` (`info@deutschezulassung.de`).

**Prüfen nach dem Deploy:**
- `/api/auftrag.php?check=1` → `"mailZugang": true`
- `/api/auftrag.php?check=smtp` → meldet sich an und wieder ab, sendet nichts
- Zustellprotokoll: `formular-protokoll/zustellung-JJJJ-MM.log` in der Kontowurzel (außerhalb
  des Web-Ordners), je Anfrage Zeit, Referenz, Art, Anzahl Dateien und Antwort des Mailservers –
  ohne Namen, Kontaktdaten oder Inhalte.

Lokal getestet mit PHP 8.5 gegen einen Test-Mailserver (STARTTLS, AUTH LOGIN): Anfrage mit Foto
zugestellt (Betreff mit Umlauten, Reply-To, Punkt am Zeilenanfang, Anhang bitgleich), falsches
Passwort und fehlender Zugang → HTTP 500 mit Ausweg, jeweils im Protokoll vermerkt.

## Entfernt

Unbenutzte Bausteine `HeroFlowAnimation`, `PackageCards`, `Testimonials`,
`ProcessAnimation`, `ui/IconTile`; `home/ServiceCards`, `home/ServiceSelector`,
`lib/auswahl.ts`; nicht mehr genutzte Animationen in `globals.css`; die Entwurfsseiten
`app/entwurf/` (nur zur Auswahl).

## Offen

1. **Datenschutzerklärung:** erwähnt keine Speicherung im Browser (neu: Auftragsentwurf in
   `sessionStorage`; schon vorher: Einwilligungsspeicher `kzp-consent-v1`). Nicht geändert –
   Entscheidung/Prüfung durch den Betreiber.
2. **Vollmacht ohne eID:** Ablauf wird nirgends gezeigt (Kritik-Befund); Verfahren laut
   `docs/seo/OWNER-DECISIONS.md` (A1) weiter offen.
3. **Vorschaubilder** nutzen weiter die Schrift Lexend (für Archivo liegt keine TTF-Datei im
   Projekt; die Bilder werden beim Build gerendert, Besucher laden keine Schrift).
4. **Startseite:** Wiederholungen (Preis/Inklusivleistungen, „keine Behörde“) bewusst
   belassen (Entscheidung Betreiber 20.11.2026).
5. **Kontakt-E-Mail** steht noch auf `info@deutschezulassung.de` (siehe `lib/site.ts`).
6. **Logo-Dateien auf der Medien-Platte:** Die Markendateien in hoher Auflösung erzeugt
   `bash scripts/build-logo.sh <Zielordner>`; abzulegen unter
   `/Volumes/Medien/Bilder-Grafiken/Logos/Deutsche-Zulassung/`.
