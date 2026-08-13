/**
 * Ablauf der Zulassung per Messenger.
 * Gemeinsame Datenquelle für die Landingpage und das HowTo-JSON-LD.
 */
export const whatsappSteps = [
  {
    title: "Chat öffnen und Anliegen schreiben",
    text: "Ein Klick auf den WhatsApp-Button öffnet den Chat mit vorbereiteter Nachricht. Sie schreiben in eigenen Worten, worum es geht – ein Satz genügt.",
  },
  {
    title: "Wir sagen Ihnen, was wir brauchen",
    text: "Ihre persönliche Ansprechperson antwortet mit einer kurzen Liste der benötigten Unterlagen – genau auf Ihren Fall zugeschnitten, ohne Formularfelder.",
  },
  {
    title: "Unterlagen abfotografieren und senden",
    text: "Fahrzeugschein, Ausweis, eVB-Nummer: einfach mit dem Handy abfotografieren und in den Chat schicken. Scans oder PDFs gehen ebenso.",
  },
  {
    title: "Festpreis bestätigen und Vollmacht unterschreiben",
    text: "Sie erhalten den verbindlichen Festpreis und die digitale Vollmacht. Beides bestätigen Sie direkt im Chat – danach übernehmen wir.",
  },
  {
    title: "Fertig – Bestätigung und Papiere kommen zu Ihnen",
    text: "Wir führen den Vorgang bei der Behörde durch und melden uns im Chat, sobald alles erledigt ist. Kennzeichen und Dokumente kommen per versichertem Versand.",
  },
] as const;

/** Beispielhafter Chatverlauf für die Illustration auf der Landingpage. */
export const chatDemo: { from: "kunde" | "team"; text: string; time: string }[] = [
  { from: "kunde", text: "Hallo, ich möchte mein Auto abmelden 🚗", time: "09:12" },
  {
    from: "team",
    text: "Gern! Dafür brauche ich nur drei Fotos: den Fahrzeugschein mit freigelegtem Sicherheitscode und beide Kennzeichen mit den Codes der Plaketten.",
    time: "09:14",
  },
  { from: "kunde", text: "📷 3 Fotos gesendet", time: "09:21" },
  {
    from: "team",
    text: "Perfekt, alles lesbar. Festpreis 34,90 € inkl. Gebühren. Vollmacht zum Bestätigen: [Link]",
    time: "09:23",
  },
  { from: "kunde", text: "Bestätigt 👍", time: "09:25" },
  {
    from: "team",
    text: "Ihr Fahrzeug ist außer Betrieb gesetzt. Die Abmeldebestätigung liegt in Ihrem Postfach ✅",
    time: "15:40",
  },
];
