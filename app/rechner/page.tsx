import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, Scale } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Rechner & Tools rund um die Kfz-Zulassung",
  description:
    "Kostenlose Rechner rund ums Auto: Kfz-Steuer berechnen und die wahren Kosten des Behördengangs ermitteln – ohne Anmeldung, direkt im Browser.",
};

const tools = [
  {
    href: "/rechner/kfz-steuer/",
    icon: Calculator,
    title: "Kfz-Steuer-Rechner",
    text: "Hubraum, CO₂-Wert und Erstzulassung eingeben – sofort die Jahressteuer für Benziner, Diesel und E-Autos sehen.",
  },
  {
    href: "/rechner/behoerdengang/",
    icon: Scale,
    title: "Behördengang-Rechner",
    text: "Gebühren, Kennzeichen, Fahrtkosten und Ihre Zeit: Was der Schaltertermin wirklich kostet – ehrlich verglichen mit dem Komplettservice.",
  },
] as const;

export default function RechnerPage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <Breadcrumbs items={[{ name: "Rechner & Tools" }]} />
          <div className="mt-8 max-w-3xl">
            <h1 className="h-seite text-navy">
              Rechner & Tools
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Alle Berechnungen laufen direkt in Ihrem Browser – keine Registrierung,
              keine Datenweitergabe.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2">
            {tools.map((tool, i) => (
              <Reveal key={tool.href} delay={i * 0.06} className="h-full">
                <Link
                  href={tool.href}
                  className="group flex h-full flex-col border-t-2 border-navy pt-4 pb-2"
                >
                  <h2 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    {tool.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{tool.text}</p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Rechner öffnen
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
