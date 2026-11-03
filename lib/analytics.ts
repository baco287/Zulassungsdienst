/**
 * Datenschutzfreundliche Webanalyse und Conversion-Ereignisse.
 *
 * Standard: AUS. Aktiviert wird per Umgebungsvariable beim Build:
 *
 *   NEXT_PUBLIC_ANALYTICS_PROVIDER = "plausible" | "matomo"
 *   NEXT_PUBLIC_PLAUSIBLE_DOMAIN   = "deutschezulassung.de"
 *   NEXT_PUBLIC_PLAUSIBLE_SRC      = "https://plausible.io/js/script.js" (oder selbst gehostet)
 *   NEXT_PUBLIC_MATOMO_URL         = "https://deutschezulassung.de/matomo/" (selbst gehostet)
 *   NEXT_PUBLIC_MATOMO_SITE_ID     = "1"
 *
 * Beide Anbieter laufen ohne Cookies (Plausible grundsätzlich, Matomo mit
 * `disableCookies`) und brauchen daher keinen Einwilligungsbanner. Sie
 * müssen trotzdem in der Datenschutzerklärung genannt werden (Abschnitt
 * "Webanalyse" – Textbaustein in docs/TRACKING.md).
 *
 * Google Ads Conversion-Tracking (setzt Cookies) wird NUR nach aktiver
 * Einwilligung im Banner geladen und ist vorbereitet, aber inaktiv:
 *
 *   NEXT_PUBLIC_GADS_ID                 = "AW-XXXXXXXXX"
 *   NEXT_PUBLIC_GADS_LABEL_ORDER        = Conversion-Label "Anfrage gesendet"
 *
 * WICHTIG: Ereignisse tragen niemals personenbezogene Daten. Erlaubt sind nur
 * die Schlüssel in ALLOWED_PROPS mit kurzen, festen Werten.
 */

export type AnalyticsEvent =
  | "cta_click"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "order_start"
  | "service_selected"
  | "order_step"
  | "order_abandon"
  | "order_submitted"
  | "contact_form_submit"
  | "documents_uploaded";

export type AnalyticsProps = Partial<Record<(typeof ALLOWED_PROPS)[number], string | number>>;

const ALLOWED_PROPS = ["position", "service", "step", "value", "method", "page"] as const;

export const analyticsProvider = (process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? "") as "" | "plausible" | "matomo";
export const gadsId = process.env.NEXT_PUBLIC_GADS_ID ?? "";
export const CONSENT_KEY = "dz-consent-v1";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string | number> }) => void;
    _paq?: unknown[][];
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

const SUSPICIOUS = /@|\d{6,}|[A-HJ-NPR-Z0-9]{17}/i; // E-Mail, lange Ziffernfolgen (Telefon/IBAN), FIN

function sanitize(props?: AnalyticsProps): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (!props) return out;
  for (const key of ALLOWED_PROPS) {
    const v = props[key];
    if (v === undefined) continue;
    if (typeof v === "number") out[key] = v;
    else {
      const s = String(v).slice(0, 40);
      if (!SUSPICIOUS.test(s)) out[key] = s;
    }
  }
  return out;
}

export function hasAdsConsent(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

const ADS_LABELS: Partial<Record<AnalyticsEvent, string>> = {
  order_submitted: process.env.NEXT_PUBLIC_GADS_LABEL_ORDER ?? "",
};

/** Sendet ein Ereignis an den konfigurierten Anbieter. Ohne Konfiguration: no-op. */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  const clean = sanitize(props);
  try {
    if (analyticsProvider === "plausible" && window.plausible) {
      window.plausible(event, { props: clean });
    } else if (analyticsProvider === "matomo" && window._paq) {
      window._paq.push(["trackEvent", "conversion", event, clean.service ? String(clean.service) : undefined, typeof clean.value === "number" ? clean.value : undefined]);
    }
    const label = ADS_LABELS[event];
    if (gadsId && label && window.gtag && hasAdsConsent()) {
      window.gtag("event", "conversion", {
        send_to: `${gadsId}/${label}`,
        ...(typeof clean.value === "number" ? { value: clean.value, currency: "EUR" } : {}),
      });
    }
  } catch {
    // Analyse darf nie die Seite stören.
  }
}
