<?php
/**
 * Daten-Schnittstelle des SEO Centers. Derselbe Vertrag gilt lokal in seo-autopilot/lib/api.js;
 * beide Seiten werden gegeneinander getestet (seo-autopilot/test/php.test.js).
 * Nur mit Login (api/analytics-lib.php → kzp_require_auth), derselbe Zugang wie /analytics/.
 *
 *   GET  daten.php?d=<name>          Datensatz ausliefern (feste Liste, siehe SEO_DATEIEN)
 *   GET  daten.php?bericht=<datei>   Bericht aus reports/ (Markdown oder JSON)
 *   GET  daten.php?zustand=1         Diagnose: welche Dateien vorliegen (keine Inhalte)
 *   POST daten.php?review=<id>       Bearbeitungsstand eines Befunds speichern, Body {state, note}
 *   POST daten.php?ablage=<name>     Upload durch den Prüflauf, roh oder gzip (X-Body-Encoding: gzip)
 *
 * SPEICHER: Kontowurzel/seo-daten, außerhalb des Web-Ordners (wie analytics-daten). Der Deploy
 * fasst den Ordner nie an, und er ist nie per URL abrufbar. Lokal umlenkbar mit KZP_SEO_DIR.
 * Die Prüfläufe selbst laufen nicht auf diesem Server; sie laden ihren Stand hier nur ab.
 *
 * SICHERHEIT: Namen aus der Anfrage werden nur mit festen Listen bzw. einem Muster verglichen
 * und fließen nie ungeprüft in einen Pfad. Schreibende Aufrufe brauchen die Kopfzeile
 * X-Requested-With und – sendet der Browser Origin mit – dieselbe Herkunft. Das schützt vor
 * fremd ausgelösten Anfragen, die der Browser sonst mit dem gespeicherten Login abschickte.
 * Antworten enthalten keine Serverpfade und keine Fehlermeldungen des Systems.
 *
 * Braucht PHP 8.1 oder neuer (Rückgabetyp never: Antwortfunktionen beenden die Anfrage immer).
 * Anfragetexte bitte als application/json (Browser) oder application/octet-stream (Prüflauf) senden,
 * nicht als Formular.
 */

declare(strict_types=1);

ini_set('display_errors', '0');

require __DIR__ . '/../api/analytics-lib.php';

kzp_require_auth();
header('X-Content-Type-Options: nosniff');

/** Version des Daten-Vertrags (steht in ?zustand=1). */
const SEO_VERSION = 1;

/** Größte Ablage in Bytes, roh wie entpackt (16 MB). */
const SEO_MAX_ABLAGE = 16 * 1024 * 1024;

/** Größte Anfrage beim Speichern eines Bearbeitungsstands (64 KB). */
const SEO_MAX_REVIEW = 64 * 1024;

const SEO_NOTIZ_MAX = 500;
const SEO_HISTORIE_MAX = 50;
const SEO_INDEX_MAX = 5000;

/** Feste Zuordnung Name → Datei im Datenordner. Nur diese Namen sind abrufbar. */
const SEO_DATEIEN = [
    'uebersicht'    => 'uebersicht.json',
    'issues'        => 'issues.json',
    'review'        => 'review.json',
    'suggestions'   => 'suggestions.json',
    'opportunities' => 'opportunities.json',
    'notifications' => 'notifications.json',
    'crawl-history' => 'crawl-history.json',
    'gsc'           => 'gsc.json',
    'gsc-analysis'  => 'gsc-analysis.json',
    'gsc-status'    => 'gsc-status.json',
    'reports'       => 'reports/index.json',
    'local-check'   => 'local-check.json',
    'last-crawl'    => 'last-crawl.json',
];

/** review schreibt nur das SEO Center selbst, local-check entsteht nur lokal: kein Upload. */
const SEO_OHNE_ABLAGE = ['review', 'local-check'];

const SEO_STATUS = ['offen', 'in_pruefung', 'lokal_behoben', 'freigegeben'];

/** Berichtsdateien in reports/ (Abruf und Ablage). */
const SEO_BERICHT = '/^(daily|weekly|monthly|latest)-[A-Za-z0-9._-]+\.(md|json)$/D';

/** Berichte eines Laufs (ohne latest-*): Treffer 1 ist der Name ohne Endung. */
const SEO_BERICHT_LAUF = '/^((daily|weekly|monthly)-[A-Za-z0-9._-]+)\.(md|json)$/D';

/** Eintrag „file“ im Berichtsindex. */
const SEO_INDEX_DATEI = '/^(daily|weekly|monthly)-[A-Za-z0-9._-]+\.md$/D';

const SEO_JSON = 'application/json; charset=utf-8';

function seo_antwort(array $daten, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: ' . SEO_JSON);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function seo_fehler(int $status, string $text, array $mehr = []): never
{
    seo_antwort(['ok' => false, 'error' => $text] + $mehr, $status);
}

/** Inhalt der .htaccess im Datenordner (zweite Sicherung, siehe seo_dir). */
const SEO_HTACCESS = "# Angelegt von seo/daten.php. Der Ordner liegt außerhalb des Web-Ordners; das ist nur eine zweite Sicherung.\n"
    . "Require all denied\n";

/**
 * Datenordner außerhalb des Web-Ordners; wird beim ersten Aufruf angelegt. Fehlt darin die .htaccess,
 * entsteht sie (für Apache lesbar): Landete der Ordner doch einmal im Web-Ordner, bliebe er gesperrt.
 * Eine vorhandene Datei bleibt unverändert. ?zustand=1 und die Ablage kennen sie nicht.
 */
function seo_dir(): string
{
    $env = getenv('KZP_SEO_DIR');
    $dir = (is_string($env) && $env !== '') ? rtrim($env, '/') : dirname(__DIR__, 2) . '/seo-daten';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    if (is_dir($dir) && !is_file($dir . '/.htaccess') && seo_schreibe($dir . '/.htaccess', SEO_HTACCESS)) {
        @chmod($dir . '/.htaccess', 0644);
    }
    return $dir;
}

/**
 * Parameter der Anfrage als Liste [Name, Wert] – aus der rohen Abfragezeichenkette, damit
 * doppelte Namen und Feld-Schreibweisen (d[]=…) nicht unbemerkt durchrutschen.
 */
function seo_parameter(): array
{
    $paare = [];
    foreach (explode('&', (string) ($_SERVER['QUERY_STRING'] ?? '')) as $teil) {
        if ($teil === '') {
            continue;
        }
        $p = explode('=', $teil, 2);
        $paare[] = [urldecode($p[0]), urldecode($p[1] ?? '')];
    }
    return $paare;
}

/** Schreibende Aufrufe: nur mit eigener Kopfzeile und, falls gesendet, gleicher Herkunft. */
function seo_pruefe_post(): void
{
    $kennung = (string) ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '');
    if ($kennung !== 'XMLHttpRequest' && $kennung !== 'SEO-Autopilot') {
        seo_fehler(403, 'Nicht erlaubt: Kopfzeile X-Requested-With fehlt');
    }
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    if ($origin !== '') {
        $host = strtolower((string) ($_SERVER['HTTP_HOST'] ?? ''));
        if ($host === '' || preg_match('~^https?://([^/?#@\s]+)$~Di', $origin, $m) !== 1 || strtolower($m[1]) !== $host) {
            seo_fehler(403, 'Nicht erlaubt: fremde Herkunft');
        }
    }
    // Formulardaten würde PHP selbst zerlegen (bei multipart ist der Anfragetext dann gar nicht mehr lesbar).
    if (preg_match('~^\s*(multipart/|application/x-www-form-urlencoded)~i', (string) ($_SERVER['CONTENT_TYPE'] ?? '')) === 1) {
        seo_fehler(400, 'Formulardaten werden nicht angenommen (Content-Type)');
    }
}

/** Liest den Anfragetext bis zur Grenze; darüber 413. */
function seo_body(int $max): string
{
    $laenge = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($laenge > $max) {
        seo_fehler(413, 'Anfrage zu groß');
    }
    $roh = file_get_contents('php://input', false, null, 0, $max + 1);
    if (!is_string($roh)) {
        seo_fehler(400, 'Anfrage nicht lesbar');
    }
    // Kürzer als angekündigt: der Server hat den Text verworfen (eigene Obergrenze für Anfragen).
    if (strlen($roh) > $max || strlen($roh) < $laenge) {
        seo_fehler(413, 'Anfrage zu groß');
    }
    return $roh;
}

/** Anfragetext einer Ablage, bei X-Body-Encoding: gzip entpackt (höchstens SEO_MAX_ABLAGE). */
function seo_inhalt(): string
{
    $roh = seo_body(SEO_MAX_ABLAGE);
    $kodierung = strtolower(trim((string) ($_SERVER['HTTP_X_BODY_ENCODING'] ?? '')));
    if ($kodierung === 'gzip') {
        if (!function_exists('gzdecode')) {
            seo_fehler(500, 'gzip wird auf diesem Server nicht unterstützt');
        }
        error_clear_last();
        $entpackt = @gzdecode($roh, SEO_MAX_ABLAGE);
        if (!is_string($entpackt)) {
            $grund = (string) (error_get_last()['message'] ?? '');
            if (str_contains($grund, 'insufficient memory')) {
                seo_fehler(413, 'Inhalt zu groß (höchstens 16 MB)');
            }
            seo_fehler(400, 'Inhalt lässt sich nicht entpacken');
        }
        // gzdecode darf die Grenze geringfügig überschreiten – deshalb hier noch einmal genau.
        if (strlen($entpackt) > SEO_MAX_ABLAGE) {
            seo_fehler(413, 'Inhalt zu groß (höchstens 16 MB)');
        }
        $roh = $entpackt;
    } elseif ($kodierung !== '' && $kodierung !== 'identity') {
        seo_fehler(400, 'Unbekannte Kodierung in X-Body-Encoding');
    }
    if ($roh === '') {
        seo_fehler(400, 'Leerer Inhalt');
    }
    return $roh;
}

/** Gültiges JSON mit Objekt oder Liste auf oberster Ebene – ohne die Daten im Speicher aufzubauen. */
function seo_json_gueltig(string $text): bool
{
    $erstes = $text[strspn($text, " \t\r\n")] ?? '';
    if ($erstes !== '{' && $erstes !== '[') {
        return false;
    }
    if (function_exists('json_validate')) {
        return json_validate($text);
    }
    json_decode($text);
    return json_last_error() === JSON_ERROR_NONE;
}

/** Schreibt erst in eine Nachbardatei und benennt dann um: Leser sehen nie eine halbe Datei. */
function seo_schreibe(string $ziel, string $inhalt): bool
{
    $ordner = dirname($ziel);
    if (!is_dir($ordner) && !@mkdir($ordner, 0700, true) && !is_dir($ordner)) {
        return false;
    }
    $tmp = $ordner . '/.neu-' . bin2hex(random_bytes(8));
    $fh = @fopen($tmp, 'xb');
    if ($fh === false) {
        return false;
    }
    $ok = fwrite($fh, $inhalt) === strlen($inhalt) && fflush($fh);
    fclose($fh);
    if ($ok) {
        @chmod($tmp, 0600);
        $ok = @rename($tmp, $ziel);
    }
    if (!$ok) {
        @unlink($tmp);
    }
    return $ok;
}

/** Liefert eine Datei aus, ohne sie zu dekodieren (auch große Dateien wie last-crawl). */
function seo_sende($fh, string $typ): never
{
    header('Content-Type: ' . $typ);
    $groesse = (int) (fstat($fh)['size'] ?? 0);
    // Komprimiert übertragen, falls es der Server nicht ohnehin tut (Befundlisten werden groß).
    if ($groesse > 1024 && extension_loaded('zlib') && !ini_get('zlib.output_compression')
        && str_contains((string) ($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''), 'gzip')) {
        ob_start('ob_gzhandler', 65536);
    }
    fpassthru($fh);
    fclose($fh);
    exit;
}

// ── GET ?d=<name> ────────────────────────────────────────────────────────────
function seo_datensatz(string $name): never
{
    if (!array_key_exists($name, SEO_DATEIEN)) {
        seo_fehler(400, 'Unbekannter Datensatz');
    }
    $pfad = seo_dir() . '/' . SEO_DATEIEN[$name];
    $fh = is_file($pfad) ? @fopen($pfad, 'rb') : false;
    if ($fh === false) {
        seo_antwort(['ok' => false, 'fehlt' => true, 'd' => $name], 404);
    }
    seo_sende($fh, SEO_JSON);
}

// ── GET ?bericht=<datei> ─────────────────────────────────────────────────────
function seo_bericht(string $datei): never
{
    if ($datei !== basename($datei) || preg_match(SEO_BERICHT, $datei) !== 1) {
        seo_fehler(400, 'Ungültiger Berichtsname');
    }
    $pfad = seo_dir() . '/reports/' . $datei;
    $fh = is_file($pfad) ? @fopen($pfad, 'rb') : false;
    if ($fh === false) {
        seo_fehler(404, 'Bericht nicht gefunden', ['fehlt' => true]);
    }
    seo_sende($fh, str_ends_with($datei, '.md') ? 'text/markdown; charset=utf-8' : SEO_JSON);
}

// ── GET ?zustand=1 ───────────────────────────────────────────────────────────
function seo_zustand(string $wert): never
{
    if ($wert !== '1') {
        seo_fehler(400, 'Ungültiger Wert für zustand');
    }
    $dir = seo_dir();
    $dateien = [];
    foreach (SEO_DATEIEN as $name => $datei) {
        $pfad = $dir . '/' . $datei;
        if (is_file($pfad)) {
            $dateien[$name] = [
                'bytes'     => (int) filesize($pfad),
                'geaendert' => gmdate('Y-m-d\TH:i:s\Z', (int) filemtime($pfad)),
            ];
        }
    }
    $berichte = 0;
    foreach ((@scandir($dir . '/reports') ?: []) as $f) {
        if (preg_match(SEO_INDEX_DATEI, $f) === 1) {
            $berichte++;
        }
    }
    seo_antwort([
        'ok'         => true,
        'dateien'    => (object) $dateien,
        'berichte'   => $berichte,
        'schreibbar' => is_dir($dir) && is_writable($dir),
        'version'    => SEO_VERSION,
    ]);
}

// ── POST ?review=<id> ────────────────────────────────────────────────────────
function seo_befund_bekannt(string $dir, string $id): bool
{
    $roh = @file_get_contents($dir . '/issues.json');
    // Schneller Ausschluss, bevor die (große) Befundliste dekodiert wird.
    if (!is_string($roh) || !str_contains($roh, '"' . $id . '"')) {
        return false;
    }
    $j = json_decode($roh);
    return is_object($j) && isset($j->issues) && is_object($j->issues) && isset($j->issues->{$id});
}

/** Liest, ändert und schreibt review.json unter einer Sperre. Gibt den neuen Eintrag zurück. */
function seo_review_speichern(string $dir, string $id, string $state, string $note): ?array
{
    $sperre = @fopen($dir . '/.review.sperre', 'c');
    if ($sperre === false) {
        return null;
    }
    @chmod($dir . '/.review.sperre', 0600);
    if (!flock($sperre, LOCK_EX)) {
        fclose($sperre);
        return null;
    }
    try {
        $pfad = $dir . '/review.json';
        $stand = new stdClass();
        $roh = is_file($pfad) ? @file_get_contents($pfad) : '';
        if (is_string($roh) && trim($roh) !== '') {
            $j = json_decode($roh);
            if (is_object($j)) {
                $stand = $j;
            } else {
                // Unlesbaren Stand aufheben, statt ihn stillschweigend zu überschreiben.
                @copy($pfad, $dir . '/review.beschaedigt.json');
            }
        }
        $jetzt = (new DateTimeImmutable('now', new DateTimeZone('UTC')))->format('Y-m-d\TH:i:s.v\Z');
        $alt = $stand->{$id} ?? null;
        $historie = (is_object($alt) && isset($alt->history) && is_array($alt->history)) ? $alt->history : [];
        $historie[] = ['state' => $state, 'note' => $note, 'at' => $jetzt];
        $eintrag = [
            'state'   => $state,
            'note'    => $note,
            'at'      => $jetzt,
            'history' => array_slice($historie, -SEO_HISTORIE_MAX),
        ];
        $stand->{$id} = $eintrag;
        $json = json_encode($stand, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if (!is_string($json) || !seo_schreibe($pfad, $json)) {
            return null;
        }
        return $eintrag;
    } finally {
        flock($sperre, LOCK_UN);
        fclose($sperre);
    }
}

function seo_review(string $id): never
{
    if (preg_match('/^[a-f0-9]{12}$/D', $id) !== 1) {
        seo_fehler(400, 'Ungültige Befund-ID');
    }
    $b = json_decode(seo_body(SEO_MAX_REVIEW));
    if (!is_object($b)) {
        seo_fehler(400, 'Ungültiges JSON');
    }
    $state = $b->state ?? null;
    if (!is_string($state) || !in_array($state, SEO_STATUS, true)) {
        seo_fehler(400, 'Ungültiger Status');
    }
    $note = $b->note ?? '';
    if (!is_string($note)) {
        seo_fehler(400, 'Ungültige Notiz');
    }
    if (mb_strlen($note, 'UTF-8') > SEO_NOTIZ_MAX) {
        seo_fehler(400, 'Notiz zu lang (höchstens 500 Zeichen)');
    }
    $dir = seo_dir();
    if (!seo_befund_bekannt($dir, $id)) {
        seo_fehler(404, 'Befund nicht gefunden');
    }
    $eintrag = seo_review_speichern($dir, $id, $state, $note);
    if ($eintrag === null) {
        seo_fehler(500, 'Speichern fehlgeschlagen');
    }
    seo_antwort(['ok' => true, 'review' => $eintrag]);
}

// ── POST ?ablage=<name> ──────────────────────────────────────────────────────
/** Namen (ohne Endung) der Berichte, die laut Index bleiben sollen; null bei ungültigem Index. */
function seo_index_staemme(string $json): ?array
{
    $liste = json_decode($json);
    if (!is_array($liste) || count($liste) > SEO_INDEX_MAX) {
        return null;
    }
    $staemme = [];
    foreach ($liste as $e) {
        if (!is_object($e) || !isset($e->file) || !is_string($e->file) || preg_match(SEO_INDEX_DATEI, $e->file) !== 1) {
            return null;
        }
        $staemme[substr($e->file, 0, -3)] = true;
    }
    return $staemme;
}

/** Löscht Berichte, die nicht mehr im Index stehen, und liegen gebliebene Zwischendateien. */
function seo_berichte_aufraeumen(string $ordner, array $staemme): int
{
    $entfernt = 0;
    foreach ((@scandir($ordner) ?: []) as $f) {
        if (preg_match(SEO_BERICHT_LAUF, $f, $m) === 1) {
            if (!isset($staemme[$m[1]]) && @unlink($ordner . '/' . $f)) {
                $entfernt++;
            }
        } elseif (str_starts_with($f, '.neu-') && (int) @filemtime($ordner . '/' . $f) < time() - 3600) {
            @unlink($ordner . '/' . $f);
        }
    }
    return $entfernt;
}

function seo_ablage(string $name): never
{
    if (array_key_exists($name, SEO_DATEIEN)) {
        if (in_array($name, SEO_OHNE_ABLAGE, true)) {
            seo_fehler(403, 'Ablage für diesen Datensatz nicht erlaubt');
        }
        $ziel = SEO_DATEIEN[$name];
    } elseif (str_starts_with($name, 'reports/')) {
        $datei = substr($name, 8);
        if ($datei !== basename($datei) || preg_match(SEO_BERICHT, $datei) !== 1) {
            seo_fehler(400, 'Ungültiger Berichtsname');
        }
        $ziel = 'reports/' . $datei;
    } else {
        seo_fehler(400, 'Unbekanntes Ablageziel');
    }

    $inhalt = seo_inhalt();
    if (str_ends_with($ziel, '.json')) {
        if (!seo_json_gueltig($inhalt)) {
            seo_fehler(400, 'Ungültiges JSON');
        }
    } elseif (!mb_check_encoding($inhalt, 'UTF-8')) {
        seo_fehler(400, 'Ungültiger Text (kein UTF-8)');
    }
    $staemme = null;
    if ($name === 'reports') {
        $staemme = seo_index_staemme($inhalt);
        if ($staemme === null) {
            seo_fehler(400, 'Ungültiger Berichtsindex');
        }
    }

    $dir = seo_dir();
    if (!seo_schreibe($dir . '/' . $ziel, $inhalt)) {
        seo_fehler(500, 'Speichern fehlgeschlagen');
    }
    $antwort = ['ok' => true, 'bytes' => strlen($inhalt)];
    if ($staemme !== null) {
        $antwort['entfernt'] = seo_berichte_aufraeumen($dir . '/reports', $staemme);
    }
    seo_antwort($antwort);
}

// ── Verteilung ───────────────────────────────────────────────────────────────
function seo_start(): never
{
    $methode = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
    if ($methode !== 'GET' && $methode !== 'POST') {
        header('Allow: GET, POST');
        seo_fehler(405, 'Methode nicht erlaubt');
    }
    if ($methode === 'POST') {
        seo_pruefe_post();
    }
    $paare = seo_parameter();
    if (count($paare) !== 1) {
        seo_fehler(400, 'Genau ein Parameter erwartet: d, bericht, zustand, review oder ablage');
    }
    [$name, $wert] = $paare[0];
    $lesend = ['d', 'bericht', 'zustand'];
    $schreibend = ['review', 'ablage'];
    if (!in_array($name, $lesend, true) && !in_array($name, $schreibend, true)) {
        seo_fehler(400, 'Unbekannter Parameter');
    }
    if (in_array($name, $lesend, true) !== ($methode === 'GET')) {
        header('Allow: ' . (in_array($name, $lesend, true) ? 'GET' : 'POST'));
        seo_fehler(405, 'Methode nicht erlaubt');
    }
    match ($name) {
        'd'       => seo_datensatz($wert),
        'bericht' => seo_bericht($wert),
        'zustand' => seo_zustand($wert),
        'review'  => seo_review($wert),
        'ablage'  => seo_ablage($wert),
    };
}

try {
    seo_start();
} catch (Throwable $e) {
    // Bewusst ohne Text der Ausnahme: der könnte Serverpfade enthalten.
    seo_fehler(500, 'Interner Fehler');
}
