import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { guides } from "@/lib/ratgeber";
import { gewerbeSegments } from "@/lib/gewerbe";
import { cities } from "@/lib/staedte";
import { site } from "@/lib/site";

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

  const cityPages = cities.map((c) => ({
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

  return [...staticPages, ...servicePages, ...gewerbePages, ...cityPages, ...guidePages];
}
