import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  robots: { index: false },
};

export default function WiderrufPage() {
  return (
    <LegalPage title="Widerrufsbelehrung" placeholder={false}>
      <section>
        <h2>Widerrufsrecht für Verbraucher</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen den mit uns
          geschlossenen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab
          dem Tag des Vertragsabschlusses.
        </p>
        <p>
          Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ({site.company.legalName},{" "}
          {site.company.street}, {site.company.zipCity}, E-Mail: {site.contact.email},
          Telefon: {site.contact.phoneDisplay}) mittels einer eindeutigen Erklärung (z. B.
          ein mit der Post versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen
          Vertrag zu widerrufen, informieren. Sie können dafür das beigefügte
          Muster-Widerrufsformular verwenden, das jedoch nicht vorgeschrieben ist.
        </p>
        <p>
          Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie die Mitteilung über die
          Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absenden.
        </p>
      </section>
      <section>
        <h2>Folgen des Widerrufs</h2>
        <p>
          Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle Zahlungen, die wir von
          Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem
          Tag zurückzuzahlen, an dem die Mitteilung über Ihren Widerruf dieses Vertrags
          bei uns eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe
          Zahlungsmittel, das Sie bei der ursprünglichen Transaktion eingesetzt haben, es
          sei denn, mit Ihnen wurde ausdrücklich etwas anderes vereinbart; in keinem Fall
          werden Ihnen wegen dieser Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Haben Sie verlangt, dass die Dienstleistung während der Widerrufsfrist beginnen
          soll, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der
          bis zu dem Zeitpunkt, zu dem Sie uns von der Ausübung des Widerrufsrechts
          hinsichtlich dieses Vertrags unterrichten, bereits erbrachten Dienstleistungen
          im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen
          entspricht.
        </p>
      </section>
      <section>
        <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
        <p>
          Das Widerrufsrecht erlischt vorzeitig, wenn wir die Dienstleistung vollständig
          erbracht haben und mit der Ausführung der Dienstleistung erst begonnen haben,
          nachdem Sie dazu Ihre ausdrückliche Zustimmung gegeben und gleichzeitig Ihre
          Kenntnis davon bestätigt haben, dass Sie Ihr Widerrufsrecht bei vollständiger
          Vertragserfüllung durch uns verlieren (§ 356 Abs. 4 BGB).
        </p>
      </section>
      <section>
        <h2>Muster-Widerrufsformular</h2>
        <p>
          (Wenn Sie den Vertrag widerrufen wollen, dann füllen Sie bitte dieses Formular
          aus und senden Sie es zurück.)
        </p>
        <div
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "12px",
            padding: "1.25rem",
          }}
        >
          <p>
            An
            <br />
            {site.company.legalName}
            <br />
            {site.company.street}
            <br />
            {site.company.zipCity}
            <br />
            E-Mail: {site.contact.email}
          </p>
          <p>
            Hiermit widerrufe(n) ich/wir (*) den von mir/uns (*) abgeschlossenen Vertrag
            über den Kauf der folgenden Waren (*) / die Erbringung der folgenden
            Dienstleistung (*):
          </p>
          <p>
            Bestellt am (*) / erhalten am (*): ____________________
            <br />
            Name des/der Verbraucher(s): ____________________
            <br />
            Anschrift des/der Verbraucher(s): ____________________
            <br />
            Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier):
            ____________________
            <br />
            Datum: ____________________
          </p>
          <p>(*) Unzutreffendes streichen.</p>
        </div>
      </section>
    </LegalPage>
  );
}
