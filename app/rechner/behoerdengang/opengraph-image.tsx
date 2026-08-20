import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Kostenloses Tool",
    title: "Was kostet der Behördengang wirklich?",
    subtitle:
      "Gebühren + Kennzeichen + Fahrt + Ihre Zeit – ehrlich gerechnet und verglichen.",
  });
}
