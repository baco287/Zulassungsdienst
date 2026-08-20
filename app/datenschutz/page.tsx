import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung" placeholder={false}>
      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {site.company.legalName}, {site.company.street}, {site.company.zipCity},
          E-Mail: {site.contact.email}, Telefon: {site.contact.phoneDisplay}.
        </p>
        <p>{site.company.brandNote}</p>
      </section>
      <section>
        <h2>2. Hosting und Server-Logfiles</h2>
        <p>
          Diese Website wird bei der ALL-INKL.COM – Neue Medien Münnich (Hauptstraße 68,
          02742 Friedersdorf, Deutschland) gehostet. Mit dem Hoster besteht ein Vertrag
          über Auftragsverarbeitung nach Art. 28 DSGVO. Beim Aufruf der Website
          verarbeitet der Hoster automatisch Informationen in sogenannten
          Server-Logfiles (IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene
          Seite, Browsertyp und Betriebssystem, Referrer-URL). Die Verarbeitung erfolgt
          auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO zur Sicherstellung eines
          störungsfreien und sicheren Betriebs. Die Logfiles werden nach den beim Hoster
          üblichen Fristen automatisch gelöscht.
        </p>
        <p>
          Schriftarten werden lokal von unserem Server geladen (Self-Hosting); es
          findet keine Verbindung zu Google Fonts oder anderen externen
          Schriftdiensten statt. Diese Website verwendet keine Cookies, keine
          Analyse-Dienste und keine Tracking-Technologien.
        </p>
      </section>
      <section>
        <h2>3. Anfrage- und Auftragsdaten</h2>
        <p>
          Bei Nutzung unseres Auftrags-Assistenten oder bei Kontaktaufnahme verarbeiten
          wir die von Ihnen angegebenen Daten (Name, Kontaktdaten, Fahrzeug- und
          Auftragsdaten sowie übermittelte Dokumente) ausschließlich zur Bearbeitung
          Ihrer Anfrage und zur Durchführung des Zulassungsauftrags (Art. 6 Abs. 1
          lit. b DSGVO).
        </p>
        <p>
          Wenn Sie das Formular absenden, werden Ihre Angaben verschlüsselt (TLS) an
          unseren Webserver übertragen und von dort unmittelbar als E-Mail an unser
          Postfach zugestellt. Sie erhalten dabei eine Referenznummer, über die Ihr
          Vorgang zugeordnet wird. Alternativ können Sie uns Ihre Anfrage weiterhin
          direkt per WhatsApp oder E-Mail senden.
        </p>
        <h3>Hochgeladene Unterlagen</h3>
        <p>
          Sie können uns Ihre Unterlagen (z. B. Zulassungsbescheinigung, Ausweisdokument,
          eVB-Nachweis) als Foto oder PDF über das Auftragsformular oder über die Seite
          „Unterlagen hochladen“ übermitteln. Diese Dateien werden{" "}
          <strong>nicht auf dem Webserver gespeichert</strong>: Sie werden während der
          Übertragung nur flüchtig verarbeitet, direkt an das genannte Postfach
          weitergeleitet und anschließend serverseitig verworfen. Ein Dokumentenarchiv
          auf dem Webserver besteht nicht.
        </p>
        <p>
          Die Übermittlung der Unterlagen erfolgt freiwillig auf Grundlage Ihrer
          Einwilligung (Art. 6 Abs. 1 lit. a DSGVO) sowie zur Vertragsdurchführung
          (Art. 6 Abs. 1 lit. b DSGVO); soweit Ausweisdaten betroffen sind, stützt sich
          die Verarbeitung zusätzlich auf § 20 PAuswG. Sie können Ihre Einwilligung
          jederzeit mit Wirkung für die Zukunft widerrufen. Sie sind nicht verpflichtet,
          Unterlagen über die Website zu übermitteln – der Versand per WhatsApp, E-Mail
          oder Post ist gleichwertig möglich.
        </p>
      </section>
      <section>
        <h2>4. WhatsApp-Kommunikation</h2>
        <p>
          Wenn Sie uns über WhatsApp kontaktieren, verarbeitet WhatsApp (Meta Platforms
          Ireland Ltd., Dublin, Irland) Ihre Daten nach eigenen Datenschutzbestimmungen;
          dabei kann es zu einer Übermittlung in Drittländer (USA) kommen. Die Nutzung
          von WhatsApp ist freiwillig – Sie können uns alternativ jederzeit per E-Mail
          oder Telefon erreichen. Übermitteln Sie sensible Dokumente über WhatsApp nur,
          wenn Sie mit dieser Verarbeitung einverstanden sind (Art. 6 Abs. 1 lit. a
          DSGVO).
        </p>
      </section>
      <section>
        <h2>5. Weitergabe an Behörden und Dienstleister</h2>
        <p>
          Zur Durchführung des Auftrags übermitteln wir erforderliche Daten an die
          zuständige Zulassungsbehörde sowie ggf. an Versanddienstleister und
          Kennzeichenhersteller (Art. 6 Abs. 1 lit. b DSGVO). Eine darüber hinausgehende
          Weitergabe an Dritte erfolgt nicht.
        </p>
      </section>
      <section>
        <h2>6. Speicherdauer</h2>
        <p>
          Auftrags- und Rechnungsdaten speichern wir für die Dauer der Abwicklung und
          anschließend im Rahmen der gesetzlichen Aufbewahrungspflichten (§ 147 AO,
          § 257 HGB: sechs bzw. zehn Jahre). Anfragedaten, aus denen kein Auftrag
          entsteht, löschen wir spätestens sechs Monate nach der letzten Kommunikation.
          Kopien von Ausweisdokumenten und Vollmachten löschen wir nach Abschluss des
          Auftrags, soweit keine gesetzliche Aufbewahrungspflicht besteht.
        </p>
      </section>
      <section>
        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16),
          Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
          Datenübertragbarkeit (Art. 20) sowie Widerspruch gegen Verarbeitungen auf
          Grundlage von Art. 6 Abs. 1 lit. f DSGVO (Art. 21). Erteilte Einwilligungen
          können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Sie haben
          außerdem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren;
          für uns zuständig ist die Berliner Beauftragte für Datenschutz und
          Informationsfreiheit, Alt-Moabit 59–61, 10555 Berlin.
        </p>
      </section>
    </LegalPage>
  );
}
