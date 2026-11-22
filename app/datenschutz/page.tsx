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
      <section id="kennzeichenassistent" className="scroll-mt-24">
        <h2>3a. KI-Kennzeichenassistent</h2>
        <p>
          Mit dem Kennzeichenassistenten (Wunschkennzeichen-Generator) können Sie ohne Anmeldung Ideen für ein
          Wunschkennzeichen entwickeln. Die Nutzung ist freiwillig.
        </p>
        <h3>Verarbeitung in Ihrem Browser</h3>
        <p>
          Initialen, Namen, Daten und Zahlen, die der Assistent erkennt, verarbeitet er in Ihrem Browser; daraus werden
          nur Buchstaben und Ziffern für die Vorschläge gebildet. Was Sie über die Schaltflächen „Meine Initialen“, „Mein
          Name“, „Geburtstag oder Jahrestag“, „Meine Glückszahl“ und „Für uns zwei“ eingeben, verlässt Ihren Browser
          nicht. Den Zulassungsbezirk, den Sie wählen, zählen wir ohne Bezug zu Ihrer Person für unsere
          Reichweitenmessung; Kombinationen zählen wir dabei nicht.
        </p>
        <p>
          Wenn Sie Kennzeichen merken, speichert Ihr Browser die Merkliste lokal auf Ihrem Gerät (Kombination und
          Bezirk, höchstens zwölf Einträge). Wählen Sie ein Kennzeichen aus, legt der Browser die Auswahl bis zum
          Schließen des Tabs ab, höchstens zwei Stunden lang, damit das Auftragsformular sie übernehmen kann. Beides
          dient ausschließlich der von Ihnen gewünschten Funktion (§ 25 Abs. 2 Nr. 2 TDDDG); Sie können die Merkliste
          jederzeit über „Merkliste leeren“ löschen.
        </p>
        <h3>KI-Ideen über einen Dienstleister</h3>
        <p>
          Tippen Sie einen Wunsch frei ein, den der Assistent nicht selbst versteht (etwa ein Hobby), oder nutzen Sie
          „KI, überrasche mich!“, lassen wir Ideen von einem KI-Sprachmodell erstellen. Dazu überträgt unser Webserver an
          Anthropic (Claude API): den nicht verstandenen Teil Ihres Textes (höchstens 300 Zeichen), das gewählte
          Kennzeichenkürzel, den gewünschten Stil und die bereits genannten Buchstaben und Ziffern. Vom Assistenten
          erkannte Namen und Datumsangaben schneiden wir vorher heraus; erkannte E-Mail-Adressen, Internetadressen und
          Telefonnummern werden entfernt oder die Anfrage wird abgelehnt. Ihre IP-Adresse und Kontaktdaten übermitteln
          wir nicht. Bitte tippen Sie keine Adressen und keine Namen anderer Personen ein – was der Assistent nicht als
          Name erkennt, kann im übertragenen Text stehen bleiben.
        </p>
        <p>
          Anthropic verarbeitet die Daten in unserem Auftrag (Art. 28 DSGVO). Dabei kann eine Übermittlung in die USA
          stattfinden; sie ist durch Standardvertragsklauseln der EU-Kommission abgesichert. Rechtsgrundlage ist unser
          berechtigtes Interesse, Ihnen eine komfortable Ideenfindung anzubieten (Art. 6 Abs. 1 lit. f DSGVO). Die
          Vorschläge der KI sind unverbindliche Ideen; eine automatisierte Entscheidung mit rechtlicher Wirkung findet
          nicht statt.
        </p>
        <h3>Was wir speichern</h3>
        <p>
          Wir speichern weder Ihre Texte noch die Ihnen vorgeschlagenen oder von Ihnen gewählten Kombinationen. Für
          „KI, überrasche mich!“ halten wir je Kennzeichenkürzel, Stil und Kennzeichenart bis zu 30 Tage einen
          allgemeinen Vorrat an KI-Ideen vor – ohne Bezug zu einer Anfrage oder Person. Zur Kostenkontrolle
          protokollieren wir je KI-Anfrage den Zeitpunkt, das Kennzeichenkürzel, den Stil, den Umfang (Anzahl der
          verarbeiteten Textbausteine), die geschätzten Kosten und das Ergebnis. Diese Einträge löschen wir automatisch,
          sobald sie älter als 14 Monate sind (bei der nächsten Nutzung des Assistenten oder unserer Auswertung). Zum
          Schutz vor Missbrauch zählt der Server Anfragen je Anschluss über einen nicht rückrechenbaren Kennwert; er
          wird nach Ablauf seines Zeitfensters (höchstens 24 Stunden) bei der nächsten Anfrage gelöscht.
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
          Für den Kennzeichenassistenten setzen wir zusätzlich einen KI-Dienstleister ein; Einzelheiten stehen in
          Abschnitt 3a.
        </p>
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
