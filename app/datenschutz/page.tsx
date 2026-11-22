import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";
import { analyticsProvider, gadsId } from "@/lib/analytics";
import { ConsentReset } from "@/components/Analytics";
import { eigeneAnalyseAktiv } from "@/lib/eigeneAnalyse";

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
          Schriftdiensten statt.{" "}
          {analyticsProvider || gadsId || eigeneAnalyseAktiv
            ? "Welche Analyse- und Messdienste wir einsetzen, beschreibt der Abschnitt „Webanalyse und Werbemessung“."
            : "Diese Website verwendet keine Cookies, keine Analyse-Dienste und keine Tracking-Technologien."}
        </p>
      </section>
      {(analyticsProvider || gadsId || eigeneAnalyseAktiv) && (
        <section>
          <h2>2a. Webanalyse und Werbemessung</h2>
          {eigeneAnalyseAktiv && (
            <>
              <h3>Eigene Reichweitenmessung</h3>
              <p>
                Wir werten die Nutzung dieser Website mit einer eigenen Auswertung aus, die vollständig auf unserem
                Webserver bei ALL-INKL.COM läuft; es werden keine Daten an Dritte übermittelt. Dabei werden keine
                Cookies gesetzt und keine Informationen auf Ihrem Gerät gespeichert. Für die Dauer Ihres Besuchs
                erzeugt die Seite eine zufällige Sitzungskennung, die nur im Arbeitsspeicher des geöffneten
                Browser-Tabs liegt und beim Schließen oder Neuladen verloren geht. So können wir Seitenaufrufe eines
                Besuchs zusammenfassen, ohne Sie wiederzuerkennen.
              </p>
              <p>
                Erfasst werden: aufgerufene Seiten (ohne Parameter in der Adresse), Verweildauer, Scrolltiefe und
                Ladezeit, der Gerätetyp (Smartphone, Tablet oder Computer), die Domain der Website, von der Sie zu uns
                gekommen sind, Kampagnenangaben in der Adresse (utm-Parameter), technische Fehlermeldungen sowie
                anonyme Ereignisse wie Klicks auf „Jetzt zulassen“, WhatsApp, Telefon oder E-Mail, die gewählte
                Leistung und der Fortschritt im Auftrags-Assistenten. Nicht erfasst werden Namen, Kontakt-,
                Fahrzeug- und Ausweisdaten, Formularinhalte und Referenznummern. Ihre IP-Adresse wird nicht
                gespeichert; sie wird nur für wenige Minuten als nicht umkehrbarer Prüfwert verwendet, um Missbrauch
                abzuwehren. Die Daten werden nach spätestens 25 Monaten automatisch gelöscht.
                Rechtsgrundlage ist unser berechtigtes Interesse an einer bedarfsgerechten und technisch
                fehlerfreien Website (Art. 6 Abs. 1 lit. f DSGVO).
              </p>
            </>
          )}
          {analyticsProvider === "plausible" && (
            <p>
              Wir nutzen Plausible Analytics (Plausible Insights OÜ, Tartu, Estland) zur anonymen Reichweitenmessung.
              Plausible setzt keine Cookies und speichert keine IP-Adressen; erfasst werden aggregierte Angaben wie
              aufgerufene Seiten, Referrer, Gerätetyp und Land. Zusätzlich zählen wir anonyme Ereignisse wie den Start
              einer Anfrage oder einen Klick auf WhatsApp – ohne Namen, Kontakt-, Fahrzeug- oder Zahlungsdaten.
              Rechtsgrundlage ist unser berechtigtes Interesse an einer bedarfsgerechten Gestaltung der Website (Art. 6
              Abs. 1 lit. f DSGVO).
            </p>
          )}
          {analyticsProvider === "matomo" && (
            <p>
              Wir nutzen die Open-Source-Software Matomo, die auf unserem eigenen Server läuft, im cookielosen Modus.
              IP-Adressen werden vor der Speicherung gekürzt. Erfasst werden aggregierte Seitenaufrufe und anonyme
              Ereignisse wie der Start einer Anfrage – ohne Namen, Kontakt-, Fahrzeug- oder Zahlungsdaten.
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
            </p>
          )}
          {gadsId && (
            <>
              <p>
                Nur wenn Sie im Hinweisfenster ausdrücklich einwilligen, laden wir das Conversion-Tracking von Google
                Ads (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Es setzt ein Cookie, um zu
                erkennen, ob Sie über eine Anzeige zu uns gekommen sind und eine Anfrage gesendet haben. Dabei kann es
                zu einer Übermittlung in die USA kommen. Rechtsgrundlage ist Ihre Einwilligung (Art. 6 Abs. 1 lit. a
                DSGVO, § 25 Abs. 1 TDDDG), die Sie jederzeit widerrufen können:
              </p>
              <ConsentReset />
            </>
          )}
        </section>
      )}
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
        <h2>3a. KI-gestützte Bearbeitung von E-Mail-Anfragen</h2>
        <p>
          Damit wir E-Mails an {site.contact.email} zügig beantworten können, setzen wir
          ein KI-Sprachmodell ein. Es ordnet eingehende Nachrichten ein (zum Beispiel
          als Frage zu Preisen, Unterlagen oder einem laufenden Auftrag) und bereitet
          einen Antwort-Entwurf vor.{" "}
          <strong>
            Jede Antwort wird vor dem Versand von einer Mitarbeiterin oder einem
            Mitarbeiter gelesen, bei Bedarf geändert und freigegeben.
          </strong>{" "}
          Die KI versendet nichts selbst; eine automatisierte Entscheidung im Sinne
          von Art. 22 DSGVO findet nicht statt.
        </p>
        <h3>Eingesetzter Dienst</h3>
        <p>
          Wir nutzen dafür den KI-Dienst „Claude“ des Anbieters Anthropic.
          Vertragspartner für Kunden im Europäischen Wirtschaftsraum ist die Anthropic
          Ireland, Limited (Irland); die Verarbeitung erfolgt auf Servern in den USA.
          Mit dem Anbieter besteht ein Vertrag über Auftragsverarbeitung nach Art. 28
          DSGVO als Bestandteil seiner Geschäftsbedingungen. Die Übermittlung in die USA
          erfolgt auf Grundlage der Standardvertragsklauseln der Europäischen Kommission
          (Art. 46 Abs. 2 lit. c DSGVO). Nach Angaben von Anthropic werden die
          übermittelten Inhalte nicht zum Training von KI-Modellen verwendet und in der
          Regel nach 30 Tagen gelöscht.
        </p>
        <h3>Welche Daten übermittelt werden – und welche nicht</h3>
        <ul>
          <li>Übermittelt werden der Betreff und der Text Ihrer E-Mail (ohne zitierte
            frühere Nachrichten, sehr lange Texte gekürzt) – bei einem laufenden
            Schriftwechsel auch Kurzfassungen früherer Nachrichten, unsere letzte Antwort
            und noch unbeantwortete frühere E-Mails von Ihnen. Sehr kurze Antworten wie
            „Danke“ oder „Ja, bitte“ gehen nicht an den KI-Dienst.</li>
          <li>Anhänge, zum Beispiel Ausweis- oder Fahrzeugdokumente, werden nicht
            übermittelt – auch angehängte Textdateien nicht. Das Modell erfährt lediglich,
            ob und welche Art von Anhang (etwa Bild oder PDF) beigefügt ist.</li>
          <li>Kontonummern (IBAN), Fahrzeug-Identifizierungsnummern (am Stück oder mit
            vorangestelltem Stichwort wie „FIN“ auch gegliedert geschrieben) und lange
            Ziffernfolgen werden vor der Übermittlung unkenntlich gemacht.</li>
          <li>Name und E-Mail-Adresse aus dem Absender Ihrer E-Mail werden nicht
            übermittelt. Grußformel und Signatur am Ende Ihrer Nachricht (etwa Name,
            Anschrift, Telefonnummer) entfernen wir vorher, soweit sie sich erkennen
            lassen. Namen und Angaben, die Sie im Text selbst nennen, können übermittelt
            werden.</li>
          <li>Anfragen, die über unser Auftragsformular eingehen, werden nicht an den
            KI-Dienst übermittelt.</li>
        </ul>
        <h3>Speicherung bei uns</h3>
        <p>
          Zu den E-Mails, die in unserem Postfach eingehen, speichern wir Absender,
          Betreff, den bereinigten und gekürzten Text (ohne Zitate, ohne erkennbare
          Grußformel und Signatur; Kontonummern und Fahrzeug-Identifizierungsnummern
          unkenntlich gemacht), die Einordnung und – sofern
          einer erstellt wurde – den Antwort-Entwurf in einer Datenbank auf unserem
          Webserver in Deutschland (siehe Abschnitt 2), damit unsere Mitarbeiter die
          Nachricht einordnen und den Entwurf prüfen können. Spätestens nach 90 Tagen
          werden diese Angaben vollständig gelöscht; übrig bleiben nur Kostenzahlen der
          KI-Aufrufe und ein Protokoll unserer Arbeitsschritte, beides ohne Bezug zu Ihrer
          Nachricht. Anhänge werden dabei nicht gespeichert. Ihre E-Mail selbst bleibt wie
          jede andere E-Mail in unserem Postfach. Haben Sie der KI-Bearbeitung
          widersprochen oder sortieren wir E-Mails Ihrer Adresse dauerhaft aus (etwa
          Werbung), speichern wir Ihre E-Mail-Adresse in einer Liste, solange das dafür
          erforderlich ist.
        </p>
        <h3>Rechtsgrundlage und Widerspruch</h3>
        <p>
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Nachricht einen
          Auftrag oder dessen Anbahnung betrifft, im Übrigen unser berechtigtes Interesse
          an einer zügigen und einheitlichen Beantwortung von Anfragen (Art. 6 Abs. 1
          lit. f DSGVO). Wenn Sie nicht möchten, dass Ihre Nachrichten mit
          KI-Unterstützung bearbeitet werden, können Sie dem jederzeit formlos
          widersprechen – eine kurze E-Mail an {site.contact.email} genügt. Ihre
          weiteren Nachrichten bearbeiten dann ausschließlich unsere Mitarbeiter; das
          gilt auch für Nachrichten, die zu diesem Zeitpunkt schon bei uns eingegangen
          sind.
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
          Zur Durchführung des Auftrags übermitteln wir erforderliche Daten an
          (Art. 6 Abs. 1 lit. b DSGVO):
        </p>
        <ul>
          <li>den Anbieter unserer Zulassungssoftware, über die wir Anträge
            elektronisch einreichen (Auftragsverarbeitung nach Art. 28 DSGVO),</li>
          <li>den Vertrauensdiensteanbieter, über den Sie Ihre Identität bestätigen
            und die Vollmacht qualifiziert elektronisch signieren (§ 38 FZV),</li>
          <li>das Kraftfahrt-Bundesamt, das Anträge über seine
            Großkundenschnittstelle an die Zulassungsbehörde weiterleitet,</li>
          <li>die zuständige Zulassungsbehörde sowie</li>
          <li>gegebenenfalls Versanddienstleister und Kennzeichenhersteller.</li>
        </ul>
        <p>
          Eine Weitergabe zu anderen Zwecken, etwa zu Werbezwecken, erfolgt nicht.
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
