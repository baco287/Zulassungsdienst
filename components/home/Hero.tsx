import TrackedLink from "@/components/TrackedLink";
import TrackView from "@/components/TrackView";
import Haken from "@/components/ui/Haken";
import SchildAuswahl, { type SchildOption } from "@/components/home/SchildAuswahl";
import { dauerKurz } from "@/lib/betrieb";
import { getCatalogEntry } from "@/lib/catalog";
import { hero, vorgaenge } from "@/lib/homepage";
import { euro } from "@/lib/pricing";

/** Glatte Beträge ohne „,00“ anzeigen (z. B. „… €“ statt „…,00 €“) */
const kurz = (preisText: string) => preisText.replace(/,00(?=\s*€)/, "");

/** „a, b und c“ */
const aufzaehlung = (teile: string[]) =>
  teile.length < 2 ? teile.join("") : `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`;

const options: SchildOption[] = vorgaenge.flatMap((v) => {
  const e = getCatalogEntry(v.slug);
  if (!e) return [];
  const teile = [
    e.amtlicheGebuehren.enthalten ? "amtlicher Gebühren" : null,
    e.versand.enthalten ? "Versand" : null,
    "19 % MwSt.",
  ].filter((t): t is string => t !== null);
  return [
    {
      slug: v.slug,
      label: v.label,
      preis: kurz(e.preisText),
      enthalten: `Festpreis inklusive ${aufzaehlung(teile)}`,
      dauer: dauerKurz(v.slug),
      zusatz:
        e.kennzeichen.moeglich && e.kennzeichen.preis !== null
          ? `Kennzeichenschilder auf Wunsch zzgl. ${euro(e.kennzeichen.preis)} pro Paar.`
          : null,
      href: e.ctaHref,
    },
  ];
});

/**
 * Kopf der Startseite (Designsystem v6 „Das Schild“): links Überschrift, Einleitung,
 * Schaltflächen und drei Zusagen auf der grauen Fläche, rechts das große Kennzeichen
 * mit der Leistungsauswahl. Die vollständige Preistafel steht im Preisabschnitt.
 */
export default function Hero() {
  return (
    <section className="bg-canvas" aria-labelledby="hero-title">
      {/* Am Handy: Überschrift → Kennzeichen → Schaltflächen und Zusagen. Der linke
          Block ist dort „contents“; seine zwei Teile ordnen sich per order ins Raster.
          Ab 1100 px: links der Text als ein Block, rechts das Kennzeichen. */}
      <div className="container-page grid gap-y-7 pb-9 pt-7 sm:gap-y-9 sm:pb-12 sm:pt-10 min-[1100px]:grid-cols-[minmax(0,5.2fr)_minmax(0,6.8fr)] min-[1100px]:items-center min-[1100px]:gap-x-14 min-[1100px]:pb-[4.5rem] min-[1100px]:pt-16">
        <div className="contents min-[1100px]:block min-[1100px]:max-w-[40rem]">
          <div className="max-w-[40rem]">
            <h1 id="hero-title" className="h-kopf">
              {hero.title}
            </h1>
            <p className="mt-4 max-w-[31em] text-[1.09375rem] leading-normal text-ink-600 sm:mt-5 sm:text-[1.21875rem]">
              {hero.lead}
            </p>
          </div>

          <div className="order-3 max-w-[40rem] min-[1100px]:mt-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <TrackedLink
                href={hero.primary.href}
                event="cta_click"
                props={{ position: "hero" }}
                className="btn btn-primary whitespace-nowrap"
              >
                {hero.primary.label}
              </TrackedLink>
              <a href={hero.secondary.href} className="btn btn-secondary whitespace-nowrap">
                {hero.secondary.label}
              </a>
            </div>
            <ul className="mt-7 grid gap-2.5 text-[1rem] leading-snug sm:text-[1.03125rem]">
              {hero.vorteile.map((v) => (
                <li key={v.title} className="flex items-baseline gap-3">
                  <Haken className="h-[0.8125rem] w-[1.0625rem] translate-y-px" />
                  <span>
                    <strong className="font-semibold">{v.title}</strong>{" "}
                    {/* „E-Mail“ nicht am Bindestrich umbrechen */}
                    <span className="text-ink-600">– {v.text.replace("E-Mail", "E\u2011Mail")}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 max-w-[36em] text-[0.875rem] leading-normal text-ink-600">{hero.hinweis}</p>
          </div>
        </div>

        <TrackView
          event="price_box_view"
          props={{ position: "hero_schild" }}
          className="order-2 w-full max-w-[46rem] min-[1100px]:max-w-none"
        >
          <section id="leistungen" aria-label={hero.auswahl.title} className="scroll-mt-24">
            <SchildAuswahl options={options} title="Leistung wählen" alle={hero.auswahl.alle} />
          </section>
        </TrackView>
      </div>
    </section>
  );
}
