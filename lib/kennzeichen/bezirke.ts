/**
 * Zulassungsbezirke für den Kennzeichenassistenten – schlanke Fassung der
 * geprüften Zulassungsstellen (lib/data/zulassungsstellen.json).
 *
 * NUR in Server-Komponenten und Route-Handlern importieren: Diese Datei zieht die
 * 1,6 MB große Datenbank der Zulassungsstellen nach. Der Browser bekommt die
 * verdichtete Liste über /kennzeichen-daten/bezirke.json (statisch exportiert,
 * siehe app/kennzeichen-daten/bezirke.json/route.ts).
 *
 * Gepflegt wird ausschließlich die Datenbank der Zulassungsstellen. Kommt dort
 * eine Stelle oder ein Kürzel dazu, kennt der Assistent sie beim nächsten Build.
 */
import anbindungen from "@/config/kennzeichen-anbindungen.json";
import { isOfficial } from "@/lib/indexGate";
import { publishedStellen, splitBedeutung, type Zulassungsstelle } from "@/lib/zulassungsstellen";
import type { Behoerde, Bezirk } from "./typen";

/** Bezirke mit angebundener Echtzeitprüfung (config/kennzeichen-anbindungen.json). Stand heute: keine. */
const ECHTZEIT = new Set<string>(
  (anbindungen.anbieter as { aktiv: boolean; bezirke: string[] }[]).filter((a) => a.aktiv).flatMap((a) => a.bezirke),
);

/** Belegter Satz der Behörde zum Wunschkennzeichen, wenn die Recherche einen ergeben hat. */
function wunschHinweis(z: Zulassungsstelle): Behoerde["wunschHinweis"] {
  const treffer = z.besonderheiten.find((b) => /wunschkennzeichen/i.test(b.wert) && isOfficial(b.quelle));
  return treffer ? { text: treffer.wert, quelle: treffer.quelle } : null;
}

function orte(z: Zulassungsstelle): string[] {
  const menge = new Set<string>();
  if (z.traeger) menge.add(z.traeger.replace(/\s*\(.*?\)/g, "").split(",")[0].trim());
  for (const s of z.standorte) menge.add(s.ort.replace(/\s*\(.*?\)/g, "").trim());
  menge.delete(z.stadt);
  return [...menge].filter(Boolean);
}

const stellen = publishedStellen.filter((z) => z.kuerzel.length > 0).sort((a, b) => a.stadt.localeCompare(b.stadt, "de"));

export const bezirke: Bezirk[] = stellen.map((z) => ({
  slug: z.slug,
  name: z.stadt,
  bundesland: z.bundesland,
  kuerzel: z.kuerzel.map((k) => ({ code: k.code.toUpperCase(), name: splitBedeutung(k.bedeutung).name })),
  orte: orte(z),
  echtzeit: ECHTZEIT.has(z.slug),
}));

/** Behördenangaben je Bezirk – getrennt, weil die Suche sie nicht braucht. */
export const behoerden: Record<string, Behoerde> = Object.fromEntries(
  stellen.map((z) => [
    z.slug,
    {
      name: z.behoerde.wert,
      website: z.website && isOfficial(z.website.wert) ? z.website.wert : null,
      wunschHinweis: wunschHinweis(z),
    },
  ]),
);

/** Alle Unterscheidungszeichen mit ihrem Bundesland – für die Regelprüfung auf dem Server. */
export const kuerzelLaender: Record<string, string[]> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const b of bezirke) for (const k of b.kuerzel) (map[k.code] ??= new Set()).add(b.bundesland);
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v].sort()]));
})();

export const BEZIRKE_STAND: string = publishedStellen.reduce((max, z) => (z.geprueftAm > max ? z.geprueftAm : max), "");
