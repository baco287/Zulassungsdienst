import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FaqAccordion from "@/components/FaqAccordion";
import SectionHeading from "@/components/ui/SectionHeading";
import { faq } from "@/lib/homepage";

/** FAQ der Startseite inklusive FAQPage-Markup – sichtbarer Text und JSON-LD stammen aus derselben Liste. */
export default function HomeFaq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <section id="faq" className="bg-canvas py-16 sm:py-24" aria-labelledby="faq-title">
      <div className="container-page grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
        <div>
          <SectionHeading id="faq-title" eyebrow={faq.eyebrow} title={faq.title} />
          <Link
            href={faq.mehr.href}
            className="mt-6 inline-flex min-h-11 items-center gap-1.5 font-display font-bold text-brand-700 hover:text-brand-800"
          >
            {faq.mehr.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <FaqAccordion items={[...faq.items]} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
