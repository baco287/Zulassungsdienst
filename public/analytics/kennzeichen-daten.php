<?php
/**
 * Daten und Schalter des Kennzeichenassistenten für das Dashboard (analytics/kennzeichen.php).
 * Nur mit Login (api/analytics-lib.php → kzp_require_auth).
 *
 *   GET  kennzeichen-daten.php?days=30    Nutzung, KI-Verbrauch, Zustand, Fehler
 *   POST kennzeichen-daten.php            { "einstellungen": { "ki_aktiv": "0", … } }  Schalter und Limits ändern
 *
 * Alle Zahlen sind Summen. Namen, Gesprächstexte und die Kombinationen einzelner Besucher gibt
 * es hier nicht, weil sie nirgends gespeichert werden. Gespeichert ist nur der allgemeine
 * Ideenvorrat für „überrasche mich“ (ohne Bezug zu einer Person); er lässt sich hier leeren.
 */

declare(strict_types=1);

require __DIR__ . '/../api/kennzeichen-lib.php';

kzp_require_auth();
header('Content-Type: application/json; charset=utf-8');

/** Zulässige Wertebereiche der Einstellungen (Dashboard). */
const GRENZEN = [
    'limit_tag'       => [0, 20000],
    'limit_monat_usd' => [0, 200],
    'limit_ip_stunde' => [1, 200],
    'limit_ip_tag'    => [1, 1000],
    'alarm_10min'     => [5, 5000],
    'pause_minuten'   => [5, 1440],
];

try {
    $pdo = kza_db();
} catch (Throwable $e) {
    kza_antwort(['ok' => false, 'error' => 'Speicher nicht verfügbar.'], 500);
}

// ── Einstellungen ändern ───────────────────────────────────────────────────────
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    // Eigener Kopf + gleiche Herkunft: Eine fremde Seite kann diese Anfrage nicht auslösen.
    if (!kza_eigene_herkunft() || ($_SERVER['HTTP_X_KZA'] ?? '') !== '1') {
        kza_antwort(['ok' => false, 'error' => 'Anfrage abgelehnt.'], 403);
    }
    $d = kza_koerper(2000);
    $werte = is_array($d['einstellungen'] ?? null) ? $d['einstellungen'] : (($d['vorrat_leeren'] ?? false) === true ? [] : null);
    if ($werte === null) {
        kza_antwort(['ok' => false, 'error' => 'Keine Einstellungen übergeben.'], 400);
    }
    foreach ($werte as $name => $wert) {
        $wert = is_scalar($wert) ? trim((string) $wert) : '';
        if ($name === 'ki_aktiv') {
            kza_setze('ki_aktiv', $wert === '1' ? '1' : '0');
            // Wer von Hand einschaltet, hebt auch eine automatische Pause auf.
            if ($wert === '1') {
                kza_setze('pause_bis', '0');
            }
        } elseif ($name === 'modell' && in_array($wert, KZA_MODELLE, true)) {
            kza_setze('modell', $wert);
        } elseif (isset(GRENZEN[$name]) && is_numeric(str_replace(',', '.', $wert))) {
            [$min, $max] = GRENZEN[$name];
            $zahl = max($min, min($max, (float) str_replace(',', '.', $wert)));
            kza_setze($name, $name === 'limit_monat_usd' ? rtrim(rtrim(number_format($zahl, 2, '.', ''), '0'), '.') : (string) (int) $zahl);
        }
    }
    // Ideenvorrat für „überrasche mich“ leeren – etwa wenn eine KI-Idee darin nicht gefällt.
    if (($d['vorrat_leeren'] ?? false) === true) {
        $pdo->exec('DELETE FROM ki_cache');
    }
    kza_antwort(['ok' => true, 'einstellungen' => kza_einstellungen()]);
}

// ── Auswertung ─────────────────────────────────────────────────────────────────
kza_aufraeumen();
$days = max(1, min(365, (int) ($_GET['days'] ?? 30)));
$von = date('Y-m-d H:i:s', time() - $days * 86400);
$vonTag = date('Y-m-d', time() - ($days - 1) * 86400);
// Sechs Nachkommastellen: Eine einzelne Anfrage kostet Bruchteile eines Cents.
$usd = fn (int $mikro): float => round($mikro / 1000000, 6);

/** Sortiert absteigend und gibt die ersten $n als Liste von [name, n] zurück. */
function rang(array $a, int $n): array
{
    arsort($a);
    $aus = [];
    foreach (array_slice($a, 0, $n, true) as $k => $v) {
        $aus[] = ['name' => (string) $k, 'n' => $v];
    }
    return $aus;
}

// Nutzung aus der Webanalyse (Ereignisse kza_…)
$nutzung = ['sitzungen' => 0, 'runden' => 0, 'vorschlaege' => 0, 'pruefungen' => 0, 'behoerde' => 0, 'gemerkt' => 0,
    'geteilt' => 0, 'auswahlen' => 0, 'uebergaben' => 0, 'mitService' => 0, 'bestellungen' => 0];
$bezirke = [];
$modi = [];
$quellen = ['generator' => 0, 'ki' => 0, 'cache' => 0];
$leistungen = [];
$analyseFehler = null;
try {
    $a = kzp_db();
    $q = $a->prepare("SELECT event, session_id, service, meta FROM events WHERE event LIKE 'kza\\_%' ESCAPE '\\' AND created_at >= ? LIMIT 200000");
    $q->execute([$von]);
    $sitzungen = [];
    foreach ($q as $z) {
        $m = json_decode((string) $z['meta'], true);
        $m = is_array($m) ? $m : [];
        switch ($z['event']) {
            case 'kza_start':
                $sitzungen[$z['session_id'] !== '' ? $z['session_id'] : uniqid('', true)] = true;
                if (isset($m['bezirk'])) {
                    $bezirke[(string) $m['bezirk']] = ($bezirke[(string) $m['bezirk']] ?? 0) + 1;
                }
                break;
            case 'kza_vorschlaege':
                $nutzung['runden']++;
                $nutzung['vorschlaege'] += (int) ($m['n'] ?? 0);
                if (isset($m['modus'])) {
                    $modi[(string) $m['modus']] = ($modi[(string) $m['modus']] ?? 0) + 1;
                }
                if (isset($quellen[$m['quelle'] ?? ''])) {
                    $quellen[$m['quelle']]++;
                }
                break;
            case 'kza_pruefung':
                if (($m['method'] ?? '') === 'behoerde') {
                    $nutzung['behoerde']++;
                } else {
                    $nutzung['pruefungen']++;
                }
                break;
            case 'kza_merken':
                $nutzung['gemerkt']++;
                break;
            case 'kza_teilen':
                $nutzung['geteilt']++;
                break;
            case 'kza_auswahl':
                $nutzung['auswahlen']++;
                break;
            case 'kza_uebergabe':
                $nutzung['uebergaben']++;
                if (($m['method'] ?? '') === 'service') {
                    $nutzung['mitService']++;
                }
                if ($z['service'] !== '') {
                    $leistungen[$z['service']] = ($leistungen[$z['service']] ?? 0) + 1;
                }
                break;
        }
    }
    $nutzung['sitzungen'] = count($sitzungen);
    // Zuordenbare Bestellungen: dieselbe anonyme Sitzung hat erst den Assistenten verlassen
    // (kza_uebergabe) und danach einen Auftrag zugestellt bekommen (Bestätigung des Mailservers).
    $q = $a->prepare("SELECT COUNT(DISTINCT u.session_id) FROM events u
                      JOIN events o ON o.session_id = u.session_id AND o.event = 'order_confirmed_server' AND o.id > u.id
                      WHERE u.event = 'kza_uebergabe' AND u.session_id != '' AND u.created_at >= ?");
    $q->execute([$von]);
    $nutzung['bestellungen'] = (int) $q->fetchColumn();
} catch (Throwable $e) {
    $analyseFehler = 'Die Webanalyse ist nicht lesbar – Nutzungszahlen fehlen.';
}

// KI-Verbrauch aus dem eigenen Protokoll
$summe = function (string $wo, array $p) use ($pdo, $usd): array {
    $q = $pdo->prepare("SELECT
            SUM(quelle = 'ki') AS anfragen, SUM(quelle = 'cache') AS cache,
            SUM(quelle = 'ki' AND status = 'fehler') AS fehler, SUM(status = 'abgelehnt') AS abgelehnt,
            COALESCE(SUM(input_tokens), 0) AS ein, COALESCE(SUM(output_tokens), 0) AS aus,
            COALESCE(SUM(cache_read), 0) AS cache_lesen, COALESCE(SUM(cache_write), 0) AS cache_schreiben,
            COALESCE(SUM(kosten_mikro), 0) AS kosten, COALESCE(AVG(CASE WHEN quelle = 'ki' AND status != 'fehler' THEN dauer_ms END), 0) AS dauer
        FROM ki_anfragen WHERE $wo");
    $q->execute($p);
    $z = $q->fetch() ?: [];
    $anfragen = (int) ($z['anfragen'] ?? 0);
    $kosten = (int) ($z['kosten'] ?? 0);
    return [
        'anfragen' => $anfragen, 'ausVorrat' => (int) ($z['cache'] ?? 0), 'fehler' => (int) ($z['fehler'] ?? 0),
        'abgelehnt' => (int) ($z['abgelehnt'] ?? 0), 'inputTokens' => (int) ($z['ein'] ?? 0), 'outputTokens' => (int) ($z['aus'] ?? 0),
        // Der feste Auftrag wird gecacht: gelesen kostet er ein Zehntel, geschrieben das 1,25-Fache.
        'cacheReadTokens' => (int) ($z['cache_lesen'] ?? 0), 'cacheWriteTokens' => (int) ($z['cache_schreiben'] ?? 0),
        'kostenUsd' => $usd($kosten), 'kostenJeAnfrageUsd' => $anfragen > 0 ? round($kosten / $anfragen / 1000000, 6) : 0.0,
        'dauerMs' => (int) round((float) ($z['dauer'] ?? 0)),
    ];
};
$ki = $summe('created_at >= ?', [$von]);
$ki['heute'] = $summe('tag = ?', [date('Y-m-d')]);
$ki['monat'] = $summe('tag >= ?', [date('Y-m-01')]);

$q = $pdo->prepare("SELECT tag, SUM(quelle = 'ki') AS anfragen, SUM(quelle = 'cache') AS cache,
        COALESCE(SUM(input_tokens + output_tokens + cache_read + cache_write), 0) AS tokens, COALESCE(SUM(kosten_mikro), 0) AS kosten
    FROM ki_anfragen WHERE tag >= ? GROUP BY tag ORDER BY tag DESC LIMIT 366");
$q->execute([$vonTag]);
$ki['tage'] = array_map(fn ($z) => ['tag' => $z['tag'], 'anfragen' => (int) $z['anfragen'], 'ausVorrat' => (int) $z['cache'],
    'tokens' => (int) $z['tokens'], 'kostenUsd' => $usd((int) $z['kosten'])], $q->fetchAll());

$q = $pdo->query("SELECT substr(tag, 1, 7) AS monat, SUM(quelle = 'ki') AS anfragen, COALESCE(SUM(input_tokens + output_tokens + cache_read + cache_write), 0) AS tokens,
        COALESCE(SUM(kosten_mikro), 0) AS kosten FROM ki_anfragen GROUP BY monat ORDER BY monat DESC LIMIT 14");
$ki['monate'] = array_map(fn ($z) => ['monat' => $z['monat'], 'anfragen' => (int) $z['anfragen'], 'tokens' => (int) $z['tokens'],
    'kostenUsd' => $usd((int) $z['kosten'])], $q->fetchAll());

// Verfügbarkeitsprüfungen über angebundene Quellen (Stand: keine)
$q = $pdo->prepare('SELECT anbieter, status, COUNT(*) AS n FROM pruefungen WHERE created_at >= ? GROUP BY anbieter, status');
$q->execute([$von]);
$echtzeit = $q->fetchAll();

// Zustand
$einst = kza_einstellungen();
$regeln = kza_regeln();
$grund = kza_budget($einst);
$anbieter = [];
foreach (($regeln['anbieter'] ?? []) as $x) {
    if (is_array($x)) {
        $id = (string) ($x['id'] ?? '');
        $anbieter[] = [
            'id' => $id, 'name' => (string) ($x['name'] ?? $id), 'aktiv' => ($x['aktiv'] ?? false) === true,
            'bezirke' => is_array($x['bezirke'] ?? null) ? count($x['bezirke']) : 0,
        ];
    }
}

$vorrat = (int) $pdo->query('SELECT COUNT(*) FROM ki_cache')->fetchColumn();

$q = $pdo->prepare('SELECT created_at, stelle, code, meldung FROM fehler WHERE created_at >= ? ORDER BY id DESC LIMIT 40');
$q->execute([$von]);

kza_antwort([
    'ok'         => true,
    'tage'       => $days,
    'stand'      => date('c'),
    'nutzung'    => $nutzung,
    'bezirke'    => rang($bezirke, 15),
    'modi'       => rang($modi, 15),
    'quellen'    => $quellen,
    'leistungen' => rang($leistungen, 6),
    'ki'         => $ki,
    'echtzeit'   => $echtzeit,
    'einstellungen' => $einst,
    'modelle'    => KZA_MODELLE,
    'status'     => [
        'kiEingerichtet' => kza_ki_schluessel() !== null,
        'kiZustand'      => $grund ?? 'aktiv',
        'pauseBis'       => (int) $einst['pause_bis'] > time() ? date('c', (int) $einst['pause_bis']) : null,
        'regeln'         => $regeln !== null,
        'regelnStand'    => $regeln['stand'] ?? null,
        'kuerzel'        => $regeln !== null ? count($regeln['kuerzel']) : 0,
        'anbieter'       => $anbieter,
        'analyse'        => $analyseFehler,
        'vorrat'         => $vorrat,
    ],
    'fehler'     => $q->fetchAll(),
]);
