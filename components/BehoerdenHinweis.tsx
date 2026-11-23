import { site } from "@/lib/site";

/**
 * Einheitlicher Hinweis „privater Zulassungsdienst, keine Behörde“ im Hauptinhalt
 * (docs/seo/compliance-findings.md, B-03). Gestaltung wie auf den Behördenseiten.
 */
export default function BehoerdenHinweis({ className = "", hell = false }: {
  className?: string;
  /** Weißer Grund für Abschnitte, die selbst bg-canvas haben (z. B. /auftrag/). */
  hell?: boolean;
}) {
  return (
    <p className={`rounded-lg border border-line p-4 text-[0.9375rem] leading-relaxed text-ink-700 ${hell ? "bg-white" : "bg-canvas"} ${className}`}>
      <strong className="font-semibold text-navy">Hinweis: </strong>
      {site.name} ist ein privater Zulassungsdienst und keine Behörde. Über Ihren Antrag entscheidet die zuständige Zulassungsbehörde.
    </p>
  );
}
