# Premium-Redesign DeutscheZulassung – November 2026

Stand: 11.11.2026 · Branch `redesign/premium` (abgezweigt von `seo/sprint-1`) · **nicht veröffentlicht**

Ein Push auf `main` löst den Live-Deploy aus. Dieser Branch wurde deshalb weder
nach `main` gemergt noch gepusht. Die Freigabe-Blocker aus
`docs/seo/OWNER-DECISIONS.md` (A1–A6) gelten unverändert auch für diesen Branch,
weil er auf `seo/sprint-1` aufbaut.

## 1. Bestandsaufnahme

| Bereich | Befund |
|---|---|
| Technik | Next.js 15 (App Router), React 19, Tailwind CSS 4, statischer Export (`output: "export"`), Auslieferung über all-inkl per FTPS |
| Server | Einziger Server-Code: `public/api/auftrag.php` (Anfrage und Upload per E-Mail an `info@`). Unverändert. |
| Umfang | 1.321 erzeugte Seiten: Startseite, 13 Leistungen, Preise, Ablauf, 40 Stadtseiten, 404 Zulassungsstellen, 709 Kennzeichen, Ratgeber, Rechner, Vorlagen, Rechtsseiten |
| Datenquellen | Preise `config/preise.json`, Zeiten und Abwicklung `config/betrieb.json`, Betreiber `lib/site.ts`. Drei Prüfskripte verhindern fest eingetragene Preise und Zeiten. |
| Zahlung | Keine Integration vorhanden. Bezahlt wird per Überweisung nach Festpreis-Bestätigung. |
| Design vorher | Navy/Gold mit Lexend und Source Sans. Farben nur über die Skalen `brand-*`, `accent-*`, `ink-*` – das machte die Umstellung der Unterseiten über Tokens möglich. |

## 2. Designsystem v4

Definiert in `app/globals.css`.

| Rolle | Wert | Verwendung |
|---|---|---|
| Navy | `#0B1F3A` | Überschriften, dunkle Flächen, Footer |
| Action Blue (`brand-600`) | `#2563EB` | Schaltflächen, Links, Auswahlzustände |
| Türkis (`accent-500`) | `#14B8A6` | Akzente, Häkchen, Fortschritt |
| Canvas (`ink-50`) | `#F4F7FB` | Seitenhintergrund |
| Text (`ink-900`) | `#111827` | Fließtext |
| Sekundärtext (`ink-500`) | `#5B6B80` | statt `#64748B`, weil dieser auf Canvas nur 4,4:1 erreicht |
| Rahmen (`ink-200`) | `#E2E8F0` | Karten, Trennlinien |

Schriften: Manrope (Überschriften) und Inter (Fließtext) über `next/font`. Die
Dateien werden beim Build geladen und vom eigenen Server ausgeliefert. Im
ausgelieferten HTML gibt es keinen Aufruf von Google.

Bausteine als Klassen in der CSS-Ebene `components`: `.btn` mit Varianten,
`.card`, `.eyebrow`, `.field`, `.container-page`. React-Bausteine in
`components/ui/`: `SectionHeading`, `IconTile`. Eine Seitenbreite von 1280 px
gilt für Kopfzeile, Startseite und alle Unterseiten.

Bewegung: Übergänge 150–220 ms. `prefers-reduced-motion` schaltet Animationen ab.

## 3. Was geändert wurde

### Startseite (`app/page.tsx`, `components/home/`, Texte in `lib/homepage.ts`)

1. Hero mit H1 „Auto online anmelden, ummelden oder abmelden.“, drei Vorteilen,
   zwei Schaltflächen und der interaktiven Leistungsauswahl. „Jetzt starten“
   öffnet `/auftrag/?leistung=<slug>` mit vorausgewählter Leistung.
2. Vertrauensbereich mit fünf belegbaren Eigenschaften und Betreiberangabe.
   Keine Sterne, Siegel oder Kennzahlen.
3. Sechs Leistungskarten (3 / 2 / 1 Spalten).
4. Ablauf 01–04.
5. „Keine eID? Kein Problem.“ mit zwei Vergleichskarten (i-Kfz selbst / mit
   Vollmacht) und Fairness-Hinweis.
6. Preise mit getrennten Angaben zu Inklusivleistungen, Behördengebühren,
   Versand, Zusatzleistungen und Sonderfällen.
7. Datensicherheit, FAQ mit sieben Fragen und `FAQPage`-Markup, Abschluss-CTA.

### Kopf- und Fußzeile

- Navigation: Leistungen (Menü mit sechs Leistungen und Preisen), Preise,
  So funktioniert’s, Standorte, Ratgeber, Kontakt. Rechts WhatsApp und
  „Jetzt Zulassung starten“.
- Mobiles Menü mit Leistungen, allen Seiten, Telefon und E-Mail. Escape
  schließt, der Fokus kehrt zurück, die Seite dahinter scrollt nicht mit.
- Fußzeile mit Leistungen, Service, Ratgeber, Standorten, Kontakt,
  Betreiberangaben und Rechtlichem.

### Auftragsassistent (`components/AuftragForm.tsx`, `app/auftrag/page.tsx`)

- Vier Schritte: Service wählen → Ihre Angaben → Unterlagen → Abschließen
  (vorher Leistung, Details, Kontakt, Unterlagen).
- Preiszusammenfassung mit Positionen und Gesamtbetrag aus
  `calculateOrderPrice()`: am Desktop als feste Seitenleiste, am Handy im Fluss.
- Neu: Kennzeichenschilder und Wunschkennzeichen-Service als Ankreuzfelder. Sie
  werden als Zeilen an die Anmerkung angehängt. `auftrag.php` bleibt unverändert.
- Fehlermeldungen direkt am Feld, der Fokus springt auf das erste fehlerhafte Feld.
- Prüfübersicht mit „Ändern“ je Abschnitt. Eingaben bleiben beim Zurückgehen erhalten.
- Übermittlung, Referenznummer, WhatsApp-Weiterleitung, Rückfallebene und alle
  Analyse-Ereignisse sind unverändert.

### Übrige Seiten

Die Unterseiten übernehmen das Design über die Tokens: Farben, Schriften,
Schaltflächen, Fokusrahmen. Zusätzlich angepasst: `CTASection`, `FaqAccordion`,
`ServiceCard`, `LegalPage`, `DocumentUpload`, Formularfelder in Rechnern,
Unterlagen-Upload und Zulassungsstellen-Suche.

### Zahlung

`lib/payment.ts` und `components/checkout/PaymentMethods.tsx` bereiten Mollie
vor. Ohne die beiden Schalter erscheint keine Online-Zahlungsart. Details:
`docs/CHECKOUT-MOLLIE.md`.

## 4. SEO

| Punkt | Stand |
|---|---|
| URLs und Slugs | unverändert, keine Seite entfernt |
| Startseite | Title unverändert, H1 neu, Description neu (156 Zeichen), Canonical und `index, follow` unverändert |
| Überschriften | eine H1 je Seite (alle 1.220 geprüften Seiten), H2/H3 in logischer Folge |
| Interne Links | Leistungsmenü steht immer im HTML. Fußzeile verlinkt zusätzlich sieben Stadtseiten, die laut Index-Gate belegt sind. |
| Sitemap, robots, Canonicals, JSON-LD | durch `scripts/check-site.mjs` geprüft, bestanden |
| Entfallen auf der Startseite | Dreier-Vergleichstabelle (Schalter / i-Kfz / Service). Sie bleibt auf den Landingpages über `ComparisonTable` erhalten. |

## 5. Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ohne Fehler |
| `npx eslint app components lib` | ohne Fehler |
| `npm run build` | 1.321 Seiten |
| `check-preise.mjs --out` | bestanden |
| `check-daten.mjs --out` | bestanden |
| `check-site.mjs` | bestanden (Links, H1, Canonical, JSON-LD, Sitemap) |
| Breiten 375, 390, 768, 1024, 1280, 1440, 1600 px | kein horizontales Scrollen auf 32 geprüften Seiten (Startseite und Auftrag in allen sieben Breiten, die übrigen in zwei bis sechs) |
| Konsole | keine Fehler auf Startseite, Auftrag, Stadtseite |
| Auftragsassistent | alle vier Schritte, Validierung, Preis 128 + 29 = 157 €, Absenden mit simulierter Server-Antwort, Rückfallebene |
| Tastatur | Leistungsauswahl mit Pfeiltasten, Menüs mit Escape |

Nicht geprüft: echte Zustellung über `auftrag.php` (lokal läuft kein PHP),
Ladezeit-Messung mit PageSpeed, Darstellung auf echten Geräten.

Behoben, obwohl schon vorher vorhanden: waagerechter Scrollbalken auf `/ablauf/`
(seitlich einfahrende Karten) und auf `/datenschutz/` (lange Wörter am Handy).

## 6. Offene Punkte

1. **Veröffentlichung:** Reihenfolge festlegen – erst `seo/sprint-1` mit den
   Blockern A1–A6, dann dieser Branch, oder beides zusammen.
2. **„Ohne eID“ (A1):** Die Aussage steht überall mit dem Zusatz zur einmaligen
   digitalen Identitätsbestätigung. Welches Verfahren es ist, ist weiter offen.
3. **Neuzulassung (A2):** wird weiter mit Preis angeboten. Die Tariffrage ist offen.
4. **Kennzeichenschilder (A5):** Die Option im Auftragsassistenten folgt dem
   bestehenden Preisrechner. Ob Schilder versendet werden, ist weiter offen.
5. **Logo:** unverändert. Das Entwurfsbild zeigt ein anderes Logo. Dafür fehlt
   eine Vektordatei. Die rechtliche Frage zu den Nationalfarben (B12) ist offen.
6. **Schriften im Build:** `next/font` lädt die Schriften beim Build von Google.
   Ein Build ist einmal an einem Netzwerkfehler gescheitert und lief beim
   zweiten Versuch durch. Abhilfe: Schriftdateien ins Repository legen und
   `next/font/local` verwenden.
7. **OG-Bilder:** nutzen weiter Lexend und die alte Farbgebung (`lib/og.tsx`).
8. **Nicht mehr verwendete Komponenten:** `HeroFlowAnimation`, `PackageCards`,
   `Testimonials`, `ProcessAnimation` werden von keiner Seite eingebunden.
   Nicht gelöscht.
9. **Zahlung:** siehe `docs/CHECKOUT-MOLLIE.md`, Abschnitt „Benötigte Entscheidungen“.
