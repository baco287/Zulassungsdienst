/**
 * Datentypen des KI-Kennzeichenassistenten (/wunschkennzeichen-generator/).
 *
 * Grundsatz: Ein Vorschlag ist immer nur eine IDEE. Ob eine Kombination frei ist,
 * weiß ausschließlich das Reservierungssystem der zuständigen Zulassungsbehörde.
 * Deshalb sind Vorschlag (Idee) und Verfügbarkeit (Status mit Quelle und Zeitpunkt)
 * zwei getrennte Dinge – siehe `Verfuegbarkeit` unten und docs/KENNZEICHEN-ASSISTENT.md.
 */

/** Zusatzbuchstabe am Ende: E = Elektrokennzeichen, H = Oldtimerkennzeichen. */
export type Zusatz = "" | "E" | "H";

/** Eine Kennzeichenkombination, zerlegt in ihre Teile. */
export interface Kombination {
  /** Unterscheidungszeichen des Zulassungsbezirks, z. B. "H" oder "KÖT". */
  kuerzel: string;
  /** Ein oder zwei Buchstaben der Erkennungsnummer. */
  buchstaben: string;
  /** Eine bis vier Ziffern der Erkennungsnummer, ohne führende Null. */
  ziffern: string;
  zusatz: Zusatz;
}

export type Stil = "elegant" | "sportlich" | "minimalistisch" | "kreativ" | "persoenlich" | "ueberraschend";

export const STILE: { id: Stil; label: string }[] = [
  { id: "persoenlich", label: "Persönlich" },
  { id: "sportlich", label: "Sportlich" },
  { id: "elegant", label: "Elegant" },
  { id: "minimalistisch", label: "Minimalistisch" },
  { id: "kreativ", label: "Kreativ" },
  { id: "ueberraschend", label: "Überraschend" },
];

/** Einordnung eines Vorschlags – bestimmt Reihenfolge und Beschriftung. */
export type Kategorie = "persoenlich" | "minimalistisch" | "kreativ" | "klassisch" | "individuell";

export const KATEGORIE_LABEL: Record<Kategorie, string> = {
  persoenlich: "Persönlich",
  minimalistisch: "Minimalistisch",
  kreativ: "Kreativ",
  klassisch: "Klassisch",
  individuell: "Individuell",
};

/** Woher ein Vorschlag stammt (für die Anzeige und die anonyme Statistik). */
export type Herkunft = "generator" | "ki" | "eingabe";

export interface Vorschlag extends Kombination {
  /** Eindeutig je Kombination, z. B. "H|MM|24|". */
  id: string;
  kategorie: Kategorie;
  /** Ein Satz zur Idee dahinter. */
  idee: string;
  herkunft: Herkunft;
  /** Hinweise aus der Regelprüfung (z. B. „sehr kurz“). Fehler gibt es hier nie – die fliegen vorher raus. */
  hinweise: Befund[];
}

/** Ein einzelner Wunsch mit seiner Begründung – daraus entsteht der Satz unter dem Vorschlag. */
export interface Wunschteil {
  /** Buchstaben (A–Z) oder Ziffernfolge ohne führende Null. */
  wert: string;
  /** Kurzer Grund in der Anrede des Assistenten, z. B. "deine Initialen" oder "euer Jahrestag". */
  grund: string;
  art: "wunsch" | "initialen" | "name" | "datum" | "jahr" | "marke";
}

/** Alles, was der Kunde in der Sitzung gewünscht hat. Bleibt im Arbeitsspeicher des Tabs. */
export interface Wuensche {
  /** Buchstabenwünsche in Reihenfolge der Wichtigkeit, z. B. MM (Initialen), M. */
  buchstaben: Wunschteil[];
  /** Zahlenwünsche, z. B. 24 (Wunschzahl), 1508 (Geburtstag). */
  zahlen: Wunschteil[];
  /** Ziffern oder Ziffernfolgen, die nicht vorkommen sollen. */
  ohneZiffern: string[];
  /** Buchstaben, die nicht vorkommen sollen. */
  ohneBuchstaben: string[];
  stil: Stil | null;
  /** Genau so viele Buchstaben in der Erkennungsnummer (oder beliebig). */
  buchstabenAnzahl: 1 | 2 | null;
  /** Höchstens so viele Ziffern. */
  ziffernMax: 1 | 2 | 3 | 4 | null;
  /** true = so kurz wie möglich. */
  kurz: boolean;
  zusatz: Zusatz;
  /** Automarke o. Ä. aus dem Gespräch (nur für die Ideenfindung, wird nicht gespeichert). */
  marke: string | null;
}

export const LEERE_WUENSCHE: Wuensche = {
  buchstaben: [],
  zahlen: [],
  ohneZiffern: [],
  ohneBuchstaben: [],
  stil: null,
  buchstabenAnzahl: null,
  ziffernMax: null,
  kurz: false,
  zusatz: "",
  marke: null,
};

/* ─────────────────────────── Regelprüfung ─────────────────────────── */

export type Geltung = "bundesweit" | "regional" | "hinweis";

export interface Befund {
  /** Maschinenlesbarer Schlüssel, z. B. "format.ziffern" oder "sperre.buchstaben". */
  code: string;
  /** fehler = wird nicht vorgeschlagen · hinweis = möglich, aber mit Einschränkung. */
  schwere: "fehler" | "hinweis";
  geltung: Geltung;
  text: string;
  /** Kurzfassung für die Karte eines Vorschlags; der volle Text steht im Prüfbereich und in den FAQ. */
  kurztext?: string;
  quelle?: string;
}

export interface Pruefergebnis {
  /** true, wenn kein Befund der Schwere „fehler“ vorliegt. */
  gueltig: boolean;
  fehler: Befund[];
  hinweise: Befund[];
}

/* ─────────────────────────── Zulassungsbezirke ─────────────────────────── */

export interface BezirkKuerzel {
  code: string;
  /** Kurzname, z. B. "Hannover". */
  name: string;
}

/** Schlanke Fassung einer Zulassungsstelle für die Suche im Browser (/kennzeichen-daten/bezirke.json). */
export interface Bezirk {
  /** Slug der Zulassungsstelle (/zulassungsstelle/[slug]/). */
  slug: string;
  /** Anzeigename, z. B. "Hannover" oder "Landkreis Schwandorf". */
  name: string;
  bundesland: string;
  kuerzel: BezirkKuerzel[];
  /** Weitere Suchbegriffe: Träger, Standorte. */
  orte: string[];
  /** true, wenn für diesen Bezirk eine Echtzeit-Verfügbarkeitsprüfung angebunden ist. */
  echtzeit: boolean;
}

/** Angaben zur Behörde – erst nötig, wenn es um die Reservierung geht (/kennzeichen-daten/behoerden.json). */
export interface Behoerde {
  /** Behörde, bei der reserviert und zugelassen wird. */
  name: string;
  /** Offizielle Website der Zulassungsbehörde (belegt). */
  website: string | null;
  /** Belegter Hinweis der Behörde zum Wunschkennzeichen (Text + Quelle), falls recherchiert. */
  wunschHinweis: { text: string; quelle: string } | null;
}

/* ─────────────────────────── Verfügbarkeit ─────────────────────────── */

/**
 * Die fünf zulässigen Zustände. „verfuegbar“, „nicht_verfuegbar“ und „reserviert“
 * dürfen nur aus einer Serverantwort mit Quelle und Zeitpunkt entstehen
 * (lib/kennzeichen/verfuegbarkeit.ts) – nie aus dem Generator oder der KI.
 */
export type Status = "idee" | "pruefung_erforderlich" | "verfuegbar" | "nicht_verfuegbar" | "reserviert";

export interface Verfuegbarkeit {
  status: Status;
  /** Name der angebundenen Quelle – Pflicht bei verfuegbar / nicht_verfuegbar / reserviert. */
  quelle?: string;
  /** ISO-Zeitpunkt der Prüfung – Pflicht bei verfuegbar / nicht_verfuegbar / reserviert. */
  geprueftAm?: string;
}

export const STATUS_TEXT: Record<Status, { label: string; erklaerung: string }> = {
  idee: {
    label: "Idee – noch nicht geprüft",
    erklaerung: "Vorschlag aus dem Assistenten. Ob die Kombination frei ist, steht noch nicht fest.",
  },
  pruefung_erforderlich: {
    label: "Prüfung erforderlich",
    erklaerung: "Für diesen Bezirk ist keine Echtzeitprüfung angebunden. Die Verfügbarkeit zeigt nur das Portal der Zulassungsbehörde.",
  },
  verfuegbar: {
    label: "Verfügbar",
    erklaerung: "Zum angegebenen Zeitpunkt von der angebundenen Quelle als frei gemeldet. Noch nicht reserviert.",
  },
  nicht_verfuegbar: {
    label: "Nicht verfügbar",
    erklaerung: "Von der angebundenen Quelle als vergeben oder gesperrt gemeldet.",
  },
  reserviert: {
    label: "Reserviert",
    erklaerung: "Die Reservierung wurde vom zuständigen System bestätigt.",
  },
};
