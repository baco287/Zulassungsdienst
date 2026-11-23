'use strict';
// ─── Strukturierte Daten (schema.org / JSON-LD): Syntax, Pflichtfelder, Adressen, Datumsangaben, Unternehmensdaten ─
// - Adressen (url, @id, mainEntityOfPage) werden nur bei Typen geprüft, die die eigene Seite/Website beschreiben.
//   Bewusst externe Angaben – die Website einer Behörde (GovernmentOffice), Personen, Orte, sameAs – sind kein Fehler.
// - Unternehmensdaten: alle Angaben der eigenen Organisation werden mit cfg.company verglichen (Telefon in jeder
//   Schreibweise) und über die ganze Website gebündelt – ein Befund je abweichendem Feld.
// - Datumsangaben werden tageweise gegen „heute“ (ctx.heute bzw. Tag aus ctx.soll) geprüft, nicht gegen die Uhrzeit.
// Schlüssel (key) enthalten keine Messwerte oder Fehlerpositionen.
const { flattenJsonLd, topLevelJsonLd } = require('../html');
const K = require('./kfz');

const gruppe = 'Strukturierte Daten';
const RULES = ['jsonld-syntax', 'schema-pflichtfeld', 'schema-veraltet', 'schema-bewertung', 'schema-preis', 'schema-faq', 'schema-faq-unsichtbar', 'schema-breadcrumb', 'schema-url', 'schema-datum', 'schema-widerspruch', 'schema-firmendaten'];

const normTxt = s => String(s || '').toLowerCase().replace(/[^a-z0-9äöüß]/g, '');
const F = (rule, severity, o) => ({ rule, severity, approval: 'auto', ...o });
const typen = o => [].concat(o['@type'] || []).map(String);
const typeOf = o => typen(o)[0] || '';
const has = (o, k) => o[k] !== undefined && o[k] !== null && o[k] !== '';
// Article-Typen: laut Google-Dokumentation gibt es KEINE Pflichtfelder, nur Empfehlungen (headline, image,
// datePublished, dateModified, author). Fehlende Felder sind daher kein Fehler, sondern eine Empfehlung –
// image nur mit echtem, den Artikel repräsentierendem Bild (kein Logo, kein Platzhalter).
const ARTICLE_TYPES = ['Article', 'BlogPosting', 'NewsArticle'];
const REQUIRED = {
  Article: ['headline', 'image', 'datePublished', 'author'], BlogPosting: ['headline', 'image', 'datePublished', 'author'], NewsArticle: ['headline', 'image', 'datePublished', 'author'],
  Organization: ['name', 'url'], LocalBusiness: ['name', 'address'], BreadcrumbList: ['itemListElement'], FAQPage: ['mainEntity'], Product: ['name'], Offer: ['price', 'priceCurrency'], WebSite: ['url'], Service: ['name'],
};
// Typen, die die eigene Seite/Website beschreiben – nur bei ihnen muss eine Adresse auf die eigene Domain zeigen
const EIGENE_TYPEN = new Set(['WebPage', 'WebSite', 'CollectionPage', 'ItemPage', 'AboutPage', 'ContactPage', 'FAQPage', 'Article', 'BlogPosting', 'NewsArticle', 'BreadcrumbList', 'Service', 'Offer', 'AggregateOffer', 'Product', 'HowTo', 'HowToStep', 'WebApplication', 'SoftwareApplication', 'ItemList']);
// Typen, deren url der Seiten-Adresse entsprechen muss, wenn sie als Wurzel-Objekt die Seite selbst beschreiben
const SEITEN_TYPEN = new Set(['WebPage', 'CollectionPage', 'ItemPage', 'AboutPage', 'ContactPage']);
const ORG_TYPEN = /^(Organization|LocalBusiness|ProfessionalService|AutomotiveBusiness|Corporation)$/;
const BEWERTBARE_EIGENE = /^(Organization|LocalBusiness|ProfessionalService|AutomotiveBusiness|Corporation|Service|WebSite|Product|WebApplication)$/;
const tagVon = v => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v || '')); return m && K.datum(m[3], m[2], m[1]) ? `${m[1]}-${m[2]}-${m[3]}` : null; };
const ohneSlash = u => String(u || '').replace(/[?#].*$/, '').replace(/\/+$/, '');

function run(ctx) {
  const { crawl, cfg } = ctx; const out = []; const S = K.sammler();
  const base = String(cfg.base || '').replace(/\/+$/, ''); const host = new URL(base).host.replace(/^www\./, '');
  const firma = cfg.company || {}; const heute = K.heuteTag(ctx); const morgen = K.plusTage(heute, 1);
  const hostVon = u => { try { return new URL(u).host.replace(/^www\./, ''); } catch (_) { return ''; } };
  const eigeneAdresse = u => hostVon(u) === host;
  const namen = [firma.name, firma.brand].filter(Boolean).map(normTxt);
  const istEigenName = s => { const n = normTxt(s); return !!n && namen.some(x => n === x || n.includes(x)); };
  const adressen = new Map(); // Anschrift → Zahl der Seiten

  for (const rec of K.seiten(crawl)) {
    if (/\?/.test(rec.url)) continue;
    const pg = rec.page, p = K.pfad(rec);
    if ((pg.jsonldErrors || []).length) { const e = pg.jsonldErrors[0]; out.push(F('jsonld-syntax', 'hoch', { url: rec.url, key: 'jsonld', title: `JSON-LD mit Syntaxfehler: ${p}`, detail: `${pg.jsonldErrors.length > 1 ? pg.jsonldErrors.length + ' fehlerhafte Blöcke. ' : ''}${e.message} – „${String(e.excerpt || '').slice(0, 100)}“`, suggestion: 'Anführungszeichen und Kommas im Block prüfen; ein fehlerhafter Block wird von Suchmaschinen komplett ignoriert.' })); }
    const items = flattenJsonLd(pg.jsonld || []); const roots = new Set(topLevelJsonLd(pg.jsonld || []));
    // Eltern-Objekt je verschachteltem Objekt (für Bewertungen: Wem gilt die Bewertung?)
    const eltern = new Map(); for (const it of items) for (const v of Object.values(it)) for (const kind of [].concat(v)) if (kind && typeof kind === 'object' && kind['@type']) eltern.set(kind, it);
    const eigenesObjekt = o => !!o && (eigeneAdresse(o['@id']) || eigeneAdresse(o.url) || istEigenName(o.name) || istEigenName(o.legalName));

    for (const it of items) {
      const t = typeOf(it);
      // Pflicht- und Empfehlungsfelder (nur Wurzel-Objekte)
      const req = roots.has(it) ? REQUIRED[t] : null;
      if (req) { const missing = req.filter(k => !has(it, k)); if (missing.length) { const isArt = ARTICLE_TYPES.includes(t); const onlyImage = isArt && missing.every(k => k === 'image');
        out.push(F('schema-pflichtfeld', isArt && onlyImage ? 'niedrig' : 'mittel', { url: rec.url, key: t + ':' + missing.join(','), title: isArt ? `${t} ohne empfohlene${missing.length > 1 ? ' Felder' : 's Feld'} ${missing.join(', ')}: ${p}` : `${t} ohne ${missing.join(', ')}: ${p}`,
          detail: isArt ? `Empfehlung von Google, kein Pflichtfeld (für Artikel gibt es keine Pflichtfelder). ${missing.includes('image') ? 'Ein Bild nur ergänzen, wenn es ein echtes, zum Artikel passendes Bild gibt (mindestens 50.000 Pixel, kein Logo, kein Platzhalter).' : ''}`.trim() : 'Pflicht- bzw. Empfehlungsfelder fehlen – ein Rich-Suchergebnis ist damit nicht möglich.',
          suggestion: isArt ? (onlyImage ? 'Ein echtes Titelbild erstellen und im Artikel-Markup als image (und als og:image) ausgeben.' : `Fehlende Angaben im Artikel-Markup ergänzen (author: Person oder „${firma.brand || 'Redaktion'}“ als Organisation; datePublished als ISO-Datum).`) : 'Felder im Markup der Seite ergänzen.' })); } }
      if (t === 'HowTo') out.push(F('schema-veraltet', 'niedrig', { url: rec.url, key: 'HowTo', title: `HowTo-Markup (wird von Google seit 2023 nicht mehr angezeigt): ${p}`, detail: 'Kein Rich-Suchergebnis mehr; das Markup ist Pflegeaufwand ohne Nutzen.', suggestion: 'HowTo-Markup entfernen (die sichtbare Anleitung bleibt).' }));
      // Bewertungen: selbstbezogene Bewertungen sind laut Google-Richtlinie unzulässig
      if (t === 'AggregateRating' || t === 'Review') {
        const ziel = it.itemReviewed || null; const elter = eltern.get(it);
        const self = (ziel && (eigenesObjekt(ziel) || namen.some(x => normTxt(JSON.stringify(ziel)).includes(x)))) || istEigenName(it.name) || (!ziel && elter && BEWERTBARE_EIGENE.test(typeOf(elter)) && eigenesObjekt(elter));
        out.push(F('schema-bewertung', self ? 'hoch' : 'mittel', { url: rec.url, key: t, approval: 'recht', title: `${t} im Markup: ${p}`, detail: self ? 'Bewertungen des eigenen Unternehmens bzw. der eigenen Leistung im eigenen Markup sind laut Google-Richtlinie unzulässig – und nur mit echten, nachprüfbaren Bewertungen überhaupt erlaubt.' : 'Bewertungen nur mit echter, nachvollziehbarer Quelle (Datum, Anzahl, Herkunft) auszeichnen.', suggestion: 'Bewertungs-Markup entfernen, solange es keine echten, belegbaren Kundenbewertungen gibt.', risk: 'Irreführende Werbung – rechtlich prüfen.' }));
      }
      if ((t === 'Offer' || t === 'AggregateOffer') && has(it, 'price') && !/^\d+([.,]\d+)?$/.test(String(it.price))) out.push(F('schema-preis', 'mittel', { url: rec.url, key: 'price', approval: 'preis', title: `Ungültige Preisangabe im Offer: ${p}`, detail: `price = ${JSON.stringify(it.price)}`, current: String(it.price), suggestion: 'Nur die Zahl mit Punkt angeben (z. B. "34.00") und priceCurrency "EUR".' }));
      if (t === 'FAQPage' && Array.isArray(it.mainEntity)) for (const q of it.mainEntity) {
        const a = (q && q.acceptedAnswer) || {};
        if (!q || !q.name || !a.text) out.push(F('schema-faq', 'mittel', { url: rec.url, key: String((q && q.name) || '').slice(0, 40), title: `FAQPage-Eintrag ohne Frage/Antwort: ${p}`, detail: String((q && q.name) || '(ohne Frage)').slice(0, 80), suggestion: 'Jeder Eintrag braucht name (Frage) und acceptedAnswer.text (Antwort).' }));
        else if (!normTxt(pg.textFull).includes(normTxt(q.name).slice(0, 24))) out.push(F('schema-faq-unsichtbar', 'niedrig', { url: rec.url, key: String(q.name).slice(0, 40), title: `FAQ-Frage steht nicht im sichtbaren Text: ${p}`, detail: String(q.name).slice(0, 90), suggestion: 'Markup nur für Fragen verwenden, die auf der Seite sichtbar sind (Google-Richtlinie) – Frage sichtbar machen oder aus dem Markup nehmen.' }));
      }
      if (t === 'BreadcrumbList' && Array.isArray(it.itemListElement)) { let pos = 0; for (const li of it.itemListElement) {
        const url = typeof li.item === 'string' ? li.item : (li.item && (li.item['@id'] || li.item.url)) || '';
        if (li.position !== undefined && Number(li.position) !== pos + 1) { out.push(F('schema-breadcrumb', 'niedrig', { url: rec.url, key: 'position', title: `Breadcrumb-Positionen nicht fortlaufend: ${p}`, detail: `erwartet ${pos + 1}, gefunden ${li.position}`, suggestion: 'Positionen bei 1 beginnen und lückenlos hochzählen.' })); break; }
        pos++;
        if (/^https?:/.test(url) && !eigeneAdresse(url)) out.push(F('schema-url', 'niedrig', { url: rec.url, key: 'breadcrumb', title: `Breadcrumb verweist auf eine fremde Domain: ${p}`, detail: url, suggestion: `Breadcrumb-Einträge müssen auf ${host} zeigen.` }));
      } }
      // Adressen im Markup: nur bei Typen, die die eigene Seite/Website beschreiben
      const eigeneOrg = ORG_TYPEN.test(t) && (eigeneAdresse(it['@id']) || istEigenName(it.name));
      if (EIGENE_TYPEN.has(t) || eigeneOrg) for (const k of ['url', 'mainEntityOfPage', '@id']) {
        const v = typeof it[k] === 'string' ? it[k] : (it[k] && typeof it[k] === 'object' ? it[k]['@id'] || it[k].url : null);
        if (!v || !/^https?:/.test(v)) continue;
        if (!eigeneAdresse(v)) out.push(F('schema-url', eigeneOrg ? 'mittel' : 'niedrig', { url: rec.url, key: `${t}.${k}`, title: `${t}.${k} zeigt auf eine fremde Domain: ${p}`, detail: v, suggestion: `Adresse auf ${host} umstellen (früherer Domainname oder Vorschau-Adresse?).` }));
        else if ((k === 'mainEntityOfPage' || (k === 'url' && SEITEN_TYPEN.has(t) && roots.has(it))) && ohneSlash(v) !== ohneSlash(rec.url)) out.push(F('schema-url', 'niedrig', { url: rec.url, key: `${t}.${k}:seite`, title: `${t}.${k} weicht von der Seiten-Adresse ab: ${p}`, detail: v, suggestion: 'Im Markup die Adresse dieser Seite angeben.' }));
      }
      // Datumsangaben (tageweise, unabhängig von der Uhrzeit des Laufs)
      for (const k of ['datePublished', 'dateModified']) if (has(it, k) && !tagVon(it[k])) out.push(F('schema-datum', 'niedrig', { url: rec.url, key: k + ':format', title: `${k} ist kein gültiges ISO-Datum: ${p}`, detail: String(it[k]).slice(0, 60), suggestion: 'Datum als JJJJ-MM-TT angeben.' }));
      const dp = has(it, 'datePublished') ? tagVon(it.datePublished) : null, dm = has(it, 'dateModified') ? tagVon(it.dateModified) : null;
      if (dp && dp > morgen) out.push(F('schema-datum', 'mittel', { url: rec.url, key: 'datePublished:zukunft', title: `datePublished liegt in der Zukunft: ${p}`, detail: String(it.datePublished), suggestion: 'Veröffentlichungsdatum korrigieren.' }));
      if (dm && dm > morgen) out.push(F('schema-datum', 'mittel', { url: rec.url, key: 'dateModified:zukunft', title: `dateModified liegt in der Zukunft: ${p}`, detail: String(it.dateModified), suggestion: 'Änderungsdatum korrigieren.' }));
      if (dp && dm && dm < dp) out.push(F('schema-datum', 'niedrig', { url: rec.url, key: 'dateModified:vor', title: `dateModified liegt vor datePublished: ${p}`, detail: `${it.dateModified} < ${it.datePublished}`, suggestion: 'Änderungsdatum darf nicht vor dem Veröffentlichungsdatum liegen.' }));
      // Überschrift im Markup gegen H1/Title
      if (has(it, 'headline') && (pg.h1 || [])[0]) { const hl = String(it.headline).toLowerCase().slice(0, 20); if (!pg.h1[0].toLowerCase().includes(hl) && !String(pg.title || '').toLowerCase().includes(hl)) out.push(F('schema-widerspruch', 'niedrig', { url: rec.url, key: 'headline', title: `headline im Markup weicht von H1/Title ab: ${p}`, detail: `headline: ${String(it.headline).slice(0, 70)} | H1: ${pg.h1[0].slice(0, 70)}`, suggestion: 'headline an die sichtbare Überschrift angleichen.' })); }

      // Unternehmensdaten der eigenen Organisation sammeln
      if (ORG_TYPEN.test(t)) {
        const a = it.address && typeof it.address === 'object' ? it.address : {};
        const eigen = eigeneAdresse(it['@id']) || eigeneAdresse(it.url) || istEigenName(it.name) || istEigenName(it.legalName) || (it.telephone && K.enthaeltTelefon(it.telephone, firma.phone)) || (firma.zip && a.postalCode === firma.zip && firma.street && normTxt(a.streetAddress) === normTxt(firma.street));
        if (!eigen) continue; // fremde Organisation (z. B. zitierte Quelle) – kein Abgleich
        const melde = (key, info) => S.add('schema-firmendaten', key, rec, info);
        if (has(it, 'name') && !namen.includes(normTxt(it.name))) melde('name', { current: String(it.name), detail: `name: „${it.name}“` });
        if (has(it, 'legalName') && firma.name && normTxt(it.legalName) !== normTxt(firma.name)) melde('legalName', { current: String(it.legalName), detail: `legalName: „${it.legalName}“ statt „${firma.name}“` });
        const telefone = [it.telephone, ...[].concat(it.contactPoint || []).map(c => c && c.telephone)].filter(Boolean);
        for (const tel of telefone) if (firma.phone && !K.enthaeltTelefon(tel, firma.phone)) { melde('telefon', { current: String(tel), detail: `telephone: ${tel} statt ${firma.phone}` }); break; }
        const mails = [it.email, ...[].concat(it.contactPoint || []).map(c => c && c.email)].filter(Boolean).map(m => String(m).replace(/^mailto:/i, ''));
        for (const mail of mails) if (firma.email && mail.toLowerCase() !== String(firma.email).toLowerCase()) { melde('email', { current: mail, detail: `email: ${mail} statt ${firma.email}` }); break; }
        const anschrift = [a.streetAddress, [a.postalCode, a.addressLocality].filter(Boolean).join(' ')].filter(Boolean).join(', ');
        if (anschrift) {
          adressen.set(anschrift, (adressen.get(anschrift) || 0) + 1);
          const falsch = (firma.zip && has(a, 'postalCode') && String(a.postalCode) !== String(firma.zip)) || (firma.street && has(a, 'streetAddress') && normTxt(a.streetAddress) !== normTxt(firma.street)) || (firma.city && has(a, 'addressLocality') && normTxt(a.addressLocality) !== normTxt(firma.city));
          if (falsch) melde('adresse', { current: anschrift, detail: `Anschrift: ${anschrift} statt ${firma.street}, ${firma.zip} ${firma.city}` });
        }
      }
    }
  }

  // Unternehmensdaten: ein Befund je abweichendem Feld für die ganze Website
  const FELD = { name: ['niedrig', 'Abweichender Firmenname im Organization-Markup', `Einheitlich „${firma.brand || firma.name}“ (Marke) bzw. „${firma.name || ''}“ (legalName) verwenden.`], legalName: ['mittel', 'Rechtlicher Firmenname (legalName) im Markup weicht ab', `„${firma.name || ''}“ wie im Impressum verwenden.`], telefon: ['mittel', 'Telefonnummer im Organization-Markup weicht ab', `Die Nummer aus dem Impressum verwenden (${firma.phone || ''}).`], email: ['mittel', 'E-Mail-Adresse im Organization-Markup weicht ab', `${firma.email || 'Die Adresse aus dem Impressum'} verwenden.`], adresse: ['mittel', 'Anschrift im Organization-Markup weicht vom Impressum ab', `${firma.street || ''}, ${firma.zip || ''} ${firma.city || ''} verwenden.`] };
  for (const g of S.gruppen('schema-firmendaten')) { const [severity, titel, vorschlag] = FELD[g.key] || ['mittel', 'Unternehmensdaten im Markup weichen ab', '']; const e = [...g.treffer.values()][0];
    out.push(K.befund(g, base, { severity, approval: 'manuell', titel: `${titel} („${e.current}“)`, suggestion: `${vorschlag} Die Angaben stehen zentral in lib/site.ts.`.trim(), reason: 'Name, Anschrift und Telefon müssen überall gleich sein (Impressum, Markup, Brancheneinträge).' })); }
  // Mehrere Anschriften: nur nötig, wenn cfg.company keine vollständige Anschrift hat (sonst meldet „adresse“ jede Abweichung)
  if (adressen.size > 1 && !(firma.street && firma.zip && firma.city)) out.push(F('schema-firmendaten', 'mittel', { url: base + '/', key: 'adresse-varianten', approval: 'manuell', title: `Mehrere Anschriften der eigenen Organisation im Markup (${adressen.size})`, detail: [...adressen].sort((a, b) => b[1] - a[1]).map(([a, n]) => `${a} (${n}×)`).join(' | ').slice(0, 300), suggestion: 'Eine einheitliche Anschrift verwenden (lib/site.ts).' }));
  return out;
}

// Kurztexte für die Oberfläche (SEO Center)
const labels = {
  'jsonld-syntax': 'JSON-LD mit Syntaxfehler', 'schema-pflichtfeld': 'Pflicht-/Empfehlungsfeld fehlt', 'schema-veraltet': 'Veraltetes Markup (HowTo)',
  'schema-bewertung': 'Bewertungs-Markup', 'schema-preis': 'Ungültige Preisangabe im Markup', 'schema-faq': 'FAQ-Eintrag unvollständig',
  'schema-faq-unsichtbar': 'FAQ-Frage nicht sichtbar', 'schema-breadcrumb': 'Breadcrumb-Positionen lückenhaft', 'schema-url': 'Adresse im Markup falsch/fremd',
  'schema-datum': 'Datum im Markup ungültig', 'schema-widerspruch': 'headline weicht von H1 ab', 'schema-firmendaten': 'Firmendaten im Markup weichen ab',
};

module.exports = { run, rules: RULES, gruppe, labels };
