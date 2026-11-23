'use strict';
// Vorberechnete Übersicht und Berichtsindex (lib/center-data.js). Beispieldaten sind klein und
// erfunden (example.test); alles liegt in eigenen Temp-Ordnern, ohne Netz.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const centerData = require('../lib/center-data');
const api = require('../lib/api');

// Temp-Ordner dieses Testlaufs; werden am Ende wieder entfernt (einige Tests schreiben Dateien von 16 MB).
const tmpOrdner = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-cd-')); tmpOrdner.push(d); return d; };
test.after(() => { for (const d of tmpOrdner) fs.rmSync(d, { recursive: true, force: true }); });
const BASE = 'https://example.test';
const NOW = Date.parse('2026-11-21T08:00:00.000Z');
const T = (tag, monat = 11) => `2026-${String(monat).padStart(2, '0')}-${String(tag).padStart(2, '0')}T05:40:00.000Z`;
const W = (dir, name, daten) => { const f = path.join(dir, name); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, typeof daten === 'string' ? daten : JSON.stringify(daten, null, 1)); };
const R = (dir, name) => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));

const cfg = dir => ({ base: BASE, dataDir: dir, importantPaths: ['/', '/preise/'], crawl: { maxPages: 2500, concurrency: 3, delayMs: 200 }, gsc: { property: 'sc-domain:example.test', credentialsFile: '/nirgendwo/schluessel.json' },
  notify: { enabled: true, to: 'empfaenger-geheim@example.test' }, center: { url: BASE + '/seo/', user: 'nutzer-geheim', password: 'passwort-geheim-123' } });

/** Regelmodule wie in lib/rules/, aber erfunden: eins ohne Anzeigename, eins mit Syntaxfehler, eins fehlt. */
function regelOrdner() {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'technical.js'), "module.exports = { rules: ['defekter-link', 'index-verlust', 'defekter-link'], gruppe: 'Technik (Test)', run: () => [] };");
  fs.writeFileSync(path.join(dir, 'meta.js'), "module.exports = { rules: ['title-lang', 'description-fehlt', 'og-image', 'h2-fehlt'], run: () => [] };");
  fs.writeFileSync(path.join(dir, 'schema.js'), 'module.exports = { rules: [ ;');
  fs.writeFileSync(path.join(dir, 'content.js'), "module.exports = { rules: ['werbeaussage', 7, ''], gruppe: 'Inhalte (Test)', labels: { werbeaussage: 'Werbeaussage ohne Beleg', kaputt: 5 } };");
  fs.writeFileSync(path.join(dir, 'kfz.js'), "module.exports = { rules: ['preis-abweichend', 'seite-geaendert'], gruppe: 'Preise (Test)' };");
  return dir;   // faq.js fehlt
}

const issue = (id, o) => ({ id, status: 'offen', first_seen: T(16), last_seen: T(20), runs: 3, notified: null, title: 'Befund ' + id, url: BASE + '/seite-' + id + '/', approval: 'auto', ...o });
function beispiel(dir) {
  const issues = {
    a00000000001: issue('a00000000001', { rule: 'preis-abweichend', severity: 'kritisch', approval: 'preis', url: BASE + '/preise/' }),
    a00000000002: issue('a00000000002', { rule: 'defekter-link', severity: 'hoch', count: 3, first_seen: T(20) }),
    a00000000003: issue('a00000000003', { rule: 'werbeaussage', severity: 'hoch', approval: 'recht', reopened_at: T(20), reopen_count: 2 }),
    a00000000004: issue('a00000000004', { rule: 'title-lang', severity: 'mittel', count: 40, first_seen: T(20), url: BASE + '/zulassungsstelle/*/' }),
    a00000000005: issue('a00000000005', { rule: 'og-image', severity: 'niedrig', first_seen: T(10) }),
    a00000000006: issue('a00000000006', { rule: 'seite-geaendert', severity: 'info', first_seen: T(20) }),
    a00000000007: issue('a00000000007', { rule: 'description-fehlt', severity: 'mittel', status: 'behoben', resolved_at: T(20) }),
    a00000000008: issue('a00000000008', { rule: 'h2-fehlt', severity: 'niedrig', status: 'behoben', first_seen: T(1, 9), resolved_at: T(1, 10) }),
    a00000000009: issue('a00000000009', { rule: 'unbekannte-regel', severity: 'hoch', first_seen: T(19) }),
  };
  const run = (runId, kind, at, o) => ({ runId, kind, at, findings: 7, new: 0, resolved: 0, reopened: 0, open: 7, bySeverity: { kritisch: 1, hoch: 3, mittel: 1, niedrig: 1, info: 1 }, suspicious: false, ...o });
  W(dir, 'issues.json', { issues, runs: [run('weekly-a', 'weekly', T(16), { new: 5 }), run('daily-b', 'daily', T(19), { new: 1 }), run('daily-c', 'daily', T(20), { new: 3, resolved: 1, reopened: 1 })], lastDigest: T(20) });
  const snap = (at, kind, score, o) => ({ at, kind, crawled: 120, fetched: 120, reused: 100, status: { 200: 117, 301: 2, 404: 1 }, open: 7, bySeverity: {}, score, indexable: 80, noindex: 37, typen: { start: { gesamt: 1, indexable: 1 }, behoerde: { gesamt: 60, indexable: 30 }, ratgeber: { gesamt: 20, indexable: 20 } }, ...o });
  W(dir, 'crawl-history.json', [snap(T(16), 'weekly', 84), snap(T(19), 'daily', 86), snap(T(20), 'daily', 88, { crawled: 121 })]);
  W(dir, 'gsc-status.json', { checkedAt: T(20), connected: false, reason: 'Kein Service-Account hinterlegt.', needed: ['Schritt 1', 'Schritt 2'], account: 'dienstkonto-geheim@example.iam' });
  W(dir, 'reports/daily-2026-11-20.md', '# Tagesbericht'); W(dir, 'reports/daily-2026-11-20.json', { kind: 'daily', generatedAt: T(20), score: 88, open: 7, kritisch: 1, hoch: 3, mittel: 1, niedrig: 1, neu: 3, behoben: 1, summary: { new: ['x'] } });
  W(dir, 'reports/weekly-2026-11-16-weekly.md', '# Wochenbericht'); W(dir, 'reports/weekly-2026-11-16-weekly.json', { kind: 'weekly', generatedAt: T(16), score: 84, open: 5, kritisch: 1, hoch: 2, neu: 5, behoben: 0 });
  W(dir, 'reports/latest-daily.md', '# Tagesbericht'); W(dir, 'reports/latest-daily.json', { kind: 'daily', generatedAt: T(20), score: 88 });
  return issues;
}

test('leerer Datenordner: nichts wirft, beide Dateien entstehen, die Übersicht ist vollständig und leer', () => {
  const dir = path.join(tmp(), 'noch', 'nicht', 'da');
  const { uebersicht: u, index } = centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() });
  assert.deepStrictEqual(index, []); assert.deepStrictEqual(R(dir, 'reports/index.json'), []); assert.deepStrictEqual(R(dir, 'uebersicht.json'), JSON.parse(JSON.stringify(u)));
  const erwartet = ['erzeugt', 'base', 'score', 'scoreHistory', 'lastChanges', 'lastRunSuspicious', 'suspiciousReasons', 'topActions', 'recurring', 'approvalNeeded', 'open', 'kritisch', 'hoch', 'mittel', 'niedrig', 'gepruefte', 'indexable', 'noindex', 'typen',
    'neu7', 'behoben7', 'letzterLauf', 'laeufe', 'crawlHistory', 'statusVerteilung', 'byRule', 'ruleGroups', 'ruleLabels', 'gsc', 'notify', 'zeitplan', 'version'];
  for (const k of erwartet) assert.ok(k in u, 'Feld ' + k);
  assert.strictEqual(u.erzeugt, '2026-11-21T08:00:00.000Z'); assert.strictEqual(u.base, BASE); assert.strictEqual(u.score, null); assert.strictEqual(u.lastChanges, null); assert.strictEqual(u.letzterLauf, null); assert.strictEqual(u.lastRunSuspicious, null);
  for (const k of ['scoreHistory', 'suspiciousReasons', 'topActions', 'recurring', 'laeufe', 'crawlHistory', 'byRule']) assert.deepStrictEqual(u[k], [], k);
  for (const k of ['approvalNeeded', 'open', 'kritisch', 'hoch', 'mittel', 'niedrig', 'gepruefte', 'neu7', 'behoben7']) assert.strictEqual(u[k], 0, k);
  assert.strictEqual(u.indexable, null); assert.strictEqual(u.noindex, null); assert.deepStrictEqual(u.typen, {}); assert.deepStrictEqual(u.statusVerteilung, {});
  assert.strictEqual(u.gsc.connected, false); assert.strictEqual(u.gsc.property, 'sc-domain:example.test'); assert.match(u.gsc.reason, /Noch kein Prüflauf/);
  assert.strictEqual(u.version, centerData.VERSION);
  assert.doesNotThrow(() => centerData.writeAll({}, tmp(), {}), 'auch ohne Konfiguration');
});

test('Beispieldaten: Kennzahlen, letzter Lauf, Änderungen, Verlauf', t => {
  const dir = tmp(); const issues = beispiel(dir);
  const { uebersicht: u } = centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() });
  assert.strictEqual(u.open, 7); assert.strictEqual(u.kritisch, 1); assert.strictEqual(u.hoch, 3); assert.strictEqual(u.mittel, 1); assert.strictEqual(u.niedrig, 1);
  assert.strictEqual(u.approvalNeeded, 2, 'preis + recht'); assert.strictEqual(u.neu7, 6, 'offen und in den letzten 7 Tagen zuerst gesehen'); assert.strictEqual(u.behoben7, 1, 'nur der jüngst behobene');
  assert.strictEqual(u.score, 88); assert.deepStrictEqual(u.scoreHistory, [{ at: T(16), score: 84, kind: 'weekly' }, { at: T(19), score: 86, kind: 'daily' }, { at: T(20), score: 88, kind: 'daily' }]);
  assert.strictEqual(u.gepruefte, 121); assert.strictEqual(u.indexable, 80); assert.strictEqual(u.noindex, 37); assert.deepStrictEqual(u.typen.behoerde, { gesamt: 60, indexable: 30 }); assert.deepStrictEqual(u.statusVerteilung, { 200: 117, 301: 2, 404: 1 });
  assert.strictEqual(u.letzterLauf.runId, 'daily-c'); assert.strictEqual(u.laeufe.length, 3); assert.strictEqual(u.crawlHistory.length, 3);
  assert.strictEqual(u.lastChanges.at, T(20));
  assert.deepStrictEqual(u.lastChanges.new.map(i => i.id).sort(), ['a00000000002', 'a00000000004', 'a00000000006']); assert.deepStrictEqual(u.lastChanges.resolved.map(i => i.id), ['a00000000007']); assert.deepStrictEqual(u.lastChanges.reopened.map(i => i.id), ['a00000000003']);
  assert.deepStrictEqual(u.lastChanges.new.find(i => i.id === 'a00000000004'), { id: 'a00000000004', rule: 'title-lang', severity: 'mittel', url: BASE + '/zulassungsstelle/*/', title: 'Befund a00000000004', count: 40, approval: 'auto' });
  assert.strictEqual(u.lastRunSuspicious, null); assert.deepStrictEqual(u.suspiciousReasons, []);
  assert.deepStrictEqual(u.byRule, [['defekter-link', 1], ['og-image', 1], ['preis-abweichend', 1], ['seite-geaendert', 1], ['title-lang', 1], ['unbekannte-regel', 1], ['werbeaussage', 1]]);
  let actions = null; try { actions = require('../lib/actions'); } catch (_) { t.diagnostic('lib/actions.js lässt sich gerade nicht laden – Maßnahmenliste nicht geprüft'); }
  if (actions) {
    assert.ok(u.topActions.length >= 3 && u.topActions.length <= 5); assert.strictEqual(u.topActions[0].rule, 'preis-abweichend', 'kritisch auf einer Kernseite zuerst'); assert.deepStrictEqual(u.topActions.map(a => a.rank), u.topActions.map((_, k) => k + 1));
    assert.ok(!u.topActions.some(a => a.rule === 'seite-geaendert' || a.rule === 'description-fehlt'), 'weder Hinweise noch Behobenes');
    assert.deepStrictEqual(u.recurring.map(r => r.id), ['a00000000003']); assert.strictEqual(u.recurring[0].reopen_count, 2);
  } else { assert.deepStrictEqual(u.topActions, []); assert.deepStrictEqual(u.recurring, []); }
  // Zähler zum Bearbeitungsstand und Befundlisten stehen nicht in der Übersicht
  assert.ok(!('review' in u) && !('issues' in u) && !('localCheck' in u)); assert.strictEqual(Object.keys(issues).length, 9);
});

test('Übersicht enthält keine Zugangsdaten, Adressen oder Schlüsselpfade', () => {
  const dir = tmp(); beispiel(dir);
  centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() }); const text = fs.readFileSync(path.join(dir, 'uebersicht.json'), 'utf8'); const u = JSON.parse(text);
  for (const geheim of ['geheim', 'passwort', 'nutzer-', '@', 'schluessel.json', dir]) assert.ok(!text.includes(geheim), 'nicht enthalten: ' + geheim);
  assert.deepStrictEqual(u.notify, { enabled: true }); assert.deepStrictEqual(u.gsc, { connected: false, reason: 'Kein Service-Account hinterlegt.', property: 'sc-domain:example.test', checkedAt: T(20) });
  W(dir, 'gsc-status.json', { connected: true, account: 'dienstkonto-geheim@example.iam', property: 'https://example.test/' });
  assert.deepStrictEqual(centerData.buildOverview(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() }).gsc, { connected: true, property: 'https://example.test/' });
  assert.deepStrictEqual(centerData.buildOverview({ ...cfg(dir), notify: { enabled: false, to: 'x@example.test' } }, dir, { now: NOW }).notify, { enabled: false });
});

test('Regelgruppen kommen aus den Regelmodulen; fehlende oder defekte Module ergeben leere Gruppen', () => {
  const dir = tmp(); beispiel(dir);
  const u = centerData.buildOverview(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() });
  assert.deepStrictEqual(u.ruleGroups, { technik: ['defekter-link', 'index-verlust'], meta: ['title-lang', 'description-fehlt', 'og-image', 'h2-fehlt'], schema: [], inhalt: ['werbeaussage'], faq: [], kfz: ['preis-abweichend', 'seite-geaendert'] });
  assert.deepStrictEqual(u.ruleGroupLabels, { technik: 'Technik (Test)', meta: 'Meta-Angaben', schema: 'Strukturierte Daten', inhalt: 'Inhalte (Test)', faq: 'FAQ', kfz: 'Preise (Test)' });
  assert.deepStrictEqual(u.ruleLabels, { werbeaussage: 'Werbeaussage ohne Beleg' }); assert.deepStrictEqual(u.ruleUngrouped, ['unbekannte-regel']);
  assert.deepStrictEqual(centerData.loadRuleGroups(regelOrdner()).skipped, ['schema', 'faq']);
  const leer = centerData.loadRuleGroups(path.join(tmp(), 'gibt-es-nicht')); assert.deepStrictEqual(Object.keys(leer.ruleGroups), ['technik', 'meta', 'schema', 'inhalt', 'faq', 'kfz']); assert.ok(Object.values(leer.ruleGroups).every(g => Array.isArray(g) && !g.length));
});

test('echte Regelmodule in lib/rules/: lassen sich laden oder werden übersprungen – nie ein Absturz', t => {
  let g; assert.doesNotThrow(() => { g = centerData.loadRuleGroups(path.join(__dirname, '..', 'lib', 'rules')); });
  assert.deepStrictEqual(Object.keys(g.ruleGroups), ['technik', 'meta', 'schema', 'inhalt', 'faq', 'kfz']);
  for (const [k, ids] of Object.entries(g.ruleGroups)) { assert.ok(Array.isArray(ids) && ids.every(id => typeof id === 'string' && id), k); assert.ok(typeof g.ruleGroupLabels[k] === 'string' && g.ruleGroupLabels[k]); }
  t.diagnostic('Regeln je Gruppe: ' + Object.entries(g.ruleGroups).map(([k, v]) => `${k} ${v.length}`).join(', ') + (g.skipped.length ? ' · übersprungen: ' + g.skipped.join(', ') : ''));
});

test('Score: aus dem Crawl-Verlauf, sonst aus dem Berichtsindex, sonst aus dem neuesten latest-Bericht', () => {
  const dir = tmp(); beispiel(dir); const opts = { now: NOW, rulesDir: regelOrdner() };
  // älterer Stand: Verlauf ohne Score
  W(dir, 'crawl-history.json', R(dir, 'crawl-history.json').map(h => { const o = { ...h }; for (const k of ['score', 'indexable', 'noindex', 'typen']) delete o[k]; return o; }));
  W(dir, 'reports/latest-weekly.json', { kind: 'weekly', generatedAt: T(16), score: 84 });
  let u = centerData.buildOverview(cfg(dir), dir, opts);
  assert.strictEqual(u.score, 88, 'neuester latest-Bericht (daily vom 20.), nicht der ältere Wochenbericht');
  assert.deepStrictEqual(u.scoreHistory, [{ at: T(16), score: 84, kind: 'weekly' }, { at: T(20), score: 88, kind: 'daily' }], 'aus dem Berichtsindex, aufsteigend');
  W(dir, 'reports/latest-weekly.json', { kind: 'weekly', generatedAt: '2026-11-20T09:00:00.000Z', score: 79 });
  assert.strictEqual(centerData.buildOverview(cfg(dir), dir, opts).score, 79, 'der neuere Wochenbericht gewinnt gegen den Tagesbericht');
  // gar keine Berichte von Läufen: nur latest-*
  for (const f of ['daily-2026-11-20.md', 'daily-2026-11-20.json', 'weekly-2026-11-16-weekly.md', 'weekly-2026-11-16-weekly.json']) fs.unlinkSync(path.join(dir, 'reports', f));
  u = centerData.buildOverview(cfg(dir), dir, opts);
  assert.deepStrictEqual(u.scoreHistory, [{ at: T(20), score: 88, kind: 'daily' }, { at: '2026-11-20T09:00:00.000Z', score: 79, kind: 'weekly' }]);
  // teils mit, teils ohne Score: nur Einträge mit Score, der letzte zählt
  W(dir, 'crawl-history.json', [{ at: T(18), kind: 'daily', crawled: 5 }, { at: T(19), kind: 'daily', crawled: 5, score: 61 }, { at: T(20), kind: 'weekly', crawled: 5, score: 0 }]);
  u = centerData.buildOverview(cfg(dir), dir, opts); assert.strictEqual(u.score, 0, 'Score 0 ist ein Wert, kein „fehlt“'); assert.deepStrictEqual(u.scoreHistory.map(s => s.score), [61, 0]);
});

test('Seitenzahlen: fehlen sie im Verlauf, werden sie aus dem letzten Crawl gezählt', () => {
  const dir = tmp(); beispiel(dir);
  W(dir, 'crawl-history.json', [{ at: T(20), kind: 'daily', crawled: 4, status: { 200: 4 } }]);
  let u = centerData.buildOverview(cfg(dir), dir, { now: NOW }); assert.strictEqual(u.indexable, null); assert.strictEqual(u.noindex, null); assert.deepStrictEqual(u.typen, {});
  W(dir, 'last-crawl.json', { at: T(20), pages: { a: { typ: 'start', indexable: true, noindex: false }, b: { typ: 'behoerde', indexable: false, noindex: true }, c: { typ: 'behoerde', indexable: true, noindex: false }, d: { indexable: false, noindex: false }, e: null } });
  u = centerData.buildOverview(cfg(dir), dir, { now: NOW });
  assert.strictEqual(u.indexable, 2); assert.strictEqual(u.noindex, 1); assert.deepStrictEqual(u.typen, { start: { gesamt: 1, indexable: 1 }, behoerde: { gesamt: 2, indexable: 1 }, sonst: { gesamt: 1, indexable: 0 } });
});

test('unsicherer Lauf: Hinweis und Gründe stehen in der Übersicht', () => {
  const dir = tmp(); beispiel(dir); const st = R(dir, 'issues.json');
  st.runs.push({ runId: 'daily-d', kind: 'daily', at: '2026-11-21T05:40:00.000Z', findings: 0, new: 0, resolved: 0, reopened: 0, open: 7, bySeverity: {}, suspicious: true, note: 'nur 3 URLs gecrawlt; URL-Zahl um 97 % gesunken (121 → 3)' }); W(dir, 'issues.json', st);
  const u = centerData.buildOverview(cfg(dir), dir, { now: NOW });
  assert.strictEqual(u.lastRunSuspicious, 'nur 3 URLs gecrawlt; URL-Zahl um 97 % gesunken (121 → 3)'); assert.deepStrictEqual(u.suspiciousReasons, ['nur 3 URLs gecrawlt', 'URL-Zahl um 97 % gesunken (121 → 3)']);
  assert.deepStrictEqual(u.lastChanges, { at: '2026-11-21T05:40:00.000Z', new: [], resolved: [], reopened: [] }, 'ein unsicherer Lauf schließt und öffnet nichts');
});

test('Zeitplan: drei Läufe mit Status aus den Daten (aktiv / überfällig / noch kein Lauf), Schutzmechanismen, Hinweis', () => {
  const dir = tmp(); beispiel(dir); const z = centerData.buildOverview(cfg(dir), dir, { now: NOW }).zeitplan;
  assert.deepStrictEqual(Object.keys(z), ['geplant', 'schutz', 'hinweis']); assert.strictEqual(z.geplant.length, 3);
  for (const g of z.geplant) { assert.deepStrictEqual(Object.keys(g), ['name', 'wann', 'cmd', 'status', 'letzter', 'kind', 'fristTage']); for (const k of ['name', 'wann', 'cmd', 'status']) assert.ok(typeof g[k] === 'string' && g[k], k); }
  // Art und Frist stehen mit in den Daten: Die Oberfläche rechnet den Status damit beim Aufruf neu (bleiben Läufe aus, entsteht keine neue Übersicht)
  assert.deepStrictEqual(z.geplant.map(g => [g.kind, g.fristTage]), [['daily', 3], ['weekly', 9], ['monthly', 33]]);
  assert.deepStrictEqual(z.geplant.map(g => g.cmd), ['autopilot.js daily', 'autopilot.js weekly', 'autopilot.js monthly']); assert.deepStrictEqual(z.geplant.map(g => g.letzter), [T(20), T(16), null]);
  assert.deepStrictEqual(z.geplant.map(g => g.wann), ['täglich ca. 05:30–06:30 Uhr', 'montags', 'am 1. des Monats']);
  assert.deepStrictEqual(z.geplant.map(g => g.status), ['aktiv · zuletzt 20.11.2026', 'aktiv · zuletzt 16.11.2026', 'noch kein Lauf']);
  // zehn Tage später ohne weiteren Lauf: beide überfällig; Datum in deutscher Zeit (23:30 UTC ist schon der nächste Tag)
  const spaeter = centerData.schedule(cfg(dir), [{ kind: 'daily', at: '2026-11-20T23:30:00.000Z' }, { kind: 'weekly', at: T(16) }, { kind: 'monthly', at: 'kaputt' }], NOW + 10 * 86400e3).geplant;
  assert.deepStrictEqual(spaeter.map(g => g.status), ['überfällig · zuletzt 21.11.2026', 'überfällig · zuletzt 16.11.2026', 'noch kein Lauf']);
  assert.ok(z.schutz.length >= 4 && z.schutz.every(s => typeof s === 'string' && s.length > 20)); assert.ok(z.schutz.some(s => /höchstens 3 Seiten gleichzeitig, 200 ms Pause, höchstens 2500 Seiten/.test(s)), 'Drosselung aus der Konfiguration');
  assert.match(z.hinweis, /GitHub Actions/);
  assert.ok(!/crontab|flock/i.test(JSON.stringify(z)), 'kein Zeitplan eines eigenen Servers – die Läufe startet GitHub Actions');
});

test('Berichtsindex: bisheriger Index + Berichte im Ordner, absteigend, älter als 180 Tage entfällt', () => {
  const dir = tmp(); beispiel(dir);
  W(dir, 'reports/index.json', [
    { file: 'daily-2026-11-20.md', kind: 'daily', at: T(20), score: 1, open: 99 },                    // liegt auch im Ordner → wird aus der Begleitdatei aufgefrischt
    { file: 'daily-2026-11-19.md', kind: 'daily', at: T(19), score: 86, open: 6, kritisch: 1, hoch: 2, neu: 1, behoben: 0, fremd: 'weg' }, // nur auf dem Server
    { file: 'monthly-2026-11-01-monthly.md', kind: 'monthly', at: T(1), score: 80, open: 9, kritisch: 0, hoch: 3, neu: 0, behoben: 0 },
    { file: 'daily-2026-05-26.md', kind: 'daily', at: T(26, 5), score: 70 },                           // 179 Tage alt → bleibt
    { file: 'daily-2026-05-25.md', kind: 'daily', at: T(25, 5), score: 70 },                           // gut 180 Tage alt → entfällt
    { file: 'daily-2025-01-01.md', kind: 'daily', at: '2025-01-01T05:40:00.000Z', score: 50 },
    { file: '../issues.md', at: T(20) }, { file: 'latest-daily.md', at: T(20) }, { file: 'daily-ohne-zeit.md' }, { file: 'daily-kaputt.md', at: 'gestern' }, null, 'text', 7,
  ]);
  W(dir, 'reports/daily-2026-11-21.md', '# heute, noch ohne Begleitdatei'); W(dir, 'reports/notiz.md', 'kein Bericht'); W(dir, 'reports/daily-2026-11-18.json', { kind: 'daily', generatedAt: T(18) });
  const index = centerData.writeAll(cfg(dir), dir, { now: NOW }).index;
  assert.deepStrictEqual(index.map(e => e.file), ['daily-2026-11-21.md', 'daily-2026-11-20.md', 'daily-2026-11-19.md', 'weekly-2026-11-16-weekly.md', 'monthly-2026-11-01-monthly.md', 'daily-2026-05-26.md']);
  assert.deepStrictEqual(index[1], { file: 'daily-2026-11-20.md', kind: 'daily', at: T(20), score: 88, open: 7, kritisch: 1, hoch: 3, neu: 3, behoben: 1 });
  assert.deepStrictEqual(index[2], { file: 'daily-2026-11-19.md', kind: 'daily', at: T(19), score: 86, open: 6, kritisch: 1, hoch: 2, neu: 1, behoben: 0 }, 'nur die vereinbarten Felder');
  assert.deepStrictEqual(index[0], { file: 'daily-2026-11-21.md', kind: 'daily', at: '2026-11-21T00:00:00.000Z', score: null, open: null, kritisch: null, hoch: null, neu: null, behoben: null }, 'ohne Begleitdatei: Art und Datum aus dem Namen');
  assert.deepStrictEqual(R(dir, 'reports/index.json'), index);
  // fortschreiben ist wiederholbar, und der Server nimmt den Index an
  assert.deepStrictEqual(centerData.writeIndex(dir, NOW), index);
  const server = tmp(); const r = api.create(server).handle('POST', new URLSearchParams('ablage=reports'), { 'x-requested-with': 'SEO-Autopilot' }, fs.readFileSync(path.join(dir, 'reports', 'index.json')));
  assert.strictEqual(r.code, 200, r.body);
  // gut ein halbes Jahr später ist alles herausgefallen – auch Berichte, die noch im Ordner liegen
  assert.deepStrictEqual(centerData.buildIndex(dir, NOW + 200 * 86400e3), []); assert.deepStrictEqual(centerData.buildIndex(tmp(), NOW), []);
});

test('unlesbare Dateien führen zu leeren Werten, nicht zu einem Abbruch; Schreiben ist wiederholbar', () => {
  const dir = tmp(); for (const f of ['issues.json', 'crawl-history.json', 'gsc-status.json', 'last-crawl.json', 'reports/index.json', 'reports/latest-daily.json', 'reports/daily-2026-11-20.json']) W(dir, f, '{"kaputt": ');
  W(dir, 'reports/daily-2026-11-20.md', '# Bericht');
  let r; assert.doesNotThrow(() => { r = centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() }); });
  assert.strictEqual(r.uebersicht.open, 0); assert.strictEqual(r.uebersicht.score, null); assert.deepStrictEqual(r.index.map(e => e.file), ['daily-2026-11-20.md']);
  for (const [f, inhalt] of [['issues.json', '[]'], ['issues.json', '{"issues":[1,2],"runs":"x"}'], ['issues.json', '{"issues":{"a":null,"b":5,"c":{"status":"offen"}},"runs":[null,7]}'], ['crawl-history.json', '{"a":1}'], ['crawl-history.json', '[null, 5, "x"]'], ['gsc-status.json', '[]'], ['reports/index.json', '{"file":"x"}']]) {
    W(dir, f, inhalt); assert.doesNotThrow(() => centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() }), f + ' ' + inhalt);
  }
  const eins = fs.readFileSync(path.join(dir, 'uebersicht.json'), 'utf8'); centerData.writeAll(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() });
  assert.strictEqual(fs.readFileSync(path.join(dir, 'uebersicht.json'), 'utf8'), eins, 'gleiche Dateien + gleiche Zeit = gleiche Übersicht');
  assert.ok(!fs.readdirSync(dir).concat(fs.readdirSync(path.join(dir, 'reports'))).some(f => f.startsWith('.neu-')), 'keine Zwischendateien übrig');
});

test('Zeitplan: fällt der 1. auf einen Montag, zählt der Monatslauf als Wochenlauf – kein Fehlalarm „überfällig“', () => {
  // Montag, 01.03.2027: der Workflow startet den Monatslauf statt des Wochenlaufs (er enthält alle Wochenprüfungen)
  const runs = [{ kind: 'weekly', at: '2027-02-22T05:40:00.000Z' }, { kind: 'daily', at: '2027-02-28T05:40:00.000Z' }, { kind: 'monthly', at: '2027-03-01T05:40:00.000Z' }, { kind: 'daily', at: '2027-03-05T05:40:00.000Z' }];
  const am = Date.parse('2027-03-05T08:00:00.000Z');
  let g = centerData.schedule(cfg(tmp()), runs, am).geplant;
  assert.deepStrictEqual(g.map(x => x.status), ['aktiv · zuletzt 05.03.2027', 'aktiv · zuletzt 01.03.2027', 'aktiv · zuletzt 01.03.2027']);
  assert.deepStrictEqual(g.map(x => x.letzter), ['2027-03-05T05:40:00.000Z', '2027-03-01T05:40:00.000Z', '2027-03-01T05:40:00.000Z']);
  // der neueste Lauf zählt, auch wenn die Liste nicht zeitlich geordnet ist; der Tageslauf zählt weiter nur Tagesläufe
  g = centerData.schedule(cfg(tmp()), [runs[2], runs[3], runs[0]], am).geplant;
  assert.deepStrictEqual(g.map(x => x.letzter), ['2027-03-05T05:40:00.000Z', '2027-03-01T05:40:00.000Z', '2027-03-01T05:40:00.000Z']);
  // ohne den Monatslauf bleibt der Wochenlauf überfällig (letzter Wochenlauf 11 Tage her, Frist 9)
  g = centerData.schedule(cfg(tmp()), runs.filter(r => r.kind !== 'monthly'), am).geplant;
  assert.deepStrictEqual(g.map(x => x.status), ['aktiv · zuletzt 05.03.2027', 'überfällig · zuletzt 22.02.2027', 'noch kein Lauf']);
});

test('Änderungen des letzten Laufs: Sammelbefunde (key „alle:…“) bringen ihre Seiten mit, nicht nur die Startseite', () => {
  const dir = tmp(); beispiel(dir); const st = R(dir, 'issues.json');
  const bsp = ['maxx', 'whatsapp', 'gewerbe', 'kontakt', 'faq', 'preise', 'ueber-uns'].map(p => ({ url: `${BASE}/${p}/`, title: 'Zusage /' + p + '/', current: 'noch heute', detail: 'Seitentext …' }));
  st.issues.a0000000000a = issue('a0000000000a', { rule: 'werbeaussage', severity: 'hoch', approval: 'recht', first_seen: T(20), url: BASE + '/', key: 'alle:noch heute', count: 7, examples: [null, { url: 5 }, ...bsp] });
  W(dir, 'issues.json', st);
  const u = centerData.buildOverview(cfg(dir), dir, { now: NOW, rulesDir: regelOrdner() });
  assert.deepStrictEqual(u.lastChanges.new.find(i => i.id === 'a0000000000a'), { id: 'a0000000000a', rule: 'werbeaussage', severity: 'hoch', url: BASE + '/', title: 'Befund a0000000000a', count: 7, approval: 'recht',
    key: 'alle:noch heute', examples: bsp.slice(0, 5).map(e => ({ url: e.url })) }, 'nur die Adressen, höchstens fünf');
  assert.ok(!('key' in u.lastChanges.new.find(i => i.id === 'a00000000004')), 'Einzelbefunde bleiben wie bisher');
});

// ── Oberfläche (public/seo/center.html) ohne Browser ─────────────────────────
// Das Inline-Skript läuft in einer vm mit Attrappen für DOM und Netz: Anfragen bleiben offen (kein Netz), die Daten
// setzt der Test direkt über setKern(). Geprüft werden die erzeugten HTML-Bausteine.
const vm = require('vm');
const CENTER = path.join(__dirname, '..', '..', 'public', 'seo', 'center.html');
function oberflaeche(opt = {}) {
  const skripte = [...fs.readFileSync(CENTER, 'utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
  assert.strictEqual(skripte.length, 1, 'genau ein Inline-Skript');
  const fehler = [], els = new Map();
  const el = () => ({ innerHTML: '', textContent: '', value: '', hidden: false, disabled: false, className: '', dataset: {}, style: {}, clientWidth: 0, offsetParent: null,
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false }, addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, getAttribute: () => null,
    focus() {}, append() {}, appendChild() {}, contains: () => false, closest: () => null, querySelector: () => el(), querySelectorAll: () => [], getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }) });
  const document = { getElementById: id => { if (!els.has(id)) els.set(id, el()); return els.get(id); }, querySelector: () => el(), querySelectorAll: () => [], addEventListener() {}, createElement: () => el(),
    body: el(), documentElement: { clientWidth: 1200 }, title: '', activeElement: null };
  const ctx = vm.createContext({ document, window: { addEventListener() {}, scrollTo() {}, getSelection: () => '' }, location: { origin: opt.origin || 'http://127.0.0.1:3500', pathname: '/seo/', hostname: opt.hostname || '127.0.0.1', hash: '', reload() {} },
    history: { replaceState() {} }, localStorage: { getItem: () => null, setItem() {} }, fetch: () => new Promise(() => {}), URL, URLSearchParams, setTimeout, clearTimeout,
    console: { log() {}, info() {}, debug() {}, warn: (...a) => fehler.push(a.join(' ')), error: (...a) => fehler.push(a.join(' ')) } });
  vm.runInContext(skripte[0][1], ctx, { filename: 'center.html' });
  const run = (code, daten) => { ctx.__json = JSON.stringify(daten === undefined ? null : daten); return vm.runInContext(code, ctx); };
  return {
    run, fehler, html: id => document.getElementById(id).innerHTML,
    jetzt: ms => vm.runInContext(`Date.now = () => ${Number(ms)}`, ctx),
    laden: d => run('(() => { const d = JSON.parse(__json); setKern({ ov: d.ov, iss: d.iss, rev: d.rev || {}, sug: d.sug || { items: [] }, hinweise: [] }); S.geladen = true; return true; })()', d),
  };
}
const LAUF = '2026-11-22T11:13:01.240Z', LAUF_MS = Date.parse(LAUF);
/** Daten wie nach einem Wochenlauf: ein Sammelbefund (Startseite + Beispielseiten), Einzelbefunde, ein behobener. Übersicht aus buildOverview. */
function uiDaten() {
  const dir = tmp(), neu = { first_seen: LAUF, last_seen: LAUF, runs: 1 };
  const issues = {
    b00000000001: issue('b00000000001', { ...neu, rule: 'zeit-versprechen', severity: 'hoch', approval: 'recht', url: BASE + '/', key: 'alle:noch heute', count: 2, title: 'Zusage „noch heute“ – 2 Seiten',
      examples: [{ url: BASE + '/maxx/', title: 'Zusage /maxx/', detail: 'Seitentext' }, { url: BASE + '/whatsapp/', title: 'Zusage /whatsapp/' }] }),
    b00000000002: issue('b00000000002', { ...neu, rule: 'title-lang', severity: 'hoch', url: BASE + '/preise/' }),
    b00000000003: issue('b00000000003', { ...neu, rule: 'security-header', severity: 'hoch', url: BASE + '/' }),
    b00000000004: issue('b00000000004', { ...neu, rule: 'index-verlust', severity: 'kritisch', url: BASE + '/zulassungsstelle/x/' }),
    b00000000005: issue('b00000000005', { rule: 'defekter-link', severity: 'hoch', status: 'behoben', first_seen: '2026-11-15T05:40:00.000Z', resolved_at: LAUF }),
  };
  W(dir, 'issues.json', { issues, runs: [{ runId: 'weekly-x', kind: 'weekly', at: LAUF, findings: 4, new: 4, resolved: 1, reopened: 0, open: 4, bySeverity: { kritisch: 1, hoch: 3 }, suspicious: false }] });
  return { ov: centerData.buildOverview(cfg(dir), dir, { now: LAUF_MS + 3600e3, rulesDir: regelOrdner() }), iss: R(dir, 'issues.json') };
}
const zeileVon = (html, id) => (html.split('<tr').find(z => z.includes(`data-id="${id}"`)) || '');

test('Oberfläche: Kurzlisten zeigen bei Sammelbefunden die betroffenen Seiten statt der Startseite (alte und neue Datenform)', () => {
  const ui = oberflaeche(), d = uiDaten();
  // alte Form der Übersicht: Kurzeinträge ohne key/examples → der volle Befund kommt aus issues.json
  d.ov.lastChanges.new = d.ov.lastChanges.new.map(({ key, examples, ...rest }) => rest);
  ui.laden(d); ui.run('renderUebersicht(); S.limit.aeNeu = 100; S.redraw.aeNeu(); 1');
  const z = zeileVon(ui.html('l-aeNeu'), 'b00000000001');
  assert.match(z, /href="https:\/\/example\.test\/maxx\/"[^>]*>\/maxx\/<\/a> <span class="sub">\+ 1 weitere<\/span>/);
  assert.ok(!/hide-m">\/<\/td>/.test(z), 'nicht nur „/“: ' + z);
  assert.match(zeileVon(ui.html('l-aeNeu'), 'b00000000002'), />\/preise\/<\/a>/, 'Einzelbefunde zeigen ihre Seite');
  // neue Form ohne passenden Befund (z. B. issues.json älter als die Übersicht): key/examples des Eintrags genügen
  const kurz = ui.run('kurzTabelle("t", JSON.parse(__json))', [{ id: 'ffffffffffff', severity: 'hoch', title: 'Sammel', url: BASE + '/', key: 'alle:x', examples: [{ url: BASE + '/gewerbe/' }], count: 3 }, { severity: 'niedrig', title: 'ohne ID', url: BASE + '/kontakt/' }]);
  assert.match(kurz, />\/gewerbe\/<\/a> <span class="sub">\+ 2 weitere<\/span>/); assert.match(kurz, />\/kontakt\/<\/a>/);
  assert.deepStrictEqual(ui.fehler, []);
});

test('Oberfläche: Google-Tabelle nennt die Seite, zu der die Zahlen gehören; Top-Maßnahmen vertragen Pfade und volle Adressen', async () => {
  const ui = oberflaeche(), d = uiDaten();
  d.ov.gsc = { connected: true, property: 'sc-domain:example.test' };
  d.ov.topActions = [{ rank: 1, rule: 'zeit-versprechen', severity: 'hoch', pages: 4, impact: 100, urls: ['/', '/', '/', '/'], approval: 'recht', action: 'Alte Form' },
    { rank: 2, rule: 'title-lang', severity: 'hoch', pages: 2, impact: 50, urls: [BASE + '/maxx/', '/whatsapp/', BASE + '/maxx/', '/gewerbe/', '/faq/'], approval: 'auto', action: 'Neue Form' }];
  // Bündel einer Seitenfamilie (Adresse mit *, key „familie:…“): über die Beispielseiten zugeordnet; ohne Beispiele nicht zuordenbar
  const fam = (id, fp, bsp) => ({ ...d.iss.issues.b00000000002, id, rule: 'thin-content', severity: 'mittel', url: BASE + fp, key: 'familie:' + fp, count: Math.max(1, bsp.length), title: 'Bündel ' + fp, examples: bsp.map(p => ({ url: BASE + p })) });
  d.iss.issues.b00000000006 = fam('b00000000006', '/kfz-zulassung/*/', ['/kfz-zulassung/hamburg/']);
  d.iss.issues.b00000000007 = fam('b00000000007', '/ratgeber/*/', []);
  d.iss.issues.b00000000008 = fam('b00000000008', '/kennzeichen/*/', ['/kennzeichen/a/', '/kennzeichen/b/']);
  ui.laden(d);
  const gsc = { connected: true, property: 'sc-domain:example.test', fetchedAt: LAUF, periods: { 30: { current: { clicks: 600, impressions: 12000 }, previous: {}, queries: [],
    pages: [{ page: BASE + '/', clicks: 500, impressions: 9000, position: 2.1 }, { page: BASE + '/maxx/', clicks: 30, impressions: 1200, position: 4.2 }, { page: BASE + '/preise/', clicks: 70, impressions: 1800, position: 3 },
      { page: BASE + '/kfz-zulassung/hamburg/', clicks: 9, impressions: 700, position: 6 }, { page: BASE + '/ratgeber/x/', clicks: 9, impressions: 900, position: 6 }, { page: BASE + '/kennzeichen/a/', clicks: 1, impressions: 60, position: 9 }, { page: BASE + '/kennzeichen/b/', clicks: 2, impressions: 300, position: 8 }] } } };
  ui.run('S.lazy.gsc = Promise.resolve(JSON.parse(__json)); S.lazy["gsc-analysis"] = Promise.resolve(null); 1', gsc);
  await ui.run('renderGoogle()');
  const z = zeileVon(ui.html('l-gBef'), 'b00000000001');
  assert.match(z, /<td class="wrap mono hide-m"><a href="https:\/\/example\.test\/maxx\/"[^>]*>\/maxx\/<\/a><\/td><td class="r">1\.200<\/td><td class="r">30<\/td>/, 'Zahlen und Seite von /maxx/: ' + z);
  assert.match(zeileVon(ui.html('l-gBef'), 'b00000000003'), />\/<\/a><\/td><td class="r">9\.000</, 'ein Befund der Startseite zeigt weiter die Startseite');
  assert.strictEqual(ui.run('verkehrsBefunde(JSON.parse(__json)).find(x => x.i.id === "b00000000001").seite', gsc), BASE + '/maxx/');
  const vb = id => JSON.parse(ui.run(`(() => { const x = verkehrsBefunde(JSON.parse(__json)).find(x => x.i.id === "${id}"); return JSON.stringify(x ? [x.seite, x.impressions] : null); })()`, gsc));
  assert.deepStrictEqual(vb('b00000000006'), [BASE + '/kfz-zulassung/hamburg/', 700], 'Bündel mit einer Seite: Zahlen dieser Seite');
  assert.deepStrictEqual(vb('b00000000008'), [BASE + '/kennzeichen/b/', 300], 'Bündel mit mehreren Seiten: Beispielseite mit den meisten Impressionen');
  assert.strictEqual(vb('b00000000007'), null, 'ohne Beispielseiten keine Zuordnung über die Adresse mit *');
  assert.match(zeileVon(ui.html('l-gBef'), 'b00000000006'), />\/kfz-zulassung\/hamburg\/<\/a><\/td><td class="r">700</);
  ui.run('renderUebersicht(); 1');
  const m = ui.html('ovMassnahmen');
  assert.match(m, /z\. B\. \/<\/div>/, 'alte Form: „/“ nur einmal'); assert.ok(!m.includes('z. B. /, /'));
  assert.match(m, /z\. B\. \/maxx\/, \/whatsapp\/, \/gewerbe\/<\/div>/, 'neue Form: Pfade, ohne Doppelte, höchstens drei');
  assert.deepStrictEqual(ui.fehler, []);
});

test('Oberfläche: Detail-Schublade zeigt die nächsten Schritte und die Freigabe aus suggestions.json (maskiert)', () => {
  const ui = oberflaeche(), d = uiDaten();
  d.sug = { at: LAUF, items: [{ id: 'b00000000001', rule: 'zeit-versprechen', file: 'app/maxx/page.tsx', approval: 'recht', freigabe: 'Rechtlich relevante Aussage – vor der Veröffentlichung rechtlich prüfen lassen und ausdrücklich freigeben.',
    schritte: ['Quelle öffnen: app/maxx/page.tsx', 'Zeitangaben kommen aus config/betrieb.json; danach `npm run check:daten` ausführen.', '<img src=x onerror=alert(1)> `<b>`', 7, ' '] }] };
  ui.laden(d);
  const h = ui.run('drawerHtml(S.byId.get("b00000000001"))');
  const block = (/<h3>Nächste Schritte<\/h3><ol class="steps">([\s\S]*?)<\/ol>/.exec(h) || [])[1];
  assert.ok(block, 'Block „Nächste Schritte“ fehlt');
  assert.strictEqual(block.split('<li>').length - 1, 3, 'nur Texte');
  assert.ok(block.includes('<code>npm run check:daten</code>')); assert.ok(block.includes('&lt;img src=x onerror=alert(1)&gt; <code>&lt;b&gt;</code>')); assert.ok(!/<img|<b>/.test(block));
  assert.ok(h.includes('Rechtlich relevante Aussage – vor der Veröffentlichung rechtlich prüfen lassen und ausdrücklich freigeben.'));
  assert.ok(!ui.run('drawerHtml(S.byId.get("b00000000002"))').includes('Nächste Schritte'), 'ohne Vorschlag kein leerer Block');
  assert.deepStrictEqual(ui.fehler, []);
});

test('Oberfläche: lokaler Check – „nicht lokal prüfbar“ statt „unverändert“, Hinweise und nicht vergleichbare Befunde sichtbar', async () => {
  const ui = oberflaeche(); ui.laden(uiDaten());
  const lc = { at: '2026-11-22T13:00:00.000Z', liveRunAt: LAUF, base: BASE, vergleich: true, pagesChecked: 10, pagesWithoutLocalFile: 0, rulesEvaluated: ['title-lang', 'zeit-versprechen', 'index-verlust'],
    rulesSkipped: ['Statuscodes, Weiterleitungen, Antwort-Header und Ladezeit (nur am Server prüfbar)'], before: { open: 2, bySeverity: { hoch: 2 } }, after: { open: 2, bySeverity: { hoch: 2 } },
    resolved: [{ id: 'b00000000001', rule: 'zeit-versprechen', severity: 'hoch', url: BASE + '/', title: 'Zusage „noch heute“ – 2 Seiten', count: 2 }],
    added: [{ id: 'c00000000001', rule: 'defekter-link', severity: 'hoch', url: BASE + '/neu/', title: 'Defekter Link (neu)', count: 1 }], unchanged: 1,
    notComparable: { open: 2, byRule: { 'security-header': 1, 'index-verlust': 1 } },
    byId: { b00000000001: 'lokal behoben', b00000000002: 'unverändert', b00000000003: 'nicht lokal prüfbar', b00000000004: 'nicht lokal prüfbar', c00000000001: 'neu entstanden', b00000000005: 'unbekannt<b>' },
    hinweise: ['Kein Live-Crawl (last-crawl.json) im Datenordner – Vergleichsregeln wie Indexverlust oder geänderte Seiten haben keine Basis.', 5], note: 'Vergleich der offenen Live-Befunde.' };
  ui.run('S.lc = JSON.parse(__json); 1', lc);
  const pills = id => (/<div class="pills">([\s\S]*?)<\/div>/.exec(ui.run(`drawerHtml(S.byId.get("${id}"))`)) || [])[1] || '';
  assert.match(pills('b00000000003'), /pill--grey">nicht lokal prüfbar</); assert.ok(!pills('b00000000003').includes('unverändert'));
  assert.match(pills('b00000000004'), /nicht lokal prüfbar/); assert.match(pills('b00000000002'), /pill--grey">lokal unverändert</); assert.match(pills('b00000000001'), /pill--green">lokal behoben</);
  assert.ok(!/lokal|prüfbar|unbekannt/.test(pills('b00000000005')), 'unbekannter Wert: keine Behauptung, nichts Ungeprüftes im HTML');
  assert.strictEqual(ui.run('prioritaet(S.lc).items.find(x => x.i.id === "b00000000004").lokal'), 'nicht lokal prüfbar');
  await ui.run('renderPrio()');
  assert.match(zeileVon(ui.html('prTabelle'), 'b00000000004'), /data-l="Lokal geprüft"><span class="pill pill--grey">nicht lokal prüfbar</); assert.ok(!zeileVon(ui.html('prTabelle'), 'b00000000004').includes('noch offen'));
  assert.match(zeileVon(ui.html('prTabelle'), 'b00000000002'), /noch offen/); assert.match(zeileVon(ui.html('prTabelle'), 'b00000000001'), /pill--green">behoben</);
  await ui.run('renderVergleich()');
  const k = ui.html('vgLokalBody');
  assert.ok(k.includes('Kein Live-Crawl (last-crawl.json) im Datenordner'), 'Hinweise des Checks'); assert.match(k, /2 weitere offene Live-Befunde sind am Build nicht prüfbar/); assert.match(k, /security-header 1, index-verlust 1/);
  assert.match(k, /offen im Regelumfang · 2 nicht lokal prüfbar/);
  assert.match(ui.html('l-lcBeh'), />\/maxx\/<\/a> <span class="sub">\+ 1 weitere/, 'lokal behobener Sammelbefund mit seinen Seiten'); assert.match(ui.html('l-lcNeu'), />\/neu\/<\/a>/);
  // ältere local-check.json ohne byId: nur „lokal behoben“ aus der Liste, sonst keine Behauptung
  ui.run('delete S.lc.byId; 1');
  assert.ok(!/lokal|prüfbar/.test(pills('b00000000003'))); assert.match(pills('b00000000001'), /lokal behoben/);
  assert.deepStrictEqual(ui.fehler, []);
});

test('Oberfläche: bleiben Läufe aus, wird der Zeitplan „überfällig“ und die Übersicht warnt; 7-Tage-Zahlen zählen ab heute', () => {
  const d = uiDaten();
  assert.strictEqual(d.ov.neu7, 4); assert.strictEqual(d.ov.behoben7, 1);
  let ui = oberflaeche(); ui.jetzt(LAUF_MS + 3600e3); ui.laden(d); ui.run('renderUebersicht(); renderAuto(); 1');
  assert.ok(!ui.html('ovHinweise').includes('kein Prüflauf'), 'kurz nach dem Lauf keine Warnung');
  assert.match(ui.html('ovLauf'), /In den letzten 7 Tagen: 1 behoben, 4 neu/);
  assert.match(ui.html('auBox'), /pill--green">aktiv · zuletzt 22\.11\.2026</);
  // 20 Tage ohne Lauf (z. B. Zeitplan pausiert): uebersicht.json bleibt alt, die Oberfläche muss es selbst merken
  ui = oberflaeche(); ui.jetzt(LAUF_MS + 20 * 864e5); ui.laden(d); ui.run('renderUebersicht(); renderAuto(); 1');
  assert.match(ui.html('ovHinweise'), /Seit 20 Tagen kein Prüflauf/);
  assert.match(ui.html('ovLauf'), /In den letzten 7 Tagen: 0 behoben, 0 neu/);
  assert.match(ui.html('auBox'), /pill--red">überfällig · zuletzt 22\.11\.2026</); assert.ok(!/pill--green">aktiv/.test(ui.html('auBox')));
  assert.match(ui.html('auBox'), /pill--grey">noch kein Lauf</, 'Läufe ohne Datum bleiben „noch kein Lauf“');
  assert.match(ui.html('ovHinweise'), /oder den Stand mit <code>node seo-autopilot\/bin\/sync\.js pull<\/code> holen/, 'lokal (127.0.0.1): Hinweis auf sync.js pull');
  // Schwelle = Frist des Tageslaufs (3 Tage): nach 2,5 Tagen keine Warnung (Tageslauf noch „aktiv“), nach 3,5 Tagen schon
  ui = oberflaeche(); ui.jetzt(LAUF_MS + 2.5 * 864e5); ui.laden(d); ui.run('renderUebersicht(); renderAuto(); 1');
  assert.ok(!ui.html('ovHinweise').includes('kein Prüflauf'), 'nach 2,5 Tagen noch keine Warnung'); assert.match(ui.html('auBox'), /pill--green">aktiv · zuletzt 22\.11\.2026</);
  ui = oberflaeche({ hostname: 'kfz-zulassungsprofis.de', origin: 'https://kfz-zulassungsprofis.de' }); ui.jetzt(LAUF_MS + 3.5 * 864e5); ui.laden(d); ui.run('renderUebersicht(); renderAuto(); 1');
  assert.match(ui.html('ovHinweise'), /Seit 3 Tagen kein Prüflauf/); assert.ok(!ui.html('ovHinweise').includes('sync.js'), 'auf dem Server kein Hinweis auf sync.js');
  // ältere Übersicht ohne Frist: Status wie in den Daten, die Warnung in der Übersicht kommt trotzdem
  const alt = JSON.parse(JSON.stringify(d)); for (const g of alt.ov.zeitplan.geplant) { delete g.fristTage; delete g.kind; }
  ui = oberflaeche(); ui.jetzt(LAUF_MS + 20 * 864e5); ui.laden(alt); ui.run('renderUebersicht(); renderAuto(); 1');
  assert.match(ui.html('auBox'), /aktiv · zuletzt 22\.11\.2026/); assert.match(ui.html('ovHinweise'), /Seit 20 Tagen kein Prüflauf/);
  assert.deepStrictEqual(ui.fehler, []);
});
