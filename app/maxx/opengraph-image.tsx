import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Schnellstart",
    title: "Maxx macht deine Zulassung",
    subtitle:
      "Fotos schicken, fertig – ohne Termin, ohne Behördengang, zum Festpreis.",
  });
}
