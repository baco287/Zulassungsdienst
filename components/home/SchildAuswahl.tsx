"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import { track } from "@/lib/analytics";

export interface SchildOption {
  slug: string;
  label: string;
  /** Kurzer Preis für Auswahl und Schild (glatte Beträge ohne „,00“). */
  preis: string;
  /** Was im Festpreis enthalten ist, ein Satz. */
  enthalten: string;
  /** Bearbeitungszeit aus lib/betrieb.ts (dauerKurz). */
  dauer: string | null;
  /** Hinweis auf optionale Kennzeichenschilder (nur wo möglich). */
  zusatz: string | null;
  /** Einstieg in den Auftrag mit vorausgewählter Leistung. */
  href: string;
}

/**
 * Schriftgröße auf dem Schild nach Wortlänge: Die schmale Archivo braucht etwa
 * 0,5 em je Großbuchstabe; der Text darf rund 42 % der Schildbreite füllen, damit
 * zwischen Wort, Haken und Schraubenpunkten Luft bleibt. Höchstens 7,4 cqw.
 */
const schriftgroesse = (wort: string) => `${Math.min(7.4, 42 / (0.5 * wort.length)).toFixed(2)}cqw`;

/**
 * Das Erkennungsstück der Startseite: Das große Kennzeichen im Stil des Logos zeigt
 * die gewählte Leistung. Darunter die sechs Leistungen als Auswahl (Pfeiltasten wie
 * bei Optionsfeldern), Festpreis, Bearbeitungszeit und der direkte Start.
 *
 * Ohne JavaScript steht die erste Leistung fest da und der Start-Link funktioniert.
 * Das Schild selbst ist Dekoration (aria-hidden) – Name und Preis stehen als Text daneben.
 */
export default function SchildAuswahl({
  options,
  title,
  alle,
}: {
  options: SchildOption[];
  /** Name der Auswahl für Screenreader. */
  title: string;
  alle: { label: string; href: string };
}) {
  const [slug, setSlug] = useState(options[0].slug);
  const [gewechselt, setGewechselt] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((x) => x.slug === slug),
  );
  const o = options[index];

  const waehle = (i: number, fokus = false) => {
    const neu = options[i];
    if (!neu) return;
    if (neu.slug !== slug) {
      setSlug(neu.slug);
      setGewechselt(true);
      track("service_selected", { position: "hero_schild", service: neu.slug });
    }
    if (fokus) tabs.current[i]?.focus();
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const n = options.length;
    let ziel: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") ziel = (index + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") ziel = (index - 1 + n) % n;
    else if (e.key === "Home") ziel = 0;
    else if (e.key === "End") ziel = n - 1;
    if (ziel === null) return;
    e.preventDefault();
    waehle(ziel, true);
  };

  const animiert = gewechselt ? "schild-wechsel" : "";

  return (
    <div className="buehne">
      <div className="schild-huelle">
        <div className="schild" aria-hidden>
          <div className="schild-band">D</div>
          <div className="schild-feld">
            <span key={`t-${o.slug}`} className={`schild-text ${animiert}`} style={{ fontSize: schriftgroesse(o.label) }}>
              {o.label}
            </span>
            <svg key={`h-${o.slug}`} className={`schild-haken ${animiert}`} viewBox="0 0 160 140" fill="none">
              <path
                d="M18 78l44 46 82-104"
                stroke="#0058f8"
                strokeWidth="26"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="schild-tabs" role="radiogroup" aria-label={title}>
        {options.map((x, i) => {
          const an = x.slug === o.slug;
          return (
            <button
              key={x.slug}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={an}
              tabIndex={an ? 0 : -1}
              className="schild-tab"
              onClick={() => waehle(i)}
              onKeyDown={onKey}
            >
              {x.label}
              <span className="schild-tab-preis">{x.preis}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-x-6 gap-y-2 sm:mt-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center" aria-live="polite">
        <p className="font-display text-[2.375rem] font-bold leading-none tracking-[-0.02em] tabular-nums [font-variation-settings:'wdth'_108] sm:text-[2.875rem]">
          <span className="sr-only">{o.label}: Festpreis </span>
          {o.preis}
        </p>
        <p className="text-[0.9375rem] leading-snug text-ink-600">
          {o.enthalten}
          {o.dauer && (
            <>
              <br />
              Bearbeitung {o.dauer}.
            </>
          )}
        </p>
      </div>

      <TrackedLink
        href={o.href}
        event="cta_click"
        props={{ position: "hero_schild", service: o.slug }}
        className="btn btn-primary btn-lg btn-block mt-5 min-h-[3.625rem] text-[1.09375rem]"
      >
        {o.label} jetzt starten
      </TrackedLink>

      <div className="mt-3.5 flex flex-col gap-x-6 gap-y-1 text-[0.875rem] leading-snug text-ink-600 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="min-h-[1.2em]">{o.zusatz}</p>
        <Link href={alle.href} className="link inline-flex min-h-11 shrink-0 items-center self-start sm:min-h-0">
          {alle.label}
        </Link>
      </div>
    </div>
  );
}
