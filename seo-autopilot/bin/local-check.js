#!/usr/bin/env node
'use strict';
// ─── Lokaler Vorher-Nachher-Check gegen den Build ────────────────────────────
//   npm run build && node seo-autopilot/bin/local-check.js [--details]
// Prüft den fertigen Build (cfg.buildDir, Standard <repo>/out) mit denselben Regelmodulen wie der
// Wochenlauf – ohne Netz und ohne die Live-Website zu berühren. Beantwortet vor einem Deploy:
// Was verschwindet, was entsteht neu, was bleibt?
//  - Seiten: alle out/**/index.html (URL = cfg.base + Pfad). Admin- und Technikpfade bleiben außen vor.
//  - Sitemap und robots.txt kommen aus dem Build (out/sitemap.xml, out/robots.txt).
//  - Interne Links werden gegen den Build aufgelöst – Dateien zuerst wörtlich (PDF, Bilder); fehlende
//    Ziele zählen wie live als 404.
//  - Vergleichsbasis der Regeln (prev) ist der letzte Live-Crawl (last-crawl.json), falls vorhanden.
//  - Ergebnis: local-check.json im Datenordner – je Befund „lokal behoben“ / „neu entstanden“ /
//    „unverändert“ gegenüber den offenen Live-Befunden (issues.json). Ohne issues.json: nur die lokale
//    Befundliste.
// Der Crawl-Datensatz entsteht über den Offline-Weg des Crawlers; die abgeleiteten Felder (typ, noindex,
// indexable, contentHash, inlinks …) sind dadurch exakt dieselben wie im Live-Lauf.
// Nicht bewertbar sind Regeln, die echte Serverantworten brauchen (Statuscodes, Weiterleitungen,
// Antwort-Header, Ladezeit). Die Konsole zeigt nur Zahlen; --details listet zusätzlich die Befundtitel.
const fs = require('fs');
const path = require('path');
const html = require('../lib/html');
const crawler = require('../lib/crawler');
const { aggregate, optionen: buendelOptionen } = require('../lib/aggregate');
const { fingerprint, SEVERITY } = require('../lib/issues');
const { readJson, writeJsonAtomic, pathOf, stripQuery, sha1 } = require('../lib/util');
// NUR_LIVE: Regeln, die echte Serverantworten brauchen – am Build nicht bewertbar, bleiben ganz außen vor.
// NUR_NEU: Regeln, die am Build nur in eine Richtung aussagen – ein Treffer ist echt („neu entstanden“), ein
// fehlender Treffer heißt nicht „behoben“ (Vergleichsregeln und Regeln, die live von Weiterleitungen abhängen).
// Beide Listen stehen in lib/suggest.js, damit die Vorschläge denselben Prüfweg nennen.
const { buildFileFor, NUR_LIVE, NUR_NEU } = require('../lib/suggest');

const RULES_DIR = path.join(__dirname, '..', 'lib', 'rules');
const MODULE_STD = ['technical', 'meta', 'kfz', 'schema', 'content', 'faq']; // Umfang des Wochenlaufs
// Admin- und Technikpfade: weder als Seite aufgezählt noch als Linkziel geprüft
const TECHNIKPFADE = ['/api/', '/analytics/', '/seo/', '/_next/', '/404/'];
// Verlinkte Dateien, die nicht als Seite zählen (dieselbe Liste wie in lib/crawler.js)
const DATEI_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|docx?|xlsx?|pptx?|csv|mp3|mp4|webm|woff2?|ttf|eot|map)$/i;

const hostOf = u => { try { return new URL(u).host; } catch (_) { return ''; } };
const kurz = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

/** Alle Seiten des Builds: jede index.html unterhalb von buildDir → [{ pfad: '/preise/', datei }], ohne die Ausnahmepfade. */
function seitenImBuild(buildDir, ausnahmen = TECHNIKPFADE) {
  const out = [];
  (function walk(dir, rel) {
    let namen; try { namen = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    namen.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const e of namen) {
      if (e.isDirectory()) { const r = rel + e.name + '/'; if (!ausnahmen.some(x => r.startsWith(x))) walk(path.join(dir, e.name), r); }
      else if (e.name === 'index.html' && e.isFile()) out.push({ pfad: rel, datei: path.join(dir, e.name) });
    }
  })(buildDir, '/');
  return out;
}

/** Sitemap(s) aus dem Build lesen (auch Sitemap-Index) – gleiche Form wie crawler.readSitemaps. */
function leseSitemaps(buildDir, urls) {
  const entries = new Map(); const files = []; const gelesen = new Set();
  const lies = (u, tiefe) => {
    if (gelesen.has(u)) return; gelesen.add(u);
    const f = { url: u, status: 200, count: 0, error: null, lastmods: {} }; files.push(f);
    const rel = buildFileFor(pathOf(u), buildDir);
    if (!rel) { f.status = 404; f.error = 'HTTP 404'; return; }
    const xml = fs.readFileSync(path.join(buildDir, rel), 'utf8');
    if (/<sitemapindex/i.test(xml)) {
      if (tiefe > 2) { f.error = 'zu tief verschachtelt'; return; }
      for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) lies(html.decode(m[1]), tiefe + 1);
      return;
    }
    if (!/<urlset/i.test(xml)) { f.error = 'kein <urlset>'; return; }
    for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
      const loc = /<loc>\s*([^<]+?)\s*<\/loc>/i.exec(m[1]); if (!loc) continue;
      const lm = /<lastmod>\s*([^<]+?)\s*<\/lastmod>/i.exec(m[1]);
      const url = html.decode(loc[1]);
      if (!/^https?:\/\//i.test(url) || !hostOf(url)) { f.ungueltig = (f.ungueltig || 0) + 1; continue; }
      entries.set(url, { sitemap: u, lastmod: lm ? lm[1] : null });
      f.count++; if (lm) f.lastmods[lm[1]] = (f.lastmods[lm[1]] || 0) + 1;
    }
  };
  for (const u of urls) lies(u, 0);
  return { entries, files };
}

/**
 * Crawl-Datensatz aus dem Build (gleiche Form wie ein Live-Crawl, siehe lib/crawler.js).
 * cfg: { base, buildDir, extraPaths?, crawl?: { ausschluss? } } · prev: Inhalt von last-crawl.json oder null
 */
async function buildLocalCrawl(cfg, prev) {
  const t0 = Date.now(); const dir = cfg.buildDir;
  const base = String(cfg.base).replace(/\/+$/, ''); const origin = new URL(base).origin; const host = new URL(base).host;
  const aus = [...new Set([...TECHNIKPFADE, ...((cfg.crawl && cfg.crawl.ausschluss) || [])])];
  const gesperrt = p => aus.some(x => p.startsWith(x));
  const pages = new Map(); const kandidaten = new Map(); const offen = []; const gemerkt = new Set(); let parseFehler = 0;
  const merke = u => { if (!gemerkt.has(u)) { gemerkt.add(u); offen.push(u); } };
  const antwort = (status, url, extra) => ({ status, final: url, chain: [], loop: false, tooManyHops: false, ms: 0, error: null, headers: {}, ...extra });
  const umleitung = (von, nach) => antwort(200, nach, { chain: [{ from: von, to: nach, status: 301 }], redirectedTo: nach });

  // Seite lesen, auswerten und ihre internen Links einsammeln (wie der Crawler: Query und Fragment zählen nicht)
  function seite(url, datei) {
    const body = fs.readFileSync(datei, 'utf8'); let page = null;
    const r = antwort(200, url, { headers: { 'content-type': 'text/html; charset=utf-8' }, bytes: body.length });
    try { page = html.parse(body, url); } catch (e) { r.parseError = e.message; parseFehler++; }
    pages.set(url, { r, bodyHash: sha1(body), page: page ? html.pack(page, url) : null });
    if (!page) return;
    for (const a of page.anchors) {
      let u; try { u = new URL(a.href); } catch (_) { continue; }
      if (u.host !== host || !/^https?:$/.test(u.protocol)) continue;
      u.hash = ''; u.search = ''; const key = u.href;
      if (gesperrt(u.pathname)) continue;
      if (DATEI_EXT.test(u.pathname)) { const q = kandidaten.get(key) || []; if (q.length < 5 && !q.includes(url)) q.push(url); kandidaten.set(key, q); continue; }
      merke(key);
    }
  }
  for (const s of seitenImBuild(dir, aus)) seite(base + s.pfad.split('/').map(encodeURIComponent).join('/'), s.datei);
  const aufgezaehlt = pages.size;

  const robotsRel = buildFileFor('/robots.txt', dir);
  const robots = crawler.parseRobots(robotsRel ? fs.readFileSync(path.join(dir, robotsRel), 'utf8') : '');
  const sitemap = leseSitemaps(dir, robots.sitemaps.length ? [...new Set(robots.sitemaps)] : [base + '/sitemap.xml']);
  for (const u of sitemap.entries.keys()) if (hostOf(u) === host) merke(stripQuery(u));
  for (const p of cfg.extraPaths || []) merke(base + p);

  // Übrige bekannte Adressen (Linkziele, Sitemap-URLs) gegen den Build auflösen
  for (let i = 0; i < offen.length; i++) {
    const url = offen[i]; if (pages.has(url)) continue;
    let u; try { u = new URL(url); } catch (_) { continue; }
    if (gesperrt(u.pathname)) continue;
    if (u.origin !== origin) { const nach = origin + u.pathname; pages.set(url, { r: umleitung(url, nach), page: null }); merke(nach); continue; } // z. B. http:// → https://
    const rel = buildFileFor(u.pathname, dir);
    if (!rel) { pages.set(url, { r: antwort(404, url), page: null }); continue; }
    let woertlich = false; try { woertlich = decodeURIComponent(u.pathname).replace(/^\/+/, '') === rel; } catch (_) { woertlich = false; }
    if (woertlich && /\.html?$/i.test(rel)) seite(url, path.join(dir, rel)); // …/index.html oder eine einzelne .html-Datei als eigene Adresse
    else if (!woertlich && !u.pathname.endsWith('/')) pages.set(url, { r: umleitung(url, url + '/'), page: null }); // Ordner ohne Schrägstrich: der Server leitet weiter
    else pages.set(url, { r: antwort(200, url), page: null }); // sonstige Datei ohne bekannte Endung
  }
  // Verlinkte Dateien (PDF, Downloads …): im Build vorhanden?
  const dateien = [...kandidaten].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([u, quellen]) => {
    const rel = buildFileFor(pathOf(u), dir); let bytes = null;
    if (rel) { try { bytes = fs.statSync(path.join(dir, rel)).size; } catch (_) { bytes = null; } }
    return [u, { status: rel ? 200 : 404, quellen, contentType: null, bytes }];
  });

  const cache = { v: 2, base, at: new Date().toISOString(), pages,
    crawl: { robots, robotsStatus: robotsRel ? 200 : 404, sitemap: { files: sitemap.files, entries: [...sitemap.entries] }, hostChecks: [], dateien, stats: { queued: pages.size, parseFehler, dauerMs: Date.now() - t0 } } };
  // htmlDir bewusst leer: eine Roh-HTML-Ablage des Live-Crawls darf den Build nicht überlagern
  const crawl = await crawler.crawl({ base, cache, prev: prev || null, offline: true, htmlDir: '' });
  crawl.hostChecks = []; crawl.lokal = true; crawl.aufgezaehlt = aufgezaehlt;
  return crawl;
}

/** Module des Wochenlaufs (aus bin/autopilot.js, damit beide denselben Umfang haben). */
function wochenModule() {
  try { const a = require('./autopilot'); if (Array.isArray(a.VOLL) && a.VOLL.length) return a.VOLL.slice(); } catch (_) { /* Rückfallliste */ }
  return MODULE_STD.slice();
}
/**
 * Regelmodule defensiv ausführen: fehlende oder fehlerhafte Module werden übersprungen und benannt.
 * Befunde aus NUR_LIVE-Regeln werden verworfen (je Modul als `nurLive` gezählt).
 * → { findings, module: [{ name, gruppe?, status: 'ok'|'fehlt'|'defekt', befunde, nurLive?, grund? }], regeln: Set der bewerteten Regel-IDs }
 */
function pruefe(namen, ctx, rulesDir = RULES_DIR) {
  let findings = []; const module = []; const regeln = new Set(); const lokal = r => !NUR_LIVE.includes(r);
  for (const name of namen) {
    const datei = path.join(rulesDir, name + '.js');
    if (!fs.existsSync(datei)) { module.push({ name, status: 'fehlt', befunde: 0 }); continue; }
    try {
      const m = require(datei);
      if (!m || typeof m.run !== 'function' || !Array.isArray(m.rules)) throw new Error('Schnittstelle { run, rules } fehlt');
      const f = m.run(ctx) || [];
      if (!Array.isArray(f)) throw new Error('run() liefert keine Liste');
      const alle = f.filter(x => x && typeof x.rule === 'string'); const gut = alle.filter(x => lokal(x.rule));
      findings = findings.concat(gut); m.rules.filter(lokal).forEach(r => regeln.add(r)); gut.forEach(x => regeln.add(x.rule));
      module.push({ name, gruppe: m.gruppe || name, status: 'ok', befunde: gut.length, nurLive: alle.length - gut.length });
    } catch (e) { module.push({ name, status: 'defekt', befunde: 0, grund: kurz(`${(e && e.name) || 'Fehler'}: ${(e && e.message) || e}`, 200) }); }
  }
  return { findings, module, regeln };
}

/**
 * Lokale Befunde mit den offenen Live-Befunden vergleichen (gleiche Fingerprints wie im Befundspeicher).
 * `regeln` = lokal bewertete Regel-IDs. → { resolved, added, unchanged, notComparable, byId, before, after }
 */
function vergleiche(findings, liveOffen, regeln) {
  const beidseitig = r => regeln.has(r) && !NUR_NEU.includes(r) && !NUR_LIVE.includes(r);
  const lokal = new Map(); for (const f of findings) { const id = fingerprint(f); if (!lokal.has(id)) lokal.set(id, f); }
  // key und bis zu 5 Beispielseiten (nur die Adressen): Sammelbefunde (key „alle:…“, Bündel „familie:…“) zeigt das SEO Center damit mit ihren Seiten statt „/“
  const beispiele = i => (Array.isArray(i.examples) ? i.examples : []).filter(e => e && typeof e.url === 'string' && e.url).slice(0, 5).map(e => ({ url: e.url }));
  const eintrag = (id, i) => { const bsp = beispiele(i); return { id, rule: i.rule, severity: i.severity, url: i.url || '', ...(i.file ? { file: i.file } : {}), title: i.title || '', count: i.count || 1, ...(i.key != null && i.key !== '' ? { key: String(i.key) } : {}), ...(bsp.length ? { examples: bsp } : {}) }; };
  const zaehle = list => list.reduce((a, i) => { a[i.severity] = (a[i.severity] || 0) + 1; return a; }, {});
  const sortiert = list => list.sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity) || (a.title < b.title ? -1 : a.title > b.title ? 1 : 0));
  const byId = {}; const behoben = [], gleich = [], offenAussen = [];
  for (const i of liveOffen) {
    if (lokal.has(i.id)) { gleich.push(i); byId[i.id] = 'unverändert'; }
    else if (beidseitig(i.rule)) { behoben.push(i); byId[i.id] = 'lokal behoben'; }
    else { offenAussen.push(i); byId[i.id] = 'nicht lokal prüfbar'; }
  }
  const neu = [...lokal].filter(([id]) => !Object.prototype.hasOwnProperty.call(byId, id));
  for (const [id] of neu) byId[id] = 'neu entstanden';
  const ausserhalb = {}; for (const i of offenAussen) ausserhalb[i.rule] = (ausserhalb[i.rule] || 0) + 1;
  return {
    before: { open: behoben.length + gleich.length, bySeverity: zaehle([...behoben, ...gleich]) },
    after: { open: lokal.size, bySeverity: zaehle([...lokal.values()]) },
    resolved: sortiert(behoben.map(i => eintrag(i.id, i))),
    added: sortiert(neu.map(([id, f]) => ({ ...eintrag(id, f), detail: kurz(f.detail, 400), ...(f.detail ? { zusatz: kurz(f.detail, 160) } : {}) }))),
    unchanged: gleich.length,
    notComparable: { open: offenAussen.length, byRule: ausserhalb },
    byId,
    findings: sortiert([...lokal].map(([id, f]) => ({ ...eintrag(id, f), detail: kurz(f.detail, 400) }))),
  };
}

/**
 * Kompletter Check. cfg = Konfiguration des Autopiloten (base, buildDir, dataDir, repoRoot …).
 * opts: { details, log, err, module (Namen), rulesDir, soll } – die letzten drei nur für Tests.
 * → { code: 0 | 2, result, file }
 */
async function run(cfg, opts = {}) {
  const log = opts.log || console.log; const err = opts.err || console.error;
  const dir = cfg.buildDir; const zeig = dir ? (cfg.repoRoot && !path.relative(cfg.repoRoot, dir).startsWith('..') ? path.relative(cfg.repoRoot, dir) || '.' : dir) : '(nicht gesetzt)';
  if (!dir || !fs.existsSync(path.join(dir, 'index.html'))) {
    err(`Kein Build gefunden (${zeig}/index.html fehlt) – erst \`npm run build\` ausführen, dann den Check erneut starten.`);
    return { code: 2, result: null, file: null };
  }
  const t0 = Date.now(); const base = String(cfg.base).replace(/\/+$/, ''); const hinweise = [];

  // Live-Stand: letzter Crawl (Vergleichsbasis der Regeln) und offene Befunde
  let prev = readJson(path.join(cfg.dataDir, 'last-crawl.json'), null);
  if (prev && (typeof prev !== 'object' || !prev.pages || typeof prev.pages !== 'object')) prev = null;
  if (prev && prev.base && String(prev.base).replace(/\/+$/, '') !== base) { hinweise.push('last-crawl.json gehört zu einer anderen Basis-URL und wurde nicht als Vergleichsbasis verwendet.'); prev = null; }
  if (!prev) hinweise.push('Kein Live-Crawl (last-crawl.json) im Datenordner – Vergleichsregeln wie Indexverlust oder geänderte Seiten haben keine Basis.');
  const st = readJson(path.join(cfg.dataDir, 'issues.json'), null);
  const mitVergleich = !!(st && typeof st === 'object' && st.issues && typeof st.issues === 'object' && !Array.isArray(st.issues));
  const liveOffen = mitVergleich ? Object.values(st.issues).filter(i => i && i.status === 'offen' && typeof i.id === 'string') : [];
  const letzterLauf = mitVergleich && Array.isArray(st.runs) && st.runs.length ? st.runs[st.runs.length - 1].at : null;

  const crawl = await buildLocalCrawl({ ...cfg, base }, prev);
  const s = crawl.stats;
  if (!s.indexable) hinweise.push('Im Build ist keine einzige Seite indexierbar – vermutlich ein Vorschau-Build (noindex). So nicht veröffentlichen.');
  if (!crawl.sitemap.entries.size) hinweise.push('Im Build fehlt die Sitemap oder sie ist leer.');

  let soll = null;
  if (opts.soll !== undefined) soll = opts.soll;
  else { try { soll = require('../lib/soll').load(cfg); } catch (_) { soll = null; hinweise.push('Sollwerte (config/preise.json, config/betrieb.json) nicht geladen – der Abgleich von Preisen und Zeiten ist eingeschränkt.'); } }

  const namen = opts.module || wochenModule();
  const lauf = pruefe(namen, { crawl, prev, cfg: { ...cfg, base }, hostChecks: [], soll }, opts.rulesDir || RULES_DIR);
  const regeln = lauf.regeln;
  const findings = aggregate(lauf.findings, base, buendelOptionen(cfg)); // dieselbe Bündelung (auch Kernseiten einzeln) wie im Prüflauf → dieselben Fingerprints
  const v = vergleiche(findings, liveOffen, regeln);

  // Seitenbestand: live vorhanden, im Build nicht mehr – und umgekehrt
  const istSeite = (u, r) => hostOf(u) === new URL(base).host && r && r.status === 200 && r.page && !r.redirectedTo && !TECHNIKPFADE.some(x => pathOf(u).startsWith(x));
  const lokalSeiten = [...crawl.pages].filter(([u, r]) => istSeite(u, r)).map(([u]) => u);
  const liveSeiten = prev ? Object.entries(prev.pages).filter(([u, r]) => istSeite(u, r)).map(([u]) => u) : [];
  const lokalSet = new Set(lokalSeiten), liveSet = new Set(liveSeiten);
  const fehlen = liveSeiten.filter(u => !lokalSet.has(u)).sort(), neuSeiten = prev ? lokalSeiten.filter(u => !liveSet.has(u)).sort() : [];

  const ausfall = lauf.module.filter(m => m.status !== 'ok');
  let buildAt = null; try { buildAt = fs.statSync(path.join(dir, 'index.html')).mtime.toISOString(); } catch (_) { buildAt = null; }
  const result = {
    at: new Date().toISOString(), base, build: zeig, buildAt, liveRunAt: (prev && prev.at) || letzterLauf || null, vergleich: mitVergleich,
    pagesChecked: lokalSeiten.length, pagesIndexable: s.indexable, pagesNoindex: s.noindex, pagesInSitemap: crawl.sitemap.entries.size,
    pagesWithoutLocalFile: fehlen.length, pagesWithoutLocalFileExamples: fehlen.slice(0, 10).map(pathOf),
    pagesNew: neuSeiten.length, pagesNewExamples: neuSeiten.slice(0, 10).map(pathOf),
    linksBroken: [...crawl.pages.values()].filter(r => r.status === 404).length, filesChecked: crawl.dateien.size,
    modules: lauf.module, modulesSkipped: ausfall.map(m => m.name),
    rulesEvaluated: [...regeln].sort(), rulesOnlyNew: NUR_NEU.filter(r => regeln.has(r)), rulesLiveOnly: NUR_LIVE.slice(),
    rulesSkipped: ['Statuscodes, Weiterleitungen, Antwort-Header und Ladezeit (nur am Server prüfbar)', ...ausfall.map(m => `Prüfmodul „${m.name}“ ${m.status === 'fehlt' ? 'nicht vorhanden' : 'ausgefallen'}`)],
    before: mitVergleich ? v.before : null, after: v.after,
    resolved: mitVergleich ? v.resolved : [], added: mitVergleich ? v.added : [], unchanged: mitVergleich ? v.unchanged : 0,
    notComparable: mitVergleich ? v.notComparable : { open: 0, byRule: {} },
    byId: mitVergleich ? v.byId : {}, findings: v.findings, hinweise, dauerMs: Date.now() - t0,
    note: mitVergleich
      ? 'Vergleich der offenen Live-Befunde (letzter Prüflauf) mit dem Build auf diesem Rechner. „Lokal behoben“ wirkt erst nach dem Deploy; der nächste Prüflauf bestätigt es. Regeln, die Serverantworten brauchen, sind nicht bewertet.'
      : 'Kein Vergleich möglich: Im Datenordner liegen keine Live-Befunde (issues.json). Aufgeführt sind nur die Befunde am Build. Für den Vergleich zuerst den Stand holen (bin/sync.js pull) oder einen Prüflauf ausführen.',
  };
  const file = writeJsonAtomic(path.join(cfg.dataDir, 'local-check.json'), result);

  // Konsole: nur Zahlen und Status (Befundtitel nur mit --details)
  log(`Lokaler Check gegen den Build ${zeig}: ${result.pagesChecked} Seiten (${s.indexable} indexierbar, ${s.noindex} noindex), ${result.pagesInSitemap} in der Sitemap, ${result.linksBroken} Linkziele ohne Datei, ${result.filesChecked} verlinkte Dateien geprüft · ${Math.round(result.dauerMs / 100) / 10} s`);
  log(`Module: ${lauf.module.map(m => `${m.name} ${m.status === 'ok' ? m.befunde + (m.nurLive ? ` (+${m.nurLive} nur am Server prüfbar)` : '') : m.status}`).join(' · ')} → ${v.after.open} Punkte nach Bündelung`);
  if (prev) log(`Seitenbestand: ${fehlen.length} Live-Seiten fehlen im Build, ${neuSeiten.length} Seiten sind neu`);
  if (mitVergleich) {
    log(`Vorher (live, vergleichbar): ${v.before.open} offen · Nachher (Build): ${v.after.open}`);
    log(`Lokal behoben: ${v.resolved.length} · neu entstanden: ${v.added.length} · unverändert: ${v.unchanged} · nicht lokal prüfbar: ${v.notComparable.open}`);
  } else log(`Kein Vergleich (keine issues.json im Datenordner) – Befunde am Build: ${v.after.open} (${SEVERITY.map(x => `${x} ${v.after.bySeverity[x] || 0}`).join(', ')})`);
  for (const h of hinweise) log('Hinweis: ' + h);
  for (const m of ausfall) log(`Hinweis: Prüfmodul ${m.name} ${m.status === 'fehlt' ? 'fehlt' : 'ist ausgefallen'} – übersprungen`);
  if (opts.details) {
    for (const r of result.resolved) log('  ✔ behoben:', r.severity, r.title);
    for (const a of result.added) log('  ✚ neu:    ', a.severity, a.title);
    if (!mitVergleich) for (const f of result.findings) log('  •', f.severity, f.title);
    for (const m of ausfall) if (m.grund) log(`  ! ${m.name}: ${m.grund}`);
  }
  log(`Ergebnis: ${path.basename(file)} im Datenordner`);
  return { code: 0, result, file };
}

async function main() {
  const cfg = require('../config');
  const res = await run(cfg, { details: process.argv.includes('--details') });
  process.exitCode = res.code;
}
if (require.main === module) main().catch(e => { console.error('[local-check] Fehler:', (e && e.stack) || e); process.exit(1); });
module.exports = { run, buildLocalCrawl, seitenImBuild, leseSitemaps, pruefe, vergleiche, wochenModule, NUR_LIVE, NUR_NEU, TECHNIKPFADE };
