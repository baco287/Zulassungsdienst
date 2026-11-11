import { Check, Minus, X } from "lucide-react";
import { euroRange, officialFees, P } from "@/lib/pricing";

type Mark = "yes" | "no" | "neutral";

interface Row {
  label: string;
  schalter: [Mark, string];
  ikfz: [Mark, string];
  wir: [Mark, string];
}

const rows: Row[] = [
  {
    label: "Online-Ausweis (eID-PIN) nötig? (bei Zulassungen)",
    schalter: ["yes", "Nein"],
    ikfz: ["no", "Ja – Online-Ausweis mit PIN und NFC-Smartphone oder Kartenleser, alternativ BundID mit ELSTER-Zertifikat"],
    wir: ["yes", "Keine eID-PIN nötig – Identität einmalig digital bestätigen, Vollmacht digital signieren"],
  },
  {
    label: "Termin bei der Behörde",
    schalter: ["no", "Je nach Behörde meist erforderlich"],
    ikfz: ["yes", "Nicht nötig"],
    wir: ["yes", "Nicht nötig"],
  },
  {
    label: "Wer prüft die Unterlagen?",
    schalter: ["neutral", "Sie selbst, Fehler fallen erst am Schalter auf"],
    ikfz: ["neutral", "Sie selbst"],
    wir: ["yes", "Unser Team, persönlich vor der Einreichung"],
  },
  {
    label: "Bei Rückfragen oder Problemen",
    schalter: ["neutral", "Erneut zur Behörde"],
    ikfz: ["neutral", "Sie klären selbst mit Portal und Behörde"],
    wir: ["yes", "Ihre feste Ansprechperson"],
  },
  {
    label: "Kosten (Zulassung)",
    schalter: ["neutral", `Amtliche Gebühr ${euroRange(officialFees.counterRegistration)} plus Schilder und Anfahrt`],
    ikfz: ["yes", `Amtliche Gebühr ${euroRange(officialFees.onlineRegistration)} plus Schilder`],
    wir: ["neutral", `${P.zulassung} Festpreis inkl. amtlicher Gebühren und Versand, Schilder optional`],
  },
];

function Cell({ mark, text, highlight }: { mark: Mark; text: string; highlight?: boolean }) {
  const Icon = mark === "yes" ? Check : mark === "no" ? X : Minus;
  const color = mark === "yes" ? "text-emerald-600" : mark === "no" ? "text-red-600" : "text-ink-400";
  return (
    <td className={`px-4 py-3 align-top text-sm ${highlight ? "bg-brand-50/70 text-ink-900" : "text-ink-700"}`}>
      <span className="flex gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} aria-hidden />
        <span>{text}</span>
      </span>
    </td>
  );
}

/**
 * Ehrlicher Vergleich der drei Wege zur Zulassung. Benennt ausdrücklich,
 * wann i-Kfz selbst die günstigere Wahl ist.
 */
export default function ComparisonTable() {
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-ink-200 bg-white shadow-card">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <caption className="sr-only">
            Vergleich: Zulassungsstelle, i-Kfz selbst und DeutscheZulassung
          </caption>
          <thead>
            <tr className="border-b border-ink-200 font-display text-sm text-ink-900">
              <th scope="col" className="w-1/4 px-4 py-3 font-semibold">
                <span className="sr-only">Kriterium</span>
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">Zulassungsstelle</th>
              <th scope="col" className="px-4 py-3 font-semibold">i-Kfz selbst</th>
              <th scope="col" className="bg-brand-600 px-4 py-3 font-semibold text-white">DeutscheZulassung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="px-4 py-3 align-top text-sm font-semibold text-ink-900">
                  {r.label}
                </th>
                <Cell mark={r.schalter[0]} text={r.schalter[1]} />
                <Cell mark={r.ikfz[0]} text={r.ikfz[1]} />
                <Cell mark={r.wir[0]} text={r.wir[1]} highlight />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 rounded-xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-700">
        <strong className="font-display text-ink-900">Unser ehrlicher Tipp:</strong> Haben Sie einen Personalausweis
        mit aktivierter Online-Funktion samt PIN (oder eine BundID mit ELSTER-Zertifikat), Papiere mit Sicherheitscodes
        und einen unkomplizierten Fall, ist i-Kfz
        der günstigste Weg – Sie zahlen nur die amtliche Gebühr. Wir lohnen uns, wenn Ihnen eID oder Zeit fehlen,
        das Portal nicht weiterkommt oder Sie den Vorgang einfach abgeben möchten.
      </p>
    </div>
  );
}
