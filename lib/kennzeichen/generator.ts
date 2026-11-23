/**
 * Kennzeichen-Generator – erzeugt Vorschläge im Browser, ohne KI und ohne Server.
 *
 * Aus den Wünschen der Sitzung (Buchstaben, Zahlen, Stil, Einschränkungen) werden
 * Bausteine gebildet, kombiniert, gegen das Regelwerk geprüft und nach fünf
 * Richtungen eingeordnet:
 *
 *   Persönlich      eigene Buchstaben mit eigener Zahl
 *   Minimalistisch  so wenige Zeichen wie möglich
 *   Individuell     Datum oder Jahr mit persönlicher Bedeutung
 *   Kreativ         Wortspiele (Kürzel + Buchstaben ergeben ein Wort) und Zahlenmuster
 *   Klassisch       gut lesbare Standardkombination
 *
 * Zwei Grundsätze:
 *  - Was der Kunde genannt hat, steckt in jedem Vorschlag. Wer „MM“ und „24“ nennt,
 *    bekommt keine Auffüller, sondern Spielarten von MM und 24.
 *  - Die Liste mischt die Richtungen und wiederholt Bausteine sparsam, damit die
 *    ersten Vorschläge verschieden aussehen.
 *
 * Alles ist reproduzierbar: gleiche Wünsche + gleiche Saat = gleiche Liste.
 * Kein Vorschlag sagt etwas über die Verfügbarkeit aus.
 */
import { bausteinGesperrt, kombiId, platzFuerErkennungsnummer, pruefe } from "./regeln";
import { MARKEN, WOERTER } from "./woerter";
import type { Kategorie, Kombination, Stil, Vorschlag, Wuensche, Wunschteil, Zusatz } from "./typen";

/* ─────────────────────────── Zufall mit Saat ─────────────────────────── */

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Kleiner, reproduzierbarer Zufallsgenerator (mulberry32). */
function zufall(saat: number): () => number {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mische<T>(liste: T[], r: () => number): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ─────────────────────────── Bausteine ─────────────────────────── */

type Art = Wunschteil["art"] | "wort" | "muster" | "stil" | "neutral";

interface Baustein {
  wert: string;
  grund: string;
  art: Art;
  gewicht: number;
  /** true = stammt aus dem, was der Kunde genannt hat (auch abgeleitet). */
  eigen: boolean;
}

const STIL_BUCHSTABEN: Record<Stil, string[]> = {
  sportlich: ["RS", "GT", "R", "S", "X", "ST", "TT", "RX", "GP", "M", "V", "Z"],
  elegant: ["A", "E", "V", "L", "EL", "AL", "LX", "CL", "VA", "LE", "AV", "C"],
  minimalistisch: ["A", "X", "E", "M", "V", "K", "L", "Z", "O", "U", "Y", "T"],
  kreativ: ["OK", "YO", "GO", "XL", "PS", "KW", "TV", "DJ", "UP", "WE", "ME", "JA", "OH", "HI", "EY", "XX"],
  persoenlich: ["A", "M", "K", "L", "J", "T", "B", "D"],
  ueberraschend: ["XX", "PS", "GO", "OK", "Q", "Y", "ZZ", "JO", "MO", "LU", "KO", "VI"],
};

const STIL_ZAHLEN: Record<Stil, string[]> = {
  sportlich: ["1", "7", "9", "77", "99", "300", "500", "911", "5", "44", "63", "360"],
  elegant: ["1", "10", "100", "500", "1000", "21", "7", "12", "3", "200", "30", "9"],
  minimalistisch: ["1", "2", "3", "4", "5", "6", "7", "9", "10", "11", "12", "20"],
  kreativ: [],
  persoenlich: ["1", "7", "3", "9", "11", "21", "77", "13"],
  ueberraschend: ["42", "360", "101", "99", "314", "7", "2026", "66"],
};

/** Zahlen, die als Muster auffallen – mit dem, was an ihnen auffällt. */
const MUSTER_ZAHLEN: [string, string][] = [
  ["123", "aufsteigend"],
  ["1001", "vorwärts wie rückwärts gleich"],
  ["777", "dreimal die 7"],
  ["321", "absteigend"],
  ["404", "vorwärts wie rückwärts gleich"],
  ["1234", "aufsteigend"],
  ["111", "dreimal die 1"],
  ["2002", "vorwärts wie rückwärts gleich"],
  ["555", "dreimal die 5"],
  ["707", "vorwärts wie rückwärts gleich"],
  ["2468", "die geraden Zahlen der Reihe nach"],
  ["222", "dreimal die 2"],
  ["909", "vorwärts wie rückwärts gleich"],
  ["1212", "im Wechsel"],
  ["333", "dreimal die 3"],
  ["999", "dreimal die 9"],
];

const STIL_GRUND: Record<Stil, string> = {
  sportlich: "Sportlich und schnell gesprochen",
  elegant: "Ruhig und klar",
  minimalistisch: "So knapp wie möglich",
  kreativ: "Fällt auf",
  persoenlich: "Leicht zu merken",
  ueberraschend: "Eine Überraschung",
};

const NEUTRALE_BUCHSTABEN = ["A", "M", "K", "L", "AB", "MK", "LM", "JT", "KA", "TM", "AL", "MA"];
const NEUTRALE_ZAHLEN = ["1", "7", "11", "21", "100", "123", "200", "77", "9", "500", "2026", "12"];

function sammler(passt: (wert: string) => boolean) {
  const liste: Baustein[] = [];
  const dazu = (b: Baustein) => {
    if (!passt(b.wert)) return;
    const vorhanden = liste.find((x) => x.wert === b.wert);
    if (!vorhanden) liste.push(b);
    else if (b.gewicht > vorhanden.gewicht) Object.assign(vorhanden, b);
  };
  return { liste, dazu };
}

function buchstabenBausteine(kuerzel: string, w: Wuensche, r: () => number, ordne: <T>(l: T[]) => T[]): Baustein[] {
  const { liste, dazu } = sammler(
    (wert) =>
      /^[A-Z]{1,2}$/.test(wert) &&
      (w.buchstabenAnzahl === null || wert.length === w.buchstabenAnzahl) &&
      !w.ohneBuchstaben.some((x) => wert.includes(x)),
  );

  // 1. Ausdrückliche Wünsche und was sich daraus ableitet.
  w.buchstaben.forEach((t, i) => {
    const basis = 20 - Math.min(i, 5) * 2;
    dazu({ wert: t.wert, grund: t.grund, art: t.art, gewicht: basis, eigen: true });
    // Aus einem Namen wird nichts abgeleitet: „AM“ hat mit „Max“ nichts mehr zu tun.
    if (t.art === "name") return;
    if (t.wert.length === 2) {
      dazu({ wert: t.wert[0], grund: `der erste Buchstabe aus ${t.wert}`, art: t.art, gewicht: basis - 6, eigen: true });
      if (t.wert[0] !== t.wert[1]) {
        dazu({ wert: t.wert[1] + t.wert[0], grund: `${t.wert} in umgekehrter Reihenfolge`, art: t.art, gewicht: basis - 8, eigen: true });
        dazu({ wert: t.wert[1], grund: `der zweite Buchstabe aus ${t.wert}`, art: t.art, gewicht: basis - 9, eigen: true });
      }
    } else {
      dazu({ wert: t.wert + t.wert, grund: `${t.wert} doppelt`, art: t.art, gewicht: basis - 8, eigen: true });
    }
  });

  // 2. Marke aus dem Gespräch.
  const marke = w.marke ? MARKEN[w.marke] : undefined;
  if (marke) {
    marke.buchstaben.forEach((b, i) => dazu({ wert: b, grund: `passt zu deinem ${marke.name}`, art: "marke", gewicht: 11 - i, eigen: true }));
  }

  // 3. Wortspiele: Kürzel + Buchstaben ergeben ein Wort.
  for (const wort of WOERTER) {
    if (wort.length <= kuerzel.length || !wort.startsWith(kuerzel)) continue;
    const rest = wort.slice(kuerzel.length);
    if (rest.length > 2) continue;
    dazu({ wert: rest, grund: `zusammen gelesen: „${wort}“`, art: "wort", gewicht: 9 + r() * 2, eigen: false });
  }

  // 4. Stil und neutrale Auffüller, damit es immer Auswahl gibt.
  const stil = w.stil;
  if (stil) {
    ordne(STIL_BUCHSTABEN[stil]).forEach((b, i) => dazu({ wert: b, grund: STIL_GRUND[stil], art: "stil", gewicht: 7 - i * 0.2, eigen: false }));
  }
  ordne(NEUTRALE_BUCHSTABEN).forEach((b, i) => dazu({ wert: b, grund: "gut lesbar", art: "neutral", gewicht: 2 - i * 0.1, eigen: false }));
  // Wer genau einen oder zwei Buchstaben will und sonst nichts vorgibt, bekommt trotzdem Auswahl.
  if (liste.length < 6) {
    for (const b of ordne("AEKLMRSTVX".split(""))) {
      dazu({ wert: w.buchstabenAnzahl === 2 ? b + b : b, grund: "gut lesbar", art: "neutral", gewicht: 1, eigen: false });
    }
  }
  return liste;
}

function zahlenBausteine(w: Wuensche, ordne: <T>(l: T[]) => T[]): Baustein[] {
  const { liste, dazu } = sammler(
    (wert) =>
      /^[1-9][0-9]{0,3}$/.test(wert) &&
      (w.ziffernMax === null || wert.length <= w.ziffernMax) &&
      !w.ohneZiffern.some((x) => wert.includes(x)),
  );

  w.zahlen.forEach((t, i) => {
    const basis = 20 - Math.min(i, 5) * 2;
    dazu({ wert: t.wert, grund: t.grund, art: t.art, gewicht: basis, eigen: true });
    if (t.art !== "wunsch") return;
    const z = t.wert;
    if (z.length === 1) {
      dazu({ wert: z + z, grund: `die ${z} doppelt`, art: "wunsch", gewicht: basis - 7, eigen: true });
      dazu({ wert: z + z + z, grund: `die ${z} dreifach`, art: "wunsch", gewicht: basis - 8, eigen: true });
    } else if (z.length === 2) {
      dazu({ wert: z[0] + z, grund: `die ${z} mit doppelter ${z[0]}`, art: "wunsch", gewicht: basis - 8, eigen: true });
      dazu({ wert: z + z, grund: `die ${z} zweimal hintereinander`, art: "wunsch", gewicht: basis - 9, eigen: true });
    }
  });

  const marke = w.marke ? MARKEN[w.marke] : undefined;
  if (marke) marke.zahlen.forEach((z, i) => dazu({ wert: z, grund: `passt zu deinem ${marke.name}`, art: "marke", gewicht: 11 - i, eigen: true }));

  const stil = w.stil;
  if (stil) {
    ordne(STIL_ZAHLEN[stil]).forEach((z, i) => dazu({ wert: z, grund: STIL_GRUND[stil], art: "stil", gewicht: 7 - i * 0.2, eigen: false }));
  }
  if (stil === "kreativ" || stil === "ueberraschend" || stil === null) {
    const gewicht = stil === null ? 1.5 : 7.5;
    ordne(MUSTER_ZAHLEN).forEach(([z, grund], i) => dazu({ wert: z, grund, art: "muster", gewicht: gewicht - i * 0.2, eigen: false }));
  }
  if (w.kurz) ["1", "2", "3", "5", "7", "9"].forEach((z, i) => dazu({ wert: z, grund: "einstellig", art: "stil", gewicht: 6 - i * 0.2, eigen: false }));
  ordne(NEUTRALE_ZAHLEN).forEach((z, i) => dazu({ wert: z, grund: "gut zu merken", art: "neutral", gewicht: 2 - i * 0.1, eigen: false }));
  return liste;
}

/* ─────────────────────────── Einordnen und Formulieren ─────────────────────────── */

function kategorie(b: Baustein, z: Baustein): Kategorie {
  if (z.art === "datum" || z.art === "jahr") return "individuell";
  if (b.art === "wort") return "kreativ";
  if (b.wert.length + z.wert.length <= 3) return "minimalistisch";
  if (b.eigen && z.eigen) return "persoenlich";
  if (z.art === "muster") return "kreativ";
  if (b.eigen || z.eigen) return "persoenlich";
  return "klassisch";
}

const satzanfang = (s: string) => s.charAt(0).toLocaleUpperCase("de-DE") + s.slice(1);
const ohnePunkt = (s: string) => s.replace(/\.$/, "");
const kleinAnfang = (s: string) => s.charAt(0).toLocaleLowerCase("de-DE") + s.slice(1);

function idee(b: Baustein, z: Baustein): string {
  const fuell = (x: Baustein) => x.art === "neutral";
  const kurz = b.wert.length + z.wert.length <= 3;
  if (fuell(b) && fuell(z)) return kurz ? "Kurz und schlicht." : "Klassische, gut lesbare Kombination.";
  if (b.art === "stil" && (z.art === "stil" || fuell(z))) return `${b.grund}: ${b.wert} mit der ${z.wert}.`;
  if (b.art === "stil" && z.art === "muster") return `${b.grund}: ${b.wert} mit der ${z.wert} – ${z.grund}.`;

  const zTeil = fuell(z) || (z.art === "stil" && b.art !== "stil") ? null : `${z.wert} – ${ohnePunkt(kleinAnfang(z.grund))}`;
  if (b.art === "wort") {
    return zTeil ? `${satzanfang(b.grund)}. Dazu die ${zTeil}.` : `${satzanfang(b.grund)}.`;
  }
  if (fuell(b) || b.art === "stil") {
    if (!zTeil) return kurz ? "Kurz und schlicht." : "Klassische, gut lesbare Kombination.";
    return `Die ${zTeil}. Davor ${b.wert.length === 1 ? "ein gut lesbarer Buchstabe" : "zwei gut lesbare Buchstaben"}.`;
  }
  const bTeil = `${b.wert} – ${ohnePunkt(b.grund)}`;
  return zTeil ? `${satzanfang(bTeil)}. Dazu die ${zTeil}.` : `${satzanfang(bTeil)}, mit einer Zahl, die man sich leicht merkt.`;
}

/** Reihenfolge der Richtungen beim Mischen der Liste. */
function reihenfolge(w: Wuensche, eigenes: boolean): Kategorie[] {
  if (w.kurz || w.stil === "minimalistisch") return ["minimalistisch", "persoenlich", "individuell", "kreativ", "klassisch"];
  // Noch nichts genannt: mit einem Einfall anfangen, nicht mit der kürzesten Kombination –
  // die geben viele Behörden gar nicht als Wunschkennzeichen heraus.
  if (!eigenes && w.stil === null) return ["kreativ", "klassisch", "minimalistisch", "persoenlich", "individuell"];
  if (w.stil === "kreativ" || w.stil === "ueberraschend") return ["kreativ", "persoenlich", "individuell", "minimalistisch", "klassisch"];
  if (w.stil === "elegant") return ["persoenlich", "minimalistisch", "individuell", "klassisch", "kreativ"];
  return ["persoenlich", "minimalistisch", "individuell", "kreativ", "klassisch"];
}

export interface GeneratorEingabe {
  kuerzel: string;
  /** Bundesland des Bezirks – nötig, damit regionale Sperren greifen. */
  bundesland: string | null;
  wuensche: Wuensche;
  /** IDs bereits gezeigter Vorschläge (für „zeig mir weitere“). */
  ausschliessen?: Iterable<string>;
  anzahl?: number;
  /** 1 = kuratierte Reihenfolge. Jede andere Saat mischt die Auffüller (für „weitere“ und „überrasche mich“). */
  saat?: number;
  /** Nur diese Richtungen liefern (z. B. nur Kreatives für die Ideen des Tages). */
  kategorien?: Kategorie[];
}

type Kandidat = Vorschlag & { punkte: number; laenge: number; bEigen: boolean; zEigen: boolean };

export function erzeuge({ kuerzel, bundesland, wuensche: w, ausschliessen, anzahl = 8, saat = 1, kategorien }: GeneratorEingabe): Vorschlag[] {
  const r = zufall(hash(`${kuerzel}|${saat}`));
  const ordne = <T,>(l: T[]): T[] => (saat === 1 ? l : mische(l, r));
  const gesperrt = new Set(ausschliessen ?? []);
  const platz = platzFuerErkennungsnummer(kuerzel, w.zusatz);
  const bs = buchstabenBausteine(kuerzel, w, r, ordne);
  const zs = zahlenBausteine(w, ordne);
  // Nur Wünsche, die im Bezirk überhaupt gehen, zählen als „eigen vorhanden“. Sonst bliebe bei
  // „Jahrgang 88“ nichts übrig: Auffüller fielen weg, und die 88 selbst verwirft die Regelprüfung.
  const hatB = bs.some((b) => b.eigen && !bausteinGesperrt("buchstaben", b.wert, kuerzel, bundesland));
  const hatZ = zs.some((z) => z.eigen && !bausteinGesperrt("ziffern", z.wert, kuerzel, bundesland));

  let kandidaten: Kandidat[] = [];
  for (const b of bs) {
    // Eigene Buchstaben genannt: nur diese – und Wortspiele als Zugabe.
    if (hatB && !b.eigen && b.art !== "wort") continue;
    for (const z of zs) {
      if (hatZ && !z.eigen) continue;
      // Ein Wortspiel ohne eigene Zahl hat mit dem Wunsch nichts mehr zu tun.
      if (hatB && b.art === "wort" && !z.eigen) continue;
      if (b.wert.length + z.wert.length > platz) continue;
      const k: Kombination = { kuerzel, buchstaben: b.wert, ziffern: z.wert, zusatz: w.zusatz };
      const id = kombiId(k);
      if (gesperrt.has(id)) continue;
      const ergebnis = pruefe(k, { bundesland, streng: true });
      if (!ergebnis.gueltig) continue;
      const kat = kategorie(b, z);
      if (kategorien && !kategorien.includes(kat)) continue;
      const laenge = b.wert.length + z.wert.length;
      let punkte = b.gewicht + z.gewicht;
      if (b.art === "neutral" && z.art === "neutral") punkte -= 4;
      if (w.kurz) punkte += (6 - laenge) * 2.5;
      if (w.stil === "minimalistisch") punkte += (6 - laenge) * 1.5;
      kandidaten.push({ ...k, id, kategorie: kat, idee: idee(b, z), herkunft: "generator", hinweise: ergebnis.hinweise, punkte, laenge, bEigen: b.eigen, zEigen: z.eigen });
    }
  }

  // „Möglichst kurz“: nur die kürzesten Längen zulassen, solange genug Auswahl bleibt.
  if (w.kurz && kandidaten.length > 0) {
    const min = Math.min(...kandidaten.map((k) => k.laenge));
    for (const grenze of [min, min + 1, min + 2]) {
      const kurze = kandidaten.filter((k) => k.laenge <= grenze);
      if (kurze.length >= anzahl || grenze === min + 2) {
        kandidaten = kurze;
        break;
      }
    }
  }

  // Je Richtung die besten zuerst, dann reihum ziehen – so stehen oben verschiedene Arten von Ideen.
  const nachKat = new Map<Kategorie, Kandidat[]>();
  for (const k of kandidaten.sort((a, b) => b.punkte - a.punkte)) {
    const l = nachKat.get(k.kategorie) ?? [];
    l.push(k);
    nachKat.set(k.kategorie, l);
  }
  const folge = reihenfolge(w, hatB || hatZ).filter((k) => nachKat.has(k));
  // Mit eigenen Wünschen bleiben Wortspiele eine Zugabe, kein Schwerpunkt.
  const hoechstens: Partial<Record<Kategorie, number>> = hatB || hatZ ? { kreativ: Math.max(1, Math.ceil(anzahl / 4)) } : {};
  const gezogen = new Map<Kategorie, number>();
  const aus: Vorschlag[] = [];
  const nb = new Map<string, number>();
  const nz = new Map<string, number>();
  // Abwechslung: Eigene Bausteine dürfen öfter vorkommen (sie sind der Wunsch), Auffüller zunächst nur einmal.
  for (const [eigen, fremd] of [
    [3, 1],
    [5, 2],
    [99, 3],
    [99, 99],
  ]) {
    let leer = 0;
    for (let i = 0; aus.length < anzahl && leer < folge.length; i++) {
      const kat = folge[i % folge.length];
      const liste = nachKat.get(kat)!;
      const voll = (gezogen.get(kat) ?? 0) >= (hoechstens[kat] ?? 99);
      const idx = voll
        ? -1
        : liste.findIndex((k) => (nb.get(k.buchstaben) ?? 0) < (k.bEigen ? eigen : fremd) && (nz.get(k.ziffern) ?? 0) < (k.zEigen ? eigen : fremd));
      if (idx < 0) {
        leer++;
        continue;
      }
      leer = 0;
      const [k] = liste.splice(idx, 1);
      nb.set(k.buchstaben, (nb.get(k.buchstaben) ?? 0) + 1);
      nz.set(k.ziffern, (nz.get(k.ziffern) ?? 0) + 1);
      gezogen.set(kat, (gezogen.get(kat) ?? 0) + 1);
      aus.push({ kuerzel: k.kuerzel, buchstaben: k.buchstaben, ziffern: k.ziffern, zusatz: k.zusatz, id: k.id, kategorie: k.kategorie, idee: k.idee, herkunft: k.herkunft, hinweise: k.hinweise });
    }
    if (aus.length >= anzahl) break;
  }
  return aus;
}

/**
 * Macht aus Buchstaben-Zahlen-Paaren der KI geprüfte Vorschläge.
 * Was das Regelwerk nicht besteht, fällt weg – die KI liefert Ideen, keine Regeln.
 */
export function ausKi(
  paare: { b: string; z: string; idee: string }[],
  kuerzel: string,
  bundesland: string | null,
  zusatz: Zusatz,
  ausschliessen: Iterable<string> = [],
): Vorschlag[] {
  const gesperrt = new Set(ausschliessen);
  const aus: Vorschlag[] = [];
  for (const p of paare) {
    const k: Kombination = { kuerzel, buchstaben: p.b.toUpperCase(), ziffern: p.z, zusatz };
    const id = kombiId(k);
    if (gesperrt.has(id)) continue;
    const e = pruefe(k, { bundesland, streng: true });
    if (!e.gueltig) continue;
    gesperrt.add(id);
    const laenge = k.buchstaben.length + k.ziffern.length;
    aus.push({ ...k, id, kategorie: laenge <= 3 ? "minimalistisch" : "kreativ", idee: p.idee, herkunft: "ki", hinweise: e.hinweise });
  }
  return aus;
}

/* ─────────────────────────── Ähnliche Kennzeichen ─────────────────────────── */

/** Varianten rund um eine gewählte Kombination: gleiche Buchstaben mit verwandten Zahlen und umgekehrt. */
export function aehnliche(
  basis: Kombination,
  bundesland: string | null,
  ausschliessen: Iterable<string> = [],
  anzahl = 6,
): Vorschlag[] {
  const gesperrt = new Set(ausschliessen);
  gesperrt.add(kombiId(basis));
  const platz = platzFuerErkennungsnummer(basis.kuerzel, basis.zusatz);
  const n = Number(basis.ziffern);
  const z = basis.ziffern;
  const b = basis.buchstaben;

  const zahlen: [string, string][] = [
    [String(n + 1), "eine Zahl weiter"],
    [String(Math.max(1, n - 1)), "eine Zahl davor"],
    [z + z, "die Zahl doppelt"],
    [z.split("").reverse().join("").replace(/^0+/, ""), "die Zahl gespiegelt"],
    [z + "0", "mit einer Null dahinter"],
    [z[0], "nur die erste Ziffer"],
    [z.slice(-2).replace(/^0+/, ""), "nur die letzten beiden Ziffern"],
    [z[0] + z, "die erste Ziffer verdoppelt"],
    [String(n + 10), "zehn mehr"],
    [String(n * 2), "das Doppelte"],
  ];
  const buchstaben: [string, string][] = [
    [b.length === 2 ? b[1] + b[0] : b + b, b.length === 2 ? "Buchstaben getauscht" : "Buchstabe doppelt"],
    [b[0], "nur der erste Buchstabe"],
    [b.length === 2 ? b[1] : "", "nur der zweite Buchstabe"],
    [b.length === 2 ? b[0] + b[0] : "", "der erste Buchstabe doppelt"],
  ];

  const aus: Vorschlag[] = [];
  const nimm = (k: Kombination, text: string) => {
    if (aus.length >= anzahl) return;
    if (k.buchstaben.length + k.ziffern.length > platz) return;
    const id = kombiId(k);
    if (gesperrt.has(id)) return;
    const e = pruefe(k, { bundesland, streng: true });
    if (!e.gueltig) return;
    gesperrt.add(id);
    aus.push({ ...k, id, kategorie: "persoenlich", idee: `Nah an ${basis.buchstaben} ${basis.ziffern}: ${text}.`, herkunft: "generator", hinweise: e.hinweise });
  };
  // Abwechselnd Zahl und Buchstaben verändern.
  for (let i = 0; i < Math.max(zahlen.length, buchstaben.length); i++) {
    if (zahlen[i]?.[0]) nimm({ ...basis, ziffern: zahlen[i][0] }, zahlen[i][1]);
    if (buchstaben[i]?.[0]) nimm({ ...basis, buchstaben: buchstaben[i][0] }, buchstaben[i][1]);
  }
  return aus;
}

/* ─────────────────────────── Kennzeichen des Tages ─────────────────────────── */

/**
 * Ideen des Tages je Kürzel – täglich andere, für alle Besucher dieselben.
 * Reine Ideen aus dem Generator, nicht geprüft und nicht reserviert.
 */
export function ideenDesTages(kuerzel: string, bundesland: string | null, datum: string, anzahl = 3): Vorschlag[] {
  const wuensche: Wuensche = {
    buchstaben: [],
    zahlen: [],
    ohneZiffern: [],
    ohneBuchstaben: [],
    stil: "kreativ",
    buchstabenAnzahl: null,
    ziffernMax: null,
    kurz: false,
    zusatz: "",
    marke: null,
  };
  // Saat nie 1: Die kuratierte Reihenfolge gehört dem Assistenten selbst.
  return erzeuge({ kuerzel, bundesland, wuensche, anzahl, saat: (hash(datum) % 100000) + 2, kategorien: ["kreativ"] });
}
