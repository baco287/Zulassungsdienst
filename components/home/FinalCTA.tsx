import { ArrowRight } from "lucide-react";
import TrackedLink from "@/components/TrackedLink";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { abschluss } from "@/lib/homepage";
import { site, whatsAppLink } from "@/lib/site";

/** Kontakt und Abschluss-CTA. */
export default function FinalCTA() {
  return (
    <section id="kontakt" className="bg-navy py-16 text-white sm:py-24" aria-labelledby="cta-title">
      <div className="mx-auto max-w-[1240px] px-4 text-center sm:px-6">
        <h2 id="cta-title" className="font-display text-3xl font-bold sm:text-[2.6rem] sm:leading-tight">
          {abschluss.title}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/75">{abschluss.text}</p>
        <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <TrackedLink
            href={abschluss.primary.href}
            event="cta_click"
            props={{ position: "cta_abschnitt" }}
            className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] bg-gold px-8 font-display text-lg font-semibold text-navy transition-colors duration-150 hover:bg-gold-600"
          >
            {abschluss.primary.label}
            <ArrowRight className="h-5 w-5" aria-hidden />
          </TrackedLink>
          <TrackedLink
            href={whatsAppLink("Hallo DeutscheZulassung, ich habe eine Frage zur Kfz-Zulassung.")}
            event="whatsapp_click"
            props={{ position: "cta_abschnitt" }}
            external
            className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] border-2 border-white/25 px-8 font-display text-lg font-semibold text-white transition-colors duration-150 hover:border-wa hover:bg-white/5"
          >
            <WhatsAppIcon className="h-5 w-5" color="brand" />
            {abschluss.secondary.label}
          </TrackedLink>
        </div>
        <p className="mt-6 text-sm text-white/60">{site.contact.hours.replace("Mo–Fr ", "Mo–Fr, ")}</p>
      </div>
    </section>
  );
}
