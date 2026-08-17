import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Camera, PenLine, Sparkles, Truck } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import FaqAccordion from "@/components/FaqAccordion";
import Maxx from "@/components/Maxx";
import Reveal from "@/components/Reveal";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getService } from "@/lib/services";
import { euro } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";

/**
 * Schnelleinstieg „Maxx“.
 *
 * Bewusst anderer Ton als der Rest der Website: Du-Ansprache, kurze Sätze,
 * Maskottchen im Mittelpunkt. Zielgruppe sind Besucher, die nicht lesen,
 * sondern sofort loslegen wollen (Direkteingaben, Werbung, Empfehlungen).
 *
 * Inhaltlich bewusst KEINE Dublette der Startseite: keine Ratgeber-Themen,
 * keine Keyword-Wiederholung – der Einstieg führt in die bestehenden
 * Leistungsseiten, statt mit ihnen zu konkurrieren.
 */

export const metadata: Metadata = {
  title: "Maxx – dein Schnellstart zur Kfz-Zulassung",
  description:
    "Der einfachste Weg: Maxx erledigt deine Kfz-Zulassung. Nachricht schicken, Fotos senden, fertig – ohne Termin, ohne Behördengang, zum Festpreis.",
  keywords: ["Maxx Zulassung", "Kfz-Zulassung einfach", "Zulassung Schnellstart"],
};

const steps = [
  {
    icon: PenLine,
    pose: "phone" as const,
    title: "Schreiben",
    text: "Kurze Nachricht an Maxx – per WhatsApp oder Formular. Ein Satz reicht völlig.",
  },
  {
    icon: Camera,
    pose: "plain" as const,
    title: "Fotos schicken",
    text: "Fahrzeugschein und Ausweis abknipsen. Maxx sagt dir genau, was noch fehlt.",
  },
  {
    icon: Truck,
    pose: "wave" as const,
    title: "Fertig",
    text: "Kennzeichen und Papiere kommen zu dir. Du warst bei keinem einzigen Amt.",
  },
];

const quickPicks = [
  { slug: "abmeldung", blurb: "Auto weg? Meist noch heute erledigt." },
  { slug: "halterwechsel", blurb: "Gebrauchten gekauft? Maxx schreibt ihn um." },
  { slug: "ummeldung", blurb: "Umgezogen? Neue Adresse rein, fertig." },
  { slug: "neuzulassung", blurb: "Neues Auto? Ab auf die Straße." },
];

const needList = [
  "Dein Ausweis",
  "Die Fahrzeugpapiere",
  "Eine eVB-Nummer von deiner Versicherung",
  "Deine IBAN für die Kfz-Steuer",
];

const faq = [
  {
    question: "Muss ich wirklich nirgendwo hin?",
    answer:
      "Nein, nirgendwo. Maxx geht mit deiner Vollmacht zur Zulassungsstelle. Du brauchst keinen Termin, musst keine Behörde betreten und auch nichts ausdrucken.",
  },
  {
    question: "Was kostet das?",
    answer:
      "129 € komplett für Zulassung, Ummeldung, Umschreibung oder Wiederzulassung – amtliche Gebühren, Kennzeichen und Versand sind drin. Die Abmeldung kostet 34,90 €. Den Endpreis bekommst du vorher verbindlich bestätigt.",
  },
  {
    question: "Wie lange dauert es?",
    answer:
      "Meist 1–3 Werktage, dazu der Versand. Eine Abmeldung ist oft noch am selben Werktag durch.",
  },
  {
    question: "Reichen Handyfotos wirklich?",
    answer:
      "Ja. Für den Start genügen Fotos oder Scans. Originale brauchen wir nur, wenn die Behörde ausdrücklich darauf besteht – dann sagt Maxx dir rechtzeitig Bescheid.",
  },
  {
    question: "Brauche ich den Online-Ausweis (eID)?",
    answer:
      "Nein. Genau das ist der Unterschied zur Behörden-App: Weil Maxx den Vorgang für dich übernimmt, brauchst du weder eID noch PIN noch Kartenleser.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

const chatCta = whatsAppLink("Hallo Maxx, ich brauche Hilfe bei meiner Kfz-Zulassung.");

export default function MaxxPage() {
  const picks = quickPicks
    .map((q) => ({ ...q, service: getService(q.slug) }))
    .filter((q) => q.service !== undefined);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent-400/10 via-white to-white py-12 sm:py-16">
        <div
          className="pointer-events-none absolute -right-40 -top-52 h-[34rem] w-[34rem] rounded-full bg-brand-50"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Maxx" }]} />

          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-accent-400 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-900">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Ohne Termin · ohne Amt
              </p>
              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
                Maxx macht
                <br />
                deine{" "}
                <span className="relative whitespace-nowrap">
                  <span
                    className="absolute inset-x-0 bottom-1.5 h-3.5 rounded bg-accent-400/60 sm:bottom-2 sm:h-4"
                    aria-hidden
                  />
                  <span className="relative">Zulassung</span>
                </span>
                .
              </h1>
              <p className="mt-6 max-w-md text-xl leading-relaxed text-ink-600">
                Du schickst Fotos. Maxx rennt zur Behörde. Du bekommst dein
                Kennzeichen nach Hause.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={chatCta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-7 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-[#1DA851]"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Maxx schreiben
                </a>
                <Link
                  href="/auftrag"
                  className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-7 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-800"
                >
                  Auftrag starten
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>

              <p className="mt-5 text-sm text-ink-500">
                Festpreis vorab · Kennzeichen frei Haus · deutschlandweit
              </p>
            </div>

            <div className="relative mx-auto">
              <p className="absolute -left-4 -top-2 z-10 rounded-2xl border-[3px] border-ink-900 bg-white px-4 py-2.5 font-display text-sm font-bold text-ink-900 shadow-[4px_4px_0_var(--color-brand-200)] sm:-left-10">
                Hi, ich bin Maxx! 👋
              </p>
              <Maxx
                pose="wave"
                className="h-44 w-auto sm:h-56"
                label="Maxx, das Maskottchen von DeutscheZulassung, winkt"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Eckdaten */}
      <section className="bg-ink-950 py-5">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-x-8 gap-y-3 px-4 text-sm font-medium text-ink-300 sm:px-6">
          <span>
            <b className="text-accent-400">129 €</b> komplett – Gebühren &amp; Schilder drin
          </span>
          <span>
            <b className="text-accent-400">1–3</b> Werktage
          </span>
          <span>
            <b className="text-accent-400">0</b> Behördengänge
          </span>
          <span>
            <b className="text-accent-400">Abmeldung</b> oft noch heute
          </span>
        </div>
      </section>

      {/* Drei Schritte */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Drei Schritte. Mehr nicht.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-ink-600">
            Maxx kümmert sich um den Papierkram, du machst was Schöneres.
          </p>

          <ol className="mt-14 grid gap-6 sm:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.07} className="h-full">
                <li className="relative flex h-full flex-col items-center rounded-3xl border-2 border-ink-200 bg-white px-6 pb-7 pt-10 text-center">
                  <span className="absolute -top-5 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-brand-700 font-display text-base font-bold text-white">
                    {i + 1}
                  </span>
                  <Maxx pose={step.pose} className="h-20 w-auto" />
                  <h3 className="mt-4 font-display text-xl font-bold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-ink-600">{step.text}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Schnellauswahl */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">
            Was ist bei dir los?
          </h2>
          <p className="mt-3 text-lg text-ink-600">
            Such dir aus, was passt – oder schreib Maxx einfach, wenn du unsicher bist.
          </p>

          <ul className="mt-9 grid gap-4 sm:grid-cols-2">
            {picks.map(({ slug, blurb, service }) => (
              <li key={slug}>
                <Link
                  href={`/leistungen/${slug}/`}
                  className="group flex h-full items-center justify-between gap-5 rounded-2xl border-2 border-ink-200 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
                >
                  <div>
                    <p className="font-display text-lg font-bold text-ink-900 group-hover:text-brand-800">
                      {service!.shortName ?? service!.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-600">{blurb}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {service!.price.serviceFee !== null && service!.price.verified && (
                      <p className="font-display text-lg font-bold text-brand-700">
                        {euro(service!.price.serviceFee)}
                      </p>
                    )}
                    <ArrowRight
                      className="ml-auto mt-1 h-4 w-4 text-brand-700 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-sm text-ink-500">
            Du bist dir nicht sicher, was du brauchst?{" "}
            <a
              href={chatCta}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Frag einfach Maxx
            </a>{" "}
            – er sortiert das für dich.
          </p>
        </div>
      </section>

      {/* Was du brauchst */}
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[auto_1fr]">
          <Maxx pose="phone" className="mx-auto h-40 w-auto lg:h-52" />
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">
              Das brauchst du – mehr nicht
            </h2>
            <ul className="mt-6 space-y-3">
              {needList.map((item) => (
                <li key={item} className="flex items-center gap-3 text-lg text-ink-700">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-400 font-display text-sm font-bold text-ink-900"
                    aria-hidden
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-ink-600">
              Fehlt dir etwas davon? Kein Drama – schreib Maxx trotzdem, er sagt dir,
              wie du drankommst.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-ink-50 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-ink-900">
            Kurz gefragt
          </h2>
          <div className="mt-8">
            <FaqAccordion items={faq} />
          </div>
          <p className="mt-6 text-sm text-ink-500">
            Ausführlicher lesen? Dann schau in die{" "}
            <Link
              href="/faq"
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              große FAQ
            </Link>{" "}
            oder in unseren{" "}
            <Link
              href="/ratgeber"
              className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Ratgeber
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Abschluss */}
      <section className="bg-ink-950 py-16 sm:py-20">
        <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Maxx pose="phone" className="mx-auto h-24 w-auto" />
          <h2 className="mt-6 font-display text-3xl font-bold text-white sm:text-4xl">
            Schreib Maxx. Dauert 30 Sekunden.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
            Ein Satz genügt – Maxx meldet sich innerhalb der Geschäftszeiten meist in
            wenigen Minuten und sagt dir genau, wie es weitergeht.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <a
              href={chatCta}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-8 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-[#1DA851]"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Maxx schreiben
            </a>
            <Link
              href="/auftrag"
              className="flex items-center justify-center gap-2 rounded-xl border border-ink-700 px-8 py-4 font-display text-base font-semibold text-white transition-colors duration-200 hover:border-brand-500 hover:bg-ink-900"
            >
              Lieber Formular
            </Link>
          </div>
          <p className="mt-8 text-sm text-ink-500">
            Maxx ist das Maskottchen von {site.name} – dahinter steckt ein echtes Team,
            das dich persönlich betreut. {site.contact.hours}.
          </p>
        </Reveal>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
