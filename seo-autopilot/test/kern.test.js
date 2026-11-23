// Kern-Tests: Hilfsfunktionen, Parser, Crawler (lokaler Test-Server), Seitencache/Offline-Modus,
// Befundspeicher, Bündelung, Bericht/Score und die Ablaufsteuerung.
//   node --test seo-autopilot/test/kern.test.js
// Ohne Internet (nur 127.0.0.1), geschrieben wird ausschließlich in eigene Ordner unter os.tmpdir().
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { start, seite, LANG } = require('./fixtures/kern-site');
const util = require('../lib/util');
const html = require('../lib/html');
const crawler = require('../lib/crawler');
const { IssueStore, fingerprint } = require('../lib/issues');
const { aggregate, optionen: buendelOptionen, FAMILIEN, NICHT_BUENDELN } = require('../lib/aggregate');
const report = require('../lib/report');
const actions = require('../lib/actions');
const opportunities = require('../lib/opportunities');

const AP = path.join(__dirname, '..');
const Z = n => String.fromCharCode(n); // unsichtbare Zeichen gezielt erzeugen (nie als Literal im Quelltext)
const NBSP = Z(0xA0), SCHMAL = Z(0x202F), WJ = Z(0x2060), SHY = Z(0xAD), ZWSP = Z(0x200B), ZWJ = Z(0x200D), BOM = Z(0xFEFF);
const OPT = { maxPages: 200, concurrency: 3, delayMs: 0, timeoutMs: 3000, retries: 1, retryDelayMs: 0, offline: false };
const ordner = [];
const tmp = name => { const d = fs.mkdtempSync(path.join(os.tmpdir(), `seo-kern-${name}-`)); ordner.push(d); return d; };
const klon = x => JSON.parse(JSON.stringify(x));
const pfade = c => [...c.pages.keys()].map(u => u.replace(c.base, ''));
/** Port, auf dem sicher nichts lauscht. */
const toterPort = () => new Promise(r => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
function mitWarnungen(fn) { const alt = console.warn; const w = []; console.warn = (...a) => w.push(a.join(' ')); try { return [fn(), w]; } finally { console.warn = alt; } }
const F = (rule, p, extra = {}) => ({ rule, severity: 'niedrig', approval: 'manuell', url: 'https://kfz-zulassungsprofis.de' + p, title: `Title zu lang (72 Zeichen): ${p}`, detail: 'Detail ' + p, ...extra });
const B = 'https://kfz-zulassungsprofis.de';

// ─── Test-Website ────────────────────────────────────────────────────────────
async function baueSite() {
  const s = await start(); const fremd = await start();
  fremd.page('/fremd/', { title: 'Fremde Seite' });
  s.state.preis = '110,00';
  s.route('/robots.txt', () => ({ body: `User-agent: *\nDisallow: /gesperrt/\nSitemap: ${s.base}/sitemap.xml\n` }));
  s.route('/sitemap.xml', () => ({ type: 'application/xml', body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/', '/preise/', '/auftrag/', '/kfz-zulassung/berlin/', '/zulassungsstelle/a/', '/weiter/'].map(p => `<url><loc>${s.base}${p}</loc><lastmod>2026-11-03T00:00:00.000Z</lastmod></url>`).join('')}<url><loc>kein gültiger Eintrag</loc></url><url><loc>https://fremd.example/x/</loc></url></urlset>` }));
  s.page('/', () => ({ title: 'Kfz-Zulassung online', brot: false, body: `<p>${LANG}</p>
    <a href="/preise/">Preise</a> <a href="/auftrag/?leistung=abmeldung">Abmelden</a> <a href="/auftrag/?leistung=ummeldung#formular">Ummelden</a> <a href="/auftrag/#top">Auftrag</a>
    <a href="/rechner/?typ=pkw">Rechner</a> <a href="/doppel-robots/">Doppelt</a> <a href="/xrobots/">Header</a> <a href="/weiter/">Weiter</a> <a href="/wackel/">Wackel</a> <a href="/immer500/">500</a>
    <a href="/kette-1/">Kette</a> <a href="/gesperrt/">Gesperrt</a> <a href="/umzug/">Umzug</a> <a href="/extern/">Extern</a> <a href="/kfz-zulassung/berlin/">Berlin</a> <a href="/zulassungsstelle/a/">Behörde</a>
    <a href="/downloads/anleitung.pdf">Anleitung (PDF)</a> <a href="/downloads/fehlt.pdf">Fehlt (PDF)</a> <a href="/api/auftrag.php">API</a> <a href="/analytics/">Analyse</a> <a href="/_next/static/x.js">Chunk</a>
    <a href="mailto:info@example.org">Mail</a> <a href="https://wa.me/49123">WhatsApp</a> <a href="${fremd.base}/fremd/">Fremd</a>` }));
  s.page('/preise/', st => ({ title: 'Preise', body: `<p>Zulassung ${st.state.preis}${NBSP}€ inklusive Gebühren. ${LANG}</p><a href="/auftrag/?leistung=neuzulassung">Jetzt beauftragen</a> <a href="/rechner/?typ=motorrad#ergebnis">Rechner</a>`, ld: [{ '@context': 'https://schema.org', '@type': 'Service', name: 'Zulassung', image: `${st.base}/_next/static/media/logo.${st.state.build || 'b1'}77.png` }] }));
  s.page('/auftrag/', { title: 'Auftrag', body: `<p>${LANG}</p>` });
  s.page('/rechner/', { title: 'Rechner', body: `<p>${LANG}</p>` });
  s.page('/impressum/', { title: 'Impressum', robots: ['noindex'], body: '<p>Angaben gemäß § 5 DDG</p>' });
  s.page('/servicebedingungen/', { title: 'Servicebedingungen', robots: ['noindex, follow'], body: '<p>Entwurf</p>' });
  s.page('/doppel-robots/', { title: 'Zwei robots-Angaben', robots: ['noindex', 'index, follow'], body: `<p>${LANG}</p>` });
  s.route('/xrobots/', () => ({ html: seite({ title: 'Header-noindex', body: `<p>${LANG}</p>` }, s.base, '/xrobots/'), headers: { 'x-robots-tag': 'noindex, nofollow' } }));
  s.route('/weiter/', () => ({ redirect: s.base + '/ziel/' }));
  s.page('/ziel/', { title: 'Ziel', body: `<p>${LANG}</p>` });
  s.route('/wackel/', () => (s.hits('/wackel/').length === 1 ? { status: 503, body: 'kurz weg' } : { html: seite({ title: 'Wackel', body: `<p>${LANG}</p>` }, s.base, '/wackel/') }));
  s.route('/immer500/', () => ({ status: 500, type: 'text/html', body: '<h1>Fehler</h1>' }));
  for (const i of [1, 2, 3, 4]) s.page(`/kette-${i}/`, { title: `Kette ${i}`, body: `<p>${LANG}</p>${i < 4 ? `<a href="/kette-${i + 1}/">weiter</a>` : ''}` });
  s.page('/gesperrt/', { title: 'Gesperrt' });
  s.route('/umzug/', () => (s.state.umgezogen ? { redirect: s.base + '/ziel/' } : { html: seite({ title: 'Umzug', body: `<p>${LANG}</p>` }, s.base, '/umzug/') }));
  s.route('/extern/', () => (s.state.umgezogen ? { redirect: fremd.base + '/fremd/', status: 302 } : { html: seite({ title: 'Extern', body: `<p>${LANG}</p>` }, s.base, '/extern/') }));
  s.page('/kfz-zulassung/berlin/', { title: 'Kfz-Zulassung Berlin', body: `<p>${LANG}</p>` });
  s.page('/zulassungsstelle/a/', { title: 'Zulassungsstelle A', robots: ['index, follow'], body: `<p>${LANG}</p>` });
  s.route('/downloads/anleitung.pdf', () => ({ type: 'application/pdf', body: '%PDF-1.7 …', headers: { 'content-length': '11' } }));
  s.route('/api/auftrag.php', () => ({ status: 405, body: 'Nur POST' }));
  s.route('/analytics/', () => ({ status: 401, body: 'Login erforderlich' }));
  // Weiterleitungsprüfungen
  s.page('/hziel/', { title: 'H-Ziel' });
  s.route('/h1/', () => ({ redirect: s.base + '/hziel/' }));
  s.route('/h2a/', () => ({ redirect: s.base + '/h2b/' })); s.route('/h2b/', () => ({ redirect: s.base + '/hziel/' }));
  s.route('/h302/', () => ({ redirect: s.base + '/hziel/', status: 302 }));
  s.route('/hfalsch/', () => ({ redirect: s.base + '/preise/' }));
  s.route('/h404/', () => ({ redirect: s.base + '/gibtsnicht/' }));
  s.route('/hloop/', () => ({ redirect: s.base + '/hloop2/' })); s.route('/hloop2/', () => ({ redirect: s.base + '/hloop/' }));
  s.fremd = fremd;
  return s;
}

let site, crawl1, cacheDatei;
test.before(async () => {
  site = await baueSite();
  crawl1 = await crawler.crawl({ ...OPT, base: site.base + '/', extraPaths: ['/servicebedingungen/'] }); // Schrägstrich am Ende der Basis wird entfernt
  cacheDatei = path.join(tmp('cache'), 'page-cache.json');
  crawler.saveCache(cacheDatei, crawl1, [{ von: 'http://beispiel.invalid/', erwartet: site.base + '/', final: site.base + '/', status: 200, spruenge: 1, maxSpruenge: 1, ok: true, grund: '' }]);
});
test.after(async () => { await site.close(); await site.fremd.close(); for (const d of ordner) fs.rmSync(d, { recursive: true, force: true }); });

// ─── util ────────────────────────────────────────────────────────────────────
test('util.norm: unsichtbare Zeichen raus, geschützte Leerzeichen → Leerzeichen, Mehrfach-Leerraum → eins', () => {
  assert.equal(util.norm(`110,00${NBSP}€${SCHMAL}netto`), '110,00 € netto');
  assert.equal(util.norm(`KFZ${WJ}-Zulas${SHY}sungs${ZWSP}pro${ZWJ}fis${BOM}`), 'KFZ-Zulassungsprofis');
  assert.equal(util.norm('  a \n\t b   c  '), 'a b c');
  assert.equal(util.norm(null), ''); assert.equal(util.norm(undefined), ''); assert.equal(util.norm(12), '12');
});
test('util.pageType / family / pathOf / stripQuery', () => {
  const typ = { '/': 'start', '/preise/': 'sonst', '/leistungen/': 'hub', '/leistungen/abmeldung/': 'leistung', '/ratgeber/': 'hub', '/ratgeber/evb-nummer/': 'ratgeber', '/kfz-zulassung/': 'hub', '/kfz-zulassung/berlin/': 'stadt', '/zulassungsstelle/': 'hub', '/zulassungsstelle/berlin/': 'behoerde', '/kennzeichen/': 'hub', '/kennzeichen/b/': 'kennzeichen', '/gewerbe/': 'hub', '/gewerbe/leasing/': 'gewerbe', '/rechner/kfz-steuer/': 'rechner', '/vorlagen/vollmacht-zulassung/': 'vorlage', '/kfz-zulassung-ohne-eid/': 'landing', '/zulassungsdienst-online/': 'landing', '/impressum/': 'recht', '/widerruf/': 'recht', '/servicebedingungen/': 'recht', '/404/': 'sonst', '/kontakt/': 'sonst' };
  for (const [p, t] of Object.entries(typ)) assert.equal(util.pageType(p), t, p);
  assert.equal(util.pageType('https://kfz-zulassungsprofis.de/kennzeichen/b/?x=1#y'), 'kennzeichen');
  assert.equal(util.family('/zulassungsstelle/berlin/'), '/zulassungsstelle/*/');
  assert.equal(util.family('/kennzeichen/b/'), '/kennzeichen/*/');
  assert.equal(util.family('/preise/'), '/preise/'); assert.equal(util.family('/'), '/');
  assert.equal(util.family('https://x.de/kfz-zulassung/berlin/'), '/kfz-zulassung/*/');
  assert.equal(util.pathOf('https://x.de/a/b/?c=1#d'), '/a/b/'); assert.equal(util.pathOf('/a/?b=1'), '/a/'); assert.equal(util.pathOf(null), '');
  assert.equal(util.stripQuery('https://x.de/auftrag/?leistung=abmeldung#top'), 'https://x.de/auftrag/');
  assert.equal(util.stripQuery('kein url'), 'kein url');
});
test('util.isNoindex / matchesAny', () => {
  assert.equal(util.isNoindex({ page: { robots: 'index, follow' }, headers: {} }), false);
  assert.equal(util.isNoindex({ page: { robots: null }, headers: {} }), false, 'fehlendes robots-Meta = indexierbar');
  assert.equal(util.isNoindex({ page: { robots: 'noindex, follow' } }), true);
  assert.equal(util.isNoindex({ page: { robots: 'NONE' } }), true);
  assert.equal(util.isNoindex({ page: null, headers: { 'x-robots-tag': 'noindex, nofollow' } }), true);
  assert.equal(util.isNoindex({ headers: { 'x-robots-tag': 'googlebot: noindex' } }), true);
  assert.equal(util.isNoindex(null), false);
  const muster = [/^\/kennzeichen\/[^/]+\/$/g]; // auch mit g-Flag wiederholbar
  assert.equal(util.matchesAny('/kennzeichen/b/', ['/impressum/'], muster), true);
  assert.equal(util.matchesAny('/kennzeichen/b/', ['/impressum/'], muster), true);
  assert.equal(util.matchesAny('/kennzeichen/', ['/impressum/'], muster), false);
  assert.equal(util.matchesAny('/impressum/', ['/impressum/'], []), true);
  assert.equal(util.matchesAny('/x/'), false);
});
test('util.writeJsonAtomic / readJson: atomar, keine Reste, kaputtes JSON → Standardwert + Warnung', () => {
  const d = tmp('atomar'); const f = path.join(d, 'unter', 'daten.json');
  util.writeJsonAtomic(f, { a: 1 }); assert.deepEqual(JSON.parse(fs.readFileSync(f, 'utf8')), { a: 1 });
  util.writeJsonAtomic(f, { a: 2, text: 'ä' }, 0); assert.equal(fs.readFileSync(f, 'utf8'), '{"a":2,"text":"ä"}');
  assert.deepEqual(fs.readdirSync(path.dirname(f)), ['daten.json'], 'keine Zwischendatei bleibt liegen');
  // Schreiben schlägt fehl (nicht serialisierbar) → alte Datei unverändert, keine Zwischendatei
  const kreis = {}; kreis.selbst = kreis;
  assert.throws(() => util.writeJsonAtomic(f, kreis));
  assert.equal(fs.readFileSync(f, 'utf8'), '{"a":2,"text":"ä"}'); assert.deepEqual(fs.readdirSync(path.dirname(f)), ['daten.json']);
  // Umbenennen schlägt fehl (Ziel ist ein Ordner) → Fehler, Zwischendatei wird entfernt
  const dir2 = path.join(d, 'ziel-ist-ordner'); fs.mkdirSync(path.join(dir2, 'x.json'), { recursive: true });
  assert.throws(() => util.writeJsonAtomic(path.join(dir2, 'x.json'), { a: 1 })); assert.deepEqual(fs.readdirSync(dir2), ['x.json']);
  // Lesen
  assert.deepEqual(util.readJson(path.join(d, 'fehlt.json'), { leer: true }), { leer: true });
  fs.writeFileSync(path.join(d, 'kaputt.json'), '{"a": 1, "geheim": "nicht ausgeben"');
  const [wert, warn] = mitWarnungen(() => util.readJson(path.join(d, 'kaputt.json'), []));
  assert.deepEqual(wert, []); assert.equal(warn.length, 1); assert.match(warn[0], /kaputt\.json/); assert.doesNotMatch(warn[0], /geheim|nicht ausgeben/);
});

// ─── html ────────────────────────────────────────────────────────────────────
test('html.parse: text = Hauptinhalt ohne Skip-Link, Kopf, Fuß und Breadcrumb; textFull = ganze Seite; Skripte zählen nie', () => {
  const pg = html.parse(seite({ title: 'Preise', h1: 'Preise', body: `<p><strong>Transparent kalkuliert:</strong> Zulassung 110,00${NBSP}€, Kennzeichen kommen in<!-- --> <!-- -->1–3 Werktagen<!-- -->; KFZ${WJ}-Zulas${SHY}sungsprofis <a href="/auftrag/">beauftragen</a>.</p>` }, B, '/preise/'), B + '/preise/');
  assert.equal(pg.text, 'Preise Transparent kalkuliert: Zulassung 110,00 €, Kennzeichen kommen in 1–3 Werktagen; KFZ-Zulassungsprofis beauftragen.');
  assert.equal(pg.wordCount, pg.text.split(' ').length);
  for (const nicht of ['Zum Hauptinhalt springen', 'Startseite', 'Auftrag starten', 'Impressum', '©']) assert.ok(!pg.text.includes(nicht), `„${nicht}“ gehört nicht zum Hauptinhalt`);
  for (const drin of ['Zum Hauptinhalt springen', 'Auftrag starten', 'Startseite', 'Transparent kalkuliert', 'Impressum', '© 2026 KFZ-Zulassungsprofis']) assert.ok(pg.textFull.includes(drin), `„${drin}“ gehört zur ganzen Seite`);
  for (const nie of ['Geheimtext', '__next_f', 'react.fragment', 'BuildId']) assert.ok(!pg.textFull.includes(nie) && !pg.text.includes(nie), `Skript-/Kommentarinhalt „${nie}“ ist kein Text`);
  assert.equal(pg.textFull, [pg.textKopf, pg.breadcrumbText, pg.text, pg.textFuss].join(' '));
  assert.equal(pg.breadcrumbText, 'Startseite /preise/'); assert.equal(pg.hasBreadcrumbNav, true); assert.equal(pg.hasMain, true);
  assert.deepEqual(pg.h1, ['Preise']); assert.equal(pg.title, 'Preise'); assert.equal(pg.canonical, B + '/preise/'); assert.equal(pg.robots, null); assert.equal(pg.lang, 'de');
  // Links: nur die im Hauptinhalt tragen main: true
  const a = raw => pg.anchors.filter(x => x.raw === raw);
  assert.deepEqual(a('/auftrag/').map(x => x.main).sort(), [false, true], 'Kopfnavigation false, Inhalt true');
  assert.deepEqual(a('/').map(x => x.main), [false, false], 'Logo-Link und Breadcrumb');
  assert.equal(a('#hauptinhalt')[0].main, false); assert.equal(a('/impressum/')[0].main, false);
  assert.equal(a('/auftrag/').find(x => x.main).href, B + '/auftrag/');
  assert.deepStrictEqual(pg, klon(pg), 'Ergebnis ist reines JSON – identisch zu dem, was aus dem Seitencache zurückkommt');
});
test('html.parse: ohne <main> – Navigation, Kopf, Fuß und Skip-Link gehören trotzdem nicht zum Text', () => {
  const pg = html.parse(seite({ title: 'Alt', h1: 'Alte Seite', main: false, body: '<p>Inhalt der Seite.</p>' }, B, '/alt/'), B + '/alt/');
  assert.equal(pg.text, 'Alte Seite Inhalt der Seite.'); assert.equal(pg.hasMain, false); assert.equal(pg.hasBreadcrumbNav, true);
  assert.ok(pg.textFull.includes('Zum Hauptinhalt springen') && pg.textFull.includes('Impressum') && pg.textFull.includes('Startseite'));
  // Bruchstück ohne <head>/<body>, Breadcrumb über class, „>“ in Attributwerten
  const frag = html.parse('<div class="[&>svg]:h-4" title="a > b"><ol class="breadcrumb"><li><a href="/">Start</a></li></ol><h2>Titel</h2><p data-x=\'c > d\'>Text&nbsp;mit &euro; und &#8364; &amp; &shy;Trennung</p><style>.x{color:red}</style><template><p>Vorlage</p></template></div>', B + '/x/');
  assert.equal(frag.text, 'Titel Text mit € und € & Trennung'); assert.equal(frag.breadcrumbText, 'Start'); assert.equal(frag.hasBreadcrumbNav, true);
  assert.deepEqual(frag.h2, ['Titel']);
});
test('html.parse: mehrere robots-Angaben → strengster Wert (auch googlebot und Metas im Body)', () => {
  const r = (...metas) => html.parse(`<html><head><title>x</title>${metas.map(m => `<meta name="robots" content="${m}"/>`).join('')}</head><body><p>x</p></body></html>`, B + '/').robots;
  assert.equal(r(), null);
  assert.equal(r('index, follow'), 'index, follow');
  assert.equal(r('noindex'), 'noindex');
  assert.equal(r('noindex', 'index, follow'), 'noindex, follow', 'wie die 404-Seite der Website');
  assert.equal(r('index, follow', 'noindex'), 'noindex, follow', 'Reihenfolge egal');
  assert.equal(r('index, follow', 'none'), 'noindex, nofollow');
  assert.equal(r('index, follow', 'max-snippet:-1'), 'index, follow, max-snippet:-1');
  const pg = html.parse('<html><head><title>x</title><meta name="robots" content="index, follow"/><meta name="googlebot" content="noindex"/></head><body><p>x</p></body></html>', B + '/');
  assert.equal(pg.robots, 'noindex, follow'); assert.deepEqual(pg.robotsAll, ['index, follow', 'noindex']);
  assert.equal(html.parse('<html><head><title>x</title></head><body><meta name="robots" content="noindex"/><p>x</p></body></html>', B + '/').robots, 'noindex');
  assert.equal(html.strictestRobots(['', null]), null);
});
test('html.contentHash: stabil bei neuem Build (Build-ID, Chunk-/CSS-Hashes, Bild-Prüfsummen), ändert sich bei Inhalt', () => {
  const ld = b => [{ '@type': 'Organization', logo: `${B}/_next/static/media/logo.${b}.png`, image: `${B}/opengraph-image?${b}` }];
  const p = (o, b) => html.parse(seite({ title: 'Preise', body: '<p>Zulassung 110,00 €</p>', build: b, ld: ld(b), ...o }, B, '/preise/'), B + '/preise/');
  const a = p({}, 'buildA'), b = p({}, 'buildB');
  assert.notDeepEqual(a.scripts, b.scripts); assert.notDeepEqual(a.links, b.links);
  assert.equal(html.contentHash(a), html.contentHash(b)); assert.match(html.contentHash(a), /^[0-9a-f]{40}$/);
  for (const [name, o] of [['Text', { body: '<p>Zulassung 128,00 €</p>' }], ['Title', { title: 'Preise 2027' }], ['Description', { desc: 'Neu' }], ['robots', { robots: ['noindex'] }], ['Canonical', { canonical: B + '/anders/' }], ['H1', { h1: 'Andere Überschrift' }], ['JSON-LD', { ld: [{ '@type': 'Service' }] }]]) assert.notEqual(html.contentHash(p(o, 'buildA')), html.contentHash(a), name + ' geändert');
  assert.equal(html.contentHash(null), null);
});
test('html.pack / unpack: verlustfrei, ohne doppelte Riesenfelder', () => {
  const pg = html.parse(seite({ title: 'Seite', body: `<p>${LANG}</p><h2>Zwischen</h2><h3>Unter</h3><a href="/auftrag/?leistung=x#y" rel="nofollow">Auftrag</a><a href="https://wa.me/49123">WA</a>` }, B, '/a/'), B + '/a/');
  const p = html.pack(pg, B + '/a/');
  for (const k of ['textFull', 'h1', 'h2', 'h3']) assert.equal(k in p, false, k + ' wird nicht doppelt abgelegt');
  assert.ok(p.anchors.every(a => Array.isArray(a) && a.length === 4));
  assert.ok(JSON.stringify(p).length < JSON.stringify(pg).length * 0.9);
  assert.deepEqual(klon(html.unpack(klon(p), B + '/a/')), klon(pg));
  assert.equal(html.pack(null), null); assert.equal(html.unpack(null), null);
  // Sonderfall: abweichendes textFull bzw. h1 bleibt erhalten
  const s = { ...pg, textFull: 'ganz anders', h1: ['abweichend'] }; const s2 = html.unpack(klon(html.pack(s, B + '/a/')), B + '/a/');
  assert.equal(s2.textFull, 'ganz anders'); assert.deepEqual(s2.h1, ['abweichend']);
});

// ─── Crawler ─────────────────────────────────────────────────────────────────
test('Crawler: Query-Strings und Fragmente werden vor dem Einreihen entfernt und zählen für Inlinks zur Seite', () => {
  assert.ok(pfade(crawl1).every(p => !/[?#]/.test(p)), 'keine URL mit Query/Fragment im Ergebnis');
  assert.equal(pfade(crawl1).filter(p => p.startsWith('/auftrag/')).length, 1);
  assert.deepEqual(site.hits('/auftrag/').map(r => r.url), ['/auftrag/'], '/auftrag/ wird genau einmal und ohne Query abgerufen');
  assert.deepEqual(site.hits('/rechner/').map(r => r.url), ['/rechner/']);
  assert.equal(crawl1.pages.get(site.base + '/rechner/').inlinks, 2, 'zwei Seiten verlinken /rechner/ (nur mit Query bzw. Fragment)');
  assert.equal(crawl1.pages.get(site.base + '/auftrag/').inlinks, [...crawl1.pages.values()].filter(r => r.page && r.path !== '/auftrag/').length, 'Inlinks = Zahl der verlinkenden Seiten, drei Links der Startseite zählen einmal');
  assert.deepEqual([...crawl1.pages.keys()], [...crawl1.pages.keys()].sort(), 'feste Reihenfolge nach URL');
  assert.equal(crawl1.base, site.base);
});
test('Crawler: Sitemap + Links, robots.txt, Ausschlüsse, Weiterleitung, Tiefe, ungültige Sitemap-Einträge', () => {
  const p = pfade(crawl1);
  for (const x of ['/', '/preise/', '/auftrag/', '/rechner/', '/impressum/', '/servicebedingungen/', '/doppel-robots/', '/xrobots/', '/weiter/', '/ziel/', '/wackel/', '/immer500/', '/kette-1/', '/kette-2/', '/kette-3/', '/kette-4/', '/umzug/', '/extern/', '/kfz-zulassung/berlin/', '/zulassungsstelle/a/']) assert.ok(p.includes(x), x + ' gecrawlt');
  assert.equal(p.length, 20);
  for (const x of ['/gesperrt/', '/api/auftrag.php', '/analytics/', '/_next/static/x.js', '/downloads/anleitung.pdf']) { assert.ok(!p.includes(x), x + ' ist keine Seite'); }
  for (const x of ['/gesperrt/', '/api/auftrag.php', '/analytics/', '/_next/static/x.js']) assert.equal(site.hits(x).length, 0, x + ' wird nie abgerufen');
  assert.equal(site.fremd.requests.length, 0, 'fremde Hosts werden nicht gecrawlt');
  const w = crawl1.pages.get(site.base + '/weiter/');
  assert.equal(w.status, 200); assert.equal(w.redirectedTo, site.base + '/ziel/'); assert.equal(w.chain.length, 1); assert.equal(w.page, undefined); assert.equal(w.indexable, false);
  assert.equal(crawl1.pages.get(site.base + '/ziel/').status, 200, 'Weiterleitungsziel wird als eigene URL geprüft');
  assert.equal(crawl1.pages.get(site.base + '/servicebedingungen/').inlinks, 0, 'nur über extraPaths bekannt');
  const f = crawl1.sitemap.files[0]; assert.equal(f.count, 7); assert.equal(f.ungueltig, 1); assert.equal(f.error, null);
  assert.equal(crawl1.sitemap.entries.size, 7); assert.equal(crawl1.robotsStatus, 200); assert.deepEqual(crawl1.robots.sitemaps, [site.base + '/sitemap.xml']);
  assert.ok(site.requests.every(r => r.headers['user-agent'] === 'KFZ-Zulassungsprofis-SEO-Autopilot/1.0 (+https://kfz-zulassungsprofis.de)'));
  assert.ok(site.requests.every(r => r.method === 'GET' || r.method === 'HEAD'), 'nur lesende Zugriffe');
  assert.equal(crawl1.stats.crawled, 20); assert.equal(crawl1.stats.limitErreicht, false); assert.equal(crawl1.stats.interneFehler, 0); assert.equal(crawl1.stats.parseFehler, 0);
});
test('Crawler: path, typ, noindex (Meta, strengster Wert, Header), indexable, Sitemap-Angaben, contentHash', () => {
  const r = p => crawl1.pages.get(site.base + p);
  assert.deepEqual([r('/').path, r('/').typ, r('/preise/').typ, r('/kfz-zulassung/berlin/').typ, r('/zulassungsstelle/a/').typ, r('/impressum/').typ], ['/', 'start', 'sonst', 'stadt', 'behoerde', 'recht']);
  assert.equal(r('/preise/').noindex, false); assert.equal(r('/preise/').indexable, true); assert.equal(r('/preise/').page.robots, null);
  assert.equal(r('/doppel-robots/').page.robots, 'noindex, follow'); assert.equal(r('/doppel-robots/').noindex, true); assert.equal(r('/doppel-robots/').indexable, false);
  assert.equal(r('/xrobots/').page.robots, null); assert.equal(r('/xrobots/').headers['x-robots-tag'], 'noindex, nofollow'); assert.equal(r('/xrobots/').noindex, true); assert.equal(r('/xrobots/').indexable, false);
  assert.equal(r('/impressum/').noindex, true); assert.equal(r('/immer500/').indexable, false); assert.equal(r('/immer500/').noindex, false);
  assert.equal(r('/preise/').inSitemap, true); assert.equal(r('/preise/').lastmod, '2026-11-03T00:00:00.000Z'); assert.equal(r('/preise/').sitemapFile, site.base + '/sitemap.xml'); assert.equal(r('/rechner/').inSitemap, false);
  assert.equal(r('/preise/').robotsAllowed, true);
  assert.match(r('/preise/').contentHash, /^[0-9a-f]{40}$/); assert.equal(r('/immer500/').contentHash, null); assert.equal(r('/preise/').changed, false);
  assert.ok(r('/preise/').page.text.includes('Zulassung 110,00 € inklusive'), 'geschütztes Leerzeichen normalisiert');
  assert.match(r('/preise/').textShingle, /^[0-9a-f]{32}$/);
  const s = crawl1.stats;
  assert.equal(s.indexable, [...crawl1.pages.values()].filter(x => x.indexable).length); assert.equal(s.indexable, 14); assert.equal(s.noindex, 4);
  assert.deepEqual(s.typen.recht, { gesamt: 2, indexable: 0 }); assert.deepEqual(s.typen.start, { gesamt: 1, indexable: 1 }); assert.deepEqual(s.typen.behoerde, { gesamt: 1, indexable: 1 });
  assert.deepEqual(s.status, { 200: 19, 500: 1 });
});
test('Crawler: ein Wiederholungsversuch bei 5xx, bevor ein Fehler gilt', () => {
  assert.equal(crawl1.pages.get(site.base + '/wackel/').status, 200, 'einmal 503, beim zweiten Versuch 200');
  assert.equal(site.hits('/wackel/').length, 2); assert.ok(crawl1.pages.get(site.base + '/wackel/').page);
  assert.equal(crawl1.pages.get(site.base + '/immer500/').status, 500); assert.equal(site.hits('/immer500/').length, 2, 'genau ein Wiederholungsversuch');
  assert.equal(crawl1.stats.retries, 2);
});
test('Crawler: Wiederholung auch bei Timeout und Netzfehler (Status 0); ohne retries kein zweiter Versuch', async () => {
  const s = await start(); let n = 0;
  s.route('/langsam/', () => (++n === 1 ? { delay: 600, body: 'spät' } : { body: 'schnell' }));
  try {
    const r = await crawler.fetchRetry(s.base + '/langsam/', { timeoutMs: 150, retries: 1, retryDelayMs: 0 });
    assert.equal(r.status, 200); assert.equal(r.body, 'schnell'); assert.equal(r.retries, 1);
    n = 0; const ohne = await crawler.fetchRetry(s.base + '/langsam/', { timeoutMs: 150, retries: 0 });
    assert.equal(ohne.status, 0); assert.equal(ohne.error, 'timeout'); assert.equal(ohne.retries, 0);
    const tot = await crawler.fetchRetry(`http://127.0.0.1:${await toterPort()}/`, { timeoutMs: 1000, retries: 2, retryDelayMs: 0 });
    assert.equal(tot.status, 0); assert.equal(tot.retries, 2); assert.ok(tot.error);
  } finally { await s.close(); }
});
test('Crawler: verlinkte Dateien (PDF) per HEAD geprüft → crawl.dateien mit Status und Quellen', () => {
  assert.ok(crawl1.dateien instanceof Map);
  assert.deepEqual([...crawl1.dateien.keys()], [site.base + '/downloads/anleitung.pdf', site.base + '/downloads/fehlt.pdf']);
  const ok = crawl1.dateien.get(site.base + '/downloads/anleitung.pdf'), fehlt = crawl1.dateien.get(site.base + '/downloads/fehlt.pdf');
  assert.equal(ok.status, 200); assert.deepEqual(ok.quellen, [site.base + '/']); assert.equal(ok.contentType, 'application/pdf');
  assert.equal(fehlt.status, 404); assert.deepEqual(fehlt.quellen, [site.base + '/']);
  assert.deepEqual(site.hits('/downloads/anleitung.pdf').map(r => r.method), ['HEAD']);
});
test('Crawler: Arbeiter enden nicht vorzeitig, solange andere noch Links liefern (parallel auch nach schmalem Start)', async () => {
  const s = await start();
  s.route('/robots.txt', () => ({ body: 'User-agent: *\nAllow: /\n' })); s.route('/sitemap.xml', () => ({ status: 404 }));
  s.page('/', { body: '<a href="/hub/">Hub</a>' });
  s.route('/hub/', () => ({ delay: 120, html: seite({ body: [1, 2, 3, 4, 5, 6].map(i => `<a href="/b${i}/">B${i}</a>`).join('') }, s.base, '/hub/') }));
  for (const i of [1, 2, 3, 4, 5, 6]) s.route(`/b${i}/`, () => ({ delay: 80, html: seite({}, s.base, `/b${i}/`) }));
  try {
    const c = await crawler.crawl({ ...OPT, base: s.base });
    for (const p of ['/', '/hub/', '/b1/', '/b2/', '/b3/', '/b4/', '/b5/', '/b6/']) assert.equal(c.pages.get(s.base + p).status, 200, p);
    assert.equal(c.pages.size, 11, '8 Seiten + 3 Ziele der Kopf-/Fußnavigation (404)'); assert.ok(s.maxParallel >= 2, `Unterseiten parallel abgerufen (gemessen: ${s.maxParallel})`); assert.ok(s.maxParallel <= 3);
    assert.equal(c.sitemap.files[0].error, 'HTTP 404'); assert.equal(c.pages.get(s.base + '/b6/').inlinks, 1);
    const klein = await crawler.crawl({ ...OPT, base: s.base, maxPages: 3 });
    assert.equal(klein.pages.size, 3); assert.equal(klein.stats.limitErreicht, true);
  } finally { await s.close(); }
});
test('Crawler: nicht auswertbare Seite bricht den Lauf nicht ab', async () => {
  const s = await start(); s.route('/robots.txt', () => ({ status: 404 })); s.route('/sitemap.xml', () => ({ type: 'application/xml', body: '<urlset></urlset>' }));
  s.page('/', { body: '<a href="/kaputt/">x</a><a href="/gut/">y</a>' }); s.page('/kaputt/', { title: 'PARSE-FEHLER' }); s.page('/gut/', {});
  const echt = html.parse; html.parse = (h, u) => { if (/PARSE-FEHLER/.test(h)) throw new Error('absichtlich'); return echt(h, u); };
  try {
    const c = await crawler.crawl({ ...OPT, base: s.base });
    assert.equal(c.pages.size, 6); assert.equal(c.stats.parseFehler, 1); assert.equal(c.stats.interneFehler, 0);
    const k = c.pages.get(s.base + '/kaputt/'); assert.equal(k.status, 200); assert.equal(k.parseError, 'absichtlich'); assert.equal(k.page, undefined); assert.equal(k.indexable, false);
    assert.ok(c.pages.get(s.base + '/gut/').page); assert.equal(c.robotsStatus, 404);
  } finally { html.parse = echt; await s.close(); }
});
test('Crawler: Notbremse – bricht ab, wenn mehr als die Hälfte der Abrufe scheitert oder das Zeitlimit erreicht ist', async () => {
  const s = await start(); const viele = Array.from({ length: 150 }, (_, i) => `/s${i}/`);
  s.route('/robots.txt', () => ({ body: 'User-agent: *\nAllow: /\n' }));
  s.route('/sitemap.xml', () => ({ type: 'application/xml', body: `<urlset>${viele.map(p => `<url><loc>${s.base}${p}</loc></url>`).join('')}</urlset>` }));
  s.page('/', {}); for (const p of viele) s.route(p, () => ({ status: 503, body: 'Wartung' }));
  try {
    const c = await crawler.crawl({ ...OPT, base: s.base, retries: 0 });
    assert.match(c.stats.abgebrochen, /^\d+ von \d+ Abrufen fehlgeschlagen$/); assert.ok(c.pages.size >= 40 && c.pages.size <= 45, `nach rund 40 URLs ist Schluss (${c.pages.size})`); assert.equal(c.stats.limitErreicht, false);
    const { plausibility } = require('../bin/autopilot');
    assert.ok(plausibility(c, null, []).reasons.some(r => /Crawl abgebrochen/.test(r)));
    const zeit = await crawler.crawl({ ...OPT, base: s.base, retries: 0, maxDauerMs: 1, delayMs: 5 });
    assert.match(zeit.stats.abgebrochen, /Zeitlimit/); assert.ok(zeit.pages.size <= 6, String(zeit.pages.size));
  } finally { await s.close(); }
});
test('robots.txt: mehrere User-agent-Zeilen je Gruppe, Platzhalter * und $, längste Regel gewinnt', () => {
  const r = crawler.parseRobots('User-agent: a\nUser-agent: *\nDisallow: /intern/\nDisallow: /*.pdf$\nAllow: /intern/frei/\n\nUser-agent: b\nDisallow: /\nSitemap: https://x.de/sitemap.xml');
  assert.deepEqual(r.sitemaps, ['https://x.de/sitemap.xml']); assert.deepEqual(r.agents.a.disallow, ['/intern/', '/*.pdf$']);
  const ok = p => crawler.robotsAllows(r, 'https://x.de' + p);
  assert.equal(ok('/'), true); assert.equal(ok('/intern/x/'), false); assert.equal(ok('/intern/frei/x/'), true); assert.equal(ok('/a/b.pdf'), false); assert.equal(ok('/a/b.pdf.html'), true);
  assert.equal(crawler.robotsAllows(r, 'https://x.de/', 'b'), false); assert.equal(crawler.robotsAllows(r, 'kein url'), true);
  assert.equal(crawler.robotsAllows(crawler.parseRobots(''), 'https://x.de/a/'), true);
});

// Ab hier ändert sich die Test-Website (Reihenfolge der folgenden Tests ist Absicht).
let crawl2;
test('Seitencache: ETag ohne Kompressions-Suffix → 304; bedingte Header nie an Weiterleitungsziele oder fremde Hosts', async () => {
  assert.equal(crawler.etagOhneSuffix('"1a2b-5f3c-gzip"'), '"1a2b-5f3c"'); assert.equal(crawler.etagOhneSuffix('"1a2b-5f3c-br"'), '"1a2b-5f3c"');
  assert.equal(crawler.etagOhneSuffix('W/"abc-gzip"'), 'W/"abc"'); assert.equal(crawler.etagOhneSuffix('"abc"'), '"abc"'); assert.equal(crawler.etagOhneSuffix(undefined), '');
  assert.match(crawl1.pages.get(site.base + '/preise/').headers.etag, /-gzip"$/, 'der Server liefert den ETag mit Suffix');
  site.state.umgezogen = true; // /umzug/ leitet jetzt auf /ziel/ weiter, /extern/ auf einen fremden Host
  site.requests.length = 0; site.fremd.requests.length = 0;
  crawl2 = await crawler.crawl({ ...OPT, base: site.base, extraPaths: ['/servicebedingungen/'], cache: crawler.loadCache(cacheDatei), prev: crawler.serialize(crawl1) });
  const direkt = p => site.hits(p).filter(r => r.headers['if-none-match']);
  assert.equal(direkt('/preise/').length, 1); assert.doesNotMatch(direkt('/preise/')[0].headers['if-none-match'], /-gzip/);
  assert.equal(direkt('/preise/')[0].headers['if-modified-since'], 'Tue, 03 Nov 2026 08:00:00 GMT');
  const p2 = crawl2.pages.get(site.base + '/preise/');
  assert.equal(p2.status, 200); assert.equal(p2.fromCache, true); assert.equal(p2.headers['content-type'], 'text/html; charset=UTF-8', 'Header der gecachten Antwort bleiben erhalten');
  assert.deepEqual(klon(p2.page), klon(crawl1.pages.get(site.base + '/preise/').page)); assert.equal(p2.contentHash, crawl1.pages.get(site.base + '/preise/').contentHash); assert.equal(p2.changed, false);
  assert.equal(crawl2.stats.reused, 16, 'alle unveränderten HTML-Seiten kommen per 304 aus dem Cache');
  // Früher Seite, jetzt Weiterleitung: Das Ziel bekommt KEINE bedingten Header, die Quelle keine Seite aus dem Cache
  const u = crawl2.pages.get(site.base + '/umzug/');
  assert.equal(u.redirectedTo, site.base + '/ziel/'); assert.equal(u.page, undefined); assert.ok(!u.fromCache); assert.equal(u.indexable, false);
  const ziel = site.hits('/ziel/'); assert.equal(ziel.length, 3, 'zweimal als Weiterleitungsziel, einmal direkt');
  assert.equal(ziel.filter(r => r.headers['if-none-match'] || r.headers['if-modified-since']).length, 1, 'nur der direkte Abruf ist bedingt');
  // Weiterleitung auf fremden Host: keine bedingten Header dorthin
  const e = crawl2.pages.get(site.base + '/extern/'); assert.equal(e.redirectedTo, site.fremd.base + '/fremd/'); assert.equal(e.page, undefined);
  assert.equal(site.fremd.requests.length, 1); assert.equal(site.fremd.requests[0].headers['if-none-match'], undefined); assert.equal(site.fremd.requests[0].headers['if-modified-since'], undefined);
  assert.ok(!pfade(crawl2).includes('/fremd/'));
  assert.equal(crawl2.stats.indexable, crawl1.stats.indexable - 2);
});
test('Änderungserkennung: neuer Build ändert contentHash nicht (changed = false), echter Inhalt schon – Vergleich gegen den Vorlauf', async () => {
  const prev = crawler.serialize(crawl2); const d = tmp('cache2'); const f = path.join(d, 'page-cache.json'); crawler.saveCache(f, crawl2);
  site.state.build = 'b2'; site.requests.length = 0;
  const c3 = await crawler.crawl({ ...OPT, base: site.base, extraPaths: ['/servicebedingungen/'], cache: crawler.loadCache(f), prev });
  const a = crawl2.pages.get(site.base + '/preise/'), b = c3.pages.get(site.base + '/preise/');
  assert.notEqual(b.bodyHash, a.bodyHash, 'das HTML ist ein anderes'); assert.ok(!b.fromCache); assert.notDeepEqual(b.page.scripts, a.page.scripts);
  assert.equal(b.contentHash, a.contentHash); assert.equal(b.changed, false);
  assert.deepEqual([...c3.pages.values()].filter(r => r.changed).map(r => r.path), [], 'kein Deploy-Rauschen');
  assert.deepEqual([...c3.pages.values()].filter(r => r.fromCache).map(r => r.path), ['/wackel/', '/xrobots/'], 'nur die zwei Seiten ohne Build-Anteil sind unverändert (304)');
  site.state.preis = '128,00';
  const c4 = await crawler.crawl({ ...OPT, base: site.base, extraPaths: ['/servicebedingungen/'], cache: crawler.loadCache(f), prev });
  assert.deepEqual([...c4.pages.values()].filter(r => r.changed).map(r => r.path), ['/preise/']);
  assert.notEqual(c4.pages.get(site.base + '/preise/').contentHash, a.contentHash);
  const ohne = await crawler.crawl({ ...OPT, base: site.base, prev: null }); assert.equal([...ohne.pages.values()].filter(r => r.changed).length, 0, 'ohne Vorlauf gilt nichts als geändert');
  site.state.preis = '110,00'; site.state.build = 'b1';
});
test('Offline-Modus: Ergebnis vollständig aus page-cache.json, ohne einen einzigen Abruf, identisch zum echten Lauf', async () => {
  site.requests.length = 0; site.fremd.requests.length = 0;
  const off = await crawler.crawl({ ...OPT, base: site.base, cache: crawler.loadCache(cacheDatei), offline: true, prev: null });
  assert.equal(site.requests.length + site.fremd.requests.length, 0, 'kein Netz');
  assert.equal(off.offline, true); assert.equal(off.at, crawl1.at); assert.deepEqual([...off.pages.keys()], [...crawl1.pages.keys()]);
  for (const [u, r] of crawl1.pages) { const o = klon(off.pages.get(u)); const e = klon(r); delete o.fromCache; delete e.fromCache; assert.deepEqual(o, e, u); }
  assert.ok([...off.pages.values()].every(r => r.fromCache === true));
  assert.deepEqual([...off.sitemap.entries], [...crawl1.sitemap.entries]); assert.deepEqual(off.sitemap.files, klon(crawl1.sitemap.files));
  assert.deepEqual(off.robots, klon(crawl1.robots)); assert.equal(off.robotsStatus, 200); assert.deepEqual([...off.dateien], klon([...crawl1.dateien]));
  for (const k of ['crawled', 'indexable', 'noindex', 'typen', 'status']) assert.deepEqual(off.stats[k], crawl1.stats[k], k);
  assert.equal(off.stats.fetched, 0); assert.equal(off.stats.offline, true);
  // Umgebungsvariable SEO_OFFLINE=1 wirkt, wenn die Option nicht gesetzt ist
  const alt = process.env.SEO_OFFLINE; process.env.SEO_OFFLINE = '1';
  try { const env = await crawler.crawl({ maxPages: 200, base: site.base, cache: crawler.loadCache(cacheDatei) }); assert.equal(env.offline, true); assert.equal(site.requests.length, 0); }
  finally { if (alt === undefined) delete process.env.SEO_OFFLINE; else process.env.SEO_OFFLINE = alt; }
  // Ohne Cache bzw. mit Cache einer anderen Website: klare Fehlermeldung
  await assert.rejects(crawler.crawl({ base: site.base, offline: true }), /kein Seitencache vorhanden/);
  await assert.rejects(crawler.crawl({ base: 'http://127.0.0.1:1', offline: true, cache: crawler.loadCache(cacheDatei) }), /gehört zu/);
  // Alter/kaputter Cache wird wie ein leerer behandelt
  const d = tmp('altcache'); fs.writeFileSync(path.join(d, 'alt.json'), JSON.stringify({ 'https://x.de/': { etag: 'a', page: {} } }));
  assert.equal(crawler.loadCache(path.join(d, 'alt.json')).pages.size, 0); assert.equal(crawler.loadCache(path.join(d, 'fehlt.json')).pages.size, 0);
});
test('Seitencache: atomar geschrieben, keine doppelten Riesenfelder, Roh-HTML-Ablage erlaubt Neu-Auswertung offline', async () => {
  assert.deepEqual(fs.readdirSync(path.dirname(cacheDatei)), ['page-cache.json']);
  const j = JSON.parse(fs.readFileSync(cacheDatei, 'utf8'));
  assert.equal(j.v, 2); assert.equal(j.base, site.base); assert.equal(Object.keys(j.pages).length, 20); assert.equal(j.crawl.hostChecks.length, 1);
  const e = j.pages[site.base + '/preise/']; assert.equal(e.r.status, 200); assert.match(e.bodyHash, /^[0-9a-f]{40}$/);
  assert.equal('textFull' in e.page, false); assert.equal('h1' in e.page, false); assert.ok(Array.isArray(e.page.anchors[0]));
  assert.equal(j.pages[site.base + '/immer500/'].page, null);
  // Roh-HTML-Ablage (nur Entwicklung): Seiten lassen sich offline mit geändertem Parser neu auswerten
  const d = tmp('html'); const f = path.join(d, 'c.json');
  const c = await crawler.crawl({ ...OPT, base: site.base, htmlDir: path.join(d, 'roh') }); crawler.saveCache(f, c);
  assert.equal(fs.readdirSync(path.join(d, 'roh')).length, [...c.pages.values()].filter(r => r.page).length);
  const echt = html.parse; html.parse = (h, u) => ({ ...echt(h, u), title: 'NEU GEPARST' });
  try {
    const neu = await crawler.crawl({ base: site.base, offline: true, cache: crawler.loadCache(f), htmlDir: path.join(d, 'roh') });
    assert.equal(neu.pages.get(site.base + '/preise/').page.title, 'NEU GEPARST'); assert.equal(neu.stats.neuGeparst, fs.readdirSync(path.join(d, 'roh')).length);
    const alt = await crawler.crawl({ base: site.base, offline: true, cache: crawler.loadCache(f) });
    assert.equal(alt.pages.get(site.base + '/preise/').page.title, 'Preise');
  } finally { html.parse = echt; }
});
test('Weiterleitungsprüfung (hostChecks): Sprünge zählen, Ziel, Status, dauerhaft, Schleife, nicht erreichbar', async () => {
  const b = site.base; const tot = `http://127.0.0.1:${await toterPort()}/`;
  const h = await crawler.checkRedirects([
    { von: b + '/h1/', erwartet: b + '/hziel/', maxSpruenge: 1, art: 'host' },
    { von: b + '/h2a/', erwartet: b + '/hziel/', maxSpruenge: 1 },
    { von: b + '/h2a/', erwartet: b + '/hziel/', maxSpruenge: 2 },
    { von: b + '/h302/', erwartet: b + '/hziel/', maxSpruenge: 1 },
    { von: b + '/h302/', erwartet: b + '/hziel/', maxSpruenge: 1, nurPermanent: false },
    { von: b + '/hfalsch/', erwartet: b + '/hziel/', maxSpruenge: 1 },
    { von: b + '/h404/', erwartet: b + '/gibtsnicht/', maxSpruenge: 1 },
    { von: b + '/hloop/', erwartet: b + '/hziel/', maxSpruenge: 2 },
    { von: tot, erwartet: b + '/hziel/', maxSpruenge: 1 },
    { von: b + '/hziel/', erwartet: b + '/hziel/' },
  ], { retries: 0, timeoutMs: 2000 });
  assert.deepEqual(h.map(x => x.ok), [true, false, true, false, true, false, false, false, false, true]);
  assert.deepEqual(Object.keys(h[0]), ['von', 'erwartet', 'final', 'status', 'spruenge', 'maxSpruenge', 'ok', 'grund', 'kette', 'art']);
  assert.deepEqual([h[0].spruenge, h[0].status, h[0].final, h[0].grund, h[0].art], [1, 200, b + '/hziel/', '', 'host']);
  assert.equal(h[1].spruenge, 2); assert.equal(h[1].maxSpruenge, 1); assert.match(h[1].grund, /2 Sprünge statt höchstens 1/); assert.equal(h[1].final, b + '/hziel/');
  assert.equal(h[2].spruenge, 2); assert.deepEqual(h[2].kette, [{ status: 301, to: b + '/h2b/' }, { status: 301, to: b + '/hziel/' }]);
  assert.match(h[3].grund, /vorübergehende Weiterleitung \(302\)/);
  assert.match(h[5].grund, /endet auf .*\/preise\/ statt .*\/hziel\//);
  assert.equal(h[6].status, 404); assert.match(h[6].grund, /HTTP 404/);
  assert.match(h[7].grund, /Weiterleitungsschleife/); assert.equal(h[7].status, 0);
  assert.equal(h[8].status, 0); assert.match(h[8].grund, /nicht erreichbar/);
  assert.deepEqual([h[9].spruenge, h[9].maxSpruenge, h[9].ok], [0, 1, true]);
  assert.equal(crawler.checkHostRedirects, crawler.checkRedirects);
  assert.deepEqual(await crawler.checkRedirects(undefined), []);
});
test('crawler.run: Cache laden, crawlen, Weiterleitungen prüfen, Cache schreiben – und alles offline wiederholbar', async () => {
  const d = tmp('run'); const cfg = { base: site.base, dataDir: d, extraPaths: ['/servicebedingungen/'], crawl: { ...OPT, offline: undefined }, redirectChecks: [{ von: site.base + '/h1/', erwartet: site.base + '/hziel/', maxSpruenge: 1 }, { von: site.base + '/h2a/', erwartet: site.base + '/hziel/', maxSpruenge: 1 }] };
  const a = await crawler.run(cfg, { offline: false });
  assert.equal(a.crawl.pages.size, 20); assert.deepEqual(a.hostChecks.map(h => h.ok), [true, false]); assert.equal(a.crawl.hostChecks, a.hostChecks);
  assert.deepEqual(fs.readdirSync(d), ['page-cache.json']);
  site.requests.length = 0;
  const b = await crawler.run(cfg, { offline: true, prev: crawler.serialize(a.crawl, a.hostChecks) });
  assert.equal(site.requests.length, 0); assert.deepEqual(b.hostChecks, klon(a.hostChecks)); assert.equal(b.crawl.pages.size, 20); assert.equal([...b.crawl.pages.values()].filter(r => r.changed).length, 0);
  // last-crawl.json-Form: zusätzliche Felder je Seite, Weiterleitungen und Dateien
  const ser = crawler.serialize(a.crawl, a.hostChecks); const p = ser.pages[site.base + '/doppel-robots/'];
  assert.deepEqual([p.path, p.typ, p.noindex, p.indexable, typeof p.contentHash, p.status, p.inSitemap], ['/doppel-robots/', 'sonst', true, false, 'string', 200, false]);
  assert.equal(ser.pages[site.base + '/preise/'].page.title, 'Preise'); assert.deepEqual(ser.pages[site.base + '/preise/'].page.jsonldTypes, ['Service']);
  assert.equal(ser.hostChecks.length, 2); assert.equal(ser.dateien[site.base + '/downloads/fehlt.pdf'].status, 404); assert.equal(ser.base, site.base); assert.equal(ser.stats.indexable, a.crawl.stats.indexable);
  assert.ok(ser.pages[site.base + '/'].headers['strict-transport-security'], 'Startseite behält alle Header'); assert.equal(ser.pages[site.base + '/preise/'].headers['strict-transport-security'], undefined);
  assert.equal(ser.pages[site.base + '/weiter/'].redirectedTo, site.base + '/ziel/'); assert.equal(ser.pages[site.base + '/weiter/'].page, null);
  assert.equal(util.isNoindex(ser.pages[site.base + '/xrobots/']), true, 'noindex per Header bleibt aus last-crawl.json erkennbar');
});

// ─── Befundspeicher ──────────────────────────────────────────────────────────
test('IssueStore: Lebenszyklus neu → aktualisiert → behoben → wieder aufgetreten; Teil-Lauf und unsicherer Lauf schließen nichts', () => {
  const d = tmp('store'); const s = new IssueStore(d); const scope = ['title-lang', 'preis-alt', 'robots'];
  const a = F('title-lang', '/preise/'), b = { rule: 'preis-alt', severity: 'kritisch', approval: 'preis', url: B + '/preise/', key: 'preis', title: 'Alter Preis 128,00 €', detail: 'Soll 110,00 €', current: '128,00 €', proposed: '110,00 €' };
  const r1 = s.apply([a, b], { runId: 'r1', scope, kind: 'daily' });
  assert.equal(r1.new.length, 2); assert.equal(r1.open, 2); assert.deepEqual(r1.bySeverity, { niedrig: 1, kritisch: 1 });
  const id = fingerprint(b); assert.match(id, /^[0-9a-f]{12}$/); assert.equal(s.get(id).status, 'offen'); assert.equal(s.get(id).runs, 1); assert.equal(s.get(id).notified, null);
  s.markNotified([id], 'sofort'); assert.equal(s.get(id).notified.channel, 'sofort');
  // Update: gleicher Schlüssel, andere Messwerte → gleiche ID, Felder aktuell, wegfallende Felder verschwinden
  const b2 = { ...b, title: 'Alter Preis 129,00 €', detail: 'Soll 110,00 €, gefunden 129,00 €', current: '129,00 €', severity: 'hoch' }; delete b2.proposed;
  const r2 = s.apply([a, b2, b2], { runId: 'r2', scope, kind: 'daily' });
  assert.equal(r2.new.length, 0); assert.equal(r2.resolved.length, 0); assert.equal(fingerprint(b2), id);
  const x = s.get(id); assert.deepEqual([x.title, x.detail, x.current, x.severity, x.runs, x.status], ['Alter Preis 129,00 €', 'Soll 110,00 €, gefunden 129,00 €', '129,00 €', 'hoch', 2, 'offen']);
  assert.equal('proposed' in x, false); assert.equal(x.notified.channel, 'sofort', 'Meldestatus bleibt beim Update'); assert.equal(x.first_seen <= x.last_seen, true);
  assert.equal(s.state.runs[1].findings, 2, 'derselbe Befund doppelt im Lauf zählt einmal');
  // Teil-Lauf (Regel nicht im Umfang) und unsicherer Lauf schließen nichts
  assert.equal(s.apply([a], { runId: 'r3', scope: ['title-lang'], kind: 'daily' }).resolved.length, 0);
  assert.equal(s.apply([], { runId: 'r4', scope, kind: 'daily', suspicious: true, note: 'nur 3 URLs gecrawlt' }).resolved.length, 0);
  assert.equal(s.state.runs[3].suspicious, true); assert.equal(s.state.runs[3].note, 'nur 3 URLs gecrawlt'); assert.equal(s.open().length, 2);
  // Behoben, dann wieder aufgetreten: zählt, und die Meldung darf erneut hinaus
  const r5 = s.apply([a], { runId: 'r5', scope, kind: 'daily' });
  assert.deepEqual(r5.resolved, [id]); assert.equal(s.get(id).status, 'behoben'); assert.ok(s.get(id).resolved_at);
  const r6 = s.apply([a, b2], { runId: 'r6', scope, kind: 'daily' });
  assert.deepEqual(r6.reopened, [id]); const y = s.get(id);
  assert.deepEqual([y.status, y.reopen_count, y.notified, 'resolved_at' in y, y.runs], ['offen', 1, null, false, 3]); assert.ok(y.reopened_at); assert.equal(y.first_seen, x.first_seen);
  s.apply([a], { runId: 'r7', scope, kind: 'daily' }); const r8 = s.apply([a, b2], { runId: 'r8', scope, kind: 'daily' });
  assert.equal(r8.reopened.length, 1); assert.equal(s.get(id).reopen_count, 2);
  assert.equal(s.open()[0].severity, 'hoch', 'offene Punkte nach Schweregrad sortiert');
  assert.equal(s.ergaenzeLauf('r8', { score: 77 }).score, 77); assert.equal(s.ergaenzeLauf('gibtsnicht', { score: 1 }), null);
  // gespeichert: gültiges JSON, keine Zwischendateien, neu geladen identisch
  assert.deepEqual(fs.readdirSync(d), ['issues.json']);
  const neu = new IssueStore(d); assert.deepEqual(klon(neu.state), klon(s.state)); assert.equal(neu.state.runs.length, 8); assert.equal(neu.state.runs[7].score, 77);
});
test('IssueStore: count/examples/key/title/detail gebündelter Befunde werden bei jedem Lauf aktualisiert', () => {
  const s = new IssueStore(tmp('count')); const treffer = n => Array.from({ length: n }, (_, i) => F('title-lang', `/kennzeichen/k${String(i).padStart(2, '0')}/`));
  s.apply(aggregate(treffer(4), B), { runId: 'r1', scope: ['title-lang'], kind: 'weekly' });
  const [id] = Object.keys(s.state.issues); assert.equal(s.all().length, 1);
  assert.deepEqual([s.get(id).count, s.get(id).examples.length, s.get(id).key], [4, 4, 'familie:/kennzeichen/*/']); assert.match(s.get(id).title, /^4 Seiten/);
  const r2 = s.apply(aggregate(treffer(27), B), { runId: 'r2', scope: ['title-lang'], kind: 'weekly' });
  assert.deepEqual([r2.new.length, r2.resolved.length, s.all().length], [0, 0, 1], '4 → 27 Treffer: derselbe Punkt, kein „behoben/neu“');
  assert.deepEqual([s.get(id).count, s.get(id).examples.length, s.get(id).runs], [27, 20, 2]); assert.match(s.get(id).title, /^27 Seiten/); assert.match(s.get(id).detail, /k00.*…/);
  s.apply(aggregate(treffer(5), B), { runId: 'r3', scope: ['title-lang'], kind: 'weekly' });
  assert.equal(s.get(id).count, 5); assert.equal(s.get(id).examples.length, 5);
});
test('IssueStore: beschädigte issues.json → klarer Abbruch, Datei bleibt unangetastet (kein stiller Neubeginn)', () => {
  const d = tmp('kaputt'); const f = path.join(d, 'issues.json');
  for (const inhalt of ['{"issues": {"abc": {"rule": "x"', '', '[]', '{"issues": [], "runs": []}', '{"issues": {}}', 'null']) {
    fs.writeFileSync(f, inhalt);
    assert.throws(() => new IssueStore(d), e => e.code === 'ISSUES_BESCHAEDIGT' && /issues\.json ist beschädigt/.test(e.message) && /Historie nicht verloren/.test(e.message), JSON.stringify(inhalt));
    assert.equal(fs.readFileSync(f, 'utf8'), inhalt, 'Datei unverändert');
  }
  fs.unlinkSync(f); const s = new IssueStore(d); assert.deepEqual(s.state.issues, {}); assert.equal(fs.existsSync(f), false, 'ohne Lauf wird nichts angelegt');
});
test('IssueStore: behobene Befunde älter als 180 Tage werden entfernt, jüngere und offene bleiben', () => {
  const d = tmp('prune'); const s = new IssueStore(d); const tage = n => new Date(Date.now() - n * 86400e3).toISOString();
  s.state.issues = { alt: { id: 'alt', rule: 'x', severity: 'niedrig', status: 'behoben', resolved_at: tage(181) }, jung: { id: 'jung', rule: 'x', severity: 'niedrig', status: 'behoben', resolved_at: tage(179) }, offen: { id: 'offen', rule: 'y', severity: 'hoch', status: 'offen', first_seen: tage(400), last_seen: tage(1) } };
  const r = s.apply([], { runId: 'r1', scope: [], kind: 'daily', suspicious: true });
  assert.equal(r.removed, 1); assert.deepEqual(Object.keys(s.state.issues).sort(), ['jung', 'offen']); assert.deepEqual(Object.keys(new IssueStore(d).state.issues).sort(), ['jung', 'offen']);
});
test('IssueStore: lastDigest je Meldungsart { tag, woche, monat } – auch aus dem früheren Einzelwert', () => {
  const d = tmp('digest'); const s = new IssueStore(d);
  assert.deepEqual(s.state.lastDigest, { tag: null, woche: null, monat: null }); assert.equal(s.digestSeit('woche'), null);
  s.setzeDigest('woche', '2026-11-16T05:00:00.000Z'); s.setzeDigest('tag');
  const neu = new IssueStore(d); assert.equal(neu.digestSeit('woche'), '2026-11-16T05:00:00.000Z'); assert.match(neu.digestSeit('tag'), /^20\d\d-/); assert.equal(neu.digestSeit('monat'), null);
  assert.throws(() => s.setzeDigest('jahr'), /Unbekannte Meldungsart/);
  fs.writeFileSync(path.join(d, 'issues.json'), JSON.stringify({ issues: {}, runs: [], lastDigest: '2026-10-01T00:00:00.000Z' }));
  assert.deepEqual(new IssueStore(d).state.lastDigest, { tag: '2026-10-01T00:00:00.000Z', woche: '2026-10-01T00:00:00.000Z', monat: '2026-10-01T00:00:00.000Z' });
});

// ─── Bündelung ───────────────────────────────────────────────────────────────
test('Bündelung: ab 1 Seite einer Familie ein Punkt; kein Pendeln zwischen 4 und 5 Treffern; stabile ID', () => {
  const treffer = n => Array.from({ length: n }, (_, i) => F('title-lang', `/zulassungsstelle/s${String(i).padStart(2, '0')}/`, { current: 'alt ' + i, proposed: 'neu ' + i }));
  const ids = [1, 2, 4, 5, 40].map(n => { const out = aggregate(treffer(n), B); assert.equal(out.length, 1, n + ' Treffer → 1 Punkt'); assert.equal(out[0].count, n); return fingerprint(out[0]); });
  assert.equal(new Set(ids).size, 1, 'gleiche ID unabhängig von der Trefferzahl');
  const b = aggregate(treffer(40), B)[0];
  assert.deepEqual([b.rule, b.url, b.key, b.examples.length], ['title-lang', B + '/zulassungsstelle/*/', 'familie:/zulassungsstelle/*/', 20]);
  assert.equal(b.title, '40 Seiten im Bereich /zulassungsstelle/*/: Title zu lang'); assert.match(b.detail, /^Beispiele: \/zulassungsstelle\/s00\/, .* …$/);
  assert.deepEqual(b.examples[0], { url: B + '/zulassungsstelle/s00/', title: 'Title zu lang (72 Zeichen): /zulassungsstelle/s00/', current: 'alt 0', proposed: 'neu 0', detail: 'Detail /zulassungsstelle/s00/' });
  assert.equal(b.proposed, '(Beispiel /zulassungsstelle/s00/) neu 0');
  // Reihenfolge der Eingabe (= Crawl-Reihenfolge) ändert nichts
  assert.deepEqual(aggregate(treffer(40).reverse(), B), aggregate(treffer(40), B));
  // count = Zahl der Seiten, nicht der Einzelbefunde
  const mehrfach = aggregate([F('faq-duenn', '/ratgeber/a/', { key: 'Frage 1' }), F('faq-duenn', '/ratgeber/a/', { key: 'Frage 2' }), F('faq-duenn', '/ratgeber/b/', { key: 'Frage 3' })], B);
  assert.equal(mehrfach.length, 1); assert.equal(mehrfach[0].count, 2); assert.match(mehrfach[0].detail, /3 Einzelbefunde/);
});
test('Bündelung: ein Treffer einer Familie trägt schon die Bündel-ID – Wechsel 2 ↔ 1 Seiten ist weder „behoben“ noch „neu“', () => {
  const s = (p, extra) => F('serverfehler', p, { severity: 'kritisch', approval: 'auto', key: 'fehler', title: `Serverfehler 503: ${p}`, detail: 'HTTP 503 – auch beim zweiten Versuch.', proposed: 'neu ' + p, ...extra });
  const eins = aggregate([s('/zulassungsstelle/aachen/')], B), zwei = aggregate([s('/zulassungsstelle/berlin/'), s('/zulassungsstelle/aachen/')], B);
  assert.equal(eins.length, 1); assert.equal(fingerprint(eins[0]), fingerprint(zwei[0]), 'gleiche ID bei 1 und 2 Treffern');
  assert.deepEqual([eins[0].url, eins[0].key, eins[0].count, eins[0].severity], [B + '/zulassungsstelle/*/', 'familie:/zulassungsstelle/*/', 1, 'kritisch']);
  assert.equal(eins[0].title, '1 Seite im Bereich /zulassungsstelle/*/: Serverfehler 503 (/zulassungsstelle/aachen/)', 'Titel nennt die Seite');
  assert.equal(eins[0].detail, 'HTTP 503 – auch beim zweiten Versuch.', 'bei einer Seite deren eigener Befundtext');
  assert.equal(eins[0].proposed, 'neu /zulassungsstelle/aachen/', 'Vorschlag ohne „(Beispiel …)“');
  assert.deepEqual(eins[0].examples.map(e => e.url), [B + '/zulassungsstelle/aachen/'], 'die Seite steht in examples (SEO Center verlinkt sie dort)');
  assert.match(zwei[0].title, /^2 Seiten im Bereich/);
  // nicht gebündelt bleiben Übersichtsseiten, Seiten außerhalb der Familien und Befunde mit buendeln: false
  for (const f of [s('/zulassungsstelle/'), s('/preise/'), s('/kennzeichen/b/', { buendeln: false })]) assert.deepEqual(aggregate([f], B), [f]);
  // Befundspeicher: 2 → 1 → 2 Seiten derselbe Punkt, der Bearbeitungsstand (an der ID) bleibt erhalten
  const st = new IssueStore(tmp('buendel-1-2')); const scope = ['serverfehler'];
  const r1 = st.apply(zwei, { runId: 'r1', scope, kind: 'daily' }); const id = r1.new[0]; st.markNotified([id], 'sofort');
  const r2 = st.apply(eins, { runId: 'r2', scope, kind: 'daily' });
  assert.deepEqual([r2.new.length, r2.resolved.length, st.get(id).count, st.get(id).notified.channel], [0, 0, 1, 'sofort'], '2 → 1: kein „behoben“ + „neu“, keine zweite Sofortmeldung');
  const r3 = st.apply(zwei, { runId: 'r3', scope, kind: 'daily' }); assert.deepEqual([r3.new.length, r3.resolved.length, r3.reopened.length, st.all().length], [0, 0, 0, 1]);
});
test('Bündelung: Kernseiten (importantPaths, exakter Pfad) bleiben einzeln – eine zweite ausgefallene Kernseite bekommt ihre eigene Sofortmeldung', () => {
  const cfg = { importantPaths: ['/', '/leistungen/', '/leistungen/neuzulassung/', '/leistungen/ummeldung/'] }; const opt = buendelOptionen(cfg);
  assert.deepEqual(opt, { kernseiten: cfg.importantPaths }); assert.deepEqual(buendelOptionen(undefined), { kernseiten: [] }); assert.deepEqual(buendelOptionen({}), { kernseiten: [] });
  assert.ok(buendelOptionen(require('../config')).kernseiten.includes('/kfz-zulassung/berlin/'), 'echte Konfiguration: Kernseiten der Familien sind dabei');
  const weg = p => F('erreichbarkeit-verlust', p, { severity: 'kritisch', approval: 'auto', key: 'verlust', title: `Seite nicht mehr erreichbar (404): ${p}` });
  const out = aggregate([weg('/leistungen/neuzulassung/'), weg('/leistungen/b/'), weg('/leistungen/ummeldung/'), weg('/leistungen/a/'), weg('/leistungen/neuzulassung/x/')], B, opt);
  assert.deepEqual(out.map(f => [util.pathOf(f.url), f.count || 1]), [['/leistungen/neuzulassung/', 1], ['/leistungen/*/', 3], ['/leistungen/ummeldung/', 1]], 'Kernseiten einzeln, übrige Seiten der Familie weiter gebündelt; nur der exakte Pfad zählt');
  assert.deepEqual(out[1].examples.map(e => util.pathOf(e.url)), ['/leistungen/a/', '/leistungen/b/', '/leistungen/neuzulassung/x/']);
  // Ablauf: Kernseite A fällt aus (Sofortmeldung), am Folgetag zusätzlich Kernseite B derselben Familie → B ist ein NEUER Punkt
  const ablauf = o => { const st = new IssueStore(tmp('kern-' + (o ? 'mit' : 'ohne'))); const scope = ['erreichbarkeit-verlust'];
    const r1 = st.apply(aggregate([weg('/leistungen/neuzulassung/')], B, o), { runId: 'r1', scope, kind: 'daily' }); st.markNotified(r1.new, 'sofort');
    return st.apply(aggregate([weg('/leistungen/neuzulassung/'), weg('/leistungen/ummeldung/')], B, o), { runId: 'r2', scope, kind: 'daily' }); };
  const mit = ablauf(opt); assert.equal(mit.new.length, 1, 'zweite Kernseite → eigener neuer Punkt (Sofortmeldung möglich)'); assert.equal(mit.resolved.length, 0);
  assert.equal(ablauf(undefined).new.length, 0, 'ohne Option ginge sie im schon gemeldeten Bündel unter');
  // Autopilot und lokaler Check übergeben dieselbe Option (sonst wichen die Fingerprints voneinander ab)
  for (const f of ['bin/autopilot.js', 'bin/local-check.js']) assert.match(fs.readFileSync(path.join(AP, f), 'utf8'), /aggregate\(lauf\.findings, (cfg\.)?base, buendelOptionen\(cfg\)\)/, f);
});
test('Bündelung: alle großen Familien und alle Regeln (auch schema-*), strengster Schweregrad/Freigabe; Ausnahmen bleiben einzeln', () => {
  assert.deepEqual(FAMILIEN, ['/zulassungsstelle/*/', '/kennzeichen/*/', '/kfz-zulassung/*/', '/ratgeber/*/', '/leistungen/*/']);
  for (const fam of FAMILIEN) for (const rule of ['schema-url', 'schema-firmendaten', 'schema-pflichtfeld', 'index-verlust', 'behoerdenhinweis-fehlt', 'preis-alt', 'thin-content', 'serverfehler']) {
    const out = aggregate([F(rule, fam.replace('*', 'a')), F(rule, fam.replace('*', 'b'))], B); assert.equal(out.length, 1, rule + ' ' + fam); assert.equal(out[0].url, B + fam);
  }
  const gemischt = aggregate([F('preis-alt', '/kennzeichen/a/', { severity: 'mittel', approval: 'auto' }), F('preis-alt', '/kennzeichen/b/', { severity: 'kritisch', approval: 'preis' }), F('preis-alt', '/kennzeichen/c/', { severity: 'hoch', approval: 'manuell' })], B)[0];
  assert.equal(gemischt.severity, 'kritisch'); assert.equal(gemischt.approval, 'preis');
  // Regeln und Familien werden getrennt gebündelt, Reihenfolge der übrigen Befunde bleibt
  const mix = aggregate([F('title-lang', '/preise/'), F('title-lang', '/kennzeichen/a/'), F('og-image', '/kennzeichen/a/'), F('title-lang', '/kennzeichen/b/'), F('title-lang', '/ratgeber/x/'), F('og-image', '/kennzeichen/b/'), F('title-lang', '/ratgeber/y/')], B);
  assert.deepEqual(mix.map(f => [f.rule, util.pathOf(f.url), f.count || 1]), [['title-lang', '/preise/', 1], ['title-lang', '/kennzeichen/*/', 2], ['og-image', '/kennzeichen/*/', 2], ['title-lang', '/ratgeber/*/', 2]]);
  // Nicht gebündelt:
  const einzeln = [
    [F('title-lang', '/gewerbe/a/'), F('title-lang', '/gewerbe/b/')],                                  // keine große Familie
    [F('title-lang', '/kennzeichen/'), F('title-lang', '/zulassungsstelle/')],                         // Übersichtsseiten
    [...NICHT_BUENDELN].slice(0, 3).flatMap(r => [F(r, '/kennzeichen/a/'), F(r, '/kennzeichen/b/')]),  // Website-weite Regeln
    [F('title-lang', '/kennzeichen/a/', { url: 'http://deutschezulassung.de/kennzeichen/a/' }), F('title-lang', '/kennzeichen/b/', { url: 'http://deutschezulassung.de/kennzeichen/b/' })], // fremder Host
    [{ rule: 'sitemap-lastmod', severity: 'niedrig', file: 'app/sitemap.ts', title: 'x' }, { rule: 'sitemap-lastmod', severity: 'niedrig', file: 'app/sitemap.ts', title: 'y' }], // ohne URL
    [F('title-lang', '/kennzeichen/a/', { buendeln: false }), F('title-lang', '/kennzeichen/b/', { buendeln: false })],
    [F('index-drift', '/kennzeichen/*/', { count: 12 }), F('x', '/kennzeichen/*/'), F('x', '/kennzeichen/*/', { key: 'b' })],  // von der Regel selbst zusammengefasst bzw. schon Familien-URL
  ];
  for (const liste of einzeln) assert.deepEqual(aggregate(liste, B), liste);
  assert.deepEqual(aggregate([], B), []);
});

// ─── Bericht und Score ───────────────────────────────────────────────────────
test('Score: jeder offene Punkt zählt einmal (Bündel = ein Punkt), Abzüge je Stufe gedeckelt, info zählt nicht', () => {
  const o = (severity, count) => ({ severity, ...(count ? { count } : {}) });
  // Formel (report.score): 100 − min(30, 10 × kritisch) − min(20, 4 × hoch) − min(10, 1 × mittel) − min(5, 1 × niedrig)
  assert.equal(report.score([], 471), 100);
  assert.equal(report.score([o('info', 999)], 471), 100, 'info zählt nicht');
  assert.equal(report.score([o('kritisch')], 471), 90);
  assert.equal(report.score(Array(7).fill(o('kritisch')), 471), 70, 'Abzug für kritische Punkte gedeckelt');
  assert.equal(report.score([o('hoch', 471)], 471), 96); assert.equal(report.score([o('hoch', 9999)], 471), 96, 'ein hohes Bündel ist ein Punkt, unabhängig von der Seitenzahl');
  assert.equal(report.score([o('mittel', 471)], 471), 99); assert.equal(report.score([o('niedrig', 709)], 471), 99, 'ein niedriges Bündel über 709 nicht indexierte Seiten kostet einen Punkt');
  assert.equal(report.score(Array(29).fill(o('niedrig')), 471), 95, 'Abzug für niedrige Punkte gedeckelt');
  assert.equal(report.score([o('kritisch'), o('hoch', 471), o('mittel', 471), o('niedrig', 471), o('info', 471)], 471), 84);
  // Stand der Live-Website am 22.11.2026: 1 kritisch, 5 hoch, 3 mittel, 29 niedrig
  assert.equal(report.score([o('kritisch'), ...Array(5).fill(o('hoch')), ...Array(3).fill(o('mittel')), ...Array(29).fill(o('niedrig'))], 471), 62);
  assert.equal(report.score([o('hoch')], 0), 96, 'ohne Seiten kein Fehler');
});
test('Bericht: Titel aus der Basis-URL, indexierbar/noindex je Seitentyp, JSON behält summary und stats', () => {
  const d = tmp('bericht'); const s = new IssueStore(d);
  const summary = s.apply([F('title-lang', '/preise/', { severity: 'hoch', count: 157 }), { rule: 'noindex-wichtig', severity: 'kritisch', approval: 'auto', url: B + '/', title: 'Wichtige Seite auf noindex: /', detail: 'robots: noindex', suggestion: 'noindex entfernen' }], { runId: 'weekly-1', scope: ['title-lang', 'noindex-wichtig'], kind: 'weekly' });
  const stats = { crawled: 1220, fetched: 1220, reused: 0, indexable: 471, noindex: 749, typen: { behoerde: { gesamt: 404, indexable: 388 }, kennzeichen: { gesamt: 709, indexable: 3 }, start: { gesamt: 1, indexable: 1 } } };
  const h = report.header('weekly', { runId: 'weekly-1', summary }, s, stats, { base: B });
  assert.deepEqual([h.site, h.crawled, h.indexable, h.noindex, h.open, h.kritisch, h.hoch, h.neu, h.score], ['kfz-zulassungsprofis.de', 1220, 471, 749, 2, 1, 1, 2, 86]);
  assert.deepEqual(h.typen, stats.typen);
  const md = report.md(h, s, { gsc: { connected: false, status: { reason: 'Test.' } }, history: s.state.runs, notes: ['Hinweis A'], actions: actions.topActions(s.all(), { importantPaths: ['/'] }, 3) });
  assert.match(md, /^# SEO-Wochenbericht kfz-zulassungsprofis\.de – 20\d\d-\d\d-\d\d \d\d:\d\d\n/);
  assert.match(md, /\*\*SEO-Status: 86\/100\*\*/); assert.match(md, /Geprüft: 1220 URLs .* indexierbar 471 · bewusst nicht indexiert \(noindex\) 749/);
  assert.match(md, /\| Kennzeichen \| 709 \| 3 \| 706 \|/); assert.match(md, /\| Zulassungsstellen \| 404 \| 388 \| 16 \|/); assert.match(md, /\| Startseite \| 1 \| 1 \| 0 \|/);
  assert.match(md, /## Kritisch – sofort \(1\)/); assert.match(md, /Nicht verbunden: Test\. Kennzahlen/); assert.match(md, /## Hinweise\n\n- Hinweis A/); assert.match(md, /## Die wichtigsten Maßnahmen/);
  // Ohne Typ-Zählung (z. B. Vorschau ohne Crawl) fällt nur der Abschnitt weg
  const ohne = report.header('daily', { runId: 'd', summary }, s, { crawled: 30 }); assert.equal(ohne.score, report.score(s.open(), 30)); assert.doesNotMatch(report.md(ohne, s), /Seiten nach Typ/); assert.match(report.md(ohne, s), /^# SEO-Tagesbericht – /);
  const f = report.write({ dataDir: d }, h, md, { summary, stats, monat: { neu: 2, behoben: 0 } });
  assert.equal(path.basename(f), `weekly-${report.ortsdatum(h.generatedAt)}-weekly.md`, 'Dateiname nach deutschem Kalendertag'); assert.equal(fs.readFileSync(f, 'utf8'), md);
  const dateien = fs.readdirSync(path.join(d, 'reports')).sort(); assert.equal(dateien.length, 4); assert.ok(dateien.every(n => !/tmp/.test(n)));
  for (const n of ['latest-weekly.json', path.basename(f).replace('.md', '.json')]) { const j = JSON.parse(fs.readFileSync(path.join(d, 'reports', n), 'utf8')); assert.equal(j.score, 86); assert.equal(j.kind, 'weekly'); assert.deepEqual(j.summary.new, summary.new); assert.equal(j.stats.indexable, 471); assert.deepEqual(j.monat, { neu: 2, behoben: 0 }); }
});

// ─── Maßnahmen, Chancen, Konfiguration ───────────────────────────────────────
test('Maßnahmen und Chancen: KFZ-Texte, Ziele /auftrag/, /preise/, /rechner/, Quelldateien der Website', () => {
  const offen = (rule, extra) => ({ id: rule, rule, status: 'offen', severity: 'hoch', approval: 'auto', url: B + '/preise/', title: rule, ...extra });
  const top = actions.topActions([offen('preis-alt', { approval: 'preis', severity: 'kritisch' }), offen('title-lang', { count: 9, approval: 'manuell', severity: 'niedrig' }), offen('alte-domain-weiterleitung'), offen('unbekannte-regel', { suggestion: 'Eigener Vorschlag' }), offen('info-regel', { severity: 'info' })], { importantPaths: ['/preise/'] }, 5);
  assert.deepEqual(top.map(t => t.rule), ['preis-alt', 'alte-domain-weiterleitung', 'unbekannte-regel', 'title-lang']);
  assert.match(top[0].action, /config\/preise\.json.*Preisfreigabe über config\/preise\.json nötig$/); assert.equal(top[0].needsApproval, true);
  assert.match(top[1].action, /deploy\/alte-domain\/\.htaccess.*technisch, nach lokalem Test umsetzbar$/);
  assert.match(top[2].action, /^Eigener Vorschlag/); assert.match(top[3].action, /lib\/seo\.ts\) \(9 Seiten\) – inhaltliche Freigabe nötig$/);
  assert.equal(actions.impact({ severity: 'unbekannt' }, {}), 0);
  // Ratgeber ohne Weg zum Auftrag: nur Links im INHALT zählen (Kopf-/Fußnavigation verlinkt /auftrag/ auf jeder Seite)
  const rec = (p, body, robots = []) => ({ url: B + p, status: 200, noindex: robots.includes('noindex'), page: html.parse(seite({ body, robots }, B, p), B + p) });
  const crawl = { pages: new Map([rec('/ratgeber/ohne/', '<p>Text</p><a href="/ratgeber/mit/">anderer Ratgeber</a>'), rec('/ratgeber/mit/', '<a href="/preise/">Preise</a>'), rec('/ratgeber/query/', '<a href="/auftrag/?leistung=ummeldung">Ummelden</a>'), rec('/ratgeber/rechner/', '<a href="/rechner/kfz-steuer/">Rechner</a>'), rec('/ratgeber/versteckt/', '<p>x</p>', ['noindex']), rec('/ratgeber/', '<p>Übersicht</p>'), rec('/leistungen/abmeldung/', '<p>x</p>')].map(r => [r.url, r])) };
  const ch = opportunities.fromCrawl([], crawl);
  assert.deepEqual(ch.map(c => [c.type, util.pathOf(c.url)]), [['nutzerfuehrung', '/ratgeber/ohne/']]); assert.match(ch[0].actions.join(' '), /\/auftrag\/.*\/preise\/.*\/rechner\//);
  assert.equal(opportunities.derive({ gsc: { connected: false }, issues: [], crawl: null }).length, 0);
  const viele = Array.from({ length: 3 }, (_, i) => offen('thin-content', { id: 't' + i, url: B + `/ratgeber/t${i}/` }));
  assert.deepEqual(opportunities.fromCrawl(viele, null).map(c => [c.type, c.priority, c.data.count]), [['thin-content', 'mittel', 3]]);
});
test('Konfiguration: Vorgabewerte der Website, Weiterleitungsprüfungen vollständig, keine Zugangsdaten', () => {
  const lade = env => { const alt = {}; const keys = ['SEO_BASE', 'SEO_DATA_DIR', 'SEO_NOTIFY', 'SEO_NOTIFY_TO', 'SEO_CENTER_URL', 'SEO_CENTER_USER', 'SEO_CENTER_PASSWORD', 'GSC_PROPERTY', 'GSC_CREDENTIALS_FILE', 'GSC_CREDENTIALS_JSON', 'SEO_BUILD_DIR', 'SEO_HTML_DIR', 'SEO_CENTER_PORT']; for (const k of keys) { alt[k] = process.env[k]; delete process.env[k]; } Object.assign(process.env, env); delete require.cache[require.resolve('../config')]; try { return require('../config'); } finally { for (const k of keys) { if (alt[k] === undefined) delete process.env[k]; else process.env[k] = alt[k]; } delete require.cache[require.resolve('../config')]; } };
  const c = lade({});
  assert.equal(c.base, 'https://kfz-zulassungsprofis.de'); assert.equal(c.dataDir, path.join(AP, 'data')); assert.equal(c.repoRoot, path.dirname(AP)); assert.equal(c.buildDir, path.join(path.dirname(AP), 'out'));
  assert.deepEqual([c.crawl.maxPages, c.crawl.concurrency, c.crawl.delayMs, c.crawl.timeoutMs, c.crawl.retries], [2500, 3, 200, 20000, 1]);
  assert.deepEqual(c.crawl.ausschluss, ['/api/', '/analytics/', '/seo/', '/_next/']);
  for (const p of [...c.importantPaths, ...c.allowNoindex, ...c.extraPaths, ...c.entwurfSeiten]) assert.match(p, /^\/([a-z0-9-]+\/)*$/, p + ' beginnt und endet mit Schrägstrich');
  for (const p of ['/', '/auftrag/', '/preise/', '/kfz-zulassung/berlin/', '/zulassungsstelle/', '/kennzeichen/', '/impressum/']) assert.ok(c.importantPaths.includes(p), p);
  assert.equal(new Set(c.importantPaths).size, c.importantPaths.length); assert.equal(c.importantPaths.length, 26);
  assert.deepEqual(c.allowNoindex, ['/impressum/', '/datenschutz/', '/widerruf/', '/servicebedingungen/', '/unterlagen/', '/404/']);
  assert.ok(util.matchesAny('/kennzeichen/b/', c.allowNoindex, c.allowNoindexPatterns) && util.matchesAny('/zulassungsstelle/berlin/', [], c.allowNoindexPatterns) && util.matchesAny('/kfz-zulassung/aachen/', [], c.allowNoindexPatterns));
  assert.ok(!util.matchesAny('/kennzeichen/', c.allowNoindex, c.allowNoindexPatterns) && !util.matchesAny('/preise/', c.allowNoindex, c.allowNoindexPatterns));
  assert.deepEqual(c.extraPaths, ['/servicebedingungen/']); assert.deepEqual(c.entwurfSeiten, ['/servicebedingungen/']);
  assert.deepEqual(c.company, { name: 'Volt Gas UG (haftungsbeschränkt)', brand: 'KFZ-Zulassungsprofis', street: 'Pappelallee 64', zip: '10437', city: 'Berlin', phone: '+49 179 1528205', email: 'info@kfz-zulassungsprofis.de', register: 'HRB 289458 B', responsible: 'Ahmet Kerim Akan' });
  assert.ok(c.altmarke.muster.test('Willkommen bei DeutscheZulassung') && c.altmarke.muster.test('info@deutschezulassung.de') && !c.altmarke.muster.test('die deutsche Zulassungsbescheinigung Teil I'));
  assert.deepEqual(c.gsc, { property: 'sc-domain:kfz-zulassungsprofis.de', credentialsFile: '', credentialsJson: '' });
  assert.deepEqual(c.notify, { enabled: false, to: '' }, 'ohne Empfänger kein Versand');
  assert.deepEqual(c.center, { url: 'https://kfz-zulassungsprofis.de/seo/', user: '', password: '' }); assert.equal(c.dashboardPort, 3500);
  // Weiterleitungen: Ziel immer kanonisch (https, ohne www, mit Schrägstrich); http + www bzw. http + alte Domain dürfen 2 Sprünge haben
  const rc = c.redirectChecks; assert.equal(rc.length, 20); assert.equal(new Set(rc.map(x => x.von)).size, 20);
  for (const x of rc) {
    assert.match(x.erwartet, /^https:\/\/kfz-zulassungsprofis\.de\/([a-z0-9-]+\/)*$/, x.von);
    const u = new URL(x.von); const zwei = u.protocol === 'http:' && u.hostname !== 'kfz-zulassungsprofis.de';
    assert.equal(x.maxSpruenge, zwei ? 2 : 1, x.von); assert.ok(['host', 'alte-domain', 'thema'].includes(x.art));
    assert.equal(x.art === 'alte-domain', /deutschezulassung\.de$/.test(u.hostname) && !/kosten|eid/.test(u.pathname), x.von);
  }
  for (const v of ['http://kfz-zulassungsprofis.de/', 'https://www.kfz-zulassungsprofis.de/', 'http://www.kfz-zulassungsprofis.de/', 'https://deutschezulassung.de/', 'https://www.deutschezulassung.de/', 'http://deutschezulassung.de/', 'http://www.deutschezulassung.de/', 'https://www.kfz-zulassungsprofis.de/preise/', 'https://deutschezulassung.de/preise/']) assert.ok(rc.some(x => x.von === v), v);
  assert.deepEqual([...new Set(rc.filter(x => x.art === 'thema').map(x => x.erwartet.replace(c.base, '')))].sort(), ['/ikfz-funktioniert-nicht/', '/kfz-zulassung-ohne-eid/', '/ratgeber/was-kostet-eine-kfz-zulassung/']);
  // Umgebungsvariablen
  const e = lade({ SEO_BASE: 'http://127.0.0.1:4000///', SEO_DATA_DIR: '/tmp/x', SEO_NOTIFY: '1', SEO_NOTIFY_TO: 'a@example.org', GSC_PROPERTY: 'https://kfz-zulassungsprofis.de/', SEO_CENTER_USER: 'u', SEO_CENTER_PASSWORD: 'p' });
  assert.equal(e.base, 'http://127.0.0.1:4000'); assert.equal(e.dataDir, '/tmp/x'); assert.deepEqual(e.notify, { enabled: true, to: 'a@example.org' }); assert.equal(e.gsc.property, 'https://kfz-zulassungsprofis.de/'); assert.equal(e.center.user, 'u');
  assert.deepEqual(e.redirectChecks, [], 'Prüfungen der echten Domains nur für die echte Website');
  // Im Quelltext der Kern-Dateien stehen keine Interna des früheren Einsatzortes
  const verboten = new RegExp([['volt', 'gas\\.de'], ['volt', 'gas-'], ['/var', '/www'], ['pm', '2 '], ['Het', 'zner'], ['Tarif', 'rechner'], ['ng', 'inx'], ['Energie', 'pr'], ['kW', 'h']].map(t => t.join('')).join('|'), 'i');
  for (const f of ['config.js', 'lib/util.js', 'lib/crawler.js', 'lib/html.js', 'lib/issues.js', 'lib/aggregate.js', 'lib/report.js', 'lib/actions.js', 'lib/opportunities.js', 'bin/autopilot.js', 'test/kern.test.js', 'test/fixtures/kern-site.js']) { const m = verboten.exec(fs.readFileSync(path.join(AP, f), 'utf8')); assert.equal(m, null, `${f}: „${m && m[0]}“`); }
  for (const f of ['mount.js', 'scheduler', 'RELEASE', 'bin/proposals.js', 'test/mount.test.js', 'test/release-guard.test.js', 'test/guard-http.js', 'docs']) assert.equal(fs.existsSync(path.join(AP, f)), false, f + ' ist entfernt');
});

// ─── Ablaufsteuerung ─────────────────────────────────────────────────────────
test('Plausibilität: wenige URLs, Einbruch gegen Vorlauf, Fehlerquote, viele NEUE kritische Befunde → unsicher', () => {
  const { plausibility, unsicherInFolge, unsicherHinweis, TAEGLICH, VOLL } = require('../bin/autopilot');
  const c = (crawled, status, extra = {}) => ({ stats: { crawled, status, ...extra } });
  const krit = n => Array.from({ length: n }, (_, i) => ({ severity: 'kritisch', rule: 'x', url: B + '/' + i }));
  assert.deepEqual(plausibility(c(1220, { 200: 1210, 404: 10 }), { stats: { crawled: 1220 } }, krit(3)), { suspicious: false, reasons: [] });
  assert.match(plausibility(c(20, { 200: 20 }), null, []).reasons[0], /nur 20 URLs/);
  assert.match(plausibility(c(600, { 200: 600 }), { stats: { crawled: 1220 } }, []).reasons[0], /URL-Zahl um 51 % gesunken \(1220 → 600\)/);
  assert.equal(plausibility(c(800, { 200: 800 }), { stats: { crawled: 1220 } }, []).suspicious, false);
  assert.match(plausibility(c(1000, { 200: 600, 404: 400 }), null, []).reasons[0], /nur 60 % der URLs mit Status 200/);
  assert.match(plausibility(c(1000, { 200: 750, 0: 150, 503: 100 }), null, []).reasons[0], /250 Server-\/Netzfehler/);
  assert.match(plausibility(c(1000, { 200: 1000 }, { interneFehler: 2 }), null, []).reasons[0], /2 interne Verarbeitungsfehler/);
  assert.match(plausibility(c(1000, { 200: 1000 }), null, krit(10)).reasons[0], /10 neue kritische Befunde/);
  assert.equal(plausibility(c(1000, { 200: 1000 }), null, krit(12), () => true).suspicious, false, 'bereits offene kritische Punkte machen einen Lauf nicht unsicher');
  assert.equal(plausibility(c(1000, { 200: 1000 }), null, krit(12), f => f.url.endsWith('/0')).suspicious, true);
  assert.equal(unsicherInFolge([{ suspicious: true }, { suspicious: false }, { suspicious: true }, { suspicious: true }]), 2); assert.equal(unsicherInFolge([]), 0); assert.equal(unsicherInFolge(undefined), 0);
  // Hinweis-Mail: ein einzelner unsicherer Lauf bleibt still, der zweite in Folge wird einmal gemeldet, danach wieder Ruhe
  assert.deepEqual([0, 1, 2, 5].map(n => !unsicherHinweis('daily-x', ['nur 20 URLs gecrawlt'], n).skip), [false, true, false, false]);
  const hinweis = unsicherHinweis('daily-x', ['nur 20 URLs gecrawlt'], 1); assert.equal(hinweis.channel, 'hinweis'); assert.deepEqual(hinweis.ids, []); assert.match(hinweis.subject, /zwei Prüfläufe in Folge/); assert.match(hinweis.body, /nur 20 URLs gecrawlt/);
  assert.deepEqual(TAEGLICH, ['technical', 'meta', 'kfz']); assert.deepEqual(VOLL, ['technical', 'meta', 'kfz', 'schema', 'content', 'faq']);
});
test('Modulausfall: „Prüfmodul ausgefallen“ schließt nur ein Lauf, der das Modul ausgeführt hat (Tageslauf lässt Wochenmodule offen)', () => {
  const { pruefen, TAEGLICH, VOLL } = require('../bin/autopilot');
  const still = fn => { const alt = console.log; console.log = () => {}; try { return fn(); } finally { console.log = alt; } };
  const leer = { crawl: { base: B, pages: new Map(), stats: {}, sitemap: { entries: new Map(), files: [] }, dateien: new Map(), robotsStatus: 200, robots: { sitemaps: [B + '/sitemap.xml'] } }, prev: null, cfg: { base: B, importantPaths: [] }, hostChecks: [], soll: null };
  const s = new IssueStore(tmp('modul'));
  const lauf = (namen, ctx, runId) => { const l = still(() => pruefen(namen, ctx)); return { l, r: s.apply(l.findings, { runId, scope: l.scope, kind: 'weekly' }) }; };
  // Wochenlauf, „Inhalt“ stürzt ab (kaputter Kontext nur für dieses Modul)
  const w1 = lauf(['content'], {}, 'w1'); assert.deepEqual(w1.l.defekt, ['content']); const id = w1.r.new[0];
  assert.deepEqual([s.get(id).rule, s.get(id).key], ['autopilot-modul', 'content']);
  assert.ok(!w1.l.scope.includes('autopilot-modul') && !w1.l.scope.includes('autopilot-modul:content'));
  // Tageslauf ohne Inhalt/Schema/FAQ: Ausfall bleibt offen (vorher: als „behoben“ gemeldet)
  const d = lauf(TAEGLICH, leer, 'd1'); assert.deepEqual(d.l.defekt, []);
  assert.deepEqual(d.l.scope.filter(x => x.startsWith('autopilot-modul')), ['autopilot-modul:technical', 'autopilot-modul:meta', 'autopilot-modul:kfz']);
  assert.equal(d.r.resolved.includes(id), false); assert.equal(s.get(id).status, 'offen');
  // fehlendes Modul schließt ebenfalls nichts
  assert.equal(lauf(['gibtsnicht'], leer, 'x1').r.resolved.includes(id), false);
  // Wochenlauf mit funktionierendem „Inhalt“: jetzt behoben; ein Ausfall eines anderen Moduls bleibt unberührt
  const t = lauf(['technical'], {}, 'w2'); const idT = t.r.new[0]; assert.equal(s.get(idT).key, 'technical');
  const w3 = lauf(['content'], leer, 'w3'); assert.ok(w3.r.resolved.includes(id)); assert.equal(s.get(idT).status, 'offen');
  assert.ok(VOLL.includes('content'));
  // Umfang „regel:schlüssel“ im Befundspeicher wirkt nur auf genau diesen Schlüssel
  const s2 = new IssueStore(tmp('umfang')); const a = { rule: 'autopilot-modul', severity: 'hoch', file: 'x', key: 'faq', title: 'a' }, b = { ...a, key: 'schema', title: 'b' };
  s2.apply([a, b], { runId: 'r1', scope: [], kind: 'weekly' });
  assert.deepEqual(s2.apply([], { runId: 'r2', scope: ['autopilot-modul:faq'], kind: 'weekly' }).resolved, [fingerprint(a)]); assert.equal(s2.get(fingerprint(b)).status, 'offen');
});
test('autopilot.js (eigener Prozess): crawl, Offline-Läufe, unsicherer Lauf überschreibt last-crawl.json nicht, Monatsbericht, status', async () => {
  const d = tmp('cli'); const lies = n => JSON.parse(fs.readFileSync(path.join(d, n), 'utf8')); const gibt = n => fs.existsSync(path.join(d, n));
  // asynchron starten: Der Test-Server läuft in diesem Prozess und muss dem Kindprozess antworten können
  const run = (args, env = {}) => new Promise(resolve => execFile(process.execPath, [path.join(AP, 'bin', 'autopilot.js'), ...args], { encoding: 'utf8', timeout: 90000, env: { PATH: process.env.PATH, HOME: os.tmpdir(), SEO_BASE: site.base, SEO_DATA_DIR: d, ...env } }, (err, stdout, stderr) => {
    const r = { status: err ? (typeof err.code === 'number' ? err.code : 99) : 0, stdout, stderr };
    assert.doesNotMatch(stdout + stderr, /@|example\.org|geheim/, 'keine Adressen oder Zugangsdaten in der Ausgabe'); resolve(r);
  }));
  const OFF = { SEO_OFFLINE: '1' };

  // crawl: die kleine Test-Website gilt als „unsicher“ (< 50 URLs) → ohne --trotzdem bleibt last-crawl.json unberührt
  const c1 = await run(['crawl']);
  assert.equal(c1.status, 1, c1.stdout + c1.stderr); assert.match(c1.stdout, /Crawl unsicher: nur 20 URLs gecrawlt/); assert.equal(gibt('last-crawl.json'), false); assert.equal(gibt('page-cache.json'), true);
  const c2 = await run(['crawl', '--trotzdem']);
  assert.equal(c2.status, 0, c2.stdout + c2.stderr); assert.match(c2.stdout, /Crawl fertig: 20 URLs \(\d+ indexierbar, \d+ noindex\)/); assert.match(c2.stdout, /Weiterleitungen: 0 geprüft, 0 auffällig · Dateien: 2 geprüft/);
  const lc = lies('last-crawl.json');
  assert.equal(lc.base, site.base); assert.equal(Object.keys(lc.pages).length, 20); assert.deepEqual(lc.hostChecks, []); assert.equal(Object.keys(lc.dateien).length, 2);
  const seite1 = lc.pages[site.base + '/preise/']; assert.deepEqual([seite1.path, seite1.typ, seite1.noindex, seite1.indexable, typeof seite1.contentHash], ['/preise/', 'sonst', false, true, 'string']);
  assert.deepEqual(fs.readdirSync(d).sort(), ['last-crawl.json', 'page-cache.json'], 'crawl schreibt nur diese beiden Dateien');

  // Offline-Tagesläufe: kein Abruf; unsicher → last-crawl.json wird nicht (neu) geschrieben; nach drei unsicheren Läufen in Folge doch
  fs.unlinkSync(path.join(d, 'last-crawl.json')); site.requests.length = 0;
  const d1 = await run(['daily'], OFF);
  assert.equal(d1.status, 0, d1.stdout + d1.stderr); assert.match(d1.stdout, /Offline-Modus/); assert.match(d1.stdout, /Lauf als unsicher markiert/); assert.match(d1.stdout, /last-crawl\.json bleibt unverändert/);
  assert.match(d1.stdout, /Bericht: reports[\\/]daily-\d{4}-\d\d-\d\d\.md · Score \d+ · offen \d+/);
  assert.equal(gibt('last-crawl.json'), false);
  const st1 = lies('issues.json'); assert.equal(st1.runs.length, 1); assert.equal(st1.runs[0].suspicious, true); assert.equal(st1.runs[0].kind, 'daily'); assert.equal(typeof st1.runs[0].score, 'number'); assert.deepEqual(Object.keys(st1.lastDigest).sort(), ['monat', 'tag', 'woche']);
  const h1 = lies('crawl-history.json'); assert.equal(h1.length, 1);
  assert.deepEqual([h1[0].kind, h1[0].crawled, h1[0].suspicious, h1[0].offline, typeof h1[0].score, typeof h1[0].indexable, typeof h1[0].noindex], ['daily', 20, true, true, 'number', 'number', 'number']);
  assert.deepEqual(h1[0].typen.start, { gesamt: 1, indexable: 1 }); assert.equal(h1[0].status['200'], 19);
  const rep = lies('reports/latest-daily.json');
  assert.equal(rep.kind, 'daily'); assert.equal(rep.suspicious, true); assert.ok(Array.isArray(rep.summary.new)); assert.equal(rep.stats.crawled, 20); assert.equal(rep.score, h1[0].score); assert.equal(rep.site, new URL(site.base).host);
  const md = fs.readFileSync(path.join(d, 'reports', 'latest-daily.md'), 'utf8'); assert.match(md, /^# SEO-Tagesbericht 127\.0\.0\.1:\d+ – /); assert.match(md, /LAUF UNSICHER/); assert.match(md, /## Seiten nach Typ/); assert.match(md, /Offline-Lauf/);
  const d2 = await run(['daily'], OFF); assert.equal(d2.status, 0, d2.stdout + d2.stderr); assert.equal(gibt('last-crawl.json'), false);
  const d3 = await run(['daily'], OFF); assert.equal(d3.status, 0, d3.stdout + d3.stderr); assert.match(d3.stdout, /Vergleichsbasis nach drei unsicheren Läufen in Folge übernommen/); assert.equal(gibt('last-crawl.json'), true);
  assert.equal(lies('issues.json').runs.length, 3); assert.equal(lies('crawl-history.json').length, 3);

  // Monatslauf: EIN Bericht, der summary, stats und die Monatsauswertung enthält
  const m = await run(['monthly'], OFF); assert.equal(m.status, 0, m.stdout + m.stderr);
  const mon = lies('reports/latest-monthly.json');
  assert.equal(mon.kind, 'monthly'); assert.ok(Array.isArray(mon.summary.new)); assert.equal(mon.stats.crawled, 20); assert.equal(typeof mon.monat.neu, 'number'); assert.equal(typeof mon.monat.behoben, 'number');
  assert.match(fs.readFileSync(path.join(d, 'reports', 'latest-monthly.md'), 'utf8'), /In den letzten 30 Tagen neu erkannt: \d+, behoben: \d+/);
  assert.equal(fs.readdirSync(path.join(d, 'reports')).filter(n => /^monthly-.*\.json$/.test(n)).length, 1);
  assert.equal(site.requests.length, 0, 'Offline-Läufe rufen die Website nicht ab');
  assert.deepEqual(fs.readdirSync(d).filter(n => /\.tmp-/.test(n)), [], 'keine Zwischendateien');

  // status: Zahlen und Schalter, aber keine Adressen, Benutzernamen oder Passwörter
  const s = await run(['status'], { SEO_NOTIFY: '1', SEO_NOTIFY_TO: 'empfaenger@example.org', SMTP_USER: 'absender@example.org', SMTP_PASSWORD: 'geheim', SEO_CENTER_USER: 'geheim-nutzer', SEO_CENTER_PASSWORD: 'geheim', SEO_CENTER_URL: 'https://geheim-nutzer:geheim@center.invalid/seo/' });
  assert.equal(s.status, 0, s.stderr); const sj = JSON.parse(s.stdout);
  assert.deepEqual(sj.notify, { eingeschaltet: true, empfaengerHinterlegt: true, postfachHinterlegt: true }); assert.deepEqual(sj.center, { url: 'https://center.invalid/seo/', zugangHinterlegt: true });
  assert.equal(sj.base, site.base); assert.equal(sj.laeufe, 4); assert.equal(sj.seitencache, true); assert.equal(sj.letzterLauf.kind, 'monthly'); assert.equal(typeof sj.offen, 'number');

  // Beschädigte issues.json: Abbruch vor dem Lauf, Datei bleibt, wie sie ist
  const kaputt = '{"issues": {"abc": '; fs.writeFileSync(path.join(d, 'issues.json'), kaputt);
  const k = await run(['daily'], OFF); assert.equal(k.status, 1); assert.match(k.stderr, /issues\.json ist beschädigt/); assert.equal(fs.readFileSync(path.join(d, 'issues.json'), 'utf8'), kaputt); assert.equal(lies('crawl-history.json').length, 4);
  const u = await run(['gibtsnicht']); assert.equal(u.status, 2); assert.match(u.stderr, /Unbekannter Befehl/);
  // Offline ohne Seitencache: klare Meldung statt Netz-Zugriff
  const leer = tmp('cli-leer'); const o = await run(['crawl'], { ...OFF, SEO_DATA_DIR: leer }); assert.equal(o.status, 1); assert.match(o.stderr, /kein Seitencache vorhanden/);
});
test('autopilot.js (eigener Prozess): Fehler nach dem Versand (Aufräumen, Bericht) beenden den Lauf mit Exit 0 – sonst fiele der Upload aus und die Mails kämen doppelt', async t => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) return t.skip('als root greifen Dateirechte nicht');
  const run = d => new Promise(resolve => execFile(process.execPath, [path.join(AP, 'bin', 'autopilot.js'), 'daily'], { encoding: 'utf8', timeout: 90000, env: { PATH: process.env.PATH, HOME: os.tmpdir(), SEO_BASE: site.base, SEO_DATA_DIR: d, SEO_OFFLINE: '1', SEO_CACHE_FILE: cacheDatei } }, (err, stdout, stderr) => {
    const r = { status: err ? (typeof err.code === 'number' ? err.code : 99) : 0, stdout, stderr }; assert.doesNotMatch(stdout + stderr, /keine Ablage|nach-versand/, 'keine Inhalte oder Pfade im Log'); resolve(r);
  }));
  // 1) Berichtsordner ohne Leserecht: Aufräumen scheitert, der Bericht entsteht trotzdem – mit Hinweis
  const d = tmp('nach-versand'); const rep = path.join(d, 'reports'); fs.mkdirSync(rep); fs.chmodSync(rep, 0o300);
  let r; try { r = await run(d); } finally { fs.chmodSync(rep, 0o700); }
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /⚠ Aufräumen fehlgeschlagen \(EACCES\) – der Lauf wird trotzdem abgeschlossen/); assert.match(r.stdout, /Bericht: reports[\\/]daily-\d{4}-\d\d-\d\d\.md · Score \d+/);
  assert.match(fs.readFileSync(path.join(rep, 'latest-daily.md'), 'utf8'), /## Hinweise[\s\S]*⚠ Nach dem Versand fehlgeschlagen: Aufräumen \(EACCES\) – der Lauf wurde trotzdem abgeschlossen\./);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d, 'issues.json'), 'utf8')).runs.length, 1);
  // 2) „reports“ ist eine Datei: Aufräumen, Bericht und Ersatzbericht scheitern – trotzdem Exit 0; Befundspeicher und Verlauf stehen
  const d2 = tmp('nach-versand-2'); fs.writeFileSync(path.join(d2, 'reports'), 'keine Ablage');
  const r2 = await run(d2);
  assert.equal(r2.status, 0, r2.stdout + r2.stderr);
  assert.match(r2.stdout, /⚠ Aufräumen fehlgeschlagen/); assert.match(r2.stdout, /⚠ Bericht fehlgeschlagen/); assert.match(r2.stdout, /⚠ Ersatzbericht fehlgeschlagen/); assert.match(r2.stdout, /Bericht: nicht geschrieben · Score \d+/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(d2, 'issues.json'), 'utf8')).runs.length, 1); assert.equal(JSON.parse(fs.readFileSync(path.join(d2, 'crawl-history.json'), 'utf8')).length, 1);
  assert.equal(fs.readFileSync(path.join(d2, 'reports'), 'utf8'), 'keine Ablage');
});
