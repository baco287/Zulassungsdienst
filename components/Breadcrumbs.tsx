import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { site } from "@/lib/site";

export interface Crumb {
  name: string;
  /** Pfad relativ zur Domain, z. B. "/leistungen/". Ohne href = aktuelle Seite. */
  href?: string;
}

/** Sichtbare Brotkrumen-Navigation inkl. BreadcrumbList-JSON-LD. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Startseite", item: `${site.url}/` },
      ...items.map((c, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: c.name,
        ...(c.href ? { item: `${site.url}${c.href}` } : {}),
      })),
    ],
  };

  return (
    <nav aria-label="Brotkrumen">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ink-500">
        <li>
          <Link href="/" className="transition-colors duration-200 hover:text-brand-700">
            Startseite
          </Link>
        </li>
        {items.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-ink-400" aria-hidden />
            {c.href ? (
              <Link href={c.href} className="transition-colors duration-200 hover:text-brand-700">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-ink-700">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
