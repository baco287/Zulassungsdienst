/**
 * Zentrale Stammdaten der Website.
 * Markenkonstruktion: „DeutscheZulassung“ ist ein Angebot der
 * Volt Gas UG (haftungsbeschränkt) – siehe company.brandNote.
 */

export const site = {
  name: "DeutscheZulassung",
  claim: "Kfz-Zulassung. Einfach digital.",
  description:
    "DeutscheZulassung übernimmt Ihre Kfz-Zulassung komplett digital: Neuzulassung, Ummeldung und Abmeldung ohne Behördengang – deutschlandweit, transparent und persönlich betreut.",
  url: "https://deutschezulassung.de",
  locale: "de_DE",

  contact: {
    email: "info@deutschezulassung.de",
    phone: "+49 176 25041651",
    phoneDisplay: "0176 / 250 416 51",
    /** Nummer im wa.me-Format ohne "+". */
    whatsapp: "4917625041651",
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
