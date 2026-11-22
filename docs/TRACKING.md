# Webanalyse und Conversion-Tracking

## 0. Eigene Webanalyse (seit 22.11.2026, aktiv)

Dasselbe System wie bei Volt-Gas (Tarifrechner: `js/tracking.js` → `/vg/track` →
`analytics.html`), nachgebaut für den PHP-Webspace bei all-inkl. Keine externen Dienste,
keine Cookies, kein Banner.

**Dashboard:** https://kfz-zulassungsprofis.de/analytics/ (Login, siehe unten)
mit Übersicht, Conversion-Funnel, Auftrags-Assistent, Besucher & Kampagnen,
Kontakte & Anfragen und Berichten (Zeitraumvergleich, Kundenwege, Seiten,
Leistungen, Skriptfehler, CSV-/JSON-Export).

| Teil | Datei |
|---|---|
| Erfassung im Browser | `lib/eigeneAnalyse.ts` (eingebunden über `components/Analytics.tsx` und `track()` in `lib/analytics.ts`) |
| Annahme auf dem Server | `public/api/track.php` (Origin-Prüfung, Bot-Filter, 120 Ereignisse/Min. je Anschluss) |
| Gemeinsame Regeln | `public/api/analytics-lib.php` (Ereignisliste, Funnel-Stufen, Speicher, Login) |
| Server-Bestätigung | `public/api/auftrag.php` → `order_confirmed_server` / `order_failed_server` nach Antwort des Mailservers |
| Dashboard | `public/analytics/index.php` + `dashboard.html`, Daten aus `public/analytics/daten.php` |
| Login beim Deploy | `scripts/analytics-zugang.mjs` (GitHub-Secrets `ANALYTICS_USER`, `ANALYTICS_PASSWORD`) |

**Einrichtung (einmalig):** In GitHub → Settings → Secrets and variables → Actions die
Secrets `ANALYTICS_USER` und `ANALYTICS_PASSWORD` (mind. 10 Zeichen) anlegen. Beim
nächsten Deploy schreibt der Workflow daraus `api/analytics-zugang.php`. Ohne Secrets
werden Besuche trotzdem erfasst, das Dashboard meldet nur „Zugang nicht eingerichtet“.
Prüfen, ob der Server speichern kann: `https://kfz-zulassungsprofis.de/api/track.php?check`
→ `{"sqlite":true,"speicher":true}`.

**Speicher:** SQLite-Datei `analytics-daten/analytics.sqlite` in der Kontowurzel des
Webspace, also neben dem Domain-Ordner wie `formular-protokoll/`. Der Deploy
(`lftp mirror --delete`) fasst sie nicht an; per URL ist sie nicht erreichbar. Keine
MySQL-Datenbank im KAS nötig. Ereignisse älter als 760 Tage werden automatisch gelöscht.

**Funnel-Stufen** (eine Session zählt mit ihrer höchsten Stufe):
1 Website besucht · 2 Preise angesehen (`price_box_view`) · 3 Interesse (`cta_click`,
`service_selected`, `tool_used`) · 4 Auftragsseite geöffnet · 5 Assistent begonnen ·
6 letzter Schritt · 7 Absenden geklickt · 8 Auftrag gesendet. Maßgeblich für
„Aufträge zugestellt“ ist die Server-Bestätigung, nicht das Browser-Ereignis.
WhatsApp-, Telefon- und Mail-Klicks zählt das Dashboard getrennt als Kontakte.

**Unterschiede zu Volt-Gas (bewusst):**
- Sitzungskennung nur im Arbeitsspeicher des Tabs, nicht im `sessionStorage`, und kein
  90-Tage-Herkunftscookie (`vg_attr`). Damit wird nichts auf dem Gerät gespeichert.
  Folge: Ein Neuladen der Seite beginnt eine neue Sitzung, und die Herkunft gilt nur für
  den jeweiligen Besuch (kein „First Touch“ über mehrere Tage).
- Keine IP-Adressen in der Datenbank (Volt-Gas: gesalzener Hash); für die Drosselung nur
  ein HMAC je Minute, der nach zwei Minuten gelöscht wird.
- Keine Referenznummern in der Analyse (Volt-Gas speichert die Auftragsnummer).
- Speicher SQLite statt MariaDB, weil die Website statisch auf all-inkl läuft.

**Schalter:** im Produktions-Build an, in der GitHub-Pages-Vorschau und bei `npm run dev`
aus. `NEXT_PUBLIC_EIGENE_ANALYSE=0` schaltet ab, `=1` erzwingt (lokale Tests).

**Lokal testen:** `NEXT_PUBLIC_EIGENE_ANALYSE=1 npm run build`, dann
`KZP_ANALYTICS_DIR=/tmp/kzp-analyse php -S localhost:8080 -t out` und eine Datei
`out/api/analytics-zugang.php` mit `<?php return ['user' => '…', 'pass' => '…'];` anlegen.

Die Datenschutzerklärung (Abschnitt 2a) beschreibt die Messung automatisch, solange sie
aktiv ist. Vor dem Livegang trotzdem rechtlich prüfen lassen.

---

Stand der folgenden Abschnitte: 03.11.2026. Plausible, Matomo und Google Ads sind
weiterhin **aus** und werden per Umgebungsvariablen beim Build eingeschaltet
(GitHub → Settings → Secrets and variables → Actions → Variables, dann im Workflow an den
Build-Schritt durchreichen).

## 1. Cookielose Reichweitenmessung (optional, zusätzlich)

| Variante | Variablen | Einwilligung nötig? |
|---|---|---|
| Plausible (Cloud, EU) | `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=kfz-zulassungsprofis.de` | nein (keine Cookies) |
| Matomo selbst gehostet auf all-inkl | `NEXT_PUBLIC_ANALYTICS_PROVIDER=matomo`, `NEXT_PUBLIC_MATOMO_URL=https://kfz-zulassungsprofis.de/matomo/`, `NEXT_PUBLIC_MATOMO_SITE_ID=1` | nein (Modus `disableCookies`) |

Die Datenschutzerklärung zeigt den passenden Abschnitt automatisch an
(`app/datenschutz/page.tsx`, Abschnitt 2a). Vor dem Einschalten trotzdem
rechtlich prüfen lassen.

**CSP anpassen** (`public/.htaccess`): bei Plausible-Cloud `https://plausible.io`
in `script-src` und `connect-src` ergänzen. Bei Matomo auf der eigenen Domain
ist keine Änderung nötig.

## 2. Google Ads Conversion-Tracking (vorbereitet, inaktiv)

Variablen: `NEXT_PUBLIC_GADS_ID=AW-…` und `NEXT_PUBLIC_GADS_LABEL_ORDER=…` (Conversion-Label „Anfrage gesendet“ aus dem Google-Ads-Konto).

- Lädt **nur nach Einwilligung** im Banner (`components/Analytics.tsx`).
- Ablehnen ist gleichwertig zum Zustimmen gestaltet.
- Widerruf über den Button in der Datenschutzerklärung.
- CSP: `https://www.googletagmanager.com` in `script-src`,
  `https://www.google.com https://googleads.g.doubleclick.net https://www.googleadservices.com`
  in `connect-src` und `img-src` ergänzen.
- **Keine Kampagne wird dadurch gestartet.** Kampagnen und Budgets nur nach
  ausdrücklicher Freigabe der Geschäftsführung.

## 3. Erfasste Ereignisse

| Ereignis | Auslöser | Eigenschaften |
|---|---|---|
| `cta_click` | Klick auf „Jetzt Fahrzeug zulassen“ u. ä. | `position`, `page`, `service` |
| `whatsapp_click` | Klick auf einen WhatsApp-Button | `position`, `page` |
| `phone_click`, `email_click` | Klick auf Telefon/E-Mail | `position` |
| `order_start` | erste Interaktion im Anfrage-Assistenten | `service` |
| `service_selected` | Leistung gewählt (Formular, Deeplink, Preisrechner, Kennzeichen-Auswahl der Startseite `hero_schild`) | `service`, `position` |
| `order_step` | nächster Schritt im Assistenten | `step`, `service` |
| `order_abandon` | Seite verlassen, nachdem der Assistent begonnen wurde | `step` |
| `order_submitted` | Anfrage erfolgreich übermittelt | `service`, `method` |
| `documents_uploaded` | Unterlagen nachgereicht | `method` |

**Datenschutz:** `lib/analytics.ts` lässt nur die Schlüssel `position`,
`service`, `step`, `value`, `method`, `page` durch und verwirft Werte, die wie
E-Mail-Adressen, lange Ziffernfolgen (Telefon, IBAN) oder eine FIN aussehen.
Namen, Kontakt-, Fahrzeug- und Ausweisdaten gelangen nie in die Analyse.
