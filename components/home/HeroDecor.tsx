import Kennzeichen from "@/components/Kennzeichen";
import { beispielKennzeichen } from "@/lib/homepage";

/**
 * Rein dekorative Elemente neben dem Konfigurator: links ein leicht gedrehtes
 * Beispielkennzeichen, rechts ein Dokumentenstapel mit Schutzschild.
 * CSS/SVG statt Bilder, nur ab lg sichtbar, nie über dem Konfigurator.
 */
export default function HeroDecor() {
  return (
    <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
      {/* Kennzeichen links */}
      <div className="absolute left-[-2%] top-[44%] -rotate-[9deg] scale-[1.9] drop-shadow-[0_18px_24px_rgb(11_31_58/0.18)] xl:left-[1%]">
        <Kennzeichen>{beispielKennzeichen}</Kennzeichen>
      </div>

      {/* Dokumentenstapel + Schild rechts */}
      <div className="absolute right-[1%] top-[36%] h-56 w-44 xl:right-[3%]">
        <div className="absolute left-6 top-0 h-40 w-32 rotate-[7deg] rounded-xl border border-line bg-white shadow-[0_14px_30px_-10px_rgb(11_31_58/0.25)]" />
        <div className="absolute left-0 top-5 h-40 w-32 -rotate-[4deg] rounded-xl border border-line bg-white p-4 shadow-[0_14px_30px_-10px_rgb(11_31_58/0.25)]">
          <div className="h-1.5 w-20 rounded bg-navy/15" />
          <div className="mt-2.5 h-1.5 w-16 rounded bg-navy/10" />
          <div className="mt-2.5 h-1.5 w-[4.5rem] rounded bg-navy/10" />
          <div className="mt-2.5 h-1.5 w-14 rounded bg-navy/10" />
          <div className="mt-2.5 h-1.5 w-[4.5rem] rounded bg-navy/10" />
        </div>
        <svg
          viewBox="0 0 64 72"
          className="absolute bottom-0 right-0 h-[4.5rem] w-16 drop-shadow-[0_10px_18px_rgb(11_31_58/0.3)]"
        >
          <path d="M32 2 60 12v22c0 17-12 29-28 36C16 63 4 51 4 34V12L32 2z" fill="#0b1f3a" />
          <path d="M22 36l7 7 14-15" fill="none" stroke="#f4b740" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
