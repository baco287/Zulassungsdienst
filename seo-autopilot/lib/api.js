'use strict';
// ─── Daten-Vertrag des SEO Centers (lokale Seite) ────────────────────────────
// Derselbe Vertrag wie public/seo/daten.php auf der Website – gleiche Parameter, gleiche
// Statuscodes, gleiche Antwortformen. test/php.test.js prüft beide Seiten gegeneinander;
// wer hier etwas ändert, ändert es auch dort.
//
//   GET  daten.php?d=<name>          Datensatz ausliefern (feste Liste FILES)
//   GET  daten.php?bericht=<datei>   Bericht aus reports/ (Markdown oder JSON)
//   GET  daten.php?zustand=1         Diagnose: welche Dateien vorliegen (keine Inhalte)
//   POST daten.php?review=<id>       Bearbeitungsstand eines Befunds speichern, Body {state, note}
//   POST daten.php?ablage=<name>     Upload durch den Prüflauf, roh oder gzip (X-Body-Encoding: gzip)
//
// handle() ist eine reine Funktion der Anfrage und des Datenordners: server.js (lokal, ohne
// Login, nur 127.0.0.1) und die Tests rufen sie direkt auf. Namen aus der Anfrage werden nur
// mit festen Listen bzw. einem Muster verglichen und fließen nie ungeprüft in einen Pfad.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { ReviewStore, ReviewError, ID_RE, writeAtomic } = require('./review');

/** Version des Daten-Vertrags (steht in ?zustand=1). */
const VERSION = 1;
/** Größte Ablage in Bytes, roh wie entpackt (16 MB). */
const MAX_UPLOAD = 16 * 1024 * 1024;
/** Größte Anfrage beim Speichern eines Bearbeitungsstands (64 KB). */
const MAX_REVIEW = 64 * 1024;
const INDEX_MAX = 5000;

/** Feste Zuordnung Name → Datei im Datenordner. Nur diese Namen sind abrufbar. */
const FILES = {
  uebersicht: 'uebersicht.json', issues: 'issues.json', review: 'review.json', suggestions: 'suggestions.json',
  opportunities: 'opportunities.json', notifications: 'notifications.json', 'crawl-history': 'crawl-history.json',
  gsc: 'gsc.json', 'gsc-analysis': 'gsc-analysis.json', 'gsc-status': 'gsc-status.json',
  reports: 'reports/index.json', 'local-check': 'local-check.json', 'last-crawl': 'last-crawl.json',
};
/** review schreibt nur das SEO Center selbst, local-check entsteht nur lokal: kein Upload. */
const NO_UPLOAD = ['review', 'local-check'];
/** Was bin/sync.js vor dem Prüflauf holt bzw. danach hochlädt (Berichte und ihr Index kommen beim Hochladen dazu). */
const SYNC = {
  runter: ['issues', 'last-crawl', 'crawl-history', 'suggestions', 'opportunities', 'notifications', 'gsc', 'gsc-analysis', 'gsc-status', 'reports', 'review'],
  hoch: ['issues', 'last-crawl', 'crawl-history', 'suggestions', 'opportunities', 'notifications', 'gsc', 'gsc-analysis', 'gsc-status', 'uebersicht'],
};
/** Berichtsdateien in reports/ (Abruf und Ablage). */
const REPORT_RE = /^(daily|weekly|monthly|latest)-[A-Za-z0-9._-]+\.(md|json)$/;
/** Berichte eines Laufs (ohne latest-*): Treffer 1 ist der Name ohne Endung. */
const REPORT_RUN_RE = /^((daily|weekly|monthly)-[A-Za-z0-9._-]+)\.(md|json)$/;
/** Eintrag „file“ im Berichtsindex. */
const INDEX_FILE_RE = /^(daily|weekly|monthly)-[A-Za-z0-9._-]+\.md$/;
const JSON_TYPE = 'application/json; charset=utf-8';
const READ = ['d', 'bericht', 'zustand'];
const WRITE = ['review', 'ablage'];
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

const json = (code, obj, headers) => ({ code, type: JSON_TYPE, body: JSON.stringify(obj), ...(headers ? { headers } : {}) });
const fail = (code, error, more) => json(code, { ok: false, error, ...more });
const falscheMethode = erlaubt => json(405, { ok: false, error: 'Methode nicht erlaubt' }, { allow: erlaubt });
/** Streng dekodieren: ungültiges UTF-8 und ein vorangestelltes BOM gelten als Fehler (wie in PHP). */
const utf8 = buf => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buf);
const isFile = p => { try { return fs.statSync(p).isFile(); } catch (_) { return false; } };

/** Löscht Berichte, die nicht mehr im Index stehen, und liegen gebliebene Zwischendateien. */
function cleanReports(dir, keep) {
  let removed = 0; let files = []; try { files = fs.readdirSync(dir); } catch (_) { /* Ordner fehlt */ }
  for (const f of files) {
    const p = path.join(dir, f); const m = REPORT_RUN_RE.exec(f);
    try {
      if (m) { if (!keep.has(m[1])) { fs.unlinkSync(p); removed++; } }
      else if (f.startsWith('.neu-') && fs.statSync(p).mtimeMs < Date.now() - 3600e3) fs.unlinkSync(p);
    } catch (_) { /* nicht löschbar: beim nächsten Mal */ }
  }
  return removed;
}

/** Schnittstelle für einen bestimmten Datenordner (Tests nutzen eigene Temp-Ordner). */
function create(dataDir) {
  const dir = () => { try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) { /* dann fehlen die Dateien eben */ } return dataDir; };

  function datensatz(name) {
    if (!own(FILES, name)) return fail(400, 'Unbekannter Datensatz');
    const p = path.join(dir(), FILES[name]);
    try { if (isFile(p)) return { code: 200, type: JSON_TYPE, body: fs.readFileSync(p) }; } catch (_) { /* wie fehlend */ }
    return json(404, { ok: false, fehlt: true, d: name });
  }
  function bericht(datei) {
    if (datei !== path.basename(datei) || !REPORT_RE.test(datei)) return fail(400, 'Ungültiger Berichtsname');
    const p = path.join(dir(), 'reports', datei);
    try { if (isFile(p)) return { code: 200, type: datei.endsWith('.md') ? 'text/markdown; charset=utf-8' : JSON_TYPE, body: fs.readFileSync(p) }; } catch (_) { /* wie fehlend */ }
    return fail(404, 'Bericht nicht gefunden', { fehlt: true });
  }
  function zustand(wert) {
    if (wert !== '1') return fail(400, 'Ungültiger Wert für zustand');
    const d = dir(); const dateien = {};
    for (const [name, datei] of Object.entries(FILES)) {
      try { const st = fs.statSync(path.join(d, datei)); if (st.isFile()) dateien[name] = { bytes: st.size, geaendert: new Date(Math.floor(st.mtimeMs / 1000) * 1000).toISOString().replace('.000Z', 'Z') }; } catch (_) { /* fehlt */ }
    }
    let berichte = 0; try { berichte = fs.readdirSync(path.join(d, 'reports')).filter(f => INDEX_FILE_RE.test(f)).length; } catch (_) { /* Ordner fehlt */ }
    let schreibbar = false; try { fs.accessSync(d, fs.constants.W_OK); schreibbar = fs.statSync(d).isDirectory(); } catch (_) { /* nicht beschreibbar */ }
    return json(200, { ok: true, dateien, berichte, schreibbar, version: VERSION });
  }
  function review(id, body) {
    if (!ID_RE.test(id)) return fail(400, 'Ungültige Befund-ID');
    if (body.length > MAX_REVIEW) return fail(413, 'Anfrage zu groß');
    let b; try { b = JSON.parse(utf8(body)); } catch (_) { return fail(400, 'Ungültiges JSON'); }
    if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(400, 'Ungültiges JSON');
    try { return json(200, { ok: true, review: new ReviewStore(dir()).set(id, own(b, 'state') ? b.state : null, own(b, 'note') ? b.note : '') }); }
    catch (e) { return e instanceof ReviewError ? fail(e.status, e.message) : fail(500, 'Speichern fehlgeschlagen'); }
  }
  function ablage(name, headers, body) {
    let ziel;
    if (own(FILES, name)) { if (NO_UPLOAD.includes(name)) return fail(403, 'Ablage für diesen Datensatz nicht erlaubt'); ziel = FILES[name]; }
    else if (name.startsWith('reports/')) { const datei = name.slice(8); if (datei !== path.basename(datei) || !REPORT_RE.test(datei)) return fail(400, 'Ungültiger Berichtsname'); ziel = 'reports/' + datei; }
    else return fail(400, 'Unbekanntes Ablageziel');

    if (body.length > MAX_UPLOAD) return fail(413, 'Anfrage zu groß');
    const kodierung = String(headers['x-body-encoding'] || '').trim().toLowerCase(); let inhalt = body;
    if (kodierung === 'gzip') {
      try { inhalt = zlib.gunzipSync(body, { maxOutputLength: MAX_UPLOAD }); }
      catch (e) { return e && e.code === 'ERR_BUFFER_TOO_LARGE' ? fail(413, 'Inhalt zu groß (höchstens 16 MB)') : fail(400, 'Inhalt lässt sich nicht entpacken'); }
    } else if (kodierung !== '' && kodierung !== 'identity') return fail(400, 'Unbekannte Kodierung in X-Body-Encoding');
    if (!inhalt.length) return fail(400, 'Leerer Inhalt');

    const istJson = ziel.endsWith('.json'); let text;
    try { text = utf8(inhalt); } catch (_) { return fail(400, istJson ? 'Ungültiges JSON' : 'Ungültiger Text (kein UTF-8)'); }
    let keep = null;
    if (istJson) {
      // Objekt oder Liste auf oberster Ebene; alles andere ist kein Datensatz
      let daten; try { if (!/^[ \t\r\n]*[[{]/.test(text)) throw new Error('kein Objekt'); daten = JSON.parse(text); } catch (_) { return fail(400, 'Ungültiges JSON'); }
      if (name === 'reports') {
        const gueltig = Array.isArray(daten) && daten.length <= INDEX_MAX && daten.every(e => e && typeof e === 'object' && !Array.isArray(e) && typeof e.file === 'string' && INDEX_FILE_RE.test(e.file));
        if (!gueltig) return fail(400, 'Ungültiger Berichtsindex');
        keep = new Set(daten.map(e => e.file.slice(0, -3)));
      }
    }
    const d = dir();
    try { writeAtomic(path.join(d, ziel), inhalt); } catch (_) { return fail(500, 'Speichern fehlgeschlagen'); }
    return json(200, { ok: true, bytes: inhalt.length, ...(keep ? { entfernt: cleanReports(path.join(d, 'reports'), keep) } : {}) });
  }

  /**
   * method: 'GET' | 'POST' · query: URLSearchParams · headers: Kopfzeilen (Namen beliebig geschrieben) ·
   * body: Buffer (bei GET egal). Ergebnis: { code, type, body (String oder Buffer), headers? }.
   */
  function handle(method, query, headers, body) {
    try {
      if (method !== 'GET' && method !== 'POST') return falscheMethode('GET, POST');
      const h = {}; for (const [k, v] of Object.entries(headers || {})) h[k.toLowerCase()] = Array.isArray(v) ? String(v[0]) : String(v);
      if (method === 'POST') {
        // Schreiben nur mit eigener Kopfzeile und, falls gesendet, gleicher Herkunft (Schutz vor fremd ausgelösten Anfragen)
        if (h['x-requested-with'] !== 'XMLHttpRequest' && h['x-requested-with'] !== 'SEO-Autopilot') return fail(403, 'Nicht erlaubt: Kopfzeile X-Requested-With fehlt');
        if (h.origin) { const m = /^https?:\/\/([^/?#@\s]+)$/i.exec(h.origin); const host = (h.host || '').toLowerCase(); if (!host || !m || m[1].toLowerCase() !== host) return fail(403, 'Nicht erlaubt: fremde Herkunft'); }
        // Formulardaten zerlegt PHP auf der Website selbst (bei multipart ist der Anfragetext dann nicht mehr lesbar) – deshalb auch hier nicht
        if (/^\s*(multipart\/|application\/x-www-form-urlencoded)/i.test(h['content-type'] || '')) return fail(400, 'Formulardaten werden nicht angenommen (Content-Type)');
      }
      const paare = [...(query instanceof URLSearchParams ? query : new URLSearchParams(query || ''))];
      if (paare.length !== 1) return fail(400, 'Genau ein Parameter erwartet: d, bericht, zustand, review oder ablage');
      const [name, wert] = paare[0];
      if (!READ.includes(name) && !WRITE.includes(name)) return fail(400, 'Unbekannter Parameter');
      if (READ.includes(name) !== (method === 'GET')) return falscheMethode(READ.includes(name) ? 'GET' : 'POST');
      const buf = Buffer.isBuffer(body) ? body : Buffer.from(body || '');
      if (name === 'd') return datensatz(wert);
      if (name === 'bericht') return bericht(wert);
      if (name === 'zustand') return zustand(wert);
      if (name === 'review') return review(wert, buf);
      return ablage(wert, h, buf);
    } catch (_) { return fail(500, 'Interner Fehler'); }   // bewusst ohne Fehlertext: der könnte Pfade enthalten
  }
  return { handle, dataDir };
}

let standard = null;
/** Wie create(cfg.dataDir).handle – für den lokalen Server. */
function handle(method, query, headers, body) {
  if (!standard) standard = create(require('../config').dataDir);
  return standard.handle(method, query, headers, body);
}
module.exports = { handle, create, FILES, NO_UPLOAD, SYNC, REPORT_RE, REPORT_RUN_RE, INDEX_FILE_RE, MAX_UPLOAD, MAX_REVIEW, VERSION, JSON_TYPE };
