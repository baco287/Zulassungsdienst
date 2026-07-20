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
 * │ Abmeldung). EasyZulassung weist Arbeitspreis, amtliche Gebühren und   │
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

/** Kennzeichenschilder (Paar), marktübliche Spanne. */
export const plateCosts: [number, number] = [20, 35];

/** Hinweistext, der überall neben Preisangaben erscheint. */
export const priceDisclaimer =
  "Alle Arbeitspreise inkl. MwSt. Amtliche Gebühren und Kennzeichen fallen zusätzlich an und werden 1:1 ohne Aufschlag weiterberechnet. Preise in der Aufbauphase unverbindlich – verbindliches Angebot erhalten Sie vor Beauftragung.";

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
