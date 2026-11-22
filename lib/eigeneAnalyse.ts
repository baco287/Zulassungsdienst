/**
 * Eigene Webanalyse – Nachbau des Volt-Gas-Trackings (Tarifrechner: js/tracking.js).
 *
 * Sendet anonyme Ereignisse an /api/track.php (PHP auf dem eigenen Webspace, siehe
 * public/api/analytics-lib.php). Auswertung: https://kfz-zulassungsprofis.de/analytics/
 *
 * Erfasst wie bei Volt-Gas:
 *  - session_start beim ersten Seitenaufruf: Einstiegsseite, verweisende Domain,
 *    UTM-Parameter und Klick-IDs (nur ob gclid/fbclid/ttclid vorhanden ist, nicht der Wert)
 *  - page_view bei jedem Seitenwechsel (auch bei clientseitiger Navigation)
 *  - page_leave beim Verlassen einer Seite: Verweildauer, Scrolltiefe, Ladezeit
 *  - contact_click automatisch für WhatsApp-, Telefon- und Mail-Links
 *  - js_error für unbehandelte Skriptfehler (max. 3 je Seitenladung)
 *  - alle Ereignisse aus lib/analytics.ts (track) – Assistent, Leistung, Preisbox …
 *
 * DATENSCHUTZ – bewusst strenger als bei Volt-Gas:
 *  - keine Cookies und KEIN Speichern im Browser: Die Sitzungskennung lebt nur im Arbeits-
 *    speicher des Tabs (Volt-Gas: sessionStorage + 90-Tage-Cookie vg_attr). Seitenwechsel
 *    innerhalb der Website bleiben eine Sitzung; ein Neuladen beginnt eine neue.
 *  - nur Pfade ohne Query-Parameter, nur Domain des Referrers, keine IP-Adresse,
 *    keine Formularinhalte; Werte, die nach E-Mail, Telefonnummer oder FIN aussehen,
 *    verwirft der Server zusätzlich.
 *
 * Aktiv im Produktions-Build, aus in der GitHub-Pages-Vorschau (dort gibt es kein PHP)
 * und in `npm run dev`. Schalter: NEXT_PUBLIC_EIGENE_ANALYSE = "1" (an) | "0" (aus).
 */

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const schalter = process.env.NEXT_PUBLIC_EIGENE_ANALYSE ?? "";

export const eigeneAnalyseAktiv =
  schalter === "1" ||
  (schalter !== "0" && process.env.NEXT_PUBLIC_STAGING !== "1" && process.env.NODE_ENV === "production");

const ENDPOINT = `${basePath}/api/track.php`;

type Wert = string | number;
export interface Ereignis {
  service?: string;
  step?: number;
  path?: string;
  meta?: Record<string, Wert | undefined>;
}

let sid: string | null = null;
let gestartet = false;
type Seite = { path: string; start: number; maxScroll: number; left: boolean };
let aktuelleSeite: Seite | null = null;
/** Nur die zuerst geladene Seite hat eine echte Ladezeit (danach navigiert Next.js clientseitig). */
let ersteSeite: Seite | null = null;
let ersteLadezeit = 0;
let fehlerZahl = 0;

function zufallsId(): string {
  try {
    const b = new Uint8Array(12);
    crypto.getRandomValues(b);
    return Array.from(b, (x) => x.toString(36).padStart(2, "0")).join("").slice(0, 20);
  } catch {
    return (Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 20);
  }
}

function pfad(): string {
  const p = window.location.pathname || "/";
  return (basePath && p.startsWith(basePath) ? p.slice(basePath.length) || "/" : p).slice(0, 120);
}

function geraet(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

/** Nur die Domain einer fremden verweisenden Seite. */
function referrerDomain(): string {
  try {
    const r = document.referrer;
    if (!r) return "";
    const host = new URL(r).hostname.replace(/^www\./, "");
    return host === window.location.hostname.replace(/^www\./, "") ? "" : host.slice(0, 80);
  } catch {
    return "";
  }
}

function senden(event: string, e: Ereignis, beacon: boolean): void {
  if (!eigeneAnalyseAktiv || typeof window === "undefined") return;
  const meta: Record<string, Wert> = {};
  for (const [k, v] of Object.entries(e.meta ?? {})) if (v !== undefined && v !== "") meta[k] = v;
  const body = JSON.stringify({
    event,
    session_id: sitzung(),
    // Aktuelle Adresse, nicht aktuelleSeite: Bei einem Seitenwechsel feuern die Komponenten der
    // neuen Seite (z. B. order_start im Assistenten) ihre Ereignisse vor dem page_view.
    path: e.path ?? pfad(),
    service: e.service ?? "",
    step: e.step ?? 0,
    device: geraet(),
    referrer: referrerDomain(),
    meta,
  });
  try {
    if (beacon && navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }))) return;
  } catch {
    /* weiter mit fetch */
  }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* Analyse darf nie die Seite stören */
  }
}

/** Herkunft der Sitzung (nur beim ersten Seitenaufruf). */
function herkunft(): Record<string, Wert> {
  const o: Record<string, Wert> = { landing: pfad() };
  const ref = referrerDomain();
  if (ref) o.ref = ref;
  try {
    const qs = new URLSearchParams(window.location.search);
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) {
      const v = qs.get(k);
      if (v) o[k] = v.slice(0, 80);
    }
    if (qs.get("gclid") || qs.get("gbraid") || qs.get("wbraid")) o.clid = "google";
    else if (qs.get("fbclid")) o.clid = "meta";
    else if (qs.get("ttclid")) o.clid = "tiktok";
    else if (qs.get("msclkid")) o.clid = "bing";
  } catch {
    /* ohne Kampagnenangaben */
  }
  return o;
}

/** Sitzungskennung dieses Tabs; beim ersten Aufruf wird session_start gesendet. */
function sitzung(): string {
  if (!sid) {
    sid = zufallsId();
    senden("session_start", { meta: herkunft() }, false);
  }
  return sid;
}

/** Ereignis aus lib/analytics.ts weiterreichen (Werte dort schon bereinigt). */
export function eigenesEreignis(event: string, e: Ereignis = {}, beacon = false): void {
  if (!eigeneAnalyseAktiv) return;
  senden(event, e, beacon);
}

/** Für das Formular: Sitzung, der api/auftrag.php die Server-Bestätigung zuordnet. */
export function analyseSitzung(): string {
  return eigeneAnalyseAktiv && typeof window !== "undefined" ? sitzung() : "";
}

function scrollMessen(): void {
  if (!aktuelleSeite) return;
  try {
    const doc = document.documentElement;
    const gesamt = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
    if (!gesamt) return;
    const gesehen = (window.scrollY || doc.scrollTop || 0) + window.innerHeight;
    const pct = Math.min(100, Math.round((gesehen / gesamt) * 100));
    if (pct > aktuelleSeite.maxScroll) aktuelleSeite.maxScroll = pct;
  } catch {
    /* egal */
  }
}

/**
 * page_leave für die aktuelle Seite (einmal je Seite). Beim clientseitigen Seitenwechsel
 * ist schon die neue Seite zu sehen – dann nicht mehr messen, sonst bekäme die alte Seite
 * die Scrolltiefe der neuen.
 */
function seiteVerlassen(messen = true): void {
  const s = aktuelleSeite;
  if (!s || s.left) return;
  s.left = true;
  if (messen) scrollMessen();
  const meta: Record<string, Wert> = { dur: Math.round((Date.now() - s.start) / 1000), scroll: s.maxScroll };
  if (s === ersteSeite && ersteLadezeit > 0) meta.load = ersteLadezeit;
  senden("page_leave", { path: s.path, meta }, true);
}

/** Text eines Kontakt-Links ohne Nummern oder Adressen. */
function linkText(a: Element, typ: string): string {
  const t = String(a.getAttribute("aria-label") || a.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  return !t || /@|\d{4,}/.test(t) ? typ : t;
}

function einmalEinrichten(): void {
  if (gestartet) return;
  gestartet = true;

  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  window.addEventListener(
    "scroll",
    () => {
      if (scrollTimer) return;
      scrollTimer = setTimeout(() => {
        scrollTimer = null;
        scrollMessen();
      }, 250);
    },
    { passive: true },
  );

  const ladezeit = () => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const ms = nav ? Math.round(nav.loadEventEnd || nav.domComplete || nav.domContentLoadedEventEnd || 0) : 0;
      if (ms > 0 && ms < 120000) ersteLadezeit = ms;
    } catch {
      /* ohne Ladezeit */
    }
  };
  if (document.readyState === "complete") ladezeit();
  else window.addEventListener("load", () => setTimeout(ladezeit, 0), { once: true });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") seiteVerlassen();
  });
  window.addEventListener("pagehide", () => seiteVerlassen());

  // Kontakt-Links: WhatsApp, Telefon, E-Mail. Der Link selbst (mit vorbefüllter
  // WhatsApp-Nachricht) wird nie übertragen, nur Art und Beschriftung.
  document.addEventListener(
    "click",
    (ev) => {
      try {
        const t = ev.target as Element | null;
        const a = t && t.closest ? t.closest("a[href]") : null;
        if (!a) return;
        const href = String(a.getAttribute("href") || "");
        // wa.me ohne Rufnummer („wa.me/?text=…“) ist Teilen an Dritte, keine Kontaktaufnahme mit uns.
        const typ = /^tel:/i.test(href)
          ? "tel"
          : /wa\.me\/\d|api\.whatsapp\.com\/send\?phone=\d|whatsapp:\/\/send\?phone=\d/i.test(href)
            ? "whatsapp"
            : /^mailto:/i.test(href)
              ? "mail"
              : "";
        if (!typ) return;
        senden("contact_click", { meta: { type: typ, id: linkText(a, typ) } }, true);
      } catch {
        /* egal */
      }
    },
    true,
  );

  const fehler = (msg: string, src: string, line: number) => {
    if (fehlerZahl++ >= 3) return;
    senden(
      "js_error",
      {
        meta: {
          msg: String(msg || "unbekannt").slice(0, 140),
          src: String(src || "").split("?")[0].split("/").pop()?.slice(0, 40) ?? "",
          line: line || 0,
        },
      },
      false,
    );
  };
  window.addEventListener(
    "error",
    (e) => {
      if (!e) return;
      if (e.message) fehler(e.message, e.filename, e.lineno);
      else {
        // Nicht geladene eigene Dateien melden; fremde blockt oft ein Werbeblocker (Rauschen).
        const z = e.target as (HTMLElement & { src?: string; href?: string }) | null;
        const res = z && z !== (window as unknown) ? String(z.src || z.href || "") : "";
        if (res.startsWith(window.location.origin + "/")) fehler("Ressource nicht geladen", res, 0);
      }
    },
    true,
  );
  window.addEventListener("unhandledrejection", (e) => {
    const r = e && (e as PromiseRejectionEvent).reason;
    fehler("Promise: " + String((r && (r.message || r)) || "unbekannt"), "", 0);
  });
}

/**
 * Neuer Seitenaufruf (auch bei clientseitiger Navigation). Gibt eine Aufräumfunktion
 * zurück, die beim Seitenwechsel page_leave für die bisherige Seite sendet.
 */
export function seitenaufruf(): () => void {
  if (!eigeneAnalyseAktiv || typeof window === "undefined") return () => {};
  einmalEinrichten();
  sitzung();
  const s: Seite = { path: pfad(), start: Date.now(), maxScroll: 0, left: false };
  aktuelleSeite = s;
  ersteSeite ??= s;
  senden("page_view", { path: s.path }, false);
  // Kurz nach dem Rendern messen: kurze Seiten sind ohne Scrollen schon zu 100 % sichtbar.
  const t = setTimeout(scrollMessen, 600);
  return () => {
    clearTimeout(t);
    if (aktuelleSeite === s) seiteVerlassen(false);
  };
}
