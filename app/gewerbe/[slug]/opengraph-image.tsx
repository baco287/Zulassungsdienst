import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { gewerbeSegments, getSegment } from "@/lib/gewerbe";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return gewerbeSegments.map((s) => ({ slug: s.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const segment = getSegment(slug);
  if (!segment) return createOgImage({ kicker: "Gewerbe", title: "Zulassungsservice" });

  return createOgImage({
    kicker: "Für Gewerbekunden",
    title: segment.title,
    subtitle: segment.description,
  });
}
