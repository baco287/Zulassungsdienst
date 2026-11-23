<?php
/**
 * Erfassung der eigenen Webanalyse (Empfänger der Ereignisse aus lib/eigeneAnalyse.ts).
 *
 * Nimmt anonyme Ereignisse aus lib/eigeneAnalyse.ts entgegen (sendBeacon oder fetch, JSON)
 * und speichert sie über api/analytics-lib.php. Antwortet immer mit 204 – Analyse darf die
 * Website nie stören, und ein Bot soll nicht erkennen, was verworfen wurde.
 *
 * Verworfen werden: fremde Origins, Bots, unbekannte Ereignisse, Server-Ereignisse
 * (die schreibt nur auftrag.php), zu große Anfragen und mehr als 120 Ereignisse je Minute
 * und Anschluss.
 *
 * GET ?check  →  { "sqlite": bool, "speicher": bool }  (Einrichtung prüfen, ohne Zahlen)
 */

declare(strict_types=1);

require __DIR__ . '/analytics-lib.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$methode = $_SERVER['REQUEST_METHOD'] ?? '';

if ($methode === 'GET' && isset($_GET['check'])) {
    header('Content-Type: application/json; charset=utf-8');
    $ok = true;
    try {
        kzp_db();
    } catch (Throwable $e) {
        $ok = false;
    }
    echo json_encode([
        'sqlite'   => in_array('sqlite', PDO::getAvailableDrivers(), true),
        'speicher' => $ok,
    ]);
    exit;
}

/** Antwort ohne Inhalt; danach nichts mehr ausgeben. */
function fertig(): void
{
    http_response_code(204);
    exit;
}

if ($methode !== 'POST') {
    fertig();
}

// Nur eigene Seiten: Origin (bei POST von allen aktuellen Browsern gesendet), sonst Referer.
$host = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
$herkunft = (string) ($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
$herkunftHost = strtolower((string) parse_url($herkunft, PHP_URL_HOST));
if ($host === '' || $herkunftHost !== $host) {
    fertig();
}

$ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
if (kzp_is_bot($ua)) {
    fertig();
}

$roh = (string) file_get_contents('php://input', false, null, 0, 4097);
if ($roh === '' || strlen($roh) > 4096) {
    fertig();
}
$d = json_decode($roh, true);
if (!is_array($d)) {
    fertig();
}

$event = is_string($d['event'] ?? null) ? $d['event'] : '';
if (!in_array($event, KZP_EVENTS, true) || in_array($event, KZP_SERVER_EVENTS, true)) {
    fertig();
}

try {
    if (!kzp_rate_ok((string) ($_SERVER['REMOTE_ADDR'] ?? ''))) {
        fertig();
    }
    $device = is_string($d['device'] ?? null) ? $d['device'] : '';
    kzp_log_event([
        'event'      => $event,
        'session_id' => is_string($d['session_id'] ?? null) ? $d['session_id'] : '',
        'path'       => $d['path'] ?? '',
        'service'    => is_string($d['service'] ?? null) ? $d['service'] : '',
        'step'       => is_numeric($d['step'] ?? null) ? (int) $d['step'] : 0,
        'device'     => $device !== '' ? $device : kzp_device_from_ua($ua),
        'referrer'   => is_string($d['referrer'] ?? null) ? $d['referrer'] : '',
        'meta'       => $d['meta'] ?? null,
    ]);
} catch (Throwable $e) {
    // Speicher nicht verfügbar: still verwerfen. Das Dashboard zeigt den Fehler an.
}
fertig();
