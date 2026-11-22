<?php
/**
 * Tests für Baustein D – Admin-Bereich (public/assistent/intern/Admin.php), ohne Webserver.
 *
 * Wird von regeln-test.php eingebunden (dort: frischer Datenordner, Test-Wissensbasis, start.php).
 * Geprüft wird, was sich ohne HTTP prüfen lässt: CSRF-Token, Herkunftsprüfung, Login-Vergleich,
 * die Erlaubnisliste der Einstellungen mit ihren Zahlenbereichen, die Wörter der Oberfläche und –
 * gegen die echte Datenbank – Liste, Einzelansicht, Absenderregeln und das Löschen eines Kunden.
 * Kein Netz, kein Versand, kein KI-Aufruf; alle Namen und Adressen sind erfunden.
 *
 * Alles steht in einer Funktion, damit keine Variable in die Schleife von regeln-test.php gerät.
 */

declare(strict_types=1);

use KZP\Assistent\Admin;
use KZP\Assistent\Speicher;
use KZP\Assistent\Umgebung;

(static function (): void {
    $berlin = new DateTimeZone('Europe/Berlin');
    $zeit = static fn (string $wann): int => (new DateTimeImmutable($wann, $berlin))->getTimestamp();

    // ── CSRF-Token ────────────────────────────────────────────────────────────
    abschnitt('Admin: CSRF-Token');

    $mittag = $zeit('2026-11-22 12:00:00');
    $token = Admin::csrfTokenAm('tester', $mittag);
    pruefe(preg_match('/^[a-f0-9]{64}$/', $token) === 1, 'Token ist ein HMAC-SHA256 in Hex');
    pruefe(Admin::csrfGueltig('tester', $token, $mittag), 'Token gilt am Tag der Ausgabe');
    pruefe(Admin::csrfGueltig('tester', $token, $zeit('2026-11-22 23:59:59')), 'Token gilt bis Mitternacht');
    pruefe(Admin::csrfGueltig('tester', $token, $zeit('2026-11-23 08:00:00')), 'Token von gestern gilt noch (Seite lag über Nacht offen)');
    pruefe(!Admin::csrfGueltig('tester', $token, $zeit('2026-11-24 00:00:01')), 'Token von vorgestern gilt nicht mehr');
    pruefe(!Admin::csrfGueltig('tester', $token, $zeit('2026-11-21 23:59:59')), 'Token gilt nicht am Vortag der Ausgabe');
    pruefe(!Admin::csrfGueltig('anderer', $token, $mittag), 'Token eines anderen Benutzers gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', '', $mittag), 'leeres Token gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', 'unsinn', $mittag), 'Unsinn gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', str_repeat('0', 64), $mittag), 'erfundenes Token richtiger Länge gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', strtoupper($token), $mittag), 'Token in anderer Schreibweise gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', $token . 'a', $mittag), 'verlängertes Token gilt nicht');
    pruefe(!Admin::csrfGueltig('tester', $token . "\n", $mittag), 'Token mit Zeilenumbruch am Ende gilt nicht');
    pruefe(!Admin::csrfGueltig('', $token, $mittag), 'Token gilt nicht für einen leeren Benutzernamen');
    pruefe(Admin::csrfTokenAm('tester', $mittag) !== Admin::csrfTokenAm('Tester', $mittag), 'Benutzername zählt mit Groß- und Kleinschreibung');
    pruefe($token !== Admin::csrfTokenAm('tester', $zeit('2026-11-23 12:00:00')), 'jeder Tag hat ein eigenes Token');

    // Zeitumstellung: Der 25.10.2026 hat 25 Stunden. „Gestern“ zählt nach dem Kalender, nicht nach 24 Stunden.
    $vorUmstellung = Admin::csrfTokenAm('tester', $zeit('2026-10-24 23:30:00'));
    pruefe(Admin::csrfGueltig('tester', $vorUmstellung, $zeit('2026-10-25 23:30:00')), 'Token von gestern gilt auch am 25-Stunden-Tag bis zum Abend');
    pruefe(!Admin::csrfGueltig('tester', $vorUmstellung, $zeit('2026-10-26 00:30:00')), 'und am Tag darauf nicht mehr');

    $jetzt = Umgebung::jetzt();
    gleich(Admin::csrfTokenAm('tester', $jetzt), Admin::csrfToken('tester'), 'csrfToken() nimmt die Zeit der Umgebung');
    pruefe(Admin::csrfGueltig('tester', Admin::csrfToken('tester')), 'frisches Token gilt jetzt');

    // ── Herkunft (Origin/Referer) ─────────────────────────────────────────────
    abschnitt('Admin: Herkunft des Aufrufs');

    $host = 'kfz-zulassungsprofis.de';
    pruefe(Admin::herkunftPasst('https://kfz-zulassungsprofis.de', '', $host, false), 'eigener Origin passt');
    pruefe(Admin::herkunftPasst('https://KFZ-Zulassungsprofis.de:443', '', $host, false), 'Schreibweise und Standardport spielen keine Rolle');
    pruefe(Admin::herkunftPasst('', 'https://kfz-zulassungsprofis.de/assistent/', $host, false), 'ohne Origin entscheidet der Referer');
    pruefe(!Admin::herkunftPasst('', '', $host, false), 'ohne Origin und Referer: abgelehnt');
    pruefe(!Admin::herkunftPasst('null', 'https://kfz-zulassungsprofis.de/assistent/', $host, false), 'Origin „null“: abgelehnt');
    pruefe(!Admin::herkunftPasst('https://fremd.example', '', $host, false), 'fremder Origin: abgelehnt');
    pruefe(!Admin::herkunftPasst('https://fremd.example', 'https://kfz-zulassungsprofis.de/assistent/', $host, false), 'fremder Origin schlägt passenden Referer');
    pruefe(!Admin::herkunftPasst('https://kfz-zulassungsprofis.de.fremd.example', '', $host, false), 'ähnlich klingender Host: abgelehnt');
    pruefe(!Admin::herkunftPasst('', 'https://fremd.example/?x=https://kfz-zulassungsprofis.de/', $host, false), 'eigene Adresse nur im Referer-Anhang: abgelehnt');
    pruefe(!Admin::herkunftPasst('https://kfz-zulassungsprofis.de:8443', '', $host, false), 'anderer Port: abgelehnt');
    pruefe(!Admin::herkunftPasst('http://kfz-zulassungsprofis.de', '', $host, false), 'ohne TLS: abgelehnt');
    pruefe(!Admin::herkunftPasst('https://kfz-zulassungsprofis.de', '', '', false), 'leerer Host: abgelehnt');
    pruefe(!Admin::herkunftPasst('kein-url', '', $host, false), 'Unsinn als Origin: abgelehnt');
    pruefe(Admin::herkunftPasst('http://localhost:8080', '', 'localhost:8080', true), 'lokale Entwicklung: http mit Port passt');
    pruefe(!Admin::herkunftPasst('http://localhost:8080', '', 'localhost:8081', true), 'lokal, anderer Port: abgelehnt');
    pruefe(!Admin::herkunftPasst('http://localhost:8080', '', 'localhost:8080', false), 'http gilt nur in der lokalen Entwicklung');

    // ── Login ────────────────────────────────────────────────────────────────
    abschnitt('Admin: Login-Vergleich und Zähler-Schlüssel');

    $zugang = ['user' => 'tester', 'pass' => 'nur-ein-testwert-1'];
    pruefe(Admin::loginPasst($zugang, 'tester', 'nur-ein-testwert-1'), 'richtiger Benutzer und richtiges Passwort');
    pruefe(!Admin::loginPasst($zugang, 'tester', 'nur-ein-testwert-2'), 'falsches Passwort');
    pruefe(!Admin::loginPasst($zugang, 'Tester', 'nur-ein-testwert-1'), 'Benutzername in anderer Schreibweise');
    pruefe(!Admin::loginPasst($zugang, 'tester', ''), 'leeres Passwort');
    pruefe(!Admin::loginPasst($zugang, 'tester', null), 'kein Passwort');
    pruefe(!Admin::loginPasst($zugang, null, null), 'keine Angaben');
    pruefe(!Admin::loginPasst(['user' => '', 'pass' => ''], '', ''), 'leerer Zugang lässt niemanden herein');

    $schluessel = Admin::anschlussSchluessel('203.0.113.7');
    pruefe(str_starts_with($schluessel, 'login:'), 'Zähler-Schlüssel beginnt mit „login:“');
    enthaelt_nicht('203.0.113.7', $schluessel, 'Zähler-Schlüssel enthält die IP-Adresse nicht');
    enthaelt_nicht('203', $schluessel . '|', 'auch keinen Teil davon im Klartext') ;
    gleich($schluessel, Admin::anschlussSchluessel('203.0.113.7'), 'gleicher Anschluss, gleicher Schlüssel');
    pruefe($schluessel !== Admin::anschlussSchluessel('203.0.113.8'), 'anderer Anschluss, anderer Schlüssel');
    gleich(Admin::anschlussSchluessel('2001:db8:1:1::1'), Admin::anschlussSchluessel('2001:db8:1:1:ffff:ffff:ffff:ffff'), 'IPv6: dasselbe /64-Netz zählt als ein Anschluss (S3)');
    pruefe(Admin::anschlussSchluessel('2001:db8:1:1::1') !== Admin::anschlussSchluessel('2001:db8:1:2::1'), 'IPv6: anderes /64-Netz, anderer Schlüssel');
    gleich($schluessel, Admin::anschlussSchluessel('::ffff:203.0.113.7'), 'IPv4 in IPv6-Schreibweise zählt wie IPv4');

    // ── Einstellungen: Erlaubnisliste und Bereiche ───────────────────────────
    abschnitt('Admin: Einstellungen prüfen');

    foreach (['ki_aktiv', 'max_ki_je_lauf', 'start_uid', 'letzte_uid', 'uidvalidity', 'sperre_bis', 'sperre_grund', 'gibt_es_nicht', ''] as $verboten) {
        gleich(null, Admin::pruefeEinstellung($verboten, '1'), 'nicht änderbar: „' . $verboten . '“');
    }
    foreach (array_keys(Admin::EINSTELLUNGEN) as $erlaubt) {
        pruefe(array_key_exists($erlaubt, Speicher::STANDARD), 'erlaubter Schlüssel „' . $erlaubt . '“ ist eine Einstellung des Speichers');
        pruefe(Admin::pruefeEinstellung($erlaubt, (string) (Speicher::STANDARD[$erlaubt] ?? '')) !== null, 'der Standardwert von „' . $erlaubt . '“ besteht die Prüfung');
    }

    gleich('10', Admin::pruefeEinstellung('limit_monat_usd', '10'), 'Monatslimit 10');
    gleich('12.5', Admin::pruefeEinstellung('limit_monat_usd', '12,50'), 'Komma wird zum Punkt, Nullen am Ende fallen weg');
    gleich('0.05', Admin::pruefeEinstellung('limit_tag_usd', ' 0.05 '), 'Leerzeichen am Rand sind erlaubt');
    gleich('0', Admin::pruefeEinstellung('limit_monat_usd', '0'), 'Limit 0 ist erlaubt (nichts ausgeben)');
    gleich('50', Admin::pruefeEinstellung('limit_monat_usd', '50'), 'Limit 50 ist die Obergrenze (geteiltes Budget, K7)');
    gleich('40', Admin::pruefeEinstellung('limit_tag_usd', '40,00'), 'glatte Beträge bleiben ganz');
    foreach (['50,01', '51', '200', '1000', '-1', '1e2', '1.234', '1,2,3', 'zehn', '', ' ', '0x10', '5 $', "5\n"] as $falsch) {
        gleich(null, Admin::pruefeEinstellung('limit_monat_usd', $falsch), 'Monatslimit abgelehnt: ' . json_encode($falsch));
    }

    gleich('150', Admin::pruefeEinstellung('limit_aufrufe_tag', '150'), 'Aufrufe je Tag 150');
    gleich('7', Admin::pruefeEinstellung('limit_aufrufe_tag', '007'), 'führende Nullen fallen weg');
    gleich('0', Admin::pruefeEinstellung('limit_aufrufe_tag', '0'), 'Aufrufe je Tag 0');
    gleich(null, Admin::pruefeEinstellung('limit_aufrufe_tag', '2001'), 'Aufrufe je Tag über der Grenze');
    gleich(null, Admin::pruefeEinstellung('limit_aufrufe_tag', '1,5'), 'Aufrufe je Tag: keine Kommazahl');
    gleich(null, Admin::pruefeEinstellung('limit_aufrufe_tag', '-3'), 'Aufrufe je Tag: nicht negativ');
    gleich(null, Admin::pruefeEinstellung('limit_aufrufe_tag', "15\n"), 'Aufrufe je Tag: kein Zeilenumbruch am Ende');
    gleich('15', Admin::pruefeEinstellung('limit_aufrufe_tag', ' 15 '), 'Aufrufe je Tag: Leerzeichen am Rand erlaubt');
    gleich('2000', Admin::pruefeEinstellung('limit_aufrufe_tag', '2000'), 'Aufrufe je Tag: 2000 ist die Obergrenze');
    gleich('100', Admin::pruefeEinstellung('limit_je_absender_tag', '100'), 'je Absender: 100 ist die Obergrenze');
    gleich('0', Admin::pruefeEinstellung('limit_je_absender_tag', '0'), 'je Absender: 0 ist erlaubt');
    gleich('7', Admin::pruefeEinstellung('aufbewahrung_text_tage', '7'), 'Aufbewahrung: 7 Tage ist die Untergrenze');
    gleich('90', Admin::pruefeEinstellung('aufbewahrung_text_tage', '90'), 'Aufbewahrung: 90 Tage ist die Obergrenze (Datenschutzerklärung)');
    gleich('6', Admin::pruefeEinstellung('limit_je_absender_tag', '6'), 'je Absender 6');
    gleich(null, Admin::pruefeEinstellung('limit_je_absender_tag', '101'), 'je Absender über der Grenze');
    gleich('30', Admin::pruefeEinstellung('aufbewahrung_text_tage', '30'), 'Aufbewahrung 30 Tage');
    gleich(null, Admin::pruefeEinstellung('aufbewahrung_text_tage', '6'), 'Aufbewahrung unter 7 Tagen');
    gleich(null, Admin::pruefeEinstellung('aufbewahrung_text_tage', '91'), 'Aufbewahrung über 90 Tagen (länger als die Datenschutzerklärung zusagt)');
    gleich(null, Admin::pruefeEinstellung('aufbewahrung_text_tage', '365'), 'Aufbewahrung 365 Tage abgelehnt');

    foreach (['eskalation_sonnet', 'hinweis_mail'] as $schalter) {
        gleich('1', Admin::pruefeEinstellung($schalter, '1'), $schalter . ' an');
        gleich('0', Admin::pruefeEinstellung($schalter, '0'), $schalter . ' aus');
        gleich(null, Admin::pruefeEinstellung($schalter, 'ja'), $schalter . ': nur 0 oder 1');
        gleich(null, Admin::pruefeEinstellung($schalter, '2'), $schalter . ': 2 gibt es nicht');
    }

    gleich('Viele Grüße', Admin::pruefeEinstellung('gruss', "  Viele   Grüße \n"), 'Gruß: Ränder und doppelte Leerzeichen bereinigt');
    gleich('Gruß Bcc: x@example.org', Admin::pruefeEinstellung('gruss', "Gruß\r\nBcc: x@example.org"), 'Gruß bleibt eine Zeile (kein Zeilenumbruch)');
    gleich(null, Admin::pruefeEinstellung('gruss', ''), 'leerer Gruß abgelehnt');
    gleich(null, Admin::pruefeEinstellung('gruss', "\n \t"), 'Gruß nur aus Leerraum abgelehnt');
    gleich(null, Admin::pruefeEinstellung('gruss', str_repeat('ä', 81)), 'zu langer Gruß abgelehnt');
    gleich(str_repeat('ä', 80), Admin::pruefeEinstellung('gruss', str_repeat('ä', 80)), 'Gruß mit genau 80 Zeichen (Umlaute zählen einfach)');
    gleich(null, Admin::pruefeEinstellung('absender_name', str_repeat('x', 121)), 'zu lange Absenderzeile abgelehnt');
    gleich(null, Admin::pruefeEinstellung('gruss', "kaputt\xC3\x28"), 'ungültige Zeichenfolge abgelehnt');

    gleich('', Admin::pruefeEinstellung('fuss', ''), 'leere Fußzeile ist erlaubt (Standard aus der Wissensbasis)');
    $pflicht = "Beispiel UG (haftungsbeschränkt), Sitz der Gesellschaft: Beispielstadt\nAmtsgericht Beispielstadt, HRB 000000\nGeschäftsführer: Max Beispiel";
    gleich("Zeile 1\n" . $pflicht, Admin::pruefeEinstellung('fuss', "Zeile 1  \r\n" . str_replace("\n", "\r\n", $pflicht) . "\r\n\r\n"), 'Fußzeile: Zeilenenden vereinheitlicht, Ränder gekürzt');
    gleich('A B ' . $pflicht, Admin::pruefeEinstellung('fuss', "A\x00B " . $pflicht), 'Fußzeile: Steuerzeichen entfernt');
    gleich(null, Admin::pruefeEinstellung('fuss', str_repeat('x', 1501) . $pflicht), 'zu lange Fußzeile abgelehnt');
    gleich(null, Admin::pruefeEinstellung('fuss', implode("\n", array_fill(0, 24, 'x')) . "\n" . $pflicht), 'Fußzeile mit mehr als 25 Zeilen abgelehnt');
    pruefe(Admin::pruefeEinstellung('fuss', implode("\n", array_fill(0, 22, 'x')) . "\n" . $pflicht) !== null, 'Fußzeile mit 25 Zeilen erlaubt');
    gleich(null, Admin::pruefeEinstellung('fuss', 'Ihr Team'), 'Fußzeile ohne Pflichtangaben abgelehnt (S6)');
    foreach (['HRB', 'Geschäftsführer', 'haftungsbeschränkt', 'Sitz'] as $wort) {
        gleich(null, Admin::pruefeEinstellung('fuss', str_ireplace($wort, 'xx', $pflicht)), 'Fußzeile ohne „' . $wort . '“ abgelehnt (S6)');
    }
    enthaelt('Pflichtangaben', Admin::einstellungHinweis('fuss'), 'Hinweis zur Fußzeile nennt die Pflichtangaben');

    enthaelt('0 bis 50', Admin::einstellungHinweis('limit_monat_usd'), 'Hinweis nennt den erlaubten Bereich');
    enthaelt('0 bis 50', Admin::einstellungHinweis('limit_tag_usd'), 'Hinweis zum Tageslimit nennt den Bereich');
    enthaelt('7 bis 90', Admin::einstellungHinweis('aufbewahrung_text_tage'), 'Hinweis zur Aufbewahrung nennt den Bereich');
    gleich(['limit_monat_usd', 'limit_tag_usd', 'limit_aufrufe_tag', 'limit_je_absender_tag', 'eskalation_sonnet', 'hinweis_mail',
        'aufbewahrung_text_tage', 'gruss', 'absender_name', 'fuss'], array_keys(Admin::EINSTELLUNGEN), 'Erlaubnisliste: genau diese zehn Schlüssel');
    foreach (['limit_monat_usd', 'limit_tag_usd'] as $limit) {
        gleich([0, 50], [Admin::EINSTELLUNGEN[$limit]['min'], Admin::EINSTELLUNGEN[$limit]['max']], $limit . ': 0 bis 50 USD (Bauplan 8, K7)');
    }
    enthaelt('nicht ändern', Admin::einstellungHinweis('ki_aktiv'), 'Hinweis für nicht erlaubte Schlüssel');

    // ── Adressen, Namen, Nummern ──────────────────────────────────────────────
    abschnitt('Admin: Adressen, Namen, Nummern');

    gleich('max.beispiel@example.org', Admin::pruefeAdresse('  Max.Beispiel@Example.ORG '), 'Adresse in Kleinschreibung');
    gleich(null, Admin::pruefeAdresse('@example.org'), 'Domain allein ist keine Adresse');
    gleich(null, Admin::pruefeAdresse('max beispiel@example.org'), 'Adresse mit Leerzeichen abgelehnt');
    gleich(null, Admin::pruefeAdresse(''), 'leere Adresse abgelehnt');
    gleich(null, Admin::pruefeAdresse("max@example.org\nBcc: x@example.org"), 'Adresse mit Zeilenumbruch abgelehnt');
    gleich('max.beispiel@example.org', Admin::pruefeMuster('Max.Beispiel@example.org'), 'Regel für eine Adresse');
    gleich('@example.org', Admin::pruefeMuster(' @Example.org '), 'Regel für eine Domain');
    gleich(null, Admin::pruefeMuster('@'), 'nur @ ist kein Muster');
    gleich(null, Admin::pruefeMuster('@localhost'), 'Domain ohne Endung abgelehnt');
    gleich(null, Admin::pruefeMuster('@example.org; DROP TABLE'), 'Domain mit Anhang abgelehnt');
    gleich(null, Admin::pruefeMuster('example.org'), 'Domain ohne @ abgelehnt');
    gleich(null, Admin::pruefeMuster('%'), 'Platzhalterzeichen abgelehnt');

    gleich('Max Beispiel', Admin::bearbeiter("  Max \n Beispiel "), 'Name: Leerraum bereinigt');
    gleich('Max script alert 1 script', Admin::bearbeiter('Max<script>alert(1)</script>'), 'Name: Sonderzeichen entfernt');
    gleich('Max', Admin::bearbeiter('Max:::'), 'Name: kein Doppelpunkt (trennt Login und Namen)');
    gleich('Anne-Marie O\'Neil Jr.', Admin::bearbeiter('Anne-Marie O\'Neil Jr.'), 'Name: Bindestrich, Apostroph, Punkt bleiben');
    gleich(40, mb_strlen(Admin::bearbeiter(str_repeat('ä', 90))), 'Name: höchstens 40 Zeichen');
    gleich('', Admin::bearbeiter(null), 'Name: fehlt');
    gleich('', Admin::bearbeiter(['Max']), 'Name: falscher Typ');
    gleich('tester:Max Beispiel', Admin::kennung('tester', 'Max Beispiel'), 'Kennung „<login>:<bearbeiter>“');
    gleich('tester', Admin::kennung('tester', ''), 'Kennung ohne Namen ist der Login');

    gleich(12, Admin::id(12), 'Nummer als Zahl');
    gleich(12, Admin::id('12'), 'Nummer als Text');
    foreach ([0, -1, '0', '012', '1.5', '1e3', ' 7', "7\n", 'abc', null, true, 1.0, ['1']] as $keineNummer) {
        gleich(0, Admin::id($keineNummer), 'keine Nummer: ' . json_encode($keineNummer));
    }

    // ── Wörter der Oberfläche ────────────────────────────────────────────────
    abschnitt('Admin: Wörter der Oberfläche');

    gleich('', Admin::anhangText([]), 'keine Anhänge, kein Text');
    gleich('Anhänge: 2 Bilder (nicht an die KI gesendet)', Admin::anhangText([['art' => 'bild', 'bytes' => 1], ['art' => 'bild', 'bytes' => 2]]), 'zwei Bilder');
    gleich('Anhang: 1 PDF (nicht an die KI gesendet)', Admin::anhangText([['art' => 'pdf', 'bytes' => 1]]), 'ein PDF');
    gleich('Anhänge: 1 Bild, 2 PDFs, 1 andere Datei (nicht an die KI gesendet)',
        Admin::anhangText([['art' => 'pdf'], ['art' => 'bild'], ['art' => 'unbekannt'], ['art' => 'pdf']]), 'gemischt, unbekannte Art zählt als andere Datei');

    gleich('gerade eben', Admin::vorZeit(20), 'vor 20 Sekunden');
    gleich('vor 3 Minuten', Admin::vorZeit(185), 'vor 3 Minuten');
    gleich('vor einer Stunde', Admin::vorZeit(3700), 'vor einer Stunde');
    gleich('vor 5 Stunden', Admin::vorZeit(5 * 3600), 'vor 5 Stunden');
    gleich('vor 3 Tagen', Admin::vorZeit(3 * 86400), 'vor 3 Tagen');

    $lage = [
        'jetzt' => $mittag, 'bibliotheken' => true, 'wissen' => true, 'stop' => false, 'ki_aktiv' => true,
        'sperre_bis' => 0, 'sperre_grund' => '', 'schluessel' => true, 'letzter_abruf' => $mittag - 180,
        'heute_usd' => 0.12, 'monat_usd' => 1.4, 'aufrufe_heute' => 12,
        'limit_tag_usd' => 1.0, 'limit_monat_usd' => 10.0, 'limit_aufrufe_tag' => 150,
    ];
    gleich(['art' => 'aktiv', 'text' => 'KI aktiv – letzter Abruf vor 3 Minuten', 'zusatz' => ''], Admin::zustand($lage), 'Zustand: aktiv mit letztem Abruf');
    $z = Admin::zustand(['ki_aktiv' => false] + $lage);
    gleich(['pausiert', 'KI pausiert'], [$z['art'], $z['text']], 'Zustand: pausiert');
    $z = Admin::zustand(['monat_usd' => 10.0] + $lage);
    gleich(['gesperrt', 'Gesperrt: Monatslimit erreicht'], [$z['art'], $z['text']], 'Zustand: Monatslimit erreicht');
    $z = Admin::zustand(['heute_usd' => 1.5] + $lage);
    gleich(['gesperrt', 'Gesperrt: Tageslimit erreicht'], [$z['art'], $z['text']], 'Zustand: Tageslimit erreicht');
    $z = Admin::zustand(['aufrufe_heute' => 150] + $lage);
    gleich('gesperrt', $z['art'], 'Zustand: Tagesgrenze der Aufrufe erreicht');
    $z = Admin::zustand(['sperre_bis' => $mittag + 3600, 'sperre_grund' => 'Ausgabenlimit beim Anbieter erreicht'] + $lage);
    gleich(['gesperrt', 'Gesperrt: Ausgabenlimit beim Anbieter erreicht'], [$z['art'], $z['text']], 'Zustand: Sperre mit Grund');
    enthaelt('22.11.2026, 13:00 Uhr', $z['zusatz'], 'Zustand: Ende der Sperre genannt');
    $z = Admin::zustand(['sperre_bis' => $mittag - 1, 'sperre_grund' => 'alt'] + $lage);
    gleich('aktiv', $z['art'], 'Zustand: abgelaufene Sperre zählt nicht');
    $z = Admin::zustand(['stop' => true] + $lage);
    gleich(['gesperrt', 'Gesperrt: Not-Aus ist gesetzt'], [$z['art'], $z['text']], 'Zustand: Not-Aus (Datei STOP)');
    $z = Admin::zustand(['schluessel' => false] + $lage);
    gleich('gesperrt', $z['art'], 'Zustand: Schlüssel fehlt');
    $z = Admin::zustand(['bibliotheken' => false, 'ki_aktiv' => false] + $lage);
    gleich(['gesperrt', 'Störung: Programmteile fehlen'], [$z['art'], $z['text']], 'Zustand: fehlende Bibliotheken gehen vor');
    $z = Admin::zustand(['wissen' => false] + $lage);
    gleich(['gesperrt', 'Störung: Wissensbasis fehlt'], [$z['art'], $z['text']], 'Zustand: Wissensbasis fehlt');
    $z = Admin::zustand(['letzter_abruf' => $mittag - 7200] + $lage);
    gleich(['achtung', 'KI aktiv, aber letzter Abruf vor 2 Stunden'], [$z['art'], $z['text']], 'Zustand: Abruf überfällig');
    $z = Admin::zustand(['letzter_abruf' => 0] + $lage);
    gleich(['achtung', 'KI aktiv – noch kein Abruf'], [$z['art'], $z['text']], 'Zustand: noch kein Abruf');
    $z = Admin::zustand(['ki_aktiv' => false, 'monat_usd' => 99.0] + $lage);
    gleich('pausiert', $z['art'], 'Zustand: Pause wird vor dem Limit genannt (Reihenfolge wie Budget::darfAufrufen)');
    $z = Admin::zustand(['letzter_fehler' => 1, 'letzter_hinweis' => 'Postfach nicht erreichbar; KI-Schritt ausgelassen'] + $lage);
    gleich(['achtung', 'KI aktiv – Problem beim letzten Abruf'], [$z['art'], $z['text']], 'Zustand: Problem beim letzten Abruf');
    enthaelt('Postfach nicht erreichbar', $z['zusatz'], 'Zustand: Problem wird genannt');
    enthaelt('Letzter Abruf vor 3 Minuten', $z['zusatz'], 'Zustand: Zeit des Abrufs wird genannt');
    $z = Admin::zustand(['ki_aktiv' => false, 'letzter_fehler' => 2, 'letzter_hinweis' => 'Postfach nicht erreichbar'] + $lage);
    gleich('pausiert', $z['art'], 'Zustand: in der Pause bleibt es bei „pausiert“');
    enthaelt('Postfach nicht erreichbar', $z['zusatz'], 'Zustand: das Problem steht auch in der Pause dabei');
    $z = Admin::zustand(['sperre_bis' => $mittag + 60, 'sperre_grund' => 'x'] + $lage);
    enthaelt('vorher aufheben', $z['zusatz'], 'Zustand: Sperre lässt sich vorher aufheben');

    $texte = static fn (array $marken): array => array_column($marken, 'text');
    gleich(['Antwort-Entwurf', 'Preisfrage', 'Neukunde', 'eilt'],
        $texte(Admin::marken(['status' => 'entwurf', 'anliegen' => 'preis', 'interessent' => 1, 'dringlich' => 1, 'pruef_status' => 'ok'])), 'Marken: Entwurf, Anliegen, Neukunde, eilt');
    pruefe(in_array('Bitte selbst prüfen', $texte(Admin::marken(['status' => 'entwurf', 'uebergabe' => 1])), true), 'Marke „Bitte selbst prüfen“ bei Übergabe');
    pruefe(in_array('Bitte selbst prüfen', $texte(Admin::marken(['status' => 'entwurf', 'pruef_status' => 'warnung'])), true), 'Marke „Bitte selbst prüfen“ bei Prüfhinweisen');
    pruefe(in_array('Bitte selbst prüfen', $texte(Admin::marken(['status' => 'entwurf', 'anliegen' => 'beschwerde'])), true), 'Marke „Bitte selbst prüfen“ bei Beschwerde');
    pruefe(!in_array('Bitte selbst prüfen', $texte(Admin::marken(['status' => 'gesendet', 'uebergabe' => 1])), true), 'nach dem Senden keine Aufforderung mehr');
    gleich(['text' => 'Versand unklar', 'farbe' => 'rot'], Admin::marken(['status' => 'mensch', 'status_grund' => 'versand_unklar'])[0], 'Marke: Versand unklar ist rot');
    gleich('Auftrag über die Website', Admin::marken(['status' => 'ohne_ki', 'regel_kategorie' => 'formular'])[0]['text'], 'Marke: Formular-Mail heißt „Auftrag über die Website“');
    gleich('Wartet – KI pausiert', Admin::marken(['status' => 'wartet_ki', 'status_grund' => 'pausiert'])[0]['text'], 'Marke: wartet wegen Pause');
    gleich('Wartet auf die KI', Admin::marken(['status' => 'wartet_ki', 'status_grund' => 'neuer_grund'])[0]['text'], 'Marke: unbekannter Wartegrund fällt auf den allgemeinen Text');
    gleich('Bitte selbst beantworten', Admin::marken(['status' => 'entwurf', 'pruef_status' => 'abgelehnt'])[0]['text'], 'Marke: abgelehnter Entwurf');
    gleich('Versand geklärt', Admin::marken(['status' => 'mensch', 'status_grund' => 'versand_geklaert', 'entwurf_status' => 'unklar'])[0]['text'], 'Marke: nach dem Abhaken nicht mehr „unklar“');
    gleich(['text' => 'Versand unklar', 'farbe' => 'rot'], Admin::marken(['status' => 'entwurf', 'entwurf_status' => 'sendet', 'in_arbeit_bis' => $mittag - 1, 'jetzt' => $mittag])[0],
        'Marke: abgebrochener Versand (noch „sendet“, Belegung abgelaufen) ist unklar');
    gleich('Wird gesendet', Admin::marken(['status' => 'entwurf', 'entwurf_status' => 'sendet', 'in_arbeit_bis' => $mittag + 60, 'jetzt' => $mittag])[0]['text'], 'Marke: laufender Versand');
    gleich('Im Mailprogramm beantwortet', Admin::marken(['status' => 'mensch', 'status_grund' => 'beantwortet'])[0]['text'], 'Marke: im Mailprogramm beantwortet');
    gleich('Absenderregel: immer selbst', Admin::marken(['status' => 'mensch', 'status_grund' => 'absenderregel', 'regel_kategorie' => 'mensch'])[0]['text'], 'Marke: Absenderregel „immer selbst“');
    gleich('Sie antworten selbst', Admin::marken(['status' => 'mensch', 'status_grund' => 'uebernommen'])[0]['text'], 'Marke: übernommen');
    gleich('Mit neuerer Mail beantwortet', Admin::marken(['status' => 'zusammengefasst', 'status_grund' => 'folge_mail'])[0]['text'], 'Marke: zusammengefasst');
    gleich('Wird überarbeitet', Admin::marken(['status' => 'wartet_ki', 'status_grund' => 'stark'])[0]['text'], 'Marke: wartet auf das stärkere Modell');
    pruefe(Admin::versandUnklar('mensch', 'versand_unklar', 'unklar', 0, $mittag), 'versandUnklar: vom Kern markiert');
    pruefe(!Admin::versandUnklar('mensch', 'versand_geklaert', 'unklar', 0, $mittag), 'versandUnklar: nach dem Abhaken nicht mehr');
    pruefe(!Admin::versandUnklar('entwurf', '', 'offen', 0, $mittag), 'versandUnklar: offener Entwurf ist nicht unklar');
    pruefe(!Admin::versandUnklar('gesendet', '', 'gesendet', 0, $mittag), 'versandUnklar: Gesendetes ist nicht unklar');

    gleich('', Admin::textHinweis('Text', 'formular'), 'Texthinweis: Text vorhanden, kein Hinweis');
    enthaelt('Formular', Admin::textHinweis('', 'formular'), 'Texthinweis: Formular-Text wird nicht gespeichert');
    enthaelt('Aufbewahrungsfrist', Admin::textHinweis('', ''), 'Texthinweis: sonst leer oder Frist abgelaufen');

    $h = Admin::statusHinweis(['status' => 'mensch', 'status_grund' => 'versand_unklar'], ['status' => 'unklar'], $mittag);
    gleich('rot', $h['farbe'], 'Hinweis „Versand unklar“ ist rot');
    gleich('Bitte im Gesendet-Ordner nachsehen, ob die Mail rausging. Nicht noch einmal senden, bevor das klar ist.', $h['text'], 'Hinweis „Versand unklar“ im Wortlaut');
    $h = Admin::statusHinweis(['status' => 'entwurf', 'in_arbeit_bis' => $mittag - 10], ['status' => 'sendet'], $mittag);
    gleich('rot', $h['farbe'], 'hängen gebliebener Versand wird wie „unklar“ behandelt');
    enthaelt('Gesendet-Ordner', $h['text'], 'hängen gebliebener Versand: nachsehen statt erneut senden');
    $h = Admin::statusHinweis(['status' => 'mensch', 'status_grund' => 'beantwortet'], ['status' => 'ueberholt'], $mittag);
    gleich(['grau', 'Im Mailprogramm beantwortet'], [$h['farbe'], $h['titel']], 'Hinweis: im Mailprogramm beantwortet');
    $h = Admin::statusHinweis(['status' => 'mensch', 'status_grund' => 'zu_alt'], null, $mittag);
    gleich('gelb', $h['farbe'], 'Hinweis: zu alt ist gelb');
    $h = Admin::statusHinweis(['status' => 'ohne_ki', 'regel_kategorie' => 'newsletter'], null, $mittag);
    enthaelt('Entwurf erzeugen', $h['text'], 'Hinweis: aussortierte Mail – Entwurf lässt sich trotzdem erzeugen');
    $h = Admin::statusHinweis(['status' => 'ohne_ki', 'regel_kategorie' => 'formular'], null, $mittag);
    enthaelt_nicht('Entwurf erzeugen', $h['text'], 'Hinweis: Formular-Auftrag – kein Entwurf');
    $h = Admin::statusHinweis(['status' => 'entwurf', 'in_arbeit_bis' => $mittag + 60], ['status' => 'sendet'], $mittag);
    gleich('gelb', $h['farbe'], 'laufender Versand: bitte warten');
    $h = Admin::statusHinweis(['status' => 'entwurf'], ['status' => 'offen', 'pruef_status' => 'ok', 'text_final' => 'Text'], $mittag,
        ['uebergabe' => 1, 'uebergabe_grund' => 'Auftrag nachsehen', 'stimmung' => 'veraergert']);
    gleich('Bitte selbst prüfen', $h['titel'], 'Hinweis bei Übergabe');
    enthaelt('Auftrag nachsehen.', $h['text'], 'Hinweis nennt den Grund der Übergabe');
    enthaelt('verärgert', $h['text'], 'Hinweis nennt die Stimmung');
    $h = Admin::statusHinweis(['status' => 'gesendet'], ['status' => 'gesendet', 'freigegeben_von' => 'tester:Max Beispiel', 'freigegeben_am' => $mittag], $mittag);
    enthaelt('von Max Beispiel', $h['text'], 'Gesendet-Hinweis nennt die Person');
    enthaelt_nicht('tester', $h['text'], 'Gesendet-Hinweis zeigt den Login-Namen nicht');

    gleich([['name' => 'email', 'usd' => 1.5, 'aufrufe' => 3]], Admin::gruppen([['kanal' => 'email', 'usd' => 1.5, 'aufrufe' => 3]], 'kanal'), 'Aufteilung als Liste von Zeilen');
    gleich([['name' => 'email', 'usd' => 1.5, 'aufrufe' => 3]], Admin::gruppen(['email' => ['usd' => 1.5, 'aufrufe' => 3]], 'kanal'), 'Aufteilung als Zuordnung Name → Zeile');
    gleich([['name' => 'email', 'usd' => 1.5, 'aufrufe' => 0]], Admin::gruppen(['email' => 1.5], 'kanal'), 'Aufteilung als Zuordnung Name → Betrag');
    gleich([['name' => 'email', 'usd' => 0.25, 'aufrufe' => 2]], Admin::gruppen([['kanal' => 'email', 'kosten_mikro_usd' => 250000, 'anzahl' => 2]], 'kanal'), 'Aufteilung mit Mikro-Dollar');
    gleich([], Admin::gruppen(null, 'kanal'), 'fehlende Aufteilung ergibt eine leere Liste');
    gleich([], Admin::gruppen(['email' => 'viel', 7 => ['usd' => 1]], 'kanal'), 'Unbrauchbares wird übergangen');

    $lauf = Admin::laufZahlen(['ok' => true, 'abgerufen' => '3', 'ohne_ki' => 2, 'mit_ki' => 1, 'entwuerfe' => 1, 'fehler' => 0,
        'hinweis' => "pausiert\n" . str_repeat('x', 200), 'dauer_ms' => 812, 'betreff' => 'darf nie nach außen']);
    gleich(['ok', 'abgerufen', 'ohne_ki', 'mit_ki', 'entwuerfe', 'fehler', 'hinweis'], array_keys($lauf), 'lauf.php gibt nur Zähler und ein Hinweiswort zurück');
    gleich(3, $lauf['abgerufen'], 'Zähler sind Zahlen');
    pruefe(mb_strlen($lauf['hinweis']) <= 200 && !str_contains($lauf['hinweis'], "\n"), 'Hinweis ist kurz und einzeilig');
    enthaelt('pausiert x', $lauf['hinweis'], 'Hinweiswörter des Kerns bleiben lesbar');
    gleich(['ok' => false, 'abgerufen' => 0, 'ohne_ki' => 0, 'mit_ki' => 0, 'entwuerfe' => 0, 'fehler' => 0, 'hinweis' => 'Bibliotheken fehlen'],
        Admin::laufOhneErgebnis('Bibliotheken fehlen'), 'ohne Bibliotheken: klare, harmlose Meldung');

    // ── Aktionen ohne Datenbank-Vorarbeit ─────────────────────────────────────
    abschnitt('Admin: Aktionen – Eingaben');

    $a = Admin::fuehreAus(['aktion' => 'alles_loeschen'], 'tester');
    gleich([400, false], [$a['status'], $a['daten']['ok']], 'unbekannte Aktion abgelehnt');
    $a = Admin::fuehreAus([], 'tester');
    gleich(400, $a['status'], 'fehlende Aktion abgelehnt');
    $a = Admin::fuehreAus(['aktion' => ['senden']], 'tester');
    gleich(400, $a['status'], 'Aktion mit falschem Typ abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => 1, 'text' => 'Guten Tag'], 'tester');
    gleich([400, true], [$a['status'], $a['daten']['name_fehlt'] ?? false], 'Senden ohne Namen der Person abgelehnt (Bauplan 7.8)');
    $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => 1, 'text' => 'Guten Tag', 'bearbeiter' => ':::'], 'tester');
    gleich(400, $a['status'], 'ein Name nur aus Sonderzeichen zählt nicht');
    $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => 'x', 'text' => 'Guten Tag', 'bearbeiter' => 'Max'], 'tester');
    gleich(400, $a['status'], 'Senden ohne Entwurfsnummer abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => 1, 'text' => "  \n ", 'bearbeiter' => 'Max'], 'tester');
    gleich(400, $a['status'], 'Senden mit leerem Text abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => 1, 'text' => str_repeat('x', Admin::MAX_TEXT_ZEICHEN + 1), 'bearbeiter' => 'Max'], 'tester');
    gleich(400, $a['status'], 'Senden mit überlangem Text abgelehnt');
    foreach (['verwerfen', 'uebernehmen', 'neu_erzeugen', 'unklar_erledigt'] as $aktion) {
        $a = Admin::fuehreAus(['aktion' => $aktion, 'nachricht_id' => '-5'], 'tester');
        gleich(400, $a['status'], $aktion . ' ohne gültige Nachrichtennummer abgelehnt');
    }
    $a = Admin::fuehreAus(['aktion' => 'pause', 'an' => 'ja'], 'tester');
    gleich(400, $a['status'], 'Pause ohne klares an/aus abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => '@example.org'], 'tester');
    gleich(400, $a['status'], 'Kunde löschen: ganze Domain abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => '%'], 'tester');
    gleich(400, $a['status'], 'Kunde löschen: Platzhalter abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => 'max@example.org', 'art' => 'weiterleiten'], 'tester');
    gleich(400, $a['status'], 'Absenderregel mit unbekannter Art abgelehnt');
    $a = Admin::fuehreAus(['aktion' => 'absender_regel_loeschen', 'id' => 0], 'tester');
    gleich(400, $a['status'], 'Regel löschen ohne Nummer abgelehnt');

    // ── Gegen die Datenbank ───────────────────────────────────────────────────
    abschnitt('Admin: Liste, Einzelansicht, Regeln, Löschen (Datenbank)');

    try {
        $db = Speicher::db();
        $kunde = 'teil-d-kunde@example.org';

        // Fügt eine Zeile ein und füllt jede Spalte, die das Schema kennt – so hängt der Test
        // nicht daran, welche Spalten der Speicher mit Vorgabewert anlegt.
        $einfuegen = static function (string $tabelle, array $werte) use ($db): int {
            $st = $db->prepare('SELECT name, type, pk FROM pragma_table_info(?)');
            $st->execute([$tabelle]);
            $zeile = [];
            foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $spalte) {
                if ((int) $spalte['pk'] === 1) {
                    continue;
                }
                $name = (string) $spalte['name'];
                $zahl = preg_match('/INT|REAL|NUM|FLOA|DOUB/i', (string) $spalte['type']) === 1;
                $zeile[$name] = array_key_exists($name, $werte) ? $werte[$name] : ($zahl ? 0 : '');
            }
            $db->prepare('INSERT INTO ' . $tabelle . ' (' . implode(', ', array_keys($zeile)) . ') VALUES ('
                . implode(', ', array_fill(0, count($zeile), '?')) . ')')->execute(array_values($zeile));
            return (int) $db->lastInsertId();
        };
        $spalte = static function (string $sql, array $werte = []) use ($db): mixed {
            $st = $db->prepare($sql);
            $st->execute($werte);
            return $st->fetchColumn();
        };

        // Weit in der Zukunft eingegangen: steht sicher auf Seite 1, egal was andere Tests einlesen.
        $spaeter = $jetzt + 500000;
        $nachricht = static fn (int $uid, array $mehr): array => $mehr + [
            'kanal' => 'email', 'uidvalidity' => 990004, 'uid' => $uid, 'message_id' => '<teil-d-' . $uid . '@example.org>',
            'thread_schluessel' => '<teil-d-' . $uid . '@example.org>', 'von_adresse' => 'teil-d-kunde@example.org', 'von_name' => 'Max Beispiel',
            'betreff' => 'Frage zur Abmeldung', 'eingang_am' => $spaeter - $uid, 'text_bereinigt' => 'Was kostet die Abmeldung? Nummer [NUMMER]',
            'text_hash' => hash('sha256', 'teil-d-' . $uid), 'zeichen_original' => 41, 'anhaenge' => '[]', 'status' => 'entwurf',
            'erstellt_am' => $jetzt, 'aktualisiert_am' => $jetzt,
        ];

        $idA = $einfuegen('nachricht', $nachricht(1, ['anhaenge' => '[{"art":"bild","bytes":1200},{"art":"bild","bytes":3400}]']));
        $einfuegen('einordnung', ['nachricht_id' => $idA, 'anliegen' => 'preis', 'leistung' => 'abmeldung', 'interessent' => 1, 'dringlich' => 1,
            'stimmung' => 'neutral', 'zusammenfassung' => 'Fragt nach dem Preis der Abmeldung.', 'modell' => 'claude-haiku-5-5', 'erstellt_am' => $jetzt]);
        $entwurfA = $einfuegen('entwurf', ['nachricht_id' => $idA, 'version' => 1, 'text_vorlage' => 'Die Abmeldung kostet {{PREIS:abmeldung}}.',
            'text_final' => 'Die Abmeldung kostet 34,00 €.', 'pruef_status' => 'warnung', 'pruef_hinweise' => '["Bitte den Betrag prüfen"]',
            'modell' => 'claude-haiku-5-5', 'status' => 'offen', 'erstellt_am' => $jetzt]);
        $idB = $einfuegen('nachricht', $nachricht(2, ['von_adresse' => 'teil-d-verteiler@example.org', 'von_name' => 'Verteiler',
            'antwort_an' => 'Teil-D-Kunde@example.org', 'betreff' => 'Rundbrief', 'status' => 'ohne_ki', 'regel_kategorie' => 'newsletter']));
        $idC = $einfuegen('nachricht', $nachricht(3, ['betreff' => 'Wunschkennzeichen', 'status' => 'mensch', 'status_grund' => 'versand_unklar']));
        $einfuegen('entwurf', ['nachricht_id' => $idC, 'version' => 1, 'text_final' => 'Ein Wunschkennzeichen ist möglich.', 'pruef_status' => 'ok',
            'pruef_hinweise' => '[]', 'status' => 'unklar', 'erstellt_am' => $jetzt]);
        $einfuegen('verbrauch', ['zeit' => $jetzt, 'kanal' => 'email', 'zweck' => 'test', 'modell' => 'claude-haiku-5-5', 'nachricht_id' => $idA,
            'request_id' => 'teil-d-test']);

        // Liste
        $liste = Admin::liste('offen', 1);
        $nachId = array_column($liste['eintraege'], null, 'id');
        gleich(['offen', 1], [$liste['filter'], $liste['seite']], 'Liste „Zu erledigen“, Seite 1');
        pruefe(count($liste['eintraege']) <= Admin::SEITENGROESSE, 'höchstens 25 Einträge je Seite');
        pruefe(isset($nachId[$idA]), 'offener Entwurf steht unter „Zu erledigen“');
        pruefe(isset($nachId[$idC]), 'unklarer Versand steht unter „Zu erledigen“');
        pruefe(!isset($nachId[$idB]), 'aussortierte Mail steht nicht unter „Zu erledigen“');
        gleich($idA, $liste['eintraege'][0]['id'] ?? 0, 'neueste Nachricht steht oben');
        $eintrag = $nachId[$idA] ?? [];
        gleich(['id', 'eingang_am', 'von_name', 'von_adresse', 'betreff', 'status', 'status_grund', 'regel_kategorie', 'anliegen',
            'zusammenfassung', 'interessent', 'dringlich', 'uebergabe', 'pruef_status', 'marken'], array_keys($eintrag), 'Felder eines Listeneintrags wie im Bauplan');
        gleich(['Max Beispiel', 'Frage zur Abmeldung', 'preis', true, true, false, 'warnung'],
            [$eintrag['von_name'] ?? '', $eintrag['betreff'] ?? '', $eintrag['anliegen'] ?? '', $eintrag['interessent'] ?? null,
                $eintrag['dringlich'] ?? null, $eintrag['uebergabe'] ?? null, $eintrag['pruef_status'] ?? ''], 'Inhalt des Listeneintrags');
        gleich(['Antwort-Entwurf', 'Preisfrage', 'Neukunde', 'eilt', 'Bitte selbst prüfen'], array_column($eintrag['marken'] ?? [], 'text'), 'Marken des Listeneintrags');
        gleich('Versand unklar', $nachId[$idC]['marken'][0]['text'] ?? '', 'unklarer Versand ist in der Liste markiert');

        $ohneKi = array_column(Admin::liste('ohne_ki', 1)['eintraege'], null, 'id');
        pruefe(isset($ohneKi[$idB]) && !isset($ohneKi[$idA]), 'Filter „Ohne KI aussortiert“ zeigt nur Aussortiertes');
        $alle = array_column(Admin::liste('alle', 1)['eintraege'], 'id');
        pruefe(in_array($idA, $alle, true) && in_array($idB, $alle, true) && in_array($idC, $alle, true), 'Filter „Alle“ zeigt alles');
        $unsinn = Admin::liste("offen' OR 1=1 --", -7);
        gleich(['offen', 1], [$unsinn['filter'], $unsinn['seite']], 'unbekannter Filter und Unsinn-Seite fallen auf den Standard');
        gleich([], Admin::liste('alle', 4000)['eintraege'], 'Seite weit hinter dem Ende ist leer');

        // Einzelansicht
        $d = Admin::nachricht($idA);
        pruefe(is_array($d), 'Einzelansicht geladen');
        $d = is_array($d) ? $d : [];
        gleich('Was kostet die Abmeldung? Nummer [NUMMER]', $d['nachricht']['text_bereinigt'] ?? '', 'gezeigt wird genau der Text, den die KI bekommen hat');
        gleich('Anhänge: 2 Bilder (nicht an die KI gesendet)', $d['nachricht']['anhang_text'] ?? '', 'Hinweis zu den Anhängen');
        gleich('teil-d-kunde@example.org', $d['nachricht']['geht_an'] ?? '', 'Antwort geht an den Absender');
        gleich([$entwurfA, 'Die Abmeldung kostet 34,00 €.', 'offen', 'warnung'],
            [$d['entwurf']['id'] ?? 0, $d['entwurf']['text'] ?? '', $d['entwurf']['status'] ?? '', $d['entwurf']['pruef_status'] ?? ''], 'aktueller Entwurf mit gefülltem Text');
        pruefe(in_array('Bitte den Betrag prüfen', $d['entwurf']['pruef_hinweise'] ?? [], true), 'Prüfhinweise des Entwurfs');
        enthaelt_nicht('{{', $d['entwurf']['text'] ?? '{{', 'im Textfeld steht nie die Vorlage mit Platzhaltern');
        gleich('Preisfrage', $d['einordnung']['anliegen_name'] ?? '', 'Einordnung mit Anliegen in Worten');
        pruefe(is_string($d['vorschau'] ?? null), 'Feld „vorschau“ ist vorhanden');
        gleich(['senden' => true, 'verwerfen' => true, 'uebernehmen' => true, 'neu_erzeugen' => true, 'unklar_erledigt' => false], $d['darf'] ?? [], 'offener Entwurf: alle vier Knöpfe');

        $d = Admin::nachricht($idB) ?? [];
        gleich('teil-d-kunde@example.org', strtolower($d['nachricht']['geht_an'] ?? ''), 'Antwort-Adresse (Reply-To) geht vor');
        gleich([null, null], [$d['entwurf'] ?? null, $d['einordnung'] ?? null], 'aussortierte Mail hat weder Entwurf noch Einordnung');
        gleich(['senden' => false, 'verwerfen' => false, 'uebernehmen' => false, 'neu_erzeugen' => true, 'unklar_erledigt' => false], $d['darf'] ?? [],
            'aussortierte Mail mit Text: nur „Entwurf erzeugen“ (ein Mensch darf die Regelstufe überstimmen)');

        $d = Admin::nachricht($idC) ?? [];
        gleich('rot', $d['hinweis']['farbe'] ?? '', 'Einzelansicht: Versand unklar ist rot');
        enthaelt('Gesendet-Ordner', $d['hinweis']['text'] ?? '', 'Einzelansicht: Aufforderung zum Nachsehen');
        gleich([false, false, true], [$d['darf']['senden'] ?? null, $d['darf']['neu_erzeugen'] ?? null, $d['darf']['unklar_erledigt'] ?? null], 'Versand unklar: kein erneutes Senden, nur „erledigt“');
        gleich(null, Admin::nachricht(2000000000), 'unbekannte Nachricht: null');

        // Unklaren Versand abhaken
        $a = Admin::fuehreAus(['aktion' => 'unklar_erledigt', 'nachricht_id' => $idA, 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], '„erledigt“ wirkt nur bei unklarem Versand');
        gleich('entwurf', $spalte('SELECT status FROM nachricht WHERE id = ?', [$idA]), 'ein offener Entwurf bleibt dabei unberührt');
        $a = Admin::fuehreAus(['aktion' => 'unklar_erledigt', 'nachricht_id' => $idC, 'bearbeiter' => 'Max'], 'tester');
        gleich(true, $a['daten']['ok'], 'unklarer Versand abgehakt');
        gleich('versand_geklaert', $spalte('SELECT status_grund FROM nachricht WHERE id = ?', [$idC]), 'Grund lautet danach „versand_geklaert“');
        gleich('mensch', $spalte('SELECT status FROM nachricht WHERE id = ?', [$idC]), 'der Status bleibt „mensch“');
        pruefe(!in_array($idC, array_column(Admin::liste('offen', 1)['eintraege'], 'id'), true), 'danach nicht mehr unter „Zu erledigen“');
        $a = Admin::fuehreAus(['aktion' => 'unklar_erledigt', 'nachricht_id' => $idC, 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'zweites Abhaken hat keine Wirkung');

        // Einstellungen und Pause
        $vorher = ['limit_tag_usd' => Speicher::einstellung('limit_tag_usd'), 'ki_aktiv' => Speicher::einstellung('ki_aktiv'), 'gruss' => Speicher::einstellung('gruss')];
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'limit_tag_usd', 'wert' => '2,50', 'bearbeiter' => 'Max'], 'tester');
        gleich([200, true, '2.5'], [$a['status'], $a['daten']['ok'], $a['daten']['wert'] ?? ''], 'Tageslimit gespeichert');
        gleich('2.5', Speicher::einstellung('limit_tag_usd'), 'Tageslimit steht im Speicher');
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'limit_tag_usd', 'wert' => '900'], 'tester');
        gleich(400, $a['status'], 'Tageslimit über 200 abgelehnt');
        gleich('2.5', Speicher::einstellung('limit_tag_usd'), 'abgelehnter Wert ändert nichts');
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'sperre_bis', 'wert' => '0'], 'tester');
        gleich(400, $a['status'], 'Sperre lässt sich über „einstellung“ nicht aufheben');
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'ki_aktiv', 'wert' => '1'], 'tester');
        gleich(400, $a['status'], 'Pause-Schalter lässt sich über „einstellung“ nicht umlegen');
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'hinweis_mail', 'wert' => false], 'tester');
        gleich([200, '0'], [$a['status'], Speicher::einstellung('hinweis_mail')], 'Schalter als wahr/falsch wird zu 1/0');
        $a = Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'limit_tag_usd', 'wert' => ['1']], 'tester');
        gleich(400, $a['status'], 'Wert mit falschem Typ abgelehnt');
        Admin::fuehreAus(['aktion' => 'einstellung', 'schluessel' => 'gruss', 'wert' => 'Beste Grüße – nur ein Test', 'bearbeiter' => 'Max'], 'tester');
        gleich('Beste Grüße – nur ein Test', Speicher::einstellung('gruss'), 'Gruß gespeichert');
        gleich(0, (int) $spalte("SELECT COUNT(*) FROM ereignis WHERE art = 'admin_einstellung' AND details LIKE '%nur ein Test%'"), 'freie Texte stehen nicht im Ereignis');

        $a = Admin::fuehreAus(['aktion' => 'pause', 'an' => true, 'bearbeiter' => 'Max'], 'tester');
        gleich([true, '0'], [$a['daten']['ok'], Speicher::einstellung('ki_aktiv')], 'Pause an: ki_aktiv = 0');
        $a = Admin::fuehreAus(['aktion' => 'pause', 'an' => false, 'bearbeiter' => 'Max'], 'tester');
        gleich([true, '1'], [$a['daten']['ok'], Speicher::einstellung('ki_aktiv')], 'Pause aus: ki_aktiv = 1');
        gleich('tester:Max', $spalte("SELECT nutzer FROM ereignis WHERE art = 'admin_pause' ORDER BY id DESC LIMIT 1"), 'Ereignis nennt „<login>:<bearbeiter>“');
        foreach ($vorher as $schluessel => $wert) {
            Speicher::setze($schluessel, $wert, 'test');
        }
        Speicher::setze('hinweis_mail', Speicher::STANDARD['hinweis_mail'], 'test');
        gleich($vorher['ki_aktiv'], Speicher::einstellung('ki_aktiv'), 'Pause-Schalter steht wieder wie vor dem Test');

        // Kopfbereich
        $start = Admin::start('tester');
        pruefe(Admin::csrfGueltig('tester', (string) ($start['csrf'] ?? '')), 'start: liefert ein gültiges CSRF-Token');
        pruefe(in_array($start['zustand']['art'] ?? '', ['aktiv', 'pausiert', 'gesperrt', 'achtung'], true) && ($start['zustand']['text'] ?? '') !== '', 'start: Zustand in einem Satz');
        pruefe(($start['wartend'] ?? 0) >= 1 && ($start['zaehler']['entwurf'] ?? 0) >= 1, 'start: wartende Entwürfe gezählt');
        gleich(['heute_usd', 'monat_usd', 'aufrufe_heute', 'limit_tag_usd', 'limit_monat_usd', 'limit_aufrufe_tag'], array_keys($start['verbrauch'] ?? []), 'start: Verbrauch gegen die Limits');
        pruefe(is_string($start['prompt_version'] ?? null) && $start['prompt_version'] !== '', 'start: Prompt-Version');
        pruefe(json_encode($start) !== false, 'start: als JSON darstellbar');

        $einstellungen = Admin::einstellungen();
        gleich(array_keys(Admin::EINSTELLUNGEN), array_keys($einstellungen['werte'] ?? []), 'einstellungen: genau die änderbaren Schlüssel');

        $verbrauch = Admin::verbrauch();
        gleich([30, 12], [count($verbrauch['je_tag'] ?? []), count($verbrauch['je_monat'] ?? [])], 'verbrauch: 30 Tage und 12 Monate, lückenlos');
        pruefe(preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($verbrauch['je_tag'][29]['name'] ?? '')) === 1, 'verbrauch: Tage als JJJJ-MM-TT, heute zuletzt');
        pruefe(is_string($verbrauch['preise_stand'] ?? null) && $verbrauch['preise_stand'] !== '', 'verbrauch: Stand der Preise genannt');

        // Absenderregeln
        $a = Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => ' Teil-D-Regel@Example.org ', 'art' => 'ignorieren', 'notiz' => "nur\nein Test", 'bearbeiter' => 'Max'], 'tester');
        gleich(true, $a['daten']['ok'], 'Absenderregel angelegt');
        $regelId = (int) $spalte('SELECT id FROM absender_regel WHERE muster = ?', ['teil-d-regel@example.org']);
        pruefe($regelId > 0, 'Regel steht in Kleinschreibung in der Tabelle');
        gleich('nur ein Test', $spalte('SELECT notiz FROM absender_regel WHERE id = ?', [$regelId]), 'Notiz ist einzeilig');
        $a = Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => 'teil-d-regel@example.org', 'art' => 'immer_mensch', 'notiz' => ''], 'tester');
        gleich([1, 'immer_mensch'], [(int) $spalte('SELECT COUNT(*) FROM absender_regel WHERE muster = ?', ['teil-d-regel@example.org']),
            $spalte('SELECT art FROM absender_regel WHERE id = ?', [$regelId])], 'gleiche Adresse noch einmal: Regel wird geändert, nicht verdoppelt');
        pruefe(in_array('teil-d-regel@example.org', array_column(Admin::einstellungen()['regeln'], 'muster'), true), 'Regel erscheint in den Einstellungen');
        gleich(0, (int) $spalte("SELECT COUNT(*) FROM ereignis WHERE details LIKE '%teil-d-regel%'"), 'Ereignis zur Regel nennt die Adresse nicht');
        $a = Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => 'keine adresse', 'art' => 'ignorieren'], 'tester');
        gleich(400, $a['status'], 'Regel ohne gültige Adresse abgelehnt');
        $a = Admin::fuehreAus(['aktion' => 'absender_regel_loeschen', 'id' => $regelId, 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 0], [$a['daten']['ok'], (int) $spalte('SELECT COUNT(*) FROM absender_regel WHERE id = ?', [$regelId])], 'Regel gelöscht');
        $a = Admin::fuehreAus(['aktion' => 'absender_regel_loeschen', 'id' => $regelId], 'tester');
        gleich(false, $a['daten']['ok'], 'Regel ein zweites Mal löschen: gibt es nicht mehr');

        // Daten eines Kunden löschen (Bauplan 7.7)
        $fremde = (int) $spalte('SELECT COUNT(*) FROM nachricht WHERE uidvalidity != 990004');
        $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => 'niemand-teil-d@example.org', 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 0], [$a['daten']['ok'], $a['daten']['geloescht'] ?? -1], 'unbekannte Adresse: nichts zu löschen');
        $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => ' TEIL-D-Kunde@Example.org ', 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 3], [$a['daten']['ok'], $a['daten']['geloescht'] ?? -1], 'drei Nachrichten gelöscht (Absender und Antwort-Adresse)');
        gleich(0, (int) $spalte('SELECT COUNT(*) FROM nachricht WHERE uidvalidity = 990004'), 'Nachrichten sind weg');
        gleich(0, (int) $spalte('SELECT COUNT(*) FROM entwurf WHERE nachricht_id IN (?, ?, ?)', [$idA, $idB, $idC]), 'Entwürfe sind weg');
        gleich(0, (int) $spalte('SELECT COUNT(*) FROM einordnung WHERE nachricht_id IN (?, ?, ?)', [$idA, $idB, $idC]), 'Einordnungen sind weg');
        gleich($fremde, (int) $spalte('SELECT COUNT(*) FROM nachricht'), 'Nachrichten anderer Absender bleiben');
        gleich(1, (int) $spalte("SELECT COUNT(*) FROM verbrauch WHERE request_id = 'teil-d-test'"), 'Verbrauchszeile bleibt erhalten');
        pruefe(in_array($spalte("SELECT nachricht_id FROM verbrauch WHERE request_id = 'teil-d-test'"), [null, 0, '0'], true), 'Verbrauchszeile hat keinen Bezug mehr zur Nachricht');
        gleich(0, (int) $spalte('SELECT COUNT(*) FROM ereignis WHERE nachricht_id IN (?, ?, ?)', [$idA, $idB, $idC]), 'Ereignisse haben keinen Bezug mehr zur Nachricht');
        $details = (string) $spalte("SELECT details FROM ereignis WHERE art = 'kunde_geloescht' ORDER BY id DESC LIMIT 1");
        enthaelt('"nachrichten":3', $details, 'Ereignis nennt die Anzahl');
        enthaelt_nicht('example.org', $details, 'Ereignis nennt die Adresse nicht');
        gleich(0, (int) $spalte("SELECT COUNT(*) FROM ereignis WHERE lower(details) LIKE '%teil-d-kunde%' OR lower(nutzer) LIKE '%teil-d-kunde%'"), 'die Adresse steht in keinem Ereignis');
        gleich(null, Admin::nachricht($idA), 'gelöschte Nachricht ist nicht mehr abrufbar');
        gleich(['ok' => false, 'fehler' => 'Diese Nachricht gibt es nicht mehr.'], Admin::vorschau($idA, 'Text'), 'Vorschau für gelöschte Nachricht: klare Meldung');

        $db->prepare("DELETE FROM verbrauch WHERE request_id = 'teil-d-test'")->execute();

        // ── Weitere Stände: wartend, Formular, abgebrochener Versand, im Mailprogramm beantwortet ──
        abschnitt('Admin: Knöpfe je Stand, abgebrochener Versand, Sperre');

        $zwei = static fn (int $uid, array $mehr): array => $nachricht($uid, $mehr + [
            'uidvalidity' => 990005, 'von_adresse' => 'teil-d-zwei@example.org', 'von_name' => 'Erika Beispiel',
            'message_id' => '<teil-d-zwei-' . $uid . '@example.org>', 'thread_schluessel' => '<teil-d-zwei-' . $uid . '@example.org>',
        ]);
        $idWartet = $einfuegen('nachricht', $zwei(11, ['status' => 'wartet_ki', 'status_grund' => 'pausiert']));
        $idFormular = $einfuegen('nachricht', $zwei(12, ['status' => 'ohne_ki', 'regel_kategorie' => 'formular', 'text_bereinigt' => '']));
        $idAbbruch = $einfuegen('nachricht', $zwei(13, ['status' => 'entwurf', 'in_arbeit_bis' => $jetzt - 30]));
        $entwurfAbbruch = $einfuegen('entwurf', ['nachricht_id' => $idAbbruch, 'version' => 1, 'text_final' => 'Gern helfen wir weiter.',
            'pruef_status' => 'ok', 'pruef_hinweise' => '[]', 'status' => 'sendet', 'gesendet_message_id' => '<x@kfz-zulassungsprofis.de>', 'erstellt_am' => $jetzt]);
        $idImVersand = $einfuegen('nachricht', $zwei(14, ['status' => 'entwurf', 'in_arbeit_bis' => $jetzt + 90]));
        $einfuegen('entwurf', ['nachricht_id' => $idImVersand, 'version' => 1, 'text_final' => 'Gern helfen wir weiter.',
            'pruef_status' => 'ok', 'pruef_hinweise' => '[]', 'status' => 'sendet', 'erstellt_am' => $jetzt]);
        $idBeantwortet = $einfuegen('nachricht', $zwei(15, ['status' => 'mensch', 'status_grund' => 'beantwortet']));
        $idZuAlt = $einfuegen('nachricht', $zwei(16, ['status' => 'mensch', 'status_grund' => 'zu_alt', 'eingang_am' => $jetzt - 2 * 86400]));
        $idUralt = $einfuegen('nachricht', $zwei(17, ['status' => 'mensch', 'status_grund' => 'zu_alt', 'eingang_am' => $jetzt - 8 * 86400, 'aktualisiert_am' => $jetzt - 8 * 86400]));

        $darf = static fn (int $id): array => (Admin::nachricht($id) ?? [])['darf'] ?? [];
        gleich(['senden' => false, 'verwerfen' => true, 'uebernehmen' => true, 'neu_erzeugen' => true, 'unklar_erledigt' => false], $darf($idWartet),
            'wartende Mail: verwerfen (keine Antwort nötig), selbst antworten, sofort erzeugen');
        gleich(['senden' => false, 'verwerfen' => false, 'uebernehmen' => false, 'neu_erzeugen' => false, 'unklar_erledigt' => false], $darf($idFormular),
            'Formular-Auftrag: keine Knöpfe (kein Text gespeichert, kein Entwurf)');
        enthaelt('Formular', (Admin::nachricht($idFormular) ?? [])['nachricht']['text_hinweis'] ?? '', 'Formular-Auftrag: Hinweis, warum kein Text da ist');
        gleich(['senden' => false, 'verwerfen' => false, 'uebernehmen' => false, 'neu_erzeugen' => false, 'unklar_erledigt' => true], $darf($idAbbruch),
            'abgebrochener Versand: nur „nachgesehen – erledigt“, nie erneut senden');
        gleich(['senden' => false, 'verwerfen' => false, 'uebernehmen' => false, 'neu_erzeugen' => false, 'unklar_erledigt' => false], $darf($idImVersand),
            'laufender Versand: gar keine Knöpfe');
        gleich(true, $darf($idBeantwortet)['neu_erzeugen'] ?? null, 'im Mailprogramm beantwortet: Entwurf ließe sich noch erzeugen (Kern erlaubt es)');
        gleich(true, $darf($idZuAlt)['neu_erzeugen'] ?? null, 'zu alt: ein Mensch darf trotzdem einen Entwurf anstoßen');
        gleich([true, true], [$darf($idZuAlt)['uebernehmen'] ?? null, $darf($idZuAlt)['verwerfen'] ?? null], 'zu alt: „Ich antworte selbst“ und „Keine Antwort nötig“ schließen ab (B3)');
        gleich('rot', (Admin::nachricht($idAbbruch) ?? [])['hinweis']['farbe'] ?? '', 'abgebrochener Versand: roter Hinweis');
        gleich('gelb', (Admin::nachricht($idImVersand) ?? [])['hinweis']['farbe'] ?? '', 'laufender Versand: gelber Hinweis „bitte warten“');

        $offenIds = array_column(Admin::liste('offen', 1)['eintraege'], null, 'id');
        gleich('Versand unklar', $offenIds[$idAbbruch]['marken'][0]['text'] ?? '', 'Liste: abgebrochener Versand ist „Versand unklar“');
        gleich('Wird gesendet', $offenIds[$idImVersand]['marken'][0]['text'] ?? '', 'Liste: laufender Versand ist „Wird gesendet“');
        pruefe(isset($offenIds[$idWartet]) && !isset($offenIds[$idBeantwortet]), 'Liste: Wartendes zu erledigen, Beantwortetes nicht');
        pruefe(isset($offenIds[$idZuAlt]) && !isset($offenIds[$idUralt]), 'Liste: zu Altes bleibt eine Woche unter „Zu erledigen“, danach nur unter „Alle“ (B3)');
        gleich('Zu alt für die KI – selbst antworten', $offenIds[$idZuAlt]['marken'][0]['text'] ?? '', 'Liste: zu Altes mit gelber Marke');
        $unklarVorher = (int) (Admin::start('tester')['versand_unklar'] ?? 0);
        pruefe($unklarVorher >= 1, 'start: abgebrochener Versand zählt als unklar');

        // Unklar abhaken: Der Entwurf wird „unklar“ (nie wieder „offen“), die Nachricht geht an den Menschen.
        $a = Admin::fuehreAus(['aktion' => 'unklar_erledigt', 'nachricht_id' => $idImVersand, 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'laufender Versand lässt sich nicht abhaken');
        $a = Admin::fuehreAus(['aktion' => 'unklar_erledigt', 'nachricht_id' => $idAbbruch, 'bearbeiter' => 'Max'], 'tester');
        gleich(true, $a['daten']['ok'], 'abgebrochener Versand abgehakt');
        gleich(['mensch', 'versand_geklaert', 'unklar'], [
            $spalte('SELECT status FROM nachricht WHERE id = ?', [$idAbbruch]),
            $spalte('SELECT status_grund FROM nachricht WHERE id = ?', [$idAbbruch]),
            $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfAbbruch]),
        ], 'danach: Nachricht beim Menschen, Entwurf „unklar“');
        gleich(0, (int) $spalte('SELECT in_arbeit_bis FROM nachricht WHERE id = ?', [$idAbbruch]), 'die Belegung ist wieder frei');
        gleich($unklarVorher - 1, (int) (Admin::start('tester')['versand_unklar'] ?? 0), 'start: einer weniger unklar');
        gleich('Versand geklärt', (Admin::nachricht($idAbbruch) ?? [])['marken'][0]['text'] ?? '', 'Einzelansicht: „Versand geklärt“');
        gleich(false, $darf($idAbbruch)['neu_erzeugen'] ?? null, 'nach dem Abhaken kein neuer Entwurf (sonst droht eine doppelte Antwort)');

        // Verwerfen ohne Entwurf und „Entwurf erzeugen“ in der Pause – beides über den Kern.
        $kiVorher = Speicher::einstellung('ki_aktiv');
        Speicher::setze('ki_aktiv', '0', 'test');
        $a = Admin::fuehreAus(['aktion' => 'neu_erzeugen', 'nachricht_id' => $idWartet, 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'Entwurf erzeugen in der Pause: kein Aufruf');
        pruefe(($a['daten']['fehler'] ?? '') !== '', 'Entwurf erzeugen in der Pause: Grund in einem Satz');
        gleich('wartet_ki', $spalte('SELECT status FROM nachricht WHERE id = ?', [$idWartet]), 'die Mail wartet weiter');
        Speicher::setze('ki_aktiv', $kiVorher, 'test');
        $a = Admin::fuehreAus(['aktion' => 'verwerfen', 'nachricht_id' => $idWartet, 'grund' => 'keine_antwort', 'bearbeiter' => 'Max'], 'tester');
        gleich(true, $a['daten']['ok'], 'wartende Mail ohne Entwurf verworfen');
        gleich('verworfen', $spalte('SELECT status FROM nachricht WHERE id = ?', [$idWartet]), 'Status „verworfen“');
        enthaelt('keine_antwort', (string) $spalte("SELECT details FROM ereignis WHERE art = 'admin_verwerfen' ORDER BY id DESC LIMIT 1"), 'Ereignis nennt den Grund');
        $a = Admin::fuehreAus(['aktion' => 'verwerfen', 'nachricht_id' => $idWartet, 'grund' => 'erfunden', 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'zweites Verwerfen hat keine Wirkung');
        $a = Admin::fuehreAus(['aktion' => 'uebernehmen', 'nachricht_id' => $idWartet, 'bearbeiter' => 'Max'], 'tester');
        gleich([false, 'verworfen'], [$a['daten']['ok'], $spalte('SELECT status FROM nachricht WHERE id = ?', [$idWartet])], 'Verworfenes lässt sich nicht mehr übernehmen');
        $a = Admin::fuehreAus(['aktion' => 'uebernehmen', 'nachricht_id' => $idZuAlt, 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'schon beim Menschen: „Ich antworte selbst“ meldet keinen Erfolg');

        // Sperre nach einem Anbieterfehler vorzeitig aufheben.
        $sperreVorher = [Speicher::einstellung('sperre_bis'), Speicher::einstellung('sperre_grund')];
        \KZP\Assistent\Budget::sperre('API-Schlüssel abgelehnt (Test)', $jetzt + 3600);
        $start = Admin::start('tester');
        gleich([true, $jetzt + 3600, 'API-Schlüssel abgelehnt (Test)'], [$start['sperre']['aktiv'] ?? null, $start['sperre']['bis'] ?? 0, $start['sperre']['grund'] ?? ''],
            'start: Sperre mit Ende und Grund');
        $a = Admin::fuehreAus(['aktion' => 'sperre_aufheben', 'bearbeiter' => 'Max'], 'tester');
        gleich([200, true], [$a['status'], $a['daten']['ok']], 'Sperre aufgehoben');
        gleich(false, Admin::start('tester')['sperre']['aktiv'] ?? null, 'danach keine Sperre mehr');
        gleich('tester:Max', $spalte("SELECT nutzer FROM ereignis WHERE art = 'admin_sperre_aufgehoben' ORDER BY id DESC LIMIT 1"), 'Ereignis nennt, wer aufgehoben hat');
        $a = Admin::fuehreAus(['aktion' => 'sperre_aufheben', 'bearbeiter' => 'Max'], 'tester');
        gleich(false, $a['daten']['ok'], 'ohne Sperre gibt es nichts aufzuheben');
        Speicher::setze('sperre_bis', $sperreVorher[0], 'test');
        Speicher::setze('sperre_grund', $sperreVorher[1], 'test');

        // Kopfbereich nutzt dieselben Zahlen wie Budget::darfAufrufen.
        $start = Admin::start('tester');
        $budget = \KZP\Assistent\Budget::stand();
        gleich([(float) $budget['limits']['limit_tag_usd'], (float) $budget['limits']['limit_monat_usd'], (int) $budget['limits']['limit_aufrufe_tag']],
            [$start['verbrauch']['limit_tag_usd'], $start['verbrauch']['limit_monat_usd'], $start['verbrauch']['limit_aufrufe_tag']], 'start: Limits wie Budget::stand()');
        gleich(array_keys(Admin::VERWERF_GRUENDE), array_column($start['verwerf_gruende'] ?? [], 'schluessel'), 'start: Gründe zum Verwerfen für die Oberfläche');
        gleich(['aktiv', 'bis', 'grund'], array_keys($start['sperre'] ?? []), 'start: Sperre als aktiv/bis/grund');

        $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => 'teil-d-zwei@example.org', 'bearbeiter' => 'Max'], 'tester');
        gleich([false, 0], [$a['daten']['ok'], $a['daten']['geloescht'] ?? -1], 'Kunde löschen wartet, solange für die Adresse etwas verarbeitet wird');
        pruefe((int) $spalte('SELECT COUNT(*) FROM nachricht WHERE uidvalidity = 990005') === 7, 'dabei wurde nichts gelöscht');
        \KZP\Assistent\Speicher::gibFrei($idImVersand);
        $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => 'teil-d-zwei@example.org', 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 7], [$a['daten']['ok'], $a['daten']['geloescht'] ?? -1], 'Testdaten des Abschnitts gelöscht');

        // ── Senden über den Kern ───────────────────────────────────────────────
        abschnitt('Admin: Senden über den Kern (Datei-Postfach, Datei-Versand)');

        // Eigene Kopie des Test-Postfachs: Der Kern legt Gesendetes dort ab, das Repository bleibt sauber.
        $postfachVorher = getenv('KZP_ASSISTENT_POSTFACH');
        $repoPostfach = static fn (): array => [is_dir(__DIR__ . '/mails/gesendet') ? count(glob(__DIR__ . '/mails/gesendet/*') ?: []) : -1,
            is_file(__DIR__ . '/mails/.zustand.json') ? (string) md5_file(__DIR__ . '/mails/.zustand.json') : ''];
        $repoVorher = $repoPostfach();
        $kopie = Umgebung::datenOrdner() . '/teil-d-postfach';
        @mkdir($kopie, 0700, true);
        foreach (glob(__DIR__ . '/mails/*.eml') ?: [] as $eml) {
            copy($eml, $kopie . '/' . basename($eml));
        }
        putenv('KZP_ASSISTENT_POSTFACH=datei:' . $kopie);
        $ausgang = Umgebung::datenOrdner() . '/ausgang';
        $zaehleAusgang = static fn (): int => count(glob($ausgang . '/*.eml') ?: []);
        try {
            $wissen = \KZP\Assistent\Wissen::laden() ?? [];
            // So steht der Stand an einem frisch erzeugten Entwurf (auch nach Ablauf der Aktion).
            $hash = \KZP\Assistent\Wissen::vergleichsStand($wissen);
            $drei = static fn (int $uid, array $mehr): array => $nachricht($uid, $mehr + [
                'uidvalidity' => 990006, 'von_adresse' => 'teil-d-senden@example.org', 'von_name' => 'Max Beispiel',
                'message_id' => '<teil-d-senden-' . $uid . '@example.org>', 'thread_schluessel' => '<teil-d-senden-' . $uid . '@example.org>',
                'betreff' => 'Frage zur Ummeldung', 'status' => 'entwurf',
            ]);
            $neuerEntwurf = static fn (int $nachrichtId, string $text, array $mehr = []): int => $einfuegen('entwurf', $mehr + [
                'nachricht_id' => $nachrichtId, 'version' => 1, 'text_vorlage' => $text, 'text_final' => $text, 'pruef_status' => 'ok',
                'pruef_hinweise' => '[]', 'modell' => 'claude-haiku-5-5', 'status' => 'offen', 'wissen_hash' => $hash, 'erstellt_am' => $jetzt,
            ]);

            // 1. Der Prüfer hat Hinweise: erst nach ausdrücklicher Bestätigung senden.
            $idS = $einfuegen('nachricht', $drei(21, []));
            $einfuegen('einordnung', ['nachricht_id' => $idS, 'anliegen' => 'ummeldung', 'leistung' => 'ummeldung', 'stimmung' => 'neutral', 'erstellt_am' => $jetzt]);
            $text = 'Die Ummeldung klappt garantiert.';
            $entwurfS = $neuerEntwurf($idS, $text, ['pruef_status' => 'warnung', 'pruef_hinweise' => '["Klingt nach einer Zusage"]']);
            $vorher = $zaehleAusgang();
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfS, 'text' => $text, 'trotz_warnung' => false, 'bearbeiter' => 'Max'], 'tester');
            gleich([false, true, false], [$a['daten']['ok'], $a['daten']['bestaetigen'] ?? null, $a['daten']['neu_gefuellt'] ?? null], 'Hinweise des Prüfers: Bestätigung verlangt');
            pruefe(($a['daten']['warnungen'] ?? []) !== [], 'die Hinweise kommen mit');
            gleich([$vorher, 'offen'], [$zaehleAusgang(), $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfS])], 'ohne Bestätigung geht nichts raus');
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfS, 'text' => $text, 'trotz_warnung' => 'ja', 'bearbeiter' => 'Max'], 'tester');
            gleich([false, $vorher], [$a['daten']['ok'], $zaehleAusgang()], '„trotz_warnung“ gilt nur als echtes true');
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfS, 'text' => $text, 'trotz_warnung' => true, 'bearbeiter' => 'Max'], 'tester');
            gleich(true, $a['daten']['ok'], 'mit Bestätigung gesendet');
            gleich($vorher + 1, $zaehleAusgang(), 'genau eine Mail im Ausgang');
            gleich(['gesendet', 'gesendet', 'tester:Max'], [
                $spalte('SELECT status FROM nachricht WHERE id = ?', [$idS]),
                $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfS]),
                $spalte('SELECT freigegeben_von FROM entwurf WHERE id = ?', [$entwurfS]),
            ], 'Nachricht und Entwurf „gesendet“, freigegeben von „<login>:<bearbeiter>“');
            $d = Admin::nachricht($idS) ?? [];
            gleich(['gruen', false], [$d['hinweis']['farbe'] ?? '', $d['darf']['senden'] ?? null], 'Einzelansicht: gesendet, kein zweites Senden');
            enthaelt('von Max', $d['hinweis']['text'] ?? '', 'Einzelansicht nennt, wer gesendet hat');
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfS, 'text' => $text, 'trotz_warnung' => true, 'bearbeiter' => 'Max'], 'tester');
            gleich([false, false, $vorher + 1], [$a['daten']['ok'], $a['daten']['bestaetigen'] ?? null, $zaehleAusgang()], 'zweites Senden: nichts geht doppelt raus');

            // 2. Versand unklar (Verbindung nach DATA abgebrochen): nie von selbst erneut senden.
            $idU = $einfuegen('nachricht', $drei(22, []));
            $entwurfU = $neuerEntwurf($idU, 'Gern helfen wir Ihnen weiter.');
            \KZP\Assistent\Kern::$sendeErsatz = static function (array $smtp, string $an, string $roh, string &$antwort): string {
                $antwort = '';
                return 'unklar';
            };
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfU, 'text' => 'Gern helfen wir Ihnen weiter.', 'trotz_warnung' => true, 'bearbeiter' => 'Max'], 'tester');
            gleich([false, false], [$a['daten']['ok'], $a['daten']['bestaetigen'] ?? null], 'Versand unklar: nicht ok, keine Bestätigung');
            enthaelt('Gesendet-Ordner', $a['daten']['fehler'] ?? '', 'Versand unklar: Aufforderung zum Nachsehen');
            gleich(['mensch', 'versand_unklar', 'unklar'], [
                $spalte('SELECT status FROM nachricht WHERE id = ?', [$idU]),
                $spalte('SELECT status_grund FROM nachricht WHERE id = ?', [$idU]),
                $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfU]),
            ], 'Versand unklar: Nachricht beim Menschen, Entwurf „unklar“ (Bauplan 7.3)');
            $d = Admin::nachricht($idU) ?? [];
            gleich(['rot', false, true], [$d['hinweis']['farbe'] ?? '', $d['darf']['senden'] ?? null, $d['darf']['unklar_erledigt'] ?? null], 'Einzelansicht: rot, kein Senden, nur abhaken');

            // 3. Eindeutig abgelehnt: Entwurf wieder offen, nichts gesendet.
            $idX = $einfuegen('nachricht', $drei(23, []));
            $entwurfX = $neuerEntwurf($idX, 'Gern helfen wir Ihnen weiter.');
            \KZP\Assistent\Kern::$sendeErsatz = static function (array $smtp, string $an, string $roh, string &$antwort): string {
                $antwort = '550 Empfänger unbekannt';
                return 'abgelehnt';
            };
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfX, 'text' => 'Gern helfen wir Ihnen weiter.', 'trotz_warnung' => true, 'bearbeiter' => 'Max'], 'tester');
            gleich([false, false], [$a['daten']['ok'], $a['daten']['bestaetigen'] ?? null], 'abgelehnt: nicht ok');
            gleich(['entwurf', 'offen'], [$spalte('SELECT status FROM nachricht WHERE id = ?', [$idX]), $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfX])],
                'abgelehnt: Entwurf wieder offen, erneutes Senden möglich');
            gleich(true, (Admin::nachricht($idX) ?? [])['darf']['senden'] ?? null, 'abgelehnt: Senden-Knopf wieder da');
            \KZP\Assistent\Kern::$sendeErsatz = null;

            // 4. Preise der Website haben sich seit dem Entwurf geändert: neu gefüllt, erst lesen.
            $idP = $einfuegen('nachricht', $drei(24, ['betreff' => 'Was kostet die Abmeldung?']));
            $einfuegen('einordnung', ['nachricht_id' => $idP, 'anliegen' => 'preis', 'leistung' => 'abmeldung', 'stimmung' => 'neutral', 'erstellt_am' => $jetzt]);
            $alt = 'Die Abmeldung kostet 1,00 €.';
            $entwurfP = $neuerEntwurf($idP, $alt, ['text_vorlage' => 'Die Abmeldung kostet {{PREIS:abmeldung}}.', 'wissen_hash' => 'veraltet']);
            $vorher = $zaehleAusgang();
            $a = Admin::fuehreAus(['aktion' => 'senden', 'entwurf_id' => $entwurfP, 'text' => $alt, 'trotz_warnung' => false, 'bearbeiter' => 'Max'], 'tester');
            gleich([false, true, false], [$a['daten']['ok'], $a['daten']['neu_gefuellt'] ?? null, $a['daten']['bestaetigen'] ?? null], 'neue Preise: Entwurf neu gefüllt, kein „trotzdem senden“');
            $neu = (string) $spalte('SELECT text_final FROM entwurf WHERE id = ?', [$entwurfP]);
            pruefe($neu !== $alt && str_contains($neu, (string) ($wissen['platzhalter']['PREIS:abmeldung'] ?? '?')), 'der Entwurf trägt jetzt den Preis der Website');
            gleich([$vorher, 'offen'], [$zaehleAusgang(), $spalte('SELECT status FROM entwurf WHERE id = ?', [$entwurfP])], 'neue Preise: nichts gesendet, Entwurf offen');
            gleich($neu, (Admin::nachricht($idP) ?? [])['entwurf']['text'] ?? '', 'Einzelansicht zeigt den neu gefüllten Text');
        } finally {
            \KZP\Assistent\Kern::$sendeErsatz = null;
            putenv($postfachVorher === false ? 'KZP_ASSISTENT_POSTFACH' : 'KZP_ASSISTENT_POSTFACH=' . $postfachVorher);
        }
        gleich($postfachVorher, getenv('KZP_ASSISTENT_POSTFACH'), 'Postfach der anderen Tests wiederhergestellt');
        gleich($repoVorher, $repoPostfach(), 'das Test-Postfach im Repository blieb unberührt');
        $a = Admin::fuehreAus(['aktion' => 'kunde_loeschen', 'adresse' => 'teil-d-senden@example.org', 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 4], [$a['daten']['ok'], $a['daten']['geloescht'] ?? -1], 'Testdaten des Abschnitts gelöscht');
    } catch (Throwable $e) {
        pruefe(false, 'Datenbank-Teil ist abgebrochen: ' . get_class($e) . ' – ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')');
    }
})();
