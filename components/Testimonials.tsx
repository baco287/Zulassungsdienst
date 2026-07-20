import { Quote } from "lucide-react";

/**
 * Kundenstimmen-Sektion.
 *
 * WICHTIG [TODO vor Livegang]: Die folgenden Einträge sind ILLUSTRATIVE
 * BEISPIELE (deutlich als „Beispiel“ gekennzeichnet) und müssen durch echte,
 * belegbare Kundenstimmen ersetzt werden, sobald vorhanden. Erst dann das
 * `example`-Flag entfernen. Erfundene Bewertungen ohne Kennzeichnung sind
 * wettbewerbsrechtlich unzulässig (§ 5 UWG).
 */
const testimonials = [
  {
    initial: "S",
    text: "Unterlagen abfotografiert, per WhatsApp geschickt – zwei Tage später lagen die Kennzeichen im Briefkasten. So stellt man sich das vor.",
    name: "Beispiel-Kundenstimme",
    role: "Privatkunde · Neuzulassung",
    example: true,
  },
  {
    initial: "A",
    text: "Für unser Autohaus zählt jede Stunde. Die Sammelabwicklung spart uns pro Woche einen halben Arbeitstag an Behördenwegen.",
    name: "Beispiel-Kundenstimme",
    role: "Autohaus · Gewerbekunde",
    example: true,
  },
  {
    initial: "M",
    text: "Abmeldung noch am selben Tag erledigt, Bestätigung direkt per E-Mail. Schneller geht es wirklich nicht.",
    name: "Beispiel-Kundenstimme",
    role: "Privatkunde · Abmeldung",
    example: true,
  },
] as const;

export default function Testimonials() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {testimonials.map((t) => (
        <figure
          key={t.role}
          className="relative flex flex-col rounded-2xl border border-ink-200 bg-white p-7 shadow-card"
        >
          {t.example && (
            <span className="absolute right-4 top-4 rounded-full bg-ink-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Beispiel
            </span>
          )}
          <Quote className="h-7 w-7 text-brand-200" aria-hidden />
          <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
            „{t.text}“
          </blockquote>
          <figcaption className="mt-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-display font-bold text-white">
              {t.initial}
            </span>
            <span>
              <span className="block font-display text-sm font-bold text-ink-900">{t.name}</span>
              <span className="block text-xs text-ink-500">{t.role}</span>
            </span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
