import type { Metadata } from "next";
import { Clock4, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Kontakt – wir sind für Sie da",
  description:
    "Kontaktieren Sie EasyZulassung per WhatsApp, E-Mail oder Telefon. Wir beantworten Ihre Fragen zur Kfz-Zulassung schnell und persönlich.",
};

const channels = [
  {
    icon: MessageCircle,
    title: "WhatsApp",
    text: "Der schnellste Weg: Frage stellen, Fotos senden, Antwort erhalten.",
    href: whatsAppLink("Hallo EasyZulassung, ich habe eine Frage."),
    label: "Chat starten",
    external: true,
  },
  {
    icon: Mail,
    title: "E-Mail",
    text: site.contact.email,
    href: `mailto:${site.contact.email}`,
    label: "E-Mail schreiben",
    external: false,
  },
  {
    icon: Phone,
    title: "Telefon",
    text: site.contact.phoneDisplay,
    href: `tel:${site.contact.phone.replace(/\s/g, "")}`,
    label: "Anrufen",
    external: false,
  },
];

export default function KontaktPage() {
  return (
    <>
      <section className="bg-grid bg-ink-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">Kontakt</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Persönliche Beratung statt Warteschleife – wählen Sie Ihren Lieblingskanal.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          {channels.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-2xl border border-ink-200 bg-white p-7 shadow-card"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-white">
                <c.icon className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-ink-900">{c.title}</h2>
              <p className="mt-2 flex-1 text-sm text-ink-600">{c.text}</p>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="mt-5 rounded-xl bg-brand-700 px-5 py-3 text-center font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
              >
                {c.label}
              </a>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <Clock4 className="h-4 w-4 text-brand-700" aria-hidden />
            Erreichbarkeit: {site.contact.hours}
          </p>
          <p className="flex items-center gap-2 text-sm text-ink-600">
            <MapPin className="h-4 w-4 text-brand-700" aria-hidden />
            {site.company.street}, {site.company.zipCity}
          </p>
        </div>
      </section>
    </>
  );
}
