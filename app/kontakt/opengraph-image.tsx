import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Kontakt",
    title: "Wir sind für Sie da",
    subtitle: "E-Mail, Telefon oder WhatsApp – Mo–Fr 8:00–18:00 Uhr.",
  });
}
