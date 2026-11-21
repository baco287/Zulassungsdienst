import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";
import TrackedLink from "./TrackedLink";

interface Props {
  title?: string;
  text?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  /** Vorbelegter Text der WhatsApp-Nachricht. */
  whatsAppText?: string;
}

/**
 * Abschluss am Seitenende – auf der Startseite und allen Unterseiten derselbe
 * Baustein, nur der Text lässt sich anpassen. Steht in der Tafel (Umriss und
 * blaues Band wie im Logo), weil hier der Auftrag beginnt.
 */
export default function CTASection({
  title = "Bereit für Ihre Zulassung? Wir übernehmen den Rest.",
  text = "Starten Sie den Auftrag online oder stellen Sie uns Ihre Frage direkt per WhatsApp – wir melden uns innerhalb unserer Servicezeiten.",
  primaryLabel = "Jetzt Auftrag starten",
  primaryHref = "/auftrag/",
  secondaryLabel = "Frage per WhatsApp stellen",
  whatsAppText = "Hallo KFZ-Zulassungsprofis, ich habe eine Frage zur Kfz-Zulassung.",
}: Props) {
  return (
    <section className="bg-white pb-14 pt-4 sm:pb-20 lg:pb-24" aria-labelledby="cta-title">
      <div className="container-page">
        <div className="tafel tafel-breit">
          <div className="grid gap-x-12 gap-y-7 px-5 py-7 sm:px-9 sm:py-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-11 lg:py-12">
            <div>
              <h2 id="cta-title" className="h-abschnitt max-w-[22em] text-navy">
                {title}
              </h2>
              <p className="mt-3.5 max-w-[40em] text-lg leading-relaxed text-ink-600">{text}</p>
              <p className="mt-3 text-[0.9375rem] text-ink-600">Servicezeiten: {site.contact.hours}</p>
            </div>
            <div className="flex flex-col gap-3 lg:w-[22rem]">
              <TrackedLink
                href={primaryHref}
                event="cta_click"
                props={{ position: "cta_abschnitt" }}
                className="btn btn-primary btn-lg"
              >
                {primaryLabel}
              </TrackedLink>
              <TrackedLink
                href={whatsAppLink(whatsAppText)}
                event="whatsapp_click"
                props={{ position: "cta_abschnitt" }}
                external
                className="btn btn-secondary btn-lg"
              >
                <WhatsAppIcon className="h-5 w-5" color="brand" />
                {secondaryLabel}
              </TrackedLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
