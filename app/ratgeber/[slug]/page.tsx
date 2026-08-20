import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import SecurityCodeGuide from "@/components/SecurityCodeGuide";
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

/** Erzeugt stabile Anker-IDs aus Abschnittsüberschriften. */
function headingId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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
    author: {
      "@type": "Person",
      name: site.company.responsible,
      jobTitle: "Inhaber",
      worksFor: { "@type": "Organization", name: site.name, url: site.url },
    },
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
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-500">
            <span className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 font-display text-xs font-bold text-white"
                aria-hidden
              >
                {site.company.responsible
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              Von <strong className="text-ink-700">{site.company.responsible}</strong>, Inhaber
              von {site.name}
            </span>
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-700" aria-hidden />
              Aktualisiert am{" "}
              <time dateTime={guide.dateModified}>
                {dateFormat.format(new Date(guide.dateModified))}
              </time>
            </span>
          </div>
        </div>
      </section>

      <article className="py-14">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          {guide.sections.length >= 3 && (
            <nav
              aria-label="Inhaltsverzeichnis"
              className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5"
            >
              <p className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">
                Inhalt
              </p>
              <ol className="mt-3 space-y-1.5 text-sm">
                {guide.sections.map((section, i) => (
                  <li key={section.heading}>
                    <a
                      href={`#${headingId(section.heading)}`}
                      className="flex gap-2 text-ink-700 transition-colors duration-200 hover:text-brand-700"
                    >
                      <span className="font-semibold text-brand-700">{i + 1}.</span>
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {guide.sections.map((section) => (
            <Reveal key={section.heading}>
              <section id={headingId(section.heading)} className="scroll-mt-24">
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
                {section.table && (
                  <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
                    <table className="w-full min-w-[36rem] border-collapse text-sm">
                      <thead>
                        <tr className="bg-ink-50 text-left">
                          {section.table.headers.map((h) => (
                            <th
                              key={h}
                              scope="col"
                              className="px-4 py-3 font-display font-semibold text-ink-800"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr key={row[0]} className="border-t border-ink-200">
                            {row.map((cell, ci) => (
                              <td
                                key={`${row[0]}-${ci}`}
                                className={`px-4 py-3 align-top ${
                                  ci === 0
                                    ? "font-medium text-ink-800"
                                    : ci === row.length - 1
                                      ? "font-semibold text-brand-700"
                                      : "text-ink-600"
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.image && (
                  <figure className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
                    <Image
                      src={section.image.src}
                      alt={section.image.alt}
                      width={1264}
                      height={848}
                      className="h-auto w-full"
                      sizes="(min-width: 768px) 720px, 100vw"
                    />
                    {section.image.caption && (
                      <figcaption className="p-4 text-sm leading-relaxed text-ink-600">
                        {section.image.caption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </section>
            </Reveal>
          ))}

          {(guide.slug === "auto-abmelden-so-gehts" ||
            guide.slug === "i-kfz-online-zulassung") && (
            <Reveal>
              <section>
                <SecurityCodeGuide
                  variant={guide.slug === "i-kfz-online-zulassung" ? "zulassung" : "abmeldung"}
                />
              </section>
            </Reveal>
          )}

          {guide.sources && guide.sources.length > 0 && (
            <Reveal>
              <section className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">
                  Offizielle Quellen
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm">
                  {guide.sources.map((source) => (
                    <li key={source.href}>
                      <a
                        href={source.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

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
