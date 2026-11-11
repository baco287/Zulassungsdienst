import type { FaqItem } from "./types";
import { P } from "./pricing";
import { KENNZEICHEN_HINWEIS, ZEIT } from "@/lib/betrieb";
import { site } from "@/lib/site";

/** Domain ohne Protokoll, z. B. "deutschezulassung.de". */
const DOMAIN = site.contact.email.split("@")[1];

export const faqItems: FaqItem[] = [
  {
    question: "Wie funktioniert die Online-Zulassung über DeutscheZulassung?",
    answer:
      `Sie wählen Ihre Leistung aus, übermitteln uns Ihre Unterlagen digital (Fotos oder Scans genügen) und erteilen uns eine Vollmacht. Wir prüfen alles, führen den Vorgang bei der zuständigen Zulassungsbehörde durch und senden Ihnen Kennzeichen und Papiere zu – bei Abmeldungen erhalten Sie die Bestätigung meist ${ZEIT.abmeldung} per E-Mail.`,
    category: "ablauf",
  },
  {
    question: "Brauche ich einen Personalausweis mit Online-Funktion (eID)?",
    answer:
      "Nein, die Online-Ausweisfunktion mit PIN, die AusweisApp oder ein Kartenleser sind bei uns nicht nötig. Damit wir den Antrag für Sie stellen dürfen, schreibt das Gesetz eine qualifiziert elektronisch signierte Vollmacht vor (§ 38 FZV). Dafür bestätigen Sie einmalig digital Ihre Identität mit Ihrem Ausweis und unterschreiben – den Link schicken wir Ihnen. Für eine Abmeldung ist das nicht nötig.",
    category: "dokumente",
  },
  {
    question: "Was kostet die Zulassung insgesamt?",
    answer:
      `Neuzulassung, Umschreibung oder Wiederzulassung kosten bei uns ${P.zulassung} – amtliche Gebühren und versicherter Versand sind bereits enthalten. Werden neue Kennzeichenschilder benötigt, kommen ${P.kennzeichen} pro Paar dazu; bei Kennzeichenmitnahme entfällt das. Die Abmeldung kostet ${P.abmeldung} inklusive Gebühren. Alle Preise verstehen sich inkl. MwSt. Keine versteckten Kosten; Sonderfälle weisen wir vor Beauftragung transparent aus.`,
    category: "preise",
  },
  {
    question: "Wie lange dauert eine Zulassung?",
    answer:
      `Die Bearbeitung Ihres Vorgangs dauert meist ${ZEIT.zulassung}, innerhalb unserer Servicezeiten (${site.contact.hours}). Über jeden Antrag entscheidet die zuständige Behörde; in Einzelfällen kann es deshalb länger dauern. Papiere und neue Kennzeichenschilder kommen per Post – die Schilder in der Regel in ${ZEIT.kennzeichenDativ}.`,
    category: "ablauf",
  },
  {
    question: "Wann kommen meine Kennzeichen?",
    answer:
      `${KENNZEICHEN_HINWEIS.text} ${KENNZEICHEN_HINWEIS.eilig} Behalten Sie Ihr bisheriges Kennzeichen, brauchen Sie keine neuen Schilder.`,
    category: "ablauf",
  },
  {
    question: "Wie und wann bezahle ich?",
    answer:
      "Mit Ihrer Festpreis-Bestätigung erhalten Sie unsere Rechnung. Sie zahlen bequem per Überweisung; erst nach Zahlungseingang reichen wir den Vorgang bei der Behörde ein bzw. versenden Kennzeichen und Dokumente. Weitere Zahlungsarten (z. B. PayPal) sind in Vorbereitung. Alle Preise inkl. MwSt.",
    category: "preise",
  },
  {
    question: "Ummeldung, Umschreibung, Halterwechsel – was ist der Unterschied?",
    answer:
      `Ummeldung: Sie sind umgezogen und das Fahrzeug bleibt auf Sie zugelassen. Halterwechsel (auch Umschreibung genannt): Das Fahrzeug wechselt den Besitzer, z. B. nach einem Gebrauchtwagenkauf. Adressänderung: Nur die Anschrift in den Papieren wird aktualisiert. Ummeldung und Halterwechsel kosten bei uns ${P.zulassung} komplett, die reine Adressänderung ${P.adressaenderung} – wählen Sie im Zweifel einfach eine Leistung aus, wir prüfen den passenden Vorgang für Sie.`,
    category: "allgemein",
  },
  {
    question: "In welchen Regionen ist DeutscheZulassung tätig?",
    answer:
      "Digitale Vorgänge wickeln wir deutschlandweit ab. Den persönlichen Abhol- und Bringservice bieten wir regional an – sprechen Sie uns einfach an.",
    category: "allgemein",
  },
  {
    question: "Was ist die eVB-Nummer und woher bekomme ich sie?",
    answer:
      "Die eVB-Nummer (elektronische Versicherungsbestätigung) ist der 7-stellige Nachweis Ihrer Kfz-Haftpflicht. Sie erhalten sie kostenlos von Ihrer Versicherung – meist sofort online oder telefonisch. Ohne eVB ist keine Zulassung möglich.",
    category: "dokumente",
  },
  {
    question: "Kann ich mein bisheriges Kennzeichen behalten?",
    answer:
      "Ja, in den meisten Fällen. Seit einigen Jahren können Kennzeichen bundesweit bei Umzug oder Halterwechsel mitgenommen werden. Wir prüfen das für Ihren Fall und beraten Sie, ob sich die Mitnahme lohnt.",
    category: "allgemein",
  },
  {
    question: "Wie übermittle ich meine Unterlagen sicher?",
    answer:
      "Über unser Auftragsformular oder – wenn Sie es bequemer mögen – per WhatsApp. Ihre Daten werden ausschließlich zur Auftragsabwicklung verwendet, verschlüsselt übertragen und nach Abschluss gemäß den gesetzlichen Fristen gelöscht. Details finden Sie in unserer Datenschutzerklärung.",
    category: "dokumente",
  },
  {
    question: "Was passiert, wenn die Behörde meinen Antrag ablehnt?",
    answer:
      "Das kommt selten vor – meist fehlt dann ein Dokument, das wir vorab mit Ihnen klären. Sollte ein Vorgang tatsächlich nicht durchführbar sein, berechnen wir Ihnen keinen Servicepreis – Sie tragen lediglich bereits verauslagte amtliche Gebühren.",
    category: "preise",
  },
  {
    question: "Bieten Sie Sonderkonditionen für Autohäuser und Händler?",
    answer:
      "Ja. Für gewerbliche Kunden mit regelmäßigem Volumen bieten wir Staffelpreise, Sammelabwicklung und feste Ansprechpartner. Fordern Sie einfach ein individuelles Angebot an.",
    category: "preise",
  },
  /* ───── Ergänzungen 11/2026: Fragen, die Kunden vor der Beauftragung typischerweise stellen ─────
     Antworten nur aus belegten Projektangaben (Servicebedingungen, Widerrufsbelehrung,
     config/betrieb.json). Offene Punkte (Haftung, Stornopauschale) stehen in
     docs/seo/OWNER-DECISIONS.md und werden hier bewusst nicht beantwortet. */
  {
    question: "Welche Unterlagen brauche ich?",
    answer:
      "Das hängt vom Vorgang ab. Für eine Zulassung sind es in der Regel die Zulassungsbescheinigung Teil I bzw. Teil II, die eVB-Nummer Ihrer Kfz-Versicherung, ein SEPA-Mandat für die Kfz-Steuer und ein Ausweisdokument. Für eine Abmeldung genügen die Zulassungsbescheinigung Teil I und beide Kennzeichen mit freigelegten Sicherheitscodes. Die genaue Liste sehen Sie im Auftragsassistenten, sobald Sie Ihre Leistung gewählt haben.",
    category: "dokumente",
  },
  {
    question: "Muss ich einen Termin vereinbaren oder persönlich zur Zulassungsstelle?",
    answer:
      "Nein. Sie buchen keinen Termin und müssen nicht persönlich erscheinen. Ihre Unterlagen reichen Sie als Foto oder Scan ein, den Antrag stellen wir mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde. Sollte Ihr Vorgang ausnahmsweise nicht auf diesem Weg möglich sein, sagen wir Ihnen das, bevor Sie etwas beauftragen.",
    category: "ablauf",
  },
  {
    question: "Wann beginnt die Bearbeitung meines Auftrags?",
    answer:
      "Sobald drei Dinge vorliegen: Ihre Bestätigung des Festpreises, der Zahlungseingang und die vollständigen, lesbaren Unterlagen – samt Vollmacht, wo sie nötig ist. Erst dann reichen wir den Vorgang bei der Behörde ein. Ab diesem Zeitpunkt gelten auch unsere Zeitangaben.",
    category: "ablauf",
  },
  {
    question: "Ab wann darf ich mit dem Fahrzeug fahren?",
    answer:
      `Erst wenn das Fahrzeug zugelassen ist und die Kennzeichenschilder montiert sind – die eVB-Nummer allein genügt nicht. Nach einer Online-Zulassung erhalten Sie von uns den vorläufigen Zulassungsnachweis. Mit ihm dürfen Sie im Inland bereits fahren, bis Plaketten und Papiere per Post bei Ihnen sind; wie lange er gilt, steht auf dem Nachweis selbst. ${KENNZEICHEN_HINWEIS.kurz} ${KENNZEICHEN_HINWEIS.eilig}`,
    category: "ablauf",
  },
  {
    question: "Kann ich den Auftrag am Smartphone erledigen?",
    answer:
      "Ja. Das Auftragsformular funktioniert auf dem Smartphone genauso wie am Computer. Ihre Unterlagen fotografieren Sie direkt mit der Kamera und laden die Bilder hoch – oder Sie schicken sie uns per WhatsApp.",
    category: "ablauf",
  },
  {
    question: "Was passiert, wenn Unterlagen oder Angaben fehlen?",
    answer:
      `Wir prüfen Ihre Unterlagen, bevor wir etwas bei der Behörde einreichen. Fehlt ein Dokument oder ist ein Foto nicht lesbar, melden wir uns bei Ihnen und sagen genau, was wir noch brauchen. Nachreichen können Sie über die Seite „Unterlagen hochladen“ oder per WhatsApp. Unsere Zeitangaben gelten ${ZEIT.bezug}.`,
    category: "dokumente",
  },
  {
    question: "Kann ich meinen Auftrag stornieren?",
    answer:
      "Ihre Anfrage ist kostenlos und unverbindlich – ein Auftrag entsteht erst, wenn Sie unsere Festpreis-Bestätigung annehmen. Danach haben Sie als Verbraucherin oder Verbraucher ein gesetzliches Widerrufsrecht von vierzehn Tagen. Haben wir auf Ihren Wunsch schon vor Ablauf dieser Frist begonnen, zahlen Sie nur den bis dahin erbrachten Teil; ist der Vorgang vollständig erledigt, kann das Widerrufsrecht vorzeitig erlöschen. Einzelheiten und ein Musterformular stehen in unserer Widerrufsbelehrung. Melden Sie sich am besten sofort, wenn sich bei Ihnen etwas ändert.",
    category: "preise",
  },
  {
    question: "Ich weiß nicht, welchen Vorgang ich brauche – was nun?",
    answer:
      "Kein Problem. Beschreiben Sie uns kurz Ihre Situation – etwa „umgezogen“, „Auto gekauft“ oder „Fahrzeug stilllegen“ – per WhatsApp, per E-Mail oder im Nachrichtenfeld des Auftragsformulars. Wir nennen Ihnen den passenden Vorgang und die nötigen Unterlagen, bevor Sie etwas beauftragen.",
    category: "allgemein",
  },
  {
    question: "Wann sind Sie erreichbar – auch am Wochenende?",
    answer:
      `Unsere Servicezeiten sind ${site.contact.hours}. Eine Anfrage können Sie jederzeit absenden, auch abends und am Wochenende – online oder per WhatsApp. Wir bearbeiten sie in unseren Servicezeiten. Die Zulassungsbehörden arbeiten an Werktagen; darauf beziehen sich auch unsere Zeitangaben.`,
    category: "allgemein",
  },
  {
    question: "Ist DeutscheZulassung eine Behörde?",
    answer:
      `Nein. DeutscheZulassung ist ein privater Zulassungsdienst der ${site.company.legalName}. Wir handeln in Ihrem Auftrag und mit Ihrer Vollmacht. Über jede Zulassung, Umschreibung oder Abmeldung entscheidet die zuständige Zulassungsbehörde.`,
    category: "allgemein",
  },
  {
    question: "Was ist der Unterschied zum i-Kfz-Portal der Zulassungsbehörde?",
    answer:
      "Im i-Kfz-Portal stellen Sie den Antrag selbst und zahlen nur die amtlichen Gebühren. Dafür müssen Sie sich elektronisch ausweisen – meist mit Online-Ausweisfunktion, PIN und AusweisApp – und alle Angaben selbst richtig eintragen. Bei uns geben Sie den Vorgang ab: Wir prüfen Ihre Unterlagen, stellen den Antrag mit Ihrer Vollmacht und beantworten Ihre Fragen, zum Festpreis. Wer das Portal sicher bedienen kann, kommt dort günstiger weg. Wer sich Zeit und Fehlversuche sparen möchte, ist bei uns richtig.",
    category: "allgemein",
  },
  {
    question: "Welche Fahrzeuge können Sie zulassen?",
    answer:
      "Pkw, Transporter, Anhänger und Krafträder laufen bei uns über denselben digitalen Ablauf. Bei einer Zulassung auf eine Firma benötigen wir zusätzlich den Handelsregisterauszug oder die Gewerbeanmeldung. Bei Importfahrzeugen oder anderen Besonderheiten fragen Sie am besten vorab kurz an – wir sagen Ihnen, ob und wie der Vorgang möglich ist.",
    category: "allgemein",
  },
  {
    question: "Woran erkenne ich echte Nachrichten von DeutscheZulassung?",
    answer:
      `Unsere Website erreichen Sie ausschließlich unter ${DOMAIN}. E-Mails kommen von Adressen mit der Endung @${DOMAIN}, WhatsApp-Nachrichten von der Nummer ${site.contact.phoneDisplay}. Jede Online-Anfrage erhält eine Referenz, die mit „DZ-“ beginnt. Rechnungen stellt die ${site.company.legalName} aus. Sind Sie unsicher, fragen Sie über die Kontaktdaten auf dieser Website nach, bevor Sie zahlen oder Unterlagen senden.`,
    category: "allgemein",
  },
];
