import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Online-Auftrag",
    title: "Zulassung jetzt online beauftragen",
    subtitle:
      "In wenigen Minuten ausgefüllt – Übermittlung bequem per WhatsApp oder E-Mail.",
  });
}
