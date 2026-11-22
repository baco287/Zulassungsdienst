<?php
/**
 * Tests Teil E – Behebungen nach der Gegenprüfung (Sicherheit, Betrieb, Kosten, Datenschutz und
 * die Festlegungen F1 bis F7). Jede Prüfung nennt den Befund in Klammern.
 *
 * Wird von regeln-test.php eingebunden. Kostenlos: kein Netz außer einer Verbindung zu einem
 * geschlossenen Anschluss auf 127.0.0.1, kein echter Claude-Aufruf (Claude::$ersatz). Gearbeitet
 * wird in eigenen Unterordnern des Test-Datenordners mit einem eigenen Datei-Postfach, mit fester
 * Uhr; am Ende sind Uhr, Ordner, Wissensbasis, Postfach und Ersatz-Funktionen wiederhergestellt.
 */

declare(strict_types=1);

use KZP\Assistent\Admin;
use KZP\Assistent\Budget;
use KZP\Assistent\Claude;
use KZP\Assistent\Kern;
use KZP\Assistent\MailLeser;
use KZP\Assistent\Prompt;
use KZP\Assistent\Pruefer;
use KZP\Assistent\Regeln;
use KZP\Assistent\Speicher;
use KZP\Assistent\Text;
use KZP\Assistent\Umgebung;
use KZP\Assistent\Versand;
use KZP\Assistent\Wissen;

(static function (): void {
    $basis = rtrim((string) getenv('KZP_ASSISTENT_DIR'), '/');
    abschnitt('E · Vorbereitung');
    $wissen = Wissen::laden();
    pruefe($basis !== '' && is_dir($basis) && $wissen !== null && Umgebung::$bibliotheken, 'Datenordner, Test-Wissensbasis und Bibliotheken vorhanden');
    if ($basis === '' || !is_dir($basis) || $wissen === null || !Umgebung::$bibliotheken) {
        return;
    }

    $namen = ['KZP_ASSISTENT_DIR', 'KZP_ASSISTENT_JETZT', 'KZP_ASSISTENT_POSTFACH', 'KZP_ASSISTENT_WISSEN', 'KZP_ASSISTENT_VERSAND',
        'KZP_ASSISTENT_STAND', 'KZP_ASSISTENT_MANIFEST'];
    $vorher = [];
    foreach ($namen as $name) {
        $vorher[$name] = getenv($name);
    }
    $ersatzVorher = Claude::$ersatz;
    $sendeVorher = Kern::$sendeErsatz;

    $berlin = new DateTimeZone('Europe/Berlin');
    $zeit = static fn (string $wann): int => (new DateTimeImmutable($wann, $berlin))->getTimestamp();
    $uhr = static function (?int $t): void {
        putenv($t === null ? 'KZP_ASSISTENT_JETZT' : 'KZP_ASSISTENT_JETZT=' . $t);
    };
    $hinweisMit = static function (array $hinweise, string $teil): bool {
        foreach ($hinweise as $h) {
            if (str_contains((string) $h, $teil)) {
                return true;
            }
        }
        return false;
    };
    $neutral = ['anliegen' => 'allgemein', 'leistung' => 'keine', 'uebergabe' => false, 'stimmung' => 'neutral', 'manipulation' => false];
    $platzhalter = $wissen['platzhalter'];
    $aktionsSlugs = Wissen::aktionsLeistungen($wissen);
    $aktionsSlug = '';
    foreach ($aktionsSlugs as $s) {
        if (isset($platzhalter['PREIS:' . $s])) {
            $aktionsSlug = $s;
            break;
        }
    }

    try {
        // ==================================================================================
        abschnitt('E · Prüfer: fremde Links, Kontonummern, Telefonnummern (Sicherheit S2)');
        // ==================================================================================
        $uhr($zeit('2026-12-01 12:00:00'));
        $fremd = static fn (string $text): bool => $hinweisMit(Pruefer::pruefe($text, $neutral, $wissen)['hinweise'], 'gehört nicht zu den Links');
        foreach (['ZAHL-PORTAL.DE/kasse', 'zahl-portal.De/kasse', 'unter:-zahl-portal.de/kasse', 'ZAHL-PORTAL.TOP/kasse', 'Angreifer-Zahlung.De',
            'Bitte zahlen Sie auf angreifer-zahlung.de/kasse.', 'siehe/zahl-portal.de'] as $text) {
            pruefe($fremd('Bitte nutzen Sie ' . $text), 'Fremde Adresse erkannt: „' . $text . '“');
        }
        foreach (['Die Ummeldung ist erledigt.Danach melden wir uns.', 'Das kostet nichts extra.Bitte melden Sie sich.', 'Die Unterlagen liegen als Scan.PDF vor.'] as $text) {
            pruefe(!$fremd($text), 'Kein Fehlalarm bei fehlendem Leerzeichen nach dem Satzpunkt: „' . $text . '“');
        }
        $v = Pruefer::pruefeVorlage('Vielen Dank. Mehr steht auf beispiel.Seite und unter info.Zahlung', $neutral, $wissen);
        pruefe($hinweisMit($v['hinweise'], 'sieht aus wie eine Internetadresse'), 'Vorlage des Modells: jedes „wort.wort“ ist eine Warnung');
        gleich('ok', Pruefer::pruefeVorlage('Vielen Dank für Ihre Nachricht. Das kostet {{PREIS:' . ($aktionsSlug ?: 'abmeldung') . '}}.', $neutral, $wissen)['status'],
            'Vorlage ohne „wort.wort“: kein Hinweis');
        $p = Pruefer::pruefe('Bitte überweisen Sie auf das Konto DE89 3704 0044 0532 0130 00.', $neutral, $wissen);
        pruefe($hinweisMit($p['hinweise'], 'IBAN'), 'Fremde IBAN (mod 97 gültig) → Warnung');
        $p = Pruefer::pruefe('Konto D E 8 9 - 3 7 0 4 - 0 0 4 4 - 0 5 3 2 - 0 1 3 0 - 0 0', $neutral, $wissen);
        pruefe($hinweisMit($p['hinweise'], 'IBAN'), 'IBAN mit Leerzeichen und Bindestrichen → Warnung');
        gleich([], Pruefer::ibans('Bitte melden Sie sich bis KW 47 2026 bei uns.'), 'Keine IBAN in gewöhnlichem Text');
        $p = Pruefer::pruefe('Rückfragen gern unter 0151 23456789.', $neutral, $wissen);
        pruefe($hinweisMit($p['hinweise'], 'Telefonnummer'), 'Fremde Telefonnummer → Warnung');
        $p = Pruefer::pruefe('Sie erreichen uns unter ' . $wissen['firma']['telefon'] . '.', $neutral, $wissen);
        pruefe(!$hinweisMit($p['hinweise'], 'Telefonnummer'), 'Eigene Telefonnummer ist kein Fund');
        $p = Pruefer::pruefe('Sie erreichen uns Mo–Fr 8:00–18:00 Uhr, am 01.02.2027 ist geschlossen, PLZ 10115.', $neutral, $wissen);
        pruefe(!$hinweisMit($p['hinweise'], 'Telefonnummer'), 'Zeiten, Datum und Postleitzahl sind keine Telefonnummern');
        enthaelt_nicht('überweisen', implode(' ', Pruefer::pruefe('Sie zahlen bequem per Überweisung nach Rechnung.', $neutral, $wissen)['hinweise']),
            'Zahlwörter wie „Überweisung“ lösen keine Warnung aus');

        // ==================================================================================
        abschnitt('E · Prüfer: keine Annahme zum Geschlecht (Datenschutz S7, F3)');
        // ==================================================================================
        $p = Pruefer::pruefe('Wir schreiben das Fahrzeug auf Sie als neue Halterin um.', $neutral, $wissen);
        pruefe($hinweisMit($p['hinweise'], 'Geschlecht'), '„als neue Halterin“ → Warnung');
        $p = Pruefer::pruefe('Der Antrag geht auf die neue Halterin oder den neuen Halter.', $neutral, $wissen);
        pruefe(!$hinweisMit($p['hinweise'], 'Geschlecht'), 'Doppelform „Halterin oder … Halter“ ist neutral');
        $p = Pruefer::pruefe('Der Halter oder die Halterin unterschreibt.', $neutral, $wissen);
        pruefe(!$hinweisMit($p['hinweise'], 'Geschlecht'), 'Doppelform „Halter oder die Halterin“ ist neutral');
        enthaelt('nie auf Geschlecht oder Herkunft', Prompt::system($wissen), 'Systemtext: keine Schlüsse aus dem Namen');
        pruefe(Prompt::VERSION !== '2026-11-22.5', 'Prompt-Version hochgezählt');

        // ==================================================================================
        abschnitt('E · Text: Grußformel und Signatur (F5, Datenschutz S2)');
        // ==================================================================================
        $anliegen = "Guten Tag,\nich habe mein Auto verkauft und möchte es abmelden lassen. Was kostet die Abmeldung bei Ihnen, und welche Unterlagen brauchen Sie dafür von mir?";
        gleich($anliegen, Text::ohneGruss($anliegen . "\n\nViele Grüße\nErika Mustermann\nMusterstraße 12, 10115 Berlin\nTel. 0170 1234567\nerika@example.org"),
            'Grußformel mit Name, Anschrift, Telefon und Mail fällt weg');
        gleich("Hello,\nhow much is a registration?", Text::ohneGruss("Hello,\nhow much is a registration?\n\nBest regards,\nJohn Sample"), 'Englische Grußformel');
        gleich("Was kostet das?", Text::ohneGruss("Was kostet das?\nLG Erika"), 'Kurzform „LG Name“ in einer Zeile');
        $ps = "Was kostet die Ummeldung?\n\nViele Grüße\nErika\nPS: Kann ich die Unterlagen auch als PDF schicken?";
        gleich($ps, Text::ohneGruss($ps), 'Ein PS unter dem Gruß: nichts entfernt (der Kunde fragt noch etwas)');
        $kurz = "Danke!\nViele Grüße\nErika Mustermann";
        gleich($kurz, Text::ohneGruss($kurz), 'Bliebe weniger als 15 Zeichen übrig: nichts entfernt');
        $haelfte = "Hallo,\nViele Grüße\nErika Mustermann\nMusterstraße 12\n10115 Berlin\nTelefon 0170 1234567";
        gleich($haelfte, Text::ohneGruss($haelfte), 'Nie mehr als die Hälfte des Textes entfernen');
        $mitte = "Viele Grüße an Ihr Team, Sie haben mir sehr geholfen.\nIch habe noch eine Frage zur Abmeldung meines zweiten Autos: Geht das auch online?";
        gleich($mitte, Text::ohneGruss($mitte . "\nDanke"), 'Ein Gruß am Anfang mit langen Zeilen danach bleibt, nur das „Danke“ am Ende fällt weg');
        $lang = "Zeile eins des Anliegens ist hier.\n" . str_repeat("Weitere Zeile mit Inhalt.\n", 10) . "Viele Grüße\nErika";
        enthaelt_nicht('Viele Grüße', Text::ohneGruss($lang), 'Gruß in den letzten acht Zeilen wird gefunden');
        $tief = "Viele Grüße\n" . str_repeat("Zeile\n", 8) . 'Ende des Textes mit genug Zeichen';
        gleich($tief, Text::ohneGruss($tief), 'Mehr als sechs Zeilen nach dem Gruß: nichts entfernt');

        // ==================================================================================
        abschnitt('E · Text und Regeln: kurze Antworten ohne Zitat (Datenschutz S1)');
        // ==================================================================================
        foreach (["Ja, bitte.\n\nAm 21.11.2026 um 10:00 schrieb KFZ-Zulassungsprofis <info@kfz-zulassungsprofis.de>:\n> Guten Tag Erika Mustermann,\n> wir erstatten Ihnen die Kosten, Kennzeichen B-EM 123.",
            "Danke!\n\n-----Ursprüngliche Nachricht-----\nVon: Erika Mustermann <erika.mustermann@example.org>\nBetreff: Ummeldung"] as $roh) {
            $b = Text::bereinige($roh, false)['text'];
            enthaelt_nicht('Mustermann', $b, 'Kurze Antwort: kein Name aus dem Zitat');
            enthaelt_nicht('@', $b, 'Kurze Antwort: keine Mailadresse aus dem Zitat');
        }
        $kopf = static fn (string $von, string $replyTo = ''): array => [
            'von_adresse' => $von, 'antwort_an' => $replyTo, 'betreff' => 'Frage', 'an' => ['info@kfz-zulassungsprofis.de'], 'cc' => [],
            'kopf' => [], 'flags' => [], 'datum' => Umgebung::jetzt(),
        ];
        gleich('kurz', Regeln::pruefe($kopf('kunde@example.org'), 'Ja, bitte.')['kategorie'], 'Kurze Antwort geht ohne KI an den Menschen');
        gleich('kein_absender', Regeln::pruefe($kopf(''), 'Was kostet bei Ihnen die Abmeldung meines Autos?')['kategorie'], 'Ohne From und Reply-To: kein KI-Aufruf (K6)');
        gleich('', Regeln::pruefe($kopf('', 'antwort@example.org'), 'Was kostet bei Ihnen die Abmeldung meines Autos?')['kategorie'], 'Ohne From, aber mit Reply-To: an die KI');

        // ==================================================================================
        abschnitt('E · Text: gegliederte FIN (Datenschutz S8)');
        // ==================================================================================
        gleich('FIN: [FIN] bzw. [FIN]', Text::maskiere('FIN: WVW ZZZ 1JZ 3W 386752 bzw. WVW-ZZZ1JZ3W386752'), 'FIN mit Leerzeichen (nach Stichwort) und mit Bindestrich');
        gleich('Fahrgestellnummer lautet [FIN].', Text::maskiere('Fahrgestellnummer lautet WVW ZZZ 1JZ 3W 386752.'), 'Stichwort „Fahrgestellnummer“');
        foreach (['B-EM 123 und Referenz', 'HH-AB 1234 KZP-2026-0815', 'KZP-20261118-B7K2 HH-AB 1234', 'Kennzeichen XX-SB 2026 und PLZ 10115'] as $bleibt) {
            gleich($bleibt, Text::maskiere($bleibt), 'Bleibt lesbar: „' . $bleibt . '“');
        }

        // ==================================================================================
        abschnitt('E · MailLeser: Textdatei als Anhang (Datenschutz S3)');
        // ==================================================================================
        $apple = "From: Erika Muster <erika.muster@example.org>\r\nTo: info@kfz-zulassungsprofis.de\r\nSubject: Ummeldung\r\n"
            . "Date: Sun, 22 Nov 2026 08:00:00 +0100\r\nMessage-ID: <teil-e-apple@example.org>\r\nMIME-Version: 1.0\r\n"
            . "Content-Type: multipart/mixed; boundary=\"G\"\r\n\r\n--G\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n"
            . "Anbei meine Daten als Datei, bitte ummelden.\r\n--G\r\nContent-Type: text/plain; name=\"personalausweis.txt\"\r\n"
            . "Content-Disposition: inline; filename=\"personalausweis.txt\"\r\nContent-Transfer-Encoding: base64\r\nX-Unix-Mode: 0644\r\n\r\n"
            . base64_encode("Ausweisnummer L01X00T47\nGeboren 01.02.1980 in Berlin") . "\r\n--G\r\nContent-Type: text/plain; name=\"notiz.txt\"\r\n\r\n"
            . "Zweite Datei ohne Content-Disposition\r\n--G--\r\n";
        $m = MailLeser::ausRoh($apple, 1, 1, []);
        enthaelt('bitte ummelden', (string) $m['text'], 'Eigener Text bleibt');
        enthaelt_nicht('L01X00T47', (string) $m['text'], 'Inhalt der angehängten Textdatei ist nicht im Mailtext');
        enthaelt_nicht('Zweite Datei', (string) $m['text'], 'Auch nicht der einer Datei ohne Content-Disposition');
        gleich(2, count($m['anhaenge']), 'Beide Textdateien zählen als Anhang');

        // ==================================================================================
        abschnitt('E · Versand: englische Antwort und Empfänger (F1, Sicherheit S1)');
        // ==================================================================================
        $n = ['von_name' => 'John Sample', 'von_adresse' => 'john@example.org', 'betreff' => 'Registration'];
        $en = Versand::vorschau($n, 'Thank you for your message.', $wissen, 'en');
        pruefe(str_starts_with($en, "Hello John Sample,\n\nThank you for your message.\n\nKind regards\nKFZ-Zulassungsprofis\n\n-- \n"), 'Englisch: „Hello Name,“, „Kind regards“, Absendername, dann Fußzeile');
        enthaelt('Sitz der Gesellschaft', $en, 'Englisch: Pflichtangaben bleiben');
        pruefe(str_starts_with(Versand::vorschau(['von_name' => 'info'], 'Thanks.', $wissen, 'en'), "Hello,\n\n"), 'Englisch ohne Personennamen: „Hello,“');
        pruefe(str_starts_with(Versand::vorschau($n, 'Merhaba.', $wissen, 'andere'), "Guten Tag John Sample,\n"), 'Andere Sprache: Anrede und Gruß wie auf Deutsch');
        gleich('john@example.org', Versand::empfaengerAdresse(['von_adresse' => 'john@example.org', 'antwort_an' => 'info@kfz-zulassungsprofis.de']),
            'Reply-To ist die eigene Adresse: die Antwort geht an den Absender (geht_an zeigt das so)');
        gleich(['neu@fremd.example', true], [Versand::empfaengerAdresse(['von_adresse' => 'john@example.org', 'antwort_an' => 'neu@fremd.example']),
            Versand::empfaengerWeichtAb(['von_adresse' => 'john@example.org', 'antwort_an' => 'neu@fremd.example'])], 'Reply-To weicht ab');

        // ==================================================================================
        abschnitt('E · Claude: Leitung und Abrechnung (Kosten K3, K4)');
        // ==================================================================================
        $leitung = (new ReflectionMethod(Claude::class, 'leitung'))->invoke(null, 3.0);
        $geworfen = false;
        try {
            $leitung->sendRequest(new \GuzzleHttp\Psr7\Request('POST', 'http://127.0.0.1:9/'));
        } catch (\GuzzleHttp\Exception\ConnectException) {
            $geworfen = true;
        }
        pruefe($geworfen && $leitung->ohneAntwort === 0 && $leitung->abgeschickt === 0, 'Verbindung abgelehnt: nichts abgeschickt, kein Versuch ohne Antwort (keine Phantombuchung)');
        $usage = (new ReflectionMethod(Claude::class, 'usage'))->invoke(null, [
            'input_tokens' => 100, 'output_tokens' => 40,
            'iterations' => [
                ['input_tokens' => 20000, 'output_tokens' => 900, 'cache_creation_input_tokens' => 0],
                ['input_tokens' => 100, 'output_tokens' => 40],
            ],
        ]);
        gleich([20100, 940], [$usage['input_tokens'], $usage['output_tokens']], 'Ausweichmodell: alle Versuche (usage.iterations) werden gebucht, nicht nur der letzte');

        // ==================================================================================
        // Ablauf mit eigenem Datei-Postfach
        // ==================================================================================
        abschnitt('E · Ablauf: Vorbereitung');
        $daten = $basis . '/teil-e';
        $postfach = $basis . '/teil-e-mails';
        mkdir($daten, 0700, true);
        mkdir($postfach, 0700, true);
        putenv('KZP_ASSISTENT_DIR=' . $daten);
        putenv('KZP_ASSISTENT_POSTFACH=datei:' . $postfach);
        putenv('KZP_ASSISTENT_VERSAND=datei');
        $jetzt = $zeit('2026-11-22 09:00:00');
        $uhr($jetzt);
        $db = Speicher::db();
        $wert = static function (string $sql, array $p = []) use ($db): mixed {
            $s = $db->prepare($sql);
            $s->execute($p);
            return $s->fetchColumn();
        };
        $zeile = static function (string $sql, array $p = []) use ($db): array {
            $s = $db->prepare($sql);
            $s->execute($p);
            $z = $s->fetch(\PDO::FETCH_ASSOC);
            return is_array($z) ? $z : [];
        };
        $lauf = static function (?float $beginn = null) use (&$jetzt, $uhr): array {
            $jetzt += 60;
            $uhr($jetzt);
            return Kern::lauf('test', 20, $beginn);
        };
        $uidZaehler = 0;
        $eml = static function (string $von, string $text, array $mehr = []) use ($postfach, &$uidZaehler, &$jetzt): int {
            $uidZaehler++;
            $kopf = 'From: ' . ($von !== '' ? '<' . $von . '>' : 'Ohne Adresse') . "\r\nTo: info@kfz-zulassungsprofis.de\r\n"
                . (isset($mehr['reply_to']) ? 'Reply-To: <' . $mehr['reply_to'] . ">\r\n" : '')
                . 'Subject: ' . ($mehr['betreff'] ?? 'Anfrage') . "\r\nDate: " . gmdate('D, d M Y H:i:s', $mehr['datum'] ?? $jetzt - 60) . " +0000\r\n"
                . 'Message-ID: <teil-e-' . $uidZaehler . "@example.org>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n";
            file_put_contents($postfach . '/' . sprintf('%03d', $uidZaehler) . '-mail.eml', $kopf . str_replace("\n", "\r\n", $text) . "\r\n");
            return $uidZaehler;
        };
        $id = static fn (int $uid): int => (int) $wert('SELECT id FROM nachricht WHERE uid = ?', [$uid]);
        $nachricht = static fn (int $nid): array => $zeile('SELECT * FROM nachricht WHERE id = ?', [$nid]);
        $offen = static fn (int $nid): array => $zeile("SELECT * FROM entwurf WHERE nachricht_id = ? AND status = 'offen' ORDER BY id DESC LIMIT 1", [$nid]);
        $verschiebe = static function (int $uid) use ($postfach): void {
            foreach (glob($postfach . '/' . sprintf('%03d', $uid) . '-*.eml') ?: [] as $datei) {
                unlink($datei);
            }
        };

        $aufrufe = [];
        $warteschlange = [];
        $antwort = static fn (array $felder = []): array => [
            'ok' => true,
            'daten' => $felder + [
                'anliegen' => 'allgemein', 'leistung' => 'keine', 'interessent' => false, 'dringlich' => false, 'stimmung' => 'neutral',
                'uebergabe' => false, 'uebergabe_grund' => '', 'komplex' => false, 'manipulation_verdacht' => false,
                'zusammenfassung' => 'Testanfrage', 'fehlende_angabe' => '', 'sprache' => 'de',
                'antwort' => 'Vielen Dank für Ihre Nachricht. Wir melden uns bei Ihnen.',
            ],
            'usage' => ['input_tokens' => 1000, 'output_tokens' => 200], 'stop' => 'end_turn', 'http' => 200, 'request_id' => 'req_teil_e', 'dauer_ms' => 5,
        ];
        Claude::$ersatz = static function (string $modell, string $sys, string $nu, array $sch, bool $cache) use (&$aufrufe, &$warteschlange, $antwort): array {
            $aufrufe[] = ['modell' => $modell, 'nutzer' => $nu, 'cache' => $cache];
            return array_shift($warteschlange) ?? $antwort();
        };
        $r = $lauf();
        enthaelt('Startmarke', $r['hinweis'], 'Erster Lauf setzt die Startmarke');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: gefälschter Absender mit fremder Antwortadresse (Sicherheit S1)');
        $uEcht = $eml('erika.kundin@example.org', "Guten Tag,\nich ziehe von der Musterstrasse 5 in 12345 Musterstadt in die Beispielallee 9. Mein Kennzeichen ist B-EK 1234. Was kostet die Ummeldung?");
        $lauf();
        $echt = $id($uEcht);
        gleich('wartet_ki', $nachricht($echt)['status'] ?? '', 'Echte Mail wartet (KI pausiert)');
        $uFalsch = $eml('erika.kundin@example.org', "Guten Tag,\nneue Mailadresse, bitte bestätigen Sie meine Angaben noch einmal.", ['reply_to' => 'erika.neu@angreifer.example']);
        $lauf();
        $falsch = $id($uFalsch);
        gleich(['wartet_ki', 0], [$nachricht($echt)['status'] ?? '', (int) ($nachricht($echt)['zusammengefasst_in'] ?? -1)], 'Echte Mail wird nicht verschluckt (anderer Empfänger der Antwort)');
        $liste = array_column(Admin::liste('offen', 1)['eintraege'], null, 'id');
        pruefe(isset($liste[$echt], $liste[$falsch]), 'Beide Mails stehen unter „Zu erledigen“');
        enthaelt('Antwort an andere Adresse', (string) json_encode($liste[$falsch]['marken'] ?? [], JSON_UNESCAPED_UNICODE), 'Liste: rote Marke an der gefälschten Mail');
        Speicher::setze('ki_aktiv', '1', 'test');
        $vorherAufrufe = count($aufrufe);
        Kern::verarbeite($falsch);
        gleich($vorherAufrufe + 1, count($aufrufe), 'Ein Aufruf für die gefälschte Mail');
        enthaelt_nicht('Musterstrasse', (string) ($aufrufe[count($aufrufe) - 1]['nutzer'] ?? ''), 'Der Text der echten Mail geht nicht in den Aufruf');
        $d = Admin::nachricht($falsch) ?? [];
        gleich(['erika.neu@angreifer.example', true], [$d['nachricht']['geht_an'] ?? '', $d['nachricht']['antwort_abweichend'] ?? null], 'Einzelansicht: „Geht an“ ist die fremde Adresse, deutlich markiert');
        enthaelt('Absender lassen sich fälschen', (string) ($d['hinweis']['text'] ?? ''), 'Einzelansicht: Hinweis im Kopf');
        $e = $offen($falsch);
        $s = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', false);
        pruefe(!$s['ok'] && $hinweisMit($s['warnungen'], 'erika.neu@angreifer.example'), 'Senden an eine abweichende Antwortadresse verlangt eine Bestätigung');
        Kern::verwerfe($falsch, 'anderes', 'tester:Test');
        gleich('wartet_ki', $nachricht($echt)['status'] ?? '', 'Nach dem Verwerfen der Fälschung wartet die echte Mail weiter');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: Folge-Mail, Ansicht und Zurückholen (Sicherheit S1)');
        Speicher::setze('ki_aktiv', '0', 'test');
        $uA = $eml('max.folge@example.org', "Guten Tag,\nwas kostet bei Ihnen eine Abmeldung? Text-A-erste-Mail");
        $lauf();
        $uB = $eml('max.folge@example.org', "Nachtrag: Ich habe auch noch eine Frage zu den Kennzeichen. Text-B-zweite-Mail");
        $lauf();
        $a = $id($uA);
        $b = $id($uB);
        gleich(['zusammengefasst', $b], [$nachricht($a)['status'] ?? '', (int) ($nachricht($a)['zusammengefasst_in'] ?? 0)], 'Gleicher Empfänger: frühere Mail zusammengefasst, mit Bezug auf die neue');
        $d = Admin::nachricht($b) ?? [];
        enthaelt('Text-A-erste-Mail', (string) json_encode($d['nachricht']['zusammengefasst'] ?? [], JSON_UNESCAPED_UNICODE), 'Ansicht der neuen Mail zeigt den Text der früheren');
        Speicher::setze('ki_aktiv', '1', 'test');
        Kern::verarbeite($b);
        $bisher = (string) (json_decode((string) ($aufrufe[count($aufrufe) - 1]['nutzer'] ?? ''), true)['bisher'] ?? '');
        enthaelt('Text-A-erste-Mail', $bisher, 'Der Aufruf für die neue Mail kennt die frühere');
        $vorherAufrufe = count($aufrufe);
        Kern::verwerfe($b, 'keine_antwort', 'tester:Test');
        gleich(['mensch', 'vorgaenger_offen'], [$nachricht($a)['status'] ?? '', $nachricht($a)['status_grund'] ?? ''], 'Neue verworfen: die frühere ist wieder offen (beim Menschen)');
        $liste = array_column(Admin::liste('offen', 1)['eintraege'], null, 'id');
        pruefe(isset($liste[$a]), 'Sie steht wieder unter „Zu erledigen“');
        $lauf();
        gleich([0, 'mensch'], [(int) $wert('SELECT COUNT(*) FROM verbrauch WHERE nachricht_id = ?', [$a]), $nachricht($a)['status'] ?? ''],
            'Kein automatischer KI-Aufruf für die zurückgeholte Mail');
        $darf = (Admin::nachricht($a) ?? [])['darf'] ?? [];
        gleich([true, true], [$darf['uebernehmen'] ?? null, $darf['verwerfen'] ?? null], 'Zurückgeholte Mail lässt sich abschließen');
        Kern::uebernehme($a, 'tester:Test');
        gleich(['mensch', 'uebernommen'], [$nachricht($a)['status'] ?? '', $nachricht($a)['status_grund'] ?? ''], '„Ich antworte selbst“ schließt sie ab');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: Senden, wenn sich das Postfach nicht prüfen lässt (Betrieb S1, F4, B6)');
        $uC = $eml('verschoben@example.org', "Guten Tag,\nwas brauchen Sie für eine Abmeldung von mir?");
        $lauf();
        $c = $id($uC);
        gleich('entwurf', $nachricht($c)['status'] ?? '', 'Entwurf liegt vor');
        $verschiebe($uC);
        $lauf();
        gleich(['entwurf', 'nicht_im_posteingang'], [$nachricht($c)['status'] ?? '', $nachricht($c)['status_grund'] ?? ''], 'Mail nicht mehr im Posteingang: Hinweis am Entwurf');
        enthaelt('nicht mehr im Posteingang', (string) (((Admin::nachricht($c) ?? [])['hinweis']['text']) ?? ''), 'Einzelansicht sagt es');
        $e = $offen($c);
        $ausgangVorher = count(glob($daten . '/ausgang/*.eml') ?: []);
        $s = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', false);
        pruefe(!$s['ok'] && in_array(Kern::HINWEIS_NICHT_GEPRUEFT, $s['warnungen'], true), 'Ohne Bestätigung kein Versand: „Konnte nicht prüfen, ob schon jemand geantwortet hat“');
        gleich($ausgangVorher, count(glob($daten . '/ausgang/*.eml') ?: []), 'Nichts im Ausgang');
        gleich(true, Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true)['ok'], 'Mit ausdrücklicher Bestätigung gesendet');

        $uD = $eml('unerreichbar@example.org', "Guten Tag,\nwie lange dauert eine Ummeldung bei Ihnen?");
        $lauf();
        $dId = $id($uD);
        $e = $offen($dId);
        putenv('KZP_ASSISTENT_POSTFACH=datei:' . $postfach . '/gibt-es-nicht');
        $s = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', false);
        pruefe(!$s['ok'] && in_array(Kern::HINWEIS_NICHT_GEPRUEFT, $s['warnungen'], true), 'Postfach nicht erreichbar: dieselbe Warnung, kein Versand');
        putenv('KZP_ASSISTENT_POSTFACH=datei:' . $postfach);

        $uS = $eml('stark.verschoben@example.org', "Guten Tag,\nich habe zwei Fragen: Abmeldung und Import aus Frankreich.");
        $warteschlange[] = $antwort(['komplex' => true, 'antwort' => 'Vielen Dank. Wir beantworten beide Fragen.']);
        $lauf();
        $st = $id($uS);
        gleich(['wartet_ki', 'stark'], [$nachricht($st)['status'] ?? '', $nachricht($st)['status_grund'] ?? ''], 'Komplex ohne Übergabe: wartet auf das stärkere Modell');
        $verschiebe($uS);
        $vorherAufrufe = count($aufrufe);
        $lauf();
        gleich(['entwurf', 'nicht_im_posteingang', $vorherAufrufe], [$nachricht($st)['status'] ?? '', $nachricht($st)['status_grund'] ?? '', count($aufrufe)],
            'Verschoben, während es auf Sonnet wartete: Entwurf freigegeben, mit Hinweis, ohne Aufruf (B6)');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: abgebrochener Versand wird nicht zusammengefasst (Betrieb B7)');
        $uV = $eml('abbruch@example.org', "Guten Tag,\nwas kostet eine Abmeldung bei Ihnen?");
        $lauf();
        $v = $id($uV);
        $e = $offen($v);
        $db->prepare("UPDATE entwurf SET status = 'sendet' WHERE id = ?")->execute([(int) $e['id']]);
        $db->prepare('UPDATE nachricht SET in_arbeit_bis = ? WHERE id = ?')->execute([$jetzt - 400, $v]);
        $eml('abbruch@example.org', "Nachtrag: Geht das auch am Wochenende bei Ihnen?");
        $lauf();
        gleich(['mensch', 'versand_unklar', 'unklar'], [$nachricht($v)['status'] ?? '', $nachricht($v)['status_grund'] ?? '',
            $wert('SELECT status FROM entwurf WHERE id = ?', [(int) $e['id']])], 'Hängender Versand: Nachricht „Versand unklar“, Entwurf „unklar“ – nicht zusammengefasst');
        gleich('status', Kern::neuErzeugen($v, 'tester:Test')['grund'], 'Und kein neuer Entwurf dafür');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: kein Sonnet, wenn ohnehin ein Mensch übernimmt (Kosten K1, F2)');
        foreach ([['uebergabe' => true, 'uebergabe_grund' => 'Sonderfall'], ['anliegen' => 'beschwerde'], ['stimmung' => 'veraergert']] as $nr => $felder) {
            // Jede Mail mit eigenem Text – gleicher Text käme als Duplikat ohne Aufruf durch.
            $u = $eml('k1-' . $nr . '@example.org', "Guten Tag,\nich habe ein Problem mit meiner Zulassung (Fall " . $nr . ') und eine zweite Frage.');
            $warteschlange[] = $antwort(['komplex' => true] + $felder);
            $lauf();
            $k = $id($u);
            gleich(['entwurf', '', 0], [$nachricht($k)['status'] ?? '', $nachricht($k)['status_grund'] ?? '', (int) $wert('SELECT aus_duplikat FROM einordnung WHERE nachricht_id = ?', [$k])],
                'komplex + ' . (string) array_key_first($felder) . ': Entwurf sofort, keine Eskalation');
        }
        gleich(0, (int) $wert("SELECT COUNT(*) FROM verbrauch WHERE zweck = 'eskalation'"), 'Kein Sonnet-Aufruf');
        $u = $eml('k1-leer@example.org', "Guten Tag,\nzwei Fragen auf einmal, bitte beide beantworten.");
        $warteschlange[] = $antwort(['komplex' => true, 'antwort' => '']);
        $lauf();
        gleich('entwurf', $nachricht($id($u))['status'] ?? '', 'komplex ohne Antworttext: keine Eskalation');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: Widerspruch gilt sofort (Datenschutz S4)');
        Speicher::setze('ki_aktiv', '0', 'test');
        $uW = $eml('widerspruch@example.org', "Guten Tag,\nbitte bearbeiten Sie meine Mails ohne KI. Was kostet die Abmeldung?");
        $uI = $eml('werbung@werbefirma.example', "Guten Tag,\nwir bieten Ihnen Suchmaschinenoptimierung zum Sonderpreis an.");
        $uR = $eml('direkt@example.org', "Guten Tag,\nwas kostet bei Ihnen die Abmeldung meines Autos?");
        $lauf();
        $w = $id($uW);
        $i = $id($uI);
        $rId = $id($uR);
        $erg = Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => 'widerspruch@example.org', 'art' => 'immer_mensch', 'bearbeiter' => 'Max'], 'tester');
        gleich([true, 1], [$erg['daten']['ok'] ?? null, $erg['daten']['umgestellt'] ?? null], 'Regel angelegt, die wartende Mail umgestellt');
        gleich(['mensch', 'absenderregel'], [$nachricht($w)['status'] ?? '', $nachricht($w)['status_grund'] ?? ''], 'Wartende Mail ist jetzt beim Menschen');
        Admin::fuehreAus(['aktion' => 'absender_regel', 'muster' => '@werbefirma.example', 'art' => 'ignorieren', 'bearbeiter' => 'Max'], 'tester');
        gleich(['ohne_ki', 'absenderregel'], [$nachricht($i)['status'] ?? '', $nachricht($i)['regel_kategorie'] ?? ''], '„Ignorieren“ für die Domain: wartende Mail ohne KI');
        // Eine Regel, die (etwa von Hand) angelegt wurde, ohne die Wartenden umzustellen: Der Kern prüft vor dem Aufruf selbst.
        $db->prepare('INSERT INTO absender_regel (muster, art, notiz, angelegt_am) VALUES (?, ?, ?, ?)')->execute(['direkt@example.org', 'immer_mensch', '', $jetzt]);
        Speicher::setze('ki_aktiv', '1', 'test');
        $vorherAufrufe = count($aufrufe);
        gleich(['ok' => false, 'grund' => 'absenderregel'], Kern::verarbeite($rId), 'Vor dem Aufruf: Absenderregel greift');
        $lauf();
        gleich($vorherAufrufe, count($aufrufe), 'Für keine der Mails ein KI-Aufruf');
        gleich('absenderregel', Kern::neuErzeugen($w, 'tester:Test')['grund'], '„Entwurf erzeugen“ verweigert bei Widerspruch');
        gleich(false, ((Admin::nachricht($w) ?? [])['darf']['neu_erzeugen']) ?? null, 'Der Knopf wird gar nicht angeboten');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Ablauf: Aktionspreis vom 31.12. am 1.1. (Betrieb B5)');
        if ($aktionsSlug !== '' && is_array($wissen['aktion'])) {
            $bis = (string) $wissen['aktion']['gueltig_bis'];
            $jetzt = $zeit($bis . ' 22:40:00');
            $uhr($jetzt);
            $uP = $eml('silvester@example.org', "Guten Tag,\nwas kostet bei Ihnen die " . $aktionsSlug . '?');
            $warteschlange[] = $antwort(['anliegen' => 'preis', 'leistung' => $aktionsSlug, 'antwort' => 'Vielen Dank. Das kostet bei uns {{PREIS:' . $aktionsSlug . '}}.']);
            $lauf();
            $pId = $id($uP);
            $e = $offen($pId);
            enthaelt(trim($platzhalter['PREIS:' . $aktionsSlug]), (string) ($e['text_final'] ?? ''), 'Am 31.12.: Entwurf mit Aktionspreis');
            $jetzt = $zeit(date('Y-m-d', $zeit($bis . ' 12:00:00') + 86400) . ' 09:00:00');
            $uhr($jetzt);
            $s = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true);
            gleich(false, $s['ok'], 'Am 1.1.: unveränderter Entwurf geht auch mit Bestätigung nicht hinaus');
            $e2 = $offen($pId);
            enthaelt('{{PREIS:' . $aktionsSlug . '}}', (string) ($e2['text_final'] ?? ''), 'sondern wird neu gefüllt – der Aktionspreis fehlt');
            gleich('abgelehnt', $e2['pruef_status'] ?? '', 'und ist abgelehnt („Aktionspreis abgelaufen“)');
            $s = Kern::sende((int) $e2['id'], (string) $e2['text_final'], 'tester:Test', true);
            pruefe(!$s['ok'] && str_contains($s['meldung'], 'Platzhalter'), 'Mit dem Platzhalter wird nicht gesendet');
            $selbst = 'Der Gründerrabatt ist ausgelaufen, die Leistung kostet jetzt den regulären Preis.';
            $s = Kern::sende((int) $e2['id'], $selbst, 'tester:Test', false);
            pruefe(!$s['ok'] && $s['warnungen'] !== [] && $s['meldung'] !== 'Der Text kann so nicht gesendet werden.', 'Ein von Hand geschriebener Text bleibt sendbar (nur Warnungen)');
            // Die Uhr läuft von hier aus weiter (nie zurück: Fristen und Hinweis-Mails hängen daran).
        }

        // ----------------------------------------------------------------------------------
        abschnitt('E · Wissensbasis veraltet: Stand der Website passt nicht (Betrieb B2)');
        $stand = $basis . '/teil-e-assistent-stand.txt';
        file_put_contents($stand, str_repeat('ab', 32) . "\n");
        putenv('KZP_ASSISTENT_STAND=' . $stand);
        pruefe(Wissen::veraltet($wissen), 'Anderer Fingerabdruck → veraltet');
        $preis = '';
        foreach (array_keys($platzhalter) as $k) {
            if (str_starts_with($k, 'PREIS:')) {
                $preis = $k;
                break;
            }
        }
        $e = Pruefer::pruefeEntwurf('Das kostet {{' . $preis . '}}.', $neutral, $wissen);
        pruefe($e['status'] === 'abgelehnt' && in_array(Pruefer::HINWEIS_WISSEN_VERALTET, $e['hinweise'], true), 'Veraltet: alle Preise gesperrt, mit Hinweis');
        pruefe(Wissen::vergleichsStand($wissen) !== Wissen::hash($wissen), 'Vergleichsstand beim Senden ändert sich (neu füllen)');
        $selbsttest = array_column(Kern::selbsttest(), null, 'punkt');
        gleich(false, $selbsttest['Wissensbasis']['ok'] ?? null, 'Selbsttest meldet die veraltete Wissensbasis');
        $mitFinger = $wissen + ['fingerabdruck' => str_repeat('ab', 32)];
        pruefe(!Wissen::veraltet($mitFinger), 'Gleicher Fingerabdruck → aktuell');
        gleich(Wissen::hash($wissen), Wissen::hash($mitFinger), 'Der Fingerabdruck selbst ändert den Hash nicht');
        putenv('KZP_ASSISTENT_STAND=' . $basis . '/gibt-es-nicht.txt');
        pruefe(!Wissen::veraltet($wissen), 'Ohne Stand-Datei (lokal) kein Abgleich');
        putenv('KZP_ASSISTENT_STAND');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Deploy bleibt unvollständig: Störung statt Stillstand (Betrieb B4)');
        $ablage = $basis . '/teil-e-ablage';
        mkdir($ablage . '/intern', 0700, true);
        file_put_contents($ablage . '/lauf.php', "<?php // Probe\n");
        file_put_contents($ablage . '/intern/manifest.json', (string) json_encode(['dateien' => ['lauf.php' => str_repeat('0', 64)]]));
        putenv('KZP_ASSISTENT_MANIFEST=' . $ablage . '/intern/manifest.json');
        $r = $lauf();
        gleich([true, false], [$r['ok'], $r['stoerung']], 'Gerade abweichend: „Deploy läuft“, noch keine Störung');
        $jetzt += 1900;
        $r = $lauf();
        pruefe(!$r['ok'] && $r['stoerung'] && str_contains($r['hinweis'], 'Deploy unvollständig'), 'Nach über 30 Minuten: Störung (lauf.php antwortet mit 503)');
        $stoerungen = array_filter(glob($daten . '/ausgang/*.eml') ?: [], static fn (string $p): bool => str_contains((string) file_get_contents($p), 'X-KZP-Assistent: stoerung'));
        pruefe(count($stoerungen) >= 1, 'Störungs-Mail ans eigene Postfach');
        putenv('KZP_ASSISTENT_MANIFEST');
        $r = $lauf();
        gleich([true, false, ''], [$r['ok'], $r['stoerung'], Speicher::einstellung('manifest_abweichend_seit')], 'Passt wieder: Störung vorbei, Merker gelöscht');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Zeitbudget ab Anfragebeginn und Hinweis-Mail (Betrieb B9)');
        $uZ = $eml('zeit@example.org', "Guten Tag,\nwas kostet bei Ihnen eine Ummeldung?");
        $vorherAufrufe = count($aufrufe);
        $r = $lauf(microtime(true) - 30);
        pruefe(str_contains($r['hinweis'], 'nächsten Lauf') && count($aufrufe) === $vorherAufrufe, 'Anfrage begann vor 30 Sekunden: kein KI-Schritt mehr in diesem Lauf');
        $hinweisMails = static fn (): int => count(array_filter(glob($daten . '/ausgang/*.eml') ?: [], static fn (string $p): bool => str_contains((string) file_get_contents($p), 'X-KZP-Assistent: hinweis')));
        $vorherHinweise = $hinweisMails();
        $jetzt += 1900;
        $lauf();
        $z = $id($uZ);
        gleich('entwurf', $nachricht($z)['status'] ?? '', 'Der nächste Lauf schreibt den Entwurf');
        gleich($vorherHinweise + 1, $hinweisMails(), 'Hinweis-Mail für den neuen Entwurf');
        $jetzt += 1900;
        $lauf();
        gleich($vorherHinweise + 1, $hinweisMails(), 'Ohne neuen Entwurf keine weitere Hinweis-Mail');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Sprache am Entwurf (F1)');
        $uE = $eml('john.sample@example.org', "Hello,\nI just bought a used car. Can you register it for me?", ['betreff' => 'Registration']);
        $warteschlange[] = $antwort(['sprache' => 'en', 'antwort' => 'Thank you for your message. We are happy to help.']);
        $lauf();
        $en = $id($uE);
        gleich('en', $offen($en)['sprache'] ?? '', 'Sprache „en“ steht am Entwurf');
        enthaelt('Kind regards', (string) ((Admin::nachricht($en) ?? [])['vorschau'] ?? ''), 'Vorschau zeigt die englische Fassung');
        enthaelt('Kind regards', (string) (Admin::vorschau($en, 'Thanks again.')['vorschau'] ?? ''), 'Auch die Vorschau eines geänderten Texts');
        $e = $offen($en);
        gleich(true, Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true)['ok'], 'Englischer Entwurf gesendet');
        $gesendet = array_values(array_filter(glob($daten . '/ausgang/*.eml') ?: [], static fn (string $p): bool => str_contains((string) file_get_contents($p), 'Subject: Re: Registration')));
        $mail = quoted_printable_decode((string) file_get_contents((string) ($gesendet[0] ?? '/dev/null')));
        pruefe(str_contains($mail, 'Hello,') && str_contains($mail, 'Kind regards'), 'Die gesendete Mail ist englisch gerahmt');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Kosten: Cache, Grenze je Absender, Kosten je Anfrage (Kosten K2, K5, K6)');
        $cache = new ReflectionMethod(Kern::class, 'cacheLohnt');
        $db->prepare("UPDATE nachricht SET status = 'gesendet' WHERE status = 'wartet_ki'")->execute();
        $db->prepare('DELETE FROM verbrauch')->execute();
        $einfuegen = static function (string $von, string $grund) use ($db, &$jetzt): int {
            $db->prepare("INSERT INTO nachricht (kanal, uidvalidity, uid, von_adresse, status, status_grund, eingang_am, erstellt_am)
                          VALUES ('email', 777, ?, ?, 'wartet_ki', ?, ?, ?)")->execute([random_int(1, 999999), $von, $grund, $jetzt, $jetzt]);
            return (int) $db->lastInsertId();
        };
        $eins = $einfuegen('cache-a@example.org', '');
        gleich(false, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, null), 'Allein und ohne Aufruf in der letzten Stunde: kein Cache');
        $zwei = $einfuegen('cache-b@example.org', 'limit_absender');
        gleich(false, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, null), 'Wartet nur eine Mail an der Absendergrenze: kein Cache');
        $drei = $einfuegen('cache-c@example.org', 'pausiert');
        gleich(true, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, null), 'Weitere bearbeitbare Mail wartet: Cache');
        gleich(false, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, [$eins => true]), 'Aus dem Lauf: nur geprüfte Mails zählen');
        $db->prepare("UPDATE nachricht SET status = 'gesendet' WHERE id IN (?, ?)")->execute([$zwei, $drei]);
        Budget::buche(['zeit' => $jetzt - 1800, 'modell' => Claude::MODELL_STANDARD, 'http_status' => 200, 'dauer_ms' => 4000, 'kosten_mikro_usd' => 1]);
        gleich(true, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, null), 'Letzter Haiku-Aufruf vor 30 Minuten: Cache (eine Stunde Haltbarkeit)');
        $db->prepare('UPDATE verbrauch SET zeit = ?')->execute([$jetzt - 3700]);
        gleich(false, $cache->invoke(null, $eins, Claude::MODELL_STANDARD, false, $jetzt, null), 'Vor über einer Stunde: kein Cache');
        gleich(false, $cache->invoke(null, $eins, Claude::MODELL_STARK, true, $jetzt, null), 'Sonnet ohne weitere Sonnet-Mail: kein Cache');
        // Grenze je Absender ohne From: Die Antwortadresse zählt (K6).
        $db->prepare("INSERT INTO nachricht (kanal, uidvalidity, uid, von_adresse, antwort_an, status, eingang_am, erstellt_am)
                      VALUES ('email', 778, 1, '', 'ohne.from@example.org', 'entwurf', ?, ?)")->execute([$jetzt, $jetzt]);
        $ohneFrom = (int) $db->lastInsertId();
        for ($k = 0; $k < 6; $k++) {
            Budget::buche(['zeit' => $jetzt, 'modell' => Claude::MODELL_STANDARD, 'nachricht_id' => $ohneFrom, 'kosten_mikro_usd' => 1]);
        }
        gleich('limit_absender', Budget::darfAufrufen('ohne.from@example.org')['grund'], 'Ohne From: Grenze je Absender über die Antwortadresse');
        // Kosten je Anfrage: Läufe zählen, auch wenn Entwürfe nach kurzer Frist schon gelöscht sind (K5).
        $db->prepare('DELETE FROM entwurf')->execute();
        $db->prepare('INSERT INTO lauf (start, ende, ausloeser, entwuerfe) VALUES (?, ?, ?, ?)')->execute([$jetzt, $jetzt, 'test', 4]);
        $u = Budget::uebersicht();
        pruefe((int) $u['bearbeitet_monat'] >= 4, 'Bearbeitete Anfragen aus den Läufen, nicht nur aus noch gespeicherten Entwürfen');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Buchung: Phantomkosten und Vorab-Buchung (Kosten K3, Betrieb B9)');
        $buche = new ReflectionMethod(Kern::class, 'buche');
        $db->prepare('DELETE FROM verbrauch')->execute();
        $buche->invoke(null, ['ok' => false, 'http' => 0, 'fehler_art' => 'voruebergehend', 'verlorene_versuche' => 0, 'abgeschickt' => 0, 'usage' => []],
            Claude::MODELL_STANDARD, 'entwurf', $eins, 40000, true, 0);
        gleich([1, 0, 0], [(int) $wert('SELECT COUNT(*) FROM verbrauch'), (int) $wert('SELECT SUM(kosten_mikro_usd) FROM verbrauch'), (int) $wert('SELECT SUM(geschaetzt) FROM verbrauch')],
            'Nichts abgeschickt (Verbindung abgelehnt): keine geschätzten Kosten');
        $vorab = new ReflectionMethod(Kern::class, 'bucheVorab');
        $zeileId = (int) $vorab->invoke(null, Claude::MODELL_STANDARD, 'entwurf', $eins, 40000, true);
        gleich([1, Budget::schaetzeHoechstpreis(Claude::MODELL_STANDARD, 40000, Claude::MAX_TOKENS, '1h')], [(int) $wert('SELECT geschaetzt FROM verbrauch WHERE id = ?', [$zeileId]),
            (int) $wert('SELECT kosten_mikro_usd FROM verbrauch WHERE id = ?', [$zeileId])], 'Vor dem Aufruf: Höchstpreis vorab gebucht');
        $buche->invoke(null, ['ok' => true, 'http' => 200, 'usage' => ['input_tokens' => 500, 'output_tokens' => 100], 'verlorene_versuche' => 0, 'abgeschickt' => 1],
            Claude::MODELL_STANDARD, 'entwurf', $eins, 40000, true, $zeileId);
        gleich([2, 0, Budget::kostenMikroUsd(Claude::MODELL_STANDARD, ['input_tokens' => 500, 'output_tokens' => 100])],
            [(int) $wert('SELECT COUNT(*) FROM verbrauch'), (int) $wert('SELECT geschaetzt FROM verbrauch WHERE id = ?', [$zeileId]), (int) $wert('SELECT kosten_mikro_usd FROM verbrauch WHERE id = ?', [$zeileId])],
            'Nach der Antwort: dieselbe Zeile mit den echten Zahlen, keine zusätzliche');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Löschfrist höchstens 90 Tage (Datenschutz S5)');
        $db->prepare("INSERT INTO nachricht (kanal, uidvalidity, uid, status, text_bereinigt, erstellt_am) VALUES ('email', 779, 1, 'gesendet', 'Neunundachtzig-einhalb', ?)")
            ->execute([$jetzt - (int) (89.5 * 86400)]);
        $loesch = (int) $db->lastInsertId();
        $db->prepare("DELETE FROM zaehler WHERE schluessel = 'aufraeumen'")->execute();
        Speicher::setze('aufbewahrung_text_tage', '90', 'test');
        Speicher::aufraeumen();
        gleich(0, (int) $wert('SELECT COUNT(*) FROM nachricht WHERE id = ?', [$loesch]), 'Nach 89,5 Tagen gelöscht – so bleibt keine Mail länger als 90 Tage, obwohl der Löschlauf nur täglich wirkt');

        // ----------------------------------------------------------------------------------
        abschnitt('E · Speicher: Schema-Version 2 aus einer Datenbank der Version 1 (F1)');
        $alt = $basis . '/teil-e-v1';
        mkdir($alt, 0700, true);
        $pdo = new \PDO('sqlite:' . $alt . '/assistent.sqlite');
        foreach ((new ReflectionMethod(Speicher::class, 'schemaVersion1'))->invoke(null) as $sql) {
            $pdo->exec($sql);
        }
        $pdo->exec('PRAGMA user_version = 1');
        $pdo->exec("INSERT INTO entwurf (nachricht_id, text_final) VALUES (1, 'Alt')");
        $pdo = null;
        putenv('KZP_ASSISTENT_DIR=' . $alt);
        $neu = Speicher::db();
        gleich(Speicher::SCHEMA_VERSION, (int) $neu->query('PRAGMA user_version')->fetchColumn(), 'Auf Version 2 gebracht');
        gleich('de', (string) $neu->query('SELECT sprache FROM entwurf WHERE id = 1')->fetchColumn(), 'Bestehender Entwurf bekommt Sprache „de“');
        pruefe(in_array('zusammengefasst_in', array_column($neu->query('PRAGMA table_info(nachricht)')->fetchAll(), 'name'), true), 'Spalte nachricht.zusammengefasst_in ergänzt');
        putenv('KZP_ASSISTENT_DIR=' . $daten);

        // ----------------------------------------------------------------------------------
        abschnitt('E · Login: erst zählen, dann vergleichen (Sicherheit S3)');
        $skript = $basis . '/teil-e-login.php';
        file_put_contents($skript, '<?php' . "\n"
            . 'register_shutdown_function(static function (): void { echo http_response_code(); });' . "\n"
            . '$_SERVER["REMOTE_ADDR"] = getenv("TEST_IP"); $_SERVER["PHP_AUTH_USER"] = "tester"; $_SERVER["PHP_AUTH_PW"] = getenv("TEST_PW");' . "\n"
            . 'require ' . var_export(dirname(__DIR__, 2) . '/public/assistent/intern/start.php', true) . ';' . "\n"
            . 'KZP\Assistent\Admin::verlangeLogin();' . "\n");
        $login = static function (string $ip, string $passwort) use ($skript, $daten): string {
            $umgebung = ['KZP_ASSISTENT_DIR' => $daten, 'ASSISTENT_ADMIN_USER' => 'tester', 'ASSISTENT_ADMIN_PASS' => 'richtiges-testpasswort',
                'ANTHROPIC_API_KEY' => 'test-schluessel-kein-echter', 'TEST_IP' => $ip, 'TEST_PW' => $passwort, 'PATH' => (string) getenv('PATH')];
            $p = proc_open([PHP_BINARY, $skript], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $rohre, null, $umgebung);
            if (!is_resource($p)) {
                return 'kein Prozess';
            }
            $aus = (string) stream_get_contents($rohre[1]);
            proc_close($p);
            // Ein erfolgreicher Login endet ohne eigenen Statuscode (die CLI meldet dann keinen).
            $code = substr(trim($aus), -3);
            return $code === '' ? '200' : $code;
        };
        $codes = [];
        for ($k = 0; $k < 11; $k++) {
            $codes[] = $login('2001:db8:1:1::' . ($k + 1), 'falsch-' . $k);
        }
        gleich(array_merge(array_fill(0, 10, '401'), ['429']), $codes, 'IPv6: zehn Fehlversuche aus einem /64-Netz, dann gesperrt – auch von einer neuen Adresse darin');
        gleich('429', $login('2001:db8:1:1::99', 'richtiges-testpasswort'), 'Gesperrt: auch das richtige Passwort wird nicht mehr verglichen');
        gleich('200', $login('2001:db8:1:2::1', 'richtiges-testpasswort'), 'Anderes /64-Netz: richtiger Login klappt');
        $nach = [];
        for ($k = 0; $k < 3; $k++) {
            $nach[] = $login('198.51.100.7', 'richtiges-testpasswort');
        }
        gleich(['200', '200', '200'], $nach, 'Richtige Logins verbrauchen keine Versuche');
        gleich(0, Speicher::zaehlerstand(Admin::anschlussSchluessel('198.51.100.7'), 900), 'Nach richtigen Logins steht der Zähler auf 0');
    } finally {
        Claude::$ersatz = $ersatzVorher;
        Kern::$sendeErsatz = $sendeVorher;
        foreach ($vorher as $name => $alterWert) {
            putenv($alterWert === false ? $name : $name . '=' . $alterWert);
        }
    }

    abschnitt('E · Aufgeräumt');
    gleich($vorher['KZP_ASSISTENT_DIR'], getenv('KZP_ASSISTENT_DIR'), 'Datenordner wiederhergestellt');
    gleich($vorher['KZP_ASSISTENT_JETZT'], getenv('KZP_ASSISTENT_JETZT'), 'Uhr wiederhergestellt');
    gleich($vorher['KZP_ASSISTENT_POSTFACH'], getenv('KZP_ASSISTENT_POSTFACH'), 'Postfach wiederhergestellt');
})();
