'use strict';
// ─── Crawler: Sitemap + interne Links, höflich, mit Seitencache ──────────────
// - Respektiert robots.txt (User-agent: *), max. N Seiten, wenige parallele Abrufe mit Pause.
// - Nur lesende Zugriffe (GET/HEAD). Query-Strings und Fragmente werden vor dem Einreihen entfernt
//   (/auftrag/?leistung=x zählt als /auftrag/).
// - Folgt Weiterleitungen selbst (Kette + Schleifen-Erkennung), ein Wiederholungsversuch bei
//   Timeout/5xx, bevor ein Fehler gilt.
// - Bedingte Abrufe (If-None-Match / If-Modified-Since) nur für die Ausgangs-URL der eigenen Domain;
//   unveränderte Seiten kommen aus dem Seitencache (page-cache.json).
// - Offline-Modus (SEO_OFFLINE=1 bzw. Option offline:true): das Ergebnis entsteht vollständig aus dem
//   Seitencache des letzten echten Laufs – ohne Netz, für Regelentwicklung und schnelle Wiederholungen.
// - Verlinkte Nicht-HTML-Dateien der eigenen Domain (z. B. PDF) werden per HEAD geprüft (crawl.dateien).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const html = require('./html');
const { pathOf, pageType, isNoindex, stripQuery, readJson, writeJsonAtomic, sha1, sleep } = require('./util');

const UA = 'KFZ-Zulassungsprofis-SEO-Autopilot/1.0 (+https://kfz-zulassungsprofis.de)';
// Dateien, die nicht als Seite gecrawlt, sondern (wenn verlinkt) nur auf Erreichbarkeit geprüft werden
const DATEI_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|docx?|xlsx?|pptx?|csv|mp3|mp4|webm|woff2?|ttf|eot|map)$/i;
const REDIRECT = [301, 302, 303, 307, 308];
const HEADER = ['content-type', 'cache-control', 'x-robots-tag', 'etag', 'last-modified', 'content-encoding', 'strict-transport-security', 'content-security-policy', 'permissions-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'server'];
// In last-crawl.json genügen je Seite die Header, die für Vergleiche gebraucht werden (die Startseite behält alle)
const HEADER_KURZ = ['content-type', 'cache-control', 'x-robots-tag', 'etag', 'last-modified', 'content-encoding'];
const pick = (o, keys) => { const r = {}; for (const k of keys) if (o && o[k] !== undefined) r[k] = o[k]; return r; };
const hostOf = u => { try { return new URL(u).host; } catch (_) { return ''; } };
/** all-inkl/Apache hängt die Kompression an den ETag ("…-gzip", "…-br"); damit gäbe es nie ein 304. */
const etagOhneSuffix = e => (e ? String(e).replace(/-(?:gzip|br|zstd|deflate)(?="$)/i, '') : '');

async function fetchRaw(url, opts = {}) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || 20000);
  const t0 = Date.now();
  try {
    const r = await fetch(url, { method: opts.method || 'GET', redirect: 'manual', headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', ...(opts.headers || {}) }, signal: ctrl.signal });
    const headers = Object.fromEntries([...r.headers.entries()]);
    const ct = headers['content-type'] || '';
    // Nur Text wird gelesen: Binärdateien (PDF, Bilder), Weiterleitungen und 304 brauchen keinen Body
    const lesen = opts.method !== 'HEAD' && !opts.noBody && r.status !== 304 && !REDIRECT.includes(r.status) && (!ct || /text\/|html|xml|json/i.test(ct));
    let body = '';
    if (lesen) body = await r.text(); else if (r.body) { try { await r.body.cancel(); } catch (_) { /* Verbindung schon zu */ } }
    return { status: r.status, headers, body, ms: Date.now() - t0 };
  } catch (e) {
    return { status: 0, headers: {}, body: '', ms: Date.now() - t0, error: e.name === 'AbortError' || ctrl.signal.aborted ? 'timeout' : (e.cause && e.cause.code) || e.message };
  } finally { clearTimeout(t); }
}
/** Abruf mit Wiederholung: Timeout, Netzfehler (Status 0), 5xx und 429 werden bis zu `retries`-mal erneut versucht. */
async function fetchRetry(url, opts = {}) {
  const max = opts.retries || 0; let r, n = 0;
  for (;;) {
    r = await fetchRaw(url, opts);
    if (!(r.status === 0 || r.status >= 500 || r.status === 429) || n >= max) break;
    n++; await sleep(opts.retryDelayMs === undefined ? 2000 : opts.retryDelayMs);
  }
  r.retries = n; return r;
}

/**
 * Weiterleitungskette verfolgen (max. Sprünge), Schleife erkennen.
 * opts.conditional: bedingte Header – gehen NUR an die Ausgangs-URL (nie an Weiterleitungsziele/fremde Hosts).
 * opts.bodyNachRedirect === false: Inhalt eines Weiterleitungsziels nicht laden (es wird als eigene URL gecrawlt).
 */
async function fetchFollow(url, opts = {}) {
  const chain = []; let cur = url; const seen = new Set(); let retries = 0;
  const { conditional, bodyNachRedirect, ...rest } = opts;
  for (let i = 0; i <= (opts.maxHops || 5); i++) {
    if (seen.has(cur)) return { url, final: cur, status: 0, chain, loop: true, headers: {}, body: '', ms: 0, retries };
    seen.add(cur);
    const o = { ...rest };
    if (i === 0 && conditional) o.headers = { ...(rest.headers || {}), ...conditional };
    if (i > 0 && bodyNachRedirect === false) o.noBody = true;
    const r = await fetchRetry(cur, o); retries += r.retries || 0;
    if (REDIRECT.includes(r.status) && r.headers.location) {
      const next = html.abs(r.headers.location, cur);
      chain.push({ from: cur, to: next, status: r.status });
      cur = next; continue;
    }
    return { url, final: cur, ...r, chain, loop: false, retries };
  }
  return { url, final: cur, status: 0, chain, loop: false, tooManyHops: true, headers: {}, body: '', ms: 0, retries };
}

function parseRobots(txt) {
  const rules = { disallow: [], allow: [], sitemaps: [], agents: {} }; let cur = [], warAgent = false;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim(); if (!line) continue;
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line); if (!m) continue;
    const k = m[1].toLowerCase(), v = m[2].trim();
    if (k === 'user-agent') { if (!warAgent) cur = []; const a = v.toLowerCase(); cur.push(a); rules.agents[a] = rules.agents[a] || { disallow: [], allow: [] }; warAgent = true; continue; }
    warAgent = false;
    if (k === 'sitemap') rules.sitemaps.push(v);
    else if (cur.length && (k === 'disallow' || k === 'allow')) { for (const a of cur) rules.agents[a][k].push(v); if (cur.includes('*')) rules[k].push(v); }
  }
  return rules;
}
// Pfadmuster der robots.txt: Präfix, dazu „*“ (beliebig) und „$“ (Ende)
function robotsTrifft(muster, ziel) {
  if (!muster) return false;
  if (!/[*$]/.test(muster)) return ziel.startsWith(muster);
  const re = muster.replace(/\$$/, '').split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + re + (/\$$/.test(muster) ? '$' : '')).test(ziel);
}
function robotsAllows(rules, url, agent = '*') {
  let p; try { const u = new URL(url); p = u.pathname + u.search; } catch (_) { return true; }
  const a = rules.agents[agent] || rules.agents['*'] || { disallow: [], allow: [] };
  const laengste = list => list.filter(d => robotsTrifft(d, p)).sort((x, y) => y.length - x.length)[0];
  const dis = laengste(a.disallow), al = laengste(a.allow);
  if (!dis) return true; if (al && al.length >= dis.length) return true; return false;
}

/** Sitemap(s) lesen (auch Sitemap-Index, bis Tiefe 2). Ungültige <loc>-Einträge werden gezählt, nicht übernommen. */
async function readSitemaps(urls, opts = {}) {
  const entries = new Map(); const files = []; const gelesen = new Set();
  async function readOne(u, depth) {
    if (gelesen.has(u)) return; gelesen.add(u);
    const r = await fetchFollow(u, { timeoutMs: opts.timeoutMs || 20000, retries: opts.retries || 0, retryDelayMs: opts.retryDelayMs });
    const f = { url: u, status: r.status, count: 0, error: null, lastmods: {} };
    files.push(f);
    if (r.status !== 200) { f.error = r.error || `HTTP ${r.status}`; return; }
    const xml = r.body;
    if (/<sitemapindex/i.test(xml)) {
      if (depth > 2) { f.error = 'zu tief verschachtelt'; return; }
      for (const m of xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)) await readOne(html.decode(m[1]), depth + 1);
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
  }
  for (const u of [].concat(urls || [])) await readOne(u, 0);
  return { entries, files };
}

// ─── Seitencache (page-cache.json) ───────────────────────────────────────────
// { v: 2, base, at, crawl: { robots, robotsStatus, sitemap, hostChecks, dateien, stats }, pages: { url: { r, bodyHash, page } } }
// `r` = Antwortdaten der URL (Status, Kette, Header …), `page` = platzsparend abgelegtes Parse-Ergebnis.
const leererCache = () => ({ v: 2, base: null, at: null, crawl: null, pages: new Map() });
function loadCache(file) {
  const j = file ? readJson(file, null) : null;
  if (!j || j.v !== 2 || !j.pages || typeof j.pages !== 'object') return leererCache();
  return { v: 2, base: j.base || null, at: j.at || null, crawl: j.crawl || null, pages: new Map(Object.entries(j.pages)) };
}
function saveCache(file, c, hostChecks) {
  const pages = {};
  for (const [u, r] of c.pages) pages[u] = { r: { status: r.status, final: r.final, chain: r.chain, loop: r.loop, tooManyHops: r.tooManyHops, ms: r.ms, error: r.error, headers: r.headers, bytes: r.bytes, redirectedTo: r.redirectedTo, parseError: r.parseError }, bodyHash: r.bodyHash || null, page: r.page ? html.pack(r.page, u) : null };
  const crawlMeta = { robots: c.robots, robotsStatus: c.robotsStatus, sitemap: { files: c.sitemap.files, entries: [...c.sitemap.entries] }, hostChecks: hostChecks || c.hostChecks || [], dateien: [...(c.dateien || [])], stats: c.stats };
  return writeJsonAtomic(file, { v: 2, base: c.base, at: c.at, crawl: crawlMeta, pages }, 0);
}
const htmlDatei = (dir, url) => path.join(dir, (pathOf(url).replace(/[^a-zA-Z0-9._-]+/g, '_') || '_').slice(0, 80) + '-' + sha1(url).slice(0, 8) + '.html.gz');

/**
 * Gemeinsamer Abschluss für echten Lauf und Offline-Modus: abgeleitete Felder je URL setzen
 * (path, typ, Sitemap, robots, noindex, indexable, contentHash, changed, inlinks), sortieren, zählen.
 */
function abschluss(roh, x) {
  const { base, host, sitemap, robots, prev } = x; const recs = [];
  for (const r of roh.values()) {
    const url = r.url; const p = pathOf(url); const sm = sitemap.entries.get(url);
    const rec = { url, path: p, typ: pageType(p), inSitemap: !!sm, sitemapFile: sm ? sm.sitemap : null, lastmod: sm ? sm.lastmod : null, robotsAllowed: robotsAllows(robots, url), ...r };
    rec.noindex = isNoindex(rec);
    rec.indexable = rec.status === 200 && !!rec.page && !rec.noindex && rec.robotsAllowed;
    rec.contentHash = rec.page ? html.contentHash(rec.page) : null;
    if (rec.page) rec.textShingle = crypto.createHash('md5').update(rec.page.text.split(' ').slice(40, 240).join(' ')).digest('hex');
    const vor = prev && prev.pages ? prev.pages[url] : null;
    rec.changed = !!(vor && vor.contentHash && rec.contentHash && vor.contentHash !== rec.contentHash);
    recs.push(rec);
  }
  // Feste Reihenfolge (nach URL): Regeln liefern damit von Lauf zu Lauf dieselben Befunde in derselben Folge
  recs.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
  // Eingehende Links = Zahl der verlinkenden Seiten (Query/Fragment entfernt, Selbstverweise zählen nicht)
  const inl = new Map();
  for (const rec of recs) {
    if (!rec.page) continue; const ziele = new Set();
    for (const a of rec.page.anchors) { const k = stripQuery(a.href); if (k !== rec.url && hostOf(k) === host) ziele.add(k); }
    for (const k of ziele) inl.set(k, (inl.get(k) || 0) + 1);
  }
  const pages = new Map(); const status = {}; const typen = {}; let indexable = 0, noindex = 0;
  for (const rec of recs) {
    rec.inlinks = inl.get(rec.url) || 0; pages.set(rec.url, rec);
    status[rec.status] = (status[rec.status] || 0) + 1;
    if (!rec.page) continue;
    const t = typen[rec.typ] = typen[rec.typ] || { gesamt: 0, indexable: 0 }; t.gesamt++;
    if (rec.indexable) { t.indexable++; indexable++; } else if (rec.noindex) noindex++;
  }
  return { base, at: x.at, offline: !!x.offline, pages, sitemap, robots, robotsStatus: x.robotsStatus, dateien: x.dateien, stats: { ...x.stats, crawled: pages.size, indexable, noindex, typen, status } };
}

/** Ergebnis vollständig aus dem Seitencache aufbauen (kein Netz). */
function ausCache(cfg, base, host, cache) {
  if (!cache.pages.size) throw new Error('Offline-Modus (SEO_OFFLINE=1): kein Seitencache vorhanden. Zuerst einen echten Lauf ausführen: node seo-autopilot/bin/autopilot.js crawl');
  if (cache.base && cache.base !== base) throw new Error(`Offline-Modus: Der Seitencache gehört zu ${cache.base}, nicht zu ${base}.`);
  const m = cache.crawl || {}; const roh = new Map(); let neuGeparst = 0;
  for (const [url, e] of cache.pages) {
    const rec = { url, ...(e.r || {}), fromCache: true };
    if (e.bodyHash) rec.bodyHash = e.bodyHash;
    if (e.page) {
      const f = cfg.htmlDir ? htmlDatei(cfg.htmlDir, url) : null;
      if (f && fs.existsSync(f)) { rec.page = html.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8'), (e.r && e.r.final) || url); neuGeparst++; }
      else rec.page = html.unpack(e.page, url);
    }
    roh.set(url, rec);
  }
  const alt = m.stats || {};
  return abschluss(roh, { base, host, at: cache.at, offline: true, prev: cfg.prev || null, robots: m.robots || parseRobots(''), robotsStatus: m.robotsStatus === undefined ? 200 : m.robotsStatus,
    sitemap: { entries: new Map((m.sitemap && m.sitemap.entries) || []), files: (m.sitemap && m.sitemap.files) || [] }, dateien: new Map(m.dateien || []),
    stats: { fetched: 0, reused: roh.size, queued: alt.queued || roh.size, retries: 0, parseFehler: alt.parseFehler || 0, interneFehler: alt.interneFehler || 0, limitErreicht: !!alt.limitErreicht, dauerMs: alt.dauerMs || 0, offline: true, ...(alt.abgebrochen ? { abgebrochen: alt.abgebrochen } : {}), ...(neuGeparst ? { neuGeparst } : {}) } });
}

/**
 * Crawl ausführen.
 * cfg: { base, maxPages, concurrency, delayMs, timeoutMs, retries, retryDelayMs, maxDauerMs, ausschluss[], extraPaths[],
 *        cache (aus loadCache), prev (Inhalt von last-crawl.json), offline, htmlDir, log }
 * Ergebnis: { base, at, pages: Map url→rec, sitemap, robots, robotsStatus, dateien: Map url→{status, quellen[]}, stats }
 */
async function crawl(cfg) {
  const base = String(cfg.base).replace(/\/+$/, ''); const host = new URL(base).host;
  const log = cfg.log || (() => {});
  const cache = cfg.cache && cfg.cache.pages instanceof Map ? cfg.cache : leererCache();
  const offline = cfg.offline !== undefined ? !!cfg.offline : process.env.SEO_OFFLINE === '1';
  if (offline) return ausCache(cfg, base, host, cache);

  const t0 = Date.now(); const at = new Date().toISOString();
  const netz = { timeoutMs: cfg.timeoutMs || 20000, retries: cfg.retries === undefined ? 1 : cfg.retries, retryDelayMs: cfg.retryDelayMs === undefined ? 2000 : cfg.retryDelayMs };
  const maxPages = cfg.maxPages || 2500, conc = cfg.concurrency || 3, delay = cfg.delayMs === undefined ? 200 : cfg.delayMs, seenMax = maxPages * 2;
  const ausschluss = cfg.ausschluss || ['/api/', '/analytics/', '/seo/', '/_next/'];
  const maxDauer = cfg.maxDauerMs || 20 * 60000; let fehler = 0; // Notbremse: Zeitlimit und „mehr als die Hälfte fehlgeschlagen“
  const stats = { fetched: 0, reused: 0, queued: 0, retries: 0, parseFehler: 0, interneFehler: 0, limitErreicht: false, dauerMs: 0 };
  if (cfg.htmlDir) fs.mkdirSync(cfg.htmlDir, { recursive: true });

  const robotsRes = await fetchFollow(base + '/robots.txt', netz);
  const robots = parseRobots(robotsRes.status === 200 ? robotsRes.body : '');
  const sitemap = await readSitemaps(robots.sitemaps.length ? [...new Set(robots.sitemaps)] : [base + '/sitemap.xml'], netz);

  const queue = []; const seen = new Set(); const roh = new Map(); const kandidaten = new Map();
  const einreihen = u => { const k = stripQuery(u); if (!hostOf(k) || seen.has(k)) return; seen.add(k); queue.push(k); };
  einreihen(base + '/');
  for (const u of sitemap.entries.keys()) if (hostOf(u) === host) einreihen(u);
  for (const p of (cfg.extraPaths || [])) einreihen(base + p);

  // Links einer Seite: Seiten einreihen, verlinkte Dateien (PDF …) für die HEAD-Prüfung merken
  function folgen(rec) {
    for (const a of rec.page.anchors) {
      let u; try { u = new URL(a.href); } catch (_) { continue; }
      if (u.host !== host || !/^https?:$/.test(u.protocol)) continue;
      u.hash = ''; u.search = ''; const key = u.href;
      if (ausschluss.some(x => u.pathname.startsWith(x))) continue;
      if (DATEI_EXT.test(u.pathname)) { const q = kandidaten.get(key) || []; if (q.length < 5 && !q.includes(rec.url)) q.push(rec.url); kandidaten.set(key, q); continue; }
      if (!seen.has(key) && seen.size < seenMax && robotsAllows(robots, key)) { seen.add(key); queue.push(key); }
    }
  }
  async function seite(url) {
    const alt = cache.pages.get(url); const altOk = alt && alt.page && alt.r && alt.r.status === 200 && !alt.r.redirectedTo;
    const cond = {};
    if (altOk && hostOf(url) === host) {
      const et = etagOhneSuffix(alt.r.headers && alt.r.headers.etag); if (et) cond['If-None-Match'] = et;
      const lm = alt.r.headers && alt.r.headers['last-modified']; if (lm) cond['If-Modified-Since'] = lm;
    }
    const r = await fetchFollow(url, { ...netz, conditional: cond, bodyNachRedirect: false });
    stats.fetched++; stats.retries += r.retries || 0;
    const rec = { url, status: r.status, final: r.final, chain: r.chain, loop: !!r.loop, tooManyHops: !!r.tooManyHops, ms: r.ms, error: r.error || null, headers: pick(r.headers, HEADER) };
    if (r.status === 304 && altOk && !r.chain.length) {
      // unverändert: Seite aus dem Cache; 304-Antworten tragen nur einen Teil der Header
      rec.status = 200; rec.headers = { ...alt.r.headers, ...rec.headers }; rec.page = html.unpack(alt.page, url); rec.fromCache = true; rec.bodyHash = alt.bodyHash; rec.bytes = alt.r.bytes; stats.reused++;
    } else if (r.status === 200 && r.chain.length && r.final !== url) {
      rec.redirectedTo = r.final; // Inhalt gehört zur Ziel-URL – die wird als eigene URL gecrawlt
      if (hostOf(r.final) === host && !ausschluss.some(x => pathOf(r.final).startsWith(x)) && seen.size < seenMax) einreihen(r.final);
    } else if (r.status === 200 && /html/i.test(r.headers['content-type'] || '')) {
      rec.bodyHash = sha1(r.body); rec.bytes = r.body.length;
      if (cfg.htmlDir) fs.writeFileSync(htmlDatei(cfg.htmlDir, url), zlib.gzipSync(r.body));
      if (altOk && alt.bodyHash === rec.bodyHash) { rec.page = html.unpack(alt.page, url); rec.fromCache = true; stats.reused++; }
      else { try { rec.page = html.parse(r.body, r.final); } catch (e) { rec.parseError = e.message; stats.parseFehler++; } }
    }
    if (rec.page) folgen(rec);
    return rec;
  }
  // Arbeiter: holen die nächste URL; ist die Warteschlange kurz leer, warten sie, solange andere noch Links liefern können
  let idx = 0, aktiv = 0, begonnen = 0, meldung = 100;
  async function worker() {
    for (;;) {
      if (begonnen >= maxPages || stats.abgebrochen) return;
      // Notbremse: Ist die Website offensichtlich gestört, nicht stundenlang weiter abrufen (der Lauf gilt dann als unsicher)
      if (Date.now() - t0 > maxDauer) { stats.abgebrochen = `Zeitlimit von ${Math.round(maxDauer / 60000)} Minuten erreicht`; return; }
      if (roh.size >= 40 && fehler > roh.size / 2) { stats.abgebrochen = `${fehler} von ${roh.size} Abrufen fehlgeschlagen`; return; }
      if (idx >= queue.length) { if (aktiv === 0) return; await sleep(15); continue; }
      const url = queue[idx++]; begonnen++; aktiv++;
      try { const rec = await seite(url); if (rec.status === 0 || rec.status >= 500) fehler++; roh.set(url, rec); }
      catch (e) { stats.interneFehler++; roh.set(url, { url, status: 0, final: url, chain: [], loop: false, tooManyHops: false, ms: 0, error: 'intern: ' + e.message, headers: {} }); }
      finally { aktiv--; }
      if (roh.size >= meldung) { meldung += 100; log(`Crawl: ${roh.size} URLs (${stats.reused} unverändert)`); }
      if (delay) await sleep(delay);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  stats.queued = queue.length; stats.limitErreicht = !stats.abgebrochen && (queue.length > begonnen || seen.size >= seenMax);

  // Verlinkte Dateien (PDF, Downloads …) nur auf Erreichbarkeit prüfen
  const dateien = new Map();
  for (const [u, quellen] of [...kandidaten].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 300)) {
    if (stats.abgebrochen || !robotsAllows(robots, u)) continue;
    let r = await fetchFollow(u, { ...netz, method: 'HEAD', headers: { Accept: '*/*' } });
    if (r.status === 405 || r.status === 501) r = await fetchFollow(u, { ...netz, noBody: true, headers: { Accept: '*/*' } });
    const d = { status: r.status, quellen, contentType: r.headers['content-type'] || null, bytes: Number(r.headers['content-length']) || null };
    if (r.final !== u) d.final = r.final; if (r.error) d.error = r.error;
    dateien.set(u, d); stats.fetched++;
    if (delay) await sleep(delay);
  }
  stats.dauerMs = Date.now() - t0;
  return abschluss(roh, { base, host, at, offline: false, prev: cfg.prev || null, robots, robotsStatus: robotsRes.status, sitemap, dateien, stats });
}

/**
 * Weiterleitungen prüfen (cfg.redirectChecks): [{ von, erwartet, maxSpruenge, art? }]
 * → [{ von, erwartet, final, status, spruenge, maxSpruenge, ok, grund, kette[], art? }]
 * ok: Ziel exakt erreicht, Status 200, höchstens maxSpruenge Sprünge, nur dauerhafte Weiterleitungen (301/308).
 */
async function checkRedirects(checks, opts = {}) {
  const out = []; const norm = u => { try { return new URL(u).href; } catch (_) { return u; } };
  for (const c of checks || []) {
    const max = c.maxSpruenge === undefined ? 1 : c.maxSpruenge;
    const r = await fetchFollow(c.von, { timeoutMs: opts.timeoutMs || 20000, retries: opts.retries === undefined ? 1 : opts.retries, retryDelayMs: opts.retryDelayMs, maxHops: Math.max(5, max + 2), noBody: true });
    const spruenge = r.chain.length; const temp = r.chain.filter(h => h.status !== 301 && h.status !== 308).map(h => h.status);
    let grund = '';
    if (r.loop) grund = 'Weiterleitungsschleife';
    else if (r.tooManyHops) grund = `zu viele Weiterleitungen hintereinander (${spruenge})`;
    else if (r.status === 0) grund = `nicht erreichbar (${r.error || 'Netzfehler'})`;
    else if (norm(r.final) !== norm(c.erwartet)) grund = `endet auf ${r.final} statt ${c.erwartet}`;
    else if (r.status !== 200) grund = `Ziel antwortet mit HTTP ${r.status}`;
    else if (spruenge > max) grund = `${spruenge} Sprünge statt höchstens ${max}`;
    else if (c.nurPermanent !== false && temp.length) grund = `vorübergehende Weiterleitung (${temp.join(', ')}) statt 301`;
    else if (r.chain.some(h => /^https:/i.test(h.from) && /^http:\/\//i.test(h.to))) grund = 'Zwischenschritt von https zurück auf unverschlüsseltes http://';
    out.push({ von: c.von, erwartet: c.erwartet, final: r.final, status: r.status, spruenge, maxSpruenge: max, ok: !grund, grund, kette: r.chain.map(h => ({ status: h.status, to: h.to })), ...(c.art ? { art: c.art } : {}) });
    if (opts.delayMs) await sleep(opts.delayMs);
  }
  return out;
}

/**
 * Kompletter Crawl-Schritt mit der Konfiguration des Autopiloten: Cache laden, crawlen (oder offline aus dem
 * Cache), Weiterleitungen prüfen, Cache schreiben. Ergebnis: { crawl, hostChecks }.
 * opts: { prev, log, offline, cacheFile, save } – Cache-Datei: opts.cacheFile, sonst cfg.cacheFile, sonst <dataDir>/page-cache.json
 */
async function run(cfg, opts = {}) {
  const file = opts.cacheFile || cfg.cacheFile || path.join(cfg.dataDir, 'page-cache.json');
  const offline = opts.offline !== undefined ? !!opts.offline : process.env.SEO_OFFLINE === '1';
  const cache = loadCache(file);
  const c = await crawl({ ...cfg.crawl, base: cfg.base, extraPaths: cfg.extraPaths, cache, prev: opts.prev || null, log: opts.log, offline });
  let hostChecks;
  if (offline) hostChecks = (cache.crawl && cache.crawl.hostChecks) || [];
  else {
    hostChecks = await checkRedirects(cfg.redirectChecks || [], { ...pick(cfg.crawl || {}, ['timeoutMs', 'retries', 'retryDelayMs']), delayMs: cfg.crawl ? cfg.crawl.delayMs : 200 });
    if (opts.save !== false) saveCache(file, c, hostChecks);
  }
  c.hostChecks = hostChecks;
  return { crawl: c, hostChecks };
}

/** Kompakte Form für last-crawl.json (Vergleichsbasis des nächsten Laufs und Anzeige im SEO Center). */
function serialize(c, hostChecks) {
  const pages = {}; const start = c.base + '/';
  for (const [u, r] of c.pages) {
    const pg = r.page;
    const o = { status: r.status, final: r.final, chain: r.chain, path: r.path, typ: r.typ, noindex: r.noindex, indexable: r.indexable, contentHash: r.contentHash, changed: !!r.changed, inSitemap: r.inSitemap, sitemapFile: r.sitemapFile, lastmod: r.lastmod, inlinks: r.inlinks, ms: r.ms, bytes: r.bytes || null, fromCache: !!r.fromCache, headers: u === start ? r.headers : pick(r.headers, HEADER_KURZ), textShingle: r.textShingle || null,
      page: pg ? { title: pg.title, description: pg.description, canonical: pg.canonical, robots: pg.robots, h1: pg.h1, h2: pg.h2, wordCount: pg.wordCount, jsonldTypes: pg.jsonld.flatMap(b => (b && Array.isArray(b['@graph']) ? b['@graph'] : [b]).map(x => x && x['@type'])).filter(Boolean), jsonldErrors: pg.jsonldErrors.length, og: !!pg.og['og:title'], images: pg.images.length, imagesNoAlt: pg.images.filter(i => !i.alt).length } : null };
    if (r.error) o.error = r.error; if (r.redirectedTo) o.redirectedTo = r.redirectedTo; if (r.robotsAllowed === false) o.robotsAllowed = false; if (r.loop) o.loop = true;
    pages[u] = o;
  }
  return { at: c.at || new Date().toISOString(), base: c.base, stats: c.stats, robots: c.robots, robotsStatus: c.robotsStatus, sitemap: { files: c.sitemap.files, count: c.sitemap.entries.size }, hostChecks: hostChecks || c.hostChecks || [], dateien: Object.fromEntries(c.dateien || []), pages };
}

module.exports = { crawl, run, serialize, serializeCrawl: serialize, fetchFollow, fetchRetry, fetchRaw, parseRobots, robotsAllows, readSitemaps, checkRedirects, checkHostRedirects: checkRedirects, loadCache, saveCache, etagOhneSuffix, UA };
