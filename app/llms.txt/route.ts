import { sortedServices } from "@/lib/services";
import { cities } from "@/lib/staedte";
import { guides } from "@/lib/ratgeber";
import { gewerbeSegments } from "@/lib/gewerbe";
import { landingPages } from "@/lib/landingpages";
import { publishedStellen } from "@/lib/zulassungsstellen";
import { P } from "@/lib/pricing";
import { site } from "@/lib/site";
import { ZEIT } from "@/lib/betrieb";
import { cityIndexable, stelleIndexable } from "@/lib/indexGate";

/**
 * /llms.txt – Kurzbeschreibung der Website für KI-Assistenten und
 * KI-Suchmaschinen. Wird beim Build aus denselben Daten erzeugt wie die
 * Seiten selbst, damit Preise und Seitenliste nie veralten.
 */
export const dynamic = "force-static";

const u = (path: string) => `${site.url}${path}`;

function priceLine(slug: string): string {
  const s = sortedServices.find((x) => x.slug === slug);
  if (!s || s.price.serviceFee === null) return "Preis auf Anfrage";
  if (slug === "wunschkennzeichen") {
    return `${P.wunschkennzeichen} zusätzlich zu einer Zulassung – Verfügbarkeitsprüfung, Reservierung und Zuteilung, amtliche Gebühr enthalten; Kennzeichenschilder auf Wunsch zzgl. ${P.kennzeichen}`;
  }
  return s.price.platesExtra
    ? `${s.price.serviceFee.toFixed(2).replace(".", ",")} € inkl. amtlicher Gebühren und Versand, Kennzeichenschilder auf Wunsch zzgl. ${P.kennzeichen}`
    : `${s.price.serviceFee.toFixed(2).replace(".", ",")} € komplett inkl. amtlicher Gebühren`;
}

export function GET() {
  const lines: string[] = [];
  lines.push(`# ${site.name}`, "");
  lines.push(
    `> ${site.name} (deutschezulassung.de) ist ein privater, digitaler Kfz-Zulassungsdienst für ganz Deutschland – keine Behörde. Wir übernehmen Neuzulassung, Ummeldung, Umschreibung, Wiederzulassung, Abmeldung und Kennzeichen-Services im Auftrag unserer Kundinnen und Kunden, ohne dass sie einen Behördentermin oder einen Personalausweis mit Online-Funktion (eID) brauchen. ${P.zulassung} je Zulassungsvorgang inkl. amtlicher Gebühren und versichertem Versand, Kennzeichenschilder auf Wunsch zzgl. ${P.kennzeichen} pro Paar, Abmeldung ${P.abmeldung}.`,
    ""
  );
  lines.push(
    `Kundinnen und Kunden beauftragen über das Online-Formular (Unterlagen als Foto hochladen) oder per WhatsApp, erhalten vorab eine verbindliche Festpreis-Bestätigung, erteilen eine Vollmacht und erhalten Papiere per versichertem Versand. Typische Dauer: ${ZEIT.zulassung} ab vollständigen Unterlagen, Abmeldungen meist ${ZEIT.abmeldung}. Neue Kennzeichenschilder kommen per Post, in der Regel in ${ZEIT.kennzeichenDativ}. Die Entscheidung über jede Zulassung trifft immer die zuständige Zulassungsbehörde.`,
    ""
  );

  lines.push("## Leistungen und Preise", "");
  for (const s of sortedServices.filter((x) => x.category !== "service")) {
    lines.push(`- [${s.name}](${u(`/leistungen/${s.slug}/`)}): ${s.teaser} ${priceLine(s.slug)}`);
  }
  lines.push(`- [Preisübersicht](${u("/preise/")}): alle Preise, amtliche Gebühren und Zusatzleistungen`, "");

  lines.push("## Häufige Anliegen", "");
  for (const lp of landingPages) {
    lines.push(`- [${lp.navTitle}](${u(`/${lp.slug}/`)}): ${lp.description}`);
  }
  lines.push("");

  lines.push("## Zulassungsstellen", "");
  lines.push(`- [Übersicht der Zulassungsstellen](${u("/zulassungsstelle/")}): Anschrift, Zuständigkeit, Kennzeichen und i-Kfz-Hinweise mit Quellenangabe`);
  for (const z of publishedStellen.filter(stelleIndexable)) {
    lines.push(`- [Zulassungsstelle ${z.stadt}](${u(`/zulassungsstelle/${z.slug}/`)})`);
  }
  lines.push("");

  lines.push("## Kfz-Zulassung nach Stadt", "");
  lines.push(`- [Übersicht aller Städte](${u("/kfz-zulassung/")})`);
  lines.push(cities.filter(cityIndexable).map((c) => `[${c.name}](${u(`/kfz-zulassung/${c.slug}/`)})`).join(" · "), "");

  lines.push("## Gewerbekunden", "");
  lines.push(`- [Zulassungsservice für Gewerbekunden](${u("/gewerbe/")}): Sammelabwicklung, feste Ansprechpartner, Staffelpreise`);
  for (const g of gewerbeSegments) lines.push(`- [${g.name}](${u(`/gewerbe/${g.slug}/`)})`);
  lines.push("");

  lines.push("## Ratgeber", "");
  for (const g of guides) lines.push(`- [${g.title}](${u(`/ratgeber/${g.slug}/`)}): ${g.description}`);
  lines.push("");

  lines.push("## Tools, Vorlagen und Kontakt", "");
  lines.push(
    `- [Kfz-Steuer-Rechner](${u("/rechner/kfz-steuer/")})`,
    `- [Behördengang-Rechner](${u("/rechner/behoerdengang/")})`,
    `- [Vollmacht Kfz-Zulassung](${u("/vorlagen/vollmacht-zulassung/")})`,
    `- [Unterlagen-Checkliste](${u("/vorlagen/checkliste-zulassung/")})`,
    `- [Zulassung per WhatsApp](${u("/zulassung-per-whatsapp/")})`,
    `- [Online-Auftrag](${u("/auftrag/")})`,
    `- [Über uns und wer Ihre Zulassung bearbeitet](${u("/ueber-uns/")})`,
    `- [Datensicherheit](${u("/datensicherheit/")})`,
    `- [FAQ](${u("/faq/")})`,
    `- [Kontakt](${u("/kontakt/")}): ${site.contact.email}, ${site.contact.phoneDisplay}, ${site.contact.hours}`,
    ""
  );

  // Der Header wirkt nur im Dev-Server; live setzt public/.htaccess den Zeichensatz.
  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
