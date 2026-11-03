# Google-Einrichtung für deutschezulassung.de

Stand: 03.11.2026. Diese Schritte erledigt die Geschäftsführung selbst im eigenen
Google-Konto (Anmeldungen und Kontoeinstellungen nimmt niemand stellvertretend vor).

## 1. Google Search Console (Pflicht, ca. 15 Minuten)

Ziel: Google sieht alle neuen Seiten, und ihr seht, für welche Suchbegriffe ihr erscheint.

1. https://search.google.com/search-console öffnen und mit dem Google-Konto anmelden, das dauerhaft für die Firma genutzt wird.
2. **Property hinzufügen** → „URL-Präfix“ → `https://deutschezulassung.de/`.
3. **Bestätigen:**
   - Die Datei `google6005d05511276b1a.html` liegt bereits live auf der Website. Gehört sie zu eurem Konto, ist die Property sofort bestätigt.
   - Zeigt Google einen anderen Dateinamen an: Datei herunterladen und in `public/` des Repos legen (oder mir den Namen nennen), dann deployen und auf „Bestätigen“ klicken.
   - Alternative ohne Code: Methode „DNS-Eintrag“ wählen und den TXT-Eintrag im all-inkl-KAS unter *Domain → DNS-Einstellungen* anlegen. Damit lässt sich auch die bessere „Domain-Property“ (`deutschezulassung.de`, inkl. www) nutzen.
4. **Sitemap einreichen:** links „Sitemaps“ → `sitemap.xml` eintragen → „Senden“.
5. **Nach dem Live-Deploy** des Upgrade-Branches: oben in die Suchleiste nacheinander diese URLs eingeben und „Indexierung beantragen“ klicken:
   - `https://deutschezulassung.de/`
   - `https://deutschezulassung.de/kfz-zulassung-ohne-eid/`
   - `https://deutschezulassung.de/ikfz-funktioniert-nicht/`
   - `https://deutschezulassung.de/auto-abmelden-ohne-eid/`
   - `https://deutschezulassung.de/zulassungsstelle/`
   - `https://deutschezulassung.de/kennzeichen/`
   - `https://deutschezulassung.de/preise/`
6. Nach 3–7 Tagen prüfen: „Seiten“ (wie viele indexiert?), „Leistung“ (Suchbegriffe), „Core Web Vitals“, „Verbesserungen“ (Brotkrumen, FAQ).

**Bing gleich mit erledigen:** https://www.bing.com/webmasters → „Aus Google Search Console importieren“. Bing beliefert auch ChatGPT-Suche und Copilot.

## 2. Google-Unternehmensprofil (für Bewertungen und Karten)

**Wichtig vorab – Eignung:** Google erlaubt ein Profil nur, wenn das Unternehmen Kundinnen und Kunden persönlich bedient – entweder an einer Adresse während der Öffnungszeiten oder als Unternehmen mit Einzugsgebiet, das zu den Kunden fährt. Reine Online-Anbieter sind ausgeschlossen. Passend wäre für euch das **Einzugsgebiet-Profil** über den regionalen Abhol- und Bringservice (siehe Leistung „Abhol- & Bringservice“), mit **ausgeblendeter Adresse**. Bietet ihr keinen persönlichen Kontakt an, lieber kein Profil anlegen (Sperrgefahr) und Bewertungen über ProvenExpert oder Trustpilot sammeln.

Einrichtung: https://business.google.com → „Unternehmen hinzufügen“.

| Feld | Vorschlag |
|---|---|
| Name | DeutscheZulassung (ohne Zusätze wie „Kfz-Zulassung online günstig“ – das verstößt gegen die Richtlinien) |
| Kategorie | eine private Dienstleister-Kategorie rund um Kfz-Zulassung bzw. Zulassungsservice; **nicht** „Zulassungsstelle“ (das wäre die Behörde) |
| Adresse | Pappelallee 64, 10437 Berlin – **für Kunden ausblenden** |
| Einzugsgebiet | die Orte, in denen ihr tatsächlich abholt und bringt |
| Öffnungszeiten | Mo–Fr 8:00–18:00 |
| Telefon | 0179 152 82 05 |
| Website | https://deutschezulassung.de/ |
| Termin-/Auftragslink | https://deutschezulassung.de/auftrag/ |

**Beschreibung (max. 750 Zeichen, fertig zum Einfügen):**

> DeutscheZulassung ist ein privater Kfz-Zulassungsdienst – keine Behörde. Wir übernehmen Neuzulassung, Ummeldung, Umschreibung nach dem Autokauf, Wiederzulassung, Abmeldung, Adressänderung und Wunschkennzeichen für Privatkunden, Autohäuser und Fuhrparks. Sie brauchen weder eine eID noch einen Behördentermin: Unterlagen fotografieren, online oder per WhatsApp beauftragen, Vollmacht erteilen – wir reichen den Antrag bei der zuständigen Zulassungsbehörde ein. Vor dem Start erhalten Sie eine verbindliche Festpreis-Bestätigung inklusive amtlicher Gebühren. Persönliche Ansprechperson Mo–Fr 8–18 Uhr. Ein Angebot der Volt Gas UG (haftungsbeschränkt), Berlin.

**Leistungen:** Neuzulassung, Ummeldung, Umschreibung/Halterwechsel, Wiederzulassung, Abmeldung, Adressänderung, Wunschkennzeichen, Kennzeichenschilder, Zulassungsservice für Autohäuser. Preise erst eintragen, wenn sie in `config/preise.json` freigegeben sind – und bei jeder Preisänderung hier mit anpassen.

Die Bestätigung erfolgt meist per Video oder Postkarte. Danach:

1. Unter „Rezensionen erhalten“ den Bewertungslink kopieren.
2. Den Link als `NEXT_PUBLIC_GOOGLE_REVIEW_URL` hinterlegen (Build-Variable) und echte Bewertungen in `lib/reviews.ts` eintragen – die Website zeigt dann automatisch Sterne und Stimmen.
3. Kunden nach Abschluss persönlich (WhatsApp, Telefon) um eine Bewertung bitten. Per E-Mail nur mit vorheriger Einwilligung (UWG). Keine Gegenleistung für Bewertungen anbieten.

## 3. Später (nicht jetzt)

- **Google Ads:** Conversion-Tracking ist vorbereitet (`docs/TRACKING.md`), aber aus. Kampagnen nur nach eigener Freigabe von Budget und Suchbegriffen.
- **Webanalyse:** Plausible oder Matomo einschalten (`docs/TRACKING.md`).
