import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { getGuide, guides } from "@/lib/ratgeber";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return createOgImage({ kicker: "Ratgeber", title: "Kfz-Zulassung" });

  return createOgImage({
    kicker: "Ratgeber",
    title: guide.title,
    subtitle: guide.description,
  });
}
