'use strict';
// Strukturierte Daten (lib/rules/schema.js) und FAQ/Rechtsangaben (lib/rules/faq.js).
// Stil B: ohne HTTP, Datensätze über html.parse; Sollwerte aus Testdateien in einem eigenen Temp-Ordner; festes „heute“.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const html = require('../lib/html');
const util = require('../lib/util');
const soll = require('../lib/soll');
const schema = require('../lib/rules/schema');
const faq = require('../lib/rules/faq');
const { aggregate } = require('../lib/aggregate');

const base = 'https://kfz.example';
const cfg = { base, company: { name: 'Muster Dienst UG (haftungsbeschränkt)', brand: 'KFZ-Zulassungsprofis', street: 'Beispielweg 7', zip: '10115', city: 'Berlin', phone: '+49 170 1234567', email: 'info@kfz.example' } };
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-schema-faq-'));
fs.mkdirSync(path.join(REPO, 'config'));
fs.writeFileSync(path.join(REPO, 'config', 'preise.json'), JSON.stringify({ leistungen: { neuzulassung: { preis: 110 }, abmeldung: { preis: 34 } } }));
fs.writeFileSync(path.join(REPO, 'config', 'betrieb.json'), JSON.stringify({ zeiten: { bearbeitung: { neuzulassung: { minuten: [10, 30] }, kurzzeitkennzeichen: { werktage: [1, 2] } }, versand: { kennzeichen: { werktage: [1, 3] } } }, abwicklung: { servicezeiten: { wert: 'Mo–Fr 8:00–18:00 Uhr' } } }));
const SOLL = soll.load({ repoRoot: REPO }, '2026-11-22');

const ORG = { '@type': 'Organization', '@id': base + '/#organization', name: 'KFZ-Zulassungsprofis', legalName: 'Muster Dienst UG (haftungsbeschränkt)', url: base, email: 'info@kfz.example', telephone: '+49 170 1234567', address: { '@type': 'PostalAddress', streetAddress: 'Beispielweg 7', postalCode: '10115', addressLocality: 'Berlin' }, contactPoint: { '@type': 'ContactPoint', telephone: '0170 / 123 45 67', email: 'mailto:info@kfz.example' }, sameAs: ['https://www.facebook.com/kfz'] };
const GRAPH = (org = ORG) => ({ '@context': 'https://schema.org', '@graph': [org, { '@type': 'WebSite', '@id': base + '/#website', url: base, name: 'KFZ-Zulassungsprofis', publisher: { '@id': base + '/#organization' } }] });
const FAQ = fragen => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: fragen.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: a === null ? undefined : { '@type': 'Answer', text: a } })) });
const seite = ({ title = 'Seite | KFZ-Zulassungsprofis', h1 = 'Überschrift', main = '<p>Inhalt.</p>', ld = [GRAPH()], fragen = [], roh = '' } = {}) => {
  const blocks = [...ld, ...(fragen.length ? [FAQ(fragen)] : [])];
  const sichtbar = fragen.map(([q, a]) => `<h3>${q}</h3><p>${a || ''}</p>`).join('');
  return `<!DOCTYPE html><html lang="de"><head><title>${title}</title>${blocks.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('')}${roh}</head><body><header><nav><a href="/">Start</a></nav></header><main><h1>${h1}</h1>${main}${sichtbar}</main><footer><p>Privater Zulassungsdienst, keine Behörde.</p></footer></body></html>`;
};
function rec(p, h, extra = {}) { const url = base + p; const r = { url, path: p, typ: util.pageType(p), status: 200, final: url, chain: [], headers: {}, page: html.parse(h, url), inSitemap: true, inlinks: 3, ...extra }; r.noindex = util.isNoindex(r); r.indexable = !r.noindex; return r; }
const crawlAus = (...recs) => ({ base, pages: new Map(recs.map(r => [r.url, r])) });
const S = (recs, heute = '2026-11-22') => schema.run({ crawl: crawlAus(...recs), cfg, heute, soll: SOLL });
const Q = (recs, o = {}) => faq.run({ crawl: crawlAus(...recs), cfg, soll: o.soll !== undefined ? o.soll : SOLL, heute: '2026-11-22' });
const nach = (out, rule) => out.filter(f => f.rule === rule);
const alleSchema = new Set(), alleFaq = new Set();
const ms = out => { for (const f of out) alleSchema.add(f.rule); return out; };
const mf = out => { for (const f of out) alleFaq.add(f.rule); return out; };

// ─── Schema ──────────────────────────────────────────────────────────────────
const BEHOERDE_LD = [GRAPH(), { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Zulassungsstelle Musterstadt', url: base + '/zulassungsstelle/musterstadt/', dateModified: '2026-11-03', publisher: { '@id': base + '/#organization' }, about: { '@type': 'GovernmentOffice', name: 'Stadt Musterstadt', url: 'https://www.musterstadt.example/kfz', telephone: '+49 30 999', address: { '@type': 'PostalAddress', streetAddress: 'Rathausplatz 1', postalCode: '99999', addressLocality: 'Musterstadt' } } },
  { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Startseite', item: base + '/' }, { '@type': 'ListItem', position: 2, name: 'Zulassungsstellen', item: base + '/zulassungsstelle/' }, { '@type': 'ListItem', position: 3, name: 'Musterstadt' }] }];

test('Schema – Schnittstelle', () => {
  assert.equal(schema.gruppe, 'Strukturierte Daten');
  for (const r of schema.rules) assert.ok(schema.labels[r], `Kurztext für ${r}`);
});

test('Schema – echte Struktur ohne Befund: GovernmentOffice/sameAs extern, Telefon in anderer Schreibweise, sichtbare FAQ, Offer', () => {
  const out = ms(S([
    rec('/', seite({ fragen: [['Wie lange dauert die Bearbeitung?', 'Die Bearbeitung dauert meist 10–30 Minuten.']] })),
    rec('/zulassungsstelle/musterstadt/', seite({ ld: BEHOERDE_LD })),
    rec('/leistungen/abmeldung/', seite({ ld: [GRAPH({ ...ORG, telephone: '+491701234567' }), { '@type': 'Service', name: 'Abmeldung', url: base + '/leistungen/abmeldung/', provider: { '@id': base + '/#organization' }, offers: { '@type': 'Offer', price: '34.00', priceCurrency: 'EUR', url: base + '/leistungen/abmeldung/' } }] })),
    rec('/ratgeber/a/', seite({ h1: 'Auto abmelden', ld: [GRAPH(), { '@type': 'Article', headline: 'Auto abmelden', image: base + '/bild.webp', datePublished: '2026-11-23', dateModified: '2026-11-23', author: { '@type': 'Person', name: 'Erika', url: 'https://www.linkedin.com/in/erika' } }] })),
  ]));
  assert.deepEqual(out.map(f => `${f.rule} ${f.url} ${f.detail}`), []);
});

test('Schema – Syntax, Pflichtfelder (ohne fremde Markennamen), HowTo, Preis, FAQ, Breadcrumb, headline', () => {
  const out = ms(S([
    rec('/a/', seite({ roh: '<script type="application/ld+json">{"@type": "Organization",, }</script>' })),
    rec('/ratgeber/b/', seite({ h1: 'Ganz andere Überschrift', ld: [GRAPH(), { '@type': 'Article', headline: 'Auto ummelden', datePublished: '2026-01-01' }] })),
    rec('/c/', seite({ ld: [GRAPH(), { '@type': 'HowTo', name: 'Anleitung' }, { '@type': 'Offer', price: '110,00 €', priceCurrency: 'EUR' }] })),
    rec('/d/', seite({ fragen: [['Sichtbare Frage?', 'Antwort mit genug Wörtern für die Prüfung hier.'], ['Ohne Antwort?', null]], ld: [GRAPH(), FAQ([['Unsichtbare Frage im Markup?', 'Antwort.']]), { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, item: base + '/' }, { '@type': 'ListItem', position: 3, item: base + '/d/' }] }] })),
  ]));
  assert.equal(nach(out, 'jsonld-syntax')[0].severity, 'hoch');
  const pf = nach(out, 'schema-pflichtfeld')[0];
  assert.equal(pf.severity, 'mittel'); assert.match(pf.title, /Article ohne empfohlene Felder image, author/); assert.match(pf.suggestion, /„KFZ-Zulassungsprofis“ als Organisation/);
  assert.equal(nach(out, 'schema-veraltet')[0].key, 'HowTo');
  const pr = nach(out, 'schema-preis')[0]; assert.equal(pr.approval, 'preis'); assert.equal(pr.current, '110,00 €');
  assert.equal(nach(out, 'schema-faq').length, 1); assert.equal(nach(out, 'schema-faq-unsichtbar').length, 1);
  assert.match(nach(out, 'schema-faq-unsichtbar')[0].detail, /Unsichtbare Frage/);
  assert.match(nach(out, 'schema-breadcrumb')[0].detail, /erwartet 2, gefunden 3/);
  assert.equal(nach(out, 'schema-widerspruch')[0].url, base + '/ratgeber/b/');
  for (const f of out) assert.doesNotMatch(JSON.stringify(f), /volt/i, 'keine fremden Markennamen in Befundtexten');
});

test('Schema – Bewertungen: selbstbezogen (über cfg.company.brand/name) hoch, fremd mittel', () => {
  const out = ms(S([
    rec('/a/', seite({ ld: [GRAPH({ ...ORG, aggregateRating: { '@type': 'AggregateRating', ratingValue: 4.9, reviewCount: 120 } })] })),
    rec('/b/', seite({ ld: [GRAPH(), { '@type': 'Review', itemReviewed: { '@type': 'Service', name: 'Zulassung über KFZ-Zulassungsprofis' }, reviewRating: { '@type': 'Rating', ratingValue: 5 } }] })),
    rec('/c/', seite({ ld: [GRAPH(), { '@type': 'Review', itemReviewed: { '@type': 'Product', name: 'Kennzeichenhalter X', url: 'https://shop.example/x' } }] })),
  ]));
  const b = nach(out, 'schema-bewertung'); const by = Object.fromEntries(b.map(f => [util.pathOf(f.url), f.severity]));
  assert.deepEqual(by, { '/a/': 'hoch', '/b/': 'hoch', '/c/': 'mittel' });
  for (const f of b) assert.equal(f.approval, 'recht');
  // andere Marke in der Konfiguration → dieselbe Bewertung ist nicht mehr „eigen“
  const fremd = schema.run({ crawl: crawlAus(rec('/b/', seite({ ld: [{ '@type': 'Review', itemReviewed: { '@type': 'Service', name: 'Zulassung über KFZ-Zulassungsprofis' } }] }))), cfg: { ...cfg, company: { ...cfg.company, brand: 'Andere Marke', name: 'Andere GmbH' } }, heute: '2026-11-22' });
  assert.equal(nach(fremd, 'schema-bewertung')[0].severity, 'mittel');
});

test('Schema – Adressen: eigene Typen auf fremder Domain ja; Behörden, Personen, sameAs, Logos nicht', () => {
  const out = ms(S([
    rec('/a/', seite({ ld: [GRAPH(), { '@type': 'WebPage', url: 'https://deutschezulassung.de/a/' }] })),
    rec('/b/', seite({ ld: [GRAPH({ ...ORG, url: 'https://deutschezulassung.de' })] })),
    rec('/c/', seite({ ld: [GRAPH(), { '@type': 'WebPage', url: base + '/andere-seite/' }] })),
    rec('/d/', seite({ ld: [GRAPH(), { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, item: 'https://vorschau.example/' }] }] })),
    rec('/zulassungsstelle/musterstadt/', seite({ ld: BEHOERDE_LD })),
    rec('/e/', seite({ ld: [GRAPH(), { '@type': 'Article', headline: 'Überschrift', image: 'https://cdn.example/bild.png', datePublished: '2026-01-01', author: { '@type': 'Person', name: 'X', url: 'https://x.example' }, publisher: { '@type': 'Organization', name: 'Zitierte Quelle', url: 'https://quelle.example' } }, { '@type': 'WebPage', url: base + '/e/', mainEntity: { '@type': 'WebPage', url: base + '/f/' } }] })),
  ]));
  const u = nach(out, 'schema-url').map(f => `${util.pathOf(f.url)} ${f.key} ${f.severity}`).sort();
  assert.deepEqual(u, ['/a/ WebPage.url niedrig', '/b/ Organization.url mittel', '/c/ WebPage.url:seite niedrig', '/d/ breadcrumb niedrig']);
});

test('Schema – Datum: tageweise gegen „heute“ (morgen erlaubt), Reihenfolge, Format', () => {
  const art = (dp, dm) => [GRAPH(), { '@type': 'Article', headline: 'Überschrift', image: base + '/b.png', author: { '@type': 'Person', name: 'X' }, datePublished: dp, ...(dm ? { dateModified: dm } : {}) }];
  const out = ms(S([
    rec('/a/', seite({ ld: art('2026-11-23T23:59:00+01:00') })),
    rec('/b/', seite({ ld: art('2026-11-24') })),
    rec('/c/', seite({ ld: art('2026-10-02', '2026-10-01') })),
    rec('/d/', seite({ ld: art('22.11.2026') })),
  ], '2026-11-22'));
  const d = nach(out, 'schema-datum').map(f => `${util.pathOf(f.url)} ${f.key} ${f.severity}`).sort();
  assert.deepEqual(d, ['/b/ datePublished:zukunft mittel', '/c/ dateModified:vor niedrig', '/d/ datePublished:format niedrig']);
  assert.equal(nach(S([rec('/b/', seite({ ld: art('2026-11-24') }))], '2026-11-23'), 'schema-datum').length, 0);
});

test('Schema – Firmendaten: gegen cfg.company, Telefon in allen Schreibweisen, ein Befund je Feld für die ganze Website', () => {
  const falsch = { ...ORG, telephone: '+49 30 1234567', email: 'kontakt@andere.example', legalName: 'Alte Firma GmbH', address: { ...ORG.address, postalCode: '10117' } };
  const out = ms(S([
    rec('/a/', seite({ ld: [GRAPH(falsch)] })), rec('/b/', seite({ ld: [GRAPH(falsch)] })), rec('/kennzeichen/x/', seite({ ld: [GRAPH(falsch)] })),
    rec('/c/', seite({ ld: [GRAPH({ ...ORG, name: 'Kfz Zulassungsprofis GmbH & Co', telephone: '0049 170 1234567' })] })),
    rec('/d/', seite({ ld: [GRAPH(), { '@type': 'Organization', name: 'ADAC', telephone: '+49 89 7676', url: 'https://adac.example' }] })),
  ]));
  const f = nach(out, 'schema-firmendaten'); const by = Object.fromEntries(f.map(x => [x.key, x]));
  assert.deepEqual(Object.keys(by).sort(), ['alle:adresse', 'alle:email', 'alle:legalName', 'alle:name', 'alle:telefon']);
  assert.equal(by['alle:telefon'].count, 3); assert.equal(by['alle:telefon'].url, base + '/'); assert.match(by['alle:telefon'].title, /„\+49 30 1234567“/);
  assert.equal(by['alle:name'].severity, 'niedrig'); assert.equal(by['alle:adresse'].severity, 'mittel');
  assert.deepEqual(aggregate(f, base).length, f.length, 'kein zusätzliches Bündeln je Familie');
  // korrekte Konfiguration → nichts
  assert.equal(nach(S([rec('/', seite()), rec('/x/', seite({ ld: [GRAPH({ ...ORG, telephone: '0170-1234567' })] }))]), 'schema-firmendaten').length, 0);
});

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const WIDERRUF = seite({ title: 'Widerrufsbelehrung', h1: 'Widerrufsbelehrung', ld: [GRAPH()], main: '<h2>Widerrufsrecht für Verbraucher</h2><p>Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen den Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns mittels einer eindeutigen Erklärung (z. B. ein mit der Post versandter Brief oder E-Mail) informieren.</p><h2>Folgen des Widerrufs</h2><p>Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen unverzüglich und spätestens binnen vierzehn Tagen zurückzuzahlen.</p><p>Das Widerrufsrecht erlischt vorzeitig, wenn die Dienstleistung vollständig erbracht ist; dann besteht kein Widerrufsrecht mehr.</p>' });
const GUT = [
  ['Wie lange dauert die Bearbeitung?', 'Die Bearbeitung Ihres Vorgangs dauert meist 10–30 Minuten, innerhalb unserer Servicezeiten (Mo–Fr 8:00–18:00 Uhr).'],
  ['Wann kommen meine Kennzeichen?', 'Neue Kennzeichenschilder kommen per Post – das dauert in der Regel 1–3 Werktage.'],
  ['Kann ich stornieren?', 'Als Verbraucher haben Sie ein gesetzliches Widerrufsrecht von vierzehn Tagen nach Vertragsschluss.'],
  ['Was ist die eVB?', 'Die eVB-Nummer ist der 7-stellige Nachweis Ihrer Kfz-Haftpflichtversicherung für die Zulassung.'],
  ['Wie lange gilt ein Kurzzeitkennzeichen?', 'Kurzzeitkennzeichen gelten maximal fünf Tage und sind für Überführungen gedacht. Die Bearbeitung dauert 1–2 Werktage.'],
];
const BEHOERDE_FAQ = seite({ title: 'Zulassungsstelle Musterstadt', h1: 'Zulassungsstelle Musterstadt', ld: BEHOERDE_LD, main: '<h2>Öffnungs- und Servicezeiten laut Behörde</h2><p>Mo–Fr 7:30–12:00 Uhr. Bearbeitung vor Ort 15–20 Minuten. Kennzeichen werden in 5–7 Werktagen per Post verschickt.</p><h2>Zulassungsvorgänge über KFZ-Zulassungsprofis</h2><p>Die Bearbeitung dauert bei uns meist 10–30 Minuten.</p>',
  fragen: [['Wann hat die Zulassungsstelle geöffnet?', 'Die Behörde gibt dazu an: „Mo–Fr 7:30–11:30 Uhr ohne Termin; Bearbeitung dauert 20–40 Minuten.“ Über KFZ-Zulassungsprofis brauchen Sie keinen Termin – wir reichen den Antrag ein.'], ['Wie erreiche ich die Behörde?', 'Telefonisch über die Hotline (Mo–Fr 9:00–12:00 Uhr), die Bearbeitung dauert dort etwa 30–45 Minuten. Ohne Termin geht es über uns schneller.']] });

test('FAQ – Schnittstelle', () => {
  assert.equal(faq.gruppe, 'FAQ');
  assert.deepEqual(faq.rules.slice().sort(), ['faq-agb-widerspruch', 'faq-duenn', 'faq-widerspruch', 'rechtsinfo-abweichend', 'rechtsinfo-veraltet']);
  for (const r of faq.rules) assert.ok(faq.labels[r], `Kurztext für ${r}`);
  assert.deepEqual(faq.geprueft({ soll: SOLL }), faq.rules);
  assert.ok(!faq.geprueft({ soll: null }).includes('rechtsinfo-abweichend'));
  for (const f of faq.FAKTEN) assert.doesNotMatch(f.name, /Wechsel|Grundversorgung|Preiserhöhung|Laufzeit/, 'nur Fakten dieser Website');
});

test('FAQ – stimmige Website ohne Befund: Zahlwörter, Rückzahlungsfrist, Kurzzeitkennzeichen, Behördendaten und -zitate', () => {
  const out = mf(Q([rec('/', seite({ fragen: GUT })), rec('/faq/', seite({ fragen: GUT.slice(0, 3) })), rec('/widerruf/', WIDERRUF), rec('/zulassungsstelle/musterstadt/', BEHOERDE_FAQ),
    rec('/kontakt/', seite({ main: '<p>Erreichbar sind wir Mo–Fr von 8:00 bis 18:00 Uhr. Wichtig: Die Widerrufsfrist beträgt zwei Wochen.</p>' }))]));
  assert.deepEqual(out.map(f => `${f.rule} ${f.title}`), []);
});

test('FAQ – rechtsinfo-abweichend: Werte gegen ctx.soll (ein Befund je Fakt, alle Fundstellen)', () => {
  const abw = [['Wie lange dauert es?', 'Die Bearbeitung dauert 15–45 Minuten.'], ['Wann kommen die Schilder?', 'Neue Kennzeichenschilder kommen per Post in 2–5 Werktagen.']];
  const out = mf(Q([rec('/', seite({ fragen: GUT })), rec('/a/', seite({ fragen: abw })), rec('/b/', seite({ main: '<p>Unsere Servicezeiten: Mo–Fr 9–17 Uhr. Das gesetzliche Widerrufsrecht beträgt dreißig Tage.</p>' })), rec('/widerruf/', WIDERRUF)]));
  const r = nach(out, 'rechtsinfo-abweichend'); const by = Object.fromEntries(r.map(f => [f.key, f]));
  assert.deepEqual(Object.keys(by).sort(), ['Bearbeitungsdauer', 'Servicezeiten', 'Versand neuer Kennzeichen', 'Widerrufsfrist']);
  assert.equal(by.Bearbeitungsdauer.current, '15–45 Minuten'); assert.equal(by.Bearbeitungsdauer.proposed, '10–30 Minuten'); assert.equal(by.Bearbeitungsdauer.url, base + '/');
  assert.equal(by.Servicezeiten.current, 'Mo–Fr 9:00–17:00 Uhr'); assert.equal(by['Versand neuer Kennzeichen'].current, '2–5 Werktage');
  assert.equal(by.Widerrufsfrist.current, '30 Tage'); assert.deepEqual(by.Widerrufsfrist.examples.map(e => e.url), [base + '/b/']);
  for (const f of r) { assert.equal(f.severity, 'hoch'); assert.equal(f.approval, 'recht'); assert.equal(f.count, 1); }
  assert.deepEqual(aggregate(r, base), r, 'Website-weite Befunde werden nicht gebündelt');
});

test('FAQ – Behördenseiten: nur Aussagen über den eigenen Dienst zählen', () => {
  assert.equal(Q([rec('/zulassungsstelle/musterstadt/', BEHOERDE_FAQ)]).length, 0);
  const eigen = BEHOERDE_FAQ.replace('Die Bearbeitung dauert bei uns meist 10–30 Minuten.', 'Die Bearbeitung dauert bei uns meist 20–60 Minuten. Wir sind Mo–Fr 9:00–17:00 Uhr für Sie da.');
  const out = mf(Q([rec('/zulassungsstelle/musterstadt/', eigen)]));
  assert.deepEqual(nach(out, 'rechtsinfo-abweichend').map(f => `${f.key}: ${f.current}`).sort(), ['Bearbeitungsdauer: 20–60 Minuten', 'Servicezeiten: Mo–Fr 9:00–17:00 Uhr']);
});

test('FAQ – faq-agb-widerspruch gegen /widerruf/ (ohne zusätzlichen Sollwert-Befund für dieselbe Seite)', () => {
  const out = mf(Q([rec('/', seite({ fragen: [['Wie lange kann ich widerrufen?', 'Die Widerrufsfrist beträgt 7 Tage ab Vertragsschluss, danach ist der Auftrag verbindlich.']] })), rec('/widerruf/', WIDERRUF)]));
  const a = nach(out, 'faq-agb-widerspruch'); assert.equal(a.length, 1);
  assert.equal(a[0].url, base + '/'); assert.equal(a[0].severity, 'hoch'); assert.equal(a[0].approval, 'recht');
  assert.match(a[0].title, /Widerrufsfrist in der FAQ \(7 Tage\) ≠ Widerrufsbelehrung \(14 Tage\)/);
  assert.equal(nach(out, 'rechtsinfo-abweichend').length, 0);
  // ohne Widerrufsseite: Abgleich mit der gesetzlichen Frist
  const ohne = mf(Q([rec('/', seite({ fragen: [['Wie lange kann ich widerrufen?', 'Die Widerrufsfrist beträgt 7 Tage ab Vertragsschluss, danach ist der Auftrag verbindlich.']] }))]));
  assert.deepEqual(ohne.map(f => `${f.rule} ${f.current}`), ['rechtsinfo-abweichend 7 Tage']);
});

test('FAQ – faq-widerspruch: Seiten widersprechen sich (ohne Sollwert bzw. Fakten ohne Konfiguration)', () => {
  const a = [['Was ist die eVB?', 'Die eVB-Nummer ist der 7-stellige Nachweis Ihrer Versicherung für die Zulassung.'], ['Dauer?', 'Die Bearbeitung dauert 10–30 Minuten.']];
  const b = [['eVB?', 'Die eVB ist ein 8-stelliger Code der Versicherung, den Sie per E-Mail erhalten.'], ['Dauer?', 'Die Bearbeitung dauert 20–40 Minuten.']];
  const mit = mf(Q([rec('/a/', seite({ fragen: a })), rec('/b/', seite({ fragen: b }))]));
  assert.deepEqual(nach(mit, 'faq-widerspruch').map(f => f.key), ['Länge der eVB-Nummer']);
  assert.deepEqual(nach(mit, 'rechtsinfo-abweichend').map(f => f.key), ['Bearbeitungsdauer']);
  const ohne = mf(Q([rec('/a/', seite({ fragen: a })), rec('/b/', seite({ fragen: b }))], { soll: null }));
  const w = nach(ohne, 'faq-widerspruch'); assert.deepEqual(w.map(f => f.key).sort(), ['Bearbeitungsdauer', 'Länge der eVB-Nummer']);
  const bd = w.find(f => f.key === 'Bearbeitungsdauer'); assert.equal(bd.count, 2); assert.equal(bd.severity, 'hoch'); assert.match(bd.title, /10–30 Minuten \/ 20–40 Minuten|20–40 Minuten \/ 10–30 Minuten/);
  assert.equal(nach(ohne, 'rechtsinfo-abweichend').length, 0);
});

test('FAQ – sollStellen: Fundstellen der Zeit-Fakten mit Sollwert (für content.js), Behördenseiten nur eigene Sätze', () => {
  const ctx = { cfg, soll: SOLL };
  const text = 'Die Bearbeitung dauert meist 30–60 Minuten. Neue Kennzeichenschilder kommen per Post in 3–5 Werktagen. Servicezeiten Mo–Fr 9–17 Uhr. Die Widerrufsfrist beträgt 7 Tage. Am Schalter: Bearbeitung vor Ort 20–40 Minuten.';
  const stellen = faq.sollStellen(rec('/a/', seite()), text, ctx).map(([a, b]) => text.slice(a, b));
  assert.deepEqual(stellen, ['30–60 Minuten', '3–5 Werktagen'], 'nur die bewertete Zeitspanne, nicht der Vorspann');
  assert.deepEqual(faq.sollStellen(rec('/a/', seite()), text, { cfg, soll: null }), [], 'ohne Sollwert prüft faq.js nur Widersprüche – content.js meldet weiter');
  const b = 'Die Bearbeitung dauert meist 30–60 Minuten. Bei uns dauert die Bearbeitung meist 20–40 Minuten.';
  assert.deepEqual(faq.sollStellen(rec('/zulassungsstelle/musterstadt/', seite()), b, ctx).map(([x, y]) => b.slice(x, y)), ['20–40 Minuten']);
  // weitere Zeitspannen im Vorspann desselben Satzes gehören nicht zur Stelle (sonst prüfte sie keines der beiden Module)
  for (const [satz, stelle, frei] of [['Neue Kennzeichen erhalten Sie nach 45–90 Minuten Prüfung, danach kommen sie per Post in 1–3 Werktagen.', '1–3 Werktagen', '45–90'], ['Unsere Bearbeitung: Sonderfälle 4–9 Werktage, alles andere 10–30 Minuten.', '10–30 Minuten', '4–9']]) {
    const st = faq.sollStellen(rec('/a/', seite()), satz, ctx); assert.deepEqual(st.map(([x, y]) => satz.slice(x, y)), [stelle], satz);
    const i = satz.indexOf(frei); assert.ok(!st.some(([x, y]) => i >= x && i < y), frei + ' liegt außerhalb');
  }
});

test('FAQ – faq-duenn und rechtsinfo-veraltet (neutrale Widerrufsmuster mit Ausnahmen)', () => {
  const out = mf(Q([
    rec('/a/', seite({ fragen: [['Geht das online?', 'Ja, komplett.'], ['Gibt es ein Widerrufsrecht?', 'Nein, bei uns besteht kein Widerrufsrecht für diesen Auftrag.']] })),
    rec('/b/', seite({ main: '<p>Der Widerruf muss schriftlich erfolgen.</p>' })),
    rec('/c/', seite({ main: '<p>Für Unternehmer besteht kein Widerrufsrecht. Den Widerruf erklären Sie formlos, z. B. per E-Mail. Ist die Leistung vollständig erbracht, erlischt das Widerrufsrecht; dann gibt es kein Widerrufsrecht mehr.</p>' })),
  ]));
  const d = nach(out, 'faq-duenn'); assert.equal(d.length, 1); assert.equal(d[0].severity, 'niedrig'); assert.equal(d[0].approval, 'manuell'); assert.match(d[0].title, /\(2 Wörter\)/);
  const v = nach(out, 'rechtsinfo-veraltet').map(f => `${util.pathOf(f.url)} ${f.key}`).sort();
  assert.deepEqual(v, ['/a/ kein-widerrufsrecht', '/b/ widerruf-form']);
  assert.equal(nach(out, 'rechtsinfo-veraltet')[0].approval, 'recht');
});

test('alle erzeugten Regel-IDs stehen in rules (Schema und FAQ)', () => {
  for (const r of alleSchema) assert.ok(schema.rules.includes(r), r);
  for (const r of schema.rules) assert.ok(alleSchema.has(r), `Schema-Regel ${r} ist in den Tests vorgekommen`);
  for (const r of alleFaq) assert.ok(faq.rules.includes(r), r);
  for (const r of faq.rules) assert.ok(alleFaq.has(r), `FAQ-Regel ${r} ist in den Tests vorgekommen`);
});
