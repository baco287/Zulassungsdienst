import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, ShieldCheck } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { sortedServices } from "@/lib/services";
import WhatsAppIcon from "./WhatsAppIcon";

export default function Footer() {
  const topServices = sortedServices.filter((s) => s.category === "zulassung").slice(0, 6);

  return (
    <footer className="border-t border-ink-200 bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Image
            src="/logo-hell.png"
            alt={`${site.name} – Kfz-Zulassung online`}
            width={2075}
            height={511}
            className="h-10 w-auto"
          />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Ihr digitaler Zulassungsdienst: transparent, schnell und persönlich betreut –
            von der Neuzulassung bis zur Abmeldung.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
            <ShieldCheck className="h-4 w-4 text-brand-400" aria-hidden />
            Verschlüsselte Übertragung · keine Tracking-Cookies
          </p>
        </div>

        <nav aria-label="Leistungen">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Leistungen
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            {topServices.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/leistungen/${s.slug}/`}
                  className="transition-colors duration-200 hover:text-white"
                >
                  {s.shortName ?? s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Unternehmen">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Unternehmen
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/ueber-uns" className="transition-colors duration-200 hover:text-white">Über uns</Link></li>
            <li><Link href="/ablauf" className="transition-colors duration-200 hover:text-white">So funktioniert’s</Link></li>
            <li><Link href="/zulassung-per-whatsapp" className="transition-colors duration-200 hover:text-white">Zulassung per WhatsApp</Link></li>
            <li><Link href="/maxx" className="transition-colors duration-200 hover:text-white">Schnellstart mit Maxx</Link></li>
            <li><Link href="/gewerbe" className="transition-colors duration-200 hover:text-white">Für Gewerbekunden</Link></li>
            <li><Link href="/kfz-zulassung" className="transition-colors duration-200 hover:text-white">Kfz-Zulassung nach Stadt</Link></li>
            <li><Link href="/preise" className="transition-colors duration-200 hover:text-white">Preise</Link></li>
            <li><Link href="/ratgeber" className="transition-colors duration-200 hover:text-white">Ratgeber</Link></li>
            <li><Link href="/rechner" className="transition-colors duration-200 hover:text-white">Rechner &amp; Tools</Link></li>
            <li><Link href="/vorlagen" className="transition-colors duration-200 hover:text-white">Vorlagen &amp; Downloads</Link></li>
            <li><Link href="/faq" className="transition-colors duration-200 hover:text-white">Häufige Fragen</Link></li>
            <li><Link href="/kontakt" className="transition-colors duration-200 hover:text-white">Kontakt</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
            Kontakt
          </h2>
          <ul className="mt-4 space-y-3 text-sm">
            <li>
              <a
                href={`mailto:${site.contact.email}`}
                className="flex items-center gap-2 transition-colors duration-200 hover:text-white"
              >
                <Mail className="h-4 w-4 text-brand-400" aria-hidden />
                {site.contact.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 transition-colors duration-200 hover:text-white"
              >
                <Phone className="h-4 w-4 text-brand-400" aria-hidden />
                {site.contact.phoneDisplay}
              </a>
            </li>
            <li>
              <a
                href={whatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition-colors duration-200 hover:text-white"
              >
                <WhatsAppIcon className="h-4 w-4 text-brand-400" />
                WhatsApp-Chat
              </a>
            </li>
            <li className="text-xs text-ink-400">{site.contact.hours}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-ink-400 sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} {site.name}. Alle Rechte vorbehalten.</p>
          <nav aria-label="Rechtliches" className="flex gap-5">
            <Link href="/impressum" className="transition-colors duration-200 hover:text-white">Impressum</Link>
            <Link href="/datenschutz" className="transition-colors duration-200 hover:text-white">Datenschutz</Link>
            <Link href="/widerruf" className="transition-colors duration-200 hover:text-white">Widerruf</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
