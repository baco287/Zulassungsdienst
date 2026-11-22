<?php
/**
 * Schreibende JSON-Schnittstelle des KI-Assistenten. Nur mit Login, nur POST mit JSON-Körper,
 * nur mit CSRF-Token (Kopfzeile X-KZP-CSRF) und passender Herkunft – der Browser sendet den
 * Login von selbst mit, auch wenn eine fremde Seite den Aufruf auslöst.
 *
 * Körper: { "aktion": "…", "bearbeiter": "Name der Person am Bildschirm", … }
 *
 *   senden                  { entwurf_id, text, trotz_warnung }   sendet eine Antwort (nie ohne Namen)
 *   verwerfen               { nachricht_id, grund }               auch ohne Entwurf (keine Antwort nötig)
 *   uebernehmen             { nachricht_id }                      „Ich antworte selbst“
 *   neu_erzeugen            { nachricht_id }
 *   unklar_erledigt         { nachricht_id }                      unklaren Versand von Hand geprüft
 *   pause                   { an }                                an = true hält die KI an
 *   einstellung             { schluessel, wert }                  nur Schlüssel der Erlaubnisliste
 *   jetzt_abrufen           { }
 *   absender_regel          { muster, art, notiz }
 *   absender_regel_loeschen { id }
 *   kunde_loeschen          { adresse }                           alle Daten zu einer Adresse (Bauplan 7.7)
 *   sperre_aufheben         { }                                   Sperre nach Anbieterfehler vorzeitig lösen
 *
 * Antwort: { "ok": true, "meldung": "…" } oder { "ok": false, "fehler": "…" }; beim Senden
 * zusätzlich warnungen, bestaetigen und neu_gefuellt. Was eine Aktion tut und prüft, steht in
 * intern/Admin.php (fuehreAus).
 */

declare(strict_types=1);

use KZP\Assistent\Admin;

require __DIR__ . '/intern/start.php';

$nutzer = Admin::verlangeLogin();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    Admin::json(['ok' => false, 'fehler' => 'Aktionen gehen nur per POST.'], 405);
}
Admin::pruefeCsrf($nutzer);

$eingabe = Admin::leseJsonKoerper();
if ($eingabe === null) {
    Admin::json(['ok' => false, 'fehler' => 'Die Anfrage war unvollständig.'], 400);
}

// Ein Versand oder KI-Aufruf läuft zu Ende, auch wenn das Handy die Verbindung verliert oder
// der Tab geschlossen wird – ein halb abgebrochener Versand wäre das Schlimmste.
ignore_user_abort(true);
@set_time_limit(60);

try {
    $ergebnis = Admin::fuehreAus($eingabe, $nutzer);
    Admin::json($ergebnis['daten'], $ergebnis['status']);
} catch (\Throwable $e) {
    Admin::protokolliere($e);
    Admin::json(['ok' => false, 'fehler' => 'Das hat nicht geklappt. Bitte die Seite neu laden und den Stand prüfen.'], 500);
}
