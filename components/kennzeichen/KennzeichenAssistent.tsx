"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Abschluss from "./Abschluss";
import BezirkWahl from "./BezirkWahl";
import KennzeichenSchild from "./KennzeichenSchild";
import Merkliste from "./Merkliste";
import Schnellwahl from "./Schnellwahl";
import VorschlagKarte from "./VorschlagKarte";
import { ladeBehoerde, ladeBezirke } from "@/lib/kennzeichen/daten";
import { aehnliche, ausKi, erzeuge, ideenDesTages } from "@/lib/kennzeichen/generator";
import { frageKi } from "@/lib/kennzeichen/ki";
import { leseMerkliste, schreibeMerkliste, schreibeUebergabe, MERKLISTE_MAX, type Gemerkt } from "@/lib/kennzeichen/merkliste";
import { euro, officialFees, P } from "@/lib/pricing";
import { bausteinGesperrt, fremdesKuerzel, kombiId, leseKombination, platzFuerErkennungsnummer, pruefe, schreibweise } from "@/lib/kennzeichen/regeln";
import { zaehle, type Modus } from "@/lib/kennzeichen/statistik";
import { eindeutig, norm } from "@/lib/kennzeichen/suche";
import { LEERE_WUENSCHE, STILE, type Behoerde, type Bezirk, type Kombination, type Stil, type Verfuegbarkeit, type Vorschlag, type Wuensche, type Zusatz } from "@/lib/kennzeichen/typen";
import { pruefeVerfuegbarkeit } from "@/lib/kennzeichen/verfuegbarkeit";
import { bereinigeFuerKi, hatPersoenliches, istFuellwort, verstehe, type Verstanden } from "@/lib/kennzeichen/verstehen";

interface Nachricht {
  id: number;
  von: "assistent" | "kunde";
  text: string;
  /** Schnelle Antworten unter der Nachricht des Assistenten. */
  optionen?: string[];
}

/** Beispiele für das große Schild, solange noch kein Bezirk gewählt ist. */
const BEISPIELE: Kombination[] = [
  { kuerzel: "H", buchstaben: "EY", ziffern: "24", zusatz: "" },
  { kuerzel: "M", buchstaben: "AX", ziffern: "7", zusatz: "" },
  { kuerzel: "DAN", buchstaben: "KE", ziffern: "1", zusatz: "" },
  { kuerzel: "B", buchstaben: "LT", ziffern: "1508", zusatz: "" },
  { kuerzel: "HAL", buchstaben: "LO", ziffern: "3", zusatz: "" },
  { kuerzel: "K", buchstaben: "E", ziffern: "1", zusatz: "E" },
];

const IDEE: Verfuegbarkeit = { status: "idee" };
const aufzaehlung = (teile: string[]) => (teile.length < 2 ? teile.join("") : `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}`);
/** Sieht die Eingabe wie ein fertiges Kennzeichen aus? ("H-MM 24", "h mm24", "köt a 1 e") */
const WIE_KENNZEICHEN = /^[a-zäöü]{1,3}[\s-]*[a-zäöü]{1,2}[\s-]*\d{1,4}\s*[eh]?$/i;
/** „Hier ist eine Idee“ / „Hier sind 3 Ideen“ */
const hierSind = (n: number, zusatz = "") => (n === 1 ? `Hier ist eine ${zusatz}Idee` : `Hier sind ${n} ${zusatz}Ideen`);
/** Nach einem Ausfall der KI so lange nur den Generator nutzen – spart Wartezeit und Anfragen. */
const KI_PAUSE_MS = 5 * 60 * 1000;

/** Feste Antworten auf Fragen, für die es keine KI braucht. */
const THEMA_TEXT: Record<NonNullable<Verstanden["thema"]>, string> = {
  preis: `Ideen finden kostet nichts. Für Reservierung und Zuteilung verlangt die Zulassungsbehörde amtlich ${euro(officialFees.customPlate[0])}. Mit unserem Wunschkennzeichen-Service (${P.wunschkennzeichen} zusätzlich zur Zulassung, amtliche Gebühr enthalten) erledigen wir das für dich.`,
  verfuegbarkeit:
    "Ob eine Kombination frei ist, zeigt nur die Zulassungsbehörde – ich behaupte da nichts. Tipp bei einem Vorschlag auf „Verfügbarkeit prüfen“: Dort findest du den Weg zur Behörde, oder wir reservieren für dich.",
  auswahl: "Tipp beim gewünschten Kennzeichen auf „Dieses Kennzeichen auswählen“ – oder auf „Merken“, um mehrere zu vergleichen.",
  reaktion: "Gern! Sag mir, was auf dein Schild soll – Initialen, eine Zahl, ein Datum – oder tipp unten auf einen Vorschlag.",
};

/**
 * Der KI-Kennzeichenassistent: Bezirk wählen, Wünsche nennen (tippen oder antippen),
 * Vorschläge als Kennzeichen sehen, vergleichen, merken, auswählen – und mit dem
 * gewählten Kennzeichen direkt in den Auftrag.
 *
 * Arbeitsteilung (docs/KENNZEICHEN-ASSISTENT.md):
 *  - Generator, Regelprüfung und einfache Änderungswünsche laufen im Browser.
 *  - Die KI kommt nur dazu, wenn ein frei formulierter Wunsch übrig bleibt, den der
 *    Generator nicht versteht, oder bei „KI, überrasche mich!“. Fällt sie aus, geht es
 *    mit dem Generator weiter.
 *  - Verfügbarkeit ist ein eigener Zustand je Kennzeichen und entsteht nie aus einem Vorschlag.
 */
export default function KennzeichenAssistent() {
  const router = useRouter();
  const id = useId();

  const [bezirke, setBezirke] = useState<Bezirk[] | null>(null);
  const [ladefehler, setLadefehler] = useState(false);
  const [bezirk, setBezirk] = useState<Bezirk | null>(null);
  const [kuerzel, setKuerzel] = useState("");
  const [startOrt, setStartOrt] = useState("");
  const [behoerde, setBehoerde] = useState<Behoerde | null>(null);

  const [wuensche, setWuensche] = useState<Wuensche>(LEERE_WUENSCHE);
  const [verlauf, setVerlauf] = useState<Nachricht[]>([]);
  const [vorschlaege, setVorschlaege] = useState<Vorschlag[]>([]);
  const [status, setStatus] = useState<Record<string, Verfuegbarkeit>>({});
  const [pruefung, setPruefung] = useState<string | null>(null);
  const [prueft, setPrueft] = useState<string | null>(null);
  const [auswahl, setAuswahl] = useState<Kombination | null>(null);
  const [service, setService] = useState(false);
  const [merkliste, setMerkliste] = useState<Gemerkt[]>([]);
  const [gespeichert, setGespeichert] = useState(true);
  const [eingabe, setEingabe] = useState("");
  const [laedt, setLaedt] = useState(false);
  const [beispiel, setBeispiel] = useState(0);
  const [ansage, setAnsage] = useState("");

  const zaehler = useRef(0);
  const saat = useRef(1);
  const gezeigt = useRef(new Set<string>());
  const gespraech = useRef<HTMLDivElement>(null);
  const abschlussTitel = useRef<HTMLHeadingElement>(null);
  const ergebnisse = useRef<HTMLDivElement>(null);
  const eingabeFeld = useRef<HTMLInputElement>(null);
  /** Zählt Bezirks- und Kürzelwechsel: Eine KI-Antwort für einen alten Bezirk wird verworfen. */
  const stand = useRef(0);
  /** Wunschtext, zu dem die KI gerade eine Rückfrage gestellt hat – die Antwort braucht ihn als Zusammenhang. */
  const kiFrage = useRef<string | null>(null);
  /** Bis zu diesem Zeitpunkt (ms) nach einem Ausfall keine KI-Anfrage. */
  const kiPauseBis = useRef(0);

  /* ── Daten laden, Merkliste lesen, Einstieg über #ort / #bezirk / #kuerzel ── */

  const lade = useCallback(() => {
    setLadefehler(false);
    ladeBezirke()
      .then(setBezirke)
      .catch(() => setLadefehler(true));
  }, []);

  useEffect(() => {
    lade();
    setMerkliste(leseMerkliste());
  }, [lade]);

  // Beispiele auf dem großen Schild durchwechseln – nur vor der Bezirkswahl und nur ohne „weniger Bewegung“.
  useEffect(() => {
    if (bezirk) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setBeispiel((i) => (i + 1) % BEISPIELE.length), 2800);
    return () => clearInterval(t);
  }, [bezirk]);

  // Gespräch immer am Ende halten – innerhalb seines Kastens, ohne die Seite zu bewegen.
  useEffect(() => {
    const el = gespraech.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [verlauf, laedt]);

  const sage = useCallback((text: string, optionen?: string[]) => {
    setVerlauf((v) => [...v, { id: ++zaehler.current, von: "assistent", text, optionen }]);
  }, []);

  const zeige = useCallback(
    (liste: Vorschlag[], art: "ersetzen" | "voran" | "anhaengen", modus: Modus, quelle: "generator" | "ki" | "cache", b: Bezirk) => {
      for (const v of liste) gezeigt.current.add(v.id);
      setVorschlaege((alt) => {
        if (art === "ersetzen") return liste;
        const neu = new Set(liste.map((v) => v.id));
        const rest = alt.filter((v) => !neu.has(v.id));
        return art === "voran" ? [...liste, ...rest] : [...rest, ...liste];
      });
      if (liste.length > 0) {
        zaehle("kza_vorschlaege", { bezirk: b.slug, modus, quelle, n: liste.length });
        setAnsage(`${liste.length} ${liste.length === 1 ? "neuer Vorschlag" : "neue Vorschläge"}`);
      }
    },
    [],
  );

  const waehleBezirk = useCallback(
    (b: Bezirk, code: string) => {
      const wechsel = b.slug !== bezirk?.slug || code !== kuerzel;
      setBezirk(b);
      setKuerzel(code);
      if (!wechsel) return;
      stand.current += 1;
      kiFrage.current = null;
      setAuswahl(null);
      schreibeUebergabe(null);
      setPruefung(null);
      setStatus({});
      gezeigt.current = new Set();
      saat.current = 1;
      setBehoerde(null);
      ladeBehoerde(b.slug)
        .then(setBehoerde)
        .catch(() => setBehoerde(null));
      if (b.slug !== bezirk?.slug) zaehle("kza_start", { bezirk: b.slug });
      const liste = erzeuge({ kuerzel: code, bundesland: b.bundesland, wuensche, anzahl: 6 });
      zeige(liste, "ersetzen", "start", "generator", b);
      const mehrere = b.kuerzel.length > 1 ? ` Hier gibt es ${b.kuerzel.length} Kürzel – oben kannst du wechseln.` : "";
      sage(
        hatPersoenliches(wuensche)
          ? `Für ${b.name} nehme ich das Kürzel ${code}.${mehrere} Deine bisherigen Wünsche habe ich übernommen.`
          : `Für ${b.name} nehme ich das Kürzel ${code}.${mehrere} Erste Ideen siehst du schon. Was soll auf dein Schild – Initialen, eine Zahl, ein Datum? Schreib es mir einfach oder tipp unten etwas an.`,
      );
    },
    [bezirk, kuerzel, wuensche, zeige, sage],
  );

  // Einstieg von der Startseite oder den Kennzeichenseiten. Bewusst im Fragment (#…):
  // Fragmente sind für Suchmaschinen keine eigenen Adressen.
  useEffect(() => {
    if (!bezirke || bezirk) return;
    const h = new URLSearchParams(window.location.hash.slice(1));
    const slug = h.get("bezirk");
    const code = h.get("kuerzel");
    const ort = (h.get("ort") ?? "").slice(0, 60);
    if (!slug && !code && !ort) return;
    history.replaceState(null, "", window.location.pathname + window.location.search);
    const perSlug = slug ? bezirke.find((b) => b.slug === slug) : undefined;
    if (perSlug) return waehleBezirk(perSlug, perSlug.kuerzel[0].code);
    if (code) {
      const c = norm(code);
      // Gibt mehr als ein Bezirk das Kürzel aus (z. B. M: Stadt und Landkreis München, BK in zwei
      // Bundesländern), nicht raten – die Auswahl zeigen.
      const passend = bezirke.filter((x) => x.kuerzel.some((k) => norm(k.code) === c));
      const alsErstes = passend.filter((x) => norm(x.kuerzel[0].code) === c);
      const kandidaten = alsErstes.length > 0 ? alsErstes : passend;
      if (kandidaten.length === 1) {
        const k = kandidaten[0].kuerzel.find((x) => norm(x.code) === c)!;
        return waehleBezirk(kandidaten[0], k.code);
      }
      if (kandidaten.length > 1) return setStartOrt(kandidaten[0].kuerzel.find((x) => norm(x.code) === c)!.code);
    }
    if (ort) {
      const t = eindeutig(bezirke, ort);
      if (t) return waehleBezirk(t.bezirk, t.code ?? t.bezirk.kuerzel[0].code);
      setStartOrt(ort);
    }
  }, [bezirke, bezirk, waehleBezirk]);

  /* ── Vorschläge aus den Wünschen ── */

  /** Sagt, welche Wünsche nicht gehen – statt sie stillschweigend wegzulassen. */
  const einwaende = useCallback(
    (neu: Wuensche, alt: Wuensche, b: Bezirk, code: string): string[] => {
      const saetze: string[] = [];
      const bekanntB = new Set(alt.buchstaben.map((t) => t.wert));
      const bekanntZ = new Set(alt.zahlen.map((t) => t.wert));
      for (const t of neu.buchstaben.filter((x) => !bekanntB.has(x.wert)).slice(0, 2)) {
        const sperre = bausteinGesperrt("buchstaben", t.wert, code, b.bundesland);
        if (sperre) saetze.push(`${t.wert} lasse ich weg: ${sperre.text}`);
      }
      for (const t of neu.zahlen.filter((x) => !bekanntZ.has(x.wert)).slice(0, 3)) {
        const sperre = bausteinGesperrt("ziffern", t.wert, code, b.bundesland);
        if (sperre) saetze.push(`Die ${t.wert} lasse ich weg: ${sperre.text}`);
      }
      if (neu.ziffernMax !== null) {
        const zuLang = neu.zahlen.filter((t) => !bekanntZ.has(t.wert) && t.wert.length > neu.ziffernMax!).map((t) => t.wert);
        if (zuLang.length > 0) {
          saetze.push(
            `${aufzaehlung(zuLang)} ${zuLang.length === 1 ? "hat" : "haben"} mehr als ${neu.ziffernMax} ${neu.ziffernMax === 1 ? "Ziffer" : "Ziffern"} – schreib „darf länger sein“, dann nehme ich ${zuLang.length === 1 ? "sie" : "sie"} dazu.`,
          );
        }
      }
      const platz = platzFuerErkennungsnummer(code, neu.zusatz);
      const ersteB = neu.buchstaben[0]?.wert;
      const ersteZ = neu.zahlen[0]?.wert;
      if (ersteB && ersteZ && ersteB.length + ersteZ.length > platz) {
        saetze.push(
          `${ersteB} und ${ersteZ} passen zusammen nicht auf ein ${code}-Kennzeichen: Nach dem Kürzel ist hier Platz für ${platz} Zeichen. Ich kombiniere deshalb kürzer.`,
        );
      }
      return saetze;
    },
    [],
  );

  const antworteLokal = useCallback(
    (v: Verstanden, alt: Wuensche, b: Bezirk, code: string, modus: Modus, vorweg = "") => {
      const w = v.wuensche;
      const nurMehr = v.mehr !== null && v.verstanden.length === 0;
      if (nurMehr) {
        saat.current += 1;
        const liste = erzeuge({ kuerzel: code, bundesland: b.bundesland, wuensche: w, ausschliessen: gezeigt.current, anzahl: v.mehr!, saat: saat.current });
        zeige(liste, "anhaengen", "mehr", "generator", b);
        sage(
          liste.length > 0
            ? `${vorweg}${hierSind(liste.length, "weitere ")} – du findest ${liste.length === 1 ? "sie" : "sie"} unter den bisherigen.`
            : `${vorweg}Zu diesen Vorgaben fällt mir nichts Neues mehr ein. Lockere eine Einschränkung oder nenn mir einen anderen Wunsch.`,
          liste.length > 0 ? undefined : ["Darf länger sein", "Etwas Ausgefallenes"],
        );
        return;
      }

      const anzahl = v.mehr ?? 8;
      const liste = erzeuge({ kuerzel: code, bundesland: b.bundesland, wuensche: w, anzahl });
      zeige(liste, "ersetzen", modus, "generator", b);
      const teile: string[] = [];
      if (vorweg) teile.push(vorweg.trim());
      // „am 15.8.“ endet schon mit Punkt – keinen zweiten anhängen.
      if (v.verstanden.length > 0) teile.push(`Verstanden: ${aufzaehlung(v.verstanden).replace(/\.$/, "")}.`);
      teile.push(...einwaende(w, alt, b, code));
      if (liste.length === 0) {
        teile.push("Mit diesen Vorgaben bleibt keine zulässige Kombination übrig. Lockere eine Einschränkung – zum Beispiel die Länge oder eine ausgeschlossene Zahl.");
        sage(teile.join(" "), ["Darf länger sein", "Von vorn anfangen"]);
        return;
      }
      teile.push(`${hierSind(liste.length)} für ${code}.`);
      if (v.frage) {
        sage(`${teile.join(" ")} ${v.frage}`);
      } else if (!hatPersoenliches(w) && !w.stil && !w.kurz) {
        sage(`${teile.join(" ")} Soll dein Kennzeichen eher sportlich, persönlich oder besonders kurz sein?`, ["Sportlich", "Persönlich", "Besonders kurz"]);
      } else if (w.stil === "persoenlich" && !hatPersoenliches(w)) {
        sage(`${teile.join(" ")} Richtig persönlich wird es mit deinen Initialen oder einer Zahl, die dir etwas bedeutet – verrätst du sie mir?`);
      } else {
        sage(teile.join(" "), ["Zeig mir weitere", "Kürzer", "Etwas Ausgefallenes"]);
      }
    },
    [zeige, sage, einwaende],
  );

  /** Fragt die KI. `textFuerKi` ist schon bereinigt und enthält nichts, was der Browser verstanden hat. */
  const mitKi = useCallback(
    async (textFuerKi: string, v: Verstanden, alt: Wuensche, b: Bezirk, code: string) => {
      const meiner = stand.current;
      setLaedt(true);
      const antwort = await frageKi({
        art: "wunsch",
        kuerzel: code,
        text: textFuerKi,
        wuensche: v.wuensche,
        gezeigt: [...gezeigt.current].map((x) => x.split("|").slice(1, 3).join("")),
      });
      setLaedt(false);
      // Inzwischen Bezirk oder Kürzel gewechselt: Die Antwort gehört zum alten und wird verworfen.
      if (meiner !== stand.current) return;
      if (!antwort.ok) {
        if (antwort.grund !== "eingabe" && antwort.grund !== "abgelehnt") kiPauseBis.current = Date.now() + KI_PAUSE_MS;
        const vorweg =
          antwort.grund === "eingabe" && antwort.hinweis
            ? `${antwort.hinweis} `
            : "Die KI-Ideen sind gerade nicht erreichbar – ich mache mit unserem Generator weiter. ";
        return antworteLokal(v, alt, b, code, "text", vorweg);
      }
      kiFrage.current = antwort.rueckfrage && antwort.optionen.length > 0 ? textFuerKi : null;
      const w: Wuensche = antwort.stil && !v.wuensche.stil ? { ...v.wuensche, stil: antwort.stil } : v.wuensche;
      if (w !== v.wuensche) setWuensche(w);
      const ki = ausKi(antwort.vorschlaege, code, b.bundesland, w.zusatz);
      const dazu = erzeuge({ kuerzel: code, bundesland: b.bundesland, wuensche: w, ausschliessen: ki.map((x) => x.id), anzahl: Math.max(2, 8 - ki.length) });
      zeige([...ki, ...dazu], "ersetzen", "text", antwort.quelle, b);
      const einwand = einwaende(w, alt, b, code).join(" ");
      const text2 = [antwort.antwort, einwand, antwort.rueckfrage ?? ""].filter(Boolean).join(" ");
      sage(text2, antwort.optionen.length > 0 ? antwort.optionen.slice(0, 4) : ["Zeig mir weitere", "Kürzer"]);
    },
    [antworteLokal, einwaende, zeige, sage],
  );

  /**
   * Verarbeitet eine Nachricht. `modus` sagt, woher sie kommt: "text" = getippt oder eine
   * Antwortschaltfläche; alles andere stammt aus den Schnellwahl-Formularen und geht nie an die KI
   * (dort steht „Bleibt in deinem Browser“). `alsAntwort` = Klick auf eine Antwort zur Rückfrage der KI.
   */
  const sende = useCallback(
    async (roh: string, modus: Modus = "text", alsAntwort = false) => {
      const text = roh.trim().slice(0, 300);
      if (!text || !bezirk || laedt) return;
      const offen = kiFrage.current;
      kiFrage.current = null;
      setVerlauf((v) => [...v, { id: ++zaehler.current, von: "kunde", text }]);

      // Fertiges Kennzeichen getippt? Dann prüfen statt raten. „mit 7“ oder „die 7“ sind keins.
      const erstesWort = text.split(/[\s-]+/)[0];
      if (WIE_KENNZEICHEN.test(text) && !istFuellwort(erstesWort)) {
        // Das oben gewählte Kürzel zuerst, nicht das erste des Bezirks.
        const codes = [kuerzel, ...bezirk.kuerzel.map((x) => x.code).filter((c) => c !== kuerzel)];
        const fremd = fremdesKuerzel(text, codes);
        if (fremd) {
          return sage(
            `Das Kürzel ${fremd} vergibt der Bezirk ${bezirk.name} nicht – hier ${codes.length === 1 ? `gibt es ${codes[0]}` : `gibt es ${aufzaehlung(codes)}`}. Willst du einen anderen Bezirk, tipp oben auf „Bezirk ändern“.`,
          );
        }
        const k = leseKombination(text, codes);
        if (k) {
          const e = pruefe(k, { bundesland: bezirk.bundesland, streng: false });
          if (e.gueltig) {
            const v: Vorschlag = { ...k, id: kombiId(k), kategorie: "persoenlich", idee: "Deine eigene Kombination.", herkunft: "eingabe", hinweise: e.hinweise };
            zeige([v], "voran", "eingabe", "generator", bezirk);
            const hinweis = e.hinweise.find((h) => h.code === "vorsicht");
            return sage(
              `${schreibweise(k)} ist nach den Regeln möglich – du findest es ganz oben. ${hinweis ? `${hinweis.text} ` : ""}Ob es frei ist, zeigt nur die Zulassungsbehörde.`,
            );
          }
          return sage(`${schreibweise(k)} geht so nicht: ${e.fehler.map((f) => f.text).join(" ")}`);
        }
      }

      const v = verstehe(text, wuensche);
      if (v.zuruecksetzen) {
        setWuensche(LEERE_WUENSCHE);
        gezeigt.current = new Set();
        saat.current = 1;
        const liste = erzeuge({ kuerzel, bundesland: bezirk.bundesland, wuensche: LEERE_WUENSCHE, anzahl: 6 });
        zeige(liste, "ersetzen", "start", "generator", bezirk);
        return sage("Alles klar, wir fangen neu an. Was soll auf dein Schild?");
      }
      setWuensche(v.wuensche);
      const kiFrei = Date.now() >= kiPauseBis.current;

      // Antwort auf eine Rückfrage der KI: mit dem ursprünglichen Wunsch zusammen zurück an die KI.
      if (alsAntwort && offen && kiFrei) {
        return mitKi(bereinigeFuerKi(`${offen} – ${v.fuerKi || text}`), v, wuensche, bezirk, kuerzel);
      }
      if (v.frage && v.verstanden.length === 0 && !v.brauchtKi) return sage(v.frage);
      // Fragen und Reaktionen: fester Satz, die Vorschläge bleiben stehen.
      if (v.thema && v.verstanden.length === 0 && v.mehr === null && !v.frage) {
        return sage(THEMA_TEXT[v.thema], v.thema === "reaktion" ? ["Zeig mir weitere", "Etwas Ausgefallenes"] : undefined);
      }
      if (v.brauchtKi && modus === "text" && kiFrei) return mitKi(bereinigeFuerKi(v.fuerKi), v, wuensche, bezirk, kuerzel);
      antworteLokal(v, wuensche, bezirk, kuerzel, modus, v.brauchtKi && v.verstanden.length === 0 ? "Das verstehe ich ohne KI nicht ganz – hier sind Ideen aus unserem Generator. " : "");
    },
    [bezirk, kuerzel, laedt, wuensche, zeige, sage, mitKi, antworteLokal],
  );

  const ueberrasche = useCallback(async () => {
    if (!bezirk || laedt) return;
    setVerlauf((v) => [...v, { id: ++zaehler.current, von: "kunde", text: "Überrasch mich!" }]);
    kiFrage.current = null;
    const meiner = stand.current;
    setLaedt(true);
    const antwort =
      Date.now() >= kiPauseBis.current
        ? await frageKi({ art: "ueberraschung", kuerzel, wuensche, gezeigt: [...gezeigt.current].map((x) => x.split("|").slice(1, 3).join("")) })
        : ({ ok: false, grund: "pause" } as const);
    setLaedt(false);
    if (meiner !== stand.current) return;
    if (!antwort.ok && antwort.grund !== "pause" && antwort.grund !== "abgelehnt") kiPauseBis.current = Date.now() + KI_PAUSE_MS;
    saat.current += 1;
    const ki = antwort.ok ? ausKi(antwort.vorschlaege, kuerzel, bezirk.bundesland, wuensche.zusatz, gezeigt.current) : [];
    const frei: Wuensche = { ...LEERE_WUENSCHE, stil: "ueberraschend", zusatz: wuensche.zusatz, ohneZiffern: wuensche.ohneZiffern, ohneBuchstaben: wuensche.ohneBuchstaben };
    const dazu = erzeuge({
      kuerzel,
      bundesland: bezirk.bundesland,
      wuensche: frei,
      ausschliessen: new Set([...gezeigt.current, ...ki.map((x) => x.id)]),
      anzahl: Math.max(3, 8 - ki.length),
      saat: saat.current,
    });
    zeige([...ki.slice(0, 6), ...dazu], "ersetzen", "ueberraschung", antwort.ok ? antwort.quelle : "generator", bezirk);
    sage(
      antwort.ok && ki.length > 0
        ? `${antwort.antwort} Gefällt dir etwas – oder noch eine Runde?`
        : `Überraschung aus unserem Generator: Wortspiele mit ${kuerzel} und Zahlen, die auffallen. Noch eine Runde?`,
      ["Zeig mir weitere", "Etwas Ausgefallenes", "Kürzer"],
    );
  }, [bezirk, kuerzel, laedt, wuensche, zeige, sage]);

  /** Stil und Kennzeichenart per Knopf – sofort neue Vorschläge, ohne Umweg über das Gespräch. */
  const aendere = useCallback(
    (teil: Partial<Wuensche>, was: string) => {
      if (!bezirk) return;
      const w = { ...wuensche, ...teil };
      setWuensche(w);
      const liste = erzeuge({ kuerzel, bundesland: bezirk.bundesland, wuensche: w, anzahl: 8 });
      zeige(liste, "ersetzen", "stil", "generator", bezirk);
      if (auswahl && teil.zusatz !== undefined && auswahl.zusatz !== teil.zusatz) {
        setAuswahl(null);
        schreibeUebergabe(null);
      }
      sage(liste.length > 0 ? `${was} ${hierSind(liste.length)} dazu.` : `${was} Dazu bleibt mit deinen übrigen Vorgaben nichts übrig – lockere eine Einschränkung.`);
    },
    [bezirk, kuerzel, wuensche, auswahl, zeige, sage],
  );

  /* ── Aktionen an einem Vorschlag ── */

  const merken = useCallback(
    (k: Kombination) => {
      if (!bezirk) return;
      const kid = kombiId(k);
      setMerkliste((alt) => {
        const drin = alt.some((g) => g.id === kid);
        const neu = drin
          ? alt.filter((g) => g.id !== kid)
          : [{ kuerzel: k.kuerzel, buchstaben: k.buchstaben, ziffern: k.ziffern, zusatz: k.zusatz, id: kid, bezirk: bezirk.slug, bezirkName: bezirk.name, bundesland: bezirk.bundesland }, ...alt].slice(0, MERKLISTE_MAX);
        setGespeichert(schreibeMerkliste(neu));
        if (!drin) zaehle("kza_merken", { bezirk: bezirk.slug });
        setAnsage(drin ? `${schreibweise(k)} von der Merkliste entfernt` : `${schreibweise(k)} gemerkt`);
        return neu;
      });
    },
    [bezirk],
  );

  /**
   * Hält die Übergabe an den Auftrag mit der Auswahl gleich. So nimmt jeder Weg in den Auftrag –
   * auch „Zulassung starten“ oben oder die Leiste am Handy – das gewählte Kennzeichen mit.
   */
  const merkeAuswahl = useCallback(
    (k: Kombination, b: Bezirk, mitService: boolean) => {
      const auswahlNeu = { kuerzel: k.kuerzel, buchstaben: k.buchstaben, ziffern: k.ziffern, zusatz: k.zusatz };
      const s = status[kombiId(k)] ?? IDEE;
      setAuswahl(auswahlNeu);
      schreibeUebergabe({
        ...auswahlNeu,
        bezirk: b.slug,
        bezirkName: b.name,
        status: s.status,
        quelle: s.quelle,
        geprueftAm: s.geprueftAm,
        serviceGewaehlt: mitService,
        zeit: Date.now(),
      });
    },
    [status],
  );

  const waehle = useCallback(
    (k: Kombination, mitService = false) => {
      if (!bezirk) return;
      if (mitService) setService(true);
      merkeAuswahl(k, bezirk, mitService || service);
      zaehle("kza_auswahl", { bezirk: bezirk.slug });
      requestAnimationFrame(() => {
        abschlussTitel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        abschlussTitel.current?.focus({ preventScroll: true });
      });
    },
    [bezirk, service, merkeAuswahl],
  );

  const oeffnePruefung = useCallback(
    async (v: Vorschlag) => {
      if (!bezirk) return;
      if (pruefung === v.id) return setPruefung(null);
      setPruefung(v.id);
      zaehle("kza_pruefung", { bezirk: bezirk.slug, method: bezirk.echtzeit ? "echtzeit" : "oeffnen" });
      if (bezirk.echtzeit) {
        setPrueft(v.id);
        const ergebnis = await pruefeVerfuegbarkeit(bezirk, v);
        setPrueft(null);
        setStatus((s) => ({ ...s, [v.id]: ergebnis }));
      } else {
        setStatus((s) => ({ ...s, [v.id]: { status: "pruefung_erforderlich" } }));
      }
    },
    [bezirk, pruefung],
  );

  const zeigeAehnliche = useCallback(
    (v: Vorschlag) => {
      if (!bezirk) return;
      const liste = aehnliche(v, bezirk.bundesland, gezeigt.current, 6);
      zeige(liste, "voran", "aehnliche", "generator", bezirk);
      sage(
        liste.length > 0
          ? `Rund um ${schreibweise(v)} habe ich ${liste.length} ähnliche Kombinationen gefunden – sie stehen jetzt oben.`
          : `Rund um ${schreibweise(v)} habe ich schon alles gezeigt, was die Regeln hergeben.`,
      );
      ergebnisse.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [bezirk, zeige, sage],
  );

  const weiterZumAuftrag = useCallback(
    (leistung: "neuzulassung" | "ummeldung") => {
      if (!auswahl || !bezirk) return;
      merkeAuswahl(auswahl, bezirk, service);
      zaehle("kza_uebergabe", { bezirk: bezirk.slug, service: leistung, method: service ? "service" : "wunsch" });
      // Über den Router: Die Seite wird nicht neu geladen, die anonyme Analyse-Sitzung bleibt
      // dieselbe – so lässt sich ein späterer Auftrag dem Assistenten zuordnen.
      router.push(`/auftrag/?leistung=${leistung}`);
    },
    [auswahl, bezirk, service, merkeAuswahl, router],
  );

  const absenden = (e: FormEvent) => {
    e.preventDefault();
    const text = eingabe;
    setEingabe("");
    void sende(text);
  };

  /* ── Anzeige ── */

  const gross: Kombination | null = auswahl ?? vorschlaege[0] ?? null;
  const tagesideen = useMemo(() => {
    if (!bezirk) return [];
    const heute = new Date();
    const datum = `${heute.getFullYear()}-${heute.getMonth() + 1}-${heute.getDate()}`;
    return ideenDesTages(kuerzel, bezirk.bundesland, datum, 3);
  }, [bezirk, kuerzel]);
  const gemerktIds = useMemo(() => new Set(merkliste.map((g) => g.id)), [merkliste]);
  const auswahlId = auswahl ? kombiId(auswahl) : null;
  const letzteOptionen = verlauf.length > 0 && verlauf[verlauf.length - 1].von === "assistent" ? verlauf[verlauf.length - 1].optionen : undefined;
  const stilName = (s: Stil | null) => STILE.find((x) => x.id === s)?.label ?? "";

  return (
    <div>
      <div className="buehne">
        <div className="grid gap-x-10 gap-y-6 min-[1100px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] min-[1100px]:items-start">
          {/* Großes Schild: Auswahl, erster Vorschlag oder – vor der Bezirkswahl – ein Beispiel. */}
          <div className="min-[1100px]:order-2">
            {bezirk ? (
              gross ? (
                <KennzeichenSchild kuerzel={gross.kuerzel} buchstaben={gross.buchstaben} ziffern={gross.ziffern} zusatz={gross.zusatz} wechsel={kombiId(gross)} />
              ) : (
                <KennzeichenSchild kuerzel={kuerzel} />
              )
            ) : (
              <KennzeichenSchild {...BEISPIELE[beispiel]} wechsel={String(beispiel)} dekorativ />
            )}
            <p className="mt-2.5 text-[0.875rem] leading-snug text-ink-600">
              {!bezirk
                ? "Beispiel. So sehen deine Vorschläge gleich aus."
                : auswahl
                  ? "Deine Auswahl – als Vorschau, noch nicht reserviert."
                  : "Vorschau des ersten Vorschlags. Das amtliche Schild trägt zusätzlich die Plaketten der Behörde."}
            </p>
          </div>

          <div className="min-[1100px]:order-1">
            <BezirkWahl
              bezirke={bezirke}
              ladefehler={ladefehler}
              onNeuLaden={lade}
              bezirk={bezirk}
              kuerzel={kuerzel}
              onWaehle={waehleBezirk}
              onAendern={() => {
                stand.current += 1;
                kiFrage.current = null;
                setBezirk(null);
                setVorschlaege([]);
                setAuswahl(null);
                schreibeUebergabe(null);
                setPruefung(null);
              }}
              start={startOrt}
            />
          </div>
        </div>

        {bezirk && (
          <div className="mt-6 border-t border-line pt-5">
            {/* Gespräch */}
            <div
              ref={gespraech}
              className="grid max-h-[19rem] gap-2.5 overflow-y-auto overscroll-contain pr-1"
              role="log"
              aria-label="Gespräch mit dem Kennzeichenassistenten"
              aria-live="polite"
              tabIndex={0}
            >
              {verlauf.slice(-12).map((n) => (
                <p key={n.id} className={`kz-nachricht animate-msg-in ${n.von === "kunde" ? "kz-nachricht-kunde" : ""}`}>
                  <span className="sr-only">{n.von === "kunde" ? "Du: " : "Assistent: "}</span>
                  {n.text}
                </p>
              ))}
              {laedt && (
                <p className="kz-nachricht" role="status">
                  <span className="sr-only">Der Assistent überlegt</span>
                  <span aria-hidden className="inline-flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span key={i} className="animate-typing h-2 w-2 rounded-full bg-ink-500" style={{ animationDelay: `${i * 0.16}s` }} />
                    ))}
                  </span>
                </p>
              )}
            </div>

            {letzteOptionen && !laedt && (
              <div className="mt-3 flex flex-wrap gap-2" aria-label="Schnelle Antworten">
                {letzteOptionen.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="kz-chip"
                    onClick={() => {
                      // Die Knöpfe verschwinden mit der Antwort – Fokus ins Eingabefeld, nicht ins Leere.
                      eingabeFeld.current?.focus({ preventScroll: true });
                      void sende(o, "text", true);
                    }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={absenden} className="mt-4 flex gap-2.5">
              <label htmlFor={`${id}-wunsch`} className="sr-only">
                Dein Wunsch an den Assistenten
              </label>
              <input
                ref={eingabeFeld}
                id={`${id}-wunsch`}
                type="text"
                className="field min-w-0 flex-1"
                placeholder="Dein Wunsch, z. B. „sportlich mit der 7“"
                maxLength={300}
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                autoComplete="off"
                enterKeyHint="send"
                aria-describedby={`${id}-daten`}
              />
              <button type="submit" className="btn btn-primary shrink-0 px-5" disabled={laedt || eingabe.trim() === ""}>
                Senden
              </button>
            </form>
            <p id={`${id}-daten`} className="mt-2 text-[0.8125rem] leading-snug text-ink-600">
              Initialen, Namen und Daten, die der Assistent erkennt, bleiben in deinem Browser. Was er nicht selbst
              versteht, schickt er ohne diese Angaben an unseren KI-Dienst – bitte keine Adressen, Telefonnummern oder Namen
              anderer Personen eintippen.{" "}
              <Link href="/datenschutz/#kennzeichenassistent" className="underline">
                Datenschutz
              </Link>
            </p>

            <div className="mt-5 border-t border-line pt-5">
              <Schnellwahl
                gesperrt={laedt}
                stil={wuensche.stil}
                zusatz={wuensche.zusatz}
                onSende={(text, modus) => void sende(text, modus)}
                onStil={(s) => aendere({ stil: s }, s ? `Stil: ${stilName(s)}.` : "Ohne festen Stil.")}
                onZusatz={(z: Zusatz) => aendere({ zusatz: z }, z ? `${z}-Kennzeichen: Vor dem ${z} sind höchstens sieben Stellen möglich.` : "Wieder als Standardkennzeichen.")}
                onUeberraschung={() => void ueberrasche()}
              />
            </div>
          </div>
        )}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {ansage}
      </p>

      {bezirk && (
        <div ref={ergebnisse} className="mt-8 scroll-mt-24" aria-busy={laedt}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-[1.5rem] font-bold text-navy">
              {vorschlaege.length} {vorschlaege.length === 1 ? "Idee" : "Ideen"} für {kuerzel}
            </h2>
            <p className="text-[0.9375rem] text-ink-600">Alle Vorschläge sind Ideen – ob sie frei sind, zeigt erst die Prüfung.</p>
          </div>

          {vorschlaege.length > 0 ? (
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {vorschlaege.map((v) => (
                <VorschlagKarte
                  key={v.id}
                  v={v}
                  bezirk={bezirk}
                  status={status[v.id] ?? IDEE}
                  gemerkt={gemerktIds.has(v.id)}
                  gewaehlt={auswahlId === v.id}
                  pruefungOffen={pruefung === v.id}
                  behoerde={behoerde}
                  prueft={prueft === v.id}
                  onPruefen={() => void oeffnePruefung(v)}
                  onAehnliche={() => zeigeAehnliche(v)}
                  onMerken={() => merken(v)}
                  onWaehlen={() => waehle(v)}
                  onService={() => waehle(v, true)}
                  onBehoerdeGeoeffnet={() => zaehle("kza_pruefung", { bezirk: bezirk.slug, method: "behoerde" })}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-[var(--radius-card)] border border-line p-5 text-ink-600">
              Mit den aktuellen Vorgaben bleibt keine zulässige Kombination übrig. Lockere eine Einschränkung oder schreib
              „von vorn“.
            </p>
          )}

          {vorschlaege.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button type="button" className="btn btn-secondary btn-sm" disabled={laedt} onClick={() => void sende("Zeig mir weitere", "mehr")}>
                Weitere Ideen zeigen
              </button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={laedt} onClick={() => void ueberrasche()}>
                <span aria-hidden>✨</span> KI, überrasche mich!
              </button>
            </div>
          )}

          {auswahl && (
            <Abschluss
              ref={abschlussTitel}
              auswahl={auswahl}
              bezirk={bezirk}
              status={status[auswahlId!] ?? IDEE}
              gemerkt={gemerktIds.has(auswahlId!)}
              service={service}
              onService={(an) => {
                setService(an);
                // Die Übergabe an den Auftrag folgt der Entscheidung sofort.
                if (auswahl && bezirk) merkeAuswahl(auswahl, bezirk, an);
              }}
              onWeiter={weiterZumAuftrag}
              onMerken={() => merken(auswahl)}
              onGeteilt={() => zaehle("kza_teilen", { bezirk: bezirk.slug })}
            />
          )}

          {tagesideen.length > 0 && (
            <section aria-labelledby={`${id}-tag`} className="mt-10 border-t border-line pt-7">
              <h2 id={`${id}-tag`} className="font-display text-[1.375rem] font-bold text-navy">
                Ideen des Tages für {kuerzel}
              </h2>
              <p className="mt-1.5 max-w-[46em] text-[0.9375rem] leading-relaxed text-ink-600">
                Jeden Tag drei neue Einfälle aus unserem Generator. Es sind reine Ideen: nicht geprüft, nicht reserviert,
                und ob sie frei sind, weiß nur die Zulassungsbehörde.
              </p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {tagesideen.map((v) => (
                  <li key={v.id} className="rounded-[var(--radius-card)] border border-line p-3">
                    <KennzeichenSchild kuerzel={v.kuerzel} buchstaben={v.buchstaben} ziffern={v.ziffern} zusatz={v.zusatz} />
                    <p className="mt-2 text-sm leading-snug text-ink-600">{v.idee}</p>
                    <button type="button" className="link mt-1 inline-flex min-h-11 items-center text-[0.9375rem]" onClick={() => zeige([v], "voran", "start", "generator", bezirk)}>
                      Zu meinen Vorschlägen<span className="sr-only">: {schreibweise(v)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Merkliste
        liste={merkliste}
        gespeichert={gespeichert}
        onWaehlen={(g) => {
          const b = bezirke?.find((x) => x.slug === g.bezirk);
          if (b && (b.slug !== bezirk?.slug || g.kuerzel !== kuerzel)) waehleBezirk(b, g.kuerzel);
          if (b) {
            merkeAuswahl(g, b, service);
            requestAnimationFrame(() => {
              abschlussTitel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
              abschlussTitel.current?.focus({ preventScroll: true });
            });
          }
        }}
        onEntfernen={(g) => {
          // Ohne gewählten Bezirk entfernbar: Die Merkliste steht auch da, bevor jemand sucht.
          const neu = merkliste.filter((x) => x.id !== g.id);
          setMerkliste(neu);
          setGespeichert(schreibeMerkliste(neu));
        }}
        onLeeren={() => {
          setMerkliste([]);
          setGespeichert(schreibeMerkliste([]));
        }}
      />
    </div>
  );
}
