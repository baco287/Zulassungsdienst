import type { QA, ContentSection } from "./serviceContent";
import { addRanges, euroRange, officialFees, P, plateCosts, wunschkennzeichenHinweis } from "./pricing";
import { ZEIT } from "@/lib/betrieb";

/**
 * Ratgeber-Artikel (SEO/GEO-Content).
 *
 * Jeder Artikel beantwortet eine konkrete Suchfrage rund um die Kfz-Zulassung
 * und verlinkt intern auf passende Leistungen. Die Artikel werden als
 * Article- und FAQPage-JSON-LD ausgezeichnet.
 *
 * Neue Artikel: Objekt ergänzen, eindeutigen `slug` vergeben – Übersicht,
 * Detailseite und Sitemap aktualisieren sich automatisch.
 */

export interface Guide {
  slug: string;
  /** H1 und Meta-Title. */
  title: string;
  /** Meta-Description und Teaser in der Übersicht. */
  description: string;
  /** ISO-Datum der Erstveröffentlichung. */
  datePublished: string;
  /** ISO-Datum der letzten inhaltlichen Aktualisierung. */
  dateModified: string;
  sections: ContentSection[];
  faq: QA[];
  /** Slugs passender Leistungen (CTA-Verlinkung). */
  relatedServices: string[];
  /** Slugs weiterführender Artikel. */
  relatedGuides: string[];
  keywords: string[];
  /** Offizielle Quellen (KBA, BMDV, Gesetze) – als Trust-Signal gerendert. */
  sources?: { label: string; href: string }[];
}

export const guides: Guide[] = [
  {
    slug: "was-kostet-eine-kfz-zulassung",
    title: "Was kostet eine Kfz-Zulassung? (2026)",
    description:
      "Amtliche Gebühren, Kennzeichen, Wunschkennzeichen und Zulassungsdienst: Was eine Kfz-Zulassung 2026 wirklich kostet – mit konkreten Beträgen und Spartipps.",
    datePublished: "2026-08-13",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Die Kosten einer Kfz-Zulassung auf einen Blick",
        paragraphs: [
          "Die Gesamtkosten einer Zulassung setzen sich aus drei Bausteinen zusammen: den amtlichen Gebühren der Zulassungsbehörde, den Kennzeichenschildern und – falls Sie den Vorgang nicht selbst erledigen – dem Servicepreis eines Zulassungsdienstes. Je nach Vorgang und Kommune ergeben sich daraus typischerweise folgende Beträge:",
        ],
        table: {
          headers: ["Vorgang", "i-Kfz online (selbst)", "Am Schalter (selbst)", "Über DeutscheZulassung"],
          rows: [
            ["Neuzulassung", `${euroRange(officialFees.onlineRegistration)} + Kennzeichen`, `${euroRange(officialFees.counterRegistration)} + Kennzeichen`, `${P.zulassung} + Kennzeichen`],
            ["Umschreibung / Halterwechsel", `${euroRange(officialFees.onlineRegistration)} + ggf. Kennzeichen`, `${euroRange(officialFees.counterRegistration)} + ggf. Kennzeichen`, `${P.zulassung} + ggf. Kennzeichen`],
            ["Ummeldung nach Umzug", euroRange(officialFees.onlineRegistration), euroRange(officialFees.counterRegistration), `${P.zulassung} komplett`],
            ["Abmeldung", euroRange(officialFees.deregistrationOnline), euroRange(officialFees.deregistrationCounter), `${P.abmeldung} komplett`],
            ["Wunschkennzeichen (Zusatz)", "ca. 12,80 € + Schilder", "ca. 12,80 € + Schilder", `${P.wunschkennzeichen} inkl. amtl. Gebühr + ggf. Schilder`],
            ["Kennzeichenschilder (Paar)", "ca. 20 – 35 €", "ca. 20 – 35 €", `${P.kennzeichen}`],
          ],
        },
      },
      {
        heading: "Selbst machen oder machen lassen? Der ehrliche Vergleich",
        paragraphs: [
          "Welcher Weg der richtige ist, hängt weniger vom Geld ab als von Ihren Voraussetzungen und Ihrer Zeit:",
        ],
        table: {
          headers: ["Kriterium", "i-Kfz online (selbst)", "Behörde vor Ort", "Zulassungsdienst"],
          rows: [
            ["Voraussetzungen", "eID-Ausweis mit PIN, Sicherheitscodes, ePayment", "Termin (oft Wochen Vorlauf)", "keine – Fotos der Unterlagen genügen"],
            ["Zeitaufwand", "30–60 Min., wenn alles klappt", "halber Tag inkl. Anfahrt/Wartezeit", "ca. 10 Min. für die Beauftragung"],
            ["Dauer bis zur Zulassung", "sofort (vorläufiger Nachweis), Plaketten per Post", "am Termin selbst", `meist ${ZEIT.zulassung}, Schilder per Post in ${ZEIT.kennzeichenDativ}`],
            ["Gesamtkosten (Zulassung)", euroRange(addRanges(officialFees.onlineRegistration, plateCosts)), euroRange(addRanges(officialFees.counterRegistration, plateCosts)), `${P.zulassung} + ggf. Kennzeichen`],
            ["Scheitert häufig an …", "eID-PIN, alten Papieren, Portal-Fehlern", "Terminmangel", "–"],
          ],
        },
      },
      {
        heading: "Selbst zulassen oder Zulassungsdienst beauftragen?",
        paragraphs: [
          `Wer Zeit hat, einen Termin bekommt und alle Unterlagen beisammen hat, zahlt beim Selbermachen nur Gebühren und Schilder – zusammen je nach Behörde und Weg ${euroRange([officialFees.onlineRegistration[0] + plateCosts[0], officialFees.counterRegistration[1] + plateCosts[1]])}. Die Realität sieht oft anders aus: Termine sind in vielen Städten Wochen im Voraus ausgebucht, und ein halber Arbeitstag geht schnell verloren.`,
          `Ein Zulassungsdienst übernimmt den kompletten Vorgang gegen einen Servicepreis. Bei DeutscheZulassung kosten Neuzulassung, Umschreibung, Ummeldung und Wiederzulassung je ${P.zulassung} – amtliche Gebühren und versicherter Versand sind darin bereits enthalten. Werden neue Kennzeichenschilder benötigt, kommen ${P.kennzeichen} pro Paar dazu. Die Abmeldung kostet ${P.abmeldung} inklusive Gebühren. Sie wissen also vorher genau, was auf Sie zukommt.`,
        ],
      },
      {
        heading: "Versteckte Kosten vermeiden",
        paragraphs: [
          "Achten Sie beim Vergleich von Anbietern darauf, ob amtliche Gebühren und Kennzeichen im Preis enthalten sind oder zusätzlich berechnet werden – hier unterscheiden sich die Angebote erheblich. Seriöse Anbieter bestätigen den Endpreis verbindlich, bevor Sie beauftragen. Zusatzkosten können bei Sonderfällen entstehen, etwa bei Sondergrößen der Kennzeichen, Express-Abwicklung oder wenn eine Behörde Originaldokumente verlangt.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet es, ein Auto selbst anzumelden?",
        answer:
          `Beim Selbermachen zahlen Sie die amtliche Gebühr (online ${euroRange(officialFees.onlineRegistration)}, am Schalter ${euroRange(officialFees.counterRegistration)}, je nach Behörde) plus Kennzeichenschilder (${euroRange(plateCosts)} pro Paar). Dazu kommt Ihr Zeitaufwand für Termin und Behördengang.`,
      },
      {
        question: "Was kostet ein Zulassungsdienst?",
        answer:
          `DeutscheZulassung berechnet ${P.zulassung} inkl. Gebühren und Versand, zzgl. ${P.kennzeichen} für neue Kennzeichenschilder; die Abmeldung kostet ${P.abmeldung}.`,
      },
      {
        question: "Ist die Online-Zulassung (i-Kfz) günstiger als der Schalter?",
        answer:
          `Ja, die amtliche Gebühr für vollständig digitale Vorgänge ist niedriger (${euroRange(officialFees.onlineRegistration)} statt ${euroRange(officialFees.counterRegistration)}, je nach Behörde). Voraussetzung ist eine elektronische Identifizierung – der Online-Ausweis mit PIN oder eine BundID mit ELSTER-Zertifikat – und Fahrzeugdokumente mit Sicherheitscodes.`,
      },
      {
        question: "Wer zahlt die Kfz-Steuer und wann?",
        answer:
          "Die Kfz-Steuer wird ab dem Tag der Zulassung fällig und per SEPA-Lastschrift vom Hauptzollamt eingezogen. Ein SEPA-Mandat ist deshalb Pflichtbestandteil jeder Zulassung.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "abmeldung"],
    relatedGuides: ["auto-anmelden-unterlagen", "i-kfz-online-zulassung", "wunschkennzeichen-reservieren"],
    keywords: [
      "Kfz-Zulassung Kosten",
      "Auto anmelden Kosten",
      "Zulassung Gebühren 2026",
      "was kostet Auto ummelden",
    ],
    sources: [
      { label: "Kraftfahrt-Bundesamt: i-Kfz – internetbasierte Fahrzeugzulassung", href: "https://www.kba.de/DE/Themen/ZentraleRegister/Digitale_Fahrzeugzulassung/iKfz/ikfz_node.html" },
      { label: "Bundesministerium für Verkehr: Internetbasierte Fahrzeugzulassung", href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/internetbasierte-fahrzeugzulassung.html" },
      { label: "Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt)", href: "https://www.gesetze-im-internet.de/stgebo_2011/" },
    ],
  },

  {
    slug: "auto-anmelden-unterlagen",
    title: "Auto anmelden: Unterlagen-Checkliste",
    description:
      "Checkliste für die Kfz-Anmeldung: Zulassungsbescheinigung, eVB-Nummer, SEPA-Mandat & Co. – plus Sonderfälle für Neuwagen, Gebrauchtwagen und Importe.",
    datePublished: "2026-08-13",
    dateModified: "2026-08-13",
    sections: [
      {
        heading: "Die Grundausstattung für jede Zulassung",
        paragraphs: [
          "Egal ob Neuwagen, Gebrauchtwagen oder Wiederzulassung – diese Unterlagen verlangt jede Zulassungsbehörde:",
        ],
        list: [
          "Personalausweis oder Reisepass (bei Reisepass zusätzlich Meldebescheinigung)",
          "eVB-Nummer: die elektronische Versicherungsbestätigung Ihrer Kfz-Haftpflicht",
          "SEPA-Lastschriftmandat für die Kfz-Steuer",
          "Zulassungsbescheinigung Teil II (Fahrzeugbrief) – beim Neuwagen ggf. das CoC-Papier",
        ],
        image: {
          src: "/images/zb1-zb2-dokumente.webp",
          alt: "Zulassungsbescheinigung Teil I (Fahrzeugschein) und Teil II (Fahrzeugbrief) nebeneinander auf einem Tisch",
          caption:
            "Gut zu unterscheiden: links der kleine Fahrzeugschein (Teil I, gehört ins Auto), rechts der größere Fahrzeugbrief (Teil II, gehört sicher nach Hause).",
        },
      },
      {
        heading: "Zusätzliche Unterlagen je nach Fall",
        paragraphs: [
          "Je nach Vorgang kommen weitere Dokumente hinzu. Beim Gebrauchtwagenkauf (Umschreibung): Zulassungsbescheinigung Teil I, Kaufvertrag und der Nachweis einer gültigen Hauptuntersuchung (HU). Bei abgemeldeten Fahrzeugen: zusätzlich die Abmeldebescheinigung, falls vorhanden. Bei Firmenfahrzeugen: Gewerbeanmeldung oder Handelsregisterauszug. Bei Importen aus der EU: das CoC-Papier; bei Nicht-EU-Importen ein Vollgutachten nach § 21 StVZO.",
          "Lassen Sie einen Zulassungsdienst den Vorgang erledigen, kommt lediglich eine Vollmacht hinzu – bei DeutscheZulassung stellen wir sie Ihnen digital vorbereitet zur Verfügung. Für den Start genügen Fotos oder Scans aller Dokumente; Originale sind nur nötig, wenn die Behörde sie ausdrücklich verlangt.",
        ],
      },
      {
        heading: "Die häufigsten Stolpersteine",
        paragraphs: [
          "Drei Fehler verzögern Zulassungen immer wieder: Erstens eine fehlende oder abgelaufene eVB-Nummer – sie ist meist nur wenige Monate gültig und muss zum Vorgang passen (z. B. spezielle eVB für Kurzzeitkennzeichen). Zweitens eine abgelaufene HU beim Gebrauchtwagen – ohne gültige Prüfplakette keine Umschreibung. Drittens fehlende Unterschriften, etwa auf dem SEPA-Mandat oder der Vollmacht. Ein guter Zulassungsdienst prüft die Unterlagen deshalb vor der Einreichung auf Vollständigkeit.",
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich ein Auto ohne eVB-Nummer anmelden?",
        answer:
          "Nein. Die eVB-Nummer ist der Nachweis der gesetzlich vorgeschriebenen Kfz-Haftpflicht und für jede Zulassung Pflicht. Sie erhalten sie kostenlos von Ihrer Versicherung, oft innerhalb von Minuten.",
      },
      {
        question: "Brauche ich für die Anmeldung eine gültige HU?",
        answer:
          "Bei Gebrauchtwagen ja – ohne gültige Hauptuntersuchung keine Umschreibung oder Wiederzulassung. Neuwagen sind davon ausgenommen, die erste HU steht erst nach drei Jahren an.",
      },
      {
        question: "Kann jemand anderes mein Auto für mich anmelden?",
        answer:
          "Ja, mit einer schriftlichen Vollmacht plus Ausweiskopie des Halters kann eine bevollmächtigte Person oder ein Zulassungsdienst die Anmeldung übernehmen. Genau so funktioniert unser Service.",
      },
      {
        question: "Was ist das CoC-Papier?",
        answer:
          "Das Certificate of Conformity ist die EG-Übereinstimmungsbescheinigung des Herstellers. Es belegt, dass ein Fahrzeug einer EU-Typgenehmigung entspricht, und ersetzt bei fabrikneuen oder importierten Fahrzeugen die noch nicht vorhandene deutsche Zulassungsbescheinigung Teil II.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "wiederzulassung"],
    relatedGuides: ["evb-nummer", "was-kostet-eine-kfz-zulassung", "fahrzeugpapiere-sicherheitscodes", "fahrzeugzulassung-unternehmen"],
    keywords: [
      "Auto anmelden Unterlagen",
      "Kfz anmelden was brauche ich",
      "Auto zulassen Checkliste",
      "Dokumente Kfz-Zulassung",
    ],
  },

  {
    slug: "auto-ummelden-nach-umzug",
    title: "Auto ummelden nach Umzug: Fristen, Kosten und Ablauf",
    description:
      "Nach dem Umzug das Auto ummelden: welche Frist gilt, was es kostet, ob Sie Ihr Kennzeichen behalten können – und wie die Ummeldung ohne Behördengang funktioniert.",
    datePublished: "2026-08-13",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Muss ich mein Auto nach dem Umzug ummelden?",
        paragraphs: [
          "Ja. Die Fahrzeug-Zulassungsverordnung verpflichtet Halter, eine Adressänderung unverzüglich der Zulassungsbehörde mitzuteilen. Dabei gibt es zwei Fälle: Ziehen Sie innerhalb Ihres bisherigen Zulassungsbezirks um, genügt die Adressänderung in der Zulassungsbescheinigung Teil I. Ziehen Sie in einen anderen Bezirk, wird das Fahrzeug umgemeldet – Ihr Kennzeichen dürfen Sie dank bundesweiter Kennzeichenmitnahme trotzdem behalten.",
          "Wer die Ummeldung aufschiebt, riskiert ein Verwarnungsgeld und praktische Probleme: HU-Erinnerungen, Rückrufe oder Bußgeldbescheide erreichen Sie nicht mehr, und im Schadenfall kann die veraltete Adresse Diskussionen mit der Versicherung auslösen.",
        ],
      },
      {
        heading: "So läuft die Ummeldung ohne Behördengang",
        paragraphs: [
          `Statt einen Termin bei der neuen Zulassungsstelle zu jagen, können Sie die Ummeldung komplett digital erledigen lassen: Sie fotografieren Zulassungsbescheinigung Teil I und II sowie Ihren Ausweis mit neuer Adresse (oder die Meldebescheinigung), erteilen eine digitale Vollmacht – und der Zulassungsdienst übernimmt den Rest. Bei DeutscheZulassung dauert das in der Regel ${ZEIT.zulassung}; die aktualisierten Papiere und gegebenenfalls neue Kennzeichen kommen per versichertem Versand.`,
        ],
        list: [
          "Zulassungsbescheinigung Teil I (Fahrzeugschein)",
          "Zulassungsbescheinigung Teil II (Fahrzeugbrief)",
          "Ausweis mit neuer Adresse oder Meldebescheinigung",
          "SEPA-Mandat für die Kfz-Steuer",
          "eVB-Nummer: bei Versichererwechsel nötig, manche Behörden verlangen sie auch sonst",
        ],
      },
    ],
    faq: [
      {
        question: "Welche Frist gilt für die Ummeldung nach dem Umzug?",
        answer:
          "Gesetzlich gilt „unverzüglich“ – eine feste Tagesfrist gibt es nicht. Erledigen Sie die Ummeldung am besten innerhalb der ersten Wochen nach dem Umzug, spätestens zusammen mit der Anmeldung beim Einwohnermeldeamt.",
      },
      {
        question: "Kann ich mein Kennzeichen beim Umzug behalten?",
        answer:
          "Ja, seit 2015 bundesweit. Das Kennzeichen bleibt auch beim Wechsel in einen anderen Zulassungsbezirk bestehen – nur die Adresse in den Papieren wird geändert.",
      },
      {
        question: "Was kostet das Ummelden nach einem Umzug?",
        answer:
          `Am Schalter zahlen Sie amtliche Gebühren von rund 26 – 30 € plus ggf. neue Kennzeichen. Über DeutscheZulassung kostet die Ummeldung ${P.zulassung} inklusive Gebühren und Versand (neue Schilder ggf. zzgl. ${P.kennzeichen}) – ganz ohne Behördentermin.`,
      },
      {
        question: "Muss ich bei der Ummeldung die Versicherung wechseln?",
        answer:
          "Nein. Ihre Kfz-Versicherung bleibt bestehen; teilen Sie ihr nur die neue Adresse mit, da sich durch die Regionalklasse der Beitrag ändern kann. Eine neue eVB-Nummer brauchen Sie bei einem Versichererwechsel; manche Zulassungsbehörden verlangen sie aber auch ohne Wechsel – fordern Sie sie vorsorglich kostenlos an.",
      },
    ],
    relatedServices: ["ummeldung", "adressaenderung", "wunschkennzeichen"],
    relatedGuides: ["kennzeichen-mitnehmen", "was-kostet-eine-kfz-zulassung", "wunschkennzeichen-reservieren"],
    keywords: [
      "Auto ummelden Umzug",
      "Kfz ummelden Frist",
      "Auto ummelden Kosten",
      "Ummeldung andere Stadt",
    ],
  },

  {
    slug: "auto-abmelden-so-gehts",
    title: "Auto abmelden: So geht es (auch online)",
    description:
      "Auto abmelden Schritt für Schritt: Unterlagen, Sicherheitscodes, Kosten und was mit Steuer und Versicherung passiert – auch ohne Behördengang.",
    datePublished: "2026-08-13",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Wann wird ein Fahrzeug abgemeldet?",
        paragraphs: [
          "Die Abmeldung – amtlich Außerbetriebsetzung – beendet die Zulassung eines Fahrzeugs. Typische Anlässe: Verkauf (wenn der Käufer nicht sofort umschreibt), Verschrottung, Diebstahl, längere Standzeit oder die Überführung ins Ausland. Ab dem Tag der Abmeldung enden Kfz-Steuer und Versicherungsbeitrag; beide werden tagesgenau erstattet, ohne dass Sie etwas beantragen müssen.",
        ],
      },
      {
        heading: "Schritt für Schritt: So melden Sie Ihr Auto ab",
        paragraphs: [
          "Für die Abmeldung brauchen Sie weder das Fahrzeug noch einen Termin – nur die Dokumente mit ihren Sicherheitscodes. Seit 2015 tragen Zulassungsbescheinigung Teil I und die Stempelplaketten der Kennzeichen verdeckte Codes, die für die digitale Abmeldung freigelegt werden:",
        ],
        list: [
          "Sicherheitscode auf der Zulassungsbescheinigung Teil I freilegen (Siegel vorsichtig abziehen)",
          "Sicherheitscodes der Stempelplaketten auf beiden Kennzeichen freilegen",
          "Bei Verschrottung: Verwertungsnachweis des zertifizierten Demontagebetriebs bereithalten",
          "Codes und Dokumente fotografieren und an den Zulassungsdienst übermitteln – oder selbst im i-Kfz-Portal abmelden",
          `Abmeldebestätigung erhalten (bei DeutscheZulassung in der Regel ${ZEIT.abmeldung} per E-Mail)`,
        ],
      },
      {
        heading: "Wichtig nach der Abmeldung",
        paragraphs: [
          "Ein abgemeldetes Fahrzeug darf im öffentlichen Verkehrsraum weder gefahren noch geparkt werden – es muss auf privatem Grund stehen. Die entstempelten Kennzeichen können Sie entsorgen, sofern Sie sie nicht für eine Wiederzulassung reservieren lassen. Beim Verkauf gilt: Händigen Sie dem Käufer die Abmeldebestätigung aus und vermerken Sie die Abmeldung im Kaufvertrag.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet die Abmeldung eines Autos?",
        answer:
          `Die amtliche Gebühr liegt online bei ${euroRange(officialFees.deregistrationOnline)} und am Schalter bei ${euroRange(officialFees.deregistrationCounter)}, je nach Behörde. Über DeutscheZulassung kostet die komplette Abwicklung ${P.abmeldung} inklusive Gebühren – meist ${ZEIT.abmeldung} erledigt.`,
      },
      {
        question: "Kann ich ein Auto ohne Kennzeichen abmelden?",
        answer:
          "Ja, etwa nach Diebstahl der Schilder. Dann ist zusätzlich eine Verlusterklärung bzw. die polizeiliche Anzeige nötig. Wir bereiten die erforderlichen Erklärungen für Sie vor.",
      },
      {
        question: "Bekomme ich Steuer und Versicherung nach der Abmeldung zurück?",
        answer:
          "Ja, beides endet mit dem Abmeldetag. Das Hauptzollamt erstattet zu viel gezahlte Kfz-Steuer automatisch, die Versicherung rechnet tagesgenau ab.",
      },
      {
        question: "Wie lange bleibt mein Kennzeichen nach der Abmeldung reserviert?",
        answer:
          "Auf Wunsch reserviert die Zulassungsstelle Ihr Kennzeichen in der Regel bis zu 12 Monate für eine Wiederzulassung. Sagen Sie uns einfach Bescheid, wenn Sie das möchten.",
      },
    ],
    relatedServices: ["abmeldung", "wiederzulassung"],
    relatedGuides: ["was-kostet-eine-kfz-zulassung", "i-kfz-online-zulassung", "auto-verkauft-abmelden", "fahrzeugpapiere-sicherheitscodes"],
    keywords: [
      "Auto abmelden",
      "Kfz abmelden online",
      "Außerbetriebsetzung",
      "Auto abmelden Unterlagen",
    ],
  },

  {
    slug: "evb-nummer",
    title: "eVB-Nummer: Was sie ist und wie Sie sie sofort bekommen",
    description:
      "Die elektronische Versicherungsbestätigung (eVB) einfach erklärt: wofür die 7-stellige Nummer nötig ist, wie Sie sie kostenlos erhalten und wie lange sie gültig ist.",
    datePublished: "2026-08-13",
    dateModified: "2026-08-13",
    sections: [
      {
        heading: "Was ist die eVB-Nummer?",
        paragraphs: [
          "Die eVB-Nummer (elektronische Versicherungsbestätigung) ist ein 7-stelliger Code aus Buchstaben und Ziffern, mit dem Ihre Kfz-Versicherung der Zulassungsbehörde bestätigt, dass für das Fahrzeug eine Haftpflichtversicherung besteht. Ohne gültige eVB führt keine Behörde eine Zulassung durch – sie ist damit neben den Fahrzeugpapieren das wichtigste Dokument jedes Zulassungsvorgangs.",
          "Die Nummer ersetzt die frühere Doppelkarte aus Papier: Die Behörde ruft die hinterlegten Versicherungsdaten elektronisch ab, sobald Sie die eVB angeben.",
        ],
      },
      {
        heading: "So erhalten Sie Ihre eVB – meist in Minuten",
        paragraphs: [
          "Die eVB-Nummer ist kostenlos und unverbindlich. Sie erhalten sie auf drei Wegen: online über die Website oder App Ihres Versicherers (sofort), telefonisch bei der Hotline oder im Rahmen eines Versicherungsvergleichs beim Abschluss eines neuen Vertrags. Die Nummer kommt in der Regel per E-Mail oder SMS und ist je nach Versicherer mehrere Wochen bis Monate gültig.",
          "Wichtig: Die eVB ist zweckgebunden. Für ein Kurzzeitkennzeichen brauchen Sie eine spezielle Kurzzeit-eVB, für ein Saisonkennzeichen muss der Saisonzeitraum zum Vertrag passen. Geben Sie bei der Anforderung deshalb immer an, wofür Sie die eVB benötigen.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet eine eVB-Nummer?",
        answer:
          "Nichts. Die eVB ist eine kostenlose Bestätigung Ihrer Versicherung und verpflichtet Sie nicht zum Vertragsabschluss – bezahlt wird erst die tatsächliche Versicherungsprämie ab Zulassung.",
      },
      {
        question: "Wie lange ist eine eVB-Nummer gültig?",
        answer:
          "Je nach Versicherer meist zwischen einem und sechs Monaten. Ist die Nummer abgelaufen, fordern Sie einfach kostenlos eine neue an.",
      },
      {
        question: "Kann ich mit einer eVB mehrere Fahrzeuge zulassen?",
        answer:
          "Nein, jede eVB gilt für genau einen Zulassungsvorgang bzw. ein Fahrzeug. Für ein zweites Fahrzeug benötigen Sie eine weitere eVB.",
      },
      {
        question: "Brauche ich die eVB auch für die Abmeldung?",
        answer:
          "Nein. Für die Außerbetriebsetzung ist keine Versicherungsbestätigung nötig – die eVB brauchen Sie nur bei An-, Um- und Wiederzulassungen.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "kurzzeitkennzeichen"],
    relatedGuides: ["evb-nummer-erhalten-was-nun", "auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung", "halterwechsel-nach-autokauf"],
    keywords: ["eVB-Nummer", "elektronische Versicherungsbestätigung", "eVB sofort online", "eVB kostenlos"],
  },

  {
    slug: "evb-nummer-erhalten-was-nun",
    title: "eVB-Nummer erhalten – was jetzt?",
    description:
      "Die eVB-Nummer ist da – was nun? Schritt für Schritt von der Versicherungsbestätigung zur fertigen Zulassung: Unterlagen, Wege, Fristen, typische Fehler.",
    datePublished: "2026-08-19",
    dateModified: "2026-08-19",
    sections: [
      {
        heading: "Schritt 1: eVB-Nummer prüfen",
        paragraphs: [
          "Bevor Sie weitermachen, ein kurzer Check der 7-stelligen Nummer: Passt die eVB zum geplanten Vorgang? Eine normale Kfz-eVB gilt nicht für Kurzzeitkennzeichen, und bei Saisonkennzeichen muss der Saisonzeitraum zum Versicherungsvertrag passen. Prüfen Sie außerdem, auf wen die eVB ausgestellt ist – sie muss zum künftigen Halter gehören – und notieren Sie sich, wie lange sie gültig ist: Je nach Versicherer sind das wenige Wochen bis mehrere Monate.",
          "Wichtig zu wissen: Die eVB allein ist noch kein Versicherungsschutz zum Losfahren. Der Schutz beginnt mit der Zulassung des Fahrzeugs – bis dahin ist die eVB nur die Bestätigung, dass Ihre Versicherung einspringen wird.",
        ],
      },
      {
        heading: "Schritt 2: Restliche Unterlagen zusammenstellen",
        paragraphs: [
          "Mit der eVB haben Sie das wichtigste Puzzlestück – für die Zulassung fehlen aber noch ein paar Dokumente:",
        ],
        list: [
          "Personalausweis oder Reisepass (mit Meldebescheinigung)",
          "Zulassungsbescheinigung Teil II (Fahrzeugbrief) bzw. CoC-Papier beim Neuwagen",
          "Zulassungsbescheinigung Teil I und HU-Nachweis beim Gebrauchtwagen",
          "SEPA-Lastschriftmandat für die Kfz-Steuer",
          "Kaufvertrag (bei Umschreibung empfohlen)",
        ],
      },
      {
        heading: "Schritt 3: Zulassungsweg wählen",
        paragraphs: [
          "Jetzt haben Sie drei Möglichkeiten. Erstens der Schaltertermin bei der Zulassungsstelle: der klassische Weg – mit Terminsuche, Anfahrt und Wartezeit. Zweitens die Online-Zulassung über das i-Kfz-Portal Ihrer Behörde: die günstigste Option, aber nur mit Personalausweis mit aktivierter Online-Funktion, Dokumenten mit Sicherheitscodes und funktionierendem ePayment. Drittens ein Zulassungsdienst: Sie senden Fotos Ihrer Unterlagen samt eVB, erteilen eine digitale Vollmacht – und bekommen gestempelte Kennzeichen und Papiere nach Hause geliefert, ohne Termin und ohne eID.",
          `Bei DeutscheZulassung geben Sie die eVB-Nummer einfach im Online-Auftrag oder per WhatsApp an – wir übernehmen ab hier den kompletten Behördenvorgang, in der Regel in ${ZEIT.zulassungDativ}.`,
        ],
      },
      {
        heading: "Nicht zu lange warten – und diese Fehler vermeiden",
        paragraphs: [
          "Die eVB läuft ab: Wer die Zulassung monatelang aufschiebt, braucht irgendwann eine neue Nummer (kostenlos, aber vermeidbarer Aufwand). Drei Fehler sehen wir immer wieder: Erstens Zahlendreher beim Abtippen – die eVB besteht aus Buchstaben und Ziffern, am besten kopieren statt abtippen. Zweitens die falsche eVB-Art, etwa eine normale eVB für ein Kurzzeitkennzeichen. Drittens der Irrglaube, mit eVB dürfe man schon fahren – gefahren wird erst mit gültiger Zulassung und gestempelten Kennzeichen.",
        ],
      },
    ],
    faq: [
      {
        question: "Darf ich mit der eVB-Nummer schon fahren?",
        answer:
          "Nein. Die eVB bestätigt nur, dass Versicherungsschutz ab Zulassung besteht. Gefahren werden darf erst, wenn das Fahrzeug zugelassen ist – mit gestempelten Kennzeichen oder, nach einer i-Kfz-Online-Zulassung, mit dem vorläufigen Zulassungsnachweis.",
      },
      {
        question: "Wie schnell sollte ich die eVB nach Erhalt einlösen?",
        answer:
          `Möglichst zeitnah. Die eVB ist je nach Versicherer nur wenige Wochen bis Monate gültig; eine abgelaufene Nummer müssen Sie kostenlos neu anfordern. Über einen Zulassungsdienst ist die Zulassung meist in ${ZEIT.zulassungDativ} erledigt.`,
      },
      {
        question: "Kann ich dieselbe eVB für ein anderes Fahrzeug verwenden?",
        answer:
          "Nein, jede eVB gilt für genau einen Zulassungsvorgang. Wenn sich das Fahrzeug ändert (z. B. anderer Gebrauchtwagen gekauft), fordern Sie bei Ihrer Versicherung einfach eine neue eVB an.",
      },
      {
        question: "Was passiert nach der Zulassung mit meiner Versicherung?",
        answer:
          "Die Zulassungsbehörde meldet die Zulassung elektronisch an Ihren Versicherer; damit beginnt der Vertrag automatisch. Sie müssen die Versicherung nicht separat informieren – die erste Beitragsrechnung kommt von selbst.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "wiederzulassung"],
    relatedGuides: ["evb-nummer", "auto-anmelden-unterlagen", "i-kfz-online-zulassung", "halterwechsel-nach-autokauf"],
    keywords: [
      "eVB-Nummer erhalten was nun",
      "eVB einlösen",
      "mit eVB Auto anmelden",
      "eVB-Nummer nächste Schritte",
      "wie lange eVB gültig",
    ],
  },

  {
    slug: "i-kfz-online-zulassung",
    title: "i-Kfz: Auto online zulassen – so geht es",
    description:
      "Seit 2023 gehen alle Zulassungsvorgänge online (i-Kfz Stufe 4). Welche Voraussetzungen gelten, wo das Portal an Grenzen stößt und welche Alternativen es gibt.",
    datePublished: "2026-08-13",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Was ist i-Kfz?",
        paragraphs: [
          "i-Kfz („internetbasierte Fahrzeugzulassung“) ist das Online-Portal der Zulassungsbehörden. Seit September 2023 (Ausbaustufe 4) lassen sich damit grundsätzlich alle Vorgänge digital erledigen: Neuzulassung, Umschreibung, Ummeldung, Wiederzulassung und Abmeldung – für Privatpersonen wie Unternehmen. Nach erfolgreicher Online-Zulassung dürfen Sie mit einem vorläufigen Zulassungsnachweis sogar sofort losfahren, bis Plaketten und Dokumente per Post eintreffen.",
        ],
      },
      {
        heading: "Diese Voraussetzungen müssen Sie erfüllen",
        paragraphs: [
          "In der Praxis scheitert die Selbst-Zulassung über i-Kfz häufig an den technischen Voraussetzungen:",
        ],
        list: [
          "Personalausweis (oder eID-Karte) mit aktivierter Online-Funktion und bekannter PIN",
          "AusweisApp plus Smartphone mit NFC oder Kartenlesegerät",
          "Fahrzeugdokumente mit verdeckten Sicherheitscodes (neuere Zulassungsbescheinigungen)",
          "Online-Bezahlung der Gebühren (ePayment der jeweiligen Behörde)",
          "Für Fahrzeuge mit älteren Papieren ohne Sicherheitscode ist der Online-Weg versperrt",
        ],
      },
      {
        heading: "i-Kfz oder Zulassungsdienst – was passt zu wem?",
        paragraphs: [
          "Wenn Sie alle Voraussetzungen erfüllen und sich der Vorgang fehlerfrei durchklicken lässt, ist i-Kfz die günstigste Option. Sobald aber die eID-PIN fehlt, Papiere alt sind, ein Import zugelassen werden soll oder das Portal der jeweiligen Behörde technische Probleme hat, bleibt nur der Schaltertermin – oder ein Zulassungsdienst. Der arbeitet unabhängig von Ihren technischen Voraussetzungen: Sie senden Fotos der Unterlagen und eine Vollmacht, den Rest übernimmt der Dienst bei der Behörde. Für Autohäuser und Fuhrparks mit vielen Vorgängen ist der Dienst ohnehin meist wirtschaftlicher als einzelne Portalvorgänge.",
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich mein Auto komplett online zulassen?",
        answer:
          "Ja, über das i-Kfz-Portal Ihrer Zulassungsbehörde – vorausgesetzt, Sie haben einen Ausweis mit aktivierter Online-Funktion, die passenden Dokumente mit Sicherheitscodes und die Gebühren lassen sich online bezahlen. Alternativ übernimmt ein Zulassungsdienst den Vorgang ohne diese Voraussetzungen.",
      },
      {
        question: "Darf ich nach der Online-Zulassung sofort fahren?",
        answer:
          "Ja. Nach erfolgreichem i-Kfz-Vorgang erhalten Sie einen vorläufigen Zulassungsnachweis zum Ausdrucken und dürfen damit für eine begrenzte Zeit im Inland fahren, bis Plaketten und Papiere per Post ankommen – die Frist steht auf dem Nachweis. Die ungestempelten Kennzeichen müssen dafür bereits montiert sein.",
      },
      {
        question: "Warum funktioniert i-Kfz bei mir nicht?",
        answer:
          "Häufigste Gründe: fehlende oder gesperrte eID-PIN, Fahrzeugpapiere ohne Sicherheitscodes (ältere Dokumente), Importfahrzeuge ohne deutsche Papiere oder technische Störungen im Portal der Behörde. In diesen Fällen bleibt der Schaltertermin oder die Beauftragung eines Zulassungsdienstes.",
      },
    ],
    relatedServices: ["neuzulassung", "abmeldung", "gewerbekunden"],
    relatedGuides: ["auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung", "fahrzeugpapiere-sicherheitscodes"],
    keywords: ["i-Kfz", "Auto online zulassen", "Online-Zulassung Voraussetzungen", "Kfz online anmelden"],
    sources: [
      { label: "Kraftfahrt-Bundesamt: i-Kfz – internetbasierte Fahrzeugzulassung", href: "https://www.kba.de/DE/Themen/ZentraleRegister/Digitale_Fahrzeugzulassung/iKfz/ikfz_node.html" },
      { label: "AusweisApp des Bundes (eID-Funktion)", href: "https://www.ausweisapp.bund.de/" },
      { label: "Fahrzeug-Zulassungsverordnung (FZV)", href: "https://www.gesetze-im-internet.de/fzv_2023/" },
    ],
  },

  {
    slug: "kennzeichen-mitnehmen",
    title: "Kennzeichen mitnehmen: bei Umzug und Autokauf erklärt",
    description:
      "Kennzeichenmitnahme bundesweit: Wann Sie Ihr Kfz-Kennzeichen bei Umzug oder Halterwechsel behalten können, was es kostet und wann sich neue Schilder lohnen.",
    datePublished: "2026-08-13",
    dateModified: "2026-08-13",
    sections: [
      {
        heading: "Kennzeichen behalten – so ist die Rechtslage",
        paragraphs: [
          "Früher bedeutete jeder Umzug in einen anderen Zulassungsbezirk zwingend neue Schilder. Das ist Geschichte: Seit 2015 dürfen Halter ihr Kennzeichen beim Umzug bundesweit mitnehmen, seit Oktober 2019 gilt das auch beim Halterwechsel – der Käufer eines Fahrzeugs kann das bisherige Kennzeichen also einfach behalten, selbst über Bundesländergrenzen hinweg. Voraussetzung ist, dass das Fahrzeug noch zugelassen ist; nach einer Abmeldung wird das Kennzeichen frei und kann nur im selben Bezirk und auf Antrag wieder zugeteilt werden.",
        ],
      },
      {
        heading: "Behalten oder neue Schilder? Eine kurze Entscheidungshilfe",
        paragraphs: [
          "Die Mitnahme spart die Kosten für neue Schilder (ca. 20 – 35 €) und die Montage. Neue Kennzeichen lohnen sich dagegen, wenn Sie ein Wunschkennzeichen möchten, das alte Kennzeichen beschädigt ist oder Sie mit dem Kürzel Ihrer neuen Heimat unterwegs sein möchten. Steuerlich oder versicherungstechnisch macht das Kennzeichen keinen Unterschied – die Regionalklasse Ihrer Versicherung richtet sich nach dem Wohnort, nicht nach dem Schild.",
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich mein Kennzeichen in ein anderes Bundesland mitnehmen?",
        answer:
          "Ja, die Kennzeichenmitnahme gilt bundesweit – sowohl beim Umzug (seit 2015) als auch beim Halterwechsel (seit 2019). Das Fahrzeug muss dafür durchgehend zugelassen bleiben.",
      },
      {
        question: "Kostet die Kennzeichenmitnahme extra?",
        answer:
          "Die amtliche Gebühr der Ummeldung bzw. Umschreibung fällt ohnehin an; die Mitnahme selbst kostet keine nennenswerte Zusatzgebühr. Sie sparen die Kosten für neue Schilder. Bei DeutscheZulassung gilt derselbe Komplettpreis – mit oder ohne Kennzeichenmitnahme.",
      },
      {
        question: "Kann ich mein altes Kennzeichen nach einer Abmeldung wiederbekommen?",
        answer:
          "Nur, wenn Sie es bei der Abmeldung reservieren lassen (in der Regel bis zu 12 Monate) und die Wiederzulassung im selben Zulassungsbezirk erfolgt. Ohne Reservierung kann die Kombination anderweitig vergeben werden.",
      },
    ],
    relatedServices: ["ummeldung", "halterwechsel", "wunschkennzeichen"],
    relatedGuides: ["auto-ummelden-nach-umzug", "was-kostet-eine-kfz-zulassung", "wunschkennzeichen-reservieren", "halterwechsel-nach-autokauf"],
    keywords: [
      "Kennzeichen mitnehmen Umzug",
      "Kennzeichenmitnahme Halterwechsel",
      "Kennzeichen behalten",
      "Nummernschild mitnehmen",
    ],
  },

  {
    slug: "kein-termin-zulassungsstelle",
    title: "Kein Termin bei der Zulassungsstelle?",
    description:
      "Alle Termine bei der Zulassungsstelle ausgebucht? Vier Wege führen trotzdem zur Zulassung – von Storno-Slots über i-Kfz bis zum Zulassungsdienst ohne Termin.",
    datePublished: "2026-08-20",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Warum Termine bei Zulassungsstellen so knapp sind",
        paragraphs: [
          "In vielen Großstädten sind Zulassungstermine Wochen im Voraus ausgebucht: Personalmangel in den Ämtern trifft auf konstant hohe Nachfrage durch Umzüge, Fahrzeugkäufe und Saisongeschäft. Ohne Termin kommt man in den meisten Behörden gar nicht mehr an den Schalter – spontanes Erscheinen führt nur zur Abweisung am Empfang.",
          "Wer ein frisch gekauftes Auto vor der Tür stehen hat oder eine Frist einhalten muss, braucht deshalb einen Plan B. Vier Optionen gibt es – geordnet von „mit Glück“ bis „funktioniert immer“.",
        ],
      },
      {
        heading: "Option 1: Storno-Termine und Nachbar-Standorte",
        paragraphs: [
          "Viele Terminportale geben stornierte Termine ohne Ankündigung wieder frei – oft früh morgens. Wer mehrmals täglich prüft (besonders zwischen 6 und 8 Uhr), erwischt manchmal einen kurzfristigen Slot. In größeren Städten lohnt außerdem der Blick auf alle Standorte der Behörde: Ein weiter entfernter Standort hat oft frühere Termine als der beliebte in der Innenstadt.",
          "Verlassen sollte man sich darauf nicht – es bleibt Glückssache, und der Zeitaufwand für die tägliche Portal-Jagd summiert sich schnell.",
        ],
      },
      {
        heading: "Option 2: Die Online-Zulassung i-Kfz – ganz ohne Termin",
        paragraphs: [
          "Alle Standardvorgänge lassen sich seit 2023 über das i-Kfz-Portal der Behörde online erledigen – ein Termin ist dafür nicht nötig. Der Haken sind die Voraussetzungen: Personalausweis mit aktivierter Online-Funktion samt PIN, Fahrzeugdokumente mit Sicherheitscodes und funktionierende Online-Bezahlung. Scheitert einer dieser Punkte – bei älteren Papieren, Importen oder vergessener eID-PIN –, ist der Weg versperrt.",
        ],
      },
      {
        heading: "Option 3: Zulassungsdienst – der Weg, der immer funktioniert",
        paragraphs: [
          `Ein Zulassungsdienst braucht weder Ihren Termin noch Ihre eID: Sie fotografieren die Unterlagen, erteilen eine digitale Vollmacht, und der Dienst führt den Vorgang bei der Behörde durch – über eigene Zugänge, unabhängig von der öffentlichen Terminvergabe. Bei DeutscheZulassung startet Ihr Vorgang sofort nach Auftragseingang; die Zulassung ist in der Regel in ${ZEIT.zulassungDativ} erledigt, Abmeldungen meist ${ZEIT.abmeldung}.`,
          `Das kostet mit ${P.zulassung} zzgl. ggf. ${P.kennzeichen} für Kennzeichen mehr als der Schalter – dafür entfallen Terminsuche, Anfahrt und Wartezeit vollständig. Gerade wenn das neue Auto schon bezahlt vor der Tür steht, ist das oft der Unterschied zwischen „fährt diese Woche“ und „steht noch einen Monat“.`,
        ],
      },
      {
        heading: "Option 4: Für Eilige – Express-Abwicklung",
        paragraphs: [
          "Wenn es besonders schnell gehen muss – etwa für eine Fahrzeugübergabe oder einen Auslieferungstermin –, kennzeichnen Sie den Auftrag bei uns als eilig: Express-Vorgänge reichen wir bevorzugt ein, je nach Behörde ist die Zulassung dann noch am selben oder nächsten Werktag fertig.",
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich ohne Termin einfach zur Zulassungsstelle gehen?",
        answer:
          "In den meisten Städten nicht mehr – der Zugang ist an gebuchte Termine gebunden, spontane Besucher werden abgewiesen. Nur wenige kleinere Behörden vergeben noch Wartemarken vor Ort.",
      },
      {
        question: "Wie komme ich am schnellsten an einen kurzfristigen Behördentermin?",
        answer:
          "Storno-Slots abpassen: mehrmals täglich das Terminportal prüfen, besonders früh morgens, und alle Standorte der Behörde durchsuchen. Garantien gibt es dabei keine – wer es eilig hat, fährt mit i-Kfz (falls die Voraussetzungen passen) oder einem Zulassungsdienst sicherer.",
      },
      {
        question: "Was kostet die Zulassung ohne eigenen Termin über einen Dienst?",
        answer:
          `Bei DeutscheZulassung ${P.zulassung} inklusive amtlicher Gebühren und Versand, zzgl. ${P.kennzeichen} für neue Kennzeichenschilder – ganz ohne Behördentermin; die Bearbeitung dauert in der Regel ${ZEIT.zulassung} ab vollständigen Unterlagen. Die Abmeldung kostet ${P.abmeldung} und ist meist ${ZEIT.abmeldung} erledigt.`,
      },
      {
        question: "Gilt das auch für meine Stadt?",
        answer:
          "Ja – wir arbeiten mit jeder deutschen Zulassungsbehörde zusammen, von Berlin bis in den kleinsten Landkreis. Auf unseren Stadtseiten finden Sie Details zu den 40 größten Städten.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "abmeldung"],
    relatedGuides: ["i-kfz-online-zulassung", "was-kostet-eine-kfz-zulassung", "auto-anmelden-unterlagen"],
    keywords: [
      "Zulassungsstelle kein Termin",
      "Auto zulassen ohne Termin",
      "Zulassungsstelle Termin ausgebucht",
      "Kfz-Zulassung Termin Alternative",
      "kurzfristiger Termin Zulassungsstelle",
    ],
  },

  {
    slug: "kfz-zulassung-glossar",
    title: "Kfz-Zulassung von A bis Z: Glossar",
    description:
      "eVB, ZB I/II, CoC, HU, i-Kfz, GebOSt: Das Glossar erklärt alle wichtigen Begriffe rund um die Kfz-Zulassung – kurz, verständlich und aktuell.",
    datePublished: "2026-08-13",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Zulassungsbescheinigung Teil I (ZB I)",
        paragraphs: [
          "Der frühere „Fahrzeugschein“. Die ZB I gehört ins Fahrzeug und weist bei Kontrollen nach, dass das Fahrzeug zugelassen ist. Sie enthält die technischen Daten sowie Name und Anschrift des Halters – und seit 2015 einen verdeckten Sicherheitscode für digitale Vorgänge.",
        ],
      },
      {
        heading: "Zulassungsbescheinigung Teil II (ZB II)",
        paragraphs: [
          "Der frühere „Fahrzeugbrief“ und das wichtigste Eigentumsindiz am Fahrzeug. Die ZB II wird zu Hause aufbewahrt (nie im Auto!) und bei Verkauf, Zulassung oder Beleihung benötigt. Bei Verlust verlangt die Behörde eine Versicherung an Eides statt.",
        ],
      },
      {
        heading: "eVB-Nummer",
        paragraphs: [
          "Die 7-stellige elektronische Versicherungsbestätigung Ihrer Kfz-Haftpflicht. Ohne eVB keine Zulassung – Sie erhalten sie kostenlos und meist sofort von Ihrer Versicherung.",
        ],
      },
      {
        heading: "CoC-Papier (Certificate of Conformity)",
        paragraphs: [
          "Die EG-Übereinstimmungsbescheinigung des Herstellers. Sie bestätigt die EU-Typgenehmigung eines Fahrzeugs und wird bei Neuzulassungen und EU-Importen anstelle einer deutschen ZB II vorgelegt.",
        ],
      },
      {
        heading: "HU – Hauptuntersuchung",
        paragraphs: [
          "Die regelmäßige technische Prüfung („TÜV“): beim Neuwagen erstmals nach 3 Jahren, danach alle 2 Jahre. Für Umschreibungen und Wiederzulassungen verlangt die Behörde den Nachweis einer gültigen HU.",
        ],
      },
      {
        heading: "i-Kfz",
        paragraphs: [
          "Die internetbasierte Fahrzeugzulassung der Behörden. Seit Ausbaustufe 4 (September 2023) sind alle Standardvorgänge online möglich – vorausgesetzt, Halter verfügen über eID-Funktion, Sicherheitscodes und Online-Bezahlmöglichkeit.",
        ],
      },
      {
        heading: "Außerbetriebsetzung",
        paragraphs: [
          "Der amtliche Begriff für die Abmeldung eines Fahrzeugs. Mit ihr enden Kfz-Steuer und Versicherungspflicht; das Fahrzeug darf anschließend nicht mehr im öffentlichen Raum stehen oder fahren.",
        ],
      },
      {
        heading: "Sicherheitscode",
        paragraphs: [
          "Verdeckter Code auf ZB I, ZB II und den Stempelplaketten der Kennzeichen. Er wird freigelegt (Siegel bzw. Plakette abziehen), um digitale Vorgänge wie die Online-Abmeldung zu autorisieren. Achtung: Ein freigelegter Code entwertet das jeweilige Dokument.",
        ],
      },
      {
        heading: "GebOSt",
        paragraphs: [
          "Die Gebührenordnung für Maßnahmen im Straßenverkehr – sie regelt, was Behörden für Zulassungsvorgänge berechnen. Deshalb unterscheiden sich die amtlichen Gebühren je nach Vorgang und Kommune innerhalb festgelegter Rahmen.",
        ],
      },
      {
        heading: "SEPA-Mandat (Kfz-Steuer)",
        paragraphs: [
          "Die Einzugsermächtigung für die Kfz-Steuer zugunsten des Hauptzollamts. Ohne SEPA-Mandat nimmt die Zulassungsbehörde keine An- oder Ummeldung vor.",
        ],
      },
    ],
    faq: [
      {
        question: "Was ist der Unterschied zwischen Fahrzeugschein und Fahrzeugbrief?",
        answer:
          "Der Fahrzeugschein (heute Zulassungsbescheinigung Teil I) gehört ins Auto und belegt die Zulassung. Der Fahrzeugbrief (Teil II) ist das Eigentumsdokument und wird sicher zu Hause aufbewahrt.",
      },
      {
        question: "Was bedeutet Umschreibung?",
        answer:
          "Die Umschreibung (Halterwechsel) überträgt die Zulassung eines Fahrzeugs auf eine neue Halterin oder einen neuen Halter – der Standardvorgang nach jedem Gebrauchtwagenkauf.",
      },
    ],
    relatedServices: ["neuzulassung", "abmeldung", "halterwechsel"],
    relatedGuides: ["auto-anmelden-unterlagen", "evb-nummer", "i-kfz-online-zulassung", "fahrzeugpapiere-sicherheitscodes"],
    keywords: ["Kfz-Zulassung Begriffe", "Zulassungsbescheinigung erklärt", "Fahrzeugbrief Fahrzeugschein Unterschied"],
  },

  {
    slug: "fahrzeugpapiere-sicherheitscodes",
    title: "Fahrzeugpapiere und Sicherheitscodes erklärt",
    description:
      "Zulassungsbescheinigung Teil I und II und Kennzeichen-Plaketten: wo die Sicherheitscodes sitzen, wann Sie sie brauchen und was bei alten Papieren gilt.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Zulassungsbescheinigung Teil I und Teil II: Was ist was?",
        paragraphs: [
          "Seit Oktober 2005 heißen die Fahrzeugpapiere in Deutschland Zulassungsbescheinigung Teil I und Teil II. Sie haben Fahrzeugschein und Fahrzeugbrief abgelöst, damit die Dokumente EU-weit einheitlich und schwerer zu fälschen sind. Im Alltag sind die alten Namen geblieben – gemeint sind dieselben Papiere.",
          "Die Zulassungsbescheinigung Teil I (ZB I) gehört ins Fahrzeug: Wer fährt, muss sie mitführen und bei einer Kontrolle aushändigen. Sie enthält Halterdaten, Kennzeichen und die wichtigsten technischen Angaben. Mit der Zulassungsbescheinigung Teil II (ZB II) weisen Sie dagegen nach, dass Sie über das Fahrzeug verfügen dürfen. Sie wird bei der Zulassung, beim Halterwechsel und beim Verkauf gebraucht und gehört sicher nach Hause – nicht ins Handschuhfach.",
        ],
        table: {
          headers: ["Merkmal", "Teil I (Fahrzeugschein)", "Teil II (Fahrzeugbrief)"],
          rows: [
            ["Aufbewahrung", "im Fahrzeug mitführen", "sicher zu Hause"],
            ["Zweck", "Nachweis der Zulassung bei Kontrollen", "Nachweis der Verfügungsberechtigung"],
            ["Verdeckter Sicherheitscode", "in der Regel auf Exemplaren ab 2015", "in der Regel auf Exemplaren ab 2018"],
            ["Gebraucht bei", "Abmeldung, Umschreibung, Ummeldung, Wiederzulassung", "Erstzulassung, Halterwechsel, meist auch Wiederzulassung"],
          ],
        },
        image: {
          src: "/images/zb1-zb2-dokumente.webp",
          alt: "Zulassungsbescheinigung Teil I und Teil II nebeneinander auf einem Tisch",
          caption:
            "Der kleine Fahrzeugschein (Teil I) fährt mit, der größere Fahrzeugbrief (Teil II) bleibt zu Hause.",
        },
      },
      {
        heading: "Wo sitzen die Sicherheitscodes auf den Papieren?",
        paragraphs: [
          "Für Online-Vorgänge tragen die Dokumente verdeckte Sicherheitscodes. Die Fahrzeug-Zulassungsverordnung nennt drei Arten: den Code auf der ZB I, den Code auf der ZB II und den Code unter der Stempelplakette des Kennzeichens (§ 21 FZV). Mit ihnen belegen Sie im internetbasierten Verfahren, dass Sie die Papiere tatsächlich besitzen beziehungsweise das Kennzeichen entstempelt haben.",
          "Auf der ZB I steht eine Druckstücknummer, darunter liegt das verdeckte Codefeld. Die Abdeckung trägt den Hinweis „Nur für internetbasierte Zulassungsverfahren freilegen. Dokument nur unbeschädigt gültig.“ Auf der ZB II verdeckt ebenfalls ein Abdeckfeld den Code. Freigelegt wird je nach Ausführung durch vorsichtiges Abziehen oder Freirubbeln – und zwar unumkehrbar: Unter der Abdeckung erscheint der Schriftzug „Dokument nicht mehr gültig“.",
        ],
        image: {
          src: "/images/sicherheitscode-zb1.webp",
          alt: "Freigelegtes Sicherheitscode-Feld auf einer Zulassungsbescheinigung Teil I, daneben eine Ein-Euro-Münze",
          caption:
            "Beispielbild: Unter der silbernen Abdeckung der ZB I kommt der Sicherheitscode zum Vorschein. Nach dem Freilegen gilt das Dokument als entwertet.",
        },
      },
      {
        heading: "Der Code unter der Kennzeichen-Plakette",
        paragraphs: [
          "Auch die Stempelplakette auf dem Kennzeichen trägt einen verdeckten Code. Die Plakette zeigt das Landeswappen sowie die Bezeichnung von Land und Zulassungsbehörde und ist so befestigt, dass sie beim Entfernen zerstört wird. Gebraucht werden die Plakettencodes vor allem bei der Online-Abmeldung und bei einem Kennzeichenwechsel – sie belegen dann die Entstempelung.",
          "Wichtig: Sobald der Code einer Plakette sichtbar ist, gilt das Kennzeichen als ungestempelt (§ 21 Abs. 3 FZV). Mit dem Fahrzeug darf dann nicht mehr am Straßenverkehr teilgenommen werden. Legen Sie Plakettencodes deshalb erst frei, wenn das Auto auf privatem Grund steht und die Abmeldung wirklich erfolgen soll.",
        ],
        image: {
          src: "/images/sicherheitscode-kennzeichen.webp",
          alt: "Teilweise abgelöste Stempelplakette auf einem Kfz-Kennzeichen, darunter ein Zahlencode und ein Datamatrix-Code",
          caption:
            "Beispielbild: Unter der Stempelplakette liegt der Plakettencode. Jede Plakette hat ihren eigenen Code.",
        },
      },
      {
        heading: "Wann brauchen Sie welchen Code?",
        paragraphs: [
          "Die Codes sind ausschließlich für internetbasierte Verfahren gedacht, also für Vorgänge über das i-Kfz-Portal der Behörden. Am Schalter legen Sie die Originaldokumente und gegebenenfalls die Kennzeichen vor – freilegen müssen Sie dort nichts. Welche Codes ein Online-Vorgang verlangt, hängt vom Anlass ab (siehe Tabelle).",
          "Nach Abschluss eines Online-Vorgangs sind die genutzten Dokumente entwertet; bei einer Zulassung kommen neue Papiere und Plaketten per Post. Nach einer Online-Abmeldung sollten Sie die entwertete ZB I trotzdem aufheben: Für eine spätere Wiederzulassung wird sie wieder gebraucht.",
          "Der digitale Fahrzeugschein in der i-Kfz-App ändert daran nichts. Laut Kraftfahrt-Bundesamt ersetzt er im Zulassungsprozess die ZB I aus Papier nicht, weil nur das Papierdokument den Sicherheitscode enthält.",
        ],
        table: {
          headers: ["Vorgang (online)", "Benötigte Codes"],
          rows: [
            ["Abmeldung", "ZB I und Plakettencodes der Kennzeichen"],
            ["Halterwechsel / Umschreibung", "ZB I und ZB II"],
            ["Kennzeichenwechsel", "zusätzlich Plakettencode des bisherigen Kennzeichens"],
            ["Wiederzulassung", "ZB I, bei neuem Halter auch ZB II"],
            ["Erstzulassung", "ZB II"],
          ],
        },
      },
      {
        heading: "Alte Papiere ohne Code oder beschädigter Code – was nun?",
        paragraphs: [
          "Ältere Fahrzeugscheine und -briefe bleiben gültig, bis am Fahrzeug eine Änderung eingetragen wird, etwa ein Halterwechsel. Einen Sicherheitscode haben sie aber nicht. Fehlt das Codefeld, ist der jeweilige Vorgang über das i-Kfz-Portal nicht möglich; er läuft dann über die Zulassungsbehörde vor Ort oder über einen Zulassungsdienst mit Vollmacht.",
          "Ein beschädigtes oder versehentlich freigelegtes Codefeld macht das Dokument ungültig. Wenden Sie sich in diesem Fall an Ihre Zulassungsbehörde. Für die ZB II sieht die Verordnung vor, dass bei Beschädigung eine neue Bescheinigung ausgestellt und die alte entwertet wird. Ist an einer Plakette der Code sichtbar geworden, klären Sie mit der Behörde, wie es weitergeht, bevor Sie wieder fahren.",
          "Damit es gar nicht erst so weit kommt, helfen ein paar einfache Regeln:",
        ],
        list: [
          "Codes erst freilegen, wenn der konkrete Vorgang unmittelbar ansteht",
          "vorher prüfen, ob das Codefeld vorhanden und unbeschädigt ist",
          "freigelegte Codes vollständig und gut lesbar fotografieren",
          "entwertete Papiere aufbewahren, bis der Vorgang abgeschlossen ist",
        ],
      },
      {
        heading: "Sicherheitscodes und Zulassungsdienst",
        paragraphs: [
          `Wenn Sie DeutscheZulassung beauftragen, brauchen Sie keinen Personalausweis mit Online-Funktion. Sie senden Handyfotos Ihrer Unterlagen und erteilen uns eine Vollmacht; wir reichen den Vorgang bei der zuständigen Behörde ein, die über die Zulassung entscheidet. Für die Abmeldung genügen in der Regel Fotos der ZB I und der Plakettencodes. Sie kostet ${P.abmeldung} inklusive amtlicher Gebühren und ist meist ${ZEIT.abmeldung} erledigt.`,
          "Unsicher, ob Ihre Papiere einen Code haben oder ob Sie ihn schon freilegen sollten? Fragen Sie uns vorher – Montag bis Freitag von 8 bis 18 Uhr. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung.",
        ],
      },
    ],
    faq: [
      {
        question: "Wo finde ich den Sicherheitscode im Fahrzeugschein?",
        answer:
          "Auf der Zulassungsbescheinigung Teil I liegt der Code unter einem verdeckten Feld mit dem Hinweis, es nur für internetbasierte Zulassungsverfahren freizulegen. Fehlt ein solches Feld, wurde Ihr Dokument vermutlich vor 2015 ausgestellt und hat keinen Code.",
      },
      {
        question: "Darf ich den Sicherheitscode schon vorab freilegen?",
        answer:
          "Besser nicht. Das Freilegen ist unumkehrbar und entwertet das Dokument beziehungsweise die Plakette. Bei einer Plakette gilt das Kennzeichen danach als ungestempelt, das Auto darf nicht mehr fahren. Legen Sie Codes erst frei, wenn der Vorgang unmittelbar ansteht.",
      },
      {
        question: "Brauche ich die Codes auch bei einem Termin in der Zulassungsstelle?",
        answer:
          "Nein. Die Sicherheitscodes sind für Online-Verfahren gedacht. Am Schalter legen Sie die Dokumente und gegebenenfalls die gestempelten Kennzeichen im Original vor.",
      },
      {
        question: "Mein Fahrzeugbrief hat keinen Sicherheitscode – ist er ungültig?",
        answer:
          "Nein. Ältere Fahrzeugbriefe und Zulassungsbescheinigungen bleiben gültig, bis eine Änderung eingetragen wird. Ohne Code ist nur der Online-Weg über i-Kfz versperrt; der Vorgang lässt sich bei der Behörde oder über einen Zulassungsdienst erledigen.",
      },
      {
        question: "Ersetzt der digitale Fahrzeugschein die Papiere?",
        answer:
          "Im Zulassungsprozess nicht. Nach Angaben des Kraftfahrt-Bundesamts enthält nur die Papierform der ZB I den Sicherheitscode. Für Online-Vorgänge brauchen Sie deshalb weiterhin das Papierdokument.",
      },
    ],
    relatedServices: ["abmeldung", "halterwechsel", "ersatz-dokumente"],
    relatedGuides: ["auto-abmelden-so-gehts", "i-kfz-online-zulassung", "auto-verkauft-abmelden", "kfz-zulassung-glossar"],
    keywords: [
      "Sicherheitscode Fahrzeugschein",
      "Sicherheitscode Zulassungsbescheinigung Teil II",
      "Sicherheitscode Kennzeichen Plakette",
      "Zulassungsbescheinigung Teil I und II",
      "Fahrzeugpapiere ohne Sicherheitscode",
    ],
    sources: [
      { label: "Bundesministerium für Verkehr: Internetbasierte Fahrzeugzulassung (i-Kfz)", href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/internetbasierte-fahrzeugzulassung.html" },
      { label: "Kraftfahrt-Bundesamt: Zulassungsdokumente (Glossar)", href: "https://www.kba.de/SharedDocs/Glossareintraege/DE/Z/Zulassungsdokumente.html" },
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 21 Sicherheitscodes", href: "https://www.gesetze-im-internet.de/fzv_2023/__21.html" },
    ],
  },

  {
    slug: "halterwechsel-nach-autokauf",
    title: "Halterwechsel nach dem Autokauf: Pflichten und Ablauf",
    description:
      "Gebrauchtwagen gekauft? Was Käufer und Verkäufer beim Halterwechsel tun müssen, welche Unterlagen nötig sind und wie es mit Kennzeichen, eVB und Steuer läuft.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Wer muss nach dem Kauf was tun?",
        paragraphs: [
          "Mit dem Kauf eines Gebrauchtwagens wechselt nicht automatisch der Halter im Fahrzeugregister. Dafür muss das Fahrzeug auf Sie umgeschrieben werden. Die Fahrzeug-Zulassungsverordnung verteilt die Pflichten auf beide Seiten (§ 15 Abs. 5 FZV): Der Käufer beantragt die Umschreibung, der Verkäufer meldet den Verkauf – es sei denn, der Käufer hat seine Pflichten bereits erfüllt.",
        ],
        table: {
          headers: ["Wer", "Was ist zu tun?"],
          rows: [
            ["Käufer", "bei der Zulassungsbehörde des eigenen Wohnsitzes oder Firmensitzes die Umschreibung beantragen: neue Halterdaten melden, neue ZB I mit Versicherungsnachweis beantragen, ZB II vorlegen, neues Kennzeichen beantragen oder das bisherige weiterführen"],
            ["Verkäufer", "den Verkauf der Zulassungsbehörde mitteilen – mit Kennzeichen, Name und Anschrift des Käufers sowie dessen Bestätigung, die Zulassungsbescheinigung erhalten zu haben"],
            ["Beide", "Kaufvertrag schriftlich festhalten, Papiere und Schlüssel vollständig übergeben, den Verkauf der Kfz-Versicherung anzeigen (einer von beiden genügt)"],
          ],
        },
      },
      {
        heading: "Gibt es eine feste Frist für die Umschreibung?",
        paragraphs: [
          "Eine Frist in Tagen nennt die Verordnung nicht. Käufer und Verkäufer müssen ihren Pflichten „unverzüglich“ nachkommen, also ohne schuldhaftes Zögern. Praktisch heißt das: Kümmern Sie sich direkt nach der Übergabe um die Umschreibung, sobald eVB-Nummer und Unterlagen beisammen sind.",
          "Wer das verschleppt, riskiert mehr als Ärger mit dem Verkäufer. Bleibt die Umschreibung aus, kann die Zulassungsbehörde selbst tätig werden; am Ende kann die Zulassung erlöschen. Und solange Sie nicht als Halter eingetragen sind, läuft die Kfz-Steuer weiter auf den Verkäufer – ein häufiger Anlass für Rückfragen zwischen den Parteien.",
        ],
      },
      {
        heading: "Diese Unterlagen brauchen Sie",
        paragraphs: [
          "Für die Umschreibung eines noch zugelassenen Gebrauchtwagens verlangen die Zulassungsbehörden typischerweise die folgenden Unterlagen. Ein Kaufvertrag ist nicht überall Pflicht, als Nachweis für beide Seiten aber dringend zu empfehlen. Beachten Sie außerdem: Offene Kfz-Steuer- oder Gebührenrückstände des neuen Halters können eine Umschreibung blockieren.",
        ],
        list: [
          "Zulassungsbescheinigung Teil I und Teil II vom Verkäufer",
          "Personalausweis, alternativ Reisepass mit Meldebescheinigung",
          "eVB-Nummer Ihrer Kfz-Versicherung, ausgestellt auf Sie als künftigen Halter",
          "SEPA-Lastschriftmandat für die Kfz-Steuer",
          "gültige Hauptuntersuchung – einen Prüfbericht nur, wenn die nächste HU nicht aus der ZB I hervorgeht",
          "bei Vertretung: Vollmacht mit Ausweis des Vollmachtgebers",
          "bei Firmen zusätzlich Handelsregisterauszug bzw. Gewerbeanmeldung",
        ],
      },
      {
        heading: "Kennzeichen übernehmen oder neue Schilder?",
        paragraphs: [
          "Seit dem 1. Oktober 2019 können Sie das bisherige Kennzeichen beim Halterwechsel bundesweit übernehmen – auch wenn Sie in einem anderen Zulassungsbezirk wohnen als der Verkäufer. Voraussetzung ist, dass das Auto noch zugelassen ist. Wurde es bereits abgemeldet, erhalten Sie in der Regel ein neues Kennzeichen.",
          `Die Übernahme spart neue Schilder und deren Montage. Neue Kennzeichen lohnen sich, wenn Sie lieber das Kürzel Ihres Wohnorts fahren, ein Wunschkennzeichen möchten oder die alten Schilder beschädigt sind. Bei DeutscheZulassung legen Sie das bei der Beauftragung fest: Schilder liefern wir auf Wunsch für ${P.kennzeichen} pro Paar mit, alternativ lassen Sie sie beim Schildermacher prägen oder behalten das bisherige Kennzeichen.`,
        ],
      },
      {
        heading: "Versicherung, eVB und Kfz-Steuer",
        paragraphs: [
          "Für die Umschreibung brauchen Sie eine eVB-Nummer, deren Daten zu Ihnen als neuem Halter passen. Eine eVB auf den Namen einer anderen Person funktioniert nur, wenn der Versicherer einen abweichenden Halter ausdrücklich zulässt.",
          "Rechtlich geht die bestehende Kfz-Versicherung des Verkäufers mit dem Verkauf zunächst auf Sie über (§§ 95, 122 VVG). Sie können diesen Vertrag innerhalb eines Monats nach dem Erwerb kündigen (§ 96 VVG). Der Verkauf ist dem Versicherer unverzüglich anzuzeigen; das kann der Verkäufer oder der Käufer übernehmen (§ 97 VVG). Die Verkaufsmeldung an die Zulassungsbehörde ersetzt diese Anzeige nicht.",
          "Die Kfz-Steuer des Verkäufers endet laut Zoll mit dem Datum der Umschreibung auf Sie; ab dann sind Sie steuerpflichtig. Eingezogen wird sie vom Hauptzollamt per SEPA-Lastschrift. Die Zulassungsbehörde übermittelt die Daten selbst – einen eigenen Antrag beim Zoll müssen Sie nicht stellen.",
        ],
      },
      {
        heading: "Typische Fehler beim Halterwechsel",
        paragraphs: [
          "Die meisten Verzögerungen entstehen durch Kleinigkeiten, die sich vorab leicht prüfen lassen:",
        ],
        list: [
          "ZB II nicht übergeben – ohne Fahrzeugbrief keine Umschreibung",
          "eVB auf eine andere Person ausgestellt als den künftigen Halter",
          "HU abgelaufen oder Fälligkeit nicht aus den Papieren ersichtlich",
          "Ausweis mit alter Adresse ohne aktuelle Meldebescheinigung",
          "Sicherheitscodes vorschnell freigelegt, obwohl der Vorgang nicht online läuft",
          "mit den Kennzeichen des Verkäufers weitergefahren, ohne Versicherung und Haftung schriftlich zu klären",
        ],
      },
      {
        heading: "Umschreibung ohne Behördentermin",
        paragraphs: [
          "Sie können die Umschreibung auch DeutscheZulassung übertragen. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung. Handyfotos der Unterlagen genügen für den Start, eine Vollmacht regelt die Vertretung bei der Behörde, und einen Personalausweis mit Online-Funktion brauchen Sie nicht.",
          `Der Halterwechsel kostet ${P.zulassung} inklusive amtlicher Gebühren und Versand. In der Regel ist er ${ZEIT.zulassung} nach Eingang der vollständigen Unterlagen erledigt, dazu kommt die Versanddauer. Über die Zulassung selbst entscheidet die Behörde.`,
        ],
      },
    ],
    faq: [
      {
        question: "Wie schnell muss ich ein gekauftes Auto umschreiben?",
        answer:
          "Die FZV verlangt, dass Sie die Umschreibung unverzüglich beantragen. Eine feste Tagesfrist nennt sie nicht. Erledigen Sie es direkt nach dem Kauf – auch im Interesse des Verkäufers, für den sonst die Kfz-Steuer weiterläuft.",
      },
      {
        question: "Muss der Verkäufer den Verkauf melden, wenn ich umschreibe?",
        answer:
          "Seine Meldepflicht entfällt, wenn der Käufer seine Pflichten bereits erfüllt hat. Da der Verkäufer meist nicht weiß, wann Sie umschreiben, ist eine zeitnahe Verkaufsmeldung für ihn trotzdem sinnvoll.",
      },
      {
        question: "Kann ich das Kennzeichen des Verkäufers behalten?",
        answer:
          "Ja, seit Oktober 2019 bundesweit, solange das Fahrzeug noch zugelassen ist. Sie geben bei der Umschreibung an, dass Sie das bisherige Kennzeichen weiterführen möchten.",
      },
      {
        question: "Brauche ich für die Umschreibung einen Kaufvertrag?",
        answer:
          "Nicht jede Behörde verlangt ihn. Für beide Seiten ist er trotzdem wichtig: Er dokumentiert Zeitpunkt der Übergabe, Kilometerstand und übergebene Papiere – und hilft, wenn später Fragen zu Bußgeldern oder Steuer auftauchen.",
      },
      {
        question: "Was kostet ein Halterwechsel?",
        answer:
          `Die amtlichen Gebühren hängen von Behörde, Verfahren und Kennzeichenwahl ab; neue Schilder kommen gegebenenfalls dazu. Über DeutscheZulassung kostet der Halterwechsel ${P.zulassung} inklusive amtlicher Gebühren und Versand, neue Schilder auf Wunsch zzgl. ${P.kennzeichen}.`,
      },
    ],
    relatedServices: ["halterwechsel", "wunschkennzeichen", "kurzzeitkennzeichen"],
    relatedGuides: ["auto-verkauft-abmelden", "kennzeichen-mitnehmen", "evb-nummer", "fahrzeugpapiere-sicherheitscodes"],
    keywords: [
      "Halterwechsel Auto",
      "Auto umschreiben nach Kauf",
      "Gebrauchtwagen ummelden",
      "Umschreibung Unterlagen",
      "Halterwechsel Frist",
    ],
    sources: [
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 15 Mitteilungspflichten bei Änderungen", href: "https://www.gesetze-im-internet.de/fzv_2023/__15.html" },
      { label: "Zoll: Beginn und Ende der Kfz-Steuerpflicht", href: "https://www.zoll.de/DE/Privatpersonen/Kraftfahrzeugsteuer/Beginn-und-Ende-der-Steuerpflicht/beginn-und-ende-der-steuerpflicht_node.html" },
      { label: "Service Berlin: Kraftfahrzeug – Umschreibung beantragen", href: "https://service.berlin.de/dienstleistung/329036/" },
      { label: "Bundesministerium für Verkehr: Überblick über die Kraftfahrzeugkennzeichen", href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/ueberblick-ueber-die-kraftfahrzeugkennzeichen" },
    ],
  },

  {
    slug: "auto-verkauft-abmelden",
    title: "Auto verkauft: abmelden oder angemeldet übergeben?",
    description:
      "Vor dem Verkauf abmelden oder angemeldet übergeben? Vor- und Nachteile, Pflichten des Verkäufers, Verkaufsmeldung, Kaufvertrag und Kurzzeitkennzeichen.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Zwei Wege beim Autoverkauf",
        paragraphs: [
          "Wer sein Auto privat verkauft, steht vor einer Grundsatzfrage: Melden Sie es vor der Übergabe ab, oder übergeben Sie es zugelassen und überlassen die Umschreibung dem Käufer? Beides ist erlaubt. Die Wege unterscheiden sich darin, wie lange Sie noch als Halter im Register stehen – und damit, wer für Steuer, Versicherung und mögliche Verkehrsverstöße angesprochen wird.",
          "Dieser Artikel hilft bei der Entscheidung. Wie die Abmeldung selbst abläuft und welche Unterlagen dafür nötig sind, lesen Sie im Ratgeber „Auto abmelden: So geht es“.",
        ],
        table: {
          headers: ["Kriterium", "Vor dem Verkauf abmelden", "Angemeldet verkaufen"],
          rows: [
            ["Kfz-Steuer", "endet mit der Abmeldung", "läuft bis zur Umschreibung durch den Käufer auf Sie weiter"],
            ["Versicherung", "Beiträge enden mit der Abmeldung", "Vertrag geht auf den Käufer über, die laufende Prämie schulden beide gemeinsam"],
            ["Fahrten des Käufers", "erst nach neuer Zulassung oder mit Kurzzeitkennzeichen", "sofort möglich – Sie bleiben aber eingetragener Halter"],
            ["Ihr Aufwand", "Abmeldung vor der Übergabe", "Verkaufsmeldung an die Behörde, Anzeige an die Versicherung"],
          ],
        },
      },
      {
        heading: "Variante 1: Vor dem Verkauf abmelden",
        paragraphs: [
          "Die Abmeldung vor der Übergabe ist der Weg mit dem klarsten Schnitt. Ab dem Tag der Außerbetriebsetzung zahlen Sie weder Kfz-Steuer noch Versicherungsbeiträge, und mit Ihrem Kennzeichen kann niemand mehr fahren. Eine Verkaufsmeldung an die Behörde entfällt, weil die Meldepflicht für bereits abgemeldete Fahrzeuge nicht gilt.",
          "Der Nachteil liegt beim Käufer: Ein abgemeldetes Auto darf nicht am öffentlichen Straßenverkehr teilnehmen. Für Probefahrt und Heimweg braucht er ein Kurzzeitkennzeichen, einen Transport auf dem Anhänger oder eine Zulassung auf seinen Namen, bevor er das Auto abholt. Planen Sie das bei Preisverhandlung und Übergabetermin mit ein.",
          `Übergeben Sie dem Käufer alle Papiere: beide Teile der Zulassungsbescheinigung – auch eine nach der Online-Abmeldung entwertete ZB I, denn sie wird für die spätere Wiederzulassung gebraucht – sowie die Abmeldebestätigung. Die Abmeldung selbst übernimmt DeutscheZulassung für ${P.abmeldung} inklusive amtlicher Gebühren, meist ${ZEIT.abmeldung}.`,
        ],
      },
      {
        heading: "Variante 2: Angemeldet verkaufen mit Verkaufsmeldung",
        paragraphs: [
          "Übergeben Sie das Auto zugelassen, kann der Käufer sofort losfahren und das Fahrzeug anschließend auf sich umschreiben – auf Wunsch mit Ihrem bisherigen Kennzeichen. Für Sie bedeutet das: Bis zur Umschreibung stehen Sie weiterhin als Halter im Register.",
          "Die Fahrzeug-Zulassungsverordnung verpflichtet Sie als Verkäufer, den Verkauf unverzüglich der Zulassungsbehörde mitzuteilen, sofern der Käufer nicht bereits umgeschrieben hat (§ 15 Abs. 5 FZV). Die Mitteilung, oft Veräußerungsanzeige genannt, muss enthalten:",
        ],
        list: [
          "das Kennzeichen des Fahrzeugs",
          "Vor- und Familienname sowie vollständige Anschrift des Käufers",
          "die Bestätigung des Käufers, dass er die Zulassungsbescheinigung erhalten hat",
        ],
      },
      {
        heading: "Was die Verkaufsmeldung nicht leistet",
        paragraphs: [
          "Die Verkaufsmeldung ist wichtig, regelt aber nicht alles. Die Kfz-Steuer läuft weiter, bis der Käufer das Auto auf sich umgeschrieben hat oder es außer Betrieb gesetzt ist – maßgeblich ist laut Zoll das Datum der Umschreibung. Schreibt der Käufer nicht um, kann die Zulassungsbehörde tätig werden, und am Ende kann die Zulassung erlöschen. Bis dahin vergeht jedoch Zeit.",
          "Auch Ihre Versicherung erfährt über die Behörde nichts. Den Verkauf müssen Sie oder der Käufer dem Versicherer selbst anzeigen, und zwar unverzüglich (§ 97 VVG). Der Vertrag geht mit dem Verkauf auf den Käufer über; für die Prämie der laufenden Versicherungsperiode haften Sie und der Käufer gemeinsam (§ 95 VVG).",
          "Viele Zulassungsbehörden stellen für die Verkaufsmeldung ein eigenes Formular bereit; in Berlin etwa geht sie online und ist gebührenfrei. Bewahren Sie eine Kopie der Meldung samt Sendebestätigung auf.",
        ],
      },
      {
        heading: "Der Kaufvertrag als Absicherung",
        paragraphs: [
          "Unabhängig vom gewählten Weg gehört jeder Privatverkauf in einen schriftlichen Kaufvertrag. Beim angemeldeten Verkauf ist er Ihr wichtigster Beleg, wenn später Post zu Parkverstößen, Blitzerfotos oder Steuer eintrifft. Halten Sie mindestens fest:",
        ],
        list: [
          "Datum und Uhrzeit der Übergabe",
          "Kennzeichen, Fahrzeug-Identifizierungsnummer und Kilometerstand",
          "Name, Anschrift und Ausweisnummer des Käufers",
          "übergebene Papiere und Anzahl der Schlüssel",
          "ob das Fahrzeug abgemeldet oder zugelassen übergeben wird",
          "bei zugelassener Übergabe die Zusage des Käufers, unverzüglich umzuschreiben",
        ],
      },
      {
        heading: "Kurzzeitkennzeichen: So kommt der Käufer nach Hause",
        paragraphs: [
          "Haben Sie vor dem Verkauf abgemeldet, ist das Kurzzeitkennzeichen für den Käufer die naheliegende Lösung. Es ist für Probe- und Überführungsfahrten gedacht, gilt nur für das Fahrzeug, für das es zugeteilt wurde, und läuft spätestens am Ende des fünften Tages nach der Zuteilung ab (§ 42 FZV). Voraussetzung sind eine Haftpflichtversicherung – in der Praxis eine eigene eVB für Kurzzeitkennzeichen – und grundsätzlich eine gültige Hauptuntersuchung. Ohne HU sind nur eng begrenzte Fahrten erlaubt, etwa zur Prüfstelle.",
          `Alternativ lässt der Käufer das Auto mit den übergebenen Papieren direkt auf sich zu und holt es mit gestempelten Kennzeichen ab. Auch das kann er über DeutscheZulassung erledigen: Die Wiederzulassung auf den neuen Halter kostet ${P.zulassung} inklusive amtlicher Gebühren und Versand; Kurzzeitkennzeichen organisieren wir auf Anfrage. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung.`,
        ],
      },
    ],
    faq: [
      {
        question: "Muss ich mein Auto vor dem Verkauf abmelden?",
        answer:
          "Nein. Sie dürfen es auch zugelassen übergeben. Dann müssen Sie den Verkauf aber unverzüglich der Zulassungsbehörde melden, und die Kfz-Steuer läuft bis zur Umschreibung durch den Käufer weiter auf Sie.",
      },
      {
        question: "Endet meine Steuerpflicht mit der Verkaufsmeldung?",
        answer:
          "Nein. Maßgeblich ist das Datum der Umschreibung auf den Käufer oder die Abmeldung. Die Verkaufsmeldung sorgt vor allem dafür, dass die Behörde den Käufer kennt und tätig werden kann, falls er nicht umschreibt.",
      },
      {
        question: "Was muss in der Veräußerungsanzeige stehen?",
        answer:
          "Das Kennzeichen, Vor- und Familienname sowie vollständige Anschrift des Käufers und seine Bestätigung, die Zulassungsbescheinigung erhalten zu haben. Viele Zulassungsbehörden bieten dafür ein eigenes Formular an.",
      },
      {
        question: "Muss ich meiner Versicherung den Verkauf melden?",
        answer:
          "Ja. Die Zulassungsbehörde leitet die Verkaufsmeldung nicht an den Versicherer weiter. Zeigen Sie den Verkauf deshalb selbst unverzüglich an – das kann auch der Käufer übernehmen.",
      },
      {
        question: "Was kann ich tun, wenn der Käufer nicht umschreibt?",
        answer:
          "Haben Sie den Verkauf gemeldet, kann die Zulassungsbehörde gegenüber dem neuen Eigentümer tätig werden. Halten Sie Kaufvertrag und Meldung bereit und fragen Sie bei der Behörde nach. Mit einer Abmeldung vor der Übergabe vermeiden Sie dieses Risiko von vornherein.",
      },
    ],
    relatedServices: ["abmeldung", "kurzzeitkennzeichen", "wiederzulassung"],
    relatedGuides: ["auto-abmelden-so-gehts", "halterwechsel-nach-autokauf", "fahrzeugpapiere-sicherheitscodes"],
    keywords: [
      "Auto verkauft abmelden",
      "Auto angemeldet verkaufen",
      "Veräußerungsanzeige",
      "Verkaufsmeldung Zulassungsstelle",
      "Kurzzeitkennzeichen Käufer",
    ],
    sources: [
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 15 Mitteilungspflichten bei Änderungen", href: "https://www.gesetze-im-internet.de/fzv_2023/__15.html" },
      { label: "Service Berlin: Verkauf des Kraftfahrzeugs oder Anhängers melden", href: "https://service.berlin.de/dienstleistung/120900/" },
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 42 Kurzzeitkennzeichen", href: "https://www.gesetze-im-internet.de/fzv_2023/__42.html" },
      { label: "Zoll: Beginn und Ende der Kfz-Steuerpflicht", href: "https://www.zoll.de/DE/Privatpersonen/Kraftfahrzeugsteuer/Beginn-und-Ende-der-Steuerpflicht/beginn-und-ende-der-steuerpflicht_node.html" },
    ],
  },

  {
    slug: "wunschkennzeichen-reservieren",
    title: "Wunschkennzeichen reservieren: Regeln, Kosten, Fristen",
    description:
      "So reservieren Sie ein Wunschkennzeichen: erlaubte Kombinationen und Längen, amtliche Gebühr, Dauer der Reservierung und was beim Umzug zu beachten ist.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "So ist ein Kfz-Kennzeichen aufgebaut",
        paragraphs: [
          "Jedes Kennzeichen besteht aus zwei Teilen. Vorn steht das Unterscheidungszeichen mit einem bis drei Buchstaben für den Verwaltungsbezirk, etwa B für Berlin oder HH für Hamburg. Dahinter folgt die Erkennungsnummer, die das einzelne Fahrzeug bezeichnet. Ihr Wunsch bezieht sich auf diese Erkennungsnummer; das Unterscheidungszeichen hängt von Ihrem Zulassungsbezirk ab.",
          "Die Erkennungsnummer besteht aus einem oder zwei Buchstaben und einer Zahl mit bis zu vier Ziffern. Zulässig sind alle Buchstaben außer den Umlauten Ä, Ö und Ü. Die Verordnung teilt die möglichen Kombinationen in fünf Gruppen ein (Anlage 1 FZV):",
        ],
        table: {
          headers: ["Gruppe", "Bereich"],
          rows: [
            ["Ein Buchstabe, bis drei Ziffern", "A 1 bis Z 999"],
            ["Zwei Buchstaben, bis zwei Ziffern", "AA 1 bis ZZ 99"],
            ["Zwei Buchstaben, drei Ziffern", "AA 100 bis ZZ 999"],
            ["Ein Buchstabe, vier Ziffern", "A 1000 bis Z 9999"],
            ["Zwei Buchstaben, vier Ziffern", "AA 1000 bis ZZ 9999"],
          ],
        },
      },
      {
        heading: "Wie lang darf ein Kennzeichen sein?",
        paragraphs: [
          "Unterscheidungszeichen und Erkennungsnummer dürfen zusammen höchstens acht Stellen haben; gezählt werden alle Buchstaben und Ziffern (Anlage 4 FZV). Das schränkt die Auswahl vor allem in Bezirken mit dreistelligem Kürzel ein: Zwei Buchstaben und vier Ziffern ergäben dort neun Stellen und sind deshalb nicht möglich. Bei einzeiligen E- und H-Kennzeichen sind höchstens sieben Stellen erlaubt; der Kennbuchstabe E bzw. H zählt dabei nicht mit.",
          "Für Saison-, E- und H-Kennzeichen sowie für bestimmte kleinere Schildformate gelten teils strengere Grenzen. Wenn Sie eines dieser Kennzeichen planen, fragen Sie vor der Reservierung nach, ob Ihre Wunschkombination darauf passt.",
        ],
      },
      {
        heading: "Welche Kombinationen sind ausgeschlossen?",
        paragraphs: [
          "Einen Anspruch auf eine ganz bestimmte Kombination gibt es nicht – zugeteilt wird, was frei ist und den Regeln entspricht. Die Fahrzeug-Zulassungsverordnung schließt Kombinationen aus, die gegen die guten Sitten verstoßen (§ 9 FZV). Was das konkret bedeutet, setzen die Zulassungsbehörden in ihrer Vergabepraxis um.",
          "Die Stadt Köln zum Beispiel vergibt die Buchstabenkombinationen HJ, KZ, NS, SA, SS und ZZ sowie den Einzelbuchstaben Z nicht. Dort sind außerdem bestimmte Nummernbereiche für Taxen und die Stadtverwaltung vorgesehen, und sehr kurze Kennzeichen mit zwei oder drei Zeichen lassen sich nicht vorab reservieren. Andere Behörden können eigene Einschränkungen haben – maßgeblich ist die Auskunft Ihrer Zulassungsstelle.",
        ],
      },
      {
        heading: "Reservierung: So gehen Sie vor",
        paragraphs: [
          "Reserviert wird bei der Zulassungsbehörde, die für Ihren Hauptwohnsitz oder – bei Unternehmen – für Sitz oder Niederlassung zuständig ist. Viele Behörden bieten dafür ein Online-Portal an, in dem Sie die Verfügbarkeit direkt prüfen. Stellen Sie die Reservierung auf die Person oder Firma aus, auf die das Fahrzeug später zugelassen wird; in Hamburg etwa ist eine Reservierung nicht auf andere übertragbar.",
        ],
        list: [
          "Wunschkombination und zwei oder drei Alternativen überlegen",
          "Verfügbarkeit im Reservierungsportal der zuständigen Behörde prüfen",
          "Reservierung auf den Namen des künftigen Halters abschließen",
          "Reservierungsbestätigung aufbewahren – sie wird bei der Zulassung gebraucht",
          "Zulassung innerhalb der Reservierungsfrist durchführen",
        ],
      },
      {
        heading: "Amtliche Gebühr und Reservierungsfrist",
        paragraphs: [
          "Die amtlichen Gebühren sind bundesweit in der Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt) festgelegt: 2,60 € für die Reservierung und ein Zuschlag von 10,20 € für die Zuteilung des Wunschkennzeichens – zusammen 12,80 €. Hinzu kommen die übliche Zulassungsgebühr und die Kennzeichenschilder.",
          "Wie lange eine Reservierung gilt, regelt jede Behörde selbst, und die Spanne ist groß: In Hamburg sind es 14 Tage, in Köln 183 Tage ab der Online-Reservierung. Läuft die Frist ohne Zulassung ab, wird die Kombination wieder frei und kann an andere vergeben werden. Wer sie weiter möchte, muss neu reservieren.",
          "Reservieren Sie deshalb erst, wenn die Zulassung absehbar ist – etwa sobald eVB-Nummer und Fahrzeugpapiere vorliegen.",
        ],
      },
      {
        heading: "Wunschkennzeichen bei Umzug und Kennzeichenmitnahme",
        paragraphs: [
          "Ein bereits zugeteiltes Wunschkennzeichen dürfen Sie beim Umzug behalten: Seit 2015 müssen Fahrzeuge bei einem Wohnsitzwechsel innerhalb Deutschlands nicht mehr umgekennzeichnet werden. Seit Oktober 2019 gilt das auch beim Halterwechsel – ein Käufer kann Ihr Wunschkennzeichen also übernehmen. Voraussetzung ist jeweils, dass das Fahrzeug zugelassen bleibt.",
          "Anders sieht es bei Reservierungen aus. Eine Reservierung aus dem alten Zulassungsbezirk können Sie nicht in den neuen mitnehmen, und die Reservierung für ein abgemeldetes Fahrzeug verfällt bei einem Umzug. Möchten Sie nach dem Umzug ein Wunschkennzeichen mit dem neuen Ortskürzel, reservieren Sie es bei der Behörde Ihres neuen Wohnorts und verbinden es mit der Ummeldung.",
        ],
      },
      {
        heading: "Wunschkennzeichen über DeutscheZulassung",
        paragraphs: [
          "Sie können das Wunschkennzeichen als Zusatz zu einer Neuzulassung, Umschreibung, Ummeldung oder Wiederzulassung bei DeutscheZulassung buchen. Wir prüfen die Verfügbarkeit, reservieren die Kombination und kümmern uns im Rahmen der Zulassung um die Zuteilung. Nennen Sie uns dafür am besten zwei oder drei Alternativen.",
          `${wunschkennzeichenHinweis} Hinzu kommt der Preis der jeweiligen Zulassung; Schilder liefern wir auf Wunsch für ${P.kennzeichen} pro Paar mit. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung.`,
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet ein Wunschkennzeichen?",
        answer:
          `Die amtliche Gebühr beträgt bundesweit 12,80 € (2,60 € Reservierung plus 10,20 € Zuteilung), dazu kommen Zulassungsgebühr und Schilder. Über DeutscheZulassung kostet der Wunschkennzeichen-Service ${P.wunschkennzeichen}, die amtliche Gebühr ist darin enthalten.`,
      },
      {
        question: "Wie lange ist ein reserviertes Wunschkennzeichen gültig?",
        answer:
          "Das legt jede Zulassungsbehörde selbst fest. Die Spanne reicht von wenigen Wochen bis zu mehreren Monaten – in Hamburg sind es 14 Tage, in Köln 183 Tage. Prüfen Sie die Frist bei Ihrer Behörde, bevor Sie reservieren.",
      },
      {
        question: "Wie viele Zeichen darf mein Kennzeichen haben?",
        answer:
          "Höchstens acht Stellen aus Unterscheidungszeichen und Erkennungsnummer zusammen, bei einzeiligen E- und H-Kennzeichen höchstens sieben (der Kennbuchstabe zählt nicht mit). Die Erkennungsnummer hat ein oder zwei Buchstaben und bis zu vier Ziffern. Für zweizeilige, Saison- und kleinere Schilder gelten engere Grenzen (Anlage 4 FZV).",
      },
      {
        question: "Kann ich ein Wunschkennzeichen in einer anderen Stadt reservieren?",
        answer:
          "Nein. Die Reservierung läuft über die Behörde, die für Ihren Wohnsitz bzw. Firmensitz oder Niederlassung zuständig ist. Eine Reservierung aus einem anderen Bezirk lässt sich bei einem Umzug nicht mitnehmen.",
      },
      {
        question: "Darf ich mein Wunschkennzeichen beim Umzug behalten?",
        answer:
          "Ja. Seit 2015 ist bei einem Umzug innerhalb Deutschlands keine Umkennzeichnung mehr nötig. Sie melden die neue Adresse, das Kennzeichen bleibt – solange das Fahrzeug zugelassen ist.",
      },
    ],
    relatedServices: ["wunschkennzeichen", "neuzulassung", "ummeldung"],
    relatedGuides: ["kennzeichen-mitnehmen", "auto-ummelden-nach-umzug", "was-kostet-eine-kfz-zulassung", "halterwechsel-nach-autokauf"],
    keywords: [
      "Wunschkennzeichen reservieren",
      "Wunschkennzeichen Kosten",
      "Wunschkennzeichen Reservierung Dauer",
      "Kennzeichen maximale Länge",
      "Wunschkennzeichen Umzug",
    ],
    sources: [
      { label: "Bundesministerium für Verkehr: Überblick über die Kraftfahrzeugkennzeichen", href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/ueberblick-ueber-die-kraftfahrzeugkennzeichen" },
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 9 Zuteilung von Kennzeichen", href: "https://www.gesetze-im-internet.de/fzv_2023/__9.html" },
      { label: "Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt)", href: "https://www.gesetze-im-internet.de/stgebo_2011/" },
      { label: "Stadt Köln: Wunschkennzeichen", href: "https://www.stadt-koeln.de/service/produkte/00741/index.html" },
    ],
  },

  {
    slug: "fahrzeugzulassung-unternehmen",
    title: "Fahrzeugzulassung für Unternehmen: Unterlagen & Ablauf",
    description:
      "Firmenwagen zulassen: welche Unterlagen Einzelunternehmen und GmbH brauchen, wie die Vollmacht funktioniert und wie Fuhrparks ihre Zulassungen bündeln.",
    datePublished: "2026-11-03",
    dateModified: "2026-11-03",
    sections: [
      {
        heading: "Auf wen wird das Fahrzeug zugelassen?",
        paragraphs: [
          "Bevor es um Unterlagen geht, steht eine Grundfrage: Wer wird Halter? Die Fahrzeug-Zulassungsverordnung unterscheidet zwischen natürlichen Personen, juristischen Personen und rechtsfähigen Vereinigungen (§ 6 Abs. 1 FZV). Davon hängt ab, welcher Name in der Zulassungsbescheinigung steht und welche Nachweise die Behörde verlangt.",
          "Örtlich zuständig ist bei Unternehmen die Zulassungsbehörde am Sitz oder am Ort der beteiligten Niederlassung (§ 75 FZV). Bei mehreren Standorten kommt es also darauf an, über welche Niederlassung das Fahrzeug läuft.",
        ],
      },
      {
        heading: "Einzelunternehmen und GmbH im Vergleich",
        paragraphs: [
          "Ein Einzelunternehmen hat keine eigene Rechtspersönlichkeit. Das Fahrzeug wird deshalb auf die Inhaberin oder den Inhaber als Person zugelassen – das gilt auch für eingetragene Kaufleute (e. K.). Je nach Behörde lässt sich der Firmenname als Zusatz eintragen und die Betriebsanschrift verwenden. Eine GmbH oder UG ist dagegen selbst Halterin: In der Zulassungsbescheinigung stehen ihr Name und die Geschäftsanschrift laut Handelsregister.",
          "Eine Sonderrolle hat die GmbH in Gründung. Solange der Eintrag im Handelsregister fehlt, wird das Fahrzeug auf eine dahinterstehende Person zugelassen. Wer die Zulassung auf die neue Gesellschaft plant, wartet sinnvollerweise den Registereintrag ab.",
        ],
        table: {
          headers: ["Punkt", "Einzelunternehmen", "GmbH / UG"],
          rows: [
            ["Halter in der ZB I", "Inhaberin bzw. Inhaber als Person", "die Gesellschaft"],
            ["Registernachweis", "Gewerbeanmeldung (e. K.: Handelsregisterauszug)", "aktueller Handelsregisterauszug, je nach Behörde zusätzlich Gewerbeanmeldung"],
            ["Ausweis", "Ausweis der Inhaberin bzw. des Inhabers", "Ausweis einer vertretungsberechtigten Person"],
            ["Bei Vertretung", "Vollmacht und Ausweis der bevollmächtigten Person", "Vollmacht der Gesellschaft und Ausweis der bevollmächtigten Person"],
          ],
        },
      },
      {
        heading: "Die Unterlagen im Detail",
        paragraphs: [
          "Zusätzlich zu den Nachweisen der Rechtsform braucht jede Firmenzulassung die üblichen Fahrzeugunterlagen. Die genauen Anforderungen unterscheiden sich von Behörde zu Behörde, etwa beim zulässigen Alter des Registerauszugs oder bei der Frage, ob Kopien genügen. Typisch sind:",
        ],
        list: [
          "Handelsregisterauszug in aktueller Fassung (z. B. GmbH, UG, AG, OHG, KG, e. K.)",
          "Gewerbeanmeldung bei Einzelunternehmen – Freiberufler ohne Gewerbe weisen ihre Tätigkeit anders nach, etwa per Bestätigung des Finanzamts",
          "Personalausweis oder Reisepass der vertretungsberechtigten Person, bei Vertretung als Kopie",
          "Vollmacht, unterschrieben von einer vertretungsberechtigten Person, plus Ausweis der bevollmächtigten Person",
          "eVB-Nummer passend zu den Halterdaten – bei der GmbH also auf die Gesellschaft",
          "SEPA-Lastschriftmandat für die Kfz-Steuer",
          "Zulassungsbescheinigung Teil I und II bzw. CoC-Papier, gegebenenfalls HU-Nachweis",
        ],
      },
      {
        heading: "Vollmacht: Wer darf für die Firma unterschreiben?",
        paragraphs: [
          "Eine GmbH handelt durch ihre Geschäftsführung. Erscheint nicht die Geschäftsführerin oder der Geschäftsführer selbst, braucht die beauftragte Person eine schriftliche Vollmacht der Gesellschaft. Aus dem Handelsregisterauszug geht hervor, wer vertretungsberechtigt ist – deshalb gehören Vollmacht, Ausweiskopie der unterschreibenden Person und Registerauszug zusammen.",
          "Wer regelmäßig Fahrzeuge zulässt, spart Aufwand mit einer dauerhaften Vollmacht für eine Mitarbeiterin, einen Mitarbeiter oder einen Dienstleister, statt für jeden Vorgang neu zu unterschreiben. Ob und wie lange eine Behörde solche Dauervollmachten akzeptiert, klären Sie am besten vorab.",
        ],
      },
      {
        heading: "Online zulassen: i-Kfz für Unternehmen",
        paragraphs: [
          "Seit September 2023 können auch juristische Personen das Online-Verfahren i-Kfz nutzen. Zur Identifizierung dient statt des Personalausweises ein Unternehmenskonto mit ELSTER-Zertifikat. Ansonsten gelten dieselben Voraussetzungen wie für Privatpersonen, etwa Fahrzeugpapiere mit Sicherheitscodes.",
          "Für Unternehmen mit sehr vielen Vorgängen gibt es die Großkundenschnittstelle beim Kraftfahrt-Bundesamt. Registrieren können sich juristische Personen des Privatrechts, die regelmäßig mehr als 500 Anträge im Jahr stellen; die technische Anbindung muss in einem Probelauf bestätigt werden (§ 34 FZV). Kleinere Fuhrparks erreichen diese Schwelle in der Regel nicht.",
        ],
      },
      {
        heading: "Sammelzulassungen und Fuhrpark organisieren",
        paragraphs: [
          "Bei mehreren Fahrzeugen lohnt es sich, Vorgänge zu bündeln. Häufig bremsen dabei einzelne fehlende Unterlagen den ganzen Stapel aus – eine vergessene eVB oder ein veralteter Registerauszug genügt. Eine einfache Vorbereitung hilft:",
        ],
        list: [
          "zentrale Liste mit Fahrzeug-Identifizierungsnummer, Kennzeichen und HU-Fälligkeit jedes Fahrzeugs",
          "für jedes Fahrzeug eine eigene eVB-Nummer anfordern",
          "Registerauszug und Ausweiskopie der vertretungsberechtigten Person aktuell halten",
          "Fahrzeugbriefe (ZB II) zentral und sicher verwahren, nicht in den Fahrzeugen",
          "Sicherheitscodes erst freilegen, wenn der jeweilige Vorgang ansteht",
        ],
      },
      {
        heading: "Zulassungsservice für Gewerbekunden",
        paragraphs: [
          "DeutscheZulassung übernimmt Zulassungen für Unternehmen bundesweit – vom einzelnen Firmenwagen bis zum Fuhrpark. Gewerbekunden erhalten eine Sammelabwicklung, eine feste Ansprechperson und Staffelpreise auf Anfrage. Die Unterlagen senden Sie als Handyfotos über das Online-Formular, per WhatsApp oder per E-Mail; einen Personalausweis mit Online-Funktion brauchen Sie nicht.",
          `Für einzelne Vorgänge gelten die regulären Festpreise, etwa ${P.zulassung} für eine Neuzulassung oder Umschreibung inklusive amtlicher Gebühren und Versand. In der Regel ist eine Zulassung ${ZEIT.zulassung} nach Eingang der vollständigen Unterlagen erledigt, zuzüglich Versand. Sie beauftragen über das Online-Formular oder per WhatsApp und erhalten vorab eine verbindliche Festpreis-Bestätigung – erreichbar sind wir Montag bis Freitag von 8 bis 18 Uhr.`,
        ],
      },
    ],
    faq: [
      {
        question: "Kann ich ein Fahrzeug auf mein Einzelunternehmen zulassen?",
        answer:
          "Halter wird beim Einzelunternehmen die Inhaberin oder der Inhaber als Person. Je nach Behörde kann der Firmenname als Zusatz eingetragen und die Betriebsanschrift verwendet werden. Nötig sind in der Regel Ausweis und Gewerbeanmeldung.",
      },
      {
        question: "Wie alt darf der Handelsregisterauszug sein?",
        answer:
          "Das legt die jeweilige Behörde fest. Verlangt wird ein aktueller Auszug; manche Behörden nennen ein konkretes Höchstalter. Ein frischer Abruf aus dem Handelsregister vermeidet Rückfragen.",
      },
      {
        question: "Wer muss die Vollmacht für eine GmbH unterschreiben?",
        answer:
          "Eine vertretungsberechtigte Person, in der Regel die Geschäftsführung. Legen Sie eine Kopie ihres Ausweises bei; die bevollmächtigte Person weist sich mit ihrem eigenen Ausweis aus.",
      },
      {
        question: "Braucht eine GmbH eine Gewerbeanmeldung für die Zulassung?",
        answer:
          "Grundlage ist der Handelsregisterauszug. Einige Behörden verlangen zusätzlich die Gewerbeanmeldung – fragen Sie im Zweifel vorher nach oder legen Sie sie gleich bei.",
      },
      {
        question: "Gibt es für Fuhrparks besondere Konditionen?",
        answer:
          `Bei DeutscheZulassung erhalten Gewerbekunden Staffelpreise auf Anfrage, dazu Sammelabwicklung und eine feste Ansprechperson. Einzelne Vorgänge kosten den regulären Festpreis, zum Beispiel ${P.zulassung} für eine Zulassung inklusive amtlicher Gebühren und Versand.`,
      },
    ],
    relatedServices: ["gewerbekunden", "neuzulassung", "halterwechsel"],
    relatedGuides: ["auto-anmelden-unterlagen", "i-kfz-online-zulassung", "fahrzeugpapiere-sicherheitscodes", "evb-nummer"],
    keywords: [
      "Firmenwagen zulassen",
      "Fahrzeugzulassung Unternehmen Unterlagen",
      "Auto auf GmbH zulassen",
      "Kfz-Zulassung Einzelunternehmen",
      "Fuhrpark Zulassung",
    ],
    sources: [
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 6 Antrag auf Zulassung", href: "https://www.gesetze-im-internet.de/fzv_2023/__6.html" },
      { label: "Fahrzeug-Zulassungsverordnung (FZV), § 34 Registrierung als Großkunde", href: "https://www.gesetze-im-internet.de/fzv_2023/__34.html" },
      { label: "Bundesministerium für Verkehr: Internetbasierte Fahrzeugzulassung (i-Kfz)", href: "https://www.bmv.de/SharedDocs/DE/Artikel/StV/Strassenverkehr/internetbasierte-fahrzeugzulassung.html" },
      { label: "Märkischer Kreis: Merkblatt zu Firmenzulassungen (PDF)", href: "https://www.maerkischer-kreis.de/fileadmin/user_upload/Downloads/FB3/Merkblatt_Firmenzulassungen_A5.pdf" },
    ],
  },
];

export const sortedGuides = guides;

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
