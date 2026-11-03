import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import { kennzeichen } from "@/lib/zulassungsstellen";

export const metadata: Metadata = {
  title: "Kfz-Kennzeichen: Kürzel & Zulassungsstelle",
  description:
    "Welche Stadt steckt hinter dem Kennzeichen? Kürzel, Bedeutung und zuständige Zulassungsstelle – mit geprüften Behördenangaben und Wunschkennzeichen-Infos.",
  alternates: { canonical: "/kennzeichen/" },
};

export default function KennzeichenPage() {
  const groups = new Map<string, typeof kennzeichen>();
  for (const k of kennzeichen) {
    const letter = k.code[0];
    const list = groups.get(letter) ?? [];
    list.push(k);
    groups.set(letter, list);
  }

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Kennzeichen" }]} />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink-900 sm:text-4xl">Kfz-Kennzeichen von A bis Z</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Das Unterscheidungszeichen vorn auf dem Kennzeichen verrät, welche Zulassungsbehörde es ausgegeben hat. Hier
            finden Sie die Kürzel der Städte, deren Zulassungsstellen wir geprüft haben – mit Bedeutung, zuständiger
            Behörde und Hinweisen zum Wunschkennzeichen.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <dl className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...groups.entries()].map(([letter, list]) => (
            <div key={letter}>
              <dt className="font-display text-2xl font-bold text-brand-700">{letter}</dt>
              <dd>
                <ul className="mt-2 space-y-2">
                  {list.map((k) => (
                    <li key={k.code}>
                      <Link href={`/kennzeichen/${k.slug}/`} className="group flex items-center gap-3">
                        <span className="min-w-[3.5rem] rounded-md border-2 border-ink-900 bg-white px-2 py-0.5 text-center font-display text-sm font-bold text-ink-900 group-hover:border-brand-700">
                          {k.code}
                        </span>
                        <span className="text-sm text-ink-700 group-hover:text-brand-800">{k.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-sm text-ink-600">
          <Link href="/zulassungsstelle/" className="font-semibold text-brand-700 underline underline-offset-2">
            Zur Übersicht der Zulassungsstellen
          </Link>{" "}
          ·{" "}
          <Link href="/ratgeber/kennzeichen-mitnehmen/" className="font-semibold text-brand-700 underline underline-offset-2">
            Kennzeichen beim Umzug mitnehmen
          </Link>
        </p>
      </div>

      <CTASection />
    </>
  );
}
