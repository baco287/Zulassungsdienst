'use strict';
// Sollwerte (lib/soll.js): echte config/preise.json + config/betrieb.json des Repos und Testdateien in eigenen Temp-Ordnern.
// Ohne Netz; schreibt nur unter os.tmpdir().
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const soll = require('../lib/soll');

const REPO = path.resolve(__dirname, '..', '..');
const roh = datei => JSON.parse(fs.readFileSync(path.join(REPO, 'config', datei), 'utf8'));

// Testkonfiguration im Aufbau der echten Dateien (Werte fest, damit die Tests nicht vom aktuellen Preisstand abhängen)
const PREISE = {
  stand: '2026-11-20', freigabe: { freigegeben: true },
  aktion: { name: 'Gründerrabatt', gueltigBis: '2026-12-31', leistungen: ['neuzulassung', 'ummeldung', 'halterwechsel', 'wiederzulassung'], regulaererPreis: 128 },
  mwstSatz: 0.19,
  leistungen: { neuzulassung: { preis: 110 }, ummeldung: { preis: 110 }, halterwechsel: { preis: 110 }, wiederzulassung: { preis: 110 }, abmeldung: { preis: 34 }, adressaenderung: { preis: 64 } },
  zusatzleistungen: { kennzeichenschilder: { preis: 29 }, wunschkennzeichen: { preis: 12 } },
  amtlicheGebuehren: { onlineZulassung: [12.8, 23.72], wunschkennzeichen: [12.8, 12.8] },
};
const BETRIEB = {
  stand: '2026-11-11', freigabe: { freigegeben: false },
  zeiten: {
    kunde: { anfrageMinuten: { wert: 2 }, auftragMinuten: { wert: 10 } },
    bearbeitung: { neuzulassung: { minuten: [10, 30] }, abmeldung: { minuten: [10, 30] }, 'ersatz-dokumente': { werktage: [3, 10] }, kurzzeitkennzeichen: { werktage: [1, 2] } },
    versand: { kennzeichen: { werktage: [1, 3] }, werktage: null },
  },
  abwicklung: { servicezeiten: { wert: 'Mo–Fr 8:00–18:00 Uhr' } },
};
function repo(preise = PREISE, betrieb = BETRIEB, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-soll-'));
  fs.mkdirSync(path.join(dir, 'config'));
  if (preise !== null) fs.writeFileSync(path.join(dir, 'config', 'preise.json'), typeof preise === 'string' ? preise : JSON.stringify(preise));
  if (betrieb !== null) fs.writeFileSync(path.join(dir, 'config', 'betrieb.json'), typeof betrieb === 'string' ? betrieb : JSON.stringify(betrieb));
  for (const [rel, inhalt] of Object.entries(extra)) { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), inhalt); }
  return dir;
}
const kopie = o => JSON.parse(JSON.stringify(o));

test('echte Konfiguration des Repos: lädt vollständig, Werte entsprechen den Dateien', () => {
  const p = roh('preise.json'), b = roh('betrieb.json');
  const heute = '2026-11-22';
  const s = soll.load({ repoRoot: REPO }, heute);
  assert.equal(s.heute, heute);
  assert.equal(s.widerrufTage, 14);
  assert.deepEqual(s.quelle.preise, 'config/preise.json'); assert.deepEqual(s.quelle.betrieb, 'config/betrieb.json');
  assert.equal(s.preise.stand, p.stand); assert.equal(s.zeiten.stand, b.stand);
  // jede Leistung als Zahl; während einer laufenden Aktion der konfigurierte Preis, danach der reguläre
  const aktiv = !!p.aktion && heute <= p.aktion.gueltigBis;
  for (const [slug, l] of Object.entries(p.leistungen)) {
    const erwartet = p.aktion && !aktiv && p.aktion.leistungen.includes(slug) ? p.aktion.regulaererPreis : l.preis;
    assert.equal(s.preise[slug], erwartet, slug);
    assert.ok(s.preise.erlaubt.has(soll.fmt(erwartet)), `${slug} in erlaubt`);
  }
  assert.equal(s.preise.zulassung, s.preise.neuzulassung);
  for (const [k, z] of Object.entries(p.zusatzleistungen || {})) assert.ok(s.preise.erlaubt.has(soll.fmt(z.preis)), k);
  for (const a of s.preise.alt) assert.ok(!s.preise.erlaubt.has(a), `Altpreis ${a} ist nicht zugleich gültig`);
  for (const v of s.preise.erlaubt) assert.match(v, /^\d+,\d\d$/);
  if (p.aktion) {
    assert.equal(s.preise.aktion.gueltigBis, p.aktion.gueltigBis); assert.equal(s.preise.aktion.regulaer, p.aktion.regulaererPreis);
    assert.equal(s.preise.aktion.aktiv, aktiv); assert.equal(typeof s.preise.aktion.tageBisEnde, 'number');
    if (aktiv && p.aktion.regulaererPreis !== p.leistungen[p.aktion.leistungen[0]].preis) assert.ok(s.preise.alt.includes(soll.fmt(p.aktion.regulaererPreis)), 'regulärer Preis gilt während der Aktion als Altpreis');
  } else assert.equal(s.preise.aktion, null);
  // Zeiten wie in betrieb.json
  assert.deepEqual(s.zeiten.bearbeitungMinuten, b.zeiten.bearbeitung.neuzulassung.minuten);
  assert.deepEqual(s.zeiten.versandWerktage, b.zeiten.versand.kennzeichen.werktage);
  for (const e of Object.values(b.zeiten.bearbeitung)) {
    if (e.minuten) assert.ok(s.zeiten.minutenSpannen.some(x => x[0] === e.minuten[0] && x[1] === e.minuten[1]));
    if (e.werktage) assert.ok(s.zeiten.werktageSpannen.some(x => x[0] === e.werktage[0] && x[1] === e.werktage[1]));
  }
  assert.equal(s.zeiten.servicezeiten, b.abwicklung.servicezeiten.wert);
  assert.ok(s.zeiten.service && /^\d{1,2}:\d\d$/.test(s.zeiten.service.von) && /^\d{1,2}:\d\d$/.test(s.zeiten.service.bis));
  assert.ok(s.indexGate.maxAlterTage > 0);
});

test('echte Konfiguration: nach Ablauf der Aktion gelten die regulären Preise', (t) => {
  const p = roh('preise.json');
  if (!p.aktion) { t.skip('keine Aktion konfiguriert'); return; }
  const nach = soll.load({ repoRoot: REPO }, new Date(Date.parse(p.aktion.gueltigBis + 'T12:00:00Z') + 86400e3));
  assert.equal(nach.preise.aktion.aktiv, false);
  for (const slug of p.aktion.leistungen) assert.equal(nach.preise[slug], p.aktion.regulaererPreis);
  assert.ok(nach.preise.erlaubt.has(soll.fmt(p.aktion.regulaererPreis)));
});

test('Aktion: gilt bis einschließlich gueltigBis (Kalendertag Europe/Berlin)', () => {
  const dir = repo();
  const am = soll.load({ repoRoot: dir }, '2026-12-31');
  assert.equal(am.preise.aktion.aktiv, true); assert.equal(am.preise.aktion.tageBisEnde, 0);
  assert.equal(am.preise.neuzulassung, 110); assert.ok(am.preise.erlaubt.has('110,00'));
  assert.ok(am.preise.alt.includes('128,00'), 'regulärer Preis ist während der Aktion ein Altpreis');
  assert.deepEqual({ aktiv: am.preise.aktion.aktiv, preis: am.preise.aktion.preis, regulaer: am.preise.aktion.regulaer, gueltigBis: am.preise.aktion.gueltigBis }, { aktiv: true, preis: 110, regulaer: 128, gueltigBis: '2026-12-31' });
  const vorher = soll.load({ repoRoot: dir }, '2026-12-17');
  assert.equal(vorher.preise.aktion.tageBisEnde, 14);
  const danach = soll.load({ repoRoot: dir }, '2027-01-01');
  assert.equal(danach.preise.aktion.aktiv, false); assert.equal(danach.preise.aktion.tageBisEnde, -1);
  assert.equal(danach.preise.neuzulassung, 128); assert.equal(danach.preise.zulassung, 128); assert.equal(danach.preise.abmeldung, 34);
  assert.ok(danach.preise.erlaubt.has('128,00')); assert.ok(!danach.preise.erlaubt.has('110,00'));
  assert.ok(!danach.preise.alt.includes('128,00'));
  // 31.12. 23:30 UTC ist in Berlin schon der 1. Januar → Aktion vorbei; 31.12. 22:30 UTC ist noch der 31.12.
  assert.equal(soll.load({ repoRoot: dir }, new Date('2026-12-31T23:30:00Z')).preise.aktion.aktiv, false);
  assert.equal(soll.load({ repoRoot: dir }, new Date('2026-12-31T22:30:00Z')).preise.aktion.aktiv, true);
  // Sommerzeit: 30.06. 22:30 UTC = 1. Juli in Berlin
  assert.equal(soll.tagBerlin(new Date('2026-06-30T22:30:00Z')), '2026-07-01');
});

test('Preise: Eigenpreise, Zusatzleistungen, amtliche Gebühren, Altpreise', () => {
  const s = soll.load({ repoRoot: repo() }, '2026-11-22');
  assert.deepEqual([...s.preise.erlaubt].sort(), ['110,00', '12,00', '29,00', '34,00', '64,00']);
  assert.equal(s.preise.kennzeichen, 29); assert.equal(s.preise.wunschkennzeichen, 12); assert.equal(s.preise.adressaenderung, 64);
  assert.ok(s.preise.amtlich.has('12,80') && s.preise.amtlich.has('23,72'));
  for (const a of ['129,00', '127,89', '34,90', '28,90', '128,00']) assert.ok(s.preise.alt.includes(a), a);
  assert.equal(s.preise.mwstSatz, 0.19); assert.equal(s.preise.freigegeben, true);
  // ohne Aktion: kein Aktionsblock, regulärer Preis kein Altpreis
  const p = kopie(PREISE); delete p.aktion; p.leistungen.neuzulassung.preis = 128;
  const o = soll.load({ repoRoot: repo(p) }, '2026-11-22');
  assert.equal(o.preise.aktion, null); assert.ok(!o.preise.alt.includes('128,00')); assert.ok(o.preise.erlaubt.has('128,00'));
});

test('Altpreis 110,00 (Gründerrabatt): nach dem Zurückstellen auf 128 € ohne Aktionsblock ein Altpreis, während der Aktion nicht', () => {
  assert.ok(soll.ALTPREISE.includes('110,00'));
  // Konfiguration nach dem Aktionsende: kein aktion-Block, Aktionsleistungen wieder 128 €
  const p = kopie(PREISE); delete p.aktion; for (const l of PREISE.aktion.leistungen) p.leistungen[l].preis = 128;
  const nachher = soll.load({ repoRoot: repo(p) }, '2027-01-02');
  assert.equal(nachher.preise.aktion, null); assert.ok(nachher.preise.alt.includes('110,00'), '110,00 ist wieder Altpreis'); assert.ok(!nachher.preise.erlaubt.has('110,00'));
  assert.ok(nachher.preise.erlaubt.has('128,00') && !nachher.preise.alt.includes('128,00'));
  // während der Aktion: 110,00 ist der gültige Aktionspreis, kein Altpreis
  const waehrend = soll.load({ repoRoot: repo() }, '2026-11-22');
  assert.equal(waehrend.preise.aktion.aktiv, true); assert.ok(waehrend.preise.erlaubt.has('110,00')); assert.ok(!waehrend.preise.alt.includes('110,00'));
  // Aktion abgelaufen, Konfiguration noch nicht zurückgestellt: 110,00 nicht mehr gültig → Altpreis (kfz.js meldet dafür aktionspreis-abgelaufen)
  const abgelaufen = soll.load({ repoRoot: repo() }, '2027-01-02');
  assert.equal(abgelaufen.preise.aktion.aktiv, false); assert.ok(abgelaufen.preise.alt.includes('110,00'));
  // ein anderer Eigenpreis von 110 € bleibt gültig (kein Altpreis)
  const q = kopie(p); q.leistungen.abmeldung.preis = 110;
  assert.ok(!soll.load({ repoRoot: repo(q) }, '2027-01-02').preise.alt.includes('110,00'));
});

test('Zeiten: Spannen, Versand, Servicezeiten, Kundenaufwand', () => {
  const s = soll.load({ repoRoot: repo() }, '2026-11-22');
  assert.deepEqual(s.zeiten.bearbeitungMinuten, [10, 30]);
  assert.deepEqual(s.zeiten.versandWerktage, [1, 3]);
  assert.deepEqual(s.zeiten.minutenSpannen, [[10, 30]]);
  assert.deepEqual(s.zeiten.werktageSpannen, [[3, 10], [1, 2], [1, 3]]);
  assert.equal(s.zeiten.servicezeiten, 'Mo–Fr 8:00–18:00 Uhr');
  assert.deepEqual(s.zeiten.service, { von: '8:00', bis: '18:00' });
  assert.deepEqual(s.zeiten.kundeMinuten, { anfrage: 2, auftrag: 10 });
  assert.equal(s.zeiten.freigegeben, false);
  // Servicezeiten in anderer Schreibweise; fehlend → null (kein Fehler)
  const b = kopie(BETRIEB); b.abwicklung.servicezeiten.wert = 'Mo–Fr 9 Uhr – 17:30 Uhr';
  assert.deepEqual(soll.load({ repoRoot: repo(PREISE, b) }).zeiten.service, { von: '9:00', bis: '17:30' });
  const b2 = kopie(BETRIEB); delete b2.abwicklung;
  const s2 = soll.load({ repoRoot: repo(PREISE, b2) });
  assert.equal(s2.zeiten.servicezeiten, null); assert.equal(s2.zeiten.service, null);
});

test('Index-Gate: MAX_AGE_DAYS aus lib/indexGate.ts, sonst Rückfallwert', () => {
  assert.deepEqual(soll.load({ repoRoot: repo() }).indexGate, { maxAlterTage: 183, quelle: 'Rückfallwert' });
  const dir = repo(PREISE, BETRIEB, { 'lib/indexGate.ts': 'export const MAX_AGE_DAYS = 120;\n' });
  assert.deepEqual(soll.load({ repoRoot: dir }).indexGate, { maxAlterTage: 120, quelle: 'lib/indexGate.ts' });
});

test('Fehler: fehlende Dateien und Felder → klare Meldung (Aufrufer fängt ab)', () => {
  const wirft = (dir, re) => assert.throws(() => soll.load({ repoRoot: dir }, '2026-11-22'), e => e.name === 'SollFehler' && re.test(e.message));
  assert.throws(() => soll.load({}), /cfg\.repoRoot ist nicht gesetzt/);
  wirft(repo(null), /config\/preise\.json – Datei fehlt/);
  wirft(repo(PREISE, null), /config\/betrieb\.json – Datei fehlt/);
  wirft(repo('{ kaputt'), /preise\.json – kein gültiges JSON/);
  wirft(repo('[]'), /unerwarteter Aufbau/);
  const ohneLeistungen = kopie(PREISE); delete ohneLeistungen.leistungen; wirft(repo(ohneLeistungen), /„leistungen“ fehlt/);
  const textPreis = kopie(PREISE); textPreis.leistungen.abmeldung.preis = '34'; wirft(repo(textPreis), /leistungen\.abmeldung\.preis/);
  const ohneDatum = kopie(PREISE); delete ohneDatum.aktion.gueltigBis; wirft(repo(ohneDatum), /aktion\.gueltigBis/);
  const falschesDatum = kopie(PREISE); falschesDatum.aktion.gueltigBis = '31.12.2026'; wirft(repo(falschesDatum), /aktion\.gueltigBis/);
  const ohneRegulaer = kopie(PREISE); delete ohneRegulaer.aktion.regulaererPreis; wirft(repo(ohneRegulaer), /aktion\.regulaererPreis/);
  const unbekannt = kopie(PREISE); unbekannt.aktion.leistungen.push('tageszulassung'); wirft(repo(unbekannt), /unbekannte Leistung\(en\): tageszulassung/);
  const ohneZeiten = kopie(BETRIEB); delete ohneZeiten.zeiten; wirft(repo(PREISE, ohneZeiten), /„zeiten“ fehlt/);
  const ohneVersand = kopie(BETRIEB); delete ohneVersand.zeiten.versand.kennzeichen; wirft(repo(PREISE, ohneVersand), /versand\.kennzeichen\.werktage/);
  const kaputteSpanne = kopie(BETRIEB); kaputteSpanne.zeiten.bearbeitung.neuzulassung.minuten = [30, 10]; wirft(repo(PREISE, kaputteSpanne), /neuzulassung\.minuten“ ist keine Spanne/);
  const nurWerktage = kopie(BETRIEB); nurWerktage.zeiten.bearbeitung = { kurzzeitkennzeichen: { werktage: [1, 2] } }; wirft(repo(PREISE, nurWerktage), /keine Bearbeitungsdauer in Minuten/);
  assert.throws(() => soll.load({ repoRoot: repo() }, 'kein Datum'), /ungültiges Datum/);
});

test('Hilfsfunktionen: fmt, tageZwischen, tagDeutsch', () => {
  assert.equal(soll.fmt(110), '110,00'); assert.equal(soll.fmt(12.8), '12,80'); assert.equal(soll.fmt(23.72), '23,72');
  assert.equal(soll.tageZwischen('2026-11-03', '2027-04-02'), 150);
  assert.equal(soll.tageZwischen('2026-11-03', '2027-05-05'), 183);
  assert.equal(soll.tageZwischen('2026-12-31', '2026-12-17'), -14);
  assert.equal(soll.tagDeutsch('2026-12-31'), '31.12.2026');
});
