import type { QA, ContentSection } from "./serviceContent";

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
    dateModified: "2026-08-19",
    sections: [
      {
        heading: "Die Kosten einer Kfz-Zulassung auf einen Blick",
        paragraphs: [
          "Die Gesamtkosten einer Zulassung setzen sich aus drei Bausteinen zusammen: den amtlichen Gebühren der Zulassungsbehörde, den Kennzeichenschildern und – falls Sie den Vorgang nicht selbst erledigen – dem Servicepreis eines Zulassungsdienstes. Je nach Vorgang und Kommune ergeben sich daraus typischerweise folgende Beträge:",
        ],
        table: {
          headers: ["Vorgang", "i-Kfz online (selbst)", "Am Schalter (selbst)", "Über DeutscheZulassung"],
          rows: [
            ["Neuzulassung", "ca. 12,80 – 18,00 € + Kennzeichen", "ca. 26,30 – 30,00 € + Kennzeichen", "129 € + Kennzeichen"],
            ["Umschreibung / Halterwechsel", "ca. 12,80 – 18,00 € + ggf. Kennzeichen", "ca. 26,30 – 30,00 € + ggf. Kennzeichen", "129 € + ggf. Kennzeichen"],
            ["Ummeldung nach Umzug", "ca. 12,80 – 18,00 €", "ca. 26,30 – 30,00 €", "129 € komplett"],
            ["Abmeldung", "ca. 3 – 16 €", "ca. 3 – 16 €", "34,90 € komplett"],
            ["Wunschkennzeichen (Zusatz)", "ca. 12,80 € + Schilder", "ca. 12,80 € + Schilder", "34,90 € inkl. Schilder"],
            ["Kennzeichenschilder (Paar)", "ca. 20 – 35 €", "ca. 20 – 35 €", "28,90 €"],
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
            ["Dauer bis zur Zulassung", "sofort (vorläufiger Nachweis), Plaketten per Post", "am Termin selbst", "1–3 Werktage + Versand"],
            ["Gesamtkosten (Zulassung)", "ca. 35 – 55 €", "ca. 50 – 70 €", "129 € komplett"],
            ["Scheitert häufig an …", "eID-PIN, alten Papieren, Portal-Fehlern", "Terminmangel", "–"],
          ],
        },
      },
      {
        heading: "Selbst zulassen oder Zulassungsdienst beauftragen?",
        paragraphs: [
          "Wer Zeit hat, einen Termin bekommt und alle Unterlagen beisammen hat, zahlt beim Selbermachen nur Gebühren und Schilder – zusammen meist 40 bis 70 €. Die Realität sieht oft anders aus: Termine sind in vielen Städten Wochen im Voraus ausgebucht, und ein halber Arbeitstag geht schnell verloren.",
          "Ein Zulassungsdienst übernimmt den kompletten Vorgang gegen einen Servicepreis. Bei DeutscheZulassung kosten Neuzulassung, Umschreibung, Ummeldung und Wiederzulassung je 129 € – amtliche Gebühren und versicherter Versand sind darin bereits enthalten. Werden neue Kennzeichenschilder benötigt, kommen 28,90 € pro Paar dazu. Die Abmeldung kostet 34,90 € inklusive Gebühren. Sie wissen also vorher genau, was auf Sie zukommt.",
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
          "Beim Selbermachen zahlen Sie die amtliche Gebühr (online ca. 12,80 – 18 €, am Schalter ca. 26,30 – 30 €) plus Kennzeichenschilder (ca. 20 – 35 € pro Paar) – zusammen meist 40 bis 70 €. Dazu kommt Ihr Zeitaufwand für Termin und Behördengang.",
      },
      {
        question: "Was kostet ein Zulassungsdienst?",
        answer:
          "Marktüblich sind Preise um 120 – 130 € pro Zulassungsvorgang zzgl. Kennzeichen. DeutscheZulassung berechnet 129 € inkl. Gebühren und Versand, zzgl. 28,90 € für neue Kennzeichenschilder; die Abmeldung kostet 34,90 €.",
      },
      {
        question: "Ist die Online-Zulassung (i-Kfz) günstiger als der Schalter?",
        answer:
          "Ja, die amtliche Gebühr für vollständig digitale Vorgänge ist niedriger (ca. 12,80 – 18 € statt ca. 26,30 – 30 €). Voraussetzung ist allerdings ein Personalausweis mit aktivierter Online-Funktion und Fahrzeugdokumente mit Sicherheitscodes.",
      },
      {
        question: "Wer zahlt die Kfz-Steuer und wann?",
        answer:
          "Die Kfz-Steuer wird ab dem Tag der Zulassung fällig und per SEPA-Lastschrift vom Hauptzollamt eingezogen. Ein SEPA-Mandat ist deshalb Pflichtbestandteil jeder Zulassung.",
      },
    ],
    relatedServices: ["neuzulassung", "halterwechsel", "abmeldung"],
    relatedGuides: ["auto-anmelden-unterlagen", "i-kfz-online-zulassung"],
    keywords: [
      "Kfz-Zulassung Kosten",
      "Auto anmelden Kosten",
      "Zulassung Gebühren 2026",
      "was kostet Auto ummelden",
    ],
    sources: [
      { label: "Kraftfahrt-Bundesamt: i-Kfz – internetbasierte Fahrzeugzulassung", href: "https://www.kba.de/DE/Themen/ZentraleRegister/iKfz/ikfz_node.html" },
      { label: "Bundesministerium für Verkehr: Digitale Fahrzeugzulassung", href: "https://bmdv.bund.de/DE/Themen/Mobilitaet/Strassenverkehr/Fahrzeugzulassung/fahrzeugzulassung.html" },
      { label: "Gebührenordnung für Maßnahmen im Straßenverkehr (GebOSt)", href: "https://www.gesetze-im-internet.de/st_gebo_2011/" },
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
          src: "/images/zb1-zb2-dokumente.jpg",
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
    relatedGuides: ["evb-nummer", "was-kostet-eine-kfz-zulassung"],
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
    dateModified: "2026-08-13",
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
          "Statt einen Termin bei der neuen Zulassungsstelle zu jagen, können Sie die Ummeldung komplett digital erledigen lassen: Sie fotografieren Zulassungsbescheinigung Teil I und II sowie Ihren Ausweis mit neuer Adresse (oder die Meldebescheinigung), erteilen eine digitale Vollmacht – und der Zulassungsdienst übernimmt den Rest. Bei DeutscheZulassung dauert das in der Regel 1–3 Werktage; die aktualisierten Papiere und gegebenenfalls neue Kennzeichen kommen per versichertem Versand.",
        ],
        list: [
          "Zulassungsbescheinigung Teil I (Fahrzeugschein)",
          "Zulassungsbescheinigung Teil II (Fahrzeugbrief)",
          "Ausweis mit neuer Adresse oder Meldebescheinigung",
          "SEPA-Mandat für die Kfz-Steuer",
          "Neue eVB-Nummer nur bei Versichererwechsel",
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
          "Am Schalter zahlen Sie amtliche Gebühren von rund 26 – 30 € plus ggf. neue Kennzeichen. Über DeutscheZulassung kostet die Ummeldung 129 € inklusive Gebühren und Versand (neue Schilder ggf. zzgl. 28,90 €) – ganz ohne Behördentermin.",
      },
      {
        question: "Muss ich bei der Ummeldung die Versicherung wechseln?",
        answer:
          "Nein. Ihre Kfz-Versicherung bleibt bestehen; teilen Sie ihr nur die neue Adresse mit, da sich durch die Regionalklasse der Beitrag ändern kann. Eine neue eVB-Nummer brauchen Sie nur bei einem Versichererwechsel.",
      },
    ],
    relatedServices: ["ummeldung", "adressaenderung", "wunschkennzeichen"],
    relatedGuides: ["kennzeichen-mitnehmen", "was-kostet-eine-kfz-zulassung"],
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
    dateModified: "2026-08-13",
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
          "Sicherheitscode auf der Zulassungsbescheinigung Teil I freirubbeln",
          "Sicherheitscodes der Stempelplaketten auf beiden Kennzeichen freilegen",
          "Bei Verschrottung: Verwertungsnachweis des zertifizierten Demontagebetriebs bereithalten",
          "Codes und Dokumente fotografieren und an den Zulassungsdienst übermitteln – oder selbst im i-Kfz-Portal abmelden",
          "Abmeldebestätigung erhalten (bei DeutscheZulassung in der Regel noch am selben Werktag per E-Mail)",
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
          "Die amtliche Gebühr liegt je nach Behörde bei etwa 3 – 16 €. Über DeutscheZulassung kostet die komplette Abwicklung 34,90 € inklusive Gebühren – meist noch am selben Werktag erledigt.",
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
    relatedGuides: ["was-kostet-eine-kfz-zulassung", "i-kfz-online-zulassung"],
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
    relatedGuides: ["evb-nummer-erhalten-was-nun", "auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung"],
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
          "Bei DeutscheZulassung geben Sie die eVB-Nummer einfach im Online-Auftrag oder per WhatsApp an – wir übernehmen ab hier den kompletten Behördenvorgang, in der Regel in 1–3 Werktagen.",
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
          "Möglichst zeitnah. Die eVB ist je nach Versicherer nur wenige Wochen bis Monate gültig; eine abgelaufene Nummer müssen Sie kostenlos neu anfordern. Über einen Zulassungsdienst ist die Zulassung meist in 1–3 Werktagen erledigt.",
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
    relatedGuides: ["evb-nummer", "auto-anmelden-unterlagen", "i-kfz-online-zulassung"],
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
    dateModified: "2026-08-19",
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
          "Ja. Nach erfolgreichem i-Kfz-Vorgang erhalten Sie einen vorläufigen Zulassungsnachweis zum Ausdrucken und dürfen bis zu 10 Tage im Inland fahren, bis Plaketten und Papiere per Post ankommen. Die ungestempelten Kennzeichen müssen dafür bereits montiert sein.",
      },
      {
        question: "Warum funktioniert i-Kfz bei mir nicht?",
        answer:
          "Häufigste Gründe: fehlende oder gesperrte eID-PIN, Fahrzeugpapiere ohne Sicherheitscodes (ältere Dokumente), Importfahrzeuge ohne deutsche Papiere oder technische Störungen im Portal der Behörde. In diesen Fällen bleibt der Schaltertermin oder die Beauftragung eines Zulassungsdienstes.",
      },
    ],
    relatedServices: ["neuzulassung", "abmeldung", "gewerbekunden"],
    relatedGuides: ["auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung"],
    keywords: ["i-Kfz", "Auto online zulassen", "Online-Zulassung Voraussetzungen", "Kfz online anmelden"],
    sources: [
      { label: "Kraftfahrt-Bundesamt: i-Kfz – internetbasierte Fahrzeugzulassung", href: "https://www.kba.de/DE/Themen/ZentraleRegister/iKfz/ikfz_node.html" },
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
    relatedGuides: ["auto-ummelden-nach-umzug", "was-kostet-eine-kfz-zulassung"],
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
    dateModified: "2026-08-20",
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
          "Ein Zulassungsdienst braucht weder Ihren Termin noch Ihre eID: Sie fotografieren die Unterlagen, erteilen eine digitale Vollmacht, und der Dienst führt den Vorgang bei der Behörde durch – über eigene Zugänge, unabhängig von der öffentlichen Terminvergabe. Bei DeutscheZulassung startet Ihr Vorgang sofort nach Auftragseingang; die Zulassung ist in der Regel in 1–3 Werktagen erledigt, Abmeldungen meist noch am selben Werktag.",
          "Das kostet mit 129 € zzgl. ggf. 28,90 € für Kennzeichen mehr als der Schalter – dafür entfallen Terminsuche, Anfahrt und Wartezeit vollständig. Gerade wenn das neue Auto schon bezahlt vor der Tür steht, ist das oft der Unterschied zwischen „fährt diese Woche“ und „steht noch einen Monat“.",
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
          "Bei DeutscheZulassung 129 € inklusive amtlicher Gebühren und Versand, zzgl. 28,90 € für neue Kennzeichenschilder – der Vorgang startet sofort, ganz ohne Behördentermin. Die Abmeldung kostet 34,90 € und ist meist taggleich erledigt.",
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
    dateModified: "2026-08-13",
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
          "Verdeckter Code auf ZB I, ZB II und den Stempelplaketten der Kennzeichen. Er wird freigelegt (freigerubbelt), um digitale Vorgänge wie die Online-Abmeldung zu autorisieren. Achtung: Ein freigelegter Code entwertet das jeweilige Dokument.",
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
    relatedGuides: ["auto-anmelden-unterlagen", "evb-nummer", "i-kfz-online-zulassung"],
    keywords: ["Kfz-Zulassung Begriffe", "Zulassungsbescheinigung erklärt", "Fahrzeugbrief Fahrzeugschein Unterschied"],
  },
];

export const sortedGuides = guides;

export function getGuide(slug: string): Guide | undefined {
  return guides.find((g) => g.slug === slug);
}
