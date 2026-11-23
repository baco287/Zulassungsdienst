import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "KI-Kennzeichenassistent",
    title: "Finde dein perfektes Wunschkennzeichen",
    subtitle: "Ort eingeben, Wünsche nennen, Ideen sofort als Kennzeichen sehen.",
  });
}
