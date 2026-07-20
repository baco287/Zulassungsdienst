import Link from "next/link";
import {
  ArrowRight,
  BadgeEuro,
  Clock4,
  HeartHandshake,
  Laptop,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import ProcessAnimation from "@/components/ProcessAnimation";
import ServiceCard from "@/components/ServiceCard";
import FaqAccordion from "@/components/FaqAccordion";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { sortedServices } from "@/lib/services";
import { faqItems } from "@/lib/faq";
import { whatsAppLink } from "@/lib/site";

const trustPoints = [
  { icon: Laptop, label: "100 % digital", detail: "kein Behördengang" },
  { icon: Clock4, label: "Schnell", detail: "Abmeldung meist taggleich" },
  { icon: BadgeEuro, label: "Transparent", detail: "Gebühren 1:1, ohne Aufschlag" },
  { icon: HeartHandshake, label: "Persönlich", detail: "feste Ansprechperson" },
];

const valueProps = [
  {
    icon: ShieldCheck,
    title: "Sicher & DSGVO-konform",
    text: "Ihre Unterlagen werden verschlüsselt übertragen, nur zur Auftragsabwicklung verwendet und fristgerecht gelöscht.",
  },
  {
    icon: BadgeEuro,
    title: "Ehrliche Preise",
    text: "Arbeitspreis, amtliche Gebühren und Kennzeichen weisen wir getrennt aus. Amtliche Kosten reichen wir 1:1 weiter – ohne versteckte Aufschläge.",
  },
  {
    icon: HeartHandshake,
    title: "Persönliche Betreuung",
    text: "Kein Callcenter: Bei uns begleitet eine feste Ansprechperson Ihren Auftrag – erreichbar per WhatsApp, E-Mail und Telefon.",
  },
];

export default function HomePage() {
  const featured = sortedServices.filter((s) => s.category === "zulassung").slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="bg-grid relative overflow-hidden bg-ink-50">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-brand-800">
              <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden />
              Digitaler Zulassungsdienst
            </p>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
              Kfz-Zulassung <span className="text-brand-700">ohne Behördengang.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
              Neuzulassung, Ummeldung oder Abmeldung: Sie senden uns Ihre Unterlagen
              digital – wir erledigen den Rest bei der Zulassungsstelle. Deutschlandweit,
              transparent und persönlich betreut.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auftrag"
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-800"
              >
                Jetzt Auftrag starten
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <a
                href={whatsAppLink("Hallo EasyZulassung, ich interessiere mich für eine Kfz-Zulassung.")}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-ink-300 bg-white px-7 py-4 font-display text-base font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
              >
                <MessageCircle className="h-5 w-5 text-brand-700" aria-hidden />
                WhatsApp-Beratung
              </a>
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-ink-500">
              <LockKeyhole className="h-4 w-4 text-brand-700" aria-hidden />
              Unverbindliche Anfrage · Antwort meist innerhalb weniger Minuten
            </p>
          </div>

          <Reveal delay={0.15}>
            <ProcessAnimation />
          </Reveal>
        </div>
      </section>

      {/* Trust-Bar */}
      <section aria-label="Unsere Versprechen" className="border-y border-ink-200 bg-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
          {trustPoints.map((t) => (
            <div key={t.label} className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <t.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-ink-900">{t.label}</p>
                <p className="text-xs text-ink-500">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Leistungen */}
      <section className="bg-ink-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                  Unsere Leistungen
                </h2>
                <p className="mt-3 max-w-xl text-ink-600">
                  Vom Neuwagen bis zur Stilllegung – wir übernehmen jeden Zulassungsvorgang.
                </p>
              </div>
              <Link
                href="/leistungen"
                className="group flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Alle Leistungen
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s, i) => (
              <Reveal key={s.slug} delay={i * 0.06}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Werte */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Warum EasyZulassung?
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {valueProps.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-7 shadow-card">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white">
                    <v.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-bold text-ink-900">{v.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ink-600">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ-Teaser */}
      <section className="bg-ink-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-center font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Häufige Fragen
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <FaqAccordion items={faqItems.slice(0, 4)} />
          </Reveal>
          <p className="mt-6 text-center">
            <Link
              href="/faq"
              className="font-display text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Alle Fragen & Antworten →
            </Link>
          </p>
        </div>
      </section>

      <CTASection />
    </>
  );
}
