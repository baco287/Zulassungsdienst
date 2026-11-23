'use strict';
// ─── Berichte: Tages-/Wochen-/Monatsbericht als Markdown + JSON (Historie bleibt erhalten) ─
const path = require('path');
const { writeFileAtomic, writeJsonAtomic } = require('./util');
const { ortText } = require('./actions');
const pct = x => (100 * (x || 0)).toFixed(1) + ' %';
const TYP_NAMEN = { start: 'Startseite', leistung: 'Leistungen', ratgeber: 'Ratgeber', stadt: 'Städte', behoerde: 'Zulassungsstellen', kennzeichen: 'Kennzeichen', gewerbe: 'Gewerbe', rechner: 'Rechner', vorlage: 'Vorlagen', landing: 'Landingpages', recht: 'Rechtliches', hub: 'Übersichten', sonst: 'Sonstige' };

// Zeitangaben in Berichten und Dateinamen nach deutscher Zeit (wie im SEO Center), unabhängig von der TZ des Rechners.
const BERLIN = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
/** ISO-Zeitpunkt → „JJJJ-MM-TT HH:MM“ in Europe/Berlin (Sommer-/Winterzeit). Unbrauchbare Angaben bleiben als Text. */
function ortszeit(iso) {
  const d = new Date(iso); if (iso == null || iso === '' || !Number.isFinite(d.getTime())) return String(iso == null ? '' : iso);
  const t = Object.fromEntries(BERLIN.formatToParts(d).map(x => [x.type, x.value]));
  return `${t.year}-${t.month}-${t.day} ${t.hour}:${t.minute}`;
}
/** ISO-Zeitpunkt → „JJJJ-MM-TT“ (Kalendertag in Europe/Berlin). */
const ortsdatum = iso => ortszeit(iso).slice(0, 10);

/**
 * SEO-Status 0–100 aus den offenen Punkten (info zählt nicht):
 *   100 − min(30, 10 × kritische) − min(20, 4 × hohe) − min(10, 1 × mittlere) − min(5, 1 × niedrige)
 * Jeder offene Punkt zählt einmal (ein Bündel für viele Seiten = ein Punkt). 100 ist nur ohne offene Punkte der Stufen
 * kritisch, hoch, mittel und niedrig erreichbar. Nach Seiten wird bewusst nicht gezählt: Ein niedriger Hinweis auf
 * Hunderten bewusst nicht indexierten Detailseiten würde den Wert sonst stärker drücken als ein kritischer Fehler.
 * `n` (indexierbare Seiten) bleibt als Parameter für ältere Aufrufer erhalten.
 */
function score(open, n) { // eslint-disable-line no-unused-vars
  const zahl = sev => open.filter(i => i.severity === sev).length;
  const abzug = Math.min(30, 10 * zahl('kritisch')) + Math.min(20, 4 * zahl('hoch')) + Math.min(10, zahl('mittel')) + Math.min(5, zahl('niedrig'));
  return Math.max(0, Math.round(100 - abzug));
}
/** Kopfdaten eines Berichts. crawlStats = crawl.stats (crawled, fetched, reused, indexable, noindex, typen); opts.base = Basis-URL. */
function header(kind, run, store, crawlStats, opts = {}) {
  const open = store.open(); const by = s => open.filter(i => i.severity === s).length; const st = crawlStats || {};
  const n = st.indexable != null ? st.indexable : st.crawled;
  let site = ''; try { site = new URL(opts.base).host; } catch (_) { site = ''; }
  return { kind, generatedAt: new Date().toISOString(), runId: run.runId, site, crawled: st.crawled != null ? st.crawled : null, fetched: st.fetched != null ? st.fetched : null, reused: st.reused != null ? st.reused : null, indexable: st.indexable != null ? st.indexable : null, noindex: st.noindex != null ? st.noindex : null, typen: st.typen || null,
    open: open.length, kritisch: by('kritisch'), hoch: by('hoch'), mittel: by('mittel'), niedrig: by('niedrig'), neu: run.summary.new.length, behoben: run.summary.resolved.length, wieder: run.summary.reopened.length, score: score(open, n || 0) };
}
function md(h, store, extra = {}) {
  const open = store.open(); const lines = [];
  const title = { daily: 'SEO-Tagesbericht', weekly: 'SEO-Wochenbericht', monthly: 'SEO-Monatsbericht' }[h.kind] || 'SEO-Bericht';
  const z = v => (v == null ? '–' : v);
  lines.push(`# ${title}${h.site ? ' ' + h.site : ''} – ${ortszeit(h.generatedAt)}`, '', `**SEO-Status: ${h.score}/100** · ${h.open} offene Punkte (kritisch ${h.kritisch}, hoch ${h.hoch}, mittel ${h.mittel}, niedrig ${h.niedrig}) · neu ${h.neu}, behoben ${h.behoben}, wieder aufgetreten ${h.wieder}`, `Geprüft: ${z(h.crawled)} URLs (${z(h.fetched)} abgerufen, ${z(h.reused)} unverändert aus Cache)${h.indexable != null ? ` · indexierbar ${h.indexable} · bewusst nicht indexiert (noindex) ${z(h.noindex)}` : ''}`, '');
  if (h.typen && Object.keys(h.typen).length) {
    lines.push('## Seiten nach Typ', '', '| Seitentyp | Seiten | indexierbar | nicht indexierbar (noindex) |', '|---|---|---|---|');
    for (const [t, v] of Object.entries(h.typen).sort((a, b) => b[1].gesamt - a[1].gesamt)) lines.push(`| ${TYP_NAMEN[t] || t} | ${v.gesamt} | ${v.indexable} | ${v.gesamt - v.indexable} |`);
    lines.push('');
  }
  if (extra.gsc) { const g = extra.gsc; if (g.connected) { for (const d of [7, 30, 90]) { const p = g.periods[d]; if (!p) continue; const c = p.current, pv = p.previous; lines.push(`## Google Search Console – letzte ${d} Tage (${p.range.start} bis ${p.range.end}, Daten laufen ~3 Tage nach)`, '', `| | aktuell | Vorperiode | Δ |`, `|---|---|---|---|`, `| Klicks | ${c.clicks} | ${pv.clicks} | ${delta(c.clicks, pv.clicks)} |`, `| Impressionen | ${c.impressions} | ${pv.impressions} | ${delta(c.impressions, pv.impressions)} |`, `| CTR | ${pct(c.ctr)} | ${pct(pv.ctr)} | |`, `| Ø Position | ${c.position.toFixed(1)} | ${pv.position.toFixed(1)} | |`, ''); } } else lines.push('## Google Search Console', '', `Nicht verbunden: ${String((g.status && g.status.reason) || 'kein Zugang').replace(/[.\s]+$/, '')}. Kennzahlen zu Klicks/Impressionen/Positionen fehlen daher; Indexierungsstatus = unbekannt.`, ''); }
  const groups = [['kritisch', 'Kritisch – sofort'], ['hoch', 'Hoch'], ['mittel', 'Mittel'], ['niedrig', 'Niedrig']];
  for (const [sev, label] of groups) { const items = open.filter(i => i.severity === sev); if (!items.length) continue; const limit = h.kind === 'daily' && sev === 'niedrig' ? 10 : h.kind === 'daily' && sev === 'mittel' ? 25 : 60; lines.push(`## ${label} (${items.length})`, ''); for (const i of items.slice(0, limit)) lines.push(`- **${i.title}**${ortZusatz(i)}${i.detail ? `\n  ${String(i.detail).slice(0, 220)}` : ''}${i.suggestion ? `\n  → ${i.suggestion}` : ''}${i.approval && i.approval !== 'auto' ? `\n  _Freigabe: ${i.approval}_` : ''}`); if (items.length > limit) lines.push(`- … ${items.length - limit} weitere im SEO Center`); lines.push(''); }
  if (extra.actions && extra.actions.length) { lines.push(`## Die wichtigsten Maßnahmen (${extra.actions.length})`, ''); for (const a of extra.actions) lines.push(`${a.rank}. **[${a.severity}] ${a.action}**\n   ${a.pages} Seite(n), z. B. ${a.urls.slice(0, 3).join(', ')}${a.needsApproval ? ' · _Freigabe erforderlich_' : ''}`); lines.push(''); }
  if (extra.recurring && extra.recurring.length) { lines.push(`## Wiederkehrende Probleme (${extra.recurring.length})`, ''); for (const r of extra.recurring.slice(0, 15)) lines.push(`- **${r.title}**${r.url ? ortZusatz(r) : ''} (${r.reopen_count}× wieder aufgetreten, zuletzt ${r.reopened_at ? ortsdatum(r.reopened_at) : ''})`); lines.push(''); }
  if (extra.resolved && extra.resolved.length) { lines.push(`## Behoben ${h.kind === 'monthly' ? 'in den letzten 30 Tagen' : 'seit dem letzten Lauf'} (${extra.resolved.length})`, ''); for (const i of extra.resolved.slice(0, 30)) lines.push(`- ${i.title}${ortZusatz(i)}`); lines.push(''); }
  if (extra.opportunities && extra.opportunities.length) { lines.push(`## Optimierungschancen (${extra.opportunities.length})`, ''); for (const o of extra.opportunities.slice(0, 25)) lines.push(`- [${o.priority}] **${o.title}** (${o.source === 'gsc' ? 'Google-Daten' : 'eigene Auswertung'})\n  ${o.detail}\n  → ${o.actions.join('; ')}`); lines.push(''); }
  if (extra.history && extra.history.length) { lines.push('## Verlauf', '', '| Lauf | Status | offen | kritisch | hoch | neu | behoben |', '|---|---|---|---|---|---|---|'); for (const r of extra.history.slice(-(h.kind === 'monthly' ? 40 : 14))) lines.push(`| ${ortszeit(r.at)} (${r.kind})${r.suspicious ? ' ⚠' : ''} | ${r.score != null ? r.score : '–'} | ${r.open} | ${(r.bySeverity || {}).kritisch || 0} | ${(r.bySeverity || {}).hoch || 0} | ${r.new} | ${r.resolved} |`); lines.push(''); }
  if (extra.notes && extra.notes.length) lines.push('## Hinweise', '', ...extra.notes.map(n => '- ' + n), '');
  return lines.join('\n');
}
function delta(a, b) { if (!b) return a ? '+∞' : '±0'; const d = Math.round(100 * (a - b) / b); return (d >= 0 ? '+' : '') + d + ' %'; }
/** „ – /pfad/“ hinter einem Befund; Sammelbefunde (key „alle:…“) nennen ihre betroffenen Seiten statt der Startseite. Nur mit url. */
function ortZusatz(i) { if (!i.url) return ''; const ort = i.ort || ortText(i); return ort ? ` – ${ort}` : ''; }
/** Bericht schreiben: reports/<art>-<datum>[-<art>].md|.json plus latest-<art>.*; <datum> = Kalendertag in Europe/Berlin. `json` (summary, stats …) wird mit den Kopfdaten zusammengeführt. */
function write(cfg, h, markdown, json) {
  const dir = path.join(cfg.dataDir, 'reports');
  const stamp = ortsdatum(h.generatedAt) + (h.kind === 'daily' ? '' : '-' + h.kind);
  const base = path.join(dir, `${h.kind}-${stamp}`); const daten = { ...h, ...(json || {}) };
  writeFileAtomic(base + '.md', markdown); writeJsonAtomic(base + '.json', daten);
  writeFileAtomic(path.join(dir, `latest-${h.kind}.md`), markdown); writeJsonAtomic(path.join(dir, `latest-${h.kind}.json`), daten);
  return base + '.md';
}
module.exports = { header, md, write, score, ortszeit, ortsdatum, TYP_NAMEN };
