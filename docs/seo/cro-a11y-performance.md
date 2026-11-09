# CRO-, Barrierefreiheits- und Performance-Audit – deutschezulassung.de

Stand: 09.11.2026 · Grundlage: Live-Seite (Build vom 07.11.2026, `Last-Modified: Sat, 07 Nov 2026 12:07:16 GMT`) und Quellcode im Repository.
Kein lokaler Build, keine Änderungen an Quelldateien.

---

## 1. Messwerte

### 1.1 PageSpeed Insights: keine Werte, Tageskontingent aufgebraucht

Beide Aufrufe ohne Schlüssel (Startseite mobil, `/preise/` Desktop) kamen mit **HTTP 429 `RESOURCE_EXHAUSTED`** zurück:

> „Quota exceeded for quota metric 'Queries' and limit 'Queries per day' of service 'pagespeedonline.googleapis.com'“

Das gemeinsame Kontingent für Aufrufe ohne Schlüssel war am 09.11.2026 erschöpft. Weitere Versuche hätten nichts gebracht, deshalb gibt es **keine Lighthouse- und keine CrUX-Werte**. Ersatzweise folgt eine manuelle Analyse mit `curl` und Code-Review (Abschnitt 1.2). Zum Nachholen: einen eigenen API-Schlüssel anlegen (Google Cloud → „PageSpeed Insights API“ → Schlüssel, kostenlos, 25.000 Abfragen/Tag) und `&key=…` anhängen. Alternativ die Search Console nutzen (Bericht „Core Web Vitals“), sobald genug Felddaten da sind.

### 1.2 Eigene Messungen (curl von diesem Rechner, 09.11.2026 ca. 18 Uhr)

| Seite | HTTP | HTML roh | TTFB | JS beim Laden (Brotli / roh)¹ | Seitenspezifische Chunks |
|---|---|---|---|---|---|
| `/` | 200 | 186 KB (17,9 KB br) | 0,21 s | **≈ 122 KB / 425 KB** | `app/page` 3,0 KB br, `8783` 5,2 KB, `1895` 2,3 KB |
| `/preise/` | 200 | 174 KB | 0,35 s | ≈ 120 KB / 415 KB | `preise/page` 3,0 KB br |
| `/leistungen/ummeldung/` | 200 | 99 KB | 0,18 s | ≈ 113 KB / 398 KB | `leistungen/[slug]/page` 1,6 KB br |
| `/kfz-zulassung/berlin/` | 200 | 121 KB | 0,18 s | ≈ 114 KB / 400 KB | 2,3 KB br |
| `/zulassungsstelle/berlin/` | 200 | 138 KB | 0,21 s | ≈ 114 KB / 400 KB | 2,3 KB br |
| `/auftrag/` | 200 | 58 KB | 0,16 s | **≈ 175 KB / 590 KB** | **`2468` (framer-motion) 40,6 KB br / 129 KB roh**, `5264` 6,3 KB, `auftrag/page` 6,1 KB |
| `/ratgeber/auto-ummelden-nach-umzug/` | 200 | 90 KB | 0,18 s | ≈ 114 KB / 400 KB | 2,3 KB br |

¹ Ohne `polyfills-*.js` (38 KB br), weil die Datei mit `noModule` eingebunden ist und moderne Browser sie nicht laden.

Gemeinsame Ressourcen:

| Ressource | Größe | Bemerkung |
|---|---|---|
| `4bd1b696-*.js` (React DOM) | 51,5 KB br / 173 KB roh | Framework-Basis |
| `1255-*.js` (Next-Client) | 42,1 KB br / 174 KB roh | Framework-Basis |
| `css/e1cdae1f5e239b40.css` | 11,7 KB br / 68 KB roh | blockiert das Rendern, enthält auch Keyframes der alten Blau-Welt (blob, floaty, dash …) |
| Webfonts (Lexend + Source Sans 3, je variabel, latin) | 28,8 KB + 39,7 KB woff2, beide `preload` | `display: swap`, next/font setzt Fallback-Metriken |
| `/logo.png` (Header, `priority` + preload) | 11,6 KB PNG, 600×200 px, angezeigt mit 108×36 px | **kein Cache-Control** |
| Drittanbieter-Skripte | keine | CSP `script-src 'self'` |
| Caching | `_next/static` (js/css/woff2): `max-age=31536000, immutable` ✓ · HTML/Bilder: nur ETag | |

### 1.3 Einschätzung der Core Web Vitals (Schätzung aus dem Code, nicht gemessen)

| Kennzahl | Ziel | Einschätzung | Begründung |
|---|---|---|---|
| **LCP** | < 2,5 s | voraussichtlich erreicht (mobil ~1,5–2,5 s im Lighthouse-Profil „Slow 4G“) | Das LCP-Element ist auf allen Seiten Text (H1 bzw. Konfigurator-Überschrift), kein Hero-Bild. TTFB ist niedrig, HTML klein (br). Risiken: render-blockierendes CSS (68 KB roh) und zwei vorgeladene Fonts (68 KB), die mit dem CSS um Bandbreite konkurrieren. |
| **INP** | < 200 ms | voraussichtlich erreicht | Interaktionen sind leicht (Konfigurator = ein setState, FAQ = hidden-Toggle). TBT-Risiko mobil durch ca. 425 KB rohes JS (Hydration). Auf `/auftrag/` kommen 129 KB framer-motion dazu. |
| **CLS** | < 0,1 | voraussichtlich erreicht | Alle `<img>` haben width/height. `Reveal` blendet nur Inhalte unterhalb des ersten Bildschirms per opacity/transform ein, das verschiebt nichts. Die MobileCTA-Platzhalterhöhe wird serverseitig gerendert. Font-Swap mit angepassten Fallback-Metriken. Kleines Restrisiko: Die Konfigurator-Zusammenfassung ändert ihre Höhe (Zeile „zzgl. Kennzeichenschilder“). Das geschieht aber nur nach Nutzereingabe und zählt dann nicht. |

---

## 2. Priorisierte Befundliste

Schwere: **Hoch** = kostet nachweislich Abschlüsse oder verstößt klar gegen WCAG 2.2 AA · **Mittel** = spürbare Reibung oder AA-Verstoß mit kleiner Reichweite · **Niedrig** = Feinschliff.
Bereiche: CRO, A11y, Perf, Track.

| ID | Bereich | Schwere | Datei:Zeile | Befund | Konkrete Behebung |
|---|---|---|---|---|---|
| F01 | CRO/A11y | **Hoch** | `components/AuftragForm.tsx:221-223`, `:755`; `lib/order.ts:184`; `public/api/auftrag.php:143,146,150,153` | **Stilles Scheitern im letzten Schritt.** Meldet der Server einen Feldfehler (`name`, `email`, `contact`, `zip`, `service`), landet er in `errors[field]`. Auf Schritt 4 wird aber nur `consent`/`dateien` angezeigt. Der allgemeine Fehlerblock erscheint nur bei `!result.field`. Die Person sieht also **gar nichts**. Realistischer Auslöser: Die E-Mail-Prüfung im Client (Regex, Z. 74) ist großzügiger als `FILTER_VALIDATE_EMAIL` in PHP (z. B. Umlaut-Domain `max@müller.de`). `service` passt außerdem nicht zum Schlüssel `serviceSlug`. | Bei `outcome.field` den passenden Schritt ermitteln (`zip/city → 1`, `name/email/phone/contact → 2`, `service → 0`), `setStep()` dorthin, Fehler am Feld zeigen und das Feld fokussieren. Zusätzlich immer eine Sammelmeldung über dem Absende-Button (`role="alert"`). Den Server-Schlüssel `service` auf `serviceSlug` abbilden. |
| F02 | CRO | **Hoch** | `app/leistungen/[slug]/page.tsx:272-367` (Preis-Box als `aside` am Ende des Grids) | **Auf Leistungsseiten stehen Preis und CTA mobil ganz unten**, nach Ablauf, Checkliste, Fließtext, FAQ und Ratgebern. Der Hero (`:102-118`) hat weder Preis noch Button. Mobil sieht man also erst nach mehreren Bildschirmhöhen, was es kostet. | Im Hero eine kompakte Preiszeile mit Primär-CTA ergänzen („Ummeldung · 128 € inkl. Gebühren & Versand · [Auftrag starten]“). Alternativ das `aside` mobil mit `order-first` vor den Inhalt ziehen und erst ab `lg` sticky rechts zeigen. |
| F03 | CRO | **Hoch** | `components/MobileCTA.tsx:43-49`, `components/home/Konfigurator.tsx:143-151` | **Mobil geht die Auswahl im Konfigurator verloren.** Bei sechs Kacheln (2 Spalten à 7,5 rem) liegt „Jetzt starten“ auf dem Handy weit unter dem ersten Bildschirm. Die immer sichtbare Leiste „Auftrag starten“ führt auf `/auftrag` **ohne** `?leistung=`, dort muss man die Leistung erneut wählen (ein Schritt mehr). | Auswahl des Konfigurators teilen (Context oder `sessionStorage`) und in der MobileCTA als `/auftrag/?leistung=<slug>` verwenden, Beschriftung z. B. „Ummeldung starten“. Zusätzlich nach Auswahl einer Kachel auf Mobil sanft zur Zusammenfassung scrollen, oder die Kacheln mobil kompakter machen (3 Spalten, `min-h-[5.5rem]`). |
| F04 | A11y | **Hoch** | `components/MobileCTA.tsx:38` | Weiße Schrift (text-sm, semibold) auf `#25D366`: **1,98 : 1** (nötig 4,5 : 1). Der Button ist auf jeder Mobilseite zu sehen. | Schrift navy (`text-navy`, 8,33 : 1) auf `#25D366`, oder Fläche `#075E54` mit Weiß (7,67 : 1). |
| F05 | A11y | **Hoch** | `app/page.tsx:46` | H1-Teil „Einfach erledigt.“ in `text-gold` (#f4b740) auf Off-White: **1,69 : 1**. Selbst für große Schrift (3 : 1) zu wenig, und es ist das wichtigste Textelement der Seite. | Text in navy setzen und Gold nur als Unterstreichung/Marker (`decoration-gold decoration-4 underline underline-offset-8`) nutzen. Oder dunkleres Gold `#a16207` (4,64 : 1 auf Off-White) als neues Token `--color-gold-700`. |
| F06 | A11y | **Hoch** | `components/home/StorySection.tsx:11`, `ComparisonSection.tsx:73`, `AblaufSection.tsx:9`, `SecuritySection.tsx:12` (Token `--color-gold-600` in `app/globals.css:42`) | Eyebrow-Texte (text-xs, uppercase) in `gold-600` #d99a1e: **2,44 : 1** auf Weiß bzw. **2,30 : 1** auf Off-White. | Token `--color-gold-700: #8a5a00` (5,93 : 1 auf Weiß, 5,58 auf Off-White) ergänzen und für Text verwenden. `gold`/`gold-600` nur noch für Flächen und Icons auf Navy. |
| F07 | A11y | **Hoch** | `components/AuftragForm.tsx:92-95` (und `UnterlagenForm.tsx:106-108`) | Eingabefelder mit Rahmen `ink-200` auf Weiß: **1,23 : 1**. WCAG 1.4.11 verlangt 3 : 1 für Feldgrenzen, älteren oder sehbehinderten Menschen fällt es schwer, die Felder zu erkennen. | `border-ink-500` (4,76 : 1) oder `border-muted` (6,42 : 1). Fehlerzustand `border-red-600` statt `red-400` (2,53 : 1). |
| F08 | A11y | **Hoch** | `components/AuftragForm.tsx:418-433` | Radio „Privatkunde / Autohaus“: Das `input` ist `sr-only`, das Label hat keinen Fokusstil. **Der Tastaturfokus ist unsichtbar** (2.4.7). | Am Label `has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-brand-500` (oder `ring`) ergänzen. |
| F09 | Track | **Hoch** | `components/AuftragForm.tsx:135-145` | `order_abandon` feuert bei **jedem** `visibilitychange → hidden`: Tab-Wechsel, Wechsel zu WhatsApp, Bildschirmsperre und vor allem **das Öffnen der Kamera/Galerie beim Upload auf Android/iOS**. Danach wird das Ereignis nie wieder zurückgesetzt. Die Abbruchquote wird dadurch stark überschätzt, ausgerechnet in Schritt 4. | Abbruch nicht als Ereignis werten, sondern als **Funnel** (`order_start` ohne `order_submitted` in derselben Sitzung). Falls doch ein Ereignis gewünscht ist: nur auf `pagehide` senden, Upload-Dialog ausnehmen (Flag beim Klick auf „Dateien auswählen“) und das Ereignis `order_pause` statt „abandon“ nennen. |
| F10 | Track | **Hoch** | `components/Analytics.tsx:54`, `components/AuftragForm.tsx:710-711`, `lib/order.ts:51-63` | **Datenschutzrisiko bei Matomo:** `enableLinkTracking` meldet Outlinks mit voller URL. Der Fallback-Link `wa.me/…?text=` enthält Name, E-Mail, Telefon, PLZ/Ort und Fahrzeug. Der Folge-Link nach Erfolg (`:283`) enthält die Referenz. Diese Daten würden in Matomo gespeichert. | `enableLinkTracking` entfernen (Klicks laufen ohnehin über `track()`) oder `_paq.push(['setCustomRequestProcessing', …])` bzw. `setLinkClasses`/Klasse `matomo_ignore` an allen `wa.me`-/`mailto:`-Links mit Inhalt. |
| F11 | Track | **Hoch** | `public/.htaccess:41` | Die CSP erlaubt nur `'self'`. Wird Plausible-Cloud oder Google Ads per Variable eingeschaltet, **blockiert der Browser Skript und Beacons stillschweigend**, und es kommen null Daten an. Das steht zwar in `docs/TRACKING.md:19`, ist aber leicht zu übersehen. | Beim Aktivieren in derselben Änderung `https://plausible.io` in `script-src` und `connect-src` aufnehmen (bzw. die Ads-Hosts). Besser: Plausible über die eigene Domain proxyen oder Matomo selbst hosten, dann bleibt die CSP unverändert. Nach dem Deploy in den DevTools prüfen, dass `/api/event` mit Status 202 durchgeht. |
| F12 | Perf | Mittel | `components/AuftragForm.tsx:4`, `:235-241`, `:246-247`, `:342` | framer-motion lädt auf `/auftrag/` **40,6 KB br / 129 KB roh JS** nach, nur für eine 0,28-s-Einblendung beim Schrittwechsel. Das ist die conversion-kritischste Seite, und auf schwachen Handys erhöht das die Hydration-Zeit (TBT/INP). | `motion.div` durch ein normales `div` mit CSS-Klasse ersetzen (`@keyframes stepin {from{opacity:0;transform:translateX(40px)}}` plus `motion-reduce:animate-none`). `useReducedMotion` wird überflüssig, die globale Regel in `globals.css:208-217` greift. Gleiches für `UnterlagenForm.tsx:4` prüfen. |
| F13 | CRO | Mittel | `components/AuftragForm.tsx:68-69`, `:650-671` | Hürden im Formular: 6 Pflichtangaben (Leistung, PLZ, **Ort**, Name, Kontakt, **Einwilligungs-Checkbox**). Den Ort kann man aus der PLZ ableiten. Für die Anbahnung des Vertrags ist eine Einwilligung rechtlich meist nicht nötig (Art. 6 Abs. 1 lit. b DSGVO), sie ist aber ein zusätzlicher Pflicht-Klick am Entscheidungspunkt. | Ort optional machen oder per PLZ-Tabelle vorbelegen. Checkbox durch einen Hinweis ersetzen („Mit dem Absenden verarbeiten wir Ihre Angaben zur Bearbeitung – Datenschutzerklärung“), **vorher rechtlich prüfen lassen**, weil Ausweisdokumente hochgeladen werden. |
| F14 | CRO | Mittel | `components/AuftragForm.tsx:404-571` | In den Schritten 2 und 3 gibt es keinen Hinweis auf gewählte Leistung und Preis. Die Preis-Zusammenfassung kommt erst in Schritt 4. Wer zwischendurch unsicher wird, hat nichts vor Augen. | Kleine Leiste oberhalb der Schritte: „Ummeldung · 128 € inkl. Gebühren & Versand · ändern“. Auf Desktop stattdessen in der rechten `aside` (`app/auftrag/page.tsx:30`). |
| F15 | CRO | Mittel | `components/Header.tsx:121,160`, `MobileCTA.tsx:48`, `lib/homepage.ts:196` („Auftrag starten“) · `Konfigurator.tsx:149` („Jetzt starten“) · `ServicePriceGrid.tsx:58`, `app/leistungen/[slug]/page.tsx:354`, `app/kfz-zulassung/[stadt]/page.tsx:267`, `app/zulassungsstelle/[slug]/page.tsx:411` („Jetzt beauftragen“) · `CTASection.tsx:24` („Jetzt Fahrzeug zulassen“) · `kfz-zulassung/[stadt]/page.tsx:150` („Jetzt ohne Termin starten“) · `PriceCalculator.tsx:137` („… beauftragen“) · `AuftragForm.tsx:686` („Anfrage kostenlos absenden“) | **Sechs verschiedene Beschriftungen für denselben Primär-CTA.** Dazu schwankt die Begrifflichkeit zwischen „Auftrag“ (CTA, Seitentitel „Online-Auftrag“) und „Anfrage“ (Absende-Button, Erfolgsseite). „Jetzt Fahrzeug zulassen“ passt nicht zu Abmeldungs-Ratgebern. Auch die WhatsApp-Beschriftungen variieren („WhatsApp“, „Per WhatsApp“, „Per WhatsApp fragen“, „Frage per WhatsApp“, „WhatsApp öffnen“, „Per WhatsApp anfragen“). | Ein Begriffssystem in `lib/site.ts` festlegen: Primär **„Auftrag starten“** (mit Leistung: „Ummeldung starten“), Abschluss **„Unverbindlich absenden“**, Sekundär **„Per WhatsApp fragen“**. Alle Stellen auf diese Konstanten umstellen. |
| F16 | CRO | Mittel | `components/CTASection.tsx:22`, `ServicePriceGrid.tsx:56`, `PriceCalculator.tsx:135`, `app/leistungen/[slug]/page.tsx:352`, `app/auftrag/page.tsx:43`, `AuftragForm.tsx:286,677,784` | Zwei Designwelten: Startseite und Header nutzen Navy/Gold, alle Unterseiten und das Formular den alten Royal-Blau-Button (`brand-600/700`). Der Primär-CTA hat also je nach Seite eine andere Farbe, und der Wiedererkennungseffekt fehlt. Der Kommentar in `app/globals.css:4-7` beschreibt noch das alte System. | Ein Token `--color-cta` (navy) plus `--color-cta-hover` einführen und alle Primärbuttons darauf umstellen. Blau nur noch für Links. |
| F17 | CRO | Mittel | `components/home/Konfigurator.tsx:126-131` | Die Preisbox im Hero sagt bei **allen** Vorgängen „inkl. amtlicher Gebühren & Versand“. Bei der Abmeldung (`enthaeltVersand: false`) stimmt das nicht. **„inkl. MwSt.“ fehlt** (B2C-Preisangabe; auf `/preise` und in der ServicePriceGrid steht es). Wunschkennzeichen (+12 €) wird nicht erwähnt. | Text aus `leistungsPreis(slug)` ableiten wie in `ServicePriceGrid.tsx:44-47`: „inkl. MwSt. und amtlicher Gebühren · inkl. Versand / komplett digital“. Optional eine Zeile „Wunschkennzeichen +12 €“. |
| F18 | CRO | Mittel | `components/home/*`, `app/page.tsx:69-73`, `lib/reviews.ts:30` | Vertrauenselemente auf der Startseite: Es gibt keine Bewertungen (Liste bewusst leer, das ist richtig), keine FAQ-Sektion, kein „Wer steckt dahinter“ (Firma, Berliner Adresse, Ansprechperson) und keinen Hinweis auf die Zahlung („erst nach Festpreis-Bestätigung per Rechnung“). Dieser stärkste Einwand-Entkräfter steht nur klein in `AuftragForm.tsx:641-648,697-700`. | Unter den Konfigurator eine Zeile „Bezahlung erst nach Festpreis-Bestätigung – per Rechnung“. Vor `FinalCTA` eine kurze FAQ (5 Fragen, `FaqAccordion`) und einen Block „Ihr Ansprechpartner“ (Name/Foto/Firmensitz, Link Impressum). Sobald echte Google-Bewertungen vorliegen, `Testimonials` einbinden. |
| F19 | CRO | Mittel | `components/Header.tsx:99-106`, `components/GewerbeCTA.tsx:51-54` | Telefon ist im Header nur ein Icon ohne sichtbare Nummer und ohne Servicezeiten. Die Zielgruppe „ohne eID“ ist tendenziell älter, und eine sichtbare Nummer schafft Vertrauen. Im B2B-Block steht die Nummer als **reiner Text ohne `tel:`-Link**. | Ab `xl` die Nummer sichtbar zeigen (`site.contact.phoneDisplay`), mobil das Icon behalten. In `GewerbeCTA` die Nummer als `TrackedLink href="tel:…" event="phone_click"`. |
| F20 | A11y | Mittel | `components/AuftragForm.tsx:538-568`, `:349-399`, `:442-519` | Fehler-Verknüpfung unvollständig: `err-contact` ist weder mit E-Mail noch mit Telefon über `aria-describedby` verbunden. Der Fehler in Schritt 1 (`err-serviceSlug`) ist nicht mit der Radiogroup verknüpft. Pflichtfelder sind nur mit „*“ markiert, es gibt weder `required`/`aria-required` noch eine Legende „* Pflichtfeld“ (3.3.2). Nach fehlgeschlagener Prüfung wird nicht das erste fehlerhafte Feld fokussiert. | `aria-describedby={[errors.email && "err-email", errors.contact && "err-contact"].filter(Boolean).join(" ")}` (analog Telefon). `aria-describedby="err-serviceSlug"` und `aria-invalid` an der Radiogroup. `aria-required="true"` setzen und den Hinweis „* Pflichtfeld“ ergänzen. In `next()` nach `setErrors` das erste `[aria-invalid=true]` fokussieren. |
| F21 | A11y | Mittel | `components/Header.tsx:123-163` | Mobilmenü: **Escape schließt nicht**, der Fokus bleibt beim Öffnen auf dem Button und kehrt beim Schließen nicht kontrolliert zurück. Das Menü schließt bei Zurück-Navigation nicht (nur bei Klick). `aria-controls` zeigt bei geschlossenem Menü auf ein nicht vorhandenes Element. | `useEffect` mit `keydown`-Listener (Escape → `setOpen(false)`, Fokus zurück auf den Button). Bei `pathname`-Wechsel schließen. Das `nav` immer rendern und mit `hidden={!open}` steuern. |
| F22 | A11y | Mittel | `components/Header.tsx:112` | Header-WhatsApp-Icon `#25D366` auf `wa/15`: **1,77 : 1** (Grafik, 1.4.11 verlangt 3 : 1). | Icon in `#0e7a5f` (4,71 : 1 auf der hellgrünen Fläche) oder Fläche `bg-[#075E54]` mit weißem Icon. |
| F23 | A11y | Mittel | `components/DocumentUpload.tsx:126`, `AuftragForm.tsx:93` (Platzhalter) | „oder Dateien hierher ziehen“ in `ink-400` auf `ink-50`: **2,45 : 1**. Platzhalter `ink-400`: 2,56 : 1. Platzhalter wie „max@beispiel.de“ werden leicht für ausgefüllte Werte gehalten. | `text-ink-500` (4,55 : 1) für den Hinweis, `placeholder:text-ink-500` für Platzhalter. |
| F24 | A11y | Mittel | `app/leistungen/[slug]/page.tsx:342`, `app/preise/page.tsx:87` | Hinweis „Unverbindliche Orientierung“ bzw. Badge „unverbindlich“ (10 px!) in `accent-600` auf `accent-400/15–20`: **≈ 2,9 : 1**. | `text-amber-900` (#78350f) oder `#92400e` (6,5 : 1), Badge mindestens `text-xs`. |
| F25 | A11y | Mittel | `components/AuftragForm.tsx:349-397` | Die Leistungsauswahl im Formular nutzt `role="radio"`-Buttons. Alle sind einzeln tabbar, Pfeiltasten gehen nicht, das entspricht nicht dem ARIA-Radio-Muster. Der Konfigurator (`Konfigurator.tsx:33-44`) macht es richtig. | Gleiches Muster wie im Konfigurator (roving `tabIndex` + Pfeiltasten) oder native `<input type="radio">` in Labels (wie Z. 418 ff., dann mit sichtbarem Fokus, siehe F08). |
| F26 | Track | Mittel | `components/UnterlagenForm.tsx:49` | Der Link zum Nachreichen nutzt `/unterlagen/?ref=DZ-…`. **Plausible wertet `?ref=` als Traffic-Quelle aus**, Referenznummern würden also in „Quellen“ auftauchen. Matomo speichert die volle URL. Die Referenz ist einer Person zuordenbar (Pseudonym). | Parameter umbenennen (`?vorgang=`) oder als Hash übergeben (`#ref=…`, wird nicht übertragen). Bei Matomo zusätzlich `setCustomUrl(location.pathname)`. |
| F27 | Track | Mittel | `components/Analytics.tsx:49-62` | Matomo zählt nur den **ersten** Seitenaufruf. Next.js navigiert clientseitig, Folgeseiten fehlen. Plausible erkennt `pushState` dagegen selbst. | In `Analytics` per `usePathname()`-Effekt `_paq.push(['setCustomUrl', pathname]); _paq.push(['trackPageView'])` bei jedem Pfadwechsel. |
| F28 | CRO | Mittel | `components/home/ComparisonSection.tsx:123-149` | Mobil zeigt der Vergleich drei Karten nacheinander, **DeutscheZulassung als letzte**. Man muss erst durch Zulassungsstelle und i-Kfz scrollen. | Mobil die eigene Karte zuerst (`order-first` für `i === 2`), die anderen beiden darunter, optional einklappbar. |
| F29 | CRO | Mittel | `app/preise/page.tsx:54-55` | Die Preistabellen haben `min-w-[40rem]` und scrollen auf dem Handy horizontal. Die Spalte „Kennzeichen & Versand“ ist ohne Wischen nicht zu sehen. Der Scroll-Container ist nicht fokussierbar. | Unter `md` als Karten/`dl` rendern (wie `ComparisonSection` mobil) oder Spalten zusammenfassen. Dem Container `tabIndex={0}`, `role="region"` und `aria-label` geben. |
| F30 | CRO | Niedrig | `app/auftrag/page.tsx:22`, `lib/homepage.ts:94`, `ComparisonSection.tsx:47` | Widersprüchliche Zeitangaben: „Zwei Minuten“ (Auftragsseite) gegenüber „Auftrag in 10 Minuten erteilt“ (Konfigurator) und „Etwa 10 Minuten für Fotos und Vollmacht“. | Einheitlich: „Anfrage in 2 Minuten – Unterlagen in ca. 10 Minuten“. |
| F31 | Perf | Niedrig | `components/Header.tsx:70-77`, `public/.htaccess:44-46` | Header-Logo als PNG mit 600×200 px (11,6 KB) wird mit `priority` vorgeladen, angezeigt aber nur in 108×36 px. Bilder haben keinen `Cache-Control`-Header, wiederkehrende Besucher revalidieren also jedes Mal. | Logo als SVG (oder WebP 216×72, ≈ 3 KB). In `.htaccess` `<FilesMatch "\.(png|webp|jpg|svg|ico)$"> Header set Cache-Control "public, max-age=2592000"` (30 Tage). |
| F32 | Perf | Niedrig | `app/layout.tsx:10-20`, `app/globals.css:102-205` | Zwei variable Fonts werden vorgeladen (68,5 KB). Das CSS (68 KB roh) enthält Keyframes/Klassen der alten Startseite (blob, floaty, dash, tick, drive, sign, typing). | Für Source Sans 3 `preload: false` prüfen (Fließtext rendert sofort im angepassten Fallback, LCP-Text ist Lexend). Ungenutzte Animationsklassen entfernen, sobald `HeroFlowAnimation`, `ProcessTimeline` und `ChatMockup` nicht mehr gebraucht werden. |
| F33 | A11y | Niedrig | `components/home/ComparisonSection.tsx:55` | „Nachteil“-X-Icon `#ff4d4f` auf `danger/15`: 2,72 : 1. Die Bedeutung trägt auch der sr-only-Text, die Grafik selbst liegt aber unter 3 : 1. | Danger-Token auf `#d92d20` (3,85 : 1 auf der hellen Fläche). |
| F34 | A11y | Niedrig | `components/home/Konfigurator.tsx:111-114` | `aria-live="polite"` liegt auf der **gesamten** Zusammenfassung (Kennzeichen, Überschrift, Beschreibung, Preis, Dauer, Link). Jede Auswahl löst eine lange Ansage aus. | `aria-live` nur auf einen kleinen Satz legen, z. B. `<p className="sr-only" aria-live="polite">Ummeldung: 128 Euro inklusive Gebühren</p>`. |
| F35 | A11y | Niedrig | `components/home/ProcessSteps.tsx:17` | `aria-current="step"` auf einer rein illustrativen Schrittleiste. Screenreader melden „Schritt 1, aktueller Schritt“, obwohl kein Prozess läuft. | `aria-current` entfernen. |
| F36 | A11y | Niedrig | `components/DocHint.tsx:56` | Info-Toggle mit 20×20 px. WCAG 2.5.8 verlangt 24×24 px (Abstandsausnahme greift nur knapp), auf dem Handy ist er schwer zu treffen. | `h-6 w-6` plus negative Margins, oder unsichtbar vergrößerte Trefferfläche (`before:absolute before:-inset-2`). |
| F37 | A11y | Niedrig | `components/AuftragForm.tsx:673-690` | Der Sendestatus („Unterlagen werden übertragen …“) ändert nur den Button-Text, eine Live-Region fehlt. Bei großen Uploads (bis 25 MB) gibt es keinen Fortschritt. | `aria-live="polite"`-Statuszeile und `aria-busy` am Formular. Für Uploads `XMLHttpRequest.upload.onprogress` mit Prozentanzeige. |
| F38 | A11y | Niedrig | `components/AuftragForm.tsx:305-791` | Es gibt kein `<form>`-Element: Enter in einem Feld löst „Weiter“ nicht aus, und Browser-Autofill/Passwortmanager erkennen keinen Formularkontext. | Schrittinhalt in `<form noValidate onSubmit={(e)=>{e.preventDefault(); step<3 ? next() : send();}}>` einbetten, „Weiter“ als `type="submit"`. |
| F39 | A11y | Niedrig | `components/Analytics.tsx:79-112` | Einwilligungsbanner (nur bei aktivem Google Ads): `role="dialog"` ohne `aria-modal`, ohne Fokusübergabe, liegt über der MobileCTA. | Fokus beim Erscheinen auf die Überschrift setzen. Als nicht-modale `region` mit `aria-label` auszeichnen oder als echten modalen Dialog bauen. |
| F40 | A11y | Info | `app/globals.css:76-80` | Der globale `:focus-visible`-Stil ist nicht in einem Layer und überschreibt deshalb alle Tailwind-Utilities (`outline-none`, `focus-visible:outline-navy`). Das ist gut, denn der Fokus ist überall sichtbar (brand-500: 3,68 : 1 auf Weiß, 3,48 auf Gold-50, 4,49 auf Navy). Die navy-Fokusringe im Code greifen dadurch aber nie. | Bewusst so lassen oder den globalen Stil auf `var(--color-navy)` umstellen (16,5 : 1 auf Weiß). Auf Navy-Flächen dann `outline-gold`. |
| F41 | A11y | Info (positiv) | `app/layout.tsx:118-126`, `FaqAccordion.tsx:22-46`, `Konfigurator.tsx:33-72`, `globals.css:208-217,244-252` | `lang="de"`, Skip-Link, `main#hauptinhalt`, genau eine H1 je Seite, saubere Überschriftenfolge (live geprüft). FAQ mit `aria-expanded`/`aria-controls`/`hidden`, Konfigurator als Radiogroup mit Pfeiltasten. `prefers-reduced-motion` wird global für CSS beachtet, alle framer-motion-Komponenten nutzen `useReducedMotion`. Alt-Texte an Logos und DocHint-Bildern. Fokus springt beim Schrittwechsel auf die neue H2. | Beibehalten. Hinweis: `FaqAccordion` vergibt feste IDs (`faq-panel-${i}`). Bei zwei Akkordeons auf einer Seite gäbe es doppelte IDs, deshalb `useId()` nutzen. |

---

## 3. Tracking: Soll/Ist

Grundlage: `lib/analytics.ts:27-38` (Ereignistypen), `:42` (erlaubte Eigenschaften), alle `track(`-/`TrackedLink`-Aufrufe im Code.

| # | Soll-Ereignis | Status | Ist (Datei:Zeile) | Lücken | Vorschlag |
|---|---|---|---|---|---|
| 1 | **Service ausgewählt** | vorhanden | `service_selected`: `Konfigurator.tsx:30`, `PriceCalculator.tsx:63`, `AuftragForm.tsx:168` (Deeplink), `:181` (Formular) | Feuert bei erneutem Klick auf dieselbe Kachel im Formular doppelt (`AuftragForm.tsx:179-182`). Die Vorauswahl „Neuzulassung“ im Konfigurator zählt nicht. | In `set()` nur bei geändertem Wert feuern. Positionen beibehalten. |
| 2 | **Preisbox gesehen** | **fehlt** | – | Konfigurator-Preisbox (`Konfigurator.tsx:122`), Leistungs-Preisbox (`app/leistungen/[slug]/page.tsx:273`), `ServicePriceGrid.tsx:41`, Preisrechner-Ergebnis (`PriceCalculator.tsx:109`), Zusammenfassung Schritt 4 (`AuftragForm.tsx:594`) | Neues Ereignis `price_view` {`service`, `position`} per `IntersectionObserver` (≥ 50 % sichtbar, ≥ 1 s), einmal pro Seite und Position. Typ in `AnalyticsEvent` ergänzen. |
| 3 | **„Jetzt starten“ geklickt** | vorhanden (teilweise) | `cta_click`: `Konfigurator.tsx:143-151` („Jetzt starten“), `Header.tsx:118,156`, `MobileCTA.tsx:45`, `FinalCTA.tsx:17`, `CTASection.tsx:18`, `PriceCalculator.tsx:134`, `app/[landing]/page.tsx:125`, `app/zulassungsstelle/[slug]/page.tsx:405`, `app/kennzeichen/[kuerzel]/page.tsx:156` | **Nicht erfasst:** `app/leistungen/[slug]/page.tsx:350` (Preisbox „Jetzt beauftragen“), `:194` (ctaLink), `ServicePriceGrid.tsx:54`, `app/kfz-zulassung/[stadt]/page.tsx:149,264`, `StorySection.tsx:16`. Die Eigenschaft `page` steht in `TRACKING.md:40` als gesendet, wird aber nirgends gesetzt. | Fehlende Stellen auf `TrackedLink` umstellen. In `track()` automatisch `page: location.pathname` (ohne Query) ergänzen, dann reicht `position` für die Herkunft. |
| 4 | **WhatsApp geklickt** | vorhanden (teilweise) | `whatsapp_click`: `Header.tsx:110`, `MobileCTA.tsx:37`, `FinalCTA.tsx:26`, `CTASection.tsx:26`, `app/[landing]/page.tsx:134` | **Nicht erfasst:** `Footer.tsx:90`, `app/leistungen/[slug]/page.tsx:357`, `app/auftrag/page.tsx:39`, `app/kontakt/page.tsx:18`, `app/unterlagen/page.tsx:69`, `app/zulassung-per-whatsapp/page.tsx:140`, `app/maxx/page.tsx:106`, `GewerbeCTA.tsx:40`, **`AuftragForm.tsx:282` (nach Absenden in den Chat, wichtig für den Funnel)**, `AuftragForm.tsx:710` (Fallback) | Alle `whatsAppLink(`-Anker durch `TrackedLink event="whatsapp_click"` ersetzen, mit eindeutiger `position` (`footer`, `leistung_preisbox`, `auftrag_seite`, `nach_absenden`, `fallback` …). |
| 5 | **Telefon geklickt** | vorhanden (nur Header) | `phone_click`: `Header.tsx:102` | **Nicht erfasst:** `Footer.tsx:84`, `app/kontakt/page.tsx:34`. In `GewerbeCTA.tsx:53` ist die Nummer gar kein Link. `email_click` ist definiert (`analytics.ts:31`), wird aber **nie** ausgelöst (`Footer.tsx:78`, `kontakt/page.tsx:26`, `AuftragForm.tsx:294`, `GewerbeCTA.tsx:33`). | Mit `TrackedLink` nachrüsten. In `GewerbeCTA` einen `tel:`-Link ergänzen. |
| 6 | **Formular gestartet** | vorhanden | `order_start`: `AuftragForm.tsx:123-128` (erste Leistungswahl, Deeplink oder „Weiter“) | Beim Deeplink `?leistung=` feuert es **schon beim Laden der Seite** ohne jede Interaktion (`AuftragForm.tsx:167`). Die Startquote ist für Konfigurator-Besucher dadurch zu hoch. | Aufteilen: `order_view` beim Laden (mit `service`/`position=deeplink`), `order_start` erst bei der ersten echten Eingabe (erster Fokus in einem Feld oder erster Klick). |
| 7 | **Formularschritt abgeschlossen** | vorhanden | `order_step`: `AuftragForm.tsx:194` | Der Wert `step` ist der **erreichte** Schritt (2–4), nicht der abgeschlossene, das ist leicht zu verwechseln. Gewerbe- und Privatkunden lassen sich nicht unterscheiden. | Umbenennen in `order_step_completed` {`step`: abgeschlossener Schritt 1–3, `service`}. `audience` (`privat`/`gewerblich`, kein Personenbezug) zu `ALLOWED_PROPS` hinzufügen. |
| 8 | **Formular abgebrochen** | vorhanden, **fehlerhaft** | `order_abandon`: `AuftragForm.tsx:135-145` | Falsch positive Treffer durch Tab-/App-Wechsel und Kamera-Upload (siehe F09). Nach Rückkehr wird nichts zurückgesetzt. | Abbruch als Funnel auswerten (Start ohne Abschluss). Ereignis höchstens auf `pagehide`, Upload-Dialog ausnehmen. Zusätzlich `order_error` {`step`, `value`: HTTP-Status, `method`: Feldname} bei fehlgeschlagenem Absenden (`AuftragForm.tsx:221`). |
| 9 | **Auftrag abgeschlossen** | vorhanden | `order_submitted`: `AuftragForm.tsx:227` (+ Google-Ads-Conversion `analytics.ts:82-84`, nur mit Einwilligung); `documents_uploaded`: `UnterlagenForm.tsx:95` | `value` (Preis) wird nicht mitgegeben, Ads-Conversion ohne Wert. `audience` fehlt. | `value: service.price.serviceFee` (Zahl, kein Personenbezug), `audience` ergänzen. |
| 10 | **B2B-Anfrage** | **fehlt** | – | `GewerbeCTA.tsx:32-49` (E-Mail/WhatsApp), Gewerbeseiten `app/gewerbe/page.tsx`, `app/gewerbe/[slug]/page.tsx`. Im Formular wird `audience=gewerblich` nicht ausgewertet. | Neues Ereignis `b2b_request` {`method`: `email`/`whatsapp`/`telefon`/`formular`, `position`: Segment-Slug}. Zusätzlich `order_submitted` mit `audience: "gewerblich"`. |
| 11 | **Tool verwendet** | **fehlt** | – | `KfzSteuerRechner.tsx` (Eingaben Z. 91–146), `BehoerdengangRechner.tsx` (Z. 61–97), `StellenSuche.tsx:63`, `PriceCalculator.tsx` (nur Leistungswechsel erfasst) | Neues Ereignis `tool_used` {`service`: `kfz_steuer`/`behoerdengang`/`stellensuche`/`preisrechner`} **einmal pro Seitenaufruf**, sobald ein gültiges Ergebnis angezeigt wird (entprellt 1 s). **Keine Eingabewerte** senden (Hubraum/CO₂ sind unkritisch, Suchbegriffe können aber Ortsangaben enthalten). |

### Personenbezug: Prüfung

| Prüfpunkt | Ergebnis |
|---|---|
| Whitelist der Eigenschaften (`analytics.ts:42`, `sanitize()` Z. 59–72) | ✓ Nur `position`, `service`, `step`, `value`, `method`, `page`. Zeichenketten werden auf 40 Zeichen gekürzt, E-Mail-, Telefon-/IBAN- und FIN-Muster werden verworfen. |
| Aufrufer übergeben nur feste Werte | ✓ Alle `track()`-Aufrufe senden Slugs, Positionsnamen oder Schrittnummern. Formularwerte (Name, E-Mail, Telefon, PLZ, Fahrzeug, Nachricht) werden nie übergeben. |
| Matomo-Outlink-Tracking | ✗ **Risiko**, siehe F10: `wa.me?text=` mit Kontaktdaten und Referenz. |
| URL-Parameter mit Bezug zu einer Person | ✗ **Risiko**, siehe F26: `/unterlagen/?ref=DZ-…`. |
| Seitenaufrufe `/auftrag/?leistung=…` | ✓ unkritisch (fester Slug) |
| Aussage „Keine Tracking-Cookies“ (`lib/homepage.ts:183`) | ⚠ Stimmt nur, solange Google Ads aus ist. Beim Aktivieren von `NEXT_PUBLIC_GADS_ID` Text anpassen („Keine Tracking-Cookies ohne Ihre Einwilligung“). |

---

## 4. Vorschlag für die Conversion-Baseline

### 4.1 Voraussetzungen (Woche 0, vor dem Einschalten)

1. Anbieter wählen. Empfehlung: **Matomo selbst gehostet** (keine CSP-Änderung, keine Datenübermittlung an Dritte) **oder Plausible über einen Proxy auf der eigenen Domain**. F10, F11, F26 und F27 vorher beheben.
2. Fehlerhafte oder fehlende Ereignisse korrigieren: F09 (Abbruch), Tracking-Tabelle Nr. 3–5 (fehlende CTA-/WhatsApp-/Telefon-Klicks), Nr. 6 (Start erst bei Interaktion), `order_error`.
3. Den WhatsApp-Vorbelegungstexten einen kurzen, nicht personenbezogenen Herkunftscode anhängen (z. B. „[H1]“ Header, „[L-umm]“ Leistung Ummeldung). Dann lässt sich im WhatsApp-Business-Postfach zählen, welche Klicks tatsächlich zu Chats führen.
4. Für die Offline-Strecke in der Auftragsliste je Referenznummer festhalten: *Anfrage → Festpreis bestätigt → bezahlt*. Diese Daten gehören nicht in die Webanalyse.

### 4.2 Baseline-Zeitraum

- **Start:** sofort nach dem Deploy mit aktiver Analyse und den Korrekturen aus 4.1.
- **Dauer:** **4 Wochen ohne inhaltliche Änderungen** an Startseite, Leistungsseiten und Formular, mindestens aber bis **≥ 100 `order_start`** und **≥ 30 `order_submitted`** erfasst sind (bei wenig Traffic entsprechend länger).
- **Auswertung:** wöchentlich, getrennt nach **Mobil/Desktop** und nach **Einstiegsgruppe** (Startseite, Leistungsseiten, Stadtseiten `/kfz-zulassung/*`, Zulassungsstellen `/zulassungsstelle/*`, Ratgeber, Preise, Landingpages).

### 4.3 Kennzahlen

| Kennzahl | Definition | Quelle |
|---|---|---|
| Besucher / Sitzungen | eindeutige Besucher, Sitzungen je Einstiegsgruppe und Gerät | Seitenaufrufe |
| **Preis-Sichtquote** | Sitzungen mit `price_view` / Sitzungen | `price_view` |
| **CTA-Klickrate** | Sitzungen mit `cta_click` / Sitzungen (nach `position`) | `cta_click` |
| **Direktkontakt-Rate** | Sitzungen mit `whatsapp_click` ∪ `phone_click` ∪ `email_click` / Sitzungen | Klickereignisse |
| Formular-Aufrufquote | Aufrufe `/auftrag/` / Sitzungen | Seitenaufrufe, `order_view` |
| **Formular-Startquote** | `order_start` / `order_view` | Ereignisse |
| **Schritt-Durchlauf** | `order_step_completed{1}`/`order_start`, `{2}`/`{1}`, `{3}`/`{2}`, `order_submitted`/`{3}` | Funnel |
| **Formular-Abschlussquote** | `order_submitted` / `order_start` | Funnel |
| Upload-Quote | `order_submitted{method=formular_mit_upload}` / `order_submitted` | `method` |
| Fehlerquote beim Absenden | `order_error` / (`order_submitted` + `order_error`) | `order_error` |
| **Makro-Conversion-Rate** | (`order_submitted` + WhatsApp-Chats mit Herkunftscode + Anrufe) / Sitzungen | Analyse + WhatsApp-Postfach |
| B2B-Anfragen | `b2b_request` + `order_submitted{audience=gewerblich}` pro Woche | Ereignisse |
| Tool-Nutzung → Auftrag | Sitzungen mit `tool_used` **und** `cta_click` / Sitzungen mit `tool_used` | Ereignisse |
| Anfrage → Auftrag (offline) | bestätigte Festpreise / `order_submitted` | Auftragsliste |
| **Core Web Vitals (Feld)** | p75 von LCP, INP, CLS je Seitentyp und Gerät | `web-vitals` (≈ 2 KB) als Ereignis `web_vital` {`method`: LCP/INP/CLS, `value`: gerundet, `page`}; später CrUX/Search Console |

### 4.4 Danach: erste Experimente nach erwarteter Wirkung

1. **F01** (stilles Scheitern) und **F08/F20** sofort beheben. Das sind Fehler, kein Test nötig.
2. **F03**: Konfigurator-Auswahl in die MobileCTA übernehmen. Erwartet: höhere Startquote mobil.
3. **F02**: Preis und CTA im Hero der Leistungsseiten. Erwartet: höhere CTA-Klickrate bei Einstieg über Leistungsseiten.
4. **F13**: Ort optional, Checkbox durch Hinweis ersetzen (nach Rechtsprüfung). Erwartet: höherer Durchlauf in Schritt 2 → 3 und 3 → Absenden.
5. **F15/F16**: einheitliche CTA-Texte und -Farbe. Zeitreihe gegenüber der Baseline, kein A/B-Test.

Jede Änderung einzeln ausrollen, mit mindestens 2 Wochen Abstand, und mit der Baseline derselben Einstiegsgruppe und desselben Geräts vergleichen.

---

## Anhang: Kontrastverhältnisse der Farbtokens (WCAG 2.x, berechnet)

Grenzwerte: Fließtext 4,5 : 1 · große Schrift (≥ 24 px oder ≥ 18,66 px fett) und Grafik/UI-Grenzen 3 : 1.

| Paar | Vordergrund | Hintergrund | Verhältnis | Bewertung |
|---|---|---|---|---|
| **Gold auf Weiß** | #f4b740 | #ffffff | **1,80** | ✗ für jeden Text |
| **Weiß auf Gold** | #ffffff | #f4b740 | **1,80** | ✗ für jeden Text (derzeit nicht verwendet, bitte auch künftig vermeiden) |
| Gold auf Off-White (Hero-H1) | #f4b740 | #faf8f3 | 1,69 | ✗ (F05) |
| Gold-600 auf Weiß (Eyebrows) | #d99a1e | #ffffff | 2,44 | ✗ (F06) |
| Gold-600 auf Off-White | #d99a1e | #faf8f3 | 2,30 | ✗ |
| Gold-600 auf Gold-50 (Timer-Icon) | #d99a1e | #fff8e8 | 2,31 | ✗ Grafik (Icon ist dekorativ, Text daneben, tolerierbar) |
| Navy auf Gold (FinalCTA-Button, Haken-Badges) | #0b1f3a | #f4b740 | 9,20 | ✓ |
| Gold auf Navy (Pfeil-Icons) | #f4b740 | #0b1f3a | 9,20 | ✓ |
| Navy auf Weiß / Off-White / Gold-50 | #0b1f3a | – | 16,52 / 15,56 / 15,61 | ✓ |
| Muted auf Weiß / Off-White / Gold-50 | #526071 | – | 6,42 / 6,05 / 6,07 | ✓ |
| Weiß auf Navy | #ffffff | #0b1f3a | 16,52 | ✓ |
| white/75 · /70 · /60 · /50 auf Navy | – | #0b1f3a | 9,72 · 8,64 · 6,64 · 5,04 | ✓ |
| Rahmen white/25 auf Navy (Sekundärbutton) | – | #0b1f3a | 2,24 | ⚠ Grenze (Beschriftung identifiziert den Button, tolerierbar) |
| Navy/80 auf Weiß (Header-Navigation) | #3c4c61 | #ffffff | 8,76 | ✓ |
| **Weiß auf #25D366 (MobileCTA)** | #ffffff | #25d366 | **1,98** | ✗ (F04) |
| #25D366 auf wa/15 (Header-Icon) | #25d366 | #def8e8 | 1,77 | ✗ Grafik (F22) |
| Weiß auf brand-600 / brand-700 | #ffffff | #2563eb / #1d4ed8 | 5,17 / 6,70 | ✓ |
| brand-700 auf Weiß (Links, Preise) | #1d4ed8 | #ffffff | 6,70 | ✓ |
| ink-500 auf Weiß / ink-50 / ink-100 | #64748b | – | 4,76 / 4,55 / 4,34 | ✓ / ✓ / ✗ knapp (Schrittnummern offen, 14 px fett → als „groß“ grenzwertig) |
| ink-400 auf Weiß / ink-50 | #94a3b8 | – | 2,56 / 2,45 | ✗ (F23) |
| Rahmen ink-200 / ink-300 auf Weiß | – | #ffffff | 1,23 / 1,48 | ✗ UI-Grenze (F07) |
| Rahmen Line auf Weiß (Konfigurator-Kacheln) | #dfe4e9 | #ffffff | 1,28 | ⚠ Zustand zusätzlich über Haken-Badge erkennbar |
| accent-600 auf accent-400/15 | #d97706 | #fef5de | 2,93 | ✗ (F24) |
| red-600 auf Weiß (Fehlertext) | #dc2626 | #ffffff | 4,83 | ✓ |
| Rahmen red-400 auf red-50 (Fehlerfeld) | #f87171 | #fef2f2 | 2,53 | ✗ UI-Grenze |
| danger #ff4d4f auf danger/15 | #ff4d4f | #ffe4e5 | 2,72 | ✗ Grafik (F33) |
| Fokusring brand-500 auf Weiß / Gold-50 / Navy | #3b82f6 | – | 3,68 / 3,48 / 4,49 | ✓ (3 : 1) |
| Weiß auf emerald-600 (Schritt erledigt, Icon) | #ffffff | #059669 | 3,77 | ✓ Grafik |

**Ersatzwerte (geprüft):** Gold für Text `#8a5a00` (5,93 auf Weiß, 5,58 auf Off-White) oder `#a16207` (4,92 / 4,64) · WhatsApp-Fläche `#075E54` mit Weiß (7,67) oder Navy auf `#25D366` (8,33) · Hinweis-Orange `#92400e` (6,53) · Danger `#d92d20` (3,85 auf heller Fläche) · Feldrahmen `ink-500` (4,76).
