import type { Metadata } from "next";
import { Clock4, Lock } from "lucide-react";
import UnterlagenForm from "@/components/UnterlagenForm";
import { site, whatsAppLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unterlagen hochladen",
  description:
    "Reichen Sie Fahrzeugschein, Ausweis und eVB-Nummer bequem online nach: Fotos mit dem Handy aufnehmen und sicher an KFZ-Zulassungsprofis übertragen.",
  // Kein Suchmaschinen-Eintrag: Die Seite wird per Link im Chat verschickt und
  // hat für Suchende keinen eigenständigen Nutzen.
  robots: { index: false, follow: true },
};

export default function UnterlagenPage() {
  return (
    <section className="bg-ink-50 py-14 sm:py-16">
      <div className="container-page grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="h-seite text-navy">
            Unterlagen hochladen
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Fahrzeugschein, Ausweis, eVB-Nummer: einfach mit dem Handy abfotografieren
            und hier hochladen. Scans und PDFs gehen genauso.
          </p>
          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6 sm:p-8">
            <UnterlagenForm />
          </div>
        </div>

        <aside className="space-y-5 lg:pt-24">
          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              Gute Fotos, schnellere Bearbeitung
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li className="flex gap-2">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                Dokument flach auf den Tisch legen, von oben fotografieren
              </li>
              <li className="flex gap-2">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                Alle vier Ecken müssen im Bild sein
              </li>
              <li className="flex gap-2">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                Kein Blitz – lieber ans Fenster stellen
              </li>
              <li className="flex gap-2">
                <span className="mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                Sicherheitscode am Fahrzeugschein vorher freilegen
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6">
            <h2 className="font-display text-base font-bold text-ink-900">
              Lieber per WhatsApp?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Sie können uns die Fotos auch einfach in den Chat schicken – dieselbe
              Bearbeitung, derselbe Ansprechpartner.
            </p>
            <a
              href={whatsAppLink("Hallo KFZ-Zulassungsprofis, ich möchte meine Unterlagen schicken.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-4 py-3 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
            >
              WhatsApp öffnen
            </a>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6 text-sm text-ink-600">
            <p className="flex items-start gap-2">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              Die Übertragung ist verschlüsselt. Ihre Unterlagen werden nicht auf dem
              Webserver gespeichert, sondern direkt an Ihre Ansprechperson zugestellt.
            </p>
            <p className="mt-3 flex items-start gap-2">
              <Clock4 className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
              Wir prüfen eingehende Unterlagen {site.contact.hours}.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
