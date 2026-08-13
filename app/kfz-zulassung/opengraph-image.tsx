import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Deutschlandweit digital",
    title: "Kfz-Zulassung in Ihrer Stadt – ohne Termin",
    subtitle:
      "Berlin, Hamburg, München, Köln & mehr – wir übernehmen den Behördengang zum Festpreis.",
  });
}
