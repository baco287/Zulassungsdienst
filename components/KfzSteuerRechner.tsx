"use client";

import { useState } from "react";
import { Calculator, Info } from "lucide-react";
import { euro } from "@/lib/pricing";

/**
 * Kfz-Steuer-Rechner für Pkw (§ 9 KraftStG).
 *
 * Hubraum-Anteil: 2,00 € (Otto/Hybrid) bzw. 9,50 € (Diesel) je angefangene
 * 100 ccm. CO2-Anteil je nach Erstzulassung:
 *  - EZ ab 01.01.2021: Freibetrag 95 g/km, danach Stufentarif 2,00–4,00 €/g
 *  - EZ 2014–2020: Freibetrag 95 g/km, pauschal 2,00 €/g
 *  - EZ 2012–2013: Freibetrag 110 g/km, pauschal 2,00 €/g
 *  - EZ 07/2009–2011: Freibetrag 120 g/km, pauschal 2,00 €/g
 * Jahressteuer wird auf volle Euro abgerundet.
 */

type Fuel = "benzin" | "diesel" | "elektro";
type Era = "ab2021" | "2014-2020" | "2012-2013" | "2009-2011";

const co2Bands: { upTo: number; rate: number }[] = [
  { upTo: 115, rate: 2.0 },
  { upTo: 135, rate: 2.2 },
  { upTo: 155, rate: 2.5 },
  { upTo: 175, rate: 2.8 },
  { upTo: 195, rate: 2.9 },
  { upTo: Infinity, rate: 4.0 },
];

function co2Tax(co2: number, era: Era): number {
  if (era === "ab2021") {
    let tax = 0;
    let last = 95;
    for (const band of co2Bands) {
      if (co2 <= last) break;
      const upper = Math.min(co2, band.upTo);
      tax += (upper - last) * band.rate;
      last = band.upTo;
    }
    return tax;
  }
  const threshold = era === "2014-2020" ? 95 : era === "2012-2013" ? 110 : 120;
  return Math.max(0, co2 - threshold) * 2.0;
}

export default function KfzSteuerRechner() {
  const [fuel, setFuel] = useState<Fuel>("benzin");
  const [ccm, setCcm] = useState("1498");
  const [co2, setCo2] = useState("120");
  const [era, setEra] = useState<Era>("ab2021");

  const ccmNum = parseInt(ccm, 10);
  const co2Num = parseInt(co2, 10);
  const valid =
    fuel === "elektro" ||
    (Number.isFinite(ccmNum) && ccmNum > 0 && ccmNum < 10000 &&
      Number.isFinite(co2Num) && co2Num >= 0 && co2Num < 600);

  let baseTax = 0;
  let co2Part = 0;
  if (valid && fuel !== "elektro") {
    const per100 = fuel === "diesel" ? 9.5 : 2.0;
    baseTax = Math.ceil(ccmNum / 100) * per100;
    co2Part = co2Tax(co2Num, era);
  }
  const total = Math.floor(baseTax + co2Part);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  const labelClass = "block font-display text-sm font-semibold text-ink-800";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className={labelClass}>Antriebsart</span>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Antriebsart">
            {(
              [
                ["benzin", "Benzin / Hybrid"],
                ["diesel", "Diesel"],
                ["elektro", "Elektro"],
              ] as [Fuel, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={fuel === value}
                onClick={() => setFuel(value)}
                className={`cursor-pointer rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors duration-200 ${
                  fuel === value
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-ink-300 bg-white text-ink-700 hover:border-brand-400 hover:bg-brand-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {fuel !== "elektro" && (
          <>
            <div>
              <label htmlFor="ccm" className={labelClass}>
                Hubraum (ccm)
              </label>
              <input
                id="ccm"
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                value={ccm}
                onChange={(e) => setCcm(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="co2" className={labelClass}>
                CO₂-Ausstoß (g/km, WLTP)
              </label>
              <input
                id="co2"
                type="number"
                inputMode="numeric"
                min={0}
                max={599}
                value={co2}
                onChange={(e) => setCo2(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-ink-500">
                Steht in der Zulassungsbescheinigung Teil I, Feld V.7
              </p>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="era" className={labelClass}>
                Erstzulassung
              </label>
              <select
                id="era"
                value={era}
                onChange={(e) => setEra(e.target.value as Era)}
                className={inputClass}
              >
                <option value="ab2021">ab 01.01.2021</option>
                <option value="2014-2020">2014 – 2020</option>
                <option value="2012-2013">2012 – 2013</option>
                <option value="2009-2011">Juli 2009 – 2011</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 rounded-xl bg-brand-50 p-5">
        {fuel === "elektro" ? (
          <p className="flex items-start gap-2 text-sm leading-relaxed text-ink-700">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
            Reine Elektrofahrzeuge mit Erstzulassung bis 31.12.2025 sind von der
            Kfz-Steuer befreit – längstens bis Ende 2030. Für spätere
            Erstzulassungen gilt eine ermäßigte, gewichtsbasierte Steuer; den
            aktuellen Stand prüfen wir gern für Ihr Fahrzeug.
          </p>
        ) : valid ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink-600">
                <Calculator className="h-4 w-4 text-brand-700" aria-hidden />
                Kfz-Steuer pro Jahr (ca.)
              </p>
              <p className="mt-1 font-display text-4xl font-bold text-brand-700">
                {euro(total)}
              </p>
            </div>
            <dl className="text-sm text-ink-600">
              <div className="flex justify-between gap-6">
                <dt>Hubraum-Anteil</dt>
                <dd className="font-medium text-ink-800">{euro(baseTax)}</dd>
              </div>
              <div className="flex justify-between gap-6">
                <dt>CO₂-Anteil</dt>
                <dd className="font-medium text-ink-800">{euro(co2Part)}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="text-sm text-ink-600">
            Bitte gültige Werte für Hubraum und CO₂-Ausstoß eingeben.
          </p>
        )}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Unverbindliche Berechnung für Pkw nach § 9 KraftStG (Stand 2026), ohne
        Sonderfälle wie Wohnmobile, Oldtimer- oder Saisonkennzeichen. Verbindlich
        ist allein der Bescheid des Hauptzollamts.
      </p>
    </div>
  );
}
