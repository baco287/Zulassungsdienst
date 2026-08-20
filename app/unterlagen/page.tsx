import type { Metadata } from "next";
import { Camera, Clock4, Lock } from "lucide-react";
import UnterlagenForm from "@/components/UnterlagenForm";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { site, whatsAppLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Unterlagen hochladen",
  description:
    "Reichen Sie Fahrzeugschein, Ausweis und eVB-Nummer bequem online nach: Fotos mit dem Handy aufnehmen und sicher an DeutscheZulassung übertragen.",
  // Kein Suchmaschinen-Eintrag: Die Seite wird per Link im Chat verschickt und
  // hat für Suchende keinen eigenständigen Nutzen.
  robots: { index: false, follow: true },
};

export default function UnterlagenPage() {
  return (
    <section className="bg-ink-50 py-14 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <h1 className="font-display text-4xl font-bold text-ink-900 sm:text-5xl">
            Unterlagen hochladen
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-600">
            Fahrzeugschein, Ausweis, eVB-Nummer: einfach mit dem Handy abfotografieren
            und hier hochladen. Scans und PDFs gehen genauso.
          </p>
          <div className="mt-8 rounded-2xl border border-ink-200 bg-white p-6 shadow-card sm:p-8">
            <UnterlagenForm />
          </div>
        </div>

        <aside className="space-y-5 lg:pt-24">
          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <Camera className="h-5 w-5 text-brand-700" aria-hidden />
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

          <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-card">
            <h2 className="flex items-center gap-2 font-display text-base font-bold text-ink-900">
              <WhatsAppIcon className="h-5 w-5 text-brand-700" />
              Lieber per WhatsApp?
            </h2>
            <p className="mt-2 text-sm text-ink-600">
              Sie können uns die Fotos auch einfach in den Chat schicken – dieselbe
              Bearbeitung, derselbe Ansprechpartner.
            </p>
            <a
              href={whatsAppLink("Hallo DeutscheZulassung, ich möchte meine Unterlagen schicken.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-3 font-display text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-800"
            >
              WhatsApp öffnen
            </a>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white p-6 text-sm text-ink-600 shadow-card">
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
