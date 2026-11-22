/**
 * Kleines Kennzeichen mit Haken: Zeichen für „erledigt“ über der Bestätigung nach dem Absenden.
 * EU-Band mit Sternenkreis und „D“, im weißen Feld der Haken, oben rechts drei grüne Striche.
 * Rein dekorativ; die Bedeutung steht in der Überschrift daneben.
 */
export default function SchildErledigt({ className = "h-auto w-[11.5rem]" }: { className?: string }) {
  const sterne = Array.from({ length: 12 }, (_, i) => {
    const w = (i * Math.PI) / 6;
    return { x: 15.5 + 5.4 * Math.cos(w), y: 26 + 5.4 * Math.sin(w) };
  });
  return (
    <svg viewBox="0 0 116 58" fill="none" className={className} aria-hidden focusable="false">
      <defs>
        <clipPath id="schild-erledigt-form">
          <rect x="2" y="16" width="96" height="40" rx="7" />
        </clipPath>
      </defs>
      <rect x="2" y="16" width="96" height="40" rx="7" fill="#fff" />
      <rect x="2" y="16" width="27" height="40" fill="#0058f8" clipPath="url(#schild-erledigt-form)" />
      {sterne.map((s, i) => (
        <circle key={i} cx={s.x.toFixed(2)} cy={s.y.toFixed(2)} r="0.85" fill="#ffcc00" />
      ))}
      <text
        x="15.5"
        y="50.5"
        textAnchor="middle"
        fill="#fff"
        fontSize="11"
        fontWeight="700"
        style={{ fontFamily: "var(--font-display)" }}
      >
        D
      </text>
      <rect x="2" y="16" width="96" height="40" rx="7" stroke="#04183f" strokeWidth="2.6" />
      <path d="M54 36.5l6 6 13-13" stroke="#04183f" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <g stroke="#25d366" strokeWidth="2.6" strokeLinecap="round">
        <path d="M97 2.5v5.5" />
        <path d="M102.5 11.5l6.5-6.5" />
        <path d="M106 17.5h7.5" />
      </g>
    </svg>
  );
}
