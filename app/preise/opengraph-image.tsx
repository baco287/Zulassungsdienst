import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Preise",
    title: "Transparente Preise ohne versteckte Kosten",
    subtitle:
      "129 € je Zulassung inkl. amtlicher Gebühren und Versand – Kennzeichenschilder zzgl. 28,90 €.",
  });
}
