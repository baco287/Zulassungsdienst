"use client";

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { sucheBezirk, type Treffer } from "@/lib/kennzeichen/suche";
import type { Bezirk } from "@/lib/kennzeichen/typen";

/** Große Städte für den Start mit einem Tipp (Slugs der Zulassungsstellen). */
const SCHNELL = ["berlin", "hamburg", "muenchen", "koeln", "frankfurt", "stuttgart", "hannover", "leipzig"];

interface Props {
  /** null, solange die Liste lädt. */
  bezirke: Bezirk[] | null;
  /** true, wenn die Liste nicht geladen werden konnte. */
  ladefehler: boolean;
  onNeuLaden: () => void;
  bezirk: Bezirk | null;
  kuerzel: string;
  onWaehle: (bezirk: Bezirk, kuerzel: string) => void;
  onAendern: () => void;
  /** Vorbelegung aus dem Einstieg von der Startseite (#ort=…). */
  start?: string;
}

/**
 * Schritt 1: Wo wird das Fahrzeug zugelassen? Suche nach Stadt, Landkreis oder Kürzel
 * in den geprüften Zulassungsstellen. Hat ein Bezirk mehrere Unterscheidungszeichen
 * (z. B. Altkennzeichen), stehen sie danach zur Auswahl.
 *
 * Bedienung wie ein Kombinationsfeld: Pfeiltasten, Enter, Escape. Der Fokus springt nach der
 * Wahl auf „Bezirk ändern“ und nach „Bezirk ändern“ zurück ins Suchfeld.
 */
export default function BezirkWahl({ bezirke, ladefehler, onNeuLaden, bezirk, kuerzel, onWaehle, onAendern, start = "" }: Props) {
  const [eingabe, setEingabe] = useState(start);
  const [offen, setOffen] = useState(false);
  const [aktiv, setAktiv] = useState(0);
  const feld = useRef<HTMLInputElement>(null);
  const aendern = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  /** Fokus nach dem nächsten Wechsel zwischen Suche und gewähltem Bezirk mitnehmen. */
  const fokusMit = useRef(false);
  const id = useId();

  // Einstieg von außen (#ort=…), der nicht eindeutig war: Liste gleich zeigen und ins Feld setzen.
  useEffect(() => {
    if (!start) return;
    setEingabe(start);
    setOffen(true);
    feld.current?.focus({ preventScroll: true });
  }, [start]);

  useEffect(() => {
    if (!fokusMit.current) return;
    fokusMit.current = false;
    (bezirk ? aendern.current : feld.current)?.focus();
  }, [bezirk]);

  const treffer: Treffer[] = useMemo(() => (bezirke ? sucheBezirk(bezirke, eingabe, 7) : []), [bezirke, eingabe]);
  const schnell = useMemo(
    () => (bezirke ? SCHNELL.flatMap((s) => bezirke.find((b) => b.slug === s) ?? []) : []),
    [bezirke],
  );

  useEffect(() => setAktiv(0), [eingabe]);

  // Die aktive Option immer sichtbar halten (Pfeiltasten in einer langen Liste).
  useEffect(() => {
    liste.current?.querySelector<HTMLElement>(`[data-index="${aktiv}"]`)?.scrollIntoView({ block: "nearest" });
  }, [aktiv]);

  const nimm = (t: Treffer | Bezirk) => {
    const b = "bezirk" in t ? t.bezirk : t;
    const code = "bezirk" in t && t.code ? t.code : b.kuerzel[0].code;
    setOffen(false);
    setEingabe("");
    fokusMit.current = true;
    onWaehle(b, code);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOffen(true);
      setAktiv((i) => Math.min(i + 1, treffer.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAktiv((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (treffer[aktiv]) {
        e.preventDefault();
        // Wurde nach einem Kürzel gesucht, gilt dieses Kürzel (t.code), nicht das erste des Bezirks.
        nimm(treffer[aktiv]);
      }
    } else if (e.key === "Escape") {
      setOffen(false);
    }
  };

  if (bezirk) {
    return (
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-[1.0625rem] leading-snug">
            <span className="text-ink-600">Zulassungsbezirk:</span>{" "}
            <strong className="font-semibold text-navy">{bezirk.name}</strong>
            {/* Bei Stadtstaaten nicht „Hamburg · Hamburg“ */}
            {bezirk.bundesland !== bezirk.name && <span className="text-ink-600"> · {bezirk.bundesland}</span>}
          </p>
          <button
            ref={aendern}
            type="button"
            className="link inline-flex min-h-11 items-center text-[0.9375rem]"
            onClick={() => {
              fokusMit.current = true;
              onAendern();
            }}
          >
            Bezirk ändern
          </button>
        </div>
        {bezirk.kuerzel.length > 1 && (
          <div className="mt-3">
            <p id={`${id}-k`} className="text-[0.9375rem] text-ink-600">
              Hier gibt es mehrere Kürzel. Welches soll auf dein Schild?
            </p>
            <div role="radiogroup" aria-labelledby={`${id}-k`} className="mt-2 flex flex-wrap gap-2">
              {bezirk.kuerzel.map((k) => (
                <button
                  key={k.code}
                  type="button"
                  role="radio"
                  aria-checked={k.code === kuerzel}
                  className="kz-chip"
                  onClick={() => onWaehle(bezirk, k.code)}
                >
                  <strong className="font-bold">{k.code}</strong>
                  <span className="font-medium opacity-80">{k.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const listeOffen = offen && eingabe.trim().length > 0 && bezirke !== null;

  return (
    <div>
      <label htmlFor={`${id}-ort`} className="field-label text-[1.0625rem]">
        Wo wird dein Fahrzeug zugelassen?
      </label>
      <div className="relative">
        <input
          ref={feld}
          id={`${id}-ort`}
          type="text"
          role="combobox"
          aria-expanded={listeOffen}
          aria-controls={`${id}-liste`}
          aria-autocomplete="list"
          aria-activedescendant={listeOffen && treffer[aktiv] ? `${id}-t-${aktiv}` : undefined}
          aria-describedby={`${id}-hilfe`}
          autoComplete="off"
          autoCapitalize="words"
          spellCheck={false}
          enterKeyHint="search"
          className="field"
          placeholder="Stadt, Landkreis oder Kürzel"
          value={eingabe}
          onChange={(e) => {
            setEingabe(e.target.value.slice(0, 60));
            setOffen(true);
          }}
          onFocus={() => setOffen(true)}
          onBlur={() => setTimeout(() => setOffen(false), 150)}
          onKeyDown={onKey}
        />
        {listeOffen && (
          <ul
            ref={liste}
            id={`${id}-liste`}
            role="listbox"
            aria-label="Gefundene Zulassungsbezirke"
            className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[21rem] overflow-auto rounded-[var(--radius-control)] border-[1.5px] border-navy bg-white py-1"
          >
            {treffer.map((t, i) => (
              <li
                key={t.bezirk.slug}
                id={`${id}-t-${i}`}
                data-index={i}
                role="option"
                aria-selected={i === aktiv}
                // Aktive Option mit Strich links – die helle Fläche allein wäre zu kontrastarm.
                className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 border-l-4 px-4 py-2 ${
                  i === aktiv ? "border-navy bg-canvas" : "border-transparent"
                }`}
                onMouseEnter={() => setAktiv(i)}
                // mousedown statt click: Der Klick käme erst nach dem blur des Felds an.
                onMouseDown={(e) => {
                  e.preventDefault();
                  nimm(t);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-navy">{t.bezirk.name}</span>
                  <span className="block truncate text-sm text-ink-600">
                    {t.ueber ? `${t.ueber} · ` : ""}
                    {t.bezirk.bundesland}
                  </span>
                </span>
                <span className="shrink-0 font-display text-[0.9375rem] font-bold tracking-wide text-navy">
                  {t.bezirk.kuerzel
                    .slice(0, 3)
                    .map((k) => k.code)
                    .join(" · ")}
                  {t.bezirk.kuerzel.length > 3 ? " …" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Außerhalb der Liste, damit Screenreader „nichts gefunden“ auch ohne geöffnete Liste hören. */}
      <p className="field-hint font-medium text-navy" role="status">
        {bezirke !== null && eingabe.trim().length >= 2 && treffer.length === 0
          ? "Dazu finden wir keinen Bezirk. Versuch es mit deinem Landkreis oder dem Kürzel, das bei dir auf den Schildern steht."
          : ""}
      </p>
      <p id={`${id}-hilfe`} className="field-hint">
        {ladefehler ? (
          <>
            Die Liste der Zulassungsbezirke konnte nicht geladen werden.{" "}
            <button type="button" className="link" onClick={onNeuLaden}>
              Noch einmal versuchen
            </button>
          </>
        ) : (
          "Maßgeblich ist der Ort, an dem das Fahrzeug gemeldet wird – meist dein Wohnort."
        )}
      </p>
      {schnell.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2" aria-label="Häufig gewählte Städte">
          {schnell.map((b) => (
            <button key={b.slug} type="button" className="kz-chip" onClick={() => nimm(b)}>
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
