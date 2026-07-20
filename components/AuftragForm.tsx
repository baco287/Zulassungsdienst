"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Mail,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { sortedServices, getService } from "@/lib/services";
import { euro } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";
import type { OrderRequest } from "@/lib/types";

/**
 * Auftrags-Assistent (Phase 1):
 * Vier Fragen-Schritte mit Fortschrittsanzeige und animierten Übergängen.
 * Am Ende wird eine strukturierte Nachricht erzeugt und über REALE Kanäle
 * versendet (vorbefülltes WhatsApp / mailto:) – kein simuliertes Backend.
 */

const initial: OrderRequest = {
  serviceSlug: "",
  audience: "privat",
  name: "",
  email: "",
  phone: "",
  zip: "",
  city: "",
  vehicle: "",
  message: "",
  consent: false,
};

const stepLabels = ["Leistung", "Details", "Kontakt", "Absenden"] as const;

type Errors = Partial<Record<keyof OrderRequest, string>>;

function validateStep(step: number, v: OrderRequest): Errors {
  const e: Errors = {};
  if (step === 0 && !v.serviceSlug) e.serviceSlug = "Bitte wählen Sie eine Leistung aus.";
  if (step === 1) {
    if (!/^\d{5}$/.test(v.zip.trim())) e.zip = "Bitte eine gültige Postleitzahl (5 Ziffern) angeben.";
    if (v.city.trim().length < 2) e.city = "Bitte Ihren Ort angeben.";
  }
  if (step === 2) {
    if (v.name.trim().length < 3) e.name = "Bitte Ihren vollständigen Namen angeben.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) e.email = "Bitte eine gültige E-Mail-Adresse angeben.";
    if (v.phone.trim().length < 6) e.phone = "Bitte eine Telefonnummer für Rückfragen angeben.";
  }
  if (step === 3 && !v.consent) e.consent = "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.";
  return e;
}

function buildMessage(v: OrderRequest): string {
  const service = getService(v.serviceSlug);
  return [
    "Neue Auftragsanfrage über easyzulassung.de",
    "",
    `Leistung: ${service?.name ?? v.serviceSlug}`,
    `Kundenart: ${v.audience === "privat" ? "Privatkunde" : "Gewerbekunde"}`,
    `Name: ${v.name}`,
    `E-Mail: ${v.email}`,
    `Telefon: ${v.phone}`,
    `PLZ/Ort: ${v.zip} ${v.city}`,
    v.vehicle ? `Fahrzeug: ${v.vehicle}` : null,
    v.message ? `Anmerkung: ${v.message}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border-2 px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-colors duration-200 focus:border-brand-500 outline-none ${
    hasError ? "border-red-400 bg-red-50" : "border-ink-200 bg-white"
  }`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
      <AlertCircle className="h-4 w-4" aria-hidden /> {message}
    </p>
  );
}

export default function AuftragForm() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [values, setValues] = useState<OrderRequest>(initial);
  const [errors, setErrors] = useState<Errors>({});

  // Vorauswahl über ?leistung=slug → direkt zu Schritt 2.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("leistung");
    if (slug && getService(slug)) {
      setValues((v) => ({ ...v, serviceSlug: slug }));
      setStep(1);
    }
  }, []);

  const service = getService(values.serviceSlug);
  const messageText = useMemo(() => buildMessage(values), [values]);

  function set<K extends keyof OrderRequest>(key: K, value: OrderRequest[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function next() {
    const e = validateStep(step, values);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setDirection(1);
      setStep((s) => Math.min(s + 1, 3));
    }
  }

  function back() {
    setDirection(-1);
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  /**
   * Schrittwechsel: keyed Remount mit Einblend-Animation.
   * (Bewusst ohne AnimatePresence-Exit – zuverlässig in jedem Renderer.)
   */
  const slide = reduced
    ? {}
    : {
        initial: { opacity: 0, x: 40 * direction },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.28, ease: [0.21, 0.65, 0.36, 1] as const },
      };

  return (
    <div>
      {/* Fortschrittsanzeige */}
      <ol className="mb-8 flex items-center gap-2" aria-label="Fortschritt">
        {stepLabels.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex flex-1 flex-col items-center gap-1.5 sm:flex-row sm:gap-2">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors duration-300 ${
                  done
                    ? "bg-emerald-500 text-white"
                    : current
                      ? "bg-brand-600 text-white shadow-[var(--shadow-glow)]"
                      : "bg-ink-100 text-ink-500"
                }`}
                aria-current={current ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
              </span>
              <span
                className={`text-xs font-semibold sm:text-sm ${current ? "text-ink-900" : "text-ink-500"}`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <span
                  className={`hidden h-0.5 flex-1 rounded-full sm:block ${done ? "bg-emerald-400" : "bg-ink-200"}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      <motion.div key={step} {...slide}>
        {/* Schritt 1: Leistung wählen */}
        {step === 0 && (
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Was möchten Sie erledigen?
            </h2>
            <div
              role="radiogroup"
              aria-label="Leistung wählen"
              className="mt-5 grid gap-3 sm:grid-cols-2"
            >
              {sortedServices
                .filter((s) => s.category !== "service")
                .map((s) => {
                  const selected = values.serviceSlug === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("serviceSlug", s.slug)}
                      className={`cursor-pointer rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        selected
                          ? "border-brand-600 bg-brand-50 shadow-[var(--shadow-glow)]"
                          : "border-ink-200 bg-white hover:border-brand-300"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-display text-sm font-bold text-ink-900">
                          {s.shortName ?? s.name}
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300"
                          }`}
                          aria-hidden
                        >
                          {selected && <Check className="h-3 w-3" />}
                        </span>
                      </span>
                      <span className="mt-1 block text-xs text-ink-500">
                        {s.price.serviceFee !== null
                          ? `ab ${euro(s.price.serviceFee)} · ${s.duration}`
                          : `Preis auf Anfrage · ${s.duration}`}
                      </span>
                    </button>
                  );
                })}
            </div>
            <FieldError id="err-serviceSlug" message={errors.serviceSlug} />
          </div>
        )}

        {/* Schritt 2: Details */}
        {step === 1 && (
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              {service ? `${service.name} – ein paar Details` : "Ein paar Details"}
            </h2>
            <fieldset className="mt-5">
              <legend className="mb-1.5 text-sm font-semibold text-ink-800">Sie sind …</legend>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["privat", "Privatkunde"],
                    ["gewerblich", "Autohaus / Gewerbe"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                      values.audience === value
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-ink-200 bg-white text-ink-600 hover:border-brand-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="audience"
                      value={value}
                      checked={values.audience === value}
                      onChange={() => set("audience", value)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-5 grid grid-cols-[7rem_1fr] gap-3">
              <div>
                <label htmlFor="zip" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  PLZ *
                </label>
                <input
                  id="zip"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  value={values.zip}
                  onChange={(e) => set("zip", e.target.value)}
                  aria-invalid={!!errors.zip}
                  className={inputClass(!!errors.zip)}
                  placeholder="10115"
                />
              </div>
              <div>
                <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  Ort *
                </label>
                <input
                  id="city"
                  type="text"
                  autoComplete="address-level2"
                  value={values.city}
                  onChange={(e) => set("city", e.target.value)}
                  aria-invalid={!!errors.city}
                  className={inputClass(!!errors.city)}
                  placeholder="Berlin"
                />
              </div>
            </div>
            <FieldError id="err-zip" message={errors.zip ?? errors.city} />

            <div className="mt-5">
              <label htmlFor="vehicle" className="mb-1.5 block text-sm font-semibold text-ink-800">
                Fahrzeug <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <input
                id="vehicle"
                type="text"
                value={values.vehicle}
                onChange={(e) => set("vehicle", e.target.value)}
                className={inputClass(false)}
                placeholder="z. B. VW Golf VIII, Erstzulassung 2022"
              />
            </div>
            <div className="mt-5">
              <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-ink-800">
                Anmerkungen <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <textarea
                id="message"
                rows={3}
                value={values.message}
                onChange={(e) => set("message", e.target.value)}
                className={inputClass(false)}
                placeholder="Besonderheiten, Wunschtermin, Wunschkennzeichen …"
              />
            </div>
          </div>
        )}

        {/* Schritt 3: Kontakt */}
        {step === 2 && (
          <div>
            <h2 className="font-display text-xl font-bold text-ink-900">
              Wie erreichen wir Sie?
            </h2>
            <div className="mt-5 space-y-5">
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  Vor- und Nachname *
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  className={inputClass(!!errors.name)}
                  placeholder="Max Mustermann"
                />
                <FieldError id="err-name" message={errors.name} />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  E-Mail-Adresse *
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  className={inputClass(!!errors.email)}
                  placeholder="max@beispiel.de"
                />
                <FieldError id="err-email" message={errors.email} />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  Telefon (für Rückfragen) *
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  aria-invalid={!!errors.phone}
                  className={inputClass(!!errors.phone)}
                  placeholder="0151 23456789"
                />
                <FieldError id="err-phone" message={errors.phone} />
              </div>
            </div>
          </div>
        )}

        {/* Schritt 4: Zusammenfassung + Absenden */}
        {step === 3 && (
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" aria-hidden />
              <h2 className="font-display text-xl font-bold text-ink-900">
                Alles beisammen – jetzt absenden
              </h2>
            </div>

            <dl className="mt-5 space-y-2 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Leistung</dt>
                <dd className="font-semibold text-ink-900">{service?.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Kundenart</dt>
                <dd className="font-medium text-ink-800">
                  {values.audience === "privat" ? "Privatkunde" : "Autohaus / Gewerbe"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Name</dt>
                <dd className="font-medium text-ink-800">{values.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Kontakt</dt>
                <dd className="text-right font-medium text-ink-800">
                  {values.email}
                  <br />
                  {values.phone}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Ort</dt>
                <dd className="font-medium text-ink-800">
                  {values.zip} {values.city}
                </dd>
              </div>
              {values.vehicle && (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-500">Fahrzeug</dt>
                  <dd className="font-medium text-ink-800">{values.vehicle}</dd>
                </div>
              )}
            </dl>

            {service && (
              <aside className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-700">
                <p className="font-semibold text-ink-900">
                  Diese Unterlagen brauchen wir von Ihnen:
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {service.checklist.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-500">
                  Noch nicht alles zur Hand? Trotzdem absenden – wir klären den Rest gemeinsam.
                </p>
              </aside>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={values.consent}
                onChange={(e) => set("consent", e.target.checked)}
                aria-invalid={!!errors.consent}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600"
              />
              <span>
                Ich willige ein, dass meine Angaben zur Bearbeitung meiner Anfrage
                verarbeitet werden. Details in der{" "}
                <a
                  href="/datenschutz/"
                  className="font-medium text-brand-700 underline underline-offset-2"
                >
                  Datenschutzerklärung
                </a>
                . Widerruf jederzeit möglich. *
              </span>
            </label>
            <FieldError id="err-consent" message={errors.consent} />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={values.consent ? whatsAppLink(messageText) : undefined}
                onClick={(e) => {
                  if (!values.consent) {
                    e.preventDefault();
                    setErrors({ consent: "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu." });
                  }
                }}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4 font-display font-semibold text-white transition-colors duration-200 ${
                  values.consent
                    ? "cursor-pointer bg-brand-600 hover:bg-brand-700"
                    : "cursor-not-allowed bg-ink-300"
                }`}
              >
                <MessageCircle className="h-5 w-5" aria-hidden />
                Per WhatsApp senden
              </a>
              <a
                href={
                  values.consent
                    ? `mailto:${site.contact.email}?subject=${encodeURIComponent(
                        `Auftragsanfrage: ${service?.name ?? "Kfz-Zulassung"}`
                      )}&body=${encodeURIComponent(messageText)}`
                    : undefined
                }
                onClick={(e) => {
                  if (!values.consent) {
                    e.preventDefault();
                    setErrors({ consent: "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu." });
                  }
                }}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-6 py-4 font-display font-semibold transition-colors duration-200 ${
                  values.consent
                    ? "cursor-pointer border-ink-300 bg-white text-ink-800 hover:border-brand-400 hover:bg-brand-50"
                    : "cursor-not-allowed border-ink-200 bg-ink-50 text-ink-400"
                }`}
              >
                <Mail className="h-5 w-5" aria-hidden />
                Per E-Mail senden
              </a>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-ink-500">
              <ShieldCheck className="h-4 w-4 text-brand-600" aria-hidden />
              Öffnet Ihre App mit fertiger Nachricht – Sie behalten die volle Kontrolle.
            </p>
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-5">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-colors duration-200 ${
            step === 0
              ? "cursor-not-allowed text-ink-300"
              : "cursor-pointer text-ink-700 hover:bg-ink-100"
          }`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Zurück
        </button>
        {step < 3 && (
          <button
            type="button"
            onClick={next}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-7 py-3 font-display text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-700"
          >
            Weiter
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
