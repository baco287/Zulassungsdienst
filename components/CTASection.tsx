import { whatsAppLink } from "@/lib/site";
import Reveal from "./Reveal";
import WhatsAppIcon from "./WhatsAppIcon";
import TrackedLink from "./TrackedLink";

export default function CTASection() {
  return (
    <section className="bg-ink-950 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Bereit? Wir übernehmen den Behördenkram.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
          Auftrag online starten oder einfach kurz per WhatsApp schreiben –
          wir melden uns innerhalb unserer Servicezeiten.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <TrackedLink
            href="/auftrag/"
            event="cta_click"
            props={{ position: "cta_abschnitt" }}
            className="rounded-xl bg-brand-600 px-8 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-500"
          >
            Jetzt Fahrzeug zulassen
          </TrackedLink>
          <TrackedLink
            href={whatsAppLink("Hallo DeutscheZulassung, ich möchte eine Kfz-Zulassung beauftragen.")}
            event="whatsapp_click"
            props={{ position: "cta_abschnitt" }}
            external
            className="flex items-center justify-center gap-2 rounded-xl border border-ink-700 px-8 py-4 font-display text-base font-semibold text-white transition-colors duration-200 hover:border-brand-500 hover:bg-ink-900"
          >
            <WhatsAppIcon className="h-5 w-5" />
            Per WhatsApp
          </TrackedLink>
        </div>
      </Reveal>
    </section>
  );
}
