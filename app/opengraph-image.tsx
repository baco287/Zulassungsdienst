import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Digitaler Zulassungsdienst",
    title: "Fahrzeug-Zulassung leicht gemacht",
    subtitle:
      "Neuzulassung, Ummeldung & Abmeldung ohne Behördengang – deutschlandweit zum Festpreis.",
  });
}
