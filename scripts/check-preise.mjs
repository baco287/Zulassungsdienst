#!/usr/bin/env node
/**
 * Preisprüfung für DeutscheZulassung.
 *
 *   node scripts/check-preise.mjs            Quellcode prüfen
 *   node scripts/check-preise.mjs --out      zusätzlich den Build in ./out prüfen
 *   node scripts/check-preise.mjs --freigabe zusätzlich Freigabe verlangen (Produktiv-Deploy)
 *
 * Geprüft wird:
 *  1. config/preise.json ist vollständig und plausibel.
 *  2. Kein Altpreis (129 €, 34,90 €, 28,90 €, 90 € …) steht noch irgendwo im Code.
 *  3. Kein aktueller Preis ist als Zahl fest eingetragen (alle Beträge kommen
 *     aus der Konfiguration – sonst veralten sie bei der nächsten Änderung).
 *  4. Mit --out: Die gebauten Seiten enthalten die aktuellen Preise und keine Altpreise.
 *  5. Mit --freigabe: Die Preise sind freigegeben.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const args = new Set(process.argv.slice(2));
const errors = [];
const warn = [];

const config = JSON.parse(readFileSync(join(root, "config/preise.json"), "utf8"));

/* ── 1. Konfiguration ─────────────────────────────────────────────── */
const amounts = [];
for (const [slug, l] of Object.entries(config.leistungen ?? {})) {
  if (typeof l.preis !== "number" || !(l.preis > 0)) errors.push(`Leistung ${slug}: ungültiger Preis`);
  amounts.push(l.preis);
}
for (const [key, z] of Object.entries(config.zusatzleistungen ?? {})) {
  if (typeof z.preis !== "number" || !(z.preis > 0)) errors.push(`Zusatzleistung ${key}: ungültiger Preis`);
  amounts.push(z.preis);
}
for (const a of amounts) {
  if (Math.round(a * 100) / 100 !== a) errors.push(`Betrag ${a} hat mehr als zwei Nachkommastellen`);
}
for (const required of ["neuzulassung", "ummeldung", "halterwechsel", "wiederzulassung", "abmeldung", "adressaenderung"]) {
  if (!config.leistungen?.[required]) errors.push(`Leistung ${required} fehlt in config/preise.json`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(config.stand ?? "")) errors.push("'stand' muss ein ISO-Datum sein");

const wunsch = config.zusatzleistungen?.wunschkennzeichen?.preis;
const amtlichWunsch = config.amtlicheGebuehren?.wunschkennzeichen?.[0];
if (wunsch && amtlichWunsch && wunsch < amtlichWunsch) {
  warn.push(
    `Wunschkennzeichen ${wunsch.toFixed(2)} € liegt unter der amtlichen Gebühr von ${amtlichWunsch.toFixed(2)} € – DeutscheZulassung trägt die Differenz (Hinweis wird auf der Website angezeigt).`
  );
}

/* ── 2./3. Quellcode ──────────────────────────────────────────────── */
const OLD_PRICES = /(?<![\d,.])(129(,00)? ?€|129 Euro|34,90 ?€|28,90 ?€|90(,00)? ?€)|serviceFee: (129|34\.9|28\.9|90)\b/;
const fmt = (n) => n.toFixed(2).replace(".", ",");
const currentLiterals = [...new Set(amounts)].flatMap((n) => [fmt(n), n.toFixed(2)]);
const CURRENT = new RegExp(`(?<![\\d,.])(${currentLiterals.map((s) => s.replace(".", "\\.")).join("|")})(?![\\d])`);

const SCAN_DIRS = ["app", "components", "lib", "public"];
const SCAN_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".php", ".txt", ".md", ".html"]);
const SKIP = [/public[\\/]downloads/];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (SKIP.some((r) => r.test(p))) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (SCAN_EXT.has(extname(p))) out.push(p);
  }
  return out;
}

for (const dir of SCAN_DIRS) {
  for (const file of walk(join(root, dir))) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      const rel = file.slice(root.length).replace(/\\/g, "/");
      if (OLD_PRICES.test(line)) errors.push(`${rel}:${i + 1} Altpreis gefunden → ${line.trim().slice(0, 120)}`);
      if (CURRENT.test(line) && !/preis-ok/.test(line)) {
        errors.push(`${rel}:${i + 1} Preis fest eingetragen statt aus config/preise.json → ${line.trim().slice(0, 120)}`);
      }
    });
  }
}

/* ── 4. Build ─────────────────────────────────────────────────────── */
if (args.has("--out")) {
  const out = join(root, "out");
  if (!existsSync(out)) {
    errors.push("Ordner ./out fehlt – erst `npm run build` ausführen");
  } else {
    const html = walk(out).filter((f) => f.endsWith(".html") || f.endsWith(".txt"));
    let oldHits = 0;
    for (const file of html) {
      const text = readFileSync(file, "utf8").replace(/ /g, " ");
      const m = text.match(/(?<![\d,.])(129(,00)? ?€|34,90 ?€|28,90 ?€)/);
      if (m) {
        oldHits++;
        if (oldHits <= 10) errors.push(`Build: Altpreis „${m[0]}“ in ${file.slice(out.length)}`);
      }
    }
    const must = {
      "index.html": [config.leistungen.neuzulassung.preis, config.leistungen.abmeldung.preis],
      "preise/index.html": amounts,
    };
    for (const [page, list] of Object.entries(must)) {
      const p = join(out, page);
      if (!existsSync(p)) {
        errors.push(`Build: ${page} fehlt`);
        continue;
      }
      const text = readFileSync(p, "utf8").replace(/ /g, " ");
      for (const n of list) {
        if (!text.includes(`${fmt(n)} €`)) errors.push(`Build: ${page} zeigt ${fmt(n)} € nicht an`);
      }
    }
    console.log(`Build geprüft: ${html.length} Dateien`);
  }
}

/* ── 5. Freigabe ──────────────────────────────────────────────────── */
if (args.has("--freigabe") && config.freigabe?.freigegeben !== true) {
  errors.push(
    "Preise sind nicht freigegeben (config/preise.json → freigabe.freigegeben). Produktiv-Deploy abgebrochen."
  );
}

for (const w of warn) console.warn("Hinweis:", w);
if (errors.length) {
  console.error(`\n${errors.length} Problem(e):`);
  for (const e of errors) console.error(" ✗", e);
  process.exit(1);
}
console.log(`Preisprüfung bestanden (Stand ${config.stand}, freigegeben: ${config.freigabe?.freigegeben ? "ja" : "nein"}).`);
