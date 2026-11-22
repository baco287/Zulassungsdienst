#!/usr/bin/env node
/**
 * KI-Assistent für E-Mail: Wissensbasis prüfen und ablegen, Zugang schreiben, Bibliotheken packen.
 *
 *   node scripts/assistent-bauen.mjs <out>                Staging (GitHub Pages)
 *   node scripts/assistent-bauen.mjs <out> --produktion   Produktiv-Deploy (all-inkl)
 *   node scripts/assistent-bauen.mjs <out> --stand        nur <out>/assistent-stand.txt schreiben
 *
 * Läuft nach `npm run build`. Der Build legt die Wissensbasis als <out>/assistent-wissen.json ab
 * (app/assistent-wissen.json/route.ts). Dieses Skript
 *
 *  1. prüft sie: Pflichtfelder, jeder Preis-Platzhalter stimmt mit config/preise.json überein,
 *     jeder Link zeigt auf eine Seite, die es im Build wirklich gibt;
 *  2. ohne --produktion: löscht <out>/assistent und die JSON-Datei. Auf GitHub Pages läuft kein
 *     PHP – der Quelltext soll dort nicht zusätzlich als Download herumliegen;
 *  3. mit --produktion:
 *     - verschiebt die Wissensbasis nach <out>/assistent/intern/wissen.json (per .htaccess gesperrt),
 *     - schreibt <out>/assistent/intern/zugang-daten.php aus dem GitHub-Secret ANTHROPIC_API_KEY
 *       (optional ASSISTENT_MAIL_USER, ASSISTENT_MAIL_PASS, ASSISTENT_MAIL_HOST, falls der Assistent
 *       ein anderes Postfach lesen soll als das Formular),
 *     - packt server/assistent/vendor als <out>/assistent/intern/vendor-<hash>.zip
 *       (<hash> = erste 12 Zeichen von sha256 über composer.lock; autoload.php liegt ganz oben),
 *     - schreibt zuletzt <out>/assistent/intern/manifest.json mit den Prüfsummen aller Dateien.
 *       Der Assistent startet auf dem Server erst, wenn alle Dateien dazu passen – so arbeitet er
 *       nie mit einem halb hochgeladenen Stand.
 *  4. --stand (eigener Schritt VOR dem Assistenten-Schritt, läuft auch, wenn der scheitert):
 *     schreibt den Fingerabdruck der Wissensbasis dieses Builds nach <out>/assistent-stand.txt –
 *     außerhalb von assistent/, also immer mit der Website hochgeladen. Dieselbe Zahl steht in
 *     intern/wissen.json unter „fingerabdruck“. Weichen beide auf dem Server ab, wurde der
 *     Assistent nicht mit aktualisiert; er sperrt dann alle Preise (Wissen::veraltet). Nichts
 *     wird entfernt, nichts geprüft – der Schritt darf die Website nie aufhalten.
 *
 * Die öffentliche JSON-Datei wird in jedem Fall entfernt, auch bei einem Fehler.
 *
 * Fehlt ANTHROPIC_API_KEY, gibt es nur eine Warnung: Die Datei entsteht mit leerem Schlüssel, der
 * Assistent meldet dann „kein Schlüssel“ und ruft die KI nicht auf. Exit-Code 1 gibt es nur, wenn
 * die Wissensbasis fehlerhaft ist oder das Paket nicht vollständig gebaut werden kann – dann lässt
 * der Deploy den Assistenten auf dem Server unverändert, die Website geht trotzdem live.
 *
 * Schlüssel und Passwörter werden nie ausgegeben.
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const argumente = process.argv.slice(2);
const produktion = argumente.includes("--produktion");
const nurStand = argumente.includes("--stand");
const unbekannt = argumente.filter((a) => a.startsWith("--") && a !== "--produktion" && a !== "--stand");
const ordner = argumente.filter((a) => !a.startsWith("--"));

if (unbekannt.length || ordner.length !== 1 || (produktion && nurStand)) {
  console.error("Aufruf: node scripts/assistent-bauen.mjs <out> [--produktion | --stand]");
  process.exit(2);
}

const out = resolve(ordner[0]);
if (!existsSync(out) || !statSync(out).isDirectory()) {
  console.error(`Ordner ${ordner[0]} fehlt – erst \`npm run build\` ausführen.`);
  process.exit(2);
}

const QUELLE = join(out, "assistent-wissen.json");
const ASSISTENT = join(out, "assistent");
const INTERN = join(ASSISTENT, "intern");

const fehler = [];
const warnungen = [];

/* ── Hilfen ───────────────────────────────────────────────────────── */

const istText = (v) => typeof v === "string" && v.trim() !== "";
const istObjekt = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const istIsoDatum = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const sha256 = (inhalt) => createHash("sha256").update(inhalt).digest("hex");

/**
 * Fingerabdruck einer Wissensbasis: sha256 über den Inhalt ohne „stand“ (wechselt mit jedem
 * Build) und ohne „fingerabdruck“. Gleicher Inhalt, gleiche Zahl – auf dem Server reicht ein
 * Textvergleich, PHP muss nichts nachrechnen.
 */
function fingerabdruck(w) {
  const { stand, fingerabdruck: _, ...inhalt } = w;
  return sha256(JSON.stringify(inhalt));
}

/** „110,00 €“ → 11000 (Cent). Liefert null, wenn der Text kein eindeutiger Eurobetrag ist. */
function centAusText(text) {
  if (typeof text !== "string") return null;
  const m = text.replace(/[\s  ]/g, "").match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{2}))?€$/);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number(m[2] ?? 0);
}

/** Heutiges Datum in Berlin als JJJJ-MM-TT – dieselbe Grenze, die der Prüfer auf dem Server zieht. */
function heuteBerlin() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin" }).format(new Date());
}

/** Gibt es zu diesem Pfad der Website eine Datei im Build? (Next.js exportiert Seiten als <pfad>/index.html.) */
function seiteVorhanden(pfad) {
  let teile;
  try {
    teile = decodeURI(pfad).split("/").filter(Boolean);
  } catch {
    return false;
  }
  if (teile.some((t) => t === "..")) return false;
  const basis = join(out, ...teile);
  if (existsSync(join(basis, "index.html"))) return true;
  if (teile.length === 0) return false;
  if (existsSync(`${basis}.html`)) return true;
  return existsSync(basis) && statSync(basis).isFile();
}

/** Alle Dateien unterhalb eines Ordners, als Pfade relativ zu ihm. */
function dateienIn(verzeichnis, basis = verzeichnis, liste = []) {
  for (const name of readdirSync(verzeichnis)) {
    const pfad = join(verzeichnis, name);
    if (statSync(pfad).isDirectory()) dateienIn(pfad, basis, liste);
    else liste.push(relative(basis, pfad).split(sep).join("/"));
  }
  return liste;
}

/** PHP-String in einfachen Anführungszeichen: nur \ und ' müssen maskiert werden. */
const php = (s) => "'" + String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";

/* ── 1. Wissensbasis prüfen ───────────────────────────────────────── */

const PFLICHT_PLATZHALTER = [
  "LINK:preise",
  "LINK:unterlagen",
  "LINK:faq",
  "LINK:kontakt",
  "LINK:ablauf",
  "ZEIT:bearbeitung",
  "ZEIT:kennzeichen_versand",
  "SERVICEZEITEN",
  "PREIS:kennzeichenschilder",
  "PREIS:wunschkennzeichen",
  "TELEFON",
];

function pruefeWissen(w, preise) {
  if (!istObjekt(w)) {
    fehler.push("Die Wissensbasis ist kein JSON-Objekt.");
    return;
  }

  /* Grundgerüst */
  const vorher = fehler.length;
  if (!istObjekt(w.firma)) fehler.push("firma fehlt.");
  for (const feld of ["leistungen", "zusatz", "nicht_zusagen", "faq"]) {
    if (!Array.isArray(w[feld])) fehler.push(`${feld} fehlt oder ist keine Liste.`);
  }
  for (const feld of ["zeiten", "links", "platzhalter"]) {
    if (!istObjekt(w[feld])) fehler.push(`${feld} fehlt oder ist kein Objekt.`);
  }
  if (w.aktion !== null && !istObjekt(w.aktion)) fehler.push("aktion muss ein Objekt oder null sein.");
  // Ohne das Grundgerüst lohnt die Einzelprüfung nicht – sie würde nur Folgefehler melden.
  if (fehler.length > vorher) return;

  /* Pflichtfelder */
  if (!istIsoDatum(w.stand)) fehler.push("stand fehlt oder ist kein Datum (JJJJ-MM-TT).");
  for (const feld of ["name", "rechtsform", "sitz", "anschrift", "register", "vertretung", "telefon", "email", "web", "servicezeiten"]) {
    if (!istText(w.firma[feld])) fehler.push(`firma.${feld} fehlt oder ist leer.`);
  }
  if (istText(w.firma.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(w.firma.email)) fehler.push("firma.email ist keine E-Mail-Adresse.");

  const platzhalter = w.platzhalter;
  const links = w.links;

  for (const feld of ["bearbeitung", "kennzeichen_versand"]) {
    if (!istText(w.zeiten[feld])) fehler.push(`zeiten.${feld} fehlt oder ist leer.`);
  }
  if (typeof w.zeiten.bedingung !== "string") fehler.push("zeiten.bedingung fehlt.");

  w.nicht_zusagen.forEach((s, i) => {
    if (!istText(s)) fehler.push(`nicht_zusagen[${i}] ist leer.`);
  });
  w.faq.forEach((f, i) => {
    if (!istObjekt(f) || !istText(f.frage) || !istText(f.antwort)) fehler.push(`faq[${i}] braucht frage und antwort.`);
    else if ("im_prompt" in f && typeof f.im_prompt !== "boolean") fehler.push(`faq[${i}].im_prompt muss true oder false sein.`);
  });

  for (const [schluessel, wert] of Object.entries(platzhalter)) {
    if (!/^[A-Z]+(:[a-z0-9_-]+)*$/.test(schluessel)) fehler.push(`Platzhalter „${schluessel}“ hat keinen gültigen Namen.`);
    if (!istText(wert)) fehler.push(`Platzhalter ${schluessel} ist leer.`);
    else if (wert.includes("{{") || wert.includes("}}")) fehler.push(`Platzhalter ${schluessel} enthält selbst geschweifte Klammern.`);
  }
  for (const schluessel of PFLICHT_PLATZHALTER) {
    if (!(schluessel in platzhalter)) fehler.push(`Platzhalter ${schluessel} fehlt.`);
  }

  /* Leistungen */
  if (w.leistungen.length === 0) fehler.push("leistungen ist leer.");
  const slugs = new Set();
  w.leistungen.forEach((l, i) => {
    if (!istObjekt(l) || !istText(l.slug) || !/^[a-z0-9-]+$/.test(l.slug)) {
      fehler.push(`leistungen[${i}] hat keinen gültigen slug.`);
      return;
    }
    const wo = `Leistung ${l.slug}`;
    if (slugs.has(l.slug)) fehler.push(`${wo}: slug kommt doppelt vor.`);
    slugs.add(l.slug);
    for (const feld of ["name", "kurz", "dauer"]) {
      if (!istText(l[feld])) fehler.push(`${wo}: ${feld} fehlt oder ist leer.`);
    }
    for (const feld of ["preis", "preis_hinweis"]) {
      if (typeof l[feld] !== "string") fehler.push(`${wo}: ${feld} fehlt.`);
    }
    if (typeof l.preis_auf_anfrage !== "boolean") fehler.push(`${wo}: preis_auf_anfrage muss true oder false sein.`);
    if (!Array.isArray(l.unterlagen) || l.unterlagen.length === 0 || !l.unterlagen.every(istText)) {
      fehler.push(`${wo}: unterlagen fehlt oder enthält leere Einträge.`);
    } else if (platzhalter[`UNTERLAGEN:${l.slug}`] !== l.unterlagen.map((z) => `- ${z}`).join("\n")) {
      fehler.push(`${wo}: Platzhalter UNTERLAGEN:${l.slug} fehlt oder passt nicht zur Unterlagenliste.`);
    }
    if (!(`LINK:leistung:${l.slug}` in platzhalter)) fehler.push(`${wo}: Platzhalter LINK:leistung:${l.slug} fehlt.`);

    const preisSchluessel = `PREIS:${l.slug}`;
    if (l.preis_auf_anfrage === true) {
      // Ohne freigegebenen Preis darf kein Betrag in einen Entwurf geraten.
      if (preisSchluessel in platzhalter) fehler.push(`${wo}: Preis auf Anfrage, aber Platzhalter ${preisSchluessel} vorhanden.`);
      if (centAusText(l.preis) !== null) fehler.push(`${wo}: Preis auf Anfrage, aber im Feld preis steht ein Betrag.`);
    } else if (l.preis_auf_anfrage === false) {
      if (!istText(l.preis)) fehler.push(`${wo}: preis ist leer, obwohl kein „Preis auf Anfrage“ gesetzt ist.`);
      if (!(preisSchluessel in platzhalter)) fehler.push(`${wo}: Platzhalter ${preisSchluessel} fehlt.`);
      else if (platzhalter[preisSchluessel] !== l.preis) fehler.push(`${wo}: preis und Platzhalter ${preisSchluessel} sind verschieden.`);
    }
  });

  /* Zusatzleistungen */
  const zusatzSchluessel = new Set();
  w.zusatz.forEach((z, i) => {
    if (!istObjekt(z) || !istText(z.schluessel)) {
      fehler.push(`zusatz[${i}] hat keinen schluessel.`);
      return;
    }
    zusatzSchluessel.add(z.schluessel);
    for (const feld of ["name", "preis"]) {
      if (!istText(z[feld])) fehler.push(`Zusatz ${z.schluessel}: ${feld} fehlt oder ist leer.`);
    }
    if (typeof z.hinweis !== "string") fehler.push(`Zusatz ${z.schluessel}: hinweis fehlt.`);
    if (platzhalter[`PREIS:${z.schluessel}`] !== z.preis) {
      fehler.push(`Zusatz ${z.schluessel}: Platzhalter PREIS:${z.schluessel} fehlt oder weicht vom Feld preis ab.`);
    }
  });

  /* Preise gegen config/preise.json – die einzige Preisquelle der Website */
  const sollCent = new Map();
  for (const [slug, l] of Object.entries(preise.leistungen ?? {})) sollCent.set(slug, Math.round(l.preis * 100));
  for (const [key, z] of Object.entries(preise.zusatzleistungen ?? {})) sollCent.set(key, Math.round(z.preis * 100));
  for (const [schluessel, wert] of Object.entries(platzhalter)) {
    if (!schluessel.startsWith("PREIS:")) continue;
    const name = schluessel.slice("PREIS:".length);
    if (!slugs.has(name) && !zusatzSchluessel.has(name)) {
      fehler.push(`${schluessel}: Es gibt weder eine Leistung noch eine Zusatzleistung mit diesem Namen.`);
    }
    const ist = centAusText(wert);
    if (ist === null) fehler.push(`${schluessel}: „${wert}“ ist kein Eurobetrag.`);
    else if (!sollCent.has(name)) fehler.push(`${schluessel}: In config/preise.json steht dafür kein Preis.`);
    else if (sollCent.get(name) !== ist) {
      fehler.push(`${schluessel}: Wissensbasis nennt ${wert}, config/preise.json ${(sollCent.get(name) / 100).toFixed(2).replace(".", ",")} €.`);
    }
  }
  for (const slug of Object.keys(preise.leistungen ?? {})) {
    if (!(`PREIS:${slug}` in platzhalter)) {
      warnungen.push(`Für ${slug} steht ein Preis in config/preise.json, die Wissensbasis führt die Leistung aber ohne Preis.`);
    }
  }

  /* Aktion */
  if (Boolean(preise.aktion) !== Boolean(w.aktion)) {
    fehler.push("aktion: Wissensbasis und config/preise.json sind sich nicht einig, ob eine Aktion läuft.");
  } else if (w.aktion) {
    const a = w.aktion;
    if (!istText(a.name) || !istText(a.text)) fehler.push("aktion: name oder text fehlt.");
    if (!istIsoDatum(a.gueltig_bis)) fehler.push("aktion.gueltig_bis fehlt oder ist kein Datum (JJJJ-MM-TT).");
    else if (a.gueltig_bis !== preise.aktion.gueltigBis) fehler.push("aktion.gueltig_bis weicht von config/preise.json ab.");
    if (!Array.isArray(a.leistungen) || !a.leistungen.every(istText)) fehler.push("aktion.leistungen fehlt oder ist keine Liste von Slugs.");
    else {
      const soll = [...(preise.aktion.leistungen ?? [])].sort().join(",");
      if ([...a.leistungen].sort().join(",") !== soll) fehler.push("aktion.leistungen weicht von config/preise.json ab.");
      for (const slug of a.leistungen) {
        if (!slugs.has(slug)) fehler.push(`aktion.leistungen nennt „${slug}“, diese Leistung gibt es in der Wissensbasis nicht.`);
      }
    }
    if (istIsoDatum(a.gueltig_bis) && a.gueltig_bis < heuteBerlin()) {
      warnungen.push(
        `Die Aktion „${a.name}“ ist seit ${a.gueltig_bis} abgelaufen. Der Assistent sperrt die Preise dieser Leistungen, ` +
          "bis config/preise.json aktualisiert und neu veröffentlicht ist.",
      );
    }
  }

  /* Links: eigene Website, vorhandene Seite, Platzhalter und Liste stimmen überein */
  let herkunft = "";
  try {
    herkunft = new URL(w.firma.web).origin;
  } catch {
    fehler.push("firma.web ist keine gültige Adresse.");
  }
  for (const [name, adresse] of Object.entries(links)) {
    let url;
    try {
      url = new URL(adresse);
    } catch {
      fehler.push(`Link ${name}: „${adresse}“ ist keine gültige Adresse.`);
      continue;
    }
    if (url.protocol !== "https:" || (herkunft && url.origin !== herkunft)) {
      fehler.push(`Link ${name}: zeigt nicht auf die eigene Website (${adresse}).`);
      continue;
    }
    // Geprüft wird der Pfad ohne Parameter – die Parameter wertet erst die Seite im Browser aus.
    if (!seiteVorhanden(url.pathname)) fehler.push(`Link ${name}: Die Seite ${url.pathname} gibt es im Build nicht.`);

    const parameter = [...url.searchParams.keys()];
    if (name === "auftrag" || name.startsWith("auftrag:")) {
      // Bestell-Links tragen genau die Kennung für die eigene Webanalyse, sonst nichts Zusätzliches.
      if (url.searchParams.get("utm_source") !== "email-assistent") fehler.push(`Link ${name}: utm_source=email-assistent fehlt.`);
      if (parameter.some((p) => p !== "leistung" && p !== "utm_source")) fehler.push(`Link ${name}: enthält unerwartete Parameter.`);
      const slug = name.includes(":") ? name.slice(name.indexOf(":") + 1) : null;
      if (slug !== null && url.searchParams.get("leistung") !== slug) fehler.push(`Link ${name}: Parameter leistung passt nicht zum Namen.`);
      if (slug !== null && !slugs.has(slug)) fehler.push(`Link ${name}: Diese Leistung gibt es in der Wissensbasis nicht.`);
    } else if (parameter.length) {
      fehler.push(`Link ${name}: enthält unerwartete Parameter.`);
    }
  }
  const adressen = new Set(Object.values(links));
  for (const [schluessel, wert] of Object.entries(platzhalter)) {
    if (schluessel.startsWith("LINK:")) {
      if (links[schluessel.slice("LINK:".length)] !== wert) fehler.push(`${schluessel}: steht nicht mit derselben Adresse unter links.`);
    } else if (istText(wert) && /https?:\/\//i.test(wert) && !adressen.has(wert)) {
      fehler.push(`${schluessel}: enthält eine Adresse, die nicht unter links steht.`);
    }
  }
}

/* ── 2. Produktions-Paket ─────────────────────────────────────────── */

function schreibeZugang() {
  // Leerzeichen und Zeilenumbrüche vom Kopieren gehören nie zum Schlüssel.
  const schluessel = (process.env.ANTHROPIC_API_KEY ?? "").replace(/\s+/g, "");
  const mailUser = (process.env.ASSISTENT_MAIL_USER ?? "").trim();
  const mailPass = process.env.ASSISTENT_MAIL_PASS ?? "";
  const mailHost = (process.env.ASSISTENT_MAIL_HOST ?? "").trim();

  if (!schluessel) {
    warnungen.push(
      "Kein Claude-Schlüssel hinterlegt (GitHub-Secret ANTHROPIC_API_KEY fehlt). Der Assistent wird veröffentlicht, " +
        "ruft die KI aber nicht auf. Einrichten: bash scripts/ki-schluessel-einrichten.sh",
    );
  } else if (!schluessel.startsWith("sk-ant-")) {
    warnungen.push("ANTHROPIC_API_KEY beginnt nicht mit „sk-ant-“ – bitte prüfen, ob der richtige Schlüssel hinterlegt ist.");
  }
  if (Boolean(mailUser) !== Boolean(mailPass)) {
    warnungen.push("ASSISTENT_MAIL_USER und ASSISTENT_MAIL_PASS gehören zusammen – nur eines von beiden ist gesetzt.");
  }

  const inhalt = `<?php
// Automatisch beim Deploy erzeugt (scripts/assistent-bauen.mjs). Nicht bearbeiten, nicht einchecken.
return [
    'anthropic_key' => ${php(schluessel)},
    'mail_user' => ${php(mailUser)},
    'mail_pass' => ${php(mailPass)},
    'mail_host' => ${php(mailHost)},
];
`;
  writeFileSync(join(INTERN, "zugang-daten.php"), inhalt, { mode: 0o600 });
  console.log(
    `Zugang geschrieben (assistent/intern/zugang-daten.php, Claude-Schlüssel: ${schluessel ? "vorhanden" : "fehlt"}, ` +
      `eigenes Postfach: ${mailUser && mailPass ? "ja" : "nein, wie das Formular"}).`,
  );
}

/** Packt die Bibliotheken als ein Archiv; liefert Namen, Größe und Prüfsumme. */
function packeBibliotheken() {
  const lock = join(root, "server", "assistent", "composer.lock");
  const vendor = join(root, "server", "assistent", "vendor");
  if (!existsSync(lock)) {
    fehler.push("server/assistent/composer.lock fehlt.");
    return null;
  }
  if (!existsSync(join(vendor, "autoload.php"))) {
    fehler.push("server/assistent/vendor fehlt – erst `composer install --no-dev --working-dir=server/assistent` ausführen.");
    return null;
  }

  const hash = sha256(readFileSync(lock)).slice(0, 12);
  const name = `vendor-${hash}.zip`;
  const ziel = join(INTERN, name);

  // start.php erwartet genau ein Archiv und liest die Kennung aus dessen Namen.
  for (const alt of readdirSync(INTERN)) {
    if (/^vendor-.*\.zip$/.test(alt)) rmSync(join(INTERN, alt), { force: true });
  }

  // Node bringt kein Zip mit; das Systemwerkzeug gibt es auf GitHub-Runnern und unter macOS.
  // Aus dem Ordner heraus gepackt, damit autoload.php ganz oben im Archiv liegt.
  const lauf = spawnSync("zip", ["-q", "-r", "-X", ziel, ".", "-x", "*.DS_Store"], { cwd: vendor, encoding: "utf8" });
  if (lauf.error || lauf.status !== 0) {
    const grund = lauf.error?.code === "ENOENT" ? "das Programm zip ist nicht installiert" : `zip endete mit Code ${lauf.status}`;
    fehler.push(`Bibliotheken konnten nicht gepackt werden (${grund}).`);
    rmSync(ziel, { force: true });
    return null;
  }

  // Gegenprobe, wenn unzip vorhanden ist: autoload.php muss auf der obersten Ebene liegen.
  const probe = spawnSync("unzip", ["-Z1", ziel, "autoload.php"], { encoding: "utf8" });
  if (!probe.error && probe.status !== 0) {
    fehler.push("Das Archiv der Bibliotheken enthält autoload.php nicht auf der obersten Ebene.");
    rmSync(ziel, { force: true });
    return null;
  }

  // Feste Dateizeit: Übernimmt der FTP-Server sie, erkennt lftp das Archiv beim nächsten Deploy
  // als unverändert (gleiche Größe, gleiche Zeit) und lädt die mehreren Megabyte nicht erneut hoch.
  // Übernimmt er sie nicht, wird einfach jedes Mal neu hochgeladen.
  const festeZeit = new Date("2020-01-01T00:00:00Z");
  utimesSync(ziel, festeZeit, festeZeit);

  const inhalt = readFileSync(ziel);
  console.log(`Bibliotheken gepackt (assistent/intern/${name}, ${(inhalt.length / 1024 / 1024).toFixed(1)} MB).`);
  return { datei: `intern/${name}`, bytes: inhalt.length, sha256: sha256(inhalt) };
}

/**
 * Prüfsummen aller Programm- und Datendateien. Der Zugang bleibt draußen (geheim, ändert sich
 * beim Schlüsseltausch), das Manifest selbst ebenso.
 */
function schreibeManifest(vendorArchiv) {
  const ARTEN = new Set([".php", ".js", ".css", ".html", ".json"]);
  const AUSGENOMMEN = new Set(["intern/manifest.json", "intern/zugang-daten.php"]);
  const dateien = {};
  for (const pfad of dateienIn(ASSISTENT).sort()) {
    if (!ARTEN.has(extname(pfad).toLowerCase()) || AUSGENOMMEN.has(pfad)) continue;
    dateien[pfad] = sha256(readFileSync(join(ASSISTENT, pfad)));
  }
  const manifest = { erzeugt: new Date().toISOString(), vendor: vendorArchiv, dateien };
  writeFileSync(join(INTERN, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Manifest geschrieben (assistent/intern/manifest.json, ${Object.keys(dateien).length} Dateien).`);
}

/* ── Ablauf ───────────────────────────────────────────────────────── */

function melde() {
  for (const w of warnungen) console.log(`::warning::${w}`);
  if (fehler.length) {
    console.error(`\nKI-Assistent: ${fehler.length} Problem(e):`);
    for (const f of fehler) console.error(" ✗", f);
  }
}

/** Entfernt alles, was dieses Skript in assistent/intern/ erzeugt. */
function entferneErzeugtes() {
  if (!existsSync(INTERN)) return;
  for (const name of readdirSync(INTERN)) {
    if (["wissen.json", "zugang-daten.php", "manifest.json"].includes(name) || /^vendor-.*\.zip$/.test(name)) {
      rmSync(join(INTERN, name), { recursive: true, force: true });
    }
  }
}

let wissen = null;
let preise = null;
let abgeschlossen = false;

if (nurStand) {
  // Eigener, kurzer Weg: lesen, Fingerabdruck schreiben, fertig. Kein Löschen, kein Exit ≠ 0
  // wegen des Inhalts – fehlt die Datei, gibt es eben keinen Abgleich auf dem Server.
  try {
    const w = JSON.parse(readFileSync(QUELLE, "utf8"));
    writeFileSync(join(out, "assistent-stand.txt"), `${fingerabdruck(w)}\n`);
    console.log("Fingerabdruck der Wissensbasis geschrieben (assistent-stand.txt).");
  } catch {
    console.log("::warning::Kein Fingerabdruck der Wissensbasis – der Server prüft dann nicht, ob der Assistent zur Website passt.");
  }
  process.exit(0);
}

try {
  try {
    preise = JSON.parse(readFileSync(join(root, "config", "preise.json"), "utf8"));
  } catch {
    fehler.push("config/preise.json fehlt oder ist kein gültiges JSON.");
  }

  if (!existsSync(QUELLE) || !statSync(QUELLE).isFile()) {
    fehler.push("Die Wissensbasis fehlt im Build (assistent-wissen.json) – ist app/assistent-wissen.json/route.ts noch da?");
  } else {
    try {
      wissen = JSON.parse(readFileSync(QUELLE, "utf8"));
    } catch {
      fehler.push("Die Wissensbasis ist kein gültiges JSON.");
    }
  }

  if (wissen !== null && preise !== null) pruefeWissen(wissen, preise);

  if (produktion && preise !== null && preise.freigabe?.freigegeben !== true) {
    fehler.push("Preise sind nicht freigegeben (config/preise.json → freigabe.freigegeben) – keine Wissensbasis für den Live-Betrieb.");
  }

  if (produktion && fehler.length === 0) {
    // Der Ordner intern/ enthält Schlüssel, Wissensbasis und Bibliotheken. Ohne seine Sperre
    // (public/assistent/intern/.htaccess) wird nichts davon abgelegt.
    const sperre = join(INTERN, ".htaccess");
    if (!existsSync(sperre) || !/Require\s+all\s+denied/i.test(readFileSync(sperre, "utf8"))) {
      fehler.push("assistent/intern/.htaccess mit „Require all denied“ fehlt im Build – ohne diese Sperre wird kein Zugang abgelegt.");
    } else {
      // Mit Fingerabdruck (siehe --stand): So erkennt der Server, ob seine Wissensbasis zur
      // zuletzt veröffentlichten Website passt.
      writeFileSync(join(INTERN, "wissen.json"), `${JSON.stringify({ ...wissen, fingerabdruck: fingerabdruck(wissen) }, null, 2)}\n`);
      console.log(
        `Wissensbasis abgelegt (assistent/intern/wissen.json, Stand ${wissen.stand}, ${wissen.leistungen.length} Leistungen, ` +
          `${Object.keys(wissen.platzhalter).length} Platzhalter, ${Object.keys(wissen.links).length} Links).`,
      );
      schreibeZugang();
      const archiv = packeBibliotheken();
      if (archiv !== null) schreibeManifest(archiv);
    }
  }
  abgeschlossen = true;
} finally {
  // Die öffentliche Kopie verschwindet immer; ohne --produktion auch der ganze Assistent.
  rmSync(QUELLE, { recursive: true, force: true });
  if (!produktion) rmSync(ASSISTENT, { recursive: true, force: true });
  // Nach einem Fehler – auch einem unerwarteten – bleibt nichts Halbfertiges liegen,
  // vor allem kein Zugang ohne Manifest.
  else if (!abgeschlossen || fehler.length) entferneErzeugtes();
}

melde();
if (fehler.length) {
  if (produktion) console.error("\nDer Assistent wird nicht veröffentlicht; auf dem Server bleibt die bisherige Fassung.");
  process.exit(1);
}
if (produktion) {
  console.log("KI-Assistent bereit zum Hochladen.");
} else {
  console.log(
    `Wissensbasis geprüft (Stand ${wissen.stand}, ${wissen.leistungen.length} Leistungen, ${Object.keys(wissen.platzhalter).length} Platzhalter). ` +
      "Assistent aus dem Build entfernt – auf GitHub Pages läuft kein PHP.",
  );
}
