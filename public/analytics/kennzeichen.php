<?php
/**
 * Kennzeichenassistent im Analytics-Dashboard: https://kfz-zulassungsprofis.de/analytics/kennzeichen.php
 * Nutzung, KI-Verbrauch und -Kosten, Limits, Aus-Schalter, Zustand der Schnittstellen, Fehler.
 * Nur mit Login (derselbe wie das Analytics-Dashboard). Daten: kennzeichen-daten.php.
 */

declare(strict_types=1);

require __DIR__ . '/../api/analytics-lib.php';

kzp_require_auth();
header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="robots" content="noindex,nofollow">
<title>Kennzeichenassistent – Zulassungsprofis Analytics</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
  /* Optik wie analytics/dashboard.html */
  :root {
    --bg: #0A1224; --bg-2: #0D1630; --card: #111C36; --card-2: #16233F;
    --line: rgba(255,255,255,.07); --line-2: rgba(255,255,255,.12);
    --text: #E6ECF5; --muted: #8A97AE; --dim: #5B6880;
    --acc: #4C8DFF; --acc-2: #79A9FF; --acc-dim: rgba(76,141,255,.16);
    --amber: #F5A500; --green: #10B981; --red: #EF4444;
    --radius: 14px; --radius-s: 10px;
    --font: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  [hidden] { display: none !important; }
  html { color-scheme: dark; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  a { color: var(--acc-2); }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 22px 20px 60px; }
  header { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; margin-bottom: 20px; }
  header h1 { font-size: 22px; font-weight: 800; letter-spacing: -.015em; }
  header p { color: var(--muted); font-size: 13px; }
  .spacer { flex: 1; }
  .seg { display: inline-flex; border: 1px solid var(--line-2); border-radius: 10px; overflow: hidden; background: var(--card); }
  .seg button { background: transparent; border: 0; color: var(--muted); padding: 8px 14px; font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
  .seg button + button { border-left: 1px solid var(--line); }
  .seg button.active { background: var(--acc); color: #fff; }
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px 16px; }
  .kpi b { display: block; font-size: 26px; font-weight: 800; letter-spacing: -.02em; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .kpi span { font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); font-weight: 700; }
  .kpi small { display: block; color: var(--dim); font-size: 11.5px; margin-top: 2px; }
  .grid { display: grid; gap: 16px; margin-bottom: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px 20px; min-width: 0; }
  .card h2 { font-size: 13px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 4px; }
  .card > p { color: var(--muted); font-size: 12.5px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; font-variant-numeric: tabular-nums; }
  th { text-align: left; color: var(--muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; padding: 6px 8px 6px 0; border-bottom: 1px solid var(--line-2); }
  td { padding: 7px 8px 7px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  td.r, th.r { text-align: right; padding-right: 0; }
  .bar { height: 6px; border-radius: 3px; background: var(--acc-dim); margin-top: 4px; }
  .bar i { display: block; height: 100%; border-radius: 3px; background: var(--acc); }
  .pill { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
  .ok { background: rgba(16,185,129,.16); color: #4ADE9E; } .warn { background: rgba(245,165,0,.14); color: var(--amber); }
  .bad { background: rgba(239,68,68,.14); color: #FF8A8A; } .grey { background: rgba(255,255,255,.07); color: var(--muted); }
  .note { padding: 11px 14px; border-radius: var(--radius-s); background: rgba(255,255,255,.03); border: 1px solid var(--line); font-size: 12.5px; color: var(--muted); margin-top: 12px; }
  .note.warn { background: rgba(245,165,0,.06); border-color: rgba(245,165,0,.3); color: #F2D28B; }
  .zeile { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 6px 16px; padding: 9px 0; border-bottom: 1px solid var(--line); }
  .zeile:last-child { border-bottom: 0; }
  form .feld { display: grid; grid-template-columns: minmax(0, 1fr) 110px; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--line); }
  form label { font-size: 13px; }
  form label small { display: block; color: var(--dim); font-size: 11.5px; }
  input, select { background: var(--bg); border: 1px solid var(--line-2); color: var(--text); padding: 8px 10px; border-radius: 10px; font: inherit; font-size: 13px; width: 100%; }
  input:focus, select:focus, button:focus-visible { outline: 2px solid var(--acc); outline-offset: 1px; }
  .btn { display: inline-flex; align-items: center; padding: 9px 16px; border-radius: 10px; border: 1px solid var(--line-2); background: var(--card-2); color: var(--text); font: inherit; font-weight: 700; font-size: 13px; cursor: pointer; }
  .btn.primary { background: var(--acc); border-color: var(--acc); color: #fff; }
  .btn.stop { background: rgba(239,68,68,.16); border-color: rgba(239,68,68,.4); color: #FFB4B4; }
  .aktionen { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 14px; }
  .leer { padding: 18px 0; color: var(--dim); font-size: 13px; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>Kennzeichenassistent</h1>
      <p><a href="./">← Analytics-Dashboard</a> · <a href="/wunschkennzeichen-generator/" target="_blank" rel="noopener">Assistent öffnen ↗</a></p>
    </div>
    <div class="spacer"></div>
    <div class="seg" id="zeitraum">
      <button type="button" data-days="1">Heute</button>
      <button type="button" data-days="7">7 Tage</button>
      <button type="button" data-days="30" class="active">30 Tage</button>
      <button type="button" data-days="90">90 Tage</button>
    </div>
  </header>

  <div id="meldung" class="note warn" hidden></div>
  <div id="inhalt"><p class="leer">Daten werden geladen …</p></div>
</div>

<script>
// Absolut und ohne Zugangsdaten in der Adresse (wie dashboard.html).
const API = location.origin + location.pathname.replace(/[^/]*$/, '') + 'kennzeichen-daten.php';
let tage = 30;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const zahl = (n) => Number(n || 0).toLocaleString('de-DE');
const usd = (n, stellen = 2) => Number(n || 0).toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: Math.max(stellen, 4) }) + ' $';
const datum = (iso) => new Date(String(iso).replace(' ', 'T')).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const MODUS = { start: 'Erste Ideen nach Bezirkswahl', initialen: 'Initialen', name: 'Name', datum: 'Geburtstag / Jahrestag', zahl: 'Glückszahl', paar: 'Für uns zwei',
  kurz: 'Möglichst kurz', stil: 'Stil oder Kennzeichenart', ueberraschung: 'KI, überrasche mich', text: 'Freier Text im Gespräch', eingabe: 'Eigene Kombination getippt',
  aehnliche: 'Ähnliche finden', mehr: 'Weitere Ideen' };

function kpi(wert, name, sub = '') { return `<div class="kpi"><span>${esc(name)}</span><b>${wert}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>`; }

function rangliste(liste, namen = {}) {
  if (!liste.length) return '<p class="leer">Noch keine Daten in diesem Zeitraum.</p>';
  const max = Math.max(...liste.map((x) => x.n));
  return '<table><tbody>' + liste.map((x) => `<tr><td>${esc(namen[x.name] || x.name)}<div class="bar"><i style="width:${Math.round((x.n / max) * 100)}%"></i></div></td><td class="r">${zahl(x.n)}</td></tr>`).join('') + '</tbody></table>';
}

function zeichne(d) {
  const n = d.nutzung, ki = d.ki, s = d.status, e = d.einstellungen;
  const zustand = !s.kiEingerichtet ? ['Nicht eingerichtet', 'grey'] : s.kiZustand === 'aktiv' ? ['Aktiv', 'ok'] : s.kiZustand === 'limit' ? ['Limit erreicht', 'warn'] : ['Pausiert', 'bad'];
  const budget = Number(e.limit_monat_usd) || 0;
  const verbraucht = budget > 0 ? Math.min(100, Math.round((ki.monat.kostenUsd / budget) * 100)) : 0;
  const quote = n.uebergaben > 0 ? Math.round((n.bestellungen / n.uebergaben) * 100) + ' % der Weiterleitungen' : '';

  document.getElementById('inhalt').innerHTML = `
    <div class="kpis">
      ${kpi(zahl(n.sitzungen), 'Nutzungen', 'Sitzungen mit gewähltem Bezirk')}
      ${kpi(zahl(n.vorschlaege), 'Vorschläge', zahl(n.runden) + ' Runden')}
      ${kpi(zahl(n.pruefungen), 'Verfügbarkeit geprüft', zahl(n.behoerde) + ' × weiter zur Behörde')}
      ${kpi(zahl(n.auswahlen), 'Ausgewählt', zahl(n.gemerkt) + ' gemerkt · ' + zahl(n.geteilt) + ' geteilt')}
      ${kpi(zahl(n.uebergaben), 'Weiter zum Auftrag', zahl(n.mitService) + ' mit Wunschkennzeichen-Service')}
      ${kpi(zahl(n.bestellungen), 'Zugeordnete Aufträge', quote)}
      ${kpi(zahl(ki.anfragen), 'KI-Anfragen', zahl(ki.ausVorrat) + ' weitere aus dem Vorrat (kostenlos)')}
      ${kpi(usd(ki.kostenUsd), 'KI-Kosten', 'je Anfrage ' + usd(ki.kostenJeAnfrageUsd, 4))}
    </div>

    <div class="grid">
      <section class="card">
        <h2>KI: Zustand und Budget</h2>
        <p>Der Generator im Browser läuft immer. Diese Schalter betreffen nur die KI-Ideen.</p>
        <div class="zeile"><span>Zustand</span><span class="pill ${zustand[1]}">${zustand[0]}</span></div>
        ${s.pauseBis ? `<div class="zeile"><span>Automatische Pause bis</span><span>${esc(datum(s.pauseBis))}</span></div>` : ''}
        <div class="zeile"><span>Heute</span><span>${zahl(ki.heute.anfragen)} von ${zahl(e.limit_tag)} Anfragen · ${usd(ki.heute.kostenUsd, 4)}</span></div>
        <div class="zeile"><span>Dieser Monat</span><span>${usd(ki.monat.kostenUsd)} von ${usd(budget)} (${verbraucht} %)</span></div>
        <div class="bar"><i style="width:${verbraucht}%"></i></div>
        <div class="zeile"><span>Token im Zeitraum</span><span>${zahl(ki.inputTokens + ki.cacheWriteTokens)} Eingabe · ${zahl(ki.cacheReadTokens)} aus dem Cache · ${zahl(ki.outputTokens)} Ausgabe</span></div>
        <div class="zeile"><span>Antwortzeit im Mittel</span><span>${zahl(ki.dauerMs)} ms</span></div>
        <div class="zeile"><span>Fehler · abgelehnt</span><span>${zahl(ki.fehler)} · ${zahl(ki.abgelehnt)}</span></div>
        <div class="aktionen">
          ${e.ki_aktiv === '1' ? '<button class="btn stop" data-ki="0" type="button">KI pausieren</button>' : '<button class="btn primary" data-ki="1" type="button">KI wieder einschalten</button>'}
          ${s.pauseBis && e.ki_aktiv === '1' ? '<button class="btn" data-ki="1" type="button">Automatische Pause aufheben</button>' : ''}
          <button class="btn" data-vorrat="1" type="button"${s.vorrat ? '' : ' disabled'}>Ideenvorrat leeren (${zahl(s.vorrat)})</button>
        </div>
        <div class="note">„KI pausieren“ stoppt auch den Ideenvorrat für „überrasche mich“. Bei erreichtem Limit läuft der Vorrat weiter – er kostet nichts.</div>
        ${!s.kiEingerichtet ? '<div class="note warn">Kein API-Schlüssel hinterlegt. GitHub-Secret KENNZEICHEN_ANTHROPIC_API_KEY anlegen und neu deployen – bis dahin arbeitet der Assistent ohne KI.</div>' : ''}
        <div class="note">Kosten = Token × Listenpreis des Modells, also eine Schätzung. Verbindlich ist die Abrechnung in der Claude Console.</div>
      </section>

      <section class="card">
        <h2>Limits</h2>
        <p>Greift ein Limit, antwortet der Assistent mit Vorschlägen aus dem Generator – niemand sieht einen Fehler.</p>
        <form id="limits">
          <div class="feld"><label for="f1">Monatsbudget in US-Dollar<small>Geschätzte KI-Kosten je Kalendermonat</small></label><input id="f1" name="limit_monat_usd" inputmode="decimal" value="${esc(e.limit_monat_usd)}"></div>
          <div class="feld"><label for="f2">KI-Anfragen je Tag<small>Alle Besucher zusammen</small></label><input id="f2" name="limit_tag" inputmode="numeric" value="${esc(e.limit_tag)}"></div>
          <div class="feld"><label for="f3">Je Anschluss und Stunde</label><input id="f3" name="limit_ip_stunde" inputmode="numeric" value="${esc(e.limit_ip_stunde)}"></div>
          <div class="feld"><label for="f4">Je Anschluss und Tag</label><input id="f4" name="limit_ip_tag" inputmode="numeric" value="${esc(e.limit_ip_tag)}"></div>
          <div class="feld"><label for="f5">Alarm: Anfragen in 10 Minuten<small>Darüber pausiert die KI automatisch</small></label><input id="f5" name="alarm_10min" inputmode="numeric" value="${esc(e.alarm_10min)}"></div>
          <div class="feld"><label for="f6">Dauer der automatischen Pause (Minuten)</label><input id="f6" name="pause_minuten" inputmode="numeric" value="${esc(e.pause_minuten)}"></div>
          <div class="feld"><label for="f7">Modell<small>Nur an der echten API geprüfte Modelle</small></label>
            <select id="f7" name="modell">${d.modelle.map((m) => `<option${m === e.modell ? ' selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
          <div class="aktionen"><button class="btn primary" type="submit">Limits speichern</button><span id="gespeichert" style="color:var(--muted);font-size:12.5px"></span></div>
        </form>
      </section>
    </div>

    <div class="grid">
      <section class="card"><h2>Häufige Zulassungsbezirke</h2><p>Nach gewähltem Bezirk.</p>${rangliste(d.bezirke)}</section>
      <section class="card"><h2>Häufige Suchoptionen</h2><p>Womit Vorschläge ausgelöst wurden.</p>${rangliste(d.modi, MODUS)}
        <div class="note">Herkunft der Vorschlagsrunden: ${zahl(d.quellen.generator)} Generator · ${zahl(d.quellen.ki)} KI · ${zahl(d.quellen.cache)} KI-Vorrat</div>
      </section>
    </div>

    <div class="grid">
      <section class="card">
        <h2>KI-Verbrauch nach Tag</h2><p>Anfragen, Token und geschätzte Kosten.</p>
        ${ki.tage.length ? '<table><thead><tr><th>Tag</th><th class="r">Anfragen</th><th class="r">Vorrat</th><th class="r">Token</th><th class="r">Kosten</th></tr></thead><tbody>' +
          ki.tage.slice(0, 31).map((t) => `<tr><td>${esc(t.tag.split('-').reverse().join('.'))}</td><td class="r">${zahl(t.anfragen)}</td><td class="r">${zahl(t.ausVorrat)}</td><td class="r">${zahl(t.tokens)}</td><td class="r">${usd(t.kostenUsd, 4)}</td></tr>`).join('') + '</tbody></table>'
          : '<p class="leer">Noch keine KI-Anfragen in diesem Zeitraum.</p>'}
      </section>
      <section class="card">
        <h2>KI-Verbrauch nach Monat</h2><p>Die letzten 14 Monate.</p>
        ${ki.monate.length ? '<table><thead><tr><th>Monat</th><th class="r">Anfragen</th><th class="r">Token</th><th class="r">Kosten</th></tr></thead><tbody>' +
          ki.monate.map((m) => `<tr><td>${esc(m.monat.split('-').reverse().join('/'))}</td><td class="r">${zahl(m.anfragen)}</td><td class="r">${zahl(m.tokens)}</td><td class="r">${usd(m.kostenUsd)}</td></tr>`).join('') + '</tbody></table>'
          : '<p class="leer">Noch keine KI-Anfragen.</p>'}
        <h2 style="margin-top:20px">Weiterleitungen nach Leistung</h2>
        ${rangliste(d.leistungen, { neuzulassung: 'Fahrzeug anmelden (Neuzulassung)', ummeldung: 'Ummeldung' })}
      </section>
    </div>

    <div class="grid">
      <section class="card">
        <h2>Schnittstellen</h2><p>Was angebunden ist und ob es läuft.</p>
        <div class="zeile"><span>Claude API (KI-Ideen)</span><span class="pill ${zustand[1]}">${zustand[0]}</span></div>
        <div class="zeile"><span>Regelwerk</span><span>${s.regeln ? `<span class="pill ok">geladen</span> Stand ${esc(String(s.regelnStand).split('-').reverse().join('.'))} · ${zahl(s.kuerzel)} Kürzel` : '<span class="pill bad">fehlt</span>'}</span></div>
        <div class="zeile"><span>Echtzeit-Verfügbarkeit</span><span>${s.anbieter.filter((a) => a.aktiv).length ? s.anbieter.filter((a) => a.aktiv).map((a) => `<span class="pill ok">${esc(a.name)}</span> ${zahl(a.bezirke)} Bezirke`).join(' ') : '<span class="pill grey">keine Quelle angebunden</span>'}</span></div>
        ${d.echtzeit.length ? '<table style="margin-top:8px"><thead><tr><th>Quelle</th><th>Ergebnis</th><th class="r">Anzahl</th></tr></thead><tbody>' + d.echtzeit.map((x) => `<tr><td>${esc(x.anbieter)}</td><td>${esc(x.status)}</td><td class="r">${zahl(x.n)}</td></tr>`).join('') + '</tbody></table>' : ''}
        <div class="note">Ohne angebundene Quelle zeigt der Assistent für jeden Bezirk „Prüfung erforderlich“ und verweist auf die Zulassungsbehörde. Eine offizielle bundesweite Schnittstelle gibt es nicht; Portale der Behörden werden nicht ausgelesen.</div>
        ${s.analyse ? `<div class="note warn">${esc(s.analyse)}</div>` : ''}
      </section>
      <section class="card">
        <h2>Technische Fehler</h2><p>Die letzten Meldungen im Zeitraum – ohne Inhalte aus Anfragen.</p>
        ${d.fehler.length ? '<table><thead><tr><th>Zeit</th><th>Stelle</th><th>Meldung</th></tr></thead><tbody>' + d.fehler.map((f) => `<tr><td>${esc(datum(f.created_at))}</td><td>${esc(f.stelle)} ${esc(f.code)}</td><td>${esc(f.meldung)}</td></tr>`).join('') + '</tbody></table>' : '<p class="leer">Keine Fehler in diesem Zeitraum.</p>'}
      </section>
    </div>`;
}

async function lade() {
  const m = document.getElementById('meldung');
  try {
    const r = await fetch(`${API}?days=${tage}`, { credentials: 'same-origin' });
    const d = await r.json();
    if (!d.ok) throw new Error(d.error || 'Fehler beim Laden');
    m.hidden = true;
    zeichne(d);
  } catch (e) {
    m.hidden = false;
    m.textContent = 'Die Daten konnten nicht geladen werden: ' + e.message;
  }
}

async function speichere(werte, hinweis, extra = {}) {
  const r = await fetch(API, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-KZA': '1' }, body: JSON.stringify({ einstellungen: werte, ...extra }) });
  const d = await r.json().catch(() => ({}));
  if (!d.ok) { alert('Speichern fehlgeschlagen: ' + (d.error || r.status)); return; }
  await lade();
  const el = document.getElementById('gespeichert');
  if (el && hinweis) el.textContent = hinweis;
}

document.getElementById('zeitraum').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-days]');
  if (!b) return;
  tage = Number(b.dataset.days);
  document.querySelectorAll('#zeitraum button').forEach((x) => x.classList.toggle('active', x === b));
  lade();
});
document.getElementById('inhalt').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-ki]');
  if (b) speichere({ ki_aktiv: b.dataset.ki });
  const v = e.target.closest('button[data-vorrat]');
  if (v && confirm('Alle gespeicherten KI-Ideen für „überrasche mich“ löschen? Der nächste Klick holt einen neuen Vorrat.')) speichere({}, '', { vorrat_leeren: true });
});
document.getElementById('inhalt').addEventListener('submit', (e) => {
  if (e.target.id !== 'limits') return;
  e.preventDefault();
  speichere(Object.fromEntries(new FormData(e.target)), 'Gespeichert.');
});
lade();
</script>
</body>
</html>
