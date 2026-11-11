import type { Metadata } from "next";
import Hero from "@/components/home/Hero";
import TrustBar from "@/components/home/TrustBar";
import ServiceCards from "@/components/home/ServiceCards";
import ProcessSection from "@/components/home/ProcessSection";
import EidSection from "@/components/home/EidSection";
import PricingSection from "@/components/home/PricingSection";
import SecuritySection from "@/components/home/SecuritySection";
import HomeFaq from "@/components/home/HomeFaq";
import CTASection from "@/components/CTASection";
import { abschluss } from "@/lib/homepage";
import { P } from "@/lib/pricing";
import { site } from "@/lib/site";

const description = `Auto online anmelden, ummelden oder abmelden – ohne eID-PIN, AusweisApp und Behördentermin. Zulassung ${P.zulassung}, Abmeldung ${P.abmeldung}, inkl. amtlicher Gebühren.`;

export const metadata: Metadata = {
  title: { absolute: `Kfz-Zulassung online ohne Behördentermin | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "/",
    title: `Kfz-Zulassung online ohne Behördentermin | ${site.name}`,
    description,
  },
};

/**
 * Startseite. Texte und Reihenfolge stehen in lib/homepage.ts, Preise in
 * config/preise.json, Zeiten in config/betrieb.json.
 *
 * Reihenfolge = Entscheidungsweg: Nutzen und Leistungswahl → Vertrauen →
 * Leistungen → Ablauf → „ohne eID“ → Preise → Datensicherheit → Fragen → Abschluss.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <ServiceCards />
      <ProcessSection />
      <EidSection />
      <PricingSection />
      <SecuritySection />
      <HomeFaq />
      <CTASection
        title={abschluss.title}
        text={abschluss.text}
        primaryLabel={abschluss.primary.label}
        primaryHref={abschluss.primary.href}
        secondaryLabel={abschluss.secondary.label}
      />
    </>
  );
}
