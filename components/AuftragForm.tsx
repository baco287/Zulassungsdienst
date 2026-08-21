"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { sortedServices, getService } from "@/lib/services";
import { euro, plateFee } from "@/lib/pricing";
import { site, whatsAppLink } from "@/lib/site";
import {
  buildMessage,
  followUpWhatsAppLink,
  mailtoLink,
  submitOrder,
  type SubmitResult,
} from "@/lib/order";
import type { OrderRequest } from "@/lib/types";
import DocumentUpload from "./DocumentUpload";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Auftrags-Assistent.
 *
 * Vier Schritte: Leistung → Details → Kontakt → Unterlagen & Absenden.
 * Beim Absenden geht die Anfrage samt Anhängen an info@deutschezulassung.de
 * (siehe lib/order.ts). Danach führen wir in den WhatsApp-Chat weiter, damit
 * der Hauptkanal erhalten bleibt – nur eben mit einer Referenznummer, die
 * Chat und Posteingang verbindet.
 *
 * Schlägt die Zustellung fehl, erscheinen die bisherigen Direktkanäle
 * (vorbefülltes WhatsApp bzw. mailto:), damit niemand im Nichts landet.
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

const stepLabels = ["Leistung", "Details", "Kontakt", "Unterlagen"] as const;

type Errors = Partial<Record<keyof OrderRequest | "contact" | "dateien", string>>;

function validateStep(step: number, v: OrderRequest): Errors {
  const e: Errors = {};
  if (step === 0 && !v.serviceSlug) {
    e.serviceSlug = "Bitte wählen Sie eine Leistung aus.";
  }
  if (step === 1) {
    if (!/^\d{5}$/.test(v.zip.trim())) e.zip = "Bitte eine gültige Postleitzahl (5 Ziffern) angeben.";
    if (v.city.trim().length < 2) e.city = "Bitte Ihren Ort angeben.";
  }
  if (step === 2) {
    if (v.name.trim().length < 3) e.name = "Bitte Ihren vollständigen Namen angeben.";

    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim());
    const hasPhone = v.phone.replace(/\D/g, "").length >= 6;

    if (v.email.trim() !== "" && !hasEmail) {
      e.email = "Diese E-Mail-Adresse sieht nicht gültig aus.";
    }
    // Ein Kontaktweg genügt: Wer über WhatsApp kommt, hat oft keine E-Mail
    // zur Hand – zwei Pflichtfelder kosten hier unnötig Abschlüsse.
    if (!hasEmail && !hasPhone) {
      e.contact = "Bitte hinterlassen Sie eine E-Mail-Adresse oder eine Telefonnummer.";
    }
  }
  if (step === 3 && !v.consent) {
    e.consent = "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.";
  }
  return e;
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border-2 px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-colors duration-200 focus:border-brand-500 outline-none ${
    hasError ? "border-red-400 bg-red-50" : "border-ink-200 bg-white"
  }`;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}

export default function AuftragForm() {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [values, setValues] = useState<OrderRequest>(initial);
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const stepChanged = useRef(false);
  const startedAt = useRef(0);

  // Zeitpunkt des Formularaufrufs – der Endpoint verwirft Einsendungen,
  // die schneller als drei Sekunden zurückkommen (Bot-Erkennung).
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Barrierefreiheit: nach Schrittwechsel Fokus auf die neue Überschrift setzen,
  // damit Screenreader den Kontextwechsel mitbekommen.
  useEffect(() => {
    if (stepChanged.current) {
      stepContainerRef.current?.querySelector("h2")?.focus();
    }
  }, [step, result]);

  // Vorauswahl über ?leistung=slug → direkt zu Schritt 2.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("leistung");
    if (slug && getService(slug)) {
      setValues((v) => ({ ...v, serviceSlug: slug }));
      setStep(1);
    }
  }, []);

  const service = getService(values.serviceSlug);
  const messageText = useMemo(
    () => buildMessage(values, result?.reference),
    [values, result?.reference]
  );

  function set<K extends keyof OrderRequest>(key: K, value: OrderRequest[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, contact: undefined }));
  }

  function next() {
    const e = validateStep(step, values);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      stepChanged.current = true;
      setDirection(1);
      setStep((s) => Math.min(s + 1, 3));
    }
  }

  function back() {
    stepChanged.current = true;
    setDirection(-1);
    setErrors({});
    setStep((s) => Math.max(s - 1, 0));
  }

  async function send() {
    const e = validateStep(3, values);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSending(true);
    const outcome = await submitOrder({
      kind: "auftrag",
      values,
      files,
      startedAt: startedAt.current,
    });
    setSending(false);
    setResult(outcome);

    if (!outcome.ok && outcome.field) {
      setErrors({ [outcome.field as keyof Errors]: outcome.error });
    }
    if (outcome.ok) {
      stepChanged.current = true;
    }
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

  // ── Erfolg: Anfrage ist im Posteingang, Kunde wechselt in den Chat ────────
  if (result?.ok && result.reference) {
    return (
      <motion.div
        {...(reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } })}
        ref={stepContainerRef}
        className="text-center"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
        </span>
        <h2 tabIndex={-1} className="mt-5 font-display text-2xl font-bold text-ink-900 outline-none">
          Ihre Anfrage ist eingegangen
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-600">
          Wir haben Ihre Anfrage erhalten und melden uns mit der verbindlichen
          Festpreis-Bestätigung – in der Regel noch am selben Werktag
          ({site.contact.hours}).
        </p>

        <p className="mx-auto mt-5 inline-flex flex-col items-center rounded-xl border border-ink-200 bg-ink-50 px-6 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Ihre Referenz
          </span>
          <span className="font-display text-xl font-bold tracking-wide text-ink-900">
            {result.reference}
          </span>
        </p>

        {files.length > 0 ? (
          <p className="mt-4 text-sm text-emerald-700">
            {files.length} {files.length === 1 ? "Unterlage" : "Unterlagen"} wurden mitgesendet.
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-600">
            Ihre Unterlagen können Sie uns direkt im Chat schicken – einfach abfotografieren.
          </p>
        )}

        <a
          href={followUpWhatsAppLink(result.reference, service?.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Im WhatsApp-Chat fortsetzen
        </a>
        <p className="mt-3 text-xs text-ink-500">
          Lieber per E-Mail? Antworten Sie einfach auf unsere Bestätigung an{" "}
          <a
            href={`mailto:${site.contact.email}`}
            className="font-medium text-brand-700 underline underline-offset-2"
          >
            {site.contact.email}
          </a>
          .
        </p>
      </motion.div>
    );
  }

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
                    ? "bg-emerald-600 text-white"
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

      <motion.div key={step} {...slide} ref={stepContainerRef}>
        {/* Schritt 1: Leistung wählen */}
        {step === 0 && (
          <div>
            <h2 tabIndex={-1} className="font-display text-xl font-bold text-ink-900 outline-none">
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
                          ? s.price.platesExtra
                            ? `${euro(s.price.serviceFee)} zzgl. Kennzeichen ${euro(plateFee)}`
                            : s.price.inclusive
                              ? `${euro(s.price.serviceFee)} inkl. MwSt. – alles inklusive`
                              : `ab ${euro(s.price.serviceFee)}`
                          : "Preis auf Anfrage"}
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
            <h2 tabIndex={-1} className="font-display text-xl font-bold text-ink-900 outline-none">
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
                  aria-describedby={errors.zip ? "err-zip" : undefined}
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
                  aria-describedby={errors.city ? "err-city" : undefined}
                  className={inputClass(!!errors.city)}
                  placeholder="Berlin"
                />
              </div>
            </div>
            <FieldError id="err-zip" message={errors.zip} />
            <FieldError id="err-city" message={errors.city} />

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
            <h2 tabIndex={-1} className="font-display text-xl font-bold text-ink-900 outline-none">
              Wie erreichen wir Sie?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              E-Mail oder Telefon genügt – eines von beidem reicht uns.
            </p>
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
                  aria-describedby={errors.name ? "err-name" : undefined}
                  className={inputClass(!!errors.name)}
                  placeholder="Max Mustermann"
                />
                <FieldError id="err-name" message={errors.name} />
              </div>
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  E-Mail-Adresse
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={values.email}
                  onChange={(e) => set("email", e.target.value)}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "err-email" : undefined}
                  className={inputClass(!!errors.email)}
                  placeholder="max@beispiel.de"
                />
                <FieldError id="err-email" message={errors.email} />
              </div>
              <div>
                <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold text-ink-800">
                  Telefon / WhatsApp
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  value={values.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? "err-phone" : undefined}
                  className={inputClass(!!errors.phone)}
                  placeholder="0151 23456789"
                />
                <FieldError id="err-phone" message={errors.phone} />
              </div>
              <FieldError id="err-contact" message={errors.contact} />
            </div>
          </div>
        )}

        {/* Schritt 4: Unterlagen, Zusammenfassung, Absenden */}
        {step === 3 && (
          <div>
            <h2 tabIndex={-1} className="font-display text-xl font-bold text-ink-900 outline-none">
              Unterlagen und Absenden
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Sie können die Unterlagen jetzt mitschicken – oder später bequem im
              WhatsApp-Chat nachreichen. Beides ist möglich.
            </p>

            <div className="mt-5">
              <DocumentUpload
                files={files}
                onChange={setFiles}
                checklist={service?.checklist}
                serverError={errors.dateien}
                label="Unterlagen jetzt mitschicken (optional)"
              />
            </div>

            <dl className="mt-6 space-y-2 rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Leistung</dt>
                <dd className="font-semibold text-ink-900">{service?.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Preis</dt>
                <dd className="text-right font-display font-bold text-brand-700">
                  {service?.price.serviceFee != null
                    ? service.price.platesExtra
                      ? `${euro(service.price.serviceFee)} inkl. MwSt., zzgl. Kennzeichenschilder ${euro(plateFee)} (Paar), falls benötigt`
                      : `${euro(service.price.serviceFee)} inkl. MwSt.${service.price.inclusive ? " – alles inklusive" : ""}`
                    : "auf Anfrage – Festpreis folgt mit der Bestätigung"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Name</dt>
                <dd className="font-medium text-ink-800">{values.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Kontakt</dt>
                <dd className="text-right font-medium text-ink-800">
                  {values.email && (
                    <>
                      {values.email}
                      <br />
                    </>
                  )}
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
                  <dd className="text-right font-medium text-ink-800">{values.vehicle}</dd>
                </div>
              )}
            </dl>

            <p className="mt-4 text-xs leading-relaxed text-ink-600">
              Mit unserer Festpreis-Bestätigung erhalten Sie die Rechnung – Sie zahlen
              bequem per Überweisung. Informationen zu Ihrem Widerrufsrecht finden Sie{" "}
              <a href="/widerruf/" className="font-medium text-brand-700 underline underline-offset-2">
                hier
              </a>
              .
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-ink-700">
              <input
                type="checkbox"
                checked={values.consent}
                onChange={(e) => set("consent", e.target.checked)}
                aria-invalid={!!errors.consent}
                aria-describedby={errors.consent ? "err-consent" : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600"
              />
              <span>
                Ich willige ein, dass meine Angaben und die übermittelten Unterlagen zur
                Bearbeitung meiner Anfrage verarbeitet werden. Details in der{" "}
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

            <button
              type="button"
              onClick={send}
              disabled={sending}
              className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-display text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-400"
            >
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                  {files.length > 0 ? "Unterlagen werden übertragen …" : "Wird gesendet …"}
                </>
              ) : (
                <>
                  Anfrage kostenlos absenden
                  <ArrowRight className="h-5 w-5" aria-hidden />
                </>
              )}
            </button>

            <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-500">
              <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              Verschlüsselte Übertragung · unverbindlich · kostenlos
            </p>
            {/* Einwand-Entkräftung direkt am Entscheidungspunkt statt nur im Kleingedruckten */}
            <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
              Der Auftrag entsteht erst, wenn Sie unsere Festpreis-Bestätigung annehmen –
              bezahlt wird erst danach.
            </p>

            {/* Zustellung fehlgeschlagen → Direktkanäle als Rückfallebene */}
            {result && !result.ok && result.fallback && (
              <div className="mt-6 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
                <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {result.error} Senden Sie uns Ihre Anfrage bitte direkt:
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <a
                    href={whatsAppLink(messageText)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    Per WhatsApp senden
                  </a>
                  <a
                    href={mailtoLink(values)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-ink-300 bg-white px-5 py-3 font-display text-sm font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
                  >
                    <Mail className="h-5 w-5" aria-hidden />
                    Per E-Mail senden
                  </a>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(messageText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 3000);
                    } catch {
                      /* Clipboard nicht verfügbar – Text lässt sich manuell markieren */
                    }
                  }}
                  className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-600 transition-colors duration-200 hover:border-brand-300 hover:text-ink-900"
                >
                  <Copy className="h-4 w-4" aria-hidden />
                  {copied
                    ? `Kopiert! Senden Sie die Nachricht an ${site.contact.email}`
                    : "Falls sich nichts öffnet: Nachricht kopieren"}
                </button>
                {files.length > 0 && (
                  <p className="mt-3 text-xs text-amber-900">
                    Ihre {files.length} {files.length === 1 ? "Datei" : "Dateien"} konnten so nicht
                    übertragen werden – bitte hängen Sie sie im Chat oder in der E-Mail direkt an.
                  </p>
                )}
              </div>
            )}

            {/* Korrigierbarer Fehler ohne Feldbezug */}
            {result && !result.ok && !result.fallback && !result.field && (
              <p className="mt-4 flex items-start gap-2 text-sm text-red-600" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {result.error}
              </p>
            )}
          </div>
        )}
      </motion.div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between border-t border-ink-100 pt-5">
        <button
          type="button"
          onClick={back}
          disabled={step === 0 || sending}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 font-display text-sm font-semibold transition-colors duration-200 ${
            step === 0 || sending
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
