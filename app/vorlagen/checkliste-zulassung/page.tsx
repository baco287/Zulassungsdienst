import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import PrintButton from "@/components/PrintButton";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Checkliste Kfz-Zulassung zum Ausdrucken",
  description:
    "Alle Unterlagen für die Kfz-Zulassung als kostenlose Checkliste zum Ausdrucken: Grundausstattung plus Sonderfälle für Gebrauchtwagen, Firmenwagen und EU-Importe.",
  keywords: [
    "Checkliste Kfz-Zulassung",
    "Auto anmelden Unterlagen Checkliste PDF",
    "Unterlagen Zulassung ausdrucken",
  ],
};

const sections: { title: string; items: string[] }[] = [
  {
    title: "Für jede Zulassung (Grundausstattung)",
    items: [
      "Personalausweis oder Reisepass (bei Reisepass zusätzlich Meldebescheinigung)",
      "eVB-Nummer der Kfz-Haftpflichtversicherung (7-stellig)",
      "SEPA-Lastschriftmandat für die Kfz-Steuer (Bankverbindung bereithalten)",
      "Zulassungsbescheinigung Teil II (Fahrzeugbrief) bzw. CoC-Papier beim Neuwagen",
    ],
  },
  {
    title: "Zusätzlich beim Gebrauchtwagen (Umschreibung)",
    items: [
      "Zulassungsbescheinigung Teil I (Fahrzeugschein)",
      "Nachweis der gültigen Hauptuntersuchung (HU)",
      "Kaufvertrag (empfohlen)",
      "Bisherige Kennzeichen, falls das Fahrzeug noch zugelassen ist",
    ],
  },
  {
    title: "Zusätzlich beim Firmenfahrzeug",
    items: [
      "Handelsregisterauszug oder Gewerbeanmeldung",
      "Vollmacht der Geschäftsführung, falls eine andere Person unterschreibt",
    ],
  },
  {
    title: "Zusätzlich beim Import",
    items: [
      "EU-Import: CoC-Papier (EG-Übereinstimmungsbescheinigung) und ausländische Fahrzeugdokumente",
      "Nicht-EU-Import: Vollgutachten nach § 21 StVZO und Zollunbedenklichkeitsbescheinigung",
    ],
  },
  {
    title: "Bei Abmeldung (Außerbetriebsetzung)",
    items: [
      "Zulassungsbescheinigung Teil I mit freigelegtem Sicherheitscode",
      "Beide Kennzeichen bzw. deren freigelegte Plaketten-Sicherheitscodes",
      "Bei Verschrottung: Verwertungsnachweis des zertifizierten Demontagebetriebs",
    ],
  },
];

export default function ChecklistePage() {
  return (
    <>
      <section className="no-print relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs
            items={[{ name: "Vorlagen", href: "/vorlagen/" }, { name: "Checkliste Zulassung" }]}
          />
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            Checkliste: Unterlagen für die Kfz-Zulassung
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Zum Ausdrucken und Abhaken – damit beim Termin oder bei der digitalen
            Einreichung nichts fehlt. Über uns genügen übrigens Fotos dieser
            Unterlagen; wir prüfen die Vollständigkeit für Sie.
          </p>
          <div className="mt-6">
            <PrintButton label="Checkliste drucken" />
          </div>
        </div>
      </section>

      <section className="py-10 print:py-0">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <article className="rounded-2xl border border-ink-200 bg-white p-8 shadow-card print:rounded-none print:border-0 print:p-0 print:shadow-none">
            <h2 className="text-center font-display text-2xl font-bold text-ink-900">
              Unterlagen-Checkliste Kfz-Zulassung
            </h2>
            {sections.map((section) => (
              <div key={section.title} className="mt-7">
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">
                  {section.title}
                </h3>
                <ul className="mt-3 space-y-2.5 text-sm text-ink-800">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span
                        className="mt-0.5 shrink-0 border-2 border-ink-500"
                        style={{ height: "1.1rem", width: "1.1rem" }}
                        aria-hidden
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="mt-8 border-t border-ink-200 pt-4 text-xs text-ink-500">
              Kostenlose Checkliste von {site.name} ({site.url.replace("https://", "")}) –
              Stand 2026, Angaben ohne Gewähr. Einzelne Behörden können weitere
              Nachweise verlangen.
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
