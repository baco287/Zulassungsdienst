import { Check, Minus, X } from "lucide-react";
import { euro, euroRange, officialFees, P, plateFee } from "@/lib/pricing";
import { vergleichHinweis, vergleichSpalten, type Bewertung, type VergleichsZeile } from "@/lib/homepage";

/**
 * Ehrlicher Dreier-Vergleich. Die Zeilen entstehen hier, weil Kosten aus
 * lib/pricing.ts stammen – alles andere ist statischer Text.
 */
const zeilen: VergleichsZeile[] = [
  {
    kriterium: "eID erforderlich",
    zulassungsstelle: { wert: "Nein – Ausweis vorzeigen", bewertung: "gut" },
    ikfz: { wert: "Ja – Online-Ausweis mit PIN, NFC-Smartphone oder Kartenleser", bewertung: "schlecht" },
    wir: { wert: "Nein – Vollmacht und Ausweisfoto genügen", bewertung: "gut" },
  },
  {
    kriterium: "Behördentermin",
    zulassungsstelle: { wert: "Meist erforderlich, oft mit Wartezeit", bewertung: "schlecht" },
    ikfz: { wert: "Nicht nötig", bewertung: "gut" },
    wir: { wert: "Nicht nötig", bewertung: "gut" },
  },
  {
    kriterium: "Persönliche Prüfung",
    zulassungsstelle: { wert: "Am Schalter – Fehler fallen erst dort auf", bewertung: "neutral" },
    ikfz: { wert: "Keine – Sie prüfen selbst", bewertung: "neutral" },
    wir: { wert: "Ja, durch unser Team vor der Einreichung", bewertung: "gut" },
  },
  {
    kriterium: "Unterstützung bei Rückfragen",
    zulassungsstelle: { wert: "Erneuter Behördengang", bewertung: "neutral" },
    ikfz: { wert: "Portal-Hilfe, keine persönliche Betreuung", bewertung: "neutral" },
    wir: { wert: "Feste Ansprechperson per WhatsApp, E-Mail oder Telefon", bewertung: "gut" },
  },
  {
    kriterium: "Kosten",
    zulassungsstelle: {
      wert: `Gebühr ${euroRange(officialFees.counterRegistration)} + Schilder + Anfahrt`,
      bewertung: "neutral",
    },
    ikfz: { wert: `Gebühr ${euroRange(officialFees.onlineRegistration)} + Schilder`, bewertung: "gut" },
    wir: { wert: `${P.zulassung} inkl. Gebühren, zzgl. Schilder ${euro(plateFee)}`, bewertung: "neutral" },
  },
  {
    kriterium: "Zeitaufwand",
    zulassungsstelle: { wert: "Termin, Anfahrt, Wartezeit – oft ein halber Tag", bewertung: "schlecht" },
    ikfz: { wert: "30–60 Minuten, wenn Technik und Daten passen", bewertung: "neutral" },
    wir: { wert: "Etwa 10 Minuten für Fotos und Vollmacht", bewertung: "gut" },
  },
];

function Mark({ bewertung }: { bewertung: Bewertung }) {
  const styles: Record<Bewertung, { cls: string; Icon: typeof Check; label: string }> = {
    gut: { cls: "bg-gold text-navy", Icon: Check, label: "Vorteil" },
    neutral: { cls: "bg-line text-muted", Icon: Minus, label: "Neutral" },
    schlecht: { cls: "bg-danger/15 text-danger", Icon: X, label: "Nachteil" },
  };
  const { cls, Icon, label } = styles[bewertung];
  return (
    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${cls}`}>
      <Icon className="h-3 w-3" strokeWidth={3} aria-hidden />
      <span className="sr-only">{label}:</span>
    </span>
  );
}

const spaltenKey = ["zulassungsstelle", "ikfz", "wir"] as const;

export default function ComparisonSection() {
  return (
    <section className="bg-offwhite py-16 sm:py-24" aria-labelledby="vergleich-title">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="max-w-2xl">
          <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-gold-600">Drei Wege zur Zulassung</p>
          <h2 id="vergleich-title" className="mt-3 font-display text-3xl font-bold text-navy sm:text-[2.6rem] sm:leading-tight">
            Was passt zu Ihnen?
          </h2>
        </div>

        {/* Desktop: Tabelle */}
        <div className="mt-10 hidden overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgb(11_31_58/0.04),0_16px_40px_-20px_rgb(11_31_58/0.2)] md:block">
          <table className="w-full border-collapse text-[15px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="w-[22%] px-6 py-5 text-left font-display text-sm font-semibold uppercase tracking-wider text-muted">
                  Kriterium
                </th>
                {vergleichSpalten.map((s, i) => (
                  <th
                    key={s}
                    scope="col"
                    className={`px-6 py-5 text-left font-display text-base font-bold ${
                      i === 2 ? "bg-navy text-white" : "text-navy"
                    }`}
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zeilen.map((z) => (
                <tr key={z.kriterium} className="border-b border-line last:border-0">
                  <th scope="row" className="px-6 py-4 text-left font-semibold text-navy">
                    {z.kriterium}
                  </th>
                  {spaltenKey.map((k, i) => (
                    <td key={k} className={`px-6 py-4 align-top ${i === 2 ? "bg-gold-50 font-medium text-navy" : "text-muted"}`}>
                      <span className="flex items-start gap-2.5">
                        <span className="mt-0.5">
                          <Mark bewertung={z[k].bewertung} />
                        </span>
                        {z[k].wert}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobil: eine Karte je Weg */}
        <div className="mt-8 grid gap-4 md:hidden">
          {vergleichSpalten.map((name, i) => {
            const k = spaltenKey[i];
            const wir = i === 2;
            return (
              <article
                key={name}
                className={`rounded-[20px] border bg-white p-5 ${wir ? "border-gold ring-1 ring-gold" : "border-line"}`}
              >
                <h3 className={`font-display text-lg font-bold ${wir ? "text-navy" : "text-navy"}`}>{name}</h3>
                <dl className="mt-4 space-y-3">
                  {zeilen.map((z) => (
                    <div key={z.kriterium} className="flex gap-2.5">
                      <span className="mt-0.5">
                        <Mark bewertung={z[k].bewertung} />
                      </span>
                      <div className="text-[15px]">
                        <dt className="font-semibold text-navy">{z.kriterium}</dt>
                        <dd className="text-muted">{z[k].wert}</dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </article>
            );
          })}
        </div>

        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">{vergleichHinweis}</p>
      </div>
    </section>
  );
}
