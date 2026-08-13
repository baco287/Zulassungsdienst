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

const colors = {
  brand50: "#eff6ff",
  brand100: "#dbeafe",
  brand600: "#2563eb",
  brand700: "#1d4ed8",
  ink500: "#64748b",
  ink600: "#475569",
  ink900: "#0f172a",
};

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

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          fontFamily: "Lexend",
          background: `linear-gradient(135deg, ${colors.brand50} 0%, #ffffff 42%, ${colors.brand50} 100%)`,
          position: "relative",
        }}
      >
        {/* Dekor: weiche Kreise */}
        <div
          style={{
            position: "absolute",
            top: -180,
            right: -140,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: colors.brand100,
            opacity: 0.55,
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -220,
            left: -160,
            width: 420,
            height: 420,
            borderRadius: 9999,
            background: colors.brand100,
            opacity: 0.4,
            display: "flex",
          }}
        />

        {/* Kopfzeile: Logo + Kennzeichen-Element */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                background: colors.brand700,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 30,
                fontWeight: 700,
              }}
            >
              DZ
            </div>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
              <span style={{ color: colors.ink900 }}>Deutsche</span>
              <span style={{ color: colors.brand700 }}>Zulassung</span>
            </div>
          </div>

          {/* Stilisiertes Kennzeichen */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              borderRadius: 12,
              border: `3px solid ${colors.ink900}`,
              background: "#ffffff",
              overflow: "hidden",
              height: 56,
            }}
          >
            <div
              style={{
                width: 34,
                background: colors.brand700,
                color: "#ffffff",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "center",
                fontSize: 18,
                fontWeight: 600,
                paddingBottom: 6,
              }}
            >
              D
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 18px",
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: 4,
                color: colors.ink900,
              }}
            >
              OHNE · TERMIN
            </div>
          </div>
        </div>

        {/* Inhalt */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
            maxWidth: 1020,
          }}
        >
          <div
            style={{
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: colors.brand600,
            }}
          >
            {kicker}
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              color: colors.ink900,
            }}
          >
            {truncate(title, 110)}
          </div>
          {subtitle && (
            <div
              style={{
                marginTop: 22,
                fontSize: 30,
                fontWeight: 400,
                lineHeight: 1.4,
                color: colors.ink600,
              }}
            >
              {truncate(subtitle, 130)}
            </div>
          )}
        </div>

        {/* Fußzeile */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 26,
          }}
        >
          <div style={{ color: colors.ink500, display: "flex" }}>
            Kfz-Zulassung. Einfach digital.
          </div>
          <div style={{ color: colors.brand700, fontWeight: 600, display: "flex" }}>
            deutschezulassung.de
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts: await loadFonts() },
  );
}
