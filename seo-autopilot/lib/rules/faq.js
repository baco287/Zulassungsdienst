'use strict';
// ─── FAQ und Rechtsangaben (wöchentlich): einheitliche Fakten, Widerruf ──────
// Geprüft werden Antworten der FAQ (FAQPage im JSON-LD) und der sichtbare Hauptinhalt aller erreichbaren Seiten.
// - Fakten mit Sollwert (Bearbeitungsdauer, Kennzeichen-Versand, Servicezeiten aus ctx.soll; Widerrufsfrist =
//   gesetzliche 14 Tage) → „rechtsinfo-abweichend“, sobald eine Seite einen anderen Wert nennt.
// - Fakten ohne Sollwert (z. B. ctx.soll fehlt, eVB-Stellen, Gültigkeit Kurzzeitkennzeichen) → „faq-widerspruch“,
//   sobald sich Seiten untereinander widersprechen.
// - FAQ gegen die Widerrufsbelehrung (/widerruf/) → „faq-agb-widerspruch“.
// - Behördenseiten (/zulassungsstelle/<ort>/): gewertet werden nur Sätze über den eigenen Dienst (wir/uns/Marke),
//   ohne wörtliche Zitate der Behörde. Öffnungs- und Bearbeitungszeiten der Behörde sind keine Eigenaussage.
// Alle Befunde sind Prüfempfehlungen (Freigabe „recht“, FAQ-Qualität „manuell“); nichts wird automatisch geändert.
const { flattenJsonLd } = require('../html');
const K = require('./kfz');
const { WIDERRUF_TAGE } = require('../soll');

const gruppe = 'FAQ';
const RULES = ['rechtsinfo-abweichend', 'faq-widerspruch', 'faq-agb-widerspruch', 'faq-duenn', 'rechtsinfo-veraltet'];
const labels = {
  'rechtsinfo-abweichend': 'Angabe weicht vom Sollwert ab', 'faq-widerspruch': 'Seiten widersprechen sich',
  'faq-agb-widerspruch': 'FAQ widerspricht der Widerrufsbelehrung', 'faq-duenn': 'FAQ-Antwort sehr kurz', 'rechtsinfo-veraltet': 'Veraltete Angabe zum Widerruf',
};
const WIDERRUF_PFAD = '/widerruf/';
const DUENN_WOERTER = 8;

// ─── Zahlen, Zahlwörter, Uhrzeiten ───────────────────────────────────────────
const ZAHLWORT = { ein: 1, eine: 1, einem: 1, einen: 1, eines: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, vierzehn: 14, fünfzehn: 15, zwanzig: 20, dreißig: 30 };
const ZW = 'vierzehn|fünfzehn|zwanzig|dreißig|zwölf|zehn|elf|neun|acht|sieben|sechs|fünf|vier|drei|zwei|einem|einen|eines|eine|ein';
const zahl = s => (/^\d+$/.test(String(s)) ? Number(s) : ZAHLWORT[String(s).toLowerCase()]);
const uhr = (h, m) => `${Number(h)}:${m || '00'}`;
const spanne = (s, einheit) => (Array.isArray(s) && s.length === 2 ? `${s[0]}–${s[1]} ${einheit}` : null);

// Eigenaussage: Bezug auf den eigenen Dienst kurz vor der Fundstelle, ohne dass dazwischen von einer Behörde die Rede ist
const SELBST = /\b(?:wir|uns|unsere?[mnrs]?)\b|\bServicezeit\w*/gi;
const FREMD = /Behörde|Zulassungsstelle|Landratsamt|Kreisverwaltung|Bürger(?:büro|amt)|Rathaus|Hotline|Behördennummer|\b115\b|Öffnungszeit|Terminvergabe|ohne Termin|Sprechzeit/i;
function selbstbezug(text, index, marke) {
  const fenster = text.slice(Math.max(0, index - 100), index); let letzte = -1, m;
  const re = new RegExp(SELBST.source + (marke ? `|${K.esc(marke)}` : ''), 'gi');
  while ((m = re.exec(fenster))) letzte = m.index + m[0].length;
  return letzte >= 0 && !FREMD.test(fenster.slice(letzte));
}

/**
 * Fakten. re: globales Muster; wert(m) → normierter Wert oder null (= kein Treffer); soll(ctx) → Liste gültiger Werte
 * (leer/undefined = kein Sollwert, dann nur Abgleich der Seiten untereinander). quelle: woher der Sollwert stammt.
 */
const FAKTEN = [
  { name: 'Bearbeitungsdauer', datei: 'config/betrieb.json',
    // „Die Bearbeitung dauert meist 10–30 Minuten“, „Abmeldungen erledigen wir in 10–30 Minuten“
    re: /(?:Bearbeitung\w*|bearbeit\w+|erledig\w+|dauert)([^.!?]{0,50}?)(?<![\d.,])(\d{1,2})\s?[–-]\s?(\d{1,2})\s*(?:Minuten|Min\.)/gi,
    // Aufwand des Kunden (Formular, Fotos) oder der Behördengang am Schalter sind eine andere Angabe
    wert: m => (/Ausfüll|Formular|Anfrage|hochlad|Upload|Fotos|Aufwand|Behörde|Schalter|vor Ort|Wartezeit|Anfahrt|Termin|i-?Kfz|Portal|selbst/i.test(m[1]) ? null : `${m[2]}–${m[3]} Minuten`),
    soll: ctx => (ctx.soll && ctx.soll.zeiten ? (ctx.soll.zeiten.minutenSpannen && ctx.soll.zeiten.minutenSpannen.length ? ctx.soll.zeiten.minutenSpannen : [ctx.soll.zeiten.bearbeitungMinuten]).map(s => spanne(s, 'Minuten')) : null) },
  { name: 'Versand neuer Kennzeichen', datei: 'config/betrieb.json',
    // „Neue Kennzeichenschilder kommen per Post – meist in 1–3 Werktagen“ (nicht: Kurzzeit-/Wunschkennzeichen, Ersatzpapiere)
    re: /(?<![A-Za-zÄÖÜäöüß-])(?:Kennzeichenschild\w*|Schilder|Kennzeichen)\b([^.!?]{0,80}?)(?<![\d.,])(\d{1,2})\s?[–-]\s?(\d{1,2})\s*Werktag\w*/gi,
    wert: m => (/Post|Versand|versend|verschick|liefer|zugestellt|kommen|kommt|brauchen|unterwegs/i.test(m[1]) && !/Kurzzeit|Wunsch|Ersatz|reserv|Behörde/i.test(m[1]) ? `${m[2]}–${m[3]} Werktage` : null),
    soll: ctx => (ctx.soll && ctx.soll.zeiten ? [spanne(ctx.soll.zeiten.versandWerktage, 'Werktage')] : null) },
  { name: 'Servicezeiten', datei: 'config/betrieb.json', selbst: true,
    // „Servicezeiten: Mo–Fr 8:00–18:00 Uhr“, „Erreichbar sind wir Mo–Fr von 8:00 bis 18:00 Uhr“
    re: /\bMo(?:ntag)?\.?\s?(?:[–-]|bis)\s?Fr(?:eitag)?\.?,?:?\s*(?:von\s+)?(\d{1,2})(?:[:.](\d\d))?\s*(?:Uhr\s*)?(?:[–-]|bis)\s*(\d{1,2})(?:[:.](\d\d))?\s*Uhr/gi,
    wert: m => `Mo–Fr ${uhr(m[1], m[2])}–${uhr(m[3], m[4])} Uhr`,
    soll: ctx => (ctx.soll && ctx.soll.zeiten && ctx.soll.zeiten.service ? [`Mo–Fr ${ctx.soll.zeiten.service.von}–${ctx.soll.zeiten.service.bis} Uhr`] : null) },
  { name: 'Widerrufsfrist', datei: 'app/widerruf/page.tsx',
    // „Widerrufsrecht von vierzehn Tagen“, „Die Widerrufsfrist beträgt 14 Tage“ (nicht: Rückzahlungsfrist nach dem Widerruf)
    re: new RegExp(String.raw`Widerruf\w*([^.!?]{0,80}?)\b(\d{1,2}|${ZW})\s+(Kalendertag\w*|Tag\w*|Wochen?|Monat\w*)`, 'gi'),
    wert: m => { if (/zurückzuzahl|zurückzahl|Rückzahlung|erstatt|zurückzusend|Rücksendung|Kosten/i.test(m[1])) return null; const n = zahl(m[2]); if (!n) return null; const tage = /^Woche/i.test(m[3]) ? 7 * n : /^Monat/i.test(m[3]) ? 30 * n : n; return `${tage} Tage`; },
    soll: ctx => [`${(ctx.soll && ctx.soll.widerrufTage) || WIDERRUF_TAGE} Tage`] },
  // Ohne Sollwert in der Konfiguration – hier zählt nur, dass alle Seiten dasselbe sagen
  { name: 'Länge der eVB-Nummer',
    re: new RegExp(String.raw`\beVB\b([^.!?]{0,60}?)\b(\d{1,2}|${ZW})-?stellig`, 'gi'), wert: m => (zahl(m[2]) ? `${zahl(m[2])}-stellig` : null) },
  { name: 'Gültigkeit Kurzzeitkennzeichen',
    re: new RegExp(String.raw`Kurzzeitkennzeichen\w*([^.!?]{0,80}?)\b(?:maximal |höchstens |bis zu )?(\d{1,2}|${ZW})\s+Tage\w*`, 'gi'),
    wert: m => (/Werktag|Bearbeitung|Dauer|dauert|Versand/i.test(m[1]) || !zahl(m[2]) ? null : `${zahl(m[2])} Tage`) },
];

// Veraltete bzw. unzulässige Angaben zum Widerrufsrecht (rechtsneutral, für jeden Online-Dienst gültig)
const VERALTET = [
  { key: 'kein-widerrufsrecht', label: '„kein Widerrufsrecht“ ohne Einschränkung',
    re: /\bkein(?:e|en)?\s+Widerrufsrecht\b|\bWiderrufsrecht\s+(?:besteht|gilt)\s+nicht\b/gi,
    // zulässig: Ausnahmen (§ 312g BGB), Geschäftskunden, vorzeitiges Erlöschen nach vollständiger Leistung
    ok: /außer|Ausnahme|Unternehmer|gewerblich|Gewerbe|Händler|Firmenkunden|B2B|erlisch|erlösch|vorzeitig|vollständig erbracht|vollständig erledigt|ausdrücklich/i,
    hinweis: 'Verbraucher haben bei online geschlossenen Dienstleistungsverträgen grundsätzlich ein Widerrufsrecht von 14 Tagen (§§ 312g, 355 BGB); es erlischt nur unter den Voraussetzungen des § 356 Abs. 4 BGB.' },
  { key: 'widerruf-form', label: 'Formvorgabe für den Widerruf (seit 2014 entfallen)',
    re: /Widerruf\w*[^.!?]{0,60}?\b(?:in Textform|nur schriftlich|muss schriftlich|schriftlich erfolgen|per Einschreiben)\b/gi,
    ok: /eindeutige[nr]? Erklärung|z\.\s?B\.|zum Beispiel|formlos|auch telefonisch|oder E-Mail/i,
    hinweis: 'Seit dem 13.06.2014 genügt für den Widerruf jede eindeutige Erklärung (§ 355 Abs. 1 BGB); eine Form wie „Textform“ oder „schriftlich“ darf nicht verlangt werden.' },
];

/**
 * Stellen im Seitentext, die run() als Fakt mit Sollwert bewertet (Bearbeitungsdauer, Versand neuer Kennzeichen):
 * [[start, ende)] in `text` (= Seitentext bzw. eigenText der Seite). content.js prüft dort keine Zeitspanne mehr
 * (zeitangabe-abweichend) – eine falsche Angabe ergibt so einen Befund statt zwei. Behördenseiten: wie in run() nur
 * Sätze über den eigenen Dienst. Die Stelle umfasst nur die bewertete Zeitspanne (ab Gruppe 2 = erste Zahl, Flag d),
 * nicht den Vorspann – andere Zeitspannen im selben Satz prüft content.js weiter.
 */
const ZEITSPANNEN = ['Bearbeitungsdauer', 'Versand neuer Kennzeichen'];
function sollStellen(rec, text, ctx) {
  const out = []; if (!text || !rec || /\?/.test(rec.url)) return out;
  const marke = ctx && ctx.cfg && ctx.cfg.company && ctx.cfg.company.brand;
  const eigen = K.typ(rec) === 'behoerde' ? eigenerSatz(marke) : null;
  for (const f of FAKTEN) {
    if (!ZEITSPANNEN.includes(f.name) || !(f.soll(ctx || {}) || []).filter(Boolean).length) continue;
    const re = new RegExp(f.re.source, f.re.flags.replace('d', '') + 'd');
    for (const m of text.matchAll(re)) if (f.wert(m) && (!eigen || eigen.test(K.satzUm(text, m.index)))) out.push([m.indices[2] ? m.indices[2][0] : m.index, m.index + m[0].length]);
  }
  return out;
}

/** Fragen und Antworten aus FAQPage-Markup (HTML in Antworten entfernt). */
function extractFaq(pg) {
  const out = [];
  for (const it of flattenJsonLd((pg && pg.jsonld) || [])) if ([].concat(it['@type'] || []).map(String).includes('Question')) { const a = it.acceptedAnswer || {}; out.push({ q: String(it.name || '').trim(), a: String(a.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }); }
  return out;
}
/** Nur Sätze über den eigenen Dienst (für Behördenseiten): ohne Zitate der Behörde, mit wir/uns/unser/Marke. */
const eigenerSatz = marke => new RegExp(String.raw`\b(?:wir|uns|unsere?[mnrs]?)\b${marke ? '|' + K.esc(marke) : ''}`, 'i');
function eigeneSaetze(text, marke) {
  const re = eigenerSatz(marke);
  return K.saetze(K.ohneZitate(text)).filter(s => re.test(s)).join(' ');
}
/** Textquellen einer Seite für den Faktenabgleich: [[Ort, Text]]. */
function quellen(rec, faq, cfg) {
  const marke = cfg.company && cfg.company.brand;
  const behoerde = K.typ(rec) === 'behoerde';
  const antworten = faq.map(f => `${f.q} ${f.a}`).join(' ¶ ');
  return [['FAQ', behoerde ? eigeneSaetze(antworten, marke) : antworten], ['Seitentext', behoerde ? eigeneSaetze(K.eigenText(rec, cfg), marke) : (rec.page.text || '')]].filter(q => q[1]);
}

function run(ctx) {
  const { crawl, cfg } = ctx; const out = []; const S = K.sammler();
  const base = String(cfg.base || '').replace(/\/+$/, '');
  const marke = cfg.company && cfg.company.brand;
  const seiten = K.seiten(crawl).filter(r => !/\?/.test(r.url));
  const fakten = FAKTEN.map(f => ({ ...f, gueltig: (f.soll && f.soll(ctx)) || [] })).map(f => ({ ...f, gueltig: f.gueltig.filter(Boolean) }));
  const werte = new Map(fakten.map(f => [f.name, new Map()])); // Fakt → Wert → Map(url → Fundstelle)
  const proSeite = new Map(); // url → { Fakt: Set(Werte) } (für den Abgleich mit der Widerrufsbelehrung)

  for (const rec of seiten) {
    const pg = rec.page; const p = K.pfad(rec); const faq = extractFaq(pg);
    const eigen = {};
    for (const [ort, text] of quellen(rec, faq, cfg)) for (const f of fakten) for (const m of text.matchAll(f.re)) {
      const v = f.wert(m); if (!v) continue;
      if (f.selbst && !selbstbezug(text, m.index, marke)) continue;
      const w = werte.get(f.name); if (!w.has(v)) w.set(v, new Map());
      if (!w.get(v).has(rec.url)) w.get(v).set(rec.url, `${ort}: „${K.ausschnitt(text, m.index, m[0].length, 60, 30)}“`);
      (eigen[f.name] = eigen[f.name] || new Set()).add(v);
      if (ort === 'FAQ') (eigen['FAQ:' + f.name] = eigen['FAQ:' + f.name] || new Set()).add(v);
    }
    proSeite.set(rec.url, eigen);

    // Sehr kurze FAQ-Antworten
    for (const f of faq) { const n = f.a ? f.a.split(' ').length : 0; if (f.q && n < DUENN_WOERTER) out.push({ rule: 'faq-duenn', severity: 'niedrig', approval: 'manuell', url: rec.url, key: f.q.slice(0, 40), title: `FAQ-Antwort sehr kurz (${n} Wörter): „${f.q.slice(0, 60)}“ (${p})`, detail: f.a.slice(0, 120) || '(leer)', suggestion: 'Antwort vollständig formulieren (mindestens zwei Sätze mit der konkreten Auskunft) – kurze Antworten wirken unvollständig und werden selten als Suchergebnis-Ausschnitt genutzt.' }); }

    // Veraltete Angaben zum Widerruf (Fließtext und FAQ)
    const voll = [pg.text || '', ...faq.map(f => f.a)].join(' ¶ ');
    for (const v of VERALTET) for (const m of voll.matchAll(v.re)) {
      if (v.ok.test(K.satzUm(voll, m.index))) continue;
      out.push({ rule: 'rechtsinfo-veraltet', severity: 'mittel', approval: 'recht', url: rec.url, key: v.key, title: `${v.label}: ${p}`, detail: `${v.hinweis} Fundstelle: „${K.ausschnitt(voll, m.index, m[0].length, 70, 70)}“`, current: m[0], suggestion: 'Formulierung an die geltende Rechtslage anpassen (Muster-Widerrufsbelehrung, Anlage 1 zu Art. 246a EGBGB) und rechtlich prüfen lassen.', risk: 'Rechtstext – nur nach Prüfung ändern.' });
      break;
    }
  }

  // FAQ gegen die Widerrufsbelehrung (/widerruf/)
  const belehrung = seiten.find(r => K.pfad(r) === WIDERRUF_PFAD);
  const agbGemeldet = new Set();
  if (belehrung) {
    const soll = proSeite.get(belehrung.url)['Widerrufsfrist'];
    if (soll && soll.size) for (const [url, eigen] of proSeite) {
      if (url === belehrung.url) continue;
      const faqWerte = eigen['FAQ:Widerrufsfrist']; if (!faqWerte) continue;
      const anders = [...faqWerte].filter(v => !soll.has(v)); if (!anders.length) continue;
      const rec = crawl.pages.get(url); agbGemeldet.add(url);
      S.add('faq-agb-widerspruch', 'widerruf', rec, { current: anders.join(', '), detail: werte.get('Widerrufsfrist').get(anders[0]).get(url), soll: [...soll].join(', ') });
    }
    for (const g of S.gruppen('faq-agb-widerspruch')) { const e = [...g.treffer.values()][0];
      out.push(K.befund(g, base, { severity: 'hoch', approval: 'recht', titel: `Widerrufsfrist in der FAQ (${e.current}) ≠ Widerrufsbelehrung (${e.soll})`, hinweis: `Die Widerrufsbelehrung (${WIDERRUF_PFAD}) nennt ${e.soll}.`, suggestion: 'FAQ-Antwort an die Widerrufsbelehrung angleichen (oder die Belehrung prüfen lassen, falls sie falsch ist).', reason: 'Widersprüchliche Angaben zur Widerrufsfrist können die Frist verlängern und sind abmahnfähig.', risk: 'Rechtstext – nur nach Prüfung ändern.' })); }
  }

  // Fakten auswerten: Sollwert vorhanden → Abweichung melden; sonst nur Widersprüche der Seiten untereinander
  for (const f of fakten) {
    const w = werte.get(f.name); if (!w.size) continue;
    if (f.gueltig.length) {
      const abw = [...w].filter(([v]) => !f.gueltig.includes(v)).sort((a, b) => b[1].size - a[1].size);
      const treffer = []; for (const [v, urls] of abw) for (const [url, stelle] of urls) if (!(f.name === 'Widerrufsfrist' && agbGemeldet.has(url))) treffer.push({ v, url, stelle });
      if (!treffer.length) continue;
      const seitenN = new Set(treffer.map(t => t.url)).size; const gefunden = [...new Set(treffer.map(t => t.v))];
      const bsp = treffer.slice().sort((a, b) => (a.url < b.url ? -1 : 1)).slice(0, 20).map(t => ({ url: t.url, title: `${f.name}: ${t.v} (${K.pfad({ url: t.url })})`, current: t.v, detail: t.stelle }));
      out.push({ rule: 'rechtsinfo-abweichend', severity: 'hoch', approval: 'recht', url: base + '/', key: f.name,
        title: `${f.name}: ${gefunden.join(', ')} statt ${f.gueltig.join(' / ')} (${seitenN} ${seitenN === 1 ? 'Seite' : 'Seiten'})`,
        detail: `Sollwert ${f.gueltig.join(' / ')}${f.datei ? ` (${f.datei === 'app/widerruf/page.tsx' ? 'gesetzliche Frist' : f.datei})` : ''}. Abweichend: ${abw.map(([v, urls]) => `${v} auf ${urls.size} Seite${urls.size === 1 ? '' : 'n'} (z. B. ${K.pfad({ url: [...urls.keys()].sort()[0] })})`).join(' | ')}. Beispiel: ${bsp[0].detail}`.slice(0, 600),
        current: gefunden.join(', '), proposed: f.gueltig.join(' / '), count: seitenN, examples: bsp,
        suggestion: f.datei === 'config/betrieb.json' ? 'Angabe auf der Seite an config/betrieb.json angleichen (Werte über lib/betrieb.ts statt fest im Text) – oder die Betriebsangaben ändern, wenn sich der Ablauf geändert hat.' : 'Angabe juristisch prüfen und überall einheitlich formulieren.',
        reason: 'Abweichende Zusagen zu Dauer, Erreichbarkeit oder Widerruf sind irreführend und können Kunden Ansprüche geben.' });
    } else if (w.size > 1) {
      const liste = [...w].sort((a, b) => b[1].size - a[1].size);
      const bsp = liste.flatMap(([v, urls]) => [...urls].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 5).map(([url, stelle]) => ({ url, title: `${f.name}: ${v} (${K.pfad({ url })})`, current: v, detail: stelle }))).slice(0, 20);
      out.push({ rule: 'faq-widerspruch', severity: 'hoch', approval: 'recht', url: base + '/', key: f.name,
        title: `Widersprüchliche Angaben zu „${f.name}“ auf verschiedenen Seiten (${liste.map(([v]) => v).join(' / ')})`,
        detail: liste.map(([v, urls]) => `${v}: ${[...urls.keys()].sort().slice(0, 3).map(u => K.pfad({ url: u })).join(', ')}${urls.size > 3 ? ` … (${urls.size} Seiten)` : ''}`).join(' | ').slice(0, 400),
        current: liste.map(([v]) => v).join(' / '), count: new Set(liste.flatMap(([, urls]) => [...urls.keys()])).size, examples: bsp,
        suggestion: 'Einheitliche, geprüfte Angabe festlegen und auf allen Seiten verwenden (am besten aus einer zentralen Quelle wie config/betrieb.json).' });
    }
  }
  return out;
}

/** Ohne Sollwerte entfällt der Abgleich der Betriebsangaben; offene Befunde dazu bleiben dann offen. */
function geprueft(ctx) { return ctx && ctx.soll && ctx.soll.zeiten ? RULES.slice() : RULES.filter(r => r !== 'rechtsinfo-abweichend'); }

module.exports = { run, rules: RULES, gruppe, labels, geprueft, extractFaq, sollStellen, FAKTEN };
