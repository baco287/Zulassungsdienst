import type { Metadata } from "next";
import ServiceCard from "@/components/ServiceCard";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { categoryLabels, sortedServices } from "@/lib/services";
import type { ServiceCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Leistungen – alle Zulassungsdienste im Überblick",
  description:
    "Neuzulassung, Ummeldung, Abmeldung, Wunschkennzeichen und mehr: Alle Kfz-Zulassungsleistungen von EasyZulassung im Überblick – für Privat- und Gewerbekunden.",
};

const order: ServiceCategory[] = ["zulassung", "kennzeichen", "dokumente", "service"];

export default function LeistungenPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">Leistungen</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Jede Leistung mit transparenter Preisstruktur und Dokumenten-Checkliste.
            Nicht sicher, was Sie brauchen? Schreiben Sie uns einfach – wir beraten Sie kostenlos.
          </p>
        </div>
      </section>

      {order.map((cat) => {
        const items = sortedServices.filter((s) => s.category === cat);
        if (items.length === 0) return null;
        return (
          <section key={cat} className="py-12 first-of-type:pt-14 sm:py-14">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <Reveal>
                <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                  {categoryLabels[cat]}
                </h2>
              </Reveal>
              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s, i) => (
                  <Reveal key={s.slug} delay={i * 0.05}>
                    <ServiceCard service={s} />
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <CTASection />
    </>
  );
}
