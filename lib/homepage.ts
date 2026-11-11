/**
 * Zentrales Datenobjekt der Startseite.
 *
 * Alle Texte, Reihenfolgen und Zuordnungen der Startseite liegen hier – die
 * Komponenten unter components/home/ rendern nur. Drei Dinge kommen bewusst
 * NICHT von hier, damit es dafür genau eine Quelle gibt:
 *   Preise            → config/preise.json  (über lib/pricing.ts, lib/catalog.ts)
 *   Zeiten            → config/betrieb.json (über lib/betrieb.ts)
 *   Kontakt/Betreiber → lib/site.ts
 *
 * Formulierungen zu „ohne eID“ folgen der Compliance-Prüfung
 * (docs/seo/compliance-findings.md): Die Aussage steht immer zusammen mit dem
 * Hinweis auf die einmalige digitale Identitätsbestätigung für die Vollmacht.
 */

import {
  BadgeEuro,
  ClipboardList,
  Cookie,
  FileCheck2,
  Headset,
  IdCard,
  Lock,
  MailCheck,
  MapPinned,
  MessageCircle,
  SearchCheck,
  Server,
  ShieldCheck,
  Trash2,
  Upload,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { ZEIT } from "@/lib/betrieb";
import { faqItems } from "@/lib/faq";
import { P, PRICE_CONFIG, priceDisclaimer } from "@/lib/pricing";
import { UPLOAD_LIMITS } from "@/lib/order";
import { site } from "@/lib/site";

/* ───────────────────────── Leistungsauswahl ───────────────────────── */

/** Die sechs Hauptleistungen stehen in lib/vorgaenge.ts (auch für Kopfzeile und Auftragsassistent). */
export { vorgaenge, type Vorgang, type VorgangSlug } from "@/lib/vorgaenge";

/* ───────────────────────── Hero ───────────────────────── */

export const hero = {
  badge: "Bundesweiter Kfz-Zulassungsservice",
  title: "Auto online anmelden, ummelden oder abmelden.",
  lead: "Ohne eID, ohne AusweisApp und ohne Behördentermin. Wir übernehmen die Zulassung bundesweit und prüfen Ihre Unterlagen persönlich.",
  /** Pflichtzusatz zur „ohne eID“-Aussage, immer in Sichtnähe zum Claim. */
  hinweis:
    "Privater Zulassungsdienst, keine Behörde. Für die Vollmacht bestätigen Sie Ihre Identität einmalig digital – ohne eID-PIN.",
  vorteile: [
    { icon: IdCard, title: "Ohne Online-Ausweis", text: "keine eID-PIN, keine AusweisApp" },
    { icon: BadgeEuro, title: "Festpreise inklusive", text: "Behördengebühren, soweit zutreffend" },
    { icon: Headset, title: "Persönliche Betreuung", text: "per WhatsApp, E-Mail und Telefon" },
  ],
  primary: { label: "Jetzt Zulassung starten", href: "/auftrag/" },
  secondary: { label: "So funktioniert’s", href: "#ablauf" },
  fakten: ["Bundesweit", `Bearbeitung meist ${ZEIT.zulassung}`, "Verschlüsselte Datenübermittlung"],
  auswahl: {
    title: "Ihre Zulassung – jetzt online beauftragen",
    text: "Wählen Sie die gewünschte Leistung und starten Sie direkt.",
    cta: "Jetzt starten",
  },
} as const;

/* ───────────────────────── Vertrauen ───────────────────────── */

export interface TrustItem {
  icon: LucideIcon;
  title: string;
  text: string;
}

export const vertrauen: { items: TrustItem[]; betreiber: string } = {
  items: [
    { icon: MapPinned, title: "Bundesweite Dienstleistung", text: "Über die jeweils zuständige Zulassungsbehörde" },
    { icon: ShieldCheck, title: "Persönliche Dokumentenprüfung", text: "Wir prüfen Ihre Unterlagen vor der Einreichung" },
    { icon: BadgeEuro, title: "Transparente Preise", text: "Festpreis-Bestätigung, bevor wir starten" },
    { icon: MessageCircle, title: "Direkter Kontakt", text: "Per WhatsApp, E-Mail und Telefon" },
    { icon: Lock, title: "Sichere Datenübermittlung", text: "Verschlüsselte Übertragung" },
  ],
  betreiber: `DeutscheZulassung ist ein privater Zulassungsdienst und keine Behörde. Betreiber ist die ${site.company.legalName}, ${site.company.zipCity.split(" ").slice(1).join(" ")}. Über jede Zulassung entscheidet die zuständige Zulassungsbehörde.`,
};

/* ───────────────────────── Leistungen ───────────────────────── */

export const leistungen = {
  eyebrow: "Leistungen",
  title: "Welche Zulassung möchten Sie beauftragen?",
  lead: "Sechs Vorgänge zum Festpreis – jeweils mit persönlicher Prüfung Ihrer Unterlagen.",
  cta: "Jetzt beauftragen",
  alle: { label: "Alle Leistungen ansehen", href: "/leistungen/" },
} as const;

/* ───────────────────────── Ablauf ───────────────────────── */

export const ablauf = {
  eyebrow: "So funktioniert’s",
  title: "In vier Schritten zur Zulassung",
  lead: `Den Auftrag erteilen Sie in ${ZEIT.auftrag} – am Handy oder am Computer.`,
  schritte: [
    {
      icon: ClipboardList,
      title: "Zulassungsart wählen",
      text: "Wählen Sie die passende Leistung. Preis und benötigte Unterlagen sehen Sie sofort.",
    },
    {
      icon: Upload,
      title: "Angaben und Unterlagen übermitteln",
      text: "Kontaktdaten eintragen und Unterlagen als Foto oder PDF hochladen – oder später per WhatsApp nachreichen.",
    },
    {
      icon: SearchCheck,
      title: "Wir prüfen und bearbeiten den Auftrag",
      text: "Unser Team prüft alles persönlich und bestätigt Ihnen den Festpreis. Für die Vollmacht bestätigen Sie einmalig digital Ihre Identität; danach reichen wir den Antrag bei der zuständigen Behörde ein.",
    },
    {
      icon: MailCheck,
      title: "Bestätigung und Unterlagen erhalten",
      text: "Papiere und gebuchte Kennzeichen werden versendet. Abmeldebestätigungen erhalten Sie digital.",
    },
  ],
  mehr: { label: "Ablauf im Detail", href: "/ablauf/" },
} as const;

/* ───────────────────────── Ohne eID ───────────────────────── */

export const ohneEid = {
  eyebrow: "Zulassung ohne Online-Ausweis",
  title: "Keine eID? Kein Problem.",
  intro:
    "Über das Behördenportal i-Kfz können Sie Ihr Fahrzeug selbst online zulassen – dafür brauchen Sie einen aktivierten Online-Ausweis mit PIN, die AusweisApp und ein NFC-fähiges Smartphone oder einen Kartenleser. Bei DeutscheZulassung übernehmen wir den Vorgang mit Ihrer Vollmacht.",
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
      title: "Mit DeutscheZulassung",
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
  fair: "Wenn Sie alle Voraussetzungen für i-Kfz erfüllen und den Vorgang selbst durchführen möchten, ist das Behördenportal häufig die günstigste Lösung. DeutscheZulassung ist für Menschen gedacht, die keine eID nutzen können oder den Behördenweg vollständig abgeben möchten.",
  hinweis:
    "DeutscheZulassung ist ein privater Zulassungsdienst und keine Behörde. Wir reichen Ihren Antrag mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde ein. Die endgültige Entscheidung trifft die Behörde.",
  cta: { label: "Mehr zur Zulassung ohne eID", href: "/kfz-zulassung-ohne-eid/" },
} as const;

/* ───────────────────────── Preise ───────────────────────── */

const leistungsPreise = Object.values(PRICE_CONFIG.leistungen);
const alleMitGebuehren = leistungsPreise.every((l) => l.enthaeltAmtlicheGebuehren);

export const preise = {
  eyebrow: "Preise",
  title: "Festpreise ohne Überraschungen",
  lead: "Sie sehen den Preis, bevor Sie etwas eingeben – und erhalten vor dem Start eine verbindliche Festpreis-Bestätigung.",
  hinweise: [
    {
      icon: FileCheck2,
      title: "Im Preis enthalten",
      text: "Serviceleistung mit persönlicher Prüfung Ihrer Unterlagen, Einreichung bei der zuständigen Behörde und 19 % MwSt.",
    },
    {
      icon: BadgeEuro,
      title: "Behördengebühren",
      text: alleMitGebuehren
        ? "Die amtlichen Gebühren sind bei allen sechs Leistungen bereits im Festpreis enthalten."
        : "Wo die amtlichen Gebühren im Festpreis enthalten sind, steht es direkt bei der Leistung.",
    },
    {
      icon: MailCheck,
      title: "Versand",
      text: "Der Versand der Dokumente ist enthalten, wo Dokumente verschickt werden. Die Abmeldung läuft digital – ohne Versand.",
    },
    {
      icon: ClipboardList,
      title: "Optionale Zusatzleistungen",
      text: `Kennzeichenschilder ${P.kennzeichen} pro Paar und Wunschkennzeichen-Service ${P.wunschkennzeichen} – nur, wenn Sie es wünschen.`,
    },
    {
      icon: UserCheck,
      title: "Sonderfälle",
      text: "Besonderheiten wie Sondergrößen oder auswärtige Behörden bestätigen wir individuell – immer vor dem Start.",
    },
  ],
  fussnote: priceDisclaimer,
  cta: { label: "Alle Preise und Preisrechner", href: "/preise/" },
} as const;

/* ───────────────────────── Datensicherheit ───────────────────────── */

export const sicherheit = {
  eyebrow: "Datensicherheit",
  title: "Ihre Unterlagen bleiben geschützt.",
  punkte: [
    { icon: Lock, text: "Verschlüsselte Übertragung" },
    { icon: Cookie, text: "Keine Tracking-Cookies" },
    { icon: UserCheck, text: "Persönliche Prüfung" },
    { icon: Trash2, text: "Löschung sensibler Kopien nach Abschluss im Rahmen der geltenden Vorgaben" },
    { icon: Server, text: "Hosting in Deutschland" },
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
  eyebrow: "Häufige Fragen",
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
      question: "Wer betreibt DeutscheZulassung?",
      answer: `DeutscheZulassung ist ein Angebot der ${site.company.legalName}, ${site.company.street}, ${site.company.zipCity} (${site.company.register}). Wir sind ein privater Zulassungsdienst und keine Behörde – über jede Zulassung entscheidet die zuständige Zulassungsbehörde.`,
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
