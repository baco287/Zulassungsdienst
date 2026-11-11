import type { ReactNode } from "react";

/**
 * Einheitlicher Abschnittskopf: kleine Zeile, Überschrift, optionaler Einleitungstext.
 * `as` steuert die Ebene, damit die Überschriften-Hierarchie je Seite stimmt.
 */
export default function SectionHeading({
  id,
  eyebrow,
  title,
  children,
  align = "left",
  onDark = false,
  as: Tag = "h2",
}: {
  id?: string;
  eyebrow?: string;
  title: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  onDark?: boolean;
  as?: "h2" | "h3";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      {eyebrow && <p className={`eyebrow ${onDark ? "eyebrow-on-dark" : ""}`}>{eyebrow}</p>}
      <Tag
        id={id}
        className={`mt-3 font-display text-[1.75rem] font-extrabold leading-tight sm:text-4xl ${
          onDark ? "text-white" : "text-navy"
        }`}
      >
        {title}
      </Tag>
      {children && (
        <p className={`mt-4 text-lg leading-relaxed ${onDark ? "text-white/75" : "text-ink-600"}`}>{children}</p>
      )}
    </div>
  );
}
