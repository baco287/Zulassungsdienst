<?php
/**
 * Postfach aus einem Ordner mit .eml-Dateien – für Tests und die lokale Vorschau.
 *
 * Jede Datei „NN-name.eml“ ist eine Nachricht mit der UID NN. Zerlegt wird über denselben
 * MailLeser wie im Echtbetrieb. Was das echte Postfach am Server speichert, liegt hier in
 * Dateien daneben:
 *
 *   <ordner>/.zustand.json   Flags je UID (z. B. „\Answered“), optional „uidvalidity“
 *   <ordner>/gesendet/       abgelegte Antworten
 *
 * So lässt sich der ganze Ablauf – einlesen, Entwurf, senden, als beantwortet markieren –
 * ohne Netz durchspielen. Gewählt wird die Klasse über KZP_ASSISTENT_POSTFACH=datei:<pfad>
 * (Kern::postfach()).
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class DateiPostfach implements Postfach
{
    /** Fester Wert, solange .zustand.json nichts anderes sagt (dort für Tests änderbar). */
    private const UIDVALIDITY = 1;

    private string $ordner;

    public function __construct(string $ordner)
    {
        $this->ordner = rtrim($ordner, '/');
    }

    public function status(): array
    {
        $uids = array_keys($this->dateien());
        return [
            'uidvalidity' => $this->uidvalidity(),
            'uidnext' => $uids === [] ? 1 : max($uids) + 1,
        ];
    }

    public function neueUids(int $abUid, int $max): array
    {
        $uids = array_values(array_filter(
            array_keys($this->dateien()),
            static fn (int $uid): bool => $uid > $abUid
        ));
        return array_slice($uids, 0, max(0, $max));
    }

    public function hole(int $uid): ?array
    {
        $pfad = $this->dateien()[$uid] ?? null;
        if ($pfad === null) {
            return null;
        }
        $roh = @file_get_contents($pfad);
        if ($roh === false) {
            return null;
        }
        return MailLeser::ausRoh($roh, $uid, $this->uidvalidity(), $this->zustand()['flags'][(string) $uid] ?? []);
    }

    public function flags(array $uids): array
    {
        $dateien = $this->dateien();
        $gespeichert = $this->zustand()['flags'];
        $ergebnis = [];
        foreach ($uids as $uid) {
            $uid = (int) $uid;
            if (isset($dateien[$uid])) {
                $ergebnis[$uid] = $gespeichert[(string) $uid] ?? [];
            }
        }
        return $ergebnis;
    }

    public function markiereBeantwortet(int $uid): void
    {
        if (!isset($this->dateien()[$uid])) {
            return;   // wie beim echten Postfach: eine gelöschte Nachricht ist kein Fehler
        }
        $zustand = $this->zustand();
        $flags = $zustand['flags'][(string) $uid] ?? [];
        if (!in_array('\\Answered', $flags, true)) {
            $flags[] = '\\Answered';
        }
        $zustand['flags'][(string) $uid] = $flags;
        $json = json_encode($zustand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
        if ($json === false || @file_put_contents($this->ordner . '/.zustand.json', $json . "\n", LOCK_EX) === false) {
            throw new \RuntimeException('Datei-Postfach: Zustand kann nicht gespeichert werden.');
        }
    }

    public function legeInGesendet(string $rohMail): bool
    {
        if (trim($rohMail) === '') {
            return false;   // wie beim echten Postfach: eine leere Mail wird nicht abgelegt
        }
        $ziel = $this->ordner . '/gesendet';
        if (!is_dir($ziel) && !@mkdir($ziel, 0700, true) && !is_dir($ziel)) {
            return false;
        }
        $datei = $ziel . '/' . Umgebung::jetzt() . '-' . bin2hex(random_bytes(4)) . '.eml';
        return @file_put_contents($datei, $rohMail, LOCK_EX) !== false;
    }

    public function selbsttest(): array
    {
        if (!is_dir($this->ordner)) {
            return ['ok' => false, 'ordner' => [], 'posteingang' => 0, 'meldung' => 'Datei-Postfach: Ordner fehlt.'];
        }
        $anzahl = count($this->dateien());
        return [
            'ok' => true,
            'ordner' => ['INBOX', 'gesendet'],
            'posteingang' => $anzahl,
            'meldung' => 'Datei-Postfach (Test): ' . $anzahl . ' Nachrichten, Gesendet-Ordner: gesendet',
        ];
    }

    public function schliessen(): void
    {
        // Nichts offen: Jede Methode liest die Dateien frisch.
    }

    /**
     * UID => Pfad, aufsteigend nach UID.
     *
     * @return array<int,string>
     */
    private function dateien(): array
    {
        $liste = [];
        foreach (glob($this->ordner . '/*.eml') ?: [] as $pfad) {
            if (preg_match('/^(\d{1,9})-[^\/]*\.eml$/', basename($pfad), $t) === 1 && (int) $t[1] > 0) {
                $liste[(int) $t[1]] = $pfad;
            }
        }
        ksort($liste, SORT_NUMERIC);
        return $liste;
    }

    /**
     * Inhalt von .zustand.json in fester Form; eine fehlende oder kaputte Datei zählt als leer.
     *
     * @return array{uidvalidity?: int, flags: array<string,string[]>}
     */
    private function zustand(): array
    {
        $zustand = ['flags' => []];
        $roh = @file_get_contents($this->ordner . '/.zustand.json');
        $daten = is_string($roh) ? json_decode($roh, true) : null;
        if (!is_array($daten)) {
            return $zustand;
        }
        if (isset($daten['uidvalidity']) && is_int($daten['uidvalidity']) && $daten['uidvalidity'] > 0) {
            $zustand['uidvalidity'] = $daten['uidvalidity'];
        }
        foreach ((array) ($daten['flags'] ?? []) as $uid => $flags) {
            $zustand['flags'][(string) $uid] = array_values(array_filter((array) $flags, 'is_string'));
        }
        return $zustand;
    }

    private function uidvalidity(): int
    {
        return $this->zustand()['uidvalidity'] ?? self::UIDVALIDITY;
    }
}
