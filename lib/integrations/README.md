# Integrationen (Phase 2+) — Architektur-Vorbereitung

Dieses Verzeichnis enthält **typisierte Schnittstellen-Definitionen** für die geplanten
Automatisierungen. In Phase 1 ist **bewusst nichts davon implementiert** — es gibt keine
simulierten Integrationen, die produktiv wirken. Der Online-Auftrag läuft in Phase 1 über
zwei reale Kanäle: vorbefüllte WhatsApp-Nachricht (`wa.me`) und vorbefüllte E-Mail (`mailto:`).

## Geplante Module

| Modul | Datei | Zweck |
|---|---|---|
| WhatsApp Business API | `whatsapp.ts` | Auftragsbestätigungen, Statusbenachrichtigungen |
| E-Mail-Versand | `email.ts` | Transaktionsmails (Bestätigung, Status, Rechnung) |
| Zahlungen | `payment.ts` | Online-Bezahlung (z. B. Stripe/PayPal/Mollie) |
| Auftrags-Backend | `orders.ts` | Persistenz, Status-Workflow, Kundenkonto |
| CRM | `crm.ts` | Kunden- und Händlerverwaltung |

## Migrationspfad (statisch → dynamisch)

1. `output: "export"` aus `next.config.ts` entfernen und auf Node-Host deployen.
2. `app/api/auftrag/route.ts` anlegen; `OrderRequest` (aus `lib/types.ts`) validieren.
3. `OrderChannel`-Implementierungen registrieren (WhatsApp/E-Mail/DB) — die Interfaces hier sind die Verträge.
4. Kundenkonto & Statusseite: Auth (z. B. Auth.js) + `orders.ts`-Backend.
5. DSGVO: Auftragsverarbeitungsverträge mit allen Anbietern, Löschkonzept, Verzeichnis von Verarbeitungstätigkeiten.

Alle Module werfen in Phase 1 `NotImplementedError`, damit ein versehentlicher
Produktiv-Aufruf sofort auffällt statt still zu scheitern.
