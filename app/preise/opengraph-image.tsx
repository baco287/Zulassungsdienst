import { createOgImage, ogContentType, ogSize } from "@/lib/og";
import { P } from "@/lib/pricing";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Preise",
    title: "Transparente Preise ohne versteckte Kosten",
    subtitle:
      `${P.zulassung} je Zulassung inkl. amtlicher Gebühren und Versand – Kennzeichenschilder zzgl. ${P.kennzeichen}.`,
  });
}
