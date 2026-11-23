'use strict';
// Tests für lib/suggest.js (Quelldateien, Freigabestufe, nächste Schritte) und bin/local-check.js
// (Vorher/Nachher gegen den Build). Ohne Netz; geschrieben wird nur in eigene Temp-Ordner.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const suggest = require('../lib/suggest');
const lc = require('../bin/local-check');
const { fingerprint } = require('../lib/issues');

const REPO = path.resolve(__dirname, '..', '..');
const BASE = 'https://kfz-zulassungsprofis.de';
const CFG = { base: BASE, repoRoot: REPO };
const ordner = [];
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `seo-sl-${name}-`)); ordner.push(d); return d; };
const schreibe = (dir, rel, inhalt) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, inhalt); return f; };
const gibtEs = f => fs.existsSync(path.join(REPO, f));
test.after(() => { for (const d of ordner) fs.rmSync(d, { recursive: true, force: true }); });

// ═══ lib/suggest.js ══════════════════════════════════════════════════════════

test('Quelldateien: jeder fest hinterlegte Pfad existiert im Repo (keine erfundenen Pfade)', () => {
  const alle = suggest.alleQuelldateien();
  assert.ok(alle.length >= 40, 'Tabelle unerwartet klein');
  assert.deepEqual(alle.filter(f => !gibtEs(f)), []);
  for (const f of ['app/sitemap.ts', 'app/robots.ts', 'lib/seo.ts', 'lib/site.ts', 'lib/indexGate.ts', 'lib/pricing.ts', 'config/preise.json', 'public/.htaccess', 'deploy/alte-domain/.htaccess', 'lib/data/zulassungsstellen.json', 'lib/landingpages.ts', 'app/[landing]/page.tsx']) assert.ok(alle.includes(f), f + ' fehlt in der Tabelle');
  // jede Regel verweist auf ein vorhandenes Thema und einen bekannten Modus
  for (const [regel, [thema, modus]] of Object.entries(suggest.REGEL_QUELLE)) { assert.ok(suggest.QUERSCHNITT[thema], `${regel}: Thema ${thema} unbekannt`); assert.ok(['nur', 'zuerst', 'danach'].includes(modus), `${regel}: Modus ${modus}`); }
});

test('sourceFor: jeder Seitentyp bekommt seine Quelldateien', () => {
  const faelle = [
    // Pfad, Typ, erste Quelle, weitere Quellen
    ['/', 'start', 'app/page.tsx', ['lib/homepage.ts']],
    ['/leistungen/ummeldung/', 'leistung', 'lib/services.ts', ['lib/serviceContent.ts', 'lib/catalog.ts', 'app/leistungen/[slug]/page.tsx']],
    ['/ratgeber/was-kostet-eine-kfz-zulassung/', 'ratgeber', 'lib/ratgeber.ts', ['app/ratgeber/[slug]/page.tsx']],
    ['/kfz-zulassung/berlin/', 'stadt', 'lib/staedte.ts', ['app/kfz-zulassung/[stadt]/page.tsx']],
    ['/zulassungsstelle/berlin/', 'behoerde', 'lib/zulassungsstellen.ts', ['lib/data/zulassungsstellen.json', 'app/zulassungsstelle/[slug]/page.tsx']],
    ['/kennzeichen/b/', 'kennzeichen', 'lib/zulassungsstellen.ts', ['lib/data/zulassungsstellen.json', 'app/kennzeichen/[kuerzel]/page.tsx']],
    ['/gewerbe/autohaus/', 'gewerbe', 'lib/gewerbe.ts', ['app/gewerbe/[slug]/page.tsx']],
    ['/rechner/kfz-steuer/', 'rechner', 'app/rechner/kfz-steuer/page.tsx', ['components/KfzSteuerRechner.tsx']],
    ['/vorlagen/vollmacht-zulassung/', 'vorlage', 'app/vorlagen/vollmacht-zulassung/page.tsx', []],
    ['/kfz-zulassung-ohne-eid/', 'landing', 'lib/landingpages.ts', ['app/[landing]/page.tsx']],
    ['/impressum/', 'recht', 'app/impressum/page.tsx', ['lib/site.ts']],
    ['/widerruf/', 'recht', 'app/widerruf/page.tsx', []],
    // Übersichtsseiten
    ['/leistungen/', 'hub', 'app/leistungen/page.tsx', ['lib/services.ts']],
    ['/ratgeber/', 'hub', 'app/ratgeber/page.tsx', ['lib/ratgeber.ts']],
    ['/kfz-zulassung/', 'hub', 'app/kfz-zulassung/page.tsx', ['lib/staedte.ts']],
    ['/zulassungsstelle/', 'hub', 'app/zulassungsstelle/page.tsx', ['lib/zulassungsstellen.ts']],
    ['/kennzeichen/', 'hub', 'app/kennzeichen/page.tsx', ['lib/zulassungsstellen.ts']],
    ['/gewerbe/', 'hub', 'app/gewerbe/page.tsx', ['lib/gewerbe.ts']],
    ['/rechner/', 'hub', 'app/rechner/page.tsx', []],
    ['/vorlagen/', 'hub', 'app/vorlagen/page.tsx', []],
    // feste Einzelseiten
    ['/preise/', 'sonst', 'app/preise/page.tsx', []],
    ['/faq/', 'sonst', 'app/faq/page.tsx', ['lib/faq.ts']],
    ['/auftrag/', 'sonst', 'app/auftrag/page.tsx', []],
    ['/anleitung/', 'sonst', 'app/anleitung/page.tsx', ['lib/anleitung.ts']],
    ['/zulassung-per-whatsapp/', 'sonst', 'app/zulassung-per-whatsapp/page.tsx', ['lib/whatsappFlow.ts']],
  ];
  for (const [pfad, typ, erste, weitere] of faelle) {
    const q = suggest.sourceFor(pfad);
    assert.equal(q.typ, typ, pfad); assert.equal(q.source[0], erste, pfad);
    for (const f of weitere) assert.ok(q.source.includes(f), `${pfad}: ${f} fehlt`);
    assert.deepEqual(q.source.filter(f => !gibtEs(f)), [], pfad);
    assert.ok(q.generator.startsWith(erste + ' ('), `${pfad}: Kurztext „${q.generator}“`);
    assert.equal(q.thema, null); assert.equal(q.live, false);
  }
  assert.equal(suggest.sourceFor('/kfz-zulassung/berlin/').generator, 'lib/staedte.ts (Stadtseiten)');
  // gebündelte Befunde (Platzhalter) und vollständige Adressen mit Query
  assert.deepEqual(suggest.sourceFor('/zulassungsstelle/*/').source, suggest.sourceFor('/zulassungsstelle/berlin/').source);
  assert.deepEqual(suggest.sourceFor(BASE + '/kfz-zulassung/berlin/?x=1#y').source, suggest.sourceFor('/kfz-zulassung/berlin/').source);
  assert.deepEqual(suggest.sourceFor('/preise/index.html').source, ['app/preise/page.tsx']);
  // Dateien und Sonderseiten
  assert.deepEqual(suggest.sourceFor('/sitemap.xml').source, ['app/sitemap.ts']);
  assert.deepEqual(suggest.sourceFor('/robots.txt').source, ['app/robots.ts']);
  assert.deepEqual(suggest.sourceFor('/llms.txt').source, ['app/llms.txt/route.ts']);
  assert.deepEqual(suggest.sourceFor('/404/').source, ['app/not-found.tsx']);
  assert.deepEqual(suggest.sourceFor('/downloads/anleitung-online-zulassung.pdf').source, ['public/downloads/anleitung-online-zulassung.pdf']);
  // unbekannt: ein Segment → Landingpage-Route, tiefer → keine Zuordnung; nie ein Absturz
  assert.deepEqual(suggest.sourceFor('/neues-thema/').source, ['lib/landingpages.ts', 'app/[landing]/page.tsx']);
  assert.deepEqual(suggest.sourceFor('/a/b/c/'), { source: [], generator: '', typ: 'sonst', thema: null, live: false, tipp: '' });
  assert.deepEqual(suggest.sourceFor(null).source, []); assert.equal(suggest.sourceFor(undefined, undefined).generator, '');
  for (const p of ['/constructor/', '/__proto__/', '/toString/x/', '/../../etc/passwd', '/%E0%A4%A']) assert.ok(Array.isArray(suggest.sourceFor(p, 'constructor').source), p);
});

test('sourceFor: jede Seite des echten Builds hat eine Quelle', { skip: !fs.existsSync(path.join(REPO, 'out', 'index.html')) && 'kein Build vorhanden' }, () => {
  const seiten = lc.seitenImBuild(path.join(REPO, 'out'));
  assert.ok(seiten.length > 50);
  const ohne = seiten.filter(s => !suggest.sourceFor(s.pfad).source.length).map(s => s.pfad);
  assert.deepEqual(ohne.slice(0, 10), []);
});

test('sourceFor: Querschnitt je Regel (Titel, Preise, Firmendaten, noindex, Sitemap, robots, Weiterleitungen, alte Domain, Behördendaten)', () => {
  const P = '/kfz-zulassung/berlin/'; const seite = suggest.sourceFor(P).source;
  const q = regel => suggest.sourceFor(P, regel);
  // Titel-Länge: Seitenquelle zuerst, lib/seo.ts als Ergänzung
  assert.deepEqual(q('title-lang').source, [...seite, 'lib/seo.ts', 'app/layout.tsx']); assert.equal(q('title-lang').generator, 'lib/staedte.ts (Stadtseiten)');
  // Preise: Konfiguration vor der Seite
  for (const r of ['preis-alt', 'preis-abweichend', 'aktionspreis-abgelaufen', 'aktion-laeuft-aus', 'streichpreis', 'preis-gebuehren-widerspruch', 'schema-preis']) {
    assert.deepEqual(q(r).source.slice(0, 2), ['config/preise.json', 'lib/pricing.ts'], r); assert.ok(q(r).source.includes('lib/staedte.ts'), r);
    assert.equal(q(r).generator, 'config/preise.json (Preise, mit Freigabe)');
  }
  assert.equal(q('schema-firmendaten').source[0], 'lib/site.ts'); assert.equal(q('impressum-pflichtangabe').source[0], 'lib/site.ts'); assert.ok(q('altmarke-sichtbar').source.includes('lib/site.ts'));
  for (const r of ['noindex-wichtig', 'index-verlust', 'index-drift']) assert.equal(q(r).source[0], 'lib/indexGate.ts', r);
  assert.ok(!q('index-drift').source.includes('lib/staedte.ts'), 'index-drift hängt an keiner einzelnen Seite');
  assert.deepEqual(q('vorschau-noindex').source, ['lib/features.ts', 'config/migration.json']);
  assert.deepEqual(q('sitemap-datei').source, ['app/sitemap.ts']); assert.deepEqual(q('sitemap-lastmod').source, ['app/sitemap.ts']);
  assert.deepEqual(q('sitemap-index-abweichung').source.slice(0, 2), ['app/sitemap.ts', 'lib/indexGate.ts']);
  assert.deepEqual(q('robots').source, ['app/robots.ts']); assert.equal(q('robots-wichtig').source[0], 'app/robots.ts');
  for (const r of ['host-weiterleitung', 'security-header']) { assert.deepEqual(q(r).source, ['public/.htaccess'], r); assert.equal(q(r).live, true); }
  for (const r of ['redirect-kette', 'redirect-loop', 'https', 'gesperrt']) assert.equal(q(r).source[0], 'public/.htaccess', r);
  assert.equal(q('alte-domain-weiterleitung').source[0], 'deploy/alte-domain/.htaccess'); assert.equal(q('alte-domain-weiterleitung').live, true);
  assert.equal(q('behoerdendaten-pruefdatum').source[0], 'lib/data/zulassungsstellen.json');
  assert.deepEqual(q('soll-nicht-lesbar').source, ['config/preise.json', 'config/betrieb.json']);
  assert.ok(q('zeitangabe-abweichend').source.includes('config/betrieb.json'));
  // unbekannte Regel: nur die Seitenquelle; Regel ohne Seite: nur die zentrale Quelle
  assert.deepEqual(q('irgendeine-neue-regel').source, seite);
  assert.deepEqual(suggest.sourceFor(null, 'preis-alt').source, ['config/preise.json', 'lib/pricing.ts']);
  // alles, was genannt wird, gibt es
  for (const r of Object.keys(suggest.REGEL_QUELLE)) assert.deepEqual(q(r).source.filter(f => !gibtEs(f)), [], r);
});

test('sourceFor nennt zur Laufzeit nur Dateien, die es im angegebenen Repo gibt', () => {
  const repo = tmp('repo'); schreibe(repo, 'lib/staedte.ts', '// Test');
  const q = suggest.sourceFor('/kfz-zulassung/berlin/', 'preis-alt', { repoRoot: repo });
  assert.deepEqual(q.source, ['lib/staedte.ts']); assert.equal(q.generator, 'lib/staedte.ts (Stadtseiten)');
  const leer = suggest.sourceFor('/preise/', 'title-lang', { repoRoot: tmp('leer') });
  assert.deepEqual(leer.source, []); assert.equal(leer.generator, '');
});

test('describe: Form des Vorschlags, Freigabe im Klartext, konkrete Schritte', () => {
  const FELDER = ['id', 'rule', 'severity', 'url', 'file', 'generator', 'source', 'current', 'proposed', 'reason', 'risk', 'approval', 'freigabe', 'schritte', 'first_seen', 'title'];
  const it = { id: 'aaaaaaaaaaaa', rule: 'title-lang', severity: 'niedrig', approval: 'manuell', url: BASE + '/kfz-zulassung/berlin/', title: 'Title zu lang: /kfz-zulassung/berlin/', detail: 'Der Titel hat 71 Zeichen.', suggestion: 'Titel kürzen.', proposed: 'Kfz-Zulassung Berlin ohne Termin', first_seen: '2026-11-20T06:00:00.000Z' };
  const v = suggest.describe(it, CFG, []);
  assert.deepEqual(Object.keys(v).sort(), FELDER.slice().sort());
  assert.equal(v.id, it.id); assert.equal(v.rule, 'title-lang'); assert.equal(v.url, it.url); assert.equal(v.title, it.title); assert.equal(v.first_seen, it.first_seen);
  assert.equal(v.file, 'lib/staedte.ts'); assert.equal(v.generator, 'lib/staedte.ts (Stadtseiten)');
  assert.deepEqual(v.source, ['lib/staedte.ts', 'app/kfz-zulassung/[stadt]/page.tsx', 'lib/seo.ts', 'app/layout.tsx']);
  assert.equal(v.current, 'Der Titel hat 71 Zeichen.'); assert.equal(v.proposed, 'Kfz-Zulassung Berlin ohne Termin');
  assert.equal(v.approval, 'manuell'); assert.match(v.freigabe, /Inhaltliche Änderung/);
  assert.ok(Array.isArray(v.schritte) && v.schritte.length >= 5 && v.schritte.every(s => typeof s === 'string' && s.length > 10));
  assert.match(v.schritte[0], /^Quelle öffnen: lib\/staedte\.ts/); assert.ok(v.schritte.some(s => s === 'Änderung: Titel kürzen.')); assert.ok(v.schritte.some(s => /Vorschlag für den neuen Wert: Kfz-Zulassung Berlin/.test(s)));
  assert.ok(v.schritte.some(s => /npm run build/.test(s) && /local-check\.js/.test(s))); assert.ok(v.schritte.some(s => /^Freigabe: /.test(s)));
  assert.deepEqual(JSON.parse(JSON.stringify(v)), v, 'muss sich verlustfrei als JSON ablegen lassen');
  // ohne dritten Parameter und ohne cfg aufrufbar
  assert.equal(suggest.describe(it, CFG).file, 'lib/staedte.ts'); assert.equal(suggest.describe(it).rule, 'title-lang');

  // Freigabestufen
  const stufe = (approval, extra) => suggest.describe({ ...it, approval, ...extra }, CFG, []);
  const preis = stufe('preis', { rule: 'preis-abweichend', url: BASE + '/preise/' });
  assert.match(preis.freigabe, /config\/preise\.json/); assert.match(preis.freigabe, /Deploy prüft/); assert.equal(preis.file, 'config/preise.json');
  assert.ok(preis.schritte.some(s => /freigabe\.freigegeben/.test(s) && /Deploy prüft/.test(s))); assert.match(preis.risk, /config\/preise\.json/);
  assert.match(stufe('recht').freigabe, /rechtlich prüfen/); assert.match(stufe('auto').freigabe, /Technische Korrektur/); assert.equal(stufe(undefined).approval, 'auto');
  assert.match(stufe('sonstwas').freigabe, /Unbekannte Freigabestufe/); assert.match(stufe('constructor').freigabe, /Unbekannte Freigabestufe/);
  assert.equal(new Set(['auto', 'manuell', 'preis', 'recht'].map(a => stufe(a).freigabe)).size, 4);
  assert.equal(stufe('auto', { risk: 'eigene Einschätzung' }).risk, 'eigene Einschätzung');

  // Quelldatei aus dem Befund steht vorn – aber nur, wenn es sie gibt
  const sm = suggest.describe({ id: 'b', rule: 'sitemap-404', severity: 'hoch', approval: 'auto', url: BASE + '/preise/', file: 'app/sitemap.ts', title: 't' }, CFG, []);
  assert.equal(sm.file, 'app/sitemap.ts'); assert.deepEqual(sm.source, ['app/sitemap.ts', 'app/preise/page.tsx']);
  const erfunden = suggest.describe({ id: 'c', rule: 'neue-regel', severity: 'hoch', url: BASE + '/preise/', file: 'scripts/gibt-es-nicht.js', title: 't' }, CFG, []);
  assert.equal(erfunden.file, 'app/preise/page.tsx'); assert.ok(!erfunden.source.includes('scripts/gibt-es-nicht.js'));
  assert.ok(!suggest.describe({ id: 'c2', rule: 'neue-regel', severity: 'hoch', file: 'out/preise/index.html', title: 't' }, CFG, []).source.length, 'Build-Dateien sind keine Quelle');
  const nurDatei = suggest.describe({ id: 'd', rule: 'autopilot-modul', severity: 'hoch', file: 'seo-autopilot/lib/util.js', title: 't' }, CFG, []);
  assert.deepEqual(nurDatei.source, ['seo-autopilot/lib/util.js']); assert.equal(nurDatei.generator, 'seo-autopilot/lib/util.js (laut Befund)'); assert.equal(nurDatei.url, '');

  // gebündelter Befund: Hinweis auf die gemeinsame Quelle
  const buendel = suggest.describe({ id: 'e', rule: 'description-lang', severity: 'niedrig', approval: 'manuell', url: BASE + '/zulassungsstelle/*/', count: 37, title: '37 Seiten im Bereich /zulassungsstelle/*/: Description zu lang' }, CFG, []);
  assert.equal(buendel.file, 'lib/zulassungsstellen.ts'); assert.match(buendel.schritte[0], /Betroffen sind 37 Seiten im Bereich \/zulassungsstelle\/\*\//);

  // defekter Link / defekte Datei: Quelle ist die verlinkende Seite, nicht das fehlende Ziel
  const link = suggest.describe({ id: 'f', rule: 'defekter-link', severity: 'mittel', approval: 'auto', url: BASE + '/gibt-es-nicht/', title: 'Interner Link auf 404: /gibt-es-nicht/', detail: 'Verlinkt von: /kfz-zulassung/berlin/, /faq/' }, CFG, []);
  assert.deepEqual(link.source, ['lib/staedte.ts', 'app/kfz-zulassung/[stadt]/page.tsx', 'app/faq/page.tsx', 'lib/faq.ts']); assert.equal(link.generator, 'lib/staedte.ts (Stadtseiten)');
  const datei = suggest.describe({ id: 'g', rule: 'datei-defekt', severity: 'hoch', url: BASE + '/downloads/fehlt.pdf', title: 't', detail: 'HTTP 404. Verlinkt von: /anleitung/.' }, CFG, []);
  assert.deepEqual(datei.source, ['app/anleitung/page.tsx', 'lib/anleitung.ts']);

  // nur am Server prüfbar; fremde Adresse ohne Regelquelle
  const host = suggest.describe({ id: 'h', rule: 'host-weiterleitung', severity: 'hoch', approval: 'auto', url: 'https://www.kfz-zulassungsprofis.de/preise/', file: 'public/.htaccess', title: 't' }, CFG, []);
  assert.deepEqual(host.source, ['public/.htaccess']); assert.ok(host.schritte.some(s => /Am Build nicht prüfbar/.test(s))); assert.ok(!host.schritte.some(s => /lokal behoben/.test(s)));
  const fremd = suggest.describe({ id: 'i', rule: 'neue-regel', severity: 'info', url: 'https://example.org/x/', title: 't' }, CFG, []);
  assert.deepEqual(fremd.source, []); assert.equal(fremd.file, ''); assert.equal(fremd.generator, ''); assert.match(fremd.schritte[0], /keine einzelne|nicht zuordnen/);
});

test('describe: der Prüfschritt passt dazu, wie sich die Regel vor dem Deploy prüfen lässt', () => {
  const v = (rule, p, extra) => suggest.describe({ id: 'p', rule, severity: 'hoch', approval: 'auto', url: BASE + p, title: 't', ...extra }, CFG, []);
  const lokalBehoben = s => /muss dort unter „lokal behoben“ stehen/.test(s);
  // gleiche Listen wie der lokale Check
  assert.equal(lc.NUR_LIVE, suggest.NUR_LIVE); assert.equal(lc.NUR_NEU, suggest.NUR_NEU);
  // nur am Server prüfbar: nie „lokal behoben“ versprechen
  for (const r of suggest.NUR_LIVE) { const x = v(r, '/preise/'); assert.equal(suggest.sourceFor('/preise/', r).live, true, r); assert.ok(!x.schritte.some(lokalBehoben), r); assert.ok(x.schritte.some(s => /^Am Build nicht prüfbar/.test(s)), r); }
  const langsam = v('langsam', '/preise/');
  assert.ok(langsam.schritte.some(s => /Antwortzeiten misst erst der Server/.test(s))); assert.ok(!langsam.schritte.some(s => /weiterleitungen-lokal-testen/.test(s)), 'kein Weiterleitungstest für Ladezeiten');
  assert.deepEqual(langsam.source, ['app/preise/page.tsx']);
  // Vergleichsregeln: am Build nur „neu entstanden“ aussagekräftig
  for (const r of suggest.NUR_NEU.filter(x => !suggest.sourceFor('/preise/', x).live)) { const x = v(r, '/preise/'); assert.ok(!x.schritte.some(lokalBehoben), r); assert.ok(x.schritte.some(s => /nicht unter „neu entstanden“/.test(s)), r); }
  // gewöhnliche Regel: lokal bestätigbar
  assert.ok(v('title-lang', '/preise/').schritte.some(lokalBehoben));
  // verschwundene Seite: Seitenquelle und Weiterleitungsdatei
  const weg = v('erreichbarkeit-verlust', '/ratgeber/was-kostet-eine-kfz-zulassung/');
  assert.deepEqual(weg.source, ['lib/ratgeber.ts', 'app/ratgeber/[slug]/page.tsx', 'public/.htaccess']); assert.ok(weg.schritte.some(s => /301/.test(s)));
  // gebündelter defekter Link: verlinkende Seiten aus den Einzelbefunden
  const buendel = v('defekter-link', '/kfz-zulassung/*/', { count: 2, detail: 'Beispiele: /kfz-zulassung/x/, /kfz-zulassung/y/', examples: [{ url: BASE + '/kfz-zulassung/x/', detail: 'Verlinkt von: /gewerbe/autohaus/' }, { url: BASE + '/kfz-zulassung/y/', detail: 'Verlinkt von: /faq/' }] });
  assert.deepEqual(buendel.source, ['lib/gewerbe.ts', 'app/gewerbe/[slug]/page.tsx', 'app/faq/page.tsx', 'lib/faq.ts']);
  // defekte Datei, die es im Repo gibt (fehlt nur auf dem Server): verlinkende Seite und die Ablage in public/
  const pdf = v('datei-defekt', '/downloads/anleitung-online-zulassung.pdf', { detail: `HTTP 404. Verlinkt von: ${BASE}/anleitung/.` });
  assert.deepEqual(pdf.source, ['app/anleitung/page.tsx', 'lib/anleitung.ts', 'public/downloads/anleitung-online-zulassung.pdf']);
});

test('describe: Sammelbefund über verschiedene Seiten nennt die Quellen der Beispielseiten, nicht die Startseite', () => {
  const ex = ps => ps.map(p => ({ url: BASE + p, title: 't: ' + p }));
  // so liefern die Inhaltsregeln Treffer auf mehreren Seiten: url = Startseite, key „alle:…“, count + examples
  const v = suggest.describe({ id: 's', rule: 'zeit-versprechen', severity: 'mittel', approval: 'recht', url: BASE + '/', key: 'alle:express', count: 21, title: 'Express-Angebot ohne festgelegte Dauer – 21 Seiten', examples: ex(['/faq/', '/kfz-zulassung/berlin/', '/leistungen/ummeldung/', '/kfz-zulassung/hamburg/']) }, CFG, []);
  assert.equal(v.generator, 'app/faq/page.tsx (feste Seite)'); assert.ok(!v.source.includes('app/page.tsx'), 'nicht die Startseite');
  assert.deepEqual(v.source, ['app/faq/page.tsx', 'lib/faq.ts', 'lib/staedte.ts', 'app/kfz-zulassung/[stadt]/page.tsx', 'lib/services.ts', 'lib/serviceContent.ts', 'lib/catalog.ts', 'app/leistungen/[slug]/page.tsx', 'config/betrieb.json', 'lib/betrieb.ts']);
  assert.match(v.schritte[0], /Betroffen sind 21 Seiten \(z\. B\. \/faq\/, \/kfz-zulassung\/berlin\/, \/leistungen\/ummeldung\/\) – steht die Stelle in einer gemeinsamen Komponente/);
  assert.equal(v.url, BASE + '/', 'die URL des Befunds bleibt unverändert');
  // Sammelbefund an einer Quelldatei (Preise): die Datei zuerst, danach die Seiten, auf denen der Betrag steht
  const p = suggest.describe({ id: 'q', rule: 'preis-alt', severity: 'kritisch', approval: 'preis', file: 'config/preise.json', key: 'alt:128', count: 2, title: 'Altpreis – 2 Seiten', examples: ex(['/preise/', '/leistungen/ummeldung/']) }, CFG, []);
  assert.deepEqual(p.source.slice(0, 3), ['config/preise.json', 'lib/pricing.ts', 'app/preise/page.tsx']); assert.ok(p.source.includes('lib/services.ts')); assert.equal(p.generator, 'config/preise.json (Preise, mit Freigabe)');
  // Bündel einer Seitenfamilie und Einzelbefund mit einem Beispiel der eigenen Seite: unverändert über den Pfad
  const fam = suggest.describe({ id: 'r', rule: 'title-lang', severity: 'niedrig', url: BASE + '/zulassungsstelle/*/', count: 2, title: 't', examples: ex(['/zulassungsstelle/a/', '/zulassungsstelle/b/']) }, CFG, []);
  assert.equal(fam.generator, 'lib/zulassungsstellen.ts (Behördenseiten)'); assert.match(fam.schritte[0], /im Bereich \/zulassungsstelle\/\*\//);
  // Bündel einer Seitenfamilie mit EINER Seite (Bündelung ab 1 Treffer): Quelle und Schritte wie beim Einzelbefund dieser Seite, kein „*“
  for (const [regel, seite] of [['thin-content', '/zulassungsstelle/berlin/'], ['h1-fehlt', '/kfz-zulassung/hamburg/'], ['schema-fehlt', '/ratgeber/was-kostet-eine-kfz-zulassung/']]) {
    const fp = seite.replace(/\/[^/]+\/$/, '/*/');
    const eins = suggest.describe({ id: 'x1', rule: regel, severity: 'niedrig', approval: 'manuell', url: BASE + fp, key: 'familie:' + fp, count: 1, title: `1 Seite im Bereich ${fp}: t (${seite})`, examples: ex([seite]) }, CFG, []);
    const einzeln = suggest.describe({ id: 'x2', rule: regel, severity: 'niedrig', approval: 'manuell', url: BASE + seite, title: 't' }, CFG, []);
    assert.deepEqual([eins.source, eins.schritte], [einzeln.source, einzeln.schritte], regel); assert.ok(!eins.schritte.some(x => x.includes('*')), regel);
    assert.equal(eins.url, BASE + fp, 'die URL des Befunds bleibt unverändert');
  }
  assert.ok(suggest.describe({ id: 'x3', rule: 'thin-content', severity: 'niedrig', url: BASE + '/zulassungsstelle/*/', count: 1, title: 't', examples: ex(['/zulassungsstelle/berlin/']) }, CFG, []).schritte[0].includes('Dort den Eintrag für /zulassungsstelle/berlin/ suchen.'));
  // ab zwei Seiten bleibt der Familienhinweis; ohne Beispiele bleibt der Pfad des Bündels
  assert.match(suggest.describe({ id: 'x4', rule: 'thin-content', severity: 'niedrig', url: BASE + '/zulassungsstelle/*/', count: 2, title: 't', examples: ex(['/zulassungsstelle/a/', '/zulassungsstelle/b/']) }, CFG, []).schritte[0], /Betroffen sind 2 Seiten im Bereich \/zulassungsstelle\/\*\//);
  assert.equal(suggest.describe({ id: 'x5', rule: 'thin-content', severity: 'niedrig', url: BASE + '/zulassungsstelle/*/', count: 1, title: 't', examples: [{ url: 'https://example.org/x/' }] }, CFG, []).generator, fam.generator, 'fremde Beispielseite → Pfad des Bündels');
  assert.deepEqual(suggest.describe({ id: 'u', rule: 'thin-content', severity: 'niedrig', url: BASE + '/', title: 't', examples: ex(['/']) }, CFG, []).source, ['app/page.tsx', 'lib/homepage.ts']);
  // fremde Hosts in examples werden ignoriert
  assert.deepEqual(suggest.describe({ id: 'w', rule: 'thin-content', severity: 'niedrig', url: BASE + '/', count: 2, title: 't', examples: [{ url: 'https://example.org/x/' }, null, { url: BASE + '/preise/' }] }, CFG, []).source, ['app/preise/page.tsx']);
  // sourceFor mit einer Liste: Kurztext gehört zur ersten Seite, die eine vorhandene Datei hat
  assert.equal(suggest.sourceFor(['/a/b/c/', '/kfz-zulassung/berlin/']).generator, 'lib/staedte.ts (Stadtseiten)');
});

test('buildPatches bleibt aufrufbar und erzeugt nichts; Patch-Helfer sind entfernt', () => {
  const daten = tmp('patches');
  assert.deepEqual(suggest.buildPatches([{ id: 'a', status: 'offen', rule: 'canonical-fehlt', url: BASE + '/' }], { ...CFG, dataDir: daten }), []);
  assert.deepEqual(fs.readdirSync(daten), [], 'es entsteht kein patches-Ordner');
  for (const alt of ['unifiedDiff', 'lineDiff', 'generatorFor']) assert.equal(suggest[alt], undefined, alt);
  // so ruft der Kern auf: buildPatches → describe je offenem Befund
  const patches = suggest.buildPatches([], CFG);
  assert.equal(suggest.describe({ id: 'x', rule: 'robots', severity: 'niedrig', url: BASE + '/robots.txt', file: 'app/robots.ts', title: 't' }, CFG, patches).file, 'app/robots.ts');
});

test('buildFileFor / fileForUrl: Datei zuerst wörtlich, dann <pfad>/index.html', () => {
  const b = tmp('bf'); schreibe(b, 'index.html', 'x'); schreibe(b, 'preise/index.html', 'x'); schreibe(b, 'downloads/anleitung.pdf', '%PDF'); schreibe(b, 'opengraph-image', 'png'); schreibe(b, 'a b/index.html', 'x');
  assert.equal(suggest.buildFileFor('/', b), 'index.html');
  assert.equal(suggest.buildFileFor('/preise/', b), 'preise/index.html'); assert.equal(suggest.buildFileFor('/preise', b), 'preise/index.html'); assert.equal(suggest.buildFileFor('/preise/index.html', b), 'preise/index.html');
  assert.equal(suggest.buildFileFor('/preise/?x=1#y', b), 'preise/index.html');
  assert.equal(suggest.buildFileFor('/downloads/anleitung.pdf', b), 'downloads/anleitung.pdf', 'PDF wird wörtlich gefunden');
  assert.equal(suggest.buildFileFor('/opengraph-image', b), 'opengraph-image'); assert.equal(suggest.buildFileFor('/a%20b/', b), 'a b/index.html');
  for (const p of ['/fehlt/', '/downloads/fehlt.pdf', '/downloads/', '/../' + path.basename(b) + '/index.html', '/preise/../../x', '/%E0%A4%A', '']) assert.equal(suggest.buildFileFor(p, b), p === '' ? 'index.html' : null, p);
  assert.equal(suggest.buildFileFor('/', ''), null);
  const cfg = { base: BASE, buildDir: b };
  assert.equal(suggest.fileForUrl(BASE + '/preise/', cfg), 'preise/index.html'); assert.equal(suggest.fileForUrl('https://example.org/preise/', cfg), null); assert.equal(suggest.fileForUrl('', cfg), null); assert.equal(suggest.fileForUrl(BASE + '/preise/', { base: BASE }), null);
});

test('Quelltexte ohne Altlasten des Vorgängerprojekts', () => {
  for (const f of ['lib/suggest.js', 'bin/local-check.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    assert.doesNotMatch(src, /tarif|volt-?gas|pm2|\/var\/www|nginx|hetzner|generate-[a-z]+\.js|agb\.html|\/vg\//i, f);
  }
});

// ═══ bin/local-check.js ══════════════════════════════════════════════════════

const seite = o => `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>${o.title}</title><meta name="description" content="Beschreibung der Seite ${o.pfad} für den Test, ausreichend lang formuliert.">${o.robots ? `<meta name="robots" content="${o.robots}">` : ''}<link rel="canonical" href="${BASE}${o.pfad}"></head><body><header><nav><a href="/">Start</a></nav></header><main><h1>${o.h1}</h1><p>${o.text || 'Ein kurzer Absatz mit etwas Inhalt für die Auswertung.'}</p>${(o.links || []).map(l => `<a href="${l}">Verweis ${l}</a>`).join(' ')}</main><footer><p>Fußzeile</p></footer><script>self.__next_f=[];self.__next_f.push([1,"<a href=\\"/nur-im-skript/\\">x</a>"])</script></body></html>`;
const SITEMAP = urls => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url>\n<loc>${u}</loc>\n<lastmod>2026-11-0${1 + (u.length % 9)}</lastmod>\n</url>`).join('\n')}\n</urlset>\n`;

/** Kleiner künstlicher Build: 3 Seiten, Sitemap, robots.txt, PDF – dazu Technikpfade, die nie mitzählen dürfen. */
function baueBuild(opt = {}) {
  const root = tmp('build'); const out = path.join(root, 'out');
  schreibe(out, 'index.html', seite({ pfad: '/', title: 'Startseite Test', h1: 'Start', links: ['/preise/', '/preise/?leistung=x#oben', '/preise', '/kfz-zulassung/berlin/', '/downloads/anleitung.pdf', '/downloads/fehlt.pdf', '/gibt-es-nicht/', '/api/auftrag.php', '/seo/', '/analytics/', '/_next/static/x.js', 'https://example.org/fremd/', 'mailto:info@example.org', 'tel:+4930123'] }));
  schreibe(out, 'preise/index.html', seite({ pfad: '/preise/', title: 'Preise Test', h1: 'Preise', links: ['/', '/kfz-zulassung/berlin/', ...(opt.hamburg ? ['/kfz-zulassung/hamburg/'] : [])] }));
  schreibe(out, 'kfz-zulassung/berlin/index.html', seite({ pfad: '/kfz-zulassung/berlin/', title: 'Berlin Test', h1: 'Berlin', robots: opt.berlinRobots === undefined ? 'noindex, follow' : opt.berlinRobots, links: ['/', '/gibt-es-nicht/'] }));
  if (opt.hamburg) schreibe(out, 'kfz-zulassung/hamburg/index.html', seite({ pfad: '/kfz-zulassung/hamburg/', title: 'Hamburg Test', h1: 'Hamburg', robots: 'noindex, follow', links: ['/', '/kfz-zulassung/berlin/'] }));
  schreibe(out, 'downloads/anleitung.pdf', '%PDF-1.4 Test');
  // nie als Seite: Fehlerseite, Build-Dateien, Schnittstellen, geschützte Werkzeuge
  schreibe(out, '404.html', seite({ pfad: '/404/', title: '404', h1: '404' })); schreibe(out, '404/index.html', seite({ pfad: '/404/', title: '404', h1: '404' }));
  schreibe(out, '_next/static/chunks/index.html', '<html></html>'); schreibe(out, 'api/index.html', '<html></html>'); schreibe(out, 'api/auftrag.php', '<?php');
  schreibe(out, 'seo/index.html', '<html></html>'); schreibe(out, 'analytics/index.html', '<html></html>'); schreibe(out, 'index.txt', 'RSC'); schreibe(out, 'preise/index.txt', 'RSC');
  if (opt.sitemap !== false) schreibe(out, 'sitemap.xml', SITEMAP(opt.sitemap || [BASE + '/', BASE + '/preise/', BASE + '/weg/']));
  if (opt.robots !== false) schreibe(out, 'robots.txt', `User-Agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);
  return { root, out };
}
/** Künstliche Regelmodule: werten nur den Crawl-Datensatz aus – so sind die erwarteten Befunde eindeutig. */
function baueRegeln() {
  const dir = tmp('regeln');
  schreibe(dir, 'seiten.js', `'use strict';
module.exports = { gruppe: 'Testregeln', rules: ['t-noindex', 't-404', 't-datei', 't-behoben', 'index-verlust', 'security-header'], run(ctx) {
  const out = [];
  for (const rec of ctx.crawl.pages.values()) {
    if (rec.page && rec.noindex) out.push({ rule: 't-noindex', severity: 'mittel', approval: 'auto', url: rec.url, key: 'noindex', title: 'noindex: ' + rec.path, detail: 'Seite steht auf noindex.' });
    if (rec.status === 404) out.push({ rule: 't-404', severity: 'hoch', approval: 'auto', url: rec.url, key: '404', title: 'Nicht gefunden: ' + rec.path, detail: rec.inSitemap ? 'steht in der Sitemap' : 'ist verlinkt' });
    const vr = ctx.prev && ctx.prev.pages ? ctx.prev.pages[rec.url] : null;
    if (vr && vr.indexable && rec.noindex) out.push({ rule: 'index-verlust', severity: 'hoch', approval: 'auto', url: rec.url, key: 'verlust', title: 'Indexverlust: ' + rec.path });
  }
  for (const [u, d] of ctx.crawl.dateien) if (d.status !== 200) out.push({ rule: 't-datei', severity: 'hoch', approval: 'auto', url: u, key: 'datei', title: 'Datei fehlt', detail: 'Verlinkt von: ' + d.quellen.join(', ') });
  out.push({ rule: 'security-header', severity: 'niedrig', approval: 'auto', url: ctx.cfg.base + '/', key: 'csp', title: 'Header fehlt (nur am Server prüfbar)' });
  out.push(null, { ohne: 'Regel' });
  return out;
} };`);
  schreibe(dir, 'kaputt.js', `'use strict';\nmodule.exports = { rules: ['k-regel'], run() { throw new TypeError('absichtlich kaputt'); } };`);
  schreibe(dir, 'ohne.js', `'use strict';\nmodule.exports = { rules: 'keine Liste' };`);
  schreibe(dir, 'syntax.js', `'use strict';\nmodule.exports = {`);
  return dir;
}
const MODULE = ['seiten', 'kaputt', 'ohne', 'syntax', 'gibtsnicht'];
const cfgFuer = (b, daten) => ({ ...require('../config'), base: BASE, repoRoot: b.root, buildDir: b.out, dataDir: daten, extraPaths: [], redirectChecks: [] });
const still = () => { const zeilen = []; const f = (...a) => zeilen.push(a.join(' ')); return { log: f, err: f, zeilen }; };

test('seitenImBuild: zählt index.html-Seiten auf und lässt Admin-/Technikpfade aus', () => {
  const b = baueBuild();
  assert.deepEqual(lc.seitenImBuild(b.out).map(s => s.pfad), ['/', '/kfz-zulassung/berlin/', '/preise/']);
  assert.deepEqual(lc.TECHNIKPFADE, ['/api/', '/analytics/', '/seo/', '/_next/', '/404/']);
  assert.deepEqual(lc.seitenImBuild(path.join(b.root, 'fehlt')), []);
});

test('buildLocalCrawl: Datensatz wie im Live-Lauf – Sitemap aus dem Build, Dateien wörtlich, fehlende Ziele als 404', async () => {
  const b = baueBuild(); const cfg = cfgFuer(b, tmp('daten'));
  const crawl = await lc.buildLocalCrawl(cfg, null);
  const u = p => BASE + p; const rec = p => crawl.pages.get(u(p));
  assert.deepEqual([...crawl.pages.keys()].sort(), [u('/'), u('/gibt-es-nicht/'), u('/kfz-zulassung/berlin/'), u('/preise'), u('/preise/'), u('/weg/')].sort(), 'Technikpfade, fremde Hosts, mailto/tel und Skript-Inhalte tauchen nicht auf');
  // abgeleitete Felder laut Vertrag
  assert.deepEqual([rec('/').path, rec('/').typ, rec('/').status, rec('/').noindex, rec('/').indexable, rec('/').inSitemap], ['/', 'start', 200, false, true, true]);
  assert.deepEqual([rec('/preise/').typ, rec('/preise/').indexable, rec('/preise/').inSitemap, rec('/preise/').inlinks], ['sonst', true, true, 1]);
  assert.deepEqual([rec('/kfz-zulassung/berlin/').typ, rec('/kfz-zulassung/berlin/').noindex, rec('/kfz-zulassung/berlin/').indexable, rec('/kfz-zulassung/berlin/').inSitemap, rec('/kfz-zulassung/berlin/').inlinks], ['stadt', true, false, false, 2]);
  assert.equal(rec('/').inlinks, 2); assert.match(rec('/').contentHash, /^[0-9a-f]{40}$/); assert.equal(rec('/').changed, false);
  assert.equal(rec('/').page.title, 'Startseite Test'); assert.equal(rec('/').page.h1[0], 'Start'); assert.ok(rec('/').page.text.includes('Ein kurzer Absatz')); assert.ok(rec('/').page.anchors.length >= 10);
  assert.equal(rec('/').sitemapFile, u('/sitemap.xml')); assert.match(rec('/').lastmod, /^2026-11-0\d$/);
  // fehlende Ziele: verlinkt bzw. nur in der Sitemap
  assert.deepEqual([rec('/gibt-es-nicht/').status, rec('/gibt-es-nicht/').inlinks, !!rec('/gibt-es-nicht/').page], [404, 2, false]);
  assert.deepEqual([rec('/weg/').status, rec('/weg/').inSitemap, rec('/weg/').indexable], [404, true, false]);
  // Ordner ohne Schrägstrich: wie der Server als Weiterleitung, nicht als zweite Seite
  assert.deepEqual([rec('/preise').status, rec('/preise').redirectedTo, rec('/preise').chain.length, !!rec('/preise').page], [200, u('/preise/'), 1, false]);
  // Dateien: PDF wird wörtlich gefunden, die fehlende Datei nicht
  assert.deepEqual([...crawl.dateien.keys()], [u('/downloads/anleitung.pdf'), u('/downloads/fehlt.pdf')]);
  assert.equal(crawl.dateien.get(u('/downloads/anleitung.pdf')).status, 200); assert.equal(crawl.dateien.get(u('/downloads/anleitung.pdf')).bytes, 13);
  assert.deepEqual(crawl.dateien.get(u('/downloads/fehlt.pdf')), { status: 404, quellen: [u('/')], contentType: null, bytes: null });
  // Sitemap, robots, Zählung
  assert.equal(crawl.sitemap.entries.size, 3); assert.deepEqual([crawl.sitemap.files[0].url, crawl.sitemap.files[0].status, crawl.sitemap.files[0].count, crawl.sitemap.files[0].error], [u('/sitemap.xml'), 200, 3, null]);
  assert.equal(crawl.robotsStatus, 200); assert.deepEqual(crawl.robots.sitemaps, [u('/sitemap.xml')]);
  assert.deepEqual([crawl.stats.crawled, crawl.stats.indexable, crawl.stats.noindex, crawl.stats.fetched], [6, 2, 1, 0]);
  assert.deepEqual(crawl.stats.typen, { start: { gesamt: 1, indexable: 1 }, stadt: { gesamt: 1, indexable: 0 }, sonst: { gesamt: 1, indexable: 1 } });
  assert.deepEqual(crawl.hostChecks, []); assert.equal(crawl.base, BASE); assert.equal(crawl.lokal, true);

  // Vorlauf als Vergleichsbasis: geänderte Inhalte werden erkannt
  const prev = { at: '2026-11-21T06:00:00.000Z', base: BASE, pages: { [u('/')]: { status: 200, contentHash: rec('/').contentHash }, [u('/preise/')]: { status: 200, contentHash: 'anders' } } };
  const mit = await lc.buildLocalCrawl(cfg, prev);
  assert.equal(mit.pages.get(u('/')).changed, false); assert.equal(mit.pages.get(u('/preise/')).changed, true);
});

test('buildLocalCrawl: Sitemap-Index, fehlende Sitemap und fehlende robots.txt', async () => {
  const b = baueBuild({ sitemap: false, robots: false }); const cfg = cfgFuer(b, tmp('daten'));
  const ohne = await lc.buildLocalCrawl(cfg, null);
  assert.equal(ohne.robotsStatus, 404); assert.equal(ohne.sitemap.entries.size, 0);
  assert.deepEqual([ohne.sitemap.files[0].url, ohne.sitemap.files[0].status, ohne.sitemap.files[0].error], [BASE + '/sitemap.xml', 404, 'HTTP 404']);
  // Sitemap-Index mit zwei Teil-Sitemaps, eine davon fehlt; ungültige <loc> werden gezählt, nicht übernommen
  schreibe(b.out, 'robots.txt', `User-agent: *\nDisallow: /kfz-zulassung/\nSitemap: ${BASE}/sitemap.xml\n`);
  schreibe(b.out, 'sitemap.xml', `<sitemapindex><sitemap><loc>${BASE}/sm/a.xml</loc></sitemap><sitemap><loc>${BASE}/sm/fehlt.xml</loc></sitemap></sitemapindex>`);
  schreibe(b.out, 'sm/a.xml', `<urlset><url><loc>${BASE}/preise/</loc></url><url><loc>/relativ/</loc></url><url><loc>${BASE}/kfz-zulassung/berlin/?a=1&amp;b=2</loc></url></urlset>`);
  const idx = await lc.buildLocalCrawl(cfg, null);
  assert.deepEqual(idx.sitemap.files.map(f => [pathOfUrl(f.url), f.status, f.count, f.error, f.ungueltig || 0]), [['/sitemap.xml', 200, 0, null, 0], ['/sm/a.xml', 200, 2, null, 1], ['/sm/fehlt.xml', 404, 0, 'HTTP 404', 0]]);
  assert.ok(idx.sitemap.entries.has(BASE + '/preise/')); assert.ok(idx.sitemap.entries.has(BASE + '/kfz-zulassung/berlin/?a=1&b=2'), 'Entities werden aufgelöst');
  assert.equal(idx.pages.get(BASE + '/preise/').inSitemap, true); assert.equal(idx.pages.get(BASE + '/preise/').sitemapFile, BASE + '/sm/a.xml');
  assert.equal(idx.pages.get(BASE + '/kfz-zulassung/berlin/').robotsAllowed, false, 'robots.txt aus dem Build gilt');
});
const pathOfUrl = u => new URL(u).pathname;

test('pruefe: fehlende und kaputte Regelmodule werden übersprungen und benannt', async () => {
  const b = baueBuild(); const crawl = await lc.buildLocalCrawl(cfgFuer(b, tmp('daten')), null);
  const lauf = lc.pruefe(MODULE, { crawl, prev: null, cfg: { base: BASE }, hostChecks: [], soll: null }, baueRegeln());
  assert.deepEqual(lauf.module.map(m => [m.name, m.status]), [['seiten', 'ok'], ['kaputt', 'defekt'], ['ohne', 'defekt'], ['syntax', 'defekt'], ['gibtsnicht', 'fehlt']]);
  assert.equal(lauf.module[0].gruppe, 'Testregeln'); assert.deepEqual([lauf.module[0].befunde, lauf.module[0].nurLive], [4, 1], 'null und Einträge ohne Regel zählen nicht; nur am Server prüfbare Befunde werden verworfen');
  assert.match(lauf.module[1].grund, /TypeError: absichtlich kaputt/); assert.match(lauf.module[2].grund, /Schnittstelle/); assert.match(lauf.module[3].grund, /SyntaxError/);
  assert.ok(lauf.regeln.has('t-behoben') && !lauf.regeln.has('k-regel'), 'nur Regeln gelaufener Module gelten als geprüft'); assert.ok(!lauf.regeln.has('security-header'));
  assert.deepEqual(lauf.findings.map(f => f.rule).sort(), ['t-404', 't-404', 't-datei', 't-noindex']);
});

test('wochenModule: gleicher Umfang wie der Wochenlauf des Autopiloten', () => {
  const namen = lc.wochenModule();
  for (const n of ['technical', 'meta', 'kfz', 'schema', 'content', 'faq']) assert.ok(namen.includes(n), n);
});

/** Live-Stand im Datenordner: offene Befunde (issues.json) und letzter Crawl (last-crawl.json). */
function liveStand(daten) {
  const u = p => BASE + p;
  const roh = [
    { rule: 't-noindex', severity: 'mittel', url: u('/kfz-zulassung/berlin/'), key: 'noindex', title: 'noindex: /kfz-zulassung/berlin/', status: 'offen' },           // bleibt → unverändert
    { rule: 't-behoben', severity: 'kritisch', url: u('/preise/'), key: 'x', title: 'Fehler, den der Build behebt', status: 'offen', count: 3 },                       // lokal behoben
    { rule: 'security-header', severity: 'niedrig', url: u('/'), key: 'hsts', title: 'Header fehlt', status: 'offen' },                                               // nur am Server prüfbar
    { rule: 'index-verlust', severity: 'hoch', url: u('/alt/'), key: 'verlust', title: 'Indexverlust: /alt/', status: 'offen' },                                      // Vergleichsregel: nie „behoben“
    { rule: 'regel-eines-anderen-moduls', severity: 'hoch', url: u('/'), key: 'y', title: 'nicht geprüft', status: 'offen' },                                         // Modul lief lokal nicht
    { rule: 'k-regel', severity: 'hoch', url: u('/'), key: 'z', title: 'Regel des ausgefallenen Moduls', status: 'offen' },                                           // Modul defekt
    { rule: 't-404', severity: 'hoch', url: u('/gibt-es-nicht/'), key: '404', title: 'Nicht gefunden: /gibt-es-nicht/', status: 'behoben', resolved_at: '2026-11-20T06:00:00.000Z' }, // war behoben → lokal neu
  ];
  const issues = {}; for (const f of roh) { const id = fingerprint(f); issues[id] = { ...f, id, first_seen: '2026-11-19T06:00:00.000Z', last_seen: '2026-11-21T06:00:00.000Z', runs: 2 }; }
  const st = { issues, runs: [{ runId: 'weekly-x', kind: 'weekly', at: '2026-11-21T06:00:05.000Z', open: 6 }], lastDigest: { tag: null, woche: null, monat: null } };
  fs.writeFileSync(path.join(daten, 'issues.json'), JSON.stringify(st, null, 1));
  const pg = { title: 'x' };
  const last = { at: '2026-11-21T06:00:00.000Z', base: BASE, stats: {}, pages: {
    [u('/')]: { status: 200, indexable: true, noindex: false, page: pg }, [u('/kfz-zulassung/berlin/')]: { status: 200, indexable: true, noindex: false, page: pg },
    [u('/verschwunden/')]: { status: 200, indexable: true, noindex: false, page: pg }, [u('/alt-weiter/')]: { status: 200, redirectedTo: u('/'), page: null }, [u('/datei.pdf')]: { status: 200, page: null } } };
  fs.writeFileSync(path.join(daten, 'last-crawl.json'), JSON.stringify(last));
  const id = (rule, p, key) => fingerprint({ rule, url: u(p), key });
  return { st, id };
}

test('run: Vorher/Nachher je Fingerprint – lokal behoben, neu entstanden, unverändert, nicht lokal prüfbar', async () => {
  const b = baueBuild(); const daten = tmp('daten'); const cfg = cfgFuer(b, daten); const { st, id } = liveStand(daten); const aus = still();
  // Voraussetzung: /kfz-zulassung/berlin/ ist Kernseite (importantPaths) → wird wie im Prüflauf nie gebündelt, Befunde dort behalten ihre Einzel-ID
  assert.ok(cfg.importantPaths.includes('/kfz-zulassung/berlin/'));
  const vorher = fs.readFileSync(path.join(daten, 'issues.json'), 'utf8');
  const res = await lc.run(cfg, { ...aus, module: MODULE, rulesDir: baueRegeln(), soll: null });
  assert.equal(res.code, 0); const r = res.result;
  assert.equal(res.file, path.join(daten, 'local-check.json')); assert.deepEqual(JSON.parse(fs.readFileSync(res.file, 'utf8')), JSON.parse(JSON.stringify(r)));
  assert.deepEqual(fs.readdirSync(daten).sort(), ['issues.json', 'last-crawl.json', 'local-check.json'], 'sonst entsteht nichts im Datenordner');
  assert.equal(fs.readFileSync(path.join(daten, 'issues.json'), 'utf8'), vorher, 'die Live-Befunde bleiben unangetastet');

  assert.deepEqual([r.base, r.build, r.vergleich, r.liveRunAt], [BASE, 'out', true, '2026-11-21T06:00:00.000Z']); assert.match(r.at, /^\d{4}-\d\d-\d\dT/); assert.match(r.buildAt, /^\d{4}-\d\d-\d\dT/);
  assert.deepEqual([r.pagesChecked, r.pagesIndexable, r.pagesNoindex, r.pagesInSitemap, r.linksBroken, r.filesChecked], [3, 2, 1, 3, 2, 2]);
  assert.deepEqual([r.pagesWithoutLocalFile, r.pagesWithoutLocalFileExamples, r.pagesNew, r.pagesNewExamples], [1, ['/verschwunden/'], 1, ['/preise/']]);
  // lokal behoben
  assert.deepEqual(r.resolved, [{ id: id('t-behoben', '/preise/', 'x'), rule: 't-behoben', severity: 'kritisch', url: BASE + '/preise/', title: 'Fehler, den der Build behebt', count: 3, key: 'x' }]);
  // neu entstanden: zwei 404, die fehlende Datei, der Indexverlust gegenüber dem Live-Crawl – nicht der nur live prüfbare Header
  assert.deepEqual(r.added.map(a => [a.rule, a.url.replace(BASE, '')]), [['t-datei', '/downloads/fehlt.pdf'], ['index-verlust', '/kfz-zulassung/berlin/'], ['t-404', '/gibt-es-nicht/'], ['t-404', '/weg/']], 'sortiert nach Schweregrad, dann Titel');
  assert.equal(r.added[2].id, id('t-404', '/gibt-es-nicht/', '404'), 'gleicher Fingerprint wie im Befundspeicher'); assert.equal(r.added[3].zusatz, 'steht in der Sitemap');
  assert.equal(r.unchanged, 1);
  assert.deepEqual(r.before, { open: 2, bySeverity: { kritisch: 1, mittel: 1 } }); assert.deepEqual(r.after, { open: 5, bySeverity: { mittel: 1, hoch: 4 } });
  assert.equal(r.after.open, r.before.open - r.resolved.length + r.added.length, 'Nachher = Vorher − behoben + neu');
  assert.deepEqual(r.notComparable, { open: 4, byRule: { 'security-header': 1, 'index-verlust': 1, 'regel-eines-anderen-moduls': 1, 'k-regel': 1 } });
  // je Fingerprint
  assert.equal(r.byId[id('t-noindex', '/kfz-zulassung/berlin/', 'noindex')], 'unverändert'); assert.equal(r.byId[id('t-behoben', '/preise/', 'x')], 'lokal behoben');
  assert.equal(r.byId[id('t-404', '/weg/', '404')], 'neu entstanden'); assert.equal(r.byId[id('security-header', '/', 'hsts')], 'nicht lokal prüfbar');
  assert.equal(r.byId[id('index-verlust', '/alt/', 'verlust')], 'nicht lokal prüfbar', 'Vergleichsregeln gelten nie als lokal behoben'); assert.equal(r.byId[id('k-regel', '/', 'z')], 'nicht lokal prüfbar');
  assert.equal(Object.keys(r.byId).length, Object.values(st.issues).filter(i => i.status === 'offen').length + r.added.length);
  assert.equal(r.findings.length, 5); assert.ok(!r.findings.some(f => f.rule === 'security-header'));
  // Module und Regelumfang
  assert.deepEqual(r.modulesSkipped, ['kaputt', 'ohne', 'syntax', 'gibtsnicht']); assert.deepEqual(r.modules.map(m => m.status), ['ok', 'defekt', 'defekt', 'defekt', 'fehlt']);
  assert.deepEqual(r.rulesEvaluated, ['index-verlust', 't-404', 't-behoben', 't-datei', 't-noindex']); assert.deepEqual(r.rulesOnlyNew, ['index-verlust']); assert.ok(r.rulesLiveOnly.includes('security-header'));
  assert.equal(r.rulesSkipped.length, 5); assert.match(r.rulesSkipped[0], /nur am Server prüfbar/); assert.ok(r.rulesSkipped.includes('Prüfmodul „gibtsnicht“ nicht vorhanden') && r.rulesSkipped.includes('Prüfmodul „kaputt“ ausgefallen'));
  assert.match(r.note, /Lokal behoben/); assert.deepEqual(r.hinweise, []);
  // Konsole: nur Zahlen, keine Befundtitel
  const text = aus.zeilen.join('\n');
  assert.match(text, /3 Seiten \(2 indexierbar, 1 noindex\)/); assert.match(text, /Lokal behoben: 1 · neu entstanden: 4 · unverändert: 1 · nicht lokal prüfbar: 4/); assert.match(text, /seiten 5 \(\+1 nur am Server prüfbar\)/); assert.match(text, /Prüfmodul kaputt ist ausgefallen/);
  assert.doesNotMatch(text, /Fehler, den der Build behebt|Nicht gefunden|absichtlich kaputt/);
  // --details listet die Titel
  const laut = still(); await lc.run(cfg, { ...laut, details: true, module: MODULE, rulesDir: baueRegeln(), soll: null });
  assert.match(laut.zeilen.join('\n'), /✔ behoben: kritisch Fehler, den der Build behebt/); assert.match(laut.zeilen.join('\n'), /✚ neu: +hoch Nicht gefunden: \/weg\//); assert.match(laut.zeilen.join('\n'), /kaputt: TypeError: absichtlich kaputt/);
});

test('run: behebt der Build einen Befund, wandert er nach „lokal behoben“; ohne Änderung bleibt er „unverändert“', async () => {
  const daten = tmp('daten'); const { id } = liveStand(daten); const regeln = baueRegeln(); const k = id('t-noindex', '/kfz-zulassung/berlin/', 'noindex');
  const a = await lc.run(cfgFuer(baueBuild(), daten), { ...still(), module: ['seiten'], rulesDir: regeln, soll: null });
  assert.equal(a.result.byId[k], 'unverändert');
  const b = await lc.run(cfgFuer(baueBuild({ berlinRobots: '' }), daten), { ...still(), module: ['seiten'], rulesDir: regeln, soll: null });
  assert.equal(b.result.byId[k], 'lokal behoben'); assert.deepEqual(b.result.resolved.map(x => x.rule).sort(), ['t-behoben', 't-noindex']);
  assert.ok(!b.result.added.some(x => x.rule === 'index-verlust'), 'kein Indexverlust mehr gegenüber dem Live-Crawl'); assert.equal(b.result.pagesIndexable, 3);
});

test('run ohne issues.json: nur die lokale Befundliste, kein Vergleich', async () => {
  const b = baueBuild(); const daten = path.join(tmp('daten'), 'neu'); const aus = still();
  const res = await lc.run(cfgFuer(b, daten), { ...aus, module: ['seiten'], rulesDir: baueRegeln(), soll: null });
  const r = res.result; assert.equal(res.code, 0);
  assert.deepEqual([r.vergleich, r.before, r.resolved, r.added, r.unchanged, r.byId, r.liveRunAt], [false, null, [], [], 0, {}, null]);
  assert.deepEqual(r.findings.map(f => f.rule), ['t-datei', 't-404', 't-404', 't-noindex']); assert.equal(r.after.open, 4); assert.ok(r.findings.every(f => /^[0-9a-f]{12}$/.test(f.id)));
  assert.match(r.note, /Kein Vergleich möglich/); assert.equal(r.hinweise.length, 1); assert.match(r.hinweise[0], /Kein Live-Crawl/);
  assert.deepEqual(fs.readdirSync(daten), ['local-check.json'], 'Datenordner wird bei Bedarf angelegt, issues.json entsteht nicht');
  assert.match(aus.zeilen.join('\n'), /Kein Vergleich \(keine issues\.json im Datenordner\) – Befunde am Build: 4/);
  // kaputte issues.json bzw. fremder Vorlauf: kein Absturz, kein Vergleich mit falscher Basis
  fs.writeFileSync(path.join(daten, 'issues.json'), '{ kaputt'); fs.writeFileSync(path.join(daten, 'last-crawl.json'), JSON.stringify({ at: 'x', base: 'https://example.org', pages: {} }));
  const warn = console.warn; console.warn = () => {};
  let zwei; try { zwei = await lc.run(cfgFuer(b, daten), { ...still(), module: ['seiten'], rulesDir: baueRegeln(), soll: null }); } finally { console.warn = warn; }
  assert.equal(zwei.result.vergleich, false); assert.ok(zwei.result.hinweise.some(h => /andere[nr]? Basis-URL/.test(h)));
});

test('run: Hinweise bei Vorschau-Build (alles noindex) und fehlender Sitemap', async () => {
  const root = tmp('vorschau'); const out = path.join(root, 'out');
  schreibe(out, 'index.html', seite({ pfad: '/', title: 'Start', h1: 'Start', robots: 'noindex, nofollow', links: ['/preise/'] })); schreibe(out, 'preise/index.html', seite({ pfad: '/preise/', title: 'Preise', h1: 'Preise', robots: 'noindex, nofollow' }));
  const res = await lc.run(cfgFuer({ root, out }, tmp('daten')), { ...still(), module: [], rulesDir: baueRegeln(), soll: null });
  assert.equal(res.result.pagesIndexable, 0); assert.ok(res.result.hinweise.some(h => /Vorschau-Build/.test(h))); assert.ok(res.result.hinweise.some(h => /Sitemap/.test(h)));
});

test('Build fehlt: klare Meldung „erst npm run build“, Rückgabe 2, nichts wird geschrieben', async () => {
  const root = tmp('ohne'); const daten = path.join(root, 'daten'); const aus = still();
  const res = await lc.run({ ...require('../config'), base: BASE, repoRoot: root, buildDir: path.join(root, 'out'), dataDir: daten }, aus);
  assert.deepEqual([res.code, res.result, res.file], [2, null, null]); assert.match(aus.zeilen.join('\n'), /Kein Build gefunden \(out\/index\.html fehlt\) – erst `npm run build` ausführen/);
  assert.ok(!fs.existsSync(daten));
  // Ordner vorhanden, aber ohne Startseite (abgebrochener Build) zählt ebenfalls als fehlend
  fs.mkdirSync(path.join(root, 'out', 'preise'), { recursive: true });
  assert.equal((await lc.run({ base: BASE, repoRoot: root, buildDir: path.join(root, 'out'), dataDir: daten }, still())).code, 2);
  assert.equal((await lc.run({ base: BASE, repoRoot: root, buildDir: '', dataDir: daten }, still())).code, 2);
});

// Kommandozeile: eigene Umgebung, damit Einstellungen des aufrufenden Terminals nicht hineinwirken
const BIN = path.join(__dirname, '..', 'bin', 'local-check.js');
function cli(env, args = []) {
  const sauber = { ...process.env }; for (const k of Object.keys(sauber)) if (/^(SEO_|GSC_|SMTP_)/.test(k)) delete sauber[k];
  return spawnSync(process.execPath, [BIN, ...args], { env: { ...sauber, ...env }, encoding: 'utf8', timeout: 120000 });
}

test('Kommandozeile: fehlender Build → Exit 2 mit Meldung auf stderr', () => {
  const root = tmp('cli'); const daten = path.join(root, 'daten');
  const r = cli({ SEO_BUILD_DIR: path.join(root, 'kein-build'), SEO_DATA_DIR: daten });
  assert.equal(r.status, 2, r.stderr); assert.match(r.stderr, /Kein Build gefunden/); assert.match(r.stderr, /erst `npm run build` ausführen/); assert.equal(r.stdout, '');
  assert.ok(!fs.existsSync(path.join(daten, 'local-check.json')));
});

test('Kommandozeile: künstlicher Build mit den echten Regelmodulen – läuft durch, auch wenn ein Modul fehlt oder ausfällt', () => {
  const b = baueBuild(); const daten = tmp('cli-daten');
  const r = cli({ SEO_BUILD_DIR: b.out, SEO_DATA_DIR: daten });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const j = JSON.parse(fs.readFileSync(path.join(daten, 'local-check.json'), 'utf8'));
  assert.deepEqual([j.base, j.vergleich, j.pagesChecked, j.pagesIndexable, j.pagesNoindex, j.pagesInSitemap], [BASE, false, 3, 2, 1, 3]);
  assert.deepEqual(j.modules.map(m => m.name), lc.wochenModule()); assert.ok(j.modules.every(m => ['ok', 'fehlt', 'defekt'].includes(m.status)));
  assert.ok(Array.isArray(j.findings) && j.findings.every(f => !lc.NUR_LIVE.includes(f.rule)));
  assert.match(r.stdout, /Lokaler Check gegen den Build .*: 3 Seiten \(2 indexierbar, 1 noindex\), 3 in der Sitemap/); assert.match(r.stdout, /Ergebnis: local-check\.json/);
  for (const f of j.findings) assert.ok(!r.stdout.includes(f.title), 'ohne --details stehen keine Befundtitel in der Ausgabe');
  assert.deepEqual(fs.readdirSync(daten), ['local-check.json']);
});

test('echtes Technik-Modul auf dem künstlichen Build: fehlende Ziele werden gemeldet, das vorhandene PDF nicht', async t => {
  let technical; try { technical = require('../lib/rules/technical'); } catch (e) { return t.skip('lib/rules/technical.js derzeit nicht ladbar: ' + e.message); }
  if (!technical || typeof technical.run !== 'function' || !technical.rules.includes('defekter-link')) return t.skip('technical.js hat (noch) nicht die erwartete Schnittstelle');
  const b = baueBuild(); const daten = tmp('daten'); const cfg = cfgFuer(b, daten);
  const res = await lc.run(cfg, { ...still(), module: ['technical'], soll: null });
  const r = res.result; assert.equal(r.modules[0].status, 'ok', r.modules[0].grund);
  const hat = (regel, p) => r.findings.some(f => f.rule === regel && f.url === BASE + p);
  assert.ok(hat('defekter-link', '/gibt-es-nicht/'), 'defekter Link'); assert.ok(hat('sitemap-404', '/weg/'), 'Sitemap-Adresse ohne Seite');
  if (technical.rules.includes('datei-defekt')) { assert.ok(hat('datei-defekt', '/downloads/fehlt.pdf'), 'fehlende Datei'); assert.ok(!hat('datei-defekt', '/downloads/anleitung.pdf'), 'vorhandenes PDF ist kein Befund'); }
  assert.ok(!r.findings.some(f => /anleitung\.pdf/.test(f.url || '')), 'das PDF gilt nicht als 404');
  assert.ok(!r.findings.some(f => lc.NUR_LIVE.includes(f.rule)), 'nur am Server prüfbare Regeln bleiben außen vor');
  assert.ok(!r.findings.some(f => /\/(api|seo|analytics|_next|404)\//.test(f.url || '')), 'Technikpfade erzeugen keine Befunde');
  // die Vorschläge zu diesen Befunden nennen echte Quelldateien bzw. bleiben leer – nie erfundene Pfade
  for (const f of r.findings) { const v = suggest.describe({ ...f, id: f.id }, CFG, []); assert.deepEqual(v.source.filter(x => !gibtEs(x)), [], f.rule); assert.ok(v.schritte.length >= 4); }

  // Vergleichsbasis ist der letzte Live-Crawl: Eine Seite, die live indexierbar war und im Build noindex ist, fällt vor dem Deploy auf
  if (!technical.rules.includes('index-verlust')) return;
  const b2 = baueBuild({ hamburg: true }); const daten2 = tmp('daten'); const hh = BASE + '/kfz-zulassung/hamburg/';
  fs.writeFileSync(path.join(daten2, 'last-crawl.json'), JSON.stringify({ at: '2026-11-21T06:00:00.000Z', base: BASE, stats: {}, pages: { [hh]: { status: 200, typ: 'stadt', indexable: true, noindex: false, inSitemap: true, page: { title: 'Hamburg Test', robots: null } } } }));
  fs.writeFileSync(path.join(daten2, 'issues.json'), JSON.stringify({ issues: {}, runs: [] }));
  const r2 = (await lc.run(cfgFuer(b2, daten2), { ...still(), module: ['technical'], soll: null })).result;
  assert.equal(r2.modules[0].status, 'ok', r2.modules[0].grund);
  // Hamburg ist keine Kernseite: schon der eine Treffer steht im Bündel der Familie (gleiche ID wie im Prüflauf), die Seite in examples
  const verlust = r2.added.find(f => f.rule === 'index-verlust' && (f.examples || []).some(e => e.url === hh));
  assert.ok(verlust, 'Indexverlust gegenüber dem Live-Stand wird als „neu entstanden“ gemeldet'); assert.equal(r2.byId[verlust.id], 'neu entstanden'); assert.ok(r2.rulesOnlyNew.includes('index-verlust'));
  assert.deepEqual([verlust.url, verlust.key, verlust.count, verlust.examples], [BASE + '/kfz-zulassung/*/', 'familie:/kfz-zulassung/*/', 1, [{ url: hh }]]);
});

test('vergleiche: Einträge tragen key und bis zu 5 Beispielseiten (nur Adressen) – Sammelbefunde zeigt das SEO Center mit Seiten statt „/“', () => {
  const bsp = Array.from({ length: 7 }, (_, i) => ({ url: `${BASE}/seite-${i}/`, title: 'geheimer Titel ' + i, detail: 'Detail ' + i }));
  const sammel = { rule: 'a', severity: 'hoch', url: BASE + '/', key: 'alle:telefon', title: 'Telefonnummer abweichend auf 7 Seiten', count: 7, examples: bsp };
  const einzel = { rule: 'a', severity: 'mittel', url: BASE + '/preise/', key: 'k', title: 'einzeln' };
  const ohne = { rule: 'a', severity: 'niedrig', url: BASE + '/x/', title: 'ohne Schlüssel', examples: [null, { title: 'ohne url' }] };
  const v = lc.vergleiche([sammel, einzel, ohne], [], new Set(['a']));
  const neu = v.added.find(x => x.key === 'alle:telefon');
  assert.deepEqual(neu.examples, bsp.slice(0, 5).map(e => ({ url: e.url })), 'erste 5, je nur { url }'); assert.equal(neu.count, 7);
  const e = v.added.find(x => x.title === 'einzeln'); assert.equal(e.key, 'k'); assert.equal('examples' in e, false, 'ohne Beispiele kein leeres Feld');
  const o = v.added.find(x => x.title === 'ohne Schlüssel'); assert.equal('key' in o, false); assert.equal('examples' in o, false);
  assert.deepEqual(v.findings.find(x => x.key === 'alle:telefon').examples.length, 5, 'auch in der Befundliste');
  // lokal behoben: der Live-Befund behält ebenfalls key und Beispiele
  const live = { ...sammel, id: fingerprint(sammel), status: 'offen' };
  assert.deepEqual(lc.vergleiche([], [live], new Set(['a'])).resolved[0].examples.map(x => x.url), bsp.slice(0, 5).map(x => x.url));
});

test('vergleiche: Vergleichs- und Serverregeln werden nie als „lokal behoben“ gezählt', () => {
  const f = (rule, p, extra) => ({ rule, severity: 'hoch', url: BASE + p, key: 'k', title: rule + ' ' + p, ...extra });
  const live = [f('a', '/1/'), f('a', '/2/'), f('seite-geaendert', '/'), f('index-drift', '/kennzeichen/'), f('https', '/x/'), f('langsam', '/')].map(x => ({ ...x, id: fingerprint(x), status: 'offen' }));
  const lokal = [f('a', '/2/'), f('a', '/3/', { severity: 'kritisch' }), f('seite-geaendert', '/preise/', { severity: 'info' }), f('a', '/3/')];
  const v = lc.vergleiche(lokal, live, new Set(['a', 'seite-geaendert', 'index-drift', 'https']));
  assert.deepEqual(v.resolved.map(x => x.url), [BASE + '/1/']); assert.deepEqual(v.added.map(x => x.url), [BASE + '/3/', BASE + '/preise/'], 'doppelte lokale Befunde zählen einmal, sortiert nach Schweregrad');
  assert.equal(v.unchanged, 1); assert.deepEqual(v.notComparable, { open: 4, byRule: { 'seite-geaendert': 1, 'index-drift': 1, https: 1, langsam: 1 } });
  assert.deepEqual([v.before.open, v.after.open], [2, 3]); assert.equal(v.after.open, v.before.open - v.resolved.length + v.added.length);
  for (const r of [...lc.NUR_LIVE, ...lc.NUR_NEU]) assert.equal(lc.vergleiche([], [{ ...f(r, '/'), id: 'abc', status: 'offen' }], new Set([r])).resolved.length, 0, r);
  assert.deepEqual(lc.NUR_LIVE.filter(r => lc.NUR_NEU.includes(r)), []);
});
