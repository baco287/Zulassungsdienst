import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileCheck2,
  Info,
  MessageCircle,
} from "lucide-react";
import Reveal from "@/components/Reveal";
import { getService, services, categoryLabels } from "@/lib/services";
import { euro, euroRange, priceDisclaimer } from "@/lib/pricing";
import { whatsAppLink } from "@/lib/site";

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: `${service.name} online beauftragen`,
    description: service.teaser,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const p = service.price;

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
            {categoryLabels[service.category]}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            {service.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">{service.teaser}</p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-10">
            <Reveal>
              <div>
                <h2 className="font-display text-2xl font-bold text-ink-900">So läuft es ab</h2>
                <p className="mt-4 leading-relaxed text-ink-700">{service.description}</p>
                <p className="mt-4 flex items-center gap-2 text-sm text-ink-600">
                  <Clock className="h-4 w-4 text-brand-700" aria-hidden />
                  Typische Dauer: <strong>{service.duration}</strong>
                </p>
              </div>
            </Reveal>

            <Reveal>
              <div>
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-ink-900">
                  <FileCheck2 className="h-6 w-6 text-brand-700" aria-hidden />
                  Dokumenten-Checkliste
                </h2>
                <ul className="mt-5 space-y-3">
                  {service.checklist.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-ink-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
                  Fotos oder Scans genügen für den Start. Originale werden nur benötigt,
                  wenn die Behörde sie verlangt – wir sagen Ihnen rechtzeitig Bescheid.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Preis-Box */}
          <Reveal delay={0.1}>
            <aside className="lg:sticky lg:top-24 h-fit rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
              <h2 className="font-display text-lg font-bold text-ink-900">Preisstruktur</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-600">Arbeitspreis EasyZulassung</dt>
                  <dd className="text-right font-display text-lg font-bold text-brand-700">
                    {p.serviceFee !== null ? `ab ${euro(p.serviceFee)}` : "auf Anfrage"}
                  </dd>
                </div>
                {p.officialFeeRange && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-600">Amtliche Gebühren</dt>
                    <dd className="text-right font-medium text-ink-800">
                      {euroRange(p.officialFeeRange)}
                    </dd>
                  </div>
                )}
                {p.plateCostRange && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-ink-600">Kennzeichen (Paar)</dt>
                    <dd className="text-right font-medium text-ink-800">
                      {euroRange(p.plateCostRange)}
                    </dd>
                  </div>
                )}
              </dl>
              {!p.verified && (
                <p className="mt-4 rounded-lg bg-accent-400/15 px-3 py-2 text-xs font-medium text-accent-600">
                  Unverbindliche Orientierung – verbindliches Angebot vor Beauftragung.
                </p>
              )}
              {p.note && <p className="mt-3 text-xs text-ink-500">{p.note}</p>}
              <p className="mt-3 text-xs leading-relaxed text-ink-400">{priceDisclaimer}</p>

              <div className="mt-6 space-y-3">
                <Link
                  href={`/auftrag/?leistung=${service.slug}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
                >
                  Jetzt beauftragen
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <a
                  href={whatsAppLink(`Hallo EasyZulassung, ich interessiere mich für: ${service.name}.`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink-300 px-5 py-3.5 font-display font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
                >
                  <MessageCircle className="h-4 w-4 text-brand-700" aria-hidden />
                  Frage per WhatsApp
                </a>
              </div>
            </aside>
          </Reveal>
        </div>
      </section>
    </>
  );
}
