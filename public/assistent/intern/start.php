<?php
/**
 * KI-Assistent – Einstieg für alle Endpunkte.
 *
 * Jeder Endpunkt (index.php, daten.php, aktion.php, lauf.php) und der Testlauf binden diese
 * Datei als Erstes ein:
 *
 *   require __DIR__ . '/intern/start.php';
 *
 * Sie setzt Zeitzone und Fehlerbehandlung, sucht die Bibliotheken (Claude-SDK, ImapEngine)
 * und lädt danach alle Klassen in fester Reihenfolge. Fehlen die Bibliotheken, bleibt
 * Umgebung::$bibliotheken false: Die Endpunkte melden dann „Bibliotheken fehlen“, statt
 * abzustürzen; Speicher, Budget und der Admin-Bereich arbeiten trotzdem.
 *
 * Der Ordner intern/ ist per .htaccess gesperrt; direkt aufgerufen gibt diese Datei nichts aus.
 */

declare(strict_types=1);

namespace KZP\Assistent;

// Zweimal eingebunden (Endpunkt und Hilfsdatei) soll nichts doppelt geschehen.
if (\defined(__NAMESPACE__ . '\GESTARTET')) {
    return;
}
\define(__NAMESPACE__ . '\GESTARTET', true);

date_default_timezone_set('Europe/Berlin');
if (function_exists('mb_internal_encoding')) {
    mb_internal_encoding('UTF-8');
}

// Fehler nie an den Browser, immer ins Fehlerprotokoll des Servers.
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('html_errors', '0');
ini_set('log_errors', '1');
// Aufrufketten ohne Argumente: Dort stünden sonst Mailtexte und Zugangsdaten.
ini_set('zend.exception_ignore_args', '1');

/**
 * Letzte Auffangstelle für Ausnahmen, die kein Baustein behandelt hat. Protokolliert werden
 * nur Art und Fundstelle: Die Meldungen fremder Bibliotheken können Mailinhalt, Adressen
 * oder Serverantworten enthalten, und die gehören nicht in ein Protokoll.
 */
set_exception_handler(static function (\Throwable $fehler): void {
    error_log('KI-Assistent: unbehandelter Fehler ' . $fehler::class . ' in ' . basename($fehler->getFile()) . ':' . $fehler->getLine());
    if (PHP_SAPI === 'cli') {
        // Im Testlauf und bei lokaler Arbeit (KZP_ASSISTENT_DIR gesetzt) hilft die Meldung bei der
        // Suche; dort gibt es nur erfundene Daten. Sonst bleibt es auch hier bei Art und Fundstelle.
        if ((string) getenv('KZP_ASSISTENT_DIR') !== '') {
            fwrite(STDERR, $fehler::class . ': ' . substr($fehler->getMessage(), 0, 500) . "\n" . $fehler->getTraceAsString() . "\n");
        }
        // Fehlercode ist nötig: Ein Testlauf, der so endet, darf nicht als bestanden gelten.
        exit(255);
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: text/plain; charset=utf-8');
        header('Cache-Control: no-store');
    }
    echo 'Interner Fehler.';
    exit(1);
});

require_once __DIR__ . '/Umgebung.php';

Umgebung::$bibliotheken = Umgebung::ladeBibliotheken();

(static function (): void {
    // Reihenfolge nach Abhängigkeit: Grundlagen zuerst, die Schnittstelle Postfach vor ihren
    // Umsetzungen, Kern und Admin zuletzt. true = braucht die Bibliotheken und wird ohne sie
    // nicht geladen (die Datei würde sonst an fehlenden Klassen scheitern).
    $klassen = [
        'Zugang'        => false,
        'Speicher'      => false,
        'Budget'        => false,
        'Text'          => false,
        'Regeln'        => false,
        'Postfach'      => false,
        'MailLeser'     => true,
        'ImapPostfach'  => true,
        'DateiPostfach' => true,
        'Versand'       => true,
        'Wissen'        => false,
        'Prompt'        => false,
        'Claude'        => true,
        'Pruefer'       => false,
        'Kern'          => false,
        'Admin'         => false,
    ];
    foreach ($klassen as $name => $brauchtBibliotheken) {
        if ($brauchtBibliotheken && !Umgebung::$bibliotheken) {
            continue;
        }
        $datei = __DIR__ . '/' . $name . '.php';
        // Während eines Deploys kann eine Datei kurz fehlen: überspringen statt abbrechen.
        // Der Verarbeitungslauf prüft ohnehin das Manifest, bevor er etwas tut.
        if (is_file($datei)) {
            require_once $datei;
        }
    }
})();
