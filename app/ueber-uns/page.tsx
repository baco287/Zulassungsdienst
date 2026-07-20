import type { Metadata } from "next";
import Link from "next/link";
import { HeartHandshake, Laptop, ShieldCheck, Sparkles } from "lucide-react";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Über uns – wer hinter EasyZulassung steht",
  description:
    "EasyZulassung verbindet moderne Software mit persönlichem Service: Lernen Sie unser Team und unsere Mission kennen – Kfz-Zulassung ohne Behördenstress.",
};

const values = [
  {
    icon: Laptop,
    title: "Digital gedacht",
    text: "Unsere Prozesse sind von Grund auf für die Online-Abwicklung gebaut – vom Dokumenten-Upload bis zur behördlichen i-Kfz-Schnittstelle. Das macht uns schneller und günstiger als der klassische Weg.",
  },
  {
    icon: HeartHandshake,
    title: "Persönlich geblieben",
    text: "Technik ersetzt bei uns keine Menschen: Jeder Auftrag hat eine feste Ansprechperson, die Sie kennt und erreichbar ist – per WhatsApp, Mail oder Telefon.",
  },
  {
    icon: ShieldCheck,
    title: "Vertrauen verdient",
    text: "Wir gehen mit Fahrzeugpapieren und persönlichen Daten um, wie wir es uns selbst wünschen würden: verschlüsselt, sparsam und DSGVO-konform.",
  },
  {
    icon: Sparkles,
    title: "Ständig besser",
    text: "Wir automatisieren Schritt für Schritt weiter – Statusbenachrichtigungen, Kundenkonto und Online-Bezahlung sind bereits in Arbeit.",
  },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Über EasyZulassung
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Wir glauben: Ein Auto anzumelden sollte so einfach sein wie eine Pizza zu
            bestellen. Daran arbeiten wir – mit moderner Software und echtem Service.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="max-w-3xl">
              <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
                Unsere Mission
              </h2>
              <p className="mt-4 leading-relaxed text-ink-700">
                Jedes Jahr werden in Deutschland Millionen Fahrzeuge an-, um- und
                abgemeldet – und noch immer bedeutet das für die meisten: Termin ergattern,
                Wartemarke ziehen, Formulare ausfüllen. EasyZulassung wurde gegründet, um
                genau das zu ändern. Wir kombinieren die digitalen Behördenverfahren
                (i-Kfz) mit einer Software, die Unterlagen prüft, Abläufe automatisiert und
                Sie jederzeit über den Stand informiert – während echte Menschen die Fälle
                betreuen, in denen es individuell wird.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-ink-200 bg-white p-7 shadow-card">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <v.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold text-ink-900">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">{v.text}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12">
            <p className="text-ink-700">
              Neugierig, wie ein Auftrag konkret abläuft?{" "}
              <Link href="/ablauf" className="font-semibold text-brand-700 underline underline-offset-2">
                Hier zeigen wir jeden Schritt →
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
