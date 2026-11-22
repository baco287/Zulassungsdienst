<?php
/**
 * Kostenlose Tests des KI-Assistenten (kein Netz, kein Claude-Aufruf).
 *
 *   php tests/assistent/regeln-test.php
 *
 * Bindet alle Dateien tests/assistent/teil-*-test.php ein. Läuft im Deploy vor dem Hochladen;
 * ein Fehler bricht den Deploy ab. Echte Modellaufrufe stehen getrennt in modell-test.php.
 */

declare(strict_types=1);

require __DIR__ . '/hilfe.php';

// Eigener Datenordner und Test-Wissensbasis, bevor irgendeine Klasse geladen wird.
$testOrdner = frischer_datenordner();
putenv('KZP_ASSISTENT_WISSEN=' . __DIR__ . '/wissen-test.json');
// Das Datei-Postfach arbeitet auf einer Kopie der Beispiel-Mails: Markierungen (.zustand.json)
// und abgelegte Antworten (gesendet/) landen so nie im Repository, auch nicht aus einem Testteil,
// der vergisst, eine eigene Kopie anzulegen.
$postfachKopie = $testOrdner . '/postfach';
mkdir($postfachKopie, 0700, true);
foreach (glob(__DIR__ . '/mails/*.eml') ?: [] as $mail) {
    copy($mail, $postfachKopie . '/' . basename($mail));
}
putenv('KZP_ASSISTENT_POSTFACH=datei:' . $postfachKopie);
putenv('KZP_ASSISTENT_VERSAND=datei');
// Platzhalter statt eines echten Schlüssels, BEVOR irgendeine Klasse geladen wird: Kein Testteil
// kann so versehentlich mit dem Schlüssel aus .env.assistent (lokal) oder aus der Umgebung des
// Deploys einen bezahlten Aufruf auslösen. Budget::darfAufrufen sieht trotzdem „einen Schlüssel“.
// Wer „kein Schlüssel“ prüfen will, setzt ANTHROPIC_API_KEY leer (nicht entfernen – dann griffe
// Zugang lokal auf .env.assistent zurück) und stellt danach den Platzhalter wieder her.
putenv('ANTHROPIC_API_KEY=test-schluessel-kein-echter');

require dirname(__DIR__, 2) . '/public/assistent/intern/start.php';

$teile = glob(__DIR__ . '/teil-*-test.php') ?: [];
sort($teile);
foreach ($teile as $teil) {
    require $teil;
}

testabschluss();
