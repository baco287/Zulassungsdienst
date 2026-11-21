import Link from "next/link";
import Haken from "@/components/ui/Haken";
import { sicherheit } from "@/lib/homepage";

/** Kompakte Sicherheitssektion – ohne erfundene Siegel oder Zertifikate. */
export default function SecuritySection() {
  return (
    <section id="sicherheit" className="border-y border-line bg-canvas py-14 sm:py-20" aria-labelledby="sicherheit-title">
      <div className="container-page grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>
          <h2 id="sicherheit-title" className="h-abschnitt text-navy">
            {sicherheit.title}
          </h2>
          <Link href={sicherheit.cta.href} className="btn btn-secondary mt-7">
            {sicherheit.cta.label}
          </Link>
        </div>
        <ul>
          {sicherheit.punkte.map(({ text }) => (
            <li
              key={text}
              className="flex items-baseline gap-3.5 border-t border-ink-300 py-3.5 text-[1.03125rem] font-medium leading-snug text-navy last:border-b"
            >
              <Haken className="h-[0.8125rem] w-[1.0625rem] translate-y-px" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
