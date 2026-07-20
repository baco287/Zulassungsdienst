"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  BadgeCheck,
  Check,
  ClipboardList,
  FileUp,
  Loader2,
  Package,
  PartyPopper,
  PenLine,
  SearchCheck,
  Truck,
} from "lucide-react";

/**
 * Grafische Timeline des Zulassungsablaufs („So funktioniert’s“):
 * – zentrale Linie, die sich beim Scrollen füllt (Scroll-Progress)
 * – Karten fliegen abwechselnd von links/rechts ein
 * – jede Karte enthält eine kleine animierte Mini-Grafik zum Schritt
 * Bei prefers-reduced-motion: alles statisch und sofort sichtbar
 * (CSS-Loops werden global über die Media-Query deaktiviert).
 */

/* ---------- Mini-Grafiken je Schritt ---------- */

function VisualAuswahl() {
  return (
    <div className="flex flex-wrap gap-2" aria-hidden>
      {["Neuzulassung", "Ummeldung", "Abmeldung"].map((label, i) => (
        <span
          key={label}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            i === 0
              ? "bg-brand-600 text-white shadow-sm"
              : "border border-ink-200 bg-white text-ink-600"
          }`}
        >
          {i === 0 && <Check className="mr-1 inline h-3 w-3" />}
          {label}
        </span>
      ))}
    </div>
  );
}

function VisualUpload() {
  return (
    <div className="space-y-2" aria-hidden>
      <div className="flex items-center gap-2 text-xs font-semibold text-ink-600">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
          <FileUp className="h-3.5 w-3.5" />
        </span>
        fahrzeugschein.jpg
        <span className="ml-auto text-brand-600">wird hochgeladen …</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100">
        <div className="animate-fillbar h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" />
      </div>
    </div>
  );
}

function VisualBestaetigen() {
  return (
    <div className="flex items-end justify-between gap-4" aria-hidden>
      <div className="flex-1">
        <svg viewBox="0 0 120 28" className="h-8 w-32" fill="none">
          <path
            d="M4 20 C 18 6, 26 26, 38 16 S 60 4, 72 16 S 96 24, 116 10"
            stroke="var(--color-brand-600)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="animate-sign"
          />
        </svg>
        <div className="mt-1 h-px w-32 bg-ink-300" />
        <p className="mt-1 text-[10px] font-medium text-ink-400">Digitale Vollmacht</p>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
        <Check className="h-4 w-4" />
      </span>
    </div>
  );
}

function VisualPruefung() {
  const items = ["eVB-Nummer geprüft", "Fahrzeugbrief vollständig", "SEPA-Mandat liegt vor"];
  return (
    <ul className="space-y-1.5" aria-hidden>
      {items.map((t, i) => (
        <li key={t} className="flex items-center gap-2 text-xs font-medium text-ink-700">
          <span
            className="animate-tick flex h-4.5 w-4.5 items-center justify-center rounded-full bg-emerald-500 text-white"
            style={{ animationDelay: `${i * 0.55}s`, height: "1.125rem", width: "1.125rem" }}
          >
            <Check className="h-3 w-3" />
          </span>
          {t}
        </li>
      ))}
    </ul>
  );
}

function VisualBehoerde() {
  return (
    <div
      className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-4 py-3"
      aria-hidden
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-brand-700">
        <Loader2 className="animate-spin-slow h-4.5 w-4.5" style={{ height: "1.125rem", width: "1.125rem" }} />
        i-Kfz-Vorgang läuft …
      </span>
      <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand-600 shadow-sm">
        Behörde
      </span>
    </div>
  );
}

function VisualZustellung() {
  return (
    <div aria-hidden>
      <div className="relative h-9 overflow-hidden">
        <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-ink-200" />
        <span className="animate-drive absolute left-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand-600 text-white shadow-md">
          <Truck className="h-4 w-4" />
        </span>
        <span className="absolute right-0 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-2 border-emerald-400 bg-white text-emerald-500">
          <Package className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-1 text-[10px] font-medium text-ink-400">
        Versicherter Versand · Sendungsverfolgung inklusive
      </p>
    </div>
  );
}

function VisualFertig() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <span className="animate-pulsering flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
        <BadgeCheck className="h-5 w-5" />
      </span>
      <span className="rounded-lg border-2 border-ink-800 bg-white px-3 py-1 font-display text-sm font-bold tracking-widest text-ink-900">
        <span className="mr-1.5 border-r-2 border-ink-300 pr-1.5 text-brand-600">D</span>
        B · EZ 2027
      </span>
    </div>
  );
}

/* ---------- Stationen ---------- */

const stations = [
  {
    icon: ClipboardList,
    title: "Dienstleistung auswählen",
    text: "Neuzulassung, Ummeldung, Abmeldung oder mehr – Sie wählen die passende Leistung und sehen sofort, welche Unterlagen benötigt werden.",
    visual: VisualAuswahl,
  },
  {
    icon: FileUp,
    title: "Daten eingeben & Dokumente hochladen",
    text: "Fahrzeug- und Kontaktdaten eintragen, Unterlagen als Foto oder Scan übermitteln – per Formular oder bequem über WhatsApp.",
    visual: VisualUpload,
  },
  {
    icon: PenLine,
    title: "Auftrag digital bestätigen",
    text: "Sie erhalten unser verbindliches Angebot samt Vollmacht digital. Ein Klick bzw. eine Unterschrift – und wir legen los.",
    visual: VisualBestaetigen,
  },
  {
    icon: SearchCheck,
    title: "Wir prüfen Ihre Unterlagen",
    text: "Ihre persönliche Ansprechperson kontrolliert alles auf Vollständigkeit und klärt offene Punkte direkt mit Ihnen.",
    visual: VisualPruefung,
  },
  {
    icon: BadgeCheck,
    title: "Zulassung wird durchgeführt",
    text: "Wir führen den Vorgang bei der zuständigen Zulassungsbehörde durch – digital über das i-Kfz-Verfahren oder, wo nötig, persönlich vor Ort.",
    visual: VisualBehoerde,
  },
  {
    icon: Package,
    title: "Kennzeichen & Dokumente kommen zu Ihnen",
    text: "Fertige Papiere und geprägte, gesiegelte Kennzeichen werden versichert versendet oder – regional – persönlich vorbeigebracht.",
    visual: VisualZustellung,
  },
  {
    icon: PartyPopper,
    title: "Fertig – ohne einen einzigen Behördengang",
    text: "Sie erhalten die Abschlussbestätigung. Bei Abmeldungen ist das oft schon am selben Werktag der Fall.",
    visual: VisualFertig,
  },
] as const;

/* ---------- Timeline ---------- */

export default function ProcessTimeline() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.75", "end 0.7"],
  });
  const spineScale = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });

  return (
    <ol ref={ref} className="relative mx-auto max-w-4xl">
      {/* Zentrale Linie (mobil links, ab lg mittig) */}
      <div
        className="absolute bottom-8 top-2 left-6 w-1 -translate-x-1/2 rounded-full bg-ink-200 lg:left-1/2"
        aria-hidden
      >
        {reduced ? (
          <div className="h-full w-full rounded-full bg-gradient-to-b from-brand-500 to-emerald-400" />
        ) : (
          <motion.div
            style={{ scaleY: spineScale }}
            className="h-full w-full origin-top rounded-full bg-gradient-to-b from-brand-500 via-brand-500 to-emerald-400"
          />
        )}
      </div>

      {stations.map((s, i) => {
        const left = i % 2 === 0;
        const Visual = s.visual;
        const card = (
          <div className="group rounded-2xl border border-ink-200 bg-white p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card-hover">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
              Schritt {i + 1}
            </p>
            <h3 className="mt-1.5 font-display text-lg font-bold text-ink-900 sm:text-xl">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.text}</p>
            <div className="mt-4 rounded-xl border border-ink-100 bg-ink-50/60 p-3.5">
              <Visual />
            </div>
          </div>
        );

        return (
          <li key={s.title} className="relative pb-10 last:pb-0">
            {/* Knoten auf der Linie */}
            <span
              className={`absolute left-6 top-8 z-10 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-2xl text-white shadow-lg lg:left-1/2 ${
                i === stations.length - 1
                  ? "bg-emerald-500 shadow-emerald-500/30"
                  : "bg-brand-600 shadow-brand-600/30"
              } ${reduced ? "" : "animate-pulsering"}`}
              style={{ animationDelay: `${i * 0.3}s` }}
              aria-hidden
            >
              <s.icon className="h-5 w-5" />
            </span>

            {/* Karte: mobil rechts der Linie, ab lg abwechselnd */}
            <div
              className={`pl-16 lg:w-1/2 ${
                left ? "lg:pl-0 lg:pr-14" : "lg:ml-auto lg:pl-14"
              }`}
            >
              {reduced ? (
                card
              ) : (
                <motion.div
                  initial={{ opacity: 0, x: left ? -56 : 56, y: 16 }}
                  whileInView={{ opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, margin: "-70px" }}
                  transition={{ duration: 0.55, ease: [0.21, 0.65, 0.36, 1] }}
                >
                  {card}
                </motion.div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
