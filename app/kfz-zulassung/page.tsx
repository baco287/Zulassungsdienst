import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { cities } from "@/lib/staedte";

export const metadata: Metadata = {
  title: "Kfz-Zulassung in Ihrer Stadt – ohne Termin & Behördengang",
  description:
    "Auto anmelden, ummelden oder abmelden – digital in Berlin, Hamburg, München, Köln und vielen weiteren Städten. Wir übernehmen den Behördengang, deutschlandweit zum Festpreis.",
  keywords: [
    "Kfz-Zulassung ohne Termin",
    "Auto anmelden Stadt",
    "Zulassungsdienst deutschlandweit",
    "Zulassungsstelle Alternative",
  ],
};

export default function KfzZulassungPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Kfz-Zulassung in Ihrer Stadt" }]} />
          <div className="mt-8 max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Deutschlandweit digital
            </p>
            <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              Kfz-Zulassung in Ihrer Stadt – ohne Termin und Behördengang
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-600">
              Ob Berlin, Hamburg oder München: Wir wickeln Ihre Zulassung digital bei
              der jeweils zuständigen Behörde ab – Sie reichen die Unterlagen als Foto
              ein, wir liefern Kennzeichen und Papiere versichert zu Ihnen. Gleicher
              Festpreis, gleicher Ablauf, in jeder Stadt.
            </p>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city, i) => (
              <Reveal key={city.slug} delay={Math.min((i % 3) * 0.05, 0.3)} className="h-full">
                <Link
                  href={`/kfz-zulassung/${city.slug}/`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    Kfz-Zulassung {city.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {city.description}
                  </p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Zur Stadtseite
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-10">
            <p className="rounded-2xl bg-ink-50 p-6 text-center text-ink-600">
              Ihre Stadt ist nicht dabei? Kein Problem – wir arbeiten mit{" "}
              <strong className="text-ink-800">jeder deutschen Zulassungsbehörde</strong>.
              Beauftragen Sie einfach Ihre Leistung, wir kümmern uns um die zuständige
              Stelle.
            </p>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
