'use strict';
// Meldungen, Berichte und Workflow: verschärfte Befunde in den Zusammenfassungen, Reihenfolge Versand → Upload mit
// zweitem Versuch, Empfängeradresse nie im Actions-Log, Sammelbefunde mit ihren echten Seiten, deutsche Zeit in
// Berichten und Dateinamen, SEO-Status-Formel. Ohne Netz; geschrieben wird nur in Temp-Ordner.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const notify = require('../lib/notify');
const report = require('../lib/report');
const actions = require('../lib/actions');
const opportunities = require('../lib/opportunities');
const { IssueStore } = require('../lib/issues');

const B = 'https://kfz-zulassungsprofis.de';
const tmpOrdner = [];
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-meldungen-')); tmpOrdner.push(d); return d; };
test.after(() => { for (const d of tmpOrdner) fs.rmSync(d, { recursive: true, force: true }); });
const warte = () => new Promise(r => setTimeout(r, 5)); // ISO-Zeitstempel haben Millisekunden – Läufe sollen zeitlich getrennt sein
const cfg = () => ({ base: B, importantPaths: ['/', '/preise/'], notify: { enabled: false, to: '' }, center: { url: B + '/seo/' } });
const kanal = (items, k) => items.find(i => i.channel === k);
const keinVersand = () => { throw new Error('Transport darf hier nicht aufgerufen werden'); };

// ── Fund 2: Anstieg auf hoch/kritisch wird gemailt ─────────────────────────
test('Verschärft: Aktion läuft aus (mittel → hoch) steht in Tages- und Wochenmail – je Art einmal, kein Pendeln', async () => {
  const dir = tmp(); const store = new IssueStore(dir); const c = cfg(); const scope = ['aktion-laeuft-aus', 'preis-abweichend'];
  const aktion = severity => ({ rule: 'aktion-laeuft-aus', severity, approval: 'preis', file: 'config/preise.json', key: 'aktion', title: 'Aktion „Gründerrabatt“ endet am 31.12.2026' });
  let nr = 0;
  // Ablauf wie im Prüflauf: apply → build → send (hier ohne Versand: nur Outbox, die Zeitfenster rücken trotzdem vor)
  const lauf = async (kind, findings) => {
    await warte(); store.apply(findings, { runId: `${kind}-${++nr}`, scope, kind }); await warte();
    const items = notify.build(store, c, kind, {}); await notify.send(items, c, store, { env: {}, transport: keinVersand }); return items;
  };
  const tag = items => kanal(items, 'tageszusammenfassung'); const woche = items => kanal(items, 'wochenzusammenfassung');
  assert.strictEqual(tag(await lauf('daily', [aktion('mittel')])).skip, true, 'mittel ist keine Mail wert');
  const w1 = woche(await lauf('weekly', [aktion('mittel')])); assert.match(w1.subject, /: 0 neu wichtig, 0 behoben$/); assert.ok(!/Verschärft/.test(w1.body));
  assert.strictEqual(tag(await lauf('daily', [aktion('mittel')])).skip, true);
  // 3 Tage vor Ablauf: gleiche ID, jetzt hoch
  const t = tag(await lauf('daily', [aktion('hoch')]));
  assert.ok(!t.skip, 'der Anstieg auf hoch ist eine Neuigkeit');
  assert.strictEqual(t.subject, '[SEO-Autopilot] kfz-zulassungsprofis.de – Tageszusammenfassung: 0 neu wichtig, 1 verschärft, 0 behoben');
  assert.match(t.body, /\nVerschärft \(jetzt kritisch oder hoch\): 1\n• \[hoch\] Aktion „Gründerrabatt“ endet am 31\.12\.2026 – config\/preise\.json\n/);
  assert.match(t.body, /Neue wichtige Probleme seit [\d.]+: 0/, 'zählt nicht als neu');
  assert.strictEqual(tag(await lauf('daily', [aktion('hoch')])).skip, true, 'am nächsten Tag nicht noch einmal');
  const w2 = woche(await lauf('weekly', [aktion('hoch')]));
  assert.match(w2.subject, /Wochenzusammenfassung: 0 neu wichtig, 1 verschärft, 0 behoben$/, 'die Wochenmail deckt die Woche ab'); assert.match(w2.body, /Verschärft \(jetzt kritisch oder hoch\): 1/);
  // Pendeln hoch → mittel → hoch meldet nicht erneut
  assert.strictEqual(tag(await lauf('daily', [aktion('mittel')])).skip, true);
  assert.strictEqual(tag(await lauf('daily', [aktion('hoch')])).skip, true, 'schon einmal als hoch gemeldet');
  assert.match(woche(await lauf('weekly', [aktion('hoch')])).subject, /: 0 neu wichtig, 0 behoben$/);
  // Der Stand liegt in issues.json (wird mit hoch- und heruntergeladen)
  const neu = new IssueStore(dir); const id = neu.open()[0].id;
  assert.deepStrictEqual(neu.state.wichtigGemeldet.tag, [id]); assert.deepStrictEqual(neu.state.wichtigGemeldet.woche, [id]); assert.strictEqual(neu.state.wichtigGemeldet.monat, undefined);
});

test('Verschärft: mittel → kritisch zusätzlich zur Sofortmeldung; wieder aufgetreten und neu zählen nicht doppelt', async () => {
  const dir = tmp(); const store = new IssueStore(dir); const c = cfg(); const scope = ['index-drift', 'preis-abweichend', 'title-lang'];
  const f = (rule, severity) => ({ rule, severity, url: B + '/preise/', key: rule, title: 'Befund ' + rule });
  let nr = 0;
  const lauf = async (kind, findings) => { await warte(); store.apply(findings, { runId: `${kind}-${++nr}`, scope, kind }); await warte(); const items = notify.build(store, c, kind, {}); await notify.send(items, c, store, { env: {}, transport: keinVersand }); return items; };
  await lauf('weekly', [f('index-drift', 'mittel'), f('preis-abweichend', 'hoch')]);
  await lauf('daily', [f('index-drift', 'mittel')]); // preis-abweichend behoben
  const items = await lauf('daily', [f('index-drift', 'kritisch'), f('preis-abweichend', 'hoch'), f('title-lang', 'hoch')]);
  assert.strictEqual(kanal(items, 'sofort').ids.length, 1, 'kritisch: Sofortmeldung wie bisher');
  const t = kanal(items, 'tageszusammenfassung'); const liste = t.body.split('Die drei wichtigsten Maßnahmen')[0];
  assert.match(t.subject, /: 1 neu wichtig, 1 verschärft, 0 behoben$/);
  assert.match(liste, /Verschärft \(jetzt kritisch oder hoch\): 1\n• \[kritisch\] Befund index-drift – \/preise\/\n/);
  assert.match(liste, /Neue wichtige Probleme seit [\d.]+: 1\n• \[hoch\] Befund title-lang/); assert.match(liste, /Wieder aufgetreten: 1\n• \[hoch\] Befund preis-abweichend/);
  assert.strictEqual((liste.match(/Befund preis-abweichend/g) || []).length, 1, 'wieder aufgetreten steht nicht auch unter „Verschärft“');
  assert.strictEqual((liste.match(/Befund title-lang/g) || []).length, 1, 'neu steht nicht auch unter „Verschärft“');
  // Ohne festgehaltenen Stand (erste Zusammenfassung dieser Art): keine Verschärft-Zeile, Verhalten wie bisher
  const frisch = { state: { issues: {}, lastDigest: { tag: new Date(Date.now() - 3600e3).toISOString() } }, open: () => [{ id: 'x', status: 'offen', severity: 'hoch', title: 'alt', first_seen: '2026-01-01T00:00:00.000Z' }], all() { return this.open(); } };
  assert.strictEqual(kanal(notify.build(frisch, c, 'daily', {}), 'tageszusammenfassung').skip, true);
});

// ── Fund 3 und 7: Workflow ──────────────────────────────────────────────────
const WF = path.join(__dirname, '..', '..', '.github', 'workflows', 'seo-autopilot.yml');
/** Schritte des Workflows (ohne YAML-Bibliothek): Name, Textblock und Skript aus „run: |“. */
function schritte(yaml) {
  const z = yaml.split('\n'); const out = [];
  const start = z.map((l, i) => (/^ {6}- (name|uses):/.test(l) ? i : -1)).filter(i => i >= 0);
  start.forEach((s, k) => {
    const block = z.slice(s, k + 1 < start.length ? start[k + 1] : z.length); const name = (/^ {6}- name: (.*)$/.exec(block[0]) || [])[1] || null;
    const r = block.findIndex(l => /^ {8}run: \|\s*$/.test(l)); let run = null;
    if (r >= 0) { const zeilen = []; for (const l of block.slice(r + 1)) { if (l.trim() && !/^ {10}/.test(l)) break; zeilen.push(l.slice(10)); } run = zeilen.join('\n').replace(/\s+$/, '') + '\n'; }
    out.push({ name, text: block.join('\n'), run });
  });
  return out;
}
const bashDa = spawnSync('bash', ['-c', 'true']).status === 0;
/** Skript wie auf dem Runner ausführen (bash -eo pipefail), mit Attrappen für node und sleep. */
function fuehreAus(run, env, { echtesNode = false, cwd = tmp() } = {}) {
  const fake = tmp(); const log = path.join(fake, 'aufrufe.log'); fs.writeFileSync(log, '');
  fs.writeFileSync(path.join(fake, 'sleep'), '#!/bin/bash\necho "sleep $*" >> "$FAKE_LOG"\n', { mode: 0o755 });
  if (!echtesNode) fs.writeFileSync(path.join(fake, 'node'), '#!/bin/bash\n{ echo "node $*"; if [ -n "${SEO_NOTIFY_TO+x}" ]; then echo "  SEO_NOTIFY_TO=gesetzt"; else echo "  SEO_NOTIFY_TO=NICHT-GESETZT"; fi; } >> "$FAKE_LOG"\nexit "${FAKE_NODE_EXIT:-0}"\n', { mode: 0o755 });
  const datei = path.join(fake, 'schritt.sh'); fs.writeFileSync(datei, run);
  const r = spawnSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', datei], { cwd, encoding: 'utf8', env: { PATH: `${fake}:${path.dirname(process.execPath)}:${process.env.PATH}`, FAKE_LOG: log, ...env } });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), log: fs.readFileSync(log, 'utf8') };
}

test('Workflow: erst Prüflauf (Versand), dann Upload; scheitert der Upload, folgt ein zweiter Versuch nach Pause', t => {
  const yaml = fs.readFileSync(WF, 'utf8'); const st = schritte(yaml); const idx = n => st.findIndex(s => s.name === n);
  const lauf = st[idx('Prüflauf')], hoch = st[idx('Stand hochladen')], nochmal = st[idx('Stand hochladen (zweiter Versuch)')], sum = st[idx('Zusammenfassung')];
  assert.ok(lauf && hoch && nochmal && sum, 'alle Schritte vorhanden');
  assert.ok(idx('Prüflauf') < idx('Stand hochladen') && idx('Stand hochladen') < idx('Stand hochladen (zweiter Versuch)') && idx('Stand hochladen (zweiter Versuch)') < idx('Zusammenfassung'));
  assert.ok(!/^\s+if:/m.test(lauf.text), 'der Versand hängt nicht vom Upload ab (kritische Meldungen gehen auch bei gestörtem SEO Center hinaus)');
  assert.match(hoch.text, /\n {8}id: ablage\n/); assert.match(hoch.text, /\n {8}continue-on-error: true\n/, 'ein Fehlschlag beendet den Job noch nicht');
  assert.match(nochmal.text, /\n {8}id: ablage2\n/);
  assert.match(nochmal.text, /\n {8}if: \$\{\{ steps\.lauf\.outcome == 'success' && steps\.ablage\.outcome == 'failure' \}\}\n/, 'nur nach erfolgreichem Prüflauf und gescheitertem erstem Upload');
  assert.ok(!/continue-on-error/.test(nochmal.text), 'scheitert auch der zweite Versuch, schlägt der Job fehl');
  assert.match(nochmal.text, /SEO_CENTER_USER: \$\{\{ secrets\.ANALYTICS_USER \}\}/); assert.match(sum.text, /ABLAGE2: \$\{\{ steps\.ablage2\.outcome \}\}/);
  const m = /timeout-minutes: (\d+)/.exec(yaml); assert.ok(Number(m[1]) >= 25 + 30 + 5 + 10 + 12, 'Job-Grenze reicht für Warten, Prüflauf, Holen und beide Uploads');
  if (!bashDa) return t.skip('bash nicht vorhanden');
  const ok = fuehreAus(nochmal.run, { SEO_CENTER_URL: '', SEO_CENTER_USER: 'u', SEO_CENTER_PASSWORD: 'p' });
  assert.strictEqual(ok.code, 0, ok.out); assert.deepStrictEqual(ok.log.split('\n').filter(l => /^(sleep|node)/.test(l)), ['sleep 120', 'node seo-autopilot/bin/sync.js push'], 'erst Pause, dann push');
  assert.strictEqual(fuehreAus(nochmal.run, { SEO_CENTER_URL: '', FAKE_NODE_EXIT: '1' }).code, 1, 'Fehler wird durchgereicht');
  // Zusammenfassung (echtes node): zweiter Versuch geglückt bzw. beide gescheitert
  const zus = (ablage, ablage2) => {
    const cwd = tmp(); fs.mkdirSync(path.join(cwd, 'seo-autopilot', 'data', 'reports'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'seo-autopilot', 'data', 'reports', 'latest-daily.json'), JSON.stringify({ score: 88, open: 3, kritisch: 0, hoch: 2, neu: 1, behoben: 0 }));
    const summary = path.join(cwd, 'summary.md'); const r = fuehreAus(sum.run, { ART: 'daily', LAUF: 'success', ABLAGE: ablage, ABLAGE2: ablage2, GITHUB_STEP_SUMMARY: summary }, { echtesNode: true, cwd });
    assert.strictEqual(r.code, 0, r.out); return fs.readFileSync(summary, 'utf8');
  };
  assert.match(zus('success', ''), /Der Stand wurde ins SEO Center hochgeladen\.\n/);
  assert.match(zus('failure', 'success'), /hochgeladen \(im zweiten Versuch\)/);
  const nicht = zus('failure', 'failure'); assert.match(nicht, /NICHT vollständig hochgeladen/); assert.match(nicht, /\| SEO-Status \(Score, 0 bis 100\) \| 88 \|/);
});

test('Workflow: SEO_NOTIFY_TO kommt aus den Secrets, jede Adresse wird maskiert und steht nirgends im Log', t => {
  const yaml = fs.readFileSync(WF, 'utf8');
  assert.ok(!/vars\.SEO_NOTIFY_TO/.test(yaml), 'nie als Variable (Variablen erscheinen im Klartext im env-Block des Logs)');
  const lauf = schritte(yaml).find(s => s.name === 'Prüflauf');
  assert.match(lauf.text, /\n {10}SEO_NOTIFY_TO: \$\{\{ secrets\.SEO_NOTIFY_TO \}\}\n/);
  assert.strictEqual((yaml.match(/SEO_NOTIFY_TO: \$\{\{/g) || []).length, 1, 'nur der Prüflauf bekommt die Adresse');
  assert.ok(!/\$\{\{[^}]*SEO_NOTIFY_TO[^}]*\}\}/.test(yaml.replace('${{ secrets.SEO_NOTIFY_TO }}', '')), 'kein weiterer Ausdruck mit der Adresse (if:, Ausgaben)');
  if (!bashDa) return t.skip('bash nicht vorhanden');
  const r = fuehreAus(lauf.run, { ART: 'daily', SEO_NOTIFY: '1', SEO_NOTIFY_TO: ' eins@beispiel.test; zwei@beispiel.test ,, drei@beispiel.test ' });
  assert.strictEqual(r.code, 0, r.out);
  const masken = r.out.split('\n').filter(l => l.startsWith('::add-mask::'));
  assert.deepStrictEqual(masken, ['::add-mask::eins@beispiel.test', '::add-mask::zwei@beispiel.test', '::add-mask::drei@beispiel.test'], 'jede Adresse einzeln (GitHub zeigt diese Befehle nicht an)');
  assert.ok(!r.out.split('\n').filter(l => !l.startsWith('::add-mask::')).join('\n').includes('@'), 'sonst keine Adresse in der Ausgabe');
  assert.match(r.log, /node seo-autopilot\/bin\/autopilot\.js daily\n {2}SEO_NOTIFY_TO=gesetzt/);
  // wie lib/smtp.js parseAddresses: auch Leerzeichen, Tabulator und Zeilenumbruch trennen – jede Adresse bekommt ihre eigene Maske
  const ws = fuehreAus(lauf.run, { ART: 'daily', SEO_NOTIFY: '1', SEO_NOTIFY_TO: 'a@x.test b@y.test\tc@z.test\nd@w.test;e@v.test, \n f@u.test' });
  assert.strictEqual(ws.code, 0, ws.out);
  assert.deepStrictEqual(ws.out.split('\n').filter(l => l.startsWith('::add-mask::')), ['a@x.test', 'b@y.test', 'c@z.test', 'd@w.test', 'e@v.test', 'f@u.test'].map(a => '::add-mask::' + a), 'keine zusammengezogene Maske wie „a@x.testb@y.test“');
  assert.deepStrictEqual(ws.out.split('\n').filter(l => l.startsWith('::add-mask::')).map(l => l.slice(12)), require('../lib/smtp').parseAddresses('a@x.test b@y.test\tc@z.test\nd@w.test;e@v.test, \n f@u.test').valid, 'gleiche Trennung wie beim Versand');
  const leer = fuehreAus(lauf.run, { ART: 'daily', SEO_NOTIFY_TO: '' }); assert.strictEqual(leer.code, 0, leer.out); assert.ok(!/add-mask/.test(leer.out)); assert.match(leer.log, /SEO_NOTIFY_TO=NICHT-GESETZT/);
});

test('Meldungen: Empfängeradresse weder in Gründen noch in Fehlern noch in der Outbox', async () => {
  const dir = tmp(); const store = new IssueStore(dir); const ADR = 'geheim.empfang@beispiel.test';
  store.apply([{ rule: 'noindex-wichtig', severity: 'kritisch', url: B + '/', key: 'n', title: 'Kernseite auf noindex: /' }], { runId: 'd1', scope: ['noindex-wichtig'], kind: 'daily' });
  const c = { ...cfg(), notify: { enabled: true, to: ADR } };
  const items = notify.build(store, c, 'daily', {});
  const res = await notify.send(items, c, store, { env: { SMTP_USER: 'postfach@beispiel.test', SMTP_PASSWORD: 'pw-123456' }, transport: async o => { throw new Error(`550 5.1.1 <${o.to[0]}>: Recipient address rejected`); } });
  notify.writeOutbox(dir, items);
  const alles = JSON.stringify(res) + fs.readFileSync(path.join(dir, 'notifications.json'), 'utf8') + fs.readFileSync(path.join(dir, 'issues.json'), 'utf8');
  assert.ok(!alles.includes(ADR), 'Adresse nirgends'); assert.match(res.reason, /‹Adresse›/);
  const kaputt = { ...c, notify: { enabled: true, to: 'kaputt.adresse@' } };
  const ungueltig = await notify.send(notify.build(store, kaputt, 'weekly', {}), kaputt, store, { env: { SMTP_USER: 'postfach@beispiel.test', SMTP_PASSWORD: 'x' }, transport: keinVersand });
  assert.ok(!ungueltig.reason.includes('kaputt.adresse'), 'ungültige Adresse wird nicht wiederholt');
});

// ── Fund 14: Sammelbefunde mit ihren echten Seiten ──────────────────────────
const sammel = (id, o = {}) => ({ id, rule: 'zeit-versprechen', status: 'offen', severity: 'hoch', approval: 'recht', url: B + '/', key: 'alle:antwortzeit', title: 'Zusage einer Antwortzeit („in wenigen Minuten“) – 2 Seiten', count: 2, examples: [{ url: B + '/maxx/', title: 'x' }, { url: B + '/zulassung-per-whatsapp/', title: 'y' }], first_seen: new Date().toISOString(), ...o });
const anschein = () => sammel('s2', { rule: 'behoerden-anschein', severity: 'kritisch', key: 'alle:behördlich', title: 'Formulierung erweckt den Anschein einer Behörde („behördlich“): /ueber-uns/', count: 1, examples: [{ url: B + '/ueber-uns/', title: 'z' }] });

test('Sammelbefunde: Top-Maßnahmen nennen die betroffenen Seiten, Kernseiten-Bonus nur bei echten Kernseiten', () => {
  const c = cfg();
  assert.strictEqual(actions.impact(anschein(), c), 100, '/ueber-uns/ ist keine Kernseite – kein doppelter Wert wegen url = Startseite');
  assert.deepStrictEqual(actions.topActions([anschein()], c, 1)[0].urls, ['/ueber-uns/'], 'nicht „/“');
  assert.deepStrictEqual(actions.zielSeiten(anschein()), [B + '/ueber-uns/']);
  assert.deepStrictEqual(actions.zielSeiten({ url: B + '/preise/', key: 'p' }), [B + '/preise/'], 'normaler Befund: seine url');
  assert.deepStrictEqual(actions.zielSeiten({ url: B + '/', key: 'alle:x', examples: [] }), [B + '/'], 'ohne Beispiele: url');
  assert.deepStrictEqual(actions.zielSeiten({ file: 'config/preise.json' }), ['config/preise.json']);
  assert.strictEqual(actions.impact(sammel('s1', { examples: [{ url: B + '/' }, { url: B + '/gewerbe/' }] }), c), 160, 'betrifft die Startseite wirklich → Bonus');
  const top = actions.topActions([sammel('s1'), anschein(), sammel('s3', { key: 'alle:taggleich', examples: [{ url: B + '/gewerbe/autohaus/' }, { url: B + '/maxx/' }] }), { id: 'p', rule: 'preis-abweichend', status: 'offen', severity: 'hoch', url: B + '/preise/', title: 'Preis', key: 'p' }], c, 5);
  const by = Object.fromEntries(top.map(a => [a.rule, a]));
  assert.deepStrictEqual(by['behoerden-anschein'].urls, ['/ueber-uns/']); assert.strictEqual(by['behoerden-anschein'].impact, 100);
  assert.deepStrictEqual(by['zeit-versprechen'].urls, ['/maxx/', '/zulassung-per-whatsapp/', '/gewerbe/autohaus/'], 'Seiten aus examples, ohne Doppelte, nicht „/, /“');
  assert.deepStrictEqual(by['preis-abweichend'].urls, ['/preise/']); assert.strictEqual(by['preis-abweichend'].impact, 80, 'echte Kernseite behält den Bonus');
  assert.strictEqual(actions.ortText(sammel('s', { examples: [1, 2, 3, 4].map(n => ({ url: `${B}/s${n}/` })) })), '/s1/, /s2/, /s3/ …');
  // echter Stand (nur lesen, falls ein Crawl vorliegt): kein Sammelbefund zeigt „/“, wenn die Startseite nicht betroffen ist
  const echt = path.join(__dirname, '..', 'data', 'issues.json');
  if (fs.existsSync(echt)) {
    let st = null; try { st = JSON.parse(fs.readFileSync(echt, 'utf8')); } catch (_) { st = null; }
    for (const i of Object.values((st && st.issues) || {}).filter(x => x.status === 'offen' && String(x.key || '').startsWith('alle:') && Array.isArray(x.examples) && x.examples.length)) {
      const ohneStart = !i.examples.some(e => e && /^https?:\/\/[^/]+\/$/.test(e.url || ''));
      const a = actions.topActions([i], c, 1)[0]; if (ohneStart) assert.ok(!a.urls.includes('/'), `${i.rule}: ${a.urls.join(', ')}`);
    }
  }
});

test('Sammelbefunde: Bericht, Mail und Chancen nennen die betroffenen Seiten statt „– /“', () => {
  const issues = [sammel('s1'), anschein(), { id: 'p', rule: 'preis-abweichend', status: 'offen', severity: 'hoch', url: B + '/preise/', title: 'Preis weicht ab', key: 'p', first_seen: new Date().toISOString() }];
  const store = { state: { issues: Object.fromEntries(issues.map(i => [i.id, i])), lastDigest: { woche: new Date(Date.now() - 86400e3).toISOString() } }, open: () => issues, all: () => issues };
  const h = { kind: 'weekly', generatedAt: '2026-11-22T11:13:01.253Z', site: 'kfz-zulassungsprofis.de', score: 70, open: 3, kritisch: 1, hoch: 2, mittel: 0, niedrig: 0, neu: 0, behoben: 0, wieder: 0 };
  const md = report.md(h, store, { actions: actions.topActions(issues, cfg(), 5), resolved: [{ ...sammel('r1'), status: 'behoben' }], recurring: actions.recurring([{ ...sammel('w1'), reopen_count: 2, reopened_at: '2026-11-21T23:30:00.000Z' }]) });
  assert.match(md, /- \*\*Zusage einer Antwortzeit \(„in wenigen Minuten“\) – 2 Seiten\*\* – \/maxx\/, \/zulassung-per-whatsapp\/\n/);
  assert.match(md, /- \*\*Formulierung erweckt den Anschein einer Behörde \(„behördlich“\): \/ueber-uns\/\*\* – \/ueber-uns\/\n/);
  assert.match(md, /- \*\*Preis weicht ab\*\* – \/preise\/\n/, 'normale Befunde wie bisher');
  assert.ok(!/ – \/\n/.test(md) && !/ – \/,/.test(md), 'nirgends die Startseite als Ort');
  assert.match(md, /2 Seite\(n\), z\. B\. \/maxx\/, \/zulassung-per-whatsapp\//); assert.match(md, /1 Seite\(n\), z\. B\. \/ueber-uns\//);
  assert.match(md, /## Behoben seit dem letzten Lauf \(1\)\n\n- Zusage einer Antwortzeit .* – \/maxx\/, \/zulassung-per-whatsapp\//);
  assert.match(md, /## Wiederkehrende Probleme \(1\)\n\n- \*\*Zusage einer Antwortzeit .*\*\* – \/maxx\/, \/zulassung-per-whatsapp\/ \(2× wieder aufgetreten, zuletzt 2026-11-22\)/, 'Datum nach deutscher Zeit');
  const w = kanal(notify.build(store, cfg(), 'weekly', {}), 'wochenzusammenfassung').body;
  assert.match(w, /• \[hoch\] Zusage einer Antwortzeit \(„in wenigen Minuten“\) – 2 Seiten – \/maxx\/, \/zulassung-per-whatsapp\/\n/, 'Seiten statt „– /“, Seitenzahl nicht doppelt');
  assert.match(w, /• \[kritisch\] Formulierung erweckt den Anschein einer Behörde \(„behördlich“\): \/ueber-uns\/\n/, 'Pfad steht schon im Titel');
  assert.match(w, /Beispiel: .*\(\/maxx\/, \/zulassung-per-whatsapp\//, 'Top-Maßnahmen in der Mail');
  assert.ok(!/ – \/(\n| \()/.test(w), 'keine Startseite als Ort');
  const ch = opportunities.fromCrawl([sammel('t1', { rule: 'title-lang', count: 3, examples: [{ url: B + '/a/' }, { url: B + '/b/' }, { url: B + '/c/' }] })], null);
  assert.strictEqual(ch.length, 1); assert.strictEqual(ch[0].detail, '/a/, /b/, /c/'); assert.strictEqual(ch[0].url, B + '/a/');
});

// ── Fund 19: Zeit nach Europe/Berlin ───────────────────────────────────────
test('Berichte: Uhrzeit, Datum und Dateiname nach deutscher Zeit (Winter, Sommer, kurz vor Mitternacht)', () => {
  const vorab = report.md({ kind: 'daily', generatedAt: '2026-11-22T11:13:01.253Z', site: 'kfz-zulassungsprofis.de', score: 100, open: 0, kritisch: 0, hoch: 0, mittel: 0, niedrig: 0, neu: 0, behoben: 0, wieder: 0 }, { open: () => [] }, {});
  assert.match(vorab, /^# SEO-Tagesbericht kfz-zulassungsprofis\.de – 2026-11-22 12:13\n/, 'Kopfzeile in deutscher Zeit (UTC wäre 11:13)');
  assert.strictEqual(report.ortszeit('2026-11-22T11:13:01.253Z'), '2026-11-22 12:13');
  assert.strictEqual(report.ortszeit('2026-07-01T04:30:00Z'), '2026-07-01 06:30');
  assert.strictEqual(report.ortszeit('2026-12-31T23:30:00.000Z'), '2027-01-01 00:30');
  assert.strictEqual(report.ortszeit('2026-03-29T01:00:00Z'), '2026-03-29 03:00', 'Zeitumstellung');
  assert.strictEqual(report.ortsdatum('2026-11-22T23:30:00.000Z'), '2026-11-23'); assert.strictEqual(report.ortszeit('kaputt'), 'kaputt'); assert.strictEqual(report.ortszeit(undefined), '');
  const store = { open: () => [] }; const kopf = (kind, generatedAt) => ({ kind, generatedAt, site: 'kfz-zulassungsprofis.de', score: 100, open: 0, kritisch: 0, hoch: 0, mittel: 0, niedrig: 0, neu: 0, behoben: 0, wieder: 0 });
  const md = report.md(kopf('weekly', '2026-11-22T11:13:01.253Z'), store, { history: [{ at: '2026-07-01T04:30:00.000Z', kind: 'daily', score: 90, open: 1, new: 0, resolved: 0 }] });
  assert.match(md, /^# SEO-Wochenbericht kfz-zulassungsprofis\.de – 2026-11-22 12:13\n/, 'wie im SEO Center (12:13), nicht UTC (11:13)');
  assert.match(md, /\| 2026-07-01 06:30 \(daily\) \|/, 'Verlauf ebenfalls nach deutscher Zeit');
  const d = tmp();
  assert.strictEqual(path.basename(report.write({ dataDir: d }, kopf('daily', '2026-11-22T23:30:00.000Z'), '# x', {})), 'daily-2026-11-23.md', 'nach Mitternacht deutscher Zeit: neuer Tag');
  assert.strictEqual(path.basename(report.write({ dataDir: d }, kopf('weekly', '2026-07-05T22:15:00.000Z'), '# x', {})), 'weekly-2026-07-06-weekly.md');
  assert.strictEqual(JSON.parse(fs.readFileSync(path.join(d, 'reports', 'daily-2026-11-23.json'), 'utf8')).generatedAt, '2026-11-22T23:30:00.000Z', 'Datenfeld bleibt ISO/UTC');
  // Mail: Datum des Zeitfensters nach deutscher Zeit; reine Kalenderdaten (Google-Zeitraum) unverändert
  const s = { state: { issues: {}, lastDigest: { tag: '2026-12-06T23:30:00.000Z' } }, open: () => [], all: () => [] };
  const g = { connected: true, periods: { 7: { range: { start: '2026-11-27', end: '2026-12-03' }, current: { clicks: 1, impressions: 2, position: 3 }, previous: { clicks: 1, impressions: 2, position: 3 } } } };
  const body = kanal(notify.build(s, cfg(), 'weekly', { now: Date.parse('2026-12-07T07:30:00Z'), gsc: g }), 'wochenzusammenfassung').body;
  const tag = notify.build({ ...s, open: () => [{ id: 'h', status: 'offen', severity: 'hoch', title: 'neu', first_seen: '2026-12-07T05:00:00.000Z' }] }, cfg(), 'daily', { now: Date.parse('2026-12-07T07:30:00Z') });
  assert.match(kanal(tag, 'tageszusammenfassung').body, /Neue wichtige Probleme seit 07\.12\.2026: 1/, '23:30 UTC am 06.12. ist der 07.12. in Berlin');
  assert.match(body, /\(7 Tage, 27\.11\.2026–03\.12\.2026\)/);
});

// ── Fund 21: SEO-Status-Formel ──────────────────────────────────────────────
test('SEO-Status: 100 − min(30, 10×kritisch) − min(20, 4×hoch) − min(10, mittel) − min(5, niedrig); jeder Punkt einmal, info zählt nicht', () => {
  const o = (severity, count) => ({ severity, ...(count ? { count } : {}) }); const n = 471; const viele = (sev, k, count) => Array.from({ length: k }, () => o(sev, count));
  assert.strictEqual(report.score([], n), 100);
  assert.strictEqual(report.score(viele('hoch', 2), n), 92, 'zwei hohe Punkte (z. B. defekter-link, datei-defekt)');
  assert.strictEqual(report.score(viele('hoch', 5), n), 80); assert.strictEqual(report.score(viele('hoch', 9), n), 80, 'Abzug hoch gedeckelt (20)');
  assert.strictEqual(report.score([o('hoch', 471)], n), 96, 'ein Bündel ist ein Punkt');
  assert.strictEqual(report.score([o('kritisch')], n), 90); assert.strictEqual(report.score(viele('kritisch', 2), n), 80); assert.strictEqual(report.score(viele('kritisch', 4), n), 70, 'Abzug kritisch gedeckelt (30)');
  assert.strictEqual(report.score([o('mittel')], n), 99); assert.strictEqual(report.score(viele('mittel', 10), n), 90); assert.strictEqual(report.score(viele('mittel', 30), n), 90, 'Abzug mittel gedeckelt (10)');
  assert.strictEqual(report.score(viele('niedrig', 3), n), 97); assert.strictEqual(report.score(viele('niedrig', 10), n), 95, 'Abzug niedrig gedeckelt (5)');
  assert.strictEqual(report.score([o('niedrig', 709)], n), 99, 'ein niedriges Bündel über viele nicht indexierte Seiten ist ein Punkt');
  assert.strictEqual(report.score([o('niedrig')], 0), 99, 'ohne Seiten kein Fehler');
  assert.strictEqual(report.score([o('kritisch'), o('hoch', 471), o('mittel', 471), o('niedrig', 471), o('info', 471)], n), 84, 'info zählt nicht');
  assert.strictEqual(report.score([...viele('kritisch', 5), ...viele('hoch', 9), ...viele('mittel', 20), ...viele('niedrig', 9)], n), 35, 'alle Abzüge voll');
  assert.strictEqual(report.score(viele('info', 50), n), 100);
  for (let k = 0; k <= 3; k++) for (let h = 0; h <= 6; h++) for (let m = 0; m <= 11; m++) for (const ni of [0, 1, 30, 471]) {
    const s = report.score([...viele('kritisch', k), ...viele('hoch', h), ...viele('mittel', m), ...(ni ? [o('niedrig', ni)] : [])], n);
    assert.ok(s >= 0 && s <= 100); if (k || h || m) assert.ok(s < 100, `kritisch ${k}, hoch ${h}, mittel ${m} → ${s}`);
  }
  // Eine Stelle: der Berichtskopf (und damit Center, Mail, Actions-Zusammenfassung) nutzt report.score
  const st = { open: () => [o('hoch'), o('hoch')] };
  assert.strictEqual(report.header('daily', { runId: 'r', summary: { new: [], resolved: [], reopened: [] } }, st, { crawled: 500, indexable: n }).score, 92);
});
