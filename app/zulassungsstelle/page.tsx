import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import { publishedStellen } from "@/lib/zulassungsstellen";

export const metadata: Metadata = {
  title: "Zulassungsstellen: Adressen & Zuständigkeit",
  description:
    "Kfz-Zulassungsstellen deutscher Großstädte: zuständige Behörde, Anschrift, Kennzeichen, Terminbuchung und i-Kfz – geprüft anhand der offiziellen Behördenseiten.",
  alternates: { canonical: "/zulassungsstelle/" },
};

export default function ZulassungsstellenPage() {
  const byLand = new Map<string, typeof publishedStellen>();
  for (const z of publishedStellen) {
    const list = byLand.get(z.bundesland) ?? [];
    list.push(z);
    byLand.set(z.bundesland, list);
  }
  const laender = [...byLand.keys()].sort((a, b) => a.localeCompare(b, "de"));

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Zulassungsstellen" }]} />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Zulassungsstellen in Deutschland</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Welche Behörde ist für Sie zuständig, wo sitzt sie und wie buchen Sie einen Termin? Für jede Stadt haben wir
            die Angaben auf den offiziellen Behördenseiten geprüft und mit Quelle verlinkt. Die Übersicht wächst
            schrittweise.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-ink-500">
            DeutscheZulassung ist ein privater Zulassungsdienst und keine Behörde. Ohne eigenen Termin übernehmen wir den
            Vorgang mit Ihrer Vollmacht.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
        {laender.map((land) => (
          <section key={land}>
            <h2 className="font-display text-xl font-bold text-ink-900">{land}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byLand
                .get(land)!
                .sort((a, b) => a.stadt.localeCompare(b.stadt, "de"))
                .map((z) => (
                  <li key={z.slug}>
                    <Link
                      href={`/zulassungsstelle/${z.slug}/`}
                      className="group flex h-full gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50/50"
                    >
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                      <span>
                        <span className="block font-display font-semibold text-ink-900 group-hover:text-brand-800">
                          Zulassungsstelle {z.stadt}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-600">
                          {z.kuerzel.map((k) => k.code).join(", ")} · {z.behoerde.wert}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-ink-600">
          Ihre Stadt fehlt?{" "}
          <Link href="/kfz-zulassung/" className="font-semibold text-brand-700 underline underline-offset-2">
            Wir arbeiten bundesweit mit allen Zulassungsbehörden
          </Link>{" "}
          ·{" "}
          <Link href="/kennzeichen/" className="font-semibold text-brand-700 underline underline-offset-2">
            Kennzeichenkürzel nachschlagen
          </Link>
        </p>
      </div>

      <CTASection />
    </>
  );
}
