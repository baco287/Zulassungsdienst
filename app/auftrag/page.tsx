import type { Metadata } from "next";
import Haken from "@/components/ui/Haken";
import AuftragForm from "@/components/AuftragForm";
import TrackedLink from "@/components/TrackedLink";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { site, whatsAppLink } from "@/lib/site";
import { ZEIT } from "@/lib/betrieb";

export const metadata: Metadata = {
  title: "Online-Auftrag – Zulassung jetzt beauftragen",
  description:
    `Beauftragen Sie Ihre Kfz-Zulassung online: Leistung wählen, Daten eingeben, absenden – KFZ-Zulassungsprofis übernimmt den Rest. Unverbindliche Anfrage in ${ZEIT.anfrage}.`,
};

export default function AuftragPage() {
  return (
    <section className="bg-canvas pb-16 pt-7 sm:pb-20 sm:pt-11">
      <div className="container-page">
        <h1 className="h-seite text-navy">
          Online-Auftrag
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-700">
          {ZEIT.anfrage.replace("ca. ", "Ca. ")}, unverbindlich: Wir melden uns mit Ihrer Festpreis-Bestätigung
          und der Liste der nächsten Schritte.
        </p>
        {/* Der wichtigste Einwand zuerst: Es geht auch ohne Online-Ausweis. */}
        <p className="mt-4 flex max-w-[52rem] items-baseline gap-2.5 text-[0.96875rem] leading-relaxed text-ink-700">
          <Haken className="h-[0.75rem] w-[1rem] translate-y-px" />
          <span>
            <strong className="font-semibold text-navy">Keine eID? Kein Problem.</strong>{" "}
            Wir übernehmen Ihre Zulassung bundesweit – auch ohne Online-Ausweis und ohne AusweisApp.
            Für die Vollmacht bestätigen Sie Ihre Identität einmalig digital.
          </span>
        </p>

        <div className="mt-8">
          <AuftragForm>
            <div className="border-t-2 border-navy pt-4">
              <h2 className="text-base font-bold text-navy">Lieber direkt chatten?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                Senden Sie uns Ihre Anfrage formlos per WhatsApp – Fotos der Unterlagen genügen.
              </p>
              <TrackedLink
                href={whatsAppLink("Hallo KFZ-Zulassungsprofis, ich möchte eine Zulassung beauftragen.")}
                event="whatsapp_click"
                props={{ position: "auftrag_seitenleiste" }}
                external
                className="btn btn-wa btn-sm btn-block mt-4"
              >
                <WhatsAppIcon className="h-5 w-5" />
                WhatsApp öffnen
              </TrackedLink>
              <p className="mt-3 text-[0.9375rem] text-ink-700">
                Oder anrufen:{" "}
                <TrackedLink
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  event="phone_click"
                  props={{ position: "auftrag_seitenleiste" }}
                  className="link"
                >
                  {site.contact.phoneDisplay}
                </TrackedLink>
              </p>
            </div>
            <ul className="liste text-[15px] leading-relaxed text-ink-700">
              <li className="py-3">Antwort innerhalb unserer Servicezeiten ({site.contact.hours}).</li>
              <li className="py-3">
                Ihre Daten werden verschlüsselt übertragen und ausschließlich zur Auftragsabwicklung verwendet.
              </li>
            </ul>
          </AuftragForm>
        </div>
      </div>
    </section>
  );
}
