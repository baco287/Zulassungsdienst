<?php
/**
 * Daten-API des Analytics-Dashboards (analytics/dashboard.html).
 * Nur lesend, nur mit Login (api/analytics-lib.php → kzp_require_auth).
 *
 *   GET daten.php?days=30&compare=1           Kennzahlen des Zeitraums (+ Vorperiode)
 *   GET daten.php?sessions=1&days&filter&limit&offset   Kundenwege (einzelne Sessions)
 *   GET daten.php?session=<id>                 Ablauf einer Session
 */

declare(strict_types=1);

require __DIR__ . '/../api/analytics-lib.php';

kzp_require_auth();
header('Content-Type: application/json; charset=utf-8');

function antwort(array $daten, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
    exit;
}

/** Zeitpunkt vor N Tagen im Speicherformat der Tabelle. */
function vor(int $tage): string
{
    return date('Y-m-d H:i:s', time() - $tage * 86400);
}

function alle(PDO $pdo, string $sql, array $p = []): array
{
    $st = $pdo->prepare($sql);
    $st->execute($p);
    return $st->fetchAll();
}

function meta(?string $m): array
{
    if ($m === null || $m === '') {
        return [];
    }
    $d = json_decode($m, true);
    return is_array($d) ? $d : [];
}

function topN(array $a, int $n): array
{
    arsort($a);
    return array_slice($a, 0, $n, true);
}

function zaehle(array &$a, string $k): void
{
    $a[$k] = ($a[$k] ?? 0) + 1;
}

/** Datumsangabe für JavaScript (ISO ohne Zeitzone = Ortszeit des Browsers, hier Deutschland). */
function iso(?string $t): ?string
{
    return $t === null ? null : str_replace(' ', 'T', $t);
}

try {
    $pdo = kzp_db();
} catch (Throwable $e) {
    antwort(['ok' => false, 'error' => 'Speicher nicht verfügbar: ' . $e->getMessage()], 500);
}

$S = KZP_STAGE_SQL;

try {
    // ── Ablauf einer Session ──────────────────────────────────────────────────
    if (isset($_GET['session'])) {
        $id = (string) $_GET['session'];
        if (preg_match('/^[a-z0-9]{6,64}$/i', $id) !== 1) {
            antwort(['ok' => false, 'error' => 'Ungültige Session-ID'], 400);
        }
        $rows = alle($pdo, 'SELECT id, event, path, service, step, device, referrer, meta, created_at
                            FROM events WHERE session_id = ? ORDER BY id LIMIT 500', [$id]);
        foreach ($rows as &$r) {
            $r['created_at'] = iso($r['created_at']);
        }
        unset($r);
        antwort(['ok' => true, 'session_id' => $id, 'events' => $rows]);
    }

    $days = max(1, min(365, (int) ($_GET['days'] ?? 30)));
    $from = vor($days);

    // ── Kundenwege ───────────────────────────────────────────────────────────
    if (isset($_GET['sessions'])) {
        $filter = [
            'alle'              => '',
            'interesse'         => 'HAVING stage >= 3',
            'auftragsseite'     => 'HAVING stage >= 4',
            'abbruch_assistent' => 'HAVING stage BETWEEN 5 AND 6',
            'abbruch_absenden'  => 'HAVING stage = 7 AND confirmed = 0',
            'zugestellt'        => 'HAVING confirmed > 0',
            'fehler'            => 'HAVING errors > 0',
            'kontakt'           => 'HAVING contacts > 0',
        ];
        $f = (string) ($_GET['filter'] ?? 'alle');
        $f = array_key_exists($f, $filter) ? $f : 'alle';
        $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        $st = $pdo->prepare("SELECT session_id,
                   MIN(created_at) AS started_at, MAX(created_at) AS ended_at, COUNT(*) AS events,
                   SUM(event = 'page_view') AS pages,
                   SUM(event IN ('order_error','order_step_error','order_failed_server','js_error')) AS errors,
                   SUM(event = 'contact_click') AS contacts,
                   SUM(event = 'order_confirmed_server') AS confirmed,
                   MAX(CASE WHEN event = 'session_start' THEN meta END) AS herkunft,
                   MAX(device) AS device,
                   MAX(NULLIF(referrer, '')) AS referrer,
                   MAX(NULLIF(service, '')) AS service,
                   $S AS stage
            FROM events
            WHERE session_id != '' AND created_at >= :from
            GROUP BY session_id
            {$filter[$f]}
            ORDER BY started_at DESC
            LIMIT :limit OFFSET :offset");
        $st->bindValue(':from', $from);
        $st->bindValue(':limit', $limit, PDO::PARAM_INT);
        $st->bindValue(':offset', $offset, PDO::PARAM_INT);
        $st->execute();
        $rows = $st->fetchAll();

        // Klickpfad je Session (Seitenfolge) – in PHP zusammengesetzt, unabhängig von der SQLite-Version.
        $pfade = [];
        if ($rows) {
            $ids = array_column($rows, 'session_id');
            $platz = implode(',', array_fill(0, count($ids), '?'));
            foreach (alle($pdo, "SELECT session_id, path FROM events
                                 WHERE event = 'page_view' AND session_id IN ($platz) ORDER BY id", $ids) as $pv) {
                $pfade[$pv['session_id']][] = $pv['path'];
            }
        }
        foreach ($rows as &$r) {
            $r['pfad'] = mb_substr(implode(' > ', $pfade[$r['session_id']] ?? []), 0, 400);
            $r['started_at'] = iso($r['started_at']);
            $r['ended_at'] = iso($r['ended_at']);
        }
        unset($r);
        antwort(['ok' => true, 'days' => $days, 'filter' => $f, 'limit' => $limit, 'offset' => $offset, 'sessions' => $rows]);
    }

    $p = [':from' => $from];
    $W = 'created_at >= :from';

    // Ereignisse je Typ und je Tag
    $funnel = alle($pdo, "SELECT event, COUNT(*) AS cnt FROM events WHERE $W GROUP BY event", $p);
    $daily = alle($pdo, "SELECT substr(created_at, 1, 10) AS day, event, COUNT(*) AS cnt
                         FROM events WHERE $W GROUP BY day, event ORDER BY day DESC", $p);

    // Ereigniszahl je Funnel-Stufe (für „Datenqualität“: Events vs. Sessions)
    $stufenEvents = alle($pdo, "SELECT
            SUM(event = 'page_view') AS s1,
            SUM(event = 'price_box_view') AS s2,
            SUM(event IN ('cta_click','tool_used','service_selected')) AS s3,
            SUM(event = 'page_view' AND path LIKE '/auftrag/%') AS s4,
            SUM(event = 'order_start') AS s5,
            SUM(event = 'order_step' AND step >= " . KZP_LETZTER_SCHRITT . ") AS s6,
            SUM(event = 'order_submit_attempt') AS s7,
            SUM(event = 'order_confirmed_server') AS s8
        FROM events WHERE $W", $p)[0];

    $devices = alle($pdo, "SELECT device, COUNT(DISTINCT session_id) AS sessions FROM events
                           WHERE device != '' AND session_id != '' AND $W GROUP BY device", $p);

    // Höchste erreichte Stufe je Session
    $dropoff = alle($pdo, "SELECT stage, COUNT(*) AS cnt FROM (
            SELECT session_id, $S AS stage FROM events
            WHERE session_id != '' AND $W GROUP BY session_id
        ) GROUP BY stage ORDER BY stage", $p);
    $sessions = (int) alle($pdo, "SELECT COUNT(DISTINCT session_id) AS n FROM events
                                  WHERE session_id != '' AND $W", $p)[0]['n'];

    // Seiten
    $topPages = alle($pdo, "SELECT path, COUNT(*) AS views, COUNT(DISTINCT session_id) AS sessions
                            FROM events WHERE event = 'page_view' AND path != '' AND $W
                            GROUP BY path ORDER BY views DESC LIMIT 25", $p);
    $entryPages = alle($pdo, "SELECT e.path, COUNT(*) AS cnt FROM events e
            JOIN (SELECT MIN(id) AS fid FROM events WHERE event = 'page_view' AND session_id != '' AND $W
                  GROUP BY session_id) f ON e.id = f.fid
            GROUP BY e.path ORDER BY cnt DESC LIMIT 15", $p);
    $exitPages = alle($pdo, "SELECT e.path, COUNT(*) AS cnt FROM events e
            JOIN (SELECT MAX(id) AS lid FROM events WHERE event = 'page_view' AND session_id != '' AND $W
                  GROUP BY session_id) l ON e.id = l.lid
            GROUP BY e.path ORDER BY cnt DESC LIMIT 15", $p);

    // Verweildauer, Scrolltiefe, Ladezeit je Seite (page_leave)
    $agg = [];
    foreach (alle($pdo, "SELECT path, meta FROM events WHERE event = 'page_leave' AND path != '' AND $W
                         ORDER BY id DESC LIMIT 100000", $p) as $r) {
        $m = meta($r['meta']);
        $a = &$agg[$r['path']];
        $a ??= ['n' => 0, 'dur' => 0, 'scroll' => 0, 'load' => 0, 'nload' => 0];
        $a['n']++;
        $a['dur'] += min((float) ($m['dur'] ?? 0), 3600);
        $a['scroll'] += (float) ($m['scroll'] ?? 0);
        $l = (float) ($m['load'] ?? 0);
        if ($l > 0 && $l < 120000) {
            $a['load'] += $l;
            $a['nload']++;
        }
        unset($a);
    }
    $pageDwell = [];
    foreach ($agg as $pfad => $a) {
        $pageDwell[$pfad] = [
            'n'         => $a['n'],
            'avgDur'    => (int) round($a['dur'] / $a['n']),
            'avgScroll' => (int) round($a['scroll'] / $a['n']),
            'avgLoad'   => $a['nload'] ? (int) round($a['load'] / $a['nload']) : null,
        ];
    }

    // Kontakt-Klicks (WhatsApp, Telefon, E-Mail)
    $byType = $byPage = [];
    $kontaktSessions = [];
    $kontaktRows = alle($pdo, "SELECT session_id, path, meta FROM events WHERE event = 'contact_click' AND $W", $p);
    foreach ($kontaktRows as $r) {
        $m = meta($r['meta']);
        zaehle($byType, (string) ($m['type'] ?? 'unbekannt'));
        if ($r['path'] !== '') {
            zaehle($byPage, $r['path']);
        }
        if ($r['session_id'] !== '') {
            $kontaktSessions[$r['session_id']] = true;
        }
    }
    $contacts = ['total' => count($kontaktRows), 'sessions' => count($kontaktSessions),
                 'byType' => $byType, 'byPage' => topN($byPage, 10)];

    // Zugestellte Anfragen (Server-Bestätigung) und fehlgeschlagene Zustellungen
    $byKind = [];
    $zugestellt = alle($pdo, "SELECT event, meta FROM events
                              WHERE event IN ('order_confirmed_server','documents_confirmed_server') AND $W", $p);
    foreach ($zugestellt as $r) {
        $m = meta($r['meta']);
        if ($r['event'] === 'documents_confirmed_server') {
            zaehle($byKind, 'Unterlagen nachgereicht');
        } else {
            zaehle($byKind, 'Auftrag' . (($m['audience'] ?? '') === 'gewerbe' ? ' · Gewerbe' : ' · Privat')
                . ((int) ($m['files'] ?? 0) > 0 ? ' · mit Unterlagen' : ''));
        }
    }
    $failByKind = [];
    $fehlgeschlagen = alle($pdo, "SELECT meta FROM events WHERE event = 'order_failed_server' AND $W", $p);
    foreach ($fehlgeschlagen as $r) {
        $m = meta($r['meta']);
        zaehle($failByKind, ($m['kind'] ?? 'auftrag') === 'unterlagen' ? 'Unterlagen' : 'Auftrag');
    }
    $requests = ['total' => count($zugestellt), 'byKind' => topN($byKind, 12),
                 'failed' => count($fehlgeschlagen), 'failedByKind' => $failByKind];

    // Auftrags-Assistent: Schritte, Abbrüche, Fehler, Geräte
    // Weitester erreichter Schritt je Session; „Schritt n erreicht“ = alle Sessions mit Maximum ≥ n.
    // (Wer per Direktlink kommt, beginnt in Schritt 2, ohne dafür ein eigenes Ereignis zu senden.)
    $maxStep = [];
    foreach (alle($pdo, "SELECT s, COUNT(*) AS n FROM (
                SELECT session_id, MAX(CASE WHEN event = 'order_start' THEN 1 ELSE step END) AS s
                FROM events WHERE event IN ('order_start','order_step') AND session_id != '' AND $W
                GROUP BY session_id
            ) GROUP BY s", $p) as $r) {
        $maxStep[(int) $r['s']] = (int) $r['n'];
    }
    $orderSteps = [];
    for ($s = 1; $s <= KZP_LETZTER_SCHRITT; $s++) {
        $orderSteps[$s] = array_sum(array_filter($maxStep, fn ($n, $k) => $k >= $s, ARRAY_FILTER_USE_BOTH));
    }
    $abandonByStep = [];
    foreach (alle($pdo, "SELECT step, COUNT(*) AS n FROM events WHERE event = 'order_abandon' AND $W GROUP BY step", $p) as $r) {
        $abandonByStep[(int) $r['step']] = (int) $r['n'];
    }
    $errReason = $errField = $errStep = [];
    $fehlerRows = alle($pdo, "SELECT event, step, meta FROM events WHERE event IN ('order_error','order_step_error') AND $W", $p);
    foreach ($fehlerRows as $r) {
        $m = meta($r['meta']);
        zaehle($errReason, ($r['event'] === 'order_step_error' ? 'Eingabe unvollständig' : 'Absenden: ') .
            ($r['event'] === 'order_error' ? (string) ($m['reason'] ?? 'unbekannt') : ''));
        foreach (explode(',', (string) ($m['fields'] ?? '')) as $feld) {
            if ($feld !== '') {
                zaehle($errField, $feld);
            }
        }
        if ((int) $r['step'] > 0) {
            zaehle($errStep, 'Schritt ' . (int) $r['step']);
        }
    }
    $orderErrors = ['total' => count($fehlerRows), 'byReason' => $errReason, 'byField' => topN($errField, 12), 'byStep' => $errStep];
    $orderByDevice = alle($pdo, "SELECT event, device, COUNT(*) AS cnt FROM events
            WHERE event IN ('order_start','order_submit_attempt','order_error','order_confirmed_server') AND $W
            GROUP BY event, device", $p);

    // Leistungen: Auswahl, Start, Absenden, Zustellung, Preisansichten
    $services = alle($pdo, "SELECT service,
               COUNT(DISTINCT CASE WHEN event = 'service_selected' THEN session_id END) AS gewaehlt,
               COUNT(DISTINCT CASE WHEN event = 'order_start' THEN session_id END) AS begonnen,
               COUNT(DISTINCT CASE WHEN event = 'order_submit_attempt' THEN session_id END) AS abgesendet,
               SUM(event = 'order_confirmed_server') AS zugestellt,
               SUM(event = 'price_box_view') AS preisansichten,
               SUM(event = 'cta_click') AS klicks
        FROM events WHERE service != '' AND $W
        GROUP BY service ORDER BY zugestellt DESC, begonnen DESC, gewaehlt DESC LIMIT 40", $p);

    // Skriptfehler im Browser
    $errMsg = $errPath = [];
    $jsRows = alle($pdo, "SELECT path, meta FROM events WHERE event = 'js_error' AND $W ORDER BY id DESC LIMIT 5000", $p);
    foreach ($jsRows as $r) {
        $m = meta($r['meta']);
        zaehle($errMsg, (string) ($m['msg'] ?? 'unbekannt') . (isset($m['src']) && $m['src'] !== ''
            ? ' @ ' . $m['src'] . (!empty($m['line']) ? ':' . $m['line'] : '') : ''));
        if ($r['path'] !== '') {
            zaehle($errPath, $r['path']);
        }
    }
    $jsErrors = ['total' => count($jsRows), 'byMsg' => topN($errMsg, 10), 'byPath' => topN($errPath, 10)];

    // Herkunft & Kampagnen: Herkunft der Sitzung × erreichte Stufe
    $camp = [];
    foreach (alle($pdo, "SELECT s.meta, st.stage, st.contact, st.confirmed
            FROM events s
            JOIN (SELECT session_id, $S AS stage,
                         SUM(event = 'contact_click') AS contact,
                         SUM(event = 'order_confirmed_server') AS confirmed
                  FROM events WHERE session_id != '' AND $W GROUP BY session_id) st
              ON st.session_id = s.session_id
            WHERE s.event = 'session_start' AND s.created_at >= :from LIMIT 50000", $p) as $r) {
        $m = meta($r['meta']);
        $quelle = (string) ($m['utm_source'] ?? '');
        if ($quelle === '') {
            $quelle = !empty($m['clid']) ? $m['clid'] . '-ads' : (string) ($m['ref'] ?? '');
        }
        $quelle = $quelle !== '' ? $quelle : 'direkt';
        $kampagne = (string) ($m['utm_campaign'] ?? '');
        $k = $quelle . ($kampagne !== '' ? ' · ' . $kampagne : '');
        $c = &$camp[$k];
        $c ??= ['source' => $quelle, 'campaign' => $kampagne, 'medium' => (string) ($m['utm_medium'] ?? ''),
                'sessions' => 0, 'interesse' => 0, 'auftragsseite' => 0, 'assistent' => 0, 'zugestellt' => 0, 'kontakt' => 0];
        $stufe = (int) $r['stage'];
        $c['sessions']++;
        $c['interesse'] += $stufe >= 3 ? 1 : 0;
        $c['auftragsseite'] += $stufe >= 4 ? 1 : 0;
        $c['assistent'] += $stufe >= 5 ? 1 : 0;
        $c['zugestellt'] += (int) $r['confirmed'] > 0 ? 1 : 0;
        $c['kontakt'] += (int) $r['contact'] > 0 ? 1 : 0;
        unset($c);
    }
    usort($camp, fn ($a, $b) => $b['sessions'] <=> $a['sessions']);
    $campaigns = array_slice(array_values($camp), 0, 40);

    // Vorperiode (?compare=1): die N Tage davor
    $prev = null;
    if (($_GET['compare'] ?? '') === '1') {
        $pp = [':a' => vor($days * 2), ':b' => $from];
        $WP = 'created_at >= :a AND created_at < :b';
        $pf = [];
        foreach (alle($pdo, "SELECT event, COUNT(*) AS cnt FROM events WHERE $WP GROUP BY event", $pp) as $r) {
            $pf[$r['event']] = (int) $r['cnt'];
        }
        $prev = [
            'days'     => $days,
            'funnel'   => $pf,
            'sessions' => (int) alle($pdo, "SELECT COUNT(DISTINCT session_id) AS n FROM events
                                            WHERE session_id != '' AND $WP", $pp)[0]['n'],
            'contactSessions' => (int) alle($pdo, "SELECT COUNT(DISTINCT session_id) AS n FROM events
                                            WHERE event = 'contact_click' AND session_id != '' AND $WP", $pp)[0]['n'],
            'dropoff'  => alle($pdo, "SELECT stage, COUNT(*) AS cnt FROM (
                    SELECT session_id, $S AS stage FROM events
                    WHERE session_id != '' AND $WP GROUP BY session_id
                ) GROUP BY stage ORDER BY stage", $pp),
        ];
    }

    $erstes = alle($pdo, 'SELECT MIN(created_at) AS t FROM events')[0]['t'] ?? null;

    antwort([
        'ok' => true, 'days' => $days, 'firstEvent' => iso($erstes),
        'funnel' => $funnel, 'daily' => $daily, 'stageEvents' => $stufenEvents, 'devices' => $devices,
        'sessions' => $sessions, 'dropoff' => $dropoff,
        'topPages' => $topPages, 'entryPages' => $entryPages, 'exitPages' => $exitPages, 'pageDwell' => $pageDwell,
        'contacts' => $contacts, 'requests' => $requests,
        'orderSteps' => $orderSteps, 'abandonByStep' => $abandonByStep, 'orderErrors' => $orderErrors,
        'orderByDevice' => $orderByDevice, 'services' => $services,
        'jsErrors' => $jsErrors, 'campaigns' => $campaigns, 'prev' => $prev,
    ]);
} catch (Throwable $e) {
    antwort(['ok' => false, 'error' => 'Auswertung fehlgeschlagen: ' . $e->getMessage()], 500);
}
