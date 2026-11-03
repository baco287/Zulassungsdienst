"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Search } from "lucide-react";

export interface StellenEintrag {
  slug: string;
  stadt: string;
  bundesland: string;
  kuerzel: string[];
  behoerde: string;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");

/**
 * Übersicht aller Zulassungsstellen mit Suche nach Ort, Landkreis oder
 * Kennzeichenkürzel. Ohne JavaScript bleibt die vollständige Liste sichtbar.
 */
export default function StellenSuche({ stellen }: { stellen: StellenEintrag[] }) {
  const [q, setQ] = useState("");
  const query = norm(q.trim());

  const groups = useMemo(() => {
    const filtered = query
      ? stellen.filter(
          (z) =>
            norm(z.stadt).includes(query) ||
            norm(z.behoerde).includes(query) ||
            z.kuerzel.some((k) => norm(k) === query || (query.length >= 2 && norm(k).startsWith(query)))
        )
      : stellen;
    const map = new Map<string, StellenEintrag[]>();
    for (const z of filtered) {
      const list = map.get(z.bundesland) ?? [];
      list.push(z);
      map.set(z.bundesland, list);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "de"))
      .map(([land, list]) => [land, list.sort((a, b) => a.stadt.localeCompare(b.stadt, "de"))] as const);
  }, [stellen, query]);

  const count = groups.reduce((n, [, l]) => n + l.length, 0);

  return (
    <div>
      <label className="relative block max-w-xl">
        <span className="sr-only">Zulassungsstelle suchen</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ort, Landkreis oder Kennzeichen, z. B. „Osnabrück“ oder „OS“"
          className="w-full rounded-2xl border-2 border-ink-200 bg-white py-3.5 pl-12 pr-4 text-base text-ink-900 shadow-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30"
        />
      </label>
      <p className="mt-3 text-sm text-ink-500" aria-live="polite">
        {query ? `${count} Treffer` : `${count} Zulassungsstellen`}
      </p>

      {!query && (
        <nav aria-label="Bundesländer" className="mt-6 flex flex-wrap gap-2">
          {groups.map(([land, list]) => (
            <a
              key={land}
              href={`#land-${norm(land).replace(/[^a-z0-9]+/g, "-")}`}
              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-sm text-ink-700 hover:border-brand-400 hover:text-brand-800"
            >
              {land} <span className="text-ink-400">({list.length})</span>
            </a>
          ))}
        </nav>
      )}

      <div className="mt-10 space-y-10">
        {groups.map(([land, list]) => (
          <section key={land} id={`land-${norm(land).replace(/[^a-z0-9]+/g, "-")}`} className="scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-ink-900">{land}</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((z) => (
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
                      <span className="mt-0.5 block text-sm text-ink-600">{z.kuerzel.join(", ")}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {count === 0 && (
          <p className="rounded-xl border border-ink-200 bg-ink-50 p-5 text-ink-700">
            Keine Zulassungsstelle gefunden. Wir arbeiten trotzdem bundesweit mit allen Zulassungsbehörden –{" "}
            <Link href="/kontakt/" className="font-semibold text-brand-700 underline">
              fragen Sie uns einfach
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
