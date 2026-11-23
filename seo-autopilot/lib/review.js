'use strict';
// ─── Bearbeitungsstatus je Befund (Review-Workflow) ──────────────────────────
// Getrennt vom automatischen Status der Befundliste (offen/behoben/wieder), weil die
// Live-Seite unverändert bleibt: Ein Punkt kann dort „offen“ sein und trotzdem
// lokal behoben oder freigegeben. Status: offen | in_pruefung | lokal_behoben | freigegeben.
// Datei: review.json – { id: { state, note, at, history: [{state, note, at}] } }
// Geschrieben wird sie NUR vom SEO Center: auf der Website von public/seo/daten.php (dort mit
// Dateisperre), lokal von server.js über lib/api.js. Die Prüfung hier entspricht der in PHP;
// der Prüflauf selbst liest die Datei höchstens.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const STATES = ['offen', 'in_pruefung', 'lokal_behoben', 'freigegeben'];
const LABELS = { offen: 'Offen', in_pruefung: 'In Prüfung', lokal_behoben: 'Lokal behoben', freigegeben: 'Freigegeben' };
const ID_RE = /^[a-f0-9]{12}$/;
const NOTE_MAX = 500;
const HISTORY_MAX = 50;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Fehler mit HTTP-Status (400 ungültige Eingabe, 404 unbekannter Befund). */
class ReviewError extends Error { constructor(status, message) { super(message); this.name = 'ReviewError'; this.status = status; } }

/** Erst in eine Nachbardatei schreiben, dann umbenennen: Leser sehen nie eine halbe Datei. */
function writeAtomic(file, data) {
  const dir = path.dirname(file); fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, '.neu-' + crypto.randomBytes(8).toString('hex'));
  try { fs.writeFileSync(tmp, data, { flag: 'wx' }); fs.renameSync(tmp, file); }
  catch (e) { try { fs.unlinkSync(tmp); } catch (_) { /* nichts aufzuräumen */ } throw e; }
}

/** Gibt es den Befund in issues.json? Bearbeitungsstände für erfundene IDs werden nicht angelegt. */
function issueKnown(dataDir, id) {
  let raw; try { raw = fs.readFileSync(path.join(dataDir, 'issues.json'), 'utf8'); } catch (_) { return false; }
  if (!raw.includes('"' + id + '"')) return false;   // schneller Ausschluss, bevor die große Liste geparst wird
  let j; try { j = JSON.parse(raw); } catch (_) { return false; }
  const all = j && j.issues;
  return !!all && typeof all === 'object' && !Array.isArray(all) && own(all, id) && all[id] !== null && all[id] !== undefined;
}

class ReviewStore {
  constructor(dataDir) {
    this.dir = dataDir; this.file = path.join(dataDir, 'review.json'); this.state = {}; this.damaged = false;
    let raw = ''; try { raw = fs.readFileSync(this.file, 'utf8'); } catch (_) { /* noch kein Stand */ }
    if (raw.trim()) {
      let j = null; try { j = JSON.parse(raw); } catch (_) { /* unlesbar */ }
      if (j && typeof j === 'object' && !Array.isArray(j)) this.state = j; else this.damaged = true;
    }
  }
  get(id) { const e = own(this.state, id) ? this.state[id] : null; return e && typeof e === 'object' ? e : { state: 'offen', note: '', at: null, history: [] }; }
  all() { return this.state; }
  /** Setzt den Status eines bekannten Befunds. Wirft ReviewError bei ungültiger Eingabe (400) oder unbekannter ID (404). */
  set(id, state, note = '') {
    if (typeof id !== 'string' || !ID_RE.test(id)) throw new ReviewError(400, 'Ungültige Befund-ID');
    if (typeof state !== 'string' || !STATES.includes(state)) throw new ReviewError(400, 'Ungültiger Status');
    if (note === null || note === undefined) note = '';
    if (typeof note !== 'string') throw new ReviewError(400, 'Ungültige Notiz');
    if ([...note].length > NOTE_MAX) throw new ReviewError(400, `Notiz zu lang (höchstens ${NOTE_MAX} Zeichen)`);
    if (!issueKnown(this.dir, id)) throw new ReviewError(404, 'Befund nicht gefunden');
    const now = new Date().toISOString(); const cur = this.get(id);
    const entry = { state, note, at: now, history: [...(Array.isArray(cur.history) ? cur.history : []), { state, note, at: now }].slice(-HISTORY_MAX) };
    this.state[id] = entry; this.save(); return entry;
  }
  save() {
    // Unlesbaren Stand aufheben, statt ihn stillschweigend zu überschreiben.
    if (this.damaged) { try { fs.copyFileSync(this.file, path.join(this.dir, 'review.beschaedigt.json')); } catch (_) { /* dann eben ohne Kopie */ } this.damaged = false; }
    writeAtomic(this.file, JSON.stringify(this.state, null, 1));
  }
  /** Zusammenfassung: Anzahl je Status für die angegebenen Befunde. */
  counts(ids) {
    const c = { offen: 0, in_pruefung: 0, lokal_behoben: 0, freigegeben: 0 };
    for (const id of ids) { const s = this.get(id).state; c[s] = (c[s] || 0) + 1; }
    return c;
  }
}
module.exports = { ReviewStore, ReviewError, STATES, LABELS, ID_RE, NOTE_MAX, HISTORY_MAX, writeAtomic, issueKnown };
