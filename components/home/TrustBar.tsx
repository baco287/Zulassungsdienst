import Link from "next/link";
import { Building2 } from "lucide-react";
import { vertrauen } from "@/lib/homepage";

/**
 * Vertrauensbereich direkt nach dem Hero: fünf belegbare Eigenschaften und
 * die Betreiberangabe. Bewusst ohne Sterne, Siegel oder Zahlen.
 */
export default function TrustBar() {
  return (
    <section className="border-b border-line bg-white" aria-labelledby="trust-title">
      <div className="container-page py-10 sm:py-12">
        <h2 id="trust-title" className="sr-only">
          Darauf können Sie sich verlassen
        </h2>
        <ul className="grid gap-x-6 gap-y-7 sm:grid-cols-2 lg:grid-cols-5 lg:gap-x-0 lg:divide-x lg:divide-line">
          {vertrauen.items.map(({ icon: Icon, title, text }, i) => (
            <li key={title} className={`flex items-start gap-3.5 lg:flex-col lg:gap-3 xl:flex-row xl:gap-3.5 ${i > 0 ? "lg:pl-5 xl:pl-6" : ""} lg:pr-3 xl:pr-4`}>
              <Icon className="mt-0.5 h-8 w-8 shrink-0 text-accent-600" strokeWidth={1.5} aria-hidden />
              <span className="min-w-0 hyphens-auto break-words">
                <span className="block font-display text-base font-bold leading-snug text-navy">{title}</span>
                <span className="mt-1 block text-sm leading-snug text-ink-600">{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-9 flex items-start gap-3 rounded-2xl bg-ink-50 px-5 py-4 text-sm leading-relaxed text-ink-700">
          <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-navy" aria-hidden />
          <span>
            {vertrauen.betreiber}{" "}
            <Link href="/ueber-uns/" className="font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800">
              Über uns
            </Link>
          </span>
        </p>
      </div>
    </section>
  );
}
