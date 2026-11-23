'use strict';
// ─── Gemeinsame Helfer für Crawler, Regeln, Berichte ─────────────────────────
// Textnormalisierung, Seitentypen, Seitenfamilien, noindex-Erkennung und sicheres
// (atomares) Lesen/Schreiben der JSON-Datendateien. Keine Abhängigkeiten.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Unsichtbare Zeichen, die in Texten nichts verloren haben und Suchmuster brechen:
// Wortverbinder (U+2060), weiches Trennzeichen (U+00AD), Nullbreite (U+200B–U+200D), BOM (U+FEFF)
const UNSICHTBAR = /[\u2060\u00AD\u200B-\u200D\uFEFF]/g;

/** Text vereinheitlichen: unsichtbare Zeichen raus, geschützte/schmale Leerzeichen → Leerzeichen, Mehrfach-Leerraum → eins. */
function norm(s) {
  return String(s == null ? '' : s).replace(UNSICHTBAR, '').replace(/\s+/g, ' ').trim(); // \s enthält U+00A0 und U+202F
}

/** Pfad einer URL (`/preise/`); bei relativen Angaben der Teil vor ?/#. */
function pathOf(u) {
  try { return new URL(u).pathname; } catch (_) { return String(u || '').split(/[?#]/)[0]; }
}
/** URL ohne Query-String und Fragment (`/auftrag/?leistung=x#top` → `/auftrag/`); ungültige Angaben unverändert. */
function stripQuery(u) {
  try { const x = new URL(u); x.hash = ''; x.search = ''; return x.href; } catch (_) { return u; }
}

// Bereiche mit Übersichtsseite (ein Segment) und Detailseiten (zwei Segmente)
const BEREICHE = { leistungen: 'leistung', ratgeber: 'ratgeber', 'kfz-zulassung': 'stadt', zulassungsstelle: 'behoerde', kennzeichen: 'kennzeichen', gewerbe: 'gewerbe', rechner: 'rechner', vorlagen: 'vorlage' };
const RECHT = new Set(['impressum', 'datenschutz', 'widerruf', 'servicebedingungen', 'agb']);
// Themen-Landingpages (/<slug>/). Feste Liste als Rückfallebene; neue Einträge aus lib/landingpages.ts
// der Website werden – falls die Datei lesbar ist – automatisch ergänzt.
const LANDING = ['kfz-zulassung-ohne-eid', 'auto-abmelden-ohne-eid', 'ikfz-funktioniert-nicht', 'ikfz-fehlermeldung', 'auto-online-anmelden', 'zulassungsdienst-online'];
let landingSet = null;
function landingSlugs() {
  if (landingSet) return landingSet;
  landingSet = new Set(LANDING);
  try {
    const src = fs.readFileSync(path.resolve(__dirname, '..', '..', 'lib', 'landingpages.ts'), 'utf8');
    for (const m of src.matchAll(/\bslug:\s*["']([a-z0-9-]+)["']/g)) landingSet.add(m[1]);
  } catch (_) { /* Quelle nicht vorhanden – feste Liste genügt */ }
  return landingSet;
}

/**
 * Seitentyp aus dem Pfad:
 * start | leistung | ratgeber | stadt | behoerde | kennzeichen | gewerbe | rechner | vorlage | landing | recht | hub | sonst
 * `hub` = Übersichtsseite eines Bereichs (/leistungen/, /zulassungsstelle/ …).
 */
function pageType(p) {
  const segs = pathOf(p).replace(/index\.html$/, '').split('/').filter(Boolean);
  if (!segs.length) return 'start';
  const a = segs[0];
  if (BEREICHE[a]) return segs.length === 1 ? 'hub' : BEREICHE[a];
  if (segs.length === 1) { if (RECHT.has(a)) return 'recht'; if (landingSlugs().has(a)) return 'landing'; }
  return 'sonst';
}

// Seitenfamilie: /zulassungsstelle/berlin/ → /zulassungsstelle/*/, /preise/ → /preise/, Startseite → /.
function family(p) {
  const segs = pathOf(p).split('/').filter(Boolean);
  if (!segs.length) return '/';
  return segs.length === 1 ? `/${segs[0]}/` : `/${segs[0]}/*/`;
}

/** noindex laut Meta-Tag (robots/googlebot, strengster Wert) ODER X-Robots-Tag-Header. Funktioniert auch für Einträge aus last-crawl.json. */
function isNoindex(rec) {
  if (!rec) return false;
  const meta = (rec.page && rec.page.robots) || '';
  const header = (rec.headers && rec.headers['x-robots-tag']) || '';
  return /\b(noindex|none)\b/i.test(meta + ' , ' + header);
}

/** Pfad in exakter Liste oder Treffer eines Musters (RegExp)? */
function matchesAny(p, exact, patterns) {
  if ((exact || []).includes(p)) return true;
  for (const re of patterns || []) { if (!(re instanceof RegExp)) continue; re.lastIndex = 0; if (re.test(p)) return true; }
  return false;
}

/** Datei atomar schreiben (erst Nachbardatei, dann umbenennen) – ein abgebrochener Lauf hinterlässt nie eine halbe Datei. */
function writeFileAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
  try { fs.writeFileSync(tmp, data); fs.renameSync(tmp, file); }
  catch (e) { try { fs.unlinkSync(tmp); } catch (_) { /* nichts aufzuräumen */ } throw e; }
  return file;
}
/** JSON atomar schreiben. `indent` Standard 1 (lesbar); 0 für große Dateien. */
function writeJsonAtomic(file, obj, indent) {
  return writeFileAtomic(file, JSON.stringify(obj, null, indent === undefined ? 1 : indent));
}
/** JSON lesen. Fehlt die Datei → `def`. Kaputtes JSON → `def` plus Warnung (kein Absturz). Der Dateiinhalt wird nie ausgegeben. */
function readJson(file, def) {
  let raw;
  try { raw = fs.readFileSync(file, 'utf8'); }
  catch (e) { if (e.code !== 'ENOENT') console.warn(`[seo-autopilot] ${path.basename(file)} nicht lesbar (${e.code || 'Fehler'}) – Standardwert wird verwendet.`); return def; }
  try { return JSON.parse(raw); }
  catch (_) { console.warn(`[seo-autopilot] ${path.basename(file)} enthält kein gültiges JSON – Standardwert wird verwendet.`); return def; }
}

const sha1 = s => crypto.createHash('sha1').update(String(s)).digest('hex');
const sleep = ms => new Promise(r => setTimeout(r, ms));
/** E-Mail-Adressen unkenntlich machen (für Konsolenausgaben – Actions-Logs sind öffentlich). */
const maskiere = s => String(s == null ? '' : s).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '…@…');

module.exports = { norm, pathOf, stripQuery, pageType, family, isNoindex, matchesAny, writeFileAtomic, writeJsonAtomic, readJson, sha1, sleep, maskiere, landingSlugs };
