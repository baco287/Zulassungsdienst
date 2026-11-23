#!/usr/bin/env node
'use strict';
// ─── Abgleich des Datenstands zwischen Prüflauf und SEO Center ───────────────
//   node seo-autopilot/bin/sync.js pull     Stand vom SEO Center holen (vor dem Prüflauf)
//   node seo-autopilot/bin/sync.js push     Stand ins SEO Center hochladen (nach dem Prüflauf)
//   node seo-autopilot/bin/sync.js status   Erreichbarkeit und vorhandene Dateien anzeigen
// Der Prüflauf hat keinen eigenen Speicher: Zwischen zwei Läufen liegt der Stand beim SEO Center
// auf der Website (public/seo/daten.php, außerhalb des Web-Ordners). Gesprochen wird nur per
// HTTPS mit demselben Login wie im Browser (SEO_CENTER_URL, SEO_CENTER_USER, SEO_CENTER_PASSWORD).
// Welche Datei in welche Richtung geht, steht in lib/api.js (SYNC). review.json gehört dem SEO
// Center und wird nie hochgeladen; page-cache.json bleibt immer lokal.
// Ausgabe: nur Dateiname, Größe und Status – nie Zugangsdaten oder Inhalte (Logs sind öffentlich).
// Rückgabewert 1 bei jedem Fehler, damit kein Lauf mit leerem oder halbem Stand weitermacht.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const api = require('../lib/api');
const centerData = require('../lib/center-data');
const { writeAtomic } = require('../lib/review');

class SyncError extends Error { }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isFile = p => { try { return fs.statSync(p).isFile(); } catch (_) { return false; } };
const parse = buf => { try { return JSON.parse(buf.toString('utf8')); } catch (_) { return undefined; } };
/** Fehlertext des Servers für die Ausgabe: eine Zeile, ohne Steuerzeichen, höchstens 120 Zeichen. */
const kurz = s => String(s).replace(/[\s\u0000-\u001f\u007f]+/g, ' ').slice(0, 120);
const zeile = (was, name, bytes, status) => `${was}  ${name.padEnd(38)} ${(bytes === null ? '–' : String(bytes)).padStart(9)} ${bytes === null ? '     ' : 'Bytes'}  ${status}`;

/** Einstellungen aus der Konfiguration (cfg.center, cfg.dataDir); over überschreibt einzelne Werte (Tests). */
function settings(cfg, over = {}) {
  const center = (cfg && cfg.center) || { url: process.env.SEO_CENTER_URL || '', user: process.env.SEO_CENTER_USER || '', password: process.env.SEO_CENTER_PASSWORD || '' };
  const url = over.url || center.url || 'https://kfz-zulassungsprofis.de/seo/';
  const user = over.user !== undefined ? over.user : center.user; const password = over.password !== undefined ? over.password : center.password;
  if (!user || !password) throw new SyncError('Zugang fehlt: SEO_CENTER_USER und SEO_CENTER_PASSWORD sind nicht gesetzt. Ohne Login kann der Stand nicht mit dem SEO Center abgeglichen werden.');
  let u; try { u = new URL('daten.php', url.endsWith('/') ? url : url + '/'); } catch (_) { throw new SyncError('SEO_CENTER_URL ist keine gültige Adresse.'); }
  if (u.username || u.password) throw new SyncError('SEO_CENTER_URL darf keine Zugangsdaten enthalten (dafür gibt es SEO_CENTER_USER und SEO_CENTER_PASSWORD).');
  const lokal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(u.hostname);
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && lokal)) throw new SyncError('SEO_CENTER_URL muss mit https:// beginnen – der Login ginge sonst unverschlüsselt über die Leitung.');
  const dataDir = over.dataDir || (cfg && cfg.dataDir); if (!dataDir) throw new SyncError('Datenordner unbekannt (cfg.dataDir fehlt).');
  return {
    endpoint: u.origin + u.pathname, dataDir, auth: 'Basic ' + Buffer.from(`${user}:${password}`, 'utf8').toString('base64'),
    timeoutMs: over.timeoutMs || 30000, retries: over.retries !== undefined ? over.retries : 2, pauseMs: over.pauseMs !== undefined ? over.pauseMs : 1500,
    abstandMs: over.abstandMs !== undefined ? over.abstandMs : 100,   // kurze Pause zwischen zwei Anfragen (geteilter Webspace)
    fetchImpl: over.fetchImpl || fetch, log: over.log || console.log,
  };
}

/** Eine Anfrage mit Zeitlimit; bei Netzfehlern, Zeitüberschreitung und 500/502/503/504 wird wiederholt. */
async function request(s, query, init = {}) {
  let grund = 'Netzwerkfehler';
  if (s.abstandMs) await sleep(s.abstandMs);
  for (let versuch = 0; versuch <= s.retries; versuch++) {
    if (versuch) await sleep(s.pauseMs * versuch);
    try {
      // Weiterleitungen nicht folgen: aus einem POST würde sonst ein GET, und der Login ginge an eine andere Adresse.
      const res = await s.fetchImpl(`${s.endpoint}?${query}`, { ...init, redirect: 'manual', signal: AbortSignal.timeout(s.timeoutMs), headers: { authorization: s.auth, 'user-agent': 'SEO-Autopilot', accept: 'application/json, text/markdown', ...init.headers } });
      const buf = Buffer.from(await res.arrayBuffer());
      if ([500, 502, 503, 504].includes(res.status) && versuch < s.retries) { grund = 'HTTP ' + res.status; continue; }
      return { status: res.status, buf };
    } catch (e) {
      grund = e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? `Zeitüberschreitung nach ${Math.round(s.timeoutMs / 1000)} s` : (e && e.cause && e.cause.code) || 'Netzwerkfehler';
    }
  }
  throw new SyncError(`SEO Center nicht erreichbar (${grund}, ${s.retries + 1} Versuche).`);
}

/** Verständliche Meldung zu einer Antwort, die nicht vom SEO Center stammt oder den Zugriff verweigert. */
function erklaere(status, j) {
  if (status >= 300 && status < 400) return `Der Server leitet weiter (HTTP ${status}). SEO_CENTER_URL muss die endgültige Adresse sein: https, ohne www, mit Schrägstrich am Ende.`;
  if (status === 401) return 'Anmeldung abgelehnt (HTTP 401). SEO_CENTER_USER und SEO_CENTER_PASSWORD müssen dem Login des SEO Centers entsprechen.';
  if (status === 429) return 'Anmeldung vorübergehend gesperrt (HTTP 429, zu viele Fehlversuche). In 15 Minuten erneut versuchen.';
  if (status === 503) return 'SEO Center nicht eingerichtet oder nicht verfügbar (HTTP 503). Auf dem Server fehlt vermutlich der Login – er wird beim Deploy der Website angelegt.';
  if (status === 404) return 'daten.php nicht gefunden (HTTP 404). Ist das SEO Center schon veröffentlicht, und stimmt SEO_CENTER_URL?';
  if (status === 200) return 'Unerwartete Antwort (HTTP 200, aber kein gültiger Zustand). Unter SEO_CENTER_URL antwortet nicht das SEO Center.';
  return `Unerwartete Antwort (HTTP ${status}${j && typeof j.error === 'string' ? ': ' + kurz(j.error) : ''}).`;
}

/** Erreichbarkeit, Login und Schreibrecht prüfen. Wirft mit verständlicher Meldung, wenn etwas nicht stimmt. */
async function zustand(s) {
  const r = await request(s, 'zustand=1'); const j = parse(r.buf);
  if (r.status !== 200 || !j || j.ok !== true || !j.dateien || typeof j.dateien !== 'object') throw new SyncError(erklaere(r.status, j));
  return j;
}

/** Stand holen. Erst wenn alle Dateien fehlerfrei angekommen sind, wird geschrieben (kein halber Stand). */
async function pull(s) {
  const z = await zustand(s);
  if (z.schreibbar === false) throw new SyncError('Der Datenordner des SEO Centers ist nicht beschreibbar. Der Lauf könnte sein Ergebnis nicht ablegen und startet deshalb nicht.');
  s.log(`SEO Center erreichbar: ${Object.keys(z.dateien).length} Dateien, ${z.berichte} Berichte`);
  const geholt = []; const fehlt = []; let fehler = 0;
  for (const name of api.SYNC.runter) {
    const datei = api.FILES[name]; const r = await request(s, 'd=' + name); const j = parse(r.buf);
    if (r.status === 200 && j !== undefined && j !== null && typeof j === 'object') { geholt.push({ datei, buf: r.buf }); continue; }
    if (r.status === 404 && j && j.fehlt === true) { fehlt.push(name); s.log(zeile('pull', datei, null, 'noch nicht vorhanden')); continue; }
    fehler++; s.log(zeile('pull', datei, null, r.status === 200 ? 'FEHLER: kein gültiges JSON' : 'FEHLER: ' + erklaere(r.status, j)));
  }
  if (fehler) throw new SyncError(`pull abgebrochen: ${fehler} Datei(en) nicht lesbar – lokal wurde nichts verändert.`);
  for (const g of geholt) { writeAtomic(path.join(s.dataDir, g.datei), g.buf); s.log(zeile('pull', g.datei, g.buf.length, 'ok')); }
  const erstlauf = fehlt.includes('issues');
  s.log(erstlauf ? 'Erstlauf: Im SEO Center liegt noch kein Stand – der Prüflauf beginnt neu.' : `pull fertig: ${geholt.length} Dateien geholt, ${fehlt.length} noch nicht vorhanden`);
  return { geholt: geholt.length, fehlt, erstlauf };
}

// Reihenfolge beim Hochladen: zuerst der Befundstand, dann die Vergleichsbasis – scheitert eine der beiden, bricht push
// sofort ab. So ersetzt nie ein neuer last-crawl.json die Vergleichsbasis, ohne dass der passende Befundstand (mit den
// Meldemarkierungen) auf dem Server liegt. Danach die übrigen Daten, die Berichte und der Index (je best effort).
const PFLICHT = ['issues', 'last-crawl'];

/** Stand hochladen: Befundstand, Vergleichsbasis, übrige Daten, Berichte, den Berichtsindex zuletzt (der Server räumt danach alte Berichte auf). */
async function push(s) {
  // Schutz: Ohne Ergebnis eines Prüflaufs wird nichts hochgeladen – sonst überschriebe ein leerer Ordner den Stand.
  const st = parse(isFile(path.join(s.dataDir, 'issues.json')) ? fs.readFileSync(path.join(s.dataDir, 'issues.json')) : Buffer.alloc(0));
  if (!st || typeof st !== 'object' || !st.issues || typeof st.issues !== 'object' || !Array.isArray(st.runs) || !st.runs.length) throw new SyncError('push verweigert: issues.json fehlt oder ist leer. Ohne Ergebnis eines Prüflaufs wird nichts hochgeladen.');
  const z = await zustand(s);
  if (z.schreibbar === false) throw new SyncError('Der Datenordner des SEO Centers ist nicht beschreibbar.');

  const reports = path.join(s.dataDir, 'reports'); const auftraege = []; let fehler = 0;
  const reihe = [...PFLICHT, ...api.SYNC.hoch.filter(n => !PFLICHT.includes(n))];
  for (const name of reihe) if (isFile(path.join(s.dataDir, api.FILES[name]))) auftraege.push({ name, datei: api.FILES[name], pflicht: PFLICHT.includes(name) });
  let berichte = []; try { berichte = fs.readdirSync(reports).filter(f => api.REPORT_RE.test(f) && isFile(path.join(reports, f))).sort(); } catch (_) { /* keine Berichte */ }
  for (const f of berichte) auftraege.push({ name: 'reports/' + f, datei: 'reports/' + f });
  // Den Index aus dem Ordner fortschreiben: Stünde ein eben hochgeladener Bericht nicht darin, löschte der Server ihn gleich wieder.
  try { centerData.writeIndex(s.dataDir); auftraege.push({ name: 'reports', datei: api.FILES.reports }); }
  catch (_) { fehler++; s.log(zeile('push', api.FILES.reports, null, 'FEHLER: Berichtsindex nicht schreibbar')); }

  let hoch = 0;
  const abbruch = a => new SyncError(`push abgebrochen: ${a.datei} nicht abgelegt${hoch ? ` (davor ${hoch} abgelegt)` : ''} – die übrigen Dateien wurden nicht hochgeladen, damit Befundstand und Vergleichsbasis im SEO Center zusammenpassen.`);
  for (const a of auftraege) {
    const roh = fs.readFileSync(path.join(s.dataDir, a.datei));
    if (!roh.length || roh.length > api.MAX_UPLOAD) { fehler++; s.log(zeile('push', a.datei, roh.length, roh.length ? 'FEHLER: zu groß (höchstens 16 MB)' : 'FEHLER: Datei ist leer')); if (a.pflicht) throw abbruch(a); continue; }
    // Ein Netzfehler (SyncError aus request) bricht ohnehin ab – auch bei den übrigen Dateien.
    const r = await request(s, 'ablage=' + a.name, { method: 'POST', body: zlib.gzipSync(roh), headers: { 'content-type': 'application/octet-stream', 'x-body-encoding': 'gzip', 'x-requested-with': 'SEO-Autopilot' } });
    const j = parse(r.buf);
    if (r.status === 200 && j && j.ok === true && j.bytes === roh.length) { hoch++; s.log(zeile('push', a.datei, roh.length, 'ok' + (j.entfernt ? ` (${j.entfernt} alte Berichtsdateien entfernt)` : ''))); continue; }
    fehler++; s.log(zeile('push', a.datei, roh.length, 'FEHLER: ' + (r.status === 200 ? 'Größe nicht bestätigt' : erklaere(r.status, j))));
    if (a.pflicht) throw abbruch(a);
  }
  if (fehler) throw new SyncError(`push unvollständig: ${fehler} Datei(en) nicht abgelegt, ${hoch} abgelegt.`);
  s.log(`push fertig: ${hoch} Dateien abgelegt`);
  return { hoch };
}

/** Übersicht: was liegt im SEO Center, was lokal. */
async function status(s) {
  const z = await zustand(s);
  s.log(`SEO Center erreichbar · Datenordner ${z.schreibbar ? 'beschreibbar' : 'NICHT beschreibbar'} · ${z.berichte} Berichte · Vertrag v${z.version}`);
  for (const [name, datei] of Object.entries(api.FILES)) {
    const server = z.dateien[name]; let lokal = null; try { lokal = fs.statSync(path.join(s.dataDir, datei)).size; } catch (_) { /* fehlt lokal */ }
    s.log(`${datei.padEnd(22)} Server: ${server ? String(server.bytes).padStart(9) + ' Bytes, ' + server.geaendert : 'fehlt'.padStart(9)}   lokal: ${lokal === null ? 'fehlt' : lokal + ' Bytes'}`);
  }
  return z;
}

/** Kommandozeile. Gibt den Rückgabewert zurück (0 ok, 1 Fehler, 2 falscher Aufruf). */
async function main(argv, cfg, over = {}) {
  const log = over.log || console.log; const befehle = { pull, push, status };
  if (!Object.prototype.hasOwnProperty.call(befehle, argv[0])) { log('Aufruf: node seo-autopilot/bin/sync.js pull | push | status'); return 2; }
  try { await befehle[argv[0]](settings(cfg, over)); return 0; }
  catch (e) { log('[sync] ' + (e instanceof SyncError ? e.message : 'Unerwarteter Fehler: ' + kurz(e && e.message))); return 1; }
}

if (require.main === module) main(process.argv.slice(2), require('../config')).then(code => { process.exitCode = code; });
module.exports = { main, pull, push, status, settings, SyncError };
