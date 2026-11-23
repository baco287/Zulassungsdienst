// Regel-Tests „Technisches SEO“ und „Meta & Überschriften“ gegen eine lokale Test-Website (echter Crawl).
//   node --test seo-autopilot/test/technik-meta.test.js
// Ohne Internet (nur 127.0.0.1); geschrieben wird ausschließlich in eigene Ordner unter os.tmpdir().
// Aufbau: Die Test-Website (fixtures/site.js) hat eine fehlerfreie Musterseite (/ok/) und je Regel mindestens
// eine bewusst fehlerhafte Seite. ERWARTET_* nennt je Regel exakt die betroffenen Adressen – jede andere
// Seite ist damit zugleich der Negativfall. Regeln, die einen besonderen Zustand brauchen (Vorschau-Build,
// gesperrte robots.txt, kaputte Sitemap, Weiterleitungsprüfungen, Vergleich mit dem Vorlauf), haben eigene Tests.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { start, seite, konfiguration, text, SICHER } = require('./fixtures/site');
const crawler = require('../lib/crawler');
const html = require('../lib/html');
const { fingerprint, IssueStore } = require('../lib/issues');
const { aggregate } = require('../lib/aggregate');
const technical = require('../lib/rules/technical');
const meta = require('../lib/rules/meta');

const klon = x => JSON.parse(JSON.stringify(x));
const pfad = f => { try { return new URL(f.url).pathname; } catch (_) { return f.url || f.file || ''; } };
const nach = (liste, rule) => liste.filter(f => f.rule === rule);
const pfade = (liste, rule) => nach(liste, rule).map(pfad).sort();
const fuer = (liste, rule, p) => nach(liste, rule).find(f => pfad(f) === p);
const ordner = [];
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `seo-regeln-${name}-`)); ordner.push(d); return d; };
/** Kopie eines Crawl-Ergebnisses mit geänderten Seiten bzw. Feldern – das Original bleibt unverändert. */
function mit(crawl, { seiten = {}, ...felder } = {}) {
  const pages = new Map(crawl.pages);
  for (const [p, patch] of Object.entries(seiten)) { const u = crawl.base + p; const alt = pages.get(u); assert.ok(alt, 'Seite fehlt im Crawl: ' + p); pages.set(u, { ...alt, ...patch, page: patch.page ? { ...alt.page, ...patch.page } : alt.page }); }
  return { ...crawl, ...felder, pages };
}

let site, cfg, erster, vorlauf, crawl, ctx, T, M;
const lauf = (s, c, prev) => crawler.crawl({ ...c.crawl, base: s.base, extraPaths: c.extraPaths, prev, offline: false });

test.before(async () => {
  site = await start(); cfg = konfiguration(site);
  // 1. Lauf ohne Vorlauf; daraus entsteht – wie beim Autopiloten – die Vergleichsbasis (last-crawl.json)
  erster = await lauf(site, cfg, null);
  vorlauf = klon(crawler.serialize(erster, []));
  const P = p => vorlauf.pages[site.base + p];
  P('/preise/').contentHash = 'anderer-stand'; P('/preise/').page.title = 'Alter Title der Preisseite';   // wichtige Seite hat sich geändert
  P('/leistungen/neuzulassung/').contentHash = 'anderer-stand';                                          // geändert, aber keine wichtige Seite
  Object.assign(P('/kfz-zulassung/aachen/'), { noindex: false, indexable: true, inSitemap: true });      // war indexierbar, ist jetzt noindex
  P('/fehlt/').status = 200;      // war erreichbar, liefert jetzt 404
  P('/fehler/').status = 200;     // war erreichbar, liefert jetzt 500
  P('/gesperrt/').status = 404;   // war 404, liefert jetzt 401
  P('/langsam/').ms = 5000;       // war schon im Vorlauf langsam
  // 2. Lauf mit Vorlauf: Grundlage der meisten Tests
  crawl = await lauf(site, cfg, vorlauf);
  ctx = { crawl, prev: vorlauf, cfg, hostChecks: [], soll: null };
  T = technical.run(ctx); M = meta.run(ctx);
});
test.after(async () => { await site.close(); for (const d of ordner) fs.rmSync(d, { recursive: true, force: true }); });

// ─── Schnittstelle und Form ──────────────────────────────────────────────────
test('Module: Schnittstelle { run, rules, gruppe }, Regel-IDs eindeutig, Kurztexte für jede Regel', () => {
  assert.equal(technical.gruppe, 'Technisches SEO'); assert.equal(meta.gruppe, 'Meta & Überschriften');
  for (const m of [technical, meta]) {
    assert.equal(typeof m.run, 'function'); assert.ok(Array.isArray(m.rules) && m.rules.length);
    assert.equal(new Set(m.rules).size, m.rules.length, 'keine doppelten Regel-IDs');
    assert.deepEqual(Object.keys(m.labels).sort(), m.rules.slice().sort(), 'Kurztext für jede Regel');
  }
  assert.equal(technical.rules.filter(r => meta.rules.includes(r)).length, 0, 'keine Regel in beiden Modulen');
  for (const r of ['index-verlust', 'index-drift', 'sitemap-index-abweichung', 'entwurf-oeffentlich', 'host-weiterleitung', 'alte-domain-weiterleitung', 'datei-defekt', 'vorschau-noindex']) assert.ok(technical.rules.includes(r), r);
});

test('Befunde: gültige Form, Regel im Regelumfang, stabile Schlüssel, Quelldateien statt Build-Ordner, keine Server-Interna', () => {
  const alle = [...T, ...M]; assert.ok(alle.length > 40);
  const verboten = new RegExp([['ng', 'inx'], ['pm', '2'], ['volt', '-?gas'], ['tarif', 'rechner'], ['generate-', 'sitemap'], ['/var', '/www']].map(t => t.join('')).join('|'), 'i');
  const ids = new Set();
  for (const f of alle) {
    const wo = `${f.rule} ${f.url}`;
    assert.ok((f.rule && technical.rules.includes(f.rule)) || meta.rules.includes(f.rule), wo);
    assert.ok(['kritisch', 'hoch', 'mittel', 'niedrig', 'info'].includes(f.severity), wo);
    assert.ok(['auto', 'manuell', 'preis', 'recht'].includes(f.approval), wo);
    assert.ok(typeof f.title === 'string' && f.title && typeof f.detail === 'string' && f.detail, wo);
    assert.ok(f.url && /^https?:\/\//.test(f.url), wo);
    assert.ok(typeof f.key === 'string' && f.key, 'Schlüssel gesetzt: ' + wo);
    assert.ok(!/\d{2,}/.test(f.key.replace(/^(title|description):.*/, '')), 'Schlüssel ohne Messwert: ' + wo + ' ' + f.key);
    if (f.file !== undefined) assert.match(f.file, /^(app|lib|public|deploy|config)\//, wo);
    assert.equal(verboten.exec([f.title, f.detail, f.suggestion, f.reason, f.risk, f.file].join(' ')), null, wo);
    const id = fingerprint(f); assert.ok(!ids.has(id), 'Fingerprint doppelt: ' + wo + ' ' + f.key); ids.add(id);
  }
  assert.equal(nach(T, 'entwurf-oeffentlich').every(f => f.approval === 'recht'), true);
  assert.equal(T.filter(f => f.rule !== 'entwurf-oeffentlich').every(f => f.approval === 'auto'), true);
  assert.equal(M.every(f => f.approval === 'manuell'), true);
  // Quelltext der Regeln und der Test-Website: keine Interna eines anderen Einsatzortes
  for (const f of ['lib/rules/technical.js', 'lib/rules/meta.js', 'test/fixtures/site.js']) { const m = verboten.exec(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')); assert.equal(m, null, `${f}: „${m && m[0]}“`); }
});

// ─── Technik: Hauptlauf ──────────────────────────────────────────────────────
const ERWARTET_TECHNIK = {
  'datei-defekt': ['/downloads/fehlt.pdf'],
  'serverfehler': ['/fehler/'],
  'sitemap-404': ['/fehlt/'],
  'defekter-link': ['/kaputt/'],
  'gesperrt': ['/gesperrt/'],
  'erreichbarkeit-verlust': ['/fehlt/'],
  'status-aenderung': ['/gesperrt/'],
  'redirect-loop': ['/loop/'],
  'redirect-kette': ['/endlos/', '/weiter/'],
  'sitemap-redirect': ['/weiter/'],
  'seite-geaendert': ['/preise/'],
  'noindex-wichtig': ['/wichtig-noindex/'],
  'noindex-sitemap': ['/noindex-in-sitemap/'],
  'index-verlust': ['/kfz-zulassung/aachen/'],
  'sitemap-index-abweichung': ['/zulassungsstelle/*/', '/zulassungsstelle/*/'],
  'entwurf-oeffentlich': ['/entwurf-agb/', '/entwurf-liste/'],
  'robots-sitemap': ['/intern/seite/'],
  'robots-wichtig': ['/intern/wichtig/'],
  'canonical-fehlt': ['/ohne/'],
  'canonical-fremd': ['/canonical-fremd/'],
  'canonical-ziel': ['/canonical-weiter/', '/kaputt-canonical/'],
  'sitemap-canonical': ['/sm-canonical/'],
  'index-html-dublette': ['/alt/index.html'],
  'verwaist': ['/verwaist/'],
  'langsam': ['/langsam/'],
  'sitemap-fehlt': ['/nicht-in-sitemap/'],
};

test('Crawl der Test-Website: Struktur wie erwartet', () => {
  const r = p => crawl.pages.get(site.base + p);
  assert.ok(crawl.pages.size >= 60);
  assert.equal(r('/ok/').indexable, true); assert.equal(r('/kfz-zulassung/berlin/').indexable, true); assert.equal(r('/kfz-zulassung/berlin/').page.robots, null);
  assert.equal(r('/kfz-zulassung/aachen/').noindex, true); assert.equal(r('/kennzeichen/b/').noindex, true); assert.equal(r('/impressum/').noindex, true);
  assert.equal(r('/zulassungsstelle/berlin/').typ, 'behoerde'); assert.equal(r('/leistungen/neuzulassung/').typ, 'leistung');
  assert.equal(r('/fehlt/').status, 404); assert.equal(r('/loop/').loop, true); assert.equal(r('/endlos/').tooManyHops, true); assert.equal(r('/weiter/').chain.length, 2);
  assert.equal(r('/intern/seite/').robotsAllowed, false); assert.equal(r('/servicebedingungen/').inlinks, 0);
  assert.equal(r('/auftrag/').status, 200, 'Query-Variante zählt als /auftrag/'); assert.equal(crawl.pages.has(site.base + '/auftrag/?leistung=neuzulassung'), false);
  assert.equal(crawl.dateien.get(site.base + '/downloads/anleitung.pdf').status, 200);
  assert.equal(crawl.stats.limitErreicht, false);
});

test('Technik: je Regel genau die erwarteten Adressen (Positiv- und Negativfälle)', () => {
  for (const rule of technical.rules) assert.deepEqual(pfade(T, rule), ERWARTET_TECHNIK[rule] || [], rule);
});

test('Technik: /ok/ und die übrigen fehlerfreien Seiten bleiben ohne Befund', () => {
  for (const p of ['/', '/ok/', '/auftrag/', '/leistungen/', '/leistungen/neuzulassung/', '/kfz-zulassung/', '/kfz-zulassung/berlin/', '/zulassungsstelle/', '/zulassungsstelle/berlin/', '/kennzeichen/', '/kennzeichen/hog/', '/kennzeichen/b/', '/impressum/', '/datenschutz/', '/servicebedingungen/', '/404/', '/google1a2b3c4d5e6f7a8b.html'])
    assert.deepEqual([...T, ...M].filter(f => pfad(f) === p).map(f => f.rule), [], p);
});

test('Technik: Schweregrade, Hinweise und Quelldateien der einzelnen Befunde', () => {
  const b = (rule, p) => { const f = fuer(T, rule, p); assert.ok(f, `${rule} ${p}`); return f; };
  assert.equal(b('sitemap-404', '/fehlt/').severity, 'hoch'); assert.equal(b('sitemap-404', '/fehlt/').file, 'app/sitemap.ts');
  assert.equal(b('defekter-link', '/kaputt/').severity, 'mittel'); assert.match(b('defekter-link', '/kaputt/').detail, /Verlinkt von: \/$/);
  assert.equal(b('gesperrt', '/gesperrt/').severity, 'mittel'); assert.equal(b('gesperrt', '/gesperrt/').file, 'public/.htaccess');
  // Serverfehler: ein Befund – der Wechsel „vorher erreichbar“ steht im Text, nicht als zweite Meldung
  assert.equal(b('serverfehler', '/fehler/').severity, 'hoch'); assert.match(b('serverfehler', '/fehler/').title, /Serverfehler 500/); assert.match(b('serverfehler', '/fehler/').detail, /Im letzten Lauf war die Seite erreichbar/);
  assert.equal(b('erreichbarkeit-verlust', '/fehlt/').severity, 'kritisch', 'Sitemap-Adresse war erreichbar und ist es nicht mehr');
  assert.match(b('status-aenderung', '/gesperrt/').title, /404 → 401/); assert.equal(b('status-aenderung', '/gesperrt/').severity, 'niedrig');
  assert.equal(b('redirect-loop', '/loop/').severity, 'kritisch');
  assert.equal(b('redirect-kette', '/endlos/').severity, 'hoch'); assert.equal(b('redirect-kette', '/weiter/').severity, 'niedrig'); assert.match(b('redirect-kette', '/weiter/').detail, /301 → \/weiter2\/, 302 → \/ok\//);
  assert.equal(b('sitemap-redirect', '/weiter/').severity, 'mittel');
  // Änderungserkennung: Hinweis, nur wichtige Seiten, nennt was sich geändert hat
  const g = b('seite-geaendert', '/preise/'); assert.equal(g.severity, 'info'); assert.equal(g.key, 'geaendert'); assert.match(g.detail, /Title \(„Alter Title der Preisseite“ → „Preise für die Kfz-Zulassung online \| KFZ-Zulassungsprofis“\)/);
  assert.equal(crawl.pages.get(site.base + '/leistungen/neuzulassung/').changed, true, 'geändert, aber nicht wichtig → kein Befund');
  assert.equal(b('noindex-wichtig', '/wichtig-noindex/').severity, 'kritisch');
  assert.equal(b('noindex-sitemap', '/noindex-in-sitemap/').severity, 'mittel'); assert.equal(b('noindex-sitemap', '/noindex-in-sitemap/').file, 'app/sitemap.ts');
  const v = b('index-verlust', '/kfz-zulassung/aachen/'); assert.equal(v.severity, 'hoch'); assert.equal(v.file, 'lib/indexGate.ts'); assert.match(v.detail, /noindex, follow/); assert.match(v.suggestion, /indexGate\.ts/);
  assert.equal(b('robots-sitemap', '/intern/seite/').severity, 'hoch'); assert.equal(b('robots-wichtig', '/intern/wichtig/').severity, 'kritisch'); assert.equal(b('robots-wichtig', '/intern/wichtig/').file, 'app/robots.ts');
  const cf = b('canonical-fehlt', '/ohne/'); assert.equal(cf.severity, 'mittel'); assert.equal(cf.proposed, site.base + '/ohne/'); assert.match(cf.suggestion, /app\/layout\.tsx/);
  assert.equal(b('canonical-fremd', '/canonical-fremd/').severity, 'mittel');
  assert.equal(b('canonical-ziel', '/kaputt-canonical/').severity, 'hoch'); assert.equal(b('canonical-ziel', '/canonical-weiter/').severity, 'mittel'); assert.match(b('canonical-ziel', '/canonical-weiter/').title, /leitet weiter/);
  assert.equal(b('sitemap-canonical', '/sm-canonical/').severity, 'mittel'); assert.match(b('sitemap-canonical', '/sm-canonical/').title, /→ \/ok\/$/);
  assert.equal(b('index-html-dublette', '/alt/index.html').severity, 'niedrig');
  assert.equal(b('verwaist', '/verwaist/').severity, 'mittel');
  assert.equal(b('sitemap-fehlt', '/nicht-in-sitemap/').severity, 'niedrig'); assert.equal(b('sitemap-fehlt', '/nicht-in-sitemap/').file, 'app/sitemap.ts');
  const d = b('datei-defekt', '/downloads/fehlt.pdf'); assert.equal(d.severity, 'hoch'); assert.match(d.detail, /HTTP 404\. Verlinkt von: \/\./); assert.match(d.suggestion, /public\//);
  const l = b('langsam', '/langsam/'); assert.equal(l.severity, 'niedrig'); assert.match(l.detail, /5000 ms im letzten/);
});

test('Technik: ein Befund je Ursache (keine Doppelmeldungen)', () => {
  const regeln = p => T.filter(f => pfad(f) === p).map(f => f.rule).sort();
  assert.deepEqual(regeln('/wichtig-noindex/'), ['noindex-wichtig'], 'wichtige noindex-Seite in der Sitemap: nicht zusätzlich noindex-sitemap');
  assert.deepEqual(regeln('/intern/wichtig/'), ['robots-wichtig'], 'gesperrte wichtige Seite: nicht zusätzlich robots-sitemap oder verwaist');
  assert.deepEqual(regeln('/intern/seite/'), ['robots-sitemap']);
  assert.deepEqual(regeln('/loop/'), ['redirect-loop'], 'Schleife: nicht zusätzlich Serverfehler');
  assert.deepEqual(regeln('/endlos/'), ['redirect-kette']);
  assert.deepEqual(regeln('/fehler/'), ['serverfehler'], 'Serverfehler: nicht zusätzlich „vorher erreichbar“');
  assert.deepEqual(regeln('/entwurf-liste/'), ['entwurf-oeffentlich'], 'Entwurf: nicht zusätzlich noindex-sitemap');
  assert.deepEqual(regeln('/entwurf-agb/'), ['entwurf-oeffentlich']);
  assert.deepEqual(regeln('/kaputt-canonical/'), ['canonical-ziel']);
  assert.deepEqual(regeln('/canonical-fremd/'), ['canonical-fremd']);
  assert.deepEqual(regeln('/alt/index.html'), ['index-html-dublette']);
});

test('sitemap-index-abweichung: je Bereich und Richtung ein gebündelter Punkt; Bündelung des Autopiloten lässt ihn unverändert', () => {
  const a = nach(T, 'sitemap-index-abweichung'); assert.equal(a.length, 2);
  const fehlt = a.find(f => f.key === 'fehlt-in-sitemap'), zuviel = a.find(f => f.key === 'noindex-in-sitemap');
  assert.equal(fehlt.url, site.base + '/zulassungsstelle/*/'); assert.equal(fehlt.severity, 'mittel'); assert.equal(fehlt.count, 1); assert.deepEqual(fehlt.examples.map(e => e.url), [site.base + '/zulassungsstelle/koeln/']); assert.match(fehlt.title, /^1 Seite im Bereich \/zulassungsstelle\/\*\/: indexierbar, aber nicht in der Sitemap$/);
  assert.equal(zuviel.count, 1); assert.deepEqual(zuviel.examples.map(e => e.url), [site.base + '/zulassungsstelle/hamburg/']); assert.equal(zuviel.file, 'app/sitemap.ts'); assert.match(zuviel.suggestion, /lib\/indexGate\.ts/);
  // Detailseiten mit Index-Gate lösen weder noindex-sitemap noch sitemap-fehlt aus (das wäre dieselbe Ursache doppelt)
  assert.equal(fuer(T, 'noindex-sitemap', '/zulassungsstelle/hamburg/'), undefined); assert.equal(fuer(T, 'sitemap-fehlt', '/zulassungsstelle/koeln/'), undefined);
  // Mehr Treffer: gleicher Schlüssel, nur die Zahl ändert sich (kein Pendeln zwischen „einzeln“ und „gebündelt“)
  const mehr = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/zulassungsstelle/berlin/': { inSitemap: false } } }) }).find(f => f.rule === 'sitemap-index-abweichung' && f.key === 'fehlt-in-sitemap');
  assert.equal(mehr.count, 2); assert.equal(fingerprint(mehr), fingerprint(fehlt)); assert.match(mehr.title, /^2 Seiten im Bereich/);
  const gebuendelt = aggregate([...T, ...M], site.base);
  assert.deepEqual(nach(gebuendelt, 'sitemap-index-abweichung').map(fingerprint).sort(), a.map(fingerprint).sort());
  // Unlesbare Sitemap: keine Folgemeldungen „fehlt in der Sitemap“
  const kaputt = technical.run({ ...ctx, crawl: mit(crawl, { sitemap: { entries: new Map(), files: [{ url: site.base + '/sitemap.xml', status: 500, count: 0, error: 'HTTP 500', lastmods: {} }] }, seiten: Object.fromEntries(['/ok/', '/preise/', '/zulassungsstelle/berlin/'].map(p => [p, { inSitemap: false }])) }) });
  assert.equal(nach(kaputt, 'sitemap-datei').length, 1); assert.equal(nach(kaputt, 'sitemap-datei')[0].severity, 'kritisch');
  assert.equal(nach(kaputt, 'sitemap-fehlt').length, 0); assert.equal(kaputt.filter(f => f.key === 'fehlt-in-sitemap').length, 0);
});

test('noindex auf wichtigen Seiten: exakte Ausnahme zählt, ein Familienmuster nicht; allowNoindex mit Mustern', () => {
  const noindex = { noindex: true, indexable: false, page: { robots: 'noindex, follow' } };
  // /kfz-zulassung/berlin/ ist wichtig UND passt auf das Muster der Stadtseiten → trotzdem kritisch
  const a = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/kfz-zulassung/berlin/': noindex } }) });
  const w = fuer(a, 'noindex-wichtig', '/kfz-zulassung/berlin/'); assert.ok(w); assert.equal(w.severity, 'kritisch'); assert.equal(w.file, 'lib/indexGate.ts'); assert.match(w.detail, /Im letzten Lauf war die Seite noch indexierbar/);
  assert.equal(fuer(a, 'index-verlust', '/kfz-zulassung/berlin/'), undefined, 'nicht zusätzlich index-verlust');
  // wichtige Seiten mit exakter Ausnahme (Impressum, Unterlagen) und nicht wichtige Detailseiten (Muster) bleiben ohne Befund
  for (const p of ['/impressum/', '/datenschutz/', '/unterlagen/', '/kennzeichen/b/', '/kfz-zulassung/aachen/']) assert.equal(fuer(T, 'noindex-wichtig', p), undefined, p);
  // ohne Ausnahmelisten wird das Impressum gemeldet
  const ohne = technical.run({ ...ctx, cfg: { ...cfg, allowNoindex: [], allowNoindexPatterns: [] } });
  assert.ok(fuer(ohne, 'noindex-wichtig', '/impressum/'));
  // X-Robots-Tag zählt wie das Meta-Tag (rec.noindex)
  const kopf = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/preise/': { noindex: true, indexable: false, headers: { ...crawl.pages.get(site.base + '/preise/').headers, 'x-robots-tag': 'noindex' } } } }) });
  assert.match(fuer(kopf, 'noindex-wichtig', '/preise/').detail, /X-Robots-Tag „noindex“/);
});

test('index-verlust: nur beim Wechsel indexierbar → noindex, nicht ohne Vorlauf, nicht für bewusst versteckte Seiten', () => {
  assert.equal(nach(T, 'index-verlust').length, 1);
  assert.equal(fuer(T, 'index-verlust', '/kennzeichen/b/'), undefined, 'war schon im Vorlauf noindex');
  const ohneVorlauf = technical.run({ ...ctx, prev: null });
  assert.equal(nach(ohneVorlauf, 'index-verlust').length, 0);
  // Seite mit exakter Ausnahme bzw. Entwurf: der Wechsel auf noindex ist gewollt
  const p2 = klon(vorlauf); for (const p of ['/impressum/', '/servicebedingungen/', '/entwurf-liste/']) Object.assign(p2.pages[site.base + p], { noindex: false, indexable: true });
  assert.deepEqual(pfade(technical.run({ ...ctx, prev: p2 }), 'index-verlust'), ['/kfz-zulassung/aachen/']);
  // Vorlauf einer anderen Website wird ignoriert (sonst wären alle Seiten „verschwunden“)
  const fremd = technical.run({ ...ctx, prev: { ...vorlauf, base: 'https://andere-website.example' } });
  for (const r of ['index-verlust', 'index-drift', 'erreichbarkeit-verlust', 'status-aenderung', 'langsam']) assert.equal(nach(fremd, r).length, 0, r);
});

test('Ohne Vorlauf (prev = null): keine Vergleichs-Meldungen', () => {
  const t = technical.run({ crawl: erster, prev: null, cfg, hostChecks: [], soll: null });
  for (const r of ['erreichbarkeit-verlust', 'status-aenderung', 'seite-geaendert', 'index-verlust', 'index-drift', 'langsam']) assert.equal(nach(t, r).length, 0, r);
  assert.deepEqual(pfade(t, 'sitemap-404'), ['/fehlt/'], 'Zustandsregeln laufen auch ohne Vorlauf');
  assert.doesNotThrow(() => meta.run({ crawl: erster, prev: null, cfg, hostChecks: [] }));
});

test('index-drift: Einbruch je Seitentyp gegen den Vorlauf (≥ 20 Seiten oder > 10 % ab drei Seiten), sonst still', () => {
  assert.equal(nach(T, 'index-drift').length, 0, 'eine einzelne Stadtseite weniger ist kein Einbruch');
  // drei Kennzeichen-Seiten waren indexierbar und sind jetzt noindex: 4 → 1
  const p3 = klon(vorlauf); for (const k of ['b', 'm', 'k']) Object.assign(p3.pages[site.base + `/kennzeichen/${k}/`], { noindex: false, indexable: true });
  const a = technical.run({ ...ctx, prev: p3 }); const d = nach(a, 'index-drift');
  assert.equal(d.length, 1); assert.equal(d[0].severity, 'kritisch'); assert.equal(d[0].key, 'typ:kennzeichen'); assert.equal(d[0].url, site.base + '/kennzeichen/'); assert.equal(d[0].count, 3);
  assert.match(d[0].title, /Kennzeichen-Seiten eingebrochen: 4 → 1$/); assert.match(d[0].detail, /3× jetzt noindex/); assert.equal(d[0].examples.length, 3); assert.equal(d[0].file, 'lib/indexGate.ts');
  assert.deepEqual(pfade(a, 'index-verlust'), ['/kfz-zulassung/aachen/'], 'der Einbruch ersetzt die Einzelmeldungen dieses Seitentyps');
  // Seiten, die es gar nicht mehr gibt, zählen ebenfalls; der Schlüssel bleibt gleich, auch wenn sich die Zahlen ändern
  const p4 = klon(p3); for (let i = 0; i < 20; i++) p4.pages[site.base + `/kennzeichen/x${i}/`] = { status: 200, typ: 'kennzeichen', noindex: false, indexable: true, page: { title: 'x' } };
  const d4 = nach(technical.run({ ...ctx, prev: p4 }), 'index-drift'); assert.equal(d4.length, 1); assert.equal(d4[0].count, 23); assert.match(d4[0].detail, /20× nicht mehr gefunden/); assert.equal(fingerprint(d4[0]), fingerprint(d[0])); assert.equal(d4[0].examples.length, 20);
  // zwei Seiten weniger in einem kleinen Typ: kein Einbruch, sondern zwei Einzelmeldungen
  const p5 = klon(vorlauf); for (const k of ['b', 'm']) Object.assign(p5.pages[site.base + `/kennzeichen/${k}/`], { noindex: false, indexable: true });
  const a5 = technical.run({ ...ctx, prev: p5 }); assert.equal(nach(a5, 'index-drift').length, 0); assert.deepEqual(pfade(a5, 'index-verlust'), ['/kennzeichen/b/', '/kennzeichen/m/', '/kfz-zulassung/aachen/']);
  // Störung statt Indexverlust: nicht erreichbare Seiten zählen nicht als Einbruch; unvollständiger Crawl → Regel setzt aus
  const stoerung = Object.fromEntries(['b', 'm', 'k'].map(k => [`/kennzeichen/${k}/`, { status: 0, page: null, noindex: false, indexable: false, error: 'timeout' }]));
  assert.equal(nach(technical.run({ ...ctx, prev: p3, crawl: mit(crawl, { seiten: stoerung }) }), 'index-drift').length, 0);
  assert.equal(nach(technical.run({ ...ctx, prev: p3, crawl: mit(crawl, { stats: { ...crawl.stats, limitErreicht: true } }) }), 'index-drift').length, 0);
  // Vorlauf ohne die neuen Felder (typ, indexable): wird aus Status, robots und Pfad abgeleitet
  const alt = klon(p3); for (const r of Object.values(alt.pages)) { const war = r.indexable; delete r.typ; delete r.indexable; delete r.noindex; if (r.page) r.page.robots = war ? 'index, follow' : (r.page.robots || 'noindex'); }
  for (const p of ['/intern/seite/', '/intern/wichtig/']) alt.pages[site.base + p].robotsAllowed = false;
  assert.deepEqual(nach(technical.run({ ...ctx, prev: alt }), 'index-drift').map(f => f.key), ['typ:kennzeichen']);
});

// ─── Wechselbefunde bleiben offen, solange die Störung besteht (Funde 1 und 8) ──
/** Ein Tageslauf wie im Autopiloten: Regeln mit ctx.offen = offene Punkte vor dem Lauf, Bündelung, Befundspeicher. */
const tageslauf = (store, c) => { const f = aggregate(technical.run({ ...c, offen: store.open() }), site.base); return store.apply(f, { runId: 'r' + store.state.runs.length, scope: technical.rules, kind: 'daily' }); };
const idVon = (liste, rule, p) => { const f = aggregate(liste, site.base).find(x => x.rule === rule && (pfad(x) === p || (x.examples || []).some(e => pfad(e) === p))); assert.ok(f, `${rule} ${p}`); return fingerprint(f); };

test('erreichbarkeit-verlust und index-verlust: bleiben am Folgetag offen (keine Entwarnung, keine zweite Sofortmeldung), schließen erst bei Wiederherstellung', () => {
  const store = new IssueStore(tmp('wechsel'));
  const r1 = tageslauf(store, ctx); const v = idVon(T, 'erreichbarkeit-verlust', '/fehlt/'), i = idVon(T, 'index-verlust', '/kfz-zulassung/aachen/');
  assert.ok(r1.new.includes(v) && r1.new.includes(i)); assert.equal(store.get(v).severity, 'kritisch');
  store.markNotified([v], 'sofort');
  // Folgetag: Vergleichsbasis ist der schon schlechte Stand – /fehlt/ liefert weiter 404, Aachen ist weiter noindex
  const tag2 = { ...ctx, prev: klon(crawler.serialize(crawl, [])) };
  assert.equal(nach(technical.run(tag2), 'erreichbarkeit-verlust').length, 0, 'ohne offene Punkte erkennt der Vergleich nichts mehr');
  const r2 = tageslauf(store, tag2);
  assert.deepEqual([r2.resolved.includes(v), r2.resolved.includes(i), r2.new.length, r2.reopened.length], [false, false, 0, 0], 'nicht „behoben“, nicht „neu“');
  assert.equal(store.get(v).status, 'offen'); assert.equal(store.get(v).severity, 'kritisch'); assert.match(store.get(v).title, /^Vorher erreichbar, seit \d\d\.\d\d\.\d{4} HTTP 404: \/fehlt\/$/); assert.match(store.get(v).detail, /bleibt offen/);
  assert.equal(store.get(i).status, 'offen'); assert.match(store.get(i).title, /steht seit \d\d\.\d\d\.\d{4} auf noindex/); assert.deepEqual(store.get(i).examples.map(pfad), ['/kfz-zulassung/aachen/']);
  assert.equal(store.get(v).notified.channel, 'sofort', 'Meldestatus bleibt');
  assert.ok(!require('../lib/notify').build(store, cfg, 'daily').some(m => m.channel === 'sofort' && m.ids.includes(v)), 'keine zweite Sofortmeldung für dieselbe Störung');
  // auch ohne Vorlauf (last-crawl.json fehlt) und bei einem Statuswechsel 404 → 410 bleibt der Punkt offen
  const r3 = tageslauf(store, { ...tag2, prev: null, crawl: mit(crawl, { seiten: { '/fehlt/': { status: 410 } } }) });
  assert.ok(!r3.resolved.includes(v) && !r3.resolved.includes(i)); assert.match(store.get(v).title, /HTTP 410/);
  // wiederhergestellt: /fehlt/ antwortet mit 200, Aachen ist wieder indexierbar → erst jetzt „behoben“
  const r4 = tageslauf(store, { ...tag2, crawl: mit(crawl, { seiten: { '/fehlt/': { status: 200 }, '/kfz-zulassung/aachen/': { noindex: false, indexable: true, page: { robots: 'index, follow' } } } }) });
  assert.ok(r4.resolved.includes(v) && r4.resolved.includes(i)); assert.equal(store.get(v).status, 'behoben');
});

test('Wechselbefunde zu Seiten ohne Abruf: offen bei unvollständigem Crawl und für wichtige Seiten, sonst geschlossen; bewusst erlaubtes noindex schließt', () => {
  const offen = [{ id: 'a', rule: 'erreichbarkeit-verlust', status: 'offen', severity: 'kritisch', url: site.base + '/geloescht/', key: 'verlust', first_seen: '2026-11-20T05:00:00.000Z', title: 'x' },
    { id: 'b', rule: 'index-verlust', status: 'offen', severity: 'hoch', url: site.base + '/kfz-zulassung/*/', key: 'familie:/kfz-zulassung/*/', examples: [{ url: site.base + '/kfz-zulassung/aachen/' }, { url: site.base + '/kfz-zulassung/verschwunden/' }], first_seen: '2026-11-20T05:00:00.000Z', title: 'x' }];
  const lauf2 = (c, extra = {}) => technical.run({ ...ctx, prev: null, offen, ...c, ...extra });
  assert.deepEqual(pfade(lauf2({}), 'erreichbarkeit-verlust'), [], 'vollständiger Crawl, Seite weder verlinkt noch in der Sitemap');
  assert.deepEqual(pfade(lauf2({}), 'index-verlust'), ['/kfz-zulassung/aachen/'], 'Bündel: jede Seite einzeln geprüft');
  assert.match(fuer(lauf2({}), 'index-verlust', '/kfz-zulassung/aachen/').title, /seit 20\.11\.2026/);
  const teil = lauf2({ crawl: mit(crawl, { stats: { ...crawl.stats, limitErreicht: true } }) });
  assert.deepEqual(pfade(teil, 'erreichbarkeit-verlust'), ['/geloescht/']); assert.deepEqual(pfade(teil, 'index-verlust'), ['/kfz-zulassung/aachen/', '/kfz-zulassung/verschwunden/']);
  assert.equal(fuer(teil, 'erreichbarkeit-verlust', '/geloescht/').severity, 'kritisch'); assert.match(fuer(teil, 'erreichbarkeit-verlust', '/geloescht/').detail, /nicht abgerufen \(Crawl unvollständig\)/);
  assert.deepEqual(pfade(lauf2({ cfg: { ...cfg, importantPaths: [...cfg.importantPaths, '/geloescht/'] } }), 'erreichbarkeit-verlust'), ['/geloescht/'], 'wichtige Seite bleibt offen');
  // noindex bewusst erlaubt (allowNoindex) bzw. Störung (Zustand unbekannt → offen)
  assert.deepEqual(pfade(lauf2({ cfg: { ...cfg, allowNoindex: [...cfg.allowNoindex, '/kfz-zulassung/aachen/'] } }), 'index-verlust'), []);
  assert.deepEqual(pfade(lauf2({ crawl: mit(crawl, { seiten: { '/kfz-zulassung/aachen/': { status: 503, page: null, indexable: false } } }) }), 'index-verlust'), ['/kfz-zulassung/aachen/']);
  // fremde oder schon behobene Punkte zählen nicht
  assert.deepEqual(pfade(technical.run({ ...ctx, prev: null, offen: offen.map(o => ({ ...o, status: 'behoben' })) }), 'index-verlust'), []);
});

test('index-drift: Einbruch bleibt offen, solange der Seitentyp unter dem Ausgangswert liegt; schließt erst nach Erholung', () => {
  const p3 = klon(vorlauf); for (const k of ['b', 'm', 'k']) Object.assign(p3.pages[site.base + `/kennzeichen/${k}/`], { noindex: false, indexable: true });
  const store = new IssueStore(tmp('drift'));
  const r1 = tageslauf(store, { ...ctx, prev: p3 }); const id = [...r1.new].find(x => store.get(x).rule === 'index-drift');
  assert.ok(id); assert.equal(store.get(id).basis, 4); assert.match(store.get(id).detail, /bleibt offen, bis wieder mindestens 2 Kennzeichen-Seiten indexierbar sind/, 'Schwelle wie bei der Erkennung: ab 3 Seiten weniger');
  // Folgetag: Vorlauf = heutiger Stand (1 indexierbare Kennzeichen-Seite) – der Punkt bleibt mit gleicher ID offen
  const tag2 = { ...ctx, prev: klon(crawler.serialize(crawl, [])) };
  assert.equal(nach(technical.run(tag2), 'index-drift').length, 0, 'ohne offene Punkte erkennt der Vergleich nichts mehr');
  const r2 = tageslauf(store, tag2);
  assert.equal(r2.resolved.includes(id), false); assert.equal(store.get(id).status, 'offen'); assert.match(store.get(id).title, /Kennzeichen-Seiten eingebrochen: 4 → 1$/); assert.equal(store.get(id).count, 3); assert.equal(store.get(id).basis, 4);
  // unvollständiger Crawl: Zahl nicht aussagekräftig → unverändert offen
  assert.equal(tageslauf(store, { ...tag2, crawl: mit(crawl, { stats: { ...crawl.stats, limitErreicht: true } }) }).resolved.includes(id), false); assert.equal(store.get(id).basis, 4);
  // erholt: alle vier Kennzeichen-Seiten wieder indexierbar → behoben
  const wieder = Object.fromEntries(['b', 'm', 'k'].map(k => [`/kennzeichen/${k}/`, { noindex: false, indexable: true, page: { robots: 'index, follow' } }]));
  assert.ok(tageslauf(store, { ...tag2, crawl: mit(crawl, { seiten: wieder }) }).resolved.includes(id)); assert.equal(store.get(id).status, 'behoben');
  assert.equal(technical.run({ ...ctx, offen: [{ rule: 'index-drift', status: 'offen', key: 'typ:kennzeichen', url: site.base + '/kennzeichen/', title: 'alt' }] }).filter(f => f.rule === 'index-drift').length, 0, 'älterer Punkt ohne Ausgangswert: wie bisher');
});

test('entwurf-oeffentlich: Entwurf ohne noindex oder in der Sitemap → hoch, rechtliche Freigabe; korrekt versteckter Entwurf bleibt still', () => {
  const a = fuer(T, 'entwurf-oeffentlich', '/entwurf-agb/'), b = fuer(T, 'entwurf-oeffentlich', '/entwurf-liste/');
  assert.equal(a.severity, 'hoch'); assert.equal(a.approval, 'recht'); assert.equal(a.file, 'lib/features.ts'); assert.match(a.detail, /trägt aber kein noindex und steht aber in der Sitemap/);
  assert.match(b.detail, /steht aber in der Sitemap/); assert.doesNotMatch(b.detail, /kein noindex/);
  assert.equal(fuer(T, 'entwurf-oeffentlich', '/servicebedingungen/'), undefined);
  // wird der versteckte Entwurf indexierbar, schlägt die Regel an
  const offen = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/servicebedingungen/': { noindex: false, indexable: true, page: { robots: 'index, follow' } } } }) });
  assert.ok(fuer(offen, 'entwurf-oeffentlich', '/servicebedingungen/')); assert.equal(fuer(offen, 'sitemap-fehlt', '/servicebedingungen/'), undefined);
});

test('vorschau-noindex: Vorschau-Build live → EIN kritischer Befund statt hunderter Folgemeldungen', async () => {
  assert.equal(nach(T, 'vorschau-noindex').length, 0);
  site.state.vorschau = true; let c;
  try { c = await lauf(site, cfg, vorlauf); } finally { site.state.vorschau = false; }
  assert.equal(c.pages.get(site.base + '/').noindex, true); assert.equal(c.pages.get(site.base + '/ok/').page.robots, 'noindex, nofollow');
  const a = technical.run({ ...ctx, crawl: c }); const v = nach(a, 'vorschau-noindex');
  assert.equal(v.length, 1); assert.equal(v[0].severity, 'kritisch'); assert.equal(pfad(v[0]), '/'); assert.equal(v[0].file, 'lib/features.ts'); assert.equal(v[0].key, 'startseite');
  assert.match(v[0].title, /Vorschau-Build/); assert.match(v[0].suggestion, /NEXT_PUBLIC_NOINDEX/); assert.ok(v[0].count > 30);
  for (const r of ['noindex-wichtig', 'noindex-sitemap', 'index-verlust', 'index-drift', 'sitemap-index-abweichung']) assert.equal(nach(a, r).length, 0, r);
  assert.equal(a.filter(f => f.severity === 'kritisch' && /noindex|index-/.test(f.rule)).length, 1);
  // Nur die Startseite ist noindex (kein Massenfall): ein Befund für die Startseite, die übrigen Regeln laufen weiter
  const nurStart = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/': { noindex: true, indexable: false, page: { robots: 'noindex' } } } }) });
  const s = nach(nurStart, 'vorschau-noindex'); assert.equal(s.length, 1); assert.equal(s[0].title, 'Startseite steht auf noindex'); assert.equal(s[0].count, undefined); assert.equal(fingerprint(s[0]), fingerprint(v[0]));
  assert.deepEqual(pfade(nurStart, 'noindex-wichtig'), ['/wichtig-noindex/'], 'Startseite nicht doppelt gemeldet'); assert.deepEqual(pfade(nurStart, 'index-verlust'), ['/kfz-zulassung/aachen/']); assert.equal(fuer(nurStart, 'noindex-sitemap', '/'), undefined);
});

test('robots.txt sperrt die Website: EIN kritischer Befund; einzelne Sperren werden je Seite gemeldet', async () => {
  const alt = site.robots; site.robots = `User-agent: *\nDisallow: /\nSitemap: ${site.base}/sitemap.xml\n`; let c;
  try { c = await lauf(site, cfg, vorlauf); } finally { site.robots = alt; }
  assert.equal(c.pages.get(site.base + '/').robotsAllowed, false); assert.equal(c.pages.get(site.base + '/ok/').indexable, false);
  const a = technical.run({ ...ctx, crawl: c }); const w = nach(a, 'robots-wichtig');
  assert.equal(w.length, 1); assert.equal(pfad(w[0]), '/'); assert.equal(w[0].severity, 'kritisch'); assert.match(w[0].title, /sperrt die Website/); assert.match(w[0].detail, /Disallow: \//); assert.ok(w[0].count > 20);
  assert.equal(nach(a, 'robots-sitemap').length, 0); assert.equal(nach(a, 'index-drift').length, 0);
});

test('robots.txt und Sitemap-Dateien: nicht erreichbar, ohne Sitemap-Zeile, unlesbar, leer, lastmod = Erzeugungszeitpunkt', async () => {
  for (const r of ['robots', 'sitemap-datei', 'sitemap-lastmod', 'security-header']) assert.equal(nach(T, r).length, 0, r + ' auf der intakten Website');
  const s = await start({ leer: true });
  try {
    const seitenliste = Array.from({ length: 10 }, (_, i) => `/thema-${i + 1}/`); const c2 = konfiguration(s, { importantPaths: ['/'], extraPaths: [], entwurfSeiten: [] });
    s.page('/', { title: 'Kfz-Zulassung online – Startseite der Test-Website', links: seitenliste }); for (const p of seitenliste) s.page(p, {});
    // (1) robots.txt ohne Sitemap-Zeile, alle lastmod = jetzt (Zeitpunkt der Erzeugung), keine Sicherheits-Header
    s.robots = 'User-agent: *\nAllow: /\n'; s.headers = {}; const jetzt = new Date().toISOString(); s.sitemap = ['/', ...seitenliste].map(p => ({ p, lastmod: jetzt }));
    let a = technical.run({ crawl: await lauf(s, c2, null), prev: null, cfg: c2, hostChecks: [] });
    const r = nach(a, 'robots'); assert.equal(r.length, 1); assert.equal(r[0].severity, 'niedrig'); assert.equal(r[0].key, 'sitemap'); assert.equal(r[0].file, 'app/robots.ts');
    const lm = nach(a, 'sitemap-lastmod'); assert.equal(lm.length, 1); assert.equal(lm[0].severity, 'niedrig'); assert.equal(lm[0].key, 'lastmod'); assert.equal(lm[0].file, 'app/sitemap.ts'); assert.match(lm[0].detail, /11 von 11 Adressen/);
    const sh = nach(a, 'security-header'); assert.deepEqual(sh.map(f => f.key).sort(), ['content-security-policy', 'permissions-policy', 'referrer-policy', 'strict-transport-security', 'x-content-type-options', 'x-frame-options']);
    assert.equal(sh.find(f => f.key === 'strict-transport-security').severity, 'mittel'); assert.ok(sh.every(f => f.file === 'public/.htaccess' && pfad(f) === '/'));
    assert.deepEqual(a.map(f => f.rule).filter(x => !['robots', 'sitemap-lastmod', 'security-header'].includes(x)), [], 'sonst nichts');
    // (2) frame-ancestors in der CSP ersetzt X-Frame-Options; einheitliches lastmod als Datum der Daten (Mitternacht, älter) ist kein Befund
    s.headers = { ...SICHER, 'x-frame-options': undefined }; delete s.headers['x-frame-options']; s.robots = null; s.sitemap = ['/', ...seitenliste].map(p => ({ p, lastmod: '2020-01-15T00:00:00.000Z' }));
    a = technical.run({ crawl: await lauf(s, c2, null), prev: null, cfg: c2, hostChecks: [] });
    assert.deepEqual(a, [], 'intakte kleine Website ohne Befund');
    // (3) robots.txt mit Serverfehler, Sitemap ist kein XML → zwei kritische Befunde, aber keine Folgemeldungen „fehlt in der Sitemap“
    s.route('/robots.txt', { status: 503, body: 'Wartung' }); s.route('/sitemap.xml', { status: 200, type: 'application/xml', body: '<html><body>Fehler</body></html>' });
    a = technical.run({ crawl: await lauf(s, c2, null), prev: null, cfg: c2, hostChecks: [] });
    assert.deepEqual(a.map(f => `${f.rule}/${f.key}/${f.severity}`).sort(), ['robots/erreichbar/kritisch', 'sitemap-datei/lesbar/kritisch']);
    assert.match(nach(a, 'robots')[0].detail, /HTTP 503/); assert.match(nach(a, 'sitemap-datei')[0].detail, /kein <urlset>/); assert.equal(nach(a, 'sitemap-datei')[0].file, 'app/sitemap.ts');
    // (4) robots.txt fehlt (404) → mittel; Sitemap ohne Adressen → kritisch
    s.route('/robots.txt', { status: 404, body: '' }); s.route('/sitemap.xml', { status: 200, type: 'application/xml', body: '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>' });
    a = technical.run({ crawl: await lauf(s, c2, null), prev: null, cfg: c2, hostChecks: [] });
    assert.deepEqual(a.map(f => `${f.rule}/${f.key}/${f.severity}`).sort(), ['robots/erreichbar/mittel', 'sitemap-datei/leer/kritisch']);
  } finally { await s.close(); }
  // lastmod: nur der Erzeugungszeitpunkt ist ein Befund; der Schlüssel enthält weder Datum noch Zahl
  const sm = (lastmods, count) => ({ entries: crawl.sitemap.entries, files: [{ url: site.base + '/sitemap.xml', status: 200, count, error: null, lastmods }] });
  const fall = (lastmods, count, at) => nach(technical.run({ ...ctx, crawl: mit(crawl, { sitemap: sm(lastmods, count), at: at || crawl.at }) }), 'sitemap-lastmod');
  assert.equal(fall({ '2026-11-03T00:00:00.000Z': 408, '2026-11-22T09:37:24.130Z': 59, '2026-08-13T00:00:00.000Z': 4 }, 471).length, 0, 'Stand der echten Website: 86,6 %');
  assert.equal(fall({ '2026-11-03T00:00:00.000Z': 460, '2026-08-13T00:00:00.000Z': 11 }, 471, '2026-11-22T05:00:00.000Z').length, 0, 'gemeinsames Prüfdatum der Daten, kein Erzeugungszeitpunkt');
  const x = fall({ '2026-11-22T09:37:24.130Z': 460, '2026-08-13T00:00:00.000Z': 11 }, 471, '2026-11-30T05:00:00.000Z'), y = fall({ '2026-12-01': 470, '2026-08-13': 1 }, 471, '2026-12-02T05:00:00.000Z');
  assert.equal(x.length, 1); assert.equal(y.length, 1); assert.equal(fingerprint(x[0]), fingerprint(y[0]));
  assert.equal(fall({ '2026-11-22T09:37:24.130Z': 9 }, 9).length, 0, 'unter 10 Adressen keine Aussage');
});

test('Weiterleitungen: host-weiterleitung und alte-domain-weiterleitung aus den Weiterleitungsprüfungen', async () => {
  // echte Prüfungen des Crawlers gegen die Test-Website (gleiche Felder wie ctx.hostChecks im Autopiloten)
  site.weiter('/alt-thema/', '/preise/');
  const echt = await crawler.checkRedirects([
    { von: site.base + '/einfach/', erwartet: site.base + '/ok/', maxSpruenge: 1 },      // sauber
    { von: site.base + '/weiter/', erwartet: site.base + '/ok/', maxSpruenge: 1 },       // Ziel stimmt, aber zwei Sprünge
    { von: site.base + '/alt-thema/', erwartet: site.base + '/ok/', maxSpruenge: 1 },    // falsches Ziel
    { von: site.base + '/kaputt/', erwartet: site.base + '/ok/', maxSpruenge: 1 },       // 404
  ], { retries: 0, retryDelayMs: 0, timeoutMs: 3000 });
  assert.deepEqual(echt.map(h => h.ok), [true, false, false, false]);
  const a = nach(technical.run({ ...ctx, hostChecks: echt }), 'host-weiterleitung');
  assert.deepEqual(a.map(f => `${pfad(f)} ${f.severity}`), ['/weiter/ mittel', '/alt-thema/ hoch', '/kaputt/ hoch']);
  assert.match(a[0].title, /nur über Umwege/); assert.match(a[0].detail, /301 → .*\/weiter2\/, 302 → .*\/ok\//); assert.equal(a[0].file, 'public/.htaccess'); assert.equal(a[0].proposed, site.base + '/ok/');
  assert.match(a[1].title, /führt nicht zur Hauptadresse/); assert.match(a[1].detail, /Ende .*\/preise\/ mit HTTP 200/); assert.match(a[2].detail, /HTTP 404/);
  assert.equal(nach(technical.run({ ...ctx, hostChecks: echt }), 'alte-domain-weiterleitung').length, 0);
  // frühere Domain (von-Host enthält die alte Domain): kritisch, wenn das Ziel nicht stimmt; hoch, wenn nur der Weg zu lang ist
  const N = 'https://kfz-zulassungsprofis.de', check = o => ({ erwartet: N + '/', final: N + '/', status: 200, spruenge: 1, maxSpruenge: 1, ok: true, grund: '', kette: [{ status: 301, to: N + '/' }], ...o });
  const hc = [
    check({ von: 'https://deutschezulassung.de/' }),                                                                                              // ok
    check({ von: 'https://www.deutschezulassung.de/', final: 'https://www.deutschezulassung.de/', spruenge: 0, kette: [], ok: false, grund: 'endet auf https://www.deutschezulassung.de/ statt ' + N + '/' }),
    check({ von: 'http://deutschezulassung.de/', spruenge: 3, maxSpruenge: 2, ok: false, grund: '3 Sprünge statt höchstens 2', kette: [{ status: 301, to: 'https://deutschezulassung.de/' }, { status: 301, to: 'https://www.kfz-zulassungsprofis.de/' }, { status: 301, to: N + '/' }] }),
    check({ von: 'https://deutschezulassung.de/preise/', erwartet: N + '/preise/', final: 'https://deutschezulassung.de/preise/', status: 0, spruenge: 0, kette: [], ok: false, grund: 'nicht erreichbar (timeout)' }),
    check({ von: 'https://www.kfz-zulassungsprofis.de/', final: N + '/', status: 500, ok: false, grund: 'Ziel antwortet mit HTTP 500' }),
    check({ von: 'http://www.kfz-zulassungsprofis.de/', kette: [{ status: 302, to: N + '/' }], ok: false, grund: 'vorübergehende Weiterleitung (302) statt 301' }),
  ];
  const b = technical.run({ ...ctx, hostChecks: hc });
  const alt = nach(b, 'alte-domain-weiterleitung'), host = nach(b, 'host-weiterleitung');
  assert.deepEqual(alt.map(f => `${f.url} ${f.severity}`), ['https://www.deutschezulassung.de/ kritisch', 'http://deutschezulassung.de/ hoch', 'https://deutschezulassung.de/preise/ kritisch']);
  assert.ok(alt.every(f => f.file === 'deploy/alte-domain/.htaccess' && f.key === 'weiterleitung' && f.approval === 'auto'));
  assert.match(alt[0].title, /leitet nicht auf die neue Adresse weiter/); assert.match(alt[1].title, /nur über Umwege/); assert.match(alt[1].detail, /höchstens 2 Sprüngen/); assert.match(alt[2].detail, /Nicht erreichbar \(timeout\).*ohne Antwort/);
  assert.deepEqual(host.map(f => `${f.url} ${f.severity}`), ['https://www.kfz-zulassungsprofis.de/ hoch', 'http://www.kfz-zulassungsprofis.de/ mittel']);
  assert.equal(new Set([...alt, ...host].map(fingerprint)).size, 5);
  // Bündelung des Autopiloten fasst Weiterleitungsbefunde nie zusammen
  assert.equal(aggregate([...alt, ...host], N).length, 5);
  // ohne Prüfungen bzw. wenn alle in Ordnung sind: kein Befund
  assert.equal(technical.run({ ...ctx, hostChecks: [hc[0]] }).filter(f => /weiterleitung$/.test(f.rule)).length, 0);
  assert.doesNotThrow(() => technical.run({ ...ctx, hostChecks: undefined }));
});

test('datei-defekt: verlinkte Datei per HEAD nicht abrufbar; erreichbare Datei bleibt still', () => {
  assert.deepEqual(pfade(T, 'datei-defekt'), ['/downloads/fehlt.pdf']);
  const a = technical.run({ ...ctx, crawl: mit(crawl, { dateien: new Map([[site.base + '/downloads/a.pdf', { status: 200, quellen: [site.base + '/'] }], [site.base + '/downloads/b.pdf', { status: 0, quellen: [site.base + '/ok/'], error: 'timeout' }], [site.base + '/downloads/c.pdf', { status: 403, quellen: [] }]]) }) });
  assert.deepEqual(nach(a, 'datei-defekt').map(f => `${pfad(f)} ${f.severity}`), ['/downloads/b.pdf hoch', '/downloads/c.pdf hoch']);
  assert.match(nach(a, 'datei-defekt')[0].detail, /Keine Antwort \(timeout\)\. Verlinkt von: \/ok\//);
  // Form aus last-crawl.json (Objekt statt Map) wird ebenfalls verstanden
  assert.equal(nach(technical.run({ ...ctx, crawl: mit(crawl, { dateien: { [site.base + '/x.pdf']: { status: 404, quellen: [] } } }) }), 'datei-defekt').length, 1);
});

test('https: Canonical bzw. Weiterleitung auf http:// – nur wenn die Website selbst https nutzt', () => {
  assert.equal(nach(T, 'https').length, 0, 'Test-Website läuft selbst über http');
  const B = 'https://kfz.example'; const rec = (p, o = {}, extra = {}) => { const url = B + p; return [url, { url, path: p, typ: 'sonst', status: 200, final: url, chain: [], loop: false, tooManyHops: false, ms: 20, headers: { ...SICHER }, page: html.parse(seite(o, B, p), url), noindex: false, indexable: true, inSitemap: true, inlinks: 2, robotsAllowed: true, changed: false, ...extra }]; };
  const pages = new Map([rec('/'), rec('/gut/'), rec('/http-canonical/', { canonical: 'http://kfz.example/http-canonical/' }), rec('/alt/', {}, { page: null, chain: [{ from: B + '/alt/', to: 'http://kfz.example/gut/', status: 301 }, { from: 'http://kfz.example/gut/', to: B + '/gut/', status: 301 }], final: B + '/gut/', redirectedTo: B + '/gut/', indexable: false, inSitemap: false })]);
  const c = { base: B, at: new Date().toISOString(), pages, sitemap: { entries: new Map([...pages.keys()].filter(u => !/alt/.test(u)).map(u => [u, { sitemap: B + '/sitemap.xml', lastmod: null }])), files: [{ url: B + '/sitemap.xml', status: 200, count: 3, error: null, lastmods: {} }] }, robots: { sitemaps: [B + '/sitemap.xml'], disallow: [] }, robotsStatus: 200, dateien: new Map(), stats: {} };
  const a = technical.run({ crawl: c, prev: null, cfg: { ...cfg, base: B, importantPaths: ['/'], entwurfSeiten: [] }, hostChecks: [] });
  assert.deepEqual(a.map(f => `${f.rule}/${f.key} ${pfad(f)} ${f.severity}`).sort(), ['https/canonical /http-canonical/ mittel', 'https/weiterleitung /alt/ hoch', 'redirect-kette/kette /alt/ niedrig']);
  assert.equal(a.find(f => f.key === 'canonical').proposed, B + '/http-canonical/', 'nur ein Befund – nicht zusätzlich sitemap-canonical');
});

test('Sonderfälle: unvollständiger Crawl, Störung im Vorlauf, wiederholte Langsamkeit, Statuswechsel zurück auf 200', () => {
  // verwaist braucht einen vollständigen Crawl
  assert.equal(nach(technical.run({ ...ctx, crawl: mit(crawl, { stats: { ...crawl.stats, abgebrochen: 'Zeitlimit' } }) }), 'verwaist').length, 0);
  // langsam: nur wenn auch der Vorlauf langsam war
  const p2 = klon(vorlauf); p2.pages[site.base + '/langsam/'].ms = 30;
  assert.equal(nach(technical.run({ ...ctx, prev: p2 }), 'langsam').length, 0, 'einzelner Ausreißer');
  assert.equal(nach(technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/langsam/': { ms: 20 } } }) }), 'langsam').length, 0, 'jetzt wieder schnell');
  // Rückkehr auf 200 und Wechsel nach einer Störung sind keine Befunde
  const p3 = klon(vorlauf); p3.pages[site.base + '/ok/'].status = 404; p3.pages[site.base + '/gesperrt/'].status = 503; p3.pages[site.base + '/kaputt/'].status = 0;
  assert.equal(nach(technical.run({ ...ctx, prev: p3 }), 'status-aenderung').length, 0);
  // Serverfehler auf wichtiger Seite bzw. Sitemap-Adresse → kritisch; Zeitüberschreitung als „Nicht erreichbar“
  const a = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/preise/': { status: 503, page: null, indexable: false }, '/kennzeichen/b/': { status: 0, page: null, indexable: false, error: 'timeout' } } }) });
  assert.equal(fuer(a, 'serverfehler', '/preise/').severity, 'kritisch'); assert.equal(fuer(a, 'serverfehler', '/kennzeichen/b/').severity, 'hoch'); assert.match(fuer(a, 'serverfehler', '/kennzeichen/b/').title, /^Nicht erreichbar/);
  assert.equal(fuer(a, 'erreichbarkeit-verlust', '/preise/'), undefined);
  // Canonical auf die www-Variante bzw. die frühere Domain → hoch
  const www = technical.run({ ...ctx, cfg: { ...cfg, altmarke: { domain: 'andere-domain.example' } } });
  assert.equal(fuer(www, 'canonical-fremd', '/canonical-fremd/').severity, 'hoch');
});

test('Stabile Schlüssel: Messwerte ändern den Fingerprint nicht', () => {
  const fp = (liste, rule, p) => fingerprint(fuer(liste, rule, p));
  // Statuscode, Sprungzahl, Antwortzeit
  const a = technical.run({ ...ctx, crawl: mit(crawl, { seiten: { '/fehler/': { status: 503 }, '/langsam/': { ms: 9999 }, '/weiter/': { chain: [...crawl.pages.get(site.base + '/weiter/').chain, { from: 'x', to: site.base + '/ok/', status: 301 }] }, '/gesperrt/': { status: 403 } } }) });
  for (const [rule, p] of [['serverfehler', '/fehler/'], ['langsam', '/langsam/'], ['redirect-kette', '/weiter/'], ['gesperrt', '/gesperrt/'], ['status-aenderung', '/gesperrt/']]) { assert.equal(fp(a, rule, p), fp(T, rule, p), rule); assert.notEqual(fuer(a, rule, p).title + fuer(a, rule, p).detail, fuer(T, rule, p).title + fuer(T, rule, p).detail, rule + ': Messwert steht im Text'); }
  // Zeichenzahlen in Title und Description
  const c2 = mit(crawl, { seiten: { '/title-lang/': { page: { title: 'Kfz-Zulassung in Musterstadt und Umgebung online beauftragen | KFZ-Zulassungsprofis' } }, '/title-kurz/': { page: { title: 'Kontakt 2' } }, '/desc-lang/': { page: { description: crawl.pages.get(site.base + '/desc-lang/').page.description + ' Und noch ein Satz dazu.' } }, '/desc-kurz/': { page: { description: 'Zulassung online.' } }, '/h1-doppelt/': { page: { h1: ['A', 'B', 'C'] } } } });
  const m = meta.run({ ...ctx, crawl: c2 });
  for (const [rule, p] of [['title-lang', '/title-lang/'], ['title-kurz', '/title-kurz/'], ['description-lang', '/desc-lang/'], ['description-kurz', '/desc-kurz/'], ['h1-mehrfach', '/h1-doppelt/']]) { assert.equal(fp(m, rule, p), fp(M, rule, p), rule); assert.notEqual(fuer(m, rule, p).title, fuer(M, rule, p).title, rule); }
});

// ─── Meta ────────────────────────────────────────────────────────────────────
const ERWARTET_META = {
  'title-fehlt': ['/ohne/', '/unterlagen/'],
  'title-lang': ['/title-lang-ohne-vorschlag/', '/title-lang/'],
  'title-kurz': ['/title-kurz/'],
  'title-doppelt': ['/dup-a/'],
  'description-fehlt': ['/ohne/'],
  'description-lang': ['/desc-lang/'],
  'description-kurz': ['/desc-kurz/'],
  'description-doppelt': ['/dup-a/'],
  'description-unpassend': ['/desc-unpassend/'],
  'h1-fehlt': ['/ohne/', '/unterlagen/'],
  'h1-mehrfach': ['/h1-doppelt/'],
  'heading-sprung': ['/spruenge/'],
  'h2-fehlt': ['/ohne-h2/'],
  'og-fehlt': ['/ohne/'],
  'og-unpassend': ['/og-unpassend/'],
  'og-url': ['/og-url/'],
  'og-image': ['/og-ohne-bild/'],
};

test('Meta: je Regel genau die erwarteten Adressen (Positiv- und Negativfälle)', () => {
  for (const rule of meta.rules) assert.deepEqual(pfade(M, rule), ERWARTET_META[rule] || [], rule);
  assert.deepEqual(Object.keys(ERWARTET_META).sort(), meta.rules.slice().sort(), 'jede Meta-Regel hat einen Positivfall');
});

test('Meta: Schwellen (Title > 65 / < 20, Description > 165 / < 50) und Schweregrade', () => {
  const b = (rule, p) => { const f = fuer(M, rule, p); assert.ok(f, `${rule} ${p}`); return f; };
  assert.equal(b('title-fehlt', '/ohne/').severity, 'hoch'); assert.equal(b('h1-fehlt', '/ohne/').severity, 'hoch'); assert.equal(b('description-fehlt', '/ohne/').severity, 'mittel');
  assert.equal(b('title-doppelt', '/dup-a/').severity, 'mittel'); assert.equal(b('h1-mehrfach', '/h1-doppelt/').severity, 'mittel');
  for (const [r, p] of [['title-lang', '/title-lang/'], ['title-kurz', '/title-kurz/'], ['description-lang', '/desc-lang/'], ['description-kurz', '/desc-kurz/'], ['description-doppelt', '/dup-a/'], ['description-unpassend', '/desc-unpassend/'], ['heading-sprung', '/spruenge/'], ['h2-fehlt', '/ohne-h2/'], ['og-fehlt', '/ohne/'], ['og-unpassend', '/og-unpassend/'], ['og-url', '/og-url/'], ['og-image', '/og-ohne-bild/']]) assert.equal(b(r, p).severity, 'niedrig', r);
  assert.match(b('title-lang', '/title-lang/').title, /^Title zu lang \(70 Zeichen\): \/title-lang\/$/); assert.equal(b('title-lang', '/title-lang/').key, 'lang');
  assert.match(b('title-kurz', '/title-kurz/').title, /\(7 Zeichen\)/); assert.match(b('heading-sprung', '/spruenge/').detail, /^2 Sprünge, z\. B\. H1 → H3/); assert.match(b('h2-fehlt', '/ohne-h2/').detail, /^4\d\d Wörter/);
  assert.equal(b('title-doppelt', '/dup-a/').count, 2); assert.match(b('title-doppelt', '/dup-a/').detail, /\/dup-a\/, \/dup-b\//); assert.deepEqual(b('description-doppelt', '/dup-a/').examples.map(e => e.url), [site.base + '/dup-a/', site.base + '/dup-b/']);
  // Grenzwerte: genau 65 / 20 / 165 / 50 Zeichen sind in Ordnung, ein Zeichen darüber bzw. darunter nicht
  const grenze = (feld, wert) => meta.run({ ...ctx, crawl: mit(crawl, { seiten: { '/ok/': { page: { [feld]: wert } } } }) }).filter(f => pfad(f) === '/ok/').map(f => f.rule);
  const t = n => ('Kfz-Zulassung online ' + 'x'.repeat(200)).slice(0, n), d = n => ('Zulassung online stellen, Unterlagen hochladen, Kennzeichen erhalten. ' + 'Auftrag '.repeat(40)).slice(0, n - 1) + '.';
  assert.deepEqual(grenze('title', t(65)), []); assert.deepEqual(grenze('title', t(66)), ['title-lang']); assert.deepEqual(grenze('title', t(20)), []); assert.deepEqual(grenze('title', t(19)), ['title-kurz']);
  assert.deepEqual(grenze('description', d(165)), []); assert.deepEqual(grenze('description', d(166)), ['description-lang']); assert.deepEqual(grenze('description', d(50)), []); assert.deepEqual(grenze('description', d(49)), ['description-kurz']);
});

test('Meta: noindex-Seiten werden nicht geprüft – außer Title und H1 auf wichtigen Seiten; Sonderseiten bleiben außen vor', () => {
  // noindex-Detailseiten mit zu langem Title, ohne Description, zwei H1, ohne Open Graph: kein Befund
  for (const p of ['/kennzeichen/b/', '/kennzeichen/m/', '/kennzeichen/k/', '/kfz-zulassung/aachen/', '/zulassungsstelle/hamburg/', '/noindex-in-sitemap/', '/wichtig-noindex/', '/impressum/']) assert.deepEqual(M.filter(f => pfad(f) === p), [], p);
  // wichtige, bewusst nicht indexierte Seite ohne Title, H1 und Description: nur Title und H1
  assert.deepEqual(M.filter(f => pfad(f) === '/unterlagen/').map(f => f.rule).sort(), ['h1-fehlt', 'title-fehlt']);
  // dieselbe Seite als nicht wichtige Seite: gar nichts
  assert.deepEqual(meta.run({ ...ctx, cfg: { ...cfg, importantPaths: ['/'] } }).filter(f => pfad(f) === '/unterlagen/'), []);
  // noindex nur über den Header (X-Robots-Tag): zählt genauso (rec.noindex)
  const kopf = meta.run({ ...ctx, crawl: mit(crawl, { seiten: { '/title-lang/': { noindex: true, indexable: false } } }) });
  assert.equal(fuer(kopf, 'title-lang', '/title-lang/'), undefined);
  // Datensätze ohne rec.noindex (z. B. aus dem lokalen Build-Check) werden über Meta-Tag/Header eingeordnet
  const ohneFeld = meta.run({ ...ctx, crawl: mit(crawl, { seiten: { '/kennzeichen/b/': { noindex: undefined, indexable: undefined } } }) });
  assert.deepEqual(ohneFeld.filter(f => pfad(f) === '/kennzeichen/b/'), []);
  // Fehlerseite (ohne noindex, ohne Description, fremdes Canonical) und Bestätigungsdatei der Search Console
  assert.equal(crawl.pages.get(site.base + '/google1a2b3c4d5e6f7a8b.html').page.title, ''); assert.equal(crawl.pages.get(site.base + '/404/').status, 200);
  const sonder = mit(crawl, { seiten: { '/404/': { noindex: false, indexable: true, page: { robots: 'index, follow', canonical: null } } } });
  for (const p of ['/404/', '/google1a2b3c4d5e6f7a8b.html']) assert.deepEqual([...meta.run({ ...ctx, crawl: sonder }), ...technical.run({ ...ctx, crawl: sonder })].filter(f => pfad(f) === p), [], p);
  // per robots.txt gesperrte Seiten und Seiten mit fremdem Canonical: keine Meta-Prüfung
  for (const p of ['/intern/seite/', '/sm-canonical/', '/canonical-fremd/', '/alt/index.html']) assert.deepEqual(M.filter(f => pfad(f) === p), [], p);
});

test('Title-Vorschläge: Marke nur, wenn sie passt (Grenze 63); nie schlechter als der Bestand – sonst kein Vorschlag', () => {
  assert.equal(meta.BRAND, ' | KFZ-Zulassungsprofis'); assert.equal(meta.TITLE_MAX, 63);
  // fitTitle wie in lib/seo.ts: 40 + 23 = 63 passt, 41 + 23 nicht
  const k40 = 'Kfz-Zulassung online ohne Behördentermin'; assert.equal(k40.length, 40);
  assert.equal(meta.fitTitle(k40), k40 + ' | KFZ-Zulassungsprofis'); assert.equal(meta.fitTitle(k40 + 'e'), k40 + 'e');
  // zu langer Title mit Marke → Bestand ohne Marke (nicht die kurze H1)
  const tl = fuer(M, 'title-lang', '/title-lang/');
  assert.equal(tl.current, 'Kfz-Zulassung in Musterstadt online beauftragen | KFZ-Zulassungsprofis'); assert.equal(tl.proposed, 'Kfz-Zulassung in Musterstadt online beauftragen'); assert.match(tl.reason, /fitTitle\(\) in lib\/seo\.ts/); assert.match(tl.suggestion, /63 Zeichen/);
  // zu langer Title ohne Marke, H1 „Preise“ hat nichts mit dem Bestand zu tun → kein Vorschlag
  const ohne = fuer(M, 'title-lang', '/title-lang-ohne-vorschlag/'); assert.equal(ohne.proposed, ''); assert.match(ohne.reason, /Kein automatischer Vorschlag/);
  // zu kurzer Title → aus der H1, mit Marke, weil sie passt
  assert.equal(fuer(M, 'title-kurz', '/title-kurz/').proposed, 'Kontakt und Erreichbarkeit | KFZ-Zulassungsprofis');
  // fehlender Title → aus der H1; ohne H1 kein Vorschlag
  assert.equal(fuer(M, 'title-fehlt', '/ohne/').proposed, ''); assert.equal(fuer(M, 'h1-fehlt', '/ohne/').proposed, '');
  const v = (cur, h1) => { const x = meta.titelVorschlag({ h1: h1 ? [h1] : [] }, cur); return x ? x.text : ''; };
  assert.equal(v('', 'Preise'), 'Preise | KFZ-Zulassungsprofis');
  assert.equal(v('', 'Zulassungsstelle Landkreis Neustadt an der Aisch-Bad Windsheim'), 'Zulassungsstelle Landkreis Neustadt an der Aisch-Bad Windsheim', '62 Zeichen: ohne Marke');
  const lang = v('', 'Alles über Wunschkennzeichen, Kurzzeitkennzeichen, Saisonkennzeichen und Ausfuhrkennzeichen für Ihr Fahrzeug'); assert.ok(lang.length >= 20 && lang.length <= 63 && !/(und|,)$/.test(lang), lang);
  // Bestand der echten Website: Der Vorschlag ist der Title ohne Marke bzw. die H1 – nie die viel kürzere H1 „Häufige Fragen“
  assert.equal(v('Häufige Fragen (FAQ) zur Online-Kfz-Zulassung | KFZ-Zulassungsprofis', 'Häufige Fragen'), 'Häufige Fragen (FAQ) zur Online-Kfz-Zulassung');
  assert.equal(v('Zulassungsstelle Landkreis Sächsische Schweiz-Osterzgebirge: Adresse', 'Zulassungsstelle Landkreis Sächsische Schweiz-Osterzgebirge'), 'Zulassungsstelle Landkreis Sächsische Schweiz-Osterzgebirge');
  assert.equal(v('Preise', 'Preise'), 'Preise | KFZ-Zulassungsprofis', 'kurzer Title: Marke ergänzen');
  assert.equal(v('Preise für die Kfz-Zulassung online und alle Leistungen im Überblick | KFZ-Zulassungsprofis', 'Preise'), '', 'Bestand ohne Marke ist noch zu lang, die H1 wäre schlechter → kein Vorschlag');
  for (const [cur, h1] of [['Ein Title, der viel zu lang geraten ist und dringend gekürzt werden müsste, ohne Marke', 'Etwas ganz anderes'], ['Kurz', 'Kurz'], ['', '']]) { const x = v(cur, h1); assert.ok(x === '' || (x.length >= 20 && x.length <= 65 && x !== cur), `${cur} → ${x}`); }
  assert.equal(meta.proposeTitle({ title: '', h1: ['Auto abmelden'] }), 'Auto abmelden | KFZ-Zulassungsprofis');
  assert.equal(meta.ohneMarke('Impressum | KFZ-Zulassungsprofis'), 'Impressum'); assert.equal(meta.ohneMarke('KFZ-Zulassungsprofis – Kfz-Zulassung. Einfach digital.'), 'KFZ-Zulassungsprofis – Kfz-Zulassung. Einfach digital.');
  // Marke aus der Konfiguration
  const andere = meta.run({ ...ctx, cfg: { ...cfg, company: { brand: 'Beispielmarke' } } });
  assert.equal(fuer(andere, 'title-kurz', '/title-kurz/').proposed, 'Kontakt und Erreichbarkeit | Beispielmarke');
});

test('Description-Vorschläge: aus dem Hauptinhalt, nie mit Skip-Link, Breadcrumb oder H1 am Anfang', () => {
  const d = fuer(M, 'description-fehlt', '/ohne/').proposed;
  assert.ok(d.length >= 50 && d.length <= 160, d); assert.match(d, /^Wir melden Ihr Fahrzeug/); assert.match(d, /[.…]$/);
  // jede Seite der Test-Website: der Vorschlag beginnt nie mit Skip-Link, Breadcrumb oder der H1
  for (const rec of crawl.pages.values()) {
    if (!rec.page) continue; const x = meta.proposeDescription(rec.page);
    assert.doesNotMatch(x, /^(Zum Hauptinhalt|Startseite |KFZ-Zulassungsprofis Preise)/, rec.url); assert.ok(x.length <= 160, rec.url);
    if (rec.page.h1[0] && x) assert.ok(!x.startsWith(rec.page.h1[0]), rec.url);
  }
  // Seite ohne <main>: Skip-Link und Breadcrumb stehen direkt im Body
  const roh = `<html><head><title>T</title></head><body><a href="#inhalt" class="skip-link">Zum Hauptinhalt springen</a><nav aria-label="Brotkrumen"><ol><li><a href="/">Startseite</a></li><li>Preise</li></ol></nav><div id="inhalt"><h1>Preise</h1><p>Transparent kalkuliert: Bei unseren Zulassungsleistungen sind amtliche Gebühren und versicherter Versand bereits enthalten. Neue Kennzeichen kommen auf Wunsch dazu.</p></div></body></html>`;
  assert.equal(meta.proposeDescription(html.parse(roh, 'https://kfz.example/preise/')), 'Transparent kalkuliert: Bei unseren Zulassungsleistungen sind amtliche Gebühren und versicherter Versand bereits enthalten.');
  // selbst wenn der Text (z. B. aus einer anderen Quelle) den Skip-Link enthält, beginnt der Vorschlag danach
  assert.match(meta.proposeDescription({ h1: ['Preise'], text: 'Zum Hauptinhalt springen Preise Wir melden Ihr Fahrzeug an und senden die Unterlagen per Post zurück. Das dauert meist nur wenige Tage.', breadcrumbText: '' }), /^Wir melden Ihr Fahrzeug an/);
  // Abkürzungen beenden keinen Satz; zu wenig Text → kein Vorschlag
  assert.equal(meta.proposeDescription({ h1: [], text: 'Die Bearbeitung dauert ca. 2 Minuten, inkl. Prüfung der Unterlagen. Danach melden wir uns bei Ihnen.' }), 'Die Bearbeitung dauert ca. 2 Minuten, inkl. Prüfung der Unterlagen. Danach melden wir uns bei Ihnen.');
  assert.equal(meta.proposeDescription({ h1: ['Kontakt'], text: 'Kontakt Schreiben Sie uns.' }), '');
  // zu lange Description → gekürzte Fassung des Bestands (höchstens 155 Zeichen)
  const dl = fuer(M, 'description-lang', '/desc-lang/'); assert.ok(dl.current.length > 165); assert.ok(dl.proposed.length <= 155 && dl.proposed.length >= 100, dl.proposed); assert.ok(dl.current.startsWith(dl.proposed.replace(/…$/, '')));
  const dk = fuer(M, 'description-kurz', '/desc-kurz/'); assert.ok(dk.proposed.length > dk.current.length);
  assert.match(fuer(M, 'description-unpassend', '/desc-unpassend/').detail, /^Nur 0 von \d+ Begriffen/);
});

test('Meta-Befunde nennen die Quelldatei der Seite (app/…/page.tsx), wenn das Repository der Website vorliegt', () => {
  const repo = tmp('repo');
  for (const d of ['app', 'app/preise', 'app/zulassungsstelle/[slug]', 'app/[landing]', 'app/rechner/kfz-steuer', 'app/ohne']) { fs.mkdirSync(path.join(repo, d), { recursive: true }); if (d !== 'app/ohne') fs.writeFileSync(path.join(repo, d, 'page.tsx'), '// Test'); }
  fs.mkdirSync(path.join(repo, 'app', 'kennzeichen'), { recursive: true }); fs.writeFileSync(path.join(repo, 'app', 'kennzeichen', 'page.tsx'), '// Test');
  const q = meta.quellFinder(repo);
  assert.equal(q('/'), 'app/page.tsx'); assert.equal(q('/preise/'), 'app/preise/page.tsx'); assert.equal(q('/zulassungsstelle/berlin/'), 'app/zulassungsstelle/[slug]/page.tsx');
  assert.equal(q('/auto-online-anmelden/'), 'app/[landing]/page.tsx'); assert.equal(q('/rechner/kfz-steuer/'), 'app/rechner/kfz-steuer/page.tsx');
  assert.equal(q('/ohne/'), '', 'Ordner ohne page.tsx'); assert.equal(q('/kennzeichen/b/'), '', 'kein passender Unterordner'); assert.equal(q('/../../etc/'), '');
  assert.equal(meta.quellFinder(path.join(repo, 'gibt-es-nicht'))('/preise/'), ''); assert.equal(meta.quellFinder(undefined)('/preise/'), '');
  const m = meta.run({ ...ctx, cfg: { ...cfg, repoRoot: repo } });
  assert.equal(fuer(m, 'title-fehlt', '/ohne/').file, undefined); assert.equal(fuer(m, 'title-lang', '/title-lang/').file, 'app/[landing]/page.tsx');
  assert.ok(M.every(f => f.file === undefined), 'ohne Repository kein file-Feld');
});

test('Zusammenspiel mit dem Autopiloten: Bündelung je Seitenfamilie, Befundspeicher ohne Dubletten', () => {
  // viele gleichartige Meta-Befunde in einer Familie → ein Punkt
  const seiten = Object.fromEntries(['hog', 'b', 'm', 'k'].map(k => [`/kennzeichen/${k}/`, { noindex: false, indexable: true, inSitemap: true, page: { robots: null, title: `Kennzeichen ${k.toUpperCase()} – ein viel zu langer Seitentitel für die Detailseite eines Kürzels` } }]));
  const m = meta.run({ ...ctx, crawl: mit(crawl, { seiten }) }); assert.equal(nach(m, 'title-lang').length, 6);
  const g = aggregate(m, site.base); const b = nach(g, 'title-lang').find(f => f.count === 4);
  assert.ok(b); assert.equal(b.url, site.base + '/kennzeichen/*/'); assert.equal(b.key, 'familie:/kennzeichen/*/'); assert.match(b.title, /^4 Seiten im Bereich \/kennzeichen\/\*\/: Title zu lang$/);
  assert.equal(nach(g, 'title-doppelt').length, 1, 'doppelte Titel bringen ihre Zählung selbst mit');
  // alle Befunde eines Laufs haben verschiedene Fingerprints, auch nach der Bündelung
  const alle = aggregate([...T, ...M], site.base); assert.equal(new Set(alle.map(fingerprint)).size, alle.length);
  // zweiter Lauf auf unverändertem Stand liefert dieselben Befunde in derselben Reihenfolge
  assert.deepEqual(technical.run(ctx).map(fingerprint), T.map(fingerprint)); assert.deepEqual(meta.run(ctx).map(fingerprint), M.map(fingerprint));
});

test('Regeln verändern das Crawl-Ergebnis und die Konfiguration nicht', () => {
  const vorher = JSON.stringify([[...crawl.pages.entries()].slice(0, 15), vorlauf.pages[site.base + '/preise/'], cfg.importantPaths, cfg.allowNoindex]);
  technical.run(ctx); meta.run(ctx);
  assert.equal(JSON.stringify([[...crawl.pages.entries()].slice(0, 15), vorlauf.pages[site.base + '/preise/'], cfg.importantPaths, cfg.allowNoindex]), vorher);
  assert.equal(text(430).split(' ').length, 430);
});
