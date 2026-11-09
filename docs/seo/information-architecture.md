# Informationsarchitektur DeutscheZulassung – Zielbild und Content-Briefs

Stand: 09.11.2026 · Branch `seo/sprint-1` · Begleitdateien: `keyword-map.csv`, `landing-page-backlog.csv` (Semikolon, UTF-8)

Positionierung: **„Kfz-Zulassung ohne eID und Behördentermin – persönlich geprüft, transparent kalkuliert, bundesweit betreut."**
DeutscheZulassung ist ein privater Dienstleister, keine Behörde. Das steht auf jeder Seite, die eine Behörde beschreibt.

---

## 0. Methodik und Grenzen

**Bestand.** Geprüft wurden die Routen in `app/`, die Datenmodule `lib/services.ts`, `lib/landingpages.ts`, `lib/ratgeber.ts`, `lib/staedte.ts`, `lib/gewerbe.ts`, `lib/serviceContent.ts`, die Weiterleitungen in `public/.htaccess`, die vorhandene Crawl-Auswertung (`docs/seo/url-inventory.csv`, `crawl-summary.json`) und die Live-Sitemap. Die Live-Sitemap enthielt am 09.11.2026 **1.214 URLs**, nicht rund 1.300: 404 Behördenseiten, 709 Kennzeichenseiten, 40 Stadtseiten, 15 Ratgeber, 13 Leistungen, 6 Intent-Landingpages, 4 Gewerbe-Segmente und 23 sonstige Seiten.

**SERP-Recherche.** Rund 45 Abfragen über das WebSearch-Werkzeug. Für einige Abfragen kam ein Abruf von Bing (de-DE) dazu. Google.de ließ sich nicht direkt abrufen, weil eine Consent-Seite davor liegt und Consent-Banner nicht ohne Freigabe bestätigt werden. Daraus folgt:

- **Seitentypen** (Behörde, Ratgeber, Dienstleister, ADAC, Versicherer, Foren) sind belastbar beobachtet. Sie stammen aus den Ergebnismengen und werden in der CSV mit `[WS]` bzw. `[Bing-de]` gekennzeichnet.
- **Die Reihenfolge** gilt nur für die Bing-Abrufe als gemessen (Berlin, München, „auto ummelden", „kfz zulassung ohne eid"). Mehrere Bing-Abrufe lieferten themenfremde oder regional falsche Ergebnisse und wurden verworfen.
- **SERP-Features** (Anzeigen, „Ähnliche Fragen", lokales Kartenpaket) waren mit den verfügbaren Werkzeugen **nicht verifizierbar**. In der CSV steht dafür „Features n. v." bzw. „Kartenpaket n. v.". Es wurde nichts angenommen.
- **Keine Suchvolumina, CPCs oder Rankings.** Die Spalte `nachfrage_signal` ist eine qualitative Beobachtung, z. B. „Versicherer und ADAC investieren" oder „nur Behördenergebnisse".

**Offene Messung (vor Sprint 2 empfohlen):** Für die 20 P1-Keywords einmal Google.de manuell prüfen: Inkognito, Standort neutral, an zwei Tagen. Zu notieren sind Anzahl der Anzeigen oben, „Ähnliche Fragen" mit Wortlaut der Fragen, Kartenpaket ja/nein und die Top-10-Domains. Danach die Spalte `serp_beobachtung` ergänzen. Ab Indexierung liefert die Search Console echte Impressionen; dann die Prioritäten neu bewerten.

---

## 1. Befund in Kürze

1. **Die Kernleistungen sind dünn für ihre SERP.** „auto ummelden", „auto abmelden" und „halterwechsel" werden von ADAC, Versicherern, Banken und Behörden mit vollständigen Ratgebern besetzt. Die Leistungsseiten haben 500 bis 780 Wörter und sind preis- und formularzentriert. Sie brauchen Ratgebertiefe (Hybrid-Seiten).
2. **Doppelte Intents im Bestand:**
   - Abmelden: `/leistungen/abmeldung/` und `/ratgeber/auto-abmelden-so-gehts/`
   - Umzug: `/leistungen/ummeldung/` (Heading „Auto ummelden nach Umzug") und `/ratgeber/auto-ummelden-nach-umzug/`
   - Gewerbe: `/leistungen/gewerbekunden/`, `/gewerbe/` und `/gewerbe/autohaus/`
   - „Auto online zulassen": vier URLs tragen den Begriff im Title
   - Startseite und `/kfz-zulassung-ohne-eid/` haben fast denselben Title
3. **Lücken mit gutem Service-Fit:**
   - Dauer der Zulassung: Die SERP hat keine Spezialseite.
   - Papiere ohne Sicherheitscode: Die Behörden-FAQ verbreiten das Problem, Dienstleister fehlen.
   - Fahrzeugtypen wie Motorrad und Import: Die SERP ist teils mit Spam-Seiten belegt.
   - Dokumenten-Checker: In der Stichprobe gab es kein Tool.
4. **Muster lokal.** Bei „kfz zulassung <stadt>" steht die Behörde oben. Danach folgen private Anbieter mit Stadt-Domains (Muster `zulassungsstelle-stadt-<stadt>.de`), Verzeichnisse und lokale i-Kfz-Dienste. ADAC und Versicherer kommen nicht vor. „zulassungsstelle <stadt>" ist navigational. Beide eigenen Seitentypen haben ihre Berechtigung, müssen aber im Title klar getrennt werden.
5. **Schwache interne Verlinkung wichtiger Seiten.** Laut Crawl haben `/auto-online-anmelden/` und `/auto-abmelden-ohne-eid/` je 3 interne Links, `/ikfz-fehlermeldung/` 3, `/vorlagen/vollmacht-zulassung/` 1, `/leistungen/saisonkennzeichen/` 3 und `/leistungen/kurzzeitkennzeichen/` 7.
6. **Externe Faktenrisiken für den eigenen Ablauf:**
   - Hamburg schließt Zulassungen per Vollmacht vom Online-Standardverfahren aus.
   - Köln widerspricht sich beim i-Kfz-Status.
   - Laut Stadt München ist der PIN-Rücksetzbrief seit Ende Oktober 2026 wieder online bestellbar. Das schwächt das Argument „PIN vergessen".

   Diese Punkte gehören zur offenen Klärung Nr. 5 aus `docs/UMSETZUNG-2026-11.md`.

---

## 2. Zielarchitektur (Pillar / Cluster)

```
/  Startseite = Money-Page „Kfz-Zulassung online beauftragen" (Head: zulassungsdienst online, kfz zulassung online)
│
├── LEISTUNGEN  /leistungen/                      (Hub, bleibt)
│   ├── Kernleistungen (Hybrid: Auftrag + vollständiger Ratgeber)
│   │   ├── /leistungen/neuzulassung/        128 €
│   │   ├── /leistungen/ummeldung/           128 €   ← 301 /ratgeber/auto-ummelden-nach-umzug/
│   │   ├── /leistungen/halterwechsel/       128 €
│   │   ├── /leistungen/wiederzulassung/     128 €
│   │   ├── /leistungen/abmeldung/            34 €   ← 301 /ratgeber/auto-abmelden-so-gehts/
│   │   └── /leistungen/adressaenderung/      64 €
│   ├── Zusatz/Kennzeichen: /leistungen/wunschkennzeichen/ (+12 €), /leistungen/kurzzeitkennzeichen/, /leistungen/saisonkennzeichen/ (auf Anfrage)
│   ├── Sonderfall: /leistungen/ersatz-dokumente/ (auf Anfrage), /leistungen/abhol-bringservice/
│   └── (entfällt) /leistungen/gewerbekunden/ → 301 /gewerbe/ · /leistungen/privatkunden/ → 301 /
│
├── PILLAR „OHNE eID"  /kfz-zulassung-ohne-eid/   (Hub aller eID-/i-Kfz-Probleme)
│   ├── /auto-abmelden-ohne-eid/
│   ├── /ikfz-funktioniert-nicht/            (Ursachen, inkl. AusweisApp/PIN)
│   ├── /ikfz-fehlermeldung/                 (Meldungstexte nachschlagen)
│   ├── /ratgeber/fahrzeugpapiere-sicherheitscodes/ (Papiere ohne/mit beschädigtem Code)
│   ├── /ratgeber/i-kfz-online-zulassung/    (i-Kfz selbst nutzen)
│   └── /auto-online-anmelden/               (Owner „auto online zulassen/anmelden", Vorgangs-Weiche)
│
├── WISSEN ZU KOSTEN · DAUER · UNTERLAGEN (Querschnitt, von allen Kernleistungen verlinkt)
│   ├── /ratgeber/was-kostet-eine-kfz-zulassung/        (amtliche Gebühren aller Wege)
│   ├── /ratgeber/wie-lange-dauert-eine-kfz-zulassung/  (NEU)
│   ├── /ratgeber/auto-anmelden-unterlagen/             (Unterlagen-Matrix)
│   ├── /preise/                                        (eigene Preise + Rechner)
│   └── Tools: /rechner/unterlagen-check/ (NEU), /rechner/ikfz-check/ (NEU), /rechner/behoerdengang/, /rechner/kfz-steuer/
│        Vorlagen: /vorlagen/checkliste-zulassung/, /vorlagen/vollmacht-zulassung/
│
├── RATGEBER  /ratgeber/   (situative Fragen, je ein Haupt-CTA auf eine Kernleistung)
│   halterwechsel-nach-autokauf · auto-verkauft-abmelden · kennzeichen-mitnehmen · wunschkennzeichen-reservieren ·
│   evb-nummer · evb-nummer-erhalten-was-nun · kein-termin-zulassungsstelle · kfz-zulassung-glossar ·
│   fahrzeugzulassung-unternehmen · NEU: auto-halter-verstorben · kfz-zulassung-minderjaehrige
│
├── FAHRZEUGE  /fahrzeuge/  (NEU, Sprint 4)
│   motorrad · importfahrzeug · elektroauto · wohnmobil · anhaenger · oldtimer · leasingfahrzeug
│
├── GEWERBE  /gewerbe/  (B2B-Pillar + Funnel)
│   autohaus · autohaendler · fuhrpark · leasing · NEU: konditionen · anfrage (noindex)
│   später bei realem Angebot: autovermietung · werkstatt · importeure
│
├── LOKAL
│   ├── /kfz-zulassung/  + 40 × /kfz-zulassung/<stadt>/      (transaktional: „Zulassungsdienst <Stadt>, ohne Termin")
│   ├── /zulassungsstelle/ + 404 × /zulassungsstelle/<slug>/ (navigational: Adresse, Öffnungszeiten, Termin)
│   └── /kennzeichen/ + 709 × /kennzeichen/<kuerzel>/        (Kürzel → Behörde → Stadt)
│
└── VERTRAUEN / VERGLEICH
    /zulassungsdienst-online/ (umgebaut zu „Zulassungsdienst vergleichen / seriös erkennen") · /ueber-uns/ ·
    /datensicherheit/ · /faq/ · /anleitung/ (← 301 /ablauf/) · /zulassung-per-whatsapp/ · /kontakt/ · /auftrag/
```

---

## 3. URL-Schema – Regeln

| Seitentyp | Schema | Beispiel | Regel |
|---|---|---|---|
| Kernleistung / Zusatzleistung | `/leistungen/<vorgang>/` | `/leistungen/ummeldung/` | Slug = Substantiv des Vorgangs, gleich dem Slug im Auftragsformular (`?leistung=`) |
| Intent-Landingpage | `/<suchphrase>/` (Root) | `/kfz-zulassung-ohne-eid/` | Nur für Problem-Intents mit eigener SERP; vor Neuanlage Keyword-Map prüfen; Duplikate per 301 bündeln |
| Ratgeber | `/ratgeber/<frage-oder-thema>/` | `/ratgeber/wie-lange-dauert-eine-kfz-zulassung/` | Situative oder erklärende Fragen; nie denselben Head-Term wie eine Kernleistung |
| Fahrzeugtyp | `/fahrzeuge/<typ>/` | `/fahrzeuge/motorrad/` | **Nicht** `/kfz-zulassung/<typ>/`: Dieser Ordner gehört den Städten, ein Typ-Slug würde mit Stadt-Slugs kollidieren |
| Gewerbe | `/gewerbe/<segment>/` | `/gewerbe/fuhrpark/` | Segment = Zielgruppe, Funnel-Seiten `konditionen`, `anfrage` |
| Stadt | `/kfz-zulassung/<stadt>/` | `/kfz-zulassung/frankfurt/` | Umlaute transliteriert (`muenchen`), Zusatz im Title, wenn mehrdeutig (Frankfurt am Main / Oder) |
| Behörde | `/zulassungsstelle/<slug>/` | `/zulassungsstelle/landkreis-muenchen/` | Bestehendes Schema (`landkreis-`, `kreis-`, `region-`) beibehalten |
| Kennzeichen | `/kennzeichen/<kuerzel>/` | `/kennzeichen/hh/` | Kleinbuchstaben |
| Tool | `/rechner/<tool>/` | `/rechner/unterlagen-check/` | Clientseitig, statisch exportierbar |

Allgemein: Kleinbuchstaben, Bindestriche, abschließender Slash (wie bisher), keine Jahreszahlen im Slug (Jahr nur im Title), keine Parameter-URLs im Index.

---

## 4. Empfehlung: `/leistungen/<slug>/` behalten – kein Umzug auf Root-URLs

**Empfehlung: Die bestehenden URLs `/leistungen/<slug>/` bleiben.** `/neuzulassung/`, `/ummeldung/` usw. werden **nicht** angelegt.

Begründung:

1. **Kein messbarer Rankinggewinn.** Das Keyword steht in beiden Varianten im Pfad (`/leistungen/ummeldung/` vs. `/ummeldung/`). Die Ordnertiefe ist kein relevanter Rankingfaktor. Entscheidend für diese SERPs sind Inhaltstiefe, Vertrauen und interne Verlinkung, und genau dort liegen die Defizite (Abschnitt 1).
2. **Kosten und Risiko stehen ohne Gegenwert.** Ein Umzug bedeutet 13 neue Routen, 13 Weiterleitungen in `.htaccess` (sie wirken nur auf dem all-inkl-Server, lokal nicht testbar) und Änderungen an Sitemap, `/llms.txt`, Open Graph und JSON-LD. Dazu kommen das Auftragsformular (`/auftrag/?leistung=<slug>` liest `services.ts`) und das Template für rund 1.200 interne Links. Danach folgen eine Phase der Neubewertung und eine weitere Prüfrunde.
3. **Der Ordner hilft der Architektur.** `/leistungen/` ist Hub, Breadcrumb-Ebene und Sitemap-Gruppe. Root-URLs würden sich den Namensraum mit den Intent-Landingpages (`app/[landing]`) teilen und das Kollisionsrisiko erhöhen.
4. **„Wenige Wochen live, kaum indexiert" spricht für jetzt oder nie, aber nicht für den Umzug.** Wenn umgezogen würde, dann jetzt, weil später mehr Linkwert verloren ginge. Da der Umzug aber keinen Nutzen bringt, ist „nie" die richtige Antwort. Die Entscheidung sollte jetzt fallen und dokumentiert werden, damit sie nicht in einem späteren Sprint teurer wird.

Optional und unkritisch: 301 von `/neuzulassung/`, `/ummeldung/`, `/halterwechsel/`, `/wiederzulassung/`, `/abmeldung/`, `/adressaenderung/` auf die `/leistungen/`-URL. Das fängt Eingaben und Fremdlinks auf, die das kurze Schema annehmen. Diese URLs dürfen dann nicht in die Sitemap und nicht intern verlinkt werden.

---

## 5. Navigationslogik

**Hauptnavigation (max. 6 Punkte):**
1. **Leistungen** (Mega-Menü). Die 6 Kernleistungen mit Preis, darunter Kennzeichen-Leistungen und ab Sprint 4 die Fahrzeugtypen.
2. **Ohne eID** → `/kfz-zulassung-ohne-eid/`. Bleibt, weil der Punkt die Positionierung trägt.
3. **Preise** → `/preise/`
4. **Gewerbe** → `/gewerbe/`
5. **Ratgeber** → `/ratgeber/`. Kosten, Dauer und Unterlagen stehen als erste drei Links im Dropdown.
6. **CTA-Button** „Auftrag starten" → `/auftrag/`

**Footer:** Städte (Top 20), Zulassungsstellen-Suche, Kennzeichen-Suche, Tools, Vorlagen, Vertrauen (Über uns, Datensicherheit, Impressum, Datenschutz) und der Hinweis „privater Dienstleister, keine Behörde".

**Aus der Navigation nehmen:** `/ablauf/` (wird per 301 zu `/anleitung/` zusammengeführt).

---

## 6. Breadcrumb-Logik

Die Breadcrumb bildet den Ordner ab, nicht den Klickpfad. Sie wird immer als `BreadcrumbList` ausgegeben.

| Seitentyp | Breadcrumb |
|---|---|
| Kernleistung | Startseite › Leistungen › Ummeldung |
| Fahrzeugtyp | Startseite › Fahrzeuge › Motorrad |
| Intent-Landingpage im eID-Cluster | Startseite › Ohne eID › i-Kfz funktioniert nicht (logische Elternseite statt Root, weil der Cluster eine Pillar hat) |
| Intent-Landingpage ohne Cluster | Startseite › Seitentitel |
| Ratgeber | Startseite › Ratgeber › Titel |
| Gewerbe | Startseite › Gewerbe › Fuhrpark |
| Stadt | Startseite › Kfz-Zulassung in Ihrer Stadt › Hamburg |
| Behörde | Startseite › Zulassungsstellen › (Bundesland, optional) › Hamburg |
| Kennzeichen | Startseite › Kennzeichen › HH |
| Tool | Startseite › Rechner & Tools › Unterlagen-Check |

Für die eID-Landingpages heißt das: Das Breadcrumb-Element „Ohne eID" ergänzen. Die URL bleibt unverändert.

---

## 7. Regeln für die interne Verlinkung

1. **Ein Keyword, eine Zielseite.** Ankertexte mit dem Head-Term einer Seite (z. B. „Auto ummelden") zeigen nur auf deren Owner laut Keyword-Map. Andere Seiten nutzen beschreibende Varianten.
2. **Nach unten:** Jede Kernleistung verlinkt auf Kosten-, Dauer- und Unterlagen-Seite, auf den Dokumenten-Checker und die Vollmacht-Vorlage, auf die eID-Pillar sowie auf genau eine passende Nachbar-Leistung pro Weiche (Ummeldung ↔ Halterwechsel ↔ Adressänderung, Abmeldung ↔ Wiederzulassung).
3. **Nach oben:** Jede Cluster-Seite (Ratgeber, Landingpage, Fahrzeugtyp) hat **genau einen** Haupt-CTA auf eine Kernleistung bzw. den Auftrag und einen Link zu ihrer Pillar.
4. **Pillar:** `/kfz-zulassung-ohne-eid/` verlinkt alle eID-Cluster-Seiten, und alle verlinken zurück.
5. **Lokal:** Stadtseite ↔ Behördenseite immer gegenseitig, das ist bereits umgesetzt. Behördenseite → Kennzeichenseiten. Kennzeichen → Behörde → Stadt. Stadtseiten verlinken auf die 6 Kernleistungen, und zwar mit Stadt im Ankertext („Ummeldung in Hamburg").
6. **Mindestens 5 kontextuelle interne Links** (nicht Navigation/Footer) für jede indexierbare Content-Seite. Ausgangswert laut Crawl: 1 bis 3 bei mehreren Landingpages.
7. **Breadcrumb und Navigation zählen nicht** als thematische Links. Thematische Links stehen im Fließtext oder in einem Kasten „Passend dazu".
8. **Keine Links auf 301-Quellen.** Nach jeder Zusammenführung müssen interne Links auf das Ziel zeigen. `scripts/check-site.mjs` soll das prüfen.
9. **noindex-Seiten** (`/unterlagen/`, `/gewerbe/anfrage/`, `/servicebedingungen/`) stehen nicht in Kontext-Links von Ratgebern, nur als CTA.

---

## 8. Kannibalisierung im Bestand

| Intent | Eigene konkurrierende URLs | Risiko | Lösung |
|---|---|---|---|
| auto abmelden | `/leistungen/abmeldung/`, `/ratgeber/auto-abmelden-so-gehts/`, `/auto-abmelden-ohne-eid/`, `/ratgeber/auto-verkauft-abmelden/` | hoch | Ratgeber „so geht's" per 301 in die Leistung; „ohne eID" und „verkauft" bleiben als eigene Intents |
| auto ummelden (Umzug) | `/leistungen/ummeldung/`, `/ratgeber/auto-ummelden-nach-umzug/` | hoch | Ratgeber per 301 in die Leistung |
| Zulassungsservice Gewerbe/Autohaus | `/leistungen/gewerbekunden/`, `/gewerbe/`, `/gewerbe/autohaus/` | hoch | `/leistungen/gewerbekunden/` per 301 auf `/gewerbe/` |
| auto online zulassen | `/`, `/auto-online-anmelden/`, `/anleitung/`, `/ratgeber/i-kfz-online-zulassung/` | hoch | Owner `/auto-online-anmelden/`; Titles der anderen drei umformulieren |
| kfz zulassung (online) ohne eID | `/` (Title „Kfz-Zulassung online ohne eID"), `/kfz-zulassung-ohne-eid/` | mittel | Startseite auf „online beauftragen" ausrichten, Pillar besitzt „ohne eID" |
| zulassungsdienst online | `/`, `/zulassungsdienst-online/` | hoch | Startseite besitzt den Head-Term; Landingpage wird Vergleichs-/Seriositätsseite |
| Prozess „so funktioniert's" | `/ablauf/`, `/anleitung/` | mittel | `/ablauf/` per 301 auf `/anleitung/` |
| Ummeldung vs. Halterwechsel vs. Adressänderung | drei Leistungen | mittel | Bleiben getrennt (eigene Preise, eigene Vorgänge). Identische Weiche oben auf allen drei Seiten, gegenseitig verlinkt |
| Wunschkennzeichen | `/leistungen/wunschkennzeichen/`, `/ratgeber/wunschkennzeichen-reservieren/` | mittel | Bleiben: „mit der Zulassung mitbestellen" vs. „selbst reservieren" |
| Halterwechsel | `/leistungen/halterwechsel/`, `/ratgeber/halterwechsel-nach-autokauf/` | mittel | Bleiben: Auftrag vs. Pflichten beim Autokauf |
| i-Kfz-Probleme | `/ikfz-funktioniert-nicht/`, `/ikfz-fehlermeldung/` | mittel | Bleiben: Ursachen vs. Meldungs-Lexikon; Intro beider Seiten grenzt ab |
| Kosten | `/ratgeber/was-kostet-eine-kfz-zulassung/`, `/preise/` | mittel | Bleiben: amtliche Gebühren aller Wege vs. eigener Preis |
| Unterlagen | `/ratgeber/auto-anmelden-unterlagen/`, `/vorlagen/checkliste-zulassung/`, Checklisten auf Leistungsseiten | niedrig | Bleiben: Ratgeber = Matrix, Vorlage = Druck, Leistungsseiten = Kurzliste mit Link |
| Stadt vs. Behörde | `/kfz-zulassung/<stadt>/`, `/zulassungsstelle/<slug>/` | mittel | **Beide behalten.** Die SERP trennt „kfz zulassung <stadt>" (gemischt, private Anbieter sichtbar) und „zulassungsstelle <stadt>" (navigational, Behörde). Title-Templates trennen (Backlog LP-003); Behörden-Description beginnt mit Behördenfakten statt „Ohne Termin über uns"; Stadtseite besitzt „ohne Termin". Kein Zusammenlegen, weil die Behördenseiten (404) eigene belegte Daten tragen und das lokale Muster beide Intents zeigt |
| Startseite vs. Stadtseiten „ohne Termin" | `/`, 40 Stadtseiten | niedrig | Stadtname im Title trennt hinreichend |

---

## 9. Empfohlene 301-Zusammenführungen

Bestehende Regeln in `public/.htaccess` bleiben: `/auto-online-zulassen-ohne-eid/` und `/kfz-zulassung-ohne-ausweisapp/` → `/kfz-zulassung-ohne-eid/`, `/online-zulassung-funktioniert-nicht/` → `/ikfz-funktioniert-nicht/`, `/kfz-zulassung-kosten/` → `/ratgeber/was-kostet-eine-kfz-zulassung/`.

**Neu (in dieser Reihenfolge, jeweils erst nach Übernahme des Inhalts ins Ziel):**

| Sprint | Quelle | Ziel | Grund |
|---|---|---|---|
| 2 | `/ratgeber/auto-ummelden-nach-umzug/` | `/leistungen/ummeldung/` | gleicher Intent, Leistung ist als Umzugs-Fall definiert |
| 2 | `/ratgeber/auto-abmelden-so-gehts/` | `/leistungen/abmeldung/` | gleicher Head-Term, Leistung wird Hybrid-Seite |
| 3 | `/leistungen/gewerbekunden/` | `/gewerbe/` | Doppelung des B2B-Pillars |
| 3 | `/leistungen/privatkunden/` | `/` | generischer Startseiten-Intent |
| 4 | `/ablauf/` | `/anleitung/` | gleicher Prozess-Intent |
| optional | `/neuzulassung/`, `/ummeldung/`, `/halterwechsel/`, `/wiederzulassung/`, `/abmeldung/`, `/adressaenderung/` | `/leistungen/<slug>/` | Eingabe-/Fremdlink-Fang, siehe Abschnitt 4 |

Umsetzungshinweis (nicht ausgeführt): Regel nach bestehendem Muster in `public/.htaccess`, z. B.
`RewriteRule ^ratgeber/auto-ummelden-nach-umzug/?$ /leistungen/ummeldung/ [R=301,L]`.
Dazu den Eintrag aus dem Datenmodul entfernen, `relatedGuides`/`relatedServices` umstellen, Sitemap und `/llms.txt` prüfen und den Prüfskriptlauf ausführen. Vorher prüfen, ob das Auftragsformular `?leistung=gewerbekunden` bzw. `privatkunden` verwendet.

**Bewusst nicht zusammenführen:** Stadt- und Behördenseiten, Ummeldung/Halterwechsel/Adressänderung, Wunschkennzeichen-Leistung und Reservierungs-Ratgeber, die beiden i-Kfz-Problemseiten.

---

## 10. SERP-Muster je Cluster (Zusammenfassung)

| Cluster | Dominanter Seitentyp | Was den Intent bedient | Folgerung |
|---|---|---|---|
| Transaktional Umzug/Halterwechsel/Abmeldung | ADAC, Versicherer, Banken, Plattformen, Behörden | Vollständiger Ratgeber mit Kosten, Unterlagen, Frist | Kernleistungen als Hybrid-Seiten |
| Neuzulassung, Wiederzulassung | Behörden-Leistungsseiten, Portal-Ratgeber | Ablauf + Unterlagen | Hybrid, eID-Weiche als Differenzierung |
| Adressänderung | fast nur Behörden | Behörden-Onlinedienst (günstig) | Ehrlich: wann Service lohnt |
| „zulassungsdienst online" | Verzeichnisse, TÜV, Versicherer-Services | Anbieterseiten | Startseite als Money-Page |
| ohne eID | Behörden-Portale, ADAC, Versicherer | Erklärung der Alternativen | Pillar mit Entscheidungsbaum |
| AusweisApp/PIN | Foren, Tech-Medien, Behörden | Technik-Hilfe | Nur Abschnitte, keine eigenen URLs |
| Sicherheitscode | Behörden-FAQ, BMV | Stichtage, Freilegen | Ratgeber mit Service-Fall „ohne Code" |
| Kosten | Rechner-/Faktenseiten, Portale | Tabelle | Belegte Tabelle mit Datum |
| Dauer | keine Spezialseite | – | Neue Seite (Lücke) |
| Unterlagen | Portale + PDF-Checklisten | Checkliste/Download | Matrix + Druckvorlage + Checker |
| Fahrzeugtypen | Versicherer, Fachmedien; Motorrad stark mit Spam belegt | Typ-spezifischer Ratgeber | `/fahrzeuge/`, Motorrad und Import zuerst |
| B2B | TÜV, Kroschke/DAD, Fachpresse, Software | Anbieter-/Lösungsseiten | Funnel mit Konditionen + Anfrage; Begriffe wie Sammelrechnung haben kaum Suchsignal |
| Lokal | Behörde, Stadt-Domains privater Anbieter, Verzeichnisse | Behörde (navigational), Anbieter (transaktional) | Stadt- und Behördenseite getrennt, lokale Fakten mit Quelle |

---

## 11. Content-Briefs

Für alle Briefs gilt:
- **Preise** werden aus `config/preise.json` gelesen und nicht im Text hart codiert: Kernleistung 128 €, Abmeldung 34 €, Adressänderung 64 €, Schilder +29 €, Wunschkennzeichen +12 €.
- **Fakten** zu Fristen, Gebühren und Stichtagen erscheinen nur mit verlinkter Primärquelle und Prüfdatum.
- **Hinweis** „privater Dienstleister, keine Behörde" steht auf jeder Seite.
- **Kein Text von Wettbewerbern** übernehmen, auch nicht umformuliert. Die SERP dient nur zur Ermittlung von Lücken.
- **Aussagen zum eigenen Ablauf** (Einreichungsweg, Dauer, Schilderversand) erst nach Klärung der offenen Punkte 2, 5 und 7 aus `docs/UMSETZUNG-2026-11.md` veröffentlichen.

### 11.1 Neuzulassung – `/leistungen/neuzulassung/`

- **Primär:** neuzulassung auto, neuwagen zulassen lassen. **Sekundär:** neuzulassung online, auto erstzulassung, neuzulassung kosten.
- **Suchintention:** gemischt. Teils wollen Nutzer beauftragen, teils den Ablauf verstehen. Die SERP ist behördlich-informativ.
- **Pflichtabschnitte:**
  1. Preisbox 128 € mit Positionen (amtliche Gebühren und Versand enthalten, Schilder +29 €, Wunschkennzeichen +12 €) und CTA
  2. Wann eine Neuzulassung nötig ist: fabrikneu, Import, Erstzulassung in Deutschland. Abgrenzung zu Wiederzulassung und Halterwechsel
  3. Unterlagen-Kurzliste (ZB II oder COC, eVB, SEPA-Mandat Kfz-Steuer, Ausweis, Vollmacht, bei Firmen Register/Gewerbe) mit Link zur Unterlagen-Matrix und zum Checker
  4. Ablauf in 4 Schritten inkl. Vollmacht und Versand
  5. Dauer, mit Link zur Dauer-Seite
  6. Selbst online (i-Kfz: eID/BundID nötig) vs. Behördentermin vs. über uns, mit Link zur Pillar
  7. Kennzeichen: neu, Wunschkennzeichen, E-Kennzeichen-Option
  8. Sonderfälle mit Links: Import, Firmenwagen, Leasing
  9. FAQ (5 bis 7 Fragen) mit JSON-LD
- **Zusatznutzen gegenüber SERP:** Entscheidungshilfe „welcher Weg passt zu mir", ein Endpreis statt Gebührenspannen und die Prüfung der Unterlagen vor Einreichung als Leistungsversprechen.
- **Interne Links:** zu `/ratgeber/auto-anmelden-unterlagen/`, `/rechner/unterlagen-check/`, `/ratgeber/evb-nummer/`, `/leistungen/wunschkennzeichen/`, `/vorlagen/vollmacht-zulassung/`, `/kfz-zulassung-ohne-eid/`, `/ratgeber/was-kostet-eine-kfz-zulassung/`, `/ratgeber/wie-lange-dauert-eine-kfz-zulassung/`. Eingehend: Startseite, `/auto-online-anmelden/`, Stadtseiten, ab Sprint 4 `/fahrzeuge/*`.
- **Quellen prüfen:** FZV (aktuelle Fassung, gesetze-im-internet.de), GebOSt Anlage (Gebühr Erstzulassung vor Ort/online), KBA/BMV-Seite i-Kfz, Bundesportal verwaltung.bund.de (Leistung Erstzulassung).

### 11.2 Ummeldung – `/leistungen/ummeldung/`

- **Primär:** auto ummelden, auto ummelden nach umzug. **Sekundär:** auto ummelden kosten, auto ummelden online, ummeldung kfz unterlagen.
- **Suchintention:** gemischt, Begriff mehrdeutig (Umzug oder Halterwechsel). Die SERP ist sehr breit besetzt von ADAC, Versicherern und Banken.
- **Pflichtabschnitte:**
  1. Weiche oben: Umzug in einen anderen Bezirk → Ummeldung · gleicher Bezirk → Adressänderung (64 €) · Auto gekauft → Halterwechsel
  2. Preisbox 128 €
  3. Frist und Pflicht bei Umzug, belegt (Rechtsgrundlage FZV) statt der im SERP widersprüchlichen Angaben
  4. Kennzeichen behalten: Grundsatz und Link zum Ratgeber
  5. Unterlagen: ZB I und II, Ausweis mit neuer Adresse bzw. Meldebestätigung, eVB nur bei Bedarf (Fachkorrektur aus der Prüfung beachten), SEPA
  6. Kosten: amtlich vor Ort / online / über uns
  7. Selbst online: Voraussetzungen eID, Sicherheitscodes, Papiere ab 2015 bzw. 2018
  8. Übernommener Inhalt aus `/ratgeber/auto-ummelden-nach-umzug/` (danach 301)
  9. FAQ
- **Zusatznutzen gegenüber SERP:** eindeutige Begriffsklärung mit Weiche (fehlt im SERP), belegte Frist und ein Kostenvergleich der drei Wege.
- **Interne Links:** zu `/leistungen/halterwechsel/`, `/leistungen/adressaenderung/`, `/ratgeber/kennzeichen-mitnehmen/`, Kosten-, Dauer- und Unterlagen-Seite, Pillar, Checker. Eingehend: Startseite, Adressänderung, Kennzeichen-Ratgeber, Stadtseiten.
- **Quellen prüfen:** FZV (Mitteilungspflichten bei Wohnsitzwechsel, Kennzeichenmitnahme), GebOSt, Bundesportal „Ummeldung ohne Halterwechsel", BMV i-Kfz (Stichtage Sicherheitscodes).

### 11.3 Halterwechsel / Umschreibung – `/leistungen/halterwechsel/`

- **Primär:** halterwechsel auto, auto umschreiben. **Sekundär:** umschreibung kfz kosten, gebrauchtwagen ummelden, kennzeichen übernehmen.
- **Suchintention:** gemischt. Die SERP besteht aus Behörden-Stammtexten und Versicherern.
- **Pflichtabschnitte:**
  1. Preisbox 128 €
  2. Fallunterscheidung: Fahrzeug angemeldet oder abgemeldet gekauft
  3. Unterlagen: ZB I und II, eVB, Ausweis, Kaufvertrag, SEPA, Sicherheitscode bei Kennzeichenmitnahme
  4. Kennzeichen übernehmen oder neu
  5. Wenn die Behörde online nicht umschreibt: juristische Personen/Gewerbe, Minderjährige, Sonderkennzeichen. Je Aussage Quelle und Behörde nennen, keine Verallgemeinerung
  6. Pflichten von Käufer und Verkäufer, kurz, mit Link zum Autokauf-Ratgeber
  7. Kosten nach Weg
  8. FAQ
- **Zusatznutzen gegenüber SERP:** Übergabe-Checkliste für Verkäufer und Käufer sowie die belegten Online-Ausschlüsse der Behörden als konkreter Grund für den Service.
- **Interne Links:** zu `/ratgeber/halterwechsel-nach-autokauf/`, `/ratgeber/kennzeichen-mitnehmen/`, `/ratgeber/evb-nummer/`, `/ratgeber/fahrzeugzulassung-unternehmen/`, Ummeldung, Unterlagen-Matrix, Checker. Eingehend: Autokauf-Ratgeber, „auto verkauft", Stadtseiten.
- **Quellen prüfen:** FZV (Veräußerung, Pflichten des Erwerbers, Frist), GebOSt, Behörden-Leistungsseiten Berlin und Bremen (Online-Ausschlüsse), Bundesportal.

### 11.4 Wiederzulassung – `/leistungen/wiederzulassung/`

- **Primär:** wiederzulassung auto, abgemeldetes auto wieder anmelden. **Sekundär:** wiederzulassung kosten, stillgelegtes auto anmelden, altes kennzeichen wieder.
- **Suchintention:** gemischt. Die Nachfrage ist eher klein, die kommerzielle Konkurrenz gering.
- **Pflichtabschnitte:**
  1. Preisbox 128 €
  2. Voraussetzungen: gültige HU, eVB, Papiere, ggf. Abmeldebescheinigung
  3. Mit oder ohne Halterwechsel
  4. Altes Kennzeichen: Reservierung nach Abmeldung, Frist laut Behörde
  5. Wie lange ein Fahrzeug abgemeldet bleiben darf: Rechtslage belegt, denn die SERP widerspricht sich
  6. Online-Bedingungen (Sicherheitscode ZB II nur bei Kennzeichenwechsel laut Bielefeld; prüfen und verallgemeinern nur mit Bundesquelle)
  7. Kosten
  8. FAQ
- **Zusatznutzen gegenüber SERP:** Klarstellung von Frist und Kennzeichenreservierung und eine Checkliste „vor der Wiederzulassung prüfen" (HU, Versicherung, Steuerrückstände).
- **Interne Links:** zu Abmeldung, Neuzulassung (Abgrenzung), Kennzeichen-Ratgeber, Sicherheitscode-Ratgeber, Unterlagen, Kosten. Eingehend: Abmeldung, Stadtseiten.
- **Quellen prüfen:** FZV (Außerbetriebsetzung und Wiederzulassung), GebOSt, Bundesportal, ggf. KBA zu Fahrzeugen, die nach langer Stilllegung als „endgültig" gelten.

### 11.5 Abmeldung – `/leistungen/abmeldung/`

- **Primär:** auto abmelden, auto abmelden online. **Sekundär:** auto abmelden kosten, kfz abmelden unterlagen, auto verschrotten abmelden.
- **Suchintention:** überwiegend informativ, mit klarer Handlungsabsicht. Im SERP wird mit Preisen verglichen (Selbst-Abmeldung kostet wenige Euro, ein Ratgeber warnt vor teuren Dienstleistern).
- **Pflichtabschnitte:**
  1. Preisbox 34 €
  2. Drei Wege ehrlich: selbst über i-Kfz (für die Abmeldung genügen Sicherheitscodes, eID ist laut Quellen nicht nötig; prüfen), Behörde, über uns
  3. Wann der Service lohnt: Papiere vor 2015, Codes beschädigt, Unsicherheit beim Freilegen, keine Zeit
  4. Ablauf mit Hinweis zum Freilegen der Codes
  5. Verschrottung, Verwertungsnachweis
  6. Was danach passiert: Versicherung, Kfz-Steuer
  7. Kennzeichen reservieren
  8. Übernommener Inhalt aus `/ratgeber/auto-abmelden-so-gehts/` (danach 301)
  9. FAQ
- **Zusatznutzen gegenüber SERP:** transparente Entscheidungshilfe „selbst oder Service" mit echten Zahlen. Das stärkt das Vertrauen bei preissensiblen Suchenden.
- **Interne Links:** zu `/auto-abmelden-ohne-eid/`, `/ratgeber/auto-verkauft-abmelden/`, `/ratgeber/fahrzeugpapiere-sicherheitscodes/`, Wiederzulassung, Kosten. Eingehend: „ohne eID", „auto verkauft", Stadtseiten.
- **Quellen prüfen:** FZV (Außerbetriebsetzung), GebOSt (Abmeldung vor Ort/online), BMV i-Kfz (Voraussetzungen Online-Abmeldung), KBA.

### 11.6 Adressänderung – `/leistungen/adressaenderung/`

- **Primär:** adressänderung fahrzeugschein. **Sekundär:** adresse ändern kfz, umzug gleicher zulassungsbezirk, fahrzeugschein neue adresse.
- **Suchintention:** transaktional-behördlich. Die SERP zeigt fast nur Behörden, und der Selbst-Weg online ist günstig.
- **Pflichtabschnitte:**
  1. Preisbox 64 € (inkl. Gebühr und Versand) mit ehrlichem Vergleich zur Behördengebühr online (Quelle und Datum)
  2. Weiche: gleicher Bezirk = Adressänderung, anderer Bezirk = Ummeldung
  3. Wann der Selbst-Weg nicht geht: Papiere vor 2015/2018, keine eID/BundID, Namensänderung (laut München online nicht möglich)
  4. Unterlagen
  5. Fahren bis zur neuen ZB I (laut München sofort möglich; mit Quelle)
  6. FAQ
- **Zusatznutzen gegenüber SERP:** Die Behördenseiten erklären nur den eigenen Weg. Die Seite erklärt die Abgrenzung und den Fall, in dem Hilfe nötig ist.
- **Interne Links:** zu Ummeldung, Sicherheitscode-Ratgeber, Pillar, Unterlagen. Eingehend: Ummeldung, Stadtseiten.
- **Quellen prüfen:** FZV (Mitteilung von Änderungen), GebOSt, Leistungsseiten München und Nürnberg, Bundesportal.
- **Freigabe:** Wirtschaftlichkeit 64 € (offener Punkt 1).

### 11.7 eID-Pillar – `/kfz-zulassung-ohne-eid/`

- **Primär:** kfz zulassung ohne eid. **Sekundär:** auto online zulassen ohne eid, zulassung ohne ausweisapp, ohne online-ausweis, eid pin vergessen (Abschnitt), zulassung ohne personalausweis.
- **Suchintention:** Problem mit Lösungsabsicht. ADAC und Versicherer behandeln das Thema, spezialisierte Anbieterseiten sind selten.
- **Pflichtabschnitte:**
  1. Kurzantwort oben (2 Sätze), danach der CTA
  2. Was i-Kfz voraussetzt: Ausweis mit aktivierter Online-Funktion und PIN bzw. BundID, Smartphone/Kartenleser, Papiere mit Sicherheitscodes
  3. Alle Wege ohne eID, neutral dargestellt:
     - BundID mit ELSTER-Zertifikat (laut Nürnberg)
     - Bayern-ID (Bayern)
     - Zulassung über die eigene Kfz-Versicherung (seit 09/2023 möglich laut GDV-Quelle; Stand prüfen)
     - Termin bei der Behörde
     - Zulassungsdienst mit Vollmacht
  4. Entscheidungsbaum „Welcher Weg passt?"
  5. Abschnitt „PIN vergessen": PIN-Rücksetzbrief (laut Stadt München seit Ende Oktober 2026 wieder online bestellbar, Zustellung ca. 7 Werktage; prüfen) vs. Bürgeramt vs. Weg ohne eID
  6. Vorgänge-Matrix: welche Vorgänge ohne eID über uns gehen. Die Abmeldung geht auch selbst ohne eID
  7. Grenzen: was die Behörde trotzdem verlangt (Ausweiskopie, Vollmacht, Originale), regionale Ausnahmen (Hamburg, Köln) mit Quelle
  8. „Wer über Ihre Zulassung entscheidet" (bleibt, die Behörde entscheidet)
  9. Hub-Kasten mit allen Cluster-Seiten
  10. FAQ
- **Zusatznutzen gegenüber SERP:** Die SERP-Quellen erklären jeweils nur einen Weg. Die Pillar stellt alle Wege mit Vor- und Nachteilen nebeneinander, inkl. der Wege ohne uns. Das ist glaubwürdiger und deckt den gesamten Intent ab.
- **Interne Links:** zu allen 6 Kernleistungen, `/auto-abmelden-ohne-eid/`, `/ikfz-funktioniert-nicht/`, `/ikfz-fehlermeldung/`, `/ratgeber/fahrzeugpapiere-sicherheitscodes/`, `/ratgeber/i-kfz-online-zulassung/`, `/vorlagen/vollmacht-zulassung/`, `/rechner/unterlagen-check/`, ab Sprint 4 `/rechner/ikfz-check/`. Eingehend: Navigation „Ohne eID", alle Cluster-Seiten, alle Kernleistungen.
- **Quellen prüfen:** BMV- und KBA-Seiten zu i-Kfz, Personalausweisportal/AusweisApp (offizielle Seiten), Mitteilung zum PIN-Rücksetzbrief (BMDS bzw. Stadt München, Okt. 2026), GDV/dieversicherer.de zur Versicherer-Zulassung, BundID-Hilfeseiten, Bayern-ID (Bayernportal), Leistungsseiten Hamburg (Vollmacht-Ausschluss) und Köln (i-Kfz-Status).
- **Freigabe:** rechtliche Prüfung der Formulierung „ohne eID" (Irreführung vermeiden) und eigener Einreichungsweg (offener Punkt 5).

### 11.8 Kosten-Seite – `/ratgeber/was-kostet-eine-kfz-zulassung/`

- **Primär:** kfz zulassung kosten, was kostet auto anmelden. **Sekundär:** ummelden kosten, abmelden kosten, zulassung online günstiger, zulassungsdienst kosten (Verweis auf `/preise/`).
- **Suchintention:** informativ, mit Kaufnähe. Die SERP besteht aus Rechner- und Faktenseiten mit widersprüchlichen Beträgen.
- **Pflichtabschnitte:**
  1. Kurzantwort mit Spanne und Datum
  2. Tabelle amtliche Gebühren je Vorgang, vor Ort und online, mit Rechtsgrundlage (GebOSt) und Hinweis auf regionale Abweichungen
  3. Nebenkosten: Schilder, Wunschkennzeichen-Reservierung, Plaketten/Siegel, eVB (kostenlos), HU, Kfz-Steuer (Link Rechner)
  4. Gesamtkosten je Weg: Behörde, i-Kfz selbst, Dienst (inkl. Zeitkosten, Link `/rechner/behoerdengang/`)
  5. Was im Preis von DeutscheZulassung enthalten ist (Link `/preise/`)
  6. Typische Kostenfallen: fehlende Papiere, Ersatz ZB II
  7. FAQ
- **Zusatznutzen gegenüber SERP:** eine konsistente, belegte und datierte Tabelle statt widersprüchlicher Einzelwerte, dazu der ehrliche Gesamtkostenvergleich aller Wege.
- **Interne Links:** zu `/preise/`, `/rechner/behoerdengang/`, `/rechner/kfz-steuer/`, den 6 Kernleistungen (je Zeile), `/leistungen/wunschkennzeichen/`. Eingehend: alle Kernleistungen (Kostenabschnitt), Startseite, `/preise/`.
- **Quellen prüfen:** GebOSt (Anlage, Gebührennummern Zulassung), Leistungsseiten mehrerer großer Behörden als Stichprobe (Berlin, Hamburg, München, Köln, Nürnberg), Bundesportal.
- **Freigabe:** Gebührenspannen in `config/preise.json` (offener Punkt 8) und MwSt.-Darstellung (offener Punkt 3).

### 11.9 Dauer-Seite (neu) – `/ratgeber/wie-lange-dauert-eine-kfz-zulassung/`

- **Primär:** kfz zulassung dauer, wie lange dauert eine zulassung. **Sekundär:** zulassungsstelle wartezeit, zulassung online dauer, wie schnell zulassungsdienst.
- **Suchintention:** informativ, mit Kaufnähe. Die SERP hat keine Spezialseite, nur Presseberichte über Wartezeiten und Parlamentsdokumente.
- **Pflichtabschnitte:**
  1. Kurzantwort je Weg
  2. Zeitstrahl je Weg:
     - Behörde: Terminwartezeit + Vorsprache
     - i-Kfz: Antrag + Bearbeitung + Postlauf (z. B. Nürnberg: Dokumente per Post in ca. 6 Arbeitstagen)
     - Dienst: Unterlagen + Einreichung + Versand
  3. Wann man fahren darf (vorläufiger Nachweis bei i-Kfz, ohne feste Tageszahl, siehe offener Punkt 7)
  4. Was die Dauer verlängert: fehlende Unterlagen, Leasingbrief beim Leasinggeber, Aufgebot ZB II (München: 3 bis 4 Wochen), Import/Einzelabnahme
  5. Belegte regionale Wartezeiten nur mit Quelle und Datum, Verweis auf Stadtseiten
  6. Eigene Dauer je Vorgang (aus `lib/services.ts` „duration"), nur wenn intern belegt
  7. FAQ
- **Zusatznutzen gegenüber SERP:** Es ist die erste strukturierte Antwort auf diese Frage. Dazu kommt eine Vorab-Checkliste, die Verzögerungen vermeidet.
- **Interne Links:** zu den 6 Kernleistungen, `/ratgeber/kein-termin-zulassungsstelle/`, Pillar, Unterlagen-Seite, Checker und den Top-10-Stadtseiten. Eingehend: alle Kernleistungen (Dauer-Hinweis), Startseite, Stadtseiten, „kein Termin"-Ratgeber.
- **Quellen prüfen:** BMV/KBA (vorläufiger Zulassungsnachweis, Angaben widersprechen sich: 10 vs. 14 Tage), Leistungsseiten Nürnberg und München, Parlamentsanfragen und Presse nur datiert, eigene Auftragsdaten.
- **Freigabe:** eigene Dauerangaben, keine Garantie-Formulierungen.

### 11.10 Unterlagen-Seite – `/ratgeber/auto-anmelden-unterlagen/`

- **Primär:** kfz zulassung unterlagen, auto anmelden unterlagen. **Sekundär:** was brauche ich zum auto anmelden, ummelden unterlagen, abmelden unterlagen, unterlagen zulassung firma.
- **Suchintention:** informativ. Die SERP zeigt viele PDF-Checklisten, der Download-Bedarf ist also hoch.
- **Pflichtabschnitte:**
  1. Kurzliste der 5 Grundunterlagen
  2. Matrix Vorgang × Unterlage (Neuzulassung, Ummeldung, Halterwechsel, Wiederzulassung, Abmeldung, Adressänderung) mit „immer / je nach Fall / nicht nötig"
  3. Sonderfälle: Firma/juristische Person, Import (COC, ausländische Papiere, Zoll), Leasing/Finanzierung (ZB II beim Geldgeber), Minderjährige, Erbfall, Vollmacht
  4. Was bei uns als Foto reicht und was im Original nötig ist
  5. Druckvorlage (Link `/vorlagen/checkliste-zulassung/`) und Checker eingebettet bzw. verlinkt
  6. FAQ
- **Zusatznutzen gegenüber SERP:** eine Matrix für alle Vorgänge statt einzelner PDFs je Vorgang und ein interaktiver Checker mit Übergabe in den Auftrag.
- **Interne Links:** zu `/vorlagen/checkliste-zulassung/`, `/vorlagen/vollmacht-zulassung/`, `/rechner/unterlagen-check/`, `/ratgeber/evb-nummer/`, `/ratgeber/fahrzeugpapiere-sicherheitscodes/`, den 6 Kernleistungen, `/ratgeber/fahrzeugzulassung-unternehmen/`. Eingehend: alle Kernleistungen (Unterlagen-Kurzliste), Autokauf-Ratgeber, Startseite.
- **Quellen prüfen:** FZV (Antragsunterlagen), Behörden-Checklisten (z. B. Karlsruhe, aktueller Stand 2026), Bundesportal, Merkblätter für Firmenzulassungen (Märkischer Kreis, Landkreis Stade, Erfurt) als Beleg der regionalen Unterschiede.
- **Hinweis:** Title erweitern auf alle Vorgänge, die URL bleibt.

---

## 12. Offene Freigaben aus dieser Analyse

1. **Einreichungsweg:** Hamburg schließt Zulassungen per Vollmacht vom Online-Standardverfahren aus. Bevor Stadtseiten oder die Pillar dazu Aussagen machen, den eigenen Weg je Behörde klären (deckt sich mit offenem Punkt 5).
2. **Positionierung im Startseiten-Title:** Freigabe „Kfz-Zulassung online beauftragen – ohne eID und Termin" (LP-001).
3. **Wettbewerbervergleich:** Benannte Wettbewerber nur nach rechtlicher Prüfung (§ 6 UWG) und mit datierten Belegen. Bis dahin Kriterienvergleich ohne Namen (LP-059).
4. **B2B-Konditionen:** Sammelrechnung, Zahlungsziel, Rahmenvollmacht und Mengen durch die Geschäftsführung (LP-057).
5. **PIN-Rücksetzbrief wieder online:** Das Argument „PIN vergessen = lange Wartezeit" sachlich anpassen, wenn sich die Meldung bestätigt.
6. **SERP-Features:** Die manuelle Google-Prüfung (Abschnitt 0) steht aus. Danach Prioritäten P1/P2 neu bewerten.
