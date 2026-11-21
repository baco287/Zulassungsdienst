import Link from "next/link";
import type { Service } from "@/lib/types";
import { euro, plateFee } from "@/lib/pricing";

/**
 * Eine Zeile der Leistungsübersicht (/leistungen): Name, Kurztext, Preis.
 * Steht in einer Liste mit Linien (.liste) statt in einer Kartenreihe; die ganze
 * Zeile führt zur Leistungsseite.
 */
export default function ServiceCard({ service }: { service: Service }) {
  const preis =
    service.price.serviceFee !== null
      ? service.price.inclusive
        ? euro(service.price.serviceFee)
        : `ab ${euro(service.price.serviceFee)}`
      : "Preis auf Anfrage";
  const zusatz =
    service.price.serviceFee === null
      ? null
      : service.price.platesExtra
        ? `inkl. MwSt., zzgl. Kennzeichen ${euro(plateFee)}`
        : service.price.inclusive
          ? "Komplettpreis inkl. MwSt."
          : `Servicepreis${service.price.verified ? "" : " (unverbindlich)"}`;

  return (
    <Link
      href={`/leistungen/${service.slug}/`}
      className="group grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] sm:items-baseline lg:py-5"
    >
      <h3 className="text-[1.1875rem] font-semibold leading-snug text-navy decoration-2 underline-offset-4 group-hover:underline">
        {service.shortName ?? service.name}
        {service.popular && <span className="ml-2.5 align-middle text-sm font-medium text-ink-600">Häufig gebucht</span>}
      </h3>
      <p className="max-w-[44em] text-[0.96875rem] leading-relaxed text-ink-600">{service.teaser}</p>
      <p className="sm:text-right">
        <span className="block text-[1.1875rem] font-semibold tabular-nums text-navy">{preis}</span>
        {zusatz && <span className="block text-sm text-ink-600">{zusatz}</span>}
      </p>
    </Link>
  );
}
