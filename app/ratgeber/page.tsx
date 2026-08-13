import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { sortedGuides } from "@/lib/ratgeber";

export const metadata: Metadata = {
  title: "Ratgeber – Wissen rund um die Kfz-Zulassung",
  description:
    "Kosten, Unterlagen, Fristen und Online-Zulassung: Unser Ratgeber beantwortet die wichtigsten Fragen rund um Anmeldung, Ummeldung und Abmeldung Ihres Fahrzeugs.",
};

export default function RatgeberPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <p className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-700">
            <BookOpen className="h-4 w-4" aria-hidden />
            Ratgeber
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Wissen rund um die Kfz-Zulassung
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            Kosten, Unterlagen, Fristen und die Online-Zulassung: Hier finden Sie
            verständliche Antworten auf die häufigsten Fragen – unabhängig davon,
            ob Sie selbst zur Behörde gehen oder uns beauftragen.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sortedGuides.map((guide, i) => (
              <Reveal key={guide.slug} delay={Math.min((i % 3) * 0.05, 0.3)} className="h-full">
                <Link
                  href={`/ratgeber/${guide.slug}/`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <h2 className="font-display text-lg font-bold text-ink-900 group-hover:text-brand-800">
                    {guide.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-600">
                    {guide.description}
                  </p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Artikel lesen
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
