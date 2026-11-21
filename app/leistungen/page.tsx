import type { Metadata } from "next";
import ServiceCard from "@/components/ServiceCard";
import CTASection from "@/components/CTASection";
import { categoryLabels, sortedServices } from "@/lib/services";
import type { ServiceCategory } from "@/lib/types";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Alle Zulassungsleistungen im Überblick",
  description:
    "Neuzulassung, Ummeldung, Abmeldung, Wunschkennzeichen und mehr: Alle Kfz-Zulassungsleistungen von KFZ-Zulassungsprofis im Überblick – für Privat- und Gewerbekunden.",
};

const order: ServiceCategory[] = ["zulassung", "kennzeichen", "dokumente", "service"];

export default function LeistungenPage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "Leistungen" }]} />
          </div>
          <h1 className="h-seite text-navy">Leistungen</h1>
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
          <section key={cat} className="py-9 first-of-type:pt-12 sm:py-11">
            <div className="container-page">
              <h2 className="text-2xl font-bold text-navy sm:text-[1.75rem]">{categoryLabels[cat]}</h2>
              <ul className="liste mt-5">
                {items.map((s) => (
                  <li key={s.slug}>
                    <ServiceCard service={s} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        );
      })}

      <CTASection />
    </>
  );
}
