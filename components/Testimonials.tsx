import { ExternalLink, Quote, Star } from "lucide-react";
import { averageRating, reviews } from "@/lib/reviews";

/**
 * Zeigt ausschließlich echte Bewertungen aus lib/reviews.ts.
 * Ist die Liste leer, rendert die Komponente nichts – es gibt bewusst keine
 * Beispiel- oder Platzhalter-Stimmen.
 */
export default function Testimonials({ limit = 3 }: { limit?: number }) {
  if (reviews.length === 0) return null;
  const avg = averageRating();
  const items = [...reviews].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);

  return (
    <div>
      {avg && (
        <p className="mb-6 flex items-center justify-center gap-2 text-sm text-ink-600">
          <span className="flex" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < Math.round(avg.value) ? "fill-amber-400 text-amber-400" : "text-ink-300"}`}
              />
            ))}
          </span>
          <span>
            <strong className="text-ink-900">{avg.value.toLocaleString("de-DE")}</strong> von 5 aus{" "}
            {avg.count} {avg.count === 1 ? "Bewertung" : "Bewertungen"}
          </span>
        </p>
      )}
      <div className="grid gap-6 md:grid-cols-3">
        {items.map((r) => (
          <figure
            key={r.url + r.date}
            className="relative flex flex-col rounded-2xl border border-ink-200 bg-white p-7 shadow-card"
          >
            <Quote className="h-7 w-7 text-brand-200" aria-hidden />
            <p className="sr-only">{r.rating} von 5 Sternen</p>
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">„{r.text}“</blockquote>
            <figcaption className="mt-5 flex items-center justify-between gap-3 text-xs text-ink-500">
              <span>
                <span className="block font-display text-sm font-bold text-ink-900">{r.author}</span>
                {r.service ? `${r.service} · ` : ""}
                {new Date(r.date).toLocaleDateString("de-DE")}
              </span>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:text-brand-800"
              >
                {r.source} <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
