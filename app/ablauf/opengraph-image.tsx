import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "So funktioniert’s",
    title: "In 7 Schritten zur fertigen Zulassung",
    subtitle:
      "Unterlagen digital einreichen, Vollmacht erteilen – den Rest übernehmen wir.",
  });
}
