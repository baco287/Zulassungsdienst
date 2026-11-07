import Link from "next/link";
import Image from "next/image";
import { Mail, Phone } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { sortedServices } from "@/lib/services";
import WhatsAppIcon from "./WhatsAppIcon";
import { SERVICEBEDINGUNGEN_FREIGEGEBEN } from "@/lib/features";

const service = [
  { href: "/kfz-zulassung-ohne-eid", label: "Ohne eID" },
  { href: "/ablauf", label: "Ablauf" },
  { href: "/preise", label: "Preise" },
  { href: "/datensicherheit", label: "Sicherheit" },
  { href: "/gewerbe", label: "Für Gewerbe" },
  { href: "/unterlagen", label: "Unterlagen hochladen" },
];

const unternehmen = [
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
  { href: "/faq", label: "FAQ" },
  { href: "/zulassung-per-whatsapp", label: "Zulassung per WhatsApp" },
];

/* Wissensbereich bewusst behalten: Ratgeber, Städte und Zulassungsstellen tragen den Großteil der Suchmaschinen-Besucher. */
const wissen = [
  { href: "/ratgeber", label: "Ratgeber" },
  { href: "/anleitung", label: "Anleitung mit Bildern" },
  { href: "/kfz-zulassung", label: "Kfz-Zulassung nach Stadt" },
  { href: "/zulassungsstelle", label: "Zulassungsstellen" },
  { href: "/kennzeichen", label: "Kennzeichenkürzel" },
  { href: "/rechner", label: "Rechner & Tools" },
  { href: "/vorlagen", label: "Vorlagen & Downloads" },
];

function Col({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-[15px]">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="transition-colors duration-150 hover:text-white">
              {l.label}
            </Link>
          </li>
        ))}
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
    <footer className="bg-navy text-white/70">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
        <div>
          <Image
            src="/logo-hell.png"
            alt={`${site.name} – Kfz-Zulassung online`}
            width={600}
            height={148}
            className="h-12 w-auto"
          />
          <p className="mt-5 max-w-xs text-[15px] leading-relaxed">
            Kfz-Zulassung ohne eID und ohne Behördentermin – bundesweit, persönlich geprüft.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/80">
            Privater Zulassungsdienst, keine Behörde.
          </p>
          <ul className="mt-6 space-y-2.5 text-[15px]">
            <li>
              <a href={`mailto:${site.contact.email}`} className="flex items-center gap-2 transition-colors duration-150 hover:text-white">
                <Mail className="h-4 w-4 text-gold" aria-hidden />
                {site.contact.email}
              </a>
            </li>
            <li>
              <a href={`tel:${site.contact.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 transition-colors duration-150 hover:text-white">
                <Phone className="h-4 w-4 text-gold" aria-hidden />
                {site.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a href={whatsAppLink()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 transition-colors duration-150 hover:text-white">
                <WhatsAppIcon className="h-4 w-4" color="brand" />
                WhatsApp-Chat
              </a>
            </li>
            <li className="text-xs text-white/50">{site.contact.hours}</li>
          </ul>
        </div>

        <Col title="Leistungen" links={leistungen} />
        <Col title="Service" links={service} />
        <Col title="Unternehmen" links={unternehmen} />
        <Col title="Wissen" links={wissen} />
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1240px] flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-white/50 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {site.name} · {site.company.legalName}</p>
          <nav aria-label="Rechtliches" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            <Link href="/impressum" className="transition-colors duration-150 hover:text-white">Impressum</Link>
            <Link href="/datenschutz" className="transition-colors duration-150 hover:text-white">Datenschutz</Link>
            <Link href="/widerruf" className="transition-colors duration-150 hover:text-white">Widerruf</Link>
            {SERVICEBEDINGUNGEN_FREIGEGEBEN && (
              <Link href="/servicebedingungen" className="transition-colors duration-150 hover:text-white">Servicebedingungen</Link>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
