import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Gemeinsames Open-Graph-Bild-Template (1200×630).
 *
 * Wird von den opengraph-image.tsx-Routen genutzt und beim statischen
 * Export für jede Seite als PNG vorgerendert. Schriften: Lexend
 * (assets/fonts, SIL Open Font License).
 */

export const ogSize = { width: 1200, height: 630 };
export const ogContentType = "image/png";

/** Farben wie im Logo und in app/globals.css (Designsystem v6 „Das Schild“). */
const colors = {
  navy: "#04183f",
  blue: "#0058f8",
  /** Helleres Logo-Blau für Text auf Navy (accent-400, 5,6 : 1) */
  blueLight: "#5591fb",
  text: "#ffffff",
  muted: "#b9c6dc",
};

/** Logo (weiß, transparent) aus scripts/build-logo.sh – als Daten-URL eingebettet. */
async function loadLogo(): Promise<string> {
  const png = await readFile(join(process.cwd(), "assets", "brand", "logo-negativ.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function loadFonts() {
  const dir = join(process.cwd(), "assets", "fonts");
  const [regular, semibold, bold] = await Promise.all([
    readFile(join(dir, "Lexend-400.ttf")),
    readFile(join(dir, "Lexend-600.ttf")),
    readFile(join(dir, "Lexend-700.ttf")),
  ]);
  return [
    { name: "Lexend", data: regular, weight: 400 as const },
    { name: "Lexend", data: semibold, weight: 600 as const },
    { name: "Lexend", data: bold, weight: 700 as const },
  ];
}

export interface OgProps {
  /** Kleine Überzeile, z. B. "Ratgeber" oder die Leistungskategorie. */
  kicker: string;
  title: string;
  /** Optionale Unterzeile; wird bei Überlänge gekürzt. */
  subtitle?: string;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/[\s,;:–-]+\S*$/, "")} …`;
}

export async function createOgImage({ kicker, title, subtitle }: OgProps) {
  const titleSize = title.length > 70 ? 46 : title.length > 40 ? 54 : 64;
  const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Lexend",
          background: colors.navy,
          position: "relative",
        }}
      >
        {/* Blaues Band links mit „D“ – dasselbe Motiv wie im Logo (Kennzeichen) */}
        <div
          style={{
            width: 76,
            height: "100%",
            background: colors.blue,
            display: "flex",
            justifyContent: "center",
            paddingTop: 40,
            color: colors.text,
            fontSize: 54,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          D
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            padding: "52px 64px 48px 56px",
          }}
        >
          {/* Kopfzeile: Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
            <img src={logo} width={480} height={64} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                height: 48,
                padding: "0 20px",
                borderRadius: 12,
                border: "2px solid rgba(255,255,255,0.28)",
                color: colors.text,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              Ohne Behördentermin
            </div>
          </div>

          {/* Inhalt */}
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, justifyContent: "center", maxWidth: 960 }}>
            <div style={{ fontSize: 26, fontWeight: 600, color: colors.blueLight }}>{kicker}</div>
            <div style={{ marginTop: 16, fontSize: titleSize, fontWeight: 700, lineHeight: 1.15, color: colors.text }}>
              {truncate(title, 110)}
            </div>
            {subtitle && (
              <div style={{ marginTop: 22, fontSize: 30, fontWeight: 400, lineHeight: 1.4, color: colors.muted }}>
                {truncate(subtitle, 130)}
              </div>
            )}
          </div>

          {/* Fußzeile */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: 24 }}>
            <div style={{ color: colors.muted, display: "flex" }}>Privater Zulassungsdienst, keine Behörde</div>
            <div style={{ color: colors.text, fontWeight: 600, display: "flex" }}>kfz-zulassungsprofis.de</div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  );
}
