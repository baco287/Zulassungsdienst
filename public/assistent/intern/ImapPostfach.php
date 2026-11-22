<?php
/**
 * Das echte Postfach über IMAP (Bibliothek ImapEngine, ohne PHP-Erweiterung).
 *
 * GRUNDSATZ: Das Postfach bleibt, wie es ist (Bauplan 1.5).
 *   - Gelesen wird nur der Posteingang, geöffnet mit EXAMINE (nur lesen) und abgerufen mit
 *     BODY.PEEK[] – doppelt gesichert, dass nie „gelesen“ gesetzt wird.
 *   - Schreibend geöffnet (SELECT) wird der Posteingang erst für markiereBeantwortet().
 *   - Nichts wird verschoben, gelöscht oder angelegt. Fehlt ein Gesendet-Ordner, wird die
 *     Kopie nicht abgelegt, statt einen Ordner zu erfinden.
 *
 * WARUM die Verbindungs-Schicht der Bibliothek: Die bequeme Schnittstelle (Mailbox →
 * Folder → MessageQuery) holt Kopf und Text getrennt, liest beim Anhängen die neue UID
 * aus einer Antwort, die der Server nur mit UIDPLUS liefert, und setzt kein Lese-Zeitlimit.
 * Hier wird deshalb je Schritt genau ein IMAP-Befehl über ImapConnection gesendet.
 *
 * ZEITLIMIT: Jeder Netzwerkschritt hat 10 Sekunden. Die Bibliothek begrenzt nur den
 * Verbindungsaufbau; ihr Stream würde bei einem verstummten Server endlos warten. Der eigene
 * Stream (neuerStrom) bricht nach Ablauf der Frist ab.
 *
 * FEHLER: Nach außen gehen nur kurze, feste Meldungen. Die Ausnahmen der Bibliothek
 * enthalten den gesendeten Befehl – beim Ablegen in „Gesendet“ wäre das die ganze Mail.
 */

declare(strict_types=1);

namespace KZP\Assistent;

use DirectoryTree\ImapEngine\Connection\ConnectionInterface;
use DirectoryTree\ImapEngine\Connection\ImapConnection;
use DirectoryTree\ImapEngine\Connection\Responses\Data\ListData;
use DirectoryTree\ImapEngine\Connection\Responses\Data\ResponseCodeData;
use DirectoryTree\ImapEngine\Connection\Streams\ImapStream;
use DirectoryTree\ImapEngine\Connection\Tokens\Nil;
use DirectoryTree\ImapEngine\Connection\Tokens\Token;
use DirectoryTree\ImapEngine\Exceptions\ImapCommandException;
use DirectoryTree\ImapEngine\Exceptions\ImapConnectionClosedException;
use DirectoryTree\ImapEngine\Exceptions\ImapConnectionFailedException;
use DirectoryTree\ImapEngine\Exceptions\ImapConnectionTimedOutException;
use DirectoryTree\ImapEngine\Support\Str;

final class ImapPostfach implements Postfach
{
    /** Zeitlimit je Netzwerkschritt in Sekunden. */
    private const ZEITLIMIT_SEK = 10;

    /** Größere Nachrichten werden nicht ganz geladen (nur Kopf, Text leer). */
    private const MAX_BYTES = 5242880;

    private const POSTEINGANG = 'INBOX';

    /** Übliche Namen des Gesendet-Ordners, falls der Server keinen als \Sent ausweist. */
    private const GESENDET_NAMEN = ['Sent', 'Gesendet', 'Gesendete Objekte', 'Gesendete Elemente', 'Sent Items', 'Sent Messages'];

    /** @var array{host: string, port: int, user: string, pass: string}|null */
    private ?array $zugang;

    /** Nur für Tests: eine vorbereitete Verbindung statt des echten Servers. */
    private ?ConnectionInterface $ersatz;

    private ?ConnectionInterface $verbindung = null;

    /** Der eigene Stream mit Frist (fehlt bei einer Test-Verbindung). */
    private ?object $strom = null;

    /** '' = kein Ordner geöffnet, 'lesen' = EXAMINE, 'schreiben' = SELECT. */
    private string $modus = '';

    private int $uidvalidity = 0;
    private int $uidnext = 0;
    private int $anzahl = 0;

    /** Pfad des Gesendet-Ordners, sobald er einmal gesucht wurde ('' = keiner gefunden). */
    private ?string $gesendet = null;

    /**
     * Flags und Größe aus neueUids(), damit hole() dafür nicht noch einmal fragen muss.
     *
     * @var array<int, array{flags: string[], bytes: int}>
     */
    private array $merkzettel = [];

    /**
     * @param array<string,mixed>|null $zugang ['host','port','user','pass']; ohne Angabe Zugang::imap()
     * @param ConnectionInterface|null $verbindung nur für Tests (z. B. ImapConnection mit Attrappen-Stream)
     */
    public function __construct(?array $zugang = null, ?ConnectionInterface $verbindung = null)
    {
        $zugang ??= Zugang::imap();
        $this->zugang = null;
        if (is_array($zugang) && ($zugang['host'] ?? '') !== '' && ($zugang['user'] ?? '') !== '' && ($zugang['pass'] ?? '') !== '') {
            $this->zugang = [
                'host' => (string) $zugang['host'],
                'port' => (int) ($zugang['port'] ?? 993) ?: 993,
                'user' => (string) $zugang['user'],
                'pass' => (string) $zugang['pass'],
            ];
        }
        $this->ersatz = $verbindung;
    }

    public function __destruct()
    {
        $this->schliessen();
    }

    public function status(): array
    {
        $zahlen = $this->kennzahlen();
        return ['uidvalidity' => $zahlen['uidvalidity'], 'uidnext' => $zahlen['uidnext']];
    }

    public function neueUids(int $abUid, int $max): array
    {
        if ($max < 1) {
            return [];
        }
        return $this->befehl('Suche nach neuen Nachrichten', false, function (ConnectionInterface $v) use ($abUid, $max): array {
            // „n:*“ liefert immer mindestens die jüngste Nachricht, auch wenn ihre UID
            // kleiner als n ist – deshalb wird das Ergebnis noch einmal gefiltert.
            $this->neueFrist();
            $alle = self::notizen($v->fetch(['UID', 'FLAGS', 'RFC822.SIZE'], max(1, $abUid + 1), INF));
            $neu = array_filter($alle, static fn (int $uid): bool => $uid > $abUid, ARRAY_FILTER_USE_KEY);
            ksort($neu, SORT_NUMERIC);
            $neu = array_slice($neu, 0, $max, true);
            $this->merkzettel = $neu;
            return array_keys($neu);
        });
    }

    public function hole(int $uid): ?array
    {
        if ($uid < 1) {
            return null;
        }
        $this->bereit(false);
        if ($this->uidvalidity === 0) {
            $this->kennzahlen();
        }
        return $this->befehl('Abruf einer Nachricht', false, function (ConnectionInterface $v) use ($uid): ?array {
            $notiz = $this->merkzettel[$uid] ?? null;
            if ($notiz === null) {
                $this->neueFrist();
                $notiz = self::notizen($v->fetch(['UID', 'FLAGS', 'RFC822.SIZE'], [$uid]))[$uid] ?? null;
                if ($notiz === null) {
                    return null;   // inzwischen gelöscht oder verschoben
                }
            }
            $zuGross = $notiz['bytes'] > self::MAX_BYTES;

            $this->neueFrist();
            $roh = null;
            foreach ($v->fetch([$zuGross ? 'BODY.PEEK[HEADER]' : 'BODY.PEEK[]'], [$uid]) as $antwort) {
                $daten = $antwort->tokenAt(3);
                if ($daten instanceof ListData && self::zahl(self::feld($daten, 'UID')) === $uid) {
                    $roh = self::inhalt($daten);
                }
            }
            if ($roh === null) {
                return null;
            }

            $nachricht = MailLeser::ausRoh($roh, $uid, $this->uidvalidity, $notiz['flags']);
            if ($zuGross) {
                // Nur der Kopf wurde geladen. Die Größe stammt fast immer von Anhängen;
                // ihre Art ist unbekannt, deshalb „sonst“.
                $nachricht['groesse'] = $notiz['bytes'];
                $nachricht['text'] = '';
                $nachricht['ist_html'] = false;
                $nachricht['anhaenge'] = [['art' => 'sonst', 'bytes' => $notiz['bytes']]];
            }
            return $nachricht;
        });
    }

    public function flags(array $uids): array
    {
        $gefragt = [];
        foreach ($uids as $uid) {
            if (is_numeric($uid) && (int) $uid > 0) {
                $gefragt[(int) $uid] = true;
            }
        }
        if ($gefragt === []) {
            return [];
        }
        ksort($gefragt, SORT_NUMERIC);
        return $this->befehl('Abfrage der Markierungen', false, function (ConnectionInterface $v) use ($gefragt): array {
            $ergebnis = [];
            foreach (array_chunk(array_keys($gefragt), 100) as $teil) {
                $this->neueFrist();
                foreach (self::notizen($v->fetch(['UID', 'FLAGS'], $teil)) as $uid => $notiz) {
                    if (isset($gefragt[$uid])) {
                        $ergebnis[$uid] = $notiz['flags'];
                    }
                }
            }
            ksort($ergebnis, SORT_NUMERIC);
            return $ergebnis;
        });
    }

    public function markiereBeantwortet(int $uid): void
    {
        if ($uid < 1) {
            return;
        }
        $this->befehl('Markieren als beantwortet', true, function (ConnectionInterface $v) use ($uid): void {
            $this->neueFrist();
            $v->store(['\\Answered'], [$uid], null, '+');
        });
        unset($this->merkzettel[$uid]);
    }

    public function legeInGesendet(string $rohMail): bool
    {
        if (trim($rohMail) === '') {
            return false;
        }
        try {
            $v = $this->verbinde();
            if ($this->gesendet === null) {
                $this->neueFrist();
                $this->gesendet = self::gesendetOrdner(self::ordnerliste($v->list('', '*')))['pfad'] ?? '';
            }
            if ($this->gesendet === '') {
                return false;
            }
            $this->neueFrist();
            $v->append($this->gesendet, (string) preg_replace('/\r\n|\r|\n/', "\r\n", $rohMail), ['\\Seen']);
            return true;
        } catch (\Throwable) {
            // Die Mail ist zu diesem Zeitpunkt schon beim Kunden; hier fehlt nur die Kopie.
            $this->schliessen();
            return false;
        }
    }

    public function selbsttest(): array
    {
        try {
            $zahlen = $this->kennzahlen();
            $v = $this->verbinde();
            $this->neueFrist();
            $ordner = self::ordnerliste($v->list('', '*'));
            $gesendet = self::gesendetOrdner($ordner);
            $this->gesendet = $gesendet['pfad'] ?? '';
            return [
                'ok' => true,
                'ordner' => array_column($ordner, 'name'),
                'posteingang' => $zahlen['anzahl'],
                'meldung' => 'Anmeldung erfolgreich, ' . $zahlen['anzahl'] . ' Nachrichten im Posteingang, '
                    . ($gesendet !== null ? 'Gesendet-Ordner: ' . $gesendet['name'] : 'kein Gesendet-Ordner gefunden'),
                'gesendet' => $gesendet['name'] ?? '',
            ];
        } catch (\Throwable $e) {
            $this->schliessen();
            return [
                'ok' => false,
                'ordner' => [],
                'posteingang' => 0,
                'meldung' => self::eigeneMeldung($e) ?? 'Postfach: Selbsttest fehlgeschlagen (' . self::art($e) . ').',
                'gesendet' => '',
            ];
        }
    }

    public function schliessen(): void
    {
        $v = $this->verbindung;
        $this->verbindung = null;
        $this->modus = '';
        $this->merkzettel = [];
        if ($v === null) {
            return;
        }
        try {
            if ($v->connected()) {
                $this->neueFrist();
                $v->logout();
            }
        } catch (\Throwable) {
            // Abmelden ist Höflichkeit; die Verbindung wird ohnehin geschlossen.
        }
        try {
            $v->disconnect();
        } catch (\Throwable) {
            // Schon getrennt.
        }
    }

    // -- Verbindung -----------------------------------------------------------------------

    /**
     * Führt einen Arbeitsschritt am geöffneten Posteingang aus. Scheitert er, wird die
     * Verbindung verworfen (es ist dann unklar, welche Antworten noch in der Leitung stehen)
     * und eine neutrale Ausnahme geworfen.
     *
     * @template T
     * @param callable(ConnectionInterface): T $arbeit
     * @return T
     */
    private function befehl(string $schritt, bool $schreiben, callable $arbeit): mixed
    {
        $v = $this->bereit($schreiben);
        try {
            return $arbeit($v);
        } catch (\Throwable $e) {
            $this->schliessen();
            throw new \RuntimeException(self::eigeneMeldung($e) ?? 'Postfach: ' . $schritt . ' fehlgeschlagen (' . self::art($e) . ').');
        }
    }

    /** Verbunden, angemeldet und Posteingang in der nötigen Art geöffnet. */
    private function bereit(bool $schreiben): ConnectionInterface
    {
        $v = $this->verbinde();
        if ($this->modus === 'schreiben' || ($this->modus === 'lesen' && !$schreiben)) {
            return $v;
        }
        try {
            $this->neueFrist();
            $antworten = $schreiben ? $v->select(self::POSTEINGANG) : $v->examine(self::POSTEINGANG);
        } catch (\Throwable $e) {
            $this->schliessen();
            throw new \RuntimeException('Postfach: Posteingang lässt sich nicht öffnen (' . self::art($e) . ').');
        }
        // Der Server nennt beim Öffnen Anzahl, UIDVALIDITY und UIDNEXT.
        foreach ($antworten as $antwort) {
            $zweites = $antwort->tokenAt(2);
            if ($zweites instanceof Token && strtoupper($zweites->value) === 'EXISTS') {
                $this->anzahl = self::zahl($antwort->tokenAt(1));
            } elseif ($zweites instanceof ResponseCodeData) {
                $name = $zweites->tokenAt(0);
                $name = $name instanceof Token ? strtoupper($name->value) : '';
                if ($name === 'UIDVALIDITY') {
                    $this->uidvalidity = self::zahl($zweites->tokenAt(1));
                } elseif ($name === 'UIDNEXT') {
                    $this->uidnext = self::zahl($zweites->tokenAt(1));
                }
            }
        }
        $this->modus = $schreiben ? 'schreiben' : 'lesen';
        return $v;
    }

    private function verbinde(): ConnectionInterface
    {
        if ($this->verbindung !== null) {
            if ($this->verbindung->connected()) {
                return $this->verbindung;
            }
            $this->schliessen();
        }
        if ($this->zugang === null) {
            throw new \RuntimeException('Postfach: kein Zugang hinterlegt.');
        }
        if (!interface_exists(ConnectionInterface::class)) {
            throw new \RuntimeException('Postfach: Bibliotheken fehlen.');
        }

        if ($this->ersatz !== null) {
            $v = $this->ersatz;
            $this->strom = null;
        } else {
            $this->strom = self::neuerStrom(self::ZEITLIMIT_SEK);
            $v = new ImapConnection($this->strom);
        }
        try {
            $this->neueFrist();
            $v->connect($this->zugang['host'], $this->zugang['port'], [
                // 993 = TLS von Anfang an; 143 = STARTTLS. Unverschlüsselt wird nie gesprochen.
                'encryption' => $this->zugang['port'] === 143 ? 'starttls' : 'ssl',
                'timeout' => self::ZEITLIMIT_SEK,
                'validate_cert' => true,
            ]);
        } catch (\Throwable $e) {
            self::trenne($v);
            throw new \RuntimeException('Postfach: Verbindung zum Mailserver fehlgeschlagen (' . self::art($e) . ').');
        }
        try {
            $this->neueFrist();
            $v->login($this->zugang['user'], $this->zugang['pass']);
        } catch (\Throwable $e) {
            self::trenne($v);
            throw new \RuntimeException(
                $e instanceof ImapCommandException
                    ? 'Postfach: Anmeldung vom Mailserver abgelehnt.'
                    : 'Postfach: Anmeldung fehlgeschlagen (' . self::art($e) . ').'
            );
        }
        $this->verbindung = $v;
        $this->modus = '';
        return $v;
    }

    private static function trenne(ConnectionInterface $v): void
    {
        try {
            $v->disconnect();
        } catch (\Throwable) {
            // Es gab nichts mehr zu trennen.
        }
    }

    /**
     * UIDVALIDITY, UIDNEXT und Anzahl der Nachrichten im Posteingang.
     *
     * Zuerst mit STATUS (ein Befehl, frische Werte). Lehnt der Server das für den gerade
     * geöffneten Ordner ab, gelten die Angaben aus einem frischen EXAMINE.
     *
     * @return array{uidvalidity: int, uidnext: int, anzahl: int}
     */
    private function kennzahlen(): array
    {
        $zahlen = $this->befehl('Abfrage des Posteingangs', false, function (ConnectionInterface $v): array {
            try {
                $this->neueFrist();
                $liste = $v->status(self::POSTEINGANG, ['MESSAGES', 'UIDNEXT', 'UIDVALIDITY'])->tokenAt(3);
            } catch (ImapCommandException | \TypeError) {
                // „NO“ oder eine Antwort ohne STATUS-Zeile: Die Leitung ist in Ordnung,
                // nur diese Auskunft fehlt.
                return [];
            }
            $werte = [];
            if ($liste instanceof ListData) {
                $teile = $liste->tokens();
                for ($i = 0; $i + 1 < count($teile); $i += 2) {
                    if ($teile[$i] instanceof Token) {
                        $werte[strtoupper($teile[$i]->value)] = self::zahl($teile[$i + 1]);
                    }
                }
            }
            return $werte;
        });

        if (($zahlen['UIDVALIDITY'] ?? 0) > 0 && ($zahlen['UIDNEXT'] ?? 0) > 0) {
            $this->uidvalidity = $zahlen['UIDVALIDITY'];
            $this->uidnext = $zahlen['UIDNEXT'];
            $this->anzahl = $zahlen['MESSAGES'] ?? $this->anzahl;
        } else {
            $schreiben = $this->modus === 'schreiben';
            $this->modus = '';
            $this->bereit($schreiben);
        }
        if ($this->uidvalidity < 1 || $this->uidnext < 1) {
            throw new \RuntimeException('Postfach: Der Mailserver nennt keine UID-Kennzahlen.');
        }
        return ['uidvalidity' => $this->uidvalidity, 'uidnext' => $this->uidnext, 'anzahl' => $this->anzahl];
    }

    /** Startet die Frist für den nächsten Netzwerkschritt. */
    private function neueFrist(): void
    {
        if ($this->strom !== null) {
            $this->strom->neueFrist();
        }
    }

    /**
     * Stream der Bibliothek mit einer Frist je Netzwerkschritt.
     *
     * Der Stream der Bibliothek setzt kein Lese-Zeitlimit und wiederholt das Lesen eines
     * Mail-Körpers, solange die Verbindung offen ist – ein verstummter Server hielte den
     * Lauf (und damit die Laufsperre) beliebig lange fest.
     */
    private static function neuerStrom(int $sekunden): ImapStream
    {
        return new class($sekunden) extends ImapStream {
            private float $frist = 0.0;

            public function __construct(private int $sekunden)
            {
            }

            public function neueFrist(): void
            {
                $this->frist = microtime(true) + $this->sekunden;
            }

            public function open(string $transport, string $host, int $port, int $timeout, array $options = []): bool
            {
                $offen = parent::open($transport, $host, $port, $timeout, $options);
                $this->neueFrist();
                return $offen;
            }

            public function read(int $length): string|false
            {
                $daten = '';
                while (strlen($daten) < $length) {
                    if (!$this->warteHoechstens() || feof($this->stream)) {
                        return false;
                    }
                    $stueck = fread($this->stream, min(262144, $length - strlen($daten)));
                    if ($stueck === false || ($stueck === '' && (stream_get_meta_data($this->stream)['timed_out'] ?? false))) {
                        return false;
                    }
                    $daten .= $stueck;
                }
                return $daten;
            }

            public function fgets(): string|false
            {
                return $this->warteHoechstens() ? fgets($this->stream) : false;
            }

            public function meta(): array
            {
                $meta = parent::meta();
                if ($this->abgelaufen()) {
                    $meta['timed_out'] = true;
                }
                return $meta;
            }

            private function abgelaufen(): bool
            {
                return $this->frist > 0.0 && microtime(true) >= $this->frist;
            }

            /** Stellt das Lese-Zeitlimit auf den Rest der Frist; false, wenn sie um ist. */
            private function warteHoechstens(): bool
            {
                if (!$this->opened() || $this->abgelaufen()) {
                    return false;
                }
                $rest = max(0.05, $this->frist - microtime(true));
                stream_set_timeout($this->stream, (int) $rest, (int) (($rest - (int) $rest) * 1000000));
                return true;
            }
        };
    }

    // -- Antworten des Servers lesen ------------------------------------------------------

    /**
     * Liest aus FETCH-Antworten je UID Flags und Größe.
     *
     * @param iterable<mixed> $antworten
     * @return array<int, array{flags: string[], bytes: int}>
     */
    private static function notizen(iterable $antworten): array
    {
        $notizen = [];
        foreach ($antworten as $antwort) {
            $daten = $antwort->tokenAt(3);
            if (!$daten instanceof ListData) {
                continue;
            }
            $uid = self::zahl(self::feld($daten, 'UID'));
            if ($uid < 1) {
                continue;
            }
            $flags = [];
            $liste = self::feld($daten, 'FLAGS');
            if ($liste instanceof ListData) {
                foreach ($liste->tokens() as $flag) {
                    if ($flag instanceof Token && $flag->value !== '') {
                        $flags[] = $flag->value;
                    }
                }
            }
            $notizen[$uid] = ['flags' => $flags, 'bytes' => self::zahl(self::feld($daten, 'RFC822.SIZE'))];
        }
        return $notizen;
    }

    /**
     * Wert hinter einem Feldnamen in einer FETCH-Antwort. Eigene Suche statt
     * ListData::lookup(): Die wandelt jedes Element in Text um – auch den Mail-Körper,
     * der dabei jedes Mal kopiert würde.
     */
    private static function feld(ListData $daten, string $name): mixed
    {
        $teile = $daten->tokens();
        foreach ($teile as $i => $teil) {
            if ($teil instanceof Token && strlen($teil->value) === strlen($name) && strcasecmp($teil->value, $name) === 0) {
                return $teile[$i + 1] ?? null;
            }
        }
        return null;
    }

    /**
     * Der Mail-Körper aus „BODY[] {n}…“ bzw. „BODY[HEADER] {n}…“: das Element nach der
     * eckigen Klammer. null, wenn der Server NIL liefert (Nachricht gerade gelöscht).
     */
    private static function inhalt(ListData $daten): ?string
    {
        $teile = $daten->tokens();
        foreach ($teile as $i => $teil) {
            if ($teil instanceof ResponseCodeData) {
                $wert = $teile[$i + 1] ?? null;
                return ($wert instanceof Token && !$wert instanceof Nil) ? $wert->value : null;
            }
        }
        return null;
    }

    private static function zahl(mixed $teil): int
    {
        return ($teil instanceof Token && ctype_digit($teil->value)) ? (int) $teil->value : 0;
    }

    /**
     * Ordner aus den LIST-Antworten.
     *
     * @param iterable<mixed> $antworten
     * @return list<array{pfad: string, name: string, merkmale: string[]}>
     */
    private static function ordnerliste(iterable $antworten): array
    {
        $ordner = [];
        foreach ($antworten as $antwort) {
            $pfad = $antwort->tokenAt(4);
            if (!$pfad instanceof Token || $pfad->value === '') {
                continue;
            }
            $merkmale = [];
            $liste = $antwort->tokenAt(2);
            if ($liste instanceof ListData) {
                foreach ($liste->tokens() as $merkmal) {
                    if ($merkmal instanceof Token) {
                        $merkmale[] = strtolower($merkmal->value);
                    }
                }
            }
            $ordner[] = ['pfad' => $pfad->value, 'name' => Str::fromImapUtf7($pfad->value), 'merkmale' => $merkmale];
        }
        return $ordner;
    }

    /**
     * Sucht den Gesendet-Ordner: zuerst das Merkmal \Sent, dann die üblichen Namen – erst
     * als ganzer Pfad, dann als letzter Teil („INBOX.Sent“).
     *
     * @param list<array{pfad: string, name: string, merkmale: string[]}> $ordner
     * @return array{pfad: string, name: string, merkmale: string[]}|null
     */
    private static function gesendetOrdner(array $ordner): ?array
    {
        $waehlbar = array_values(array_filter(
            $ordner,
            static fn (array $o): bool => !in_array('\\noselect', $o['merkmale'], true) && !in_array('\\nonexistent', $o['merkmale'], true)
        ));
        foreach ($waehlbar as $o) {
            if (in_array('\\sent', $o['merkmale'], true)) {
                return $o;
            }
        }
        foreach (self::GESENDET_NAMEN as $name) {
            foreach ($waehlbar as $o) {
                if (strcasecmp($o['name'], $name) === 0) {
                    return $o;
                }
            }
            foreach ($waehlbar as $o) {
                if (preg_match('/[.\/]' . preg_quote($name, '/') . '$/i', $o['name']) === 1) {
                    return $o;
                }
            }
        }
        return null;
    }

    // -- Fehlermeldungen ------------------------------------------------------------------

    /** Meldungen, die diese Klasse selbst formuliert hat, dürfen unverändert weiter. */
    private static function eigeneMeldung(\Throwable $e): ?string
    {
        return ($e instanceof \RuntimeException && str_starts_with($e->getMessage(), 'Postfach: ')) ? $e->getMessage() : null;
    }

    /** Art des Fehlers in einem Wort – ohne die Meldung der Bibliothek (siehe Dateikopf). */
    private static function art(\Throwable $e): string
    {
        return match (true) {
            $e instanceof ImapConnectionTimedOutException => 'Zeitlimit überschritten',
            $e instanceof ImapConnectionClosedException => 'Verbindung vom Server beendet',
            $e instanceof ImapConnectionFailedException => 'keine Verbindung',
            $e instanceof ImapCommandException => 'vom Server abgelehnt',
            default => 'Übertragungsfehler',
        };
    }
}
