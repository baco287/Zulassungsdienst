import type { Metadata } from "next";
import Link from "next/link";
import ProcessTimeline from "@/components/ProcessTimeline";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import Breadcrumbs from "@/components/Breadcrumbs";
import { faqItems } from "@/lib/faq";
import { KENNZEICHEN_HINWEIS } from "@/lib/betrieb";

export const metadata: Metadata = {
  title: "Ablauf der Online-Zulassung in 7 Schritten",
  description:
    "Schritt für Schritt zur fertigen Kfz-Zulassung: So läuft Ihr Auftrag bei KFZ-Zulassungsprofis ab – von der Auswahl bis zur Zustellung von Kennzeichen und Papieren.",
};

const linkClass = "font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800";

export default function AblaufPage() {
  return (
    <>
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "So funktioniert’s" }]} />
          </div>
          <h1 className="h-seite text-navy">
            So funktioniert’s
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Vom ersten Klick bis zum Kennzeichen an Ihrer Tür: Ihr Zulassungsauftrag
            im Detail – komplett digital, mit persönlicher Betreuung.
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16">
        <div className="container-page">
          <ProcessTimeline />
        </div>
      </section>

      <section className="pb-14">
        <div className="container-page *:max-w-3xl space-y-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900">
              Wann es losgeht und wie lange es dauert
            </h2>
            <p className="mt-4 leading-relaxed text-ink-700">
              Wir starten, sobald drei Dinge vorliegen: Ihre Bestätigung des Festpreises, der
              Zahlungseingang und die vollständigen, lesbaren Unterlagen – samt Vollmacht, wo sie
              nötig ist. {KENNZEICHEN_HINWEIS.text}
            </p>
            <p className="mt-4 leading-relaxed text-ink-700">
              {KENNZEICHEN_HINWEIS.eilig} Über jeden Antrag entscheidet die zuständige
              Zulassungsbehörde; in Einzelfällen kann es deshalb länger dauern.
            </p>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900">Häufige Fragen zum Ablauf</h2>
            <div className="mt-5">
              <FaqAccordion items={faqItems.filter((f) => f.category === "ablauf")} />
            </div>
          </div>

          <p className="leading-relaxed text-ink-700">
            Lieber mit Bildern? Unsere{" "}
            <Link href="/anleitung/" className={linkClass}>
              Schritt-für-Schritt-Anleitung
            </Link>{" "}
            zeigt jeden Handgriff. Unterlagen nachreichen können Sie über{" "}
            <Link href="/unterlagen/" className={linkClass}>
              Unterlagen hochladen
            </Link>
            ; alle Festpreise stehen unter{" "}
            <Link href="/preise/" className={linkClass}>
              Preise
            </Link>
            , weitere Antworten in den{" "}
            <Link href="/faq/" className={linkClass}>
              häufigen Fragen
            </Link>
            .
          </p>
        </div>
      </section>

      <CTASection />
    </>
  );
}
