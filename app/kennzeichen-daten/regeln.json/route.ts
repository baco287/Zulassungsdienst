import regeln from "@/config/kennzeichen-regeln.json";
import anbindungen from "@/config/kennzeichen-anbindungen.json";
import { kuerzelLaender } from "@/lib/kennzeichen/bezirke";

/**
 * /kennzeichen-daten/regeln.json – das Regelwerk für den Server.
 *
 * Der Browser prüft mit lib/kennzeichen/regeln.ts, der Server
 * (public/api/kennzeichen-lib.php) mit derselben Logik in PHP. Damit beide dieselben
 * Regeln anwenden, liest PHP diese Datei – erzeugt aus config/kennzeichen-regeln.json
 * und den Kürzeln der geprüften Zulassungsstellen.
 */
export const dynamic = "force-static";

export function GET() {
  return Response.json({
    stand: regeln.stand,
    format: regeln.format,
    zusatz: regeln.zusatz,
    sperren: regeln.sperren,
    vorsicht: regeln.vorsicht,
    kuerzel: kuerzelLaender,
    anbieter: anbindungen.anbieter,
  });
}
