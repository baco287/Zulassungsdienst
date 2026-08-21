import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { cities, getCity } from "@/lib/staedte";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return cities.map((c) => ({ stadt: c.slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ stadt: string }>;
}) {
  const { stadt } = await params;
  const city = getCity(stadt);
  if (!city) return createOgImage({ kicker: "Kfz-Zulassung", title: "In Ihrer Stadt" });

  return createOgImage({
    kicker: "Digital statt Behördengang",
    title: `Kfz-Zulassung ${city.name}`,
    subtitle: `Ohne Termin bei der Zulassungsstelle – 129 € inkl. Gebühren und Versand, Kennzeichen zzgl. 28,90 €.`,
  });
}
