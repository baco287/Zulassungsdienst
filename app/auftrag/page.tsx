import type { Metadata } from "next";
import { Clock4, MessageCircle, ShieldCheck } from "lucide-react";
import AuftragForm from "@/components/AuftragForm";
import { site, whatsAppLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Online-Auftrag – Zulassung jetzt beauftragen",
  description:
    "Beauftragen Sie Ihre Kfz-Zulassung online: Leistung wählen, Daten eingeben, absenden – EasyZulassung übernimmt den Rest. Unverbindliche Anfrage in 2 Minuten.",
};

export default function AuftragPage() {
  return (
    <section className="bg-ink-50 py-14 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Online-Auftrag
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Zwei Minuten, unverbindlich: Wir melden uns mit einem verbindlichen Angebot
            und der Liste der nächsten Schritte.
          </p>
          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
            <AuftragForm />
          </div>
        </div>

        <aside className="space-y-5 lg:pt-24">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <MessageCircle className="h-5 w-5 text-brand-700" aria-hidden />
              Lieber direkt chatten?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Senden Sie uns Ihre Anfrage formlos per WhatsApp – Fotos der Unterlagen genügen.
            </p>
            <a
              href={whatsAppLink("Hallo EasyZulassung, ich möchte eine Zulassung beauftragen.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
            >
              WhatsApp öffnen
            </a>
          </div>
          <div className="rounded-2xl border border-ink-200 bg-white p-6 text-sm text-ink-600 shadow-card">
            <p className="flex items-start gap-2">
              <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              Antwort {site.contact.hours} meist innerhalb weniger Minuten.
            </p>
            <p className="mt-3 flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              Ihre Daten werden verschlüsselt übertragen und ausschließlich zur
              Auftragsabwicklung verwendet.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
