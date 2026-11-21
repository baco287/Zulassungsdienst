import type { ReactNode } from "react";

/**
 * Früher blendete dieser Baustein jeden Abschnitt beim Scrollen ein. Das neue
 * Design verzichtet darauf: Inhalte stehen sofort da. Der Baustein bleibt als
 * schlichte Hülle, damit die vielen Aufrufstellen unverändert funktionieren.
 */
export default function Reveal({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Wird nicht mehr ausgewertet (früher Verzögerung der Einblendung). */
  delay?: number;
  className?: string;
  /** Element-Typ, z. B. "li" innerhalb einer Liste. */
  as?: "div" | "li" | "section";
}) {
  return <Tag className={className}>{children}</Tag>;
}
