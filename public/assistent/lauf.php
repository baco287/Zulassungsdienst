<?php
/**
 * Verarbeitungslauf des KI-Assistenten für den Zeitauftrag (alle 5 Minuten, siehe
 * .github/workflows/assistent-abruf.yml). Derselbe Login wie der Admin-Bereich.
 *
 * Ruft Kern::lauf('cron'): Postfach abrufen und einsortieren, danach höchstens ein KI-Schritt.
 * Die Antwort enthält nur Zähler und ein Hinweiswort – nie Absender, Betreff oder Text; das
 * Protokoll des Aufrufers ist öffentlich. „pausiert“, „läuft bereits“ und fehlende Bibliotheken
 * sind kein Fehler: Der Aufruf endet dann mit HTTP 200 und dem Hinweis. Eine Dauerstörung (die
 * Dateien passen seit über 30 Minuten nicht zum Manifest – ein Veröffentlichen ist abgebrochen)
 * meldet HTTP 503: Dann wird der Abruf bei GitHub rot und benachrichtigt, statt still zu stehen. Ein Token braucht es
 * hier nicht – ein Lauf ändert nichts, was der Zeitauftrag nicht ohnehin alle 5 Minuten tut,
 * und der Kern hält selbst den Mindestabstand ein. Von fremden Seiten ausgelöste Aufrufe
 * (Sec-Fetch-Site) weist Admin::pruefeLeseHerkunft() ab.
 */

declare(strict_types=1);

use KZP\Assistent\Admin;
use KZP\Assistent\Kern;
use KZP\Assistent\Umgebung;

require __DIR__ . '/intern/start.php';

// Von einer fremden Seite aus (mit dem im Browser gemerkten Login) wird kein Lauf angestoßen.
Admin::pruefeLeseHerkunft();
Admin::verlangeLogin();

// Der Lauf soll zu Ende gehen, auch wenn der Aufrufer nicht auf die Antwort wartet (Bauplan 7.2).
ignore_user_abort(true);
@set_time_limit(60);

if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'POST'], true)) {
    header('Allow: GET, POST');
    Admin::json(Admin::laufOhneErgebnis('nur GET oder POST'), 405);
}
if (!Umgebung::$bibliotheken) {
    Admin::json(Admin::laufOhneErgebnis('Bibliotheken fehlen'));
}

try {
    // Startzeit der Anfrage: Das Laden der Bibliotheken zählt zum Zeitbudget des Laufs.
    $lauf = Kern::lauf('cron', 20, (float) ($_SERVER['REQUEST_TIME_FLOAT'] ?? 0));
    Admin::json(Admin::laufZahlen($lauf), !empty($lauf['stoerung']) ? 503 : 200);
} catch (\Throwable $e) {
    Admin::protokolliere($e);
    Admin::json(Admin::laufOhneErgebnis('Fehler'), 500);
}
