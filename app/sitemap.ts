import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { site } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    "",
    "/leistungen",
    "/preise",
    "/ablauf",
    "/auftrag",
    "/faq",
    "/kontakt",
    "/ueber-uns",
  ].map((path) => ({
    url: `${site.url}${path}/`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const servicePages = services.map((s) => ({
    url: `${site.url}/leistungen/${s.slug}/`,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...servicePages];
}
