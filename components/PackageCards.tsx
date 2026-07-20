import Link from "next/link";
import { Check } from "lucide-react";

/**
 * Drei Paket-Karten (Struktur-Vorbild: gängige SaaS-/Zulassungsdienst-Pricing-
 * Sektionen). Preise/Konditionen: siehe lib/services.ts bzw. Preisseite –
 * die Karten verlinken in den Auftrags-Assistenten bzw. zur Kontaktaufnahme.
 */
const packages = [
  {
    name: "Privat",
    tagline: "Für einzelne Fahrzeuge",
    price: "ab 24,90 €",
    priceNote: "je Vorgang, zzgl. amtl. Gebühren",
    features: [
      "Neuzulassung, Ummeldung & Abmeldung",
      "Digitale Vollmacht – keine eID nötig",
      "Kennzeichen inkl. Versand organisiert",
      "Persönliche Ansprechperson",
      "Support per WhatsApp & E-Mail",
    ],
    cta: { label: "Auswählen", href: "/auftrag/" },
    highlight: false,
  },
  {
    name: "Komplett-Service",
    tagline: "Unser Rundum-sorglos-Paket",
    price: "ab 79,90 €",
    priceNote: "je Zulassung, zzgl. amtl. Gebühren & Kennzeichen",
    features: [
      "Alles aus Privat inklusive",
      "Wunschkennzeichen-Reservierung",
      "Express-Bearbeitung nach Verfügbarkeit",
      "Dokumenten-Check vor Einreichung",
      "Statusupdates zu jedem Schritt",
      "Abhol-/Bringservice regional",
    ],
    cta: { label: "Auswählen", href: "/auftrag/" },
    highlight: true,
  },
  {
    name: "Autohaus & Gewerbe",
    tagline: "Für Händler, Flotten & Fuhrparks",
    price: "Individuell",
    priceNote: "Staffelpreise nach Volumen",
    features: [
      "Alles aus Komplett-Service inklusive",
      "Sammelabwicklung & Rahmenvollmacht",
      "Feste Konditionen je Vorgangsart",
      "Tägliche Abholung möglich",
      "Fester Ansprechpartner mit Direktdurchwahl",
    ],
    cta: { label: "Angebot anfordern", href: "/kontakt/" },
    highlight: false,
  },
] as const;

export default function PackageCards() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {packages.map((p) => (
        <div
          key={p.name}
          className={`relative flex flex-col rounded-2xl border-2 bg-white p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover ${
            p.highlight ? "border-brand-600" : "border-ink-200"
          }`}
        >
          {p.highlight && (
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-4 py-1 font-display text-xs font-bold uppercase tracking-wider text-white shadow-sm">
              Beliebt
            </span>
          )}
          <h3 className="font-display text-xl font-bold text-ink-900">{p.name}</h3>
          <p className="mt-1 text-sm text-ink-500">{p.tagline}</p>
          <p className="mt-4 font-display text-3xl font-bold text-brand-600">{p.price}</p>
          <p className="text-xs text-ink-500">{p.priceNote}</p>
          <ul className="mt-6 flex-1 space-y-3">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-700">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    p.highlight ? "bg-brand-600 text-white" : "bg-brand-100 text-brand-700"
                  }`}
                >
                  <Check className="h-3 w-3" aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <Link
            href={p.cta.href}
            className={`mt-7 rounded-xl px-6 py-3.5 text-center font-display text-sm font-semibold transition-colors duration-200 ${
              p.highlight
                ? "bg-brand-600 text-white hover:bg-brand-700"
                : "border-2 border-ink-200 text-ink-800 hover:border-brand-400 hover:bg-brand-50"
            }`}
          >
            {p.cta.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
