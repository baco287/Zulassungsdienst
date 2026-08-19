import type { QA } from "./serviceContent";

/**
 * Stadt-Landingpages (/kfz-zulassung/[stadt]).
 *
 * Jede Stadt hat EIGENE Inhalte (zuständige Behörde, Kennzeichen-Kürzel,
 * lokale Besonderheiten, eigene FAQ) – keine Textbausteine mit
 * ausgetauschtem Stadtnamen. Wichtig für Ehrlichkeit und Recht:
 * DeutscheZulassung wickelt Vorgänge DIGITAL bei der jeweils zuständigen
 * Behörde ab – die Seiten behaupten keine physische Präsenz vor Ort.
 */

export interface CityFact {
  label: string;
  value: string;
}

export interface City {
  slug: string;
  name: string;
  /** H1-Zusatz, z. B. "in Berlin". */
  inName: string;
  /** Meta-Description und Teaser. */
  description: string;
  intro: string[];
  facts: CityFact[];
  faq: QA[];
  keywords: string[];
}

export const cities: City[] = [
  {
    slug: "berlin",
    name: "Berlin",
    inName: "in Berlin",
    description:
      "Kfz-Zulassung in Berlin ohne LABO-Termin: Wir übernehmen Neuzulassung, Ummeldung und Abmeldung bei der Berliner Zulassungsbehörde – digital, zum Festpreis von 129 €.",
    intro: [
      "Wer in Berlin ein Auto anmelden will, kennt das Problem: Termine bei der Zulassungsbehörde des LABO (Landesamt für Bürger- und Ordnungsangelegenheiten) sind oft auf Wochen ausgebucht – und ohne Termin geht am Schalter nichts. Für Berufstätige heißt das: Urlaubstag opfern oder das Fahrzeug steht.",
      "Wir nehmen Ihnen den kompletten Vorgang ab: Sie fotografieren Ihre Unterlagen, erteilen die digitale Vollmacht – wir führen die Zulassung bei der Berliner Behörde durch und senden Ihnen gestempelte B-Kennzeichen und Papiere nach Hause. Ohne Termin, ohne Wartemarke, in der Regel innerhalb von 1–3 Werktagen.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "B" },
      { label: "Zuständige Behörde", value: "LABO – Kfz-Zulassungsbehörde Berlin" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Wie lange dauert die Kfz-Zulassung in Berlin über DeutscheZulassung?",
        answer:
          "In der Regel 1–3 Werktage ab vollständigen Unterlagen, zuzüglich Versand. Sie brauchen keinen eigenen Termin beim LABO – wir wickeln den Vorgang für Sie ab. Abmeldungen erledigen wir meist noch am selben Werktag.",
      },
      {
        question: "Brauche ich für die Zulassung in Berlin einen Termin?",
        answer:
          "Über uns nicht. Die teils wochenlange Terminsuche bei der Berliner Zulassungsbehörde entfällt komplett – Sie reichen alles digital ein, wir übernehmen den Behördenvorgang.",
      },
      {
        question: "Kann ich in Berlin ein Wunschkennzeichen bekommen?",
        answer:
          "Ja. Wir prüfen die Verfügbarkeit Ihrer B-Wunschkombination, reservieren sie und übernehmen Prägung und Zuteilung – für 34,90 € Aufpreis inklusive amtlicher Gebühren.",
      },
      {
        question: "Ich ziehe nach Berlin – muss ich mein Auto ummelden?",
        answer:
          "Ja, nach dem Umzug muss die neue Adresse in die Fahrzeugpapiere. Ihr bisheriges Kennzeichen dürfen Sie dank bundesweiter Kennzeichenmitnahme behalten – oder Sie wechseln auf Wunsch auf ein B-Kennzeichen. Beides erledigen wir digital.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Berlin",
      "Auto anmelden Berlin",
      "Zulassungsdienst Berlin",
      "Auto ummelden Berlin ohne Termin",
      "LABO Termin Alternative",
    ],
  },

  {
    slug: "hamburg",
    name: "Hamburg",
    inName: "in Hamburg",
    description:
      "Kfz-Zulassung in Hamburg ohne LBV-Termin: Neuzulassung, Ummeldung und Abmeldung beim Landesbetrieb Verkehr – komplett digital erledigt, Festpreis 129 €.",
    intro: [
      "In Hamburg läuft die Fahrzeugzulassung über den Landesbetrieb Verkehr (LBV) – und dessen Termine sind begehrt: Wer kurzfristig ein Fahrzeug anmelden oder umschreiben will, wartet häufig länger, als der Autokauf gedauert hat. Dazu kommen Anfahrt, Wartezeit und Papierkram.",
      "Mit uns läuft die Zulassung nebenbei: Unterlagen abfotografieren, digitale Vollmacht bestätigen, fertig. Wir führen den Vorgang beim LBV durch, lassen Ihre HH-Kennzeichen prägen und liefern alles versichert an Ihre Adresse – vom Neuwagen in Eppendorf bis zum Gebrauchtwagen in Harburg.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "HH" },
      { label: "Zuständige Behörde", value: "Landesbetrieb Verkehr (LBV) Hamburg" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Funktioniert der Service in ganz Hamburg?",
        answer:
          "Ja – der Vorgang läuft digital beim LBV, unabhängig davon, in welchem Stadtteil Sie wohnen. Kennzeichen und Papiere kommen per versichertem Versand zu Ihnen.",
      },
      {
        question: "Was kostet die Kfz-Zulassung in Hamburg über DeutscheZulassung?",
        answer:
          "129 € als Komplettpreis für Neuzulassung, Umschreibung oder Ummeldung – amtliche LBV-Gebühren, HH-Kennzeichen und Versand inklusive. Die Abmeldung kostet 34,90 €.",
      },
      {
        question: "Kann ich mein HH-Kennzeichen beim Umzug ins Umland behalten?",
        answer:
          "Ja. Die Kennzeichenmitnahme gilt bundesweit – auch beim Wechsel in die Umlandkreise wie Pinneberg, Stormarn oder Harburg bleibt Ihr HH-Kennzeichen auf Wunsch bestehen.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Hamburg",
      "Auto anmelden Hamburg",
      "LBV Hamburg Termin Alternative",
      "Auto ummelden Hamburg",
      "Zulassungsservice Hamburg",
    ],
  },

  {
    slug: "muenchen",
    name: "München",
    inName: "in München",
    description:
      "Kfz-Zulassung in München ohne KVR-Termin: Wir erledigen Neuzulassung, Umschreibung und Abmeldung bei der Münchner Zulassungsbehörde – digital zum Festpreis von 129 €.",
    intro: [
      "Die Kfz-Zulassungsstelle des Münchner Kreisverwaltungsreferats (KVR) an der Eichstätter Straße gehört zu den größten Zulassungsbehörden Deutschlands – entsprechend gefragt sind die Termine. Wer schnell ein Fahrzeug zulassen muss, etwa nach einem Neuwagenkauf beim Händler, steht oft vor ausgebuchten Kalendern.",
      "Wir übernehmen das für Sie: digital, ohne Termin, ohne Anfahrt quer durch die Stadt. Sie senden uns Fotos Ihrer Unterlagen, wir führen den Vorgang beim KVR durch – inklusive M-Kennzeichen, auf Wunsch als Wunschkennzeichen – und liefern alles versichert zu Ihnen nach Hause oder ins Autohaus.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "M" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle im KVR München" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich wohne im Landkreis München – gilt der Service auch für mich?",
        answer:
          "Ja. Für den Landkreis (Kennzeichen M mit Landratsamts-Zuständigkeit) wickeln wir den Vorgang bei der dort zuständigen Behörde ab – Sie merken keinen Unterschied, der Ablauf bleibt gleich.",
      },
      {
        question: "Wie schnell bekomme ich mein Auto in München zugelassen?",
        answer:
          "Über uns in der Regel innerhalb von 1–3 Werktagen ab vollständigen Unterlagen – ohne die Terminsuche beim KVR. Eilige Vorgänge, etwa für eine Neuwagen-Abholung, kennzeichnen Sie einfach als Express.",
      },
      {
        question: "Übernehmen Sie auch Zulassungen für Münchner Autohäuser?",
        answer:
          "Ja, mit Sammelabwicklung, Staffelkonditionen und Express für Auslieferungstermine – Details auf unserer Seite für Autohäuser und Gewerbekunden.",
      },
    ],
    keywords: [
      "Kfz-Zulassung München",
      "Auto anmelden München",
      "KVR Zulassungsstelle Termin Alternative",
      "Auto ummelden München",
      "Zulassungsdienst München",
    ],
  },

  {
    slug: "koeln",
    name: "Köln",
    inName: "in Köln",
    description:
      "Kfz-Zulassung in Köln ohne Behördengang: Neuzulassung, Ummeldung und Abmeldung beim Kölner Kfz-Zulassungsamt – digital erledigt, Festpreis 129 €.",
    intro: [
      "Das Kölner Kfz-Zulassungsamt im Stadtteil Poll bündelt die Zulassungen der Millionenstadt – mit Online-Terminvergabe, die schnell vergriffen ist. Zwischen Rechtsrheinisch und Linksrheinisch kostet der Behördengang schnell einen halben Tag.",
      "Sparen Sie sich den Weg: Wir erledigen Ihre Zulassung digital beim Kölner Amt, prägen Ihre K-Kennzeichen und senden Ihnen alles versichert zu. Auch Umschreibungen nach dem Gebrauchtwagenkauf im Umland – etwa aus dem Rhein-Erft-Kreis oder Leverkusen – schreiben wir direkt auf Ihre Kölner Adresse um.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "K" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsamt der Stadt Köln" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto außerhalb von Köln gekauft – können Sie es auf mich umschreiben?",
        answer:
          "Ja, das ist der Standardfall: Wir schreiben das Fahrzeug bei der Kölner Behörde auf Sie um – egal, wo es vorher zugelassen war. Das bisherige Kennzeichen kann auf Wunsch übernommen werden.",
      },
      {
        question: "Was kostet die Zulassung in Köln?",
        answer:
          "Über uns 129 € komplett – amtliche Gebühren, K-Kennzeichen und versicherter Versand inklusive. Selbst am Schalter zahlen Sie Gebühren plus Schilder; der Aufpreis für den Komplettservice ist überschaubar, die Zeitersparnis erheblich.",
      },
      {
        question: "Bieten Sie Wunschkennzeichen mit K an?",
        answer:
          "Ja – wir prüfen die Verfügbarkeit, reservieren Ihre Kombination und liefern die geprägten Schilder mit. Beliebte Kürzel sind schnell weg, nennen Sie uns am besten zwei bis drei Alternativen.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Köln",
      "Auto anmelden Köln",
      "Zulassungsstelle Köln ohne Termin",
      "Auto ummelden Köln",
      "Zulassungsservice Köln",
    ],
  },

  {
    slug: "frankfurt",
    name: "Frankfurt am Main",
    inName: "in Frankfurt am Main",
    description:
      "Kfz-Zulassung in Frankfurt ohne Behördengang: Wir übernehmen Ihre Zulassung, Ummeldung oder Abmeldung bei der Frankfurter Zulassungsbehörde – digital, Festpreis 129 €.",
    intro: [
      "Pendlerstadt Frankfurt: Viele arbeiten hier, wohnen im Umland – oder umgekehrt. Für die Kfz-Zulassungsbehörde der Stadt bleibt da wenig Zeit, zumal Termine rar sind und der Vorgang am Schalter dauert. Gerade nach einem Umzug in die Stadt oder einem Fahrzeugkauf soll es aber schnell gehen.",
      "Wir erledigen Ihre Zulassung, während Sie arbeiten: digital eingereicht, von uns bei der Frankfurter Behörde durchgeführt, F-Kennzeichen inklusive. Auch für Zuzügler aus dem Rhein-Main-Gebiet – ob aus Offenbach, Bad Homburg oder Wiesbaden – wickeln wir die Ummeldung komplett ab.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "F" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Frankfurt am Main" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich bin neu in Frankfurt – was muss ich mit meinem Auto machen?",
        answer:
          "Nach dem Umzug muss die neue Adresse in die Fahrzeugpapiere (Ummeldung). Ihr bisheriges Kennzeichen dürfen Sie behalten oder auf ein F-Kennzeichen wechseln. Wir erledigen beides digital – Sie sparen sich den Behördentermin komplett.",
      },
      {
        question: "Wie läuft die Zulassung, wenn ich tagsüber nicht erreichbar bin?",
        answer:
          "Vollständig asynchron: Unterlagen hochladen oder per WhatsApp senden, Vollmacht digital bestätigen – den Rest erledigen wir und melden uns, sobald Kennzeichen und Papiere unterwegs sind.",
      },
      {
        question: "Übernehmen Sie auch Firmenwagen-Zulassungen in Frankfurt?",
        answer:
          "Ja, von der einzelnen Firmenwagen-Zulassung bis zur Flotten-Sammelabwicklung – inklusive Zulassung auf die Gesellschaft mit Handelsregisterauszug. Details auf unserer Gewerbe-Seite.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Frankfurt",
      "Auto anmelden Frankfurt am Main",
      "Zulassungsstelle Frankfurt ohne Termin",
      "Auto ummelden Frankfurt",
      "Zulassungsservice Rhein-Main",
    ],
  },

  {
    slug: "stuttgart",
    name: "Stuttgart",
    inName: "in Stuttgart",
    description:
      "Kfz-Zulassung in Stuttgart ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung bei der Stuttgarter Zulassungsbehörde – digital zum Festpreis von 129 €.",
    intro: [
      "In der Autostadt Stuttgart werden täglich Fahrzeuge zugelassen, umgeschrieben und stillgelegt – die Zulassungsbehörde der Landeshauptstadt ist entsprechend ausgelastet. Termine wollen erkämpft, Wartezeiten eingeplant sein.",
      "Ob Neuwagen vom Hersteller, Gebrauchter vom Händler an der B14 oder Leasingrückläufer: Wir übernehmen den kompletten Zulassungsvorgang digital, kümmern uns um Ihre S-Kennzeichen und liefern die fertigen Papiere zu Ihnen – nach Stuttgart-Mitte genauso wie nach Vaihingen oder Bad Cannstatt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "S" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Stuttgart" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Kann ich mein Saisonkennzeichen für Motorrad oder Cabrio über Sie einrichten?",
        answer:
          "Ja. Beim Zulassungsvorgang richten wir den gewünschten Saisonzeitraum (2–11 Monate) direkt mit ein – Sie sparen Steuer und Versicherung außerhalb der Saison.",
      },
      {
        question: "Wie schnell geht eine Abmeldung in Stuttgart?",
        answer:
          "Meist noch am selben Werktag: Sie senden uns Fotos der freigelegten Sicherheitscodes von Fahrzeugschein und Kennzeichen, wir setzen das Fahrzeug digital außer Betrieb und Sie erhalten die Bestätigung per E-Mail.",
      },
      {
        question: "Gilt der Service auch für die Umlandkreise?",
        answer:
          "Ja – ob Böblingen, Esslingen, Ludwigsburg oder Rems-Murr: Wir wickeln den Vorgang bei der jeweils zuständigen Zulassungsbehörde ab, der Ablauf für Sie bleibt identisch.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Stuttgart",
      "Auto anmelden Stuttgart",
      "Zulassungsstelle Stuttgart ohne Termin",
      "Auto abmelden Stuttgart",
      "Zulassungsdienst Stuttgart",
    ],
  },

  {
    slug: "duesseldorf",
    name: "Düsseldorf",
    inName: "in Düsseldorf",
    description:
      "Kfz-Zulassung in Düsseldorf ohne Behördengang: Wir erledigen Zulassung, Ummeldung und Abmeldung bei der Düsseldorfer Zulassungsbehörde – digital, Festpreis 129 €.",
    intro: [
      "Die Kfz-Zulassungsbehörde der Landeshauptstadt Düsseldorf arbeitet mit Terminvergabe – und wie überall in NRW-Großstädten sind die Slots schnell weg. Wer beruflich eingespannt ist oder gerade erst zugezogen, verliert mit dem Behördengang schnell einen halben Tag.",
      "Bei uns läuft alles digital: Unterlagen als Foto, Vollmacht per Klick, und wir führen den Vorgang bei der Düsseldorfer Behörde durch. D-Kennzeichen – gern als Wunschkennzeichen – und Papiere kommen versichert zu Ihnen. Auch Leasing- und Firmenfahrzeuge, die in der Landeshauptstadt häufig sind, wickeln wir routiniert ab.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "D" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Düsseldorf" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Können Sie ein Leasingfahrzeug in Düsseldorf zulassen?",
        answer:
          "Ja. Wir stimmen die nötigen Vollmachten mit der Leasinggesellschaft ab und lassen das Fahrzeug auf Sie oder Ihre Firma zu – ein Standardvorgang bei uns.",
      },
      {
        question: "Was brauche ich für die Ummeldung nach Düsseldorf?",
        answer:
          "Zulassungsbescheinigung Teil I und II, Ausweis mit neuer Adresse (oder Meldebescheinigung) und ein SEPA-Mandat für die Kfz-Steuer. Ihr bisheriges Kennzeichen können Sie behalten – oder auf D wechseln.",
      },
      {
        question: "Wie erhalte ich meine Kennzeichen?",
        answer:
          "Per versichertem Versand mit Sendungsverfolgung an Ihre Wunschadresse – nach Hause, ins Büro oder ins Autohaus.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Düsseldorf",
      "Auto anmelden Düsseldorf",
      "Zulassungsstelle Düsseldorf ohne Termin",
      "Auto ummelden Düsseldorf",
      "Zulassungsservice Düsseldorf",
    ],
  },

  {
    slug: "leipzig",
    name: "Leipzig",
    inName: "in Leipzig",
    description:
      "Kfz-Zulassung in Leipzig ohne Behördengang: Neuzulassung, Ummeldung und Abmeldung bei der Leipziger Zulassungsbehörde – digital erledigt, Festpreis 129 €.",
    intro: [
      "Leipzig wächst – und mit jedem Zuzug steigt der Andrang bei der Kfz-Zulassungsbehörde der Stadt. Wer gerade umgezogen ist oder einen Gebrauchtwagen gekauft hat, möchte nicht Wochen auf einen Termin warten.",
      "Wir erledigen Ihre Zulassung digital bei der Leipziger Behörde: L-Kennzeichen, Umschreibung oder Abmeldung – Sie reichen die Unterlagen bequem per Foto ein und erhalten alles fertig zurück. Gerade für Zuzügler aus anderen Bundesländern übernehmen wir die komplette Ummeldung samt Klärung, ob Ihr altes Kennzeichen bleiben kann (Spoiler: ja, wenn Sie möchten).",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "L" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Leipzig" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich bin neu in Leipzig – muss ich mein Kennzeichen wechseln?",
        answer:
          "Nein. Seit 2015 dürfen Sie Ihr bisheriges Kennzeichen bundesweit mitnehmen – nur die Adresse in den Papieren wird aktualisiert. Wer lieber ein L-Kennzeichen möchte, bekommt es von uns inklusive Prägung.",
      },
      {
        question: "Was kostet die Kfz-Zulassung in Leipzig?",
        answer:
          "129 € Komplettpreis über uns – amtliche Gebühren, Kennzeichen und versicherter Versand inklusive. Die Abmeldung kostet 34,90 € und ist meist taggleich erledigt.",
      },
      {
        question: "Funktioniert der Service auch im Landkreis Leipzig oder Nordsachsen?",
        answer:
          "Ja. Wir wickeln Vorgänge bei jeder Zulassungsbehörde ab – auch bei den Landratsämtern der umliegenden Kreise. Der Ablauf für Sie ist überall gleich.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Leipzig",
      "Auto anmelden Leipzig",
      "Zulassungsstelle Leipzig ohne Termin",
      "Auto ummelden Leipzig",
      "Zulassungsservice Leipzig",
    ],
  },

  {
    slug: "hannover",
    name: "Hannover",
    inName: "in Hannover",
    description:
      "Kfz-Zulassung in Hannover ohne Behördengang: Wir übernehmen Ihre Zulassung bei der Region Hannover – digital, ohne Termin, zum Festpreis von 129 €.",
    intro: [
      "Besonderheit in Hannover: Zuständig für die Fahrzeugzulassung ist nicht die Stadt, sondern die Region Hannover – sie bedient Landeshauptstadt und Umlandkommunen gemeinsam. Entsprechend groß ist das Einzugsgebiet, entsprechend gefragt sind die Termine.",
      "Für Sie spielt die Behördenstruktur keine Rolle: Wir wickeln Ihren Vorgang bei der zuständigen Stelle der Region ab – ob Sie in der List wohnen, in Laatzen oder in Langenhagen. H-Kennzeichen, Papiere und auf Wunsch Ihr Wunschkennzeichen kommen versichert zu Ihnen nach Hause.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "H" },
      { label: "Zuständige Behörde", value: "Region Hannover, Fachbereich Verkehr (Zulassungsbehörde)" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich wohne im Umland von Hannover – bin ich bei Ihnen richtig?",
        answer:
          "Ja. Die Region Hannover ist für Stadt und Umlandkommunen zuständig – von Barsinghausen bis Burgdorf. Wir wickeln Ihren Vorgang genau dort ab, Ihr Ablauf bleibt derselbe.",
      },
      {
        question: "Verwechslungsgefahr: H-Kennzeichen und Oldtimer-H – was ist der Unterschied?",
        answer:
          "Das Unterscheidungszeichen „H“ am Anfang steht für Hannover. Das kleine „H“ am Ende eines Kennzeichens ist dagegen das Historien-Kennzeichen für Oldtimer ab 30 Jahren – auch das beantragen wir auf Wunsch mit.",
      },
      {
        question: "Wie schnell ist eine Abmeldung in Hannover möglich?",
        answer:
          "Meist taggleich: Codes freilegen, fotografieren, senden – die Abmeldebestätigung der Region Hannover erhalten Sie per E-Mail.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Hannover",
      "Auto anmelden Hannover",
      "Region Hannover Zulassung ohne Termin",
      "Auto ummelden Hannover",
      "Zulassungsservice Hannover",
    ],
  },

  {
    slug: "nuernberg",
    name: "Nürnberg",
    inName: "in Nürnberg",
    description:
      "Kfz-Zulassung in Nürnberg ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung bei der Nürnberger Zulassungsbehörde – digital zum Festpreis von 129 €.",
    intro: [
      "Die Zulassungsstelle der Stadt Nürnberg bedient eine halbe Million Einwohner – und die Metropolregion drumherum sorgt für zusätzlichen Andrang, wenn Fahrzeuge zwischen Stadt, Fürth und Erlangen den Besitzer wechseln.",
      "Wir machen daraus einen digitalen Vorgang: Sie senden uns Ihre Unterlagen als Foto, wir erledigen Zulassung oder Umschreibung bei der Nürnberger Behörde und liefern N-Kennzeichen samt Papieren versichert zu Ihnen. Auch der Klassiker der Region – Gebrauchtwagenkauf in Fürth, Zulassung in Nürnberg – ist bei uns Routine.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "N" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Nürnberg" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto in Fürth oder Erlangen gekauft – können Sie es in Nürnberg zulassen?",
        answer:
          "Ja. Wir schreiben das Fahrzeug bei der Nürnberger Behörde auf Ihre Adresse um; das bisherige FÜ- oder ER-Kennzeichen kann auf Wunsch sogar bleiben – oder Sie wechseln auf N.",
      },
      {
        question: "Was kostet die Zulassung in Nürnberg über DeutscheZulassung?",
        answer:
          "129 € komplett – amtliche Gebühren, Kennzeichen und versicherter Versand inklusive. Abmeldungen kosten 34,90 € und sind meist am selben Werktag erledigt.",
      },
      {
        question: "Bekomme ich ein Wunschkennzeichen mit N?",
        answer:
          "Ja – Verfügbarkeitsprüfung, Reservierung und Prägung übernehmen wir für 34,90 € Aufpreis inklusive der amtlichen Gebühren.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Nürnberg",
      "Auto anmelden Nürnberg",
      "Zulassungsstelle Nürnberg ohne Termin",
      "Auto ummelden Nürnberg",
      "Zulassungsservice Nürnberg",
    ],
  },
  {
    slug: "dortmund",
    name: "Dortmund",
    inName: "in Dortmund",
    description:
      "Kfz-Zulassung in Dortmund ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Dortmunder Behörde – Festpreis 129 €.",
    intro: [
      "Dortmund ist einer der größten Gebrauchtwagen-Umschlagplätze des Ruhrgebiets: Händlerhöfe entlang der Ausfallstraßen, Privatverkäufe über die Stadtgrenzen hinweg – und nach jedem Kauf steht die Umschreibung an. Die Terminkalender der Kfz-Zulassungsstelle der Stadt Dortmund sind entsprechend gut gefüllt.",
      "Den Weg dorthin können Sie sich sparen: Sie fotografieren Zulassungsbescheinigung, Ausweis und eVB-Nummer, bestätigen die digitale Vollmacht – wir wickeln den Vorgang bei der zuständigen Dortmunder Behörde ab und senden Ihnen gestempelte DO-Kennzeichen samt Papieren versichert zu. Das gekaufte Fahrzeug kann derweil beim Verkäufer stehen bleiben, bis alles fertig ist.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "DO" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Dortmund" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe privat einen Gebrauchten in Dortmund gekauft – wie läuft die Umschreibung?",
        answer:
          "Sie senden uns Fotos beider Zulassungsbescheinigungen, Ihres Ausweises und die eVB-Nummer Ihrer Versicherung. Wir schreiben das Fahrzeug bei der Dortmunder Behörde auf Sie um – das bisherige Kennzeichen kann seit 2019 auch beim Halterwechsel übernommen werden, oder Sie wechseln auf DO.",
      },
      {
        question: "Kann das gekaufte Auto beim Verkäufer stehen bleiben, bis es zugelassen ist?",
        answer:
          "Ja, das ist sogar der übliche Ablauf: Erst wenn Kennzeichen und Papiere bei Ihnen sind, holen Sie das Fahrzeug ab und fahren es direkt legal nach Hause. Ungeduldige Überführungsfahrten mit fremden Schildern erübrigen sich damit.",
      },
      {
        question: "Was passiert mit meinem alten Auto, wenn ich es in Zahlung gebe oder verschrotte?",
        answer:
          "Die Abmeldung übernehmen wir für 34,90 € und erledigen sie meist noch am selben Werktag. Bei Verschrottung reichen wir auf Wunsch den Verwertungsnachweis gleich mit ein.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Dortmund",
      "Auto anmelden Dortmund",
      "Auto umschreiben Dortmund",
      "Zulassungsstelle Dortmund ohne Termin",
      "Zulassungsservice Dortmund",
    ],
  },

  {
    slug: "essen",
    name: "Essen",
    inName: "in Essen",
    description:
      "Kfz-Zulassung in Essen ohne Behördengang: Wir erledigen Zulassung, Ummeldung und Abmeldung digital bei der Essener Behörde – Festpreis 129 €.",
    intro: [
      "Essen hat mit dem einzelnen Buchstaben E eines der kürzesten Kennzeichen Deutschlands – entsprechend beliebt sind knackige Wunschkombinationen wie E-XX 1. Wer eine bestimmte Kombination will, sollte schnell sein, denn kurze Kürzel plus kurze Zahl sind rar. Und für die Zuteilung braucht es ohnehin den Weg über die Kfz-Zulassungsstelle der Stadt Essen.",
      "Genau den nehmen wir Ihnen ab: Sie nennen uns Ihre Wunschkombination (gern mit zwei, drei Alternativen), wir prüfen die Verfügbarkeit, reservieren und wickeln die komplette Zulassung digital bei der Essener Behörde ab. Auch ganz ohne Wunschkennzeichen gilt: Unterlagen fotografieren, Vollmacht bestätigen, E-Schilder und Papiere kommen versichert zu Ihnen – vom Südviertel bis Katernberg.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "E" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Essen" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Wie stehen die Chancen auf ein kurzes E-Wunschkennzeichen?",
        answer:
          "Sehr kurze Kombinationen sind begehrt und oft vergeben – aber wir prüfen die Verfügbarkeit tagesaktuell und reservieren sofort, wenn Ihre Kombination frei ist. Nennen Sie uns am besten mehrere Varianten in Ihrer Wunschreihenfolge.",
      },
      {
        question: "Verwechseln Behörden das E-Kennzeichen mit dem E für Elektroautos?",
        answer:
          "Nein. Das Unterscheidungszeichen „E“ am Anfang steht für Essen; das kleine „E“ am Ende ist die freiwillige Kennzeichnung für Elektrofahrzeuge nach dem Elektromobilitätsgesetz. Beides ist kombinierbar – ein Essener E-Auto kann also vorn und hinten ein E tragen, und wir beantragen das E-Kennzeichen für Elektrofahrzeuge auf Wunsch mit.",
      },
      {
        question: "Wie reiche ich meine Unterlagen für die Zulassung in Essen ein?",
        answer:
          "Einfach als Foto – per Upload oder WhatsApp. Wir prüfen alles auf Vollständigkeit, Sie bestätigen die digitale Vollmacht, und wir führen den Vorgang bei der Essener Behörde durch. Persönlich erscheinen müssen Sie nirgends.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Essen",
      "Auto anmelden Essen",
      "Wunschkennzeichen Essen",
      "Zulassungsstelle Essen ohne Termin",
      "Auto ummelden Essen",
    ],
  },

  {
    slug: "duisburg",
    name: "Duisburg",
    inName: "in Duisburg",
    description:
      "Kfz-Zulassung in Duisburg ohne Behördengang: Zulassung, Umschreibung und Abmeldung digital bei der Duisburger Behörde – Festpreis 129 €.",
    intro: [
      "Logistikstandort Duisburg: Rund um den größten Binnenhafen Europas sind Transporter, Anhänger und Firmenfahrzeuge das Rückgrat vieler Betriebe – und jedes davon muss zugelassen werden. Wer tagsüber auf Tour oder im Betrieb gebraucht wird, hat für den Gang zur Kfz-Zulassungsstelle der Stadt Duisburg schlicht keine Zeit.",
      "Deshalb wickeln wir den Vorgang digital ab: Unterlagen als Foto einreichen, digitale Vollmacht bestätigen – wir erledigen Zulassung oder Umschreibung bei der zuständigen Duisburger Behörde und senden DU-Kennzeichen und Papiere versichert an Privatadresse oder Firmensitz. Das gilt für den privaten Pkw genauso wie für den Sprinter des Handwerksbetriebs oder den neuen Anhänger.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "DU" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Duisburg" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Lassen Sie auch Transporter und Anhänger in Duisburg zu?",
        answer:
          "Ja – Pkw, Transporter, Anhänger und Krafträder laufen bei uns über denselben digitalen Ablauf. Bei Zulassung auf eine Firma benötigen wir zusätzlich den Handelsregisterauszug oder die Gewerbeanmeldung.",
      },
      {
        question: "Können Sie mehrere Fahrzeuge unseres Betriebs auf einmal zulassen?",
        answer:
          "Ja, als Sammelvorgang mit einer einzigen Vollmacht pro Halter. Für Betriebe mit regelmäßigem Bedarf bieten wir Staffelkonditionen – Details auf unserer Gewerbe-Seite.",
      },
      {
        question: "Was brauche ich für eine Neuzulassung in Duisburg?",
        answer:
          "Zulassungsbescheinigung Teil II (bzw. CoC beim Neuwagen), Ausweis, eVB-Nummer der Versicherung und ein SEPA-Mandat für die Kfz-Steuer. Alles reichen Sie als Foto ein – wir prüfen die Unterlagen, bevor der Vorgang zur Behörde geht.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Duisburg",
      "Auto anmelden Duisburg",
      "Transporter zulassen Duisburg",
      "Zulassungsstelle Duisburg ohne Termin",
      "Zulassungsservice Duisburg",
    ],
  },

  {
    slug: "bochum",
    name: "Bochum",
    inName: "in Bochum",
    description:
      "Kfz-Zulassung in Bochum ohne Behördengang: Neuzulassung, Ummeldung und Abmeldung digital bei der Bochumer Behörde – Festpreis 129 €.",
    intro: [
      "Mit Ruhr-Universität und Hochschule Bochum ziehen jedes Semester tausende junge Leute in die Stadt – viele mit dem ersten eigenen Auto, oft ein günstiger Gebrauchter von den Eltern oder aus dem Kleinanzeigen-Fund. Dann stellen sich gleich mehrere Fragen auf einmal: umschreiben, ummelden, Kennzeichen behalten?",
      "Wir beantworten sie nicht nur, wir erledigen sie: Sie schicken uns Fotos der Unterlagen, wir wickeln den Vorgang digital bei der Kfz-Zulassungsstelle der Stadt Bochum ab – Umschreibung auf den eigenen Namen, Adressänderung nach dem Umzug ins WG-Zimmer oder die erste Neuzulassung. BO-Kennzeichen und Papiere kommen versichert an Ihre Adresse, ohne dass eine Vorlesung ausfallen muss.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "BO" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Bochum" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich übernehme das Auto meiner Eltern – was muss ich in Bochum tun?",
        answer:
          "Das Fahrzeug wird auf Sie als neuen Halter umgeschrieben; dafür brauchen wir beide Zulassungsbescheinigungen, Ihren Ausweis und Ihre eigene eVB-Nummer. Das bisherige Kennzeichen dürfen Sie seit 2019 auch beim Halterwechsel behalten – selbst wenn es nicht aus Bochum stammt.",
      },
      {
        question: "Zum Studium nach Bochum gezogen – muss ich mein Auto überhaupt ummelden?",
        answer:
          "Ja, wenn Bochum Ihr Hauptwohnsitz wird, muss die neue Adresse in die Fahrzeugpapiere. Ihr bisheriges Kennzeichen dürfen Sie dank bundesweiter Kennzeichenmitnahme behalten. Wir erledigen die Ummeldung digital – nur bei einem reinen Nebenwohnsitz bleibt das Fahrzeug am Hauptwohnsitz gemeldet.",
      },
      {
        question: "Was kostet mich das als Studentin oder Student?",
        answer:
          "Denselben fairen Festpreis wie alle: 129 € komplett inklusive amtlicher Gebühren, Kennzeichen und Versand. Dafür entfallen Anfahrt, Wartezeit und der halbe Tag, den der Behördengang sonst kostet.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Bochum",
      "Auto anmelden Bochum",
      "Auto ummelden Bochum Studenten",
      "Zulassungsstelle Bochum ohne Termin",
      "Zulassungsservice Bochum",
    ],
  },

  {
    slug: "wuppertal",
    name: "Wuppertal",
    inName: "in Wuppertal",
    description:
      "Kfz-Zulassung in Wuppertal ohne Behördengang: Wir erledigen Zulassung, Ummeldung und Abmeldung digital bei der Wuppertaler Behörde – Festpreis 129 €.",
    intro: [
      "Wuppertal zieht sich lang durchs Tal der Wupper – wer in Vohwinkel wohnt und in Oberbarmen arbeitet, kennt die Wege durch die Stadt. Viele Wuppertaler pendeln zudem täglich nach Düsseldorf, Köln oder ins Ruhrgebiet. Ein Behördentermin mitten am Werktag passt in diesen Alltag schlicht nicht hinein.",
      "Muss er auch nicht: Ihre Zulassung, Umschreibung oder Abmeldung reichen Sie abends vom Sofa aus ein – Unterlagen fotografieren, digitale Vollmacht bestätigen. Wir führen den Vorgang bei der Kfz-Zulassungsstelle der Stadt Wuppertal durch und senden Ihnen die gestempelten W-Kennzeichen samt Papieren versichert nach Hause, egal in welchen Stadtteil.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "W" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Wuppertal" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich bin tagsüber nie zu Hause – wie bekomme ich meine Kennzeichen?",
        answer:
          "Der Versand erfolgt versichert mit Sendungsverfolgung an eine Adresse Ihrer Wahl – das kann auch Ihre Arbeitsstelle in Düsseldorf oder eine Packstation sein. Den Zulassungsvorgang selbst reichen Sie ohnehin komplett digital ein, zu jeder Uhrzeit.",
      },
      {
        question: "Ich ziehe innerhalb Wuppertals um – muss das Auto neu zugelassen werden?",
        answer:
          "Nein, es genügt eine Adressänderung in der Zulassungsbescheinigung Teil I. Kennzeichen und Papiere bleiben ansonsten unverändert – wir erledigen die Aktualisierung digital bei der Wuppertaler Behörde.",
      },
      {
        question: "Mein neuer Arbeitgeber stellt mir ein Auto – wer meldet das an?",
        answer:
          "Beides ist möglich: Wir lassen das Fahrzeug auf Ihren Arbeitgeber als Halter zu (mit Handelsregisterauszug und Firmenvollmacht) oder auf Sie privat. Klären Sie kurz mit der Firma, wer Halter sein soll – den Rest übernehmen wir.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Wuppertal",
      "Auto anmelden Wuppertal",
      "Zulassungsstelle Wuppertal ohne Termin",
      "Auto ummelden Wuppertal",
      "Zulassungsservice Wuppertal",
    ],
  },

  {
    slug: "bielefeld",
    name: "Bielefeld",
    inName: "in Bielefeld",
    description:
      "Kfz-Zulassung in Bielefeld ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Bielefelder Behörde – Festpreis 129 €.",
    intro: [
      "Bielefeld ist das Zentrum Ostwestfalens – und OWL ist Mittelstandsland: Familienunternehmen, Handwerksbetriebe und Pendler zwischen Gütersloh, Herford und der Stadt sorgen für stetigen Fahrzeugwechsel über Kreisgrenzen hinweg. Wer ein Auto im Nachbarkreis kauft oder von dort zuzieht, hat es mit wechselnden Zuständigkeiten zu tun.",
      "Für Sie bleibt der Ablauf immer gleich: Unterlagen als Foto, digitale Vollmacht – wir wickeln den Vorgang bei der Kfz-Zulassungsstelle der Stadt Bielefeld ab und liefern BI-Kennzeichen und Papiere versichert zu Ihnen. Ob das Fahrzeug vorher ein GT-, HF- oder LIP-Kennzeichen trug, spielt dabei keine Rolle – die Umschreibung auf Ihre Bielefelder Adresse ist Routine.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "BI" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Bielefeld" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto in Gütersloh gekauft – kann ich das GT-Kennzeichen behalten?",
        answer:
          "Ja. Seit 2019 kann das Kennzeichen auch beim Halterwechsel bundesweit übernommen werden – das GT-Schild darf also mit nach Bielefeld. Alternativ wechseln wir bei der Umschreibung auf ein BI-Kennzeichen, gern als Wunschkombination.",
      },
      {
        question: "Unser Familienbetrieb in Bielefeld braucht regelmäßig Zulassungen – geht das über Sie?",
        answer:
          "Ja. Einzelne Firmenfahrzeuge lassen wir mit Handelsregisterauszug oder Gewerbeanmeldung auf den Betrieb zu; bei regelmäßigem Bedarf bieten wir Sammelabwicklung mit Staffelkonditionen. So bleibt Ihr Fuhrpark ohne Behördengänge aktuell.",
      },
      {
        question: "Wie funktioniert die digitale Vollmacht für die Zulassung in Bielefeld?",
        answer:
          "Sie erhalten von uns einen Link, prüfen die Angaben und bestätigen die Vollmacht digital – damit dürfen wir den Vorgang bei der Behörde für Sie durchführen. Das Verfahren ist der übliche Weg professioneller Zulassungsdienste und für Sie in unter einer Minute erledigt.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Bielefeld",
      "Auto anmelden Bielefeld",
      "Zulassungsstelle Bielefeld ohne Termin",
      "Auto umschreiben Bielefeld",
      "Zulassungsservice OWL",
    ],
  },

  {
    slug: "bonn",
    name: "Bonn",
    inName: "in Bonn",
    description:
      "Kfz-Zulassung in Bonn ohne Behördengang: Wir übernehmen Zulassung, Ummeldung und Abmeldung digital bei der Bonner Behörde – Festpreis 129 €.",
    intro: [
      "Bonn ist Zuzugsstadt: Bundesbehörden, UN-Standort, DAX-Konzerne und die Universität holen ständig neue Menschen an den Rhein – oft für einige Jahre, oft mit Auto. Wer gerade Wohnung, Anmeldung und neuen Job jongliert, hat für die Kfz-Zulassungsstelle der Stadt Bonn wenig übrig.",
      "Die Ummeldung nach dem Zuzug erledigen wir deshalb komplett digital: Fahrzeugpapiere und Ausweis fotografieren, Vollmacht bestätigen – wir aktualisieren die Adresse bei der zuständigen Bonner Behörde und klären auf Wunsch gleich den Wechsel auf ein BN-Kennzeichen. Auch wer die Stadt wieder verlässt oder sein Fahrzeug vor einem Auslandsaufenthalt stilllegen will, ist bei uns richtig: Die Abmeldung ist meist taggleich erledigt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "BN" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Bonn" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe beruflich für drei Jahre nach Bonn – lohnt sich der Kennzeichenwechsel?",
        answer:
          "Das ist Geschmackssache: Pflicht ist nur die Adressänderung in den Papieren, Ihr bisheriges Kennzeichen dürfen Sie bundesweit behalten. Wer sich für BN entscheidet, bekommt von uns Prägung und Zuteilung gleich mitgeliefert – der Aufwand für Sie bleibt derselbe.",
      },
      {
        question: "Ich wohne im Rhein-Sieg-Kreis, arbeite aber in Bonn – welche Behörde ist zuständig?",
        answer:
          "Maßgeblich ist Ihr Wohnsitz, nicht der Arbeitsort: Für Sankt Augustin, Troisdorf oder Königswinter ist die Zulassungsbehörde des Rhein-Sieg-Kreises zuständig. Auch dort wickeln wir Ihren Vorgang digital ab – der Ablauf über uns ist identisch.",
      },
      {
        question: "Ich gehe für ein Jahr ins Ausland – was mache ich mit meinem Auto in Bonn?",
        answer:
          "Die einfachste Lösung ist die Außerbetriebsetzung: Wir melden das Fahrzeug meist taggleich ab, Steuer und Versicherungsbeitrag entfallen ab dann. Bis zu sieben Jahre kann es abgemeldet bleiben und danach wieder zugelassen werden – auch das übernehmen wir bei Ihrer Rückkehr.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Bonn",
      "Auto anmelden Bonn",
      "Auto ummelden Bonn Zuzug",
      "Zulassungsstelle Bonn ohne Termin",
      "Auto abmelden Bonn",
    ],
  },

  {
    slug: "muenster",
    name: "Münster",
    inName: "in Münster",
    description:
      "Kfz-Zulassung in Münster ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Münsteraner Behörde – Festpreis 129 €.",
    intro: [
      "Münster gilt als Fahrradhauptstadt – und trotzdem geht es im Alltag vieler Münsteraner nicht ohne Auto: für den Weg ins Münsterland, den Wochenendbesuch bei der Familie oder den Job außerhalb der Promenade. Nur ist ein Behördentermin bei der Kfz-Zulassungsstelle der Stadt Münster schwerer zu bekommen als ein Parkplatz am Prinzipalmarkt.",
      "Mit uns bleibt das Rad Ihr Verkehrsmittel und die Zulassung trotzdem erledigt: Unterlagen abfotografieren, digitale Vollmacht bestätigen – wir führen den Vorgang bei der zuständigen Behörde in Münster durch. Gerade der Klassiker der Region, der Gebrauchtwagenkauf auf einem Hof im Kreis Steinfurt oder Warendorf, ist bei uns Routine: Wir schreiben das Fahrzeug direkt auf Ihre Münsteraner Adresse um und liefern die MS-Kennzeichen versichert zu Ihnen.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "MS" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Münster" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto im Münsterland gekauft – ST- oder WAF-Kennzeichen behalten oder wechseln?",
        answer:
          "Beides geht: Seit 2019 dürfen Sie das Kennzeichen des Vorbesitzers bundesweit übernehmen, auch über Kreisgrenzen hinweg. Wenn Sie lieber ein MS-Kennzeichen möchten, erledigen wir den Wechsel im selben Vorgang – inklusive Prägung und Versand.",
      },
      {
        question: "Ich fahre nur im Sommer Auto oder Wohnmobil – gibt es dafür eine Lösung?",
        answer:
          "Ja, das Saisonkennzeichen: Sie wählen einen festen Zeitraum von 2 bis 11 Monaten, außerhalb dessen das Fahrzeug ohne An- und Abmelderei ruht – und Sie sparen anteilig Steuer und Versicherung. Wir richten den Saisonzeitraum bei der Zulassung direkt mit ein.",
      },
      {
        question: "Wie lange dauert die Zulassung in Münster über DeutscheZulassung?",
        answer:
          "In der Regel 1–3 Werktage ab vollständigen Unterlagen, zuzüglich Versand der Kennzeichen. Eine Terminbuchung bei der Behörde entfällt für Sie vollständig – wir übernehmen den Vorgang mit Ihrer digitalen Vollmacht.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Münster",
      "Auto anmelden Münster",
      "Zulassungsstelle Münster ohne Termin",
      "Auto umschreiben Münsterland",
      "Zulassungsservice Münster",
    ],
  },

  {
    slug: "moenchengladbach",
    name: "Mönchengladbach",
    inName: "in Mönchengladbach",
    description:
      "Kfz-Zulassung in Mönchengladbach ohne Behördengang: Zulassung, Ummeldung und Abmeldung digital bei der Behörde – Festpreis 129 €.",
    intro: [
      "Am Niederrhein ist die Grenze nah: Von Mönchengladbach sind es nur wenige Kilometer in die Niederlande, und so landet mancher Fahrzeugkauf jenseits der Grenze – ob EU-Neuwagen mit attraktivem Rabatt oder Gebrauchter aus Roermond. Solche Fahrzeuge brauchen für die deutsche Zulassung ein paar Unterlagen mehr, etwa die EU-Übereinstimmungsbescheinigung (CoC).",
      "Wir kennen diese Vorgänge und wickeln sie genauso digital ab wie jede normale Zulassung: Sie senden uns Fotos aller Papiere, wir prüfen auf Vollständigkeit und führen den Vorgang bei der Kfz-Zulassungsstelle der Stadt Mönchengladbach durch. Am Ende erhalten Sie MG-Kennzeichen und deutsche Fahrzeugpapiere versichert nach Hause – für den Import genauso wie für den Gebrauchten aus Rheydt oder den Neuwagen vom Gladbacher Händler.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "MG" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Mönchengladbach" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Können Sie ein in den Niederlanden gekauftes Auto in Mönchengladbach zulassen?",
        answer:
          "Ja, sofern die Unterlagen vollständig sind – insbesondere die EU-Übereinstimmungsbescheinigung (CoC) oder eine deutsche Einzelgenehmigung sowie die ausländischen Fahrzeugpapiere. Wir prüfen Ihre Dokumente vorab kostenlos und sagen Ihnen ehrlich, ob noch etwas fehlt.",
      },
      {
        question: "Gilt der Service auch für Rheydt und die anderen Stadtteile?",
        answer:
          "Ja – Rheydt, Odenkirchen, Wickrath und alle übrigen Stadtteile gehören zur Stadt Mönchengladbach, zuständig ist dieselbe Zulassungsbehörde. Da der Vorgang digital läuft und die Kennzeichen per Versand kommen, spielt Ihr Stadtteil ohnehin keine Rolle.",
      },
      {
        question: "Was kostet die Zulassung in Mönchengladbach?",
        answer:
          "129 € als Komplettpreis inklusive amtlicher Gebühren, MG-Kennzeichen und versichertem Versand. Die Abmeldung kostet 34,90 € und ist meist noch am selben Werktag erledigt.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Mönchengladbach",
      "Auto anmelden Mönchengladbach",
      "EU-Import zulassen Mönchengladbach",
      "Zulassungsstelle Mönchengladbach ohne Termin",
      "Auto ummelden Mönchengladbach",
    ],
  },

  {
    slug: "gelsenkirchen",
    name: "Gelsenkirchen",
    inName: "in Gelsenkirchen",
    description:
      "Kfz-Zulassung in Gelsenkirchen ohne Behördengang: Zulassung, Umschreibung und Abmeldung digital bei der Behörde – Festpreis 129 €.",
    intro: [
      "Im Ruhrgebiet verschwimmen die Stadtgrenzen: Wer in Gelsenkirchen wohnt, kauft sein Auto vielleicht in Essen, arbeitet in Herne und zieht irgendwann nach Buer oder Horst um. Früher bedeutete jeder dieser Schritte neue Schilder – heute nicht mehr, denn Kennzeichen dürfen bei Umzug (seit 2015) und sogar beim Halterwechsel (seit 2019) bundesweit mitgenommen werden.",
      "Was bleibt, ist der Papierkram bei der Kfz-Zulassungsstelle der Stadt Gelsenkirchen – und den übernehmen wir: Umschreibung nach dem Kauf in der Nachbarstadt, Adressänderung nach dem Umzug oder klassische Neuzulassung mit GE-Kennzeichen. Sie reichen alles digital als Foto ein, wir wickeln den Vorgang bei der zuständigen Behörde ab und senden Kennzeichen und Papiere versichert zu Ihnen.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "GE" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsstelle der Stadt Gelsenkirchen" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe von Essen nach Gelsenkirchen – brauche ich neue Kennzeichen?",
        answer:
          "Nein. Ihr E-Kennzeichen dürfen Sie dank bundesweiter Kennzeichenmitnahme behalten – geändert wird nur die Adresse in der Zulassungsbescheinigung. Wenn Sie lieber auf GE wechseln möchten, erledigen wir das im selben Vorgang mit.",
      },
      {
        question: "Das Auto läuft noch auf meinen Partner – können wir es auf mich umschreiben?",
        answer:
          "Ja, das ist eine normale Halterumschreibung: Wir benötigen beide Zulassungsbescheinigungen, Ihren Ausweis und eine eVB-Nummer Ihrer Versicherung. Der Vorgang läuft digital bei der Gelsenkirchener Behörde, das Kennzeichen kann dabei bleiben.",
      },
      {
        question: "Mein altes Auto ist ein wirtschaftlicher Totalschaden – wie werde ich es los?",
        answer:
          "Erst abmelden, dann verwerten oder verkaufen: Die Außerbetriebsetzung erledigen wir für 34,90 € meist noch am selben Werktag, damit Steuer und Versicherung sofort stoppen. Bei Verschrottung reichen wir den Verwertungsnachweis des zertifizierten Betriebs mit ein.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Gelsenkirchen",
      "Auto anmelden Gelsenkirchen",
      "Auto umschreiben Gelsenkirchen",
      "Zulassungsstelle Gelsenkirchen ohne Termin",
      "Auto abmelden Gelsenkirchen",
    ],
  },
  {
    slug: "bremen",
    name: "Bremen",
    inName: "in Bremen",
    description:
      "Kfz-Zulassung in Bremen ohne Behördengang: Zulassung, Ummeldung und Abmeldung digital bei der Bremer Behörde erledigt – zum Festpreis von 129 €.",
    intro: [
      "Bremen ist der kleinste Stadtstaat Deutschlands – mit einer Besonderheit: Das Kürzel HB steht für die Hansestadt und gilt für Bremen wie für Bremerhaven. Wer hier ein Fahrzeug anmelden will, muss sich in die Terminvergabe der städtischen Zulassungsbehörde einreihen – für viele zwischen Job, Familie und Alltag schlicht ein Tag zu viel.",
      "Diesen Tag geben wir Ihnen zurück: Sie fotografieren Ihre Unterlagen, bestätigen die digitale Vollmacht, und wir wickeln den Vorgang bei der zuständigen Bremer Behörde ab. Ihre gestempelten HB-Kennzeichen und Papiere kommen versichert zu Ihnen – ob in die Neustadt, nach Schwachhausen oder in die Überseestadt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "HB" },
      { label: "Zuständige Behörde", value: "Bürgeramt / Zulassungsbehörde der Stadt Bremen" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Warum steht HB auf Bremer Kennzeichen – und gilt das auch für Bremerhaven?",
        answer:
          "HB steht für Hansestadt Bremen und wird im gesamten Land Bremen ausgegeben – also auch in Bremerhaven, dort ist allerdings die dortige Behörde zuständig. Wir wickeln Ihren Vorgang digital bei der jeweils zuständigen Stelle ab.",
      },
      {
        question: "Ich ziehe aus Niedersachsen nach Bremen – muss ich neue Schilder kaufen?",
        answer:
          "Nein. Dank der bundesweiten Kennzeichenmitnahme dürfen Sie Ihr bisheriges Kennzeichen behalten, nur die Adresse in den Fahrzeugpapieren wird geändert. Wer lieber auf HB wechselt, bekommt die neuen Schilder von uns gleich mitgeliefert.",
      },
      {
        question: "Übernehmen Sie auch Fahrzeuge von Bremer Firmen und Selbstständigen?",
        answer:
          "Ja – vom einzelnen Handwerker-Transporter bis zur Flotte eines Logistikbetriebs rund um die Häfen. Die Zulassung auf die Firma erledigen wir mit Handelsregisterauszug bzw. Gewerbeanmeldung, komplett digital.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Bremen",
      "Auto anmelden Bremen",
      "Zulassungsstelle Bremen ohne Termin",
      "Auto ummelden Bremen",
      "Zulassungsservice Bremen",
    ],
  },

  {
    slug: "dresden",
    name: "Dresden",
    inName: "in Dresden",
    description:
      "Kfz-Zulassung in Dresden ohne Behördengang: Wir übernehmen Neuzulassung, Ummeldung und Abmeldung bei der Dresdner Behörde – digital, Festpreis 129 €.",
    intro: [
      "Dresden zieht an: Die Chipindustrie im Norden der Stadt holt Fachkräfte aus ganz Deutschland ins Elbtal, dazu kommen Studierende und Familien, die ins Umland und zurück pendeln. Jeder Zuzug, jeder Fahrzeugkauf landet am Ende bei der Kfz-Zulassungsbehörde der Landeshauptstadt – und deren Terminkalender ist gut gefüllt.",
      "Statt sich dort einzureihen, reichen Sie Ihre Unterlagen bei uns als Foto ein und bestätigen die digitale Vollmacht. Wir führen Zulassung, Umschreibung oder Abmeldung bei der Dresdner Behörde durch und senden Ihnen DD-Kennzeichen und Papiere versichert nach Hause – gerade für frisch Zugezogene der einfachste Weg, das Thema Auto abzuhaken.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "DD" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Dresden" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe beruflich nach Dresden – wie schnell ist mein Auto umgemeldet?",
        answer:
          "In der Regel innerhalb von 1–3 Werktagen ab vollständigen Unterlagen, zuzüglich Versand. Sie müssen dafür weder einen Termin buchen noch persönlich erscheinen – der Vorgang läuft digital bei der Dresdner Behörde.",
      },
      {
        question: "Kann ich mein altes Kennzeichen in Dresden weiterfahren?",
        answer:
          "Ja. Die Kennzeichenmitnahme gilt seit 2015 bundesweit bei Umzügen – Ihr bisheriges Kennzeichen bleibt auf Wunsch bestehen, nur die Adresse in den Papieren wird aktualisiert. Alternativ wechseln Sie auf ein DD-Kennzeichen.",
      },
      {
        question: "Bekomme ich ein DD-Wunschkennzeichen über Sie?",
        answer:
          "Ja – wir prüfen die Verfügbarkeit Ihrer Wunschkombination, reservieren sie und liefern die geprägten Schilder mit. Der Aufpreis beträgt 34,90 € inklusive der amtlichen Gebühren.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Dresden",
      "Auto anmelden Dresden",
      "Zulassungsstelle Dresden ohne Termin",
      "Auto ummelden Dresden",
      "Zulassungsservice Dresden",
    ],
  },

  {
    slug: "chemnitz",
    name: "Chemnitz",
    inName: "in Chemnitz",
    description:
      "Kfz-Zulassung in Chemnitz ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Chemnitzer Behörde – zum Festpreis von 129 €.",
    intro: [
      "Chemnitz fährt mit einem der kürzesten Kennzeichen Deutschlands: ein einzelnes C. Gehandelt wird in der Region viel – der Gebrauchtwagenmarkt zwischen Stadt, Erzgebirge und Zwickauer Raum ist lebendig, und jede Umschreibung bedeutet normalerweise einen Gang zur Kfz-Zulassungsbehörde der Stadt Chemnitz samt Terminbuchung.",
      "Bei uns wird daraus ein Vorgang vom Sofa aus: Fahrzeugpapiere und Ausweis abfotografieren, digitale Vollmacht bestätigen – wir erledigen die Zulassung bei der Chemnitzer Behörde und schicken Ihnen die gestempelten C-Kennzeichen versichert zu. Auch die Abmeldung eines Altfahrzeugs vor dem Verkauf nehmen wir Ihnen meist noch am selben Werktag ab.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "C" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Chemnitz" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe einen Gebrauchten im Erzgebirge gekauft – schreiben Sie ihn auf meine Chemnitzer Adresse um?",
        answer:
          "Ja, das ist ein klassischer Fall: Wir schreiben das Fahrzeug bei der Chemnitzer Behörde auf Sie um, egal wo es zuvor zugelassen war. Das bisherige ERZ- oder Z-Kennzeichen dürfen Sie seit 2019 sogar beim Halterwechsel behalten – oder Sie wechseln auf C.",
      },
      {
        question: "Ist ein Wunschkennzeichen mit dem kurzen C-Kürzel möglich?",
        answer:
          "Ja – das einstellige Kürzel lässt besonders kurze Kombinationen zu, die entsprechend begehrt sind. Wir prüfen die Verfügbarkeit, reservieren Ihre Kombination und liefern die geprägten Schilder für 34,90 € Aufpreis mit.",
      },
      {
        question: "Was kostet die Kfz-Zulassung in Chemnitz über Sie?",
        answer:
          "129 € als Komplettpreis – amtliche Gebühren, Kennzeichen und versicherter Versand sind enthalten. Eine Abmeldung kostet 34,90 € und ist meist taggleich erledigt.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Chemnitz",
      "Auto anmelden Chemnitz",
      "Zulassungsstelle Chemnitz ohne Termin",
      "Auto umschreiben Chemnitz",
      "Zulassungsservice Chemnitz",
    ],
  },

  {
    slug: "kiel",
    name: "Kiel",
    inName: "in Kiel",
    description:
      "Kfz-Zulassung in Kiel ohne Behördengang: Auto, Motorrad oder Anhänger digital bei der Kieler Behörde zulassen – zum Festpreis von 129 €.",
    intro: [
      "In der Fördestadt Kiel hat die Zulassung ihre eigenen Themen: Cabrios und Motorräder, die nur den Ostsee-Sommer sehen, Bootsanhänger für die Segelsaison, dazu jedes Semester neue Studierende, die ihr Auto mit in den Norden bringen. All das läuft über die Kfz-Zulassungsbehörde der Landeshauptstadt Kiel – mit Terminvergabe und Wartezeit.",
      "Wir kürzen den Weg ab: Unterlagen als Foto einreichen, digitale Vollmacht bestätigen, und wir wickeln den Vorgang bei der Kieler Behörde ab. Auf Wunsch richten wir dabei gleich ein Saisonkennzeichen für Ihren Sommerflitzer ein – die KI-Schilder und Papiere kommen versichert zu Ihnen an die Förde.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "KI" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Kiel" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Kann ich mein Cabrio oder Motorrad in Kiel mit Saisonkennzeichen zulassen?",
        answer:
          "Ja. Ein Saisonkennzeichen gilt für einen festen Zeitraum von 2 bis 11 Monaten – etwa April bis Oktober für die Ostsee-Saison. Wir richten den Zeitraum direkt bei der Zulassung mit ein; außerhalb der Saison sparen Sie Steuer und Versicherung.",
      },
      {
        question: "Melden Sie auch Bootsanhänger in Kiel an?",
        answer:
          "Ja, Anhänger sind zulassungspflichtig wie Pkw und laufen bei uns über denselben digitalen Ablauf. Sie brauchen die Zulassungsbescheinigungen des Anhängers und eine eVB-Nummer – die Schilder kommen per Versand.",
      },
      {
        question: "Ich studiere in Kiel – kann ich mein Auto hier anmelden?",
        answer:
          "Entscheidend ist der Wohnsitz des Halters: Ist Kiel Ihr Hauptwohnsitz, wird das Fahrzeug hier zugelassen. Ihr bisheriges Kennzeichen dürfen Sie beim Umzug behalten oder gegen ein KI-Kennzeichen tauschen – beides erledigen wir digital.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Kiel",
      "Auto anmelden Kiel",
      "Zulassungsstelle Kiel ohne Termin",
      "Saisonkennzeichen Kiel",
      "Auto ummelden Kiel",
    ],
  },

  {
    slug: "halle",
    name: "Halle (Saale)",
    inName: "in Halle (Saale)",
    description:
      "Kfz-Zulassung in Halle (Saale) ohne Behördengang: Wir erledigen Zulassung, Ummeldung und Abmeldung digital bei der Behörde – Festpreis 129 €.",
    intro: [
      "Halle an der Saale lebt vom kurzen Draht nach Leipzig: Viele wohnen in der günstigeren Saalestadt und arbeiten oder studieren auf der anderen Seite der Landesgrenze – das Auto ist dabei fester Teil des Alltags. Für Zulassung und Ummeldung ist die Kfz-Zulassungsbehörde der Stadt Halle (Saale) zuständig, und deren Termine wollen erst einmal ergattert sein.",
      "Mit uns bleibt der Gang zur Behörde aus: Sie fotografieren Ihre Unterlagen, bestätigen die digitale Vollmacht, und wir führen den Vorgang bei der halleschen Behörde durch. HAL-Kennzeichen und Papiere erreichen Sie per versichertem Versand – ob Sie am Reileck wohnen, in Halle-Neustadt oder auf dem Weinberg-Campus arbeiten.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "HAL" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Halle (Saale)" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe von Leipzig nach Halle – muss mein L-Kennzeichen weg?",
        answer:
          "Nein. Auch beim Umzug über die Landesgrenze von Sachsen nach Sachsen-Anhalt dürfen Sie Ihr Kennzeichen behalten – die Mitnahme gilt bundesweit. Wir aktualisieren nur die Adresse in den Papieren oder besorgen Ihnen auf Wunsch ein HAL-Kennzeichen.",
      },
      {
        question: "Ich übernehme das Auto meiner Eltern – wie läuft die Umschreibung in Halle?",
        answer:
          "Das Fahrzeug wird bei der halleschen Behörde auf Sie als neuen Halter umgeschrieben; Sie brauchen dafür beide Zulassungsbescheinigungen, Ihren Ausweis und eine eVB-Nummer. Seit 2019 darf sogar das bisherige Kennzeichen beim Halterwechsel bestehen bleiben.",
      },
      {
        question: "Wie lange dauert die Zulassung in Halle über DeutscheZulassung?",
        answer:
          "In der Regel 1–3 Werktage ab vollständigen Unterlagen, dazu kommt der Versand der Kennzeichen. Abmeldungen schaffen wir meist noch am selben Werktag – die Bestätigung erhalten Sie per E-Mail.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Halle Saale",
      "Auto anmelden Halle",
      "Zulassungsstelle Halle ohne Termin",
      "Auto ummelden Halle Saale",
      "Zulassungsservice Halle",
    ],
  },

  {
    slug: "magdeburg",
    name: "Magdeburg",
    inName: "in Magdeburg",
    description:
      "Kfz-Zulassung in Magdeburg ohne Behördengang: Neuzulassung, Ummeldung und Abmeldung bei der Magdeburger Behörde – digital, Festpreis 129 €.",
    intro: [
      "Magdeburg liegt am Schnittpunkt von A2 und A14 – die Elbestadt ist Landeshauptstadt und Logistikstandort zugleich. Handwerksbetriebe, Speditionen und Pendler halten die Kfz-Zulassungsbehörde der Landeshauptstadt Magdeburg gut beschäftigt; wer dort kurzfristig einen Termin sucht, braucht Geduld.",
      "Geduld brauchen Sie bei uns nicht: Wir übernehmen Neuzulassung, Umschreibung oder Abmeldung digital bei der Magdeburger Behörde – vom privaten Gebrauchtwagen bis zum Firmentransporter. Sie reichen die Unterlagen per Foto ein, wir kümmern uns um den Rest und senden MD-Kennzeichen samt Papieren versichert an Ihre Adresse.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "MD" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Magdeburg" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Lassen Sie auch Transporter und Firmenfahrzeuge in Magdeburg zu?",
        answer:
          "Ja – Transporter, Anhänger und ganze Firmenflotten wickeln wir routiniert ab, inklusive Zulassung auf die Gesellschaft mit Handelsregisterauszug oder Gewerbeanmeldung. Bei mehreren Fahrzeugen bündeln wir die Vorgänge als Sammelabwicklung.",
      },
      {
        question: "Mein Auto ist noch im Bördekreis zugelassen – können Sie es nach Magdeburg umschreiben?",
        answer:
          "Ja. Nach dem Umzug in die Stadt schreiben wir das Fahrzeug bei der Magdeburger Behörde auf Ihre neue Adresse um. Ihr BK-Kennzeichen dürfen Sie dabei behalten – oder Sie steigen auf MD um, die neuen Schilder liefern wir mit.",
      },
      {
        question: "Wie schnell geht eine Abmeldung in Magdeburg?",
        answer:
          "Meist noch am selben Werktag: Sie legen die Sicherheitscodes auf Zulassungsbescheinigung und Kennzeichen frei, fotografieren sie und senden uns die Bilder. Die Abmeldebestätigung kommt anschließend per E-Mail – für 34,90 €.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Magdeburg",
      "Auto anmelden Magdeburg",
      "Zulassungsstelle Magdeburg ohne Termin",
      "Auto ummelden Magdeburg",
      "Zulassungsservice Magdeburg",
    ],
  },

  {
    slug: "luebeck",
    name: "Lübeck",
    inName: "in Lübeck",
    description:
      "Kfz-Zulassung in Lübeck ohne Behördengang: Pkw, Wohnmobil oder Motorrad digital bei der Lübecker Behörde zulassen – zum Festpreis von 129 €.",
    intro: [
      "Das HL auf Lübecker Schildern steht für Hansestadt Lübeck – und zwischen Altstadtinsel und Travemünde wird viel zugelassen, was nach Urlaub aussieht: Wohnmobile, Camper und Motorräder für die Ostseeküste. Dazu kommen die vielen Lübecker, die täglich nach Hamburg pendeln und für einen Behördentermin kaum Spielraum im Kalender haben.",
      "Genau dafür gibt es uns: Sie reichen Ihre Unterlagen als Foto ein und bestätigen die digitale Vollmacht – wir wickeln Zulassung, Ummeldung oder Abmeldung bei der Kfz-Zulassungsbehörde der Hansestadt Lübeck ab. Die fertigen HL-Kennzeichen kommen versichert zu Ihnen, auf Wunsch mit Saisonzeitraum für Ihr Freizeitfahrzeug.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "HL" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Hansestadt Lübeck" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Wofür steht das HL auf dem Lübecker Kennzeichen?",
        answer:
          "Für Hansestadt Lübeck – das Kürzel erhalten alle Fahrzeuge, die im Lübecker Stadtgebiet zugelassen werden. Wir liefern die geprägten HL-Schilder direkt mit.",
      },
      {
        question: "Lohnt sich ein Saisonkennzeichen für mein Wohnmobil in Lübeck?",
        answer:
          "Häufig ja: Ein Saisonkennzeichen von 2 bis 11 Monaten – etwa März bis Oktober – spart Steuer und Versicherung in den Wintermonaten, ohne dass Sie jedes Jahr an- und abmelden müssen. Wir richten den Zeitraum bei der Zulassung direkt mit ein.",
      },
      {
        question: "Ich arbeite in Hamburg, wohne aber in Lübeck – wo wird mein Auto zugelassen?",
        answer:
          "Am Wohnsitz des Halters, also in Lübeck – der Arbeitsort spielt für die Zulassung keine Rolle. Den Vorgang erledigen wir digital bei der Lübecker Behörde, ohne dass Sie sich dafür freinehmen müssen.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Lübeck",
      "Auto anmelden Lübeck",
      "Zulassungsstelle Lübeck ohne Termin",
      "Wohnmobil anmelden Lübeck",
      "Auto ummelden Lübeck",
    ],
  },

  {
    slug: "rostock",
    name: "Rostock",
    inName: "in Rostock",
    description:
      "Kfz-Zulassung in Rostock ohne Behördengang: Wir übernehmen Zulassung, Ummeldung und Abmeldung bei der Rostocker Behörde – digital, Festpreis 129 €.",
    intro: [
      "Rostock ist die größte Stadt Mecklenburg-Vorpommerns – Universitäts- und Hafenstadt in einem, mit Warnemünde direkt vor der Tür. Kein Wunder, dass hier neben Alltagsautos besonders viele Cabrios, Motorräder und Camper für die Ostseesaison angemeldet werden. Zuständig ist die Kfz-Zulassungsbehörde der Hansestadt Rostock, deren Termine gerade im Frühjahr knapp werden.",
      "Den Frühjahrs-Andrang überlassen Sie einfach uns: Unterlagen abfotografieren, digitale Vollmacht bestätigen – wir führen den Vorgang bei der Rostocker Behörde durch, auf Wunsch mit Saisonkennzeichen für die warmen Monate. Ihre HRO-Schilder und Papiere kommen versichert zu Ihnen, ob in die KTV, nach Reutershagen oder direkt an die Küste.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "HRO" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Hansestadt Rostock" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Wann sollte ich mein Saisonfahrzeug für den Ostsee-Sommer anmelden?",
        answer:
          "Am besten einige Wochen vor Saisonstart – im Frühjahr sind die Behörden erfahrungsgemäß stark ausgelastet. Über uns dauert die Zulassung mit Saisonkennzeichen (wählbar von 2 bis 11 Monaten) in der Regel 1–3 Werktage, ganz ohne Termin.",
      },
      {
        question: "Was ist der Unterschied zwischen HRO und LRO?",
        answer:
          "HRO steht für die Hansestadt Rostock, LRO für den umliegenden Landkreis Rostock – zuständig sind zwei verschiedene Behörden. Wir wickeln Ihren Vorgang digital bei der Stelle ab, die für Ihren Wohnsitz zuständig ist; der Ablauf ist für Sie identisch.",
      },
      {
        question: "Ich verkaufe mein Auto in Rostock – sollte ich es vorher abmelden?",
        answer:
          "Empfehlenswert ist das, denn abgemeldet können auf Sie keine Steuern oder Verstöße des Käufers mehr zulaufen. Wir melden das Fahrzeug meist noch am selben Werktag außer Betrieb – Sie brauchen nur Fotos der freigelegten Sicherheitscodes, der Preis liegt bei 34,90 €.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Rostock",
      "Auto anmelden Rostock",
      "Zulassungsstelle Rostock ohne Termin",
      "Saisonkennzeichen Rostock",
      "Auto abmelden Rostock",
    ],
  },

  {
    slug: "erfurt",
    name: "Erfurt",
    inName: "in Erfurt",
    description:
      "Kfz-Zulassung in Erfurt ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung bei der Erfurter Behörde – digital zum Festpreis von 129 €.",
    intro: [
      "Erfurt liegt in der Mitte Deutschlands – als Thüringer Landeshauptstadt, ICE-Knoten und Standort eines der großen Güterverkehrszentren des Landes. Diese zentrale Lage bringt Bewegung: Zuzügler, Gewerbetreibende und Pendler aus dem gesamten Thüringer Becken sorgen für vollen Betrieb bei der Kfz-Zulassungsbehörde der Landeshauptstadt Erfurt.",
      "Ihren Vorgang nehmen wir da einfach heraus: Sie senden uns Fotos Ihrer Unterlagen und bestätigen die digitale Vollmacht, wir erledigen Zulassung, Umschreibung oder Abmeldung bei der Erfurter Behörde. EF-Kennzeichen und Papiere kommen versichert an Ihre Adresse – während Sie Ihren Tag ganz normal weiterplanen.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "EF" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Erfurt" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich bin neu in Erfurt – welche Fristen gelten für die Ummeldung meines Autos?",
        answer:
          "Nach dem Umzug muss die neue Adresse unverzüglich in die Fahrzeugpapiere eingetragen werden – konkrete Kulanzfristen nennt das Gesetz nicht, warten sollte man also nicht lange. Wir erledigen die Ummeldung digital bei der Erfurter Behörde; Ihr bisheriges Kennzeichen dürfen Sie dabei behalten.",
      },
      {
        question: "Können Sie Fahrzeuge für Erfurter Logistik- und Handwerksbetriebe zulassen?",
        answer:
          "Ja – vom einzelnen Sprinter bis zur Flotte am Güterverkehrszentrum. Die Zulassung auf die Firma läuft mit Handelsregisterauszug oder Gewerbeanmeldung, mehrere Fahrzeuge bündeln wir zu einer Sammelabwicklung mit festen Ansprechpartnern.",
      },
      {
        question: "Gibt es Wunschkennzeichen mit EF?",
        answer:
          "Ja. Nennen Sie uns Ihre Wunschkombination – wir prüfen die Verfügbarkeit, reservieren sie bei der Behörde und liefern die geprägten Schilder mit. Der Aufpreis beträgt 34,90 € inklusive amtlicher Gebühren.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Erfurt",
      "Auto anmelden Erfurt",
      "Zulassungsstelle Erfurt ohne Termin",
      "Auto ummelden Erfurt",
      "Zulassungsservice Thüringen",
    ],
  },

  {
    slug: "braunschweig",
    name: "Braunschweig",
    inName: "in Braunschweig",
    description:
      "Kfz-Zulassung in Braunschweig ohne Behördengang: Zulassung, Umschreibung und Abmeldung digital bei der Behörde erledigt – zum Festpreis von 129 €.",
    intro: [
      "Braunschweig lebt Auto: Die Löwenstadt ist Zentrum einer der wichtigsten Mobilitätsforschungsregionen Europas, und tausende Braunschweiger pendeln täglich zu den Werken nach Wolfsburg. Entsprechend häufig wechseln hier Jahres- und Werkswagen den Halter – und jede dieser Umschreibungen führt normalerweise zur Kfz-Zulassungsbehörde der Stadt Braunschweig.",
      "Wir nehmen Ihnen diesen Weg ab: Kaufvertrag unterschrieben, Unterlagen fotografiert, digitale Vollmacht bestätigt – den Behördenvorgang erledigen wir und senden Ihnen die gestempelten BS-Kennzeichen samt Papieren versichert nach Hause. So ist der neue Wagen startklar, bevor der nächste Arbeitstag beginnt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "BS" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Braunschweig" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe einen Jahreswagen aus Wolfsburg gekauft – wie läuft die Umschreibung nach Braunschweig?",
        answer:
          "Wir schreiben das Fahrzeug bei der Braunschweiger Behörde auf Ihre Adresse um – Sie brauchen beide Zulassungsbescheinigungen, Ihren Ausweis und eine eVB-Nummer. Das WOB-Kennzeichen dürfen Sie seit 2019 sogar beim Halterwechsel behalten oder auf BS wechseln.",
      },
      {
        question: "Muss ich für die Zulassung irgendwann persönlich erscheinen?",
        answer:
          "Nein. Der gesamte Vorgang läuft digital: Unterlagen als Foto, Vollmacht per Klick – wir führen die Zulassung bei der zuständigen Behörde durch und Sie erhalten Kennzeichen und Papiere per versichertem Versand mit Sendungsverfolgung.",
      },
      {
        question: "Was kostet die Kfz-Zulassung in Braunschweig über DeutscheZulassung?",
        answer:
          "129 € als Komplettpreis für Neuzulassung, Umschreibung oder Ummeldung – amtliche Gebühren, BS-Kennzeichen und Versand inklusive. Die Abmeldung eines Fahrzeugs kostet 34,90 € und ist meist taggleich erledigt.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Braunschweig",
      "Auto anmelden Braunschweig",
      "Zulassungsstelle Braunschweig ohne Termin",
      "Auto umschreiben Braunschweig",
      "Zulassungsservice Braunschweig",
    ],
  },
  {
    slug: "mannheim",
    name: "Mannheim",
    inName: "in Mannheim",
    description:
      "Kfz-Zulassung in Mannheim ohne Behördengang: Neuzulassung, Ummeldung und Abmeldung digital bei der Mannheimer Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Mannheim ist Pendlerdrehscheibe der Rhein-Neckar-Region: Wer morgens über die Rheinbrücke nach Ludwigshafen fährt oder abends aus Heidelberg zurückkommt, hat selten Zeit für einen Vormittag bei der Kfz-Zulassungsbehörde der Stadt Mannheim – zumal in der Stadt, in der Carl Benz einst das Automobil patentieren ließ, täglich reichlich Fahrzeuge den Halter wechseln.",
      "Deshalb erledigen wir das digital: Sie fotografieren Ihre Unterlagen, bestätigen die Vollmacht online, und wir führen Zulassung, Umschreibung oder Abmeldung bei der Mannheimer Behörde durch. Ihre MA-Kennzeichen kommen fertig geprägt und gestempelt per versichertem Versand – in die Quadrate genauso wie nach Neckarau oder Käfertal.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "MA" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Mannheim" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe von Ludwigshafen nach Mannheim – was ändert sich für mein Auto?",
        answer:
          "Mit dem Umzug wechselt die Zuständigkeit von Rheinland-Pfalz nach Baden-Württemberg, die neue Adresse muss in die Fahrzeugpapiere. Ihr LU-Kennzeichen dürfen Sie dank bundesweiter Kennzeichenmitnahme trotzdem behalten – oder Sie wechseln auf MA. Wir wickeln die Ummeldung komplett digital bei der Mannheimer Behörde ab.",
      },
      {
        question: "Können Sie ein in Heidelberg oder im Rhein-Neckar-Kreis gekauftes Auto auf mich umschreiben?",
        answer:
          "Ja, das ist ein Standardvorgang: Wir schreiben das Fahrzeug bei der Mannheimer Behörde auf Ihre Adresse um. Seit 2019 kann dabei sogar das bisherige Kennzeichen des Vorbesitzers übernommen werden, wenn Sie möchten.",
      },
      {
        question: "Bekomme ich über Sie ein MA-Wunschkennzeichen?",
        answer:
          "Ja. Wir prüfen die Verfügbarkeit Ihrer Wunschkombination, reservieren sie und liefern die geprägten Schilder mit – für 34,90 € Aufpreis inklusive amtlicher Gebühren. Nennen Sie am besten zwei bis drei Alternativen, falls die erste Wahl vergeben ist.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Mannheim",
      "Auto anmelden Mannheim",
      "Zulassungsstelle Mannheim ohne Termin",
      "Auto ummelden Mannheim",
      "Zulassungsservice Rhein-Neckar",
    ],
  },

  {
    slug: "karlsruhe",
    name: "Karlsruhe",
    inName: "in Karlsruhe",
    description:
      "Kfz-Zulassung in Karlsruhe ohne Behördengang: Wir erledigen Zulassung, Umschreibung und Abmeldung digital bei der Karlsruher Behörde – Festpreis 129 €.",
    intro: [
      "In der Technologieregion Karlsruhe wird vieles digital gedacht – die klassische Fahrzeugzulassung bedeutet aber nach wie vor: Termin buchen, hinfahren, warten. Besonderheit der Fächerstadt: Das Kürzel KA tragen Stadt und Landkreis gleichermaßen, entsprechend groß ist das Einzugsgebiet der Zulassungsvorgänge zwischen Durlach, Ettlingen und Bruchsal.",
      "Wir bringen die Zulassung dorthin, wo Karlsruhe ohnehin arbeitet: ins Digitale. Unterlagen als Foto einreichen, Vollmacht online bestätigen – wir führen den Vorgang bei der zuständigen Behörde durch, ob Stadt oder Landkreis, und senden Ihnen KA-Kennzeichen und Papiere versichert nach Hause.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "KA" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Karlsruhe" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich wohne im Landkreis Karlsruhe – läuft mein Vorgang trotzdem über Sie?",
        answer:
          "Ja. Für den Landkreis ist eine eigene Zulassungsbehörde zuständig, das Kürzel KA bleibt dasselbe. Wir wickeln Ihren Vorgang automatisch bei der für Ihre Adresse zuständigen Stelle ab – der Ablauf ändert sich für Sie nicht.",
      },
      {
        question: "Kann ich mein Elektroauto in Karlsruhe mit E-Kennzeichen zulassen?",
        answer:
          "Ja. Reine Elektrofahrzeuge und qualifizierte Plug-in-Hybride erhalten auf Antrag das E am Ende des Kennzeichens, das lokale Privilegien wie Parkvorteile ermöglichen kann. Wir beantragen es beim Zulassungsvorgang einfach mit – sagen Sie uns nur Bescheid.",
      },
      {
        question: "Wie läuft die Umschreibung nach einem Gebrauchtwagenkauf in der Region?",
        answer:
          "Sie senden uns Fotos von Zulassungsbescheinigung Teil I und II, Ausweis, eVB-Nummer und SEPA-Mandat – wir schreiben das Fahrzeug bei der Karlsruher Behörde auf Sie um. Ob der Wagen vorher in Pforzheim, Rastatt oder Baden-Baden lief, spielt keine Rolle.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Karlsruhe",
      "Auto anmelden Karlsruhe",
      "Zulassungsstelle Karlsruhe ohne Termin",
      "Auto ummelden Karlsruhe",
      "Zulassungsservice Karlsruhe",
    ],
  },

  {
    slug: "augsburg",
    name: "Augsburg",
    inName: "in Augsburg",
    description:
      "Kfz-Zulassung in Augsburg ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Augsburger Behörde – Festpreis 129 €.",
    intro: [
      "Augsburg fährt mit einem der kürzesten Kennzeichen Deutschlands: dem einzelnen A. Die knappen Kombinationen sind begehrt – und die Termine bei der Kfz-Zulassungsbehörde der Stadt Augsburg ebenso, denn neben der Fuggerstadt selbst sorgt das dicht besiedelte Umland zwischen Lech und Wertach für konstanten Andrang.",
      "Bei uns entfällt der Gang zur Behörde komplett: Sie reichen Ihre Unterlagen als Foto ein und bestätigen die digitale Vollmacht, wir führen den Vorgang bei der Augsburger Behörde durch. Auf Wunsch sichern wir dabei Ihre A-Wunschkombination und liefern die geprägten Schilder gestempelt an Ihre Haustür.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "A" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Augsburg" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Wie stehen die Chancen auf eine kurze A-Wunschkombination?",
        answer:
          "Beim einstelligen Kürzel A sind besonders kurze Kombinationen naturgemäß schnell vergeben. Wir prüfen die Verfügbarkeit und reservieren die beste freie Variante – nennen Sie uns am besten mehrere Wunschkombinationen in Ihrer bevorzugten Reihenfolge.",
      },
      {
        question: "Gilt der Service auch für den Landkreis Augsburg?",
        answer:
          "Ja. Der Landkreis führt ebenfalls das Kürzel A, zuständig ist dort das Landratsamt. Wir wickeln Ihren Vorgang bei der für Ihren Wohnort zuständigen Behörde ab – für Sie bleibt der Ablauf identisch.",
      },
      {
        question: "Kann ich mein Motorrad in Augsburg mit Saisonkennzeichen anmelden?",
        answer:
          "Ja. Wir richten beim Zulassungsvorgang direkt Ihren gewünschten Saisonzeitraum von 2 bis 11 Monaten ein – etwa März bis Oktober. Außerhalb der Saison sparen Sie Kfz-Steuer und Versicherungsbeiträge, ohne jedes Jahr neu anmelden zu müssen.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Augsburg",
      "Auto anmelden Augsburg",
      "Zulassungsstelle Augsburg ohne Termin",
      "Wunschkennzeichen Augsburg",
      "Auto ummelden Augsburg",
    ],
  },

  {
    slug: "wiesbaden",
    name: "Wiesbaden",
    inName: "in Wiesbaden",
    description:
      "Kfz-Zulassung in Wiesbaden ohne Behördengang: Zulassung, Ummeldung und Abmeldung digital bei der Wiesbadener Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Wiesbaden und Mainz trennt nur der Rhein – aber verwaltungstechnisch liegt dazwischen eine Landesgrenze. Wer in der hessischen Landeshauptstadt wohnt und drüben in Rheinland-Pfalz arbeitet (oder umgekehrt), jongliert ohnehin genug Termine, da muss der Gang zur Kfz-Zulassungsbehörde der Landeshauptstadt Wiesbaden nicht auch noch sein.",
      "Wir übernehmen den Vorgang vollständig digital: Fotos der Unterlagen hochladen, Vollmacht bestätigen – wir führen Zulassung, Ummeldung oder Abmeldung bei der Wiesbadener Behörde durch und senden Ihre WI-Kennzeichen versichert zu Ihnen. Das funktioniert vom Westend bis Biebrich, und auch der klassische Fall Dienstwagen in der Beamten- und Versicherungsstadt ist bei uns Routine.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "WI" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Wiesbaden" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe von Mainz nach Wiesbaden – muss ich mein MZ-Kennzeichen abgeben?",
        answer:
          "Nein. Auch beim Wechsel des Bundeslands von Rheinland-Pfalz nach Hessen dürfen Sie Ihr Kennzeichen dank bundesweiter Mitnahmeregelung behalten – nur die Adresse in den Fahrzeugpapieren wird aktualisiert. Wer lieber WI fahren möchte, bekommt von uns neue Schilder inklusive Prägung.",
      },
      {
        question: "Übernehmen Sie auch die Zulassung von Firmen- und Dienstwagen in Wiesbaden?",
        answer:
          "Ja, von der einzelnen Zulassung auf eine GmbH mit Handelsregisterauszug bis zur Sammelabwicklung für Fuhrparks. Gerade in Wiesbaden mit seinen vielen Verwaltungen und Versicherungen ein häufiger Fall bei uns.",
      },
      {
        question: "Wie schnell ist eine Abmeldung in Wiesbaden erledigt?",
        answer:
          "Meist noch am selben Werktag. Sie legen die Sicherheitscodes auf Fahrzeugschein und Kennzeichen frei, fotografieren sie und senden uns die Bilder – die Abmeldebestätigung erhalten Sie per E-Mail, für 34,90 €.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Wiesbaden",
      "Auto anmelden Wiesbaden",
      "Zulassungsstelle Wiesbaden ohne Termin",
      "Auto ummelden Wiesbaden",
      "Zulassungsservice Wiesbaden",
    ],
  },

  {
    slug: "aachen",
    name: "Aachen",
    inName: "in Aachen",
    description:
      "Kfz-Zulassung in Aachen ohne Behördengang: Wir erledigen Zulassung, Import-Anmeldung und Abmeldung digital bei der zuständigen Behörde – Festpreis 129 €.",
    intro: [
      "Im Dreiländereck ist der Autokauf über die Grenze Alltag: Gebrauchtwagen aus den Niederlanden oder Belgien sind oft günstiger, und von Aachen aus liegen Maastricht und Lüttich näher als Köln. Nur die Zulassung des Importfahrzeugs bleibt ein deutscher Behördenvorgang – zuständig ist die Kfz-Zulassungsbehörde der StädteRegion Aachen, deren Termine begehrt sind.",
      "Genau dabei helfen wir: Sie senden uns die Fahrzeugunterlagen als Foto – beim EU-Import inklusive CoC-Papier – und erteilen die digitale Vollmacht. Wir führen den Vorgang bei der zuständigen Behörde durch und liefern Ihre AC-Kennzeichen gestempelt und versandversichert nach Hause, ob ins Frankenberger Viertel oder nach Brand.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "AC" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der StädteRegion Aachen" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto in den Niederlanden oder Belgien gekauft – was brauche ich für die Zulassung in Aachen?",
        answer:
          "Für ein EU-Fahrzeug benötigen Sie vor allem die EG-Übereinstimmungsbescheinigung (CoC-Papier), die ausländischen Fahrzeugdokumente, den Kaufvertrag und eine eVB-Nummer. Liegt kein CoC vor, ist zusätzlich eine Einzelbegutachtung nötig. Wir prüfen Ihre Unterlagen vorab und sagen Ihnen genau, was fehlt.",
      },
      {
        question: "Warum ist für Aachen die StädteRegion zuständig und nicht die Stadt?",
        answer:
          "Die Kfz-Zulassung ist in der StädteRegion Aachen regional organisiert – sie umfasst die Stadt Aachen und die umliegenden Kommunen. Für Sie ist das ohne Belang: Wir wickeln den Vorgang bei der zuständigen Stelle ab, das Kürzel AC bleibt.",
      },
      {
        question: "Ich pendle nach Maastricht oder Lüttich – kann mein Auto in Deutschland zugelassen bleiben?",
        answer:
          "Ja. Maßgeblich für die Zulassung ist Ihr regelmäßiger Standort des Fahrzeugs, in der Regel also Ihr Wohnsitz in Aachen – der tägliche Arbeitsweg ins Ausland ändert daran nichts. Ummeldungen nach einem Umzug innerhalb Deutschlands erledigen wir ebenfalls digital.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Aachen",
      "Auto anmelden Aachen",
      "Auto Import Niederlande zulassen",
      "EU-Import Zulassung Aachen",
      "Auto ummelden Aachen",
    ],
  },

  {
    slug: "freiburg",
    name: "Freiburg im Breisgau",
    inName: "in Freiburg",
    description:
      "Kfz-Zulassung in Freiburg ohne Behördengang: Zulassung, Saisonkennzeichen und Abmeldung digital bei der Freiburger Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Freiburg liegt näher an Frankreich und der Schweiz als an Stuttgart – entsprechend oft landen hier Fahrzeuge aus dem Elsass auf dem Hof und Grenzgänger-Fragen auf dem Tisch. Und weil die sonnigste Großstadt Deutschlands ein Herz für Cabrios und Motorräder hat, gehören auch Saisonzulassungen zum Alltag der Kfz-Zulassungsbehörde der Stadt Freiburg im Breisgau.",
      "All das erledigen wir, ohne dass Sie einen Fuß in eine Behörde setzen: Unterlagen abfotografieren, digitale Vollmacht bestätigen – wir führen den Vorgang bei der Freiburger Behörde durch, vom EU-Import mit CoC-Papier bis zum Saisonkennzeichen für die Schwarzwald-Ausfahrt. FR-Kennzeichen und Papiere kommen versichert zu Ihnen, ob nach Herdern oder ins Rieselfeld.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "FR" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Freiburg im Breisgau" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto im Elsass gekauft – können Sie es in Freiburg zulassen?",
        answer:
          "Ja. Für den EU-Import aus Frankreich brauchen Sie das CoC-Papier, die französischen Fahrzeugdokumente (Carte Grise), den Kaufvertrag und eine eVB-Nummer. Wir prüfen die Unterlagen vorab und führen die Zulassung bei der Freiburger Behörde durch.",
      },
      {
        question: "Lohnt sich ein Saisonkennzeichen für mein Cabrio in Freiburg?",
        answer:
          "Häufig ja: Sie wählen einen festen Zeitraum von 2 bis 11 Monaten, in dem das Fahrzeug zugelassen ist, und sparen außerhalb davon Steuer und Versicherung. Wir richten den Saisonzeitraum direkt beim Zulassungsvorgang mit ein – ohne jährliches An- und Abmelden.",
      },
      {
        question: "Ich arbeite in Basel, wohne aber in Freiburg – wo melde ich mein Auto an?",
        answer:
          "An Ihrem Wohnsitz, also in Freiburg: Maßgeblich ist der regelmäßige Standort des Fahrzeugs, nicht der Arbeitsort. Das Pendeln in die Schweiz ändert an der deutschen Zulassung nichts – und die erledigen wir komplett digital für Sie.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Freiburg",
      "Auto anmelden Freiburg",
      "Zulassungsstelle Freiburg ohne Termin",
      "Auto Import Frankreich zulassen",
      "Saisonkennzeichen Freiburg",
    ],
  },

  {
    slug: "krefeld",
    name: "Krefeld",
    inName: "in Krefeld",
    description:
      "Kfz-Zulassung in Krefeld ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Krefelder Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Am Niederrhein wird viel mit Autos gehandelt: Zwischen Krefeld, Mönchengladbach und dem Kreis Viersen wechseln Gebrauchtwagen ständig den Besitzer, und viele Krefelder pendeln täglich nach Düsseldorf oder Duisburg. Für einen Termin bei der Kfz-Zulassungsbehörde der Stadt Krefeld bleibt da wenig Luft – und kurzfristige Slots sind rar.",
      "Wir machen den Behördengang überflüssig: Unterlagen als Foto einreichen, Vollmacht digital erteilen, fertig. Wir führen Umschreibung, Neuzulassung oder Abmeldung bei der Krefelder Behörde durch und senden Ihnen die gestempelten KR-Kennzeichen versichert zu – nach Uerdingen, Fischeln oder mitten in die Seidenstadt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "KR" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Krefeld" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe einen Gebrauchten bei einem Händler in Mönchengladbach oder Viersen gekauft – wie läuft die Umschreibung?",
        answer:
          "Sie senden uns Fotos von Zulassungsbescheinigung Teil I und II, Kaufvertrag, Ausweis und eVB-Nummer – wir schreiben das Fahrzeug bei der Krefelder Behörde auf Sie um. Seit 2019 dürfen Sie dabei auf Wunsch sogar das Kennzeichen des Vorbesitzers weiterfahren.",
      },
      {
        question: "Mein Auto ist verkauft – wie melde ich es in Krefeld ab?",
        answer:
          "Am schnellsten über uns: Sicherheitscodes auf Fahrzeugschein und Kennzeichen freilegen, fotografieren, senden – die Abmeldung ist meist noch am selben Werktag erledigt und kostet 34,90 €. Die Bestätigung fürs Kaufvertrags-Protokoll und die Versicherung erhalten Sie per E-Mail.",
      },
      {
        question: "Kann ich ein KR-Wunschkennzeichen bekommen, ohne selbst zur Behörde zu gehen?",
        answer:
          "Ja. Wir prüfen die Verfügbarkeit Ihrer Wunschkombination, reservieren sie bei der Behörde und liefern die fertig geprägten Schilder mit – für 34,90 € Aufpreis inklusive der amtlichen Gebühren.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Krefeld",
      "Auto anmelden Krefeld",
      "Zulassungsstelle Krefeld ohne Termin",
      "Auto ummelden Krefeld",
      "Auto abmelden Krefeld",
    ],
  },

  {
    slug: "mainz",
    name: "Mainz",
    inName: "in Mainz",
    description:
      "Kfz-Zulassung in Mainz ohne Behördengang: Wir erledigen Zulassung, Ummeldung und Abmeldung digital bei der Mainzer Behörde – Festpreis 129 €.",
    intro: [
      "Als Landeshauptstadt von Rheinland-Pfalz zieht Mainz stetig Zuzügler an – Studierende der Gutenberg-Universität, Beschäftigte von Medien und Verwaltung, Pendler aus dem Rhein-Main-Gebiet. Viele bringen ihr Auto mit und stehen dann vor der Frage, wie sie die Ummeldung bei der Kfz-Zulassungsbehörde der Landeshauptstadt Mainz in ihren Alltag quetschen sollen.",
      "Die Antwort: gar nicht – wir übernehmen das. Sie reichen die Unterlagen als Foto ein und bestätigen die digitale Vollmacht, wir führen den Vorgang bei der Mainzer Behörde durch. MZ-Kennzeichen und aktualisierte Papiere kommen versichert zu Ihnen – in die Neustadt, nach Gonsenheim oder auf Wunsch auf die andere Rheinseite ins Büro.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "MZ" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Landeshauptstadt Mainz" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich ziehe zum Studium nach Mainz – muss ich mein Auto überhaupt ummelden?",
        answer:
          "Ja, sobald Mainz Ihr Hauptwohnsitz ist, muss die neue Adresse in die Fahrzeugpapiere. Ihr bisheriges Kennzeichen dürfen Sie dabei behalten – die bundesweite Kennzeichenmitnahme gilt seit 2015. Wir erledigen die Ummeldung digital, ohne dass Sie einen Termin brauchen.",
      },
      {
        question: "Ich wechsle von Wiesbaden nach Mainz – ist der Bundesland-Wechsel ein Problem?",
        answer:
          "Nein. Dass zwischen den beiden Landeshauptstädten die Grenze zwischen Hessen und Rheinland-Pfalz verläuft, macht den Vorgang nicht komplizierter: Wir melden Ihr Fahrzeug bei der Mainzer Behörde um, Ihr WI-Kennzeichen können Sie behalten oder gegen MZ tauschen.",
      },
      {
        question: "Wie reiche ich meine Unterlagen bei Ihnen ein?",
        answer:
          "Einfach abfotografieren und hochladen oder per WhatsApp senden – Zulassungsbescheinigungen, Ausweis, eVB-Nummer und SEPA-Mandat genügen in den meisten Fällen. Die Vollmacht bestätigen Sie digital, danach übernehmen wir den kompletten Behördenvorgang.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Mainz",
      "Auto anmelden Mainz",
      "Zulassungsstelle Mainz ohne Termin",
      "Auto ummelden Mainz",
      "Zulassungsservice Mainz",
    ],
  },

  {
    slug: "kassel",
    name: "Kassel",
    inName: "in Kassel",
    description:
      "Kfz-Zulassung in Kassel ohne Behördengang: Neuzulassung, Umschreibung und Abmeldung digital bei der Kasseler Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Kassel liegt fast exakt in der Mitte Deutschlands – ideal für den überregionalen Autokauf: Wer online einen Wagen in Hamburg oder München findet, holt ihn über die A7 oft selbst ab. Zurück in Nordhessen wartet dann die Umschreibung bei der Kfz-Zulassungsbehörde der Stadt Kassel, und die kostet mit Terminsuche und Schaltergang schnell mehr Zeit als die Abholfahrt.",
      "Mit uns ist der Papierkram erledigt, bevor der Tank wieder voll ist: Unterlagen fotografieren, digitale Vollmacht bestätigen – wir führen die Umschreibung, Neuzulassung oder Abmeldung bei der Kasseler Behörde durch. Die gestempelten KS-Kennzeichen kommen versichert zu Ihnen, ob nach Wehlheiden, Kirchditmold oder in den Vorderen Westen.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "KS" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Kassel" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto am anderen Ende Deutschlands gekauft – können Sie es in Kassel anmelden?",
        answer:
          "Ja, genau dafür ist der digitale Weg gemacht: Wo das Fahrzeug bisher zugelassen war, spielt keine Rolle. Wir schreiben es bei der Kasseler Behörde auf Ihre Adresse um; das bisherige Kennzeichen kann seit 2019 auf Wunsch sogar übernommen werden.",
      },
      {
        question: "Das gekaufte Fahrzeug ist bereits abgemeldet – geht die Zulassung trotzdem?",
        answer:
          "Ja. Für die Wiederzulassung eines außer Betrieb gesetzten Fahrzeugs brauchen wir Zulassungsbescheinigung Teil I und II, eine gültige HU und Ihre eVB-Nummer. Beachten Sie nur: Ein abgemeldetes Fahrzeug darf bis zur Zulassung nicht auf öffentlichen Straßen gefahren werden.",
      },
      {
        question: "Wohne ich im Landkreis Kassel richtig bei Ihnen?",
        answer:
          "Ja. Auch der Landkreis führt das Kürzel KS, zuständig ist dort allerdings eine eigene Zulassungsbehörde. Wir wickeln Ihren Vorgang automatisch bei der für Ihre Adresse zuständigen Stelle ab – der Ablauf bleibt für Sie gleich.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Kassel",
      "Auto anmelden Kassel",
      "Zulassungsstelle Kassel ohne Termin",
      "Auto ummelden Kassel",
      "Zulassungsservice Nordhessen",
    ],
  },

  {
    slug: "oberhausen",
    name: "Oberhausen",
    inName: "in Oberhausen",
    description:
      "Kfz-Zulassung in Oberhausen ohne Behördengang: Zulassung, Ummeldung und Abmeldung digital bei der Oberhausener Behörde erledigt – Festpreis 129 €.",
    intro: [
      "Im Ruhrgebiet ist die nächste Stadtgrenze nie weit: Von Oberhausen aus liegen Essen, Duisburg, Mülheim und Bottrop praktisch vor der Haustür – und mit jedem Autokauf oder Umzug im Städtenetz wird eine Zulassungsbehörde fällig. Die Termine bei der Kfz-Zulassungsbehörde der Stadt Oberhausen sind dabei genauso umkämpft wie überall im Revier.",
      "Wir kürzen das ab: Statt Wartemarke gibt es bei uns einen digitalen Vorgang – Unterlagen als Foto, Vollmacht per Klick, und wir erledigen Zulassung, Umschreibung oder Abmeldung bei der Oberhausener Behörde. Ihre OB-Kennzeichen kommen fertig gestempelt per versichertem Versand, ob nach Sterkrade, Osterfeld oder in die Innenstadt.",
    ],
    facts: [
      { label: "Kennzeichen-Kürzel", value: "OB" },
      { label: "Zuständige Behörde", value: "Kfz-Zulassungsbehörde der Stadt Oberhausen" },
      { label: "Typische Dauer über uns", value: "1–3 Werktage, Abmeldung meist taggleich" },
      { label: "Komplettpreis", value: "129 € inkl. Gebühren, Kennzeichen & Versand" },
    ],
    faq: [
      {
        question: "Ich habe ein Auto in Essen oder Duisburg gekauft – wie bekomme ich es auf OB umgeschrieben?",
        answer:
          "Sie senden uns die Fahrzeugpapiere, Ihren Ausweis und die eVB-Nummer als Foto – wir schreiben das Fahrzeug bei der Oberhausener Behörde auf Sie um. Ob Sie dann OB fahren oder das bisherige E- oder DU-Kennzeichen behalten, entscheiden Sie selbst.",
      },
      {
        question: "Ich ziehe innerhalb des Ruhrgebiets nach Oberhausen – muss ich neue Schilder kaufen?",
        answer:
          "Nein. Seit 2015 gilt die Kennzeichenmitnahme bundesweit, also erst recht zwischen Revierstädten – nur die Adresse in den Fahrzeugpapieren muss aktualisiert werden. Diese Ummeldung erledigen wir komplett digital für Sie.",
      },
      {
        question: "Was kostet die Kfz-Zulassung in Oberhausen über DeutscheZulassung?",
        answer:
          "129 € als Komplettpreis – amtliche Gebühren, geprägte Kennzeichen und versicherter Versand sind enthalten. Die Abmeldung kostet 34,90 € und ist meist noch am selben Werktag erledigt.",
      },
    ],
    keywords: [
      "Kfz-Zulassung Oberhausen",
      "Auto anmelden Oberhausen",
      "Zulassungsstelle Oberhausen ohne Termin",
      "Auto ummelden Oberhausen",
      "Zulassungsservice Ruhrgebiet",
    ],
  },
];

export function getCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}
