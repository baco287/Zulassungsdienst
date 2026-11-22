#!/usr/bin/env node
/**
 * Schreibt die Zugangsdaten des Analytics-Dashboards nach out/api/analytics-zugang.php.
 *
 * Läuft nur im Produktiv-Deploy (.github/workflows/deploy.yml, Job deploy-allinkl) –
 * nie im GitHub-Pages-Job. Quelle sind die GitHub-Secrets:
 *   ANALYTICS_USER      Benutzername für https://kfz-zulassungsprofis.de/analytics/ (Pflicht)
 *   ANALYTICS_PASSWORD  Passwort, mindestens 10 Zeichen (Pflicht)
 *
 * Die Datei ist PHP und gibt beim direkten Aufruf nichts aus; zusätzlich sperrt
 * public/.htaccess den Zugriff. Sie steht in .gitignore und gehört nie ins Repository.
 *
 * Fehlen die Secrets, wird keine Datei geschrieben: Das Dashboard meldet dann „Zugang noch
 * nicht eingerichtet“. Die Erfassung der Besuche läuft trotzdem, und der Deploy auch.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const { ANALYTICS_USER = "", ANALYTICS_PASSWORD = "" } = process.env;
const ziel = process.argv[2] ?? "out/api/analytics-zugang.php";

if (!ANALYTICS_USER.trim() || !ANALYTICS_PASSWORD) {
  console.log(
    "::warning::Kein Zugang für das Analytics-Dashboard hinterlegt (GitHub-Secrets ANALYTICS_USER und " +
      "ANALYTICS_PASSWORD fehlen). Die Besuche werden erfasst, das Dashboard bleibt gesperrt.",
  );
  process.exit(0);
}
if (ANALYTICS_PASSWORD.length < 10) {
  console.log("::warning::ANALYTICS_PASSWORD ist kürzer als 10 Zeichen – das Dashboard bleibt gesperrt.");
  process.exit(0);
}

/** PHP-String in einfachen Anführungszeichen: nur \ und ' müssen maskiert werden. */
const php = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const inhalt = `<?php
// Automatisch beim Deploy erzeugt (scripts/analytics-zugang.mjs). Nicht bearbeiten, nicht einchecken.
return [
    'user' => ${php(ANALYTICS_USER.trim())},
    'pass' => ${php(ANALYTICS_PASSWORD)},
];
`;

const ordner = ziel.replace(/\/[^/]+$/, "");
if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true });
writeFileSync(ziel, inhalt, { mode: 0o600 });
console.log(`Analytics-Zugang geschrieben (${ziel}, Benutzer ${ANALYTICS_USER.trim().slice(0, 1)}…).`);
