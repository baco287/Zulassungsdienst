import { behoerden } from "@/lib/kennzeichen/bezirke";

/**
 * /kennzeichen-daten/behoerden.json – Behörde, offizielle Website und belegter
 * Hinweis zum Wunschkennzeichen je Bezirk. Wird erst geladen, wenn jemand die
 * Verfügbarkeit prüfen will.
 *
 * Format: { slug: [Behörde, Website | null, Hinweistext | null, Quelle | null] }
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(
    Object.fromEntries(
      Object.entries(behoerden).map(([slug, b]) => [
        slug,
        [b.name, b.website, b.wunschHinweis?.text ?? null, b.wunschHinweis?.quelle ?? null],
      ]),
    ),
  );
}
