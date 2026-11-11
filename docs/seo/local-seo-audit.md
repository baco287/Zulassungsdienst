# Local-SEO-Audit deutschezulassung.de

Stand: 09.11.2026 · Basis: Live-Crawl `docs/seo/url-inventory.csv` (1.214 URLs, alle 200, alle `index, follow`), Datenmodule `lib/staedte.ts`, `lib/zulassungsstellen.ts` und `lib/data/zulassungsstellen.json`, Live-HTML von 24 Stichproben.
Entscheidung je URL: `docs/seo/local-pages-index-decision.csv` (1.153 Zeilen, aus den Datenmodulen erzeugt).

## 1. Kurzfazit

| Seitentyp | Seiten | Individueller Textanteil (Stichprobe) | Doorway-/Thin-Risiko | Empfehlung |
|---|---:|---:|---|---|
| `/zulassungsstelle/<slug>/` | 404 | ca. 30 % der Wörter, aber fast nur belegte Fakten (Adresse, Zeiten, Zuständigkeit, Besonderheiten) | **niedrig** (384), mittel (14), hoch (6) | 388 index, 15 noindex, 1 ausbauen (Wiesbaden) |
| `/kfz-zulassung/<stadt>/` | 40 | ca. 45 % der Wörter, davon fast alles Werbetext ohne Quelle; je Seite nur 2 geprüfte lokale Fakten (Behörde, Kürzel) | **hoch** (23, unbelegte Aussagen zu Terminen und Wartezeiten), mittel (17) | 20 Prioritätsstädte ausbauen, 20 übrige noindex |
| `/kennzeichen/<kuerzel>/` | 709 | ca. 19 % (bei Kürzeln mit nur einer Behörde 5–15 %) | **hoch** (427), mittel (282) | 427 zusammenführen (noindex), 279 noindex, 3 index |

Die wichtigsten Punkte:

1. **Behördenseiten sind die stärkste lokale Seitenart.** Sie haben echte, belegte Daten und eine Prüfdatum-Angabe. 16 Seiten fallen durch das Index-Gate, 10 davon, weil als Zuständigkeit nur die gesetzliche Regel (§ 75 FZV) eingetragen ist und keine Angabe der Behörde selbst.
2. **Die Stadtseiten verstoßen gegen die Betreibervorgaben.** 23 der 40 Seiten (13 der 20 Prioritätsstädte) behaupten Termin-Engpässe ohne Quelle, z. B. Berlin „oft auf Wochen ausgebucht“, Stuttgart „Termine wollen erkämpft … sein“, Münster „schwerer zu bekommen als ein Parkplatz“. Dazu kommt ein Satz im Template, der auf allen 40 Seiten steht: „Zulassungstermine sind in vielen Städten Wochen im Voraus ausgebucht“ (`app/kfz-zulassung/[stadt]/page.tsx`, Z. 130). Außerdem fehlen Quellen, Prüfdatum, Anschrift, belegte Zuständigkeit, lokale Besonderheiten, Unterlagen und Links zu Nachbarregionen.
3. **Die Kennzeichenseiten sind Massenseiten nach Vorlage.** 427 von 709 Seiten haben genau eine zuständige Behörde und keinen weiteren Hinweis. Was darauf steht, steht schon im Kürzel-Block der Behördenseite. 229 Seiten haben eine Textähnlichkeit über 0,7 (Crawl). Die Kürzel-Bedeutung stammt bei **706 von 709** Seiten aus Wikipedia, nicht aus einer offiziellen Quelle.
4. **Frankfurt am Main hat inzwischen eine veröffentlichte Behördenseite.** Der Hinweis in `docs/UMSETZUNG-2026-11.md` ist veraltet (siehe Abschnitt 7).
5. **Zwei Behörden schließen Online-Vorgänge in Vertretung ausdrücklich aus** (Rosenheim, Kreis Minden-Lübbecke), **Hamburg schließt „Vorgänge per Vollmacht“ online aus.** Die Hamburger Angabe fehlt noch in den Daten. 10 Behörden haben i-Kfz derzeit abgeschaltet oder eingeschränkt (u. a. Düsseldorf). 69 Behörden haben eigene Regeln für Zulassungsdienste (siehe Abschnitt 8).

## 2. Methode

- **Textanteil:** Von jeder Stichprobe wurde der Inhalt von `<main>` live abgerufen und in Sätze bzw. Bausteine zerlegt. Die eigenen Entitäten der Seite (Stadt, Behördenname, Kürzel, Kurzname) wurden maskiert. Ein Satz gilt als Template, wenn er nach der Maskierung wortgleich in mindestens 50 % der anderen Stichproben desselben Typs vorkommt. Skript: `C:\Users\karak\AppData\Local\Temp\claude\2e0cd8d98c0156c9\1df28564-061e-48be-b317-d62101afaa59\scratchpad\boilerplate.py`.
- **Index-Entscheidung:** Die Gate-Regel aus Abschnitt 5 wurde auf alle Datensätze angewendet. Die Daten stammen aus `cities` und `kennzeichen`, die per jiti aus den TS-Modulen gezogen wurden, sowie aus `zulassungsstellen.json`. Skripte: `…\scratchpad\dump.cjs` und `…\scratchpad\index_decision.py`. Quellen gelten als offiziell nach derselben Sperrliste wie in `scripts/verify-zulassungsstellen.mjs` (`BLOCKED_HOSTS`).
- **Gegenprüfung einer Quelle:** Die Hamburger Angabe zur Vollmacht wurde am 09.11.2026 direkt auf hamburg.de geprüft.

## 3. Template- und Individualanteil je Seitentyp

### 3.1 Messung (Wörter im `<main>`, live)

| Typ | Stichproben | Wörter `<main>` | davon individuell | Mittel |
|---|---|---|---|---|
| Stadt | berlin 516/251 · hamburg 441/176 · muenchen 455/190 · koeln 464/199 · frankfurt 479/204 · essen 516/251 · bonn 524/259 · kiel 494/229 | 441–524 | 40–49 % | **45 %** |
| Behörde | berlin 865/289 · frankfurt 816/209 · hamburg 814/239 · landkreis-cuxhaven 836/252 · rosenheim 785/216 · suhl 768/192 · alb-donau-kreis 948/374 · koeln 787/218 | 768–948 | 25–40 % | **30 %** |
| Kennzeichen | b 329/35 · f 327/19 · hh 307/17 · k 314/28 · mon 412/133 · lk 337/49 · ul 455/179 · ab 415/138 | 307–455 | 6–39 % | **19 %** |

Crawl-Werte (alle Seiten des Typs): Stadt im Median 595 Wörter und `max_similarity` 0,37. Behörde im Median 916 Wörter und 0,49. Kennzeichen im Median 423 Wörter und 0,69 (Maximum 0,74, 229 Seiten über 0,7). Ein- und ausgehende Links: Behördenseiten im Median 3 interne Links auf die Seite, Kennzeichenseiten 2, Stadtseiten 42 (Block „Weitere Städte“ auf jeder Stadtseite).

### 3.2 Satz-für-Satz: `/kfz-zulassung/berlin/` gegen `/kfz-zulassung/hamburg/`

- 107 Bausteine auf der Berliner Seite. **87 sind nach Austausch des Ortsnamens wortgleich**, 20 unterscheiden sich (265 Wörter gleich, 251 verschieden).
- Gleich sind: H1-Muster, der komplette Kasten „Keinen Termin bei der Zulassungsstelle in X bekommen?“ samt Template-Behauptung „in vielen Städten Wochen im Voraus ausgebucht“, die drei Häkchen-Punkte, „Diese Vorgänge übernehmen wir in X“, Ratgeber-Block, „Auf einen Blick“ mit identischer Dauer und identischem Preis, Seitenleiste, „Weitere Städte“, CTA.
- Verschieden sind nur `city.intro` (2 Absätze), `city.faq` (3–4 Fragen) und der Faktenwert „Zuständige Behörde“. **Von diesen 20 Bausteinen enthalten nur zwei eine prüfbare lokale Angabe: den Behördennamen (LABO bzw. LBV) und das Kürzel (B bzw. HH).** Der Rest ist umformulierter Service-Text, der für jede Stadt gelten würde („Sie fotografieren Ihre Unterlagen, erteilen die digitale Vollmacht …“, „1–3 Werktage“), plus eine unbelegte Aussage über Wartezeiten.
- Die Stadtseiten tauschen also nicht nur den Ortsnamen aus (die Texte sind wirklich umformuliert). Inhaltlich sind sie aber dieselbe Seite. Google bewertet das wie eine Doorway Page: viele Seiten für viele Orte, die alle auf denselben Auftrag führen und keinen eigenen Inhalt haben.

### 3.3 Behördenseiten

Individuell: `behoerde`, `traeger`, `standorte[]`, `website`, `terminUrl`, `ikfzUrl`, `oeffnungszeiten`, `zustaendigkeit`, `kuerzel[]`, `besonderheiten[]`, `geprueftAm`, Quellenliste. Im Median kommen 12 individuelle Merkmale zusammen.
Template: Disclaimer, Abschnitt „Online zulassen in X“, `ServicePriceGrid` (Preise und DZ-Laufzeiten), „Typische Unterlagen“ (für alle Seiten gleich), 3 der 5 FAQ-Antworten, CTA.
Der Template-Anteil ist hoch (ca. 70 % der Wörter), der individuelle Teil ist aber dichte, belegte Information mit Quellen. Das macht die Seite nicht zur Doorway Page. Die Ähnlichkeit liegt bei höchstens 0,55, keine Seite über 0,6.

### 3.4 Kennzeichenseiten

Individuell: `code`, `name`, `hinweis`, und je zuständige Behörde (`stellen[]`) Name, erste Anschrift und `zustaendigkeit.wert`. Alle diese Angaben, bis auf die Kürzel-Bedeutung, sind **Kopien der Behördenseite**.
Template: 4 FAQ (Wunschkennzeichen, Mitnahme seit 2015, ohne Termin, Bedeutung), Wunschkennzeichen-Kasten, CTA.
Bei Kürzeln mit nur einer Behörde (B, F, HH, K) liegt der eigene Anteil bei 5–11 %. Mehr eigener Inhalt kommt nur zustande, wenn mehrere Behörden dasselbe Kürzel vergeben (UL, AB) oder ein Altkennzeichen-Hinweis dabei ist (MON, LK).

## 4. Doorway-/Thin-Content-Bewertung je Typ

**Behördenseiten (404): Risiko niedrig.** Jede Seite beruht auf einem eigenen, belegten Datensatz und hat eine echte Funktion: Sie beantwortet „Wo ist die Zulassungsstelle X, wann hat sie offen, brauche ich einen Termin?“. Es gibt aber drei Schwächen:
1. 10 Seiten nennen als Zuständigkeit nur die gesetzliche Regel (§ 75 FZV), keine lokale Angabe: braunschweig, krefeld, kyffhaeuserkreis, landkreis-altenburger-land, landkreis-eichsfeld, landkreis-nordhausen, landkreis-saalfeld-rudolstadt, oberhausen, saale-holzland-kreis, wiesbaden.
2. 5 Seiten haben keinen Standort (kreis-hoexter, kreis-lippe, landkreis-bad-kreuznach, landkreis-harz, landkreis-regensburg), 1 Seite hat keine Besonderheit (main-taunus-kreis).
3. Das Template verspricht überall „ohne eigenen Termin“ und die DZ-Laufzeiten aus `ServicePriceGrid` (1–2 bzw. 1–3 Werktage, Abmeldung taggleich). Bei 10 Behörden widerspricht das deren eigenen Angaben zur Bearbeitungsdauer (Abschnitt 8.4).

**Stadtseiten (40): Risiko hoch.** Merkmale einer Doorway Page: 40 nahezu gleich aufgebaute Seiten, die alle auf `/auftrag/` führen. Je Seite gibt es nur 2 geprüfte lokale Fakten, keine Quelle und kein Prüfdatum. Die Seiten untereinander verlinkt (42 Links auf jede Seite) und mit Keyword-Listen in den Metadaten („Termin Zulassungsstelle X ausgebucht“). Erfundene bzw. unbelegte lokale Angaben zu Terminlage und Wartezeiten stehen auf 23 Seiten. Der Behördenname in `facts` weicht bei 39 von 40 Städten vom offiziellen Namen in `zulassungsstellen.json` ab, z. B. Kassel „Kfz-Zulassungsbehörde der Stadt Kassel“ gegenüber „Gemeinsame Zulassungsbehörde für Stadt und Landkreis Kassel“, oder München „Kfz-Zulassungsstelle im KVR München“ gegenüber „Kfz-Zulassungsstelle der Landeshauptstadt München“.

**Kennzeichenseiten (709): Risiko hoch (427) bzw. mittel (282).** Klassische Massenseiten nach Vorlage: 709 URLs, im Median 423 Wörter, Ähnlichkeit 0,69. Bei 427 Seiten gibt es keine Information, die nicht schon auf der Behördenseite steht. Die einzige seiteneigene Angabe (Bedeutung des Kürzels) ist durchgängig aus Wikipedia belegt. Das verletzt die Regel in `lib/zulassungsstellen.ts` („Nur Angaben aus offiziellen Quellen“) und die Betreibervorgabe. In der unabhängigen Prüfung im November wurde „Thin Content“ als Strategiefrage verworfen (`UMSETZUNG-2026-11.md`, Abschnitt 6). Nach den heutigen Betreibervorgaben gilt das nicht mehr: Indexierbar ist eine Seite nur mit individuellen, geprüften Infos.

## 5. Index-Gate (im Code umsetzbar)

Grundsatz: Eine Seite bekommt `index`, wenn **alle** Muss-Felder belegt sind und aus einer offiziellen Quelle stammen. Sonst bekommt sie `robots: { index: false, follow: true }` und fällt aus `app/sitemap.ts` und `/llms.txt` heraus. `generateStaticParams` bleibt unverändert: Die Seiten sind weiter erreichbar und intern verlinkt, damit keine 404 entstehen.

Offiziell bedeutet: Der Host steht nicht in `BLOCKED_HOSTS` (aus `scripts/verify-zulassungsstellen.mjs` nach `lib/` übernehmen). Aktuell bedeutet: `geprueftAm` ist höchstens 183 Tage alt (halbjährliche Neuprüfung, wie in `UMSETZUNG-2026-11.md`, Abschnitt 5, Punkt 3).

### 5.1 Behördenseite – `Zulassungsstelle` (lib/zulassungsstellen.ts)

| # | Muss-Bedingung | Feld(er) |
|---|---|---|
| B1 | Offizieller Behördenname mit offizieller Quelle | `behoerde.wert`, `behoerde.quelle` |
| B2 | Offizielle Behördenwebsite | `website.wert` |
| B3 | Zuständigkeitsgebiet mit lokaler, offizieller Quelle, **nicht** nur § 75 FZV (`quelle` ≠ gesetze-im-internet.de) | `zustaendigkeit.wert`, `zustaendigkeit.quelle` |
| B4 | Mindestens 1 Standort, jeder mit offizieller Quelle | `standorte[].strasse`, `standorte[].plz`, `standorte[].ort`, `standorte[].quelle` |
| B5 | Mindestens 1 Kennzeichenkürzel | `kuerzel[].code` |
| B6 | Mindestens ein Zugangsweg | `terminUrl` \| `ikfzUrl` \| `oeffnungszeiten` |
| B7 | Mindestens 1 lokale Besonderheit mit offizieller Quelle | `besonderheiten[].wert`, `besonderheiten[].quelle` |
| B8 | Prüfdatum höchstens 183 Tage alt | `geprueftAm` |
| Soll | Kürzel-Beleg offiziell (FZV Anlage 1 statt Wikipedia) | `kuerzel[].quelle` |

### 5.2 Stadtseite – `City` (lib/staedte.ts) plus verknüpfte `Zulassungsstelle`

| # | Muss-Bedingung | Feld(er) |
|---|---|---|
| S1 | Slug in der Liste `PRIORITAETSSTAEDTE` (die 20 Städte) | `city.slug` |
| S2 | Verknüpfte Behörde existiert und erfüllt B1–B8 | `getZulassungsstelle(city.slug)` |
| S3 | Mindestens 3 lokale FAQ | `city.faq[]` |
| S4 | Keine unbelegten Aussagen zu Terminen oder Wartezeiten (Lint-Regex über `city.intro` und `city.faq`, siehe Code) | `city.intro[]`, `city.faq[].question/answer` |
| S5 | **neu:** eigenes Prüfdatum der Stadttexte (höchstens 183 Tage) | `city.geprueftAm` |
| S6 | **neu:** mindestens 2 Links zu Nachbarbehörden (Slugs aus `zulassungsstellen.json`) | `city.nachbarn[]` |
| S7 | Template-Pflicht: Behördenname, Zuständigkeit, Standorte, Besonderheiten, Prüfdatum und Quellen werden **aus der `Zulassungsstelle` gerendert**, nicht aus `city.facts` | `stelle.behoerde.wert`, `stelle.zustaendigkeit.wert`, `stelle.standorte`, `stelle.besonderheiten`, `stelle.geprueftAm` |
| Soll | DZ-Bearbeitungszeit je Behörde statt einheitlich „1–3 Werktage“ (Abschnitt 8.4) | `city.facts` „Typische Dauer über uns“, neues Feld `dzBearbeitungszeit` |

Preis: kommt bereits zentral über `P`/`PRICES` aus `config/preise.json`, ist kein Gate-Kriterium.

### 5.3 Kennzeichenseite – `KennzeichenEintrag` (lib/zulassungsstellen.ts)

| # | Muss-Bedingung | Feld(er) |
|---|---|---|
| K1 | Kürzel-Bedeutung mit offizieller Quelle (FZV Anlage 1 oder Behördenseite) | `quelle` |
| K2 | Jede zuständige Stelle erfüllt B1–B8 | `stellen[]` |
| K3 | Eigener Mehrwert gegenüber der Behördenseite: mehrere Behörden vergeben das Kürzel **oder** es gibt einen Altkennzeichen- bzw. Vergabe-Hinweis | `stellen.length >= 2` \|\| `hinweis` (Regex `Altkennzeichen\|wieder erhältlich\|vergeben\|auch im\|und Landkreis`) |

### 5.4 Code-Vorschlag (`lib/indexGate.ts`)

```ts
import type { City } from "./staedte";
import { getZulassungsstelle, type KennzeichenEintrag, type Zulassungsstelle } from "./zulassungsstellen";

// identisch zu BLOCKED_HOSTS in scripts/verify-zulassungsstellen.mjs (dorthin als gemeinsames Modul auslagern)
const BLOCKED_HOSTS: RegExp[] = [/wikipedia\.org$/, /wikimedia\.org$/, /11880\.com$/, /gelbeseiten\.de$/, /dasoertliche\.de$/, /meinestadt\.de$/,
  /golocal\.de$/, /cylex/, /yelp\./, /branchen/, /kennzeichen/, /zulassungsdienst/, /zulassung24/, /zulassung\.de$/, /bundeszulassung/,
  /kfzportal/, /ikfz\.net$/, /strassenverkehrsamt\.de$/, /verkehrsamt\.de$/, /zulassungsstelle\.de$/, /zulassungsstellen\.de$/,
  /google\./, /facebook\./, /tripadvisor\./, /check24/, /adac\.de$/];
const MAX_AGE_DAYS = 183;
const LEGAL_FALLBACK = "gesetze-im-internet.de";

export const PRIORITAETSSTAEDTE = ["berlin", "hamburg", "muenchen", "koeln", "frankfurt", "stuttgart", "duesseldorf", "leipzig",
  "hannover", "nuernberg", "dortmund", "essen", "bremen", "dresden", "karlsruhe", "mannheim", "muenster", "bonn", "wiesbaden", "augsburg"];

const WARTE_CLAIM = /(?<![A-Za-zÄÖÜäöüß])Wochen?(?![a-zäöüß])|wochenlang|ausgebucht|begehrt|Andrang|ausgelastet|erk[äa]mpft|vergriffen|\brar\b|schnell weg|gut gef[üu]llt|\bwarten\b|Wartezeit|schwerer zu bekommen|einreihen/i;

const host = (u?: string | null) => { try { return new URL(u ?? "").hostname.replace(/^www\./, ""); } catch { return ""; } };
export const isOfficial = (u?: string | null) => Boolean(u) && host(u) !== "" && !BLOCKED_HOSTS.some((r) => r.test(host(u)));
const isFresh = (iso?: string | null, today = new Date()) =>
  Boolean(iso) && (today.getTime() - new Date(iso!).getTime()) / 86_400_000 <= MAX_AGE_DAYS;

export function stelleIndexable(z: Zulassungsstelle): boolean {
  return Boolean(
    z.behoerde?.wert && isOfficial(z.behoerde.quelle) &&                                    // B1
    z.website?.wert && isOfficial(z.website.wert) &&                                        // B2
    z.zustaendigkeit?.wert && isOfficial(z.zustaendigkeit.quelle) &&
      !host(z.zustaendigkeit.quelle).endsWith(LEGAL_FALLBACK) &&                            // B3
    z.standorte.length > 0 && z.standorte.every((s) => isOfficial(s.quelle)) &&             // B4
    z.kuerzel.length > 0 &&                                                                  // B5
    (z.terminUrl || z.ikfzUrl || z.oeffnungszeiten) &&                                       // B6
    z.besonderheiten.some((b) => isOfficial(b.quelle)) &&                                    // B7
    isFresh(z.geprueftAm)                                                                    // B8
  );
}

/** Erfordert die neuen Felder City.geprueftAm und City.nachbarn (string[] mit Zulassungsstellen-Slugs). */
export function cityIndexable(c: City & { geprueftAm?: string; nachbarn?: string[] }): boolean {
  const z = getZulassungsstelle(c.slug);
  const text = [...c.intro, ...c.faq.map((f) => `${f.question} ${f.answer}`)].join(" ");
  return Boolean(
    PRIORITAETSSTAEDTE.includes(c.slug) &&                                                   // S1
    z && stelleIndexable(z) &&                                                               // S2
    c.faq.length >= 3 &&                                                                     // S3
    !WARTE_CLAIM.test(text) &&                                                               // S4
    isFresh(c.geprueftAm) &&                                                                 // S5
    (c.nachbarn ?? []).filter((s) => getZulassungsstelle(s)).length >= 2                     // S6
  );
}

export function kennzeichenIndexable(k: KennzeichenEintrag): boolean {
  const mehrwert = k.stellen.length >= 2 || /Altkennzeichen|wieder erhältlich|vergeben|auch im|und Landkreis/i.test(k.hinweis ?? "");
  return isOfficial(k.quelle) && k.stellen.every(stelleIndexable) && mehrwert;              // K1–K3
}

export const robotsFor = (indexable: boolean) => (indexable ? undefined : { index: false, follow: true });
```

So wird das Gate eingebunden:
- `app/zulassungsstelle/[slug]/page.tsx` → in `generateMetadata` die Zeile `robots: robotsFor(stelleIndexable(z))` ergänzen. Entsprechend für `[stadt]` mit `cityIndexable(city)` und für `[kuerzel]` mit `kennzeichenIndexable(k)`.
- `app/sitemap.ts` → `cities.filter(cityIndexable)`, `publishedStellen.filter(stelleIndexable)`, `kennzeichen.filter(kennzeichenIndexable)`.
- `app/llms.txt` → dieselben Filter.
- `scripts/check-site.mjs` um eine Prüfung ergänzen: Keine Sitemap-URL darf `noindex` tragen, und jede `noindex`-Seite muss `follow` haben.
- Das S4-Lint zusätzlich als Build-Check laufen lassen, damit keine neuen Wartezeit-Aussagen mehr ins Repo kommen. Den Template-Satz „Zulassungstermine sind in vielen Städten Wochen im Voraus ausgebucht“ (Z. 130) entfernen oder mit Quelle belegen.

### 5.5 Ergebnis des Gates (Stand 09.11.2026)

| Typ | index | noindex | davon „zusammenführen“ | davon „ausbauen“ |
|---|---:|---:|---:|---:|
| Behörde (404) | **388** | 16 | – | 1 (Wiesbaden) |
| Stadt (40) | **0** heute, 20 nach Ausbau | 40 heute, 20 dauerhaft | – | 20 (Prioritätsstädte) |
| Kennzeichen (709) | **3** (HOG, SNH, WOH) | 706 | 427 | – |

Stadtseiten: Mit den Feldern, die es heute gibt, erfüllt keine Stadtseite S5 bis S7. Für die 20 Prioritätsstädte gibt es die Behördendaten aber schon (19 bestehen B1 bis B8). Der Ausbau ist deshalb vor allem Template- und Redaktionsarbeit. **Das Gate sollte im selben Deploy aktiviert werden, in dem die 20 Seiten ausgebaut sind.** So fallen die 20 kommerziellen Seiten nicht zwischendurch aus dem Index. Die 20 übrigen Stadtseiten erfüllen S1 per Definition nicht und gehen sofort auf `noindex,follow`.

## 6. Kannibalisierung und Rollenverteilung (Beispiel Berlin)

Befund:
- Die Texte überschneiden sich kaum (5-Wort-Folgen, Jaccard): Stadt- zu Behördenseite 0,02, Behörden- zu Kennzeichenseite 0,06, Stadt- zu Kennzeichenseite 0,03 (Berlin, Hamburg, Frankfurt, Köln).
- **Beim Suchintent überschneiden sie sich aber**, über das Wort „Termin“ und das Angebot. Titel der Stadtseite: „Kfz-Zulassung Berlin ohne Termin“, H2 „Keinen Termin bei der Zulassungsstelle in Berlin bekommen?“, Keywords „Zulassungsstelle Berlin Termin“, „Termin Zulassungsstelle Berlin ausgebucht“. Titel der Behördenseite: „Zulassungsstelle Berlin: Adresse & Termin“, die Meta-Description endet mit dem Verkaufsangebot („Ohne Termin über uns: Zulassung 128 € …“), dazu `ServicePriceGrid` und CTA „Ohne Termin zulassen?“. Die Kennzeichenseite B wirbt in der Description ebenfalls mit „Zuständige Zulassungsstelle, Anschrift … ohne Behördentermin“.
- Risiko: Die Behördenseite hat mehr Substanz (964 gegenüber 614 Wörtern, mit Quellen). Google könnte sie deshalb auch für „kfz zulassung berlin“ ausspielen und die Stadtseite verdrängen. Gleichzeitig wirkt die Behördenseite durch ihre Verkaufselemente weniger wie eine neutrale Infoseite.

Rollen:

| URL | Rolle | Ziel-Suchanfragen | Inhalt |
|---|---|---|---|
| `/kfz-zulassung/berlin/` | **Kommerziell (Dienstleistung)** | „kfz zulassung berlin“, „auto anmelden berlin“, „auto ummelden berlin ohne termin“, „zulassungsdienst berlin“ | Angebot, Preis aus `config/preise.json`, realistische DZ-Dauer für das LABO, Ablauf mit Vollmacht, Unterlagen, lokale FAQ. Ein kompakter, belegter Behördenkasten aus `Zulassungsstelle` (Name, 2 Standorte, Prüfdatum, Quelle) mit Link „Alle Behördeninfos: Zulassungsstelle Berlin“, Links zu Nachbarbehörden (Brandenburger Umlandkreise). Kein „Zulassungsstelle“ in Title oder H2. |
| `/zulassungsstelle/berlin/` | **Informativ (Behördeninfo)** | „zulassungsstelle berlin“, „kfz zulassungsstelle berlin adresse/öffnungszeiten“, „labo kfz zulassung termin“ | Behördenname, Standorte, Zeiten, Zuständigkeit, Termin- und i-Kfz-Links, Besonderheiten, Quellen, Prüfdatum. **Kein** Preisraster. Die Meta-Description ohne Preisangebot, z. B. „Zulassungsstelle Berlin (LABO): 2 Standorte, Öffnungszeiten, Termin und i-Kfz – mit Quellen, geprüft am …“. Eine einzige Service-Box mit Link auf `/kfz-zulassung/berlin/` (Ankertext „Kfz-Zulassung Berlin ohne eigenen Termin“). |
| `/kennzeichen/b/` | Informativ (Kürzel), vorerst `noindex,follow` | „b kennzeichen“, „kennzeichen b bedeutung“ | Wird zusammengeführt: Die Bedeutung steht schon im Kürzel-Block der Behördenseite. Nach Umstellung der Quelle auf FZV Anlage 1 bleibt die Seite trotzdem `noindex` (K3 nicht erfüllt). Später optional 301 auf `/zulassungsstelle/berlin/`. |

Diese Aufteilung gilt für alle 20 Prioritätsstädte. Wo ein Kürzel von zwei Behörden vergeben wird (A, H, HB, KA, L, M, N), verweist die Stadtseite im Behördenkasten ausdrücklich auf die zweite Behörde (Landkreis bzw. Region).

## 7. Prioritätsstädte: Seitenbestand und Lücken

Alle 20 haben eine Stadtseite und eine Behördenseite (Live-Crawl, Status 200, `index, follow`). Auf **allen 20 Stadtseiten fehlen** dieselben Angaben: offizielle Quelle, Prüfdatum, Zuständigkeitsgebiet mit Quelle, Anschrift bzw. Standorte, belegte lokale Besonderheiten, eigener Abschnitt mit Unterlagen, Links zu Nachbarregionen (der Block „Weitere Städte“ zählt nicht als Nachbarregionen). Außerdem ist der Behördenname nicht der offizielle aus den Daten. **Vorhanden** sind überall: Kürzel, Vorgänge, DZ-Dauer (aber pauschal), Preis aus der zentralen Konfiguration, FAQ und CTA. Die Tabelle zeigt, was je Stadt zusätzlich gilt.

| Stadt | Stadtseite | Behördenseite (Gate) | Kürzel / Kennzeichenseite | Unbelegte Termin-/Wartezeit-Aussagen auf der Stadtseite | Weitere stadtspezifische Lücken bzw. Pflichthinweise |
|---|---|---|---|---|---|
| Berlin | ja | ja, index (13 Merkmale) | B / zusammenführen | „auf Wochen ausgebucht“, „wochenlange Terminsuche“ | 2 Standorte nicht genannt; „pro Termin nur eine Dienstleistung“ (berlin.de) |
| Hamburg | ja | ja, index (14) | HH / zusammenführen | „Termine sind begehrt“, „wartet häufig länger“ | **Online nicht per Vollmacht** (LBV-FAQ, in den Daten nachtragen); „Nur Terminvergabe“; 3 Standorte |
| München | ja | ja, index (12) | M / noindex (Stadt + Landkreis) | „ausgebuchte Kalender“ | Landkreis München hat eigene Stelle: Link fehlt; „Nur nach Terminvereinbarung“ |
| Köln | ja | ja, index (12) | K / zusammenführen | „Online-Terminvergabe … schnell vergriffen“ | Ab 4 Anliegen Großkundenbereich ohne Online-Termin (stadt-koeln.de) |
| Frankfurt am Main | ja | **ja, index (11)** – siehe unten | F / zusammenführen | „Termine rar“ | Vorsprache nur mit Online-Termin; Standort Am Römerhof 19 fehlt |
| Stuttgart | ja | ja, index (12) | S / zusammenführen | „ausgelastet“, „Termine wollen erkämpft … sein“ | Händlerschalter für Zulassungsdienste ohne Termin; Online-Termine nur für Privatkunden |
| Düsseldorf | ja | ja, index (12) | D / zusammenführen | „Slots schnell weg“ | **i-Kfz und Online-Wunschkennzeichen abgeschaltet** (Sicherheitslücke); Termine nur für Privatpersonen, Zulassungsdienste an den Händlerschalter |
| Leipzig | ja | ja, index (12) | L / noindex (Stadt + Landkreis) | „Andrang“, „nicht Wochen auf einen Termin warten“ | Landkreis Leipzig vergibt ebenfalls L: Link fehlt |
| Hannover | ja | ja, index (12) | H / noindex (Stadt + Region) | – | Ohne Termin kein Einlass; höchstens 3 Zulassungen pro Termin; Region Hannover verlinken |
| Nürnberg | ja | ja, index (12) | N / noindex (Stadt + Nürnberger Land) | „zusätzlicher Andrang“ | Nur mit Termin; keine Parkplätze |
| Dortmund | ja | ja, index (14) | DO / zusammenführen | „Terminkalender … gut gefüllt“ | **Zulassungsdienste nur im Händlerbereich Südwall 2-4, Abgabe 7–9 Uhr** |
| Essen | ja | ja, index (12) | E / zusammenführen | „begehrt“, „rar“ (Wunschkombinationen) | Umzug Januar 2026 an die Altendorfer Str. 101; Schnellschalter |
| Bremen | ja | ja, index (13) | HB / noindex (Bremen + Bremerhaven) | „einreihen“ (schwach) | Nur Stadtgemeinde Bremen, Bremerhaven verlinken; Sonderfälle bei der Zentralen Kfz-Zulassungsbehörde |
| Dresden | ja | ja, index (12) | DD / zusammenführen | „Terminkalender … gut gefüllt“ | Über Zulassungsdienste eingereichte Vorgänge werden **taggleich** bearbeitet (dresden.de): passt zur DZ-Laufzeit, Stärke ausspielen |
| Karlsruhe | ja | ja, index (12) | KA / noindex (Stadt + Landkreis) | „Termin buchen, hinfahren, warten“ | Landratsamt Karlsruhe verlinken; Schließtage zum Jahreswechsel 24.12.2026–06.01.2027 betreffen die DZ-Laufzeit |
| Mannheim | ja | ja, index (14) | MA / zusammenführen | – | 5 Bürgerservice-Standorte; Oldtimer-, Saison- und grüne Kennzeichen nur an 3 Standorten |
| Münster | ja | ja, index (11) | MS / zusammenführen | „schwerer zu bekommen als ein Parkplatz“ | Keine `oeffnungszeiten` in den Daten |
| Bonn | ja | ja, index (12) | BN / zusammenführen | – | Leasing nur im Stadthaus; Rhein-Sieg-Kreis verlinken (nennt die FAQ bereits) |
| Wiesbaden | ja | **nein → ausbauen** (B3: nur § 75 FZV) | WI / zusammenführen | – | **„Längere Bearbeitungszeiten“ nach der Software-Umstellung vom 14.09.2026** (wiesbaden.de): Die DZ-Aussage „Abmeldung meist taggleich“ ist hier nicht haltbar |
| Augsburg | ja | ja, index (14) | A / noindex (Stadt + Landkreis) | „Termine … begehrt“, „konstanter Andrang“ | 5 Bürgerbüros; Abmeldung per Einwurf; Landkreis Augsburg verlinken |

**Frankfurt am Main geprüft:** `docs/UMSETZUNG-2026-11.md` sagt: „Nicht veröffentlicht … Zulassungsstelle Frankfurt (Zuständigkeit nicht belegt)“. **Das ist überholt.** In `lib/data/zulassungsstellen.json` steht der Datensatz `slug: "frankfurt"` mit `zustaendigkeit.wert` „Zuständig für Halterinnen und Halter in der Stadt Frankfurt am Main.“ (Quelle verwaltungsportal.hessen.de, `geprueftAm` 2026-11-03). Er besteht `isPublishable`, und `/zulassungsstelle/frankfurt/` ist live (915 Wörter, `index, follow`, Titel „Zulassungsstelle Frankfurt am Main: Adresse & Termin“). Die Zuständigkeitsangabe ist knapp, aber lokal und offiziell belegt, deshalb besteht die Seite B3. Empfehlung: den Abschnitt in `UMSETZUNG-2026-11.md` korrigieren und die Zuständigkeit direkt von frankfurt.de ergänzen (z. B. Umgang mit Zuzug und Firmen). Offen sind laut Daten weiterhin nur **Kreis Paderborn** und **St. Ingbert** (nicht im JSON).

## 8. Lokale Besonderheiten, die auf die Seite müssen (alle mit offizieller Quelle)

### 8.1 Online-Vorgänge nicht in Vertretung bzw. per Vollmacht

Diese Angaben widersprechen dem DZ-Versprechen „wir führen den Vorgang digital bei der Behörde durch“. Auf Behörden- und Stadtseite muss stehen, wie DZ dort tatsächlich einreicht (Schalter oder Händlerannahme mit Vollmacht).

| Behörde | Aussage | Quelle |
|---|---|---|
| Rosenheim (Stadt) | i-Kfz kann nicht stellvertretend erledigt werden; wer für andere handelt, braucht Termin und Vollmacht | https://www.rosenheim.de/buergerservice/mobilitaet/kfz-zulassung/ |
| Kreis Minden-Lübbecke | Online-Leistungen nur für die eigene Person, keine stellvertretende Antragstellung online | https://www.minden-luebbecke.de/unsere-aemter/strassenverkehrsamt/zulassungstelle/ |
| Hamburg (LBV) | In der FAQ zur Online-Zulassung sind „Vorgänge per Vollmacht“ ausgeschlossen. **Fehlt in `besonderheiten`, nachtragen.** | https://www.hamburg.de/verkehr/lbv/faq/fahrzeugzulassung-online (abgerufen 09.11.2026) |

Dazu gehört ein offener Punkt aus `UMSETZUNG-2026-11.md` (Abschnitt 4, Punkt 5): „Über uns“ spricht von der behördlichen i-Kfz-Schnittstelle. Bevor Stadtseiten „digital bei der Behörde“ versprechen, sollte der echte Einreichungsweg von DZ geklärt sein: Großkundenschnittstelle (GKS) des KBA, Händlerschalter oder Termin vor Ort.

### 8.2 i-Kfz derzeit abgeschaltet oder eingeschränkt

Düsseldorf (service.duesseldorf.de, Dienstleistung 16447), Rostock (rathaus.rostock.de …/251384), Erzgebirgskreis (erzgebirgskreis.de …/kfz-zulassung), Kreis Soest (kreis-soest.de …/online-zulassung), Kreis Olpe (kreis-olpe.de/Themen/Auto-Verkehr/Kfz-Zulassung/), Delmenhorst (delmenhorst.de …/144010100000016986.php), Landkreis Börde (landkreis-boerde.de …/kfz-onlineabmeldung-und-ameldung), Landkreis Jerichower Land (lkjl.de/de/strassenverkehrsamt.html), Landkreis Vorpommern-Rügen (lk-vr.de …/Zulassungsbehörde/), Saalekreis (Online-Zulassung nur über die GKS, saalekreis.de/de/fahrzeugangelegenheiten.html).
Das Template sagt dort trotzdem „Online-Vorgänge laufen bundesweit über das i-Kfz-Verfahren“ (Z. 334). Wenn eine Besonderheit „nicht verfügbar“ meldet, muss der Abschnitt „Online zulassen in X“ das berücksichtigen. Vorschlag: neues Feld `ikfzStatus: Belegt<"aktiv" | "eingeschraenkt" | "abgeschaltet">`.

### 8.3 Eigene Regeln für Zulassungsdienste (69 Behörden)

Beispiele: Herne (Termine durch Zulassungsdienste untersagt und storniert, serviceportal.herne.de …/72233), Rhein-Sieg-Kreis (seit 01.07.2024 keine Termine für Zulassungsdienste, rhein-sieg-kreis.de …/termine-sva-vorschaltseite.php), Düsseldorf und Stuttgart (Händlerschalter), Dortmund (nur Händlerbereich Südwall, Abgabe 7–9 Uhr), Köln (Großkundenbereich ab 4 Anliegen), Kreis Recklinghausen (Annahme nur bis 08:30 Uhr). Diese Regeln bestimmen, wie schnell DZ wirklich ist. Sie stehen schon unter „Gut zu wissen“, gehören auf der Stadtseite aber in die DZ-Laufzeit („Wir geben Ihren Antrag am Händlerschalter ab, Bearbeitung …“).

### 8.4 Behörden nennen eine längere Bearbeitungsdauer als die DZ-Pauschale

Wiesbaden (längere Bearbeitungszeiten nach der Software-Umstellung, wiesbaden.de/vv/oe/07/34/Zulassungsbehoerde), Märkischer Kreis (Händlertasche, „Bearbeitung kann mehrere Tage dauern“), Saalekreis (bis zu 3 Tage), Landkreis Cloppenburg (einige Tage), Salzlandkreis (Abholung am folgenden Arbeitstag), Landkreis Würzburg (tagesgleiche Zulassung nicht garantiert), Landkreis Aurich, Mainz-Bingen, St. Wendel, Weilheim-Schongau. Das Skript erkennt diese 10 Fälle; von Hand kommen weitere dazu, z. B. Landkreis Mühldorf am Inn (Rückgabe in der Regel am nächsten Arbeitstag).
Auf diesen Seiten widerspricht `ServicePriceGrid` (1–2 bzw. 1–3 Werktage, Abmeldung taggleich) der Behördenangabe. **Empfehlung:** DZ-Laufzeit je Behörde pflegen (neues Feld `dzBearbeitungszeit`, intern aus Auftragsdaten) und bis dahin dort den Hinweis „Bearbeitungsdauer abhängig von der Behörde“ anzeigen.

### 8.5 Weitere Hinweise mit Folgen für die Unterlagen (bereits in den Daten, im Prozess berücksichtigen)

Landkreis Lüneburg: Den Verlust der ZB II muss der Halter persönlich erklären, eine Vollmacht ist dafür nicht möglich. Landkreis Günzburg, Calw, Schwarzwald-Baar: SEPA-Mandat nur vom Halter selbst. Ulm und Alb-Donau-Kreis: Vollmacht und SEPA-Mandat handschriftlich, eine elektronische Unterschrift ist ungültig. Wichtig für die „digitale Vollmacht“ von DZ. Regionalverband Saarbrücken: Kennzeichen oder FIN muss auf der Vollmacht stehen. Landkreis Stade: schriftliche Vollmacht auch unter Eheleuten. Quellen jeweils in `besonderheiten[].quelle`.

## 9. Weitere Befunde

1. **Kürzel-Quelle Wikipedia:** 783 von 786 `kuerzel[].quelle` sowie 706 von 709 `KennzeichenEintrag.quelle`. Die Behördenseiten zeigen den Wikipedia-Link sogar in der Quellenliste. Zur Umstellung bieten sich FZV Anlage 1 (gesetze-im-internet.de/fzv_2023/anlage_1.html) oder die Kennzeichen-Seite der jeweiligen Behörde an. Ausnahmen mit offizieller Quelle: HOG, WOH (kassel.de), SNH (rhein-neckar-kreis.de).
2. **`city.facts` „Zuständige Behörde“** ist frei geschrieben und weicht bei 39 von 40 Städten vom offiziellen `behoerde.wert` ab. Kassel ist irreführend: Laut Daten gibt es eine gemeinsame Behörde für Stadt und Landkreis. Lösung: im Template `stelle.behoerde.wert` rendern und das Fakt entfernen.
3. **Metadaten der Stadtseite:** `keywords` enthält „Termin Zulassungsstelle X ausgebucht“, ist für Google wirkungslos und widerspricht der Rollenverteilung. Entfernen.
4. **Interne Verlinkung:** Auf Behördenseiten zeigen im Median nur 3 interne Links (Übersicht, Kennzeichenseite, ggf. Stadtseite), Nachbarlinks gibt es keine. Ein Feld `nachbarn` würde sowohl die Gate-Bedingung S6 erfüllen als auch die Behördenseiten besser verlinken. Ableitbar aus gleichem Kürzel bzw. Bundesland plus Zuständigkeitstexten wie „Der Landkreis München hat eine eigene …“.
5. **Template-Aussagen ohne Beleg auf allen Behördenseiten:** In der FAQ steht „wir reichen den Antrag mit Ihrer Vollmacht ein“ und „Über uns brauchen Sie keinen eigenen Termin“. Das gilt nicht überall gleich (8.1, 8.3). Bei Behörden mit Pflichthinweis sollte die Antwort aus den Daten abgeleitet werden.
6. **Übersicht `UMSETZUNG-2026-11.md` veraltet:** Frankfurt (siehe oben). Die Hamburg-Notiz dort ist durch die LBV-FAQ jetzt belegt, steht aber nicht in den Daten.

## 10. Empfehlungen in Reihenfolge

1. **Sofort (ohne Ausbau):** `noindex,follow` und raus aus der Sitemap für die 20 Nicht-Prioritäts-Stadtseiten, die 706 Kennzeichenseiten ohne Gate und die 16 Behördenseiten ohne Gate. Wiesbaden bleibt bis zum Ausbau indexiert, weil Prioritätsstadt. Sofort betroffen sind damit 15 Behördenseiten, und die Sitemap schrumpft um 741 URLs (20 + 706 + 15).
2. **Sprint 1 – 20 Prioritäts-Stadtseiten:** Wartezeit-Aussagen streichen (S4), auch den Template-Satz Z. 130. Behördenkasten, Zuständigkeit, Standorte, Besonderheiten, Prüfdatum und Quellen aus `getZulassungsstelle()` rendern (S7). `geprueftAm` und `nachbarn` pflegen (S5, S6). Eigenen Unterlagen-Abschnitt ergänzen. Pflichthinweise für Hamburg, Düsseldorf, Dortmund, Köln, Stuttgart, Dresden und Wiesbaden einbauen. Danach `cityIndexable` aktivieren.
3. **Sprint 1 – Rollenverteilung:** Auf den Behördenseiten der 20 Prioritätsstädte Preisraster und Verkaufs-Description entfernen und durch genau einen Link zur Stadtseite ersetzen. Auf den Stadtseiten „Zulassungsstelle“ aus Title, H2 und Keywords nehmen.
4. **Daten:** Wiesbaden und die 9 anderen Seiten mit § 75 FZV als Zuständigkeit nachrecherchieren. Die 5 Behörden ohne Standort und den Main-Taunus-Kreis (keine Besonderheit) ergänzen. Den Hamburger Vollmacht-Hinweis in `besonderheiten` aufnehmen. Kürzel-Quellen auf FZV Anlage 1 umstellen.
5. **Danach keine neuen Stadtseiten**, bis Search Console (Indexierung, Impressionen und Klicks je Rolle) und Conversions für die 20 Städte über mindestens 8 Wochen ausgewertet sind. Kennzeichenseiten erst wieder öffnen, wenn K1 erfüllt ist und Daten zeigen, dass die informativen Kürzel-Anfragen Aufträge bringen.
6. **Pflege:** `geprueftAm` halbjährlich erneuern. Das Gate nimmt veraltete Seiten automatisch aus dem Index (B8, S5).

## 11. Dateien

- Entscheidung je URL: `docs/seo/local-pages-index-decision.csv`. Spalten: `path;typ;behoerde_offiziell;quelle_offiziell;pruefdatum;individuelle_merkmale_anzahl;doorway_risiko;empfehlung;begruendung`. „zusammenfuehren“ bedeutet: jetzt `noindex,follow` und raus aus der Sitemap, Inhalt steht bereits auf der Behördenseite, später optional 301. „ausbauen“ bedeutet: index erst nach Erfüllung des Gates.
- Skripte (nicht im Repo): `C:\Users\karak\AppData\Local\Temp\claude\2e0cd8d98c0156c9\1df28564-061e-48be-b317-d62101afaa59\scratchpad\index_decision.py`, `…\dump.cjs`, `…\boilerplate.py`.
