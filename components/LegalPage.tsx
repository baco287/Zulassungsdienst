import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Gemeinsames Layout für Rechtsseiten inkl. deutlich sichtbarem
 * Platzhalter-Hinweis, solange die Inhalte nicht juristisch geprüft sind.
 */
export default function LegalPage({
  title,
  children,
  placeholder = true,
}: {
  title: string;
  children: ReactNode;
  placeholder?: boolean;
}) {
  return (
    <section className="py-14 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h1 className="hyphens-auto break-words font-display text-[2rem] font-extrabold leading-tight text-navy sm:text-4xl">{title}</h1>
        {placeholder && (
          <div
            role="note"
            className="mt-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-ink-800"
          >
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <p>
              <strong>Platzhalter-Entwurf:</strong> Diese Seite enthält markierte
              [TODO]-Felder und muss vor Veröffentlichung mit den echten Unternehmensdaten
              befüllt und juristisch geprüft werden (z. B. durch Anwalt oder
              Generator eines Fachverlags).
            </p>
          </div>
        )}
        <div className="prose-sm mt-8 space-y-6 hyphens-auto break-words leading-relaxed text-ink-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:font-semibold [&_h3]:text-ink-900">
          {children}
        </div>
      </div>
    </section>
  );
}
