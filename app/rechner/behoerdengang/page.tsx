import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import BehoerdengangRechner from "@/components/BehoerdengangRechner";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Was kostet der Behördengang wirklich? Der Ersparnis-Rechner",
  description:
    "Gebühren, Kennzeichen, Fahrtkosten und Ihre Zeit: Der Rechner zeigt, was die Kfz-Zulassung am Schalter wirklich kostet – ehrlich verglichen mit dem Zulassungsdienst.",
  keywords: [
    "Zulassungsstelle Kosten",
    "Behördengang Kosten Rechner",
    "Zulassungsdienst lohnt sich",
    "Auto anmelden Zeitaufwand",
  ],
};

const rechnerFaq = [
  {
    question: "Wie viel Zeit kostet der Behördengang wirklich?",
    answer:
      "Realistisch 2–4 Stunden: Termin online ergattern, Anfahrt und Parkplatzsuche, Wartezeit trotz Termin, Schaltervorgang, danach oft noch Schilder prägen lassen und zurück zum Stempeln. In Großstädten kommt die tage- bis wochenlange Terminsuche hinzu.",
  },
  {
    question: "Rechnet sich ein Zulassungsdienst immer?",
    answer:
      "Nein – wer wenig Zeitkosten ansetzt und nah an der Behörde wohnt, fährt am Schalter rechnerisch günstiger. Der Rechner zeigt das ehrlich an. Er zeigt aber auch: Ab einem Stundensatz von etwa 20–25 € kippt die Rechnung fast immer zugunsten des Komplettservice.",
  },
  {
    question: "Was ist im Komplettpreis von 129 € enthalten?",
    answer:
      "Alles: amtliche Gebühren, beide Kennzeichenschilder mit Prägung und der versicherte Versand. Ihr Aufwand beschränkt sich auf Fotos der Unterlagen und die digitale Vollmacht – zusammen etwa 10 Minuten.",
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
  name: "Behördengang-Ersparnis-Rechner",
  url: `${site.url}/rechner/behoerdengang/`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  provider: { "@type": "Organization", name: site.name, url: site.url },
  inLanguage: "de",
};

export default function BehoerdengangRechnerPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs
            items={[{ name: "Rechner", href: "/rechner/" }, { name: "Behördengang-Rechner" }]}
          />
          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Kostenloses Tool
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              Was kostet der Behördengang wirklich?
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Die Gebühren sind nur die halbe Wahrheit: Rechnen Sie Ihre Zeit,
              die Anfahrt und die Schilder dazu – und vergleichen Sie ehrlich mit
              dem Komplettservice. Manchmal gewinnt der Schalter. Meistens nicht.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <BehoerdengangRechner />
          </Reveal>

          <Reveal>
            <div className="mt-12">
              <h2 className="font-display text-2xl font-bold text-ink-900">
                Die versteckten Kosten des Schaltertermins
              </h2>
              <p className="mt-4 leading-relaxed text-ink-700">
                Wer nur die amtliche Gebühr betrachtet, unterschätzt den Behördengang
                systematisch: Die Terminsuche kostet in Großstädten oft Wochen Vorlauf,
                der Termin selbst einen halben Arbeitstag – Anfahrt, Wartezeit,
                Schaltervorgang, Schilder prägen, zurück zum Stempeln. Berufstätige
                zahlen das mit Urlaub oder unbezahlter Freizeit. Genau diese Kosten
                macht der Rechner sichtbar – mit bewusst transparenten Annahmen, die
                Sie an Ihre Situation anpassen können.
              </p>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-12">
              <h2 className="font-display text-2xl font-bold text-ink-900">
                Häufige Fragen
              </h2>
              <div className="mt-5">
                <FaqAccordion items={rechnerFaq} />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="mt-12">
              <Link
                href="/rechner/kfz-steuer/"
                className="group flex flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
              >
                <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                  Auch interessant: Kfz-Steuer-Rechner
                </span>
                <span className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-700">
                  Jahressteuer berechnen
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            </div>
          </Reveal>
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
