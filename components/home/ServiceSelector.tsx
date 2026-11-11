"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { ArrowRight, ChevronRight, Clock3 } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import TrackView from "@/components/TrackView";
import IconTile from "@/components/ui/IconTile";
import { track } from "@/lib/analytics";
import { merkeLeistung } from "@/lib/auswahl";
import { dauerKurz } from "@/lib/betrieb";
import { getCatalogEntry, type CatalogEntry } from "@/lib/catalog";
import { vorgaenge, type VorgangSlug } from "@/lib/vorgaenge";
import { euro } from "@/lib/pricing";
import { serviceIcon } from "@/lib/serviceIcons";

/**
 * Interaktive Leistungsauswahl im Hero: links die sechs Vorgänge mit Preis,
 * rechts Beschreibung, Preisbestandteile und der Einstieg in den Auftrag.
 * Preise, Bestandteile und Dauer kommen aus dem Katalog (lib/catalog.ts).
 */
export interface ServiceSelectorTexte {
  title: string;
  text: string;
  cta: string;
}

export default function ServiceSelector({ texte }: { texte: ServiceSelectorTexte }) {
  const [selected, setSelected] = useState<VorgangSlug>("neuzulassung");
  const headingId = useId();

  const vorgang = vorgaenge.find((v) => v.slug === selected) ?? vorgaenge[0];
  const eintrag = getCatalogEntry(vorgang.slug);
  const dauer = dauerKurz(vorgang.slug);

  function choose(slug: VorgangSlug) {
    if (slug === selected) return;
    setSelected(slug);
    merkeLeistung(slug);
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
    e.currentTarget.querySelector<HTMLButtonElement>(`[data-slug="${next.slug}"]`)?.focus();
  }

  return (
    <div className="@container rounded-[20px] border border-line bg-white p-5 shadow-[var(--shadow-elevated)] sm:p-7">
      <h2 id={headingId} className="font-display text-xl font-extrabold text-navy sm:text-2xl">
        {texte.title}
      </h2>
      <p className="mt-1.5 text-[15px] text-ink-600">{texte.text}</p>

      <div className="mt-5 grid gap-5 @[36rem]:grid-cols-[1.1fr_1fr] @[36rem]:gap-6">
        {/* ── Auswahl ── */}
        <div role="radiogroup" aria-labelledby={headingId} onKeyDown={onKeyDown} className="grid gap-2.5">
          {vorgaenge.map((v) => {
            const active = v.slug === selected;
            const Icon = serviceIcon(v.slug);
            const preis = getCatalogEntry(v.slug)?.preis ?? null;
            return (
              <button
                key={v.slug}
                type="button"
                role="radio"
                aria-checked={active}
                data-slug={v.slug}
                tabIndex={active ? 0 : -1}
                onClick={() => choose(v.slug)}
                className={`flex min-h-[3.5rem] w-full cursor-pointer items-center gap-3 rounded-[14px] border px-3.5 py-2.5 text-left transition-colors duration-150 ${
                  active
                    ? "border-brand-600 bg-brand-50 shadow-[inset_0_0_0_1px_var(--color-brand-600)]"
                    : "border-line bg-white hover:border-brand-300 hover:bg-ink-50"
                }`}
              >
                <Icon
                  className={`h-[22px] w-[22px] shrink-0 ${active ? "text-brand-700" : "text-navy"}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 font-display text-[15px] font-bold text-navy">{v.label}</span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums text-navy">
                  {preis !== null ? euro(preis) : "auf Anfrage"}
                </span>
                <ChevronRight
                  className={`h-4 w-4 shrink-0 ${active ? "text-brand-700" : "text-ink-400"}`}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {/* ── Details zur gewählten Leistung ── */}
        <div className="flex flex-col rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)]">
          <p className="sr-only" aria-live="polite">
            {vorgang.label}: {eintrag?.preisText ?? "Preis auf Anfrage"}
          </p>
          <IconTile icon={serviceIcon(vorgang.slug)} size="lg" />
          <h3 className="mt-4 font-display text-xl font-extrabold text-navy">{vorgang.label}</h3>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{vorgang.description}</p>

          <TrackView
            event="price_box_view"
            props={{ position: "konfigurator" }}
            className="mt-5 border-t border-line pt-5"
          >
            <p className="font-display text-[2rem] font-extrabold leading-none tabular-nums text-navy">
              {eintrag?.preisText ?? "auf Anfrage"}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">
              {eintrag ? enthaltenText(eintrag) : "inkl. 19 % MwSt."}
              {eintrag?.kennzeichen.moeglich && eintrag.kennzeichen.preis !== null && (
                <span className="block">
                  Kennzeichenschilder optional zzgl. {euro(eintrag.kennzeichen.preis)}
                </span>
              )}
            </p>
            {dauer && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-600">
                <Clock3 className="h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                Bearbeitung: {dauer}
              </p>
            )}
          </TrackView>

          <div className="mt-auto pt-5">
            <TrackedLink
              href={`/auftrag/?leistung=${vorgang.slug}`}
              event="cta_click"
              props={{ position: "konfigurator", service: vorgang.slug }}
              className="btn btn-primary btn-lg btn-block"
            >
              {texte.cta}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </TrackedLink>
          </div>
        </div>
      </div>
    </div>
  );
}

/** „inkl. Serviceleistung, amtlicher Gebühren und Versand“ – nur was laut Konfiguration enthalten ist. */
function enthaltenText(e: CatalogEntry): string {
  const teile = ["Serviceleistung"];
  if (e.amtlicheGebuehren.enthalten) teile.push("amtlicher Gebühren");
  if (e.versand.enthalten) teile.push("Versand");
  const liste = teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile.at(-1)}` : teile[0];
  return `inkl. ${liste} · inkl. 19 % MwSt.`;
}
