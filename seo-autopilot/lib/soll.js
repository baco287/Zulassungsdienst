'use strict';
// ─── Sollwerte: Preise und Zeiten aus der Konfiguration der Website ──────────
// Einzige Quelle sind config/preise.json und config/betrieb.json im Repository (cfg.repoRoot) –
// dieselben Dateien, aus denen die Website ihre Beträge und Zeitangaben erzeugt. Hier steht bewusst
// kein Betrag fest im Code (Ausnahme: die Liste früher gültiger Preise, die nirgends mehr stehen dürfen).
//
//   const soll = require('./soll').load(cfg);            // wirft mit klarer Meldung, wenn etwas fehlt
//   soll.preise.erlaubt.has('110,00')                    // gültiger Eigenpreis?
//   soll.preise.aktion                                   // befristete Aktion (oder null)
//   soll.zeiten.bearbeitungMinuten                       // [10, 30]
//
// Datumslogik: Eine Aktion gilt bis einschließlich `gueltigBis` (Kalendertag in Europe/Berlin).
// Nach Ablauf gilt für die Aktionsleistungen wieder `regulaererPreis` – auch wenn die Konfiguration
// noch nicht zurückgestellt wurde (die statische Website stellt nicht von selbst um).
const fs = require('fs');
const path = require('path');

// Früher gültige Eigenpreise (Quelle: scripts/check-preise.mjs und lib/pricing.ts der Website). '110,00' = Preis des
// Gründerrabatts: Solange die Aktion gilt, ist er ein gültiger Preis und fällt über `alt.filter(!erlaubt)` heraus;
// ist der Aktionsblock nach dem Ende entfernt, gilt eine stehen gebliebene „110,00“ wieder als Altpreis.
const ALTPREISE = ['129,00', '127,89', '34,90', '28,90', '110,00'];
// Gesetzliche Widerrufsfrist für Verbraucherverträge im Fernabsatz (§ 355 Abs. 2 BGB)
const WIDERRUF_TAGE = 14;
// Rückfallwert, falls lib/indexGate.ts nicht lesbar ist (dort: MAX_AGE_DAYS)
const INDEX_GATE_TAGE = 183;

const DATEI_PREISE = 'config/preise.json';
const DATEI_BETRIEB = 'config/betrieb.json';

/** Betrag als deutscher Text mit zwei Nachkommastellen: 110 → "110,00". */
const fmt = n => Number(n).toFixed(2).replace('.', ',');
const istZahl = v => typeof v === 'number' && Number.isFinite(v);
const istTag = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));
const istSpanne = v => Array.isArray(v) && v.length === 2 && istZahl(v[0]) && istZahl(v[1]) && v[0] <= v[1];

/** Kalendertag (JJJJ-MM-TT) eines Zeitpunkts in Europe/Berlin. Ein reiner Datumstext bleibt unverändert. */
function tagBerlin(d) {
  if (istTag(d)) return d;
  const t = d instanceof Date ? d : new Date(d === undefined || d === null ? Date.now() : d);
  if (Number.isNaN(t.getTime())) throw new Error('Sollwerte: ungültiges Datum für „heute“');
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
}
/** Ganze Kalendertage von Tag a bis Tag b (b − a); beide als JJJJ-MM-TT. */
function tageZwischen(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400e3);
}
/** Tag als deutsches Datum: 2026-12-31 → 31.12.2026. */
const tagDeutsch = iso => String(iso).split('-').reverse().join('.');

function fehler(datei, text) {
  const e = new Error(`Sollwerte nicht lesbar: ${datei} – ${text}`);
  e.name = 'SollFehler'; e.datei = datei; return e;
}
function lies(repoRoot, datei) {
  let roh;
  try { roh = fs.readFileSync(path.join(repoRoot, datei), 'utf8'); }
  catch (e) { throw fehler(datei, e.code === 'ENOENT' ? 'Datei fehlt' : `Datei nicht lesbar (${e.code || e.message})`); }
  let j;
  try { j = JSON.parse(roh); } catch (_) { throw fehler(datei, 'kein gültiges JSON'); }
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw fehler(datei, 'unerwarteter Aufbau (Objekt erwartet)');
  return j;
}

function preiseAus(p, heute) {
  const D = DATEI_PREISE;
  if (!p.leistungen || typeof p.leistungen !== 'object' || !Object.keys(p.leistungen).length) throw fehler(D, 'Abschnitt „leistungen“ fehlt oder ist leer');
  const konfiguriert = {};
  for (const [slug, l] of Object.entries(p.leistungen)) {
    if (!l || !istZahl(l.preis) || !(l.preis > 0)) throw fehler(D, `„leistungen.${slug}.preis“ fehlt oder ist keine positive Zahl`);
    konfiguriert[slug] = l.preis;
  }
  const zusatz = {};
  for (const [key, z] of Object.entries(p.zusatzleistungen || {})) {
    if (!z || !istZahl(z.preis) || !(z.preis > 0)) throw fehler(D, `„zusatzleistungen.${key}.preis“ fehlt oder ist keine positive Zahl`);
    zusatz[key] = z.preis;
  }
  // Befristete Aktion (optional)
  let aktion = null;
  if (p.aktion !== undefined && p.aktion !== null) {
    const a = p.aktion;
    if (typeof a !== 'object' || Array.isArray(a)) throw fehler(D, '„aktion“ hat einen unerwarteten Aufbau');
    if (!istTag(a.gueltigBis)) throw fehler(D, '„aktion.gueltigBis“ fehlt oder ist kein Datum (JJJJ-MM-TT)');
    if (!istZahl(a.regulaererPreis) || !(a.regulaererPreis > 0)) throw fehler(D, '„aktion.regulaererPreis“ fehlt oder ist keine positive Zahl');
    if (!Array.isArray(a.leistungen) || !a.leistungen.length) throw fehler(D, '„aktion.leistungen“ fehlt oder ist leer');
    const unbekannt = a.leistungen.filter(s => !(s in konfiguriert));
    if (unbekannt.length) throw fehler(D, `„aktion.leistungen“ nennt unbekannte Leistung(en): ${unbekannt.join(', ')}`);
    const tageBisEnde = tageZwischen(heute, a.gueltigBis);
    aktion = { name: String(a.name || 'Aktion'), aktiv: tageBisEnde >= 0, preis: konfiguriert[a.leistungen[0]], regulaer: a.regulaererPreis, gueltigBis: a.gueltigBis, gueltigBisText: tagDeutsch(a.gueltigBis), tageBisEnde, leistungen: a.leistungen.slice() };
  }
  // Gültiger Preis je Leistung: nach Ablauf der Aktion wieder der reguläre Preis
  const leistungen = {};
  for (const [slug, preis] of Object.entries(konfiguriert)) leistungen[slug] = aktion && !aktion.aktiv && aktion.leistungen.includes(slug) ? aktion.regulaer : preis;
  const erlaubt = new Set([...Object.values(leistungen), ...Object.values(zusatz)].map(fmt));
  // Altpreise: feste Liste, dazu während einer Aktion der reguläre Preis (Streichpreise sind nicht vorgesehen)
  const alt = ALTPREISE.slice();
  if (aktion && aktion.aktiv) alt.push(fmt(aktion.regulaer));
  // Amtliche Gebühren (Orientierungswerte) – sind keine Eigenpreise und dürfen neben ihnen stehen
  const amtlich = new Set();
  for (const v of Object.values(p.amtlicheGebuehren || {})) if (Array.isArray(v)) for (const n of v) if (istZahl(n)) amtlich.add(fmt(n));
  const haupt = leistungen.neuzulassung !== undefined ? leistungen.neuzulassung : Object.values(leistungen)[0];
  return {
    ...leistungen,
    zulassung: haupt,
    kennzeichen: zusatz.kennzeichenschilder,
    wunschkennzeichen: zusatz.wunschkennzeichen,
    leistungen, zusatz, erlaubt,
    alt: [...new Set(alt)].filter(s => !erlaubt.has(s)),
    aktion, amtlich,
    mwstSatz: istZahl(p.mwstSatz) ? p.mwstSatz : null,
    stand: istTag(p.stand) ? p.stand : null,
    freigegeben: !!(p.freigabe && p.freigabe.freigegeben === true),
  };
}

function zeitenAus(b) {
  const D = DATEI_BETRIEB;
  const z = b.zeiten;
  if (!z || typeof z !== 'object') throw fehler(D, 'Abschnitt „zeiten“ fehlt');
  if (!z.bearbeitung || typeof z.bearbeitung !== 'object' || !Object.keys(z.bearbeitung).length) throw fehler(D, 'Abschnitt „zeiten.bearbeitung“ fehlt oder ist leer');
  const minuten = [], werktage = [];
  const merke = (liste, s) => { if (!liste.some(x => x[0] === s[0] && x[1] === s[1])) liste.push([s[0], s[1]]); };
  for (const [slug, e] of Object.entries(z.bearbeitung)) {
    if (!e || typeof e !== 'object') continue;
    if (e.minuten !== undefined) { if (!istSpanne(e.minuten)) throw fehler(D, `„zeiten.bearbeitung.${slug}.minuten“ ist keine Spanne [von, bis]`); merke(minuten, e.minuten); }
    if (e.werktage !== undefined) { if (!istSpanne(e.werktage)) throw fehler(D, `„zeiten.bearbeitung.${slug}.werktage“ ist keine Spanne [von, bis]`); merke(werktage, e.werktage); }
  }
  const haupt = z.bearbeitung.neuzulassung && istSpanne(z.bearbeitung.neuzulassung.minuten) ? z.bearbeitung.neuzulassung.minuten : minuten[0];
  if (!haupt) throw fehler(D, 'keine Bearbeitungsdauer in Minuten gefunden („zeiten.bearbeitung.<leistung>.minuten“)');
  const v = z.versand || {};
  const versand = v.kennzeichen && v.kennzeichen.werktage;
  if (!istSpanne(versand)) throw fehler(D, '„zeiten.versand.kennzeichen.werktage“ fehlt oder ist keine Spanne [von, bis]');
  merke(werktage, versand);
  if (istSpanne(v.werktage)) merke(werktage, v.werktage);
  const sz = b.abwicklung && b.abwicklung.servicezeiten && typeof b.abwicklung.servicezeiten.wert === 'string' ? b.abwicklung.servicezeiten.wert : null;
  const m = sz ? /(\d{1,2})(?::(\d\d))?\s*(?:Uhr\s*)?[–-]\s*(\d{1,2})(?::(\d\d))?\s*Uhr/.exec(sz) : null;
  const kunde = z.kunde || {};
  const wert = o => (o && istZahl(o.wert) ? o.wert : null);
  return {
    bearbeitungMinuten: [haupt[0], haupt[1]],
    versandWerktage: [versand[0], versand[1]],
    minutenSpannen: minuten,
    werktageSpannen: werktage,
    servicezeiten: sz,
    service: m ? { von: `${Number(m[1])}:${m[2] || '00'}`, bis: `${Number(m[3])}:${m[4] || '00'}` } : null,
    kundeMinuten: { anfrage: wert(kunde.anfrageMinuten), auftrag: wert(kunde.auftragMinuten) },
    stand: istTag(b.stand) ? b.stand : null,
    freigegeben: !!(b.freigabe && b.freigabe.freigegeben === true),
  };
}

/** Höchstalter der Behördendaten in Tagen, ab dem die Website die Seiten auf noindex setzt (lib/indexGate.ts). */
function indexGateTage(repoRoot) {
  try {
    const m = /\bMAX_AGE_DAYS\s*=\s*(\d{1,4})\b/.exec(fs.readFileSync(path.join(repoRoot, 'lib', 'indexGate.ts'), 'utf8'));
    if (m && Number(m[1]) > 0) return { maxAlterTage: Number(m[1]), quelle: 'lib/indexGate.ts' };
  } catch (_) { /* Datei nicht vorhanden – Rückfallwert */ }
  return { maxAlterTage: INDEX_GATE_TAGE, quelle: 'Rückfallwert' };
}

/**
 * Sollwerte laden. `heute`: Date, Zeitstempel oder Tag „JJJJ-MM-TT“ (Standard: jetzt).
 * Wirft einen Fehler mit klarer Meldung, wenn eine Datei oder ein Pflichtfeld fehlt – der Aufrufer fängt ab.
 */
function load(cfg, heute = new Date()) {
  const repoRoot = cfg && cfg.repoRoot;
  if (!repoRoot) throw fehler(DATEI_PREISE, 'cfg.repoRoot ist nicht gesetzt');
  const tag = tagBerlin(heute);
  const p = lies(repoRoot, DATEI_PREISE);
  const b = lies(repoRoot, DATEI_BETRIEB);
  const preise = preiseAus(p, tag);
  const zeiten = zeitenAus(b);
  return {
    heute: tag,
    preise, zeiten,
    widerrufTage: WIDERRUF_TAGE,
    indexGate: indexGateTage(repoRoot),
    quelle: { preise: DATEI_PREISE, betrieb: DATEI_BETRIEB, preiseStand: preise.stand, betriebStand: zeiten.stand },
  };
}

module.exports = { load, fmt, tagBerlin, tageZwischen, tagDeutsch, ALTPREISE, WIDERRUF_TAGE, INDEX_GATE_TAGE };
