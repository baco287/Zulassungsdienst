import { createOgImage, ogContentType, ogSize } from "@/lib/og";

export const dynamic = "force-static";
export const size = ogSize;
export const contentType = ogContentType;

export default function OgImage() {
  return createOgImage({
    kicker: "Kostenlos & ohne Anmeldung",
    title: "Vorlagen & Downloads",
    subtitle:
      "Vollmacht zur Kfz-Zulassung und Unterlagen-Checkliste – druckfertig als Muster.",
  });
}
