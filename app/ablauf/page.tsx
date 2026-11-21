import type { Metadata } from "next";
import ProcessTimeline from "@/components/ProcessTimeline";
import CTASection from "@/components/CTASection";
import { processSteps } from "@/lib/processSteps";
import { site } from "@/lib/site";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Ablauf der Online-Zulassung in 7 Schritten",
  description:
    "Schritt für Schritt zur fertigen Kfz-Zulassung: So läuft Ihr Auftrag bei KFZ-Zulassungsprofis ab – von der Auswahl bis zur Zustellung von Kennzeichen und Papieren.",
};

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kfz-Zulassung online beauftragen – so funktioniert’s",
  description:
    "In 7 Schritten zur fertigen Kfz-Zulassung ohne Behördengang: Leistung wählen, Unterlagen digital einreichen, Vollmacht erteilen – den Rest übernimmt KFZ-Zulassungsprofis.",
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
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "So funktioniert’s" }]} />
          </div>
          <h1 className="h-seite text-navy">
            So funktioniert’s
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Vom ersten Klick bis zum Kennzeichen an Ihrer Tür: Ihr Zulassungsauftrag
            im Detail – komplett digital, mit persönlicher Betreuung.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
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
