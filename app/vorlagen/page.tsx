import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText, ListChecks } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Vorlagen & Downloads – Vollmacht und Checklisten zur Kfz-Zulassung",
  description:
    "Kostenlose Vorlagen rund um die Kfz-Zulassung: Vollmacht zum Ausdrucken und Unterlagen-Checkliste zum Abhaken – ohne Anmeldung, ohne Registrierung.",
};

const templates = [
  {
    href: "/vorlagen/vollmacht-zulassung/",
    icon: FileText,
    title: "Vollmacht Kfz-Zulassung",
    text: "Muster-Vollmacht für Zulassung, Umschreibung, Ummeldung und Abmeldung durch eine bevollmächtigte Person – ausdrucken, ausfüllen, fertig.",
  },
  {
    href: "/vorlagen/checkliste-zulassung/",
    icon: ListChecks,
    title: "Checkliste: Unterlagen zur Zulassung",
    text: "Alle benötigten Dokumente zum Abhaken – inklusive Sonderfällen für Gebrauchtwagen, Firmenfahrzeuge, Importe und Abmeldung.",
  },
] as const;

export default function VorlagenPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Vorlagen & Downloads" }]} />
          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Kostenlos & ohne Anmeldung
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              Vorlagen & Downloads
            </h1>
            <p className="mt-4 text-lg text-ink-600">
              Druckfertige Vorlagen für den Behördengang – falls Sie die Zulassung
              selbst erledigen möchten. Und falls nicht: Bei uns läuft alles digital,
              ganz ohne Drucker.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {templates.map((template, i) => (
              <Reveal key={template.href} delay={i * 0.06} className="h-full">
                <Link
                  href={template.href}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <template.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    {template.title}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {template.text}
                  </p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Vorlage öffnen & drucken
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
