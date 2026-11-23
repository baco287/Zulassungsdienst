/**
 * Anonyme Nutzungszahlen des Kennzeichenassistenten für das Dashboard
 * (/analytics/kennzeichen.php). Läuft über die eigene Webanalyse
 * (lib/eigeneAnalyse.ts → /api/track.php).
 *
 * Gezählt wird nur, DASS etwas passiert ist und in welchem Bezirk – niemals die
 * Kombination selbst, kein Name, kein Datum, kein Text aus dem Gespräch.
 */
import { eigenesEreignis } from "@/lib/eigeneAnalyse";

export type KzaEreignis =
  /** Bezirk gewählt – der Assistent wird benutzt. */
  | "kza_start"
  /** Vorschläge wurden angezeigt (n = Anzahl, modus = Suchoption, quelle = generator | ki | cache). */
  | "kza_vorschlaege"
  /** „Verfügbarkeit prüfen“ geöffnet bzw. Weg gewählt (method = oeffnen | behoerde | service | echtzeit). */
  | "kza_pruefung"
  | "kza_merken"
  | "kza_teilen"
  /** „Dieses Kennzeichen auswählen“. */
  | "kza_auswahl"
  /** Weiter in den Bestellprozess (service = gewählte Leistung). */
  | "kza_uebergabe";

/** Suchoption, mit der Vorschläge entstanden sind. */
export type Modus =
  | "start"
  | "initialen"
  | "name"
  | "datum"
  | "zahl"
  | "paar"
  | "kurz"
  | "stil"
  | "ueberraschung"
  | "text"
  | "eingabe"
  | "aehnliche"
  | "mehr";

export function zaehle(
  ereignis: KzaEreignis,
  angaben: { bezirk?: string; modus?: Modus; quelle?: "generator" | "ki" | "cache"; n?: number; method?: string; service?: string } = {},
): void {
  const { service, ...meta } = angaben;
  eigenesEreignis(ereignis, { service, meta });
}
