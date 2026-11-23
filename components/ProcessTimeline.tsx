import { processSteps } from "@/lib/processSteps";

/**
 * Der Zulassungsablauf („So funktioniert’s“) als nummerierte Liste mit Linien.
 * Früher eine animierte Zeitleiste mit Mini-Grafiken; jetzt ruhig und sofort
 * lesbar. Die Ziffern stehen zu Recht da: Es ist eine feste Reihenfolge.
 * Texte: lib/processSteps.ts.
 */
export default function ProcessTimeline() {
  return (
    <ol className="max-w-[60rem]">
      {processSteps.map((s, i) => (
        <li
          key={s.title}
          className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-t border-line py-6 last:border-b sm:grid-cols-[4.5rem_minmax(0,16rem)_minmax(0,1fr)] sm:gap-x-8"
        >
          <p className="font-display text-[1.75rem] font-bold leading-none tabular-nums text-brand-600 sm:text-[2.25rem]" aria-hidden>
            {i + 1}
          </p>
          <h2 className="text-[1.1875rem] font-semibold leading-snug text-navy">
            <span className="sr-only">Schritt {i + 1}: </span>
            {s.title}
          </h2>
          <p className="col-start-2 mt-2 max-w-[42em] text-[0.96875rem] leading-relaxed text-ink-600 sm:col-start-3 sm:mt-0">
            {s.text}
          </p>
        </li>
      ))}
    </ol>
  );
}
