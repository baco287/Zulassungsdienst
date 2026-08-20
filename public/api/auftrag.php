<?php
/**
 * Auftrags- und Unterlagen-Endpoint für DeutscheZulassung.
 *
 * Nimmt Anfragen aus dem Web-Formular entgegen und stellt sie als E-Mail
 * mit Anhängen an info@deutschezulassung.de zu.
 *
 * DATENSCHUTZ: Hochgeladene Dateien werden NICHT auf dem Webspace gespeichert.
 * Sie gehen direkt in die Anhänge der E-Mail; PHP räumt die Temp-Dateien am
 * Ende des Requests selbst auf. Damit entsteht kein Dokumentenarchiv auf dem
 * Webserver, das gesichert oder turnusmäßig gelöscht werden müsste.
 *
 * Antwortformat: application/json
 *   Erfolg:  { "ok": true,  "reference": "DZ-20260820-A7F3" }
 *   Fehler:  { "ok": false, "error": "...", "field": "zip" }
 */

declare(strict_types=1);

// -- Konfiguration -----------------------------------------------------------
const RECIPIENT       = 'info@deutschezulassung.de';
/** Absender muss auf der eigenen Domain liegen, sonst greifen SPF/DMARC nicht. */
const SENDER          = 'no-reply@deutschezulassung.de';
const SENDER_NAME     = 'DeutscheZulassung Website';
const MAX_FILES       = 12;
const MAX_FILE_BYTES  = 10485760;   // 10 MB je Datei
const MAX_TOTAL_BYTES = 26214400;   // 25 MB je Anfrage
const RATE_LIMIT      = 5;          // Anfragen ...
const RATE_WINDOW     = 600;        // ... je 10 Minuten und IP

/** Erlaubte Uploads: die Foto-Formate der Handykameras plus PDF. */
const ALLOWED = [
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'heic' => 'image/heic',
    'heif' => 'image/heif',
    'webp' => 'image/webp',
    'pdf'  => 'application/pdf',
];

/** Origins, die den Endpoint per fetch() aufrufen dürfen. */
const ALLOWED_ORIGINS = [
    'https://deutschezulassung.de',
    'https://www.deutschezulassung.de',
];

// -- Vorspiel: CORS, Methode, Rate-Limit -------------------------------------
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    http_response_code(204);
    exit;
}

/**
 * Selbstauskunft für die Inbetriebnahme: /api/auftrag.php?check=1
 * Zeigt, ob PHP läuft und ob die Upload-Limits für Handyfotos ausreichen.
 * Bewusst ohne Serverpfade, Modulliste oder Konfigurationsdetails.
 */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET' && isset($_GET['check'])) {
    $post   = toBytes((string) ini_get('post_max_size'));
    $upload = toBytes((string) ini_get('upload_max_filesize'));
    respond([
        'ok'          => true,
        'php'         => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION,
        'mail'        => function_exists('mail'),
        'fileinfo'    => class_exists('finfo'),
        'mbstring'    => function_exists('mb_substr'),
        'postMax'     => ini_get('post_max_size'),
        'uploadMax'   => ini_get('upload_max_filesize'),
        'limitsOk'    => $post >= MAX_TOTAL_BYTES && $upload >= MAX_FILE_BYTES,
        'hinweis'     => ($post >= MAX_TOTAL_BYTES && $upload >= MAX_FILE_BYTES)
            ? 'Alles bereit.'
            : 'Bitte im KAS post_max_size auf mindestens 25M und upload_max_filesize auf mindestens 10M setzen.',
    ]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Nur POST-Anfragen werden akzeptiert.');
}

/**
 * Überschreitet der Upload post_max_size, liefert PHP ein leeres $_POST.
 * Ohne diesen Sonderfall bekäme der Kunde eine irreführende Feldfehlermeldung.
 */
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
    fail(413, 'Die Dateien sind zusammen zu groß. Bitte senden Sie weniger oder kleinere Dateien (max. 25 MB insgesamt).');
}

enforceRateLimit();

// -- Spam-Abwehr: Honeypot + Mindest-Ausfüllzeit -----------------------------
// Bots füllen jedes Feld aus; ein für Menschen unsichtbares Feld bleibt leer.
if (trim((string) ($_POST['website'] ?? '')) !== '') {
    // Für den Bot wie Erfolg aussehen lassen, aber nichts zustellen.
    respond(['ok' => true, 'reference' => reference()]);
}
$elapsed = time() - (int) ($_POST['startedAt'] ?? 0);
if (isset($_POST['startedAt']) && $elapsed >= 0 && $elapsed < 3) {
    fail(422, 'Bitte versuchen Sie es erneut.');
}

// -- Eingaben einlesen und prüfen --------------------------------------------
$kind = (($_POST['kind'] ?? 'auftrag') === 'unterlagen') ? 'unterlagen' : 'auftrag';

$f = [
    'service'   => clean($_POST['service']   ?? ''),   // Klartextname der Leistung
    'audience'  => clean($_POST['audience']  ?? ''),
    'name'      => clean($_POST['name']      ?? ''),
    'email'     => clean($_POST['email']     ?? ''),
    'phone'     => clean($_POST['phone']     ?? ''),
    'zip'       => clean($_POST['zip']       ?? ''),
    'city'      => clean($_POST['city']      ?? ''),
    'vehicle'   => clean($_POST['vehicle']   ?? ''),
    'reference' => clean($_POST['reference'] ?? ''),   // bei Nachreichung von Unterlagen
];
$message = trim((string) ($_POST['message'] ?? ''));

if (($_POST['consent'] ?? '') !== 'ja') {
    fail(422, 'Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.', 'consent');
}
if (mb_strlen($f['name']) < 3) {
    fail(422, 'Bitte geben Sie Ihren Namen an.', 'name');
}

// Ein Kontaktweg genügt - wer über WhatsApp kommt, hat oft keine E-Mail zur Hand.
$hasEmail = $f['email'] !== '' && filter_var($f['email'], FILTER_VALIDATE_EMAIL) !== false;
$digits   = preg_replace('/\D/', '', $f['phone']);
$hasPhone = is_string($digits) && strlen($digits) >= 6;

if ($f['email'] !== '' && !$hasEmail) {
    fail(422, 'Diese E-Mail-Adresse sieht nicht gültig aus.', 'email');
}
if (!$hasEmail && !$hasPhone) {
    fail(422, 'Bitte hinterlassen Sie eine E-Mail-Adresse oder eine Telefonnummer.', 'contact');
}
if ($kind === 'auftrag') {
    if ($f['service'] === '') {
        fail(422, 'Bitte wählen Sie eine Leistung aus.', 'service');
    }
    if (preg_match('/^\d{5}$/', $f['zip']) !== 1) {
        fail(422, 'Bitte geben Sie eine gültige Postleitzahl an.', 'zip');
    }
}

$files = collectFiles();
$ref   = ($kind === 'unterlagen' && $f['reference'] !== '') ? $f['reference'] : reference();

// -- E-Mail bauen und zustellen ----------------------------------------------
$subject = $kind === 'unterlagen'
    ? 'Unterlagen ' . $ref . ' - ' . $f['name']
    : 'Neue Auftragsanfrage: ' . ($f['service'] !== '' ? $f['service'] . ' ' : '') . $ref . ' - ' . $f['name'];

$sent = sendMail(
    $subject,
    buildBody($kind, $f, $message, $files, $ref),
    $files,
    $hasEmail ? $f['email'] : '',
    $f['name']
);

if (!$sent) {
    fail(500, 'Ihre Anfrage konnte gerade nicht zugestellt werden. Bitte schreiben Sie uns direkt per WhatsApp oder an ' . RECIPIENT . '.');
}

respond(['ok' => true, 'reference' => $ref]);


// -- Hilfsfunktionen ---------------------------------------------------------

/**
 * Entfernt Zeilenumbrüche und Steuerzeichen. Pflicht für alles, was in
 * E-Mail-Kopfzeilen landen kann - sonst ist Header-Injection möglich.
 */
function clean($value): string
{
    $s = is_string($value) ? $value : '';
    $s = preg_replace('/[\r\n\t\x00-\x1F\x7F]+/u', ' ', $s);
    return trim(mb_substr(is_string($s) ? $s : '', 0, 200));
}

function reference(): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne I/O/0/1 - am Telefon vorlesbar
    $code = '';
    for ($i = 0; $i < 4; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return 'DZ-' . date('Ymd') . '-' . $code;
}

function respond(array $payload): void
{
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(int $status, string $error, string $field = ''): void
{
    http_response_code($status);
    $payload = ['ok' => false, 'error' => $error];
    if ($field !== '') {
        $payload['field'] = $field;
    }
    respond($payload);
}

/** Einfache Drosselung gegen Formular-Spam, gezählt je IP in einer Temp-Datei. */
function enforceRateLimit(): void
{
    $ip   = $_SERVER['REMOTE_ADDR'] ?? 'unbekannt';
    $path = sys_get_temp_dir() . '/dz-rate-' . hash('sha256', $ip) . '.txt';
    $now  = time();

    $hits = [];
    if (is_readable($path)) {
        $raw = (string) file_get_contents($path);
        foreach (explode(',', $raw) as $stamp) {
            $t = (int) $stamp;
            if ($t > $now - RATE_WINDOW) {
                $hits[] = $t;
            }
        }
    }
    if (count($hits) >= RATE_LIMIT) {
        fail(429, 'Es sind sehr viele Anfragen von Ihrem Anschluss eingegangen. Bitte versuchen Sie es in einigen Minuten erneut - oder schreiben Sie uns direkt per WhatsApp.');
    }
    $hits[] = $now;
    @file_put_contents($path, implode(',', $hits), LOCK_EX);
}

/**
 * Liest die Uploads aus $_FILES['dateien'] und prüft jede Datei einzeln.
 * Geprüft wird der tatsächliche Inhaltstyp (finfo), nicht der vom Browser
 * gemeldete - Letzterer ist frei wählbar und damit wertlos.
 *
 * @return array<int, array{name:string, mime:string, data:string, size:int}>
 */
function collectFiles(): array
{
    if (!isset($_FILES['dateien']) || !is_array($_FILES['dateien']['name'])) {
        return [];
    }

    $out   = [];
    $total = 0;
    $count = count($_FILES['dateien']['name']);

    if ($count > MAX_FILES) {
        fail(422, 'Bitte senden Sie höchstens ' . MAX_FILES . ' Dateien auf einmal.', 'dateien');
    }

    for ($i = 0; $i < $count; $i++) {
        $error = (int) $_FILES['dateien']['error'][$i];
        if ($error === UPLOAD_ERR_NO_FILE) {
            continue;
        }

        $original = (string) $_FILES['dateien']['name'][$i];
        $label    = safeStem($original);

        if ($error === UPLOAD_ERR_INI_SIZE || $error === UPLOAD_ERR_FORM_SIZE) {
            fail(413, 'Die Datei "' . $label . '" ist zu groß (max. 10 MB je Datei).', 'dateien');
        }
        if ($error !== UPLOAD_ERR_OK) {
            fail(400, 'Die Datei "' . $label . '" konnte nicht übertragen werden. Bitte erneut versuchen.', 'dateien');
        }

        $tmp = (string) $_FILES['dateien']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) {
            fail(400, 'Ungültiger Upload.', 'dateien');
        }

        $size = (int) $_FILES['dateien']['size'][$i];
        if ($size <= 0) {
            continue;
        }
        if ($size > MAX_FILE_BYTES) {
            fail(413, 'Die Datei "' . $label . '" ist zu groß (max. 10 MB je Datei).', 'dateien');
        }

        $total += $size;
        if ($total > MAX_TOTAL_BYTES) {
            fail(413, 'Die Dateien sind zusammen zu groß (max. 25 MB). Bitte senden Sie sie in zwei Nachrichten.', 'dateien');
        }

        $ext = strtolower((string) pathinfo($original, PATHINFO_EXTENSION));
        if (!isset(ALLOWED[$ext])) {
            fail(415, '"' . $label . '" hat ein nicht unterstütztes Format. Erlaubt sind Fotos (JPG, PNG, HEIC, WEBP) und PDF.', 'dateien');
        }

        // HEIC/HEIF erkennt finfo je nach Serverversion nicht zuverlässig;
        // dort bleibt die Endungsprüfung oben die maßgebliche Schranke.
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $detected = $finfo->file($tmp);
        $detected = is_string($detected) ? $detected : 'application/octet-stream';
        $isHeic   = in_array($ext, ['heic', 'heif'], true);

        if (!$isHeic && $detected !== ALLOWED[$ext] && strpos($detected, 'image/') !== 0) {
            fail(415, 'Der Inhalt von "' . $label . '" passt nicht zum Dateityp. Bitte laden Sie die Datei erneut hoch.', 'dateien');
        }

        $data = file_get_contents($tmp);
        if ($data === false) {
            fail(500, 'Die Datei "' . $label . '" konnte nicht gelesen werden.', 'dateien');
        }

        $out[] = [
            // Dateiname neu vergeben: Originalnamen können Sonderzeichen
            // enthalten, die in MIME-Kopfzeilen Ärger machen.
            'name' => sprintf('%02d-%s.%s', $i + 1, $label, $ext),
            'mime' => $isHeic ? ALLOWED[$ext] : $detected,
            'data' => $data,
            'size' => $size,
        ];
    }

    return $out;
}

/** Reduziert einen Dateinamen auf unbedenkliche Zeichen. */
function safeStem(string $original): string
{
    $stem = (string) pathinfo($original, PATHINFO_FILENAME);
    $stem = preg_replace('/[^A-Za-z0-9_-]+/', '-', $stem);
    $stem = trim(is_string($stem) ? $stem : '', '-');
    return $stem === '' ? 'unterlage' : substr($stem, 0, 40);
}

function buildBody(string $kind, array $f, string $message, array $files, string $ref): string
{
    $lines = [];
    $lines[] = $kind === 'unterlagen'
        ? 'Nachgereichte Unterlagen über deutschezulassung.de'
        : 'Neue Auftragsanfrage über deutschezulassung.de';
    $lines[] = str_repeat('=', 52);
    $lines[] = '';
    $lines[] = 'Referenz:     ' . $ref;

    if ($f['service'] !== '') {
        $lines[] = 'Leistung:     ' . $f['service'];
    }
    if ($f['audience'] !== '') {
        $lines[] = 'Kundenart:    ' . $f['audience'];
    }

    $lines[] = '';
    $lines[] = 'Name:         ' . $f['name'];
    if ($f['email'] !== '') {
        $lines[] = 'E-Mail:       ' . $f['email'];
    }
    if ($f['phone'] !== '') {
        $lines[] = 'Telefon:      ' . $f['phone'];
    }
    if ($f['zip'] !== '' || $f['city'] !== '') {
        $lines[] = 'PLZ / Ort:    ' . trim($f['zip'] . ' ' . $f['city']);
    }
    if ($f['vehicle'] !== '') {
        $lines[] = 'Fahrzeug:     ' . $f['vehicle'];
    }

    if ($message !== '') {
        $lines[] = '';
        $lines[] = 'Anmerkung des Kunden:';
        $lines[] = mb_substr($message, 0, 4000);
    }

    $lines[] = '';
    if (count($files) === 0) {
        $lines[] = 'Unterlagen:   keine mitgesendet (Kunde reicht sie per WhatsApp oder Upload-Link nach)';
    } else {
        $lines[] = 'Unterlagen:   ' . count($files) . ' Datei(en) im Anhang';
        foreach ($files as $file) {
            $lines[] = sprintf('  - %s (%s KB)', $file['name'], number_format($file['size'] / 1024, 0, ',', '.'));
        }
    }

    $lines[] = '';
    $lines[] = str_repeat('-', 52);
    $lines[] = 'Eingegangen:  ' . date('d.m.Y H:i:s');
    if ($f['email'] !== '') {
        $lines[] = 'Antworten Sie einfach auf diese E-Mail - sie geht an den Kunden.';
    }

    return implode("\r\n", $lines);
}

/** Stellt die Nachricht als multipart/mixed zu (Text + Anhänge). */
function sendMail(string $subject, string $body, array $files, string $replyTo, string $replyName): bool
{
    $boundary = 'dz' . bin2hex(random_bytes(16));

    $headers = [
        'From: ' . mimeWord(SENDER_NAME) . ' <' . SENDER . '>',
        'MIME-Version: 1.0',
        'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
        'X-Mailer: deutschezulassung-form',
    ];
    if ($replyTo !== '') {
        $headers[] = 'Reply-To: ' . mimeWord($replyName) . ' <' . $replyTo . '>';
    }

    $parts   = [];
    $parts[] = '--' . $boundary;
    $parts[] = 'Content-Type: text/plain; charset=UTF-8';
    $parts[] = 'Content-Transfer-Encoding: base64';
    $parts[] = '';
    $parts[] = chunk_split(base64_encode($body));

    foreach ($files as $file) {
        $parts[] = '--' . $boundary;
        $parts[] = 'Content-Type: ' . $file['mime'] . '; name="' . $file['name'] . '"';
        $parts[] = 'Content-Transfer-Encoding: base64';
        $parts[] = 'Content-Disposition: attachment; filename="' . $file['name'] . '"';
        $parts[] = '';
        $parts[] = chunk_split(base64_encode($file['data']));
    }

    $parts[] = '--' . $boundary . '--';
    $parts[] = '';

    return mail(
        RECIPIENT,
        mimeWord($subject),
        implode("\r\n", $parts),
        implode("\r\n", $headers),
        '-f' . SENDER
    );
}

/** Rechnet ini-Angaben wie "8M" oder "512K" in Bytes um. */
function toBytes(string $value): int
{
    $value = trim($value);
    if ($value === '') {
        return 0;
    }
    $number = (int) $value;
    switch (strtolower(substr($value, -1))) {
        case 'g': return $number * 1024 * 1024 * 1024;
        case 'm': return $number * 1024 * 1024;
        case 'k': return $number * 1024;
        default:  return $number;
    }
}

/** Kodiert Umlaute für Betreff und Anzeigenamen (RFC 2047). */
function mimeWord(string $text): string
{
    if (preg_match('/^[\x20-\x7E]*$/', $text) === 1) {
        return $text;
    }
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}
