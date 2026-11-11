"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { analyticsProvider, CONSENT_KEY, gadsId } from "@/lib/analytics";

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN ?? "";
const plausibleSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
const matomoUrl = process.env.NEXT_PUBLIC_MATOMO_URL ?? "";
const matomoSiteId = process.env.NEXT_PUBLIC_MATOMO_SITE_ID ?? "";

/**
 * Lädt die konfigurierte cookielose Webanalyse und – nur nach Einwilligung –
 * Google Ads. Ohne Umgebungsvariablen rendert die Komponente nichts.
 */
export default function Analytics() {
  const [consent, setConsent] = useState<"granted" | "denied" | null>(null);

  useEffect(() => {
    if (!gadsId) return;
    try {
      const v = window.localStorage.getItem(CONSENT_KEY);
      setConsent(v === "granted" || v === "denied" ? v : null);
    } catch {
      setConsent("denied");
    }
  }, []);

  // Matomo zählt clientseitige Seitenwechsel nicht selbst. Nur der Pfad wird
  // gemeldet – Query-Parameter (z. B. Referenznummern) bleiben außen vor.
  // Automatisches Link-Tracking ist bewusst aus: WhatsApp-Links enthalten
  // vorbefüllte Nachrichten mit Kontaktdaten.
  const pathname = usePathname();
  const firstView = useRef(true);
  useEffect(() => {
    if (analyticsProvider !== "matomo") return;
    if (firstView.current) {
      firstView.current = false;
      return;
    }
    window._paq?.push(["setCustomUrl", window.location.origin + pathname]);
    window._paq?.push(["trackPageView"]);
  }, [pathname]);

  const decide = (value: "granted" | "denied") => {
    try {
      window.localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // ohne Speicher gilt die Entscheidung nur für diesen Seitenaufruf
    }
    setConsent(value);
  };

  return (
    <>
      {analyticsProvider === "plausible" && plausibleDomain && (
        <>
          <Script defer data-domain={plausibleDomain} src={plausibleSrc} strategy="afterInteractive" />
          <Script id="plausible-queue" strategy="afterInteractive">
            {`window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }`}
          </Script>
        </>
      )}
      {analyticsProvider === "matomo" && matomoUrl && matomoSiteId && (
        <Script id="matomo" strategy="afterInteractive">
          {`var _paq = window._paq = window._paq || [];
_paq.push(['disableCookies']);
_paq.push(['setCustomUrl', location.origin + location.pathname]);
_paq.push(['trackPageView']);
(function() {
  var u=${JSON.stringify(matomoUrl)};
  _paq.push(['setTrackerUrl', u+'matomo.php']);
  _paq.push(['setSiteId', ${JSON.stringify(matomoSiteId)}]);
  var d=document, g=d.createElement('script'), s=d.getElementsByTagName('script')[0];
  g.async=true; g.src=u+'matomo.js'; s.parentNode.insertBefore(g,s);
})();`}
        </Script>
      )}

      {gadsId && consent === "granted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${gadsId}`} strategy="afterInteractive" />
          <Script id="gads" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(gadsId)}, { 'anonymize_ip': true });`}
          </Script>
        </>
      )}

      {gadsId && consent === null && (
        <div
          role="dialog"
          aria-labelledby="consent-title"
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-ink-200 bg-white p-5 shadow-2xl sm:bottom-5"
        >
          <p id="consent-title" className="font-display text-base font-bold text-ink-900">
            Darf Google Ads messen, ob unsere Anzeigen helfen?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Mit Ihrer Einwilligung setzen wir ein Cookie von Google, das erfasst, ob Sie über eine Anzeige zu uns
            gekommen sind und einen Auftrag erteilt haben. Ohne Einwilligung funktioniert die Website genauso. Sie
            können Ihre Entscheidung jederzeit in der{" "}
            <Link href="/datenschutz/" className="font-semibold text-brand-700 underline">
              Datenschutzerklärung
            </Link>{" "}
            ändern.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => decide("denied")}
              className="flex-1 cursor-pointer rounded-xl border-2 border-ink-300 px-4 py-2.5 font-display text-sm font-semibold text-ink-800 hover:bg-ink-50"
            >
              Ablehnen
            </button>
            <button
              type="button"
              onClick={() => decide("granted")}
              className="flex-1 cursor-pointer rounded-xl border-2 border-ink-300 px-4 py-2.5 font-display text-sm font-semibold text-ink-800 hover:bg-ink-50"
            >
              Einverstanden
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Button für die Datenschutzseite: Einwilligung zurücksetzen. */
export function ConsentReset() {
  if (!gadsId) return null;
  return (
    <button
      type="button"
      onClick={() => {
        try {
          window.localStorage.removeItem(CONSENT_KEY);
        } catch {
          /* nichts */
        }
        window.location.reload();
      }}
      className="cursor-pointer rounded-lg border border-ink-300 px-3 py-1.5 text-sm font-semibold text-ink-800 hover:bg-ink-50"
    >
      Einwilligung für Google Ads ändern
    </button>
  );
}
