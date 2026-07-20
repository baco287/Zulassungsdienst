"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ClipboardList,
  FileUp,
  PenLine,
  SearchCheck,
  BadgeCheck,
  Package,
  PartyPopper,
} from "lucide-react";

/**
 * Vertikale Timeline des Zulassungsablaufs (Seite „So funktioniert’s“).
 * Die Stationen erscheinen beim Scrollen; bei prefers-reduced-motion
 * wird alles sofort und ohne Bewegung angezeigt.
 */
const stations = [
  {
    icon: ClipboardList,
    title: "Dienstleistung auswählen",
    text: "Neuzulassung, Ummeldung, Abmeldung oder mehr – Sie wählen die passende Leistung und sehen sofort, welche Unterlagen benötigt werden.",
  },
  {
    icon: FileUp,
    title: "Daten eingeben & Dokumente hochladen",
    text: "Fahrzeug- und Kontaktdaten eintragen, Unterlagen als Foto oder Scan übermitteln – per Formular oder bequem über WhatsApp.",
  },
  {
    icon: PenLine,
    title: "Auftrag digital bestätigen",
    text: "Sie erhalten unser verbindliches Angebot samt Vollmacht digital. Ein Klick bzw. eine Unterschrift – und wir legen los.",
  },
  {
    icon: SearchCheck,
    title: "Wir prüfen Ihre Unterlagen",
    text: "Ihre persönliche Ansprechperson kontrolliert alles auf Vollständigkeit und klärt offene Punkte direkt mit Ihnen – bevor die Behörde sie bemängelt.",
  },
  {
    icon: BadgeCheck,
    title: "Zulassung wird durchgeführt",
    text: "Wir führen den Vorgang bei der zuständigen Zulassungsbehörde durch – digital über das i-Kfz-Verfahren oder, wo nötig, persönlich vor Ort.",
  },
  {
    icon: Package,
    title: "Kennzeichen & Dokumente kommen zu Ihnen",
    text: "Fertige Papiere und geprägte, gesiegelte Kennzeichen werden versichert versendet oder – regional – persönlich vorbeigebracht.",
  },
  {
    icon: PartyPopper,
    title: "Fertig – ohne einen einzigen Behördengang",
    text: "Sie erhalten die Abschlussbestätigung. Bei Abmeldungen ist das oft schon am selben Werktag der Fall.",
  },
] as const;

export default function ProcessTimeline() {
  const reduced = useReducedMotion();

  return (
    <ol className="relative mx-auto max-w-2xl space-y-0">
      {stations.map((s, i) => {
        const content = (
          <div className="flex gap-5">
            <div className="flex flex-col items-center">
              <span className="z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-sm">
                <s.icon className="h-6 w-6" aria-hidden />
              </span>
              {i < stations.length - 1 && (
                <span className="w-px flex-1 bg-ink-200" aria-hidden />
              )}
            </div>
            <div className="pb-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                Schritt {i + 1}
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-ink-900">{s.title}</h3>
              <p className="mt-2 max-w-lg leading-relaxed text-ink-600">{s.text}</p>
            </div>
          </div>
        );

        return (
          <li key={s.title}>
            {reduced ? (
              content
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease: [0.21, 0.65, 0.36, 1] }}
              >
                {content}
              </motion.div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
