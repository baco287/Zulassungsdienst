import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowRight, CalendarDays, Clock4, ExternalLink, Globe, Landmark, MapPin } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Reveal from "@/components/Reveal";
import TrackedLink from "@/components/TrackedLink";
import ServicePriceGrid from "@/components/ServicePriceGrid";
import { getZulassungsstelle, kennzeichenSlug, publishedStellen, splitBedeutung, type Zulassungsstelle } from "@/lib/zulassungsstellen";
import { getCity } from "@/lib/staedte";
import { getService } from "@/lib/services";
import { P } from "@/lib/pricing";
import { site } from "@/lib/site";
import { ORG_ID } from "@/lib/catalog";
import { robotsFor, stelleIndexable } from "@/lib/indexGate";
import { fitTitle } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return publishedStellen.map((z) => ({ slug: z.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const z = getZulassungsstelle(slug);
  if (!z) return {};
  const all = z.kuerzel.map((k) => k.code);
  const codes = all.length > 3 ? `${all.slice(0, 3).join(", ")} u. a.` : all.join(", ");
  // Beschreibung max. ca. 160 Zeichen: bei langen Namen stufenweise kürzer.
  const description = [
    `Zulassungsstelle ${z.stadt} (${codes}): Anschrift, Zuständigkeit, Termin und i-Kfz – mit Quellen. Ohne Termin über uns: Zulassung ${P.zulassung} inkl. Gebühren.`,
    `Zulassungsstelle ${z.stadt} (${codes}): Anschrift, Termin und i-Kfz. Ohne Termin über uns: Zulassung ${P.zulassung} inkl. Gebühren.`,
    `Zulassungsstelle ${z.stadt}: Anschrift, Termin, i-Kfz. Zulassung über uns ${P.zulassung} inkl. Gebühren.`,
  ].find((d, i, list) => d.length <= 160 || i === list.length - 1)!;
  return {
    // Kurzer Stadtname (z. B. "Freiburg" statt "Freiburg im Breisgau"), Titel max. ~60 Zeichen.
    title: (() => {
      const name = getCity(z.slug)?.name ?? z.stadt;
      // Ohne „Termin“: Die Seite informiert über die Behörde, sie vergibt keine Termine.
      const lang = `Zulassungsstelle ${name}: Adresse & Zuständigkeit`;
      const kurz = `Zulassungsstelle ${name}: Adresse`;
      return fitTitle(lang).absolute.endsWith(site.name) ? fitTitle(lang) : fitTitle(kurz);
    })(),
    description,
    alternates: { canonical: `/zulassungsstelle/${z.slug}/` },
    robots: robotsFor(stelleIndexable(z)),
  };
}

const dateFormat = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric" });

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function buildFaq(z: Zulassungsstelle) {
  const faq: { question: string; answer: string }[] = [];
  const first = z.standorte[0];
  if (first) {
    faq.push({
      question: `Wo ist die Zulassungsstelle ${z.stadt}?`,
      answer:
        z.standorte.length > 1
          ? `Die Zulassungsstelle ${z.stadt} (${z.behoerde.wert}) hat ${z.standorte.length} Standorte, unter anderem ${first.bezeichnung}, ${first.strasse}, ${first.plz} ${first.ort}. Alle Standorte stehen oben auf dieser Seite.`
          : `Anschrift der Zulassungsstelle ${z.stadt}: ${first.strasse}, ${first.plz} ${first.ort} (${z.behoerde.wert}).`,
    });
  }
  if (z.kuerzel.length) {
    faq.push({
      question: `Welches Kennzeichen bekomme ich in ${z.stadt}?`,
      answer: `Die Behörde vergibt das Unterscheidungszeichen ${z.kuerzel
        .map((k) => `${k.code} (${splitBedeutung(k.bedeutung).name})`)
        .join(", ")}. Wer umzieht, darf sein bisheriges Kennzeichen seit 2015 bundesweit behalten.`,
    });
  }
  faq.push({
    question: `Brauche ich einen Termin bei der Zulassungsstelle ${z.stadt}?`,
    answer: z.oeffnungszeiten?.hinweis
      ? `Die Behörde gibt dazu an: „${z.oeffnungszeiten.hinweis}“ Über ${site.name} brauchen Sie keinen eigenen Termin – wir reichen den Antrag mit Ihrer Vollmacht ein.`
      : `Ob vor Ort ein Termin nötig ist, regelt die Behörde selbst – bitte prüfen Sie das auf ihrer Website. Über ${site.name} brauchen Sie keinen eigenen Termin.`,
  });
  faq.push({
    question: `Kann ich mein Auto in ${z.stadt} online zulassen?`,
    answer: z.ikfzUrl
      ? `Ja, die Behörde verweist für Online-Vorgänge auf ihr i-Kfz-Portal (${host(z.ikfzUrl.wert)}). Für Zulassungen brauchen Sie dafür den Online-Ausweis mit PIN oder eine BundID mit ELSTER-Zertifikat. Ohne beides können Sie den Vorgang über uns beauftragen.`
      : `Online-Zulassungen laufen über das i-Kfz-Verfahren und setzen eine elektronische Identifizierung voraus – den Online-Ausweis mit PIN oder eine BundID mit ELSTER-Zertifikat. Ohne beides können Sie den Vorgang über uns beauftragen.`,
  });
  faq.push({
    question: `Was kostet die Zulassung in ${z.stadt} über ${site.name}?`,
    answer: `Neuzulassung, Ummeldung, Umschreibung und Wiederzulassung kosten ${P.zulassung} inklusive amtlicher Gebühren und Versand, die Abmeldung ${P.abmeldung}. Kennzeichenschilder liefern wir auf Wunsch für ${P.kennzeichen} pro Paar.`,
  });
  return faq;
}

export default async function ZulassungsstellePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const z = getZulassungsstelle(slug);
  if (!z) notFound();

  const city = getCity(z.slug);
  const faq = buildFaq(z);
  const sources = [
    ...new Set(
      [
        z.behoerde.quelle,
        z.website?.quelle,
        z.terminUrl?.quelle,
        z.ikfzUrl?.quelle,
        z.oeffnungszeiten?.quelle,
        z.zustaendigkeit?.quelle,
        ...z.standorte.map((s) => s.quelle),
        ...z.kuerzel.map((k) => k.quelle),
        ...z.besonderheiten.map((b) => b.quelle),
      ].filter((u): u is string => Boolean(u))
    ),
  ];
  const checklistServices = ["neuzulassung", "halterwechsel", "abmeldung"]
    .map((s) => getService(s))
    .filter((s) => s !== undefined);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Zulassungsstelle ${z.stadt}`,
    url: `${site.url}/zulassungsstelle/${z.slug}/`,
    inLanguage: "de",
    dateModified: z.geprueftAm,
    publisher: { "@id": ORG_ID },
    about: {
      "@type": "GovernmentOffice",
      name: z.behoerde.wert,
      ...(z.website ? { url: z.website.wert } : {}),
      ...(z.standorte[0]
        ? {
            address: {
              "@type": "PostalAddress",
              streetAddress: z.standorte[0].strasse,
              postalCode: z.standorte[0].plz,
              addressLocality: z.standorte[0].ort,
              addressCountry: "DE",
            },
          }
        : {}),
    },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Zulassungsstellen", href: "/zulassungsstelle/" }, { name: z.stadt }]} />
          <h1 className="mt-6 font-display text-3xl font-bold leading-tight text-ink-900 sm:text-4xl">
            Zulassungsstelle {z.stadt}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Zuständige Behörde: <strong className="text-ink-800">{z.behoerde.wert}</strong>
            {z.traeger ? ` (${z.traeger})` : ""}. Hier finden Sie Anschrift, Zuständigkeit und Online-Angebote der
            Zulassungsstelle {z.stadt} – und wie Sie Ihr Fahrzeug ohne eigenen Termin zulassen.
          </p>
          <p className="mt-4 flex items-start gap-2 text-sm text-ink-500">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
            <span>
              Angaben geprüft am <time dateTime={z.geprueftAm}>{dateFormat.format(new Date(z.geprueftAm))}</time>{" "}
              anhand der offiziellen Behördenseiten
            </span>
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-10 px-4 py-12 sm:px-6">
        <p className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-ink-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
          <span>
            {site.name} ist ein privater Zulassungsdienst und nicht die Zulassungsstelle {z.stadt}. Öffnungszeiten und
            Abläufe der Behörde können sich ändern – bitte prüfen Sie vor einem Besuch die verlinkte Behördenseite.
          </span>
        </p>

        <Reveal>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <Landmark className="h-5 w-5 text-brand-700" aria-hidden />
                Behörde &amp; Zuständigkeit
              </h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-ink-900">Behörde</dt>
                  <dd className="text-ink-700">{z.behoerde.wert}</dd>
                </div>
                {z.zustaendigkeit && (
                  <div>
                    <dt className="font-semibold text-ink-900">Zuständig für</dt>
                    <dd className="text-ink-700">{z.zustaendigkeit.wert}</dd>
                  </div>
                )}
                {z.kuerzel.length > 0 && (
                  <div>
                    <dt className="font-semibold text-ink-900">Kennzeichen</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {z.kuerzel.map((k) => (
                        <Link
                          key={k.code}
                          href={`/kennzeichen/${kennzeichenSlug(k.code)}/`}
                          className="rounded-md border-2 border-ink-900 bg-white px-2 py-0.5 font-display text-sm font-bold text-ink-900 hover:border-brand-700 hover:text-brand-800"
                          title={k.bedeutung}
                        >
                          {k.code}
                        </Link>
                      ))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold text-ink-900">Bundesland</dt>
                  <dd className="text-ink-700">{z.bundesland}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900">
                <Globe className="h-5 w-5 text-brand-700" aria-hidden />
                Offizielle Links
              </h2>
              <ul className="mt-4 space-y-3 text-sm">
                {z.website && (
                  <li>
                    <a href={z.website.wert} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-2">
                      Kfz-Zulassung auf {host(z.website.wert)} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                )}
                {z.terminUrl && (
                  <li>
                    <a href={z.terminUrl.wert} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-2">
                      Termin bei der Behörde buchen <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                )}
                {z.ikfzUrl && (
                  <li>
                    <a href={z.ikfzUrl.wert} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-brand-700 underline underline-offset-2">
                      i-Kfz-Onlineportal der Behörde <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  </li>
                )}
              </ul>
              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                Externe Links führen zu den Seiten der Behörde. {site.name} hat keinen Einfluss auf deren Inhalte.
              </p>
            </div>
          </section>
        </Reveal>

        {z.standorte.length > 0 && (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl font-bold text-ink-900">
                {z.standorte.length > 1 ? "Standorte" : "Anschrift"}
              </h2>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2">
                {z.standorte.map((s) => (
                  <li key={s.bezeichnung + s.strasse} className="flex gap-3 rounded-xl border border-ink-200 bg-white p-4">
                    <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                    <address className="not-italic text-sm leading-relaxed text-ink-700">
                      <strong className="block text-ink-900">{s.bezeichnung}</strong>
                      {s.strasse}
                      <br />
                      {s.plz} {s.ort}
                    </address>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        {z.oeffnungszeiten && (
          <Reveal>
            <section className="rounded-2xl border border-ink-200 bg-ink-50/60 p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900">
                <Clock4 className="h-5 w-5 text-brand-700" aria-hidden />
                {z.oeffnungszeiten.zeilen.length > 0 ? "Öffnungs- und Servicezeiten laut Behörde" : "Vorsprache laut Behörde"}
              </h2>
              {z.oeffnungszeiten.zeilen.length === 0 && (
                <p className="mt-3 text-sm text-ink-700">Die Behörde veröffentlicht keine festen Öffnungszeiten.</p>
              )}
              <ul className="mt-4 space-y-1 text-sm text-ink-800">
                {z.oeffnungszeiten.zeilen.map((zeile) => (
                  <li key={zeile}>{zeile}</li>
                ))}
              </ul>
              {z.oeffnungszeiten.hinweis && <p className="mt-3 text-sm font-semibold text-ink-900">{z.oeffnungszeiten.hinweis}</p>}
              <p className="mt-3 text-xs text-ink-500">
                Stand {dateFormat.format(new Date(z.geprueftAm))}, Quelle:{" "}
                <a href={z.oeffnungszeiten.quelle} target="_blank" rel="noopener noreferrer" className="underline">
                  {host(z.oeffnungszeiten.quelle)}
                </a>
                . Kurzfristige Änderungen sind möglich.
              </p>
            </section>
          </Reveal>
        )}

        {z.besonderheiten.length > 0 && (
          <Reveal>
            <section>
              <h2 className="font-display text-2xl font-bold text-ink-900">Gut zu wissen</h2>
              <ul className="mt-4 space-y-3">
                {z.besonderheiten.map((b) => (
                  <li key={b.wert} className="rounded-xl border border-ink-200 bg-white p-4 text-sm leading-relaxed text-ink-700">
                    {b.wert}
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        )}

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Online zulassen in {z.stadt}</h2>
            <p className="mt-4 leading-relaxed text-ink-700">
              {z.ikfzUrl
                ? `Die Zulassungsstelle ${z.stadt} bietet Online-Vorgänge über das i-Kfz-Verfahren an.`
                : `Online-Vorgänge laufen bundesweit über das i-Kfz-Verfahren der Zulassungsbehörden.`}{" "}
              Für Zulassungen brauchen Sie eine elektronische Identifizierung – den Online-Ausweis mit PIN und
              NFC-Smartphone oder Kartenleser, alternativ eine BundID mit ELSTER-Zertifikat – sowie Fahrzeugpapiere mit
              Sicherheitscodes. Wer das nicht hat oder bei dem das Portal nicht weiterkommt, kann den
              Vorgang über uns beauftragen.
            </p>
            <p className="mt-3 text-sm">
              <Link href="/ikfz-funktioniert-nicht/" className="font-semibold text-brand-700 underline underline-offset-2">
                i-Kfz funktioniert nicht?
              </Link>{" "}
              ·{" "}
              <Link href="/kfz-zulassung-ohne-eid/" className="font-semibold text-brand-700 underline underline-offset-2">
                Zulassung ohne eID
              </Link>
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Zulassungsvorgänge über {site.name}</h2>
            <p className="mt-3 text-ink-700">
              Wir übernehmen alle gängigen Vorgänge bei der Zulassungsstelle {z.stadt} – ohne eigenen Termin, mit persönlicher
              Prüfung Ihrer Unterlagen.
            </p>
            <div className="mt-6">
              <ServicePriceGrid showExtras={false} />
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Typische Unterlagen</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {checklistServices.map((s) => (
                <div key={s.slug} className="rounded-xl border border-ink-200 bg-white p-4">
                  <h3 className="font-display font-bold text-ink-900">{s.shortName ?? s.name}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-ink-700">
                    {s.checklist.slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Häufige Fragen zur Zulassungsstelle {z.stadt}</h2>
            <div className="mt-5">
              <FaqAccordion items={faq} />
            </div>
          </section>
        </Reveal>

        <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-ink-800">
            <strong className="font-display">Ohne Termin zulassen?</strong> Wir übernehmen den Behördengang in {z.stadt}.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {city && (
              <Link
                href={`/kfz-zulassung/${city.slug}/`}
                className="rounded-xl border-2 border-brand-300 px-4 py-2.5 text-center text-sm font-semibold text-brand-800 hover:bg-white"
              >
                Kfz-Zulassung {city.name}
              </Link>
            )}
            <TrackedLink
              href="/auftrag/"
              event="cta_click"
              props={{ position: "zulassungsstelle", page: z.slug }}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Auftrag starten <ArrowRight className="h-4 w-4" aria-hidden />
            </TrackedLink>
          </div>
        </div>

        <section className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">Quellen</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {sources.map((u) => (
              <li key={u}>
                <a href={u} target="_blank" rel="noopener noreferrer" className="break-all text-brand-700 underline underline-offset-2">
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <CTASection />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </>
  );
}
