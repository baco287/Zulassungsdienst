import type { Service } from "./types";

/**
 * Leistungskatalog von EasyZulassung.
 *
 * Neue Leistungen können einfach ergänzt werden: Objekt anhängen,
 * eindeutigen `slug` vergeben – Listen-, Detail-, Preis- und
 * Formularseiten aktualisieren sich automatisch.
 *
 * Preisstatus: siehe lib/pricing.ts (verified=false ⇒ Platzhalter/auf Anfrage).
 */
export const services: Service[] = [
  {
    slug: "neuzulassung",
    name: "Neuzulassung",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Fabrikneues oder importiertes Fahrzeug erstmals zulassen – komplett digital, ohne Termin bei der Zulassungsstelle.",
    description:
      "Wir übernehmen die vollständige Erstzulassung Ihres Fahrzeugs: Prüfung der Unterlagen, Beantragung bei der zuständigen Zulassungsbehörde, Kennzeichen und Versand aller Dokumente zu Ihnen nach Hause oder in Ihr Autohaus. Sie sparen sich Termin, Wartezeit und Behördengang – und Ihr Fahrzeug ist in der Regel innerhalb weniger Werktage angemeldet.",
    price: {
      serviceFee: 79.9,
      verified: false,
      officialFeeRange: [12.8, 30.0],
      plateCostRange: [20, 35],
      note: "Komplettpreis auf Wunsch inkl. Kennzeichen und Versand – im Angebot ausgewiesen.",
    },
    checklist: [
      "Zulassungsbescheinigung Teil II (Fahrzeugbrief) oder CoC-Papier",
      "eVB-Nummer Ihrer Kfz-Versicherung",
      "SEPA-Mandat für die Kfz-Steuer",
      "Personalausweis oder Reisepass (Kopie/Scan)",
      "Bei Firmen: Gewerbeanmeldung bzw. Handelsregisterauszug",
      "Vollmacht (stellen wir Ihnen digital bereit)",
    ],
    duration: "1–3 Werktage",
    order: 1,
    popular: true,
  },
  {
    slug: "ummeldung",
    name: "Ummeldung",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Umzug oder neues Kennzeichen? Wir melden Ihr Fahrzeug auf die neue Adresse oder den neuen Zulassungsbezirk um.",
    description:
      "Nach einem Umzug muss das Fahrzeug auf die neue Anschrift umgemeldet werden. Wir erledigen die Ummeldung bei der zuständigen Behörde, kümmern uns auf Wunsch um neue Kennzeichen (oder die Mitnahme Ihres bisherigen Kennzeichens) und senden Ihnen die aktualisierten Papiere zu.",
    price: {
      serviceFee: 79.9,
      verified: false,
      officialFeeRange: [12.8, 27.0],
      plateCostRange: [20, 35],
      note: "Kennzeichen nur nötig, wenn das bisherige nicht mitgenommen wird.",
    },
    checklist: [
      "Zulassungsbescheinigung Teil I (Fahrzeugschein)",
      "Zulassungsbescheinigung Teil II (Fahrzeugbrief)",
      "eVB-Nummer (bei Versichererwechsel)",
      "Personalausweis mit neuer Adresse oder Meldebescheinigung",
      "SEPA-Mandat für die Kfz-Steuer",
      "Vollmacht (stellen wir Ihnen digital bereit)",
    ],
    duration: "1–3 Werktage",
    order: 2,
  },
  {
    slug: "abmeldung",
    name: "Abmeldung",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Fahrzeug verkauft, stillgelegt oder verschrottet? Die Außerbetriebsetzung erledigen wir noch am selben Werktag.",
    description:
      "Die Abmeldung (Außerbetriebsetzung) ist der schnellste Vorgang: Sie übermitteln uns die Sicherheitscodes von Fahrzeugschein und Kennzeichen – wir melden Ihr Fahrzeug digital bei der Zulassungsbehörde ab und Sie erhalten die Abmeldebestätigung per E-Mail. Ganz ohne Versand, in der Regel taggleich.",
    price: {
      serviceFee: 24.9,
      verified: false,
      officialFeeRange: [3.0, 16.0],
      note: "Kein Kennzeichen- und Versandkostenanteil – vollständig digital.",
    },
    checklist: [
      "Zulassungsbescheinigung Teil I mit freigelegtem Sicherheitscode",
      "Beide Kennzeichen mit freigelegten Sicherheitscodes der Stempelplaketten",
      "Bei Verwertung: Verwertungsnachweis des zertifizierten Demontagebetriebs",
    ],
    duration: "meist taggleich",
    order: 3,
    popular: true,
  },
  {
    slug: "wiederzulassung",
    name: "Wiederzulassung",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Abgemeldetes Fahrzeug wieder in Betrieb nehmen – inklusive neuer Kennzeichen und aller Formalitäten.",
    description:
      "Ein stillgelegtes Fahrzeug soll zurück auf die Straße? Wir prüfen, welche Unterlagen die Behörde für die Wiederzulassung verlangt (u. a. gültige HU), beantragen die Zulassung und organisieren Kennzeichen und Versand.",
    price: {
      serviceFee: 79.9,
      verified: false,
      officialFeeRange: [12.8, 30.0],
      plateCostRange: [20, 35],
    },
    checklist: [
      "Zulassungsbescheinigung Teil I und II",
      "Abmeldebescheinigung (falls vorhanden)",
      "Nachweis gültige Hauptuntersuchung (HU)",
      "eVB-Nummer Ihrer Kfz-Versicherung",
      "SEPA-Mandat für die Kfz-Steuer",
      "Personalausweis oder Reisepass",
    ],
    duration: "1–3 Werktage",
    order: 4,
  },
  {
    slug: "halterwechsel",
    name: "Halterwechsel / Umschreibung",
    shortName: "Halterwechsel",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Gebrauchtwagen gekauft? Wir schreiben das Fahrzeug auf den neuen Halter um – auf Wunsch mit Wunschkennzeichen.",
    description:
      "Beim Kauf eines Gebrauchtwagens muss das Fahrzeug auf die neue Halterin oder den neuen Halter umgeschrieben werden. Wir übernehmen die komplette Umschreibung inklusive Kennzeichen – so ist das Fahrzeug schnell und rechtssicher auf Sie zugelassen.",
    price: {
      serviceFee: 79.9,
      verified: false,
      officialFeeRange: [12.8, 27.0],
      plateCostRange: [20, 35],
    },
    checklist: [
      "Zulassungsbescheinigung Teil I und II",
      "Kaufvertrag oder Übergabeprotokoll",
      "eVB-Nummer der Versicherung des neuen Halters",
      "Nachweis gültige Hauptuntersuchung (HU)",
      "Personalausweis des neuen Halters",
      "SEPA-Mandat für die Kfz-Steuer",
    ],
    duration: "1–3 Werktage",
    order: 5,
    popular: true,
  },
  {
    slug: "adressaenderung",
    name: "Adressänderung",
    category: "zulassung",
    audience: "beide",
    teaser:
      "Nur die Anschrift hat sich geändert? Wir aktualisieren Ihre Fahrzeugpapiere schnell und unkompliziert.",
    description:
      "Bei einem Umzug innerhalb desselben Zulassungsbezirks genügt die Änderung der Adresse in der Zulassungsbescheinigung. Wir erledigen das für Sie digital – Sie erhalten die aktualisierten Papiere bequem per Post.",
    price: {
      serviceFee: null,
      verified: false,
      officialFeeRange: [10.9, 14.3],
      note: "Preis auf Anfrage – abhängig vom Zulassungsbezirk.",
    },
    checklist: [
      "Zulassungsbescheinigung Teil I",
      "Personalausweis mit neuer Adresse oder Meldebescheinigung",
    ],
    duration: "1–2 Werktage",
    order: 6,
  },
  {
    slug: "kurzzeitkennzeichen",
    name: "Kurzzeitkennzeichen",
    category: "kennzeichen",
    audience: "beide",
    teaser:
      "Für Überführungs- und Probefahrten: 5 Tage gültiges Kurzzeitkennzeichen, schnell organisiert.",
    description:
      "Sie möchten ein Fahrzeug überführen oder Probe fahren, das nicht zugelassen ist? Wir beantragen Ihr Kurzzeitkennzeichen (5-Tages-Kennzeichen) inklusive Schilder – auf Wunsch mit Express-Versand oder Abholung.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Preis auf Anfrage – abhängig von Behörde, Versicherung und Versandart.",
    },
    checklist: [
      "Personalausweis oder Reisepass",
      "eVB-Nummer für Kurzzeitkennzeichen",
      "Fahrzeugdokumente (ZB I/II oder CoC), falls vorhanden",
      "Nachweis gültige HU (für Fahrten über die Probefahrt hinaus)",
    ],
    duration: "1–2 Werktage, Express möglich",
    order: 7,
  },
  {
    slug: "saisonkennzeichen",
    name: "Saisonkennzeichen",
    category: "kennzeichen",
    audience: "beide",
    teaser:
      "Motorrad, Cabrio oder Wohnmobil nur einen Teil des Jahres nutzen – Steuer und Versicherung sparen.",
    description:
      "Mit einem Saisonkennzeichen ist Ihr Fahrzeug nur in einem festgelegten Zeitraum (z. B. April bis Oktober) zugelassen. Sie sparen Steuer und Versicherung und müssen nicht jährlich an- und abmelden. Wir richten den Saisonzeitraum bei der Zulassung direkt mit ein.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Aufpreis zur jeweiligen Zulassungsleistung – auf Anfrage.",
    },
    checklist: [
      "Unterlagen der jeweiligen Zulassungsleistung (siehe Neuzulassung/Umschreibung)",
      "Gewünschter Saisonzeitraum (2–11 Monate)",
    ],
    duration: "wie zugrunde liegende Zulassung",
    order: 8,
  },
  {
    slug: "wunschkennzeichen",
    name: "Wunschkennzeichen",
    category: "kennzeichen",
    audience: "beide",
    teaser:
      "Ihre Initialen, Ihr Geburtsjahr, Ihr Wunschkürzel – wir reservieren und prägen Ihr Wunschkennzeichen.",
    description:
      "Wir prüfen die Verfügbarkeit Ihres Wunschkennzeichens, reservieren es bei der Zulassungsstelle und übernehmen Prägung und Zuteilung im Rahmen Ihrer Zulassung.",
    price: {
      serviceFee: 19.9,
      verified: false,
      officialFeeRange: [12.8, 12.8],
      note: "Zzgl. amtliche Wunschkennzeichen-Gebühr; buchbar als Zusatz zu jeder Zulassung.",
    },
    checklist: [
      "Ihr Wunschkürzel (2–3 Alternativen empfohlen)",
      "Unterlagen der zugrunde liegenden Zulassungsleistung",
    ],
    duration: "im Rahmen der Zulassung",
    order: 9,
  },
  {
    slug: "ersatz-dokumente",
    name: "Ersatz bei Verlust (Dokumente & Kennzeichen)",
    shortName: "Verlust-Ersatz",
    category: "dokumente",
    audience: "beide",
    teaser:
      "Fahrzeugschein, Fahrzeugbrief oder Kennzeichen verloren? Wir kümmern uns um Ersatz und Neubeantragung.",
    description:
      "Der Verlust von Zulassungsbescheinigungen oder Kennzeichen ist ärgerlich – und mit Behördenformalitäten wie eidesstattlicher Versicherung verbunden. Wir führen Sie durch den Prozess, bereiten alle Erklärungen vor und beantragen die Ersatzdokumente bzw. neuen Kennzeichen.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Preis auf Anfrage – abhängig vom Dokument (ZB I, ZB II, Kennzeichen) und Behörde.",
    },
    checklist: [
      "Personalausweis oder Reisepass",
      "Verbliebene Fahrzeugdokumente",
      "Eidesstattliche Versicherung zum Verlust (bereiten wir vor)",
      "Bei Diebstahl: polizeiliche Verlustanzeige",
    ],
    duration: "3–10 Werktage (behördenabhängig)",
    order: 10,
  },
  {
    slug: "privatkunden",
    name: "Zulassungsservice für Privatkunden",
    shortName: "Privatkunden",
    category: "service",
    audience: "privat",
    teaser:
      "Ein Ansprechpartner, transparente Preise, alles digital – Ihr persönlicher Zulassungsservice.",
    description:
      "Vom ersten Foto Ihrer Unterlagen bis zur Zustellung der fertigen Papiere: Bei EasyZulassung haben Sie eine feste Ansprechperson, die Ihren Auftrag begleitet. Sie reichen alles digital ein – per Formular oder WhatsApp – und wir melden uns, sobald Ihr Fahrzeug zugelassen ist.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Preise je Leistung – siehe Preisübersicht.",
    },
    checklist: ["Abhängig von der gewünschten Leistung – siehe jeweilige Checkliste"],
    duration: "je nach Leistung",
    order: 11,
  },
  {
    slug: "gewerbekunden",
    name: "Zulassungsservice für Autohäuser & Gewerbe",
    shortName: "Gewerbekunden",
    category: "service",
    audience: "gewerblich",
    teaser:
      "Staffelpreise, Sammelaufträge und feste Abläufe für Autohäuser, Händler und Fuhrparks.",
    description:
      "Für Autohäuser, Gebrauchtwagenhändler und Fuhrparkbetreiber bieten wir feste Konditionen, Sammelabwicklung und auf Wunsch tägliche Abholung Ihrer Zulassungsunterlagen. Sprechen Sie uns an – wir erstellen Ihnen ein individuelles Angebot mit Staffelpreisen.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Individuelle Staffelpreise – Angebot auf Anfrage.",
    },
    checklist: [
      "Gewerbeanmeldung bzw. Handelsregisterauszug",
      "Rahmenvollmacht (stellen wir bereit)",
      "Fahrzeugunterlagen je Vorgang",
    ],
    duration: "nach Vereinbarung, auch taggleich",
    order: 12,
    popular: true,
  },
  {
    slug: "abhol-bringservice",
    name: "Abhol- & Bringservice",
    category: "service",
    audience: "beide",
    teaser:
      "Wir holen Ihre Unterlagen ab und bringen Kennzeichen und Papiere direkt zu Ihnen – regional vor Ort.",
    description:
      "In unserer Region holen wir Ihre Originalunterlagen persönlich ab und liefern fertige Kennzeichen und Dokumente direkt an Ihre Tür oder in Ihr Autohaus. Außerhalb der Region übernehmen versicherte Versanddienstleister die Zustellung.",
    price: {
      serviceFee: null,
      verified: false,
      note: "Preis nach Entfernung – auf Anfrage.",
    },
    checklist: ["Adresse für Abholung/Zustellung", "Terminwunsch"],
    duration: "nach Vereinbarung",
    order: 13,
  },
];

/** Leistungen sortiert für Anzeige. */
export const sortedServices = [...services].sort((a, b) => a.order - b.order);

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export const categoryLabels: Record<Service["category"], string> = {
  zulassung: "Zulassung & Abmeldung",
  kennzeichen: "Kennzeichen",
  dokumente: "Dokumente & Ersatz",
  service: "Service & Betreuung",
};
