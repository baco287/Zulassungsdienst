import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calculator, Scale } from "lucide-react";
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
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Rechner & Tools" }]} />
          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Kostenlos & ohne Anmeldung
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {tools.map((tool, i) => (
              <Reveal key={tool.href} delay={i * 0.06} className="h-full">
                <Link
                  href={tool.href}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <tool.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    {tool.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{tool.text}</p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Rechner öffnen
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
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
