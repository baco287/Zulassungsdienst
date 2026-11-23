'use strict';
// ─── Auswertung der Search-Console-Daten: echte Veränderung vs. normale Schwankung ──
// Eingabe: Ergebnis von gsc.fetchPerformance (nur Google-Daten, dataState=final, 3 Tage Verzug).
// Keine Schätzwerte: Wo zu wenig Daten vorliegen, steht „zu wenig Daten“ – nicht eine Zahl.
//
// Signifikanz-Heuristik (dokumentiert, konservativ): Klicks/Impressionen sind Zählwerte; eine Differenz gilt
// als echte Veränderung, wenn |jetzt − vorher| > 2·√(jetzt + vorher) (≈ 95 % bei Poisson-Rauschen) UND
// relativ ≥ 20 % UND absolut ≥ 10. Sonst „normale Schwankung“. Unter 20 Klicks in beiden Perioden: „zu wenig Daten“.
//
// Umzugsphase: Die Domain ist erst seit dem Livegang (Standard 20.11.2026, cfg.gsc.liveSeit) in der Suche. Solange sie
// jünger als 120 Tage ist, liegt die Vorperiode ganz oder teilweise vor dem Umzug – ein Zuwachs ist dann ein
// Umzugseffekt und kein echter Anstieg. In dieser Zeit meldet verdict() nie „echter Anstieg“, sondern „Umzugseffekt“.
// Rückgänge werden weiter gemeldet (sie sind kein Artefakt des Umzugs).
const MIN_COUNT = 20;
const LIVE_SEIT = '2026-11-20';
const UMZUG_TAGE = 120;
const de = iso => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** Stand der Umzugsphase: { aktiv, liveSeit, bis (letzter Tag der Phase + 1), tage (Alter der Domain), hinweis }. */
function umzug(cfg, now = Date.now()) {
  const roh = cfg && cfg.gsc && cfg.gsc.liveSeit; const liveSeit = typeof roh === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(roh) && !isNaN(Date.parse(roh)) ? roh : LIVE_SEIT;
  const start = Date.parse(liveSeit + 'T00:00:00Z'); const bisMs = start + UMZUG_TAGE * 86400e3; const t = now instanceof Date ? now.getTime() : Number(now);
  const bis = new Date(bisMs).toISOString().slice(0, 10); const aktiv = t < bisMs;
  return { aktiv, liveSeit, bis, tage: Math.floor((t - start) / 86400e3), hinweis: aktiv ? `Umzugshinweis: Die Domain ist erst seit ${de(liveSeit)} live. Bis ${de(bis)} (${UMZUG_TAGE} Tage) sind Vergleiche mit der Vorperiode ein Umzugseffekt und kein echter Anstieg – Zuwächse werden deshalb nicht als „echter Anstieg“ gewertet.` : '' };
}

/**
 * Bewertung einer Veränderung. opts.umzug (true/false) legt fest, ob die Umzugsphase gilt; ohne Angabe wird sie aus
 * opts.cfg / opts.now bzw. dem Standard-Livegang berechnet – verdict() meldet also auch ohne Zutun keinen „echten Anstieg“,
 * solange die Domain jünger als 120 Tage ist.
 */
function verdict(cur, prev, opts = {}) {
  cur = cur || 0; prev = prev || 0;
  const imUmzug = opts.umzug != null ? !!opts.umzug : umzug(opts.cfg, opts.now == null ? Date.now() : opts.now).aktiv;
  if (cur < MIN_COUNT && prev < MIN_COUNT) return { verdict: 'zu wenig Daten', significant: false, deltaPct: null };
  const d = cur - prev; const deltaPct = prev ? Math.round(100 * d / prev) : null;
  const noise = 2 * Math.sqrt(cur + prev);
  const significant = Math.abs(d) > noise && (prev === 0 || Math.abs(d) / prev >= 0.2) && Math.abs(d) >= 10;
  if (significant && d > 0 && imUmzug) return { verdict: 'Umzugseffekt', significant: false, deltaPct, delta: d, umzug: true };
  return { verdict: significant ? (d > 0 ? 'echter Anstieg' : 'echter Rückgang') : 'normale Schwankung', significant, deltaPct, delta: d };
}
// Erwartete CTR je Position (grobe Branchenkurve, nur zur Einordnung „unter Erwartung“ – keine Garantie)
const EXPECTED_CTR = p => p <= 1 ? 0.28 : p <= 2 ? 0.15 : p <= 3 ? 0.10 : p <= 5 ? 0.06 : p <= 10 ? 0.03 : p <= 20 ? 0.012 : 0.005;

/** cfg und now sind optional (cfg.gsc.liveSeit überschreibt den Standard-Livegang; now nur für Tests). */
function analyze(g, cfg, now = Date.now()) {
  if (!g || !g.connected) return { connected: false };
  const p30 = g.periods[30] || null, p7 = g.periods[7] || null, p90 = g.periods[90] || null;
  const uz = umzug(cfg, now);
  // Eine Periode ist vom Umzug betroffen, solange die Domain jung ist ODER ihre Vorperiode noch vor dem Livegang beginnt
  // (der 90-Tage-Vergleich reicht rund 183 Tage zurück und bleibt deshalb länger ein Umzugseffekt).
  const betroffen = p => uz.aktiv || !!(p && p.range && typeof p.range.prevStart === 'string' && p.range.prevStart < uz.liveSeit);
  const spaet = !uz.aktiv ? [[7, p7], [30, p30], [90, p90]].filter(([, p]) => betroffen(p)).map(([d]) => d) : [];
  const hinweis = uz.aktiv ? uz.hinweis : spaet.length ? `Umzugshinweis: Die Vorperiode des ${spaet.join('-/')}-Tage-Vergleichs beginnt vor dem Livegang der Domain (${de(uz.liveSeit)}); ein Zuwachs dort ist ein Umzugseffekt und kein echter Anstieg.` : '';
  const out = { connected: true, source: g.source, property: g.property, fetchedAt: g.fetchedAt, lagDays: g.lagDays, dataNote: `Google-Daten bis ${p30 ? p30.range.end : '?'} (dataState=final; die letzten ${g.lagDays} Tage sind noch unvollständig und ausgeschlossen). Zahlen unter ${MIN_COUNT} Klicks werden nicht bewertet.${hinweis ? ' ' + hinweis : ''}`, umzug: { aktiv: uz.aktiv, liveSeit: uz.liveSeit, bis: uz.bis, hinweis }, totals: {}, pages: { strong: [], weak: [], winners: [], losers: [] }, queries: { opportunities: [], top: [] }, method: 'Veränderung gilt als echt bei |Δ| > 2·√(jetzt+vorher), ≥ 20 % und ≥ 10 absolut; sonst normale Schwankung.' };
  for (const [days, p] of [[7, p7], [30, p30], [90, p90]]) if (p) out.totals[days] = { range: p.range, clicks: p.current.clicks, prevClicks: p.previous.clicks, impressions: p.current.impressions, prevImpressions: p.previous.impressions, ctr: p.current.ctr, prevCtr: p.previous.ctr, position: p.current.position, prevPosition: p.previous.position, clicksVerdict: verdict(p.current.clicks, p.previous.clicks, { umzug: betroffen(p) }), impressionsVerdict: verdict(p.current.impressions, p.previous.impressions, { umzug: betroffen(p) }) };
  if (p30) {
    const pages = p30.pages || []; const site = p30.current; const u30 = { umzug: betroffen(p30) };
    const siteCtr = site.impressions ? site.clicks / site.impressions : 0;
    const withV = pages.map(x => ({ ...x, change: verdict(x.clicks, x.prevClicks, u30) }));
    out.pages.strong = withV.filter(x => x.clicks >= MIN_COUNT).sort((a, b) => b.clicks - a.clicks).slice(0, 15);
    // schwach: viele Impressionen, aber CTR deutlich unter Erwartung für die Position, oder Position > 10 trotz ≥ 200 Impressionen
    out.pages.weak = withV.filter(x => x.impressions >= 100 && (x.ctr < 0.5 * EXPECTED_CTR(x.position) || (x.position > 10 && x.impressions >= 200))).map(x => ({ ...x, reason: x.ctr < 0.5 * EXPECTED_CTR(x.position) ? `CTR ${(100 * x.ctr).toFixed(1)} % liegt unter der Hälfte der für Position ${x.position.toFixed(1)} üblichen (~${(100 * EXPECTED_CTR(x.position)).toFixed(0)} %)` : `Position ${x.position.toFixed(1)} bei ${x.impressions} Impressionen – Seite 2` })).sort((a, b) => b.impressions - a.impressions).slice(0, 15);
    out.pages.winners = withV.filter(x => x.change.significant && x.change.delta > 0).sort((a, b) => b.change.delta - a.change.delta).slice(0, 10);
    out.pages.losers = withV.filter(x => x.change.significant && x.change.delta < 0).sort((a, b) => a.change.delta - b.change.delta).slice(0, 10);
    const qs = (p30.queries || []).map(q => ({ ...q, change: verdict(q.clicks, q.prevClicks || 0, u30) }));
    out.queries.top = qs.slice(0, 20);
    // Potenzial: viele Impressionen, Position 4–20 (Seite 1 unten / Seite 2) oder CTR unter Erwartung
    out.queries.opportunities = qs.filter(q => q.impressions >= 50 && ((q.position >= 4 && q.position <= 20) || q.ctr < 0.5 * EXPECTED_CTR(q.position))).map(q => ({ ...q, potential: Math.round(q.impressions * Math.max(0, EXPECTED_CTR(Math.max(1, q.position - 3)) - q.ctr)), reason: q.position >= 4 && q.position <= 20 ? `Position ${q.position.toFixed(1)} – mit besserem Inhalt/Title Top-3 erreichbar` : `CTR ${(100 * q.ctr).toFixed(1)} % unter Erwartung für Position ${q.position.toFixed(1)}` })).sort((a, b) => b.potential - a.potential).slice(0, 20);
    out.siteCtr = siteCtr;
    // Neue und verlorene Sichtbarkeit (Impressionen als Maß für Sichtbarkeit, Mindestgröße gegen Rauschen)
    const MIN_IMP = 50;
    out.visibility = {
      newPages: withV.filter(x => x.impressions >= MIN_IMP && (x.prevImpressions || 0) === 0).sort((a, b) => b.impressions - a.impressions).slice(0, 15),
      lostPages: withV.filter(x => (x.prevImpressions || 0) >= MIN_IMP && x.impressions === 0).sort((a, b) => b.prevImpressions - a.prevImpressions).slice(0, 15),
      newQueries: qs.filter(q => q.impressions >= MIN_IMP && (q.prevImpressions || 0) === 0).sort((a, b) => b.impressions - a.impressions).slice(0, 15),
      lostQueries: qs.filter(q => (q.prevImpressions || 0) >= MIN_IMP && q.impressions === 0).sort((a, b) => b.prevImpressions - a.prevImpressions).slice(0, 15),
      note: `Neu = in den letzten 30 Tagen ≥ ${MIN_IMP} Impressionen, in der Vorperiode keine; verloren = umgekehrt. Nur Top-300-Seiten/Top-200-Suchanfragen je Periode (API-Limit).${u30.umzug ? ' Während des Umzugs ist „neu“ kein Zugewinn: Vor dem Livegang gab es für diese Domain keine Daten.' : ''}`,
    };
  }
  return out;
}
module.exports = { analyze, verdict, umzug, EXPECTED_CTR, MIN_COUNT, LIVE_SEIT, UMZUG_TAGE };
