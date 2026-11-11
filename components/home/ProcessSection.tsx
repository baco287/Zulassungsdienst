import Link from "next/link";
import { ArrowRight } from "lucide-react";
import KennzeichenHinweis from "@/components/KennzeichenHinweis";
import SectionHeading from "@/components/ui/SectionHeading";
import { ablauf } from "@/lib/homepage";

/** Ablauf in vier nummerierten Schritten – waagerecht ab Desktop, als Zeitleiste auf dem Handy. */
export default function ProcessSection() {
  return (
    <section id="ablauf" className="bg-white py-16 sm:py-24" aria-labelledby="ablauf-title">
      <div className="container-page">
        <SectionHeading id="ablauf-title" eyebrow={ablauf.eyebrow} title={ablauf.title}>
          {ablauf.lead}
        </SectionHeading>

        <ol className="mt-12 grid gap-0 lg:grid-cols-4 lg:gap-6">
          {ablauf.schritte.map(({ icon: Icon, title, text }, i) => {
            const letzter = i === ablauf.schritte.length - 1;
            return (
              <li key={title} className="relative flex gap-5 pb-10 last:pb-0 lg:block lg:pb-0">
                {/* Verbindungslinie: senkrecht auf dem Handy, waagerecht ab Desktop */}
                {!letzter && (
                  <>
                    <span className="absolute left-7 top-14 h-[calc(100%-3.5rem)] w-px bg-line lg:hidden" aria-hidden />
                    <span
                      className="absolute left-[4.5rem] right-[-1.5rem] top-7 hidden h-px bg-line lg:block"
                      aria-hidden
                    />
                  </>
                )}

                <span
                  className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-navy text-white"
                  aria-hidden
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>

                <div className="min-w-0 lg:mt-6">
                  <p className="font-display text-sm font-extrabold tracking-wider text-accent-600" aria-hidden>
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-extrabold leading-snug text-navy">
                    <span className="sr-only">Schritt {i + 1}: </span>
                    {title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-ink-600">{text}</p>
                </div>
              </li>
            );
          })}
        </ol>

        <KennzeichenHinweis className="mt-12" />

        <Link
          href={ablauf.mehr.href}
          className="mt-10 inline-flex min-h-11 items-center gap-1.5 font-display font-bold text-brand-700 hover:text-brand-800"
        >
          {ablauf.mehr.label}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
