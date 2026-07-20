import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Clock4,
  Handshake,
  Headset,
  Laptop,
  Mail,
  MapPin,
  MessageCircle,
  MessagesSquare,
  Phone,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import HeroFlowAnimation from "@/components/HeroFlowAnimation";
import ServiceCard from "@/components/ServiceCard";
import PackageCards from "@/components/PackageCards";
import Testimonials from "@/components/Testimonials";
import AuftragForm from "@/components/AuftragForm";
import FaqAccordion from "@/components/FaqAccordion";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { sortedServices } from "@/lib/services";
import { faqItems } from "@/lib/faq";
import { site, whatsAppLink } from "@/lib/site";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-600">
      {children}
    </p>
  );
}

const ablaufSteps = [
  {
    icon: MessagesSquare,
    title: "Kontaktaufnahme",
    text: "Starten Sie den Auftrags-Assistenten oder schreiben Sie uns per WhatsApp.",
  },
  {
    icon: Headset,
    title: "Wir melden uns",
    text: "Sie erhalten schnell eine Rückmeldung mit verbindlichem Angebot und Checkliste.",
  },
  {
    icon: Handshake,
    title: "Unterlagen digital",
    text: "Fotos oder Scans genügen – wir prüfen alles und fordern nur nach, was wirklich fehlt.",
  },
  {
    icon: Rocket,
    title: "Zulassung läuft",
    text: "Wir erledigen den Behördenvorgang; Kennzeichen und Papiere kommen zu Ihnen.",
  },
] as const;

export default function HomePage() {
  const featured = sortedServices.filter((s) => s.category === "zulassung").slice(0, 6);

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="bg-hero relative overflow-hidden">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-2 lg:pb-24 lg:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              Digitaler Zulassungsdienst · deutschlandweit
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] text-ink-900 sm:text-5xl lg:text-6xl">
              Fahrzeug-Zulassung
              <br />
              <span className="bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">
                leicht gemacht
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Der Service für Privatkunden, Autohäuser &amp; Gewerbe. In wenigen Minuten
              beauftragt – schnell, sicher und vollständig online.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/auftrag"
                className="flex items-center justify-center gap-2 rounded-[14px] bg-brand-600 px-8 py-4 font-display text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition-all duration-200 hover:bg-brand-700 hover:shadow-brand-600/40"
              >
                Jetzt starten
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <a
                href="#ablauf"
                className="flex items-center justify-center gap-2 rounded-[14px] border-2 border-ink-200 bg-white px-8 py-4 font-display text-base font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
              >
                Mehr erfahren
              </a>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-600">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden /> DSGVO-konform
              </span>
              <span className="flex items-center gap-1.5">
                <Laptop className="h-4 w-4 text-brand-600" aria-hidden /> i-Kfz-Verfahren
              </span>
              <span className="flex items-center gap-1.5">
                <Clock4 className="h-4 w-4 text-brand-600" aria-hidden /> Abmeldung oft taggleich
              </span>
            </div>
          </div>

          <HeroFlowAnimation />
        </div>
      </section>

      {/* ============ LEISTUNGEN ============ */}
      <section id="leistungen" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Unsere Leistungen</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Alles rund um Ihre Fahrzeugzulassung
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Vom Neuwagen bis zur Stilllegung – wir übernehmen jeden Vorgang bei der
              Zulassungsstelle für Sie.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((s, i) => (
              <Reveal key={s.slug} delay={i * 0.06}>
                <ServiceCard service={s} />
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link
              href="/leistungen"
              className="group inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Alle Leistungen ansehen
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </p>
        </div>
      </section>

      {/* ============ ABLAUF ============ */}
      <section id="ablauf" className="bg-gradient-to-b from-brand-50 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Unser Ablauf</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              So einfach geht’s
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Wir haben die Fahrzeugzulassung digitalisiert. Lehnen Sie sich zurück,
              während wir uns um alles kümmern.
            </p>
          </Reveal>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {ablaufSteps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.08}>
                <div className="relative text-center">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-600/25">
                    <s.icon className="h-7 w-7" aria-hidden />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink-900 font-display text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="mt-12 text-center">
            <p className="text-ink-700">
              Überzeugt? Starten Sie jetzt und sparen Sie wertvolle Zeit!
            </p>
            <Link
              href="/auftrag"
              className="mt-5 inline-flex items-center gap-2 rounded-[14px] bg-brand-600 px-8 py-4 font-display text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition-colors duration-200 hover:bg-brand-700"
            >
              Jetzt starten
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ PAKETE ============ */}
      <section id="pakete" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Pakete</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Transparente Preise
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Wählen Sie das Paket, das zu Ihnen passt. Amtliche Gebühren und Kennzeichen
              weisen wir immer getrennt aus – 1:1, ohne Aufschlag.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <PackageCards />
          </Reveal>
          <p className="mt-8 text-center text-sm text-ink-600">
            Spezielle Anforderungen?{" "}
            <Link href="/kontakt" className="font-semibold text-brand-600 underline underline-offset-2">
              Kontaktieren Sie uns für ein maßgeschneidertes Angebot.
            </Link>{" "}
            Alle Einzelpreise:{" "}
            <Link href="/preise" className="font-semibold text-brand-600 underline underline-offset-2">
              Preisübersicht →
            </Link>
          </p>
        </div>
      </section>

      {/* ============ ANFRAGE (Assistent) ============ */}
      <section id="anfrage" className="bg-gradient-to-b from-white to-brand-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Ihre Anfrage</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              In 4 Schritten zum Auftrag
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-600">
              Beantworten Sie ein paar kurze Fragen – wir melden uns umgehend mit Ihrem
              verbindlichen Angebot zurück.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
              <AuftragForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ KUNDENSTIMMEN ============ */}
      <section id="kundenstimmen" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Kundenstimmen</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Das erwartet Sie bei uns
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-12">
            <Testimonials />
          </Reveal>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="bg-ink-50 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Häufige Fragen
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <FaqAccordion items={faqItems.slice(0, 4)} />
          </Reveal>
          <p className="mt-6 text-center">
            <Link
              href="/faq"
              className="font-display text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              Alle Fragen &amp; Antworten →
            </Link>
          </p>
        </div>
      </section>

      {/* ============ KONTAKT ============ */}
      <section id="kontakt" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="text-center">
            <Eyebrow>Kontakt</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Nehmen Sie Kontakt mit uns auf
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-600">
              Wir sind für Sie da und helfen bei allen Fragen rund um die Fahrzeugzulassung.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Reveal>
              <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <MapPin className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink-900">Standort</h3>
                <p className="mt-2 text-sm text-ink-600">
                  {site.company.street}
                  <br />
                  {site.company.zipCity}
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                className="block h-full cursor-pointer rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Phone className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink-900">Telefon</h3>
                <p className="mt-2 text-sm text-ink-600">{site.contact.phoneDisplay}</p>
              </a>
            </Reveal>
            <Reveal delay={0.12}>
              <a
                href={`mailto:${site.contact.email}`}
                className="block h-full cursor-pointer rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Mail className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink-900">E-Mail</h3>
                <p className="mt-2 break-all text-sm text-ink-600">{site.contact.email}</p>
              </a>
            </Reveal>
            <Reveal delay={0.18}>
              <a
                href={whatsAppLink("Hallo EasyZulassung, ich habe eine Frage.")}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full cursor-pointer rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
              >
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <MessageCircle className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-base font-bold text-ink-900">WhatsApp</h3>
                <p className="mt-2 text-sm text-ink-600">{site.contact.hours}</p>
              </a>
            </Reveal>
          </div>
          <Reveal className="mt-10 text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700">
              <BadgeCheck className="h-4 w-4" aria-hidden />
              Digitale Zulassung im behördlichen i-Kfz-Verfahren · sichere Datenverarbeitung
            </p>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
