import type { Metadata } from "next";
import ProcessTimeline from "@/components/ProcessTimeline";
import CTASection from "@/components/CTASection";
import { processSteps } from "@/lib/processSteps";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "So funktioniert’s – Ablauf der Online-Zulassung",
  description:
    "Schritt für Schritt zur fertigen Kfz-Zulassung: So läuft Ihr Auftrag bei DeutscheZulassung ab – von der Auswahl bis zur Zustellung von Kennzeichen und Papieren.",
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kfz-Zulassung online beauftragen – so funktioniert’s",
  description:
    "In 7 Schritten zur fertigen Kfz-Zulassung ohne Behördengang: Leistung wählen, Unterlagen digital einreichen, Vollmacht erteilen – den Rest übernimmt DeutscheZulassung.",
  inLanguage: "de",
  totalTime: "P3D",
  step: processSteps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.text,
    url: `${site.url}/ablauf/`,
  })),
};

export default function AblaufPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            So funktioniert’s
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            Vom ersten Klick bis zum Kennzeichen an Ihrer Tür: Ihr Zulassungsauftrag
            im Detail – komplett digital, mit persönlicher Betreuung.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ProcessTimeline />
        </div>
      </section>

      <CTASection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
    </>
  );
}
