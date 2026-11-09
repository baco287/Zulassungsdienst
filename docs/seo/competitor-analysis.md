# Wettbewerbsanalyse Online-Kfz-Zulassung – deutschezulassung.de

Stand: 2026-11-09 · Alle Fakten wurden am **2026-11-09** abgerufen. Quellenkürzel `[Q…]` verweisen auf die vollständigen URLs in Abschnitt 8, Suchanfragen `[S…]` ebenfalls.

**Kennzeichnung:** **[Fakt]** = auf der genannten Quelle sichtbar bzw. im HTML/JSON-LD nachweisbar · **[Interpretation]** = Einschätzung des Analyse-Agenten · **[Offene Frage]** = nicht ermittelbar, muss geprüft werden · **[Chance für DZ]** = Handlungsoption.

**Methodik und Grenzen**
- Die Recherche nutzte WebSearch, WebFetch, curl (HTML und JSON-LD direkt aus dem Quelltext) und Mobil-Screenshots im integrierten Browser (Viewport 375×812). Cookie-Banner wurden nicht bestätigt.
- **[Fakt]** Das Suchwerkzeug liefert laut eigener Beschreibung nur US-Suchergebnisse. Die Trefferreihenfolge entspricht daher **nicht** den organischen Rankings von google.de. Rankingpositionen sind **nicht ermittelbar**. Es wird nur angegeben, über welche Suchanfrage ein Anbieter gefunden wurde.
- **[Fakt]** Bei den vier vorgegebenen Suchanfragen (S1–S4) standen fast nur Behörden-, Versicherer- und Ratgeberseiten oben (ADAC, ERGO, R+V, HUK, Allianz Direct, pkw.de, test.de). Private Zulassungsdienste kamen erst über Zusatzanfragen (S5–S7) hinzu.
- Es wurden keine Traffic- oder Suchvolumenzahlen geschätzt.

---

## 1. Kurzfazit

1. **[Interpretation]** Der engste Wettbewerber ist **bundeszulassung24.de**. Positionierung („ohne eID“, „persönlich geprüft“, „bundesweit“, „privater Zulassungsdienst“) und Preise sind fast deckungsgleich mit DZ (129,00 € gegenüber 128 €, Abmeldung 34,90 € gegenüber 34 €, Schilder 29,90 € gegenüber 29 €, Wunschkennzeichen 12,80 € gegenüber 12 €). BZ24 hat aber Online-Bestellung, ein Bearbeitungsversprechen von 30–60 Minuten, Trustpilot-Bewertungen und ein sehr großes Content- und Tool-Ökosystem.
2. **[Fakt]** Die Preisspanne für eine Zulassung inkl. amtlicher Gebühren reicht von **64,00 €** (digital-zulassen.de) über 99,99 € (onlinezugelassen.de, ohne Schilder) bis **134,90 €** (zulassung.digital). Die Abmeldung reicht von **8,00 €** (digital-zulassen.de) bis 49,90 €.
3. **[Interpretation]** Beim Preis liegt DZ im Mittelfeld. Beim Bearbeitungsversprechen ist DZ deutlich langsamer: Die Startseite nennt „1–3 Werktage“, die Wettbewerber werben mit Minuten bis 2 Stunden.
4. **[Fakt]** Die Marktführer im lokalen SEO setzen massiv auf programmatische Seiten. zulassung.de hat 882 Orte × 4 Seitentypen plus 713 Kennzeichenseiten, zulassung.digital hat 9.365 URLs in der Sitemap, BZ24 hat 104 Standort- und 410 i-Kfz-Status-Seiten. Die Seiten sind überwiegend Templates mit wenigen lokalen Datenpunkten.
5. **[Interpretation]** DZ ist strukturell bereits ähnlich aufgestellt (Sitemap: 710 Kennzeichen-, 405 Zulassungsstellen- und 41 Stadtseiten) und hat sauberes Schema.org. Die größten Lücken sind **Conversion und Vertrauen**: kein Online-Checkout, keine Bewertungen, keine Geld-zurück-Garantie, kein Status-Tracking und kein schnelles Bearbeitungsversprechen.
6. **[Interpretation]** Echte inhaltliche Differenzierung bieten fast alle Wettbewerber nicht: Es fehlen namentliche Autoren, Prüfdaten und belegte Fakten. Nur der ADAC liefert Autoren und Datum im Markup. Hier kann DZ mit E-E-A-T und transparenter Kalkulation punkten.
7. **[Interpretation]** Zwei Wettbewerber zeigen Schema- bzw. Bewertungsrisiken: zulassung.de wird von Trustpilot wegen irreführender Darstellung von Trustpilot-Inhalten markiert, und BZ24 setzt LocalBusiness-Markup mit Stadt-Geokoordinaten auf Stadtseiten ohne Standort ein. DZ sollte diese Fehler bewusst vermeiden.

---

## 2. Wettbewerber-Matrix

| Anbieter (gefunden über) | Positionierung | Zulassung / Abmeldung | Bearbeitungsversprechen | Ident / eID | Online-Zahlung | Bewertungen (sichtbar) | Garantie | Lokale Seiten | Tools | JSON-LD |
|---|---|---|---|---|---|---|---|---|---|---|
| **bundeszulassung24.de** (vorgegeben; auch S5) | Privat, bundesweit, ohne eID/BundID, persönlich geprüft [Q1] | 129,00 € / 34,90 € inkl. Gebühren [Q2] | 30–60 Min. [Q1] | Ausweis-/Passfoto-Upload, keine eID [Q8] | Ja; „VISA“ sichtbar, JSON-LD: Kreditkarte, Apple Pay [Q1] | Trustpilot 4,1 / 76 [Q12] | Geld zurück inkl. Behördengebühren [Q2] | 87 Stadt-/Kreisseiten + 410 i-Kfz-Status-Seiten [Q3][Q10] | Kostenrechner, Auswahl-Check, i-Kfz-Status [Q7][Q9] | Org, LocalBusiness, Service+Offer, FAQPage, WebAPI [Q1][Q4] |
| **onlinezugelassen.de** (vorgegeben; schnellzugelassen.de leitet hierhin weiter, S5) | Privat, „ohne eigene AusweisApp“, persönlich begleitet [Q13] | ab 99,99 € (Basis) / 39,99 € zzgl. Gebühren [Q13][Q15] | 1–2 Std. intern [Q14] | nicht beschrieben [Q14] | Ja, Stripe Checkout (JSON-LD) [Q14] | keine sichtbar; kein Trustpilot-Profil (404) [Q20] | Geld zurück, wenn digital nicht möglich [Q13] | keine [Q16] | Dokumentencheck, Status [Q13] | Org, Service, OfferCatalog, FAQPage [Q14] |
| **zulassung.de** (vorgegeben) | „Freies Service-Portal“, Wunschkennzeichen-Fokus, KBA-Projekt-Mitglied, DIN [Q21][Q27] | 129,90 € / 49,90 € [Q21] | ca. 10 Min. Eingabe; Freigabezeit nicht genannt [Q22] | Ausweis-Scan + digitale Unterschrift, keine eID/PIN [Q22] | Ja; Apple Pay, PayPal, Google Pay, Visa, MC, Rechnung, Klarna [Q21] | Google 4,9 / ca. 73.150 (onsite); Trustpilot 5.342 mit Warnhinweis [Q21][Q29] | Geld zurück [Q21] | 882 Orte × 4 Typen + 713 Kennzeichen [Q28] | Wunschkennzeichen-Live-Prüfung, Zulassungsstellen-Suche [Q21][Q25] | WebPage, Service+Offer, GovernmentOffice, Org [Q26] |
| **kroschke.de** (vorgegeben; Partner von ERGO/R+V, S1) | Marktführer-Anspruch, seit 1957, >500 Filialen [Q30] | 129 € / 39 € inkl. Gebühren [Q31][Q32] | digital: Minuten; Standard: 3–7 Werktage [Q31] | PIN-Codes, Online-Signatur/QES; eID nicht erwähnt [Q31] | Ja; PayPal, Rechnung, Visa, MC, SEPA [Q31] | Trustpilot 4,2 / 645 [Q35] | Abmeldung: Geld zurück [Q32] | keine; nur Standortfinder [Q30] | Konfigurator, Wunschkennzeichen-Abfrage, Überführungsrechner [Q30] | Startseite: JSON-LD fehlerhaft; Produktseiten: FAQPage [Q30][Q31] |
| **ADAC-Ratgeber** (S1, S2, S4) | Neutraler Ratgeber, kein Dienst [Q36] | – (nennt Behördengebühren: 12,80 € online / 2,10 € Abmeldung online) [Q36] | – | erklärt eID-Weg [Q36] | – | – | – | – | Erklärvideo, Link zum Kfz-Steuer-Rechner [Q36] | Article mit Autoren, Datum, VideoObject [Q36] |
| **zulassung.digital** (S3, S5) | Digitaler Zulassungsdienst, KBA-Projekt-Mitglied (blackbird GmbH) [Q38] | 134,90 € / 49,90 € [Q38] | ca. 10 Min., „sofort“ [Q38] | Selfie-Ident [Q38] | Ja; PayPal, Visa, MC, Klarna, Apple Pay, Google Pay [Q38] | Trustpilot 4,6 / 1.405 [Q41] | Geld zurück [Q38] | 9.365 URLs, ca. 1.054 Orte × ~10 Typen [Q40] | keine | Product + AggregateRating (4,6 / 1.395) [Q38] |
| **abmeldung.digital** (S6) | Reiner Abmeldedienst (blackbird GmbH) [Q42] | – / 49,90 € [Q42] | ca. 3 Min. [Q42] | Sicherheitscodes, kein Ausweis erwähnt [Q42] | „Online-Zahlung“ ohne Details [Q42] | Trustpilot 4,6 / 482 [Q43] | Geld zurück [Q42] | /staedte, /landkreise [Q42] | – | Product + AggregateRating (4,7 / 450) [Q42] |
| **digital-zulassen.de** (S5) | „Zentrale iKFZ-Plattform“, Software-Anbieter (Quotlix GmbH) [Q44][Q46] | 64,00 € / 8,00 € inkl. Gebühren [Q44] | nicht angegeben [Q44] | Ausweis-/Meldebescheinigungs-Upload, SMS-Code, Signaturlink, keine eID [Q45] | nicht ermittelbar [Q45] | keine [Q44] | Zahlung nur bei Erfolg [Q44] | keine [Q44] | Vorgangsfinder [Q44] | keins [Q44] |
| **ERGO Online-Kfz-Zulassung** (S1, S3) | Versicherer-Service, Durchführung durch Kroschke [Q47] | 129 € / Abmeldung nicht online [Q47] | iKfz ca. 5 Tage bis Kennzeichen [Q47] | Verimi [Q47] | PayPal, Kredit-/Debitkarte [Q47] | keine [Q47] | keine konkrete [Q47] | – | – | WebPage, FAQPage [Q47] |

Ergänzend nur kurz betrachtet: **zulassungdeutsch.land** (S7; Google 4,5 / 104, keine Preise sichtbar [Q48]) und **meinauto.de/lp/zulassungsservice** (S7; Kroschke-Service nur zusammen mit einer Fahrzeugbestellung [Q49]).

---

## 3. Detailbefunde je Anbieter

### 3.1 bundeszulassung24.de

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** H1 „Auto online anmelden, ummelden, abmelden“; Claims „Zulassung in 30-60 Min.“, „Auch ohne eID oder BundID“, „Festpreis inklusive Behördengebühren“ [Q1] |
| Betreiber | **[Fakt]** Impressum: Geschäftsbezeichnung „Bundeszulassung: Kfz-Zulassungsdienst & Fahrzeughandel“, Inhaber Emre Altinisik, Bremen, Gewerbeanmeldung, keine Rechtsform und kein Handelsregister, USt-ID vorhanden [Q5]. Gegründet im November 2025 [Q6]. |
| Preise | **[Fakt]** Neu-, Wiederzulassung und Umschreibung 129,00 €; Halteränderung im selben Bezirk 64,90 €; Abmeldung 34,90 €; Schilderversand +29,90 €; Wunschkennzeichen +12,80 €; DHL-Express-Versand der Unterlagen inklusive; Mengenrabatt 5–20 % innerhalb von 30 Tagen [Q2] |
| Garantie / Storno | **[Fakt]** Geld zurück inkl. Behördengebühren, wenn der Antrag nicht durchführbar ist; kostenlose Stornierung bis Abschluss; Probleme werden „innerhalb von 4 Stunden“ gemeldet [Q2] |
| Ident | **[Fakt]** Foto von Personalausweis oder Reisepass, persönliche Prüfung; keine eID, PIN oder AusweisApp [Q8] |
| Bestellprozess | **[Fakt]** Formular /form-v2 je Leistung, alternativ „Im Chat beauftragen“ (/form-v3), Kundenkonto mit Dashboard; „Ø 9 Min. bis Ihr Auftrag gestartet ist“ [Q1] |
| Trust | **[Fakt]** Trustpilot 4,1 bei 76 Bewertungen, davon 17 % 1-Stern [Q12]; auf der Seite nur ein Link, keine Note [Q1]. „10.000+ Zulassungen“, ISO 27001 (Rechenzentren) [Q1]. Keine Teamnamen oder Fotos [Q6]. |
| Content | **[Fakt]** Die Sitemap hat 971 URLs: 380 /wissen/, 410 /i-kfz-status/, 104 /standorte/, 36 /blog/ [Q10]. Die Wissensdatenbank reicht bis zu Bußgeld- und Führerscheinthemen [Q1]. Es gibt Seiten /redaktionsrichtlinien und /llms.txt [Q1]. |
| Lokale Seiten | **[Fakt]** 87 Stadt- und Kreisseiten nach Muster `/standorte/{bundesland}/{stadt}`; Kopfzeile nennt „~80 Standorte“ [Q3]. Die Berlin-Seite hat ca. 1.000–1.200 Wörter, eine PLZ-Liste, Bürgeramt-Adressen, Umweltzonen-Hinweise und einen großen Template-Anteil [Q4]. |
| i-Kfz-Status-Seiten | **[Fakt]** Seite je Behörde mit Erreichbarkeits-Monitoring des i-Kfz-Portals (7/30 Tage, Störungshistorie); Basis: KBA-Daten mit Stand 15.09.2026 [Q9] |
| Tools | **[Fakt]** Zulassungskosten-Rechner (Vergleich Behörde und BZ24, Gebührenspannen ohne Quellenangabe) [Q7]; Auswahl-Check; Vergleichstabelle Behörde / i-Kfz / BZ24 [Q1] |
| Strukturierte Daten | **[Fakt]** Organization, WebSite+SearchAction, LocalBusiness, WebAPI, BreadcrumbList, mehrere Service mit Offer (priceValidUntil 2026-12-31), OfferCatalog [Q1]. Auf Stadtseiten zusätzlich LocalBusiness mit Berliner Geokoordinaten und nur „Berlin“ als Adresse sowie FAQPage [Q4]. WebSite.creator nennt eine Agentur-Adresse in Istanbul [Q4]. |
| Mobil | **[Fakt]** Sticky Topbar „Zulassung in 30-60 Min. / Jetzt starten“, schwebende WhatsApp- und Chat-Buttons, Barrierefreiheits-Widget, vollbreiter CTA „Online-Zulassung starten“ (Screenshot 375 px, Q1) |
| Kontakt | **[Fakt]** WhatsApp und E-Mail; keine Telefonnummer sichtbar [Q1] |

- **[Interpretation]** Das LocalBusiness-Markup mit Stadt-Koordinaten auf Seiten ohne physischen Standort widerspricht dem Sinn des Typs. Daraus kann ein Risiko für Rich Results bzw. das Vertrauen entstehen.
- **[Interpretation]** Die i-Kfz-Status-Seiten sind ein origineller, datengetriebener Linkmagnet. Ihre Messung bezieht sich laut eigener Aussage aber auf die gemeinsame Plattform und nicht auf das einzelne Behördenportal.
- **[Interpretation]** Das junge Unternehmen (Gründung 11/2025) ohne Rechtsform und mit einer 1-Stern-Quote von 17 % auf Trustpilot ist angreifbar, wenn DZ als UG mit transparenter Firmierung auftritt.

### 3.2 onlinezugelassen.de

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** H1 „Auto online zulassen.“ / „Ohne eigene AusweisApp.“; klare Aussage „privater Dienstleister, keine Behörde“ [Q13][Q17] |
| Betreiber | **[Fakt]** Impressum nennt eine Einzelperson in Kassel; keine Rechtsform, kein Register, keine USt-ID [Q17] |
| Preise | **[Fakt]** Basis 99,99 € (inkl. MwSt. und amtlicher Zulassungsgebühren, **ohne** Schilder); Komfort 129,99 € (inkl. Prägung und Versand); Abmeldung 39,99 € Servicepreis **zzgl.** amtlicher Gebühren; Kurzzeitkennzeichen 129 € / 149 €; Ausfuhrkennzeichen 350 €; „Expertencheck“ 19,99 €, wird bei Auftrag angerechnet [Q13][Q15] |
| Bearbeitung | **[Fakt]** 1–2 Stunden nach Zahlung und vollständigen Unterlagen (intern, ohne Behörde); Abmeldung: Prüfung innerhalb 1 Werktag [Q13][Q14] |
| Garantie | **[Fakt]** Paketpreis wird voll erstattet, wenn die digitale Zulassung nicht möglich ist [Q13] |
| Ident | **[Offene Frage]** Das Ident-Verfahren wird nicht beschrieben [Q14] |
| Bestellung / Zahlung | **[Fakt]** Paket wählen → online bezahlen → Unterlagen per geschütztem Link; JSON-LD `paymentAccepted`: „Payment methods displayed in the live Stripe Checkout“ [Q14] |
| Trust | **[Fakt]** Keine Bewertungen sichtbar [Q13]; Trustpilot-Profil nicht vorhanden (404) [Q20] |
| Content | **[Fakt]** 9 Ratgeberartikel ohne Autor und Datum [Q16]; Sitemap 46 URLs inkl. 6 Sprachversionen (EN, PL, UK, RU, TR, AR) [Q18] |
| Lokale Seiten | **[Fakt]** keine [Q16] |
| Strukturierte Daten | **[Fakt]** Organization, WebSite, Service + OfferCatalog, FAQPage [Q14][Q15] |
| Mobil | **[Fakt]** Im Hero stehen drei Leistungskarten mit Preis direkt sichtbar („Auto anmelden ab 99,99 €“ …), der Hinweis „Privater Dienstleister, keine Behörde“ steht above the fold (Screenshot, Q13) |
| Kontakt | **[Fakt]** Telefon (Mobilnummer), WhatsApp mit Vorbefüllung, Kontaktformular [Q13] |
| Domain-Netz | **[Fakt]** schnellzugelassen.de leitet per 308 auf onlinezugelassen.de weiter [Q19] |

- **[Interpretation]** Der Preisanker „ab 99,99 €“ entsteht durch Weglassen der Schilder. Mit Schildern und Versand (129,99 €) liegt das Angebot auf dem Niveau von DZ (128 € + 29 € = 157 € mit Schildern) bzw. darunter.
- **[Interpretation]** Die Mehrsprachigkeit (6 Sprachen) ist ein Alleinstellungsmerkmal im Feld und adressiert Zugezogene ohne eID, also dieselbe Zielgruppe wie DZ.

### 3.3 zulassung.de

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** Der Startseiten-Title zielt auf „Wunschkennzeichen online reservieren“; Claim „Freies Service-Portal für KFZ Zulassungen“; Siegel KBA-Digitalisierungsprojekt („Offizielles Mitglied“) und DIN-Register-Nr. [Q21][Q22] |
| Betreiber | **[Fakt]** Zulassung.de GmbH, Schwerte, HRB 13027 AG Hagen; B2B-Ableger zl.digital; Mutterseite kennzeichenservices.de [Q21][Q27] |
| Preise | **[Fakt]** Zulassung 129,90 € „alle Gebühren inklusive“, Versand kostenlos [Q22]; Ummeldung „ab 59,90 €“ [Q21]; Abmeldung 49,90 € [Q21][Q23]; Kennzeichen 29,90 € (DHL); Carbonoptik +9,90 €; Umweltplakette 19,90 €; Amtsgebühr für Wunschkennzeichen-Zuteilung bis 12,80 € [Q24]; Wunschkennzeichen-Paket 49,90 € (2 Schilder inkl. Reservierung, zzgl. etwaiger Amtsgebühren) [Q21] |
| Widersprüche | **[Fakt]** Die Startseite nennt die Abmeldung „inkl. aller Gebühren“ [Q21], die Abmeldeseite nur „inkl. MwSt.“ [Q23] |
| Ident | **[Fakt]** Ausweis per Handy oder Webcam scannen, digitale Unterschrift; keine App, keine eID, keine PIN [Q22] |
| Formular | **[Fakt]** Mehrstufiger Wizard mit 14 Schritten: Vorgang, Status, Bezirk per PLZ, Unterlagenliste, Kontakt, Fahrzeugtyp, Foto-Auslesen von ZB I/II, Kennzeichenwahl, Kennzeichen- und Plakettenbestellung, eVB (kann nachgereicht werden), IBAN per Foto, Halterdaten, danach Upsell „Carbon-Upgrade“ [Q24] |
| Zahlung | **[Fakt]** Apple Pay, PayPal, Google Pay, Visa, Mastercard, Rechnung, Klarna [Q21] |
| Trust | **[Fakt]** Google-Badge 4,9 bei 73.158 (Startseite) bzw. 73.153 Rezensionen (Abmeldeseite) [Q21][Q23]. Trustpilot: 5.342 Bewertungen, zeigt aber den Warnhinweis, das Unternehmen stelle Trustpilot-Inhalte irreführend dar; Bewertungen sind deshalb nicht verfügbar [Q29]. |
| Lokale Seiten | **[Fakt]** Sub-Sitemaps mit je 882 URLs für /kfz-zulassung-online/{ort}/, /abmeldung/{ort}/, /wunschkennzeichen/{ort}/, /zulassungsstellen/{ort}/; dazu 713 /kennzeichen/{kürzel}/, 24 Kennzeichenlisten, 16 Bundesländer [Q28]. Beispiel Aalen: ca. 900–1.000 Wörter, Adresse, Telefon und Öffnungszeiten der Zulassungsstelle, Kürzel, Nachbarorte mit Entfernung, sonst Template-Text [Q26]. |
| Interne Verlinkung | **[Fakt]** Lokale Seiten verlinken die drei Schwesterseiten desselben Orts und Nachbarorte [Q26] |
| Strukturierte Daten | **[Fakt]** Lokale Seiten: WebPage + Service (areaServed AdministrativeArea, Offer 129,90 €) + **GovernmentOffice** für die Zulassungsstelle + Organization [Q26]; keine FAQPage auf den geprüften Seiten [Q21][Q23][Q26] |
| E-E-A-T | **[Fakt]** Keine Autoren, kein Prüfdatum, keine FAQ auf der Startseite [Q21][Q26] |
| Mobil | **[Fakt]** Ein Cookie-Overlay verdeckt den ersten Viewport (Optionen „Alle akzeptieren“, „Optionale ablehnen“, „Einstellungen“); im Header DIN-Siegel und Google-Badge (Screenshot, Q22) |

- **[Interpretation]** zulassung.de ist SEO-seitig der Maßstab für programmatische Ortsseiten: ein Ort mit vier Intents (Zulassung, Abmeldung, Wunschkennzeichen, Zulassungsstelle), jeweils mit echten Behördendaten. Das GovernmentOffice-Markup für die Behörde ist sauber getrennt vom eigenen Service.
- **[Interpretation]** Der Trustpilot-Warnhinweis ist ein Reputationsrisiko für zulassung.de, das in Vergleichsartikeln sachlich thematisiert werden kann. Ein Wettbewerber-Bashing empfiehlt sich nicht.

### 3.4 kroschke.de

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** Eigenangabe „Deutschlands Nr. 1 für Fahrzeugzulassungen“, Familienunternehmen seit 1957, >500 Filialen und Zulassungsdienste, Mitglied im KBA-Digitalisierungsprojekt [Q30] |
| Betreiber | **[Fakt]** Christoph Kroschke GmbH, Ahrensburg [Q30] |
| Preise | **[Fakt]** Online-Zulassung 129 € „Inklusive aller Gebühren“, DHL-Abholung und Rückversand inklusive [Q31]; Abmeldung 39 € brutto inkl. aller amtlichen Gebühren [Q32]; Autokennzeichen im Shop 12,50 € zzgl. Versand (4,60 € Standard, 9,95 € UPS Express, 14,95 € DHL Express) [Q30]; Newsletter-Rabatt 10 € auf eine Zulassung [Q30] |
| Nicht ermittelbar | **[Offene Frage]** Preise für Ummeldung, Halterwechsel und Wunschkennzeichen im Direktkanal (nur im Konfigurator) [Q34] |
| Prozess | **[Fakt]** Zweigleisig: i-Kfz digital (PINs freilegen, Online-Signatur, vorläufiger Nachweis per E-Mail, Papiere binnen 10 Tagen) oder Standard-Service (Dokumente per DHL, 3–7 Werktage, teils 24 h) [Q31]. Checkout in 6 Schritten [Q34]. |
| Garantie | **[Fakt]** Abmeldung mit Geld-zurück-Garantie [Q32]; bei der Zulassung nur die Überschrift „Garantiert erfolgreich“ ohne Bedingungen; ISO 9001 / 27001 [Q31] |
| Zahlung | **[Fakt]** PayPal, Rechnung (bei der Abmeldung nur für Firmen), Visa, Mastercard, SEPA [Q31][Q32] |
| Trust | **[Fakt]** Trustpilot 4,2 / 645, 17 % 1-Stern [Q35]; die Seite „Kundenmeinungen“ nennt Plattformen ohne Zahlen [Q33] |
| Content | **[Fakt]** Ratgeber und Magazin (/ratgeber, /magazin/post/…), Kennzeichen-Shop, Überführung, Branchenlösungen [Q30] |
| Lokale Seiten | **[Fakt]** keine Stadtseiten, nur der Standortfinder [Q30]; keine /sitemap.xml unter dem Standardpfad (HTTP 404) |
| Strukturierte Daten | **[Fakt]** Der Corporation-JSON-LD-Block der Startseite ist syntaktisch ungültig (fehlendes Komma in `alternateName`) [Q30]; Produktseiten: nur FAQPage [Q31][Q32] |
| Vertriebspartner | **[Fakt]** ERGO (und laut Suchsnippet R+V) lassen über Kroschke zulassen [Q47][S1]; meinauto.de bündelt den Kroschke-Service mit Fahrzeugbestellungen [Q49] |
| Mobil | **[Fakt]** Ein Cookie-Banner liegt über dem Hero („Nein, anpassen“ / „Alle akzeptieren“); Header mit Suche, Konto und Warenkorb (Screenshot, Q31) |

- **[Interpretation]** Kroschke gewinnt über Marke, Filialnetz und B2B-/Versicherer-Kanäle, nicht über Content oder lokale Seiten. Gegen Kroschke bringt DZ nur die Nische „ohne eID, ohne Codes, persönlich“ voran, denn der digitale Kroschke-Weg setzt freigelegte PIN-Codes voraus.

### 3.5 ADAC-Ratgeber

| Dimension | Befund |
|---|---|
| Seiten | **[Fakt]** „Auto online zulassen oder abmelden? So funktioniert die Online-Kfz-Zulassung“ [Q36]; Hub „Wichtiges zur Kfz-Zulassung“ mit Unterseiten zu Fahrzeugschein verloren, Kennzeichenliste, grünes Kennzeichen, E-Kennzeichen, Saison-, Kurzzeitkennzeichen, Kennzeichenmitnahme u. a. [Q37] |
| Inhalte | **[Fakt]** Behördengebühren online: Zulassung 12,80 €, Außerbetriebsetzung 2,10 € (vor Ort meist 30 € bzw. 15,90 €). Voraussetzungen: eID + PIN, Kartenleser oder Smartphone, Sicherheitscodes (ZB I seit 2015, ZB II seit 2018). Mit Zulassungsdiensten können die Kosten „deutlich höher“ ausfallen. [Q36] |
| E-E-A-T | **[Fakt]** Zwei namentliche Autoren mit Autorenseiten; datePublished 2019-11-18, dateModified 2026-07-22; Video eines ADAC-Juristen [Q36] |
| Strukturierte Daten | **[Fakt]** Article (author als Person mit URL), VideoObject, BreadcrumbList [Q36]; Hub nur BreadcrumbList [Q37] |
| Tools | **[Fakt]** Kein eigener Zulassungsrechner, Link zum Kfz-Steuer-Rechner [Q36] |

- **[Interpretation]** Der ADAC besetzt die informationale Suchintention („wie funktioniert…“, „was kostet…“) mit hoher Autorität. Gegen ihn gewinnt DZ dort nicht direkt. Sinnvoller sind Long-Tail-Themen, die der ADAC nicht abdeckt: „i-Kfz funktioniert nicht“, „keine eID“, „Sicherheitscode unleserlich“, „Ausländer ohne eID-fähigen Ausweis“.
- **[Fakt]** Der ADAC nennt die niedrigen Online-Behördengebühren (12,80 € / 2,10 €) [Q36]. **[Interpretation]** Kunden vergleichen also 128 € mit 12,80 €. DZ braucht eine transparente Erklärung, was der Servicepreis leistet.

### 3.6 zulassung.digital (blackbird GmbH)

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** „Fahrzeug online anmelden“, digitaler Zulassungsdienst, Siegel „Offizielles Mitglied“ im KBA-Digitalisierungsprojekt, PDF zur KBA-Softwareabnahme [Q38] |
| Preise | **[Fakt]** Zulassung 134,90 €; Ummeldung (Halterwechsel oder Umzug in anderen Bezirk) 134,90 €; Umzug im Bezirk 64,90 €; Abmeldung 49,90 € „inklusive aller Kosten & Gebühren“; Wunschkennzeichen 49,80 € (2 Schilder inkl. Reservierung, Versand kostenlos) [Q38] |
| Widersprüche | **[Fakt]** Der Footer spricht von einer Servicegebühr „zusätzlich zu den behördlichen Gebühren“ [Q38], die Stadtseite nennt „ab“-Preise und amtliche Gebühren zusätzlich [Q39]. **[Offene Frage]** Sind die amtlichen Gebühren in den 134,90 € enthalten? |
| Ident / Tempo | **[Fakt]** Selfie-Ident; Zulassung „sofort“, ca. 10 Min.; Bescheinigung als PDF [Q38] |
| Zahlung | **[Fakt]** PayPal, Visa, Mastercard, Klarna, Apple Pay, Google Pay [Q38] |
| Trust | **[Fakt]** Trustpilot 4,6 / 1.405 (Profil beansprucht 01/2025) [Q41]; JSON-LD `Product` mit AggregateRating 4,6 / 1.395 [Q38] |
| Lokale Seiten | **[Fakt]** Die Sitemap hat 9.365 URLs, je ca. 1.054 für /zulassungsdienst/, /wunschkennzeichen/, /kennzeichen/, /zulassungsstelle/, /strassenverkehrsamt/ sowie je ca. 759 für /stadt/, /behoerde/, /abmeldung/, /ummeldung/ [Q40]. Beispiel Nürnberg: Ortsname nur in Kicker und Title, keine Behördenadresse, kein Kürzel, eine FAQ-Antwort fehlt, ca. 600–700 Wörter [Q39]. |
| Content / E-E-A-T | **[Fakt]** Kein Ratgeber oder Blog; keine Autoren; nur E-Mail-Support [Q38]. Impressumsdaten waren per Abruf nicht lesbar (clientseitig gerendert): **nicht ermittelbar**. |
| Mobil | **[Fakt]** Ein Cookiebot-Overlay verdeckt den Viewport; auf der ersten Ebene sind nur „Alle zulassen“ und „Anpassen“ sichtbar, keine direkte Ablehnen-Option (Screenshot, Q38) |

- **[Interpretation]** Die Seite hat sehr viel Masse, aber dünne Inhalte. Es ist die riskanteste Variante programmatischer SEO („Doorway“-Charakter). DZ sollte nicht in diese Richtung skalieren.
- **[Interpretation]** Self-serving AggregateRating auf `Product` ist für eine Dienstleistung grenzwertig. Rich-Result-Fähigkeit und Richtlinienkonformität sind fraglich.

### 3.7 abmeldung.digital (blackbird GmbH)

| Dimension | Befund |
|---|---|
| Positionierung / Preis | **[Fakt]** H1 „Auto online abmelden“, 49,90 € „inklusive aller Gebühren“ (Footer widersprüchlich: Servicegebühr zusätzlich zu behördlichen Gebühren); ca. 3 Min.; Geld-zurück-Garantie [Q42] |
| Prozess | **[Fakt]** 5 Schritte: Vorbereitung, E-Mail/Kennzeichen/FIN, Sicherheitscode ZB I, Sicherheitscode Kennzeichen, Zahlung → PDF; kein Ausweis erwähnt [Q42] |
| Trust | **[Fakt]** Trustpilot 4,6 / 482 [Q43]; sechs Kundenstimmen auf der Seite; „Über 10.000 zufriedene Kunden“ [Q42]; JSON-LD Product + AggregateRating 4,7 / 450 [Q42] |
| Lokale Seiten | **[Fakt]** /staedte und /landkreise im Footer [Q42] |

- **[Interpretation]** Das Modell „eine Domain je Intent“ (zulassung.digital und abmeldung.digital vom selben Betreiber) zeigt, dass die Abmeldung als eigenständiges, hochfrequentes Einstiegsprodukt bespielt wird.

### 3.8 digital-zulassen.de (Quotlix GmbH)

| Dimension | Befund |
|---|---|
| Positionierung | **[Fakt]** „Zentrale iKFZ-Plattform“, KBA-geprüfte Software, Anbindung über die KBA-GKS-Schnittstelle, B2B-Software für Autohäuser, Flotten und Zulassungsdienste [Q44] |
| Betreiber | **[Fakt]** Quotlix GmbH, Ritterhude, HRB 209997 AG Walsrode [Q46] |
| Preise | **[Fakt]** Neu-, Wiederzulassung, Umschreibung/Halterwechsel je **64,00 €**, Abmeldung **8,00 €**, inkl. aller Zulassungsgebühren und Postzusendung; Gebühr nur bei Erfolg [Q44]; Kennzeichen 2 Stück 39,95 € inkl. Express; Feinstaubplakette 19,99 € [Q45] |
| Ident | **[Fakt]** Ausweis- oder Meldebescheinigungs-Upload mit Datenabgleich, SMS-Code, Signaturlink per E-Mail, Dauervollmacht wiederverwendbar; eID laut Hilfe nicht erforderlich [Q45] |
| Formular | **[Fakt]** 7 Hauptschritte mit ca. 17 Unterabschnitten, inkl. KBA-Wirtschaftszweig, Firmendaten und vertretungsberechtigter Person [Q45] |
| Trust / Content | **[Fakt]** Keine Bewertungen, kein FAQ, keine Stadtseiten, kein JSON-LD [Q44] |

- **[Interpretation]** digital-zulassen.de ist ein Preisbrecher: Es kostet die Hälfte von DZ, setzt aber auf Selbstbedienung, ohne persönliche Betreuung, ohne Bewertungen und mit wenig Inhalt. Wenn das Angebot sichtbar wird, setzt es den Preisanker für Selbermacher. DZ muss den Mehrwert (persönliche Prüfung, Vollmacht-Weg, Problemfälle) klar begründen.
- **[Offene Frage]** Ob der 64-€-Prozess bei Fahrzeugpapieren ohne verwendbare Sicherheitscodes funktioniert, ist nicht ermittelbar.

### 3.9 ERGO Online-Kfz-Zulassung (Durchführung: Christoph Kroschke GmbH)

| Dimension | Befund |
|---|---|
| Preise | **[Fakt]** Neu-/Wiederzulassung, Halterwechsel und Ummeldung je 129,00 €; Wunschkennzeichen inkl. Prägung und Plaketten 32,80 €; Zufallskennzeichen 20,80 €; vorhandenes Kennzeichen (Plaketten) 16,00 €; Feinstaubplakette 6,00 €; Abmeldung online nicht möglich [Q47] |
| Prozess | **[Fakt]** iKfz-Service mit Verimi-Verifizierung (ca. 5 Tage bis Kennzeichen) oder Komfort-Service per DHL-Abholung; nur Privatpersonen, nur bis 3,5 t [Q47] |
| Strukturierte Daten | **[Fakt]** WebPage mit datePublished/dateModified, FAQPage mit 9 Fragen [Q47] |

- **[Interpretation]** Versicherer-Kanäle stehen für „kfz zulassung online“ und „zulassungsdienst online“ oben (S1, S3). Für DZ sind sie Wettbewerb um Sichtbarkeit, aber auch potenzielle B2B-Partner.

### 3.10 Kurz betrachtet

- **zulassungdeutsch.land**: **[Fakt]** H1 „Fahrzeug online zulassen“, keine Preise sichtbar (Platzhalter „--,-- €“), Google 4,5 / 104, Geld-zurück-Garantie, kein Betreiber auf der Seite, kein JSON-LD [Q48].
- **meinauto.de/lp/zulassungsservice**: **[Fakt]** Kroschke-Zulassung als Add-on zur Fahrzeugbestellung, 5–10 Werktage, 2 Jahre Kennzeichen-Versicherung (ARAG), keine Einzelpreise [Q49].

---

## 4. Preisvergleich

Alle Preise brutto. „inkl.“ / „zzgl.“ bezieht sich auf amtliche Gebühren bzw. den genannten Bestandteil. „n. e.“ = nicht ermittelbar.

| Anbieter | Zulassung (Neu) | Ummeldung (Bezirkswechsel) | Halterwechsel | Abmeldung | Kennzeichen (Paar) | Wunschkennzeichen | Versand | Quelle |
|---|---|---|---|---|---|---|---|---|
| **DeutscheZulassung** | 128 € inkl. amtl. Gebühren und Versand | 128 € inkl. | 128 € inkl. | 34 € | zzgl. 29 € | zzgl. 12 € | inkl. | Vorgabe; Q50 |
| bundeszulassung24.de | 129,00 € inkl. | 129,00 € inkl. (Umschreibung); 64,90 € bei Umzug im selben Bezirk | 129,00 € inkl. (Umschreibung) | 34,90 € inkl. | zzgl. 29,90 € (Schilderversand) | zzgl. 12,80 € | Unterlagen per DHL Express inkl. | Q2 |
| onlinezugelassen.de | 99,99 € inkl. (ohne Schilder) / 129,99 € inkl. Schilder und Versand | 99,99 € / 129,99 € | 99,99 € / 129,99 € | 39,99 € **zzgl.** amtl. Gebühren | im Komfort-Paket inkl. (Differenz 30 €) | n. e. | Papiere per Post in allen Paketen inkl. | Q13, Q15 |
| zulassung.de | 129,90 € inkl. | ab 59,90 € inkl. (Startseite) | n. e. | 49,90 € (inkl.-Angabe widersprüchlich) | 29,90 € (DHL) | Paket 49,90 € (2 Schilder inkl. Reservierung, zzgl. etwaiger Amtsgebühren); im Antrag Amtsgebühr bis 12,80 € | kostenlos | Q21–Q24 |
| kroschke.de | 129 € inkl. | n. e. | n. e. | 39 € inkl. | 12,50 € je Kennzeichen (Shop) zzgl. Versand | n. e. | Zulassung: DHL-Abholung und Rückversand inkl.; Shop 4,60–14,95 € | Q30–Q32 |
| zulassung.digital | 134,90 € (inkl.-Status widersprüchlich) | 134,90 € | 134,90 € | 49,90 € inkl. | n. e. (nur im Wunschkennzeichen-Paket) | 49,80 € (2 Schilder inkl. Reservierung) | Wunschkennzeichen-Versand kostenlos | Q38, Q39 |
| abmeldung.digital | – | – | – | 49,90 € („inkl. aller Gebühren“, Footer widersprüchlich) | – | – | – | Q42 |
| digital-zulassen.de | 64,00 € inkl. | 64,00 € inkl. | 64,00 € inkl. | 8,00 € inkl. | 39,95 € inkl. Express | n. e. | Postzusendung inkl. | Q44, Q45 |
| ERGO (Kroschke) | 129,00 € (inkl.-Status n. e.) | 129,00 € | 129,00 € | nicht online | 20,80 € (Zufall, inkl. Prägung/Plaketten) | 32,80 € (inkl. Reservierung, Prägung, Plaketten) | DHL Hol-/Bringservice kostenlos | Q47 |
| Behörde online (Referenz ADAC) | 12,80 € Gebühr | – | – | 2,10 € Gebühr | – | – | – | Q36 |

- **[Interpretation]** DZ liegt bei Zulassung, Abmeldung, Schildern und Wunschkennzeichen jeweils etwa 1 € unter bundeszulassung24.de. Das ist kein wahrnehmbarer Preisvorteil. Die Differenzierung muss über Leistung, Vertrauen und Tempo laufen.
- **[Interpretation]** Bei Adressänderung bzw. Umzug im selben Bezirk liegen DZ (64 €), BZ24 (64,90 €) und zulassung.digital (64,90 €) gleichauf. zulassung.de wirbt mit „ab 59,90 €“.
- **[Interpretation]** Die Komplettkosten mit neuen Schildern liegen bei DZ bei 157 €, bei BZ24 bei 158,90 €, bei onlinezugelassen.de (Komfort) bei 129,99 € und bei zulassung.de bei 159,80 € (129,90 + 29,90). onlinezugelassen.de ist im Komplettpaket rund 27 € günstiger als DZ.
- **[Chance für DZ]** Der Rechner sollte einen ehrlichen Gesamtpreis inkl. Schildern ausweisen. Die meisten Wettbewerber trennen die Bestandteile unklar oder widersprüchlich (zulassung.de, zulassung.digital, abmeldung.digital).

---

## 5. Content-Gaps und Tool-Gaps von DeutscheZulassung

Ausgangslage DZ: **[Fakt]** Die Sitemap enthält 1.214 URLs: 710 /kennzeichen/, 405 /zulassungsstelle/, 41 /kfz-zulassung/{stadt}/, 16 Ratgeberartikel, 14 Leistungsseiten, 5 Gewerbeseiten, 3 Rechner-URLs (Übersicht, Kfz-Steuer, Behördengang) und 3 Vorlagen-URLs (Vollmacht, Checkliste) [Q51]. JSON-LD: LocalBusiness, WebSite, Service+Offer, FAQPage, BreadcrumbList, Article mit Person als Autor [Q50]. Die Startseite nennt „Bearbeitung: 1–3 Werktage“ und hat keine Erwähnung von Garantie, Bewertungen oder Zahlungsarten [Q50].

### 5.1 Conversion- und Vertrauens-Gaps (größter Hebel)

| Gap | Wer hat es | Belegt durch |
|---|---|---|
| Online-Checkout mit Sofortzahlung (PayPal, Apple Pay, Karte, Klarna) | BZ24, onlinezugelassen, zulassung.de, Kroschke, zulassung.digital, ERGO | Q1, Q14, Q21, Q31, Q38, Q47 |
| Konkretes Tempo-Versprechen (Minuten oder Stunden statt Werktage) | BZ24 (30–60 Min.), onlinezugelassen (1–2 Std.), zulassung.digital (ca. 10 Min.) | Q1, Q14, Q38 |
| Geld-zurück-Garantie mit Bedingungen | BZ24, onlinezugelassen, zulassung.de, zulassung.digital, abmeldung.digital, Kroschke (Abmeldung) | Q2, Q13, Q21, Q38, Q42, Q32 |
| Sichtbare Bewertungen (Trustpilot/Google) | zulassung.digital, abmeldung.digital, Kroschke, BZ24, zulassung.de | Q41, Q43, Q35, Q12, Q21 |
| Auftragsstatus-Abfrage / Kundenkonto | onlinezugelassen (/status), BZ24 (Dashboard) | Q13, Q1 |
| Vorab-Dokumentencheck als Produkt | onlinezugelassen („Expertencheck“ 19,99 €, wird angerechnet) | Q13 |
| Mengenrabatt für Mehrfachaufträge | BZ24 | Q2 |
| Mehrsprachigkeit | onlinezugelassen (6 Sprachen) | Q18 |

### 5.2 Tool-Gaps

| Tool | Wer hat es | DZ |
|---|---|---|
| Kosten-Vergleichsrechner Behörde / i-Kfz / Dienst | BZ24 (ohne Quellenangaben) | **[Offene Frage]** Ob /rechner/behoerdengang/ das abdeckt, wurde nicht im Detail geprüft. |
| Wunschkennzeichen-Verfügbarkeitsprüfung live | zulassung.de, Kroschke | fehlt (nur Ratgeber und Leistungsseite) |
| i-Kfz-Portal-Status je Behörde | BZ24 (410 Seiten) | fehlt |
| Vorgangsfinder („welcher Vorgang passt?“) | BZ24, digital-zulassen.de | **[Offene Frage]** Die Startseite hat eine Vorgangsauswahl, aber keinen Entscheidungsbaum. |
| Foto-Auslesen von ZB I/II und IBAN im Formular | zulassung.de | **[Offene Frage]** nicht geprüft |
| Zulassungsstellen-Suche nach Kürzel oder PLZ | zulassung.de | **[Offene Frage]** DZ hat 405 Zulassungsstellenseiten; eine Suchfunktion wurde nicht geprüft. |

### 5.3 Content-Gaps

- **[Fakt]** BZ24 hat 380 Wissensseiten, u. a. zu Sicherheitscodes, digitalem Fahrzeugschein, CoC, FIN, H-, Saison- und Kurzzeitkennzeichen, Import-Zulassung, HU-Wiederzulassung, „i-Kfz nicht möglich“ und Zulassungsdienst-Vergleich [Q1]. **[Interpretation]** DZ fehlen mit 16 Ratgebern vor allem Themen zu Fahrzeugtypen (Motorrad, Anhänger, Wohnmobil), Import/CoC, Sonderkennzeichen (H, E, Saison, Kurzzeit, Ausfuhr) und „Zulassung für Ausländer / ohne deutschen Ausweis“.
- **[Fakt]** Kroschke und onlinezugelassen bieten Kurzzeit- und Ausfuhrkennzeichen mit Preis an (onlinezugelassen: 129/149 € bzw. 350 €) [Q13][Q30]. DZ: „auf Anfrage“ (Vorgabe).
- **[Fakt]** zulassung.de bespielt je Ort vier Intents [Q28]. **[Interpretation]** DZ hat getrennte Stadt- (41) und Zulassungsstellen-Seiten (405), aber keine ortsbezogenen Abmelde- oder Wunschkennzeichen-Seiten. Ob sich das lohnt, hängt von Qualität und Indexierungsstrategie ab (siehe `local-pages-index-decision.csv`).
- **[Fakt]** Nur der ADAC zeigt Autoren und Datum im Markup [Q36]; DZ hat ein Article-Schema mit Person auf Ratgeberseiten [Q50]. **[Interpretation]** Hier ist DZ bereits besser als alle Dienstleister. Der Vorsprung lässt sich mit sichtbaren Prüfdaten und Quellen zur GebOSt ausbauen.
- **[Fakt]** BZ24 hat eigene Seiten /redaktionsrichtlinien, /sicherheit-und-transparenz, /ueber-uns/ist-serioes und /vermittlungsrahmen [Q1]. **[Interpretation]** Die Seriositätsfrage („ist X seriös?“) wird aktiv bespielt; DZ hat /datensicherheit und /ueber-uns, aber kein Pendant zu „Ist DeutscheZulassung seriös?“.

---

## 6. Chancen für DeutscheZulassung (priorisiert)

| Prio | Chance | Begründung |
|---|---|---|
| 1 | **[Chance für DZ]** **Online-Bestellung mit Sofortzahlung** einführen (mindestens PayPal, Karte, Apple/Google Pay), alternativ „Zahlung erst nach erfolgreicher Prüfung“ | Alle relevanten Wettbewerber außer digital-zulassen.de (n. e.) verkaufen direkt online (Abschnitt 5.1). Anfrage per Formular, WhatsApp oder E-Mail bedeutet einen zusätzlichen Schritt bei preislicher Parität mit BZ24. |
| 2 | **[Chance für DZ]** **Bearbeitungsversprechen schärfen**: zwischen „Prüfung durch Mitarbeiter in X Std. (werktags)“ und „Behördenfreigabe“ trennen | „1–3 Werktage“ wirkt neben „30–60 Min.“ (BZ24) und „1–2 Std.“ (onlinezugelassen) langsam. onlinezugelassen zeigt die ehrliche Variante: interne Bearbeitungszeit plus Hinweis, dass die Behörde nicht garantiert wird [Q14]. |
| 3 | **[Chance für DZ]** **Geld-zurück-Garantie** mit klaren Bedingungen (z. B. volle Erstattung inkl. Gebühren, wenn der Vorgang nicht durchführbar ist) | Garantien sind Standard (6 von 9 Anbietern). Ohne Garantie und ohne Bewertungen fehlt DZ jeder Risikoumkehr-Anker. |
| 4 | **[Chance für DZ]** **Bewertungsaufbau** (Google-Unternehmensprofil und/oder Trustpilot) ab dem ersten Auftrag; **kein** selbst gesetztes AggregateRating ohne echte Grundlage | Wettbewerber haben 76 bis 5.342 Bewertungen. Der Trustpilot-Warnhinweis bei zulassung.de [Q29] zeigt, dass unsaubere Darstellung sanktioniert wird. Ehrlichkeit wird so zum Vorteil. |
| 5 | **[Chance für DZ]** Differenzierung **„auch wenn i-Kfz nicht geht“** ausbauen: Problemfälle (keine Codes, Codes unleserlich, Papiere vor 2015/2018, ausländischer Ausweis, Firma/Verein, Erbe) als eigene Landingpages | Kroschke, abmeldung.digital und zulassung.de setzen digitale Sicherheitscodes voraus [Q32][Q42][Q24]. Der Vollmachtsweg von DZ [Q50] löst genau diese Fälle. DZ hat bereits /ikfz-funktioniert-nicht/ und /ikfz-fehlermeldung/ [Q51]; das Cluster sollte erweitert werden. |
| 6 | **[Chance für DZ]** **Transparenz-Kalkulation** als USP: Aufschlüsselung „amtliche Gebühr (GebOSt, Quelle) + Versand + Service“ je Vorgang, mit Prüfdatum | ADAC nennt 12,80 € Behördengebühr [Q36]; Kunden fragen sich, wofür 128 € anfallen. Wettbewerber sind hier widersprüchlich (Abschnitt 4). Das passt zur DZ-Positionierung „transparent kalkuliert“. |
| 7 | **[Chance für DZ]** **Abmeldung als Einstiegsprodukt** mit eigenem, schnellem Flow und Preis-Kommunikation (34 € inkl.) | 34 € liegt unter Kroschke (39 €), onlinezugelassen (39,99 € + Gebühren), zulassung.de, zulassung.digital und abmeldung.digital (je 49,90 €). Nur BZ24 (34,90 €) und digital-zulassen.de (8 €) sind vergleichbar bzw. günstiger. Hier ist DZ tatsächlich preislich stark. |
| 8 | **[Chance für DZ]** **Lokale Seiten qualitativ statt quantitativ**: echte Behördendaten (Adresse, Öffnungszeiten, Kürzel, PLZ, i-Kfz-Angebot der Behörde) und GovernmentOffice-Markup für die Behörde (getrennt vom eigenen Service, wie zulassung.de [Q26]); **kein** LocalBusiness mit Stadt-Geokoordinaten ohne Standort (Gegenbeispiel BZ24 [Q4]) | zulassung.digital (9.365 dünne URLs) und BZ24 zeigen Template-Risiken. DZ hat bereits eine Indexierungsentscheidungs-Datei; Qualität vor Menge. |
| 9 | **[Chance für DZ]** **E-E-A-T sichtbar machen**: namentlicher Ansprechpartner/Autor mit Rolle, „Fachlich geprüft am …“, Quellen (FZV, GebOSt, KBA), Firmierung Volt Gas UG prominent; Seite „Ist DeutscheZulassung seriös?“ | Kein Dienstleister außer DZ hat Autoren-Markup. onlinezugelassen und BZ24 haben Impressen ohne Rechtsform bzw. Register [Q5][Q17]. Eine UG mit Register ist ein Vertrauensplus. |
| 10 | **[Chance für DZ]** **Status-Seite / Auftragsverfolgung** (auch ohne Konto, per Auftragsnummer) | onlinezugelassen (/status) und BZ24 (Dashboard) haben das [Q13][Q1]; es senkt Rückfragen über WhatsApp. |
| 11 | **[Chance für DZ]** **Kurzzeit- und Ausfuhrkennzeichen** mit Festpreis statt „auf Anfrage“ | onlinezugelassen nennt Preise (129/149 €, 350 €) [Q13]; „auf Anfrage“ verliert transaktionale Suchen. |
| 12 | **[Chance für DZ]** **Mehrsprachige Kernseiten** (EN, TR, AR, RU/UK, PL) für die Zielgruppe ohne eID | Nur onlinezugelassen bietet das [Q18]; Menschen ohne eID-fähigen deutschen Ausweis sind eine Kernzielgruppe von „ohne eID“. |
| 13 | **[Chance für DZ]** Mobil: Cookie-Banner schlank halten, damit der Hero sichtbar bleibt; DZs Sticky-Bar (WhatsApp + „Auftrag starten“) beibehalten | Bei zulassung.de, Kroschke und zulassung.digital verdeckt das Consent-Overlay den gesamten ersten Viewport (Screenshots). DZ zeigte beim Test keinen Banner und hatte eine Sticky-Bottom-Bar [Q50]. |

---

## 7. Offene Fragen

1. **[Offene Frage]** Organische Rankings bei google.de für „kfz zulassung online“, „auto online anmelden“, „zulassungsdienst online“ und „auto abmelden online“ sind mit den verfügbaren Werkzeugen nicht ermittelbar (Suche nur US). Empfehlung: Google Search Console bzw. ein DE-Rank-Tracker.
2. **[Offene Frage]** Sind bei zulassung.digital (134,90 €) und abmeldung.digital (49,90 €) die amtlichen Gebühren enthalten? Die Angaben auf den Seiten widersprechen sich [Q38][Q39][Q42].
3. **[Offene Frage]** Enthält die zulassung.de-Abmeldung (49,90 €) die amtliche Gebühr (Startseite „inkl. aller Gebühren“ vs. Abmeldeseite „inkl. MwSt.“) [Q21][Q23]? Wie hoch ist der Halterwechsel-Preis bei zulassung.de?
4. **[Offene Frage]** Was kosten Ummeldung, Halterwechsel und Wunschkennzeichen im Kroschke-Direktkanal (nur im Konfigurator) [Q34]?
5. **[Offene Frage]** Welches Ident-Verfahren nutzt onlinezugelassen.de [Q14]?
6. **[Offene Frage]** Funktioniert digital-zulassen.de (64 €) auch ohne nutzbare Sicherheitscodes, und wie hoch ist die Erfolgsquote bei Privatkunden? Keine Bewertungen vorhanden [Q44].
7. **[Offene Frage]** Was genau umfassen die „30–60 Min.“ bei BZ24 (Auftragsprüfung oder Behördenfreigabe)? Die Seite bleibt unbestimmt [Q1].
8. **[Offene Frage]** Wer betreibt zulassungdeutsch.land? Auf der Seite ist kein Betreiber genannt [Q48].
9. **[Offene Frage]** Die DZ-Sitemap enthält die URL `/maxx/` [Q51]. Ist das eine beabsichtigte öffentliche Seite? Nicht geprüft.
10. **[Offene Frage]** Kann DZ technisch ein ähnliches Tempo-Versprechen wie BZ24 einhalten (i-Kfz-Großkundensoftware vorhanden)? Das ist eine interne Klärung.

---

## 8. Quellenliste

Alle Quellen abgerufen am **2026-11-09**.

**Suchanfragen (WebSearch, US-Index)**
- S1 – „kfz zulassung online“ (u. a. ADAC, ERGO, R+V, Autobild, Behörden)
- S2 – „auto online anmelden“ (u. a. ADAC, Allianz Direct, test.de, Zurich)
- S3 – „zulassungsdienst online“ (u. a. HUK-Zulassungsservice, Trustpilot-Profil zulassung.digital, R+V, ERGO)
- S4 – „auto abmelden online“ (u. a. pkw.de, test.de, Stuttgart, kommunalforum.de)
- S5 – „kfz zulassung online beauftragen privater zulassungsservice“ (extended; u. a. schnellzugelassen.de, bundeszulassung24.de, digital-zulassen.de, zulassung.digital, tkfz-zulassungen.de, hg-zulassungsdienst.de)
- S6 – „auto abmelden online 2 minuten anbieter“ (u. a. Trustpilot-Profil abmeldung.digital)
- S7 – „kfz zulassung online zulassungsservice preis inklusive gebühren kennzeichen“ (u. a. Trustpilot zulassungdeutsch.land, meinauto.de/lp/zulassungsservice)

**Webseiten**
- Q1 – https://bundeszulassung24.de/ (Inhalt, JSON-LD, Mobil-Screenshot)
- Q2 – https://bundeszulassung24.de/preise
- Q3 – https://bundeszulassung24.de/standorte
- Q4 – https://bundeszulassung24.de/standorte/berlin/berlin (Inhalt, JSON-LD)
- Q5 – https://bundeszulassung24.de/impressum
- Q6 – https://bundeszulassung24.de/ueber-uns
- Q7 – https://bundeszulassung24.de/zulassungskosten-rechner
- Q8 – https://bundeszulassung24.de/kfz-zulassung-ohne-eid
- Q9 – https://bundeszulassung24.de/i-kfz-status/stadt-kiel
- Q10 – https://bundeszulassung24.de/sitemap.xml
- Q11 – https://bundeszulassung24.de/abmeldung (JSON-LD)
- Q12 – https://de.trustpilot.com/review/bundeszulassung24.de
- Q13 – https://www.onlinezugelassen.de/ (Inhalt, JSON-LD, Mobil-Screenshot)
- Q14 – https://www.onlinezugelassen.de/kfz-zulassung-online
- Q15 – https://www.onlinezugelassen.de/auto-abmelden-online
- Q16 – https://www.onlinezugelassen.de/ratgeber
- Q17 – https://www.onlinezugelassen.de/impressum
- Q18 – https://www.onlinezugelassen.de/sitemap.xml
- Q19 – https://www.schnellzugelassen.de/ (HTTP 308 → onlinezugelassen.de)
- Q20 – https://de.trustpilot.com/review/onlinezugelassen.de (HTTP 404)
- Q21 – https://www.zulassung.de/ (Inhalt, JSON-LD)
- Q22 – https://www.zulassung.de/kfz-zulassung-online/ (Inhalt, Mobil-Screenshot)
- Q23 – https://www.zulassung.de/kfz-abmeldung-online/
- Q24 – https://www.zulassung.de/kfz-zulassen/?art=umzug
- Q25 – https://www.zulassung.de/zulassungsstellen/
- Q26 – https://www.zulassung.de/kfz-zulassung-online/aalen/
- Q27 – https://www.zulassung.de/impressum/
- Q28 – https://www.zulassung.de/sitemap_index.xml und Sub-Sitemaps (kfz-zulassung-online-, abmeldung-, wunschkennzeichen-, zulassungsstellen-, kennzeichen-, kennzeichenliste-, bundesland-, page-sitemap.xml)
- Q29 – https://de.trustpilot.com/review/zulassung.de
- Q30 – https://www.kroschke.de/ (Inhalt, JSON-LD)
- Q31 – https://www.kroschke.de/kfz-zulassungsdienst (Inhalt, JSON-LD, Mobil-Screenshot)
- Q32 – https://www.kroschke.de/kfz-digital-abmelden
- Q33 – https://www.kroschke.de/kundenmeinungen
- Q34 – https://www.kroschke.de/zulassungsservice?zulassung=Adresswechsel
- Q35 – https://de.trustpilot.com/review/www.kroschke.de
- Q36 – https://www.adac.de/rund-ums-fahrzeug/auto-kaufen-verkaufen/kfz-zulassung/zulassung-online/
- Q37 – https://www.adac.de/rund-ums-fahrzeug/auto-kaufen-verkaufen/kfz-zulassung/
- Q38 – https://www.zulassung.digital/ (Inhalt, JSON-LD, Mobil-Screenshot)
- Q39 – https://www.zulassung.digital/zulassungsdienst/stadt/nuernberg
- Q40 – https://www.zulassung.digital/sitemap.xml
- Q41 – https://de.trustpilot.com/review/zulassung.digital
- Q42 – https://abmeldung.digital/ (Inhalt, JSON-LD)
- Q43 – https://de.trustpilot.com/review/abmeldung.digital
- Q44 – https://digital-zulassen.de/
- Q45 – https://digital-zulassen.de/antrag/
- Q46 – https://digital-zulassen.de/impressum/
- Q47 – https://www.ergo.de/de/Produkte/KFZ-Versicherung/Autoversicherung/online-kfz-zulassung
- Q48 – https://www.zulassungdeutsch.land/kfz-anmeldung
- Q49 – https://www.meinauto.de/lp/zulassungsservice
- Q50 – https://deutschezulassung.de/ sowie /leistungen/abmeldung/, /kfz-zulassung/berlin/, /ratgeber/was-kostet-eine-kfz-zulassung/, /rechner/ (Inhalt, JSON-LD, Mobil-Screenshot)
- Q51 – https://deutschezulassung.de/sitemap.xml
