"use client";

import { useId, useState } from "react";
import { Plus } from "lucide-react";

interface AccordionItem {
  question: string;
  answer: string;
}

/**
 * Barrierefrei bedienbares Akkordeon: echte Schaltflächen mit aria-expanded,
 * Antwortbereich als benannte Region. Es ist immer höchstens ein Eintrag offen.
 */
export default function FaqAccordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        const panelId = `${baseId}-panel-${i}`;
        const buttonId = `${baseId}-button-${i}`;
        return (
          <div
            key={item.question}
            className={`rounded-2xl border bg-white transition-shadow duration-200 ${
              open ? "border-brand-300 shadow-[var(--shadow-card)]" : "border-line"
            }`}
          >
            <h3>
              <button
                id={buttonId}
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex min-h-[3.5rem] w-full cursor-pointer items-center justify-between gap-4 rounded-2xl px-5 py-4 text-left font-display text-base font-bold text-navy transition-colors duration-200 hover:text-brand-700 sm:px-6 sm:text-[1.0625rem]"
              >
                {item.question}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                    open ? "rotate-45 bg-brand-600 text-white" : "bg-brand-50 text-brand-700"
                  }`}
                  aria-hidden
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </span>
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              hidden={!open}
              className="px-5 pb-5 text-[15px] leading-relaxed text-ink-700 sm:px-6"
            >
              {item.answer}
            </div>
          </div>
        );
      })}
    </div>
  );
}
