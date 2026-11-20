#!/usr/bin/env node
/**
 * Werkzeug für die Domainmigration deutschezulassung.de → kfz-zulassungsprofis.de.
 *
 *   node scripts/migration.mjs snapshot <datei.json|datei.json.gz>
 *       Hält den SEO-Stand des Builds in ./out fest: je Seite Titel, Description,
 *       Robots, Canonical, og:url, H1, H2, JSON-LD-Typen, Wortzahl und Text-Prüfsumme,
 *       dazu Sitemap und Dateiliste.
 *
 *   node scripts/migration.mjs vergleich <vorher.json> [--csv <url-mapping.csv>] [--bericht <datei.md>]
 *       Vergleicht den Stand vor der Umstellung mit dem aktuellen Build in ./out.
 *       Marke und Domain werden im alten Stand rechnerisch ersetzt; gemeldet wird
 *       nur, was darüber hinaus abweicht. Exit-Code 1, wenn eine URL fehlt, eine
 *       Seite ihre Indexierbarkeit verliert oder ein Canonical nicht passt.
 *
 * Alte und neue Bezeichnung kommen aus config/migration.json.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "out");

const cfg = JSON.parse(readFileSync(join(root, "config", "migration.json"), "utf8"));
const ALT = { name: cfg.alt.name, domain: cfg.alt.domain, url: `https://${cfg.alt.domain}` };
const NEU = { name: cfg.neu.name, domain: cfg.neu.domain, url: `https://${cfg.neu.domain}` };

/** Themen-Weiterleitungen, die schon auf der alten Domain galten. */
const THEMEN_WEITERLEITUNGEN = cfg.themenWeiterleitungen;

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, list);
    else list.push(p);
  }
  return list;
}

const strip = (html) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();

function jsonLdTypes(html) {
  const types = new Set();
  const collect = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(collect);
    if (node["@type"]) [].concat(node["@type"]).forEach((t) => types.add(t));
    Object.values(node).forEach(collect);
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      collect(JSON.parse(m[1]));
    } catch {
      types.add("UNGUELTIG");
    }
  }
  return [...types].sort();
}

function snapshot() {
  if (!existsSync(out)) {
    console.error("./out fehlt – erst `npm run build` ausführen.");
    process.exit(1);
  }
  const files = walk(out);
  const pages = {};
  for (const file of files) {
    const rel = "/" + relative(out, file).split(sep).join("/");
    if (!rel.endsWith(".html") || rel.startsWith("/_next/") || /^\/google[0-9a-f]+\.html$/.test(rel)) continue;
    const html = readFileSync(file, "utf8");
    const path = rel === "/404.html" ? "/404.html" : rel.replace(/index\.html$/, "");
    if (rel.startsWith("/404/")) continue;
    const meta = (re) => decode(html.match(re)?.[1] ?? "");
    const main = html.match(/<main[\s\S]*?<\/main>/)?.[0] ?? html;
    const text = strip(main);
    pages[path] = {
      title: meta(/<title>([^<]*)<\/title>/),
      description: meta(/<meta name="description" content="([^"]*)"/),
      robots: meta(/<meta name="robots" content="([^"]*)"/),
      canonical: meta(/<link rel="canonical" href="([^"]*)"/),
      ogUrl: meta(/<meta property="og:url" content="([^"]*)"/),
      ogTitle: meta(/<meta property="og:title" content="([^"]*)"/),
      ogSiteName: meta(/<meta property="og:site_name" content="([^"]*)"/),
      ogImage: meta(/<meta property="og:image" content="([^"]*)"/),
      h1: [...main.matchAll(/<h1[\s>][\s\S]*?<\/h1>/g)].map((m) => strip(m[0])),
      h2: [...main.matchAll(/<h2[\s>][\s\S]*?<\/h2>/g)].map((m) => strip(m[0])),
      h3: (main.match(/<h3[\s>]/g) ?? []).length,
      jsonLd: jsonLdTypes(html),
      words: text.split(" ").filter(Boolean).length,
      text,
      links: [...new Set([...html.matchAll(/<a [^>]*href="(\/[^"#?]*)/g)].map((m) => m[1]))].length,
    };
  }
  const sitemap = existsSync(join(out, "sitemap.xml"))
    ? [...readFileSync(join(out, "sitemap.xml"), "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    : [];
  const assets = files
    .map((f) => "/" + relative(out, f).split(sep).join("/"))
    // Ohne Next-Interna und RSC-Nutzlasten (*.txt); robots.txt und llms.txt zählen mit.
    .filter((f) => (!f.startsWith("/_next/") && !f.endsWith(".html") && !f.endsWith(".txt")) || /^\/(robots|llms)\.txt$/.test(f))
    .sort();
  return { erstellt: new Date().toISOString(), pages, sitemap, assets };
}

/**
 * Rechnet den alten Stand auf die neue Marke um. E-Mail-Adressen bleiben stehen:
 * Die Postfächer ziehen erst um, wenn sie unter der neuen Domain eingerichtet sind.
 */
const MAIL = "\u0000mail\u0000";
const umbenannt = (s) =>
  s
    .split(`@${ALT.domain}`).join(MAIL)
    .split(ALT.url).join(NEU.url)
    .split(ALT.domain).join(NEU.domain)
    .split(ALT.name).join(NEU.name)
    .split(MAIL).join(`@${ALT.domain}`);
const hash = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const csv = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

function vergleich(vorherPfad, opts) {
  const roh = readFileSync(vorherPfad);
  const vorher = JSON.parse((vorherPfad.endsWith(".gz") ? gunzipSync(roh) : roh).toString("utf8"));
  const jetzt = snapshot();
  const fehler = [];
  const hinweise = [];
  const zeilen = [];
  const felder = { title: 0, description: 0, h1: 0, h2: 0, text: 0, jsonLd: 0 };
  const beispiele = { title: [], description: [], h1: [], h2: [], text: [], jsonLd: [] };
  const neueSitemap = new Set(jetzt.sitemap);
  const alteSitemap = new Set(vorher.sitemap);

  for (const [path, alt] of Object.entries(vorher.pages)) {
    const neu = jetzt.pages[path];
    const altIndex = !/noindex/.test(alt.robots);
    if (!neu) {
      fehler.push(`Seite fehlt im neuen Build: ${path}`);
      zeilen.push([ALT.url + path, "", "FEHLT", altIndex ? "index" : "noindex", "", "", ""]);
      continue;
    }
    const neuIndex = !/noindex/.test(neu.robots);
    const abweichungen = [];
    if (path !== "/404.html") {
      if (altIndex && !neuIndex) fehler.push(`${path}: war indexierbar, ist jetzt noindex`);
      if (!altIndex && neuIndex) hinweise.push(`${path}: war noindex, ist jetzt indexierbar`);
      const soll = NEU.url + path;
      if (neuIndex && neu.canonical !== soll) fehler.push(`${path}: Canonical ${neu.canonical || "(leer)"} statt ${soll}`);
      if (neuIndex && neu.ogUrl !== soll) fehler.push(`${path}: og:url ${neu.ogUrl || "(leer)"} statt ${soll}`);
      if (alteSitemap.has(ALT.url + path) && !neueSitemap.has(NEU.url + path)) fehler.push(`${path}: stand in der alten Sitemap, fehlt in der neuen`);
    }
    for (const f of ["title", "description"]) {
      if (umbenannt(alt[f]) !== neu[f]) {
        felder[f]++;
        abweichungen.push(f);
        if (beispiele[f].length < 400) beispiele[f].push({ path, alt: alt[f], neu: neu[f] });
      }
    }
    for (const f of ["h1", "h2", "jsonLd"]) {
      if (umbenannt(JSON.stringify(alt[f])) !== JSON.stringify(neu[f])) {
        felder[f]++;
        abweichungen.push(f);
        if (beispiele[f].length < 400) beispiele[f].push({ path, alt: alt[f], neu: neu[f] });
      }
    }
    if (umbenannt(alt.text) !== neu.text) {
      felder.text++;
      abweichungen.push(`text(${alt.words}→${neu.words} Wörter)`);
      if (beispiele.text.length < 400) beispiele.text.push({ path, alt: alt.words, neu: neu.words });
    }
    for (const marke of [ALT.name, ALT.domain]) {
      const treffer = [neu.title, neu.description, neu.canonical, neu.ogUrl, neu.ogSiteName, ...neu.h1, ...neu.h2].filter((v) => v.includes(marke));
      if (treffer.length) fehler.push(`${path}: alte Bezeichnung „${marke}“ in Titel/Meta/Überschrift`);
    }
    zeilen.push([
      ALT.url + path,
      NEU.url + path,
      "301 pfadgleich",
      neuIndex ? "index" : "noindex",
      neueSitemap.has(NEU.url + path) ? "ja" : "nein",
      neu.title,
      abweichungen.join(" | "),
    ]);
  }
  for (const [von, nach] of Object.entries(THEMEN_WEITERLEITUNGEN)) {
    if (!jetzt.pages[nach]) fehler.push(`Ziel der Themen-Weiterleitung fehlt: ${nach}`);
    zeilen.push([ALT.url + von, NEU.url + nach, "301 Themen-Weiterleitung (direkt aufs Endziel)", "index", "ja", jetzt.pages[nach]?.title ?? "", ""]);
  }
  const neuePfade = Object.keys(jetzt.pages).filter((p) => !vorher.pages[p]);
  for (const p of neuePfade) hinweise.push(`Neue Seite ohne Vorgänger: ${p}`);

  const fehlendeAssets = vorher.assets.filter((a) => !jetzt.assets.includes(a));
  for (const a of fehlendeAssets) hinweise.push(`Datei aus dem alten Build fehlt: ${a}`);
  const neueAssets = jetzt.assets.filter((a) => !vorher.assets.includes(a));

  const indexAlt = Object.values(vorher.pages).filter((p) => !/noindex/.test(p.robots)).length;
  const indexNeu = Object.values(jetzt.pages).filter((p) => !/noindex/.test(p.robots)).length;

  if (opts.csv) {
    mkdirSync(dirname(opts.csv), { recursive: true });
    const kopf = ["alte_url", "neue_url", "weiterleitung", "robots_neu", "in_sitemap_neu", "titel_neu", "abweichung_ausser_marke"];
    writeFileSync(opts.csv, [kopf, ...zeilen].map((z) => z.map(csv).join(";")).join("\n") + "\n", "utf8");
  }

  const md = [];
  md.push(`# Vergleich alt/neu (automatisch erzeugt)`, "");
  md.push(`Erstellt: ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Ausgangsstand: ${vorher.erstellt.slice(0, 10)}`, "");
  md.push(`| Kennzahl | alt | neu |`, `|---|---|---|`);
  md.push(`| HTML-Seiten | ${Object.keys(vorher.pages).length} | ${Object.keys(jetzt.pages).length} |`);
  md.push(`| davon indexierbar | ${indexAlt} | ${indexNeu} |`);
  md.push(`| Sitemap-URLs | ${vorher.sitemap.length} | ${jetzt.sitemap.length} |`);
  md.push(`| Sonstige Dateien (Bilder, OG-Bilder, Downloads …) | ${vorher.assets.length} | ${jetzt.assets.length} |`, "");
  md.push(`## Abweichungen über Marke und Domain hinaus`, "");
  md.push(`| Feld | Seiten mit Abweichung |`, `|---|---|`);
  for (const [f, n] of Object.entries(felder)) md.push(`| ${f} | ${n} |`);
  md.push("");
  for (const f of ["title", "description", "h1"]) {
    if (!beispiele[f].length) continue;
    md.push(`### ${f}`, "", `| Seite | alt | neu |`, `|---|---|---|`);
    for (const b of beispiele[f]) md.push(`| ${b.path} | ${[].concat(b.alt).join(" · ")} | ${[].concat(b.neu).join(" · ")} |`);
    md.push("");
  }
  if (beispiele.h2.length) {
    md.push(`### h2`, "");
    for (const b of beispiele.h2.slice(0, 60)) {
      const a = new Set(b.alt.map(umbenannt));
      const n = new Set(b.neu);
      const weg = [...a].filter((x) => !n.has(x));
      const dazu = [...n].filter((x) => !a.has(x));
      md.push(`- ${b.path}: entfernt ${JSON.stringify(weg)} · neu ${JSON.stringify(dazu)}`);
    }
    md.push("");
  }
  if (beispiele.text.length) {
    md.push(`### Fließtext (Wortzahl alt → neu)`, "");
    for (const b of beispiele.text.slice(0, 80)) md.push(`- ${b.path}: ${b.alt} → ${b.neu}`);
    if (beispiele.text.length > 80) md.push(`- … und ${beispiele.text.length - 80} weitere`);
    md.push("");
  }
  md.push(`## Neue Dateien`, "", neueAssets.length ? neueAssets.map((a) => `- ${a}`).join("\n") : "keine", "");
  md.push(`## Hinweise (${hinweise.length})`, "", hinweise.length ? hinweise.map((h) => `- ${h}`).join("\n") : "keine", "");
  md.push(`## Fehler (${fehler.length})`, "", fehler.length ? fehler.map((h) => `- ${h}`).join("\n") : "keine", "");
  if (opts.bericht) {
    mkdirSync(dirname(opts.bericht), { recursive: true });
    writeFileSync(opts.bericht, md.join("\n"), "utf8");
  }

  console.log(`Seiten alt/neu: ${Object.keys(vorher.pages).length}/${Object.keys(jetzt.pages).length} · indexierbar ${indexAlt}/${indexNeu} · Sitemap ${vorher.sitemap.length}/${jetzt.sitemap.length}`);
  console.log(`Abweichungen außer Marke/Domain:`, JSON.stringify(felder));
  console.log(`URL-Zuordnungen: ${zeilen.length}${opts.csv ? ` → ${relative(root, opts.csv)}` : ""}`);
  for (const h of hinweise.slice(0, 30)) console.warn("Hinweis:", h);
  if (fehler.length) {
    console.error(`\n${fehler.length} Fehler:`);
    for (const e of fehler.slice(0, 60)) console.error(" ✗", e);
    process.exit(1);
  }
  console.log("Migrationsvergleich bestanden.");
}

const [, , cmd, datei, ...rest] = process.argv;
const arg = (name) => {
  const i = rest.indexOf(name);
  return i >= 0 ? join(process.cwd(), rest[i + 1]) : null;
};
if (cmd === "snapshot" && datei) {
  const snap = snapshot();
  mkdirSync(dirname(join(process.cwd(), datei)), { recursive: true });
  const json = Buffer.from(JSON.stringify(snap), "utf8");
  writeFileSync(join(process.cwd(), datei), datei.endsWith(".gz") ? gzipSync(json, { level: 9 }) : json);
  console.log(`Snapshot: ${Object.keys(snap.pages).length} Seiten, ${snap.sitemap.length} Sitemap-URLs, ${snap.assets.length} Dateien → ${datei} (${hash(JSON.stringify(snap.pages))})`);
} else if (cmd === "vergleich" && datei) {
  vergleich(join(process.cwd(), datei), { csv: arg("--csv"), bericht: arg("--bericht") });
} else {
  console.error("Aufruf: node scripts/migration.mjs snapshot <datei.json> | vergleich <vorher.json> [--csv datei] [--bericht datei]");
  process.exit(1);
}
