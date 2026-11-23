'use strict';
// ─── Technische Regeln: Erreichbarkeit, Weiterleitungen, Canonicals, Indexierung, Sitemap ─
// Jede Regel liefert Findings; `rule` ist stabil (für Fingerprints/Historie). `key` enthält nie Messwerte:
// Statuscodes, Zeiten und Zählungen stehen nur in title/detail. Hinweise und `file` nennen die Quelldateien
// der Website (statischer Next.js-Export auf einem Apache-Webspace): app/sitemap.ts, app/robots.ts,
// lib/indexGate.ts, lib/features.ts, public/.htaccess, deploy/alte-domain/.htaccess.
//
// Grundsätze:
// - Ein Befund je Ursache. Steht die Website insgesamt auf noindex (Vorschau-Build live) oder sperrt die
//   robots.txt die Website, gibt es EINEN kritischen Befund statt hunderter Folgemeldungen.
// - noindex/indexierbar kommen einheitlich aus rec.noindex / rec.indexable (Meta-Tag ODER X-Robots-Tag).
// - Vergleiche mit dem Vorlauf (ctx.prev = Inhalt von last-crawl.json) erkennen den Wechsel. Ohne Vorlauf
//   (prev = null) entstehen keine neuen Wechselmeldungen.
// - Störungen bleiben offen, solange sie bestehen: Offene Punkte von erreichbarkeit-verlust, index-verlust und
//   index-drift (ctx.offen = offene Punkte des Befundspeichers vor dem Lauf) werden mit gleichem Schlüssel erneut
//   gemeldet, solange die Seite nicht erreichbar bzw. noindex ist bzw. der Seitentyp unter dem Ausgangswert liegt.
//   Erst wenn der Zustand wieder gut ist, schließt der Punkt als „behoben“ – keine falsche Entwarnung am Folgetag
//   und keine zweite Sofortmeldung für dieselbe Störung.
// - Regeln, die einen vollständigen Crawl bzw. eine lesbare Sitemap brauchen, setzen aus, wenn das fehlt.
const { pathOf, stripQuery, family, pageType, isNoindex, matchesAny } = require('../util');

const GRUPPE = 'Technisches SEO';
const F = (rule, severity, o) => ({ rule, severity, approval: 'auto', ...o });
const hostOf = u => { try { return new URL(u).host; } catch (_) { return ''; } };
/** Vergleichsform einer Adresse: ohne Fragment und Query, /index.html → / */
const kanon = u => { try { const x = new URL(u); x.hash = ''; x.search = ''; return x.href.replace(/\/index\.html$/, '/'); } catch (_) { return String(u || ''); } };
const nx = rec => (typeof rec.noindex === 'boolean' ? rec.noindex : isNoindex(rec));
const idx = rec => (typeof rec.indexable === 'boolean' ? rec.indexable : rec.status === 200 && !!rec.page && !isNoindex(rec) && rec.robotsAllowed !== false);
const typVon = rec => rec.typ || pageType(rec.path || pathOf(rec.url));
// Fehlerseite des Exports und Bestätigungsdatei der Search Console: keine Inhaltsseiten, keine Seitenregeln
const SONDERSEITE = /^\/(?:404|_not-found)(?:\.html|\/(?:index\.html)?)?$|^\/google[0-9a-z]+\.html$/i;
const seiten = n => (n === 1 ? '1 Seite' : `${n} Seiten`);
const liste = (urls, n = 5) => urls.slice(0, n).map(pathOf).join(', ') + (urls.length > n ? ' …' : '');
const robotsAngabe = rec => [rec.page && rec.page.robots ? `Meta robots „${rec.page.robots}“` : '', rec.headers && rec.headers['x-robots-tag'] ? `X-Robots-Tag „${rec.headers['x-robots-tag']}“` : ''].filter(Boolean).join(', ') || 'noindex';
const tag = iso => { const t = Date.parse(iso); return Number.isFinite(t) ? new Date(t).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''; };

/** Sieht der häufigste lastmod-Wert nach dem Erzeugungszeitpunkt der Sitemap aus (Uhrzeit enthalten oder praktisch „jetzt“)? */
function erzeugungsdatum(wert, crawlAt) {
  const t = Date.parse(wert); if (!Number.isFinite(t)) return false;
  const uhrzeit = /T(\d\d):(\d\d)(?::(\d\d))?/.exec(String(wert));
  if (uhrzeit && (uhrzeit[1] !== '00' || uhrzeit[2] !== '00' || (uhrzeit[3] || '00') !== '00')) return true;
  const jetzt = Date.parse(crawlAt); return Math.abs((Number.isFinite(jetzt) ? jetzt : Date.now()) - t) <= 2 * 86400e3;
}

/** Einbruch der indexierbaren Seiten eines Typs: ≥ 20 Seiten oder > 10 % ab drei Seiten (In kleinen Typen wäre sonst jede einzelne Seite ein kritischer Einbruch – die meldet „index-verlust“). */
const einbruch = (a, b) => { const minus = a - b; return minus >= 20 || (minus >= 3 && minus / a > 0.1); };
/** Kleinste Zahl indexierbarer Seiten, ab der gegenüber dem Ausgangswert a kein Einbruch mehr besteht. */
const erholtAb = a => { let z = a; while (z > 0 && !einbruch(a, z - 1)) z--; return z; };
const DRIFT_HINWEIS = 'Prüfen, ob das beabsichtigt ist. Häufigste Ursache: Das Index-Gate (lib/indexGate.ts) setzt Detailseiten auf noindex, sobald Pflichtangaben fehlen oder das Prüfdatum der Behördendaten (geprueftAm) zu alt ist – dann Daten neu prüfen und das Datum aktualisieren.';
const VERLUST_HINWEIS = 'Sofort prüfen: Wurde die Seite beim letzten Deploy entfernt oder umbenannt? Dann wiederherstellen oder in public/.htaccess dauerhaft (301) auf die Nachfolgeseite weiterleiten.';
const INDEX_HINWEIS_GATE = 'Prüfen, ob das gewollt ist. Das Index-Gate (lib/indexGate.ts) setzt Detailseiten automatisch auf noindex, wenn Pflichtangaben fehlen oder das Prüfdatum (geprueftAm) zu alt ist – dann die Daten der Seite aktualisieren.';
const INDEX_HINWEIS = 'Prüfen, ob das gewollt ist: robots-Angabe in den Metadaten der Seite (app/…/page.tsx).';
const INDEX_OFFEN = 'Der Punkt bleibt offen, solange die Seite noindex ist; ist das gewollt, die Adresse in seo-autopilot/config.js unter allowNoindex eintragen.';
/** „seit <Datum>“ eines offenen Punkts (erstmals bzw. erneut aufgetreten). */
const seitWann = o => { const d = tag(o && (o.reopened_at || o.first_seen)); return d ? 'seit ' + d : 'seit einem früheren Lauf'; };

const TYPNAME = { start: 'Startseite', leistung: 'Leistungsseiten', ratgeber: 'Ratgeber-Artikel', stadt: 'Stadtseiten', behoerde: 'Zulassungsstellen-Seiten', kennzeichen: 'Kennzeichen-Seiten', gewerbe: 'Gewerbe-Seiten', rechner: 'Rechner', vorlage: 'Vorlagen', landing: 'Themenseiten', recht: 'Rechtsseiten', hub: 'Übersichtsseiten', sonst: 'Einzelseiten' };
const TYP_UEBERSICHT = { leistung: '/leistungen/', ratgeber: '/ratgeber/', stadt: '/kfz-zulassung/', behoerde: '/zulassungsstelle/', kennzeichen: '/kennzeichen/', gewerbe: '/gewerbe/', rechner: '/rechner/', vorlage: '/vorlagen/' };
// Sicherheits-Header der Startseite (gesetzt in public/.htaccess)
const HEADER_PFLICHT = [
  ['strict-transport-security', 'mittel', 'hält Browser dauerhaft auf https'],
  ['content-security-policy', 'niedrig', 'begrenzt, welche Skripte und Quellen die Seite laden darf'],
  ['x-content-type-options', 'niedrig', 'verhindert, dass Browser Dateitypen umdeuten (nosniff)'],
  ['referrer-policy', 'niedrig', 'begrenzt, welche Adresse an fremde Websites weitergegeben wird'],
  ['permissions-policy', 'niedrig', 'sperrt nicht benötigte Browser-Funktionen wie Kamera oder Standort'],
];

function run(ctx) {
  const { crawl, cfg } = ctx; const out = [];
  const base = String(cfg.base || crawl.base || '').replace(/\/+$/, ''); const baseHost = hostOf(base); const istHttps = /^https:/i.test(base);
  const wichtig = new Set(cfg.importantPaths || []); const entwuerfe = new Set(cfg.entwurfSeiten || []);
  const exakt = cfg.allowNoindex || []; const muster = cfg.allowNoindexPatterns || [];
  const alle = [...crawl.pages.values()]; const start = crawl.pages.get(base + '/') || null;
  const stats = crawl.stats || {}; const vollstaendig = !stats.limitErreicht && !stats.abgebrochen;
  // Vorlauf nur verwenden, wenn er zur selben Website gehört (sonst wären alle Seiten „verschwunden“)
  const prev = ctx.prev && ctx.prev.pages && (!ctx.prev.base || String(ctx.prev.base).replace(/\/+$/, '') === base) ? ctx.prev : null;
  const vor = prev ? prev.pages : null;
  const smDateien = (crawl.sitemap && crawl.sitemap.files) || []; const smEintraege = (crawl.sitemap && crawl.sitemap.entries) || new Map();
  const sitemapOk = smEintraege.size > 0 && !smDateien.some(f => f.error);
  // Offene Wechselbefunde vor diesem Lauf je Seite (ein Bündel einer Seitenfamilie nennt seine Seiten in examples)
  const offenJe = rule => {
    const m = new Map();
    for (const o of ctx.offen || []) {
      if (!o || o.rule !== rule || (o.status && o.status !== 'offen')) continue;
      const urls = Array.isArray(o.examples) && String(o.key || '').startsWith('familie:') ? o.examples.map(e => e && e.url) : [o.url];
      for (const u of urls) if (typeof u === 'string' && hostOf(u) === baseHost && !m.has(u)) m.set(u, o);
    }
    return m;
  };
  const offenVerlust = offenJe('erreichbarkeit-verlust'), offenIndex = offenJe('index-verlust');
  /** erreichbarkeit-verlust, der schon offen ist: gleicher Schlüssel, Stand dieses Laufs (rec = null: Seite in diesem Lauf nicht abgerufen). */
  const verlustWeiter = (u, o, rec) => {
    const p = pathOf(u); const wie = rec ? (rec.status ? 'HTTP ' + rec.status : 'keine Antwort') : '';
    return F('erreichbarkeit-verlust', rec ? (wichtig.has(p) || rec.inSitemap ? 'kritisch' : 'hoch') : (o.severity === 'kritisch' ? 'kritisch' : 'hoch'), { url: u, key: 'verlust',
      title: `Vorher erreichbar, ${seitWann(o)} ${wie || 'nicht mehr erreichbar'}: ${p}`,
      detail: `Die Seite war erreichbar und antwortet ${seitWann(o)} nicht mehr mit 200${rec ? ` – jetzt ${wie}.` : `. In diesem Lauf wurde sie nicht abgerufen (${vollstaendig ? 'nicht mehr verlinkt, nicht in der Sitemap' : 'Crawl unvollständig'}).`} Der Punkt bleibt offen, bis die Seite wieder erreichbar ist (200 oder dauerhafte Weiterleitung auf eine erreichbare Seite).`,
      suggestion: VERLUST_HINWEIS });
  };
  /** index-verlust, der schon offen ist (rec = null: Zustand in diesem Lauf nicht prüfbar). */
  const indexWeiter = (u, o, rec, warum) => {
    const p = pathOf(u); const gate = matchesAny(p, [], muster);
    return F('index-verlust', 'hoch', { url: u, key: 'verlust', title: `Seite war indexierbar und steht ${seitWann(o)} auf noindex: ${p}`,
      detail: `${rec ? robotsAngabe(rec) + '. ' : ''}Die Seite war indexierbar und ist ${seitWann(o)} auf noindex${rec ? '' : ` (in diesem Lauf nicht prüfbar: ${warum})`}. ${INDEX_OFFEN}`,
      suggestion: gate ? INDEX_HINWEIS_GATE : INDEX_HINWEIS, ...(gate ? { file: 'lib/indexGate.ts' } : {}) });
  };

  // Quellen (verlinkende Seiten) nur für die Ziele sammeln, zu denen ein Befund entstehen kann
  const gesucht = new Set(alle.filter(r => r.status === 404 || r.status === 410 || r.loop || r.tooManyHops || (r.chain && r.chain.length >= 2)).map(r => r.url));
  const quellen = new Map();
  if (gesucht.size) for (const rec of alle) if (rec.page) for (const a of rec.page.anchors || []) {
    let k = a.href; if (/[?#]/.test(k)) k = stripQuery(k);
    if (!gesucht.has(k) || k === rec.url) continue;
    let q = quellen.get(k); if (!q) quellen.set(k, q = []);
    if (q.length < 5 && !q.includes(rec.url)) q.push(rec.url);
  }
  const verlinkt = u => { const q = quellen.get(u) || []; return q.length ? `Verlinkt von: ${q.map(pathOf).join(', ')}` : ''; };

  // ── Sitemap-Dateien ────────────────────────────────────────────────────────
  for (const f of smDateien) {
    const sp = pathOf(f.url);
    if (f.error) { out.push(F('sitemap-datei', 'kritisch', { url: f.url, file: 'app/sitemap.ts', key: 'lesbar', title: `Sitemap nicht lesbar: ${sp}`, detail: `${f.error}. Ohne lesbare Sitemap findet Google neue und geänderte Seiten deutlich langsamer; Prüfungen, die die Sitemap brauchen, setzen in diesem Lauf aus.`, suggestion: 'Prüfen, ob der letzte Build sitemap.xml erzeugt und hochgeladen hat (Quelle: app/sitemap.ts), dann neu deployen. Die Adresse muss der Sitemap-Zeile in robots.txt entsprechen (app/robots.ts).' })); continue; }
    if (f.ungueltig) out.push(F('sitemap-datei', 'mittel', { url: f.url, file: 'app/sitemap.ts', key: 'eintrag', title: `Sitemap enthält ungültige Adressen: ${sp}`, detail: `${f.ungueltig} <loc>-Einträge sind keine vollständigen Adressen (https://…) und wurden übersprungen.`, suggestion: 'In app/sitemap.ts jede Adresse vollständig mit https:// und Domain ausgeben.' }));
    const lm = Object.entries(f.lastmods || {}).sort((a, b) => b[1] - a[1])[0];
    if (lm && f.count >= 10 && lm[1] / f.count > 0.9 && erzeugungsdatum(lm[0], crawl.at)) out.push(F('sitemap-lastmod', 'niedrig', { url: f.url, file: 'app/sitemap.ts', key: 'lastmod', title: `lastmod in ${sp} ist bei fast allen Adressen der Erzeugungszeitpunkt`, detail: `${lm[1]} von ${f.count} Adressen tragen ${lm[0]}. Ein lastmod, das nur den Zeitpunkt des Builds wiedergibt, ignoriert Google – es hilft dann nicht, geänderte Seiten schneller neu zu crawlen.`, suggestion: 'In app/sitemap.ts je Seite das Datum der letzten inhaltlichen Änderung ausgeben (wie bei Ratgebern und Zulassungsstellen) oder lastModified weglassen.' }));
  }
  if (smDateien.length && !smDateien.some(f => f.error) && smEintraege.size === 0) out.push(F('sitemap-datei', 'kritisch', { url: smDateien[0].url, file: 'app/sitemap.ts', key: 'leer', title: `Sitemap enthält keine Adressen: ${pathOf(smDateien[0].url)}`, detail: 'Die Sitemap ist abrufbar, listet aber keine einzige Seite.', suggestion: 'Build prüfen: app/sitemap.ts muss alle indexierbaren Seiten ausgeben (Filter aus lib/indexGate.ts). Danach neu deployen.' }));

  // ── robots.txt ─────────────────────────────────────────────────────────────
  const rs = crawl.robotsStatus;
  if (rs !== undefined && rs !== 200) {
    const hart = !(rs >= 400 && rs < 500 && rs !== 429); // Serverfehler/keine Antwort: Google setzt das Crawlen aus; 4xx gilt als „keine Einschränkung“
    out.push(F('robots', hart ? 'kritisch' : 'mittel', { url: base + '/robots.txt', file: 'app/robots.ts', key: 'erreichbar', title: 'robots.txt nicht erreichbar', detail: `${rs ? 'HTTP ' + rs : 'Keine Antwort (Zeitüberschreitung oder Netzfehler)'}. ${hart ? 'Antwortet robots.txt mit einem Serverfehler, setzt Google das Crawlen der gesamten Website aus.' : 'Ohne robots.txt darf alles gecrawlt werden, es fehlt aber der Verweis auf die Sitemap – und der Build ist vermutlich unvollständig.'}`, suggestion: 'Prüfen, ob der Build robots.txt erzeugt und hochgeladen hat (Quelle: app/robots.ts), dann neu deployen.' }));
  } else if (!((crawl.robots && crawl.robots.sitemaps) || []).length) out.push(F('robots', 'niedrig', { url: base + '/robots.txt', file: 'app/robots.ts', key: 'sitemap', title: 'robots.txt ohne Sitemap-Eintrag', detail: 'Suchmaschinen finden die Sitemap dann nur, wenn sie von Hand in der Search Console eingereicht wurde.', suggestion: `In app/robots.ts die Zeile „Sitemap: ${base}/sitemap.xml“ ausgeben (Feld sitemap).` }));

  // ── Weiterleitungen von http, www und der früheren Domain (cfg.redirectChecks) ──
  const altDomain = String((cfg.altmarke && cfg.altmarke.domain) || 'deutschezulassung.de').toLowerCase();
  for (const h of ctx.hostChecks || crawl.hostChecks || []) {
    if (!h || h.ok || !h.von) continue;
    const alt = hostOf(h.von).toLowerCase().includes(altDomain);
    const zielOk = h.status === 200 && kanon(h.final) === kanon(h.erwartet); // Ziel stimmt – nur Umweg oder Art der Weiterleitung
    const kette = (h.kette || []).map(k => `${k.status} → ${k.to}`).join(', ') || 'keine Weiterleitung';
    const max = h.maxSpruenge === undefined ? 1 : h.maxSpruenge;
    const detail = `${h.grund ? h.grund.charAt(0).toUpperCase() + h.grund.slice(1) : 'Entspricht nicht der Erwartung'}. Erwartet: ${h.erwartet} in höchstens ${max === 1 ? 'einem Sprung' : max + ' Sprüngen'}, dauerhaft (301). Tatsächlich: ${kette}; Ende ${h.final || '–'} mit ${h.status ? 'HTTP ' + h.status : 'ohne Antwort'}.`;
    if (alt) out.push(F('alte-domain-weiterleitung', zielOk ? 'hoch' : 'kritisch', { url: h.von, file: 'deploy/alte-domain/.htaccess', key: 'weiterleitung', title: `${zielOk ? 'Alte Domain leitet nur über Umwege weiter' : 'Alte Domain leitet nicht auf die neue Adresse weiter'}: ${h.von}`, detail: `${detail} Besucher und Suchmaschinen kommen über alte Links und Suchtreffer weiterhin über die frühere Domain.`, current: h.final || '', proposed: h.erwartet, suggestion: 'Weiterleitungsdatei der früheren Domain prüfen und erneut hochladen (deploy/alte-domain/.htaccess). Domain und SSL-Zertifikat der früheren Domain müssen beim Hoster bestehen bleiben.' }));
    else out.push(F('host-weiterleitung', zielOk ? 'mittel' : 'hoch', { url: h.von, file: 'public/.htaccess', key: 'weiterleitung', title: `${zielOk ? 'Weiterleitung nur über Umwege' : 'Weiterleitung führt nicht zur Hauptadresse'}: ${h.von}`, detail, current: h.final || '', proposed: h.erwartet, suggestion: 'Regeln in public/.htaccess prüfen (www → ohne www, Themen-Weiterleitungen direkt aufs Endziel). Die Umleitung von http auf https schaltet der Hoster („SSL erzwingen“).' }));
  }

  // ── Verlinkte Dateien (PDF, Downloads …) ──────────────────────────────────
  for (const [u, d] of crawl.dateien instanceof Map ? crawl.dateien : Object.entries(crawl.dateien || {})) {
    if (!d || d.status === 200) continue;
    const q = (d.quellen || []).map(pathOf);
    out.push(F('datei-defekt', 'hoch', { url: u, key: 'datei', title: `Verlinkte Datei nicht abrufbar: ${pathOf(u)}`, detail: `${d.status ? 'HTTP ' + d.status : 'Keine Antwort' + (d.error ? ' (' + d.error + ')' : '')}.${q.length ? ' Verlinkt von: ' + q.join(', ') + '.' : ''}`, suggestion: 'Datei wieder bereitstellen (Ablage im Repository unter public/…, z. B. public/downloads/) oder den Link entfernen.' }));
  }

  // ── Website insgesamt auf noindex bzw. per robots.txt gesperrt? ────────────
  const html200 = alle.filter(r => r.page && r.status === 200);
  const kern = html200.filter(r => { const p = r.path || pathOf(r.url); return !SONDERSEITE.test(p) && (r.inSitemap || (wichtig.has(p) && !matchesAny(p, exakt, []))); });
  const messbasis = kern.length ? kern : html200;
  const anteil = fn => (messbasis.length ? messbasis.filter(fn).length / messbasis.length : 0);
  const startNoindex = !!(start && start.page && start.status === 200 && nx(start));
  const noindexMasse = startNoindex && anteil(nx) > 0.5;
  const robotsMasse = !!(start && start.robotsAllowed === false) && anteil(r => r.robotsAllowed === false) > 0.5;
  if (startNoindex) {
    const n = messbasis.filter(nx).length;
    out.push(F('vorschau-noindex', 'kritisch', { url: start.url, file: 'lib/features.ts', key: 'startseite', title: noindexMasse ? 'Website steht auf noindex – vermutlich ist ein Vorschau-Build live' : 'Startseite steht auf noindex', detail: `${robotsAngabe(start)}. ${n} von ${messbasis.length} Kern- und Sitemap-Seiten sind noindex.${noindexMasse ? ' Google nimmt die Seiten nach und nach aus dem Index. Einzelmeldungen zu noindex, Indexverlust und Sitemap entfallen in diesem Lauf – sie haben dieselbe Ursache.' : ''}`, suggestion: 'Sofort ohne Vorschau-Schalter neu bauen und deployen: Im Live-Build dürfen NEXT_PUBLIC_NOINDEX und NEXT_PUBLIC_STAGING nicht gesetzt sein (lib/features.ts; der Deploy leitet den Schalter aus der Stufe in config/migration.json ab).', ...(noindexMasse ? { count: n } : {}) }));
  }
  if (robotsMasse) {
    const n = messbasis.filter(r => r.robotsAllowed === false).length; const regeln = ((crawl.robots && crawl.robots.disallow) || []).slice(0, 5).join(', ');
    out.push(F('robots-wichtig', 'kritisch', { url: start.url, file: 'app/robots.ts', key: 'gesperrt', title: 'robots.txt sperrt die Website für Suchmaschinen', detail: `${n} von ${messbasis.length} Kern- und Sitemap-Seiten sind per robots.txt gesperrt – auch die Startseite.${regeln ? ' Disallow: ' + regeln + '.' : ''} Einzelmeldungen je Seite entfallen in diesem Lauf.`, suggestion: 'robots.txt korrigieren (Quelle: app/robots.ts; erwartet wird „Allow: /“ ohne pauschales Disallow) und neu deployen.', count: n }));
  }
  const masse = noindexMasse || robotsMasse;

  // ── Zahl indexierbarer Seiten je Seitentyp gegen den Vorlauf ───────────────
  const driftTypen = new Set(); const vorher = {}, jetzt = {}, weg = {};
  for (const rec of alle) if (idx(rec)) { const t = typVon(rec); jetzt[t] = (jetzt[t] || 0) + 1; }
  if (vor) for (const [u, vr] of Object.entries(vor)) {
    if (!vr || !idx(vr)) continue;
    const t = vr.typ || pageType(pathOf(u)); vorher[t] = (vorher[t] || 0) + 1;
    const rec = crawl.pages.get(u); if (rec && idx(rec)) continue;
    if (rec && (rec.status === 0 || rec.status >= 500)) { jetzt[t] = (jetzt[t] || 0) + 1; continue; } // Störung, kein Indexverlust – das meldet „serverfehler“
    const grund = !rec ? 'nicht mehr gefunden' : rec.page && nx(rec) ? 'jetzt noindex' : rec.robotsAllowed === false ? 'per robots.txt gesperrt' : rec.redirectedTo || (rec.chain && rec.chain.length) ? 'leitet jetzt weiter' : `HTTP ${rec.status}`;
    (weg[t] = weg[t] || []).push({ url: u, grund });
  }
  // Offener Einbruch aus einem früheren Lauf: bleibt offen, solange der Typ unter dem Ausgangswert (basis) liegt.
  // Ohne vollständigen Crawl ist die Zahl nicht aussagekräftig – dann bleibt der Punkt unverändert offen.
  for (const o of ctx.offen || []) {
    if (!o || o.rule !== 'index-drift' || (o.status && o.status !== 'offen') || !/^typ:./.test(o.key || '') || !(Number(o.basis) > 0)) continue;
    const t = o.key.slice(4), basis = Number(o.basis), b = jetzt[t] || 0;
    if (driftTypen.has(t) || (vollstaendig && !einbruch(basis, b))) continue; // wieder erholt → schließt als behoben
    driftTypen.add(t);
    const bsp = Array.isArray(o.examples) ? { examples: o.examples } : {};
    if (!vollstaendig) { out.push(F('index-drift', 'kritisch', { url: o.url, file: 'lib/indexGate.ts', key: o.key, title: o.title, detail: o.detail, suggestion: DRIFT_HINWEIS, count: o.count, ...bsp, basis })); continue; }
    const minus = basis - b; const name = TYPNAME[t] || 'Seiten (' + t + ')';
    out.push(F('index-drift', 'kritisch', { url: base + (TYP_UEBERSICHT[t] || '/'), file: 'lib/indexGate.ts', key: o.key, title: `Indexierbare ${name} eingebrochen: ${basis} → ${b}`, detail: `Vor dem Einbruch waren ${basis} indexierbar, ${seitWann(o)} weniger – jetzt ${b} (−${minus}, −${Math.round(100 * minus / basis)} %). Beim Einbruch weggefallen, z. B.: ${liste((bsp.examples || []).map(e => e && e.url).filter(Boolean), 8) || '–'}. Der Punkt bleibt offen, bis wieder mindestens ${erholtAb(basis)} ${name} indexierbar sind.`, suggestion: DRIFT_HINWEIS, count: minus, ...bsp, basis }));
  }
  if (vor && vollstaendig && !masse) {
    for (const t of Object.keys(vorher).sort()) {
      const a = vorher[t], b = jetzt[t] || 0, minus = a - b;
      if (driftTypen.has(t) || !einbruch(a, b)) continue;
      driftTypen.add(t);
      const w = (weg[t] || []).sort((x, y) => (x.url < y.url ? -1 : 1)); const gruende = {}; for (const x of w) gruende[x.grund] = (gruende[x.grund] || 0) + 1;
      const name = TYPNAME[t] || 'Seiten (' + t + ')';
      // basis = Ausgangswert: Der Punkt bleibt offen (siehe oben), bis der Typ sich davon erholt hat
      out.push(F('index-drift', 'kritisch', { url: base + (TYP_UEBERSICHT[t] || '/'), file: 'lib/indexGate.ts', key: 'typ:' + t, title: `Indexierbare ${name} eingebrochen: ${a} → ${b}`, detail: `Gegenüber dem letzten Lauf${prev.at ? ' (' + tag(prev.at) + ')' : ''} sind ${minus} Seiten weniger indexierbar (−${Math.round(100 * minus / a)} %). Weggefallen: ${Object.entries(gruende).map(([g, n]) => `${n}× ${g}`).join(', ') || '–'}. Beispiele: ${liste(w.map(x => x.url), 8) || '–'}. Der Punkt bleibt offen, bis wieder mindestens ${erholtAb(a)} ${name} indexierbar sind.`, suggestion: DRIFT_HINWEIS, count: minus, examples: w.slice(0, 20).map(x => ({ url: x.url, detail: x.grund })), basis: a }));
    }
  }

  // ── Je URL ─────────────────────────────────────────────────────────────────
  const langsamMs = cfg.langsamMs || 3000;
  const abweichung = new Map(); // Familie|Richtung → Seiten (Sitemap ≠ Indexierbarkeit)
  const merke = (fam, art, rec) => { const k = fam + '|' + art; if (!abweichung.has(k)) abweichung.set(k, []); abweichung.get(k).push(rec); };
  for (const rec of alle) {
    const p = rec.path || pathOf(rec.url); const imp = wichtig.has(p); const vr = vor ? vor[rec.url] : null; const kette = rec.chain || [];
    const stoerung = rec.status === 0 || rec.status >= 500;
    const ovl = offenVerlust.get(rec.url), ovi = offenIndex.get(rec.url); offenVerlust.delete(rec.url); offenIndex.delete(rec.url);
    // Erreichbarkeit
    if (rec.loop) out.push(F('redirect-loop', 'kritisch', { url: rec.url, file: 'public/.htaccess', key: 'schleife', title: `Weiterleitungsschleife: ${p}`, detail: [kette.map(c => `${c.status} ${pathOf(c.from)} → ${pathOf(c.to)}`).join(' | '), verlinkt(rec.url)].filter(Boolean).join('. '), suggestion: 'Sich widersprechende Regeln in public/.htaccess auflösen (jede Adresse darf nur auf ein Endziel zeigen).' }));
    else if (rec.tooManyHops) out.push(F('redirect-kette', 'hoch', { url: rec.url, file: 'public/.htaccess', key: 'zu-lang', title: `Zu viele Weiterleitungen hintereinander: ${p}`, detail: [kette.map(c => c.status).join(' → '), verlinkt(rec.url)].filter(Boolean).join('. '), suggestion: 'In public/.htaccess direkt auf das Endziel weiterleiten.' }));
    else if (stoerung) out.push(F('serverfehler', imp || rec.inSitemap ? 'kritisch' : 'hoch', { url: rec.url, key: 'fehler', title: `${rec.status ? 'Serverfehler ' + rec.status : 'Nicht erreichbar'}: ${p}`, detail: `${rec.status ? 'HTTP ' + rec.status : 'Keine Antwort (' + (rec.error || 'Netzfehler') + ')'} – auch beim zweiten Versuch.${vr && vr.status === 200 ? ' Im letzten Lauf war die Seite erreichbar.' : ''}`, suggestion: 'Seite im Browser aufrufen. Bleibt der Fehler: Stand des letzten Deploys und public/.htaccess prüfen, sonst Störung beim Hoster (Fehlerprotokoll im Kundenbereich).' }));
    else if (rec.status === 404 || rec.status === 410) {
      if (rec.inSitemap) out.push(F('sitemap-404', 'hoch', { url: rec.url, file: 'app/sitemap.ts', key: 'sitemap', title: `Sitemap-Adresse liefert ${rec.status}: ${p}`, detail: `Steht in ${pathOf(rec.sitemapFile || '') || 'der Sitemap'}, die Seite gibt es aber nicht.`, suggestion: 'Seite wiederherstellen oder den Eintrag aus der Sitemap nehmen (app/sitemap.ts bzw. die Datenquelle der Seite unter lib/).' }));
      const q = quellen.get(rec.url) || [];
      if (q.length) out.push(F('defekter-link', imp ? 'hoch' : 'mittel', { url: rec.url, key: 'link', title: `Interner Link auf ${rec.status}: ${p}`, detail: `Verlinkt von: ${q.map(pathOf).join(', ')}`, suggestion: 'Link in der verlinkenden Seite korrigieren (Komponente oder Datenquelle unter lib/) – oder das Ziel anlegen bzw. in public/.htaccess dauerhaft weiterleiten.' }));
    } else if (rec.status === 401 || rec.status === 403) out.push(F('gesperrt', imp || rec.inSitemap ? 'hoch' : 'mittel', { url: rec.url, file: 'public/.htaccess', key: 'gesperrt', title: `Seite gesperrt (${rec.status}): ${p}`, detail: `Die Seite verlangt eine Anmeldung bzw. verweigert den Zugriff${rec.inSitemap ? ', steht aber in der Sitemap' : ''}.`, suggestion: 'Zugriffsregeln in public/.htaccess prüfen (Require, Files/FilesMatch) – oder den Link bzw. Sitemap-Eintrag entfernen, wenn die Sperre gewollt ist.' }));
    // Wechsel gegenüber dem Vorlauf (Störungen meldet „serverfehler“ bereits)
    if (vr && vr.status === 200 && rec.status !== 200 && !stoerung && !rec.loop && !rec.tooManyHops) out.push(F('erreichbarkeit-verlust', imp || rec.inSitemap ? 'kritisch' : 'hoch', { url: rec.url, key: 'verlust', title: `Vorher erreichbar, jetzt HTTP ${rec.status}: ${p}`, detail: `Letzter Lauf${prev.at ? ' (' + tag(prev.at) + ')' : ''}: 200, jetzt ${rec.status}. Der Punkt bleibt offen, bis die Seite wieder erreichbar ist.`, suggestion: VERLUST_HINWEIS }));
    // schon gemeldet und weiterhin nicht erreichbar (auch bei Störung oder anderem Statuscode): Punkt bleibt offen, keine neue Meldung
    else if (ovl && rec.status !== 200) out.push(verlustWeiter(rec.url, ovl, rec));
    else if (vr && vr.status && rec.status && vr.status !== rec.status && vr.status !== 200 && rec.status !== 200 && !stoerung && vr.status < 500) out.push(F('status-aenderung', 'niedrig', { url: rec.url, key: 'status', title: `Statuscode geändert: ${vr.status} → ${rec.status} (${p})`, detail: 'Die Adresse war schon im letzten Lauf nicht regulär erreichbar und antwortet jetzt anders.' }));
    // Weiterleitungen
    if (kette.length >= 2 && !rec.loop && !rec.tooManyHops) out.push(F('redirect-kette', 'niedrig', { url: rec.url, file: 'public/.htaccess', key: 'kette', title: `Weiterleitungskette (${kette.length} Sprünge): ${p}`, detail: [kette.map(c => `${c.status} → ${pathOf(c.to)}`).join(', '), verlinkt(rec.url)].filter(Boolean).join('. '), suggestion: 'Interne Links direkt auf das Endziel setzen und in public/.htaccess ohne Zwischenschritt weiterleiten.' }));
    if (rec.inSitemap && kette.length && !rec.loop) out.push(F('sitemap-redirect', 'mittel', { url: rec.url, file: 'app/sitemap.ts', key: 'weiterleitung', title: `Sitemap-Adresse leitet weiter: ${p} → ${pathOf(rec.final)}`, detail: 'Eine Sitemap soll nur Endziele enthalten.', suggestion: 'In app/sitemap.ts die Zieladresse eintragen (mit Schrägstrich am Ende, ohne www).' }));
    if (istHttps && kette.some(c => /^http:\/\//i.test(c.to))) out.push(F('https', 'hoch', { url: rec.url, file: 'public/.htaccess', key: 'weiterleitung', title: `Weiterleitung auf unverschlüsseltes http://: ${p}`, detail: kette.map(c => c.to).join(' → '), suggestion: 'Weiterleitungsziele in public/.htaccess immer mit https:// angeben.' }));
    // Änderungserkennung: EIN Punkt je wichtiger Seite, stabiler Schlüssel – verschwindet beim nächsten unveränderten Lauf von selbst
    if (rec.changed && imp && rec.page) {
      const a = (vr && vr.page) || {}; const pg = rec.page; const was = [];
      if (a.title !== undefined && a.title !== pg.title) was.push(`Title („${String(a.title).slice(0, 70)}“ → „${String(pg.title).slice(0, 70)}“)`);
      if (a.description !== undefined && a.description !== pg.description) was.push('Description');
      if (a.h1 !== undefined && JSON.stringify(a.h1) !== JSON.stringify(pg.h1)) was.push('H1');
      if (a.robots !== undefined && (a.robots || '') !== (pg.robots || '')) was.push(`robots („${a.robots || '–'}“ → „${pg.robots || '–'}“)`);
      if (a.canonical !== undefined && (a.canonical || '') !== (pg.canonical || '')) was.push('Canonical');
      if (typeof a.wordCount === 'number' && a.wordCount !== pg.wordCount) was.push(`Textumfang (${a.wordCount} → ${pg.wordCount} Wörter)`);
      out.push(F('seite-geaendert', 'info', { url: rec.url, key: 'geaendert', title: `Wichtige Seite hat sich geändert: ${p}`, detail: `Geändert seit dem letzten Lauf: ${was.length ? was.join(', ') : 'Haupttext oder strukturierte Daten'}. Nur zur Kenntnis – bitte kurz prüfen, ob die Änderung beabsichtigt war.` }));
    }
    // schon gemeldeter index-verlust, Seite gestört oder nicht auswertbar: Zustand unbekannt – Punkt bleibt offen
    if (ovi && (stoerung || (rec.status === 200 && !rec.page && rec.parseError))) out.push(indexWeiter(rec.url, ovi, null, stoerung ? 'Seite nicht erreichbar' : 'Seite nicht auswertbar'));
    if (!rec.page || rec.status !== 200 || SONDERSEITE.test(p)) continue;

    const pg = rec.page; const noindex = nx(rec); const gate = matchesAny(p, [], muster); const entwurf = entwuerfe.has(p); let indexNeu = false;
    const selbst = !pg.canonical || kanon(pg.canonical) === kanon(rec.url);
    // Indexierung. Wichtige Seiten dürfen nur noindex sein, wenn sie ausdrücklich (exakt) erlaubt sind – ein Familienmuster genügt nicht.
    if (noindex && !noindexMasse && rec !== start) {
      if (imp && !matchesAny(p, exakt, [])) out.push(F('noindex-wichtig', 'kritisch', { url: rec.url, key: 'noindex', title: `Wichtige Seite auf noindex: ${p}`, detail: `${robotsAngabe(rec)}.${vr && idx(vr) ? ' Im letzten Lauf war die Seite noch indexierbar.' : ''}`, suggestion: gate ? 'Ursache im Index-Gate suchen (lib/indexGate.ts): fehlende Pflichtangaben oder veraltetes Prüfdatum der Behördendaten. Daten aktualisieren und neu deployen.' : 'robots-Angabe in den Metadaten der Seite entfernen (app/…/page.tsx), falls unbeabsichtigt, und neu deployen.', ...(gate ? { file: 'lib/indexGate.ts' } : {}) }));
      else {
        if (vr && idx(vr) && !entwurf && !matchesAny(p, exakt, []) && !driftTypen.has(typVon(rec))) { indexNeu = true; out.push(F('index-verlust', 'hoch', { url: rec.url, key: 'verlust', title: `Seite war indexierbar und steht jetzt auf noindex: ${p}`, detail: `${robotsAngabe(rec)}. Im letzten Lauf${prev.at ? ' (' + tag(prev.at) + ')' : ''} war die Seite noch indexierbar${rec.inSitemap ? '' : (vr.inSitemap ? ' und stand in der Sitemap' : '')}. ${INDEX_OFFEN}`, suggestion: gate ? INDEX_HINWEIS_GATE : INDEX_HINWEIS, ...(gate ? { file: 'lib/indexGate.ts' } : {}) })); }
        if (rec.inSitemap && !entwurf) {
          if (gate) merke(family(p), 'noindex', rec);
          else out.push(F('noindex-sitemap', 'mittel', { url: rec.url, file: 'app/sitemap.ts', key: 'sitemap', title: `noindex-Seite in der Sitemap: ${p}`, detail: `${robotsAngabe(rec)} – die Sitemap empfiehlt die Seite trotzdem zur Indexierung. Widersprüchliches Signal für Google.`, suggestion: 'Seite aus der Sitemap nehmen (app/sitemap.ts) oder noindex aufheben.' }));
        }
      }
    }
    // schon gemeldet und weiterhin noindex (auch im Massenfall und bei einem Einbruch des Seitentyps): Punkt bleibt offen.
    // Wieder indexierbar, entfernt bzw. weitergeleitet oder bewusst erlaubt (allowNoindex, Entwurf) → schließt als behoben.
    if (ovi && !indexNeu && noindex && rec !== start && !imp && !entwurf && !matchesAny(p, exakt, [])) out.push(indexWeiter(rec.url, ovi, rec));
    if (rec.robotsAllowed === false && !robotsMasse) {
      if (imp) out.push(F('robots-wichtig', 'kritisch', { url: rec.url, file: 'app/robots.ts', key: 'gesperrt', title: `Wichtige Seite per robots.txt gesperrt: ${p}`, detail: 'Eine Disallow-Regel trifft diese Adresse – Google darf die Seite nicht abrufen.', suggestion: 'Disallow-Regel in app/robots.ts entfernen oder enger fassen.' }));
      else if (rec.inSitemap) out.push(F('robots-sitemap', 'hoch', { url: rec.url, file: 'app/robots.ts', key: 'gesperrt', title: `Per robots.txt gesperrt, aber in der Sitemap: ${p}`, detail: 'Die Sitemap empfiehlt die Seite, robots.txt verbietet den Abruf.', suggestion: 'Entweder die Disallow-Regel in app/robots.ts anpassen oder die Seite aus der Sitemap nehmen (app/sitemap.ts).' }));
    }
    // Canonical
    if (!pg.canonical) {
      if (!noindex && rec.robotsAllowed !== false) out.push(F('canonical-fehlt', 'mittel', { url: rec.url, key: 'fehlt', title: `Canonical fehlt: ${p}`, detail: 'Jede indexierbare Seite sollte ihre eigene Adresse als Canonical nennen.', suggestion: 'alternates.canonical in den Metadaten der Seite setzen (Vorgabe „./“ in app/layout.tsx; eine Seite mit eigenem alternates-Block muss canonical selbst angeben).', current: '(keins)', proposed: kanon(rec.url) }));
    } else {
      const ch = hostOf(pg.canonical); const ziel = crawl.pages.get(pg.canonical) || crawl.pages.get(kanon(pg.canonical));
      if (ch && ch !== baseHost) {
        const variante = ch.replace(/^www\./, '') === baseHost.replace(/^www\./, '') || ch.toLowerCase().includes(altDomain);
        out.push(F('canonical-fremd', variante || rec.inSitemap || imp ? 'hoch' : 'mittel', { url: rec.url, key: 'fremd', title: `Canonical zeigt auf eine andere Domain: ${p}`, detail: `${pg.canonical}${variante ? ' – das ist die www-Variante bzw. die frühere Domain, die selbst nur weiterleitet.' : ''} Google wertet dann die fremde Adresse als Original und nimmt diese Seite aus dem Index.`, current: pg.canonical, proposed: kanon(rec.url), suggestion: 'Canonical auf die eigene Adresse setzen (metadataBase in app/layout.tsx bzw. alternates.canonical der Seite; Domain aus lib/site.ts).' }));
      } else if (istHttps && /^http:\/\//i.test(pg.canonical)) out.push(F('https', 'mittel', { url: rec.url, key: 'canonical', title: `Canonical mit unverschlüsseltem http://: ${p}`, detail: pg.canonical, current: pg.canonical, proposed: pg.canonical.replace(/^http:/i, 'https:'), suggestion: 'Adresse der Website in lib/site.ts bzw. metadataBase in app/layout.tsx mit https:// angeben.' }));
      else if (ziel && ziel !== rec && ziel.status !== 200) out.push(F('canonical-ziel', 'hoch', { url: rec.url, key: 'ziel', title: `Canonical-Ziel nicht erreichbar: ${p} → ${pathOf(pg.canonical)}`, detail: `Das Canonical zeigt auf eine Adresse, die mit ${ziel.status ? 'HTTP ' + ziel.status : 'einem Fehler'} antwortet.`, current: pg.canonical, proposed: kanon(rec.url), suggestion: 'alternates.canonical in den Metadaten der Seite auf eine erreichbare Adresse setzen (in der Regel die eigene).' }));
      else if (ziel && ziel !== rec && (ziel.redirectedTo || (ziel.chain && ziel.chain.length))) out.push(F('canonical-ziel', 'mittel', { url: rec.url, key: 'ziel', title: `Canonical-Ziel leitet weiter: ${p} → ${pathOf(pg.canonical)}`, detail: `Das Canonical zeigt auf eine Adresse, die auf ${pathOf(ziel.redirectedTo || ziel.final || '')} weiterleitet.`, current: pg.canonical, proposed: ziel.redirectedTo || ziel.final || kanon(rec.url), suggestion: 'Canonical direkt auf das Endziel setzen (alternates.canonical in den Metadaten der Seite).' }));
      else if (!selbst && rec.inSitemap) out.push(F('sitemap-canonical', 'mittel', { url: rec.url, file: 'app/sitemap.ts', key: 'canonical', title: `Sitemap-Adresse nennt eine andere Adresse als Canonical: ${p} → ${pathOf(pg.canonical)}`, detail: 'Sitemap und Canonical widersprechen sich: Die Sitemap empfiehlt diese Adresse, die Seite selbst erklärt eine andere zum Original.', current: pg.canonical, proposed: kanon(rec.url), suggestion: 'Entweder das Canonical der Seite korrigieren (alternates.canonical) oder in app/sitemap.ts die kanonische Adresse eintragen.' }));
    }
    if (/\/index\.html$/.test(p)) out.push(F('index-html-dublette', 'niedrig', { url: rec.url, file: 'public/.htaccess', key: 'dublette', title: `${p} ist als eigene Adresse verlinkt (Dublette der Verzeichnis-Adresse)`, detail: 'Dieselbe Seite ist unter zwei Adressen erreichbar; intern verlinkt sein sollte nur die Adresse mit Schrägstrich am Ende.', suggestion: 'Internen Link auf die Verzeichnis-Adresse ändern; zusätzlich in public/.htaccess …/index.html dauerhaft (301) auf …/ weiterleiten.' }));
    // Verwaist: nur bei vollständigem Crawl aussagekräftig
    if (vollstaendig && rec.inSitemap && !noindex && rec.robotsAllowed !== false && rec.inlinks === 0 && rec !== start) out.push(F('verwaist', 'mittel', { url: rec.url, key: 'verwaist', title: `Verwaiste Seite (kein interner Link): ${p}`, detail: 'Die Seite ist nur über die Sitemap erreichbar; ohne interne Links stuft Google sie als unwichtig ein.', suggestion: 'Von der passenden Übersichtsseite oder aus thematisch nahen Seiten verlinken – oder die Seite zusammenlegen.' }));
    // Langsam: nur wenn auch der letzte Lauf langsam war (ein einzelner Ausreißer ist kein Befund)
    if (imp && rec.ms > langsamMs && vr && vr.ms > langsamMs) out.push(F('langsam', 'niedrig', { url: rec.url, key: 'langsam', title: `Wiederholt langsame Antwort: ${p}`, detail: `${rec.ms} ms in diesem Lauf, ${vr.ms} ms im letzten – die Grenze liegt bei ${langsamMs} ms Serverantwortzeit.`, suggestion: 'Seite mehrfach im Browser laden. Bleibt sie langsam: Auslastung des Webspace beim Hoster prüfen.' }));
    // Sitemap ≠ Indexierbarkeit (nur bei lesbarer Sitemap). Detailseiten mit Index-Gate werden je Bereich zusammengefasst.
    if (sitemapOk && !rec.inSitemap && idx(rec) && selbst && !entwurf && !/\/index\.html$/.test(p)) {
      if (gate) merke(family(p), 'fehlt', rec);
      else if (rec.inlinks >= 1 || rec === start) out.push(F('sitemap-fehlt', 'niedrig', { url: rec.url, file: 'app/sitemap.ts', key: 'fehlt', title: `Indexierbare Seite fehlt in der Sitemap: ${p}`, detail: `${rec === start ? 'Startseite' : seiten(rec.inlinks) + ' verlinken hierher'}, Canonical zeigt auf die Seite selbst, kein noindex.`, suggestion: 'Seite in app/sitemap.ts aufnehmen (Liste staticPages bzw. die passende Datenquelle) – oder auf noindex setzen, wenn sie nicht gefunden werden soll.' }));
    }
  }
  // Offene Wechselbefunde zu Seiten, die dieser Lauf nicht abgerufen hat: Bei unvollständigem Crawl und für wichtige
  // Seiten (importantPaths) bleibt der Punkt offen. Bei vollständigem Crawl ist eine andere Seite weder verlinkt noch
  // in der Sitemap – die Website verweist nicht mehr auf sie, der Punkt schließt.
  for (const [u, o] of offenVerlust) if (!vollstaendig || wichtig.has(pathOf(u))) out.push(verlustWeiter(u, o, null));
  for (const [u, o] of offenIndex) if (!vollstaendig || wichtig.has(pathOf(u))) out.push(indexWeiter(u, o, null, vollstaendig ? 'nicht mehr verlinkt, nicht in der Sitemap' : 'Crawl unvollständig'));

  // ── Sitemap und Index-Gate laufen auseinander (je Bereich und Richtung ein Punkt) ──
  for (const [k, recs] of [...abweichung].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const [fam, art] = k.split('|'); const urls = recs.map(r => r.url).sort(); const fehlt = art === 'fehlt';
    out.push(F('sitemap-index-abweichung', 'mittel', { url: base + fam, file: 'app/sitemap.ts', key: fehlt ? 'fehlt-in-sitemap' : 'noindex-in-sitemap',
      title: `${seiten(urls.length)} im Bereich ${fam}: ${fehlt ? 'indexierbar, aber nicht in der Sitemap' : 'noindex, aber in der Sitemap'}`,
      detail: `Beispiele: ${liste(urls)}. Sitemap und robots-Angabe der Detailseiten müssen dieselbe Entscheidung treffen – sonst erhält Google widersprüchliche Signale.`,
      suggestion: 'app/sitemap.ts und die Seite (generateMetadata → robotsFor) müssen denselben Filter aus lib/indexGate.ts verwenden; nach der Korrektur neu deployen.',
      count: urls.length, examples: urls.slice(0, 20).map(u => ({ url: u, detail: fehlt ? 'indexierbar, nicht in der Sitemap' : 'noindex, in der Sitemap' })) }));
  }

  // ── Entwürfe müssen noindex und außerhalb der Sitemap bleiben ──────────────
  for (const p of entwuerfe) {
    const u = base + p; const rec = crawl.pages.get(u); const inSitemap = smEintraege.has(u) || !!(rec && rec.inSitemap);
    const offen = !!(rec && rec.page && rec.status === 200 && !nx(rec));
    if (!offen && !inSitemap) continue;
    out.push(F('entwurf-oeffentlich', 'hoch', { approval: 'recht', url: u, file: 'lib/features.ts', key: 'entwurf', title: `Entwurfsseite ist für Suchmaschinen freigegeben: ${p}`, detail: `Die Seite gilt als Entwurf, ${[offen ? 'trägt aber kein noindex' : '', inSitemap ? 'steht aber in der Sitemap' : ''].filter(Boolean).join(' und ')}.`, suggestion: 'Vor einer Veröffentlichung rechtlich prüfen lassen. Bis dahin Freigabe-Schalter in lib/features.ts zurücksetzen (noindex, nicht in app/sitemap.ts). Ist die Seite geprüft und bewusst freigegeben: aus entwurfSeiten in seo-autopilot/config.js nehmen.' }));
  }

  // ── Sicherheits-Header der Startseite ──────────────────────────────────────
  if (start && start.status === 200 && start.headers && Object.keys(start.headers).length) {
    const h = start.headers;
    for (const [name, sev, wozu] of HEADER_PFLICHT) if (!h[name]) out.push(F('security-header', sev, { url: start.url, file: 'public/.htaccess', key: name, title: `Sicherheits-Header fehlt: ${name}`, detail: `Die Startseite sendet den Header nicht (${wozu}).`, suggestion: 'Header in public/.htaccess im Abschnitt „Security-Header“ setzen (Header always set …) und neu deployen.' }));
    if (!h['x-frame-options'] && !/frame-ancestors/i.test(h['content-security-policy'] || '')) out.push(F('security-header', 'niedrig', { url: start.url, file: 'public/.htaccess', key: 'x-frame-options', title: 'Sicherheits-Header fehlt: Schutz vor Einbettung (X-Frame-Options)', detail: 'Weder X-Frame-Options noch frame-ancestors in der Content-Security-Policy ist gesetzt – die Website ließe sich in fremde Seiten einbetten.', suggestion: 'In public/.htaccess „Header always set X-Frame-Options "DENY"“ setzen (oder frame-ancestors in der CSP).' }));
  }
  return out;
}

const rules = ['sitemap-datei', 'sitemap-lastmod', 'robots', 'host-weiterleitung', 'alte-domain-weiterleitung', 'datei-defekt', 'serverfehler', 'sitemap-404', 'defekter-link', 'gesperrt', 'erreichbarkeit-verlust', 'status-aenderung', 'redirect-loop', 'redirect-kette', 'sitemap-redirect', 'https', 'seite-geaendert', 'vorschau-noindex', 'noindex-wichtig', 'noindex-sitemap', 'index-verlust', 'index-drift', 'sitemap-index-abweichung', 'entwurf-oeffentlich', 'robots-sitemap', 'robots-wichtig', 'canonical-fehlt', 'canonical-fremd', 'canonical-ziel', 'sitemap-canonical', 'index-html-dublette', 'verwaist', 'langsam', 'security-header', 'sitemap-fehlt'];
// Kurztexte für die Oberfläche (uebersicht.json → ruleLabels)
const labels = {
  'sitemap-datei': 'Sitemap nicht lesbar', 'sitemap-lastmod': 'Sitemap: lastmod ohne Aussage', 'robots': 'robots.txt fehlerhaft',
  'host-weiterleitung': 'Weiterleitung http/www fehlerhaft', 'alte-domain-weiterleitung': 'Weiterleitung der alten Domain fehlerhaft', 'datei-defekt': 'Verlinkte Datei nicht abrufbar',
  'serverfehler': 'Seite nicht erreichbar', 'sitemap-404': 'Sitemap-Adresse nicht gefunden', 'defekter-link': 'Defekter interner Link', 'gesperrt': 'Seite gesperrt (401/403)',
  'erreichbarkeit-verlust': 'Seite nicht mehr erreichbar', 'status-aenderung': 'Statuscode geändert', 'redirect-loop': 'Weiterleitungsschleife', 'redirect-kette': 'Weiterleitungskette',
  'sitemap-redirect': 'Sitemap-Adresse leitet weiter', 'https': 'Unverschlüsselte Adresse', 'seite-geaendert': 'Wichtige Seite geändert',
  'vorschau-noindex': 'Website/Startseite auf noindex', 'noindex-wichtig': 'Wichtige Seite auf noindex', 'noindex-sitemap': 'noindex-Seite in der Sitemap',
  'index-verlust': 'Seite neu auf noindex', 'index-drift': 'Einbruch indexierbarer Seiten', 'sitemap-index-abweichung': 'Sitemap und Index-Gate uneins', 'entwurf-oeffentlich': 'Entwurf öffentlich',
  'robots-sitemap': 'Gesperrt, aber in der Sitemap', 'robots-wichtig': 'Wichtige Seite per robots.txt gesperrt',
  'canonical-fehlt': 'Canonical fehlt', 'canonical-fremd': 'Canonical auf fremde Domain', 'canonical-ziel': 'Canonical-Ziel fehlerhaft', 'sitemap-canonical': 'Sitemap widerspricht Canonical',
  'index-html-dublette': '/index.html als eigene Adresse', 'verwaist': 'Verwaiste Seite', 'langsam': 'Langsame Antwort', 'security-header': 'Sicherheits-Header fehlt', 'sitemap-fehlt': 'Seite fehlt in der Sitemap',
};
module.exports = { run, rules, gruppe: GRUPPE, labels };
