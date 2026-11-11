import Link from "next/link";
import Image from "next/image";
import { Clock3, Mail, Phone } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { sortedServices } from "@/lib/services";
import { cities } from "@/lib/staedte";
import { cityIndexable, PRIORITAETSSTAEDTE } from "@/lib/indexGate";
import { SERVICEBEDINGUNGEN_FREIGEGEBEN } from "@/lib/features";
import WhatsAppIcon from "./WhatsAppIcon";
import TrackedLink from "./TrackedLink";

type FooterLink = { href: string; label: string };

const service: FooterLink[] = [
  { href: "/preise", label: "Preise" },
  { href: "/ablauf", label: "So funktioniert’s" },
  { href: "/kfz-zulassung-ohne-eid", label: "Zulassung ohne eID" },
  { href: "/zulassung-per-whatsapp", label: "Zulassung per WhatsApp" },
  { href: "/unterlagen", label: "Unterlagen hochladen" },
  { href: "/datensicherheit", label: "Datensicherheit" },
  { href: "/gewerbe", label: "Für Gewerbe" },
];

/* Wissensbereich bewusst vollständig: Ratgeber, Städte und Zulassungsstellen tragen den Großteil der Suchmaschinen-Besucher. */
const wissen: FooterLink[] = [
  { href: "/ratgeber", label: "Ratgeber" },
  { href: "/anleitung", label: "Anleitung mit Bildern" },
  { href: "/faq", label: "Häufige Fragen" },
  { href: "/zulassungsstelle", label: "Zulassungsstellen" },
  { href: "/kennzeichen", label: "Kennzeichenkürzel" },
  { href: "/rechner", label: "Rechner & Tools" },
  { href: "/vorlagen", label: "Vorlagen & Downloads" },
];

const unternehmen: FooterLink[] = [
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

/** Standorte: nur Stadtseiten, die laut Index-Gate belegte Behördendaten haben. */
const standorte: FooterLink[] = PRIORITAETSSTAEDTE.map((slug) => cities.find((c) => c.slug === slug))
  .filter((c): c is NonNullable<typeof c> => Boolean(c) && cityIndexable(c!))
  .slice(0, 7)
  .map((c) => ({ href: `/kfz-zulassung/${c.slug}/`, label: c.name }));

function Col({ title, links, more }: { title: string; links: FooterLink[]; more?: FooterLink }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display text-sm font-bold uppercase tracking-wider text-white">{title}</h2>
      <ul className="mt-4 space-y-1 text-[15px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-9 items-center transition-colors duration-150 hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
        {more && (
          <li>
            <Link
              href={more.href}
              className="inline-flex min-h-9 items-center font-semibold text-accent-300 transition-colors duration-150 hover:text-white"
            >
              {more.label}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

export default function Footer() {
  const leistungen = sortedServices
    .filter((s) => s.category === "zulassung")
    .slice(0, 6)
    .map((s) => ({ href: `/leistungen/${s.slug}/`, label: s.shortName ?? s.name }));

  return (
    <footer className="bg-navy text-white/75">
      <div className="container-page grid gap-x-8 gap-y-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr_1fr] lg:py-16">
        {/* Marke und Kontakt */}
        <div className="sm:col-span-2 lg:col-span-1">
          <Image
            src="/logo-hell.png"
            alt={`${site.name} – Kfz-Zulassung online`}
            width={600}
            height={148}
            className="h-12 w-auto"
          />
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed">
            Kfz-Zulassung ohne eID-PIN und ohne Behördentermin – bundesweit, persönlich geprüft.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/90">
            Privater Zulassungsdienst, keine Behörde.
          </p>

          <ul className="mt-6 space-y-1 text-[15px]">
            <li>
              <TrackedLink
                href={whatsAppLink()}
                event="whatsapp_click"
                props={{ position: "footer" }}
                external
                className="inline-flex min-h-10 items-center gap-2.5 transition-colors duration-150 hover:text-white"
              >
                <WhatsAppIcon className="h-[18px] w-[18px]" color="brand" />
                WhatsApp-Chat
              </TrackedLink>
            </li>
            <li>
              <TrackedLink
                href={`mailto:${site.contact.email}`}
                event="email_click"
                props={{ position: "footer" }}
                className="inline-flex min-h-10 items-center gap-2.5 transition-colors duration-150 hover:text-white"
              >
                <Mail className="h-[18px] w-[18px] text-accent-300" aria-hidden />
                {site.contact.email}
              </TrackedLink>
            </li>
            <li>
              <TrackedLink
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                event="phone_click"
                props={{ position: "footer" }}
                className="inline-flex min-h-10 items-center gap-2.5 transition-colors duration-150 hover:text-white"
              >
                <Phone className="h-[18px] w-[18px] text-accent-300" aria-hidden />
                {site.contact.phoneDisplay}
              </TrackedLink>
            </li>
            <li className="flex min-h-10 items-center gap-2.5 text-sm text-white/65">
              <Clock3 className="h-[18px] w-[18px]" aria-hidden />
              {site.contact.hours}
            </li>
          </ul>
        </div>

        <Col title="Leistungen" links={leistungen} more={{ href: "/leistungen", label: "Alle Leistungen" }} />
        <Col title="Service" links={service} />
        <Col title="Ratgeber & Wissen" links={wissen} />
        <div className="space-y-10">
          <Col title="Standorte" links={standorte} more={{ href: "/kfz-zulassung", label: "Alle Standorte" }} />
          <Col title="Unternehmen" links={unternehmen} />
        </div>
      </div>

      {/* Betreiber und Rechtliches */}
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-7 text-sm text-white/65 lg:flex-row lg:items-center lg:justify-between">
          <p className="leading-relaxed">
            © {new Date().getFullYear()} {site.name} · Ein Angebot der {site.company.legalName},{" "}
            {site.company.street}, {site.company.zipCity} · {site.company.register}
          </p>
          <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-5 gap-y-1">
            {[
              { href: "/impressum", label: "Impressum" },
              { href: "/datenschutz", label: "Datenschutz" },
              { href: "/widerruf", label: "Widerruf" },
              ...(SERVICEBEDINGUNGEN_FREIGEGEBEN
                ? [{ href: "/servicebedingungen", label: "Servicebedingungen" }]
                : []),
            ].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex min-h-9 items-center text-white/85 transition-colors duration-150 hover:text-white"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
