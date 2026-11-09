"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";
import { track } from "@/lib/analytics";

const nav = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/kfz-zulassung-ohne-eid", label: "Ohne eID" },
  { href: "/ablauf", label: "Ablauf" },
  { href: "/preise", label: "Preise" },
  { href: "/datensicherheit", label: "Sicherheit" },
  { href: "/gewerbe", label: "Für Gewerbe" },
];

/** Zusätzliche Links nur im mobilen Menü. */
const mobileExtra = [
  { href: "/faq", label: "Häufige Fragen" },
  { href: "/kfz-zulassung", label: "Kfz-Zulassung nach Stadt" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

const telHref = `tel:${site.contact.phone.replace(/\s/g, "")}`;
const waHref = whatsAppLink("Hallo DeutscheZulassung, ich habe eine Frage zur Kfz-Zulassung.");

/** Runder Icon-Button für Telefon und WhatsApp – ohne sichtbare Nummer. */
function IconAction({
  href,
  label,
  onClick,
  external,
  className,
  children,
}: {
  href: string;
  label: string;
  onClick: () => void;
  external?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${className}`}
    >
      {children}
    </a>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);

  // Mobilmenü schließt bei Seitenwechsel (auch Zurück-Navigation) …
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // … und mit Escape; der Fokus kehrt dann auf den Menü-Button zurück.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label={`${site.name} – Startseite`} className="flex min-h-11 shrink-0 items-center">
          <Image
            src="/logo.png"
            alt={`${site.name} – Kfz-Zulassung online`}
            width={600}
            height={200}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-[15px] font-medium transition-colors duration-150 ${
                  active ? "bg-gold-50 text-navy" : "text-navy/80 hover:bg-offwhite hover:text-navy"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <IconAction
            href={telHref}
            label="Anrufen"
            onClick={() => track("phone_click", { position: "header" })}
            className="bg-offwhite text-navy hover:bg-line"
          >
            <Phone className="h-[18px] w-[18px]" aria-hidden />
          </IconAction>
          <IconAction
            href={waHref}
            label="Per WhatsApp schreiben"
            onClick={() => track("whatsapp_click", { position: "header" })}
            external
            className="bg-wa/15 text-[#0e7a5f] hover:bg-wa/25"
          >
            <WhatsAppIcon className="h-5 w-5" />
          </IconAction>
          <Link
            href="/auftrag"
            onClick={() => track("cta_click", { position: "header" })}
            className="hidden h-11 items-center whitespace-nowrap rounded-xl bg-navy px-5 font-display text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-navy-800 md:flex"
          >
            Auftrag starten
          </Link>
          <button
            ref={menuButton}
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-navy hover:bg-offwhite lg:hidden"
            aria-expanded={open}
            aria-controls={open ? "mobile-nav" : undefined}
            aria-label={open ? "Menü schließen" : "Menü öffnen"}
          >
            {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile Navigation"
          className="border-t border-line bg-white px-4 pb-4 pt-2 lg:hidden"
        >
          {[...nav, ...mobileExtra].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-navy hover:bg-offwhite"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/auftrag"
            onClick={() => {
              setOpen(false);
              track("cta_click", { position: "mobile_menu" });
            }}
            className="mt-3 flex min-h-[48px] items-center justify-center rounded-xl bg-navy px-4 font-display text-base font-semibold text-white md:hidden"
          >
            Auftrag starten
          </Link>
        </nav>
      )}

      {/* Sehr dünne Linie in Schwarz, Rot und Gold */}
      <div aria-hidden>
        <div className="h-px bg-ink-950" />
        <div className="h-px bg-[#DD0000]" />
        <div className="h-px bg-[#FFCC00]" />
      </div>
    </header>
  );
}
