'use strict';
// Google Search Console: Zugang (Env-Inhalt roh/base64 oder Datei), Token, Abfragen, Fehlerhinweise, Zeitlimit und
// Wiederholung (lib/gsc.js) sowie die Auswertung mit Umzugshinweis (lib/gsc-analyze.js).
// Ohne Netz: global.fetch wird je Test ersetzt und danach wiederhergestellt.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const gsc = require('../lib/gsc');
const { analyze, verdict, umzug, EXPECTED_CTR, LIVE_SEIT, UMZUG_TAGE } = require('../lib/gsc-analyze');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'seo-gsc-'));
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const PEM = privateKey.export({ type: 'pkcs8', format: 'pem' });
const KONTO = 'seo-bot@geheimes-projekt-42.iam.gserviceaccount.com';
const SCHLUESSEL = JSON.stringify({ type: 'service_account', client_email: KONTO, private_key: PEM });
const PROP = 'sc-domain:kfz-zulassungsprofis.de';
const cfg = (gscCfg = {}) => ({ base: 'https://kfz-zulassungsprofis.de', gsc: { property: PROP, credentialsFile: '', credentialsJson: SCHLUESSEL, ...gscCfg } });
const SCHNELL = { retryDelayMs: 1 };

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
/** global.fetch für die Dauer von fn ersetzen; gibt die Liste der Aufrufe mit. */
async function mitFetch(impl, fn) {
  const echt = global.fetch; const aufrufe = [];
  global.fetch = async (url, init = {}) => { aufrufe.push({ url: String(url), init }); return impl(String(url), init, aufrufe.length); };
  try { return await fn(aufrufe); } finally { global.fetch = echt; }
}
/** Antworten wie die echte API: Token, sites.list, Suchanalyse (Vorperiode mit kleineren Zahlen). */
function apiAntwort(url, init, sites = [{ siteUrl: PROP, permissionLevel: 'siteFullUser' }]) {
  if (url.includes('oauth2.googleapis.com/token')) return json({ access_token: 'tok-123', expires_in: 3600, token_type: 'Bearer' });
  if (url.endsWith('/webmasters/v3/sites')) return json({ siteEntry: sites });
  const body = JSON.parse(init.body); const dim = body.dimensions[0]; const vorperiode = body.endDate < gsc.ranges(7).start && body.startDate < gsc.ranges(7).start;
  if (dim === 'date') return json({ rows: [{ keys: [body.startDate], clicks: vorperiode ? 5 : 10, impressions: 100, ctr: 0.1, position: 8 }, { keys: [body.endDate], clicks: vorperiode ? 5 : 30, impressions: 300, ctr: 0.1, position: 4 }] });
  if (dim === 'query' && body.dimensions.length === 1) return json({ rows: [{ keys: ['auto online anmelden'], clicks: 7, impressions: 70, ctr: 0.1, position: 3.2 }] });
  if (dim === 'page') return json({ rows: [{ keys: ['https://kfz-zulassungsprofis.de/preise/'], clicks: vorperiode ? 2 : 9, impressions: 90, ctr: 0.1, position: 5 }] });
  return json({}); // ohne rows, wie die API bei leeren Ergebnissen
}

// ── Zugang ──────────────────────────────────────────────────────────────────
test('GSC-Status ohne Zugang: nicht verbunden, mit Anleitung für KFZ-Zulassungsprofis und ohne Serverpfade', () => {
  const st = gsc.status(cfg({ credentialsJson: '' }));
  assert.strictEqual(st.connected, false); assert.match(st.reason, /GSC_CREDENTIALS_JSON bzw\. GSC_CREDENTIALS_FILE fehlt/);
  assert.ok(Array.isArray(st.needed) && st.needed.length >= 4);
  const text = JSON.stringify(st);
  assert.match(text, /sc-domain:kfz-zulassungsprofis\.de/); assert.match(text, /https:\/\/kfz-zulassungsprofis\.de\//); assert.match(text, /GSC_CREDENTIALS_JSON/);
  assert.ok(!/\/(var|srv|home|etc|opt)\//.test(text), 'keine Serverpfade in der Anleitung');
  assert.deepStrictEqual([...new Set(text.match(/[a-z0-9-]+\.de\b/g))], ['kfz-zulassungsprofis.de'], 'einzige genannte Domain ist die eigene');
  assert.strictEqual(gsc.status({}).connected, false, 'auch ohne gsc-Abschnitt kein Absturz');
});

test('GSC-Status mit Schlüssel aus cfg.gsc.credentialsJson (roh oder base64) oder credentialsFile – nie Schlüsselinhalte', () => {
  const dir = tmp(); const datei = path.join(dir, 'dienstkonto.json'); fs.writeFileSync(datei, SCHLUESSEL);
  const b64 = Buffer.from(SCHLUESSEL).toString('base64');
  const varianten = { roh: { credentialsJson: SCHLUESSEL }, 'roh mit Leerraum': { credentialsJson: '\n  ' + SCHLUESSEL + '\n' }, base64: { credentialsJson: b64 }, 'base64 umbrochen': { credentialsJson: b64.replace(/.{76}/g, '$&\n') }, datei: { credentialsJson: '', credentialsFile: datei }, 'Env vor Datei': { credentialsJson: b64, credentialsFile: path.join(dir, 'gibt-es-nicht.json') } };
  for (const [name, g] of Object.entries(varianten)) {
    const st = gsc.status(cfg(g)); const text = JSON.stringify(st);
    assert.strictEqual(st.connected, true, name); assert.strictEqual(st.property, PROP);
    assert.match(st.account, /^Dienstkonto vorhanden \(…@geh…\.iam\.gserviceaccount\.com\)$/, name + ': nur gekürzte Domain');
    assert.ok(!/seo-bot|geheimes-projekt|PRIVATE KEY|MII/.test(text), name + ': kein Kontoname, keine Projektkennung, kein Schlüssel');
    assert.ok(!text.includes(dir), name + ': kein Dateipfad');
  }
  assert.strictEqual(gsc.maskAccount('ohne-at'), 'Dienstkonto vorhanden');
  // private_key mit doppelt maskierten Zeilenumbrüchen (häufig bei eingefügten Secrets)
  const doppelt = JSON.stringify({ client_email: KONTO, private_key: PEM }).replace(/\\n/g, '\\\\n');
  assert.strictEqual(gsc.status(cfg({ credentialsJson: doppelt })).connected, true);
});

test('GSC-Status bei unbrauchbarem Schlüssel: verständlicher Grund, der nichts aus der Eingabe zitiert', () => {
  const dir = tmp(); const kaputt = path.join(dir, 'kaputt.json'); fs.writeFileSync(kaputt, '{"client_email": "x@y", "private_key": "GEHEIMER-INHALT-123" und dann Unsinn');
  const faelle = [
    [{ credentialsJson: 'MIIEvQ-GEHEIMER-INHALT-123-kein-json' }, /kein gültiges JSON \(GSC_CREDENTIALS_JSON/],
    [{ credentialsJson: '{"client_email":"x@y.test","private_key":"GEHEIMER-INHALT-123' }, /kein gültiges JSON/],
    [{ credentialsJson: '', credentialsFile: kaputt }, /kein gültiges JSON \(GSC_CREDENTIALS_FILE\)/],
    [{ credentialsJson: '', credentialsFile: path.join(dir, 'fehlt.json') }, /^Schlüsseldatei nicht gefunden \(GSC_CREDENTIALS_FILE\)\.$/],
    [{ credentialsJson: '', credentialsFile: dir }, /^Schlüsseldatei nicht lesbar/],
    [{ credentialsJson: JSON.stringify({ client_email: KONTO }) }, /kein Dienstkonto/],
    [{ credentialsJson: JSON.stringify({ client_email: KONTO, private_key: 'GEHEIMER-INHALT-123' }) }, /private_key im Schlüssel ist nicht lesbar/],
    [{ credentialsJson: '[1,2]' }, /kein gültiges JSON|kein Dienstkonto/],
  ];
  for (const [g, muster] of faelle) {
    const st = gsc.status(cfg(g)); assert.strictEqual(st.connected, false); assert.match(st.reason, muster);
    assert.ok(!/GEHEIMER|MIIEvQ|Unexpected|seo-bot/.test(JSON.stringify(st)) && !JSON.stringify(st).includes(dir), 'weder Eingabe noch Parser-Meldung noch Pfad im Status');
  }
});

test('Property-Formen: Domain-Property und URL-Präfix, mit Normalisierung', () => {
  assert.strictEqual(gsc.property(cfg()), 'sc-domain:kfz-zulassungsprofis.de');
  assert.strictEqual(gsc.property(cfg({ property: ' SC-Domain:KFZ-Zulassungsprofis.de ' })), 'sc-domain:kfz-zulassungsprofis.de');
  assert.strictEqual(gsc.property(cfg({ property: 'https://kfz-zulassungsprofis.de/' })), 'https://kfz-zulassungsprofis.de/');
  assert.strictEqual(gsc.property(cfg({ property: 'https://kfz-zulassungsprofis.de' })), 'https://kfz-zulassungsprofis.de/', 'URL-Präfix braucht den Schrägstrich am Ende');
  assert.strictEqual(gsc.property(cfg({ property: 'https://kfz-zulassungsprofis.de/ratgeber/' })), 'https://kfz-zulassungsprofis.de/ratgeber/');
  assert.strictEqual(gsc.property(cfg({ property: 'kfz-zulassungsprofis.de' })), 'sc-domain:kfz-zulassungsprofis.de', 'nackte Domain → Domain-Property');
  assert.strictEqual(gsc.property(cfg({ property: '' })), 'sc-domain:kfz-zulassungsprofis.de', 'leer → Domain-Property aus der Basis-URL');
});

// ── Token und Abfragen (global.fetch gemockt) ───────────────────────────────
test('Token: signiertes JWT (RS256, nur Lesen), Zeitlimit-Signal am Abruf', async () => {
  await mitFetch(url => apiAntwort(url), async aufrufe => {
    const tok = await gsc.token(cfg({ credentialsJson: Buffer.from(SCHLUESSEL).toString('base64') }));
    assert.strictEqual(tok, 'tok-123'); assert.strictEqual(aufrufe.length, 1);
    const { url, init } = aufrufe[0];
    assert.strictEqual(url, 'https://oauth2.googleapis.com/token'); assert.strictEqual(init.method, 'POST'); assert.ok(init.signal instanceof AbortSignal, 'jeder Abruf hat ein Zeitlimit');
    const p = new URLSearchParams(init.body); assert.strictEqual(p.get('grant_type'), 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [h, pl, sig] = p.get('assertion').split('.'); const kopf = JSON.parse(Buffer.from(h, 'base64url')); const inhalt = JSON.parse(Buffer.from(pl, 'base64url'));
    assert.deepStrictEqual(kopf, { alg: 'RS256', typ: 'JWT' });
    assert.strictEqual(inhalt.iss, KONTO); assert.strictEqual(inhalt.scope, 'https://www.googleapis.com/auth/webmasters.readonly'); assert.strictEqual(inhalt.aud, 'https://oauth2.googleapis.com/token'); assert.strictEqual(inhalt.exp - inhalt.iat, 3600);
    assert.ok(crypto.verify('RSA-SHA256', Buffer.from(h + '.' + pl), publicKey, Buffer.from(sig, 'base64url')), 'Signatur passt zum Schlüssel');
  });
  await mitFetch(() => json({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, 400), async aufrufe => {
    await assert.rejects(gsc.token(cfg(), undefined, SCHNELL), /Token-Fehler HTTP 400: Invalid JWT Signature\. – Schlüssel des Dienstkontos ungültig/);
    assert.strictEqual(aufrufe.length, 1, '4xx wird nicht wiederholt');
  });
  assert.strictEqual(gsc.TIMEOUT_MS, 30000);
});

test('Abfrage: Kennzahlen für 7/30 Tage mit Vorperiode; Domain-Property und URL-Präfix in der Adresse', async () => {
  await mitFetch((url, init) => apiAntwort(url, init), async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { days: [7, 30] });
    assert.strictEqual(d.connected, true); assert.strictEqual(d.property, PROP); assert.strictEqual(d.source, 'Google Search Console API'); assert.strictEqual(d.lagDays, 3); assert.strictEqual(d.stale, undefined);
    const p30 = d.periods[30];
    assert.strictEqual(p30.current.clicks, 40); assert.strictEqual(p30.current.impressions, 400); assert.strictEqual(p30.previous.clicks, 10);
    assert.strictEqual(Number(p30.current.ctr.toFixed(2)), 0.1); assert.strictEqual(p30.current.position, 5, 'impressionsgewichtete Position: (8·100+4·300)/400');
    assert.strictEqual(p30.queries[0].query, 'auto online anmelden'); assert.strictEqual(p30.pages[0].prevClicks, 2); assert.strictEqual(p30.pages[0].clicks, 9);
    assert.deepStrictEqual([p30.devices, p30.countries, p30.queryPages], [[], [], []], 'leere Antworten ohne rows sind kein Fehler');
    assert.ok(d.periods[7].queries.length && d.periods[7].daily.length === 2);
    const abfragen = aufrufe.filter(a => a.url.includes('/searchAnalytics/query'));
    assert.strictEqual(aufrufe.length, 1 + abfragen.length, 'ein Token für alle Abfragen'); assert.strictEqual(abfragen.length, 5 + 9);
    for (const a of abfragen) {
      assert.strictEqual(a.url, 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Akfz-zulassungsprofis.de/searchAnalytics/query');
      assert.strictEqual(a.init.headers.authorization, 'Bearer tok-123'); assert.ok(a.init.signal instanceof AbortSignal);
      const b = JSON.parse(a.init.body); assert.strictEqual(b.type, 'web'); assert.strictEqual(b.dataState, 'final'); assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(b.startDate) && b.startDate <= b.endDate);
    }
    const r = gsc.ranges(30); assert.ok(r.prevEnd < r.start, 'Vorperiode liegt vor der Periode');
  });
  await mitFetch((url, init) => apiAntwort(url, init), async aufrufe => {
    const d = await gsc.fetchPerformance(cfg({ property: 'https://kfz-zulassungsprofis.de' }), { days: [7] });
    assert.strictEqual(d.connected, true); assert.strictEqual(d.property, 'https://kfz-zulassungsprofis.de/');
    assert.ok(aufrufe.slice(1).every(a => a.url === 'https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fkfz-zulassungsprofis.de%2F/searchAnalytics/query'), 'URL-Präfix-Property vollständig kodiert');
  });
  // ohne Zugang: kein Netzaufruf, kein stale
  await mitFetch(() => { throw new Error('darf nicht aufgerufen werden'); }, async aufrufe => {
    const d = await gsc.fetchPerformance(cfg({ credentialsJson: '' })); assert.strictEqual(d.connected, false); assert.strictEqual(d.stale, undefined); assert.match(d.status.reason, /Kein Dienstkonto/); assert.strictEqual(aufrufe.length, 0);
  });
});

test('403/404: verständliche Hinweise; der Aufrufer bekommt {connected:false, stale:true, status:{reason}} statt einer Ausnahme', async () => {
  const mitStatus = (code, text) => (url, init) => (url.includes('oauth2') ? apiAntwort(url, init) : json({ error: { code, message: text } }, code));
  await mitFetch(mitStatus(403, "User does not have sufficient permission for site 'sc-domain:kfz-zulassungsprofis.de'."), async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { days: [7], ...SCHNELL });
    assert.strictEqual(d.connected, false); assert.strictEqual(d.stale, true); assert.strictEqual(d.periods, undefined);
    assert.strictEqual(d.status.connected, false); assert.strictEqual(d.status.stale, true); assert.strictEqual(d.status.property, PROP);
    assert.match(d.status.reason, /^GSC HTTP 403: User does not have sufficient permission/); assert.match(d.status.reason, /keinen Zugriff auf die Property/); assert.match(d.status.reason, /Nutzer und Berechtigungen/);
    assert.strictEqual(aufrufe.length, 2, 'Token + eine Abfrage: 403 wird nicht wiederholt, danach wird abgebrochen');
    assert.deepStrictEqual(gsc.statusAfterFetch(cfg(), d), d.status, 'Status für gsc-status.json: nicht verbunden, mit Grund');
    assert.ok(!/seo-bot|geheimes-projekt|PRIVATE KEY/.test(JSON.stringify(d)));
  });
  await mitFetch(mitStatus(404, 'Requested entity was not found.'), async () => {
    const d = await gsc.fetchPerformance(cfg({ property: 'https://kfz-zulassungsprofis.de/' }), { days: [7], ...SCHNELL });
    assert.strictEqual(d.stale, true);
    assert.match(d.status.reason, /^GSC HTTP 404: Requested entity was not found\. – Property nicht gefunden: GSC_PROPERTY muss exakt/);
    assert.match(d.status.reason, /Domain-Property: sc-domain:kfz-zulassungsprofis\.de, URL-Präfix-Property: https:\/\/kfz-zulassungsprofis\.de\/ mit Schrägstrich/);
    await assert.rejects(gsc.query(cfg(), 'tok', { startDate: '2026-11-01', endDate: '2026-11-07', dimensions: ['date'] }, undefined, SCHNELL), /Property nicht gefunden/, 'query() selbst wirft weiterhin');
  });
  await mitFetch(mitStatus(429, 'Quota exceeded'), async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { days: [7], ...SCHNELL });
    assert.match(d.status.reason, /GSC HTTP 429: Quota exceeded – Kontingent erschöpft/); assert.strictEqual(aufrufe.length, 3, '429 wird genau einmal wiederholt');
  });
  await mitFetch(() => json({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, 400), async () => {
    const d = await gsc.fetchPerformance(cfg(), SCHNELL); assert.strictEqual(d.stale, true); assert.match(d.status.reason, /^Token-Fehler HTTP 400/);
  });
  const ok = { connected: true, periods: {} }; assert.deepStrictEqual(gsc.statusAfterFetch(cfg(), ok), gsc.status(cfg()), 'nach erfolgreichem Abruf: normaler Status');
});

test('Zeitlimit und Wiederholung: hängender Abruf bricht ab, ein zweiter Versuch je Abruf, Netzfehler werden überbrückt', async () => {
  const haengt = (url, init) => new Promise((_, reject) => { init.signal.addEventListener('abort', () => reject(init.signal.reason)); });
  await mitFetch(haengt, async aufrufe => {
    const t0 = Date.now(); const d = await gsc.fetchPerformance(cfg(), { timeoutMs: 40, retryDelayMs: 1 });
    assert.strictEqual(d.connected, false); assert.strictEqual(d.stale, true);
    assert.match(d.status.reason, /^Token-Abruf: Zeitüberschreitung nach 0 s – auch der Wiederholungsversuch ist gescheitert$/);
    assert.strictEqual(aufrufe.length, 2, 'genau ein Wiederholungsversuch'); assert.ok(Date.now() - t0 < 2000);
  });
  // Zeitüberschreitung erst bei einer Abfrage (Token klappt)
  await mitFetch((url, init) => (url.includes('oauth2') ? apiAntwort(url, init) : haengt(url, init)), async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { days: [7], timeoutMs: 300, retryDelayMs: 1 });
    assert.match(d.status.reason, /^Search-Console-Abfrage: Zeitüberschreitung nach 0\.3 s/); assert.strictEqual(aufrufe.length, 3);
  });
  // erster Versuch scheitert am Netz bzw. mit 503, der zweite klappt → verbunden
  let n = 0;
  await mitFetch((url, init) => { n++; if (n === 1) { const e = new TypeError('fetch failed'); e.cause = { code: 'ECONNRESET' }; throw e; } if (n === 3) return new Response('Service Unavailable', { status: 503 }); return apiAntwort(url, init); }, async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { days: [7], ...SCHNELL });
    assert.strictEqual(d.connected, true, 'einzelne Aussetzer werden durch die Wiederholung überbrückt'); assert.strictEqual(aufrufe.length, 1 + 5 + 2);
  });
  // dauerhafter Netzfehler: Grund ohne interne Details
  await mitFetch(() => { const e = new TypeError('fetch failed'); e.cause = { code: 'ENOTFOUND' }; throw e; }, async () => {
    const d = await gsc.fetchPerformance(cfg(), SCHNELL); assert.strictEqual(d.status.reason, 'Token-Abruf: Netzfehler (ENOTFOUND) – auch der Wiederholungsversuch ist gescheitert');
  });
  // Gesamtzeit begrenzt: langsame, aber erfolgreiche Antworten laufen nicht endlos
  await mitFetch(async (url, init) => { await new Promise(r => setTimeout(r, 30)); return apiAntwort(url, init); }, async aufrufe => {
    const d = await gsc.fetchPerformance(cfg(), { budgetMs: 50, ...SCHNELL });
    assert.strictEqual(d.stale, true); assert.match(d.status.reason, /Gesamtzeit von 0 s überschritten/); assert.ok(aufrufe.length < 8);
  });
});

test('verify(): Berechtigungstest, Hinweis auf die andere Property-Form, wirft nie', async () => {
  await mitFetch((url, init) => apiAntwort(url, init), async () => {
    const v = await gsc.verify(cfg(), undefined, SCHNELL);
    assert.strictEqual(v.ok, true); assert.strictEqual(v.permissionLevel, 'siteFullUser'); assert.strictEqual(v.sampleDays, 2); assert.strictEqual(v.property, PROP); assert.match(v.account, /^Dienstkonto vorhanden/);
  });
  await mitFetch((url, init) => apiAntwort(url, init, [{ siteUrl: 'https://kfz-zulassungsprofis.de/', permissionLevel: 'siteRestrictedUser' }]), async () => {
    const v = await gsc.verify(cfg(), undefined, SCHNELL);
    assert.strictEqual(v.ok, false); assert.match(v.reason, /nicht freigegeben, wohl aber https:\/\/kfz-zulassungsprofis\.de\/ – GSC_PROPERTY auf genau diesen Wert setzen/);
    const v2 = await gsc.verify(cfg({ property: 'https://kfz-zulassungsprofis.de/' }), undefined, SCHNELL); assert.strictEqual(v2.ok, true); assert.strictEqual(v2.permissionLevel, 'siteRestrictedUser');
  });
  await mitFetch((url, init) => apiAntwort(url, init, [{ siteUrl: 'sc-domain:andere-seite.test', permissionLevel: 'siteOwner' }]), async () => {
    const v = await gsc.verify(cfg(), undefined, SCHNELL); assert.strictEqual(v.ok, false); assert.match(v.reason, /ist für das Dienstkonto nicht freigegeben – E-Mail-Adresse des Dienstkontos/); assert.ok(!v.reason.includes('seo-bot'));
  });
  await mitFetch((url, init) => apiAntwort(url, init, [{ siteUrl: PROP, permissionLevel: 'siteUnverifiedUser' }]), async () => {
    assert.match((await gsc.verify(cfg(), undefined, SCHNELL)).reason, /siteUnverifiedUser/);
  });
  await mitFetch(() => new Response('kaputt', { status: 500 }), async () => {
    const v = await gsc.verify(cfg(), undefined, SCHNELL); assert.strictEqual(v.ok, false); assert.match(v.reason, /^Token-Fehler HTTP 500/);
  });
  const ohne = await gsc.verify(cfg({ credentialsJson: '' })); assert.strictEqual(ohne.ok, false); assert.strictEqual(ohne.connected, false);
});

// ── Auswertung ──────────────────────────────────────────────────────────────
const IM_UMZUG = Date.parse('2026-12-28T08:00:00Z');   // Tag 38 nach dem Livegang
const DANACH = Date.parse('2027-06-10T08:00:00Z');     // Tag 202: auch der 90-Tage-Vergleich liegt ganz nach dem Livegang
const seite = (p, clicks, prev, impr, pos, prevImpr = 0) => ({ page: 'https://kfz-zulassungsprofis.de' + p, clicks, prevClicks: prev, impressions: impr, prevImpressions: prevImpr, ctr: impr ? clicks / impr : 0, position: pos });
function daten(bereiche) {
  const periode = (range, cur, prev) => ({ range, current: { clicks: cur, impressions: cur * 25, ctr: 0.04, position: 9 }, previous: { clicks: prev, impressions: prev * 25, ctr: 0.04, position: 10 } });
  return { connected: true, source: 'Google Search Console API', property: PROP, fetchedAt: '2026-12-28T06:00:00Z', lagDays: 3, periods: {
    7: periode(bereiche[7], 120, 60),
    30: { ...periode(bereiche[30], 400, 0),
      pages: [seite('/stark/', 200, 120, 2000, 2.5, 1500), seite('/schwach/', 2, 3, 900, 3.0, 800), seite('/seite2/', 5, 5, 500, 14, 480), seite('/klein/', 8, 2, 50, 20, 40), seite('/verlierer/', 30, 90, 1000, 6, 1100), seite('/neu/', 6, 0, 120, 9, 0)],
      queries: [{ query: 'kfz zulassung online', clicks: 10, impressions: 800, ctr: 0.0125, position: 7, prevClicks: 9, prevImpressions: 700 }, { query: 'zulassungsdienst', clicks: 60, impressions: 200, ctr: 0.3, position: 1.2, prevClicks: 20, prevImpressions: 150 }, { query: 'winzig', clicks: 1, impressions: 10, ctr: 0.1, position: 30, prevClicks: 0 }] },
    90: periode(bereiche[90], 900, 300),
  } };
}
const BEREICHE_UMZUG = { 7: { start: '2026-12-19', end: '2026-12-25', prevStart: '2026-12-12', prevEnd: '2026-12-18' }, 30: { start: '2026-11-26', end: '2026-12-25', prevStart: '2026-10-27', prevEnd: '2026-11-25' }, 90: { start: '2026-09-27', end: '2026-12-25', prevStart: '2026-06-29', prevEnd: '2026-09-26' } };
const BEREICHE_DANACH = { 7: { start: '2027-06-01', end: '2027-06-07', prevStart: '2027-05-25', prevEnd: '2027-05-31' }, 30: { start: '2027-05-09', end: '2027-06-07', prevStart: '2027-04-09', prevEnd: '2027-05-08' }, 90: { start: '2027-03-10', end: '2027-06-07', prevStart: '2026-12-10', prevEnd: '2027-03-09' } };

test('Signifikanz: zu wenig Daten / Schwankung / echter Anstieg / echter Rückgang (außerhalb der Umzugsphase)', () => {
  const o = { umzug: false };
  assert.strictEqual(verdict(5, 3, o).verdict, 'zu wenig Daten');
  assert.strictEqual(verdict(100, 95, o).verdict, 'normale Schwankung');
  assert.strictEqual(verdict(30, 22, o).verdict, 'normale Schwankung', '8 Klicks Unterschied sind Rauschen');
  assert.strictEqual(verdict(100, 60, o).verdict, 'echter Anstieg'); assert.strictEqual(verdict(100, 60, o).deltaPct, 67); assert.strictEqual(verdict(100, 60, o).significant, true);
  assert.strictEqual(verdict(40, 80, o).verdict, 'echter Rückgang');
  assert.ok(EXPECTED_CTR(1) > EXPECTED_CTR(5) && EXPECTED_CTR(5) > EXPECTED_CTR(15));
});

test('Umzugsphase: 120 Tage ab Livegang (Standard 20.11.2026, cfg.gsc.liveSeit überschreibt)', () => {
  assert.strictEqual(LIVE_SEIT, '2026-11-20'); assert.strictEqual(UMZUG_TAGE, 120);
  const u = umzug(undefined, IM_UMZUG); assert.deepStrictEqual([u.aktiv, u.liveSeit, u.bis, u.tage], [true, '2026-11-20', '2027-03-20', 38]);
  assert.match(u.hinweis, /seit 20\.11\.2026 live\. Bis 20\.03\.2027 \(120 Tage\) sind Vergleiche mit der Vorperiode ein Umzugseffekt und kein echter Anstieg/);
  assert.strictEqual(umzug(undefined, Date.parse('2027-03-19T23:59:59Z')).aktiv, true, 'Tag 119: noch jünger als 120 Tage');
  assert.strictEqual(umzug(undefined, Date.parse('2027-03-20T00:00:00Z')).aktiv, false, 'ab Tag 120 vorbei'); assert.strictEqual(umzug(undefined, DANACH).hinweis, '');
  assert.strictEqual(umzug({ gsc: { liveSeit: '2026-01-15' } }, IM_UMZUG).aktiv, false, 'älterer Livegang per Konfiguration');
  assert.strictEqual(umzug({ gsc: { liveSeit: '2027-05-01' } }, DANACH).aktiv, true);
  for (const unsinn of ['', 'bald', '20.11.2026', null, 42]) assert.strictEqual(umzug({ gsc: { liveSeit: unsinn } }, IM_UMZUG).liveSeit, '2026-11-20', 'unbrauchbarer Wert → Standard');
  assert.strictEqual(umzug(undefined, new Date(IM_UMZUG)).aktiv, true, 'Date-Objekt als Zeitpunkt');
});

test('verdict() meldet in der Umzugsphase nie „echter Anstieg“ – auch ohne Zutun des Aufrufers', () => {
  for (const [cur, prev] of [[100, 60], [400, 0], [25, 0], [5000, 100]]) {
    const v = verdict(cur, prev, { now: IM_UMZUG });
    assert.strictEqual(v.verdict, 'Umzugseffekt', `${prev} → ${cur}`); assert.strictEqual(v.significant, false); assert.strictEqual(v.umzug, true); assert.strictEqual(v.delta, cur - prev);
    assert.strictEqual(verdict(cur, prev, { now: DANACH }).verdict, 'echter Anstieg', 'nach der Umzugsphase wieder normale Bewertung');
    assert.strictEqual(verdict(cur, prev, { umzug: true }).verdict, 'Umzugseffekt');
  }
  assert.strictEqual(verdict(40, 80, { now: IM_UMZUG }).verdict, 'echter Rückgang', 'Rückgänge werden weiter gemeldet');
  assert.strictEqual(verdict(100, 95, { now: IM_UMZUG }).verdict, 'normale Schwankung'); assert.strictEqual(verdict(5, 3, { now: IM_UMZUG }).verdict, 'zu wenig Daten');
  assert.strictEqual(verdict(100, 60, { now: IM_UMZUG, cfg: { gsc: { liveSeit: '2026-01-15' } } }).verdict, 'echter Anstieg');
  // ohne Optionen gilt die echte Uhr: bis 19.03.2027 Umzugseffekt, danach echter Anstieg
  assert.strictEqual(verdict(100, 60).verdict, Date.now() < Date.parse('2027-03-20T00:00:00Z') ? 'Umzugseffekt' : 'echter Anstieg');
});

test('analyze in der Umzugsphase: Hinweis in dataNote, kein „echter Anstieg“, keine Gewinner; übrige Auswertung unverändert', () => {
  const a = analyze(daten(BEREICHE_UMZUG), undefined, IM_UMZUG);
  assert.strictEqual(a.connected, true);
  assert.match(a.dataNote, /Google-Daten bis 2026-12-25/); assert.match(a.dataNote, /3 Tage/);
  assert.match(a.dataNote, /Umzugshinweis: Die Domain ist erst seit 20\.11\.2026 live\. Bis 20\.03\.2027 \(120 Tage\) sind Vergleiche mit der Vorperiode ein Umzugseffekt und kein echter Anstieg/);
  assert.deepStrictEqual({ aktiv: a.umzug.aktiv, liveSeit: a.umzug.liveSeit, bis: a.umzug.bis }, { aktiv: true, liveSeit: '2026-11-20', bis: '2027-03-20' }); assert.ok(a.umzug.hinweis);
  assert.ok(!JSON.stringify(a).replace(a.dataNote, '').replace(a.umzug.hinweis, '').includes('echter Anstieg'), 'nirgends ein „echter Anstieg“');
  for (const tage of [7, 30, 90]) { assert.strictEqual(a.totals[tage].clicksVerdict.verdict, 'Umzugseffekt', tage + ' Tage'); assert.strictEqual(a.totals[tage].impressionsVerdict.verdict, 'Umzugseffekt'); assert.strictEqual(a.totals[tage].clicksVerdict.significant, false); }
  assert.deepStrictEqual(a.pages.winners, [], 'keine „Gewinner“ aus dem Umzug');
  assert.deepStrictEqual(a.pages.losers.map(p => p.page.replace('https://kfz-zulassungsprofis.de', '')), ['/verlierer/'], 'echte Verlierer bleiben sichtbar');
  assert.deepStrictEqual(a.pages.strong.map(p => p.page.replace('https://kfz-zulassungsprofis.de', '')), ['/stark/', '/verlierer/']);
  assert.ok(a.pages.weak.some(p => p.page.endsWith('/schwach/')) && a.pages.weak.some(p => p.page.endsWith('/seite2/')) && !a.pages.weak.some(p => p.page.endsWith('/stark/')));
  assert.strictEqual(a.queries.top.find(q => q.query === 'zulassungsdienst').change.verdict, 'Umzugseffekt');
  assert.strictEqual(a.queries.opportunities[0].query, 'kfz zulassung online'); assert.ok(!a.queries.opportunities.some(q => q.query === 'winzig' || q.query === 'zulassungsdienst'));
  assert.deepStrictEqual(a.visibility.newPages.map(p => p.page.replace('https://kfz-zulassungsprofis.de', '')), ['/neu/']); assert.match(a.visibility.note, /Während des Umzugs ist „neu“ kein Zugewinn/);
  assert.deepStrictEqual(analyze({ connected: false }), { connected: false }); assert.deepStrictEqual(analyze(null), { connected: false });
});

test('analyze nach der Umzugsphase: normale Bewertung; der 90-Tage-Vergleich bleibt Umzugseffekt, solange seine Vorperiode vor dem Livegang beginnt', () => {
  const a = analyze(daten(BEREICHE_DANACH), undefined, DANACH);
  assert.ok(!/Umzug/.test(a.dataNote)); assert.strictEqual(a.umzug.aktiv, false); assert.strictEqual(a.umzug.hinweis, '');
  for (const tage of [7, 30, 90]) assert.strictEqual(a.totals[tage].clicksVerdict.verdict, 'echter Anstieg', tage + ' Tage');
  assert.deepStrictEqual(a.pages.winners.map(p => p.page.replace('https://kfz-zulassungsprofis.de', '')), ['/stark/']); assert.ok(!/Umzug/.test(a.visibility.note));
  // Tag 132: 120 Tage vorbei, aber die Vorperiode des 90-Tage-Vergleichs beginnt noch vor dem 20.11.2026
  const tag132 = Date.parse('2027-04-01T08:00:00Z');
  const b = analyze(daten({ 7: { start: '2027-03-23', end: '2027-03-29', prevStart: '2027-03-16', prevEnd: '2027-03-22' }, 30: { start: '2027-02-28', end: '2027-03-29', prevStart: '2027-01-29', prevEnd: '2027-02-27' }, 90: { start: '2026-12-30', end: '2027-03-29', prevStart: '2026-10-01', prevEnd: '2026-12-29' } }), undefined, tag132);
  assert.strictEqual(b.totals[7].clicksVerdict.verdict, 'echter Anstieg'); assert.strictEqual(b.totals[30].clicksVerdict.verdict, 'echter Anstieg'); assert.strictEqual(b.totals[90].clicksVerdict.verdict, 'Umzugseffekt');
  assert.match(b.dataNote, /Umzugshinweis: Die Vorperiode des 90-Tage-Vergleichs beginnt vor dem Livegang der Domain \(20\.11\.2026\)/); assert.strictEqual(b.umzug.aktiv, false);
  // Livegang per Konfiguration
  const c = analyze(daten(BEREICHE_UMZUG), { gsc: { liveSeit: '2026-01-15' } }, IM_UMZUG);
  assert.strictEqual(c.totals[30].clicksVerdict.verdict, 'echter Anstieg'); assert.ok(!/Umzug/.test(c.dataNote));
});
