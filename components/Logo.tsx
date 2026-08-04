/**
 * Markenlogo „DeutscheZulassung“ – Kennzeichen-Bildmarke + Wortmarke.
 * variant "light": dunkle Wortmarke (für helle Flächen, z. B. Header)
 * variant "dark":  weiße Wortmarke (für dunkle Flächen, z. B. Footer)
 */

function PlateMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 190 124"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Schild */}
      <rect x="3" y="3" width="184" height="118" rx="16" fill="#ffffff" stroke="#0f172a" strokeWidth="6" />
      {/* EU-Band */}
      <path d="M19 6 h24 v112 h-24 a13 13 0 0 1 -13 -13 v-86 a13 13 0 0 1 13 -13 z" fill="#2563eb" />
      {/* Sternenkreis */}
      <g fill="#facc15">
        <circle cx="31" cy="22" r="2.4" />
        <circle cx="24" cy="26" r="2.4" />
        <circle cx="38" cy="26" r="2.4" />
        <circle cx="21" cy="34" r="2.4" />
        <circle cx="41" cy="34" r="2.4" />
        <circle cx="24" cy="42" r="2.4" />
        <circle cx="38" cy="42" r="2.4" />
        <circle cx="31" cy="46" r="2.4" />
      </g>
      <text
        x="31"
        y="104"
        textAnchor="middle"
        fontFamily="var(--font-lexend), Arial, sans-serif"
        fontWeight="700"
        fontSize="28"
        fill="#ffffff"
      >
        D
      </text>
      {/* HU-Plakette (blaue Rosette) */}
      <g transform="translate(66,40)">
        <circle r="17" fill="#dbeafe" stroke="#2563eb" strokeWidth="3.5" />
        <g stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round">
          <line x1="0" y1="-11" x2="0" y2="-5" />
          <line x1="7.8" y1="-7.8" x2="3.5" y2="-3.5" />
          <line x1="11" y1="0" x2="5" y2="0" />
          <line x1="7.8" y1="7.8" x2="3.5" y2="3.5" />
          <line x1="0" y1="11" x2="0" y2="5" />
          <line x1="-7.8" y1="7.8" x2="-3.5" y2="3.5" />
          <line x1="-11" y1="0" x2="-5" y2="0" />
          <line x1="-7.8" y1="-7.8" x2="-3.5" y2="-3.5" />
        </g>
        <circle r="3" fill="#2563eb" />
      </g>
      {/* Zulassungssiegel (grau) */}
      <g transform="translate(66,88)">
        <circle r="14" fill="#e2e8f0" stroke="#64748b" strokeWidth="3" />
        <circle r="6" fill="#94a3b8" />
      </g>
      {/* Prägung */}
      <text
        x="134"
        y="92"
        textAnchor="middle"
        fontFamily="var(--font-lexend), Arial, sans-serif"
        fontWeight="700"
        fontSize="64"
        letterSpacing="-2"
        fill="#0f172a"
      >
        DZ
      </text>
    </svg>
  );
}

export default function Logo({
  variant = "light",
  markClassName = "h-9 w-auto",
  textClassName = "text-lg",
}: {
  variant?: "light" | "dark";
  markClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className="flex items-center gap-2.5">
      <PlateMark className={markClassName} />
      <span className={`font-display font-bold ${textClassName}`}>
        <span className={variant === "dark" ? "text-white" : "text-ink-900"}>Deutsche</span>
        <span className={variant === "dark" ? "text-brand-400" : "text-brand-600"}>Zulassung</span>
      </span>
    </span>
  );
}
