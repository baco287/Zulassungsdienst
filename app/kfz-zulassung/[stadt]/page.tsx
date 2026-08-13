import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Landmark } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import { cities, getCity } from "@/lib/staedte";
import { getService } from "@/lib/services";
import { getGuide } from "@/lib/ratgeber";
import { site } from "@/lib/site";

const cityServices = ["neuzulassung", "ummeldung", "halterwechsel", "abmeldung"];
const cityGuides = ["was-kostet-eine-kfz-zulassung", "auto-anmelden-unterlagen", "kennzeichen-mitnehmen"];

export function generateStaticParams() {
  return cities.map((c) => ({ stadt: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ stadt: string }>;
}): Promise<Metadata> {
  const { stadt } = await params;
  const city = getCity(stadt);
  if (!city) return {};
  return {
    title: `Kfz-Zulassung ${city.name} – ohne Termin & Behördengang`,
    description: city.description,
    keywords: city.keywords,
  };
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ stadt: string }>;
}) {
  const { stadt } = await params;
  const city = getCity(stadt);
  if (!city) notFound();

  const services = cityServices.map((s) => getService(s)).filter((s) => s !== undefined);
  const guides = cityGuides.map((g) => getGuide(g)).filter((g) => g !== undefined);
  const otherCities = cities.filter((c) => c.slug !== city.slug);

  const pageUrl = `${site.url}/kfz-zulassung/${city.slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Kfz-Zulassung ${city.name}`,
    serviceType: "Kfz-Zulassungsservice",
    description: city.description,
    url: pageUrl,
    areaServed: { "@type": "City", name: city.name },
    provider: {
      "@type": "LocalBusiness",
      name: site.name,
      url: site.url,
      telephone: site.contact.phone,
    },
    offers: {
      "@type": "Offer",
      price: "129.00",
      priceCurrency: "EUR",
      description:
        "Komplettpreis je Zulassungsvorgang inkl. amtlicher Gebühren, Kennzeichen und Versand",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: city.faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs
            items={[
              { name: "Kfz-Zulassung", href: "/kfz-zulassung/" },
              { name: city.name },
            ]}
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-700">
            Digital statt Behördengang
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            Kfz-Zulassung {city.inName} – ohne Termin, ohne Wartemarke
          </h1>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-10">
            <div className="max-w-3xl space-y-4">
              {city.intro.map((para) => (
                <Reveal key={para.slice(0, 40)}>
                  <p className="leading-relaxed text-ink-700">{para}</p>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Diese Vorgänge übernehmen wir {city.inName}
                </h2>
                <ul className="mt-5 flex flex-wrap gap-3">
                  {services.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/leistungen/${service.slug}/`}
                        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                      >
                        {service.shortName ?? service.name}
                        <ArrowRight className="h-3.5 w-3.5 text-brand-700" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Häufige Fragen – {city.name}
                </h2>
                <div className="mt-5">
                  <FaqAccordion items={city.faq} />
                </div>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
                  <BookOpen className="h-6 w-6 text-brand-700" aria-hidden />
                  Passende Ratgeber-Artikel
                </h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {guides.map((guide) => (
                    <li key={guide.slug}>
                      <Link
                        href={`/ratgeber/${guide.slug}/`}
                        className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                      >
                        <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          {guide.title}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-700">
                          Artikel lesen
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <Landmark className="h-5 w-5 text-brand-700" aria-hidden />
                Auf einen Blick
              </h2>
              <dl className="mt-4 space-y-4 text-sm">
                {city.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="font-semibold text-ink-500">{fact.label}</dt>
                    <dd className="mt-0.5 text-ink-800">{fact.value}</dd>
                  </div>
                ))}
              </dl>
              <Link
                href="/auftrag/"
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
              >
                Jetzt beauftragen
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Wir wickeln Ihren Vorgang digital bei der zuständigen Behörde ab –
                Kennzeichen und Papiere kommen per versichertem Versand.
              </p>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="bg-ink-50 py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-xl font-bold text-ink-900">Weitere Städte</h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {otherCities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/kfz-zulassung/${c.slug}/`}
                  className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CTASection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
