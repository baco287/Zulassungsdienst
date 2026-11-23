'use strict';
// ─── Benachrichtigungen: Zusammenfassungen statt Einzelmeldungen ─────────────
// Standard: NUR Outbox (notifications.json) – kein Versand. Versand erst mit SEO_NOTIFY=1, einem Empfänger
// (SEO_NOTIFY_TO) und dem Postfach-Zugang (SMTP_USER, SMTP_PASSWORD bzw. SMTP_PASS; SMTP_HOST/SMTP_PORT optional).
// Versand über lib/smtp.js (keine Zusatzpakete). Absender ist das angemeldete Postfach (SMTP_USER).
// Regeln:
//   • SOFORT nur bei wirklich kritischen Fehlern (Kernseite nicht erreichbar, noindex auf Kernseite …), jeder
//     kritische Befund höchstens einmal (notified-Markierung nach echtem Versand), Wiederholung erst nach erneutem Auftreten.
//   • TÄGLICH eine Zusammenfassung – aber nur, wenn seit der letzten Zusammenfassung etwas Wichtiges passiert ist
//     (neue kritische/hohe Punkte, verschärfte Punkte, wieder aufgetretene Punkte oder behobene Punkte). Sonst keine Mail.
//   • VERSCHÄRFT: Ein bekannter Punkt, der beim Abschluss der letzten Zusammenfassung derselben Art noch nicht
//     kritisch/hoch war und es jetzt ist (z. B. „Aktion läuft aus“ mittel → hoch), steht als eigene Zeile darin.
//     Festgehalten in store.state.wichtigGemeldet = { tag, woche, monat } (IDs, die beim Abschluss kritisch/hoch waren;
//     bleiben, solange der Punkt offen ist – ein Pendeln hoch ↔ mittel meldet also nicht jedes Mal neu).
//   • WÖCHENTLICH und MONATLICH immer eine Zusammenfassung: Stand, neue wichtige Punkte, Erfolge, Top-3-Maßnahmen,
//     Google-Kennzahlen (falls verbunden). Niedrige/mittlere Einzelpunkte werden nie gemailt – nur im SEO Center.
// Zeitfenster je Meldungsart: store.state.lastDigest = { tag, woche, monat } (ISO-Zeitpunkte). Die Wochenmail deckt
// die Zeit seit der letzten Wochenmail ab, nicht nur seit der letzten Tagesmail. Das frühere Format (ein einzelner
// ISO-String) wird weiter gelesen. Ein Fenster rückt vor, wenn die Zusammenfassung versendet wurde oder gar kein
// Versand eingerichtet ist (nur Outbox); nach einem fehlgeschlagenen Versand bleibt es stehen, damit nichts verloren geht.
// Aufruf:  items = build(store, cfg, kind, extra);  res = await send(items, cfg, store);  writeOutbox(dataDir, items)
// Mails enthalten nie Zugangsdaten: Der Text besteht nur aus Befunden, Zahlen und der Adresse des SEO Centers;
// Benutzername und Passwörter (SEO Center, Postfach, Google-Schlüssel) werden an keiner Stelle eingesetzt.
const fs = require('fs');
const path = require('path');
const smtp = require('./smtp');
const { umzug } = require('./gsc-analyze');
const { ortText } = require('./actions');
const { ortsdatum } = require('./report');

const STANDARD_HOST = 'w0216162.kasserver.com'; // Mailserver des Webspace-Vertrags, wie scripts/mail-zugang.mjs
const STANDARD_PORT = 587;                      // STARTTLS; 465 = TLS von Anfang an
const ABSENDER_NAME = 'KFZ-Zulassungsprofis SEO-Autopilot';
const PRIO = { kritisch: 'sofort', hoch: 'zusammenfassung', mittel: 'seo-center', niedrig: 'seo-center', info: 'seo-center' };
const FELD = { daily: 'tag', weekly: 'woche', monthly: 'monat' };
const TAGE = { daily: 1, weekly: 7, monthly: 30 };
const KANAL = { daily: 'tageszusammenfassung', weekly: 'wochenzusammenfassung', monthly: 'monatszusammenfassung' };
const NAME = { daily: 'Tageszusammenfassung', weekly: 'Wochenzusammenfassung', monthly: 'Monatszusammenfassung' };

/** Datum TT.MM.JJJJ: Zeitpunkte (mit Uhrzeit) nach deutscher Zeit, reine Kalenderdaten (z. B. Google-Zeiträume) unverändert. */
const de = v => {
  let s = String(v);
  if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !isNaN(Date.parse(s))) s = ortsdatum(s);
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : s;
};
const isoOr = v => (typeof v === 'string' && v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const siteName = cfg => { try { return new URL(cfg.base).hostname.replace(/^www\./, ''); } catch (_) { return 'kfz-zulassungsprofis.de'; } };
/** Adresse des SEO Centers für die Fußzeile – eventuell eingebettete Zugangsdaten (https://nutzer:pw@…) werden entfernt. */
function centerUrl(cfg) {
  const roh = (cfg && cfg.center && cfg.center.url) || `https://${siteName(cfg || {})}/seo/`;
  try { const u = new URL(roh); u.username = ''; u.password = ''; return u.toString(); } catch (_) { return `https://${siteName(cfg || {})}/seo/`; }
}
const ohneAdressen = t => String(t == null ? '' : t).replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '‹Adresse›').replace(/\s+/g, ' ').trim().slice(0, 300);

/**
 * Eine Zeile je Befund. Der Ort wird nur angehängt, wenn er nicht schon im Titel steht; Sammelbefunde (key „alle:…“)
 * nennen ihre betroffenen Seiten statt der Startseite, die Seitenzahl steht nicht doppelt da.
 */
function line(i) {
  const title = String(i.title || ''); const ort = i.url ? ortText(i) : (i.file || ''); const erster = ort.split(', ')[0];
  const hat = !ort || (erster === '/' ? /(^|[\s:(„"])\/($|[\s,.;:)“"])/.test(title) : title.includes(erster));
  return `• [${i.severity}] ${title}${hat ? '' : ` – ${ort}`}${i.count > 1 && !title.includes(`${i.count} Seiten`) ? ` (${i.count} Seiten)` : ''}`;
}
function actionsText(all, cfg, n = 3) {
  let t = []; try { t = require('./actions').topActions(all, cfg, n) || []; } catch (_) { t = []; }
  if (!t.length) return '–';
  return t.map(a => `${a.rank}. ${a.action}\n   Beispiel: ${a.example}${a.urls && a.urls.length ? ` (${a.urls.slice(0, 3).join(', ')})` : ''}`).join('\n');
}
/** lastDigest in das neue Format bringen: { tag, woche, monat }. Alter String = letzte Zusammenfassung irgendeiner Art. */
function normDigest(v) {
  if (typeof v === 'string') return { tag: isoOr(v), woche: null, monat: null };
  const o = v && typeof v === 'object' ? v : {};
  return { tag: isoOr(o.tag), woche: isoOr(o.woche), monat: isoOr(o.monat) };
}
/** Beginn des Zeitfensters für eine Meldungsart (ISO). Fehlt der Stand: 1 / 7 / 30 Tage zurück. */
function sinceFor(lastDigest, kind, now = Date.now()) {
  const k = FELD[kind] ? kind : 'daily'; const standard = new Date(now - TAGE[k] * 86400e3).toISOString();
  if (typeof lastDigest === 'string') {
    // Altes Format: Zeitpunkt der letzten Zusammenfassung gleich welcher Art. Für die Tagesmail ist das genau das Fenster;
    // für Woche/Monat ist nur bekannt, dass die letzte nicht später war – also das volle Fenster, bei längerer Pause mehr.
    const alt = isoOr(lastDigest); if (!alt) return standard;
    return k === 'daily' ? alt : (alt < standard ? alt : standard);
  }
  return normDigest(lastDigest)[FELD[k]] || standard;
}
/** Kritischer Befund braucht (wieder) eine Sofortmeldung: noch nie gemeldet oder seit der Meldung erneut aufgetreten. */
const needsNotify = i => !i.notified || !!(i.reopened_at && i.notified.at && i.notified.at < i.reopened_at);
const wichtig = i => i.severity === 'kritisch' || i.severity === 'hoch';
/** IDs, die beim Abschluss der letzten Zusammenfassung dieser Art kritisch/hoch waren; null = noch nie festgehalten. */
function bekanntWichtig(state, feld) {
  const w = state && state.wichtigGemeldet; const l = w && typeof w === 'object' && !Array.isArray(w) ? w[feld] : null;
  return Array.isArray(l) ? new Set(l) : null;
}

function gscText(g, cfg, now) {
  if (g && g.connected && g.periods && g.periods[7]) {
    const p = g.periods[7]; const u = umzug(cfg, now); const zahl = v => (typeof v === 'number' && isFinite(v) ? v : 0);
    // Scheitert ein Abruf, bleibt der gespeicherte Stand erhalten – dann darauf hinweisen, dass die Zahlen älter sind
    const abruf = isoOr(g.fetchedAt); const veraltet = !!abruf && now - Date.parse(abruf) > 36 * 3600e3;
    return `Google Search Console (7 Tage, ${de(p.range.start)}–${de(p.range.end)}): ${zahl(p.current.clicks)} Klicks (vorher ${zahl(p.previous.clicks)}), ${zahl(p.current.impressions)} Impressionen (vorher ${zahl(p.previous.impressions)}), Ø Position ${zahl(p.current.position).toFixed(1)}`
      + (veraltet ? `\nHinweis: Stand vom ${de(abruf)} – der letzte Abruf bei Google ist fehlgeschlagen, die Zahlen sind nicht aktuell.` : '')
      + (u.aktiv ? `\nHinweis: Die Domain ist erst seit ${de(u.liveSeit)} live. Bis ${de(u.bis)} ist der Vergleich mit „vorher“ ein Umzugseffekt und kein echter Anstieg.` : '');
  }
  if (g && g.stale) return 'Google Search Console: Abruf fehlgeschlagen – im SEO Center stehen die Zahlen des letzten erfolgreichen Abrufs.' + (g.status && g.status.reason ? `\nGrund: ${ohneAdressen(g.status.reason)}` : '');
  return 'Google Search Console: nicht verbunden – Klicks, Impressionen und Positionen sind unbekannt.';
}

/**
 * Meldungen eines Laufs zusammenstellen (sendet nichts, ändert nichts).
 * @param store IssueStore (open(), all(), state.lastDigest)
 * @param kind  'daily' | 'weekly' | 'monthly'
 * @param extra { score?, gsc?, now? }
 * @returns {Array<{channel, subject, body, ids:string[], skip?:true}>}
 *   channel: 'sofort' | 'tageszusammenfassung' | 'wochenzusammenfassung' | 'monatszusammenfassung'
 *   skip:true = wird nicht versendet (Tageszusammenfassung ohne Neuigkeiten), steht nur in der Outbox.
 */
function build(store, cfg, kind, extra = {}) {
  cfg = cfg || {}; const k = FELD[kind] ? kind : 'daily';
  const now = extra.now != null ? new Date(extra.now).getTime() : Date.now();
  const open = store.open(); const all = store.all(); const items = [];
  const site = siteName(cfg);
  const fuss = `Details, Verlauf und Freigaben im SEO Center: ${centerUrl(cfg)} (gleiche Anmeldung wie beim Analytics-Dashboard). Der Autopilot hat nichts an der Website geändert.`;
  const sinceIso = sinceFor(store.state && store.state.lastDigest, k, now);
  const critical = open.filter(i => i.severity === 'kritisch' && needsNotify(i));
  if (critical.length) {
    const liste = critical.slice(0, 20).map(i => `${line(i)}${i.detail ? '\n  ' + i.detail : ''}${i.suggestion ? '\n  → ' + i.suggestion : ''}`).join('\n\n');
    items.push({ channel: 'sofort', subject: `[SEO-Autopilot] ${site} – ${critical.length === 1 ? '1 kritisches Problem' : critical.length + ' kritische Probleme'}`,
      body: `${liste}${critical.length > 20 ? `\n\n… und ${critical.length - 20} weitere kritische Punkte im SEO Center.` : ''}\n\nDiese Meldung kommt je Problem nur einmal; die Entwarnung steht in der nächsten Zusammenfassung.\n\n${fuss}`, ids: critical.map(i => i.id) });
  }
  // „seit“ heißt: NACH dem Abschluss der letzten Zusammenfassung – was im selben Augenblick gespeichert wurde, stand schon darin
  const newImportant = open.filter(i => wichtig(i) && i.first_seen > sinceIso);
  const reopened = open.filter(i => i.reopened_at && i.reopened_at > sinceIso && i.severity !== 'info');
  // Verschärft: schon vorher offen, beim letzten Abschluss dieser Art aber noch nicht kritisch/hoch (neu bzw. wieder
  // aufgetreten zählt dort). Ohne festgehaltenen Stand (erste Zusammenfassung dieser Art) bleibt die Liste leer.
  const bekannt = bekanntWichtig(store.state, FELD[k]);
  const escalated = bekannt ? open.filter(i => wichtig(i) && !(i.first_seen > sinceIso) && !(i.reopened_at && i.reopened_at > sinceIso) && !bekannt.has(i.id)) : [];
  const resolved = all.filter(i => i.status === 'behoben' && i.resolved_at > sinceIso && i.severity !== 'info');
  const zahl = s => open.filter(i => i.severity === s).length;
  const counts = `Stand: ${open.filter(i => i.severity !== 'info').length} offene Punkte (kritisch ${zahl('kritisch')}, hoch ${zahl('hoch')}, mittel ${zahl('mittel')}, niedrig ${zahl('niedrig')})${extra.score != null ? ` · SEO-Status ${extra.score}/100 (eigene Berechnung)` : ''}`;
  const sections = [counts];
  sections.push(`Neue wichtige Probleme seit ${de(sinceIso)}: ${newImportant.length}` + (newImportant.length ? '\n' + newImportant.slice(0, 15).map(line).join('\n') + (newImportant.length > 15 ? `\n… und ${newImportant.length - 15} weitere` : '') : ''));
  if (escalated.length) sections.push(`Verschärft (jetzt kritisch oder hoch): ${escalated.length}\n` + escalated.slice(0, 15).map(line).join('\n') + (escalated.length > 15 ? `\n… und ${escalated.length - 15} weitere` : ''));
  if (reopened.length) sections.push(`Wieder aufgetreten: ${reopened.length}\n` + reopened.slice(0, 10).map(line).join('\n'));
  sections.push(`Erfolge (behoben): ${resolved.length}` + (resolved.length ? '\n' + resolved.slice(0, 15).map(line).join('\n') + (resolved.length > 15 ? `\n… und ${resolved.length - 15} weitere` : '') : ''));
  sections.push('Die drei wichtigsten Maßnahmen:\n' + actionsText(all, cfg, 3));
  sections.push(gscText(extra.gsc, cfg, now));
  sections.push(fuss);
  const body = sections.join('\n\n');
  const zusammen = `${newImportant.length} neu wichtig${escalated.length ? `, ${escalated.length} verschärft` : ''}, ${resolved.length} behoben`;
  if (k === 'daily') {
    if (newImportant.length || escalated.length || reopened.length || resolved.length) items.push({ channel: KANAL.daily, subject: `[SEO-Autopilot] ${site} – ${NAME.daily}: ${zusammen}`, body, ids: [] });
    else items.push({ channel: KANAL.daily, subject: '(keine Mail – nichts Wichtiges seit der letzten Zusammenfassung)', body: counts, ids: [], skip: true });
  } else items.push({ channel: KANAL[k], subject: `[SEO-Autopilot] ${site} – ${NAME[k]}: ${zusammen}`, body, ids: [] });
  return items;
}

/**
 * Meldungen an die Outbox (notifications.json, letzte 200) anhängen. NACH send() aufrufen: dann steht bei
 * versendeten Meldungen sent:true, bei fehlgeschlagenen der Fehlertext (ohne Adressen). Gibt den Dateipfad zurück.
 */
function writeOutbox(dataDir, items) {
  const f = path.join(dataDir, 'notifications.json'); let prev = [];
  try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (Array.isArray(j)) prev = j; } catch (_) { /* fehlt oder beschädigt → neu beginnen */ }
  const now = new Date().toISOString();
  for (const it of items || []) if (it) prev.push({ at: now, ...it, sent: it.sent === true, ids: Array.isArray(it.ids) ? it.ids : [] });
  fs.mkdirSync(dataDir, { recursive: true });
  const tmp = `${f}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(prev.slice(-200), null, 1)); fs.renameSync(tmp, f);
  return f;
}

/** Versandweg aus Konfiguration und Umgebung. { ok:false, reason } = kein Versand (nur Outbox). */
function versandPlan(cfg, env) {
  const n = (cfg && cfg.notify) || {};
  if (!n.enabled) return { ok: false, reason: 'SEO_NOTIFY nicht gesetzt – nur Outbox' };
  const empf = smtp.parseAddresses(n.to);
  if (!empf.valid.length && !empf.invalid.length) return { ok: false, reason: 'kein Empfänger hinterlegt (SEO_NOTIFY_TO) – nur Outbox' };
  if (empf.invalid.length) return { ok: false, reason: 'Empfängeradresse ungültig (SEO_NOTIFY_TO) – nur Outbox' };
  const user = String(env.SMTP_USER || '').trim(); const pass = String(env.SMTP_PASSWORD || env.SMTP_PASS || '');
  if (!user || !pass) return { ok: false, reason: 'SMTP-Zugang fehlt (SMTP_USER und SMTP_PASSWORD) – nur Outbox' };
  const portRoh = String(env.SMTP_PORT || '').trim(); const port = portRoh ? Number(portRoh) : STANDARD_PORT;
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, reason: 'SMTP_PORT ist keine gültige Portnummer – nur Outbox' };
  // Der Mailserver nimmt nach der Anmeldung nur eigene Adressen als Absender an: also das angemeldete Postfach.
  const from = smtp.isAddress(user) ? user : (smtp.isAddress(n.from) ? n.from : '');
  if (!from) return { ok: false, reason: 'SMTP_USER ist keine E-Mail-Adresse und kann nicht Absender sein – nur Outbox' };
  return { ok: true, host: String(env.SMTP_HOST || '').trim() || STANDARD_HOST, port, user, pass, from, to: empf.valid };
}
function markNotified(store, ids, channel) {
  if (typeof store.markNotified === 'function') return store.markNotified(ids, channel);
  const now = new Date().toISOString(); for (const id of ids) if (store.state.issues[id]) store.state.issues[id].notified = { at: now, channel };
  store.save();
}
/**
 * Zeitfenster vorrücken: Tagesmail → tag; Wochen-/Monatsmail → eigenes Feld und tag (die Tagesmail wiederholt deren Inhalt nicht).
 * Dazu je Feld festhalten, welche offenen Punkte jetzt kritisch/hoch sind (store.state.wichtigGemeldet) – Grundlage für „Verschärft“.
 * Frühere Einträge bleiben, solange der Punkt offen ist; behobene fallen heraus (tritt er wieder auf, zählt er als wieder aufgetreten).
 */
function abschliessen(store, items) {
  if (!store || !store.state) return;
  const felder = new Set();
  for (const it of items) { if (it.channel === KANAL.daily) felder.add('tag'); if (it.channel === KANAL.weekly) { felder.add('woche'); felder.add('tag'); } if (it.channel === KANAL.monthly) { felder.add('monat'); felder.add('tag'); } }
  if (!felder.size) return;
  const d = normDigest(store.state.lastDigest); const now = new Date().toISOString(); for (const f of felder) d[f] = now;
  store.state.lastDigest = d;
  const offen = typeof store.open === 'function' ? store.open() : Object.values(store.state.issues || {}).filter(i => i && i.status === 'offen');
  const offenIds = new Set(offen.map(i => i.id)); const jetzt = offen.filter(wichtig).map(i => i.id);
  const alt = store.state.wichtigGemeldet && typeof store.state.wichtigGemeldet === 'object' && !Array.isArray(store.state.wichtigGemeldet) ? store.state.wichtigGemeldet : {};
  const w = { ...alt }; for (const f of felder) w[f] = [...new Set([...(Array.isArray(alt[f]) ? alt[f] : []).filter(id => offenIds.has(id)), ...jetzt])];
  store.state.wichtigGemeldet = w; store.save();
}

/**
 * Meldungen versenden. Wirft NIE – Fehler stehen in der Rückgabe und am Eintrag.
 * Setzt je Eintrag it.sent (true/false) und bei Fehlern it.error; markiert kritische Befunde nach echtem Versand als
 * gemeldet und rückt die Zeitfenster vor (store.state.lastDigest). Danach writeOutbox(dataDir, items) aufrufen.
 * @param opts nur für Tests: { env, smtp: Optionen für lib/smtp.js (z. B. host, port, ohneTls), transport }
 * @returns {Promise<{sent:number, failed:number, reason?:string}>} reason enthält nie Adressen oder Zugangsdaten
 */
async function send(items, cfg, store, opts = {}) {
  const res = { sent: 0, failed: 0 };
  try {
    const toSend = (Array.isArray(items) ? items : []).filter(i => i && !i.skip);
    if (!toSend.length) return { ...res, reason: 'nichts zu senden' };
    const env = opts.env || process.env; const plan = versandPlan(cfg, env);
    if (!plan.ok) { abschliessen(store, toSend); return { ...res, reason: plan.reason }; }
    const transport = opts.transport || smtp.send; const fertig = []; const hinweise = []; let abgelehnt = 0;
    for (const it of toSend) {
      try {
        const r = await transport({ host: plan.host, port: plan.port, user: plan.user, pass: plan.pass, from: { name: ABSENDER_NAME, address: plan.from }, to: plan.to, subject: it.subject, text: it.body, ...(opts.smtp || {}) });
        it.sent = true; delete it.error; res.sent++; fertig.push(it);
        if (r && Array.isArray(r.rejected)) abgelehnt += r.rejected.length;
      } catch (e) {
        it.sent = false; it.error = ohneAdressen(String((e && e.message) || e).split(plan.pass).join('***')); res.failed++;
        if (!hinweise.length) hinweise.push('Versand fehlgeschlagen: ' + it.error);
        if (!e || e.phase !== 'versand') break; // Verbindung/Anmeldung gescheitert: weitere Versuche wären sinnlos
        continue;
      }
      // Buchführung getrennt vom Versand: ein Fehler hier macht die Mail nicht ungesendet
      if (it.ids && it.ids.length) { try { markNotified(store, it.ids, it.channel); } catch (_) { hinweise.push('Meldestatus konnte nicht gespeichert werden'); } }
    }
    try { abschliessen(store, fertig); } catch (_) { hinweise.push('Zeitfenster konnte nicht gespeichert werden'); }
    if (abgelehnt) hinweise.push(`${abgelehnt} Empfänger vom Mailserver abgelehnt`);
    if (hinweise.length) res.reason = hinweise.join('; ');
    return res;
  } catch (e) {
    return { ...res, reason: 'Benachrichtigung fehlgeschlagen: ' + ohneAdressen((e && e.message) || e) };
  }
}
module.exports = { build, writeOutbox, send, sinceFor, PRIO, STANDARD_HOST, STANDARD_PORT, ABSENDER_NAME };
