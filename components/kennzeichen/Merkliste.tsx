"use client";

import { useId } from "react";
import KennzeichenSchild from "./KennzeichenSchild";
import { schreibweise } from "@/lib/kennzeichen/regeln";
import { MERKLISTE_MAX, type Gemerkt } from "@/lib/kennzeichen/merkliste";

interface Props {
  liste: Gemerkt[];
  /** false, wenn der Browser das Speichern verweigert (Privatmodus). */
  gespeichert: boolean;
  onWaehlen: (g: Gemerkt) => void;
  onEntfernen: (g: Gemerkt) => void;
  onLeeren: () => void;
}

/**
 * Merkliste zum Vergleichen: alle gemerkten Kennzeichen in gleicher Größe nebeneinander.
 * Liegt nur im Browser des Kunden (lib/kennzeichen/merkliste.ts).
 */
export default function Merkliste({ liste, gespeichert, onWaehlen, onEntfernen, onLeeren }: Props) {
  const id = useId();
  if (liste.length === 0) return null;
  return (
    <section aria-labelledby={`${id}-titel`} className="mt-10 border-t border-line pt-7">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id={`${id}-titel`} className="font-display text-[1.375rem] font-bold text-navy">
          Deine Merkliste ({liste.length})
        </h2>
        <button type="button" className="link text-[0.9375rem]" onClick={onLeeren}>
          Merkliste leeren
        </button>
      </div>
      <p className="mt-1.5 max-w-[46em] text-[0.9375rem] leading-relaxed text-ink-600">
        Zum Vergleichen nebeneinander. {gespeichert ? "Gespeichert nur in diesem Browser" : "Dein Browser speichert gerade nichts – die Liste gilt bis zum Neuladen"}
        , höchstens {MERKLISTE_MAX} Kennzeichen. Gemerkt heißt nicht reserviert.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {liste.map((g) => (
          <li key={g.id} className="rounded-[var(--radius-card)] border border-line p-3">
            <KennzeichenSchild kuerzel={g.kuerzel} buchstaben={g.buchstaben} ziffern={g.ziffern} zusatz={g.zusatz} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
              <p className="text-sm text-ink-600">{g.bezirkName}</p>
              <div className="flex gap-x-4">
                <button type="button" className="link inline-flex min-h-11 items-center text-[0.9375rem]" onClick={() => onWaehlen(g)}>
                  Auswählen<span className="sr-only">: {schreibweise(g)}</span>
                </button>
                <button type="button" className="inline-flex min-h-11 items-center text-[0.9375rem] font-semibold text-ink-600 underline underline-offset-[0.25em] hover:text-danger" onClick={() => onEntfernen(g)}>
                  Entfernen<span className="sr-only">: {schreibweise(g)}</span>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
