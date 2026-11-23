<?php
/**
 * Attrappe der Claude Messages API für die Tests des Kennzeichenassistenten
 * (scripts/test-kennzeichen-api.sh). Kostet nichts und antwortet immer gleich.
 *
 *   php -S 127.0.0.1:PORT scripts/ki-attrappe.php
 *
 * Prüft, ob die Anfrage so aussieht, wie die echte API sie verlangt (Kopfzeilen, Modell,
 * Schema, keine Sampling-Parameter), und antwortet mit einer Mischung aus brauchbaren und
 * unbrauchbaren Ideen – daran zeigt sich, ob der Server richtig filtert.
 * Stichwörter im Kundentext lösen Störfälle aus: FEHLER500, UEBERLASTET, ABGELEHNT, ABGESCHNITTEN, KAPUTT,
 * LANGSAM (antwortet erst nach 17 s) sowie VORBEHALT und VERNEINT (Verfügbarkeitsaussagen, die der
 * Filter ersetzen muss). Mit KZP_ATTRAPPE_LOG=Datei schreibt sie jede empfangene Kundennachricht mit.
 */

declare(strict_types=1);

header('Content-Type: application/json');

function fehler(int $status, string $typ, string $text): void
{
    http_response_code($status);
    echo json_encode(['type' => 'error', 'error' => ['type' => $typ, 'message' => $text]]);
    exit;
}

$d = json_decode((string) file_get_contents('php://input'), true);
$kopf = array_change_key_case(getallheaders(), CASE_LOWER);

if (($kopf['x-api-key'] ?? '') === '') {
    fehler(401, 'authentication_error', 'x-api-key fehlt');
}
if (($kopf['anthropic-version'] ?? '') !== '2026-10-21') {
    fehler(400, 'invalid_request_error', 'anthropic-version fehlt oder ist falsch');
}
if (!is_array($d) || !is_string($d['model'] ?? null) || !is_int($d['max_tokens'] ?? null) || !is_array($d['messages'] ?? null)) {
    fehler(400, 'invalid_request_error', 'model, max_tokens oder messages fehlen');
}
foreach (['temperature', 'top_p', 'top_k'] as $verboten) {
    if (array_key_exists($verboten, $d)) {
        fehler(400, 'invalid_request_error', $verboten . ' ist nicht zulässig');
    }
}
$format = $d['output_config']['format'] ?? null;
if (!is_array($format) || ($format['type'] ?? '') !== 'json_schema' || ($format['schema']['additionalProperties'] ?? true) !== false) {
    fehler(400, 'invalid_request_error', 'output_config.format muss ein json_schema mit additionalProperties: false sein');
}
// system: Text oder Liste von Textblöcken (mit cache_control für Prompt-Caching).
$system = is_string($d['system'] ?? null) ? $d['system'] : implode('', array_map(fn ($b) => (string) ($b['text'] ?? ''), is_array($d['system'] ?? null) ? $d['system'] : []));
if (mb_strlen($system) < 200) {
    fehler(400, 'invalid_request_error', 'system fehlt');
}
if (isset($d['thinking']) && !in_array($d['thinking']['type'] ?? '', ['adaptive', 'disabled'], true)) {
    fehler(400, 'invalid_request_error', 'thinking: nur adaptive oder disabled');
}
// Wie die echte API: „disabled“ nimmt von den aktuellen Modellen nur Haiku 5.5 an.
if (($d['thinking']['type'] ?? '') === 'disabled' && $d['model'] !== 'claude-haiku-5-5') {
    fehler(400, 'invalid_request_error', 'thinking disabled ist für dieses Modell nicht zulässig');
}
if (isset($d['thinking']['budget_tokens'])) {
    fehler(400, 'invalid_request_error', 'budget_tokens gibt es bei diesem Modell nicht');
}

$text = (string) ($d['messages'][0]['content'] ?? '');
$log = getenv('KZP_ATTRAPPE_LOG');
if (is_string($log) && $log !== '') {
    file_put_contents($log, $text . "\n----\n", FILE_APPEND);
}
if (str_contains($text, 'LANGSAM')) {
    sleep(17);
}
$nutzung = ['input_tokens' => 780, 'output_tokens' => 310, 'cache_creation_input_tokens' => 0, 'cache_read_input_tokens' => 0];

if (str_contains($text, 'FEHLER500')) {
    fehler(500, 'api_error', 'Interner Fehler');
}
if (str_contains($text, 'UEBERLASTET')) {
    fehler(529, 'overloaded_error', 'Überlastet');
}
if (str_contains($text, 'ABGELEHNT')) {
    echo json_encode(['type' => 'message', 'role' => 'assistant', 'model' => $d['model'], 'content' => [], 'stop_reason' => 'refusal',
        'stop_details' => ['type' => 'refusal', 'category' => 'general_harms'], 'usage' => $nutzung]);
    exit;
}

$antwort = [
    // Behauptet eine Verfügbarkeit – der Server muss diesen Satz ersetzen.
    'antwort'     => str_contains($text, 'BRAV') ? 'Für Angler habe ich ein paar Ideen gesammelt.'
        : (str_contains($text, 'VORBEHALT') ? 'Ob etwas frei ist, weiß ich nicht. AN 7 ist aber bestimmt verfügbar.'
        : (str_contains($text, 'VERNEINT') ? 'MM 24 ist leider schon vergeben, nimm lieber diese.' : 'Diese Kennzeichen sind alle noch frei und sofort verfügbar!')),
    'rueckfrage'  => 'Angelst du lieber im Meer oder am See?',
    'optionen'    => str_contains($text, 'VORBEHALT') ? ['Ist frei', 'Meer'] : ['Meer', 'See', '<b>Fluss</b>', 'zu viele'],
    'stil'        => 'kreativ',
    'vorschlaege' => [
        ['b' => 'AN', 'z' => '7', 'idee' => 'AN wie Angeln, 7 als Glückszahl.'],
        ['b' => 'FI', 'z' => '5', 'idee' => 'FI wie Fisch.'],
        ['b' => 'SS', 'z' => '1', 'idee' => 'Gesperrtes Buchstabenpaar.'],
        ['b' => 'AB', 'z' => '88', 'idee' => 'Zahl von der Vorsichtsliste.'],
        ['b' => 'ABC', 'z' => '1', 'idee' => 'Drei Buchstaben.'],
        ['b' => 'OS', 'z' => '012', 'idee' => 'Führende Null.'],
        ['b' => 'fi', 'z' => '5', 'idee' => 'Doppelt.'],
        ['b' => 'MS', 'z' => '24', 'idee' => '<script>alert(1)</script>Meer und See.'],
        ['b' => 'HE', 'z' => '3', 'idee' => 'Dieses Kennzeichen ist garantiert noch frei.'],
        ['b' => 'KA', 'z' => '11', 'idee' => 'KA wie Karpfen.'],
        ['b' => 'ZA', 'z' => '9', 'idee' => 'ZA wie Zander.'],
        ['b' => 'RU', 'z' => '42', 'idee' => 'RU wie Rute.'],
        ['b' => 'BA', 'z' => '4', 'idee' => 'BA wie Barsch.'],
    ],
];

$json = json_encode($antwort, JSON_UNESCAPED_UNICODE);
if (str_contains($text, 'KAPUTT')) {
    $json = '{"antwort": "abgebrochen';
}

echo json_encode([
    'id' => 'msg_attrappe', 'type' => 'message', 'role' => 'assistant', 'model' => $d['model'],
    // Wie bei der echten API kann vor dem Text ein Denk-Block stehen.
    'content' => [['type' => 'thinking', 'thinking' => '', 'signature' => 'x'], ['type' => 'text', 'text' => $json]],
    'stop_reason' => str_contains($text, 'ABGESCHNITTEN') ? 'max_tokens' : 'end_turn',
    'usage' => $nutzung,
], JSON_UNESCAPED_UNICODE);
