/**
 * Die sechs Hauptleistungen in einheitlicher Reihenfolge – für Kopfzeile,
 * Startseite und Auftragsassistent. Bewusst ein kleines eigenes Modul, damit
 * Client-Komponenten nicht die gesamten Startseitentexte mitladen.
 * Preise stehen in config/preise.json, Icons in lib/serviceIcons.ts.
 */
import { ZEIT } from "@/lib/betrieb";

export type VorgangSlug =
  | "neuzulassung"
  | "ummeldung"
  | "abmeldung"
  | "wiederzulassung"
  | "halterwechsel"
  | "adressaenderung";

export interface Vorgang {
  slug: VorgangSlug;
  label: string;
  /** Kurzbeschreibung in Auswahl, Leistungskarte und Auftragsassistent. */
  description: string;
}

export const vorgaenge: readonly Vorgang[] = [
  {
    slug: "neuzulassung",
    label: "Neuzulassung",
    description: "Erstmalige Zulassung eines Fahrzeugs auf Ihren Namen, zum Beispiel bei einem Neuwagen.",
  },
  {
    slug: "ummeldung",
    label: "Ummeldung",
    description: "Nach dem Umzug: Fahrzeug auf die neue Adresse ummelden, Kennzeichen auf Wunsch behalten.",
  },
  {
    slug: "abmeldung",
    label: "Abmeldung",
    description: `Fahrzeug außer Betrieb setzen – meist noch ${ZEIT.abmeldung}, ganz ohne Versand.`,
  },
  {
    slug: "wiederzulassung",
    label: "Wiederzulassung",
    description: "Ein abgemeldetes Fahrzeug wieder in Betrieb nehmen.",
  },
  {
    slug: "halterwechsel",
    label: "Halterwechsel",
    description: "Gebrauchtwagen gekauft? Wir schreiben das Fahrzeug auf Sie um.",
  },
  {
    slug: "adressaenderung",
    label: "Adressänderung",
    description: "Nur die Anschrift in den Fahrzeugpapieren aktualisieren.",
  },
] as const;

export const istHauptleistung = (slug: string): slug is VorgangSlug =>
  vorgaenge.some((v) => v.slug === slug);
