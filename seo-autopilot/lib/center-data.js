'use strict';
// ─── Vorberechnete Übersicht und Berichtsindex für das SEO Center ────────────
// Auf der Website läuft das SEO Center ohne Node: public/seo/daten.php liefert nur Dateien aus.
// Was sonst ein Server je Aufruf berechnen müsste (Kennzahlen, Verlauf, Zeitplan, Berichtsliste),
// entsteht deshalb hier am Ende jedes Prüflaufs:
//   uebersicht.json      Kennzahlen, Verlauf, wichtigste Maßnahmen, Regelgruppen, Zeitplan
//   reports/index.json   Liste der Berichte – je Lauf fortgeschrieben, nicht per Ordnerliste,
//                        weil der Prüflauf die älteren Berichte gar nicht bei sich hat
// Reine Funktion der Dateien im Datenordner und der Konfiguration: kein Netz, und fehlende oder
// unlesbare Dateien führen zu leeren Werten statt zu einem Abbruch. Zähler zum Bearbeitungsstand
// stehen bewusst nicht in der Übersicht: Die berechnet die Oberfläche aus review.json, das sich
// zwischen zwei Läufen ändert.
const fs = require('fs');
const path = require('path');
const { writeAtomic } = require('./review');

/** Format-Version von uebersicht.json. */
const VERSION = 1;
/** Berichte bleiben so viele Tage im Index (und damit auf dem Server). */
const KEEP_DAYS = 180;
const REPORT_MD = /^(daily|weekly|monthly)-[A-Za-z0-9._-]+\.md$/;
const SEVERITY = ['kritisch', 'hoch', 'mittel', 'niedrig', 'info'];
/** Schlüssel in ruleGroups → Regelmodul in lib/rules/ und Anzeigename, falls das Modul keinen nennt (Export „gruppe“). */
const GROUPS = [
  ['technik', 'technical', 'Technisches SEO'], ['meta', 'meta', 'Meta-Angaben'], ['schema', 'schema', 'Strukturierte Daten'],
  ['inhalt', 'content', 'Inhalte'], ['faq', 'faq', 'FAQ'], ['kfz', 'kfz', 'Preise, Marke und Pflichtangaben'],
];

const readJson = (file, def) => { try { const t = fs.readFileSync(file, 'utf8'); return t.trim() ? JSON.parse(t) : def; } catch (_) { return def; } };
const arr = x => (Array.isArray(x) ? x : []);
const obj = x => (x && typeof x === 'object' && !Array.isArray(x) ? x : null);
const num = x => (typeof x === 'number' && Number.isFinite(x) ? x : null);
const time = x => { const t = typeof x === 'string' ? Date.parse(x) : NaN; return Number.isFinite(t) ? t : null; };

/** Regel-IDs je Gruppe aus den Regelmodulen. Fehlt ein Modul oder lässt es sich nicht laden, bleibt die Gruppe leer. */
function loadRuleGroups(rulesDir) {
  const ruleGroups = {}; const ruleGroupLabels = {}; const ruleLabels = {}; const skipped = [];
  for (const [key, file, label] of GROUPS) {
    ruleGroups[key] = []; ruleGroupLabels[key] = label;
    let mod = null; try { mod = require(path.join(rulesDir, file + '.js')); } catch (_) { skipped.push(file); continue; }
    if (!mod || typeof mod !== 'object') { skipped.push(file); continue; }
    ruleGroups[key] = [...new Set(arr(mod.rules).filter(r => typeof r === 'string' && r))];
    if (typeof mod.gruppe === 'string' && mod.gruppe.trim()) ruleGroupLabels[key] = mod.gruppe.trim();
    const texte = obj(mod.labels) || obj(mod.ruleLabels);
    if (texte) for (const [id, t] of Object.entries(texte)) if (typeof t === 'string' && t) ruleLabels[id] = t;
  }
  return { ruleGroups, ruleGroupLabels, ruleLabels, skipped };
}

/** Indexeintrag eines Berichts aus seiner JSON-Begleitdatei (j darf leer sein). */
function reportEntry(file, j, mtimeMs) {
  const m = /^(daily|weekly|monthly)-(\d{4}-\d{2}-\d{2})?/.exec(file);
  const at = time(j.generatedAt) !== null ? j.generatedAt : m[2] ? m[2] + 'T00:00:00.000Z' : mtimeMs ? new Date(mtimeMs).toISOString() : null;
  return { file, kind: typeof j.kind === 'string' ? j.kind : m[1], at, score: num(j.score), open: num(j.open), kritisch: num(j.kritisch), hoch: num(j.hoch), neu: num(j.neu), behoben: num(j.behoben) };
}

/**
 * Berichtsindex fortschreiben: bisheriger Index + Berichte, die im Ordner liegen (die gewinnen,
 * ein zweiter Lauf am selben Tag überschreibt die Datei). Einträge älter als KEEP_DAYS entfallen;
 * der Server löscht die zugehörigen Dateien, sobald er den Index erhält. Absteigend nach Zeit.
 */
function buildIndex(dataDir, now = Date.now()) {
  const dir = path.join(dataDir, 'reports'); const byFile = new Map();
  for (const e of arr(readJson(path.join(dir, 'index.json'), []))) {
    if (!obj(e) || typeof e.file !== 'string' || !REPORT_MD.test(e.file) || time(e.at) === null) continue;
    byFile.set(e.file, { file: e.file, kind: typeof e.kind === 'string' ? e.kind : e.file.split('-')[0], at: e.at, score: num(e.score), open: num(e.open), kritisch: num(e.kritisch), hoch: num(e.hoch), neu: num(e.neu), behoben: num(e.behoben) });
  }
  let files = []; try { files = fs.readdirSync(dir); } catch (_) { /* noch keine Berichte */ }
  for (const f of files) {
    if (!REPORT_MD.test(f)) continue;
    let mtimeMs = 0; try { mtimeMs = fs.statSync(path.join(dir, f)).mtimeMs; } catch (_) { /* egal */ }
    const e = reportEntry(f, obj(readJson(path.join(dir, f.replace(/\.md$/, '.json')), null)) || {}, mtimeMs);
    if (e.at) byFile.set(f, e);
  }
  const limit = now - KEEP_DAYS * 86400e3;
  return [...byFile.values()].filter(e => time(e.at) >= limit).sort((a, b) => time(b.at) - time(a.at) || (a.file < b.file ? 1 : -1));
}

/** Zählung aus last-crawl.json, falls der Verlauf sie (noch) nicht enthält. */
function crawlCounts(lastCrawl) {
  const pages = obj(lastCrawl && lastCrawl.pages) ? Object.values(lastCrawl.pages).filter(obj) : [];
  if (!pages.some(p => typeof p.indexable === 'boolean')) return null;
  const out = { indexable: 0, noindex: 0, typen: {} };
  for (const p of pages) {
    const t = typeof p.typ === 'string' && p.typ ? p.typ : 'sonst'; const z = out.typen[t] || (out.typen[t] = { gesamt: 0, indexable: 0 });
    z.gesamt++; if (p.indexable) { z.indexable++; out.indexable++; } if (p.noindex) out.noindex++;
  }
  return out;
}

/** Ein Lauf gilt als überfällig, wenn der letzte seiner Art länger als so viele Tage zurückliegt. */
const FRIST_TAGE = { daily: 3, weekly: 9, monthly: 33 };
const datum = at => new Date(at).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Zeitplan und Schutzmechanismen in Worten (die Läufe startet GitHub Actions, nicht dieser Rechner). */
function schedule(cfg, runs, now = Date.now()) {
  const lauf = (kind, name, wann) => {
    // Fällt der 1. auf einen Montag, ersetzt der Monatslauf den Wochenlauf (er enthält alle Wochenprüfungen) – er zählt dann als Wochenlauf
    const arten = kind === 'weekly' ? ['weekly', 'monthly'] : [kind];
    let letzter = null; for (const r of runs) if (r && arten.includes(r.kind) && time(r.at) !== null && (letzter === null || time(r.at) > time(letzter))) letzter = r.at;
    // Status aus den Daten: Die Oberfläche zeigt „aktiv …“ grün, alles andere als Hinweis. Weil diese Datei nur bei einem Lauf
    // entsteht, rechnet die Oberfläche den Status mit letzter und fristTage zum Zeitpunkt des Aufrufs neu (bleiben Läufe aus → „überfällig“).
    const status = !letzter ? 'noch kein Lauf' : `${now - time(letzter) <= FRIST_TAGE[kind] * 86400e3 ? 'aktiv' : 'überfällig'} · zuletzt ${datum(letzter)}`;
    return { name, wann, cmd: 'autopilot.js ' + kind, status, letzter, kind, fristTage: FRIST_TAGE[kind] };
  };
  const c = obj(cfg && cfg.crawl) || {};
  return {
    geplant: [
      lauf('daily', 'Tageslauf – Erreichbarkeit, Technik, Meta-Angaben, Preise, Marke und Platzhalter, Tagesbericht', 'täglich ca. 05:30–06:30 Uhr'),
      lauf('weekly', 'Wochenlauf – zusätzlich Inhalte, FAQ, strukturierte Daten, Search Console, Chancen, Wochenbericht', 'montags'),
      lauf('monthly', 'Monatslauf – vollständige Prüfung und Monatsbericht', 'am 1. des Monats'),
    ],
    schutz: [
      'Der Autopilot liest die Website nur (GET/HEAD) und ändert nichts daran – kein Deploy, keine Änderung am Repository.',
      'Vor jedem Lauf wird der gespeicherte Stand vom SEO Center geholt. Ist es nicht erreichbar, startet der Lauf nicht (kein Lauf mit leerem Stand).',
      'Weicht ein Lauf stark vom Vorlauf ab (z. B. Netz- oder Serverproblem), gilt er als unsicher: Nichts wird als behoben geschlossen, es gibt keine Sofortmeldung.',
      'Der Bearbeitungsstand der Befunde wird nur im SEO Center gespeichert und von keinem Lauf überschrieben.',
      `Schonender Abruf: höchstens ${num(c.concurrency) || 3} Seiten gleichzeitig, ${num(c.delayMs) !== null ? c.delayMs : 200} ms Pause, höchstens ${num(c.maxPages) || 2500} Seiten je Lauf.`,
      'Keine KI-Aufrufe: nur Abrufe der eigenen Website und – falls eingerichtet – der Search-Console-Schnittstelle.',
      'E-Mails gehen nur hinaus, wenn der Versand eingeschaltet und ein Empfänger hinterlegt ist.',
    ],
    hinweis: 'Die Läufe startet GitHub Actions nach Zeitplan; die Uhrzeit verschiebt sich mit der Sommerzeit um eine Stunde und kann sich bei hoher Auslastung verzögern. GitHub pausiert Zeitpläne nach 60 Tagen ohne Aktivität im Repository – bleibt der letzte Lauf länger als zwei Tage aus, den Workflow in GitHub prüfen.',
  };
}

/** Inhalt von uebersicht.json. opts: now (ms), rulesDir, index (bereits berechneter Berichtsindex). */
function buildOverview(cfg, dataDir, opts = {}) {
  cfg = cfg || {}; const now = opts.now || Date.now();
  const J = (name, def) => readJson(path.join(dataDir, name), def);
  const st = obj(J('issues.json', null)) || {};
  const all = obj(st.issues) ? Object.values(st.issues).filter(obj) : [];
  const runs = arr(st.runs).filter(obj);
  const open = all.filter(i => i.status === 'offen').sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity));
  const hist = arr(J('crawl-history.json', [])).filter(obj);
  const last = hist[hist.length - 1] || null; const lastRun = runs[runs.length - 1] || null;
  const index = opts.index || buildIndex(dataDir, now);
  const by = s => open.filter(i => i.severity === s).length;
  const since = new Date(now - 7 * 86400e3).toISOString();
  // Sammelbefunde (key „alle:…“) hängen an der Startseite, die betroffenen Seiten stehen nur in examples: beides mitgeben (nur die Adressen)
  const sammel = i => typeof i.key === 'string' && i.key.startsWith('alle:') ? { key: i.key, examples: arr(i.examples).filter(e => obj(e) && typeof e.url === 'string' && e.url).slice(0, 5).map(e => ({ url: e.url })) } : {};
  const brief = i => ({ id: i.id, rule: i.rule, severity: i.severity, url: i.url, title: i.title, count: i.count || 1, approval: i.approval, ...sammel(i) });

  // Score: aus dem Verlauf des Crawls; ältere Stände ohne Score → Berichtsindex bzw. neuester latest-*-Bericht
  const latest = ['daily', 'weekly', 'monthly'].map(k => obj(J(`reports/latest-${k}.json`, null))).filter(j => j && time(j.generatedAt) !== null).sort((a, b) => time(b.generatedAt) - time(a.generatedAt));
  let scoreHistory = hist.filter(h => num(h.score) !== null && time(h.at) !== null).map(h => ({ at: h.at, score: h.score, kind: h.kind }));
  if (!scoreHistory.length) scoreHistory = index.filter(e => num(e.score) !== null).map(e => ({ at: e.at, score: e.score, kind: e.kind })).reverse();
  if (!scoreHistory.length) scoreHistory = latest.filter(j => num(j.score) !== null).map(j => ({ at: j.generatedAt, score: j.score, kind: j.kind })).reverse();
  const score = last && num(last.score) !== null ? last.score : latest.length && num(latest[0].score) !== null ? latest[0].score : null;

  // Änderungen des letzten Laufs: alles, was seit dessen Zeitstempel neu, behoben oder wieder aufgetreten ist
  const lastAt = lastRun && typeof lastRun.at === 'string' ? lastRun.at : null;
  const lastChanges = lastAt ? { at: lastAt, new: all.filter(i => i.first_seen >= lastAt).map(brief), resolved: all.filter(i => i.status === 'behoben' && i.resolved_at >= lastAt).map(brief), reopened: all.filter(i => i.reopened_at >= lastAt).map(brief) } : null;
  const suspicious = !!(lastRun && lastRun.suspicious);

  // Seitenzahlen: aus dem Verlauf, sonst aus dem letzten Crawl nachgezählt
  let zaehlung = last && num(last.indexable) !== null ? { indexable: last.indexable, noindex: num(last.noindex), typen: obj(last.typen) || {} } : null;
  if (!zaehlung) zaehlung = crawlCounts(J('last-crawl.json', null)) || { indexable: null, noindex: null, typen: {} };

  let topActions = []; let recurring = [];
  try { const actions = require('./actions'); topActions = actions.topActions(all, cfg, 5); recurring = actions.recurring(all).slice(0, 20); } catch (_) { /* Übersicht bleibt ohne Maßnahmenliste nutzbar */ }

  const groups = loadRuleGroups(opts.rulesDir || path.join(__dirname, 'rules'));
  const grouped = new Set(Object.values(groups.ruleGroups).flat());
  const byRule = Object.entries(open.reduce((a, i) => { a[i.rule] = (a[i.rule] || 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));

  const g = obj(J('gsc-status.json', null)); const property = (g && typeof g.property === 'string' && g.property) || (obj(cfg.gsc) && cfg.gsc.property) || undefined;
  const gsc = g ? { connected: !!g.connected, ...(g.reason ? { reason: String(g.reason) } : {}), ...(property ? { property } : {}), ...(g.checkedAt ? { checkedAt: g.checkedAt } : {}) }
    : { connected: false, reason: 'Noch kein Prüflauf mit Search-Console-Abfrage vorhanden.', ...(property ? { property } : {}) };

  return {
    erzeugt: new Date(now).toISOString(), base: cfg.base || null, score, scoreHistory: scoreHistory.slice(-120), lastChanges,
    lastRunSuspicious: suspicious ? (lastRun.note || 'abweichender Lauf') : null, suspiciousReasons: suspicious && lastRun.note ? String(lastRun.note).split(/;\s*/).filter(Boolean) : [],
    topActions, recurring, approvalNeeded: open.filter(i => i.approval && i.approval !== 'auto').length,
    open: open.length, kritisch: by('kritisch'), hoch: by('hoch'), mittel: by('mittel'), niedrig: by('niedrig'),
    gepruefte: last && num(last.crawled) !== null ? last.crawled : 0, indexable: zaehlung.indexable, noindex: zaehlung.noindex, typen: zaehlung.typen,
    neu7: all.filter(i => i.first_seen >= since && i.status === 'offen').length, behoben7: all.filter(i => i.status === 'behoben' && i.resolved_at >= since).length,
    letzterLauf: lastRun, laeufe: runs.slice(-30), crawlHistory: hist.slice(-30), statusVerteilung: last && obj(last.status) ? last.status : {}, byRule,
    ruleGroups: groups.ruleGroups, ruleGroupLabels: groups.ruleGroupLabels, ruleLabels: groups.ruleLabels,
    ruleUngrouped: [...new Set(all.map(i => i.rule).filter(r => typeof r === 'string' && !grouped.has(r)))].sort(),
    gsc, notify: { enabled: !!(obj(cfg.notify) && cfg.notify.enabled) }, zeitplan: schedule(cfg, runs, now), version: VERSION,
  };
}

/** Schreibt nur reports/index.json fort (bin/sync.js ruft das vor dem Hochladen auf). */
function writeIndex(dataDir, now = Date.now()) {
  const index = buildIndex(dataDir, now);
  writeAtomic(path.join(dataDir, 'reports', 'index.json'), JSON.stringify(index, null, 1));
  return index;
}

/** Schreibt reports/index.json und uebersicht.json. Aufruf am Ende jedes Prüflaufs (auch bei „unsicher“). */
function writeAll(cfg, dataDir, opts = {}) {
  dataDir = dataDir || (cfg && cfg.dataDir); const now = opts.now || Date.now();
  const index = writeIndex(dataDir, now);
  const uebersicht = buildOverview(cfg, dataDir, { ...opts, now, index });
  writeAtomic(path.join(dataDir, 'uebersicht.json'), JSON.stringify(uebersicht, null, 1));
  return { uebersicht, index };
}
module.exports = { writeAll, writeIndex, buildOverview, buildIndex, loadRuleGroups, schedule, VERSION, KEEP_DAYS };
