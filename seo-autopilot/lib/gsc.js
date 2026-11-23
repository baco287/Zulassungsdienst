'use strict';
// ─── Google Search Console (Search Analytics API) ohne Zusatzpakete ───────────
// Zugang: Schlüssel eines Dienstkontos (Service-Account-JSON), entweder
//   • cfg.gsc.credentialsJson (GSC_CREDENTIALS_JSON) – Inhalt der JSON-Datei, roh oder base64 (z. B. als Secret), oder
//   • cfg.gsc.credentialsFile (GSC_CREDENTIALS_FILE) – Pfad zu einer Datei außerhalb des Repos.
// Ohne Schlüssel: Status „nicht verbunden“, der Prüflauf läuft normal weiter.
// Das Dienstkonto muss in der Search Console als Nutzer der Property eingetragen sein (Eingeschränkt genügt).
// Property (cfg.gsc.property / GSC_PROPERTY): Domain-Property „sc-domain:beispiel.de“ oder URL-Präfix „https://beispiel.de/“.
// Token: JWT (RS256) → https://oauth2.googleapis.com/token (scope webmasters.readonly).
// Jeder Abruf hat 30 s Zeitlimit und einen Wiederholungsversuch. Schlüsselinhalte erscheinen nie in Status oder Meldungen.
// Hinweis: GSC-Daten laufen 2–3 Tage nach; der letzte vollständige Tag ist heute−3.
const fs = require('fs');
const crypto = require('crypto');

const TIMEOUT_MS = 30000;   // je Abruf
const BUDGET_MS = 240000;   // Obergrenze für einen kompletten Abruf (alle Zeiträume)
const pause = ms => new Promise(r => setTimeout(r, ms));
const hostFromBase = cfg => { try { return new URL(cfg.base).hostname.replace(/^www\./, ''); } catch (_) { return 'kfz-zulassungsprofis.de'; } };

/** Property normalisieren: sc-domain:… bleibt, URL-Präfix bekommt den Schrägstrich am Ende, eine nackte Domain wird zur Domain-Property. */
function property(cfg) {
  const s = String((cfg && cfg.gsc && cfg.gsc.property) || '').trim();
  if (!s) return 'sc-domain:' + hostFromBase(cfg || {});
  if (/^sc-domain:/i.test(s)) return 'sc-domain:' + s.slice(10).trim().toLowerCase();
  if (/^https?:\/\//i.test(s)) { try { const u = new URL(s); return u.pathname === '/' && !u.search && !s.endsWith('/') ? s + '/' : s; } catch (_) { return s; } }
  return 'sc-domain:' + s.toLowerCase().replace(/\/+$/, '');
}
const propertyHost = p => { if (/^sc-domain:/.test(p)) return p.slice(10); try { return new URL(p).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

/**
 * Dienstkonto-Schlüssel lesen (Env-Inhalt hat Vorrang vor der Datei).
 * Fehlertexte sind feste Sätze – nie die Meldung des JSON-Parsers, denn die zitiert Teile der Eingabe.
 */
function creds(cfg) {
  const g = (cfg && cfg.gsc) || {}; const roh = String(g.credentialsJson || '').trim(); const datei = String(g.credentialsFile || '').trim();
  let text, quelle;
  if (roh) { quelle = 'GSC_CREDENTIALS_JSON'; text = roh.startsWith('{') ? roh : Buffer.from(roh.replace(/\s+/g, ''), 'base64').toString('utf8'); }
  else if (datei) {
    quelle = 'GSC_CREDENTIALS_FILE';
    try { text = fs.readFileSync(datei, 'utf8'); } catch (e) { return { ok: false, quelle, reason: e && e.code === 'ENOENT' ? 'Schlüsseldatei nicht gefunden (GSC_CREDENTIALS_FILE).' : 'Schlüsseldatei nicht lesbar (GSC_CREDENTIALS_FILE).' }; }
  } else return { ok: false, fehlt: true, reason: 'Kein Dienstkonto hinterlegt (GSC_CREDENTIALS_JSON bzw. GSC_CREDENTIALS_FILE fehlt).' };
  let j; try { j = JSON.parse(text.replace(/^﻿/, '')); } catch (_) { return { ok: false, quelle, reason: `Schlüssel ist kein gültiges JSON (${quelle}${roh ? ', erwartet: Dateiinhalt roh oder base64' : ''}).` }; }
  if (!j || typeof j !== 'object' || typeof j.client_email !== 'string' || typeof j.private_key !== 'string' || !j.client_email || !j.private_key) return { ok: false, quelle, reason: `JSON enthält kein Dienstkonto – client_email/private_key fehlen (${quelle}).` };
  const private_key = j.private_key.replace(/\\n/g, '\n');
  try { crypto.createPrivateKey(private_key); } catch (_) { return { ok: false, quelle, reason: `private_key im Schlüssel ist nicht lesbar (${quelle}).` }; }
  return { ok: true, quelle, json: { client_email: j.client_email, private_key } };
}
/** Nur ein gekürzter Hinweis auf das Dienstkonto: kein Name, die Projektkennung nur angeschnitten. */
function maskAccount(email) {
  const dom = String(email || '').split('@')[1] || ''; const [first, ...rest] = dom.split('.');
  return first ? `Dienstkonto vorhanden (…@${first.slice(0, 3)}…${rest.length ? '.' + rest.join('.') : ''})` : 'Dienstkonto vorhanden';
}
/** Zugangsstatus ohne Netz: prüft nur, ob ein verwendbarer Schlüssel hinterlegt ist. Nennt nie Schlüsselinhalte oder Pfade. */
function status(cfg) {
  const c = creds(cfg); const prop = property(cfg);
  if (c.fehlt) {
    const host = propertyHost(prop) || hostFromBase(cfg || {});
    return { connected: false, reason: c.reason, needed: [
      `Search-Console-Property für ${host}: Domain-Property (sc-domain:${host}, Bestätigung per DNS-TXT) oder URL-Präfix (https://${host}/)`,
      'Google-Cloud-Projekt mit aktivierter „Google Search Console API“',
      'Dienstkonto (Service-Account) in diesem Projekt mit JSON-Schlüssel',
      'E-Mail-Adresse des Dienstkontos in der Search Console unter Einstellungen → Nutzer und Berechtigungen hinzufügen (Eingeschränkt genügt)',
      'Inhalt der JSON-Datei als GSC_CREDENTIALS_JSON hinterlegen (roh oder base64); lokal alternativ GSC_CREDENTIALS_FILE=/pfad/zur.json. GSC_PROPERTY nur setzen, wenn die Property vom Standard abweicht.',
    ] };
  }
  if (!c.ok) return { connected: false, reason: c.reason };
  return { connected: true, account: maskAccount(c.json.client_email), property: prop };
}
/** Status für gsc-status.json NACH einem Abruf: bei Abruffehler „nicht verbunden“ mit Grund (stale:true) statt nur der Schlüsselprüfung. */
function statusAfterFetch(cfg, result) { return result && !result.connected && result.status ? result.status : status(cfg); }

const kurz = t => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 200);
/** Google-Fehlerantwort auf den eigentlichen Satz kürzen (error.message bzw. error_description), sonst die ersten 200 Zeichen. */
function fehlertext(t) {
  try { const j = JSON.parse(t); const m = j && (j.error_description || (j.error && (j.error.message || (typeof j.error === 'string' ? j.error : '')))); if (m) return kurz(m); } catch (_) { /* kein JSON */ }
  return kurz(t);
}
/**
 * Ein HTTP-Abruf mit Zeitlimit (Standard 30 s, gilt bis zum Ende des Antwortkörpers) und einem Wiederholungsversuch
 * bei Zeitüberschreitung, Netzfehler, HTTP 5xx und 429. Liefert { ok, status, json, text }.
 * opts: { timeoutMs, retries (Standard 1), retryDelayMs (Standard 1500) }
 */
async function abruf(fetchImpl, url, init, opts = {}, was = 'Abruf') {
  const f = fetchImpl || fetch; const timeoutMs = opts.timeoutMs > 0 ? opts.timeoutMs : TIMEOUT_MS;
  const retries = opts.retries == null ? 1 : Math.max(0, opts.retries); const warte = opts.retryDelayMs == null ? 1500 : opts.retryDelayMs;
  let letzter = 'unbekannter Fehler';
  for (let versuch = 0; versuch <= retries; versuch++) {
    if (versuch) await pause(warte);
    try {
      const r = await f(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      if (r.ok) { let json; try { json = await r.json(); } catch (e) { if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw e; letzter = `${was}: Antwort ist kein gültiges JSON`; continue; } return { ok: true, status: r.status, json, text: '' }; }
      const text = await r.text();
      if ((r.status >= 500 || r.status === 429) && versuch < retries) { letzter = `${was}: HTTP ${r.status}`; continue; }
      return { ok: false, status: r.status, json: null, text };
    } catch (e) {
      const zeit = e && (e.name === 'TimeoutError' || e.name === 'AbortError');
      letzter = zeit ? `${was}: Zeitüberschreitung nach ${Math.round(timeoutMs / 100) / 10} s` : `${was}: Netzfehler (${(e && ((e.cause && e.cause.code) || e.code)) || 'Verbindung fehlgeschlagen'})`;
    }
  }
  throw new Error(letzter + (retries ? ' – auch der Wiederholungsversuch ist gescheitert' : ''));
}
async function token(cfg, fetchImpl, opts) {
  const c = creds(cfg); if (!c.ok) throw new Error(c.reason);
  const now = Math.floor(Date.now() / 1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = b64({ alg: 'RS256', typ: 'JWT' }) + '.' + b64({ iss: c.json.client_email, scope: 'https://www.googleapis.com/auth/webmasters.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  let sig; try { sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), c.json.private_key).toString('base64url'); } catch (_) { throw new Error('Schlüssel des Dienstkontos ist nicht verwendbar (private_key, erwartet: RSA).'); }
  const r = await abruf(fetchImpl, 'https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` }, opts, 'Token-Abruf');
  if (!r.ok) throw new Error('Token-Fehler HTTP ' + r.status + ': ' + fehlertext(r.text) + ' – Schlüssel des Dienstkontos ungültig oder gelöscht, oder die Uhrzeit des Rechners ist falsch?');
  if (!r.json || !r.json.access_token) throw new Error('Token-Antwort ohne access_token.');
  return r.json.access_token;
}
const iso = d => d.toISOString().slice(0, 10);
function ranges(days, lagDays = 3) {
  const end = new Date(); end.setUTCDate(end.getUTCDate() - lagDays);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - days + 1);
  const pEnd = new Date(start); pEnd.setUTCDate(pEnd.getUTCDate() - 1);
  const pStart = new Date(pEnd); pStart.setUTCDate(pStart.getUTCDate() - days + 1);
  return { start: iso(start), end: iso(end), prevStart: iso(pStart), prevEnd: iso(pEnd) };
}
function hinweis(code, prop) {
  const host = propertyHost(prop) || 'beispiel.de';
  if (code === 401) return ' – Zugriffstoken abgelehnt: Schlüssel des Dienstkontos prüfen.';
  if (code === 403) return ' – Das Dienstkonto hat keinen Zugriff auf die Property: in der Search Console unter Einstellungen → Nutzer und Berechtigungen hinzufügen und prüfen, ob die „Google Search Console API“ im Cloud-Projekt aktiviert ist.';
  if (code === 404) return ` – Property nicht gefunden: GSC_PROPERTY muss exakt der Search-Console-Property entsprechen (Domain-Property: sc-domain:${host}, URL-Präfix-Property: https://${host}/ mit Schrägstrich am Ende).`;
  if (code === 429) return ' – Kontingent erschöpft, später erneut.';
  return '';
}
async function query(cfg, tok, body, fetchImpl, opts) {
  const prop = property(cfg);
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(prop)}/searchAnalytics/query`;
  const r = await abruf(fetchImpl, url, { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'web', dataState: 'final', ...body }) }, opts, 'Search-Console-Abfrage');
  if (!r.ok) throw new Error('GSC HTTP ' + r.status + ': ' + fehlertext(r.text) + hinweis(r.status, prop));
  return (r.json && r.json.rows) || [];
}
/** Verbindungs-/Berechtigungstest: Liste der Properties des Dienstkontos (sites.list) + Testabfrage. Wirft nie. */
async function verify(cfg, fetchImpl, opts) {
  const st = status(cfg); if (!st.connected) return { ok: false, ...st };
  try {
    const tok = await token(cfg, fetchImpl, opts);
    const r = await abruf(fetchImpl, 'https://www.googleapis.com/webmasters/v3/sites', { headers: { authorization: 'Bearer ' + tok } }, opts, 'sites.list');
    if (!r.ok) return { ok: false, reason: 'sites.list HTTP ' + r.status + ': ' + fehlertext(r.text) + (r.status === 403 ? ' – Ist die „Google Search Console API“ im Cloud-Projekt aktiviert?' : '') };
    const sites = ((r.json && r.json.siteEntry) || []).map(s => ({ siteUrl: s.siteUrl, permissionLevel: s.permissionLevel }));
    const prop = st.property; const mine = sites.find(s => s.siteUrl === prop);
    if (!mine) {
      // Gleiche Website, aber andere Property-Form freigegeben (Domain-Property statt URL-Präfix oder umgekehrt)?
      const andere = sites.find(s => propertyHost(s.siteUrl) && propertyHost(s.siteUrl) === propertyHost(prop));
      return { ok: false, reason: andere ? `Property ${prop} ist für das Dienstkonto nicht freigegeben, wohl aber ${andere.siteUrl} – GSC_PROPERTY auf genau diesen Wert setzen.` : `Property ${prop} ist für das Dienstkonto nicht freigegeben – E-Mail-Adresse des Dienstkontos in der Search Console als Nutzer hinzufügen.`, sites };
    }
    if (mine.permissionLevel === 'siteUnverifiedUser') return { ok: false, reason: 'Property ist für das Dienstkonto noch nicht bestätigt (siteUnverifiedUser) – Nutzer in der Search Console hinzufügen.', sites };
    const rg = ranges(7); const rows = await query(cfg, tok, { startDate: rg.start, endDate: rg.end, dimensions: ['date'], rowLimit: 10 }, fetchImpl, opts);
    return { ok: true, account: st.account, property: prop, permissionLevel: mine.permissionLevel, sampleDays: rows.length, sites };
  } catch (e) { return { ok: false, reason: String((e && e.message) || e) }; }
}
/**
 * Holt Kennzahlen für 7/30/90 Tage inkl. Vorperiode: Summen, Tagesverlauf, Top-Queries, Top-Pages.
 * Ergebnis ist rein aus Google-Daten (Quelle: "Google Search Console"), keine eigenen Schätzungen.
 * Wirft nie:
 *   • ohne Schlüssel            → { connected:false, status:{ connected:false, reason, needed? } }
 *   • Abruf fehlgeschlagen      → { connected:false, stale:true, status:{ connected:false, stale:true, reason, property, account } }
 *     (der Aufrufer lässt gsc.json dann unverändert – die Zahlen dort sind vom letzten erfolgreichen Abruf)
 *   • Erfolg                    → { connected:true, fetchedAt, source, property, lagDays, periods }
 * opts: { fetchImpl, days, timeoutMs, retries, retryDelayMs, budgetMs }
 */
async function fetchPerformance(cfg, opts = {}) {
  const st = status(cfg); if (!st.connected) return { connected: false, status: st };
  const fetchImpl = opts.fetchImpl; const t0 = Date.now(); const budget = opts.budgetMs > 0 ? opts.budgetMs : BUDGET_MS;
  try {
    const tok = await token(cfg, fetchImpl, opts); const out = { connected: true, fetchedAt: new Date().toISOString(), source: 'Google Search Console API', property: st.property, lagDays: 3, periods: {} };
    const q = body => { if (Date.now() - t0 > budget) throw new Error(`Search-Console-Abruf abgebrochen: Gesamtzeit von ${Math.round(budget / 1000)} s überschritten.`); return query(cfg, tok, body, fetchImpl, opts); };
    for (const days of (opts.days || [7, 30, 90])) {
      const r = ranges(days); const sum = rows => rows.reduce((a, x) => ({ clicks: a.clicks + x.clicks, impressions: a.impressions + x.impressions, posW: a.posW + x.position * x.impressions }), { clicks: 0, impressions: 0, posW: 0 });
      const cur = await q({ startDate: r.start, endDate: r.end, dimensions: ['date'], rowLimit: 500 });
      const prev = await q({ startDate: r.prevStart, endDate: r.prevEnd, dimensions: ['date'], rowLimit: 500 });
      const c = sum(cur), p = sum(prev);
      const agg = s => ({ clicks: s.clicks, impressions: s.impressions, ctr: s.impressions ? s.clicks / s.impressions : 0, position: s.impressions ? s.posW / s.impressions : 0 });
      const period = { range: r, current: agg(c), previous: agg(p), daily: cur.map(x => ({ date: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position })) };
      {
        const qCur = await q({ startDate: r.start, endDate: r.end, dimensions: ['query'], rowLimit: days === 7 ? 50 : 200 });
        const qPrev = days === 7 ? [] : await q({ startDate: r.prevStart, endDate: r.prevEnd, dimensions: ['query'], rowLimit: 200 });
        const qm = new Map(qPrev.map(x => [x.keys[0], x]));
        period.queries = qCur.map(x => { const pv = qm.get(x.keys[0]); return { query: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position, prevClicks: pv ? pv.clicks : 0, prevImpressions: pv ? pv.impressions : 0, prevPosition: pv ? pv.position : null }; });
        const qCurSet = new Set(qCur.map(x => x.keys[0]));
        for (const pv of qPrev) if (!qCurSet.has(pv.keys[0])) period.queries.push({ query: pv.keys[0], clicks: 0, impressions: 0, ctr: 0, position: 0, prevClicks: pv.clicks, prevImpressions: pv.impressions, prevPosition: pv.position, lost: true });
        const pagesCur = await q({ startDate: r.start, endDate: r.end, dimensions: ['page'], rowLimit: 300 });
        const pagesPrev = await q({ startDate: r.prevStart, endDate: r.prevEnd, dimensions: ['page'], rowLimit: 300 });
        const pm = new Map(pagesPrev.map(x => [x.keys[0], x]));
        period.pages = pagesCur.map(x => { const pv = pm.get(x.keys[0]); return { page: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position, prevClicks: pv ? pv.clicks : 0, prevImpressions: pv ? pv.impressions : 0, prevPosition: pv ? pv.position : null }; });
        const curSet = new Set(pagesCur.map(x => x.keys[0]));
        for (const pv of pagesPrev) if (!curSet.has(pv.keys[0])) period.pages.push({ page: pv.keys[0], clicks: 0, impressions: 0, ctr: 0, position: 0, prevClicks: pv.clicks, prevImpressions: pv.impressions, prevPosition: pv.position, lost: true });
        if (days !== 7) period.queryPages = (await q({ startDate: r.start, endDate: r.end, dimensions: ['query', 'page'], rowLimit: 500 })).map(x => ({ query: x.keys[0], page: x.keys[1], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
        if (days === 30) {
          period.devices = (await q({ startDate: r.start, endDate: r.end, dimensions: ['device'], rowLimit: 10 })).map(x => ({ device: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
          period.countries = (await q({ startDate: r.start, endDate: r.end, dimensions: ['country'], rowLimit: 10 })).map(x => ({ country: x.keys[0], clicks: x.clicks, impressions: x.impressions, ctr: x.ctr, position: x.position }));
        }
      }
      out.periods[days] = period;
    }
    return out;
  } catch (e) {
    const reason = String((e && e.message) || e).slice(0, 500);
    return { connected: false, stale: true, status: { connected: false, stale: true, reason, property: st.property, account: st.account } };
  }
}
// creds() wird bewusst nicht exportiert: Der Schlüssel verlässt dieses Modul nur als Signatur.
module.exports = { status, statusAfterFetch, fetchPerformance, ranges, verify, query, token, property, maskAccount, TIMEOUT_MS };
