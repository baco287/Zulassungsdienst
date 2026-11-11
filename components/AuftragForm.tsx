"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Truck,
} from "lucide-react";
import { sortedServices, getService } from "@/lib/services";
import {
  calculateOrderPrice,
  centsToEuro,
  euro,
  leistungsPreis,
  P,
  PRICE_CONFIG,
} from "@/lib/pricing";
import { dauerKurz, ZEIT } from "@/lib/betrieb";
import { site, whatsAppLink } from "@/lib/site";
import {
  buildMessage,
  followUpWhatsAppLink,
  mailtoLink,
  submitOrder,
  type SubmitResult,
} from "@/lib/order";
import { serviceIcon } from "@/lib/serviceIcons";
import { istHauptleistung, vorgaenge } from "@/lib/vorgaenge";
import type { OrderRequest } from "@/lib/types";
import { track } from "@/lib/analytics";
import DocumentUpload from "./DocumentUpload";
import PaymentMethods from "./checkout/PaymentMethods";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Auftrags-Assistent.
 *
 * Vier Schritte: Service wählen → Ihre Angaben → Unterlagen → Auftrag abschließen.
 * Beim Absenden geht die Anfrage samt Anhängen an info@deutschezulassung.de
 * (siehe lib/order.ts und public/api/auftrag.php – beides unverändert). Danach
 * führen wir in den WhatsApp-Chat weiter, mit einer Referenznummer, die Chat
 * und Posteingang verbindet.
 *
 * Zusatzleistungen (Kennzeichenschilder, Wunschkennzeichen) werden als Zeilen
 * an die Anmerkung angehängt – so kommen sie ohne Änderung am Server im
 * Posteingang an. Preise stammen ausschließlich aus config/preise.json.
 *
 * Schlägt die Zustellung fehl, erscheinen die Direktkanäle (vorbefülltes
 * WhatsApp bzw. mailto:), damit niemand im Nichts landet.
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

interface Extras {
  schilder: boolean;
  wunschkennzeichen: boolean;
}

const stepLabels = ["Service wählen", "Ihre Angaben", "Unterlagen", "Abschließen"] as const;
const LAST = stepLabels.length - 1;

type ErrorKey = keyof OrderRequest | "contact" | "dateien";
type Errors = Partial<Record<ErrorKey, string>>;

function validateStep(step: number, v: OrderRequest): Errors {
  const e: Errors = {};
  if (step === 0 && !v.serviceSlug) {
    e.serviceSlug = "Bitte wählen Sie eine Leistung aus.";
  }
  if (step === 1) {
    if (v.name.trim().length < 3) e.name = "Bitte geben Sie Ihren Vor- und Nachnamen an.";

    const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim());
    const hasPhone = v.phone.replace(/\D/g, "").length >= 6;
    if (v.email.trim() !== "" && !hasEmail) {
      e.email = "Diese E-Mail-Adresse sieht nicht gültig aus. Beispiel: name@beispiel.de";
    }
    // Ein Kontaktweg genügt: Wer über WhatsApp kommt, hat oft keine E-Mail
    // zur Hand – zwei Pflichtfelder kosten hier unnötig Abschlüsse.
    if (!hasEmail && !hasPhone && !e.email) {
      e.contact = "Bitte hinterlassen Sie eine E-Mail-Adresse oder eine Telefonnummer.";
    }
    if (!/^\d{5}$/.test(v.zip.trim())) e.zip = "Bitte eine Postleitzahl mit 5 Ziffern angeben.";
    if (v.city.trim().length < 2) e.city = "Bitte Ihren Wohnort angeben.";
  }
  if (step === LAST && !v.consent) {
    e.consent = "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.";
  }
  return e;
}

/** Schritt, in dem ein vom Server gemeldetes Feld steht (für Fehler nach dem Absenden). */
const FIELD_STEP: Record<string, number> = {
  service: 0,
  serviceSlug: 0,
  name: 1,
  email: 1,
  phone: 1,
  contact: 1,
  zip: 1,
  city: 1,
  dateien: 2,
  consent: 3,
};

/** Feld, das bei einem Fehler den Fokus erhält. */
const FOCUS_ID: Partial<Record<ErrorKey, string>> = {
  name: "name",
  email: "email",
  contact: "email",
  phone: "phone",
  zip: "zip",
  city: "city",
  consent: "consent",
};
const ERROR_ORDER: ErrorKey[] = ["serviceSlug", "name", "email", "contact", "phone", "zip", "city", "consent"];

const serviceLabels: Record<string, string> = Object.fromEntries(
  sortedServices.map((s) => [s.slug, s.shortName ?? s.name])
);

/** Hängt gewählte Zusatzleistungen als Klartext an die Anmerkung an. */
function mitExtras(v: OrderRequest, extras: Extras): OrderRequest {
  const cfg = leistungsPreis(v.serviceSlug);
  const zeilen: string[] = [];
  if (cfg?.schilderMoeglich) {
    zeilen.push(
      extras.schilder
        ? `Kennzeichenschilder: mitbestellen (${P.kennzeichen})`
        : "Kennzeichenschilder: nicht mitbestellen"
    );
  }
  if (cfg?.wunschkennzeichenMoeglich && extras.wunschkennzeichen) {
    zeilen.push(`Wunschkennzeichen-Service: ja (${P.wunschkennzeichen})`);
  }
  if (zeilen.length === 0) return v;
  return { ...v, message: [v.message.trim(), ...zeilen].filter(Boolean).join("\n") };
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-danger" role="alert">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {message}
    </p>
  );
}

function StepHeading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <h2 tabIndex={-1} className="font-display text-2xl font-extrabold text-navy outline-none">
        {title}
      </h2>
      {children && <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{children}</p>}
    </>
  );
}

export default function AuftragForm({ children }: { children?: ReactNode }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [values, setValues] = useState<OrderRequest>(initial);
  const [extras, setExtras] = useState<Extras>({ schilder: false, wunschkennzeichen: false });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);

  const stepContainerRef = useRef<HTMLDivElement>(null);
  const stepChanged = useRef(false);
  const startedAt = useRef(0);
  // Analyse: Start, Schritt und Abschluss anonym zählen (lib/analytics.ts).
  const tracking = useRef({ started: false, submitted: false, abandoned: false, step: 0 });

  function markStarted(slug?: string) {
    if (!tracking.current.started) {
      tracking.current.started = true;
      track("order_start", { service: slug });
    }
  }

  useEffect(() => {
    tracking.current.step = step;
  }, [step]);

  // Abbruch: Seite wird tatsächlich verlassen (Navigation, Tab schließen),
  // nachdem der Assistent begonnen wurde. Bewusst nicht "visibilitychange":
  // Das feuert auch beim Öffnen der Kamera für den Upload und bei App-Wechseln.
  useEffect(() => {
    const onLeave = () => {
      const t = tracking.current;
      if (t.started && !t.submitted && !t.abandoned) {
        t.abandoned = true;
        track("order_abandon", { step: t.step + 1 });
      }
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

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
      markStarted(slug);
      track("service_selected", { service: slug, position: "deeplink" });
    }
  }, []);

  const service = getService(values.serviceSlug);
  const cfg = leistungsPreis(values.serviceSlug);
  const price = useMemo(
    () =>
      cfg
        ? calculateOrderPrice(
            {
              leistung: values.serviceSlug,
              schilder: extras.schilder ? "lieferung" : "behalten",
              wunschkennzeichen: extras.wunschkennzeichen,
            },
            serviceLabels
          )
        : null,
    [cfg, values.serviceSlug, extras]
  );
  const sendValues = useMemo(() => mitExtras(values, extras), [values, extras]);
  const messageText = useMemo(
    () => buildMessage(sendValues, result?.reference),
    [sendValues, result?.reference]
  );

  function set<K extends keyof OrderRequest>(key: K, value: OrderRequest[K]) {
    if (key === "serviceSlug" && typeof value === "string") {
      markStarted(value);
      track("service_selected", { service: value, position: "formular" });
      // Zusatzleistungen gehören zur gewählten Leistung – beim Wechsel zurücksetzen.
      setExtras({ schilder: false, wunschkennzeichen: false });
    }
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined, contact: undefined }));
  }

  /** Zeigt Fehler an und setzt den Fokus auf das erste betroffene Feld. */
  function showErrors(e: Errors) {
    setErrors(e);
    const first = ERROR_ORDER.find((k) => e[k]);
    if (!first) return;
    requestAnimationFrame(() => {
      const el =
        first === "serviceSlug"
          ? stepContainerRef.current?.querySelector<HTMLElement>('[role="radio"]')
          : document.getElementById(FOCUS_ID[first] ?? "");
      el?.focus();
    });
  }

  function goTo(target: number, dir: number) {
    stepChanged.current = true;
    setDirection(dir);
    setErrors({});
    setStep(target);
  }

  function next() {
    const e = validateStep(step, values);
    if (Object.keys(e).length > 0) {
      showErrors(e);
      return;
    }
    markStarted(values.serviceSlug);
    track("order_step", { step: Math.min(step + 2, 4), service: values.serviceSlug });
    goTo(Math.min(step + 1, LAST), 1);
  }

  function back() {
    goTo(Math.max(step - 1, 0), -1);
  }

  async function send() {
    const e = validateStep(LAST, values);
    if (Object.keys(e).length > 0) {
      showErrors(e);
      return;
    }
    setErrors({});

    setSending(true);
    const outcome = await submitOrder({
      kind: "auftrag",
      values: sendValues,
      files,
      startedAt: startedAt.current,
    });
    setSending(false);
    setResult(outcome);

    if (!outcome.ok && outcome.field) {
      const feld = outcome.field === "service" ? "serviceSlug" : outcome.field;
      const zielSchritt = FIELD_STEP[outcome.field];
      if (zielSchritt !== undefined && zielSchritt !== step) {
        stepChanged.current = true;
        setStep(zielSchritt);
      }
      setErrors({ [feld as ErrorKey]: outcome.error });
    }
    if (outcome.ok) {
      stepChanged.current = true;
      tracking.current.submitted = true;
      track("order_submitted", {
        service: values.serviceSlug,
        method: files.length ? "formular_mit_upload" : "formular",
      });
      if (values.audience === "gewerblich") {
        track("b2b_inquiry", { method: "formular", service: values.serviceSlug });
      }
    }
  }

  /**
   * Schrittwechsel: keyed Remount mit Einblend-Animation.
   * (Bewusst ohne AnimatePresence-Exit – zuverlässig in jedem Renderer.)
   */
  const slide = reduced
    ? {}
    : {
        initial: { opacity: 0, x: 24 * direction },
        animate: { opacity: 1, x: 0 },
        transition: { duration: 0.22, ease: [0.21, 0.65, 0.36, 1] as const },
      };

  const hauptleistungen = vorgaenge
    .map((v) => ({ v, s: getService(v.slug) }))
    .filter((x): x is { v: (typeof vorgaenge)[number]; s: NonNullable<ReturnType<typeof getService>> } => Boolean(x.s));
  const weitereLeistungen = sortedServices.filter(
    (s) => s.category !== "service" && !istHauptleistung(s.slug)
  );

  /* ── Optionale Zusatzleistungen – in Schritt 1 und noch einmal vor dem Absenden,
     damit sie auch sieht, wer per Direktlink in Schritt 2 eingestiegen ist ── */
  const extrasBlock =
    cfg?.schilderMoeglich || cfg?.wunschkennzeichenMoeglich ? (
          <fieldset className="mt-7">
            <legend className="font-display text-base font-bold text-navy">
              Optional dazubuchen
            </legend>
            <div className="mt-3 grid gap-3">
              {cfg?.schilderMoeglich && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-colors duration-150 hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input
                    type="checkbox"
                    checked={extras.schilder}
                    onChange={(e) => setExtras((x) => ({ ...x, schilder: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-display text-[15px] font-bold text-navy">Kennzeichenschilder mitbestellen</span>
                      <span className="text-[15px] font-bold tabular-nums text-navy">+ {P.kennzeichen}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-ink-600">
                      {PRICE_CONFIG.zusatzleistungen.kennzeichenschilder.bezeichnung.replace(/^Kennzeichenschilder \(|\)$/g, "")}.
                      Lieferung per Post, meist in {ZEIT.kennzeichenDativ}. Nicht nötig, wenn Sie Ihr Kennzeichen behalten oder die Schilder selbst prägen lassen.
                    </span>
                  </span>
                </label>
              )}
              {cfg?.wunschkennzeichenMoeglich && (
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-white p-4 transition-colors duration-150 hover:border-brand-300 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input
                    type="checkbox"
                    checked={extras.wunschkennzeichen}
                    onChange={(e) => setExtras((x) => ({ ...x, wunschkennzeichen: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="font-display text-[15px] font-bold text-navy">Wunschkennzeichen-Service</span>
                      <span className="text-[15px] font-bold tabular-nums text-navy">+ {P.wunschkennzeichen}</span>
                    </span>
                    <span className="mt-0.5 block text-sm leading-snug text-ink-600">
                      Prüfung, Reservierung und Zuteilung – die amtliche Gebühr ist enthalten. Ihre Wunschkombination nennen Sie uns unter „Anmerkungen“ oder im Chat.
                    </span>
                  </span>
                </label>
              )}
            </div>
          </fieldset>

    ) : null;

  /* ── Preiszusammenfassung (Seitenleiste ab Desktop, im Fluss auf dem Handy) ── */
  const summary = (
    <section aria-label="Ihre Zusammenfassung" className="rounded-[18px] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
      <h3 className="font-display text-lg font-extrabold text-navy">Ihre Zusammenfassung</h3>

      {!service ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          Wählen Sie eine Leistung – hier sehen Sie sofort, was sie kostet und was enthalten ist.
        </p>
      ) : price ? (
        <div aria-live="polite">
          <ul className="mt-3 divide-y divide-line text-[15px]">
            {price.items.map((item) => (
              <li key={item.key} className="flex items-start justify-between gap-4 py-2.5 text-ink-800">
                <span>{item.label}</span>
                <span className="shrink-0 font-semibold tabular-nums">{centsToEuro(item.cents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-navy pt-3">
            <span className="font-display text-base font-bold text-navy">Gesamtbetrag</span>
            <span className="font-display text-2xl font-extrabold tabular-nums text-navy">
              {centsToEuro(price.totalCents)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" strokeWidth={3} aria-hidden />
              inkl. 19 % MwSt.{cfg?.enthaeltAmtlicheGebuehren ? " und amtlicher Gebühren" : ""}
            </li>
            <li className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" strokeWidth={3} aria-hidden />
              {cfg?.enthaeltVersand ? "Versand der Dokumente enthalten" : "digital, kein Versand nötig"}
            </li>
            {dauerKurz(values.serviceSlug) && (
              <li className="flex items-start gap-2">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                Bearbeitung: {dauerKurz(values.serviceSlug)}
              </li>
            )}
            {cfg?.schilderMoeglich && extras.schilder && (
              <li className="flex items-start gap-2">
                <Truck className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                Kennzeichenschilder per Post: meist {ZEIT.kennzeichen}
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div aria-live="polite">
          <p className="mt-3 flex items-start justify-between gap-4 text-[15px] text-ink-800">
            <span>{service.name}</span>
            <span className="shrink-0 font-semibold">
              {service.price.serviceFee !== null && service.slug === "wunschkennzeichen"
                ? `+ ${euro(service.price.serviceFee)}`
                : "auf Anfrage"}
            </span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            {service.slug === "wunschkennzeichen"
              ? "Zusatz zu einer Zulassung, amtliche Gebühr enthalten."
              : "Für diese Leistung nennen wir Ihnen den Festpreis mit unserer Bestätigung."}
          </p>
        </div>
      )}

      <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-500">
        Verbindlich wird der Preis mit unserer Festpreis-Bestätigung. Vertragspartner:{" "}
        {site.company.legalName}, handelnd unter {site.name}.
      </p>
    </section>
  );

  // ── Erfolg: Anfrage ist im Posteingang, Kunde wechselt in den Chat ────────
  if (result?.ok && result.reference) {
    return (
      <motion.div
        {...(reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } })}
        ref={stepContainerRef}
        className="card mx-auto max-w-2xl p-6 text-center sm:p-10"
      >
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent-100">
          <CheckCircle2 className="h-9 w-9 text-accent-600" aria-hidden />
        </span>
        <h2 tabIndex={-1} className="mt-5 font-display text-2xl font-extrabold text-navy outline-none sm:text-3xl">
          Ihre Anfrage ist eingegangen
        </h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-ink-700">
          Wir haben Ihre Anfrage erhalten und melden uns innerhalb unserer
          Servicezeiten ({site.contact.hours}) mit der verbindlichen
          Festpreis-Bestätigung. Erst danach starten wir.
        </p>

        <p className="mx-auto mt-6 inline-flex flex-col items-center rounded-2xl border border-line bg-ink-50 px-7 py-3.5">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-500">Ihre Referenz</span>
          <span className="font-display text-xl font-extrabold tracking-wide text-navy">{result.reference}</span>
        </p>

        {files.length > 0 ? (
          <p className="mt-4 text-sm font-medium text-accent-700">
            {files.length} {files.length === 1 ? "Unterlage wurde" : "Unterlagen wurden"} mitgesendet.
          </p>
        ) : (
          <p className="mt-4 text-sm text-ink-600">
            Ihre Unterlagen können Sie uns direkt im Chat schicken – einfach abfotografieren.
          </p>
        )}

        <ol className="mx-auto mt-7 max-w-md space-y-3 text-left text-[15px] text-ink-700">
          {[
            "Wir prüfen Ihre Angaben und senden Ihnen die Festpreis-Bestätigung.",
            cfg && values.serviceSlug !== "abmeldung"
              ? "Für die Vollmacht bestätigen Sie einmalig digital Ihre Identität – den Link erhalten Sie von uns."
              : "Fehlt noch etwas, melden wir uns bei Ihnen.",
            "Wir reichen den Antrag bei der zuständigen Behörde ein und halten Sie auf dem Laufenden.",
          ].map((text, i) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy font-display text-xs font-bold text-white" aria-hidden>
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>

        <a
          href={followUpWhatsAppLink(result.reference, service?.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-wa btn-lg btn-block mt-8"
        >
          <WhatsAppIcon className="h-5 w-5" />
          Im WhatsApp-Chat fortsetzen
        </a>
        <p className="mt-3 text-sm text-ink-600">
          Lieber per E-Mail? Schreiben Sie uns mit Ihrer Referenz an{" "}
          <a href={`mailto:${site.contact.email}`} className="font-semibold text-brand-700 underline underline-offset-2">
            {site.contact.email}
          </a>
          .
        </p>
      </motion.div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:items-start">
      <div className="card p-5 sm:p-8">
        {/* Fortschrittsanzeige */}
        <ol className="mb-8 flex items-start" aria-label="Fortschritt">
          {stepLabels.map((label, i) => {
            const done = i < step;
            const current = i === step;
            const dot = (
              <span
                className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold transition-colors duration-200 ${
                  done
                    ? "bg-accent-500 text-navy"
                    : current
                      ? "bg-brand-600 text-white shadow-[0_0_0_4px_rgb(37_99_235/0.16)]"
                      : "border-2 border-ink-300 bg-white text-ink-600"
                }`}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
            );
            return (
              <li
                key={label}
                className="relative flex flex-1 flex-col items-center gap-2 text-center"
                aria-current={current ? "step" : undefined}
              >
                {i > 0 && (
                  <span
                    className={`absolute right-1/2 top-[1.0625rem] h-0.5 w-full ${done || current ? "bg-accent-500" : "bg-ink-200"}`}
                    aria-hidden
                  />
                )}
                {done ? (
                  <button
                    type="button"
                    onClick={() => goTo(i, -1)}
                    disabled={sending}
                    className="relative z-10 cursor-pointer rounded-full"
                    aria-label={`Zurück zu Schritt ${i + 1}: ${label}`}
                  >
                    {dot}
                  </button>
                ) : (
                  dot
                )}
                <span
                  className={`px-1 text-[13px] leading-tight sm:text-sm ${
                    current ? "font-bold text-brand-700" : "font-medium text-ink-600"
                  }`}
                >
                  <span className="sr-only">Schritt {i + 1} von {stepLabels.length}: </span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        <motion.div key={step} {...slide} ref={stepContainerRef}>
          {/* ── Schritt 1: Service wählen ── */}
          {step === 0 && (
            <div>
              <StepHeading title="Welche Zulassung möchten Sie beauftragen?">
                Wählen Sie die gewünschte Leistung für Ihr Fahrzeug.
              </StepHeading>

              <div
                role="radiogroup"
                aria-label="Leistung wählen"
                aria-describedby={errors.serviceSlug ? "err-serviceSlug" : undefined}
                className="mt-5 grid gap-3 min-[30rem]:grid-cols-2"
              >
                {hauptleistungen.map(({ v, s }) => {
                  const selected = values.serviceSlug === s.slug;
                  const Icon = serviceIcon(s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("serviceSlug", s.slug)}
                      className={`relative flex min-h-[5.75rem] cursor-pointer items-start gap-3 rounded-2xl border p-4 text-left transition-all duration-150 ${
                        selected
                          ? "border-brand-600 bg-brand-50 shadow-[inset_0_0_0_1px_var(--color-brand-600)]"
                          : "border-line bg-white hover:border-brand-300 hover:shadow-[var(--shadow-card)]"
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-7 w-7 shrink-0 ${selected ? "text-brand-700" : "text-accent-600"}`}
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block pr-7 font-display text-base font-bold text-navy">{v.label}</span>
                        <span className="mt-0.5 block text-sm leading-snug text-ink-600">{v.description}</span>
                        <span className="mt-2 inline-block rounded-full bg-brand-100 px-2.5 py-0.5 text-sm font-bold tabular-nums text-brand-800">
                          {s.price.serviceFee !== null ? euro(s.price.serviceFee) : "auf Anfrage"}
                        </span>
                      </span>
                      {selected && (
                        <span
                          className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white"
                          aria-hidden
                        >
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}

                {weitereLeistungen.length > 0 && (
                  <p className="mt-3 text-sm font-semibold text-ink-700 min-[30rem]:col-span-2">Weitere Leistungen</p>
                )}
                {weitereLeistungen.map((s) => {
                  const selected = values.serviceSlug === s.slug;
                  const Icon = serviceIcon(s.slug);
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => set("serviceSlug", s.slug)}
                      className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-[14px] border px-4 py-2.5 text-left transition-colors duration-150 ${
                        selected
                          ? "border-brand-600 bg-brand-50 shadow-[inset_0_0_0_1px_var(--color-brand-600)]"
                          : "border-line bg-white hover:border-brand-300"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0 text-ink-600" strokeWidth={1.75} aria-hidden />
                      <span className="flex-1 font-display text-[15px] font-bold text-navy">{s.shortName ?? s.name}</span>
                      <span className="shrink-0 text-sm text-ink-600">
                        {s.price.serviceFee !== null && s.slug === "wunschkennzeichen"
                          ? `+ ${euro(s.price.serviceFee)}`
                          : "auf Anfrage"}
                      </span>
                    </button>
                  );
                })}
              </div>
              <FieldError id="err-serviceSlug" message={errors.serviceSlug} />

              {extrasBlock}

              <div className="mt-6 lg:hidden">{service && summary}</div>
            </div>
          )}

          {/* ── Schritt 2: Ihre Angaben ── */}
          {step === 1 && (
            <div>
              <StepHeading title="Ihre Angaben">
                {service ? `${service.name}: ` : ""}Damit wir Ihnen die Festpreis-Bestätigung senden können. Felder mit * sind Pflichtfelder.
              </StepHeading>

              <fieldset className="mt-6">
                <legend className="field-label">Sie sind …</legend>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["privat", "Privatkunde"],
                      ["gewerblich", "Autohaus / Gewerbe"],
                    ] as const
                  ).map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex min-h-[3.25rem] cursor-pointer items-center justify-center rounded-[14px] border px-3 text-center text-[15px] font-bold transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
                        values.audience === value
                          ? "border-brand-600 bg-brand-50 text-brand-800 shadow-[inset_0_0_0_1px_var(--color-brand-600)]"
                          : "border-[#8493a8] bg-white text-ink-800 hover:border-ink-600"
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

              <div className="mt-5">
                <label htmlFor="name" className="field-label">
                  Vor- und Nachname *
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "err-name" : undefined}
                  className="field"
                  placeholder="Max Mustermann"
                />
                <FieldError id="err-name" message={errors.name} />
              </div>

              <fieldset className="mt-5">
                <legend className="field-label">Wie erreichen wir Sie? *</legend>
                <p id="hint-contact" className="-mt-0.5 mb-3 text-sm text-ink-600">
                  E-Mail oder Telefon – eines von beidem genügt.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className="field-label">
                      E-Mail-Adresse
                    </label>
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={values.email}
                      onChange={(e) => set("email", e.target.value)}
                      aria-invalid={!!errors.email || !!errors.contact}
                      aria-describedby={
                        ["hint-contact", errors.email && "err-email", errors.contact && "err-contact"]
                          .filter(Boolean)
                          .join(" ")
                      }
                      className="field"
                      placeholder="name@beispiel.de"
                    />
                    <FieldError id="err-email" message={errors.email} />
                  </div>
                  <div>
                    <label htmlFor="phone" className="field-label">
                      Telefon / WhatsApp
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={values.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      aria-invalid={!!errors.phone || !!errors.contact}
                      aria-describedby={
                        ["hint-contact", errors.phone && "err-phone", errors.contact && "err-contact"]
                          .filter(Boolean)
                          .join(" ")
                      }
                      className="field"
                      placeholder="0151 23456789"
                    />
                    <FieldError id="err-phone" message={errors.phone} />
                  </div>
                </div>
                <FieldError id="err-contact" message={errors.contact} />
              </fieldset>

              <div className="mt-5 grid grid-cols-[7.5rem_1fr] gap-3 sm:gap-4">
                <div>
                  <label htmlFor="zip" className="field-label">
                    PLZ *
                  </label>
                  <input
                    id="zip"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={5}
                    required
                    value={values.zip}
                    onChange={(e) => set("zip", e.target.value)}
                    aria-invalid={!!errors.zip}
                    aria-describedby={["hint-ort", errors.zip && "err-zip"].filter(Boolean).join(" ")}
                    className="field"
                    placeholder="10115"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="field-label">
                    Wohnort *
                  </label>
                  <input
                    id="city"
                    type="text"
                    autoComplete="address-level2"
                    required
                    value={values.city}
                    onChange={(e) => set("city", e.target.value)}
                    aria-invalid={!!errors.city}
                    aria-describedby={["hint-ort", errors.city && "err-city"].filter(Boolean).join(" ")}
                    className="field"
                    placeholder="Berlin"
                  />
                </div>
              </div>
              <p id="hint-ort" className="field-hint">
                Ihr Wohnort bestimmt, welche Zulassungsbehörde zuständig ist.
              </p>
              <FieldError id="err-zip" message={errors.zip} />
              <FieldError id="err-city" message={errors.city} />

              <div className="mt-5">
                <label htmlFor="vehicle" className="field-label">
                  Fahrzeug <span className="font-normal text-ink-600">(optional)</span>
                </label>
                <input
                  id="vehicle"
                  type="text"
                  value={values.vehicle}
                  onChange={(e) => set("vehicle", e.target.value)}
                  className="field"
                  placeholder="z. B. VW Golf, Kennzeichen B-AB 1234"
                />
                <p className="field-hint">Marke und Modell, falls vorhanden auch das Kennzeichen.</p>
              </div>

              <div className="mt-5">
                <label htmlFor="message" className="field-label">
                  Anmerkungen <span className="font-normal text-ink-600">(optional)</span>
                </label>
                <textarea
                  id="message"
                  rows={3}
                  value={values.message}
                  onChange={(e) => set("message", e.target.value)}
                  className="field"
                  placeholder={
                    extras.wunschkennzeichen
                      ? "Ihre Wunschkombination, z. B. B-MX 2024, und weitere Hinweise"
                      : "Besonderheiten oder Fragen zu Ihrem Vorgang"
                  }
                />
              </div>
            </div>
          )}

          {/* ── Schritt 3: Unterlagen ── */}
          {step === 2 && (
            <div>
              <StepHeading title="Unterlagen hochladen">
                Laden Sie Ihre Unterlagen jetzt hoch – oder reichen Sie sie später bequem per
                WhatsApp nach. Beides ist möglich, der Schritt ist freiwillig.
              </StepHeading>

              <div className="mt-6">
                <DocumentUpload
                  files={files}
                  onChange={setFiles}
                  checklist={service?.checklist}
                  serverError={errors.dateien}
                  label="Fotos oder PDF Ihrer Unterlagen"
                />
              </div>

              <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-ink-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                Ihre Dateien werden verschlüsselt übertragen und nur für die Bearbeitung Ihres Auftrags
                verwendet.{" "}
                <Link href="/datensicherheit/" className="font-semibold text-brand-700 underline underline-offset-2">
                  Mehr zur Datensicherheit
                </Link>
              </p>
            </div>
          )}

          {/* ── Schritt 4: Prüfen und absenden ── */}
          {step === LAST && (
            <div>
              <StepHeading title="Auftrag abschließen">
                Bitte prüfen Sie Ihre Angaben. Mit dem Absenden entstehen noch keine Kosten.
              </StepHeading>

              <dl className="mt-6 divide-y divide-line rounded-2xl border border-line">
                {(
                  [
                    {
                      titel: "Leistung",
                      schritt: 0,
                      inhalt: (
                        <>
                          {service?.name}
                          {cfg?.schilderMoeglich && extras.schilder && <span className="block text-ink-600">+ Kennzeichenschilder</span>}
                          {cfg?.wunschkennzeichenMoeglich && extras.wunschkennzeichen && (
                            <span className="block text-ink-600">+ Wunschkennzeichen-Service</span>
                          )}
                        </>
                      ),
                    },
                    {
                      titel: "Ihre Angaben",
                      schritt: 1,
                      inhalt: (
                        <>
                          {values.name}
                          <span className="block text-ink-600">
                            {[values.email, values.phone].filter(Boolean).join(" · ")}
                          </span>
                          <span className="block text-ink-600">
                            {values.zip} {values.city}
                            {values.vehicle ? ` · ${values.vehicle}` : ""}
                          </span>
                        </>
                      ),
                    },
                    {
                      titel: "Unterlagen",
                      schritt: 2,
                      inhalt:
                        files.length > 0
                          ? `${files.length} ${files.length === 1 ? "Datei" : "Dateien"} werden mitgesendet`
                          : "Noch keine – Sie können sie später per WhatsApp nachreichen",
                    },
                  ] as const
                ).map((zeile) => (
                  <div key={zeile.titel} className="flex items-start justify-between gap-4 px-4 py-3.5 sm:px-5">
                    <div className="min-w-0">
                      <dt className="text-xs font-bold uppercase tracking-wider text-ink-500">{zeile.titel}</dt>
                      <dd className="mt-1 break-words text-[15px] font-semibold text-navy">{zeile.inhalt}</dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => goTo(zeile.schritt, -1)}
                      disabled={sending}
                      className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      aria-label={`${zeile.titel} ändern`}
                    >
                      <Pencil className="h-4 w-4" aria-hidden />
                      Ändern
                    </button>
                  </div>
                ))}
              </dl>

              {extrasBlock}

              <div className="mt-5 lg:hidden">{summary}</div>

              <div className="mt-5">
                <PaymentMethods />
              </div>

              <label
                htmlFor="consent"
                className={`mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border p-4 text-[15px] leading-relaxed text-ink-800 ${
                  errors.consent ? "border-danger bg-[#fef3f2]" : "border-line bg-white"
                }`}
              >
                <input
                  id="consent"
                  type="checkbox"
                  checked={values.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "err-consent" : undefined}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-brand-600"
                />
                <span>
                  Ich willige ein, dass meine Angaben und die übermittelten Unterlagen zur
                  Bearbeitung meiner Anfrage verarbeitet werden. Details in der{" "}
                  <Link href="/datenschutz/" className="font-semibold text-brand-700 underline underline-offset-2">
                    Datenschutzerklärung
                  </Link>
                  . Widerruf jederzeit möglich. *
                </span>
              </label>
              <FieldError id="err-consent" message={errors.consent} />

              <button type="button" onClick={send} disabled={sending} className="btn btn-primary btn-lg btn-block mt-6">
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

              <p className="mt-3 flex items-start justify-center gap-2 text-center text-sm leading-relaxed text-ink-600">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
                <span>
                  Sichere Datenübermittlung und persönliche Prüfung Ihrer Unterlagen. Der Auftrag
                  entsteht erst, wenn Sie unsere Festpreis-Bestätigung annehmen – bezahlt wird erst danach.
                </span>
              </p>
              <p className="mt-2 text-center text-xs leading-relaxed text-ink-500">
                Informationen zu Ihrem{" "}
                <Link href="/widerruf/" className="font-semibold text-brand-700 underline underline-offset-2">
                  Widerrufsrecht
                </Link>
                . Vertragspartner: {site.company.legalName}, handelnd unter {site.name}.
              </p>

              {/* Zustellung fehlgeschlagen → Direktkanäle als Rückfallebene */}
              {result && !result.ok && result.fallback && (
                <div className="mt-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4" role="alert">
                  <p className="flex items-start gap-2 text-[15px] font-semibold text-amber-900">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                    {result.error} Senden Sie uns Ihre Anfrage bitte direkt:
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={whatsAppLink(messageText)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-wa flex-1"
                    >
                      <WhatsAppIcon className="h-5 w-5" />
                      Per WhatsApp senden
                    </a>
                    <a href={mailtoLink(sendValues)} className="btn btn-secondary flex-1">
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
                    className="btn btn-ghost btn-sm btn-block mt-3"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                    {copied
                      ? `Kopiert! Senden Sie die Nachricht an ${site.contact.email}`
                      : "Falls sich nichts öffnet: Nachricht kopieren"}
                  </button>
                  {files.length > 0 && (
                    <p className="mt-3 text-sm text-amber-900">
                      Ihre {files.length} {files.length === 1 ? "Datei" : "Dateien"} konnten so nicht
                      übertragen werden – bitte hängen Sie sie im Chat oder in der E-Mail direkt an.
                    </p>
                  )}
                </div>
              )}

              {/* Korrigierbarer Fehler ohne Feldbezug */}
              {result && !result.ok && !result.fallback && !result.field && (
                <p className="mt-4 flex items-start gap-2 text-sm font-medium text-danger" role="alert">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {result.error}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between gap-3 border-t border-line pt-5">
          {step > 0 ? (
            <button type="button" onClick={back} disabled={sending} className="btn btn-ghost btn-sm">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Zurück
            </button>
          ) : (
            <span />
          )}
          {step < LAST && (
            <button type="button" onClick={next} className="btn btn-primary min-w-[9.5rem]">
              {step === 2 && files.length === 0 ? "Ohne Upload weiter" : "Weiter"}
              <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
          )}
        </div>
      </div>

      {/* Seitenleiste: Zusammenfassung bleibt beim Ausfüllen sichtbar */}
      <aside className="grid gap-5 lg:sticky lg:top-24">
        <div className="hidden lg:block">{summary}</div>
        {children}
      </aside>
    </div>
  );
}
