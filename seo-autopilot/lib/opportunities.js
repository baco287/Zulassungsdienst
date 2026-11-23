'use strict';
// ─── SEO-Chancen aus Crawl + Search Console (wenn verbunden) ─────────────────
// Jede Chance: { type, priority, title, detail, actions[], url, source, data }
// source kennzeichnet, ob Google-Daten (gsc) oder eigene Crawl-Auswertung (crawl).
const { pathOf } = require('./util');
const { zielSeiten } = require('./actions');
// Seiten, auf denen aus einem Ratgeber ein Auftrag werden kann
const ZIEL = /^\/(auftrag|preise|rechner)\//;

function fromGsc(gsc) {
  const out = []; if (!gsc || !gsc.connected) return out;
  const p30 = gsc.periods[30], p90 = gsc.periods[90]; if (!p30) return out;
  // Chance 1: hohe Impressionen, niedrige CTR
  for (const pg of (p30.pages || [])) {
    if (pg.impressions >= 200 && pg.ctr < 0.02 && pg.position <= 20) out.push({ type: 'ctr', priority: pg.impressions >= 1000 ? 'hoch' : 'mittel', url: pg.page, source: 'gsc', title: `Viele Impressionen, wenig Klicks: ${pathOf(pg.page)}`, detail: `${pg.impressions} Impressionen, CTR ${(pg.ctr * 100).toFixed(1)} %, Position ${pg.position.toFixed(1)} (30 Tage)`, actions: ['Title mit klarem Nutzen formulieren (z. B. „ohne Behördentermin“, Festpreis)', 'Meta-Description auf die Suchabsicht zuschneiden', 'Snippet-Elemente (Breadcrumb, FAQ) prüfen'], data: pg });
    // Chance: Position 4–15 mit Impressionen → kurz vor den vorderen Plätzen
    if (pg.impressions >= 100 && pg.position > 4 && pg.position <= 15) out.push({ type: 'striking-distance', priority: 'mittel', url: pg.page, source: 'gsc', title: `Kurz vor den vorderen Plätzen: ${pathOf(pg.page)} (Pos. ${pg.position.toFixed(1)})`, detail: `${pg.impressions} Impressionen; mit besserem Inhalt und interner Verlinkung sind die Top 3 erreichbar.`, actions: ['Inhalt vertiefen (Fragen der Nutzer beantworten)', 'Interne Links aus starken Seiten setzen', 'Title/H1 auf die wichtigste Suchanfrage schärfen'], data: pg });
  }
  // Chance 4: Rückgang (30 Tage gegen Vorperiode, mind. 20 Klicks vorher, −30 %)
  for (const pg of (p30.pages || [])) if (pg.prevClicks >= 20 && pg.clicks < pg.prevClicks * 0.7) out.push({ type: 'verlust', priority: pg.prevClicks >= 100 ? 'hoch' : 'mittel', url: pg.page, source: 'gsc', title: `Organische Klicks eingebrochen: ${pathOf(pg.page)} (${pg.prevClicks} → ${pg.clicks})`, detail: `−${Math.round(100 - 100 * pg.clicks / pg.prevClicks)} % gegenüber den 30 Tagen davor. Saison und kleine Zahlen beachten – kein automatischer Fehler.`, actions: ['Seite auf technische Änderungen prüfen (Prüfhistorie, noindex, Weiterleitungen)', 'Positionsverlust bei den wichtigsten Suchanfragen prüfen', 'Inhalt aktualisieren, wenn Wettbewerber vorbeigezogen sind'], data: pg });
  // Chance 3: mehrere Seiten für dieselbe Suchanfrage (Kannibalisierung laut Google)
  const byQ = new Map(); for (const qp of (p30.queryPages || [])) { if (!byQ.has(qp.query)) byQ.set(qp.query, []); byQ.get(qp.query).push(qp); }
  for (const [q, arr] of byQ) if (arr.length >= 2 && arr.reduce((a, x) => a + x.impressions, 0) >= 100) out.push({ type: 'kannibalisierung', priority: 'mittel', url: arr[0].page, source: 'gsc', title: `Mehrere Seiten ranken für „${q}“`, detail: arr.slice(0, 4).map(x => `${pathOf(x.page)} (Pos. ${x.position.toFixed(1)}, ${x.impressions} Impr.)`).join(' | '), actions: ['Eine Zielseite festlegen (Leistungs-, Stadt- oder Ratgeberseite)', 'Übrige Seiten inhaltlich abgrenzen oder zusammenführen', 'Intern auf die Zielseite verlinken'], data: arr });
  if (p90) { const c = p90.current, p = p90.previous; if (p.clicks >= 50 && c.clicks < p.clicks * 0.8) out.push({ type: 'verlust-gesamt', priority: 'hoch', url: '', source: 'gsc', title: `Organische Klicks gesamt rückläufig (90 Tage: ${p.clicks} → ${c.clicks})`, detail: 'Die Reichweite sinkt gegenüber der Vorperiode.', actions: ['Gewinner- und Verlierer-Seiten prüfen', 'Technische Historie abgleichen (Erreichbarkeit, noindex, Zahl der indexierbaren Seiten)'], data: { current: c, previous: p } }); }
  return out;
}
function fromCrawl(issues, crawl) {
  const out = [];
  const open = issues.filter(i => i.status === 'offen');
  const groups = { 'duplicate-content': ['Inhalte unterscheiden (Ort, Behörde, Besonderheiten)', 'Canonical oder 301 auf die Hauptseite', 'Interne Verlinkung bündeln'], 'kannibalisierung': ['Suchabsicht je Seite schärfen', 'Zusammenlegen, wenn die Absicht gleich ist'], 'thin-content': ['Eigene Angaben, FAQ und Beispiele ergänzen', 'Mit einer stärkeren Seite zusammenlegen'], 'verwaist': ['Aus Übersichtsseiten verlinken'], 'schwache-verlinkung': ['Kontextlinks aus thematisch nahen Seiten setzen'], 'title-lang': ['Title kürzen (Metadaten der Seite; Markenzusatz über fitTitle in lib/seo.ts)'], 'description-fehlt': ['Description aus dem Inhalt ergänzen'] };
  for (const [rule, actions] of Object.entries(groups)) {
    const n = open.filter(i => i.rule === rule); const pages = n.reduce((a, i) => a + (i.count || 1), 0); if (pages < 3) continue;
    // Sammelbefunde (key „alle:…“) tragen die Startseite als url – genannt werden die betroffenen Seiten aus examples
    const seiten = [...new Set(n.flatMap(i => zielSeiten(i).map(pathOf)))];
    out.push({ type: rule, priority: pages >= 20 ? 'hoch' : 'mittel', url: zielSeiten(n[0])[0], source: 'crawl', title: `${pages} Seiten mit „${rule}“`, detail: seiten.slice(0, 5).join(', ') + (seiten.length > 5 ? ' …' : ''), actions, data: { count: pages } });
  }
  // Chance 2: Ratgeber, aus deren INHALT kein Weg zu Auftrag, Preisen oder Rechner führt (Kopf-/Fußnavigation zählt nicht)
  if (crawl) for (const rec of crawl.pages.values()) {
    if (!rec.page || rec.status !== 200 || rec.noindex || !/^\/ratgeber\/[^/]+\/$/.test(pathOf(rec.url))) continue;
    const weg = rec.page.anchors.some(a => a.main !== false && ZIEL.test(pathOf(a.href)));
    if (!weg) out.push({ type: 'nutzerfuehrung', priority: 'mittel', url: rec.url, source: 'crawl', title: `Ratgeber ohne Weg zum Auftrag: ${pathOf(rec.url)}`, detail: 'Im Inhalt führt kein Link zu Auftrag, Preisen oder Rechner.', actions: ['Im Text und am Ende einen Link zum Auftrag (/auftrag/) setzen', 'Passend zum Thema auf Preise (/preise/) oder einen Rechner (/rechner/) verweisen'], data: {} });
  }
  return out;
}
function derive({ gsc, issues, crawl }) {
  const all = [...fromGsc(gsc), ...fromCrawl(issues, crawl)];
  const order = { hoch: 0, mittel: 1, niedrig: 2 };
  return all.sort((a, b) => order[a.priority] - order[b.priority]);
}
module.exports = { derive, fromGsc, fromCrawl };
