/**
 * Preis- und Gebührendaten.
 *
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ WICHTIG – PREISSTATUS                                                  │
 * │                                                                        │
 * │ Die Arbeitspreise unten sind ORIENTIERUNGSWERTE. Marktreferenz war    │
 * │ die öffentlich einsehbare Preisstruktur etablierter Online-           │
 * │ Zulassungsdienste (Recherche Juli 2026: Komplettpreise ca. 120–129 €  │
 * │ je Zulassungsvorgang inkl. Gebühren/Kennzeichen, ca. 30–35 € je       │
 * │ Abmeldung). DeutscheZulassung weist Arbeitspreis, amtliche Gebühren und   │
 * │ Kennzeichen bewusst GETRENNT aus.                                     │
 * │                                                                        │
 * │ Einträge mit `verified: false` sind PLATZHALTER und werden in der UI  │
 * │ sichtbar als "unverbindlich" bzw. "auf Anfrage" gekennzeichnet.       │
 * │ Vor dem Livegang: Preise final festlegen und `verified: true` setzen. │
 * └────────────────────────────────────────────────────────────────────────┘
 */

/** Amtliche Gebühren (GebOSt) – Spannen, da je Kommune/Vorgang unterschiedlich. */
export const officialFees = {
  /** i-Kfz-Onlinevorgang Zulassung/Umschreibung */
  onlineRegistration: [12.8, 18.0] as [number, number],
  /** Vorgang am Schalter (falls online nicht möglich) */
  counterRegistration: [26.3, 30.0] as [number, number],
  /** Außerbetriebsetzung */
  deregistration: [3.0, 16.0] as [number, number],
  /** Wunschkennzeichen (Zuteilung + Reservierung) */
  customPlate: [12.8, 12.8] as [number, number],
} as const;

/** Kennzeichenschilder (Paar), marktübliche Spanne – für Vergleichstabellen. */
export const plateCosts: [number, number] = [20, 35];

/**
 * Unser Preis für ein Paar Kennzeichenschilder inkl. Prägung.
 * Fällt nur an, wenn neue Schilder benötigt werden (nicht bei
 * Kennzeichenmitnahme oder Abmeldung).
 */
export const plateFee = 28.9;

/** Hinweistext, der überall neben Preisangaben erscheint. */
export const priceDisclaimer =
  "Alle Preise inkl. MwSt. Bei Komplettpreisen sind amtliche Gebühren und versicherter Versand bereits enthalten. Werden neue Kennzeichenschilder benötigt, berechnen wir diese mit 28,90 € pro Paar zusätzlich – bei Kennzeichenmitnahme entfällt das. Sonderfälle (z. B. Sondergrößen, Express, auswärtige Behörden) weisen wir vorab transparent aus – Sie erhalten immer eine verbindliche Festpreis-Bestätigung.";

/** Formatiert einen Betrag als deutschen Euro-String. */
export function euro(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

/** Formatiert eine Spanne, z. B. "ca. 12,80 – 18,00 €". */
export function euroRange([min, max]: [number, number]): string {
  if (min === max) return `ca. ${euro(min)}`;
  return `ca. ${euro(min)} – ${euro(max)}`;
}
