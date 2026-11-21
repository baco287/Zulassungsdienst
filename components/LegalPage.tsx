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
    <>
      <header className="seitenkopf">
        <div className="container-page">
          <h1 className="max-w-3xl hyphens-auto break-words h-seite text-navy">
            {title}
          </h1>
        </div>
      </header>
      <section className="py-10 sm:py-14">
        <div className="container-page *:max-w-3xl">
          {placeholder && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-lg border border-hinweis-300 bg-hinweis-50 p-4 text-sm text-hinweis-900"
            >
              <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>
                <strong>Platzhalter-Entwurf:</strong> Diese Seite enthält
                markierte [TODO]-Felder und muss vor Veröffentlichung mit den
                echten Unternehmensdaten befüllt und juristisch geprüft werden
                (z. B. durch Anwalt oder Generator eines Fachverlags).
              </p>
            </div>
          )}
          <div className="prose-sm space-y-6 [&:not(:first-child)]:mt-8 hyphens-auto break-words leading-relaxed text-ink-700 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink-900 [&_h3]:font-semibold [&_h3]:text-ink-900">
            {children}
          </div>
        </div>
      </section>
    </>
  );
}
