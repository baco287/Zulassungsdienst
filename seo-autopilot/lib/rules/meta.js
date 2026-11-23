'use strict';
// ─── Meta-Regeln: Title, Description, Überschriften, Open Graph + Vorschläge ──
// Geprüft werden nur Seiten, die Google mit eigenem Title anzeigen kann: Status 200, HTML, nicht noindex
// (einheitlich rec.noindex), nicht per robots.txt gesperrt, Canonical auf sich selbst. Ausnahme: Auf wichtigen
// Seiten (cfg.importantPaths) müssen Title und H1 auch dann vorhanden sein, wenn die Seite bewusst noindex ist
// (Impressum, Datenschutz …). Die Fehlerseite des Exports und die Bestätigungsdatei der Search Console sind
// keine Inhaltsseiten und bleiben außen vor.
//
// Vorschläge entstehen ausschließlich aus dem Bestand der Seite (Title, H1, Haupttext ohne Skip-Link und
// Breadcrumb) und folgen beim Markenzusatz der Logik von fitTitle() in lib/seo.ts: Die Marke wird nur
// angehängt, wenn der Title damit höchstens 63 Zeichen lang ist. Ein Vorschlag, der schlechter wäre als der
// Bestand (zu kurz, zu lang oder ohne dessen Suchbegriffe), wird nicht gemacht – dann bleibt `proposed` leer.
// `key` enthält nie Zeichenzahlen: Messwerte stehen nur in title/detail.
const fs = require('fs');
const path = require('path');
const { norm, pathOf, isNoindex } = require('../util');

const GRUPPE = 'Meta & Überschriften';
const BRAND = ' | KFZ-Zulassungsprofis';
const TITLE_MAX = 63; // wie TITLE_MAX in lib/seo.ts: bis hierhin trägt ein Title den Markenzusatz
const TITLE_LANG = 65, TITLE_KURZ = 20, DESC_LANG = 165, DESC_KURZ = 50, DESC_ZIEL = 155;

const F = (rule, severity, o) => ({ rule, severity, approval: 'manuell', ...o });
const kanon = u => { try { const x = new URL(u); x.hash = ''; x.search = ''; return x.href.replace(/\/index\.html$/, '/'); } catch (_) { return String(u || ''); } };
const nx = rec => (typeof rec.noindex === 'boolean' ? rec.noindex : isNoindex(rec));
// Fehlerseite des Exports und Bestätigungsdatei der Search Console
const SONDERSEITE = /^\/(?:404|_not-found)(?:\.html|\/(?:index\.html)?)?$|^\/google[0-9a-z]+\.html$/i;
const STOP = new Set('der die das und oder für mit von zu im in den dem des ein eine einer eines ist sind auf an bei aus nach über unter vor als auch nicht wie bis um am zum zur sie wir ihr ihre ihren du dein deine was wer wo wann mehr alle jetzt hier so dass sich es er'.split(' '));
const tokens = s => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').split(' ').filter(w => w.length >= 4 && !STOP.has(w));
// Inhaltliche Wörter eines Titels in Grundform (für den Vergleich Bestand ↔ Vorschlag)
const stamm = w => (w.length > 5 ? w.replace(/(?:en|er|es|e|n|s)$/, '') : w);
const woerter = s => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').split(' ').filter(w => w.length >= 3 && !STOP.has(w)).map(stamm);
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Markenzusatz am Ende eines Titels entfernen („… | Marke“, „… – Marke“). */
function ohneMarke(title, brand = BRAND) {
  const name = String(brand).replace(/^[\s|–—-]+/, '').trim(); if (!name) return norm(title);
  return norm(String(title || '').replace(new RegExp(`\\s+[|–—-]\\s+${esc(name)}\\s*$`, 'i'), ''));
}
/** Wie fitTitle() in lib/seo.ts: Marke nur anhängen, wenn es in die Länge passt. */
const fitTitle = (kern, brand = BRAND) => (kern.length + brand.length <= TITLE_MAX ? kern + brand : kern);
/** An einer Wortgrenze kürzen, ohne mit Bindewort oder Satzzeichen zu enden. */
function kuerzen(s, max) {
  s = norm(s); if (s.length <= max) return s;
  let t = s.slice(0, max + 1).replace(/\s+\S*$/, '');
  for (let i = 0; i < 3; i++) t = t.replace(/[\s,;:–—&|(\/-]+$/, '').replace(/\s+(?:und|oder|für|mit|in|im|bei|zur|zum|der|die|das|den|dem|des|von|ohne|an|auf|ein|eine|einer|per)$/i, '');
  return t;
}
/** Taugt ein Kandidat als Title – und ist er nicht schlechter als der Bestand? */
function taugt(t, cur, brand) {
  if (!t || t === cur || t.length < TITLE_KURZ || t.length > TITLE_LANG) return false;
  if (!cur) return true;
  const soll = [...new Set(woerter(ohneMarke(cur, brand)))]; if (!soll.length) return true;
  const hat = new Set(woerter(t));
  return soll.filter(w => hat.has(w)).length / soll.length >= 0.6; // die Suchbegriffe des Bestands bleiben überwiegend erhalten
}
const GRUND = {
  'ohne-marke': 'Bestehender Title ohne Markenzusatz – so verfährt auch fitTitle() in lib/seo.ts, wenn Title und Marke zusammen länger als 63 Zeichen wären.',
  'h1': 'Aus der H1 der Seite abgeleitet; Markenzusatz nur, wenn er in die Länge passt (fitTitle in lib/seo.ts).',
  'mit-marke': 'Bestehender Title mit Markenzusatz ergänzt.',
  'h1-gekuerzt': 'Aus der H1 der Seite abgeleitet und an einer Wortgrenze gekürzt.',
};
/** Vorschlag für den Title: { text, grund } oder null, wenn sich nichts Besseres als der Bestand ergibt. */
function titelVorschlag(pg, cur, brand = BRAND) {
  cur = norm(cur); const h1 = norm(((pg && pg.h1) || [])[0]).replace(/[.!]+$/, '');
  const kern = cur ? ohneMarke(cur, brand) : ''; const kandidaten = [];
  if (kern && kern !== cur) kandidaten.push([kern, 'ohne-marke']);
  if (h1) kandidaten.push([h1, 'h1']);
  if (cur && kern === cur) kandidaten.push([cur, 'mit-marke']);
  if (!cur && h1.length > TITLE_MAX) kandidaten.push([kuerzen(h1, TITLE_MAX), 'h1-gekuerzt']);
  for (const [k, art] of kandidaten) for (const t of [fitTitle(k, brand), k]) if (taugt(t, cur, brand)) return { text: t, grund: GRUND[art] };
  return null;
}
/** Title-Vorschlag als Text ('' = kein Vorschlag). opts: { current, brand } */
function proposeTitle(pg, opts = {}) {
  const v = titelVorschlag(pg, opts.current !== undefined ? opts.current : pg && pg.title, opts.brand || BRAND);
  return v ? v.text : '';
}

const SKIP_LINK = /^(?:zum (?:haupt)?inhalt(?: springen)?|direkt zum inhalt|skip to (?:main )?content)\s*/i;
// Satzende: Punkt/Ausrufe-/Fragezeichen vor Großbuchstabe – nicht nach gängigen Abkürzungen (z. B., ca., inkl. …)
const SATZENDE = /(?<=[.!?])(?<!\b(?:z|B|ca|inkl|zzgl|ggf|bzw|Nr|Abs|Art|Dr|max|min|evtl|u|a|d|h|o|s|vgl|Tel|Std|St|Mo|Di|Mi|Do|Fr|Sa|So|usw)\.)\s+(?=[A-ZÄÖÜ„«])/;
/** Vollständige Sätze vom Anfang, solange sie in `max` Zeichen passen. */
function ganzeSaetze(txt, max) {
  let d = '';
  for (const s of String(txt).slice(0, 1500).split(SATZENDE)) { const n = (d + ' ' + s).trim(); if (n.length > max) break; d = n; }
  return /[.!?…]$/.test(d) ? d : '';
}
/** Description-Vorschlag aus dem Haupttext (pg.text: ohne Kopf, Fuß, Skip-Link, Breadcrumb); beginnt nach der H1. '' = kein Vorschlag. */
function proposeDescription(pg) {
  if (!pg) return '';
  let txt = norm(pg.text).replace(SKIP_LINK, ''); const brot = norm(pg.breadcrumbText);
  if (brot && txt.startsWith(brot)) txt = txt.slice(brot.length).trim().replace(SKIP_LINK, '');
  const h1 = norm((pg.h1 || [])[0]);
  if (h1) { const i = txt.indexOf(h1); if (i >= 0 && i <= 80) txt = txt.slice(i + h1.length).trim(); }
  if (txt.length < DESC_KURZ) return '';
  const d = ganzeSaetze(txt, DESC_ZIEL);
  if (d.length >= DESC_KURZ) return d;
  return txt.length <= DESC_ZIEL ? txt : kuerzen(txt, DESC_ZIEL - 1) + '…';
}
/** Zu lange Description kürzen: bevorzugt auf ganze Sätze, sonst an einer Wortgrenze. */
function kuerzeDescription(desc) {
  const d = ganzeSaetze(desc, DESC_ZIEL);
  return d.length >= 100 ? d : kuerzen(desc, DESC_ZIEL - 1) + '…';
}

/** Quelldatei einer Seite im Repository der Website (app/…/page.tsx, dynamische Ordner wie [slug] eingeschlossen); '' wenn nicht auffindbar. */
function quellFinder(repoRoot) {
  const memo = new Map(); const istOrdner = d => { try { return fs.statSync(d).isDirectory(); } catch (_) { return false; } };
  if (!repoRoot || !istOrdner(path.join(repoRoot, 'app'))) return () => '';
  return p => {
    if (memo.has(p)) return memo.get(p);
    let dir = path.join(repoRoot, 'app'), rel = 'app';
    for (const s of String(p).split('/').filter(Boolean)) {
      let next = /^[a-z0-9._-]+$/i.test(s) && istOrdner(path.join(dir, s)) ? s : '';
      if (!next) { try { next = fs.readdirSync(dir).find(n => /^\[[^\].]+\]$/.test(n) && istOrdner(path.join(dir, n))) || ''; } catch (_) { next = ''; } }
      if (!next) { rel = ''; break; }
      dir = path.join(dir, next); rel += '/' + next;
    }
    const f = rel && fs.existsSync(path.join(dir, 'page.tsx')) ? rel + '/page.tsx' : '';
    memo.set(p, f); return f;
  };
}

function run(ctx) {
  const { crawl, cfg } = ctx; const out = [];
  const brand = cfg.company && cfg.company.brand ? ' | ' + cfg.company.brand : BRAND;
  const wichtig = new Set(cfg.importantPaths || []); const quelle = quellFinder(cfg.repoRoot);
  const byTitle = new Map(), byDesc = new Map();
  for (const rec of crawl.pages.values()) {
    if (!rec.page || rec.status !== 200 || rec.redirectedTo) continue;
    const p = rec.path || pathOf(rec.url);
    if (SONDERSEITE.test(p) || /\/index\.html$/.test(p) || /\?/.test(rec.url)) continue;
    const pg = rec.page; const title = norm(pg.title), desc = norm(pg.description); const h1 = pg.h1 || []; const og = pg.og || {};
    const file = quelle(p); const M = (rule, severity, o) => out.push(F(rule, severity, { url: rec.url, ...(file ? { file } : {}), ...o }));
    const titleFehlt = () => { const v = titelVorschlag(pg, '', brand); M('title-fehlt', 'hoch', { key: 'fehlt', title: `Title fehlt: ${p}`, detail: 'Die Seite hat kein <title>-Element; Google bildet dann selbst eine Überschrift für den Suchtreffer.', current: '(leer)', proposed: v ? v.text : '', reason: v ? v.grund : '', suggestion: 'Title in den Metadaten der Seite setzen (metadata bzw. generateMetadata in app/…/page.tsx).' }); };
    const h1Fehlt = () => M('h1-fehlt', 'hoch', { key: 'fehlt', title: `H1 fehlt: ${p}`, detail: `Die Seite hat keine Hauptüberschrift. Title: ${title || '–'}`, proposed: title ? ohneMarke(title, brand) : '', reason: title ? 'Aus dem Title der Seite abgeleitet (ohne Markenzusatz).' : '', suggestion: 'Genau eine <h1> mit dem Thema der Seite ausgeben.' });

    if (nx(rec)) { // bewusst nicht indexierte Seite: nur das Nötigste, und nur auf wichtigen Seiten
      if (wichtig.has(p)) { if (!title) titleFehlt(); if (!h1.length) h1Fehlt(); }
      continue;
    }
    if (rec.robotsAllowed === false) continue;
    if (pg.canonical && kanon(pg.canonical) !== kanon(rec.url)) continue; // die Seite erklärt eine andere Adresse zum Original

    // Title
    if (!title) titleFehlt();
    else {
      if (title.length > TITLE_LANG) { const v = titelVorschlag(pg, title, brand); M('title-lang', 'niedrig', { key: 'lang', title: `Title zu lang (${title.length} Zeichen): ${p}`, detail: title, current: title, proposed: v ? v.text : '', reason: v ? v.grund : 'Kein automatischer Vorschlag: Aus Bestand und H1 ergibt sich kein kürzerer Title, der die Suchbegriffe behält.', risk: 'Suchbegriff vorn im Title behalten.', suggestion: `Title auf höchstens ${TITLE_LANG} Zeichen kürzen (Google zeigt etwa 60). Der Markenzusatz gehört nur an Titel, die mit ihm höchstens ${TITLE_MAX} Zeichen lang sind: Das leistet fitTitle() aus lib/seo.ts – die Layout-Vorlage hängt ihn immer an.` }); }
      if (title.length < TITLE_KURZ) { const v = titelVorschlag(pg, title, brand); M('title-kurz', 'niedrig', { key: 'kurz', title: `Title sehr kurz (${title.length} Zeichen): ${p}`, detail: title, current: title, proposed: v ? v.text : '', reason: v ? v.grund : '', suggestion: 'Title um den Suchbegriff bzw. das Thema der Seite ergänzen (Richtwert 40–60 Zeichen).' }); }
      byTitle.set(title, [...(byTitle.get(title) || []), rec.url]);
    }
    // Description
    if (!desc) { const v = proposeDescription(pg); M('description-fehlt', 'mittel', { key: 'fehlt', title: `Meta-Description fehlt: ${p}`, detail: 'Ohne Description wählt Google einen beliebigen Textausschnitt für den Suchtreffer.', current: '(leer)', proposed: v, reason: v ? 'Aus dem ersten Absatz des Hauptinhalts.' : '', suggestion: 'description in den Metadaten der Seite setzen (app/…/page.tsx bzw. Datenquelle unter lib/).' }); }
    else {
      if (desc.length > DESC_LANG) M('description-lang', 'niedrig', { key: 'lang', title: `Description zu lang (${desc.length} Zeichen): ${p}`, detail: desc, current: desc, proposed: kuerzeDescription(desc), reason: `Google schneidet nach etwa ${DESC_ZIEL} Zeichen ab; der Vorschlag ist die gekürzte Fassung des Bestands.`, risk: 'Prüfen, ob die wichtigste Aussage (z. B. der Preis) im gekürzten Text noch vorkommt.', suggestion: `Description auf höchstens ${DESC_ZIEL} Zeichen kürzen, das Wichtigste nach vorn.` });
      if (desc.length < DESC_KURZ) { const v = proposeDescription(pg); M('description-kurz', 'niedrig', { key: 'kurz', title: `Description sehr kurz (${desc.length} Zeichen): ${p}`, detail: desc, current: desc, proposed: v.length > desc.length ? v : '', reason: v.length > desc.length ? 'Aus dem ersten Absatz des Hauptinhalts.' : '', suggestion: 'Description auf 120–155 Zeichen ausbauen: Was bietet die Seite, für wen, mit welchem Vorteil?' }); }
      byDesc.set(desc, [...(byDesc.get(desc) || []), rec.url]);
      // Passt die Beschreibung zur Seite?
      const dt = new Set(tokens(desc)), pt = new Set(tokens([title, h1.join(' '), (pg.h2 || []).join(' '), String(pg.text || '').slice(0, 3000)].join(' ')));
      const gemeinsam = [...dt].filter(w => pt.has(w)).length;
      if (dt.size >= 5 && gemeinsam < 2) { const v = proposeDescription(pg); M('description-unpassend', 'niedrig', { key: 'unpassend', title: `Description passt kaum zum Inhalt: ${p}`, detail: `Nur ${gemeinsam} von ${dt.size} Begriffen der Description kommen im Seitentext vor: ${desc}`, current: desc, proposed: v, reason: v ? 'Aus dem ersten Absatz des Hauptinhalts.' : '', suggestion: 'Description so formulieren, dass sie den sichtbaren Inhalt der Seite wiedergibt.' }); }
    }
    // Überschriften
    if (!h1.length) h1Fehlt();
    if (h1.length > 1) M('h1-mehrfach', 'mittel', { key: 'mehrfach', title: `Mehrere H1-Überschriften (${h1.length}): ${p}`, detail: h1.slice(0, 3).join(' | '), suggestion: 'Genau eine <h1> je Seite; weitere Überschriften als <h2>/<h3> auszeichnen.' });
    let last = 0, jumps = 0, started = false; const stellen = [];
    for (const h of pg.headings || []) { if (h.level === 1) { started = true; last = 1; continue; } if (!started) continue; if (h.level > last + 1) { jumps++; if (stellen.length < 3) stellen.push(`H${last} → H${h.level} („${String(h.text).slice(0, 40)}“)`); } last = h.level; }
    if (jumps >= 2) M('heading-sprung', 'niedrig', { key: 'sprung', title: `Überschriften-Ebenen übersprungen: ${p}`, detail: `${jumps} Sprünge, z. B. ${stellen.join(', ')}.`, suggestion: 'Hierarchie ohne Lücken aufbauen (H1 → H2 → H3).' });
    if (pg.wordCount > 400 && !(pg.h2 || []).length) M('h2-fehlt', 'niedrig', { key: 'fehlt', title: `Lange Seite ohne Zwischenüberschrift: ${p}`, detail: `${pg.wordCount} Wörter ohne <h2>.`, suggestion: 'Text mit Zwischenüberschriften (<h2>) gliedern.' });
    // Open Graph (Vorschau in WhatsApp, Messengern und sozialen Netzwerken)
    if (!og['og:title']) M('og-fehlt', 'niedrig', { key: 'fehlt', title: `Open Graph fehlt: ${p}`, detail: 'Kein og:title – die Vorschau beim Teilen des Links ist dem Zufall überlassen.', proposed: title ? `og:title = ${title}${desc ? '; og:description = ' + kuerzen(desc, 120) : ''}; og:image = Vorschaubild` : '', reason: title ? 'Aus Title und Description der Seite.' : '', suggestion: 'openGraph in den Metadaten nicht leer überschreiben: Ohne eigene Angaben übernimmt Next.js Title und Description (Vorgabe in app/layout.tsx).' });
    else {
      const ot = tokens(og['og:title']), tt = new Set(tokens(title));
      if (title && ot.length && tt.size && !ot.some(w => tt.has(w))) M('og-unpassend', 'niedrig', { key: 'unpassend', title: `og:title passt nicht zum Title: ${p}`, detail: `og:title: ${og['og:title']} | Title: ${title}`, current: og['og:title'], proposed: title, suggestion: 'og:title aus dem Title der Seite übernehmen.' });
      if (og['og:url']) { let ou; try { ou = new URL(og['og:url'], rec.url).href; } catch (_) { ou = og['og:url']; } if (kanon(ou) !== kanon(rec.url)) M('og-url', 'niedrig', { key: 'url', title: `og:url weicht von der Adresse der Seite ab: ${p}`, detail: og['og:url'], current: og['og:url'], proposed: kanon(rec.url), suggestion: 'og:url folgt dem Canonical (openGraph.url „./“ in app/layout.tsx); eigene Angaben der Seite entfernen oder korrigieren.' }); }
      if (!og['og:image']) M('og-image', 'niedrig', { key: 'bild', title: `og:image fehlt: ${p}`, detail: 'Beim Teilen des Links erscheint kein Vorschaubild.', suggestion: 'Vorschaubild bereitstellen (app/opengraph-image.tsx gilt für alle Seiten; ein eigener openGraph-Block der Seite muss images selbst angeben).' });
    }
  }
  const erste = urls => urls.slice().sort();
  for (const [t, urls] of byTitle) if (urls.length > 1) { const u = erste(urls); out.push(F('title-doppelt', 'mittel', { url: u[0], key: 'title:' + t.slice(0, 80), title: `Doppelter Title auf ${urls.length} Seiten: „${t.slice(0, 70)}“`, detail: u.map(pathOf).slice(0, 8).join(', ') + (u.length > 8 ? ' …' : ''), suggestion: 'Jede Seite braucht einen eigenen Title (Ort bzw. Thema ergänzen).', count: u.length, examples: u.slice(0, 20).map(x => ({ url: x })) })); }
  for (const [d, urls] of byDesc) if (urls.length > 1) { const u = erste(urls); out.push(F('description-doppelt', 'niedrig', { url: u[0], key: 'description:' + d.slice(0, 80), title: `Doppelte Description auf ${urls.length} Seiten`, detail: `${u.map(pathOf).slice(0, 8).join(', ')}${u.length > 8 ? ' …' : ''} – „${d.slice(0, 120)}“`, suggestion: 'Jede Seite braucht eine eigene Description; fehlt sie, greift die allgemeine Vorgabe aus app/layout.tsx.', count: u.length, examples: u.slice(0, 20).map(x => ({ url: x })) })); }
  return out;
}

const rules = ['title-fehlt', 'title-lang', 'title-kurz', 'title-doppelt', 'description-fehlt', 'description-lang', 'description-kurz', 'description-doppelt', 'description-unpassend', 'h1-fehlt', 'h1-mehrfach', 'heading-sprung', 'h2-fehlt', 'og-fehlt', 'og-unpassend', 'og-url', 'og-image'];
// Kurztexte für die Oberfläche (uebersicht.json → ruleLabels)
const labels = {
  'title-fehlt': 'Title fehlt', 'title-lang': 'Title zu lang', 'title-kurz': 'Title zu kurz', 'title-doppelt': 'Title doppelt',
  'description-fehlt': 'Description fehlt', 'description-lang': 'Description zu lang', 'description-kurz': 'Description zu kurz', 'description-doppelt': 'Description doppelt', 'description-unpassend': 'Description passt nicht zum Inhalt',
  'h1-fehlt': 'H1 fehlt', 'h1-mehrfach': 'Mehrere H1', 'heading-sprung': 'Überschriften-Ebenen übersprungen', 'h2-fehlt': 'Zwischenüberschriften fehlen',
  'og-fehlt': 'Open Graph fehlt', 'og-unpassend': 'og:title passt nicht', 'og-url': 'og:url weicht ab', 'og-image': 'Vorschaubild fehlt',
};
module.exports = { run, rules, gruppe: GRUPPE, labels, BRAND, TITLE_MAX, proposeTitle, proposeDescription, fitTitle, ohneMarke, titelVorschlag, quellFinder };
