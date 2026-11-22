<?php
/**
 * Eigene Webanalyse von KFZ-Zulassungsprofis – gemeinsame Bausteine.
 *
 * Nachbau des Analytics-Systems von Volt-Gas (Tarifrechner: js/tracking.js → POST /vg/track →
 * Tabelle analytics → analytics.html) für den PHP-Webspace bei all-inkl:
 *
 *   Browser  lib/eigeneAnalyse.ts         sendet anonyme Ereignisse an /api/track.php
 *   Server   api/track.php                prüft und speichert sie (diese Datei hilft dabei)
 *            api/auftrag.php              meldet zusätzlich „Auftrag zugestellt“ (Server-Bestätigung)
 *   Ansicht  analytics/index.php          Dashboard hinter Login
 *            analytics/daten.php          Auswertungen als JSON, ebenfalls hinter Login
 *
 * SPEICHER: eine SQLite-Datei außerhalb des Web-Ordners (Kontowurzel/analytics-daten/), wie das
 * Zustellprotokoll des Formulars. Der Deploy (lftp mirror --delete) fasst sie nie an, und sie ist
 * nie per URL abrufbar. Keine Datenbank im KAS nötig. Lokal lässt sich der Ordner mit der
 * Umgebungsvariable KZP_ANALYTICS_DIR umlenken.
 *
 * DATENSCHUTZ: keine Cookies, keine IP-Adressen, keine Namen, Kontakt-, Fahrzeug- oder Formular-
 * inhalte, keine Referenznummern. Die Sitzungskennung entsteht im Arbeitsspeicher des Browsers
 * und verschwindet mit dem Tab. Ereignisse älter als KZP_AUFBEWAHRUNG_TAGE werden gelöscht.
 *
 * LOGIN: HTTP-Basic-Auth gegen api/analytics-zugang.php. Die Datei schreibt der Deploy aus den
 * GitHub-Secrets ANALYTICS_USER und ANALYTICS_PASSWORD (scripts/analytics-zugang.mjs); sie steht
 * nie im Repository, und public/.htaccess sperrt den direkten Abruf.
 */

declare(strict_types=1);

date_default_timezone_set('Europe/Berlin');

/** Erlaubte Ereignisse. Alles andere verwirft track.php stillschweigend. */
const KZP_EVENTS = [
    // Grundlage (wie Volt-Gas)
    'session_start', 'page_view', 'page_leave', 'js_error', 'contact_click', 'cta_click',
    // Interesse
    'price_box_view', 'tool_used', 'service_selected', 'b2b_inquiry',
    // Auftrags-Assistent
    'order_start', 'order_step', 'order_step_error', 'order_abandon',
    'order_submit_attempt', 'order_error', 'order_submitted', 'documents_uploaded', 'contact_form_submit',
    // Kennzeichenassistent (lib/kennzeichen/statistik.ts) – nie mit der Kombination selbst
    'kza_start', 'kza_vorschlaege', 'kza_pruefung', 'kza_merken', 'kza_teilen', 'kza_auswahl', 'kza_uebergabe',
    // nur serverseitig (api/auftrag.php nach Antwort des Mailservers)
    'order_confirmed_server', 'documents_confirmed_server', 'order_failed_server',
];

/** Ereignisse, die nur der Server selbst schreiben darf (nicht über track.php). */
const KZP_SERVER_EVENTS = ['order_confirmed_server', 'documents_confirmed_server', 'order_failed_server'];

/** Schritt des Assistenten, ab dem „letzter Schritt erreicht“ gilt (components/AuftragForm.tsx: 4 Schritte). */
const KZP_LETZTER_SCHRITT = 4;

/**
 * Höchste erreichte Funnel-Stufe einer Session (Abbruch-Analyse, Kundenwege, Kampagnen).
 * Reihenfolge der WHEN-Zweige ist wichtig: der Aufruf der Auftragsseite ist ein page_view,
 * muss aber vor dem allgemeinen page_view geprüft werden.
 *   1 Website besucht · 2 Preise gesehen · 3 Interesse · 4 Auftragsseite · 5 Assistent begonnen
 *   6 letzter Schritt · 7 Absenden geklickt · 8 Auftrag gesendet (Client) bzw. zugestellt (Server)
 */
const KZP_STAGE_SQL = "MAX(CASE
    WHEN event IN ('order_confirmed_server','order_submitted') THEN 8
    WHEN event IN ('order_submit_attempt','order_error','order_failed_server') THEN 7
    WHEN event = 'order_step' AND step >= " . KZP_LETZTER_SCHRITT . " THEN 6
    WHEN event IN ('order_start','order_step','order_step_error','order_abandon') THEN 5
    WHEN event = 'page_view' AND path LIKE '/auftrag/%' THEN 4
    WHEN event IN ('cta_click','tool_used','service_selected') THEN 3
    WHEN event = 'price_box_view' THEN 2
    WHEN event = 'page_view' THEN 1
    ELSE 0 END)";

/** Rohdaten werden nach gut zwei Jahren gelöscht (Vergleich „365 Tage gegen Vorjahr“ bleibt möglich). */
const KZP_AUFBEWAHRUNG_TAGE = 760;

/** Höchstens so viele Ereignisse je Minute und Anschluss (Schutz vor Bots und Fehlschleifen). */
const KZP_RATE_LIMIT = 120;

/** Ordner für Datenbank und Geheimwert: Kontowurzel/analytics-daten (außerhalb des Web-Ordners). */
function kzp_data_dir(): string
{
    $env = getenv('KZP_ANALYTICS_DIR');
    if (is_string($env) && $env !== '') {
        return rtrim($env, '/');
    }
    return dirname(__DIR__, 2) . '/analytics-daten';
}

/** Öffnet die Datenbank und legt das Schema an. Wirft bei Fehlern (Aufrufer fangen ab). */
function kzp_db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }
    if (!in_array('sqlite', PDO::getAvailableDrivers(), true)) {
        throw new RuntimeException('PDO-SQLite ist auf diesem Server nicht verfügbar.');
    }
    $dir = kzp_data_dir();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        throw new RuntimeException('Datenordner kann nicht angelegt werden.');
    }
    $neu = !is_file($dir . '/analytics.sqlite');
    $pdo = new PDO('sqlite:' . $dir . '/analytics.sqlite', null, null, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 5,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000');
    if ($neu) {
        // WAL: Lesen (Dashboard) blockiert das Schreiben (Besucher) nicht.
        $pdo->exec('PRAGMA journal_mode = WAL');
    }
    $pdo->exec('PRAGMA synchronous = NORMAL');
    $pdo->exec("CREATE TABLE IF NOT EXISTS events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        event      TEXT    NOT NULL,
        session_id TEXT    NOT NULL DEFAULT '',
        path       TEXT    NOT NULL DEFAULT '',
        service    TEXT    NOT NULL DEFAULT '',
        step       INTEGER NOT NULL DEFAULT 0,
        device     TEXT    NOT NULL DEFAULT '',
        referrer   TEXT    NOT NULL DEFAULT '',
        meta       TEXT    NOT NULL DEFAULT '',
        created_at TEXT    NOT NULL
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_created ON events (created_at)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_session ON events (session_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_events_event   ON events (event, created_at)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS rate (k TEXT PRIMARY KEY, n INTEGER NOT NULL, minute INTEGER NOT NULL)');
    return $pdo;
}

/** Zufälliger Geheimwert dieser Installation (für kurzlebige Schlüssel ohne Klartext-IP). */
function kzp_secret(): string
{
    static $secret = null;
    if (is_string($secret)) {
        return $secret;
    }
    $pfad = kzp_data_dir() . '/geheim.txt';
    $s = is_readable($pfad) ? trim((string) file_get_contents($pfad)) : '';
    if (strlen($s) < 32) {
        $s = bin2hex(random_bytes(32));
        @file_put_contents($pfad, $s, LOCK_EX);
        @chmod($pfad, 0600);
    }
    return $secret = $s;
}

/**
 * Werte, die nach E-Mail, Telefon/IBAN (lange Ziffernfolge) oder FIN aussehen.
 * Als FIN gilt nur eine 17-stellige Folge mit mindestens einer Ziffer – sonst fiele
 * schon ein Wort wie „zulassungsstellen“ (17 Buchstaben ohne I/O/Q) darunter.
 */
function kzp_suspicious(string $s): bool
{
    if (preg_match('/@|\d{6,}/', $s) === 1) {
        return true;
    }
    if (preg_match_all('/\b[A-HJ-NPR-Z0-9]{17}\b/i', $s, $m) > 0) {
        foreach ($m[0] as $kandidat) {
            if (preg_match('/\d/', $kandidat) === 1) {
                return true;
            }
        }
    }
    return false;
}

/** Erlaubte Schlüssel im meta-JSON mit ihrer Höchstlänge. */
const KZP_META_KEYS = [
    'position' => 40, 'id' => 60, 'method' => 40, 'value' => 40, 'tool' => 40, 'type' => 20, 'page' => 80,
    'reason' => 40, 'fields' => 120, 'kind' => 20, 'audience' => 20, 'files' => 5, 'code' => 5,
    'dur' => 7, 'scroll' => 3, 'load' => 6,
    'msg' => 140, 'src' => 40, 'line' => 7,
    'bezirk' => 80, 'modus' => 20, 'quelle' => 12, 'n' => 3,
    'landing' => 120, 'ref' => 80, 'clid' => 20,
    'utm_source' => 80, 'utm_medium' => 80, 'utm_campaign' => 80, 'utm_content' => 80, 'utm_term' => 80,
];

/** Bereinigt das meta-Objekt: nur bekannte Schlüssel, nur kurze Werte, nichts Personenbezogenes. */
function kzp_clean_meta($meta): string
{
    if (is_string($meta)) {
        $meta = json_decode($meta, true);
    }
    if (!is_array($meta)) {
        return '';
    }
    $out = [];
    foreach (KZP_META_KEYS as $k => $max) {
        if (!array_key_exists($k, $meta)) {
            continue;
        }
        $v = $meta[$k];
        if (is_int($v) || is_float($v)) {
            $out[$k] = is_float($v) ? round($v, 2) : $v;
            continue;
        }
        if (!is_string($v) && !is_bool($v)) {
            continue;
        }
        $v = mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) $v)), 0, $max);
        if ($v === '') {
            continue;
        }
        // Kampagnen-IDs bestehen oft nur aus Ziffern – dort nur E-Mail-Adressen verwerfen.
        $bedenklich = str_starts_with($k, 'utm_') ? str_contains($v, '@') : kzp_suspicious($v);
        if ($bedenklich) {
            $out[$k] = '[entfernt]';
            continue;
        }
        $out[$k] = $v;
    }
    return $out ? (string) json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';
}

/** Pfad ohne Query und Fragment, nur sichere Zeichen. */
function kzp_clean_path($p): string
{
    $p = is_string($p) ? $p : '';
    $p = (string) preg_replace('/[?#].*$/s', '', $p);
    if ($p === '' || $p[0] !== '/') {
        return '';
    }
    $p = mb_substr($p, 0, 120);
    return preg_match('#^/[A-Za-z0-9/_.~%äöüÄÖÜß-]*$#u', $p) === 1 ? $p : '';
}

function kzp_device_from_ua(string $ua): string
{
    if (preg_match('/tablet|ipad|playbook|silk/i', $ua)) {
        return 'tablet';
    }
    if (preg_match('/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i', $ua)) {
        return 'mobile';
    }
    return 'desktop';
}

function kzp_is_bot(string $ua): bool
{
    return $ua === '' || preg_match(
        '/bot|crawl|spider|slurp|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|facebookexternalhit|'
        . 'curl|wget|python|httpclient|okhttp|java\/|go-http|phantom|selenium|puppeteer|playwright/i',
        $ua
    ) === 1;
}

/**
 * Schreibt ein Ereignis. Felder werden hier noch einmal geprüft – auch Server-Ereignisse
 * (auftrag.php) laufen durch dieselben Regeln.
 */
function kzp_log_event(array $e): void
{
    $event = (string) ($e['event'] ?? '');
    if (!in_array($event, KZP_EVENTS, true)) {
        return;
    }
    $sid = (string) ($e['session_id'] ?? '');
    $service = (string) ($e['service'] ?? '');
    $device = (string) ($e['device'] ?? '');
    $ref = strtolower((string) ($e['referrer'] ?? ''));
    $step = (int) ($e['step'] ?? 0);

    $pdo = kzp_db();
    $stmt = $pdo->prepare('INSERT INTO events (event, session_id, path, service, step, device, referrer, meta, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
    $stmt->execute([
        $event,
        preg_match('/^[a-z0-9]{6,64}$/i', $sid) === 1 ? $sid : '',
        kzp_clean_path($e['path'] ?? ''),
        preg_match('/^[a-z0-9-]{1,60}$/', $service) === 1 ? $service : '',
        ($step >= 0 && $step <= 20) ? $step : 0,
        in_array($device, ['mobile', 'tablet', 'desktop'], true) ? $device : '',
        preg_match('/^[a-z0-9.-]{1,80}$/', $ref) === 1 ? $ref : '',
        kzp_clean_meta($e['meta'] ?? null),
        date('Y-m-d H:i:s'),
    ]);

    // Gelegentlich aufräumen: Ereignisse nach Ablauf der Aufbewahrungsfrist löschen.
    if (random_int(1, 200) === 1) {
        $pdo->prepare('DELETE FROM events WHERE created_at < ?')
            ->execute([date('Y-m-d H:i:s', time() - KZP_AUFBEWAHRUNG_TAGE * 86400)]);
    }
}

/** true, solange der Anschluss unter KZP_RATE_LIMIT Ereignissen in dieser Minute liegt. */
function kzp_rate_ok(string $ip): bool
{
    $minute = intdiv(time(), 60);
    $k = hash_hmac('sha256', $ip . '|' . $minute, kzp_secret());
    $pdo = kzp_db();
    // Zähler der Vorminuten sofort löschen – aus der IP abgeleitete Werte bleiben nie länger liegen.
    $pdo->prepare('DELETE FROM rate WHERE minute < ?')->execute([$minute - 1]);
    $pdo->prepare('INSERT INTO rate (k, n, minute) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1')
        ->execute([$k, $minute]);
    $stmt = $pdo->prepare('SELECT n FROM rate WHERE k = ?');
    $stmt->execute([$k]);
    return (int) $stmt->fetchColumn() <= KZP_RATE_LIMIT;
}

// -- Login für Dashboard und Daten-API ---------------------------------------

/** Zugangsdaten aus api/analytics-zugang.php (beim Deploy erzeugt) oder null. */
function kzp_zugang(): ?array
{
    $pfad = __DIR__ . '/analytics-zugang.php';
    $z = is_file($pfad) ? include $pfad : null;
    if (!is_array($z) || !is_string($z['user'] ?? null) || !is_string($z['pass'] ?? null)
        || $z['user'] === '' || strlen($z['pass']) < 10) {
        return null;
    }
    return $z;
}

/** Benutzer und Passwort aus dem Basic-Auth-Kopf; auch, wenn PHP als FastCGI läuft. */
function kzp_basic_credentials(): array
{
    if (isset($_SERVER['PHP_AUTH_USER'])) {
        return [(string) $_SERVER['PHP_AUTH_USER'], (string) ($_SERVER['PHP_AUTH_PW'] ?? '')];
    }
    $h = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    if (stripos($h, 'basic ') === 0) {
        $dec = base64_decode(substr($h, 6), true);
        if (is_string($dec) && str_contains($dec, ':')) {
            [$u, $p] = explode(':', $dec, 2);
            return [$u, $p];
        }
    }
    return [null, null];
}

/**
 * Anschluss zu einer IP-Adresse: IPv4 unverändert, IPv6 als /64-Netz (so viel bekommt ein
 * einzelner Anschluss – sonst hätte jede Adresse darin eigene zehn Versuche).
 */
function kzp_login_anschluss(string $ip): string
{
    $bin = @inet_pton(trim($ip));
    if (!is_string($bin) || strlen($bin) !== 16) {
        return trim($ip);
    }
    if (str_starts_with($bin, str_repeat("\0", 10) . "\xff\xff")) {
        return (string) inet_ntop(substr($bin, 12));
    }
    return bin2hex(substr($bin, 0, 8)) . '/64';
}

/**
 * Fehlversuche je Anschluss: höchstens 10 in 15 Minuten. $aenderung +1 reserviert einen Versuch
 * VOR dem Vergleich (so kommen auch gleichzeitige Versuche nicht an der Grenze vorbei), -1 gibt
 * ihn nach einem richtigen Login zurück, 0 liest nur. Lesen und Schreiben unter einer Dateisperre.
 * Derselbe Login schützt auch den KI-Assistenten (public/assistent/intern/Admin.php).
 */
function kzp_login_versuche(string $ip, int $aenderung): int
{
    $pfad = sys_get_temp_dir() . '/kzp-analytics-login-' . hash('sha256', kzp_login_anschluss($ip)) . '.txt';
    $jetzt = time();
    $datei = @fopen($pfad, 'c+');
    if ($datei === false) {
        return 0;
    }
    try {
        flock($datei, LOCK_EX);
        $treffer = [];
        foreach (explode(',', (string) stream_get_contents($datei)) as $t) {
            if ((int) $t > $jetzt - 900) {
                $treffer[] = (int) $t;
            }
        }
        if ($aenderung > 0) {
            $treffer[] = $jetzt;
        } elseif ($aenderung < 0 && $treffer !== []) {
            array_pop($treffer);
        }
        if ($aenderung !== 0) {
            ftruncate($datei, 0);
            rewind($datei);
            fwrite($datei, implode(',', $treffer));
            fflush($datei);
        }
        return count($treffer);
    } finally {
        flock($datei, LOCK_UN);
        fclose($datei);
    }
}

/** Bricht mit 401/429/503 ab, wenn kein gültiger Login vorliegt. */
function kzp_require_auth(): void
{
    header('X-Robots-Tag: noindex, nofollow');
    header('Cache-Control: no-store');
    $z = kzp_zugang();
    if ($z === null) {
        http_response_code(503);
        header('Content-Type: text/plain; charset=utf-8');
        echo "Der Zugang zum Analytics-Dashboard ist noch nicht eingerichtet.\n"
            . "Bitte die GitHub-Secrets ANALYTICS_USER und ANALYTICS_PASSWORD (mind. 10 Zeichen) anlegen und neu deployen.";
        exit;
    }
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt');
    [$u, $p] = kzp_basic_credentials();
    // Mit Anmeldedaten: erst den Versuch zählen, dann vergleichen. Ist die Grenze erreicht, wird
    // gar nicht mehr verglichen.
    $stand = $u === null ? kzp_login_versuche($ip, 0) : kzp_login_versuche($ip, 1) - 1;
    if ($stand >= 10) {
        http_response_code(429);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.';
        exit;
    }
    if ($u !== null && hash_equals($z['user'], $u) && hash_equals($z['pass'], (string) $p)) {
        kzp_login_versuche($ip, -1);
        return;
    }
    header('WWW-Authenticate: Basic realm="KFZ-Zulassungsprofis Analytics", charset="UTF-8"');
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Login erforderlich';
    exit;
}
