/**
 * Der Haken aus dem Logo – das einzige Bildzeichen der Seite neben dem Logo selbst.
 * Steht für „enthalten“ und „erledigt“. Rein dekorativ; die Bedeutung steht im Text.
 */
export default function Haken({
  tone = "light",
  className = "h-[0.8125rem] w-[1.0625rem]",
}: {
  /** "light" = auf heller Fläche (Logo-Blau), "dark" = auf Navy (helleres Blau). */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <svg viewBox="0 0 17 13" fill="none" className={`shrink-0 ${className}`} aria-hidden focusable="false">
      <path
        d="M1.5 6.8l4.6 4.6L15.5 1.6"
        stroke={tone === "dark" ? "#5591fb" : "#0058f8"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
