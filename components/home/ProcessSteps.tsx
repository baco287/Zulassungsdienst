import { Check } from "lucide-react";
import { prozessSchritte, vertrauenszeile } from "@/lib/homepage";

/** Kompakte Fortschrittsanzeige unter dem Konfigurator – Schritt 1 ist aktiv. */
export function ProcessSteps() {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-3 sm:flex sm:items-center sm:justify-center sm:gap-0" aria-label="Ablauf in vier Schritten">
      {prozessSchritte.map((label, i) => {
        const aktiv = i === 0;
        return (
          <li key={label} className="flex items-center sm:flex-1 sm:justify-center last:sm:flex-none">
            <span className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                  aktiv ? "bg-gold text-navy" : "border-2 border-line bg-white text-navy"
                }`}
              >
                {i + 1}
              </span>
              <span className={`font-display text-[15px] font-semibold ${aktiv ? "text-navy" : "text-muted"}`}>
                {label}
              </span>
            </span>
            {i < prozessSchritte.length - 1 && (
              <span className="mx-5 hidden h-px w-14 bg-line sm:block lg:w-20" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Genau eine dezente Vertrauenszeile. */
export function TrustLine() {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 text-[15px] font-medium text-navy">
      {vertrauenszeile.map((t) => (
        <li key={t} className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gold" aria-hidden>
            <Check className="h-3 w-3 text-navy" strokeWidth={3} />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}
