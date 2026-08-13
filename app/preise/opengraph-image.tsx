import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Preise",
    title: "Transparente Preise ohne versteckte Kosten",
    subtitle:
      "Komplettpreis 129 € je Zulassung – amtliche Gebühren, Kennzeichen und Versand inklusive.",
  });
}
