<?php
/**
 * Lesende JSON-Schnittstelle des KI-Assistenten. Nur mit Login (intern/Admin.php).
 *
 *   GET  daten.php?was=start                       Zustand, Zähler, Verbrauch gegen die Limits, CSRF-Token
 *   GET  daten.php?was=liste&filter=offen|alle|ohne_ki&seite=N   Posteingang, je 25, neueste oben
 *   GET  daten.php?was=nachricht&id=N              eine Nachricht mit Einordnung, Entwurf, Prüfhinweisen, Vorschau
 *   GET  daten.php?was=verbrauch                   Kosten und Aufteilungen
 *   GET  daten.php?was=einstellungen               Einstellungen mit Grenzen, Absenderregeln
 *   GET  daten.php?was=selbsttest                  Selbsttest des Kerns (ohne Kosten)
 *   POST daten.php?was=vorschau  {id, text}        Vorschau für einen geänderten Text
 *
 * Die Vorschau ändert nichts, kommt aber per POST: Ein Mailtext gehört nicht in eine Adresszeile
 * (die im Zugriffsprotokoll des Servers landet). Sie verlangt deshalb wie jede POST-Anfrage das
 * CSRF-Token.
 */

declare(strict_types=1);

use KZP\Assistent\Admin;

require __DIR__ . '/intern/start.php';

Admin::pruefeLeseHerkunft();
$nutzer = Admin::verlangeLogin();

$methode = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');
$was = is_string($_GET['was'] ?? null) ? $_GET['was'] : '';

try {
    if ($methode === 'POST') {
        if ($was !== 'vorschau') {
            Admin::json(['ok' => false, 'fehler' => 'Diese Adresse ist nur zum Lesen da.'], 405);
        }
        Admin::pruefeCsrf($nutzer);
        $eingabe = Admin::leseJsonKoerper();
        if ($eingabe === null || !is_string($eingabe['text'] ?? null)) {
            Admin::json(['ok' => false, 'fehler' => 'Die Anfrage war unvollständig.'], 400);
        }
        Admin::json(Admin::vorschau(Admin::id($eingabe['id'] ?? null), $eingabe['text']));
    }
    if ($methode !== 'GET') {
        Admin::json(['ok' => false, 'fehler' => 'Diese Adresse ist nur zum Lesen da.'], 405);
    }

    switch ($was) {
        case 'start':
            Admin::json(Admin::start($nutzer));

        case 'liste':
            $filter = is_string($_GET['filter'] ?? null) ? $_GET['filter'] : 'offen';
            $seite = is_string($_GET['seite'] ?? null) ? (int) $_GET['seite'] : 1;
            Admin::json(Admin::liste($filter, $seite));

        case 'nachricht':
            $nachricht = Admin::nachricht(Admin::id($_GET['id'] ?? null));
            if ($nachricht === null) {
                Admin::json(['ok' => false, 'fehler' => 'Diese Nachricht gibt es nicht mehr.'], 404);
            }
            Admin::json($nachricht);

        case 'verbrauch':
            Admin::json(Admin::verbrauch());

        case 'einstellungen':
            Admin::json(Admin::einstellungen());

        case 'selbsttest':
            // Der Selbsttest meldet sich an Postfach, Mailserver und KI-Anbieter an – das dauert.
            @set_time_limit(60);
            Admin::json(Admin::selbsttest());

        default:
            Admin::json(['ok' => false, 'fehler' => 'Unbekannte Abfrage.'], 400);
    }
} catch (\Throwable $e) {
    Admin::protokolliere($e);
    Admin::json(['ok' => false, 'fehler' => 'Die Daten konnten nicht geladen werden. Bitte in ein paar Minuten noch einmal versuchen.'], 500);
}
