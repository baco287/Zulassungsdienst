import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarX2,
  CheckCircle2,
  CreditCard,
  FileSearch,
  FileWarning,
  KeyRound,
  Landmark,
  Mail,
  MapPin,
  PackageCheck,
  Phone,
  ScanLine,
  ShieldCheck,
  SmartphoneNfc,
  UserCheck,
} from "lucide-react";
import HeroFlowAnimation from "@/components/HeroFlowAnimation";
import ServicePriceGrid from "@/components/ServicePriceGrid";
import ComparisonTable from "@/components/ComparisonTable";
import Testimonials from "@/components/Testimonials";
import FaqAccordion from "@/components/FaqAccordion";
import CTASection from "@/components/CTASection";
import Maxx from "@/components/Maxx";
import Reveal from "@/components/Reveal";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import TrackedLink from "@/components/TrackedLink";
import { faqItems } from "@/lib/faq";
import { cities } from "@/lib/staedte";
import { publishedStellen } from "@/lib/zulassungsstellen";
import { P } from "@/lib/pricing";
import { CHECKOUT_ENABLED } from "@/lib/features";
import { site, whatsAppLink } from "@/lib/site";

const description = `Auto online zulassen ohne eID und ohne Behördentermin: Neuzulassung, Ummeldung und Halterwechsel für ${P.zulassung}, Abmeldung ${P.abmeldung} – inkl. amtlicher Gebühren.`;

export const metadata: Metadata = {
  title: { absolute: `Kfz-Zulassung online ohne eID | ${site.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title: `Kfz-Zulassung online ohne eID | ${site.name}`,
    description,
  },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand-600">{children}</p>
  );
}

function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Reveal className="text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">{title}</h2>
      {children && <p className="mx-auto mt-4 max-w-2xl text-ink-600">{children}</p>}
    </Reveal>
  );
}

const steps = [
  {
    icon: FileSearch,
    title: "Leistung wählen",
    text: "Vorgang auswählen und Fahrzeug- sowie Halterdaten eingeben. Der Assistent zeigt, welche Unterlagen Sie brauchen.",
  },
  CHECKOUT_ENABLED
    ? {
        icon: CreditCard,
        title: "Unterlagen hochladen & bezahlen",
        text: "Handyfotos genügen. Sie sehen den Endpreis vorab und bezahlen sicher über unseren Zahlungsanbieter.",
      }
    : {
        icon: ScanLine,
        title: "Unterlagen senden",
        text: "Handyfotos genügen – per Formular oder WhatsApp. Sie erhalten vorab Ihre Festpreis-Bestätigung.",
      },
  {
    icon: UserCheck,
    title: "Wir prüfen & beantragen",
    text: "Unser Team prüft alles persönlich, fragt bei Lücken nach und reicht den Antrag mit Ihrer Vollmacht bei der Behörde ein.",
  },
  {
    icon: PackageCheck,
    title: "Fertig",
    text: "Papiere und – falls gebucht – Kennzeichenschilder kommen per Versand. Abmeldebestätigungen erhalten Sie per E-Mail.",
  },
] as const;

const trust = [
  {
    icon: BadgeCheck,
    title: "Festpreis vor der Bestellung",
    text: "Sie sehen den Endpreis inklusive amtlicher Gebühren, bevor Sie verbindlich beauftragen. Extras wählen Sie selbst.",
  },
  {
    icon: UserCheck,
    title: "Persönlich geprüft",
    text: "Ein Mensch aus unserem Team prüft Ihre Unterlagen und meldet sich, wenn etwas fehlt – keine anonyme Warteschleife.",
  },
  {
    icon: Landmark,
    title: "Privater Dienstleister, keine Behörde",
    text: "Wir handeln mit Ihrer Vollmacht. Über die Zulassung entscheidet immer die zuständige Zulassungsbehörde.",
  },
  {
    icon: ShieldCheck,
    title: "Sorgfältig mit Ihren Daten",
    text: "Verschlüsselte Übertragung, Verwendung nur für Ihren Auftrag und Löschung nach Abschluss.",
    href: "/datensicherheit/",
    linkLabel: "So schützen wir Ihre Daten",
  },
] as const;

const eidBenefits = [
  {
    icon: KeyRound,
    title: "Keine PIN, kein Online-Ausweis",
    text: "Für eine Zulassung über i-Kfz brauchen Sie den Online-Ausweis mit PIN oder ein ELSTER-Zertifikat. Bei uns genügt ein Foto Ihres Ausweises.",
  },
  {
    icon: SmartphoneNfc,
    title: "Kein NFC-Gerät, keine App",
    text: "Sie brauchen weder AusweisApp noch Kartenleser. Ein Smartphone mit Kamera oder ein Scanner reicht völlig.",
  },
  {
    icon: CalendarX2,
    title: "Kein Behördentermin",
    text: "Keine Terminsuche, keine Wartemarke, kein Urlaubstag. Wir übernehmen den Behördenweg für Sie.",
  },
] as const;

const problems = [
  {
    icon: AlertTriangle,
    title: "i-Kfz funktioniert nicht",
    text: "Ausweis wird nicht erkannt, PIN gesperrt oder das Portal bricht ab? Die häufigsten Ursachen und Lösungen.",
    href: "/ikfz-funktioniert-nicht/",
  },
  {
    icon: FileWarning,
    title: "Fehlermeldung im Portal",
    text: "Was typische i-Kfz-Fehlermeldungen bedeuten und wie Sie trotzdem zur Zulassung kommen.",
    href: "/ikfz-fehlermeldung/",
  },
  {
    icon: ScanLine,
    title: "Sicherheitscode fehlt",
    text: "Wo die Codes auf Fahrzeugschein, Fahrzeugbrief und Plaketten sitzen – und was bei alten Papieren gilt.",
    href: "/ratgeber/fahrzeugpapiere-sicherheitscodes/",
  },
  {
    icon: CalendarX2,
    title: "Kein Termin frei",
    text: "Wochenlange Wartezeit bei der Zulassungsstelle? Diese Wege führen ohne Termin zur Zulassung.",
    href: "/ratgeber/kein-termin-zulassungsstelle/",
  },
] as const;

export default function HomePage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.slice(0, 6).map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      {/* ============ HERO ============ */}
      <section className="bg-hero relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          <div className="blob -top-24 right-[-8%] h-[26rem] w-[26rem] bg-brand-300/40" />
          <div className="blob blob-delayed left-[-10%] top-1/4 h-80 w-80 bg-cyan-300/30" />
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-2 lg:pb-20 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
              </span>
              Privater Zulassungsdienst · bundesweit
            </p>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] text-ink-900 sm:text-5xl lg:text-[3.4rem]">
              Auto online zulassen –{" "}
              <span className="bg-gradient-to-r from-brand-700 to-brand-500 bg-clip-text text-transparent">
                ohne eID und Behördentermin
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              Auto anmelden, ummelden oder abmelden: Wir übernehmen die Zulassung mit persönlicher Betreuung.
              Bundesweit, zu transparenten Festpreisen.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <TrackedLink
                href="/auftrag/"
                event="cta_click"
                props={{ position: "hero" }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-700 px-8 py-4 font-display text-lg font-semibold text-white shadow-lg shadow-brand-700/30 transition-colors duration-200 hover:bg-brand-800"
              >
                Jetzt Fahrzeug zulassen
                <ArrowRight className="h-5 w-5" aria-hidden />
              </TrackedLink>
              <TrackedLink
                href={whatsAppLink("Hallo DeutscheZulassung, ich möchte mein Fahrzeug zulassen.")}
                event="whatsapp_click"
                props={{ position: "hero" }}
                external
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-[#25D366] bg-white px-6 py-4 font-display text-base font-semibold text-ink-900 transition-colors duration-200 hover:bg-[#25D366]/10"
              >
                <WhatsAppIcon className="h-5 w-5" color="brand" />
                Per WhatsApp
              </TrackedLink>
            </div>

            <ul className="mt-8 grid max-w-xl gap-x-6 gap-y-2 text-sm text-ink-700 sm:grid-cols-2">
              {[
                "Festpreis inkl. amtlicher Gebühren",
                "Keine eID oder AusweisApp nötig",
                "Ohne Termin bei der Zulassungsstelle",
                "Persönliche Ansprechperson",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <HeroFlowAnimation />
        </div>
      </section>

      {/* ============ LEISTUNGEN MIT PREISEN ============ */}
      <section id="leistungen" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="Leistungen & Festpreise" title="Was möchten Sie erledigen?">
            Wählen Sie Ihren Vorgang – der Preis enthält die amtlichen Gebühren. Den verbindlichen Endpreis sehen Sie
            vor der Bestellung.
          </SectionHead>
          <Reveal delay={0.05} className="mt-10">
            <ServicePriceGrid />
          </Reveal>
          <p className="mt-6 text-center text-sm text-ink-600">
            Kurzzeit-, Saisonkennzeichen oder Ersatzpapiere?{" "}
            <Link href="/leistungen/" className="font-semibold text-brand-700 underline underline-offset-2">
              Alle Leistungen ansehen
            </Link>{" "}
            ·{" "}
            <Link href="/preise/" className="font-semibold text-brand-700 underline underline-offset-2">
              Preisübersicht
            </Link>
          </p>
        </div>
      </section>

      {/* ============ VERTRAUEN ============ */}
      <section className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="Darauf können Sie sich verlassen" title="Transparent, persönlich, ehrlich" />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {trust.map((t, i) => (
              <Reveal key={t.title} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <t.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-ink-900">{t.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{t.text}</p>
                  {"href" in t && (
                    <Link
                      href={t.href}
                      className="mt-3 inline-block text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
                    >
                      {t.linkLabel}
                    </Link>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10">
            <Testimonials />
          </div>
          <p className="mt-8 text-center text-sm text-ink-600">
            {site.company.brandNote}{" "}
            <Link href="/ueber-uns/" className="font-semibold text-brand-700 underline underline-offset-2">
              Wer Ihre Zulassung bearbeitet
            </Link>
          </p>
        </div>
      </section>

      {/* ============ VIER SCHRITTE ============ */}
      <section id="ablauf" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="So funktioniert’s" title="In vier Schritten zur Zulassung">
            Von der Bestellung bis zu den fertigen Papieren – Sie sehen jederzeit, wo Ihr Auftrag steht.
          </SectionHead>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.06}>
                <li className="relative text-center">
                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-lg shadow-brand-700/25">
                    <s.icon className="h-7 w-7" aria-hidden />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-ink-900 font-display text-xs font-bold text-white">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold text-ink-900">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
          <Reveal className="mt-10 text-center">
            <TrackedLink
              href="/auftrag/"
              event="cta_click"
              props={{ position: "ablauf" }}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-8 py-4 font-display text-base font-semibold text-white shadow-lg shadow-brand-700/25 transition-colors duration-200 hover:bg-brand-800"
            >
              Jetzt Fahrzeug zulassen
              <ArrowRight className="h-5 w-5" aria-hidden />
            </TrackedLink>
            <p className="mt-3 text-sm text-ink-600">
              <Link href="/ablauf/" className="font-semibold text-brand-700 underline underline-offset-2">
                Ablauf im Detail
              </Link>{" "}
              ·{" "}
              <Link href="/anleitung/" className="font-semibold text-brand-700 underline underline-offset-2">
                Bilderanleitung
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ VERGLEICH ============ */}
      <section className="bg-gradient-to-b from-brand-50 to-white py-14 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHead eyebrow="Ehrlicher Vergleich" title="Behörde, i-Kfz selbst oder Zulassungsservice?">
            Drei Wege führen zur Zulassung. So unterscheiden sie sich – auch beim Preis.
          </SectionHead>
          <Reveal delay={0.05} className="mt-10">
            <ComparisonTable />
          </Reveal>
        </div>
      </section>

      {/* ============ OHNE eID ============ */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-ink-200 shadow-card">
              <Image
                src="/images/unterlagen-foto.webp"
                alt="Hände fotografieren die Zulassungsbescheinigung mit dem Smartphone am Küchentisch"
                width={1264}
                height={848}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 550px, 100vw"
              />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div>
              <Eyebrow>Ohne eigene eID</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Zulassen ohne Online-Ausweis – so einfach geht es
              </h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                Wer über das Behördenportal (i-Kfz) selbst zulassen will, muss sich elektronisch ausweisen – meist mit
                dem Online-Ausweis, alternativ mit BundID und ELSTER-Zertifikat. Wer beides nicht hat oder nicht nutzen
                möchte, beauftragt uns per Vollmacht.
              </p>
              <ul className="mt-6 space-y-5">
                {eidBenefits.map((b) => (
                  <li key={b.title} className="flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <b.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span>
                      <span className="block font-display font-bold text-ink-900">{b.title}</span>
                      <span className="mt-1 block text-sm leading-relaxed text-ink-600">{b.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/kfz-zulassung-ohne-eid/"
                className="group mt-7 inline-flex items-center gap-1.5 font-display text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                Mehr zur Kfz-Zulassung ohne eID
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ HÄUFIGE PROBLEME ============ */}
      <section className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="Hilfe bei Problemen" title="Häufige Probleme bei der Online-Zulassung">
            Wenn das Portal streikt, steckt meist eine von wenigen Ursachen dahinter.
          </SectionHead>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {problems.map((p, i) => (
              <Reveal key={p.href} delay={i * 0.05}>
                <Link
                  href={p.href}
                  className="group flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <p.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold text-ink-900">{p.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{p.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                    Lösung ansehen
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ WHATSAPP / MAXX ============ */}
      <section className="py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <Link
              href="/zulassung-per-whatsapp/"
              className="group flex flex-col items-center gap-6 rounded-3xl border border-brand-200 bg-brand-50/70 p-7 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50 sm:flex-row sm:gap-8"
            >
              <Maxx pose="phone" className="h-24 w-auto shrink-0" />
              <div className="flex-1 text-center sm:text-left">
                <p className="font-display text-sm font-semibold uppercase tracking-wider text-brand-700">
                  Lieber im Chat?
                </p>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-ink-900">
                  Mit Maxx alles per WhatsApp erledigen
                </h2>
                <p className="mt-2 max-w-2xl text-ink-600">
                  Kein Formular: Schreiben Sie uns, fotografieren Sie Ihre Unterlagen ab – zum selben Festpreis.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-[#25D366] px-6 py-3.5 font-display font-semibold text-white transition-colors duration-200 group-hover:bg-[#1DA851]">
                <WhatsAppIcon className="h-5 w-5" />
                So geht’s
              </span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ============ LOKAL ============ */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="Bundesweit" title="Kfz-Zulassung in Ihrer Stadt">
            Wir wickeln Ihren Vorgang bei der für Sie zuständigen Zulassungsbehörde ab – egal, wo Sie wohnen.
          </SectionHead>
          <Reveal delay={0.05}>
            <ul className="mt-10 flex flex-wrap justify-center gap-2">
              {cities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/kfz-zulassung/${c.slug}/`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-sm text-ink-700 transition-colors duration-200 hover:border-brand-400 hover:text-brand-800"
                  >
                    <MapPin className="h-3.5 w-3.5 text-brand-600" aria-hidden />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
          <p className="mt-8 text-center text-sm text-ink-600">
            <Link href="/kfz-zulassung/" className="font-semibold text-brand-700 underline underline-offset-2">
              Alle Städte
            </Link>
            {publishedStellen.length > 0 && (
              <>
                {" "}
                ·{" "}
                <Link href="/zulassungsstelle/" className="font-semibold text-brand-700 underline underline-offset-2">
                  Zulassungsstellen mit Adressen und Zuständigkeit
                </Link>{" "}
                ·{" "}
                <Link href="/kennzeichen/" className="font-semibold text-brand-700 underline underline-offset-2">
                  Kennzeichenkürzel
                </Link>
              </>
            )}
          </p>
        </div>
      </section>

      {/* ============ GEWERBE ============ */}
      <section className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-ink-200 shadow-card">
              <Image
                src="/images/autohaus.webp"
                alt="Moderner Autohaus-Showroom mit Neuwagen hinter einer Glasfassade"
                width={1264}
                height={848}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 550px, 100vw"
              />
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div>
              <Eyebrow>Für Autohäuser &amp; Gewerbe</Eyebrow>
              <h2 className="mt-3 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
                Zulassungen im Volumen – planbar und zuverlässig
              </h2>
              <p className="mt-4 leading-relaxed text-ink-600">
                Sammelabwicklung, Staffelpreise und ein fester Ansprechpartner: Für Autohäuser, Händler, Fuhrparks und
                Leasing übernehmen wir Zulassungen bundesweit.
              </p>
              <Link
                href="/gewerbe/"
                className="mt-7 inline-flex items-center gap-2 rounded-[14px] bg-ink-900 px-7 py-3.5 font-display text-base font-semibold text-white transition-colors duration-200 hover:bg-ink-800"
              >
                <Building2 className="h-5 w-5" aria-hidden />
                Angebot für Gewerbekunden
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHead eyebrow="FAQ" title="Häufige Fragen" />
          <Reveal delay={0.05} className="mt-10">
            <FaqAccordion items={faqItems.slice(0, 6)} />
          </Reveal>
          <p className="mt-6 text-center">
            <Link href="/faq/" className="font-display text-sm font-semibold text-brand-700 hover:text-brand-800">
              Alle Fragen &amp; Antworten →
            </Link>
          </p>
        </div>
      </section>

      {/* ============ KONTAKT ============ */}
      <section id="kontakt" className="bg-ink-50 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow="Kontakt" title="Fragen? Wir sind persönlich für Sie da">
            {site.contact.hours} – per WhatsApp, Telefon oder E-Mail.
          </SectionHead>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            <TrackedLink
              href={whatsAppLink("Hallo DeutscheZulassung, ich habe eine Frage.")}
              event="whatsapp_click"
              props={{ position: "kontakt" }}
              external
              className="block rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#25D366]/10">
                <WhatsAppIcon className="h-6 w-6" color="brand" />
              </span>
              <span className="mt-4 block font-display text-base font-bold text-ink-900">WhatsApp</span>
              <span className="mt-1 block text-sm text-ink-600">Antwort meist in wenigen Minuten</span>
            </TrackedLink>
            <TrackedLink
              href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
              event="phone_click"
              props={{ position: "kontakt" }}
              className="block rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Phone className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-4 block font-display text-base font-bold text-ink-900">Telefon</span>
              <span className="mt-1 block text-sm text-ink-600">{site.contact.phoneDisplay}</span>
            </TrackedLink>
            <TrackedLink
              href={`mailto:${site.contact.email}`}
              event="email_click"
              props={{ position: "kontakt" }}
              className="block rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Mail className="h-6 w-6" aria-hidden />
              </span>
              <span className="mt-4 block font-display text-base font-bold text-ink-900">E-Mail</span>
              <span className="mt-1 block break-all text-sm text-ink-600">{site.contact.email}</span>
            </TrackedLink>
          </div>
        </div>
      </section>

      <CTASection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
