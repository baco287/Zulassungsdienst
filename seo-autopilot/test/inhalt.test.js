'use strict';
// Inhaltsregeln (lib/rules/content.js): Aussagen, Zeitangaben, Aktualität, Qualität, Verlinkung.
// Stil B: ohne HTTP, Datensätze über html.parse; Sollwerte aus Testdateien in einem eigenen Temp-Ordner; festes „heute“.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const html = require('../lib/html');
const util = require('../lib/util');
const soll = require('../lib/soll');
const content = require('../lib/rules/content');
const { fingerprint } = require('../lib/issues');

const base = 'https://kfz.example';
const cfg = { base, claimPatterns: [], company: { name: 'Muster Dienst UG (haftungsbeschränkt)', brand: 'KFZ-Zulassungsprofis', phone: '+49 170 1234567' } };
const REPO = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-inhalt-'));
fs.mkdirSync(path.join(REPO, 'config'));
fs.writeFileSync(path.join(REPO, 'config', 'preise.json'), JSON.stringify({ stand: '2026-11-20', aktion: { name: 'Gründerrabatt', gueltigBis: '2026-12-31', leistungen: ['neuzulassung'], regulaererPreis: 128 }, leistungen: { neuzulassung: { preis: 110 }, abmeldung: { preis: 34 } }, zusatzleistungen: { kennzeichenschilder: { preis: 29 } } }));
fs.writeFileSync(path.join(REPO, 'config', 'betrieb.json'), JSON.stringify({ zeiten: { bearbeitung: { neuzulassung: { minuten: [10, 30] }, 'ersatz-dokumente': { werktage: [3, 10] }, kurzzeitkennzeichen: { werktage: [1, 2] } }, versand: { kennzeichen: { werktage: [1, 3] } } }, abwicklung: { servicezeiten: { wert: 'Mo–Fr 8:00–18:00 Uhr' } } }));
const sollAm = heute => soll.load({ repoRoot: REPO }, heute);

const HINWEIS = '<p>KFZ-Zulassungsprofis ist ein privater Zulassungsdienst, keine Behörde.</p>';
const FUSS = '<p>Privater Zulassungsdienst, keine Behörde.</p><p>© 2026 KFZ-Zulassungsprofis</p>';
// Fülltext mit vielen verschiedenen Wörtern (damit Wortzählung/Stuffing/Dubletten nicht zufällig anschlagen)
const WORTE = 'Antrag Vollmacht Unterlagen Fahrzeugschein Fahrzeugbrief Versicherung Bestätigung Halter Fahrzeug Kennzeichen Termin Behörde Nachweis Prüfung Ablauf Upload Fotos Ausweis Adresse Wohnort Postleitzahl Bundesland Landkreis Stadt Ummeldung Abmeldung Neuzulassung Wiederzulassung Halterwechsel Ersatzpapiere Sicherheitscode Plakette Siegel Schilder Prägung Versand Zustellung Rechnung Zahlung Überweisung Quittung Beleg Frist Woche Monat Jahr Hinweis Frage Antwort Beispiel Sonderfall Import Export Oldtimer Saisonkennzeichen Kurzzeitkennzeichen Wunschkennzeichen Reservierung Gebühr Kosten Preis Leistung Service Beratung Telefon Chat Nachricht E-Mail Kontakt Team Erfahrung Sorgfalt Kontrolle Qualität Datenschutz Sicherheit Verschlüsselung Speicherung Löschung'.split(' ');
const fuell = (n, salz = 0) => { const out = []; for (let i = 0; i < n; i++) out.push(WORTE[(i * 7 + salz * 13 + Math.floor(i / WORTE.length)) % WORTE.length].toLowerCase() + (i % 11 === 10 ? '.' : '')); return `<p>${out.join(' ')}</p>`; };
const links = n => Array.from({ length: n }, (_, i) => `<a href="/ratgeber/thema-${i}/">Thema ${i}</a>`).join(' ');
const seite = ({ title = 'Kfz-Zulassung online | KFZ-Zulassungsprofis', desc = 'Kfz-Zulassung online beauftragen, ohne Termin.', main = HINWEIS + fuell(400) + links(4), fuss = FUSS, robots = '', h1 = 'Kfz-Zulassung online' } = {}) =>
  `<!DOCTYPE html><html lang="de"><head><title>${title}</title><meta name="description" content="${desc}">${robots ? `<meta name="robots" content="${robots}">` : ''}</head><body><header><nav><a href="/">Start</a></nav></header><main><h1>${h1}</h1>${main}</main><footer>${fuss}</footer></body></html>`;
function rec(p, h, extra = {}) {
  const url = base + p; const page = html.parse(h, url);
  const r = { url, path: p, typ: util.pageType(p), status: 200, final: url, chain: [], headers: {}, page, inSitemap: true, inlinks: 3, ...extra };
  if (extra.noindex === undefined) r.noindex = util.isNoindex(r);
  if (extra.indexable === undefined) r.indexable = !r.noindex;
  if (extra.textShingle === undefined) r.textShingle = crypto.createHash('md5').update(page.text.split(' ').slice(40, 240).join(' ')).digest('hex');
  return r;
}
const crawlAus = (...recs) => ({ base, pages: new Map(recs.map(r => [r.url, r])) });
const lauf = (recs, heute = '2026-11-22', o = {}) => content.run({ crawl: crawlAus(...recs), cfg: o.cfg || cfg, soll: o.soll !== undefined ? o.soll : sollAm(heute), heute, prev: null, hostChecks: [] });
const nach = (out, rule) => out.filter(f => f.rule === rule);
const urls = f => (f.examples ? f.examples.map(e => e.url) : [f.url]);
const alleRegeln = new Set();
const merke = out => { for (const f of out) alleRegeln.add(f.rule); return out; };
const absatz = s => HINWEIS + `<p>${s}</p>` + fuell(350) + links(4);

// Behördenseite im Aufbau der echten Seiten
const BEHOERDE = seite({ title: 'Zulassungsstelle Musterstadt: Adresse | KFZ-Zulassungsprofis', h1: 'Zulassungsstelle Musterstadt', main: `${HINWEIS}<p>Alle Angaben zur Zulassungsstelle Musterstadt.</p>
  <h2>Öffnungs- und Servicezeiten laut Behörde</h2><p>Termine sind oft mehrere Wochen ausgebucht. Die Bearbeitung am Schalter dauert 15–20 Minuten. Das offizielle Portal der Behörde ist erreichbar. Die Behörde ist offizieller Partner des KBA.</p>
  <h2>Zulassungsvorgänge über KFZ-Zulassungsprofis</h2><p>Die Bearbeitung dauert meist 10–30 Minuten; neue Kennzeichen kommen in 1–3 Werktagen.</p>
  <h2>Häufige Fragen zur Zulassungsstelle Musterstadt</h2><p>Die Behörde gibt dazu an: „Wartezeiten von 4–6 Werktagen sind möglich, Termine wochenlang ausgebucht.“ Über KFZ-Zulassungsprofis brauchen Sie keinen Termin.</p>${fuell(300)}${links(4)}` });

test('Schnittstelle: run, rules (alle IDs), gruppe, labels, geprueft, Ausnahmelisten oben im Modul', () => {
  assert.equal(content.gruppe, 'Inhalte');
  for (const r of content.rules) assert.ok(content.labels[r], `Kurztext für ${r}`);
  for (const r of ['info-veraltet', 'ersparnis-ohne-basis', 'preis-ohne-stand', 'preisgarantie-laufzeit', 'preisgarantie-kurz', 'erklaerung-fehlt']) assert.ok(!content.rules.includes(r), `frühere Regel ${r} entfernt`);
  for (const p of ['/kontakt/', '/auftrag/', '/rechner/', '/vorlagen/']) assert.ok(content.THIN_AUSNAHMEN.includes(p), p);
  for (const p of ['/zulassungsstelle/', '/kennzeichen/', '/kfz-zulassung/']) assert.ok(content.STUFFING_AUSNAHMEN.includes(p), p);
  assert.ok(content.geprueft({ soll: sollAm('2026-11-22') }).includes('zeitangabe-abweichend'));
  assert.ok(!content.geprueft({ soll: null }).includes('zeitangabe-abweichend'));
});

test('saubere Seiten mit allen dokumentierten Ausnahmen: kein Befund', () => {
  const out = merke(lauf([
    rec('/', seite({ main: absatz('Wir sind keine offizielle Zulassungsstelle und nicht im Auftrag der Zulassungsbehörde tätig. Die Online-Zulassungsstelle (i-Kfz Stufe 4) der Stadt erreichen Sie über das offizielle Portal der Stadt. Es gibt keine Garantie für feste Zeiten, und nicht jede Zulassung ist sofort erledigt. Nach der Zulassung können Sie sofort losfahren. Mehr als 3 Zulassungen pro Tag sind möglich. Seit 2015 Fahrzeuge mit Sicherheitscode. Ein zertifizierter Demontagebetrieb hilft. Siegel abziehen. Selbst zulassen per i-Kfz ist der günstigste Weg, wenn Sie einen Ausweis haben. Sind Termine bei der Zulassungsstelle oft mehrere Wochen ausgebucht? Die Bearbeitung dauert meist 10–30 Minuten, neue Kennzeichen 1–3 Werktage, Ersatzpapiere 3–10 Werktage. Am Schalter dauert der Behördengang 30–60 Minuten. Die Frist lief bis 31.12.2024 und endete damals. Gründerrabatt bis 31.12.2026 für 110,00 €. Preise (Stand 2026). Standort seit 2019. Die Vorbereitung der Unterlagen ist einfach. Standard-Kennzeichen.') })),
    rec('/zulassungsstelle/musterstadt/', BEHOERDE),
    rec('/kontakt/', seite({ title: 'Kontakt aufnehmen', h1: 'Kontakt', main: HINWEIS + '<p>Schreiben Sie uns.</p>' })),
    rec('/rechner/kfz-steuer/', seite({ title: 'Kfz-Steuer-Rechner 2026', main: HINWEIS + fuell(120) })),
    rec('/ratgeber/kosten-seit-2020/', seite({ title: 'Kosten seit 2020 im Überblick', h1: 'Kosten seit 2020', main: fuell(400, 3) + links(4) })),
  ]));
  assert.deepEqual(out.map(f => `${f.rule} ${f.url} ${f.detail || ''}`), []);
});

test('behoerden-anschein: offizielle Partnerschaft/Behördenrolle (kritisch, recht) – auch in Title und Description', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Wir sind Ihr offizieller Zulassungsservice in Berlin.') })),
    rec('/b/', seite({ main: absatz('Wir arbeiten im Auftrag des KBA.') })),
    rec('/ueber-uns/', seite({ main: absatz('Vom Upload bis zur behördlichen i-Kfz-Schnittstelle.') })),
    rec('/c/', seite({ desc: 'Ihre Online-Zulassungsstelle für ganz Deutschland.' })),
  ]));
  const f = nach(out, 'behoerden-anschein');
  assert.deepEqual(f.flatMap(urls).sort(), [base + '/a/', base + '/b/', base + '/c/', base + '/ueber-uns/']);
  for (const x of f) { assert.equal(x.severity, 'kritisch'); assert.equal(x.approval, 'recht'); }
  assert.match(f.find(x => urls(x).some(u => u.endsWith('/c/'))).examples.find(e => e.url.endsWith('/c/')).detail, /^Meta-Description:/);
});

test('zeit-versprechen: feste Dauer, sofort, taggleich, noch heute, Antwortzeit, Garantie, Express – verneinte Sätze nie', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Ihr Auto ist in 10 Minuten zugelassen.') })),
    rec('/b/', seite({ main: absatz('Die Sofortzulassung für Eilige.') })),
    rec('/c/', seite({ main: absatz('Die Zulassung erfolgt taggleich.') })),
    rec('/d/', seite({ main: absatz('Abmeldung oft noch heute.') })),
    rec('/e/', seite({ main: absatz('Unser Team antwortet meist sofort.') })),
    rec('/f/', seite({ main: absatz('Wir garantieren die Zulassung in 24 Stunden.') })),
    rec('/g/', seite({ main: absatz('Express-Zulassung für Autohäuser.') })),
    rec('/kennzeichen/b/', seite({ robots: 'noindex, follow', main: absatz('Kennzeichen B in wenigen Minuten: Sofortzulassung möglich.') })),
    rec('/h/', seite({ main: absatz('Eine Garantie für feste Zeiten gibt es nicht. Wir können keine Garantie geben. Ohne Garantie, aber zuverlässig.') })),
  ]));
  const by = {}; for (const f of nach(out, 'zeit-versprechen')) by[f.key.replace(/^alle:/, '')] = f;
  assert.deepEqual(Object.keys(by).sort(), ['antwortzeit', 'express', 'garantie', 'minuten', 'noch-heute', 'sofort', 'taggleich']);
  assert.deepEqual(urls(by.sofort).sort(), [base + '/b/', base + '/kennzeichen/b/'], 'auch noindex-Seiten');
  assert.equal(by.express.severity, 'mittel'); assert.equal(by.minuten.severity, 'hoch'); assert.equal(by.garantie.approval, 'recht');
  assert.ok(!nach(out, 'zeit-versprechen').some(f => urls(f).includes(base + '/h/')), 'verneinte Garantie-Sätze');
});

test('unbelegte-zahl: Kundenzahlen, Sterne, Bewertungen, Siegel, Nr. 1, Superlative; Fremdbezug nicht', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Über 5.000 zufriedene Kunden vertrauen uns.') })),
    rec('/b/', seite({ main: absatz('Bewertet mit 4,9 von 5 ★★★★★.') })),
    rec('/c/', seite({ main: absatz('Lesen Sie unsere Kundenbewertungen. Testsieger 2026 und TÜV-geprüft.') })),
    rec('/d/', seite({ main: absatz('Der Marktführer und die Nr. 1 im Netz. Das kommt selten vor.') })),
    rec('/e/', seite({ main: absatz('Der Zulassungsdienst ist der schnellste Weg zum Kennzeichen.') })),
  ]));
  const f = nach(out, 'unbelegte-zahl'); const keys = f.map(x => x.key.replace(/^alle:/, '').split(':')[0]);
  for (const k of ['kundenzahl', 'sterne', 'bewertung', 'siegel', 'spitzenstellung', 'erfolg', 'superlativ']) assert.ok(keys.includes(k), k);
  assert.equal(f.find(x => x.key.replace(/^alle:/, '').startsWith('sterne')).severity, 'kritisch');
  assert.equal(f.find(x => x.key.replace(/^alle:/, '').startsWith('kundenzahl')).severity, 'hoch');
});

test('wartezeit-behauptung: Stadtseiten strenge Liste, sonst Terminlage-Aussagen; Fragen und Behördendaten nicht', () => {
  const out = merke(lauf([
    rec('/kfz-zulassung/musterstadt/', seite({ main: absatz('Termine sind in Musterstadt begehrt.') })),
    rec('/ratgeber/kosten/', seite({ main: absatz('Ein Termin hat oft Wochen Vorlauf.') })),
    rec('/ratgeber/termin/', seite({ main: absatz('Sind Termine bei der Behörde oft mehrere Wochen ausgebucht? Die Behörde entscheidet in zwei Wochen über Widersprüche.') })),
    rec('/zulassungsstelle/musterstadt/', BEHOERDE),
  ]));
  const f = nach(out, 'wartezeit-behauptung'); assert.equal(f.length, 1);
  assert.deepEqual(urls(f[0]).sort(), [base + '/kfz-zulassung/musterstadt/', base + '/ratgeber/kosten/']);
  assert.equal(f[0].severity, 'mittel'); assert.equal(f[0].approval, 'recht');
});

test('zeitangabe-abweichend: Spannen außerhalb von config/betrieb.json; Behördendaten und Schalter-Angaben nicht', () => {
  // Zeitspannen ohne Bezug zu einem FAQ-Fakt (Bearbeitungsdauer, Kennzeichen-Versand prüft faq.js – siehe nächster Test)
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Die Rückmeldung zum Auftrag kommt nach 15–45 Minuten.') })),
    rec('/b/', seite({ main: absatz('Ersatzpapiere liegen nach 2–4 Werktagen vor.') })),
    rec('/zulassungsstelle/musterstadt/', BEHOERDE),
  ]));
  const f = nach(out, 'zeitangabe-abweichend'); assert.deepEqual(f.map(x => x.key).sort(), ['alle:minuten', 'alle:werktage']);
  assert.match(f.find(x => x.key === 'alle:minuten').detail, /Minuten-Spannen: 10–30/);
  assert.equal(f[0].severity, 'hoch');
  assert.equal(nach(lauf([rec('/a/', seite({ main: absatz('Die Rückmeldung zum Auftrag kommt nach 15–45 Minuten.') }))], '2026-11-22', { soll: null }), 'zeitangabe-abweichend').length, 0, 'ohne Sollwerte kein Abgleich');
});

test('zeitangabe-abweichend: eine falsche Bearbeitungs-/Versanddauer ergibt einen Befund (rechtsinfo-abweichend aus faq.js), nicht zwei', () => {
  const faq = require('../lib/rules/faq');
  const ctx = { crawl: crawlAus(
    rec('/faq/', seite({ main: absatz('Die Bearbeitung dauert meist 30–60 Minuten.') })),
    rec('/preise/', seite({ main: absatz('Neue Kennzeichen kommen in der Regel in 3–5 Werktagen per Post.') })),
    // ohne Fakt-Bezug bzw. auf Behördenseiten ohne Bezug zum eigenen Dienst: weiter nur zeitangabe-abweichend
    rec('/ratgeber/x/', seite({ main: absatz('Die Rückmeldung zum Auftrag kommt nach 15–45 Minuten.') })),
    rec('/zulassungsstelle/musterstadt/', BEHOERDE.replace('<p>Alle Angaben zur Zulassungsstelle Musterstadt.</p>', '<p>Die Bearbeitung dauert meist 20–40 Minuten. Alle Angaben zur Zulassungsstelle Musterstadt.</p>')),
  ), cfg, soll: sollAm('2026-11-22'), heute: '2026-11-22', prev: null, hostChecks: [] };
  const z = merke(nach(content.run(ctx), 'zeitangabe-abweichend'));
  const q = nach(faq.run(ctx), 'rechtsinfo-abweichend');
  assert.deepEqual(q.map(f => `${f.key}: ${f.current}`).sort(), ['Bearbeitungsdauer: 30–60 Minuten', 'Versand neuer Kennzeichen: 3–5 Werktage']);
  assert.deepEqual(z.map(f => f.key), ['alle:minuten']);
  assert.deepEqual(z[0].examples.map(e => `${util.pathOf(e.url)} ${e.current}`), ['/ratgeber/x/ 15–45 Minuten', '/zulassungsstelle/musterstadt/ 20–40 Minuten']);
  // ohne faq-Sollwerte (keine Betriebsangaben) meldet keines der beiden Module die Zeitspanne – wie bisher
  assert.equal(nach(content.run({ ...ctx, soll: null }), 'zeitangabe-abweichend').length, 0);
  // eine zweite, nicht als Fakt bewertete Zeitspanne im Vorspann desselben Satzes meldet content.js weiter
  const zwei = { ...ctx, crawl: crawlAus(
    rec('/a/', seite({ main: absatz('Neue Kennzeichen erhalten Sie nach 45–90 Minuten Prüfung, danach kommen sie per Post in 1–3 Werktagen.') })),
    rec('/b/', seite({ main: absatz('Unsere Bearbeitung: Sonderfälle 4–9 Werktage, alles andere 10–30 Minuten.') }))) };
  const z2 = nach(content.run(zwei), 'zeitangabe-abweichend');
  assert.deepEqual(z2.flatMap(f => (f.examples || [f]).map(e => `${util.pathOf(e.url)} ${e.current}`)).sort(), ['/a/ 45–90 Minuten', '/b/ 4–9 Werktage']);
});

test('behoerdenhinweis-fehlt: niedrig, je Familie gebündelt, nur Angebotsseiten; Hinweis nur im Fuß zählt nicht', () => {
  const ohne = fuell(350) + links(4);
  const out = merke(lauf([
    rec('/kennzeichen/a/', seite({ main: ohne })), rec('/kennzeichen/b/', seite({ main: ohne })), rec('/kennzeichen/c/', seite({ main: ohne })),
    rec('/preise/', seite({ main: ohne })),
    rec('/ratgeber/x/', seite({ main: ohne })), // Ratgeber: kein Angebotstext
    rec('/leistungen/ummeldung/', seite({ main: '<p>Wir sind nicht die Zulassungsstelle.</p>' + ohne })),
  ]));
  const f = nach(out, 'behoerdenhinweis-fehlt');
  const fam = f.find(x => x.key === 'familie:/kennzeichen/*/'); assert.equal(fam.count, 3); assert.equal(fam.severity, 'niedrig'); assert.equal(fam.url, base + '/kennzeichen/*/');
  assert.match(fam.detail, /er steht nur im Seitenfuß/);
  const einzeln = f.find(x => x.url === base + '/preise/'); assert.equal(einzeln.key, 'hinweis'); assert.equal(einzeln.buendeln, false);
  assert.equal(f.length, 2);
  // stabiler Schlüssel unabhängig von der Seitenzahl
  const zwei = nach(lauf([rec('/kennzeichen/a/', seite({ main: ohne })), rec('/kennzeichen/b/', seite({ main: ohne }))]), 'behoerdenhinweis-fehlt')[0];
  assert.equal(fingerprint(zwei), fingerprint(fam));
  // auch EINE Seite einer Platzhalter-Familie trägt schon den Familienschlüssel (gleiche ID bei 1 und mehreren Seiten)
  for (const [fp, p] of [['/kennzeichen/*/', '/kennzeichen/a/'], ['/leistungen/*/', '/leistungen/ummeldung/'], ['/zulassungsstelle/*/', '/zulassungsstelle/berlin/']]) {
    const eine = nach(lauf([rec(p, seite({ main: ohne }))]), 'behoerdenhinweis-fehlt'); assert.equal(eine.length, 1, p);
    assert.deepEqual([eine[0].key, eine[0].url, eine[0].count, eine[0].buendeln, eine[0].examples.map(e => e.url)], ['familie:' + fp, base + fp, 1, undefined, [base + p]], p);
    assert.equal(eine[0].title, `1 Seite im Bereich ${fp}: Hinweis „privater Dienst, keine Behörde“ fehlt im Seiteninhalt (${p})`);
    if (fp === '/kennzeichen/*/') assert.equal(fingerprint(eine[0]), fingerprint(fam), '1 Seite ↔ 3 Seiten: dieselbe ID');
  }
  // außerhalb der Platzhalter-Familien bleibt eine einzelne Seite ein Einzelbefund
  const preise = nach(lauf([rec('/preise/', seite({ main: ohne }))]), 'behoerdenhinweis-fehlt')[0]; assert.deepEqual([preise.key, preise.url, preise.buendeln], ['hinweis', base + '/preise/', false]);
});

test('jahreszahl-veraltet: nur Title, H1 und URL; Fließtext und „seit/ab …“ nicht', () => {
  const seiten = () => [
    rec('/rechner/kfz-steuer/', seite({ title: 'Kfz-Steuer-Rechner 2026 | KFZ-Zulassungsprofis', main: HINWEIS + fuell(400) })),
    rec('/ratgeber/was-kostet-es/', seite({ title: 'Was kostet eine Kfz-Zulassung? (2026)', main: fuell(400) + links(4) })),
    rec('/ratgeber/neuerungen-2026/', seite({ title: 'Neuerungen im Überblick', main: fuell(400) + links(4) })),
    rec('/ratgeber/text/', seite({ title: 'Ratgeber Sicherheitscode', main: '<p>Fahrzeuge ab 2015 und Zulassungen 2026 im Text.</p>' + fuell(400) + links(4) })),
  ];
  assert.equal(nach(lauf(seiten(), '2026-11-22'), 'jahreszahl-veraltet').length, 0);
  const f = merke(nach(lauf(seiten(), '2027-01-02'), 'jahreszahl-veraltet'));
  assert.deepEqual(f.map(x => x.url).sort(), [base + '/ratgeber/neuerungen-2026/', base + '/ratgeber/was-kostet-es/', base + '/rechner/kfz-steuer/']);
  assert.equal(f[0].severity, 'mittel'); assert.equal(f[0].proposed, '2027'); assert.equal(f[0].key, 'jahr');
});

test('copyright-jahr und stand-veraltet: Datum gegen „heute“', () => {
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Stand: 1. Oktober 2025. Zuletzt aktualisiert am 01.12.2025.') })),
    rec('/b/', seite({ main: absatz('Preise geprüft am 30.11.2025.') })),
    rec('/zulassungsstelle/musterstadt/', seite({ main: absatz('Angaben geprüft am 3. November 2024.') })),
  ], '2026-11-22'));
  assert.deepEqual(nach(out, 'stand-veraltet').flatMap(urls), [base + '/a/'], '417 Tage alt; 356/357 Tage noch nicht; Behördenseiten über die Prüfdatum-Regel');
  assert.equal(nach(out, 'copyright-jahr').length, 0);
  const neu = merke(nach(lauf([rec('/a/', seite()), rec('/b/', seite())], '2027-01-02'), 'copyright-jahr'));
  assert.equal(neu.length, 1); assert.equal(neu[0].count, 2); assert.equal(neu[0].approval, 'auto'); assert.equal(neu[0].proposed, '© 2027');
});

test('frist-abgelaufen: abgelaufene Fristen (auch Behördenangaben), nicht historisch, Aktionsende nur über kfz.js', () => {
  const seiten = () => [
    rec('/zulassungsstelle/altoetting/', seite({ main: absatz('Annahmezeiten. Bis 30.11.2026 ohne Termin; ab 01.12.2026 nur noch mit Termin.') })),
    rec('/zulassungsstelle/ludwigsburg/', seite({ main: absatz('Die Außenstelle ist bis Jahresende 2026 geschlossen.') })),
    rec('/zulassungsstelle/fuerth/', seite({ main: absatz('Vom 28. bis 30. Dezember 2026 ist sie geschlossen.') })),
    rec('/', seite({ main: absatz('Gründerrabatt: Neuzulassung bis 31.12.2026 für 110,00 €. Die Regelung galt bis 30.06.2026.') })),
  ];
  assert.deepEqual(nach(lauf(seiten(), '2026-11-30'), 'frist-abgelaufen').length, 0);
  assert.deepEqual(nach(lauf(seiten(), '2026-12-01'), 'frist-abgelaufen').map(f => f.url), [base + '/zulassungsstelle/altoetting/']);
  const f = merke(nach(lauf(seiten(), '2027-01-02'), 'frist-abgelaufen'));
  assert.deepEqual(f.map(x => x.url).sort(), [base + '/zulassungsstelle/altoetting/', base + '/zulassungsstelle/fuerth/', base + '/zulassungsstelle/ludwigsburg/']);
  assert.equal(f[0].severity, 'mittel'); assert.equal(f[0].key, 'frist');
  assert.match(f.find(x => x.url.endsWith('/fuerth/')).detail, /Frist 30\.12\.2026/);
  assert.deepEqual(content.fristen('bis Ende Februar 2027 und bis zum 1.3.2027', '2027-03-02').map(x => x.tag), ['2027-02-28', '2027-03-01']);
});

test('thin-content: Funktionsseiten ausgenommen, noindex-Seiten nicht bewertet', () => {
  const out = merke(lauf([
    rec('/ablauf/', seite({ main: HINWEIS + fuell(120) + links(4) })),
    rec('/leistungen/abhol-bringservice/', seite({ main: HINWEIS + fuell(250) + links(4) })),
    rec('/kontakt/', seite({ main: HINWEIS + fuell(40) })), rec('/auftrag/', seite({ main: HINWEIS + fuell(40) })),
    rec('/rechner/', seite({ main: HINWEIS + fuell(40) })), rec('/vorlagen/vollmacht-zulassung/', seite({ main: HINWEIS + fuell(40) })),
    rec('/kennzeichen/x/', seite({ robots: 'noindex, follow', main: HINWEIS + fuell(40) })),
  ]));
  const f = nach(out, 'thin-content');
  assert.deepEqual(f.map(x => `${x.url} ${x.severity}`).sort(), [`${base}/ablauf/ mittel`, `${base}/leistungen/abhol-bringservice/ niedrig`]);
  assert.equal(f[0].key, 'thin', 'Wortzahl nicht im Schlüssel');
});

test('keyword-stuffing: echte Wiederholung ja; Übersichtsseiten, Fach- und Ortswörter nein', () => {
  const stuff = '<p>' + Array.from({ length: 60 }, () => 'günstig').join(' ') + '</p>';
  const ort = '<p>' + Array.from({ length: 60 }, () => 'Musterhausen').join(' ') + '</p>';
  const fach = '<p>' + Array.from({ length: 60 }, () => 'Zulassungsstelle').join(' ') + '</p>';
  const out = merke(lauf([
    rec('/ratgeber/billig/', seite({ main: HINWEIS + stuff + fuell(300) + links(4) })),
    rec('/kfz-zulassung/musterhausen/', seite({ main: HINWEIS + ort + fuell(300) + links(4) })),
    rec('/zulassungsstelle/', seite({ main: HINWEIS + fach + fuell(300) + links(4) })),
    rec('/leistungen/x/', seite({ main: HINWEIS + fach + fuell(300) + links(4) })),
  ]));
  assert.deepEqual(nach(out, 'keyword-stuffing').map(f => `${f.url} ${f.current}`), [`${base}/ratgeber/billig/ günstig`]);
});

test('duplicate-content, kannibalisierung, schwache-verlinkung', () => {
  const gleich = HINWEIS + fuell(400, 5) + links(4);
  const out = merke(lauf([
    rec('/ratgeber/a/', seite({ title: 'Auto ummelden nach Umzug online', h1: 'Auto ummelden nach Umzug', main: gleich })),
    rec('/leistungen/b/', seite({ title: 'Auto ummelden nach Umzug online', h1: 'Auto ummelden nach Umzug', main: gleich })),
    rec('/kennzeichen/aa/', seite({ title: 'AA-Kennzeichen Ostalbkreis Herkunft', h1: 'AA-Kennzeichen Ostalbkreis Herkunft', main: HINWEIS + fuell(400, 6) + links(4) })),
    rec('/kennzeichen/ab/', seite({ title: 'AA-Kennzeichen Ostalbkreis Herkunft', h1: 'AA-Kennzeichen Ostalbkreis Herkunft', main: HINWEIS + fuell(400, 7) + links(4) })),
    rec('/maxx/', seite({ title: 'Maxx Assistent', h1: 'Maxx', main: HINWEIS + fuell(400, 8) + links(4) }), { inlinks: 1 }),
    rec('/faq/', seite({ title: 'Häufige Fragen', h1: 'FAQ', main: HINWEIS + fuell(700, 9) + links(1) })),
  ]));
  const d = nach(out, 'duplicate-content'); assert.equal(d.length, 1); assert.equal(d[0].count, 2); assert.deepEqual(d[0].examples.map(e => e.url), [base + '/leistungen/b/', base + '/ratgeber/a/']);
  const k = nach(out, 'kannibalisierung'); assert.deepEqual(k.map(f => [util.pathOf(f.url), f.key].sort()), [['/leistungen/b/', '/ratgeber/a/']], 'gleiche Familie /kennzeichen/*/ ausgenommen');
  const s = nach(out, 'schwache-verlinkung'); assert.deepEqual(s.map(f => `${f.url} ${f.key}`).sort(), [`${base}/faq/ ausgehend`, `${base}/maxx/ eingehend`]);
});

test('rechtschreibung, text-in-vorbereitung, werbeaussage (eigene Muster aus cfg.claimPatterns)', () => {
  const eigen = { ...cfg, claimPatterns: [{ re: /\bdeutschlandweit führend\b/i, label: 'Führungsanspruch' }] };
  const out = merke(lauf([
    rec('/a/', seite({ main: absatz('Das ist Standart. Bitte das Kenzeichen prüfen. Den Wiederruf erklären.') })),
    rec('/b/', seite({ main: absatz('Weitere Zahlungsarten (z. B. PayPal) sind in Vorbereitung. Wir sind deutschlandweit führend.') })),
  ], '2026-11-22', { cfg: eigen }));
  assert.deepEqual(nach(out, 'rechtschreibung').map(f => f.proposed).sort(), ['Kennzeichen…', 'Standard', 'Widerruf…']);
  const v = nach(out, 'text-in-vorbereitung'); assert.equal(v.length, 1); assert.equal(v[0].severity, 'niedrig');
  const w = nach(out, 'werbeaussage'); assert.equal(w.length, 1); assert.match(w[0].title, /Führungsanspruch/);
});

test('alle erzeugten Regel-IDs stehen in rules', () => {
  for (const r of alleRegeln) assert.ok(content.rules.includes(r), r);
  for (const r of content.rules) assert.ok(alleRegeln.has(r), `Regel ${r} ist in den Tests vorgekommen`);
});
