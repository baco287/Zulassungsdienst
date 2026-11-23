'use strict';
// ─── Korrekturvorschläge: Quelldatei(en), Freigabestufe und nächste Schritte je Befund ─
// Es wird NICHTS geändert und nichts erzeugt außer Text. Die Website entsteht aus Next.js-Quellen
// (app/**/page.tsx, lib/*.ts, config/*.json); der fertige Build (out/) ist einzeiliges HTML – Patches
// dagegen wären wertlos. Ein Vorschlag nennt deshalb die Quelldatei(en), in denen die Ursache liegt,
// die Freigabestufe im Klartext und die konkreten nächsten Schritte.
//
// Alle unten genannten Pfade sind gegen das Repo geprüft (test/suggest-local.test.js prüft das bei
// jedem Testlauf erneut). Zur Laufzeit werden nur Dateien genannt, die es im Repo wirklich gibt.
const fs = require('fs');
const path = require('path');
const { pathOf, pageType } = require('./util');

const REPO = path.resolve(__dirname, '..', '..'); // Wurzel des Website-Repos (wie config.repoRoot)

// ── Seitenquellen ───────────────────────────────────────────────────────────
// Bereiche mit Übersicht (/bereich/) und Detailseiten (/bereich/<slug>/). Bei Detailseiten steht die
// Datenquelle vorn (dort stehen die Texte), die Seitenvorlage dahinter.
const BEREICHE = {
  leistungen: { was: 'Leistungsseiten', hub: ['app/leistungen/page.tsx', 'lib/services.ts'], detail: ['lib/services.ts', 'lib/serviceContent.ts', 'lib/catalog.ts', 'app/leistungen/[slug]/page.tsx'] },
  ratgeber: { was: 'Ratgeber-Artikel', hub: ['app/ratgeber/page.tsx', 'lib/ratgeber.ts'], detail: ['lib/ratgeber.ts', 'app/ratgeber/[slug]/page.tsx'] },
  'kfz-zulassung': { was: 'Stadtseiten', hub: ['app/kfz-zulassung/page.tsx', 'lib/staedte.ts'], detail: ['lib/staedte.ts', 'app/kfz-zulassung/[stadt]/page.tsx'] },
  zulassungsstelle: { was: 'Behördenseiten', hub: ['app/zulassungsstelle/page.tsx', 'lib/zulassungsstellen.ts'], detail: ['lib/zulassungsstellen.ts', 'lib/data/zulassungsstellen.json', 'app/zulassungsstelle/[slug]/page.tsx'] },
  kennzeichen: { was: 'Kennzeichenseiten', hub: ['app/kennzeichen/page.tsx', 'lib/zulassungsstellen.ts'], detail: ['lib/zulassungsstellen.ts', 'lib/data/zulassungsstellen.json', 'app/kennzeichen/[kuerzel]/page.tsx'] },
  gewerbe: { was: 'Gewerbeseiten', hub: ['app/gewerbe/page.tsx', 'lib/gewerbe.ts'], detail: ['lib/gewerbe.ts', 'app/gewerbe/[slug]/page.tsx'] },
};
const START = ['app/page.tsx', 'lib/homepage.ts'];
const LANDING = ['lib/landingpages.ts', 'app/[landing]/page.tsx'];
// Dateien und Sonderseiten mit eigener Quelle
const SONDER = {
  '/sitemap.xml': { was: 'Sitemap', files: ['app/sitemap.ts'] },
  '/robots.txt': { was: 'robots.txt', files: ['app/robots.ts'] },
  '/llms.txt': { was: 'llms.txt', files: ['app/llms.txt/route.ts'] },
  '/404/': { was: 'Fehlerseite', files: ['app/not-found.tsx'] },
  '/404.html': { was: 'Fehlerseite', files: ['app/not-found.tsx'] },
};
// Feste Seiten (app/<pfad>/page.tsx), deren Inhalt zusätzlich aus einer Datenquelle bzw. Komponente kommt
const ZUSATZ = {
  '/faq/': ['lib/faq.ts'],
  '/anleitung/': ['lib/anleitung.ts'],
  '/ablauf/': ['lib/processSteps.ts'],
  '/zulassung-per-whatsapp/': ['lib/whatsappFlow.ts'],
  '/impressum/': ['lib/site.ts'],
  '/rechner/kfz-steuer/': ['components/KfzSteuerRechner.tsx'],
  '/rechner/behoerdengang/': ['components/BehoerdengangRechner.tsx'],
};
const TYP_NAME = { recht: 'Rechtsseite', rechner: 'Rechner', vorlage: 'Vorlage', hub: 'Übersichtsseite' };
// Seitentypen, deren Texte für viele Seiten gemeinsam in einer Datenquelle stehen (dort den Eintrag der Seite suchen)
const MIT_DATENQUELLE = ['leistung', 'ratgeber', 'stadt', 'behoerde', 'kennzeichen', 'gewerbe', 'landing'];

// ── Querschnitt je Regel ────────────────────────────────────────────────────
// Themen mit zentraler Quelle. `live`: am Build nicht prüfbar (braucht den Server). `tipp`: Hinweis für die Schritte.
const QUERSCHNITT = {
  sitemap: { was: 'Sitemap', files: ['app/sitemap.ts'], tipp: 'Die Sitemap entsteht beim Build aus denselben Daten wie die Seiten; app/sitemap.ts nimmt nur Seiten auf, die das Index-Gate freigibt.' },
  sitemapGate: { was: 'Sitemap und Index-Gate', files: ['app/sitemap.ts', 'lib/indexGate.ts'], tipp: 'Sitemap und noindex folgen derselben Entscheidung (lib/indexGate.ts): Eine Seite steht genau dann in der Sitemap, wenn sie indexierbar ist.' },
  robots: { was: 'robots.txt', files: ['app/robots.ts'] },
  robotsSitemap: { was: 'robots.txt und Sitemap', files: ['app/robots.ts', 'app/sitemap.ts'] },
  htaccess: { was: 'Weiterleitungen und Antwort-Header', files: ['public/.htaccess'], live: true },
  altdomain: { was: 'Weiterleitung der alten Domain', files: ['deploy/alte-domain/.htaccess', 'config/migration.json'], live: true, tipp: 'Diese Datei legt der Deploy in den Ordner der alten Domain, solange in config/migration.json die Stufe „live“ steht.' },
  gate: { was: 'Index-Gate: index oder noindex', files: ['lib/indexGate.ts', 'lib/features.ts'], tipp: 'Sind auf einmal sehr viele oder alle Seiten noindex, wurde vermutlich ein Vorschau-Build veröffentlicht (NEXT_PUBLIC_NOINDEX bzw. NEXT_PUBLIC_STAGING, siehe lib/features.ts) oder das Prüfdatum der Behördendaten ist abgelaufen.' },
  gateDaten: { was: 'Index-Gate: index oder noindex', files: ['lib/indexGate.ts', 'lib/data/zulassungsstellen.json', 'lib/features.ts'], tipp: 'Sind auf einmal sehr viele oder alle Seiten noindex, wurde vermutlich ein Vorschau-Build veröffentlicht (NEXT_PUBLIC_NOINDEX bzw. NEXT_PUBLIC_STAGING, siehe lib/features.ts) oder das Prüfdatum der Behördendaten ist abgelaufen.' },
  vorschau: { was: 'Vorschau-Schalter: noindex für die ganze Website', files: ['lib/features.ts', 'config/migration.json'], tipp: 'Ein Live-Build darf den Vorschau-Schalter nicht tragen: Der Deploy setzt NEXT_PUBLIC_NOINDEX aus der Stufe in config/migration.json („live“ = indexierbar).' },
  entwurf: { was: 'Schalter für Entwurfsseiten', files: ['lib/features.ts', 'app/sitemap.ts'], tipp: 'Eine Entwurfsseite muss noindex bleiben und darf nicht in der Sitemap stehen, bis sie rechtlich geprüft und in lib/features.ts freigeschaltet ist.' },
  canonical: { was: 'Canonical-Vorgabe', files: ['app/layout.tsx'], tipp: 'Das Canonical kommt aus der Vorgabe in app/layout.tsx (eigene Adresse), sofern die Seite kein eigenes setzt.' },
  titel: { was: 'Titel-Länge und Marken-Zusatz', files: ['lib/seo.ts', 'app/layout.tsx'], tipp: 'Der Marken-Zusatz wird nur angehängt, solange der Titel in die Höchstlänge passt (fitTitle und TITLE_MAX in lib/seo.ts); feste Seiten bekommen ihn über die Titel-Vorlage in app/layout.tsx.' },
  ogBild: { was: 'Vorschaubilder', files: ['lib/og.tsx'] },
  breadcrumb: { was: 'Brotkrumen-Markup', files: ['components/Breadcrumbs.tsx'] },
  fuss: { was: 'Fußzeile', files: ['components/Footer.tsx'], tipp: 'Das Jahr in der Fußzeile wird beim Build gesetzt – ein neuer Build mit Deploy aktualisiert es auf allen Seiten.' },
  preise: { was: 'Preise, mit Freigabe', files: ['config/preise.json', 'lib/pricing.ts'], tipp: 'Preise nie im Seitentext ändern: Betrag in config/preise.json anpassen und dort „stand“ aktualisieren. Lokal mit `npm run check:preise` gegenprüfen.' },
  soll: { was: 'Sollwerte für Preise und Zeiten', files: ['config/preise.json', 'config/betrieb.json'], tipp: 'Der Autopilot liest seine Sollwerte aus diesen beiden Dateien; sind sie nicht lesbar, entfällt der Abgleich von Preisen und Zeiten.' },
  firma: { was: 'Firmendaten', files: ['lib/site.ts'] },
  firmaSchema: { was: 'Firmendaten', files: ['lib/site.ts', 'app/layout.tsx'], tipp: 'Das Organization-Markup jeder Seite entsteht in app/layout.tsx aus den Stammdaten in lib/site.ts.' },
  impressum: { was: 'Firmendaten', files: ['lib/site.ts', 'app/impressum/page.tsx'] },
  behoerden: { was: 'Behördendaten mit Prüfdatum', files: ['lib/data/zulassungsstellen.json', 'lib/indexGate.ts'], tipp: 'Behördendaten neu prüfen und mit `npm run import:zulassungsstellen` einspielen; das Prüfdatum (geprueftAm) kommt aus den neu geprüften Daten. Ist es zu alt, setzt das Index-Gate die Seiten auf noindex und nimmt sie aus der Sitemap.' },
  zeiten: { was: 'Zeiten und Abläufe', files: ['config/betrieb.json', 'lib/betrieb.ts'], tipp: 'Zeit- und Ablaufangaben kommen aus config/betrieb.json; nach einer Änderung `npm run check:daten` ausführen.' },
  widerruf: { was: 'Widerrufsbelehrung', files: ['app/widerruf/page.tsx'] },
  seiteWeg: { was: 'Weiterleitungen', files: ['public/.htaccess'], tipp: 'Wurde die Seite absichtlich entfernt oder umbenannt, gehört eine dauerhafte Weiterleitung (301) auf die Nachfolgeseite in public/.htaccess; sonst die Seite wiederherstellen.' },
  server: { was: 'Antwortzeit des Servers', files: [], live: true, tipp: 'Die Website ist ein statischer Export – die Antwortzeit hängt fast nur vom Webspace ab. Bleibt die Seite auch im Browser wiederholt langsam, die Auslastung beim Hoster prüfen; die Seitenquelle ist nur bei ungewöhnlich großen Seiten die Ursache.', test: 'Am Build nicht prüfbar (Antwortzeiten misst erst der Server); der nächste Prüflauf zeigt, ob die Seite wieder schnell antwortet.' },
};
// Regel → [Thema, Modus]. nur = der Befund hängt an keiner einzelnen Seite; zuerst = zentrale Quelle vor der
// Seitenquelle; danach = Seitenquelle zuerst, die zentrale Quelle als Ergänzung.
const nur = k => [k, 'nur'], zuerst = k => [k, 'zuerst'], danach = k => [k, 'danach'];
const REGEL_QUELLE = {
  // Sitemap
  'sitemap-datei': nur('sitemap'), 'sitemap-lastmod': nur('sitemap'), 'sitemap-404': zuerst('sitemap'), 'sitemap-redirect': zuerst('sitemap'), 'sitemap-canonical': zuerst('sitemap'),
  'sitemap-fehlt': zuerst('sitemapGate'), 'noindex-sitemap': zuerst('sitemapGate'), 'sitemap-index-abweichung': zuerst('sitemapGate'),
  // robots.txt
  robots: nur('robots'), 'robots-wichtig': zuerst('robots'), 'robots-sitemap': zuerst('robotsSitemap'),
  // Weiterleitungen und Antwort-Header
  'host-weiterleitung': nur('htaccess'), 'security-header': nur('htaccess'), 'redirect-loop': zuerst('htaccess'), 'redirect-kette': zuerst('htaccess'), https: zuerst('htaccess'), gesperrt: zuerst('htaccess'), serverfehler: danach('htaccess'),
  'alte-domain-weiterleitung': nur('altdomain'), 'erreichbarkeit-verlust': danach('seiteWeg'), langsam: danach('server'),
  // index / noindex
  'vorschau-noindex': nur('vorschau'), 'noindex-wichtig': zuerst('gate'), 'index-verlust': zuerst('gate'), 'index-drift': nur('gateDaten'), 'entwurf-oeffentlich': zuerst('entwurf'),
  // Kopfangaben und Markup
  'canonical-fehlt': danach('canonical'), 'canonical-fremd': danach('canonical'), 'canonical-ziel': danach('canonical'),
  'title-lang': danach('titel'), 'title-kurz': danach('titel'), 'og-image': danach('ogBild'), 'schema-breadcrumb': danach('breadcrumb'), 'copyright-jahr': zuerst('fuss'),
  // Preise
  'preis-alt': zuerst('preise'), 'preis-abweichend': zuerst('preise'), 'aktionspreis-abgelaufen': zuerst('preise'), 'aktion-laeuft-aus': zuerst('preise'), streichpreis: zuerst('preise'), 'preis-gebuehren-widerspruch': zuerst('preise'), 'schema-preis': zuerst('preise'),
  'soll-nicht-lesbar': nur('soll'),
  // Firmendaten und Marke
  'schema-firmendaten': zuerst('firmaSchema'), 'impressum-pflichtangabe': zuerst('impressum'), 'altmarke-sichtbar': danach('firma'), 'alte-mailadresse': danach('firma'),
  // Behördendaten
  'behoerdendaten-pruefdatum': zuerst('behoerden'),
  // Zeiten und Fristen
  'zeitangabe-abweichend': danach('zeiten'), 'zeit-versprechen': danach('zeiten'), 'faq-widerspruch': danach('zeiten'), 'rechtsinfo-abweichend': danach('zeiten'), 'faq-agb-widerspruch': danach('widerruf'),
};

// ── Prüfbarkeit vor dem Deploy (dieselben Listen nutzt bin/local-check.js) ──
// Regeln, die echte Serverantworten brauchen – am Build nicht bewertbar.
const NUR_LIVE = ['host-weiterleitung', 'alte-domain-weiterleitung', 'serverfehler', 'gesperrt', 'redirect-loop', 'redirect-kette', 'langsam', 'security-header'];
// Regeln, die am Build nur in eine Richtung aussagen: Ein Treffer ist echt („neu entstanden“), ein fehlender
// Treffer heißt aber nicht „behoben“. Das sind Vergleichsregeln (melden die Veränderung zum Vorlauf) und
// Regeln, die live zusätzlich von Weiterleitungen abhängen.
const NUR_NEU = ['erreichbarkeit-verlust', 'status-aenderung', 'seite-geaendert', 'index-verlust', 'index-drift', 'https', 'sitemap-redirect'];

/** Alle fest hinterlegten Quelldateien (für den Test „keine erfundenen Pfade“). */
function alleQuelldateien() {
  const out = new Set([...START, ...LANDING]);
  for (const b of Object.values(BEREICHE)) [...b.hub, ...b.detail].forEach(f => out.add(f));
  for (const s of Object.values(SONDER)) s.files.forEach(f => out.add(f));
  for (const z of Object.values(ZUSATZ)) z.forEach(f => out.add(f));
  for (const q of Object.values(QUERSCHNITT)) q.files.forEach(f => out.add(f));
  return [...out].sort();
}

const istDatei = (root, rel) => { try { return fs.statSync(path.join(root, rel)).isFile(); } catch (_) { return false; } };
const hat = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); // nie Object.prototype treffen (/constructor/ …)

/** Quelle einer Seite allein aus dem Pfad: { typ, was, files } (noch ungeprüft, ob die Dateien existieren). */
function ausPfad(pathname, root) {
  const p = pathOf(pathname).replace(/index\.html$/, ''); const segs = p.split('/').filter(Boolean); const typ = pageType(p);
  if (!segs.length) return { typ, was: 'Startseite', files: START };
  if (hat(SONDER, p)) return { typ, ...SONDER[p] };
  const b = hat(BEREICHE, segs[0]) ? BEREICHE[segs[0]] : null;
  if (b && segs.length === 1) return { typ, was: 'Übersicht ' + b.was, files: b.hub };
  if (b && segs.length === 2) return { typ, was: b.was, files: b.detail };
  const rest = segs.join('/'); const einfach = /^[A-Za-z0-9._/-]+$/.test(rest) && !segs.includes('..');
  // feste Seite: app/<pfad>/page.tsx
  if (einfach && istDatei(root, `app/${rest}/page.tsx`)) return { typ, was: (hat(TYP_NAME, typ) && TYP_NAME[typ]) || 'feste Seite', files: [`app/${rest}/page.tsx`, ...(hat(ZUSATZ, p) ? ZUSATZ[p] : [])] };
  // Datei aus public/ (PDF, Bilder, Schnittstellen)
  if (einfach && /\.[A-Za-z0-9]+$/.test(rest) && istDatei(root, 'public/' + rest)) return { typ, was: 'Datei aus public/', files: ['public/' + rest] };
  // übrige Ein-Segment-Pfade bedient die Landingpage-Route
  if (segs.length === 1 && !/\./.test(segs[0])) return { typ, was: 'Themen-Landingpages', files: LANDING };
  return { typ, was: '', files: [] };
}

/**
 * Quelldatei(en) zu einem Pfad und – falls angegeben – zur Regel.
 * @param {string|string[]|null} pathname Pfad der betroffenen Seite (`/kfz-zulassung/berlin/`; `*` als Platzhalter gebündelter
 *   Befunde ist erlaubt) oder eine Liste von Pfaden (Sammelbefund über verschiedene Seiten)
 * @param {string} [rule] Regel-ID – Querschnittsthemen (Preise, Sitemap, Weiterleitungen …) haben eine zentrale Quelle
 * @param {{repoRoot?: string}} [opts] Wurzel des Website-Repos
 * @returns {{ source: string[], generator: string, typ: string|null, thema: string|null, live: boolean, tipp: string }}
 *   source = existierende Quelldateien (wichtigste zuerst), generator = Kurztext für die Oberfläche,
 *   z. B. „lib/staedte.ts (Stadtseiten)“, thema = Querschnittsthema der Regel, live = nur am Server prüfbar.
 */
function sourceFor(pathname, rule, opts = {}) {
  const root = opts.repoRoot || REPO; const da = f => istDatei(root, f);
  // Sammelbefund über mehrere Seiten: Liste von Pfaden → Quellen aller Seiten (in dieser Reihenfolge)
  const teile = (Array.isArray(pathname) ? pathname : [pathname]).filter(p => typeof p === 'string' && p).map(p => ausPfad(p, root));
  const seite = { typ: teile.length ? teile[0].typ : null, files: [...new Set(teile.flatMap(t => t.files))], teile };
  const [thema, modus] = hat(REGEL_QUELLE, rule) ? REGEL_QUELLE[rule] : [null, null];
  const q = thema ? QUERSCHNITT[thema] : null;
  const vorn = !q ? seite : modus === 'danach' ? seite : q;
  const hinten = !q || modus === 'nur' ? null : modus === 'danach' ? q : seite;
  const source = [...new Set([...vorn.files, ...(hinten ? hinten.files : [])])].filter(da);
  // Kurztext: erste vorhandene Datei mit der Bezeichnung des Teils, zu dem sie gehört
  const etikett = x => { for (const t of (x && (x.teile || [x])) || []) { const f = t.files.find(da); if (f) return `${f} (${t.was})`; } return ''; };
  return { source, generator: etikett(vorn) || etikett(hinten), typ: seite.typ, thema, live: !!(q && q.live) || NUR_LIVE.includes(rule), tipp: (q && q.tipp) || '' };
}

// ── Build (statischer Export) ───────────────────────────────────────────────
/**
 * Pfad → Datei im fertigen Build, relativ zu buildDir, sonst null. Zuerst wird der Pfad wörtlich geprüft
 * (PDF, Bild, …/index.html), dann <pfad>/index.html. Dient nur dem Nachweis „gibt es im Build“.
 */
function buildFileFor(pathname, buildDir) {
  let p; try { p = decodeURIComponent(String(pathname || '').split(/[?#]/)[0]); } catch (_) { return null; }
  const rel = p.replace(/^\/+/, '');
  if (!buildDir || rel.split('/').includes('..') || rel.includes('\0')) return null;
  const cands = rel && !rel.endsWith('/') ? [rel, rel + '/index.html'] : [rel + 'index.html'];
  for (const c of cands) if (istDatei(buildDir, c)) return c;
  return null;
}
/** Wie buildFileFor, für eine URL der eigenen Website (fremde Hosts → null). */
function fileForUrl(url, cfg) {
  const p = eigenerPfad(url, cfg && cfg.base);
  return p && cfg && cfg.buildDir ? buildFileFor(p, cfg.buildDir) : null;
}
function eigenerPfad(url, base) {
  if (!url) return null;
  try { const u = new URL(url); if (base && u.host !== new URL(base).host) return null; return u.pathname; }
  catch (_) { return /^\//.test(url) ? String(url).split(/[?#]/)[0] : null; }
}

// ── Vorschlag je Befund ─────────────────────────────────────────────────────
const FREIGABE = {
  auto: 'Technische Korrektur – nach bestandenem Test ohne inhaltliche Freigabe umsetzbar.',
  manuell: 'Inhaltliche Änderung – der Betreiber gibt den neuen Text frei, bevor er veröffentlicht wird.',
  preis: 'Preisangabe – Preise werden ausschließlich über config/preise.json geändert und dort freigegeben; der Deploy prüft das und bricht ohne Freigabe ab.',
  recht: 'Rechtlich relevante Aussage – vor der Veröffentlichung rechtlich prüfen lassen und ausdrücklich freigeben.',
};
const FREIGABE_UNBEKANNT = 'Unbekannte Freigabestufe – vor einer Änderung klären, wer entscheidet.';
const FREIGABE_SCHRITT = {
  auto: 'Freigabe: keine inhaltliche Freigabe nötig – nach bestandenem Test kann die Korrektur mit dem nächsten Deploy live gehen.',
  manuell: 'Freigabe: den neuen Text vom Betreiber bestätigen lassen und im SEO Center den Status „freigegeben“ mit kurzer Notiz setzen; erst danach deployen.',
  preis: 'Freigabe: In config/preise.json muss die Freigabe gesetzt sein (freigabe.freigegeben mit Name und Datum). Der Deploy prüft das und bricht ab, solange die Freigabe fehlt oder Altpreise im Build stehen.',
  recht: 'Freigabe: Formulierung rechtlich prüfen lassen und die Entscheidung im SEO Center festhalten (Status „freigegeben“ mit Notiz); ohne ausdrückliche Freigabe nicht veröffentlichen.',
};
const TEST_LOKAL = 'Lokal prüfen: `npm run build`, danach `node seo-autopilot/bin/local-check.js` – der Punkt muss dort unter „lokal behoben“ stehen, und es darf nichts Neues entstehen.';
const TEST_LIVE = 'Am Build nicht prüfbar (Weiterleitungen und Antwort-Header liefert erst der Server). Weiterleitungen vorab mit `npm run build && bash scripts/weiterleitungen-lokal-testen.sh` testen; nach dem Deploy bestätigt der nächste Prüflauf das Ergebnis.';
const TEST_NUR_NEU = 'Lokal prüfen: `npm run build`, danach `node seo-autopilot/bin/local-check.js` – dort darf der Punkt nicht unter „neu entstanden“ stehen. Als „lokal behoben“ lässt er sich am Build nicht bestätigen (er vergleicht mit dem letzten Prüflauf bzw. hängt von Serverantworten ab); das zeigt erst der nächste Prüflauf nach dem Deploy.';
const ABSCHLUSS = 'Nach dem Deploy schließt der nächste Prüflauf den Punkt von selbst.';
const kurz = (s, n) => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

/** Seiten, auf denen ein defekter Link bzw. eine defekte Datei verlinkt ist (aus dem Befund gelesen, höchstens drei). */
function verlinkendeSeiten(it, base) {
  const roh = [];
  if (Array.isArray(it.quellen)) roh.push(...it.quellen);
  // gebündelte Befunde: die Einzelbefunde stehen in examples
  for (const d of [it.detail, ...(Array.isArray(it.examples) ? it.examples.map(e => e && e.detail) : [])]) {
    const m = /Verlinkt (?:von|auf)\s*:?\s*([^\n]+)/i.exec(String(d || '')); if (m) roh.push(...m[1].split(/[,;]\s*/));
  }
  const out = [];
  for (const r of roh) { const p = eigenerPfad(String(r || '').trim().replace(/[.…)\s]+$/, ''), base); if (p && p.startsWith('/') && !out.includes(p)) out.push(p); if (out.length === 3) break; }
  return out;
}

/**
 * Sammelbefund über verschiedene Seiten (Regel fasst selbst zusammen, z. B. url = Startseite mit count und examples):
 * die Pfade der Beispielseiten (eigener Host, höchstens fünf). Bei Bündeln einer Seitenfamilie (Pfad mit Stern)
 * und Einzelbefunden leer – dort ist der Pfad im Befund schon die richtige Quelle.
 */
function beispielPfade(it, base, pfad) {
  if ((pfad && pfad.includes('*')) || !Array.isArray(it.examples)) return [];
  const out = [];
  for (const e of it.examples) { const p = e && eigenerPfad(e.url, base); if (p && !out.includes(p)) out.push(p); if (out.length === 5) break; }
  return out.length && !(out.length === 1 && out[0] === pfad) ? out : [];
}

/** Konkrete nächste Schritte zu einem Befund. */
function schritteFuer(it, q, source, pfad, beispiele = []) {
  const out = []; const n = it.count > 1 ? it.count : 0;
  if (source.length) {
    let wo = `Quelle öffnen: ${source[0]}${source.length > 1 ? ` (dazu: ${source.slice(1).join(', ')})` : ''}.`;
    if (n && pfad && pfad.includes('*')) wo += ` Betroffen sind ${n} Seiten im Bereich ${pfad} – die Ursache liegt in der gemeinsamen Vorlage oder Datenquelle, nicht auf jeder Seite einzeln.`;
    else if (n) wo += ` Betroffen sind ${n} Seiten${beispiele.length ? ` (z. B. ${beispiele.slice(0, 3).join(', ')})` : ''} – steht die Stelle in einer gemeinsamen Komponente oder Datenquelle, genügt eine Änderung dort.`;
    else if (pfad && q.thema === null && MIT_DATENQUELLE.includes(q.typ)) wo += ` Dort den Eintrag für ${pfad} suchen.`;
    out.push(wo);
  } else out.push('Betroffene Stelle über die URL im Befund eingrenzen – eine einzelne Quelldatei lässt sich hier nicht zuordnen.');
  const was = kurz(it.suggestion || '', 320); const neu = kurz(it.proposed || '', 320);
  if (was) out.push('Änderung: ' + was);
  if (neu && neu !== was) out.push('Vorschlag für den neuen Wert: ' + neu);
  if (!was && !neu) out.push('Änderung: Ursache laut Befund beheben; der Befundtext nennt, was erwartet wird.');
  if (q.tipp) out.push(q.tipp);
  const thema = q.thema && hat(QUERSCHNITT, q.thema) ? QUERSCHNITT[q.thema] : null;
  out.push(q.live ? (thema && thema.test) || TEST_LIVE : NUR_NEU.includes(it.rule) ? TEST_NUR_NEU : TEST_LOKAL);
  const stufe = it.approval || 'auto';
  out.push(hat(FREIGABE_SCHRITT, stufe) ? FREIGABE_SCHRITT[stufe] : 'Freigabe: ' + FREIGABE_UNBEKANNT);
  out.push(ABSCHLUSS);
  return out;
}

/** Früher: Patch-Dateien gegen HTML. Entfällt – die Schnittstelle bleibt für den Kern aufrufbar und liefert nichts. */
function buildPatches(/* issues, cfg */) { return []; }

/**
 * Vorschlagsobjekt für Oberfläche und Bericht.
 * → { id, rule, severity, url, file, generator, source[], current, proposed, reason, risk, approval, freigabe, schritte[], first_seen, title }
 * `patches` (dritter Parameter) wird nicht mehr ausgewertet.
 */
function describe(it, cfg /* , patches */) {
  cfg = cfg || {}; const root = cfg.repoRoot || REPO;
  const stufe = it.approval || 'auto';
  let pfad = eigenerPfad(it.url, cfg.base);
  // Bündel einer Seitenfamilie mit nur EINER Seite (Pfad mit Stern, count ≤ 1): Quelle und Schritte zur Seite selbst
  // (examples[0]) – sonst stünde dort „den Eintrag für /zulassungsstelle/*/ suchen“
  if (pfad && pfad.includes('*') && !(it.count > 1) && Array.isArray(it.examples) && it.examples[0]) { const p = eigenerPfad(it.examples[0].url, cfg.base); if (p) pfad = p; }
  // Sammelbefund über verschiedene Seiten: Quellen der Beispielseiten statt der Sammel-URL (meist die Startseite)
  const beispiele = beispielPfade(it, cfg.base, pfad);
  let q = sourceFor(beispiele.length ? beispiele : pfad, it.rule, { repoRoot: root });
  // Defekter Link / defekte Datei: zu ändern ist die verlinkende Seite, nicht das fehlende Ziel
  if (it.rule === 'defekter-link' || it.rule === 'datei-defekt') {
    const von = verlinkendeSeiten(it, cfg.base).map(p => sourceFor(p, null, { repoRoot: root })).filter(x => x.source.length);
    // bei einer Datei zusätzlich ihre Ablage in public/, falls es sie im Repo gibt (dann fehlt sie nur auf dem Server)
    if (von.length) q = { ...q, source: [...new Set([...von.flatMap(x => x.source), ...(it.rule === 'datei-defekt' ? q.source : [])])], generator: von[0].generator };
  }
  // Nennt der Befund selbst eine Quelldatei, steht sie vorn – sofern es sie gibt
  const eigene = typeof it.file === 'string' && it.file && !/^(\/|out\/)/.test(it.file) && istDatei(root, it.file) ? [it.file] : [];
  const source = [...new Set([...eigene, ...q.source])];
  return {
    id: it.id, rule: it.rule, severity: it.severity, url: it.url || '',
    file: source[0] || '', generator: q.generator || (eigene.length ? `${eigene[0]} (laut Befund)` : ''), source,
    current: it.current || it.detail || '', proposed: it.proposed || it.suggestion || '', reason: it.reason || '',
    risk: it.risk || (stufe === 'auto' ? 'gering – technische Korrektur, nach lokalem Test' : stufe === 'preis' ? 'Preisangabe – nur mit Freigabe in config/preise.json' : stufe === 'recht' ? 'rechtlich relevant – nur mit Freigabe' : 'inhaltlich – nur mit Freigabe'),
    approval: stufe, freigabe: hat(FREIGABE, stufe) ? FREIGABE[stufe] : FREIGABE_UNBEKANNT,
    schritte: schritteFuer(it, q, source, pfad, beispiele),
    first_seen: it.first_seen, title: it.title,
  };
}

module.exports = { sourceFor, describe, buildPatches, buildFileFor, fileForUrl, alleQuelldateien, FREIGABE, BEREICHE, QUERSCHNITT, REGEL_QUELLE, NUR_LIVE, NUR_NEU };
