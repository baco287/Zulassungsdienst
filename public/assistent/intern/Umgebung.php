<?php
/**
 * KI-Assistent – Umgebung: Datenordner, Uhr, Geheimwert und die Bibliotheken.
 *
 * DATENORDNER: Datenbank, Sperrdateien, Geheimwert und die entpackten Bibliotheken liegen
 * außerhalb des Web-Ordners in <Kontowurzel>/assistent-daten – wie die Webanalyse
 * (api/analytics-lib.php). Der Deploy (lftp mirror --delete) fasst den Ordner nie an, und er
 * ist nie per URL abrufbar. Lokal und in Tests lenkt KZP_ASSISTENT_DIR um.
 *
 * BIBLIOTHEKEN: Claude-SDK und ImapEngine bestehen aus rund 6.500 Dateien. Einzeln per FTP
 * hochgeladen wäre das langsam und läge im Web-Ordner. Der Deploy lädt deshalb ein einziges
 * Archiv intern/vendor-<hash>.zip hoch; der erste Aufruf danach entpackt es hierher.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Umgebung
{
    /** true, sobald der Autoloader der Bibliotheken eingebunden ist (setzt start.php). */
    public static bool $bibliotheken = false;

    /**
     * Nach einem gescheiterten Entpacken so lange nicht erneut versuchen. Ohne diese Pause
     * würde ein beschädigtes Archiv bei jedem Seitenaufruf wieder Tausende Dateien schreiben.
     */
    private const ENTPACK_PAUSE = 120;

    /** So lange wartet ein Aufruf höchstens darauf, dass ein anderer fertig entpackt hat. */
    private const ENTPACK_WARTEN = 60;

    /** @var array<string,string> Geheimwert je Datenordner (Tests wechseln den Ordner) */
    private static array $geheimnisse = [];

    /** @var array<string,true> Datenordner, deren Sperrdatei in diesem Aufruf schon geprüft ist */
    private static array $gesichert = [];

    /**
     * Ordner für Datenbank, Sperrdateien und Bibliotheken; wird mit 0700 angelegt.
     *
     * Der Ordner liegt neben dem Web-Ordner und ist damit nicht abrufbar. Als zweite
     * Sicherung bekommt er trotzdem eine eigene .htaccess: Sollte er durch eine geänderte
     * Domain-Zuordnung im KAS doch einmal unter einer Adresse erreichbar werden, bleiben
     * Kundenmails und Bibliotheken gesperrt.
     */
    public static function datenOrdner(): string
    {
        $env = getenv('KZP_ASSISTENT_DIR');
        $ordner = (is_string($env) && rtrim($env, '/') !== '')
            ? rtrim($env, '/')
            : self::wurzel() . '/assistent-daten';
        if (!is_dir($ordner) && !@mkdir($ordner, 0700, true) && !is_dir($ordner)) {
            throw new \RuntimeException('Datenordner kann nicht angelegt werden.');
        }
        if (!isset(self::$gesichert[$ordner])) {
            self::$gesichert[$ordner] = true;
            if (!is_file($ordner . '/.htaccess')) {
                @file_put_contents(
                    $ordner . '/.htaccess',
                    "# Daten des KI-Assistenten: nie direkt abrufbar (angelegt von Umgebung::datenOrdner()).\nRequire all denied\n",
                    LOCK_EX
                );
            }
        }
        return $ordner;
    }

    /** Aktuelle Zeit. Tests stellen die Uhr über KZP_ASSISTENT_JETZT (Unix-Sekunden). */
    public static function jetzt(): int
    {
        $env = getenv('KZP_ASSISTENT_JETZT');
        if (is_string($env) && preg_match('/^\d{1,12}$/', $env) === 1 && (int) $env > 0) {
            return (int) $env;
        }
        return time();
    }

    /** true bei lokaler Entwicklung und in Tests (dort ist KZP_ASSISTENT_DIR gesetzt). */
    public static function lokal(): bool
    {
        $env = getenv('KZP_ASSISTENT_DIR');
        return is_string($env) && $env !== '';
    }

    /**
     * Zufälliger Geheimwert dieser Installation (für CSRF-Token und kurzlebige Schlüssel),
     * wie kzp_secret() der Webanalyse. Lesen und Anlegen unter einer Sperre, damit zwei
     * gleichzeitige erste Aufrufe nicht zwei verschiedene Werte erzeugen.
     */
    public static function geheimnis(): string
    {
        $pfad = self::datenOrdner() . '/geheim.txt';
        if (isset(self::$geheimnisse[$pfad])) {
            return self::$geheimnisse[$pfad];
        }
        $wert = '';
        $datei = @fopen($pfad, 'c+');
        if ($datei !== false) {
            try {
                flock($datei, LOCK_EX);
                $wert = trim((string) stream_get_contents($datei));
                if (strlen($wert) < 32) {
                    $wert = bin2hex(random_bytes(32));
                    ftruncate($datei, 0);
                    rewind($datei);
                    fwrite($datei, $wert);
                    fflush($datei);
                }
            } finally {
                flock($datei, LOCK_UN);
                fclose($datei);
            }
            @chmod($pfad, 0600);
        }
        if (strlen($wert) < 32) {
            // Datei nicht schreibbar: Wert gilt nur für diesen Aufruf. Der Selbsttest meldet den Ordner.
            $wert = bin2hex(random_bytes(32));
        }
        return self::$geheimnisse[$pfad] = $wert;
    }

    /** Domain der Website; eigene Message-IDs und der EHLO-Name hängen daran. */
    public static function eigeneDomain(): string
    {
        return 'kfz-zulassungsprofis.de';
    }

    /**
     * Drei Ebenen über intern/: auf dem Server die Kontowurzel (über dem Web-Ordner),
     * lokal der Wurzelordner des Repositorys.
     */
    public static function wurzel(): string
    {
        return dirname(__DIR__, 3);
    }

    /**
     * Bindet den Autoloader der Bibliotheken ein (Bauplan 4.1): zuerst die lokale Installation,
     * sonst das vom Deploy hochgeladene Archiv. false heißt: Die Endpunkte melden
     * „Bibliotheken fehlen“; Speicher, Budget und Admin arbeiten trotzdem.
     */
    public static function ladeBibliotheken(): bool
    {
        if (self::bindeEin(self::wurzel() . '/server/assistent/vendor/autoload.php')) {
            return true;
        }
        try {
            $ausArchiv = self::bibliothekenAusArchiv(__DIR__);
        } catch (\Throwable) {
            // Datenordner nicht schreibbar o. Ä. – dann eben ohne Bibliotheken.
            return false;
        }
        return $ausArchiv !== null && self::bindeEin($ausArchiv);
    }

    /** Bindet einen Autoloader ein; false, wenn er fehlt oder sich nicht laden lässt. */
    private static function bindeEin(string $autoload): bool
    {
        if (!is_file($autoload)) {
            return false;
        }
        try {
            require_once $autoload;
            return true;
        } catch (\Throwable) {
            // z. B. Composers Plattformprüfung (PHP-Version passt nicht).
            return false;
        }
    }

    /**
     * Sucht in $internOrdner das Archiv vendor-<hash>.zip und liefert den Pfad zu
     * <Datenordner>/vendor-<hash>/autoload.php; entpackt beim ersten Mal. null, wenn kein
     * brauchbares Archiv da ist.
     *
     * Während eines Deploys können kurz zwei Archive nebeneinanderliegen, das neue womöglich
     * erst halb hochgeladen. Deshalb: neuestes zuerst, und scheitert es, das nächste nehmen –
     * dessen Ordner ist in aller Regel schon entpackt.
     */
    public static function bibliothekenAusArchiv(string $internOrdner): ?string
    {
        $internOrdner = rtrim($internOrdner, '/');
        $archive = [];
        foreach (@scandir($internOrdner) ?: [] as $name) {
            // Der Hash wird Teil eines Ordnernamens: nur Buchstaben und Ziffern zulassen.
            if (preg_match('/^vendor-([A-Za-z0-9]{6,64})\.zip$/', $name, $m) === 1 && is_file($internOrdner . '/' . $name)) {
                $archive[] = [
                    'pfad' => $internOrdner . '/' . $name,
                    'hash' => $m[1],
                    'zeit' => (int) @filemtime($internOrdner . '/' . $name),
                ];
            }
        }
        if ($archive === []) {
            return null;
        }
        usort($archive, static fn (array $a, array $b): int => [$b['zeit'], $b['hash']] <=> [$a['zeit'], $a['hash']]);

        $daten = self::datenOrdner();
        foreach ($archive as $archiv) {
            $ziel = $daten . '/vendor-' . $archiv['hash'];
            // Normalfall bei jedem Aufruf: Ordner ist da, das Archiv wird gar nicht angefasst.
            if (is_file($ziel . '/autoload.php')) {
                return $ziel . '/autoload.php';
            }
            $autoload = self::entpacke($archiv['pfad'], $ziel);
            if ($autoload !== null) {
                return $autoload;
            }
        }
        return null;
    }

    /**
     * Entpackt $archiv nach $ziel. Unter einer Dateisperre, damit zwei gleichzeitige Aufrufe
     * nicht durcheinanderschreiben; zuerst nach „<ziel>.tmp“ und erst am Ende umbenennen –
     * so gibt es den Zielordner nur vollständig oder gar nicht. Ein abgebrochener Versuch
     * hinterlässt höchstens den .tmp-Ordner, den der nächste Versuch wegräumt.
     */
    private static function entpacke(string $archiv, string $ziel): ?string
    {
        $daten = dirname($ziel);
        $sperre = @fopen($daten . '/bibliotheken.lock', 'c');
        if ($sperre === false) {
            return null;
        }
        try {
            if (!self::warteAufSperre($sperre)) {
                return null;
            }
            clearstatcache();
            if (is_file($ziel . '/autoload.php')) {
                // Ein anderer Aufruf hat inzwischen fertig entpackt.
                return $ziel . '/autoload.php';
            }

            // Bewusst die echte Uhr, nicht Umgebung::jetzt(): Es geht um Schonung des Servers.
            $merker = $daten . '/bibliotheken-versuch.txt';
            $letzter = explode(' ', trim((string) @file_get_contents($merker)), 2);
            if (count($letzter) === 2 && $letzter[0] === basename($ziel) && time() - (int) $letzter[1] < self::ENTPACK_PAUSE) {
                return null;
            }
            @file_put_contents($merker, basename($ziel) . ' ' . time(), LOCK_EX);

            // Rund 6.500 Dateien brauchen einige Sekunden; wo erlaubt, das Zeitlimit anheben.
            if (function_exists('set_time_limit')) {
                @set_time_limit(300);
            }

            $tmp = $ziel . '.tmp';
            self::loescheBibliotheksOrdner($tmp);
            // Zielordner ohne autoload.php ist beschädigt (von Hand gelöscht o. Ä.): ersetzen.
            self::loescheBibliotheksOrdner($ziel);
            clearstatcache();
            if (file_exists($tmp) || file_exists($ziel) || !@mkdir($tmp, 0700)) {
                return null;
            }
            if (!self::entpackeNach($archiv, $tmp)) {
                self::loescheBibliotheksOrdner($tmp);
                return null;
            }

            // Das Archiv darf die Dateien direkt oder in einem Ordner „vendor“ enthalten.
            $quelle = null;
            if (is_file($tmp . '/autoload.php')) {
                $quelle = $tmp;
            } elseif (is_file($tmp . '/vendor/autoload.php')) {
                $quelle = $tmp . '/vendor';
            }
            if ($quelle === null || !@rename($quelle, $ziel)) {
                self::loescheBibliotheksOrdner($tmp);
                return null;
            }
            if ($quelle !== $tmp) {
                self::loescheBibliotheksOrdner($tmp);
            }
            @unlink($merker);

            // Frühere Stände (anderer Hash) und ihre Reste brauchen nur Platz.
            foreach (@scandir($daten) ?: [] as $name) {
                if ($name !== basename($ziel) && str_starts_with($name, 'vendor-')) {
                    self::loescheBibliotheksOrdner($daten . '/' . $name);
                }
            }
            clearstatcache();
            return is_file($ziel . '/autoload.php') ? $ziel . '/autoload.php' : null;
        } finally {
            @flock($sperre, LOCK_UN);
            @fclose($sperre);
        }
    }

    /**
     * Sperre holen, ohne endlos zu hängen: Entpackt gerade ein anderer Aufruf, lohnt das
     * Warten (danach ist der Ordner da); nach ENTPACK_WARTEN Sekunden geht es ohne Bibliotheken weiter.
     *
     * Kann das Dateisystem gar nicht sperren, geht es ohne Sperre weiter – sonst bliebe der
     * Assistent dort für immer ohne Bibliotheken. Gleichzeitige Versuche hält dann der
     * Versuchsmerker (ENTPACK_PAUSE) auseinander.
     *
     * @param resource $sperre
     */
    private static function warteAufSperre($sperre): bool
    {
        $ende = microtime(true) + self::ENTPACK_WARTEN;
        do {
            $belegt = 0;
            if (@flock($sperre, LOCK_EX | LOCK_NB, $belegt)) {
                return true;
            }
            if ($belegt !== 1) {
                return true;
            }
            usleep(200000);
        } while (microtime(true) < $ende);
        return false;
    }

    /** Entpackt mit ZipArchive, ersatzweise mit PharData. false bei jedem Fehler. */
    private static function entpackeNach(string $archiv, string $ordner): bool
    {
        if (class_exists(\ZipArchive::class)) {
            $zip = new \ZipArchive();
            $modus = defined('ZipArchive::RDONLY') ? \ZipArchive::RDONLY : 0;
            // Ein erst halb hochgeladenes Archiv scheitert schon hier (das Verzeichnis steht am Dateiende).
            if ($zip->open($archiv, $modus) !== true) {
                return false;
            }
            try {
                for ($i = 0; $i < $zip->numFiles; $i++) {
                    $name = $zip->getNameIndex($i);
                    if (!is_string($name) || !self::harmloserArchivPfad($name)) {
                        return false;
                    }
                }
                return $zip->numFiles > 0 && @$zip->extractTo($ordner) === true;
            } finally {
                $zip->close();
            }
        }
        if (class_exists(\PharData::class)) {
            try {
                return (new \PharData($archiv))->extractTo($ordner, null, true);
            } catch (\Throwable) {
                return false;
            }
        }
        return false;
    }

    /** Kein Eintrag darf aus dem Zielordner herausführen (absoluter Pfad, „..“). */
    private static function harmloserArchivPfad(string $name): bool
    {
        if ($name === '' || str_contains($name, "\0") || $name[0] === '/' || $name[0] === '\\'
            || preg_match('/^[A-Za-z]:/', $name) === 1) {
            return false;
        }
        return !in_array('..', preg_split('#[/\\\\]#', $name) ?: [], true);
    }

    /**
     * Löscht einen entpackten Bibliotheksordner samt Inhalt. Nur Ordner mit dem erwarteten
     * Namen (vendor-<hash> oder vendor-<hash>.tmp) – ein Fehler im Aufrufer soll nie etwas
     * anderes im Datenordner treffen. Verknüpfungen werden entfernt, nicht verfolgt.
     */
    private static function loescheBibliotheksOrdner(string $pfad): void
    {
        if (preg_match('/^vendor-[A-Za-z0-9]+(\.tmp)?$/', basename($pfad)) !== 1 || is_link($pfad) || !is_dir($pfad)) {
            return;
        }
        $eintraege = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($pfad, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($eintraege as $eintrag) {
            ($eintrag->isDir() && !$eintrag->isLink()) ? @rmdir($eintrag->getPathname()) : @unlink($eintrag->getPathname());
        }
        @rmdir($pfad);
    }
}
