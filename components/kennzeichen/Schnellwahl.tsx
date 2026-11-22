"use client";

import { useId, useState, type FormEvent } from "react";
import { STILE, type Stil, type Zusatz } from "@/lib/kennzeichen/typen";
import type { Modus } from "@/lib/kennzeichen/statistik";

type Formular = "initialen" | "name" | "datum" | "zahl" | "paar";

const EINSTIEGE: { id: Formular; label: string }[] = [
  { id: "initialen", label: "Meine Initialen" },
  { id: "name", label: "Mein Name" },
  { id: "datum", label: "Geburtstag oder Jahrestag" },
  { id: "zahl", label: "Meine Glückszahl" },
  { id: "paar", label: "Für uns zwei" },
];

interface Props {
  gesperrt: boolean;
  stil: Stil | null;
  zusatz: Zusatz;
  /** Schickt einen Wunsch als Satz ins Gespräch – derselbe Weg wie eine getippte Nachricht. */
  onSende: (text: string, modus: Modus) => void;
  onStil: (stil: Stil | null) => void;
  onZusatz: (zusatz: Zusatz) => void;
  onUeberraschung: () => void;
}

/**
 * Schnelle Einstiege unter dem Gespräch: ein Tipp öffnet ein kleines Feld (Initialen,
 * Name, Datum, Zahl, zwei Namen), daraus wird ein Satz für den Assistenten. Dazu der
 * Stil („Persönlichkeitsmodus“), die Kennzeichenart und „KI, überrasche mich!“.
 *
 * Alles, was hier eingegeben wird, versteht der Generator selbst – ohne KI-Aufruf,
 * und Namen oder Daten verlassen den Browser nicht.
 */
export default function Schnellwahl({ gesperrt, stil, zusatz, onSende, onStil, onZusatz, onUeberraschung }: Props) {
  const [offen, setOffen] = useState<Formular | null>(null);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [fehler, setFehler] = useState("");
  const id = useId();

  const oeffne = (f: Formular) => {
    setOffen((o) => (o === f ? null : f));
    setA("");
    setB("");
    setFehler("");
  };

  const absenden = (e: FormEvent) => {
    e.preventDefault();
    const x = a.trim();
    const y = b.trim();
    const wort = (s: string) => /^[A-Za-zÄÖÜäöüß-]{2,30}$/.test(s);
    const gross = (s: string) => s.charAt(0).toLocaleUpperCase("de-DE") + s.slice(1).toLocaleLowerCase("de-DE");
    let satz = "";
    if (offen === "initialen") {
      const i = (x + y).toLocaleUpperCase("de-DE").replace(/[^A-Z]/g, "");
      if (i.length < 1 || i.length > 2) return setFehler("Bitte ein oder zwei Buchstaben von A bis Z – ohne Umlaute.");
      satz = `Initialen ${i}`;
    } else if (offen === "name") {
      if (!wort(x) || (y !== "" && !wort(y))) return setFehler("Bitte nur Buchstaben eingeben.");
      satz = `Ich heiße ${gross(x)}${y ? ` ${gross(y)}` : ""}`;
    } else if (offen === "datum") {
      // Mit Punkten („15.08.1990“) oder ohne („1508“, „150890“, „15081990“) – am iPhone fehlt
      // auf dem Ziffernblock der Punkt.
      const ohnePunkt = /^(\d{2})(\d{2})(\d{2}|\d{4})?$/.exec(x.replace(/\s+/g, ""));
      const m = ohnePunkt ?? /^(\d{1,2})\.\s?(\d{1,2})\.?\s?(\d{4}|\d{2})?$/.exec(x);
      if (!m || +m[1] < 1 || +m[1] > 31 || +m[2] < 1 || +m[2] > 12) return setFehler("Bitte als Tag.Monat eingeben, zum Beispiel 15.08. oder 15.08.1990.");
      satz = `${b === "jahrestag" ? "Jahrestag" : "Geburtstag"} ${m[1]}.${m[2]}.${m[3] ?? ""}`;
    } else if (offen === "zahl") {
      if (!/^[1-9][0-9]{0,3}$/.test(x)) return setFehler("Bitte eine Zahl von 1 bis 9999 – ohne Null am Anfang.");
      satz = `Glückszahl ${x}`;
    } else if (offen === "paar") {
      if (!wort(x) || !wort(y)) return setFehler("Bitte zwei Vornamen eingeben.");
      satz = `Wir heißen ${gross(x)} und ${gross(y)}`;
    }
    if (!satz || !offen) return;
    onSende(satz, offen);
    setOffen(null);
  };

  const feld = "field min-h-[2.875rem] py-2.5";

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-[0.9375rem] font-semibold text-navy">Womit sollen wir anfangen?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {EINSTIEGE.map((e) => (
            <button key={e.id} type="button" className="kz-chip" aria-expanded={offen === e.id} aria-controls={`${id}-form`} disabled={gesperrt} onClick={() => oeffne(e.id)}>
              {e.label}
            </button>
          ))}
          <button type="button" className="kz-chip" disabled={gesperrt} onClick={() => onSende("Möglichst kurz", "kurz")}>
            Möglichst kurz
          </button>
          <button type="button" className="kz-chip kz-chip-ki" disabled={gesperrt} onClick={onUeberraschung}>
            <span aria-hidden>✨</span> KI, überrasche mich!
          </button>
        </div>

        {offen && (
          <form id={`${id}-form`} onSubmit={absenden} className="mt-3 rounded-[var(--radius-card)] border border-line bg-canvas p-3.5" noValidate>
            <div className="flex flex-wrap items-end gap-2.5">
              {offen === "initialen" && (
                <>
                  <label className="grid gap-1 text-sm font-semibold">
                    Erster Buchstabe
                    <input autoFocus className={`${feld} w-24 text-center uppercase`} maxLength={1} value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" aria-describedby={`${id}-hilfe`} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Zweiter (wenn du magst)
                    <input className={`${feld} w-24 text-center uppercase`} maxLength={1} value={b} onChange={(e) => setB(e.target.value)} autoComplete="off" />
                  </label>
                </>
              )}
              {offen === "name" && (
                <>
                  <label className="grid min-w-[9rem] flex-1 gap-1 text-sm font-semibold">
                    Vorname
                    <input autoFocus className={feld} maxLength={30} value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" aria-describedby={`${id}-hilfe`} />
                  </label>
                  <label className="grid min-w-[9rem] flex-1 gap-1 text-sm font-semibold">
                    Nachname (wenn du magst)
                    <input className={feld} maxLength={30} value={b} onChange={(e) => setB(e.target.value)} autoComplete="off" />
                  </label>
                </>
              )}
              {offen === "datum" && (
                <>
                  <label className="grid min-w-[9rem] flex-1 gap-1 text-sm font-semibold">
                    Datum
                    <input autoFocus className={feld} inputMode="text" placeholder="15.08. oder 15.08.1990" maxLength={10} value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" aria-describedby={`${id}-hilfe`} />
                  </label>
                  <label className="grid gap-1 text-sm font-semibold">
                    Anlass
                    <select className={feld} value={b} onChange={(e) => setB(e.target.value)}>
                      <option value="">Geburtstag</option>
                      <option value="jahrestag">Jahrestag</option>
                    </select>
                  </label>
                </>
              )}
              {offen === "zahl" && (
                <label className="grid gap-1 text-sm font-semibold">
                  Deine Zahl
                  <input autoFocus className={`${feld} w-32`} inputMode="numeric" maxLength={4} placeholder="z. B. 7" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} autoComplete="off" aria-describedby={`${id}-hilfe`} />
                </label>
              )}
              {offen === "paar" && (
                <>
                  <label className="grid min-w-[8rem] flex-1 gap-1 text-sm font-semibold">
                    Dein Vorname
                    <input autoFocus className={feld} maxLength={30} value={a} onChange={(e) => setA(e.target.value)} autoComplete="off" aria-describedby={`${id}-hilfe`} />
                  </label>
                  <label className="grid min-w-[8rem] flex-1 gap-1 text-sm font-semibold">
                    Zweiter Vorname
                    <input className={feld} maxLength={30} value={b} onChange={(e) => setB(e.target.value)} autoComplete="off" />
                  </label>
                </>
              )}
              <button type="submit" className="btn btn-navy btn-sm min-h-[2.875rem]">
                Ideen zeigen
              </button>
            </div>
            <p id={`${id}-hilfe`} className={`mt-2.5 text-sm ${fehler ? "font-medium text-danger" : "text-ink-600"}`} role={fehler ? "alert" : undefined}>
              {fehler || "Bleibt in deinem Browser: Daraus werden nur Buchstaben und Ziffern für die Vorschläge."}
            </p>
          </form>
        )}
      </div>

      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <p id={`${id}-stil`} className="text-[0.9375rem] font-semibold text-navy">
            Welcher Stil passt zu dir?
          </p>
          <div role="group" aria-labelledby={`${id}-stil`} className="mt-2 flex flex-wrap gap-2">
            {STILE.map((s) => (
              <button key={s.id} type="button" className="kz-chip" aria-pressed={stil === s.id} disabled={gesperrt} onClick={() => onStil(stil === s.id ? null : s.id)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p id={`${id}-art`} className="text-[0.9375rem] font-semibold text-navy">
            Kennzeichenart
          </p>
          <div role="radiogroup" aria-labelledby={`${id}-art`} className="mt-2 flex flex-wrap gap-2">
            {(
              [
                ["", "Standard"],
                ["E", "E (Elektro)"],
                ["H", "H (Oldtimer)"],
              ] as [Zusatz, string][]
            ).map(([z, label]) => (
              <button key={z || "standard"} type="button" role="radio" aria-checked={zusatz === z} className="kz-chip" disabled={gesperrt} onClick={() => onZusatz(z)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
