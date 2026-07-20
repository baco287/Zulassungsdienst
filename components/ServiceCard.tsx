import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Service } from "@/lib/types";
import { euro } from "@/lib/pricing";

export default function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/leistungen/${service.slug}/`}
      className="group flex h-full cursor-pointer flex-col rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-lg font-bold text-ink-900">
          {service.shortName ?? service.name}
        </h3>
        {service.popular && (
          <span className="shrink-0 rounded-full bg-accent-400/20 px-2.5 py-1 text-xs font-semibold text-accent-600">
            Beliebt
          </span>
        )}
      </div>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">{service.teaser}</p>
      <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
        <div>
          {service.price.serviceFee !== null ? (
            <>
              <p className="text-xs text-ink-500">Arbeitspreis {service.price.verified ? "" : "(unverbindlich)"}</p>
              <p className="font-display text-lg font-bold text-brand-700">
                ab {euro(service.price.serviceFee)}
              </p>
            </>
          ) : (
            <p className="font-display text-sm font-semibold text-ink-600">Preis auf Anfrage</p>
          )}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-brand-700 transition-colors duration-200 group-hover:bg-brand-700 group-hover:text-white">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
