import type { QA } from "./serviceContent";

/**
 * Gewerbe-Landingpages: Hub (/gewerbe) und Zielgruppen-Segmente
 * (/gewerbe/autohaus, /gewerbe/autohaendler, …).
 *
 * Jedes Segment hat bewusst EIGENE Inhalte (Suchintention, Schmerzpunkte,
 * Abläufe), damit die Seiten nicht als Duplikate gewertet werden.
 * Preise: bewusst "individuelles Angebot" – keine erfundenen Staffelpreise.
 */

export interface SegmentBenefit {
  title: string;
  text: string;
}

export interface GewerbeSegment {
  slug: string;
  /** Kurzname für Karten/Navigation, z. B. "Autohäuser". */
  name: string;
  /** H1 / Meta-Title. */
  title: string;
  /** Meta-Description und Teaser. */
  description: string;
  intro: string[];
  benefits: SegmentBenefit[];
  /** Passende Leistungs-Slugs (interne Verlinkung). */
  services: string[];
  faq: QA[];
  keywords: string[];
}

export const gewerbeSegments: GewerbeSegment[] = [
  {
    slug: "autohaus",
    name: "Autohäuser",
    title: "Zulassungsservice für Autohäuser",
    description:
      "Express-Zulassungen für Auslieferungstermine, tägliche Abholung und ein fester Ansprechpartner: der Zulassungsdienst für Autohäuser – bundesweit und planbar.",
    intro: [
      "Jede Auslieferung hängt an der Zulassung: Steht der Übergabetermin, müssen Kennzeichen und Papiere fertig sein – sonst platzt der Termin und die Kundschaft wartet. Gleichzeitig bindet der Weg zur Zulassungsstelle Personal, das im Verkauf oder in der Disposition fehlt.",
      "Wir übernehmen Ihre Neuzulassungen, Tageszulassungen und Umschreibungen im festen Rhythmus: Ihre Zulassungsabteilung übermittelt die Vorgänge digital oder gibt sie unserer täglichen Abholung mit – wir liefern gestempelte Kennzeichen und Papiere termingerecht zurück. Express-Vorgänge für kurzfristige Auslieferungen kennzeichnen Sie einfach als eilig.",
    ],
    benefits: [
      {
        title: "Termingerecht zur Auslieferung",
        text: "Express-Abwicklung für eilige Kundenfahrzeuge – damit Übergabetermine halten, auch wenn es kurzfristig wird.",
      },
      {
        title: "Tageszulassungen im Block",
        text: "Zulassung und Abmeldung am selben Tag, auch für mehrere Fahrzeuge – sauber dokumentiert für Hersteller-Boni.",
      },
      {
        title: "Tägliche Abholung",
        text: "Auf Wunsch holen wir Zulassungsunterlagen täglich zur festen Uhrzeit in Ihrem Haus ab und liefern fertige Vorgänge zurück.",
      },
      {
        title: "Wunschkennzeichen für Ihre Kundschaft",
        text: "Reservierung und Prägung inklusive – ein Service, den Sie Ihren Käufern ohne eigenen Aufwand anbieten können.",
      },
    ],
    services: ["neuzulassung", "halterwechsel", "wunschkennzeichen", "abmeldung"],
    faq: [
      {
        question: "Wie schnell ist eine Express-Zulassung für eine Auslieferung möglich?",
        answer:
          "Als eilig gekennzeichnete Vorgänge reichen wir bevorzugt ein – je nach Behörde ist die Zulassung oft noch am selben Werktag oder am Folgetag fertig. Sprechen Sie Auslieferungstermine früh mit uns ab, dann planen wir den Vorgang entsprechend ein.",
      },
      {
        question: "Übernehmen Sie auch Tageszulassungen?",
        answer:
          "Ja. Zulassung und Außerbetriebsetzung erfolgen koordiniert am selben Tag, auf Wunsch für mehrere Fahrzeuge gebündelt – inklusive der Nachweise, die Sie für Hersteller und Buchhaltung benötigen.",
      },
      {
        question: "Wie funktioniert die Zusammenarbeit organisatorisch?",
        answer:
          "Einmalige Rahmenvollmacht, danach laufen alle Vorgänge formlos: Ihre Mitarbeiter übermitteln Unterlagen digital oder geben sie der Abholung mit. Sie erhalten eine Sammelrechnung mit allen Vorgängen im Überblick.",
      },
    ],
    keywords: [
      "Zulassungsservice Autohaus",
      "Zulassungsdienst Autohaus",
      "Tageszulassung Service",
      "Kfz-Zulassung Autohaus auslagern",
    ],
  },

  {
    slug: "autohaendler",
    name: "Autohändler",
    title: "Zulassungsdienst für Autohändler",
    description:
      "Umschreibungen, Abmeldungen beim Ankauf und Kurzzeitkennzeichen für Überführungen: der flexible Zulassungsdienst für Gebrauchtwagenhändler – ohne Fixkosten.",
    intro: [
      "Im Gebrauchtwagenhandel fällt Zulassungsarbeit unregelmäßig, aber ständig an: Ankäufe müssen abgemeldet, verkaufte Fahrzeuge auf Käufer umgeschrieben, Überführungen mit Kurzzeitkennzeichen organisiert werden. Für ein eigenes Zulassungspersonal reicht das Volumen oft nicht – für ständige Behördengänge ist es zu viel.",
      "Genau für diese Schwankungen sind wir gebaut: Sie zahlen pro Vorgang, ohne Grundgebühr und ohne Mindestmenge. Ob zwei Vorgänge pro Woche oder zwanzig – Abmeldungen erledigen wir meist taggleich digital, Umschreibungen in 1–3 Werktagen, deutschlandweit bei jeder Zulassungsbehörde.",
    ],
    benefits: [
      {
        title: "Ankauf sofort abmelden",
        text: "Angekaufte Fahrzeuge melden wir digital ab – meist noch am selben Werktag, ohne dass jemand Ihren Hof verlässt.",
      },
      {
        title: "Umschreibung als Verkaufsargument",
        text: "Bieten Sie Käufern das Fahrzeug fertig zugelassen an – wir schreiben bundesweit um, auch auf Kundschaft in anderen Bundesländern.",
      },
      {
        title: "Kurzzeitkennzeichen für Überführungen",
        text: "Probefahrten und Überführungen kurzfristig organisiert – inklusive passender eVB und Schildern.",
      },
      {
        title: "Keine Fixkosten",
        text: "Abrechnung pro Vorgang mit fairen Händlerkonditionen bei regelmäßigem Volumen – ohne Grundgebühr und Vertragsbindung.",
      },
    ],
    services: ["abmeldung", "halterwechsel", "kurzzeitkennzeichen", "wiederzulassung"],
    faq: [
      {
        question: "Kann ich Fahrzeuge auf meine Käufer in ganz Deutschland umschreiben lassen?",
        answer:
          "Ja. Wir arbeiten mit allen deutschen Zulassungsbehörden – die Umschreibung auf Käufer in anderen Städten oder Bundesländern ist Alltag. Kennzeichen und Papiere versenden wir direkt an Ihre Kundschaft oder zu Ihnen.",
      },
      {
        question: "Was brauche ich, um ein angekauftes Fahrzeug abmelden zu lassen?",
        answer:
          "Nur die Zulassungsbescheinigung Teil I und beide Kennzeichen mit freigelegten Sicherheitscodes – als Fotos. Die Abmeldebestätigung erhalten Sie per E-Mail, meist noch am selben Werktag.",
      },
      {
        question: "Gibt es eine Mindestmenge oder Vertragsbindung?",
        answer:
          "Nein. Sie beauftragen Vorgang für Vorgang; bei regelmäßigem Volumen erstellen wir Ihnen gern ein individuelles Angebot mit Händlerkonditionen.",
      },
    ],
    keywords: [
      "Zulassungsdienst Autohändler",
      "Gebrauchtwagenhändler Zulassungsservice",
      "Kfz Händler Abmeldung Service",
      "Umschreibung Händler",
    ],
  },

  {
    slug: "fuhrpark",
    name: "Fuhrparks & Flotten",
    title: "Zulassungsservice für Fuhrparks & Flotten",
    description:
      "Flottenzulassungen, Standortwechsel und Ausflottungen zentral abgewickelt: der Zulassungsservice für Fuhrparkmanagement – bundesweit mit einem Ansprechpartner.",
    intro: [
      "Fuhrparkmanagement heißt: viele Fahrzeuge, viele Standorte, viele Zulassungsbezirke – und jede Änderung erzeugt Behördenaufwand. Neue Fahrzeuge einflotten, Rückläufer stilllegen, nach einem Standortumzug die halbe Flotte ummelden: Wer das intern erledigt, verliert Tage an Zulassungsstellen im ganzen Bundesgebiet.",
      "Wir bündeln das für Sie: ein Ansprechpartner, alle Zulassungsbezirke, Sammelabwicklung im Batch. Sie übermitteln uns die Fahrzeugliste, wir takten die Vorgänge durch – inklusive Dokumentation je Fahrzeug, damit Ihre Fuhrparkverwaltung und Buchhaltung sauber zuordnen können.",
    ],
    benefits: [
      {
        title: "Sammelvorgänge im Batch",
        text: "Zehn Ummeldungen nach dem Standortwechsel oder die Einflottung einer Fahrzeugtranche – wir arbeiten Listen ab, nicht Einzelfälle.",
      },
      {
        title: "Alle Zulassungsbezirke",
        text: "Standorte in mehreren Städten? Wir bedienen jede deutsche Zulassungsbehörde – Sie brauchen keinen Dienstleister pro Region.",
      },
      {
        title: "Ausflottung inklusive",
        text: "Rückläufer und stillgelegte Fahrzeuge melden wir digital ab, meist taggleich – mit Bestätigung für Ihre Akten.",
      },
      {
        title: "Saubere Zuordnung",
        text: "Vorgangsdokumentation je Fahrzeug und Sammelrechnung – auf Wunsch mit Ihren Kennzeichnungen (Kostenstelle, interne Fahrzeugnummer).",
      },
    ],
    services: ["neuzulassung", "ummeldung", "abmeldung", "adressaenderung"],
    faq: [
      {
        question: "Unser Unternehmen zieht um – können Sie die ganze Flotte ummelden?",
        answer:
          "Ja, das ist ein klassischer Sammelvorgang: Sie senden uns die Fahrzeugliste mit den Papieren, wir takten die Ummeldungen durch und liefern aktualisierte Dokumente gebündelt zurück. Dank Kennzeichenmitnahme müssen die Schilder meist nicht einmal getauscht werden.",
      },
      {
        question: "Können Rechnungen nach Kostenstellen aufgeschlüsselt werden?",
        answer:
          "Ja. Nennen Sie uns je Fahrzeug Ihre interne Zuordnung (Kostenstelle, Fahrzeugnummer) – die Sammelrechnung weist die Vorgänge entsprechend aus.",
      },
      {
        question: "Arbeiten Sie auch mit Leasingfahrzeugen im Fuhrpark?",
        answer:
          "Ja. Bei geleasten Fahrzeugen stimmen wir die nötigen Vollmachten mit der Leasinggesellschaft ab – ein eingespielter Prozess, der Ihre Fuhrparkverwaltung nichts extra kostet.",
      },
    ],
    keywords: [
      "Fuhrpark Zulassungsservice",
      "Flottenzulassung",
      "Fuhrparkmanagement Zulassung",
      "Firmenwagen ummelden Service",
    ],
  },

  {
    slug: "leasing",
    name: "Leasing & Auto-Abo",
    title: "Zulassungsservice für Leasing- & Auto-Abo-Anbieter",
    description:
      "Zulassungen auf Endkunden, bundesweiter Kennzeichenversand und Rückläufer-Abmeldungen: der skalierbare Zulassungspartner für Leasing- und Auto-Abo-Anbieter.",
    intro: [
      "Leasing- und Abo-Modelle leben von schneller Fahrzeugverfügbarkeit: Zwischen Vertragsabschluss und Übergabe liegen oft nur Tage – und das Fahrzeug muss auf den Endkunden oder die eigene Gesellschaft zugelassen sein, häufig in einem ganz anderen Zulassungsbezirk als dem Firmensitz.",
      "Wir wickeln Ihre Zulassungen skalierbar ab: auf Endkunden oder auf Ihre Gesellschaft, in jedem Zulassungsbezirk, mit direktem Versand der Kennzeichen an den Auslieferungsort. Bei Vertragsende übernehmen wir die Abmeldung der Rückläufer – digital und meist taggleich.",
    ],
    benefits: [
      {
        title: "Zulassung auf Endkunden",
        text: "Wir lassen im Namen Ihrer Kundschaft zu – mit sauberem Vollmachtsprozess, den wir mit Ihnen einmal aufsetzen und dann skalieren.",
      },
      {
        title: "Versand an den Auslieferungsort",
        text: "Kennzeichen und Papiere gehen direkt dorthin, wo das Fahrzeug übergeben wird – zum Endkunden, Händler oder Logistikpartner.",
      },
      {
        title: "Rückläufer abmelden",
        text: "Vertragsende, Fahrzeug zurück: Wir melden digital ab und liefern die Bestätigung für Ihre Prozesse – ohne Behördengang.",
      },
      {
        title: "Skalierbar in Stoßzeiten",
        text: "Quartalsspitzen und Aktionswochen fangen wir ab – Sie übermitteln mehr Vorgänge, wir takten sie durch, ohne dass Ihr Team wächst.",
      },
    ],
    services: ["neuzulassung", "abmeldung", "ummeldung", "saisonkennzeichen"],
    faq: [
      {
        question: "Können Sie Fahrzeuge direkt auf unsere Endkunden zulassen?",
        answer:
          "Ja. Wir setzen mit Ihnen einmalig einen Vollmachts- und Unterlagenprozess auf (digital, ohne eID-Pflicht für Ihre Kundschaft) und wickeln danach jede Endkunden-Zulassung nach demselben Muster ab.",
      },
      {
        question: "Wohin werden Kennzeichen und Papiere geliefert?",
        answer:
          "Wohin Sie wollen: an den Endkunden, an den ausliefernden Händler oder an Ihr Logistikzentrum – versichert und mit Sendungsverfolgung.",
      },
      {
        question: "Wie binden wir Sie technisch an?",
        answer:
          "Heute per strukturierter Übermittlung (E-Mail/Datei); eine Schnittstellen-Anbindung für automatisierte Vorgänge bereiten wir derzeit vor. Sprechen Sie uns auf Ihre Systeme an.",
      },
    ],
    keywords: [
      "Leasing Zulassungsservice",
      "Auto-Abo Zulassung",
      "Zulassung Endkunde Leasing",
      "Zulassungsdienstleister Leasinggesellschaft",
    ],
  },
];

export function getSegment(slug: string): GewerbeSegment | undefined {
  return gewerbeSegments.find((s) => s.slug === slug);
}

/** FAQ der Hub-Seite /gewerbe. */
export const gewerbeHubFaq: QA[] = [
  {
    question: "Wie starten wir die Zusammenarbeit?",
    answer:
      "Mit einem kurzen Gespräch über Ihr Volumen und Ihre Abläufe. Danach erhalten Sie ein individuelles Angebot und die Rahmenvollmacht – ab dann laufen Vorgänge formlos per Digital-Übermittlung oder Abholung.",
  },
  {
    question: "Was kosten die Vorgänge für Gewerbekunden?",
    answer:
      "Die Konditionen richten sich nach Vorgangsarten und monatlichem Volumen – Sie erhalten eine transparente Preisliste ohne Grundgebühr und ohne versteckte Zuschläge. Fordern Sie einfach ein Angebot an.",
  },
  {
    question: "Arbeiten Sie bundesweit?",
    answer:
      "Ja, wir wickeln Vorgänge bei jeder deutschen Zulassungsbehörde ab. Den Abhol- und Bringservice bieten wir regional an; überregional übernehmen versicherte Versanddienstleister.",
  },
  {
    question: "Bekommen wir einen festen Ansprechpartner?",
    answer:
      "Ja. Eine feste Ansprechperson kennt Ihre Abläufe, Prioritäten und Besonderheiten – erreichbar per Telefon, E-Mail und WhatsApp, ohne Ticketsystem.",
  },
];
