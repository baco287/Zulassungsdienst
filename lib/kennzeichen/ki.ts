/**
 * KI-Ideen vom eigenen Server (public/api/kennzeichen-ki.php → Claude).
 *
 * Der Browser spricht nie direkt mit der KI: Der API-Schlüssel liegt nur auf dem
 * Server, und dort greifen Tageslimit, Monatsbudget, Drosselung je Anschluss und
 * der Aus-Schalter. Jede Antwort wird hier noch einmal gegen das Regelwerk geprüft
 * (generator.ts → ausKi) – die KI liefert Ideen, keine Regeln und keine Verfügbarkeit.
 *
 * Fällt der Dienst aus (pausiert, Limit, Netz, Vorschau ohne PHP), meldet `frageKi`
 * das als `{ ok: false }`. Der Assistent arbeitet dann mit dem Generator weiter.
 */
import type { Stil, Wuensche } from "./typen";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ENDPOINT = `${basePath}/api/kennzeichen-ki.php`;

/** Auf GitHub Pages läuft kein PHP – dort gar nicht erst anfragen. */
export const kiErreichbar = process.env.NEXT_PUBLIC_STAGING !== "1";

export interface KiPaar {
  /** Buchstaben der Erkennungsnummer. */
  b: string;
  /** Ziffern der Erkennungsnummer. */
  z: string;
  idee: string;
}

export type KiAntwort =
  | {
      ok: true;
      quelle: "ki" | "cache";
      /** Ein, zwei Sätze des Assistenten. */
      antwort: string;
      /** Rückfrage mit Antwortmöglichkeiten, wenn der Wunsch noch offen ist. */
      rueckfrage: string | null;
      optionen: string[];
      vorschlaege: KiPaar[];
      stil: Stil | null;
    }
  | {
      ok: false;
      /** pausiert | limit | drossel | eingabe | nicht_eingerichtet | abgelehnt | fehler | netz | vorschau */
      grund: string;
      /** Verständlicher Hinweis, falls der Server einen mitgibt (z. B. bei „eingabe“). */
      hinweis?: string;
    };

export interface KiAnfrage {
  art: "wunsch" | "ueberraschung";
  kuerzel: string;
  /**
   * Nur der Teil des getippten Satzes, den der Browser nicht selbst verstanden hat
   * (verstehen.ts → fuerKi), bereinigt mit bereinigeFuerKi. Nur bei art „wunsch“.
   */
  text?: string;
  wuensche: Wuensche;
  /** Schon gezeigte Kombinationen als "MM24", damit nichts doppelt kommt. */
  gezeigt: string[];
}

const zwischenspeicher = new Map<string, KiAntwort>();

export async function frageKi(a: KiAnfrage, signal?: AbortSignal): Promise<KiAntwort> {
  if (!kiErreichbar) return { ok: false, grund: "vorschau" };

  // An die KI gehen nur Buchstaben, Ziffern und Einschränkungen – keine Namen, keine Begründungen.
  const koerper = {
    art: a.art,
    kuerzel: a.kuerzel,
    text: a.art === "wunsch" ? (a.text ?? "") : "",
    stil: a.wuensche.stil,
    buchstaben: a.wuensche.buchstaben.map((t) => t.wert).slice(0, 6),
    zahlen: a.wuensche.zahlen.map((t) => t.wert).slice(0, 6),
    ohne: [...a.wuensche.ohneZiffern, ...a.wuensche.ohneBuchstaben].slice(0, 8),
    kurz: a.wuensche.kurz,
    zusatz: a.wuensche.zusatz,
    gezeigt: a.gezeigt.slice(-30),
  };
  // Dieselbe Frage in derselben Sitzung nicht zweimal bezahlen.
  const { gezeigt: _gezeigt, ...schluesselTeile } = koerper;
  void _gezeigt;
  const schluessel = JSON.stringify(schluesselTeile);
  const bekannt = a.art === "wunsch" ? zwischenspeicher.get(schluessel) : undefined;
  if (bekannt) return bekannt;

  const abbruch = new AbortController();
  // Länger als der Server höchstens braucht (KI_GESAMT in kennzeichen-ki.php: 19 s) –
  // sonst bezahlt man eine Antwort, die der Browser schon verworfen hat.
  const uhr = setTimeout(() => abbruch.abort(), 25000);
  signal?.addEventListener("abort", () => abbruch.abort(), { once: true });
  try {
    const antwort = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(koerper),
      credentials: "omit",
      signal: abbruch.signal,
    });
    const daten = (await antwort.json()) as KiAntwort;
    if (daten.ok === true && Array.isArray(daten.vorschlaege)) {
      if (a.art === "wunsch") zwischenspeicher.set(schluessel, daten);
      return daten;
    }
    return { ok: false, grund: daten.ok === false ? daten.grund : "fehler", hinweis: daten.ok === false ? daten.hinweis : undefined };
  } catch {
    return { ok: false, grund: "netz" };
  } finally {
    clearTimeout(uhr);
  }
}
