/**
 * Versteht einfache Wünsche und Änderungen im Gespräch – im Browser, ohne KI.
 *
 * "Mach die Kennzeichen kürzer", "ohne die Zahl 7", "nimm meine Initialen TK",
 * "nur zwei Buchstaben", "zeig mir zehn weitere", "ich habe am 15.08. Geburtstag":
 * das sind Filter und Bausteine, für die kein KI-Aufruf nötig ist. Erst wenn nach
 * dem Herauslösen alles Verstandenen noch echter Inhalt übrig bleibt
 * ("etwas für Angler", "mein Verein heißt …"), meldet `brauchtKi` das zurück.
 *
 * Datenschutz: Was hier verstanden wird – Namen, Initialen, Daten, Zahlen –, bleibt im
 * Browser; daraus werden nur Buchstaben und Ziffern. An die KI geht höchstens der Teil
 * eines frei getippten Satzes, der NICHT verstanden wurde (`fuerKi`), und auch das erst
 * nach bereinigeFuerKi(). Sätze aus den Schnellwahl-Formularen gehen nie an die KI
 * (components/kennzeichen/KennzeichenAssistent.tsx, sende()).
 */
import { MARKEN } from "./woerter";
import type { Stil, Wuensche, Wunschteil, Zusatz } from "./typen";

export interface Verstanden {
  wuensche: Wuensche;
  /** Was verstanden wurde, als kurze Satzteile ("deine Initialen MM", "ohne die 7"). */
  verstanden: string[];
  /** Anzahl zusätzlicher Vorschläge, wenn danach gefragt wurde. */
  mehr: number | null;
  zuruecksetzen: boolean;
  /** Frage zurück an den Kunden, wenn eine Angabe fehlt (z. B. Initialen ohne Buchstaben). */
  frage: string | null;
  /** Unverstandene Inhaltswörter (klein, ohne Füllwörter) – Grundlage für brauchtKi. */
  rest: string;
  /**
   * Der getippte Text in Originalschreibweise, aus dem alles Verstandene (Namen, Daten,
   * Zahlen, Ausschlüsse …) herausgeschnitten ist. Nur dieser Teil darf an die KI.
   */
  fuerKi: string;
  /** true = im Rest steckt ein Wunsch, den nur die KI deuten kann. */
  brauchtKi: boolean;
  /**
   * Erkannte Frage oder Reaktion, auf die der Assistent mit einem festen Satz antwortet,
   * ohne die Vorschläge zu ersetzen und ohne KI.
   */
  thema: "preis" | "verfuegbarkeit" | "auswahl" | "reaktion" | null;
}

const ZAHLWORT: Record<string, number> = {
  ein: 1, eine: 1, einer: 1, einen: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fuenf: 5, fünf: 5, sechs: 6, sieben: 7, acht: 8,
  neun: 9, zehn: 10, zwoelf: 12, zwölf: 12, fuenfzehn: 15, fünfzehn: 15, zwanzig: 20,
};

const STILWORT: [RegExp, Stil][] = [
  [/\b(sportlich\w*|rasant\w*|dynamisch\w*|schnell\w*|rennsport\w*)\b/, "sportlich"],
  [/\b(elegant\w*|edel\w*|schick\w*|nobel|stilvoll\w*|dezent\w*)\b/, "elegant"],
  [/\b(minimalistisch\w*|schlicht\w*|reduziert\w*|clean)\b/, "minimalistisch"],
  [/\b(kreativ\w*|ausgefallen\w*|lustig\w*|witzig\w*|originell\w*|verr(ü|ue)ckt\w*|besonder\w*|au(ß|ss)ergew(ö|oe)hnlich\w*)\b/, "kreativ"],
  [/\b(pers(ö|oe)nlich\w*)\b/, "persoenlich"],
  [/\b((ü|ue)berrasch\w*|zuf(ä|ae)llig\w*|egal|irgendwas)\b/, "ueberraschend"],
];

/** Wörter ohne eigene Aussage – was danach übrig bleibt, ist „Rest“. */
const FUELLWORT = new Set(
  (
    "ich du wir mir mich dir dich uns euch mein meine meinen meinem meiner dein deine der die das den dem des ein eine einen einem einer " +
    "und oder aber auch noch nur sehr ganz mal bitte gern gerne danke hallo hi hey moin ja nein ok okay so wie was wo wer zu fuer für mit ohne von vom aus " +
    "am an im in auf bei ist sind bin hat habe haben hatte soll sollen sollte kann koennte könnte will wollen moechte möchte möchten haette hätte suche suchen brauche " +
    "kennzeichen wunschkennzeichen nummernschild schild kombination kombinationen vorschlag vorschlaege vorschläge idee ideen auto wagen fahrzeug pkw motorrad " +
    "etwas was es eher lieber moeglichst möglichst cool coole cooles schoen schön schoenes schönes gut gute gutes neues neue neu bisschen mach mache machen zeig zeige zeigen gib nimm nehmen " +
    "zahl zahlen ziffer ziffern buchstabe buchstaben nummer weitere weiteren mehr davon dazu dann jetzt heute immer nicht kein keine keinen " +
    "geburtstag geboren jahrestag hochzeitstag hochzeit geburtsjahr jahrgang baujahr initialen name namen vorname heisse heiße heisst heißt freund freundin mann frau partner partnerin " +
    "lieblingszahl glueckszahl glückszahl datum seit zusammen gemeinsam gemeinsames beide beiden paar passend passende passt welches welche irgendein irgendeine drin drauf dabei sein " +
    // Reaktionen, Grüße und Höflichkeiten: kein Wunsch, also auch kein Anlass für die KI
    "super toll perfekt prima klasse spitze genial nice schön schoen danke dankeschön dankeschoen vielen dank merci bitte hmm hm hmmm nee nö noe naja okay jo jep yes " +
    "tschüss tschuess ciao servus guten tag morgen abend grüß gruess hilfe weiter nochmal noch einmal weiß weiss nicht genau egal vielleicht doch eigentlich wirklich echt " +
    "gefällt gefaellt gefallen mag finde findest nehme nehmen will das dies diese dieser dieses den denn mal schon ganz war wars"
  ).split(" "),
);

const VERWANDT =
  "(?:freund|freundin|mann|ehemann|frau|ehefrau|partner|partnerin|verlobter|verlobte|sohn|tochter|kind|hund|kater|katze|schatz|bruder|schwester|papa|mama|vater|mutter)";

/** Ein Name wie „Lisa“ oder „Anna-Lena“. Im Klammerausdruck: auch Doppelnamen mit Bindestrich. */
const NAME = "([a-zäöüß]+(?:-[a-zäöüß]+)*)";
const istName = (s: string) =>
  /^[A-ZÄÖÜ][a-zäöüß]+(?:-[A-Za-zÄÖÜäöüß]+)*$/.test(s) && !FUELLWORT.has(s.toLowerCase().split("-")[0]);

/** true, wenn ein Wort nur Füllwort ist („mit“, „die“, „ohne“ …) – für die Erkennung getippter Kennzeichen. */
export const istFuellwort = (wort: string) => FUELLWORT.has(wort.toLocaleLowerCase("de-DE"));

const az = (s: string) =>
  s
    .toLocaleUpperCase("de-DE")
    .replace(/Ä/g, "AE")
    .replace(/Ö/g, "OE")
    .replace(/Ü/g, "UE")
    .replace(/ß/g, "SS")
    .replace(/[^A-Z]/g, "");

function ohneDoppelte(liste: Wunschteil[]): Wunschteil[] {
  const gesehen = new Set<string>();
  return liste.filter((t) => (gesehen.has(t.wert) ? false : (gesehen.add(t.wert), true)));
}

/** Zahl ohne führende Nullen, höchstens vier Stellen – sonst null. */
function ziffern(s: string): string | null {
  const z = s.replace(/^0+/, "");
  return /^[1-9][0-9]{0,3}$/.test(z) ? z : null;
}

export function verstehe(text: string, bisher: Wuensche): Verstanden {
  const w: Wuensche = {
    ...bisher,
    buchstaben: [...bisher.buchstaben],
    zahlen: [...bisher.zahlen],
    ohneZiffern: [...bisher.ohneZiffern],
    ohneBuchstaben: [...bisher.ohneBuchstaben],
  };
  const verstanden: string[] = [];
  let mehr: number | null = null;
  let frage: string | null = null;
  let zuruecksetzen = false;

  // `klein` wird Stück für Stück „verbraucht“: Verstandenes wird durch Leerzeichen ersetzt.
  let klein = ` ${text.toLocaleLowerCase("de-DE").replace(/\s+/g, " ")} `;
  const original = ` ${text.replace(/\s+/g, " ")} `;
  // Gleich lang wie `klein` (die Kleinschreibung ändert die Länge deutscher Texte nicht):
  // Was verstanden wird, wird hier an derselben Stelle ausgeblendet.
  let ungelesen = original.length === klein.length ? original : klein;
  /** Wendet `fn` auf jeden Treffer an. Gibt `fn` false zurück, bleibt der Text stehen (nicht verstanden). */
  const nimm = (re: RegExp, fn: (m: RegExpExecArray) => void | boolean) => {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const g = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    const treffer: RegExpExecArray[] = [];
    while ((m = g.exec(klein)) !== null) {
      treffer.push(m);
      if (m[0].length === 0) g.lastIndex++;
    }
    for (const t of treffer) {
      if (fn(t) === false) continue;
      const leer = " ".repeat(t[0].length);
      klein = klein.slice(0, t.index) + leer + klein.slice(t.index + t[0].length);
      ungelesen = ungelesen.slice(0, t.index) + leer + ungelesen.slice(t.index + t[0].length);
    }
  };
  /** Originalschreibweise (Groß-/Kleinschreibung) an derselben Stelle. */
  const orig = (m: RegExpExecArray, gruppe: number): string => {
    const stueck = m[gruppe];
    if (!stueck) return "";
    const pos = m.index + m[0].indexOf(stueck);
    return original.slice(pos, pos + stueck.length);
  };

  // Neu anfangen
  nimm(/\b(von vorn\w*|neu anfangen|zur(ü|ue)cksetzen|alles l(ö|oe)schen|nochmal von vorn\w*)\b/, () => {
    zuruecksetzen = true;
  });

  // „zeig mir zehn weitere“, „noch mehr“, „10 andere“
  nimm(/\b(?:(\d{1,2}|ein|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn|zw(?:ö|oe)lf|f(?:ü|ue)nfzehn|zwanzig)\s+)?(weitere\w*|mehr|andere\w*|neue vorschl(?:ä|ae)ge|noch welche)\b/, (m) => {
    const n = m[1] ? (ZAHLWORT[m[1]] ?? Number(m[1])) : 8;
    mehr = Math.max(1, Math.min(20, Number.isFinite(n) ? n : 8));
  });

  // Verneinte Wünsche zuerst – sonst läse „kein Oldtimer“ sich als H-Kennzeichen und
  // „kein H-Kennzeichen“ als Ausschluss des Buchstabens H.
  nimm(/\b(?:kein\w*|nicht|ohne)\s+(?:ein\w*\s+|als\s+)?(e-kennzeichen|elektrokennzeichen|elektro\w*|e-auto|stromer|h-kennzeichen|oldtimer\w*)\b/, () => {
    w.zusatz = "" as Zusatz;
    verstanden.push("Standardkennzeichen ohne E oder H");
  });
  nimm(/\b(?:nicht|kein\w*)\s+(?:so\s+|zu\s+)?(?:k(?:ü|ue)rzer\w*|kurz\w*)\b/, () => {
    w.kurz = false;
    w.ziffernMax = null;
    verstanden.push("darf länger sein");
  });
  nimm(/\b(?:nicht|kein\w*)\s+(?:so\s+|zu\s+)?(\w+)/, (m) => {
    const treffer = STILWORT.find(([re]) => re.test(m[1]));
    if (!treffer) return false;
    if (w.stil === treffer[1]) w.stil = null;
    verstanden.push(`nicht ${m[1]}`);
  });

  // Kürzer
  nimm(/\b(k(ü|ue)rzer\w*|m(ö|oe)glichst kurz\w*|ganz kurz\w*|besonders kurz\w*|kurz\w*|wenig\w* zeichen|so kurz wie m(ö|oe)glich)\b/, () => {
    if (w.kurz && w.ziffernMax !== 1) w.ziffernMax = Math.max(1, (w.ziffernMax ?? 3) - 1) as 1 | 2 | 3;
    w.kurz = true;
    verstanden.push("möglichst kurz");
  });
  nimm(/\b(l(ä|ae)nger\w*|ruhig l(ä|ae)nger|darf lang sein)\b/, () => {
    w.kurz = false;
    w.ziffernMax = null;
    w.buchstabenAnzahl = null;
    verstanden.push("darf länger sein");
  });

  // Ausschlüsse: „ohne die Zahl 7“, „keine 13“, „nicht die 4“
  nimm(/\b(?:ohne|kein\w*|nicht)\s+(?:die\s+|eine\s+)?(?:zahl\w*\s+|ziffer\w*\s+|nummer\s+)?(\d{1,4}(?:\s*(?:,|und|oder|&)\s*(?:die\s+)?\d{1,4})*)\b/, (m) => {
    for (const z of m[1].match(/\d{1,4}/g) ?? []) {
      if (!w.ohneZiffern.includes(z)) w.ohneZiffern.push(z);
      w.zahlen = w.zahlen.filter((t) => !t.wert.includes(z));
      verstanden.push(`ohne die ${z}`);
    }
  });
  nimm(/\b(?:ohne|kein\w*|nicht)\s+(?:den\s+|das\s+|ein\s+)?(?:buchstabe\w*\s+)?([a-z])\b(?!\.)/, (m) => {
    const b = m[1].toUpperCase();
    if (!w.ohneBuchstaben.includes(b)) w.ohneBuchstaben.push(b);
    w.buchstaben = w.buchstaben.filter((t) => !t.wert.includes(b));
    verstanden.push(`ohne den Buchstaben ${b}`);
  });
  nimm(/\b(?:ohne|kein\w*)\s+(?:zahl\w*|ziffer\w*)\s*(?:mehr)?\b/, () => {
    // „ohne Zahl“ geht nicht – mindestens eine Ziffer gehört zu jedem Kennzeichen.
    w.ziffernMax = 1;
    verstanden.push("nur eine Ziffer (ganz ohne Zahl geht es nicht)");
  });

  // Anzahl Buchstaben / Ziffern
  nimm(/\b(?:nur\s+|genau\s+|mit\s+)?(ein|einen|einem|1|zwei|2)\s+buchstabe\w*\b/, (m) => {
    w.buchstabenAnzahl = m[1] === "zwei" || m[1] === "2" ? 2 : 1;
    verstanden.push(w.buchstabenAnzahl === 2 ? "zwei Buchstaben" : "ein Buchstabe");
  });
  // Nur eindeutige Angaben: „nur eine Ziffer“, „2 Ziffern“, „drei Zahlen“. „eine Zahl wie 24“ ist keine Begrenzung.
  nimm(/\b(?:(?:nur|genau|maximal|max\.?|h(?:ö|oe)chstens)\s+(eine|einer|1|zwei|2|drei|3|vier|4)\s+(?:ziffer\w*|zahl\w*|stellen)|(1|zwei|2|drei|3|vier|4)\s+(?:ziffer\w*|zahlen|stellen))\b/, (m) => {
    const anzahl = m[1] ?? m[2];
    const n = ZAHLWORT[anzahl] ?? Number(anzahl);
    w.ziffernMax = Math.max(1, Math.min(4, n)) as 1 | 2 | 3 | 4;
    verstanden.push(`höchstens ${w.ziffernMax} ${w.ziffernMax === 1 ? "Ziffer" : "Ziffern"}`);
  });
  nimm(/\b(ein|zwei|drei|vier)stellig\w*\b/, (m) => {
    w.ziffernMax = ZAHLWORT[m[1]] as 1 | 2 | 3 | 4;
    verstanden.push(`höchstens ${w.ziffernMax} ${w.ziffernMax === 1 ? "Ziffer" : "Ziffern"}`);
  });

  // Elektro / Oldtimer
  nimm(/\b(e-kennzeichen|elektrokennzeichen|elektroauto|e-auto|elektro\w*|stromer)\b/, () => {
    w.zusatz = "E" as Zusatz;
    verstanden.push("E-Kennzeichen");
  });
  nimm(/\b(h-kennzeichen|oldtimerkennzeichen|oldtimer\w*)\b/, () => {
    w.zusatz = "H" as Zusatz;
    verstanden.push("H-Kennzeichen");
  });

  // Namen: „ich heiße Lisa“, „mein Freund heißt Tim“, „wir heißen Lisa und Tim“.
  // Bewusst eng gefasst: „ich bin Angler“ oder „wir sind Camper“ sind keine Namen.
  let ich: string[] | null = null;
  const andere: string[] = [];
  nimm(new RegExp(`\\b(?:ich hei(?:ß|ss)e|mein name ist|mein name lautet|(?:mit\\s+)?meinem namen)\\s+${NAME}(?:\\s+${NAME})?`), (m) => {
    const vor = orig(m, 1);
    const nach = orig(m, 2);
    if (!istName(vor)) return false;
    ich = istName(nach) ? [vor, nach] : [vor];
  });
  nimm(new RegExp(`\\b(?:mein|meine|unser|unsere)\\s+${VERWANDT}\\s+hei(?:ß|ss)t\\s+${NAME}`), (m) => {
    const n = orig(m, 1);
    if (!istName(n)) return false;
    andere.push(n);
  });
  nimm(new RegExp(`\\bwir hei(?:ß|ss)en\\s+${NAME}\\s+(?:und|&|\\+)\\s+${NAME}`), (m) => {
    const x = orig(m, 1);
    const y = orig(m, 2);
    if (!istName(x) || !istName(y)) return false;
    ich = [x];
    andere.push(y);
  });
  const selbst = ich as string[] | null;
  if (selbst && andere.length === 0) {
    const [vor, nach] = selbst;
    const v = az(vor);
    if (nach) {
      w.buchstaben.unshift(
        { wert: v[0] + az(nach)[0], grund: "deine Initialen", art: "initialen" },
        { wert: v.slice(0, 2), grund: `die ersten Buchstaben von ${vor}`, art: "name" },
      );
      verstanden.push(`deine Initialen ${v[0]}${az(nach)[0]}`);
    } else {
      w.buchstaben.unshift(
        { wert: v[0], grund: `der Anfangsbuchstabe von ${vor}`, art: "name" },
        { wert: v.slice(0, 2), grund: `die ersten Buchstaben von ${vor}`, art: "name" },
      );
      verstanden.push(`dein Name ${vor}`);
    }
  } else if (selbst && andere.length > 0) {
    const x = az(selbst[0])[0];
    const y = az(andere[0])[0];
    w.buchstaben.unshift(
      { wert: x + y, grund: `eure Anfangsbuchstaben ${x} und ${y}`, art: "initialen" },
      { wert: y + x, grund: `eure Anfangsbuchstaben ${y} und ${x}`, art: "initialen" },
    );
    verstanden.push(`eure Anfangsbuchstaben ${x} und ${y}`);
  } else if (andere.length > 0) {
    const n = andere[0];
    const v = az(n);
    w.buchstaben.unshift(
      { wert: v[0], grund: `der Anfangsbuchstabe von ${n}`, art: "name" },
      { wert: v.slice(0, 2), grund: `die ersten Buchstaben von ${n}`, art: "name" },
    );
    verstanden.push(`der Name ${n}`);
  }

  // Initialen: „Initialen sind TK“, „meine Initialen T. K.“, „Initialen M und M“
  nimm(/\binitialen\b\s*(?:sind|lauten|w(?:ä|ae)ren|:|=)?\s*((?:[a-zäöü]\.?\s*(?:,|und|&|\+)?\s*){1,2})?(?=[\s.,;!?]|$)/, (m) => {
    const roh = orig(m, 1).trim();
    // Als Buchstaben zählen nur Großbuchstaben oder einzeln stehende Buchstaben – nicht der Anfang des nächsten Worts.
    const buchst = roh
      .replace(/\b(und)\b/gi, " ")
      .split(/[\s.,&+]+/)
      .filter(Boolean);
    const gueltig = buchst.every((b) => /^[A-ZÄÖÜ]{1,2}$/.test(b) || /^[a-zäöü]$/.test(b));
    const wert = gueltig ? az(buchst.join("")).slice(0, 2) : "";
    if (wert) {
      w.buchstaben = w.buchstaben.filter((t) => t.art !== "initialen");
      w.buchstaben.unshift({ wert, grund: "deine Initialen", art: "initialen" });
      verstanden.push(`deine Initialen ${wert}`);
    } else if (!w.buchstaben.some((t) => t.art === "initialen")) {
      frage = "Gern – wie lauten deine Initialen?";
    } else {
      const vorhandene = w.buchstaben.filter((t) => t.art === "initialen");
      w.buchstaben = [...vorhandene, ...w.buchstaben.filter((t) => t.art !== "initialen")];
      verstanden.push(`deine Initialen ${vorhandene[0].wert}`);
    }
  });

  // Ausdrückliche Buchstaben: „mit den Buchstaben AB“, „Buchstabe X“
  nimm(/\bbuchstabe\w*\s+([a-z]{1,2})\b(?:\s*(?:und|&|\+)\s*([a-z])\b)?/, (m) => {
    const wert = az(m[1] + (m[2] ?? "")).slice(0, 2);
    if (wert && !FUELLWORT.has(m[1])) {
      w.buchstaben.unshift({ wert, grund: "deine Wunschbuchstaben", art: "wunsch" });
      verstanden.push(`die Buchstaben ${wert}`);
    }
  });

  // Datum: 15.08., 15.8.1990, 5.3.
  nimm(/\b(\d{1,2})\.\s?(\d{1,2})(?:\.(?:\s?(\d{4}|\d{2})(?!\d))?|(?![\d.]))/, (m) => {
    const tag = Number(m[1]);
    const monat = Number(m[2]);
    if (tag < 1 || tag > 31 || monat < 1 || monat > 12) return;
    const davor = klein.slice(Math.max(0, m.index - 60), m.index);
    const grund = /hochzeit/.test(davor)
      ? "euer Hochzeitstag"
      : /jahrestag|zusammen|kennengelernt/.test(davor)
        ? "euer Jahrestag"
        : /geburtstag|geboren|geb\./.test(davor) || /geburtstag|geboren/.test(klein.slice(m.index, m.index + 40))
          ? "dein Geburtstag"
          : "dein Datum";
    const tt = String(tag);
    const mm = String(monat).padStart(2, "0");
    const teile: Wunschteil[] = [];
    const lang = ziffern(tt + mm);
    if (lang) teile.push({ wert: lang, grund: `${grund} am ${tag}.${monat}.`, art: "datum" });
    const kurz = ziffern(tt + String(monat));
    if (kurz && kurz !== lang) teile.push({ wert: kurz, grund: `${grund} am ${tag}.${monat}.`, art: "datum" });
    teile.push({ wert: tt, grund: `der Tag aus ${grund.replace(/^dein |^euer /, (x) => (x === "dein " ? "deinem " : "eurem "))}`, art: "datum" });
    if (m[3]) {
      const jahr = m[3].length === 2 ? m[3] : m[3];
      const voll = ziffern(jahr);
      if (voll) teile.push({ wert: voll, grund: `das Jahr aus ${grund.replace(/^dein |^euer /, (x) => (x === "dein " ? "deinem " : "eurem "))}`, art: "jahr" });
      const zwei = m[3].length === 4 ? ziffern(m[3].slice(2)) : null;
      if (zwei) teile.push({ wert: zwei, grund: `das Jahr ${m[3]} kurz`, art: "jahr" });
    }
    w.zahlen.unshift(...teile);
    verstanden.push(`${grund} am ${tag}.${monat}.`);
  });

  // Jahr: „Geburtsjahr 1990“, „Jahrgang 90“, „Baujahr 1972“
  nimm(/\b(geburtsjahr|jahrgang|baujahr|geboren)\s+(?:ist\s+|war\s+)?(\d{4}|\d{2})\b/, (m) => {
    const was = m[1] === "baujahr" ? "das Baujahr" : m[1] === "geboren" ? "das Geburtsjahr" : "dein Geburtsjahr";
    const voll = ziffern(m[2]);
    if (!voll) return;
    const teile: Wunschteil[] = [{ wert: voll, grund: was, art: "jahr" }];
    const zwei = m[2].length === 4 ? ziffern(m[2].slice(2)) : null;
    if (zwei) teile.push({ wert: zwei, grund: `${was} ${m[2]} kurz`, art: "jahr" });
    w.zahlen.unshift(...teile);
    verstanden.push(`${was} ${m[2]}`);
  });
  nimm(/\b(geburtsjahr|jahrgang)\b/, () => {
    if (!w.zahlen.some((t) => t.art === "jahr")) frage = "Gern – welches Jahr soll es sein?";
    else {
      const jahre = w.zahlen.filter((t) => t.art === "jahr");
      w.zahlen = [...jahre, ...w.zahlen.filter((t) => t.art !== "jahr")];
      verstanden.push(`das Jahr ${jahre[0].wert}`);
    }
  });

  // Zahlen: „mit der Zahl 7“, „Glückszahl 24“, einzelne Zahl
  nimm(/\b(?:(gl(?:ü|ue)ckszahl|lieblingszahl|zahl|nummer|ziffer)\s+(?:ist\s+)?(?:die\s+)?|mit\s+(?:der\s+)?)(\d{1,4})\b/, (m) => {
    const z = ziffern(m[2]);
    if (!z) return;
    const grund = m[1]?.startsWith("gl") ? "deine Glückszahl" : m[1] === "lieblingszahl" ? "deine Lieblingszahl" : "deine Wunschzahl";
    w.zahlen = w.zahlen.filter((t) => t.wert !== z);
    w.zahlen.unshift({ wert: z, grund, art: "wunsch" });
    w.ohneZiffern = w.ohneZiffern.filter((x) => !z.includes(x));
    verstanden.push(`${grund} ${z}`);
  });
  // Nicht Teil einer längeren Zahl oder eines Datums; ein Satzpunkt danach ist erlaubt („die 7.“).
  nimm(/(?<!\d|\d\.)\b(\d{1,4})\b(?!\d|\.\d)/, (m) => {
    const z = ziffern(m[1]);
    if (!z) return;
    const jahr = /^(19|20)\d\d$/.test(z);
    w.zahlen = w.zahlen.filter((t) => t.wert !== z);
    w.zahlen.unshift({ wert: z, grund: jahr ? `das Jahr ${z}` : "deine Wunschzahl", art: jahr ? "jahr" : "wunsch" });
    if (jahr) {
      const zwei = ziffern(z.slice(2));
      if (zwei) w.zahlen.splice(1, 0, { wert: zwei, grund: `das Jahr ${z} kurz`, art: "jahr" });
    }
    verstanden.push(jahr ? `das Jahr ${z}` : `die Zahl ${z}`);
  });

  // Stil
  for (const [re, stil] of STILWORT) {
    let gefunden = false;
    nimm(re, () => {
      gefunden = true;
    });
    if (gefunden && w.stil !== stil) {
      w.stil = stil;
      verstanden.push({ sportlich: "sportlich", elegant: "elegant", minimalistisch: "minimalistisch", kreativ: "ausgefallen", persoenlich: "persönlich", ueberraschend: "überraschend" }[stil]);
    }
  }

  // Marke
  for (const schluessel of Object.keys(MARKEN)) {
    let gefunden = false;
    nimm(new RegExp(`\\b${schluessel}\\b`), () => {
      gefunden = true;
    });
    if (gefunden) {
      w.marke = schluessel;
      verstanden.push(`passend zu deinem ${MARKEN[schluessel].name}`);
      break;
    }
  }

  w.buchstaben = ohneDoppelte(w.buchstaben).slice(0, 8);
  w.zahlen = ohneDoppelte(w.zahlen).slice(0, 10);

  // Fragen, auf die es eine feste Antwort gibt – dafür keine KI.
  let thema: Verstanden["thema"] = null;
  nimm(/\b(kost\w*|preis\w*|geb(?:ü|ue)hr\w*|teuer\w*|g(?:ü|ue)nstig\w*|bezahl\w*)\b/, () => {
    thema = "preis";
  });
  nimm(/\b(verf(?:ü|ue)gbar\w*|frei|vergeben|belegt|reservier\w*|zu haben)\b/, () => {
    thema ??= "verfuegbarkeit";
  });
  nimm(/\b(erste\w*|zweite\w*|dritte\w*|vierte\w*|f(?:ü|ue)nfte\w*|sechste\w*|letzte\w*|oberste\w*)\b/, () => {
    thema ??= "auswahl";
  });

  const restWoerter = klein
    .replace(/[^a-zäöüß0-9 ]+/g, " ")
    .split(" ")
    .filter((x) => x.length >= 3 && !FUELLWORT.has(x));
  const rest = restWoerter.join(" ");
  const fuerKi = ungelesen.replace(/\s+/g, " ").replace(/^[\s,.;:!?–-]+|[\s,;:–-]+$/g, "").trim();
  if (!thema && restWoerter.length === 0 && verstanden.length === 0 && mehr === null && !zuruecksetzen && !frage && text.trim() !== "") {
    thema = "reaktion";
  }
  // Ab zwei unverstandenen Inhaltswörtern – oder einem, wenn sonst nichts verstanden wurde – lohnt die KI.
  const brauchtKi =
    !zuruecksetzen &&
    /[a-zäöüß]{3}/i.test(fuerKi) &&
    (restWoerter.length >= 2 || (restWoerter.length === 1 && verstanden.length === 0 && mehr === null && thema === null));

  return { wuensche: w, verstanden, mehr, zuruecksetzen, frage, rest, fuerKi, brauchtKi, thema };
}

/**
 * Entfernt aus einem Text, was die KI nicht braucht und nicht bekommen soll:
 * E-Mail-Adressen, Telefonnummern, lange Ziffernfolgen, Internetadressen.
 * Der Server prüft dasselbe noch einmal (public/api/kennzeichen-ki.php).
 */
export function bereinigeFuerKi(text: string): string {
  return text
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, " ")
    // Datumsangaben (15.08., 15.8.1990) – sollten schon verstanden sein, hier nur zur Sicherheit
    .replace(/\b\d{1,2}\.\s?\d{1,2}\.(?:\s?\d{2,4})?/g, " ")
    .replace(/https?:\/\/\S+|www\.\S+/gi, " ")
    .replace(/(?:\+|00)?\d[\d /()-]{6,}\d/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

/** true, wenn Wünsche vorliegen, aus denen sich persönliche Vorschläge bilden lassen. */
export function hatPersoenliches(w: Wuensche): boolean {
  return w.buchstaben.length > 0 || w.zahlen.length > 0;
}
