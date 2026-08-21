import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, FileDown, Lightbulb, MapPin } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import { anleitungSteps } from "@/lib/anleitung";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Auto online zulassen – Schritt-für-Schritt-Anleitung mit Bildern",
  description:
    "So läuft die Kfz-Zulassung mit DeutscheZulassung: 8 bebilderte Schritte vom Auftrag über Unterlagen und Sicherheitscodes bis zum Schildermacher vor Ort – ohne Behördengang.",
  keywords: [
    "Auto online zulassen Anleitung",
    "Kfz-Zulassung Schritt für Schritt",
    "Zulassung ohne Behördengang Ablauf",
    "Kennzeichen Schildermacher",
  ],
};

const PDF_PATH = "/downloads/anleitung-online-zulassung.pdf";

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Auto online zulassen mit DeutscheZulassung – Schritt für Schritt",
  description:
    "Bebilderte Anleitung: vom Online-Auftrag über Unterlagen und Sicherheitscodes bis zu Kennzeichen vom lokalen Schildermacher.",
  inLanguage: "de",
  totalTime: "P3D",
  step: anleitungSteps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.text,
    image: `${site.url}${s.image.src}`,
    url: `${site.url}/anleitung/#schritt-${i + 1}`,
  })),
};

export default function AnleitungPage() {
  return (
    <>
      {/* Kopf – im Druck als Titelblock sichtbar */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16 print:bg-none print:py-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="no-print">
            <Breadcrumbs items={[{ name: "Schritt-für-Schritt-Anleitung" }]} />
          </div>
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_20rem] print:mt-0 print:block">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
                Bilderanleitung
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl print:text-3xl">
                Auto online zulassen – so geht’s Schritt für Schritt
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-ink-600 print:text-base">
                Acht Schritte vom Auftrag bis zum montierten Kennzeichen. Sie erledigen
                Ihren Teil bequem am Handy, wir übernehmen die Behörde – und die Schilder
                holen Sie frisch geprägt bei einem Schildermacher in Ihrer Nähe.
              </p>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-600">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-brand-600" aria-hidden />
                  Ihr Aufwand: ca. 15 Minuten
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden />
                  Zulassung in 1–3 Werktagen
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-brand-600" aria-hidden />
                  Kennzeichen vom Schildermacher vor Ort
                </span>
              </div>
              <div className="no-print mt-6 flex flex-wrap gap-3">
                <a
                  href={PDF_PATH}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-ink-200 bg-white px-5 py-3 font-display font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
                >
                  <FileDown className="h-5 w-5 text-brand-700" aria-hidden />
                  Anleitung als PDF
                </a>
                <Link
                  href="/auftrag/"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-700 px-5 py-3 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
                >
                  Jetzt starten
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
            <ol className="rounded-2xl border border-ink-200 bg-white p-5 text-sm shadow-card print:hidden">
              <li className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-ink-500">
                Die 8 Schritte
              </li>
              {anleitungSteps.map((s, i) => (
                <li key={s.title} className="flex gap-2.5 py-1">
                  <a href={`#schritt-${i + 1}`} className="flex gap-2.5 text-ink-700 hover:text-brand-700">
                    <span className="font-semibold text-brand-700">{i + 1}.</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Schritte */}
      <section className="py-12 print:py-4">
        <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6 print:space-y-6">
          {anleitungSteps.map((step, i) => (
            <article
              key={step.title}
              id={`schritt-${i + 1}`}
              className="grid scroll-mt-24 gap-6 rounded-3xl border border-ink-200 bg-white p-5 shadow-card sm:p-7 items-center lg:grid-cols-2 print:break-inside-avoid print:grid-cols-2 print:gap-5 print:rounded-xl print:p-4 print:shadow-none"
            >
              <div className={i % 2 === 1 ? "lg:order-2 print:order-none" : ""}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-display text-base font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-brand-700">
                  {step.meta}
                </p>
                <h2 className="mt-1 font-display text-2xl font-bold text-ink-900 print:text-xl">
                  {step.title}
                </h2>
                <p className="mt-3 leading-relaxed text-ink-700 print:text-sm">{step.text}</p>
                {step.bullets && (
                  <ul className="mt-3 space-y-2">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {step.tip && (
                  <p className="mt-4 flex items-start gap-2 rounded-xl bg-brand-50 p-3.5 text-sm leading-relaxed text-ink-700">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                    {step.tip}
                  </p>
                )}
              </div>
              <div className={`overflow-hidden rounded-2xl border border-ink-200 ${i % 2 === 1 ? "lg:order-1 print:order-none" : ""}`}>
                <Image
                  src={step.image.src}
                  alt={step.image.alt}
                  width={1264}
                  height={848}
                  priority
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 520px, 100vw"
                />
              </div>
            </article>
          ))}

          <div className="rounded-3xl border border-brand-200 bg-brand-50/60 p-6 sm:p-8 print:break-inside-avoid print:rounded-xl print:p-5">
            <h2 className="font-display text-2xl font-bold text-ink-900 print:text-xl">
              Das Wichtigste auf einen Blick
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                "Kein Behördentermin, kein Personalausweis mit Online-Funktion nötig",
                "Fotos der Unterlagen genügen – per Formular oder WhatsApp",
                "Festpreis-Bestätigung vor dem Auftrag, bezahlt wird erst danach",
                "Kennzeichen prägen Sie beim Schildermacher vor Ort (ca. 20–35 € pro Paar) – ohne Wartezeit auf Versand",
                "Plaketten und Fahrzeugschein kommen per Post, bis dahin fahren Sie mit dem vorläufigen Nachweis",
                "Ihre Ansprechperson bleibt per WhatsApp erreichbar – vor, während und nach dem Vorgang",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-ink-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 hidden text-xs text-ink-500 print:block">
              {site.name} · {site.url.replace("https://", "")} · {site.contact.phoneDisplay} ·{" "}
              {site.contact.email} · Stand 2026, Änderungen vorbehalten
            </p>
          </div>
        </div>
      </section>

      <div className="no-print">
        <CTASection />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
    </>
  );
}
