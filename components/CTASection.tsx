import { ArrowRight } from "lucide-react";
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
 * Abschluss-CTA am Seitenende – auf der Startseite und allen Unterseiten
 * derselbe Baustein, nur der Text lässt sich anpassen.
 */
export default function CTASection({
  title = "Bereit für Ihre Zulassung? Wir übernehmen den Rest.",
  text = "Starten Sie den Auftrag online oder stellen Sie uns Ihre Frage direkt per WhatsApp – wir melden uns innerhalb unserer Servicezeiten.",
  primaryLabel = "Jetzt Auftrag starten",
  primaryHref = "/auftrag/",
  secondaryLabel = "Frage per WhatsApp stellen",
  whatsAppText = "Hallo DeutscheZulassung, ich habe eine Frage zur Kfz-Zulassung.",
}: Props) {
  return (
    <section className="bg-white px-4 pb-16 pt-4 sm:px-6 sm:pb-24" aria-labelledby="cta-title">
      <div className="bg-navy-pattern mx-auto max-w-[77rem] rounded-[24px] px-6 py-12 text-center text-white sm:px-12 sm:py-16">
        <h2
          id="cta-title"
          className="mx-auto max-w-3xl font-display text-[1.75rem] font-extrabold leading-tight sm:text-4xl"
        >
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{text}</p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <TrackedLink
            href={primaryHref}
            event="cta_click"
            props={{ position: "cta_abschnitt" }}
            className="btn btn-primary btn-lg"
          >
            {primaryLabel}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </TrackedLink>
          <TrackedLink
            href={whatsAppLink(whatsAppText)}
            event="whatsapp_click"
            props={{ position: "cta_abschnitt" }}
            external
            className="btn btn-on-dark btn-lg"
          >
            <WhatsAppIcon className="h-5 w-5" color="brand" />
            {secondaryLabel}
          </TrackedLink>
        </div>
        <p className="mt-6 text-sm text-white/65">Servicezeiten: {site.contact.hours}</p>
      </div>
    </section>
  );
}
