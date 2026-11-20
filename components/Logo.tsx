import { site } from "@/lib/site";

/**
 * Logo von KFZ-Zulassungsprofis.
 *
 * Bildmarke: ein abstrahiertes Kennzeichen – blaues Band links, im Feld ein
 * türkisfarbenes Häkchen für die erledigte Zulassung. Bewusst ohne
 * Nationalfarben und ohne Hoheitszeichen: Wir sind ein privater Dienst.
 * Wortmarke: der Name in Manrope ExtraBold (die Überschriftenschrift der Website).
 *
 * Reines SVG plus Text, daher in jeder Größe scharf. Die Dateien für
 * Suchmaschinen, Lesezeichen und Vorschaubilder erzeugt scripts/build-logo.sh
 * aus denselben Formen (public/logo.svg, public/logo.png, app/icon.svg …).
 */

export const logoColors = {
  navy: "#0b1f3a",
  blue: "#2563eb",
  teal: "#14b8a6",
  tealOnDark: "#2dd4bf",
} as const;

/** Bildmarke allein (Kennzeichen mit Häkchen), Seitenverhältnis 3:2. */
export function LogoMark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  const plate = tone === "dark" ? "#ffffff" : logoColors.navy;
  const check = tone === "dark" ? logoColors.teal : logoColors.tealOnDark;
  return (
    <svg viewBox="0 0 48 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="48" height="32" rx="8" fill={plate} />
      <path d="M0 8a8 8 0 0 1 8-8h5v32H8a8 8 0 0 1-8-8V8Z" fill={logoColors.blue} />
      <circle cx="6.5" cy="10" r="2.1" stroke="#ffffff" strokeWidth="1.4" />
      <path d="M21 16.5l5.6 5.6L38.5 10" stroke={check} strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Logo({
  tone = "light",
  className = "",
}: {
  /** "light" = auf hellem Grund, "dark" = auf Navy (Fußzeile). */
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <LogoMark tone={tone} className="h-6 w-auto shrink-0 min-[360px]:h-7 sm:h-8 lg:h-7 xl:h-8" />
      <span
        className={`whitespace-nowrap font-display text-[0.875rem] font-extrabold leading-none tracking-[-0.03em] min-[360px]:text-[1.0625rem] min-[400px]:text-[1.1875rem] lg:text-[0.9375rem] xl:text-[1.3125rem] ${
          tone === "dark" ? "text-white" : "text-navy"
        }`}
      >
        {site.name}
      </span>
    </span>
  );
}
