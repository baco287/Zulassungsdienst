/**
 * Zahlungsarten – Vorbereitung für einen späteren Online-Checkout (Mollie).
 *
 * STAND: Es gibt KEINE aktive Online-Zahlung. Kunden zahlen per Überweisung,
 * nachdem sie die Festpreis-Bestätigung erhalten haben. Dieses Modul sorgt nur
 * dafür, dass die Oberfläche später ohne Umbau erweitert werden kann – und dass
 * bis dahin keine Zahlungsart angezeigt wird, die nicht wirklich funktioniert.
 *
 * Zwei Schalter müssen BEIDE gesetzt sein, bevor eine Methode erscheint:
 *   NEXT_PUBLIC_CHECKOUT=1                     Online-Zahlung grundsätzlich an
 *   NEXT_PUBLIC_PAYMENT_METHODS=paypal,klarna  beim Zahlungsanbieter freigeschaltete Methoden
 *
 * Geheime Schlüssel (Mollie-API-Key) gehören ausschließlich auf den Server
 * (PHP-Endpunkt bzw. dessen Konfiguration außerhalb des Webroots), niemals in
 * eine NEXT_PUBLIC_-Variable und niemals in dieses Repository.
 * Architektur und Einführungsschritte: docs/CHECKOUT-MOLLIE.md
 */

export type PaymentMethodId = "paypal" | "klarna" | "creditcard" | "applepay" | "googlepay";

export interface PaymentMethod {
  id: PaymentMethodId;
  /** Anzeigename. */
  label: string;
  /** Kurzer Zusatz, z. B. die Kartenmarken. */
  hint?: string;
  /** Methoden-Kennung bei Mollie (für den Server-Endpunkt). */
  mollieMethod: string;
}

/** Alle geplanten Methoden. Welche davon sichtbar sind, entscheidet `activePaymentMethods`. */
export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "paypal", label: "PayPal", mollieMethod: "paypal" },
  { id: "klarna", label: "Klarna", hint: "Rechnung oder Ratenkauf", mollieMethod: "klarna" },
  { id: "creditcard", label: "Kreditkarte", hint: "Visa, Mastercard", mollieMethod: "creditcard" },
  { id: "applepay", label: "Apple Pay", mollieMethod: "applepay" },
  { id: "googlepay", label: "Google Pay", mollieMethod: "googlepay" },
] as const;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Online-Zahlung grundsätzlich eingeschaltet (Standard: aus). */
export const CHECKOUT_ENABLED = process.env.NEXT_PUBLIC_CHECKOUT === "1";

const requested = (process.env.NEXT_PUBLIC_PAYMENT_METHODS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * Tatsächlich nutzbare Zahlungsarten. Leer, solange der Checkout nicht
 * eingeschaltet ist oder keine Methode ausdrücklich freigeschaltet wurde.
 */
export const activePaymentMethods: readonly PaymentMethod[] = CHECKOUT_ENABLED
  ? PAYMENT_METHODS.filter((m) => requested.includes(m.id))
  : [];

/** Server-Endpunkt, der eine Zahlung bei Mollie anlegt (noch nicht vorhanden). */
export const PAYMENT_ENDPOINT = `${basePath}/api/zahlung.php`;

export interface StartPaymentInput {
  /** Referenz der eingegangenen Anfrage, z. B. "DZ-20261111-A7F3". */
  reference: string;
  method: PaymentMethodId;
}

export type StartPaymentResult =
  | { ok: true; checkoutUrl: string }
  | { ok: false; error: string };

/**
 * Legt eine Zahlung an und liefert die Weiterleitungsadresse des Anbieters.
 *
 * Der Betrag wird bewusst NICHT vom Browser mitgeschickt: Der Server liest den
 * bestätigten Festpreis zur Referenz selbst – sonst ließe er sich manipulieren.
 * Solange der Checkout aus ist, wird kein Netzwerkaufruf ausgeführt.
 */
export async function startPayment({ reference, method }: StartPaymentInput): Promise<StartPaymentResult> {
  if (!CHECKOUT_ENABLED || !activePaymentMethods.some((m) => m.id === method)) {
    return { ok: false, error: "Die Online-Zahlung ist derzeit nicht verfügbar." };
  }
  try {
    const response = await fetch(PAYMENT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, method }),
    });
    const data = (await response.json()) as { ok?: boolean; checkoutUrl?: string; error?: string };
    if (response.ok && data.ok && typeof data.checkoutUrl === "string") {
      return { ok: true, checkoutUrl: data.checkoutUrl };
    }
    return { ok: false, error: data.error ?? "Die Zahlung konnte nicht gestartet werden." };
  } catch {
    return { ok: false, error: "Die Verbindung zum Zahlungsdienst kam nicht zustande." };
  }
}
