#!/usr/bin/env node
'use strict';
// ─── SEO Center – lokaler Server (ohne Login, nur 127.0.0.1) ─────────────────
//   node seo-autopilot/server.js [port]        → http://localhost:3500/seo/
// Zeigt dieselbe Oberfläche wie die Website (public/seo/center.html) und bedient denselben
// Daten-Vertrag (lib/api.js ↔ public/seo/daten.php) aus dem lokalen Datenordner. Auf der
// Website übernimmt das PHP hinter dem Login; hier gibt es bewusst keinen Login, dafür ist der
// Server nur vom eigenen Rechner aus erreichbar. Einzige Schreiboperationen: Bearbeitungsstand
// je Befund (review.json) und die Ablage, mit der sich bin/sync.js lokal testen lässt.
const http = require('http');
const fs = require('fs');
const path = require('path');
const api = require('./lib/api');

const CENTER = path.join(__dirname, '..', 'public', 'seo', 'center.html');
const TEXT = 'text/plain; charset=utf-8';
// Wie auf der Website: keine fremden Quellen. So fällt lokal auf, was die Website blockieren würde.
const CSP = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
const HEADERS = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY', 'content-security-policy': CSP };
// Nur Aufrufe an localhost/127.0.0.1: Eine fremde Webseite, deren Name auf 127.0.0.1 zeigt, käme sonst ohne Login an die Daten.
const LOKAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/** opts.dataDir: Datenordner (Standard: config.js) · opts.centerFile: Oberfläche (Standard: public/seo/center.html). */
function createServer(opts = {}) {
  const daten = api.create(opts.dataDir || require('./config').dataDir);
  const centerFile = opts.centerFile || CENTER;
  return http.createServer((req, res) => {
    const send = (code, body, type, extra) => { res.writeHead(code, { 'content-type': type, ...HEADERS, ...extra }); res.end(req.method === 'HEAD' ? undefined : body); };
    if (!LOKAL.test(req.headers.host || '')) return send(403, 'Nur über localhost erreichbar.', TEXT);
    let u; try { u = new URL(req.url, 'http://localhost'); } catch (_) { return send(400, 'Ungültige Adresse.', TEXT); }
    const p = u.pathname; const lesen = req.method === 'GET' || req.method === 'HEAD';
    if (lesen && (p === '/' || p === '/seo')) return send(302, '', TEXT, { location: '/seo/' });
    if (lesen && (p === '/seo/' || p === '/seo/index.php')) {
      let html = null; try { html = fs.readFileSync(centerFile); } catch (_) { /* fehlt noch */ }
      if (html) return send(200, html, 'text/html; charset=utf-8');
      return send(404, 'Die Oberfläche des SEO Centers fehlt noch: public/seo/center.html wurde nicht gefunden.\nDie Daten sind trotzdem abrufbar, zum Beispiel /seo/daten.php?zustand=1', TEXT);
    }
    if (p !== '/seo/daten.php') return send(404, JSON.stringify({ ok: false, error: 'Nicht gefunden' }), api.JSON_TYPE);
    // Anfragetext einsammeln. Ist er zu groß, bekommt lib/api.js einen Platzhalter der Länge „eins zu viel“ –
    // dann meldet es selbst „zu groß“, in derselben Reihenfolge der Prüfungen wie die Website.
    const teile = []; let groesse = 0; let zuGross = false;
    req.on('data', c => { groesse += c.length; if (groesse > api.MAX_UPLOAD) { zuGross = true; teile.length = 0; if (groesse > 4 * api.MAX_UPLOAD) req.destroy(); } else teile.push(c); });
    req.on('error', () => { /* Verbindung abgebrochen */ });
    req.on('end', () => {
      const body = zuGross ? Buffer.alloc(api.MAX_UPLOAD + 1) : Buffer.concat(teile);
      const r = daten.handle(req.method, u.searchParams, req.headers, body);
      send(r.code, r.body, r.type, r.headers);
    });
  });
}

/** Startet den Server – immer nur an 127.0.0.1 gebunden. Löst mit dem laufenden Server auf. */
function start(port, opts = {}) {
  return new Promise((resolve, reject) => {
    const server = createServer(opts);
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(server); });
  });
}

if (require.main === module) {
  const cfg = require('./config');
  const port = parseInt(process.argv[2] || cfg.dashboardPort || 3500, 10);
  start(port, { dataDir: cfg.dataDir })
    .then(() => console.log(`SEO Center: http://localhost:${port}/seo/  (Daten: ${cfg.dataDir})`))
    .catch(e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} ist belegt – läuft das SEO Center schon? Sonst: node seo-autopilot/server.js <anderer Port>` : 'SEO Center konnte nicht starten: ' + e.message); process.exit(1); });
}
module.exports = { createServer, start };
