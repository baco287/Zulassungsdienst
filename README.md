# DeutscheZulassung – Website

Moderne, responsive Website für den digitalen Kfz-Zulassungsdienst **DeutscheZulassung**
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

## Webanalyse

Standardmäßig aus. Einschalten und Datenschutzhinweise: `docs/TRACKING.md`.
