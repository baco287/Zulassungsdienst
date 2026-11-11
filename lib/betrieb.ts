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
  if (e.selberWerktag) return "am selben Werktag";
  if (!e.werktage) return null;
  const [min, max] = e.werktage as Spanne;
  const plural = max > 1;
  const wort = plural ? (kasus === "dativ" ? "Werktagen" : "Werktage") : "Werktag";
  return `${spanne([min, max])} ${wort}`;
}

/** Fertige Textbausteine. Nur diese verwenden, keine Zeiten fest in Texte schreiben. */
export const ZEIT = {
  /** "1–3 Werktage" – Zulassung, Ummeldung, Halterwechsel, Wiederzulassung */
  zulassung: bearbeitungsdauer("ummeldung")!,
  /** "1–3 Werktagen" – für "innerhalb von …", "in …" */
  zulassungDativ: bearbeitungsdauer("ummeldung", "dativ")!,
  /** "1–2 Werktage" – Adressänderung */
  adressaenderung: bearbeitungsdauer("adressaenderung")!,
  /** "am selben Werktag" – Abmeldung */
  abmeldung: bearbeitungsdauer("abmeldung")!,
  /** Einschränkung, die zur Abmeldung-Zeitangabe gehört. */
  abmeldungBedingung: bearbeitung.abmeldung.einschraenkung ?? "",
  /** "3–10 Werktage" – Ersatzdokumente, behördenabhängig */
  ersatzDokumente: bearbeitungsdauer("ersatz-dokumente")!,
  /** "1–2 Werktage" – Kurzzeitkennzeichen */
  kurzzeitkennzeichen: bearbeitungsdauer("kurzzeitkennzeichen")!,
  /** "ca. 2 Minuten" – nur das Absenden der Anfrage */
  anfrage: `ca. ${betrieb.zeiten.kunde.anfrageMinuten.wert} Minuten`,
  /** "ca. 10 Minuten" – Auftrag erteilen inkl. Fotos, Sicherheitscodes und Unterschrift */
  auftrag: `ca. ${betrieb.zeiten.kunde.auftragMinuten.wert} Minuten`,
  /** Bezugspunkt aller Werktag-Angaben. */
  bezug: "ab vollständigen, lesbaren Unterlagen",
  /** Versand wird immer getrennt genannt; eine Laufzeit erst nach Freigabe. */
  versand:
    betrieb.zeiten.versand.status === "offen" || betrieb.zeiten.versand.werktage === null
      ? "zuzüglich Versand"
      : `zuzüglich Versand (${spanne(betrieb.zeiten.versand.werktage as unknown as Spanne)} Werktage)`,
} as const;

/** Übersichtszeile für Stadt- und Behördenseiten. */
export const DAUER_UEBERSICHT = `${ZEIT.zulassung} ${ZEIT.versand}, Abmeldung meist ${ZEIT.abmeldung}`;

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

/** Kurzform für Karten und Listen, z. B. "1–3 Werktage + Versand". */
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
