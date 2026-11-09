import Link from "next/link";
import { ArrowRight, Clock4, Info } from "lucide-react";
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
 * Große Preiskarten mit Direkteinstieg in den Bestellprozess.
 * Alle Beträge kommen aus config/preise.json.
 */
export default function ServicePriceGrid({ showExtras = true }: { showExtras?: boolean }) {
  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SLUGS.map((slug) => {
          const service = getService(slug);
          const price = leistungsPreis(slug);
          if (!service || !price) return null;
          return (
            <li key={slug}>
              <div className="flex h-full flex-col rounded-2xl border-2 border-ink-200 bg-white p-6 shadow-card transition-colors duration-200 hover:border-brand-400">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl font-bold text-ink-900">
                      {service.shortName ?? service.name}
                    </h3>
                    <p className="mt-1 text-sm text-ink-600">{subline[slug]}</p>
                  </div>
                </div>
                <p className="mt-5 font-display text-4xl font-bold tracking-tight text-brand-700">
                  {euro(price.preis)}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  inkl. MwSt.{price.enthaeltAmtlicheGebuehren ? " und amtlicher Gebühren" : ""}
                  {price.enthaeltVersand ? ", inkl. Versand" : ", komplett digital"}
                  {price.schilderMoeglich ? ` · Schilder optional ${P.kennzeichen}` : ""}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-sm text-ink-600">
                  <Clock4 className="h-4 w-4 text-brand-600" aria-hidden />
                  {service.duration}
                </p>
                <div className="mt-6 flex flex-1 flex-col justify-end gap-2">
                  <Link
                    href={`/auftrag/?leistung=${slug}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 font-display text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
                  >
                    Auftrag starten
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                  <Link
                    href={`/leistungen/${slug}/`}
                    className="text-center text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                  >
                    Ablauf &amp; Unterlagen
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {showExtras && (
        <div className="mt-6 grid gap-4 rounded-2xl border border-ink-200 bg-ink-50 p-5 text-sm text-ink-700 sm:grid-cols-2">
          <p>
            <strong className="font-display text-ink-900">Kennzeichenschilder: {P.kennzeichen}</strong> pro Paar,
            geprägt und mit Versand. Optional – bei Kennzeichenmitnahme oder eigenem Schildermacher entfällt der
            Betrag.
          </p>
          <p className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <strong className="font-display text-ink-900">Wunschkennzeichen: {P.wunschkennzeichen}</strong>{" "}
              zusätzlich. {wunschkennzeichenHinweis}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
