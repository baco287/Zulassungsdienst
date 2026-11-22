"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ChevronDown, CircleCheck, Copy, FileText, Loader2, Lock, Mail, Search } from "lucide-react";
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
import { istHauptleistung, vorgaenge } from "@/lib/vorgaenge";
import type { OrderRequest } from "@/lib/types";
import { track } from "@/lib/analytics";
import DocumentUpload from "./DocumentUpload";
import Haken from "./ui/Haken";
import SchildErledigt from "./ui/SchildErledigt";
import PaymentMethods from "./checkout/PaymentMethods";
import WhatsAppIcon from "./WhatsAppIcon";

/**
 * Auftrags-Assistent.
 *
 * Vier Schritte: Service wählen → Ihre Angaben → Unterlagen → Auftrag abschließen.
 * Beim Absenden geht die Anfrage samt Anhängen an unser Postfach (site.contact.email)
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

/**
 * Eingaben bleiben im offenen Browser-Tab erhalten (sessionStorage), damit niemand
 * alles verliert, wenn das Handy beim Wechsel zur Kamera die Seite neu lädt.
 * Gespeichert wird nur im Browser des Kunden – ohne Dateien und ohne Einwilligung –
 * und nach erfolgreichem Absenden gelöscht. Schließen des Tabs löscht ebenfalls.
 */
const ENTWURF_KEY = "kzp:auftrag:v1";
interface Entwurf {
  values: Omit<OrderRequest, "consent">;
  extras: Extras;
  step: number;
}
function leseEntwurf(): Entwurf | null {
  try {
    const raw = sessionStorage.getItem(ENTWURF_KEY);
    return raw ? (JSON.parse(raw) as Entwurf) : null;
  } catch {
    return null;
  }
}
function schreibeEntwurf(e: Entwurf | null) {
  try {
    if (e) sessionStorage.setItem(ENTWURF_KEY, JSON.stringify(e));
    else sessionStorage.removeItem(ENTWURF_KEY);
  } catch {
    /* Speicher gesperrt (Privatmodus) – dann eben ohne Zwischenspeichern */
  }
}
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
      <h2 tabIndex={-1} className="text-2xl font-bold text-navy focus:outline-none focus-visible:outline-none">
        {title}
      </h2>
      {children && <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{children}</p>}
    </>
  );
}

export default function AuftragForm({ children }: { children?: ReactNode }) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  /** 0 = erster Aufruf (keine Einblendung), 1 = vor, -1 = zurück. */
  const [direction, setDirection] = useState(0);
  const [values, setValues] = useState<OrderRequest>(initial);
  const [extras, setExtras] = useState<Extras>({ schilder: false, wunschkennzeichen: false });
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [mehrOffen, setMehrOffen] = useState(false);
  /** true, sobald ein gespeicherter Entwurf gelesen wurde – vorher nichts überschreiben. */
  const [geladen, setGeladen] = useState(false);

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

  // Gespeicherten Entwurf aus diesem Tab übernehmen; Vorauswahl über ?leistung=slug
  // hat Vorrang und führt direkt zu Schritt 2.
  useEffect(() => {
    const entwurf = leseEntwurf();
    const slug = new URLSearchParams(window.location.search).get("leistung");
    const deeplink = slug && getService(slug) ? slug : null;
    if (entwurf) {
      const gleicheLeistung = !deeplink || deeplink === entwurf.values.serviceSlug;
      setValues((v) => ({ ...v, ...entwurf.values, serviceSlug: deeplink ?? entwurf.values.serviceSlug }));
      if (gleicheLeistung) setExtras(entwurf.extras);
      setStep(deeplink && !gleicheLeistung ? 1 : Math.min(Math.max(entwurf.step, deeplink ? 1 : 0), LAST));
      if (!istHauptleistung(entwurf.values.serviceSlug) && entwurf.values.serviceSlug) setMehrOffen(true);
    } else if (deeplink) {
      setValues((v) => ({ ...v, serviceSlug: deeplink }));
      setStep(1);
    }
    if (deeplink) {
      if (!istHauptleistung(deeplink)) setMehrOffen(true);
      markStarted(deeplink);
      track("service_selected", { service: deeplink, position: "deeplink" });
    }
    setGeladen(true);
  }, []);

  useEffect(() => {
    if (!geladen || result?.ok) return;
    const { consent: _consent, ...rest } = values;
    void _consent;
    const leer = !rest.serviceSlug && !rest.name && !rest.email && !rest.phone && !rest.zip && !rest.city;
    schreibeEntwurf(leer ? null : { values: rest, extras, step });
  }, [geladen, values, extras, step, result?.ok]);

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
      track("order_step_error", { step: step + 1, fields: Object.keys(e).join(","), service: values.serviceSlug });
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

  /** Radiogruppe: Pfeiltasten wechseln Auswahl und Fokus, Tab springt aus der Gruppe. */
  function onRadioKey(e: KeyboardEvent<HTMLDivElement>) {
    const delta = ({ ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 } as Record<string, number>)[e.key];
    if (!delta) return;
    e.preventDefault();
    const radios = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    if (radios.length === 0) return;
    const aktuell = radios.findIndex((r) => r === document.activeElement);
    const ziel = radios[(Math.max(aktuell, 0) + delta + radios.length) % radios.length];
    const slug = ziel.dataset.slug;
    if (slug) set("serviceSlug", slug);
    ziel.focus();
  }

  async function send() {
    track("order_submit_attempt", { step: LAST + 1, service: values.serviceSlug });
    const e = validateStep(LAST, values);
    if (Object.keys(e).length > 0) {
      track("order_error", { step: LAST + 1, reason: "validierung", fields: Object.keys(e).join(",") });
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

    if (!outcome.ok) {
      track("order_error", {
        step: LAST + 1,
        reason: outcome.reason ?? "server",
        fields: outcome.field ?? "",
        service: values.serviceSlug,
      });
    }
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
      schreibeEntwurf(null);
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
   *
   * Beim ersten Aufruf und bei „Bewegung reduzieren“ steht der Schritt sofort da
   * (initial: false). Früher bekam die Server-Ausgabe opacity: 0, und bei
   * reduzierter Bewegung blendete der Browser den ersten Schritt nie ein – das
   * Formular blieb leer.
   */
  const slide = {
    initial: reduced || direction === 0 ? (false as const) : { opacity: 0, x: 24 * direction },
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
            <legend className="text-base font-semibold text-navy">
              Optional dazubuchen
            </legend>
            <div className="mt-3 grid gap-3">
              {cfg?.schilderMoeglich && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-300 bg-white p-4 transition-colors duration-150 hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-canvas">
                  <input
                    type="checkbox"
                    checked={extras.schilder}
                    onChange={(e) => setExtras((x) => ({ ...x, schilder: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[15px] font-semibold text-navy">Kennzeichenschilder mitbestellen</span>
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
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-300 bg-white p-4 transition-colors duration-150 hover:border-navy has-[:checked]:border-navy has-[:checked]:bg-canvas">
                  <input
                    type="checkbox"
                    checked={extras.wunschkennzeichen}
                    onChange={(e) => setExtras((x) => ({ ...x, wunschkennzeichen: e.target.checked }))}
                    className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span className="text-[15px] font-semibold text-navy">Wunschkennzeichen-Service</span>
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
    <section aria-label="Ihre Zusammenfassung" className="tafel py-5 pl-[2.75rem] pr-5">
      <h3 className="text-lg font-bold text-navy">Ihre Zusammenfassung</h3>

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
            <span className="font-display text-2xl font-bold tabular-nums text-navy">
              {centsToEuro(price.totalCents)}
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-[0.9375rem] text-ink-700">
            <li className="flex items-baseline gap-2.5">
              <Haken className="h-[0.6875rem] w-[0.9375rem] translate-y-px" />
              inkl. 19 % MwSt.{cfg?.enthaeltAmtlicheGebuehren ? " und amtlicher Gebühren" : ""}
            </li>
            <li className="flex items-baseline gap-2.5">
              <Haken className="h-[0.6875rem] w-[0.9375rem] translate-y-px" />
              {cfg?.enthaeltVersand ? "Versand der Dokumente enthalten" : "digital, kein Versand nötig"}
            </li>
            {dauerKurz(values.serviceSlug) && (
              <li className="pl-[1.5625rem]">Bearbeitung: {dauerKurz(values.serviceSlug)}</li>
            )}
            {cfg?.schilderMoeglich && extras.schilder && (
              <li className="pl-[1.5625rem]">Kennzeichenschilder per Post: meist {ZEIT.kennzeichen}</li>
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

      <p className="mt-4 border-t border-line pt-3 text-sm leading-relaxed text-ink-600">
        Verbindlich wird der Preis mit unserer Festpreis-Bestätigung.
      </p>
    </section>
  );

  // ── Erfolg: Anfrage ist im Posteingang, Kunde wechselt in den Chat ────────
  if (result?.ok && result.reference) {
    return (
      <motion.div
        {...(reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } })}
        ref={stepContainerRef}
        className="mx-auto max-w-[60rem] rounded-[1.25rem] border-2 border-navy bg-white px-4 pb-8 pt-6 text-center shadow-[0_30px_60px_-40px_rgb(4_24_63_/_0.45)] sm:px-12 sm:pb-11 sm:pt-7"
      >
        <SchildErledigt className="mx-auto h-auto w-[10.5rem] sm:w-[13rem]" />
        <h2
          tabIndex={-1}
          className="h-abschnitt mt-4 text-navy focus:outline-none focus-visible:outline-none sm:text-[2.75rem]"
        >
          Ihre Anfrage ist eingegangen
        </h2>
        <p className="mx-auto mt-4 max-w-[50rem] text-[1.0625rem] leading-relaxed text-ink-600 sm:text-[1.1875rem]">
          Wir haben Ihre Anfrage erhalten und melden uns innerhalb unserer Servicezeiten{" "}
          <span className="whitespace-nowrap">({site.contact.hours})</span> mit der verbindlichen Festpreis-Bestätigung. Erst danach starten wir
          mit der Bearbeitung.
        </p>

        <div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-line bg-canvas px-4 py-3.5 text-left sm:gap-5 sm:px-8 sm:py-4">
          <FileText className="h-8 w-8 shrink-0 text-brand-600 sm:h-10 sm:w-10" strokeWidth={1.6} aria-hidden />
          <span className="flex flex-col">
            <span className="text-[0.9375rem] text-ink-600">Ihre Referenz</span>
            <span className="whitespace-nowrap font-display text-lg font-bold tracking-wide text-navy sm:text-[1.75rem]" translate="no">
              {result.reference}
            </span>
          </span>
        </div>
        {files.length > 0 && (
          <p className="mt-3 text-[0.9375rem] font-medium text-ink-600">
            {files.length} {files.length === 1 ? "Unterlage wurde" : "Unterlagen wurden"} mitgesendet.
          </p>
        )}

        <ol className="mx-auto mt-8 max-w-[49.5rem] text-left">
          {[
            { Icon: Search, titel: "Wir prüfen Ihre Angaben.", text: "Wir prüfen Ihre Unterlagen und Angaben auf Vollständigkeit." },
            { Icon: Mail, titel: "Sie erhalten die Festpreis-Bestätigung.", text: "Sie bekommen unsere verbindliche Festpreis-Bestätigung mit allen Details." },
            { Icon: CircleCheck, titel: "Wir reichen den Antrag ein.", text: "Wir reichen den Antrag bei der zuständigen Behörde ein und halten Sie auf dem Laufenden." },
          ].map(({ Icon, titel, text }, i, alle) => (
            <li key={titel} className="flex gap-4 sm:gap-5">
              <span className="flex flex-col items-center" aria-hidden>
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-wa-50 text-navy sm:h-[3.25rem] sm:w-[3.25rem]">
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </span>
                {i < alle.length - 1 && <span className="my-1 w-0.5 flex-1 rounded-full bg-ink-200" />}
              </span>
              <span className={`pt-1.5 ${i < alle.length - 1 ? "pb-5" : ""}`}>
                <span className="block text-[1.0625rem] font-bold text-navy sm:text-lg">
                  {i + 1}. {titel}
                </span>
                <span className="mt-0.5 block text-[0.9375rem] leading-relaxed text-ink-600 sm:text-base">{text}</span>
              </span>
            </li>
          ))}
        </ol>

        <a
          href={followUpWhatsAppLink(result.reference, service?.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-wa btn-lg mt-8 w-full max-w-[30.5rem] gap-2 px-4 text-[0.9375rem] sm:gap-2.5 sm:px-7 sm:text-lg"
        >
          <WhatsAppIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          Im WhatsApp-Chat fortsetzen
        </a>
        <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-600 sm:text-base">
          Oder per E-Mail? Schreiben Sie uns mit Ihrer Referenz an{" "}
          <a href={`mailto:${site.contact.email}`} className="link whitespace-nowrap">
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
        {/* Fortschrittsanzeige: vier Spalten mit Linie oben, wie der Ablauf auf der Startseite */}
        <ol className="mb-8 grid grid-cols-4 gap-2 sm:gap-4" aria-label="Fortschritt">
          {stepLabels.map((label, i) => {
            const done = i < step;
            const current = i === step;
            const inhalt = (
              <>
                <span className={`block font-display text-base font-bold tabular-nums ${done || current ? "text-navy" : "text-ink-500"}`} aria-hidden>
                  {i + 1}
                </span>
                <span
                  className={`mt-0.5 block text-[13px] leading-tight sm:text-sm ${
                    current ? "font-semibold text-navy" : done ? "font-medium text-navy" : "font-medium text-ink-600"
                  }`}
                >
                  <span className="sr-only">Schritt {i + 1} von {stepLabels.length}: </span>
                  {label}
                  {done && <span className="sr-only"> (erledigt)</span>}
                </span>
              </>
            );
            return (
              <li
                key={label}
                className={`border-t-[3px] pt-2 ${done || current ? "border-brand-600" : "border-ink-200"}`}
                aria-current={current ? "step" : undefined}
              >
                {done ? (
                  <button
                    type="button"
                    onClick={() => goTo(i, -1)}
                    disabled={sending}
                    className="-mx-1 block min-h-11 w-[calc(100%+0.5rem)] cursor-pointer rounded px-1 text-left decoration-2 underline-offset-4 hover:underline"
                    aria-label={`Zurück zu Schritt ${i + 1}: ${label}`}
                  >
                    {inhalt}
                  </button>
                ) : (
                  inhalt
                )}
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
                aria-required="true"
                aria-invalid={!!errors.serviceSlug}
                aria-describedby={errors.serviceSlug ? "err-serviceSlug" : undefined}
                onKeyDown={onRadioKey}
                className="mt-5"
              >
                <div className="tafel">
                  {hauptleistungen.map(({ v, s }, idx) => {
                    const selected = values.serviceSlug === s.slug;
                    const fokussierbar = selected || (!values.serviceSlug && idx === 0);
                    return (
                      <button
                        key={s.slug}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        data-slug={s.slug}
                        tabIndex={fokussierbar ? 0 : -1}
                        onClick={() => set("serviceSlug", s.slug)}
                        className="auswahl-zeile"
                      >
                        <span className="auswahl-punkt" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-4">
                            <span className="text-[1.0625rem] font-semibold text-navy">{v.label}</span>
                            <span className="shrink-0 text-[1.0625rem] font-semibold tabular-nums text-navy">
                              {s.price.serviceFee !== null ? euro(s.price.serviceFee) : "auf Anfrage"}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[0.9375rem] leading-snug text-ink-600">{v.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {weitereLeistungen.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMehrOffen((o) => !o)}
                    aria-expanded={mehrOffen}
                    aria-controls="weitere-leistungen"
                    className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[0.9375rem] font-semibold text-navy decoration-2 underline-offset-4 hover:underline"
                  >
                    Weitere Leistungen ({weitereLeistungen.length})
                    <ChevronDown className={`h-4 w-4 ${mehrOffen ? "rotate-180" : ""}`} aria-hidden />
                  </button>
                )}
                {mehrOffen && (
                  <div id="weitere-leistungen" className="mt-1 rounded-lg border border-ink-300">
                    {weitereLeistungen.map((s) => {
                      const selected = values.serviceSlug === s.slug;
                      return (
                        <button
                          key={s.slug}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          data-slug={s.slug}
                          tabIndex={selected ? 0 : -1}
                          onClick={() => set("serviceSlug", s.slug)}
                          className="auswahl-zeile"
                        >
                          <span className="auswahl-punkt" aria-hidden />
                          <span className="flex min-w-0 flex-1 items-baseline justify-between gap-4">
                            <span className="text-[0.96875rem] font-semibold text-navy">{s.shortName ?? s.name}</span>
                            <span className="shrink-0 text-[0.9375rem] text-ink-600">
                              {s.price.serviceFee !== null && s.slug === "wunschkennzeichen"
                                ? `+ ${euro(s.price.serviceFee)}`
                                : "auf Anfrage"}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
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
                      className={`flex min-h-[3.25rem] cursor-pointer items-center justify-center rounded-lg border-2 px-3 text-center text-[15px] font-semibold transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600 ${
                        values.audience === value
                          ? "border-brand-600 bg-canvas text-navy"
                          : "border-ink-300 bg-white text-ink-800 hover:border-navy"
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
                  id="name" name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "err-name" : undefined}
                  className="field"
                  placeholder="z. B. Max Mustermann"
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
                      id="email" name="email" spellCheck={false}
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
                      placeholder="z. B. name@beispiel.de"
                    />
                    <FieldError id="err-email" message={errors.email} />
                  </div>
                  <div>
                    <label htmlFor="phone" className="field-label">
                      Telefon / WhatsApp
                    </label>
                    <input
                      id="phone" name="phone"
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
                      placeholder="z. B. 0151 23456789"
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
                    id="zip" name="zip"
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
                    placeholder="z. B. 10115"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="field-label">
                    Wohnort *
                  </label>
                  <input
                    id="city" name="city"
                    type="text"
                    autoComplete="address-level2"
                    required
                    value={values.city}
                    onChange={(e) => set("city", e.target.value)}
                    aria-invalid={!!errors.city}
                    aria-describedby={["hint-ort", errors.city && "err-city"].filter(Boolean).join(" ")}
                    className="field"
                    placeholder="z. B. Berlin"
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
                  id="vehicle" name="vehicle"
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
                  id="message" name="message"
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
                <Link href="/datensicherheit/" className="link">
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

              <dl className="liste mt-6">
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
                  <div key={zeile.titel} className="flex items-start justify-between gap-4 py-3.5">
                    <div className="min-w-0">
                      <dt className="text-sm font-medium text-ink-600">{zeile.titel}</dt>
                      <dd className="mt-1 break-words text-[15px] font-semibold text-navy">{zeile.inhalt}</dd>
                    </div>
                    <button
                      type="button"
                      onClick={() => goTo(zeile.schritt, -1)}
                      disabled={sending}
                      className="flex min-h-11 shrink-0 cursor-pointer items-center px-1 text-sm font-semibold text-navy underline decoration-ink-300 underline-offset-4 hover:decoration-navy"
                      aria-label={`${zeile.titel} ändern`}
                    >
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
                className={`mt-5 flex cursor-pointer items-start gap-3 rounded-lg border p-4 text-[15px] leading-relaxed text-ink-800 ${
                  errors.consent ? "border-danger bg-danger-50" : "border-ink-300 bg-white"
                }`}
              >
                <input
                  id="consent"
                  type="checkbox"
                  required
                  aria-required="true"
                  checked={values.consent}
                  onChange={(e) => set("consent", e.target.checked)}
                  aria-invalid={!!errors.consent}
                  aria-describedby={errors.consent ? "err-consent" : undefined}
                  className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-navy"
                />
                <span>
                  Ich willige ein, dass meine Angaben und die übermittelten Unterlagen zur
                  Bearbeitung meiner Anfrage verarbeitet werden. Details in der{" "}
                  <Link href="/datenschutz/" className="link">
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
                    {files.length > 0 ? "Unterlagen werden übertragen…" : "Wird gesendet…"}
                  </>
                ) : (
                  <>
                    Anfrage kostenlos absenden
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
              <p className="mt-2 text-center text-sm leading-relaxed text-ink-600">
                Informationen zu Ihrem{" "}
                <Link href="/widerruf/" className="link">
                  Widerrufsrecht
                </Link>{" "}
                und zum Anbieter im{" "}
                <Link href="/impressum/" className="link">
                  Impressum
                </Link>
                .
              </p>

              {/* Zustellung fehlgeschlagen → Direktkanäle als Rückfallebene */}
              {result && !result.ok && result.fallback && (
                <div className="mt-6 rounded-lg border-2 border-hinweis-300 bg-hinweis-50 p-4" role="alert">
                  <p className="flex items-start gap-2 text-[15px] font-semibold text-hinweis-900">
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
                    <p className="mt-3 text-sm text-hinweis-900">
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

        {/* Navigation – am Handy fest am unteren Rand (mit Gesamtbetrag), damit „Weiter“
            nach der Auswahl nicht weit unten gesucht werden muss. */}
        <div className="sticky bottom-0 z-20 -mx-5 mt-8 flex items-center gap-3 border-t border-line bg-white px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-8 sm:px-8 lg:static lg:mx-0 lg:px-0 lg:pb-0 lg:pt-5">
          {step > 0 && (
            <button type="button" onClick={back} disabled={sending} className="btn btn-ghost btn-sm -ml-2 px-2">
              Zurück
            </button>
          )}
          <div className="ml-auto flex items-center gap-4">
            {price && step < LAST && (
              <p className="text-right text-sm leading-tight text-ink-600 lg:hidden" aria-hidden>
                Gesamt
                <span className="block font-display text-base font-bold tabular-nums text-navy">
                  {centsToEuro(price.totalCents)}
                </span>
              </p>
            )}
            {step < LAST && (
              <button type="button" onClick={next} className="btn btn-primary min-w-[8.5rem]">
                {step === 2 && files.length === 0 ? "Ohne Upload weiter" : "Weiter"}
              </button>
            )}
          </div>
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
