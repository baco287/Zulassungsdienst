import type { Metadata } from "next";
import { Clock3, IdCard, ShieldCheck } from "lucide-react";
import AuftragForm from "@/components/AuftragForm";
import TrackedLink from "@/components/TrackedLink";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { site, whatsAppLink } from "@/lib/site";
import { ZEIT } from "@/lib/betrieb";

export const metadata: Metadata = {
  title: "Online-Auftrag – Zulassung jetzt beauftragen",
  description:
    `Beauftragen Sie Ihre Kfz-Zulassung online: Leistung wählen, Daten eingeben, absenden – DeutscheZulassung übernimmt den Rest. Unverbindliche Anfrage in ${ZEIT.anfrage}.`,
};

export default function AuftragPage() {
  return (
    <section className="bg-canvas pb-16 pt-8 sm:pb-20 sm:pt-12">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6">
        {/* Der wichtigste Einwand zuerst: Es geht auch ohne Online-Ausweis. */}
        <div className="flex items-start gap-4 rounded-[18px] bg-accent-100 p-4 sm:items-center sm:p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-white text-accent-600" aria-hidden>
            <IdCard className="h-6 w-6" strokeWidth={1.75} />
          </span>
          <p className="text-[15px] leading-relaxed text-ink-800">
            <strong className="block font-display text-lg font-extrabold text-navy">Keine eID? Kein Problem.</strong>
            Wir übernehmen Ihre Zulassung bundesweit – auch ohne Online-Ausweis und ohne AusweisApp.
            Für die Vollmacht bestätigen Sie Ihre Identität einmalig digital.
          </p>
        </div>

        <h1 className="mt-8 font-display text-[2rem] font-extrabold leading-tight text-navy sm:text-[2.5rem]">
          Online-Auftrag
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-700">
          {ZEIT.anfrage.replace("ca. ", "Ca. ")}, unverbindlich: Wir melden uns mit Ihrer Festpreis-Bestätigung
          und der Liste der nächsten Schritte.
        </p>

        <div className="mt-8">
          <AuftragForm>
            <div className="card p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy">
                <WhatsAppIcon className="h-5 w-5" color="brand" />
                Lieber direkt chatten?
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
                Senden Sie uns Ihre Anfrage formlos per WhatsApp – Fotos der Unterlagen genügen.
              </p>
              <TrackedLink
                href={whatsAppLink("Hallo DeutscheZulassung, ich möchte eine Zulassung beauftragen.")}
                event="whatsapp_click"
                props={{ position: "auftrag_seitenleiste" }}
                external
                className="btn btn-wa btn-sm btn-block mt-4"
              >
                WhatsApp öffnen
              </TrackedLink>
            </div>
            <ul className="card space-y-3 p-5 text-[15px] leading-relaxed text-ink-700">
              <li className="flex items-start gap-2.5">
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden />
                Antwort innerhalb unserer Servicezeiten ({site.contact.hours}).
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent-600" aria-hidden />
                Ihre Daten werden verschlüsselt übertragen und ausschließlich zur Auftragsabwicklung verwendet.
              </li>
            </ul>
          </AuftragForm>
        </div>
      </div>
    </section>
  );
}
