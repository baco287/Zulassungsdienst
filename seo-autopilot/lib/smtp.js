'use strict';
// ─── Kleiner SMTP-Client ohne Zusatzpakete (node:net / node:tls) ─────────────
// Gleiche Abfolge wie das Kontaktformular der Website (public/api/auftrag.php, smtpSitzung):
//   Port 465: TLS von Anfang an. Sonst: 220 → EHLO → STARTTLS → TLS → EHLO.
//   AUTH LOGIN → MAIL FROM → RCPT TO (je Empfänger) → DATA → Nachricht → "." → QUIT.
// Die Anmeldung läuft NIE unverschlüsselt. Einzige Ausnahme ist die Funktionsoption `ohneTls`
// für Tests gegen einen lokalen Fake-Server – sie lässt sich bewusst nicht per Umgebungsvariable setzen.
// Fehler kommen als SmtpError mit dem Namen des Schritts; Passwort und Anmeldedaten stehen nie im Text.
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');

const TIMEOUT_MS = 20000; // je Schritt
const ADDR = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;
const b64 = s => Buffer.from(String(s), 'utf8').toString('base64');
const sek = ms => Math.round(ms / 100) / 10;

class SmtpError extends Error {
  constructor(schritt, text, extra = {}) { super(`SMTP ${schritt}: ${text}`); this.name = 'SmtpError'; this.schritt = schritt; Object.assign(this, extra); }
}

// ── Adressen ────────────────────────────────────────────────────────────────
const isAddress = a => typeof a === 'string' && a.length <= 254 && ADDR.test(a);
/** "a@x.de, b@y.de; c@z.de" oder Array → eindeutige Liste. Ungültige Einträge landen in `invalid` (ohne sie auszugeben). */
function parseAddresses(v) {
  const roh = (Array.isArray(v) ? v : String(v == null ? '' : v).split(/[,;\s]+/)).map(x => String(x).trim()).filter(Boolean);
  const valid = [], invalid = []; const seen = new Set();
  for (const a of roh) { if (!isAddress(a)) { invalid.push(a); continue; } const k = a.toLowerCase(); if (!seen.has(k)) { seen.add(k); valid.push(a); } }
  return { valid, invalid };
}

// ── Nachricht bauen ─────────────────────────────────────────────────────────
const clean = s => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim(); // CR/LF/Steuerzeichen raus (Header-Injection)
/** RFC 2047 (B-Kodierung, UTF-8): mehrere encoded-words, Zeichen werden nie zerteilt, jede Zeile ≤ 76 Zeichen. */
function encodeWords(text) {
  const teile = []; let cur = '';
  for (const ch of text) { if (cur && Buffer.byteLength(cur + ch) > 39) { teile.push(cur); cur = ''; } cur += ch; }
  if (cur) teile.push(cur);
  return teile.map(t => `=?UTF-8?B?${b64(t)}?=`).join('\r\n ');
}
/** Kopfzeilenwert: reines ASCII bleibt lesbar (an Leerzeichen umbrochen), alles andere wird RFC-2047-kodiert. */
function encodeHeader(value, nameLen = 9) {
  const v = clean(value);
  if (!/^[\x20-\x7e]*$/.test(v)) return encodeWords(v);
  const zeilen = []; let cur = ''; let max = 78 - nameLen;
  for (const w of v.split(' ')) { if (cur && (cur + ' ' + w).length > max) { zeilen.push(cur); cur = w; max = 77; } else cur = cur ? cur + ' ' + w : w; }
  zeilen.push(cur); return zeilen.join('\r\n ');
}
function formatFrom(from) {
  const f = typeof from === 'string' ? { address: from } : (from || {}); const name = clean(f.name);
  if (!name) return `<${f.address}>`;
  const n = /^[\x20-\x7e]*$/.test(name) ? `"${name.replace(/(["\\])/g, '\\$1')}"` : encodeWords(name);
  return (n + ' <' + f.address + '>').length > 70 ? `${n}\r\n <${f.address}>` : `${n} <${f.address}>`;
}
/** Vollständige Nachricht (Kopf + Text): text/plain UTF-8, base64 mit 76 Zeichen je Zeile, Zeilenenden CRLF. */
function buildMessage({ from, to, subject, text, date = new Date(), messageId }) {
  const f = typeof from === 'string' ? { address: from } : from;
  const id = messageId || `<${Date.now().toString(36)}.${crypto.randomBytes(9).toString('hex')}@${f.address.split('@')[1]}>`;
  const body = Buffer.from(String(text == null ? '' : text).replace(/\r\n|\r|\n/g, '\r\n'), 'utf8').toString('base64').replace(/.{76}/g, '$&\r\n').replace(/\r\n$/, '');
  return [
    'Date: ' + date.toUTCString().replace(/GMT$/, '+0000'),
    'From: ' + formatFrom(f),
    'To: ' + [].concat(to).join(',\r\n '),
    'Subject: ' + encodeHeader(subject, 9),
    'Message-ID: ' + id,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    'Auto-Submitted: auto-generated',
    '', body, '',
  ].join('\r\n');
}
/** Zeilenenden auf CRLF bringen und einen Punkt am Zeilenanfang verdoppeln (RFC 5321 §4.5.2); endet immer mit CRLF. */
function dotStuff(message) {
  let s = String(message).replace(/\r\n|\r|\n/g, '\r\n').replace(/(^|\r\n)\./g, '$1..');
  if (!s.endsWith('\r\n')) s += '\r\n';
  return s;
}

// ── Verbindung und Antworten ────────────────────────────────────────────────
function netzFehler(e) {
  const code = (e && e.code) || (e && e.errors && e.errors[0] && e.errors[0].code) || '';
  const text = { ECONNREFUSED: 'Server lehnt die Verbindung ab', ENOTFOUND: 'Servername nicht auflösbar', EAI_AGAIN: 'Servername nicht auflösbar', ECONNRESET: 'Verbindung zurückgesetzt', ETIMEDOUT: 'Zeitüberschreitung', EHOSTUNREACH: 'Server nicht erreichbar', ENETUNREACH: 'Netz nicht erreichbar' }[code];
  if (text) return `${text} (${code})`;
  if (/CERT|SELF_SIGNED|ALTNAME|UNABLE_TO_VERIFY/.test(code)) return `Zertifikat des Servers nicht vertrauenswürdig (${code})`;
  return [code, e && e.message].filter(Boolean).join(' ') || 'unbekannter Fehler';
}
/** Liest zeilenweise mit; eine Antwort ist vollständig, sobald eine Zeile mit "NNN " (ohne Bindestrich) kommt. */
class Sitzung {
  constructor(socket, timeoutMs) { this.timeoutMs = timeoutMs; this.warten = null; this.binde(socket); }
  binde(socket) {
    this.socket = socket; this.buf = ''; this.zeilen = []; this.fehler = null;
    this.onData = d => {
      this.buf += d.toString('utf8'); let i;
      while ((i = this.buf.indexOf('\n')) >= 0) { this.zeilen.push(this.buf.slice(0, i).replace(/\r$/, '')); this.buf = this.buf.slice(i + 1); }
      if (this.buf.length > 65536 || this.zeilen.length > 500) this.fehler = 'Antwort des Servers zu lang';
      this.pruefe();
    };
    this.onError = e => { this.fehler = this.fehler || netzFehler(e); this.pruefe(); };
    this.onClose = () => { this.fehler = this.fehler || 'Verbindung vom Server geschlossen'; this.pruefe(); };
    socket.on('data', this.onData); socket.on('error', this.onError); socket.on('close', this.onClose);
  }
  /** Vor dem TLS-Aufbau: Zuhörer lösen und alles bis dahin Gelesene verwerfen (kein Klartext-Rest in der TLS-Sitzung). */
  loese() { const s = this.socket; s.removeListener('data', this.onData); s.removeListener('error', this.onError); s.removeListener('close', this.onClose); this.buf = ''; this.zeilen = []; }
  nimmAntwort() {
    const k = this.zeilen.findIndex(z => /^\d{3}(?: |$)/.test(z)); if (k < 0) return null;
    const teil = this.zeilen.splice(0, k + 1);
    return { code: Number(teil[k].slice(0, 3)), text: teil.join(' ').replace(/\s+/g, ' ').trim().slice(0, 300) };
  }
  pruefe() {
    const w = this.warten; if (!w) return;
    const a = this.nimmAntwort();
    if (a) w.fertig(null, a); else if (this.fehler) w.fertig(new SmtpError(w.schritt, this.fehler));
  }
  lies(schritt, ms = this.timeoutMs) {
    return new Promise((resolve, reject) => {
      const w = { schritt, fertig: (err, a) => { clearTimeout(t); if (this.warten === w) this.warten = null; if (err) reject(err); else resolve(a); } };
      const t = setTimeout(() => w.fertig(new SmtpError(schritt, `keine Antwort nach ${sek(ms)} s (Zeitüberschreitung)`, { timeout: true })), ms);
      this.warten = w;
      this.pruefe();
    });
  }
  /** Befehl senden (null = nur lesen) und Antwort prüfen. erwartet=null: jede vollständige Antwort zurückgeben. */
  async befehl(zeile, erwartet, schritt, ms) {
    if (zeile != null) this.socket.write(zeile + '\r\n');
    const a = await this.lies(schritt, ms);
    if (erwartet && !erwartet.includes(a.code)) throw new SmtpError(schritt, a.text || 'unerwartete Antwort', { code: a.code });
    return a;
  }
}
function verbinde({ host, port, direktTls, tlsOpts, timeoutMs }) {
  return new Promise((resolve, reject) => {
    const socket = direktTls ? tls.connect({ host, port, servername: net.isIP(host) ? undefined : host, ...tlsOpts }) : net.connect({ host, port });
    const ende = (err) => { clearTimeout(t); socket.removeListener('error', onErr); if (err) { socket.destroy(); reject(err); } else resolve(socket); };
    const onErr = e => ende(new SmtpError('Verbindung', netzFehler(e)));
    const t = setTimeout(() => ende(new SmtpError('Verbindung', `keine Verbindung nach ${sek(timeoutMs)} s (Zeitüberschreitung)`, { timeout: true })), timeoutMs);
    socket.once('error', onErr); socket.once(direktTls ? 'secureConnect' : 'connect', () => ende(null));
  });
}
function aufTls(plain, host, tlsOpts, timeoutMs) {
  return new Promise((resolve, reject) => {
    // host wird mitgegeben, damit das Zertifikat gegen den Servernamen geprüft wird (nicht gegen „localhost“)
    const s = tls.connect({ socket: plain, host, servername: net.isIP(host) ? undefined : host, ...tlsOpts });
    const ende = (err) => { clearTimeout(t); s.removeListener('error', onErr); if (err) { s.destroy(); reject(err); } else resolve(s); };
    const onErr = e => ende(new SmtpError('STARTTLS', 'TLS-Aufbau fehlgeschlagen: ' + netzFehler(e)));
    const t = setTimeout(() => ende(new SmtpError('STARTTLS', `TLS-Aufbau ohne Antwort nach ${sek(timeoutMs)} s (Zeitüberschreitung)`, { timeout: true })), timeoutMs);
    s.once('error', onErr); s.once('secureConnect', () => ende(null));
  });
}

/**
 * Eine Nachricht einliefern.
 * @param {object} o
 *   host, port (Standard 587; 465 = TLS von Anfang an), user, pass,
 *   secure: true/false erzwingt TLS von Anfang an bzw. STARTTLS unabhängig vom Port (Standard: nur bei Port 465),
 *   from: 'a@b.de' | { name, address }, to: 'a@b.de, c@d.de' | [..],
 *   subject, text  (oder raw: fertige RFC-5322-Nachricht),
 *   timeoutMs (Standard 20000, je Schritt), ehlo (Standard: Domain des Absenders),
 *   tls: zusätzliche Optionen für tls.connect (z. B. ca),
 *   ohneTls: true → KEIN TLS (nur für Tests gegen einen lokalen Fake-Server; wird für andere Hosts als localhost abgelehnt).
 * @returns {Promise<{ok:true, accepted:string[], rejected:{address,code,response}[], response:string, messageId:string|null, tls:boolean}>}
 * @throws {SmtpError} mit .schritt, ggf. .code (SMTP-Code) und .phase ('eingabe' | 'verbindung' | 'anmeldung' | 'versand')
 */
async function send(o = {}) {
  const host = String(o.host || '').trim(); const port = o.port == null || o.port === '' ? 587 : Number(o.port);
  const user = String(o.user || ''); const pass = String(o.pass || '');
  const from = typeof o.from === 'string' ? { address: o.from.trim() } : { name: (o.from || {}).name, address: String((o.from || {}).address || '').trim() };
  const eingabe = t => new SmtpError('Eingabe', t, { phase: 'eingabe' });
  if (!host || /\s/.test(host)) throw eingabe('Servername fehlt');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw eingabe('Port ist keine gültige Portnummer');
  if (!user || !pass) throw eingabe('Benutzer oder Passwort fehlt');
  if (!isAddress(from.address)) throw eingabe('Absender ist keine gültige E-Mail-Adresse');
  const empf = parseAddresses(o.to);
  if (empf.invalid.length) throw eingabe(`${empf.invalid.length} Empfängeradresse(n) ungültig`);
  if (!empf.valid.length) throw eingabe('kein Empfänger angegeben');
  if (empf.valid.length > 50) throw eingabe('zu viele Empfänger (höchstens 50)');
  const timeoutMs = o.timeoutMs > 0 ? o.timeoutMs : TIMEOUT_MS; const ohneTls = o.ohneTls === true;
  // Unverschlüsselt nur gegen den eigenen Rechner: So kann der Test-Schalter nie Zugangsdaten im Klartext ins Netz schicken.
  if (ohneTls && !['127.0.0.1', '::1', 'localhost'].includes(host.toLowerCase())) throw eingabe('ohneTls ist nur für Tests gegen localhost erlaubt');
  const direktTls = (o.secure == null ? port === 465 : o.secure === true) && !ohneTls;
  const ehlo = clean(o.ehlo) || from.address.split('@')[1];
  let messageId = null, nachricht;
  if (o.raw != null) nachricht = String(o.raw);
  else { messageId = `<${Date.now().toString(36)}.${crypto.randomBytes(9).toString('hex')}@${from.address.split('@')[1]}>`; nachricht = buildMessage({ from, to: empf.valid, subject: o.subject, text: o.text, messageId }); }
  const daten = dotStuff(nachricht);
  // Passwort und Anmeldezeilen dürfen in keiner Fehlermeldung auftauchen (auch nicht, wenn ein Server sie zurückschickt)
  const geheim = [pass, b64(pass), b64(user)].filter(g => g.length >= 3);
  const sauber = e => { const err = e instanceof SmtpError ? e : new SmtpError('Ablauf', netzFehler(e)); for (const g of geheim) err.message = err.message.split(g).join('***'); return err; };
  let socket = null, sitz = null, phase = 'verbindung';
  try {
    socket = await verbinde({ host, port, direktTls, tlsOpts: o.tls || {}, timeoutMs });
    sitz = new Sitzung(socket, timeoutMs);
    await sitz.befehl(null, [220], 'Begrüßung');
    await sitz.befehl('EHLO ' + ehlo, [250], 'EHLO');
    if (!direktTls && !ohneTls) {
      await sitz.befehl('STARTTLS', [220], 'STARTTLS');
      sitz.loese(); socket = await aufTls(socket, host, o.tls || {}, timeoutMs); sitz.binde(socket);
      await sitz.befehl('EHLO ' + ehlo, [250], 'EHLO nach STARTTLS');
    }
    if (!ohneTls && socket.encrypted !== true) throw new SmtpError('TLS', 'Verbindung ist nicht verschlüsselt – Anmeldung abgebrochen');
    phase = 'anmeldung';
    await sitz.befehl('AUTH LOGIN', [334], 'AUTH');
    await sitz.befehl(b64(user), [334], 'AUTH Benutzer');
    await sitz.befehl(b64(pass), [235], 'AUTH Passwort');
    phase = 'versand';
    await sitz.befehl(`MAIL FROM:<${from.address}>`, [250], 'MAIL FROM');
    const accepted = [], rejected = [];
    for (const a of empf.valid) { const r = await sitz.befehl(`RCPT TO:<${a}>`, null, 'RCPT TO'); if (r.code === 250 || r.code === 251) accepted.push(a); else rejected.push({ address: a, code: r.code, response: r.text }); }
    if (!accepted.length) throw new SmtpError('RCPT TO', `kein Empfänger angenommen (${rejected[0].response})`, { code: rejected[0].code });
    await sitz.befehl('DATA', [354], 'DATA');
    socket.write(daten);
    const ende = await sitz.befehl('.', [250], 'Einlieferung');
    try { await sitz.befehl('QUIT', [221], 'QUIT', Math.min(timeoutMs, 3000)); } catch (_) { /* Nachricht ist bereits angenommen */ }
    return { ok: true, accepted, rejected, response: ende.text, messageId, tls: socket.encrypted === true };
  } catch (e) {
    const err = sauber(e); if (!err.phase) err.phase = phase;
    // Hat der Server noch geantwortet (falscher Code), höflich verabschieden; bei Netzfehler/Zeitüberschreitung nicht.
    if (sitz && err.code && !sitz.fehler) { try { await sitz.befehl('QUIT', null, 'QUIT', Math.min(timeoutMs, 2000)); } catch (_) { /* egal */ } }
    throw err;
  } finally {
    if (sitz) sitz.loese();
    if (socket) { socket.on('error', () => {}); socket.destroy(); }
  }
}

module.exports = { send, buildMessage, dotStuff, encodeHeader, encodeWords, parseAddresses, isAddress, SmtpError, TIMEOUT_MS };
