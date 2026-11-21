import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { cities } from "@/lib/staedte";

export const metadata: Metadata = {
  title: "Kfz-Zulassung in Ihrer Stadt ohne Termin",
  description:
    "Auto anmelden, ummelden oder abmelden – digital in Berlin, Hamburg, München, Köln und über 40 weiteren Städten. Wir übernehmen den Behördengang.",
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
      <section className="seitenkopf">
        <div className="container-page">
          <Breadcrumbs items={[{ name: "Kfz-Zulassung in Ihrer Stadt" }]} />
          <div className="mt-8 max-w-3xl">
            <h1 className="h-seite text-navy">
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
        <div className="container-page">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((city, i) => (
              <Reveal key={city.slug} delay={Math.min((i % 3) * 0.05, 0.3)} className="h-full">
                <Link
                  href={`/kfz-zulassung/${city.slug}/`}
                  className="group flex h-full flex-col border-t-2 border-navy pt-4 pb-2"
                >
                  <h2 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    Kfz-Zulassung {city.name}
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
                    {city.description}
                  </p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Zur Stadtseite
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
