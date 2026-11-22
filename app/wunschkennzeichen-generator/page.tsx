import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import FaqAccordion from "@/components/FaqAccordion";
import KennzeichenAssistent from "@/components/kennzeichen/KennzeichenAssistent";
import KennzeichenSchild from "@/components/kennzeichen/KennzeichenSchild";
import Haken from "@/components/ui/Haken";
import SectionHeading from "@/components/ui/SectionHeading";
import { ORG_ID } from "@/lib/catalog";
import { faq, ideen, regelZeilen, reservierungsDauer, schritte, SEITE, zusagen } from "@/lib/kennzeichen/inhalte";
import { REGELN } from "@/lib/kennzeichen/regeln";
import { euro, officialFees, P } from "@/lib/pricing";
import { fitTitle } from "@/lib/seo";
import { site } from "@/lib/site";

/**
 * /wunschkennzeichen-generator/ – der KI-Kennzeichenassistent.
 *
 * Eine einzige Seite für alle Bezirke und Kombinationen: Der Assistent läuft im
 * Browser und erzeugt keine eigenen Adressen. Einstiege von anderen Seiten übergeben
 * Ort oder Kürzel im Fragment (#ort=…, #kuerzel=…), das Suchmaschinen nicht als
 * eigene Seite werten.
 *
 * Abgrenzung zu den Nachbarseiten (kein doppelter Suchintent):
 *   /leistungen/wunschkennzeichen/            der Service: wir reservieren und lassen zuteilen
 *   /ratgeber/wunschkennzeichen-reservieren/  der Ratgeber: Regeln, Kosten, Fristen im Detail
 *   diese Seite                               das Werkzeug: Ideen finden und ansehen
 */
export const metadata: Metadata = {
  title: fitTitle(SEITE.titel),
  description: SEITE.beschreibung,
  alternates: { canonical: SEITE.pfad },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${site.url}${SEITE.pfad}#app`,
      name: "KI-Kennzeichenassistent",
      alternateName: "Wunschkennzeichen-Generator",
      url: `${site.url}${SEITE.pfad}`,
      description: SEITE.beschreibung,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Web",
      inLanguage: "de",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@id": ORG_ID },
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    },
  ],
};

const standDatum = new Date(REGELN.stand).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

export default function WunschkennzeichenGeneratorPage() {
  return (
    <>
      <section className="bg-canvas" aria-labelledby="kza-titel">
        {/* Am Handy steht der Assistent direkt unter der Überschrift, die drei Zusagen folgen danach. */}
        <div className="container-page flex flex-col pb-10 pt-6 sm:pb-14 sm:pt-9">
          <Breadcrumbs items={[{ name: "Kennzeichen", href: "/kennzeichen/" }, { name: "Wunschkennzeichen-Generator" }]} />
          <div className="mt-5 max-w-[52rem]">
            <h1 id="kza-titel" className="h-seite text-navy">
              {SEITE.h1}
            </h1>
            <p className="mt-4 max-w-[38em] text-[1.125rem] leading-normal text-ink-600 sm:text-[1.21875rem]">{SEITE.lead}</p>
          </div>
          <ul className="order-last mt-7 grid max-w-[52rem] gap-2 text-[1rem] leading-snug sm:order-none sm:mt-5 sm:grid-cols-3 sm:gap-x-6">
            {zusagen.map((z) => (
              <li key={z.titel} className="flex items-baseline gap-2.5">
                <Haken className="h-[0.8125rem] w-[1.0625rem] translate-y-px" />
                <span>
                  <strong className="font-semibold">{z.titel}</strong> <span className="text-ink-600">– {z.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div id="assistent" className="mt-6 scroll-mt-24 sm:mt-9">
            <KennzeichenAssistent />
          </div>
          <noscript>
            <p className="mt-4 rounded-[var(--radius-card)] border border-line bg-white p-4 text-ink-700">
              Der Kennzeichenassistent braucht JavaScript. Die Regeln für Wunschkennzeichen und unseren Reservierungsservice
              findest du weiter unten auch ohne.
            </p>
          </noscript>
        </div>
      </section>

      <section className="py-12 lg:py-16" aria-labelledby="kza-ablauf">
        <div className="container-page">
          <SectionHeading id="kza-ablauf" title="So findest du dein Wunschkennzeichen">
            Kein Formular mit zwölf Feldern: Du sagst, was dir wichtig ist, und siehst sofort, wie es am Auto aussähe.
          </SectionHeading>
          <ol className="mt-8 max-w-[60rem]">
            {schritte.map((s, i) => (
              <li
                key={s.titel}
                className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 border-t border-line py-6 last:border-b sm:grid-cols-[4.5rem_minmax(0,16rem)_minmax(0,1fr)] sm:gap-x-8"
              >
                <p className="font-display text-[1.75rem] font-bold leading-none tabular-nums text-brand-600 sm:text-[2.25rem]" aria-hidden>
                  {i + 1}
                </p>
                <h3 className="text-[1.1875rem] font-semibold leading-snug text-navy">
                  <span className="sr-only">Schritt {i + 1}: </span>
                  {s.titel}
                </h3>
                <p className="col-start-2 mt-2 max-w-[42em] text-[0.96875rem] leading-relaxed text-ink-600 sm:col-start-3 sm:mt-0">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-canvas py-12 lg:py-16" aria-labelledby="kza-ideen">
        <div className="container-page">
          <SectionHeading id="kza-ideen" title="Ideen für persönliche und kreative Kennzeichen">
            Sechs Wege zur eigenen Kombination. Die Schilder sind Beispiele – ob eine Kombination in deinem Bezirk frei
            ist, zeigt erst die Prüfung bei der Behörde.
          </SectionHeading>
          <ul className="mt-8 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {ideen.map((idee) => (
              <li key={idee.titel}>
                <KennzeichenSchild {...idee.beispiel} dekorativ className="max-w-[22rem]" />
                <p className="mt-1.5 text-[0.8125rem] text-ink-600">Beispiel</p>
                <h3 className="mt-3 text-[1.1875rem] font-semibold leading-snug text-navy">{idee.titel}</h3>
                <p className="mt-2 max-w-[34em] text-[0.96875rem] leading-relaxed text-ink-600">{idee.text}</p>
              </li>
            ))}
          </ul>
          <p className="mt-9">
            <a href="#assistent" className="btn btn-primary">
              {SEITE.cta}
            </a>
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16" aria-labelledby="kza-regeln">
        <div className="container-page">
          <SectionHeading id="kza-regeln" title="Was auf dem Kennzeichen stehen darf">
            Der Assistent prüft jede Kombination, bevor du sie siehst – nach festen Regeln, nicht nach Gefühl. Was
            bundesweit gilt und was nur in einzelnen Ländern oder Behörden, steht jeweils dabei.
          </SectionHeading>
          <dl className="liste mt-8 max-w-[60rem]">
            {regelZeilen.map((r) => (
              <div key={r.titel} className="grid gap-x-8 gap-y-1.5 py-5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <dt className="text-[1.0625rem] font-semibold text-navy">{r.titel}</dt>
                <dd>
                  <p className="max-w-[44em] text-[0.96875rem] leading-relaxed text-ink-700">{r.text}</p>
                  <p className="mt-1.5 text-[0.875rem] text-ink-600">
                    {r.geltung} ·{" "}
                    <a href={r.quelle} target="_blank" rel="noopener noreferrer" className="underline">
                      Quelle
                    </a>
                  </p>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 max-w-[46em] text-[0.9375rem] leading-relaxed text-ink-600">
            Stand der Regeln: {standDatum}. Über jede Zuteilung entscheidet die Zulassungsbehörde; sie kann auch
            Kombinationen ablehnen, die hier nicht aufgeführt sind. Ausführlich erklärt im Ratgeber{" "}
            <Link href="/ratgeber/wunschkennzeichen-reservieren/" className="link">
              Wunschkennzeichen reservieren: Regeln, Kosten, Fristen
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-canvas py-12 lg:py-16" aria-labelledby="kza-verfuegbar">
        <div className="container-page">
          <SectionHeading id="kza-verfuegbar" title="Wunschkennzeichen online prüfen und reservieren">
            Ob eine Kombination frei ist, weiß nur deine Zulassungsbehörde. Deshalb unterscheidet der Assistent klar
            zwischen Idee, Prüfung und Reservierung.
          </SectionHeading>
          <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-2">
            <div>
              <h3 className="text-[1.1875rem] font-semibold text-navy">Die fünf Zustände eines Kennzeichens</h3>
              <dl className="liste mt-3 text-[0.96875rem] leading-relaxed">
                {[
                  ["Idee", "Vom Assistenten vorgeschlagen, noch nicht geprüft."],
                  ["Prüfung erforderlich", "Für diesen Bezirk ist keine Echtzeitprüfung angebunden. Du prüfst bei der Behörde – oder wir für dich."],
                  ["Verfügbar", "Von einer angebundenen Quelle als frei bestätigt, mit Zeitpunkt der Prüfung. Noch nicht reserviert."],
                  ["Nicht verfügbar", "Von einer angebundenen Quelle als vergeben oder gesperrt bestätigt."],
                  ["Reserviert", "Die Reservierung wurde vom zuständigen System bestätigt."],
                ].map(([name, text]) => (
                  <div key={name} className="grid gap-x-6 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                    <dt className="font-semibold text-navy">{name}</dt>
                    <dd className="text-ink-700">{text}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 max-w-[44em] text-[0.9375rem] leading-relaxed text-ink-600">
                Eine bundesweite Abfrage für alle Zulassungsbezirke gibt es nicht; jede Behörde betreibt ihr eigenes
                Reservierungsportal. Solange keine Quelle angebunden ist, zeigen wir „Prüfung erforderlich“ und den Link
                zur richtigen Behörde – „Verfügbar“ steht hier nie auf Verdacht.
              </p>
            </div>
            <div>
              <h3 className="text-[1.1875rem] font-semibold text-navy">Kosten und Fristen</h3>
              <p className="mt-3 max-w-[44em] text-[0.96875rem] leading-relaxed text-ink-700">
                Die amtliche Gebühr für Reservierung und Zuteilung beträgt bundesweit {euro(officialFees.customPlate[0])} (
                <a href={REGELN.reservierung.gebuehrQuelle} target="_blank" rel="noopener noreferrer" className="underline">
                  Gebührenordnung
                </a>
                ). Wie lange eine Reservierung gilt, legt jede Behörde selbst fest:
              </p>
              <table className="mt-3 w-full max-w-[30rem] text-left text-[0.96875rem]">
                <caption className="sr-only">Dauer der Wunschkennzeichen-Reservierung nach Behörde</caption>
                <thead>
                  <tr className="border-b border-line text-[0.875rem] text-ink-600">
                    <th scope="col" className="py-2 font-medium">
                      Behörde
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Reservierung gilt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservierungsDauer.map((d) => (
                    <tr key={d.behoerde} className="border-b border-line">
                      <th scope="row" className="py-2 pr-4 font-normal text-ink-700">
                        <a href={d.quelle} target="_blank" rel="noopener noreferrer" className="underline decoration-ink-300 underline-offset-4 hover:decoration-navy">
                          {d.behoerde}
                        </a>
                      </th>
                      <td className="py-2 font-semibold text-navy">{d.dauer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 max-w-[44em] text-[0.96875rem] leading-relaxed text-ink-700">
                Reserviert wird in der Regel auf den Namen des künftigen Halters – die Portale fragen dafür Name und
                Anschrift ab. Lässt du das Fahrzeug innerhalb der Frist nicht zu, verfällt die Reservierung.
              </p>
              <p className="mt-4 max-w-[44em] text-[0.96875rem] leading-relaxed text-ink-700">
                Du möchtest dich nicht selbst durch das Portal klicken? Mit dem{" "}
                <Link href="/leistungen/wunschkennzeichen/" className="link">
                  Wunschkennzeichen-Service
                </Link>{" "}
                ({P.wunschkennzeichen} zusätzlich zur Zulassung, amtliche Gebühr enthalten) prüfen, reservieren und
                lassen wir für dich zuteilen. Die Zulassung selbst kostet {P.zulassung} inklusive amtlicher Gebühren.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 lg:py-16" aria-labelledby="kza-faq">
        <div className="container-page">
          <SectionHeading id="kza-faq" title="Häufige Fragen zum Wunschkennzeichen-Generator" />
          <div className="mt-7 max-w-[60rem]">
            <FaqAccordion items={faq} />
          </div>
          <p className="mt-8 max-w-[52em] text-[0.96875rem] leading-relaxed text-ink-600">
            Mehr zum Thema:{" "}
            <Link href="/kennzeichen/" className="link">
              Kennzeichenkürzel von A bis Z
            </Link>
            ,{" "}
            <Link href="/zulassungsstelle/" className="link">
              Zulassungsstellen in Deutschland
            </Link>
            ,{" "}
            <Link href="/ratgeber/kennzeichen-mitnehmen/" className="link">
              Kennzeichen beim Umzug mitnehmen
            </Link>{" "}
            und{" "}
            <Link href="/preise/" className="link">
              alle Preise
            </Link>
            .
          </p>
        </div>
      </section>

      <CTASection
        title="Kennzeichen gefunden? Wir übernehmen die Zulassung."
        text="Anmelden, ummelden oder umschreiben ohne Behördentermin – dein Wunschkennzeichen nimmst du aus dem Assistenten direkt mit in den Auftrag."
        primaryLabel="Jetzt Zulassung starten"
        secondaryLabel="Frage per WhatsApp stellen"
        whatsAppText="Hallo KFZ-Zulassungsprofis, ich habe eine Frage zum Wunschkennzeichen."
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
