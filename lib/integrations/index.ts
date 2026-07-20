/**
 * Schnittstellen-Verträge für Phase 2+ (siehe README.md in diesem Ordner).
 *
 * Phase 1 implementiert KEINE dieser Schnittstellen produktiv –
 * jeder Aufruf wirft NotImplementedError. So bleibt klar getrennt,
 * was fertig ist (Website, Formular via WhatsApp/E-Mail) und was
 * zukünftige Integration ist.
 */
import type { OrderRequest } from "../types";

export class NotImplementedError extends Error {
  constructor(feature: string) {
    super(`${feature} ist in Phase 1 nicht implementiert (siehe lib/integrations/README.md).`);
    this.name = "NotImplementedError";
  }
}

export type OrderStatus =
  | "eingegangen"
  | "unterlagen_geprueft"
  | "bei_behoerde"
  | "zugelassen"
  | "versendet"
  | "abgeschlossen"
  | "rueckfrage";

export interface OrderRecord extends OrderRequest {
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

/** Kanal, über den ein Auftrag übermittelt/bestätigt wird (WhatsApp, E-Mail, DB …). */
export interface OrderChannel {
  submit(order: OrderRequest): Promise<{ reference: string }>;
}

/** Statusbenachrichtigungen an Kundinnen und Kunden. */
export interface NotificationService {
  notify(order: OrderRecord, status: OrderStatus): Promise<void>;
}

/** Online-Bezahlung (Phase 2: z. B. Stripe, Mollie, PayPal). */
export interface PaymentProvider {
  createCheckout(order: OrderRecord, amountCents: number): Promise<{ url: string }>;
}

/** Platzhalter-Implementierungen – absichtlich nicht funktional. */
export const whatsappBusiness: NotificationService = {
  async notify() {
    throw new NotImplementedError("WhatsApp Business API");
  },
};

export const transactionalEmail: NotificationService = {
  async notify() {
    throw new NotImplementedError("Transaktionaler E-Mail-Versand");
  },
};

export const payments: PaymentProvider = {
  async createCheckout() {
    throw new NotImplementedError("Online-Bezahlung");
  },
};
