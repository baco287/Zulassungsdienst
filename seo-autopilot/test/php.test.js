'use strict';
// Website-Seite des SEO Centers (public/seo/) gegen den eingebauten PHP-Server:
// Login samt Sperre nach Fehlversuchen (auch für Kopien von public/analytics/), alle Wege von daten.php,
// Gleichlauf PHP ↔ Node (lib/api.js) und bin/sync.js gegen PHP.
// Der Temp-Webroot enthält Kopien von public/seo/ und public/api/analytics-lib.php sowie eine
// Zugangsdatei, die es nur dort gibt. Ohne installiertes PHP überspringen sich diese Tests.
// Hinweis: Der eingebaute Server wertet .htaccess nicht aus – die wird hier nur als Text geprüft.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const http = require('http');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const api = require('../lib/api');
const sync = require('../bin/sync');

const SEO = path.join(__dirname, '..', '..', 'public', 'seo');
const ANALYTICS = path.join(__dirname, '..', '..', 'public', 'analytics');
const LIB = path.join(__dirname, '..', '..', 'public', 'api', 'analytics-lib.php');
const PHP = (() => { try { const r = spawnSync('php', ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.trim() : null; } catch (_) { return null; } })();
const ohnePhp = PHP ? false : 'php ist nicht installiert';

const USER = 'seo-test', PASS = 'nur-im-test-4711';   // gilt nur im Temp-Webroot
const AUTH = 'Basic ' + Buffer.from(`${USER}:${PASS}`).toString('base64');
const ID = 'abcdef123456', ID2 = '0123456789ab', ID3 = '123456789012', FREMD = 'ffffffffffff';
const XHR = { 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/json' };
const RUN = { 'x-requested-with': 'SEO-Autopilot', 'content-type': 'application/octet-stream' };
const GZ = { ...RUN, 'x-body-encoding': 'gzip' };
const gz = x => zlib.gzipSync(x);
// Temp-Ordner dieses Testlaufs; werden am Ende wieder entfernt (einige Tests schreiben Dateien von 16 MB).
const tmpOrdner = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-php-')); tmpOrdner.push(d); return d; };
const modus = p => (fs.statSync(p).mode & 0o777).toString(8);
const baum = dir => { const out = []; const lauf = (d, pre) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) lauf(p, pre + f + '/'); else out.push(pre + f); } }; if (fs.existsSync(dir)) lauf(dir, ''); return out; };
const vor = tage => new Date(Date.now() - tage * 86400e3).toISOString();

// ── PHP-Server im Temp-Webroot ───────────────────────────────────────────────
const laufend = new Set();
const beenden = srv => { laufend.delete(srv); try { process.kill(-srv.proc.pid, 'SIGTERM'); } catch (_) { try { srv.proc.kill('SIGKILL'); } catch (__) { /* schon beendet */ } } };
process.on('exit', () => { for (const s of [...laufend]) beenden(s); });
test.after(() => { for (const s of [...laufend]) beenden(s); for (const d of tmpOrdner) fs.rmSync(d, { recursive: true, force: true }); });

const freierPort = () => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });

/**
 * opts.ohneDatenordnerVariable: KZP_SEO_DIR nicht setzen (dann gilt der Ort neben dem Web-Ordner).
 * opts.mitAnalytics: zusätzlich Kopien von public/analytics/ (index.php, daten.php) mit eigenem Datenordner.
 * opts.workers: Zahl der PHP-Prozesse (Standard 4).
 */
async function startePhp(opts = {}) {
  const root = tmp(); const web = path.join(root, 'konto', 'web'); const tmpDir = path.join(root, 'tmp'); const dataDir = opts.ohneDatenordnerVariable ? path.join(root, 'konto', 'seo-daten') : path.join(root, 'daten', 'seo-daten');
  fs.mkdirSync(path.join(web, 'seo'), { recursive: true }); fs.mkdirSync(path.join(web, 'api')); fs.mkdirSync(tmpDir); fs.mkdirSync(path.join(root, 'daten'));
  for (const f of ['index.php', 'daten.php', '.htaccess']) fs.copyFileSync(path.join(SEO, f), path.join(web, 'seo', f));
  fs.writeFileSync(path.join(web, 'seo', 'center.html'), '<!doctype html><title>SEO Center – Testhülle</title>');
  if (opts.mitAnalytics) {
    fs.mkdirSync(path.join(web, 'analytics')); for (const f of ['index.php', 'daten.php', '.htaccess']) fs.copyFileSync(path.join(ANALYTICS, f), path.join(web, 'analytics', f));
    fs.writeFileSync(path.join(web, 'analytics', 'dashboard.html'), '<!doctype html><title>Analytics – Testhülle</title>');
  }
  fs.copyFileSync(LIB, path.join(web, 'api', 'analytics-lib.php'));
  // Format wie scripts/analytics-zugang.mjs
  fs.writeFileSync(path.join(web, 'api', 'analytics-zugang.php'), `<?php\nreturn [\n    'user' => '${USER}',\n    'pass' => '${PASS}',\n];\n`, { mode: 0o600 });
  const port = await freierPort(); const env = { PATH: process.env.PATH, TMPDIR: tmpDir, PHP_CLI_SERVER_WORKERS: String(opts.workers || 4) }; if (!opts.ohneDatenordnerVariable) env.KZP_SEO_DIR = dataDir;
  if (opts.mitAnalytics) env.KZP_ANALYTICS_DIR = path.join(root, 'daten', 'analytics-daten');
  // sys_temp_dir: der Zähler für Fehlversuche beim Login landet im Temp-Ordner dieses Tests, nicht im System
  const proc = spawn('php', ['-d', 'sys_temp_dir=' + tmpDir, '-d', 'post_max_size=64M', '-S', '127.0.0.1:' + port, '-t', web], { env, stdio: ['ignore', 'ignore', 'pipe'], detached: true });
  const log = []; proc.stderr.on('data', d => { log.push(String(d)); if (log.length > 200) log.shift(); });
  const srv = { root, web, dataDir, tmpDir, port, proc, url: `http://127.0.0.1:${port}/seo/`, log, stop: () => beenden(srv) }; laufend.add(srv);
  for (let i = 0; i < 80; i++) {
    try { const r = await php(srv, 'GET', 'zustand=1', { auth: null }); if (r.status === 401) return srv; } catch (_) { /* startet noch */ }
    await new Promise(r => setTimeout(r, 75));
  }
  beenden(srv); throw new Error('PHP-Server ist nicht gestartet: ' + log.join('').slice(-400));
}

/** Anfrage an PHP mit frei wählbaren Kopfzeilen. qs === null: ohne Abfrage. */
function php(srv, method, qs, { auth = AUTH, headers = {}, body = null, pfad = '/seo/daten.php' } = {}) {
  return new Promise((resolve, reject) => {
    const h = { ...(auth ? { authorization: auth } : {}), ...headers }; if (body !== null) h['content-length'] = Buffer.byteLength(body);
    const req = http.request({ host: '127.0.0.1', port: srv.port, method, path: pfad + (qs === null ? '' : '?' + qs), headers: h }, res => {
      const c = []; res.on('data', d => c.push(d)); res.on('end', () => { const buf = Buffer.concat(c); let json; try { json = JSON.parse(buf.toString()); } catch (_) { json = undefined; } resolve({ status: res.statusCode, headers: res.headers, type: res.headers['content-type'], buf, text: buf.toString(), json }); });
    });
    req.on('error', reject); req.end(body === null ? undefined : body);
  });
}
/** Dieselbe Anfrage an lib/api.js. */
function node(dir, port, method, qs, { headers = {}, body = null } = {}) {
  const r = api.create(dir).handle(method, new URLSearchParams(qs || ''), { host: '127.0.0.1:' + port, ...headers }, body === null ? Buffer.alloc(0) : Buffer.from(body));
  const buf = Buffer.from(r.body); let json; try { json = JSON.parse(buf.toString()); } catch (_) { json = undefined; }
  return { status: r.code, headers: r.headers || {}, type: r.type, buf, text: buf.toString(), json };
}
/**
 * Für den Vergleich ersetzen, was sich zwangsläufig unterscheidet: Zeitstempel – und die Größe von review.json im
 * Zustand, weil PHP und Node dieselben Daten mit unterschiedlicher Einrückung speichern.
 */
const ohneZeit = v => (typeof v === 'string' ? (/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{3})?Z$/.test(v) ? 'ZEIT' : v) : Array.isArray(v) ? v.map(ohneZeit) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'review' && x && typeof x.bytes === 'number' ? { ...ohneZeit(x), bytes: 'GROESSE' } : ohneZeit(x)])) : v);

// ── Ohne PHP prüfbar: die Dateien selbst ─────────────────────────────────────
test('.htaccess: index.php als Startdatei, Oberfläche gesperrt, Login-Kopf für FastCGI, noindex/no-store – keine Umschreiberegeln, keine eigene CSP', () => {
  const h = fs.readFileSync(path.join(SEO, '.htaccess'), 'utf8'); const direktiven = h.split('\n').map(z => z.trim()).filter(z => z && !z.startsWith('#'));
  assert.ok(direktiven.includes('DirectoryIndex index.php')); assert.match(h, /<Files "center\.html">\s*Require all denied\s*<\/Files>/);
  assert.ok(direktiven.includes('SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1')); assert.ok(direktiven.includes('Header always set X-Robots-Tag "noindex, nofollow"')); assert.ok(direktiven.includes('Header always set Cache-Control "no-store"'));
  assert.ok(!direktiven.some(z => /^Rewrite/i.test(z)), 'eigene Rewrite-Direktiven würden die Weiterleitungen der Website in diesem Ordner abschalten');
  assert.ok(!/Content-Security-Policy/i.test(h), 'es gilt die strenge CSP der Website'); assert.ok(direktiven.filter(z => /^Header /.test(z)).every(z => /^Header always set /.test(z)));
});

test('PHP-Dateien: jede beginnt mit dem Login; keine festen Geldbeträge im Quelltext (die Preisprüfung des Deploys scannt public/)', () => {
  for (const f of ['index.php', 'daten.php']) {
    const src = fs.readFileSync(path.join(SEO, f), 'utf8'); const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.match(code, /^<\?php\s*declare\(strict_types=1\);\s*(ini_set\('display_errors', '0'\);\s*)?require __DIR__ \. '\/\.\.\/api\/analytics-lib\.php';\s*kzp_require_auth\(\);/, f + ': erst Login, dann alles andere');
  }
  for (const f of ['index.php', 'daten.php', '.htaccess']) {
    const src = fs.readFileSync(path.join(SEO, f), 'utf8');
    assert.ok(!/\d[.,]\d{2}(?!\d)/.test(src), f + ': kein Betrag mit zwei Nachkommastellen'); assert.ok(!/€|\bEuro\b|\bEUR\b/.test(src), f + ': keine Währungsangabe');
    assert.ok(!/\/(home|Users|srv|www)\//.test(src), f + ': keine festen Serverpfade');
  }
});

// ── Login ────────────────────────────────────────────────────────────────────
test('Login: ohne oder mit falschem Zugang 401, erst danach Oberfläche und Daten; fehlt die Zugangsdatei, ist alles zu (503)', { skip: ohnePhp }, async () => {
  const srv = await startePhp();
  try {
    for (const [method, pfad, qs] of [['GET', '/seo/', null], ['GET', '/seo/index.php', null], ['GET', '/seo/daten.php', 'zustand=1'], ['GET', '/seo/daten.php', 'd=issues'], ['POST', '/seo/daten.php', 'review=' + ID], ['POST', '/seo/daten.php', 'ablage=issues'], ['DELETE', '/seo/daten.php', 'd=issues']]) {
      const r = await php(srv, method, qs, { auth: null, pfad, headers: method === 'POST' ? XHR : {}, body: method === 'POST' ? '{"state":"offen"}' : null });
      assert.strictEqual(r.status, 401, `${method} ${pfad}`); assert.match(r.headers['www-authenticate'], /^Basic realm=/); assert.strictEqual(r.text, 'Login erforderlich');
      assert.strictEqual(r.headers['x-robots-tag'], 'noindex, nofollow'); assert.strictEqual(r.headers['cache-control'], 'no-store');
    }
    assert.ok(!fs.existsSync(srv.dataDir), 'ohne Login wird nicht einmal der Datenordner angelegt');
    assert.strictEqual((await php(srv, 'GET', 'zustand=1', { auth: 'Basic ' + Buffer.from(`${USER}:falsches-passwort`).toString('base64') })).status, 401);   // zählt als Fehlversuch – nur dieser eine
    assert.strictEqual((await php(srv, 'GET', 'zustand=1', { auth: 'Bearer abc' })).status, 401);

    const ui = await php(srv, 'GET', null, { pfad: '/seo/' }); assert.strictEqual(ui.status, 200); assert.match(ui.type, /^text\/html; charset=utf-8/i); assert.match(ui.text, /SEO Center – Testhülle/);
    assert.strictEqual(ui.headers['x-robots-tag'], 'noindex, nofollow'); assert.strictEqual(ui.headers['cache-control'], 'no-store');
    const z = await php(srv, 'GET', 'zustand=1'); assert.strictEqual(z.status, 200); assert.strictEqual(z.type, 'application/json; charset=utf-8'); assert.strictEqual(z.headers['x-content-type-options'], 'nosniff');
    assert.strictEqual(z.headers['x-robots-tag'], 'noindex, nofollow'); assert.strictEqual(z.headers['cache-control'], 'no-store');
    assert.deepStrictEqual(z.json, { ok: true, dateien: {}, berichte: 0, schreibbar: true, version: 1 });
    assert.strictEqual(modus(srv.dataDir), '700', 'Datenordner nur für den Server selbst');

    // Oberfläche fehlt im Stand: verständlicher Hinweis
    fs.renameSync(path.join(srv.web, 'seo', 'center.html'), path.join(srv.web, 'seo', 'center.weg'));
    const ohne = await php(srv, 'GET', null, { pfad: '/seo/' }); assert.strictEqual(ohne.status, 404); assert.match(ohne.type, /^text\/plain/); assert.match(ohne.text, /Oberfläche des SEO Centers/); assert.ok(!ohne.text.includes(srv.root));
    // Zugangsdatei fehlt (Secrets nicht gesetzt): Bereich komplett zu
    fs.renameSync(path.join(srv.web, 'api', 'analytics-zugang.php'), path.join(srv.web, 'api', 'zugang.weg'));
    for (const [pfad, qs] of [['/seo/', null], ['/seo/daten.php', 'zustand=1'], ['/seo/daten.php', 'd=issues']]) { const r = await php(srv, 'GET', qs, { pfad }); assert.strictEqual(r.status, 503, pfad); assert.ok(!r.text.includes('"ok"')); }
  } finally { srv.stop(); }
});

test('Datenordner: ohne KZP_SEO_DIR liegt er neben dem Web-Ordner (Kontowurzel/seo-daten), nie darin', { skip: ohnePhp }, async () => {
  const srv = await startePhp({ ohneDatenordnerVariable: true });
  try {
    assert.strictEqual((await php(srv, 'POST', 'ablage=gsc-status', { headers: RUN, body: '{"connected":false}' })).status, 200);
    assert.deepStrictEqual(baum(path.join(srv.root, 'konto', 'seo-daten')), ['.htaccess', 'gsc-status.json']); assert.strictEqual(modus(path.join(srv.root, 'konto', 'seo-daten')), '700');
    assert.deepStrictEqual(baum(srv.web), ['api/analytics-lib.php', 'api/analytics-zugang.php', 'seo/.htaccess', 'seo/center.html', 'seo/daten.php', 'seo/index.php'], 'im Web-Ordner entsteht nichts');
  } finally { srv.stop(); }
});

test('Datenordner: daten.php legt eine .htaccess mit „Require all denied“ hinein (zweite Sicherung), überschreibt eine vorhandene nicht und zeigt sie nirgends', { skip: ohnePhp }, async () => {
  const srv = await startePhp(); const h = path.join(srv.dataDir, '.htaccess'); const eigene = '# eigene Regeln\nRequire all denied\n';
  try {
    assert.deepStrictEqual((await php(srv, 'GET', 'zustand=1')).json, { ok: true, dateien: {}, berichte: 0, schreibbar: true, version: 1 }, 'zustand=1 kennt die Datei nicht');
    assert.deepStrictEqual(baum(srv.dataDir), ['.htaccess']); assert.match(fs.readFileSync(h, 'utf8'), /^Require all denied$/m); assert.strictEqual(modus(h), '644', 'für Apache lesbar');
    assert.strictEqual((await php(srv, 'POST', 'ablage=gsc-status', { headers: RUN, body: '{"connected":false}' })).status, 200);
    const z = (await php(srv, 'GET', 'zustand=1')).json; assert.deepStrictEqual(Object.keys(z.dateien), ['gsc-status']); assert.strictEqual(z.berichte, 0);
    // über die Schnittstelle weder abrufbar noch überschreibbar
    for (const d of ['.htaccess', 'htaccess', '%2E%2Ehtaccess']) assert.strictEqual((await php(srv, 'GET', 'd=' + d)).status, 400, d);
    assert.strictEqual((await php(srv, 'GET', 'bericht=.htaccess')).status, 400);
    for (const ziel of ['.htaccess', 'reports/.htaccess']) assert.strictEqual((await php(srv, 'POST', 'ablage=' + ziel, { headers: RUN, body: '{}' })).status, 400, ziel);
    // vorhandene Datei bleibt unverändert; fehlt sie, entsteht sie beim nächsten Aufruf neu
    fs.writeFileSync(h, eigene); assert.strictEqual((await php(srv, 'GET', 'd=gsc-status')).status, 200); assert.strictEqual(fs.readFileSync(h, 'utf8'), eigene);
    fs.unlinkSync(h); assert.strictEqual((await php(srv, 'GET', 'd=gsc-status')).status, 200); assert.match(fs.readFileSync(h, 'utf8'), /^Require all denied$/m);
    assert.deepStrictEqual(baum(srv.dataDir), ['.htaccess', 'gsc-status.json'], 'keine Zwischendateien');
  } finally { srv.stop(); }
});

// ── Login-Sperre (ein Zähler je Anschluss für /seo/ und /analytics/) ─────────
const FALSCH = 'Basic ' + Buffer.from(`${USER}:falsches-passwort`).toString('base64');
const zaehlerDatei = srv => path.join(srv.tmpDir, 'kzp-analytics-login-' + crypto.createHash('sha256').update('127.0.0.1').digest('hex') + '.txt');
const LOGIN_ZIELE = [['/seo/daten.php', 'zustand=1'], ['/seo/', null], ['/analytics/', null], ['/analytics/daten.php', 'days=30']];
const gleichzeitig = (srv, n, auth) => Promise.all(Array.from({ length: n }, (_, k) => { const [pfad, qs] = LOGIN_ZIELE[k % LOGIN_ZIELE.length]; return php(srv, 'GET', qs, { pfad, auth }); }));
const statusZahlen = rs => rs.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});

test('Login-Sperre: auch bei vielen gleichzeitigen Fehlversuchen werden je Anschluss genau 10 Passwörter geprüft, danach 429 für /seo/ und /analytics/; richtige Logins zählen nie', { skip: ohnePhp }, async () => {
  const srv = await startePhp({ workers: 16, mitAnalytics: true });
  try {
    // Analytics-Dashboard und SEO Center (Kopien): ohne Login 401, mit Login 200
    for (const [pfad, qs] of LOGIN_ZIELE) {
      const ohne = await php(srv, 'GET', qs, { pfad, auth: null }); assert.strictEqual(ohne.status, 401, pfad); assert.match(ohne.headers['www-authenticate'], /^Basic realm=/);
      const mit = await php(srv, 'GET', qs, { pfad }); assert.strictEqual(mit.status, 200, `${pfad}: ${mit.text.slice(0, 200)}`);
    }
    assert.match((await php(srv, 'GET', null, { pfad: '/analytics/' })).text, /Analytics – Testhülle/); assert.strictEqual((await php(srv, 'GET', 'days=30', { pfad: '/analytics/daten.php' })).json.ok, true);
    // Das SEO Center lädt seine Daten gleichzeitig: richtige Logins und Aufrufe ohne Zugangsdaten zählen nicht
    assert.deepStrictEqual(statusZahlen(await gleichzeitig(srv, 64, AUTH)), { 200: 64 });
    assert.deepStrictEqual(statusZahlen(await gleichzeitig(srv, 32, null)), { 401: 32 });
    assert.ok(!fs.existsSync(zaehlerDatei(srv)) || fs.readFileSync(zaehlerDatei(srv), 'utf8') === '', 'kein Fehlversuch gezählt');
    // falsches Passwort in gleichzeitigen Wellen, bis nur noch 429 kommt: geprüft werden genau 10
    let geprueft = 0, wellen = 0, letzte;
    do { letzte = statusZahlen(await gleichzeitig(srv, 48, FALSCH)); geprueft += letzte[401] || 0; wellen++; } while (letzte[401] && wellen < 8);
    assert.strictEqual(geprueft, 10, 'Anfragen mit Passwortprüfung (401): ' + geprueft); assert.deepStrictEqual(letzte, { 429: 48 });
    assert.strictEqual(fs.readFileSync(zaehlerDatei(srv), 'utf8').split(',').length, 10, 'genau 10 Zeitpunkte gespeichert'); assert.strictEqual(modus(zaehlerDatei(srv)), '600');
    // gesperrt ist der Anschluss überall – auch mit dem richtigen Passwort und ohne Login
    for (const [pfad, qs] of LOGIN_ZIELE) for (const auth of [AUTH, null]) { const r = await php(srv, 'GET', qs, { pfad, auth }); assert.strictEqual(r.status, 429, pfad); assert.match(r.text, /Zu viele Fehlversuche/); }
    // nach 15 Minuten wieder frei (Zeitpunkte künstlich gealtert)
    fs.writeFileSync(zaehlerDatei(srv), Array(10).fill(Math.floor(Date.now() / 1000) - 901).join(','));
    for (const [pfad, qs] of LOGIN_ZIELE) assert.strictEqual((await php(srv, 'GET', qs, { pfad })).status, 200, pfad);
  } finally { srv.stop(); }
});

const alsRoot = typeof process.getuid === 'function' && process.getuid() === 0;
test('Login-Sperre: lässt sich der Zähler nicht anlegen (Temp-Ordner nicht beschreibbar), wird ohne Zählung geprüft – niemand wird ausgesperrt', { skip: ohnePhp || (alsRoot && 'als root greifen die Dateirechte nicht') }, async () => {
  const srv = await startePhp({ mitAnalytics: true });
  fs.chmodSync(srv.tmpDir, 0o500);
  try {
    const falsch = await gleichzeitig(srv, 24, FALSCH); assert.deepStrictEqual(statusZahlen(falsch), { 401: 24 }); assert.ok(falsch.every(r => r.text === 'Login erforderlich'), 'keine PHP-Meldungen in der Antwort');
    for (const [pfad, qs] of LOGIN_ZIELE) assert.strictEqual((await php(srv, 'GET', qs, { pfad })).status, 200, pfad);
    assert.deepStrictEqual(fs.readdirSync(srv.tmpDir), []);
  } finally { fs.chmodSync(srv.tmpDir, 0o700); srv.stop(); }
});

// ── Gleichlauf PHP ↔ Node ────────────────────────────────────────────────────
test('Gleichlauf PHP ↔ Node: dieselben Anfragen ergeben dieselben Statuscodes, Typen, Antworten und am Ende denselben Datenstand', { skip: ohnePhp }, async () => {
  const srv = await startePhp(); const nodeDir = tmp(); const ORIGIN = 'http://127.0.0.1:' + srv.port;
  const befund = id => ({ id, rule: 'title-lang', severity: 'niedrig', status: 'offen', title: 'Titel zu lang – „Größe“', first_seen: '2026-11-20T05:40:00.000Z' });
  const ISSUES = JSON.stringify({ issues: { [ID]: befund(ID), [ID2]: befund(ID2), [ID3]: befund(ID3) }, runs: [{ runId: 'daily-1', kind: 'daily', at: '2026-11-20T05:40:00.000Z' }] }, null, 1);
  const INDEX = JSON.stringify([{ file: 'daily-2026-11-20.md', kind: 'daily', at: '2026-11-20T05:40:00.000Z', score: 91 }, { file: 'daily-2026-11-19.md', kind: 'daily', at: '2026-11-19T05:40:00.000Z', score: 90 }, { file: 'weekly-2026-11-16-weekly.md', kind: 'weekly', at: '2026-11-16T05:40:00.000Z', score: 89 }]);
  const INDEX_NEU = JSON.stringify([{ file: 'daily-2026-11-20.md', kind: 'daily', at: '2026-11-20T05:40:00.000Z', score: 91 }]);
  const riesig = Buffer.alloc(api.MAX_UPLOAD + 1, 0x20); riesig[0] = 0x5b; riesig[riesig.length - 1] = 0x5d;
  const genau = Buffer.alloc(api.MAX_UPLOAD, 0x20); genau[0] = 0x5b; genau[genau.length - 1] = 0x5d;
  const neunMb = Buffer.alloc(9 * 1024 * 1024, 0x20); neunMb[0] = 0x7b; neunMb[neunMb.length - 1] = 0x7d;
  const rv = (id, body, headers = XHR) => ['POST', 'review=' + id, { headers, body: typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body) }];
  const ab = (ziel, body, headers = RUN) => ['POST', 'ablage=' + ziel, { headers, body }];
  const get = qs => ['GET', qs, {}];

  const schritte = [
    // leerer Datenordner
    [200, ...get('zustand=1')], [404, ...get('d=issues')], [404, ...get('d=uebersicht')], [404, ...get('bericht=daily-2026-11-20.md')], [404, ...rv(ID, { state: 'offen' })],
    // Ablage: roh, gzip, Berichte, Index
    [200, ...ab('issues', gz(ISSUES), GZ)], [200, ...ab('crawl-history', '[{"at":"2026-11-20T05:40:00.000Z","score":91}]')], [200, ...ab('last-crawl', gz(JSON.stringify({ pages: { 'https://example.test/': { status: 200 } } })), GZ)],
    [200, ...ab('suggestions', '{"items":[]}', { ...RUN, 'x-body-encoding': 'identity' })], [200, ...ab('opportunities', ' \n\t{"items":[]}\n')], [200, ...ab('notifications', '[]')], [200, ...ab('gsc', '{"connected":false}')], [200, ...ab('gsc-analysis', '{"connected":false}')], [200, ...ab('gsc-status', '{"connected":false}')], [200, ...ab('uebersicht', gz('{"open":3,"text":"Ümläute"}'), GZ)],
    [200, ...ab('reports/daily-2026-11-20.md', gz('# Tagesbericht 20.\n\nÄÖÜ – „ok“'), GZ)], [200, ...ab('reports/daily-2026-11-20.json', '{"kind":"daily","score":91}')], [200, ...ab('reports/daily-2026-11-19.md', '# Tagesbericht 19.')], [200, ...ab('reports/daily-2026-11-19.json', '{"kind":"daily","score":90}')],
    [200, ...ab('reports/weekly-2026-11-16-weekly.md', '# Wochenbericht')], [200, ...ab('reports/monthly-2026-11-01-monthly.md', '# Monatsbericht, nicht im Index')], [200, ...ab('reports/latest-daily.md', '# Tagesbericht 20.')], [200, ...ab('reports/latest-daily.json', '{"kind":"daily","score":91}')],
    [200, ...ab('reports', gz(INDEX), GZ)],   // räumt den Monatsbericht ab
    // Abruf jedes Namens
    ...Object.keys(api.FILES).map(n => [api.NO_UPLOAD.includes(n) ? 404 : 200, ...get('d=' + n)]),
    [200, ...get('d=iss%75es')], [200, ...get('%64=issues')], [200, ...get('bericht=daily-2026-11-20.md')], [200, ...get('bericht=daily-2026-11-20.json')], [200, ...get('bericht=latest-daily.md')], [404, ...get('bericht=monthly-2026-11-01-monthly.md')], [200, ...get('zustand=1')],
    // ungültige Namen und Parameter
    ...['', 'issues.json', '..%2Fissues', '%2Fetc%2Fpasswd', 'page-cache', 'reports%2Findex.json', 'ISSUES', 'issues+', 'issues%00', 'issues%0A', '%zz', '__proto__'].map(d => [400, ...get('d=' + d)]),
    ...['', '&&', 'd', '=issues', 'x=1', 'D=issues', 'd[]=issues', 'd%5B%5D=issues', 'd=issues&d=review', 'd=issues&x=1', 'd=issues&', 'zustand=1&_=1', 'd=issues;x=1', 'report=daily-2026-11-20.md', 'status=alle'].map(qs => [qs === 'd=issues&' ? 200 : 400, ...get(qs)]),
    ...['', 'index.json', '..%2Fissues.json', 'daily-2026-11-20.md%2F..%2F..%2Fissues.json', 'reports%2Fdaily-2026-11-20.md', '%2Fetc%2Fpasswd', 'daily-2026-11-20.md%0A', 'daily-2026-11-20.txt', 'daily-2026-11-20', 'yearly-2026.md', 'daily-a%20b.md', 'daily-%C3%A4.md', '..%5Cissues.json', 'daily-x.md%00.json', 'DAILY-2026-11-20.md'].map(b => [400, ...get('bericht=' + b)]),
    ...['', '0', '2', 'true', '1+'].map(w => [400, ...get('zustand=' + w)]),
    // Methoden
    [405, 'PUT', 'd=issues', { headers: XHR, body: '{}' }], [405, 'DELETE', 'd=issues', { headers: XHR }], [405, 'PATCH', 'review=' + ID, { headers: XHR, body: '{}' }], [405, 'OPTIONS', 'd=issues', {}],
    [405, 'POST', 'd=issues', { headers: XHR, body: '{}' }], [405, 'POST', 'zustand=1', { headers: XHR, body: '{}' }], [405, 'POST', 'bericht=daily-2026-11-20.md', { headers: XHR, body: '{}' }], [405, ...get('review=' + ID)], [405, ...get('ablage=issues')],
    // Schutz vor fremd ausgelösten Anfragen
    [403, ...rv(ID, { state: 'offen' }, { 'content-type': 'application/json' })], [403, ...rv(ID, { state: 'offen' }, { ...XHR, 'x-requested-with': 'fetch' })], [403, ...rv(ID, { state: 'offen' }, { ...XHR, origin: 'https://boese.example' })], [403, ...rv(ID, { state: 'offen' }, { ...XHR, origin: 'null' })],
    [403, ...rv(ID, { state: 'offen' }, { ...XHR, origin: ORIGIN + '.boese.example' })], [403, ...rv(ID, { state: 'offen' }, { ...XHR, origin: 'http://nutzer@127.0.0.1:' + srv.port })], [403, ...ab('issues', '{}', { 'content-type': 'application/octet-stream' })], [403, 'POST', 'unbekannt=1', { headers: {}, body: '{}' }],
    [400, ...rv(ID, 'state=offen', { 'x-requested-with': 'XMLHttpRequest', 'content-type': 'application/x-www-form-urlencoded' })], [400, ...ab('issues', '{}', { ...RUN, 'content-type': 'multipart/form-data; boundary=x' })],
    // Bearbeitungsstand
    [200, ...rv(ID, { state: 'in_pruefung', note: 'schaue ich an – „Größe“' }, { ...XHR, origin: ORIGIN })], [200, ...rv(ID, { state: 'lokal_behoben' })], [200, ...rv(ID2, { state: 'freigegeben', note: null }, { ...XHR, origin: ORIGIN.toUpperCase().replace('HTTP', 'http') })],
    [200, ...rv(ID3, { state: 'offen', note: 'ID nur aus Ziffern' })], [200, ...rv(ID, { state: 'offen', note: 'ä'.repeat(500) })], [200, ...rv(ID, { state: 'offen', note: '🚗'.repeat(500) })], [200, ...rv(ID, { state: 'in_pruefung', note: 'Zeile 1\nZeile 2\t<b>kein HTML</b>', mehr: 'wird ignoriert' }, RUN)],
    [404, ...rv(FREMD, { state: 'offen' })], [400, ...rv('ABCDEF123456', { state: 'offen' })], [400, ...rv('abc', { state: 'offen' })], [400, ...rv('..%2Freview', { state: 'offen' })], [400, ...rv(ID + '%0A', { state: 'offen' })], [400, ...rv('', { state: 'offen' })],
    [400, ...rv(ID, { state: 'geloescht' })], [400, ...rv(ID, {})], [400, ...rv(ID, { state: 1 })], [400, ...rv(ID, { state: ['offen'] })], [400, ...rv(ID, { state: null })], [400, ...rv(ID, { state: 'offen', note: 5 })], [400, ...rv(ID, { state: 'offen', note: { a: 1 } })], [400, ...rv(ID, { state: 'offen', note: 'x'.repeat(501) })],
    [400, ...rv(ID, '{"state":"offen"')], [400, ...rv(ID, '')], [400, ...rv(ID, '[]')], [400, ...rv(ID, '"offen"')], [400, ...rv(ID, 'null')], [400, ...rv(ID, Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d]))], [413, ...rv(ID, '{"state":"offen"}' + ' '.repeat(64 * 1024))],
    [200, ...get('d=review')],
    // Ablage: Ziele
    [403, ...ab('review', '{}')], [403, ...ab('local-check', '{}')],
    ...['', 'page-cache', 'page-cache.json', 'issues.json', '..%2Fissues', 'reports%2F', 'reports/', 'reports/index.json', 'reports/..%2Fissues.json', 'reports/../issues.json', 'reports/sub/daily-x.md', 'reports/notiz.md', 'reports/daily-x.txt', 'reports/daily-x.md%0A', 'reports%5Cdaily-x.md', 'REPORTS/daily-x.md', '%2Fetc%2Fpasswd', 'previews/x.json'].map(z => [400, ...ab(z, '{"a":1}')]),
    // Ablage: Inhalte
    ...['{"a":', 'kein json', '"text"', '123', 'null', 'true', '\uFEFF{"a":1}', '{"a":1}{"b":2}', '{"a":1,}', "{'a':1}", ''].flatMap(inhalt => [[400, ...ab('issues', inhalt)], ...(inhalt ? [[400, ...ab('issues', gz(inhalt), GZ)]] : [])]),
    [400, ...ab('issues', Buffer.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d]))], [400, ...ab('reports/daily-x.md', Buffer.from([0x23, 0x20, 0xff, 0xfe]))], [400, ...ab('issues', '{"a":1}', GZ)], [400, ...ab('issues', gz(ISSUES).subarray(0, 20), GZ)], [400, ...ab('issues', '', GZ)], [400, ...ab('issues', ISSUES, { ...RUN, 'x-body-encoding': 'br' })],
    [413, ...ab('issues', riesig)], [413, ...ab('issues', gz(riesig), GZ)], [200, ...ab('suggestions', gz(genau), GZ)], [200, ...ab('opportunities', neunMb)], [200, ...ab('suggestions', '{"items":[]}')], [200, ...ab('opportunities', '{"items":[]}')],
    // Berichtsindex: ungültig → nichts passiert; gültig → aufgeräumt
    ...['{}', '{"file":"daily-2026-11-20.md"}', '[1]', '[null]', '[{"kind":"daily"}]', '[{"file":"../issues.json"}]', '[{"file":"latest-daily.md"}]', '[{"file":"daily-2026-11-20.json"}]', '[{"file":"daily-2026-11-20.md"},{"file":7}]', '[[]]'].map(i => [400, ...ab('reports', i)]),
    [200, ...get('zustand=1')], [200, ...ab('reports', INDEX_NEU)], [200, ...get('d=reports')], [404, ...get('bericht=daily-2026-11-19.md')], [200, ...get('bericht=daily-2026-11-20.md')], [200, ...get('bericht=latest-daily.json')], [200, ...get('d=issues')], [200, ...get('zustand=1')],
  ];

  try {
    // Dateien, die es geben kann, die aber nie ausgeliefert werden dürfen – auf beiden Seiten gleich
    await php(srv, 'GET', 'zustand=1');
    for (const d of [srv.dataDir, nodeDir]) { fs.writeFileSync(path.join(d, 'page-cache.json'), '{"geheim":1}'); fs.writeFileSync(path.join(d, 'geheim.md'), 'geheim'); }
    let nr = 0; const texte = [];
    for (const [erwartet, method, qs, opts] of schritte) {
      nr++; const was = `#${nr} ${method} ?${qs.length > 90 ? qs.slice(0, 90) + '…' : qs}`;
      const p = await php(srv, method, qs, opts); const n = node(nodeDir, srv.port, method, qs, opts); texte.push(p.text.length < 4096 ? p.text : '');
      assert.strictEqual(p.status, erwartet, `${was}: PHP ${p.text.slice(0, 200)}`); assert.strictEqual(n.status, erwartet, `${was}: Node ${n.text.slice(0, 200)}`);
      assert.strictEqual(p.type, n.type, was + ': Content-Type'); assert.strictEqual(p.headers.allow, n.headers.allow, was + ': Allow');
      if (n.json !== undefined) assert.deepStrictEqual(ohneZeit(p.json), ohneZeit(n.json), was + ': Antwort'); else assert.ok(p.buf.equals(n.buf), was + ': Inhalt');
      if (erwartet >= 400) { assert.strictEqual(p.json.ok, false, was); assert.ok(p.json.fehlt === true || (typeof p.json.error === 'string' && p.json.error), was + ': Fehlertext oder fehlt'); }
      assert.strictEqual(p.headers['cache-control'], 'no-store', was); assert.strictEqual(p.headers['x-robots-tag'], 'noindex, nofollow', was);
    }
    const alles = texte.join('\n');
    assert.ok(!alles.includes(srv.root) && !alles.includes('seo-daten') && !/Warning|Notice|Deprecated|Fatal|Stack trace|\.php/.test(alles), 'weder Serverpfade noch PHP-Meldungen in den Antworten');
    assert.ok(!alles.includes('"geheim"'), 'Seitencache wird nie ausgeliefert');

    // Zeitformate
    const z = (await php(srv, 'GET', 'zustand=1')).json; assert.match(z.dateien.issues.geaendert, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/); assert.strictEqual(z.dateien.issues.bytes, Buffer.byteLength(ISSUES)); assert.strictEqual(z.berichte, 1);
    const stand = (await php(srv, 'GET', 'd=review')).json; assert.deepStrictEqual(Object.keys(stand).sort(), [ID, ID2, ID3].sort()); assert.match(stand[ID].at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    assert.strictEqual(stand[ID].history.length, 5); assert.strictEqual(stand[ID].note, 'Zeile 1\nZeile 2\t<b>kein HTML</b>'); assert.strictEqual(stand[ID2].note, ''); assert.strictEqual(stand[ID3].note, 'ID nur aus Ziffern');
    assert.ok(Math.abs(Date.parse(stand[ID].at) - Date.now()) < 60000, 'Zeit in UTC');

    // Gleicher Datenstand auf beiden Seiten (PHP zusätzlich mit Sperrdatei und .htaccess als zweiter Sicherung)
    const phpBaum = baum(srv.dataDir).filter(f => f !== '.review.sperre' && f !== '.htaccess'); assert.deepStrictEqual(phpBaum, baum(nodeDir));
    assert.deepStrictEqual(phpBaum, ['crawl-history.json', 'geheim.md', 'gsc-analysis.json', 'gsc-status.json', 'gsc.json', 'issues.json', 'last-crawl.json', 'notifications.json', 'opportunities.json', 'page-cache.json', 'reports/daily-2026-11-20.json', 'reports/daily-2026-11-20.md', 'reports/index.json', 'reports/latest-daily.json', 'reports/latest-daily.md', 'review.json', 'suggestions.json', 'uebersicht.json']);
    for (const f of phpBaum) {
      const a = fs.readFileSync(path.join(srv.dataDir, f)), b = fs.readFileSync(path.join(nodeDir, f));
      if (f === 'review.json') assert.deepStrictEqual(ohneZeit(JSON.parse(a)), ohneZeit(JSON.parse(b)), f); else assert.ok(a.equals(b), f + ' identisch');
    }
    // PHP legt Ordner und Dateien nur für sich selbst lesbar an
    assert.strictEqual(modus(path.join(srv.dataDir, 'reports')), '700'); for (const f of ['issues.json', 'review.json', 'reports/index.json', 'reports/daily-2026-11-20.md', '.review.sperre']) assert.strictEqual(modus(path.join(srv.dataDir, f)), '600', f);
    // HEAD: ohne Inhalt, aber derselbe Status
    assert.strictEqual((await php(srv, 'HEAD', 'zustand=1')).status, 405); assert.strictEqual(node(nodeDir, srv.port, 'HEAD', 'zustand=1').status, 405);
  } finally { srv.stop(); }
});

test('PHP: große Dateien werden unverändert und auf Wunsch komprimiert ausgeliefert; gleichzeitiges Speichern verliert nichts', { skip: ohnePhp }, async () => {
  const srv = await startePhp();
  try {
    // rund 5 MB wie ein last-crawl einer großen Website: muss durchgereicht, nicht dekodiert werden
    const gross = JSON.stringify({ pages: Object.fromEntries(Array.from({ length: 30000 }, (_, i) => [`https://example.test/seite-${i}/`, { status: 200, title: 'Seite ' + i + ' – Zulassungsstelle', typ: 'behoerde', indexable: i % 2 === 0, contentHash: 'abcdef0123456789abcdef0123456789abcdef01' }])) }, null, 1);
    assert.ok(gross.length > 5 * 1024 * 1024);
    const up = await php(srv, 'POST', 'ablage=last-crawl', { headers: GZ, body: gz(gross) }); assert.deepStrictEqual(up.json, { ok: true, bytes: Buffer.byteLength(gross) });
    const roh = await php(srv, 'GET', 'd=last-crawl'); assert.strictEqual(roh.status, 200); assert.strictEqual(roh.headers['content-encoding'], undefined); assert.ok(roh.buf.equals(Buffer.from(gross)), 'unkomprimiert identisch');
    const komp = await php(srv, 'GET', 'd=last-crawl', { headers: { 'accept-encoding': 'gzip, deflate, br' } }); assert.strictEqual(komp.status, 200); assert.strictEqual(komp.headers['content-encoding'], 'gzip'); assert.match(komp.headers.vary || '', /Accept-Encoding/i);
    assert.ok(komp.buf.length < gross.length / 8, 'deutlich kleiner auf der Leitung'); assert.ok(zlib.gunzipSync(komp.buf).equals(Buffer.from(gross)), 'entpackt identisch');
    // kleine Antworten bleiben unkomprimiert
    await php(srv, 'POST', 'ablage=gsc-status', { headers: RUN, body: '{"connected":false}' }); assert.strictEqual((await php(srv, 'GET', 'd=gsc-status', { headers: { 'accept-encoding': 'gzip' } })).headers['content-encoding'], undefined);

    // 40 Befunde, je ein Speichern gleichzeitig (vier PHP-Prozesse), dazu 12-mal derselbe Befund
    const ids = Array.from({ length: 40 }, (_, i) => 'ab' + String(i).padStart(10, '0')); assert.strictEqual(new Set(ids).size, 40);
    await php(srv, 'POST', 'ablage=issues', { headers: RUN, body: JSON.stringify({ issues: Object.fromEntries(ids.map(id => [id, { id }])), runs: [{}] }) });
    const antworten = await Promise.all([...ids.map(id => php(srv, 'POST', 'review=' + id, { headers: XHR, body: JSON.stringify({ state: 'in_pruefung', note: 'n-' + id }) })), ...Array.from({ length: 12 }, (_, k) => php(srv, 'POST', 'review=' + ids[0], { headers: XHR, body: JSON.stringify({ state: 'offen', note: 'k' + k }) }))]);
    assert.ok(antworten.every(r => r.status === 200), 'alle gespeichert: ' + antworten.map(r => r.status).join(','));
    const stand = JSON.parse(fs.readFileSync(path.join(srv.dataDir, 'review.json'), 'utf8'));
    assert.strictEqual(Object.keys(stand).length, 40, 'kein Eintrag ging verloren'); assert.strictEqual(stand[ids[0]].history.length, 13); for (const id of ids.slice(1)) assert.strictEqual(stand[id].note, 'n-' + id);
    assert.ok(!baum(srv.dataDir).some(f => /\.neu-/.test(f)), 'keine Zwischendateien übrig');
  } finally { srv.stop(); }
});

// ── bin/sync.js gegen PHP ────────────────────────────────────────────────────
test('sync.js gegen PHP: Erstlauf, push, Bearbeitungsstand im Center, pull in einen frischen Ordner, falsches Passwort', { skip: ohnePhp }, async () => {
  const srv = await startePhp(); const W = (dir, name, daten) => { const f = path.join(dir, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof daten === 'string' ? daten : JSON.stringify(daten, null, 1)); };
  const lauf = async (befehl, dataDir, over = {}) => { const zeilen = []; const code = await sync.main([befehl], { dataDir, center: { url: srv.url, user: USER, password: PASS, ...over } }, { log: z => zeilen.push(String(z)), pauseMs: 0, abstandMs: 0 }); return { code, log: zeilen.join('\n') }; };
  const sauber = log => { for (const g of [PASS, AUTH, 'Basic ', 'GEHEIMER-INHALT']) assert.ok(!log.includes(g), 'nicht in der Ausgabe: ' + g); };
  try {
    const erst = tmp(); const e = await lauf('pull', erst); assert.strictEqual(e.code, 0, e.log); assert.match(e.log, /Erstlauf/); assert.deepStrictEqual(baum(erst), []); sauber(e.log);

    const dir = tmp(); const gestern = vor(1); const tag = gestern.slice(0, 10);
    W(dir, 'issues.json', { issues: { [ID]: { id: ID, rule: 'title-lang', severity: 'niedrig', status: 'offen', title: 'GEHEIMER-INHALT' } }, runs: [{ runId: 'daily-1', kind: 'daily', at: gestern, open: 1 }] });
    W(dir, 'last-crawl.json', { at: gestern, pages: Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`https://example.test/s-${i}/`, { status: 200, indexable: true }])) });
    W(dir, 'crawl-history.json', [{ at: gestern, kind: 'daily', crawled: 500, score: 93 }]); W(dir, 'suggestions.json', { items: [] }); W(dir, 'opportunities.json', { items: [] }); W(dir, 'notifications.json', []); W(dir, 'gsc-status.json', { connected: false }); W(dir, 'uebersicht.json', { open: 1 });
    W(dir, `reports/daily-${tag}.md`, '# Tagesbericht – ÄÖÜ'); W(dir, `reports/daily-${tag}.json`, { kind: 'daily', generatedAt: gestern, score: 93, open: 1 }); W(dir, 'reports/latest-daily.md', '# Tagesbericht'); W(dir, 'reports/latest-daily.json', { kind: 'daily', generatedAt: gestern, score: 93 });
    W(dir, 'review.json', { [ID]: { state: 'freigegeben', note: 'lokaler Altstand', at: 'x', history: [] } }); W(dir, 'local-check.json', { at: 'x' }); W(dir, 'page-cache.json', { riesig: true });
    // alter Bericht auf dem Server, der in keinem Index steht
    W(srv.dataDir, 'reports/daily-verwaist.md', '# alt');

    const hoch = await lauf('push', dir); assert.strictEqual(hoch.code, 0, hoch.log); sauber(hoch.log); assert.match(hoch.log, /push fertig: 13 Dateien abgelegt/); assert.match(hoch.log, /reports\/index\.json\s+\d+ Bytes {2}ok \(1 alte Berichtsdateien entfernt\)/);
    const erwartet = ['crawl-history.json', 'gsc-status.json', 'issues.json', 'last-crawl.json', 'notifications.json', 'opportunities.json', `reports/daily-${tag}.json`, `reports/daily-${tag}.md`, 'reports/index.json', 'reports/latest-daily.json', 'reports/latest-daily.md', 'suggestions.json', 'uebersicht.json'];
    assert.deepStrictEqual(baum(srv.dataDir).filter(f => f !== '.htaccess'), erwartet); for (const f of erwartet) assert.ok(fs.readFileSync(path.join(dir, f)).equals(fs.readFileSync(path.join(srv.dataDir, f))), f + ' identisch');

    // Im Browser wird ein Bearbeitungsstand gespeichert
    const rv = await php(srv, 'POST', 'review=' + ID, { headers: { ...XHR, origin: 'http://127.0.0.1:' + srv.port }, body: '{"state":"in_pruefung","note":"vom Center"}' }); assert.strictEqual(rv.status, 200);
    const neu = tmp(); const runter = await lauf('pull', neu); assert.strictEqual(runter.code, 0, runter.log); sauber(runter.log);
    assert.deepStrictEqual(baum(neu), ['crawl-history.json', 'gsc-status.json', 'issues.json', 'last-crawl.json', 'notifications.json', 'opportunities.json', 'reports/index.json', 'review.json', 'suggestions.json']);
    for (const f of baum(neu)) assert.ok(fs.readFileSync(path.join(neu, f)).equals(fs.readFileSync(path.join(srv.dataDir, f))), f + ' identisch');
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(neu, 'review.json'), 'utf8'))[ID].note, 'vom Center');
    // zweiter push: der Stand des Centers bleibt
    assert.strictEqual((await lauf('push', dir)).code, 0); assert.strictEqual(JSON.parse(fs.readFileSync(path.join(srv.dataDir, 'review.json'), 'utf8'))[ID].note, 'vom Center');
    const st = await lauf('status', dir); assert.strictEqual(st.code, 0, st.log); assert.match(st.log, /beschreibbar · 1 Berichte · Vertrag v1/); sauber(st.log);

    const vorher = baum(neu); const falsch = await lauf('pull', neu, { password: 'falsches-passwort-99' });   // zählt als Fehlversuch – nur dieser eine
    assert.strictEqual(falsch.code, 1); assert.match(falsch.log, /Anmeldung abgelehnt \(HTTP 401\)/); assert.ok(!falsch.log.includes('falsches-passwort-99')); assert.deepStrictEqual(baum(neu), vorher);
    // Zugangsdatei fehlt auf dem Server → 503 → kein Lauf mit leerem Stand
    fs.renameSync(path.join(srv.web, 'api', 'analytics-zugang.php'), path.join(srv.web, 'api', 'zugang.weg'));
    const zu = await lauf('pull', tmp()); assert.strictEqual(zu.code, 1); assert.match(zu.log, /nicht eingerichtet oder nicht verfügbar \(HTTP 503\)/);
  } finally { srv.stop(); }
});
