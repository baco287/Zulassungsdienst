import Link from "next/link";
import { ArrowRight } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import IconTile from "@/components/ui/IconTile";
import SectionHeading from "@/components/ui/SectionHeading";
import { dauerKurz } from "@/lib/betrieb";
import { getCatalogEntry } from "@/lib/catalog";
import { leistungen, vorgaenge } from "@/lib/homepage";
import { euro } from "@/lib/pricing";
import { serviceIcon } from "@/lib/serviceIcons";

/** Sechs Leistungskarten: Icon, Titel, Kurztext, Preis und zwei klare Wege (Details, Auftrag). */
export default function ServiceCards() {
  return (
    <section id="leistungen" className="bg-canvas py-16 sm:py-24" aria-labelledby="leistungen-title">
      <div className="container-page">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading id="leistungen-title" eyebrow={leistungen.eyebrow} title={leistungen.title}>
            {leistungen.lead}
          </SectionHeading>
          <Link
            href={leistungen.alle.href}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 font-display font-bold text-brand-700 hover:text-brand-800"
          >
            {leistungen.alle.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vorgaenge.map((v) => {
            const e = getCatalogEntry(v.slug);
            if (!e) return null;
            const dauer = dauerKurz(v.slug);
            return (
              <li key={v.slug} className="card card-interactive flex flex-col p-6">
                <div className="flex items-start justify-between gap-4">
                  <IconTile icon={serviceIcon(v.slug)} />
                  <p className="text-right">
                    <span className="block font-display text-2xl font-extrabold leading-none tabular-nums text-navy">
                      {e.preisText}
                    </span>
                    <span className="mt-1 block text-xs text-ink-500">
                      {e.amtlicheGebuehren.enthalten ? "inkl. amtlicher Gebühren" : "inkl. MwSt."}
                    </span>
                  </p>
                </div>

                <h3 className="mt-5 font-display text-xl font-extrabold text-navy">
                  <Link href={e.detailHref} className="hover:text-brand-700">
                    {v.label}
                  </Link>
                </h3>
                <p className="mt-2 flex-1 leading-relaxed text-ink-600">{e.kurz}</p>

                <p className="mt-4 text-sm text-ink-500">
                  {dauer ? `Bearbeitung: ${dauer}` : "Dauer nach Rücksprache"}
                  {e.kennzeichen.moeglich && e.kennzeichen.preis !== null
                    ? ` · Schilder optional ${euro(e.kennzeichen.preis)}`
                    : ""}
                </p>

                <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
                  <TrackedLink
                    href={e.ctaHref}
                    event="cta_click"
                    props={{ position: "leistungskarte", service: v.slug }}
                    className="btn btn-primary btn-sm flex-1"
                    aria-label={`${v.label} ${leistungen.cta.toLowerCase()}`}
                  >
                    {leistungen.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </TrackedLink>
                  <Link
                    href={e.detailHref}
                    className="btn btn-ghost btn-sm"
                    aria-label={`Details zur ${v.label}`}
                  >
                    Details
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
