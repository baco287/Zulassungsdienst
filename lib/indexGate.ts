/**
 * Index-Gate für lokale Seiten (Behörden-, Stadt- und Kennzeichenseiten).
 *
 * Eine Seite wird nur indexiert und in Sitemap und /llms.txt aufgenommen, wenn
 * sie individuelle, aus offiziellen Quellen belegte Angaben hat. Alle anderen
 * bleiben erreichbar und intern verlinkt, tragen aber `noindex,follow` – so
 * entstehen keine Doorway Pages und keine 404-Fehler.
 *
 * Regelwerk und Herleitung: docs/seo/local-seo-audit.md, Abschnitt 5.
 */
import type { City } from "./staedte";
import { getZulassungsstelle, type KennzeichenEintrag, type Zulassungsstelle } from "./zulassungsstellen";

/**
 * Inoffizielle Quellen. Muss mit BLOCKED_HOSTS in
 * scripts/verify-zulassungsstellen.mjs übereinstimmen.
 */
const BLOCKED_HOSTS: RegExp[] = [
  /wikipedia\.org$/, /wikimedia\.org$/, /11880\.com$/, /gelbeseiten\.de$/, /dasoertliche\.de$/,
  /meinestadt\.de$/, /golocal\.de$/, /cylex/, /yelp\./, /branchen/, /kennzeichen/, /zulassungsdienst/,
  /zulassung24/, /zulassung\.de$/, /bundeszulassung/, /kfzportal/, /ikfz\.net$/, /strassenverkehrsamt\.de$/,
  /verkehrsamt\.de$/, /zulassungsstelle\.de$/, /zulassungsstellen\.de$/, /google\./, /facebook\./,
  /tripadvisor\./, /check24/, /adac\.de$/,
];

/** Halbjährliche Neuprüfung: ältere Angaben verlieren automatisch den Index. */
const MAX_AGE_DAYS = 183;
/** Nur die gesetzliche Grundregel (§ 75 FZV) ersetzt keine lokale Zuständigkeitsangabe. */
const LEGAL_FALLBACK = "gesetze-im-internet.de";

/**
 * Die 20 Städte, deren Stadtseiten zuerst hochwertig ausgebaut werden.
 * Weitere Stadtseiten erst, wenn Qualität, Indexierung und Conversions dieser
 * Gruppe geprüft sind.
 */
export const PRIORITAETSSTAEDTE = [
  "berlin", "hamburg", "muenchen", "koeln", "frankfurt", "stuttgart", "duesseldorf", "leipzig",
  "hannover", "nuernberg", "dortmund", "essen", "bremen", "dresden", "karlsruhe", "mannheim",
  "muenster", "bonn", "wiesbaden", "augsburg",
] as const;

/** Unbelegte Aussagen zu Terminlage oder Wartezeiten (dürfen auf Stadtseiten nicht stehen). */
export const WARTE_CLAIM =
  /(?<![A-Za-zÄÖÜäöüß])Wochen?(?![a-zäöüß])|wochenlang|ausgebucht|begehrt|Andrang|ausgelastet|erk[äa]mpft|vergriffen|\brar\b|schnell weg|gut gef[üu]llt|\bwarten\b|Wartezeit|schwerer zu bekommen|einreihen/i;

const host = (u?: string | null) => {
  try {
    return new URL(u ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export const isOfficial = (u?: string | null) =>
  Boolean(u) && host(u) !== "" && !BLOCKED_HOSTS.some((r) => r.test(host(u)));

/** Stichtag ist der Build: Der statische Export entsteht bei jedem Deploy neu. */
const today = new Date();
const isFresh = (iso?: string | null) =>
  Boolean(iso) && (today.getTime() - new Date(iso!).getTime()) / 86_400_000 <= MAX_AGE_DAYS;

/** B1–B8: Behördenseite mit offiziell belegten, aktuellen Pflichtangaben. */
export function stelleIndexable(z: Zulassungsstelle): boolean {
  return Boolean(
    z.behoerde?.wert && isOfficial(z.behoerde.quelle) &&
      z.website?.wert && isOfficial(z.website.wert) &&
      z.zustaendigkeit?.wert && isOfficial(z.zustaendigkeit.quelle) &&
      !host(z.zustaendigkeit.quelle).endsWith(LEGAL_FALLBACK) &&
      z.standorte.length > 0 && z.standorte.every((s) => isOfficial(s.quelle)) &&
      z.kuerzel.length > 0 &&
      (z.terminUrl || z.ikfzUrl || z.oeffnungszeiten) &&
      z.besonderheiten.some((b) => isOfficial(b.quelle)) &&
      isFresh(z.geprueftAm),
  );
}

/**
 * Stadtseiten – Stufe 1 (Sprint 1): Nur die 20 Prioritätsstädte mit
 * gate-fähiger Behördenseite bleiben im Index, alle übrigen gehen auf noindex.
 * Stufe 2 (Sprint 3, mit dem Ausbau der Prioritätsseiten) ergänzt die Pflicht
 * für eigenes Prüfdatum, Nachbarbehörden und mindestens drei lokale FAQ.
 */
export function cityIndexable(c: City): boolean {
  const z = getZulassungsstelle(c.slug);
  const text = [...c.intro, ...c.faq.map((f) => `${f.question} ${f.answer}`)].join(" ");
  return Boolean(
    (PRIORITAETSSTAEDTE as readonly string[]).includes(c.slug) &&
      z && stelleIndexable(z) &&
      !WARTE_CLAIM.test(text),
  );
}

/** K1–K3: offizielle Kürzel-Quelle, gate-fähige Behörden, eigener Mehrwert. */
export function kennzeichenIndexable(k: KennzeichenEintrag): boolean {
  const mehrwert =
    k.stellen.length >= 2 ||
    /Altkennzeichen|wieder erhältlich|vergeben|auch im|und Landkreis/i.test(k.hinweis ?? "");
  return isOfficial(k.quelle) && k.stellen.every(stelleIndexable) && mehrwert;
}

/** Robots-Angabe für generateMetadata. */
export const robotsFor = (indexable: boolean) =>
  indexable ? undefined : ({ index: false, follow: true } as const);
