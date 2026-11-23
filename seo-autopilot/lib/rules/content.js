'use strict';
// ─── Inhaltsregeln (wöchentlich): Aussagen, Aktualität, Qualität, Verlinkung ──
// - Rechtlich heikle Aussagen (Behörden-Anschein, Zeitversprechen, unbelegte Zahlen, Wartezeit-Behauptungen)
//   werden auf ALLEN erreichbaren Seiten geprüft, auch auf nicht indexierten – sichtbar sind sie trotzdem.
//   Befunde sind Prüfempfehlungen (Freigabe „recht“ bzw. „manuell“); nichts wird automatisch geändert.
// - Qualitätsregeln (dünner Inhalt, Dubletten, Verlinkung, Jahreszahlen im Title) gelten nur für indexierbare Seiten.
// - Behördenseiten: Angaben der Behörde (Gebühren, Zeiten, Hinweise) sind keine Eigenaussagen und werden bei den
//   Aussagen-Regeln ausgenommen (eigenText aus kfz.js). Nur abgelaufene Fristen werden auch dort gemeldet.
// - Gleiche Formulierung auf vielen Seiten = ein Befund mit Anzahl und Beispielen.
const { family, pathOf, isNoindex } = require('../util');
const { FAMILIEN } = require('../aggregate');
const K = require('./kfz');
const { tageZwischen, tagDeutsch, fmt } = require('../soll');
// Zeitspannen, die faq.js als Fakt mit Sollwert bewertet (rechtsinfo-abweichend), meldet nur faq.js – eine falsche Angabe,
// ein Befund. Ein fehlendes oder defektes faq.js darf dieses Modul nicht mitreißen: dann wird wie bisher gemeldet.
let faktStellen = null;
try { const Q = require('./faq'); if (typeof Q.sollStellen === 'function') faktStellen = Q.sollStellen; } catch (_) { faktStellen = null; }

const gruppe = 'Inhalte';
const RULES = ['behoerden-anschein', 'zeit-versprechen', 'unbelegte-zahl', 'wartezeit-behauptung', 'werbeaussage', 'zeitangabe-abweichend', 'behoerdenhinweis-fehlt', 'text-in-vorbereitung', 'jahreszahl-veraltet', 'copyright-jahr', 'stand-veraltet', 'frist-abgelaufen', 'thin-content', 'keyword-stuffing', 'duplicate-content', 'kannibalisierung', 'schwache-verlinkung', 'rechtschreibung'];

// ─── Listen (hier anpassen) ──────────────────────────────────────────────────
// Funktionsseiten: wenig Text ist dort gewollt (Formulare, Werkzeuge, Downloads, Übersichten)
const THIN_AUSNAHMEN = ['/kontakt/', '/auftrag/', '/unterlagen/', '/rechner/', '/vorlagen/', '/impressum/', '/datenschutz/', '/widerruf/', '/servicebedingungen/'];
const THIN_AUSNAHME_MUSTER = [/^\/rechner\/[^/]+\/$/, /^\/vorlagen\/[^/]+\/$/];
// Übersichtsseiten mit langen Listen (Orte, Kürzel): Wiederholungen sind dort keine Überoptimierung
const STUFFING_AUSNAHMEN = ['/zulassungsstelle/', '/kennzeichen/', '/kfz-zulassung/'];
// Fachwörter, die auf einer Website zur Kfz-Zulassung zwangsläufig häufig vorkommen
const FACHWOERTER = new Set('zulassung zulassungen neuzulassung wiederzulassung zulassungsstelle zulassungsstellen zulassungsbehörde zulassungsdienst zulassungsbescheinigung kennzeichen kennzeichenschilder wunschkennzeichen fahrzeug fahrzeuge fahrzeugs behörde behörden ummeldung abmeldung halterwechsel unterlagen termin vollmacht gebühren versicherung landkreis stadt kreis online'.split(' '));
// Seitentypen, auf denen der Hinweis „privater Dienst, keine Behörde“ im Hauptinhalt erwartet wird, plus einzelne Seiten
const HINWEIS_TYPEN = new Set(['start', 'leistung', 'stadt', 'kennzeichen', 'gewerbe', 'landing', 'behoerde']);
const HINWEIS_SEITEN = ['/preise/', '/auftrag/'];
const HINWEIS = /keine Behörde|privater? Zulassungs(?:dienst|service)|nicht die Zulassungsstelle|kein Angebot einer Behörde|nicht mit einer Zulassungsstelle verbunden/i;
// Häufige Tippfehler (neutral, themenunabhängig; dazu wenige Fachwörter der Kfz-Zulassung)
const TIPPFEHLER = [
  [/\bStandart\b/g, 'Standard'], [/\b[Ww]iederruf\w*/g, 'Widerruf…'], [/\b[Ww]iederspr[uü]ch\w*/g, 'Widerspruch…'], [/\bAddress?e[n]?\b/g, 'Adresse'], [/\b[Vv]orraus\w*/g, 'voraus…'],
  [/\b[Ss]eperat\w*/g, 'separat'], [/\b[Dd]etailiert\w*/g, 'detailliert'], [/\b[Aa]uthorisier\w*/g, 'autorisier…'], [/\b[Ee]ntgültig\w*/g, 'endgültig'], [/\b[Aa]gressiv\w*/g, 'aggressiv'],
  [/\b[Kk]enzeichen\w*/g, 'Kennzeichen…'], [/\bZulasung\w*|\bZullassung\w*/g, 'Zulassung…'], [/\bFahrzeugschien\w*/g, 'Fahrzeugschein…'], [/\b[Tt]ermien\w*/g, 'Termin…'], [/\bVersicherungs\s+nummer\b/g, 'Versicherungsnummer'],
];

// ─── Aussagen-Muster ─────────────────────────────────────────────────────────
// Anschein, eine Behörde oder ein offizieller Partner zu sein
const ANSCHEIN = /\b(?:offizielle[rsn]?|amtliche[rsn]?|staatliche[rsn]?|behördliche[rsn]?)\s+(?:Kfz-)?(?:Zulassungs(?:dienst|service|portal|stelle|partner)|Online-Zulassung|i-Kfz-Schnittstelle|Partner|Service|Portal|Anbieter)\b|\b(?:Ihre|unsere)\s+(?:Online-|digitale\s+)Zulassungs(?:stelle|behörde)\b|(?:\bim Auftrag|\bPartner|\bautorisiert)\s+(?:von|vom|der|des)\s+(?:KBA\b|Kraftfahrt-Bundesamts?|Zulassungsbehörde|Stadt\b)/gi;
// … außer es ist erkennbar von der Behörde selbst die Rede („das offizielle Portal der Behörde“) oder verneint
const ANSCHEIN_FREMD_NACH = /^\s+(?:der|des|Ihrer|Ihres|von|vom)\s+(?:zuständigen\s+|jeweiligen\s+)?(?:Behörde|Zulassungsbehörde|Zulassungsstelle|Stadt|Landkreis|Kreis|KBA|Kraftfahrt|Land(?:es)?\b|Bund(?:es)?\b)/i;
const VERNEINT = /\bkein\w*|\bnicht\b|\bohne\b|\bstatt\b|\bniemand\w*|\bnie\b|\bweder\b/i;
const ZEIT = [
  ['minuten', /\bin\s+(?:nur\s+)?\d+\s*(?:Minuten|Min\.?|Stunden)\s+(?:zugelassen|angemeldet|umgemeldet|abgemeldet|fertig|erledigt)\b/gi, 'Zusage einer festen Dauer'],
  ['sofort', /\bsofort\s+(?:zugelassen|angemeldet|umgemeldet|abgemeldet|erledigt)\b|\bSofort-?(?:zulassung|abmeldung)\b/gi, 'Zusage „sofort“'],
  ['taggleich', /\btaggleich\w*|\btagesgleich\w*|\bam selben Werktag\b/gi, 'Zusage „taggleich“'],
  ['noch-heute', /\bnoch heute\b/gi, 'Zusage „noch heute“'],
  ['antwortzeit', /(?:\bantwortet|\bantworten|\bAntwort|\bmeldet sich|\bmelden uns)\b[^.!?]{0,40}(?:\bsofort\b|\b(?:in |binnen )?wenigen Minuten\b)/gi, 'Zusage einer Antwortzeit'],
  ['garantie', /\b(?:garantier\w*|Garantie\w*)/gi, 'Garantie-Aussage'],
  ['express', /\bExpress\b|\bExpress-[A-Za-zÄÖÜäöüß]+/g, 'Express-Angebot ohne festgelegte Dauer'],
];
const ZAHL_MUSTER = [
  ['kundenzahl', /(?:\b(?:über|mehr als|schon|bereits)\s+)?\b(\d{3,}|\d{1,3}\.\d{3})(\+?)\s*(zufriedene[rn]?\s+)?(?:Kund(?:en|innen)|Zulassungen|Aufträge|Fahrzeuge)\b/gi, 'Zahl zu Kunden/Aufträgen ohne Beleg', 'hoch'],
  ['sterne', /[★⭐]|\b[1-5][,.]\d\s*(?:\/|von)\s*5\b/g, 'Sterne-/Notenbewertung', 'kritisch'],
  ['bewertung', /\b(?:Kundenbewertung|Rezension|Kundenstimme)\w*/gi, 'Hinweis auf Kundenbewertungen', 'kritisch'],
  ['siegel', /\bTestsieger\b|\bT[ÜU]V[- ]?(?:geprüft|zertifiziert)|\bTrusted ?Shops\b/gi, 'Siegel/Auszeichnung ohne Beleg', 'hoch'],
  ['spitzenstellung', /\bNr\.?\s?1\b|\bNummer 1\b|\bMarktführer\b/g, 'Spitzenstellungs-Behauptung', 'hoch'],
  ['erfolg', /\b100\s?%\s*(?:Erfolg|sicher|zufrieden)\w*|\bErfolgsquote\b|\bGeld[- ]zurück\b|\bkommt selten vor\b/gi, 'Erfolgs-/Häufigkeitsaussage ohne Beleg', 'hoch'],
  ['superlativ', /\b(?:schnellste[rn]?|günstigste[rn]?|beste[rn]?)\s+(?:Weg|Zulassungsdienst|Anbieter|Service|Preis)\b/gi, 'Superlativ (Alleinstellung) ohne Beleg', 'hoch'],
];
// Superlative über das Behördenverfahren („i-Kfz ist der günstigste Weg“) sind keine Eigenwerbung
const SUPERLATIV_FREMD = /i-?Kfz|Behördenportal|Behördenweg|amtliche[rn]?\s+Gebühr|selbst (?:online )?zulassen/i;
// Unbelegte Aussagen zu Terminlage/Wartezeiten bei Behörden
const WARTE = /(?:Termin\w*|Zulassungsstelle\w*|Behörde\w*)[^.?!]{0,60}(?:\bausgebucht\b|\bwochenlang\b|(?:\boft|\bhäufig|\bmeist|\bmehrere)\s+Wochen\b)|\bWochen\s+(?:Vorlauf|Wartezeit)\b/gi;
// Strengere Liste für Stadtseiten (entspricht dem Index-Gate der Website: solche Aussagen dürfen dort nicht stehen)
const WARTE_STADT = /(?<![A-Za-zÄÖÜäöüß])Wochen?(?![a-zäöüß])|wochenlang|ausgebucht|begehrt|Andrang|ausgelastet|erk[äa]mpft|vergriffen|\brar\b|schnell weg|gut gef[üu]llt|\bwarten\b|Wartezeit|schwerer zu bekommen|einreihen/gi;
const SPANNE = /(?<![\d.,:])(\d{1,3})\s?[–-]\s?(\d{1,3})\s*(Minuten|Werktag\w*)/g;
const SPANNE_FREMD = /Schalter|vor Ort|Behördengang|Anfahrt|Wartezeit|Fahrzeit|i-?Kfz-Portal|bei der Behörde/i;
const VORBEREITUNG = /\b(?:ist|sind|befindet sich|befinden sich)\s+(?:bereits\s+|noch\s+|derzeit\s+|aktuell\s+)?in\s+(?:Vorbereitung|Arbeit|Planung)\b|\b(?:folgt|folgen|kommt|kommen|verfügbar)\s+(?:demnächst|in Kürze|bald)\b|\bdemnächst\s+(?:verfügbar|hier|online)\b|\bcoming soon\b/gi;
const HISTORISCH = /\b(?:galt|galten|war|waren|wurde|wurden|lief|liefen|bestand|endete|endeten|hatte|hatten)\b/;

const STOP = new Set('der die das und oder für mit von zu im in den dem des ein eine einer eines ist sind auf an bei aus nach über unter vor als auch nicht wie bis um am zum zur sie wir ihr ihre ihren ihrer ihrem ihres du dein deine was wer wo wann mehr alle jetzt hier so dass sich es er einem einen durch beim vom wird werden kann können haben hat sein unser unsere unseren unserer diese dieser dieses diesen keine keinen einer einem noch nur schon dann wenn aber'.split(' '));
const woerter = s => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').split(' ').filter(w => w.length >= 5 && !STOP.has(w));
const ohneUmlaut = w => w.replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const jaccard = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return A.size + B.size - i ? i / (A.size + B.size - i) : 0; };
const F = (rule, severity, o) => ({ rule, severity, approval: 'manuell', ...o });
const phrase = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 50);
const letzterTag = (jahr, monat) => new Date(Date.UTC(jahr, monat, 0)).getUTCDate();

/** Abgelaufene Fristen im Text: [{ tag, text, index }] (nur Datumsangaben vor „heute“). */
function fristen(text, heute) {
  const out = []; const M = K.MONAT_RE;
  const muster = [
    [new RegExp(String.raw`\b[Bb]is\s+(?:zum\s+|einschließlich\s+)?(\d{1,2})\.\s?(\d{1,2})\.\s?(20\d\d)\b`, 'g'), m => K.datum(m[1], m[2], m[3])],
    [new RegExp(String.raw`\b[Bb]is\s+(?:zum\s+|einschließlich\s+)?(\d{1,2})\.\s?(${M})\s+(20\d\d)\b`, 'g'), m => K.datum(m[1], m[2], m[3])],
    [new RegExp(String.raw`\b[Bb]is\s+(?:längstens\s+|spätestens\s+|mindestens\s+)?Ende\s+(${M})\s+(20\d\d)\b`, 'g'), m => { const mo = K.datum(1, m[1], m[2]); return mo ? K.datum(letzterTag(Number(m[2]), Number(mo.slice(5, 7))), m[1], m[2]) : null; }],
    [new RegExp(String.raw`\b[Bb]is\s+(?:längstens\s+|spätestens\s+|mindestens\s+|zum\s+)?(?:Jahresende|Ende(?:\s+des\s+Jahres)?)\s+(20\d\d)\b`, 'g'), m => `${m[1]}-12-31`],
  ];
  for (const [re, zuTag] of muster) for (const m of text.matchAll(re)) { const tag = zuTag(m); if (tag && tag < heute) out.push({ tag, text: m[0], index: m.index }); }
  return out.sort((a, b) => a.index - b.index);
}

function run(ctx) {
  const { crawl, cfg } = ctx; const out = []; const S = K.sammler();
  const base = String(cfg.base || '').replace(/\/+$/, '');
  const heute = K.heuteTag(ctx); const jahr = Number(heute.slice(0, 4));
  const soll = ctx.soll || null; const zeiten = soll && soll.zeiten ? soll.zeiten : null;
  const aktion = soll && soll.preise && soll.preise.aktion ? soll.preise.aktion : null;
  const aktionRe = aktion ? new RegExp(`${K.esc(aktion.name)}|${K.esc(fmt(aktion.preis))}|${K.esc(String(aktion.preis))}\\s?€|Aktion|Rabatt`, 'i') : null;
  const alle = K.seiten(crawl);
  const indexierbar = alle.filter(r => (r.indexable !== undefined ? r.indexable : !isNoindex(r)) && !/[?]/.test(r.url));
  const stelle = (ort, text, i, len) => `${ort}: „${K.ausschnitt(text, i, len)}“`;
  const hinweisFehlt = new Map(); // Familie → Seiten ohne Behördenhinweis
  // Ortsnamen der Website (aus den Adressen der Orts- und Behördenseiten): ihre Wiederholung ist keine Überoptimierung
  const ortswoerter = new Set();
  for (const r of alle) if (K.typ(r) === 'behoerde' || K.typ(r) === 'stadt') for (const w of K.pfad(r).split('/').filter(Boolean).slice(1).join('-').split('-')) if (w.length >= 4) ortswoerter.add(w);

  for (const rec of alle) {
    const pg = rec.page; const p = K.pfad(rec); const t = K.typ(rec);
    const eigen = K.eigenText(rec, cfg);
    const quellen = [['Seitentext', eigen], ['Title', pg.title], ['Meta-Description', pg.description]].filter(q => q[1]);

    for (const [ort, text] of quellen) {
      // 1) Anschein einer Behörde / eines offiziellen Partners
      for (const m of text.matchAll(ANSCHEIN)) {
        if (ANSCHEIN_FREMD_NACH.test(text.slice(m.index + m[0].length, m.index + m[0].length + 50))) continue;
        const satz = K.satzUm(text, m.index); if (VERNEINT.test(satz.slice(0, Math.max(0, satz.indexOf(m[0]))))) continue;
        S.add('behoerden-anschein', phrase(m[0]), rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length) });
      }
      // 2) Zeitversprechen
      for (const [art, re] of ZEIT) for (const m of text.matchAll(re)) {
        if ((art === 'garantie' || art === 'sofort' || art === 'minuten' || art === 'taggleich') && VERNEINT.test(K.satzUm(text, m.index))) continue; // „keine Garantie“, „nicht sofort zugelassen“
        S.add('zeit-versprechen', art, rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length) }); break;
      }
      // 3) Unbelegte Zahlen, Bewertungen, Superlative
      for (const [art, re] of ZAHL_MUSTER) for (const m of text.matchAll(re)) {
        if (art === 'kundenzahl') { const n = Number(String(m[1]).replace('.', '')); const jahreszahl = /^\d{4}$/.test(m[1]) && n >= 1900 && n <= 2099; const betont = !!m[2] || !!m[3] || /^(?:über|mehr als|schon|bereits)/i.test(m[0]); if (jahreszahl && !betont) continue; }
        if (art === 'superlativ' && SUPERLATIV_FREMD.test(text.slice(Math.max(0, m.index - 110), m.index))) continue;
        S.add('unbelegte-zahl', art === 'kundenzahl' || art === 'sterne' ? art : art + ':' + phrase(m[0]), rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length) }); if (art === 'kundenzahl' || art === 'sterne') break;
      }
      // 4) Wartezeit-Behauptungen (auf Stadtseiten die strengere Liste des Index-Gates)
      for (const m of text.matchAll(t === 'stadt' ? WARTE_STADT : WARTE)) {
        if (/\?/.test(K.satzUm(text, m.index).slice(-1))) continue; // Fragen („Sind Termine ausgebucht?“) sind keine Behauptung
        S.add('wartezeit-behauptung', 'wartezeit', rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length) }); break;
      }
      // 5) Projektspezifische Zusatzmuster aus der Konfiguration
      for (const c of cfg.claimPatterns || []) { if (!c || !(c.re instanceof RegExp)) continue; const m = new RegExp(c.re.source, c.re.flags.replace('g', '')).exec(text); if (m) S.add('werbeaussage', phrase(c.label || c.re.source), rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length), label: c.label }); }
      // 6) Zeitangaben gegen die Betriebsangaben (ohne die Stellen, die faq.js als Fakt prüft – nur im Seitentext)
      let fakt = null;
      if (zeiten) for (const m of text.matchAll(SPANNE)) {
        const a = Number(m[1]), b = Number(m[2]); const minuten = /^Min/.test(m[3]);
        const erlaubt = (minuten ? zeiten.minutenSpannen : zeiten.werktageSpannen) || [];
        if (erlaubt.some(s => s[0] === a && s[1] === b) || SPANNE_FREMD.test(K.satzUm(text, m.index))) continue;
        if (ort === 'Seitentext' && faktStellen) { if (!fakt) { try { fakt = faktStellen(rec, text, ctx) || []; } catch (_) { fakt = []; } } if (fakt.some(([von, bis]) => m.index >= von && m.index < bis)) continue; }
        S.add('zeitangabe-abweichend', minuten ? 'minuten' : 'werktage', rec, { current: `${a}–${b} ${minuten ? 'Minuten' : 'Werktage'}`, detail: stelle(ort, text, m.index, m[0].length) });
      }
      // 7) Angekündigtes, das es noch nicht gibt
      for (const m of text.matchAll(VORBEREITUNG)) { S.add('text-in-vorbereitung', 'vorbereitung', rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length) }); break; }
      // 8) Tippfehler
      for (const [re, richtig] of TIPPFEHLER) for (const m of text.matchAll(re)) { S.add('rechtschreibung', richtig, rec, { current: m[0], detail: stelle(ort, text, m.index, m[0].length), richtig }); break; }
    }

    // 9) Hinweis „privater Dienst, keine Behörde“ im Hauptinhalt
    if ((HINWEIS_TYPEN.has(t) || HINWEIS_SEITEN.includes(p)) && !HINWEIS.test(pg.text || '')) { const fam = family(p); if (!hinweisFehlt.has(fam)) hinweisFehlt.set(fam, []); hinweisFehlt.get(fam).push(rec); }

    // 10) Copyright-Jahr (friert beim Bauen der Website ein)
    const c = /©\s?(20\d\d)\b/.exec(pg.textFuss || pg.textFull || '');
    if (c && Number(c[1]) < jahr) S.add('copyright-jahr', 'copyright', rec, { current: c[0], detail: `Seitenfuß: „${c[0]}“` });

    // 11) „Stand …“ / „geprüft am …“ älter als ein Jahr (Behördenseiten: dafür gibt es die tägliche Prüfdatum-Regel)
    if (t !== 'behoerde') {
      const re = new RegExp(String.raw`\b(?:Stand(?: der Preise)?|Preisstand|[Gg]eprüft am|[Aa]ktualisiert am|[Zz]uletzt aktualisiert(?: am)?):?\s+(\d{1,2})\.\s?(\d{1,2}|${K.MONAT_RE})\.?\s?(20\d\d)\b`, 'g');
      for (const m of (pg.text || '').matchAll(re)) { const tag = K.datum(m[1], m[2], m[3]); if (!tag) continue; const alter = tageZwischen(tag, heute); if (alter >= 365) { S.add('stand-veraltet', 'stand', rec, { current: m[0], detail: `„${K.ausschnitt(pg.text, m.index, m[0].length, 40, 40)}“ – ${alter} Tage alt` }); break; } }
    }

    // 12) Abgelaufene Fristen (auch in Behördenangaben: veraltete Hinweise sind für Besucher irreführend)
    // Das Ende einer Preisaktion meldet kfz.js (aktionspreis-abgelaufen) – hier nur andere Fristen
    const abgelaufen = fristen(pg.text || '', heute).filter(f => { const satz = K.satzUm(pg.text, f.index); return !(aktionRe && f.tag === aktion.gueltigBis && aktionRe.test(satz)) && !HISTORISCH.test(satz); });
    if (abgelaufen.length) { const f = abgelaufen[0];
      out.push(F('frist-abgelaufen', 'mittel', { url: rec.url, key: 'frist', title: `Abgelaufene Frist im Text: ${p}`, detail: abgelaufen.slice(0, 3).map(x => `„${K.ausschnitt(pg.text, x.index, x.text.length, 60, 60)}“ (Frist ${tagDeutsch(x.tag)})`).join(' | '), current: f.text, suggestion: t === 'behoerde' ? 'Angabe der Behörde neu prüfen und aktualisieren oder entfernen (lib/data/zulassungsstellen.json).' : 'Aussage prüfen: Gilt die Regelung weiter, das neue Datum nennen; sonst den Satz anpassen oder entfernen.', reason: 'Ein Datum in der Vergangenheit lässt die Seite veraltet wirken und kann sachlich falsch sein.' })); }
  }

  // ─── Qualitätsregeln (nur indexierbare Seiten) ─────────────────────────────
  const shingles = new Map(); const titel = [];
  for (const rec of indexierbar) {
    const pg = rec.page; const p = K.pfad(rec); const text = pg.text || ''; const kopf = `${pg.title || ''} ${(pg.h1 || []).join(' ')}`;
    const wc = pg.wordCount !== undefined ? pg.wordCount : (text ? text.split(' ').length : 0);
    // Veraltete Jahreszahl in Title, H1 oder URL (Fließtext-Jahre sind meist historisch und bleiben unberührt)
    const alt = new Set();
    for (const m of `${kopf} ${p.replace(/[-/_]+/g, ' ')}`.matchAll(/(\b(?:seit|ab|von|vom|bis|im Jahr|vor|nach|Stand)\s+)?(?<![\d.,-])(20[2-9]\d)(?![\d.,]|\s?€)/gi)) if (!m[1] && Number(m[2]) < jahr) alt.add(m[2]);
    if (alt.size) out.push(F('jahreszahl-veraltet', 'mittel', { url: rec.url, key: 'jahr', title: `Veraltete Jahreszahl ${[...alt].join('/')} in Title/H1/URL: ${p}`, detail: kopf.trim().slice(0, 140), current: [...alt].join('/'), proposed: String(jahr), suggestion: `Inhalt prüfen und auf ${jahr} aktualisieren; bei einer Jahreszahl in der URL eine Weiterleitung einplanen.`, reason: 'Besucher und Suchmaschinen werten alte Jahreszahlen als veraltet.' }));
    // Dünner Inhalt
    if (rec.inSitemap !== false && wc < 300 && !THIN_AUSNAHMEN.includes(p) && !THIN_AUSNAHME_MUSTER.some(re => re.test(p))) out.push(F('thin-content', wc < 150 ? 'mittel' : 'niedrig', { url: rec.url, key: 'thin', title: `Dünner Inhalt (${wc} Wörter): ${p}`, detail: 'Die Seite hat wenig eigenständigen Text.', suggestion: 'Mit eigenem Inhalt anreichern (konkrete Abläufe, Beispiele, häufige Fragen) oder mit einer verwandten Seite zusammenlegen.' }));
    // Unnatürliche Wortwiederholung
    if (!STUFFING_AUSNAHMEN.includes(p) && wc > 150) {
      const ws = woerter(text); const freq = new Map(); for (const w of ws) freq.set(w, (freq.get(w) || 0) + 1);
      const eigenwort = new Set([...woerter(kopf), ...woerter(p.replace(/[-/]/g, ' ')), ...woerter((cfg.company && cfg.company.brand) || '')]);
      const top = [...freq].filter(([w]) => !eigenwort.has(w) && !FACHWOERTER.has(w) && !ortswoerter.has(ohneUmlaut(w))).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0];
      if (top && top[1] >= 15 && top[1] / ws.length > 0.07) out.push(F('keyword-stuffing', 'niedrig', { url: rec.url, key: 'stuffing', title: `Unnatürliche Wortwiederholung: ${p}`, detail: `„${top[0]}“ kommt ${top[1]}× vor und macht ${(100 * top[1] / ws.length).toFixed(1)} % der bedeutungstragenden Wörter aus.`, current: top[0], suggestion: 'Synonyme verwenden, Wiederholungen streichen.' }));
    }
    // Schwache Verlinkung
    if (rec.inSitemap && rec.inlinks === 1) out.push(F('schwache-verlinkung', 'niedrig', { url: rec.url, key: 'eingehend', title: `Nur ein interner Link führt zur Seite: ${p}`, detail: 'Die Seite ist intern kaum angebunden.', suggestion: 'Aus thematisch passenden Seiten verlinken.' }));
    const intern = new Set((pg.anchors || []).filter(a => a.main !== false && String(a.href || '').startsWith(base + '/') && !/^#/.test(a.raw || '')).map(a => String(a.href).split(/[?#]/)[0]).filter(h => h !== rec.url));
    if (wc > 600 && intern.size < 3) out.push(F('schwache-verlinkung', 'niedrig', { url: rec.url, key: 'ausgehend', title: `Lange Seite mit nur ${intern.size} internen Links im Text: ${p}`, detail: 'Besucher und Suchmaschinen finden vom Text aus keine weiterführenden Seiten.', suggestion: 'Passende Leistungs-, Ratgeber- oder Ortsseiten im Text verlinken.' }));
    // Für Dubletten und Kannibalisierung sammeln
    if (rec.textShingle && wc > 100) shingles.set(rec.textShingle, [...(shingles.get(rec.textShingle) || []), rec.url]);
    titel.push({ url: rec.url, t: woerter(kopf), fam: family(p) });
  }
  for (const urls of shingles.values()) if (urls.length > 1) { const ps = urls.map(pathOf).sort(); out.push(F('duplicate-content', 'mittel', { url: urls.slice().sort()[0], key: ps.join(',').slice(0, 80), title: `Identischer Textkern auf ${urls.length} Seiten`, detail: ps.slice(0, 6).join(', ') + (ps.length > 6 ? ' …' : ''), count: urls.length, examples: urls.slice().sort().slice(0, 20).map(u => ({ url: u, title: `Identischer Textkern: ${pathOf(u)}` })), suggestion: 'Inhalte unterscheidbar machen oder per Canonical/Weiterleitung zusammenführen.' })); }
  for (let i = 0; i < titel.length; i++) for (let j = i + 1; j < titel.length; j++) {
    const a = titel[i], b = titel[j];
    if (a.t.length < 3 || b.t.length < 3 || (a.fam === b.fam && a.fam.includes('*'))) continue;
    const s = jaccard(a.t, b.t);
    if (s >= 0.85) out.push(F('kannibalisierung', 'mittel', { url: a.url, key: pathOf(b.url), title: `Fast gleiche Title/H1: ${pathOf(a.url)} ≈ ${pathOf(b.url)}`, detail: `Ähnlichkeit der Begriffe in Title und H1: ${(s * 100).toFixed(0)} %`, suggestion: 'Suchabsicht der beiden Seiten unterscheiden oder die Seiten zusammenlegen.' }));
  }

  // ─── Befunde aus den gesammelten Treffern ──────────────────────────────────
  const R = { severity: 'hoch', approval: 'recht' };
  for (const g of S.gruppen('behoerden-anschein')) out.push(K.befund(g, base, { severity: 'kritisch', approval: 'recht', titel: `Formulierung erweckt den Anschein einer Behörde/offiziellen Stelle („${[...g.treffer.values()][0].current}“)`, suggestion: 'Umformulieren, sodass klar bleibt: privater Dienst, der Anträge mit Vollmacht bei der Behörde einreicht (z. B. „Schnittstelle der Behörden“ statt „behördliche Schnittstelle“ nur mit klarem Bezug).', reason: 'Wer wie eine Behörde oder deren offizieller Partner auftritt, handelt irreführend (§ 5 UWG).', risk: 'Abmahnrisiko – rechtlich prüfen.' }));
  const ZEIT_TITEL = Object.fromEntries(ZEIT.map(z => [z[0], z[2]]));
  for (const g of S.gruppen('zeit-versprechen')) { const e = [...g.treffer.values()][0]; const express = g.key === 'express';
    out.push(K.befund(g, base, { severity: express ? 'mittel' : 'hoch', approval: 'recht', titel: `${ZEIT_TITEL[g.key] || 'Zeitversprechen'} („${e.current}“)`, hinweis: express ? 'Für Express-Vorgänge ist in den Betriebsangaben (config/betrieb.json) keine Dauer festgelegt.' : 'Über jeden Antrag entscheidet die Behörde; zugesagte Zeiten müssen belegt und in config/betrieb.json freigegeben sein.', suggestion: express ? 'Festlegen, was „Express“ bedeutet (Dauer, Aufpreis, Voraussetzungen) und das einheitlich beschreiben – oder die Aussage streichen.' : 'Als Erfahrungswert formulieren („meist“, „in der Regel“ mit dem freigegebenen Wert) oder streichen.', reason: 'Nicht haltbare Zeitzusagen sind irreführende Werbung.', risk: 'Rechtlich prüfen.' })); }
  const ZAHL_INFO = Object.fromEntries(ZAHL_MUSTER.map(z => [z[0], { titel: z[2], severity: z[3] }]));
  for (const g of S.gruppen('unbelegte-zahl')) { const art = g.key.split(':')[0]; const e = [...g.treffer.values()][0]; const info = ZAHL_INFO[art] || { titel: 'Unbelegte Aussage', severity: 'hoch' };
    out.push(K.befund(g, base, { ...R, severity: info.severity, titel: `${info.titel} („${e.current}“)`, suggestion: 'Mit Quelle, Datum und Grundlage belegen – oder die Aussage streichen bzw. neutral formulieren.', reason: 'Werbeaussagen mit Zahlen, Bewertungen oder Alleinstellung müssen nachweisbar sein (§ 5 UWG).', risk: 'Abmahnrisiko – rechtlich prüfen.' })); }
  for (const g of S.gruppen('wartezeit-behauptung')) out.push(K.befund(g, base, { severity: 'mittel', approval: 'recht', titel: 'Aussage zu Terminlage/Wartezeiten bei Behörden ohne Beleg', suggestion: 'Mit einer aktuellen, nachprüfbaren Quelle belegen oder neutral formulieren („Termine sind je nach Behörde unterschiedlich schnell verfügbar“).', reason: 'Pauschale Aussagen über Behörden sind nicht belegt und können herabsetzend wirken.', risk: 'Rechtlich prüfen.' }));
  for (const g of S.gruppen('werbeaussage')) { const e = [...g.treffer.values()][0]; out.push(K.befund(g, base, { ...R, titel: `${e.label || 'Werbeaussage'} („${e.current}“)`, suggestion: 'Belegen (Quelle, Datum, Berechnung) oder entfernen.', risk: 'Rechtlich prüfen.' })); }
  if (zeiten) for (const g of S.gruppen('zeitangabe-abweichend')) { const e = [...g.treffer.values()][0]; const min = g.key === 'minuten'; const erlaubt = ((min ? zeiten.minutenSpannen : zeiten.werktageSpannen) || []).map(s => `${s[0]}–${s[1]}`).join(', ');
    out.push(K.befund(g, base, { severity: 'hoch', approval: 'manuell', titel: `Zeitangabe weicht von den Betriebsangaben ab (${e.current})`, hinweis: `In config/betrieb.json stehen als ${min ? 'Minuten' : 'Werktage'}-Spannen: ${erlaubt || 'keine'}.`, suggestion: 'Zeitangaben nur aus den zentralen Betriebsangaben übernehmen (lib/betrieb.ts) – oder config/betrieb.json anpassen, wenn sich der Ablauf geändert hat (npm run check:daten).', reason: 'Unterschiedliche Zeitangaben auf der Website widersprechen sich und sind nicht freigegeben.' })); }
  for (const g of S.gruppen('text-in-vorbereitung')) out.push(K.befund(g, base, { severity: 'niedrig', approval: 'manuell', titel: 'Angekündigte Funktion/Leistung „in Vorbereitung“', suggestion: 'Prüfen, ob die Ankündigung noch stimmt: verfügbar → Text aktualisieren; nicht absehbar → Satz streichen.', reason: 'Dauerhafte Ankündigungen wirken unfertig.' }));
  for (const g of S.gruppen('rechtschreibung')) { const e = [...g.treffer.values()][0]; out.push(K.befund(g, base, { severity: 'niedrig', approval: 'manuell', titel: `Schreibweise „${e.current}“ (richtig: ${e.richtig})`, proposed: e.richtig, suggestion: 'Tippfehler korrigieren.' })); }
  for (const g of S.gruppen('copyright-jahr')) out.push(K.befund(g, base, { severity: 'niedrig', approval: 'auto', titel: `Copyright-Jahr im Seitenfuß ist veraltet (${[...g.treffer.values()][0].current})`, proposed: `© ${jahr}`, suggestion: 'Website neu bauen und veröffentlichen – das Jahr wird beim Bauen gesetzt.', reason: 'Ein altes Jahr im Seitenfuß lässt die Website ungepflegt wirken.' }));
  for (const g of S.gruppen('stand-veraltet')) out.push(K.befund(g, base, { severity: 'niedrig', approval: 'manuell', titel: 'Stand-/Prüfdatum ist älter als 12 Monate', suggestion: 'Inhalt prüfen und das Datum aktualisieren.', reason: 'Ein altes Prüfdatum weckt Zweifel an der Aktualität.' }));

  // Behördenhinweis: ein Befund je Seitenfamilie. In den Platzhalter-Familien (lib/aggregate.js FAMILIEN) schon ab EINER Seite
  // mit dem Schlüssel „familie:…“ – sonst wechselte die ID beim Übergang 1 ↔ 2 Seiten (alter Punkt „behoben“, neuer „neu“).
  for (const [fam, recs] of [...hinweisFehlt].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const urls = recs.map(r => r.url).sort(); const nurFuss = recs.every(r => HINWEIS.test(r.page.textFuss || '')); const platzhalter = fam.includes('*'); // jede Familie mit Platzhalter (auch /gewerbe/*/), nicht nur die fünf aus aggregate.js
    const gemeinsam = { severity: 'niedrig', approval: 'manuell', detail: `Im Hauptinhalt fehlt der Hinweis, dass es sich um einen privaten Zulassungsdienst und nicht um eine Behörde handelt${nurFuss ? ' (er steht nur im Seitenfuß)' : ''}.`, suggestion: 'Einen kurzen, gut sichtbaren Hinweis in den Seiteninhalt aufnehmen (z. B. „Privater Zulassungsdienst, keine Behörde“ – auf Behördenseiten steht er bereits).', reason: 'Besucher sollen auf jeder Angebotsseite sofort erkennen, dass sie nicht bei der Zulassungsstelle sind.' };
    if (urls.length === 1 && !platzhalter) out.push(F('behoerdenhinweis-fehlt', 'niedrig', { ...gemeinsam, url: urls[0], key: 'hinweis', title: `Hinweis „privater Dienst, keine Behörde“ fehlt im Seiteninhalt: ${pathOf(urls[0])}`, buendeln: false }));
    else if (urls.length === 1) out.push(F('behoerdenhinweis-fehlt', 'niedrig', { ...gemeinsam, url: base + fam, key: 'familie:' + fam, title: `1 Seite im Bereich ${fam}: Hinweis „privater Dienst, keine Behörde“ fehlt im Seiteninhalt (${pathOf(urls[0])})`, count: 1, examples: [{ url: urls[0], title: `Hinweis fehlt: ${pathOf(urls[0])}` }] }));
    else out.push(F('behoerdenhinweis-fehlt', 'niedrig', { ...gemeinsam, url: base + fam, key: 'familie:' + fam, title: `${urls.length} Seiten im Bereich ${fam}: Hinweis „privater Dienst, keine Behörde“ fehlt im Seiteninhalt`, detail: `${gemeinsam.detail} Beispiele: ${urls.slice(0, 5).map(pathOf).join(', ')}${urls.length > 5 ? ' …' : ''}`, count: urls.length, examples: urls.slice(0, 20).map(u => ({ url: u, title: `Hinweis fehlt: ${pathOf(u)}` })) }));
  }
  return out;
}

// Kurztexte für die Oberfläche (SEO Center)
const labels = {
  'behoerden-anschein': 'Anschein einer Behörde', 'zeit-versprechen': 'Zeitversprechen', 'unbelegte-zahl': 'Unbelegte Zahl/Bewertung/Superlativ',
  'wartezeit-behauptung': 'Wartezeit-Behauptung über Behörden', werbeaussage: 'Werbeaussage (eigene Muster)', 'zeitangabe-abweichend': 'Zeitangabe weicht von den Betriebsangaben ab',
  'behoerdenhinweis-fehlt': 'Hinweis „keine Behörde“ fehlt', 'text-in-vorbereitung': 'Ankündigung „in Vorbereitung“', 'jahreszahl-veraltet': 'Veraltete Jahreszahl in Title/H1/URL',
  'copyright-jahr': 'Copyright-Jahr veraltet', 'stand-veraltet': 'Stand-Datum älter als 12 Monate', 'frist-abgelaufen': 'Abgelaufene Frist im Text',
  'thin-content': 'Dünner Inhalt', 'keyword-stuffing': 'Unnatürliche Wortwiederholung', 'duplicate-content': 'Identischer Textkern', kannibalisierung: 'Fast gleiche Title/H1',
  'schwache-verlinkung': 'Schwache interne Verlinkung', rechtschreibung: 'Tippfehler',
};
/** Ohne Betriebsangaben (ctx.soll.zeiten) entfällt der Zeitabgleich; offene Befunde dazu bleiben dann offen. */
function geprueft(ctx) { return ctx && ctx.soll && ctx.soll.zeiten ? RULES.slice() : RULES.filter(r => r !== 'zeitangabe-abweichend'); }

module.exports = { run, rules: RULES, gruppe, labels, geprueft, fristen, THIN_AUSNAHMEN, STUFFING_AUSNAHMEN };
