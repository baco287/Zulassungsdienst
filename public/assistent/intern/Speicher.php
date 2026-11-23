<?php
/**
 * KI-Assistent – Speicher: eine SQLite-Datei außerhalb des Web-Ordners.
 *
 * Hier liegen die eingelesenen Nachrichten, ihre Einordnung, die Antwort-Entwürfe, jede
 * Claude-Antwort mit ihren Kosten, die Einstellungen und ein Ereignisprotokoll. Wie bei der
 * Webanalyse (api/analytics-lib.php) braucht das keine Datenbank im KAS, und der Deploy
 * fasst die Datei nie an.
 *
 * ZUSTÄNDE: Zwei Aufrufe können gleichzeitig laufen (Zeitauftrag und ein Klick im
 * Admin-Bereich). Jeder Statuswechsel ist deshalb ein bedingtes UPDATE (wechsle()), und wer
 * an einer Nachricht arbeitet, belegt sie für kurze Zeit (belege()). So wird keine Mail
 * doppelt an die KI geschickt und keine Antwort doppelt gesendet.
 *
 * DATENSCHUTZ: Nachrichten werden nach der eingestellten Frist samt Einordnung und Entwürfen
 * gelöscht (aufraeumen()); secure_delete überschreibt Gelöschtes in der Datei mit Nullen, statt
 * es nur als frei zu markieren. Das Ereignisprotokoll enthält nie Mailinhalt.
 *
 * ZAHLEN IN ABFRAGEN: execute([...]) bindet Ganzzahlen hier als Ganzzahlen (Klasse
 * SpeicherAnweisung unten). Das ist nötig, weil fast alle Vergleiche mit Zeiten rechnen.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Speicher
{
    /** Stand des Schemas (PRAGMA user_version). Bei Änderungen hochzählen und in schema() einen Schritt ergänzen. */
    public const SCHEMA_VERSION = 2;

    /** Auslieferungszustand aller Einstellungen (Werte immer als Text). */
    public const STANDARD = [
        'ki_aktiv'               => '0',     // Pause-Schalter: ausgeliefert wird pausiert
        'limit_monat_usd'        => '10',
        'limit_tag_usd'          => '1',
        'limit_aufrufe_tag'      => '150',
        'limit_je_absender_tag'  => '6',
        'max_ki_je_lauf'         => '1',
        'eskalation_sonnet'      => '1',
        'aufbewahrung_text_tage' => '90',
        'gruss'                  => 'Freundliche Grüße',
        'absender_name'          => 'Ihr Team von KFZ-Zulassungsprofis',
        'hinweis_mail'           => '1',
        'fuss'                   => '',      // leer = Fußzeile aus der Wissensbasis
        'start_uid'              => '',      // setzt der erste Lauf („ab jetzt“)
        'letzte_uid'             => '0',
        'uidvalidity'            => '',
        'sperre_bis'             => '0',
        'sperre_grund'           => '',
        // Zeitpunkt (Erstellung) des neuesten Entwurfs, für den eine Hinweis-Mail ging.
        'hinweis_letzter_entwurf' => '0',
        // Seit wann das Manifest nicht passt bzw. die Wissensbasis veraltet ist (leer = alles gut).
        'manifest_abweichend_seit' => '',
        'wissen_veraltet_seit'     => '',
    ];

    /** Verbrauch, Läufe und Ereignisse bleiben gut zwei Jahre (Vergleich mit dem Vorjahr), wie die Webanalyse. */
    public const AUFBEWAHRUNG_PROTOKOLL_TAGE = 760;

    /**
     * Längste Aufbewahrung gespeicherter Mails. Die Datenschutzerklärung (Abschnitt 3b) sagt
     * „spätestens nach 90 Tagen gelöscht“ – ein größerer Wert in der Einstellung gilt nicht.
     */
    public const AUFBEWAHRUNG_TEXT_HOECHSTENS_TAGE = 90;

    /** Tabellen, deren Status über wechsle() geändert werden darf. */
    private const STATUS_TABELLEN = ['nachricht', 'entwurf'];

    /**
     * Spalten, die wechsle() zusammen mit dem Status setzen darf. Spaltennamen lassen sich in
     * SQL nicht als Parameter binden – deshalb gegen diese feste Liste prüfen.
     */
    private const SPALTEN = [
        'nachricht' => [
            'kanal', 'uidvalidity', 'uid', 'message_id', 'in_reply_to', 'verweise', 'thread_schluessel',
            'von_adresse', 'von_name', 'antwort_an', 'betreff', 'eingang_am', 'text_bereinigt', 'text_hash',
            'zeichen_original', 'gekuerzt', 'anhaenge', 'regel_kategorie', 'regel_grund', 'status_grund',
            'versuche', 'in_arbeit_bis', 'erstellt_am', 'aktualisiert_am', 'zusammengefasst_in',
        ],
        'entwurf' => [
            'nachricht_id', 'version', 'text_vorlage', 'text_final', 'pruef_status', 'pruef_hinweise', 'modell',
            'wissen_hash', 'gesendet_text', 'geaendert', 'freigegeben_von', 'freigegeben_am',
            'gesendet_message_id', 'erstellt_am', 'sprache',
        ],
    ];

    /** Fehlt erstellt_am beim Einfügen, trägt die Datenbank die aktuelle Zeit ein – die Löschfrist hängt daran. */
    private const SQL_JETZT = "(CAST(strftime('%s','now') AS INTEGER))";

    /**
     * Zeitpunkt, ab dem die Löschfrist einer Nachricht läuft: der Moment des Speicherns.
     * Das Datum aus dem Mailkopf (eingang_am) setzt der Absender und taugt nur als Ersatz.
     */
    private const SQL_GESPEICHERT_AM = '(CASE WHEN COALESCE(erstellt_am, 0) > 0 THEN erstellt_am ELSE COALESCE(eingang_am, 0) END)';

    private static ?\PDO $pdo = null;
    private static string $pdoPfad = '';

    /**
     * Öffnet die Datenbank und legt bei Bedarf das Schema an. Wirft bei Fehlern (Aufrufer
     * fangen ab). Die Verbindung gilt je Datenordner: Wechselt ein Test den Ordner, entsteht
     * dort eine frische Datenbank.
     */
    public static function db(): \PDO
    {
        $pfad = Umgebung::datenOrdner() . '/assistent.sqlite';
        if (self::$pdo instanceof \PDO && self::$pdoPfad === $pfad) {
            return self::$pdo;
        }
        if (!in_array('sqlite', \PDO::getAvailableDrivers(), true)) {
            throw new \RuntimeException('PDO-SQLite ist auf diesem Server nicht verfügbar.');
        }
        $neu = !is_file($pfad);
        $pdo = new \PDO('sqlite:' . $pfad, null, null, [
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_TIMEOUT            => 5,
            // Ganzzahlen als Ganzzahlen binden, siehe SpeicherAnweisung am Ende dieser Datei.
            \PDO::ATTR_STATEMENT_CLASS    => [SpeicherAnweisung::class],
        ]);
        if ($neu) {
            @chmod($pfad, 0600);
        }
        $pdo->exec('PRAGMA busy_timeout = 5000');
        $pdo->exec('PRAGMA synchronous = NORMAL');
        // Gilt je Verbindung, deshalb bei jedem Öffnen: Gelöschtes mit Nullen überschreiben.
        $pdo->exec('PRAGMA secure_delete = ON');
        self::schema($pdo);
        self::$pdo = $pdo;
        self::$pdoPfad = $pfad;
        return $pdo;
    }

    /** Wert einer Einstellung; ist nichts gespeichert, der Standard (unbekannter Schlüssel: leer). */
    public static function einstellung(string $schluessel): string
    {
        $stmt = self::db()->prepare('SELECT wert FROM einstellung WHERE schluessel = ?');
        $stmt->execute([$schluessel]);
        $wert = $stmt->fetchColumn();
        return $wert === false ? (self::STANDARD[$schluessel] ?? '') : (string) $wert;
    }

    /** Speichert eine Einstellung und hält fest, wer sie wann geändert hat. */
    public static function setze(string $schluessel, string $wert, string $von): void
    {
        if ($schluessel === '' || strlen($schluessel) > 100) {
            throw new \InvalidArgumentException('Ungültiger Schlüssel für eine Einstellung.');
        }
        self::db()->prepare(
            'INSERT INTO einstellung (schluessel, wert, geaendert_am, geaendert_von) VALUES (?, ?, ?, ?)
             ON CONFLICT(schluessel) DO UPDATE SET wert = excluded.wert,
                 geaendert_am = excluded.geaendert_am, geaendert_von = excluded.geaendert_von'
        )->execute([$schluessel, $wert, Umgebung::jetzt(), mb_substr($von, 0, 200)]);
    }

    /**
     * Alle Einstellungen, fehlende mit ihrem Standard ergänzt.
     *
     * @return array<string,string>
     */
    public static function alleEinstellungen(): array
    {
        $alle = self::STANDARD;
        foreach (self::db()->query('SELECT schluessel, wert FROM einstellung') as $zeile) {
            $alle[(string) $zeile['schluessel']] = (string) $zeile['wert'];
        }
        return $alle;
    }

    /**
     * Schreibt eine Zeile ins Ereignisprotokoll. $details sind kurze Kennwerte (Gründe, Zahlen,
     * Kennungen) – nie Mailinhalt, nie Zugangsdaten. Ein Fehler beim Protokollieren darf den
     * eigentlichen Vorgang (etwa einen Versand, der schon geschehen ist) nicht abbrechen.
     *
     * @param array<string,mixed> $details
     */
    public static function ereignis(string $art, ?int $nachrichtId, string $nutzer, array $details = []): void
    {
        try {
            $json = $details === [] ? '{}' : json_encode(
                $details,
                JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR
            );
            // Auffällig lange Details deuten auf versehentlich mitgegebenen Inhalt hin: nur die Feldnamen behalten.
            if (!is_string($json) || strlen($json) > 2000) {
                $json = (string) json_encode(['gekuerzt' => true, 'felder' => array_slice(array_map('strval', array_keys($details)), 0, 20)]);
            }
            self::db()->prepare('INSERT INTO ereignis (zeit, art, nachricht_id, nutzer, details) VALUES (?, ?, ?, ?, ?)')
                ->execute([Umgebung::jetzt(), mb_substr($art, 0, 60), $nachrichtId, mb_substr($nutzer, 0, 200), $json]);
        } catch (\Throwable $fehler) {
            error_log('KI-Assistent: Ereignis nicht gespeichert (' . $fehler::class . ')');
        }
    }

    /**
     * Erhöht einen Zähler und liefert seinen Stand im laufenden Fenster. Das Fenster beginnt
     * mit dem ersten Ereignis und endet $fensterSek Sekunden später; danach zählt es neu ab 1.
     * Für Obergrenzen wie „höchstens 40 Sendungen je Stunde“.
     */
    public static function zaehle(string $schluessel, int $fensterSek): int
    {
        $fensterSek = max(1, $fensterSek);
        // Ein Schritt, damit zwei gleichzeitige Aufrufe sich nicht gegenseitig überschreiben.
        // „Neu beginnen“ gilt auch, wenn der gespeicherte Beginn in der Zukunft liegt (Uhr wurde zurückgestellt).
        self::db()->prepare(
            'INSERT INTO zaehler (schluessel, anzahl, fenster_start, fenster_sek) VALUES (?, 1, ?, ?)
             ON CONFLICT(schluessel) DO UPDATE SET
                 anzahl = CASE WHEN zaehler.fenster_start > excluded.fenster_start
                                 OR zaehler.fenster_start + excluded.fenster_sek <= excluded.fenster_start
                               THEN 1 ELSE zaehler.anzahl + 1 END,
                 fenster_start = CASE WHEN zaehler.fenster_start > excluded.fenster_start
                                        OR zaehler.fenster_start + excluded.fenster_sek <= excluded.fenster_start
                                      THEN excluded.fenster_start ELSE zaehler.fenster_start END,
                 fenster_sek = excluded.fenster_sek'
        )->execute([mb_substr($schluessel, 0, 200), Umgebung::jetzt(), $fensterSek]);
        return self::zaehlerstand($schluessel, $fensterSek);
    }

    /** Stand eines Zählers im laufenden Fenster, ohne ihn zu erhöhen (0, wenn das Fenster abgelaufen ist). */
    public static function zaehlerstand(string $schluessel, int $fensterSek): int
    {
        $fensterSek = max(1, $fensterSek);
        $jetzt = Umgebung::jetzt();
        $stmt = self::db()->prepare('SELECT anzahl, fenster_start FROM zaehler WHERE schluessel = ?');
        $stmt->execute([mb_substr($schluessel, 0, 200)]);
        $zeile = $stmt->fetch();
        if ($zeile === false) {
            return 0;
        }
        $start = (int) $zeile['fenster_start'];
        return ($start > $jetzt || $start + $fensterSek <= $jetzt) ? 0 : (int) $zeile['anzahl'];
    }

    /**
     * Nimmt eine Zählung zurück (nie unter 0). Für „erst reservieren, dann prüfen“: Der Login
     * zählt jeden Versuch vor dem Vergleich und gibt die Zählung bei Erfolg wieder frei – so
     * kommen auch gleichzeitige Fehlversuche nicht an der Grenze vorbei.
     */
    public static function nimmZurueck(string $schluessel): void
    {
        self::db()->prepare('UPDATE zaehler SET anzahl = MAX(0, anzahl - 1) WHERE schluessel = ?')
            ->execute([mb_substr($schluessel, 0, 200)]);
    }

    /**
     * Löschfristen. Darf bei jedem Lauf aufgerufen werden, wirkt aber höchstens einmal in
     * 24 Stunden. Nach aufbewahrung_text_tage werden Nachrichten VOLLSTÄNDIG gelöscht – samt
     * Einordnung und Entwürfen. So verschwinden mit dem Text auch Betreff, Adressen, Name,
     * Zusammenfassung und gesendete Antwort (Datenschutzerklärung Abschnitt 3b). Verbrauchs- und
     * Ereigniszeilen enthalten keinen Inhalt; sie bleiben für die Kostenübersicht, verlieren
     * aber den Bezug zur Nachricht (wie beim Löschen eines Kunden, Admin::kundeLoeschen).
     * Gerade belegte Nachrichten (laufender Versand oder KI-Schritt) nimmt der nächste Lauf mit.
     */
    public static function aufraeumen(): void
    {
        // Erst belegen, dann arbeiten: Zwei gleichzeitige Läufe räumen nicht doppelt auf.
        if (self::zaehle('aufraeumen', 86400) > 1) {
            return;
        }
        $db = self::db();
        $jetzt = Umgebung::jetzt();
        $tage = (int) self::einstellung('aufbewahrung_text_tage');
        if ($tage < 1) {
            $tage = (int) self::STANDARD['aufbewahrung_text_tage'];
        }
        $tage = min($tage, self::AUFBEWAHRUNG_TEXT_HOECHSTENS_TAGE);
        // Ein Tag Vorlauf: Der Löschlauf wirkt höchstens einmal in 24 Stunden. Ohne Vorlauf läge
        // eine Mail bis zu 90 Tage und knapp 24 Stunden – die Datenschutzerklärung sagt
        // „spätestens nach 90 Tagen“. So wird zwischen dem 89. und dem 90. Tag gelöscht.
        $textGrenze = $jetzt - ($tage - 1) * 86400;
        $protokollGrenze = $jetzt - self::AUFBEWAHRUNG_PROTOKOLL_TAGE * 86400;
        $eigeneTransaktion = !$db->inTransaction();
        try {
            if ($eigeneTransaktion) {
                $db->beginTransaction();
            }
            $anzahl = ['nachrichten' => 0, 'einordnungen' => 0, 'entwuerfe' => 0];

            $stmt = $db->prepare(
                'SELECT id FROM nachricht WHERE ' . self::SQL_GESPEICHERT_AM . ' < ? AND COALESCE(in_arbeit_bis, 0) <= ?'
            );
            $stmt->execute([$textGrenze, $jetzt]);
            $ids = array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
            foreach (array_chunk($ids, 400) as $teil) {
                $platz = implode(',', array_fill(0, count($teil), '?'));
                $stmt = $db->prepare("DELETE FROM entwurf WHERE nachricht_id IN ($platz)");
                $stmt->execute($teil);
                $anzahl['entwuerfe'] += $stmt->rowCount();
                $stmt = $db->prepare("DELETE FROM einordnung WHERE nachricht_id IN ($platz)");
                $stmt->execute($teil);
                $anzahl['einordnungen'] += $stmt->rowCount();
                $db->prepare("UPDATE verbrauch SET nachricht_id = NULL WHERE nachricht_id IN ($platz)")->execute($teil);
                $db->prepare("UPDATE ereignis SET nachricht_id = NULL WHERE nachricht_id IN ($platz)")->execute($teil);
                $stmt = $db->prepare("DELETE FROM nachricht WHERE id IN ($platz)");
                $stmt->execute($teil);
                $anzahl['nachrichten'] += $stmt->rowCount();
            }

            // Reste ohne Nachricht (etwa nach einem Löschen von Hand) ebenfalls entfernen.
            $stmt = $db->prepare('DELETE FROM entwurf WHERE nachricht_id NOT IN (SELECT id FROM nachricht)');
            $stmt->execute();
            $anzahl['entwuerfe'] += $stmt->rowCount();
            $stmt = $db->prepare('DELETE FROM einordnung WHERE nachricht_id NOT IN (SELECT id FROM nachricht)');
            $stmt->execute();
            $anzahl['einordnungen'] += $stmt->rowCount();

            $stmt = $db->prepare('DELETE FROM verbrauch WHERE zeit < ?');
            $stmt->execute([$protokollGrenze]);
            $anzahl['verbrauch'] = $stmt->rowCount();

            $stmt = $db->prepare('DELETE FROM lauf WHERE COALESCE(start, 0) < ?');
            $stmt->execute([$protokollGrenze]);
            $anzahl['laeufe'] = $stmt->rowCount();

            $stmt = $db->prepare('DELETE FROM ereignis WHERE zeit < ?');
            $stmt->execute([$protokollGrenze]);
            $anzahl['ereignisse'] = $stmt->rowCount();

            // Zähler ohne bekannte Fensterlänge (fenster_sek = 0) gelten nach 35 Tagen als abgelaufen.
            $stmt = $db->prepare(
                'DELETE FROM zaehler WHERE (fenster_sek > 0 AND fenster_start + fenster_sek <= ?)
                                        OR (fenster_sek <= 0 AND fenster_start < ?)'
            );
            $stmt->execute([$jetzt, $jetzt - 35 * 86400]);
            $anzahl['zaehler'] = $stmt->rowCount();

            if ($eigeneTransaktion) {
                $db->commit();
            }
        } catch (\Throwable $fehler) {
            if ($eigeneTransaktion && $db->inTransaction()) {
                $db->rollBack();
            }
            // Belegung zurücknehmen, damit der nächste Lauf es erneut versucht.
            $db->prepare('DELETE FROM zaehler WHERE schluessel = ?')->execute(['aufraeumen']);
            throw $fehler;
        }

        self::ereignis('aufraeumen', null, 'system', $anzahl);
        if (!$db->inTransaction()) {
            // Im WAL-Betrieb stehen alte Seiten noch in der WAL-Datei: jetzt in die Datenbank
            // übernehmen und die WAL-Datei leeren, damit Gelöschtes wirklich weg ist.
            $db->query('PRAGMA wal_checkpoint(TRUNCATE)')->fetchAll();
        }
    }

    /**
     * Bedingter Statuswechsel: setzt den Status von $von auf $nach – nur, wenn er gerade
     * $von ist. true heißt „dieser Aufruf hat gewechselt“; false heißt, ein anderer war
     * schneller (oder die Zeile gibt es nicht), und der Aufrufer beendet seinen Schritt ohne
     * Wirkung. $weitere setzt im selben Schritt zusätzliche Spalten (Spalte => Wert).
     *
     * @param array<string,scalar|null> $weitere
     */
    public static function wechsle(string $tabelle, int $id, string $von, string $nach, array $weitere = []): bool
    {
        if (!in_array($tabelle, self::STATUS_TABELLEN, true)) {
            throw new \InvalidArgumentException('Statuswechsel nur für die Tabellen nachricht und entwurf.');
        }
        if ($tabelle === 'nachricht' && !array_key_exists('aktualisiert_am', $weitere)) {
            $weitere['aktualisiert_am'] = Umgebung::jetzt();
        }
        $setze = ['status = ?'];
        $werte = [$nach];
        foreach ($weitere as $spalte => $wert) {
            if (!in_array($spalte, self::SPALTEN[$tabelle], true)) {
                throw new \InvalidArgumentException('Unbekannte Spalte für den Statuswechsel.');
            }
            if ($wert !== null && !is_scalar($wert)) {
                throw new \InvalidArgumentException('Spaltenwerte müssen einfache Werte sein.');
            }
            $setze[] = $spalte . ' = ?';
            $werte[] = is_bool($wert) ? (int) $wert : $wert;
        }
        $werte[] = $id;
        $werte[] = $von;
        $stmt = self::db()->prepare('UPDATE ' . $tabelle . ' SET ' . implode(', ', $setze) . ' WHERE id = ? AND status = ?');
        $stmt->execute($werte);
        return $stmt->rowCount() === 1;
    }

    /**
     * Belegt eine Nachricht für $sekunden (Spalte in_arbeit_bis) – nur, wenn sie frei oder
     * die frühere Belegung abgelaufen ist. true heißt „dieser Aufruf darf arbeiten“. Die
     * Frist sorgt dafür, dass eine Nachricht nach einem Absturz nicht für immer hängen bleibt.
     */
    public static function belege(int $nachrichtId, int $sekunden = 120): bool
    {
        $jetzt = Umgebung::jetzt();
        $stmt = self::db()->prepare('UPDATE nachricht SET in_arbeit_bis = ? WHERE id = ? AND COALESCE(in_arbeit_bis, 0) <= ?');
        $stmt->execute([$jetzt + max(1, $sekunden), $nachrichtId, $jetzt]);
        return $stmt->rowCount() === 1;
    }

    /** Gibt eine belegte Nachricht wieder frei (nach getaner Arbeit oder nach einem Fehler). */
    public static function gibFrei(int $nachrichtId): void
    {
        self::db()->prepare('UPDATE nachricht SET in_arbeit_bis = 0 WHERE id = ?')->execute([$nachrichtId]);
    }

    /**
     * Bringt die Datenbank auf SCHEMA_VERSION. Der Normalfall kostet eine einzige Abfrage.
     * BEGIN IMMEDIATE lässt von zwei gleichzeitigen ersten Aufrufen nur einen arbeiten; der
     * zweite sieht danach die neue Version und tut nichts.
     */
    private static function schema(\PDO $pdo): void
    {
        if ((int) $pdo->query('PRAGMA user_version')->fetchColumn() >= self::SCHEMA_VERSION) {
            return;
        }
        // WAL: Lesen (Admin-Bereich) blockiert das Schreiben (Verarbeitungslauf) nicht. Bleibt in der Datei gespeichert.
        $pdo->query('PRAGMA journal_mode = WAL')->fetchAll();
        $pdo->exec('BEGIN IMMEDIATE');
        try {
            $version = (int) $pdo->query('PRAGMA user_version')->fetchColumn();
            if ($version < 1) {
                foreach (self::schemaVersion1() as $sql) {
                    $pdo->exec($sql);
                }
            }
            if ($version < 2) {
                foreach (self::schemaVersion2($pdo) as $sql) {
                    $pdo->exec($sql);
                }
            }
            $pdo->exec('PRAGMA user_version = ' . self::SCHEMA_VERSION);
            $pdo->exec('COMMIT');
        } catch (\Throwable $fehler) {
            $pdo->exec('ROLLBACK');
            throw $fehler;
        }
    }

    /**
     * Schema Version 2: Sprache am Entwurf (Anrede und Gruß auf Englisch, wenn die KI „en“ meldet)
     * und der Bezug einer zusammengefassten Mail auf die neuere, die sie mit beantwortet. Nur
     * Spalten, die noch fehlen – eine von Hand ergänzte Datenbank bricht so nicht.
     *
     * @return string[]
     */
    private static function schemaVersion2(\PDO $pdo): array
    {
        $hat = static function (string $tabelle, string $spalte) use ($pdo): bool {
            foreach ($pdo->query('PRAGMA table_info(' . $tabelle . ')')->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
                if ((string) $zeile['name'] === $spalte) {
                    return true;
                }
            }
            return false;
        };
        $schritte = [];
        if (!$hat('entwurf', 'sprache')) {
            $schritte[] = "ALTER TABLE entwurf ADD COLUMN sprache TEXT DEFAULT 'de'";
        }
        if (!$hat('nachricht', 'zusammengefasst_in')) {
            $schritte[] = 'ALTER TABLE nachricht ADD COLUMN zusammengefasst_in INTEGER DEFAULT 0';
        }
        $schritte[] = 'CREATE INDEX IF NOT EXISTS idx_nachricht_zusammen ON nachricht (zusammengefasst_in)';
        return $schritte;
    }

    /**
     * Schema Version 1. Fast alle Spalten haben einen Standardwert und erlauben NULL: Die
     * Bausteine schreiben mit eigenen INSERTs, und eine fehlende Angabe soll keine Mail
     * verloren gehen lassen. Pflicht sind nur Status und Bezüge.
     *
     * @return string[]
     */
    private static function schemaVersion1(): array
    {
        $jetzt = self::SQL_JETZT;
        return [
            // Eingelesene Nachrichten. in_arbeit_bis: kurze Belegung durch KI-Schritt oder Versand (siehe belege()).
            "CREATE TABLE IF NOT EXISTS nachricht (
                id                INTEGER PRIMARY KEY AUTOINCREMENT,
                kanal             TEXT    NOT NULL DEFAULT 'email',
                uidvalidity       INTEGER,
                uid               INTEGER,
                message_id        TEXT    DEFAULT '',
                in_reply_to       TEXT    DEFAULT '',
                verweise          TEXT    DEFAULT '',
                thread_schluessel TEXT    DEFAULT '',
                von_adresse       TEXT    DEFAULT '',
                von_name          TEXT    DEFAULT '',
                antwort_an        TEXT    DEFAULT '',
                betreff           TEXT    DEFAULT '',
                eingang_am        INTEGER DEFAULT 0,
                text_bereinigt    TEXT    DEFAULT '',
                text_hash         TEXT    DEFAULT '',
                zeichen_original  INTEGER DEFAULT 0,
                gekuerzt          INTEGER DEFAULT 0,
                anhaenge          TEXT    DEFAULT '[]',
                regel_kategorie   TEXT    DEFAULT '',
                regel_grund       TEXT    DEFAULT '',
                status            TEXT    NOT NULL,
                status_grund      TEXT    DEFAULT '',
                versuche          INTEGER DEFAULT 0,
                in_arbeit_bis     INTEGER DEFAULT 0,
                erstellt_am       INTEGER DEFAULT {$jetzt},
                aktualisiert_am   INTEGER DEFAULT {$jetzt},
                UNIQUE (uidvalidity, uid)
            )",
            'CREATE INDEX IF NOT EXISTS idx_nachricht_status  ON nachricht (status)',
            'CREATE INDEX IF NOT EXISTS idx_nachricht_msgid   ON nachricht (message_id)',
            'CREATE INDEX IF NOT EXISTS idx_nachricht_thread  ON nachricht (thread_schluessel)',
            'CREATE INDEX IF NOT EXISTS idx_nachricht_eingang ON nachricht (eingang_am)',
            // Zusätzlich zum Bauplan: Duplikatsuche (text_hash) und alles „je Absender“ (Limit, Schleife, Folge-Mail).
            'CREATE INDEX IF NOT EXISTS idx_nachricht_hash     ON nachricht (text_hash)',
            'CREATE INDEX IF NOT EXISTS idx_nachricht_absender ON nachricht (von_adresse, eingang_am)',

            "CREATE TABLE IF NOT EXISTS einordnung (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                nachricht_id    INTEGER NOT NULL UNIQUE,
                anliegen        TEXT    DEFAULT '',
                leistung        TEXT    DEFAULT '',
                interessent     INTEGER DEFAULT 0,
                dringlich       INTEGER DEFAULT 0,
                stimmung        TEXT    DEFAULT '',
                uebergabe       INTEGER DEFAULT 0,
                uebergabe_grund TEXT    DEFAULT '',
                komplex         INTEGER DEFAULT 0,
                manipulation    INTEGER DEFAULT 0,
                zusammenfassung TEXT    DEFAULT '',
                fehlende_angabe TEXT    DEFAULT '',
                modell          TEXT    DEFAULT '',
                prompt_version  TEXT    DEFAULT '',
                wissen_hash     TEXT    DEFAULT '',
                aus_duplikat    INTEGER DEFAULT 0,
                erstellt_am     INTEGER DEFAULT {$jetzt}
            )",

            // wissen_hash: Stand der Wissensbasis, mit dem der Entwurf gefüllt wurde (Preise können sich bis zum Senden ändern).
            "CREATE TABLE IF NOT EXISTS entwurf (
                id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                nachricht_id        INTEGER NOT NULL,
                version             INTEGER DEFAULT 1,
                text_vorlage        TEXT    DEFAULT '',
                text_final          TEXT    DEFAULT '',
                pruef_status        TEXT    DEFAULT '',
                pruef_hinweise      TEXT    DEFAULT '[]',
                modell              TEXT    DEFAULT '',
                wissen_hash         TEXT    DEFAULT '',
                status              TEXT    NOT NULL DEFAULT 'offen',
                gesendet_text       TEXT    DEFAULT '',
                geaendert           INTEGER DEFAULT 0,
                freigegeben_von     TEXT    DEFAULT '',
                freigegeben_am      INTEGER DEFAULT 0,
                gesendet_message_id TEXT    DEFAULT '',
                erstellt_am         INTEGER DEFAULT {$jetzt}
            )",
            'CREATE INDEX IF NOT EXISTS idx_entwurf_nachricht ON entwurf (nachricht_id, version)',
            'CREATE INDEX IF NOT EXISTS idx_entwurf_status    ON entwurf (status)',
            'CREATE INDEX IF NOT EXISTS idx_entwurf_erstellt  ON entwurf (erstellt_am)',

            // Eine Zeile je API-Antwort oder -Fehler. geschaetzt = 1: Antwort blieb aus, Höchstpreis angesetzt.
            "CREATE TABLE IF NOT EXISTS verbrauch (
                id                 INTEGER PRIMARY KEY AUTOINCREMENT,
                zeit               INTEGER NOT NULL,
                kanal              TEXT    NOT NULL DEFAULT 'email',
                zweck              TEXT    NOT NULL DEFAULT 'entwurf',
                modell             TEXT    NOT NULL DEFAULT '',
                nachricht_id       INTEGER,
                request_id         TEXT    NOT NULL DEFAULT '',
                input_tokens       INTEGER NOT NULL DEFAULT 0,
                cache_schreiben_5m INTEGER NOT NULL DEFAULT 0,
                cache_schreiben_1h INTEGER NOT NULL DEFAULT 0,
                cache_lesen        INTEGER NOT NULL DEFAULT 0,
                output_tokens      INTEGER NOT NULL DEFAULT 0,
                denk_tokens        INTEGER NOT NULL DEFAULT 0,
                kosten_mikro_usd   INTEGER NOT NULL DEFAULT 0,
                geschaetzt         INTEGER NOT NULL DEFAULT 0,
                stop_reason        TEXT    NOT NULL DEFAULT '',
                http_status        INTEGER NOT NULL DEFAULT 0,
                dauer_ms           INTEGER NOT NULL DEFAULT 0,
                fehler             TEXT    NOT NULL DEFAULT ''
            )",
            'CREATE INDEX IF NOT EXISTS idx_verbrauch_zeit      ON verbrauch (zeit)',
            'CREATE INDEX IF NOT EXISTS idx_verbrauch_nachricht ON verbrauch (nachricht_id)',

            "CREATE TABLE IF NOT EXISTS einstellung (
                schluessel    TEXT    PRIMARY KEY,
                wert          TEXT    NOT NULL DEFAULT '',
                geaendert_am  INTEGER NOT NULL DEFAULT 0,
                geaendert_von TEXT    NOT NULL DEFAULT ''
            )",

            // fenster_sek (zusätzlich zum Bauplan): Nur so lässt sich beim Aufräumen erkennen, wann ein Fenster abgelaufen ist.
            'CREATE TABLE IF NOT EXISTS zaehler (
                schluessel    TEXT    PRIMARY KEY,
                anzahl        INTEGER NOT NULL DEFAULT 0,
                fenster_start INTEGER NOT NULL DEFAULT 0,
                fenster_sek   INTEGER NOT NULL DEFAULT 0
            )',

            "CREATE TABLE IF NOT EXISTS lauf (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                start     INTEGER DEFAULT {$jetzt},
                ende      INTEGER DEFAULT 0,
                ausloeser TEXT    DEFAULT '',
                abgerufen INTEGER DEFAULT 0,
                ohne_ki   INTEGER DEFAULT 0,
                mit_ki    INTEGER DEFAULT 0,
                entwuerfe INTEGER DEFAULT 0,
                fehler    INTEGER DEFAULT 0,
                hinweis   TEXT    DEFAULT ''
            )",
            'CREATE INDEX IF NOT EXISTS idx_lauf_start ON lauf (start)',

            "CREATE TABLE IF NOT EXISTS ereignis (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                zeit         INTEGER NOT NULL,
                art          TEXT    NOT NULL,
                nachricht_id INTEGER,
                nutzer       TEXT    NOT NULL DEFAULT '',
                details      TEXT    NOT NULL DEFAULT '{}'
            )",
            'CREATE INDEX IF NOT EXISTS idx_ereignis_zeit      ON ereignis (zeit)',
            'CREATE INDEX IF NOT EXISTS idx_ereignis_nachricht ON ereignis (nachricht_id)',

            "CREATE TABLE IF NOT EXISTS absender_regel (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                muster      TEXT    NOT NULL UNIQUE,
                art         TEXT    NOT NULL,
                notiz       TEXT    DEFAULT '',
                angelegt_am INTEGER DEFAULT {$jetzt}
            )",
        ];
    }
}

/**
 * Anweisungsklasse aller Abfragen über Speicher::db(): execute([...]) bindet jeden Wert
 * nach seinem PHP-Typ.
 *
 * Ohne das bindet PDO alles als Text. Bei einem Vergleich mit einer Spalte gleicht SQLite das
 * aus, bei einem Vergleich mit einem Ausdruck nicht: „COALESCE(in_arbeit_bis, 0) <= ?“ oder
 * „eingang_am + 86400 < ?“ wären mit einer als Text gebundenen Zeit IMMER wahr, weil SQLite
 * jede Zahl kleiner einordnet als jeden Text. Belegungen, Fristen und Löschläufe hängen an
 * genau solchen Vergleichen. false wird außerdem zu 0 statt zu einem leeren Text.
 *
 * Steht in dieser Datei, weil sie nur zusammen mit Speicher::db() Sinn ergibt.
 */
final class SpeicherAnweisung extends \PDOStatement
{
    /** @param array<int|string,mixed>|null $params */
    public function execute(?array $params = null): bool
    {
        if ($params === null) {
            return parent::execute();
        }
        foreach ($params as $schluessel => $wert) {
            $typ = match (true) {
                is_int($wert), is_bool($wert) => \PDO::PARAM_INT,
                $wert === null                => \PDO::PARAM_NULL,
                default                       => \PDO::PARAM_STR,
            };
            // Fragezeichen zählt PDO ab 1; benannte Platzhalter heißen wie ihr Schlüssel.
            $this->bindValue(is_int($schluessel) ? $schluessel + 1 : $schluessel, is_bool($wert) ? (int) $wert : $wert, $typ);
        }
        return parent::execute();
    }
}
