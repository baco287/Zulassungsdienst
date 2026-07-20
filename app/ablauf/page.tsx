import type { Metadata } from "next";
import ProcessTimeline from "@/components/ProcessTimeline";
import CTASection from "@/components/CTASection";

export const metadata: Metadata = {
  title: "So funktioniert’s – Ablauf der Online-Zulassung",
  description:
    "In 7 einfachen Schritten zur fertigen Kfz-Zulassung: So läuft Ihr Auftrag bei EasyZulassung ab – von der Auswahl bis zur Zustellung von Kennzeichen und Papieren.",
};

export default function AblaufPage() {
  return (
    <>
      <section className="bg-grid bg-ink-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            So funktioniert’s
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-ink-600">
            Vom ersten Klick bis zum Kennzeichen an Ihrer Tür: Ihr Zulassungsauftrag
            in sieben Schritten – komplett digital, mit persönlicher Betreuung.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ProcessTimeline />
        </div>
      </section>

      <CTASection />
    </>
  );
}
