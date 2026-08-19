import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Kostenloses Tool",
    title: "Kfz-Steuer-Rechner",
    subtitle:
      "Hubraum und CO₂-Wert eingeben – sofort die Jahressteuer für Ihr Fahrzeug sehen.",
  });
}
