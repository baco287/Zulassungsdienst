/**
 * Datenbank der Kfz-Zulassungsstellen (/zulassungsstelle/[slug]/) und der
 * Kennzeichenkürzel (/kennzeichen/[kuerzel]/).
 *
 * REGELN – bitte bei jeder Ergänzung einhalten:
 *  - Nur Angaben aus offiziellen Quellen (Stadt, Landkreis, Land, Behörden-
 *    portal). Jede Angabe trägt ihre Quell-URL.
 *  - Nicht belegte Felder bleiben `null` und werden auf der Seite nicht
 *    angezeigt. Niemals schätzen oder aus Branchenbüchern übernehmen.
 *  - `geprueftAm` ist das Datum, an dem die Angaben zuletzt gegen die Quelle
 *    geprüft wurden. Öffnungszeiten ändern sich – Seiten zeigen immer den
 *    Hinweis, vor einem Besuch die Behördenseite zu prüfen.
 *  - Eine Stelle wird nur veröffentlicht, wenn mindestens Behördenname,
 *    eine offizielle Website und die Zuständigkeit belegt sind
 *    (siehe `isPublishable`).
 */
import daten from "./data/zulassungsstellen.json";

export interface Quelle {
  url: string;
}

export interface Belegt<T> {
  wert: T;
  quelle: string;
}

export interface Standort {
  bezeichnung: string;
  strasse: string;
  plz: string;
  ort: string;
  quelle: string;
}

export interface KuerzelInfo {
  code: string;
  bedeutung: string;
  quelle: string;
}

export interface Zulassungsstelle {
  /** Slug, identisch mit der Stadtseite /kfz-zulassung/[slug]/, falls vorhanden. */
  slug: string;
  stadt: string;
  bundesland: string;
  behoerde: Belegt<string>;
  traeger: string | null;
  standorte: Standort[];
  website: Belegt<string> | null;
  terminUrl: Belegt<string> | null;
  ikfzUrl: Belegt<string> | null;
  oeffnungszeiten: { zeilen: string[]; hinweis: string | null; quelle: string } | null;
  zustaendigkeit: Belegt<string> | null;
  kuerzel: KuerzelInfo[];
  besonderheiten: Belegt<string>[];
  geprueftAm: string;
}

/** Geprüfte Daten – Import über scripts/import-zulassungsstellen.mjs. */
export const zulassungsstellen: Zulassungsstelle[] = daten as Zulassungsstelle[];

export function isPublishable(z: Zulassungsstelle): boolean {
  return Boolean(z.behoerde?.wert && z.website?.wert && z.zustaendigkeit?.wert);
}

export const publishedStellen = zulassungsstellen.filter(isPublishable);

export function getZulassungsstelle(slug: string): Zulassungsstelle | undefined {
  return publishedStellen.find((z) => z.slug === slug);
}

/* ─────────────────────────── Kennzeichen ─────────────────────────── */

export interface KennzeichenEintrag {
  code: string;
  /** URL-Slug in Kleinbuchstaben, Umlaute ersetzt. */
  slug: string;
  /** Vollständige Angabe aus der Recherche. */
  bedeutung: string;
  /** Kurzname für Titel und Listen, z. B. "Mainz". */
  name: string;
  /** Erläuterung (wer vergibt, Altkennzeichen …) oder null. */
  hinweis: string | null;
  quelle: string;
  stellen: Zulassungsstelle[];
}

/** Trennt "Mainz (wird von … vergeben)" in Kurzname und Erläuterung. */
export function splitBedeutung(bedeutung: string): { name: string; hinweis: string | null } {
  const i = bedeutung.indexOf(" (");
  if (i < 0) return { name: bedeutung.trim(), hinweis: null };
  const name = bedeutung.slice(0, i).trim();
  const rest = bedeutung
    .slice(i + 2)
    .replace(")", "")
    .replace(/\s*;\s*/g, "; ")
    .trim();
  return { name, hinweis: rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : null };
}

export function kennzeichenSlug(code: string): string {
  return code
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue");
}

/** Alle Kürzel, die mindestens eine veröffentlichte Zulassungsstelle ausgibt. */
export const kennzeichen: KennzeichenEintrag[] = (() => {
  const map = new Map<string, KennzeichenEintrag>();
  for (const z of publishedStellen) {
    for (const k of z.kuerzel) {
      const code = k.code.toUpperCase();
      const entry = map.get(code);
      if (entry) {
        if (!entry.stellen.includes(z)) entry.stellen.push(z);
      } else {
        const { name, hinweis } = splitBedeutung(k.bedeutung);
        map.set(code, { code, slug: kennzeichenSlug(code), bedeutung: k.bedeutung, name, hinweis, quelle: k.quelle, stellen: [z] });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.code.localeCompare(b.code, "de"));
})();

export function getKennzeichen(slug: string): KennzeichenEintrag | undefined {
  return kennzeichen.find((k) => k.slug === slug);
}

