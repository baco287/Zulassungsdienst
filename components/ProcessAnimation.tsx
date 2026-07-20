"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ClipboardList,
  FileUp,
  PenLine,
  SearchCheck,
  BadgeCheck,
  Package,
  CheckCircle2,
} from "lucide-react";

/**
 * Animierte Darstellung des Zulassungsablaufs für die Hero-Section.
 * Eine stilisierte Auftragskarte durchläuft die Stationen automatisch;
 * links läuft eine Statusschiene mit. Bei prefers-reduced-motion wird
 * eine statische, vollständige Liste aller Schritte gezeigt.
 */
const steps = [
  { icon: ClipboardList, title: "Dienstleistung wählen", detail: "z. B. Neuzulassung" },
  { icon: FileUp, title: "Daten & Dokumente", detail: "Fotos genügen" },
  { icon: PenLine, title: "Digital bestätigen", detail: "Vollmacht online" },
  { icon: SearchCheck, title: "Wir prüfen alles", detail: "persönliche Betreuung" },
  { icon: BadgeCheck, title: "Behörde lässt zu", detail: "i-Kfz-Verfahren" },
  { icon: Package, title: "Zustellung", detail: "Kennzeichen & Papiere" },
  { icon: CheckCircle2, title: "Fertig!", detail: "ohne Behördengang" },
] as const;

const STEP_MS = 2200;

export default function ProcessAnimation() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setActive((a) => (a + 1) % steps.length), STEP_MS);
    return () => clearInterval(t);
  }, [reduced]);

  // Barrierearme Alternative: statische Schrittliste ohne Animation.
  if (reduced) {
    return (
      <ol className="space-y-3 rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-center gap-3 text-sm text-ink-700">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-semibold text-brand-700">
              {i + 1}
            </span>
            <div>
              <span className="font-semibold text-ink-900">{s.title}</span>
              <span className="text-ink-500"> – {s.detail}</span>
            </div>
          </li>
        ))}
      </ol>
    );
  }

  const Current = steps[active].icon;
  const progress = ((active + 1) / steps.length) * 100;

  return (
    <div
      className="relative select-none"
      role="img"
      aria-label="Animation: Ablauf der Fahrzeugzulassung in sieben Schritten von der Auswahl der Dienstleistung bis zur Zustellung"
    >
      {/* Statusschiene */}
      <div className="absolute -left-1 top-6 bottom-6 hidden w-1 rounded-full bg-ink-200 sm:block">
        <motion.div
          className="w-full rounded-full bg-brand-500"
          animate={{ height: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <div className="sm:pl-8">
        {/* Aktive Karte */}
        <div className="relative h-44">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.98 }}
              transition={{ duration: 0.38, ease: [0.21, 0.65, 0.36, 1] }}
              className="absolute inset-0 rounded-2xl border border-ink-200 bg-white p-6 shadow-card"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
                Schritt {active + 1} von {steps.length}
              </p>
              <div className="mt-3 flex items-center gap-4">
                <motion.span
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white"
                  initial={{ rotate: -8 }}
                  animate={{ rotate: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 14 }}
                >
                  <Current className="h-7 w-7" aria-hidden />
                </motion.span>
                <div>
                  <p className="font-display text-xl font-bold text-ink-900">
                    {steps[active].title}
                  </p>
                  <p className="text-sm text-ink-500">{steps[active].detail}</p>
                </div>
              </div>
              {/* Fortschrittsbalken in der Karte */}
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <motion.div
                  key={`bar-${active}`}
                  className="h-full rounded-full bg-brand-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: STEP_MS / 1000, ease: "linear" }}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Kompakte Schrittleiste darunter */}
        <ol className="mt-5 grid grid-cols-7 gap-1.5" aria-hidden>
          {steps.map((s, i) => (
            <li key={s.title}>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setActive(i)}
                className={`h-1.5 w-full cursor-pointer rounded-full transition-colors duration-300 ${
                  i <= active ? "bg-brand-500" : "bg-ink-200"
                }`}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
