"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";

interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Barrierefrei bedienbares Akkordeon: echte Schaltflächen mit aria-expanded,
 * Antwortbereich als benannte Region. Es ist immer höchstens ein Eintrag offen.
 * Gestaltet als Liste mit Linien – ohne Kästen.
 */
export default function FaqAccordion({
  items,
  initialOpen = 0,
}: {
  items: AccordionItem[];
  /** Anfangs aufgeklappter Eintrag; null = alle zu. */
  initialOpen?: number | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(initialOpen);
  const baseId = useId();

  return (
    <div className="liste">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div key={item.question}>
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex min-h-[3.5rem] w-full cursor-pointer items-center justify-between gap-5 py-4 text-left font-display text-[1.0625rem] font-semibold leading-snug text-navy decoration-2 underline-offset-4 hover:underline"
              >
                {item.question}
                {open ? (
                  <Minus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                ) : (
                  <Plus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                )}
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="max-w-[46em] pb-5 pr-9 text-[0.96875rem] leading-relaxed text-ink-700"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
