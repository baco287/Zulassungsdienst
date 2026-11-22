#!/usr/bin/env node
/**
 * Schreibt den API-Schlüssel für die KI-Ideen des Kennzeichenassistenten nach out/api/ki-zugang.php.
 *
 * Läuft nur im Produktiv-Deploy (.github/workflows/deploy.yml, Job deploy-allinkl) –
 * nie im GitHub-Pages-Job, damit der Schlüssel nicht öffentlich wird.
 * Quelle ist das GitHub-Secret:
 *   ANTHROPIC_API_KEY   API-Schlüssel der Claude Console (beginnt mit „sk-ant-“)
 *
 * Empfehlung: in der Claude Console einen eigenen Workspace „Kennzeichenassistent“ mit eigenem
 * Schlüssel und eigenem Ausgabenlimit anlegen. Dann ist der Verbrauch dort getrennt sichtbar,
 * und ein Fehler hier kann nie das Budget der anderen Projekte aufbrauchen.
 *
 * Die Datei ist PHP und gibt beim direkten Aufruf nichts aus; zusätzlich sperrt
 * public/.htaccess den Zugriff. Sie steht in .gitignore und gehört nie ins Repository.
 *
 * Fehlt das Secret, wird keine Datei geschrieben: Der Assistent arbeitet dann nur mit dem
 * Generator im Browser (Vorschläge, Regelprüfung, Vorschau – alles ohne KI). Der Deploy läuft trotzdem.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const { ANTHROPIC_API_KEY = "" } = process.env;
const ziel = process.argv[2] ?? "out/api/ki-zugang.php";
const key = ANTHROPIC_API_KEY.trim();

if (!key) {
  console.log(
    "::warning::Kein KI-Zugang hinterlegt (GitHub-Secret ANTHROPIC_API_KEY fehlt). " +
      "Der Kennzeichenassistent läuft dann ohne KI-Ideen, nur mit dem Generator.",
  );
  process.exit(0);
}
if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) {
  console.log("::warning::ANTHROPIC_API_KEY sieht nicht wie ein Claude-API-Schlüssel aus – der Kennzeichenassistent läuft ohne KI.");
  process.exit(0);
}
if (key.startsWith("sk-ant-admin")) {
  console.error("ANTHROPIC_API_KEY ist ein Admin-Schlüssel. Für die Website bitte einen normalen API-Schlüssel verwenden.");
  process.exit(1);
}

/** PHP-String in einfachen Anführungszeichen: nur \ und ' müssen maskiert werden. */
const php = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const inhalt = `<?php
// Automatisch beim Deploy erzeugt (scripts/ki-zugang.mjs). Nicht bearbeiten, nicht einchecken.
return [
    'key' => ${php(key)},
];
`;

const ordner = ziel.replace(/\/[^/]+$/, "");
if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true });
writeFileSync(ziel, inhalt, { mode: 0o600 });
console.log(`KI-Zugang geschrieben (${ziel}, Schlüssel endet auf …${key.slice(-4)}).`);
