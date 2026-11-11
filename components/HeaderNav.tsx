"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ArrowRight, ChevronDown, Mail, Menu, Phone, X } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import { track } from "@/lib/analytics";
import { serviceIcon } from "@/lib/serviceIcons";
import WhatsAppIcon from "./WhatsAppIcon";

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
const waHref = whatsAppLink("Hallo DeutscheZulassung, ich habe eine Frage zur Kfz-Zulassung.");

const navLink = (active: boolean) =>
  `whitespace-nowrap rounded-lg px-2 py-2 text-[15px] font-semibold transition-colors duration-150 xl:px-3.5 ${
    active ? "bg-brand-50 text-brand-700" : "text-navy hover:bg-ink-50 hover:text-brand-700"
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
    <header className="sticky top-0 z-50 bg-white/95 shadow-[0_1px_0_rgb(11_31_58/0.06),0_8px_24px_-18px_rgb(11_31_58/0.35)] backdrop-blur-md">
      <div className="container-page flex h-[4.25rem] items-center justify-between gap-3">
        <Link href="/" aria-label={`${site.name} – Startseite`} className="flex min-h-11 shrink-0 items-center">
          <Image
            src="/logo.png"
            alt={`${site.name} – Kfz-Zulassung online`}
            width={600}
            height={200}
            priority
            className="-my-3 h-[4.25rem] w-auto max-w-none lg:h-[3.4375rem] xl:h-[4.75rem]"
          />
        </Link>

        {/* ── Desktop-Navigation ── */}
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hauptnavigation">
          <div ref={megaWrap} className="relative">
            <button
              ref={megaButton}
              type="button"
              aria-expanded={megaOpen}
              aria-controls={megaId}
              onClick={() => setMegaOpen((v) => !v)}
              className={`${navLink(leistungenAktiv || megaOpen)} flex cursor-pointer items-center gap-1`}
            >
              Leistungen
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${megaOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {/* Immer im HTML (interne Links), geschlossen aber unsichtbar und nicht fokussierbar */}
            <div
              id={megaId}
              className={`absolute left-0 top-full z-50 w-[40rem] pt-3 transition-all duration-200 ${
                megaOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 opacity-0"
              }`}
            >
              <div className="rounded-[20px] border border-line bg-white p-3 shadow-[var(--shadow-elevated)]">
                <ul className="grid grid-cols-2 gap-1">
                  {services.map((s) => {
                    const Icon = serviceIcon(s.slug);
                    return (
                      <li key={s.slug}>
                        <Link
                          href={s.href}
                          className="group flex items-center gap-3 rounded-[14px] px-3 py-3 transition-colors duration-150 hover:bg-brand-50"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors duration-150 group-hover:bg-white" aria-hidden>
                            <Icon className="h-5 w-5" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-display text-[15px] font-bold text-navy">{s.label}</span>
                            <span className="block text-sm tabular-nums text-ink-600">{s.preis}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <ul className="mt-2 flex flex-wrap gap-x-1 gap-y-1 border-t border-line px-1 pt-3">
                  {mehrLeistungen.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      >
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
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp_click", { position: "header" })}
            aria-label="Per WhatsApp schreiben"
            title="Per WhatsApp schreiben"
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-150 hover:bg-ink-50"
          >
            <WhatsAppIcon className="h-7 w-7" color="brand" />
          </a>
          <Link
            href="/auftrag"
            onClick={() => track("cta_click", { position: "header" })}
            aria-label="Jetzt Zulassung starten"
            className="btn btn-primary btn-sm hidden whitespace-nowrap md:inline-flex xl:min-h-12 xl:px-5"
          >
            <span aria-hidden className="xl:hidden">Zulassung starten</span>
            <span aria-hidden className="hidden xl:inline">Jetzt Zulassung starten</span>
            <ArrowRight className="h-4 w-4 lg:hidden xl:block xl:h-5 xl:w-5" aria-hidden />
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl text-navy hover:bg-ink-50 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? mobileId : undefined}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
          >
            {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Sehr dünne Linie in Schwarz, Rot und Gold */}
      <div aria-hidden>
        <div className="h-px bg-black" />
        <div className="h-px bg-[#DD0000]" />
        <div className="h-px bg-[#FFCC00]" />
      </div>

      {/* ── Mobiles Menü ── */}
      {mobileOpen && (
        <nav
          id={mobileId}
          aria-label="Mobile Navigation"
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain border-t border-line bg-white shadow-[var(--shadow-elevated)] lg:hidden"
        >
          <div className="container-page pb-6 pt-4">
            <p className="eyebrow px-1">Leistungen</p>
            <ul className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
              {services.map((s) => {
                const Icon = serviceIcon(s.slug);
                return (
                  <li key={s.slug}>
                    <Link
                      href={s.href}
                      onClick={() => setMobileOpen(false)}
                      className="flex min-h-[3.25rem] items-center gap-3 rounded-[14px] px-2 py-2 hover:bg-ink-50"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700" aria-hidden>
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </span>
                      <span className="flex-1 font-display text-base font-bold text-navy">{s.label}</span>
                      <span className="text-sm tabular-nums text-ink-600">{s.preis}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-3 border-t border-line pt-3">
              {[...mehrLeistungen, ...nav, ...mobileExtra].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                    className="flex min-h-12 items-center rounded-xl px-2 text-base font-semibold text-navy hover:bg-ink-50 aria-[current=page]:text-brand-700"
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
              className="btn btn-primary btn-lg btn-block mt-4"
            >
              Jetzt Zulassung starten
              <ArrowRight className="h-5 w-5" aria-hidden />
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <a
                href={telHref}
                onClick={() => track("phone_click", { position: "mobile_menu" })}
                className="btn btn-secondary btn-sm"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Anrufen
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                onClick={() => track("email_click", { position: "mobile_menu" })}
                className="btn btn-secondary btn-sm"
              >
                <Mail className="h-4 w-4" aria-hidden />
                E-Mail
              </a>
            </div>
            <p className="mt-4 text-center text-sm text-ink-600">Servicezeiten: {site.contact.hours}</p>
          </div>
        </nav>
      )}
    </header>
  );
}
