import type { ContentSection, QA } from "./serviceContent";
import { P, euroRange, officialFees } from "./pricing";
import { ZEIT } from "@/lib/betrieb";

/**
 * Themen-Landingpages auf oberster URL-Ebene (z. B. /kfz-zulassung-ohne-eid/).
 *
 * Jede Seite bedient genau EINEN Suchintent. Vor dem Anlegen einer neuen Seite
 * prüfen, ob ein Ratgeber, eine Leistungsseite oder eine bestehende
 * Landingpage denselben Intent bereits abdeckt – dann diese erweitern statt
 * ein Duplikat anzulegen. Doppelte Intents werden per 301 umgeleitet
 * (public/.htaccess, Abschnitt "Themen-Weiterleitungen").
 *
 * Preise nie als Zahl eintragen, immer über `P` aus lib/pricing.ts.
 */

export interface LandingStep {
  title: string;
  text: string;
}

export interface LandingPage {
  /** URL-Pfad ohne Schrägstriche, z. B. "kfz-zulassung-ohne-eid". */
  slug: string;
  /** Kurzer Name für Listen und Verlinkungen. */
  navTitle: string;
  /** <title> ohne Markenzusatz (der kommt per Template). Max. ca. 55 Zeichen. */
  metaTitle: string;
  /** Sichtbare H1. */
  h1: string;
  /** Meta-Description, 140–160 Zeichen. */
  description: string;
  /** Einleitende Absätze direkt unter der H1. */
  intro: string[];
  /** ISO-Datum der letzten inhaltlichen Prüfung (wird sichtbar angezeigt). */
  updated: string;
  /** Leistung, die der Haupt-Button vorauswählt (Slug aus lib/services.ts). */
  primaryService?: string;
  /** Beschriftung des Haupt-Buttons. */
  ctaLabel: string;
  /** Dokumenten-Checkliste. */
  /** photoHint: Hinweis „Für den Start genügen Handyfotos“ anzeigen (nur bei Unterlagen für DeutscheZulassung). */
  checklist?: { title: string; items: string[]; photoHint?: boolean };
  /** Schritt-für-Schritt-Erklärung. */
  steps?: { title: string; items: LandingStep[] };
  sections: ContentSection[];
  faq: QA[];
  relatedServices: string[];
  relatedGuides: string[];
  relatedLanding: string[];
  /** Offizielle Quellen (KBA, BMDV, Gesetze). */
  sources?: { label: string; href: string }[];
  keywords: string[];
}

/**
 * Geprüfte offizielle Quellen (Stand der Prüfung: 03.11.2026).
 * Nur URLs eintragen, deren Inhalt tatsächlich gegengelesen wurde.
 */
const Q = {
  bmv: {
    label: "Bundesministerium für Verkehr: Internetbasierte Fahrzeugzulassung (i-Kfz)",
    href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/internetbasierte-fahrzeugzulassung.html",
  },
  kba: {
    label: "Kraftfahrt-Bundesamt: Internetbasierte Fahrzeugzulassung – i-Kfz",
    href: "https://www.kba.de/DE/Themen/ZentraleRegister/Digitale_Fahrzeugzulassung/iKfz/ikfz_node.html",
  },
  ausweisVoraussetzungen: {
    label: "AusweisApp des Bundes: Das brauchen Sie",
    href: "https://www.ausweisapp.bund.de/das-brauchen-sie",
  },
  ausweisFaq: {
    label: "AusweisApp des Bundes: FAQ für Nutzende (PIN, PUK, NFC)",
    href: "https://www.ausweisapp.bund.de/faq-fuer-nutzende",
  },
  hamburg: {
    label: "Landesbetrieb Verkehr Hamburg: FAQ Fahrzeugzulassung online",
    href: "https://www.hamburg.de/verkehr/lbv/faq/fahrzeugzulassung-online",
  },
  fzv15: {
    label: "§ 15 FZV – Mitteilungspflichten bei Änderungen",
    href: "https://www.gesetze-im-internet.de/fzv_2023/__15.html",
  },
  fzv21: {
    label: "§ 21 FZV – Sicherheitscodes",
    href: "https://www.gesetze-im-internet.de/fzv_2023/__21.html",
  },
  fzv24: {
    label: "§ 24 FZV – Antrag auf Außerbetriebsetzung (internetbasiert)",
    href: "https://www.gesetze-im-internet.de/fzv_2023/__24.html",
  },
  fzv26: {
    label: "§ 26 FZV – Gemeinsame Regelungen für internetbasierte Zulassung",
    href: "https://www.gesetze-im-internet.de/fzv_2023/__26.html",
  },
  vwvfg14: {
    label: "§ 14 VwVfG – Bevollmächtigte und Beistände",
    href: "https://www.gesetze-im-internet.de/vwvfg/__14.html",
  },
  ddg5: {
    label: "§ 5 DDG – Allgemeine Informationspflichten (Impressum)",
    href: "https://www.gesetze-im-internet.de/ddg/__5.html",
  },
};

const FZV_INDEX = "https://www.gesetze-im-internet.de/fzv_2023/";

export const landingPages: LandingPage[] = [
  /* ───────────────────────── 1. Zulassung ohne eID ───────────────────────── */
  {
    slug: "kfz-zulassung-ohne-eid",
    navTitle: "Kfz-Zulassung ohne eID",
    metaTitle: "Kfz-Zulassung online ohne eID und AusweisApp",
    h1: "Kfz-Zulassung online ohne eID – so geht es",
    description:
      "Auto online zulassen ohne eID, PIN oder AusweisApp: welche Wege es gibt, welche Unterlagen Sie brauchen und wann sich ein Zulassungsdienst wirklich lohnt.",
    intro: [
      "Wer sein Auto über das i-Kfz-Portal der Zulassungsbehörde selbst zulassen möchte, muss sich elektronisch ausweisen – meist mit dem Personalausweis mit Online-Ausweisfunktion, der sechsstelligen PIN und der AusweisApp auf einem NFC-fähigen Smartphone. Fehlt einer dieser Bausteine, endet der Online-Weg oft schon bei der Anmeldung im Portal.",
      "Zulassen können Sie Ihr Fahrzeug trotzdem, ohne eID und ohne Behördentermin. Hier erfahren Sie, welche Wege es gibt, was sie kosten und in welchen Fällen Sie mit i-Kfz selbst günstiger fahren.",
    ],
    updated: "2026-11-03",
    primaryService: "neuzulassung",
    ctaLabel: "Zulassung ohne eID beauftragen",
    checklist: {
      photoHint: true,
      title: "Diese Unterlagen brauchen wir – für den Start genügen Handyfotos",
      items: [
        "Personalausweis oder Reisepass der künftigen Halterin bzw. des künftigen Halters",
        "Zulassungsbescheinigung Teil II (Fahrzeugbrief) oder CoC-Papier",
        "Bei Gebrauchtwagen: Zulassungsbescheinigung Teil I und Nachweis der gültigen HU",
        "eVB-Nummer Ihrer Kfz-Versicherung",
        "Kontoverbindung für das SEPA-Mandat zur Kfz-Steuer",
        "Vollmacht (stellen wir Ihnen digital bereit)",
      ],
    },
    steps: {
      title: "So läuft die Zulassung ohne eID bei DeutscheZulassung",
      items: [
        {
          title: "Unterlagen fotografieren",
          text: "Fotografieren Sie Ausweis, Fahrzeugpapiere und eVB-Nachweis mit dem Handy. Kartenleser, PIN oder AusweisApp brauchen Sie nicht.",
        },
        {
          title: "Auftrag senden",
          text: "Sie beauftragen über das Online-Formular – auf Wunsch gleich mit den Fotos – oder per WhatsApp bzw. E-Mail und erhalten vorab eine verbindliche Festpreis-Bestätigung.",
        },
        {
          title: "Vollmacht erteilen",
          text: "Mit Ihrer Vollmacht reicht DeutscheZulassung den Antrag bei der zuständigen Zulassungsbehörde ein. Fehlt etwas, fragt Ihre feste Ansprechperson nach.",
        },
        {
          title: "Papiere und Kennzeichen erhalten",
          text: `In der Regel ${ZEIT.zulassung} nach Eingang der vollständigen Unterlagen geht alles in den Versand. Geprägte Kennzeichenschilder liefern wir auf Wunsch mit.`,
        },
      ],
    },
    sections: [
      {
        heading: "Was i-Kfz für die Online-Zulassung voraussetzt",
        paragraphs: [
          "Laut Bundesministerium für Verkehr (BMV) identifizieren sich Privatpersonen im i-Kfz-Portal mit Personalausweis, eID-Karte oder elektronischem Aufenthaltstitel. Die Online-Ausweisfunktion muss freigeschaltet sein, dazu kommen die sechsstellige PIN und ein Smartphone mit AusweisApp oder ein Kartenlesegerät. Als Alternative nennt das Ministerium die BundID mit ELSTER-Zertifikat.",
          "Die Identifizierung ist aber nur eine Hürde. Für Neuzulassung, Wiederzulassung und Umschreibung mit Halterwechsel verlangt das Portal den Sicherheitscode der Zulassungsbescheinigung Teil II. Den haben nach Angaben des BMV nur Fahrzeugbriefe, die nach dem 01.01.2018 ausgestellt wurden. Hinzu kommen eVB-Nummer, Bankverbindung für die Kfz-Steuer und die Bezahlung der Gebühr über das ePayment der Behörde.",
        ],
      },
      {
        heading: "Drei Wege, wenn die eID fehlt",
        paragraphs: ["Ohne funktionierenden Online-Ausweis haben Sie im Wesentlichen drei Möglichkeiten:"],
        list: [
          "Online-Ausweis einsatzbereit machen: Bei Personalausweisen, die nach Juli 2017 ausgestellt wurden, ist die Funktion laut AusweisApp-Portal automatisch aktiv. Ist die PIN vergessen, setzt die zuständige Ausweisbehörde eine neue – das bedeutet allerdings einen Besuch vor Ort.",
          `Zulassungsstelle vor Ort: Sie legen die Unterlagen persönlich vor und zahlen die amtliche Gebühr für den Schaltervorgang (${euroRange(officialFees.counterRegistration)}) plus Kennzeichen. Je nach Behörde brauchen Sie dafür einen Termin.`,
          "Zulassungsdienst: Sie erteilen eine Vollmacht, der Dienst stellt den Antrag bei der Behörde. Eine eID brauchen Sie dafür nicht.",
        ],
      },
      {
        heading: "Wann i-Kfz günstiger ist – und wann sich der Service lohnt",
        paragraphs: [
          `Ehrlich gesagt: Ist Ihr Ausweis freigeschaltet, kennen Sie Ihre PIN und tragen Ihre Papiere die nötigen Sicherheitscodes, ist i-Kfz der günstigste Weg. Sie zahlen nur die amtliche Gebühr für den Onlinevorgang (${euroRange(officialFees.onlineRegistration)}) und die Kennzeichenschilder. Gelingt der Antrag, darf das Fahrzeug nach Angaben des BMV sofort in Betrieb genommen werden.`,
          `Bei DeutscheZulassung kostet eine Zulassung ${P.zulassung}, amtliche Gebühren und Versand sind enthalten. Geprägte Kennzeichen liefern wir auf Wunsch für ${P.kennzeichen} pro Paar. Das lohnt sich vor allem, wenn eine Voraussetzung fehlt und der Ersatzweg einen Behördentermin oder einen Gang zur Ausweisbehörde bedeuten würde – oder wenn Sie den Vorgang einfach abgeben möchten.`,
        ],
      },
      {
        heading: "Für welche Vorgänge der Weg ohne eID funktioniert",
        paragraphs: [
          "Über DeutscheZulassung erledigen Sie Neuzulassung, Halterwechsel, Ummeldung nach Umzug und Wiederzulassung ohne eigene eID. Auch Importfahrzeuge und Firmenfahrzeuge sind möglich; hier klären wir vorab, welche zusätzlichen Nachweise die Behörde verlangt.",
          "Bei der Abmeldung stellt sich die eID-Frage gar nicht: Laut Kraftfahrt-Bundesamt funktioniert die Online-Abmeldung ohne Identifikation, entscheidend sind die Sicherheitscodes von Fahrzeugschein und Kennzeichen. Details dazu finden Sie auf unserer Seite zur Abmeldung ohne eID.",
        ],
      },
      {
        heading: "Wer über Ihre Zulassung entscheidet",
        paragraphs: [
          "DeutscheZulassung ist ein privater Dienstleister und keine Behörde – ein Angebot der Volt Gas UG (haftungsbeschränkt) aus Berlin, bundesweit tätig. Wir bereiten Ihren Antrag vor und reichen ihn ein. Die Entscheidung über die Zulassung trifft immer die zuständige Zulassungsbehörde.",
          `Deshalb versprechen wir keine Zulassung in Minuten, sondern nennen eine realistische Dauer: in der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen, zuzüglich Versand. Erreichbar sind wir Mo–Fr von 8:00 bis 18:00 Uhr per WhatsApp, Telefon und E-Mail.`,
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich mein Auto ohne Online-Ausweisfunktion online zulassen?",
        answer:
          "Im i-Kfz-Portal nur, wenn Sie sich auf anderem Weg identifizieren können – das BMV nennt die BundID mit ELSTER-Zertifikat. Andernfalls bleiben die Zulassungsstelle vor Ort oder ein Zulassungsdienst, der den Antrag mit Ihrer Vollmacht stellt.",
      },
      {
        question: "Brauche ich ein Smartphone mit NFC?",
        answer:
          "Für die Beauftragung von DeutscheZulassung nicht. Ein Foto Ihrer Unterlagen genügt; das Online-Formular funktioniert mit jedem Smartphone oder Computer, alternativ schreiben Sie uns per WhatsApp oder E-Mail.",
      },
      {
        question: "Was kostet die Zulassung ohne eID?",
        answer: `Bei DeutscheZulassung ${P.zulassung} inklusive amtlicher Gebühren und Versand. Geprägte Kennzeichenschilder kosten auf Wunsch ${P.kennzeichen} pro Paar. Sie können die Schilder auch selbst beim Schildermacher prägen lassen oder Ihr bisheriges Kennzeichen behalten, wenn der Vorgang das zulässt.`,
      },
      {
        question: "Ich habe meine PIN vergessen – was nun?",
        answer:
          "Eine neue PIN setzt laut AusweisApp-Hilfe Ihre zuständige Ausweisbehörde. Wenn Sie darauf nicht warten möchten, kann ein Zulassungsdienst die Zulassung ohne eID für Sie beantragen.",
      },
      {
        question: "Wie lange dauert die Zulassung über DeutscheZulassung?",
        answer:
          `In der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen, zuzüglich Versand. Einen festen Zeitpunkt kann niemand garantieren, weil die Behörde über den Antrag entscheidet.`,
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "wiederzulassung", "ummeldung"],
    relatedGuides: [
      "i-kfz-online-zulassung",
      "auto-anmelden-unterlagen",
      "kein-termin-zulassungsstelle",
      "was-kostet-eine-kfz-zulassung",
    ],
    relatedLanding: [
      "auto-abmelden-ohne-eid",
      "ikfz-funktioniert-nicht",
      "auto-online-anmelden",
      "zulassungsdienst-online",
    ],
    sources: [Q.bmv, Q.kba, Q.ausweisVoraussetzungen, Q.ausweisFaq],
    keywords: [
      "Kfz-Zulassung ohne eID",
      "Auto online zulassen ohne eID",
      "Zulassung ohne AusweisApp",
      "Auto anmelden ohne Online-Ausweis",
      "Kfz-Zulassung ohne PIN",
    ],
  },

  /* ───────────────────────── 2. Abmelden ohne eID ───────────────────────── */
  {
    slug: "auto-abmelden-ohne-eid",
    navTitle: "Auto abmelden ohne eID",
    metaTitle: "Auto online abmelden ohne eID und Ausweis-App",
    h1: "Auto online abmelden ohne eID",
    description:
      "Auto online abmelden ohne eID: warum die Abmeldung ohne Ausweis-Funktion geht, welche Sicherheitscodes Sie brauchen und wann sich ein Abmeldeservice lohnt.",
    intro: [
      "Vorweg die gute Nachricht: Für die Abmeldung brauchen Sie keine Online-Ausweisfunktion. Bei der internetbasierten Außerbetriebsetzung verzichtet die Behörde auf die Identifizierung, wenn Sie die Sicherheitscodes des Fahrzeugscheins und der Stempelplaketten eingeben. So regelt es § 24 Abs. 4 der Fahrzeug-Zulassungsverordnung (FZV).",
      "Entscheidend sind also nicht Ausweis und PIN, sondern Ihre Papiere und Kennzeichen. Hier lesen Sie, wann Sie selbst online abmelden können, wann das nicht klappt und wann es bequemer ist, die Abmeldung abzugeben.",
    ],
    updated: "2026-11-03",
    primaryService: "abmeldung",
    ctaLabel: "Abmeldung beauftragen",
    checklist: {
      photoHint: true,
      title: "Das brauchen Sie für die Abmeldung",
      items: [
        "Zulassungsbescheinigung Teil I (Fahrzeugschein) mit freigelegtem Sicherheitscode",
        "Beide Kennzeichen mit freigelegten Sicherheitscodes der Stempelplaketten",
        "Bei Verschrottung: Verwertungsnachweis des Demontagebetriebs; Fahrzeugschein und -brief gehen danach im Original an die Zulassungsbehörde",
        "Falls gewünscht: Hinweis, dass das Kennzeichen reserviert werden soll",
      ],
    },
    steps: {
      title: "So melden Sie über DeutscheZulassung ab",
      items: [
        {
          title: "Fahrzeug abstellen",
          text: "Stellen Sie das Fahrzeug auf privatem Grund ab, bevor Sie die Codes freilegen. Danach darf es nicht mehr gefahren werden.",
        },
        {
          title: "Codes freilegen und fotografieren",
          text: "Legen Sie den Code auf dem Fahrzeugschein und auf beiden Plaketten frei und fotografieren Sie alles gut lesbar.",
        },
        {
          title: "Auftrag senden",
          text: "Sie beauftragen über das Online-Formular oder per WhatsApp bzw. E-Mail und erhalten vorab eine verbindliche Festpreis-Bestätigung. Eine eID oder einen Termin brauchen Sie nicht.",
        },
        {
          title: "Bestätigung erhalten",
          text: `Wir reichen die Abmeldung bei der zuständigen Zulassungsbehörde ein, meist noch ${ZEIT.abmeldung}, und senden Ihnen die Abmeldebestätigung zu.`,
        },
      ],
    },
    sections: [
      {
        heading: "Abmelden über i-Kfz: ohne Ausweis, aber mit Sicherheitscodes",
        paragraphs: [
          "Für die Online-Abmeldung geben Sie im Portal Ihrer Zulassungsbehörde das Kennzeichen, den Sicherheitscode der Zulassungsbescheinigung Teil I und die Codes beider Stempelplaketten ein. Das Kraftfahrt-Bundesamt weist ausdrücklich darauf hin, dass die Abmeldung ohne Identifikation und ohne HU-Nachweis funktioniert.",
          "Voraussetzung ist, dass Ihre Dokumente diese Codes überhaupt tragen. Nach Angaben des BMV ist das für die Abmeldung der Fall, wenn das Fahrzeug zuletzt nach dem 01.01.2015 angemeldet wurde. Liegt die letzte Anmeldung davor, fehlen die Codes, und eine Online-Abmeldung ist nicht möglich.",
        ],
      },
      {
        heading: "Vorsicht beim Freilegen der Codes",
        paragraphs: [
          "Mit dem Freilegen entwerten Sie die Dokumente: Auf dem Fahrzeugschein wird der Schriftzug „Dokument nicht mehr gültig“ sichtbar, und ein Kennzeichen mit sichtbarem Plakettencode gilt als ungestempelt (§ 21 FZV). Legen Sie die Codes deshalb erst frei, wenn das Fahrzeug abgestellt ist und die Abmeldung wirklich erfolgen soll.",
          "Werfen Sie den entwerteten Fahrzeugschein nicht weg. Das BMV weist darauf hin, dass er für eine spätere Wiederzulassung wieder gebraucht wird. Ist ein Code beim Freirubbeln beschädigt worden, ist das Dokument ungültig – dann hilft nur die Zulassungsbehörde weiter.",
        ],
      },
      {
        heading: "Selbst abmelden oder abmelden lassen?",
        paragraphs: [
          "Beide Wege kommen ohne eID aus. Tragen Ihre Papiere die Codes und funktioniert das Portal Ihrer Behörde, ist die Selbst-Abmeldung über i-Kfz die günstigste Lösung – dafür brauchen Sie keinen Dienstleister.",
          "Unser Service lohnt sich, wenn Sie sich nicht durch das Behördenportal klicken möchten, Fragen zu Verwertungsnachweis oder Kennzeichenreservierung haben oder eine feste Ansprechperson bevorzugen. Der Vergleich im Überblick:",
        ],
        table: {
          headers: ["", "i-Kfz selbst", "Über DeutscheZulassung"],
          rows: [
            ["eID / AusweisApp", "nicht nötig", "nicht nötig"],
            ["Sicherheitscodes", "im Portal eingeben", "Foto der freigelegten Codes senden"],
            ["Kosten", `amtliche Gebühr online, ${euroRange(officialFees.deregistrationOnline)}`, `${P.abmeldung} inkl. amtlicher Gebühren`],
            ["Beauftragung", "im Portal Ihrer Zulassungsbehörde", "Online-Formular, WhatsApp oder E-Mail"],
            ["Dauer", "automatisierte Entscheidung, wenn alle Angaben passen", `meist ${ZEIT.abmeldung}`],
            ["Wenn etwas hakt", "Zulassungsbehörde kontaktieren", "feste Ansprechperson, Mo–Fr 8–18 Uhr"],
          ],
        },
      },
      {
        heading: "Wenn die Online-Abmeldung nicht klappt",
        paragraphs: [
          "In den folgenden Fällen stößt die Online-Abmeldung an Grenzen, und der Weg führt meist über die Zulassungsbehörde. Schildern Sie uns Ihre Situation: Wir sagen Ihnen offen, ob wir die Abmeldung übernehmen können oder ob Sie besser direkt zur Behörde gehen.",
        ],
        list: [
          "Fahrzeugschein oder Plaketten ohne Sicherheitscode, weil die letzte Anmeldung vor 2015 lag",
          "Code beim Freilegen beschädigt",
          "Kennzeichen gestohlen oder verloren",
          "Ihre Zulassungsbehörde bietet i-Kfz nicht an oder das Portal ist gestört",
        ],
      },
      {
        heading: "Sonderfälle: Verschrottung und Kennzeichenreservierung",
        paragraphs: [
          "Wird das Fahrzeug verwertet, erfasst das Portal zusätzlich das Ausstellungsdatum des Verwertungsnachweises und die Betriebsnummer des Demontagebetriebs. Außerdem wird der Sicherheitscode der Zulassungsbescheinigung Teil II abgefragt, und Fahrzeugschein und -brief sind anschließend unverzüglich an die Zulassungsbehörde zu schicken (§ 24 Abs. 3 FZV).",
          "Möchten Sie Ihr Kennzeichen für ein späteres Fahrzeug behalten, lässt es sich bei der Abmeldung reservieren – auch im Online-Verfahren ist das vorgesehen (§ 24 Abs. 1 FZV). Geben Sie diesen Wunsch bei der Beauftragung einfach mit an.",
        ],
      },
    ],
    faq: [
      {
        question: "Brauche ich für die Online-Abmeldung einen Personalausweis mit eID?",
        answer:
          "Nein. Auf die Identifizierung wird verzichtet, wenn die Sicherheitscodes von Fahrzeugschein und Stempelplaketten eingegeben werden (§ 24 Abs. 4 FZV). Auch für die Abmeldung über DeutscheZulassung brauchen Sie keine eID.",
      },
      {
        question: "Was kostet die Abmeldung ohne eID?",
        answer: `Selbst über i-Kfz zahlen Sie nur die amtliche Gebühr für die Online-Abmeldung, je nach Behörde ${euroRange(officialFees.deregistrationOnline)}. Über DeutscheZulassung kostet die Abmeldung ${P.abmeldung} inklusive amtlicher Gebühren.`,
      },
      {
        question: "Wie schnell ist das Auto abgemeldet?",
        answer:
          `Über DeutscheZulassung meist ${ZEIT.abmeldung}, sofern die Codes vollständig und lesbar sind. Im i-Kfz-Portal entscheidet das System automatisiert, wenn alle Angaben passen.`,
      },
      {
        question: "Kann ich ein Auto online abmelden, das vor 2015 zuletzt angemeldet wurde?",
        answer:
          "In der Regel nicht, weil Fahrzeugschein und Plaketten dann keine Sicherheitscodes tragen. Die Abmeldung läuft in diesem Fall über die Zulassungsbehörde.",
      },
      {
        question: "Darf ich nach dem Freilegen der Codes noch fahren?",
        answer:
          "Nein. Ein Kennzeichen mit sichtbarem Plakettencode gilt als ungestempelt. Legen Sie die Codes deshalb erst frei, wenn das Fahrzeug auf privatem Grund steht.",
      },
    ],
    relatedServices: ["abmeldung", "wiederzulassung", "ersatz-dokumente"],
    relatedGuides: ["auto-abmelden-so-gehts", "i-kfz-online-zulassung", "kfz-zulassung-glossar"],
    relatedLanding: ["kfz-zulassung-ohne-eid", "ikfz-funktioniert-nicht", "ikfz-fehlermeldung"],
    sources: [Q.fzv24, Q.fzv21, Q.kba, Q.bmv],
    keywords: [
      "Auto abmelden ohne eID",
      "Auto online abmelden ohne Ausweis",
      "Abmeldung ohne AusweisApp",
      "Kfz abmelden ohne Online-Ausweis",
      "Online-Abmeldung Sicherheitscode",
    ],
  },

  /* ───────────────────────── 3. i-Kfz funktioniert nicht ───────────────────────── */
  {
    slug: "ikfz-funktioniert-nicht",
    navTitle: "i-Kfz funktioniert nicht",
    metaTitle: "i-Kfz funktioniert nicht? Ursachen und Lösungen",
    h1: "i-Kfz funktioniert nicht – Ursachen finden und lösen",
    description:
      "i-Kfz funktioniert nicht? Die häufigsten Ursachen – von Ausweis, PIN und NFC über alte Papiere bis zu Import und Firmenauto – und was Sie selbst prüfen können.",
    intro: [
      "Die Online-Zulassung soll den Gang zur Behörde ersparen. In der Praxis scheitert sie oft an einer einzigen Voraussetzung: am Ausweis, an den Fahrzeugpapieren, am Vorgang selbst oder am Portal der zuständigen Behörde.",
      "Diese Seite hilft Ihnen, die Ursache einzugrenzen und zu entscheiden, ob sich ein neuer Versuch lohnt. Steht eine konkrete Meldung auf Ihrem Bildschirm, schlagen Sie deren Bedeutung auf unserer Seite zu i-Kfz-Fehlermeldungen nach.",
    ],
    updated: "2026-11-03",
    primaryService: "neuzulassung",
    ctaLabel: "Zulassung ohne i-Kfz beauftragen",
    checklist: {
      title: "Vor dem nächsten Versuch prüfen",
      items: [
        "Online-Ausweisfunktion aktiv? Die AusweisApp zeigt es unter „Gerät und Ausweis prüfen“",
        "Selbst gewählte sechsstellige PIN bekannt – nicht die fünfstellige Einmal-PIN aus dem PIN-Brief",
        "Smartphone mit NFC, Schutzhülle entfernt",
        "Fahrzeugschein mit Sicherheitscode; für Neuzulassung, Wiederzulassung oder Halterwechsel auch ein Fahrzeugbrief mit Code",
        "Gültige eVB-Nummer und gültige HU",
        "Keine offenen Kfz-Steuer- oder Gebührenrückstände",
        "Ein Zahlungsmittel, das Ihre Behörde annimmt, und ein Drucker",
      ],
    },
    steps: {
      title: "So gehen Sie vor",
      items: [
        {
          title: "Ursache eingrenzen",
          text: "Notieren Sie, an welcher Stelle der Vorgang stoppt: beim Ausweisen, bei der Eingabe der Fahrzeugdaten, bei der Bezahlung oder schon beim Aufruf des Portals.",
        },
        {
          title: "Behebbares beheben",
          text: "Hülle ab, PIN prüfen, Code genau abtippen – solche Kleinigkeiten lassen sich sofort lösen. Dann lohnt ein zweiter Versuch.",
        },
        {
          title: "Weg wechseln",
          text: "Braucht die Lösung einen Behördentermin oder neue Papiere, oder ist Ihr Vorgang online gar nicht vorgesehen, wählen Sie die Zulassungsstelle oder einen Zulassungsdienst.",
        },
      ],
    },
    sections: [
      {
        heading: "Ursache 1: Ausweis, PIN und Smartphone",
        paragraphs: [
          "Häufig hakt es schon bei der Identifizierung. Die fünfstellige Einmal-PIN, früher Transport-PIN genannt, muss vor dem ersten Einsatz durch eine selbst gewählte sechsstellige PIN ersetzt werden. Nach drei Fehleingaben ist die PIN gesperrt; entsperren lässt sie sich mit der zehnstelligen PUK aus dem PIN-Brief. Eine vergessene PIN setzt die zuständige Ausweisbehörde neu.",
          "Liest das Smartphone den Ausweis nicht, empfiehlt die AusweisApp-Hilfe unter anderem, die Schutzhülle zu entfernen, den Ausweis ruhig an die NFC-Schnittstelle zu halten und zu prüfen, ob das Gerät geeignet ist. Manche Smartphones senden zu schwache NFC-Signale – dann hilft ein USB-Kartenleser oder ein anderes Smartphone als Kartenleser.",
        ],
      },
      {
        heading: "Ursache 2: Fahrzeugpapiere zu alt oder Code beschädigt",
        paragraphs: [
          "Den Besitz der Papiere weist das Portal über verdeckte Sicherheitscodes nach. Laut BMV tragen Fahrzeugscheine und Plaketten diese Codes, wenn sie nach dem 01.01.2015 ausgestellt wurden, Fahrzeugbriefe erst nach dem 01.01.2018. Für Neuzulassung, Wiederzulassung und Halterwechsel braucht es den Code des Fahrzeugbriefs – ein älterer Brief schließt den Online-Weg also aus.",
          "Ist ein Code beim Freilegen beschädigt worden, wird das Dokument ungültig. Das lässt sich nicht im Portal lösen, sondern nur über die Zulassungsbehörde.",
        ],
      },
      {
        heading: "Ursache 3: Der Vorgang ist online nicht vorgesehen",
        paragraphs: [
          "Manche Fälle schließt das Verfahren grundsätzlich aus. Nach § 26 Abs. 1 FZV ist ein Online-Antrag zum Beispiel nur möglich, wenn sich die Fahrzeugdaten gegenüber den bisher erfassten Daten nicht geändert haben. Der Landesbetrieb Verkehr Hamburg nennt für sein Portal unter anderem diese Ausschlüsse:",
        ],
        list: [
          "Sonderkennzeichen wie Kurzzeit-, Ausfuhr- oder Wechselkennzeichen",
          "technische Änderungen am Fahrzeug",
          "Gebühren- oder Steuerrückstände des Halters",
          "Vorgänge per Vollmacht",
        ],
      },
      {
        heading: "Sonderfälle: Importfahrzeug und Firmenauto",
        paragraphs: [
          "Bei Importfahrzeugen fehlt in der Regel eine deutsche Zulassungsbescheinigung Teil II mit Sicherheitscode – und damit eine Voraussetzung für den Online-Antrag nach § 26 FZV. Importe laufen deshalb meist über die Zulassungsstelle oder einen Zulassungsdienst.",
          "Ist eine Firma oder eine beruflich selbstständige Person Halter, erfolgt die Identifizierung nach § 20 Abs. 3 FZV über ein Organisationskonto, etwa das Unternehmenskonto mit ELSTER-Zertifikat. Der private Online-Ausweis genügt dann nicht.",
        ],
      },
      {
        heading: "Ursache 4: Das Portal Ihrer Behörde",
        paragraphs: [
          "i-Kfz ist kein einheitliches Bundesportal. Nach Angaben des BMV stellen die Zulassungsbehörden der Länder und Kommunen die Portale bereit; Ablauf und Zahlungsarten unterscheiden sich. Ein Dashboard des BMV zeigt, wo das Verfahren schon eingeführt ist.",
          "Bei Wartung oder Störung hilft oft nur ein späterer Versuch. Bleibt ein Schritt dauerhaft erfolglos, ist die zuständige Zulassungsbehörde Ihr Ansprechpartner.",
        ],
      },
      {
        heading: "Wann ein Zulassungsdienst die bessere Lösung ist",
        paragraphs: [
          "Lässt sich die Ursache in wenigen Minuten beheben, lohnt ein zweiter Versuch – i-Kfz bleibt der günstigste Weg. Braucht die Lösung dagegen einen Termin bei der Ausweisbehörde, neue Papiere oder ist Ihr Vorgang online nicht vorgesehen, kann ein Zulassungsdienst den Antrag für Sie stellen.",
          `Bei DeutscheZulassung beauftragen Sie über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung; eine eID brauchen Sie nicht. Eine Zulassung kostet ${P.zulassung} inklusive amtlicher Gebühren und Versand und dauert in der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen, zuzüglich Versand. Offene Steuer- oder Gebührenrückstände klärt allerdings auch ein Dienst nicht für Sie.`,
        ],
      },
    ],
    faq: [
      {
        question: "Warum bricht i-Kfz schon bei der Anmeldung im Portal ab?",
        answer:
          "Meist hakt es an der Identifizierung: Online-Ausweisfunktion nicht aktiv, PIN unbekannt oder gesperrt, oder das Smartphone liest den Ausweis nicht. Mit „Gerät und Ausweis prüfen“ in der AusweisApp lässt sich das eingrenzen.",
      },
      {
        question: "Funktioniert i-Kfz mit einem alten Fahrzeugbrief?",
        answer:
          "Für Neuzulassung, Wiederzulassung und Halterwechsel nicht, wenn der Brief vor dem 01.01.2018 ausgestellt wurde – ihm fehlt der Sicherheitscode. Dann bleiben die Zulassungsstelle oder ein Zulassungsdienst.",
      },
      {
        question: "Kann ich ein Importfahrzeug über i-Kfz zulassen?",
        answer:
          "In der Regel nicht, weil keine deutsche Zulassungsbescheinigung Teil II mit Sicherheitscode vorliegt. Bei Importen klären wir vorab, welche Nachweise die Behörde verlangt.",
      },
      {
        question: "Kann ich ein Firmenauto mit meinem privaten Online-Ausweis anmelden?",
        answer:
          "Nein, wenn die Firma Halterin ist oder Sie als beruflich selbstständige Person Halter sind. Dann sieht die FZV die Identifizierung über ein Organisationskonto vor.",
      },
      {
        question: "Ist i-Kfz günstiger als ein Zulassungsdienst?",
        answer: `Ja. Selbst zahlen Sie nur die amtliche Gebühr für den Onlinevorgang (${euroRange(officialFees.onlineRegistration)}) und die Kennzeichen. Bei DeutscheZulassung kostet eine Zulassung ${P.zulassung} inklusive Gebühren und Versand – dafür entfallen Ausweis-, Papier- und Portalfragen.`,
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "gewerbekunden"],
    relatedGuides: ["i-kfz-online-zulassung", "kein-termin-zulassungsstelle", "auto-anmelden-unterlagen"],
    relatedLanding: ["ikfz-fehlermeldung", "kfz-zulassung-ohne-eid", "zulassungsdienst-online"],
    sources: [
      Q.bmv,
      Q.ausweisFaq,
      Q.hamburg,
      { label: "Fahrzeug-Zulassungsverordnung (FZV), §§ 20 und 26", href: FZV_INDEX },
    ],
    keywords: [
      "i-Kfz funktioniert nicht",
      "Online-Zulassung funktioniert nicht",
      "i-Kfz Probleme",
      "i-Kfz Ausweis wird nicht erkannt",
      "i-Kfz alter Fahrzeugbrief",
    ],
  },

  /* ───────────────────────── 4. i-Kfz-Fehlermeldung ───────────────────────── */
  {
    slug: "ikfz-fehlermeldung",
    navTitle: "i-Kfz-Fehlermeldungen",
    metaTitle: "i-Kfz Fehlermeldung: Bedeutung und nächster Schritt",
    h1: "i-Kfz-Fehlermeldung: Was die Meldungen bedeuten",
    description:
      "i-Kfz-Fehlermeldung nachschlagen: was typische Meldungen von AusweisApp, Portal und Bezahlung sinngemäß bedeuten und welcher nächste Schritt jeweils hilft.",
    intro: [
      "Eine Meldung im i-Kfz-Portal klingt oft endgültiger, als sie ist. Viele Hinweise bedeuten nur, dass eine Angabe nicht zu den gespeicherten Daten passt – und lassen sich im selben Vorgang korrigieren.",
      "Hier schlagen Sie typische Meldungen nach. Weil jede Zulassungsbehörde ihr eigenes Portal betreibt und die Texte voneinander abweichen, beschreiben wir die Meldungen sinngemäß. Wissen Sie noch gar nicht, woran es hakt, hilft unsere Seite „i-Kfz funktioniert nicht“ bei der Ursachensuche.",
    ],
    updated: "2026-11-03",
    primaryService: "neuzulassung",
    ctaLabel: "Antrag von uns stellen lassen",
    checklist: {
      title: "Diese Angaben sollten griffbereit sein",
      items: [
        "Personalausweis, sechsstellige PIN und der PIN-Brief mit der PUK",
        "Zulassungsbescheinigung Teil I und, je nach Vorgang, Teil II",
        "Kennzeichen und Fahrzeug-Identifizierungsnummer",
        "eVB-Nummer der Kfz-Versicherung",
        "Monat und Jahr der nächsten HU laut Prüfbericht",
        "IBAN für das SEPA-Mandat zur Kfz-Steuer und ein Zahlungsmittel für die Gebühr",
      ],
    },
    steps: {
      title: "So gehen Sie bei einer Meldung vor",
      items: [
        {
          title: "Meldung festhalten",
          text: "Machen Sie einen Screenshot, bevor Sie etwas wegklicken. Das hilft bei Rückfragen an die Behörde.",
        },
        {
          title: "Quelle bestimmen",
          text: "Kommt die Meldung aus der AusweisApp, aus dem Portal oder vom Bezahldienst? Danach richtet sich, wo Sie ansetzen.",
        },
        {
          title: "Gezielt korrigieren",
          text: "Prüfen Sie die betroffene Angabe Zeichen für Zeichen. Im Portal haben Sie dafür höchstens drei Korrekturversuche.",
        },
        {
          title: "Weg wechseln, wenn nötig",
          text: "Lässt sich die Ursache nicht selbst beheben, wenden Sie sich an die Zulassungsbehörde oder lassen den Antrag von einem Zulassungsdienst stellen.",
        },
      ],
    },
    sections: [
      {
        heading: "Woher eine Meldung kommt",
        paragraphs: [
          "Bei i-Kfz arbeiten mehrere Systeme zusammen, und jedes meldet sich mit eigenen Hinweisen: die AusweisApp beim Auslesen des Ausweises, das Portal der Zulassungsbehörde bei der Prüfung Ihrer Angaben und der Bezahldienst bei der Gebühr.",
          "Das Portal gleicht Ihre Eingaben mit dem Zentralen Fahrzeugregister ab und lässt unter anderem die eVB-Nummer, die Bankverbindung und mögliche Kfz-Steuerrückstände prüfen (§§ 19 und 20 FZV). Jede dieser Prüfungen kann eine eigene Meldung auslösen.",
        ],
      },
      {
        heading: "Meldungen der AusweisApp",
        paragraphs: ["Diese Hinweise erscheinen, bevor Sie überhaupt ins Antragsformular gelangen:"],
        table: {
          headers: ["Meldung (sinngemäß)", "Was dahintersteckt", "Was Sie tun können"],
          rows: [
            [
              "Ausweis wird nicht erkannt oder die Verbindung bricht ab",
              "Das Smartphone liest den Chip nicht stabil – wegen Hülle, Position oder eines ungeeigneten Geräts",
              "Hülle entfernen, Ausweis ruhig an die NFC-Stelle halten, mit „Gerät und Ausweis prüfen“ testen",
            ],
            [
              "Zugangsnummer (CAN) wird verlangt",
              "Die PIN wurde zweimal falsch eingegeben",
              "Sechsstellige CAN von der Vorderseite des Ausweises eingeben, dann die PIN sorgfältig erneut eingeben",
            ],
            [
              "PIN gesperrt",
              "Die PIN wurde dreimal falsch eingegeben",
              "Mit der zehnstelligen PUK aus dem PIN-Brief entsperren; ohne PIN-Brief hilft das Bürgeramt",
            ],
            [
              "„Zeitüberschreitung“ beim Ändern der PIN",
              "Die Änderung der Einmal-PIN dauerte länger als eine Minute",
              "Vorgang neu starten",
            ],
            [
              "Online-Ausweisfunktion nicht aktiviert",
              "Die Funktion ist bei Ihrem Ausweis ausgeschaltet",
              "Aktivierung beim Bürgeramt",
            ],
          ],
        },
      },
      {
        heading: "Meldungen im i-Kfz-Portal",
        paragraphs: ["Diese Meldungen betreffen Ihre Angaben zum Fahrzeug, zur Versicherung oder zur Kfz-Steuer:"],
        table: {
          headers: ["Meldung (sinngemäß)", "Was dahintersteckt", "Was Sie tun können"],
          rows: [
            [
              "Sicherheitscode ungültig oder passt nicht",
              "Tippfehler, verwechselte Zeichen, Code eines anderen Dokuments – oder der Code ist beim Freilegen beschädigt worden",
              "Code Zeichen für Zeichen prüfen; bei beschädigtem Code an die Zulassungsbehörde wenden",
            ],
            [
              "Fahrzeugdaten passen nicht zum Register",
              "Kennzeichen oder Fahrzeug-Identifizierungsnummer falsch eingegeben, oder die Fahrzeugdaten haben sich geändert",
              "Angaben mit dem Fahrzeugschein abgleichen; nach technischen Änderungen ist der Online-Weg ausgeschlossen",
            ],
            [
              "eVB-Nummer ungültig",
              "eVB abgelaufen, vertippt oder für eine andere Person ausgestellt",
              "Nummer prüfen oder bei der Versicherung eine neue eVB anfordern",
            ],
            [
              "Kfz-Steuerrückstand",
              "Für den Halter sind offene Kfz-Steuern gespeichert",
              "Rückstand beim Zoll klären, bevor Sie es erneut versuchen",
            ],
            [
              "HU-Angaben fehlerhaft oder HU abgelaufen",
              "Bei Wiederzulassung und Umschreibung prüft das Portal eine gültige HU",
              "Monat und Jahr aus dem Prüfbericht übernehmen; ist die HU abgelaufen, zuerst zur Prüfung",
            ],
            [
              "Bankverbindung konnte nicht geprüft werden",
              "Die IBAN für das SEPA-Mandat zur Kfz-Steuer wird verifiziert",
              "IBAN Zeichen für Zeichen prüfen",
            ],
          ],
        },
      },
      {
        heading: "Wenn das Portal den Antrag nicht abschließt",
        paragraphs: [
          "Passt eine Angabe nicht, zeigt das Portal das im Dialog an. Sie dürfen die Angaben bis zu dreimal berichtigen; ist das Ergebnis auch nach der dritten Korrektur negativ, bricht das Portal den Vorgang ab (§ 20 Abs. 4 FZV).",
          "Kann die maschinelle Prüfung nicht vollständig durchgeführt werden, geht der Antrag zur Entscheidung an die Zulassungsbehörde (§ 19 Abs. 1 FZV). Eine sofortige Zulassung gibt es dann nicht; die Behörde gibt ihre Entscheidung mit einem schriftlichen Bescheid bekannt (§ 23 Abs. 1 FZV).",
          "Auch nach einem erfolgreichen Antrag gibt es eine Stolperfalle: Zulassungsbescheid und vorläufiger Nachweis stehen nur 30 Minuten zum Abruf bereit. Wer sie verpasst, erhält den Bescheid per Post und darf laut BMV nicht sofort losfahren.",
        ],
      },
      {
        heading: "Probleme bei der Bezahlung",
        paragraphs: [
          "Im Online-Verfahren wird die Gebühr vor der Antragstellung bezahlt (§ 20 Abs. 5 FZV). Welche Zahlungsarten es gibt, legt laut BMV jede Behörde selbst fest. Schlägt die Zahlung fehl, prüfen Sie zuerst, ob Ihr Zahlungsmittel dort überhaupt angeboten wird.",
        ],
      },
      {
        heading: "Wann ein weiterer Versuch nichts bringt",
        paragraphs: [
          "Wiederholt sich dieselbe Meldung trotz Korrektur oder betrifft sie etwas, das Sie nicht selbst ändern können – beschädigte Codes, zu alte Papiere, eine nicht aktivierte Online-Ausweisfunktion –, sollten Sie den Weg wechseln. Ansprechpartner ist dann die Zulassungsbehörde, oder Sie lassen den Antrag von einem Zulassungsdienst stellen.",
          `Bei DeutscheZulassung brauchen Sie dafür keine eID: Fotos der Unterlagen genügen. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung; eine Zulassung kostet ${P.zulassung} inklusive amtlicher Gebühren und Versand. Daten, die die Behörde beanstandet – etwa Steuerrückstände –, ändert allerdings auch ein Dienst nicht.`,
        ],
      },
    ],
    faq: [
      {
        question: "Wie oft darf ich eine Angabe im i-Kfz-Portal korrigieren?",
        answer:
          "Bis zu dreimal. Ist das Prüfergebnis auch danach negativ, bricht das Portal den Antrag ab (§ 20 Abs. 4 FZV).",
      },
      {
        question: "Ich habe den Zulassungsbescheid nicht rechtzeitig heruntergeladen – was nun?",
        answer:
          "Der Bescheid steht 30 Minuten zum Abruf bereit. Danach schickt die Behörde einen Ausdruck per Post; sofort losfahren dürfen Sie dann nicht.",
      },
      {
        question: "Was bedeutet es, wenn mein Antrag an die Behörde weitergeleitet wird?",
        answer:
          "Die automatische Prüfung konnte nicht abgeschlossen werden. Die Zulassungsbehörde entscheidet dann selbst und schickt Ihnen einen schriftlichen Bescheid.",
      },
      {
        question: "Warum steht meine Meldung hier nicht im genauen Wortlaut?",
        answer:
          "Jede Zulassungsbehörde betreibt ihr eigenes Portal, die Formulierungen unterscheiden sich. Wir beschreiben deshalb, was eine Meldung sinngemäß bedeutet, statt Texte zu zitieren, die bei Ihnen anders lauten können.",
      },
      {
        question: "Ich habe bei einem gescheiterten Versuch schon Codes freigelegt. Was jetzt?",
        answer:
          "Mit dem Freilegen wird auf dem Dokument „Dokument nicht mehr gültig“ sichtbar (§ 21 FZV). Sagen Sie das Ihrer Zulassungsbehörde – oder uns gleich bei der Beauftragung –, damit geklärt wird, was in Ihrem Fall nötig ist.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "abmeldung"],
    relatedGuides: ["i-kfz-online-zulassung", "evb-nummer", "kfz-zulassung-glossar"],
    relatedLanding: ["ikfz-funktioniert-nicht", "kfz-zulassung-ohne-eid", "auto-abmelden-ohne-eid"],
    sources: [
      { label: "Fahrzeug-Zulassungsverordnung (FZV), §§ 19 bis 21 und 23", href: FZV_INDEX },
      Q.ausweisFaq,
      Q.ausweisVoraussetzungen,
      Q.bmv,
    ],
    keywords: [
      "i-Kfz Fehlermeldung",
      "i-Kfz Fehler",
      "i-Kfz Sicherheitscode ungültig",
      "i-Kfz Antrag abgebrochen",
      "AusweisApp Fehlermeldung Zulassung",
    ],
  },

  /* ───────────────────────── 5. Auto online anmelden ───────────────────────── */
  {
    slug: "auto-online-anmelden",
    navTitle: "Auto online anmelden",
    metaTitle: "Auto online anmelden: Vorgang, Weg und Unterlagen",
    h1: "Auto online anmelden – welcher Vorgang, welcher Weg?",
    description:
      "Auto online anmelden: welcher Vorgang bei Neuwagen, Gebrauchtwagen, Wiederzulassung oder Umzug passt, welche Wege es gibt und welche Unterlagen nötig sind.",
    intro: [
      "„Auto anmelden“ ist im Alltag ein Sammelbegriff. Für die Zulassungsbehörde macht es einen Unterschied, ob ein Neuwagen erstmals zugelassen, ein Gebrauchtwagen umgeschrieben, ein abgemeldetes Fahrzeug wieder zugelassen oder eine neue Adresse eingetragen wird. Davon hängen Unterlagen, Kosten und der mögliche Weg ab.",
      "Diese Übersicht hilft Ihnen, den passenden Vorgang zu finden und zu entscheiden, ob Sie ihn an der Zulassungsstelle, selbst über i-Kfz oder über einen Zulassungsdienst erledigen.",
    ],
    updated: "2026-11-03",
    primaryService: "halterwechsel",
    ctaLabel: "Anmeldung online beauftragen",
    checklist: {
      photoHint: true,
      title: "Grundunterlagen für fast jede Anmeldung",
      items: [
        "Personalausweis oder Reisepass der künftigen Halterin bzw. des künftigen Halters",
        "eVB-Nummer der Kfz-Versicherung",
        "Kontoverbindung für das SEPA-Mandat zur Kfz-Steuer",
        "Zulassungsbescheinigung Teil II (Fahrzeugbrief) oder CoC-Papier",
        "Bei Gebrauchtwagen: Zulassungsbescheinigung Teil I und Nachweis der gültigen HU",
        "Beim Kauf: Kaufvertrag",
        "Bei Firmen: Gewerbeanmeldung oder Handelsregisterauszug",
      ],
    },
    steps: {
      title: "So melden Sie Ihr Auto über DeutscheZulassung an",
      items: [
        {
          title: "Vorgang wählen",
          text: "Neuzulassung, Halterwechsel, Wiederzulassung oder Ummeldung – sind Sie unsicher, beschreiben Sie einfach Ihre Situation, und wir ordnen sie zu.",
        },
        {
          title: "Auftrag senden",
          text: "Sie beauftragen über das Online-Formular, auf Wunsch mit Handyfotos der Unterlagen, oder per WhatsApp bzw. E-Mail und erhalten vorab eine verbindliche Festpreis-Bestätigung.",
        },
        {
          title: "Vollmacht erteilen",
          text: "Wir reichen den Antrag bei der zuständigen Zulassungsbehörde ein und melden uns, falls etwas fehlt.",
        },
        {
          title: "Papiere erhalten",
          text: `In der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen, dazu kommt der Versand.`,
        },
      ],
    },
    sections: [
      {
        heading: "Welche Anmeldung brauchen Sie?",
        paragraphs: [
          "Ordnen Sie Ihre Situation zuerst dem richtigen Vorgang zu. Halterwechsel und Umzug sind der Zulassungsbehörde nach § 15 FZV unverzüglich mitzuteilen – warten Sie damit also nicht lange.",
        ],
        table: {
          headers: ["Ihre Situation", "Vorgang", "Darauf kommt es an"],
          rows: [
            [
              "Neuwagen oder Import, noch nie in Deutschland zugelassen",
              "Neuzulassung",
              "Fahrzeugbrief oder CoC-Papier; bei Importen je nach Herkunft weitere Nachweise",
            ],
            [
              "Gebrauchtwagen gekauft, noch angemeldet",
              "Umschreibung (Halterwechsel)",
              "Kaufvertrag und gültige HU; das bisherige Kennzeichen lässt sich oft übernehmen",
            ],
            [
              "Gebrauchtwagen gekauft, bereits abgemeldet",
              "Wiederzulassung mit Halterwechsel",
              "Gültige HU, Fahrzeugschein und Fahrzeugbrief",
            ],
            [
              "Eigenes abgemeldetes Auto wieder nutzen",
              "Wiederzulassung",
              "Gültige HU; den Fahrzeugschein aus der Abmeldung bereithalten",
            ],
            [
              "Umzug in einen anderen Zulassungsbezirk",
              "Ummeldung",
              "Das bisherige Kennzeichen kann weitergeführt werden",
            ],
            ["Umzug innerhalb des Bezirks", "Adressänderung", "Nur die Anschrift wird geändert"],
          ],
        },
      },
      {
        heading: "Drei Wege zur Anmeldung",
        paragraphs: [
          `An der Zulassungsstelle legen Sie die Unterlagen persönlich vor; je nach Behörde brauchen Sie einen Termin. Die amtliche Gebühr liegt bei ${euroRange(officialFees.counterRegistration)}, dazu kommen die Kennzeichenschilder.`,
          `Über i-Kfz melden Sie selbst im Portal Ihrer Behörde an. Mit ${euroRange(officialFees.onlineRegistration)} amtlicher Gebühr ist das der günstigste Weg, und bei Erfolg dürfen Sie sofort losfahren. Sie brauchen aber eine Online-Identifizierung, Papiere mit Sicherheitscodes und laut Kraftfahrt-Bundesamt bereits vorhandene Kennzeichenschilder. Die Plaketten verschickt die Behörde spätestens sechs Kalendertage nach Abruf der Entscheidung (§ 26 Abs. 4 FZV).`,
          `Über einen Zulassungsdienst geben Sie den Vorgang ab: Sie senden die Unterlagen und eine Vollmacht, der Dienst stellt den Antrag. Bei DeutscheZulassung kostet das ${P.zulassung} inklusive amtlicher Gebühren und Versand.`,
        ],
      },
      {
        heading: "Zusätzliche Unterlagen je nach Vorgang",
        paragraphs: [
          "Die Grundunterlagen aus der Checkliste brauchen Sie fast immer. Je nach Vorgang kommt Folgendes hinzu oder entfällt:",
        ],
        list: [
          "Neuzulassung: Fahrzeugbrief oder CoC-Papier; bei Firmen Gewerbeanmeldung oder Handelsregisterauszug",
          "Halterwechsel: Fahrzeugschein und Fahrzeugbrief, Kaufvertrag, Nachweis der gültigen HU",
          "Wiederzulassung: Fahrzeugschein und -brief, Abmeldebescheinigung falls vorhanden, gültige HU",
          "Ummeldung: Fahrzeugschein und -brief, Ausweis mit neuer Adresse oder Meldebescheinigung; eine eVB-Nummer verlangen manche Behörden auch ohne Versichererwechsel – fordern Sie sie vorsorglich an",
          "Adressänderung: Fahrzeugschein und Ausweis mit neuer Adresse oder Meldebescheinigung",
        ],
      },
      {
        heading: "Kennzeichen: neu, weitergeführt oder selbst geprägt",
        paragraphs: [
          `Bei einer Anmeldung über DeutscheZulassung haben Sie drei Möglichkeiten: Wir liefern geprägte Kennzeichenschilder für ${P.kennzeichen} pro Paar mit, Sie lassen die Schilder selbst bei einem Schildermacher prägen, oder Sie behalten Ihr bisheriges Kennzeichen, wenn der Vorgang das erlaubt – etwa bei einer Ummeldung nach Umzug.`,
          `Möchten Sie eine bestimmte Buchstaben- und Zahlenkombination, übernehmen wir auf Wunsch den Wunschkennzeichen-Service für ${P.wunschkennzeichen}; die amtliche Gebühr ist darin enthalten.`,
        ],
      },
      {
        heading: "Was ein Zulassungsdienst leistet – und was nicht",
        paragraphs: [
          "DeutscheZulassung ist ein privater Dienstleister, keine Behörde. Wir nehmen Ihre Unterlagen entgegen, fragen nach, wenn etwas fehlt, und reichen den Antrag bei der zuständigen Zulassungsbehörde ein. Die Entscheidung über die Zulassung trifft die Behörde – eine Zulassung „in Minuten“ versprechen wir deshalb nicht.",
          "Ihre feste Ansprechperson erreichen Sie Mo–Fr von 8:00 bis 18:00 Uhr per WhatsApp, Telefon und E-Mail.",
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich mein Auto komplett online anmelden?",
        answer:
          "Ja, über das i-Kfz-Portal Ihrer Zulassungsbehörde, wenn Sie sich online identifizieren können und Ihre Papiere die nötigen Sicherheitscodes tragen. Fehlt eine Voraussetzung, können Sie die Anmeldung online beauftragen – dann stellt ein Zulassungsdienst den Antrag für Sie.",
      },
      {
        question: "Welche Anmeldung brauche ich nach einem Gebrauchtwagenkauf?",
        answer:
          "Ist das Fahrzeug noch zugelassen, eine Umschreibung (Halterwechsel). Wurde es bereits abgemeldet, eine Wiederzulassung mit Halterwechsel – dann muss die HU gültig sein.",
      },
      {
        question: "Wie schnell muss ich ein gekauftes Auto ummelden?",
        answer:
          "Die Fahrzeug-Zulassungsverordnung verlangt, den Halterwechsel unverzüglich mitzuteilen (§ 15 FZV). Kümmern Sie sich also direkt nach dem Kauf darum.",
      },
      {
        question: "Was kostet es, ein Auto online anzumelden?",
        answer: `Selbst über i-Kfz zahlen Sie die amtliche Gebühr von ${euroRange(officialFees.onlineRegistration)} plus Schilder. Über DeutscheZulassung kostet die Anmeldung ${P.zulassung} inklusive amtlicher Gebühren und Versand; geprägte Schilder auf Wunsch zusätzlich ${P.kennzeichen} pro Paar.`,
      },
      {
        question: "Brauche ich einen Termin?",
        answer:
          "Weder für i-Kfz noch für die Beauftragung von DeutscheZulassung. Ob die Zulassungsstelle vor Ort einen Termin verlangt, sehen Sie auf der Website Ihrer Behörde.",
      },
    ],
    relatedServices: ["halterwechsel", "neuzulassung", "wiederzulassung", "ummeldung", "adressaenderung"],
    relatedGuides: [
      "auto-anmelden-unterlagen",
      "evb-nummer-erhalten-was-nun",
      "kennzeichen-mitnehmen",
      "auto-ummelden-nach-umzug",
    ],
    relatedLanding: ["kfz-zulassung-ohne-eid", "zulassungsdienst-online", "ikfz-funktioniert-nicht"],
    sources: [Q.bmv, Q.kba, Q.fzv15, Q.fzv26],
    keywords: [
      "Auto online anmelden",
      "Kfz online anmelden",
      "Auto anmelden online Unterlagen",
      "Gebrauchtwagen online anmelden",
      "Neuwagen online zulassen",
    ],
  },

  /* ───────────────────────── 6. Zulassungsdienst online ───────────────────────── */
  {
    slug: "zulassungsdienst-online",
    navTitle: "Zulassungsdienst online",
    metaTitle: "Zulassungsdienst online: Aufgaben, Kosten, Auswahl",
    h1: "Zulassungsdienst online: Was er darf und woran Sie Seriosität erkennen",
    description:
      "Zulassungsdienst online: was ein privater Dienst darf, wie er sich von Behörde und i-Kfz unterscheidet und woran Sie ein seriöses Angebot erkennen.",
    intro: [
      "Ein Zulassungsdienst erledigt Zulassungsvorgänge im Auftrag von Fahrzeughalterinnen und -haltern. „Online“ bedeutet: Sie beauftragen ihn über das Internet, schicken Fotos Ihrer Unterlagen und bekommen Papiere und Kennzeichen zugeschickt – ohne selbst zur Zulassungsstelle zu gehen.",
      "Weil private Angebote und Behördenportale im Netz nebeneinanderstehen, lohnt ein genauer Blick. Hier erfahren Sie, was ein privater Dienst darf, wie er sich von Behörde und i-Kfz unterscheidet und woran Sie ein seriöses Angebot erkennen.",
    ],
    updated: "2026-11-03",
    primaryService: "neuzulassung",
    ctaLabel: "Zulassungsdienst beauftragen",
    checklist: {
      photoHint: true,
      title: "Das braucht ein Zulassungsdienst für eine Zulassung",
      items: [
        "Foto von Personalausweis oder Reisepass",
        "Fahrzeugpapiere: Teil I und/oder Teil II bzw. CoC-Papier",
        "eVB-Nummer der Kfz-Versicherung",
        "Kontoverbindung für das SEPA-Mandat zur Kfz-Steuer",
        "Bei Gebrauchtwagen: Nachweis der gültigen HU",
        "Vollmacht für den Dienstleister",
      ],
    },
    steps: {
      title: "So arbeitet DeutscheZulassung",
      items: [
        {
          title: "Auftrag",
          text: "Sie beauftragen über das Online-Formular – auf Wunsch gleich mit Dokumenten-Upload – oder per WhatsApp bzw. E-Mail.",
        },
        {
          title: "Festpreis-Bestätigung",
          text: "Bevor es losgeht, erhalten Sie von unserem Team eine verbindliche Festpreis-Bestätigung.",
        },
        {
          title: "Vollmacht und Einreichung",
          text: "Mit Ihrer Vollmacht reichen wir den Antrag bei der zuständigen Zulassungsbehörde ein. Fehlt etwas, fragt Ihre feste Ansprechperson nach.",
        },
        {
          title: "Versand",
          text: `In der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen zuzüglich Versand; Abmeldungen meist ${ZEIT.abmeldung}.`,
        },
      ],
    },
    sections: [
      {
        heading: "Was ein privater Zulassungsdienst ist – und was er darf",
        paragraphs: [
          "Ein Zulassungsdienst ist ein privates Unternehmen, keine Behörde. Er handelt als Ihr Bevollmächtigter: Er bereitet den Antrag vor, reicht ihn bei der zuständigen Zulassungsbehörde ein und kümmert sich um Rückfragen, Kennzeichen und Versand. Dass sich Beteiligte im Verwaltungsverfahren durch Bevollmächtigte vertreten lassen können, ist ein Grundsatz des Verwaltungsrechts (etwa § 14 VwVfG). Auch die Fahrzeug-Zulassungsverordnung rechnet mit Beauftragten des Halters, zum Beispiel beim Freilegen der Sicherheitscodes (§ 21 Abs. 2 FZV).",
          "Was ein Dienst nicht kann: selbst zulassen, Kennzeichen zuteilen oder Bescheide ausstellen. Das bleibt der Behörde vorbehalten, die über jeden Antrag entscheidet. Für Unternehmen mit vielen Vorgängen gibt es eine Großkundenschnittstelle beim Kraftfahrt-Bundesamt; das BMV nennt als Beispiele dafür auch Zulassungsdienstleister.",
        ],
      },
      {
        heading: "Behörde, i-Kfz oder Zulassungsdienst im Vergleich",
        paragraphs: [
          "Alle drei Wege führen zur selben Zulassung, über die stets die Behörde entscheidet. Ehrlich gerechnet: Wer alle Voraussetzungen für i-Kfz erfüllt, zahlt dort am wenigsten. Ein Dienst kostet mehr, erspart aber Termin, Anfahrt und Portalhürden.",
        ],
        table: {
          headers: ["", "Zulassungsstelle vor Ort", "i-Kfz selbst", "Privater Zulassungsdienst"],
          rows: [
            ["Wer entscheidet?", "Zulassungsbehörde", "Zulassungsbehörde, meist automatisiert", "Zulassungsbehörde"],
            [
              "Voraussetzungen",
              "persönliche Vorsprache mit den Unterlagen",
              "Online-Identifizierung, Papiere mit Sicherheitscodes, ePayment",
              "Vollmacht, Fotos der Unterlagen",
            ],
            ["Termin", "je nach Behörde nötig", "nein", "nein"],
            [
              "Kosten",
              `amtliche Gebühr ${euroRange(officialFees.counterRegistration)} + Kennzeichen`,
              `amtliche Gebühr ${euroRange(officialFees.onlineRegistration)} + Kennzeichen`,
              `bei DeutscheZulassung ${P.zulassung} inkl. Gebühren und Versand`,
            ],
            [
              "Dauer",
              "abhängig von der Terminlage",
              "bei Erfolg sofort, Plaketten per Post",
              `bei DeutscheZulassung meist ${ZEIT.zulassung} + Versand`,
            ],
            [
              "Kennzeichen",
              "selbst prägen lassen",
              "selbst prägen lassen",
              `auf Wunsch geliefert (${P.kennzeichen}), selbst prägen oder behalten`,
            ],
            ["Ansprechpartner", "Behörde", "Behörde", "Dienstleister, bei DeutscheZulassung eine feste Ansprechperson"],
          ],
        },
      },
      {
        heading: "Woran Sie einen seriösen Zulassungsdienst erkennen",
        paragraphs: ["Diese Punkte können Sie vor jeder Beauftragung in wenigen Minuten prüfen:"],
        list: [
          "Vollständiges Impressum: Name und Anschrift, bei Firmen Rechtsform und Vertretungsberechtigte, eine E-Mail-Adresse und gegebenenfalls die Registernummer – das verlangt § 5 des Digitale-Dienste-Gesetzes.",
          "Festpreis vorab: Der Endpreis inklusive amtlicher Gebühren steht fest, bevor Sie zahlen; Zusatzleistungen wie Kennzeichen sind einzeln ausgewiesen.",
          "Keine Vorkasse ohne Leistungsbeschreibung: Vor jeder Zahlung ist klar, welcher Vorgang erledigt wird und was im Preis enthalten ist.",
          "Klare Datenschutzinformationen: Sie erfahren, wer Ihre Ausweis- und Fahrzeugdaten verarbeitet und wofür.",
          "Kein Behörden-Anschein: Ein privater Dienst gibt sich nicht als Amt aus und macht deutlich, dass er ein Unternehmen ist.",
          "Realistische Zeitangaben: Weil die Behörde entscheidet, kann kein Dienst eine Zulassung in Minuten garantieren.",
          "Erreichbarkeit: Über Telefon, E-Mail oder Chat erreichen Sie während des Vorgangs eine Person.",
        ],
      },
      {
        heading: "So setzt DeutscheZulassung diese Punkte um",
        paragraphs: [
          "DeutscheZulassung ist ein Angebot der Volt Gas UG (haftungsbeschränkt) mit Sitz in Berlin und bundesweit tätig. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung.",
          `Eine Zulassung kostet ${P.zulassung} inklusive amtlicher Gebühren und Versand, eine Abmeldung ${P.abmeldung} inklusive Gebühren. Kennzeichenschilder für ${P.kennzeichen} pro Paar und den Wunschkennzeichen-Service für ${P.wunschkennzeichen} (amtliche Gebühr enthalten) wählen Sie nur, wenn Sie sie brauchen.`,
          `Ihre feste Ansprechperson erreichen Sie Mo–Fr von 8:00 bis 18:00 Uhr per WhatsApp, Telefon und E-Mail. Und weil die Entscheidung bei der Behörde liegt, nennen wir eine realistische Dauer statt eines Versprechens: in der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen, zuzüglich Versand.`,
        ],
      },
    ],
    faq: [
      {
        question: "Ist ein Online-Zulassungsdienst legal?",
        answer:
          "Ja. Im Verwaltungsverfahren können Sie sich durch einen Bevollmächtigten vertreten lassen; der Dienst handelt mit Ihrer Vollmacht. Über die Zulassung entscheidet weiterhin die zuständige Behörde.",
      },
      {
        question: "Ist ein Zulassungsdienst teurer als die Behörde?",
        answer: `Ja, weil zur amtlichen Gebühr der Servicepreis kommt. Bei DeutscheZulassung ist die amtliche Gebühr im Preis von ${P.zulassung} bereits enthalten, ebenso der Versand.`,
      },
      {
        question: "Muss ich meine Originaldokumente verschicken?",
        answer:
          "Für den Start genügen Handyfotos. Originale braucht es nur, wenn die Behörde sie verlangt – etwa wenn Ihr Fahrzeugbrief keinen Sicherheitscode trägt (vor 2018 ausgestellt) oder bei Importfahrzeugen. Das sagen wir Ihnen vorab.",
      },
      {
        question: "Woran erkenne ich, ob ich auf einer Behördenseite bin?",
        answer:
          "Am Impressum: Bei einem privaten Dienst steht dort ein Unternehmen, keine Behörde. Das i-Kfz-Portal stellt laut BMV die jeweilige Zulassungsbehörde bereit – Sie finden es über deren Website.",
      },
      {
        question: "Wie lange dauert es über DeutscheZulassung?",
        answer:
          `In der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen zuzüglich Versand; Abmeldungen meist ${ZEIT.abmeldung}.`,
      },
    ],
    relatedServices: ["neuzulassung", "privatkunden", "gewerbekunden", "abmeldung"],
    relatedGuides: ["was-kostet-eine-kfz-zulassung", "kein-termin-zulassungsstelle", "i-kfz-online-zulassung"],
    relatedLanding: ["kfz-zulassung-ohne-eid", "auto-online-anmelden", "ikfz-funktioniert-nicht"],
    sources: [Q.vwvfg14, Q.fzv21, Q.ddg5, Q.bmv],
    keywords: [
      "Zulassungsdienst online",
      "Online-Zulassungsdienst",
      "Kfz-Zulassungsdienst seriös",
      "Zulassungsservice online",
      "Auto zulassen lassen online",
    ],
  },
];

export function getLandingPage(slug: string): LandingPage | undefined {
  return landingPages.find((p) => p.slug === slug);
}
