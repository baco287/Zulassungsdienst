/**
 * Zentrale Stammdaten der Website.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ PLATZHALTER: Alle mit [TODO] markierten Werte müssen vor dem    │
 * │ Livegang durch echte Unternehmensdaten ersetzt werden!          │
 * └─────────────────────────────────────────────────────────────────┘
 */

export const site = {
  name: "EasyZulassung",
  claim: "Kfz-Zulassung. Einfach digital.",
  description:
    "EasyZulassung übernimmt Ihre Kfz-Zulassung komplett digital: Neuzulassung, Ummeldung und Abmeldung ohne Behördengang – deutschlandweit, transparent und persönlich betreut.",
  url: "https://www.easyzulassung.de", // [TODO] finale Domain eintragen
  locale: "de_DE",

  contact: {
    email: "info@easyzulassung.de", // [TODO] echtes Postfach einrichten
    phone: "+49 000 00000000", // [TODO] echte Rufnummer
    phoneDisplay: "0000 / 000 00 00", // [TODO]
    /** Nummer im wa.me-Format ohne "+" – [TODO] WhatsApp-Business-Nummer eintragen. */
    whatsapp: "490000000000",
    hours: "Mo–Fr 8:00–18:00 Uhr",
  },

  company: {
    legalName: "[TODO] Firmierung, z. B. EasyZulassung UG (haftungsbeschränkt)",
    street: "[TODO] Straße Hausnummer",
    zipCity: "[TODO] PLZ Ort",
    register: "[TODO] Registergericht / HRB",
    vatId: "[TODO] USt-IdNr.",
    responsible: "[TODO] Verantwortliche Person (V. i. S. d. § 18 MStV)",
  },
} as const;

/** Baut einen wa.me-Link mit vorbefülltem Text. */
export function whatsAppLink(text?: string): string {
  const base = `https://wa.me/${site.contact.whatsapp}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
