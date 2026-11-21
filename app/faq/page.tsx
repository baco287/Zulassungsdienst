import type { Metadata } from "next";
import FaqAccordion from "@/components/FaqAccordion";
import CTASection from "@/components/CTASection";
import { faqItems } from "@/lib/faq";
import type { FaqItem } from "@/lib/types";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Häufige Fragen (FAQ) zur Online-Kfz-Zulassung",
  description:
    "Antworten auf die häufigsten Fragen zur Online-Zulassung: Kosten, Dauer, benötigte Dokumente, eVB-Nummer, Kennzeichenmitnahme und mehr.",
};

/** Themenblöcke in der Reihenfolge, in der Kunden die Fragen meist stellen. */
const gruppen: { id: string; category: FaqItem["category"]; title: string }[] = [
  { id: "ablauf", category: "ablauf", title: "Ablauf und Dauer" },
  { id: "unterlagen", category: "dokumente", title: "Unterlagen und Identität" },
  { id: "preise", category: "preise", title: "Preise, Zahlung und Storno" },
  { id: "allgemein", category: "allgemein", title: "Über uns und Allgemeines" },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function FaqPage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "Häufige Fragen" }]} />
          </div>
          <h1 className="h-seite text-navy">
            Häufige Fragen
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Alles Wichtige rund um Ablauf, Kosten und Unterlagen. Ihre Frage ist nicht
            dabei? Schreiben Sie uns einfach.
          </p>
          <nav aria-label="Themen" className="mt-7 flex flex-wrap justify-center gap-2">
            {gruppen.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy transition-colors duration-200 hover:border-brand-300 hover:text-brand-700"
              >
                {g.title}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page *:max-w-3xl space-y-12">
          {gruppen.map((g, i) => (
            <div key={g.id} id={g.id} className="scroll-mt-28">
              <h2 className="mb-5 font-display text-2xl font-bold text-navy">{g.title}</h2>
              <FaqAccordion
                items={faqItems.filter((f) => f.category === g.category)}
                initialOpen={i === 0 ? 0 : null}
              />
            </div>
          ))}
        </div>
      </section>

      <CTASection />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
