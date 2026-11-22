/**
 * Wortliste für Wortspiel-Kennzeichen: Unterscheidungszeichen + Buchstaben ergeben
 * zusammen ein Wort oder einen Namen ("DAN-KE", "HAL-LO", "MA-MA", "H-EY").
 *
 * Nur freundliche, unverfängliche Wörter. Ob eine Zusammensetzung gesperrt ist,
 * prüft lib/kennzeichen/regeln.ts – hier muss nichts doppelt gepflegt werden.
 * Umlaute nur dort, wo sie im Kürzel stehen können (TÜ-R, LÖ-WE): in den Buchstaben
 * nach dem Kürzel gibt es keine.
 */
export const WOERTER: string[] = [
  // zwei Buchstaben
  "HI", "JA", "OK", "GO", "DU", "DA", "SO", "WE", "ME", "MA", "PA", "HA", "HE", "NA", "WO", "ZU", "EI", "BE",
  // drei Buchstaben
  "HEY", "WOW", "YES", "TOP", "FUN", "FAN", "FIT", "FOX", "HIT", "ICE", "JOY", "KEY", "LUX", "MIX", "NEU", "NOW",
  "ONE", "PRO", "RAD", "RED", "RUN", "SKY", "SUN", "WIN", "ZEN", "ZOO", "ABC", "ACE", "AIR", "ART", "BAR", "BIG",
  "BOX", "BUS", "CAR", "CAT", "DOG", "EIS", "ELF", "FEE", "GAS", "GUT", "HAI", "HUT", "KUH", "LOL", "MUT", "OHA",
  "OMA", "OPA", "PUR", "REH", "ROT", "SEE", "TAG", "TEE", "TOR", "UFO", "UHU", "VAN", "WEG", "WIR", "ZUG", "BMW",
  "VIP", "GTI", "AMG", "SUV", "GPS", "LKW", "PKW", "KFZ", "ICH", "MIR", "DIR", "UNS", "TÜR", "FÜR", "MOM", "DAD",
  "BOY", "BOB", "MAX", "BEN", "LEO", "TOM", "TIM", "KAI", "JAN", "EVA", "IDA", "MIA", "LEA", "PIA", "AMY", "ZOE",
  "SAM", "RON", "UWE", "UDO", "UTE", "ULI", "UTA", "JON", "LIA", "LIV", "KIM", "KAY", "RAY", "ROY", "TED", "VIC",
  // vier Buchstaben
  "HELD", "LIEB", "MAMA", "PAPA", "BABY", "CHEF", "COOL", "GOLD", "HERZ", "KING", "LOVE", "MAUS", "MOND", "NEON",
  "PLUS", "RACE", "ROCK", "STAR", "TAXI", "TEAM", "TOLL", "WELT", "WOLF", "ZEIT", "AUTO", "BIER", "BLAU", "EDEL",
  "FEIN", "FREI", "GERN", "GLUT", "HOCH", "KLAR", "KURS", "LAUF", "LUFT", "MEER", "MILD", "NORD", "PILS", "RUHE",
  "SOLO", "TANK", "TREU", "WEIT", "WILD", "ZART", "ZIEL", "MÜDE", "LÖWE", "KÖNIG", "OTTO", "ANNA", "LENA", "LARA",
  "NINA", "NORA", "EMMA", "ELLA", "LILI", "LOLA", "MILA", "PAUL", "LUIS", "LUKA", "NOAH", "ERIK", "FINN", "EMIL",
  "HUGO", "KARL", "KURT", "OMAR", "ALEX", "ANDI", "BERT", "DIRK", "FRED", "GERD", "JOSH", "JÖRG", "LARS", "MARC",
  "MARK", "NICK", "NILS", "OLAF", "OLLI", "RALF", "ROLF", "RUDI", "SVEN", "TILL", "TINA", "TONI", "ILSE", "INES",
  "IRIS", "KATI", "HEDI", "MAIK", "MAJA", "MARA", "MIKE", "MIRA", "MONA", "RITA", "RUTH", "SINA", "SUSI", "VERA",
  "BUNT", "DORF", "ECHT", "FEST", "FLOW", "GLÜCK", "HAUS", "HEIM", "IDEE", "JAZZ", "KERN", "KINO", "LAND", "LEBE",
  "MARE", "MOIN", "NETT", "OBEN", "PARK", "RAUM", "REIF", "SAFT", "TANZ", "TIER", "UFER", "VIEL", "WALD", "WARM",
  "WIND", "WITZ", "WOHL", "ZAUN", "ZELT", "HIER", "HEUT", "DEIN", "MEIN", "EINS", "ZWEI", "DREI", "VIER", "ACHT",
  // fünf Buchstaben (dreistelliges Kürzel + zwei Buchstaben)
  "DANKE", "BITTE", "HALLO", "WOLKE", "ROSEN", "REISE", "LAUNE", "BERGE", "MONAT", "STARK", "SONNE", "WELLE",
  "BRAVO", "PIRAT", "ANKER", "TURBO", "TEMPO", "JETZT", "HEIDI", "HEIKE", "HEINZ", "HEIKO", "LIEBE", "MUSIK",
  "FREUD", "GLANZ", "HAFEN", "INSEL", "KRAFT", "LEBEN", "NATUR", "PERLE", "RUNDE", "SEGEL", "TRAUM", "WIESE",
  "ALLES", "BLUME", "ERNTE", "FARBE", "GARTE", "HONIG", "KERZE", "LICHT", "MILAN", "NACHT", "OSTEN", "PFERD",
  "RADIO", "STERN", "TIGER", "VOGEL", "WAGEN", "ZEBRA", "LUISA", "MARIE", "MARIA", "MARCO", "MALTE", "MORITZ",
  "PETER", "PETRA", "KLAUS", "KARIN", "JONAS", "JULIA", "FELIX", "FRANK", "ELIAS", "DAVID", "CLARA", "BERND",
  "ANTON", "ANNIKA", "WERNER", "WALTER", "VOLKER", "ULRIKE", "SIMON", "SOFIA", "ROBIN", "OSKAR", "NIKLAS",
];

/**
 * Autohinweise aus dem Gespräch ("für meinen BMW"): Buchstaben und Zahlen, die
 * zur Marke passen. Reine Ideenhilfe – kein Bezug zu Herstellerrechten, auf dem
 * Schild stehen ohnehin nur Buchstaben und Ziffern.
 */
export const MARKEN: Record<string, { name: string; buchstaben: string[]; zahlen: string[]; elektrisch?: boolean }> = {
  bmw: { name: "BMW", buchstaben: ["M", "MW", "X", "Z"], zahlen: ["3", "5", "1", "320", "530", "7"] },
  audi: { name: "Audi", buchstaben: ["A", "S", "RS", "Q", "TT"], zahlen: ["3", "4", "5", "6", "8"] },
  mercedes: { name: "Mercedes", buchstaben: ["C", "E", "S", "G", "SL", "AM"], zahlen: ["63", "200", "300", "500"] },
  benz: { name: "Mercedes", buchstaben: ["C", "E", "S", "G", "SL", "AM"], zahlen: ["63", "200", "300", "500"] },
  vw: { name: "VW", buchstaben: ["VW", "GT", "R", "G"], zahlen: ["1", "2", "7", "8"] },
  volkswagen: { name: "VW", buchstaben: ["VW", "GT", "R", "G"], zahlen: ["1", "2", "7", "8"] },
  golf: { name: "Golf", buchstaben: ["GT", "GO", "R", "G"], zahlen: ["7", "8", "2", "1"] },
  porsche: { name: "Porsche", buchstaben: ["P", "RS", "GT", "S"], zahlen: ["911", "718", "356", "944"] },
  tesla: { name: "Tesla", buchstaben: ["T", "EV", "E", "X"], zahlen: ["3", "100", "1"], elektrisch: true },
  mini: { name: "Mini", buchstaben: ["MI", "M", "JC"], zahlen: ["1", "59", "3"] },
  mustang: { name: "Mustang", buchstaben: ["GT", "M"], zahlen: ["500", "350", "64"] },
  fiat: { name: "Fiat", buchstaben: ["F", "FI"], zahlen: ["500", "124"] },
  opel: { name: "Opel", buchstaben: ["OP", "O", "GT"], zahlen: ["1", "5"] },
  ford: { name: "Ford", buchstaben: ["F", "ST", "RS", "GT"], zahlen: ["1", "150", "5"] },
  skoda: { name: "Škoda", buchstaben: ["RS", "S", "VR"], zahlen: ["1", "3"] },
  seat: { name: "Seat", buchstaben: ["FR", "S"], zahlen: ["1", "5"] },
  cupra: { name: "Cupra", buchstaben: ["CU", "C", "VZ"], zahlen: ["1", "5"] },
  toyota: { name: "Toyota", buchstaben: ["T", "GR", "TY"], zahlen: ["86", "1"] },
  volvo: { name: "Volvo", buchstaben: ["V", "XC"], zahlen: ["40", "60", "90"] },
  smart: { name: "Smart", buchstaben: ["SM", "S"], zahlen: ["1", "2", "42"] },
};
