'use strict';
// ─── Issue-Store: Fingerprints, Historie, Status (offen/behoben), Deduplizierung ─
// Jede Prüfregel liefert Findings { rule, severity, url?, file?, title, detail, suggestion?, approval?, key?, count?, examples? }.
// Der Store vergibt stabile IDs (Hash aus rule + url/file + key bzw. Titel), merkt first_seen/last_seen,
// markiert verschwundene Findings als behoben und schreibt eine Historie je Lauf.
// Geschrieben wird atomar. Eine beschädigte issues.json führt zum Abbruch mit klarer Meldung –
// die Befund-Historie wird nie stillschweigend durch eine leere ersetzt.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeJsonAtomic } = require('./util');

const SEVERITY = ['kritisch', 'hoch', 'mittel', 'niedrig', 'info'];
const AUFBEWAHRUNG_TAGE = 180; // behobene Befunde bleiben so lange in der Historie
const DIGEST_ARTEN = ['tag', 'woche', 'monat'];

function fingerprint(f) {
  const key = f.key || f.title;
  return crypto.createHash('sha1').update([f.rule, f.url || f.file || '', key].join('|')).digest('hex').slice(0, 12);
}
function beschaedigt(file, warum) {
  const e = new Error(`issues.json ist beschädigt (${warum}): ${file}\nDer Lauf wird abgebrochen, damit die Befund-Historie nicht verloren geht. Datei aus der letzten Sicherung/dem SEO Center wiederherstellen – oder bewusst umbenennen, um mit leerer Historie neu zu beginnen.`);
  e.code = 'ISSUES_BESCHAEDIGT'; return e;
}
function laden(file) {
  if (!fs.existsSync(file)) return { issues: {}, runs: [] };
  let st;
  try { st = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { throw beschaedigt(file, 'kein gültiges JSON'); }
  if (!st || typeof st !== 'object' || Array.isArray(st) || !st.issues || typeof st.issues !== 'object' || Array.isArray(st.issues) || !Array.isArray(st.runs)) throw beschaedigt(file, 'unerwarteter Aufbau');
  return st;
}
/** Zeitpunkt der letzten Zusammenfassung je Meldungsart: { tag, woche, monat } (ältere Stände kannten nur einen gemeinsamen Zeitpunkt). */
function digestObjekt(v) {
  const alle = typeof v === 'string' ? v : null; const o = v && typeof v === 'object' ? v : {};
  const out = {}; for (const a of DIGEST_ARTEN) out[a] = o[a] || alle || null; return out;
}

class IssueStore {
  constructor(dataDir) {
    this.dir = dataDir; this.file = path.join(dataDir, 'issues.json');
    fs.mkdirSync(dataDir, { recursive: true });
    this.state = laden(this.file);
    this.state.lastDigest = digestObjekt(this.state.lastDigest);
  }
  /**
   * Findings eines Laufs einspielen. scope: Regel-Namen, die in diesem Lauf vollständig geprüft wurden (nur dort wird
   * "behoben" abgeleitet). Ein Eintrag „regel:schlüssel“ gilt nur für Befunde dieser Regel mit genau diesem Schlüssel
   * (z. B. „autopilot-modul:content“: den Ausfall eines Moduls schließt nur ein Lauf, der das Modul ausgeführt hat).
   */
  apply(findings, { runId, scope, kind, suspicious = false, note = '' }) {
    const now = new Date().toISOString(); const seenIds = new Set();
    const umfang = new Set(scope || []); const geprueft = it => umfang.has(it.rule) || (it.key != null && umfang.has(it.rule + ':' + it.key));
    const summary = { new: [], resolved: [], reopened: [], removed: 0, open: 0, bySeverity: {} };
    for (const f of findings) {
      const id = fingerprint(f);
      if (seenIds.has(id)) continue; // derselbe Befund doppelt im selben Lauf zählt einmal
      seenIds.add(id);
      const cur = this.state.issues[id];
      if (!cur) { this.state.issues[id] = { ...f, id, status: 'offen', first_seen: now, last_seen: now, runs: 1, notified: null }; summary.new.push(id); continue; }
      // Bekannter Befund: alle Inhaltsfelder (auch count, examples, key, title, detail) kommen aus dem aktuellen Lauf,
      // die Verwaltungsfelder bleiben erhalten.
      const wasResolved = cur.status === 'behoben';
      const next = { ...f, id, status: 'offen', first_seen: cur.first_seen, last_seen: now, runs: (cur.runs || 0) + 1, notified: cur.notified || null };
      if (cur.reopened_at) next.reopened_at = cur.reopened_at;
      if (cur.reopen_count) next.reopen_count = cur.reopen_count;
      if (wasResolved) { next.reopened_at = now; next.reopen_count = (cur.reopen_count || 0) + 1; next.notified = null; summary.reopened.push(id); } // erneut aufgetreten → darf erneut gemeldet werden
      this.state.issues[id] = next;
    }
    // Bei verdächtigem Lauf (Crawler-/Netzproblem) wird NICHTS als behoben geschlossen – sonst würden alle Punkte
    // fälschlich „gelöst“ und beim nächsten Lauf als „wieder aufgetreten“ gezählt.
    if (!suspicious) for (const [id, it] of Object.entries(this.state.issues)) {
      if (it.status === 'offen' && !seenIds.has(id) && geprueft(it)) { it.status = 'behoben'; it.resolved_at = now; summary.resolved.push(id); }
    }
    summary.removed = this.prune();
    for (const it of Object.values(this.state.issues)) if (it.status === 'offen') { summary.open++; summary.bySeverity[it.severity] = (summary.bySeverity[it.severity] || 0) + 1; }
    this.state.runs.push({ runId, kind, at: now, findings: seenIds.size, new: summary.new.length, resolved: summary.resolved.length, reopened: summary.reopened.length, open: summary.open, bySeverity: summary.bySeverity, suspicious: !!suspicious, note: note || undefined });
    if (this.state.runs.length > 400) this.state.runs = this.state.runs.slice(-400);
    this.save();
    return summary;
  }
  /** Behobene Befunde entfernen, die länger als 180 Tage behoben sind (begrenzt das Wachstum der Datei). */
  prune(days = AUFBEWAHRUNG_TAGE, now = Date.now()) {
    const grenze = new Date(now - days * 86400e3).toISOString(); let n = 0;
    for (const [id, it] of Object.entries(this.state.issues)) if (it.status === 'behoben' && it.resolved_at && it.resolved_at < grenze) { delete this.state.issues[id]; n++; }
    return n;
  }
  open() { return Object.values(this.state.issues).filter(i => i.status === 'offen').sort((a, b) => SEVERITY.indexOf(a.severity) - SEVERITY.indexOf(b.severity)); }
  all() { return Object.values(this.state.issues); }
  get(id) { return this.state.issues[id]; }
  markNotified(ids, channel) { const now = new Date().toISOString(); for (const id of ids) if (this.state.issues[id]) this.state.issues[id].notified = { at: now, channel }; this.save(); }
  /** Zeitpunkt der letzten Zusammenfassung einer Art ('tag' | 'woche' | 'monat') lesen bzw. setzen. */
  digestSeit(art) { return this.state.lastDigest[art] || null; }
  setzeDigest(art, iso = new Date().toISOString()) { if (!DIGEST_ARTEN.includes(art)) throw new Error('Unbekannte Meldungsart: ' + art); this.state.lastDigest = digestObjekt(this.state.lastDigest); this.state.lastDigest[art] = iso; this.save(); }
  /** Zusatzangaben (z. B. score) am Historieneintrag eines Laufs ergänzen. */
  ergaenzeLauf(runId, extra) { const r = this.state.runs.find(x => x.runId === runId); if (r) { Object.assign(r, extra); this.save(); } return r || null; }
  save() { writeJsonAtomic(this.file, this.state, 1); }
}
module.exports = { IssueStore, fingerprint, SEVERITY, AUFBEWAHRUNG_TAGE };
