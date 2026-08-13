import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Für Gewerbekunden",
    title: "Zulassungen im Volumen – planbar und zuverlässig",
    subtitle:
      "Sammelabwicklung, feste Ansprechpartner und Express – für Autohäuser, Händler & Fuhrparks.",
  });
}
