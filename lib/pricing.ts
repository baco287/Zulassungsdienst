/**
 * Preis- und Gebührenlogik.
 *
 * EINZIGE PREISQUELLE ist config/preise.json. Alle Seiten (Startseite,
 * Preisseite, Leistungen, Städte, FAQ, Ratgeber, Rechner, OG-Bilder), der
 * Preisrechner und das Anfrageformular lesen ihre Beträge über dieses Modul.
 * Es gibt derzeit kein Backend, das Preise nachrechnet – den verbindlichen
 * Endpreis bestätigt das Team vor dem Start.
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
  /** Außerbetriebsetzung online (i-Kfz) */
  deregistrationOnline: toRange(preise.amtlicheGebuehren.ausserbetriebsetzungOnline),
  /** Außerbetriebsetzung am Schalter */
  deregistrationCounter: toRange(preise.amtlicheGebuehren.ausserbetriebsetzungSchalter),
  /** Außerbetriebsetzung gesamt (online bis Schalter) */
  deregistration: [
    preise.amtlicheGebuehren.ausserbetriebsetzungOnline[0],
    preise.amtlicheGebuehren.ausserbetriebsetzungSchalter[1],
  ] as [number, number],
  /** Wunschkennzeichen (Zuteilung + Reservierung) */
  customPlate: toRange(preise.amtlicheGebuehren.wunschkennzeichen),
};

/** Kennzeichenschilder (Paar), marktübliche Spanne – für Vergleichstabellen. */
export const plateCosts: [number, number] = [20, 35];

/** Addiert zwei Spannen, z. B. Gebühr + Schilder. */
export function addRanges(a: [number, number], b: [number, number]): [number, number] {
  return [Math.round((a[0] + b[0]) * 100) / 100, Math.round((a[1] + b[1]) * 100) / 100];
}

/** Unser Preis für ein Paar Kennzeichenschilder inkl. Prägung und Versand. */
export const plateFee = PRICES.kennzeichen;

/**
 * Transparenzhinweis zum Wunschkennzeichen: Die amtliche Gebühr ist gesetzlich
 * festgelegt. Liegt unser Paketpreis darunter, trägt KFZ-Zulassungsprofis die
 * Differenz – die Behördengebühr selbst wird dadurch nicht günstiger.
 */
export const wunschkennzeichenHinweis =
  PRICES.wunschkennzeichen < officialFees.customPlate[0]
    ? `Die amtliche Gebühr für Reservierung und Zuteilung (${euro(officialFees.customPlate[0])}) ist gesetzlich festgelegt und bleibt unverändert. Sie ist in unserem Preis von ${P.wunschkennzeichen} enthalten – den Differenzbetrag übernimmt KFZ-Zulassungsprofis.`
    : `Die amtliche Gebühr für Reservierung und Zuteilung (${euro(officialFees.customPlate[0])}) ist in unserem Preis von ${P.wunschkennzeichen} enthalten.`;

/**
 * Befristete Aktion aus config/preise.json (z. B. Gründerrabatt), sonst null.
 * Die Aktionspreise stehen direkt in `leistungen`; dieser Block liefert Name und
 * Enddatum für den Hinweistext und optional den Streichpreis.
 *
 * Streichpreis: Nach § 11 PAngV bzw. § 5 UWG muss ein Vergleichspreis tatsächlich
 * zuvor verlangt worden sein (für Waren: der niedrigste der letzten 30 Tage). Der
 * Eintrag `streichpreis` ist deshalb eine bewusste Entscheidung der Geschäftsführung
 * (siehe `freigabe` in config/preise.json). Er erscheint nur in den Preisanzeigen
 * (Komponente <Streichpreis>), nicht in Fließtexten, Meta-Texten, JSON-LD oder llms.txt.
 */
interface Aktion {
  name: string;
  gueltigBis: string;
  leistungen: string[];
  regulaererPreis: number;
  /** Durchgestrichener Vergleichspreis neben dem Aktionspreis (optional). */
  streichpreis?: number;
}
export const AKTION: Aktion | null = (preise as { aktion?: Aktion }).aktion ?? null;

const AKTION_LABELS: Record<string, string> = {
  neuzulassung: "Neuzulassung",
  ummeldung: "Ummeldung",
  halterwechsel: "Halterwechsel",
  wiederzulassung: "Wiederzulassung",
};

function aufzaehlung(teile: string[]): string {
  return teile.length < 2 ? teile.join("") : `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;
}

/** z. B. "Gründerrabatt: Neuzulassung, Ummeldung, Halterwechsel und Wiederzulassung bis 31.12.2026 für <Preis>." */
export const aktionsHinweis: string = AKTION
  ? `${AKTION.name}: ${aufzaehlung(AKTION.leistungen.map((s) => AKTION_LABELS[s] ?? s))} bis ${AKTION.gueltigBis.split("-").reverse().join(".")} für ${P.zulassung}.`
  : "";

/**
 * Durchgestrichener Vergleichspreis einer Leistung während der Aktion, sonst null.
 * Nur wenn `aktion.streichpreis` gesetzt ist, die Leistung zur Aktion gehört und
 * der Streichpreis über dem aktuellen Preis liegt.
 */
export function streichpreis(slug: string): number | null {
  const alt = AKTION?.streichpreis;
  if (typeof alt !== "number" || !AKTION?.leistungen.includes(slug)) return null;
  const aktuell = leistungsPreis(slug)?.preis;
  return aktuell !== undefined && alt > aktuell ? alt : null;
}

/** Streichpreis als Text wie euro(), mit `kurz` ohne „,00“; sonst null. */
export function streichpreisText(slug: string, kurz = false): string | null {
  const alt = streichpreis(slug);
  if (alt === null) return null;
  const text = euro(alt);
  return kurz ? text.replace(/,00(?=\s*€)/, "") : text;
}

/** Hinweistext, der neben Preisangaben erscheint. */
export const priceDisclaimer = `${aktionsHinweis ? `${aktionsHinweis} ` : ""}Alle Preise inkl. MwSt. Bei Komplettpreisen sind amtliche Gebühren und versicherter Versand bereits enthalten. Neue Kennzeichenschilder liefern wir auf Wunsch für ${P.kennzeichen} pro Paar mit – bei Kennzeichenmitnahme oder eigenem Schildermacher entfällt das. Sonderfälle (z. B. Sondergrößen, Express, auswärtige Behörden) weisen wir vorab transparent aus – Sie erhalten immer eine verbindliche Festpreis-Bestätigung, bevor wir starten.`;

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
 * Berechnet Positionen und Endpreis für den Preisrechner. Die enthaltene
 * MwSt. wird aus dem Gesamtbetrag herausgerechnet; ob amtliche Gebühren als
 * durchlaufende Posten ohne MwSt. auszuweisen sind, klärt die Steuerberatung
 * (deshalb zeigt die Oberfläche keinen MwSt.-Betrag an).
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
