import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { guides } from "@/lib/ratgeber";
import { gewerbeSegments } from "@/lib/gewerbe";
import { cities } from "@/lib/staedte";
import { landingPages } from "@/lib/landingpages";
import { kennzeichen, publishedStellen } from "@/lib/zulassungsstellen";
import { site } from "@/lib/site";
import { SERVICEBEDINGUNGEN_FREIGEGEBEN } from "@/lib/features";
import { cityIndexable, kennzeichenIndexable, stelleIndexable } from "@/lib/indexGate";

export const dynamic = "force-static";

/**
 * Build-Zeitpunkt als lastmod: Der statische Export entsteht bei jedem Deploy
 * neu, und Preise, Anleitungen und Rechner ändern sich laufend – ein festes
 * Datum hätte Google signalisiert, dass sich nichts tut.
 */
const contentUpdated = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/leistungen",
    "/preise",
    "/ablauf",
    "/anleitung",
    "/gewerbe",
    "/kfz-zulassung",
    "/rechner",
    "/rechner/kfz-steuer",
    "/rechner/behoerdengang",
    "/vorlagen",
    "/vorlagen/vollmacht-zulassung",
    "/vorlagen/checkliste-zulassung",
    "/zulassung-per-whatsapp",
    "/maxx",
    "/auftrag",
    "/faq",
    "/ratgeber",
    "/kontakt",
    "/ueber-uns",
    "/datensicherheit",
    "/zulassungsstelle",
    "/kennzeichen",
  ].map((path) => ({
    url: `${site.url}${path}/`,
    lastModified: contentUpdated,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const servicePages = services.map((s) => ({
    url: `${site.url}/leistungen/${s.slug}/`,
    lastModified: contentUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const gewerbePages = gewerbeSegments.map((s) => ({
    url: `${site.url}/gewerbe/${s.slug}/`,
    lastModified: contentUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const cityPages = cities.filter(cityIndexable).map((c) => ({
    url: `${site.url}/kfz-zulassung/${c.slug}/`,
    lastModified: contentUpdated,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const guidePages = guides.map((g) => ({
    url: `${site.url}/ratgeber/${g.slug}/`,
    lastModified: new Date(g.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const landing = landingPages.map((p) => ({
    url: `${site.url}/${p.slug}/`,
    lastModified: new Date(p.updated),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const stellen = publishedStellen.filter(stelleIndexable).map((z) => ({
    url: `${site.url}/zulassungsstelle/${z.slug}/`,
    lastModified: new Date(z.geprueftAm),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const kuerzel = kennzeichen.filter(kennzeichenIndexable).map((k) => ({
    url: `${site.url}/kennzeichen/${k.slug}/`,
    lastModified: new Date(k.stellen[0].geprueftAm),
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));

  const freigegeben = SERVICEBEDINGUNGEN_FREIGEGEBEN
    ? [{ url: `${site.url}/servicebedingungen/`, lastModified: contentUpdated, changeFrequency: "yearly" as const, priority: 0.3 }]
    : [];

  return [
    ...staticPages,
    ...freigegeben,
    ...landing,
    ...servicePages,
    ...gewerbePages,
    ...cityPages,
    ...guidePages,
    ...stellen,
    ...kuerzel,
  ];
}
