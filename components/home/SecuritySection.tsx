import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { sicherheit } from "@/lib/homepage";

/** Kompakte Sicherheitssektion – ohne erfundene Siegel oder Zertifikate. */
export default function SecuritySection() {
  return (
    <section id="sicherheit" className="bg-white py-16 sm:py-20" aria-labelledby="sicherheit-title">
      <div className="container-page">
        <div className="grid gap-8 rounded-[20px] border border-line bg-ink-50 p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-center lg:gap-14">
          <div>
            <p className="eyebrow">{sicherheit.eyebrow}</p>
            <h2
              id="sicherheit-title"
              className="mt-3 font-display text-[1.75rem] font-extrabold leading-tight text-navy sm:text-[2rem]"
            >
              {sicherheit.title}
            </h2>
            <Link href={sicherheit.cta.href} className="btn btn-secondary mt-6">
              {sicherheit.cta.label}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {sicherheit.punkte.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-3 rounded-2xl border border-line bg-white px-4 py-3.5 text-[15px] font-medium leading-snug text-ink-800"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" strokeWidth={1.75} aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
