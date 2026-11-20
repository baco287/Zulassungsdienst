#!/usr/bin/env node
/**
 * Prüft die Weiterleitungen des Domainumzugs.
 *
 *   node scripts/check-weiterleitungen.mjs --regeln
 *       Ohne Netz: Stehen alle Themen-Weiterleitungen aus config/migration.json in
 *       beiden .htaccess-Dateien, und gibt es ihre Zielseiten im Build (./out)?
 *       Läuft im Deploy-Workflow.
 *
 *   node scripts/check-weiterleitungen.mjs --server 127.0.0.1:8099
 *       Gegen einen lokalen Apache (scripts/weiterleitungen-lokal-testen.sh):
 *       Jede Seite des Builds wird unter der alten Domain angefragt und muss mit
 *       genau einem 301 auf dieselbe Adresse der neuen Domain führen, die dort
 *       mit 200 antwortet.
 *
 *   node scripts/check-weiterleitungen.mjs --live [--stichprobe 40]
 *       Nach dem Livegang gegen die echten Domains (https). Ohne --stichprobe
 *       werden alle Seiten geprüft (ca. 2.500 Anfragen).
 *
 * Exit-Code 1 bei der ersten Abweichung in der Zusammenfassung.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");
const cfg = JSON.parse(readFileSync(join(root, "config", "migration.json"), "utf8"));
const ALT = cfg.alt.domain;
const NEU = cfg.neu.domain;
const THEMEN = cfg.themenWeiterleitungen;

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? "") : null;
};
const fehler = [];
let geprueft = 0;

function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, list);
    else list.push(p);
  }
  return list;
}

function seitenImBuild() {
  if (!existsSync(out)) {
    console.error("./out fehlt – erst `npm run build` ausführen.");
    process.exit(1);
  }
  const files = walk(out).map((f) => "/" + relative(out, f).split(sep).join("/"));
  const seiten = files
    .filter((f) => f.endsWith("/index.html") && !f.startsWith("/_next/") && !f.startsWith("/404/"))
    .map((f) => f.replace(/index\.html$/, ""))
    .sort();
  const dateien = files.filter(
    (f) =>
      !f.startsWith("/_next/") &&
      !f.endsWith(".html") &&
      !f.endsWith(".txt") &&
      !f.endsWith(".php") &&
      !f.split("/").pop().startsWith("."),
  );
  return { seiten, dateien: [...dateien, "/robots.txt", "/llms.txt"].sort() };
}

/* ───────────── Modus 1: Regeln ohne Netz prüfen ───────────── */

function pruefeRegeln() {
  const dateien = {
    "public/.htaccess": readFileSync(join(root, "public", ".htaccess"), "utf8"),
    "deploy/alte-domain/.htaccess": readFileSync(join(root, "deploy", "alte-domain", ".htaccess"), "utf8"),
  };
  for (const [von, nach] of Object.entries(THEMEN)) {
    const muster = `RewriteRule ^${von.replace(/^\/|\/$/g, "")}/?$ https://${NEU}${nach} [R=301,L]`;
    for (const [name, inhalt] of Object.entries(dateien)) {
      if (!inhalt.includes(muster)) fehler.push(`${name}: Regel fehlt oder weicht ab → ${muster}`);
    }
    if (existsSync(out) && !existsSync(join(out, nach, "index.html"))) fehler.push(`Zielseite fehlt im Build: ${nach}`);
    if (existsSync(out) && existsSync(join(out, von, "index.html"))) {
      fehler.push(`Für ${von} gibt es eine echte Seite und zugleich eine Weiterleitung`);
    }
    geprueft++;
  }
  const alt = dateien["deploy/alte-domain/.htaccess"];
  if (!alt.includes(`RewriteRule ^(.*)$ https://${NEU}/$1 [R=301,L]`)) fehler.push("deploy/alte-domain/.htaccess: pfadgleiche 301-Regel fehlt");
  if (/R=302|R=307|\[R[,\]]/.test(alt)) fehler.push("deploy/alte-domain/.htaccess: temporäre Weiterleitung gefunden");
  if (/meta http-equiv|window\.location/i.test(alt)) fehler.push("deploy/alte-domain/.htaccess: enthält keine reine Server-Weiterleitung");
  const neu = dateien["public/.htaccess"];
  if (!neu.includes(`RewriteCond %{HTTP_HOST} ^(www\\.${NEU.replace(/\./g, "\\.")}`)) {
    fehler.push("public/.htaccess: www → Hauptdomain fehlt");
  }
  if (neu.includes(`https://${ALT}/`)) fehler.push("public/.htaccess: leitet noch auf die alte Domain");
}

/* ───────────── Modus 2/3: echte Anfragen ───────────── */

const server = opt("--server");
const live = args.includes("--live");

/** Eine Anfrage ohne automatisches Folgen. Lokal: Verbindung zum Testserver, Host-Kopfzeile aus der URL. */
function anfrage(url, method = "GET") {
  const u = new URL(url);
  return new Promise((resolve) => {
    const lokal = Boolean(server);
    const [h, p] = lokal ? server.split(":") : [u.hostname, u.protocol === "https:" ? 443 : 80];
    const lib = lokal || u.protocol === "http:" ? http : https;
    const req = lib.request(
      {
        host: h,
        port: Number(p),
        method,
        path: u.pathname + u.search,
        headers: { Host: u.host, "User-Agent": "KFZ-Zulassungsprofis-Migrationscheck/1.0" },
        servername: lokal ? undefined : u.hostname,
        timeout: 20000,
      },
      (res) => {
        res.resume();
        res.on("end", () => resolve({ status: res.statusCode, location: res.headers.location ?? "" }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("Zeitüberschreitung")));
    req.on("error", (e) => resolve({ status: 0, location: "", error: e.message }));
    req.end();
  });
}

async function erwarte(von, ziel, { status = 301, zielStatus = 200, method = "GET" } = {}) {
  geprueft++;
  const a = await anfrage(von, method);
  if (a.status !== status) return fehler.push(`${von}: Status ${a.status || a.error} statt ${status}`);
  if (a.location !== ziel) return fehler.push(`${von}: Location ${a.location || "(leer)"} statt ${ziel}`);
  if (zielStatus === null) return;
  const b = await anfrage(ziel, method === "POST" ? "GET" : method);
  if (b.status !== zielStatus) fehler.push(`${ziel}: Ziel antwortet mit ${b.status || b.error}${b.location ? ` → ${b.location}` : ""} statt ${zielStatus} (Kette oder toter Link)`);
}

async function inPaketen(aufgaben, groesse) {
  for (let i = 0; i < aufgaben.length; i += groesse) await Promise.all(aufgaben.slice(i, i + groesse).map((f) => f()));
}

async function pruefeAnfragen() {
  const { seiten, dateien } = seitenImBuild();
  const n = Number(opt("--stichprobe") ?? 0);
  const schritt = n > 0 ? Math.max(1, Math.floor(seiten.length / n)) : 1;
  const auswahl = seiten.filter((_, i) => i % schritt === 0);
  // Für Varianten (www, ohne Schrägstrich, Parameter) genügt eine breite Stichprobe.
  const varianten = seiten.filter((_, i) => i % Math.max(1, Math.floor(seiten.length / 60)) === 0);
  const aufgaben = [];
  // Lokal spricht der Testserver nur http; die Regeln selbst kennen kein Schema.
  const schema = server ? "http" : "https";

  for (const p of auswahl) aufgaben.push(() => erwarte(`${schema}://${ALT}${p}`, `https://${NEU}${p}`));
  for (const p of varianten) {
    aufgaben.push(() => erwarte(`${schema}://www.${ALT}${p}`, `https://${NEU}${p}`));
    aufgaben.push(() => erwarte(`${schema}://www.${NEU}${p}`, `https://${NEU}${p}`));
    aufgaben.push(() => erwarte(`${schema}://${ALT}${p}?leistung=abmeldung&utm_source=test`, `https://${NEU}${p}?leistung=abmeldung&utm_source=test`));
    if (p !== "/") aufgaben.push(() => erwarte(`${schema}://${ALT}${p.replace(/\/$/, "")}`, `https://${NEU}${p}`));
  }
  for (const d of dateien) aufgaben.push(() => erwarte(`${schema}://${ALT}${d}`, `https://${NEU}${d}`));
  for (const [von, nach] of Object.entries(THEMEN)) {
    for (const host of [ALT, `www.${ALT}`, NEU, `www.${NEU}`]) {
      aufgaben.push(() => erwarte(`${schema}://${host}${von}`, `https://${NEU}${nach}`));
      aufgaben.push(() => erwarte(`${schema}://${host}${von.replace(/\/$/, "")}`, `https://${NEU}${nach}`));
    }
  }
  // Unbekannte Adresse: pfadgleich weiter, dort 404 – nicht pauschal auf die Startseite.
  aufgaben.push(() => erwarte(`${schema}://${ALT}/diese-seite-gibt-es-nicht/`, `https://${NEU}/diese-seite-gibt-es-nicht/`, { zielStatus: 404 }));
  // Formular-Endpunkt: 308 erhält die Methode. Das Ziel wird hier nicht aufgerufen (kein Testauftrag).
  for (const host of [ALT, `www.${ALT}`, `www.${NEU}`]) {
    aufgaben.push(() => erwarte(`${schema}://${host}/api/auftrag.php`, `https://${NEU}/api/auftrag.php`, { status: 308, zielStatus: null, method: "POST" }));
  }
  // Keine Schleife: kanonische Adressen antworten direkt.
  for (const p of varianten) {
    aufgaben.push(async () => {
      geprueft++;
      const a = await anfrage(`${schema}://${NEU}${p}`);
      // Live leitet http erst auf https; lokal gibt es nur http.
      if (a.status !== 200) fehler.push(`${schema}://${NEU}${p}: Status ${a.status || a.error}${a.location ? ` → ${a.location}` : ""} statt 200`);
    });
  }
  await inPaketen(aufgaben, server ? 24 : 6);
  console.log(`Seiten: ${auswahl.length} von ${seiten.length} · Varianten-Stichprobe: ${varianten.length} Seiten · Dateien: ${dateien.length}`);
}

if (args.includes("--regeln")) pruefeRegeln();
else if (server || live) await pruefeAnfragen();
else {
  console.error("Aufruf: node scripts/check-weiterleitungen.mjs --regeln | --server host:port | --live [--stichprobe N]");
  process.exit(1);
}

console.log(`Geprüft: ${geprueft} Weiterleitungen`);
if (fehler.length) {
  console.error(`\n${fehler.length} Fehler:`);
  for (const e of fehler.slice(0, 60)) console.error(" ✗", e);
  process.exit(1);
}
console.log("Weiterleitungen in Ordnung.");
