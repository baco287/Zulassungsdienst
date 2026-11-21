import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ListChecks } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Vollmacht & Checkliste zur Kfz-Zulassung",
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
      <section className="seitenkopf">
        <div className="container-page">
          <Breadcrumbs items={[{ name: "Vorlagen & Downloads" }]} />
          <div className="mt-8 max-w-3xl">
            <h1 className="h-seite text-navy">
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
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2">
            {templates.map((template, i) => (
              <Reveal key={template.href} delay={i * 0.06} className="h-full">
                <Link
                  href={template.href}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 transition-colors duration-200 hover:border-brand-300"
                >
                  <span className="flex h-12 w-12 items-center justify-center text-brand-600">
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
