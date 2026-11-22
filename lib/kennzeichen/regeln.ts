/**
 * Regelprüfung für Wunschkennzeichen – deterministisch, ohne KI.
 *
 * Alle Regeln stehen in config/kennzeichen-regeln.json (mit Quelle und Stand).
 * Diese Datei wendet sie nur an. Dieselbe JSON-Datei liest auch der Server
 * (public/api/kennzeichen-lib.php über /kennzeichen-daten/regeln.json), damit
 * Browser und Server nie auseinanderlaufen.
 *
 * Drei Arten von Regeln, sauber getrennt:
 *   bundesweit  Aufbau der Erkennungsnummer nach der Fahrzeug-Zulassungsverordnung
 *               und Sperren, die überall gelten.
 *   regional    Sperren einzelner Länder oder Behörden – gelten nur dort und werden
 *               auch nur dort angewendet.
 *   vorsicht    Unsere eigene Liste: Kombinationen, die wir nicht von uns aus
 *               vorschlagen, weil viele Behörden sie ablehnen. Kein Verbot.
 *
 * Über die Zuteilung entscheidet immer die Zulassungsbehörde. Eine Kombination,
 * die hier durchgeht, ist formal möglich – nicht automatisch frei oder genehmigt.
 */
import daten from "@/config/kennzeichen-regeln.json";
import type { Befund, Kombination, Pruefergebnis, Zusatz } from "./typen";

export interface Sperre {
  id: string;
  geltung: "bundesweit" | "regional";
  /** Bundesländer, in denen die Sperre gilt (leer = nicht nach Land eingeschränkt). */
  bundeslaender: string[];
  /** Unterscheidungszeichen, für die die Sperre gilt (leer = alle im Geltungsbereich). */
  kuerzel: string[];
  /** Gesperrte Buchstabengruppen der Erkennungsnummer. */
  buchstaben: string[];
  /** Gesperrte Zahlen der Erkennungsnummer (exakte Übereinstimmung). */
  ziffern: string[];
  /** Gesperrte Paare aus Buchstaben und Zahl, z. B. "HH 88" – unabhängig vom Kürzel. */
  paare: string[];
  /** Gesperrte Zusammensetzungen "KÜRZEL-BUCHSTABEN" oder "KÜRZEL-BUCHSTABEN ZAHL". */
  kombinationen: string[];
  /** Reguläre Ausdrücke auf "BUCHSTABEN ZAHL", z. B. "88$" für alle Kennzeichen, die auf 88 enden. */
  muster: string[];
  text: string;
  quelle: string;
  /** Stand der Quelle, wenn sie älter ist und die heutige Geltung nicht eigens geprüft wurde. */
  standQuelle?: string;
}

export interface Regelwerk {
  stand: string;
  format: {
    buchstabenMin: number;
    buchstabenMax: number;
    ziffernMin: number;
    ziffernMax: number;
    maxStellen: number;
    /** Aufbau der Erkennungsnummer (Anlage 1 FZV). */
    quelle: string;
    /** Höchstzahl der Stellen (Anlage 4 FZV). */
    quelleLaenge: string;
  };
  zusatz: Record<"E" | "H", { name: string; maxStellenMitZusatz: number; text: string; quelle: string }>;
  sperren: Sperre[];
  vorsicht: { buchstaben: string[]; ziffern: string[]; paare: string[]; woerter: string[]; text: string };
  kurz: { bisStellen: number; kurztext: string; text: string; quelle: string; weitereQuellen: string[] };
  reservierung: {
    text: string;
    gebuehrQuelle: string;
    dauer: { behoerde: string; dauer: string; quelle: string }[];
  };
}

export const REGELN = daten as unknown as Regelwerk;

/** Großbuchstaben, ohne Leerzeichen. Umlaute bleiben erhalten (im Kürzel erlaubt). */
export const gross = (s: string) => s.toLocaleUpperCase("de-DE").replace(/\s+/g, "");

/** Umlaute auflösen – für Wortvergleiche (KÖT → KOET). */
export const ohneUmlaut = (s: string) =>
  gross(s).replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS");

export function kombiId(k: Kombination): string {
  return `${k.kuerzel}|${k.buchstaben}|${k.ziffern}|${k.zusatz}`;
}

/** Schreibweise wie auf dem Schild: "H-MM 24" bzw. "H-MM 24E". */
export function schreibweise(k: Kombination): string {
  return `${k.kuerzel}-${k.buchstaben} ${k.ziffern}${k.zusatz}`;
}

/** Anzahl der Stellen, wie sie für die Höchstlänge zählen (Zusatzbuchstabe zählt mit). */
export function stellen(k: Kombination): number {
  return k.kuerzel.length + k.buchstaben.length + k.ziffern.length + (k.zusatz ? 1 : 0);
}

/** Höchstzahl der Stellen für Buchstaben + Ziffern bei gegebenem Kürzel und Zusatz. */
export function platzFuerErkennungsnummer(kuerzel: string, zusatz: Zusatz): number {
  const max = zusatz ? REGELN.zusatz[zusatz].maxStellenMitZusatz - 1 : REGELN.format.maxStellen;
  return max - kuerzel.length;
}

function giltFuer(s: Sperre, kuerzel: string, bundesland: string | null): boolean {
  if (s.kuerzel.length > 0 && !s.kuerzel.includes(kuerzel)) return false;
  if (s.bundeslaender.length > 0 && (bundesland === null || !s.bundeslaender.includes(bundesland))) return false;
  return true;
}

export interface Pruefkontext {
  /** Bundesland des Zulassungsbezirks – ohne Angabe werden regionale Regeln nicht angewendet. */
  bundesland: string | null;
  /**
   * true (Standard für Vorschläge): auch unsere Vorsichtsliste führt zum Ausschluss.
   * false (eigene Eingabe des Kunden): die Vorsichtsliste ergibt nur einen Hinweis.
   */
  streng?: boolean;
}

/**
 * Prüft eine Kombination gegen das Regelwerk.
 * Reihenfolge: Aufbau → Länge → bundesweite Sperren → regionale Sperren → Vorsichtsliste → Hinweise.
 */
export function pruefe(k: Kombination, kontext: Pruefkontext): Pruefergebnis {
  const fehler: Befund[] = [];
  const hinweise: Befund[] = [];
  const f = REGELN.format;
  const streng = kontext.streng ?? true;

  if (!/^[A-ZÄÖÜ]{1,3}$/.test(k.kuerzel)) {
    fehler.push({ code: "format.kuerzel", schwere: "fehler", geltung: "bundesweit", text: "Das Unterscheidungszeichen besteht aus ein bis drei Buchstaben.", quelle: f.quelle });
  }
  if (!new RegExp(`^[A-Z]{${f.buchstabenMin},${f.buchstabenMax}}$`).test(k.buchstaben)) {
    fehler.push({
      code: "format.buchstaben",
      schwere: "fehler",
      geltung: "bundesweit",
      text: /[ÄÖÜß]/i.test(k.buchstaben)
        ? "Umlaute gibt es nur im Unterscheidungszeichen, nicht in den Buchstaben danach."
        : `Nach dem Unterscheidungszeichen stehen ${f.buchstabenMin} bis ${f.buchstabenMax} Buchstaben.`,
      quelle: f.quelle,
    });
  }
  if (!new RegExp(`^[1-9][0-9]{${f.ziffernMin - 1},${f.ziffernMax - 1}}$`).test(k.ziffern)) {
    fehler.push({
      code: "format.ziffern",
      schwere: "fehler",
      geltung: "bundesweit",
      text: /^0/.test(k.ziffern)
        ? "Die Zahl darf nicht mit einer Null beginnen."
        : `Die Zahl hat ${f.ziffernMin} bis ${f.ziffernMax} Ziffern.`,
      quelle: f.quelle,
    });
  }
  if (fehler.length > 0) return { gueltig: false, fehler, hinweise };

  const max = k.zusatz ? REGELN.zusatz[k.zusatz].maxStellenMitZusatz : f.maxStellen;
  if (stellen(k) > max) {
    fehler.push({
      code: "format.laenge",
      schwere: "fehler",
      geltung: "bundesweit",
      text: k.zusatz
        ? REGELN.zusatz[k.zusatz].text
        : `Ein Kennzeichen hat höchstens ${max} Stellen (Kürzel, Buchstaben und Ziffern zusammen).`,
      quelle: k.zusatz ? REGELN.zusatz[k.zusatz].quelle : f.quelleLaenge,
    });
  }

  const zusammen = `${k.kuerzel}-${k.buchstaben}`;
  const paar = `${k.buchstaben} ${k.ziffern}`;
  const mitZahl = `${zusammen} ${k.ziffern}`;
  for (const s of REGELN.sperren) {
    if (!giltFuer(s, k.kuerzel, kontext.bundesland)) continue;
    const trifft =
      s.buchstaben.includes(k.buchstaben) ||
      s.ziffern.includes(k.ziffern) ||
      s.paare.includes(paar) ||
      s.kombinationen.includes(zusammen) ||
      s.kombinationen.includes(mitZahl) ||
      s.muster.some((m) => new RegExp(m).test(paar));
    if (trifft) {
      fehler.push({ code: `sperre.${s.id}`, schwere: "fehler", geltung: s.geltung, text: s.text, quelle: s.quelle });
    }
  }

  const v = REGELN.vorsicht;
  const wort = ohneUmlaut(k.kuerzel + k.buchstaben);
  // Greift schon eine amtliche Sperre, braucht es den zweiten Befund nicht.
  // Paare auch über das Kürzel gelesen: H-H 18 liest sich wie HH 18, A-H 18 wie AH 18.
  const gesperrt = fehler.some((b) => b.code.startsWith("sperre."));
  const paarMitKuerzel = `${wort} ${k.ziffern}`;
  if (
    !gesperrt &&
    (v.buchstaben.includes(k.buchstaben) ||
      v.ziffern.includes(k.ziffern) ||
      v.paare.includes(paar) ||
      v.paare.includes(paarMitKuerzel) ||
      v.woerter.includes(wort))
  ) {
    const befund: Befund = { code: "vorsicht", schwere: streng ? "fehler" : "hinweis", geltung: "hinweis", text: v.text };
    (streng ? fehler : hinweise).push(befund);
  }

  if (k.buchstaben.length + k.ziffern.length <= REGELN.kurz.bisStellen) {
    hinweise.push({ code: "kurz", schwere: "hinweis", geltung: "regional", text: REGELN.kurz.text, kurztext: REGELN.kurz.kurztext, quelle: REGELN.kurz.quelle });
  }

  return { gueltig: fehler.length === 0, fehler, hinweise };
}

/**
 * Prüft einen einzelnen Wunschbaustein: Lässt sich diese Buchstabengruppe oder diese
 * Zahl im Bezirk überhaupt verwenden? So kann der Assistent sagen, WARUM er einen
 * Wunsch weglässt, statt ihn stillschweigend zu übergehen.
 */
export function bausteinGesperrt(
  art: "buchstaben" | "ziffern",
  wert: string,
  kuerzel: string,
  bundesland: string | null,
): Befund | null {
  // Ein unauffälliger Partner, damit nur der geprüfte Baustein den Ausschlag gibt.
  const k: Kombination =
    art === "buchstaben"
      ? { kuerzel, buchstaben: wert, ziffern: "2", zusatz: "" }
      : { kuerzel, buchstaben: "Q", ziffern: wert, zusatz: "" };
  const e = pruefe(k, { bundesland, streng: true });
  return e.fehler.find((b) => b.code.startsWith("sperre.") || b.code === "vorsicht") ?? null;
}

/**
 * Liest eine frei getippte Kombination: "H-MM 24", "h mm24", "HMM24", "KÖT A 1 E" …
 *
 * `kuerzelListe` sind die im Bezirk zulässigen Unterscheidungszeichen, das GEWÄHLTE zuerst:
 * Steht keins davon vorn, gilt das erste. Ein Kürzel wird nur abgetrennt, wenn es als eigenes
 * Wort dasteht ("M TK 123", "M-TK 123") oder die Eingabe ganz ohne Leerzeichen geschrieben ist
 * und der Rest allein keine gültige Erkennungsnummer wäre ("HMM24"). So bleibt "MK 77" in
 * München M-MK 77 und wird nicht zu M-K 77.
 */
export function leseKombination(eingabe: string, kuerzelListe: string[]): Kombination | null {
  if (kuerzelListe.length === 0) return null;
  const roh = eingabe.toLocaleUpperCase("de-DE").replace(/[^A-ZÄÖÜ0-9-]+/g, " ").replace(/\s*-\s*/g, "-").trim();
  if (!roh) return null;
  const NUMMER = /^([A-Z]{1,2})([0-9]{1,4})([EH]?)$/;
  const lies = (kuerzel: string, rest: string): Kombination | null => {
    const m = NUMMER.exec(rest);
    return m ? { kuerzel, buchstaben: m[1], ziffern: m[2], zusatz: m[3] as Zusatz } : null;
  };
  const teile = roh.split(/[\s-]+/).filter(Boolean);
  // Kürzel, das es im Bezirk nicht gibt ("B-M 123" in Hannover): nicht still umdeuten.
  if (fremdesKuerzel(eingabe, kuerzelListe)) return null;
  // 1. Kürzel als eigenes Wort oder vor einem Bindestrich
  if (teile.length > 1 && kuerzelListe.includes(teile[0])) {
    const k = lies(teile[0], teile.slice(1).join(""));
    if (k) return k;
  }
  const kompakt = teile.join("");
  // 2. Ohne Kürzel: die Eingabe ist schon die Erkennungsnummer
  const ohne = lies(kuerzelListe[0], kompakt);
  if (ohne) return ohne;
  // 3. Zusammengeschrieben ("HMM24"): Kürzel vorn abtrennen, längstes zuerst
  if (teile.length === 1) {
    for (const c of [...kuerzelListe].sort((a, b) => b.length - a.length)) {
      if (kompakt.startsWith(c)) {
        const k = lies(c, kompakt.slice(c.length));
        if (k) return k;
      }
    }
  }
  return null;
}

/**
 * Das Kürzel vorn, wenn die Eingabe wie ein vollständiges Kennzeichen aussieht ("B-M 123",
 * "B M 123"), dieses Kürzel im Bezirk aber nicht vergeben wird – sonst null.
 */
export function fremdesKuerzel(eingabe: string, kuerzelListe: string[]): string | null {
  const teile = eingabe.toLocaleUpperCase("de-DE").replace(/[^A-ZÄÖÜ0-9]+/g, " ").trim().split(" ");
  return teile.length >= 3 &&
    /^[A-ZÄÖÜ]{1,3}$/.test(teile[0]) &&
    /^[A-Z]{1,2}$/.test(teile[1]) &&
    /^[0-9]{1,4}$/.test(teile[2]) &&
    !kuerzelListe.includes(teile[0])
    ? teile[0]
    : null;
}
