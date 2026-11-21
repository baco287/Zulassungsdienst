import { KENNZEICHEN_HINWEIS, ZEIT } from "@/lib/betrieb";

/**
 * Stellt Bearbeitungszeit und Postlaufzeit der Kennzeichenschilder nebeneinander.
 * Die Bearbeitung ist schnell, die Schilder brauchen Tage – wer das nicht sieht,
 * plant die erste Fahrt zu früh. Alle Werte kommen aus config/betrieb.json.
 */
export default function KennzeichenHinweis({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Dauer von Bearbeitung und Kennzeichenversand"
      className={`rounded-[var(--radius-card)] border border-line bg-canvas p-5 sm:p-7 ${className}`}
    >
      <div className="grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <p className="font-display text-[1.1875rem] font-semibold leading-snug text-navy">
            {KENNZEICHEN_HINWEIS.title}
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6">
            <div className="border-t-2 border-navy pt-2.5">
              <dt className="text-sm leading-snug text-ink-600">Bearbeitung</dt>
              <dd className="mt-0.5 font-display text-[1.1875rem] font-bold leading-tight text-navy sm:text-[1.3125rem]">
                meist {ZEIT.zulassung}
              </dd>
            </div>
            <div className="border-t-2 border-navy pt-2.5">
              <dt className="text-sm leading-snug text-ink-600">Neue Kennzeichenschilder per Post</dt>
              <dd className="mt-0.5 font-display text-[1.1875rem] font-bold leading-tight text-navy sm:text-[1.3125rem]">
                meist {ZEIT.kennzeichen}
              </dd>
            </div>
          </dl>
        </div>
        <div className="max-w-[44em]">
          <p className="text-[0.96875rem] leading-relaxed text-ink-700">
            {KENNZEICHEN_HINWEIS.fahren} {KENNZEICHEN_HINWEIS.eilig}
          </p>
          <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{KENNZEICHEN_HINWEIS.bedingung}</p>
        </div>
      </div>
    </aside>
  );
}
