import { serviceCatalog, type CatalogEntry } from "@/lib/catalog";
import { getService } from "@/lib/services";
import {
  AKTION,
  aktionsHinweis,
  P,
  PRICE_CONFIG,
  PRICE_DATE,
  priceDisclaimer,
  wunschkennzeichenHinweis,
} from "@/lib/pricing";
import { BETRIEB_STAND, DAUER_UEBERSICHT, KENNZEICHEN_HINWEIS, ZEIT, offeneEntscheidungen } from "@/lib/betrieb";
import { faqItems } from "@/lib/faq";
import { site } from "@/lib/site";

/**
 * /assistent-wissen.json – Wissensbasis des KI-Assistenten für E-Mail.
 *
 * Grundsatz: Der Assistent sagt nur, was die Website öffentlich sagt. Deshalb
 * entsteht diese Datei beim Build aus denselben Quellen wie die Seiten selbst
 * (Leistungskatalog, config/preise.json, config/betrieb.json, FAQ, Stammdaten)
 * und nicht aus einer zweiten, von Hand gepflegten Liste.
 *
 * Die Datei bleibt nicht öffentlich liegen: scripts/assistent-bauen.mjs prüft sie
 * nach dem Build, verschiebt sie in den gesperrten Ordner assistent/intern/ und
 * löscht sie hier (im Staging-Build ersatzlos). Form und Feldnamen sind in
 * docs/ki-assistent/BAUPLAN.md, Abschnitt 4.10, festgelegt – der PHP-Teil
 * (public/assistent/intern/Wissen.php, Prompt.php, Pruefer.php, Versand.php)
 * verlässt sich darauf.
 */
export const dynamic = "force-static";

/** Kennung der Bestell-Links in der eigenen Webanalyse (docs/TRACKING.md). Nie personenbezogen. */
const UTM_QUELLE = "email-assistent";

/**
 * Aus der Kategorie „Service & Betreuung“ kommen nur die Einträge hinein, zu denen
 * Kunden per E-Mail tatsächlich fragen. „Privatkunden“ ist eine reine Übersichtsseite
 * und verspricht eine feste Ansprechperson – das ist laut config/betrieb.json noch offen.
 */
const SERVICE_EINTRAEGE = new Set(["gewerbekunden", "abhol-bringservice"]);

/**
 * Offene Betreiberentscheidungen (config/betrieb.json, status "offen") als kurze
 * Stichworte. Die Fragen dort sind intern formuliert und gehören nicht in einen
 * Kundentext; der Assistent braucht nur zu wissen, wozu er nichts zusagen darf.
 */
const NICHT_ZUSAGEN: Record<string, string[]> = {
  "zeiten.kunde.identUndSignatur": ["Dauer der Identitätsprüfung"],
  "zeiten.pruefungDurchDZ": ["Dauer unserer Unterlagenprüfung"],
  "zeiten.versand": ["Versanddienstleister", "Versanddauer von Papieren und Plaketten"],
  "zeiten.antwortzeit": ["Antwortzeit"],
  "abwicklung.identifizierung": ["Verfahren der Identitätsprüfung"],
  "abwicklung.neuzulassungAbwickelbar": ["Ob eine Neuzulassung in jedem Einzelfall möglich ist"],
  "abwicklung.schilder": ["Einzelheiten zur Lieferung der Kennzeichenschilder"],
  "abwicklung.festeAnsprechperson": ["feste Ansprechperson mit Namen"],
  "regionen.einschraenkungen": ["Abwicklung bei jeder einzelnen Zulassungsbehörde"],
};

/**
 * Kommt in config/betrieb.json ein neuer offener Punkt dazu, für den oben noch kein
 * Stichwort steht, darf er nicht stillschweigend fehlen: Dann wird der Schlüssel
 * lesbar gemacht („festeAnsprechperson“ → „feste Ansprechperson“).
 */
function stichwortAusPfad(pfad: string): string {
  const letztes = pfad.split(".").at(-1) ?? pfad;
  return letztes.replace(/([a-zäöüß])([A-ZÄÖÜ])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

const u = (pfad: string) => `${site.url}${pfad}`;

/** Bestell-Link einer Leistung; der Zusatz dient nur der Zählung in der eigenen Webanalyse. */
function bestellLink(href: string): string {
  const url = new URL(href, site.url);
  url.searchParams.set("utm_source", UTM_QUELLE);
  return url.toString();
}

/**
 * Dauer so, wie die Leistungsseite sie zeigt („Typische Dauer“). Gehört zur Leistung
 * ein Versand, steht er dabei – sonst läse sich die kurze Bearbeitungszeit wie
 * „in einer halben Stunde ist alles da“. Die Laufzeit neuer Kennzeichenschilder
 * steht nur bei Leistungen, zu denen man Schilder mitbestellen kann.
 */
function dauerText(e: CatalogEntry, anzeige: string): string {
  if (e.zeiten.bearbeitung === null || e.zeiten.versand === null) return anzeige;
  return e.kennzeichen.moeglich ? `${anzeige}, ${e.zeiten.versand}` : `${anzeige}, zuzüglich Versand`;
}

/**
 * toLocaleString setzt zwischen Betrag und „€“ ein geschütztes Leerzeichen. In einer
 * Nur-Text-Mail und in den Vergleichen des Prüfers (Pruefer.php) soll ein gewöhnliches
 * Leerzeichen stehen, sonst gelten gleiche Beträge als verschieden.
 */
function glatt<T>(wert: T): T {
  if (typeof wert === "string") return wert.replace(/[  ]/g, " ") as T;
  if (Array.isArray(wert)) return wert.map(glatt) as T;
  if (wert && typeof wert === "object") {
    return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, glatt(v)])) as T;
  }
  return wert;
}

/** Häufige Fragen, deren Antwort der Systemtext schon an anderer Stelle enthält (siehe faq unten). */
const FAQ_NICHT_IM_PROMPT = new Set([
  "Wie funktioniert die Online-Zulassung über KFZ-Zulassungsprofis?",
  "Was kostet die Zulassung insgesamt?",
  "Wie lange dauert eine Zulassung?",
  "Wann kommen meine Kennzeichen?",
  "Welche Unterlagen brauche ich?",
  "Wann sind Sie erreichbar – auch am Wochenende?",
  "Ist KFZ-Zulassungsprofis eine Behörde?",
]);

export function GET() {
  const eintraege = serviceCatalog
    .map((e) => ({ e, s: getService(e.slug) }))
    .filter((x): x is { e: CatalogEntry; s: NonNullable<ReturnType<typeof getService>> } => Boolean(x.s))
    .filter(({ s }) => s.category !== "service" || SERVICE_EINTRAEGE.has(s.slug))
    .sort((a, b) => a.s.order - b.s.order);

  const links: Record<string, string> = {};
  const platzhalter: Record<string, string> = {};

  const leistungen = eintraege.map(({ e, s }) => {
    // Preis nur, wenn er freigegeben und fest ist (Katalog: preis !== null) – sonst bleibt das
    // Feld leer und es gibt bewusst keinen PREIS-Platzhalter, damit kein Betrag in einen Entwurf gerät.
    const aufAnfrage = e.preis === null;
    if (!aufAnfrage) platzhalter[`PREIS:${e.slug}`] = e.preisText;
    platzhalter[`UNTERLAGEN:${e.slug}`] = e.unterlagen.map((zeile) => `- ${zeile}`).join("\n");
    // Bestellen lässt sich nur, was das Auftragsformular anbietet – die Service-Einträge nicht.
    if (s.category !== "service") {
      links[`auftrag:${e.slug}`] = bestellLink(e.ctaHref);
      platzhalter[`LINK:auftrag:${e.slug}`] = links[`auftrag:${e.slug}`];
    }
    links[`leistung:${e.slug}`] = u(e.detailHref);
    platzhalter[`LINK:leistung:${e.slug}`] = links[`leistung:${e.slug}`];
    return {
      slug: e.slug,
      name: e.name,
      kurz: e.kurz,
      beschreibung: e.lang,
      preis: aufAnfrage ? "" : e.preisText,
      preis_hinweis: s.price.note ?? "",
      preis_auf_anfrage: aufAnfrage,
      unterlagen: e.unterlagen,
      dauer: dauerText(e, s.duration),
    };
  });

  const zusatz = [
    {
      schluessel: "kennzeichenschilder",
      name: PRICE_CONFIG.zusatzleistungen.kennzeichenschilder.bezeichnung,
      preis: P.kennzeichen,
      hinweis: `${KENNZEICHEN_HINWEIS.kurz} ${KENNZEICHEN_HINWEIS.fahren} ${KENNZEICHEN_HINWEIS.eilig}`,
    },
    {
      schluessel: "wunschkennzeichen",
      name: PRICE_CONFIG.zusatzleistungen.wunschkennzeichen.bezeichnung,
      preis: P.wunschkennzeichen,
      hinweis: wunschkennzeichenHinweis,
    },
  ];
  for (const z of zusatz) platzhalter[`PREIS:${z.schluessel}`] = z.preis;

  // Allgemeiner Bestell-Link für Fälle, in denen die passende Leistung noch nicht feststeht.
  links.auftrag = bestellLink("/auftrag/");
  links.preise = u("/preise/");
  links.unterlagen = u("/unterlagen/");
  links.faq = u("/faq/");
  links.kontakt = u("/kontakt/");
  links.ablauf = u("/ablauf/");
  for (const name of ["auftrag", "preise", "unterlagen", "faq", "kontakt", "ablauf"]) {
    platzhalter[`LINK:${name}`] = links[name];
  }

  // Zeiten immer mit der Einschränkung, mit der die Website sie nennt („meist“, „in der Regel“).
  // Steckt sie im Platzhalter, kann aus einem Erfahrungswert keine feste Zusage werden.
  const zeiten = {
    bearbeitung: `meist ${ZEIT.zulassung}`,
    kennzeichen_versand: `in der Regel ${ZEIT.kennzeichen}`,
    bedingung: KENNZEICHEN_HINWEIS.bedingung,
    uebersicht: DAUER_UEBERSICHT,
  };
  platzhalter["ZEIT:bearbeitung"] = zeiten.bearbeitung;
  platzhalter["ZEIT:kennzeichen_versand"] = zeiten.kennzeichen_versand;
  platzhalter["ZEIT:bedingung"] = zeiten.bedingung;
  platzhalter["SERVICEZEITEN"] = site.contact.hours;
  platzhalter["TELEFON"] = site.contact.phoneDisplay;

  // Der Aktionshinweis steht gesondert unter „aktion“; hier nur der allgemeine Teil der Preis-Fußnote.
  const preisHinweis =
    aktionsHinweis && priceDisclaimer.startsWith(aktionsHinweis)
      ? priceDisclaimer.slice(aktionsHinweis.length).trim()
      : priceDisclaimer;

  const nichtZusagen = [
    ...new Set(offeneEntscheidungen().flatMap(({ pfad }) => NICHT_ZUSAGEN[pfad] ?? [stichwortAusPfad(pfad)])),
  ];

  const wissen = {
    // Stand der Inhalte, nicht des Builds: Der Admin-Bereich zeigt damit, von wann Preise und
    // Zeiten sind – und bei unverändertem Inhalt bleibt die Datei von Deploy zu Deploy gleich.
    stand: [PRICE_DATE, BETRIEB_STAND].sort().at(-1)!,
    firma: {
      name: site.name,
      // Firma mit Rechtsform (§ 35a GmbHG) – ohne den Satz „… ist ein Angebot der …“
      // (Sezer, 26.11.2026: im Mail-Fuß weglassen; der Firmenname selbst muss bleiben).
      rechtsform: site.company.legalName,
      anschrift: `${site.company.street}, ${site.company.zipCity}`,
      // Sitz der Gesellschaft: Pflichtangabe in Geschäftsbriefen (§ 35a GmbHG), steht im Mail-Fuß.
      sitz: `Sitz der Gesellschaft: ${site.company.seat}`,
      register: site.company.register,
      // Wortlaut wie im Impressum.
      vertretung: `Geschäftsführer: ${site.company.responsible}`,
      telefon: site.contact.phoneDisplay,
      email: site.contact.email,
      web: site.url,
      servicezeiten: site.contact.hours,
    },
    leistungen,
    zusatz,
    // „leistungen“ braucht der Prüfer: Ist die Aktion abgelaufen und die Website noch nicht
    // umgestellt, sperrt er genau diese Preise (BAUPLAN 7.5).
    aktion: AKTION
      ? { name: AKTION.name, gueltig_bis: AKTION.gueltigBis, text: aktionsHinweis, leistungen: [...AKTION.leistungen] }
      : null,
    preis_hinweis: preisHinweis,
    zeiten,
    nicht_zusagen: nichtZusagen,
    // im_prompt = false: Die Antwort steht schon oben in Preisen, Zeiten, Unterlagen oder „Über
    // uns“ – im Systemtext des Assistenten wäre sie doppelt (rund 1.600 Tokens je Aufruf). Für den
    // Prüfer bleibt der Text in der Wissensbasis. Fehlt eine Frage hier, steht sie im Prompt.
    faq: faqItems.map((f) => ({ frage: f.question, antwort: f.answer, im_prompt: !FAQ_NICHT_IM_PROMPT.has(glatt(f.question)) })),
    links,
    platzhalter,
  };

  // Der Header wirkt nur im Dev-Server; die fertige Datei liest ausschließlich PHP.
  return new Response(`${JSON.stringify(glatt(wissen), null, 2)}\n`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
