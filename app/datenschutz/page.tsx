import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {site.company.legalName}, {site.company.street}, {site.company.zipCity},
          E-Mail: {site.contact.email}
        </p>
      </section>
      <section>
        <h2>2. Welche Daten wir verarbeiten</h2>
        <p>
          Bei Nutzung unseres Auftrags- und Kontaktformulars verarbeiten wir die von Ihnen
          angegebenen Daten (Name, Kontaktdaten, Fahrzeug- und Auftragsdaten sowie
          hochgeladene Dokumente) ausschließlich zur Bearbeitung Ihrer Anfrage und zur
          Durchführung des Zulassungsauftrags (Art. 6 Abs. 1 lit. b DSGVO).
        </p>
      </section>
      <section>
        <h2>3. WhatsApp-Kommunikation</h2>
        <p>
          Wenn Sie uns über WhatsApp kontaktieren, gelten ergänzend die
          Datenschutzhinweise von WhatsApp (Meta Platforms Ireland Ltd.). Übermitteln Sie
          sensible Dokumente nur, wenn Sie mit der Verarbeitung über WhatsApp
          einverstanden sind – alternativ steht Ihnen unser Formular- und E-Mail-Weg offen.
          [TODO: Bei Einführung der WhatsApp Business API Abschnitt um
          Auftragsverarbeitung und Speicherfristen ergänzen.]
        </p>
      </section>
      <section>
        <h2>4. Weitergabe an Behörden und Dienstleister</h2>
        <p>
          Zur Durchführung des Auftrags übermitteln wir erforderliche Daten an die
          zuständige Zulassungsbehörde sowie ggf. an Versanddienstleister und
          Kennzeichenhersteller. Eine darüberhinausgehende Weitergabe erfolgt nicht.
        </p>
      </section>
      <section>
        <h2>5. Speicherdauer</h2>
        <p>
          Auftragsdaten speichern wir nur so lange, wie es für die Abwicklung und die
          gesetzlichen Aufbewahrungspflichten (insb. § 147 AO: bis zu 10 Jahre für
          Rechnungsdaten) erforderlich ist. Anfragedaten ohne Auftrag löschen wir
          spätestens nach [TODO: Frist festlegen, z. B. 6 Monaten].
        </p>
      </section>
      <section>
        <h2>6. Hosting & Server-Logs</h2>
        <p>
          [TODO: Hosting-Anbieter benennen (z. B. Vercel, IONOS …), AV-Vertrag
          schließen und Abschnitt zu Server-Logfiles, TLS-Verschlüsselung und ggf.
          CDN ergänzen.] Diese Website verwendet keine Tracking-Cookies und keine
          Analyse-Dienste.
        </p>
      </section>
      <section>
        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20)
          sowie Widerspruch (Art. 21). Erteilte Einwilligungen können Sie jederzeit mit
          Wirkung für die Zukunft widerrufen. Beschwerden richten Sie an die für Sie
          zuständige Datenschutz-Aufsichtsbehörde.
        </p>
      </section>
    </LegalPage>
  );
}
