import Link from "next/link";
import { vertrauen } from "@/lib/homepage";

/**
 * Vertrauensbereich direkt nach dem Kopf: fünf belegbare Eigenschaften als
 * Textspalten mit Linien, darunter die Betreiberangabe. Bewusst ohne Sterne,
 * Siegel, Zahlen oder Icons.
 */
export default function TrustBar() {
  return (
    <section className="border-b border-line bg-white" aria-labelledby="trust-title">
      <div className="container-page py-9 lg:py-12">
        <h2 id="trust-title" className="sr-only">
          Darauf können Sie sich verlassen
        </h2>
        <ul className="grid sm:grid-cols-2 sm:gap-x-10 xl:grid-cols-5 xl:gap-x-0">
          {vertrauen.items.map(({ title, text }) => (
            <li
              key={title}
              className="border-t border-line py-3.5 text-[0.9375rem] leading-snug text-ink-600 first:border-t-0 first:pt-0 sm:[&:nth-child(2)]:border-t-0 sm:[&:nth-child(2)]:pt-0 xl:border-l xl:border-t-0 xl:px-6 xl:py-0.5 xl:first:border-l-0 xl:first:pl-0"
            >
              <strong className="mb-1 block hyphens-auto text-[1.03125rem] font-semibold leading-snug text-navy">
                {title}
              </strong>
              {text}
            </li>
          ))}
        </ul>

        <p className="mt-7 max-w-[62em] border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-ink-600 xl:mt-9">
          {vertrauen.betreiber}{" "}
          <Link href="/ueber-uns/" className="link">
            Über uns
          </Link>
        </p>
      </div>
    </section>
  );
}
