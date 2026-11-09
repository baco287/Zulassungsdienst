# SEO-, CRO- und Compliance-Audit deutschezulassung.de – Sprint 1

Stand: 09.11.2026 · Branch `seo/sprint-1` (nicht live) · Basis: Live-Crawl aller 1.214 Sitemap-URLs, Code-Analyse, fünf getrennte Prüf-Agenten

**Status: Sprint 1 ist umgesetzt und technisch grün, aber nicht veröffentlichungsreif.** Die Fakten- und Compliance-Prüfung blockiert den Merge nach `main`, bis die Betreiberfragen in [OWNER-DECISIONS.md](OWNER-DECISIONS.md) (Blocker A1–A6) beantwortet sind.

## Berichte dieses Audits

| Datei | Inhalt | Verantwortlich |
|---|---|---|
| [OWNER-DECISIONS.md](OWNER-DECISIONS.md) | Offene Eigentümerentscheidungen, Blocker zuerst | Fakten & Compliance |
| [compliance-findings.md](compliance-findings.md) | Fakten-, Rechts- und Kennzeichnungsprüfung (Urteil ROT, 4 Blocker) | Fakten & Compliance |
| [competitor-analysis.md](competitor-analysis.md) | Wettbewerber-Matrix, Preisvergleich, Gaps und Chancen | Wettbewerbsanalyse |
| [keyword-map.csv](keyword-map.csv) | 104 Keywords mit Intent, Zielseite und SERP-Beobachtung, ohne erfundene Volumina | Keyword & SERP |
| [information-architecture.md](information-architecture.md) | Zielarchitektur, URL- und Linkregeln, 301-Plan, 10 Content-Briefs | Content-Architektur |
| [landing-page-backlog.csv](landing-page-backlog.csv) | 63 priorisierte Seiten-Aufgaben für Sprint 1–4 | Content-Architektur |
| [local-seo-audit.md](local-seo-audit.md) / [local-pages-index-decision.csv](local-pages-index-decision.csv) | Doorway-Bewertung, Index-Gate, Entscheidung je lokaler Seite (1.153) | Local SEO |
| [cro-a11y-performance.md](cro-a11y-performance.md) | 41 Befunde zu Conversion, Barrierefreiheit, Performance und Tracking | CRO |
| [technical-issues.md](technical-issues.md) | Technische Befunde mit Status | Technical SEO |
| [url-inventory.csv](url-inventory.csv) / [crawl-summary.json](crawl-summary.json) | Live-Crawl vor Sprint 1 (Baseline) | Technical SEO |
| [content-inventory.csv](content-inventory.csv) | Alle URLs: Quelle, Index vorher/nachher, Empfehlung | Technical SEO |

---

## 1. Executive Summary

DeutscheZulassung ist **technisch solide**: alle 1.214 URLs mit Status 200, genau eine H1 je Seite, korrekte Canonicals, keine doppelten Titel, gültiges JSON-LD, keine Bilder ohne Alt-Text, eine zentrale Preisquelle mit Freigabesperre. Die Preise waren auf allen Seiten konsistent mit der Konfiguration. Die im Auftrag genannten Konflikte (129 € vs. 128 €, 28,90 € vs. 29 €) fanden sich auf keiner Live-Seite mehr.

Die eigentlichen Risiken liegen nicht in der Technik, sondern in **Aussagen und Masse**:

1. **Versprechen ohne Beleg.** Die Website verschwieg die gesetzlich vorgeschriebene Identitätsprüfung mit qualifizierter Signatur („Ausweisfoto genügt“). Sie bewarb die Neuzulassung, die im gebuchten ZULEX-Tarif nicht abwickelbar ist, und Leistungen ohne belegten Abwicklungsweg. Die Datenschutzerklärung verschwieg Empfänger. Antwortzeiten („meist in wenigen Minuten“) und lokale Wartezeiten („oft wochenlang ausgebucht“) standen ohne Datengrundlage da.
2. **Seitenmasse ohne Mehrwert.** 709 Kennzeichenseiten (Kürzelbedeutung fast immer aus Wikipedia, Inhalt doppelt zur Behördenseite) und 20 Stadtseiten außerhalb der Prioritätsliste waren indexiert. Das Doorway-Risiko war hoch.
3. **Zwei Designwelten.** Die Startseite nutzte Navy/Gold, alle Unterseiten Royal-Blau.
4. **Zeitangaben verstreut.** Über 100 Freitextstellen mit unterschiedlichen Formulierungen („taggleich“, „am selben Werktag“, 2/10/15 Minuten) ohne zentrale Quelle.

Sprint 1 behebt alles, was ohne Eigentümerentscheidung korrekt lösbar ist (Abschnitt 10). **Was nur der Betreiber beantworten kann, steht als Blocker in OWNER-DECISIONS.md.** Rankings werden nicht versprochen. Fortschritt wird ab Aktivierung der Analyse an Search-Console- und Conversion-Daten gemessen (Abschnitt 9).

**Wettbewerb in einem Satz:** bundeszulassung24.de ist fast deckungsgleich positioniert und bepreist (129 € / 34,90 €), hat aber Online-Zahlung, Geld-zurück-Garantie, 76 Trustpilot-Bewertungen und verspricht 30–60 Minuten. DeutscheZulassung gewinnt nicht über den Preis (rund 1 € Unterschied), sondern nur über **belegbare** Geschwindigkeit, Vertrauen und Inhaltstiefe.

---

## 2. Kritische Fehler (Stand vor Sprint 1)

| # | Fehler | Schwere | Status nach Sprint 1 |
|---|---|---|---|
| K1 | Identitätsprüfung und QES-Vollmacht (§ 38 FZV) verschwiegen: „Ausweisfoto genügt“, „im Chat bestätigen“ | Blocker | **Behoben** (verfahrensneutral). Ob „ohne eID“ uneingeschränkt stimmt, hängt von A1 ab |
| K2 | Neuzulassung beworben, im ZULEX-BASIS-Tarif nicht abwickelbar | Blocker | **Offen**, Entscheidung A2 |
| K3 | Leistungen ohne Abwicklungsweg (Papiere ohne Code, Import „komplett digital“, Kurzzeit, Ersatzpapiere) | Blocker | „komplett digital“ entfernt, Rest offen (A3) |
| K4 | Datenschutzerklärung: Empfänger verschwiegen, falsche Aussage „keine weitere Weitergabe“ | Blocker | **Behoben** (Empfängerkategorien), Namen und AV-Verträge offen (A4) |
| K5 | Serverseitige Feldfehler im Auftragsformular wurden in Schritt 4 nicht angezeigt: Die Anfrage scheiterte ohne Meldung | Hoch | **Behoben** |
| K6 | 706 Kennzeichen-, 16 Behörden- und 21 Stadtseiten ohne ausreichende Einzigartigkeit im Index | Hoch | **Behoben** per Index-Gate (`noindex,follow`, raus aus Sitemap/llms.txt) |
| K7 | Unbelegte lokale Termin- und Wartezeit-Aussagen auf 23 Stadtseiten und im Template | Hoch | **Behoben** (26 Sätze neutral umformuliert) |
| K8 | Unbelegte Reaktionszeit „Antwort meist in wenigen Minuten“, „Festpreis-Bestätigung am selben Werktag“ | Hoch | **Behoben**, Messung als Entscheidung B4 |
| K9 | Gold-Text auf Weiß (1,7–2,4 : 1), Feldrahmen 1,23 : 1, Weiß auf WhatsApp-Grün 1,98 : 1, unsichtbarer Fokus am Kundentyp-Radio | Hoch (WCAG AA) | **Behoben** |
| K10 | Abbruch-Tracking feuerte beim Öffnen der Kamera und beim App-Wechsel; Matomo-Link-Tracking hätte Kontaktdaten aus WhatsApp-Links erfasst | Hoch (Datenqualität/Datenschutz) | **Behoben** |
| K11 | Organisation als `LocalBusiness` ausgezeichnet, obwohl es keinen Publikumsstandort gibt; Unternehmen auf jeder Seite neu beschrieben | Mittel | **Behoben**: `Organization` mit `@id`, Services verweisen darauf |
| K12 | Zwei Designsysteme (Navy/Gold auf der Startseite, Royal-Blau auf allen Unterseiten) | Mittel | **Behoben** über Design-Tokens |

---

## 3. Wettbewerber-Matrix (Kurzfassung)

Vollständig mit Quellen: [competitor-analysis.md](competitor-analysis.md). Alle Werte am 09.11.2026 abgerufen.

| Anbieter | Zulassung / Abmeldung | Versprechen | Online-Zahlung | Bewertungen | Garantie |
|---|---|---|---|---|---|
| **DeutscheZulassung** | 128 € / 34 € inkl. Gebühren | 1–3 Werktage + Versand | nein (Anfrage) | keine | keine |
| bundeszulassung24.de | 129 € / 34,90 € inkl. | 30–60 Min. | ja | Trustpilot 4,1 (76) | Geld zurück |
| onlinezugelassen.de | 99,99–129,99 € / 39,99 € zzgl. Gebühren | 1–2 Std. intern | ja (Stripe) | keine sichtbar | Geld zurück, wenn digital nicht möglich |
| zulassung.de | 129,90 € / 49,90 € | ca. 10 Min. Eingabe | ja | Trustpilot mit Warnhinweis | – |
| kroschke.de | 129 € / 39 € inkl. | digital Minuten, sonst 3–7 Werktage | ja | Trustpilot 4,2 (645) | Abmeldung: Geld zurück |
| zulassung.digital | 134,90 € / 49,90 € | ca. 10 Min. | ja | Trustpilot 4,6 (1.405) | Geld zurück |

**Chancen für DeutscheZulassung:** Die Abmeldung ist mit 34 € günstiger als die meisten Anbieter. Das Schema-Markup ist sauberer als bei allen geprüften Dienstleistern (Kroschke ungültig, BZ24 markiert Stadtseiten fälschlich als LocalBusiness). In der Stichprobe hatte kein Wettbewerber einen Dokumenten-Checker. Und kein Wettbewerber trennt Auftrags-, Prüf-, Behörden- und Versandzeit transparent.

---

## 4. Zielarchitektur

Details: [information-architecture.md](information-architecture.md).

- **Transaktionale Leistungen bleiben unter `/leistungen/<slug>/`.** Ein Umzug auf `/neuzulassung/` usw. bringt keinen messbaren Vorteil, erfordert 13 Weiterleitungen (wirksam nur auf all-inkl) und kollidiert mit den Root-Landingpages. Das Problem ist nicht die URL, sondern die Tiefe: 500–780 Wörter gegen vollständige Ratgeber von ADAC und Behörden. Wer den Umzug trotzdem will, kann widersprechen (OWNER-DECISIONS, Abschnitt C).
- **Pillars:** Kfz-Zulassung online (Startseite) · ohne eID (`/kfz-zulassung-ohne-eid/`) · Kosten · Dauer (neu) · Unterlagen · Gewerbe (`/gewerbe/`).
- **Lokal:** `/kfz-zulassung/<stadt>/` bedient „kfz zulassung <stadt>“ (Angebot), `/zulassungsstelle/<slug>/` bedient „zulassungsstelle <stadt>“ (Behördeninfo). Kennzeichenseiten sind vorerst `noindex`.
- **Fahrzeugtypen:** neuer Ordner `/fahrzeuge/<typ>/` (Sprint 4), nicht unter `/kfz-zulassung/`, weil dieser Ordner den Städten gehört.
- **301-Zusammenführungen (Sprint 2, nach Inhaltsübernahme):** `/ratgeber/auto-ummelden-nach-umzug/` → `/leistungen/ummeldung/`, `/ratgeber/auto-abmelden-so-gehts/` → `/leistungen/abmeldung/`, `/leistungen/gewerbekunden/` → `/gewerbe/`.

## 5. Keyword- und Intent-Map

[keyword-map.csv](keyword-map.csv): 104 Keywords in 7 Clustern (Problem 31, Transaktional 28, Lokal 18, B2B 12, Fahrzeugtyp 10, Sonderfall 4, Vergleich 1), davon 37 P1. Jedes Keyword hat eine Zielseite und eine qualitative SERP-Beobachtung. **Suchvolumina sind bewusst nicht enthalten**, weil ohne Search-Console- oder Keyword-Planner-Zugang jede Zahl erfunden wäre. Einschränkung: google.de war wegen der Consent-Seite nicht direkt abrufbar. Eine einmalige manuelle Prüfung der P1-Keywords ist in der Architekturdatei beschrieben.

## 6. Priorisierter Landingpage-Backlog

[landing-page-backlog.csv](landing-page-backlog.csv): 63 Einträge (Sprint 1: 3, Sprint 2: 21, Sprint 3: 22, Sprint 4: 17). Spitze:
1. Die sechs Kernleistungen zu Auftrags- plus Ratgeberseiten ausbauen (Sprint 2).
2. eID-Pillar mit allen Wegen ohne eID und einem Abschnitt „PIN vergessen“ ausbauen (Sprint 2; Achtung: München versendet den PIN-Rücksetzbrief seit Ende Oktober wieder).
3. Neue Dauer-Seite, belegte Kosten-Seite, Unterlagen-Matrix (Sprint 2).
4. Dokumenten-Checker `/rechner/unterlagen-check/` (Sprint 2).
5. „Papiere ohne Sicherheitscode“ ausbauen (Sprint 2, abhängig von A3).
6. Erste zehn Stadtseiten mit belegten lokalen Fakten (Sprint 3), B2B-Funnel mit Volumen, Standorten und Rückrufwunsch (Sprint 3).

## 7. Technische Maßnahmen

Siehe [technical-issues.md](technical-issues.md) (Status je Befund). In Sprint 1 umgesetzt: Index-Gate, Sitemap 1.214 → 471 URLs, `Organization`-Schema mit `@id`-Verweisen, Service-Offers aus dem Katalog, Titel-Längen (98 → 9 über 60 Zeichen), Fokus- und Kontrastfehler, lokaler Build reproduzierbar, neue Prüfskripte. Offen: Performance-Messung (PageSpeed-Kontingent erschöpft), framer-motion auf `/auftrag/` (129 KB nur für eine Einblendung), Logo als PNG statt SVG, Cache-Header für Bilder.

## 8. Content-Briefs

Zehn fertige Briefs in [information-architecture.md, Abschnitt 11](information-architecture.md): Neuzulassung, Ummeldung, Halterwechsel, Wiederzulassung, Abmeldung, Adressänderung, eID-Pillar, Kosten, Dauer (neu), Unterlagen. Jeder Brief nennt Suchintention, Pflichtabschnitte, Zusatznutzen gegenüber der SERP, interne Links und die Quellen, die vor der Veröffentlichung geprüft werden müssen. **Kein Brief darf ohne Faktenfreigabe veröffentlicht werden**, und Aussagen zu Zeiten und Abwicklung kommen ausschließlich aus `config/betrieb.json`.

---

## 9. Umsetzungsplan 30 / 60 / 90 Tage

**Baseline (vor allen Änderungen, 09.11.2026):** 1.214 Sitemap-URLs, davon laut Crawl alle indexierbar. Bei Bing und DuckDuckGo war die Domain am 03.09.2026 nicht indexiert; der Google-Stand ist ohne Search-Console-Zugang unbekannt. Analyse ausgeschaltet, deshalb **keine** Conversion-Baseline vorhanden. Search-Console-Verifizierung liegt im Repo, Sitemap-Einreichung ausstehend.

| Zeitraum | Ziel | Maßnahmen | Messung |
|---|---|---|---|
| **Tag 0–30** | Veröffentlichungsreife und Messbarkeit | Blocker A1–A6 entscheiden → Texte final → Merge → Deploy. Analyse aktivieren (Plausible empfohlen) inkl. CSP. Search Console: Sitemap (471 URLs) einreichen, Google-Unternehmensprofil anlegen, erste echte Bewertungen einholen. Sprint 2 starten: sechs Kernleistungen, eID-Pillar, Kosten/Dauer/Unterlagen, Dokumenten-Checker | Indexierte vs. eingereichte URLs, Impressionen, Ereignisse `cta_click`, `order_start`, `order_submitted` ab Tag 1 |
| **Tag 31–60** | Inhaltstiefe und Vertrauen | 301-Zusammenführungen. Interne Verlinkung nach Linkregeln. Belegte Prüfzeit und Antwortzeit (aus 4 Wochen Messung) einsetzen. Autoren- und Prüfmodell mit echten Personen. Erste 10 Stadtseiten ausbauen (Stufe 2 des Gates: Prüfdatum, Nachbarbehörden, ≥ 3 lokale FAQ) | CTR und Position je P1-Keyword, Conversion-Rate je Landingpage, Abbruchschritt im Formular |
| **Tag 61–90** | Skalierung nur bei Qualität | B2B-Funnel, anonymisierter Wettbewerbervergleich (nach UWG-Prüfung), Fahrzeugtypen nach belegter Nachfrage, weitere 10 Stadtseiten **nur**, wenn die ersten 10 indexiert sind und Impressionen bekommen. Online-Zahlung (Stripe) wieder aufnehmen | Leads, abgeschlossene Aufträge, B2B-Anfragen, Core Web Vitals aus Search Console |

## 10. Implementierter Sprint 1

Alle Änderungen liegen auf dem Branch `seo/sprint-1` und sind **nicht live**.

**Single Source of Truth (Phase 2)**
- Neu: `config/betrieb.json` + `lib/betrieb.ts`. Alle Zeitangaben laufen jetzt über vier getrennte Phasen: Kundenaufwand, Prüfung durch DZ, Bearbeitung inkl. Behördenentscheidung und Versand. 107 Freitextstellen und alle Komponenten sind umgestellt. Werte, die niemand belegt hat (Prüfzeit, Versanddauer, Antwortzeit, Ident-Dauer), stehen auf `"status": "offen"` und werden nicht angezeigt.
- Neu: `lib/catalog.ts` (`serviceCatalog`) bündelt je Leistung Name, Kurz- und Langtext, Preis, amtliche Gebühren, Versand, Kennzeichen, Zeitphasen, Unterlagen, CTA-Ziel, Regionen und Stand. JSON-LD-Offers werden daraus erzeugt.
- Neu: `npm run check:daten` / `check:daten:build` findet fest eingetragene Zeitversprechen in Code und Build, analog zu `check:preise`.

**Compliance:** Identitätsprüfung und QES überall offengelegt, Datenschutz-Empfänger ergänzt, unbelegte Antwort-, Status- und Wartezeit-Aussagen entfernt, „komplett digital“ für Import entfernt, Zeitangabe ehrlich auf „Unterlagen in ca. 10 Minuten eingereicht“ begrenzt.

**Index-Gate (Phase 7):** `lib/indexGate.ts` setzt die Regeln aus dem Local-SEO-Audit um, gilt für Seiten, Sitemap und `/llms.txt` und wird von `check:site` überwacht (keine Sitemap-URL mit `noindex`, kein `nofollow`).

**Design (Phase 5):** Royal-Blau und Amber sind über die Tokens durch Navy/Gold ersetzt (59 Dateien ziehen automatisch mit). Dazu Fokusring für helle und dunkle Flächen, Off-White-Hero und Navy/Gold-OG-Bilder. Eine einheitliche CTA-Beschriftung „Auftrag starten“ statt drei Varianten.

**CRO und Barrierefreiheit:** Formular springt bei Serverfehlern zum betroffenen Schritt; mobile Leiste übernimmt die gewählte Leistung; Leistungsseiten mit Preis und CTA im Hero; Konfigurator-Preisbox zeigt nur, was laut Konfiguration enthalten ist, und nennt die MwSt.; Mobilmenü schließt mit Escape und beim Seitenwechsel; Kontraste (Gold-Text, Feldrahmen, WhatsApp, Danger-Rot, Badge) und Trefferflächen auf WCAG-AA-Niveau; Screenreader-Ansage im Konfigurator gekürzt.

**Tracking (Phase 13):** Neue Ereignisse `price_box_view`, `b2b_inquiry`, `tool_used`; Footer- und B2B-Kontakte erfasst; Abbruch nur bei echtem Verlassen; Matomo ohne Link-Tracking, nur Pfade, Seitenwechsel gezählt. Weiterhin keine personenbezogenen Daten. Analyse bleibt bis zur Aktivierung aus.

**Strukturierte Daten (Phase 11):** `Organization` statt `LocalBusiness`, alle Services verweisen per `@id`.

**SEO:** Titel-Logik `fitTitle()` (98 → 9 Titel über 60 Zeichen; Rest sind lange amtliche Kreisnamen), Startseiten-Titel von der eID-Pillar entflochten, Behördentitel ohne irreführendes „Termin“.

## 11. Build-, Test- und QA-Bericht

| Prüfung | Ergebnis |
|---|---|
| `npx tsc --noEmit` | ohne Fehler |
| `npx eslint app components lib` | ohne Fehler |
| `npm run build` (lokal mit `NEXT_BUILD_CPUS=4`) | 1.321 statische Ausgaben, davon 1.220 HTML-Seiten |
| `npm run check:preise` / `check:build` | bestanden, keine Altpreise in Code und Build |
| `npm run check:daten` / `check:daten:build` | bestanden, 9 offene Betreiberentscheidungen als Hinweis, 2 Express-Aussagen zur fachlichen Prüfung markiert |
| `npm run check:site` | bestanden: keine toten internen Links oder Bilder, je Seite eine H1, Canonical und og:url korrekt, JSON-LD gültig, Sitemap ohne `noindex`-URLs |
| Crawl des lokalen Exports | 471 Sitemap-URLs, alle 200, keine doppelten Titel/Descriptions, keine JSON-LD-Fehler |
| Browser (Export, 1280 px und 375 px) | Navy/Gold auf Unterseiten, Konfigurator-Preisbox je Leistung korrekt (Abmeldung ohne „Versand“), Leistungsauswahl wird an die mobile Leiste übergeben, WhatsApp-Button lesbar |

**Nicht geprüft:** Core Web Vitals gemessen (PageSpeed-API-Kontingent erschöpft, Werte nur aus Code und curl geschätzt: TTFB 0,16–0,35 s, kein Drittanbieter-JS). Server-Weiterleitungen und Header wirken nur auf all-inkl. Visuelle Regression nur stichprobenartig. Rechtstexte sind sprachlich angepasst, aber **nicht anwaltlich geprüft**.

**Veröffentlichung:** gesperrt bis zur Beantwortung der Blocker in [OWNER-DECISIONS.md](OWNER-DECISIONS.md). Danach Freigabe in `config/betrieb.json` setzen, `npm run check:daten:build` erneut ausführen und mergen.
