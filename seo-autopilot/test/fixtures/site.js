'use strict';
// Test-Website für die Regel-Tests (Technik, Meta): lokaler HTTP-Server auf Zufallsport.
// Die Seiten bilden die Struktur der Website nach – Startseite, /preise/, /leistungen/<slug>/,
// /kfz-zulassung/<stadt>/, /zulassungsstelle/<slug>/, /kennzeichen/<kürzel>/, Rechtsseiten – mit dem Aufbau
// eines statischen Next.js-Exports (Skip-Link, Kopf- und Fußnavigation, <main> mit Breadcrumb „Brotkrumen“).
// Es gibt eine fehlerfreie Musterseite (/ok/) und je Regel mindestens eine bewusst fehlerhafte Seite.
//
//   const site = await start();            // vollständige Test-Website
//   const site = await start({ leer: true }); site.page('/', {...}); site.sitemap = ['/'];   // eigene kleine Website (Kopf/Fuß ohne Menülinks)
//   site.state.vorschau = true;            // alle Seiten „noindex, nofollow“ (wie ein versehentlich veröffentlichter Vorschau-Build)
//   site.robots = 'User-agent: *\nDisallow: /';   site.headers = {};   site.close()
const http = require('http');

const SATZ = [
  'Wir melden Ihr Fahrzeug bei der zuständigen Zulassungsbehörde an und schicken die Unterlagen per Post zurück.',
  'Für die Zulassung brauchen Sie die Zulassungsbescheinigung, eine eVB-Nummer und ein SEPA-Mandat für die Kfz-Steuer.',
  'Den Auftrag stellen Sie online, die nötigen Unterlagen laden Sie als Foto hoch.',
  'Neue Kennzeichen prägen wir auf Wunsch gleich mit und legen sie dem Paket bei.',
  'Bei der Ummeldung nach einem Umzug bleibt das bisherige Kennzeichen auf Wunsch erhalten.',
  'Eine Abmeldung ist auch möglich, wenn das Fahrzeug bereits verkauft oder verschrottet wurde.',
  'Rückfragen der Behörde klären wir direkt, damit Ihr Vorgang nicht liegen bleibt.',
  'Den Stand Ihres Auftrags erfahren Sie jederzeit per Nachricht.',
];
/** Fließtext mit etwa n Wörtern (für Wortzahl-abhängige Regeln). */
const text = (n = 110) => { const w = []; for (let i = 0; w.length < n; i++) w.push(...SATZ[i % SATZ.length].split(' ')); return w.slice(0, n).join(' ').replace(/[,.]?$/, '.'); };
const LANG = text(110);
// Sicherheits-Header, wie sie die Website in public/.htaccess setzt
const SICHER = { 'strict-transport-security': 'max-age=31536000; includeSubDomains', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY', 'permissions-policy': 'camera=(), microphone=(), geolocation=()', 'content-security-policy': "default-src 'self'; frame-ancestors 'none'" };

/**
 * HTML einer Seite. `null` lässt ein Element weg, `undefined` setzt einen unauffälligen Standardwert.
 * o: { title, desc, canonical, robots (Text oder Liste), h1 (Text oder Liste), body, links[], ld[], og ({ title, url, image } | false), head }
 */
function seite(o = {}, base = '', p = '/') {
  const t = o.title === undefined ? `Seite ${p} – Zulassung online` : o.title;
  const d = o.desc === undefined ? `Auf der Seite ${p} erfahren Sie, wie die Zulassung Ihres Fahrzeugs online funktioniert und welche Unterlagen Sie dafür brauchen.` : o.desc;
  const robots = o.robots === undefined || o.robots === null ? [] : [].concat(o.robots);
  const h1 = o.h1 === undefined ? [`Überschrift ${p}`] : o.h1 === null ? [] : [].concat(o.h1);
  const og = o.og === false ? null : { title: t || 'Seite', url: base + p, image: `${base}/opengraph-image?abc123`, ...(o.og || {}) };
  const kopf = [
    '<meta charSet="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>',
    t === null ? '' : `<title>${t}</title>`,
    d === null ? '' : `<meta name="description" content="${d}"/>`,
    ...robots.map(r => `<meta name="robots" content="${r}"/>`),
    o.canonical === null ? '' : `<link rel="canonical" href="${o.canonical === undefined ? base + p : o.canonical}"/>`,
    og ? [og.title ? `<meta property="og:title" content="${og.title}"/>` : '', og.url ? `<meta property="og:url" content="${og.url}"/>` : '', og.image ? `<meta property="og:image" content="${og.image}"/>` : ''].join('') : '',
    ...(o.ld || []).map(x => `<script type="application/ld+json">${typeof x === 'string' ? x : JSON.stringify(x)}</script>`),
    o.head || '',
  ].join('');
  // o.rahmen === false: Kopf und Fuß ohne Navigationslinks (für kleine eigene Test-Websites, die /preise/, /impressum/ … nicht haben)
  const menue = o.rahmen === false ? '' : '<nav aria-label="Hauptnavigation"><a href="/preise/">Preise</a><a href="/leistungen/">Leistungen</a><a href="/ok/">Ablauf</a></nav>';
  const nav = `<header><a aria-label="Startseite" href="/">KFZ-Zulassungsprofis</a>${menue}</header>`;
  const krume = p === '/' ? '' : `<nav aria-label="Brotkrumen"><ol><li><a href="/">Startseite</a></li><li><span aria-current="page">${p}</span></li></ol></nav>`;
  const inhalt = `${krume}${h1.map(h => `<h1>${h}</h1>`).join('')}${o.body === undefined ? `<p>${LANG}</p>` : o.body}${(o.links || []).map(l => `<a href="${l}">Mehr zu ${l}</a>`).join(' ')}`;
  const fuss = `<footer>${o.rahmen === false ? '' : '<nav aria-label="Rechtliches"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a></nav>'}<p>© KFZ-Zulassungsprofis</p></footer>`;
  return `<!DOCTYPE html><!--build123--><html lang="de"><head>${kopf}</head><body><a href="#hauptinhalt" class="skip-link">Zum Hauptinhalt springen</a>${nav}<main id="hauptinhalt">${inhalt}</main>${fuss}<script>self.__next_f=self.__next_f||[];self.__next_f.push([1,"Text nur im Skript"])</script></body></html>`;
}

/**
 * Server starten. Routen: site.route(pfad, handler) bzw. site.page(pfad, optionen für seite()).
 * handler(req, site) liefert { html } | { redirect, status? } | { status, type?, body?, headers? }, jeweils optional mit { delay: ms }.
 * /robots.txt und /sitemap.xml entstehen aus site.robots und site.sitemap (Pfade oder { p, lastmod }), solange keine eigene Route gesetzt ist.
 */
function start(opts = {}) {
  const routes = new Map();
  const site = {
    base: '', requests: [], state: {}, headers: { ...SICHER }, robots: null, sitemap: [], rahmen: !opts.leer,
    route(p, fn) { routes.set(p, typeof fn === 'function' ? fn : () => fn); return site; },
    page(p, o = {}) { return site.route(p, () => { const x = { ...(site.rahmen ? {} : { rahmen: false }), ...(typeof o === 'function' ? o(site) : o) }; return { html: seite(site.state.vorschau ? { ...x, robots: 'noindex, nofollow' } : x, site.base, p), ...(x.delay ? { delay: x.delay } : {}) }; }); },
    weiter(p, ziel, status = 301) { return site.route(p, () => ({ redirect: /^https?:/.test(ziel) ? ziel : site.base + ziel, status })); },
    close() { return new Promise(r => { srv.closeAllConnections(); srv.close(() => r()); }); },
  };
  const eingebaut = {
    '/robots.txt': () => ({ status: 200, type: 'text/plain; charset=utf-8', body: site.robots === null ? `User-Agent: *\nAllow: /\nSitemap: ${site.base}/sitemap.xml\n` : site.robots }),
    '/sitemap.xml': () => ({ status: 200, type: 'application/xml', body: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${site.sitemap.map((e, i) => { const x = typeof e === 'string' ? { p: e } : e; const lm = x.lastmod === undefined ? (i % 2 ? '2026-11-03T00:00:00.000Z' : '2026-08-13T00:00:00.000Z') : x.lastmod; return `<url><loc>${site.base}${x.p}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}</url>`; }).join('')}</urlset>` }),
  };
  const srv = http.createServer(async (req, res) => {
    const p = req.url.split('?')[0]; site.requests.push({ method: req.method, path: p });
    const fn = routes.get(p) || eingebaut[p];
    const out = fn ? await fn(req, site) : { status: 404, type: 'text/html; charset=UTF-8', body: '<html><head><title>Seite nicht gefunden</title><meta name="robots" content="noindex"/></head><body><h1>Seite nicht gefunden</h1></body></html>' };
    if (out.delay) await new Promise(r => setTimeout(r, out.delay));
    if (out.redirect) { res.writeHead(out.status || 301, { location: out.redirect }); return res.end(); }
    if (out.html !== undefined) { res.writeHead(200, { 'content-type': 'text/html; charset=UTF-8', ...site.headers, ...(out.headers || {}) }); return res.end(req.method === 'HEAD' ? '' : out.html); }
    res.writeHead(out.status || 200, { 'content-type': out.type || 'text/plain; charset=utf-8', ...(out.headers || {}) });
    res.end(req.method === 'HEAD' ? '' : (out.body || ''));
  });
  return new Promise(resolve => srv.listen(0, '127.0.0.1', () => { site.base = `http://127.0.0.1:${srv.address().port}`; if (!opts.leer) kfzWebsite(site); resolve(site); }));
}

// Seiten der vollständigen Test-Website. Zweite Spalte: steht die Seite in der Sitemap?
// Dritte Spalte: Optionen für seite(). Was eine Seite auslösen soll, steht im Kommentar dahinter.
function kfzWebsite(site) {
  const B = site.base; const S = []; // Sitemap-Pfade
  const seiteAn = (p, inSitemap, o) => { site.page(p, o || {}); if (inSitemap) S.push(p); };
  const fehlerseiten = ['/kaputt/', '/gesperrt/', '/fehler/', '/weiter/', '/loop/', '/endlos/', '/kaputt-canonical/', '/canonical-weiter/', '/canonical-fremd/', '/sm-canonical/', '/ohne/', '/nicht-in-sitemap/', '/noindex-in-sitemap/', '/wichtig-noindex/', '/alt/index.html', '/entwurf-agb/', '/entwurf-liste/', '/langsam/', '/unterlagen/'];
  const metaseiten = ['/title-lang/', '/title-lang-ohne-vorschlag/', '/title-kurz/', '/dup-a/', '/dup-b/', '/desc-lang/', '/desc-kurz/', '/desc-unpassend/', '/h1-doppelt/', '/spruenge/', '/ohne-h2/', '/og-unpassend/', '/og-url/', '/og-ohne-bild/'];

  // ── Fehlerfreie Seiten ──
  seiteAn('/', true, { title: 'Kfz-Zulassung online ohne Behördentermin | KFZ-Zulassungsprofis', h1: 'Auto online anmelden, ummelden oder abmelden', desc: 'Auto online anmelden, ummelden oder abmelden – wir übernehmen die Zulassung Ihres Fahrzeugs bei der Behörde und senden die Unterlagen zurück.', body: `<p>${LANG}</p><h2>Leistungen</h2><p>${text(40)}</p><a href="/downloads/anleitung.pdf">Anleitung als PDF</a> <a href="/downloads/fehlt.pdf">Checkliste als PDF</a>`, links: ['/kfz-zulassung/', '/zulassungsstelle/', '/kennzeichen/', '/auftrag/?leistung=neuzulassung', ...fehlerseiten, ...metaseiten] });
  seiteAn('/ok/', true, { title: 'So läuft die Kfz-Zulassung online ab | KFZ-Zulassungsprofis', h1: 'So läuft die Kfz-Zulassung online ab', desc: 'Schritt für Schritt zur Zulassung: Auftrag online stellen, Unterlagen hochladen, Kennzeichen und Papiere per Post erhalten.', body: `<p>${LANG}</p><h2>Auftrag stellen</h2><p>${text(90)}</p><h3>Unterlagen hochladen</h3><p>${text(60)}</p><h2>Zustellung</h2><p>${text(80)}</p>`, links: ['/preise/', '/leistungen/neuzulassung/'] });
  seiteAn('/preise/', true, { title: 'Preise für die Kfz-Zulassung online | KFZ-Zulassungsprofis', h1: 'Preise' });
  seiteAn('/auftrag/', true, { title: 'Online-Auftrag für Ihre Zulassung | KFZ-Zulassungsprofis', h1: 'Online-Auftrag' });
  seiteAn('/leistungen/', true, { links: ['/leistungen/neuzulassung/'] });
  seiteAn('/leistungen/neuzulassung/', true, { title: 'Neuzulassung online beauftragen | KFZ-Zulassungsprofis', h1: 'Neuzulassung' });
  seiteAn('/kfz-zulassung/', true, { links: ['/kfz-zulassung/berlin/', '/kfz-zulassung/aachen/'] });
  seiteAn('/kfz-zulassung/berlin/', true, { title: 'Kfz-Zulassung Berlin ohne Termin | KFZ-Zulassungsprofis', h1: 'Kfz-Zulassung in Berlin – ohne Termin' }); // indexierbar ohne robots-Angabe
  seiteAn('/kfz-zulassung/aachen/', false, { robots: 'noindex, follow' }); // Index-Gate: noindex, nicht in der Sitemap (im Vorlauf des Tests noch indexierbar → index-verlust)
  seiteAn('/zulassungsstelle/', true, { links: ['/zulassungsstelle/berlin/', '/zulassungsstelle/hamburg/', '/zulassungsstelle/koeln/'] });
  seiteAn('/zulassungsstelle/berlin/', true, { title: 'Zulassungsstelle Berlin: Adresse | KFZ-Zulassungsprofis', h1: 'Zulassungsstelle Berlin' });
  seiteAn('/zulassungsstelle/hamburg/', true, { robots: 'noindex, follow' }); // noindex, aber in der Sitemap → sitemap-index-abweichung
  seiteAn('/zulassungsstelle/koeln/', false, {}); // indexierbar, aber nicht in der Sitemap → sitemap-index-abweichung
  seiteAn('/kennzeichen/', true, { links: ['/kennzeichen/hog/', '/kennzeichen/b/', '/kennzeichen/m/', '/kennzeichen/k/'] });
  seiteAn('/kennzeichen/hog/', true, { title: 'HOG-Kennzeichen: Hofgeismar | KFZ-Zulassungsprofis', h1: 'Kennzeichen HOG: Hofgeismar' });
  // noindex-Detailseiten mit absichtlich schlechten Meta-Angaben: werden von den Meta-Regeln nicht geprüft
  for (const k of ['b', 'm', 'k']) seiteAn(`/kennzeichen/${k}/`, false, { robots: 'noindex, follow', title: `${k.toUpperCase()}-Kennzeichen: ein absichtlich viel zu langer Seitentitel für eine nicht indexierte Detailseite`, desc: null, h1: ['Erste H1', 'Zweite H1'], og: false });
  seiteAn('/impressum/', false, { robots: 'noindex', title: 'Impressum | KFZ-Zulassungsprofis', h1: 'Impressum' });
  seiteAn('/datenschutz/', false, { robots: 'noindex', title: 'Datenschutzerklärung | KFZ-Zulassungsprofis', h1: 'Datenschutzerklärung' });
  seiteAn('/servicebedingungen/', false, { robots: 'noindex, follow', title: 'Servicebedingungen | KFZ-Zulassungsprofis' }); // Entwurf, korrekt versteckt (nicht verlinkt, nicht in der Sitemap)
  // Fehlerseite des Exports (zwei robots-Angaben, Canonical /_not-found/) und Bestätigungsdatei der Search Console: keine Inhaltsseiten
  site.route('/404/', () => ({ html: seite({ title: 'KFZ-Zulassungsprofis – Kfz-Zulassung. Einfach digital.', desc: null, canonical: site.base + '/_not-found/', h1: 'Seite nicht gefunden', og: false, body: '<p>Diese Seite gibt es nicht.</p>' }, site.base, '/404/') }));
  site.route('/google1a2b3c4d5e6f7a8b.html', () => ({ html: 'google-site-verification: google1a2b3c4d5e6f7a8b.html' }));
  site.route('/downloads/anleitung.pdf', { status: 200, type: 'application/pdf', body: '%PDF-1.4' });

  // ── Technik: bewusst fehlerhafte Seiten ──
  S.push('/fehlt/'); // steht in der Sitemap, liefert 404 (nicht verlinkt) → sitemap-404
  // /kaputt/: verlinkt, liefert 404 → defekter-link
  site.route('/gesperrt/', { status: 401, type: 'text/html; charset=UTF-8', body: '<html><body>Login erforderlich</body></html>' }); // → gesperrt
  site.route('/fehler/', { status: 500, type: 'text/html; charset=UTF-8', body: '<html><body>Fehler</body></html>' }); // → serverfehler
  site.weiter('/weiter/', '/weiter2/').weiter('/weiter2/', '/ok/', 302); S.push('/weiter/'); // → redirect-kette, sitemap-redirect
  site.weiter('/einfach/', '/ok/'); // ein Sprung, sauber
  site.weiter('/loop/', '/loop2/', 302).weiter('/loop2/', '/loop/', 302); // → redirect-loop
  for (let i = 0; i < 8; i++) site.weiter(i ? `/endlos/${i}/` : '/endlos/', `/endlos/${i + 1}/`); // → redirect-kette (zu viele Sprünge)
  seiteAn('/kaputt-canonical/', false, { canonical: B + '/fehlt/' }); // → canonical-ziel (Ziel 404)
  seiteAn('/canonical-weiter/', false, { canonical: B + '/weiter/' }); // → canonical-ziel (Ziel leitet weiter)
  seiteAn('/canonical-fremd/', false, { canonical: 'https://www.andere-domain.example/seite/' }); // → canonical-fremd
  seiteAn('/sm-canonical/', true, { canonical: B + '/ok/' }); // → sitemap-canonical
  seiteAn('/ohne/', true, { title: null, desc: null, canonical: null, h1: null, og: false }); // → canonical-fehlt, title-fehlt, description-fehlt, h1-fehlt, og-fehlt
  seiteAn('/verwaist/', true, {}); // in der Sitemap, nirgends verlinkt → verwaist
  seiteAn('/nicht-in-sitemap/', false, {}); // indexierbar, verlinkt → sitemap-fehlt
  seiteAn('/noindex-in-sitemap/', true, { robots: 'noindex, follow' }); // → noindex-sitemap
  seiteAn('/wichtig-noindex/', true, { robots: 'noindex' }); // wichtige Seite → noindex-wichtig (und nur das)
  seiteAn('/intern/seite/', true, {}); // per robots.txt gesperrt, in der Sitemap → robots-sitemap
  seiteAn('/intern/wichtig/', true, {}); // gesperrt und wichtig → robots-wichtig (und nur das)
  site.route('/alt/index.html', () => ({ html: seite({ canonical: site.base + '/alt/' }, site.base, '/alt/index.html') })); // → index-html-dublette
  seiteAn('/entwurf-agb/', true, {}); // Entwurf ohne noindex und in der Sitemap → entwurf-oeffentlich
  seiteAn('/entwurf-liste/', true, { robots: 'noindex, follow' }); // Entwurf mit noindex, aber in der Sitemap → entwurf-oeffentlich
  seiteAn('/langsam/', true, { delay: 400 }); // wichtige Seite mit langsamer Antwort (zusammen mit einem langsamen Vorlauf → langsam)
  seiteAn('/unterlagen/', false, { robots: 'noindex, follow', title: null, desc: null, h1: null }); // wichtig, bewusst noindex: Title und H1 müssen trotzdem da sein → title-fehlt, h1-fehlt

  // ── Meta: bewusst fehlerhafte Seiten (alle indexierbar und in der Sitemap) ──
  seiteAn('/title-lang/', true, { title: 'Kfz-Zulassung in Musterstadt online beauftragen | KFZ-Zulassungsprofis', h1: 'Zulassung in Musterstadt' }); // 70 Zeichen → Vorschlag ohne Marke
  seiteAn('/title-lang-ohne-vorschlag/', true, { title: 'Alles über Wunschkennzeichen, Kurzzeitkennzeichen, Saisonkennzeichen und Ausfuhrkennzeichen', h1: 'Preise' }); // kein Vorschlag, der nicht schlechter wäre
  seiteAn('/title-kurz/', true, { title: 'Kontakt', h1: 'Kontakt und Erreichbarkeit' });
  for (const x of ['a', 'b']) seiteAn(`/dup-${x}/`, true, { title: 'Auto ummelden nach dem Umzug | KFZ-Zulassungsprofis', desc: 'Auto ummelden nach dem Umzug: Unterlagen, Ablauf und Kosten der Ummeldung – online und ohne Termin bei der Zulassungsbehörde.', h1: `Auto ummelden (${x})` });
  seiteAn('/desc-lang/', true, { desc: 'Wir melden Ihr Fahrzeug bei der zuständigen Zulassungsbehörde an. Die Unterlagen kommen per Post zurück, neue Kennzeichen legen wir auf Wunsch bei, und Rückfragen der Behörde klären wir direkt für Sie.' });
  seiteAn('/desc-kurz/', true, { desc: 'Zulassung online, Unterlagen per Post.' });
  seiteAn('/desc-unpassend/', true, { desc: 'Günstige Flugreisen, Hotels und Mietwagen für den Sommerurlaub am Mittelmeer vergleichen und sofort buchen.' });
  seiteAn('/h1-doppelt/', true, { h1: ['Erste Hauptüberschrift', 'Zweite Hauptüberschrift'] });
  seiteAn('/spruenge/', true, { body: `<p>${LANG}</p><h3>Direkt eine dritte Ebene</h3><p>Text.</p><h2>Zweite Ebene</h2><h4>Vierte Ebene ohne dritte</h4>` });
  seiteAn('/ohne-h2/', true, { body: `<p>${text(430)}</p>` });
  seiteAn('/og-unpassend/', true, { og: { title: 'Sommerurlaub buchen' } });
  seiteAn('/og-url/', true, { og: { url: B + '/eine-andere-adresse/' } });
  seiteAn('/og-ohne-bild/', true, { og: { image: '' } });

  site.sitemap = S;
  site.robots = `User-Agent: *\nAllow: /\nDisallow: /intern/\nSitemap: ${B}/sitemap.xml\n`;
  return site;
}

/** Konfiguration des Autopiloten passend zur Test-Website (unabhängig von seo-autopilot/config.js). */
function konfiguration(site, extra = {}) {
  return {
    base: site.base,
    crawl: { maxPages: 300, concurrency: 4, delayMs: 0, timeoutMs: 5000, retries: 0, retryDelayMs: 0 },
    importantPaths: ['/', '/ok/', '/preise/', '/auftrag/', '/leistungen/', '/kfz-zulassung/berlin/', '/impressum/', '/datenschutz/', '/unterlagen/', '/wichtig-noindex/', '/intern/wichtig/', '/langsam/'],
    allowNoindex: ['/impressum/', '/datenschutz/', '/unterlagen/', '/servicebedingungen/', '/404/'],
    allowNoindexPatterns: [/^\/kennzeichen\/[^/]+\/$/, /^\/zulassungsstelle\/[^/]+\/$/, /^\/kfz-zulassung\/[^/]+\/$/],
    extraPaths: ['/servicebedingungen/', '/404/', '/google1a2b3c4d5e6f7a8b.html'],
    entwurfSeiten: ['/servicebedingungen/', '/entwurf-agb/', '/entwurf-liste/'],
    redirectChecks: [],
    company: { name: 'Beispiel GmbH', brand: 'KFZ-Zulassungsprofis' },
    altmarke: { domain: 'deutschezulassung.de' },
    langsamMs: 150,
    ...extra,
  };
}

module.exports = { start, seite, kfzWebsite, konfiguration, text, LANG, SICHER };
