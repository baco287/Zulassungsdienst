#!/usr/bin/env node
/**
 * Tests für den Kennzeichenassistenten: Regelprüfung, Generator, Sprachverständnis,
 * Bezirkssuche, Verfügbarkeitszustände und Gleichlauf von Browser- und Serverprüfung.
 *
 *   npm run test:kennzeichen
 *
 * Läuft ohne zusätzliche Abhängigkeit (scripts/kennzeichen-lader.mjs übersetzt lib/ mit dem
 * TypeScript-Compiler). Der PHP-Vergleich wird übersprungen, wenn kein PHP installiert ist.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lade, ROOT } from "./kennzeichen-lader.mjs";

const { pruefe, leseKombination, schreibweise, kombiId, bausteinGesperrt, REGELN, platzFuerErkennungsnummer } = lade("lib/kennzeichen/regeln");
const { erzeuge, aehnliche, ideenDesTages, ausKi } = lade("lib/kennzeichen/generator");
const { verstehe, bereinigeFuerKi } = lade("lib/kennzeichen/verstehen");
const { LEERE_WUENSCHE } = lade("lib/kennzeichen/typen");
const { bezirke, behoerden, kuerzelLaender } = lade("lib/kennzeichen/bezirke");
const { sucheBezirk, eindeutig } = lade("lib/kennzeichen/suche");
const { ausServerantwort } = lade("lib/kennzeichen/verfuegbarkeit");
const { fremdesKuerzel } = lade("lib/kennzeichen/regeln");

// Browser-Speicher für die Tests der Merkliste und der Übergabe an den Auftrag
const speicher = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};
globalThis.sessionStorage = speicher();
globalThis.localStorage = speicher();
const { uebergabeZeile, schreibeUebergabe, leseUebergabe, UEBERGABE_GILT_MS } = lade("lib/kennzeichen/merkliste");

let ok = 0;
const fehler = [];
function test(name, fn) {
  try {
    fn();
    ok++;
  } catch (e) {
    fehler.push(`✗ ${name}\n    ${e.message}`);
  }
}
function gleich(ist, soll, was = "") {
  const a = JSON.stringify(ist);
  const b = JSON.stringify(soll);
  if (a !== b) throw new Error(`${was} erwartet ${b}, erhalten ${a}`);
}
function wahr(bedingung, was) {
  if (!bedingung) throw new Error(was);
}

const k = (kuerzel, buchstaben, ziffern, zusatz = "") => ({ kuerzel, buchstaben, ziffern, zusatz });
const gueltig = (kombi, bundesland, streng = true) => pruefe(kombi, { bundesland, streng }).gueltig;
const codes = (kombi, bundesland, streng = true) => pruefe(kombi, { bundesland, streng }).fehler.map((f) => f.code);

/* ─────────────────────────── Regeln: Aufbau und Länge (bundesweit) ─────────────────────────── */

test("Aufbau: ein bis zwei Buchstaben, eine bis vier Ziffern", () => {
  for (const [b, z] of [["A", "1"], ["AB", "1"], ["A", "9999"], ["ZZ", "9999"], ["Q", "100"], ["IO", "10"]]) wahr(gueltig(k("M", b, z), "Bayern"), `M-${b} ${z} sollte gültig sein`);
  for (const [b, z] of [["", "1"], ["ABC", "1"], ["A", ""], ["A", "12345"], ["A", "0"], ["A", "012"], ["Ä", "1"], ["A1", "1"], ["a", "1"]]) wahr(!gueltig(k("M", b, z), "Bayern"), `M-${b} ${z} sollte ungültig sein`);
});

test("Führende Null und Umlaute werden mit Begründung abgelehnt", () => {
  gleich(codes(k("H", "MM", "024"), "Niedersachsen"), ["format.ziffern"]);
  wahr(/Null/.test(pruefe(k("H", "MM", "024"), { bundesland: null }).fehler[0].text), "Text nennt die Null");
  gleich(codes(k("H", "ÄB", "12"), "Niedersachsen"), ["format.buchstaben"]);
  wahr(/Umlaute/.test(pruefe(k("H", "ÄB", "12"), { bundesland: null }).fehler[0].text), "Text nennt Umlaute");
});

test("Höchstens acht Stellen – entscheidend bei dreistelligem Kürzel", () => {
  wahr(gueltig(k("M", "AB", "1234"), "Bayern"), "1+2+4 = 7");
  wahr(gueltig(k("HH", "AB", "1234"), "Hamburg"), "2+2+4 = 8");
  wahr(!gueltig(k("KÖT", "AB", "1234"), "Sachsen-Anhalt"), "3+2+4 = 9");
  wahr(gueltig(k("KÖT", "A", "1234"), "Sachsen-Anhalt"), "3+1+4 = 8");
  wahr(gueltig(k("KÖT", "AB", "123"), "Sachsen-Anhalt"), "3+2+3 = 8");
  gleich(platzFuerErkennungsnummer("KÖT", ""), 5);
  gleich(platzFuerErkennungsnummer("KÖT", "E"), 4);
  gleich(platzFuerErkennungsnummer("B", "H"), 6);
});

test("E- und H-Kennzeichen: höchstens sieben Stellen vor dem Zusatz", () => {
  wahr(gueltig(k("M", "AB", "1234", "E"), "Bayern"), "1+2+4 = 7 vor dem E");
  wahr(!gueltig(k("HH", "AB", "1234", "E"), "Hamburg"), "2+2+4 = 8 vor dem E");
  wahr(!gueltig(k("HH", "AB", "1234", "H"), "Hamburg"), "2+2+4 = 8 vor dem H");
  wahr(gueltig(k("HH", "AB", "123", "H"), "Hamburg"), "2+2+3 = 7 vor dem H");
  wahr(!gueltig(k("KÖT", "AB", "123", "E"), "Sachsen-Anhalt"), "3+2+3 = 8 vor dem E");
});

/* ─────────────────────────── Regeln: Sperren ─────────────────────────── */

test("Bundesweit gesperrte Buchstabenpaare gelten in jedem Bezirk", () => {
  for (const b of ["HJ", "KZ", "NS", "SA", "SS"]) {
    for (const [kz, land] of [["B", "Berlin"], ["M", "Bayern"], ["HH", "Hamburg"], ["KÖT", "Sachsen-Anhalt"]]) {
      const e = pruefe(k(kz, b, "1"), { bundesland: land, streng: false });
      wahr(!e.gueltig && e.fehler[0].geltung === "bundesweit", `${kz}-${b} 1 muss bundesweit gesperrt sein`);
    }
  }
});

test("Regionale Sperren gelten nur dort, wo sie gelten", () => {
  // Köln sperrt Z und ZZ – München nicht.
  wahr(!gueltig(k("K", "Z", "1"), "Nordrhein-Westfalen", false), "K-Z 1 in Köln gesperrt");
  wahr(!gueltig(k("K", "ZZ", "11"), "Nordrhein-Westfalen", false), "K-ZZ 11 in Köln gesperrt");
  wahr(gueltig(k("M", "Z", "1"), "Bayern", false), "M-Z 1 in München formal möglich");
  // Stuttgart: A, D, S, ED, SD und RA–RZ mit vier Ziffern
  for (const b of ["A", "D", "S", "ED", "SD"]) wahr(!gueltig(k("S", b, "7"), "Baden-Württemberg", false), `S-${b} 7 in Stuttgart gesperrt`);
  wahr(!gueltig(k("S", "RA", "1234"), "Baden-Württemberg", false), "S-RA 1234 gesperrt");
  wahr(gueltig(k("S", "RA", "123"), "Baden-Württemberg", false), "S-RA 123 möglich");
  wahr(gueltig(k("KA", "A", "7"), "Baden-Württemberg", false), "KA-A 7 möglich (Sperre gilt nur für S)");
  // Brandenburg: alles, was auf 88 endet
  wahr(!gueltig(k("P", "AB", "288"), "Brandenburg", false), "P-AB 288 in Brandenburg gesperrt");
  wahr(gueltig(k("M", "AB", "288"), "Bayern", false), "M-AB 288 in Bayern formal möglich");
  // Baden-Württemberg: 1488 und AH/HH mit 18 oder 88
  wahr(!gueltig(k("KA", "AB", "1488"), "Baden-Württemberg", false), "1488 in Baden-Württemberg gesperrt");
  wahr(!gueltig(k("KA", "HH", "18"), "Baden-Württemberg", false), "HH 18 in Baden-Württemberg gesperrt");
  // Hessen: SD
  wahr(!gueltig(k("F", "SD", "5"), "Hessen", false), "F-SD 5 in Hessen gesperrt");
  // Berlin: IS als Serie, B-HH 1933
  wahr(!gueltig(k("B", "IS", "5"), "Berlin", false), "B-IS 5 gesperrt");
  wahr(!gueltig(k("B", "HH", "1933"), "Berlin", false), "B-HH 1933 gesperrt");
  wahr(gueltig(k("M", "IS", "5"), "Bayern", false), "M-IS 5 formal möglich");
  wahr(!gueltig(k("HEI", "L", "1"), "Schleswig-Holstein", false), "HEI-L 1 gesperrt");
  for (const s of REGELN.sperren.filter((x) => x.geltung === "regional")) {
    wahr(s.bundeslaender.length + s.kuerzel.length > 0, `Regionale Sperre ${s.id} braucht Bundesland oder Kürzel`);
    wahr(/^https:\/\//.test(s.quelle), `Sperre ${s.id} braucht eine Quelle`);
  }
});

test("Ohne Bundesland werden regionale Länderregeln nicht angewendet", () => {
  wahr(gueltig(k("XX", "AB", "288"), null, false), "ohne Land keine Brandenburg-Regel");
});

test("Vorsichtsliste: wird nicht vorgeschlagen, eigene Eingabe bekommt nur einen Hinweis", () => {
  wahr(!gueltig(k("M", "AB", "88"), "Bayern", true), "88 wird nicht vorgeschlagen");
  const eigen = pruefe(k("M", "AB", "88"), { bundesland: "Bayern", streng: false });
  wahr(eigen.gueltig && eigen.hinweise.some((h) => h.code === "vorsicht"), "eigene Eingabe: gültig mit Hinweis");
  wahr(!gueltig(k("N", "PD", "1"), "Bayern", true), "N-PD wird nicht vorgeschlagen");
  wahr(!gueltig(k("M", "AH", "18"), "Bayern", true), "AH 18 wird nicht vorgeschlagen");
  wahr(gueltig(k("M", "AH", "24"), "Bayern", true), "AH als Initialen bleibt möglich");
});

test("Kurze Kombinationen sind gültig, tragen aber einen Hinweis", () => {
  const e = pruefe(k("B", "A", "9"), { bundesland: "Berlin" });
  wahr(e.gueltig && e.hinweise.some((h) => h.code === "kurz" && h.kurztext), "Hinweis mit Kurzfassung");
  wahr(pruefe(k("B", "AB", "12"), { bundesland: "Berlin" }).hinweise.length === 0, "vier Zeichen: kein Hinweis");
});

test("Einzelne Wunschbausteine: gesperrt oder nicht", () => {
  wahr(bausteinGesperrt("ziffern", "88", "M", "Bayern") !== null, "88");
  wahr(bausteinGesperrt("ziffern", "24", "M", "Bayern") === null, "24");
  wahr(bausteinGesperrt("buchstaben", "SS", "M", "Bayern")?.geltung === "bundesweit", "SS");
  wahr(bausteinGesperrt("buchstaben", "MM", "M", "Bayern") === null, "MM");
  wahr(bausteinGesperrt("buchstaben", "Z", "K", "Nordrhein-Westfalen")?.geltung === "regional", "Z in Köln");
});

/* ─────────────────────────── Eingabe lesen ─────────────────────────── */

test("Getippte Kennzeichen werden erkannt", () => {
  gleich(leseKombination("H-MM 24", ["H"]), k("H", "MM", "24"));
  gleich(leseKombination("h mm24", ["H"]), k("H", "MM", "24"));
  gleich(leseKombination("HMM24", ["H"]), k("H", "MM", "24"));
  gleich(leseKombination("köt a 1 e", ["ABI", "KÖT"]), k("KÖT", "A", "1", "E"));
  gleich(leseKombination("MM 24", ["H"]), k("H", "MM", "24"));
  gleich(leseKombination("HH-AB 123", ["H"]), null);
  gleich(leseKombination("irgendwas", ["H"]), null);
  gleich(schreibweise(k("H", "MM", "24", "E")), "H-MM 24E");
});

/* ─────────────────────────── Daten ─────────────────────────── */

test("Bezirksdaten sind vollständig und plausibel", () => {
  wahr(bezirke.length >= 400, `nur ${bezirke.length} Bezirke`);
  const slugs = new Set();
  for (const b of bezirke) {
    wahr(!slugs.has(b.slug), `Slug doppelt: ${b.slug}`);
    slugs.add(b.slug);
    wahr(b.name && b.bundesland && b.kuerzel.length > 0, `unvollständig: ${b.slug}`);
    for (const c of b.kuerzel) wahr(/^[A-ZÄÖÜ]{1,3}$/.test(c.code) && c.name, `Kürzel fehlerhaft: ${b.slug} ${c.code}`);
    wahr(b.echtzeit === false, `Echtzeit ohne Anbindung: ${b.slug}`);
    const beh = behoerden[b.slug];
    wahr(beh && beh.name, `Behörde fehlt: ${b.slug}`);
    wahr(beh.website === null || /^https:\/\//.test(beh.website), `Website nicht https: ${b.slug}`);
  }
  wahr(Object.keys(kuerzelLaender).length >= 700, "zu wenige Kürzel");
  for (const s of REGELN.sperren) for (const kz of s.kuerzel) wahr(kuerzelLaender[kz], `Sperre ${s.id}: Kürzel ${kz} gibt es in den Daten nicht`);
  const laender = new Set(bezirke.map((b) => b.bundesland));
  for (const s of REGELN.sperren) for (const l of s.bundeslaender) wahr(laender.has(l), `Sperre ${s.id}: Bundesland „${l}“ gibt es in den Daten nicht`);
});

test("Bezirkssuche findet Stadt, Landkreis, Standort und Kürzel", () => {
  const erster = (q) => sucheBezirk(bezirke, q, 3)[0]?.bezirk.slug;
  gleich(erster("Hannover"), "hannover");
  gleich(erster("hann"), "hannover");
  gleich(erster("München"), "muenchen");
  gleich(erster("muenchen"), "muenchen");
  gleich(erster("Landkreis Schwandorf"), "landkreis-schwandorf");
  gleich(erster("Schwandorf"), "landkreis-schwandorf");
  gleich(erster("KÖT"), "landkreis-anhalt-bitterfeld");
  gleich(erster("Köthen"), "landkreis-anhalt-bitterfeld");
  gleich(erster("Würselen"), "aachen");
  gleich(sucheBezirk(bezirke, "xyzabc").length, 0);
  gleich(sucheBezirk(bezirke, "").length, 0);
  wahr(sucheBezirk(bezirke, "B", 5).some((t) => t.bezirk.slug === "berlin"), "Kürzel B → Berlin");
});

/* ─────────────────────────── Generator ─────────────────────────── */

const mit = (teil) => ({ ...LEERE_WUENSCHE, ...teil });
const W = (wert, art = "wunsch", grund = "Wunsch") => ({ wert, art, grund });

test("Generator: Beispiel aus dem Auftrag (Max Mustermann, 24, Hannover)", () => {
  const w = verstehe("Ich heiße Max Mustermann und meine Zahl ist 24", LEERE_WUENSCHE).wuensche;
  const liste = erzeuge({ kuerzel: "H", bundesland: "Niedersachsen", wuensche: w, anzahl: 10 }).map(schreibweise);
  for (const erwartet of ["H-MM 24", "H-M 24", "H-MM 224"]) wahr(liste.includes(erwartet), `${erwartet} fehlt in ${liste.join(", ")}`);
  gleich(liste[0], "H-MM 24", "bester Vorschlag");
});

test("Generator: jeder Vorschlag ist regelkonform, eindeutig und enthält den Wunsch", () => {
  const w = mit({ buchstaben: [W("TK", "initialen")], zahlen: [W("1508", "datum"), W("158", "datum")] });
  const liste = erzeuge({ kuerzel: "M", bundesland: "Bayern", wuensche: w, anzahl: 12 });
  wahr(liste.length >= 6, `nur ${liste.length} Vorschläge`);
  gleich(new Set(liste.map((v) => v.id)).size, liste.length, "Duplikate");
  for (const v of liste) {
    wahr(pruefe(v, { bundesland: "Bayern", streng: true }).gueltig, `${schreibweise(v)} ungültig`);
    wahr(["1508", "158"].includes(v.ziffern), `${schreibweise(v)} ohne Wunschzahl`);
    wahr(v.idee.length > 5 && !/\.\./.test(v.idee), `Idee unsauber: ${v.idee}`);
  }
});

test("Generator: Einschränkungen werden eingehalten", () => {
  const ohne7 = erzeuge({ kuerzel: "B", bundesland: "Berlin", wuensche: mit({ stil: "sportlich", ohneZiffern: ["7"] }), anzahl: 12 });
  wahr(ohne7.length > 0 && ohne7.every((v) => !v.ziffern.includes("7")), "ohne die 7");
  const zwei = erzeuge({ kuerzel: "B", bundesland: "Berlin", wuensche: mit({ buchstabenAnzahl: 2 }), anzahl: 12 });
  wahr(zwei.length > 0 && zwei.every((v) => v.buchstaben.length === 2), "nur zwei Buchstaben");
  const kurz = erzeuge({ kuerzel: "B", bundesland: "Berlin", wuensche: mit({ kurz: true }), anzahl: 8 });
  wahr(kurz.every((v) => v.buchstaben.length + v.ziffern.length <= 3), "möglichst kurz");
  const zif = erzeuge({ kuerzel: "B", bundesland: "Berlin", wuensche: mit({ ziffernMax: 2 }), anzahl: 12 });
  wahr(zif.every((v) => v.ziffern.length <= 2), "höchstens zwei Ziffern");
  const e = erzeuge({ kuerzel: "HH", bundesland: "Hamburg", wuensche: mit({ zusatz: "E" }), anzahl: 12 });
  wahr(e.length > 0 && e.every((v) => v.zusatz === "E" && v.kuerzel.length + v.buchstaben.length + v.ziffern.length <= 7), "E-Kennzeichen-Länge");
  const ohneM = erzeuge({ kuerzel: "B", bundesland: "Berlin", wuensche: mit({ ohneBuchstaben: ["M", "A"] }), anzahl: 12 });
  wahr(ohneM.every((v) => !/[MA]/.test(v.buchstaben)), "ohne M und A");
});

test("Generator: „weitere“ liefert nichts doppelt, gleiche Saat liefert dasselbe", () => {
  const w = mit({ buchstaben: [W("MM", "initialen")] });
  const a = erzeuge({ kuerzel: "H", bundesland: "Niedersachsen", wuensche: w, anzahl: 8 });
  const b = erzeuge({ kuerzel: "H", bundesland: "Niedersachsen", wuensche: w, anzahl: 8, ausschliessen: a.map((v) => v.id), saat: 2 });
  wahr(b.length > 0 && b.every((v) => !a.some((x) => x.id === v.id)), "Überschneidung bei weiteren");
  gleich(erzeuge({ kuerzel: "H", bundesland: "Niedersachsen", wuensche: w, anzahl: 8 }).map((v) => v.id), a.map((v) => v.id), "nicht reproduzierbar");
});

test("Generator: gesperrte Wünsche tauchen nie auf", () => {
  const w = mit({ buchstaben: [W("SS", "initialen")], zahlen: [W("88")] });
  const liste = erzeuge({ kuerzel: "M", bundesland: "Bayern", wuensche: w, anzahl: 12 });
  wahr(liste.every((v) => v.buchstaben !== "SS" && v.ziffern !== "88"), "SS oder 88 vorgeschlagen");
});

test("Generator: für JEDES Kürzel in den Daten entstehen gültige Vorschläge", () => {
  let gesamt = 0;
  for (const b of bezirke) {
    for (const c of b.kuerzel) {
      for (const w of [LEERE_WUENSCHE, mit({ stil: "kreativ" }), mit({ kurz: true }), mit({ buchstaben: [W("TK", "initialen")], zahlen: [W("7")] })]) {
        const liste = erzeuge({ kuerzel: c.code, bundesland: b.bundesland, wuensche: w, anzahl: 6 });
        wahr(liste.length >= 4, `${c.code} (${b.slug}): nur ${liste.length} Vorschläge`);
        for (const v of liste) wahr(pruefe(v, { bundesland: b.bundesland, streng: true }).gueltig, `${schreibweise(v)} ungültig`);
        gesamt += liste.length;
      }
    }
  }
  wahr(gesamt > 10000, "zu wenige geprüfte Vorschläge");
});

test("Ähnliche und Ideen des Tages", () => {
  const liste = aehnliche(k("H", "MM", "24"), "Niedersachsen");
  wahr(liste.length >= 4 && liste.every((v) => v.id !== kombiId(k("H", "MM", "24"))), "ähnliche");
  wahr(liste.every((v) => pruefe(v, { bundesland: "Niedersachsen" }).gueltig), "ähnliche gültig");
  const heute = ideenDesTages("H", "Niedersachsen", "2026-11-22");
  gleich(heute.map((v) => v.id), ideenDesTages("H", "Niedersachsen", "2026-11-22").map((v) => v.id), "Tagesideen stabil");
  wahr(JSON.stringify(heute.map((v) => v.id)) !== JSON.stringify(ideenDesTages("H", "Niedersachsen", "2026-11-23").map((v) => v.id)), "anderer Tag, andere Ideen");
});

test("KI-Vorschläge werden geprüft: Ungültiges und Gesperrtes fällt weg", () => {
  const liste = ausKi(
    [
      { b: "FC", z: "4", idee: "ok" },
      { b: "SS", z: "1", idee: "gesperrt" },
      { b: "ABC", z: "1", idee: "zu lang" },
      { b: "AB", z: "88", idee: "Vorsicht" },
      { b: "fc", z: "4", idee: "doppelt" },
      { b: "AB", z: "012", idee: "führende Null" },
      { b: "XY", z: "12345", idee: "zu viele Ziffern" },
    ],
    "M",
    "Bayern",
    "",
  );
  gleich(liste.map(schreibweise), ["M-FC 4"]);
  gleich(liste[0].herkunft, "ki");
});

/* ─────────────────────────── Sprachverständnis ─────────────────────────── */

const v0 = (text, w = LEERE_WUENSCHE) => verstehe(text, w);
const werte = (liste) => liste.map((t) => t.wert);

test("Verstehen: Sätze aus dem Auftrag – ohne KI", () => {
  let v = v0("Ich heiße Lisa, mein Freund heißt Tim. Wir möchten ein gemeinsames Kennzeichen.");
  gleich(werte(v.wuensche.buchstaben), ["LT", "TL"]);
  gleich(v.brauchtKi, false);
  v = v0("Ich habe am 15.08. Geburtstag und meine Initialen sind TK.");
  gleich(werte(v.wuensche.buchstaben), ["TK"]);
  gleich(werte(v.wuensche.zahlen), ["1508", "158", "15"]);
  gleich(v.brauchtKi, false);
  v = v0("Sportlich und mit der Zahl 7");
  gleich([v.wuensche.stil, werte(v.wuensche.zahlen)], ["sportlich", ["7"]]);
  v = v0("Ich suche ein cooles Kennzeichen für meinen BMW");
  gleich([v.wuensche.marke, v.brauchtKi], ["bmw", false]);
});

test("Verstehen: Änderungswünsche – ohne KI", () => {
  const basis = v0("Initialen MM, Zahl 7").wuensche;
  gleich(v0("Mach die Kennzeichen kürzer.", basis).wuensche.kurz, true);
  let v = v0("Ohne die Zahl 7.", basis);
  gleich([v.wuensche.ohneZiffern, werte(v.wuensche.zahlen)], [["7"], []]);
  gleich(v0("Nimm meine Initialen.", basis).frage, null);
  wahr(v0("Nimm meine Initialen.").frage !== null, "ohne bekannte Initialen wird nachgefragt");
  gleich(v0("Zeig mir zehn weitere.", basis).mehr, 10);
  gleich(v0("Ich möchte etwas Ausgefallenes.", basis).wuensche.stil, "kreativ");
  gleich(v0("Nur zwei Buchstaben.", basis).wuensche.buchstabenAnzahl, 2);
  wahr(v0("Nimm mein Geburtsjahr.").frage !== null, "ohne bekanntes Jahr wird nachgefragt");
  gleich(werte(v0("Geburtsjahr 1990").wuensche.zahlen), ["1990", "90"]);
  gleich(v0("von vorn", basis).zuruecksetzen, true);
  gleich(v0("E-Auto, möglichst kurz").wuensche.zusatz, "E");
  for (const s of ["Mach die Kennzeichen kürzer.", "Ohne die Zahl 7.", "Zeig mir zehn weitere.", "Nur zwei Buchstaben.", "Ich möchte etwas Ausgefallenes."]) {
    gleich(v0(s, basis).brauchtKi, false, `„${s}“ darf keine KI brauchen:`);
  }
});

test("Verstehen: freie Wünsche gehen an die KI, Berufe sind keine Namen", () => {
  const v = v0("Wir sind Angler und lieben die Ostsee");
  gleich([v.brauchtKi, werte(v.wuensche.buchstaben)], [true, []]);
  gleich(werte(v0("Ich bin Lehrer").wuensche.buchstaben), []);
  gleich(v0("Etwas für meinen Fußballverein").brauchtKi, true);
});

test("Bereinigung für die KI entfernt Kontaktdaten", () => {
  const t = bereinigeFuerKi("Schreib an max@example.org oder 0171 2345678, siehe https://example.org – ich mag Segeln");
  wahr(!/@|0171|https/.test(t) && /Segeln/.test(t), t);
  wahr(bereinigeFuerKi("x".repeat(500)).length <= 300, "Länge begrenzt");
});

/* ─────────────────────────── Verfügbarkeit ─────────────────────────── */

test("„Verfügbar“ gibt es nur mit Quelle und Zeitpunkt", () => {
  const offen = { status: "pruefung_erforderlich" };
  gleich(ausServerantwort({ ok: true, status: "verfuegbar" }), offen);
  gleich(ausServerantwort({ ok: true, status: "verfuegbar", quelle: "Portal" }), offen);
  gleich(ausServerantwort({ ok: true, status: "verfuegbar", quelle: " ", geprueftAm: "2026-11-22T10:00:00+01:00" }), offen);
  gleich(ausServerantwort({ ok: true, status: "verfuegbar", quelle: "Portal", geprueftAm: "kein Datum" }), offen);
  gleich(ausServerantwort({ ok: false, status: "verfuegbar", quelle: "Portal", geprueftAm: "2026-11-22T10:00:00+01:00" }), offen);
  gleich(ausServerantwort({ ok: true, status: "idee", quelle: "Portal", geprueftAm: "2026-11-22T10:00:00+01:00" }), offen);
  gleich(ausServerantwort(null), offen);
  gleich(ausServerantwort("verfuegbar"), offen);
  gleich(ausServerantwort({ ok: true, status: "verfuegbar", quelle: "Portal", geprueftAm: "2026-11-22T10:00:00+01:00" }).status, "verfuegbar");
});

test("Übergabe an den Auftrag sagt klar, dass nichts reserviert ist", () => {
  const zeile = uebergabeZeile({ ...k("H", "MM", "24"), bezirk: "hannover", bezirkName: "Hannover", status: "idee", serviceGewaehlt: false });
  wahr(/H-MM 24/.test(zeile) && /Hannover/.test(zeile) && /nicht reserviert/.test(zeile), zeile);
});

/* ─────────────────────────── Browser und Server prüfen gleich ─────────────────────────── */

test("PHP-Prüfung (Server) stimmt mit der TypeScript-Prüfung (Browser) überein", () => {
  let php = true;
  try {
    execFileSync("php", ["-v"], { stdio: "ignore" });
  } catch {
    php = false;
  }
  if (!php) {
    console.log("  (PHP nicht installiert – Vergleich übersprungen)");
    return;
  }
  const faelle = [];
  const buchst = ["A", "Z", "S", "D", "H", "L", "MM", "SS", "SA", "SD", "IS", "ZZ", "HH", "AH", "PD", "ED", "RA", "FC", "OK", "MOK", "ABC", "", "Ä", "SS\n"];
  const zahlen = ["1", "7", "18", "24", "88", "188", "288", "888", "1488", "1933", "2004", "1234", "9999", "0", "012", "12345", "88\n"];
  for (const [kz, land] of [["B", "Berlin"], ["M", "Bayern"], ["A", "Bayern"], ["AM", "Bayern"], ["K", "Nordrhein-Westfalen"], ["S", "Baden-Württemberg"], ["KA", "Baden-Württemberg"], ["P", "Brandenburg"], ["F", "Hessen"], ["H", "Niedersachsen"], ["KS", "Hessen"], ["MZ", "Rheinland-Pfalz"], ["HEI", "Schleswig-Holstein"], ["KÖT", "Sachsen-Anhalt"], ["N", "Bayern"], ["HH", "Hamburg"]]) {
    for (const b of buchst) for (const z of zahlen) for (const zusatz of ["", "E"]) faelle.push({ kuerzel: kz, land, b, z, zusatz });
  }
  const dir = mkdtempSync(join(tmpdir(), "kzp-php-"));
  const regeln = { format: REGELN.format, zusatz: REGELN.zusatz, sperren: REGELN.sperren, vorsicht: REGELN.vorsicht, kuerzel: kuerzelLaender };
  writeFileSync(join(dir, "regeln.json"), JSON.stringify(regeln));
  writeFileSync(join(dir, "faelle.json"), JSON.stringify(faelle));
  const code = `require $argv[1]; $r = json_decode(file_get_contents($argv[2]), true); $aus = '';
    foreach (json_decode(file_get_contents($argv[3]), true) as $f) { $aus .= kza_pruefe($r, $f['kuerzel'], $f['b'], $f['z'], $f['zusatz']) ? '1' : '0'; } echo $aus;`;
  const ergebnis = execFileSync("php", ["-r", code, "--", join(ROOT, "public/api/kennzeichen-lib.php"), join(dir, "regeln.json"), join(dir, "faelle.json")], { encoding: "utf8" });
  gleich(ergebnis.length, faelle.length, "Anzahl Antworten");
  const abweichungen = [];
  faelle.forEach((f, i) => {
    const ts = pruefe(k(f.kuerzel, f.b, f.z, f.zusatz), { bundesland: f.land, streng: true }).gueltig;
    // BK steht in zwei Bundesländern; PHP prüft gegen beide (strenger) – hier nicht im Vergleich.
    if (ts !== (ergebnis[i] === "1")) abweichungen.push(`${f.kuerzel}-${f.b} ${f.z}${f.zusatz}: TS=${ts} PHP=${ergebnis[i]}`);
  });
  wahr(abweichungen.length === 0, `${abweichungen.length} Abweichungen, z. B. ${abweichungen.slice(0, 5).join(" | ")}`);
  console.log(`  (${faelle.length} Kombinationen in PHP und TypeScript verglichen)`);
});


/* ─────────────────────────── Nach der Gegenprüfung (22.11.2026) ─────────────────────────── */

test("Getippte Kennzeichen: gewähltes Kürzel zuerst, kein Abschneiden mit Leerzeichen", () => {
  gleich(leseKombination("AB 1234", ["ZE", "ABI", "AZE", "BTF", "KÖT"]), k("ZE", "AB", "1234"));
  gleich(leseKombination("TK 123", ["WOR", "M", "AIB", "MU"]), k("WOR", "TK", "123"));
  gleich(leseKombination("M-TK 123", ["WOR", "M", "AIB", "MU"]), k("M", "TK", "123"));
  gleich(leseKombination("MK 77", ["M"]), k("M", "MK", "77"));
  gleich(leseKombination("HA 24", ["H"]), k("H", "HA", "24"));
  gleich(leseKombination("mit 7", ["M"]), null);
  gleich(leseKombination("bin 85", ["B"]), null);
  gleich(leseKombination("B-M 123", ["H"]), null);
  gleich(fremdesKuerzel("B-M 123", ["H"]), "B");
  gleich(fremdesKuerzel("H-M 123", ["H"]), null);
});

test("Vorsichtsliste liest Paare auch über das Kürzel (H-H 18 wie HH 18)", () => {
  wahr(!gueltig(k("H", "H", "18"), "Niedersachsen", true), "H-H 18 vorgeschlagen");
  wahr(!gueltig(k("H", "H", "1933"), "Niedersachsen", true), "H-H 1933 vorgeschlagen");
  wahr(!gueltig(k("A", "H", "2004"), "Bayern", true), "A-H 2004 vorgeschlagen");
  wahr(gueltig(k("H", "H", "18"), "Niedersachsen", false), "eigene Eingabe H-H 18 nur mit Hinweis");
  wahr(gueltig(k("H", "H", "24"), "Niedersachsen", true), "H-H 24 bleibt möglich");
});

test("Anstößige Zusammensetzungen werden nie vorgeschlagen", () => {
  for (const [kz, b] of [["AM", "OK"], ["MON", "GO"], ["KK", "K"], ["ANA", "L"], ["HI", "V"], ["MIL", "F"], ["D", "IE"]]) {
    wahr(!gueltig(k(kz, b, "1"), null, true), `${kz}-${b} 1 würde vorgeschlagen`);
  }
});

test("Gesperrter Wunsch: Der Generator macht mit dem Rest weiter", () => {
  const jahrgang = verstehe("Jahrgang 88", LEERE_WUENSCHE).wuensche;
  wahr(erzeuge({ kuerzel: "M", bundesland: "Bayern", wuensche: jahrgang, anzahl: 8 }).length >= 4, "Jahrgang 88: keine Vorschläge");
  const beides = mit({ buchstaben: [W("SS", "initialen")], zahlen: [W("88")] });
  wahr(erzeuge({ kuerzel: "M", bundesland: "Bayern", wuensche: beides, anzahl: 8 }).length >= 4, "SS + 88: keine Vorschläge");
  const tk = verstehe("Initialen TK und Zahl 88", LEERE_WUENSCHE).wuensche;
  const liste = erzeuge({ kuerzel: "M", bundesland: "Bayern", wuensche: tk, anzahl: 8 });
  wahr(liste.length >= 4 && liste.every((v) => v.ziffern !== "88") && liste.some((v) => v.buchstaben === "TK"), "TK ohne 88");
});

test("Datenschutz: Erkanntes geht nicht an die KI, Formularsätze brauchen keine KI", () => {
  const frei = verstehe("Ich heiße Lisa Müller, geboren am 15.08.1990, und angle gern am Bodensee", LEERE_WUENSCHE);
  wahr(frei.brauchtKi, "Hobby soll an die KI");
  const raus = bereinigeFuerKi(frei.fuerKi);
  wahr(!/Lisa|Müller|15|08|1990/.test(raus) && /Bodensee/.test(raus), `fuerKi: „${raus}“`);
  for (const satz of ["Ich heiße Anna-lena Müller", "Ich heiße Hans-peter Schmidt", "Wir heißen Anna-lena und Tim", "Wir heißen Hans-peter und Eva-maria", "Geburtstag 15.8.1990", "Glückszahl 7", "Initialen TK"]) {
    const v = verstehe(satz, LEERE_WUENSCHE);
    wahr(!v.brauchtKi && v.verstanden.length > 0, `„${satz}“: KI=${v.brauchtKi}, verstanden=${v.verstanden}`);
  }
  gleich(werte(verstehe("Ich heiße Anna-lena Müller", LEERE_WUENSCHE).wuensche.buchstaben)[0], "AM");
  wahr(!/\d{1,2}\.\d{1,2}\./.test(bereinigeFuerKi("seit dem 3.5.2019 dabei")), "Datum in bereinigeFuerKi");
});

test("Reaktionen und Fragen kosten keine KI-Anfrage", () => {
  const faelle = { "Super": "reaktion", "Danke, das war's": "reaktion", "Nochmal": "reaktion", "Hmm": "reaktion", "Guten Tag": "reaktion", "Tschüss": "reaktion",
    "Das dritte gefällt mir": "auswahl", "Ich nehme das erste": "auswahl", "Was kostet das Wunschkennzeichen?": "preis",
    "Welche sind denn verfügbar?": "verfuegbarkeit", "Wie reserviere ich das?": "verfuegbarkeit" };
  for (const [satz, thema] of Object.entries(faelle)) {
    const v = verstehe(satz, LEERE_WUENSCHE);
    wahr(!v.brauchtKi && v.thema === thema, `„${satz}“: KI=${v.brauchtKi}, thema=${v.thema}`);
  }
  wahr(verstehe("Etwas für meinen Fußballverein", LEERE_WUENSCHE).brauchtKi, "ein Themenwort soll weiter an die KI");
});

test("Verneinungen, Satzpunkte und „eine Zahl“", () => {
  const h = mit({ zusatz: "H" });
  gleich(verstehe("kein Oldtimer", LEERE_WUENSCHE).wuensche.zusatz, "");
  gleich(verstehe("kein H-Kennzeichen", h).wuensche.zusatz, "");
  gleich(verstehe("kein H-Kennzeichen", h).wuensche.ohneBuchstaben, []);
  gleich(verstehe("ich habe kein Elektroauto", LEERE_WUENSCHE).wuensche.zusatz, "");
  gleich(verstehe("nicht zu kurz", mit({ kurz: true })).wuensche.kurz, false);
  gleich(verstehe("nicht sportlich", mit({ stil: "sportlich" })).wuensche.stil, null);
  gleich(verstehe("ohne 4 und 7", LEERE_WUENSCHE).wuensche.ohneZiffern, ["4", "7"]);
  gleich(werte(verstehe("Meine Glückszahl ist die 7.", LEERE_WUENSCHE).wuensche.zahlen), ["7"]);
  gleich(werte(verstehe("Initialen TK und die 24.", LEERE_WUENSCHE).wuensche.zahlen), ["24"]);
  gleich(werte(verstehe("Geburtstag 15.08", LEERE_WUENSCHE).wuensche.zahlen), ["1508", "158", "15"]);
  const eineZahl = verstehe("ich möchte eine Zahl wie 24", LEERE_WUENSCHE).wuensche;
  gleich([eineZahl.ziffernMax, werte(eineZahl.zahlen)], [null, ["24"]]);
  gleich(verstehe("nur eine Ziffer", LEERE_WUENSCHE).wuensche.ziffernMax, 1);
});

test("Bezirkssuche: Stadt vor Landkreis, mehrdeutige Orte werden nicht geraten", () => {
  gleich(sucheBezirk(bezirke, "Frankfurt", 2)[0].bezirk.slug, "frankfurt");
  gleich(sucheBezirk(bezirke, "Kempten", 2)[0].bezirk.kuerzel[0].code, "KE");
  gleich(eindeutig(bezirke, "Frankfurt"), null);
  gleich(eindeutig(bezirke, "Offenbach"), null);
  gleich(eindeutig(bezirke, "Hannover")?.bezirk.slug, "hannover");
  gleich(eindeutig(bezirke, "Würselen")?.bezirk.slug, "aachen");
  gleich(sucheBezirk(bezirke, "KÖT", 1)[0].code, "KÖT");
});

test("Übergabe an den Auftrag: Abwahl bleibt, alte und unbelegte Einträge gelten nicht", () => {
  const basis = { ...k("H", "MM", "24"), bezirk: "hannover", bezirkName: "Hannover", status: "idee", serviceGewaehlt: true, zeit: Date.now() };
  schreibeUebergabe(basis);
  gleich(leseUebergabe()?.serviceGewaehlt, true);
  schreibeUebergabe({ ...leseUebergabe(), serviceGewaehlt: false });
  gleich(leseUebergabe()?.serviceGewaehlt, false, "Abwahl");
  schreibeUebergabe({ ...basis, zeit: Date.now() - UEBERGABE_GILT_MS - 1000 });
  gleich(leseUebergabe(), null, "abgelaufen");
  schreibeUebergabe({ ...basis, status: "reserviert" });
  gleich(leseUebergabe()?.status, "idee", "reserviert ohne Quelle");
  schreibeUebergabe({ ...basis, status: "verfuegbar", quelle: "Portal", geprueftAm: "kein Datum" });
  gleich(leseUebergabe()?.status, "idee", "verfügbar ohne gültigen Zeitpunkt");
  schreibeUebergabe(null);
  gleich(leseUebergabe(), null);
  const frei = uebergabeZeile({ ...basis, status: "verfuegbar", quelle: "Portal", geprueftAm: "2026-11-22T10:00:00+01:00" });
  wahr(/frei, nicht reserviert/.test(frei), frei);
});

test("KI-Filter (PHP): Verfügbarkeitsaussagen werden erkannt, die indirekte Frage nicht", () => {
  let php = true;
  try {
    execFileSync("php", ["-v"], { stdio: "ignore" });
  } catch {
    php = false;
  }
  if (!php) return console.log("  (PHP nicht installiert – Filtertest übersprungen)");
  const behauptet = [
    "MM 24 ist verfügbar.", "Kein Problem, MM 24 ist verfügbar.", "Prüfung abgeschlossen – MM 24 ist verfügbar.", "Ich weiß, dass MM 24 verfügbar ist.",
    "H-MM 24 ist aktuell frei.", "MM 24 ist eine verfügbare Kombination.", "MM 24 ist nicht mehr verfügbar.", "MM 24 ist leider schon vergeben.",
    "Deine Reservierung für MM 24 ist bestätigt.", "Ich kann nicht prüfen, ob etwas frei ist. AN 7 ist aber bestimmt verfügbar.",
    "Diese Kombinationen sind meist noch zu haben.", "Gute Wahl! Diese Kombination dürfte frei sein.", "Ist frei",
  ];
  const erlaubt = [
    "Ob die Kombination frei ist, weiß nur die Zulassungsbehörde.", "Ob sie verfügbar sind, kann ich nicht sagen.",
    "Ob eine Kombination frei oder schon vergeben ist, zeigt nur die Behörde.", "Hier sind ein paar Ideen für Angler.", "AN wie Angeln, 7 als Glückszahl.",
  ];
  const code = `require $argv[1]; $aus = ''; foreach (json_decode($argv[2], true) as $t) { $aus .= kza_behauptet_verfuegbarkeit($t) ? '1' : '0'; } echo $aus;`;
  const lauf = (liste) =>
    execFileSync("php", ["-r", code, "--", join(ROOT, "public/api/kennzeichen-lib.php"), JSON.stringify(liste)], {
      encoding: "utf8",
      env: { ...process.env, KZP_ANALYTICS_DIR: mkdtempSync(join(tmpdir(), "kzp-filter-")) },
    });
  const a = lauf(behauptet);
  const b = lauf(erlaubt);
  behauptet.forEach((t, i) => wahr(a[i] === "1", `nicht erkannt: „${t}“`));
  erlaubt.forEach((t, i) => wahr(b[i] === "0", `fälschlich erkannt: „${t}“`));
});

/* ─────────────────────────── Ergebnis ─────────────────────────── */

if (fehler.length > 0) {
  console.error(fehler.join("\n\n"));
  console.error(`\n${fehler.length} von ${ok + fehler.length} Tests fehlgeschlagen.`);
  process.exit(1);
}
console.log(`✓ ${ok} Tests bestanden.`);
