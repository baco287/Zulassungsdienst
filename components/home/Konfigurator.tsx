"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { ArrowRight, Check, CircleMinus, Timer } from "lucide-react";
import Kennzeichen from "@/components/Kennzeichen";
import TrackedLink from "@/components/TrackedLink";
import { track } from "@/lib/analytics";
import { getService } from "@/lib/services";
import { euro, plateFee } from "@/lib/pricing";
import { auftragsDauer, beispielKennzeichen, vorgaenge, type VorgangSlug } from "@/lib/homepage";

/**
 * Zulassungs-Konfigurator im Hero: links die Vorgangsauswahl, rechts die
 * Zusammenfassung mit Preis, Dauer und CTA. Preis, Bearbeitungsdauer und
 * Kennzeichen-Zuschlag kommen aus lib/services.ts bzw. lib/pricing.ts.
 */
export default function Konfigurator() {
  const [selected, setSelected] = useState<VorgangSlug>("neuzulassung");
  const headingId = useId();
  const summaryId = useId();

  const vorgang = vorgaenge.find((v) => v.slug === selected) ?? vorgaenge[0];
  const service = getService(vorgang.slug);
  const price = service?.price.serviceFee ?? null;
  const platesExtra = Boolean(service?.price.platesExtra);

  function choose(slug: VorgangSlug) {
    if (slug === selected) return;
    setSelected(slug);
    track("service_selected", { service: slug, position: "konfigurator" });
  }

  /** Pfeiltasten wechseln die Auswahl wie in einer Radiogruppe. */
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const delta = keys[e.key];
    if (!delta) return;
    e.preventDefault();
    const idx = vorgaenge.findIndex((v) => v.slug === selected);
    const next = vorgaenge[(idx + delta + vorgaenge.length) % vorgaenge.length];
    choose(next.slug);
    const el = e.currentTarget.querySelector<HTMLButtonElement>(`[data-slug="${next.slug}"]`);
    el?.focus();
  }

  return (
    <div className="rounded-[22px] border border-line bg-white p-5 shadow-[0_2px_4px_rgb(11_31_58/0.04),0_24px_48px_-20px_rgb(11_31_58/0.22)] sm:p-7 lg:grid lg:grid-cols-[1.45fr_1fr] lg:gap-0 lg:p-8">
      {/* ── Auswahl ── */}
      <div className="lg:border-r lg:border-line lg:pr-8">
        <h2 id={headingId} className="font-display text-2xl font-bold text-navy sm:text-[1.75rem]">
          Was möchten Sie erledigen?
        </h2>

        <div
          role="radiogroup"
          aria-labelledby={headingId}
          onKeyDown={onKeyDown}
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {vorgaenge.map((v) => {
            const active = v.slug === selected;
            const Icon = v.icon;
            return (
              <button
                key={v.slug}
                type="button"
                role="radio"
                aria-checked={active}
                data-slug={v.slug}
                tabIndex={active ? 0 : -1}
                onClick={() => choose(v.slug)}
                className={`relative flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-[18px] border-2 px-3 py-4 text-center transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${
                  active
                    ? "border-gold bg-gold-50"
                    : "border-line bg-white hover:border-navy/30 hover:bg-offwhite"
                }`}
              >
                {active && (
                  <span
                    className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-gold text-navy"
                    aria-hidden
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                )}

                {v.slug === "neuzulassung" ? (
                  <Kennzeichen size="sm">
                    <span className="whitespace-nowrap">{beispielKennzeichen}</span>
                  </Kennzeichen>
                ) : Icon ? (
                  <span className="relative text-navy" aria-hidden>
                    <Icon className="h-9 w-9" strokeWidth={1.6} />
                    {v.danger && (
                      <CircleMinus
                        className="absolute -bottom-1 -right-1.5 h-4 w-4 rounded-full bg-white text-danger"
                        strokeWidth={2.5}
                      />
                    )}
                  </span>
                ) : null}

                <span className="font-display text-[15px] font-bold leading-tight text-navy">{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Zusammenfassung ── */}
      <div
        id={summaryId}
        aria-live="polite"
        className="mt-6 border-t border-line pt-6 lg:mt-0 lg:border-t-0 lg:pl-8 lg:pt-0"
      >
        <Kennzeichen size="sm">
          <span className="whitespace-nowrap">{beispielKennzeichen}</span>
        </Kennzeichen>
        <h3 className="mt-3 font-display text-2xl font-bold text-navy">{vorgang.label}</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{vorgang.description}</p>

        <div className="mt-5 rounded-[18px] bg-gold-50 p-5">
          <p className="font-display text-[2.1rem] font-bold leading-none text-navy">
            {price !== null ? euro(price) : "auf Anfrage"}
          </p>
          <p className="mt-2 text-sm text-muted">
            inkl. amtlicher Gebühren &amp; Versand
            {platesExtra && (
              <span className="block">zzgl. Kennzeichenschilder {euro(plateFee)} (falls benötigt)</span>
            )}
          </p>
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-navy">
            <Timer className="mt-0.5 h-4 w-4 shrink-0 text-gold-600" aria-hidden />
            <span>
              {auftragsDauer}
              {service?.duration && (
                <span className="block font-normal text-muted">Bearbeitung: {service.duration}</span>
              )}
            </span>
          </p>
        </div>

        <TrackedLink
          href={`/auftrag/?leistung=${vorgang.slug}`}
          event="cta_click"
          props={{ position: "konfigurator", service: vorgang.slug }}
          className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-[14px] bg-navy px-6 font-display text-lg font-semibold text-white transition-colors duration-150 hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Jetzt starten
          <ArrowRight className="h-5 w-5 text-gold" aria-hidden />
        </TrackedLink>
      </div>
    </div>
  );
}
