import Link from "next/link";
import Haken from "@/components/ui/Haken";
import SectionHeading from "@/components/ui/SectionHeading";
import { ohneEid } from "@/lib/homepage";

/**
 * „Keine eID? Kein Problem.“ – der wichtigste Unterschied als Gegenüberstellung:
 * i-Kfz selbst nutzen oder Zulassungsservice mit Vollmacht. Unser Weg steht in
 * der Tafel (Umriss und blaues Band wie im Logo). Fair formuliert: i-Kfz wird
 * nicht schlechtgeredet.
 */
export default function EidSection() {
  return (
    <section id="ohne-eid" className="bg-navy py-14 text-white sm:py-20 lg:py-24" aria-labelledby="eid-title">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div>
            <SectionHeading id="eid-title" title={ohneEid.title} onDark>
              {ohneEid.intro}
            </SectionHeading>
            <Link href={ohneEid.cta.href} className="btn btn-hell mt-8">
              {ohneEid.cta.label}
            </Link>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:gap-6">
            {ohneEid.wege.map((weg) => {
              const hell = weg.hervorgehoben;
              return (
                <article
                  key={weg.key}
                  className={hell ? "tafel text-navy" : "rounded-[0.75rem] border-[2.5px] border-white/40"}
                >
                  <div className="px-5 pb-3 pt-5 sm:px-6 sm:pt-6">
                    <h3 className={`text-xl font-bold leading-snug ${hell ? "text-navy" : "text-white"}`}>
                      {weg.title}
                    </h3>
                    <p className={`mt-1 text-[0.9375rem] ${hell ? "text-ink-600" : "text-white/80"}`}>
                      {weg.untertitel}
                    </p>
                    <ul className="mt-4">
                      {weg.punkte.map((p) => (
                        <li
                          key={p.text}
                          className={`flex items-baseline gap-3 border-t py-3 text-[0.9375rem] leading-snug ${
                            hell ? "border-line" : "border-white/25"
                          }`}
                        >
                          {p.positiv ? (
                            <Haken tone={hell ? "light" : "dark"} className="h-[0.75rem] w-[1rem] translate-y-px" />
                          ) : (
                            <span className={`w-[1rem] shrink-0 text-center font-bold ${hell ? "text-ink-500" : "text-white/70"}`} aria-hidden>
                              –
                            </span>
                          )}
                          <span>
                            <span className="sr-only">{p.positiv ? "Vorteil: " : "Voraussetzung: "}</span>
                            {p.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-5 border-t border-white/25 pt-7 text-[0.9375rem] leading-relaxed text-white/85 md:grid-cols-2 md:gap-12 lg:mt-14">
          <p>{ohneEid.fair}</p>
          <p>{ohneEid.hinweis}</p>
        </div>
      </div>
    </section>
  );
}
