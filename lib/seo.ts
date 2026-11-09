import { site } from "./site";

/** Maximale Titellänge, die Google in der Regel vollständig anzeigt. */
export const TITLE_MAX = 60;
const SUFFIX = ` | ${site.name}`;

/**
 * Titel mit Markenzusatz, wenn er in die Länge passt, sonst ohne.
 * Ergebnis ist für `metadata.title` gedacht (umgeht das Layout-Template).
 */
export function fitTitle(title: string): { absolute: string } {
  return { absolute: title.length + SUFFIX.length <= TITLE_MAX ? title + SUFFIX : title };
}
