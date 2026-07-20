"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { sortedServices, getService } from "@/lib/services";
import { site, whatsAppLink } from "@/lib/site";
import type { OrderRequest } from "@/lib/types";

/**
 * Online-Auftrag, Phase 1:
 * Das Formular validiert die Angaben und erzeugt daraus eine strukturierte
 * Nachricht, die über zwei REALE Kanäle versendet wird — vorbefüllte
 * WhatsApp-Nachricht oder vorbefüllte E-Mail. Es wird nichts simuliert;
 * ein Server-Backend folgt in Phase 2 (siehe lib/integrations/README.md).
 */

type Errors = Partial<Record<keyof OrderRequest, string>>;

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

function validate(values: OrderRequest): Errors {
  const errors: Errors = {};
  if (!values.serviceSlug) errors.serviceSlug = "Bitte wählen Sie eine Leistung aus.";
  if (values.name.trim().length < 3) errors.name = "Bitte geben Sie Ihren vollständigen Namen an.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email))
    errors.email = "Bitte geben Sie eine gültige E-Mail-Adresse an.";
  if (values.phone.trim().length < 6)
    errors.phone = "Bitte geben Sie eine Telefonnummer für Rückfragen an.";
  if (!/^\d{5}$/.test(values.zip.trim()))
    errors.zip = "Bitte geben Sie eine gültige Postleitzahl (5 Ziffern) an.";
  if (values.city.trim().length < 2) errors.city = "Bitte geben Sie Ihren Ort an.";
  if (!values.consent)
    errors.consent = "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.";
  return errors;
}

function buildMessage(values: OrderRequest): string {
  const service = getService(values.serviceSlug);
  return [
    `Neue Auftragsanfrage über easyzulassung.de`,
    ``,
    `Leistung: ${service?.name ?? values.serviceSlug}`,
    `Kundenart: ${values.audience === "privat" ? "Privatkunde" : "Gewerbekunde"}`,
    `Name: ${values.name}`,
    `E-Mail: ${values.email}`,
    `Telefon: ${values.phone}`,
    `PLZ/Ort: ${values.zip} ${values.city}`,
    values.vehicle ? `Fahrzeug: ${values.vehicle}` : null,
    values.message ? `Anmerkung: ${values.message}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

const inputClass = (hasError: boolean) =>
  `w-full rounded-xl border px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-colors duration-200 focus:border-brand-500 ${
    hasError ? "border-red-400 bg-red-50" : "border-ink-300 bg-white"
  }`;

export default function AuftragForm() {
  const [values, setValues] = useState<OrderRequest>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  // Vorauswahl der Leistung über ?leistung=slug (z. B. von Detailseiten aus).
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("leistung");
    if (slug && getService(slug)) {
      setValues((v) => ({ ...v, serviceSlug: slug }));
    }
  }, []);

  const service = getService(values.serviceSlug);
  const messageText = useMemo(() => buildMessage(values), [values]);

  function set<K extends keyof OrderRequest>(key: K, value: OrderRequest[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-brand-700" aria-hidden />
          <h2 className="font-display text-xl font-bold text-ink-900">
            Fast geschafft – jetzt absenden
          </h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-700">
          Ihre Anfrage ist vorbereitet. Wählen Sie, wie Sie sie an uns senden möchten –
          beide Wege öffnen Ihre gewohnte App mit der fertigen Nachricht:
        </p>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-ink-200 bg-white p-4 text-xs text-ink-700">
          {messageText}
        </pre>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a
            href={whatsAppLink(messageText)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-6 py-4 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
          >
            <MessageCircle className="h-5 w-5" aria-hidden />
            Per WhatsApp senden
          </a>
          <a
            href={`mailto:${site.contact.email}?subject=${encodeURIComponent(
              `Auftragsanfrage: ${service?.name ?? "Kfz-Zulassung"}`
            )}&body=${encodeURIComponent(messageText)}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-ink-300 bg-white px-6 py-4 font-display font-semibold text-ink-800 transition-colors duration-200 hover:border-brand-400 hover:bg-brand-50"
          >
            <Mail className="h-5 w-5" aria-hidden />
            Per E-Mail senden
          </a>
        </div>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 cursor-pointer text-sm font-medium text-ink-600 underline-offset-2 hover:underline"
        >
          Angaben noch einmal bearbeiten
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {/* Leistung */}
      <div>
        <label htmlFor="serviceSlug" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Gewünschte Leistung *
        </label>
        <select
          id="serviceSlug"
          value={values.serviceSlug}
          onChange={(e) => set("serviceSlug", e.target.value)}
          aria-invalid={!!errors.serviceSlug}
          aria-describedby={errors.serviceSlug ? "err-serviceSlug" : undefined}
          className={inputClass(!!errors.serviceSlug)}
        >
          <option value="">Bitte wählen …</option>
          {sortedServices.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.name}
            </option>
          ))}
        </select>
        {errors.serviceSlug && (
          <p id="err-serviceSlug" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" aria-hidden /> {errors.serviceSlug}
          </p>
        )}
      </div>

      {/* Kundenart */}
      <fieldset>
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
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors duration-200 ${
                values.audience === value
                  ? "border-brand-600 bg-brand-50 text-brand-800"
                  : "border-ink-300 bg-white text-ink-600 hover:border-ink-400"
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

      {/* Kontaktdaten */}
      <div className="grid gap-5 sm:grid-cols-2">
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
          {errors.name && (
            <p id="err-name" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" aria-hidden /> {errors.name}
            </p>
          )}
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
            aria-describedby={errors.email ? "err-email" : undefined}
            className={inputClass(!!errors.email)}
            placeholder="max@beispiel.de"
          />
          {errors.email && (
            <p id="err-email" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" aria-hidden /> {errors.email}
            </p>
          )}
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
            aria-describedby={errors.phone ? "err-phone" : undefined}
            className={inputClass(!!errors.phone)}
            placeholder="0151 23456789"
          />
          {errors.phone && (
            <p id="err-phone" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" aria-hidden /> {errors.phone}
            </p>
          )}
        </div>
        <div className="grid grid-cols-[7rem_1fr] gap-3">
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
          {(errors.zip || errors.city) && (
            <p
              id={errors.zip ? "err-zip" : "err-city"}
              className="col-span-2 -mt-1 flex items-center gap-1 text-sm text-red-600"
            >
              <AlertCircle className="h-4 w-4" aria-hidden /> {errors.zip ?? errors.city}
            </p>
          )}
        </div>
      </div>

      {/* Fahrzeug & Nachricht */}
      <div>
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
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-semibold text-ink-800">
          Ihre Nachricht <span className="font-normal text-ink-500">(optional)</span>
        </label>
        <textarea
          id="message"
          rows={4}
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          className={inputClass(false)}
          placeholder="Besonderheiten, Wunschtermin, Wunschkennzeichen …"
        />
      </div>

      {/* Checkliste-Hinweis */}
      {service && (
        <aside className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">
            Diese Unterlagen benötigen wir für „{service.name}“:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {service.checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            Noch nicht alles zur Hand? Kein Problem – senden Sie die Anfrage trotzdem ab,
            wir klären den Rest gemeinsam.
          </p>
        </aside>
      )}

      {/* DSGVO-Einwilligung */}
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-700">
          <input
            type="checkbox"
            checked={values.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-invalid={!!errors.consent}
            aria-describedby={errors.consent ? "err-consent" : undefined}
            className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-700"
          />
          <span>
            Ich willige ein, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet
            werden. Details in der{" "}
            <a href="/datenschutz/" className="font-medium text-brand-700 underline underline-offset-2">
              Datenschutzerklärung
            </a>
            . Die Einwilligung kann ich jederzeit widerrufen. *
          </span>
        </label>
        {errors.consent && (
          <p id="err-consent" className="mt-1.5 flex items-center gap-1 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" aria-hidden /> {errors.consent}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-brand-700 px-8 py-4 font-display text-base font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-brand-800"
        >
          Anfrage prüfen & absenden
        </button>
        <p className="flex items-center gap-2 text-xs text-ink-500">
          <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden />
          Verschlüsselte Übertragung · keine Weitergabe an Dritte
        </p>
      </div>
    </form>
  );
}
