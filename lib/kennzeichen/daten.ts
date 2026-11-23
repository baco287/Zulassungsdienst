/**
 * Lädt die Daten des Kennzeichenassistenten im Browser – einmal je Seitenaufruf.
 * Format der Dateien: app/kennzeichen-daten/…/route.ts.
 */
import type { Behoerde, Bezirk } from "./typen";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type BezirkRoh = [string, string, number, [string, string][], string[], 0 | 1];
type BehoerdeRoh = [string, string | null, string | null, string | null];

let bezirkeLaden: Promise<Bezirk[]> | null = null;
let behoerdenLaden: Promise<Record<string, Behoerde>> | null = null;

async function json<T>(pfad: string): Promise<T> {
  const antwort = await fetch(`${basePath}${pfad}`, { credentials: "omit" });
  if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
  return (await antwort.json()) as T;
}

export function ladeBezirke(): Promise<Bezirk[]> {
  bezirkeLaden ??= json<{ laender: string[]; bezirke: BezirkRoh[] }>("/kennzeichen-daten/bezirke.json")
    .then((d) =>
      d.bezirke.map(([slug, name, land, kuerzel, orte, echtzeit]) => ({
        slug,
        name,
        bundesland: d.laender[land] ?? "",
        kuerzel: kuerzel.map(([code, n]) => ({ code, name: n })),
        orte,
        echtzeit: echtzeit === 1,
      })),
    )
    .catch((fehler) => {
      // Beim nächsten Versuch neu laden statt den Fehler zu behalten.
      bezirkeLaden = null;
      throw fehler;
    });
  return bezirkeLaden;
}

export function ladeBehoerde(slug: string): Promise<Behoerde | null> {
  behoerdenLaden ??= json<Record<string, BehoerdeRoh>>("/kennzeichen-daten/behoerden.json")
    .then((d) =>
      Object.fromEntries(
        Object.entries(d).map(([s, [name, website, text, quelle]]) => [
          s,
          { name, website, wunschHinweis: text && quelle ? { text, quelle } : null },
        ]),
      ),
    )
    .catch((fehler) => {
      behoerdenLaden = null;
      throw fehler;
    });
  return behoerdenLaden.then((alle) => alle[slug] ?? null);
}
