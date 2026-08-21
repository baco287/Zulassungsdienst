"use client";

import { useState } from "react";
import { Calculator, Clock4 } from "lucide-react";
import { euro } from "@/lib/pricing";

/**
 * Ersparnis-Rechner: Was kostet der eigene Behördengang wirklich?
 *
 * Rechenannahmen (bewusst transparent ausgewiesen):
 *  - Amtliche Gebühr am Schalter: ~28 € (Mittelwert 26,30–30,00 €)
 *  - Kennzeichenpaar beim Prägedienst: ~27 € (Mittelwert 20–35 €)
 *  - Fahrtkosten: 0,30 €/km, Hin- und Rückweg
 *  - Eigene Zeit: Stunden × Stundensatz
 */

const OFFICIAL_FEE = 28;
const PLATES = 27;
const KM_RATE = 0.3;
const OUR_PRICE = 129;
/** Kennzeichenschilder (Paar) bei uns – für den fairen Vergleich mit einberechnet. */
const OUR_PLATES = 28.9;

export default function BehoerdengangRechner() {
  const [hours, setHours] = useState("3");
  const [rate, setRate] = useState("25");
  const [km, setKm] = useState("10");

  const hoursNum = parseFloat(hours.replace(",", "."));
  const rateNum = parseFloat(rate.replace(",", "."));
  const kmNum = parseFloat(km.replace(",", "."));
  const valid =
    Number.isFinite(hoursNum) && hoursNum >= 0 && hoursNum <= 24 &&
    Number.isFinite(rateNum) && rateNum >= 0 && rateNum <= 1000 &&
    Number.isFinite(kmNum) && kmNum >= 0 && kmNum <= 500;

  const timeCost = valid ? hoursNum * rateNum : 0;
  const travelCost = valid ? kmNum * 2 * KM_RATE : 0;
  const selfTotal = OFFICIAL_FEE + PLATES + timeCost + travelCost;
  const diff = selfTotal - (OUR_PRICE + OUR_PLATES);

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-ink-300 bg-white px-4 py-3 text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  const labelClass = "block font-display text-sm font-semibold text-ink-800";

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-3">
        <div>
          <label htmlFor="hours" className={labelClass}>
            Zeitaufwand (Stunden)
          </label>
          <input
            id="hours"
            type="number"
            inputMode="decimal"
            min={0}
            max={24}
            step={0.5}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-500">
            Termin buchen, Anfahrt, Wartezeit, Schalter
          </p>
        </div>
        <div>
          <label htmlFor="rate" className={labelClass}>
            Ihr Stundensatz (€)
          </label>
          <input
            id="rate"
            type="number"
            inputMode="decimal"
            min={0}
            max={1000}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-500">
            Was Ihre Zeit wert ist – z. B. Ihr Netto-Stundenlohn
          </p>
        </div>
        <div>
          <label htmlFor="km" className={labelClass}>
            Entfernung zur Behörde (km)
          </label>
          <input
            id="km"
            type="number"
            inputMode="decimal"
            min={0}
            max={500}
            value={km}
            onChange={(e) => setKm(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-ink-500">Einfache Strecke</p>
        </div>
      </div>

      {valid ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-ink-50 p-5">
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink-600">
              <Clock4 className="h-4 w-4 text-ink-500" aria-hidden />
              Behördengang selbst
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-ink-900">
              {euro(selfTotal)}
            </p>
            <dl className="mt-3 space-y-1 text-sm text-ink-600">
              <div className="flex justify-between gap-4">
                <dt>Amtliche Gebühren (ca.)</dt>
                <dd className="font-medium text-ink-800">{euro(OFFICIAL_FEE)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Kennzeichenpaar (ca.)</dt>
                <dd className="font-medium text-ink-800">{euro(PLATES)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Ihre Zeit ({hoursNum} Std.)</dt>
                <dd className="font-medium text-ink-800">{euro(timeCost)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Fahrtkosten ({kmNum * 2} km)</dt>
                <dd className="font-medium text-ink-800">{euro(travelCost)}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-xl bg-brand-50 p-5">
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-brand-700">
              <Calculator className="h-4 w-4" aria-hidden />
              Über DeutscheZulassung
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-brand-700">
              {euro(OUR_PRICE + OUR_PLATES)}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-700">
              {euro(OUR_PRICE)} inkl. Gebühren und Versand + {euro(OUR_PLATES)} für das
              neue Kennzeichenpaar – Ihr Zeitaufwand: ca. 10 Minuten für Fotos und
              digitale Vollmacht.
            </p>
            <p className="mt-3 font-display text-sm font-bold">
              {diff >= 0 ? (
                <span className="text-emerald-700">
                  Sie sparen rechnerisch {euro(diff)} – und einen halben Tag.
                </span>
              ) : (
                <span className="text-ink-700">
                  Der Behördengang wäre rechnerisch {euro(Math.abs(diff))} günstiger –
                  kostet Sie aber {hoursNum} Stunden Lebenszeit und die Terminsuche.
                </span>
              )}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-ink-600">Bitte gültige Werte eingeben.</p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        Transparente Annahmen: amtliche Schaltergebühr ca. 28 €, Kennzeichenpaar ca.
        27 €, Fahrtkosten 0,30 €/km (hin und zurück). Tatsächliche Gebühren variieren
        je nach Behörde und Vorgang.
      </p>
    </div>
  );
}
