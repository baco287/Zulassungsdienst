import { bezirke, BEZIRKE_STAND } from "@/lib/kennzeichen/bezirke";

/**
 * /kennzeichen-daten/bezirke.json – Zulassungsbezirke für die Suche im
 * Kennzeichenassistenten. Wird beim Build aus der Datenbank der Zulassungsstellen
 * erzeugt und als Datei exportiert; der Browser lädt sie erst, wenn jemand den
 * Assistenten benutzt.
 *
 * Verdichtetes Format (siehe lib/kennzeichen/daten.ts):
 *   bezirke: [slug, name, Index in laender, [[Kürzel, Name], …], [Orte …], Echtzeit 0|1]
 */
export const dynamic = "force-static";

export function GET() {
  const laender = [...new Set(bezirke.map((b) => b.bundesland))].sort((a, b) => a.localeCompare(b, "de"));
  return Response.json({
    stand: BEZIRKE_STAND,
    laender,
    bezirke: bezirke.map((b) => [
      b.slug,
      b.name,
      laender.indexOf(b.bundesland),
      b.kuerzel.map((k) => [k.code, k.name]),
      b.orte,
      b.echtzeit ? 1 : 0,
    ]),
  });
}
