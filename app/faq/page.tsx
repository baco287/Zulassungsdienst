import type { Metadata } from "next";
import FaqAccordion from "@/components/FaqAccordion";
import CTASection from "@/components/CTASection";
import { faqItems } from "@/lib/faq";

export const metadata: Metadata = {
  title: "Häufige Fragen (FAQ) zur Online-Kfz-Zulassung",
  description:
    "Antworten auf die häufigsten Fragen zur Online-Zulassung: Kosten, Dauer, benötigte Dokumente, eVB-Nummer, Kennzeichenmitnahme und mehr.",
};

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
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Häufige Fragen
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            Alles Wichtige rund um Ablauf, Kosten und Unterlagen. Ihre Frage ist nicht
            dabei? Schreiben Sie uns einfach.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FaqAccordion items={faqItems} />
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
