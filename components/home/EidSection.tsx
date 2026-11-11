import Link from "next/link";
import { ArrowRight, Check, Info, Minus } from "lucide-react";
import SectionHeading from "@/components/ui/SectionHeading";
import { ohneEid } from "@/lib/homepage";

/**
 * „Keine eID? Kein Problem.“ – der wichtigste Unterschied als zwei
 * Vergleichskarten: i-Kfz selbst nutzen oder Zulassungsservice mit Vollmacht.
 * Fair formuliert: i-Kfz wird nicht schlechtgeredet.
 */
export default function EidSection() {
  return (
    <section id="ohne-eid" className="bg-navy-pattern py-16 text-white sm:py-24" aria-labelledby="eid-title">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
          <div>
            <SectionHeading id="eid-title" eyebrow={ohneEid.eyebrow} title={ohneEid.title} onDark>
              {ohneEid.intro}
            </SectionHeading>
            <Link href={ohneEid.cta.href} className="btn btn-primary mt-8">
              {ohneEid.cta.label}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {ohneEid.wege.map((weg) => (
              <article
                key={weg.key}
                className={`flex flex-col rounded-[20px] p-6 sm:p-7 ${
                  weg.hervorgehoben
                    ? "bg-white text-ink-900 shadow-[var(--shadow-elevated)]"
                    : "border border-white/15 bg-white/[0.06]"
                }`}
              >
                {weg.hervorgehoben && (
                  <p className="mb-4 inline-flex self-start rounded-full bg-accent-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-700">
                    Unser Service
                  </p>
                )}
                <h3 className={`font-display text-xl font-extrabold ${weg.hervorgehoben ? "text-navy" : "text-white"}`}>
                  {weg.title}
                </h3>
                <p className={`mt-1 text-sm ${weg.hervorgehoben ? "text-ink-600" : "text-white/70"}`}>
                  {weg.untertitel}
                </p>
                <ul className="mt-5 space-y-3.5">
                  {weg.punkte.map((p) => (
                    <li key={p.text} className="flex items-start gap-3 text-[15px] leading-snug">
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                          p.positiv
                            ? "bg-accent-500 text-navy"
                            : weg.hervorgehoben
                              ? "bg-ink-200 text-ink-600"
                              : "bg-white/15 text-white"
                        }`}
                      >
                        {p.positiv ? (
                          <Check className="h-3 w-3" strokeWidth={3.5} aria-hidden />
                        ) : (
                          <Minus className="h-3 w-3" strokeWidth={3.5} aria-hidden />
                        )}
                        <span className="sr-only">{p.positiv ? "Vorteil: " : "Voraussetzung: "}</span>
                      </span>
                      <span className={weg.hervorgehoben ? "text-ink-800" : "text-white/90"}>{p.text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-10 grid gap-4 border-t border-white/15 pt-8 text-sm leading-relaxed text-white/80 md:grid-cols-2 md:gap-10">
          <p>{ohneEid.fair}</p>
          <p className="flex gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-300" aria-hidden />
            <span>{ohneEid.hinweis}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
