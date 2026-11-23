'use strict';
// Test-Website für die Kern-Tests (Crawler, Parser, Offline-Modus): lokaler HTTP-Server auf Zufallsport.
// Die Seiten sind wie ein statischer Next.js-Export aufgebaut (Build-ID-Kommentar, Chunk-/CSS-Hashes,
// self.__next_f-Daten, Skip-Link, Kopf-/Fußnavigation, <main> mit Breadcrumb „Brotkrumen“), und der
// Server verhält sich bei ETags wie ein Apache mit Kompression: Der ETag trägt das Suffix „-gzip“,
// ein 304 gibt es aber nur für den ETag OHNE Suffix (oder für If-Modified-Since allein).
const http = require('http');
const crypto = require('crypto');

const LAST_MODIFIED = 'Tue, 03 Nov 2026 08:00:00 GMT';
const SATZ = 'Wir melden Ihr Fahrzeug bei der zuständigen Zulassungsbehörde an und schicken die Unterlagen per Post zurück.';
const LANG = Array.from({ length: 12 }, (_, i) => `${SATZ} Schritt ${i + 1} ist schnell erledigt und wird persönlich geprüft.`).join(' ');

/** HTML einer Seite. `build` steht für alles, was sich bei jedem Deploy ändert, ohne dass sich der Inhalt ändert. */
function seite({ title, desc, robots = [], canonical, h1, body = '', ld = [], build = 'b1', brot = true, main = true, head = '' }, base, p) {
  const t = title === undefined ? `Seite ${p}` : title;
  const kopf = [
    `<meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>`,
    `<link rel="stylesheet" href="/_next/static/css/${build}c0ffee.css" data-precedence="next"/>`,
    `<script src="/_next/static/chunks/main-${build}abc123.js" async=""></script>`,
    t === null ? '' : `<title>${t}</title>`,
    desc === null ? '' : `<meta name="description" content="${desc === undefined ? 'Beschreibung der Seite ' + p + ' mit Zulassung, Ummeldung und Abmeldung' : desc}"/>`,
    ...robots.map(r => `<meta name="robots" content="${r}"/>`),
    canonical === null ? '' : `<link rel="canonical" href="${canonical === undefined ? base + p : canonical}"/>`,
    `<meta property="og:title" content="${t || 'Seite'}"/><meta property="og:image" content="${base}/opengraph-image?${build}99"/>`,
    ...ld.map(x => `<script type="application/ld+json">${typeof x === 'string' ? x : JSON.stringify(x)}</script>`),
    head,
  ].join('');
  const nav = `<header class="sticky"><a aria-label="Startseite" href="/">KFZ-Zulassungsprofis</a><nav aria-label="Hauptnavigation"><a href="/preise/">Preise</a><a href="/auftrag/">Auftrag starten</a></nav></header>`;
  const krume = brot ? `<nav aria-label="Brotkrumen"><ol><li><a href="/">Startseite</a></li><li><span aria-current="page">${p}</span></li></ol></nav>` : '';
  const inhalt = `${krume}<h1 class="h-seite">${h1 === undefined ? 'Überschrift ' + p : h1}</h1>${body}`;
  const fuss = `<footer><nav aria-label="Rechtliches"><a href="/impressum/">Impressum</a></nav><p>© 2026 KFZ-Zulassungsprofis</p></footer>`;
  return `<!DOCTYPE html><!--${build}_BuildId--><html lang="de" class="__variable_${build}f00"><head>${kopf}</head><body class="flex"><div hidden=""><!--$--><!--/$--></div><a href="#hauptinhalt" class="skip-link">Zum Hauptinhalt springen</a>${nav}${main ? `<main id="hauptinhalt" class="flex-1">${inhalt}</main>` : `<div id="hauptinhalt">${inhalt}</div>`}${fuss}<script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"1:\\"$Sreact.fragment\\"\\n2:I[123,[\\"${build}\\",\\"static/chunks/${build}.js\\"],\\"Geheimtext nur im Skript\\"]\\n"])</script></body></html>`;
}

/**
 * Server starten. Routen: site.route(pfad, handler). handler(req, site) liefert
 *   { html }                          → 200 text/html mit ETag/Last-Modified (bedingte Anfragen wie Apache)
 *   { redirect: ziel, status? }       → Weiterleitung (Standard 301)
 *   { status, type?, body?, headers?} → beliebige Antwort
 * jeweils optional mit { delay: ms }. Alle Anfragen stehen in site.requests ({ method, path, url, headers }).
 */
function start() {
  const routes = new Map(); let aktiv = 0;
  const site = { base: '', requests: [], maxParallel: 0, state: {}, route(p, fn) { routes.set(p, typeof fn === 'function' ? fn : () => fn); return site; }, page(p, o) { return site.route(p, () => ({ html: seite({ build: site.state.build || 'b1', ...(typeof o === 'function' ? o(site) : o) }, site.base, p) })); }, hits(p, method) { return site.requests.filter(r => r.path === p && (!method || r.method === method)); }, close() { return new Promise(r => { srv.closeAllConnections(); srv.close(() => r()); }); } };
  const srv = http.createServer(async (req, res) => {
    const p = req.url.split('?')[0]; site.requests.push({ method: req.method, path: p, url: req.url, headers: req.headers });
    aktiv++; site.maxParallel = Math.max(site.maxParallel, aktiv);
    try {
      const fn = routes.get(p);
      const out = fn ? await fn(req, site) : { status: 404, type: 'text/html', body: '<html><head><title>404</title><meta name="robots" content="noindex"/></head><body><h1>Seite nicht gefunden</h1></body></html>' };
      if (out.delay) await new Promise(r => setTimeout(r, out.delay));
      if (out.redirect) { res.writeHead(out.status || 301, { location: out.redirect }); return res.end(); }
      if (out.html !== undefined) {
        const kurz = crypto.createHash('md5').update(out.html).digest('hex').slice(0, 12);
        const inm = req.headers['if-none-match'], ims = req.headers['if-modified-since'];
        const h = { 'content-type': 'text/html; charset=UTF-8', etag: `"${kurz}-gzip"`, 'last-modified': LAST_MODIFIED, 'strict-transport-security': 'max-age=31536000', ...(out.headers || {}) };
        if (inm ? inm === `"${kurz}"` : ims === LAST_MODIFIED) { res.writeHead(304, { etag: h.etag }); return res.end(); }
        res.writeHead(200, h); return res.end(req.method === 'HEAD' ? '' : out.html);
      }
      res.writeHead(out.status || 200, { 'content-type': out.type || 'text/plain; charset=utf-8', ...(out.headers || {}) });
      res.end(req.method === 'HEAD' ? '' : (out.body || ''));
    } finally { aktiv--; }
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => { site.base = `http://127.0.0.1:${srv.address().port}`; resolve(site); }));
}
module.exports = { start, seite, LANG, SATZ, LAST_MODIFIED };
