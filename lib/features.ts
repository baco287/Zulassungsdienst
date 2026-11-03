/**
 * Feature-Schalter (Build-Zeit, über Umgebungsvariablen).
 *
 * NEXT_PUBLIC_CHECKOUT=1
 *   Aktiviert den Online-Bestellprozess mit Dokumenten-Upload, Kundenkonto und
 *   Online-Zahlung (PHP-Backend unter /api/v2/). Erst setzen, wenn auf dem
 *   Server Datenbank, Verschlüsselungsschlüssel und Zahlungsanbieter
 *   eingerichtet und getestet sind (siehe docs/BESTELLSYSTEM.md).
 *   Ohne den Schalter bleibt der bewährte Anfrage-Weg (E-Mail + WhatsApp)
 *   aktiv, und keine Seite verspricht eine Online-Zahlung.
 *
 * NEXT_PUBLIC_ANALYTICS_* – siehe lib/analytics.ts.
 */
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT === "1";

/** Staging-Build (GitHub Pages): kein PHP, keine Indexierung. */
export const IS_STAGING = process.env.NEXT_PUBLIC_STAGING === "1";
