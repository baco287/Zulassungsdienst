"use client";

import { forwardRef, useId, useState } from "react";
import KennzeichenSchild from "./KennzeichenSchild";
import { StatusZeile } from "./VorschlagKarte";
import { schreibweise } from "@/lib/kennzeichen/regeln";
import { teile, whatsAppTeilLink } from "@/lib/kennzeichen/teilen";
import type { Bezirk, Kombination, Verfuegbarkeit } from "@/lib/kennzeichen/typen";
import { P } from "@/lib/pricing";

interface Props {
  auswahl: Kombination;
  bezirk: Bezirk;
  status: Verfuegbarkeit;
  gemerkt: boolean;
  /** Wunschkennzeichen-Service ausdrücklich gewählt (nie vorbelegt). */
  service: boolean;
  onService: (an: boolean) => void;
  onWeiter: (leistung: "neuzulassung" | "ummeldung") => void;
  onMerken: () => void;
  onGeteilt: () => void;
}

/**
 * Der Übergang zum Auftrag: gewähltes Kennzeichen, Klartext zur Reservierung und die
 * zwei häufigsten Zulassungsarten. Der kostenpflichtige Wunschkennzeichen-Service ist
 * ein Kästchen, das der Kunde selbst anhakt.
 */
const Abschluss = forwardRef<HTMLHeadingElement, Props>(function Abschluss(
  { auswahl, bezirk, status, gemerkt, service, onService, onWeiter, onMerken, onGeteilt },
  ref,
) {
  const id = useId();
  const [teilMeldung, setTeilMeldung] = useState("");
  const name = schreibweise(auswahl);

  const teilen = async () => {
    const ergebnis = await teile(auswahl);
    if (ergebnis === "geteilt" || ergebnis === "kopiert") onGeteilt();
    setTeilMeldung(
      ergebnis === "kopiert"
        ? "Text kopiert – du kannst ihn jetzt einfügen."
        : ergebnis === "nicht_moeglich"
          ? "Teilen ist auf diesem Gerät nicht möglich."
          : "",
    );
  };

  return (
    <section aria-labelledby={`${id}-titel`} className="tafel tafel-breit mt-8">
      <div className="grid gap-x-10 gap-y-6 px-4 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
        <div>
          <KennzeichenSchild kuerzel={auswahl.kuerzel} buchstaben={auswahl.buchstaben} ziffern={auswahl.ziffern} zusatz={auswahl.zusatz} wechsel={name} />
          <div className="mt-3">
            <StatusZeile v={status} />
          </div>
          <p className="mt-1 text-sm text-ink-600">Zulassungsbezirk {bezirk.name}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[0.9375rem]">
            <button type="button" className="link inline-flex min-h-11 items-center" onClick={teilen}>
              Vorschau teilen
            </button>
            <a href={whatsAppTeilLink(auswahl)} target="_blank" rel="noopener noreferrer" className="link inline-flex min-h-11 items-center" onClick={onGeteilt}>
              Per WhatsApp senden
            </a>
          </div>
          <p className="min-h-[1.25rem] text-sm text-ink-600" role="status">
            {teilMeldung}
          </p>
        </div>

        <div>
          <h2 ref={ref} id={`${id}-titel`} tabIndex={-1} className="h-abschnitt text-navy focus:outline-none">
            Dein Wunschkennzeichen steht fest?
          </h2>
          <p className="mt-3 text-lg leading-relaxed text-ink-600">
            Wir helfen dir bei der passenden Fahrzeugzulassung – ohne Behördentermin. {name} und der Bezirk {bezirk.name}{" "}
            gehen direkt mit in deinen Auftrag.
          </p>

          <p className="mt-4 rounded-[var(--radius-card)] border border-hinweis-300 bg-hinweis-50 px-4 py-3 text-[0.9375rem] leading-relaxed text-hinweis-900">
            <strong className="font-semibold">Auswählen ist noch keine Reservierung.</strong> Verbindlich wird dein
            Kennzeichen erst, wenn die Zulassungsbehörde es reserviert oder zuteilt. Bis dahin kann es jemand anderes
            bekommen – auch wenn es eben noch frei war.
          </p>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[var(--radius-card)] border border-line p-3.5 hover:border-navy">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-brand-600)]" checked={service} onChange={(e) => onService(e.target.checked)} />
            <span className="text-[0.9375rem] leading-relaxed">
              <strong className="font-semibold text-navy">Wunschkennzeichen-Service dazubuchen (+ {P.wunschkennzeichen})</strong>
              <span className="block text-ink-600">
                Wir fragen {name} bei der Behörde an, reservieren und lassen zuteilen. Die amtliche Gebühr ist enthalten.
                Ohne Haken nennen wir deinen Wunsch nur im Auftrag.
              </span>
            </span>
          </label>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button type="button" className="btn btn-primary" onClick={() => onWeiter("neuzulassung")}>
              Jetzt Fahrzeug anmelden
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => onWeiter("ummeldung")}>
              Ummeldung beauftragen
            </button>
          </div>
          <button type="button" className="link mt-3 inline-flex min-h-11 items-center text-[0.9375rem]" aria-pressed={gemerkt} onClick={onMerken}>
            {gemerkt ? "Steht auf deiner Merkliste" : "Kennzeichen für später merken"}
          </button>
        </div>
      </div>
    </section>
  );
});

export default Abschluss;
