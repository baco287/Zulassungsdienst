import type { Metadata } from "next";
import Link from "next/link";
import CTASection from "@/components/CTASection";
import { site } from "@/lib/site";
import Reveal from "@/components/Reveal";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SERVICEBEDINGUNGEN_FREIGEGEBEN } from "@/lib/features";

export const metadata: Metadata = {
  // Ohne Markenzusatz: Der Name steht bereits im Titel.
  title: { absolute: "Über uns – wer hinter KFZ-Zulassungsprofis steht" },
  description:
    "Wer hinter KFZ-Zulassungsprofis steht, wer Ihre Zulassung bearbeitet und wie wir arbeiten: privater Zulassungsdienst mit persönlicher Betreuung, keine Behörde.",
};

const values = [
  {
    title: "Digital gedacht",
    text: "Unsere Prozesse sind von Grund auf für die Online-Abwicklung gebaut – vom Dokumenten-Upload bis zur behördlichen i-Kfz-Schnittstelle. Das macht uns schneller und bequemer als der klassische Weg.",
  },
  {
    title: "Persönlich geblieben",
    text: "Technik ersetzt bei uns keine Menschen: Jeder Auftrag hat eine feste Ansprechperson, die Sie kennt und erreichbar ist – per WhatsApp, Mail oder Telefon.",
  },
  {
    title: "Vertrauen verdient",
    text: "Wir gehen mit Fahrzeugpapieren und persönlichen Daten um, wie wir es uns selbst wünschen würden: verschlüsselt, sparsam und nach den Vorgaben der DSGVO.",
  },
  {
    title: "Ständig besser",
    text: "Wir automatisieren Schritt für Schritt weiter – Statusbenachrichtigungen, Kundenkonto und Online-Bezahlung sind bereits in Arbeit.",
  },
];

export default function UeberUnsPage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "Über uns" }]} />
          </div>
          <h1 className="h-seite text-navy">
            Über KFZ-Zulassungsprofis
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Wir glauben: Ein Auto anzumelden sollte so einfach sein wie eine Pizza zu
            bestellen. Daran arbeiten wir – mit moderner Software und echtem Service.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container-page">
          <Reveal>
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-navy sm:text-3xl">
                Unsere Mission
              </h2>
              <p className="mt-4 leading-relaxed text-ink-700">
                Jedes Jahr werden in Deutschland Millionen Fahrzeuge an-, um- und
                abgemeldet – und noch immer bedeutet das für die meisten: Termin ergattern,
                Wartemarke ziehen, Formulare ausfüllen. KFZ-Zulassungsprofis wurde gegründet, um
                genau das zu ändern. Wir kombinieren die digitalen Behördenverfahren
                (i-Kfz) mit einer Software, die Unterlagen prüft, Abläufe automatisiert und
                Sie über den Stand informiert – während echte Menschen die Fälle
                betreuen, in denen es individuell wird.
              </p>
            </div>
          </Reveal>

          <dl className="liste mt-10 max-w-[60rem]">
            {values.map((v) => (
              <div key={v.title} className="grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <dt className="text-[1.0625rem] font-semibold text-navy">{v.title}</dt>
                <dd className="text-[0.96875rem] leading-relaxed text-ink-600">{v.text}</dd>
              </div>
            ))}
          </dl>

          <Reveal className="mt-14">
            <div className="grid gap-x-12 gap-y-10 lg:grid-cols-2">
              <section className="border-t-2 border-navy pt-5">
                <h2 className="text-2xl font-bold text-navy">Wer Ihre Zulassung bearbeitet</h2>
                <p className="mt-4 leading-relaxed text-ink-700">
                  Jeder Auftrag wird von einer Person aus unserem Team betreut – von der Prüfung Ihrer Unterlagen bis
                  zum Versand der Papiere. Sie erreichen Ihre Ansprechperson {site.contact.hours} per WhatsApp,
                  Telefon oder E-Mail.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-ink-700">
                  <li>· Wir prüfen Ihre Unterlagen, bevor etwas bei der Behörde eingereicht wird.</li>
                  <li>· Fehlt etwas, melden wir uns – statt den Antrag scheitern zu lassen.</li>
                  <li>· Wir reichen den Antrag mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde ein.</li>
                  <li>· Über die Zulassung selbst entscheidet immer die Behörde.</li>
                </ul>
              </section>
              <section className="border-t-2 border-navy pt-5">
                <h2 className="text-2xl font-bold text-navy">Wer hinter {site.name} steht</h2>
                <p className="mt-4 leading-relaxed text-ink-700">
                  {site.name} ist ein privater Zulassungsdienst – keine Behörde und kein Angebot einer Behörde.
                </p>
                <dl className="mt-4 space-y-2 text-sm text-ink-700">
                  <div>
                    <dt className="inline font-semibold text-ink-900">Sitz: </dt>
                    <dd className="inline">
                      {site.company.street}, {site.company.zipCity}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-ink-900">Verantwortlich: </dt>
                    <dd className="inline">{site.company.responsible}</dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm">
                  <Link href="/impressum/" className="font-semibold text-brand-700 underline underline-offset-2">
                    Impressum
                  </Link>{" "}
                  ·{" "}
                  <Link href="/datensicherheit/" className="font-semibold text-brand-700 underline underline-offset-2">
                    Datensicherheit
                  </Link>{" "}
                  {SERVICEBEDINGUNGEN_FREIGEGEBEN && (
                    <>
                      {" "}
                      ·{" "}
                      <Link href="/servicebedingungen/" className="font-semibold text-brand-700 underline underline-offset-2">
                        Servicebedingungen
                      </Link>
                    </>
                  )}
                </p>
              </section>
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <p className="text-ink-700">
              Neugierig, wie ein Auftrag konkret abläuft?{" "}
              <Link href="/ablauf" className="font-semibold text-brand-700 underline underline-offset-2">
                Hier zeigen wir jeden Schritt
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  );
}
