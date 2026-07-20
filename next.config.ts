import type { NextConfig } from "next";

/**
 * Phase 1: statischer Export (wie beim bestehenden qontex-Workflow).
 * Für Phase 2 (API-Routen, Webhooks, Kundenkonto) `output: "export"` entfernen
 * und auf einen Node-/Edge-Host (z. B. Vercel) wechseln — siehe README, Abschnitt "Ausbau".
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
