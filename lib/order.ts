/**
 * Übermittlung von Aufträgen und Unterlagen an den Posteingang.
 *
 * Ablauf (WhatsApp bleibt der Hauptkanal, geht aber nie am Posteingang vorbei):
 *   1. Die Anfrage wird an `public/api/auftrag.php` gesendet. Das Skript
 *      stellt sie samt Anhängen an info@deutschezulassung.de zu und vergibt
 *      eine Referenznummer.
 *   2. Danach führen wir die Kundin oder den Kunden in den WhatsApp-Chat –
 *      mit der Referenz in der vorbefüllten Nachricht, damit das Team den
 *      Chat sofort der eingegangenen E-Mail zuordnen kann.
 *
 * Fällt Schritt 1 aus (Staging auf GitHub Pages, PHP deaktiviert, Netzfehler),
 * greift der bisherige Weg: vorbefüllte WhatsApp-Nachricht bzw. mailto:.
 * Der Kunde bleibt so in jedem Fall handlungsfähig.
 */

import { getService } from "./services";
import { site, whatsAppLink } from "./site";
import type { OrderRequest } from "./types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Auf GitHub Pages läuft kein PHP – dort direkt den Fallback nutzen. */
export const endpointAvailable = process.env.NEXT_PUBLIC_STAGING !== "1";

export const ENDPOINT = `${basePath}/api/auftrag.php`;

export const UPLOAD_LIMITS = {
  maxFiles: 12,
  maxFileBytes: 10 * 1024 * 1024,
  maxTotalBytes: 25 * 1024 * 1024,
  /** Muss zu ALLOWED in auftrag.php passen. */
  accept: ".jpg,.jpeg,.png,.heic,.heif,.webp,.pdf,image/*,application/pdf",
  extensions: ["jpg", "jpeg", "png", "heic", "heif", "webp", "pdf"],
} as const;

export type SubmitKind = "auftrag" | "unterlagen";

export interface SubmitResult {
  ok: boolean;
  /** Referenznummer, z. B. "DZ-20260820-A7F3". Nur bei ok: true. */
  reference?: string;
  error?: string;
  /** Feldname, auf den sich der Fehler bezieht (für die Fehleranzeige). */
  field?: string;
  /** true = Zustellung fehlgeschlagen, Fallback-Kanäle anbieten. */
  fallback?: boolean;
}

/** Menschenlesbare Zusammenfassung – für WhatsApp, mailto und die Kopieren-Funktion. */
export function buildMessage(v: OrderRequest, reference?: string): string {
  const service = getService(v.serviceSlug);
  return [
    "Neue Auftragsanfrage über deutschezulassung.de",
    reference ? `Referenz: ${reference}` : null,
    "",
    `Leistung: ${service?.name ?? v.serviceSlug}`,
    `Kundenart: ${v.audience === "privat" ? "Privatkunde" : "Gewerbekunde"}`,
    `Name: ${v.name}`,
    v.email ? `E-Mail: ${v.email}` : null,
    v.phone ? `Telefon: ${v.phone}` : null,
    `PLZ/Ort: ${v.zip} ${v.city}`,
    v.vehicle ? `Fahrzeug: ${v.vehicle}` : null,
    v.message ? `Anmerkung: ${v.message}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/** Kurznachricht, mit der der Chat nach erfolgreicher Übermittlung startet. */
export function followUpMessage(reference: string, serviceName?: string): string {
  return [
    `Hallo DeutscheZulassung, ich habe gerade eine Anfrage über die Website gesendet.`,
    serviceName ? `Leistung: ${serviceName}` : null,
    `Referenz: ${reference}`,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

export function followUpWhatsAppLink(reference: string, serviceName?: string): string {
  return whatsAppLink(followUpMessage(reference, serviceName));
}

export function mailtoLink(v: OrderRequest, reference?: string): string {
  const service = getService(v.serviceSlug);
  const subject = `Auftragsanfrage: ${service?.name ?? "Kfz-Zulassung"}${
    reference ? ` (${reference})` : ""
  }`;
  return `mailto:${site.contact.email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(buildMessage(v, reference))}`;
}

/** Prüft Anzahl, Größe und Endungen, bevor überhaupt hochgeladen wird. */
export function validateFiles(files: File[]): string | null {
  if (files.length > UPLOAD_LIMITS.maxFiles) {
    return `Bitte höchstens ${UPLOAD_LIMITS.maxFiles} Dateien auf einmal.`;
  }
  let total = 0;
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!UPLOAD_LIMITS.extensions.includes(ext as (typeof UPLOAD_LIMITS.extensions)[number])) {
      return `„${file.name}“ hat ein nicht unterstütztes Format. Erlaubt sind Fotos (JPG, PNG, HEIC, WEBP) und PDF.`;
    }
    if (file.size > UPLOAD_LIMITS.maxFileBytes) {
      return `„${file.name}“ ist größer als 10 MB. Bitte verkleinern oder als PDF senden.`;
    }
    total += file.size;
  }
  if (total > UPLOAD_LIMITS.maxTotalBytes) {
    return "Die Dateien sind zusammen größer als 25 MB. Bitte in zwei Schritten senden.";
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

interface SubmitInput {
  kind: SubmitKind;
  values: OrderRequest;
  files: File[];
  /** Zeitpunkt, an dem das Formular geöffnet wurde (einfache Bot-Erkennung). */
  startedAt: number;
  /** Vorhandene Referenz, wenn Unterlagen nachgereicht werden. */
  reference?: string;
}

/**
 * Sendet die Anfrage an den Posteingang.
 * Wirft nicht – Fehler kommen als `{ ok: false, ... }` zurück, damit die UI
 * immer einen brauchbaren Fallback anbieten kann.
 */
export async function submitOrder({
  kind,
  values,
  files,
  startedAt,
  reference,
}: SubmitInput): Promise<SubmitResult> {
  if (!endpointAvailable) {
    return {
      ok: false,
      fallback: true,
      error: "Der Versand ist in dieser Vorschau-Umgebung nicht aktiv.",
    };
  }

  const service = getService(values.serviceSlug);
  const body = new FormData();
  body.set("kind", kind);
  body.set("service", service?.name ?? values.serviceSlug);
  body.set("audience", values.audience === "privat" ? "Privatkunde" : "Autohaus / Gewerbe");
  body.set("name", values.name);
  body.set("email", values.email);
  body.set("phone", values.phone);
  body.set("zip", values.zip);
  body.set("city", values.city);
  body.set("vehicle", values.vehicle);
  body.set("message", values.message);
  body.set("consent", values.consent ? "ja" : "nein");
  body.set("startedAt", String(Math.floor(startedAt / 1000)));
  body.set("website", ""); // Honeypot – bleibt für Menschen leer
  if (reference) body.set("reference", reference);
  for (const file of files) body.append("dateien[]", file, file.name);

  try {
    const response = await fetch(ENDPOINT, { method: "POST", body });
    const data = (await response.json()) as SubmitResult;

    if (response.ok && data.ok) {
      return { ok: true, reference: data.reference };
    }
    // Feldfehler (422/413/415) sind korrigierbar – kein Fallback anbieten,
    // sonst umgeht der Kunde die Prüfung statt die Eingabe zu berichtigen.
    const correctable = response.status >= 400 && response.status < 500;
    return {
      ok: false,
      error: data.error ?? "Die Anfrage konnte nicht übermittelt werden.",
      field: data.field,
      fallback: !correctable,
    };
  } catch {
    // Netzfehler, CORS, kein PHP: Kunde darf nicht im Nichts landen.
    return {
      ok: false,
      fallback: true,
      error: "Die Verbindung zum Server kam nicht zustande.",
    };
  }
}
