/**
 * Bilderanleitung „Auto online zulassen mit DeutscheZulassung“ – Schritt für Schritt.
 *
 * Gemeinsame Datenquelle für die Seite /anleitung und die daraus erzeugte PDF
 * (scripts/build-anleitung-pdf.sh). WICHTIG zum Ablauf: DeutscheZulassung prägt
 * und versendet KEINE Kennzeichen – die Schilder lässt der Kunde selbst bei
 * einem lokalen Schildermacher prägen (wir empfehlen einen in der Nähe).
 */

export interface AnleitungStep {
  title: string;
  /** Kurze Einordnung: wie lange, wer. */
  meta: string;
  text: string;
  bullets?: string[];
  tip?: string;
  image: { src: string; alt: string };
}

export const anleitungSteps: AnleitungStep[] = [
  {
    title: "Leistung wählen und Auftrag starten",
    meta: "ca. 2 Minuten · Sie",
    text: "Wählen Sie im Online-Auftrag, was erledigt werden soll – Neuzulassung, Umschreibung, Ummeldung oder Abmeldung – und geben Sie Ihre Postleitzahl und Kontaktdaten an. Lieber per Chat? Schreiben Sie uns einfach bei WhatsApp, wir fragen alles Nötige kurz ab.",
    tip: "Kein Kundenkonto, keine Registrierung – der Auftrag ist in zwei Minuten abgeschickt.",
    image: {
      src: "/images/anleitung-auftrag-handy.jpg",
      alt: "Hände halten ein Smartphone mit dem geöffneten Online-Auftragsformular",
    },
  },
  {
    title: "Unterlagen abfotografieren",
    meta: "ca. 5 Minuten · Sie",
    text: "Fotografieren Sie Ihre Unterlagen mit dem Handy und laden Sie die Bilder hoch oder senden Sie sie im Chat. Scans oder PDFs gehen genauso. Für den Start genügen Fotos – Originale brauchen wir nur, wenn die Behörde sie ausdrücklich verlangt.",
    bullets: [
      "Zulassungsbescheinigung Teil I (Fahrzeugschein) und Teil II (Fahrzeugbrief) – beim Neuwagen das CoC-Papier",
      "eVB-Nummer Ihrer Kfz-Versicherung (7-stelliger Code, kommt per E-Mail oder SMS)",
      "Personalausweis oder Reisepass (Vorder- und Rückseite)",
      "Bankverbindung für das SEPA-Mandat der Kfz-Steuer",
      "Beim Gebrauchtwagen zusätzlich: HU-Nachweis und Kaufvertrag",
    ],
    image: {
      src: "/images/unterlagen-foto.jpg",
      alt: "Smartphone fotografiert die Zulassungsbescheinigung am Küchentisch",
    },
  },
  {
    title: "Sicherheitscodes freilegen",
    meta: "ca. 2 Minuten · Sie",
    text: "Für die Online-Zulassung benötigen wir die verdeckten Sicherheitscodes: das Rubbelfeld auf dem Fahrzeugschein (Teil I) und das Sicherheitsfeld im Fahrzeugbrief (Teil II). Bei Umschreibung oder Abmeldung eines zugelassenen Fahrzeugs zusätzlich die Codes unter den Stempelplaketten der Kennzeichen. Einfach vorsichtig freirubbeln bzw. ablösen und gut lesbar fotografieren.",
    tip: "Erst freilegen, wenn wir Ihnen das Go geben – ein freigelegter Code entwertet das Dokument. Wir sagen Ihnen genau, welche Felder für Ihren Vorgang nötig sind.",
    image: {
      src: "/images/sicherheitscode-zb1.jpg",
      alt: "Freigerubbeltes Sicherheitscode-Feld auf der Zulassungsbescheinigung Teil I",
    },
  },
  {
    title: "Festpreis bestätigen und digital unterschreiben",
    meta: "ca. 1 Minute · Sie",
    text: "Wir prüfen Ihre Unterlagen auf Vollständigkeit und senden Ihnen die verbindliche Festpreis-Bestätigung samt digitaler Vollmacht. Ein Blick, eine Unterschrift auf dem Handy – damit dürfen wir den Vorgang für Sie bei der Behörde durchführen.",
    tip: "Bis hierhin ist alles unverbindlich und kostenlos. Der Auftrag entsteht erst mit Ihrer Bestätigung.",
    image: {
      src: "/images/anleitung-vollmacht-unterschrift.jpg",
      alt: "Finger unterschreibt eine digitale Vollmacht auf dem Smartphone",
    },
  },
  {
    title: "Wir führen die Zulassung durch",
    meta: "1–3 Werktage · DeutscheZulassung",
    text: "Jetzt übernehmen wir: Wir wickeln Ihren Vorgang digital bei der zuständigen Zulassungsbehörde ab. Sobald die Zulassung steht, erhalten Sie von uns Ihre zugeteilte Kennzeichen-Kombination und – bei der Online-Zulassung – den vorläufigen Zulassungsnachweis, mit dem Sie bereits fahren dürfen.",
    tip: "Abmeldungen sind meist noch am selben Werktag erledigt – Sie erhalten die Abmeldebestätigung per E-Mail, und die Anleitung endet für Sie hier.",
    image: {
      src: "/images/anleitung-zulassung-erledigt.jpg",
      alt: "Laptop mit Bestätigungsanzeige neben Fahrzeugpapieren auf einem Schreibtisch",
    },
  },
  {
    title: "Kennzeichen beim Schildermacher prägen lassen",
    meta: "ca. 10 Minuten · Sie, vor Ort",
    text: "Mit Ihrer Kennzeichen-Kombination gehen Sie zu einem Schildermacher in Ihrer Nähe – wir empfehlen Ihnen gern einen. Die Schilder werden in wenigen Minuten geprägt; Sie zahlen sie direkt dort. So sparen Sie Versandzeit und halten Ihre Kennzeichen noch am selben Tag in der Hand.",
    bullets: [
      "Kosten: in der Regel ca. 20–35 € pro Kennzeichenpaar",
      "Mitbringen: die zugeteilte Kombination (wir senden sie Ihnen) – manche Prägestellen möchten zusätzlich den Zulassungsnachweis sehen",
    ],
    image: {
      src: "/images/anleitung-schildermacher.jpg",
      alt: "Frisch geprägtes Kennzeichen wird aus der Prägemaschine eines Schildermachers genommen",
    },
  },
  {
    title: "Plaketten aufkleben und Papiere ablegen",
    meta: "ca. 5 Minuten · Sie",
    text: "Ihre Stempelplaketten (das Landessiegel für beide Kennzeichen, beim Pkw dazu die HU-Plakette fürs hintere Schild) und die neue Zulassungsbescheinigung Teil I erhalten Sie per Post. Plaketten an der markierten Stelle auf die Kennzeichen kleben, Schilder montieren – fertig. Den Fahrzeugschein ins Auto, den Fahrzeugbrief sicher zu Hause aufbewahren.",
    tip: "Bis die Plaketten da sind, fahren Sie mit dem vorläufigen Zulassungsnachweis – bis zu 10 Tage im Inland.",
    image: {
      src: "/images/anleitung-plakette-aufkleben.jpg",
      alt: "Hände kleben die Stempelplakette auf ein neues Kennzeichen",
    },
  },
  {
    title: "Losfahren",
    meta: "Geschafft",
    text: "Kennzeichen montiert, Plaketten drauf, Fahrzeugschein an Bord: Ihr Auto ist zugelassen – ohne einen einzigen Behördengang. Bei Fragen bleibt Ihre Ansprechperson per WhatsApp erreichbar, auch nach Abschluss.",
    image: {
      src: "/images/anleitung-losfahren.jpg",
      alt: "Auto mit neuem Kennzeichen in einer sonnigen Wohnstraße, eine Hand hält den Autoschlüssel",
    },
  },
];
