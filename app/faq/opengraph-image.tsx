import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "FAQ",
    title: "Häufige Fragen zur Kfz-Zulassung",
    subtitle: "Kosten, Dauer, Unterlagen: alle Antworten auf einen Blick.",
  });
}
