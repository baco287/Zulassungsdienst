import Link from "next/link";
import Preistafel from "@/components/ui/Preistafel";
import SectionHeading from "@/components/ui/SectionHeading";
import { hero, preise } from "@/lib/homepage";
import { PRICE_DATE } from "@/lib/pricing";

const stand = new Date(`${PRICE_DATE}T12:00:00`).toLocaleDateString("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/**
 * Festpreise: die vollständige Preistafel mit allen sechs Leistungen (Kurztext,
 * Bearbeitungszeit, Preis, Start), darunter was enthalten, optional oder ein
 * Sonderfall ist. Im Kopf der Seite steht die schnelle Auswahl am Kennzeichen.
 */
export default function PricingSection() {
  return (
    <section id="preise" className="bg-white py-14 sm:py-20 lg:py-24" aria-labelledby="preise-title">
      <div className="container-page">
        <div className="flex flex-col gap-x-12 gap-y-6 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeading id="preise-title" title={preise.title}>
            {preise.lead}
          </SectionHeading>
          <Link href={preise.cta.href} className="btn btn-secondary shrink-0 self-start lg:self-end">
            {preise.cta.label}
          </Link>
        </div>

        <Preistafel title={hero.auswahl.title} cta={hero.auswahl.cta} position="preise" className="mt-9 lg:mt-11" />
        <p className="mt-4 max-w-[62em] text-[0.90625rem] leading-relaxed text-ink-600">
          {preise.fussnote} Stand der Preise: {stand}.
        </p>

        <dl className="mt-10 grid gap-x-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          {preise.hinweise.map(({ title, text }) => (
            <div key={title} className="border-t border-line py-4 sm:pb-6">
              <dt className="font-semibold leading-snug text-navy">{title}</dt>
              <dd className="mt-1.5 text-[0.96875rem] leading-relaxed text-ink-600">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
