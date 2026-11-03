import type { Metadata } from "next";
import Link from "next/link";
import { EyeOff, Lock, Mail, Server, ShieldCheck, Trash2, Users } from "lucide-react";
import Breadcrumbs from "@/components/Breadcrumbs";
import CTASection from "@/components/CTASection";
import Reveal from "@/components/Reveal";
import { analyticsProvider, gadsId } from "@/lib/analytics";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datensicherheit: So schützen wir Ihre Unterlagen",
  description:
    "Wie DeutscheZulassung mit Fahrzeugpapieren und Ausweiskopien umgeht: verschlüsselte Übertragung, kein Dokumentenarchiv auf dem Webserver, Löschung nach Abschluss.",
  alternates: { canonical: "/datensicherheit/" },
};

const points = [
  {
    icon: Lock,
    title: "Verschlüsselte Übertragung",
    text: "Die gesamte Website läuft ausschließlich über HTTPS. Formulardaten und hochgeladene Unterlagen werden auf dem Weg zu uns per TLS verschlüsselt.",
  },
  {
    icon: Server,
    title: "Kein Dokumentenarchiv auf dem Webserver",
    text: "Unterlagen aus dem Auftragsformular werden nicht auf dem Webserver gespeichert, sondern direkt als E-Mail an unser Auftragspostfach zugestellt und danach serverseitig verworfen.",
  },
  {
    icon: Users,
    title: "Nur für Ihren Auftrag",
    text: "Ihre Daten nutzen wir ausschließlich, um Ihren Zulassungsauftrag zu bearbeiten. Weitergegeben werden sie nur, soweit nötig: an die zuständige Zulassungsbehörde sowie gegebenenfalls an Versanddienstleister und Kennzeichenhersteller.",
  },
  {
    icon: Trash2,
    title: "Löschung nach Abschluss",
    text: "Kopien von Ausweisdokumenten und Vollmachten löschen wir nach Abschluss des Auftrags, soweit keine gesetzliche Aufbewahrungspflicht besteht. Rechnungsdaten bewahren wir nach den steuerlichen Vorschriften auf.",
  },
  {
    icon: ShieldCheck,
    title: "Hosting in Deutschland",
    text: "Die Website liegt bei ALL-INKL.COM – Neue Medien Münnich in Friedersdorf (Sachsen). Mit dem Hoster besteht ein Vertrag über Auftragsverarbeitung nach Art. 28 DSGVO.",
  },
  {
    icon: EyeOff,
    title: analyticsProvider || gadsId ? "Sparsame Webanalyse" : "Keine Tracking-Cookies",
    text:
      analyticsProvider || gadsId
        ? "Wir messen die Nutzung der Website nur anonym und ohne Cookies. Werbe-Cookies setzen wir ausschließlich nach Ihrer ausdrücklichen Einwilligung. Formular- und Fahrzeugdaten fließen nie in die Webanalyse."
        : "Die Website setzt keine Tracking-Cookies und bindet keine Analyse- oder Werbedienste ein. Schriftarten laden wir vom eigenen Server.",
  },
];

export default function DatensicherheitPage() {
  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 via-brand-50/40 to-white py-12 sm:py-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Breadcrumbs items={[{ name: "Datensicherheit" }]} />
          <h1 className="mt-6 font-display text-3xl font-bold text-ink-900 sm:text-4xl">
            So schützen wir Ihre Unterlagen
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-600">
            Für eine Zulassung brauchen wir sensible Dokumente: Fahrzeugpapiere, eine Ausweiskopie, manchmal einen
            Kaufvertrag. Hier erklären wir verständlich, was mit diesen Daten passiert. Die rechtlich verbindlichen
            Angaben stehen in unserer{" "}
            <Link href="/datenschutz/" className="font-semibold text-brand-700 underline underline-offset-2">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-12 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2">
          {points.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.04}>
              <div className="h-full rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <p.icon className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-ink-900">{p.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Ihre Ausweiskopie</h2>
            <p className="mt-4 leading-relaxed text-ink-700">
              Für die Zulassung benötigt die Behörde die Identität der Halterin oder des Halters. Wir brauchen deshalb ein
              gut lesbares Foto oder einen Scan Ihres Ausweises. Kennzeichnen Sie die Kopie gern als „Kopie“. Angaben, die
              für die Zulassung nicht benötigt werden – etwa die Zugangsnummer und die Seriennummer des Ausweises – dürfen
              Sie vor dem Senden schwärzen.
            </p>
          </section>
        </Reveal>

        <Reveal>
          <section>
            <h2 className="font-display text-2xl font-bold text-ink-900">Wege, uns Unterlagen zu senden</h2>
            <ul className="mt-4 space-y-3 text-ink-700">
              <li className="flex gap-3">
                <Lock className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <strong>Online-Formular:</strong> verschlüsselte Übertragung, Zustellung direkt an unser Postfach.{" "}
                  <Link href="/unterlagen/" className="font-semibold text-brand-700 underline">
                    Unterlagen hochladen
                  </Link>
                </span>
              </li>
              <li className="flex gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <strong>E-Mail:</strong> an {site.contact.email}.
                </span>
              </li>
              <li className="flex gap-3">
                <Users className="mt-1 h-5 w-5 shrink-0 text-brand-700" aria-hidden />
                <span>
                  <strong>WhatsApp:</strong> bequem, aber ein Dienst von Meta Platforms. Nutzen Sie WhatsApp für Dokumente
                  nur, wenn Sie mit dessen Datenverarbeitung einverstanden sind – die anderen Wege sind gleichwertig.
                </span>
              </li>
            </ul>
          </section>
        </Reveal>

        <p className="rounded-2xl border border-ink-200 bg-ink-50/60 p-5 text-sm text-ink-700">
          Fragen zum Datenschutz oder Wunsch nach Auskunft oder Löschung? Schreiben Sie an{" "}
          <a href={`mailto:${site.contact.email}`} className="font-semibold text-brand-700 underline">
            {site.contact.email}
          </a>
          . Verantwortlich ist die {site.company.legalName}, {site.company.street}, {site.company.zipCity}.
        </p>
      </div>

      <CTASection />
    </>
  );
}
