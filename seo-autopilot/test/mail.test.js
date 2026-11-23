'use strict';
// Benachrichtigungen: eigener SMTP-Client (lib/smtp.js) gegen einen lokalen Fake-Server, Meldungslogik und Versand
// (lib/notify.js), Mail-Vorschau (bin/preview-mails.js). Ohne Netz: alles läuft über 127.0.0.1 und Temp-Ordner.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const net = require('net');
const tls = require('tls');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const smtp = require('../lib/smtp');
const notify = require('../lib/notify');

const USER = 'postfach@beispiel.test';
const PASS = 'Geh3im!-Passwort';
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'seo-mail-'));

// ── Hilfen ──────────────────────────────────────────────────────────────────
/** Selbst signiertes Zertifikat für localhost/127.0.0.1 – zur Laufzeit erzeugt, damit kein Schlüssel im Repo liegt. */
function testZertifikat() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const der = (tag, ...teile) => { const b = Buffer.concat(teile); const l = b.length < 128 ? [b.length] : b.length < 256 ? [0x81, b.length] : [0x82, b.length >> 8, b.length & 255]; return Buffer.concat([Buffer.from([tag, ...l]), b]); };
  const seq = (...t) => der(0x30, ...t); const oid = hex => der(0x06, Buffer.from(hex, 'hex'));
  const int = b => der(0x02, b[0] & 0x80 ? Buffer.concat([Buffer.from([0]), b]) : b);
  const zeit = d => der(0x17, Buffer.from(d.toISOString().replace(/[-:T]/g, '').slice(2, 14) + 'Z'));
  const algo = seq(oid('2a864886f70d01010b'), der(0x05));
  const name = seq(der(0x31, seq(oid('550403'), der(0x0c, Buffer.from('localhost')))));
  const san = seq(oid('551d11'), der(0x04, seq(der(0x82, Buffer.from('localhost')), der(0x87, Buffer.from([127, 0, 0, 1])))));
  const tbs = seq(der(0xa0, int(Buffer.from([2]))), int(crypto.randomBytes(8)), algo, name, seq(zeit(new Date(Date.now() - 3600e3)), zeit(new Date(Date.now() + 86400e3))), name, publicKey.export({ type: 'spki', format: 'der' }), der(0xa3, seq(san)));
  const cert = seq(tbs, algo, der(0x03, Buffer.concat([Buffer.from([0]), crypto.sign('sha256', tbs, privateKey)])));
  return { key: privateKey.export({ type: 'pkcs8', format: 'pem' }), cert: `-----BEGIN CERTIFICATE-----\n${cert.toString('base64').match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----\n` };
}
let zertCache = null; const zert = () => (zertCache = zertCache || testZertifikat());

/**
 * Fake-SMTP-Server (net.createServer bzw. tls.createServer). Optionen:
 *   pass (erwartetes Passwort), ablehnen [Adressen → 550], starttls (mit key/cert), direktTls, stumm (keine Begrüßung),
 *   stummNachDaten, grussGeteilt, ehloGeteilt, echo (Server schickt die Passwortzeile in der Fehlermeldung zurück)
 */
function fakeServer(opt = {}) {
  const log = { befehle: [], nachrichten: [], roh: [], auth: [], verbindungen: 0 };
  const offen = new Set();
  const bediene = (erst, tlsSchon) => {
    log.verbindungen++; offen.add(erst);
    let sock = erst, buf = '', inDaten = false, daten = [], stufe = 0, verschl = tlsSchon, benutzer = '';
    const sag = t => { if (!sock.destroyed) sock.write(t + '\r\n'); };
    const zeile = z => {
      if (inDaten) {
        if (z !== '.') return void daten.push(z);
        inDaten = false; log.roh.push(daten.join('\r\n')); log.nachrichten.push(daten.map(x => (x.startsWith('.') ? x.slice(1) : x)).join('\r\n')); daten = [];
        return opt.stummNachDaten ? undefined : sag('250 2.0.0 Ok: queued as FAKE1');
      }
      if (stufe === 1) { benutzer = Buffer.from(z, 'base64').toString(); stufe = 2; log.befehle.push('<benutzer>'); return sag('334 UGFzc3dvcmQ6'); }
      if (stufe === 2) {
        stufe = 0; const pw = Buffer.from(z, 'base64').toString(); log.befehle.push('<passwort>'); log.auth.push({ benutzer, pw, verschl });
        return sag(benutzer === USER && pw === (opt.pass || PASS) ? '235 2.7.0 Authentication successful' : `535 5.7.8 Error: authentication failed${opt.echo ? ' for ' + z + ' / ' + pw : ''}`);
      }
      log.befehle.push(z); const b = z.toUpperCase();
      if (b.startsWith('EHLO')) { if (opt.ehloGeteilt) { sock.write('250-fake.test\r\n250-SIZE 1000'); setTimeout(() => sag('0000\r\n250 AUTH LOGIN'), 25); return; } return sag('250-fake.test\r\n250-STARTTLS\r\n250 AUTH LOGIN PLAIN'); }
      if (b === 'STARTTLS') {
        if (!opt.starttls) return sag('502 5.5.1 Command not implemented');
        sag('220 2.0.0 Ready to start TLS'); sock.removeAllListeners('data');
        const sec = new tls.TLSSocket(sock, { isServer: true, secureContext: tls.createSecureContext({ key: opt.key, cert: opt.cert }) });
        sec.on('error', () => {}); sec.on('data', onData); offen.add(sec); sock = sec; buf = ''; verschl = true; return;
      }
      if (b === 'AUTH LOGIN') { stufe = 1; return sag('334 VXNlcm5hbWU6'); }
      if (b.startsWith('MAIL FROM:')) return sag('250 2.1.0 Ok');
      if (b.startsWith('RCPT TO:')) { const a = (/<([^>]*)>/.exec(z) || [])[1]; return sag((opt.ablehnen || []).includes(a) ? `550 5.1.1 <${a}>: Recipient address rejected` : '250 2.1.5 Ok'); }
      if (b === 'DATA') { inDaten = true; return sag('354 End data with <CR><LF>.<CR><LF>'); }
      if (b === 'QUIT') { sag('221 2.0.0 Bye'); return void sock.end(); }
      sag('500 5.5.2 Error: command not recognized');
    };
    const onData = d => { buf += d.toString('utf8'); let i; while ((i = buf.indexOf('\r\n')) >= 0) { const z = buf.slice(0, i); buf = buf.slice(i + 2); zeile(z); } };
    erst.on('data', onData); erst.on('error', () => {});
    if (opt.stumm) return;
    if (opt.grussGeteilt) { erst.write('220-fake.test ESMTP\r\n220'); setTimeout(() => { if (!erst.destroyed) erst.write(' bereit\r\n'); }, 25); } else sag('220 fake.test ESMTP');
  };
  const server = opt.direktTls ? tls.createServer({ key: opt.key, cert: opt.cert }, s => bediene(s, true)) : net.createServer(s => bediene(s, false));
  server.on('tlsClientError', () => {});
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({
    port: server.address().port, log,
    close: () => new Promise(r => { for (const s of offen) s.destroy(); server.close(() => r()); }),
  })));
}
const basis = (port, extra = {}) => ({ host: '127.0.0.1', port, user: USER, pass: PASS, from: { name: 'KFZ-Zulassungsprofis SEO-Autopilot', address: USER }, to: 'empfang@beispiel.test', subject: 'Test', text: 'Hallo', ohneTls: true, timeoutMs: 3000, ...extra });
/** Empfangene Nachricht zerlegen: entfaltete Kopfzeilen (klein geschrieben) und dekodierter Text. */
function zerlege(roh) {
  const k = roh.indexOf('\r\n\r\n'); const kopfRoh = roh.slice(0, k); const h = {};
  for (const z of kopfRoh.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) { const i = z.indexOf(':'); h[z.slice(0, i).toLowerCase()] = z.slice(i + 1).trim(); }
  const body = roh.slice(k + 4);
  return { h, kopfRoh, bodyZeilen: body.split('\r\n').filter(Boolean), text: Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8') };
}
const dekodiere = v => v.replace(/=\?UTF-8\?B\?([^?]+)\?=(\s+(?==\?))?/g, (_, b) => Buffer.from(b, 'base64').toString('utf8'));
async function mitServer(opt, fn) { const s = await fakeServer(opt); try { return await fn(s); } finally { await s.close(); } }

// ── SMTP-Client ─────────────────────────────────────────────────────────────
test('SMTP: Erfolg – Befehlsfolge, AUTH LOGIN, Kopfzeilen, text/plain UTF-8 base64', async () => {
  await mitServer({}, async s => {
    const text = 'Zeile 1\nZeile 2 mit Umlauten äöüß und Euro €\n\n' + 'Lange Zeile '.repeat(30);
    const r = await smtp.send(basis(s.port, { text, subject: 'Einfacher Betreff' }));
    assert.strictEqual(r.ok, true); assert.deepStrictEqual(r.accepted, ['empfang@beispiel.test']); assert.deepStrictEqual(r.rejected, []);
    assert.match(r.response, /^250 /); assert.strictEqual(r.tls, false); assert.match(r.messageId, /^<[^@\s]+@beispiel\.test>$/);
    assert.deepStrictEqual(s.log.befehle, ['EHLO beispiel.test', 'AUTH LOGIN', '<benutzer>', '<passwort>', `MAIL FROM:<${USER}>`, 'RCPT TO:<empfang@beispiel.test>', 'DATA', 'QUIT']);
    assert.deepStrictEqual(s.log.auth, [{ benutzer: USER, pw: PASS, verschl: false }]);
    const m = zerlege(s.log.nachrichten[0]);
    assert.strictEqual(m.h.from, `"KFZ-Zulassungsprofis SEO-Autopilot" <${USER}>`); assert.strictEqual(m.h.to, 'empfang@beispiel.test');
    assert.strictEqual(m.h.subject, 'Einfacher Betreff'); assert.strictEqual(m.h['message-id'], r.messageId);
    assert.match(m.h.date, /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000$/);
    assert.strictEqual(m.h['mime-version'], '1.0'); assert.strictEqual(m.h['content-type'], 'text/plain; charset=UTF-8'); assert.strictEqual(m.h['content-transfer-encoding'], 'base64');
    assert.strictEqual(m.h['auto-submitted'], 'auto-generated');
    assert.ok(m.bodyZeilen.length > 1 && m.bodyZeilen.every(z => z.length <= 76 && /^[A-Za-z0-9+/=]+$/.test(z)), 'base64, höchstens 76 Zeichen je Zeile');
    assert.strictEqual(m.text, text.replace(/\n/g, '\r\n'));
  });
});

test('SMTP: Umlaute und Gedankenstrich im Betreff (RFC 2047), keine Kopfzeilen-Einschleusung', async () => {
  await mitServer({}, async s => {
    const subject = '[SEO-Autopilot] kfz-zulassungsprofis.de – Wochenzusammenfassung: 3 neu wichtig, 1 behoben (Prüfung für Köln, Übersicht größer, Notenschlüssel \u{1D11E})';
    await smtp.send(basis(s.port, { subject, from: { name: 'Prüfdienst – Köln', address: USER } }));
    await smtp.send(basis(s.port, { subject: 'Harmlos\r\nBcc: fremd@beispiel.test\r\n\r\nEingeschleuster Text' }));
    const m = zerlege(s.log.nachrichten[0]);
    assert.ok(/^[\x00-\x7f]*$/.test(m.kopfRoh), 'Kopf enthält nur ASCII');
    assert.ok(m.kopfRoh.split('\r\n').every(z => z.length <= 76), 'jede Kopfzeile höchstens 76 Zeichen');
    assert.ok((m.kopfRoh.match(/=\?UTF-8\?B\?/g) || []).length >= 4, 'langer Betreff wird auf mehrere encoded-words verteilt');
    assert.strictEqual(dekodiere(m.h.subject), subject);
    assert.strictEqual(dekodiere(m.h.from), `Prüfdienst – Köln <${USER}>`);
    const m2 = zerlege(s.log.nachrichten[1]);
    assert.strictEqual(m2.h.bcc, undefined, 'kein eingeschleuster Bcc-Kopf'); assert.strictEqual(m2.h.subject, 'Harmlos Bcc: fremd@beispiel.test Eingeschleuster Text'); assert.strictEqual(m2.text, 'Hallo');
    assert.deepStrictEqual(s.log.befehle.filter(b => b.startsWith('RCPT')), ['RCPT TO:<empfang@beispiel.test>', 'RCPT TO:<empfang@beispiel.test>']);
  });
  assert.strictEqual(smtp.encodeHeader('Nur ASCII bleibt lesbar'), 'Nur ASCII bleibt lesbar');
  const lang = smtp.encodeHeader('wort '.repeat(40).trim()); assert.ok(lang.split('\r\n').every(z => z.length <= 78) && lang.includes('\r\n '), 'lange ASCII-Zeile wird an Leerzeichen umbrochen');
});

test('SMTP: Auth-Fehler – klare Meldung ohne Passwort, kein Versand', async () => {
  await mitServer({ pass: 'anderes-passwort', echo: true }, async s => {
    let err; try { await smtp.send(basis(s.port)); } catch (e) { err = e; }
    assert.ok(err instanceof smtp.SmtpError, 'SmtpError');
    assert.strictEqual(err.schritt, 'AUTH Passwort'); assert.strictEqual(err.code, 535); assert.strictEqual(err.phase, 'anmeldung');
    assert.match(err.message, /^SMTP AUTH Passwort: 535 /); assert.match(err.message, /\*\*\*/);
    for (const g of [PASS, b64(PASS), b64(USER)]) assert.ok(!err.message.includes(g), 'Fehlertext enthält weder Passwort noch Anmeldezeilen');
    assert.ok(!s.log.befehle.some(b => /^(MAIL|RCPT|DATA)/.test(b)), 'nach gescheiterter Anmeldung wird nichts eingeliefert');
    assert.strictEqual(s.log.befehle[s.log.befehle.length - 1], 'QUIT', 'höfliche Verabschiedung'); assert.strictEqual(s.log.nachrichten.length, 0);
  });
});

test('SMTP: mehrere Empfänger – Liste per Komma/Semikolon, Teilablehnung, alle abgelehnt', async () => {
  await mitServer({}, async s => {
    const r = await smtp.send(basis(s.port, { to: 'a@beispiel.test, b@beispiel.test; c@beispiel.test,A@beispiel.test' }));
    assert.deepStrictEqual(r.accepted, ['a@beispiel.test', 'b@beispiel.test', 'c@beispiel.test'], 'doppelte Adresse nur einmal');
    assert.deepStrictEqual(s.log.befehle.filter(b => b.startsWith('RCPT')), ['RCPT TO:<a@beispiel.test>', 'RCPT TO:<b@beispiel.test>', 'RCPT TO:<c@beispiel.test>']);
    assert.strictEqual(zerlege(s.log.nachrichten[0]).h.to, 'a@beispiel.test, b@beispiel.test, c@beispiel.test');
  });
  await mitServer({ ablehnen: ['b@beispiel.test'] }, async s => {
    const r = await smtp.send(basis(s.port, { to: ['a@beispiel.test', 'b@beispiel.test'] }));
    assert.deepStrictEqual(r.accepted, ['a@beispiel.test']); assert.strictEqual(r.rejected.length, 1); assert.strictEqual(r.rejected[0].address, 'b@beispiel.test'); assert.strictEqual(r.rejected[0].code, 550);
    assert.strictEqual(s.log.nachrichten.length, 1, 'Zustellung an die angenommenen Empfänger');
  });
  await mitServer({ ablehnen: ['a@beispiel.test', 'b@beispiel.test'] }, async s => {
    await assert.rejects(smtp.send(basis(s.port, { to: 'a@beispiel.test,b@beispiel.test' })), e => e.schritt === 'RCPT TO' && e.phase === 'versand' && e.code === 550);
    assert.ok(!s.log.befehle.includes('DATA')); assert.strictEqual(s.log.nachrichten.length, 0);
  });
});

test('SMTP: Dot-Stuffing – Punkt am Zeilenanfang wird verdoppelt, einzelner Punkt beendet die Nachricht nicht', async () => {
  assert.strictEqual(smtp.dotStuff('a\n.b\n..c\n.'), 'a\r\n..b\r\n...c\r\n..\r\n');
  assert.strictEqual(smtp.dotStuff('.anfang\r\nx.mitte'), '..anfang\r\nx.mitte\r\n');
  assert.strictEqual(smtp.dotStuff('x .kein Zeilenanfang'), 'x .kein Zeilenanfang\r\n', 'nur CRLF gilt als Zeilenende');
  await mitServer({}, async s => {
    const raw = 'Subject: Punkte\r\n\r\n.erste Zeile beginnt mit Punkt\r\n..zwei Punkte\r\nnormal\r\n.\r\nnach einem einzelnen Punkt';
    const r = await smtp.send(basis(s.port, { raw, subject: undefined, text: undefined }));
    assert.strictEqual(r.ok, true); assert.strictEqual(r.messageId, null);
    assert.strictEqual(s.log.roh[0], 'Subject: Punkte\r\n\r\n..erste Zeile beginnt mit Punkt\r\n...zwei Punkte\r\nnormal\r\n..\r\nnach einem einzelnen Punkt', 'so geht es über die Leitung');
    assert.strictEqual(s.log.nachrichten[0], raw, 'der Server erhält nach dem Entfernen der Zusatzpunkte genau das Original');
    assert.strictEqual(s.log.nachrichten.length, 1);
  });
});

test('SMTP: STARTTLS mit echter Verschlüsselung; ohne Vertrauen ins Zertifikat oder ohne STARTTLS wird nie angemeldet', async () => {
  const z = zert();
  await mitServer({ starttls: true, ...z }, async s => {
    const r = await smtp.send(basis(s.port, { ohneTls: false, tls: { ca: z.cert } }));
    assert.strictEqual(r.ok, true); assert.strictEqual(r.tls, true);
    assert.deepStrictEqual(s.log.befehle.slice(0, 4), ['EHLO beispiel.test', 'STARTTLS', 'EHLO beispiel.test', 'AUTH LOGIN']);
    assert.deepStrictEqual(s.log.auth, [{ benutzer: USER, pw: PASS, verschl: true }], 'Anmeldung erst nach dem TLS-Aufbau');
    assert.strictEqual(zerlege(s.log.nachrichten[0]).text, 'Hallo');
  });
  await mitServer({ starttls: true, ...z }, async s => {
    await assert.rejects(smtp.send(basis(s.port, { ohneTls: false })), e => e.schritt === 'STARTTLS' && /Zertifikat/.test(e.message) && e.phase === 'verbindung');
    assert.strictEqual(s.log.auth.length, 0, 'unbekanntes Zertifikat → keine Zugangsdaten gesendet');
  });
  await mitServer({ starttls: false }, async s => {
    await assert.rejects(smtp.send(basis(s.port, { ohneTls: false })), e => e.schritt === 'STARTTLS' && e.code === 502);
    assert.strictEqual(s.log.auth.length, 0, 'Server ohne STARTTLS → keine Anmeldung im Klartext');
    assert.ok(!s.log.befehle.includes('AUTH LOGIN'));
  });
});

test('SMTP: TLS von Anfang an (wie Port 465)', async () => {
  const z = zert();
  await mitServer({ direktTls: true, ...z }, async s => {
    const r = await smtp.send(basis(s.port, { ohneTls: false, secure: true, tls: { ca: z.cert } }));
    assert.strictEqual(r.tls, true); assert.ok(!s.log.befehle.includes('STARTTLS')); assert.strictEqual(s.log.auth[0].verschl, true); assert.strictEqual(s.log.nachrichten.length, 1);
  });
});

test('SMTP: Zeitlimit je Schritt, abgelehnte Verbindung, geteilte und mehrzeilige Antworten', async () => {
  await mitServer({ stumm: true }, async s => {
    const t0 = Date.now();
    await assert.rejects(smtp.send(basis(s.port, { timeoutMs: 150 })), e => e.schritt === 'Begrüßung' && e.timeout === true && /Zeitüberschreitung/.test(e.message));
    assert.ok(Date.now() - t0 < 2000, 'bricht nach dem Zeitlimit ab');
  });
  await mitServer({ stummNachDaten: true }, async s => {
    await assert.rejects(smtp.send(basis(s.port, { timeoutMs: 200 })), e => e.schritt === 'Einlieferung' && e.timeout === true && e.phase === 'versand');
  });
  const zu = await fakeServer({}); const port = zu.port; await zu.close();
  await assert.rejects(smtp.send(basis(port, { timeoutMs: 1000 })), e => e.schritt === 'Verbindung' && e.phase === 'verbindung' && !e.message.includes(PASS));
  await mitServer({ grussGeteilt: true, ehloGeteilt: true }, async s => {
    const r = await smtp.send(basis(s.port)); assert.strictEqual(r.ok, true); assert.strictEqual(s.log.nachrichten.length, 1);
  });
  assert.strictEqual(smtp.TIMEOUT_MS, 20000, 'Standard: 20 s je Schritt');
});

test('SMTP: Eingaben werden vor dem Verbinden geprüft; der Schalter „ohne TLS“ hängt an keiner Umgebungsvariable', async () => {
  await mitServer({}, async s => {
    const fehler = async (extra, muster) => { await assert.rejects(smtp.send(basis(s.port, extra)), e => e.phase === 'eingabe' && muster.test(e.message) && !/@/.test(e.message)); };
    await fehler({ to: '' }, /kein Empfänger/);
    await fehler({ to: 'kein-at-zeichen, ok@beispiel.test' }, /1 Empfängeradresse\(n\) ungültig/);
    await fehler({ to: 'a@beispiel.test>\r\nRCPT TO:<fremd@beispiel.test' }, /ungültig/);
    await fehler({ pass: '' }, /Benutzer oder Passwort fehlt/);
    await fehler({ from: 'kein absender' }, /Absender/);
    await fehler({ port: 'abc' }, /Port/);
    await fehler({ host: 'mail.beispiel.test' }, /ohneTls ist nur für Tests gegen localhost erlaubt/);
    assert.strictEqual(s.log.verbindungen, 0, 'bei ungültigen Eingaben wird gar nicht erst verbunden');
  });
  const quelle = fs.readFileSync(path.join(__dirname, '..', 'lib', 'smtp.js'), 'utf8');
  assert.ok(!/process\.env/.test(quelle), 'lib/smtp.js liest keine Umgebungsvariablen');
  assert.deepStrictEqual(smtp.parseAddresses(' a@b.test ;c@d.test, a@B.test , x'), { valid: ['a@b.test', 'c@d.test'], invalid: ['x'] });
});

// ── notify.build ────────────────────────────────────────────────────────────
const JETZT = Date.parse('2026-12-07T07:30:00Z'); // ein Montag
const vor = (h, basisMs = JETZT) => new Date(basisMs - h * 3600e3).toISOString();
const vorEcht = h => vor(h, Date.now()); // relativ zur echten Uhr (send() stempelt mit der echten Zeit)
const SEV = ['kritisch', 'hoch', 'mittel', 'niedrig', 'info'];
/** Minimaler Ersatz für den IssueStore (gleiche Schnittstelle: open, all, get, state, save, markNotified). */
class FakeStore {
  constructor(issues = [], lastDigest) { this.state = { issues: Object.fromEntries(issues.map(i => [i.id, i])), runs: [] }; if (lastDigest !== undefined) this.state.lastDigest = lastDigest; this.saves = 0; }
  open() { return Object.values(this.state.issues).filter(i => i.status === 'offen').sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity)); }
  all() { return Object.values(this.state.issues); }
  get(id) { return this.state.issues[id]; }
  markNotified(ids, channel) { const now = new Date().toISOString(); for (const id of ids) if (this.state.issues[id]) this.state.issues[id].notified = { at: now, channel }; this.save(); }
  save() { this.saves++; }
}
const befund = (id, o = {}) => ({ id, rule: 'regel-' + id, status: 'offen', severity: 'hoch', url: 'https://kfz-zulassungsprofis.de/preise/', title: 'Befund ' + id, first_seen: vor(2), last_seen: vor(0), notified: null, ...o });
const cfg = (notifyCfg = {}) => ({ base: 'https://kfz-zulassungsprofis.de', importantPaths: ['/'], notify: { enabled: false, to: '', ...notifyCfg }, center: { url: 'https://kfz-zulassungsprofis.de/seo/', user: 'center-nutzer', password: 'center-passwort-123' } });
const kanal = (items, k) => items.find(i => i.channel === k);

test('notify.build: Sofortmeldung nur für kritische Befunde, Betreff/Fußzeile für KFZ-Zulassungsprofis, Pfad nicht doppelt', () => {
  const s = new FakeStore([
    befund('k1', { severity: 'kritisch', url: 'https://kfz-zulassungsprofis.de/auftrag/', title: 'Kernseite nicht mehr erreichbar (vorher 200, jetzt 503): /auftrag/', detail: 'Status 503', suggestion: 'Deploy prüfen' }),
    befund('h1', { title: 'Preis weicht ab' }),
    befund('n1', { severity: 'niedrig', title: 'Title zu lang', url: 'https://kfz-zulassungsprofis.de/kfz-zulassung/*/', count: 40 }),
    befund('d1', { rule: 'sitemap', url: undefined, file: 'app/sitemap.ts', title: 'Sitemap unvollständig' }),
  ], { tag: vor(24) });
  const items = notify.build(s, cfg(), 'daily', { score: 80, now: JETZT });
  assert.deepStrictEqual(items.map(i => i.channel), ['sofort', 'tageszusammenfassung']);
  const sofort = items[0];
  assert.strictEqual(sofort.subject, '[SEO-Autopilot] kfz-zulassungsprofis.de – 1 kritisches Problem'); assert.deepStrictEqual(sofort.ids, ['k1']);
  assert.match(sofort.body, /• \[kritisch\] Kernseite nicht mehr erreichbar \(vorher 200, jetzt 503\): \/auftrag\/\n {2}Status 503\n {2}→ Deploy prüfen/);
  assert.ok(!/\/auftrag\/ – \/auftrag\//.test(sofort.body), 'Pfad steht nicht doppelt in der Zeile');
  assert.match(sofort.body, /je Problem nur einmal/);
  const tag = items[1];
  assert.ok(!tag.skip); assert.strictEqual(tag.subject, '[SEO-Autopilot] kfz-zulassungsprofis.de – Tageszusammenfassung: 3 neu wichtig, 0 behoben'); assert.deepStrictEqual(tag.ids, []);
  assert.match(tag.body, /^Stand: 4 offene Punkte \(kritisch 1, hoch 2, mittel 0, niedrig 1\) · SEO-Status 80\/100/);
  assert.match(tag.body, /Neue wichtige Probleme seit 06\.12\.2026: 3/); assert.match(tag.body, /• \[hoch\] Preis weicht ab – \/preise\//); assert.match(tag.body, /• \[hoch\] Sitemap unvollständig – app\/sitemap\.ts/);
  assert.match(tag.body, /Die drei wichtigsten Maßnahmen:/); assert.match(tag.body, /Google Search Console: nicht verbunden/);
  assert.ok(!/Title zu lang/.test(tag.body.split('Die drei wichtigsten')[0]), 'niedrige Punkte sind keine Neuigkeit');
  for (const it of items) { assert.match(it.body, /SEO Center: https:\/\/kfz-zulassungsprofis\.de\/seo\/ /); assert.deepStrictEqual([...new Set((it.subject + it.body).match(/[a-z0-9-]+\.de\b/g))], ['kfz-zulassungsprofis.de'], 'einzige genannte Domain ist die eigene'); }
  const zwei = notify.build(new FakeStore([befund('k1', { severity: 'kritisch' }), befund('k2', { severity: 'kritisch' })]), cfg(), 'daily', { now: JETZT });
  assert.strictEqual(zwei[0].subject, '[SEO-Autopilot] kfz-zulassungsprofis.de – 2 kritische Probleme');
});

test('notify.build: Tageszusammenfassung nur bei Neuigkeiten; Wochen- und Monatszusammenfassung immer', () => {
  const ruhig = () => new FakeStore([befund('h1', { first_seen: vor(24 * 40) }), befund('m1', { severity: 'mittel', first_seen: vor(1) })], { tag: vor(20), woche: vor(100), monat: vor(500) });
  const t = notify.build(ruhig(), cfg(), 'daily', { now: JETZT });
  assert.strictEqual(t.length, 1); assert.strictEqual(t[0].skip, true); assert.strictEqual(t[0].channel, 'tageszusammenfassung'); assert.match(t[0].subject, /keine Mail/); assert.match(t[0].body, /^Stand: 2 offene Punkte/);
  const w = notify.build(ruhig(), cfg(), 'weekly', { now: JETZT });
  assert.strictEqual(w.length, 1); assert.ok(!w[0].skip, 'Wochenmail auch ohne Neuigkeiten'); assert.strictEqual(w[0].channel, 'wochenzusammenfassung');
  assert.strictEqual(w[0].subject, '[SEO-Autopilot] kfz-zulassungsprofis.de – Wochenzusammenfassung: 0 neu wichtig, 0 behoben');
  const m = notify.build(ruhig(), cfg(), 'monthly', { now: JETZT });
  assert.strictEqual(m.length, 1); assert.ok(!m[0].skip); assert.strictEqual(m[0].channel, 'monatszusammenfassung'); assert.match(m[0].subject, /– Monatszusammenfassung: /);
  // behoben oder wieder aufgetreten zählt als Neuigkeit
  const behoben = new FakeStore([befund('b1', { status: 'behoben', first_seen: vor(24 * 9), resolved_at: vor(3) })], { tag: vor(20) });
  const tb = kanal(notify.build(behoben, cfg(), 'daily', { now: JETZT }), 'tageszusammenfassung'); assert.ok(!tb.skip); assert.match(tb.body, /Erfolge \(behoben\): 1\n• \[hoch\] Befund b1/);
  const wieder = new FakeStore([befund('w1', { severity: 'mittel', first_seen: vor(24 * 30), reopened_at: vor(2) })], { tag: vor(20) });
  assert.match(kanal(notify.build(wieder, cfg(), 'daily', { now: JETZT }), 'tageszusammenfassung').body, /Wieder aufgetreten: 1/);
});

test('notify.build: Sofortmeldung je Problem nur einmal – erneut erst nach Wiederauftreten', () => {
  const s = new FakeStore([befund('k1', { severity: 'kritisch' })], { tag: vor(24) });
  assert.ok(kanal(notify.build(s, cfg(), 'daily', { now: JETZT }), 'sofort'));
  s.state.issues.k1.notified = { at: vor(1), channel: 'sofort' };
  assert.strictEqual(kanal(notify.build(s, cfg(), 'daily', { now: JETZT }), 'sofort'), undefined, 'bereits gemeldet → keine zweite Sofortmeldung');
  assert.strictEqual(kanal(notify.build(s, cfg(), 'weekly', { now: JETZT }), 'sofort'), undefined);
  s.state.issues.k1.reopened_at = vor(0.5);
  assert.deepStrictEqual(kanal(notify.build(s, cfg(), 'daily', { now: JETZT }), 'sofort').ids, ['k1'], 'nach der Meldung behoben und wieder aufgetreten → erneut melden');
  s.state.issues.k1.notified = { at: vor(0.1), channel: 'sofort' };
  assert.strictEqual(kanal(notify.build(s, cfg(), 'daily', { now: JETZT }), 'sofort'), undefined);
});

test('notify: Zeitfenster je Meldungsart – altes lastDigest (String) und neues ({tag,woche,monat})', () => {
  const gestern = vor(24), vor3 = vor(72), vor6 = vor(144);
  // sinceFor direkt
  assert.strictEqual(notify.sinceFor(gestern, 'daily', JETZT), gestern);
  assert.strictEqual(notify.sinceFor(gestern, 'weekly', JETZT), vor(168), 'alter String von gestern: Wochenfenster trotzdem 7 Tage');
  assert.strictEqual(notify.sinceFor(vor(24 * 20), 'weekly', JETZT), vor(24 * 20), 'längere Pause: Fenster reicht bis zur letzten Zusammenfassung zurück');
  assert.strictEqual(notify.sinceFor(gestern, 'monthly', JETZT), vor(24 * 30));
  assert.strictEqual(notify.sinceFor({ tag: gestern, woche: vor6 }, 'weekly', JETZT), vor6);
  assert.strictEqual(notify.sinceFor({ tag: gestern, woche: vor6 }, 'daily', JETZT), gestern);
  assert.strictEqual(notify.sinceFor({ tag: gestern, woche: vor6 }, 'monthly', JETZT), vor(24 * 30), 'fehlendes Feld → Standardfenster');
  for (const kaputt of [undefined, null, 42, '', 'kein datum', { tag: 'unsinn' }, []]) assert.strictEqual(notify.sinceFor(kaputt, 'daily', JETZT), vor(24), 'unbrauchbarer Stand → Standardfenster, kein Absturz');
  // Grenze: was im selben Augenblick wie der Abschluss gespeichert wurde, stand schon in der letzten Mail
  assert.strictEqual(kanal(notify.build(new FakeStore([befund('g', { first_seen: gestern })], { tag: gestern }), cfg(), 'daily', { now: JETZT }), 'tageszusammenfassung').skip, true);
  assert.ok(!kanal(notify.build(new FakeStore([befund('g', { first_seen: vor(23.9) })], { tag: gestern }), cfg(), 'daily', { now: JETZT }), 'tageszusammenfassung').skip);
  // Wirkung in build: ein Befund von vor 3 Tagen gehört in die Wochen-, aber nicht in die Tagesmail
  for (const stand of [gestern, { tag: gestern, woche: vor6, monat: vor(24 * 29) }]) {
    const s = () => new FakeStore([befund('alt', { first_seen: vor3 })], stand);
    assert.strictEqual(kanal(notify.build(s(), cfg(), 'daily', { now: JETZT }), 'tageszusammenfassung').skip, true, 'Tagesmail: nichts Neues seit gestern');
    const w = kanal(notify.build(s(), cfg(), 'weekly', { now: JETZT }), 'wochenzusammenfassung');
    assert.match(w.subject, /: 1 neu wichtig, 0 behoben$/, 'Wochenmail deckt die ganze Woche ab, nicht nur die Zeit seit der Tagesmail');
    assert.match(kanal(notify.build(s(), cfg(), 'monthly', { now: JETZT }), 'monatszusammenfassung').subject, /: 1 neu wichtig/);
  }
});

test('notify.build: Search-Console-Zeile (verbunden mit Umzugshinweis, Abruf fehlgeschlagen) und nie Zugangsdaten im Text', () => {
  const g = { connected: true, periods: { 7: { range: { start: '2026-11-27', end: '2026-12-03' }, current: { clicks: 42, impressions: 1800, position: 14.24 }, previous: { clicks: 3, impressions: 90, position: 30 } } } };
  const s = () => new FakeStore([befund('h1')], { tag: vor(24) });
  const jung = kanal(notify.build(s(), cfg(), 'weekly', { gsc: g, now: JETZT }), 'wochenzusammenfassung').body;
  assert.match(jung, /Google Search Console \(7 Tage, 27\.11\.2026–03\.12\.2026\): 42 Klicks \(vorher 3\), 1800 Impressionen \(vorher 90\), Ø Position 14\.2/);
  assert.match(jung, /seit 20\.11\.2026 live\. Bis 20\.03\.2027 ist der Vergleich mit „vorher“ ein Umzugseffekt und kein echter Anstieg/);
  const spaeter = kanal(notify.build(s(), cfg(), 'weekly', { gsc: g, now: Date.parse('2027-06-01T07:30:00Z') }), 'wochenzusammenfassung').body;
  assert.match(spaeter, /42 Klicks/); assert.ok(!/Umzugseffekt/.test(spaeter), 'nach 120 Tagen kein Umzugshinweis mehr');
  assert.ok(!/nicht aktuell/.test(jung), 'ohne Abrufzeitpunkt kein Hinweis auf veraltete Zahlen');
  const mitAbruf = alter => kanal(notify.build(s(), cfg(), 'weekly', { gsc: { ...g, fetchedAt: vor(alter) }, now: JETZT }), 'wochenzusammenfassung').body;
  assert.ok(!/nicht aktuell/.test(mitAbruf(2)), 'frischer Abruf');
  assert.match(mitAbruf(24 * 5), /Hinweis: Stand vom 02\.12\.2026 – der letzte Abruf bei Google ist fehlgeschlagen, die Zahlen sind nicht aktuell\./, 'gespeicherter Stand nach gescheitertem Abruf wird gekennzeichnet');
  const stale = kanal(notify.build(s(), cfg(), 'weekly', { gsc: { connected: false, stale: true, status: { reason: 'GSC HTTP 403: verboten für bot@projekt.iam.gserviceaccount.com' } }, now: JETZT }), 'wochenzusammenfassung').body;
  assert.match(stale, /Abruf fehlgeschlagen/); assert.match(stale, /Grund: GSC HTTP 403/); assert.ok(!/bot@projekt/.test(stale), 'keine Adresse des Dienstkontos in der Mail');
  // Zugangsdaten: weder Center-Login noch in die Adresse eingebettete Daten tauchen auf
  const c = cfg(); c.center.url = 'https://center-nutzer:center-passwort-123@kfz-zulassungsprofis.de/seo/';
  const alles = JSON.stringify(notify.build(new FakeStore([befund('k1', { severity: 'kritisch' }), befund('h1')]), c, 'weekly', { gsc: g, now: JETZT }));
  assert.ok(!/center-passwort-123|center-nutzer/.test(alles), 'kein Benutzername, kein Passwort'); assert.match(alles, /https:\/\/kfz-zulassungsprofis\.de\/seo\//);
  const ohneCenter = notify.build(new FakeStore([befund('h1')]), { base: 'https://www.kfz-zulassungsprofis.de/', notify: {} }, 'weekly', { now: JETZT });
  assert.match(ohneCenter[0].body, /SEO Center: https:\/\/kfz-zulassungsprofis\.de\/seo\//, 'ohne cfg.center: Adresse aus der Basis-URL'); assert.match(ohneCenter[0].subject, /^\[SEO-Autopilot\] kfz-zulassungsprofis\.de – /);
});

// ── notify.send / writeOutbox ───────────────────────────────────────────────
const ENV = { SMTP_USER: USER, SMTP_PASSWORD: PASS };
const keinVersand = () => { throw new Error('Transport darf hier nicht aufgerufen werden'); };

test('notify.send: ohne Freigabe, Empfänger oder Zugang kein Versand – Grund in der Rückgabe, Zeitfenster rückt vor', async () => {
  const t0 = Date.now(); const frisch = v => typeof v === 'string' && Date.parse(v) >= t0 && Date.parse(v) <= Date.now(); // gerade eben gestempelt
  const lauf = async (notifyCfg, env, kind = 'daily') => { const s = new FakeStore([befund('k1', { severity: 'kritisch' }), befund('h1')], vor(24)); const items = notify.build(s, cfg(notifyCfg), kind, { now: JETZT }); const res = await notify.send(items, cfg(notifyCfg), s, { env, transport: keinVersand }); return { s, items, res }; };
  const aus = await lauf({ enabled: false, to: 'a@beispiel.test' }, ENV);
  assert.deepStrictEqual(aus.res, { sent: 0, failed: 0, reason: 'SEO_NOTIFY nicht gesetzt – nur Outbox' });
  assert.ok(aus.items.every(i => i.sent !== true)); assert.strictEqual(aus.s.state.issues.k1.notified, null, 'ohne echten Versand gilt der kritische Befund nicht als gemeldet');
  assert.strictEqual(typeof aus.s.state.lastDigest, 'object', 'alter String wird ins neue Format überführt'); assert.ok(frisch(aus.s.state.lastDigest.tag), 'Tagesfenster abgeschlossen'); assert.strictEqual(aus.s.state.lastDigest.woche, null); assert.ok(aus.s.saves >= 1);
  assert.match((await lauf({ enabled: true, to: '' }, ENV)).res.reason, /^kein Empfänger hinterlegt \(SEO_NOTIFY_TO\)/);
  assert.match((await lauf({ enabled: true, to: ' , ' }, ENV)).res.reason, /^kein Empfänger hinterlegt/);
  const ungueltig = await lauf({ enabled: true, to: 'kaputt@' }, ENV); assert.match(ungueltig.res.reason, /^Empfängeradresse ungültig/); assert.ok(!/kaputt/.test(ungueltig.res.reason));
  assert.match((await lauf({ enabled: true, to: 'a@beispiel.test' }, { SMTP_USER: USER })).res.reason, /^SMTP-Zugang fehlt \(SMTP_USER und SMTP_PASSWORD\)/);
  assert.match((await lauf({ enabled: true, to: 'a@beispiel.test' }, { SMTP_PASSWORD: PASS })).res.reason, /^SMTP-Zugang fehlt/);
  assert.match((await lauf({ enabled: true, to: 'a@beispiel.test' }, { ...ENV, SMTP_PORT: 'abc' })).res.reason, /^SMTP_PORT ist keine gültige Portnummer/);
  assert.match((await lauf({ enabled: true, to: 'a@beispiel.test' }, { SMTP_USER: 'm0123456', SMTP_PASSWORD: PASS })).res.reason, /^SMTP_USER ist keine E-Mail-Adresse/);
  const woche = await lauf({ enabled: false }, ENV, 'weekly'); assert.ok(frisch(woche.s.state.lastDigest.woche) && frisch(woche.s.state.lastDigest.tag), 'Wochenmail schließt Wochen- und Tagesfenster'); assert.strictEqual(woche.s.state.lastDigest.monat, null);
  const monat = await lauf({ enabled: false }, ENV, 'monthly'); assert.ok(frisch(monat.s.state.lastDigest.monat) && frisch(monat.s.state.lastDigest.tag), 'Monatsmail schließt Monats- und Tagesfenster'); assert.strictEqual(monat.s.state.lastDigest.woche, null);
  // nichts zu senden: übersprungene Tagesmail ändert das Zeitfenster nicht
  const stand = { tag: vor(1), woche: vor(50), monat: vor(300) }; const s = new FakeStore([befund('alt', { first_seen: vor(500) })], { ...stand });
  const items = notify.build(s, cfg(), 'daily', { now: JETZT }); assert.deepStrictEqual(await notify.send(items, cfg({ enabled: true, to: 'a@beispiel.test' }), s, { env: ENV, transport: keinVersand }), { sent: 0, failed: 0, reason: 'nichts zu senden' });
  assert.deepStrictEqual(s.state.lastDigest, stand); assert.strictEqual(s.saves, 0);
});

test('notify.send: Standard-Host/-Port wie scripts/mail-zugang.mjs, SMTP_PASSWORD oder SMTP_PASS, Absender = angemeldetes Postfach', async () => {
  const aufrufe = []; const transport = async o => { aufrufe.push(o); return { ok: true, accepted: [].concat(o.to), rejected: [] }; };
  const c = cfg({ enabled: true, to: 'eins@beispiel.test, zwei@beispiel.test' });
  const lauf = async env => { const s = new FakeStore([befund('h1')], { tag: vor(24) }); const items = notify.build(s, c, 'weekly', { now: JETZT }); return notify.send(items, c, s, { env, transport }); };
  assert.deepStrictEqual(await lauf({ SMTP_USER: ' ' + USER + ' ', SMTP_PASS: 'aus-smtp-pass' }), { sent: 1, failed: 0 });
  const a = aufrufe[0];
  assert.strictEqual(a.host, notify.STANDARD_HOST); assert.strictEqual(a.port, 587); assert.strictEqual(a.user, USER); assert.strictEqual(a.pass, 'aus-smtp-pass');
  assert.deepStrictEqual(a.from, { name: 'KFZ-Zulassungsprofis SEO-Autopilot', address: USER }); assert.deepStrictEqual(a.to, ['eins@beispiel.test', 'zwei@beispiel.test']);
  assert.match(a.subject, /^\[SEO-Autopilot\] kfz-zulassungsprofis\.de – Wochenzusammenfassung: /); assert.match(a.text, /^Stand: /);
  assert.strictEqual(a.ohneTls, undefined, 'im Normalbetrieb wird der Test-Schalter nie gesetzt'); assert.strictEqual(a.tls, undefined);
  await lauf({ SMTP_USER: USER, SMTP_PASSWORD: 'aus-smtp-password', SMTP_PASS: 'aus-smtp-pass', SMTP_HOST: 'mail.beispiel.test', SMTP_PORT: '465' });
  assert.strictEqual(aufrufe[1].pass, 'aus-smtp-password', 'SMTP_PASSWORD hat Vorrang'); assert.strictEqual(aufrufe[1].host, 'mail.beispiel.test'); assert.strictEqual(aufrufe[1].port, 465);
  const zugang = path.join(__dirname, '..', '..', 'scripts', 'mail-zugang.mjs');
  if (fs.existsSync(zugang)) { const q = fs.readFileSync(zugang, 'utf8'); assert.ok(q.includes(notify.STANDARD_HOST), 'gleicher Standard-Host wie im Deploy-Skript'); assert.ok(q.includes(': 587'), 'gleicher Standard-Port'); }
});

test('notify.send → Fake-Server: Versand, sent:true für die Outbox, kritische Befunde als gemeldet markiert', async () => {
  await mitServer({}, async srv => {
    const dir = tmp(); const c = cfg({ enabled: true, to: 'eins@beispiel.test; zwei@beispiel.test' });
    const t0 = Date.now(); const woche = vorEcht(200);
    const s = new FakeStore([befund('k1', { severity: 'kritisch', title: 'Kernseite nicht erreichbar: /auftrag/', first_seen: vorEcht(2) }), befund('h1', { title: 'Prüfung für Köln – Übersicht', first_seen: vorEcht(2) })], { tag: vorEcht(24), woche });
    const items = notify.build(s, c, 'daily', { score: 71 });
    const res = await notify.send(items, c, s, { env: ENV, smtp: { host: '127.0.0.1', port: srv.port, ohneTls: true, timeoutMs: 3000 } });
    const datei = notify.writeOutbox(dir, items);
    assert.deepStrictEqual(res, { sent: 2, failed: 0 }); assert.ok(items.every(i => i.sent === true));
    assert.strictEqual(s.state.issues.k1.notified.channel, 'sofort'); assert.strictEqual(s.state.issues.h1.notified, null);
    assert.ok(Date.parse(s.state.lastDigest.tag) >= t0, 'Tagesfenster abgeschlossen'); assert.strictEqual(s.state.lastDigest.woche, woche, 'Wochenfenster unberührt');
    assert.strictEqual(srv.log.nachrichten.length, 2); assert.strictEqual(srv.log.verbindungen, 2);
    assert.deepStrictEqual(srv.log.befehle.filter(b => b.startsWith('RCPT')).length, 4, 'beide Empfänger je Mail');
    const [m1, m2] = srv.log.nachrichten.map(zerlege);
    assert.strictEqual(m1.h.from, `"KFZ-Zulassungsprofis SEO-Autopilot" <${USER}>`); assert.strictEqual(m1.h.to, 'eins@beispiel.test, zwei@beispiel.test');
    assert.strictEqual(dekodiere(m1.h.subject), '[SEO-Autopilot] kfz-zulassungsprofis.de – 1 kritisches Problem');
    assert.strictEqual(dekodiere(m2.h.subject), '[SEO-Autopilot] kfz-zulassungsprofis.de – Tageszusammenfassung: 2 neu wichtig, 0 behoben');
    assert.strictEqual(m2.text, items[1].body.replace(/\n/g, '\r\n')); assert.match(m2.text, /Prüfung für Köln – Übersicht/);
    for (const m of [m1, m2]) assert.ok(![PASS, 'center-passwort-123', 'center-nutzer'].some(g => (m.kopfRoh + m.text).includes(g)), 'Mail enthält keine Zugangsdaten');
    const outbox = JSON.parse(fs.readFileSync(datei, 'utf8'));
    assert.strictEqual(path.basename(datei), 'notifications.json'); assert.deepStrictEqual(outbox.map(e => [e.channel, e.sent]), [['sofort', true], ['tageszusammenfassung', true]]);
    assert.deepStrictEqual(outbox[0].ids, ['k1']); assert.ok(outbox.every(e => e.at && e.subject && e.body && !JSON.stringify(e).includes(PASS)));
    // nächster Lauf ohne Änderung: keine Sofortmeldung, keine Tagesmail
    const again = notify.build(s, c, 'daily', {}); assert.deepStrictEqual(again.map(i => [i.channel, !!i.skip]), [['tageszusammenfassung', true]]);
  });
});

test('notify.send wirft nie: SMTP-Fehler → {sent:0, reason} ohne Passwort und Adressen, nichts gilt als gemeldet', async () => {
  await mitServer({ pass: 'server-erwartet-etwas-anderes' }, async srv => {
    const dir = tmp(); const c = cfg({ enabled: true, to: 'eins@beispiel.test' }); const stand = { tag: vor(24), woche: null, monat: null };
    const s = new FakeStore([befund('k1', { severity: 'kritisch' }), befund('h1')], { ...stand });
    const items = notify.build(s, c, 'daily', { now: JETZT });
    const res = await notify.send(items, c, s, { env: ENV, smtp: { host: '127.0.0.1', port: srv.port, ohneTls: true, timeoutMs: 3000 } });
    assert.strictEqual(res.sent, 0); assert.strictEqual(res.failed, 1); assert.match(res.reason, /^Versand fehlgeschlagen: SMTP AUTH Passwort: 535 /);
    assert.ok(!res.reason.includes(PASS) && !res.reason.includes(b64(PASS)) && !/@/.test(res.reason), 'Grund ohne Passwort und ohne Adressen');
    assert.strictEqual(srv.log.verbindungen, 1, 'nach gescheiterter Anmeldung kein zweiter Versuch im selben Lauf');
    assert.strictEqual(items[0].sent, false); assert.match(items[0].error, /AUTH Passwort/); assert.notStrictEqual(items[1].sent, true);
    assert.strictEqual(s.state.issues.k1.notified, null, 'Sofortmeldung wird beim nächsten Lauf erneut versucht'); assert.deepStrictEqual(s.state.lastDigest, stand, 'Zeitfenster bleibt stehen – die Zusammenfassung geht nicht verloren');
    const outbox = JSON.parse(fs.readFileSync(notify.writeOutbox(dir, items), 'utf8'));
    assert.deepStrictEqual(outbox.map(e => e.sent), [false, false]); assert.match(outbox[0].error, /535/);
  });
  // Empfänger abgelehnt (Fehler in der Versandphase): weitere Meldungen werden trotzdem versucht
  await mitServer({ ablehnen: ['eins@beispiel.test'] }, async srv => {
    const c = cfg({ enabled: true, to: 'eins@beispiel.test' }); const s = new FakeStore([befund('k1', { severity: 'kritisch' }), befund('h1')], { tag: vor(24) });
    const res = await notify.send(notify.build(s, c, 'daily', { now: JETZT }), c, s, { env: ENV, smtp: { host: '127.0.0.1', port: srv.port, ohneTls: true, timeoutMs: 3000 } });
    assert.strictEqual(res.sent, 0); assert.strictEqual(res.failed, 2); assert.strictEqual(srv.log.verbindungen, 2); assert.match(res.reason, /RCPT TO/); assert.ok(!/eins@/.test(res.reason), 'abgelehnte Adresse steht nicht im Grund');
  });
  // Teilablehnung zählt als gesendet, mit Hinweis
  await mitServer({ ablehnen: ['zwei@beispiel.test'] }, async srv => {
    const c = cfg({ enabled: true, to: 'eins@beispiel.test, zwei@beispiel.test' }); const s = new FakeStore([befund('h1')], { tag: vor(24) });
    const res = await notify.send(notify.build(s, c, 'weekly', { now: JETZT }), c, s, { env: ENV, smtp: { host: '127.0.0.1', port: srv.port, ohneTls: true, timeoutMs: 3000 } });
    assert.deepStrictEqual(res, { sent: 1, failed: 0, reason: '1 Empfänger vom Mailserver abgelehnt' });
  });
  // beliebige andere Fehler: keine Ausnahme
  const c = cfg({ enabled: true, to: 'eins@beispiel.test' });
  const kaputt = await notify.send([{ channel: 'hinweis', subject: 'x', body: 'y' }], c, new FakeStore(), { env: ENV, transport: async () => { throw 'kein Error-Objekt mit eins@beispiel.test'; } });
  assert.strictEqual(kaputt.sent, 0); assert.ok(!/eins@/.test(kaputt.reason));
  assert.deepStrictEqual(await notify.send(undefined, c, undefined), { sent: 0, failed: 0, reason: 'nichts zu senden' });
  assert.deepStrictEqual(await notify.send([{ channel: 'hinweis', subject: 'Prüflauf unsicher', body: 'x', ids: [], skip: true }], c, new FakeStore(), { env: ENV, transport: keinVersand }), { sent: 0, failed: 0, reason: 'nichts zu senden' });
  const ohneStore = await notify.send([{ channel: 'wochenzusammenfassung', subject: 'x', body: 'y', ids: [] }], cfg(), undefined, { env: ENV }); assert.strictEqual(ohneStore.sent, 0);
  // Buchführungsfehler nach erfolgreichem Versand macht die Mail nicht ungesendet
  const boese = new FakeStore([befund('k1', { severity: 'kritisch' })]); boese.markNotified = () => { throw new Error('Platte voll'); }; boese.save = () => { throw new Error('Platte voll'); };
  const it = notify.build(boese, c, 'daily', { now: JETZT }); const r = await notify.send(it, c, boese, { env: ENV, transport: async () => ({ ok: true, rejected: [] }) });
  assert.strictEqual(r.sent, 2); assert.ok(it.every(i => i.sent === true)); assert.match(r.reason, /Meldestatus konnte nicht gespeichert werden; Zeitfenster konnte nicht gespeichert werden/);
});

test('notify.writeOutbox: verträgt fehlende/beschädigte Datei, höchstens 200 Einträge, keine Reste', () => {
  const dir = path.join(tmp(), 'neu'); const eintrag = n => ({ channel: 'tageszusammenfassung', subject: 'S' + n, body: 'B', ids: [] });
  const f = notify.writeOutbox(dir, [eintrag(1), { ...eintrag(2), skip: true }, null, { channel: 'hinweis', subject: 'ohne ids', body: 'x' }]);
  let j = JSON.parse(fs.readFileSync(f, 'utf8')); assert.strictEqual(j.length, 3); assert.deepStrictEqual(j.map(e => e.sent), [false, false, false]); assert.strictEqual(j[1].skip, true); assert.deepStrictEqual(j[2].ids, []);
  fs.writeFileSync(f, '{ kaputt'); notify.writeOutbox(dir, [{ ...eintrag(3), sent: true }]);
  j = JSON.parse(fs.readFileSync(f, 'utf8')); assert.strictEqual(j.length, 1); assert.strictEqual(j[0].sent, true);
  notify.writeOutbox(dir, Array.from({ length: 230 }, (_, n) => eintrag(n)));
  j = JSON.parse(fs.readFileSync(f, 'utf8')); assert.strictEqual(j.length, 200); assert.strictEqual(j[199].subject, 'S229');
  assert.deepStrictEqual(fs.readdirSync(dir), ['notifications.json'], 'keine liegen gebliebene Temp-Datei');
});

// ── Zusammenspiel mit dem echten IssueStore und der Vorschau ────────────────
test('Ablauf wie im Prüflauf: build → send → writeOutbox mit dem echten IssueStore', async () => {
  const { IssueStore } = require('../lib/issues'); const dir = tmp(); const c = cfg({ enabled: true, to: 'eins@beispiel.test' });
  const store = new IssueStore(dir); const regeln = ['erreichbarkeit-verlust', 'preis-abweichend'];
  store.apply([{ rule: 'erreichbarkeit-verlust', severity: 'kritisch', url: 'https://kfz-zulassungsprofis.de/auftrag/', title: 'Kernseite nicht erreichbar', key: 'k' }, { rule: 'preis-abweichend', severity: 'hoch', url: 'https://kfz-zulassungsprofis.de/preise/', title: 'Preis weicht ab', key: 'p', approval: 'preis' }], { runId: 't1', scope: regeln, kind: 'daily' });
  const gesendet = []; const transport = async o => { gesendet.push(o.subject); return { ok: true, rejected: [] }; };
  const items = notify.build(store, c, 'daily', { score: 90 }); const res = await notify.send(items, c, store, { env: ENV, transport }); notify.writeOutbox(dir, items);
  assert.deepStrictEqual(res, { sent: 2, failed: 0 }); assert.strictEqual(gesendet.length, 2);
  const neu = new IssueStore(dir); // von der Platte: Meldestatus und Zeitfenster sind gespeichert
  assert.strictEqual(neu.open().find(i => i.severity === 'kritisch').notified.channel, 'sofort'); assert.ok(neu.state.lastDigest.tag);
  assert.deepStrictEqual(notify.build(neu, c, 'daily', {}).map(i => [i.channel, !!i.skip]), [['tageszusammenfassung', true]], 'zweiter Lauf: nichts Neues');
  // kritischer Punkt verschwindet → Erfolg in der nächsten Zusammenfassung (der nächste Lauf liegt zeitlich NACH der letzten Mail)
  await new Promise(r => setTimeout(r, 10));
  neu.apply([{ rule: 'preis-abweichend', severity: 'hoch', url: 'https://kfz-zulassungsprofis.de/preise/', title: 'Preis weicht ab', key: 'p', approval: 'preis' }], { runId: 't2', scope: regeln, kind: 'daily' });
  const danach = notify.build(neu, c, 'daily', {}); assert.deepStrictEqual(danach.map(i => i.channel), ['tageszusammenfassung']); assert.match(danach[0].subject, /0 neu wichtig, 1 behoben$/);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(dir, 'notifications.json'), 'utf8')).map(e => e.sent), [true, true]);
});

test('bin/preview-mails.js: schreibt KFZ-Beispiele nach previews/, sendet nichts', () => {
  const dir = tmp();
  // SMTP zeigt absichtlich ins Leere: Würde das Skript senden, schlüge es hier fehl oder bliebe hängen.
  const r = spawnSync(process.execPath, [path.join(__dirname, '..', 'bin', 'preview-mails.js'), '--beispiel'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, SEO_DATA_DIR: dir, SEO_BASE: 'https://kfz-zulassungsprofis.de', SEO_NOTIFY: '1', SEO_NOTIFY_TO: 'vorschau@beispiel.test', SMTP_HOST: '127.0.0.1', SMTP_PORT: '9', SMTP_USER: USER, SMTP_PASSWORD: PASS } });
  assert.strictEqual(r.status, 0, r.stderr); assert.ok(!r.stdout.includes('@') && !r.stdout.includes(PASS), 'Konsole ohne Adressen und Zugangsdaten');
  const dateien = fs.readdirSync(path.join(dir, 'previews')).sort();
  assert.deepStrictEqual(dateien, ['01-tageszusammenfassung.txt', '02-tageszusammenfassung-ohne-neuigkeiten.txt', '03-wochenzusammenfassung.txt', '04-monatszusammenfassung.txt', '05-sofortmeldung-SIMULIERT.txt']);
  const lies = n => fs.readFileSync(path.join(dir, 'previews', n), 'utf8');
  assert.match(lies(dateien[0]), /Betreff: \[SEO-Autopilot\] kfz-zulassungsprofis\.de – Tageszusammenfassung: /); assert.match(lies(dateien[1]), /WÜRDE NICHT GESENDET/);
  assert.match(lies(dateien[2]), /– Wochenzusammenfassung: /); assert.match(lies(dateien[3]), /– Monatszusammenfassung: /); assert.match(lies(dateien[4]), /SIMULIERT: Kernseite nicht mehr erreichbar/);
  for (const n of dateien) { const t = lies(n); assert.match(t, /TESTVORSCHAU – nicht versendet/); assert.ok((t.match(/[a-z0-9-]+\.de\b/g) || []).every(d => d === 'kfz-zulassungsprofis.de'), n + ': keine andere Domain als die eigene'); assert.ok(!t.includes(PASS)); }
  assert.deepStrictEqual(fs.readdirSync(dir), ['previews'], 'außer den Vorschauen entsteht nichts im Datenordner');
});

test('Versand ohne Zusatzpakete: notify.js und smtp.js laden nur Node-Bordmittel und eigene Module', () => {
  for (const f of ['lib/notify.js', 'lib/smtp.js']) {
    const q = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
    const module = [...q.matchAll(/require\('([^']+)'\)/g)].map(m => m[1]);
    assert.ok(module.length && module.every(m => /^(node:)?(fs|path|net|tls|crypto)$/.test(m) || m.startsWith('./')), f + ': ' + module.join(', '));
  }
});
