'use strict';
// ─── Leichter HTML-Extraktor (keine Abhängigkeiten) ─────────────────────────
// Reicht für SEO-Prüfungen: Head-Tags, Überschriften, Links, Bilder, JSON-LD,
// sichtbarer Text. Kein vollständiger DOM – bewusst robust gegen kaputtes HTML.
//
// Text:  `text`     = Hauptinhalt (bevorzugt <main>; ohne Kopf, Fuß, Skip-Link und Breadcrumb)
//        `textFull` = ganze Seite (Kopf + Breadcrumb + Hauptinhalt + Fuß)
// Beide sind über util.norm() normalisiert. Skripte (auch die self.__next_f-Daten von Next.js),
// Styles, Templates und Kommentare zählen nie als Text.
const { norm, sha1 } = require('./util');

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß', euro: '€', ndash: '–', mdash: '—', hellip: '…', raquo: '»', laquo: '«', bdquo: '„', ldquo: '“', rdquo: '”', rsquo: '’', lsquo: '‘', copy: '©', reg: '®', trade: '™', times: '×', middot: '·', bull: '•', deg: '°', sect: '§', shy: '', thinsp: ' ', ensp: ' ', emsp: ' ', zwnj: '', zwj: '' };
function decode(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return Number.isFinite(n) ? String.fromCodePoint(n) : m; } catch (_) { return m; } }
    return ENTITIES[e] !== undefined ? ENTITIES[e] : m;
  });
}
function attrs(tag) {
  const out = {}; const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g; let m;
  const body = tag.replace(/^<[a-zA-Z0-9-]+/, '');
  while ((m = re.exec(body))) out[m[1].toLowerCase()] = decode(m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5] !== undefined ? m[5] : '');
  return out;
}
// Attributteil eines Tags; Anführungszeichen werden beachtet, damit ein „>“ in einem Attributwert das Tag nicht beendet.
const A = `(?:[^>"']|"[^"]*"|'[^']*')*`;
const tagRe = (name, flags = 'gi') => new RegExp(`<(${name})\\b${A}>`, flags);
const RE_TAG = new RegExp(`<\\/?[a-zA-Z]${A}>`, 'g');
const RE_REST = /<[a-zA-Z/!][^>]*>/g;
/** Skripte, Styles, Templates und Kommentare entfernen (Kommentare ersatzlos: React trennt damit nur Textknoten). */
function ohneCode(h) {
  return String(h || '').replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ').replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ').replace(/<template\b[\s\S]*?<\/template\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, '');
}
/** Sichtbarer Text eines HTML-Stücks, normalisiert (kein Leerzeichen vor Satzzeichen, das nur durch ein Tag entstand). */
function stripTags(h) {
  return norm(decode(ohneCode(h).replace(RE_TAG, ' ').replace(RE_REST, ' '))).replace(/ ([.,;:!?])(?=\s|$)/g, '$1');
}
function section(h, re) { const m = re.exec(h); return m ? m[0] : ''; }

/** Mehrere robots-Angaben (mehrere Meta-Tags, googlebot) → strengster Wert; eine einzelne Angabe bleibt unverändert. */
function strictestRobots(vals) {
  const list = (vals || []).map(v => String(v || '').trim()).filter(Boolean);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const tok = new Set(list.join(',').toLowerCase().split(',').map(s => s.trim()).filter(Boolean));
  if (tok.has('none')) { tok.add('noindex'); tok.add('nofollow'); }
  const out = [tok.has('noindex') ? 'noindex' : tok.has('index') || tok.has('all') ? 'index' : '', tok.has('nofollow') ? 'nofollow' : tok.has('follow') || tok.has('all') ? 'follow' : ''];
  for (const t of tok) if (!['index', 'noindex', 'follow', 'nofollow', 'all', 'none'].includes(t)) out.push(t);
  return out.filter(Boolean).join(', ');
}

const RE_BROT = /brotkrume|breadcrumb/i;
const RE_SKIP_TEXT = /^(zum (haupt)?inhalt( springen)?|direkt zum inhalt|skip to (main )?content)$/i;
const RE_SKIP_KLASSE = /(^|\s)skip(-?(link|nav|to-content|to-main|content))?(\s|$)/i;
const istBrot = tag => { const a = attrs(tag); return RE_BROT.test(a['aria-label'] || '') || RE_BROT.test(a.class || '') || RE_BROT.test(a.id || ''); };
/** Breadcrumb-Navigation (<nav aria-label="Brotkrumen">, class="breadcrumb" …) aus einem HTML-Stück lösen. */
function loeseBrot(h) {
  if (!RE_BROT.test(h)) return { rest: h, brot: '' };
  let rest = '', brot = '', pos = 0; const re = tagRe('nav|ol|ul'); let m;
  while ((m = re.exec(h))) {
    if (!istBrot(m[0])) continue;
    const innen = m.index + m[0].length; const zu = new RegExp(`<\\/${m[1]}\\s*>`, 'i').exec(h.slice(innen));
    const ende = zu ? innen + zu.index + zu[0].length : h.length;
    rest += h.slice(pos, m.index) + ' '; brot += h.slice(m.index, ende) + ' '; pos = ende; re.lastIndex = ende;
  }
  return { rest: rest + h.slice(pos), brot };
}
const RE_A = () => new RegExp(`(<a\\b${A}>)([\\s\\S]*?)<\\/a\\s*>`, 'gi');
/**
 * Body in Bereiche zerlegen: kopf (vor dem Hauptinhalt), brot (Breadcrumb), haupt, fuss.
 * Mit <main>: alles davor = kopf, alles danach = fuss. Ohne <main>: nav/header/footer = kopf, Rest = haupt.
 */
function regionen(body) {
  let kopf = '', haupt = '', fuss = '', brot = '';
  const open = tagRe('main', 'i').exec(body);
  if (open) {
    const innen = open.index + open[0].length; let ende = body.toLowerCase().lastIndexOf('</main');
    if (ende < innen) ende = body.length;
    kopf = body.slice(0, open.index); fuss = body.slice(ende);
    ({ rest: haupt, brot } = loeseBrot(body.slice(innen, ende)));
  } else {
    ({ rest: haupt, brot } = loeseBrot(body));
    haupt = haupt.replace(/<(nav|header|footer)\b[\s\S]*?<\/\1\s*>/gi, m => { kopf += m + ' '; return ' '; });
  }
  // Skip-Link („Zum Hauptinhalt springen“) gehört nie zum Hauptinhalt
  if (/skip|springen|inhalt/i.test(haupt)) haupt = haupt.replace(RE_A(), (m, tag, innen) => {
    const a = attrs(tag); if (!(RE_SKIP_KLASSE.test(a.class || '') || (/^#/.test(a.href || '') && RE_SKIP_TEXT.test(stripTags(innen))))) return m;
    kopf += ' ' + m; return ' ';
  });
  return { kopf, brot, haupt, fuss };
}
const teile = pg => [pg.textKopf, pg.breadcrumbText, pg.text, pg.textFuss].filter(Boolean).join(' ');

/** Vollständige Analyse einer HTML-Seite. */
function parse(html, baseUrl) {
  const h = String(html || '');
  const head = section(h, /<head\b[\s\S]*?<\/head\s*>/i) || h.slice(0, 20000);
  const out = { title: '', metas: [], links: [], canonical: null, robots: null, description: '', lang: null, viewport: false,
    og: {}, twitter: {}, h1: [], h2: [], h3: [], headings: [], anchors: [], images: [], jsonld: [], jsonldErrors: [], text: '', textFull: '', textKopf: '', textFuss: '', breadcrumbText: '', wordCount: 0, hreflang: [], scripts: [], hasMain: false, hasBreadcrumbNav: false };
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(head); out.title = t ? norm(decode(t[1])) : '';
  const lang = /<html[^>]*\slang\s*=\s*["']?([a-zA-Z-]+)/i.exec(h); out.lang = lang ? lang[1] : null;
  const robots = [];
  for (const m of head.matchAll(tagRe('meta'))) {
    const a = attrs(m[0]); out.metas.push(a);
    const name = (a.name || '').toLowerCase(), prop = (a.property || '').toLowerCase();
    if (name === 'description') out.description = norm(a.content);
    if (name === 'robots' || name === 'googlebot') robots.push(a.content);
    if (name === 'viewport') out.viewport = true;
    if (prop.startsWith('og:')) out.og[prop] = a.content || '';
    if (name.startsWith('twitter:')) out.twitter[name] = a.content || '';
  }
  for (const m of head.matchAll(tagRe('link'))) {
    const a = attrs(m[0]); out.links.push(a);
    const rel = (a.rel || '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical') && a.href) out.canonical = abs(a.href, baseUrl);
    if (rel.includes('alternate') && a.hreflang) out.hreflang.push({ lang: a.hreflang, href: abs(a.href, baseUrl) });
  }
  // JSON-LD und Skript-Quellen (aus dem unveränderten HTML)
  for (const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const a = attrs('<script' + m[1] + '>');
    if (a.src) out.scripts.push(abs(a.src, baseUrl));
    if (/application\/ld\+json/i.test(a.type || '')) {
      const raw = m[2].trim();
      try { const d = JSON.parse(raw); (Array.isArray(d) ? d : [d]).forEach(x => out.jsonld.push(x)); }
      catch (e) { out.jsonldErrors.push({ message: e.message, excerpt: raw.slice(0, 160) }); }
    }
  }
  // Ab hier nur noch HTML ohne Skripte/Styles/Templates/Kommentare
  const rein = ohneCode(h);
  const body = section(rein, /<body\b[\s\S]*<\/body\s*>/i) || rein.replace(/<head\b[\s\S]*?<\/head\s*>/i, ' ');
  // robots-Metas außerhalb des <head> gelten für Suchmaschinen ebenfalls → in den strengsten Wert einbeziehen
  if (/<meta\b/i.test(body)) for (const m of body.matchAll(tagRe('meta'))) { const a = attrs(m[0]); if (/^(robots|googlebot)$/i.test(a.name || '')) robots.push(a.content); }
  out.robots = strictestRobots(robots);
  const mehrere = robots.map(r => String(r || '').trim()).filter(Boolean); if (mehrere.length > 1) out.robotsAll = mehrere;
  for (const m of body.matchAll(new RegExp(`<(h[1-6])\\b${A}>([\\s\\S]*?)<\\/\\1\\s*>`, 'gi'))) {
    const level = parseInt(m[1][1], 10), text = stripTags(m[2]).slice(0, 200);
    out.headings.push({ level, text });
    if (level === 1) out.h1.push(text); else if (level === 2) out.h2.push(text); else if (level === 3) out.h3.push(text);
  }
  for (const m of body.matchAll(tagRe('img'))) { const a = attrs(m[0]); out.images.push({ src: a.src || a['data-src'] || '', alt: a.alt, width: a.width, height: a.height, loading: a.loading }); }
  out.hasMain = /<main\b/i.test(body);
  out.hasBreadcrumbNav = RE_BROT.test(body) && [...body.matchAll(tagRe('nav|ol|ul'))].some(m => istBrot(m[0]));
  // Bereiche, Text und Links (Links im Hauptinhalt tragen main: true)
  const reg = regionen(body);
  const links = (stueck, main) => {
    for (const m of stueck.matchAll(RE_A())) {
      const a = attrs(m[1]); if (!a.href || /\$\{/.test(a.href)) continue;
      out.anchors.push({ href: abs(a.href, baseUrl), raw: a.href, text: stripTags(m[2]).slice(0, 120), rel: a.rel || '', nofollow: /nofollow/i.test(a.rel || ''), main });
    }
  };
  links(reg.kopf, false); links(reg.brot, false); links(reg.haupt, true); links(reg.fuss, false);
  out.textKopf = stripTags(reg.kopf); out.breadcrumbText = stripTags(reg.brot); out.text = stripTags(reg.haupt); out.textFuss = stripTags(reg.fuss);
  out.textFull = teile(out);
  out.wordCount = out.text ? out.text.split(' ').length : 0;
  // Eigenständige Kopie: Teilstrings (Attributwerte, Linktexte) hielten sonst das komplette HTML jeder Seite im Speicher.
  // Zugleich hat das Ergebnis damit exakt die Form, in der es auch aus dem Seitencache zurückkommt.
  return JSON.parse(JSON.stringify(out));
}
function abs(href, base) {
  try { return new URL(href, base).href; } catch (_) { return href; }
}

/**
 * Hash über die deploy-stabilen Inhalte einer Seite (Title, Description, Canonical, robots, H1, Haupttext, JSON-LD).
 * Ändert sich NICHT durch Build-IDs, Chunk-/CSS-/Font-Hashes oder Bild-Prüfsummen eines neuen Next.js-Builds.
 */
function contentHash(pg) {
  if (!pg) return null;
  const ld = JSON.stringify(pg.jsonld || []).replace(/\/_next\/[^"\\\s]*/g, '/_next/').replace(/(opengraph-image|twitter-image|apple-icon|icon)([^"\\\s?]*)\?[0-9a-zA-Z_-]+/g, '$1$2');
  return sha1(JSON.stringify([pg.title || '', pg.description || '', pg.canonical || '', pg.robots || '', pg.h1 || [], pg.text || '', ld]));
}

/** Seite platzsparend für den Seitencache ablegen: nichts doppelt (textFull, h1–h3 und absolute Link-Adressen sind ableitbar). */
function pack(pg, baseUrl) {
  if (!pg) return null;
  const o = { ...pg };
  if (teile(pg) === pg.textFull) delete o.textFull;
  const hs = lv => (pg.headings || []).filter(x => x.level === lv).map(x => x.text);
  for (const [k, lv] of [['h1', 1], ['h2', 2], ['h3', 3]]) if (JSON.stringify(pg[k] || []) === JSON.stringify(hs(lv))) delete o[k];
  o.anchors = (pg.anchors || []).map(a => { const t = [a.raw, a.text, a.rel || '', a.main ? 1 : 0]; if (abs(a.raw, baseUrl) !== a.href) t.push(a.href); return t; });
  return o;
}
/** Gegenstück zu pack(): liefert wieder das vollständige Seitenobjekt. */
function unpack(o, baseUrl) {
  if (!o) return null;
  const pg = { ...o };
  pg.anchors = (o.anchors || []).map(a => Array.isArray(a) ? { href: a.length > 4 ? a[4] : abs(a[0], baseUrl), raw: a[0], text: a[1], rel: a[2] || '', nofollow: /nofollow/i.test(a[2] || ''), main: !!a[3] } : a);
  const hs = lv => (pg.headings || []).filter(x => x.level === lv).map(x => x.text);
  if (pg.h1 === undefined) pg.h1 = hs(1);
  if (pg.h2 === undefined) pg.h2 = hs(2);
  if (pg.h3 === undefined) pg.h3 = hs(3);
  if (pg.textFull === undefined) pg.textFull = teile(pg);
  return pg;
}

/** Alle Objekte (inkl. @graph) mit @type aus JSON-LD flach. */
function flattenJsonLd(blocks) {
  const out = [];
  const walk = (x) => { if (!x || typeof x !== 'object') return; if (Array.isArray(x)) return x.forEach(walk); if (x['@graph']) walk(x['@graph']); if (x['@type']) out.push(x); for (const k of Object.keys(x)) if (k !== '@graph' && typeof x[k] === 'object') walk(x[k]); };
  walk(blocks); return out;
}
/** Nur Wurzel-Objekte (direkte Blöcke und @graph-Einträge) – für Pflichtfeld-Prüfungen. */
function topLevelJsonLd(blocks) {
  const out = [];
  for (const b of blocks) { if (!b || typeof b !== 'object') continue; if (Array.isArray(b['@graph'])) b['@graph'].forEach(x => x && x['@type'] && out.push(x)); else if (b['@type']) out.push(b); }
  return out;
}
module.exports = { parse, decode, stripTags, attrs, abs, flattenJsonLd, topLevelJsonLd, strictestRobots, contentHash, pack, unpack };
