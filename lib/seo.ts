import { site } from "./site";

/**
 * Maximale Titellänge mit Markenzusatz. Bis November 2026 lag die Grenze bei 60
 * Zeichen; der neue Markenname ist drei Zeichen länger. Damit beim Domainumzug
 * kein Titel seinen Markenzusatz verliert (und sich damit ändert), liegt die
 * Grenze jetzt bei 63. Das Suchwort steht weiterhin vorn.
 */
export const TITLE_MAX = 63;
const SUFFIX = ` | ${site.name}`;

/**
 * Titel mit Markenzusatz, wenn er in die Länge passt, sonst ohne.
 * Ergebnis ist für `metadata.title` gedacht (umgeht das Layout-Template).
 */
export function fitTitle(title: string): { absolute: string } {
  return { absolute: title.length + SUFFIX.length <= TITLE_MAX ? title + SUFFIX : title };
}
