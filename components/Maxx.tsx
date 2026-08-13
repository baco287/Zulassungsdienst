/**
 * „Maxx“ – das Maskottchen von DeutscheZulassung.
 *
 * Ein freundliches deutsches Kennzeichen mit Gesicht: sofort als Zulassungs-
 * thema erkennbar, funktioniert als winziger Chat-Avatar ebenso wie großflächig.
 * Reines SVG – keine Bilddatei, beliebig skalierbar, nutzt die Marken-Tokens
 * aus app/globals.css.
 *
 * Posen:
 *   "wave"  – winkt (Begrüßung, Hero-Bereiche)
 *   "phone" – hält ein Smartphone (Messenger-/Kontaktseiten)
 *   "plain" – nur Kopf, ohne Arme und Beine (Avatar, Icon, kleine Flächen)
 */

export type MaxxPose = "wave" | "phone" | "plain";

const viewBoxes: Record<MaxxPose, string> = {
  wave: "0 0 204 148",
  phone: "0 0 216 150",
  plain: "12 22 176 100",
};

export interface MaxxProps {
  pose?: MaxxPose;
  className?: string;
  /** Alternativtext. Ohne Angabe gilt die Figur als dekorativ (aria-hidden). */
  label?: string;
}

export default function Maxx({ pose = "wave", className, label }: MaxxProps) {
  const ink = "var(--color-ink-900)";
  const brand = "var(--color-brand-700)";

  return (
    <svg
      viewBox={viewBoxes[pose]}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {/* Beine */}
      {pose !== "plain" && (
        <g stroke={ink} strokeWidth={7} strokeLinecap="round">
          <path d="M78 112v20" />
          <path d="M126 112v20" />
        </g>
      )}
      {pose !== "plain" && (
        <g fill={ink}>
          <ellipse cx="73" cy="135" rx="10" ry="5" />
          <ellipse cx="131" cy="135" rx="10" ry="5" />
        </g>
      )}

      {/* Arme */}
      {pose === "wave" && (
        <>
          <path
            d="M24 80C16 86 10 90 7 95"
            stroke={ink}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx="6" cy="97" r="6.5" fill={ink} />
          <path
            d="M180 72C188 64 193 55 196 47"
            stroke={ink}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx="197" cy="44" r="7" fill={ink} />
        </>
      )}

      {pose === "phone" && (
        <>
          <path
            d="M24 80C16 86 10 90 7 95"
            stroke={ink}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx="6" cy="97" r="6.5" fill={ink} />
          {/* Smartphone */}
          <rect x="184" y="40" width="26" height="48" rx="6" fill={ink} />
          <rect
            x="187.5"
            y="44.5"
            width="19"
            height="39"
            rx="3"
            fill="var(--color-brand-100)"
          />
          <rect x="191" y="50" width="12" height="7" rx="3.5" fill={brand} />
          <rect x="191" y="61" width="9" height="6" rx="3" fill="var(--color-brand-300)" />
          {/* Arm greift das Telefon */}
          <path
            d="M180 78C186 80 190 82 194 84"
            stroke={ink}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <circle cx="196" cy="85" r="7" fill={ink} />
        </>
      )}

      {/* Kennzeichen-Körper */}
      <g>
        <rect
          x="20"
          y="30"
          width="160"
          height="84"
          rx="16"
          fill="#ffffff"
          stroke={ink}
          strokeWidth={6}
        />

        {/* EU-Feld */}
        <clipPath id="maxx-plate-clip">
          <rect x="20" y="30" width="160" height="84" rx="16" />
        </clipPath>
        <g clipPath="url(#maxx-plate-clip)">
          <rect x="20" y="30" width="32" height="84" fill={brand} />
        </g>
        {/* Sternenkranz */}
        <g fill="#ffffff">
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                key={i}
                cx={(36 + Math.cos(angle) * 9).toFixed(2)}
                cy={(54 + Math.sin(angle) * 9).toFixed(2)}
                r={1.7}
              />
            );
          })}
        </g>
        <text
          x="36"
          y="88"
          textAnchor="middle"
          fill="#ffffff"
          fontSize="19"
          fontWeight="700"
          fontFamily="var(--font-display), system-ui, sans-serif"
        >
          D
        </text>

        {/* Wangen */}
        <g fill="var(--color-brand-200)">
          <circle cx="74" cy="82" r="7" />
          <circle cx="159" cy="82" r="7" />
        </g>

        {/* Augen */}
        <g fill={ink}>
          <ellipse cx="96" cy="62" rx="8" ry="9.5" />
          <ellipse cx="138" cy="62" rx="8" ry="9.5" />
        </g>
        <g fill="#ffffff">
          <circle cx="93" cy="58" r="3" />
          <circle cx="135" cy="58" r="3" />
        </g>

        {/* Lächeln */}
        <path
          d="M100 82q17 14 34 0"
          stroke={ink}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
