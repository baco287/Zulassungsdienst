import { Mail, Phone } from "lucide-react";
import Reveal from "@/components/Reveal";
import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";
import TrackedLink from "./TrackedLink";

/**
 * B2B-Kontaktblock: „Angebot anfordern" per E-Mail, WhatsApp oder Telefon.
 * Phase 1 bewusst ohne Formular-Backend – echte Kanäle statt Fake-Submit.
 */
export default function GewerbeCTA({ context }: { context?: string }) {
  const subject = encodeURIComponent(
    `Angebotsanfrage Gewerbekunden${context ? ` – ${context}` : ""}`,
  );
  const body = encodeURIComponent(
    "Guten Tag,\n\nwir interessieren uns für Ihren Zulassungsservice für Gewerbekunden.\n\nUnternehmen:\nVorgänge pro Monat (ca.):\nSchwerpunkt (z. B. Neuzulassungen, Abmeldungen):\nRückruf erwünscht unter:\n\nMit freundlichen Grüßen",
  );

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <div className="rounded-3xl bg-ink-900 px-6 py-12 text-center sm:px-12">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
              Individuelles Angebot anfordern
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-ink-300">
              Nennen Sie uns Ihr ungefähres Monatsvolumen und Ihre Vorgangsarten –
              Sie erhalten kurzfristig eine transparente Preisliste mit
              Gewerbekonditionen. Ohne Grundgebühr, ohne Vertragsbindung.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <TrackedLink
                href={`mailto:${site.contact.email}?subject=${subject}&body=${body}`}
                event="b2b_inquiry"
                props={{ method: "email", position: "gewerbe_cta" }}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand-600 px-7 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-700 sm:w-auto"
              >
                <Mail className="h-5 w-5" aria-hidden />
                Angebot per E-Mail anfordern
              </TrackedLink>
              <TrackedLink
                event="b2b_inquiry"
                props={{ method: "whatsapp", position: "gewerbe_cta" }}
                href={whatsAppLink(
                  `Hallo DeutscheZulassung, wir interessieren uns für Gewerbekonditionen${context ? ` (${context})` : ""}.`,
                )}
                external
                className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-ink-600 px-7 py-3.5 font-display font-semibold text-white transition-colors duration-200 hover:border-brand-400 hover:bg-ink-800 sm:w-auto"
              >
                <WhatsAppIcon className="h-5 w-5" />
                Per WhatsApp anfragen
              </TrackedLink>
            </div>
            <p className="mt-6 flex items-center justify-center gap-2 text-sm text-ink-300">
              <Phone className="h-4 w-4" aria-hidden />
              Oder direkt anrufen:{" "}
              <TrackedLink
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                event="phone_click"
                props={{ position: "gewerbe_cta" }}
                className="font-semibold text-white underline underline-offset-2"
              >
                {site.contact.phoneDisplay}
              </TrackedLink>{" "}
              · {site.contact.hours}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
