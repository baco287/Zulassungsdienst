import Link from "next/link";
import { getService } from "@/lib/services";
import { euro, leistungsPreis, P, wunschkennzeichenHinweis } from "@/lib/pricing";
import { ZEIT } from "@/lib/betrieb";

/** Reihenfolge der online bestellbaren Leistungen. */
const SLUGS = ["neuzulassung", "halterwechsel", "ummeldung", "wiederzulassung", "abmeldung", "adressaenderung"] as const;

const subline: Record<(typeof SLUGS)[number], string> = {
  neuzulassung: "Neuwagen oder Import erstmals zulassen",
  halterwechsel: "Gebrauchtwagen auf Sie umschreiben",
  ummeldung: "Umzug in einen anderen Zulassungsbezirk",
  wiederzulassung: "Abgemeldetes Fahrzeug wieder anmelden",
  abmeldung: `Außerbetriebsetzung, meist ${ZEIT.abmeldung}`,
  adressaenderung: "Neue Adresse im selben Zulassungsbezirk",
};

/**
 * Preistafel der Zulassungsstellen-Seiten mit Direkteinstieg in den Bestellprozess.
 * Alle Beträge kommen aus config/preise.json.
 */
export default function ServicePriceGrid({ showExtras = true }: { showExtras?: boolean }) {
  return (
    <div>
      {/* Gleiche Darstellung wie die Preistafel der Startseite (Klassen .pt-* in globals.css). */}
      <div className="tafel tafel-breit">
        <div className="pt-kopf" aria-hidden>
          <span>Leistung</span>
          <span>Das erledigen wir für Sie</span>
          <span className="pt-k-dauer">Bearbeitung</span>
          <span className="pt-k-preis">Festpreis</span>
          <span />
        </div>
        <ul>
          {SLUGS.map((slug) => {
            const service = getService(slug);
            const price = leistungsPreis(slug);
            if (!service || !price) return null;
            const name = service.shortName ?? service.name;
            return (
              <li key={slug} className="pt-zeile">
                <h3 className="pt-name">
                  <Link href={`/leistungen/${slug}/`}>{name}</Link>
                </h3>
                <p className="pt-text">
                  {subline[slug]}.{" "}
                  <span className="text-sm">
                    Inkl. MwSt.{price.enthaeltAmtlicheGebuehren ? " und amtlicher Gebühren" : ""}
                    {price.enthaeltVersand ? ", inkl. Versand" : ", komplett digital"}
                    {price.schilderMoeglich ? `, Schilder optional ${P.kennzeichen}` : ""}.
                  </span>
                </p>
                <p className="pt-dauer">
                  <span className="pt-dauer-label">Bearbeitung: </span>
                  {service.duration}
                </p>
                <p className="pt-preis">
                  <span className="sr-only">Festpreis: </span>
                  {euro(price.preis)}
                </p>
                <Link
                  href={`/auftrag/?leistung=${slug}`}
                  className="btn btn-secondary btn-sm pt-start"
                  aria-label={`Auftrag starten: ${name}`}
                >
                  Auftrag starten
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {showExtras && (
        <div className="mt-5 grid gap-x-10 gap-y-3 text-[0.9375rem] leading-relaxed text-ink-700 sm:grid-cols-2">
          <p>
            <strong className="text-navy">Kennzeichenschilder: {P.kennzeichen}</strong> pro Paar,
            geprägt und mit Versand. Optional – bei Kennzeichenmitnahme oder eigenem Schildermacher entfällt der
            Betrag.
          </p>
          <p>
            <strong className="text-navy">Wunschkennzeichen: {P.wunschkennzeichen}</strong> zusätzlich.{" "}
            {wunschkennzeichenHinweis}
          </p>
        </div>
      )}
    </div>
  );
}
