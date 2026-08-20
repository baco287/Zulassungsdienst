import Image from "next/image";
import { AlertTriangle, Camera } from "lucide-react";

/**
 * Bildanleitung: Wo stecken die verdeckten Sicherheitscodes und wie werden
 * sie freigelegt? Wird auf der Abmeldung-Leistungsseite und in passenden
 * Ratgeber-Artikeln eingebunden.
 *
 * variant "abmeldung": nur ZB I + Kennzeichen (mehr braucht die Abmeldung nicht)
 * variant "zulassung": zusätzlich ZB II (für i-Kfz-Zulassung/-Umschreibung)
 */

interface Step {
  src: string;
  alt: string;
  title: string;
  text: string;
}

const steps: Record<"zb1" | "zb2" | "kennzeichen", Step> = {
  zb1: {
    src: "/images/sicherheitscode-zb1.jpg",
    alt: "Freigerubbeltes Sicherheitscode-Feld auf der Zulassungsbescheinigung Teil I mit Münze",
    title: "Fahrzeugschein (ZB Teil I)",
    text: "Das verdeckte Feld mit einer Münze vorsichtig freirubbeln – darunter erscheint der 7-stellige Sicherheitscode.",
  },
  zb2: {
    src: "/images/sicherheitscode-zb2.jpg",
    alt: "Finger zeigt auf das verdeckte Sicherheitsfeld der Zulassungsbescheinigung Teil II",
    title: "Fahrzeugbrief (ZB Teil II)",
    text: "Für Zulassung und Halterwechsel: das silberne Sicherheitsfeld im Fahrzeugbrief freilegen.",
  },
  kennzeichen: {
    src: "/images/sicherheitscode-kennzeichen.jpg",
    alt: "Teilweise abgezogene Stempelplakette auf dem Kennzeichen mit sichtbarem 3-stelligem Code",
    title: "Kennzeichen-Plaketten",
    text: "Die Stempelplakette (Landessiegel) auf beiden Kennzeichen vorsichtig ablösen – darunter steht der 3-stellige Plaketten-Code.",
  },
};

export default function SecurityCodeGuide({
  variant = "abmeldung",
}: {
  variant?: "abmeldung" | "zulassung";
}) {
  const shown =
    variant === "zulassung"
      ? [steps.zb1, steps.zb2, steps.kennzeichen]
      : [steps.zb1, steps.kennzeichen];

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-ink-900">
        So legen Sie die Sicherheitscodes frei
      </h2>
      <p className="mt-3 leading-relaxed text-ink-700">
        Seit 2015 tragen Fahrzeugdokumente und Kennzeichen-Plaketten verdeckte
        Sicherheitscodes. So finden Sie sie – und so sehen die freigelegten Felder aus:
      </p>
      <div className={`mt-6 grid gap-5 sm:grid-cols-2 ${shown.length === 3 ? "lg:grid-cols-3" : ""}`}>
        {shown.map((step, i) => (
          <figure
            key={step.title}
            className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card"
          >
            <div className="relative">
              <Image
                src={step.src}
                alt={step.alt}
                width={1264}
                height={848}
                className="h-auto w-full"
                sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
              />
              <span className="absolute left-3 top-3 rounded-full bg-brand-700 px-3 py-1 font-display text-xs font-bold text-white">
                Schritt {i + 1}
              </span>
            </div>
            <figcaption className="p-4">
              <p className="font-display font-bold text-ink-900">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">{step.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        <p className="flex items-start gap-2 rounded-xl bg-accent-400/15 p-4 text-sm leading-relaxed text-ink-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-600" aria-hidden />
          Wichtig: Ein freigelegter Code entwertet das jeweilige Dokument bzw. die
          Plakette. Legen Sie die Codes erst frei, wenn der Vorgang wirklich
          durchgeführt werden soll – im Zweifel fragen Sie uns vorher kurz.
        </p>
        <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-600">
          <Camera className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden />
          Danach einfach alle freigelegten Codes gut lesbar fotografieren und uns die
          Bilder per Formular oder WhatsApp senden – den Rest übernehmen wir.
        </p>
      </div>
    </div>
  );
}
