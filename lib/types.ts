/** Zentrale Datentypen für Leistungen, Preise und Aufträge. */

export type ServiceCategory = "zulassung" | "kennzeichen" | "dokumente" | "service";

export type Audience = "privat" | "gewerblich" | "beide";

export interface PriceInfo {
  /** Arbeitspreis von EasyZulassung in Euro (brutto). null = noch nicht festgelegt. */
  serviceFee: number | null;
  /**
   * true = Preis ist final festgelegt.
   * false = PLATZHALTER: Wert dient nur der Orientierung und wird in der UI
   * als "unverbindlich" bzw. "auf Anfrage" gekennzeichnet.
   */
  verified: boolean;
  /** Amtliche Gebühren (Spanne, brutto ≙ gebührenrechtlich ohne USt.). */
  officialFeeRange?: [number, number];
  /** Kennzeichenkosten (Spanne), falls für die Leistung relevant. */
  plateCostRange?: [number, number];
  /** Ergänzende Preisanmerkung für die Anzeige. */
  note?: string;
}

export interface Service {
  slug: string;
  name: string;
  shortName?: string;
  category: ServiceCategory;
  audience: Audience;
  /** Kurzbeschreibung für Karten/Listen. */
  teaser: string;
  /** Ausführliche Beschreibung für die Detailseite. */
  description: string;
  price: PriceInfo;
  /** Benötigte Unterlagen (Dokumenten-Checkliste). */
  checklist: string[];
  /** Typische Bearbeitungsdauer als Text, z. B. "1–2 Werktage". */
  duration: string;
  /** Anzeige-Reihenfolge innerhalb der Kategorie. */
  order: number;
  /** Häufig gebucht → Hervorhebung in der UI. */
  popular?: boolean;
}

export interface FaqItem {
  question: string;
  answer: string;
  category: "allgemein" | "preise" | "ablauf" | "dokumente";
}

/** Formularmodell für den Online-Auftrag (Phase 1: Übermittlung per WhatsApp/E-Mail). */
export interface OrderRequest {
  serviceSlug: string;
  audience: Exclude<Audience, "beide">;
  name: string;
  email: string;
  phone: string;
  zip: string;
  city: string;
  vehicle: string;
  message: string;
  consent: boolean;
}
