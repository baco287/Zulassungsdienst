import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";
import TrackedLink from "./TrackedLink";

/**
 * B2B-Kontaktblock: „Angebot anfordern“ per E-Mail, WhatsApp oder Telefon.
 * Phase 1 bewusst ohne Formular-Backend – echte Kanäle statt Fake-Submit.
 * Gleiche Form wie der Abschluss der übrigen Seiten (Tafel mit blauem Band).
 */
export default function GewerbeCTA({ context }: { context?: string }) {
  const subject = encodeURIComponent(
    `Angebotsanfrage Gewerbekunden${context ? ` – ${context}` : ""}`,
  );
  const body = encodeURIComponent(
    "Guten Tag,\n\nwir interessieren uns für Ihren Zulassungsservice für Gewerbekunden.\n\nUnternehmen:\nVorgänge pro Monat (ca.):\nSchwerpunkt (z. B. Neuzulassungen, Abmeldungen):\nRückruf erwünscht unter:\n\nMit freundlichen Grüßen",
  );

  return (
    <section className="py-14 sm:py-20" aria-labelledby="gewerbe-cta-title">
      <div className="container-page">
        <div className="tafel tafel-breit">
          <div className="grid gap-x-12 gap-y-7 px-5 py-7 sm:px-9 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-11 lg:py-12">
            <div>
              <h2 id="gewerbe-cta-title" className="h-abschnitt text-navy">
                Individuelles Angebot anfordern
              </h2>
              <p className="mt-3.5 max-w-[40em] text-lg leading-relaxed text-ink-600">
                Nennen Sie uns Ihr ungefähres Monatsvolumen und Ihre Vorgangsarten –
                Sie erhalten kurzfristig eine transparente Preisliste mit
                Gewerbekonditionen. Ohne Grundgebühr, ohne Vertragsbindung.
              </p>
              <p className="mt-3 text-[0.9375rem] text-ink-600">
                Oder direkt anrufen:{" "}
                <TrackedLink
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  event="phone_click"
                  props={{ position: "gewerbe_cta" }}
                  className="link"
                >
                  {site.contact.phoneDisplay}
                </TrackedLink>
                , {site.contact.hours}
              </p>
            </div>
            <div className="flex flex-col gap-3 lg:w-[22rem]">
              <TrackedLink
                href={`mailto:${site.contact.email}?subject=${subject}&body=${body}`}
                event="b2b_inquiry"
                props={{ method: "email", position: "gewerbe_cta" }}
                className="btn btn-primary btn-lg"
              >
                Angebot per E-Mail anfordern
              </TrackedLink>
              <TrackedLink
                event="b2b_inquiry"
                props={{ method: "whatsapp", position: "gewerbe_cta" }}
                href={whatsAppLink(
                  `Hallo KFZ-Zulassungsprofis, wir interessieren uns für Gewerbekonditionen${context ? ` (${context})` : ""}.`,
                )}
                external
                className="btn btn-secondary btn-lg"
              >
                <WhatsAppIcon className="h-5 w-5" color="brand" />
                Per WhatsApp anfragen
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
