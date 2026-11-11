#!/usr/bin/env node
/**
 * Prüft, dass Zeit- und Ablaufversprechen nur aus config/betrieb.json kommen.
 *
 *   node scripts/check-daten.mjs          Quellcode prüfen
 *   node scripts/check-daten.mjs --out    zusätzlich den statischen Export (out/)
 *
 * Fehler (Exit 1):
 *   - fest eingetragene Werktag- oder Minuten-Spannen, "taggleich", "am selben Werktag" oder
 *     Reaktionszeit-Versprechen ("in wenigen Minuten") in app/, components/, lib/
 *   - Werktag-Spannen im Build, die nicht in config/betrieb.json stehen
 * Hinweise (kein Fehler):
 *   - offene Betreiberentscheidungen und fehlende Freigabe in config/betrieb.json
 *   - Express-/Folgetag-Aussagen, die bewusst nicht zentralisiert sind
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const checkOut = process.argv.includes("--out");
const config = JSON.parse(readFileSync(join(root, "config/betrieb.json"), "utf8"));

const errors = [];
const hints = [];

/* ── Konfiguration ─────────────────────────────────────────────── */

const offen = [];
(function walk(node, path) {
  if (!node || typeof node !== "object") return;
  if (node.status === "offen" && typeof node.frage === "string") offen.push(`${path}: ${node.frage}`);
  for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, path ? `${path}.${k}` : k);
})(config, "");

if (!config.freigabe?.freigegeben) {
  hints.push("config/betrieb.json ist noch nicht freigegeben – übernommene Zeitwerte gelten als vorläufig.");
}
for (const o of offen) hints.push(`Offene Betreiberentscheidung – ${o}`);

const erlaubteSpannen = new Set();
for (const e of Object.values(config.zeiten.bearbeitung)) {
  if (Array.isArray(e.werktage)) erlaubteSpannen.add(`${e.werktage[0]}–${e.werktage[1]}`);
}
const kennzeichenVersand = config.zeiten.versand?.kennzeichen?.werktage;
if (Array.isArray(kennzeichenVersand)) erlaubteSpannen.add(`${kennzeichenVersand[0]}–${kennzeichenVersand[1]}`);
if (Array.isArray(config.zeiten.versand?.werktage)) {
  erlaubteSpannen.add(`${config.zeiten.versand.werktage[0]}–${config.zeiten.versand.werktage[1]}`);
}

/* ── Quellcode ─────────────────────────────────────────────────── */

const SOURCE_DIRS = ["app", "components", "lib"];
const IGNORE = new Set([
  join("lib", "betrieb.ts"),
  join("lib", "types.ts"),
  join("lib", "data", "zulassungsstellen.json"),
]);
const VERBOTEN = [
  { rx: /\b\d+\s?[–-]\s?\d+ Werktag/, was: "Werktag-Spanne" },
  { rx: /\b\d+\s?[–-]\s?\d+ Minuten/, was: "Minuten-Spanne" },
  { rx: /\btaggleich\b/, was: "„taggleich“" },
  { rx: /\bam selben Werktag\b/, was: "„am selben Werktag“" },
  { rx: /(Antwort|antworten|melden uns|zurückmelden)[^.]{0,40}(wenigen Minuten|in Minuten|binnen weniger Minuten)/i, was: "Reaktionszeit-Versprechen" },
];
const AUSNAHME_ZEILE = /Express|Folgetag|nach Vereinbarung/;

function files(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (/\.(tsx?|json)$/.test(name)) out.push(p);
  }
  return out;
}

for (const dir of SOURCE_DIRS) {
  for (const file of files(join(root, dir))) {
    const rel = relative(root, file);
    if (IGNORE.has(rel)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
        for (const { rx, was } of VERBOTEN) {
          if (!rx.test(line)) continue;
          const ort = `${rel.split(sep).join("/")}:${i + 1}`;
          if (AUSNAHME_ZEILE.test(line)) hints.push(`${ort}: ${was} in Express-/Sonderaussage – bewusst nicht zentral, fachlich prüfen.`);
          else errors.push(`${ort}: fest eingetragene ${was} – bitte ZEIT/DAUER_UEBERSICHT aus lib/betrieb.ts verwenden.`);
        }
      });
  }
}

/* ── Build-Ausgabe ─────────────────────────────────────────────── */

if (checkOut) {
  const outDir = join(root, "out");
  const unbekannt = new Map();
  let seiten = 0;
  for (const file of files(outDir).concat(
    readdirSync(outDir, { recursive: true })
      .map((f) => join(outDir, f))
      .filter((f) => f.endsWith(".html")),
  )) {
    if (!file.endsWith(".html")) continue;
    seiten++;
    const text = readFileSync(file, "utf8").replace(/<script[\s\S]*?<\/script>/g, "");
    for (const m of text.matchAll(/(\d+)\s?[–-]\s?(\d+)(?:<!-- -->)?\s?Werktag/g)) {
      const s = `${m[1]}–${m[2]}`;
      if (!erlaubteSpannen.has(s)) {
        const rel = relative(outDir, file).split(sep).join("/");
        if (!unbekannt.has(s)) unbekannt.set(s, []);
        unbekannt.get(s).push(rel);
      }
    }
  }
  for (const [s, wo] of unbekannt) {
    const behoerde = wo.every((w) => w.startsWith("zulassungsstelle/"));
    const msg = `Build: Werktag-Spanne „${s}“ steht nicht in config/betrieb.json (${wo.length}×, z. B. ${wo[0]})`;
    if (behoerde) hints.push(`${msg} – Behördenangabe aus Quelldaten.`);
    else errors.push(msg);
  }
  hints.push(`Build geprüft: ${seiten} HTML-Seiten.`);
}

/* ── Ausgabe ───────────────────────────────────────────────────── */

for (const h of hints) console.log(`Hinweis: ${h}`);
if (errors.length) {
  for (const e of errors) console.error(`FEHLER: ${e}`);
  console.error(`\nDatenprüfung fehlgeschlagen: ${errors.length} Fehler.`);
  process.exit(1);
}
console.log(`Datenprüfung bestanden (Stand ${config.stand}, freigegeben: ${config.freigabe?.freigegeben ? "ja" : "nein"}, offene Entscheidungen: ${offen.length}).`);
