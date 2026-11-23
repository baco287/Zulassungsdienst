/**
 * Merkliste (Favoriten) und Übergabe an den Online-Auftrag.
 *
 * Beides bleibt im Browser des Kunden – nichts davon geht an unseren Server:
 *  - Merkliste: localStorage, nur Kombination und Bezirk, höchstens 12 Einträge,
 *    jederzeit über „Merkliste leeren“ löschbar. Keine Namen, keine Daten, kein
 *    Gesprächsverlauf.
 *  - Übergabe: sessionStorage, verschwindet mit dem Tab. Der Assistent schreibt sie bei jeder
 *    Auswahl neu und löscht sie, wenn die Auswahl entfällt. Der Auftrag (components/AuftragForm.tsx)
 *    übernimmt sie nur, solange sie frisch ist (UEBERGABE_GILT_MS).
 */
import type { Kombination, Status, Zusatz } from "./typen";
import { ausServerantwort } from "./verfuegbarkeit";

const MERK_KEY = "kzp:kennzeichen:merkliste:v1";
const UEBERGABE_KEY = "kzp:kennzeichen:auswahl:v1";
const MAX = 12;

export interface Gemerkt extends Kombination {
  id: string;
  bezirk: string;
  bezirkName: string;
  bundesland: string;
}

function gueltig(e: unknown): e is Gemerkt {
  const g = e as Gemerkt;
  return (
    !!g &&
    typeof g.id === "string" &&
    /^[A-ZÄÖÜ]{1,3}$/.test(g.kuerzel) &&
    /^[A-Z]{1,2}$/.test(g.buchstaben) &&
    /^[1-9][0-9]{0,3}$/.test(g.ziffern) &&
    ["", "E", "H"].includes(g.zusatz) &&
    typeof g.bezirk === "string" &&
    typeof g.bezirkName === "string"
  );
}

export function leseMerkliste(): Gemerkt[] {
  try {
    const roh = JSON.parse(localStorage.getItem(MERK_KEY) ?? "[]");
    return Array.isArray(roh) ? roh.filter(gueltig).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function schreibeMerkliste(liste: Gemerkt[]): boolean {
  try {
    if (liste.length === 0) localStorage.removeItem(MERK_KEY);
    else localStorage.setItem(MERK_KEY, JSON.stringify(liste.slice(0, MAX)));
    return true;
  } catch {
    // Speicher gesperrt (Privatmodus): Die Merkliste gilt dann nur bis zum Neuladen.
    return false;
  }
}

export const MERKLISTE_MAX = MAX;

/* ─────────────────────────── Übergabe an den Auftrag ─────────────────────────── */

export interface Uebergabe {
  kuerzel: string;
  buchstaben: string;
  ziffern: string;
  zusatz: Zusatz;
  bezirk: string;
  bezirkName: string;
  /** Zustand bei der Auswahl – ohne Anbindung immer "idee" oder "pruefung_erforderlich". */
  status: Status;
  /** Nur bei bestätigten Zuständen. */
  quelle?: string;
  geprueftAm?: string;
  /**
   * true nur, wenn der Kunde im Assistenten ausdrücklich „Wir prüfen und reservieren“
   * gewählt hat (mit sichtbarem Preis). Dann ist der Wunschkennzeichen-Service im
   * Auftrag bereits angehakt. Sonst nie – kostenpflichtige Zusätze werden nicht vorbelegt.
   * Wählt der Kunde den Service im Auftrag wieder ab, schreibt der Auftrag hier false zurück.
   */
  serviceGewaehlt: boolean;
  /** Zeitpunkt der Auswahl (ms). Ältere Übergaben gelten nicht mehr. */
  zeit: number;
}

/** So lange nach der Auswahl übernimmt der Auftrag das Kennzeichen. */
export const UEBERGABE_GILT_MS = 2 * 60 * 60 * 1000;

export function schreibeUebergabe(u: Uebergabe | null): void {
  try {
    if (u) sessionStorage.setItem(UEBERGABE_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(UEBERGABE_KEY);
  } catch {
    /* ohne Speicher keine Übergabe – der Auftrag funktioniert trotzdem */
  }
}

export function leseUebergabe(): Uebergabe | null {
  try {
    const u = JSON.parse(sessionStorage.getItem(UEBERGABE_KEY) ?? "null") as Uebergabe | null;
    if (
      !u ||
      !/^[A-ZÄÖÜ]{1,3}$/.test(u.kuerzel) ||
      !/^[A-Z]{1,2}$/.test(u.buchstaben) ||
      !/^[1-9][0-9]{0,3}$/.test(u.ziffern) ||
      !["", "E", "H"].includes(u.zusatz) ||
      typeof u.bezirkName !== "string" ||
      typeof u.zeit !== "number" ||
      Date.now() - u.zeit > UEBERGABE_GILT_MS
    ) {
      return null;
    }
    // Bestätigte Zustände nur mit Quelle und Zeitpunkt – sonst gilt die Kombination als ungeprüft.
    const belegt = ausServerantwort({ ok: true, status: u.status, quelle: u.quelle, geprueftAm: u.geprueftAm });
    const zustand = belegt.status !== "pruefung_erforderlich" ? belegt : { status: u.status === "pruefung_erforderlich" ? u.status : ("idee" as Status) };
    return {
      kuerzel: u.kuerzel,
      buchstaben: u.buchstaben,
      ziffern: u.ziffern,
      zusatz: u.zusatz,
      bezirk: typeof u.bezirk === "string" ? u.bezirk.slice(0, 80) : "",
      bezirkName: u.bezirkName.slice(0, 80),
      status: zustand.status,
      quelle: zustand.quelle,
      geprueftAm: zustand.geprueftAm,
      serviceGewaehlt: u.serviceGewaehlt === true,
      zeit: u.zeit,
    };
  } catch {
    return null;
  }
}

/** Zeile für die Anmerkung des Auftrags – so kommt das Kennzeichen ohne Serveränderung im Posteingang an. */
export function uebergabeZeile(u: Uebergabe): string {
  const kennzeichen = `${u.kuerzel}-${u.buchstaben} ${u.ziffern}${u.zusatz}`;
  const stand =
    u.status === "verfuegbar" && u.quelle && u.geprueftAm
      ? `laut ${u.quelle} am ${new Date(u.geprueftAm).toLocaleString("de-DE")} frei, nicht reserviert`
      : u.status === "reserviert" && u.quelle
        ? `reserviert laut ${u.quelle}`
        : "Verfügbarkeit nicht geprüft, nicht reserviert";
  return `Wunschkennzeichen aus dem Kennzeichenassistenten: ${kennzeichen} (Zulassungsbezirk ${u.bezirkName}; ${stand})`;
}
