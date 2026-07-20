"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BadgeCheck, FileText, Loader2, ShieldCheck } from "lucide-react";

/**
 * Hero-Diagramm: vier verbundene Schritt-Karten im Zickzack-Layout mit
 * animierten, gestrichelten Verbindungslinien (Optik angelehnt an moderne
 * Zulassungssoftware, eigenständig umgesetzt). Die Karten werden nacheinander
 * "aktiv" hervorgehoben; Karte 3 zeigt einen laufenden Prüf-Indikator.
 * Bei prefers-reduced-motion: statisch, alle Karten sichtbar, keine Bewegung.
 */
const STEP_MS = 1800;

export default function HeroFlowAnimation() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => setActive((a) => (a + 1) % 4), STEP_MS);
    return () => clearInterval(t);
  }, [reduced]);

  const cardBase =
    "pointer-events-none rounded-2xl border bg-white p-4 shadow-card transition-all duration-500";
  const activeRing = (i: number) =>
    !reduced && active === i
      ? "border-brand-400 shadow-[var(--shadow-glow)] scale-[1.03]"
      : "border-ink-200";

  return (
    <div
      className="relative mx-auto h-[26rem] w-full max-w-[34rem] select-none sm:h-[28rem]"
      role="img"
      aria-label="Animation: In vier Schritten zur fertigen Zulassung – Daten eingeben, Identität verifizieren, behördliche Prüfung, fertig"
    >
      {/* Gestrichelte Verbindungslinien */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 540 448"
        fill="none"
        aria-hidden
        preserveAspectRatio="none"
      >
        <path
          d="M150 90 C 250 90, 300 60, 380 96"
          stroke="var(--color-brand-400)"
          strokeWidth="2.5"
          className={reduced ? "" : "animate-dash"}
          strokeDasharray="4 6"
        />
        <path
          d="M400 170 C 380 230, 260 210, 170 250"
          stroke="var(--color-brand-400)"
          strokeWidth="2.5"
          className={reduced ? "" : "animate-dash"}
          strokeDasharray="4 6"
        />
        <path
          d="M180 330 C 260 380, 330 350, 400 372"
          stroke="var(--color-brand-400)"
          strokeWidth="2.5"
          className={reduced ? "" : "animate-dash"}
          strokeDasharray="4 6"
        />
      </svg>

      {/* Karte 1: Daten eingeben */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`absolute left-0 top-4 w-52 ${reduced ? "" : "animate-floaty"} ${cardBase} ${activeRing(0)}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Schritt 1</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <p className="font-display text-sm font-bold text-ink-900">Daten eingeben</p>
        </div>
        <div className="mt-3 space-y-1.5" aria-hidden>
          {["Name", "eVB", "FIN"].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <span className="w-9 text-[10px] font-semibold text-ink-500">{f}:</span>
              <span className="h-2 flex-1 rounded-full bg-brand-100" />
            </div>
          ))}
        </div>
      </motion.div>

      {/* Karte 2: Verifizierung */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.15 }}
        className={`absolute right-0 top-16 w-52 ${reduced ? "" : "animate-floaty-delayed"} ${cardBase} ${activeRing(1)}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Schritt 2</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-800 text-white">
            <ShieldCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-ink-900">Verifizierung</p>
            <p className="text-[10px] leading-tight text-ink-500">
              Sichere Identitätsprüfung, digital per Vollmacht
            </p>
          </div>
        </div>
      </motion.div>

      {/* Karte 3: Behörden-Prüfung */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.3 }}
        className={`absolute left-2 top-52 w-56 ${reduced ? "" : "animate-floaty"} ${cardBase} ${activeRing(2)}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Schritt 3</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BadgeCheck className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="font-display text-sm font-bold text-ink-900">Behörden-Prüfung</p>
            <p className="text-[10px] leading-tight text-ink-500">
              Automatische Bearbeitung im i-Kfz-Verfahren
            </p>
          </div>
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-brand-100 bg-brand-50 py-3"
          aria-hidden
        >
          <Loader2
            className={`h-5 w-5 text-brand-600 ${reduced ? "" : "animate-spin-slow"}`}
          />
          <span className="text-xs font-semibold text-brand-700">Prüfung läuft …</span>
        </div>
      </motion.div>

      {/* Karte 4: Fertig */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: reduced ? 0 : 0.45 }}
        className={`absolute bottom-0 right-0 w-52 ${reduced ? "" : "animate-floaty-delayed"} ${cardBase} ${activeRing(3)}`}
      >
        <p className="text-[10px] font-bold uppercase tracking-widest text-brand-600">Schritt 4</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <BadgeCheck className="h-4 w-4" aria-hidden />
          </span>
          <p className="font-display text-sm font-bold text-ink-900">Fertig!</p>
        </div>
        <div className="mt-3 space-y-1.5" aria-hidden>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Abgeschlossen
          </span>
          <br />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-semibold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            Bereit zum Fahren
          </span>
        </div>
      </motion.div>
    </div>
  );
}
