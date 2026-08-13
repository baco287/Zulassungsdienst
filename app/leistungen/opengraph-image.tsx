import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Leistungen",
    title: "Alle Zulassungs-Leistungen im Überblick",
    subtitle:
      "Neuzulassung, Ummeldung, Abmeldung, Kennzeichen & mehr – digital und zum Festpreis.",
  });
}
