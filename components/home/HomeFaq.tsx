import Link from "next/link";
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
    <section id="faq" className="bg-white py-14 sm:py-20 lg:py-24" aria-labelledby="faq-title">
      <div className="container-page grid gap-x-16 gap-y-7 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <SectionHeading id="faq-title" title={faq.title} />
          <Link href={faq.mehr.href} className="link mt-5 inline-flex min-h-11 items-center">
            {faq.mehr.label}
          </Link>
        </div>
        <FaqAccordion items={[...faq.items]} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  );
}
