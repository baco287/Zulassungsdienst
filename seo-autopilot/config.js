'use strict';
// ─── Konfiguration des SEO-Autopiloten (KFZ-Zulassungsprofis) ────────────────
// Überschreibbar per Umgebungsvariablen (SEO_BASE, SEO_DATA_DIR, …). Keine Zugangsdaten hier:
// Passwörter und Schlüssel kommen ausschließlich aus der Umgebung (lokal .env, im Workflow Secrets).
// Sollwerte für Preise und Zeiten stehen NICHT hier – lib/soll.js liest sie zur Laufzeit aus
// config/preise.json und config/betrieb.json der Website.
const path = require('path');

const KANONISCH = 'https://kfz-zulassungsprofis.de';
const base = (process.env.SEO_BASE || KANONISCH).replace(/\/+$/, '');
const repoRoot = path.resolve(__dirname, '..');

// Weiterleitungen, die täglich geprüft werden. Ziel ist immer die kanonische Adresse (https, ohne www,
// mit Schrägstrich am Ende). `maxSpruenge`: https-Varianten leiten in einem Schritt weiter; http-Varianten
// mit www bzw. alter Domain brauchen zwei (erst https beim Hoster, dann die Regel in der .htaccess).
// `art` dient nur der Einordnung: host = eigene Domain, alte-domain = frühere Domain, thema = alte Themen-URL.
const NEU = 'kfz-zulassungsprofis.de';
const ALT = 'deutschezulassung.de';
const ziel = p => KANONISCH + p;
const check = (art, von, pfad, maxSpruenge) => ({ art, von, erwartet: ziel(pfad), maxSpruenge });
const redirectChecks = base !== KANONISCH ? [] : [
  // eigene Domain: http und www
  check('host', `http://${NEU}/`, '/', 1),
  check('host', `http://${NEU}/preise/`, '/preise/', 1),
  check('host', `https://www.${NEU}/`, '/', 1),
  check('host', `https://www.${NEU}/preise/`, '/preise/', 1),
  check('host', `http://www.${NEU}/`, '/', 2),
  check('host', `http://www.${NEU}/preise/`, '/preise/', 2),
  check('host', `https://${NEU}/preise`, '/preise/', 1), // ohne Schrägstrich
  // alte Domain: pfadgleich auf die neue
  check('alte-domain', `https://${ALT}/`, '/', 1),
  check('alte-domain', `https://www.${ALT}/`, '/', 1),
  check('alte-domain', `https://${ALT}/preise/`, '/preise/', 1),
  check('alte-domain', `https://www.${ALT}/preise/`, '/preise/', 1),
  check('alte-domain', `https://www.${ALT}/preise`, '/preise/', 1), // Schrägstrich wird direkt ergänzt
  check('alte-domain', `http://${ALT}/`, '/', 2),
  check('alte-domain', `http://www.${ALT}/`, '/', 2),
  check('alte-domain', `http://${ALT}/kfz-zulassung/berlin/`, '/kfz-zulassung/berlin/', 2),
  // Themen-Weiterleitungen (alte URLs ohne eigene Seite), direkt aufs Endziel
  check('thema', `https://${ALT}/kfz-zulassung-kosten/`, '/ratgeber/was-kostet-eine-kfz-zulassung/', 1),
  check('thema', `https://www.${ALT}/auto-online-zulassen-ohne-eid`, '/kfz-zulassung-ohne-eid/', 1),
  check('thema', `https://${NEU}/kfz-zulassung-kosten/`, '/ratgeber/was-kostet-eine-kfz-zulassung/', 1),
  check('thema', `https://${NEU}/kfz-zulassung-ohne-ausweisapp/`, '/kfz-zulassung-ohne-eid/', 1),
  check('thema', `https://www.${NEU}/online-zulassung-funktioniert-nicht/`, '/ikfz-funktioniert-nicht/', 1),
];

module.exports = {
  base,
  dataDir: process.env.SEO_DATA_DIR || path.join(__dirname, 'data'),
  // Seitencache des Crawlers (nur lokal nützlich, wird nie synchronisiert). Standard: <dataDir>/page-cache.json.
  // SEO_CACHE_FILE erlaubt Offline-Läufe (SEO_OFFLINE=1) in einem eigenen Datenordner mit dem Cache eines anderen.
  cacheFile: process.env.SEO_CACHE_FILE || '',
  repoRoot,
  // Fertiger Website-Build (statischer Export) für den lokalen Vorher-Nachher-Check
  buildDir: process.env.SEO_BUILD_DIR || path.join(repoRoot, 'out'),
  // Crawl: höflich (wenige parallele Abrufe mit Pause), ein Wiederholungsversuch bei Timeout/5xx.
  // `maxDauerMs`: Notbremse – nach dieser Zeit (oder wenn mehr als die Hälfte der Abrufe scheitert) bricht der Crawl ab.
  // `ausschluss`: Bereiche, die nie abgerufen werden (Schnittstellen, geschützte Werkzeuge, Build-Dateien).
  // `htmlDir` (SEO_HTML_DIR, optional): Roh-HTML je Seite dort ablegen – nur für die Entwicklung des Parsers.
  crawl: { maxPages: 2500, concurrency: 3, delayMs: 200, timeoutMs: 20000, retries: 1, retryDelayMs: 2000, maxDauerMs: 20 * 60000, ausschluss: ['/api/', '/analytics/', '/seo/', '/_next/'], htmlDir: process.env.SEO_HTML_DIR || '' },
  // Seiten, deren Ausfall oder noindex sofort KRITISCH ist (Auftrag, Preise, Kernleistungen, Übersichten, Pflichtseiten)
  importantPaths: [
    '/', '/auftrag/', '/preise/', '/leistungen/',
    '/leistungen/neuzulassung/', '/leistungen/ummeldung/', '/leistungen/halterwechsel/', '/leistungen/abmeldung/', '/leistungen/wiederzulassung/',
    '/kfz-zulassung-ohne-eid/', '/auto-online-anmelden/', '/zulassungsdienst-online/', '/zulassung-per-whatsapp/', '/maxx/', '/gewerbe/',
    '/kfz-zulassung/', '/kfz-zulassung/berlin/', '/zulassungsstelle/', '/kennzeichen/', '/ratgeber/', '/faq/', '/kontakt/',
    '/unterlagen/', '/impressum/', '/datenschutz/', '/widerruf/',
  ],
  // Bewusst nicht indexierte Seiten: exakte Pfade …
  allowNoindex: ['/impressum/', '/datenschutz/', '/widerruf/', '/servicebedingungen/', '/unterlagen/', '/404/'],
  // … und Detailseiten, die das Index-Gate der Website datengetrieben auf noindex setzt
  allowNoindexPatterns: [/^\/kennzeichen\/[^/]+\/$/, /^\/zulassungsstelle\/[^/]+\/$/, /^\/kfz-zulassung\/[^/]+\/$/],
  // Nicht verlinkte Seiten, die trotzdem geprüft werden
  extraPaths: ['/servicebedingungen/'],
  // Entwürfe: müssen noindex und außerhalb der Sitemap bleiben
  entwurfSeiten: ['/servicebedingungen/'],
  redirectChecks,
  // Erwartete Unternehmensdaten (Abgleich mit Schema-Markup und Impressum)
  company: { name: 'Volt Gas UG (haftungsbeschränkt)', brand: 'KFZ-Zulassungsprofis', street: 'Pappelallee 64', zip: '10437', city: 'Berlin', phone: '+49 179 1528205', email: 'info@kfz-zulassungsprofis.de', register: 'HRB 289458 B', responsible: 'Ahmet Kerim Akan' },
  // Früherer Markenname/frühere Domain – dürfen auf der Website nicht mehr sichtbar sein.
  // Bewusst mit Groß-/Kleinschreibung: „deutsche Zulassungsbescheinigung“ ist kein Treffer.
  altmarke: { name: 'DeutscheZulassung', domain: ALT, muster: /DeutscheZulassung|deutschezulassung\.de/, mailMuster: /[A-Za-z0-9._%+-]+@deutschezulassung\.de/i },
  currentYear: new Date().getFullYear(),
  // Optional: zusätzliche, projektspezifische Aussagen-Muster { re, label } für die Inhaltsregeln
  claimPatterns: [],
  // Google Search Console: Zugang nur über die Umgebung (Datei außerhalb des Repos oder JSON im Secret)
  gsc: { property: process.env.GSC_PROPERTY || 'sc-domain:kfz-zulassungsprofis.de', credentialsFile: process.env.GSC_CREDENTIALS_FILE || '', credentialsJson: process.env.GSC_CREDENTIALS_JSON || '' },
  // Benachrichtigungen: ohne SEO_NOTIFY=1 und ohne Empfänger kein Versand (nur Ablage in notifications.json)
  notify: { enabled: process.env.SEO_NOTIFY === '1', to: process.env.SEO_NOTIFY_TO || '' },
  // SEO Center auf dem Webspace (Stand holen/hochladen); Zugang nur aus der Umgebung
  center: { url: process.env.SEO_CENTER_URL || 'https://kfz-zulassungsprofis.de/seo/', user: process.env.SEO_CENTER_USER || '', password: process.env.SEO_CENTER_PASSWORD || '' },
  dashboardPort: parseInt(process.env.SEO_CENTER_PORT || '3500', 10),
};
