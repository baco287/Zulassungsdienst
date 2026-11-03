import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { getLandingPage, landingPages } from "@/lib/landingpages";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return landingPages.map((p) => ({ landing: p.slug }));
}

export default async function OgImage({ params }: { params: Promise<{ landing: string }> }) {
  const { landing } = await params;
  const page = getLandingPage(landing);
  if (!page) return createOgImage({ kicker: "Kfz-Zulassung", title: "DeutscheZulassung" });
  return createOgImage({ kicker: "Kfz-Zulassung", title: page.h1, subtitle: page.description });
}
