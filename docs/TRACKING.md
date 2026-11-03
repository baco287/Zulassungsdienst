# Webanalyse und Conversion-Tracking

Stand: 03.11.2026. Im Auslieferungszustand ist **alles aus**: keine Cookies,
keine Analyse, kein Banner. Eingeschaltet wird per Umgebungsvariablen beim
Build (GitHub → Settings → Secrets and variables → Actions → Variables, dann im
Workflow an den Build-Schritt durchreichen).

## 1. Cookielose Reichweitenmessung (empfohlen)

| Variante | Variablen | Einwilligung nötig? |
|---|---|---|
| Plausible (Cloud, EU) | `NEXT_PUBLIC_ANALYTICS_PROVIDER=plausible`, `NEXT_PUBLIC_PLAUSIBLE_DOMAIN=deutschezulassung.de` | nein (keine Cookies) |
| Matomo selbst gehostet auf all-inkl | `NEXT_PUBLIC_ANALYTICS_PROVIDER=matomo`, `NEXT_PUBLIC_MATOMO_URL=https://deutschezulassung.de/matomo/`, `NEXT_PUBLIC_MATOMO_SITE_ID=1` | nein (Modus `disableCookies`) |

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
| `service_selected` | Leistung gewählt (Formular, Deeplink, Preisrechner) | `service`, `position` |
| `order_step` | nächster Schritt im Assistenten | `step`, `service` |
| `order_abandon` | Seite verlassen, nachdem der Assistent begonnen wurde | `step` |
| `order_submitted` | Anfrage erfolgreich übermittelt | `service`, `method` |
| `documents_uploaded` | Unterlagen nachgereicht | `method` |

**Datenschutz:** `lib/analytics.ts` lässt nur die Schlüssel `position`,
`service`, `step`, `value`, `method`, `page` durch und verwirft Werte, die wie
E-Mail-Adressen, lange Ziffernfolgen (Telefon, IBAN) oder eine FIN aussehen.
Namen, Kontakt-, Fahrzeug- und Ausweisdaten gelangen nie in die Analyse.
