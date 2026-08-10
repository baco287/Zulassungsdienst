import type { Metadata } from "next";
import LegalPage from "@/components/LegalPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Impressum",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <LegalPage title="Impressum" placeholder={false}>
      <section>
        <h2>Angaben gemäß § 5 DDG</h2>
        <p>
          <strong>{site.name}</strong>
          <br />
          {site.company.brandNote}
        </p>
        <p>
          {site.company.legalName}
          <br />
          {site.company.street}
          <br />
          {site.company.zipCity}
          <br />
          Deutschland
        </p>
      </section>
      <section>
        <h2>Vertreten durch</h2>
        <p>Geschäftsführer: {site.company.responsible}</p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          Telefon: {site.contact.phoneDisplay}
          <br />
          E-Mail: {site.contact.email}
          <br />
          Website: www.deutschezulassung.de
        </p>
      </section>
      <section>
        <h2>Handelsregister</h2>
        <p>{site.company.register}</p>
      </section>
      <section>
        <h2>Umsatzsteuer</h2>
        <p>{site.company.vatId}</p>
      </section>
      <section>
        <h2>Tätigkeitsbereich</h2>
        <p>
          DeutscheZulassung erbringt Dienstleistungen rund um die Kfz-Zulassung
          (An-, Um- und Abmeldung von Fahrzeugen sowie damit verbundene
          Serviceleistungen). Die Vorgänge werden im Namen und im Auftrag der
          jeweiligen Kundinnen und Kunden auf Grundlage einer Vollmacht bei den
          zuständigen Zulassungsbehörden durchgeführt. DeutscheZulassung ist
          selbst keine Behörde und nicht mit einer Zulassungsstelle verbunden.
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
        <p>
          {site.company.responsible}, {site.company.street}, {site.company.zipCity}
        </p>
      </section>
      <section>
        <h2>Verbraucherstreitbeilegung</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor
          einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
    </LegalPage>
  );
}
