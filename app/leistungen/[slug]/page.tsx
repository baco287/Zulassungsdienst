import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Clock,
  Info,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import SecurityCodeGuide from "@/components/SecurityCodeGuide";
import { getService, services } from "@/lib/services";
import { getServiceContent } from "@/lib/serviceContent";
import { getGuide } from "@/lib/ratgeber";
import { euro, euroRange, leistungsPreis, P, priceDisclaimer, plateFee } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getCatalogEntry, preisBestandteile, serviceJsonLd as serviceJsonLd_ } from "@/lib/catalog";
import { dauerKurz } from "@/lib/betrieb";
import KennzeichenHinweis from "@/components/KennzeichenHinweis";
import TrackedLink from "@/components/TrackedLink";
import TrackView from "@/components/TrackView";
import Haken from "@/components/ui/Haken";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  const content = getServiceContent(slug);
  return {
    title: `${service.shortName ?? service.name} online beauftragen`,
    description: service.teaser,
    keywords: content?.keywords,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const p = service.price;
  const eintrag = getCatalogEntry(service.slug);
  const content = getServiceContent(slug);
  const relatedServices =
    content?.related.map((s) => getService(s)).filter((s) => s !== undefined) ?? [];
  const relatedGuides =
    content?.guides.map((g) => getGuide(g)).filter((g) => g !== undefined) ?? [];

  const pageUrl = `${site.url}/leistungen/${service.slug}/`;

  const serviceJsonLd = serviceJsonLd_(eintrag!, { url: pageUrl });

  const faqJsonLd = content?.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: content.faq.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }
    : null;

  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <Breadcrumbs
            items={[
              { name: "Leistungen", href: "/leistungen/" },
              { name: service.shortName ?? service.name },
            ]}
          />
          <h1 className="mt-6 h-seite text-navy">
            {service.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">{service.teaser}</p>
          {eintrag && eintrag.preis !== null && (
            <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <TrackedLink
                href={eintrag.ctaHref}
                event="cta_click"
                props={{ position: "leistung_hero", service: service.slug }}
                className="inline-flex min-h-[52px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control bg-brand-600 px-7 font-display text-lg font-bold text-white transition-colors duration-150 hover:bg-brand-700"
              >
                Auftrag starten
              </TrackedLink>
              <p className="text-sm text-ink-700">
                <span className="font-display text-xl font-bold text-navy">{eintrag.preisText}</span>{" "}
                {preisBestandteile(eintrag)}
                {dauerKurz(service.slug) && (
                  <span className="block">Bearbeitung: {dauerKurz(service.slug)}</span>
                )}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-10">
            <Reveal>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">So läuft es ab</h2>
                <p className="mt-4 leading-relaxed text-ink-700">{service.description}</p>
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-600">
                  <Clock className="h-4 w-4 text-ink-600" aria-hidden />
                  Typische Dauer: <strong>{service.duration}</strong>
                </p>
                {eintrag?.kennzeichen.moeglich && <KennzeichenHinweis className="mt-6" />}
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">
                  Dokumenten-Checkliste
                </h2>
                <ul className="mt-5 space-y-3">
                  {service.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-ink-700">
                      <Haken className="mt-[0.4375rem] h-[0.75rem] w-[1rem]" />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-ink-600" aria-hidden />
                  Fotos oder Scans genügen für den Start. Originale werden nur benötigt,
                  wenn die Behörde sie verlangt – wir sagen Ihnen rechtzeitig Bescheid.
                </p>
              </div>
            </Reveal>

            {content?.sections.map((section) => (
              <Reveal key={section.heading}>
                <div>
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
                          <Haken className="mt-[0.4375rem] h-[0.75rem] w-[1rem]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Reveal>
            ))}

            {service.slug === "abmeldung" && (
              <Reveal>
                <SecurityCodeGuide variant="abmeldung" />
              </Reveal>
            )}

            {content?.ctaLink && (
              <Reveal>
                <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
                  <p className="leading-relaxed text-ink-700">{content.ctaLink.text}</p>
                  <Link
                    href={content.ctaLink.href}
                    className="mt-4 inline-flex items-center gap-2 rounded-control bg-brand-600 px-5 py-3 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
                  >
                    {content.ctaLink.label}
                  </Link>
                </div>
              </Reveal>
            )}

            {content && content.faq.length > 0 && (
              <Reveal>
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    Häufige Fragen – {service.shortName ?? service.name}
                  </h2>
                  <div className="mt-5">
                    <FaqAccordion items={content.faq} />
                  </div>
                </div>
              </Reveal>
            )}

            {relatedGuides.length > 0 && (
              <Reveal>
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    Passende Ratgeber-Artikel
                  </h2>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {relatedGuides.map((guide) => (
                      <li key={guide.slug}>
                        <Link
                          href={`/ratgeber/${guide.slug}/`}
                          className="group flex h-full flex-col border-t-2 border-navy pt-4 pb-2"
                        >
                          <span className="font-display font-semibold text-ink-900 group-hover:text-brand-800">
                            {guide.title}
                          </span>
                          <span className="mt-2 flex items-center gap-1 text-sm font-medium text-brand-700">
                            Artikel lesen
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}

            {relatedServices.length > 0 && (
              <Reveal>
                <div>
                  <h2 className="font-display text-2xl font-bold text-ink-900">
                    Verwandte Leistungen
                  </h2>
                  <ul className="mt-5 flex flex-wrap gap-3">
                    {relatedServices.map((rel) => (
                      <li key={rel.slug}>
                        <Link
                          href={`/leistungen/${rel.slug}/`}
                          className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                        >
                          {rel.shortName ?? rel.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            )}
          </div>

          {/* Preis-Box */}
          <Reveal delay={0.1}>
            <aside className="tafel h-fit py-6 pl-[2.75rem] pr-6 lg:sticky lg:top-24">
              <TrackView event="price_box_view" props={{ service: service.slug, position: "leistungsseite" }}>
              <h2 className="font-display text-lg font-bold text-ink-900">
                {service.slug === "wunschkennzeichen" ? "Zusatzleistung" : p.inclusive ? "Komplettpreis" : "Preisstruktur"}
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-600">
                    {service.slug === "wunschkennzeichen"
                      ? "Zusätzlich zu einer Zulassung"
                      : p.inclusive
                        ? "Festpreis KFZ-Zulassungsprofis"
                        : "Servicepreis KFZ-Zulassungsprofis"}
                  </dt>
                  <dd className="text-right font-display text-lg font-bold text-navy">
                    {p.serviceFee !== null
                      ? service.slug === "wunschkennzeichen"
                        ? `+ ${euro(p.serviceFee)}`
                        : p.inclusive
                          ? euro(p.serviceFee)
                          : `ab ${euro(p.serviceFee)}`
                      : "auf Anfrage"}
                  </dd>
                </div>
                {p.inclusive ? (
                  <ul className="space-y-1.5 rounded-xl bg-brand-50 p-3 text-ink-700">
                    {(() => {
                      // Zeilen aus config/preise.json – nur, was für diese Leistung wirklich gilt.
                      const cfg = leistungsPreis(service.slug);
                      const rows: [string, string][] = [];
                      if (service.slug === "wunschkennzeichen") {
                        rows.push(["Amtliche Gebühr (Reservierung & Zuteilung)", "inklusive"]);
                        rows.push(["Kennzeichenschilder", `optional zzgl. ${euro(plateFee)}`]);
                        rows.push(["Zulassungsvorgang", `zzgl. ${P.zulassung}`]);
                      } else if (cfg) {
                        if (cfg.enthaeltAmtlicheGebuehren) rows.push(["Amtliche Gebühren", "inklusive"]);
                        if (cfg.schilderMoeglich) rows.push(["Kennzeichenschilder", `optional zzgl. ${euro(plateFee)}`]);
                        rows.push(["Versand der Dokumente", cfg.enthaeltVersand ? "inklusive" : "entfällt (digital)"]);
                      }
                      return rows.map(([label, value]) => (
                        <li key={label} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2">
                          <Haken className="h-[0.6875rem] w-[0.9375rem] translate-y-px" />
                          <span>{label}</span>
                          {/* Lange Werte (z. B. Kennzeichenschilder „optional zzgl. …“) brechen um statt aus dem Kasten zu laufen */}
                          <span className="max-w-[9.5rem] text-right font-semibold text-navy">{value}</span>
                        </li>
                      ));
                    })()}
                  </ul>
                ) : (
                  <>
                    {p.officialFeeRange && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-600">Amtliche Gebühren</dt>
                        <dd className="text-right font-medium text-ink-800">
                          {euroRange(p.officialFeeRange)}
                        </dd>
                      </div>
                    )}
                    {p.plateCostRange && (
                      <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-ink-600">Kennzeichen (Paar)</dt>
                        <dd className="text-right font-medium text-ink-800">
                          {euroRange(p.plateCostRange)}
                        </dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              {!p.verified && (
                <p className="mt-4 rounded-lg bg-accent-400/15 px-3 py-2 text-xs font-medium text-accent-600">
                  Unverbindliche Orientierung – verbindliche Festpreis-Bestätigung vor Beauftragung.
                </p>
              )}
              {p.note && <p className="mt-3 text-xs text-ink-500">{p.note}</p>}
              <p className="mt-3 text-xs leading-relaxed text-ink-600">{priceDisclaimer}</p>

              <div className="mt-6 space-y-3">
                <Link
                  href={`/auftrag/?leistung=${service.slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-5 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
                >
                  Auftrag starten
                </Link>
                <a
                  href={whatsAppLink(`Hallo KFZ-Zulassungsprofis, ich interessiere mich für: ${service.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-300 px-5 py-3.5 font-display font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
                >
                  <WhatsAppIcon className="h-4 w-4 text-brand-700" />
                  Frage per WhatsApp
                </a>
              </div>
              </TrackView>
            </aside>
          </Reveal>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
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
