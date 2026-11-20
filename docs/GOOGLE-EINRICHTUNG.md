# Google-Einrichtung für kfz-zulassungsprofis.de

Stand: 20.11.2026 (Abschnitt 1 für den Domainumzug neu, Rest vom 03.11.2026). Diese Schritte erledigt die Geschäftsführung selbst im eigenen
Google-Konto (Anmeldungen und Kontoeinstellungen nimmt niemand stellvertretend vor).

## 1. Google Search Console: Umzug auf kfz-zulassungsprofis.de

Erst ausführen, wenn die neue Website live ist und die alte Domain weiterleitet
(`docs/migration/MIGRATION.md`, Abschnitt 4). Reihenfolge einhalten.

1. **Neue Domain bestätigen.** https://search.google.com/search-console →
   „Property hinzufügen“ → am besten **Domain-Property** `kfz-zulassungsprofis.de`
   (deckt http/https und www ab). Google zeigt einen TXT-Eintrag; diesen im
   all-inkl-KAS unter *Domain → DNS-Einstellungen* anlegen und bestätigen.
   Alternative „URL-Präfix“ `https://kfz-zulassungsprofis.de/`: Die Datei
   `google6005d05511276b1a.html` liegt bereits auf der neuen Website und
   bestätigt die Property, wenn sie zu eurem Google-Konto gehört.
2. **Alte Domain behalten.** Die Property `deutschezulassung.de` nicht löschen.
   Sie wird für die Adressänderung gebraucht und zeigt, wie die alten Adressen
   aus dem Index verschwinden. Beide Properties müssen im selben Google-Konto liegen.
3. **Adressänderung melden.** In der **alten** Property: Einstellungen →
   „Adressänderung“ → neue Property auswählen → „Validieren und aktualisieren“.
   Google prüft dabei die 301-Weiterleitung der Startseite. Das Werkzeug gibt es
   nur für Domain-Properties bzw. Properties auf Domain-Ebene.
4. **Neue Sitemap einreichen.** In der **neuen** Property: „Sitemaps“ →
   `https://kfz-zulassungsprofis.de/sitemap.xml` → „Senden“ (471 Adressen).
   In der alten Property die alte Sitemap vorerst stehen lassen; Google folgt
   den Weiterleitungen.
5. **Indexierung wichtiger Seiten prüfen.** In der neuen Property nacheinander
   in die Suchleiste eingeben und „Indexierung beantragen“:
   `/`, `/kfz-zulassung-ohne-eid/`, `/auto-online-anmelden/`,
   `/auto-abmelden-ohne-eid/`, `/ikfz-funktioniert-nicht/`, `/preise/`,
   `/auftrag/`, `/zulassungsstelle/`, `/kfz-zulassung/berlin/`.
6. **Crawling-Fehler kontrollieren.** Nach 3, 7 und 14 Tagen unter „Seiten“:
   - neue Property: „Nicht gefunden (404)“ und „Seite mit Weiterleitung“ sollten leer bleiben
   - alte Property: die Zahl indexierter Seiten sinkt, „Seite mit Weiterleitung“ steigt – das ist richtig so
7. **Klicks und Impressionen überwachen.** „Leistung“ in beiden Properties
   wöchentlich vergleichen, mindestens acht Wochen. Die Summe aus alt und neu
   ist die Vergleichsgröße. Ein Rückgang in den ersten Wochen ist üblich;
   fällt die Summe nach vier Wochen noch deutlich ab, Weiterleitungen mit
   `node scripts/check-weiterleitungen.mjs --live` prüfen.

**Bing gleich mit erledigen:** https://www.bing.com/webmasters → neue Website
aus der Search Console importieren, dann „Website-Umzug“ für die alte melden.

Anmeldungen und Kontoeinstellungen nimmt niemand stellvertretend vor.

## 2. Google-Unternehmensprofil (für Bewertungen und Karten)

**Wichtig vorab – Eignung:** Google erlaubt ein Profil nur, wenn das Unternehmen Kundinnen und Kunden persönlich bedient – entweder an einer Adresse während der Öffnungszeiten oder als Unternehmen mit Einzugsgebiet, das zu den Kunden fährt. Reine Online-Anbieter sind ausgeschlossen. Passend wäre für euch das **Einzugsgebiet-Profil** über den regionalen Abhol- und Bringservice (siehe Leistung „Abhol- & Bringservice“), mit **ausgeblendeter Adresse**. Bietet ihr keinen persönlichen Kontakt an, lieber kein Profil anlegen (Sperrgefahr) und Bewertungen über ProvenExpert oder Trustpilot sammeln.

Einrichtung: https://business.google.com → „Unternehmen hinzufügen“.

| Feld | Vorschlag |
|---|---|
| Name | KFZ-Zulassungsprofis (ohne Zusätze wie „Kfz-Zulassung online günstig“ – das verstößt gegen die Richtlinien) |
| Kategorie | eine private Dienstleister-Kategorie rund um Kfz-Zulassung bzw. Zulassungsservice; **nicht** „Zulassungsstelle“ (das wäre die Behörde) |
| Adresse | Pappelallee 64, 10437 Berlin – **für Kunden ausblenden** |
| Einzugsgebiet | die Orte, in denen ihr tatsächlich abholt und bringt |
| Öffnungszeiten | Mo–Fr 8:00–18:00 |
| Telefon | 0179 152 82 05 |
| Website | https://kfz-zulassungsprofis.de/ |
| Termin-/Auftragslink | https://kfz-zulassungsprofis.de/auftrag/ |

**Beschreibung (max. 750 Zeichen, fertig zum Einfügen):**

> KFZ-Zulassungsprofis ist ein privater Kfz-Zulassungsdienst – keine Behörde. Wir übernehmen Neuzulassung, Ummeldung, Umschreibung nach dem Autokauf, Wiederzulassung, Abmeldung, Adressänderung und Wunschkennzeichen für Privatkunden, Autohäuser und Fuhrparks. Sie brauchen weder eine eID noch einen Behördentermin: Unterlagen fotografieren, online oder per WhatsApp beauftragen, Vollmacht erteilen – wir reichen den Antrag bei der zuständigen Zulassungsbehörde ein. Vor dem Start erhalten Sie eine verbindliche Festpreis-Bestätigung inklusive amtlicher Gebühren. Persönliche Ansprechperson Mo–Fr 8–18 Uhr. Ein Angebot der Volt Gas UG (haftungsbeschränkt), Berlin.

**Leistungen:** Neuzulassung, Ummeldung, Umschreibung/Halterwechsel, Wiederzulassung, Abmeldung, Adressänderung, Wunschkennzeichen, Kennzeichenschilder, Zulassungsservice für Autohäuser. Preise erst eintragen, wenn sie in `config/preise.json` freigegeben sind – und bei jeder Preisänderung hier mit anpassen.

Die Bestätigung erfolgt meist per Video oder Postkarte. Danach:

1. Unter „Rezensionen erhalten“ den Bewertungslink kopieren.
2. Den Link als `NEXT_PUBLIC_GOOGLE_REVIEW_URL` hinterlegen (Build-Variable) und echte Bewertungen in `lib/reviews.ts` eintragen – die Website zeigt dann automatisch Sterne und Stimmen.
3. Kunden nach Abschluss persönlich (WhatsApp, Telefon) um eine Bewertung bitten. Per E-Mail nur mit vorheriger Einwilligung (UWG). Keine Gegenleistung für Bewertungen anbieten.

## 3. Später (nicht jetzt)

- **Google Ads:** Conversion-Tracking ist vorbereitet (`docs/TRACKING.md`), aber aus. Kampagnen nur nach eigener Freigabe von Budget und Suchbegriffen.
- **Webanalyse:** Plausible oder Matomo einschalten (`docs/TRACKING.md`).
