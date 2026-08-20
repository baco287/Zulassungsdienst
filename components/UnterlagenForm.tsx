"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, UploadCloud } from "lucide-react";
import { site } from "@/lib/site";
import { followUpWhatsAppLink, submitOrder, type SubmitResult } from "@/lib/order";
import type { OrderRequest } from "@/lib/types";
import DocumentUpload from "./DocumentUpload";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Nachreichen von Unterlagen zu einem bestehenden Vorgang.
 *
 * Aufruf wahlweise direkt oder über einen Link mit Referenz, den das Team
 * im Chat verschickt: /unterlagen/?ref=DZ-20260820-A7F3
 * Die Referenz landet im Betreff der E-Mail an info@deutschezulassung.de,
 * sodass die Dateien ohne Rückfrage dem richtigen Vorgang zugeordnet sind.
 */

const empty: OrderRequest = {
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

export default function UnterlagenForm() {
  const reduced = useReducedMotion();
  const [values, setValues] = useState<OrderRequest>(empty);
  const [reference, setReference] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ field?: string; message?: string }>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
    const ref = new URLSearchParams(window.location.search).get("ref");
    // Referenzformat aus auftrag.php: DZ-JJJJMMTT-XXXX
    if (ref && /^DZ-\d{8}-[A-Z0-9]{4}$/i.test(ref)) {
      setReference(ref.toUpperCase());
    }
  }, []);

  async function send() {
    setError(null);
    setFieldError({});

    if (values.name.trim().length < 3) {
      setFieldError({ field: "name", message: "Bitte geben Sie Ihren Namen an." });
      return;
    }
    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim());
    const hasPhone = values.phone.replace(/\D/g, "").length >= 6;
    if (!hasEmail && !hasPhone) {
      setFieldError({
        field: "contact",
        message: "Bitte hinterlassen Sie eine E-Mail-Adresse oder eine Telefonnummer.",
      });
      return;
    }
    if (files.length === 0) {
      setFieldError({ field: "dateien", message: "Bitte wählen Sie mindestens eine Datei aus." });
      return;
    }
    if (!values.consent) {
      setFieldError({
        field: "consent",
        message: "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.",
      });
      return;
    }

    setSending(true);
    const outcome = await submitOrder({
      kind: "unterlagen",
      values,
      files,
      startedAt: startedAt.current,
      reference: reference || undefined,
    });
    setSending(false);
    setResult(outcome);

    if (!outcome.ok) {
      if (outcome.field) {
        setFieldError({ field: outcome.field, message: outcome.error });
      } else {
        setError(outcome.error ?? "Die Übertragung ist fehlgeschlagen.");
      }
    }
  }

  const inputClass = (hasError: boolean) =>
    `w-full rounded-xl border-2 px-4 py-3 text-base text-ink-900 placeholder:text-ink-400 transition-colors duration-200 focus:border-brand-500 outline-none ${
      hasError ? "border-red-400 bg-red-50" : "border-ink-200 bg-white"
    }`;

  if (result?.ok) {
    return (
      <motion.div
        {...(reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } })}
        className="text-center"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden />
        </span>
        <h2 className="mt-5 font-display text-2xl font-bold text-ink-900">
          Unterlagen angekommen
        </h2>
        <p className="mx-auto mt-3 max-w-md text-ink-600">
          Wir haben {files.length} {files.length === 1 ? "Datei" : "Dateien"} erhalten und prüfen
          sie auf Vollständigkeit. Sollte etwas fehlen, melden wir uns bei Ihnen.
        </p>
        {result.reference && (
          <p className="mx-auto mt-5 inline-flex flex-col items-center rounded-xl border border-ink-200 bg-ink-50 px-6 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
              Referenz
            </span>
            <span className="font-display text-xl font-bold tracking-wide text-ink-900">
              {result.reference}
            </span>
          </p>
        )}
        <a
          href={followUpWhatsAppLink(result.reference ?? reference)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-display font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Zurück in den WhatsApp-Chat
        </a>
      </motion.div>
    );
  }

  return (
    <div>
      {reference ? (
        <p className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3">
          <span className="text-sm text-ink-700">Ihr Vorgang</span>
          <span className="font-display font-bold tracking-wide text-ink-900">{reference}</span>
        </p>
      ) : (
        <div className="mb-6">
          <label htmlFor="ref" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Referenznummer <span className="font-normal text-ink-500">(falls vorhanden)</span>
          </label>
          <input
            id="ref"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
            className={inputClass(false)}
            placeholder="DZ-20260820-A7F3"
          />
          <p className="mt-1.5 text-xs text-ink-500">
            Steht in unserer Bestätigung. Ohne Referenz ordnen wir die Unterlagen
            anhand Ihres Namens zu.
          </p>
        </div>
      )}

      <div className="space-y-5">
        <div>
          <label htmlFor="u-name" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Vor- und Nachname *
          </label>
          <input
            id="u-name"
            type="text"
            autoComplete="name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className={inputClass(fieldError.field === "name")}
            placeholder="Max Mustermann"
          />
          {fieldError.field === "name" && (
            <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {fieldError.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="u-email" className="mb-1.5 block text-sm font-semibold text-ink-800">
              E-Mail
            </label>
            <input
              id="u-email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              className={inputClass(fieldError.field === "email")}
              placeholder="max@beispiel.de"
            />
          </div>
          <div>
            <label htmlFor="u-phone" className="mb-1.5 block text-sm font-semibold text-ink-800">
              Telefon / WhatsApp
            </label>
            <input
              id="u-phone"
              type="tel"
              autoComplete="tel"
              value={values.phone}
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              className={inputClass(fieldError.field === "phone")}
              placeholder="0151 23456789"
            />
          </div>
        </div>
        {fieldError.field === "contact" && (
          <p className="flex items-center gap-1 text-sm text-red-600" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {fieldError.message}
          </p>
        )}

        <div>
          <label htmlFor="u-message" className="mb-1.5 block text-sm font-semibold text-ink-800">
            Anmerkung <span className="font-normal text-ink-500">(optional)</span>
          </label>
          <textarea
            id="u-message"
            rows={2}
            value={values.message}
            onChange={(e) => setValues((v) => ({ ...v, message: e.target.value }))}
            className={inputClass(false)}
            placeholder="z. B. „Rückseite reiche ich morgen nach“"
          />
        </div>
      </div>

      <div className="mt-7">
        <DocumentUpload
          files={files}
          onChange={setFiles}
          serverError={fieldError.field === "dateien" ? fieldError.message : undefined}
          label="Fotos oder PDF auswählen"
        />
      </div>

      <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm text-ink-700">
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(e) => setValues((v) => ({ ...v, consent: e.target.checked }))}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-ink-300 accent-brand-600"
        />
        <span>
          Ich willige ein, dass die übermittelten Unterlagen zur Bearbeitung meines
          Vorgangs verarbeitet werden. Details in der{" "}
          <a href="/datenschutz/" className="font-medium text-brand-700 underline underline-offset-2">
            Datenschutzerklärung
          </a>
          . *
        </span>
      </label>
      {fieldError.field === "consent" && (
        <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden /> {fieldError.message}
        </p>
      )}

      <button
        type="button"
        onClick={send}
        disabled={sending}
        className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-4 font-display text-base font-semibold text-white transition-colors duration-200 hover:bg-brand-700 disabled:cursor-wait disabled:bg-brand-400"
      >
        {sending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Unterlagen werden übertragen …
          </>
        ) : (
          <>
            <UploadCloud className="h-5 w-5" aria-hidden />
            Unterlagen senden
          </>
        )}
      </button>

      <p className="mt-3 flex items-center justify-center gap-2 text-xs text-ink-500">
        <ShieldCheck className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        Verschlüsselte Übertragung · Dateien werden nicht auf dem Webserver gespeichert
      </p>

      {error && (
        <div className="mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
          <p className="flex items-start gap-2 text-sm font-semibold text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Bitte schicken Sie uns die Unterlagen stattdessen direkt per WhatsApp oder an{" "}
            <a
              href={`mailto:${site.contact.email}`}
              className="font-semibold underline underline-offset-2"
            >
              {site.contact.email}
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
