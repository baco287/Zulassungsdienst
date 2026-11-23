'use strict';
// Daten-Vertrag des SEO Centers (lib/api.js, lib/review.js) und lokaler Server (server.js).
// Ohne Netz nach außen; alle Dateien liegen in eigenen Temp-Ordnern.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const http = require('http');

const api = require('../lib/api');
const { ReviewStore, ReviewError } = require('../lib/review');
const server = require('../server');

// Temp-Ordner dieses Testlaufs; werden am Ende wieder entfernt (einige Tests schreiben Dateien von 16 MB).
const tmpOrdner = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-api-')); tmpOrdner.push(d); return d; };
test.after(() => { for (const d of tmpOrdner) fs.rmSync(d, { recursive: true, force: true }); });
const ID = 'abcdef123456', ID2 = '0123456789ab', FREMD = 'ffffffffffff';
const ISSUES = { issues: { [ID]: { id: ID, rule: 'title-lang', severity: 'niedrig', status: 'offen', title: 'Titel zu lang' }, [ID2]: { id: ID2, rule: 'defekter-link', severity: 'hoch', status: 'offen', title: 'Link defekt' } }, runs: [{ runId: 'daily-1', kind: 'daily', at: '2026-11-20T05:40:00.000Z', open: 2 }] };
const XHR = { 'x-requested-with': 'XMLHttpRequest' };
const RUNNER = { 'X-Requested-With': 'SEO-Autopilot' };

/** Frischer Datenordner mit Befundliste; call(method, 'a=b', headers, body) → { code, type, body, json }. */
function setup(mitBefunden = true) {
  const dir = tmp(); if (mitBefunden) fs.writeFileSync(path.join(dir, 'issues.json'), JSON.stringify(ISSUES, null, 1));
  const a = api.create(dir);
  const call = (method, qs, headers = {}, body = null) => {
    const r = a.handle(method, new URLSearchParams(qs), headers, body === null ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    let json; try { json = JSON.parse(r.body.toString()); } catch (_) { json = undefined; }
    return { ...r, json };
  };
  return { dir, call, file: (...p) => path.join(dir, ...p) };
}
const dateienIn = d => fs.readdirSync(d).sort();

test('GET ?d=: jeder Name der festen Liste – fehlend 404 mit fehlt:true, vorhanden 200 mit unverändertem Inhalt', () => {
  const { call, file } = setup(false);
  assert.deepStrictEqual(Object.keys(api.FILES).sort(), ['crawl-history', 'gsc', 'gsc-analysis', 'gsc-status', 'issues', 'last-crawl', 'local-check', 'notifications', 'opportunities', 'reports', 'review', 'suggestions', 'uebersicht']);
  for (const [name, datei] of Object.entries(api.FILES)) {
    const fehlt = call('GET', 'd=' + name);
    assert.strictEqual(fehlt.code, 404, name); assert.strictEqual(fehlt.type, 'application/json; charset=utf-8');
    assert.deepStrictEqual(fehlt.json, { ok: false, fehlt: true, d: name });
    const inhalt = JSON.stringify({ name, text: 'Größe ändern – „ok“', liste: [1, 2, 3] }, null, 1);
    fs.mkdirSync(path.dirname(file(datei)), { recursive: true }); fs.writeFileSync(file(datei), inhalt);
    const da = call('GET', 'd=' + name);
    assert.strictEqual(da.code, 200, name); assert.strictEqual(da.type, 'application/json; charset=utf-8');
    assert.ok(Buffer.isBuffer(da.body) && da.body.equals(Buffer.from(inhalt)), name + ': Inhalt 1:1');
  }
});

test('GET ?d=: nur die feste Liste – keine Dateinamen, keine Pfade, kein Seitencache', () => {
  const { call, file, dir } = setup();
  fs.writeFileSync(file('page-cache.json'), '{"geheim":1}'); fs.writeFileSync(file('run-daily-1.log'), 'log');
  fs.mkdirSync(file('previews')); fs.writeFileSync(file('previews', 'x.json'), '{}');
  for (const d of ['', 'page-cache', 'page-cache.json', 'issues.json', '../issues', './issues', '/etc/passwd', 'reports/index.json', 'reports/index', 'previews/x', 'run-daily-1.log', 'ISSUES', 'issues ', 'issues\n', 'issues\u0000', '__proto__', 'constructor', 'toString', '..', '%2e%2e%2fissues']) {
    const r = call('GET', 'd=' + encodeURIComponent(d));
    assert.strictEqual(r.code, 400, JSON.stringify(d)); assert.deepStrictEqual(r.json, { ok: false, error: 'Unbekannter Datensatz' });
    assert.ok(!r.body.includes(dir), 'kein Serverpfad in der Antwort');
  }
});

test('Parameter: genau einer, nur bekannte; Methode muss passen (405 mit Allow)', () => {
  const { call } = setup();
  for (const qs of ['', 'd=issues&d=review', 'd=issues&x=1', 'd=issues&zustand=1', 'zustand=1&_=123']) assert.strictEqual(call('GET', qs).code, 400, qs);
  for (const qs of ['x=1', 'D=issues', 'd[]=issues', 'report=daily-x.md', 'status=alle', 'issue=' + ID]) { const r = call('GET', qs); assert.strictEqual(r.code, 400, qs); assert.strictEqual(r.json.error, 'Unbekannter Parameter'); }
  for (const m of ['PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) { const r = call(m, 'd=issues', XHR); assert.strictEqual(r.code, 405, m); assert.strictEqual(r.headers.allow, 'GET, POST'); assert.strictEqual(r.json.ok, false); }
  for (const qs of ['d=issues', 'bericht=daily-x.md', 'zustand=1']) { const r = call('POST', qs, XHR, '{}'); assert.strictEqual(r.code, 405, qs); assert.strictEqual(r.headers.allow, 'GET'); }
  for (const qs of ['review=' + ID, 'ablage=issues']) { const r = call('GET', qs); assert.strictEqual(r.code, 405, qs); assert.strictEqual(r.headers.allow, 'POST'); }
  assert.strictEqual(call('GET', 'd=issues').code, 200, 'Gegenprobe');
});

test('GET ?bericht=: Markdown und JSON aus reports/, sonst nichts (Traversal-Versuche → 400)', () => {
  const { call, file, dir } = setup();
  fs.mkdirSync(file('reports')); fs.writeFileSync(file('reports', 'daily-2026-11-20.md'), '# Tagesbericht\n\nÄ'); fs.writeFileSync(file('reports', 'daily-2026-11-20.json'), '{"score":91}');
  fs.writeFileSync(file('reports', 'latest-weekly.md'), '# Woche'); fs.writeFileSync(file('reports', 'index.json'), '[]'); fs.writeFileSync(file('reports', 'notiz.md'), 'privat');
  fs.writeFileSync(file('geheim.md'), 'geheim'); fs.mkdirSync(file('reports', 'daily-ordner.md'));
  const md = call('GET', 'bericht=daily-2026-11-20.md'); assert.strictEqual(md.code, 200); assert.strictEqual(md.type, 'text/markdown; charset=utf-8'); assert.strictEqual(md.body.toString(), '# Tagesbericht\n\nÄ');
  const js = call('GET', 'bericht=daily-2026-11-20.json'); assert.strictEqual(js.code, 200); assert.strictEqual(js.type, 'application/json; charset=utf-8'); assert.deepStrictEqual(js.json, { score: 91 });
  assert.strictEqual(call('GET', 'bericht=latest-weekly.md').code, 200);
  const fehlt = call('GET', 'bericht=weekly-2026-11-16-weekly.md'); assert.strictEqual(fehlt.code, 404); assert.deepStrictEqual(fehlt.json, { ok: false, error: 'Bericht nicht gefunden', fehlt: true });
  assert.strictEqual(call('GET', 'bericht=daily-ordner.md').code, 404, 'ein Ordner ist kein Bericht');
  for (const b of ['', 'index.json', 'notiz.md', '../issues.json', '../geheim.md', 'daily-x.md/../../issues.json', 'reports/daily-2026-11-20.md', '/etc/passwd', 'daily-2026-11-20.md\n', 'daily-2026-11-20.txt', 'daily-2026-11-20', 'daily-.md/', 'yearly-2026.md', 'daily-a b.md', 'daily-ä.md', '..\\issues.json', 'daily-x.md\u0000.json', 'DAILY-2026-11-20.md']) {
    const r = call('GET', 'bericht=' + encodeURIComponent(b));
    assert.strictEqual(r.code, 400, JSON.stringify(b)); assert.deepStrictEqual(r.json, { ok: false, error: 'Ungültiger Berichtsname' }); assert.ok(!r.body.includes(dir));
  }
});

test('GET ?zustand=1: Dateien mit Größe und Zeit, Zahl der Berichte, keine Inhalte und keine Pfade', () => {
  const leer = setup(false);
  assert.deepStrictEqual(leer.call('GET', 'zustand=1').json, { ok: true, dateien: {}, berichte: 0, schreibbar: true, version: api.VERSION });
  const { call, file, dir } = setup();
  fs.mkdirSync(file('reports')); for (const f of ['daily-2026-11-20.md', 'daily-2026-11-20.json', 'weekly-2026-11-16-weekly.md', 'latest-daily.md', 'index.json']) fs.writeFileSync(file('reports', f), '[]');
  fs.writeFileSync(file('page-cache.json'), '{}'); fs.writeFileSync(file('review.json'), '{}');
  const r = call('GET', 'zustand=1'); assert.strictEqual(r.code, 200);
  assert.deepStrictEqual(Object.keys(r.json.dateien).sort(), ['issues', 'reports', 'review']);
  assert.strictEqual(r.json.dateien.issues.bytes, fs.statSync(file('issues.json')).size); assert.match(r.json.dateien.issues.geaendert, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
  assert.strictEqual(r.json.berichte, 2, 'nur Berichte von Läufen (*.md), ohne latest-* und Index'); assert.strictEqual(r.json.schreibbar, true); assert.strictEqual(r.json.version, 1);
  assert.ok(!r.body.includes(dir) && !r.body.includes('Titel zu lang'), 'weder Pfad noch Inhalte');
  for (const w of ['', '0', '2', 'true', '1 ']) assert.strictEqual(call('GET', 'zustand=' + encodeURIComponent(w)).code, 400, JSON.stringify(w));
});

test('POST-Schutz: ohne X-Requested-With oder mit fremder Herkunft 403 – und nichts wird geschrieben', () => {
  const { call, file } = setup(); const body = { state: 'in_pruefung', note: 'x' };
  const verboten = [{}, { 'x-requested-with': '' }, { 'x-requested-with': 'fetch' }, { 'x-requested-with': 'xmlhttprequest' },
    { ...XHR, origin: 'https://boese.example', host: 'kfz-zulassungsprofis.de' }, { ...XHR, origin: 'null', host: 'kfz-zulassungsprofis.de' },
    { ...XHR, origin: 'https://kfz-zulassungsprofis.de.boese.example', host: 'kfz-zulassungsprofis.de' }, { ...XHR, origin: 'https://kfz-zulassungsprofis.de@boese.example', host: 'kfz-zulassungsprofis.de' },
    { ...XHR, origin: 'http://localhost:3500', host: 'localhost:3501' }, { ...XHR, origin: 'https://kfz-zulassungsprofis.de' }, { ...XHR, origin: 'https://kfz-zulassungsprofis.de/pfad', host: 'kfz-zulassungsprofis.de' }];
  for (const h of verboten) {
    for (const qs of ['review=' + ID, 'ablage=issues', 'd=issues', 'unbekannt=1']) { const r = call('POST', qs, h, body); assert.strictEqual(r.code, 403, JSON.stringify(h) + ' ' + qs); assert.strictEqual(r.json.ok, false); assert.match(r.json.error, /^Nicht erlaubt/); }
  }
  assert.ok(!fs.existsSync(file('review.json')), 'kein Bearbeitungsstand angelegt'); assert.deepStrictEqual(JSON.parse(fs.readFileSync(file('issues.json'), 'utf8')), ISSUES, 'Befundliste unverändert');
  const erlaubt = [XHR, RUNNER, { ...XHR, origin: 'https://kfz-zulassungsprofis.de', host: 'kfz-zulassungsprofis.de' }, { ...XHR, Origin: 'http://LOCALHOST:3500', Host: 'localhost:3500' }, { ...XHR, origin: 'http://127.0.0.1:3500', host: '127.0.0.1:3500' }];
  for (const h of erlaubt) assert.strictEqual(call('POST', 'review=' + ID, h, body).code, 200, JSON.stringify(h));
});

test('POST ?review=: speichert Status mit Historie; ID muss gültig und in issues.json vorhanden sein', () => {
  const { call, file, dir } = setup();
  const r1 = call('POST', 'review=' + ID, XHR, { state: 'in_pruefung', note: 'schaue ich an' });
  assert.strictEqual(r1.code, 200); assert.strictEqual(r1.json.ok, true); assert.strictEqual(r1.json.review.state, 'in_pruefung'); assert.strictEqual(r1.json.review.note, 'schaue ich an');
  assert.match(r1.json.review.at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/); assert.deepStrictEqual(r1.json.review.history, [{ state: 'in_pruefung', note: 'schaue ich an', at: r1.json.review.at }]);
  const r2 = call('POST', 'review=' + ID, XHR, { state: 'lokal_behoben' }); assert.strictEqual(r2.json.review.note, '', 'Notiz ist freiwillig'); assert.strictEqual(r2.json.review.history.length, 2);
  assert.strictEqual(call('POST', 'review=' + ID2, XHR, { state: 'freigegeben', note: null }).code, 200);
  const gespeichert = JSON.parse(fs.readFileSync(file('review.json'), 'utf8'));
  assert.deepStrictEqual(Object.keys(gespeichert).sort(), [ID2, ID].sort()); assert.strictEqual(gespeichert[ID].state, 'lokal_behoben'); assert.strictEqual(gespeichert[ID2].state, 'freigegeben');
  assert.deepStrictEqual(call('GET', 'd=review').json, gespeichert, 'Abruf liefert denselben Stand');
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(file('issues.json'), 'utf8')), ISSUES, 'der automatische Status bleibt unberührt');
  assert.ok(!dateienIn(dir).some(f => f.startsWith('.neu-')), 'keine Zwischendateien übrig');

  const vorher = fs.readFileSync(file('review.json'), 'utf8');
  const falsch = [['review=' + FREMD, { state: 'offen' }, 404, 'Befund nicht gefunden'], ['review=ABCDEF123456', { state: 'offen' }, 400, 'Ungültige Befund-ID'], ['review=abc', { state: 'offen' }, 400, 'Ungültige Befund-ID'],
    ['review=' + encodeURIComponent('../review'), { state: 'offen' }, 400, 'Ungültige Befund-ID'], ['review=' + ID + '%0A', { state: 'offen' }, 400, 'Ungültige Befund-ID'], ['review=', { state: 'offen' }, 400, 'Ungültige Befund-ID'],
    ['review=' + ID, { state: 'geloescht' }, 400, 'Ungültiger Status'], ['review=' + ID, {}, 400, 'Ungültiger Status'], ['review=' + ID, { state: 1 }, 400, 'Ungültiger Status'], ['review=' + ID, { state: ['offen'] }, 400, 'Ungültiger Status'],
    ['review=' + ID, { state: 'offen', note: 5 }, 400, 'Ungültige Notiz'], ['review=' + ID, { state: 'offen', note: { a: 1 } }, 400, 'Ungültige Notiz'],
    ['review=' + ID, { state: 'offen', note: 'x'.repeat(501) }, 400, 'Notiz zu lang (höchstens 500 Zeichen)'],
    ['review=' + ID, '{"state":"offen"', 400, 'Ungültiges JSON'], ['review=' + ID, '', 400, 'Ungültiges JSON'], ['review=' + ID, '[]', 400, 'Ungültiges JSON'], ['review=' + ID, '"offen"', 400, 'Ungültiges JSON'], ['review=' + ID, 'null', 400, 'Ungültiges JSON'],
    ['review=' + ID, Buffer.from([0x7b, 0x22, 0xff, 0x22, 0x3a, 0x31, 0x7d]), 400, 'Ungültiges JSON'],
    ['review=' + ID, JSON.stringify({ state: 'offen', note: '' }) + ' '.repeat(64 * 1024), 413, 'Anfrage zu groß']];
  for (const [qs, body, code, error] of falsch) { const r = call('POST', qs, XHR, body); assert.strictEqual(r.code, code, qs + ' ' + String(body).slice(0, 40)); assert.deepStrictEqual(r.json, { ok: false, error }); }
  assert.strictEqual(fs.readFileSync(file('review.json'), 'utf8'), vorher, 'abgelehnte Anfragen ändern nichts');
  // Grenzen: genau 500 Zeichen sind erlaubt (gezählt in Zeichen, nicht in Bytes), die Historie behält 50 Einträge
  assert.strictEqual(call('POST', 'review=' + ID, XHR, { state: 'offen', note: 'ä'.repeat(500) }).code, 200); assert.strictEqual(call('POST', 'review=' + ID, XHR, { state: 'offen', note: '🚗'.repeat(500) }).code, 200);
  for (let i = 0; i < 55; i++) call('POST', 'review=' + ID, XHR, { state: i % 2 ? 'offen' : 'in_pruefung', note: 'n' + i });
  const ende = JSON.parse(fs.readFileSync(file('review.json'), 'utf8'))[ID]; assert.strictEqual(ende.history.length, 50); assert.strictEqual(ende.history[49].note, 'n54'); assert.strictEqual(ende.note, 'n54');
});

test('review: ohne Befundliste 404; beschädigter Stand wird aufgehoben statt überschrieben', () => {
  const ohne = setup(false); assert.strictEqual(ohne.call('POST', 'review=' + ID, XHR, { state: 'offen' }).code, 404); assert.ok(!fs.existsSync(ohne.file('review.json')));
  fs.writeFileSync(ohne.file('issues.json'), '{kaputt'); assert.strictEqual(ohne.call('POST', 'review=' + ID, XHR, { state: 'offen' }).code, 404, 'unlesbare Befundliste');
  fs.writeFileSync(ohne.file('issues.json'), JSON.stringify({ issues: [], runs: [], hinweis: `"${ID}"` })); assert.strictEqual(ohne.call('POST', 'review=' + ID, XHR, { state: 'offen' }).code, 404, 'ID nur als Text, nicht als Befund');
  const { call, file } = setup(); fs.writeFileSync(file('review.json'), '{"abc": kaputt');
  assert.strictEqual(call('POST', 'review=' + ID, XHR, { state: 'freigegeben' }).code, 200);
  assert.strictEqual(fs.readFileSync(file('review.beschaedigt.json'), 'utf8'), '{"abc": kaputt'); assert.deepStrictEqual(Object.keys(JSON.parse(fs.readFileSync(file('review.json'), 'utf8'))), [ID]);
});

test('ReviewStore direkt: Standardwert, Zählung, Fehler mit Status', () => {
  const { dir } = setup(); const s = new ReviewStore(dir);
  assert.deepStrictEqual(s.get(ID), { state: 'offen', note: '', at: null, history: [] }); assert.deepStrictEqual(s.get('__proto__'), { state: 'offen', note: '', at: null, history: [] });
  s.set(ID, 'in_pruefung', 'a'); s.set(ID, 'lokal_behoben', 'b');
  const neu = new ReviewStore(dir); assert.strictEqual(neu.get(ID).state, 'lokal_behoben'); assert.strictEqual(neu.get(ID).history.length, 2);
  assert.deepStrictEqual(neu.counts([ID, ID2, FREMD]), { offen: 2, in_pruefung: 0, lokal_behoben: 1, freigegeben: 0 });
  assert.throws(() => s.set(ID, 'geloescht'), e => e instanceof ReviewError && e.status === 400 && /Ungültiger Status/.test(e.message));
  assert.throws(() => s.set('../x', 'offen'), e => e instanceof ReviewError && e.status === 400);
  assert.throws(() => s.set(FREMD, 'offen'), e => e instanceof ReviewError && e.status === 404);
});

test('POST ?ablage=: roh und gzip, nur erlaubte Ziele, nur gültige Inhalte, Grenze 16 MB', () => {
  const { call, file, dir } = setup(false);
  const daten = JSON.stringify({ issues: { [ID]: { id: ID, title: 'Größe – „ok“' } }, runs: [{ runId: 'r1' }] }, null, 1); const bytes = Buffer.byteLength(daten);
  const roh = call('POST', 'ablage=issues', RUNNER, daten); assert.strictEqual(roh.code, 200); assert.deepStrictEqual(roh.json, { ok: true, bytes }); assert.strictEqual(fs.readFileSync(file('issues.json'), 'utf8'), daten);
  const gz = call('POST', 'ablage=last-crawl', { ...RUNNER, 'X-Body-Encoding': 'gzip' }, zlib.gzipSync(daten)); assert.strictEqual(gz.code, 200); assert.deepStrictEqual(gz.json, { ok: true, bytes }); assert.strictEqual(fs.readFileSync(file('last-crawl.json'), 'utf8'), daten);
  assert.strictEqual(call('POST', 'ablage=crawl-history', { ...RUNNER, 'x-body-encoding': 'identity' }, '[]').code, 200);
  for (const name of Object.keys(api.FILES)) {
    const erwartet = api.NO_UPLOAD.includes(name) ? 403 : 200; const inhalt = name === 'reports' ? '[]' : '{"a":1}';
    assert.strictEqual(call('POST', 'ablage=' + name, RUNNER, inhalt).code, erwartet, name);
  }
  assert.deepStrictEqual(api.NO_UPLOAD, ['review', 'local-check']); assert.ok(!fs.existsSync(file('review.json')) && !fs.existsSync(file('local-check.json')), 'review und local-check werden nie abgelegt');
  // Berichte: Ordner entsteht bei Bedarf, Markdown und JSON
  const md = call('POST', 'ablage=reports/daily-2026-11-20.md', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync('# Bericht\nÄÖÜ')); assert.strictEqual(md.code, 200); assert.strictEqual(fs.readFileSync(file('reports', 'daily-2026-11-20.md'), 'utf8'), '# Bericht\nÄÖÜ');
  assert.strictEqual(call('POST', 'ablage=reports/latest-daily.json', RUNNER, '{"score":90}').code, 200);

  const vorher = fs.readFileSync(file('issues.json'), 'utf8');
  for (const z of ['', 'page-cache', 'page-cache.json', 'issues.json', '../issues', 'reports/', 'reports/index.json', 'reports/../issues.json', 'reports/..%2Fissues.json', 'reports/sub/daily-x.md', 'reports/notiz.md', 'reports/daily-x.txt', 'reports/daily-x.md\n', 'reports\\daily-x.md', 'REPORTS/daily-x.md', '/etc/passwd', 'previews/x.json', '__proto__']) {
    const r = call('POST', 'ablage=' + encodeURIComponent(z), RUNNER, '{"a":1}'); assert.strictEqual(r.code, 400, JSON.stringify(z)); assert.ok(['Unbekanntes Ablageziel', 'Ungültiger Berichtsname'].includes(r.json.error)); assert.ok(!r.body.includes(dir));
  }
  const ungueltig = [['{"a":', 'Ungültiges JSON'], ['kein json', 'Ungültiges JSON'], ['"text"', 'Ungültiges JSON'], ['123', 'Ungültiges JSON'], ['null', 'Ungültiges JSON'], ['true', 'Ungültiges JSON'], ['\uFEFF{"a":1}', 'Ungültiges JSON'], [Buffer.from([0x7b, 0x22, 0x61, 0x22, 0x3a, 0x22, 0xff, 0x22, 0x7d]), 'Ungültiges JSON'], ['{"a":1}{"b":2}', 'Ungültiges JSON'], ['', 'Leerer Inhalt']];
  for (const [inhalt, error] of ungueltig) {
    const r = call('POST', 'ablage=issues', RUNNER, inhalt); assert.strictEqual(r.code, 400, String(inhalt)); assert.deepStrictEqual(r.json, { ok: false, error });
    if (inhalt.length) { const g = call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync(inhalt)); assert.strictEqual(g.code, 400, 'gzip: ' + String(inhalt)); assert.deepStrictEqual(g.json, { ok: false, error }); }
  }
  assert.deepStrictEqual(call('POST', 'ablage=reports/daily-x.md', RUNNER, Buffer.from([0x23, 0x20, 0xff, 0xfe])).json, { ok: false, error: 'Ungültiger Text (kein UTF-8)' });
  assert.deepStrictEqual(call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'gzip' }, '{"a":1}').json, { ok: false, error: 'Inhalt lässt sich nicht entpacken' });
  assert.deepStrictEqual(call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync(daten).subarray(0, 20)).json, { ok: false, error: 'Inhalt lässt sich nicht entpacken' });
  assert.deepStrictEqual(call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'gzip' }, '').json, { ok: false, error: 'Inhalt lässt sich nicht entpacken' });
  assert.deepStrictEqual(call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'br' }, daten).json, { ok: false, error: 'Unbekannte Kodierung in X-Body-Encoding' });
  // zu groß: roh über 16 MB, und gzip, das sich auf über 16 MB entpackt (klein auf der Leitung)
  const riesig = Buffer.alloc(api.MAX_UPLOAD + 1, 0x20); riesig[0] = 0x5b; riesig[riesig.length - 1] = 0x5d;
  const r413 = call('POST', 'ablage=issues', RUNNER, riesig); assert.strictEqual(r413.code, 413); assert.deepStrictEqual(r413.json, { ok: false, error: 'Anfrage zu groß' });
  const bombe = zlib.gzipSync(riesig); assert.ok(bombe.length < 100 * 1024);
  const g413 = call('POST', 'ablage=issues', { ...RUNNER, 'x-body-encoding': 'gzip' }, bombe); assert.strictEqual(g413.code, 413); assert.deepStrictEqual(g413.json, { ok: false, error: 'Inhalt zu groß (höchstens 16 MB)' });
  const genau = riesig.subarray(1); genau[0] = 0x5b; assert.strictEqual(genau.length, api.MAX_UPLOAD);
  assert.strictEqual(call('POST', 'ablage=suggestions', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync(genau)).code, 200, 'genau 16 MB sind erlaubt');
  assert.strictEqual(fs.readFileSync(file('issues.json'), 'utf8'), vorher, 'abgelehnte Ablagen lassen die vorhandene Datei unverändert');
  assert.ok(!dateienIn(dir).concat(dateienIn(file('reports'))).some(f => f.startsWith('.neu-')), 'keine Zwischendateien übrig');
});

test('Ablage des Berichtsindex räumt auf: Berichte außerhalb des Index verschwinden, latest-* bleibt', () => {
  const { call, file } = setup(); fs.mkdirSync(file('reports'));
  const alle = ['daily-2026-05-01.md', 'daily-2026-05-01.json', 'daily-2026-11-19.md', 'daily-2026-11-19.json', 'daily-2026-11-20.md', 'daily-2026-11-20.json', 'weekly-2026-11-16-weekly.md', 'weekly-2026-11-16-weekly.json', 'monthly-2026-11-01-monthly.md', 'latest-daily.md', 'latest-daily.json', 'latest-weekly.md', 'notiz.txt'];
  for (const f of alle) fs.writeFileSync(file('reports', f), f.endsWith('.json') ? '{}' : '# ' + f);
  fs.writeFileSync(file('reports', '.neu-alt'), 'x'); fs.utimesSync(file('reports', '.neu-alt'), new Date(Date.now() - 7200e3), new Date(Date.now() - 7200e3)); fs.writeFileSync(file('reports', '.neu-frisch'), 'x');
  // ungültige Indexe werden abgelehnt und löschen nichts
  for (const kaputt of ['{}', '{"file":"daily-2026-11-20.md"}', '[1]', '[null]', '[{"kind":"daily"}]', '[{"file":"../issues.json"}]', '[{"file":"latest-daily.md"}]', '[{"file":"daily-2026-11-20.json"}]', '[{"file":"daily-2026-11-20.md"},{"file":7}]', '[[]]']) {
    const r = call('POST', 'ablage=reports', RUNNER, kaputt); assert.strictEqual(r.code, 400, kaputt); assert.deepStrictEqual(r.json, { ok: false, error: 'Ungültiger Berichtsindex' });
  }
  assert.deepStrictEqual(dateienIn(file('reports')), [...alle, '.neu-alt', '.neu-frisch'].sort(), 'nichts gelöscht');
  const index = [{ file: 'daily-2026-11-20.md', kind: 'daily', at: '2026-11-20T05:40:00.000Z', score: 91 }, { file: 'weekly-2026-11-16-weekly.md', kind: 'weekly', at: '2026-11-16T05:40:00.000Z', score: 90 }];
  const r = call('POST', 'ablage=reports', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync(JSON.stringify(index)));
  assert.strictEqual(r.code, 200); assert.deepStrictEqual(r.json, { ok: true, bytes: Buffer.byteLength(JSON.stringify(index)), entfernt: 5 });
  assert.deepStrictEqual(dateienIn(file('reports')), ['.neu-frisch', 'daily-2026-11-20.json', 'daily-2026-11-20.md', 'index.json', 'latest-daily.json', 'latest-daily.md', 'latest-weekly.md', 'notiz.txt', 'weekly-2026-11-16-weekly.json', 'weekly-2026-11-16-weekly.md'].sort());
  assert.deepStrictEqual(call('GET', 'd=reports').json, index); assert.strictEqual(call('GET', 'zustand=1').json.berichte, 2);
  assert.ok(fs.existsSync(file('issues.json')), 'außerhalb von reports/ wird nichts gelöscht');
  const leer = call('POST', 'ablage=reports', RUNNER, '[]'); assert.deepStrictEqual(leer.json, { ok: true, bytes: 2, entfernt: 4 }); assert.strictEqual(call('GET', 'zustand=1').json.berichte, 0);
});

test('handle() ohne create(): nutzt den Datenordner der Konfiguration', t => {
  const dir = tmp(); const alt = process.env.SEO_DATA_DIR; process.env.SEO_DATA_DIR = dir;
  const cfgPath = require.resolve('../config'); const apiPath = require.resolve('../lib/api'); delete require.cache[cfgPath]; delete require.cache[apiPath];
  try {
    let cfg; try { cfg = require('../config'); } catch (e) { return t.skip('config.js lässt sich gerade nicht laden: ' + e.message); }
    if (cfg.dataDir !== dir) return t.skip('config.js liest SEO_DATA_DIR nicht');
    fs.writeFileSync(path.join(dir, 'issues.json'), '{"issues":{},"runs":[]}');
    const r = require('../lib/api').handle('GET', new URLSearchParams('d=issues'), {}, Buffer.alloc(0)); assert.strictEqual(r.code, 200); assert.strictEqual(r.body.toString(), '{"issues":{},"runs":[]}');
  } finally { if (alt === undefined) delete process.env.SEO_DATA_DIR; else process.env.SEO_DATA_DIR = alt; delete require.cache[cfgPath]; delete require.cache[apiPath]; }
});

// ── Lokaler Server ───────────────────────────────────────────────────────────
/** Anfrage mit frei wählbaren Kopfzeilen (auch Host), ohne Weiterleitungen zu folgen. */
function anfrage(port, method, pfad, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: pfad, headers: { host: 'localhost:' + port, ...headers } }, res => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c).toString() })); });
    req.on('error', reject); req.end(body || undefined);
  });
}

test('server.js: nur 127.0.0.1, Umleitungen auf /seo/, Oberfläche, Daten-Vertrag, Sicherheitsköpfe', async () => {
  const { dir, file } = setup(); const center = path.join(tmp(), 'center.html'); fs.writeFileSync(center, '<!doctype html><title>SEO Center – Test</title>');
  const s = await server.start(0, { dataDir: dir, centerFile: center }); const port = s.address().port;
  try {
    assert.strictEqual(s.address().address, '127.0.0.1', 'nicht von außen erreichbar');
    for (const p of ['/', '/seo', '/seo?x=1']) { const r = await anfrage(port, 'GET', p); assert.strictEqual(r.status, 302, p); assert.strictEqual(r.headers.location, '/seo/'); }
    const ui = await anfrage(port, 'GET', '/seo/'); assert.strictEqual(ui.status, 200); assert.match(ui.headers['content-type'], /^text\/html/); assert.match(ui.body, /SEO Center – Test/);
    for (const r of [ui, await anfrage(port, 'GET', '/seo/daten.php?zustand=1'), await anfrage(port, 'GET', '/gibt-es-nicht')]) {
      assert.strictEqual(r.headers['cache-control'], 'no-store'); assert.strictEqual(r.headers['x-robots-tag'], 'noindex, nofollow'); assert.strictEqual(r.headers['x-content-type-options'], 'nosniff');
      assert.strictEqual(r.headers['x-frame-options'], 'DENY'); assert.match(r.headers['content-security-policy'], /default-src 'self'/); assert.ok(!/https?:\/\//.test(r.headers['content-security-policy']), 'keine fremden Quellen');
    }
    const z = await anfrage(port, 'GET', '/seo/daten.php?zustand=1'); assert.strictEqual(z.status, 200); assert.strictEqual(z.headers['content-type'], 'application/json; charset=utf-8'); assert.strictEqual(JSON.parse(z.body).ok, true);
    assert.strictEqual((await anfrage(port, 'GET', '/seo/daten.php?d=issues')).body, fs.readFileSync(file('issues.json'), 'utf8'));
    assert.strictEqual((await anfrage(port, 'GET', '/seo/daten.php?d=review')).status, 404);
    // Schreiben über HTTP: nur mit Kopfzeile und gleicher Herkunft
    const body = JSON.stringify({ state: 'freigegeben', note: 'ok' });
    assert.strictEqual((await anfrage(port, 'POST', '/seo/daten.php?review=' + ID, {}, body)).status, 403);
    assert.strictEqual((await anfrage(port, 'POST', '/seo/daten.php?review=' + ID, { ...XHR, origin: 'https://boese.example' }, body)).status, 403);
    const ok = await anfrage(port, 'POST', '/seo/daten.php?review=' + ID, { ...XHR, origin: 'http://localhost:' + port }, body); assert.strictEqual(ok.status, 200); assert.strictEqual(JSON.parse(ok.body).review.state, 'freigegeben');
    assert.strictEqual(JSON.parse(fs.readFileSync(file('review.json'), 'utf8'))[ID].note, 'ok');
    const up = await anfrage(port, 'POST', '/seo/daten.php?ablage=gsc-status', { ...RUNNER, 'x-body-encoding': 'gzip' }, zlib.gzipSync('{"connected":false}')); assert.deepStrictEqual(JSON.parse(up.body), { ok: true, bytes: 19 });
    const zuGross = await anfrage(port, 'POST', '/seo/daten.php?ablage=issues', RUNNER, Buffer.alloc(api.MAX_UPLOAD + 5, 0x20)); assert.strictEqual(zuGross.status, 413); assert.deepStrictEqual(JSON.parse(zuGross.body), { ok: false, error: 'Anfrage zu groß' });
    // alles andere gibt es nicht – insbesondere keine alte Pfad-API und keine Dateien aus dem Datenordner
    for (const p of ['/seo/api/overview', '/seo/api/issues', '/seo/center.html', '/seo/issues.json', '/seo/daten.php/x', '/seo/../config.js', '/issues.json']) { const r = await anfrage(port, 'GET', p); assert.strictEqual(r.status, 404, p); assert.deepStrictEqual(JSON.parse(r.body), { ok: false, error: 'Nicht gefunden' }); }
    assert.strictEqual((await anfrage(port, 'HEAD', '/seo/daten.php?zustand=1')).status, 405); assert.strictEqual((await anfrage(port, 'DELETE', '/seo/daten.php?d=issues', XHR)).status, 405);
    // fremder Hostname (Name zeigt auf 127.0.0.1): kein Zugriff ohne Login
    for (const host of ['boese.example', 'boese.example:' + port, 'localhost.boese.example']) { const r = await anfrage(port, 'GET', '/seo/daten.php?d=issues', { host }); assert.strictEqual(r.status, 403, host); assert.ok(!r.body.includes('Titel zu lang')); }
    assert.strictEqual((await anfrage(port, 'GET', '/seo/daten.php?zustand=1', { host: '127.0.0.1:' + port })).status, 200);
  } finally { await new Promise(r => s.close(r)); }
});

test('server.js: fehlt die Oberfläche noch, kommt ein verständlicher Hinweis statt eines Absturzes', async () => {
  const { dir } = setup(); const s = await server.start(0, { dataDir: dir, centerFile: path.join(tmp(), 'gibt-es-nicht.html') }); const port = s.address().port;
  try {
    const r = await anfrage(port, 'GET', '/seo/'); assert.strictEqual(r.status, 404); assert.match(r.headers['content-type'], /^text\/plain/); assert.match(r.body, /Oberfläche des SEO Centers fehlt noch/); assert.match(r.body, /center\.html/);
    assert.strictEqual((await anfrage(port, 'GET', '/seo/daten.php?zustand=1')).status, 200, 'Daten bleiben abrufbar');
  } finally { await new Promise(r => s.close(r)); }
});
