#!/usr/bin/env node
/**
 * Automatische Gegenprüfung recherchierter Zulassungsstellen-Rohdaten.
 *
 *   node scripts/verify-zulassungsstellen.mjs <rohdaten.json …> --out <ordner>
 *
 * Für jede Datei entsteht <ordner>/<name>.geprueft.json, die der Import
 * (scripts/import-zulassungsstellen.mjs) übernehmen kann, plus ein Bericht.
 *
 * Geprüft wird:
 *  - Quellen dürfen keine Branchenbücher, Bewertungsportale, private
 *    Zulassungsdienste oder Wikipedia sein (Ausnahme: Kürzel-Bedeutung).
 *  - Jede verlinkte URL wird abgerufen. 404/410 → Angabe wird verworfen.
 *    Bot-Sperren (401/403/429/503) gelten als „nicht prüfbar“, die Angabe
 *    bleibt nur erhalten, wenn sie von einer offiziellen Domain stammt.
 *  - Standorte: Straßenname oder Postleitzahl müssen auf der Quellseite
 *    stehen, sonst wird der Standort verworfen.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, join } from "node:path";

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? args[outIdx + 1] : ".";
const files = args.filter((a, i) => a !== "--out" && a !== "--force" && i !== outIdx + 1);
mkdirSync(outDir, { recursive: true });

const BLOCKED_HOSTS = [
  /wikipedia\.org$/, /wikimedia\.org$/, /11880\.com$/, /gelbeseiten\.de$/, /dasoertliche\.de$/, /meinestadt\.de$/,
  /golocal\.de$/, /cylex/, /yelp\./, /branchen/, /kennzeichen/, /zulassungsdienst/, /zulassung24/, /zulassung\.de$/,
  /bundeszulassung/, /kfzportal/, /ikfz\.net$/, /strassenverkehrsamt\.de$/, /verkehrsamt\.de$/, /zulassungsstelle\.de$/,
  /zulassungsstellen\.de$/, /google\./, /facebook\./, /tripadvisor\./, /check24/, /adac\.de$/,
];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

const host = (u) => {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
};
const blocked = (u) => BLOCKED_HOSTS.some((r) => r.test(host(u)));

const cache = new Map();
async function fetchPage(url) {
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": UA, "Accept-Language": "de-DE,de;q=0.9" },
          redirect: "follow",
          signal: AbortSignal.timeout(25000),
        });
        const status = res.status;
        const type = res.headers.get("content-type") ?? "";
        const text = /html|text|json|xml/.test(type) ? await res.text() : "";
        return { status, text };
      } catch (e) {
        if (attempt === 1) return { status: 0, text: "", error: String(e.message ?? e) };
      }
    }
  })();
  cache.set(url, p);
  return p;
}

const normalize = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&szlig;|ß/g, "ss")
    .replace(/&auml;|ä/g, "ae")
    .replace(/&ouml;|ö/g, "oe")
    .replace(/&uuml;|ü/g, "ue")
    .replace(/&[a-z#0-9]+;/g, " ")
    .replace(/strasse\b/g, "str")
    .replace(/str\./g, "str")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");

function streetStem(strasse) {
  const n = normalize(strasse).replace(/\b\d+[a-z]?\b/g, "").trim();
  // längstes Wort als Kern (z. B. "stresemann" aus "stresemannstr")
  return n.split(" ").sort((a, b) => b.length - a.length)[0] ?? "";
}

const unreachable = (s) => s === 404 || s === 410;
const botBlocked = (s) => s === 401 || s === 403 || s === 429 || s === 503 || s === 0;

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    })
  );
  return out;
}

const summary = [];
for (const file of files) {
  const name0 = basename(file).replace(/\.json$/, "");
  if (!args.includes("--force") && existsSync(join(outDir, `${name0}.geprueft.json`))) {
    console.log(`${name0}: bereits geprüft, übersprungen`);
    continue;
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  const report = [];
  const cleaned = await pool(raw, 6, async (r) => {
    const notes = [];
    const unsicher = new Set(r.unsicher ?? []);
    const dropLink = async (key) => {
      const o = r[key];
      if (!o) return;
      if (blocked(o.url) || blocked(o.quelle)) {
        notes.push(`${key}: Quelle nicht offiziell (${host(o.quelle)})`);
        r[key] = null;
        unsicher.add(key);
        return;
      }
      const res = await fetchPage(o.url);
      if (unreachable(res.status)) {
        notes.push(`${key}: ${o.url} → ${res.status}`);
        r[key] = null;
        unsicher.add(key);
      } else if (botBlocked(res.status)) notes.push(`${key}: nicht prüfbar (${res.status})`);
    };
    for (const key of ["website", "terminUrl", "ikfzUrl"]) await dropLink(key);

    if (r.behoerdeQuelle && blocked(r.behoerdeQuelle)) {
      notes.push(`behoerde: Quelle nicht offiziell (${host(r.behoerdeQuelle)})`);
      r.behoerde = null;
    }
    if (r.zustaendigkeit && blocked(r.zustaendigkeit.quelle)) {
      notes.push("zustaendigkeit: Quelle nicht offiziell");
      r.zustaendigkeit = null;
    }
    if (r.oeffnungszeiten) {
      const q = r.oeffnungszeiten.quelle;
      const res = blocked(q) ? { status: -1 } : await fetchPage(q);
      if (res.status === -1 || unreachable(res.status)) {
        notes.push(`oeffnungszeiten: Quelle ${res.status === -1 ? "nicht offiziell" : res.status}`);
        r.oeffnungszeiten = null;
        unsicher.add("oeffnungszeiten");
      }
    }
    const originalBesonderheiten = [...(r.besonderheiten ?? [])];
    const bes = [];
    for (const b of originalBesonderheiten) {
      if (blocked(b.quelle)) {
        notes.push("besonderheit: Quelle nicht offiziell");
        continue;
      }
      const res = await fetchPage(b.quelle);
      if (unreachable(res.status)) {
        notes.push(`besonderheit: Quelle ${res.status}`);
        continue;
      }
      bes.push(b);
    }
    r.besonderheiten = bes;

    const standorte = [];
    for (const s of r.standorte ?? []) {
      if (!s || !s.strasse || !s.plz || !s.quelle) {
        notes.push(`standort ${s?.bezeichnung ?? "?"}: unvollständig → verworfen`);
        continue;
      }
      if (blocked(s.quelle)) {
        notes.push(`standort ${s.bezeichnung}: Quelle nicht offiziell`);
        continue;
      }
      const res = await fetchPage(s.quelle);
      if (unreachable(res.status)) {
        notes.push(`standort ${s.bezeichnung}: Quelle ${res.status}`);
        continue;
      }
      if (botBlocked(res.status) || !res.text) {
        notes.push(`standort ${s.bezeichnung}: nicht prüfbar (${res.status})`);
        standorte.push(s);
        continue;
      }
      const page = normalize(res.text);
      const stem = streetStem(s.strasse);
      const ok = (stem.length >= 4 && page.includes(stem)) || page.includes(String(s.plz));
      if (ok) standorte.push(s);
      else notes.push(`standort ${s.bezeichnung}: „${s.strasse}“/${s.plz} nicht auf der Quellseite gefunden → verworfen`);
    }
    if ((r.standorte ?? []).length && !standorte.length) unsicher.add("standorte");
    r.standorte = standorte;
    r.unsicher = [...unsicher];
    report.push({ slug: r.slug, notes });
    return r;
  });

  const name = basename(file).replace(/\.json$/, "");
  writeFileSync(join(outDir, `${name}.geprueft.json`), JSON.stringify(cleaned, null, 2) + "\n");
  const flagged = report.filter((x) => x.notes.length);
  writeFileSync(join(outDir, `${name}.bericht.json`), JSON.stringify(flagged, null, 2) + "\n");
  summary.push({ datei: name, eintraege: cleaned.length, mitHinweisen: flagged.length, report: flagged });
  console.log(`${name}: ${cleaned.length} Einträge, ${flagged.length} mit Hinweisen`);
}
writeFileSync(join(outDir, "pruefbericht.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(`Bericht: ${join(outDir, "pruefbericht.json")}`);
