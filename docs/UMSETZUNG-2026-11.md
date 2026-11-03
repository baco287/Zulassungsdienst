# Wettbewerbs-Upgrade DeutscheZulassung – Umsetzung November 2026

Stand: 03.11.2026 · Branch `feature/wettbewerb-upgrade` · **nicht live**

Hauptkonkurrent: bundeszulassung24.de. Ziel: DeutscheZulassung technisch, inhaltlich
und bei Google-SEO auf Wettbewerbsniveau bringen. Das Online-Bestellsystem mit
Zahlung (Phase 4) wurde am 03.11.2026 auf Wunsch der Geschäftsführung zurückgestellt.

## 1. Umgesetzte Änderungen

| Phase | Umsetzung |
|---|---|
| 1 Preise | Zentrale Konfiguration `config/preise.json` mit den Zielpreisen. Alle Seiten, OG-Bilder, FAQ, Ratgeber, Städte, Rechner und `/llms.txt` lesen daraus. Preisrechner auf `/preise/` mit Positionen, enthaltener MwSt. und Endpreis. Freigabe-Sperre: Der Live-Deploy bricht ab, solange die Preise nicht freigegeben sind. Wunschkennzeichen-Hinweis: amtliche Gebühr bleibt gesetzlich, Differenz trägt DeutscheZulassung. |
| 2 Startseite | Title „Kfz-Zulassung online ohne eID \| DeutscheZulassung“, H1 „Auto online zulassen – ohne eID und Behördentermin“, großer CTA, Preiskarten aller Vorgänge, Vertrauensbereich (nur echte Bewertungen, derzeit keine), vier Schritte, ehrlicher Vergleich Behörde / i-Kfz selbst / Service, Vorteile ohne eID, häufige Probleme, Städte und Zulassungsstellen, FAQ mit JSON-LD, Kontakt. |
| 3 SEO-Seiten | 6 Landingpages, 39 Zulassungsstellen-Seiten aus geprüften Behördendaten mit Quellen, 42 Kennzeichenseiten. Doppelte Suchintents per 301 auf eine starke Seite geleitet. |
| 4 Bestellsystem | **Zurückgestellt.** Der bestehende Anfrage-Weg (Formular mit Upload, WhatsApp, E-Mail) bleibt. Schalter `NEXT_PUBLIC_CHECKOUT` ist vorbereitet und aus; keine Seite verspricht Online-Zahlung. |
| 5 Vertrauen | Neue Seiten `/datensicherheit/` und `/servicebedingungen/` (Entwurf), „Über uns“ mit „Wer Ihre Zulassung bearbeitet“ und Unternehmensangaben, Hinweis „privater Dienstleister, keine Behörde“ in Footer und auf allen neuen Seiten. Platzhalter-Bewertungen entfernt; Bewertungen erscheinen nur aus `lib/reviews.ts` mit Link zur Originalbewertung. |
| 6 Technisches SEO | Sitemap um alle neuen Seiten erweitert, Canonicals, Brotkrumen auf allen Hauptseiten, eigene 404 per `.htaccess`, Themen-Weiterleitungen, `/llms.txt` aus Daten generiert, Logo-URL im JSON-LD repariert, Bilder als WebP (−33 %), Einblend-Animation ohne JavaScript-Abhängigkeit (Inhalte sofort sichtbar), Kopfzeile ohne Umbruch. |
| 7 Ratgeber | 5 neue Artikel: Fahrzeugpapiere und Sicherheitscodes, Halterwechsel nach Autokauf, Auto verkauft – abmelden?, Wunschkennzeichen reservieren, Fahrzeugzulassung für Unternehmen. Veraltete Behördenlinks und unbelegte Detailangaben in bestehenden Texten korrigiert. |
| 8 Tracking | Cookielose Analyse (Plausible oder Matomo) vorbereitet, standardmäßig aus. Conversion-Ereignisse für Start, Leistungswahl, Schritte, Abbruch, Absenden, Upload, WhatsApp, Telefon, E-Mail. Google Ads nur nach Einwilligung, vorbereitet und inaktiv. Datenschutzerklärung passt sich automatisch an. Details: `docs/TRACKING.md`. |
| 9 Stärken | „Ohne eID“ in der Hauptnavigation, Maxx, Rechner und Vorlagen auf der Ratgeber-Übersicht, Städteseiten verlinken auf ihre Zulassungsstelle und Kennzeichen, neue Ratgeber von den passenden Leistungsseiten verlinkt. |

## 2. Neue URLs (96)

- **Landingpages:** `/kfz-zulassung-ohne-eid/`, `/auto-abmelden-ohne-eid/`, `/ikfz-funktioniert-nicht/`, `/ikfz-fehlermeldung/`, `/auto-online-anmelden/`, `/zulassungsdienst-online/`
- **Ratgeber:** `/ratgeber/fahrzeugpapiere-sicherheitscodes/`, `/ratgeber/halterwechsel-nach-autokauf/`, `/ratgeber/auto-verkauft-abmelden/`, `/ratgeber/wunschkennzeichen-reservieren/`, `/ratgeber/fahrzeugzulassung-unternehmen/`
- **Vertrauen:** `/datensicherheit/`, `/servicebedingungen/`
- **Zulassungsstellen:** `/zulassungsstelle/` und 39 Städte: aachen, augsburg, berlin, bielefeld, bochum, bonn, braunschweig, bremen, chemnitz, dortmund, dresden, duisburg, duesseldorf, erfurt, essen, freiburg, gelsenkirchen, halle, hamburg, hannover, karlsruhe, kassel, kiel, koeln, krefeld, leipzig, luebeck, magdeburg, mainz, mannheim, moenchengladbach, muenchen, muenster, nuernberg, oberhausen, rostock, stuttgart, wiesbaden, wuppertal
- **Kennzeichen:** `/kennzeichen/` und 42 Kürzel: A, AC, B, BI, BN, BO, BS, C, D, DD, DO, DU, E, EF, FR, GE, H, HAL, HB, HH, HL, HOG, HRO, K, KA, KI, KR, KS, L, M, MA, MD, MG, MON, MS, MZ, N, OB, S, W, WI, WOH (URL in Kleinbuchstaben)
- **301-Weiterleitungen (keine eigenen Seiten, gleicher Suchintent):** `/auto-online-zulassen-ohne-eid/` und `/kfz-zulassung-ohne-ausweisapp/` → `/kfz-zulassung-ohne-eid/`; `/online-zulassung-funktioniert-nicht/` → `/ikfz-funktioniert-nicht/`; `/kfz-zulassung-kosten/` → `/ratgeber/was-kostet-eine-kfz-zulassung/`
- **Entfernt:** keine. Alle 87 bisherigen URLs bleiben erhalten.

Nicht veröffentlicht, weil Pflichtangaben auf der Behördenseite fehlten: Zulassungsstelle Frankfurt
(Zuständigkeit nicht belegt). Bewusst nicht übernommen: Kürzel WAT für Bochum (nur Wikipedia),
Zahlungsart-Angaben in Gelsenkirchen und Mannheim (Behördenseiten widersprechen sich),
i-Kfz-Link Düsseldorf (Portal laut Stadt derzeit abgeschaltet, Hinweis steht auf der Seite).

## 3. Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ohne Fehler |
| `npx eslint app components lib` | ohne Fehler |
| `npm run build` | 289 statische Seiten erzeugt |
| `npm run check:preise` / `check:build` | bestanden, keine Altpreise in Code und Build, alle Zielpreise auf Start- und Preisseite sichtbar |
| `node scripts/check-site.mjs` | bestanden: keine toten internen Links oder Bilder, je Seite eine H1, Canonical korrekt, JSON-LD gültig, Sitemap vollständig |
| Preisrechner im Browser | 127,89 + 28,79 = 156,68 €; mit Wunschkennzeichen 168,37 €; Abmeldung 33,79 € ohne Schilder-Optionen |
| Darstellung | Desktop 1024 px und Handy 375 px ohne horizontales Scrollen, keine Konsolenfehler |
| Unabhängige Prüfung (4 Prüfer + Gegenprüfung) | siehe Abschnitt 6 |

Nicht geprüft: Ladezeit-Messung (PageSpeed-Kontingent war erschöpft), echte Weiterleitungen und
404 auf dem all-inkl-Server (nur dort wirksam), Analyse und Google Ads (bewusst ausgeschaltet).

## 4. Offene Freigaben und Klärungen

1. **Preisfreigabe:** In `config/preise.json` `freigabe.freigegeben` auf `true` setzen, erst dann geht der Live-Deploy durch. Vorher Wirtschaftlichkeit prüfen, besonders Wunschkennzeichen (11,69 € unter der amtlichen Gebühr von 12,80 €) und Adressänderung (63,79 € inkl. Gebühr und Versand).
2. **Kennzeichenschilder:** Die Bilderanleitung sagt, ihr versendet keine Schilder (Kunde geht zum Schildermacher). Preise und Startseite bieten Schilder für 28,79 € mit Versand an. Bitte festlegen, was gilt.
3. **Steuer und Rechnung:** Die MwSt. im Preisrechner ist auf den Gesamtbetrag gerechnet. Ob amtliche Gebühren als durchlaufender Posten ohne MwSt. auszuweisen sind, sollte die Steuerberatung klären. Die USt-IdNr. ist laut Impressum noch beantragt.
4. **Rechtliche Prüfung:** Servicebedingungen (Entwurf), Datensicherheit, Datenschutz-Abschnitt für Analyse und Ads vor Aktivierung.
5. **Ablauf-Aussagen:** „Über uns“ spricht von der behördlichen i-Kfz-Schnittstelle. Laut Hamburg sind Vorgänge per Vollmacht dort nicht online möglich. Bitte die Formulierung an euren echten Einreichungsweg anpassen.
6. **Bild:** `sicherheitscode-zb1` zeigt Freirubbeln mit einer Münze; laut BMV wird das Siegel abgezogen. Texte sind korrigiert, das Bild sollte ersetzt werden.
7. **Vorläufiger Zulassungsnachweis:** BMV nennt 10 Tage, KBA 14 Tage. Texte nennen deshalb keine Zahl mehr.
8. **Amtliche Gebührenspannen** in `config/preise.json` sind Orientierungswerte. Berlin nennt für Umschreibungen am Schalter ab 19,60 €; bitte gegen die GebOSt prüfen.
9. **Bewertungen:** Google-Unternehmensprofil anlegen, echte Bewertungen in `lib/reviews.ts` eintragen, `NEXT_PUBLIC_GOOGLE_REVIEW_URL` setzen. Bewertungsanfragen per E-Mail nur mit Einwilligung (UWG).
10. **Zugangsdaten für später:** Plausible- oder Matomo-Zugang, Google-Ads-Konto und Conversion-Labels; für das zurückgestellte Bestellsystem Datenbank bei all-inkl und Stripe-Schlüssel.
11. **Lokales PHP:** Für die zunächst geplanten Backend-Tests wurde PHP 8.2 per winget installiert. Entfernen mit `winget uninstall PHP.PHP.8.2`.

## 5. Nächste technische SEO-Prioritäten

1. Google Search Console: Sitemap neu einreichen, Indexierung der neuen Seiten beobachten.
2. Google-Unternehmensprofil und erste echte Bewertungen – größter Vertrauenshebel gegenüber dem Wettbewerb.
3. Zulassungsstellen schrittweise auf alle rund 400 Behörden ausbauen (Importskript und Regeln stehen), Frankfurt nachrecherchieren.
4. Ladezeit messen (PageSpeed) und HTTP/2 bzw. Caching beim Hoster prüfen.
5. Titel bestehender Ratgeber auf höchstens 60 Zeichen kürzen.
6. Backlinks aufbauen: Autohäuser, Branchenverzeichnisse, lokale Presse.
7. Danach das Online-Bestellsystem mit Zahlung wieder aufnehmen.

## 6. Unabhängige Prüfung

Vier Prüfer mit getrennten Blickwinkeln (Fakten, Preise und Recht, technisches SEO,
Code) und je ein Gegenprüfer, der jeden Befund zu widerlegen versuchte.
Ergebnis: **33 Befunde bestätigt, 7 verworfen.** Alle bestätigten Befunde sind behoben
(Commit „Befunde der unabhängigen Prüfung behoben“). Die wichtigsten:

| Befund | Behebung |
|---|---|
| Google-Beschreibung der Zulassungsstellen nannte „Zulassung ab 33,79 €“ (Abmeldepreis) | Zulassungspreis 127,89 € |
| Startseite versprach, den Auftragsstand „jederzeit“ zu sehen | Satz ersetzt, kein Status-Versprechen ohne Bestellsystem |
| Amtliche Gebührenspannen passten nicht zu den eigenen Behördendaten | Spannen an belegte Werte angepasst, Abmeldung online und Schalter getrennt, Kosten-Ratgeber rechnet aus der Konfiguration |
| Wunschkennzeichen wirkte wie eigener Komplettpreis bzw. wie 12,80 € + 11,69 € | überall als Zusatzleistung mit klarem Hinweis |
| Preisbox der Adressänderung nannte „Kennzeichen inklusive“ | Preisbox liest nur noch, was laut Konfiguration gilt |
| Ausgewiesene MwSt.-Summe enthielt amtliche Gebühren | nur noch „inkl. 19 % MwSt.“ bis zur steuerlichen Klärung |
| Servicebedingungen als Entwurf öffentlich | noindex, nicht verlinkt, Schalter in lib/features.ts |
| E/H-Kennzeichen: max. 8 statt 7 Stellen; eVB bei Ummeldung; Originale bei Verschrottung | fachlich korrigiert (FZV Anlage 4, § 24) |
| Einblend-Animation konnte Inhalte vor dem Laden verbergen | Inhalte immer sichtbar, Animation nur unterhalb des ersten Bildschirms, Scroll-Absicherung |
| og:url zeigte auf 166 Seiten auf die Startseite | Open Graph je Seite, Prüfskript gleicht og:url mit Canonical ab |
| Deploy-Fehlerlog wäre bei gesperrten Preisen abgestürzt | Gate mit pipefail, Fehlerlog robust |

Verworfen wurden u. a. die Einschätzung, Kennzeichenseiten seien Thin Content (Strategiefrage,
jede Seite hat eigene belegte Angaben), und eine angebliche Keyword-Kannibalisierung zwischen
Startseite und Landingpage (unterschiedlicher Suchintent).
