/**
 * Zentrale Stammdaten der Website.
 * Markenkonstruktion: „DeutscheZulassung“ ist ein Angebot der
 * Volt Gas UG (haftungsbeschränkt) – siehe company.brandNote.
 */

export const site = {
  name: "DeutscheZulassung",
  claim: "Kfz-Zulassung. Einfach digital.",
  description:
    "DeutscheZulassung übernimmt Ihre Kfz-Zulassung komplett digital: Neuzulassung, Ummeldung und Abmeldung ohne Behördengang – deutschlandweit und persönlich betreut.",
  url: "https://deutschezulassung.de",
  locale: "de_DE",

  contact: {
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
      "„DeutscheZulassung“ ist ein Angebot der Volt Gas UG (haftungsbeschränkt).",
    street: "Pappelallee 64",
    zipCity: "10437 Berlin",
    register: "Amtsgericht Charlottenburg (Berlin), HRB 289458 B",
    vatId:
      "Die Umsatzsteuer-Identifikationsnummer (§ 27a UStG) ist beantragt und wird nach Erteilung ergänzt.",
    responsible: "Ahmet Kerim Akan",
  },
} as const;

/** Baut einen wa.me-Link mit vorbefülltem Text. */
export function whatsAppLink(text?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
