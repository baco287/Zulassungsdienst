<?php
/**
 * Tests Baustein A – Fundament: Umgebung, Zugang, Speicher und Budget.
 *
 * Wird von regeln-test.php eingebunden (dort stehen Prüfhilfe, Datenordner und start.php).
 * Kostenlos: kein Netz, kein Claude-Aufruf, nur erfundene Daten.
 *
 * Die Prüfungen arbeiten in eigenen Unterordnern des Test-Datenordners mit jeweils frischer
 * Datenbank und stellen am Ende Ordner und Uhr wieder her – die folgenden Testteile finden
 * die gemeinsame Datenbank unberührt vor.
 *
 * ANTHROPIC_API_KEY trägt schon beim Start einen Platzhalter (gesetzt in regeln-test.php vor
 * dem Einbinden von start.php); dieser Teil stellt ihn am Ende wieder her. So kann kein Test
 * versehentlich mit dem echten Schlüssel (aus .env.assistent oder aus der Umgebung des Deploys)
 * einen bezahlten Aufruf auslösen.
 */

declare(strict_types=1);

use KZP\Assistent\Budget;
use KZP\Assistent\Speicher;
use KZP\Assistent\Umgebung;
use KZP\Assistent\Zugang;

(static function (): void {
    $basis = rtrim((string) getenv('KZP_ASSISTENT_DIR'), '/');
    abschnitt('A · Vorbereitung');
    pruefe($basis !== '' && is_dir($basis), 'Der Testlauf hat einen eigenen Datenordner');
    if ($basis === '' || !is_dir($basis)) {
        return;
    }

    // -- Hilfen ------------------------------------------------------------------
    $platzhalterSchluessel = 'test-schluessel-kein-echter';
    gleich(['key' => $platzhalterSchluessel], Zugang::claude(), 'Von Anfang an gilt ein Platzhalter-Schlüssel (gesetzt in regeln-test.php) – kein echter Aufruf möglich');
    $tag = 86400;
    // Feste Uhr: Sonntag, 22.11.2026, 12:00 Uhr Berliner Zeit (Winterzeit, UTC+1).
    $mittag = gmmktime(11, 0, 0, 11, 22, 2026);

    $uhr = static function (?int $zeit): void {
        putenv($zeit === null ? 'KZP_ASSISTENT_JETZT' : 'KZP_ASSISTENT_JETZT=' . $zeit);
    };
    $ordnerWechsel = static function (string $name) use ($basis): string {
        putenv('KZP_ASSISTENT_DIR=' . $basis . '/' . $name);
        return $basis . '/' . $name;
    };
    $umgebung = static function (string $name, string|false $wert): void {
        putenv($wert === false ? $name : $name . '=' . $wert);
    };
    $wert = static function (string $sql, array $parameter = []): mixed {
        $stmt = Speicher::db()->prepare($sql);
        $stmt->execute($parameter);
        return $stmt->fetchColumn();
    };
    $zeile = static function (string $sql, array $parameter = []): array {
        $stmt = Speicher::db()->prepare($sql);
        $stmt->execute($parameter);
        return $stmt->fetch() ?: [];
    };
    $fuegeEin = static function (string $tabelle, array $felder): int {
        $db = Speicher::db();
        $db->prepare(
            'INSERT INTO ' . $tabelle . ' (' . implode(', ', array_keys($felder)) . ') VALUES ('
            . implode(', ', array_fill(0, count($felder), '?')) . ')'
        )->execute(array_values($felder));
        return (int) $db->lastInsertId();
    };
    $wirft = static function (callable $aufruf, string $klasse): bool {
        try {
            $aufruf();
        } catch (\Throwable $fehler) {
            return $fehler instanceof $klasse;
        }
        return false;
    };
    $mikro = static fn (float $usd): int => (int) round($usd * 1000000);

    $vorher = [];
    foreach (['ANTHROPIC_API_KEY', 'ASSISTENT_MAIL_USER', 'ASSISTENT_MAIL_PASS', 'ASSISTENT_MAIL_HOST',
              'ASSISTENT_ADMIN_USER', 'ASSISTENT_ADMIN_PASS', 'KZP_ASSISTENT_JETZT'] as $name) {
        $vorher[$name] = getenv($name);
    }

    // -- Umgebung ----------------------------------------------------------------
    abschnitt('A · Umgebung');
    $ordner = $ordnerWechsel('teil-a');
    pruefe(Umgebung::lokal(), 'lokal() ist wahr, wenn KZP_ASSISTENT_DIR gesetzt ist');
    gleich($ordner, Umgebung::datenOrdner(), 'datenOrdner() folgt KZP_ASSISTENT_DIR');
    pruefe(is_dir($ordner), 'datenOrdner() legt den Ordner an');
    gleich(0700, fileperms($ordner) & 0777, 'Der Datenordner ist nur für den Eigentümer zugänglich (0700)');
    enthaelt('Require all denied', (string) @file_get_contents($ordner . '/.htaccess'), 'Der Datenordner sperrt sich zusätzlich selbst gegen Abruf (.htaccess)');
    gleich('kfz-zulassungsprofis.de', Umgebung::eigeneDomain(), 'eigeneDomain()');

    $uhr(1234567890);
    gleich(1234567890, Umgebung::jetzt(), 'jetzt() folgt KZP_ASSISTENT_JETZT');
    putenv('KZP_ASSISTENT_JETZT=morgen');
    pruefe(abs(Umgebung::jetzt() - time()) <= 2, 'Unlesbare Testuhr: jetzt() nimmt die echte Zeit');
    $uhr(null);
    pruefe(abs(Umgebung::jetzt() - time()) <= 2, 'Ohne Testuhr: jetzt() ist die echte Zeit');

    $geheim = Umgebung::geheimnis();
    pruefe(strlen($geheim) >= 64 && ctype_xdigit($geheim), 'geheimnis() ist ein langer Zufallswert');
    gleich($geheim, Umgebung::geheimnis(), 'geheimnis() bleibt gleich');
    gleich($geheim, trim((string) file_get_contents($ordner . '/geheim.txt')), 'geheimnis() steht in geheim.txt');
    gleich(0600, fileperms($ordner . '/geheim.txt') & 0777, 'geheim.txt ist nur für den Eigentümer lesbar (0600)');

    // -- Bibliotheken aus dem Archiv -----------------------------------------------
    abschnitt('A · Bibliotheken aus dem Archiv entpacken');
    if (!class_exists(\ZipArchive::class)) {
        pruefe(true, 'ZipArchive fehlt in dieser PHP-Installation – Entpack-Prüfungen übersprungen');
    } else {
        $packe = static function (string $pfad, array $dateien): void {
            $zip = new \ZipArchive();
            $zip->open($pfad, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
            foreach ($dateien as $name => $inhalt) {
                $zip->addFromString($name, $inhalt);
            }
            $zip->close();
        };
        $intern = $ordner . '/intern-probe';
        mkdir($intern, 0700, true);
        gleich(null, Umgebung::bibliothekenAusArchiv($intern), 'Ohne Archiv gibt es keine Bibliotheken');

        $packe($intern . '/vendor-aaa111aaa111.zip', [
            'autoload.php'               => "<?php\nreturn 'probe-eins';\n",
            'composer/autoload_real.php' => "<?php\n",
            'paket/src/Klasse.php'       => "<?php\n",
        ]);
        touch($intern . '/vendor-aaa111aaa111.zip', time() - 300);
        $autoload = Umgebung::bibliothekenAusArchiv($intern);
        gleich($ordner . '/vendor-aaa111aaa111/autoload.php', $autoload, 'Archiv wird in den Datenordner entpackt');
        pruefe(is_file($ordner . '/vendor-aaa111aaa111/paket/src/Klasse.php'), 'Unterordner sind mit entpackt');
        pruefe(!file_exists($ordner . '/vendor-aaa111aaa111.tmp'), 'Der Zwischenordner .tmp ist weg');
        pruefe(!file_exists($ordner . '/bibliotheken-versuch.txt'), 'Nach Erfolg bleibt kein Versuchsmerker liegen');

        file_put_contents($ordner . '/vendor-aaa111aaa111/merker.txt', 'x');
        gleich($autoload, Umgebung::bibliothekenAusArchiv($intern), 'Zweiter Aufruf liefert denselben Ordner');
        pruefe(is_file($ordner . '/vendor-aaa111aaa111/merker.txt'), 'Zweiter Aufruf entpackt nicht erneut');

        // Neuer Stand (anderer Hash), Dateien diesmal im Ordner „vendor“; dazu der Rest eines abgebrochenen Versuchs.
        mkdir($ordner . '/vendor-bbb222bbb222.tmp/halb', 0700, true);
        file_put_contents($ordner . '/vendor-bbb222bbb222.tmp/halb/rest.php', '<?php');
        $packe($intern . '/vendor-bbb222bbb222.zip', [
            'vendor/autoload.php'               => "<?php\nreturn 'probe-zwei';\n",
            'vendor/composer/autoload_real.php' => "<?php\n",
        ]);
        touch($intern . '/vendor-bbb222bbb222.zip', time() - 200);
        $autoload = Umgebung::bibliothekenAusArchiv($intern);
        gleich($ordner . '/vendor-bbb222bbb222/autoload.php', $autoload, 'Das neuere Archiv gewinnt (auch mit Ordner „vendor“ im Archiv)');
        pruefe(!file_exists($ordner . '/vendor-bbb222bbb222.tmp'), 'Ein halb entpackter Ordner wird ersetzt');
        pruefe(!file_exists($ordner . '/vendor-bbb222bbb222/halb'), 'Reste des abgebrochenen Versuchs sind nicht im Ergebnis');
        pruefe(!file_exists($ordner . '/vendor-aaa111aaa111'), 'Der ältere Stand wird gelöscht');

        // Beschädigtes (z. B. erst halb hochgeladenes) neuestes Archiv: der vorhandene Stand bleibt in Gebrauch.
        file_put_contents($intern . '/vendor-ccc333ccc333.zip', 'kein Zip-Archiv');
        touch($intern . '/vendor-ccc333ccc333.zip', time() - 100);
        gleich($autoload, Umgebung::bibliothekenAusArchiv($intern), 'Beschädigtes Archiv: Rückfall auf den vorhandenen Stand');
        pruefe(!file_exists($ordner . '/vendor-ccc333ccc333') && !file_exists($ordner . '/vendor-ccc333ccc333.tmp'), 'Beschädigtes Archiv hinterlässt keinen Ordner');
        pruefe(is_file($ordner . '/vendor-bbb222bbb222/autoload.php'), 'Der vorhandene Stand bleibt unangetastet');
        enthaelt('vendor-ccc333ccc333', (string) file_get_contents($ordner . '/bibliotheken-versuch.txt'), 'Der gescheiterte Versuch ist vermerkt (Pause vor dem nächsten)');

        // Ein Archiv, dessen Einträge aus dem Zielordner herausführen, wird nicht entpackt.
        $intern2 = $ordner . '/intern-probe-2';
        mkdir($intern2, 0700, true);
        $packe($intern2 . '/vendor-ddd444ddd444.zip', ['autoload.php' => '<?php', '../ausbruch.php' => '<?php']);
        gleich(null, Umgebung::bibliothekenAusArchiv($intern2), 'Archiv mit „..“ im Pfad wird abgelehnt');
        pruefe(!file_exists($ordner . '/ausbruch.php') && !file_exists($basis . '/ausbruch.php'), 'Nichts landet außerhalb des Zielordners');

        // Dateinamen, die nicht dem Muster entsprechen, zählen nicht als Archiv.
        $intern3 = $ordner . '/intern-probe-3';
        mkdir($intern3, 0700, true);
        $packe($intern3 . '/vendor-..-x.zip', ['autoload.php' => '<?php']);
        $packe($intern3 . '/bibliotheken.zip', ['autoload.php' => '<?php']);
        gleich(null, Umgebung::bibliothekenAusArchiv($intern3), 'Nur vendor-<hash>.zip wird beachtet');
    }

    // -- Zugang ------------------------------------------------------------------
    abschnitt('A · Zugang');
    $umgebung('ANTHROPIC_API_KEY', $platzhalterSchluessel);
    gleich(['key' => $platzhalterSchluessel], Zugang::claude(), 'claude() liest ANTHROPIC_API_KEY');
    $umgebung('ANTHROPIC_API_KEY', '  ' . $platzhalterSchluessel . "\n");
    gleich(['key' => $platzhalterSchluessel], Zugang::claude(), 'Leerraum um den Schlüssel wird entfernt');
    $umgebung('ANTHROPIC_API_KEY', '');
    gleich(null, Zugang::claude(), 'Leere Variable heißt ausdrücklich: kein Schlüssel (keine Ausweichquelle)');
    $umgebung('ANTHROPIC_API_KEY', 'kaputt kopiert');
    gleich(null, Zugang::claude(), 'Schlüssel mit Leerzeichen gilt als kaputt');
    $umgebung('ANTHROPIC_API_KEY', $platzhalterSchluessel);

    $umgebung('ASSISTENT_MAIL_USER', 'Postfach@Example.org');
    $umgebung('ASSISTENT_MAIL_PASS', ' passwort-nur-im-test ');
    $umgebung('ASSISTENT_MAIL_HOST', 'mail.example.org');
    $smtp = Zugang::smtp() ?? [];
    gleich(['host', 'port', 'user', 'pass', 'absender'], array_keys($smtp), 'smtp() liefert host, port, user, pass, absender');
    gleich('mail.example.org', $smtp['host'] ?? null, 'smtp(): Host aus der Umgebung');
    gleich('Postfach@Example.org', $smtp['user'] ?? null, 'smtp(): Benutzer unverändert');
    gleich(' passwort-nur-im-test ', $smtp['pass'] ?? null, 'smtp(): Passwort wird nicht beschnitten');
    gleich('postfach@example.org', $smtp['absender'] ?? null, 'smtp(): Absender ist die Postfach-Adresse, kleingeschrieben');
    pruefe(is_int($smtp['port'] ?? null) && $smtp['port'] >= 1 && $smtp['port'] <= 65535, 'smtp(): Port ist eine gültige Zahl');
    gleich(
        ['host' => 'mail.example.org', 'port' => 993, 'user' => 'Postfach@Example.org', 'pass' => ' passwort-nur-im-test '],
        Zugang::imap(),
        'imap(): gleiches Postfach, Port 993'
    );
    $umgebung('ASSISTENT_MAIL_USER', 'm0000000');
    gleich('info@kfz-zulassungsprofis.de', Zugang::smtp()['absender'] ?? null, 'Benutzer ohne Adressform: Absender ist info@ der eigenen Domain');
    $umgebung('ASSISTENT_MAIL_HOST', 'mail.example.org:587');
    gleich(null, Zugang::smtp(), 'Unlesbarer Host: kein Zugang statt eines falschen');
    $umgebung('ASSISTENT_MAIL_HOST', 'mail.example.org');
    $umgebung('ASSISTENT_MAIL_PASS', '');
    gleich(null, Zugang::smtp(), 'smtp() ohne Passwort ist null');
    gleich(null, Zugang::imap(), 'imap() ohne Passwort ist null');
    $umgebung('ASSISTENT_MAIL_USER', '');
    $umgebung('ASSISTENT_MAIL_PASS', 'passwort-nur-im-test');
    gleich(null, Zugang::imap(), 'imap() ohne Benutzer ist null');

    $umgebung('ASSISTENT_ADMIN_USER', 'tester');
    $umgebung('ASSISTENT_ADMIN_PASS', 'login-nur-im-test');
    gleich(['user' => 'tester', 'pass' => 'login-nur-im-test'], Zugang::admin(), 'admin() liest Benutzer und Passwort');
    $umgebung('ASSISTENT_ADMIN_PASS', '');
    gleich(null, Zugang::admin(), 'admin() ohne Passwort ist null');
    foreach (['ASSISTENT_MAIL_USER', 'ASSISTENT_MAIL_PASS', 'ASSISTENT_MAIL_HOST', 'ASSISTENT_ADMIN_USER', 'ASSISTENT_ADMIN_PASS'] as $name) {
        $umgebung($name, $vorher[$name]);
    }

    // -- Speicher: Schema --------------------------------------------------------
    abschnitt('A · Speicher: Schema');
    $uhr($mittag);
    $db = Speicher::db();
    pruefe($db instanceof \PDO, 'db() liefert eine PDO-Verbindung');
    pruefe($db === Speicher::db(), 'db() gibt dieselbe Verbindung wieder');
    pruefe(is_file($ordner . '/assistent.sqlite'), 'Die Datenbank liegt im Datenordner');
    gleich(Speicher::SCHEMA_VERSION, (int) $db->query('PRAGMA user_version')->fetchColumn(), 'Schema-Version steht in user_version');
    gleich('wal', strtolower((string) $db->query('PRAGMA journal_mode')->fetchColumn()), 'Journal-Modus WAL');
    gleich(1, (int) $db->query('PRAGMA secure_delete')->fetchColumn(), 'secure_delete ist eingeschaltet');
    pruefe((int) $db->query('PRAGMA busy_timeout')->fetchColumn() >= 5000, 'busy_timeout mindestens 5 Sekunden');

    $soll = [
        'nachricht' => ['id', 'kanal', 'uidvalidity', 'uid', 'message_id', 'in_reply_to', 'verweise', 'thread_schluessel',
            'von_adresse', 'von_name', 'antwort_an', 'betreff', 'eingang_am', 'text_bereinigt', 'text_hash',
            'zeichen_original', 'gekuerzt', 'anhaenge', 'regel_kategorie', 'regel_grund', 'status', 'status_grund',
            'versuche', 'in_arbeit_bis', 'erstellt_am', 'aktualisiert_am'],
        'einordnung' => ['id', 'nachricht_id', 'anliegen', 'leistung', 'interessent', 'dringlich', 'stimmung', 'uebergabe',
            'uebergabe_grund', 'komplex', 'manipulation', 'zusammenfassung', 'fehlende_angabe', 'modell',
            'prompt_version', 'wissen_hash', 'aus_duplikat', 'erstellt_am'],
        'entwurf' => ['id', 'nachricht_id', 'version', 'text_vorlage', 'text_final', 'pruef_status', 'pruef_hinweise',
            'modell', 'wissen_hash', 'status', 'gesendet_text', 'geaendert', 'freigegeben_von', 'freigegeben_am',
            'gesendet_message_id', 'erstellt_am'],
        'verbrauch' => ['id', 'zeit', 'kanal', 'zweck', 'modell', 'nachricht_id', 'request_id', 'input_tokens',
            'cache_schreiben_5m', 'cache_schreiben_1h', 'cache_lesen', 'output_tokens', 'denk_tokens',
            'kosten_mikro_usd', 'geschaetzt', 'stop_reason', 'http_status', 'dauer_ms', 'fehler'],
        'einstellung' => ['schluessel', 'wert', 'geaendert_am', 'geaendert_von'],
        'zaehler' => ['schluessel', 'anzahl', 'fenster_start'],
        'lauf' => ['id', 'start', 'ende', 'ausloeser', 'abgerufen', 'ohne_ki', 'mit_ki', 'entwuerfe', 'fehler', 'hinweis'],
        'ereignis' => ['id', 'zeit', 'art', 'nachricht_id', 'nutzer', 'details'],
        'absender_regel' => ['id', 'muster', 'art', 'notiz', 'angelegt_am'],
    ];
    $tabellen = $db->query("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")->fetchAll(\PDO::FETCH_COLUMN);
    $erwartet = array_keys($soll);
    sort($erwartet);
    gleich($erwartet, $tabellen, 'Genau die neun Tabellen des Bauplans');
    foreach ($soll as $tabelle => $spalten) {
        $ist = array_column($db->query('PRAGMA table_info(' . $tabelle . ')')->fetchAll(), 'name');
        gleich([], array_values(array_diff($spalten, $ist)), 'Tabelle ' . $tabelle . ': alle Spalten des Bauplans vorhanden');
    }
    $ersteIndexSpalten = [];
    foreach ($db->query('PRAGMA index_list(nachricht)')->fetchAll() as $index) {
        $spalten = $db->query('PRAGMA index_info(' . $index['name'] . ')')->fetchAll();
        $ersteIndexSpalten[] = (string) ($spalten[0]['name'] ?? '');
    }
    foreach (['status', 'message_id', 'thread_schluessel', 'eingang_am'] as $spalte) {
        pruefe(in_array($spalte, $ersteIndexSpalten, true), 'Index auf nachricht.' . $spalte);
    }

    $n1 = $fuegeEin('nachricht', ['uidvalidity' => 7, 'uid' => 101, 'status' => 'wartet_ki', 'von_adresse' => 'max.beispiel@example.org']);
    pruefe($n1 > 0, 'Nachricht lässt sich mit wenigen Angaben speichern (Standardwerte greifen)');
    $standard = $zeile('SELECT kanal, in_arbeit_bis, versuche, text_bereinigt, anhaenge, erstellt_am FROM nachricht WHERE id = ?', [$n1]);
    gleich('email', $standard['kanal'] ?? null, 'Standard: kanal = email');
    gleich(0, $standard['in_arbeit_bis'] ?? null, 'Standard: in_arbeit_bis = 0 (frei)');
    gleich('', $standard['text_bereinigt'] ?? null, 'Standard: leerer Text statt NULL');
    pruefe(abs((int) ($standard['erstellt_am'] ?? 0) - time()) <= 5, 'Fehlt erstellt_am, trägt die Datenbank die aktuelle Zeit ein');
    pruefe($wirft(static fn () => $fuegeEin('nachricht', ['uidvalidity' => 7, 'uid' => 101, 'status' => 'wartet_ki']), \PDOException::class),
        'Dieselbe UID desselben Postfachs lässt sich nicht zweimal speichern');
    pruefe($fuegeEin('nachricht', ['uidvalidity' => 8, 'uid' => 101, 'status' => 'wartet_ki']) > 0, 'Gleiche UID nach neuem uidvalidity ist erlaubt');
    pruefe($wirft(static fn () => $fuegeEin('nachricht', ['uidvalidity' => 7, 'uid' => 102]), \PDOException::class), 'Nachricht ohne Status wird abgelehnt');
    $fuegeEin('einordnung', ['nachricht_id' => $n1, 'anliegen' => 'preis']);
    pruefe($wirft(static fn () => $fuegeEin('einordnung', ['nachricht_id' => $n1, 'anliegen' => 'preis']), \PDOException::class), 'Je Nachricht nur eine Einordnung');
    $fuegeEin('absender_regel', ['muster' => '@example.org', 'art' => 'ignorieren']);
    pruefe($wirft(static fn () => $fuegeEin('absender_regel', ['muster' => '@example.org', 'art' => 'immer_mensch']), \PDOException::class), 'Absenderregel: Muster ist eindeutig');

    gleich('integer', $wert('SELECT typeof(?)', [5]), 'Ganzzahlen werden als Ganzzahlen gebunden');
    gleich(0, $wert('SELECT COALESCE(NULL, 5) < ?', [3]), 'Vergleich eines Ausdrucks mit einer gebundenen Zahl rechnet als Zahl');
    gleich('integer', $wert('SELECT typeof(?)', [false]), 'false wird als 0 gebunden, nicht als leerer Text');
    gleich('text', $wert('SELECT typeof(?)', ['5']), 'Text bleibt Text');
    gleich('null', $wert('SELECT typeof(?)', [null]), 'null bleibt NULL');
    gleich('integer', $wert('SELECT typeof(:zahl)', ['zahl' => 5]), 'Auch benannte Platzhalter werden nach Typ gebunden');

    // -- Speicher: Einstellungen und Ereignisse ------------------------------------
    abschnitt('A · Speicher: Einstellungen und Ereignisse');
    gleich('0', Speicher::einstellung('ki_aktiv'), 'Auslieferungszustand: KI pausiert');
    gleich('10', Speicher::einstellung('limit_monat_usd'), 'Standard Monatslimit 10 USD');
    gleich('1', Speicher::einstellung('limit_tag_usd'), 'Standard Tageslimit 1 USD');
    gleich('150', Speicher::einstellung('limit_aufrufe_tag'), 'Standard 150 Aufrufe je Tag');
    gleich('6', Speicher::einstellung('limit_je_absender_tag'), 'Standard 6 Aufrufe je Absender und Tag');
    gleich('1', Speicher::einstellung('max_ki_je_lauf'), 'Standard ein KI-Aufruf je Lauf');
    gleich('90', Speicher::einstellung('aufbewahrung_text_tage'), 'Standard 90 Tage Aufbewahrung');
    gleich('1', Speicher::einstellung('hinweis_mail'), 'Standard Hinweis-Mail an');
    gleich('Freundliche Grüße', Speicher::einstellung('gruss'), 'Standard Grußzeile');
    gleich('', Speicher::einstellung('gibt_es_nicht'), 'Unbekannter Schlüssel ist leer');
    gleich(Speicher::STANDARD, Speicher::alleEinstellungen(), 'alleEinstellungen() liefert zu Beginn genau die Standards');
    gleich(20, count(Speicher::STANDARD), 'STANDARD enthält die 17 Schlüssel des Bauplans und drei Merker (Hinweis-Mail, Manifest, Wissensbasis)');
    pruefe(array_filter(Speicher::STANDARD, static fn ($w): bool => !is_string($w)) === [], 'Alle Standardwerte sind Text');

    Speicher::setze('limit_tag_usd', '2.5', 'tester:Max Beispiel');
    gleich('2.5', Speicher::einstellung('limit_tag_usd'), 'setze() speichert den Wert');
    Speicher::setze('limit_tag_usd', '3', 'tester:Max Beispiel');
    gleich('3', Speicher::einstellung('limit_tag_usd'), 'setze() überschreibt');
    gleich(1, (int) $wert("SELECT COUNT(*) FROM einstellung WHERE schluessel = 'limit_tag_usd'"), 'Je Schlüssel eine Zeile');
    gleich(
        ['geaendert_am' => $mittag, 'geaendert_von' => 'tester:Max Beispiel'],
        $zeile("SELECT geaendert_am, geaendert_von FROM einstellung WHERE schluessel = 'limit_tag_usd'"),
        'setze() hält fest, wer wann geändert hat'
    );
    Speicher::setze('eigener_schluessel', 'x', 'tester');
    $alle = Speicher::alleEinstellungen();
    pruefe(($alle['limit_tag_usd'] ?? null) === '3' && ($alle['eigener_schluessel'] ?? null) === 'x' && ($alle['gruss'] ?? null) === 'Freundliche Grüße',
        'alleEinstellungen(): gespeicherte Werte plus Standards');
    pruefe($wirft(static fn () => Speicher::setze('', 'x', 'tester'), \InvalidArgumentException::class), 'setze() ohne Schlüssel wird abgelehnt');

    Speicher::ereignis('probe', $n1, 'tester', ['grund' => 'Prüfung', 'anzahl' => 3]);
    $e = $zeile("SELECT zeit, art, nachricht_id, nutzer, details FROM ereignis WHERE art = 'probe'");
    gleich(['zeit' => $mittag, 'art' => 'probe', 'nachricht_id' => $n1, 'nutzer' => 'tester', 'details' => '{"grund":"Prüfung","anzahl":3}'], $e, 'ereignis() schreibt Zeit, Art, Bezug, Nutzer und Details');
    Speicher::ereignis('probe_leer', null, 'system');
    gleich(['nachricht_id' => null, 'details' => '{}'], $zeile("SELECT nachricht_id, details FROM ereignis WHERE art = 'probe_leer'"), 'ereignis() ohne Bezug und ohne Details');
    Speicher::ereignis('probe_lang', null, 'system', ['inhalt' => str_repeat('Mailtext, der hier nichts verloren hat. ', 100)]);
    $lang = (string) $wert("SELECT details FROM ereignis WHERE art = 'probe_lang'");
    enthaelt('"gekuerzt":true', $lang, 'Übergroße Details werden nicht gespeichert, nur ihre Feldnamen');
    enthaelt_nicht('Mailtext', $lang, 'Übergroße Details: kein Inhalt im Protokoll');

    // -- Speicher: bedingter Statuswechsel -----------------------------------------
    abschnitt('A · Speicher: bedingter Statuswechsel');
    $uhr($mittag + 60);
    pruefe(Speicher::wechsle('nachricht', $n1, 'wartet_ki', 'entwurf', ['status_grund' => 'probe', 'versuche' => 2]), 'Wechsel wartet_ki → entwurf gelingt');
    pruefe(!Speicher::wechsle('nachricht', $n1, 'wartet_ki', 'entwurf'), 'Derselbe Wechsel trifft kein zweites Mal');
    gleich(
        ['status' => 'entwurf', 'status_grund' => 'probe', 'versuche' => 2, 'aktualisiert_am' => $mittag + 60],
        $zeile('SELECT status, status_grund, versuche, aktualisiert_am FROM nachricht WHERE id = ?', [$n1]),
        'Status, weitere Spalten und aktualisiert_am sind gesetzt'
    );
    pruefe(!Speicher::wechsle('nachricht', $n1, 'gesendet', 'verworfen', ['status_grund' => 'falsch']), 'Falscher Ausgangsstatus: kein Wechsel');
    gleich(['status' => 'entwurf', 'status_grund' => 'probe'], $zeile('SELECT status, status_grund FROM nachricht WHERE id = ?', [$n1]), 'Nach einem Fehlversuch ist nichts verändert');
    pruefe(!Speicher::wechsle('nachricht', 999999, 'wartet_ki', 'entwurf'), 'Unbekannte Nachricht: kein Wechsel');
    pruefe(Speicher::wechsle('nachricht', $n1, 'entwurf', 'entwurf', ['status_grund' => '']), 'Wechsel auf denselben Status (nur Grund ändern) zählt als Treffer');

    $e1 = $fuegeEin('entwurf', ['nachricht_id' => $n1, 'text_vorlage' => 'Vorlage', 'text_final' => 'Fertig']);
    gleich('offen', $wert('SELECT status FROM entwurf WHERE id = ?', [$e1]), 'Neuer Entwurf ist offen');
    pruefe(Speicher::wechsle('entwurf', $e1, 'offen', 'sendet', ['gesendet_message_id' => '<probe@kfz-zulassungsprofis.de>']), 'Entwurf offen → sendet gelingt');
    pruefe(!Speicher::wechsle('entwurf', $e1, 'offen', 'sendet'), 'Zweiter Sendeversuch trifft nicht (Schutz vor doppeltem Versand)');
    gleich('<probe@kfz-zulassungsprofis.de>', $wert('SELECT gesendet_message_id FROM entwurf WHERE id = ?', [$e1]), 'Message-ID ist vor dem Versand gespeichert');
    pruefe(Speicher::wechsle('entwurf', $e1, 'sendet', 'gesendet', ['geaendert' => true, 'freigegeben_am' => $mittag + 60]), 'Entwurf sendet → gesendet');
    gleich(1, $wert('SELECT geaendert FROM entwurf WHERE id = ?', [$e1]), 'Wahrheitswert wird als 1 gespeichert');
    pruefe($wirft(static fn () => Speicher::wechsle('verbrauch', 1, 'a', 'b'), \InvalidArgumentException::class), 'Andere Tabellen sind nicht erlaubt');
    pruefe($wirft(static fn () => Speicher::wechsle('nachricht', $n1, 'entwurf', 'gesendet', ['status = status, betreff' => 'x']), \InvalidArgumentException::class), 'Unbekannte Spaltennamen werden abgelehnt');
    gleich('entwurf', $wert('SELECT status FROM nachricht WHERE id = ?', [$n1]), 'Abgelehnter Aufruf ändert nichts');

    // -- Speicher: Belegung ------------------------------------------------------
    abschnitt('A · Speicher: Belegung (in_arbeit_bis)');
    $uhr($mittag);
    pruefe(Speicher::belege($n1), 'Freie Nachricht lässt sich belegen');
    gleich($mittag + 120, $wert('SELECT in_arbeit_bis FROM nachricht WHERE id = ?', [$n1]), 'Belegung gilt 120 Sekunden');
    pruefe(!Speicher::belege($n1), 'Belegte Nachricht lässt sich nicht noch einmal belegen');
    $uhr($mittag + 119);
    pruefe(!Speicher::belege($n1), 'Kurz vor Ablauf: weiterhin belegt');
    $uhr($mittag + 120);
    pruefe(Speicher::belege($n1, 30), 'Nach Ablauf der Frist wieder belegbar');
    gleich($mittag + 150, $wert('SELECT in_arbeit_bis FROM nachricht WHERE id = ?', [$n1]), 'Eigene Dauer wird übernommen');
    pruefe(!Speicher::belege($n1), 'Neue Belegung gilt');
    Speicher::gibFrei($n1);
    pruefe(Speicher::belege($n1), 'Nach gibFrei() sofort wieder belegbar');
    Speicher::gibFrei($n1);
    pruefe(!Speicher::belege(999999), 'Unbekannte Nachricht lässt sich nicht belegen');
    $db->prepare('UPDATE nachricht SET in_arbeit_bis = NULL WHERE id = ?')->execute([$n1]);
    pruefe(Speicher::belege($n1), 'Auch NULL in in_arbeit_bis gilt als frei');
    Speicher::gibFrei($n1);

    // -- Speicher: Zähler --------------------------------------------------------
    abschnitt('A · Speicher: Zähler mit Fenster');
    $uhr($mittag);
    gleich(0, Speicher::zaehlerstand('probe', 60), 'Unbekannter Zähler steht auf 0');
    gleich(1, Speicher::zaehle('probe', 60), 'Erster Treffer');
    gleich(2, Speicher::zaehle('probe', 60), 'Zweiter Treffer');
    gleich(1, Speicher::zaehle('anderer', 60), 'Anderer Schlüssel zählt für sich');
    $uhr($mittag + 59);
    gleich(3, Speicher::zaehle('probe', 60), 'Kurz vor Fensterende zählt weiter');
    gleich(3, Speicher::zaehlerstand('probe', 60), 'zaehlerstand() erhöht nicht');
    $uhr($mittag + 60);
    gleich(0, Speicher::zaehlerstand('probe', 60), 'Fenster abgelaufen: Stand 0');
    gleich(1, Speicher::zaehle('probe', 60), 'Neues Fenster beginnt bei 1');
    $uhr($mittag + 100);
    gleich(2, Speicher::zaehle('probe', 60), 'Das neue Fenster läuft ab seinem eigenen Beginn');
    $uhr($mittag + 5000);
    gleich(1, Speicher::zaehle('rueckwaerts', 60), 'Zähler in der „Zukunft“ angelegt');
    $uhr($mittag);
    gleich(0, Speicher::zaehlerstand('rueckwaerts', 60), 'Zurückgestellte Uhr: Stand 0 statt ewiger Sperre');
    gleich(1, Speicher::zaehle('rueckwaerts', 60), 'Zurückgestellte Uhr: Zähler beginnt neu');

    // -- Budget: Kosten ----------------------------------------------------------
    abschnitt('A · Budget: Kostenrechnung');
    gleich('2026-11-22', Budget::PREISE['stand'], 'Stand der Preise');
    gleich(['eingabe' => 0.10, 'ausgabe' => 0.50, 'cache_5m' => 0.125, 'cache_1h' => 0.20, 'cache_lesen' => 0.01], Budget::PREISE['claude-haiku-5-5'], 'Preise Haiku 5.5');
    gleich(['eingabe' => 2.00, 'ausgabe' => 10.00, 'cache_5m' => 2.50, 'cache_1h' => 4.00, 'cache_lesen' => 0.10], Budget::PREISE['claude-sonnet-5-5'], 'Preise Sonnet 5.5');
    gleich(1350, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Haiku: 10.000 Eingabe + 700 Ausgabe = 1.350');
    gleich(27000, Budget::kostenMikroUsd('claude-sonnet-5-5', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Sonnet: 10.000 Eingabe + 700 Ausgabe = 27.000');
    gleich(1250, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 500, 'cache_schreiben_5m' => 8000, 'output_tokens' => 400]), 'Haiku mit Cache-Schreiben 5 min');
    gleich(1850, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 500, 'cache_schreiben_1h' => 8000, 'output_tokens' => 400]), 'Haiku mit Cache-Schreiben 1 h');
    gleich(330, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 500, 'cache_lesen' => 8000, 'output_tokens' => 400]), 'Haiku mit Cache-Lesen');
    gleich(25800, Budget::kostenMikroUsd('claude-sonnet-5-5', ['input_tokens' => 500, 'cache_schreiben_5m' => 8000, 'cache_lesen' => 8000, 'output_tokens' => 400]), 'Sonnet mit Cache-Schreiben und -Lesen');
    gleich(1350, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 10000, 'output_tokens' => 700, 'denk_tokens' => 300]), 'Denk-Tokens werden nicht doppelt berechnet');
    gleich(1, Budget::kostenMikroUsd('claude-haiku-5-5', ['cache_lesen' => 1]), 'Bruchteile werden aufgerundet');
    gleich(1, Budget::kostenMikroUsd('claude-haiku-5-5', ['cache_schreiben_5m' => 1]), '0,125 je Token rundet auf 1');
    gleich(1, Budget::kostenMikroUsd('claude-haiku-5-5', ['cache_schreiben_5m' => 8]), '8 × 0,125 ist genau 1 (kein Gleitkomma-Aufschlag)');
    gleich(0, Budget::kostenMikroUsd('claude-haiku-5-5', []), 'Ohne Tokens keine Kosten');
    gleich(0, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => -5, 'output_tokens' => 'viele']), 'Unsinnige Angaben zählen als 0');
    gleich(27000, Budget::kostenMikroUsd('modell-das-es-nicht-gibt', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Unbekanntes Modell: Sonnet-Preise (lieber zu hoch)');
    gleich(27000, Budget::kostenMikroUsd('', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Leerer Modellname: Sonnet-Preise');
    gleich(1350, Budget::kostenMikroUsd('claude-haiku-5-5-20261101', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Datierte Fassung zählt zum gleichnamigen Modell');
    gleich(27000, Budget::kostenMikroUsd('claude-haiku-5-50', ['input_tokens' => 10000, 'output_tokens' => 700]), 'Nur ähnlicher Name gilt als unbekannt');
    gleich(10500, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 100000, 'output_tokens' => 1000]), 'Haiku bis 100.000 Tokens Eingabe: normaler Preis');
    gleich(77500, Budget::kostenMikroUsd('claude-haiku-5-5', ['input_tokens' => 150000, 'output_tokens' => 1000]), 'Haiku über 100.000 Tokens Eingabe: fünffacher Preis');

    gleich(2889, Budget::schaetzeHoechstpreis('claude-haiku-5-5', 25000, 3000), 'Schätzung Haiku: 25.000 Zeichen ÷ 1,8 (gemessen 1,82) und 3.000 Ausgabe');
    gleich(57778, Budget::schaetzeHoechstpreis('claude-sonnet-5-5', 25000, 3000), 'Schätzung Sonnet');
    gleich(4278, Budget::schaetzeHoechstpreis('claude-haiku-5-5', 25000, 3000, '1h'), 'Schätzung Haiku mit Cache: Eingabe zum Preis des 1-Stunden-Schreibens');
    gleich(64723, Budget::schaetzeHoechstpreis('claude-sonnet-5-5', 25000, 3000, '5m'), 'Schätzung Sonnet mit Cache: Eingabe zum Preis des 5-Minuten-Schreibens');
    $gemessen = Budget::kostenMikroUsd('claude-haiku-5-5', ['cache_schreiben_1h' => 22809, 'input_tokens' => 900, 'output_tokens' => 3000]);
    pruefe(Budget::schaetzeHoechstpreis('claude-haiku-5-5', 41515 + 1600, 3000, '1h') >= $gemessen,
        'Schätzung liegt nicht unter dem echten Höchstwert (41.515 Zeichen = 22.809 Tokens gemessen, K3)');
    gleich(1501, Budget::schaetzeHoechstpreis('claude-haiku-5-5', 1, 3000), 'Schätzung rundet die Eingabe auf ganze Tokens auf');
    gleich(0, Budget::schaetzeHoechstpreis('claude-haiku-5-5', -10, -10), 'Schätzung mit unsinnigen Angaben ist 0');

    // -- Budget: Tages- und Monatsgrenzen ----------------------------------------
    abschnitt('A · Budget: Grenzen nach Berliner Zeit');
    gleich(gmmktime(23, 0, 0, 11, 21, 2026), Budget::tagesbeginn($mittag), 'Tagesbeginn im Winter: 0 Uhr Berlin = 23 Uhr UTC am Vortag');
    gleich(gmmktime(23, 0, 0, 10, 31, 2026), Budget::monatsbeginn($mittag), 'Monatsbeginn: 1.11., 0 Uhr Berlin');
    gleich(gmmktime(22, 0, 0, 7, 14, 2026), Budget::tagesbeginn(gmmktime(10, 0, 0, 7, 15, 2026)), 'Tagesbeginn im Sommer: 0 Uhr Berlin = 22 Uhr UTC am Vortag');
    gleich(gmmktime(23, 0, 0, 3, 28, 2026), Budget::tagesbeginn(gmmktime(12, 0, 0, 3, 29, 2026)), 'Tag der Zeitumstellung beginnt noch in Winterzeit');
    gleich(gmmktime(23, 0, 0, 11, 21, 2026), Budget::tagesbeginn(gmmktime(23, 30, 0, 11, 21, 2026)), '0:30 Uhr Berlin gehört schon zum neuen Tag');
    gleich(gmmktime(23, 0, 0, 12, 31, 2025), Budget::monatsbeginn(gmmktime(23, 30, 0, 12, 31, 2025)), 'Silvester 23:30 UTC ist in Berlin schon Januar');
    $uhr($mittag);
    gleich(Budget::tagesbeginn($mittag), Budget::tagesbeginn(), 'Ohne Angabe gilt die aktuelle Zeit');

    // -- Budget: darfAufrufen ----------------------------------------------------
    abschnitt('A · Budget: darfAufrufen in jeder Sperr-Stufe');
    $ordner = $ordnerWechsel('teil-a-budget');
    $uhr($mittag);
    $adresse = 'max.beispiel@example.org';
    $nb = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 1, 'status' => 'wartet_ki', 'von_adresse' => $adresse]);
    $umgebung('ANTHROPIC_API_KEY', $platzhalterSchluessel);

    gleich(['ok' => false, 'grund' => 'pausiert'], Budget::darfAufrufen($adresse), 'Auslieferungszustand: pausiert');
    Speicher::setze('ki_aktiv', '1', 'tester');
    gleich(['ok' => true, 'grund' => ''], Budget::darfAufrufen($adresse), 'KI aktiv, nichts gebucht: erlaubt');

    touch($ordner . '/STOP');
    gleich(['ok' => false, 'grund' => 'pausiert'], Budget::darfAufrufen($adresse), 'Datei STOP pausiert trotz aktivem Schalter');
    pruefe(Budget::stand()['stop_datei'] === true, 'stand() meldet die Datei STOP');
    unlink($ordner . '/STOP');
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Ohne STOP wieder erlaubt');

    Budget::sperre('Ausgabenlimit bei Anthropic erreicht', $mittag + 3600);
    gleich(['ok' => false, 'grund' => 'sperre'], Budget::darfAufrufen($adresse), 'Sperre in der Zukunft blockiert');
    gleich(['aktiv' => true, 'bis' => $mittag + 3600, 'grund' => 'Ausgabenlimit bei Anthropic erreicht'], Budget::stand()['sperre'], 'stand() nennt Sperre und Grund');
    gleich(1, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'sperre'"), 'sperre() schreibt ein Ereignis');
    Budget::sperre('kürzer', $mittag + 60);
    gleich((string) ($mittag + 3600), Speicher::einstellung('sperre_bis'), 'Eine längere Sperre wird nicht verkürzt');
    gleich('Ausgabenlimit bei Anthropic erreicht', Speicher::einstellung('sperre_grund'), 'Der Grund der längeren Sperre bleibt');
    $umgebung('ANTHROPIC_API_KEY', '');
    gleich('sperre', Budget::darfAufrufen($adresse)['grund'], 'Sperre wird vor dem fehlenden Schlüssel genannt');
    Speicher::setze('ki_aktiv', '0', 'tester');
    gleich('pausiert', Budget::darfAufrufen($adresse)['grund'], 'Pause wird vor der Sperre genannt');
    Speicher::setze('ki_aktiv', '1', 'tester');
    $umgebung('ANTHROPIC_API_KEY', $platzhalterSchluessel);
    $uhr($mittag + 3600);
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Sperre läuft von selbst ab');
    gleich(['aktiv' => false, 'bis' => 0, 'grund' => ''], Budget::stand()['sperre'], 'stand(): abgelaufene Sperre gilt als keine');
    $uhr($mittag);
    Budget::sperre('', 0);
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'sperre() mit Zeit in der Vergangenheit hebt auf');
    gleich('0', Speicher::einstellung('sperre_bis'), 'Aufgehobene Sperre: sperre_bis = 0');

    $umgebung('ANTHROPIC_API_KEY', '');
    gleich(['ok' => false, 'grund' => 'kein_schluessel'], Budget::darfAufrufen($adresse), 'Ohne Schlüssel kein Aufruf');
    $umgebung('ANTHROPIC_API_KEY', $platzhalterSchluessel);

    // Monatslimit (10 USD): Buchung vor fünf Tagen, heute noch nichts.
    Budget::buche(['zeit' => $mittag - 5 * $tag, 'modell' => 'claude-sonnet-5-5', 'kosten_mikro_usd' => 9999999]);
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Knapp unter dem Monatslimit: erlaubt');
    Budget::buche(['zeit' => $mittag - 5 * $tag, 'modell' => 'claude-sonnet-5-5', 'kosten_mikro_usd' => 1]);
    gleich(['ok' => false, 'grund' => 'limit_monat'], Budget::darfAufrufen($adresse), 'Monatssumme erreicht das Limit');
    Budget::buche(['modell' => 'claude-sonnet-5-5', 'kosten_mikro_usd' => 1000000]);
    gleich('limit_monat', Budget::darfAufrufen($adresse)['grund'], 'Monatslimit wird vor dem Tageslimit genannt');
    Speicher::setze('limit_monat_usd', '50', 'tester');
    gleich(['ok' => false, 'grund' => 'limit_tag'], Budget::darfAufrufen($adresse), 'Tagessumme erreicht das Limit (1 USD)');
    Speicher::setze('limit_tag_usd', '2,5', 'tester');
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Höheres Tageslimit (mit Komma geschrieben): erlaubt');
    Speicher::setze('limit_tag_usd', 'viel', 'tester');
    gleich('limit_tag', Budget::darfAufrufen($adresse)['grund'], 'Unlesbares Limit: es gilt der niedrige Standard');
    Speicher::setze('limit_tag_usd', '0', 'tester');
    gleich('limit_tag', Budget::darfAufrufen($adresse)['grund'], 'Limit 0 erlaubt keinen Aufruf');
    Speicher::setze('limit_tag_usd', '5', 'tester');

    // Aufrufe je Tag: Gestern zählt nicht, Fehlversuche zählen mit.
    Speicher::setze('limit_aufrufe_tag', '3', 'tester');
    Budget::buche(['zeit' => Budget::tagesbeginn($mittag) - 1, 'modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => 0]);
    Budget::buche(['modell' => 'claude-haiku-5-5', 'http_status' => 529, 'fehler' => 'überlastet']);
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Zwei Aufrufe heute bei Limit 3: erlaubt (der von gestern zählt nicht)');
    Budget::buche(['zeit' => Budget::tagesbeginn($mittag), 'modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => 0]);
    gleich(['ok' => false, 'grund' => 'limit_aufrufe'], Budget::darfAufrufen($adresse), 'Dritter Aufruf heute (Punkt 0 Uhr): Limit erreicht');
    Speicher::setze('limit_aufrufe_tag', '150', 'tester');

    // Aufrufe je Absender und Tag.
    Speicher::setze('limit_je_absender_tag', '2', 'tester');
    Budget::buche(['zeit' => $mittag - $tag, 'modell' => 'claude-haiku-5-5', 'nachricht_id' => $nb, 'kosten_mikro_usd' => 0]);
    Budget::buche(['modell' => 'claude-haiku-5-5', 'nachricht_id' => $nb, 'kosten_mikro_usd' => 0]);
    pruefe(Budget::darfAufrufen($adresse)['ok'], 'Ein Aufruf heute für diesen Absender bei Limit 2: erlaubt');
    Budget::buche(['modell' => 'claude-haiku-5-5', 'nachricht_id' => $nb, 'kosten_mikro_usd' => 0]);
    gleich(['ok' => false, 'grund' => 'limit_absender'], Budget::darfAufrufen($adresse), 'Zweiter Aufruf heute für diesen Absender: Limit erreicht');
    gleich('limit_absender', Budget::darfAufrufen('  Max.Beispiel@Example.org ')['grund'], 'Absender wird ohne Rücksicht auf Schreibweise erkannt');
    pruefe(Budget::darfAufrufen('erika.muster@example.org')['ok'], 'Anderer Absender ist nicht betroffen');
    pruefe(Budget::darfAufrufen('')['ok'], 'Ohne Absender entfällt die Absenderprüfung');

    $stand = Budget::stand();
    gleich(['heute_usd', 'monat_usd', 'aufrufe_heute', 'limits', 'ki_aktiv', 'sperre', 'stop_datei'], array_keys($stand), 'stand(): Felder');
    gleich(1000000, $mikro($stand['heute_usd']), 'stand(): heute 1 USD');
    gleich(11000000, $mikro($stand['monat_usd']), 'stand(): Monat 11 USD');
    gleich(5, $stand['aufrufe_heute'], 'stand(): fünf Aufrufe heute');
    gleich(['limit_monat_usd' => 50.0, 'limit_tag_usd' => 5.0, 'limit_aufrufe_tag' => 150, 'limit_je_absender_tag' => 2], $stand['limits'], 'stand(): Limits als Zahlen');
    gleich(true, $stand['ki_aktiv'], 'stand(): KI aktiv');

    // -- Budget: buche -----------------------------------------------------------
    abschnitt('A · Budget: Buchung');
    $ordnerWechsel('teil-a-buchung');
    $uhr($mittag);
    Budget::buche(['modell' => 'claude-haiku-5-5', 'input_tokens' => 10000, 'output_tokens' => 700]);
    gleich(
        ['zeit' => $mittag, 'kanal' => 'email', 'zweck' => 'entwurf', 'modell' => 'claude-haiku-5-5', 'nachricht_id' => null,
         'request_id' => '', 'input_tokens' => 10000, 'cache_schreiben_5m' => 0, 'cache_schreiben_1h' => 0, 'cache_lesen' => 0,
         'output_tokens' => 700, 'denk_tokens' => 0, 'kosten_mikro_usd' => 1350, 'geschaetzt' => 0, 'stop_reason' => '',
         'http_status' => 0, 'dauer_ms' => 0, 'fehler' => ''],
        array_diff_key($zeile('SELECT * FROM verbrauch WHERE id = 1'), ['id' => 0]),
        'Fehlende Felder werden 0 bzw. leer, Kosten aus den Tokens gerechnet'
    );
    Budget::buche([
        'zeit' => $mittag - 30, 'kanal' => 'email', 'zweck' => 'eskalation', 'modell' => 'claude-sonnet-5-5', 'nachricht_id' => 42,
        'request_id' => 'req_probe', 'input_tokens' => 1200, 'cache_schreiben_5m' => 10, 'cache_schreiben_1h' => 20, 'cache_lesen' => 30,
        'output_tokens' => 400, 'denk_tokens' => 50, 'kosten_mikro_usd' => 6508, 'geschaetzt' => 0, 'stop_reason' => 'end_turn',
        'http_status' => 200, 'dauer_ms' => 1834, 'fehler' => '',
    ]);
    gleich(
        ['zeit' => $mittag - 30, 'kanal' => 'email', 'zweck' => 'eskalation', 'modell' => 'claude-sonnet-5-5', 'nachricht_id' => 42,
         'request_id' => 'req_probe', 'input_tokens' => 1200, 'cache_schreiben_5m' => 10, 'cache_schreiben_1h' => 20, 'cache_lesen' => 30,
         'output_tokens' => 400, 'denk_tokens' => 50, 'kosten_mikro_usd' => 6508, 'geschaetzt' => 0, 'stop_reason' => 'end_turn',
         'http_status' => 200, 'dauer_ms' => 1834, 'fehler' => ''],
        array_diff_key($zeile('SELECT * FROM verbrauch WHERE id = 2'), ['id' => 0]),
        'Vollständige Zeile wird unverändert gebucht'
    );
    Budget::buche(['modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => Budget::schaetzeHoechstpreis('claude-haiku-5-5', 25000, 3000), 'geschaetzt' => true, 'fehler' => 'Zeitüberschreitung']);
    gleich(['kosten_mikro_usd' => 2889, 'geschaetzt' => 1, 'fehler' => 'Zeitüberschreitung'], $zeile('SELECT kosten_mikro_usd, geschaetzt, fehler FROM verbrauch WHERE id = 3'), 'Geschätzte Buchung nach ausgebliebener Antwort');
    Budget::buche(['modell' => 'claude-haiku-5-5', 'usage' => ['input_tokens' => 2000, 'output_tokens' => 100, 'cache_lesen' => 5000]]);
    gleich(['input_tokens' => 2000, 'output_tokens' => 100, 'cache_lesen' => 5000, 'kosten_mikro_usd' => 300], $zeile('SELECT input_tokens, output_tokens, cache_lesen, kosten_mikro_usd FROM verbrauch WHERE id = 4'), 'Token-Zahlen dürfen gesammelt unter usage stehen');
    $falscherSchluessel = 'sk-' . 'ant-' . 'nur-ein-testwert-0000';
    Budget::buche(['modell' => 'claude-haiku-5-5', 'http_status' => 401, 'fehler' => "Abgelehnt:\n" . $falscherSchluessel . ' ' . str_repeat('x', 600)]);
    $fehlertext = (string) $wert('SELECT fehler FROM verbrauch WHERE id = 5');
    enthaelt_nicht('testwert', $fehlertext, 'Ein Schlüssel im Fehlertext wird nicht gespeichert');
    enthaelt('[Schlüssel]', $fehlertext, 'An seiner Stelle steht ein Platzhalter');
    pruefe(mb_strlen($fehlertext) <= 300 && !str_contains($fehlertext, "\n"), 'Fehlertext ist einzeilig und höchstens 300 Zeichen lang');
    gleich(0, $wert('SELECT kosten_mikro_usd FROM verbrauch WHERE id = 5'), 'Gescheiterter Aufruf ohne Tokens kostet 0');
    // Ergebnis in der Form von Claude::rufe (Bauplan 4.12), ergänzt um Modell, Zweck und Bezug.
    Budget::buche([
        'modell' => 'claude-haiku-5-5', 'zweck' => 'entwurf', 'nachricht_id' => 7,
        'ok' => false, 'daten' => null, 'stop' => 'refusal', 'request_id' => 'req_probe_2', 'http' => 200, 'dauer_ms' => 900,
        'fehler' => '', 'fehler_art' => 'abgelehnt',
        'usage' => ['input_tokens' => 3000, 'output_tokens' => 20, 'cache_schreiben_5m' => 0, 'cache_schreiben_1h' => 0, 'cache_lesen' => 0, 'denk_tokens' => 0],
    ]);
    gleich(
        ['nachricht_id' => 7, 'request_id' => 'req_probe_2', 'input_tokens' => 3000, 'output_tokens' => 20, 'kosten_mikro_usd' => 310,
         'stop_reason' => 'refusal', 'http_status' => 200, 'dauer_ms' => 900, 'fehler' => 'abgelehnt'],
        $zeile('SELECT nachricht_id, request_id, input_tokens, output_tokens, kosten_mikro_usd, stop_reason, http_status, dauer_ms, fehler FROM verbrauch WHERE id = 6'),
        'Ein Ergebnis von Claude::rufe lässt sich ohne Umbenennen buchen (usage, http, stop, fehler_art)'
    );

    // -- Budget: Übersicht -------------------------------------------------------
    abschnitt('A · Budget: Übersicht mit gebuchten Zeilen');
    $ordnerWechsel('teil-a-uebersicht');
    $uhr($mittag);
    $leer = Budget::uebersicht();
    gleich(
        ['heute', 'monat', 'limits', 'je_tag', 'je_monat', 'je_kanal', 'je_modell', 'je_zweck', 'bearbeitet_monat',
         'kosten_je_anfrage_usd', 'kosten_je_aufruf_usd', 'ohne_ki_monat', 'preise_stand'],
        array_keys($leer),
        'uebersicht() liefert genau die Felder des Bauplans'
    );
    gleich(['usd' => 0.0, 'aufrufe' => 0], $leer['heute'], 'Leere Datenbank: heute 0');
    gleich(0.0, $leer['kosten_je_anfrage_usd'], 'Leere Datenbank: keine Teilung durch 0');
    gleich(0.0, $leer['kosten_je_aufruf_usd'], 'Leere Datenbank: Kosten je Aufruf 0');
    gleich([], $leer['je_modell'], 'Leere Datenbank: keine Aufteilung');

    Budget::buche(['modell' => 'claude-haiku-5-5', 'zweck' => 'entwurf', 'input_tokens' => 10000, 'output_tokens' => 700]);
    Budget::buche(['modell' => 'claude-sonnet-5-5', 'zweck' => 'eskalation', 'input_tokens' => 10000, 'output_tokens' => 700]);
    Budget::buche(['zeit' => gmmktime(9, 0, 0, 11, 3, 2026), 'modell' => 'claude-haiku-5-5', 'zweck' => 'entwurf', 'kosten_mikro_usd' => 650]);
    Budget::buche(['zeit' => gmmktime(9, 0, 0, 10, 15, 2026), 'modell' => 'claude-haiku-5-5', 'zweck' => 'test', 'kosten_mikro_usd' => 5000]);
    Budget::buche(['zeit' => gmmktime(9, 0, 0, 12, 10, 2025), 'modell' => 'claude-haiku-5-5', 'zweck' => 'entwurf', 'kosten_mikro_usd' => 100]);
    Budget::buche(['zeit' => gmmktime(9, 0, 0, 11, 10, 2025), 'modell' => 'claude-haiku-5-5', 'zweck' => 'entwurf', 'kosten_mikro_usd' => 999]);

    $nu1 = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 1, 'status' => 'entwurf', 'erstellt_am' => $mittag - 3600]);
    $nu2 = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 2, 'status' => 'entwurf', 'erstellt_am' => $mittag - 3600]);
    $nu3 = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 3, 'status' => 'gesendet', 'erstellt_am' => $mittag - 40 * $tag]);
    $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 4, 'status' => 'ohne_ki', 'regel_kategorie' => 'newsletter', 'erstellt_am' => $mittag - 3600]);
    $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 5, 'status' => 'ohne_ki', 'regel_kategorie' => 'formular', 'erstellt_am' => $mittag - 2 * $tag]);
    $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 6, 'status' => 'ohne_ki', 'regel_kategorie' => 'newsletter', 'erstellt_am' => $mittag - 40 * $tag]);
    $fuegeEin('entwurf', ['nachricht_id' => $nu1, 'version' => 1, 'status' => 'ueberholt', 'erstellt_am' => $mittag - 3000]);
    $fuegeEin('entwurf', ['nachricht_id' => $nu1, 'version' => 2, 'erstellt_am' => $mittag - 2000]);
    $fuegeEin('entwurf', ['nachricht_id' => $nu2, 'version' => 1, 'erstellt_am' => $mittag - 1000]);
    $fuegeEin('entwurf', ['nachricht_id' => $nu3, 'version' => 1, 'status' => 'gesendet', 'erstellt_am' => $mittag - 40 * $tag]);

    $u = Budget::uebersicht();
    gleich(['usd' => 28350, 'aufrufe' => 2], ['usd' => $mikro($u['heute']['usd']), 'aufrufe' => $u['heute']['aufrufe']], 'heute: 1.350 + 27.000 Mikro-USD, zwei Aufrufe');
    gleich(['usd' => 29000, 'aufrufe' => 3], ['usd' => $mikro($u['monat']['usd']), 'aufrufe' => $u['monat']['aufrufe']], 'Monat: 29.000 Mikro-USD, drei Aufrufe');
    gleich(['limit_monat_usd' => 10.0, 'limit_tag_usd' => 1.0, 'limit_aufrufe_tag' => 150, 'limit_je_absender_tag' => 6], $u['limits'], 'limits: Standardwerte als Zahlen');

    gleich(30, count($u['je_tag']), 'je_tag: 30 Tage');
    gleich(['tag', 'usd', 'aufrufe'], array_keys($u['je_tag'][0]), 'je_tag: Felder tag, usd, aufrufe');
    gleich('2026-10-24', $u['je_tag'][0]['tag'], 'je_tag beginnt vor 29 Tagen');
    gleich(['tag' => '2026-11-22', 'usd' => 28350, 'aufrufe' => 2], ['tag' => $u['je_tag'][29]['tag'], 'usd' => $mikro($u['je_tag'][29]['usd']), 'aufrufe' => $u['je_tag'][29]['aufrufe']], 'je_tag endet heute');
    $tage = array_column($u['je_tag'], null, 'tag');
    gleich(['usd' => 650, 'aufrufe' => 1], ['usd' => $mikro($tage['2026-11-03']['usd']), 'aufrufe' => $tage['2026-11-03']['aufrufe']], 'je_tag: Buchung vom 3.11. steht an ihrem Tag');
    gleich(['usd' => 0.0, 'aufrufe' => 0], ['usd' => $tage['2026-11-04']['usd'], 'aufrufe' => $tage['2026-11-04']['aufrufe']], 'je_tag: Tage ohne Aufruf stehen mit 0 in der Reihe');
    gleich(3, array_sum(array_column($u['je_tag'], 'aufrufe')), 'je_tag: Buchungen außerhalb der 30 Tage fehlen');
    gleich(count($u['je_tag']), count(array_unique(array_column($u['je_tag'], 'tag'))), 'je_tag: kein Tag doppelt');

    gleich(12, count($u['je_monat']), 'je_monat: 12 Monate');
    gleich(['monat', 'usd', 'aufrufe'], array_keys($u['je_monat'][0]), 'je_monat: Felder monat, usd, aufrufe');
    gleich(['monat' => '2025-12', 'usd' => 100, 'aufrufe' => 1], ['monat' => $u['je_monat'][0]['monat'], 'usd' => $mikro($u['je_monat'][0]['usd']), 'aufrufe' => $u['je_monat'][0]['aufrufe']], 'je_monat beginnt vor elf Monaten');
    gleich(['monat' => '2026-10', 'usd' => 5000, 'aufrufe' => 1], ['monat' => $u['je_monat'][10]['monat'], 'usd' => $mikro($u['je_monat'][10]['usd']), 'aufrufe' => $u['je_monat'][10]['aufrufe']], 'je_monat: Oktober');
    gleich(['monat' => '2026-11', 'usd' => 29000, 'aufrufe' => 3], ['monat' => $u['je_monat'][11]['monat'], 'usd' => $mikro($u['je_monat'][11]['usd']), 'aufrufe' => $u['je_monat'][11]['aufrufe']], 'je_monat endet mit dem laufenden Monat');
    gleich(5, array_sum(array_column($u['je_monat'], 'aufrufe')), 'je_monat: Buchung von vor über zwölf Monaten fehlt');

    gleich(
        [['modell' => 'claude-sonnet-5-5', 'usd' => 27000, 'aufrufe' => 1], ['modell' => 'claude-haiku-5-5', 'usd' => 2000, 'aufrufe' => 2]],
        array_map(static fn (array $z): array => ['modell' => $z['modell'], 'usd' => $mikro($z['usd']), 'aufrufe' => $z['aufrufe']], $u['je_modell']),
        'je_modell: laufender Monat, teuerstes zuerst'
    );
    gleich(
        [['zweck' => 'eskalation', 'usd' => 27000, 'aufrufe' => 1], ['zweck' => 'entwurf', 'usd' => 2000, 'aufrufe' => 2]],
        array_map(static fn (array $z): array => ['zweck' => $z['zweck'], 'usd' => $mikro($z['usd']), 'aufrufe' => $z['aufrufe']], $u['je_zweck']),
        'je_zweck: laufender Monat'
    );
    gleich(
        [['kanal' => 'email', 'usd' => 29000, 'aufrufe' => 3]],
        array_map(static fn (array $z): array => ['kanal' => $z['kanal'], 'usd' => $mikro($z['usd']), 'aufrufe' => $z['aufrufe']], $u['je_kanal']),
        'je_kanal: laufender Monat'
    );
    gleich(2, $u['bearbeitet_monat'], 'bearbeitet_monat: zwei Nachrichten mit Entwurf (zwei Fassungen zählen einmal)');
    gleich(14500, $mikro($u['kosten_je_anfrage_usd']), 'kosten_je_anfrage_usd: Monatskosten ÷ bearbeitete Nachrichten');
    gleich(9666, $mikro($u['kosten_je_aufruf_usd']), 'kosten_je_aufruf_usd: Monatskosten ÷ Aufrufe');
    gleich(2, $u['ohne_ki_monat'], 'ohne_ki_monat: von der Regelstufe erledigt, nur dieser Monat');
    gleich('2026-11-22', $u['preise_stand'], 'preise_stand');

    // -- Speicher: Löschlauf -----------------------------------------------------
    abschnitt('A · Speicher: Löschlauf');
    $ordner = $ordnerWechsel('teil-a-loeschlauf');
    $uhr($mittag);
    $db = Speicher::db();
    $geheimtext = 'Loeschprobe-4711 – dieser erfundene Mailtext muss nach der Frist verschwunden sein';
    $geheimname = 'Vorname Loeschprobe-Nachname';
    $alt = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 1, 'status' => 'gesendet', 'von_adresse' => 'loeschprobe-adresse@example.org',
        'von_name' => $geheimname, 'betreff' => 'Loeschprobe-Betreff zur Abmeldung', 'text_bereinigt' => $geheimtext, 'eingang_am' => $mittag - 91 * $tag, 'erstellt_am' => $mittag - 91 * $tag]);
    $neu = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 2, 'status' => 'entwurf', 'von_name' => 'Erika Muster',
        'text_bereinigt' => 'Text innerhalb der Frist', 'eingang_am' => $mittag - 89 * $tag, 'erstellt_am' => $mittag - 89 * $tag]);
    $ohneZeit = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 3, 'status' => 'ohne_ki', 'text_bereinigt' => 'Text ohne Speicherzeit',
        'eingang_am' => $mittag - 100 * $tag, 'erstellt_am' => 0]);
    $altesDatum = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 4, 'status' => 'mensch', 'text_bereinigt' => 'Gerade gespeichert, altes Datum im Kopf',
        'eingang_am' => $mittag - 400 * $tag, 'erstellt_am' => $mittag - 10 * $tag]);
    $belegt = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 6, 'status' => 'entwurf', 'text_bereinigt' => 'Wird gerade gesendet',
        'eingang_am' => $mittag - 95 * $tag, 'erstellt_am' => $mittag - 95 * $tag, 'in_arbeit_bis' => $mittag + 60]);
    $eAlt = $fuegeEin('entwurf', ['nachricht_id' => $alt, 'text_vorlage' => 'Vorlage alt {{PREIS:abmeldung}}', 'text_final' => 'Final alt',
        'gesendet_text' => 'Loeschprobe-Gesendet', 'status' => 'gesendet', 'erstellt_am' => $mittag - 91 * $tag]);
    $eNeu = $fuegeEin('entwurf', ['nachricht_id' => $neu, 'text_vorlage' => 'Vorlage neu', 'text_final' => 'Final neu', 'erstellt_am' => $mittag - 89 * $tag]);
    $eSpaet = $fuegeEin('entwurf', ['nachricht_id' => $alt, 'version' => 2, 'text_vorlage' => 'Späte Fassung zur alten Mail', 'text_final' => 'Spät final',
        'erstellt_am' => $mittag - 5 * $tag]);
    $eWaise = $fuegeEin('entwurf', ['nachricht_id' => 999999, 'text_vorlage' => 'Entwurf ohne Nachricht', 'erstellt_am' => $mittag - 5 * $tag]);
    $fuegeEin('einordnung', ['nachricht_id' => $alt, 'anliegen' => 'abmeldung', 'zusammenfassung' => 'Loeschprobe-Zusammenfassung', 'erstellt_am' => $mittag - 91 * $tag]);
    $fuegeEin('einordnung', ['nachricht_id' => $neu, 'anliegen' => 'preis', 'zusammenfassung' => 'Einordnung innerhalb der Frist', 'erstellt_am' => $mittag - 89 * $tag]);
    Budget::buche(['zeit' => $mittag - 761 * $tag, 'modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => 1]);
    Budget::buche(['zeit' => $mittag - 759 * $tag, 'modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => 2]);
    Budget::buche(['zeit' => $mittag - 91 * $tag, 'modell' => 'claude-haiku-5-5', 'kosten_mikro_usd' => 3, 'nachricht_id' => $alt]);
    $fuegeEin('lauf', ['start' => $mittag - 761 * $tag, 'ausloeser' => 'cron']);
    $fuegeEin('lauf', ['start' => $mittag - 759 * $tag, 'ausloeser' => 'cron']);
    $fuegeEin('ereignis', ['zeit' => $mittag - 761 * $tag, 'art' => 'uralt']);
    $fuegeEin('ereignis', ['zeit' => $mittag - 759 * $tag, 'art' => 'bleibt']);
    $fuegeEin('ereignis', ['zeit' => $mittag - 91 * $tag, 'art' => 'versand', 'nachricht_id' => $alt]);
    $uhr($mittag - 2 * $tag);
    Speicher::zaehle('abgelaufen', 3600);
    $uhr($mittag - 60);
    Speicher::zaehle('laeuft_noch', 3600);
    $uhr($mittag);

    $gibt = static fn (string $tabelle, int $id): bool => (int) $wert('SELECT COUNT(*) FROM ' . $tabelle . ' WHERE id = ?', [$id]) === 1;
    Speicher::aufraeumen();
    pruefe(!$gibt('nachricht', $alt), 'Nach 90 Tagen ist die Nachricht vollständig gelöscht (mit Betreff, Adresse und Name)');
    gleich(0, (int) $wert('SELECT COUNT(*) FROM einordnung WHERE nachricht_id = ?', [$alt]), 'Ihre Einordnung (Zusammenfassung) ist gelöscht');
    pruefe(!$gibt('entwurf', $eAlt) && !$gibt('entwurf', $eSpaet), 'Alle Entwürfe dazu sind gelöscht – auch eine spätere Fassung und die gesendete Antwort');
    pruefe(!$gibt('entwurf', $eWaise), 'Ein Entwurf ohne Nachricht wird mit entfernt');
    gleich(['text_bereinigt' => 'Text innerhalb der Frist', 'von_name' => 'Erika Muster'], $zeile('SELECT text_bereinigt, von_name FROM nachricht WHERE id = ?', [$neu]), 'Innerhalb der Frist bleibt die Nachricht');
    gleich('Einordnung innerhalb der Frist', $wert('SELECT zusammenfassung FROM einordnung WHERE nachricht_id = ?', [$neu]), 'Innerhalb der Frist bleibt die Einordnung');
    pruefe(!$gibt('nachricht', $ohneZeit), 'Fehlt die Speicherzeit, zählt das Eingangsdatum');
    gleich('Gerade gespeichert, altes Datum im Kopf', $wert('SELECT text_bereinigt FROM nachricht WHERE id = ?', [$altesDatum]), 'Maßgeblich ist das Speichern, nicht das Datum im Mailkopf');
    pruefe($gibt('nachricht', $belegt), 'Eine gerade belegte Nachricht (laufender Versand) wird erst beim nächsten Löschlauf gelöscht');
    gleich(['text_vorlage' => 'Vorlage neu', 'text_final' => 'Final neu'], $zeile('SELECT text_vorlage, text_final FROM entwurf WHERE id = ?', [$eNeu]), 'Entwurf innerhalb der Frist bleibt');
    gleich([2, 3], array_map('intval', $db->query('SELECT kosten_mikro_usd FROM verbrauch ORDER BY id')->fetchAll(\PDO::FETCH_COLUMN)), 'Verbrauch älter als 760 Tage ist gelöscht, jüngerer bleibt');
    gleich(null, $wert('SELECT nachricht_id FROM verbrauch WHERE kosten_mikro_usd = 3'), 'Die Verbrauchszeile der gelöschten Nachricht bleibt ohne Bezug');
    gleich(null, $wert("SELECT nachricht_id FROM ereignis WHERE art = 'versand'"), 'Das Ereignis der gelöschten Nachricht bleibt ohne Bezug');
    gleich(1, (int) $wert('SELECT COUNT(*) FROM lauf'), 'Läufe älter als 760 Tage sind gelöscht');
    gleich(0, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'uralt'"), 'Ereignisse älter als 760 Tage sind gelöscht');
    gleich(1, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'bleibt'"), 'Jüngere Ereignisse bleiben');
    gleich(0, (int) $wert("SELECT COUNT(*) FROM zaehler WHERE schluessel = 'abgelaufen'"), 'Zähler mit abgelaufenem Fenster ist gelöscht');
    gleich(1, (int) $wert("SELECT COUNT(*) FROM zaehler WHERE schluessel = 'laeuft_noch'"), 'Zähler im laufenden Fenster bleibt');
    $protokoll = (string) $wert("SELECT details FROM ereignis WHERE art = 'aufraeumen'");
    gleich(
        ['nachrichten' => 2, 'einordnungen' => 1, 'entwuerfe' => 3, 'verbrauch' => 1, 'laeufe' => 1, 'ereignisse' => 1, 'zaehler' => 1],
        json_decode($protokoll, true),
        'Der Löschlauf protokolliert nur Zahlen'
    );
    $wal = $ordner . '/assistent.sqlite-wal';
    pruefe(!is_file($wal) || filesize($wal) === 0, 'Nach dem Löschlauf ist die WAL-Datei geleert');
    $rohdaten = (string) file_get_contents($ordner . '/assistent.sqlite') . (is_file($wal) ? (string) file_get_contents($wal) : '');
    enthaelt_nicht('Loeschprobe-4711', $rohdaten, 'Der gelöschte Mailtext steht auch nicht mehr in der Datenbankdatei');
    enthaelt_nicht('Loeschprobe-Nachname', $rohdaten, 'Der gelöschte Name steht auch nicht mehr in der Datenbankdatei');
    enthaelt_nicht('Loeschprobe-Betreff', $rohdaten, 'Der gelöschte Betreff steht auch nicht mehr in der Datenbankdatei');
    enthaelt_nicht('loeschprobe-adresse@', $rohdaten, 'Die gelöschte Adresse steht auch nicht mehr in der Datenbankdatei');
    enthaelt_nicht('Loeschprobe-Zusammenfassung', $rohdaten, 'Die gelöschte Zusammenfassung steht auch nicht mehr in der Datenbankdatei');
    enthaelt_nicht('Loeschprobe-Gesendet', $rohdaten, 'Die gelöschte gesendete Antwort steht auch nicht mehr in der Datenbankdatei');
    enthaelt('Text innerhalb der Frist', $rohdaten, 'Gegenprobe: nicht gelöschter Text ist in der Datei zu finden');

    // Höchstens einmal je Tag wirksam.
    $spaeter = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 5, 'status' => 'gesendet', 'text_bereinigt' => 'Nachzügler', 'erstellt_am' => $mittag - 200 * $tag]);
    $uhr($mittag + 3600);
    Speicher::aufraeumen();
    gleich('Nachzügler', $wert('SELECT text_bereinigt FROM nachricht WHERE id = ?', [$spaeter]), 'Zweiter Aufruf am selben Tag bleibt ohne Wirkung');
    gleich(1, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'aufraeumen'"), 'Zweiter Aufruf schreibt kein weiteres Ereignis');
    Speicher::setze('aufbewahrung_text_tage', '30', 'tester');
    $uhr($mittag + $tag);
    Speicher::aufraeumen();
    pruefe(!$gibt('nachricht', $spaeter), 'Nach 24 Stunden wirkt der Löschlauf wieder');
    pruefe(!$gibt('nachricht', $belegt), 'Die zuvor belegte Nachricht ist jetzt (Belegung abgelaufen) gelöscht');
    pruefe(!$gibt('nachricht', $neu), 'Eine kürzere Frist (30 Tage) wird beachtet');
    pruefe(!$gibt('entwurf', $eNeu), 'Kürzere Frist gilt auch für Entwürfe');
    gleich('Gerade gespeichert, altes Datum im Kopf', $wert('SELECT text_bereinigt FROM nachricht WHERE id = ?', [$altesDatum]), 'Was jünger als die Frist ist, bleibt weiterhin');
    Speicher::setze('aufbewahrung_text_tage', 'unsinn', 'tester');
    $uhr($mittag + 2 * $tag);
    Speicher::aufraeumen();
    gleich('Gerade gespeichert, altes Datum im Kopf', $wert('SELECT text_bereinigt FROM nachricht WHERE id = ?', [$altesDatum]), 'Unlesbare Frist: es gilt der Standard von 90 Tagen, nichts wird vorzeitig gelöscht');
    $langeFrist = $fuegeEin('nachricht', ['uidvalidity' => 1, 'uid' => 7, 'status' => 'gesendet', 'text_bereinigt' => 'Seit 95 Tagen gespeichert', 'erstellt_am' => $mittag - 92 * $tag]);
    Speicher::setze('aufbewahrung_text_tage', '365', 'tester');
    $uhr($mittag + 3 * $tag);
    Speicher::aufraeumen();
    gleich(0, (int) $wert('SELECT COUNT(*) FROM nachricht WHERE id = ?', [$langeFrist]), 'Eine Frist über 90 Tagen gilt nicht: nach 90 Tagen wird trotzdem gelöscht (Datenschutzerklärung)');

    // -- Aufräumen der Testumgebung ----------------------------------------------
    putenv('KZP_ASSISTENT_DIR=' . $basis);
    $umgebung('KZP_ASSISTENT_JETZT', $vorher['KZP_ASSISTENT_JETZT']);
    $umgebung('ANTHROPIC_API_KEY', $vorher['ANTHROPIC_API_KEY']);
    abschnitt('A · Abschluss');
    gleich($basis, Umgebung::datenOrdner(), 'Der gemeinsame Datenordner ist wieder eingestellt');
    gleich(['key' => $platzhalterSchluessel], Zugang::claude(), 'Für die folgenden Tests gilt ein Platzhalter-Schlüssel (kein echter Aufruf möglich)');
})();
