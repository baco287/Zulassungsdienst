import type { Metadata } from "next";
import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "Kontakt – wir sind für Sie da",
  description:
    "Kontaktieren Sie KFZ-Zulassungsprofis per WhatsApp, E-Mail oder Telefon. Wir beantworten Ihre Fragen zur Kfz-Zulassung schnell und persönlich.",
};

const channels = [
  {
    title: "WhatsApp",
    text: "Der einfache Weg: Frage stellen, Fotos senden, Antwort erhalten.",
    href: whatsAppLink("Hallo KFZ-Zulassungsprofis, ich habe eine Frage."),
    label: "Chat starten",
    external: true,
  },
  {
    title: "E-Mail",
    text: site.contact.email,
    href: `mailto:${site.contact.email}`,
    label: "E-Mail schreiben",
    external: false,
  },
  {
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
      <section className="seitenkopf">
        <div className="container-page">
          <div className="mb-5">
            <Breadcrumbs items={[{ name: "Kontakt" }]} />
          </div>
          <h1 className="h-seite text-navy">Kontakt</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Persönliche Beratung statt Warteschleife – wählen Sie Ihren Lieblingskanal.
          </p>
        </div>
      </section>

      <section className="py-10 lg:py-14">
        <div className="container-page">
          <ul className="liste max-w-[60rem]">
            {channels.map((c) => (
              <li
                key={c.title}
                className="grid gap-x-8 gap-y-3 py-5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] sm:items-center"
              >
                <h2 className="text-[1.3125rem] font-semibold text-navy">{c.title}</h2>
                <p className="text-[1.03125rem] text-ink-700">{c.text}</p>
                <a
                  href={c.href}
                  {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="btn btn-secondary btn-sm justify-self-start sm:min-w-[11rem]"
                >
                  {c.title === "WhatsApp" && <WhatsAppIcon className="h-[18px] w-[18px]" color="brand" />}
                  {c.label}
                </a>
              </li>
            ))}
          </ul>

          <dl className="mt-8 grid max-w-[60rem] gap-x-8 gap-y-3 text-[0.96875rem] sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-navy">Erreichbarkeit</dt>
              <dd className="text-ink-600">{site.contact.hours}</dd>
            </div>
            <div>
              <dt className="font-semibold text-navy">Anschrift</dt>
              <dd className="text-ink-600">
                {site.company.street}, {site.company.zipCity}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
