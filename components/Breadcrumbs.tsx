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
      <ol className="flex flex-wrap items-center gap-x-1.5 text-sm text-ink-600">
        <li>
          <Link href="/" className="inline-flex min-h-7 items-center decoration-1 underline-offset-4 hover:text-navy hover:underline">
            Startseite
          </Link>
        </li>
        {items.map((c) => (
          <li key={c.name} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-ink-500" aria-hidden />
            {c.href ? (
              <Link href={c.href} className="inline-flex min-h-7 items-center decoration-1 underline-offset-4 hover:text-navy hover:underline">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-navy">
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
