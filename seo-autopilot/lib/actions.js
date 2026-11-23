'use strict';
// ─── Priorisierte Maßnahmen (Top 3–5) und wiederkehrende Probleme ────────────
// Rein aus den offenen Befunden abgeleitet (lokal ermittelt), keine Google-Daten nötig.
// Wirkung = Schweregrad × betroffene Seiten (gedämpft) × Kernseiten-Bonus; technische Punkte, die
// ohne Freigabe umsetzbar sind, erscheinen vor Punkten, die eine rechtliche/inhaltliche Entscheidung brauchen.
const { pathOf } = require('./util');
const SEV = { kritisch: 100, hoch: 40, mittel: 10, niedrig: 2, info: 0 };

/**
 * Betroffene Seiten eines Befunds (URLs bzw. Quelldatei). Sammelbefunde (key „alle:…“) stehen mit der Startseite als
 * url im Store, die eigentlich betroffenen Seiten nur in examples – dann zählen diese. Sonst: url bzw. file.
 */
function zielSeiten(i) {
  const bsp = i && String(i.key || '').startsWith('alle:') && Array.isArray(i.examples) ? i.examples.map(e => e && e.url).filter(u => typeof u === 'string' && u) : [];
  return bsp.length ? [...new Set(bsp)] : [(i && (i.url || i.file)) || ''];
}
/** Ortsangabe für Bericht und Mail: Pfad bzw. Datei, bei Sammelbefunden die ersten betroffenen Seiten („/a/, /b/, /c/ …“). */
function ortText(i, n = 3) {
  const p = zielSeiten(i).map(pathOf).filter(Boolean);
  return p.slice(0, n).join(', ') + (p.length > n ? ' …' : '');
}

function impact(i, cfg) {
  const pages = i.count || 1;
  const imp = cfg && cfg.importantPaths && zielSeiten(i).some(u => u && cfg.importantPaths.includes(pathOf(u))) ? 2 : 1;
  return Math.round((SEV[i.severity] || 0) * (1 + Math.log2(pages)) * imp);
}
/** Top-N Maßnahmen aus offenen Befunden: eine Maßnahme je Regel (gleiche Ursache = eine Maßnahme). */
function topActions(issues, cfg, n = 5) {
  const open = issues.filter(i => i.status === 'offen' && i.severity !== 'info');
  const byRule = new Map();
  for (const i of open) {
    const g = byRule.get(i.rule) || { rule: i.rule, severity: i.severity, pages: 0, impact: 0, urls: [], approval: i.approval || 'auto', suggestion: i.suggestion || i.proposed || '', title: i.title };
    g.pages += i.count || 1; g.impact += impact(i, cfg);
    for (const p of zielSeiten(i).map(pathOf)) if (g.urls.length < 5 && !g.urls.includes(p)) g.urls.push(p);
    if (SEV[i.severity] > SEV[g.severity]) g.severity = i.severity;
    if (i.approval && i.approval !== 'auto') g.approval = i.approval;
    byRule.set(i.rule, g);
  }
  const list = [...byRule.values()].sort((a, b) => b.impact - a.impact || a.rule.localeCompare(b.rule));
  return list.slice(0, n).map((g, k) => ({ rank: k + 1, rule: g.rule, severity: g.severity, pages: g.pages, impact: g.impact, urls: g.urls, approval: g.approval, needsApproval: g.approval !== 'auto', action: actionText(g), example: g.title }));
}
// Handlungsanweisung je Regel (statt des konkreten Textvorschlags einer einzelnen Seite).
// Quelldateien der Website stehen in Klammern: Seiten unter app/…, Daten/Logik unter lib/…, Sollwerte unter config/….
const RULE_ACTIONS = {
  // Erreichbarkeit, Weiterleitungen, Indexierung
  'serverfehler': 'Nicht erreichbare Seiten sofort prüfen (letzter Deploy, Webspace)',
  'erreichbarkeit-verlust': 'Vorher erreichbare Seiten wiederherstellen oder dauerhaft weiterleiten (public/.htaccess)',
  'defekter-link': 'Defekte interne Links korrigieren oder Zielseiten anlegen',
  'datei-defekt': 'Verlinkte Datei (z. B. PDF unter public/downloads/) wieder bereitstellen oder den Link entfernen',
  'host-weiterleitung': 'Weiterleitung von http/www auf die Hauptadresse reparieren (public/.htaccess, „SSL erzwingen“ beim Hoster)',
  'alte-domain-weiterleitung': 'Weiterleitung der alten Domain auf die neue reparieren (deploy/alte-domain/.htaccess, Domain-Einstellungen beim Hoster)',
  'redirect-kette': 'Weiterleitungen direkt aufs Endziel führen (public/.htaccess)',
  'redirect-loop': 'Weiterleitungsschleife auflösen (public/.htaccess)',
  'noindex-wichtig': 'noindex auf der Kernseite entfernen (Metadaten der Seite unter app/…, Vorschau-Schalter in lib/features.ts)',
  'index-verlust': 'Prüfen, warum zuvor indexierbare Seiten jetzt noindex sind (lib/indexGate.ts, Prüfdatum der Behördendaten)',
  'index-drift': 'Rückgang der indexierbaren Seiten klären (lib/indexGate.ts, versehentlicher Vorschau-Deploy?)',
  'sitemap-index-abweichung': 'Sitemap und Indexierbarkeit angleichen (app/sitemap.ts filtert wie lib/indexGate.ts)',
  'entwurf-oeffentlich': 'Entwurfsseite wieder auf noindex setzen und aus der Sitemap nehmen (lib/features.ts)',
  'sitemap-404': 'Nicht erreichbare URLs aus der Sitemap nehmen (app/sitemap.ts)',
  'sitemap-redirect': 'Nur Endziele in die Sitemap aufnehmen (app/sitemap.ts)',
  'sitemap-fehlt': 'Fehlende Seiten in die Sitemap aufnehmen (app/sitemap.ts)',
  'canonical-fehlt': 'Canonical-Tags ergänzen (alternates.canonical in den Metadaten der Seite, Vorgabe in app/layout.tsx)',
  'canonical-ziel': 'Canonical auf eine erreichbare Adresse zeigen lassen',
  'verwaist': 'Verwaiste Seiten aus Übersichts- oder Nachbarseiten verlinken oder zusammenlegen',
  'index-html-dublette': '/index.html-Varianten auf den Ordnerpfad weiterleiten (public/.htaccess)',
  'security-header': 'Fehlende Sicherheits-Header setzen (public/.htaccess)',
  // Title, Description, Überschriften, Vorschau
  'title-fehlt': 'Fehlende Title-Tags ergänzen (Metadaten der Seite unter app/…)',
  'title-lang': 'Title-Tags auf höchstens 65 Zeichen kürzen (Metadaten der Seite; Markenzusatz über fitTitle in lib/seo.ts)',
  'title-kurz': 'Zu kurze Title-Tags aussagekräftig ergänzen',
  'title-doppelt': 'Doppelte Title-Tags je Seite eindeutig machen (Ort bzw. Thema ergänzen)',
  'description-lang': 'Meta-Descriptions auf höchstens 155 Zeichen kürzen (Metadaten der Seite bzw. Datenquelle unter lib/…)',
  'description-fehlt': 'Fehlende Meta-Descriptions ergänzen',
  'description-unpassend': 'Meta-Descriptions zum Seiteninhalt passend formulieren',
  'h1-fehlt': 'Fehlende H1-Überschrift ergänzen', 'h1-mehrfach': 'Je Seite genau eine H1 verwenden',
  'heading-sprung': 'Überschriften-Hierarchie ohne Sprünge aufbauen (H1 → H2 → H3)', 'h2-fehlt': 'Zwischenüberschriften (H2) ergänzen',
  'og-image': 'Open-Graph-Vorschaubild ergänzen (opengraph-image.tsx)', 'og-fehlt': 'Open-Graph-Angaben ergänzen (Metadaten der Seite)',
  // Strukturierte Daten
  'jsonld-syntax': 'Ungültige JSON-LD-Blöcke korrigieren (Google ignoriert den ganzen Block)',
  'schema-pflichtfeld': 'Empfohlene Schema-Felder ergänzen (author/datePublished; image nur mit echtem Bild)',
  'schema-faq-unsichtbar': 'FAQ-Markup nur für sichtbar dargestellte Fragen verwenden',
  'schema-firmendaten': 'Unternehmensdaten im Markup an das Impressum angleichen (lib/site.ts)',
  'schema-preis': 'Preis im Offer-Markup als Zahl aus config/preise.json ausgeben',
  'schema-bewertung': 'Bewertungs-Markup nur mit echter, nachvollziehbarer Quelle verwenden',
  // Preise, Marke, Darstellung (tägliche Pflichtprüfungen)
  'preis-alt': 'Veraltete Preisangaben durch die aktuellen Werte ersetzen (Quelle: config/preise.json)',
  'preis-abweichend': 'Abweichende Preisangaben an config/preise.json angleichen',
  'aktionspreis-abgelaufen': 'Abgelaufenen Aktionspreis beenden: Aktion in config/preise.json schließen und neu veröffentlichen',
  'aktion-laeuft-aus': 'Auslaufende Preisaktion entscheiden: verlängern oder Regelpreis vorbereiten (config/preise.json)',
  'streichpreis': 'Streichpreis nur zeigen, wenn der höhere Preis tatsächlich verlangt wurde – sonst entfernen',
  'preis-gebuehren-widerspruch': 'Aussagen zu Preis und amtlichen Gebühren vereinheitlichen (config/preise.json)',
  'altmarke-sichtbar': 'Früheren Markennamen bzw. die alte Domain aus sichtbaren Texten entfernen (lib/site.ts)',
  'alte-mailadresse': 'Alte E-Mail-Adresse durch die aktuelle Kontaktadresse ersetzen (lib/site.ts)',
  'platzhalter-sichtbar': 'Sichtbare Platzhalter durch echten Inhalt ersetzen',
  'render-fehler': 'Darstellungsfehler beheben (undefined/NaN o. Ä. im sichtbaren Text)',
  'entwicklerhinweis': 'Entwicklerhinweise (TODO, Lorem ipsum, Testtexte) aus der veröffentlichten Seite entfernen',
  'impressum-pflichtangabe': 'Pflichtangaben im Impressum vervollständigen (app/impressum/, lib/site.ts)',
  'behoerdendaten-pruefdatum': 'Behördendaten neu prüfen und das Prüfdatum aktualisieren (lib/data/zulassungsstellen.json) – sonst fallen die Seiten aus dem Index',
  'soll-nicht-lesbar': 'config/preise.json und config/betrieb.json lesbar machen (Preisprüfungen sind sonst ausgesetzt)',
  // Inhalte
  'behoerden-anschein': 'Formulierungen entfernen, die wie eine Behörde wirken – klar als privater Zulassungsdienst auftreten',
  'zeit-versprechen': 'Feste Zeitversprechen durch belegbare Angaben ersetzen (Sollwerte in config/betrieb.json)',
  'unbelegte-zahl': 'Zahlen und Kundenangaben belegen (Quelle, Stichtag) oder entfernen',
  'wartezeit-behauptung': 'Aussagen über Wartezeiten bei Behörden belegen oder neutral formulieren',
  'werbeaussage': 'Werbeaussagen belegen (Quelle, Stichtag) oder entfernen',
  'zeitangabe-abweichend': 'Zeitangaben an die Sollwerte in config/betrieb.json angleichen',
  'behoerdenhinweis-fehlt': 'Hinweis „privater Zulassungsdienst, keine Behörde“ auf den Seiten ergänzen',
  'jahreszahl-veraltet': 'Veraltete Jahreszahlen in Title/H1 aktualisieren und Inhalt prüfen',
  'copyright-jahr': 'Jahr im Copyright-Hinweis aktualisieren',
  'stand-veraltet': 'Inhalt prüfen und „Stand“-Angabe aktualisieren',
  'frist-abgelaufen': 'Abgelaufene Fristen und Termine aus dem Text nehmen oder aktualisieren',
  'thin-content': 'Dünne Seiten inhaltlich ausbauen oder zusammenlegen',
  'duplicate-content': 'Identische Inhalte unterscheiden oder zusammenführen',
  'kannibalisierung': 'Seiten mit gleicher Suchabsicht abgrenzen oder zusammenlegen',
  'schwache-verlinkung': 'Interne Verlinkung aus thematisch nahen Seiten stärken',
  'keyword-stuffing': 'Unnatürliche Wortwiederholungen entschärfen',
  'rechtschreibung': 'Schreibfehler korrigieren',
  // FAQ und Rechtstexte
  'faq-widerspruch': 'Widersprüchliche FAQ-Angaben seitenübergreifend vereinheitlichen (lib/faq.ts)',
  'faq-agb-widerspruch': 'FAQ an die Widerrufsbelehrung angleichen (app/widerruf/)',
  'rechtsinfo-abweichend': 'Rechtliche Angaben an die geprüften Sollwerte angleichen',
  'faq-duenn': 'Sehr kurze FAQ-Antworten ausformulieren',
};
function actionText(g) {
  const base = RULE_ACTIONS[g.rule] || g.suggestion || 'Befund im SEO Center prüfen und beheben.';
  const scope = g.pages > 1 ? ` (${g.pages} Seiten)` : '';
  const who = g.approval === 'recht' ? ' – rechtliche Freigabe nötig' : g.approval === 'preis' ? ' – Preisfreigabe über config/preise.json nötig' : g.approval === 'manuell' ? ' – inhaltliche Freigabe nötig' : ' – technisch, nach lokalem Test umsetzbar';
  return `${base}${scope}${who}`;
}
/** Wiederkehrende Probleme: mehrfach wieder aufgetreten oder in den letzten 30 Tagen erneut aufgetreten. */
function recurring(issues, days = 30) {
  const since = new Date(Date.now() - days * 86400e3).toISOString();
  return issues.filter(i => (i.reopen_count || 0) >= 2 || (i.reopened_at && i.reopened_at >= since)).sort((a, b) => (b.reopen_count || 0) - (a.reopen_count || 0)).map(i => ({ id: i.id, rule: i.rule, severity: i.severity, url: i.url, title: i.title, status: i.status, reopen_count: i.reopen_count || 0, reopened_at: i.reopened_at || null, first_seen: i.first_seen, ort: ortText(i) }));
}
module.exports = { topActions, recurring, impact, zielSeiten, ortText, SEV, RULE_ACTIONS };
