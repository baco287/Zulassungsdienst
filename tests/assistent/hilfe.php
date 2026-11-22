<?php
/**
 * Kleine Prüfhilfe für die Tests des KI-Assistenten – ohne fremde Bibliothek.
 *
 * Jede Testdatei bindet diese Datei ein, ruft pruefe()/gleich()/enthaelt() auf und endet
 * NICHT selbst: Den Abschluss mit Exit-Code macht der Aufrufer (tests/assistent/regeln-test.php).
 * Die Tests arbeiten in einem frischen Datenordner (KZP_ASSISTENT_DIR), nie mit echten Daten,
 * und ohne Netz.
 */

declare(strict_types=1);

final class Testlauf
{
    public static int $ok = 0;
    /** @var string[] */
    public static array $fehler = [];
    public static string $abschnitt = '';
}

function abschnitt(string $name): void
{
    Testlauf::$abschnitt = $name;
    echo "\n— {$name}\n";
}

function pruefe(bool $bedingung, string $name): void
{
    if ($bedingung) {
        Testlauf::$ok++;
        echo "  ✓ {$name}\n";
        return;
    }
    Testlauf::$fehler[] = Testlauf::$abschnitt . ': ' . $name;
    echo "  ✗ {$name}\n";
}

function gleich(mixed $erwartet, mixed $ist, string $name): void
{
    if ($erwartet === $ist) {
        pruefe(true, $name);
        return;
    }
    pruefe(false, $name . ' – erwartet ' . json_encode($erwartet, JSON_UNESCAPED_UNICODE) . ', ist ' . json_encode($ist, JSON_UNESCAPED_UNICODE));
}

function enthaelt(string $nadel, string $heuhaufen, string $name): void
{
    pruefe(str_contains($heuhaufen, $nadel), $name . (str_contains($heuhaufen, $nadel) ? '' : ' – „' . $nadel . '“ fehlt'));
}

function enthaelt_nicht(string $nadel, string $heuhaufen, string $name): void
{
    pruefe(!str_contains($heuhaufen, $nadel), $name . (!str_contains($heuhaufen, $nadel) ? '' : ' – „' . $nadel . '“ kommt vor'));
}

/** Frischer, leerer Datenordner für einen Test; wird am Ende des Prozesses gelöscht. */
function frischer_datenordner(): string
{
    $ordner = sys_get_temp_dir() . '/kzp-assistent-test-' . bin2hex(random_bytes(6));
    mkdir($ordner, 0700, true);
    putenv('KZP_ASSISTENT_DIR=' . $ordner);
    register_shutdown_function(static function () use ($ordner): void {
        if (!is_dir($ordner)) {
            return;
        }
        $it = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($ordner, FilesystemIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($it as $datei) {
            $datei->isDir() ? @rmdir($datei->getPathname()) : @unlink($datei->getPathname());
        }
        @rmdir($ordner);
    });
    return $ordner;
}

function testabschluss(): never
{
    $fehler = count(Testlauf::$fehler);
    echo "\n" . str_repeat('─', 60) . "\n";
    echo Testlauf::$ok . ' bestanden, ' . $fehler . " fehlgeschlagen\n";
    foreach (Testlauf::$fehler as $f) {
        echo "  ✗ {$f}\n";
    }
    exit($fehler === 0 ? 0 : 1);
}
