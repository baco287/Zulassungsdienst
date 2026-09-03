import type { Metadata } from "next";
import { Info } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import PrintButton from "@/components/PrintButton";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Vollmacht Kfz-Zulassung – Muster zum Ausdrucken",
  description:
    "Kostenlose Vollmacht für die Kfz-Zulassung als Muster zum Ausdrucken: für Zulassung, Umschreibung, Ummeldung und Abmeldung durch eine bevollmächtigte Person.",
  keywords: [
    "Vollmacht Kfz-Zulassung Muster",
    "Vollmacht Auto anmelden PDF",
    "Vollmacht Zulassungsstelle Vorlage",
    "Vollmacht Kfz abmelden",
  ],
};

/** Ausfüll-Linie für das Druckformular. */
function Line({ label, wide = false }: { label: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="h-7 border-b border-dotted border-ink-400" aria-hidden />
      <p className="mt-1 text-xs text-ink-500">{label}</p>
    </div>
  );
}

function Checkbox({ label }: { label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="h-4.5 w-4.5 shrink-0 border-2 border-ink-500" style={{ height: "1.1rem", width: "1.1rem" }} aria-hidden />
      {label}
    </li>
  );
}

export default function VollmachtPage() {
  return (
    <>
      <section className="no-print relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs
            items={[{ name: "Vorlagen", href: "/vorlagen/" }, { name: "Vollmacht Kfz-Zulassung" }]}
          />
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            Vollmacht für die Kfz-Zulassung
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Kostenloses Muster zum Ausdrucken und Ausfüllen – gültig für Zulassung,
            Umschreibung, Ummeldung und Außerbetriebsetzung durch eine bevollmächtigte
            Person. Beauftragen Sie uns, erhalten Sie die Vollmacht übrigens bequem
            digital – ganz ohne Drucker.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <PrintButton />
            <p className="flex items-center gap-2 text-sm text-ink-500">
              <Info className="h-4 w-4 text-brand-700" aria-hidden />
              Die meisten Behörden verlangen zusätzlich eine Ausweiskopie des Vollmachtgebers.
            </p>
          </div>
        </div>
      </section>

      <section className="py-10 print:py-0">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <article className="rounded-2xl border border-ink-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="text-center font-display text-2xl font-bold text-ink-900">
              Vollmacht zur Durchführung von Kfz-Zulassungsvorgängen
            </h2>

            <h3 className="mt-8 font-display text-sm font-bold uppercase tracking-wider text-ink-500">
              Vollmachtgeber/in (Fahrzeughalter/in)
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <Line label="Name, Vorname / Firma" wide />
              <Line label="Straße, Hausnummer" />
              <Line label="PLZ, Ort" />
              <Line label="Geburtsdatum" />
              <Line label="Ausweis-/Passnummer" />
            </div>

            <h3 className="mt-8 font-display text-sm font-bold uppercase tracking-wider text-ink-500">
              Bevollmächtigte/r
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <Line label="Name, Vorname / Firma" wide />
              <Line label="Straße, Hausnummer" />
              <Line label="PLZ, Ort" />
            </div>

            <h3 className="mt-8 font-display text-sm font-bold uppercase tracking-wider text-ink-500">
              Fahrzeug
            </h3>
            <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4">
              <Line label="Hersteller / Typ" />
              <Line label="Fahrzeug-Identifizierungsnummer (FIN)" />
              <Line label="Bisheriges Kennzeichen (falls vorhanden)" />
              <Line label="Gewünschtes Kennzeichen (optional)" />
            </div>

            <h3 className="mt-8 font-display text-sm font-bold uppercase tracking-wider text-ink-500">
              Umfang der Vollmacht (Zutreffendes ankreuzen)
            </h3>
            <ul className="mt-3 space-y-2.5 text-sm text-ink-800">
              <Checkbox label="Neuzulassung des Fahrzeugs" />
              <Checkbox label="Umschreibung / Halterwechsel" />
              <Checkbox label="Ummeldung / Änderung der Halterdaten (z. B. nach Umzug)" />
              <Checkbox label="Außerbetriebsetzung (Abmeldung)" />
              <Checkbox label="Reservierung und Zuteilung eines Wunschkennzeichens" />
              <Checkbox label="Entgegennahme von Kennzeichen, Plaketten und Zulassungsdokumenten" />
            </ul>

            <p className="mt-6 text-sm leading-relaxed text-ink-700">
              Die bevollmächtigte Person ist berechtigt, die oben angekreuzten
              Zulassungsvorgänge bei der zuständigen Zulassungsbehörde für mich/uns
              durchzuführen, erforderliche Erklärungen abzugeben und Dokumente
              entgegenzunehmen. Mir/uns ist bekannt, dass für die Erhebung der
              Kraftfahrzeugsteuer ein SEPA-Lastschriftmandat erforderlich ist und der
              Behörde vorgelegt wird. Der Bevollmächtigten/dem Bevollmächtigten wird
              gestattet, Auskünfte über etwaige Kraftfahrzeugsteuerrückstände
              einzuholen.
            </p>

            <div className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4">
              <Line label="Ort, Datum" />
              <Line label="Unterschrift Vollmachtgeber/in" />
            </div>

            <p className="mt-8 border-t border-ink-200 pt-4 text-xs text-ink-500">
              Kostenloses Muster von {site.name} ({site.url.replace("https://", "")}) –
              Verwendung gestattet, Angaben ohne Gewähr. Einzelne Behörden verwenden
              eigene Vollmachtsformulare; im Zweifel vorab bei der zuständigen
              Zulassungsstelle nachfragen.
            </p>
          </article>
        </div>
      </section>

      <div className="no-print">
        <CTASection />
      </div>
    </>
  );
}
