"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Feststehende Aktionsleiste am unteren Bildschirmrand (nur Mobil/Tablet).
 * Beim Scrollen durch die langen Inhaltsseiten bleibt der Weg zum Auftrag
 * damit immer einen Daumen entfernt.
 *
 * Auf den Formular- und Rechtsseiten ausgeblendet: Dort würde die Leiste
 * die eigentlichen Absende-Buttons verdecken bzw. nur ablenken.
 */
const hiddenOn = ["/auftrag", "/unterlagen", "/impressum", "/datenschutz", "/widerruf"];

export default function MobileCTA() {
  const pathname = usePathname() ?? "";
  if (hiddenOn.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Platzhalter, damit die Leiste den Seitenfuß nicht verdeckt */}
      <div className="no-print h-[4.5rem] lg:hidden" aria-hidden />

      <nav
        aria-label="Schnellzugriff"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-md gap-2.5">
          <a
            href={whatsAppLink("Hallo DeutscheZulassung, ich habe eine Frage zur Kfz-Zulassung.")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 font-display text-sm font-semibold text-white"
          >
            <WhatsAppIcon className="h-5 w-5 text-brand-700" />
            WhatsApp
          </a>
          <Link
            href="/auftrag"
            className="flex flex-1 items-center justify-center rounded-xl bg-brand-600 px-4 py-3 font-display text-sm font-semibold text-white"
          >
            Jetzt beauftragen
          </Link>
        </div>
      </nav>
    </>
  );
}
