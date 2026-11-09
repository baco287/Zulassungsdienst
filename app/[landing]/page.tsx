import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, ClipboardCheck, Info, Landmark } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import ComparisonTable from "@/components/ComparisonTable";
import ContentSections, { SourceList, TableOfContents } from "@/components/ContentSections";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import TrackedLink from "@/components/TrackedLink";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getLandingPage, landingPages } from "@/lib/landingpages";
import { getGuide } from "@/lib/ratgeber";
import { getService } from "@/lib/services";
import { euro, leistungsPreis, P, schemaPrice } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";
import { ORG_ID } from "@/lib/catalog";
import { fitTitle } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return landingPages.map((p) => ({ landing: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ landing: string }>;
}): Promise<Metadata> {
  const { landing } = await params;
  const page = getLandingPage(landing);
  if (!page) return {};
  return {
    title: fitTitle(page.metaTitle),
    description: page.description,
    keywords: page.keywords,
    alternates: { canonical: `/${page.slug}/` },
    openGraph: {
      type: "article",
      locale: site.locale,
      siteName: site.name,
      url: `/${page.slug}/`,
      title: page.metaTitle,
      description: page.description,
      modifiedTime: page.updated,
    },
  };
}

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

/** Seiten, auf denen der Wege-Vergleich (Behörde / i-Kfz / Service) erscheint. */
const SHOW_COMPARISON = new Set(["kfz-zulassung-ohne-eid", "zulassungsdienst-online", "auto-online-anmelden"]);

export default async function LandingPageView({ params }: { params: Promise<{ landing: string }> }) {
  const { landing } = await params;
  const page = getLandingPage(landing);
  if (!page) notFound();

  const primary = page.primaryService ? getService(page.primaryService) : undefined;
  const primaryPrice = page.primaryService ? leistungsPreis(page.primaryService) : undefined;
  const orderHref = page.primaryService ? `/auftrag/?leistung=${page.primaryService}` : "/auftrag/";
  const relatedServices = page.relatedServices.map((s) => getService(s)).filter((s) => s !== undefined);
  const relatedGuides = page.relatedGuides.map((g) => getGuide(g)).filter((g) => g !== undefined);
  const relatedLanding = page.relatedLanding.map((l) => getLandingPage(l)).filter((l) => l !== undefined);
  const pageUrl = `${site.url}/${page.slug}/`;

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    description: page.description,
    url: pageUrl,
    inLanguage: "de",
    dateModified: page.updated,
    isPartOf: { "@id": `${site.url}/#website` },
    publisher: { "@id": ORG_ID },
    ...(primary && primaryPrice
      ? {
          mainEntity: {
            "@type": "Service",
            name: primary.name,
            serviceType: "Kfz-Zulassungsservice",
            provider: { "@id": ORG_ID },
            areaServed: { "@type": "Country", name: "Deutschland" },
            offers: {
              "@type": "Offer",
              price: schemaPrice(primaryPrice.preis),
              priceCurrency: "EUR",
              url: `${site.url}${orderHref}`,
            },
          },
        }
      : {}),
  };

  const faqJsonLd = page.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: page.navTitle }]} />
          <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_20rem]">
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight text-ink-900 sm:text-[2.6rem]">
                {page.h1}
              </h1>
              {page.intro.map((p) => (
                <p key={p.slice(0, 50)} className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
                  {p}
                </p>
              ))}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <TrackedLink
                  href={orderHref}
                  event="cta_click"
                  props={{ position: "landing", page: page.slug }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-7 py-4 font-display text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition-colors duration-200 hover:bg-brand-800"
                >
                  {page.ctaLabel}
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </TrackedLink>
                <TrackedLink
                  href={whatsAppLink(`Hallo DeutscheZulassung, ich komme von Ihrer Seite „${page.navTitle}“ und habe eine Frage.`)}
                  event="whatsapp_click"
                  props={{ position: "landing", page: page.slug }}
                  external
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366] bg-white px-6 py-4 font-display text-base font-semibold text-ink-900 transition-colors duration-200 hover:bg-[#25D366]/10"
                >
                  <WhatsAppIcon className="h-5 w-5" color="brand" />
                  Frage per WhatsApp
                </TrackedLink>
              </div>
              <p className="mt-5 flex items-start gap-2 text-sm text-ink-500">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                <span>
                  Inhaltlich geprüft am{" "}
                  <time dateTime={page.updated}>{dateFormat.format(new Date(page.updated))}</time>
                </span>
              </p>
            </div>

            {primary && primaryPrice && (
              <aside className="h-fit rounded-2xl border-2 border-brand-200 bg-white p-6 shadow-card">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-brand-700">
                  {primary.shortName ?? primary.name} über uns
                </p>
                <p className="mt-2 font-display text-4xl font-bold text-ink-900">{euro(primaryPrice.preis)}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">
                  Festpreis inkl. MwSt. und amtlicher Gebühren
                  {primaryPrice.enthaeltVersand ? ", inkl. Versand" : ""}
                  {primaryPrice.schilderMoeglich ? `. Kennzeichenschilder optional ${P.kennzeichen}.` : "."}
                </p>
                <p className="mt-4 text-sm text-ink-700">Dauer: {primary.duration}</p>
                <TrackedLink
                  href={orderHref}
                  event="cta_click"
                  props={{ position: "landing_aside", page: page.slug }}
                  className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
                >
                  Auftrag starten
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </TrackedLink>
                <Link
                  href="/preise/"
                  className="mt-3 block text-center text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                >
                  Alle Preise
                </Link>
              </aside>
            )}
          </div>
        </div>
      </section>

      <article className="py-12 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-10 px-4 sm:px-6">
          <p className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-700">
            <Landmark className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
            <span>
              {site.name} ist ein privater Zulassungsdienst und keine Behörde. Wir reichen Ihren Antrag mit Ihrer
              Vollmacht bei der zuständigen Zulassungsbehörde ein – die Entscheidung trifft immer die Behörde.
            </span>
          </p>

          <TableOfContents sections={page.sections} />

          {page.steps && (
            <Reveal>
              <section>
                <h2 className="font-display text-2xl font-bold text-ink-900">{page.steps.title}</h2>
                <ol className="mt-5 space-y-4">
                  {page.steps.items.map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 font-display text-sm font-bold text-white">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-display font-bold text-ink-900">{step.title}</span>
                        <span className="mt-1 block leading-relaxed text-ink-700">{step.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          )}

          {page.checklist && (
            <Reveal>
              <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
                <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
                  <ClipboardCheck className="h-6 w-6 text-brand-700" aria-hidden />
                  {page.checklist.title}
                </h2>
                <ul className="mt-4 space-y-2">
                  {page.checklist.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-ink-700">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                {page.checklist.photoHint && (
                  <p className="mt-4 flex gap-2 text-sm text-ink-600">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                    <span>
                      Für den Start genügen Handyfotos.{" "}
                      <Link href="/vorlagen/checkliste-zulassung/" className="font-semibold text-brand-700 underline">
                        Checkliste zum Ausdrucken
                      </Link>
                    </span>
                  </p>
                )}
              </section>
            </Reveal>
          )}

          <ContentSections sections={page.sections} />

          {SHOW_COMPARISON.has(page.slug) && (
            <Reveal>
              <section>
                <h2 className="font-display text-2xl font-bold text-ink-900">Die drei Wege im Vergleich</h2>
                <div className="mt-5">
                  <ComparisonTable />
                </div>
              </section>
            </Reveal>
          )}

          <SourceList sources={page.sources} />

          {page.faq.length > 0 && (
            <Reveal>
              <section>
                <h2 className="font-display text-2xl font-bold text-ink-900">Häufige Fragen</h2>
                <div className="mt-5">
                  <FaqAccordion items={page.faq} />
                </div>
              </section>
            </Reveal>
          )}

          {(relatedLanding.length > 0 || relatedGuides.length > 0) && (
            <Reveal>
              <section>
                <h2 className="font-display text-xl font-bold text-ink-900">Das könnte Ihnen auch helfen</h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {relatedLanding.map((l) => (
                    <li key={l.slug}>
                      <Link
                        href={`/${l.slug}/`}
                        className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                      >
                        <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          {l.navTitle}
                        </span>
                        <span className="mt-1 text-sm text-ink-600">{l.description}</span>
                      </Link>
                    </li>
                  ))}
                  {relatedGuides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        href={`/ratgeber/${g.slug}/`}
                        className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Ratgeber</span>
                        <span className="mt-1 font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          {g.title}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {relatedServices.length > 0 && (
            <Reveal>
              <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
                <h2 className="font-display text-xl font-bold text-ink-900">Passende Leistungen</h2>
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
        </div>
      </article>

      <CTASection />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }} />
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
    </>
  );
}
