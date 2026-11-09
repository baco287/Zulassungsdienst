# Betreiberentscheidungen – DeutscheZulassung

Stand: 09.11.2026 · Branch `seo/sprint-1` · **Diese Liste blockiert die Veröffentlichung.**

Der Branch `seo/sprint-1` ist technisch fertig und geprüft, darf aber erst nach `main` (= automatischer Live-Deploy), wenn mindestens die **Blocker A1–A6** beantwortet sind. Grundlage: unabhängige Fakten- und Compliance-Prüfung (`compliance-findings.md`, Urteil **ROT**), Wettbewerbsanalyse und Local-SEO-Audit.

Antworten bitte einfach unter die jeweilige Frage schreiben. Danach werden sie in `config/betrieb.json` bzw. `config/preise.json` eingetragen, die Texte angepasst und die Freigabe gesetzt.

---

## A. Blocker – vor dem Merge nach `main` zu klären

### A1 · Wie identifiziert sich der Halter? (betrifft die gesamte „ohne eID“-Positionierung)
Für Zulassungen über die Großkundenschnittstelle verlangt § 38 Abs. 2 FZV eine **qualifiziert elektronisch signierte Vollmacht** mit vorheriger Identitätsprüfung. Laut ZULEX-Preisliste identifiziert sich der Halter mit Personalausweis und signiert per QES; als Option gibt es „Vor-Ort-Identifikation mit Verimi“.
- Welches Verfahren nutzt der Kunde konkret (Video-Ident, Foto-Ident, Bank-Ident, Verimi-App, eID)?
- Wie lange dauert es typischerweise, und welche Ausweisdokumente werden akzeptiert (nur Personalausweis oder auch Reisepass/Aufenthaltstitel)?
- **Warum blockierend:** „Ohne eID“ stimmt nur, wenn das Verfahren ohne eID-PIN auskommt. Läuft es über die eID, ist die Kernaussage der Website falsch.
- **Bereits umgesetzt (verfahrensneutral):** Alle Stellen, die „Ausweisfoto genügt“ oder „im Chat bestätigen“ sagten, nennen jetzt die gesetzlich vorgeschriebene Identitätsbestätigung und QES-Vollmacht.
- **Hinweis:** Verimi stellt sein ID Wallet laut eigener Seite Ende 2026 ein.
- **Empfehlung:** Ein rein digitales Verfahren ohne eID-PIN als Standard (z. B. Video-Ident) festlegen und die Aussage auf „ohne eID-PIN“ präzisieren.
- Ablage: `config/betrieb.json → abwicklung.identifizierung`, `zeiten.kunde.identUndSignatur`

### A2 · Neuzulassung: ZULEX-Tarif hochstufen oder Angebot einschränken?
Im gebuchten ZULEX-BASIS-Tarif sind Neuzulassungen **nicht** möglich. Die Website bewirbt die Neuzulassung trotzdem zum Komplettpreis von 128 € (Konfigurator, Leistungsseite, Landingpages, llms.txt, Gewerbeseiten).
- **Empfehlung:** Entweder auf PREMIUM (179 €/Monat) wechseln oder die Neuzulassung vorerst als „auf Anfrage“ führen.
- Ablage: `config/betrieb.json → abwicklung.neuzulassungAbwickelbar`

### A3 · Gibt es einen Schalter- oder Botenweg?
Leistungen, die nicht über die Großkundenschnittstelle laufen können, werden derzeit angeboten: Papiere ohne Sicherheitscode, Importfahrzeuge, Kurzzeitkennzeichen und Ersatzpapiere (manche Behörden, z. B. Lüneburg, verlangen eine persönliche Erklärung).
- **Empfehlung:** Ohne Botenweg diese Leistungen und Aussagen streichen. Mit Botenweg Region und Aufpreis in die Konfiguration aufnehmen.

### A4 · Datenschutz: Empfänger, Rollen, AV-Verträge
Die Datenschutzerklärung behauptete, Daten gingen nur an die Behörde. Tatsächlich gehen sie an den Softwareanbieter (ZULEX), den Signatur- und Identifizierungsdienst und das KBA.
- **Bereits umgesetzt:** Die Empfängerkategorien stehen jetzt in `/datenschutz/` und `/datensicherheit/`, die falsche Aussage ist entfernt.
- **Offen:** Konkrete Namen der Anbieter, Rolle von ZULEX (Auftragsverarbeiter oder eigener Verantwortlicher), abgeschlossene AV-Verträge, Postfach-Anbieter. **Rechtlich prüfen lassen.**

### A5 · Kennzeichenschilder: Versand oder Schildermacher?
Preise und Startseite bieten Schilder für 29 € inkl. Versand an. Die Bilderanleitung `/anleitung/` und das PDF sagen ausdrücklich, dass DeutscheZulassung **keine** Schilder prägt oder versendet, sondern der Kunde zum Schildermacher geht (20–35 €).
- **Empfehlung:** Beides als Wahl anbieten und Anleitung und PDF angleichen.
- Ablage: `config/betrieb.json → abwicklung.schilder`

### A6 · Bundesweit: Nimmt jede Behörde eure Anträge an?
Laut offizieller LBV-FAQ schließt **Hamburg** „Vorgänge per Vollmacht“ online aus. **Rosenheim** und **Kreis Minden-Lübbecke** schließen Online-Anträge in Vertretung aus. 69 Behörden haben eigene Regeln für Zulassungsdienste. Die Hamburg-Seite sagt trotzdem „Wir führen den Vorgang beim LBV durch“.
- **Empfehlung:** Schriftliche Auskunft von ZULEX einholen. Die Ausnahmeliste wird in `config/betrieb.json → regionen.einschraenkungen` gepflegt und auf den Stadtseiten angezeigt.

---

## B. Vor Sprint 2 zu klären

| # | Frage | Empfehlung | Ablage |
|---|---|---|---|
| B1 | **Zeitwerte freigeben:** Anfrage ca. 2 Min., Unterlagen ca. 10 Min., Zulassung 1–3 Werktage, Adressänderung 1–2 Werktage, Abmeldung „meist am selben Werktag“ | Nur freigeben, was Testvorgänge belegen. Zehn Behörden nennen selbst längere Bearbeitungszeiten als 1–3 Werktage (u. a. Wiesbaden). | `config/betrieb.json → freigabe` |
| B2 | **Eigene Prüfzeit** nach Eingang der Unterlagen (z. B. „am selben Werktag bis 18 Uhr“) | Wettbewerber werben mit 30 Min. bis 2 Std. Eine belegte Prüfzeit wäre der stärkste Hebel gegen „1–3 Werktage wirkt langsam“. | `zeiten.pruefungDurchDZ` |
| B3 | **Versanddienst und Laufzeit** (z. B. DHL, 1–2 Werktage) | Bis zur Angabe heißt es neutral „zuzüglich Versand“. | `zeiten.versand` |
| B4 | **Antwortzeit** auf WhatsApp/Formular | „Antwort meist in wenigen Minuten“ ist entfernt, weil keine Messdaten vorliegen. Nach 4 Wochen Messung wieder einsetzbar. | `zeiten.antwortzeit` |
| B5 | **Zahlung vor oder nach Abmeldung?** | „Abmeldung am selben Werktag“ widerspricht „erst nach Zahlungseingang“. Empfehlung: Abmeldung nach Erledigung abrechnen (34 €, geringes Risiko). | `zeiten.bearbeitung.abmeldung` |
| B6 | **Plaketten und Papiere:** Wer erhält sie (Behörde direkt an den Halter oder an euch)? | Bei ZULEX klären. Bis dahin „Plaketten kommen von der Behörde per Post“. | Texte `processSteps`, Stadtseiten |
| B7 | **Feste Ansprechperson:** Gibt es namentlich zuständige Personen? Wer (für „Über uns“, Autorenprofile)? | Nur bewerben, wenn organisatorisch gesichert. Keine erfundenen Profile. | `abwicklung.festeAnsprechperson` |
| B8 | **Express für Gewerbe:** Gibt es Verfahren und Preis? | Sonst „Express“ durch „vorrangige Einreichung“ ersetzen. Betroffen: `lib/gewerbe.ts`, `lib/serviceContent.ts` (vom Prüfskript markiert). | – |
| B9 | **Ablehnung durch die Behörde:** Wer trägt amtliche Gebühr und ZULEX-Gebühr? | Servicepreis erlassen, amtliche Gebühr weiterberechnen, ZULEX-Gebühr selbst tragen. | Servicebedingungen |
| B10 | **Widerruf bei vorzeitigem Beginn** (§ 356 Abs. 4 BGB) | Zwei Bestätigungen in die Festpreis-Bestätigung aufnehmen. Rechtlich prüfen lassen. | Formular, WhatsApp-Ablauf |
| B11 | **Maxx/KI im WhatsApp-Kanal** | Wenn ein KI-Agent antwortet: KI-Hinweis in der ersten Nachricht, auf der Maxx-Seite und in der Datenschutzerklärung. | – |
| B12 | **Logo mit Nationalfarben** zusammen mit dem Namen „DeutscheZulassung“ | Behördennähe rechtlich prüfen lassen. Der Zusatz „privater Zulassungsdienst“ steht bereits auf allen Seiten. | `public/logo.png`, `app/icon.png` |
| B13 | **Ausweiskopie** zusätzlich zur QES nötig? | Wenn die QES die Halterdaten liefert, Ausweisfoto aus den Checklisten streichen (Datenminimierung). | `lib/services.ts` |
| B14 | **Wunschkennzeichen 12 €** liegt unter der amtlichen Gebühr (12,80 €) | Bewusst entscheiden. USt-Behandlung der Gebühren mit der Steuerberatung klären. | `config/preise.json` |
| B15 | **Wettbewerbervergleich mit Namen** (bundeszulassung24 u. a.) | Nur nach rechtlicher Prüfung (§ 6 UWG). Bis dahin anonymisierter Vergleich „Behörde / i-Kfz selbst / Zulassungsdienst“. | Sprint 3 |
| B16 | **Analyse einschalten** (Plausible oder Matomo) | Ohne Analyse gibt es keine Conversion-Baseline. Beim Aktivieren die CSP in `public/.htaccess` um den Analyse-Host ergänzen (siehe `docs/TRACKING.md`). | Build-Variablen |

---

## C. Bereits entschieden

| Punkt | Entscheidung | Datum |
|---|---|---|
| Preise | 128 € / 34 € / 64 € / Schilder 29 € / Wunschkennzeichen 12 €, glatte Beträge | 06.11.2026 |
| URL-Struktur | `/leistungen/<slug>/` bleibt, kein Umzug auf Root-URLs (Empfehlung Architektur-Audit; Einspruch möglich) | 09.11.2026 (Vorschlag) |
| Lokale Seiten | Index nur mit belegten Behördendaten (`lib/indexGate.ts`): 709 → 3 Kennzeichenseiten, 404 → 388 Behördenseiten, 40 → 19 Stadtseiten im Index. Wiesbaden bleibt `noindex`, bis die Zuständigkeit mit einer lokalen Behördenquelle belegt ist (bisher nur § 75 FZV). | 09.11.2026 (Vorschlag, Teil dieses Branches) |
