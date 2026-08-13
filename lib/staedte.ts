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
];

export function getCity(slug: string): City | undefined {
  return cities.find((c) => c.slug === slug);
}
