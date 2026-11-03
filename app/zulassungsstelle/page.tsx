import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import StellenSuche from "@/components/StellenSuche";
import { publishedStellen } from "@/lib/zulassungsstellen";

export const metadata: Metadata = {
  title: "Zulassungsstellen: Adressen & Zuständigkeit",
  description:
    "Kfz-Zulassungsstellen deutscher Großstädte: zuständige Behörde, Anschrift, Kennzeichen, Terminbuchung und i-Kfz – geprüft anhand der offiziellen Behördenseiten.",
  alternates: { canonical: "/zulassungsstelle/" },
};

export default function ZulassungsstellenPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Zulassungsstellen" }]} />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Zulassungsstellen in Deutschland</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Welche Behörde ist für Sie zuständig, wo sitzt sie und wie buchen Sie einen Termin? Für jede Stadt haben wir
            die Angaben auf den offiziellen Behördenseiten geprüft und mit Quelle verlinkt. Für Landkreise mit
            gleichem Kürzel wie die Stadt finden Sie beide Behörden getrennt.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-ink-500">
            DeutscheZulassung ist ein privater Zulassungsdienst und keine Behörde. Ohne eigenen Termin übernehmen wir den
            Vorgang mit Ihrer Vollmacht.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-12 sm:px-6">
        <StellenSuche
          stellen={publishedStellen.map((z) => ({
            slug: z.slug,
            stadt: z.stadt,
            bundesland: z.bundesland,
            kuerzel: z.kuerzel.map((k) => k.code),
            behoerde: z.behoerde.wert,
          }))}
        />
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
