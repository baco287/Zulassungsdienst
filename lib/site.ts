/**
 * Zentrale Stammdaten der Website.
 * Markenkonstruktion: „KFZ-Zulassungsprofis“ ist ein Angebot der
 * Volt Gas UG (haftungsbeschränkt) – siehe company.brandNote.
 *
 * Marke und Domain wurden im November 2026 umgestellt
 * (vorher „DeutscheZulassung“, deutschezulassung.de). Ablauf, Weiterleitungen
 * und offene Schritte: docs/migration/MIGRATION.md.
 */

export const site = {
  name: "KFZ-Zulassungsprofis",
  claim: "Kfz-Zulassung. Einfach digital.",
  description:
    "KFZ-Zulassungsprofis übernimmt Ihre Kfz-Zulassung komplett digital: Neuzulassung, Ummeldung und Abmeldung ohne Behördengang – deutschlandweit und persönlich betreut.",
  url: "https://kfz-zulassungsprofis.de",
  /** Domain ohne Protokoll – für sichtbare Angaben wie Impressum und FAQ. */
  domain: "kfz-zulassungsprofis.de",
  locale: "de_DE",

  contact: {
    /**
     * Bleibt auf der bisherigen Domain, bis die Postfächer unter
     * @kfz-zulassungsprofis.de eingerichtet und getestet sind. Erst dann hier
     * und in public/api/auftrag.php (RECIPIENT, SENDER) umstellen.
     */
    email: "info@deutschezulassung.de",
    phone: "+49 179 1528205",
    phoneDisplay: "0179 / 152 82 05",
    /** Nummer im wa.me-Format ohne "+". */
    whatsapp: "491791528205",
    hours: "Mo–Fr 8:00–18:00 Uhr",
  },

  company: {
    legalName: "Volt Gas UG (haftungsbeschränkt)",
    brandNote:
      "„KFZ-Zulassungsprofis“ ist ein Angebot der Volt Gas UG (haftungsbeschränkt).",
    street: "Pappelallee 64",
    zipCity: "10437 Berlin",
    register: "Amtsgericht Charlottenburg (Berlin), HRB 289458 B",
    vatId:
      "Die Umsatzsteuer-Identifikationsnummer (§ 27a UStG) ist beantragt und wird nach Erteilung ergänzt.",
    responsible: "Ahmet Kerim Akan",
  },

  /**
   * Frühere Marke und Domain. Nur für Weiterleitungen, die Zuordnung alter
   * Referenznummern (DZ-…) und technische Prüfungen – nicht für sichtbare Texte.
   */
  legacy: {
    name: "DeutscheZulassung",
    domain: "deutschezulassung.de",
    referencePrefix: "DZ",
  },

  /** Präfix neuer Referenznummern; muss zu REFERENCE_PREFIX in auftrag.php passen. */
  referencePrefix: "KZP",
} as const;

/** Domain, von der unsere E-Mails kommen (aus der Kontaktadresse abgeleitet). */
export const mailDomain: string = site.contact.email.split("@")[1];

/** Baut einen wa.me-Link mit vorbefülltem Text. */
export function whatsAppLink(text?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
