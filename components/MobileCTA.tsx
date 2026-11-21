"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { whatsAppLink } from "@/lib/site";
import WhatsAppIcon from "./WhatsAppIcon";
import { track } from "@/lib/analytics";

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

  // Auf Leistungsseiten die Leistung gleich mitgeben.
  const seitenLeistung = pathname.match(/^\/leistungen\/([^/]+)/)?.[1] ?? null;

  return (
    <>
      {/* Platzhalter, damit die Leiste den Seitenfuß nicht verdeckt */}
      <div className="no-print h-[4.5rem] bg-navy lg:hidden" aria-hidden />

      <nav
        aria-label="Schnellzugriff"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-ink-300 bg-white px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))] pt-2.5 lg:hidden"
      >
        <div className="mx-auto flex max-w-md gap-2.5">
          <a
            href={whatsAppLink("Hallo KFZ-Zulassungsprofis, ich habe eine Frage zur Kfz-Zulassung.")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("whatsapp_click", { position: "mobile_leiste" })}
            className="btn btn-wa btn-sm flex-1"
          >
            <WhatsAppIcon className="h-5 w-5" />
            WhatsApp
          </a>
          <Link
            href={seitenLeistung ? `/auftrag/?leistung=${seitenLeistung}` : "/auftrag/"}
            onClick={() => track("cta_click", { position: "mobile_leiste" })}
            className="btn btn-primary btn-sm flex-1"
          >
            Auftrag starten
          </Link>
        </div>
      </nav>
    </>
  );
}
