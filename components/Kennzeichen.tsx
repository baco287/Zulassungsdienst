import type { ReactNode } from "react";

/**
 * Rahmt einen Text als deutsches Kfz-Kennzeichen ein: schwarzer Rand,
 * weißes Feld und links das blaue EU-Feld mit Sternenkranz und „D“.
 *
 * Die Schrift ist bewusst nicht die amtliche FE-Schrift („fälschungserschwerend“) –
 * die ist lizenzpflichtig und würde als Webfont zusätzliche Ladezeit kosten.
 * Die Display-Schrift der Seite mit weiter Laufweite kommt der Anmutung nahe genug.
 */

/** Fünfzackiger Stern, zentriert auf dem Ursprung (Außenradius 10). */
const STAR =
  "M0,-10 L2.35,-3.24 L9.51,-3.09 L3.8,1.24 L5.88,8.09 L0,4 L-5.88,8.09 L-3.8,1.24 L-9.51,-3.09 L-2.35,-3.24 Z";

function EuSterne({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <g fill="#FFCC00">
        {Array.from({ length: 12 }, (_, i) => {
          const winkel = (i * 30 * Math.PI) / 180;
          const x = 12 + 8 * Math.sin(winkel);
          const y = 12 - 8 * Math.cos(winkel);
          return (
            <path key={i} d={STAR} transform={`translate(${x} ${y}) scale(0.155)`} />
          );
        })}
      </g>
    </svg>
  );
}

interface Props {
  children: ReactNode;
  /** Kompakte Variante für enge Tabellen und Listen. */
  size?: "sm" | "md";
  /**
   * true = Schild füllt die Breite des Elternelements und zentriert den Text –
   * für Listen/Tabellen, in denen alle Schilder gleich lang sein sollen.
   * Die Breite gibt das Elternelement vor (z. B. w-60 am umschließenden Link).
   */
  uniform?: boolean;
  className?: string;
}

export default function Kennzeichen({
  children,
  size = "md",
  uniform = false,
  className = "",
}: Props) {
  const kompakt = size === "sm";

  return (
    <span
      className={`inline-flex items-stretch overflow-hidden rounded-[6px] border-[2.5px] border-ink-900 bg-white align-middle shadow-[0_1px_2px_rgba(0,0,0,0.12)] ${
        uniform ? "w-full" : ""
      } ${className}`}
    >
      {/* EU-Feld – rein dekorativ, der Leistungsname steht als echter Text daneben */}
      <span
        className={`flex shrink-0 flex-col items-center justify-center gap-[1px] bg-[#003399] ${
          kompakt ? "w-[15px] py-[3px]" : "w-[18px] py-1"
        }`}
        aria-hidden
      >
        <EuSterne className={kompakt ? "h-[9px] w-[9px]" : "h-[11px] w-[11px]"} />
        <span
          className={`font-display font-bold leading-none text-white ${
            kompakt ? "text-[7px]" : "text-[8px]"
          }`}
        >
          D
        </span>
      </span>

      <span
        className={`font-display font-bold tracking-[0.06em] text-ink-900 ${
          uniform ? "flex-1 text-center" : ""
        } ${kompakt ? "px-2 py-1 text-[13px]" : "px-2.5 py-1.5 text-[15px]"}`}
      >
        {children}
      </span>
    </span>
  );
}
