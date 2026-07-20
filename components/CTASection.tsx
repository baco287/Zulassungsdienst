import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { whatsAppLink } from "@/lib/site";
import Reveal from "./Reveal";

export default function CTASection() {
  return (
    <section className="bg-ink-950 py-16 sm:py-20">
      <Reveal className="mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">
          Bereit? Wir übernehmen den Behördenkram.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink-300">
          Auftrag online starten oder einfach kurz per WhatsApp schreiben –
          wir melden uns innerhalb der Geschäftszeiten meist in wenigen Minuten.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/auftrag"
            className="rounded-xl bg-brand-600 px-8 py-4 font-display text-base font-semibold text-white shadow-lg transition-colors duration-200 hover:bg-brand-500"
          >
            Auftrag starten
          </Link>
          <a
            href={whatsAppLink("Hallo EasyZulassung, ich möchte eine Kfz-Zulassung beauftragen.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-ink-700 px-8 py-4 font-display text-base font-semibold text-white transition-colors duration-200 hover:border-brand-500 hover:bg-ink-900"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Per WhatsApp
          </a>
        </div>
      </Reveal>
    </section>
  );
}
