/**
 * Kennzeichen-Vorschau teilen (z. B. per WhatsApp).
 *
 * Geteilt wird nur, was der Kunde selbst anstößt: die gewählte Kombination als Bild
 * und ein kurzer Text mit dem Link zum Assistenten. Der Link enthält die Kombination
 * NICHT – so entstehen keine Adressen mit persönlichen Angaben und keine Flut
 * einzelner Kennzeichen-URLs für Suchmaschinen.
 *
 * Das Bild entsteht im Browser auf einer Zeichenfläche; es wird nirgends hochgeladen.
 */
import { site } from "@/lib/site";
import { schreibweise } from "./regeln";
import type { Kombination } from "./typen";

const SEITE = `${site.url}/wunschkennzeichen-generator/`;

export function teilText(k: Kombination): string {
  return `Meine Kennzeichen-Idee: ${schreibweise(k)} – gefunden mit dem KI-Kennzeichenassistenten von ${site.name}. (Nur eine Idee, noch nicht reserviert.)`;
}

/** Zeichnet die Vorschau als PNG (1200 × 630, passt für Chats und soziale Netzwerke). */
async function alsBild(k: Kombination): Promise<File | null> {
  try {
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 630;
    const x = c.getContext("2d");
    if (!x) return null;
    const schrift = getComputedStyle(document.body).fontFamily || "sans-serif";
    await document.fonts?.ready;

    x.fillStyle = "#eef1f6";
    x.fillRect(0, 0, 1200, 630);

    // Schild 1040 × 220 (Verhältnis 520 : 110)
    const px = 80;
    const py = 170;
    const b = 1040;
    const h = 220;
    const rund = (rx: number, ry: number, rb: number, rh: number, r: number) => {
      x.beginPath();
      x.roundRect(rx, ry, rb, rh, r);
    };
    x.fillStyle = "#0b0f1a";
    rund(px, py, b, h, 26);
    x.fill();
    x.fillStyle = "#ffffff";
    rund(px + 11, py + 11, b - 22, h - 22, 16);
    x.fill();
    // Euro-Feld
    x.save();
    rund(px + 11, py + 11, b - 22, h - 22, 16);
    x.clip();
    x.fillStyle = "#003399";
    x.fillRect(px + 11, py + 11, 88, h - 22);
    x.restore();
    x.fillStyle = "#ffcc00";
    for (let i = 0; i < 12; i++) {
      const w = (i * 30 * Math.PI) / 180;
      x.beginPath();
      x.arc(px + 55 + 24 * Math.sin(w), py + 68 - 24 * Math.cos(w), 4.2, 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = "#ffffff";
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    x.font = `700 54px ${schrift}`;
    x.fillText("D", px + 55, py + h - 34);

    // Schrift: schmal, wenn der Browser es kann – sonst staucht maxWidth sie passend.
    x.fillStyle = "#0b0f1a";
    x.font = `700 extra-condensed 178px ${schrift}`;
    x.textBaseline = "middle";
    const links = px + 120;
    const text = `${k.kuerzel}  ${k.buchstaben} ${k.ziffern}${k.zusatz}`;
    x.fillText(text, links + (b - 150) / 2, py + h / 2 + 8, b - 190);

    x.fillStyle = "#04183f";
    x.font = `700 44px ${schrift}`;
    x.textBaseline = "alphabetic";
    x.fillText("Meine Kennzeichen-Idee", 600, 110);
    x.fillStyle = "#3d4a5f";
    x.font = `500 30px ${schrift}`;
    x.fillText("Vorschau · noch nicht reserviert", 600, 470);
    x.fillStyle = "#04183f";
    x.font = `700 32px ${schrift}`;
    x.fillText(`${site.domain} · KI-Kennzeichenassistent`, 600, 560);

    const blob = await new Promise<Blob | null>((fertig) => c.toBlob(fertig, "image/png"));
    return blob ? new File([blob], "kennzeichen-idee.png", { type: "image/png" }) : null;
  } catch {
    return null;
  }
}

export type TeilErgebnis = "geteilt" | "kopiert" | "abgebrochen" | "nicht_moeglich";

/**
 * Öffnet das Teilen-Menü des Geräts (mit Bild, wo möglich). Ohne Teilen-Menü wird der
 * Text in die Zwischenablage kopiert.
 */
export async function teile(k: Kombination): Promise<TeilErgebnis> {
  const text = teilText(k);
  const daten: ShareData = { title: "Meine Kennzeichen-Idee", text, url: SEITE };
  try {
    if (typeof navigator.share === "function") {
      const bild = await alsBild(k);
      if (bild && navigator.canShare?.({ files: [bild] })) {
        await navigator.share({ ...daten, files: [bild] });
      } else {
        await navigator.share(daten);
      }
      return "geteilt";
    }
  } catch (fehler) {
    // Menü geschlossen: kein Fehler, nichts weiter tun.
    if ((fehler as DOMException)?.name === "AbortError") return "abgebrochen";
  }
  try {
    await navigator.clipboard.writeText(`${text} ${SEITE}`);
    return "kopiert";
  } catch {
    return "nicht_moeglich";
  }
}

/** Direktlink in WhatsApp mit vorbereitetem Text (für Geräte ohne Teilen-Menü). */
export function whatsAppTeilLink(k: Kombination): string {
  return `https://wa.me/?text=${encodeURIComponent(`${teilText(k)} ${SEITE}`)}`;
}
