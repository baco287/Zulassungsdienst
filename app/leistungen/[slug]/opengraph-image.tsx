import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { getService, services, categoryLabels } from "@/lib/services";
import { euro } from "@/lib/pricing";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return createOgImage({ kicker: "Leistung", title: "Kfz-Zulassung" });

  const p = service.price;
  const subtitle =
    p.serviceFee !== null && p.verified && p.inclusive
      ? `Komplettpreis ${euro(p.serviceFee)} – amtliche Gebühren inklusive · ${service.duration}`
      : service.teaser;

  return createOgImage({
    kicker: categoryLabels[service.category],
    title: service.name,
    subtitle,
  });
}
