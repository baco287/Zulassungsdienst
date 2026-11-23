#!/usr/bin/env node
'use strict';
// ─── Testvorschauen der E-Mail-Meldungen (KEIN Versand) ──────────────────────
//   node seo-autopilot/bin/preview-mails.js             # echte Befunde aus dem Datenordner, sonst Beispieldaten
//   node seo-autopilot/bin/preview-mails.js --beispiel  # immer die eingebauten KFZ-Beispiele
// Schreibt nach <Datenordner>/previews/*.txt:
//   • Tageszusammenfassung und den Fall „nichts Neues → keine Mail“
//   • Wochen- und Monatszusammenfassung
//   • Sofortmeldung – mit einem SIMULIERTEN kritischen Befund (klar gekennzeichnet)
// Es wird nichts gesendet: Dieses Skript ruft notify.send() nicht auf und öffnet keine Netzverbindung.
// Der echte Datenbestand wird nur gelesen; gearbeitet wird auf einer Kopie im Temp-Ordner.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cfg = require('../config');
const { IssueStore } = require('../lib/issues');
const notify = require('../lib/notify');

const OUT = path.join(cfg.dataDir, 'previews');
const base = String(cfg.base || 'https://kfz-zulassungsprofis.de').replace(/\/+$/, '');
const lies = (n, d) => { try { return JSON.parse(fs.readFileSync(path.join(cfg.dataDir, n), 'utf8')); } catch (_) { return d; } };
const vor = tage => new Date(Date.now() - tage * 86400e3).toISOString();
const beispiel = process.argv.includes('--beispiel') || !fs.existsSync(path.join(cfg.dataDir, 'issues.json'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'seo-vorschau-'));

// Eingebaute Beispiele (frei erfunden, nur zur Ansicht des Mail-Formats – kein Zustand der Website)
const BEISPIELE = [
  { rule: 'preis-abweichend', severity: 'hoch', approval: 'preis', url: base + '/preise/', title: 'BEISPIEL: Preis im Seitentext weicht von der Preisfreigabe ab', detail: 'Im Text steht ein anderer Betrag als in config/preise.json.', suggestion: 'Betrag über config/preise.json freigeben oder den Seitentext angleichen.', key: 'beispiel-preis' },
  { rule: 'altmarke-sichtbar', severity: 'hoch', approval: 'manuell', url: base + '/leistungen/ummeldung/', title: 'BEISPIEL: Alter Markenname im sichtbaren Text', detail: 'Im Fließtext steht noch der frühere Markenname.', suggestion: 'Auf „KFZ-Zulassungsprofis“ umstellen.', key: 'beispiel-marke' },
  { rule: 'sitemap-index-abweichung', severity: 'mittel', approval: 'auto', url: base + '/zulassungsstelle/*/', title: 'BEISPIEL: Indexierbare Seiten fehlen in der Sitemap', count: 12, key: 'beispiel-sitemap' },
  { rule: 'title-lang', severity: 'niedrig', approval: 'auto', url: base + '/kfz-zulassung/*/', title: 'BEISPIEL: Title länger als empfohlen', count: 40, key: 'beispiel-title' },
  { rule: 'defekter-link', severity: 'hoch', approval: 'auto', url: base + '/faq/', title: 'BEISPIEL: Defekter interner Link', suggestion: 'Linkziel korrigieren.', key: 'beispiel-link' },
];
const SIMULIERT = { rule: 'erreichbarkeit-verlust', severity: 'kritisch', approval: 'auto', url: base + '/auftrag/', title: 'SIMULIERT: Kernseite nicht mehr erreichbar (vorher 200, jetzt 503): /auftrag/', detail: 'Dies ist ein simulierter Befund für die Testvorschau – die Seite ist in Wirklichkeit erreichbar.', suggestion: 'Letzten Deploy und die Erreichbarkeit des Webspace prüfen.', key: 'simuliert' };

try {
  let score, gsc;
  if (beispiel) {
    const s = new IssueStore(tmp); const scope = BEISPIELE.map(f => f.rule);
    s.apply(BEISPIELE, { runId: 'beispiel-1', scope, kind: 'weekly' });
    s.apply(BEISPIELE.filter(f => f.rule !== 'defekter-link'), { runId: 'beispiel-2', scope, kind: 'weekly' }); // ein Punkt gilt als behoben → „Erfolge“
    score = 86;
    gsc = { connected: true, periods: { 7: { range: { start: vor(10).slice(0, 10), end: vor(3).slice(0, 10) }, current: { clicks: 42, impressions: 1830, position: 14.2 }, previous: { clicks: 0, impressions: 12, position: 31.5 } } } };
  } else {
    fs.copyFileSync(path.join(cfg.dataDir, 'issues.json'), path.join(tmp, 'issues.json'));
    const letzter = (lies('crawl-history.json', []) || []).slice(-1)[0]; score = letzter && typeof letzter.score === 'number' ? letzter.score : undefined;
    gsc = lies('gsc.json', null) || { connected: false };
  }
  const quelle = beispiel ? 'BEISPIELDATEN (frei erfunden, kein Zustand der Website)' : 'echte Befunde aus dem Datenordner';
  const an = String(cfg.notify && cfg.notify.to ? cfg.notify.to : '') || '(kein Empfänger hinterlegt – SEO_NOTIFY_TO)';
  const render = it => `An: ${an}\nVon: "${notify.ABSENDER_NAME}" <angemeldetes Postfach (SMTP_USER)>\nBetreff: ${it.subject}\nKanal: ${it.channel}${it.skip ? ' – WÜRDE NICHT GESENDET (keine relevanten Veränderungen)' : ''}\n\n${it.body}\n`;
  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, kopf, items) => { fs.writeFileSync(path.join(OUT, name), `# TESTVORSCHAU – nicht versendet, erzeugt ${new Date().toISOString()}\n# Datengrundlage: ${quelle}\n${kopf ? '# ' + kopf + '\n' : ''}\n` + (items.length ? items.map(render).join('\n----\n\n') : '(keine Meldung)\n')); console.log('✓', path.join('previews', name)); };
  // Jede Vorschau bekommt einen frischen Stand aus der Kopie; das Zeitfenster wird nur im Speicher gesetzt
  const mit = fenster => { const s = new IssueStore(tmp); s.state.lastDigest = fenster; return s; };
  const ohneSofort = items => items.filter(i => i.channel !== 'sofort');
  const extra = { score, gsc };
  write('01-tageszusammenfassung.txt', 'Zeitfenster: letzte 24 Stunden', ohneSofort(notify.build(mit({ tag: vor(1), woche: vor(7), monat: vor(30) }), cfg, 'daily', extra)));
  write('02-tageszusammenfassung-ohne-neuigkeiten.txt', 'Zeitfenster künstlich auf „jetzt“ gesetzt: nichts Neues → keine Mail', ohneSofort(notify.build(mit({ tag: new Date(Date.now() + 60000).toISOString() }), cfg, 'daily', extra)));
  write('03-wochenzusammenfassung.txt', 'Zeitfenster: letzte 7 Tage', ohneSofort(notify.build(mit({ tag: vor(1), woche: vor(7), monat: vor(30) }), cfg, 'weekly', extra)));
  write('04-monatszusammenfassung.txt', 'Zeitfenster: letzte 30 Tage', ohneSofort(notify.build(mit({ tag: vor(1), woche: vor(7), monat: vor(30) }), cfg, 'monthly', extra)));
  // Sofortmeldung: simulierter kritischer Befund in der Kopie – die echten Daten bleiben unverändert
  const sim = new IssueStore(tmp); sim.apply([SIMULIERT], { runId: 'vorschau', scope: [], kind: 'daily' });
  write('05-sofortmeldung-SIMULIERT.txt', 'ACHTUNG: Der mit „SIMULIERT“ markierte kritische Befund ist erfunden, kein echter Zustand der Website.', notify.build(sim, cfg, 'daily', extra).filter(i => i.channel === 'sofort'));
  console.log(`Vorschauen geschrieben (${beispiel ? 'Beispieldaten' : 'echte Befunde'}) – nichts versendet.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
