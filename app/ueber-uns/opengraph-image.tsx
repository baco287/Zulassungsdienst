import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Über uns",
    title: "Ihr digitaler Zulassungsdienst",
    subtitle:
      "Persönlich betreut, deutschlandweit – von der Neuzulassung bis zur Abmeldung.",
  });
}
