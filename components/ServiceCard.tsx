import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/lib/types";
import { euro, plateFee } from "@/lib/pricing";
import { serviceIcon } from "@/lib/serviceIcons";
import IconTile from "./ui/IconTile";

/** Leistungskarte der Übersichtsseiten – die ganze Karte führt zur Leistungsseite. */
export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/leistungen/${service.slug}/`}
      className="card card-interactive group flex h-full cursor-pointer flex-col p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <IconTile icon={serviceIcon(service.slug)} />
        {service.popular && (
          <span className="shrink-0 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700">
            Beliebt
          </span>
        )}
      </div>
      <h3 className="mt-5 font-display text-xl font-extrabold text-navy">
        {service.shortName ?? service.name}
      </h3>
      <p className="mt-2 flex-1 leading-relaxed text-ink-600">{service.teaser}</p>
      <div className="mt-5 flex items-end justify-between gap-3 border-t border-line pt-4">
        <div>
          {service.price.serviceFee !== null ? (
            <>
              <p className="font-display text-xl font-extrabold tabular-nums text-navy">
                {service.price.inclusive
                  ? euro(service.price.serviceFee)
                  : `ab ${euro(service.price.serviceFee)}`}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {service.price.platesExtra
                  ? `Inkl. MwSt. – zzgl. Kennzeichen ${euro(plateFee)}`
                  : service.price.inclusive
                    ? "Komplettpreis inkl. MwSt. – alles inklusive"
                    : `Servicepreis ${service.price.verified ? "" : "(unverbindlich)"}`}
              </p>
            </>
          ) : (
            <p className="font-display text-base font-bold text-ink-700">Preis auf Anfrage</p>
          )}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-600 group-hover:text-white"
          aria-hidden
        >
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
