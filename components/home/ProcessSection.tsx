import Link from "next/link";
import KennzeichenHinweis from "@/components/KennzeichenHinweis";
import SectionHeading from "@/components/ui/SectionHeading";
import { ablauf } from "@/lib/homepage";

/**
 * Ablauf in vier Schritten. Die Nummern stehen als kleine Kennzeichen „D 01“ bis
 * „D 04“ – zu Recht, denn es ist eine Reihenfolge.
 */
export default function ProcessSection() {
  return (
    <section id="ablauf" className="bg-white py-14 sm:py-20 lg:py-24" aria-labelledby="ablauf-title">
      <div className="container-page">
        <SectionHeading id="ablauf-title" title={ablauf.title}>
          {ablauf.lead}
        </SectionHeading>

        <ol className="mt-9 grid gap-x-9 lg:mt-12 lg:grid-cols-4">
          {ablauf.schritte.map(({ title, text }, i) => (
            <li key={title} className="pb-9 last:pb-0 lg:pb-0">
              <p className="schritt-nr" aria-hidden>
                <span className="schritt-nr-d">D</span>
                <span className="schritt-nr-zahl">{String(i + 1).padStart(2, "0")}</span>
              </p>
              <h3 className="mt-4 text-[1.1875rem] font-semibold leading-snug text-navy">
                <span className="sr-only">Schritt {i + 1}: </span>
                {title}
              </h3>
              <p className="mt-2 max-w-[38em] text-[0.96875rem] leading-relaxed text-ink-600">{text}</p>
            </li>
          ))}
        </ol>

        <KennzeichenHinweis className="mt-10 lg:mt-14" />

        <Link href={ablauf.mehr.href} className="link mt-7 inline-flex min-h-11 items-center">
          {ablauf.mehr.label}
        </Link>
      </div>
    </section>
  );
}
