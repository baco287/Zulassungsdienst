/**
 * Verfügbarkeit eines Wunschkennzeichens – getrennt von den Vorschlägen.
 *
 * Stand heute ist für keinen Bezirk eine Echtzeitprüfung angebunden
 * (config/kennzeichen-anbindungen.json). Der Assistent zeigt deshalb
 * „Prüfung erforderlich“ und nennt die zwei ehrlichen Wege: das Portal der
 * Zulassungsbehörde oder unser Wunschkennzeichen-Service.
 *
 * Kommt eine Anbindung dazu, fragt `pruefeVerfuegbarkeit` den Server
 * (public/api/kennzeichen-verfuegbarkeit.php). „Verfügbar“, „Nicht verfügbar“ und
 * „Reserviert“ entstehen ausschließlich hier – und nur, wenn die Antwort Quelle und
 * Zeitpunkt trägt. Alles andere bleibt „Prüfung erforderlich“.
 */
import type { Bezirk, Kombination, Status, Verfuegbarkeit } from "./typen";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ENDPOINT = `${basePath}/api/kennzeichen-verfuegbarkeit.php`;

const BESTAETIGT = new Set<Status>(["verfuegbar", "nicht_verfuegbar", "reserviert"]);

/** Nur vollständig belegte Antworten werden zu einem bestätigten Zustand. */
export function ausServerantwort(daten: unknown): Verfuegbarkeit {
  const d = (daten ?? {}) as { ok?: unknown; status?: unknown; quelle?: unknown; geprueftAm?: unknown };
  if (
    d.ok === true &&
    typeof d.status === "string" &&
    BESTAETIGT.has(d.status as Status) &&
    typeof d.quelle === "string" &&
    d.quelle.trim() !== "" &&
    typeof d.geprueftAm === "string" &&
    !Number.isNaN(Date.parse(d.geprueftAm))
  ) {
    return { status: d.status as Status, quelle: d.quelle, geprueftAm: d.geprueftAm };
  }
  return { status: "pruefung_erforderlich" };
}

export async function pruefeVerfuegbarkeit(bezirk: Bezirk, k: Kombination): Promise<Verfuegbarkeit> {
  if (!bezirk.echtzeit || process.env.NEXT_PUBLIC_STAGING === "1") return { status: "pruefung_erforderlich" };
  try {
    const antwort = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bezirk: bezirk.slug, kuerzel: k.kuerzel, buchstaben: k.buchstaben, ziffern: k.ziffern, zusatz: k.zusatz }),
      credentials: "omit",
    });
    return ausServerantwort(await antwort.json());
  } catch {
    return { status: "pruefung_erforderlich" };
  }
}

/** „geprüft am 22.11.2026 um 14:05 Uhr“ */
export function pruefzeit(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} um ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr`;
}
