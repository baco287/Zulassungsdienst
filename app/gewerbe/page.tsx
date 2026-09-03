import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Handshake,
  Layers,
  MapPinned,
  UserRound,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqAccordion from "@/components/FaqAccordion";
import GewerbeCTA from "@/components/GewerbeCTA";
import Reveal from "@/components/Reveal";
import { gewerbeSegments, gewerbeHubFaq } from "@/lib/gewerbe";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Zulassungsservice für Autohäuser & Fuhrparks",
  description:
    "Kfz-Zulassungen im Volumen: Sammelabwicklung, Staffelkonditionen und ein fester Ansprechpartner für Autohäuser, Händler, Fuhrparks und Leasing.",
  keywords: [
    "Zulassungsservice Gewerbe",
    "Zulassungsdienst Autohaus",
    "Flottenzulassung",
    "Kfz-Zulassung Firmenkunden",
    "Sammelzulassung",
  ],
};

const usps = [
  {
    icon: Layers,
    title: "Sammelabwicklung",
    text: "Mehrere Vorgänge gebündelt einreichen – wir takten sie durch und liefern gesammelt zurück.",
  },
  {
    icon: UserRound,
    title: "Fester Ansprechpartner",
    text: "Eine Person kennt Ihre Abläufe und Prioritäten – kein Ticketsystem, keine Warteschleife.",
  },
  {
    icon: MapPinned,
    title: "Bundesweit",
    text: "Wir bedienen jede deutsche Zulassungsbehörde – egal, wo Ihre Standorte oder Kunden sitzen.",
  },
  {
    icon: Handshake,
    title: "Faire Konditionen",
    text: "Preise nach Vorgangsart und Volumen, ohne Grundgebühr und ohne Vertragsbindung.",
  },
] as const;

const steps = [
  {
    step: "1",
    title: "Rahmenvollmacht einrichten",
    text: "Einmalig aufgesetzt – danach laufen alle Vorgänge formlos, ohne neue Formulare je Fahrzeug.",
  },
  {
    step: "2",
    title: "Vorgänge übermitteln",
    text: "Digital per E-Mail/WhatsApp oder über unsere tägliche Abholung – einzeln oder als Liste.",
  },
  {
    step: "3",
    title: "Rücklieferung & Sammelrechnung",
    text: "Kennzeichen und Papiere kommen gebündelt zurück; die Rechnung weist alle Vorgänge sauber aus.",
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Zulassungsservice für Gewerbekunden",
  serviceType: "Kfz-Zulassungsservice für Unternehmen",
  description:
    "Kfz-Zulassungen im Volumen für Autohäuser, Autohändler, Fuhrparks und Leasing-Anbieter: Sammelabwicklung, Staffelkonditionen, bundesweite Abdeckung.",
  url: `${site.url}/gewerbe/`,
  areaServed: { "@type": "Country", name: "Deutschland" },
  audience: { "@type": "BusinessAudience", name: "Autohäuser, Autohändler, Fuhrparks, Leasing-Anbieter" },
  provider: { "@type": "LocalBusiness", name: site.name, url: site.url, telephone: site.contact.phone },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: gewerbeHubFaq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function GewerbePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Gewerbe" }]} />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                Für Gewerbekunden
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
                Zulassungen im Volumen – ohne eigenen Behördenaufwand
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
                Autohäuser, Händler, Fuhrparks und Leasing-Anbieter lagern ihre
                Kfz-Zulassungen an uns aus: Sammelabwicklung, feste Ansprechperson
                und Express für eilige Auslieferungen – deutschlandweit.
              </p>
              <ul className="mt-6 space-y-2.5">
                {[
                  "Abrechnung pro Vorgang – keine Grundgebühr, keine Vertragsbindung",
                  "Tägliche Abholung Ihrer Unterlagen möglich",
                  "Abmeldungen meist taggleich, Zulassungen in 1–3 Werktagen",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <Reveal>
              <div className="relative overflow-hidden rounded-3xl border border-ink-200 shadow-card">
                <Image
                  src="/images/autohaus.jpg"
                  alt="Moderner Autohaus-Showroom mit Neuwagen hinter einer Glasfassade"
                  width={1264}
                  height={848}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 550px, 100vw"
                  priority
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {usps.map((u, i) => (
              <Reveal key={u.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <u.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h2 className="mt-4 font-display text-lg font-bold text-ink-900">{u.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{u.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              So läuft die Zusammenarbeit
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.step} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-display font-bold text-white">
                    {s.step}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Für Ihre Branche
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Jede Branche hat eigene Abläufe – deshalb haben wir den Service je
              Zielgruppe zugeschnitten.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {gewerbeSegments.map((seg, i) => (
              <Reveal key={seg.slug} delay={i * 0.06} className="h-full">
                <Link
                  href={`/gewerbe/${seg.slug}/`}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Building2 className="h-5.5 w-5.5" style={{ height: "1.375rem", width: "1.375rem" }} aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold text-ink-900 group-hover:text-brand-800">
                    {seg.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{seg.description}</p>
                  <span className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-700">
                    Mehr erfahren
                    <ArrowRight
                      className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Häufige Fragen von Gewerbekunden
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <FaqAccordion items={gewerbeHubFaq} />
          </Reveal>
        </div>
      </section>

      <GewerbeCTA />

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
