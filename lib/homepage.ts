/**
 * Zentrales Datenobjekt der Startseite.
 *
 * Alle Texte, Reihenfolgen und Zuordnungen der Startseite liegen hier – die
 * Komponenten unter components/home/ rendern nur. Bewusst ohne Icons und ohne
 * Mini-Labels über den Überschriften (Designsystem v5). Drei Dinge kommen bewusst
 * NICHT von hier, damit es dafür genau eine Quelle gibt:
 *   Preise            → config/preise.json  (über lib/pricing.ts, lib/catalog.ts)
 *   Zeiten            → config/betrieb.json (über lib/betrieb.ts)
 *   Kontakt/Betreiber → lib/site.ts
 *
 * Formulierungen zu „ohne eID“ folgen der Compliance-Prüfung
 * (docs/seo/compliance-findings.md): Die Aussage steht immer zusammen mit dem
 * Hinweis auf die einmalige digitale Identitätsbestätigung für die Vollmacht.
 */

import { ZEIT } from "@/lib/betrieb";
import { faqItems } from "@/lib/faq";
import { P, PRICE_CONFIG, priceDisclaimer } from "@/lib/pricing";
import { UPLOAD_LIMITS } from "@/lib/order";
import { site } from "@/lib/site";

/* ───────────────────────── Leistungsauswahl ───────────────────────── */

/** Die sechs Hauptleistungen stehen in lib/vorgaenge.ts (auch für Kopfzeile und Auftragsassistent). */
export { vorgaenge, type Vorgang, type VorgangSlug } from "@/lib/vorgaenge";

/* ───────────────────────── Hero ───────────────────────── */

const leistungsPreise = Object.values(PRICE_CONFIG.leistungen);
const alleMitGebuehren = leistungsPreise.every((l) => l.enthaeltAmtlicheGebuehren);

export const hero = {
  title: "Auto online anmelden, ummelden oder abmelden.",
  lead: "Mit KFZ-Zulassungsprofis erledigen Sie Ihre Fahrzeugzulassung bequem online. Ohne eID, ohne AusweisApp und ohne persönlichen Behördentermin bei geeigneten Vorgängen.",
  /** Pflichtzusatz zur „ohne eID“-Aussage, immer in Sichtnähe zum Claim. */
  hinweis:
    "Privater Zulassungsdienst, keine Behörde. Für die Vollmacht bestätigen Sie Ihre Identität einmalig digital – ohne eID-PIN.",
  vorteile: [
    { title: "Ohne Online-Ausweis", text: "keine eID-PIN, keine AusweisApp" },
    { title: "Festpreise inklusive", text: "Behördengebühren, soweit zutreffend" },
    { title: "Persönliche Betreuung", text: "per WhatsApp, E-Mail und Telefon" },
  ],
  primary: { label: "Jetzt Zulassung starten", href: "/auftrag/" },
  secondary: { label: "So funktioniert’s", href: "#ablauf" },
  /** Die Preistafel im Kopf: sechs Leistungen mit Festpreis und direktem Einstieg. */
  auswahl: {
    title: "Ihre Zulassung – jetzt online beauftragen",
    cta: "Jetzt starten",
    fussnote: `${
      alleMitGebuehren
        ? "Alle Festpreise inklusive amtlicher Gebühren und 19 % MwSt."
        : "Alle Festpreise inklusive 19 % MwSt."
    } Kennzeichenschilder auf Wunsch zzgl. ${P.kennzeichen} pro Paar.`,
    alle: { label: "Alle Leistungen ansehen", href: "/leistungen/" },
  },
} as const;

/* ───────────────────────── Vertrauen ───────────────────────── */

export interface TrustItem {
  title: string;
  text: string;
}

export const vertrauen: { items: TrustItem[]; betreiber: string } = {
  items: [
    { title: "Bundesweite Dienstleistung", text: "Über die jeweils zuständige Zulassungsbehörde" },
    { title: "Persönliche Dokumentenprüfung", text: "Wir prüfen Ihre Unterlagen vor der Einreichung" },
    { title: "Transparente Preise", text: "Festpreis-Bestätigung, bevor wir starten" },
    { title: "Direkter Kontakt", text: "Per WhatsApp, E-Mail und Telefon" },
    { title: "Sichere Datenübermittlung", text: "Verschlüsselte Übertragung" },
  ],
  betreiber: `KFZ-Zulassungsprofis ist ein privater Zulassungsdienst mit Sitz in ${site.company.zipCity.split(" ").slice(1).join(" ")} und keine Behörde. Über jede Zulassung entscheidet die zuständige Zulassungsbehörde.`,
};

/* ───────────────────────── Ablauf ───────────────────────── */

export const ablauf = {
  title: "In vier Schritten zur Zulassung",
  lead: `Den Auftrag erteilen Sie in ${ZEIT.auftrag} – am Handy oder am Computer.`,
  schritte: [
    {
      title: "Zulassungsart wählen",
      text: "Wählen Sie die passende Leistung. Preis und benötigte Unterlagen sehen Sie sofort.",
    },
    {
      title: "Angaben und Unterlagen übermitteln",
      text: "Kontaktdaten eintragen und Unterlagen als Foto oder PDF hochladen – oder später per WhatsApp nachreichen.",
    },
    {
      title: "Wir prüfen und bearbeiten den Auftrag",
      text: "Unser Team prüft alles persönlich und bestätigt Ihnen den Festpreis. Für die Vollmacht bestätigen Sie einmalig digital Ihre Identität; danach reichen wir den Antrag bei der zuständigen Behörde ein.",
    },
    {
      title: "Bestätigung und Unterlagen erhalten",
      text: `Papiere und gebuchte Kennzeichenschilder kommen per Post – die Schilder meist in ${ZEIT.kennzeichenDativ}. Abmeldebestätigungen erhalten Sie digital.`,
    },
  ],
  mehr: { label: "Ablauf im Detail", href: "/ablauf/" },
} as const;

/* ───────────────────────── Ohne eID ───────────────────────── */

export const ohneEid = {
  title: "Keine eID? Kein Problem.",
  intro:
    "Über das Behördenportal i-Kfz können Sie Ihr Fahrzeug selbst online zulassen – dafür brauchen Sie einen aktivierten Online-Ausweis mit PIN, die AusweisApp und ein NFC-fähiges Smartphone oder einen Kartenleser. Bei KFZ-Zulassungsprofis übernehmen wir den Vorgang mit Ihrer Vollmacht.",
  wege: [
    {
      key: "ikfz",
      title: "i-Kfz selbst nutzen",
      untertitel: "Das Portal Ihrer Zulassungsbehörde",
      hervorgehoben: false,
      punkte: [
        { positiv: false, text: "Online-Ausweis (eID) mit PIN erforderlich, für Abmeldungen nicht" },
        { positiv: false, text: "AusweisApp und NFC-fähiges Smartphone oder Kartenleser" },
        { positiv: false, text: "Sie prüfen Unterlagen und Eingaben selbst" },
        { positiv: true, text: "Kein Behördentermin nötig" },
        { positiv: true, text: "Nur die amtlichen Gebühren – häufig die günstigste Lösung" },
      ],
    },
    {
      key: "wir",
      title: "Mit KFZ-Zulassungsprofis",
      untertitel: "Zulassungsservice mit Ihrer Vollmacht",
      hervorgehoben: true,
      punkte: [
        { positiv: true, text: "Keine eID-PIN, keine AusweisApp, kein Kartenleser" },
        { positiv: true, text: "Identität einmalig digital bestätigen, Vollmacht digital signieren" },
        { positiv: true, text: "Unser Team prüft Ihre Unterlagen vor der Einreichung" },
        { positiv: true, text: "Kein Behördentermin nötig" },
        { positiv: true, text: `Festpreis ${P.zulassung} inklusive amtlicher Gebühren` },
      ],
    },
  ],
  fair: "Wenn Sie alle Voraussetzungen für i-Kfz erfüllen und den Vorgang selbst durchführen möchten, ist das Behördenportal häufig die günstigste Lösung. KFZ-Zulassungsprofis ist für Menschen gedacht, die keine eID nutzen können oder den Behördenweg vollständig abgeben möchten.",
  hinweis:
    "KFZ-Zulassungsprofis ist ein privater Zulassungsdienst und keine Behörde. Wir reichen Ihren Antrag mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde ein. Die endgültige Entscheidung trifft die Behörde.",
  cta: { label: "Mehr zur Zulassung ohne eID", href: "/kfz-zulassung-ohne-eid/" },
} as const;

/* ───────────────────────── Preise ───────────────────────── */

export const preise = {
  title: "Festpreise ohne Überraschungen",
  lead: "Sie sehen den Preis, bevor Sie etwas eingeben – und erhalten vor dem Start eine verbindliche Festpreis-Bestätigung.",
  hinweise: [
    {
      title: "Im Preis enthalten",
      text: "Serviceleistung mit persönlicher Prüfung Ihrer Unterlagen, Einreichung bei der zuständigen Behörde und 19 % MwSt.",
    },
    {
      title: "Behördengebühren",
      text: alleMitGebuehren
        ? "Die amtlichen Gebühren sind bei allen sechs Leistungen bereits im Festpreis enthalten."
        : "Wo die amtlichen Gebühren im Festpreis enthalten sind, steht es direkt bei der Leistung.",
    },
    {
      title: "Versand",
      text: `Der Versand der Dokumente ist enthalten, wo Dokumente verschickt werden. Neue Kennzeichenschilder brauchen per Post meist ${ZEIT.kennzeichen}. Die Abmeldung läuft digital – ohne Versand.`,
    },
    {
      title: "Optionale Zusatzleistungen",
      text: `Kennzeichenschilder ${P.kennzeichen} pro Paar und Wunschkennzeichen-Service ${P.wunschkennzeichen} – nur, wenn Sie es wünschen.`,
    },
    {
      title: "Sonderfälle",
      text: "Besonderheiten wie Sondergrößen oder auswärtige Behörden bestätigen wir individuell – immer vor dem Start.",
    },
  ],
  fussnote: priceDisclaimer,
  cta: { label: "Alle Preise und Preisrechner", href: "/preise/" },
} as const;

/* ───────────────────────── Datensicherheit ───────────────────────── */

export const sicherheit = {
  title: "Ihre Unterlagen bleiben geschützt.",
  punkte: [
    { text: "Verschlüsselte Übertragung" },
    { text: "Keine Tracking-Cookies" },
    { text: "Persönliche Prüfung" },
    { text: "Löschung sensibler Kopien nach Abschluss im Rahmen der geltenden Vorgaben" },
    { text: "Hosting in Deutschland" },
  ],
  cta: { label: "So schützen wir Ihre Daten", href: "/datensicherheit/" },
} as const;

/* ───────────────────────── FAQ ───────────────────────── */

/** Antwort aus der zentralen FAQ-Liste übernehmen, damit Aussagen nicht doppelt gepflegt werden. */
function ausFaq(frage: string): string {
  const eintrag = faqItems.find((f) => f.question === frage);
  if (!eintrag) throw new Error(`FAQ-Eintrag fehlt in lib/faq.ts: ${frage}`);
  return eintrag.answer;
}

const formate = UPLOAD_LIMITS.extensions
  .filter((e) => e !== "jpeg" && e !== "heif")
  .map((e) => e.toUpperCase())
  .join(", ");

export const faq = {
  title: "Kurz beantwortet",
  items: [
    {
      question: "Welche Unterlagen brauche ich?",
      answer: ausFaq("Welche Unterlagen brauche ich?"),
    },
    {
      question: "Funktioniert die Zulassung ohne eID?",
      answer: ausFaq("Brauche ich einen Personalausweis mit Online-Funktion (eID)?"),
    },
    {
      question: "Wie lange dauert die Bearbeitung?",
      answer: `${ausFaq("Wie lange dauert eine Zulassung?")} Die Angaben gelten ${ZEIT.bezug}.`,
    },
    {
      question: "Wie funktioniert der Dokumenten-Upload?",
      answer: `Im Auftragsassistenten laden Sie Fotos oder Scans Ihrer Unterlagen hoch (${formate}, bis 10 MB je Datei, höchstens ${UPLOAD_LIMITS.maxFiles} Dateien). Die Übertragung ist verschlüsselt. Sie können Unterlagen auch später über die Seite „Unterlagen hochladen“ oder per WhatsApp nachreichen.`,
    },
    {
      question: "Welche Kosten entstehen?",
      answer: ausFaq("Was kostet die Zulassung insgesamt?"),
    },
    {
      question: "Wie kann ich Kontakt aufnehmen?",
      answer: `Per WhatsApp, per E-Mail an ${site.contact.email} oder telefonisch unter ${site.contact.phoneDisplay}. Unsere Servicezeiten: ${site.contact.hours}.`,
    },
    {
      question: "Wer betreibt KFZ-Zulassungsprofis?",
      answer: `KFZ-Zulassungsprofis ist ein privater Zulassungsdienst mit Sitz in ${site.company.zipCity.split(" ").slice(1).join(" ")} und keine Behörde – über jede Zulassung entscheidet die zuständige Zulassungsbehörde. Die vollständigen Anbieterangaben stehen im Impressum.`,
    },
  ],
  mehr: { label: "Alle Fragen und Antworten", href: "/faq/" },
} as const;

/* ───────────────────────── Abschluss-CTA ───────────────────────── */

export const abschluss = {
  title: "Bereit für Ihre Zulassung? Wir übernehmen den Rest.",
  text: "Starten Sie den Auftrag online oder stellen Sie uns Ihre Frage direkt per WhatsApp.",
  primary: { label: "Jetzt Auftrag starten", href: "/auftrag/" },
  secondary: { label: "Frage per WhatsApp stellen" },
} as const;
