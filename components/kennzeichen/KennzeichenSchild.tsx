import type { Zusatz } from "@/lib/kennzeichen/typen";

/**
 * Vorschau eines deutschen Kfz-Kennzeichens im Maßverhältnis des einzeiligen
 * Euro-Kennzeichens (520 × 110 mm): schwarzer Rand, weißes Feld, links das blaue
 * Euro-Feld mit Sternenkranz und „D“, dazwischen der Platz für die Plaketten.
 *
 * Bewusst eine Vorschau und kein Abbild eines amtlichen Schilds:
 *  - keine Stempelplakette, kein Wappen, keine HU-Plakette – nur zwei neutrale Kreise
 *    an deren Stelle. Die echten Plaketten bringt die Zulassungsbehörde an.
 *  - nicht die amtliche FE-Schrift. Die verbreiteten Nachbauten sind nur für private
 *    Nutzung frei; die schmale Archivo der Website kommt der Anmutung nahe und kostet
 *    keine zusätzliche Ladezeit.
 *
 * Reines HTML und CSS (app/globals.css, Klassen .kz-…): Alle Maße hängen an der
 * Breite der Hülle (Container-Einheiten), das Schild sieht in jeder Größe gleich aus
 * und braucht weder Bilddatei noch Skript.
 */

/** Fünfzackiger Stern, zentriert auf dem Ursprung (Außenradius 10). */
const STERN =
  "M0,-10 L2.35,-3.24 L9.51,-3.09 L3.8,1.24 L5.88,8.09 L0,4 L-5.88,8.09 L-3.8,1.24 L-9.51,-3.09 L-2.35,-3.24 Z";

/** Auf drei Stellen gerundet: Node und Browser rechnen sin/cos minimal verschieden (sonst Hydration-Fehler). */
const STERNE = Array.from({ length: 12 }, (_, i) => {
  const winkel = (i * 30 * Math.PI) / 180;
  return [(12 + 8.2 * Math.sin(winkel)).toFixed(3), (12 - 8.2 * Math.cos(winkel)).toFixed(3)] as const;
});

/** Ungefähre Breite je Zeichen in em (Archivo, Breite 62, fett) – für die Schriftgröße. */
function breite(text: string): number {
  let b = 0;
  for (const c of text) b += "MW".includes(c) ? 0.74 : c === "I" ? 0.3 : c === "1" ? 0.42 : /[0-9]/.test(c) ? 0.53 : 0.58;
  return b;
}

/** Platz für die Schrift in cqw: Feldbreite ohne Euro-Feld, Rand, Plaketten und Lücke. */
const PLATZ = 66.5;
/**
 * Höchstens so groß, dass die Schrift in die Innenhöhe passt (100 × 110/520 − Rand ≈ 19 cqw).
 * Umlaute im Kürzel (KÖT, TÜ) ragen höher – dann etwas kleiner, sonst kappt der Rahmen die Punkte.
 */
const MAX_SCHRIFT = 18.5;
const MAX_SCHRIFT_UMLAUT = 16;

interface Props {
  kuerzel: string;
  buchstaben?: string;
  ziffern?: string;
  zusatz?: Zusatz;
  /** Schlüssel für die kurze Einblendung beim Wechsel (z. B. die ID des Vorschlags). */
  wechsel?: string;
  /** Rein dekorativ (der Text steht daneben) – dann für Screenreader ausblenden. */
  dekorativ?: boolean;
  className?: string;
}

export default function KennzeichenSchild({ kuerzel, buchstaben = "", ziffern = "", zusatz = "", wechsel, dekorativ = false, className = "" }: Props) {
  const leer = buchstaben === "" || ziffern === "";
  const b = leer ? "··" : buchstaben;
  const z = leer ? "···" : ziffern + zusatz;
  const schrift = Math.min(/[ÄÖÜ]/.test(kuerzel) ? MAX_SCHRIFT_UMLAUT : MAX_SCHRIFT, PLATZ / breite(kuerzel + b + z)).toFixed(2);
  const lesbar = leer ? `Kennzeichen ${kuerzel}, Kombination noch offen` : `Kennzeichen-Vorschau ${kuerzel}-${buchstaben} ${ziffern}${zusatz}`;

  return (
    <span className={`kz-huelle ${className}`} {...(dekorativ ? { "aria-hidden": true } : { role: "img", "aria-label": lesbar })}>
      <span className="kz">
        <span className="kz-eu">
          <svg viewBox="0 0 24 24" aria-hidden focusable="false">
            <g fill="#FFCC00">
              {STERNE.map(([x, y], i) => (
                <path key={i} d={STERN} transform={`translate(${x} ${y}) scale(0.16)`} />
              ))}
            </g>
          </svg>
          <span className="kz-eu-d">D</span>
        </span>
        <span className="kz-feld" style={{ fontSize: `${schrift}cqw` }}>
          <span>{kuerzel}</span>
          <span className="kz-plaketten" aria-hidden>
            <span className="kz-plakette kz-plakette-klein" />
            <span className="kz-plakette" />
          </span>
          <span key={wechsel} className={`kz-nummer ${wechsel ? "kz-wechsel" : ""} ${leer ? "kz-offen" : ""}`}>
            <span>{b}</span>
            <span className="kz-luecke" />
            <span>{z}</span>
          </span>
        </span>
      </span>
    </span>
  );
}
