#!/usr/bin/env node
/**
 * Schreibt die Zugangsdaten für den Mailversand des Formulars nach out/api/mail-zugang.php.
 *
 * Läuft nur im Produktiv-Deploy (.github/workflows/deploy.yml, Job deploy-allinkl) –
 * nie im GitHub-Pages-Job, damit die Daten nicht öffentlich werden.
 * Quelle sind die GitHub-Secrets:
 *   SMTP_USER      Postfach-Adresse, z. B. info@deutschezulassung.de (Pflicht)
 *   SMTP_PASSWORD  Passwort dieses Postfachs (Pflicht)
 *   SMTP_HOST      optional, Standard w0216162.kasserver.com
 *   SMTP_PORT      optional, Standard 587
 *
 * Die Datei ist PHP und gibt beim direkten Aufruf nichts aus; zusätzlich sperrt
 * public/.htaccess den Zugriff. Sie steht in .gitignore und gehört nie ins Repository.
 *
 * Fehlen die Secrets, wird keine Datei geschrieben: Das Formular meldet dann ehrlich
 * „nicht zugestellt“ und bietet WhatsApp und E-Mail an. Der Deploy läuft trotzdem.
 */
import { writeFileSync, existsSync, mkdirSync } from "node:fs";

const { SMTP_USER = "", SMTP_PASSWORD = "", SMTP_HOST = "", SMTP_PORT = "" } = process.env;
const ziel = process.argv[2] ?? "out/api/mail-zugang.php";

if (!SMTP_USER.trim() || !SMTP_PASSWORD) {
  console.log(
    "::warning::Kein Mailzugang hinterlegt (GitHub-Secrets SMTP_USER und SMTP_PASSWORD fehlen). " +
      "Das Formular stellt dann nichts zu und zeigt den Ausweg über WhatsApp/E-Mail.",
  );
  process.exit(0);
}

const port = SMTP_PORT.trim() ? Number(SMTP_PORT) : 587;
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("SMTP_PORT ist keine gültige Portnummer.");
  process.exit(1);
}

/** PHP-String in einfachen Anführungszeichen: nur \ und ' müssen maskiert werden. */
const php = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

const inhalt = `<?php
// Automatisch beim Deploy erzeugt (scripts/mail-zugang.mjs). Nicht bearbeiten, nicht einchecken.
return [
    'host' => ${php(SMTP_HOST.trim())},
    'port' => ${port},
    'user' => ${php(SMTP_USER.trim())},
    'pass' => ${php(SMTP_PASSWORD)},
];
`;

const ordner = ziel.replace(/\/[^/]+$/, "");
if (!existsSync(ordner)) mkdirSync(ordner, { recursive: true });
writeFileSync(ziel, inhalt, { mode: 0o600 });
console.log(`Mailzugang geschrieben (${ziel}, Benutzer ${SMTP_USER.trim().replace(/^(.).*(@.*)$/, "$1…$2")}).`);
