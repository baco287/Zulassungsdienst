<?php
/**
 * Kennzeichenassistent – gemeinsame Bausteine für den Server.
 *
 *   Browser  components/kennzeichen/…        Generator, Regelprüfung, Gespräch (ohne Server)
 *   Server   api/kennzeichen-ki.php          KI-Ideen über die Claude API, mit Budget und Drossel
 *            api/kennzeichen-verfuegbarkeit.php   Verfügbarkeit über angebundene Quellen (Stand: keine)
 *   Ansicht  analytics/kennzeichen.php       Zahlen, Kosten, Schalter – hinter dem Analytics-Login
 *
 * SPEICHER: eine eigene SQLite-Datei neben der Webanalyse, außerhalb des Web-Ordners
 * (Kontowurzel/analytics-daten/kennzeichen.sqlite). Der Deploy fasst sie nie an.
 *
 * DATENSCHUTZ: Gespeichert werden je KI-Anfrage nur Zeit, Kürzel, Stil, Tokenzahlen, Kosten
 * und Ergebnis – nie der Text des Kunden, nie Namen oder Daten, nie die IP-Adresse (für die
 * Drossel nur ein kurzlebiger Schlüsselwert). Einträge älter als KZA_AUFBEWAHRUNG_TAGE werden gelöscht.
 *
 * REGELN: Dieselben wie im Browser. Der Build exportiert sie nach /kennzeichen-daten/regeln.json
 * (aus config/kennzeichen-regeln.json); diese Datei liest sie von dort.
 *
 * Nie direkt abrufbar (public/.htaccess), nur per require.
 */

declare(strict_types=1);

// Meldungen von PHP nie an den Browser: Sie würden die JSON-Antwort zerstören und
// Serverpfade verraten. Fehler landen im Fehlerprotokoll des Servers.
ini_set('display_errors', '0');

require_once __DIR__ . '/analytics-lib.php';

/** Protokoll der KI-Anfragen: 14 Monate – reicht für Monats- und Vorjahresvergleich. */
const KZA_AUFBEWAHRUNG_TAGE = 430;

/** Ideenvorrat für „überrasche mich“ je Kürzel und Stil: so lange gültig. */
const KZA_CACHE_TAGE = 30;

/**
 * Listenpreise in US-Dollar je Million Token (Stand November 2026, Prompts bis 100.000 Token).
 * Cache-Lesen kostet ein Zehntel, Cache-Schreiben das 1,25-Fache des Eingabepreises.
 * Die Kosten im Dashboard sind daraus berechnet – verbindlich ist die Abrechnung bei Anthropic.
 */
const KZA_PREISE = [
    'claude-haiku-5-5'  => ['ein' => 0.10, 'aus' => 0.50],
];

/**
 * Modelle, die der Endpunkt nutzen darf – nur an der echten API geprüfte. Die Anfrage schaltet
 * das „Nachdenken“ ab (thinking: disabled); das nehmen nicht alle Modelle an. Wer ein weiteres
 * Modell ergänzt, braucht dafür Preise in KZA_PREISE, die passende thinking-Einstellung in
 * api/kennzeichen-ki.php und einen Echttest (docs/KENNZEICHEN-ASSISTENT.md).
 */
const KZA_MODELLE = ['claude-haiku-5-5'];

/**
 * Voreinstellungen. Jede lässt sich im Dashboard ändern (Tabelle einstellungen).
 *
 * Zur Einordnung: Eine KI-Anfrage kostet mit Claude Haiku 5.5 rund 0,05 Cent. Das
 * Monatsbudget ist deshalb ein Sicherheitsnetz gegen Missbrauch, kein Planwert.
 */
const KZA_STANDARD = [
    'ki_aktiv'        => '1',      // 0 = KI pausiert, der Generator im Browser läuft weiter
    'modell'          => 'claude-haiku-5-5',
    'limit_tag'       => '400',    // KI-Anfragen je Tag, alle Besucher zusammen
    'limit_monat_usd' => '10',     // geschätzte Kosten je Kalendermonat in US-Dollar
    'limit_ip_stunde' => '12',     // KI-Anfragen je Anschluss und Stunde
    'limit_ip_tag'    => '40',     // KI-Anfragen je Anschluss und Tag
    'alarm_10min'     => '80',     // mehr Anfragen in 10 Minuten → automatische Pause
    'pause_minuten'   => '60',     // Dauer der automatischen Pause
    'pause_bis'       => '0',      // Unix-Zeit, bis zu der die automatische Pause gilt
];

const KZA_STILE = ['elegant', 'sportlich', 'minimalistisch', 'kreativ', 'persoenlich', 'ueberraschend'];

function kza_db(): PDO
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
    $neu = !is_file($dir . '/kennzeichen.sqlite');
    $pdo = new PDO('sqlite:' . $dir . '/kennzeichen.sqlite', null, null, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_TIMEOUT            => 5,
    ]);
    $pdo->exec('PRAGMA busy_timeout = 5000');
    if ($neu) {
        $pdo->exec('PRAGMA journal_mode = WAL');
    }
    $pdo->exec('PRAGMA synchronous = NORMAL');
    $pdo->exec("CREATE TABLE IF NOT EXISTS ki_anfragen (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at    TEXT    NOT NULL,
        tag           TEXT    NOT NULL,
        art           TEXT    NOT NULL DEFAULT '',
        kuerzel       TEXT    NOT NULL DEFAULT '',
        stil          TEXT    NOT NULL DEFAULT '',
        quelle        TEXT    NOT NULL DEFAULT '',
        status        TEXT    NOT NULL DEFAULT '',
        modell        TEXT    NOT NULL DEFAULT '',
        input_tokens  INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        cache_read    INTEGER NOT NULL DEFAULT 0,
        cache_write   INTEGER NOT NULL DEFAULT 0,
        kosten_mikro  INTEGER NOT NULL DEFAULT 0,
        dauer_ms      INTEGER NOT NULL DEFAULT 0,
        vorschlaege   INTEGER NOT NULL DEFAULT 0
    )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_ki_tag ON ki_anfragen (tag)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_ki_created ON ki_anfragen (created_at)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS ki_cache (schluessel TEXT PRIMARY KEY, antwort TEXT NOT NULL, created_at INTEGER NOT NULL, treffer INTEGER NOT NULL DEFAULT 0)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS einstellungen (name TEXT PRIMARY KEY, wert TEXT NOT NULL)');
    $pdo->exec('CREATE TABLE IF NOT EXISTS drossel (k TEXT PRIMARY KEY, n INTEGER NOT NULL, bis INTEGER NOT NULL)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_drossel_bis ON drossel (bis)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_cache_created ON ki_cache (created_at)');
    $pdo->exec("CREATE TABLE IF NOT EXISTS fehler (
        id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, stelle TEXT NOT NULL, code TEXT NOT NULL DEFAULT '', meldung TEXT NOT NULL DEFAULT ''
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS pruefungen (
        id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL, tag TEXT NOT NULL, bezirk TEXT NOT NULL DEFAULT '', anbieter TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT ''
    )");
    return $pdo;
}

/** Einstellungen: Voreinstellung, überschrieben durch das, was im Dashboard gespeichert wurde. */
function kza_einstellungen(): array
{
    $e = KZA_STANDARD;
    foreach (kza_db()->query('SELECT name, wert FROM einstellungen') as $zeile) {
        if (array_key_exists($zeile['name'], $e)) {
            $e[$zeile['name']] = (string) $zeile['wert'];
        }
    }
    return $e;
}

function kza_setze(string $name, string $wert): void
{
    if (!array_key_exists($name, KZA_STANDARD)) {
        return;
    }
    kza_db()->prepare('INSERT INTO einstellungen (name, wert) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET wert = excluded.wert')
        ->execute([$name, $wert]);
}

/** Technischer Fehler ohne Inhalte der Anfrage. Darf selbst nie einen Fehler auslösen. */
function kza_fehler(string $stelle, string $code, string $meldung): void
{
    try {
        $meldung = mb_substr((string) preg_replace('/[\r\n\t]+/', ' ', $meldung), 0, 200);
        kza_db()->prepare('INSERT INTO fehler (created_at, stelle, code, meldung) VALUES (?, ?, ?, ?)')
            ->execute([date('Y-m-d H:i:s'), mb_substr($stelle, 0, 40), mb_substr($code, 0, 40), $meldung]);
        if (random_int(1, 50) === 1) {
            kza_db()->exec('DELETE FROM fehler WHERE id NOT IN (SELECT id FROM fehler ORDER BY id DESC LIMIT 500)');
        }
    } catch (Throwable $e) {
        // Protokoll nicht verfügbar – dann eben ohne.
    }
}

/** JSON-Antwort und Ende. Nie mit Serverdetails. */
function kza_antwort(array $daten, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Nur Aufrufe von den eigenen Seiten (Origin, sonst Referer muss zum Host passen). */
function kza_eigene_herkunft(): bool
{
    $host = strtolower((string) preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    $herkunft = (string) ($_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '');
    $herkunftHost = strtolower((string) parse_url($herkunft, PHP_URL_HOST));
    return $host !== '' && $herkunftHost === $host;
}

/** Liest den JSON-Körper der Anfrage, höchstens $max Bytes. null bei allem, was nicht passt. */
function kza_koerper(int $max): ?array
{
    $roh = (string) file_get_contents('php://input', false, null, 0, $max + 1);
    if ($roh === '' || strlen($roh) > $max) {
        return null;
    }
    $d = json_decode($roh, true);
    return is_array($d) ? $d : null;
}

/* ─────────────────────────── Regelwerk ─────────────────────────── */

/** Regelwerk aus dem Build (/kennzeichen-daten/regeln.json) oder null. */
function kza_regeln(): ?array
{
    static $regeln = false;
    if ($regeln !== false) {
        return $regeln;
    }
    $pfad = dirname(__DIR__) . '/kennzeichen-daten/regeln.json';
    $d = is_readable($pfad) ? json_decode((string) file_get_contents($pfad), true) : null;
    return $regeln = (is_array($d) && isset($d['format'], $d['sperren'], $d['kuerzel']) ? $d : null);
}

function kza_ohne_umlaut(string $s): string
{
    return strtr($s, ['Ä' => 'AE', 'Ö' => 'OE', 'Ü' => 'UE']);
}

/**
 * Prüft eine Kombination wie lib/kennzeichen/regeln.ts (pruefe, streng):
 * Aufbau, Länge, bundesweite und regionale Sperren, Vorsichtsliste.
 * true = darf vorgeschlagen werden.
 */
function kza_pruefe(array $r, string $kuerzel, string $b, string $z, string $zusatz): bool
{
    $f = $r['format'];
    // Schalter D: „$“ passt nur am echten Ende, nicht vor einem Zeilenumbruch („SS\n“).
    if (preg_match('/^[A-Z]{' . (int) $f['buchstabenMin'] . ',' . (int) $f['buchstabenMax'] . '}$/D', $b) !== 1) {
        return false;
    }
    if (preg_match('/^[1-9][0-9]{' . ((int) $f['ziffernMin'] - 1) . ',' . ((int) $f['ziffernMax'] - 1) . '}$/D', $z) !== 1) {
        return false;
    }
    $max = $zusatz !== '' ? (int) ($r['zusatz'][$zusatz]['maxStellenMitZusatz'] ?? 8) : (int) $f['maxStellen'];
    if (mb_strlen($kuerzel) + strlen($b) + strlen($z) + ($zusatz !== '' ? 1 : 0) > $max) {
        return false;
    }
    $laender = $r['kuerzel'][$kuerzel] ?? [];
    $paar = $b . ' ' . $z;
    $zusammen = $kuerzel . '-' . $b;
    foreach ($r['sperren'] as $s) {
        if (!empty($s['kuerzel']) && !in_array($kuerzel, $s['kuerzel'], true)) {
            continue;
        }
        if (!empty($s['bundeslaender']) && count(array_intersect($s['bundeslaender'], $laender)) === 0) {
            continue;
        }
        if (in_array($b, $s['buchstaben'], true) || in_array($z, $s['ziffern'], true) || in_array($paar, $s['paare'], true)
            || in_array($zusammen, $s['kombinationen'], true) || in_array($zusammen . ' ' . $z, $s['kombinationen'], true)) {
            return false;
        }
        foreach ($s['muster'] as $m) {
            if (@preg_match('/' . str_replace('/', '\/', $m) . '/D', $paar) === 1) {
                return false;
            }
        }
    }
    $v = $r['vorsicht'];
    $wort = kza_ohne_umlaut($kuerzel) . $b;
    if (in_array($b, $v['buchstaben'], true) || in_array($z, $v['ziffern'], true) || in_array($paar, $v['paare'], true)
        || in_array($wort . ' ' . $z, $v['paare'], true) || in_array($wort, $v['woerter'], true)) {
        return false;
    }
    return true;
}

/**
 * true, wenn ein Text etwas über Verfügbarkeit oder Reservierung aussagt – positiv wie negativ.
 * Das darf die KI nie: „Verfügbar“, „Nicht verfügbar“ und „Reserviert“ kommen nur aus einer
 * angebundenen Quelle. Erlaubt bleibt allein die indirekte Frage („ob … frei ist, zeigt nur die
 * Behörde“); diese Teilsätze werden zuerst entfernt, der Rest muss frei von Zustandswörtern sein.
 * Der Aufrufer ersetzt bei einem Treffer den ganzen Text durch einen festen Satz.
 * Getestet in scripts/test-kennzeichen.mjs.
 */
function kza_behauptet_verfuegbarkeit(string $s): bool
{
    $rest = (string) preg_replace('/\bob\b[^.!?,;:–—]{0,60}\b(verfügbar\w*|frei|reserviert|vergeben|zu haben)\b[^.!?,;:–—]{0,40}/iu', ' ', $s);
    return preg_match('/\b(verfügbar\w*|frei|vergeben|belegt|zu haben|erhältlich|reservier\w*|garantiert|sicher zu bekommen)\b/iu', $rest) === 1;
}

/* ─────────────────────────── Budget und Drossel ─────────────────────────── */

/** true, wenn die KI von Hand oder automatisch pausiert ist. */
function kza_pausiert(array $e): bool
{
    return $e['ki_aktiv'] !== '1' || (int) $e['pause_bis'] > time();
}

/** Geschätzte Kosten einer Antwort in Millionstel Dollar (Token × Listenpreis je Million Token). */
function kza_kosten_mikro(array $usage, string $modell): int
{
    $p = KZA_PREISE[$modell] ?? KZA_PREISE['claude-haiku-5-5'];
    $kosten = (int) ($usage['input_tokens'] ?? 0) * $p['ein']
        + (int) ($usage['output_tokens'] ?? 0) * $p['aus']
        + (int) ($usage['cache_read_input_tokens'] ?? 0) * $p['ein'] * 0.1
        + (int) ($usage['cache_creation_input_tokens'] ?? 0) * $p['ein'] * 1.25;
    return (int) ceil($kosten);
}

/**
 * Darf die KI gerade arbeiten? null = ja, sonst der Grund: pausiert | limit.
 * Bei ungewöhnlich vielen Anfragen in kurzer Zeit schaltet sich die KI selbst für
 * pause_minuten ab – der Generator im Browser läuft weiter.
 */
function kza_budget(array $e): ?string
{
    if (kza_pausiert($e)) {
        return 'pausiert';
    }
    $jetzt = time();
    $pdo = kza_db();
    $q = $pdo->prepare("SELECT COUNT(*) FROM ki_anfragen WHERE quelle = 'ki' AND created_at >= ?");
    $q->execute([date('Y-m-d H:i:s', $jetzt - 600)]);
    if ((int) $q->fetchColumn() >= (int) $e['alarm_10min']) {
        kza_setze('pause_bis', (string) ($jetzt + (int) $e['pause_minuten'] * 60));
        kza_fehler('budget', 'alarm', 'Ungewöhnlich viele KI-Anfragen in 10 Minuten – KI automatisch pausiert.');
        return 'pausiert';
    }
    $q = $pdo->prepare("SELECT COUNT(*) FROM ki_anfragen WHERE quelle = 'ki' AND tag = ?");
    $q->execute([date('Y-m-d')]);
    if ((int) $q->fetchColumn() >= (int) $e['limit_tag']) {
        return 'limit';
    }
    $q = $pdo->prepare('SELECT COALESCE(SUM(kosten_mikro), 0) FROM ki_anfragen WHERE tag >= ?');
    $q->execute([date('Y-m-01')]);
    if ((int) $q->fetchColumn() >= (float) $e['limit_monat_usd'] * 1000000) {
        return 'limit';
    }
    return null;
}

/**
 * Zählt eine Anfrage je Anschluss und meldet, ob das Kontingent reicht.
 * Gespeichert wird kein Anschluss, nur ein Schlüsselwert aus IP, Zeitfenster und dem
 * Geheimwert der Installation; abgelaufene Zähler werden sofort gelöscht.
 */
/**
 * Anschluss für die Drossel: IPv4 wie sie ist, IPv6 auf das /64-Netz gekürzt – ein Anschluss
 * hat dort beliebig viele Adressen, und jede neue bekäme sonst einen frischen Zähler.
 */
function kza_anschluss(string $ip): string
{
    if (str_contains($ip, ':')) {
        $bin = @inet_pton($ip);
        if (is_string($bin) && strlen($bin) === 16) {
            return bin2hex(substr($bin, 0, 8)) . '::/64';
        }
    }
    return $ip;
}

function kza_drossel_ok(string $ip, string $bereich, int $jeStunde, int $jeTag): bool
{
    $pdo = kza_db();
    $jetzt = time();
    $ip = kza_anschluss($ip);
    $pdo->prepare('DELETE FROM drossel WHERE bis < ?')->execute([$jetzt]);
    $ok = true;
    foreach ([[3600, $jeStunde], [86400, $jeTag]] as [$fenster, $grenze]) {
        $slot = intdiv($jetzt, $fenster);
        $k = hash_hmac('sha256', $bereich . '|' . $ip . '|' . $fenster . '|' . $slot, kzp_secret());
        $pdo->prepare('INSERT INTO drossel (k, n, bis) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET n = n + 1')
            ->execute([$k, ($slot + 1) * $fenster]);
        $q = $pdo->prepare('SELECT n FROM drossel WHERE k = ?');
        $q->execute([$k]);
        if ((int) $q->fetchColumn() > $grenze) {
            $ok = false;
        }
    }
    return $ok;
}

/** Schreibt eine Zeile ins KI-Protokoll und räumt gelegentlich alte Einträge ab. */
function kza_protokoll(array $z): void
{
    try {
        $pdo = kza_db();
        $pdo->prepare('INSERT INTO ki_anfragen (created_at, tag, art, kuerzel, stil, quelle, status, modell, input_tokens, output_tokens,
                         cache_read, cache_write, kosten_mikro, dauer_ms, vorschlaege)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            ->execute([
                date('Y-m-d H:i:s'), date('Y-m-d'), $z['art'] ?? '', $z['kuerzel'] ?? '', $z['stil'] ?? '', $z['quelle'] ?? '',
                $z['status'] ?? '', $z['modell'] ?? '', (int) ($z['input_tokens'] ?? 0), (int) ($z['output_tokens'] ?? 0),
                (int) ($z['cache_read'] ?? 0), (int) ($z['cache_write'] ?? 0), (int) ($z['kosten_mikro'] ?? 0),
                (int) ($z['dauer_ms'] ?? 0), (int) ($z['vorschlaege'] ?? 0),
            ]);
        kza_aufraeumen();
    } catch (Throwable $e) {
        // Das Protokoll darf die Antwort an den Kunden nie verhindern.
    }
}

/**
 * Löscht abgelaufene Einträge: Protokoll nach KZA_AUFBEWAHRUNG_TAGE, Ideenvorrat nach
 * KZA_CACHE_TAGE, Drosselzähler nach Ablauf ihres Zeitfensters. Läuft bei jeder KI-Anfrage
 * und bei jedem Aufruf des Dashboards (über Indizes, also billig).
 */
function kza_aufraeumen(): void
{
    try {
        $pdo = kza_db();
        $pdo->prepare('DELETE FROM drossel WHERE bis < ?')->execute([time()]);
        $pdo->prepare('DELETE FROM ki_anfragen WHERE created_at < ?')
            ->execute([date('Y-m-d H:i:s', time() - KZA_AUFBEWAHRUNG_TAGE * 86400)]);
        $pdo->prepare('DELETE FROM ki_cache WHERE created_at < ?')->execute([time() - KZA_CACHE_TAGE * 86400]);
    } catch (Throwable $e) {
        // Aufräumen darf die Antwort an den Kunden nie verhindern.
    }
}

/**
 * API-Schlüssel für Claude: api/ki-zugang.php (vom Deploy aus dem GitHub-Secret
 * ANTHROPIC_API_KEY erzeugt, siehe scripts/ki-zugang.mjs). Für lokale Tests genügt die
 * Umgebungsvariable KZP_KI_KEY. null = nicht eingerichtet.
 */
function kza_ki_schluessel(): ?string
{
    $pfad = __DIR__ . '/ki-zugang.php';
    $z = is_file($pfad) ? include $pfad : null;
    $key = is_array($z) && is_string($z['key'] ?? null) ? trim($z['key']) : '';
    if ($key === '') {
        $env = getenv('KZP_KI_KEY');
        $key = is_string($env) ? trim($env) : '';
    }
    return $key !== '' ? $key : null;
}
