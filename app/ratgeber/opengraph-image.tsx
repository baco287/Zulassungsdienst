import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Ratgeber",
    title: "Wissen rund um die Kfz-Zulassung",
    subtitle:
      "Kosten, Unterlagen, Fristen und Online-Zulassung – verständlich erklärt.",
  });
}
