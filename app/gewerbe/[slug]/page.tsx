import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqAccordion from "@/components/FaqAccordion";
import GewerbeCTA from "@/components/GewerbeCTA";
import Reveal from "@/components/Reveal";
import { gewerbeSegments, getSegment } from "@/lib/gewerbe";
import { getService } from "@/lib/services";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return gewerbeSegments.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const segment = getSegment(slug);
  if (!segment) return {};
  return {
    title: segment.title,
    description: segment.description,
    keywords: segment.keywords,
  };
}

export default async function GewerbeSegmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const segment = getSegment(slug);
  if (!segment) notFound();

  const services = segment.services
    .map((s) => getService(s))
    .filter((s) => s !== undefined);
  const otherSegments = gewerbeSegments.filter((s) => s.slug !== segment.slug);

  const pageUrl = `${site.url}/gewerbe/${segment.slug}/`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: segment.title,
    serviceType: segment.title,
    description: segment.description,
    url: pageUrl,
    areaServed: { "@type": "Country", name: "Deutschland" },
    audience: { "@type": "BusinessAudience", name: segment.name },
    provider: {
      "@type": "LocalBusiness",
      name: site.name,
      url: site.url,
      telephone: site.contact.phone,
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: segment.faq.map((f) => ({
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
            items={[{ name: "Gewerbe", href: "/gewerbe/" }, { name: segment.name }]}
          />
          <p className="mt-6 text-sm font-semibold uppercase tracking-wider text-brand-700">
            Für Gewerbekunden
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
            {segment.title}
          </h1>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-3xl space-y-4">
            {segment.intro.map((para) => (
              <Reveal key={para.slice(0, 40)}>
                <p className="leading-relaxed text-ink-700">{para}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {segment.benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <h2 className="flex items-start gap-3 font-display text-lg font-bold text-ink-900">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    {b.title}
                  </h2>
                  <p className="mt-2 pl-8 text-sm leading-relaxed text-ink-600">{b.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          {services.length > 0 && (
            <Reveal className="mt-12">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Typische Vorgänge
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
          )}
        </div>
      </section>

      <section className="bg-ink-50 py-14">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900">Häufige Fragen</h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <FaqAccordion items={segment.faq} />
          </Reveal>
        </div>
      </section>

      <GewerbeCTA context={segment.name} />

      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-xl font-bold text-ink-900">
            Weitere Branchenlösungen
          </h2>
          <ul className="mt-4 flex flex-wrap gap-3">
            {otherSegments.map((seg) => (
              <li key={seg.slug}>
                <Link
                  href={`/gewerbe/${seg.slug}/`}
                  className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  {seg.name}
                  <ArrowRight className="h-3.5 w-3.5 text-brand-700" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
