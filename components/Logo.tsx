import { site } from "@/lib/site";

/**
 * Logo von KFZ-Zulassungsprofis („DZ-Kennzeichen“, Stand 20.11.2026).
 *
 * Bildmarke: ein Kennzeichen – dunkler Rahmen, blaues Feld mit „D“, zwei
 * Schraubenpunkte, „Z“ und ein blauer Haken für die erledigte Zulassung.
 * Nachgezeichnet als Vektor nach der Vorlage
 * /Volumes/Medien/Bilder-Grafiken/Logos/Deutsche-Zulassung/KFZ-Zulassungsprofis-Logos/
 * 2026-11-20_Deutsche-Zulassung_Logo-DZ-quer_*.png (Maße und Farben aus der Vorlage gemessen).
 * Wortmarke: der Name in Manrope ExtraBold, wie in der Vorlage.
 */

export const logoColors = {
  navy: "#04183f",
  blue: "#0058f8",
  dot: "#0b0f1a",
} as const;

/** Bildmarke allein (Kennzeichen „D · Z ✓“), Seitenverhältnis 808 : 306. */
export function LogoMark({ tone = "light", className }: { tone?: "light" | "dark"; className?: string }) {
  // Auf dunklem Grund bekommt das Schild einen hellen Rand, damit es sich abhebt.
  const rahmen = tone === "dark" ? "#ffffff" : logoColors.navy;
  return (
    <svg viewBox="0 0 808 306" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
      <rect width="808" height="306" rx="52" fill={rahmen} />
      <rect x="20" y="20" width="768" height="266" rx="34" fill="#ffffff" />
      {/* Blaues Feld: links gerundet wie das weiße Feld, als Pfad (keine clipPath-ID, die
          doppelt vorkäme, wenn das Logo mehrfach auf der Seite steht) */}
      <path d="M20 54a34 34 0 0 1 34-34h195v266H54a34 34 0 0 1-34-34V54Z" fill={logoColors.blue} />
      {/* D */}
      <path
        fillRule="evenodd"
        d="M67 58h72c45 0 70 34 70 96s-25 96-70 96H67V58Zm40 34v124h28c22 0 33-20 33-62s-11-62-33-62h-28Z"
        fill="#ffffff"
      />
      {/* Schraubenpunkte */}
      <circle cx="286" cy="153" r="17.5" fill={logoColors.dot} />
      <circle cx="752" cy="153" r="17.5" fill={logoColors.dot} />
      {/* Z */}
      <path d="M356 58h155v35L402 216h109v34H354v-35L463 92H356V58Z" fill={logoColors.navy} />
      {/* Haken */}
      <path d="M560 158l44 58 98-128" stroke={logoColors.blue} strokeWidth="31" strokeLinecap="round" strokeLinejoin="round" />
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
    <span translate="no" className={`inline-flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <LogoMark tone={tone} className="h-[1.375rem] w-auto shrink-0 min-[360px]:h-6 sm:h-7 min-[1180px]:h-[1.625rem] xl:h-7" />
      <span
        className={`whitespace-nowrap font-wordmark text-[0.875rem] font-extrabold leading-none tracking-[-0.025em] min-[360px]:text-[1rem] min-[400px]:text-[1.125rem] min-[1180px]:text-[0.9375rem] xl:text-[1.25rem] ${
          tone === "dark" ? "text-white" : "text-[#04183f]"
        }`}
      >
        {site.name}
      </span>
    </span>
  );
}
