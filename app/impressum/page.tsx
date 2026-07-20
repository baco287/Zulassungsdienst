import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          {site.company.legalName}
          <br />
          {site.company.street}
          <br />
          {site.company.zipCity}
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {site.contact.phoneDisplay}
          <br />
          E-Mail: {site.contact.email}
        </p>
      </section>
      <section>
        <h2>Registereintrag</h2>
        <p>{site.company.register}</p>
      </section>
      <section>
        <h2>Umsatzsteuer-ID</h2>
        <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG: {site.company.vatId}</p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>{site.company.responsible}</p>
      </section>
      <section>
        <h2>EU-Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
          bereit: https://ec.europa.eu/consumers/odr/. Wir sind nicht bereit oder
          verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalPage>
  );
}
