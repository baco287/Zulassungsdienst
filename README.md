# KFZ-Zulassungsprofis – Website

Moderne, responsive Website für den digitalen Kfz-Zulassungsdienst **KFZ-Zulassungsprofis**
(Projekt „Zulassungsdienst“). Phase 1: professionelle Web-Präsenz mit Online-Auftrag
über reale Kanäle (WhatsApp / E-Mail). Phase 2+: Automatisierung (siehe unten).

## Tech-Stack

- [Next.js 15](https://nextjs.org) (App Router, statischer Export)
- React 19 · TypeScript (strict)
- Tailwind CSS 4 (Design-Tokens in `app/globals.css`)
- framer-motion (Animationen, respektiert `prefers-reduced-motion`)
- lucide-react (Icons)

## Einrichtung & Start

```bash
npm install        # Abhängigkeiten installieren
npm run dev        # Entwicklung: http://localhost:3000
npm run build      # Produktion: statischer Export nach ./out
npm run lint       # ESLint
```

Der Build erzeugt einen **statischen Export** (`out/`), der auf jedem Webspace
(Netlify, Vercel, IONOS, Apache …) gehostet werden kann.

## Projektstruktur

```
app/                  Seiten (App Router)
  page.tsx            Startseite (Hero + Prozess-Animation)
  leistungen/         Übersicht + Detailseiten (aus lib/services.ts generiert)
  preise/             Preisübersicht (getrennt: Arbeitspreis / Gebühren / Kennzeichen)
  ablauf/             Animierte 7-Schritte-Timeline
  auftrag/            Online-Auftrag (Validierung; Versand via WhatsApp/E-Mail)
  faq/                FAQ inkl. FAQPage-JSON-LD
  kontakt/ ueber-uns/ impressum/ datenschutz/ widerruf/
  sitemap.ts robots.ts
components/           UI-Bausteine (Header, Footer, Formulare, Animationen …)
lib/
  services.ts         ⭐ Leistungskatalog – hier Leistungen ergänzen/ändern
  pricing.ts          ⭐ Preise & amtliche Gebühren – hier Preise pflegen
  faq.ts              FAQ-Inhalte
  site.ts             ⭐ Stammdaten (Kontakt, Firma) – [TODO]-Platzhalter füllen!
  integrations/       Schnittstellen-Verträge für Phase 2 (nicht implementiert)
```

## Inhalte pflegen

- **Neue Leistung:** Objekt in `lib/services.ts` ergänzen (eindeutiger `slug`).
  Listen-, Detail-, Preis- und Formularseiten aktualisieren sich automatisch.
- **Preise:** in `lib/services.ts` je Leistung (`price`) bzw. `lib/pricing.ts`
  (amtliche Gebühren). `verified: false` ⇒ UI zeigt „unverbindlich“/„auf Anfrage“.
- **Kontaktdaten/WhatsApp-Nummer:** `lib/site.ts` – **alle `[TODO]`-Felder vor
  Livegang ersetzen** (auch Impressum/Datenschutz/Widerruf prüfen lassen!).

## Bewusste Phase-1-Entscheidungen

- **Keine simulierten Integrationen:** Der Online-Auftrag erzeugt eine strukturierte
  Nachricht und versendet sie über *echte* Kanäle (vorbefülltes WhatsApp/`mailto:`).
  Kein Fake-Backend, keine vorgetäuschten Bestätigungsmails.
- **Rechtsseiten sind gekennzeichnete Entwürfe** mit sichtbarem Platzhalter-Banner.
- **Preise mit `verified: false`** werden sichtbar als unverbindlich markiert
  (Marktorientierung: öffentlich einsehbare Preise etablierter Anbieter, Juli 2026).

## Ausbau zu Phase 2 (Automatisierung)

Vorbereitet in `lib/integrations/` (typisierte Verträge, Details im dortigen README):

1. `output: "export"` aus `next.config.ts` entfernen → Deployment auf Node-Host.
2. `app/api/auftrag/route.ts` implementieren (validiert `OrderRequest` aus `lib/types.ts`).
3. WhatsApp Business API, Transaktionsmails, Online-Bezahlung, Kundenkonto mit
   Auftragsstatus, Terminbuchung, CRM/Adminbereich, Webhooks.
4. DSGVO: AV-Verträge, Löschkonzept, Datenschutzerklärung erweitern.

## Qualität / Checks

- Barrierefreiheit: Skip-Link, sichtbare Fokuszustände, ARIA-Labels,
  `prefers-reduced-motion`-Alternativen für alle Animationen, 44-px-Touchziele.
- SEO: Metadata-API, OpenGraph, Sitemap, robots.txt, LocalBusiness- & FAQ-JSON-LD.
- Formulare: clientseitige Validierung mit verständlichen deutschen Fehlermeldungen,
  DSGVO-Einwilligung als Pflichtfeld.

## Preise ändern (zentrale Preiskonfiguration)

Alle Preise stehen ausschließlich in `config/preise.json`. Startseite, Preisseite,
Preisrechner, Leistungen, Städte, Zulassungsstellen, FAQ, Ratgeber, Rechner,
OG-Bilder und `/llms.txt` lesen ihre Beträge über `lib/pricing.ts` (`P`, `PRICES`).

1. Betrag in `config/preise.json` ändern und `stand` aktualisieren.
2. `freigabe.freigegeben` auf `true` setzen sowie `freigegebenVon` und `freigegebenAm` ausfüllen.
3. `npm run check:preise` – findet vergessene, fest eingetragene Beträge.
4. `npm run build && npm run check:build` – prüft die gebauten Seiten.

Der Produktiv-Deploy (`.github/workflows/deploy.yml`) **bricht ab**, solange
`freigabe.freigegeben` nicht `true` ist oder Altpreise im Build stehen.

## Qualitätsprüfungen

| Befehl | Prüft |
|---|---|
| `npm run check:preise` | Altpreise und fest eingetragene Preise im Quellcode |
| `npm run check:build` | Preise in den gebauten Seiten (`out/`) |
| `node scripts/check-site.mjs` | interne Links, Bilder, Titel, Descriptions, H1, Canonical, JSON-LD, Sitemap |

## Zulassungsstellen und Kennzeichen

Daten in `lib/data/zulassungsstellen.json`, nur aus offiziellen Behördenquellen
mit Quell-URL und Prüfdatum. Rohdaten der Recherche liegen in `docs/recherche/`.
Neu importieren: `npm run import:zulassungsstellen -- docs/recherche/*.json`.
Ausnahmen (widersprüchliche oder unbelegte Angaben) stehen im Importskript.
Kennzeichenseiten entstehen automatisch aus den Kürzeln der veröffentlichten Stellen.

## KI-Kennzeichenassistent

Wunschkennzeichen-Generator unter `/wunschkennzeichen-generator/`: Bezirk wählen, Wünsche nennen,
Vorschläge als Kennzeichen sehen, auswählen und in den Auftrag mitnehmen. Generator und Regelprüfung
laufen im Browser; KI-Ideen kommen über `public/api/kennzeichen-ki.php` (Claude API, mit Budget und
Aus-Schalter). Aufbau, Einrichtung, Regelpflege und offene Punkte: `docs/KENNZEICHEN-ASSISTENT.md`.

| Befehl | Zweck |
|---|---|
| `npm run test:kennzeichen` | Regeln, Generator, Sprachverständnis, Gleichlauf Browser/Server |
| `bash scripts/test-kennzeichen-api.sh` | Server-Endpunkte gegen eine API-Attrappe (nach `npm run build`) |

Regeln stehen in `config/kennzeichen-regeln.json` (mit Quelle je Regel), Limits und der Schalter
„KI pausieren“ im Dashboard unter `/analytics/kennzeichen.php`.

## Domainumzug (November 2026)

Früher „DeutscheZulassung“ unter deutschezulassung.de. Ablauf, Weiterleitungen,
Prüfungen und offene Schritte: `docs/migration/MIGRATION.md`.

| Befehl | Zweck |
|---|---|
| `node scripts/migration.mjs vergleich docs/migration/stand-alt.json.gz` | Build mit dem Stand vor dem Umzug vergleichen |
| `node scripts/check-weiterleitungen.mjs --regeln` | Weiterleitungsregeln prüfen (läuft im Deploy) |
| `bash scripts/weiterleitungen-lokal-testen.sh` | alle Weiterleitungen gegen einen lokalen Apache testen |
| `node scripts/check-weiterleitungen.mjs --live` | nach dem Livegang gegen die echten Domains |
| `bash scripts/build-logo.sh` | Logo-Dateien neu erzeugen |

## Webanalyse

Standardmäßig aus. Einschalten und Datenschutzhinweise: `docs/TRACKING.md`.

## KI-Assistent für E-Mail

Ordnet eingehende E-Mails ein und bereitet Antwort-Entwürfe vor – gesendet wird nur per Klick
im Admin-Bereich (`/assistent/`, gleicher Login wie `/analytics/`). Läuft als PHP auf dem
all-inkl-Webspace (`public/assistent/`), die Bibliotheken stehen in `server/assistent/`.

- Betrieb in einfachen Worten: `docs/ki-assistent/BETRIEB.md`
- Aufbau und Festlegungen: `docs/ki-assistent/BAUPLAN.md`
- Wissensbasis: entsteht beim Build aus den Website-Daten (`app/assistent-wissen.json/route.ts`).
  `scripts/assistent-bauen.mjs` prüft sie gegen `config/preise.json` und die gebauten Seiten;
  im Produktiv-Deploy legt es sie zusammen mit Zugang und Bibliotheken in den gesperrten
  Ordner `assistent/intern/`, im Staging-Build entfernt es den Assistenten.
- Geplanter Abruf alle fünf Minuten: `.github/workflows/assistent-abruf.yml`

| Befehl | Zweck |
|---|---|
| `php tests/assistent/regeln-test.php` | kostenlose Tests ohne Netz und ohne KI (laufen auch im Deploy) |
| `node scripts/assistent-bauen.mjs out` | nach `npm run build`: Wissensbasis prüfen, Assistent aus `out/` entfernen |
| `bash scripts/ki-schluessel-einrichten.sh` | Claude-Schlüssel hinterlegen oder tauschen, danach neu veröffentlichen |

## SEO-Autopilot

Prüft jeden Morgen automatisch die Live-Website (Erreichbarkeit, Indexierung, Titel,
Preise, Marke, Inhalte, FAQ) und zeigt das Ergebnis im SEO Center unter `/seo/` – gleicher
Login wie `/analytics/`. Er liest nur und ändert nichts an der Website. Zeitplan:
`.github/workflows/seo-autopilot.yml`.

Betrieb, Benachrichtigungen, Search-Console-Anbindung und Fehlerfälle:
`docs/SEO-AUTOPILOT.md`. Aufbau und Verträge: `seo-autopilot/README.md`.

| Befehl | Zweck |
|---|---|
| `npm run seo:center` | SEO Center lokal ansehen: http://localhost:3500/seo/ |
| `npm run seo:daily`, `npm run seo:weekly` | Prüflauf vom eigenen Rechner (Ergebnis bleibt lokal in `seo-autopilot/data/`) |
| `npm run seo:test` | Tests des Autopiloten (ohne Netz) |

Prüfdaten (Befunde, Berichte, Search-Console-Zahlen) gehören nie ins Repository.
