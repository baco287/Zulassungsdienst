/**
 * Betriebsangaben: Zeiten, Abwicklung, Regionen.
 *
 * EINZIGE QUELLE für Zeit- und Ablaufversprechen ist config/betrieb.json –
 * so wie config/preise.json die einzige Preisquelle ist. Seiten, FAQ,
 * Stadtseiten, strukturierte Daten und llms.txt formulieren Zeiten nur über
 * die Bausteine in diesem Modul. `npm run check:daten` findet fest
 * eingetragene Zeitangaben, die an der Konfiguration vorbeigehen.
 *
 * Werte mit status "offen" sind nicht freigegeben und liefern hier `null` –
 * die Oberfläche zeigt dann bewusst keine Zahl an.
 */
import betrieb from "@/config/betrieb.json";

export const BETRIEB = betrieb;
export const BETRIEB_STAND: string = betrieb.stand;
export const BETRIEB_FREIGEGEBEN: boolean = betrieb.freigabe.freigegeben;

type Spanne = [number, number];

interface BearbeitungsEintrag {
  /** Dauer in Minuten (Vorrang vor Werktagen), z. B. [10, 30]. */
  minuten?: number[];
  werktage?: number[];
  selberWerktag?: boolean;
  status: string;
  einschraenkung?: string;
}

const bearbeitung = betrieb.zeiten.bearbeitung as Record<string, BearbeitungsEintrag>;

/** "1–3" bzw. "2" für eine Werktag-Spanne. */
function spanne([min, max]: Spanne): string {
  return min === max ? String(min) : `${min}–${max}`;
}

/**
 * Bearbeitungsdauer einer Leistung inkl. Behördenentscheidung, ohne Versand.
 * Gibt null zurück, wenn für die Leistung keine Angabe hinterlegt ist.
 */
export function bearbeitungsdauer(
  slug: string,
  kasus: "nominativ" | "dativ" = "nominativ",
): string | null {
  const e = bearbeitung[slug];
  if (!e || e.status === "offen") return null;
  if (e.minuten) return `${spanne(e.minuten as Spanne)} Minuten`;
  if (e.selberWerktag) return "am selben Werktag";
  if (!e.werktage) return null;
  const [min, max] = e.werktage as Spanne;
  const plural = max > 1;
  const wort = plural ? (kasus === "dativ" ? "Werktagen" : "Werktage") : "Werktag";
  return `${spanne([min, max])} ${wort}`;
}

/**
 * Dauer als Umstandsangabe für Sätze wie „meist … erledigt“:
 * „in 10–30 Minuten“, „in 1–3 Werktagen“ oder „am selben Werktag“.
 */
function bearbeitungAdverbial(slug: string): string | null {
  const e = bearbeitung[slug];
  if (!e || e.status === "offen") return null;
  if (e.selberWerktag && !e.minuten) return "am selben Werktag";
  const dauer = bearbeitungsdauer(slug, "dativ");
  return dauer ? `in ${dauer}` : null;
}

/** Versand neuer Kennzeichenschilder; null, solange nicht angegeben. */
const kennzeichenVersand = betrieb.zeiten.versand.kennzeichen as {
  werktage: number[] | null;
  status: string;
};
const kennzeichenSpanne: Spanne | null =
  kennzeichenVersand.status === "offen" || !kennzeichenVersand.werktage
    ? null
    : (kennzeichenVersand.werktage as Spanne);

/** Fertige Textbausteine. Nur diese verwenden, keine Zeiten fest in Texte schreiben. */
export const ZEIT = {
  /** "10–30 Minuten" – Zulassung, Ummeldung, Halterwechsel, Wiederzulassung */
  zulassung: bearbeitungsdauer("ummeldung")!,
  /** "10–30 Minuten" – für "innerhalb von …", "in …" */
  zulassungDativ: bearbeitungsdauer("ummeldung", "dativ")!,
  /** "10–30 Minuten" – Adressänderung */
  adressaenderung: bearbeitungsdauer("adressaenderung")!,
  /** "in 10–30 Minuten" – Abmeldung, als Umstandsangabe ("meist … erledigt") */
  abmeldung: bearbeitungAdverbial("abmeldung")!,
  /** Einschränkung, die zur Abmeldung-Zeitangabe gehört. */
  abmeldungBedingung: bearbeitung.abmeldung.einschraenkung ?? "",
  /** "1–3 Werktage" – Versand neuer Kennzeichenschilder */
  kennzeichen: kennzeichenSpanne ? `${spanne(kennzeichenSpanne)} Werktage` : "einige Werktage",
  /** "1–3 Werktagen" – für "in …", "innerhalb von …" */
  kennzeichenDativ: kennzeichenSpanne ? `${spanne(kennzeichenSpanne)} Werktagen` : "einigen Werktagen",
  /** "3–10 Werktage" – Ersatzdokumente, behördenabhängig */
  ersatzDokumente: bearbeitungsdauer("ersatz-dokumente")!,
  /** "1–2 Werktage" – Kurzzeitkennzeichen */
  kurzzeitkennzeichen: bearbeitungsdauer("kurzzeitkennzeichen")!,
  /** "ca. 2 Minuten" – nur das Absenden der Anfrage */
  anfrage: `ca. ${betrieb.zeiten.kunde.anfrageMinuten.wert} Minuten`,
  /** "ca. 10 Minuten" – Auftrag erteilen inkl. Fotos, Sicherheitscodes und Unterschrift */
  auftrag: `ca. ${betrieb.zeiten.kunde.auftragMinuten.wert} Minuten`,
  /** Bezugspunkt aller Zeitangaben. */
  bezug: "ab vollständigen, lesbaren Unterlagen und Zahlungseingang",
  /**
   * Versand wird immer getrennt von der Bearbeitung genannt. Eine Laufzeit steht
   * nur dabei, wenn sie in der Konfiguration angegeben ist.
   */
  versand:
    betrieb.zeiten.versand.status !== "offen" && betrieb.zeiten.versand.werktage !== null
      ? `zuzüglich Versand (${spanne(betrieb.zeiten.versand.werktage as unknown as Spanne)} Werktage)`
      : kennzeichenSpanne
        ? `zuzüglich Versand (neue Kennzeichen meist ${spanne(kennzeichenSpanne)} Werktage)`
        : "zuzüglich Versand",
} as const;

const abmeldungGleich = bearbeitungsdauer("abmeldung") === ZEIT.zulassung;

/** Übersichtszeile für Stadt- und Behördenseiten. */
export const DAUER_UEBERSICHT = `Bearbeitung meist ${ZEIT.zulassung}, neue Kennzeichen per Post in ${ZEIT.kennzeichenDativ}${
  abmeldungGleich ? "" : `; Abmeldung meist ${ZEIT.abmeldung}`
}`;

/**
 * Hinweis „schnelle Bearbeitung, aber Kennzeichen brauchen Postlaufzeit“.
 * Überall dort einsetzen, wo Kunden neue Kennzeichenschilder mitbestellen können –
 * damit niemand aus der kurzen Bearbeitungszeit schließt, sofort fahren zu können.
 */
const hinweisBedingung = `Die Bearbeitungszeit gilt ${ZEIT.bezug}, innerhalb unserer Servicezeiten.`;
const hinweisFahren = "Fahren dürfen Sie erst, wenn die Kennzeichenschilder am Fahrzeug montiert sind.";

export const KENNZEICHEN_HINWEIS = {
  title: "Gut zu wissen: Kennzeichen kommen per Post",
  /** Ein Satz für Karten, Formularzeilen und Listen. */
  kurz: `Neue Kennzeichenschilder kommen per Post – meist in ${ZEIT.kennzeichenDativ}.`,
  /** Ab wann die Bearbeitungszeit läuft. */
  bedingung: hinweisBedingung,
  /** Ohne Schilder keine Fahrt – der eigentliche Grund für den Hinweis. */
  fahren: hinweisFahren,
  /** Ausweg, wenn es eilt. */
  eilig:
    "Wenn es eilt: Mit Ihrer zugeteilten Kennzeichen-Kombination können Sie die Schilder auch direkt bei einem Schildermacher in Ihrer Nähe prägen lassen.",
  /** Alles in einem Absatz, für Fließtext und FAQ. */
  text: `Die Bearbeitung dauert meist ${ZEIT.zulassung}. Neue Kennzeichenschilder, die Sie bei uns mitbestellen, kommen per Post – das dauert in der Regel ${ZEIT.kennzeichen}. ${hinweisFahren} ${hinweisBedingung}`,
} as const;

/** Vier getrennte Zeitphasen einer Leistung für Infoboxen und strukturierte Daten. */
export interface Zeitphasen {
  /** Aufwand des Kunden (online). */
  kunde: string;
  /** Prüfung durch DeutscheZulassung – null, solange nicht freigegeben. */
  pruefung: string | null;
  /** Bearbeitung inkl. Behördenentscheidung, ohne Versand. */
  bearbeitung: string | null;
  /** Versandhinweis; null bei rein digitalen Vorgängen. */
  versand: string | null;
}

/** Leistungen ohne physischen Versand (Bestätigung per E-Mail). */
const OHNE_VERSAND = new Set(["abmeldung"]);

export function zeitphasen(slug: string): Zeitphasen {
  const pruefung = betrieb.zeiten.pruefungDurchDZ;
  return {
    kunde: `Auftrag erteilen: ${ZEIT.auftrag}`,
    pruefung:
      pruefung.status === "offen" || pruefung.wert === null
        ? null
        : `Prüfung durch uns: ${pruefung.wert} ${pruefung.einheit}`,
    bearbeitung: bearbeitungsdauer(slug),
    versand: OHNE_VERSAND.has(slug) ? null : ZEIT.versand,
  };
}

/** Kurzform für Karten und Listen, z. B. "10–30 Minuten + Versand". */
export function dauerKurz(slug: string): string | null {
  const b = bearbeitungsdauer(slug);
  if (!b) return null;
  return OHNE_VERSAND.has(slug) ? `meist ${b}` : `${b} + Versand`;
}

/** Offene Betreiberentscheidungen aus der Konfiguration (für Doku und Prüfskript). */
export function offeneEntscheidungen(): { pfad: string; frage: string }[] {
  const out: { pfad: string; frage: string }[] = [];
  const walk = (node: unknown, pfad: string) => {
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.status === "offen" && typeof n.frage === "string") out.push({ pfad, frage: n.frage });
    for (const [k, v] of Object.entries(n)) if (!k.startsWith("$")) walk(v, pfad ? `${pfad}.${k}` : k);
  };
  walk(betrieb, "");
  return out;
}
