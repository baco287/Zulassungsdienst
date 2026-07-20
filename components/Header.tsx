"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, MessageCircle, CarFront } from "lucide-react";
import { site, whatsAppLink } from "@/lib/site";

const nav = [
  { href: "/leistungen", label: "Leistungen" },
  { href: "/preise", label: "Preise" },
  { href: "/ablauf", label: "So funktioniert’s" },
  { href: "/faq", label: "FAQ" },
  { href: "/ueber-uns", label: "Über uns" },
  { href: "/kontakt", label: "Kontakt" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-bold text-ink-900"
          aria-label={`${site.name} – Startseite`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white">
            <CarFront className="h-5 w-5" aria-hidden />
          </span>
          <span>
            Easy<span className="text-brand-700">Zulassung</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Hauptnavigation">
          {nav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active
                    ? "bg-brand-50 text-brand-800"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900"
                }`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <a
            href={whatsAppLink("Hallo EasyZulassung, ich habe eine Frage zur Kfz-Zulassung.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm font-medium text-ink-700 transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            WhatsApp
          </a>
          <Link
            href="/auftrag"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-800"
          >
            Jetzt beauftragen
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="cursor-pointer rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Menü schließen" : "Menü öffnen"}
        >
          {open ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile Navigation"
          className="border-t border-ink-200 bg-white px-4 pb-4 pt-2 lg:hidden"
        >
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-ink-700 hover:bg-ink-100"
            >
              {item.label}
            </Link>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={whatsAppLink("Hallo EasyZulassung, ich habe eine Frage zur Kfz-Zulassung.")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border border-ink-200 px-4 py-3 text-base font-medium text-ink-700"
            >
              <MessageCircle className="h-5 w-5" aria-hidden />
              Per WhatsApp schreiben
            </a>
            <Link
              href="/auftrag"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-brand-700 px-4 py-3 text-center text-base font-semibold text-white"
            >
              Jetzt beauftragen
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
