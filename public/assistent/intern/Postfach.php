<?php
/**
 * Schmale Schnittstelle zum Postfach.
 *
 * Der Kern des Assistenten kennt nur diese acht Methoden. Dahinter steht im Betrieb das
 * echte Postfach (ImapPostfach) und in Tests ein Ordner mit .eml-Dateien (DateiPostfach).
 * So lässt sich der ganze Ablauf ohne Netz und ohne echtes Postfach prüfen, und die
 * IMAP-Bibliothek bleibt austauschbar.
 *
 * GRUNDSATZ (Bauplan 1.5): Das Postfach bleibt, wie es ist. Gelesen wird, ohne „gelesen“
 * zu setzen; nichts wird verschoben oder gelöscht. Die einzigen Schreibvorgänge sind
 * markiereBeantwortet() und legeInGesendet() – beide nur nach einem Versand, den ein Mensch
 * im Admin-Bereich ausgelöst hat.
 *
 * FEHLER: Ist das Postfach nicht erreichbar, werfen status(), neueUids(), hole(), flags()
 * und markiereBeantwortet() eine \RuntimeException mit einer kurzen Meldung ohne Inhalte
 * und ohne Zugangsdaten. legeInGesendet() meldet einen Fehlschlag mit false, selbsttest()
 * und schliessen() werfen nie.
 */

declare(strict_types=1);

namespace KZP\Assistent;

interface Postfach
{
    /**
     * Kennzahlen des Posteingangs.
     *
     * @return array{uidvalidity: int, uidnext: int}
     */
    public function status(): array;

    /**
     * UIDs größer als $abUid, aufsteigend, höchstens $max Stück.
     *
     * @return int[]
     */
    public function neueUids(int $abUid, int $max): array;

    /**
     * Holt eine Nachricht als neutrale Nachricht (Bauplan 4.8 und 7.4). Setzt \Seen NICHT.
     * null, wenn es die Nachricht nicht (mehr) gibt.
     *
     * @return array<string,mixed>|null
     */
    public function hole(int $uid): ?array;

    /**
     * Aktuelle Flags je UID. Nachrichten, die es nicht mehr gibt, fehlen im Ergebnis.
     *
     * @param int[] $uids
     * @return array<int,string[]>
     */
    public function flags(array $uids): array;

    /** Setzt \Answered am Original, nachdem die Antwort gesendet wurde. */
    public function markiereBeantwortet(int $uid): void;

    /** Legt die gesendete Antwort (rohe Mail) als gelesen im Gesendet-Ordner ab. */
    public function legeInGesendet(string $rohMail): bool;

    /**
     * Prüft Anmeldung und Ordner, ohne Inhalte preiszugeben.
     *
     * @return array{ok: bool, ordner: string[], posteingang: int, meldung: string}
     */
    public function selbsttest(): array;

    /** Beendet die Verbindung. Danach darf das Objekt weiter benutzt werden (es verbindet neu). */
    public function schliessen(): void;
}
