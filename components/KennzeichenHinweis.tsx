import { Clock3, Truck } from "lucide-react";
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
      className={`rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}
    >
      <p className="font-display text-lg font-extrabold text-navy">{KENNZEICHEN_HINWEIS.title}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl bg-accent-50 p-4">
          <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-accent-600" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <dt className="text-sm text-ink-600">Bearbeitung</dt>
            <dd className="font-display text-xl font-extrabold leading-tight text-navy">meist {ZEIT.zulassung}</dd>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-4">
          <Truck className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <dt className="text-sm text-ink-600">Neue Kennzeichenschilder per Post</dt>
            <dd className="font-display text-xl font-extrabold leading-tight text-navy">meist {ZEIT.kennzeichen}</dd>
          </div>
        </div>
      </dl>

      <p className="mt-4 text-[15px] leading-relaxed text-ink-600">
        {KENNZEICHEN_HINWEIS.fahren} {KENNZEICHEN_HINWEIS.eilig}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">{KENNZEICHEN_HINWEIS.bedingung}</p>
    </aside>
  );
}
