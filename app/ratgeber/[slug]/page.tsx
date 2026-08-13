import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import { getGuide, guides } from "@/lib/ratgeber";
import { getService } from "@/lib/services";
import { site } from "@/lib/site";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    keywords: guide.keywords,
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified,
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("de-DE", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const relatedServices = guide.relatedServices
    .map((s) => getService(s))
    .filter((s) => s !== undefined);
  const relatedGuides = guide.relatedGuides
    .map((g) => getGuide(g))
    .filter((g) => g !== undefined);

  const pageUrl = `${site.url}/ratgeber/${guide.slug}/`;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    inLanguage: "de",
    mainEntityOfPage: pageUrl,
    author: { "@type": "Organization", name: site.name, url: site.url },
    publisher: { "@type": "Organization", name: site.name, url: site.url },
  };

  const faqJsonLd = guide.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: guide.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Breadcrumbs
            items={[{ name: "Ratgeber", href: "/ratgeber/" }, { name: guide.title }]}
          />
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
            {guide.title}
          </h1>
          <p className="mt-4 text-lg text-ink-600">{guide.description}</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-ink-500">
            <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden />
            Aktualisiert am{" "}
            <time dateTime={guide.dateModified}>
              {dateFormat.format(new Date(guide.dateModified))}
            </time>
          </p>
        </div>
      </section>

      <article className="py-14">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          {guide.sections.map((section) => (
            <Reveal key={section.heading}>
              <section>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  {section.heading}
                </h2>
                {section.paragraphs.map((para) => (
                  <p key={para.slice(0, 40)} className="mt-4 leading-relaxed text-ink-700">
                    {para}
                  </p>
                ))}
                {section.list && (
                  <ul className="mt-4 space-y-2.5">
                    {section.list.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-ink-700">
                        <CheckCircle2
                          className="mt-0.5 h-5 w-5 shrink-0 text-brand-600"
                          aria-hidden
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </Reveal>
          ))}

          {guide.faq.length > 0 && (
            <Reveal>
              <section>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Häufige Fragen
                </h2>
                <div className="mt-5">
                  <FaqAccordion items={guide.faq} />
                </div>
              </section>
            </Reveal>
          )}

          {relatedServices.length > 0 && (
            <Reveal>
              <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
                <h2 className="font-display text-xl font-bold text-ink-900">
                  Lieber erledigen lassen?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  DeutscheZulassung übernimmt den kompletten Behördenvorgang für Sie –
                  digital, zum Festpreis und ohne Termin.
                </p>
                <ul className="mt-4 flex flex-wrap gap-3">
                  {relatedServices.map((service) => (
                    <li key={service.slug}>
                      <Link
                        href={`/leistungen/${service.slug}/`}
                        className="flex items-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
                      >
                        {service.shortName ?? service.name}
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {relatedGuides.length > 0 && (
            <Reveal>
              <section>
                <h2 className="font-display text-xl font-bold text-ink-900">
                  Weiterlesen
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {relatedGuides.map((rel) => (
                    <li key={rel.slug}>
                      <Link
                        href={`/ratgeber/${rel.slug}/`}
                        className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                      >
                        <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          {rel.title}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-700">
                          Artikel lesen
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}
        </div>
      </article>

      <CTASection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
    </>
  );
}
