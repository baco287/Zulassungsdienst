/**
 * Feature-Schalter.
 *
 * SERVICEBEDINGUNGEN_FREIGEGEBEN
 *   Die Seite /servicebedingungen/ ist ein Entwurf. Solange der Schalter
 *   false ist, steht sie nicht in Sitemap, Footer und "Über uns" und trägt
 *   noindex. Nach der rechtlichen Prüfung auf true setzen.
 *
 * Analyse: siehe lib/analytics.ts und docs/TRACKING.md.
 */
export const SERVICEBEDINGUNGEN_FREIGEGEBEN = false;

/** Staging-Build (GitHub Pages): kein PHP, keine Indexierung. */
export const IS_STAGING = process.env.NEXT_PUBLIC_STAGING === "1";
