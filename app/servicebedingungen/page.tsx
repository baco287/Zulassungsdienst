import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { P, PRICE_DATE } from "@/lib/pricing";
import { site } from "@/lib/site";
import { SERVICEBEDINGUNGEN_FREIGEGEBEN } from "@/lib/features";
import { ZEIT } from "@/lib/betrieb";

export const metadata: Metadata = {
  title: "Servicebedingungen – verständlich erklärt",
  description:
    "Was DeutscheZulassung leistet, was wir von Ihnen brauchen, wie Preise und Bezahlung funktionieren und was gilt, wenn die Behörde einen Antrag ablehnt.",
  alternates: { canonical: "/servicebedingungen/" },
  // Entwurf: erst nach rechtlicher Prüfung indexieren (lib/features.ts).
  robots: SERVICEBEDINGUNGEN_FREIGEGEBEN ? { index: true, follow: true } : { index: false, follow: true },
};

/**
 * ENTWURF – vor der Veröffentlichung juristisch prüfen lassen.
 * Inhalte decken sich mit FAQ, Preisseite und Widerrufsbelehrung.
 */
export default function ServicebedingungenPage() {
  return (
    <LegalPage title="Servicebedingungen" placeholder={false}>
      <p>
        Hier fassen wir zusammen, wie eine Beauftragung bei {site.name} funktioniert. Die Widerrufsbelehrung und die
        Datenschutzerklärung gelten ergänzend.
      </p>

      <section>
        <h2>1. Wer wir sind</h2>
        <p>
          {site.company.brandNote} {site.name} ist ein privater Zulassungsdienst und keine Behörde. Wir handeln im Auftrag
          und mit Vollmacht unserer Kundinnen und Kunden. Über jede Zulassung, Umschreibung oder Abmeldung entscheidet die
          zuständige Zulassungsbehörde.
        </p>
      </section>

      <section>
        <h2>2. Was wir leisten</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Prüfung Ihrer Unterlagen auf Vollständigkeit und Rückfragen, wenn etwas fehlt</li>
          <li>Einreichung des Antrags mit Ihrer Vollmacht bei der zuständigen Zulassungsbehörde</li>
          <li>Versand der Zulassungsdokumente an Sie; Abmeldebestätigungen per E-Mail</li>
          <li>Auf Wunsch: Kennzeichenschilder und Wunschkennzeichen-Service</li>
          <li>Eine feste Ansprechperson während des gesamten Auftrags ({site.contact.hours})</li>
        </ul>
        <p>
          Auf die Bearbeitungsdauer und Entscheidung der Behörde haben wir keinen Einfluss. Unsere Zeitangaben (in der
          Regel {ZEIT.zulassung} ab vollständigen Unterlagen und Zahlungseingang, Abmeldungen meist {ZEIT.abmeldung}) sind Erfahrungswerte, keine
          Garantie.
        </p>
      </section>

      <section>
        <h2>3. Was wir von Ihnen brauchen</h2>
        <p>
          Damit wir den Antrag stellen können, benötigen wir vollständige und richtige Angaben, lesbare Fotos oder Scans
          der erforderlichen Unterlagen, eine gültige eVB-Nummer Ihrer Versicherung, ein SEPA-Lastschriftmandat für die
          Kfz-Steuer (bei Zulassungen) und Ihre unterschriebene Vollmacht. Welche Unterlagen Sie genau brauchen, zeigt die
          Checkliste der jeweiligen{" "}
          <Link href="/leistungen/" className="font-semibold text-brand-700 underline">
            Leistung
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>4. Preise</h2>
        <p>
          Es gelten die Festpreise unserer{" "}
          <Link href="/preise/" className="font-semibold text-brand-700 underline">
            Preisübersicht
          </Link>{" "}
          (Stand {new Date(PRICE_DATE).toLocaleDateString("de-DE")}), jeweils inklusive Mehrwertsteuer. Bei
          Zulassungsleistungen ({P.zulassung}) sind die amtlichen Gebühren und der Versand der Dokumente enthalten, die
          Abmeldung kostet {P.abmeldung} komplett. Kennzeichenschilder ({P.kennzeichen} pro Paar) und der
          Wunschkennzeichen-Service ({P.wunschkennzeichen}) sind optional. Sonderfälle wie Sondergrößen oder
          Express-Wünsche nennen wir Ihnen vorab. Bevor wir starten, erhalten Sie eine verbindliche Festpreis-Bestätigung.
        </p>
      </section>

      <section>
        <h2>5. Bezahlung</h2>
        <p>
          Mit der Festpreis-Bestätigung erhalten Sie unsere Rechnung. Sie zahlen per Überweisung. Nach Zahlungseingang
          reichen wir den Vorgang bei der Behörde ein beziehungsweise versenden Kennzeichen und Dokumente.
        </p>
      </section>

      <section>
        <h2>6. Wenn die Behörde ablehnt</h2>
        <p>
          Ist ein Vorgang trotz vollständiger Mitwirkung nicht durchführbar, berechnen wir keinen Servicepreis. Einen
          bereits gezahlten Betrag erstatten wir abzüglich der nachweislich an die Behörde gezahlten amtlichen Gebühren.
        </p>
      </section>

      <section>
        <h2>7. Widerruf</h2>
        <p>
          Als Verbraucherin oder Verbraucher haben Sie ein gesetzliches Widerrufsrecht. Einzelheiten und das
          Muster-Widerrufsformular finden Sie in der{" "}
          <Link href="/widerruf/" className="font-semibold text-brand-700 underline">
            Widerrufsbelehrung
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>8. Datenschutz</h2>
        <p>
          Wie wir mit Ihren Daten umgehen, erklären wir in der{" "}
          <Link href="/datenschutz/" className="font-semibold text-brand-700 underline">
            Datenschutzerklärung
          </Link>{" "}
          und verständlich zusammengefasst auf der Seite{" "}
          <Link href="/datensicherheit/" className="font-semibold text-brand-700 underline">
            Datensicherheit
          </Link>
          .
        </p>
      </section>

      <section>
        <h2>9. Kontakt</h2>
        <p>
          {site.company.legalName}, {site.company.street}, {site.company.zipCity} · {site.contact.email} ·{" "}
          {site.contact.phoneDisplay}
        </p>
      </section>
    </LegalPage>
  );
}
