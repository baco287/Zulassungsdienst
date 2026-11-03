/**
 * Preis- und Gebührenlogik.
 *
 * EINZIGE PREISQUELLE ist config/preise.json. Alle Seiten (Startseite,
 * Preisseite, Leistungen, Städte, FAQ, Ratgeber, Rechner, OG-Bilder) und das
 * Bestellformular lesen ihre Beträge über dieses Modul. Das PHP-Backend liest
 * dieselbe Datei (beim Build nach public/api/_generated/ kopiert) und rechnet
 * den verbindlichen Endpreis serverseitig nach.
 *
 * Preis ändern: Betrag in config/preise.json anpassen, `stand` aktualisieren,
 * Freigabe setzen, bauen. Kein weiterer Code muss angefasst werden.
 * `npm run check:preise` findet vergessene, fest eingetragene Altpreise.
 */
import preise from "@/config/preise.json";

export type ZulassungsLeistung = keyof typeof preise.leistungen;

export interface LeistungsPreis {
  preis: number;
  enthaeltAmtlicheGebuehren: boolean;
  enthaeltVersand: boolean;
  schilderMoeglich: boolean;
  wunschkennzeichenMoeglich: boolean;
}

export const PRICE_CONFIG = preise;

/** Stand der Preisliste (ISO-Datum). */
export const PRICE_DATE: string = preise.stand;

/** true, sobald die Geschäftsführung die Preise freigegeben hat. */
export const PRICES_APPROVED: boolean = preise.freigabe.freigegeben;

/** Rohwerte in Euro (brutto). */
export const PRICES = {
  zulassung: preise.leistungen.neuzulassung.preis,
  neuzulassung: preise.leistungen.neuzulassung.preis,
  ummeldung: preise.leistungen.ummeldung.preis,
  halterwechsel: preise.leistungen.halterwechsel.preis,
  wiederzulassung: preise.leistungen.wiederzulassung.preis,
  abmeldung: preise.leistungen.abmeldung.preis,
  adressaenderung: preise.leistungen.adressaenderung.preis,
  kennzeichen: preise.zusatzleistungen.kennzeichenschilder.preis,
  wunschkennzeichen: preise.zusatzleistungen.wunschkennzeichen.preis,
} as const;

/** Formatiert einen Betrag als deutschen Euro-String, z. B. "49,90 €". */
export function euro(value: number): string {
  return value.toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
}

/** Formatiert eine Spanne, z. B. "ca. 12,80 – 18,00 €". */
export function euroRange([min, max]: readonly [number, number] | [number, number]): string {
  if (min === max) return `ca. ${euro(min)}`;
  return `ca. ${euro(min)} – ${euro(max)}`;
}

/** Fertig formatierte Preise für Texte, z. B. `ab ${P.zulassung}`. */
export const P = {
  zulassung: euro(PRICES.zulassung),
  abmeldung: euro(PRICES.abmeldung),
  adressaenderung: euro(PRICES.adressaenderung),
  kennzeichen: euro(PRICES.kennzeichen),
  wunschkennzeichen: euro(PRICES.wunschkennzeichen),
} as const;

/** Schema.org-Preisangabe mit Punkt und zwei Nachkommastellen. */
export function schemaPrice(value: number): string {
  return value.toFixed(2);
}

const toRange = (r: number[]): [number, number] => [r[0], r[1]];

/** Amtliche Gebühren (GebOSt) – Spannen, da je Kommune/Vorgang unterschiedlich. */
export const officialFees = {
  /** i-Kfz-Onlinevorgang Zulassung/Umschreibung */
  onlineRegistration: toRange(preise.amtlicheGebuehren.onlineZulassung),
  /** Vorgang am Schalter (falls online nicht möglich) */
  counterRegistration: toRange(preise.amtlicheGebuehren.schalterZulassung),
  /** Außerbetriebsetzung */
  deregistration: toRange(preise.amtlicheGebuehren.ausserbetriebsetzung),
  /** Wunschkennzeichen (Zuteilung + Reservierung) */
  customPlate: toRange(preise.amtlicheGebuehren.wunschkennzeichen),
};

/** Kennzeichenschilder (Paar), marktübliche Spanne – für Vergleichstabellen. */
export const plateCosts: [number, number] = [20, 35];

/** Unser Preis für ein Paar Kennzeichenschilder inkl. Prägung und Versand. */
export const plateFee = PRICES.kennzeichen;

/**
 * Transparenzhinweis zum Wunschkennzeichen: Die amtliche Gebühr ist gesetzlich
 * festgelegt. Liegt unser Paketpreis darunter, trägt DeutscheZulassung die
 * Differenz – die Behördengebühr selbst wird dadurch nicht günstiger.
 */
export const wunschkennzeichenHinweis =
  PRICES.wunschkennzeichen < officialFees.customPlate[0]
    ? `Die amtliche Gebühr für Reservierung und Zuteilung (${euro(officialFees.customPlate[0])}) ist gesetzlich festgelegt und bleibt unverändert. Sie ist in unserem Preis von ${P.wunschkennzeichen} enthalten – den Differenzbetrag übernimmt DeutscheZulassung.`
    : `Die amtliche Gebühr für Reservierung und Zuteilung (${euro(officialFees.customPlate[0])}) ist in unserem Preis von ${P.wunschkennzeichen} enthalten.`;

/** Hinweistext, der neben Preisangaben erscheint. */
export const priceDisclaimer = `Alle Preise inkl. MwSt. Bei Komplettpreisen sind amtliche Gebühren und versicherter Versand bereits enthalten. Neue Kennzeichenschilder liefern wir auf Wunsch für ${P.kennzeichen} pro Paar mit – bei Kennzeichenmitnahme oder eigenem Schildermacher entfällt das. Sonderfälle (z. B. Sondergrößen, Express, auswärtige Behörden) weisen wir vorab transparent aus. Den verbindlichen Endpreis sehen Sie immer vor der Bestellung.`;

/* ─────────────────────────── Bestellpreis ─────────────────────────── */

/** Wie der Kunde zu seinen Schildern kommt. */
export type SchilderOption = "lieferung" | "selbst" | "behalten";

export interface OrderPriceInput {
  leistung: string;
  schilder?: SchilderOption;
  wunschkennzeichen?: boolean;
}

export interface OrderLineItem {
  key: string;
  label: string;
  /** Betrag in Cent (brutto). */
  cents: number;
}

export interface OrderPrice {
  items: OrderLineItem[];
  totalCents: number;
  /** Enthaltene MwSt. in Cent (aus dem Bruttobetrag herausgerechnet). */
  vatCents: number;
}

export function leistungsPreis(slug: string): LeistungsPreis | undefined {
  return (preise.leistungen as Record<string, LeistungsPreis>)[slug];
}

/** Online bestellbare Leistungen (alle mit festem Preis). */
export const BESTELLBARE_LEISTUNGEN = Object.keys(preise.leistungen) as ZulassungsLeistung[];

const cents = (euroValue: number) => Math.round(euroValue * 100);

/**
 * Berechnet Positionen und Endpreis. Muss exakt der Logik in
 * public/api/lib/pricing.php entsprechen (siehe tests/pricing.test.mjs).
 */
export function calculateOrderPrice(input: OrderPriceInput, labels?: Record<string, string>): OrderPrice | null {
  const leistung = leistungsPreis(input.leistung);
  if (!leistung) return null;
  const items: OrderLineItem[] = [
    {
      key: input.leistung,
      label: labels?.[input.leistung] ?? input.leistung,
      cents: cents(leistung.preis),
    },
  ];
  if (leistung.schilderMoeglich && input.schilder === "lieferung") {
    items.push({
      key: "kennzeichenschilder",
      label: preise.zusatzleistungen.kennzeichenschilder.bezeichnung,
      cents: cents(PRICES.kennzeichen),
    });
  }
  if (leistung.wunschkennzeichenMoeglich && input.wunschkennzeichen) {
    items.push({
      key: "wunschkennzeichen",
      label: preise.zusatzleistungen.wunschkennzeichen.bezeichnung,
      cents: cents(PRICES.wunschkennzeichen),
    });
  }
  const totalCents = items.reduce((sum, i) => sum + i.cents, 0);
  const vatCents = Math.round(totalCents - totalCents / (1 + preise.mwstSatz));
  return { items, totalCents, vatCents };
}

export function centsToEuro(value: number): string {
  return euro(value / 100);
}
