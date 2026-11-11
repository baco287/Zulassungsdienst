import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { getCatalogEntry } from "@/lib/catalog";
import { preise, vorgaenge } from "@/lib/homepage";
import { PRICE_DATE } from "@/lib/pricing";
import { serviceIcon } from "@/lib/serviceIcons";

const stand = new Date(`${PRICE_DATE}T12:00:00`).toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Preisübersicht der Startseite. Alle Beträge und Bestandteile kommen aus
 * config/preise.json – hier steht kein Preis als feste Zahl.
 */
export default function PricingSection() {
  return (
    <section id="preise" className="bg-canvas py-16 sm:py-24" aria-labelledby="preise-title">
      <div className="container-page">
        <SectionHeading id="preise-title" eyebrow={preise.eyebrow} title={preise.title}>
          {preise.lead}
        </SectionHeading>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start">
          {/* Preisliste */}
          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {vorgaenge.map((v) => {
                const e = getCatalogEntry(v.slug);
                if (!e) return null;
                const Icon = serviceIcon(v.slug);
                const enthalten = [
                  e.amtlicheGebuehren.enthalten ? "Amtliche Gebühren" : null,
                  e.versand.enthalten ? "Versand der Dokumente" : null,
                  "MwSt.",
                ].filter((x): x is string => x !== null);
                return (
                  <li key={v.slug} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 sm:px-6">
                    <Icon className="h-6 w-6 shrink-0 text-brand-700" strokeWidth={1.75} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={e.detailHref}
                        className="font-display text-base font-bold text-navy hover:text-brand-700"
                      >
                        {v.label}
                      </Link>
                      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink-600" aria-label="Im Preis enthalten">
                        {enthalten.map((x) => (
                          <li key={x} className="flex items-center gap-1">
                            <Check className="h-3.5 w-3.5 text-accent-600" strokeWidth={3} aria-hidden />
                            {x}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="font-display text-xl font-extrabold tabular-nums text-navy">{e.preisText}</p>
                  </li>
                );
              })}
            </ul>
            <p className="border-t border-line bg-ink-50 px-5 py-3 text-xs text-ink-500 sm:px-6">
              Alle Preise inkl. 19 % MwSt. · Stand {stand}
            </p>
          </div>

          {/* Was enthalten ist, was optional ist */}
          <ul className="grid gap-3">
            {preise.hinweise.map(({ icon: Icon, title, text }) => (
              <li key={title} className="card flex items-start gap-4 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600" aria-hidden>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div>
                  <h3 className="font-display text-base font-bold text-navy">{title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-600">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-sm leading-relaxed text-ink-500">{preise.fussnote}</p>
          <Link href={preise.cta.href} className="btn btn-secondary shrink-0">
            {preise.cta.label}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
