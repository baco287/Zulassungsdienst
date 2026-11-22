/**
 * Texte der Seite /wunschkennzeichen-generator/ – Schritte, Ideenbeispiele und FAQ.
 *
 * Alle Aussagen zu Regeln kommen aus config/kennzeichen-regeln.json, alle Beträge aus
 * config/preise.json (über lib/pricing.ts). Hier steht kein fest eingetragener Preis
 * und keine Regel, die nicht dort belegt ist.
 *
 * Anrede: Der Assistent duzt (Vorgabe für dieses Werkzeug). Der Rest der Website siezt.
 */
import { euro, officialFees, P, wunschkennzeichenHinweis } from "@/lib/pricing";
import { site } from "@/lib/site";
import { REGELN } from "./regeln";
import type { Kombination } from "./typen";

export const SEITE = {
  pfad: "/wunschkennzeichen-generator/",
  h1: "Finde dein perfektes Wunschkennzeichen – mit KI.",
  lead: "Persönlich, kreativ und individuell. Unser intelligenter Kennzeichenassistent hilft dir, die passende Kombination zu entdecken.",
  titel: "Wunschkennzeichen-Generator mit KI: Ideen finden",
  beschreibung:
    "Wunschkennzeichen finden mit KI: Ort eingeben, Initialen, Zahl oder Datum nennen und passende Kombinationen sofort als Kennzeichen sehen. Kostenlos, ohne Anmeldung.",
  cta: "Jetzt Wunschkennzeichen finden",
} as const;

export const zusagen = [
  { titel: "Kostenlos und ohne Anmeldung", text: "einfach loslegen" },
  { titel: "Nach den Regeln geprüft", text: "jede Kombination, bevor du sie siehst" },
  { titel: "Ehrlich bei der Verfügbarkeit", text: "frei ist nur, was die Behörde bestätigt" },
];

export const schritte = [
  {
    titel: "Ort nennen",
    text: "Du gibst deine Stadt, deinen Landkreis oder dein Kürzel ein. Der Assistent kennt die Zulassungsbezirke und zeigt dir, welche Kürzel dort auf das Schild dürfen – auch wieder eingeführte Altkennzeichen.",
  },
  {
    titel: "Wünsche erzählen",
    text: "Initialen, Name, Geburtstag, Jahrestag, Glückszahl oder einfach „sportlich und kurz“: Schreib es wie in einem Chat oder tipp einen Vorschlag an. Der Assistent merkt sich alles und fragt nach, wenn etwas fehlt.",
  },
  {
    titel: "Kennzeichen ansehen und vergleichen",
    text: "Jede Idee erscheint als Kennzeichen, mit einem Satz zur Idee dahinter. Du kannst ähnliche Kombinationen suchen, Favoriten merken und nebeneinander vergleichen.",
  },
  {
    titel: "Auswählen und zulassen",
    text: "Gefällt dir eins, nimmst du es mit in den Auftrag. Wir kümmern uns um die Zulassung – und auf Wunsch um Prüfung, Reservierung und Zuteilung deines Kennzeichens bei der Behörde.",
  },
];

/** Beispiele für die Ideen-Abschnitte. Reine Anschauung – nicht geprüft, nicht reserviert. */
export const ideen: { titel: string; text: string; beispiel: Kombination }[] = [
  {
    titel: "Wunschkennzeichen nach Initialen",
    text: "Der Klassiker: deine Anfangsbuchstaben, dazu eine Zahl, die dir etwas bedeutet. Der Assistent spielt die Varianten durch – beide Buchstaben, nur einer, mit einfacher oder doppelter Zahl.",
    beispiel: { kuerzel: "H", buchstaben: "MM", ziffern: "24", zusatz: "" },
  },
  {
    titel: "Geburtstag, Jahrestag, Geburtsjahr",
    text: "Aus dem 15.08. wird 1508 oder 158, aus 1990 wird 1990 oder 90. Der Assistent prüft gleich mit, ob die Zahl mit deinen Buchstaben noch in die erlaubte Länge passt.",
    beispiel: { kuerzel: "M", buchstaben: "TK", ziffern: "1508", zusatz: "" },
  },
  {
    titel: "Kennzeichen für Paare",
    text: "Zwei Vornamen, ein Schild: Aus Lisa und Tim werden LT oder TL, dazu euer Jahrestag oder eine gemeinsame Zahl.",
    beispiel: { kuerzel: "K", buchstaben: "LT", ziffern: "158", zusatz: "" },
  },
  {
    titel: "Kreative Kombinationen",
    text: "Manchmal ergibt das Kürzel mit den Buchstaben dahinter ein Wort. Solche Wortspiele findet der Assistent für dein Kürzel von selbst – und die KI denkt sich auf Wunsch noch ausgefallenere aus.",
    beispiel: { kuerzel: "DAN", buchstaben: "KE", ziffern: "1", zusatz: "" },
  },
  {
    titel: "Kurze Kennzeichen",
    text: "Ein Buchstabe, eine Ziffer – kürzer geht es nicht. Der Assistent zeigt die kürzesten zulässigen Kombinationen und sagt dazu, wann Behörden sie nur unter Bedingungen herausgeben.",
    beispiel: { kuerzel: "B", buchstaben: "X", ziffern: "7", zusatz: "" },
  },
  {
    titel: "E- und H-Kennzeichen",
    text: "Für Elektroautos und Oldtimer kommt ein E oder H ans Ende. Dann sind davor höchstens sieben Stellen möglich – der Assistent rechnet das mit ein.",
    beispiel: { kuerzel: "S", buchstaben: "EV", ziffern: "1", zusatz: "E" },
  },
];

const f = REGELN.format;
const bundesweit = REGELN.sperren.filter((s) => s.geltung === "bundesweit").flatMap((s) => s.buchstaben);
const dauer = REGELN.reservierung.dauer;

/** Die Regeln in Klartext – jede Zeile mit Geltungsbereich und Quelle. */
export const regelZeilen: { titel: string; text: string; geltung: string; quelle: string }[] = [
  {
    titel: "Aufbau",
    text: `Nach dem Kürzel deines Bezirks folgen ${f.buchstabenMin} bis ${f.buchstabenMax} Buchstaben und ${f.ziffernMin} bis ${f.ziffernMax} Ziffern. Erlaubt sind alle Buchstaben von A bis Z, aber keine Umlaute. Die Zahl beginnt nicht mit einer Null.`,
    geltung: "Bundesweit (Fahrzeug-Zulassungsverordnung, Anlage 1)",
    quelle: f.quelle,
  },
  {
    titel: "Länge",
    text: `Kürzel, Buchstaben und Ziffern haben zusammen höchstens ${f.maxStellen} Stellen. Bei einem dreistelligen Kürzel bleiben also fünf Zeichen.`,
    geltung: "Bundesweit (Fahrzeug-Zulassungsverordnung, Anlage 4)",
    quelle: f.quelleLaenge,
  },
  {
    titel: "E- und H-Kennzeichen",
    text: "Vor dem E (Elektro) oder H (Oldtimer) sind höchstens sieben Stellen möglich. Bei Saisonkennzeichen gilt dieselbe Grenze.",
    geltung: "Bundesweit (Fahrzeug-Zulassungsverordnung, Anlage 4)",
    quelle: REGELN.zusatz.E.quelle,
  },
  {
    titel: "Gesperrte Buchstabenpaare",
    text: `${bundesweit.join(", ")} werden wegen ihres Bezugs zum Nationalsozialismus nicht zugeteilt. Die Verordnung selbst verbietet nur Kombinationen, die gegen die guten Sitten verstoßen; die Liste geht auf eine Empfehlung des Bundes zurück, die alle Länder umgesetzt haben.`,
    geltung: "Bundesweit umgesetzt",
    quelle: REGELN.sperren.find((s) => s.geltung === "bundesweit")?.quelle ?? f.quelle,
  },
  {
    titel: "Weitere Sperren",
    text: "Einzelne Länder und Behörden sperren zusätzlich bestimmte Zahlen oder Zusammensetzungen – etwa Baden-Württemberg, Brandenburg, Niedersachsen, Berlin, Stuttgart oder Köln. Der Assistent wendet solche Sperren nur dort an, wo sie gelten.",
    geltung: "Regional – je nach Land oder Behörde",
    quelle: REGELN.sperren.find((s) => s.id === "bw-land")?.quelle ?? f.quelle,
  },
  {
    titel: "Sehr kurze Kennzeichen",
    text: REGELN.kurz.text,
    geltung: "Praxis der Behörden, nicht bundesweit vorgeschrieben",
    quelle: REGELN.kurz.quelle,
  },
];

export const reservierungsDauer = dauer;

export const faq: { question: string; answer: string }[] = [
  {
    question: "Wie funktioniert der Wunschkennzeichen-Generator?",
    answer:
      "Du nennst deinen Zulassungsbezirk und erzählst dem Assistenten, was auf dem Schild stehen soll: Initialen, ein Name, ein Datum, eine Glückszahl oder einfach ein Stil. Daraus entstehen Kombinationen, die nach den geltenden Regeln möglich sind. Du siehst sie als Kennzeichen, kannst sie vergleichen, merken und ähnliche suchen.",
  },
  {
    question: "Sind die vorgeschlagenen Kennzeichen frei?",
    answer:
      "Das wissen wir nicht – und behaupten es deshalb auch nicht. Jeder Vorschlag ist zunächst eine Idee. Ob eine Kombination noch zu haben ist, weiß nur das Reservierungssystem deiner Zulassungsbehörde. Der Assistent zeigt dir den Weg dorthin oder wir übernehmen die Prüfung im Rahmen deiner Zulassung.",
  },
  {
    question: "Wie prüfe ich, ob mein Wunschkennzeichen verfügbar ist?",
    answer:
      "Verbindlich geht das nur bei der zuständigen Zulassungsbehörde, in der Regel über deren Online-Portal. Eine bundesweite Abfrage für alle Bezirke gibt es nicht. Unter jedem Vorschlag findest du „Verfügbarkeit prüfen“: Dort steht der Link zur richtigen Behörde. Alternativ fragen wir die Kombination für dich an, wenn du den Wunschkennzeichen-Service dazubuchst.",
  },
  {
    question: "Welche Kombinationen sind bei einem Wunschkennzeichen erlaubt?",
    answer: `Nach dem Kürzel deines Bezirks stehen ${f.buchstabenMin} bis ${f.buchstabenMax} Buchstaben und ${f.ziffernMin} bis ${f.ziffernMax} Ziffern, ohne Umlaute und ohne Null am Anfang. Alles zusammen darf höchstens ${f.maxStellen} Stellen haben. Bei E- und H-Kennzeichen sind vor dem Zusatzbuchstaben höchstens sieben Stellen möglich.`,
  },
  {
    question: "Welche Kennzeichen sind verboten?",
    answer: `Bundesweit nicht zugeteilt werden die Buchstabenpaare ${bundesweit.join(", ")}. Darüber hinaus sperren einzelne Bundesländer und Behörden weitere Kombinationen, zum Beispiel bestimmte Zahlen. Diese Sperren gelten nur regional; der Assistent berücksichtigt sie für deinen Bezirk. Im Einzelfall entscheidet immer die Zulassungsbehörde.`,
  },
  {
    // Eigene Frage statt „Was kostet ein Wunschkennzeichen?“ – die beantworten Leistungsseite und Ratgeber.
    question: "Kostet der Wunschkennzeichen-Generator etwas?",
    answer: `Nein, Ideen finden, vergleichen und merken ist kostenlos. Kosten entstehen erst bei der Reservierung: Die amtliche Gebühr für Reservierung und Zuteilung beträgt bundesweit ${euro(officialFees.customPlate[0])}. Mit dem Wunschkennzeichen-Service von ${site.name} (${P.wunschkennzeichen} zusätzlich zur Zulassung) übernehmen wir Prüfung, Reservierung und Zuteilung. ${wunschkennzeichenHinweis}`,
  },
  {
    question: "Bekomme ich ein besonders kurzes Kennzeichen?",
    answer: `${REGELN.kurz.text} Der Assistent zeigt kurze Kombinationen deshalb mit einem Hinweis.`,
  },
  {
    question: "Ist ein ausgewähltes Kennzeichen schon reserviert?",
    answer:
      "Nein. Auswählen und Merken geschehen nur in deinem Browser. Reserviert ist ein Kennzeichen erst, wenn die Zulassungsbehörde die Reservierung bestätigt. Bis dahin kann es jemand anderes bekommen – auch wenn es kurz zuvor noch frei war.",
  },
  {
    question: "Was passiert mit meinen Angaben?",
    answer:
      "Initialen, Namen und Daten, die der Assistent erkennt, verarbeitet er in deinem Browser; daraus werden nur Buchstaben und Ziffern. Was du über „Meine Initialen“, „Mein Name“ und die anderen Schaltflächen eingibst, verlässt deinen Browser nicht. Tippst du einen Wunsch frei ein, den der Assistent nicht selbst versteht, schicken wir nur diesen Teil – ohne erkannte Namen, Daten und Kontaktdaten – an unseren KI-Dienst. Wir speichern weder Namen noch Geburtsdaten noch den Gesprächsverlauf. Die Merkliste liegt ausschließlich in deinem Browser.",
  },
  {
    question: "Brauche ich ein Kundenkonto?",
    answer:
      "Nein. Der Assistent funktioniert ohne Registrierung. Kontaktdaten brauchen wir erst, wenn du eine Zulassung bei uns beauftragst.",
  },
];
