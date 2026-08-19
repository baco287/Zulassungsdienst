import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import KfzSteuerRechner from "@/components/KfzSteuerRechner";
import Reveal from "@/components/Reveal";
import { getGuide } from "@/lib/ratgeber";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kfz-Steuer-Rechner 2026 – Steuer für Ihr Auto berechnen",
  description:
    "Kostenlos die Kfz-Steuer berechnen: Hubraum, CO₂-Ausstoß und Erstzulassung eingeben – der Rechner zeigt sofort die Jahressteuer für Benziner, Diesel und E-Autos.",
  keywords: [
    "Kfz-Steuer Rechner",
    "Kfz-Steuer berechnen",
    "Autosteuer Rechner 2026",
    "Kfz-Steuer Diesel Benziner",
    "CO2 Steuer Auto",
  ],
};

const rechnerFaq = [
  {
    question: "Wie berechnet sich die Kfz-Steuer für Pkw?",
    answer:
      "Aus zwei Bausteinen: einem Hubraum-Anteil (2,00 € je angefangene 100 ccm bei Benzinern, 9,50 € bei Dieseln) und einem CO₂-Anteil. Bei Erstzulassung ab 2021 sind 95 g/km frei; darüber steigt der Satz stufenweise von 2,00 € bis 4,00 € je Gramm.",
  },
  {
    question: "Wann und wie wird die Kfz-Steuer bezahlt?",
    answer:
      "Die Steuer wird ab dem Tag der Zulassung fällig und vom Hauptzollamt jährlich im Voraus per SEPA-Lastschrift eingezogen. Deshalb ist das SEPA-Mandat Pflichtbestandteil jeder Zulassung.",
  },
  {
    question: "Zahlen Elektroautos Kfz-Steuer?",
    answer:
      "Reine Elektrofahrzeuge mit Erstzulassung bis Ende 2025 sind bis längstens Ende 2030 von der Kfz-Steuer befreit. Danach – und für später zugelassene E-Autos – gilt eine ermäßigte, gewichtsbasierte Steuer.",
  },
  {
    question: "Bekomme ich Steuer zurück, wenn ich mein Auto abmelde?",
    answer:
      "Ja. Mit der Außerbetriebsetzung endet die Steuerpflicht taggenau; zu viel gezahlte Beträge erstattet das Hauptzollamt automatisch. Die Abmeldung erledigen wir meist noch am selben Werktag.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: rechnerFaq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Kfz-Steuer-Rechner",
  url: `${site.url}/rechner/kfz-steuer/`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  provider: { "@type": "Organization", name: site.name, url: site.url },
  inLanguage: "de",
};

export default function KfzSteuerRechnerPage() {
  const guides = ["was-kostet-eine-kfz-zulassung", "auto-abmelden-so-gehts"]
    .map((g) => getGuide(g))
    .filter((g) => g !== undefined);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Kfz-Steuer-Rechner" }]} />
          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Kostenloses Tool
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              Kfz-Steuer-Rechner
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Hubraum, CO₂-Wert und Erstzulassung eingeben – sofort sehen, was Ihr
              Fahrzeug pro Jahr an Kfz-Steuer kostet. Ohne Anmeldung, ohne Datenweitergabe:
              Die Berechnung läuft komplett in Ihrem Browser.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <KfzSteuerRechner />
          </Reveal>

          <Reveal>
            <div className="mt-12">
              <h2 className="font-display text-2xl font-bold text-ink-900">
                So setzt sich die Kfz-Steuer zusammen
              </h2>
              <p className="mt-4 leading-relaxed text-ink-700">
                Für Pkw besteht die Steuer aus einem <strong>Hubraum-Anteil</strong>{" "}
                (2,00 € je angefangene 100 ccm bei Benzin- und Hybridmotoren, 9,50 €
                bei Dieseln) und einem <strong>CO₂-Anteil</strong>. Bei Fahrzeugen mit
                Erstzulassung ab 2021 bleiben 95 g/km steuerfrei; jedes Gramm darüber
                kostet gestaffelt zwischen 2,00 € und 4,00 € pro Jahr. Ältere Fahrzeuge
                (Erstzulassung Juli 2009 bis 2020) zahlen pauschal 2,00 € je Gramm über
                dem jeweils gültigen Freibetrag. Den CO₂-Wert Ihres Fahrzeugs finden Sie
                in der Zulassungsbescheinigung Teil I im Feld V.7.
              </p>
              <p className="mt-4 leading-relaxed text-ink-700">
                Eingezogen wird die Steuer nicht vom Finanzamt, sondern vom{" "}
                <strong>Hauptzollamt</strong> – jährlich im Voraus per SEPA-Lastschrift,
                beginnend mit dem Tag der Zulassung. Bei der Abmeldung endet die
                Steuerpflicht taggenau und Überzahlungen werden automatisch erstattet.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-12">
              <h2 className="font-display text-2xl font-bold text-ink-900">
                Häufige Fragen zur Kfz-Steuer
              </h2>
              <div className="mt-5">
                <FaqAccordion items={rechnerFaq} />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-12 rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
              <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">
                Offizielle Quellen
              </h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                <li>
                  <a
                    href="https://www.zoll.de/DE/Privatpersonen/Kraftfahrzeugsteuer/kraftfahrzeugsteuer_node.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Zoll: Kraftfahrzeugsteuer (inkl. amtlicher Rechner)
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.gesetze-im-internet.de/kraftstg/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
                  >
                    Kraftfahrzeugsteuergesetz (KraftStG)
                  </a>
                </li>
              </ul>
            </div>
          </Reveal>

          {guides.length > 0 && (
            <Reveal>
              <div className="mt-12">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
                  <BookOpen className="h-6 w-6 text-brand-700" aria-hidden />
                  Weiterlesen
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {guides.map((guide) => (
                    <li key={guide.slug}>
                      <Link
                        href={`/ratgeber/${guide.slug}/`}
                        className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                      >
                        <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          {guide.title}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-700">
                          Artikel lesen
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>
      </section>

      <CTASection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
