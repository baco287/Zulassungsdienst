#!/usr/bin/env node
/**
 * Übernimmt recherchierte Zulassungsstellen (JSON-Rohdaten) in
 * lib/data/zulassungsstellen.json.
 *
 *   node scripts/import-zulassungsstellen.mjs <rohdaten1.json> [rohdaten2.json …]
 *
 * Prüft jede Angabe auf eine Quell-URL. Angaben ohne Quelle werden verworfen,
 * Einträge ohne Behördenname, Website oder Zuständigkeit werden übersprungen
 * (sie erscheinen dann nicht auf der Website). Bestehende Einträge mit
 * gleichem Slug werden ersetzt, alle anderen bleiben erhalten.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const target = join(root, "lib/data/zulassungsstellen.json");

/**
 * Bewusst nicht übernommene Angaben (z. B. widersprüchliche Behördenseiten).
 * Schlüssel: Slug, Wert: Muster für den Text einer Besonderheit.
 */
const EXCLUDE_BESONDERHEITEN = {
  // Behördenseite widerspricht sich bei den Zahlungsarten (Stand 03.11.2026).
  gelsenkirchen: /bargeldlos|Zahlung|EC-|Kreditkarte/i,
};

/** Kürzel ohne Beleg auf einer Behördenseite (nur Wikipedia) – nicht veröffentlichen. */
const EXCLUDE_KUERZEL = {
  bochum: ["WAT"],
};

/**
 * Online-Portal laut Behörde derzeit abgeschaltet – Link nicht anzeigen,
 * damit die Seite kein funktionierendes i-Kfz verspricht (Stand 03.11.2026).
 */
const IKFZ_AUSSER_BETRIEB = new Set(["duesseldorf"]);

/** Manuell geprüfte Ergänzungen bzw. Korrekturen (mit Quelle, Prüfdatum im Kommentar). */
const OVERRIDES = {
  // Geprüft am 03.11.2026 auf service.duesseldorf.de.
  duesseldorf: {
    hinweis:
      "Vorsprache nur nach vorheriger Terminvereinbarung. Die Stadt nennt auf verschiedenen Seiten abweichende Zeiten – bitte vor dem Besuch prüfen.",
    besonderheitenZusatz: [
      {
        wert: "Laut Serviceportal der Stadt stehen die Online-Zulassung (i-Kfz) und die Online-Reservierung von Wunschkennzeichen wegen einer Sicherheitslücke bis auf Weiteres nicht zur Verfügung.",
        quelle: "https://service.duesseldorf.de/suche/-/vr-bis-detail/dienstleistung/16447/show",
      },
    ],
  },
};

const isUrl = (u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u);
const belegt = (wert, quelle) => (wert && isUrl(quelle) ? { wert: String(wert).trim(), quelle } : null);
const link = (o) => (o && isUrl(o.url) && isUrl(o.quelle) ? { wert: o.url, quelle: o.quelle } : null);

const existing = existsSync(target) ? JSON.parse(readFileSync(target, "utf8")) : [];
const bySlug = new Map(existing.map((z) => [z.slug, z]));
const report = [];

for (const file of process.argv.slice(2)) {
  if (!existsSync(file)) {
    report.push(`übersprungen (fehlt): ${file}`);
    continue;
  }
  const raw = JSON.parse(readFileSync(file, "utf8"));
  for (const r of raw) {
    const exclude = EXCLUDE_BESONDERHEITEN[r.slug];
    const z = {
      slug: r.slug,
      stadt: r.stadt,
      bundesland: r.bundesland,
      behoerde: belegt(r.behoerde, r.behoerdeQuelle),
      traeger: r.traeger ?? null,
      standorte: (r.standorte ?? [])
        .filter((s) => s.strasse && s.plz && s.ort && isUrl(s.quelle))
        .map((s) => ({ bezeichnung: s.bezeichnung, strasse: s.strasse, plz: String(s.plz), ort: s.ort, quelle: s.quelle })),
      website: link(r.website),
      terminUrl: link(r.terminUrl),
      ikfzUrl: IKFZ_AUSSER_BETRIEB.has(r.slug) ? null : link(r.ikfzUrl),
      oeffnungszeiten:
        r.oeffnungszeiten &&
        Array.isArray(r.oeffnungszeiten.zeilen) &&
        (r.oeffnungszeiten.zeilen.length || r.oeffnungszeiten.hinweis) &&
        isUrl(r.oeffnungszeiten.quelle)
          ? { zeilen: r.oeffnungszeiten.zeilen, hinweis: r.oeffnungszeiten.hinweis || null, quelle: r.oeffnungszeiten.quelle }
          : null,
      zustaendigkeit: r.zustaendigkeit ? belegt(r.zustaendigkeit.text, r.zustaendigkeit.quelle) : null,
      kuerzel: (r.kuerzel ?? [])
        .filter((k) => k.code && k.bedeutung && isUrl(k.quelle))
        .filter((k) => !(EXCLUDE_KUERZEL[r.slug] ?? []).includes(String(k.code).toUpperCase()))
        .map((k) => ({ code: String(k.code).toUpperCase(), bedeutung: k.bedeutung, quelle: k.quelle })),
      besonderheiten: (r.besonderheiten ?? [])
        .filter((b) => b.text && isUrl(b.quelle) && !(exclude && exclude.test(b.text)))
        .map((b) => ({ wert: b.text, quelle: b.quelle })),
      geprueftAm: r.abgerufenAm,
    };
    const o = OVERRIDES[r.slug];
    if (o) {
      if (o.hinweis && z.oeffnungszeiten) z.oeffnungszeiten.hinweis = o.hinweis;
      if (o.besonderheitenZusatz) z.besonderheiten = [...o.besonderheitenZusatz, ...z.besonderheiten].slice(0, 4);
    }
    const missing = ["behoerde", "website", "zustaendigkeit"].filter((k) => !z[k]);
    if (missing.length || !/^\d{4}-\d{2}-\d{2}$/.test(z.geprueftAm ?? "")) {
      report.push(`NICHT übernommen: ${r.slug} (fehlt: ${missing.join(", ") || "Prüfdatum"})`);
      continue;
    }
    bySlug.set(z.slug, z);
    report.push(
      `ok: ${z.slug} – ${z.standorte.length} Standort(e), Kürzel ${z.kuerzel.map((k) => k.code).join("/")}, ` +
        `Zeiten ${z.oeffnungszeiten ? "ja" : "nein"}, Termin ${z.terminUrl ? "ja" : "nein"}, i-Kfz ${z.ikfzUrl ? "ja" : "nein"}`
    );
  }
}

const out = [...bySlug.values()].sort((a, b) => a.stadt.localeCompare(b.stadt, "de"));
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(report.join("\n"));
console.log(`\n${out.length} Zulassungsstellen in ${target}`);
