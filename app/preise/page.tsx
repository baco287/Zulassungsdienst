import type { Metadata } from "next";
import Link from "next/link";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { categoryLabels, sortedServices } from "@/lib/services";
import { euro, euroRange, officialFees, P, plateCosts, plateFee, PRICE_DATE, priceDisclaimer, wunschkennzeichenHinweis } from "@/lib/pricing";
import PriceCalculator from "@/components/PriceCalculator";
import { ZEIT } from "@/lib/betrieb";
import type { ServiceCategory } from "@/lib/types";
import Breadcrumbs from "@/components/Breadcrumbs";
import BehoerdenHinweis from "@/components/BehoerdenHinweis";

export const metadata: Metadata = {
  title: "Preise für die Kfz-Zulassung online",
  description:
    `Preise inkl. MwSt., Gebühren und Versand: ${P.zulassung} je Zulassung, Abmeldung ${P.abmeldung}, Kennzeichen ${P.kennzeichen} – ohne versteckte Kosten.`,
};

const order: ServiceCategory[] = ["zulassung", "kennzeichen", "dokumente", "service"];

export default function PreisePage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "Preise" }]} />
          </div>
          <h1 className="h-seite text-navy">Preise</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            <strong>Transparent kalkuliert:</strong> Bei unseren Zulassungsleistungen sind
            amtliche Gebühren und versicherter Versand bereits enthalten. Neue
            Kennzeichenschilder kommen, falls benötigt, mit {P.kennzeichen} pro Paar dazu –
            keine versteckten Kosten, keine Überraschungen. Die Bearbeitung dauert meist{" "}
            {ZEIT.zulassung}; neue Kennzeichenschilder kommen per Post, in der Regel in{" "}
            {ZEIT.kennzeichenDativ}.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page space-y-12">
          <BehoerdenHinweis className="max-w-3xl" />
          <PriceCalculator />
          <p className="-mt-6 text-sm text-ink-500">
            Preisstand: {new Date(PRICE_DATE).toLocaleDateString("de-DE")}. Den verbindlichen Endpreis bestätigen wir
            Ihnen vor Beginn der Bearbeitung.
          </p>
          {order.map((cat) => {
            const items = sortedServices.filter((s) => s.category === cat);
            if (items.length === 0) return null;
            return (
              <Reveal key={cat}>
                <h2 className="text-2xl font-bold text-navy">
                  {categoryLabels[cat]}
                </h2>
                <div className="tafel tafel-breit mt-5">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] border-collapse bg-white text-[0.9375rem]">
                    <thead>
                      <tr className="border-b border-ink-200 bg-ink-50 text-left font-display text-sm text-ink-600">
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
                              className="-my-1.5 inline-block py-1.5 text-base font-semibold text-navy underline decoration-ink-300 decoration-1 underline-offset-4 hover:decoration-navy hover:decoration-2"
                            >
                              {s.shortName ?? s.name}
                            </Link>
                          </th>
                          <td className="px-5 py-4 text-right">
                            {s.price.serviceFee !== null ? (
                              <span className="font-display font-bold text-ink-900">
                                {s.slug === "wunschkennzeichen"
                                  ? `+ ${euro(s.price.serviceFee)}`
                                  : s.price.inclusive
                                    ? euro(s.price.serviceFee)
                                    : `ab ${euro(s.price.serviceFee)}`}
                                {!s.price.verified && (
                                  <span className="ml-1.5 align-middle rounded bg-accent-400/20 px-1.5 py-0.5 text-sm font-semibold text-accent-700">
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
                              <span className="font-semibold text-navy">inklusive</span>
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
                              <span className="font-semibold text-navy">
                                {s.slug === "abmeldung"
                                  ? "entfällt (digital)"
                                  : s.slug === "adressaenderung"
                                    ? "Versand inklusive, keine Schilder nötig"
                                    : "inklusive"}
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
                </div>
              </Reveal>
            );
          })}

          {/* Gebühren-Erläuterung */}
          <Reveal>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-ink-200 bg-white p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">
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
                    <dt>Abmeldung online (i-Kfz)</dt>
                    <dd className="font-medium">{euroRange(officialFees.deregistrationOnline)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt>Abmeldung am Schalter</dt>
                    <dd className="font-medium">{euroRange(officialFees.deregistrationCounter)}</dd>
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
                  Orientierungswerte aus veröffentlichten Angaben von Zulassungsbehörden; die genaue Höhe legt die
                  jeweilige Behörde nach der Gebührenordnung (GebOSt) fest.
                  Wo immer möglich nutzen wir das günstigere Online-Verfahren.
                </p>
              </div>

              <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6">
                <h2 className="font-display text-lg font-bold text-ink-900">
                  Hinweis zu unseren Preisen
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">{priceDisclaimer}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">
                  <strong>Wunschkennzeichen:</strong> {wunschkennzeichenHinweis}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">
                  <strong>Gewerbekunden:</strong> Autohäuser, Händler und Fuhrparks erhalten
                  individuelle Staffelpreise.{" "}
                  <Link href="/kontakt" className="font-semibold text-brand-700 underline underline-offset-2">
                    Angebot anfordern
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
