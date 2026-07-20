import type { NextConfig } from "next";

/**
 * Phase 1: statischer Export (wie beim bestehenden qontex-Workflow).
 * Für Phase 2 (API-Routen, Webhooks, Kundenkonto) `output: "export"` entfernen
 * und auf einen Node-/Edge-Host (z. B. Vercel) wechseln — siehe README, Abschnitt "Ausbau".
 */
/**
 * NEXT_PUBLIC_BASE_PATH wird im GitHub-Pages-Workflow auf "/Zulassungsdienst"
 * gesetzt (Hosting unter baco287.github.io/Zulassungsdienst). Lokal bleibt er leer.
 * Bei Umzug auf eine eigene Domain: Variable im Workflow einfach entfernen.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
};

export default nextConfig;
