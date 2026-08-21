/**
 * Vertiefende Inhalte für die Leistungs-Detailseiten (SEO/GEO).
 *
 * Getrennt vom Leistungskatalog (lib/services.ts), damit der Katalog schlank
 * bleibt. Schlüssel = Service-Slug. Jede Leistung erhält:
 *  - sections: ausführliche Inhaltsabschnitte (H2 + Absätze/Liste)
 *  - faq: leistungsspezifische Fragen (werden als FAQPage-JSON-LD ausgegeben)
 *  - related: verwandte Leistungen (interne Verlinkung)
 *  - guides: passende Ratgeber-Artikel (lib/ratgeber.ts)
 *  - keywords: ergänzende Meta-Keywords für die Seite
 */

export interface ContentSection {
  heading: string;
  paragraphs: string[];
  /** Optionale Aufzählung, wird nach den Absätzen gerendert. */
  list?: string[];
  /** Optionale Tabelle (z. B. Gebührenübersicht), wird nach der Liste gerendert. */
  table?: { headers: string[]; rows: string[][] };
  /** Optionales Anleitungsbild, wird nach der Tabelle gerendert. */
  image?: { src: string; alt: string; caption?: string };
}

export interface QA {
  question: string;
  answer: string;
}

export interface ServiceContent {
  sections: ContentSection[];
  faq: QA[];
  related: string[];
  guides: string[];
  keywords: string[];
  /** Optionaler hervorgehobener Verweis, z. B. auf eine Landingpage. */
  ctaLink?: { href: string; label: string; text: string };
}

export const serviceContent: Record<string, ServiceContent> = {
  neuzulassung: {
    sections: [
      {
        heading: "Neuzulassung online – ohne Termin und Behördengang",
        paragraphs: [
          "Ein fabrikneues Fahrzeug oder ein Import ohne deutsche Papiere muss vor der ersten Fahrt zugelassen werden. Der klassische Weg führt über einen Termin bei der Zulassungsstelle – mit Wartezeiten von teils mehreren Wochen. Als Zulassungsdienst übernehmen wir den kompletten Vorgang für Sie: Sie senden uns Fotos oder Scans Ihrer Unterlagen, wir prüfen alles auf Vollständigkeit, reichen den Antrag bei der zuständigen Behörde ein und lassen Ihre Kennzeichen prägen.",
          "Am Ende erhalten Sie Zulassungsbescheinigung Teil I, gestempelte Kennzeichen und Ihre restlichen Unterlagen per versichertem Versand – oder auf Wunsch direkt ins Autohaus. Ihr Fahrzeug ist damit in der Regel innerhalb von 1–3 Werktagen angemeldet, ohne dass Sie eine Behörde betreten müssen.",
        ],
      },
      {
        heading: "Für wen lohnt sich der Zulassungsservice?",
        paragraphs: [
          "Besonders profitieren Käuferinnen und Käufer von Neuwagen und EU-Importen, Berufstätige ohne Zeit für Behördentermine sowie Autohäuser, die die Zulassung als Service für ihre Kundschaft anbieten möchten. Auch wenn die Online-Zulassung der Behörden (i-Kfz) für Sie nicht infrage kommt – etwa weil Sie keinen Personalausweis mit aktivierter Online-Funktion besitzen oder das Fahrzeug importiert wurde – ist der Zulassungsdienst der schnellste Weg zum Kennzeichen.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet eine Neuzulassung über DeutscheZulassung?",
        answer:
          "Die Neuzulassung kostet bei uns 129 € – amtliche Gebühren und der versicherte Versand sind bereits enthalten. Die beiden Kennzeichenschilder berechnen wir mit 28,90 € pro Paar zusätzlich. Es kommen keine versteckten Kosten hinzu.",
      },
      {
        question: "Wie lange dauert eine Neuzulassung?",
        answer:
          "In der Regel 1–3 Werktage ab vollständigen Unterlagen, zuzüglich Versand. Bei Eilbedarf sprechen Sie uns an – oft ist eine Express-Abwicklung möglich.",
      },
      {
        question: "Brauche ich für die Neuzulassung einen Termin bei der Zulassungsstelle?",
        answer:
          "Nein. Wir führen den Vorgang mit Ihrer Vollmacht bei der Behörde durch. Sie müssen weder einen Termin buchen noch persönlich erscheinen.",
      },
      {
        question: "Kann ich ein importiertes Fahrzeug ohne deutsche Papiere zulassen lassen?",
        answer:
          "Ja. Für EU-Importe genügt in der Regel das CoC-Papier (Certificate of Conformity). Bei Importen aus Nicht-EU-Ländern klären wir vorab, welche Nachweise (z. B. Vollgutachten nach § 21 StVZO) die Behörde verlangt.",
      },
    ],
    related: ["halterwechsel", "wunschkennzeichen", "gewerbekunden"],
    guides: ["auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung", "evb-nummer"],
    keywords: [
      "Neuzulassung online",
      "Auto anmelden ohne Termin",
      "Neuwagen zulassen lassen",
      "Kfz-Zulassungsdienst",
    ],
  },

  ummeldung: {
    sections: [
      {
        heading: "Auto ummelden nach Umzug – digital erledigt",
        paragraphs: [
          "Nach einem Umzug muss die neue Anschrift in den Fahrzeugpapieren eingetragen werden – bei einem Wechsel des Zulassungsbezirks sprechen Behörden von einer Ummeldung. Wer das aufschiebt, riskiert ein Verwarnungsgeld und Probleme mit Versicherung und Behördenpost. Wir nehmen Ihnen den kompletten Vorgang ab: Unterlagen digital einreichen, Vollmacht erteilen, fertig.",
          "Ihr bisheriges Kennzeichen können Sie dank bundesweiter Kennzeichenmitnahme in den meisten Fällen behalten. Möchten Sie lieber ein Kennzeichen Ihres neuen Zulassungsbezirks – gern auch als Wunschkennzeichen –, organisieren wir Prägung und Zuteilung gleich mit.",
        ],
      },
      {
        heading: "Ummeldung, Adressänderung oder Halterwechsel?",
        paragraphs: [
          "Die Begriffe werden oft verwechselt: Bei der Ummeldung ziehen Sie in einen anderen Zulassungsbezirk, das Fahrzeug bleibt auf Sie zugelassen. Ziehen Sie innerhalb desselben Bezirks um, genügt eine Adressänderung. Wechselt das Fahrzeug den Besitzer, ist es ein Halterwechsel (Umschreibung). Sie müssen das nicht selbst entscheiden – wir prüfen anhand Ihrer Angaben, welcher Vorgang der richtige ist.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet das Ummelden eines Autos?",
        answer:
          "Bei DeutscheZulassung kostet die Ummeldung 129 € inklusive amtlicher Gebühren und versichertem Versand. Werden neue Kennzeichen gewünscht, kommen 28,90 € pro Paar für die Schilder dazu – bei Kennzeichenmitnahme entfällt das.",
      },
      {
        question: "Wie lange habe ich nach dem Umzug Zeit, mein Auto umzumelden?",
        answer:
          "Die Fahrzeug-Zulassungsverordnung verlangt die Ummeldung „unverzüglich“. In der Praxis sollten Sie sie innerhalb weniger Wochen erledigen – sonst drohen Verwarnungsgelder und im Schadenfall Ärger mit der Versicherung.",
      },
      {
        question: "Kann ich mein altes Kennzeichen nach dem Umzug behalten?",
        answer:
          "Ja. Seit 2015 gilt die bundesweite Kennzeichenmitnahme: Beim Umzug in einen anderen Zulassungsbezirk dürfen Sie Ihr Kennzeichen behalten. Wir tragen die neue Adresse ein, die Schilder bleiben unverändert.",
      },
      {
        question: "Muss ich meine Kfz-Versicherung über den Umzug informieren?",
        answer:
          "Ja, die Versicherung benötigt Ihre neue Adresse; je nach Regionalklasse kann sich der Beitrag ändern. Für die Ummeldung selbst brauchen wir nur dann eine neue eVB-Nummer, wenn Sie gleichzeitig den Versicherer wechseln.",
      },
    ],
    related: ["adressaenderung", "halterwechsel", "wunschkennzeichen"],
    guides: ["auto-ummelden-nach-umzug", "kennzeichen-mitnehmen", "was-kostet-eine-kfz-zulassung"],
    keywords: [
      "Auto ummelden online",
      "Kfz ummelden nach Umzug",
      "Ummeldung ohne Termin",
      "Kennzeichen mitnehmen",
    ],
  },

  abmeldung: {
    sections: [
      {
        heading: "Auto abmelden – meist noch am selben Werktag",
        paragraphs: [
          "Die Abmeldung (amtlich: Außerbetriebsetzung) ist der schnellste Zulassungsvorgang – und der einzige, der komplett ohne Versand auskommt. Sie legen die verdeckten Sicherheitscodes auf Ihrer Zulassungsbescheinigung Teil I und auf den Stempelplaketten Ihrer Kennzeichen frei, fotografieren beides und senden es uns. Wir setzen das Fahrzeug digital außer Betrieb und Sie erhalten die Abmeldebestätigung per E-Mail – in der Regel noch am selben Werktag.",
          "Wichtig: Ab der Abmeldung darf das Fahrzeug nicht mehr im öffentlichen Raum bewegt oder abgestellt werden. Steuer und Versicherung enden automatisch – die Behörde informiert Zoll und Versicherer.",
        ],
      },
      {
        heading: "Typische Anlässe für eine Abmeldung",
        paragraphs: [
          "Ein Fahrzeug wird abgemeldet, wenn es verkauft, verschrottet, gestohlen, längere Zeit nicht genutzt oder ins Ausland überführt wird. Beim Verkauf empfehlen wir, das Fahrzeug vor der Übergabe abzumelden oder die Umschreibung durch den Käufer vertraglich abzusichern – so vermeiden Sie, für fremde Knöllchen oder Steuer aufzukommen. Bei der Verschrottung verlangt die Behörde den Verwertungsnachweis eines zertifizierten Demontagebetriebs.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet es, ein Auto abzumelden?",
        answer:
          "Bei DeutscheZulassung kostet die Abmeldung 34,90 € inklusive amtlicher Gebühren. Da keine Kennzeichen versendet werden müssen, fallen keine Versandkosten an.",
      },
      {
        question: "Was sind die Sicherheitscodes und wo finde ich sie?",
        answer:
          "Seit 2015 tragen die Zulassungsbescheinigung Teil I und die Stempelplaketten der Kennzeichen verdeckte Sicherheitscodes. Sie legen die Codes frei, indem Sie das Sichtfeld auf dem Fahrzeugschein und die Folie der Plaketten abrubbeln bzw. abziehen. Achtung: Mit freigelegtem Code ist die Zulassung entwertet – erst freilegen, wenn die Abmeldung wirklich erfolgen soll.",
      },
      {
        question: "Bekomme ich zu viel gezahlte Kfz-Steuer und Versicherung zurück?",
        answer:
          "Ja. Das Hauptzollamt erstattet die Kfz-Steuer anteilig ab dem Tag der Abmeldung automatisch. Ihre Versicherung rechnet den Beitrag ebenfalls tagesgenau ab – dafür wird sie von der Zulassungsbehörde direkt informiert.",
      },
      {
        question: "Kann ich ein Auto abmelden, das nicht auf mich zugelassen ist?",
        answer:
          "Ja, die Außerbetriebsetzung kann auch ein Dritter veranlassen, wenn Fahrzeugschein und Kennzeichen mit Sicherheitscodes vorliegen. Als Käufer eines Fahrzeugs können Sie es also abmelden, ohne dass der Vorbesitzer mitwirken muss.",
      },
    ],
    related: ["wiederzulassung", "halterwechsel", "ersatz-dokumente"],
    guides: ["auto-abmelden-so-gehts", "was-kostet-eine-kfz-zulassung"],
    keywords: [
      "Auto abmelden online",
      "Kfz Außerbetriebsetzung",
      "Auto abmelden Kosten",
      "Fahrzeug stilllegen",
    ],
  },

  wiederzulassung: {
    sections: [
      {
        heading: "Stillgelegtes Fahrzeug wieder anmelden",
        paragraphs: [
          "Ein abgemeldetes Fahrzeug kann bis zu sieben Jahre lang wieder zugelassen werden – danach wird es endgültig aus dem Register gelöscht und der Aufwand steigt erheblich. Für die Wiederzulassung prüfen wir zunächst, was die Behörde in Ihrem Fall verlangt: Neben den Fahrzeugpapieren sind das eine gültige Hauptuntersuchung (HU), eine eVB-Nummer und ein SEPA-Mandat für die Kfz-Steuer.",
          "Ist die HU während der Stilllegung abgelaufen, muss das Fahrzeug vor der Zulassung zur Prüfung – die Fahrt zur HU ist mit Kurzzeitkennzeichen möglich, die wir ebenfalls organisieren. Nach der Zulassung erhalten Sie neue (oder auf Wunsch Ihre bisherigen, reservierten) Kennzeichen und die aktualisierten Papiere per versichertem Versand.",
        ],
      },
    ],
    faq: [
      {
        question: "Wie lange kann ein abgemeldetes Auto wieder zugelassen werden?",
        answer:
          "Bis zu 7 Jahre nach der Außerbetriebsetzung ist eine Wiederzulassung ohne neue Begutachtung möglich, sofern die Fahrzeugdaten im Register erhalten sind. Danach wird das Fahrzeug endgültig gelöscht und benötigt ein Vollgutachten.",
      },
      {
        question: "Brauche ich für die Wiederzulassung eine neue HU?",
        answer:
          "Nur wenn die letzte Hauptuntersuchung abgelaufen ist. Ist die HU noch gültig, genügt der Nachweis. Für die Fahrt zur HU-Prüfstelle organisieren wir bei Bedarf ein Kurzzeitkennzeichen.",
      },
      {
        question: "Kann ich mein altes Kennzeichen bei der Wiederzulassung zurückbekommen?",
        answer:
          "Wenn das Kennzeichen bei der Abmeldung für Sie reserviert wurde (in der Regel bis zu 12 Monate), können Sie es wieder erhalten. Andernfalls teilen wir Ihnen ein neues Kennzeichen zu – gern auch ein Wunschkennzeichen.",
      },
    ],
    related: ["abmeldung", "kurzzeitkennzeichen", "wunschkennzeichen"],
    guides: ["auto-anmelden-unterlagen", "evb-nummer"],
    keywords: [
      "Wiederzulassung Auto",
      "abgemeldetes Auto wieder anmelden",
      "Fahrzeug wieder zulassen",
    ],
  },

  halterwechsel: {
    sections: [
      {
        heading: "Gebrauchtwagen umschreiben – schnell und rechtssicher",
        paragraphs: [
          "Nach dem Kauf eines Gebrauchtwagens muss das Fahrzeug auf den neuen Halter umgeschrieben werden – erst dann sind Sie auch amtlich als Halter eingetragen. Bis dahin läuft das Fahrzeug auf den Verkäufer, was für beide Seiten Risiken birgt: Der Verkäufer haftet für Steuer und Verstöße, der Käufer fährt mit fremder Zulassung. Wir erledigen die Umschreibung deshalb bevorzugt taggenau: Unterlagen digital einreichen, Vollmacht erteilen, und in 1–3 Werktagen ist das Fahrzeug auf Sie zugelassen.",
          "Ist das Fahrzeug noch angemeldet, kann das bisherige Kennzeichen bundesweit übernommen werden – auch über Bezirksgrenzen hinweg. Alternativ organisieren wir neue Kennzeichen oder Ihr Wunschkennzeichen gleich mit.",
        ],
      },
      {
        heading: "Abgemeldetes oder angemeldetes Fahrzeug gekauft?",
        paragraphs: [
          "Beides ist kein Problem. Bei einem abgemeldeten Fahrzeug handelt es sich technisch um eine Wiederzulassung mit Halterwechsel – hier ist zusätzlich eine gültige HU nachzuweisen. Bei einem noch angemeldeten Fahrzeug übernehmen wir die klassische Umschreibung inklusive Information an Versicherung und Behörde. In beiden Fällen gilt unser Komplettpreis.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet die Umschreibung eines Gebrauchtwagens?",
        answer:
          "Bei DeutscheZulassung kostet der Halterwechsel 129 € – amtliche Gebühren und versicherter Versand inklusive. Werden neue Kennzeichenschilder benötigt, kommen 28,90 € pro Paar dazu; übernehmen Sie das bisherige Kennzeichen, entfällt dieser Posten.",
      },
      {
        question: "Welche Unterlagen brauche ich für den Halterwechsel?",
        answer:
          "Zulassungsbescheinigung Teil I und II, Kaufvertrag, eVB-Nummer Ihrer Versicherung, Nachweis der gültigen HU, Ausweiskopie und ein SEPA-Mandat für die Kfz-Steuer. Die Vollmacht stellen wir Ihnen digital bereit.",
      },
      {
        question: "Wie schnell muss ein gekauftes Auto umgemeldet werden?",
        answer:
          "Unverzüglich – also ohne schuldhaftes Zögern. Fahren dürfen Sie mit gültiger Zulassung und Versicherungsschutz zwar sofort, die Umschreibung sollte aber innerhalb weniger Tage erfolgen. Viele Kaufverträge setzen dafür ausdrücklich eine Frist.",
      },
      {
        question: "Kann das Kennzeichen des Vorbesitzers übernommen werden?",
        answer:
          "Ja. Seit 2019 ist die Kennzeichenmitnahme auch beim Halterwechsel bundesweit möglich, sofern das Fahrzeug noch zugelassen ist. Das spart neue Schilder und Umbau.",
      },
    ],
    related: ["neuzulassung", "wunschkennzeichen", "abmeldung"],
    guides: ["auto-anmelden-unterlagen", "kennzeichen-mitnehmen", "was-kostet-eine-kfz-zulassung"],
    keywords: [
      "Auto umschreiben lassen",
      "Halterwechsel online",
      "Gebrauchtwagen ummelden",
      "Umschreibung Kfz",
    ],
  },

  adressaenderung: {
    sections: [
      {
        heading: "Neue Adresse in den Fahrzeugpapieren",
        paragraphs: [
          "Ziehen Sie innerhalb desselben Zulassungsbezirks um, bleibt Ihr Kennzeichen unverändert – nur die Anschrift in der Zulassungsbescheinigung Teil I muss aktualisiert werden. Diese Pflicht wird oft unterschätzt: Eine veraltete Adresse kann bei Kontrollen ein Verwarnungsgeld kosten und führt dazu, dass Behördenpost (z. B. zur HU-Erinnerung oder bei Rückrufen) ins Leere läuft.",
          "Wir erledigen die Adressänderung vollständig digital: Sie senden uns Fahrzeugschein und einen Nachweis der neuen Adresse, wir kümmern uns um den Behördeneintrag und senden Ihnen die aktualisierte Zulassungsbescheinigung per Post zu.",
        ],
      },
    ],
    faq: [
      {
        question: "Muss ich mein Auto ummelden, wenn ich innerhalb der Stadt umziehe?",
        answer:
          "Beim Umzug innerhalb desselben Zulassungsbezirks genügt die Adressänderung in der Zulassungsbescheinigung Teil I – das Kennzeichen bleibt bestehen. Erst beim Wechsel in einen anderen Bezirk ist eine vollständige Ummeldung nötig.",
      },
      {
        question: "Was passiert, wenn ich die Adressänderung versäume?",
        answer:
          "Die Änderungspflicht ergibt sich aus der Fahrzeug-Zulassungsverordnung; bei Kontrollen droht ein Verwarnungsgeld. Außerdem erreichen Sie wichtige Schreiben der Behörde nicht mehr zuverlässig.",
      },
      {
        question: "Welche Unterlagen brauche ich für die Adressänderung?",
        answer:
          "Nur die Zulassungsbescheinigung Teil I sowie Ihren Personalausweis mit neuer Adresse oder eine Meldebescheinigung. Den Rest übernehmen wir.",
      },
      {
        question: "Was kostet die Adressänderung?",
        answer:
          "90 € als Komplettpreis inkl. MwSt. – amtliche Gebühren und der Versand der aktualisierten Zulassungsbescheinigung sind enthalten. Damit ist die reine Adressänderung günstiger als eine vollständige Ummeldung (129 €), weil keine neuen Kennzeichen anfallen.",
      },
    ],
    related: ["ummeldung", "halterwechsel"],
    guides: ["auto-ummelden-nach-umzug"],
    keywords: ["Adressänderung Fahrzeugschein", "Adresse ändern Kfz", "Umzug Auto melden"],
  },

  kurzzeitkennzeichen: {
    sections: [
      {
        heading: "5-Tages-Kennzeichen für Überführung und Probefahrt",
        paragraphs: [
          "Kurzzeitkennzeichen gelten maximal fünf Tage und sind die legale Lösung, wenn ein nicht zugelassenes Fahrzeug bewegt werden soll – etwa zur Überführung nach dem Kauf, zur Probefahrt oder zur Fahrt zur HU-Prüfstelle. Erkennbar sind sie an der gelben Ablaufmarkierung am rechten Rand mit dem letzten Gültigkeitstag.",
          "Wir beantragen Ihr Kurzzeitkennzeichen inklusive Schilder und stimmen mit Ihnen ab, ob Versand oder Abholung schneller ist. Wichtig zu wissen: Für Fahrten über Probe-, Überführungs- und Prüfungsfahrten hinaus benötigt das Fahrzeug eine gültige HU; ohne HU sind nur direkte Fahrten zur Prüfstelle oder Werkstatt im Zulassungsbezirk und angrenzenden Bezirken erlaubt.",
        ],
      },
    ],
    faq: [
      {
        question: "Wie lange ist ein Kurzzeitkennzeichen gültig?",
        answer:
          "Maximal 5 aufeinanderfolgende Tage ab dem festgelegten Beginn. Danach verliert es automatisch seine Gültigkeit und darf nicht weiterverwendet werden.",
      },
      {
        question: "Brauche ich für ein Kurzzeitkennzeichen eine Versicherung?",
        answer:
          "Ja, Sie benötigen eine spezielle eVB-Nummer für Kurzzeitkennzeichen. Viele Versicherer stellen sie kurzfristig online aus – wir sagen Ihnen, worauf Sie achten müssen.",
      },
      {
        question: "Darf ich mit dem Kurzzeitkennzeichen ins Ausland fahren?",
        answer:
          "Innerhalb der EU wird das deutsche Kurzzeitkennzeichen nicht überall anerkannt. Für Überführungen ins oder aus dem Ausland klären wir mit Ihnen vorab die passende Lösung (z. B. Ausfuhrkennzeichen).",
      },
    ],
    related: ["neuzulassung", "wiederzulassung", "halterwechsel"],
    guides: ["auto-anmelden-unterlagen", "evb-nummer"],
    keywords: ["Kurzzeitkennzeichen beantragen", "Überführungskennzeichen", "5-Tages-Kennzeichen"],
  },

  saisonkennzeichen: {
    sections: [
      {
        heading: "Nur fahren, wenn die Saison läuft – Steuer und Beitrag sparen",
        paragraphs: [
          "Mit einem Saisonkennzeichen ist Ihr Fahrzeug automatisch nur in einem festen Zeitraum zwischen 2 und 11 Monaten zugelassen – klassisch etwa April bis Oktober für Motorrad, Cabrio oder Wohnmobil. Kfz-Steuer und Versicherung zahlen Sie nur für den Saisonzeitraum, und das jährliche An- und Abmelden entfällt komplett.",
          "Der Saisonzeitraum steht rechts auf dem Kennzeichen (z. B. „04/10“). Außerhalb der Saison darf das Fahrzeug nicht im öffentlichen Raum gefahren oder geparkt werden – eine private Garage oder ein Stellplatz ist Voraussetzung. Wir richten das Saisonkennzeichen direkt im Rahmen Ihrer Zulassung ein.",
        ],
      },
    ],
    faq: [
      {
        question: "Welche Zeiträume sind beim Saisonkennzeichen möglich?",
        answer:
          "Frei wählbar zwischen 2 und 11 vollen Monaten, z. B. März bis November. Der Zeitraum gilt jedes Jahr automatisch – ohne erneute Behördengänge.",
      },
      {
        question: "Was kostet ein Saisonkennzeichen?",
        answer:
          "Das Saisonkennzeichen ist ein Zusatz zur jeweiligen Zulassung (z. B. Neuzulassung oder Umschreibung). Den Aufpreis nennen wir Ihnen vorab in der verbindlichen Festpreis-Bestätigung.",
      },
      {
        question: "Wo darf mein Fahrzeug außerhalb der Saison stehen?",
        answer:
          "Nur auf privatem Grund – Garage, Carport oder privater Stellplatz. Im öffentlichen Verkehrsraum abgestellte Fahrzeuge außerhalb der Saison gelten als unzulässig geparkt und können kostenpflichtig entfernt werden.",
      },
    ],
    related: ["neuzulassung", "wiederzulassung", "wunschkennzeichen"],
    guides: ["was-kostet-eine-kfz-zulassung"],
    keywords: ["Saisonkennzeichen beantragen", "Saisonkennzeichen Zeitraum", "Motorrad Saisonkennzeichen"],
  },

  wunschkennzeichen: {
    sections: [
      {
        heading: "Ihr Kennzeichen, Ihre Kombination",
        paragraphs: [
          "Initialen, Geburtsjahr oder das Kürzel des Lieblingsvereins: Ein Wunschkennzeichen macht das Fahrzeug persönlich – und ist günstiger, als viele denken. Wir prüfen die Verfügbarkeit Ihrer Wunschkombination bei der zuständigen Zulassungsstelle, reservieren sie und übernehmen Prägung und Zuteilung im Rahmen Ihrer Zulassung.",
          "Tipp: Nennen Sie uns zwei bis drei Alternativen. Beliebte Kombinationen sind schnell vergriffen, und mit Ausweichoptionen verlieren wir keine Zeit im Zulassungsprozess.",
        ],
      },
    ],
    faq: [
      {
        question: "Was kostet ein Wunschkennzeichen?",
        answer:
          "Bei uns 34,90 € als Zusatz zu jeder Zulassung – die amtliche Reservierungs- und Zuteilungsgebühr sowie die Prägung der Schilder sind bereits enthalten.",
      },
      {
        question: "Wie lange bleibt ein Wunschkennzeichen reserviert?",
        answer:
          "Je nach Zulassungsstelle in der Regel 30 bis 90 Tage. Da wir die Reservierung direkt mit Ihrer Zulassung verbinden, spielt die Frist für Sie praktisch keine Rolle.",
      },
      {
        question: "Welche Kombinationen sind nicht erlaubt?",
        answer:
          "Kombinationen mit verbotenen Kürzeln (z. B. NS-Bezüge wie HJ, SS, NSDAP) vergeben die Behörden nicht. Auch die Länge ist begrenzt: maximal 8 Zeichen inklusive Unterscheidungszeichen des Bezirks.",
      },
    ],
    related: ["neuzulassung", "halterwechsel", "ummeldung"],
    guides: ["kennzeichen-mitnehmen", "was-kostet-eine-kfz-zulassung"],
    keywords: ["Wunschkennzeichen reservieren", "Wunschkennzeichen Kosten", "Kennzeichen prägen lassen"],
  },

  "ersatz-dokumente": {
    sections: [
      {
        heading: "Fahrzeugschein, Fahrzeugbrief oder Kennzeichen verloren?",
        paragraphs: [
          "Der Verlust von Zulassungsdokumenten ist mit besonderen Formalitäten verbunden: Für die Zulassungsbescheinigung Teil II (Fahrzeugbrief) verlangt die Behörde eine Versicherung an Eides statt, teils mit Aufgebotsverfahren; bei gestohlenen Kennzeichen ist eine polizeiliche Anzeige nötig. Genau hier nehmen wir Ihnen die Arbeit ab: Wir bereiten alle Erklärungen vor, stimmen den Ablauf mit der Behörde ab und beantragen Ersatzdokumente bzw. neue Kennzeichen.",
          "Nach Diebstahl von Kennzeichen erhalten Sie eine neue Kombination – die alte wird zur Fahndung ausgeschrieben. So sind Sie geschützt, falls die gestohlenen Schilder missbraucht werden.",
        ],
      },
    ],
    faq: [
      {
        question: "Was tun, wenn der Fahrzeugbrief (ZB II) verloren ist?",
        answer:
          "Für den Ersatz der Zulassungsbescheinigung Teil II ist eine Versicherung an Eides statt zum Verbleib des Dokuments erforderlich. Wir bereiten die Erklärung vor und beantragen das Ersatzdokument – je nach Behörde dauert das 3–10 Werktage.",
      },
      {
        question: "Meine Kennzeichen wurden gestohlen – darf ich noch fahren?",
        answer:
          "Nein, ohne gestempelte Kennzeichen darf das Fahrzeug nicht im öffentlichen Verkehr bewegt werden. Erstatten Sie Anzeige bei der Polizei; mit der Anzeige beantragen wir umgehend neue Kennzeichen für Sie.",
      },
      {
        question: "Was kostet der Ersatz verlorener Dokumente?",
        answer:
          "Das hängt vom Dokument ab: Der Ersatz des Fahrzeugscheins ist deutlich günstiger als der des Fahrzeugbriefs mit eidesstattlicher Versicherung. Wir nennen Ihnen vorab einen verbindlichen Festpreis für Ihren Fall.",
      },
    ],
    related: ["abmeldung", "wiederzulassung"],
    guides: ["auto-anmelden-unterlagen"],
    keywords: ["Fahrzeugbrief verloren", "Fahrzeugschein verloren", "Kennzeichen gestohlen was tun"],
  },

  privatkunden: {
    sections: [
      {
        heading: "Ihr persönlicher Zulassungsservice",
        paragraphs: [
          "Behördengänge kosten Zeit, Nerven und oft einen halben Urlaubstag. Bei DeutscheZulassung reichen Sie alles bequem digital ein – per Formular oder WhatsApp – und haben eine feste Ansprechperson, die Ihren Auftrag von der ersten Prüfung bis zur Zustellung begleitet. Keine Warteschleife, kein Ticketsystem: Sie schreiben einfach der Person, die Ihren Fall kennt.",
          "Alle Leistungen gelten deutschlandweit zum transparenten Komplettpreis. Vor Beauftragung erhalten Sie immer eine verbindliche Festpreis-Bestätigung – Überraschungen ausgeschlossen.",
        ],
      },
    ],
    faq: [
      {
        question: "Wie reiche ich meine Unterlagen ein?",
        answer:
          "Ganz einfach per Online-Formular oder WhatsApp: Fotos oder Scans genügen für den Start. Originale benötigen wir nur, wenn die Behörde sie ausdrücklich verlangt – das sagen wir Ihnen rechtzeitig.",
      },
      {
        question: "Ist der Service in ganz Deutschland verfügbar?",
        answer:
          "Ja, digitale Zulassungsvorgänge wickeln wir bei jeder deutschen Zulassungsbehörde ab. Den persönlichen Abhol- und Bringservice bieten wir zusätzlich regional an.",
      },
      {
        question: "Woher weiß ich, welcher Vorgang der richtige für mich ist?",
        answer:
          "Das müssen Sie nicht selbst entscheiden. Beschreiben Sie uns kurz Ihre Situation – wir prüfen, ob z. B. eine Ummeldung, Umschreibung oder Adressänderung nötig ist, und bestätigen den Preis, bevor Sie beauftragen.",
      },
    ],
    related: ["neuzulassung", "halterwechsel", "abhol-bringservice"],
    guides: ["auto-anmelden-unterlagen", "was-kostet-eine-kfz-zulassung", "i-kfz-online-zulassung"],
    keywords: ["Zulassungsservice privat", "Kfz-Zulassung Hilfe", "Auto anmelden lassen"],
  },

  gewerbekunden: {
    sections: [
      {
        heading: "Zulassungen im Volumen – planbar und zuverlässig",
        paragraphs: [
          "Für Autohäuser, Gebrauchtwagenhändler, Leasinggesellschaften und Fuhrparkbetreiber ist die Zulassung ein täglicher Kostenfaktor. Wir bieten feste Staffelkonditionen, Sammelabwicklung mehrerer Fahrzeuge und auf Wunsch die tägliche Abholung Ihrer Zulassungsunterlagen. Ihre Vorgänge laufen über eine Rahmenvollmacht – ohne dass für jedes Fahrzeug neue Formulare nötig sind.",
          "Ein fester Ansprechpartner kennt Ihre Abläufe und Prioritäten. Eilige Kundenfahrzeuge kennzeichnen Sie einfach als Express – die Zulassung erfolgt nach Möglichkeit taggleich, damit Ihre Auslieferung steht.",
        ],
      },
    ],
    faq: [
      {
        question: "Wie funktionieren die Staffelpreise?",
        answer:
          "Die Konditionen richten sich nach Ihrem monatlichen Zulassungsvolumen. Fordern Sie ein individuelles Angebot an – Sie erhalten eine transparente Preisliste je Vorgangsart ohne versteckte Zuschläge.",
      },
      {
        question: "Können mehrere Fahrzeuge gleichzeitig eingereicht werden?",
        answer:
          "Ja, Sammelaufträge sind Standard: Sie übermitteln uns die Vorgänge gebündelt, wir liefern Kennzeichen und Papiere gesammelt zurück – auf Wunsch mit täglicher Abholung und Zustellung.",
      },
      {
        question: "Arbeiten Sie auch mit Zulassungsstellen außerhalb Ihrer Region?",
        answer:
          "Ja, wir lassen bundesweit bei allen Zulassungsbehörden zu – auch, wenn Ihre Kundschaft über ganz Deutschland verteilt ist.",
      },
    ],
    related: ["neuzulassung", "abmeldung", "abhol-bringservice"],
    guides: ["i-kfz-online-zulassung", "was-kostet-eine-kfz-zulassung"],
    keywords: [
      "Zulassungsservice Autohaus",
      "Kfz-Zulassung Gewerbe",
      "Zulassungsdienst Händler",
      "Fuhrpark Zulassung",
    ],
    ctaLink: {
      href: "/gewerbe/",
      label: "Zum Gewerbekunden-Bereich",
      text: "Alle Details für Autohäuser, Autohändler, Fuhrparks und Leasing-Anbieter – inklusive Branchenlösungen und Angebotsanfrage.",
    },
  },

  "abhol-bringservice": {
    sections: [
      {
        heading: "Wir kommen zu Ihnen",
        paragraphs: [
          "Manche Unterlagen gibt man ungern aus der Hand. In unserer Region holen wir Ihre Originaldokumente deshalb persönlich ab und bringen fertige Kennzeichen und Papiere direkt an Ihre Haustür oder in Ihr Autohaus – auf Wunsch zum festen Termin. Außerhalb unseres Einzugsgebiets übernehmen versicherte Versanddienstleister die Zustellung, sodass der Service deutschlandweit funktioniert.",
        ],
      },
    ],
    faq: [
      {
        question: "In welchem Gebiet ist der Abhol- und Bringservice verfügbar?",
        answer:
          "Den persönlichen Service bieten wir regional an – fragen Sie einfach mit Ihrer Postleitzahl an. Außerhalb des Gebiets läuft die Zustellung über versicherten Versand.",
      },
      {
        question: "Was kostet die Abholung?",
        answer:
          "Der Preis richtet sich nach der Entfernung. Sie erhalten ihn vorab in Ihrer verbindlichen Festpreis-Bestätigung – zusammen mit dem Wunschtermin.",
      },
    ],
    related: ["privatkunden", "gewerbekunden"],
    guides: [],
    keywords: ["Zulassungsservice Abholung", "Kennzeichen Lieferung", "Zulassung Bringservice"],
  },
};

export function getServiceContent(slug: string): ServiceContent | undefined {
  return serviceContent[slug];
}
