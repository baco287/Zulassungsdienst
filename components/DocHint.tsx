"use client";

import { useState } from "react";
import Image from "next/image";
import { Info, X } from "lucide-react";

/**
 * Info-Button neben Checklisten-Punkten im Auftragsformular:
 * Ein Tap auf das (i) zeigt eine Bildvorschau, wie das Dokument aussieht
 * bzw. wo man die Angabe findet. Bewusst nur für die erklärungsbedürftigen
 * Punkte (Fahrzeugbrief/CoC und eVB-Nummer).
 */

interface HintConfig {
  key: string;
  title: string;
  text: string;
  src: string;
  alt: string;
}

const hints: HintConfig[] = [
  {
    key: "zb2",
    title: "So sieht der Fahrzeugbrief aus",
    text: "Der Fahrzeugbrief (Zulassungsbescheinigung Teil II) ist das größere der beiden Dokumente – rechts im Bild. Er wird zu Hause aufbewahrt, nicht im Auto. Beim Neuwagen gibt es stattdessen das CoC-Papier des Herstellers (DIN A4, „EG-Übereinstimmungsbescheinigung“).",
    src: "/images/zb1-zb2-dokumente.jpg",
    alt: "Zulassungsbescheinigung Teil I und Teil II nebeneinander – der Fahrzeugbrief ist das größere Dokument rechts",
  },
  {
    key: "evb",
    title: "So sieht die eVB-Nummer aus",
    text: "Die eVB ist ein 7-stelliger Code aus Buchstaben und Ziffern (z. B. VB123XY). Ihre Kfz-Versicherung schickt sie per E-Mail oder SMS – meist sofort nach der Anfrage, kostenlos. Noch keine eVB? Kurz bei der Versicherung anfordern, das dauert nur Minuten.",
    src: "/images/evb-nummer-handy.jpg",
    alt: "Smartphone zeigt eine Versicherungs-E-Mail mit hervorgehobener eVB-Nummer VB123XY",
  },
];

/** Liefert die passende Bildvorschau für einen Checklisten-Punkt – oder null. */
export function getDocHint(item: string): HintConfig | null {
  if (item.includes("Teil II") || item.includes("CoC")) return hints[0];
  if (item.toLowerCase().includes("evb")) return hints[1];
  return null;
}

export function DocHintToggle({ hint }: { hint: HintConfig }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Vorschau schließen" : `${hint.title} – Vorschau anzeigen`}
        className="ml-1 inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-brand-600 transition-colors duration-200 hover:bg-brand-100 hover:text-brand-800"
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Info className="h-4 w-4" aria-hidden />}
      </button>
      {open && (
        <span className="mt-2 block overflow-hidden rounded-xl border border-brand-200 bg-white">
          <Image
            src={hint.src}
            alt={hint.alt}
            width={1264}
            height={848}
            className="h-auto w-full"
            sizes="(min-width: 640px) 560px, 100vw"
          />
          <span className="block p-3">
            <span className="block font-display text-sm font-bold text-ink-900">{hint.title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-ink-600">{hint.text}</span>
          </span>
        </span>
      )}
    </>
  );
}
