import Link from "next/link";
import { CarFront, Mail, MessageCircle, Phone, ShieldCheck } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { sortedServices } from "@/lib/services";

export default function Footer() {
  const topServices = sortedServices.filter((s) => s.category === "zulassung").slice(0, 6);

  return (
    <footer className="border-t border-ink-200 bg-ink-950 text-ink-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2 font-display text-lg font-bold text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <CarFront className="h-5 w-5" aria-hidden />
            </span>
            Easy<span className="text-brand-400">Zulassung</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed">
            Ihr digitaler Zulassungsdienst: transparent, schnell und persönlich betreut –
            von der Neuzulassung bis zur Abmeldung.
          </p>
          <p className="mt-4 flex items-center gap-2 text-xs text-ink-400">
            <ShieldCheck className="h-4 w-4 text-brand-400" aria-hidden />
            Sichere, DSGVO-konforme Datenverarbeitung
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
            <li><Link href="/preise" className="transition-colors duration-200 hover:text-white">Preise</Link></li>
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
                <MessageCircle className="h-4 w-4 text-brand-400" aria-hidden />
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
