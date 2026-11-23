'use strict';
// ─── Tägliche Pflichtprüfungen: Preise, Marke, Platzhalter, Pflichtangaben ───
// Läuft in jedem Lauf (auch täglich) über ALLE erreichbaren Seiten – auch über bewusst nicht indexierte
// (Impressum, Widerruf, Kennzeichenseiten), denn falsche Preise oder Platzhalter sind dort genauso sichtbar.
//
// Grundsätze:
// - Sollwerte kommen aus ctx.soll (lib/soll.js liest config/preise.json und config/betrieb.json). Fehlt ctx.soll,
//   entfallen die Preisprüfungen; ein Hinweis-Befund „soll-nicht-lesbar“ macht das sichtbar.
// - Behördenseiten (/zulassungsstelle/<ort>/) enthalten Angaben der Behörde (Gebühren, Zeiten, Hinweise). Die sind
//   keine Eigenaussagen: geprüft werden dort nur die Abschnitte, die den eigenen Dienst beschreiben (eigenText).
// - Gleiche Ursache = ein Befund: Treffer derselben Regel werden über alle Seiten gesammelt (Anzahl + Beispiele).
//   Ein Fehler im Seitenkopf erzeugt so einen Punkt statt 1.200. Schlüssel (key) enthalten keine Messwerte.
// - Zeitbezug: ctx.heute (Date oder „JJJJ-MM-TT“), sonst der Tag aus ctx.soll, sonst jetzt (Europe/Berlin).
const { flattenJsonLd } = require('../html');
const { pathOf, pageType } = require('../util');
const { fmt, tagBerlin, tageZwischen, tagDeutsch, INDEX_GATE_TAGE } = require('../soll');

const gruppe = 'Preise, Marke & Pflichtangaben';
const RULES = ['preis-alt', 'preis-abweichend', 'aktionspreis-abgelaufen', 'aktion-laeuft-aus', 'streichpreis', 'preis-gebuehren-widerspruch', 'altmarke-sichtbar', 'alte-mailadresse', 'platzhalter-sichtbar', 'render-fehler', 'entwicklerhinweis', 'impressum-pflichtangabe', 'behoerdendaten-pruefdatum', 'soll-nicht-lesbar'];

// Seiten ohne redaktionellen Inhalt (Fehlerseite, Bestätigungsdatei der Search Console) – keine Inhaltsprüfung
const NICHT_PRUEFEN = /^\/(?:404|_not-found)(?:\/|\.html)?$|^\/google[0-9a-f]{6,}\.html$/;
// Abschnitte (H2) einer Behördenseite, die den eigenen Dienst beschreiben. Alles andere dort sind Behördendaten.
// Die Einleitung vor der ersten Zwischenüberschrift zählt immer als eigener Text.
const EIGENE_ABSCHNITTE = [/Zulassungsvorgänge/i, /Typische Unterlagen/i, /Häufige Fragen/i, /Bereit für/i, /Online zulassen/i, /Leistungen und (?:Fest)?[Pp]reise/i];
const ZITAT_BEHOERDE = /(?:Behörde|Stadt|Landratsamt|Kreisverwaltung|Zulassungsstelle)\b[^.„“”"]{0,40}:\s*„[^“”]{0,600}[“”]/g;
const ZITAT_LANG = /„[^“”]{40,600}[“”]/g;
// Vorwarnung vor dem Index-Gate der Website: so viele Tage vor dem Stichtag wird gewarnt
const PRUEFDATUM_VORWARNUNG = { mittel: 33, kritisch: 7 };
// Vorwarnung vor dem Ende einer befristeten Preisaktion (Tage)
const AKTION_VORWARNUNG = { mittel: 14, hoch: 3 };
// Je Lauf (ctx): abgelaufene Aktion wird noch angezeigt – von run() gesetzt, von geprueft() gelesen
const AKTION_NOCH_SICHTBAR = new WeakMap();

// ─── Gemeinsame Helfer (auch von content.js und faq.js verwendet) ────────────
const pfad = rec => rec.path || pathOf(rec.url);
const typ = rec => rec.typ || pageType(pfad(rec));
const esc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ohneLeer = o => { for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k]; return o; };

/** Alle prüfbaren Seiten (Status 200, HTML ausgewertet), nach URL sortiert – auch noindex-Seiten. */
function seiten(crawl) {
  return [...crawl.pages.values()].filter(r => r && r.page && r.status === 200 && !NICHT_PRUEFEN.test(pfad(r))).sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0));
}
/** „Heute“ als Kalendertag (JJJJ-MM-TT, Europe/Berlin). */
function heuteTag(ctx) {
  if (ctx && ctx.heute !== undefined && ctx.heute !== null) return tagBerlin(ctx.heute);
  if (ctx && ctx.soll && ctx.soll.heute) return ctx.soll.heute;
  return tagBerlin(new Date());
}
const MONATE = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
const MONAT_RE = 'Januar|Februar|März|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember';
/** Tag, Monat (Zahl oder Name), Jahr → „JJJJ-MM-TT“ oder null bei ungültigem Datum. */
function datum(tag, monat, jahr) {
  const m = /^\d+$/.test(String(monat)) ? Number(monat) : MONATE.indexOf(String(monat).toLowerCase()) + 1;
  const d = Number(tag), y = Number(jahr);
  if (!(m >= 1 && m <= 12) || !(d >= 1 && d <= 31) || !(y >= 2000 && y <= 2100)) return null;
  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const t = new Date(iso + 'T00:00:00Z');
  return Number.isNaN(t.getTime()) || t.getUTCDate() !== d ? null : iso;
}
/** Tag plus n Tage. */
const plusTage = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400e3).toISOString().slice(0, 10);

/** Textausschnitt rund um eine Fundstelle (für detail/current). */
function ausschnitt(text, index, laenge, vor = 70, nach = 70) {
  const a = Math.max(0, index - vor), e = Math.min(text.length, index + laenge + nach);
  return (a > 0 ? '…' : '') + text.slice(a, e).trim() + (e < text.length ? '…' : '');
}
// Abkürzungen, deren Punkt keinen Satz beendet
const ABK = /(?:\b(?:z|u|d|o|i|s|v)|\bB|\bbzw|\bca|\binkl|\bzzgl|\bggf|\bevtl|\bvgl|\bNr|\bAbs|\bArt|\bStr|\bTel|\bmax|\bmin|\bmind|\busw|\betc|\bamtl|\bbzgl|\bgem|\bsog|\bStd|\bMin|\bMo|\bDi|\bMi|\bDo|\bFr|\bSa|\bSo|\d)$/;
/** Der Satz rund um eine Fundstelle (Grenzen: . ! ? vor Großbuchstaben; Abkürzungen und Datumsangaben zählen nicht). */
function satzUm(text, index, max = 320) {
  const grenze = i => /[.!?]/.test(text[i]) && text[i + 1] === ' ' && /[A-ZÄÖÜ„"“(0-9]/.test(text[i + 2] || '') && !(text[i] === '.' && ABK.test(text.slice(Math.max(0, i - 6), i)));
  let a = index; while (a > 0 && index - a < max && !grenze(a - 1)) a--;
  if (a > 0 && grenze(a - 1)) a++;
  let e = index; while (e < text.length && e - index < max && !grenze(e)) e++;
  return text.slice(a, Math.min(text.length, e + 1)).trim();
}
/** Text in Sätze zerlegen (gleiche Grenzen wie satzUm: Abkürzungen und Datumsangaben beenden keinen Satz). */
function saetze(text) {
  const s = String(text || ''); const out = []; let a = 0;
  for (let i = 0; i < s.length; i++) {
    if (!/[.!?]/.test(s[i]) || s[i + 1] !== ' ' || !/[A-ZÄÖÜ„"“(0-9]/.test(s[i + 2] || '')) continue;
    if (s[i] === '.' && ABK.test(s.slice(Math.max(0, i - 6), i))) continue;
    out.push(s.slice(a, i + 1).trim()); a = i + 2;
  }
  if (a < s.length) out.push(s.slice(a).trim());
  return out.filter(Boolean);
}
/** Wörtliche Zitate der Behörde („Die Behörde gibt dazu an: „…““) und lange Zitate entfernen – sie sind keine Eigenaussage. */
const ohneZitate = s => String(s || '').replace(ZITAT_BEHOERDE, ' ').replace(ZITAT_LANG, ' ');

/** Hauptinhalt in Abschnitte je H2 zerlegen: [{ titel, text }]; der erste Abschnitt (titel '') ist die Einleitung. */
function abschnitte(pg) {
  const text = pg.text || ''; const fuss = pg.textFuss || '';
  const h2 = (pg.headings || []).filter(h => h && h.level === 2 && h.text).map(h => h.text);
  // Überschriften des Seitenfußes stehen am Ende der Liste und gehören nicht zum Hauptinhalt
  let ende = h2.length; while (ende > 0 && fuss.includes(h2[ende - 1])) ende--;
  const out = []; let pos = 0, titel = '';
  for (const h of h2.slice(0, ende)) { const i = text.indexOf(h, pos); if (i < 0) continue; out.push({ titel, text: text.slice(pos, i).trim() }); titel = h; pos = i + h.length; }
  out.push({ titel, text: text.slice(pos).trim() });
  return out;
}
/**
 * Eigener Text einer Seite (Aussagen über den eigenen Dienst). Auf Behördenseiten ohne die Abschnitte mit
 * Behördendaten (Gebühren, Öffnungszeiten, Hinweise der Behörde); auf allen anderen Seiten der ganze Hauptinhalt.
 */
function eigenText(rec, cfg) {
  const pg = rec.page; if (!pg) return '';
  if (typ(rec) !== 'behoerde') return pg.text || '';
  const marke = cfg && cfg.company && cfg.company.brand ? new RegExp(esc(cfg.company.brand), 'i') : null;
  const eigen = abschnitte(pg).filter(a => a.titel === '' || EIGENE_ABSCHNITTE.some(re => re.test(a.titel)) || (marke && marke.test(a.titel))).map(a => (a.titel ? a.titel + ' ' : '') + a.text).join(' ¶ ');
  // Wörtliche Zitate der Behörde („Die Behörde gibt dazu an: „…““) stehen auch in eigenen Abschnitten – sie sind keine Eigenaussage
  return ohneZitate(eigen);
}
/** Texte aus strukturierten Daten (Fragen, Antworten, Beschreibungen) – ohne Angaben zu Behörden (GovernmentOffice). */
function ldTexte(pg) {
  const out = []; const TEXT = new Set(['name', 'description', 'text', 'headline', 'alternateName']);
  const istBehoerde = x => [].concat(x['@type'] || []).some(t => /GovernmentOffice|GovernmentOrganization/.test(String(t)));
  const walk = x => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { x.forEach(walk); return; }
    if (istBehoerde(x)) return;
    for (const [k, v] of Object.entries(x)) { if (typeof v === 'string') { if (TEXT.has(k)) out.push(v.replace(/<[^>]+>/g, ' ')); } else walk(v); }
  };
  walk(pg.jsonld || []);
  return out;
}

/** Treffer je Regel + Schlüssel über alle Seiten sammeln (je Seite zählt der erste Treffer). */
function sammler() {
  const m = new Map();
  return {
    add(rule, key, rec, info) { const k = rule + '\u0000' + key; let g = m.get(k); if (!g) { g = { rule, key, treffer: new Map() }; m.set(k, g); } if (!g.treffer.has(rec.url)) g.treffer.set(rec.url, info || {}); },
    gruppen(rule) { return [...m.values()].filter(g => g.rule === rule).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)); },
  };
}
/**
 * Befund aus einer Treffergruppe. o: { severity, approval, titel, suggestion?, reason?, risk?, proposed?, file?, hinweis? }
 * - ohne o.file       → EIN Befund für die Website (url = Startseite, key „alle:…“) mit Anzahl und Beispielen –
 *                       auch bei nur einer Seite (dann steht die Seite im Titel). So bleibt die Kennung gleich,
 *                       wenn die Zahl der Seiten zwischen 1 und mehreren wechselt (sonst „behoben“ + „neu“ zugleich).
 * - o.file gesetzt    → immer ein Befund an der Quelldatei (z. B. config/preise.json), unabhängig von der Seitenzahl
 */
function befund(g, base, o) {
  const urls = [...g.treffer.keys()].sort(); const n = urls.length; const erste = g.treffer.get(urls[0]) || {};
  const bsp = urls.slice(0, 20).map(u => { const i = g.treffer.get(u) || {}; return ohneLeer({ url: u, title: `${o.titel}: ${pathOf(u)}`, current: i.current, detail: i.detail }); });
  const kopf = { rule: g.rule, severity: o.severity, approval: o.approval || 'manuell' };
  const rest = { suggestion: o.suggestion, reason: o.reason, risk: o.risk, current: erste.current, proposed: o.proposed };
  const wo = `${urls.slice(0, 5).map(pathOf).join(', ')}${n > 5 ? ' …' : ''}`;
  const detail = [o.hinweis, n > 1 ? `Betroffen: ${wo}.` : '', erste.detail ? (n > 1 ? `Beispiel ${pathOf(urls[0])}: ` : '') + erste.detail : ''].filter(Boolean).join(' ');
  if (o.file) return ohneLeer({ ...kopf, file: o.file, key: g.key, title: n === 1 ? `${o.titel}: ${pathOf(urls[0])}` : `${o.titel} – ${n} Seiten`, detail, ...rest, count: n, examples: bsp });
  return ohneLeer({ ...kopf, url: base + '/', key: 'alle:' + g.key, title: n === 1 ? `${o.titel}: ${pathOf(urls[0])}` : `${o.titel} – ${n} Seiten`, detail: n === 1 ? [o.hinweis, `Seite: ${pathOf(urls[0])}.`, erste.detail].filter(Boolean).join(' ') : detail, ...rest, count: n, examples: bsp });
}

// ─── Preise ──────────────────────────────────────────────────────────────────
const ZAHL = String.raw`(?<![\d.,])(\d{1,3}(?:,\d{2})?)(?![\d,]) ?(?:€|Euro\b|EUR\b)`;
const LEISTUNGEN = 'Neuzulassung|Ummeldung|Umschreibung|Halterwechsel|Wiederzulassung|Abmeldung|Adressänderung';
const SLUG = { zulassung: 'neuzulassung', neuzulassung: 'neuzulassung', ummeldung: 'ummeldung', umschreibung: 'halterwechsel', halterwechsel: 'halterwechsel', wiederzulassung: 'wiederzulassung', abmeldung: 'abmeldung', 'adressänderung': 'adressaenderung' };
const NAME = { neuzulassung: 'Zulassung', ummeldung: 'Ummeldung', halterwechsel: 'Halterwechsel', wiederzulassung: 'Wiederzulassung', abmeldung: 'Abmeldung', adressaenderung: 'Adressänderung', kennzeichenschilder: 'Kennzeichenschilder', wunschkennzeichen: 'Wunschkennzeichen' };
const normBetrag = s => (String(s).includes(',') ? String(s) : s + ',00');
// Ungefähre Angaben, Spannen und Vergleichswerte sind keine Eigenpreise („ca. 20,00 € – 35,00 €“, „statt 31,20 €“)
const UNGEFAEHR_VOR = /(?:\bca\.?|\bcirca|\betwa|\brund|\bungefähr|\bbis|\bstatt|[–-]|\bzwischen\s+\d[\d.,]*(?:\s?€)?\s+und)\s*$/i;
const SPANNE_NACH = /^\s*(?:–|-|bis)\s*\d/;
const FREMD_ZWISCHEN = /Schalter|Behörde|amtlich|Gebühr|Steuer|Versicherung|Schildermacher|Markt|vor Ort/i;
const ungefaehr = (text, i, len) => UNGEFAEHR_VOR.test(text.slice(Math.max(0, i - 24), i)) || SPANNE_NACH.test(text.slice(i + len, i + len + 8));

/** Prüfmuster für Eigenpreise aufbauen (einmal je Lauf). */
function preisMuster(P, cfg) {
  const marke = cfg && cfg.company && cfg.company.brand ? esc(cfg.company.brand) : 'KFZ-Zulassungsprofis';
  const a = P.aktion;
  const aktionAbgelaufen = !!(a && !a.aktiv);
  // Aktionspreis, der nach Ablauf nicht mehr gilt (nur wenn er sich vom regulären Preis unterscheidet)
  const aktionsPreis = aktionAbgelaufen && !P.erlaubt.has(fmt(a.preis)) ? fmt(a.preis) : null;
  // Steht der abgelaufene Aktionspreis auch in der Altpreis-Liste, meldet ihn nur „aktionspreis-abgelaufen“ (eine Ursache, ein Befund).
  // Nach dem Zurückstellen der Konfiguration (Block „aktion“ entfernt) greift wieder die Altpreis-Liste.
  const alt = P.alt.filter(x => x !== aktionsPreis);
  const altRe = alt.length ? new RegExp(String.raw`(?<![\d.,])(${alt.map(x => (x.endsWith(',00') ? esc(x.slice(0, -3)) + '(?:,00)?' : esc(x))).join('|')})(?![\d,]) ?(?:€|Euro\b|EUR\b)`, 'g') : null;
  const aktionRe = aktionsPreis ? new RegExp(String.raw`(?<![\d.,])(${esc(aktionsPreis.slice(0, -3))}(?:,00)?)(?![\d,]) ?(?:€|Euro\b|EUR\b)`, 'g') : null;
  const aktionText = aktionAbgelaufen ? new RegExp(`${esc(a.name)}|\\bbis (?:zum )?${esc(a.gueltigBisText)}`, 'g') : null;
  const muster = [
    // „Abmeldung 34,00 €“, „Zulassung: 110,00 €“ – Betrag steht direkt hinter der Leistung
    { re: new RegExp(String.raw`(?<![A-Za-zÄÖÜäöüß-])(${LEISTUNGEN}|Zulassung):? ${ZAHL}`, 'g'), leistung: m => SLUG[m[1].toLowerCase()], betrag: 2 },
    // „Festpreis: 110,00 €“, „zum Festpreis von 110,00 €“
    { re: new RegExp(String.raw`\b(?:Festpreis|Komplettpreis)(?: von| ab)?:? ${ZAHL}`, 'g'), betrag: 1 },
    // „… Ummeldung und Umschreibung kosten 110,00 €“, „Halterwechsel … für 110,00 €“
    { re: new RegExp(String.raw`(?<![A-Za-zÄÖÜäöüß])(?:${LEISTUNGEN}|Zulassung)\b([^€.!?]{0,60}?\b(?:kostet|kosten|für)\b[^€.!?]{0,30}?)${ZAHL}`, 'g'), zwischen: 1, betrag: 2 },
    // „kosten bei uns 110,00 €“, „in unserem Preis von 12,00 €“, „über <Marke> … 34,00 €“
    { re: new RegExp(String.raw`(?:\b[Bb]ei uns\b|\b[Üü]ber uns\b|\b[Uu]nser\w* (?:Preis|Festpreis|Komplettpreis)\w*|\b(?:[Üü]ber|[Bb]ei) ${marke})([^€.!?]{0,60}?)${ZAHL}`, 'g'), zwischen: 1, betrag: 2 },
    // „29,00 € pro Paar“ (Kennzeichenschilder), „110,00 € je Zulassung“
    { re: new RegExp(String.raw`${ZAHL} (?:pro|je) Paar\b`, 'g'), leistung: () => 'kennzeichenschilder', betrag: 1 },
    { re: new RegExp(String.raw`${ZAHL} (?:je|pro) Zulassung\b`, 'g'), leistung: () => 'neuzulassung', betrag: 1 },
  ];
  const sollFuer = slug => (slug && P.leistungen[slug] !== undefined ? P.leistungen[slug] : slug && P.zusatz[slug] !== undefined ? P.zusatz[slug] : undefined);
  const altSet = new Set(alt);
  return { P, altRe, altSet, aktionsPreis, aktionRe, aktionText, aktionAbgelaufen, muster, sollFuer };
}
/** Preis-Fundstellen eines Textes: [{ art: 'alt'|'aktion'|'abweichend', key, gefunden, erwartet?, index, laenge }] */
function preisTreffer(text, M) {
  const out = []; if (!text) return out;
  if (M.altRe) for (const m of text.matchAll(M.altRe)) { if (ungefaehr(text, m.index, m[0].length)) continue; out.push({ art: 'alt', key: 'alt:' + normBetrag(m[1]), gefunden: normBetrag(m[1]), index: m.index, laenge: m[0].length }); }
  if (M.aktionRe) for (const m of text.matchAll(M.aktionRe)) { if (ungefaehr(text, m.index, m[0].length)) continue; out.push({ art: 'aktion', key: 'aktion', gefunden: normBetrag(m[1]), index: m.index, laenge: m[0].length }); }
  if (M.aktionText) for (const m of text.matchAll(M.aktionText)) out.push({ art: 'aktion', key: 'aktion', gefunden: m[0], hinweistext: true, index: m.index, laenge: m[0].length });
  for (const mu of M.muster) for (const m of text.matchAll(mu.re)) {
    const roh = m[mu.betrag]; const v = normBetrag(roh); const iZahl = m.index + m[0].lastIndexOf(roh);
    if (ungefaehr(text, iZahl, m.index + m[0].length - iZahl)) continue;
    if (mu.zwischen && FREMD_ZWISCHEN.test(m[mu.zwischen] || '')) continue;
    if (M.altSet.has(v) || v === M.aktionsPreis || M.P.amtlich.has(v)) continue; // Altpreis/Aktionspreis melden die Regeln oben; amtliche Gebühr ist kein Eigenpreis
    // Leistung nur, wenn das Muster sie selbst festlegt („Abmeldung 34,00 €“). Bei „Zulassung, Ummeldung und Abmeldung –
    // Festpreis 110,00 €“ oder „Wunschkennzeichen im Rahmen Ihrer Zulassung für 12,00 €“ ist die Zuordnung unsicher:
    // dann zählt nur, ob der Betrag überhaupt ein gültiger Eigenpreis ist.
    const slug = mu.leistung ? mu.leistung(m) : undefined; const soll = M.sollFuer(slug);
    if (soll !== undefined ? v === fmt(soll) : M.P.erlaubt.has(v)) continue;
    out.push({ art: 'abweichend', key: soll !== undefined ? 'leistung:' + slug : 'eigenpreis', gefunden: v, erwartet: soll !== undefined ? fmt(soll) : undefined, slug: soll !== undefined ? slug : undefined, index: m.index, laenge: m[0].length });
  }
  return out;
}
/** Leistung, die in einem Textstück zuletzt genannt wird (für Preise ohne direkt davorstehende Leistung): Slug oder undefined. */
const LEISTUNG_IM = new RegExp(String.raw`(?<![A-Za-zÄÖÜäöüß-])(${LEISTUNGEN}|Zulassung|Kennzeichenschild\w*|Schilder|Wunschkennzeichen)(?![a-zäöüß])`, 'gi');
function leistungIm(stueck) {
  let slug; for (const m of String(stueck || '').matchAll(LEISTUNG_IM)) { const w = m[1].toLowerCase(); slug = SLUG[w] || (/^(kennzeichenschild|schilder)/.test(w) ? 'kennzeichenschilder' : w === 'wunschkennzeichen' ? 'wunschkennzeichen' : undefined); }
  return slug;
}
/** Preisangaben in strukturierten Daten (Offer.price, lowPrice, highPrice) mit der Leistung des umgebenden Objekts (Service/Product). */
function offerPreise(pg) {
  const out = [];
  const walk = (x, leistung) => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) { x.forEach(y => walk(y, leistung)); return; }
    const typen = [].concat(x['@type'] || []).map(String);
    if (typen.some(t => /GovernmentOffice|GovernmentOrganization/.test(t))) return; // Behördenangaben
    const eigene = leistungIm([x.serviceType, x.name].filter(v => typeof v === 'string').join(' '));
    const l = eigene || leistung;
    if (typen.some(t => /^(Offer|AggregateOffer)$/.test(t))) for (const k of ['price', 'lowPrice', 'highPrice']) { if (x[k] === undefined || x[k] === null || x[k] === '') continue; const n = Number(String(x[k]).replace(',', '.')); if (Number.isFinite(n)) out.push({ feld: k, roh: String(x[k]), zahl: n, leistung: l }); }
    for (const [k, v] of Object.entries(x)) if (v && typeof v === 'object' && k !== '@context') walk(v, l);
  };
  walk(pg.jsonld || [], undefined);
  return out;
}
/** Textquellen einer Seite für Preis- und Aussagenprüfungen: [[Ort, Text]]. */
function textQuellen(rec, cfg) {
  const pg = rec.page; const og = pg.og || {};
  return [
    ['Seitenkopf (Menü)', pg.textKopf],
    // Rechner zeigen Rechenwerte (Summen, Vergleichskosten) – ihr Hauptinhalt ist keine Preisliste
    ['Seitentext', typ(rec) === 'rechner' ? '' : eigenText(rec, cfg)],
    ['Seitenfuß', pg.textFuss],
    ['Title', pg.title], ['Meta-Description', pg.description],
    ['Vorschau (Open Graph)', [og['og:title'], og['og:description']].filter(Boolean).join(' ¶ ')],
    ['Strukturierte Daten', ldTexte(pg).join(' ¶ ')],
  ].filter(q => q[1]);
}

// ─── Marke, Platzhalter, Entwicklerhinweise ──────────────────────────────────
const STREICHPREIS = /\bstatt\s+(?:bisher\s+|regulär\s+|zuvor\s+|vorher\s+|sonst\s+)?\d{2,3}(?:,\d{2})?\s?(?:€|Euro\b)|\b(?:regulär|bisher|vorher|früher)\s+\d{2,3}(?:,\d{2})?\s?(?:€|Euro\b)|\bUVP\b|\b\d{1,2}\s?%\s+(?:Rabatt|sparen|günstiger|Nachlass)\b/gi;
const STREICH_AUSNAHME = /amtlich|Gebühr|Schalter|vor Ort|Behörde|i-?Kfz/i;
const GEBUEHR_WIDERSPRUCH = /(?:\bzzgl\.?|\bzuzüglich|\bplus)\s+(?:der\s+|den\s+)?(?:amtliche[nr]?|behördliche[nr]?)\s+Gebühr/gi;
const PLATZHALTER = [
  ['entwurf-banner', /Platzhalter-Entwurf/g],
  ['todo', /\[\s*TODO[^\]]*\]|\bTODO\b|\bFIXME\b/g],
  ['blindtext', /[Ll]orem ipsum|\bBlindtext\b/g],
  ['mustername', /\bMustermann\b|\bMusterstra(?:ß|ss)e\b/g],
  ['luecke', /\[(?:X{1,3}|Verfahren|Firma[^\]]*|Signaturdienst[^\]]*|Region|\d{1,2}(?::\d\d)?)\]/g],
];
const PLATZHALTER_NAME = { 'entwurf-banner': 'Entwurfshinweis „Platzhalter-Entwurf“', todo: 'TODO-/FIXME-Vermerk', blindtext: 'Blindtext', mustername: 'Mustername/-adresse', luecke: 'Nicht ausgefüllte Lücke in eckigen Klammern' };
const RENDER = [
  ['undefined', /\bundefined\b/g], ['nan', /\bNaN\b/g], ['object', /\[object Object\]/g], ['vorlage', /\$\{[^}]{1,60}\}|\{\{[^}]{1,60}\}\}/g],
];
const RENDER_NAME = { undefined: '„undefined“ im Text', nan: '„NaN“ im Text', object: '„[object Object]“ im Text', vorlage: 'Nicht ersetzte Vorlagen-Variable' };
const ENTWICKLUNG = /\blocalhost\b|\b127\.0\.0\.1\b|github\.io\b|kasserver\.com\b/gi;
const INTERN = /NEXT_PUBLIC_|config\/(?:preise|betrieb)\.json|OWNER-DECISIONS|\bpreis-ok\b/g;
const ENTWURF = /\bEntwurf\b/g;
const URL_IM_TEXT = /\bhttps?:\/\/\S+|\bwww\.\S+|\b[\w.-]+\.(?:de|com|net|org|eu|info)\/\S*/gi;
const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Alle Stellen einer Seite, an denen ein Markenname stehen kann: [[Ort, Text]]. */
function markenQuellen(pg) {
  const meta = (pg.metas || []).map(m => m && m.content).filter(Boolean).join(' ¶ ');
  const links = (pg.anchors || []).map(a => `${a.raw || a.href || ''} ${a.text || ''}`).join(' ¶ ');
  const bilder = (pg.images || []).map(i => `${i.src || ''} ${i.alt || ''}`).join(' ¶ ');
  const kopfLinks = (pg.links || []).map(l => l && l.href).filter(Boolean).join(' ¶ ');
  return [['Seitentext', pg.textFull], ['Title', pg.title], ['Meta-Angaben', meta], ['Links', links], ['Bilder', bilder], ['Verweise im Seitenkopf', kopfLinks], ['Strukturierte Daten', JSON.stringify(pg.jsonld || [])]].filter(q => q[1]);
}
const telefonZiffern = s => String(s || '').replace(/[^\d+]/g, '');
/** Telefonnummer in allen üblichen Schreibweisen: +49 179 …, 0049 179 …, 0179 / … */
function telefonVarianten(nummer) {
  const z = telefonZiffern(nummer); if (!z) return [];
  const national = z.replace(/^\+49|^0049/, '0');
  const ohneNull = national.replace(/^0/, '');
  return [...new Set([national, '+49' + ohneNull, '0049' + ohneNull, '49' + ohneNull])];
}
/** Rufnummer ohne Landes- und Verkehrsausscheidungsziffer: „+49 (0) 179 …“, „0049 179 …“, „0179 …“ → „179…“. */
const rufnummer = s => telefonZiffern(s).replace(/^(?:\+|00)49/, '').replace(/^0/, '');
const TEL_TRENN = String.raw`[\s/().–-]*`; // Trennzeichen zwischen den Ziffern einer Telefonnummer
/**
 * Steht die Telefonnummer im Text? Besteht der Text nur aus einer Nummer (Markup „telephone“), muss sie gleich sein.
 * Im Fließtext (Impressum) sind Trennzeichen nur zwischen den Ziffern erlaubt, und direkt dahinter darf keine
 * weitere Ziffer folgen – sonst gälte „0179 15282055“ als „0179 1528205“.
 */
function enthaeltTelefon(text, nummer) {
  const soll = rufnummer(nummer); const t = String(text || '');
  if (!soll) return false;
  if (/^[\d\s/().–+-]+$/.test(t)) return rufnummer(t) === soll;
  const vorwahl = String.raw`(?:(?:\+|(?<!\d)00)49${TEL_TRENN}(?:\(0\)${TEL_TRENN})?|(?<![\d+])0)`;
  return new RegExp(vorwahl + [...soll].map(esc).join(TEL_TRENN) + String.raw`(?!\d)`).test(t);
}

function run(ctx) {
  const { crawl, cfg } = ctx; const out = []; const S = sammler();
  const base = String(cfg.base || '').replace(/\/+$/, '');
  const firma = cfg.company || {}; const soll = ctx.soll && ctx.soll.preise ? ctx.soll : null;
  const heute = heuteTag(ctx);
  const alleSeiten = seiten(crawl);
  const altmarke = cfg.altmarke && cfg.altmarke.muster instanceof RegExp ? new RegExp(cfg.altmarke.muster.source, cfg.altmarke.muster.flags.replace('g', '') + 'g') : null;
  const altmail = cfg.altmarke && cfg.altmarke.mailMuster instanceof RegExp ? new RegExp(cfg.altmarke.mailMuster.source, cfg.altmarke.mailMuster.flags.replace('g', '') + 'g') : null;
  const entwuerfe = new Set(cfg.entwurfSeiten || []);

  // 0) Sollwerte
  if (!soll) out.push({ rule: 'soll-nicht-lesbar', severity: 'info', approval: 'auto', file: 'config/preise.json', key: 'soll', title: 'Sollwerte nicht lesbar – Preisprüfungen wurden in diesem Lauf übersprungen', detail: 'config/preise.json bzw. config/betrieb.json konnten nicht gelesen werden oder sind unvollständig. Altpreise, abweichende Preise und das Ende von Preisaktionen wurden deshalb nicht geprüft.', suggestion: 'Beide Dateien auf gültiges JSON und vollständige Felder prüfen (npm run check:preise, npm run check:daten).' });
  const M = soll ? preisMuster(soll.preise, cfg) : null;
  const pruefdaten = new Map(); // Prüfdatum → Behördenseiten

  for (const rec of alleSeiten) {
    const pg = rec.page; const p = pfad(rec); const t = typ(rec);
    const quellen = textQuellen(rec, cfg);

    // 1) Preise gegen die Sollwerte
    if (M) {
      for (const [ort, text] of quellen) for (const x of preisTreffer(text, M)) {
        const stelle = `${ort}: „${ausschnitt(text, x.index, x.laenge)}“`;
        if (x.art === 'alt') S.add('preis-alt', x.key, rec, { current: x.gefunden + ' €', detail: stelle, wert: x.gefunden });
        else if (x.art === 'aktion') S.add('aktionspreis-abgelaufen', 'aktion', rec, { current: x.hinweistext ? x.gefunden : x.gefunden + ' €', detail: stelle });
        else S.add('preis-abweichend', x.key, rec, { current: x.gefunden + ' €', detail: stelle, wert: x.gefunden, erwartet: x.erwartet, slug: x.slug });
      }
      for (const o of offerPreise(pg)) {
        const v = fmt(o.zahl); const stelle = `Strukturierte Daten: Offer.${o.feld} = "${o.roh}"`;
        if (M.altSet.has(v)) S.add('preis-alt', 'alt:' + v, rec, { current: v + ' €', detail: stelle, wert: v });
        else if (v === M.aktionsPreis) S.add('aktionspreis-abgelaufen', 'aktion', rec, { current: v + ' €', detail: stelle });
        else if (o.zahl !== 0) { // 0 = kostenloses Werkzeug (Rechner)
          // Offer eines Service/Product mit erkennbarer Leistung („Abmeldung“) → genau deren Preis; sonst irgendein gültiger Eigenpreis
          const sl = M.sollFuer(o.leistung) !== undefined ? o.leistung : undefined; const soll = sl ? fmt(M.sollFuer(sl)) : undefined;
          if (soll ? v !== soll : !M.P.erlaubt.has(v)) S.add('preis-abweichend', sl ? 'leistung:' + sl : 'schema-offer', rec, { current: v + ' €', detail: stelle, wert: v, erwartet: soll, slug: sl });
        }
      }
    }

    // 2) Streichpreise und Widerspruch zum Gebührenhinweis (eigener Text, Description, strukturierte Daten)
    for (const [ort, text] of quellen) {
      if (ort === 'Seitenkopf (Menü)' || ort === 'Seitenfuß') continue;
      for (const m of text.matchAll(STREICHPREIS)) { const s = satzUm(text, m.index); if (STREICH_AUSNAHME.test(s)) continue; S.add('streichpreis', 'streichpreis', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; }
      for (const m of text.matchAll(GEBUEHR_WIDERSPRUCH)) { S.add('preis-gebuehren-widerspruch', 'zzgl-gebuehr', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; }
    }

    // 3) Früherer Markenname, alte E-Mail-Adresse
    if (altmarke || altmail) for (const [ort, text] of markenQuellen(pg)) {
      if (altmail) for (const m of text.matchAll(altmail)) { S.add('alte-mailadresse', 'altmail', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length, 50, 50)}“` }); break; }
      if (altmarke) { const ohneMail = altmail ? text.replace(altmail, x => ' '.repeat(x.length)) : text; for (const m of ohneMail.matchAll(altmarke)) { S.add('altmarke-sichtbar', 'altmarke', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length, 50, 50)}“` }); break; } }
    }

    // 4) Platzhalter, Darstellungsfehler, Entwicklerhinweise
    const sichtbar = [['Seitentext', pg.textFull], ['Title', pg.title], ['Meta-Description', pg.description]].filter(q => q[1]);
    for (const [ort, text] of sichtbar) for (const [art, re] of PLATZHALTER) for (const m of text.matchAll(re)) { S.add('platzhalter-sichtbar', art, rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; }
    const og = pg.og || {};
    const gerendert = [...sichtbar, ['Vorschau (Open Graph)', [og['og:title'], og['og:description']].filter(Boolean).join(' ¶ ')], ['Strukturierte Daten', ldTexte(pg).join(' ¶ ')]].filter(q => q[1]);
    for (const [ort, text] of gerendert) for (const [art, re] of RENDER) for (const m of text.matchAll(re)) { S.add('render-fehler', art, rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; }
    const adressen = [pg.canonical, og['og:url'], ...(pg.anchors || []).map(a => a.href)].filter(Boolean).join(' ¶ ');
    for (const [ort, text] of [...sichtbar, ['Links', adressen]]) {
      for (const m of text.matchAll(ENTWICKLUNG)) { S.add('entwicklerhinweis', 'entwicklungsadresse', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length, 50, 50)}“` }); break; }
      if (ort === 'Links') continue;
      for (const m of text.matchAll(INTERN)) { S.add('entwicklerhinweis', 'intern', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; }
      // „Entwurf“: nicht auf bewusst als Entwurf geführten Seiten; Adressen vorher entfernen (Dateinamen wie …/entwurf-….pdf)
      if (!entwuerfe.has(p)) { const ohneUrl = text.replace(URL_IM_TEXT, x => ' '.repeat(x.length)); for (const m of ohneUrl.matchAll(ENTWURF)) { S.add('entwicklerhinweis', 'entwurf', rec, { current: m[0], detail: `${ort}: „${ausschnitt(text, m.index, m[0].length)}“` }); break; } }
    }

    // 5) Prüfdatum der Behördendaten sammeln
    if (t === 'behoerde') {
      const m = new RegExp(String.raw`geprüft am (\d{1,2})\.\s?(\d{1,2}|${MONAT_RE})\.?\s?(20\d\d)`, 'i').exec(pg.text || '');
      let tag = m ? datum(m[1], m[2], m[3]) : null;
      if (!tag) { const wp = flattenJsonLd(pg.jsonld || []).find(x => String(x['@type']) === 'WebPage' && /^\d{4}-\d{2}-\d{2}/.test(String(x.dateModified || ''))); if (wp) tag = String(wp.dateModified).slice(0, 10); }
      if (tag) { if (!pruefdaten.has(tag)) pruefdaten.set(tag, []); pruefdaten.get(tag).push(rec); }
    }
  }

  // ─── Befunde aus den gesammelten Treffern ──────────────────────────────────
  const D = 'config/preise.json';
  if (M) {
    const P = M.P; const gueltig = `Gültig laut ${D}${P.stand ? ` (Stand ${tagDeutsch(P.stand)})` : ''}: ${Object.entries(P.leistungen).map(([s, v]) => `${NAME[s] || s} ${fmt(v)} €`).join(', ')}.`;
    for (const g of S.gruppen('preis-alt')) { const v = g.key.slice(4); const aktionAlt = P.aktion && P.aktion.aktiv && v === fmt(P.aktion.regulaer);
      out.push(befund(g, base, { severity: 'kritisch', approval: 'preis', file: D, titel: `Früherer Preis ${v} € ist noch sichtbar`, hinweis: `${aktionAlt ? `Während der Aktion „${P.aktion.name}“ (bis ${P.aktion.gueltigBisText}) gilt ${fmt(P.aktion.preis)} €; der reguläre Preis darf nicht daneben stehen. ` : ''}${gueltig}`, proposed: aktionAlt ? fmt(P.aktion.preis) + ' €' : undefined, suggestion: 'Website mit den aktuellen Preisen neu bauen und veröffentlichen. Bleibt der Betrag danach stehen, ist er im Quelltext fest eingetragen – durch den Wert aus lib/pricing.ts ersetzen (npm run check:preise).', reason: 'Unterschiedliche Preise auf der Website sind irreführend (Preisangabenverordnung) und kosten Vertrauen.', risk: 'Nur nach Preisfreigabe ändern.' })); }
    for (const g of S.gruppen('preis-abweichend')) { const e = [...g.treffer.values()][0] || {}; const name = g.key === 'schema-offer' ? 'Preis in den strukturierten Daten (Offer)' : e.slug ? `Preis für ${NAME[e.slug] || e.slug}` : 'Eigenpreis';
      out.push(befund(g, base, { severity: 'hoch', approval: 'preis', file: D, titel: `${name} weicht von der Preisliste ab: ${e.wert} €${e.erwartet ? ` statt ${e.erwartet} €` : ''}`, hinweis: gueltig, proposed: e.erwartet ? e.erwartet + ' €' : undefined, suggestion: 'Betrag an der Fundstelle prüfen: entweder die Website neu bauen (veralteter Stand) oder den fest eingetragenen Betrag durch den Wert aus lib/pricing.ts ersetzen.', reason: 'Jeder genannte Eigenpreis muss der freigegebenen Preisliste entsprechen.', risk: 'Nur nach Preisfreigabe ändern.' })); }
    for (const g of S.gruppen('aktionspreis-abgelaufen')) { const a = P.aktion;
      out.push(befund(g, base, { severity: 'kritisch', approval: 'preis', file: D, titel: `Aktion „${a.name}“ ist seit ${a.gueltigBisText} abgelaufen, wird aber noch angezeigt`, hinweis: `Seit dem ${tagDeutsch(plusTage(a.gueltigBis, 1))} gilt wieder der reguläre Preis von ${fmt(a.regulaer)} €. Die statische Website stellt nicht von selbst um.`, proposed: fmt(a.regulaer) + ' €', suggestion: `In ${D} die Preise der Aktionsleistungen auf ${fmt(a.regulaer)} setzen, den Block „aktion“ entfernen, „stand“ aktualisieren und neu veröffentlichen.`, reason: 'Ein abgelaufener Aktionspreis ist eine irreführende Preisangabe; Kunden können sich darauf berufen.', risk: 'Preisänderung – nur nach Freigabe.' })); }
    // Abgelaufene Aktion noch sichtbar? Dann bleibt die Vorwarnung „aktion-laeuft-aus“ offen (siehe geprueft)
    AKTION_NOCH_SICHTBAR.set(ctx, !!(M.aktionAbgelaufen && S.gruppen('aktionspreis-abgelaufen').length));
    // Vorwarnung: Aktion läuft aus
    const a = P.aktion;
    if (a && a.aktiv && a.tageBisEnde <= AKTION_VORWARNUNG.mittel) out.push({ rule: 'aktion-laeuft-aus', severity: a.tageBisEnde <= AKTION_VORWARNUNG.hoch ? 'hoch' : 'mittel', approval: 'preis', file: D, key: 'aktion', title: `Aktion „${a.name}“ endet am ${a.gueltigBisText} (${a.tageBisEnde === 0 ? 'heute' : a.tageBisEnde === 1 ? 'morgen' : `in ${a.tageBisEnde} Tagen`})`, detail: `Ab dem ${tagDeutsch(plusTage(a.gueltigBis, 1))} gilt wieder ${fmt(a.regulaer)} € statt ${fmt(a.preis)} €. Die statische Website stellt nicht von selbst um – ohne neue Veröffentlichung bleibt der Aktionspreis stehen.`, suggestion: `Für den ${tagDeutsch(plusTage(a.gueltigBis, 1))} einplanen: in ${D} die Aktionspreise auf ${fmt(a.regulaer)} setzen, Block „aktion“ entfernen, „stand“ aktualisieren, neu veröffentlichen. Oder die Aktion bewusst verlängern („gueltigBis“).`, current: fmt(a.preis) + ' €', proposed: fmt(a.regulaer) + ' €', reason: 'Nach Ablauf wäre der angezeigte Aktionspreis eine irreführende Preisangabe.' });
  }
  for (const g of S.gruppen('streichpreis')) out.push(befund(g, base, { severity: 'hoch', approval: 'recht', titel: 'Preisvergleich mit früherem Preis/Rabatt („statt …“, „regulär …“, „% Rabatt“)', hinweis: 'Streichpreise und Rabattangaben sind auf dieser Website bewusst nicht vorgesehen: Der Vergleichspreis müsste der niedrigste Preis der letzten 30 Tage sein (§ 11 PAngV).', suggestion: 'Formulierung ohne Vergleichspreis verwenden (z. B. „bis <Datum> für <Preis>“) oder rechtlich prüfen lassen.', risk: 'Abmahnrisiko bei falschem Vergleichspreis.' }));
  for (const g of S.gruppen('preis-gebuehren-widerspruch')) out.push(befund(g, base, { severity: 'hoch', approval: 'preis', titel: '„zuzüglich amtlicher Gebühren“ widerspricht den Komplettpreisen', hinweis: 'Laut Preisliste sind die amtlichen Gebühren in allen Leistungspreisen enthalten.', suggestion: 'Formulierung an die Preisliste anpassen („inklusive amtlicher Gebühren“) – oder die Preisliste ändern, falls Gebühren künftig getrennt berechnet werden.', risk: 'Widersprüchliche Preisangaben.' }));
  const altName = (cfg.altmarke && cfg.altmarke.name) || 'früherer Markenname';
  for (const g of S.gruppen('altmarke-sichtbar')) out.push(befund(g, base, { severity: 'hoch', approval: 'manuell', titel: `Früherer Markenname/frühere Domain („${altName}“) ist noch sichtbar`, hinweis: `Seit dem Markenwechsel heißt der Dienst „${firma.brand || ''}“.`, proposed: firma.brand, suggestion: 'Fundstelle im Quelltext auf den neuen Namen bzw. die neue Domain umstellen (zentrale Angaben in lib/site.ts) und neu veröffentlichen.', reason: 'Zwei Markennamen verwirren Kunden und Suchmaschinen.' }));
  // Früherer Domainname in der Sitemap bzw. in den Sitemap-Zeilen der robots.txt
  if (altmarke) {
    const trifft = s => { altmarke.lastIndex = 0; return altmarke.test(String(s || '')); };
    const sm = crawl.sitemap || {};
    const treffer = [...new Set([...(sm.entries instanceof Map ? [...sm.entries.keys()] : []), ...(sm.files || []).map(f => f && f.url)].filter(trifft))].sort();
    const robots = ((crawl.robots && crawl.robots.sitemaps) || []).filter(trifft);
    if (treffer.length || robots.length) out.push({ rule: 'altmarke-sichtbar', severity: 'hoch', approval: 'manuell', file: robots.length && !treffer.length ? 'app/robots.ts' : 'app/sitemap.ts', key: 'sitemap',
      title: `Früherer Domainname in ${treffer.length ? 'der Sitemap' : ''}${treffer.length && robots.length ? ' und ' : ''}${robots.length ? 'der robots.txt' : ''}`,
      detail: [treffer.length ? `Sitemap: ${treffer.length} Adresse${treffer.length === 1 ? '' : 'n'}, z. B. ${treffer.slice(0, 3).join(', ')}` : '', robots.length ? `robots.txt: ${robots.join(', ')}` : ''].filter(Boolean).join(' · '),
      count: treffer.length + robots.length, examples: [...treffer, ...robots].slice(0, 20).map(u => ({ url: u, title: 'Früherer Domainname' })),
      proposed: firma.brand, suggestion: 'Basis-Adresse der Sitemap (app/sitemap.ts) bzw. die Sitemap-Zeile der robots.txt (app/robots.ts) auf die aktuelle Domain umstellen und neu veröffentlichen.', reason: 'Suchmaschinen erhalten sonst Adressen der früheren Domain.' });
  }
  for (const g of S.gruppen('alte-mailadresse')) out.push(befund(g, base, { severity: 'hoch', approval: 'manuell', titel: 'E-Mail-Adresse der früheren Domain ist noch sichtbar', proposed: firma.email, suggestion: `Durch ${firma.email || 'die aktuelle Adresse'} ersetzen (lib/site.ts) und neu veröffentlichen.`, reason: 'Anfragen an die alte Adresse können verloren gehen.' }));
  for (const g of S.gruppen('platzhalter-sichtbar')) out.push(befund(g, base, { severity: 'kritisch', approval: 'manuell', titel: `${PLATZHALTER_NAME[g.key] || 'Platzhalter'} auf der veröffentlichten Seite`, suggestion: 'Platzhalter durch den endgültigen Text ersetzen oder die Seite bis dahin nicht veröffentlichen. Rechtsseiten: in der Seitenvorlage den Entwurfshinweis ausschalten, sobald der Text geprüft ist.', reason: 'Platzhalter wirken unseriös; auf Rechtsseiten fehlen damit Pflichtangaben.' }));
  for (const g of S.gruppen('render-fehler')) out.push(befund(g, base, { severity: 'hoch', approval: 'manuell', titel: `Darstellungsfehler: ${RENDER_NAME[g.key] || g.key}`, suggestion: 'Im Quelltext der Seite den fehlenden Wert bzw. die nicht ersetzte Variable korrigieren und neu veröffentlichen.', reason: 'Ein fehlender Wert wurde als Text ausgegeben.' }));
  const ENTW = { entwicklungsadresse: 'Entwicklungs- oder Vorschau-Adresse (localhost, Vorschau-Host)', intern: 'Interner Entwicklerhinweis (Dateiname/Variable)', entwurf: 'Das Wort „Entwurf“' };
  for (const g of S.gruppen('entwicklerhinweis')) out.push(befund(g, base, { severity: 'hoch', approval: 'manuell', titel: `${ENTW[g.key] || 'Entwicklerhinweis'} auf der veröffentlichten Seite`, suggestion: 'Hinweis entfernen bzw. die Adresse durch die Live-Adresse ersetzen und neu veröffentlichen.', reason: 'Interne Hinweise gehören nicht auf die öffentliche Website.' }));

  // 6) Pflichtangaben im Impressum
  const imp = alleSeiten.find(r => pfad(r) === '/impressum/');
  if (imp) {
    const text = imp.page.text || ''; const flach = text.toLowerCase();
    const hat = s => !!s && flach.includes(String(s).toLowerCase());
    const hrb = String(firma.register || '').match(/HR[AB]\s?\d+(?:\s?[A-Z]{1,2})?\b/);
    const fehlt = [];
    if (firma.name && !hat(firma.name)) fehlt.push(`Firmenname „${firma.name}“`);
    if (firma.street && !hat(firma.street)) fehlt.push(`Straße „${firma.street}“`);
    if (firma.zip && firma.city && !new RegExp(`${esc(firma.zip)}\\s+${esc(firma.city)}`, 'i').test(text)) fehlt.push(`PLZ und Ort „${firma.zip} ${firma.city}“`);
    if (firma.responsible && !new RegExp(`(?:Geschäftsführer(?:in)?|Vertreten durch|Inhaber(?:in)?)[^.]{0,60}${esc(firma.responsible)}`, 'i').test(text)) fehlt.push(`Vertretungsberechtigte Person „${firma.responsible}“ (z. B. „Geschäftsführer: …“)`);
    if (hrb && !new RegExp(esc(hrb[0]).replace(/\\? /g, '\\s?'), 'i').test(text)) fehlt.push(`Handelsregister „${hrb[0]}“`);
    if (firma.email && !hat(firma.email)) fehlt.push(`E-Mail „${firma.email}“`);
    if (firma.phone && !enthaeltTelefon(text, firma.phone)) fehlt.push(`Telefon „${firma.phone}“`);
    if (!/§\s?5\s+DDG/.test(text)) fehlt.push('Hinweis „Angaben gemäß § 5 DDG“');
    if (!/keine Behörde/i.test(text)) fehlt.push('Hinweis „keine Behörde“');
    if (fehlt.length) out.push({ rule: 'impressum-pflichtangabe', severity: 'kritisch', approval: 'recht', url: imp.url, key: 'impressum', title: `Impressum: ${fehlt.length === 1 ? 'eine Pflichtangabe fehlt' : fehlt.length + ' Pflichtangaben fehlen'}`, detail: `Nicht gefunden: ${fehlt.join('; ')}.`, suggestion: 'Angaben im Impressum ergänzen (app/impressum/page.tsx; Firmendaten zentral in lib/site.ts) und rechtlich prüfen lassen.', reason: 'Ein unvollständiges Impressum ist abmahnfähig (§ 5 DDG).', risk: 'Rechtstext – nur nach Prüfung ändern.' });
  }

  // 7) Prüfdatum der Behördendaten (Vorwarnung vor dem Index-Gate der Website)
  if (pruefdaten.size) {
    const max = (ctx.soll && ctx.soll.indexGate && ctx.soll.indexGate.maxAlterTage) || INDEX_GATE_TAGE;
    const abMittel = max - PRUEFDATUM_VORWARNUNG.mittel, abKritisch = max - PRUEFDATUM_VORWARNUNG.kritisch;
    const faellig = [...pruefdaten].map(([tag, recs]) => ({ tag, recs, alter: tageZwischen(tag, heute) })).filter(x => x.alter >= abMittel).sort((a, b) => b.alter - a.alter);
    if (faellig.length) {
      const alt = faellig[0]; const stichtag = plusTage(alt.tag, max); const recs = faellig.flatMap(x => x.recs).sort((a, b) => (a.url < b.url ? -1 : 1));
      const istIndexierbar = r => r.indexable !== false && !r.noindex;
      const indexiert = recs.filter(istIndexierbar).length; const ueber = alt.alter >= max;
      // Seiten über dem Höchstalter, die noch indexierbar sind: Sie verlieren den Index beim nächsten Veröffentlichen.
      // Ist keine mehr indexierbar, hat das Index-Gate schon gegriffen – dann nicht „verlieren …“, sondern den eingetretenen Schaden melden.
      const ueberRecs = faellig.filter(x => x.alter >= max).flatMap(x => x.recs); const ueberIndexiert = ueberRecs.filter(istIndexierbar).length;
      const gegriffen = ueber && ueberIndexiert === 0;
      const prDaten = faellig.length > 1 ? ` Prüfdaten: ${faellig.map(x => `${tagDeutsch(x.tag)} (${x.recs.length} Seiten)`).join(', ')}.` : '';
      out.push({ rule: 'behoerdendaten-pruefdatum', severity: alt.alter >= abKritisch ? 'kritisch' : 'mittel', approval: 'manuell', url: base + '/zulassungsstelle/', key: 'pruefdatum',
        title: gegriffen ? `Behördendaten seit ${alt.alter} Tagen ungeprüft – Index-Gate hat gegriffen: keine der ${ueberRecs.length} Behördenseiten ist mehr indexierbar (auch Stadt- und Kennzeichenseiten)`
          : ueber ? `Behördendaten seit ${alt.alter} Tagen ungeprüft – Stichtag ${tagDeutsch(stichtag)} erreicht: ${ueberIndexiert} Behördenseiten verlieren beim nächsten Veröffentlichen den Index` : `Behördendaten zuletzt am ${tagDeutsch(alt.tag)} geprüft (vor ${alt.alter} Tagen) – ab ${tagDeutsch(stichtag)} verlieren ${indexiert} Behördenseiten den Index`,
        detail: gegriffen ? `Die Website nimmt Behördenseiten automatisch aus dem Index (noindex, nicht mehr in der Sitemap), sobald das Prüfdatum älter als ${max} Tage ist (lib/indexGate.ts). Seit dem Veröffentlichen ab dem ${tagDeutsch(stichtag)} stehen diese Seiten auf noindex und fehlen in der Sitemap – ebenso die davon abhängigen Stadt- und Kennzeichenseiten. Derzeit indexierbar: ${indexiert} der ${recs.length} betroffenen Behördenseiten.${prDaten}`
          : `Die Website nimmt Behördenseiten automatisch aus dem Index (noindex, nicht mehr in der Sitemap), sobald das Prüfdatum älter als ${max} Tage ist (lib/indexGate.ts). Das greift beim ersten Veröffentlichen ab dem ${tagDeutsch(stichtag)} und betrifft auch die davon abhängigen Stadt- und Kennzeichenseiten. Derzeit indexierbar: ${indexiert} der ${recs.length} betroffenen Behördenseiten.${prDaten}`,
        suggestion: 'Behördendaten neu prüfen (Skript scripts/verify-zulassungsstellen.mjs, Daten in lib/data/zulassungsstellen.json), das Prüfdatum aktualisieren und neu veröffentlichen.',
        reason: gegriffen ? 'Der größte Teil der bisher indexierten Seiten ist aus dem Index gefallen; erst nach Neuprüfung und Veröffentlichen kommen sie zurück.' : 'Ohne Neuprüfung fällt der größte Teil der indexierten Seiten auf einen Schlag aus dem Index.', current: tagDeutsch(alt.tag), count: recs.length,
        examples: recs.slice(0, 20).map(r => ({ url: r.url, title: `Prüfdatum ${tagDeutsch(alt.tag)}: ${pfad(r)}` })) });
    }
  }
  return out;
}

// Kurztexte für die Oberfläche (SEO Center)
const labels = {
  'preis-alt': 'Früherer Preis sichtbar', 'preis-abweichend': 'Preis weicht von der Preisliste ab', 'aktionspreis-abgelaufen': 'Abgelaufene Preisaktion sichtbar',
  'aktion-laeuft-aus': 'Preisaktion endet bald', streichpreis: 'Streichpreis/Rabattangabe', 'preis-gebuehren-widerspruch': '„zzgl. Gebühren“ trotz Komplettpreis',
  'altmarke-sichtbar': 'Früherer Markenname sichtbar', 'alte-mailadresse': 'Alte E-Mail-Adresse sichtbar', 'platzhalter-sichtbar': 'Platzhalter/Entwurfstext sichtbar',
  'render-fehler': 'Darstellungsfehler (undefined, NaN …)', entwicklerhinweis: 'Entwicklerhinweis sichtbar', 'impressum-pflichtangabe': 'Pflichtangabe im Impressum fehlt',
  'behoerdendaten-pruefdatum': 'Behördendaten bald zu alt (Index-Gate)', 'soll-nicht-lesbar': 'Sollwerte nicht lesbar',
};
// Regeln, die ohne Sollwerte (ctx.soll) nicht geprüft werden können
const PREIS_REGELN = ['preis-alt', 'preis-abweichend', 'aktionspreis-abgelaufen', 'aktion-laeuft-aus'];
/**
 * Regeln, die in diesem Lauf tatsächlich geprüft wurden (für das „behoben“-Schließen im Issue-Store).
 * Ohne Sollwerte bleiben offene Preisbefunde offen, statt fälschlich als behoben zu gelten.
 * Ist die Aktion abgelaufen und ihr Preis noch sichtbar (aktionspreis-abgelaufen), gilt die Vorwarnung nicht als behoben:
 * Sie schließt erst, wenn die Website auf den regulären Preis umgestellt ist (Ergebnis aus run() desselben Laufs).
 */
function geprueft(ctx) {
  if (!(ctx && ctx.soll && ctx.soll.preise)) return RULES.filter(r => !PREIS_REGELN.includes(r));
  return AKTION_NOCH_SICHTBAR.get(ctx) ? RULES.filter(r => r !== 'aktion-laeuft-aus') : RULES.slice();
}

module.exports = { run, rules: RULES, gruppe, labels, geprueft,
  // Helfer für die übrigen Inhaltsmodule
  seiten, heuteTag, pfad, typ, datum, plusTage, ausschnitt, satzUm, saetze, ohneZitate, abschnitte, eigenText, ldTexte, sammler, befund, textQuellen, preisMuster, preisTreffer, offerPreise, telefonVarianten, enthaeltTelefon, esc, MONAT_RE, EIGENE_ABSCHNITTE };
