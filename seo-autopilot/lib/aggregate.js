'use strict';
// ─── Bündelung von Massenbefunden je Seitenfamilie ───────────────────────────
// Dieselbe Regel auf mehreren Seiten derselben Familie (z. B. /zulassungsstelle/*/) → EIN Punkt mit
// Anzahl und Beispielen, damit Historie und Oberfläche lesbar bleiben. Wird vom Autopiloten und vom
// lokalen Vorher-Nachher-Check identisch verwendet (gleiche Fingerprints → vergleichbar).
//
// Gebündelt wird schon ab EINER Seite einer Familie – ohne Schwelle, damit ein Punkt nie zwischen „einzeln“ und
// „gebündelt“ wechselt (sonst gälte beim Wechsel 2 → 1 Seiten das Bündel als behoben und die Seite als neu, und der
// Bearbeitungsstand im SEO Center hinge an der alten ID). Der Schlüssel des Bündels (Regel + Familie) ist stabil;
// Zahlen stehen nur in Titel/Detail/count, die Seiten in examples. Bei einer Seite nennt der Titel die Seite.
// Kernseiten (cfg.importantPaths, exakter Pfad) werden NIE gebündelt: Fällt eine zweite Kernseite derselben Familie aus,
// bekäme sie sonst als Teil eines schon gemeldeten Bündels keine eigene Sofortmeldung.
const { family, pathOf } = require('./util');

// Große Seitenfamilien der Website (Detailseiten unter einer Übersicht)
const FAMILIEN = ['/zulassungsstelle/*/', '/kennzeichen/*/', '/kfz-zulassung/*/', '/ratgeber/*/', '/leistungen/*/'];
// Regeln, deren Befund sich nicht auf eine einzelne Seite bezieht (Website-weit bzw. Datei/Host) – nie bündeln
const NICHT_BUENDELN = new Set(['sitemap-datei', 'sitemap-lastmod', 'robots', 'host-weiterleitung', 'alte-domain-weiterleitung', 'security-header', 'index-drift', 'soll-nicht-lesbar', 'faq-widerspruch', 'rechtsinfo-abweichend', 'autopilot-modul']);
const ORDER = ['kritisch', 'hoch', 'mittel', 'niedrig', 'info'];
const FREIGABE = ['recht', 'preis', 'manuell', 'auto']; // strengste zuerst

/** Titel ohne Seitenbezug und ohne Messwert: „Title zu lang (72 Zeichen): /a/b/“ → „Title zu lang“. */
function kurztitel(f) {
  let t = String(f.title || f.rule || ''); const p = pathOf(f.url);
  if (p && p !== '/') t = t.split(p).join('');
  t = t.replace(/\s*\(\s*\)/g, '').replace(/\s*\(\d[\d.,]*\s*(Zeichen|Wörter|Woerter|ms|Sprünge|Tage|×|%)?\)/g, '').replace(/[\s:–—-]+$/, '').replace(/\s{2,}/g, ' ').trim();
  return t || f.rule;
}

/** Bündel-Optionen aus der Konfiguration. Autopilot und lokaler Check übergeben genau diese (→ gleiche Fingerprints). */
const optionen = cfg => ({ kernseiten: (cfg && Array.isArray(cfg.importantPaths)) ? cfg.importantPaths : [] });

/**
 * findings bündeln. base = Basis-URL der Website. opts.familien überschreibt die Familienliste, opts.kernseiten
 * (exakte Pfade, siehe optionen(cfg)) bleiben immer einzeln.
 * Nicht gebündelt werden: Regeln aus NICHT_BUENDELN, Befunde ohne URL bzw. auf fremden Hosts, Kernseiten, Befunde mit
 * `buendeln: false` und Befunde, die eine Regel selbst schon zusammengefasst hat (count/examples).
 */
function aggregate(findings, base, opts = {}) {
  const familien = new Set(opts.familien || FAMILIEN); const kern = new Set(opts.kernseiten || []); const groups = new Map(); const out = [];
  let host = ''; try { host = new URL(base).host; } catch (_) { /* ohne Basis keine Bündelung */ }
  for (const f of findings) {
    let u = null; try { u = f.url ? new URL(f.url) : null; } catch (_) { u = null; }
    const fam = u && u.host === host ? family(u.pathname) : '';
    if (!fam || !familien.has(fam) || u.pathname === fam || kern.has(u.pathname) || NICHT_BUENDELN.has(f.rule) || f.buendeln === false || f.count > 1 || Array.isArray(f.examples)) { out.push(f); continue; }
    const k = f.rule + '|' + fam;
    if (!groups.has(k)) { groups.set(k, { fam, items: [], platz: out.length }); out.push(null); }
    groups.get(k).items.push(f);
  }
  for (const g of groups.values()) {
    const seiten = [...new Set(g.items.map(i => i.url))].sort();
    const items = g.items.slice().sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0)); // feste Reihenfolge, unabhängig von der Crawl-Folge
    const first = items[0]; const eine = seiten.length === 1;
    const severity = items.map(i => i.severity).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0];
    const approval = items.map(i => i.approval || 'auto').sort((a, b) => FREIGABE.indexOf(a) - FREIGABE.indexOf(b))[0];
    const beispiele = seiten.slice(0, 5).map(pathOf).join(', ');
    out[g.platz] = [{ ...first, severity, approval, url: base + g.fam, key: 'familie:' + g.fam,
      title: eine ? `1 Seite im Bereich ${g.fam}: ${kurztitel(first)} (${pathOf(first.url)})` : `${seiten.length} Seiten im Bereich ${g.fam}: ${kurztitel(first)}`,
      detail: eine && items.length === 1 ? first.detail : `Beispiele: ${beispiele}${seiten.length > 5 ? ' …' : ''}${items.length > seiten.length ? ` (${items.length} Einzelbefunde)` : ''}`,
      count: seiten.length,
      examples: items.slice(0, 20).map(i => ({ url: i.url, title: i.title, current: i.current, proposed: i.proposed, detail: i.detail })),
      proposed: first.proposed && !eine ? `(Beispiel ${pathOf(first.url)}) ${first.proposed}` : first.proposed }];
  }
  return out.flat();
}
module.exports = { aggregate, optionen, FAMILIEN, NICHT_BUENDELN, kurztitel };
