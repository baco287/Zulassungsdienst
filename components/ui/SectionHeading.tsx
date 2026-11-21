import type { ReactNode } from "react";

/**
 * Einheitlicher Abschnittskopf: Überschrift und optionaler Einleitungstext.
 * Bewusst ohne Mini-Label darüber. `as` steuert die Ebene, damit die
 * Überschriften-Hierarchie je Seite stimmt.
 */
export default function SectionHeading({
  id,
  title,
  children,
  onDark = false,
  as: Tag = "h2",
  className = "",
}: {
  id?: string;
  title: ReactNode;
  children?: ReactNode;
  onDark?: boolean;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={`max-w-[46rem] ${className}`}>
      <Tag id={id} className={`h-abschnitt ${onDark ? "text-white" : "text-navy"}`}>
        {title}
      </Tag>
      {children && (
        <p className={`mt-4 text-lg leading-relaxed ${onDark ? "text-white/85" : "text-ink-600"}`}>{children}</p>
      )}
    </div>
  );
}
