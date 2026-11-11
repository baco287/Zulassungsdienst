import { Banknote, CreditCard } from "lucide-react";
import { activePaymentMethods } from "@/lib/payment";

/**
 * Zeigt, wie bezahlt wird.
 *
 * Solange keine Online-Zahlungsart eingerichtet und freigeschaltet ist
 * (lib/payment.ts), steht hier ausschließlich der tatsächliche Weg: Überweisung
 * nach der Festpreis-Bestätigung. Es werden keine Logos oder Methoden
 * angezeigt, die der Kunde nicht wirklich nutzen kann.
 */
export default function PaymentMethods() {
  const online = activePaymentMethods;

  return (
    <div className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-bold text-navy">
        {online.length > 0 ? (
          <CreditCard className="h-5 w-5 text-brand-700" aria-hidden />
        ) : (
          <Banknote className="h-5 w-5 text-brand-700" aria-hidden />
        )}
        Bezahlung
      </h3>

      {online.length > 0 ? (
        <>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
            Sie zahlen erst, nachdem Sie unsere Festpreis-Bestätigung erhalten haben – wahlweise per
            Überweisung oder online mit:
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {online.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-line bg-ink-50 px-3 py-1.5 text-sm font-semibold text-navy"
              >
                {m.label}
                {m.hint && <span className="font-normal text-ink-600"> · {m.hint}</span>}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-[15px] leading-relaxed text-ink-700">
          Sie zahlen erst, nachdem Sie unsere Festpreis-Bestätigung erhalten haben – bequem per
          Überweisung. Mit dem Absenden entstehen keine Kosten.
        </p>
      )}
    </div>
  );
}
