"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Calculator } from "lucide-react";
import {
  BESTELLBARE_LEISTUNGEN,
  calculateOrderPrice,
  centsToEuro,
  leistungsPreis,
  P,
  type SchilderOption,
} from "@/lib/pricing";
import { getService } from "@/lib/services";
import { track } from "@/lib/analytics";

const labels: Record<string, string> = Object.fromEntries(
  BESTELLBARE_LEISTUNGEN.map((slug) => {
    const s = getService(slug);
    return [slug, s?.shortName ?? s?.name ?? slug];
  })
);

const schilderLabels: Record<SchilderOption, string> = {
  lieferung: `Neue Schilder von uns (${P.kennzeichen}, inkl. Versand)`,
  selbst: "Schilder selbst beim Schildermacher prägen lassen",
  behalten: "Bisheriges Kennzeichen behalten",
};

/**
 * Transparenter Preisrechner: zeigt Positionen und den Endpreis inkl. MwSt.
 * Den verbindlichen Endpreis bestätigt das Team vor dem Start.
 */
export default function PriceCalculator() {
  const [leistung, setLeistung] = useState<string>("neuzulassung");
  const [schilder, setSchilder] = useState<SchilderOption>("lieferung");
  const [wunsch, setWunsch] = useState(false);

  const cfg = leistungsPreis(leistung);
  const result = useMemo(
    () => calculateOrderPrice({ leistung, schilder, wunschkennzeichen: wunsch }, labels),
    [leistung, schilder, wunsch]
  );

  return (
    <div className="rounded-2xl border-2 border-brand-200 bg-white p-6 shadow-card sm:p-8">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
        <Calculator className="h-6 w-6 text-brand-700" aria-hidden />
        Endpreis berechnen
      </h2>
      <p className="mt-2 text-sm text-ink-600">
        Wählen Sie Vorgang und Extras – Sie sehen sofort, was Sie insgesamt zahlen.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <label className="block">
            <span className="font-display text-sm font-semibold text-ink-900">Vorgang</span>
            <select
              value={leistung}
              onChange={(e) => {
                setLeistung(e.target.value);
                track("service_selected", { service: e.target.value, position: "preisrechner" });
              }}
              className="mt-1.5 w-full cursor-pointer rounded-xl border border-ink-300 bg-white px-3.5 py-3 text-base text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
            >
              {BESTELLBARE_LEISTUNGEN.map((slug) => (
                <option key={slug} value={slug}>
                  {labels[slug]}
                </option>
              ))}
            </select>
          </label>

          {cfg?.schilderMoeglich && (
            <fieldset>
              <legend className="font-display text-sm font-semibold text-ink-900">Kennzeichenschilder</legend>
              <div className="mt-2 space-y-2">
                {(Object.keys(schilderLabels) as SchilderOption[]).map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3 text-sm text-ink-800 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                    <input
                      type="radio"
                      name="schilder"
                      value={opt}
                      checked={schilder === opt}
                      onChange={() => setSchilder(opt)}
                      className="mt-0.5 h-4 w-4 accent-brand-700"
                    />
                    {schilderLabels[opt]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {cfg?.wunschkennzeichenMoeglich && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 p-3 text-sm text-ink-800 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
              <input
                type="checkbox"
                checked={wunsch}
                onChange={(e) => setWunsch(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-700"
              />
              Wunschkennzeichen-Service ({P.wunschkennzeichen}, amtliche Gebühr enthalten)
            </label>
          )}
        </div>

        <div className="rounded-xl bg-ink-50 p-5" aria-live="polite">
          <p className="font-display text-sm font-semibold uppercase tracking-wider text-ink-500">Ihre Positionen</p>
          {result && (
            <>
              <ul className="mt-3 divide-y divide-ink-200 text-sm">
                {result.items.map((item) => (
                  <li key={item.key} className="flex justify-between gap-4 py-2.5 text-ink-800">
                    <span>{item.label}</span>
                    <span className="font-medium tabular-nums">{centsToEuro(item.cents)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-baseline justify-between border-t-2 border-ink-900 pt-3">
                <span className="font-display font-bold text-ink-900">Endpreis</span>
                <span className="font-display text-3xl font-bold text-brand-700 tabular-nums">
                  {centsToEuro(result.totalCents)}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">
                inkl. 19 % MwSt.
                {cfg?.enthaeltAmtlicheGebuehren ? " · amtliche Gebühren enthalten" : ""}
                {cfg?.enthaeltVersand ? " · Versand der Dokumente enthalten" : " · digital, kein Versand nötig"}
              </p>
              <Link
                href={`/auftrag/?leistung=${leistung}`}
                onClick={() => track("cta_click", { position: "preisrechner", service: leistung })}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
              >
                {labels[leistung]} beauftragen
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
