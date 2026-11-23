'use strict';
// Tägliche Pflichtprüfungen (lib/rules/kfz.js): Preise, Marke, Platzhalter, Impressum, Prüfdatum der Behördendaten.
// Stil B: ohne HTTP, Datensätze über html.parse; Sollwerte aus Testdateien in einem eigenen Temp-Ordner; festes „heute“.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const html = require('../lib/html');
const util = require('../lib/util');
const soll = require('../lib/soll');
const kfz = require('../lib/rules/kfz');
const { fingerprint } = require('../lib/issues');
const { aggregate } = require('../lib/aggregate');

const base = 'https://kfz.example';
const cfg = {
  base, entwurfSeiten: ['/servicebedingungen/'],
  company: { name: 'Muster Dienst UG (haftungsbeschränkt)', brand: 'KFZ-Zulassungsprofis', street: 'Beispielweg 7', zip: '10115', city: 'Berlin', phone: '+49 170 1234567', email: 'info@kfz.example', register: 'HRB 123456 B', responsible: 'Erika Beispiel' },
  altmarke: { name: 'DeutscheZulassung', domain: 'deutschezulassung.de', muster: /DeutscheZulassung|deutschezulassung\.de/, mailMuster: /[A-Za-z0-9._%+-]+@deutschezulassung\.de/i },
};
const PREISE = {
  stand: '2026-11-20', aktion: { name: 'Gründerrabatt', gueltigBis: '2026-12-31', leistungen: ['neuzulassung', 'ummeldung', 'halterwechsel', 'wiederzulassung'], regulaererPreis: 128 },
  leistungen: { neuzulassung: { preis: 110 }, ummeldung: { preis: 110 }, halterwechsel: { preis: 110 }, wiederzulassung: { preis: 110 }, abmeldung: { preis: 34 }, adressaenderung: { preis: 64 } },
  zusatzleistungen: { kennzeichenschilder: { preis: 29 }, wunschkennzeichen: { preis: 12 } },
  amtlicheGebuehren: { onlineZulassung: [12.8, 23.72], schalterZulassung: [27.6, 41.6] },
};
const BETRIEB = { stand: '2026-11-11', zeiten: { bearbeitung: { neuzulassung: { minuten: [10, 30] } }, versand: { kennzeichen: { werktage: [1, 3] } } }, abwicklung: { servicezeiten: { wert: 'Mo–Fr 8:00–18:00 Uhr' } } };
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-kfz-'));
fs.mkdirSync(path.join(REPO, 'config'));
fs.writeFileSync(path.join(REPO, 'config', 'preise.json'), JSON.stringify(PREISE));
fs.writeFileSync(path.join(REPO, 'config', 'betrieb.json'), JSON.stringify(BETRIEB));
const sollAm = heute => soll.load({ repoRoot: REPO }, heute);

// ─── Testseiten ──────────────────────────────────────────────────────────────
const MENUE = '<a href="/leistungen/neuzulassung/">Neuzulassung 110,00 €</a><a href="/leistungen/abmeldung/">Abmeldung 34,00 €</a><a href="/leistungen/ummeldung/">Ummeldung 110,00 €</a>';
const FUSS = '<p>Privater Zulassungsdienst, keine Behörde.</p><p>© 2026 KFZ-Zulassungsprofis</p>';
const seite = ({ title = 'Seite | KFZ-Zulassungsprofis', desc = 'Kfz-Zulassung online beauftragen, ohne Termin bei der Behörde.', kopf = MENUE, main = '<p>Inhalt der Seite.</p>', fuss = FUSS, ld = [], robots = '', h1 = 'Überschrift' } = {}) =>
  `<!DOCTYPE html><html lang="de"><head><title>${title}</title><meta name="description" content="${desc}">${robots ? `<meta name="robots" content="${robots}">` : ''}${ld.map(x => `<script type="application/ld+json">${JSON.stringify(x)}</script>`).join('')}</head><body><header><nav>${kopf}</nav></header><main><h1>${h1}</h1>${main}</main><footer>${fuss}</footer></body></html>`;
function rec(p, h, extra = {}) {
  const url = base + p; const r = { url, path: p, typ: util.pageType(p), status: 200, final: url, chain: [], headers: {}, page: html.parse(h, url), inSitemap: true, inlinks: 3, ...extra };
  if (extra.noindex === undefined) r.noindex = util.isNoindex(r);
  if (extra.indexable === undefined) r.indexable = !r.noindex;
  return r;
}
const crawlAus = (...recs) => ({ base, pages: new Map(recs.map(r => [r.url, r])) });
const lauf = (recs, heute = '2026-11-22', o = {}) => kfz.run({ crawl: crawlAus(...recs), cfg: o.cfg || cfg, soll: o.soll !== undefined ? o.soll : sollAm(heute), heute, prev: null, hostChecks: [] });
const nach = (out, rule) => out.filter(f => f.rule === rule);
const alleRegeln = new Set();
const merke = out => { for (const f of out) alleRegeln.add(f.rule); return out; };

// Behördenseite im Aufbau der echten Seiten: Behördendaten in eigenen Abschnitten, Zitate in der FAQ
const BEHOERDE = seite({ title: 'Zulassungsstelle Musterstadt: Adresse | KFZ-Zulassungsprofis', h1: 'Zulassungsstelle Musterstadt', main: `
  <p>Alle Angaben zur Zulassungsstelle Musterstadt. Angaben geprüft am 3. November 2026.</p>
  <h2>Öffnungs- und Servicezeiten laut Behörde</h2><p>Mo–Fr 7:30–12:00 Uhr. Gebühr für die Zulassung am Schalter: 32,60 €, statt 34,90 € im Vorjahr. Bearbeitung vor Ort 15–20 Minuten.</p>
  <h2>Gut zu wissen</h2><p>Kontakt: kfz-zulassung@musterstadt.example. Wunschkennzeichen kosten bei der Behörde 12,80 €.</p>
  <h2>Zulassungsvorgänge über KFZ-Zulassungsprofis</h2><p>Neuzulassung, Ummeldung und Wiederzulassung kosten 110,00 € inklusive amtlicher Gebühren und Versand, die Abmeldung 34,00 €. Kennzeichenschilder liefern wir für 29,00 € pro Paar.</p>
  <h2>Häufige Fragen zur Zulassungsstelle Musterstadt</h2><p>Brauche ich einen Termin? Die Behörde gibt dazu an: „Termine kosten 34,90 € Bearbeitungsgebühr, Zahlung bar oder per Karte.“ Über KFZ-Zulassungsprofis brauchen Sie keinen Termin.</p>`,
  ld: [{ '@context': 'https://schema.org', '@type': 'WebPage', url: base + '/zulassungsstelle/musterstadt/', dateModified: '2026-11-03', about: { '@type': 'GovernmentOffice', name: 'Stadt Musterstadt', url: 'https://musterstadt.example/kfz', description: 'Gebühr 129,00 € für Sonderfälle' } }] });
const IMPRESSUM = seite({ robots: 'noindex', title: 'Impressum | KFZ-Zulassungsprofis', h1: 'Impressum', main: `<p>Angaben gemäß § 5 DDG</p><p>Muster Dienst UG (haftungsbeschränkt), Beispielweg 7, 10115 Berlin</p><p>Geschäftsführer: Erika Beispiel</p><p>Registergericht: Amtsgericht Charlottenburg, HRB 123456 B</p><p>E-Mail: info@kfz.example, Telefon: 0170 / 123 45 67</p><p>KFZ-Zulassungsprofis ist ein privater Zulassungsdienst und keine Behörde.</p>` });
const SAUBER = () => [
  rec('/', seite({ main: '<p>Gründerrabatt: Neuzulassung, Ummeldung, Halterwechsel und Wiederzulassung bis 31.12.2026 für 110,00 €. Alle Preise inkl. MwSt. Abmeldung 34,00 €.</p><p>Wunschkennzeichen-Service im Rahmen Ihrer Zulassung – für 12,00 € zusätzlich. Die amtliche Gebühr (12,80 €) ist enthalten.</p><p>Am Schalter zahlen Sie ca. 27,60 € – 41,60 €.</p>' })),
  rec('/leistungen/neuzulassung/', seite({ desc: 'Neuzulassung für 110,00 € inkl. Gebühren.', main: '<p>Die Neuzulassung kostet bei uns 110,00 € – amtliche Gebühren sind enthalten. Kennzeichenschilder: 29,00 € pro Paar.</p><p>Mit der deutschen Zulassungsbescheinigung Teil I dürfen Sie fahren. Das Muster-Widerrufsformular steht bereit.</p>', ld: [{ '@context': 'https://schema.org', '@type': 'Service', name: 'Neuzulassung', serviceType: 'Neuzulassung', offers: { '@type': 'Offer', price: '110.00', priceCurrency: 'EUR' } }] })),
  rec('/leistungen/abmeldung/', seite({ ld: [{ '@type': 'Service', name: 'Abmeldung', offers: { '@type': 'Offer', price: '34.00', priceCurrency: 'EUR' } }] })),
  rec('/rechner/behoerdengang/', seite({ main: '<p>Selbst erledigt: 129,00 € Zeitkosten plus Gebühr. Über uns: 110,00 €.</p>', ld: [{ '@type': 'WebApplication', name: 'Rechner', offers: { '@type': 'Offer', price: 0 } }] })),
  rec('/zulassungsstelle/musterstadt/', BEHOERDE),
  rec('/impressum/', IMPRESSUM),
  rec('/servicebedingungen/', seite({ robots: 'noindex, follow', main: '<p>Entwurf der Servicebedingungen.</p>' })),
  rec('/kennzeichen/dz/', seite({ robots: 'noindex, follow', main: '<p>DZ-Kennzeichen: Delitzsch. Flyer: <a href="https://example.org/entwurf-flyer-final.pdf">https://example.org/entwurf-flyer-final.pdf</a></p>' })),
  rec('/404/', seite({ robots: 'noindex', main: '<p>undefined – Seite nicht gefunden</p>' })),
];

test('Schnittstelle: run, rules (alle IDs), gruppe, labels, geprueft', () => {
  assert.equal(typeof kfz.run, 'function'); assert.equal(kfz.gruppe, 'Preise, Marke & Pflichtangaben');
  assert.deepEqual(kfz.rules.slice().sort(), ['aktion-laeuft-aus', 'aktionspreis-abgelaufen', 'alte-mailadresse', 'altmarke-sichtbar', 'behoerdendaten-pruefdatum', 'entwicklerhinweis', 'impressum-pflichtangabe', 'platzhalter-sichtbar', 'preis-abweichend', 'preis-alt', 'preis-gebuehren-widerspruch', 'render-fehler', 'soll-nicht-lesbar', 'streichpreis']);
  for (const r of kfz.rules) assert.ok(kfz.labels[r], `Kurztext für ${r}`);
  assert.deepEqual(kfz.geprueft({ soll: sollAm('2026-11-22') }), kfz.rules);
  const ohne = kfz.geprueft({ soll: null });
  for (const r of ['preis-alt', 'preis-abweichend', 'aktionspreis-abgelaufen', 'aktion-laeuft-aus']) assert.ok(!ohne.includes(r), r);
  assert.ok(ohne.includes('altmarke-sichtbar') && ohne.includes('soll-nicht-lesbar'));
});

test('saubere Website im echten Aufbau: kein Befund (Behördendaten, Rechner, Zusatzleistung, Spannen, Entwurfsseite, 404)', () => {
  const out = merke(lauf(SAUBER()));
  assert.deepEqual(out.map(f => `${f.rule} ${f.url || f.file} ${f.detail || ''}`), []);
});

test('preis-alt: Altpreis und regulärer Preis während der Aktion – auch auf noindex-Seiten, Fundstelle im Detail', () => {
  const out = merke(lauf([
    rec('/', seite({ main: '<p>Ummeldung für 129,00 € erledigen.</p>' })),
    rec('/kennzeichen/b/', seite({ robots: 'noindex, follow', kopf: MENUE.replace('Neuzulassung 110,00 €', 'Neuzulassung 128,00 €') })),
    rec('/kennzeichen/m/', seite({ robots: 'noindex, follow', desc: 'Zulassung 128,00 € inkl. Gebühren.' })),
    rec('/preise/', seite({ main: '<p>Kennzeichen ab 28,90 € und 1.129,00 € Umsatz; 129 Kunden.</p>', ld: [{ '@type': 'Offer', price: '34.90', priceCurrency: 'EUR' }] })),
  ]));
  const alt = nach(out, 'preis-alt').sort((a, b) => (a.key < b.key ? -1 : 1));
  assert.deepEqual(alt.map(f => f.key), ['alt:128,00', 'alt:129,00', 'alt:28,90', 'alt:34,90']);
  for (const f of alt) { assert.equal(f.severity, 'kritisch'); assert.equal(f.approval, 'preis'); assert.equal(f.file, 'config/preise.json'); assert.equal(f.url, undefined); }
  const a128 = alt.find(f => f.key === 'alt:128,00');
  assert.equal(a128.count, 2); assert.equal(a128.proposed, '110,00 €'); assert.match(a128.detail, /Während der Aktion „Gründerrabatt“ \(bis 31\.12\.2026\) gilt 110,00 €/);
  assert.deepEqual(a128.examples.map(e => e.url), [base + '/kennzeichen/b/', base + '/kennzeichen/m/']);
  assert.match(a128.examples[1].detail, /^Meta-Description: „Zulassung 128,00 €/);
  assert.match(alt.find(f => f.key === 'alt:34,90').detail, /Offer\.price = "34\.90"/);
  // Schlüssel ohne Messwerte/Zähler: gleicher Fingerprint bei anderer Seitenzahl
  const nurEine = nach(lauf([rec('/kennzeichen/b/', seite({ kopf: MENUE.replace('110,00', '128,00') }))]), 'preis-alt')[0];
  assert.equal(fingerprint(nurEine), fingerprint(a128));
  // nach Ablauf der Aktion ist 128,00 € der gültige Preis
  assert.equal(nach(lauf([rec('/kennzeichen/b/', seite({ kopf: MENUE.replace('110,00', '128,00') }))], '2027-01-02'), 'preis-alt').length, 0);
});

test('preis-abweichend: Leistung im Menü/Description, Offer je Leistung, unbekannter Eigenpreis – Ausnahmen bleiben still', () => {
  const out = merke(lauf([
    rec('/a/', seite({ kopf: MENUE.replace('Abmeldung 34,00 €', 'Abmeldung 39,00 €') })),
    rec('/b/', seite({ desc: 'Zulassung 99,00 € inkl. Gebühren – ohne Termin.' })),
    rec('/c/', seite({ ld: [{ '@type': 'Service', name: 'Abmeldung', offers: { '@type': 'Offer', price: '110.00', priceCurrency: 'EUR' } }] })),
    rec('/d/', seite({ main: '<p>Bei uns zahlen Sie 77,00 € für alles.</p>' })),
    // Ausnahmen: Spannen/ca., amtliche Gebühren, Wunschkennzeichen-Zusatz, Behördengebühr im Satz, Rechner
    rec('/e/', seite({ main: '<p>Die Zulassung kostet bei der Behörde ca. 30,00 € – 40,00 €. Zulassung am Schalter für 41,60 €. Wunschkennzeichen für Ihre Zulassung: 12,00 € zusätzlich.</p>' })),
  ]));
  const abw = nach(out, 'preis-abweichend');
  const by = Object.fromEntries(abw.map(f => [f.key, f]));
  assert.deepEqual(Object.keys(by).sort(), ['eigenpreis', 'leistung:abmeldung', 'leistung:neuzulassung']);
  assert.equal(by['leistung:abmeldung'].count, 2); assert.equal(by['leistung:abmeldung'].proposed, '34,00 €');
  assert.match(by['leistung:abmeldung'].title, /Preis für Abmeldung weicht von der Preisliste ab: (39|110),00 € statt 34,00 €/);
  assert.deepEqual(by['leistung:abmeldung'].examples.map(e => e.url), [base + '/a/', base + '/c/']);
  assert.match(by['leistung:neuzulassung'].examples[0].detail, /Meta-Description/);
  assert.equal(by.eigenpreis.examples[0].url, base + '/d/');
  for (const f of abw) { assert.equal(f.severity, 'hoch'); assert.equal(f.approval, 'preis'); }
});

test('Behördenseite: Gebühren, Zeiten, Zitate und GovernmentOffice sind keine Eigenpreise; eigener Abschnitt wird geprüft', () => {
  assert.equal(lauf([rec('/zulassungsstelle/musterstadt/', BEHOERDE)]).length, 0);
  const falsch = BEHOERDE.replace('kosten 110,00 € inklusive', 'kosten 129,00 € inklusive');
  const out = merke(lauf([rec('/zulassungsstelle/musterstadt/', falsch)]));
  assert.deepEqual(out.map(f => f.rule), ['preis-alt']);
  assert.match(out[0].examples[0].detail, /Seitentext: „.*Wiederzulassung kosten 129,00 €/);
  // eigenText: Einleitung + eigene Abschnitte, ohne Behördenabschnitte und Zitate
  const e = kfz.eigenText(rec('/zulassungsstelle/musterstadt/', BEHOERDE), cfg);
  assert.match(e, /Zulassungsvorgänge über KFZ-Zulassungsprofis/); assert.match(e, /Über KFZ-Zulassungsprofis brauchen Sie keinen Termin/);
  assert.doesNotMatch(e, /32,60|7:30|15–20 Minuten|Bearbeitungsgebühr/);
});

test('aktionspreis-abgelaufen: ab dem Tag nach gueltigBis (Text, Hinweis „bis …“, Offer); am letzten Tag noch nicht', () => {
  const seiten = () => [rec('/', seite({ main: '<p>Gründerrabatt bis 31.12.2026: Neuzulassung 110,00 €.</p>' })), rec('/leistungen/ummeldung/', seite({ kopf: '<a href="/x/">Startseite</a>', ld: [{ '@type': 'Service', name: 'Ummeldung', offers: { '@type': 'Offer', price: '110.00', priceCurrency: 'EUR' } }] }))];
  assert.equal(nach(lauf(seiten(), '2026-12-31'), 'aktionspreis-abgelaufen').length, 0);
  const out = merke(lauf(seiten(), '2027-01-02'));
  const a = nach(out, 'aktionspreis-abgelaufen');
  assert.equal(a.length, 1); assert.equal(a[0].severity, 'kritisch'); assert.equal(a[0].approval, 'preis'); assert.equal(a[0].count, 2); assert.equal(a[0].key, 'aktion');
  assert.match(a[0].title, /Aktion „Gründerrabatt“ ist seit 31\.12\.2026 abgelaufen/); assert.equal(a[0].proposed, '128,00 €');
  assert.match(a[0].detail, /Seit dem 01\.01\.2027 gilt wieder der reguläre Preis von 128,00 €/);
  assert.match(a[0].examples[1].detail, /Offer\.price = "110\.00"/);
  // der abgelaufene Aktionspreis ist kein „abweichender“ Preis zusätzlich
  assert.equal(nach(out, 'preis-abweichend').length, 0);
  assert.equal(nach(out, 'aktion-laeuft-aus').length, 0);
});

test('aktion-laeuft-aus: ab 14 Tagen vor Ende mittel, ab 3 Tagen hoch, nach Ablauf nicht mehr', () => {
  const s = [rec('/', seite())];
  const am = heute => nach(lauf(s, heute), 'aktion-laeuft-aus');
  assert.equal(am('2026-12-16').length, 0);
  const m = am('2026-12-17'); assert.equal(m.length, 1); assert.equal(m[0].severity, 'mittel'); assert.match(m[0].title, /endet am 31\.12\.2026 \(in 14 Tagen\)/);
  assert.equal(am('2026-12-27')[0].severity, 'mittel');
  assert.equal(am('2026-12-28')[0].severity, 'hoch');
  assert.match(am('2026-12-30')[0].title, /\(morgen\)/);
  const h = am('2026-12-31'); assert.equal(h[0].severity, 'hoch'); assert.match(h[0].title, /\(heute\)/);
  assert.equal(h[0].file, 'config/preise.json'); assert.equal(h[0].key, 'aktion'); assert.equal(h[0].proposed, '128,00 €');
  assert.equal(fingerprint(m[0]), fingerprint(h[0]), 'gleicher Befund über den ganzen Vorlauf');
  merke(h);
  assert.equal(am('2027-01-01').length, 0);
});

test('aktion-laeuft-aus: bleibt offen, solange der abgelaufene Aktionspreis sichtbar ist; schließt mit der korrigierten Website', () => {
  const { IssueStore } = require('../lib/issues');
  const store = new IssueStore(fs.mkdtempSync(path.join(os.tmpdir(), 'seo-kfz-issues-')));
  const mitAktion = () => [rec('/', seite({ main: '<p>Neuzulassung 110,00 €.</p>' }))];
  const korrigiert = () => [rec('/', seite({ kopf: '<a href="/leistungen/neuzulassung/">Neuzulassung 128,00 €</a>', main: '<p>Neuzulassung 128,00 €.</p>' }))];
  const tag = (recs, heute) => { const ctx = { crawl: crawlAus(...recs), cfg, soll: sollAm(heute), heute, prev: null, hostChecks: [] }; const out = merke(kfz.run(ctx)); store.apply(out, { runId: heute, kind: 'daily', scope: kfz.geprueft(ctx) }); return ctx; };
  const offen = rule => store.all().filter(i => i.rule === rule && i.status === 'offen').length;
  tag(mitAktion(), '2026-12-31');
  assert.equal(offen('aktion-laeuft-aus'), 1);
  // 01.01.: Aktion abgelaufen, Website zeigt noch 110,00 € → Vorwarnung nicht „behoben“, dazu der kritische Punkt
  const ctx = tag(mitAktion(), '2027-01-01');
  assert.ok(!kfz.geprueft(ctx).includes('aktion-laeuft-aus'));
  assert.equal(offen('aktion-laeuft-aus'), 1, 'nicht als Erfolg melden, solange der Aktionspreis sichtbar ist');
  assert.equal(offen('aktionspreis-abgelaufen'), 1);
  // Website auf den regulären Preis umgestellt → beide Punkte schließen gemeinsam
  const ok = tag(korrigiert(), '2027-01-02');
  assert.ok(kfz.geprueft(ok).includes('aktion-laeuft-aus'));
  assert.equal(offen('aktion-laeuft-aus'), 0); assert.equal(offen('aktionspreis-abgelaufen'), 0);
});

test('Aktionsende: abgelaufener Aktionspreis zählt nicht zusätzlich als Altpreis; zurückgestellt, aber nicht veröffentlicht: ein Befund', () => {
  // Sollwerte mit dem früheren Aktionspreis in der Altpreis-Liste (soll.js nimmt ihn heraus, solange er gilt)
  const mitAktionspreis = s => { if (!s.preise.erlaubt.has('110,00') && !s.preise.alt.includes('110,00')) s.preise.alt.push('110,00'); return s; };
  const seiten = () => [
    rec('/', seite({ main: '<p>Neuzulassung 110,00 €.</p>' })),
    rec('/leistungen/halterwechsel/', seite({ main: '<p>Der Halterwechsel kostet bei uns 110,00 €.</p>', ld: [{ '@type': 'Service', name: 'Halterwechsel', offers: { '@type': 'Offer', price: '110.00', priceCurrency: 'EUR' } }] })),
    rec('/preise/', seite({ main: '<p>Festpreis 110,00 € inklusive Gebühren.</p>' })),
  ];
  // Aktion abgelaufen, Konfiguration noch nicht zurückgestellt: nur aktionspreis-abgelaufen (nicht zusätzlich preis-alt)
  const abgelaufen = lauf(seiten(), '2027-01-02', { soll: mitAktionspreis(sollAm('2027-01-02')) });
  assert.deepEqual(abgelaufen.map(f => `${f.rule} ${f.severity} ${f.count}`), ['aktionspreis-abgelaufen kritisch 3']);
  // Konfiguration zurückgestellt (128 €, Block „aktion“ entfernt), Website noch nicht neu veröffentlicht: ein kritischer Punkt statt sechs hoher
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-kfz-reset-')); fs.mkdirSync(path.join(repo, 'config'));
  const { aktion, ...ohneAktion } = PREISE; assert.ok(aktion);
  const zurueck = { ...ohneAktion, leistungen: { ...PREISE.leistungen, neuzulassung: { preis: 128 }, ummeldung: { preis: 128 }, halterwechsel: { preis: 128 }, wiederzulassung: { preis: 128 } } };
  fs.writeFileSync(path.join(repo, 'config', 'preise.json'), JSON.stringify(zurueck)); fs.writeFileSync(path.join(repo, 'config', 'betrieb.json'), JSON.stringify(BETRIEB));
  const out = merke(lauf(seiten(), '2027-01-02', { soll: mitAktionspreis(soll.load({ repoRoot: repo }, '2027-01-02')) }));
  assert.deepEqual(out.map(f => `${f.rule} ${f.key} ${f.severity} ${f.count}`), ['preis-alt alt:110,00 kritisch 3']);
});

test('streichpreis und preis-gebuehren-widerspruch: Eigenaussagen ja, amtliche Vergleiche/Kopf/Fuß nein', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: '<p>Neuzulassung jetzt 110,00 € statt 128,00 €.</p>' })),
    rec('/b/', seite({ main: '<p>Sichern Sie sich 20 % Rabatt auf die Ummeldung.</p>' })),
    rec('/c/', seite({ main: '<p>Ummeldung 110,00 € zzgl. amtlicher Gebühren.</p>' })),
    rec('/d/', seite({ main: '<p>Am Schalter zahlen Sie die amtliche Gebühr statt 31,20 € nur online 12,80 €. Preise inkl. amtlicher Gebühren.</p>', fuss: FUSS + '<p>Ummeldung 129,00 € zuzüglich der amtlichen Gebühr, statt 128,00 €</p>' })),
  ]));
  assert.deepEqual(nach(out, 'streichpreis').map(f => f.count || 1), [2]);
  assert.deepEqual(nach(out, 'streichpreis')[0].examples.map(e => e.url), [base + '/a/', base + '/b/']);
  const g = nach(out, 'preis-gebuehren-widerspruch'); assert.equal(g.length, 1); assert.deepEqual(g[0].examples.map(e => e.url), [base + '/c/']); assert.equal(g[0].severity, 'hoch');
  // Fuß der Seite /d/ zählt für die Preisregeln (Altpreis), nicht für Streichpreise
  assert.deepEqual(nach(out, 'preis-alt').map(f => f.examples.map(e => e.url)), [[base + '/d/']]);
});

test('altmarke-sichtbar und alte-mailadresse: Text, Links, Meta, JSON-LD; nicht „deutsche Zulassung…“ und keine Behördenadresse', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: '<p>Willkommen bei DeutscheZulassung.</p>' })),
    rec('/b/', seite({ main: '<p><a href="https://deutschezulassung.de/preise/">Preise</a></p>' })),
    rec('/c/', seite({ main: '<p>Schreiben Sie an <a href="mailto:info@deutschezulassung.de">info@deutschezulassung.de</a>.</p>' })),
    rec('/d/', seite({ ld: [{ '@type': 'Organization', name: 'KFZ-Zulassungsprofis', url: 'https://deutschezulassung.de' }] })),
    rec('/e/', seite({ main: '<p>Die deutsche Zulassung des Fahrzeugs, Deutsche Zulassungsbescheinigung Teil I, Kontakt: kfz-zulassung@cottbus.example.</p>' })),
  ]));
  const m = nach(out, 'altmarke-sichtbar'); assert.equal(m.length, 1); assert.deepEqual(m[0].examples.map(e => e.url), [base + '/a/', base + '/b/', base + '/d/']);
  assert.equal(m[0].severity, 'hoch'); assert.equal(m[0].proposed, 'KFZ-Zulassungsprofis');
  const mail = nach(out, 'alte-mailadresse'); assert.equal(mail.length, 1); assert.deepEqual(mail[0].examples.map(e => e.url), [base + '/c/']); assert.equal(mail[0].current, 'info@deutschezulassung.de');
});

test('altmarke-sichtbar: früherer Domainname in Sitemap und robots.txt', () => {
  const c = crawlAus(rec('/', seite()));
  const ohne = kfz.run({ crawl: { ...c, sitemap: { entries: new Map([[base + '/', {}]]), files: [{ url: base + '/sitemap.xml' }] }, robots: { sitemaps: [base + '/sitemap.xml'] } }, cfg, soll: sollAm('2026-11-22'), heute: '2026-11-22' });
  assert.equal(nach(ohne, 'altmarke-sichtbar').length, 0);
  const mit = merke(kfz.run({ crawl: { ...c, sitemap: { entries: new Map([[base + '/', {}], ['https://deutschezulassung.de/preise/', {}]]), files: [] }, robots: { sitemaps: ['https://deutschezulassung.de/sitemap.xml'] } }, cfg, soll: sollAm('2026-11-22'), heute: '2026-11-22' }));
  const f = nach(mit, 'altmarke-sichtbar'); assert.equal(f.length, 1);
  assert.equal(f[0].key, 'sitemap'); assert.equal(f[0].file, 'app/sitemap.ts'); assert.equal(f[0].count, 2); assert.match(f[0].title, /der Sitemap und der robots\.txt/);
});

test('platzhalter-sichtbar, render-fehler, entwicklerhinweis: Positiv- und Negativfälle', () => {
  const out = merke(lauf([
    rec('/widerruf/', seite({ robots: 'noindex', main: '<p>[TODO] Text folgt. Ansprechpartner: Max Mustermann.</p>' })),
    rec('/a/', seite({ main: '<p>Bearbeitung in [X] Minuten durch [Firma GmbH].</p>' })),
    rec('/b/', seite({ main: '<p>Ihr Preis: undefined €, Stadt: {{stadt}}.</p>' })),
    rec('/c/', seite({ main: '<p><a href="http://localhost:3000/kontakt/">Kontakt</a> Entwurf: Text noch offen. Siehe config/preise.json.</p>' })),
    // Negativ: Wörter, die nur ähnlich aussehen; Entwurf nur in Adressen; Entwurfsseite; Fehlerseite
    rec('/d/', seite({ main: '<p>Musterformular, Mustervollmacht, nicht definiert, Nanometer, Todo-Liste. <a href="https://example.org/entwurf-flyer-final.pdf">Flyer (PDF)</a> https://example.org/entwurf.pdf</p>' })),
    rec('/servicebedingungen/', seite({ robots: 'noindex', main: '<p>Entwurf der Servicebedingungen.</p>' })),
    rec('/404/', seite({ main: '<p>undefined [TODO]</p>' })),
  ]));
  const p = nach(out, 'platzhalter-sichtbar');
  assert.deepEqual(p.map(f => f.key).sort(), ['alle:luecke', 'alle:mustername', 'alle:todo']);
  assert.deepEqual(p.find(f => f.key === 'alle:todo').examples.map(e => e.url), [base + '/widerruf/']); assert.equal(p[0].severity, 'kritisch');
  assert.deepEqual(nach(out, 'render-fehler').map(f => f.key).sort(), ['alle:undefined', 'alle:vorlage']);
  assert.deepEqual(nach(out, 'entwicklerhinweis').map(f => f.key).sort(), ['alle:entwicklungsadresse', 'alle:entwurf', 'alle:intern']);
  for (const f of out) for (const u of [f.url, ...(f.examples || []).map(e => e.url)]) assert.ok(![base + '/d/', base + '/servicebedingungen/', base + '/404/'].includes(u), `${f.rule} auf ${u}`);
});

test('impressum-pflichtangabe: vollständig (Telefon in anderer Schreibweise) → nichts; fehlende Angaben → kritisch mit Liste', () => {
  assert.equal(nach(lauf([rec('/impressum/', IMPRESSUM)]), 'impressum-pflichtangabe').length, 0);
  const luecken = IMPRESSUM.replace('HRB 123456 B', 'HR folgt').replace('Angaben gemäß § 5 DDG', 'Angaben gemäß § 5 TMG').replace(' und keine Behörde', '').replace('0170 / 123 45 67', '030 999');
  const f = merke(nach(lauf([rec('/impressum/', luecken)]), 'impressum-pflichtangabe'));
  assert.equal(f.length, 1); assert.equal(f[0].severity, 'kritisch'); assert.equal(f[0].approval, 'recht'); assert.equal(f[0].key, 'impressum');
  assert.match(f[0].title, /4 Pflichtangaben fehlen/);
  for (const t of ['Handelsregister „HRB 123456 B“', 'Telefon', '§ 5 DDG', 'keine Behörde']) assert.ok(f[0].detail.includes(t), t);
  assert.ok(!f[0].detail.includes('Straße'));
  assert.deepEqual(kfz.telefonVarianten('+49 170 1234567').sort(), ['+491701234567', '00491701234567', '01701234567', '491701234567']);
  assert.ok(kfz.enthaeltTelefon('Tel. (0170) 123-45-67', '+49 170 1234567')); assert.ok(!kfz.enthaeltTelefon('030 1234567', '+49 170 1234567'));
});

test('Telefon: angehängte Ziffer ist eine andere Nummer (Markup und Impressum); übliche Schreibweisen bleiben gültig', () => {
  const T = '+49 170 1234567';
  for (const s of ['+49 170 1234567', '+491701234567', '0049 170 1234567', '+49 (0) 170 1234567', '+49 (0)170-1234567', '0170 / 123 45 67', '(0170) 1234567',
    'Telefon: 0170 / 123 45 67 – 8 bis 18 Uhr', 'Tel.: +49 170 1234567, E-Mail: info@kfz.example', 'Tel. (0170) 123-45-67']) assert.ok(kfz.enthaeltTelefon(s, T), s);
  for (const s of ['+49 170 12345677', '+49 170 1234567 0', '0170 123456', '+49 30 1234567', 'Tel.: 0170 12345679', 'Telefon: +49 170 12345678 (Mo–Fr)']) assert.ok(!kfz.enthaeltTelefon(s, T), s);
  assert.ok(kfz.enthaeltTelefon('0170 1234567', '+49 (0) 170 1234567'), 'Sollnummer in der Schreibweise mit (0)');
  const f = merke(nach(lauf([rec('/impressum/', IMPRESSUM.replace('0170 / 123 45 67', '0170 / 123 45 678'))]), 'impressum-pflichtangabe'));
  assert.equal(f.length, 1); assert.match(f[0].detail, /Telefon „\+49 170 1234567“/);
});

test('behoerdendaten-pruefdatum: Index-Gate hat gegriffen → eingetretenen Schaden melden statt „0 … verlieren beim nächsten Veröffentlichen“', () => {
  const NOINDEX = { noindex: true, indexable: false };
  const seiten = gate => [rec('/zulassungsstelle/musterstadt/', BEHOERDE, gate ? NOINDEX : {}), rec('/zulassungsstelle/beispiel/', BEHOERDE, NOINDEX)];
  const vorher = nach(lauf(seiten(false), '2027-05-10'), 'behoerdendaten-pruefdatum')[0];
  assert.match(vorher.title, /seit 188 Tagen ungeprüft – Stichtag 05\.05\.2027 erreicht: 1 Behördenseiten verlieren beim nächsten Veröffentlichen den Index/);
  const g = merke(nach(lauf(seiten(true), '2027-05-10'), 'behoerdendaten-pruefdatum'));
  assert.equal(g.length, 1); assert.equal(g[0].severity, 'kritisch');
  assert.match(g[0].title, /seit 188 Tagen ungeprüft – Index-Gate hat gegriffen: keine der 2 Behördenseiten ist mehr indexierbar \(auch Stadt- und Kennzeichenseiten\)/);
  assert.doesNotMatch(`${g[0].title} ${g[0].detail}`, /verlieren beim nächsten Veröffentlichen|Das greift beim ersten Veröffentlichen/);
  assert.match(g[0].detail, /Seit dem Veröffentlichen ab dem 05\.05\.2027 stehen diese Seiten auf noindex.*Derzeit indexierbar: 0 der 2 betroffenen Behördenseiten/);
  assert.equal(fingerprint(g[0]), fingerprint(vorher), 'derselbe Punkt, nur neuer Text');
  // Zwei Prüfdaten: maßgeblich für „gegriffen“ sind die Seiten über dem Höchstalter, nicht die jüngeren (noch indexierbaren)
  const juenger = BEHOERDE.replace('Angaben geprüft am 3. November 2026.', 'Angaben geprüft am 1. Dezember 2026.');
  const zwei = nach(lauf([rec('/zulassungsstelle/musterstadt/', BEHOERDE, NOINDEX), rec('/zulassungsstelle/beispiel/', juenger)], '2027-05-10'), 'behoerdendaten-pruefdatum')[0];
  assert.match(zwei.title, /Index-Gate hat gegriffen: keine der 1 Behördenseiten ist mehr indexierbar/);
  assert.match(zwei.detail, /Derzeit indexierbar: 1 der 2 betroffenen Behördenseiten\. Prüfdaten: 03\.11\.2026 \(1 Seiten\), 01\.12\.2026 \(1 Seiten\)/);
});

test('behoerdendaten-pruefdatum: 149 Tage nichts, 150 mittel, 176 kritisch, 183 Stichtag erreicht', () => {
  const seiten = () => [rec('/zulassungsstelle/musterstadt/', BEHOERDE), rec('/zulassungsstelle/beispiel/', BEHOERDE.replace('Angaben geprüft am 3. November 2026.', ''), { noindex: true, indexable: false })];
  const am = heute => nach(lauf(seiten(), heute), 'behoerdendaten-pruefdatum');
  assert.equal(am('2027-04-01').length, 0, '149 Tage');
  const m = am('2027-04-02'); assert.equal(m.length, 1, '150 Tage'); assert.equal(m[0].severity, 'mittel');
  assert.match(m[0].title, /zuletzt am 03\.11\.2026 geprüft \(vor 150 Tagen\) – ab 05\.05\.2027 verlieren 1 Behördenseiten den Index/);
  assert.equal(m[0].count, 2, 'zweite Seite über dateModified im JSON-LD'); assert.equal(m[0].url, base + '/zulassungsstelle/');
  assert.equal(am('2027-04-27')[0].severity, 'mittel', '175 Tage');
  const k = am('2027-04-28'); assert.equal(k[0].severity, 'kritisch', '176 Tage');
  const s = merke(am('2027-05-05')); assert.equal(s[0].severity, 'kritisch'); assert.match(s[0].title, /seit 183 Tagen ungeprüft – Stichtag 05\.05\.2027 erreicht/);
  assert.equal(fingerprint(m[0]), fingerprint(s[0]), 'ein Befund mit Countdown, stabiler Schlüssel');
  // Index-Gate-Frist aus den Sollwerten (lib/indexGate.ts)
  const kurz = { ...sollAm('2027-01-10'), indexGate: { maxAlterTage: 100, quelle: 'lib/indexGate.ts' } };
  assert.equal(nach(kfz.run({ crawl: crawlAus(...seiten()), cfg, soll: kurz, heute: '2027-01-10' }), 'behoerdendaten-pruefdatum')[0].severity, 'mittel'); // 68 Tage ≥ 100 − 33
});

test('soll-nicht-lesbar: ohne Sollwerte ein Hinweis, Preisprüfungen entfallen, übrige Regeln laufen', () => {
  const out = merke(lauf([rec('/', seite({ main: '<p>Ummeldung 129,00 €. Willkommen bei DeutscheZulassung.</p>' }))], '2026-11-22', { soll: null }));
  const h = nach(out, 'soll-nicht-lesbar'); assert.equal(h.length, 1); assert.equal(h[0].severity, 'info'); assert.equal(h[0].file, 'config/preise.json');
  assert.equal(nach(out, 'preis-alt').length, 0); assert.equal(nach(out, 'altmarke-sichtbar').length, 1);
  assert.equal(nach(lauf([rec('/', seite())]), 'soll-nicht-lesbar').length, 0);
});

test('gleiche Ursache auf vielen Seiten = ein Befund; Bündelung im Autopiloten bleibt stabil', () => {
  const kopf = MENUE + '<span>[TODO]</span>';
  const viele = ['/kennzeichen/a/', '/kennzeichen/b/', '/kennzeichen/c/', '/zulassungsstelle/x/'].map(p => rec(p, seite({ kopf })));
  const out = merke(lauf(viele));
  const p = nach(out, 'platzhalter-sichtbar'); assert.equal(p.length, 1);
  assert.equal(p[0].url, base + '/'); assert.equal(p[0].key, 'alle:todo'); assert.equal(p[0].count, 4); assert.equal(p[0].examples.length, 4);
  assert.match(p[0].title, /– 4 Seiten$/);
  assert.deepEqual(aggregate(out, base), out, 'kfz-Befunde sind schon zusammengefasst');
  const einzeln = nach(lauf([viele[0]]), 'platzhalter-sichtbar')[0];
  // Eine Seite: dieselbe Kennung wie bei mehreren Seiten (kein Wechsel „behoben“ + „neu“, wenn die Zahl schwankt)
  assert.equal(einzeln.url, p[0].url); assert.equal(einzeln.key, p[0].key); assert.equal(einzeln.count, 1);
  assert.deepEqual(einzeln.examples.map(e => e.url), [base + '/kennzeichen/a/']); assert.match(einzeln.title, /\/kennzeichen\/a\/$/);
  assert.deepEqual(aggregate([einzeln], base), [einzeln]);
});

test('Hilfen: satzUm, saetze, datum, ohneZitate', () => {
  const t = 'Die Kosten betragen ca. 20 €, z. B. für Ummeldungen. Am 3.11. geprüft. Neuer Satz!';
  assert.equal(kfz.satzUm(t, t.indexOf('20 €')), 'Die Kosten betragen ca. 20 €, z. B. für Ummeldungen.');
  assert.deepEqual(kfz.saetze(t), ['Die Kosten betragen ca. 20 €, z. B. für Ummeldungen.', 'Am 3.11. geprüft.', 'Neuer Satz!']);
  assert.equal(kfz.datum('3', 'November', '2026'), '2026-11-03'); assert.equal(kfz.datum('31', '2', '2027'), null); assert.equal(kfz.datum('1', '13', '2027'), null);
  const z = kfz.ohneZitate('Die Behörde gibt dazu an: „Nur mit Termin.“ Wir helfen. Er sagte: „Das ist ein sehr langes wörtliches Zitat mit mehr als vierzig Zeichen.“ Ende.');
  assert.doesNotMatch(z, /Nur mit Termin|wörtliches Zitat/); assert.match(z, /Wir helfen\. .*Ende\./);
});

test('alle erzeugten Regel-IDs stehen in rules', () => {
  for (const r of alleRegeln) assert.ok(kfz.rules.includes(r), r);
  for (const r of kfz.rules) assert.ok(alleRegeln.has(r), `Regel ${r} ist in den Tests vorgekommen`);
});
