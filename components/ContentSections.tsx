import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import Reveal from "./Reveal";
import type { ContentSection } from "@/lib/serviceContent";

/** Erzeugt stabile Anker-IDs aus Abschnittsüberschriften. */
export function headingId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TableOfContents({ sections }: { sections: ContentSection[] }) {
  if (sections.length < 3) return null;
  return (
    <nav aria-label="Inhaltsverzeichnis" className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
      <p className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">Inhalt</p>
      <ol className="mt-3 space-y-1.5 text-sm">
        {sections.map((section, i) => (
          <li key={section.heading}>
            <a
              href={`#${headingId(section.heading)}`}
              className="flex gap-2 text-ink-700 transition-colors duration-200 hover:text-brand-700"
            >
              <span className="font-semibold text-brand-700">{i + 1}.</span>
              {section.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Rendert Inhaltsabschnitte (H2, Absätze, Liste, Tabelle, Bild). */
export default function ContentSections({ sections }: { sections: ContentSection[] }) {
  return (
    <>
      {sections.map((section) => (
        <Reveal key={section.heading}>
          <section id={headingId(section.heading)} className="scroll-mt-24">
            <h2 className="font-display text-2xl font-bold text-ink-900">{section.heading}</h2>
            {section.paragraphs.map((para) => (
              <p key={para.slice(0, 60)} className="mt-4 leading-relaxed text-ink-700">
                {para}
              </p>
            ))}
            {section.list && (
              <ul className="mt-4 space-y-2.5">
                {section.list.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-ink-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {section.table && (
              <div className="mt-5 overflow-x-auto rounded-xl border border-ink-200">
                <table className="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr className="bg-ink-50 text-left">
                      {section.table.headers.map((h) => (
                        <th key={h} scope="col" className="px-4 py-3 font-display font-semibold text-ink-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row) => (
                      <tr key={row.join("|")} className="border-t border-ink-200">
                        {row.map((cell, ci) => (
                          <td
                            key={`${row[0]}-${ci}`}
                            className={`px-4 py-3 align-top ${
                              ci === 0
                                ? "font-medium text-ink-800"
                                : ci === row.length - 1
                                  ? "font-semibold text-brand-700"
                                  : "text-ink-600"
                            }`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.image && (
              <figure className="mt-5 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card">
                <Image
                  src={section.image.src}
                  alt={section.image.alt}
                  width={1264}
                  height={848}
                  className="h-auto w-full"
                  sizes="(min-width: 768px) 720px, 100vw"
                />
                {section.image.caption && (
                  <figcaption className="p-4 text-sm leading-relaxed text-ink-600">{section.image.caption}</figcaption>
                )}
              </figure>
            )}
          </section>
        </Reveal>
      ))}
    </>
  );
}

/** Kasten mit offiziellen Quellen. */
export function SourceList({ sources }: { sources?: { label: string; href: string }[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5">
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-ink-500">Offizielle Quellen</h2>
      <ul className="mt-3 space-y-1.5 text-sm">
        {sources.map((source) => (
          <li key={source.href}>
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              {source.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
