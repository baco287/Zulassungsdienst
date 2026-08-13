import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  Clock3,
  FileSignature,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Sofa,
} from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import ChatMockup from "@/components/ChatMockup";
import FaqAccordion from "@/components/FaqAccordion";
import Maxx from "@/components/Maxx";
import Reveal from "@/components/Reveal";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getService } from "@/lib/services";
import { whatsappSteps } from "@/lib/whatsappFlow";
import { euro } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kfz-Zulassung per WhatsApp – ohne Formular, ohne Behördengang",
  description:
    "Auto abmelden, ummelden oder zulassen einfach per Chat: Unterlagen abfotografieren, senden, fertig. Ohne Formular, ohne Termin, zum Festpreis – deutschlandweit.",
  keywords: [
    "Kfz-Zulassung per WhatsApp",
    "Auto abmelden per WhatsApp",
    "Zulassung per Chat",
    "Auto ummelden Handy",
    "Zulassungsdienst WhatsApp",
  ],
};

const benefits = [
  {
    icon: Sofa,
    title: "Kein Formular ausfüllen",
    text: "Sie schreiben in eigenen Worten, worum es geht. Kein Pflichtfeld, keine Dropdowns, keine Registrierung.",
  },
  {
    icon: Camera,
    title: "Unterlagen einfach abfotografieren",
    text: "Fahrzeugschein und Ausweis mit dem Handy knipsen und in den Chat schicken. Scannen oder Drucken entfällt.",
  },
  {
    icon: MessageCircle,
    title: "Eine feste Ansprechperson",
    text: "Kein Ticketsystem und keine Warteschleife: Sie schreiben mit der Person, die Ihren Vorgang bearbeitet.",
  },
  {
    icon: Clock3,
    title: "Antwort meist in Minuten",
    text: "Innerhalb unserer Geschäftszeiten (Mo–Fr 8–18 Uhr) melden wir uns in der Regel binnen weniger Minuten.",
  },
  {
    icon: FileSignature,
    title: "Vollmacht digital bestätigen",
    text: "Die Vollmacht kommt als Link in den Chat und wird digital bestätigt – nichts ausdrucken, nichts einscannen.",
  },
  {
    icon: ShieldCheck,
    title: "Verschlüsselt übertragen",
    text: "Der Chat ist Ende-zu-Ende-verschlüsselt. Ihre Unterlagen nutzen wir ausschließlich zur Auftragsabwicklung.",
  },
];

const chatServices = [
  "abmeldung",
  "halterwechsel",
  "ummeldung",
  "neuzulassung",
  "wiederzulassung",
  "wunschkennzeichen",
];

const faq = [
  {
    question: "Ist die Kfz-Zulassung per WhatsApp seriös?",
    answer:
      "Ja. Der Messenger ist bei uns nur der Kommunikationsweg – der Zulassungsvorgang selbst läuft ganz regulär über die zuständige Zulassungsbehörde, mit Ihrer schriftlichen Vollmacht. Sie erhalten vorab eine verbindliche Festpreis-Bestätigung und nach Abschluss alle amtlichen Dokumente.",
  },
  {
    question: "Kostet der Service per Chat mehr als das Online-Formular?",
    answer:
      "Nein. Es gelten dieselben Festpreise: 129 € komplett für Neuzulassung, Ummeldung, Umschreibung oder Wiederzulassung und 34,90 € für die Abmeldung – jeweils inklusive amtlicher Gebühren. Der Weg über den Chat kostet keinen Cent extra.",
  },
  {
    question: "Welche Vorgänge kann ich per Chat erledigen?",
    answer:
      "Alle: Abmeldung, Ummeldung, Halterwechsel, Neuzulassung, Wiederzulassung sowie Wunsch-, Saison- und Kurzzeitkennzeichen. Am schnellsten geht die Abmeldung – sie ist vollständig digital und meist noch am selben Werktag erledigt.",
  },
  {
    question: "Sind meine Daten und Ausweisfotos im Chat sicher?",
    answer:
      "Die Übertragung ist Ende-zu-Ende-verschlüsselt. Wir verwenden Ihre Unterlagen ausschließlich zur Abwicklung Ihres Auftrags, geben sie nur an die zuständige Behörde weiter und löschen sie nach Abschluss gemäß den gesetzlichen Fristen. Details stehen in unserer Datenschutzerklärung.",
  },
  {
    question: "Was, wenn ich den Messenger nicht nutzen möchte?",
    answer:
      "Kein Problem – derselbe Ablauf funktioniert auch per E-Mail oder über unser Online-Auftragsformular. Sie wählen einfach den Weg, der Ihnen am liebsten ist.",
  },
  {
    question: "Brauche ich einen Personalausweis mit Online-Funktion (eID)?",
    answer:
      "Nein. Weil wir den Vorgang mit Ihrer Vollmacht übernehmen, benötigen Sie weder eID noch AusweisApp oder Kartenlesegerät. Ein gut lesbares Foto Ihres Ausweises genügt.",
  },
];

const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "Kfz-Zulassung per WhatsApp beauftragen",
  description:
    "In 5 Schritten per Messenger zur erledigten Kfz-Zulassung: Chat öffnen, Unterlagen abfotografieren, Vollmacht bestätigen – den Behördengang übernimmt DeutscheZulassung.",
  inLanguage: "de",
  totalTime: "P3D",
  step: whatsappSteps.map((s, i) => ({
    "@type": "HowToStep",
    position: i + 1,
    name: s.title,
    text: s.text,
    url: `${site.url}/zulassung-per-whatsapp/`,
  })),
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const chatCta = whatsAppLink(
  "Hallo DeutscheZulassung, ich möchte meine Kfz-Zulassung per WhatsApp erledigen.",
);

export default function WhatsAppZulassungPage() {
  const services = chatServices.map((s) => getService(s)).filter((s) => s !== undefined);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Zulassung per WhatsApp" }]} />

          <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-700">
                <Smartphone className="h-4 w-4" aria-hidden />
                Für alle, die es besonders bequem mögen
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">
                Kfz-Zulassung per WhatsApp
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-600">
                Kein Formular, kein Termin, kein Behördengang: Schreiben Sie uns
                einfach im Chat, fotografieren Sie Ihre Unterlagen ab – den Rest
                erledigen wir. Zum selben Festpreis wie über unser Formular.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={chatCta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-7 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-[#1DA851]"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Chat jetzt starten
                </a>
                <Link
                  href="/auftrag"
                  className="flex items-center justify-center gap-2 rounded-xl border border-ink-300 bg-white px-7 py-4 font-display text-base font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
                >
                  Lieber per Formular
                </Link>
              </div>

              <p className="mt-5 flex items-center gap-2 text-sm text-ink-500">
                <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden />
                Mo–Fr 8:00–18:00 Uhr · Antwort meist in wenigen Minuten
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <ChatMockup />
              <div className="flex items-center gap-3">
                <Maxx pose="wave" className="h-16 w-auto" label="Maxx, das Maskottchen von DeutscheZulassung" />
                <p className="max-w-[12rem] text-sm leading-snug text-ink-600">
                  <strong className="font-display text-ink-900">Maxx</strong> begleitet
                  Sie durch den Chat.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vorteile */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            Warum der Chat der bequemste Weg ist
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-ink-600">
            Der Zulassungsvorgang ist derselbe wie immer – nur der Weg dorthin ist
            deutlich kürzer.
          </p>

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={Math.min((i % 3) * 0.05, 0.2)} className="h-full">
                <li className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <b.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-900">
                    {b.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{b.text}</p>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Ablauf */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            So läuft es ab – in 5 Schritten
          </h2>
          <ol className="mt-10 space-y-4">
            {whatsappSteps.map((step, i) => (
              <Reveal key={step.title} delay={Math.min(i * 0.05, 0.2)}>
                <li className="flex gap-5 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-700 font-display text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink-900">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                      {step.text}
                    </p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Leistungen */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            Diese Vorgänge erledigen wir per Chat
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-ink-600">
            Alle unsere Leistungen lassen sich per Messenger beauftragen. Am
            schnellsten geht die Abmeldung – oft noch am selben Werktag.
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <li key={service.slug}>
                <Link
                  href={`/leistungen/${service.slug}/`}
                  className="group flex h-full items-center justify-between gap-4 rounded-2xl border border-ink-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
                >
                  <div>
                    <p className="font-display font-bold text-ink-900 group-hover:text-brand-800">
                      {service.shortName ?? service.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {service.price.serviceFee !== null && service.price.verified
                        ? `${euro(service.price.serviceFee)} komplett`
                        : "Preis auf Anfrage"}
                    </p>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold text-ink-900">
            Häufige Fragen zur Zulassung per Chat
          </h2>
          <div className="mt-8">
            <FaqAccordion items={faq} />
          </div>
        </div>
      </section>

      {/* Abschluss-CTA */}
      <section className="bg-ink-950 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Maxx
            pose="phone"
            className="mx-auto h-24 w-auto"
            label="Maxx hält ein Smartphone bereit"
          />
          <h2 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
            Ein Satz genügt – Maxx übernimmt den Rest.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Schreiben Sie uns, worum es geht. Wir sagen Ihnen genau, was wir
            brauchen, und kümmern uns um den Behördengang.
          </p>
          <div className="mt-8 flex justify-center">
            <a
              href={chatCta}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-8 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-[#1DA851]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Chat starten
            </a>
          </div>
          <p className="mx-auto mt-10 max-w-xl text-xs leading-relaxed text-ink-500">
            WhatsApp ist eine Marke der Meta Platforms, Inc. {site.name} steht in
            keiner Verbindung zu Meta und nutzt den Messenger ausschließlich als
            Kommunikationsweg.
          </p>
        </Reveal>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
