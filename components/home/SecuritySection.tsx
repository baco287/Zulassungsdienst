import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { sicherheit } from "@/lib/homepage";

/** Kompakte Sicherheitssektion – ohne erfundene Siegel. */
export default function SecuritySection() {
  return (
    <section id="sicherheit" className="bg-offwhite py-16 sm:py-24" aria-labelledby="sicherheit-title">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <div className="grid gap-10 rounded-[22px] border border-line bg-white p-7 shadow-[0_1px_2px_rgb(11_31_58/0.04),0_16px_40px_-20px_rgb(11_31_58/0.2)] sm:p-10 lg:grid-cols-[1fr_1.3fr] lg:items-center lg:gap-16">
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-[0.18em] text-accent-600">Datensicherheit</p>
            <h2 id="sicherheit-title" className="mt-3 font-display text-3xl font-bold text-navy sm:text-[2.2rem] sm:leading-tight">
              {sicherheit.title}
            </h2>
            <Link
              href={sicherheit.cta.href}
              className="mt-7 inline-flex min-h-[48px] items-center gap-2 rounded-[14px] border-2 border-navy px-6 font-display font-semibold text-navy transition-colors duration-150 hover:bg-navy hover:text-white"
            >
              {sicherheit.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {sicherheit.punkte.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 rounded-[16px] bg-offwhite px-4 py-3.5 text-[15px] font-medium text-navy">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gold-50 text-navy" aria-hidden>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </span>
                <span className="pt-1.5">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
