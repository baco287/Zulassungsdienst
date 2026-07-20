import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Widerrufsbelehrung",
  robots: { index: false },
};

export default function WiderrufPage() {
  return (
    <LegalPage title="Widerrufsbelehrung">
      <section>
        <h2>Widerrufsrecht für Verbraucher</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen den mit uns
          geschlossenen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab
          dem Tag des Vertragsabschlusses. Um Ihr Widerrufsrecht auszuüben, müssen Sie uns
          ({site.company.legalName}, {site.company.street}, {site.company.zipCity},
          E-Mail: {site.contact.email}) mittels einer eindeutigen Erklärung (z. B. per
          E-Mail) über Ihren Entschluss informieren.
        </p>
      </section>
      <section>
        <h2>Folgen des Widerrufs</h2>
        <p>
          Im Falle eines wirksamen Widerrufs erstatten wir Ihnen alle erhaltenen Zahlungen
          unverzüglich, spätestens binnen vierzehn Tagen ab Eingang des Widerrufs, unter
          Verwendung desselben Zahlungsmittels.
        </p>
      </section>
      <section>
        <h2>Vorzeitiges Erlöschen des Widerrufsrechts</h2>
        <p>
          Das Widerrufsrecht erlischt vorzeitig, wenn wir die Dienstleistung vollständig
          erbracht haben und mit der Ausführung erst begonnen haben, nachdem Sie dazu Ihre
          ausdrückliche Zustimmung gegeben und gleichzeitig Ihre Kenntnis davon bestätigt
          haben, dass Sie Ihr Widerrufsrecht bei vollständiger Vertragserfüllung durch uns
          verlieren (§ 356 Abs. 4 BGB). Beauftragen Sie uns ausdrücklich mit der
          sofortigen Durchführung der Zulassung, gilt Entsprechendes.
        </p>
      </section>
      <section>
        <h2>Muster-Widerrufsformular</h2>
        <p>
          [TODO: Muster-Widerrufsformular nach Anlage 2 zu Art. 246a EGBGB einfügen und
          gesamte Belehrung juristisch prüfen lassen.]
        </p>
      </section>
    </LegalPage>
  );
}
