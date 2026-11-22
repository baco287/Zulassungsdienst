"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import KennzeichenSchild from "@/components/kennzeichen/KennzeichenSchild";
import TrackedLink from "@/components/TrackedLink";
import { SEITE } from "@/lib/kennzeichen/inhalte";
import { track } from "@/lib/analytics";
import type { Kombination } from "@/lib/kennzeichen/typen";

/** Beispiele für das Schild – reine Anschauung, keine Aussage zur Verfügbarkeit. */
const BEISPIELE: Kombination[] = [
  { kuerzel: "H", buchstaben: "MM", ziffern: "24", zusatz: "" },
  { kuerzel: "DAN", buchstaben: "KE", ziffern: "1", zusatz: "" },
  { kuerzel: "M", buchstaben: "TK", ziffern: "1508", zusatz: "" },
  { kuerzel: "K", buchstaben: "LT", ziffern: "7", zusatz: "" },
  { kuerzel: "HAL", buchstaben: "LO", ziffern: "3", zusatz: "" },
];

/**
 * Der Kennzeichenassistent auf der Startseite: ein Kennzeichen, ein Feld, ein Knopf.
 * Der Ort wandert im Fragment (#ort=…) zur Assistentenseite – ohne eigene Adresse je
 * Ort und ohne die Bezirksdaten schon auf der Startseite zu laden.
 *
 * Anrede: Der Assistent duzt (Vorgabe für dieses Werkzeug), der Rest der Startseite siezt.
 */
export default function KennzeichenTeaser() {
  const router = useRouter();
  const id = useId();
  const [ort, setOrt] = useState("");
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % BEISPIELE.length), 3000);
    return () => clearInterval(t);
  }, []);

  const start = (e: FormEvent) => {
    e.preventDefault();
    track("cta_click", { position: "home_kennzeichen" });
    const o = ort.trim().slice(0, 60);
    router.push(o ? `${SEITE.pfad}#ort=${encodeURIComponent(o)}` : SEITE.pfad);
  };

  return (
    <section className="border-b border-line bg-white" aria-labelledby={`${id}-titel`}>
      <div className="container-page grid gap-x-14 gap-y-8 py-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:py-16">
        <div>
          <h2 id={`${id}-titel`} className="h-abschnitt text-navy">
            {SEITE.h1}
          </h2>
          <p className="mt-4 max-w-[36em] text-lg leading-relaxed text-ink-600">{SEITE.lead}</p>
          <form onSubmit={start} className="mt-6 flex max-w-[40rem] flex-col gap-3 sm:flex-row">
            <label htmlFor={`${id}-ort`} className="sr-only">
              Dein Wohnort oder Kennzeichenkürzel
            </label>
            <input
              id={`${id}-ort`}
              type="text"
              className="field flex-1 sm:min-w-[14rem]"
              placeholder="Dein Wohnort oder Kürzel"
              maxLength={60}
              autoComplete="off"
              value={ort}
              onChange={(e) => setOrt(e.target.value)}
            />
            <button type="submit" className="btn btn-primary shrink-0 whitespace-nowrap">
              {SEITE.cta}
            </button>
          </form>
          <p className="mt-3 max-w-[40em] text-[0.9375rem] leading-relaxed text-ink-600">
            Kostenlos und ohne Anmeldung. Initialen, Geburtstag, Glückszahl oder einfach „überrasch mich“ – du siehst
            jede Idee sofort als Kennzeichen.{" "}
            <TrackedLink href={SEITE.pfad} event="cta_click" props={{ position: "home_kennzeichen_link" }} className="link">
              So funktioniert der Assistent
            </TrackedLink>
          </p>
        </div>
        <div>
          <KennzeichenSchild {...BEISPIELE[i]} wechsel={String(i)} dekorativ />
          <p className="mt-2.5 text-[0.875rem] text-ink-600">Beispiel einer Idee – ob sie frei ist, zeigt erst die Prüfung bei der Behörde.</p>
        </div>
      </div>
    </section>
  );
}
