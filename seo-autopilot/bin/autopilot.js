#!/usr/bin/env node
'use strict';
// ─── SEO-Autopilot KFZ-Zulassungsprofis – Ablaufsteuerung ────────────────────
//   node seo-autopilot/bin/autopilot.js daily     # Technik + Meta + Preise/Marke/Platzhalter (tägliche Pflichtprüfungen), Tagesbericht
//   node seo-autopilot/bin/autopilot.js weekly    # zusätzlich Schema, Inhalte, FAQ, Search Console, Chancen, Wochenbericht
//   node seo-autopilot/bin/autopilot.js monthly   # wie weekly, dazu die Monatsauswertung im Bericht
//   node seo-autopilot/bin/autopilot.js crawl     # nur crawlen: page-cache.json + last-crawl.json (keine Regeln, keine Mails)
//   node seo-autopilot/bin/autopilot.js status    # Kurzstatus (ohne Adressen und Zugangsdaten)
//   node seo-autopilot/bin/autopilot.js gsc       # nur Search-Console-Abruf
//   node seo-autopilot/bin/autopilot.js gsc-check # Verbindung und Berechtigung des Dienstkontos prüfen
// SEO_OFFLINE=1: kein Netz – das Crawl-Ergebnis kommt aus page-cache.json des letzten echten Laufs.
// Liest nur von der Live-Seite (GET/HEAD), schreibt nur in den Datenordner. Keine Deploys.
// Die Konsole zeigt nur Zahlen und Status (Actions-Logs sind öffentlich): keine Befundtexte, Suchanfragen, Adressen.
const fs = require('fs');
const path = require('path');
const cfg = require('../config');
const { readJson, writeJsonAtomic, maskiere } = require('../lib/util');

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const dataDir = cfg.dataDir;
const J = (name, def) => readJson(path.join(dataDir, name), def);
const W = (name, obj) => writeJsonAtomic(path.join(dataDir, name), obj);
const offline = () => process.env.SEO_OFFLINE === '1';

// Regelmodule: Schnittstelle { run(ctx) → Findings, rules: [Regel-IDs], gruppe?: Anzeigename }
const MODULE = { technical: 'Technik', meta: 'Meta', kfz: 'Preise & Marke', schema: 'Schema', content: 'Inhalt', faq: 'FAQ' };
const TAEGLICH = ['technical', 'meta', 'kfz'];
const VOLL = ['technical', 'meta', 'kfz', 'schema', 'content', 'faq'];
const modulDatei = name => path.join(__dirname, '..', 'lib', 'rules', name + '.js');

/** Hilfsmodul laden; fehlt es oder lässt es sich nicht laden, läuft der Autopilot ohne es weiter (Meldung im Log). */
function optional(rel, zweck) {
  const datei = path.join(__dirname, '..', rel + '.js');
  if (!fs.existsSync(datei)) { log(`Hinweis: ${rel}.js fehlt – ${zweck} entfällt in diesem Lauf`); return null; }
  try { return require(datei); } catch (e) { log(`Hinweis: ${rel}.js nicht ladbar (${e.name}) – ${zweck} entfällt in diesem Lauf`); return null; }
}
/**
 * Befund für ein ausgefallenes Prüfmodul – macht den Ausfall im SEO Center sichtbar. Schlüssel = Modulname: Geschlossen
 * wird er nur von einem Lauf, der dieses Modul fehlerfrei ausgeführt hat (Umfang „autopilot-modul:<name>“) – der
 * Tageslauf ohne Inhalt/Schema/FAQ lässt einen Ausfall dieser Wochenmodule offen.
 */
const modulBefund = (name, e) => ({ rule: 'autopilot-modul', severity: 'hoch', approval: 'auto', file: `seo-autopilot/lib/rules/${name}.js`, key: name, title: `Prüfmodul „${MODULE[name] || name}“ ist ausgefallen`, detail: `Die Regeln dieses Moduls wurden in diesem Lauf nicht geprüft; offene Punkte daraus bleiben unverändert. Fehler: ${String((e && e.message) || e).slice(0, 200)}`, suggestion: 'Lauf lokal mit SEO_OFFLINE=1 wiederholen und den Fehler im Modul beheben.' });

/** Regelmodule eines Laufs ausführen. Ein fehlendes oder fehlerhaftes Modul bricht den Lauf nicht ab. */
function pruefen(namen, ctx) {
  let findings = []; const scope = []; const fehlend = []; const defekt = [];
  for (const name of namen) {
    if (!fs.existsSync(modulDatei(name))) { fehlend.push(name); log(`${MODULE[name]}: Modul lib/rules/${name}.js fehlt – übersprungen`); continue; }
    try {
      const m = require(modulDatei(name));
      if (!m || typeof m.run !== 'function' || !Array.isArray(m.rules)) throw new Error('Schnittstelle { run, rules } fehlt');
      const f = m.run(ctx) || [];
      // Nur tatsächlich geprüfte Regeln dürfen offene Punkte schließen (z. B. keine Preisregeln ohne lesbare Sollwerte)
      findings = findings.concat(f); scope.push(...(typeof m.geprueft === 'function' ? m.geprueft(ctx) : m.rules), 'autopilot-modul:' + name);
      log(`${m.gruppe || MODULE[name]}: ${f.length} Befunde`);
    } catch (e) { defekt.push(name); findings.push(modulBefund(name, e)); log(`${MODULE[name]}: Modul ausgefallen (${e.name}) – übersprungen, Details im Bericht`); }
  }
  return { findings, scope: [...new Set(scope)], fehlend, defekt };
}

const zaehle = (list, fn) => list.reduce((a, x) => a + (fn(x) ? 1 : 0), 0);
/** Meldung zu einem unsicheren Lauf. `folge` = Zahl der unsicheren Läufe direkt davor; versendet wird nur beim zweiten in Folge. */
function unsicherHinweis(runId, reasons, folge) {
  let site = ''; try { site = new URL(cfg.base).host; } catch (_) { site = ''; }
  const zweiter = folge === 1;
  return { channel: 'hinweis', ids: [], ...(zweiter ? {} : { skip: true }),
    subject: zweiter ? `[SEO-Autopilot] ${site} – zwei Prüfläufe in Folge ohne verlässliches Ergebnis` : '[SEO-Autopilot] Prüflauf unsicher – keine Bewertung',
    body: `Der Lauf ${runId} weicht stark vom Vorlauf ab (${reasons.join('; ')}).${zweiter ? ' Das war bereits beim Lauf davor so.' : ''} Mögliche Ursache: Die Website ist nicht oder nur teilweise erreichbar, oder der Abruf ist gestört (Netz, Server). Es wurden keine Punkte geschlossen und keine Einzelmeldungen erzeugt.${zweiter ? ' Bitte prüfen, ob die Website erreichbar ist. Bleibt die Abweichung bestehen, gilt sie ab dem nächsten Lauf als neuer Vergleichsstand.' : ' Bitte den nächsten Lauf abwarten.'}` };
}
/** Zahl der unsicheren Läufe unmittelbar vor diesem Lauf. */
function unsicherInFolge(runs) { let n = 0; for (let i = (runs || []).length - 1; i >= 0 && runs[i].suspicious; i--) n++; return n; }

/**
 * Fehlalarm-Prüfung bei größeren Veränderungen: Wenn ein Lauf gegenüber dem Vorlauf massiv abweicht, ist eher der
 * Crawler/das Netz/der Server das Problem als die Website. Dann wird der Lauf als „unsicher“ markiert: Befunde werden
 * gespeichert, aber nichts wird als behoben geschlossen, keine Sofortmeldung, Hinweis in Bericht und SEO Center –
 * und last-crawl.json (die Vergleichsbasis des nächsten Laufs) wird NICHT überschrieben.
 * `bekannt(f)` sagt, ob ein Befund schon offen ist (nur NEUE kritische Befunde in großer Zahl sind verdächtig).
 */
function plausibility(crawl, prevSer, findings, bekannt = () => false) {
  const reasons = [];
  const n = crawl.stats.crawled; const prevN = prevSer && prevSer.stats ? prevSer.stats.crawled : null;
  const st = crawl.stats.status || {}; const ok200 = st['200'] || 0; const errs = Object.entries(st).filter(([k]) => /^5|^0$/.test(k)).reduce((a, [, v]) => a + v, 0);
  if (n < 50) reasons.push(`nur ${n} URLs gecrawlt`);
  if (prevN && n < prevN * 0.6) reasons.push(`URL-Zahl um ${Math.round(100 - 100 * n / prevN)} % gesunken (${prevN} → ${n})`);
  if (n && ok200 / n < 0.7) reasons.push(`nur ${Math.round(100 * ok200 / n)} % der URLs mit Status 200`);
  if (n && errs / n > 0.2) reasons.push(`${errs} Server-/Netzfehler (5xx/Timeout)`);
  if (crawl.stats.interneFehler) reasons.push(`${crawl.stats.interneFehler} interne Verarbeitungsfehler im Crawler`);
  if (crawl.stats.abgebrochen) reasons.push(`Crawl abgebrochen (${crawl.stats.abgebrochen})`);
  const krit = zaehle(findings, f => f.severity === 'kritisch' && !bekannt(f)); if (krit >= 10) reasons.push(`${krit} neue kritische Befunde auf einmal`);
  return { suspicious: reasons.length > 0, reasons };
}
/** Speicherplatz begrenzen: alte Berichte/Logs und liegen gebliebene Zwischendateien löschen. */
function housekeeping() {
  const out = []; const alt = (f, tage) => { try { return fs.statSync(f).mtimeMs < Date.now() - tage * 86400e3; } catch (_) { return false; } };
  const weg = (f, name) => { try { fs.unlinkSync(f); out.push(name); } catch (_) { /* schon weg */ } };
  const rep = path.join(dataDir, 'reports');
  if (fs.existsSync(rep)) for (const f of fs.readdirSync(rep)) {
    const m = /^(daily|weekly|monthly)-(\d{4}-\d{2}-\d{2})/.exec(f);
    if (m && Date.now() - new Date(m[2]).getTime() > 180 * 86400e3) weg(path.join(rep, f), f);
    else if (/\.tmp-\d+-[0-9a-f]+$/.test(f) && alt(path.join(rep, f), 1)) weg(path.join(rep, f), f);
  }
  for (const f of fs.readdirSync(dataDir)) {
    const p = path.join(dataDir, f);
    if (/^run-.*\.log$/.test(f) && alt(p, 30)) weg(p, f);
    else if (/\.tmp-\d+-[0-9a-f]+$/.test(f) && alt(p, 1)) weg(p, f);
  }
  return out;
}

async function doCrawl(prev) {
  const crawler = require('../lib/crawler');
  log(offline() ? 'Offline-Modus: Crawl-Ergebnis aus page-cache.json (kein Netz)' : `Crawl ${cfg.base}`);
  const res = await crawler.run(cfg, { prev, log });
  const s = res.crawl.stats;
  log(`Crawl fertig: ${s.crawled} URLs (${s.indexable} indexierbar, ${s.noindex} noindex), ${s.fetched} abgerufen, ${s.reused} unverändert, ${s.retries} Wiederholungen, ${Math.round((s.dauerMs || 0) / 1000)} s`);
  if (s.limitErreicht) log(`⚠ Crawl-Grenze erreicht (maxPages ${cfg.crawl.maxPages}) – nicht alle URLs geprüft`);
  if (s.abgebrochen) log(`⚠ Crawl abgebrochen: ${s.abgebrochen}`);
  if (s.parseFehler) log(`⚠ ${s.parseFehler} Seiten nicht auswertbar`);
  const nichtOk = res.hostChecks.filter(h => !h.ok).length;
  log(`Weiterleitungen: ${res.hostChecks.length} geprüft, ${nichtOk} auffällig · Dateien: ${res.crawl.dateien.size} geprüft`);
  return res;
}
/** Nur crawlen (für die Regelentwicklung im Offline-Modus): schreibt page-cache.json und last-crawl.json. */
async function crawlOnly() {
  const crawler = require('../lib/crawler');
  const prev = J('last-crawl.json', null);
  const { crawl, hostChecks } = await doCrawl(prev);
  const plaus = plausibility(crawl, prev, []);
  if (plaus.suspicious && !process.argv.includes('--trotzdem')) { log(`⚠ Crawl unsicher: ${plaus.reasons.join('; ')} – last-crawl.json bleibt unverändert (erzwingen mit --trotzdem)`); return 1; }
  W('last-crawl.json', crawler.serialize(crawl, hostChecks));
  log(`Status: ${Object.entries(crawl.stats.status).map(([k, v]) => `${k}×${v}`).join(', ')} · last-crawl.json geschrieben`);
  return 0;
}

async function runChecks(kind) {
  const runId = `${kind}-${Date.now().toString(36)}`;
  const crawler = require('../lib/crawler');
  const { IssueStore, fingerprint } = require('../lib/issues');
  const { aggregate, optionen: buendelOptionen } = require('../lib/aggregate');
  const report = require('../lib/report');
  const { topActions, recurring } = require('../lib/actions');
  const store = new IssueStore(dataDir); // früh öffnen: eine beschädigte issues.json bricht den Lauf vor dem Crawl ab
  const prev = J('last-crawl.json', null);
  const hinweise = [];
  const { crawl, hostChecks } = await doCrawl(prev);

  // Sollwerte (Preise, Zeiten) aus config/preise.json und config/betrieb.json der Website
  let soll = null; const sollModul = optional('lib/soll', 'der Abgleich mit Preisen und Zeiten');
  if (sollModul) { try { soll = sollModul.load(cfg); } catch (e) { soll = null; log(`Sollwerte nicht lesbar (${e.name}) – Preisprüfungen melden das als Befund`); } }

  // offen: offene Punkte vor diesem Lauf – Vergleichsregeln (z. B. erreichbarkeit-verlust) melden sie erneut, solange der Zustand anhält
  const ctx = { crawl, prev, cfg, hostChecks, soll, offen: store.open() };
  const lauf = pruefen(kind === 'daily' ? TAEGLICH : VOLL, ctx);
  if (lauf.fehlend.length) hinweise.push(`Nicht vorhandene Prüfmodule (übersprungen): ${lauf.fehlend.join(', ')}`);
  if (lauf.defekt.length) hinweise.push(`⚠ Ausgefallene Prüfmodule: ${lauf.defekt.join(', ')} – deren Regeln wurden in diesem Lauf nicht geprüft`);
  const before = lauf.findings.length; const findings = aggregate(lauf.findings, cfg.base, buendelOptionen(cfg)); log(`Gebündelt: ${before} → ${findings.length} Punkte`);

  const plaus = plausibility(crawl, prev, findings, f => { const x = store.get(fingerprint(f)); return !!x && x.status === 'offen'; });
  const folge = unsicherInFolge(store.state.runs);
  if (plaus.suspicious) log(`⚠ Lauf als unsicher markiert (mögliche Fehlalarme): ${plaus.reasons.join('; ')} – nichts wird als behoben geschlossen`);
  const summary = store.apply(findings, { runId, scope: lauf.scope, kind, suspicious: plaus.suspicious, note: plaus.reasons.join('; ') });
  // Vergleichsbasis: ein unsicherer Lauf überschreibt last-crawl.json nicht. Bleibt die Abweichung drei Läufe in Folge
  // bestehen, ist sie der neue Normalzustand – dann wird die Basis übernommen (sonst bliebe jeder Folgelauf „unsicher“).
  if (!plaus.suspicious) W('last-crawl.json', crawler.serialize(crawl, hostChecks));
  else if (folge >= 2) { W('last-crawl.json', crawler.serialize(crawl, hostChecks)); hinweise.push('Vergleichsbasis nach drei unsicheren Läufen in Folge auf den aktuellen Stand gesetzt.'); log('Vergleichsbasis nach drei unsicheren Läufen in Folge übernommen'); }
  else log('last-crawl.json bleibt unverändert (unsicherer Lauf)');

  // Google Search Console (wöchentlich/monatlich; täglich nur, wenn verbunden). Offline nur der gespeicherte Stand.
  const gsc = optional('lib/gsc', 'die Search-Console-Auswertung'); const gscAnalyze = gsc ? optional('lib/gsc-analyze', 'die Search-Console-Analyse') : null;
  let gscData = J('gsc.json', null); let gscStatus = { connected: false, reason: 'Search-Console-Modul nicht verfügbar.' }; let zugang = false;
  if (gsc) {
    try { gscStatus = gsc.status(cfg); } catch (e) { gscStatus = { connected: false, reason: 'Status nicht ermittelbar: ' + e.message }; }
    zugang = !!gscStatus.connected;
    if (!offline() && (kind !== 'daily' || gscStatus.connected)) {
      try {
        const res = await gsc.fetchPerformance(cfg);
        if (res && res.connected) { gscData = res; W('gsc.json', res); log(`Search Console: Daten abgerufen (${Object.keys(res.periods || {}).length} Zeiträume)`); }
        else { if (res && res.stale) { log('Search Console: Abruf fehlgeschlagen – gespeicherter Stand bleibt'); hinweise.push('Search Console: Abruf fehlgeschlagen – Kennzahlen stammen vom letzten erfolgreichen Abruf.'); } if (!gscData) gscData = res; }
        if (typeof gsc.statusAfterFetch === 'function') gscStatus = gsc.statusAfterFetch(cfg, res);
      } catch (e) { log(`Search Console: Abruf fehlgeschlagen (${e.name})`); gscStatus = { ...gscStatus, connected: false, reason: 'Abruf fehlgeschlagen: ' + e.message }; }
    }
    W('gsc-status.json', { checkedAt: new Date().toISOString(), ...gscStatus });
    if (gscData && gscData.connected && gscAnalyze) { try { W('gsc-analysis.json', gscAnalyze.analyze(gscData)); } catch (e) { log(`Search Console: Analyse fehlgeschlagen (${e.name})`); } }
  }
  // Ohne hinterlegten Zugang gilt die Search Console als nicht verbunden – auch wenn noch ein älterer Datenstand vorliegt
  if (!zugang || !gscData) gscData = { connected: false, status: gscStatus };

  // Chancen und Korrekturvorschläge
  let opps = [];
  const opportunities = optional('lib/opportunities', 'die Chancen-Auswertung');
  if (opportunities) { try { opps = opportunities.derive({ gsc: gscData, issues: store.all(), crawl }); W('opportunities.json', { at: new Date().toISOString(), items: opps }); } catch (e) { log(`Chancen: Auswertung fehlgeschlagen (${e.name})`); } }
  const suggest = optional('lib/suggest', 'die Liste der Korrekturvorschläge');
  if (suggest) { try { const patches = suggest.buildPatches(store.all(), cfg); W('suggestions.json', { at: new Date().toISOString(), items: store.open().map(i => suggest.describe(i, cfg, patches)) }); } catch (e) { log(`Vorschläge: Erstellung fehlgeschlagen (${e.name})`); } }

  // Bericht-Kopf (Score mit n = indexierbare Seiten) und Verlauf
  const h = report.header(kind, { runId, summary }, store, crawl.stats, { base: cfg.base });
  if (plaus.suspicious) { h.suspicious = true; h.suspiciousReasons = plaus.reasons; }
  if (lauf.defekt.length) h.modulFehler = lauf.defekt;
  store.ergaenzeLauf(runId, { score: h.score });
  const snap = J('crawl-history.json', []);
  snap.push({ at: new Date().toISOString(), kind, crawled: crawl.stats.crawled, fetched: crawl.stats.fetched, reused: crawl.stats.reused, status: crawl.stats.status, open: summary.open, bySeverity: summary.bySeverity, score: h.score, indexable: crawl.stats.indexable, noindex: crawl.stats.noindex, typen: crawl.stats.typen, dauerMs: crawl.stats.dauerMs, ...(plaus.suspicious ? { suspicious: true } : {}), ...(crawl.offline ? { offline: true } : {}) });
  W('crawl-history.json', snap.slice(-120));

  // Benachrichtigungen: erst senden, dann die Outbox schreiben (dort steht dann, was wirklich versendet wurde).
  // Unsicherer Lauf: keine Befund-Meldungen. Ein einzelner Ausreißer bleibt still (nur Outbox); ist auch der Lauf davor
  // unsicher gewesen, geht EIN Hinweis hinaus – sonst bliebe ein anhaltender Ausfall von Website oder Abruf unbemerkt.
  let items = []; let sent = { sent: 0, reason: 'Benachrichtigungsmodul nicht verfügbar' }; let outbox = '';
  const notify = optional('lib/notify', 'die Benachrichtigung');
  if (notify) {
    try {
      items = plaus.suspicious ? [unsicherHinweis(runId, plaus.reasons, folge)] : notify.build(store, cfg, kind, { score: h.score, gsc: gscData });
    } catch (e) { items = []; log(`Benachrichtigung: Zusammenstellung fehlgeschlagen (${e.name})`); }
    if (offline()) sent = { sent: 0, reason: 'Offline-Modus – kein Versand' };
    else { try { sent = (await notify.send(items, cfg, store)) || { sent: 0 }; } catch (e) { sent = { sent: 0, reason: 'Versand fehlgeschlagen' }; log(`Benachrichtigung: Versand fehlgeschlagen (${e.name})`); } }
    try { outbox = notify.writeOutbox(dataDir, items); } catch (e) { log(`Benachrichtigung: Ablage fehlgeschlagen (${e.name})`); }
  }
  const vorbereitet = zaehle(items, i => !i.skip);
  log(`Benachrichtigungen: ${vorbereitet} vorbereitet, ${sent.sent || 0} gesendet${sent.failed ? `, ${sent.failed} fehlgeschlagen` : ''}`);

  // Ab hier ist versendet: Ein Fehler beim Aufräumen, im Bericht oder in der Übersicht beendet den Lauf NICHT mit Exit ≠ 0 –
  // sonst fiele im Workflow der Upload aus (mit ihm die Meldemarkierungen) und dieselben Mails kämen am Folgetag noch einmal.
  // Log und Bericht nennen nur den Schritt und die Fehlerart, keine Inhalte.
  const nachVersand = [];
  const fehlschlag = (schritt, e) => { const art = (e && (e.code || e.name)) || 'Fehler'; nachVersand.push(`${schritt} (${art})`); log(`⚠ ${schritt} fehlgeschlagen (${art}) – der Lauf wird trotzdem abgeschlossen`); };
  let cleaned = []; try { cleaned = housekeeping(); } catch (e) { fehlschlag('Aufräumen', e); }
  if (cleaned.length) log(`Aufgeräumt: ${cleaned.length} Dateien`);

  // Bericht
  let file = null; const zusatz = {};
  try {
    let resolved = summary.resolved.map(id => store.get(id)).filter(Boolean);
    if (kind === 'monthly') {
      const since = new Date(Date.now() - 30 * 86400e3).toISOString();
      resolved = store.all().filter(i => i.status === 'behoben' && i.resolved_at >= since);
      const neu = zaehle(store.all(), i => i.first_seen >= since);
      zusatz.monat = { seit: since, neu, behoben: resolved.length };
      hinweise.push(`In den letzten 30 Tagen neu erkannt: ${neu}, behoben: ${resolved.length}`, 'Empfehlungen für den nächsten Monat: siehe Optimierungschancen und offene kritische/hohe Punkte.');
    }
    const notes = [
      `Benachrichtigungen: ${vorbereitet} vorbereitet${outbox ? ` (Ablage ${path.relative(dataDir, outbox)})` : ''}, gesendet: ${sent.sent || 0}${sent.reason ? ' – ' + maskiere(sent.reason) : ''}`,
      ...(plaus.suspicious ? [`⚠ LAUF UNSICHER (mögliche Fehlalarme): ${plaus.reasons.join('; ')} – keine Punkte geschlossen, keine Sofortmeldung`] : []),
      ...(crawl.stats.limitErreicht ? [`⚠ Crawl-Grenze erreicht (maxPages ${cfg.crawl.maxPages}) – nicht alle URLs wurden geprüft`] : []),
      ...(crawl.offline ? ['Offline-Lauf: Ergebnis aus dem Seitencache des letzten echten Crawls, kein Abruf der Website.'] : []),
      ...hinweise,
      ...(nachVersand.length ? [`⚠ Nach dem Versand fehlgeschlagen: ${nachVersand.join(', ')} – der Lauf wurde trotzdem abgeschlossen.`] : []),
      `Indexierungsstatus: ${gscData.connected ? 'Search Console verbunden' : 'unbekannt (keine Search-Console-Anbindung) – „technisch indexierbar“ und „in Sitemap“ sind geprüft, „von Google indexiert“ nicht'}`,
    ];
    const mdText = report.md(h, store, { gsc: gscData, resolved, opportunities: kind === 'daily' ? opps.slice(0, 8) : opps, history: store.state.runs, actions: topActions(store.all(), cfg, 5), recurring: recurring(store.all()), notes });
    file = report.write(cfg, h, mdText, { summary, stats: crawl.stats, ...zusatz });
  } catch (e) {
    fehlschlag('Bericht', e);
    // Ersatz: Kopfdaten mit Hinweis, damit latest-*.json und der Berichtsindex zu diesem Lauf passen (scheitert das Schreiben selbst, bleibt es beim Log)
    try { file = report.write(cfg, h, report.md(h, store, { notes: [`⚠ Bericht nur verkürzt – nach dem Versand fehlgeschlagen: ${nachVersand.join(', ')}. Der Lauf wurde trotzdem abgeschlossen.`] }), { summary, stats: crawl.stats, ...zusatz }); } catch (e2) { fehlschlag('Ersatzbericht', e2); }
  }
  log(`Bericht: ${file ? path.relative(dataDir, file) : 'nicht geschrieben'} · Score ${h.score} · offen ${h.open} (kritisch ${h.kritisch}, hoch ${h.hoch}) · neu ${h.neu}, behoben ${h.behoben}`);
  try { uebersicht(); } catch (e) { fehlschlag('Übersicht für das SEO Center', e); }
  return h;
}
/** Übersicht und Berichtsindex für das SEO Center fortschreiben – am Ende jedes Laufs, auch wenn er „unsicher“ war. */
function uebersicht() {
  const center = optional('lib/center-data', 'die Übersicht für das SEO Center');
  if (!center) return;
  try { center.writeAll(cfg, dataDir); log('Übersicht für das SEO Center geschrieben'); } catch (e) { log(`Übersicht für das SEO Center nicht geschrieben (${e.name})`); }
}

function status() {
  const { IssueStore } = require('../lib/issues');
  const store = new IssueStore(dataDir); const l = J('crawl-history.json', []).slice(-1)[0] || null;
  const last = l ? { at: l.at, kind: l.kind, crawled: l.crawled, indexable: l.indexable, noindex: l.noindex, open: l.open, score: l.score, ...(l.suspicious ? { unsicher: true } : {}) } : null;
  const gsc = optional('lib/gsc', 'der Search-Console-Status'); let g = { connected: false };
  if (gsc) { try { const s = gsc.status(cfg); g = { connected: !!s.connected, property: s.property || cfg.gsc.property, ...(s.connected ? {} : { grund: maskiere(s.reason || '') }) }; } catch (_) { g = { connected: false, grund: 'Status nicht ermittelbar' }; } }
  const module = {}; for (const n of VOLL) { if (!fs.existsSync(modulDatei(n))) { module[n] = 'fehlt'; continue; } try { module[n] = require(modulDatei(n)).rules.length + ' Regeln'; } catch (_) { module[n] = 'nicht ladbar'; } }
  let center = ''; try { const u = new URL(cfg.center.url); center = u.origin + u.pathname; } catch (_) { center = ''; }
  // Bewusst ohne Empfänger-Adresse, Benutzernamen oder Passwörter – nur, ob etwas hinterlegt ist
  console.log(JSON.stringify({ base: cfg.base, offline: offline(), module, gsc: g,
    notify: { eingeschaltet: !!cfg.notify.enabled, empfaengerHinterlegt: !!cfg.notify.to, postfachHinterlegt: !!(process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)) },
    center: { url: center, zugangHinterlegt: !!(cfg.center.user && cfg.center.password) },
    letzterLauf: last, offen: store.open().length, laeufe: store.state.runs.length, seitencache: fs.existsSync(cfg.cacheFile || path.join(dataDir, 'page-cache.json')) }, null, 1));
}

async function main() {
  const cmd = process.argv[2] || 'status';
  fs.mkdirSync(dataDir, { recursive: true });
  if (cmd === 'daily' || cmd === 'weekly' || cmd === 'monthly') await runChecks(cmd);
  else if (cmd === 'crawl') process.exitCode = await crawlOnly();
  else if (cmd === 'gsc-check') { const v = await require('../lib/gsc').verify(cfg); console.log(JSON.stringify({ ok: !!v.ok, ...(v.reason ? { grund: maskiere(v.reason) } : {}), ...(v.property ? { property: v.property } : {}), ...(Array.isArray(v.sites) ? { freigegebeneProperties: v.sites.length } : {}) }, null, 1)); process.exitCode = v.ok ? 0 : 1; }
  else if (cmd === 'gsc') { const d = await require('../lib/gsc').fetchPerformance(cfg); if (d.connected) W('gsc.json', d); console.log(JSON.stringify(d.connected ? { connected: true, zeitraeume: Object.keys(d.periods) } : { connected: false, grund: maskiere((d.status && d.status.reason) || '') }, null, 1)); }
  else if (cmd === 'status') status();
  else { console.error('Unbekannter Befehl:', cmd, '– erlaubt: daily | weekly | monthly | crawl | status | gsc | gsc-check'); process.exitCode = 2; }
}

if (require.main === module) main().catch(e => { console.error('[autopilot] Fehler:', maskiere(e && e.code === 'ISSUES_BESCHAEDIGT' ? e.message : (e && e.stack) || e)); process.exit(1); });
module.exports = { plausibility, pruefen, unsicherInFolge, unsicherHinweis, housekeeping, runChecks, crawlOnly, MODULE, TAEGLICH, VOLL };
