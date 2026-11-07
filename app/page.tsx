import type { Metadata } from "next";
import Konfigurator from "@/components/home/Konfigurator";
import HeroDecor from "@/components/home/HeroDecor";
import { ProcessSteps, TrustLine } from "@/components/home/ProcessSteps";
import StorySection from "@/components/home/StorySection";
import ComparisonSection from "@/components/home/ComparisonSection";
import AblaufSection from "@/components/home/AblaufSection";
import SecuritySection from "@/components/home/SecuritySection";
import FinalCTA from "@/components/home/FinalCTA";
import { P } from "@/lib/pricing";
import { site } from "@/lib/site";

const description = `Kfz-Zulassung ohne eID, AusweisApp und Behördentermin: Neuzulassung, Ummeldung und Halterwechsel für ${P.zulassung}, Abmeldung ${P.abmeldung} – inkl. amtlicher Gebühren, persönlich geprüft.`;

export const metadata: Metadata = {
  title: { absolute: `Kfz-Zulassung online ohne eID | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "/",
    title: `Kfz-Zulassung online ohne eID | ${site.name}`,
    description,
  },
};

/**
 * Startseite. Inhalte und Reihenfolge stehen in lib/homepage.ts,
 * Preise und Bearbeitungsdauer in lib/services.ts / lib/pricing.ts.
 */
export default function HomePage() {
  return (
    <>
      {/* ── Hero mit Konfigurator ── */}
      <section className="bg-home relative overflow-hidden" aria-labelledby="hero-title">
        <HeroDecor />
        <div className="relative mx-auto max-w-[1240px] px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:pb-20">
          <div className="text-left md:text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-muted">
              Privater Zulassungsdienst · bundesweit
            </p>
            <h1 id="hero-title" className="mt-4 font-display text-[2.4rem] font-bold leading-[1.08] text-navy sm:text-5xl lg:text-[3.6rem]">
              Ihre <span className="whitespace-nowrap">Kfz-Zulassung.</span>{" "}
              <span className="text-gold">Einfach erledigt.</span>
            </h1>
            <p className="mt-4 font-display text-lg font-semibold text-navy sm:text-xl">
              Ohne eID, ohne AusweisApp und ohne Behördentermin.
            </p>
            <p className="mt-2 text-lg text-muted">
              Vorgang auswählen, Unterlagen hochladen – wir kümmern uns um den Rest.
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-[1000px]">
            <Konfigurator />
          </div>

          <div className="mx-auto mt-10 max-w-[1000px]">
            <ProcessSteps />
          </div>
          <div className="mt-7">
            <TrustLine />
          </div>
        </div>
      </section>

      <StorySection />
      <ComparisonSection />
      <AblaufSection />
      <SecuritySection />
      <FinalCTA />
    </>
  );
}
