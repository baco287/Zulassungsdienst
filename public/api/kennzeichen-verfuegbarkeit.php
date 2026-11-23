<?php
/**
 * Verfügbarkeit eines Wunschkennzeichens – ausschließlich über angebundene, erlaubte Quellen.
 *
 * STAND: Es ist keine Quelle angebunden (config/kennzeichen-anbindungen.json → anbieter: []).
 * Eine bundesweite, offizielle Schnittstelle für die Verfügbarkeit gibt es nicht; jede
 * Zulassungsbehörde betreibt ihr eigenes Reservierungsportal. Diese Portale werden hier
 * NICHT ausgelesen: kein Scraping, kein Umgehen von CAPTCHAs oder Zugriffssperren.
 * Deshalb antwortet dieser Endpunkt für jeden Bezirk mit „pruefung_erforderlich“.
 *
 * ANBINDEN (docs/KENNZEICHEN-ASSISTENT.md, Abschnitt „Verfügbarkeitsprüfung anbinden“):
 *   1. Vertrag oder ausdrückliche Erlaubnis des Betreibers der Quelle.
 *   2. Adapter in api/kennzeichen-anbieter.php als Funktion
 *        kza_anbieter_<id>(array $anfrage): array
 *      $anfrage = ['bezirk' => slug, 'kuerzel' => 'H', 'buchstaben' => 'MM', 'ziffern' => '24', 'zusatz' => '']
 *      Rückgabe = ['status' => 'verfuegbar' | 'nicht_verfuegbar' | 'reserviert', 'quelle' => 'Name der Quelle']
 *      Wirft bei jedem Fehler – dann bleibt es bei „pruefung_erforderlich“.
 *   3. Anbieter mit id, aktiv: true und seinen Bezirken in config/kennzeichen-anbindungen.json eintragen.
 *
 * „verfuegbar“ verlässt diesen Endpunkt nur mit Quelle und Zeitpunkt der Prüfung. Auch dann
 * ist das Kennzeichen nicht reserviert – das sagt die Oberfläche ausdrücklich dazu.
 *
 * Antwort: { ok: true, status, quelle?, geprueftAm? }
 */

declare(strict_types=1);

require __DIR__ . '/kennzeichen-lib.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

const OFFEN = ['ok' => true, 'status' => 'pruefung_erforderlich'];

$methode = $_SERVER['REQUEST_METHOD'] ?? '';
$regeln = kza_regeln();

/** Aktive Anbieter aus dem Regelwerk, für die es auch einen Adapter gibt. */
function aktiveAnbieter(?array $regeln): array
{
    $datei = __DIR__ . '/kennzeichen-anbieter.php';
    if (is_file($datei)) {
        require_once $datei;
    }
    $aus = [];
    foreach (($regeln['anbieter'] ?? []) as $a) {
        $id = is_array($a) && is_string($a['id'] ?? null) ? $a['id'] : '';
        if ($id !== '' && preg_match('/^[a-z0-9_]{2,30}$/D', $id) === 1 && ($a['aktiv'] ?? false) === true
            && is_array($a['bezirke'] ?? null) && function_exists('kza_anbieter_' . $id)) {
            $aus[] = ['id' => $id, 'name' => (string) ($a['name'] ?? $id), 'bezirke' => $a['bezirke']];
        }
    }
    return $aus;
}

if ($methode === 'GET' && isset($_GET['check'])) {
    kza_antwort(['regeln' => $regeln !== null, 'anbieter' => count(aktiveAnbieter($regeln))]);
}
if ($methode !== 'POST') {
    kza_antwort(['ok' => false], 405);
}
if (!kza_eigene_herkunft() || kzp_is_bot((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''))) {
    kza_antwort(['ok' => false], 403);
}

$d = kza_koerper(600);
if ($d === null || $regeln === null) {
    kza_antwort(OFFEN);
}

$bezirk = is_string($d['bezirk'] ?? null) && preg_match('/^[a-z0-9-]{2,80}$/D', $d['bezirk']) === 1 ? $d['bezirk'] : '';
$kuerzel = is_string($d['kuerzel'] ?? null) ? $d['kuerzel'] : '';
$b = is_string($d['buchstaben'] ?? null) ? $d['buchstaben'] : '';
$z = is_string($d['ziffern'] ?? null) ? $d['ziffern'] : '';
$zusatz = in_array($d['zusatz'] ?? '', ['E', 'H'], true) ? (string) $d['zusatz'] : '';

// Nur formal zulässige Kombinationen gehen überhaupt an eine Quelle.
if ($bezirk === '' || !isset($regeln['kuerzel'][$kuerzel]) || !kza_pruefe($regeln, $kuerzel, $b, $z, $zusatz)) {
    kza_antwort(OFFEN);
}

$anbieter = null;
foreach (aktiveAnbieter($regeln) as $a) {
    if (in_array($bezirk, $a['bezirke'], true)) {
        $anbieter = $a;
        break;
    }
}
if ($anbieter === null) {
    kza_antwort(OFFEN);
}

try {
    if (!kza_drossel_ok((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 'pruefung', 20, 60)) {
        kza_antwort(OFFEN, 429);
    }
    $ergebnis = ('kza_anbieter_' . $anbieter['id'])(['bezirk' => $bezirk, 'kuerzel' => $kuerzel, 'buchstaben' => $b, 'ziffern' => $z, 'zusatz' => $zusatz]);
    $status = is_array($ergebnis) ? (string) ($ergebnis['status'] ?? '') : '';
    $quelle = is_array($ergebnis) ? trim((string) ($ergebnis['quelle'] ?? '')) : '';
    if (!in_array($status, ['verfuegbar', 'nicht_verfuegbar', 'reserviert'], true) || $quelle === '') {
        throw new RuntimeException('Adapter lieferte keinen belegten Zustand.');
    }
    kza_db()->prepare('INSERT INTO pruefungen (created_at, tag, bezirk, anbieter, status) VALUES (?, ?, ?, ?, ?)')
        ->execute([date('Y-m-d H:i:s'), date('Y-m-d'), $bezirk, $anbieter['id'], $status]);
    kza_antwort(['ok' => true, 'status' => $status, 'quelle' => mb_substr($quelle, 0, 80), 'geprueftAm' => date('c')]);
} catch (Throwable $e) {
    // Jeder Fehler der Quelle heißt: Wir wissen es nicht. Nie raten.
    kza_fehler('pruefung', $anbieter['id'], get_class($e) . ': ' . $e->getMessage());
    try {
        kza_db()->prepare('INSERT INTO pruefungen (created_at, tag, bezirk, anbieter, status) VALUES (?, ?, ?, ?, ?)')
            ->execute([date('Y-m-d H:i:s'), date('Y-m-d'), $bezirk, $anbieter['id'], 'fehler']);
    } catch (Throwable $e2) {
        // ohne Protokoll
    }
    kza_antwort(OFFEN);
}
