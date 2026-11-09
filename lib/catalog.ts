/**
 * serviceCatalog – eine Sicht auf jede Leistung mit allen Pflichtangaben.
 *
 * Führt die drei Quellen zusammen, ohne Werte zu duplizieren:
 *   Texte & Unterlagen  → lib/services.ts
 *   Preise & Gebühren   → config/preise.json (über lib/pricing.ts)
 *   Zeiten & Abwicklung → config/betrieb.json (über lib/betrieb.ts)
 *
 * Seiten, Preisboxen und strukturierte Daten (JSON-LD) lesen Leistungsdaten
 * hierüber, damit sichtbare Angaben und Schema-Markup immer übereinstimmen.
 */
import { services } from "./services";
import { PRICE_CONFIG, PRICE_DATE, PRICES, officialFees, euro, type LeistungsPreis } from "./pricing";
import { BETRIEB, BETRIEB_STAND, zeitphasen, type Zeitphasen } from "./betrieb";
import { site } from "./site";
import type { Service } from "./types";

export const ORG_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

export interface CatalogEntry {
  slug: string;
  name: string;
  kurz: string;
  lang: string;
  /** Endpreis brutto in Euro; null = auf Anfrage. */
  preis: number | null;
  preisText: string;
  amtlicheGebuehren: { enthalten: boolean; spanne: [number, number] | null };
  versand: { enthalten: boolean; kosten: number };
  kennzeichen: { moeglich: boolean; preis: number | null };
  zeiten: Zeitphasen;
  unterlagen: string[];
  ctaHref: string;
  detailHref: string;
  regionen: string;
  /** Jüngstes Datum aus Preis- und Betriebskonfiguration (ISO). */
  aktualisiert: string;
}

function gebuehrenSpanne(slug: string): [number, number] | null {
  if (slug === "abmeldung") return officialFees.deregistrationOnline;
  if (["neuzulassung", "ummeldung", "halterwechsel", "wiederzulassung"].includes(slug)) {
    return officialFees.onlineRegistration;
  }
  return null;
}

const regionenText = BETRIEB.regionen.bundesweit.wert
  ? "bundesweit, über die jeweils zuständige Zulassungsbehörde"
  : "auf Anfrage";

const aktualisiert = [PRICE_DATE, BETRIEB_STAND].sort().at(-1)!;

function toEntry(s: Service): CatalogEntry {
  const lp = (PRICE_CONFIG.leistungen as Record<string, LeistungsPreis>)[s.slug];
  const preis = s.price.verified ? s.price.serviceFee : null;
  return {
    slug: s.slug,
    name: s.name,
    kurz: s.teaser,
    lang: s.description,
    preis,
    preisText: preis !== null ? euro(preis) : "auf Anfrage",
    amtlicheGebuehren: {
      enthalten: lp?.enthaeltAmtlicheGebuehren ?? false,
      spanne: gebuehrenSpanne(s.slug),
    },
    versand: { enthalten: lp?.enthaeltVersand ?? false, kosten: 0 },
    kennzeichen: {
      moeglich: lp?.schilderMoeglich ?? false,
      preis: lp?.schilderMoeglich ? PRICES.kennzeichen : null,
    },
    zeiten: zeitphasen(s.slug),
    unterlagen: s.checklist,
    ctaHref: `/auftrag/?leistung=${s.slug}`,
    detailHref: `/leistungen/${s.slug}/`,
    regionen: regionenText,
    aktualisiert,
  };
}

export const serviceCatalog: CatalogEntry[] = services.map(toEntry);

export function getCatalogEntry(slug: string): CatalogEntry | undefined {
  return serviceCatalog.find((e) => e.slug === slug);
}

/** Beschreibung dessen, was im Preis enthalten ist – sichtbar und im Offer identisch. */
export function preisBestandteile(e: CatalogEntry): string {
  const teile: string[] = [];
  if (e.amtlicheGebuehren.enthalten) teile.push("inkl. amtlicher Gebühren");
  if (e.versand.enthalten) teile.push("inkl. Versand der Dokumente");
  if (e.kennzeichen.moeglich && e.kennzeichen.preis !== null) {
    teile.push(`Kennzeichenschilder auf Wunsch zzgl. ${euro(e.kennzeichen.preis)} pro Paar`);
  }
  teile.push("inkl. 19 % MwSt.");
  return teile.join(", ");
}

/** Service-Markup aus dem Katalog. Preise nur, wenn sie freigegeben und fest sind. */
export function serviceJsonLd(
  e: CatalogEntry,
  opts: { url: string; name?: string; areaServed?: Record<string, unknown> },
) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: opts.name ?? e.name,
    serviceType: e.name,
    description: e.kurz,
    url: opts.url,
    areaServed: opts.areaServed ?? { "@type": "Country", name: "Deutschland" },
    provider: { "@id": ORG_ID },
    ...(e.preis !== null
      ? {
          offers: {
            "@type": "Offer",
            price: e.preis.toFixed(2),
            priceCurrency: "EUR",
            url: `${site.url}${e.detailHref}`,
            description: preisBestandteile(e),
            availability: "https://schema.org/InStock",
          },
        }
      : {}),
  };
}
