/**
 * Durchgestrichener Vergleichspreis vor dem Aktionspreis: alter Betrag grau mit
 * roter Linie, danach folgt der eigentliche Preis. Ohne Betrag (keine Aktion, kein
 * Streichpreis in config/preise.json) wird nichts angezeigt.
 *
 * Screenreader lesen „bisher <alter Preis>, jetzt <neuer Preis>“. `data-streichpreis` braucht die
 * Preisprüfung (scripts/check-preise.mjs), um den Streichpreis von einem
 * vergessenen Altpreis zu unterscheiden.
 *
 * Funktioniert in Server- und Client-Komponenten; den Betrag liefert
 * `streichpreisText()` aus lib/pricing.ts.
 */
export default function Streichpreis({ betrag, className = "" }: { betrag: string | null | undefined; className?: string }) {
  if (!betrag) return null;
  return (
    <>
      <del data-streichpreis="" className={`streichpreis ${className}`.trim()}>
        <span className="sr-only">bisher </span>
        {betrag}
      </del>
      <span className="sr-only">, jetzt </span>
    </>
  );
}
