import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Zulassung per Chat",
    title: "Kfz-Zulassung per WhatsApp erledigen",
    subtitle:
      "Unterlagen abfotografieren, senden, fertig – ohne Formular und ohne Behördengang.",
  });
}
