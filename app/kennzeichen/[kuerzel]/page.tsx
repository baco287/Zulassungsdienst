import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import TrackedLink from "@/components/TrackedLink";
import { getKennzeichen, kennzeichen } from "@/lib/zulassungsstellen";
import { getCity } from "@/lib/staedte";
import { P, wunschkennzeichenHinweis } from "@/lib/pricing";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return kennzeichen.map((k) => ({ kuerzel: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ kuerzel: string }> }): Promise<Metadata> {
  const { kuerzel } = await params;
  const k = getKennzeichen(kuerzel);
  if (!k) return {};
  return {
    title: `${k.code}-Kennzeichen: ${k.name}`,
    description: `Kennzeichen ${k.code} steht für ${k.name}. Zuständige Zulassungsstelle, Anschrift und wie Sie ein ${k.code}-Wunschkennzeichen bekommen – ohne Behördentermin.`,
    alternates: { canonical: `/kennzeichen/${k.slug}/` },
  };
}

export default async function KennzeichenDetail({ params }: { params: Promise<{ kuerzel: string }> }) {
  const { kuerzel } = await params;
  const k = getKennzeichen(kuerzel);
  if (!k) notFound();

  const main = k.stellen[0];
  const city = getCity(main.slug);
  const faq = [
    {
      question: `Wofür steht das Kennzeichen ${k.code}?`,
      answer: `Das Unterscheidungszeichen ${k.code} steht für ${k.name}. Zuständig ist ${k.stellen
        .map((s) => `die Zulassungsstelle ${s.stadt} (${s.behoerde.wert})`)
        .join(" und ")}.`,
    },
    {
      question: `Wie bekomme ich ein ${k.code}-Wunschkennzeichen?`,
      answer: `Über uns kostet der Wunschkennzeichen-Service ${P.wunschkennzeichen} zusätzlich zur Zulassung – Verfügbarkeitsprüfung, Reservierung und Zuteilung inklusive. ${wunschkennzeichenHinweis}`,
    },
    {
      question: `Muss ich nach dem Umzug ein ${k.code}-Kennzeichen nehmen?`,
      answer: `Nein. Seit 2015 dürfen Sie Ihr bisheriges Kennzeichen bei einem Umzug innerhalb Deutschlands behalten. Ein ${k.code}-Kennzeichen bekommen Sie nur, wenn Sie es bei der Ummeldung ausdrücklich wünschen.`,
    },
    {
      question: `Kann ich ein ${k.code}-Kennzeichen ohne Termin beantragen?`,
      answer: `Ja, über ${site.name}: Sie beauftragen online oder per WhatsApp, wir reichen den Antrag mit Ihrer Vollmacht bei der zuständigen Behörde ein. Neuzulassung, Ummeldung und Umschreibung kosten ${P.zulassung} inklusive amtlicher Gebühren.`,
    },
  ];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Kennzeichen", href: "/kennzeichen/" }, { name: k.code }]} />
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
            <span
              className="inline-flex h-20 min-w-[9rem] items-center justify-center rounded-lg border-4 border-ink-900 bg-white px-5 font-display text-4xl font-bold tracking-wider text-ink-900 shadow-card"
              aria-hidden
            >
              {k.code}
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
                Kennzeichen {k.code}: {k.name}
              </h1>
              <p className="mt-3 text-lg text-ink-600">
                Zuständig: {k.stellen.map((s) => s.behoerde.wert).join(" · ")}
              </p>
              {k.hinweis && <p className="mt-2 text-sm text-ink-600">Hinweis: {k.hinweis}</p>}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2">
          {k.stellen.map((s) => (
            <Link
              key={s.slug}
              href={`/zulassungsstelle/${s.slug}/`}
              className="group flex gap-3 rounded-2xl border border-ink-200 bg-white p-5 shadow-card transition-colors hover:border-brand-300"
            >
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
              <span>
                <span className="block font-display font-bold text-ink-900 group-hover:text-brand-800">
                  Zulassungsstelle {s.stadt}
                </span>
                {s.standorte[0] && (
                  <span className="mt-1 block text-sm text-ink-600">
                    {s.standorte[0].strasse}, {s.standorte[0].plz} {s.standorte[0].ort}
                  </span>
                )}
                {s.zustaendigkeit && <span className="mt-1 block text-sm text-ink-600">{s.zustaendigkeit.wert}</span>}
                <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                  Adresse, Termin &amp; i-Kfz <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </span>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
            <Sparkles className="h-5 w-5 text-brand-700" aria-hidden />
            {k.code}-Wunschkennzeichen
          </h2>
          <p className="mt-3 leading-relaxed text-ink-700">
            Ihre Initialen oder ein Geburtsdatum hinter dem {k.code}? Wir prüfen die Verfügbarkeit, reservieren die
            Kombination bei der zuständigen Behörde und kümmern uns um die Zuteilung im Rahmen Ihrer Zulassung – für{" "}
            {P.wunschkennzeichen} zusätzlich.
          </p>
          <p className="mt-2 text-sm text-ink-600">{wunschkennzeichenHinweis}</p>
          <p className="mt-3 text-sm">
            <Link href="/ratgeber/wunschkennzeichen-reservieren/" className="font-semibold text-brand-700 underline underline-offset-2">
              So funktioniert die Reservierung
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold text-ink-900">Häufige Fragen zum Kennzeichen {k.code}</h2>
          <div className="mt-5">
            <FaqAccordion items={faq} />
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-800">
            <strong className="font-display">Fahrzeug mit {k.code}-Kennzeichen zulassen?</strong> Ohne Termin, zum
            Festpreis.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {city && (
              <Link
                href={`/kfz-zulassung/${city.slug}/`}
                className="rounded-xl border-2 border-brand-300 px-4 py-2.5 text-center text-sm font-semibold text-brand-800 hover:bg-brand-50"
              >
                Kfz-Zulassung {city.name}
              </Link>
            )}
            <TrackedLink
              href="/auftrag/"
              event="cta_click"
              props={{ position: "kennzeichen", page: k.slug }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Jetzt beauftragen <ArrowRight className="h-4 w-4" aria-hidden />
            </TrackedLink>
          </div>
        </div>

        <p className="text-xs text-ink-500">
          Quelle zur Bedeutung des Kürzels:{" "}
          <a href={k.quelle} target="_blank" rel="noopener noreferrer" className="break-all underline">
            {k.quelle}
          </a>
        </p>
      </div>

      <CTASection />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
