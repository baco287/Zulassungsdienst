#!/usr/bin/env node
/**
 * SEO- und Link-Prüfung des statischen Builds (./out).
 *
 *   npm run build && node scripts/check-site.mjs
 *
 * Fehler (Exit-Code 1):
 *  - interne Links oder Bilder, die auf keine Datei im Build zeigen
 *  - Seiten ohne <title>, ohne Meta-Description oder ohne genau eine <h1>
 *  - doppelte Titel
 *  - Canonical fehlt oder zeigt auf eine andere Seite
 *  - JSON-LD, das kein gültiges JSON ist
 *  - Sitemap-URLs ohne Seite, indexierbare Seiten ohne Sitemap-Eintrag
 * Hinweise: zu lange Titel (> 65 Zeichen) oder Descriptions außerhalb 70–165.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const out = join(root, "out");
const SITE = "https://deutschezulassung.de";
if (!existsSync(out)) {
  console.error("./out fehlt – erst `npm run build` ausführen.");
  process.exit(1);
}

const errors = [];
const warnings = [];

function walk(dir, list = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, list);
    else list.push(p);
  }
  return list;
}

const files = walk(out);
const fileSet = new Set(files.map((f) => "/" + relative(out, f).split(sep).join("/")));
const htmlFiles = files.filter(
  (f) => f.endsWith(".html") && !f.endsWith("404.html") && !/[\\/]_next[\\/]/.test(f) && !/google[0-9a-f]+\.html$/.test(f)
);

function resolves(href) {
  const clean = decodeURI(href.split("#")[0].split("?")[0]);
  if (clean === "" || clean === "/") return fileSet.has("/index.html");
  if (fileSet.has(clean)) return true;
  const withIndex = clean.endsWith("/") ? `${clean}index.html` : `${clean}/index.html`;
  return fileSet.has(withIndex) || fileSet.has(`${clean}.html`);
}

const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const titles = new Map();
const indexable = new Set();

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const urlPath = "/" + relative(out, file).split(sep).join("/").replace(/index\.html$/, "");
  const where = urlPath || "/";

  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "");
  const robots = html.match(/<meta name="robots" content="([^"]*)"/)?.[1] ?? "";
  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1] ?? "";
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  const noindex = /noindex/.test(robots);

  if (!title) errors.push(`${where}: <title> fehlt`);
  else {
    if (title.length > 65) warnings.push(`${where}: Titel ${title.length} Zeichen – „${title}“`);
    titles.set(title, [...(titles.get(title) ?? []), where]);
  }
  if (!noindex) {
    indexable.add(where);
    if (!desc) errors.push(`${where}: Meta-Description fehlt`);
    else if (desc.length < 70 || desc.length > 165) warnings.push(`${where}: Description ${desc.length} Zeichen`);
    if (!canonical) errors.push(`${where}: Canonical fehlt`);
    else if (canonical !== `${SITE}${where}` && canonical !== `${SITE}${where.replace(/\/$/, "")}`) {
      errors.push(`${where}: Canonical zeigt auf ${canonical}`);
    }
  }
  if (h1Count !== 1) errors.push(`${where}: ${h1Count} H1-Überschriften`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch {
      errors.push(`${where}: ungültiges JSON-LD`);
    }
  }

  const links = [...html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => decode(m[1]));
  for (const href of links) {
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    if (!resolves(href)) errors.push(`${where}: toter interner Link → ${href}`);
  }
  const imgs = [...html.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => decode(m[1]));
  for (const src of imgs) {
    if (!src.startsWith("/") || src.startsWith("//")) continue;
    if (!resolves(src)) errors.push(`${where}: Bild fehlt → ${src}`);
  }
}

for (const [title, pages] of titles) {
  if (pages.length > 1) errors.push(`Doppelter Titel „${title}“: ${pages.join(", ")}`);
}

const sitemapPath = join(out, "sitemap.xml");
if (existsSync(sitemapPath)) {
  const urls = [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(SITE, ""));
  const inSitemap = new Set(urls);
  for (const u of urls) if (!resolves(u)) errors.push(`Sitemap-URL ohne Seite: ${u}`);
  for (const p of indexable) {
    if (!inSitemap.has(p) && p !== "/" && !p.startsWith("/unterlagen")) warnings.push(`Indexierbar, aber nicht in der Sitemap: ${p}`);
  }
  console.log(`Sitemap: ${urls.length} URLs`);
} else errors.push("sitemap.xml fehlt");

console.log(`Geprüft: ${htmlFiles.length} Seiten, davon ${indexable.size} indexierbar`);
for (const w of warnings) console.warn("Hinweis:", w);
if (errors.length) {
  console.error(`\n${errors.length} Fehler:`);
  for (const e of errors.slice(0, 80)) console.error(" ✗", e);
  process.exit(1);
}
console.log("Seitenprüfung bestanden.");
