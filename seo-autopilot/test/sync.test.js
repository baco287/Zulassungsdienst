'use strict';
// Abgleich Prüflauf ↔ SEO Center (bin/sync.js) gegen lokale Server in Temp-Ordnern:
// einmal gegen server.js (lib/api.js, ohne Login), sonst gegen eine kleine Hülle mit Login,
// die auch Störungen nachstellt (401, 503, Weiterleitung, Zeitüberschreitung …). Kein Netz nach außen.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync } = require('child_process');

const api = require('../lib/api');
const sync = require('../bin/sync');
const server = require('../server');

// Temp-Ordner dieses Testlaufs; werden am Ende wieder entfernt (einige Tests schreiben Dateien von 16 MB).
const tmpOrdner = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-sync-')); tmpOrdner.push(d); return d; };
test.after(() => { for (const d of tmpOrdner) fs.rmSync(d, { recursive: true, force: true }); });
const USER = 'seo-test', PASS = 'nur-im-test-4711';
const TOKEN = Buffer.from(`${USER}:${PASS}`).toString('base64');
const ID = 'abcdef123456';
const MARKE = 'INHALT-DARF-NICHT-INS-LOG';
// Datumsangaben relativ zu heute: Der Berichtsindex verwirft Berichte nach 180 Tagen.
const vor = tage => new Date(Date.now() - tage * 86400e3).toISOString();
const GESTERN = vor(1), TAG = GESTERN.slice(0, 10);
const W = (dir, name, daten) => { const f = path.join(dir, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof daten === 'string' ? daten : JSON.stringify(daten, null, 1)); };
const baum = dir => { const out = []; const lauf = (d, pre) => { for (const f of fs.readdirSync(d).sort()) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) lauf(p, pre + f + '/'); else out.push(pre + f); } }; if (fs.existsSync(dir)) lauf(dir, ''); return out; };
const gleich = (a, b, name) => assert.ok(fs.readFileSync(path.join(a, name)).equals(fs.readFileSync(path.join(b, name))), name + ' identisch');

/** Datenordner, wie er nach einem Prüflauf aussieht. */
function lokal() {
  const dir = tmp();
  W(dir, 'issues.json', { issues: { [ID]: { id: ID, rule: 'title-lang', severity: 'niedrig', status: 'offen', title: MARKE } }, runs: [{ runId: 'daily-1', kind: 'daily', at: GESTERN, open: 1 }] });
  W(dir, 'last-crawl.json', { at: GESTERN, pages: Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`https://example.test/seite-${i}/`, { status: 200, typ: 'sonst', indexable: true, titel: MARKE }])) });
  W(dir, 'crawl-history.json', [{ at: GESTERN, kind: 'daily', crawled: 300, score: 90 }]);
  W(dir, 'suggestions.json', { at: 'x', items: [] }); W(dir, 'opportunities.json', { at: 'x', items: [] }); W(dir, 'notifications.json', []);
  W(dir, 'gsc-status.json', { connected: false }); W(dir, 'uebersicht.json', { erzeugt: 'x', open: 1 });
  W(dir, `reports/daily-${TAG}.md`, '# Tagesbericht ' + MARKE); W(dir, `reports/daily-${TAG}.json`, { kind: 'daily', generatedAt: GESTERN, score: 90, open: 1 });
  W(dir, 'reports/latest-daily.md', '# Tagesbericht'); W(dir, 'reports/latest-daily.json', { kind: 'daily', generatedAt: GESTERN, score: 90 });
  // bleibt immer lokal bzw. gehört dem SEO Center:
  W(dir, 'review.json', { [ID]: { state: 'freigegeben', note: 'lokaler Altstand', at: 'x', history: [] } }); W(dir, 'local-check.json', { at: 'x' });
  W(dir, 'page-cache.json', { riesig: true }); W(dir, 'run-daily-1.log', 'log'); W(dir, 'reports/notiz.txt', 'privat'); W(dir, 'previews/mail.html', '<p>x</p>');
  return dir;
}

/**
 * Server mit Login wie auf der Website. stoer(req, nr) darf eine Antwort vorgeben ({status, body, type, headers} oder
 * 'haengen'); sonst antwortet lib/api.js aus dem Ordner dir. anfragen protokolliert Methode, Abfrage und Kopfzeilen.
 */
async function mitLogin(dir, stoer = () => null) {
  const daten = api.create(dir); const anfragen = [];
  const s = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const teile = [];
    req.on('data', c => teile.push(c));
    req.on('end', () => {
      anfragen.push({ method: req.method, query: u.search.slice(1), pfad: u.pathname, headers: req.headers, bytes: Buffer.concat(teile).length });
      const vorgabe = stoer({ method: req.method, query: u.search.slice(1) }, anfragen.length);
      if (vorgabe === 'haengen') return;   // antwortet nie
      if (vorgabe) { res.writeHead(vorgabe.status, { 'content-type': vorgabe.type || 'text/plain; charset=utf-8', ...vorgabe.headers }); return res.end(vorgabe.body || ''); }
      if (req.headers.authorization !== 'Basic ' + TOKEN) { res.writeHead(401, { 'content-type': 'text/plain; charset=utf-8', 'www-authenticate': 'Basic realm="Test"' }); return res.end('Login erforderlich'); }
      const r = daten.handle(req.method, u.searchParams, req.headers, Buffer.concat(teile));
      res.writeHead(r.code, { 'content-type': r.type, ...r.headers }); res.end(r.body);
    });
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${s.address().port}/seo/`, anfragen, stop: () => new Promise(r => { s.closeAllConnections(); s.close(r); }) };
}

/** sync.js wie von der Kommandozeile, aber im selben Prozess: Rückgabewert und Ausgabe. */
async function lauf(befehl, url, dataDir, over = {}) {
  const zeilen = []; const { user = USER, password = PASS, ...rest } = over;
  const code = await sync.main([befehl], { dataDir, center: { url, user, password } }, { log: z => zeilen.push(String(z)), pauseMs: 0, abstandMs: 0, ...rest });
  return { code, log: zeilen.join('\n'), zeilen };
}
const sauber = log => { for (const geheim of [PASS, TOKEN, 'Basic ', 'authorization', MARKE]) assert.ok(!log.includes(geheim), 'nicht in der Ausgabe: ' + geheim); };

test('Erstlauf: leeres SEO Center → pull meldet Erstlauf, Rückgabe 0, lokal entsteht nichts', async () => {
  const srvDir = tmp(); const s = await mitLogin(srvDir); const dir = tmp();
  try {
    const r = await lauf('pull', s.url, dir);
    assert.strictEqual(r.code, 0, r.log); assert.match(r.log, /Erstlauf/); assert.match(r.log, /issues\.json\s+–\s+noch nicht vorhanden/); assert.deepStrictEqual(baum(dir), []); sauber(r.log);
    assert.strictEqual(s.anfragen[0].query, 'zustand=1', 'zuerst die Erreichbarkeit');
    assert.deepStrictEqual(s.anfragen.slice(1).map(a => a.query), api.SYNC.runter.map(n => 'd=' + n)); assert.ok(s.anfragen.every(a => a.method === 'GET' && a.pfad === '/seo/daten.php'));
  } finally { await s.stop(); }
});

test('push und pull gegen server.js (lib/api.js): Stand kommt vollständig und unverändert an', async () => {
  const srvDir = tmp(); const s = await server.start(0, { dataDir: srvDir }); const url = `http://127.0.0.1:${s.address().port}/seo/`;
  try {
    const dir = lokal();
    const hoch = await lauf('push', url, dir); assert.strictEqual(hoch.code, 0, hoch.log); sauber(hoch.log);
    const erwartet = ['crawl-history.json', 'gsc-status.json', 'issues.json', 'last-crawl.json', 'notifications.json', 'opportunities.json', `reports/daily-${TAG}.json`, `reports/daily-${TAG}.md`, 'reports/index.json', 'reports/latest-daily.json', 'reports/latest-daily.md', 'suggestions.json', 'uebersicht.json'];
    assert.deepStrictEqual(baum(srvDir), erwartet, 'nicht hochgeladen: review, local-check, page-cache, Logs, Vorschauen, fremde Dateien');
    for (const f of erwartet) gleich(dir, srvDir, f);
    const pushZeilen = hoch.zeilen.filter(z => z.startsWith('push  ')); assert.strictEqual(pushZeilen.length, erwartet.length);
    assert.ok(pushZeilen.every(z => /^push {2}\S+\s+\d+ Bytes {2}ok/.test(z)), 'je Datei: Name, Bytes, Status'); assert.match(pushZeilen[0], /issues\.json/); assert.match(pushZeilen[pushZeilen.length - 1], /reports\/index\.json/, 'Index zuletzt');
    assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(srvDir, 'reports', 'index.json'), 'utf8')).map(e => e.file), [`daily-${TAG}.md`]);

    // Das SEO Center speichert inzwischen einen Bearbeitungsstand …
    const rv = api.create(srvDir).handle('POST', new URLSearchParams('review=' + ID), { 'x-requested-with': 'XMLHttpRequest' }, Buffer.from('{"state":"in_pruefung","note":"vom Center"}')); assert.strictEqual(rv.code, 200);
    // … und der nächste Lauf beginnt in einem leeren Ordner
    const neu = tmp(); const runter = await lauf('pull', url, neu); assert.strictEqual(runter.code, 0, runter.log); sauber(runter.log);
    assert.deepStrictEqual(baum(neu), ['crawl-history.json', 'gsc-status.json', 'issues.json', 'last-crawl.json', 'notifications.json', 'opportunities.json', 'reports/index.json', 'review.json', 'suggestions.json'], 'ohne Übersicht und ohne Berichte – die gehen nur hoch');
    for (const f of baum(neu)) gleich(neu, srvDir, f);
    assert.match(runter.log, /gsc\.json\s+–\s+noch nicht vorhanden/); assert.match(runter.log, /pull fertig: 9 Dateien geholt, 2 noch nicht vorhanden/); assert.ok(!/Erstlauf/.test(runter.log));
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(neu, 'review.json'), 'utf8'))[ID].note, 'vom Center');

    // review.json gehört dem SEO Center: ein push mit lokalem Altstand ändert daran nichts
    const nochmal = await lauf('push', url, dir); assert.strictEqual(nochmal.code, 0, nochmal.log);
    assert.strictEqual(JSON.parse(fs.readFileSync(path.join(srvDir, 'review.json'), 'utf8'))[ID].note, 'vom Center');
    const st = await lauf('status', url, dir); assert.strictEqual(st.code, 0, st.log); assert.match(st.log, /beschreibbar · 1 Berichte · Vertrag v1/); assert.match(st.log, /issues\.json\s+Server:\s+\d+ Bytes/); assert.match(st.log, /gsc\.json\s+Server:\s+fehlt\s+lokal: fehlt/); sauber(st.log);
  } finally { await new Promise(r => s.close(r)); }
});

test('push überträgt gzip mit Runner-Kennung und Login; pull überschreibt lokale Dateien atomar', async () => {
  const srvDir = tmp(); const s = await mitLogin(srvDir); const dir = lokal();
  try {
    assert.strictEqual((await lauf('push', s.url, dir)).code, 0);
    const posts = s.anfragen.filter(a => a.method === 'POST'); assert.strictEqual(posts.length, 13);
    for (const a of posts) { assert.strictEqual(a.headers['x-body-encoding'], 'gzip'); assert.strictEqual(a.headers['x-requested-with'], 'SEO-Autopilot'); assert.strictEqual(a.headers.authorization, 'Basic ' + TOKEN); assert.match(a.query, /^ablage=[A-Za-z0-9._/-]+$/); }
    const crawl = posts.find(a => a.query === 'ablage=last-crawl'); assert.ok(crawl.bytes < fs.statSync(path.join(dir, 'last-crawl.json')).size / 4, 'deutlich kleiner als die Datei');
    assert.ok(!s.anfragen.some(a => /review|local-check|page-cache/.test(a.query)), 'review, local-check und page-cache werden nie angefasst');
    // Server-Stand ändert sich, lokal liegt Altes: pull ersetzt es vollständig
    W(srvDir, 'issues.json', { issues: {}, runs: [{ runId: 'daily-2' }] }); W(dir, 'gsc.json', { lokal: 'bleibt, solange der Server nichts hat' });
    assert.strictEqual((await lauf('pull', s.url, dir)).code, 0); gleich(dir, srvDir, 'issues.json'); assert.ok(fs.existsSync(path.join(dir, 'gsc.json')));
    assert.ok(!baum(dir).some(f => /\.neu-/.test(f)), 'keine Zwischendateien übrig');
  } finally { await s.stop(); }
});

test('Schutz: push verweigert ohne oder mit leerer issues.json – der Server wird gar nicht erst angesprochen', async () => {
  const srvDir = tmp(); W(srvDir, 'issues.json', { issues: { [ID]: {} }, runs: [{}] }); const vorher = fs.readFileSync(path.join(srvDir, 'issues.json'), 'utf8'); const s = await mitLogin(srvDir);
  try {
    for (const [name, inhalt] of [['fehlt', null], ['0 Bytes', ''], ['kein JSON', '{"issues":'], ['ohne Läufe', '{"issues":{},"runs":[]}'], ['Liste', '[]'], ['ohne issues', '{"runs":[{}]}']]) {
      const dir = tmp(); W(dir, 'crawl-history.json', []); W(dir, 'uebersicht.json', {}); if (inhalt !== null) W(dir, 'issues.json', inhalt);
      const r = await lauf('push', s.url, dir); assert.strictEqual(r.code, 1, name); assert.match(r.log, /push verweigert: issues\.json fehlt oder ist leer/, name);
    }
    assert.strictEqual(s.anfragen.length, 0); assert.strictEqual(fs.readFileSync(path.join(srvDir, 'issues.json'), 'utf8'), vorher); assert.deepStrictEqual(baum(srvDir), ['issues.json']);
  } finally { await s.stop(); }
});

test('Berichtsindex: push schreibt ihn fort, neue Berichte bleiben, alte verschwinden auf dem Server', async () => {
  const srvDir = tmp(); const s = await mitLogin(srvDir); const dir = lokal(); const heute = vor(0).slice(0, 10);
  try {
    // Auf dem Server liegen ein jüngerer und ein über 180 Tage alter Bericht sowie ein verwaister. Der Lauf hat den Index
    // geholt, aber (anders als vorgesehen) nicht fortgeschrieben – push holt das nach.
    for (const f of ['daily-juenger.md', 'daily-juenger.json', 'daily-alt.md', 'daily-alt.json', 'weekly-verwaist.md']) W(srvDir, 'reports/' + f, f.endsWith('.json') ? '{}' : '# alt');
    W(dir, 'reports/index.json', [{ file: 'daily-juenger.md', kind: 'daily', at: vor(30), score: 80 }, { file: 'daily-alt.md', kind: 'daily', at: vor(200), score: 70 }]);
    W(dir, `reports/weekly-${heute}-weekly.md`, '# heute'); W(dir, `reports/weekly-${heute}-weekly.json`, { kind: 'weekly', generatedAt: vor(0), score: 95, open: 0 });
    const r = await lauf('push', s.url, dir); assert.strictEqual(r.code, 0, r.log); assert.match(r.log, /reports\/index\.json\s+\d+ Bytes {2}ok \(3 alte Berichtsdateien entfernt\)/);
    const index = JSON.parse(fs.readFileSync(path.join(srvDir, 'reports', 'index.json'), 'utf8')).map(e => e.file);
    assert.deepStrictEqual(index, [`weekly-${heute}-weekly.md`, `daily-${TAG}.md`, 'daily-juenger.md'], 'absteigend nach Zeit, ohne den alten');
    const da = fs.readdirSync(path.join(srvDir, 'reports'));
    assert.ok(da.includes(`weekly-${heute}-weekly.md`) && da.includes(`weekly-${heute}-weekly.json`), 'der eben hochgeladene Bericht bleibt'); assert.ok(da.includes('daily-juenger.md') && da.includes('daily-juenger.json'), 'älterer Bericht aus dem Index bleibt');
    assert.ok(!da.includes('daily-alt.md') && !da.includes('daily-alt.json') && !da.includes('weekly-verwaist.md'), 'über 180 Tage alt bzw. nicht im Index: entfernt'); assert.ok(da.includes('latest-daily.md'));
    assert.strictEqual(s.anfragen[s.anfragen.length - 1].query, 'ablage=reports', 'Index als Letztes');
  } finally { await s.stop(); }
});

test('Login: falsches Passwort → 401 mit verständlicher Meldung; ohne Zugangsdaten gar keine Anfrage', async () => {
  const srvDir = tmp(); W(srvDir, 'issues.json', { issues: {}, runs: [{}] }); const s = await mitLogin(srvDir);
  try {
    for (const befehl of ['pull', 'push', 'status']) {
      const dir = lokal(); const vorher = baum(dir); const falsch = await lauf(befehl, s.url, dir, { password: 'falsches-passwort-99' });
      assert.strictEqual(falsch.code, 1, befehl); assert.match(falsch.log, /Anmeldung abgelehnt \(HTTP 401\)/); assert.ok(!falsch.log.includes('falsches-passwort-99')); sauber(falsch.log); assert.deepStrictEqual(baum(dir), vorher);
    }
    assert.ok(s.anfragen.length === 3 && s.anfragen.every(a => a.query === 'zustand=1'), 'nach der abgelehnten Prüfung folgt nichts mehr'); const n = s.anfragen.length;
    for (const over of [{ user: '', password: PASS }, { user: USER, password: '' }, { user: '', password: '' }]) for (const befehl of ['pull', 'push', 'status']) {
      const r = await lauf(befehl, s.url, lokal(), over); assert.strictEqual(r.code, 1); assert.match(r.log, /Zugang fehlt: SEO_CENTER_USER und SEO_CENTER_PASSWORD sind nicht gesetzt/); sauber(r.log);
    }
    assert.strictEqual(s.anfragen.length, n, 'ohne Zugangsdaten keine Anfrage'); assert.deepStrictEqual(baum(srvDir), ['issues.json']);
  } finally { await s.stop(); }
});

test('pull bricht mit Rückgabe 1 ab, wenn das SEO Center nicht sauber antwortet – nie ein Lauf mit leerem Stand', async () => {
  const faelle = [
    [{ status: 503, body: 'Der Zugang ist noch nicht eingerichtet.' }, /nicht eingerichtet oder nicht verfügbar \(HTTP 503\)/],
    [{ status: 404, body: '<html>Seite nicht gefunden</html>', type: 'text/html' }, /daten\.php nicht gefunden \(HTTP 404\)/],
    [{ status: 429, body: 'Zu viele Fehlversuche.' }, /vorübergehend gesperrt \(HTTP 429/],
    [{ status: 200, body: '<!doctype html><title>Wartung</title>', type: 'text/html' }, /HTTP 200, aber kein gültiger Zustand/],
    [{ status: 200, body: '{"ok":false}', type: 'application/json' }, /HTTP 200, aber kein gültiger Zustand/],
    [{ status: 200, body: '[]', type: 'application/json' }, /HTTP 200, aber kein gültiger Zustand/],
    [{ status: 301, headers: { location: 'https://example.test/seo/daten.php?zustand=1' } }, /leitet weiter \(HTTP 301\)/],
    [{ status: 403, body: '{"ok":false,"error":"Gesperrt\\n durch <b>Regel</b>"}', type: 'application/json' }, /Unerwartete Antwort \(HTTP 403: Gesperrt durch <b>Regel<\/b>\)/],
    [{ status: 500, body: 'Internal Server Error' }, /Unerwartete Antwort \(HTTP 500\)/],
  ];
  for (const [vorgabe, meldung] of faelle) {
    const s = await mitLogin(tmp(), () => vorgabe); const dir = tmp();
    try {
      const r = await lauf('pull', s.url, dir); assert.strictEqual(r.code, 1, String(meldung)); assert.match(r.log, meldung); assert.deepStrictEqual(baum(dir), [], 'lokal entsteht nichts'); sauber(r.log);
      assert.ok(!r.log.includes('Wartung') && !r.log.includes('Seite nicht gefunden'), 'fremde Antworttexte werden nicht ausgegeben');
      assert.strictEqual(s.anfragen.length, vorgabe.status >= 500 ? 3 : 1, 'nur bei Serverfehlern (5xx) wird wiederholt'); assert.ok(s.anfragen.every(a => a.query === 'zustand=1'));
    } finally { await s.stop(); }
  }
  // Datenordner des Servers nicht beschreibbar: der Lauf könnte sein Ergebnis nicht ablegen
  const zu = await mitLogin(tmp(), req => (req.query === 'zustand=1' ? { status: 200, type: 'application/json', body: '{"ok":true,"dateien":{},"berichte":0,"schreibbar":false,"version":1}' } : null));
  try { for (const befehl of ['pull', 'push']) { const r = await lauf(befehl, zu.url, lokal()); assert.strictEqual(r.code, 1); assert.match(r.log, /nicht beschreibbar/); } assert.ok(zu.anfragen.every(a => a.query === 'zustand=1')); } finally { await zu.stop(); }
});

test('Netz: nicht erreichbar und Zeitüberschreitung → Rückgabe 1 nach den Wiederholungen; kurze Störung wird überbrückt', async () => {
  // Port, an dem niemand lauscht
  const frei = await mitLogin(tmp()); const tot = frei.url; await frei.stop();
  const dir = tmp(); const aus = await lauf('pull', tot, dir); assert.strictEqual(aus.code, 1); assert.match(aus.log, /SEO Center nicht erreichbar \(.+, 3 Versuche\)/); assert.deepStrictEqual(baum(dir), []); sauber(aus.log);
  assert.strictEqual((await lauf('push', tot, lokal())).code, 1);
  // Server nimmt an, antwortet aber nie
  const haengt = await mitLogin(tmp(), () => 'haengen');
  try { const t0 = Date.now(); const r = await lauf('pull', haengt.url, tmp(), { timeoutMs: 150, retries: 1 }); assert.strictEqual(r.code, 1); assert.match(r.log, /Zeitüberschreitung nach 0 s, 2 Versuche/); assert.strictEqual(haengt.anfragen.length, 2); assert.ok(Date.now() - t0 < 5000); } finally { await haengt.stop(); }
  // zwei Fehlversuche (502, dann 504), der dritte klappt
  const srvDir = tmp(); W(srvDir, 'issues.json', { issues: {}, runs: [{ runId: 'x' }] });
  const wackelt = await mitLogin(srvDir, (req, nr) => (nr === 1 ? { status: 502, body: 'Bad Gateway' } : nr === 2 ? { status: 504, body: 'Gateway Timeout' } : null));
  try { const ziel = tmp(); const r = await lauf('pull', wackelt.url, ziel); assert.strictEqual(r.code, 0, r.log); assert.strictEqual(wackelt.anfragen.filter(a => a.query === 'zustand=1').length, 3); gleich(ziel, srvDir, 'issues.json'); } finally { await wackelt.stop(); }
});

test('pull schreibt nur, wenn alles lesbar war: eine defekte Datei → Rückgabe 1 und lokal bleibt alles beim Alten', async () => {
  for (const [stoerung, meldung] of [[{ status: 500, body: '{"ok":false,"error":"Interner Fehler"}', type: 'application/json' }, /crawl-history\.json\s+–\s+FEHLER: Unerwartete Antwort \(HTTP 500: Interner Fehler\)/], [{ status: 200, body: '{"abgeschnitten":', type: 'application/json' }, /crawl-history\.json\s+–\s+FEHLER: kein gültiges JSON/], [{ status: 200, body: '"nur text"', type: 'application/json' }, /FEHLER: kein gültiges JSON/], [{ status: 404, body: 'Not Found' }, /FEHLER: daten\.php nicht gefunden/]]) {
    const srvDir = lokal(); const s = await mitLogin(srvDir, req => (req.query === 'd=crawl-history' ? stoerung : null)); const dir = tmp(); W(dir, 'issues.json', '{"alt":true}');
    try {
      const r = await lauf('pull', s.url, dir); assert.strictEqual(r.code, 1, String(meldung)); assert.match(r.log, meldung); assert.match(r.log, /pull abgebrochen: 1 Datei\(en\) nicht lesbar – lokal wurde nichts verändert/); sauber(r.log);
      assert.deepStrictEqual(baum(dir), ['issues.json']); assert.strictEqual(fs.readFileSync(path.join(dir, 'issues.json'), 'utf8'), '{"alt":true}');
    } finally { await s.stop(); }
  }
});

test('push meldet jede abgelehnte Datei und endet mit Rückgabe 1; die übrigen werden trotzdem abgelegt', async () => {
  const srvDir = tmp(); const s = await mitLogin(srvDir, req => (req.query === 'ablage=suggestions' ? { status: 500, type: 'application/json', body: '{"ok":false,"error":"Speichern fehlgeschlagen"}' } : req.query === 'ablage=notifications' ? { status: 200, type: 'application/json', body: '{"ok":true,"bytes":1}' } : null));
  const dir = lokal(); W(dir, 'opportunities.json', '{"kaputt":'); W(dir, 'gsc-analysis.json', '');
  try {
    const r = await lauf('push', s.url, dir); assert.strictEqual(r.code, 1, r.log); sauber(r.log);
    assert.match(r.log, /suggestions\.json\s+\d+ Bytes {2}FEHLER: Unerwartete Antwort \(HTTP 500: Speichern fehlgeschlagen\)/); assert.match(r.log, /notifications\.json\s+\d+ Bytes {2}FEHLER: Größe nicht bestätigt/);
    assert.match(r.log, /opportunities\.json\s+\d+ Bytes {2}FEHLER: Unerwartete Antwort \(HTTP 400: Ungültiges JSON\)/); assert.match(r.log, /gsc-analysis\.json\s+0 Bytes {2}FEHLER: Datei ist leer/);
    assert.match(r.log, /push unvollständig: 4 Datei\(en\) nicht abgelegt, 10 abgelegt/); assert.strictEqual(s.anfragen.filter(a => a.query === 'ablage=suggestions').length, 3, 'Serverfehler wird wiederholt');
    for (const f of ['issues.json', 'last-crawl.json', 'uebersicht.json', `reports/daily-${TAG}.md`, 'reports/index.json']) gleich(dir, srvDir, f);
    assert.ok(!fs.existsSync(path.join(srvDir, 'opportunities.json')) && !fs.existsSync(path.join(srvDir, 'suggestions.json')));
  } finally { await s.stop(); }
});

test('push: scheitert issues.json, bleibt alles beim Alten; scheitert last-crawl.json, folgt nichts mehr – Befundstand und Vergleichsbasis passen zusammen', async () => {
  const faelle = [
    ['issues', req => (req.query === 'ablage=issues' ? { status: 503, body: 'Wartung' } : null), [], 3],
    ['last-crawl', req => (req.query === 'ablage=last-crawl' ? { status: 503, body: 'Wartung' } : null), ['issues.json'], 3],
    ['last-crawl', req => (req.query === 'ablage=last-crawl' ? { status: 200, type: 'application/json', body: '{"ok":true,"bytes":1}' } : null), ['issues.json'], 1], // Größe nicht bestätigt
  ];
  for (const [kaputt, stoer, erwartet, versuche] of faelle) {
    const srvDir = tmp(); const s = await mitLogin(srvDir, stoer); const dir = lokal();
    try {
      const r = await lauf('push', s.url, dir); assert.strictEqual(r.code, 1, r.log); sauber(r.log); assert.ok(!r.log.includes('Wartung'));
      assert.match(r.log, new RegExp(`push abgebrochen: ${kaputt}\\.json nicht abgelegt.* – die übrigen Dateien wurden nicht hochgeladen`));
      const posts = s.anfragen.filter(a => a.method === 'POST').map(a => a.query);
      assert.deepStrictEqual([...new Set(posts)], [...erwartet.map(f => 'ablage=' + f.replace('.json', '')), 'ablage=' + kaputt], 'nach dem Fehler keine weitere Datei');
      assert.strictEqual(posts.filter(q => q === 'ablage=' + kaputt).length, versuche, 'Serverfehler wird wiederholt');
      assert.deepStrictEqual(baum(srvDir).filter(f => !/^\./.test(f)), erwartet, 'weder Berichte noch Index noch Übersicht auf dem Server');
      for (const f of erwartet) gleich(dir, srvDir, f);
    } finally { await s.stop(); }
  }
  // Leere Vergleichsbasis: gilt wie ein Fehlschlag – der Befundstand liegt oben, der Rest nicht
  const srvDir = tmp(); const s = await mitLogin(srvDir); const dir = lokal(); W(dir, 'last-crawl.json', '');
  try {
    const r = await lauf('push', s.url, dir); assert.strictEqual(r.code, 1); assert.match(r.log, /last-crawl\.json\s+0 Bytes {2}FEHLER: Datei ist leer/); assert.match(r.log, /push abgebrochen: last-crawl\.json nicht abgelegt \(davor 1 abgelegt\)/);
    assert.deepStrictEqual(baum(srvDir), ['issues.json']);
  } finally { await s.stop(); }
  // Reihenfolge unabhängig von der Liste in lib/api.js: Befundstand, Vergleichsbasis, …, Index zuletzt
  const ok = tmp(); const s2 = await mitLogin(ok);
  try { assert.strictEqual((await lauf('push', s2.url, lokal())).code, 0); const q = s2.anfragen.filter(a => a.method === 'POST').map(a => a.query); assert.deepStrictEqual(q.slice(0, 2), ['ablage=issues', 'ablage=last-crawl']); assert.strictEqual(q[q.length - 1], 'ablage=reports'); } finally { await s2.stop(); }
});

test('Einstellungen: nur https (außer lokal), keine Zugangsdaten in der Adresse, Schrägstrich am Ende egal', () => {
  const cfg = url => ({ dataDir: '/tmp/x', center: { url, user: USER, password: PASS } });
  assert.strictEqual(sync.settings(cfg('https://example.test/seo/')).endpoint, 'https://example.test/seo/daten.php'); assert.strictEqual(sync.settings(cfg('https://example.test/seo')).endpoint, 'https://example.test/seo/daten.php');
  assert.strictEqual(sync.settings(cfg('http://localhost:3500/seo/')).endpoint, 'http://localhost:3500/seo/daten.php'); assert.strictEqual(sync.settings(cfg('')).endpoint, 'https://kfz-zulassungsprofis.de/seo/daten.php', 'Standardadresse');
  const std = sync.settings(cfg('https://example.test/seo/')); assert.strictEqual(std.auth, 'Basic ' + TOKEN); assert.strictEqual(std.timeoutMs, 30000, '30 s Zeitlimit'); assert.strictEqual(std.retries, 2, '2 Wiederholungen'); assert.ok(std.pauseMs > 0 && std.abstandMs > 0);
  assert.throws(() => sync.settings(cfg('http://example.test/seo/')), /muss mit https:\/\/ beginnen/); assert.throws(() => sync.settings(cfg('ftp://example.test/seo/')), /https/);
  assert.throws(() => sync.settings(cfg(`https://${USER}:${PASS}@example.test/seo/`)), e => /darf keine Zugangsdaten enthalten/.test(e.message) && !e.message.includes(PASS));
  assert.throws(() => sync.settings(cfg('kein url')), /keine gültige Adresse/); assert.throws(() => sync.settings({ center: { url: 'https://example.test/seo/', user: USER, password: PASS } }), /Datenordner unbekannt/);
  // Umlaute im Passwort: als UTF-8 kodiert, wie es der Browser beim Login tut
  assert.strictEqual(sync.settings({ dataDir: '/tmp/x', center: { url: 'https://example.test/seo/', user: 'ä', password: 'pässwort-ö-1' } }).auth, 'Basic ' + Buffer.from('ä:pässwort-ö-1', 'utf8').toString('base64'));
});

test('Kommandozeile: Rückgabewerte 0/1/2, Zugangsdaten nur aus der Umgebung und nie in der Ausgabe', async t => {
  const dir = lokal(); const srvDir = tmp(); const s = await mitLogin(srvDir);
  const env = { PATH: process.env.PATH, SEO_DATA_DIR: dir, SEO_CENTER_URL: s.url, SEO_CENTER_USER: USER, SEO_CENTER_PASSWORD: PASS };
  const skript = path.join(__dirname, '..', 'bin', 'sync.js');
  // spawnSync blockiert diesen Prozess – der Testserver muss deshalb in einem eigenen Prozess laufen
  await s.stop();
  const kind = `const http=require('http');const api=require(${JSON.stringify(path.join(__dirname, '..', 'lib', 'api.js'))}).create(${JSON.stringify(srvDir)});const s=http.createServer((q,r)=>{const u=new URL(q.url,'http://x');const c=[];q.on('data',d=>c.push(d));q.on('end',()=>{if(q.headers.authorization!=='Basic ${TOKEN}'){r.writeHead(401,{'content-type':'text/plain'});return r.end('Login erforderlich');}const a=api.handle(q.method,u.searchParams,q.headers,Buffer.concat(c));r.writeHead(a.code,{'content-type':a.type});r.end(a.body);});});s.listen(0,'127.0.0.1',()=>console.log(s.address().port));`;
  const { spawn } = require('child_process'); const proc = spawn(process.execPath, ['-e', kind], { stdio: ['ignore', 'pipe', 'inherit'] });
  try {
    const port = await new Promise((resolve, reject) => { proc.stdout.once('data', d => resolve(parseInt(String(d), 10))); proc.once('exit', () => reject(new Error('Testserver beendet'))); });
    env.SEO_CENTER_URL = `http://127.0.0.1:${port}/seo/`;
    const cli = (args, e = env) => { const r = spawnSync(process.execPath, [skript, ...args], { env: e, encoding: 'utf8', timeout: 30000 }); return { code: r.status, out: r.stdout + r.stderr }; };
    const probe = cli(['status']);
    if (probe.code !== 0 && /Cannot find module|SyntaxError|is not defined/.test(probe.out)) return t.skip('config.js lässt sich gerade nicht laden');
    assert.strictEqual(probe.code, 0, probe.out); assert.match(probe.out, /SEO Center erreichbar/); sauber(probe.out);
    assert.strictEqual(cli([]).code, 2); assert.strictEqual(cli(['loeschen']).code, 2); assert.match(cli(['loeschen']).out, /Aufruf: node seo-autopilot\/bin\/sync\.js pull \| push \| status/);
    const hoch = cli(['push']); assert.strictEqual(hoch.code, 0, hoch.out); sauber(hoch.out); gleich(dir, srvDir, 'issues.json');
    const neu = tmp(); const runter = cli(['pull'], { ...env, SEO_DATA_DIR: neu }); assert.strictEqual(runter.code, 0, runter.out); sauber(runter.out); gleich(neu, srvDir, 'last-crawl.json');
    const ohne = cli(['pull'], { ...env, SEO_CENTER_PASSWORD: '' }); assert.strictEqual(ohne.code, 1); assert.match(ohne.out, /Zugang fehlt/);
    const falsch = cli(['push'], { ...env, SEO_CENTER_PASSWORD: 'falsches-passwort-99' }); assert.strictEqual(falsch.code, 1); assert.match(falsch.out, /HTTP 401/); assert.ok(!falsch.out.includes('falsches-passwort-99'));
  } finally { proc.kill(); }
});
