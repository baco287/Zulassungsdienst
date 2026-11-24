import Link from "next/link";
import TrackedLink from "@/components/TrackedLink";
import TrackView from "@/components/TrackView";
import { dauerKurz } from "@/lib/betrieb";
import { getCatalogEntry } from "@/lib/catalog";
import { vorgaenge } from "@/lib/vorgaenge";
import Streichpreis from "@/components/ui/Streichpreis";

/**
 * Die Preistafel: alle Hauptleistungen mit Kurztext, Bearbeitungszeit, Festpreis
 * und dem direkten Einstieg in den Auftrag. Steht im Preisabschnitt der Startseite
 * unter einer h2 – die Leistungsnamen sind deshalb h3.
 *
 * Der Name führt zur Leistungsseite, die Schaltfläche in den Auftrag mit
 * vorausgewählter Leistung. Preise kommen aus config/preise.json, Zeiten aus
 * config/betrieb.json (über lib/catalog.ts und lib/betrieb.ts).
 */
/** „10–30“ nicht am Strich umbrechen (Wortverbinder nach dem Halbgeviertstrich). */
const zusammen = (t: string) => t.replace(/(\d)–(\d)/g, "$1–\u2060$2");

export default function Preistafel({
  title,
  cta = "Jetzt starten",
  position = "preistafel",
  id,
  className = "",
}: {
  /** Überschrift für Screenreader – sichtbar ist die Tafel selbst. */
  title: string;
  cta?: string;
  /** Kennung für die Analyse (cta_click, price_box_view). */
  position?: string;
  id?: string;
  className?: string;
}) {
  return (
    <TrackView event="price_box_view" props={{ position }} className={className}>
      <section id={id} className="tafel tafel-breit scroll-mt-24" aria-label={title}>
        <div className="pt-kopf" aria-hidden>
          <span>Leistung</span>
          <span>Das erledigen wir für Sie</span>
          <span className="pt-k-dauer">Bearbeitung</span>
          <span className="pt-k-preis">Festpreis</span>
          <span />
        </div>
        <ul>
          {vorgaenge.map((v) => {
            const e = getCatalogEntry(v.slug);
            if (!e) return null;
            const dauer = dauerKurz(v.slug);
            return (
              <li key={v.slug} className="pt-zeile">
                <h3 className="pt-name">
                  <Link href={e.detailHref}>{v.label}</Link>
                </h3>
                <p className="pt-text">{zusammen(v.description)}</p>
                <p className="pt-dauer">
                  <span className="pt-dauer-label">Bearbeitung: </span>
                  {dauer ? zusammen(dauer) : "nach Rücksprache"}
                </p>
                <p className="pt-preis">
                  <span className="sr-only">Festpreis: </span>
                  <Streichpreis betrag={e.streichpreisText} />
                  {e.preisText}
                </p>
                <TrackedLink
                  href={e.ctaHref}
                  event="cta_click"
                  props={{ position, service: v.slug }}
                  className="btn btn-secondary btn-sm pt-start"
                  aria-label={`${cta}: ${v.label}`}
                >
                  {cta}
                </TrackedLink>
              </li>
            );
          })}
        </ul>
      </section>
    </TrackView>
  );
}
