import type { Metadata } from "next";
import Link from "next/link";
import { BadgeEuro, Info } from "lucide-react";
import CTASection from "@/components/CTASection";
import Kennzeichen from "@/components/Kennzeichen";
import Reveal from "@/components/Reveal";
import { categoryLabels, sortedServices } from "@/lib/services";
import { euro, euroRange, officialFees, plateCosts, plateFee, priceDisclaimer } from "@/lib/pricing";
import type { ServiceCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Preise – transparent und ohne versteckte Kosten",
  description:
    "Preise inkl. MwSt., Gebühren und Versand: 129 € je Zulassung zzgl. Kennzeichen 28,90 €, Abmeldung 34,90 € – ohne versteckte Kosten.",
};

const order: ServiceCategory[] = ["zulassung", "kennzeichen", "dokumente", "service"];

export default function PreisePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">Preise</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            <strong>Transparent kalkuliert:</strong> Bei unseren Zulassungsleistungen sind
            amtliche Gebühren und versicherter Versand bereits enthalten. Neue
            Kennzeichenschilder kommen, falls benötigt, mit 28,90 € pro Paar dazu –
            keine versteckten Kosten, keine Überraschungen.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
          {order.map((cat) => {
            const items = sortedServices.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <Reveal key={cat}>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  {categoryLabels[cat]}
                </h2>
                <div className="mt-5 overflow-x-auto rounded-2xl border border-ink-200 shadow-card">
                  <table className="w-full min-w-[40rem] border-collapse bg-white text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 bg-ink-50 text-left font-display text-xs uppercase tracking-wider text-ink-600">
                        <th scope="col" className="px-5 py-3.5 font-semibold">Leistung</th>
                        <th scope="col" className="px-5 py-3.5 text-right font-semibold">Preis</th>
                        <th scope="col" className="px-5 py-3.5 text-right font-semibold">Amtliche Gebühren</th>
                        <th scope="col" className="px-5 py-3.5 text-right font-semibold">Kennzeichen &amp; Versand</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((s) => (
                        <tr key={s.slug} className="border-b border-ink-100 last:border-0 hover:bg-brand-50/40">
                          <th scope="row" className="px-5 py-4 text-left font-medium text-ink-900">
                            <Link
                              href={`/leistungen/${s.slug}/`}
                              className="inline-block w-60 rounded-[6px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                            >
                              {/* Kurzname, wo vorhanden: ein Kennzeichen wirkt nur
                                  als solches, wenn es nicht zum Fließtext ausufert.
                                  uniform + feste Linkbreite: alle Schilder gleich lang. */}
                              <Kennzeichen uniform>{s.shortName ?? s.name}</Kennzeichen>
                            </Link>
                          </th>
                          <td className="px-5 py-4 text-right">
                            {s.price.serviceFee !== null ? (
                              <span className="font-display font-bold text-ink-900">
                                {s.price.inclusive ? euro(s.price.serviceFee) : `ab ${euro(s.price.serviceFee)}`}
                                {!s.price.verified && (
                                  <span className="ml-1.5 align-middle rounded bg-accent-400/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-600">
                                    unverbindlich
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-ink-500">auf Anfrage</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-ink-700">
                            {s.price.inclusive ? (
                              <span className="font-semibold text-brand-700">inklusive ✓</span>
                            ) : s.price.officialFeeRange ? (
                              euroRange(s.price.officialFeeRange)
                            ) : (
                              "–"
                            )}
                          </td>
                          <td className="px-5 py-4 text-right text-ink-700">
                            {s.price.platesExtra ? (
                              <span>
                                Schilder zzgl. {euro(plateFee)}
                                <span className="block text-xs text-ink-500">Versand inklusive</span>
                              </span>
                            ) : s.price.inclusive ? (
                              <span className="font-semibold text-brand-700">
                                {s.slug === "abmeldung" ? "entfällt (digital)" : "inklusive ✓"}
                              </span>
                            ) : s.price.plateCostRange ? (
                              euroRange(s.price.plateCostRange)
                            ) : (
                              "–"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            );
          })}

          {/* Gebühren-Erläuterung */}
          <Reveal>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                  <BadgeEuro className="h-5 w-5 text-brand-700" aria-hidden />
                  Amtliche Gebühren im Detail
                </h2>
                <dl className="mt-4 space-y-2.5 text-sm text-ink-700">
                  <div className="flex justify-between gap-4">
                    <dt>Online-Zulassungsvorgang (i-Kfz)</dt>
                    <dd className="font-medium">{euroRange(officialFees.onlineRegistration)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Vorgang am Behördenschalter</dt>
                    <dd className="font-medium">{euroRange(officialFees.counterRegistration)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Außerbetriebsetzung</dt>
                    <dd className="font-medium">{euroRange(officialFees.deregistration)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Wunschkennzeichen (amtlich)</dt>
                    <dd className="font-medium">{euroRange(officialFees.customPlate)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Kennzeichenschilder (Paar, Markt)</dt>
                    <dd className="font-medium">{euroRange(plateCosts)}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs text-ink-500">
                  Gebühren nach GebOSt; die genaue Höhe legt die jeweilige Zulassungsbehörde fest.
                  Wo immer möglich nutzen wir das günstigere Online-Verfahren.
                </p>
              </div>

              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                  <Info className="h-5 w-5 text-brand-700" aria-hidden />
                  Hinweis zu unseren Preisen
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">{priceDisclaimer}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">
                  <strong>Gewerbekunden:</strong> Autohäuser, Händler und Fuhrparks erhalten
                  individuelle Staffelpreise.{" "}
                  <Link href="/kontakt" className="font-semibold text-brand-700 underline underline-offset-2">
                    Angebot anfordern →
                  </Link>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
