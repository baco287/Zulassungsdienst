"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import WhatsAppIcon from "./WhatsAppIcon";
import Logo from "./Logo";

export interface HeaderService {
  slug: string;
  label: string;
  href: string;
  preis: string;
}

const nav = [
  { href: "/preise", label: "Preise" },
  { href: "/ablauf", label: "So funktioniert’s" },
  { href: "/kfz-zulassung", label: "Standorte" },
  { href: "/ratgeber", label: "Ratgeber" },
  { href: "/kontakt", label: "Kontakt" },
];

/** Weitere Einstiege im Leistungsmenü und im mobilen Menü. */
const mehrLeistungen = [
  { href: "/leistungen", label: "Alle Leistungen" },
  { href: "/kfz-zulassung-ohne-eid", label: "Zulassung ohne eID" },
  { href: "/gewerbe", label: "Für Gewerbe" },
  { href: "/zulassung-per-whatsapp", label: "Zulassung per WhatsApp" },
];

const mobileExtra = [
  { href: "/faq", label: "Häufige Fragen" },
  { href: "/datensicherheit", label: "Datensicherheit" },
  { href: "/ueber-uns", label: "Über uns" },
];

const telHref = `tel:${site.contact.phone.replace(/\s/g, "")}`;
const waHref = whatsAppLink("Hallo KFZ-Zulassungsprofis, ich habe eine Frage zur Kfz-Zulassung.");

/* Navigation als schlichter Text: aktive Seite und Hover bekommen eine Unterstreichung. */
const navLink = (active: boolean) =>
  `flex min-h-11 items-center whitespace-nowrap px-1.5 text-[15px] font-medium text-navy decoration-2 underline-offset-[7px] hover:underline xl:px-2.5 xl:text-[15.5px] ${
    active ? "underline" : ""
  }`;

export default function HeaderNav({ services }: { services: HeaderService[] }) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const megaButton = useRef<HTMLButtonElement>(null);
  const megaWrap = useRef<HTMLDivElement>(null);
  const megaId = useId();
  const mobileId = useId();

  // Beide Menüs schließen bei Seitenwechsel (auch Zurück-Navigation).
  useEffect(() => {
    setMobileOpen(false);
    setMegaOpen(false);
  }, [pathname]);

  // Escape schließt das offene Menü; der Fokus kehrt auf den Auslöser zurück.
  useEffect(() => {
    if (!mobileOpen && !megaOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (megaOpen) {
        setMegaOpen(false);
        megaButton.current?.focus();
      }
      if (mobileOpen) {
        setMobileOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileOpen, megaOpen]);

  // Klick außerhalb schließt das Leistungsmenü.
  useEffect(() => {
    if (!megaOpen) return;
    const onDown = (e: PointerEvent) => {
      if (megaWrap.current && !megaWrap.current.contains(e.target as Node)) setMegaOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [megaOpen]);

  // Offenes Mobilmenü: Seite dahinter nicht mitscrollen.
  useEffect(() => {
    if (!mobileOpen) return;
    const vorher = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = vorher;
    };
  }, [mobileOpen]);

  const leistungenAktiv = pathname.startsWith("/leistungen");

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-3 lg:h-[4.75rem] lg:gap-6">
        <Link href="/" aria-label={`${site.name} – Startseite`} className="flex min-h-11 shrink-0 items-center">
          <Logo />
        </Link>

        {/* ── Desktop-Navigation ── */}
        <nav className="hidden items-center min-[1180px]:flex xl:gap-1" aria-label="Hauptnavigation">
          <div ref={megaWrap} className="relative">
            <button
              ref={megaButton}
              type="button"
              aria-expanded={megaOpen}
              aria-controls={megaId}
              onClick={() => setMegaOpen((v) => !v)}
              className={`${navLink(leistungenAktiv || megaOpen)} cursor-pointer gap-1`}
            >
              Leistungen
              <ChevronDown className={`h-4 w-4 ${megaOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>

            {/* Immer im HTML (interne Links), geschlossen aber unsichtbar und nicht fokussierbar */}
            <div
              id={megaId}
              className={`absolute left-0 top-full z-50 w-[27rem] pt-3 ${megaOpen ? "visible" : "invisible"}`}
            >
              <div className="rounded-[10px] border-2 border-navy bg-white px-5 pb-3 pt-1">
                <ul className="liste">
                  {services.map((s) => (
                    <li key={s.slug} className="first:border-t-0">
                      <Link
                        href={s.href}
                        className="group flex min-h-12 items-baseline justify-between gap-6 py-3"
                      >
                        <span className="font-display text-[1.0625rem] font-semibold text-navy decoration-2 underline-offset-4 group-hover:underline">
                          {s.label}
                        </span>
                        <span className="text-[15px] tabular-nums text-ink-600">{s.preis}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <ul className="flex flex-wrap gap-x-5 pt-2">
                  {mehrLeistungen.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="link inline-flex min-h-10 items-center text-sm">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={navLink(active)}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* ── Kontakt und Start ── */}
        <div className="flex items-center gap-1 lg:gap-3 xl:gap-4">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp_click", { position: "header" })}
            aria-label="Per WhatsApp schreiben"
            className="flex h-11 min-w-11 items-center justify-center gap-2 text-[15.5px] font-medium text-navy decoration-2 underline-offset-[7px] hover:underline"
          >
            <WhatsAppIcon className="h-[26px] w-[26px] min-[1180px]:h-[22px] min-[1180px]:w-[22px]" color="brand" />
            <span aria-hidden className="hidden min-[1360px]:inline">WhatsApp</span>
          </a>
          <Link
            href="/auftrag"
            onClick={() => track("cta_click", { position: "header" })}
            aria-label="Jetzt Zulassung starten"
            className="btn btn-primary btn-sm hidden whitespace-nowrap md:inline-flex"
          >
            <span aria-hidden className="xl:hidden">Zulassung starten</span>
            <span aria-hidden className="hidden xl:inline">Jetzt Zulassung starten</span>
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-navy hover:bg-canvas min-[1180px]:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? mobileId : undefined}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {/* ── Mobiles Menü ── */}
      {mobileOpen && (
        <nav
          id={mobileId}
          aria-label="Mobile Navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto lg:max-h-[calc(100dvh-4.75rem)] overscroll-contain border-b-2 border-t border-b-navy border-t-line bg-white min-[1180px]:hidden"
        >
          <div className="container-page pb-6 pt-2">
            <h2 className="sr-only">Leistungen</h2>
            <ul className="liste">
              {services.map((s) => (
                <li key={s.slug} className="first:border-t-0">
                  <Link
                    href={s.href}
                    onClick={() => setMobileOpen(false)}
                    className="flex min-h-[3.25rem] items-baseline justify-between gap-4 py-3.5"
                  >
                    <span className="font-display text-[1.0625rem] font-semibold text-navy">{s.label}</span>
                    <span className="text-[15px] tabular-nums text-ink-600">{s.preis}</span>
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-4 grid grid-cols-2 gap-x-6">
              {[...mehrLeistungen, ...nav, ...mobileExtra].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                    className="flex min-h-11 items-center text-base font-medium text-navy decoration-2 underline-offset-4 aria-[current=page]:underline"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <Link
              href="/auftrag"
              onClick={() => {
                setMobileOpen(false);
                track("cta_click", { position: "mobile_menu" });
              }}
              className="btn btn-primary btn-lg btn-block mt-5"
            >
              Jetzt Zulassung starten
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href={telHref}
                onClick={() => track("phone_click", { position: "mobile_menu" })}
                className="btn btn-secondary btn-sm"
              >
                Anrufen
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                onClick={() => track("email_click", { position: "mobile_menu" })}
                className="btn btn-secondary btn-sm"
              >
                E-Mail
              </a>
            </div>
            <p className="mt-4 text-sm text-ink-600">Servicezeiten: {site.contact.hours}</p>
          </div>
        </nav>
      )}
    </header>
  );
}
