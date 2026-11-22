"use client";

import { useId } from "react";
import KennzeichenSchild from "./KennzeichenSchild";
import { schreibweise } from "@/lib/kennzeichen/regeln";
import { pruefzeit } from "@/lib/kennzeichen/verfuegbarkeit";
import { KATEGORIE_LABEL, STATUS_TEXT, type Behoerde, type Bezirk, type Verfuegbarkeit, type Vorschlag } from "@/lib/kennzeichen/typen";
import { euro, officialFees, P } from "@/lib/pricing";

/** Zustand mit Punkt und Text. „Verfügbar“ & Co. tragen immer Quelle und Zeitpunkt. */
export function StatusZeile({ v }: { v: Verfuegbarkeit }) {
  const belegt = v.quelle && v.geprueftAm;
  return (
    <p className="kz-status" data-status={v.status}>
      <span>
        {STATUS_TEXT[v.status].label}
        {belegt && (
          <span className="font-normal">
            {" "}
            · {v.quelle}, geprüft am {pruefzeit(v.geprueftAm!)}
          </span>
        )}
      </span>
    </p>
  );
}

interface Props {
  v: Vorschlag;
  bezirk: Bezirk;
  status: Verfuegbarkeit;
  gemerkt: boolean;
  gewaehlt: boolean;
  /** Prüfbereich aufgeklappt. */
  pruefungOffen: boolean;
  /** Behördenangaben – null, solange sie laden oder nicht ladbar sind. */
  behoerde: Behoerde | null;
  prueft: boolean;
  onPruefen: () => void;
  onAehnliche: () => void;
  onMerken: () => void;
  onWaehlen: () => void;
  /** „Wir prüfen und reservieren für dich“ – Auswahl mit Wunschkennzeichen-Service. */
  onService: () => void;
  onBehoerdeGeoeffnet: () => void;
}

/**
 * Ein Vorschlag als Karte: große Kennzeichen-Vorschau, die Idee dahinter, der Zustand
 * und die vier Aktionen. Die Verfügbarkeit steht in einem eigenen aufklappbaren Bereich –
 * getrennt vom Vorschlag, weil nur die Zulassungsbehörde sie kennt.
 */
export default function VorschlagKarte({
  v,
  bezirk,
  status,
  gemerkt,
  gewaehlt,
  pruefungOffen,
  behoerde,
  prueft,
  onPruefen,
  onAehnliche,
  onMerken,
  onWaehlen,
  onService,
  onBehoerdeGeoeffnet,
}: Props) {
  const id = useId();
  const name = schreibweise(v);
  const nebenaktion =
    "inline-flex min-h-11 items-center text-[0.875rem] font-semibold text-navy underline decoration-[1.5px] underline-offset-[0.25em] hover:text-brand-700";

  return (
    // Mit offenem Prüfbereich nimmt die Karte die ganze Zeile ein: links das Kennzeichen, rechts die Prüfung.
    // So bleiben die Nachbarkarten in Form, und der Text hat Platz.
    <li
      className={`kz-karte kz-karte-neu ${pruefungOffen ? "sm:col-span-full sm:grid sm:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] sm:gap-x-7" : ""}`}
      data-gewaehlt={gewaehlt}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[0.875rem] font-semibold text-ink-600">{KATEGORIE_LABEL[v.kategorie]}</p>
          {v.herkunft === "ki" && <p className="text-[0.8125rem] font-semibold text-brand-700">Idee der KI</p>}
          {v.herkunft === "eingabe" && <p className="text-[0.8125rem] font-semibold text-ink-600">Deine Eingabe</p>}
        </div>

        <KennzeichenSchild kuerzel={v.kuerzel} buchstaben={v.buchstaben} ziffern={v.ziffern} zusatz={v.zusatz} className="mt-2.5" />

        <p className="mt-3 text-[0.9375rem] leading-snug text-ink-700">{v.idee}</p>
        {v.hinweise.map((h) => (
          <p key={h.code} className="mt-2 text-[0.875rem] leading-snug text-ink-600">
            <strong className="font-semibold text-navy">Hinweis:</strong> {h.kurztext ?? h.text}
          </p>
        ))}

        <div className="mt-auto pt-3.5">
          <StatusZeile v={status} />
          <button type="button" className={`btn btn-sm btn-block mt-3 ${gewaehlt ? "btn-navy" : "btn-primary"}`} aria-pressed={gewaehlt} onClick={onWaehlen}>
            {gewaehlt ? "Ausgewählt" : "Dieses Kennzeichen auswählen"}
            <span className="sr-only">: {name}</span>
          </button>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
            <button type="button" className={nebenaktion} aria-expanded={pruefungOffen} aria-controls={`${id}-pruefung`} onClick={onPruefen}>
              Verfügbarkeit prüfen
            </button>
            <button type="button" className={nebenaktion} onClick={onAehnliche}>
              Ähnliche finden
            </button>
            <button type="button" className={nebenaktion} aria-pressed={gemerkt} onClick={onMerken}>
              {gemerkt ? "Gemerkt" : "Merken"}
            </button>
          </div>
        </div>
      </div>

      {pruefungOffen && (
        <div
          id={`${id}-pruefung`}
          className="mt-3 border-t border-line pt-3.5 text-[0.9375rem] leading-relaxed text-ink-700 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0"
        >
          {prueft ? (
            <p role="status">Verfügbarkeit wird abgefragt …</p>
          ) : status.status === "verfuegbar" ? (
            <p>
              <strong className="font-semibold text-navy">{name} wurde als frei gemeldet.</strong> Das ist eine
              Momentaufnahme: Reserviert ist das Kennzeichen erst, wenn die Zulassungsbehörde die Reservierung bestätigt.
              Bis dahin kann es jemand anderes bekommen.
            </p>
          ) : status.status === "nicht_verfuegbar" ? (
            <p>
              <strong className="font-semibold text-navy">{name} ist vergeben oder gesperrt.</strong> Über „Ähnliche
              finden“ zeigen wir dir Kombinationen, die nah dran sind.
            </p>
          ) : (
            <>
              <p>
                <strong className="font-semibold text-navy">
                  Ob {name} frei ist, weiß nur die Zulassungsbehörde.
                </strong>{" "}
                Für {bezirk.name} ist bei uns keine Echtzeitprüfung angebunden – deshalb behaupten wir hier nichts. Du
                hast zwei Wege:
              </p>
              {v.hinweise.map((h) => (
                <p key={h.code} className="mt-2 text-[0.875rem] text-ink-600">
                  {h.text}
                </p>
              ))}
              <ol className="mt-3 grid gap-3 lg:grid-cols-2">
                <li className="rounded-[var(--radius-card)] border border-line p-3.5">
                  <p className="font-semibold text-navy">Selbst bei der Behörde prüfen und reservieren</p>
                  <p className="mt-1 text-ink-600">
                    {behoerde?.name ?? "Die zuständige Zulassungsbehörde"} zeigt in ihrem Online-Portal verbindlich, ob die
                    Kombination frei ist. Reservierung und Zuteilung kosten amtlich zusammen{" "}
                    {euro(officialFees.customPlate[0])}.
                  </p>
                  {behoerde?.wunschHinweis && (
                    <p className="mt-2 text-[0.875rem] text-ink-600">
                      Hinweis der Behörde: {behoerde.wunschHinweis.text}{" "}
                      <a href={behoerde.wunschHinweis.quelle} target="_blank" rel="noopener noreferrer" className="underline">
                        Quelle
                      </a>
                    </p>
                  )}
                  {behoerde?.website ? (
                    <a
                      href={behoerde.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onBehoerdeGeoeffnet}
                      className="btn btn-secondary btn-sm mt-3"
                    >
                      Zur Zulassungsbehörde {bezirk.name}
                      <span className="sr-only"> (öffnet in neuem Tab)</span>
                    </a>
                  ) : (
                    <a href={`/zulassungsstelle/${bezirk.slug}/`} className="link mt-3 inline-block">
                      Angaben zur Zulassungsstelle {bezirk.name}
                    </a>
                  )}
                </li>
                <li className="rounded-[var(--radius-card)] border border-line p-3.5">
                  <p className="font-semibold text-navy">Wir prüfen und reservieren für dich</p>
                  <p className="mt-1 text-ink-600">
                    Mit unserem Wunschkennzeichen-Service ({P.wunschkennzeichen} zusätzlich zur Zulassung, amtliche Gebühr
                    enthalten) fragen wir {name} bei der Behörde an, reservieren und lassen zuteilen. Ist die Kombination
                    vergeben, stimmen wir eine Alternative mit dir ab – merk dir am besten gleich zwei, drei weitere
                    Ideen.
                  </p>
                  <button type="button" className="btn btn-secondary btn-sm mt-3" onClick={onService}>
                    Mit Wunschkennzeichen-Service weiter
                  </button>
                </li>
              </ol>
            </>
          )}
        </div>
      )}
    </li>
  );
}
