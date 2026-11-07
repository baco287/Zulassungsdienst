/**
 * Zentrales Datenobjekt der Startseite.
 *
 * Alle Texte, Reihenfolgen und Zuordnungen der Startseite liegen hier –
 * die Komponenten unter components/home/ rendern nur. Preise, Dauer und
 * der Kennzeichen-Zuschlag kommen NICHT von hier, sondern aus lib/services.ts
 * und lib/pricing.ts, damit es für Preise genau eine Quelle gibt.
 */

import {
  ArrowRightLeft,
  CalendarX2,
  CarFront,
  ClipboardList,
  Cookie,
  IdCard,
  Lock,
  MapPinHouse,
  PackageCheck,
  Repeat2,
  RotateCcw,
  Search,
  Server,
  Smartphone,
  Trash2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

/* ───────────────────────── Konfigurator ───────────────────────── */

export type VorgangSlug =
  | "neuzulassung"
  | "ummeldung"
  | "halterwechsel"
  | "wiederzulassung"
  | "abmeldung"
  | "adressaenderung";

export interface Vorgang {
  slug: VorgangSlug;
  label: string;
  /** Kurzbeschreibung in der Zusammenfassung. */
  description: string;
  /** Line-Icon in der Auswahlkachel. Die Neuzulassung zeigt stattdessen ein Kennzeichen. */
  icon?: LucideIcon;
  /** Abmeldung: Icon mit rotem Minus-Badge. */
  danger?: boolean;
}

export const vorgaenge: readonly Vorgang[] = [
  {
    slug: "neuzulassung",
    label: "Neuzulassung",
    description: "Erstmalige Zulassung eines Fahrzeugs auf Ihren Namen.",
  },
  {
    slug: "ummeldung",
    label: "Ummeldung",
    description: "Nach dem Umzug: Fahrzeug auf die neue Adresse ummelden, Kennzeichen auf Wunsch behalten.",
    icon: Repeat2,
  },
  {
    slug: "halterwechsel",
    label: "Halterwechsel",
    description: "Gebrauchtwagen gekauft? Wir schreiben das Fahrzeug auf Sie um.",
    icon: ArrowRightLeft,
  },
  {
    slug: "wiederzulassung",
    label: "Wiederzulassung",
    description: "Ein stillgelegtes Fahrzeug zurück auf die Straße bringen.",
    icon: RotateCcw,
  },
  {
    slug: "abmeldung",
    label: "Abmeldung",
    description: "Fahrzeug außer Betrieb setzen – meist noch am selben Werktag.",
    icon: CarFront,
    danger: true,
  },
  {
    slug: "adressaenderung",
    label: "Adressänderung",
    description: "Nur die Anschrift in den Fahrzeugpapieren aktualisieren.",
    icon: MapPinHouse,
  },
] as const;

/** Beispielkennzeichen für Kachel, Zusammenfassung und Dekoration. */
export const beispielKennzeichen = "AB · CD 123";

/** Zeitangabe in der Zusammenfassung – bewusst auf den Auftrag bezogen, nicht auf die Behörde. */
export const auftragsDauer = "Auftrag in 10 Minuten erteilt";

/* ───────────────────────── Prozess & Vertrauen ───────────────────────── */

export const prozessSchritte = [
  "Vorgang wählen",
  "Unterlagen senden",
  "Wir prüfen",
  "Fertig",
] as const;

export const vertrauenszeile = ["Bundesweit", "Festpreis vor Start", "Persönlich geprüft"] as const;

/* ───────────────────────── Story: ohne eID ───────────────────────── */

export const story = {
  eyebrow: "Zulassung ohne Online-Ausweis",
  title: "Keine eID? Kein Problem.",
  intro:
    "Bei vielen Behördenportalen benötigen Sie einen aktivierten Online-Ausweis, Ihre PIN, ein NFC-fähiges Smartphone und die AusweisApp. Bei DeutscheZulassung übernehmen wir den Zulassungsvorgang mit Ihrer Vollmacht. Für den Start genügen gut lesbare Fotos Ihrer Unterlagen.",
  cta: { label: "Mehr zur Zulassung ohne eID", href: "/kfz-zulassung-ohne-eid/" },
  hinweis:
    "DeutscheZulassung ist ein privater Zulassungsdienst und keine Behörde. Wir reichen Ihren Antrag mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde ein. Die endgültige Entscheidung trifft die Behörde.",
  vorteile: [
    {
      icon: IdCard,
      title: "Kein Online-Ausweis nötig",
      text: "Sie benötigen weder eine aktivierte eID noch die dazugehörige PIN.",
    },
    {
      icon: Smartphone,
      title: "Keine AusweisApp erforderlich",
      text: "Ein Smartphone mit Kamera oder ein Scanner genügt für die Übermittlung Ihrer Unterlagen.",
    },
    {
      icon: CalendarX2,
      title: "Kein Behördentermin",
      text: "Keine Terminsuche, keine Wartemarke und kein persönlicher Gang zur Zulassungsstelle.",
    },
  ],
} as const;

/* ───────────────────────── Vergleich ───────────────────────── */

export type Bewertung = "gut" | "neutral" | "schlecht";

export interface VergleichsZeile {
  kriterium: string;
  zulassungsstelle: { wert: string; bewertung: Bewertung };
  ikfz: { wert: string; bewertung: Bewertung };
  wir: { wert: string; bewertung: Bewertung };
}

export const vergleichSpalten = ["Zulassungsstelle", "i-Kfz selbst", "DeutscheZulassung"] as const;

export const vergleichHinweis =
  "Wenn Sie alle Voraussetzungen für i-Kfz erfüllen und den Vorgang selbst durchführen möchten, ist das Behördenportal häufig die günstigste Lösung. DeutscheZulassung ist für Menschen gedacht, die keine eID nutzen können oder den Behördenweg vollständig abgeben möchten.";

/* ───────────────────────── Ablauf ───────────────────────── */

export const ablauf = [
  {
    icon: ClipboardList,
    title: "Vorgang auswählen",
    text: "Wählen Sie die gewünschte Leistung und geben Sie Ihre Fahrzeugdaten ein.",
  },
  {
    icon: Search,
    title: "Unterlagen senden",
    text: "Für den Start genügen Fotos oder Scans Ihrer Unterlagen.",
  },
  {
    icon: UserCheck,
    title: "Wir prüfen und beantragen",
    text: "Unser Team prüft alles persönlich und reicht den Antrag bei der zuständigen Behörde ein.",
  },
  {
    icon: PackageCheck,
    title: "Fertig",
    text: "Papiere und gebuchte Kennzeichen werden versendet. Abmeldebestätigungen erhalten Sie digital.",
  },
] as const;

/* ───────────────────────── Datensicherheit ───────────────────────── */

export const sicherheit = {
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

/* ───────────────────────── Abschluss-CTA ───────────────────────── */

export const abschluss = {
  title: "Bereit? Wir übernehmen den Behördenkram.",
  text: "Starten Sie den Auftrag online oder schreiben Sie uns bei Fragen per WhatsApp.",
  primary: { label: "Auftrag starten", href: "/auftrag/" },
  secondary: { label: "Per WhatsApp fragen" },
} as const;
