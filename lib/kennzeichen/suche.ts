/**
 * Suche nach dem Zulassungsbezirk: Stadt, Landkreis, Standort der Behörde oder
 * direkt das Kürzel. Läuft im Browser über die verdichtete Liste aus
 * /kennzeichen-daten/bezirke.json.
 *
 * Bewusst ohne Raten: Gefunden wird nur, was in den geprüften Daten steht. Kennt
 * die Liste einen kleinen Ort nicht, hilft der Landkreis oder das Kürzel weiter –
 * das sagt die Oberfläche dann auch so.
 */
import type { Bezirk } from "./typen";

export function norm(s: string): string {
  return s
    .toLocaleLowerCase("de-DE")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Verwaltungszusätze, die Menschen beim Suchen weglassen. */
const ohneZusatz = (s: string) =>
  s.replace(/^(landkreis|kreis|stadt|region|landeshauptstadt|hansestadt|staedteregion|regionalverband) /, "").trim();

/** Der Ortsname ohne Klammer- und Lagezusatz: „Frankfurt am Main“, „Kempten (Allgäu)“ → frankfurt, kempten. */
const stamm = (roh: string) =>
  ohneZusatz(norm(roh.replace(/\s*\(.*?\)/g, ""))).replace(/ (am|an der|an dem|im|in der|in|ob der|a d|bei|vor der) .*$/, "").trim();

const IST_KREIS = /^(landkreis|kreis|region|staedteregion|regionalverband) /;

/** Große Städte zuerst, wenn ein Name mehrdeutig ist („Frankfurt“). */
const GROSSSTAEDTE = new Set([
  "berlin", "hamburg", "muenchen", "koeln", "frankfurt", "stuttgart", "duesseldorf", "leipzig", "dortmund", "essen",
  "bremen", "dresden", "hannover", "nuernberg", "duisburg", "bochum", "wuppertal", "bielefeld", "bonn", "muenster",
]);

export interface Treffer {
  bezirk: Bezirk;
  /** Wodurch der Bezirk gefunden wurde, wenn es nicht der Name selbst war (z. B. ein Standort). */
  ueber: string | null;
  /** Gesuchtes Kürzel, wenn über ein Kürzel gefunden – dann gilt dieses statt des ersten des Bezirks. */
  code: string | null;
  rang: number;
}

interface Eintrag {
  bezirk: Bezirk;
  name: string;
  kurz: string;
  stamm: string;
  kreis: boolean;
  orte: { roh: string; n: string }[];
  kuerzel: { code: string; n: string; name: string }[];
}

const index = new WeakMap<Bezirk[], Eintrag[]>();

function baue(liste: Bezirk[]): Eintrag[] {
  let e = index.get(liste);
  if (!e) {
    e = liste.map((b) => ({
      bezirk: b,
      name: norm(b.name),
      kurz: ohneZusatz(norm(b.name)),
      stamm: stamm(b.name),
      kreis: IST_KREIS.test(norm(b.name)),
      orte: b.orte.map((o) => ({ roh: o, n: ohneZusatz(norm(o)) })),
      kuerzel: b.kuerzel.map((k) => ({ code: k.code, n: norm(k.code), name: norm(k.name) })),
    }));
    index.set(liste, e);
  }
  return e;
}

/** Bis zu `limit` Bezirke zur Eingabe, beste zuerst. */
export function sucheBezirk(liste: Bezirk[], eingabe: string, limit = 8): Treffer[] {
  const q = norm(eingabe);
  if (q.length === 0) return [];
  const qKurz = ohneZusatz(q);
  const alsKuerzel = eingabe.trim().toLocaleUpperCase("de-DE");
  const treffer: Treffer[] = [];

  for (const e of baue(liste)) {
    let rang = 0;
    let ueber: string | null = null;
    let gefundenesKuerzel: string | null = null;

    const code = e.kuerzel.find((k) => k.code === alsKuerzel);
    if (code) {
      rang = 100;
      ueber = `Kürzel ${code.code}`;
      gefundenesKuerzel = code.code;
    }
    if (e.name === q) rang = Math.max(rang, 97);
    else if (e.kurz === qKurz || e.stamm === qKurz) rang = Math.max(rang, 95);
    else if (qKurz.length >= 2 && (e.kurz.startsWith(qKurz) || e.name.startsWith(q))) rang = Math.max(rang, 80 - Math.min(20, e.kurz.length - qKurz.length));
    else if (qKurz.length >= 3 && e.kurz.split(" ").some((w) => w.startsWith(qKurz))) rang = Math.max(rang, 55);

    if (rang < 70 && qKurz.length >= 3) {
      const ort = e.orte.find((o) => o.n === qKurz) ?? e.orte.find((o) => o.n.startsWith(qKurz));
      if (ort) {
        const r = ort.n === qKurz ? 75 : 50;
        if (r > rang) {
          rang = r;
          ueber = ort.roh;
        }
      }
      const k = e.kuerzel.find((x) => x.name === qKurz) ?? e.kuerzel.find((x) => x.name.startsWith(qKurz));
      if (k) {
        const r = k.name === qKurz ? 72 : 48;
        if (r > rang) {
          rang = r;
          ueber = `Kürzel ${k.code}`;
          gefundenesKuerzel = k.code;
        }
      }
    }
    if (rang > 0) {
      // Bei gleichem Rang: große Stadt vor kleiner, Stadt vor Landkreis.
      const vorzug = (GROSSSTAEDTE.has(e.bezirk.slug) ? 2 : 0) + (e.kreis ? 0 : 1);
      treffer.push({ bezirk: e.bezirk, ueber: ueber && norm(ueber) !== e.name ? ueber : null, code: gefundenesKuerzel, rang: rang + vorzug / 10 });
    }
  }

  return treffer.sort((a, b) => b.rang - a.rang || a.bezirk.name.localeCompare(b.bezirk.name, "de")).slice(0, limit);
}

/**
 * Eindeutiger Treffer für einen Einstieg von außen (#ort=…): nur wenn genau ein Bezirk
 * zum Namen passt. „Frankfurt“ oder „Offenbach“ (Stadt und Kreis) bleiben eine Auswahl.
 */
export function eindeutig(liste: Bezirk[], eingabe: string): Treffer | null {
  const t = sucheBezirk(liste, eingabe, 3);
  if (t.length === 0) return null;
  if (t.length === 1) return t[0].rang >= 70 ? t[0] : null;
  // Genau der Name (München, nicht Landkreis München) oder als einziger der Ortsname.
  if (t[0].rang >= 97 && t[1].rang < 97) return t[0];
  return t[0].rang >= 95 && t[1].rang < 95 ? t[0] : null;
}

export function findeBezirk(liste: Bezirk[], slug: string): Bezirk | undefined {
  return liste.find((b) => b.slug === slug);
}

/** Erster Bezirk, der ein Kürzel ausgibt (für Einstiege von den Kennzeichenseiten). */
export function bezirkZuKuerzel(liste: Bezirk[], code: string): Bezirk | undefined {
  const c = code.toLocaleUpperCase("de-DE");
  return liste.find((b) => b.kuerzel[0]?.code === c) ?? liste.find((b) => b.kuerzel.some((k) => k.code === c));
}
