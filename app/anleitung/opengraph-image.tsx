import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Bilderanleitung",
    title: "Auto online zulassen – Schritt für Schritt",
    subtitle:
      "8 bebilderte Schritte vom Auftrag bis zum Kennzeichen vom Schildermacher – ohne Behördengang.",
  });
}
