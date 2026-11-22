<?php
/**
 * Ablauf des KI-Assistenten: Mails einlesen, einordnen, Entwurf erzeugen, auf Klick senden.
 *
 * EIN LAUF (lauf.php, alle fünf Minuten oder „Jetzt abrufen“):
 *   1. Postfach-Phase (höchstens 10 Sekunden): neue Mails holen, bereinigen, Regelstufe ohne KI,
 *      speichern; prüfen, ob auf wartende Mails inzwischen jemand geantwortet hat. Danach wird
 *      die Verbindung zum Postfach geschlossen.
 *   2. KI-Phase: für die älteste wartende Mail genau ein Aufruf (max_ki_je_lauf). Sie beginnt
 *      nur, wenn seit Laufbeginn weniger als 12 Sekunden vergangen sind – der Aufruf selbst darf
 *      20 Sekunden dauern, und der Webserver soll den Lauf nie mittendrin abbrechen.
 *   3. Aufräumen, Zeile in der Tabelle lauf, bei neuen Entwürfen eine Hinweis-Mail.
 *
 * GRUNDSÄTZE, die hier durchgesetzt werden:
 *   - Die KI schreibt, ein Mensch sendet. Kern::sende() läuft nur aus dem Admin-Bereich.
 *   - Jeder Statuswechsel ist ein bedingtes UPDATE; wer zu spät kommt, tut nichts. Wer an einer
 *     Nachricht arbeitet, belegt sie für zwei Minuten (in_arbeit_bis).
 *   - Während eines Netzaufrufs (Postfach, Claude, Mailversand) ist keine Transaktion offen.
 *   - Nie doppelt senden: Der Entwurf wechselt vor dem Versand auf „sendet“; ein unklarer
 *     Ausgang wird nie automatisch wiederholt, sondern an einen Menschen gegeben. Vor dem Senden
 *     wird im Postfach nachgesehen; lässt sich das nicht klären, sendet nur eine Bestätigung.
 *   - Absender lassen sich fälschen: Zusammengefasst wird nur bei gleichem Empfänger der Antwort,
 *     und eine abweichende Antwortadresse muss ein Mensch bestätigen.
 *   - Eine Absenderregel (Widerspruch) gilt vor jedem Aufruf, auch für schon wartende Mails.
 *   - Jeder Aufruf wird gebucht – auch der gescheiterte, und ein Aufruf ohne Antwort mit dem
 *     geschätzten Höchstpreis.
 *   - Protokolle und Ereignisse enthalten keinen Mailinhalt und keine Zugangsdaten.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Kern
{
    /** So viele neue Mails liest ein Lauf höchstens ein. */
    private const MAX_MAILS_JE_LAUF = 15;
    /** So viele wartende Nachrichten prüft und betrachtet ein Lauf höchstens (älteste zuerst). */
    private const MAX_KANDIDATEN = 100;
    /** Sekunden für die Postfach-Phase. */
    private const SEKUNDEN_POSTFACH = 10.0;
    /** Der KI-Schritt beginnt nur, wenn seit Laufbeginn weniger Sekunden vergangen sind. */
    private const SEKUNDEN_BIS_KI = 12.0;
    /** Mindestabstand zweier Läufe des Zeitauftrags in Sekunden. */
    private const ABSTAND_CRON = 50;
    /** Ältere Mails bekommen keinen Entwurf mehr, sondern gehen an einen Menschen. */
    private const HOECHSTALTER_SEK = 86400;
    /** Nach so vielen begonnenen Aufrufen ohne Ergebnis gilt eine Nachricht als gescheitert. */
    private const MAX_VERSUCHE = 3;
    /** So lange darf eine gleiche Anfrage zurückliegen, um ihr Ergebnis zu übernehmen. */
    private const DUPLIKAT_TAGE = 30;
    // Abstände der Hinweis- und Störungs-Mails (30 Minuten, 12 Stunden je Ursache) hält
    // Versand::sendeIntern() ein.

    private const KUERZE_LETZTE_ANTWORT = 800;
    private const KUERZE_FOLGE_MAIL = 1500;
    private const KUERZE_VERLAUF = 5000;
    private const KUERZE_ANTWORT = 6000;

    /** Gründe, aus denen gerade gar kein Aufruf möglich ist (gelten für alle wartenden Mails). */
    private const GRUENDE_FUER_ALLE = ['pausiert', 'sperre', 'kein_schluessel', 'limit_monat', 'limit_tag', 'limit_aufrufe'];

    /** Regel-Kategorien, deren Text aus Datensparsamkeit nicht gespeichert wird. */
    private const OHNE_TEXT = ['formular', 'eigene'];

    /** So lange darf das Manifest nicht passen oder die Wissensbasis veraltet sein, bevor eine Störung gemeldet wird. */
    private const DAUERSTOERUNG_SEK = 1800;

    /** Zusätzliche Frist nach der Belegung, bevor ein hängender Versand („sendet“) als unklar gilt. */
    private const SENDET_NACHFRIST_SEK = 300;

    /** Nach so vielen Sekunden seit Laufbeginn unterbleibt die Hinweis-Mail; der nächste Lauf holt sie nach. */
    private const SEKUNDEN_BIS_HINWEIS = 25.0;

    /** Prüfhinweis, wenn sich vor dem Senden nicht klären ließ, ob schon jemand geantwortet hat. */
    public const HINWEIS_NICHT_GEPRUEFT = 'Konnte nicht prüfen, ob schon jemand geantwortet hat (Postfach nicht erreichbar oder Mail nicht mehr im Posteingang). Bitte im Mailprogramm nachsehen.';

    /**
     * Für Tests: ersetzt Versand::sende() (gleiche Parameter, gleiche Rückgabe), damit sich
     * auch der Ausgang „unklar“ ohne Mailserver nachstellen lässt.
     */
    public static ?\Closure $sendeErsatz = null;

    // =======================================================================================
    // Postfach
    // =======================================================================================

    /**
     * Das Postfach, mit dem gearbeitet wird: ein Ordner mit .eml-Dateien (Tests, Vorschau) oder
     * das echte Postfach per IMAP. null, wenn kein Zugang hinterlegt ist, die Bibliotheken
     * fehlen oder die Verbindung scheitert.
     */
    public static function postfach(): ?Postfach
    {
        return self::oeffnePostfach()[0];
    }

    /**
     * @return array{0: ?Postfach, 1: string} Postfach und – wenn es fehlt – der Grund:
     *         'kein_zugang', 'bibliotheken' oder 'nicht_erreichbar'
     */
    private static function oeffnePostfach(): array
    {
        $ziel = getenv('KZP_ASSISTENT_POSTFACH');
        try {
            if (is_string($ziel) && str_starts_with($ziel, 'datei:')) {
                $ordner = substr($ziel, 6);
                return $ordner !== '' && is_dir($ordner)
                    ? [new DateiPostfach($ordner), '']
                    : [null, 'nicht_erreichbar'];
            }
            if (!Umgebung::$bibliotheken) {
                return [null, 'bibliotheken'];
            }
            $zugang = Zugang::imap();
            if ($zugang === null) {
                return [null, 'kein_zugang'];
            }
            return [new ImapPostfach($zugang), ''];
        } catch (\Throwable $e) {
            self::protokolliere($e);
            return [null, 'nicht_erreichbar'];
        }
    }

    // =======================================================================================
    // Lauf
    // =======================================================================================

    /**
     * Ein Verarbeitungslauf.
     *
     * $beginn: Startzeit der Anfrage (lauf.php gibt REQUEST_TIME_FLOAT mit) – so zählt die Zeit
     * für das Laden der Bibliotheken zum Zeitbudget. Ohne Angabe: jetzt. In Tests und in einem
     * Prozess mit mehreren Läufen bleibt es bei „jetzt“, sonst hielte jeder spätere Lauf sein
     * Budget für verbraucht.
     *
     * @param string $ausloeser 'cron' | 'admin' | 'test'
     * @return array{ok: bool, abgerufen: int, ohne_ki: int, mit_ki: int, entwuerfe: int, fehler: int,
     *               hinweis: string, dauer_ms: int, stoerung: bool}
     *         stoerung: ein Dauerzustand, den der Aufrufer als Fehler melden soll (lauf.php: HTTP 503)
     */
    public static function lauf(string $ausloeser, int $zeitbudgetSek = 20, ?float $beginn = null): array
    {
        $beginn = $beginn !== null && $beginn > 0 && $beginn <= microtime(true) ? $beginn : microtime(true);
        $ausloeser = in_array($ausloeser, ['cron', 'admin', 'test'], true) ? $ausloeser : 'cron';
        $z = ['ok' => true, 'abgerufen' => 0, 'ohne_ki' => 0, 'mit_ki' => 0, 'entwuerfe' => 0, 'fehler' => 0, 'hinweis' => '', 'dauer_ms' => 0, 'stoerung' => false];
        $hinweise = [];
        $fertig = static function () use (&$z, &$hinweise, $beginn): array {
            $z['hinweis'] = implode('; ', array_unique($hinweise));
            $z['dauer_ms'] = (int) round((microtime(true) - $beginn) * 1000);
            return $z;
        };

        // Während der Deploy Dateien hochlädt, passen sie kurz nicht zusammen – dann lieber aussetzen.
        // Bleibt das so (Upload abgebrochen, Folge-Deploy gescheitert), ist es eine Störung: Sonst
        // liest der Assistent unbemerkt keine Mail mehr ein.
        $manifest = self::manifestStimmt();
        if ($manifest === false) {
            $hinweise[] = 'Deploy läuft';
            if (self::dauerzustand('manifest_abweichend_seit', true)) {
                $z['ok'] = false;
                $z['stoerung'] = true;
                $z['fehler']++;
                $hinweise[] = 'Deploy unvollständig – die Dateien passen seit über 30 Minuten nicht zusammen';
                self::stoerung('deploy');
            }
            return $fertig();
        }
        self::dauerzustand('manifest_abweichend_seit', false);

        $sperre = @fopen(Umgebung::datenOrdner() . '/lauf.lock', 'c');
        if ($sperre === false) {
            $z['ok'] = false;
            $z['fehler']++;
            $hinweise[] = 'Sperrdatei nicht schreibbar';
            return $fertig();
        }
        if (!flock($sperre, LOCK_EX | LOCK_NB)) {
            fclose($sperre);
            $hinweise[] = 'läuft bereits';
            return $fertig();
        }

        $start = Umgebung::jetzt();
        $schreiben = false;
        try {
            $db = Speicher::db();
            if ($ausloeser === 'cron') {
                $letzter = (int) $db->query('SELECT COALESCE(MAX(start), 0) FROM lauf')->fetchColumn();
                if ($letzter > 0 && $start - $letzter >= 0 && $start - $letzter < self::ABSTAND_CRON) {
                    $hinweise[] = 'zu früh (letzter Lauf vor weniger als ' . self::ABSTAND_CRON . ' Sekunden)';
                    return $fertig();
                }
            }
            $schreiben = true;
            $budget = max(4, $zeitbudgetSek);
            $grenzePostfach = min(self::SEKUNDEN_POSTFACH, $budget * 0.5);
            $grenzeKi = min(self::SEKUNDEN_BIS_KI, $budget * 0.6);

            // Ein Versand, der unterwegs abgebrochen ist, wird zuerst geklärt – bevor eine Folge-Mail
            // ihn „zusammenfassen“ und den roten Hinweis verschwinden lassen könnte.
            self::klaereHaengendeVersaende($start);

            // Veraltete Wissensbasis (Assistent beim letzten Veröffentlichen nicht aktualisiert):
            // Der Prüfer sperrt dann alle Preise. Hält das an, wird es als Störung gemeldet.
            $wissenJetzt = Wissen::laden();
            $veraltet = $wissenJetzt !== null && Wissen::veraltet($wissenJetzt);
            if ($veraltet) {
                $hinweise[] = 'Wissensbasis veraltet – Preise gesperrt';
            }
            if (self::dauerzustand('wissen_veraltet_seit', $veraltet)) {
                // Nur die Störungs-Mail (höchstens eine in 12 Stunden): Der Assistent arbeitet weiter,
                // ein roter Abruf alle fünf Minuten wäre hier zu viel.
                self::stoerung('wissen');
            }

            // IDs der wartenden Nachrichten, deren Markierungen in diesem Lauf gelesen wurden: Nur für
            // sie darf die KI-Phase aufrufen (Bauplan 7.3 – erst prüfen, ob ein Mensch geantwortet hat).
            $geprueft = [];
            $postfachOk = self::postfachPhase($z, $hinweise, $beginn, $grenzePostfach, $start, $geprueft);
            self::gibZuAlteAb($start);

            if (!$postfachOk) {
                // Ohne Blick ins Postfach ist unklar, ob schon jemand geantwortet hat.
                $hinweise[] = 'KI-Schritt ausgelassen';
            } elseif (microtime(true) - $beginn >= $grenzeKi) {
                $hinweise[] = 'KI-Schritt aus Zeitgründen im nächsten Lauf';
            } else {
                self::kiPhase($z, $hinweise, $beginn, $grenzeKi, $ausloeser, $geprueft);
            }

            // Auch Entwürfe aus „Neu erzeugen“ oder ein wegen Zeitmangels verschobener Hinweis
            // werden so gemeldet: hinweisMail() sieht selbst nach, ob es seit dem letzten Hinweis
            // neue Entwürfe gibt. Ohne Zeitpuffer nicht – der nächste Lauf holt ihn nach.
            if (microtime(true) - $beginn < self::SEKUNDEN_BIS_HINWEIS) {
                self::hinweisMail();
            }
            try {
                Speicher::aufraeumen();
            } catch (\Throwable $e) {
                self::protokolliere($e);
                $z['fehler']++;
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
            $z['ok'] = false;
            $z['fehler']++;
            $hinweise[] = 'interner Fehler (' . self::klasse($e) . ')';
        } finally {
            if ($schreiben) {
                self::schreibeLauf($start, $ausloeser, $z, implode('; ', array_unique($hinweise)));
            }
            flock($sperre, LOCK_UN);
            fclose($sperre);
        }
        return $fertig();
    }

    /**
     * Postfach-Phase. true, wenn das Postfach erreichbar war (oder noch keines eingerichtet ist
     * und deshalb nichts einzulesen bleibt).
     *
     * @param array<string, mixed> $z
     * @param string[] $hinweise
     * @param array<int, true> $geprueft wird gefüllt: wartende Nachrichten, deren Flags gelesen wurden
     */
    private static function postfachPhase(array &$z, array &$hinweise, float $beginn, float $grenze, int $jetzt, array &$geprueft): bool
    {
        [$postfach, $grund] = self::oeffnePostfach();
        if ($postfach === null) {
            if ($grund === 'kein_zugang') {
                $hinweise[] = 'Postfach-Zugang nicht hinterlegt';
                return true;
            }
            $hinweise[] = $grund === 'bibliotheken' ? 'Bibliotheken fehlen' : 'Postfach nicht erreichbar';
            $z['ok'] = false;
            $z['fehler']++;
            if ($grund === 'nicht_erreichbar') {
                self::meldePostfachAusfall();
            }
            return false;
        }

        try {
            $stand = $postfach->status();
            $uidvalidity = (int) ($stand['uidvalidity'] ?? 0);
            $uidnext = (int) ($stand['uidnext'] ?? 1);
            $bekannt = Speicher::einstellung('uidvalidity');

            if (Speicher::einstellung('start_uid') === '') {
                // Erster Lauf: „ab jetzt“. Was schon im Postfach liegt, bleibt unberührt.
                self::setzeMarke($uidvalidity, $uidnext);
                Speicher::ereignis('startmarke', null, 'lauf', ['uidnext' => $uidnext]);
                $hinweise[] = 'Startmarke gesetzt – ab jetzt werden neue Mails eingelesen';
                return true;
            }
            if ($bekannt !== '' && (int) $bekannt !== $uidvalidity) {
                // Der Mailserver hat das Postfach neu aufgebaut; die alten UIDs bedeuten nichts mehr.
                self::setzeMarke($uidvalidity, $uidnext);
                Speicher::ereignis('uidvalidity_geaendert', null, 'lauf', ['uidnext' => $uidnext]);
                $hinweise[] = 'Postfach wurde neu aufgebaut – Startmarke neu gesetzt';
                return true;
            }
            if ($bekannt === '') {
                Speicher::setze('uidvalidity', (string) $uidvalidity, 'lauf');
            }

            $letzte = (int) Speicher::einstellung('letzte_uid');
            $uids = array_map('intval', $postfach->neueUids($letzte, self::MAX_MAILS_JE_LAUF));
            sort($uids);
            foreach (array_slice($uids, 0, self::MAX_MAILS_JE_LAUF) as $uid) {
                if ($uid <= $letzte) {
                    continue;
                }
                if (microtime(true) - $beginn >= $grenze) {
                    $hinweise[] = 'weitere Mails im nächsten Lauf';
                    break;
                }
                $mail = $postfach->hole($uid);
                if (is_array($mail)) {
                    $status = self::liesEin($mail, $uid, $uidvalidity, $jetzt);
                    if ($status !== '') {
                        $z['abgerufen']++;
                        if ($status !== 'wartet_ki') {
                            $z['ohne_ki']++;
                        }
                    }
                } else {
                    $z['fehler']++;
                    Speicher::ereignis('mail_nicht_lesbar', null, 'lauf', ['uid' => $uid]);
                }
                // Nach jeder Mail fortschreiben: Bricht der Lauf ab, wird keine doppelt gelesen.
                Speicher::setze('letzte_uid', (string) $uid, 'lauf');
                $letzte = $uid;
            }

            $geprueft = self::pruefeBeantwortet($postfach, $uidvalidity);
            return true;
        } catch (\Throwable $e) {
            self::protokolliere($e);
            $z['ok'] = false;
            $z['fehler']++;
            $hinweise[] = 'Postfach nicht erreichbar';
            self::meldePostfachAusfall();
            return false;
        } finally {
            // Vor dem KI-Aufruf ist die Verbindung zum Postfach geschlossen (Bauplan 7.2).
            self::schliesse($postfach);
        }
    }

    private static function setzeMarke(int $uidvalidity, int $uidnext): void
    {
        $marke = (string) max(0, $uidnext - 1);
        Speicher::setze('uidvalidity', (string) $uidvalidity, 'lauf');
        Speicher::setze('letzte_uid', $marke, 'lauf');
        Speicher::setze('start_uid', $marke, 'lauf');
    }

    /**
     * Speichert eine neue Mail mit dem Ergebnis der Regelstufe.
     *
     * @param array<string, mixed> $mail neutrale Nachricht
     * @return string der vergebene Status; '' wenn die Mail schon bekannt war
     */
    private static function liesEin(array $mail, int $uid, int $uidvalidity, int $jetzt): string
    {
        $bereinigt = Text::bereinige((string) ($mail['text'] ?? ''), !empty($mail['ist_html']));
        $text = (string) ($bereinigt['text'] ?? '');
        $regel = Regeln::pruefe($mail, $text);
        $kategorie = (string) ($regel['kategorie'] ?? '');
        $regelGrund = (string) ($regel['grund'] ?? '');

        $datum = (int) ($mail['datum'] ?? 0);
        $eingang = $datum > 0 ? min($datum, $jetzt) : $jetzt;

        $statusGrund = '';
        if ($kategorie === '' && $jetzt - $eingang > self::HOECHSTALTER_SEK) {
            // Nach einer Pause holt die KI nur die letzten 24 Stunden nach.
            $kategorie = 'zu_alt';
            $regelGrund = 'älter als 24 Stunden';
        }
        if ($kategorie === '') {
            $status = 'wartet_ki';
        } elseif ($kategorie === 'zu_alt') {
            $status = 'mensch';
            $statusGrund = 'zu_alt';
        } elseif ($kategorie === 'mensch') {
            $status = 'mensch';
            $statusGrund = 'absenderregel';
        } else {
            $status = 'ohne_ki';
        }

        $betreff = self::einzeilig((string) ($mail['betreff'] ?? ''), 500);
        $von = mb_strtolower(trim((string) ($mail['von_adresse'] ?? '')));
        $messageId = trim((string) ($mail['message_id'] ?? ''));
        $inReplyTo = trim((string) ($mail['in_reply_to'] ?? ''));
        $verweise = trim((string) ($mail['verweise'] ?? ''));

        $anhaenge = [];
        foreach ((array) ($mail['anhaenge'] ?? []) as $anhang) {
            if (is_array($anhang)) {
                // Nur Art und Größe – nie Dateinamen oder Inhalt.
                $anhaenge[] = ['art' => (string) ($anhang['art'] ?? 'sonst'), 'bytes' => (int) ($anhang['bytes'] ?? 0)];
            }
        }

        $db = Speicher::db();
        $einfuegen = $db->prepare(
            'INSERT OR IGNORE INTO nachricht (kanal, uidvalidity, uid, message_id, in_reply_to, verweise, thread_schluessel,
                von_adresse, von_name, antwort_an, betreff, eingang_am, text_bereinigt, text_hash, zeichen_original,
                gekuerzt, anhaenge, regel_kategorie, regel_grund, status, status_grund, versuche, erstellt_am,
                aktualisiert_am, in_arbeit_bis)
             VALUES (:kanal, :uidvalidity, :uid, :message_id, :in_reply_to, :verweise, :thread, :von, :von_name, :antwort_an,
                :betreff, :eingang, :text, :hash, :zeichen, :gekuerzt, :anhaenge, :kategorie, :regel_grund, :status,
                :status_grund, 0, :erstellt, :aktualisiert, 0)'
        );
        $einfuegen->execute([
            ':kanal' => 'email',
            ':uidvalidity' => $uidvalidity,
            ':uid' => $uid,
            ':message_id' => $messageId,
            ':in_reply_to' => $inReplyTo,
            ':verweise' => $verweise,
            ':thread' => self::threadSchluessel($messageId, $inReplyTo, $verweise, $uidvalidity, $uid),
            ':von' => $von,
            ':von_name' => self::einzeilig((string) ($mail['von_name'] ?? ''), 200),
            ':antwort_an' => mb_strtolower(trim((string) ($mail['antwort_an'] ?? ''))),
            ':betreff' => $betreff,
            ':eingang' => $eingang,
            ':text' => in_array($kategorie, self::OHNE_TEXT, true) ? '' : $text,
            ':hash' => Text::hash($betreff, $text),
            ':zeichen' => (int) ($bereinigt['zeichen_original'] ?? mb_strlen($text)),
            ':gekuerzt' => empty($bereinigt['gekuerzt']) ? 0 : 1,
            ':anhaenge' => (string) json_encode($anhaenge),
            ':kategorie' => $kategorie,
            ':regel_grund' => self::einzeilig($regelGrund, 300),
            ':status' => $status,
            ':status_grund' => $statusGrund,
            ':erstellt' => $jetzt,
            ':aktualisiert' => $jetzt,
        ]);
        if ($einfuegen->rowCount() < 1) {
            return '';
        }
        $id = (int) $db->lastInsertId();

        if ($status === 'wartet_ki' && $von !== '') {
            self::fasseFruehereZusammen($id, ['von_adresse' => $von, 'antwort_an' => mb_strtolower(trim((string) ($mail['antwort_an'] ?? '')))], $jetzt);
        }
        return $status;
    }

    /**
     * Schreibt derselbe Absender erneut, während seine frühere Mail noch wartet oder ihr Entwurf
     * offen ist, wird die frühere „zusammengefasst“: Eine Antwort soll beide Mails abdecken.
     * Ihr Text geht als Verlauf in den neuen Aufruf (siehe bisher()); zusammengefasst_in zeigt
     * auf die neue Nachricht.
     *
     * Nur bei GLEICHEM tatsächlichem Empfänger (Versand::empfaengerAdresse, Reply-To vor From):
     * Eine Mail mit gefälschtem Absender und eigener Antwortadresse würde sonst die echte Anfrage
     * verschlucken, und deren Inhalt ginge mit der Antwort an den Fälscher. Ohne Gleichheit bleiben
     * beide Mails getrennt. Nie zusammengefasst wird eine Nachricht, deren Versand läuft oder unklar ist.
     *
     * @param array{von_adresse: string, antwort_an: string} $neu
     */
    private static function fasseFruehereZusammen(int $neueId, array $neu, int $jetzt): void
    {
        $empfaenger = Versand::empfaengerAdresse($neu);
        if ($empfaenger === '') {
            return;
        }
        $suche = Speicher::db()->prepare(
            "SELECT id, status, von_adresse, antwort_an FROM nachricht n
             WHERE von_adresse = :von AND id != :id AND kanal = 'email'
               AND status IN ('wartet_ki', 'entwurf') AND in_arbeit_bis <= :jetzt
               AND NOT EXISTS (SELECT 1 FROM entwurf w WHERE w.nachricht_id = n.id AND w.status IN ('sendet', 'unklar'))"
        );
        $suche->execute([':von' => $neu['von_adresse'], ':id' => $neueId, ':jetzt' => $jetzt]);
        $db = Speicher::db();
        foreach ($suche->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
            if (Versand::empfaengerAdresse($zeile) !== $empfaenger) {
                continue;
            }
            $id = (int) $zeile['id'];
            if (Speicher::wechsle('nachricht', $id, (string) $zeile['status'], 'zusammengefasst',
                ['status_grund' => 'folge_mail', 'zusammengefasst_in' => $neueId])) {
                self::loeseEntwuerfeAb($id, 'ueberholt');
                // Was in die frühere Mail zusammengefasst war, gehört jetzt zur neuen.
                $db->prepare("UPDATE nachricht SET zusammengefasst_in = ? WHERE zusammengefasst_in = ? AND status = 'zusammengefasst'")
                    ->execute([$neueId, $id]);
                Speicher::ereignis('zusammengefasst', $id, 'lauf', ['folge_nachricht' => $neueId]);
            }
        }
    }

    /**
     * Holt die Mails zurück, die in $id zusammengefasst waren, wenn $id ohne Antwort endet
     * (verworfen oder „Ich antworte selbst“). Sie erscheinen wieder unter „Zu erledigen“ –
     * beim Menschen, ohne neuen KI-Aufruf (das kostete Geld und brächte einen Angriff mit
     * gefälschtem Absender ein zweites Mal ins Spiel).
     */
    private static function holeZusammengefassteZurueck(int $id, string $nutzer): void
    {
        $suche = Speicher::db()->prepare("SELECT id FROM nachricht WHERE zusammengefasst_in = ? AND status = 'zusammengefasst'");
        $suche->execute([$id]);
        foreach ($suche->fetchAll(\PDO::FETCH_COLUMN) as $frueher) {
            if (Speicher::wechsle('nachricht', (int) $frueher, 'zusammengefasst', 'mensch',
                ['status_grund' => 'vorgaenger_offen', 'zusammengefasst_in' => 0])) {
                Speicher::ereignis('zurueckgeholt', (int) $frueher, $nutzer, ['folge_nachricht' => $id]);
            }
        }
    }

    /**
     * Ein Versand, der unterwegs abgebrochen ist (Entwurf steht noch auf „sendet“, die Belegung ist
     * seit einer Nachfrist abgelaufen), ist unklar (Bauplan 7.3): Entwurf „unklar“, Nachricht beim
     * Menschen mit „versand_unklar“. Dann greifen alle Sperren gegen einen zweiten Versand.
     */
    private static function klaereHaengendeVersaende(int $jetzt): void
    {
        $suche = Speicher::db()->prepare(
            "SELECT w.id AS entwurf_id, n.id AS nachricht_id FROM entwurf w JOIN nachricht n ON n.id = w.nachricht_id
             WHERE w.status = 'sendet' AND n.status = 'entwurf' AND COALESCE(n.in_arbeit_bis, 0) <= :grenze LIMIT 50"
        );
        $suche->execute([':grenze' => $jetzt - self::SENDET_NACHFRIST_SEK]);
        foreach ($suche->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
            $nachrichtId = (int) $zeile['nachricht_id'];
            if (!Speicher::belege($nachrichtId, 30)) {
                continue;
            }
            try {
                if (Speicher::wechsle('entwurf', (int) $zeile['entwurf_id'], 'sendet', 'unklar')) {
                    Speicher::wechsle('nachricht', $nachrichtId, 'entwurf', 'mensch', ['status_grund' => 'versand_unklar']);
                    Speicher::ereignis('versand_unklar', $nachrichtId, 'lauf', ['entwurf_id' => (int) $zeile['entwurf_id'], 'abgebrochen' => true]);
                }
            } finally {
                Speicher::gibFrei($nachrichtId);
            }
        }
    }

    /**
     * Schlüssel des Vorgangs: erste ID aus „References“, sonst „In-Reply-To“, sonst die eigene
     * Message-ID. Zeigt die ID auf eine bekannte Nachricht oder auf eine von hier gesendete
     * Antwort, gilt deren Vorgang – manche Mailprogramme lassen „References“ weg.
     */
    private static function threadSchluessel(string $messageId, string $inReplyTo, string $verweise, int $uidvalidity, int $uid): string
    {
        $kandidat = '';
        foreach ([$verweise, $inReplyTo] as $kopf) {
            if (preg_match('/<([^<>\s]+)>/', $kopf, $m) === 1) {
                $kandidat = $m[1];
                break;
            }
            if (trim($kopf) !== '') {
                $kandidat = self::ohneKlammern((string) strtok(trim($kopf), " \t\r\n"));
                break;
            }
        }
        $eigene = self::ohneKlammern($messageId);
        if ($kandidat === '') {
            return $eigene !== '' ? $eigene : 'uid:' . $uidvalidity . ':' . $uid;
        }
        $db = Speicher::db();
        $formen = [$kandidat, '<' . $kandidat . '>'];
        $bekannt = $db->prepare('SELECT thread_schluessel FROM nachricht WHERE message_id IN (?, ?) ORDER BY id DESC LIMIT 1');
        $bekannt->execute($formen);
        $thread = $bekannt->fetchColumn();
        if (!is_string($thread) || $thread === '') {
            $gesendet = $db->prepare(
                'SELECT n.thread_schluessel FROM entwurf e JOIN nachricht n ON n.id = e.nachricht_id
                 WHERE e.gesendet_message_id IN (?, ?) ORDER BY e.id DESC LIMIT 1'
            );
            $gesendet->execute($formen);
            $thread = $gesendet->fetchColumn();
        }
        return is_string($thread) && $thread !== '' ? $thread : $kandidat;
    }

    /**
     * Nachlauf: Hat inzwischen jemand aus dem Mailprogramm geantwortet (Flag \Answered am
     * Original), braucht es keinen Entwurf mehr. Das ist zugleich die Prüfung vor dem KI-Aufruf:
     * Die wartenden Nachrichten werden in der Reihenfolge der KI-Phase gelesen, und nur, wer hier
     * geprüft wurde und noch im Posteingang liegt, kommt in diesem Lauf an die KI.
     *
     * @return array<int, true> IDs der geprüften, weiter wartenden Nachrichten
     */
    private static function pruefeBeantwortet(Postfach $postfach, int $uidvalidity): array
    {
        $db = Speicher::db();
        // Nachrichten eines früheren Postfach-Aufbaus (UIDVALIDITY anders) lassen sich nie mehr
        // prüfen: ein offener Entwurf bekommt den Hinweis, ein fertiger Entwurf, der noch auf das
        // stärkere Modell wartet, wird freigegeben (sonst wartete er für immer).
        $fremd = $db->prepare(
            "SELECT id, status, status_grund FROM nachricht
             WHERE kanal = 'email' AND COALESCE(uidvalidity, 0) != :v
               AND (status = 'entwurf' OR (status = 'wartet_ki' AND status_grund = 'stark')) LIMIT 200"
        );
        $fremd->execute([':v' => $uidvalidity]);
        foreach ($fremd->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
            self::nichtImPosteingang((int) $zeile['id'], (string) $zeile['status'], (string) $zeile['status_grund']);
        }

        $wartend = $db->prepare(
            "SELECT id, uid, status, status_grund FROM nachricht
             WHERE status = 'wartet_ki' AND kanal = 'email' AND uidvalidity = :v
             ORDER BY (status_grund = 'stark') DESC, eingang_am ASC, id ASC LIMIT " . self::MAX_KANDIDATEN
        );
        $wartend->execute([':v' => $uidvalidity]);
        $offen = $db->prepare(
            "SELECT id, uid, status, status_grund FROM nachricht
             WHERE status = 'entwurf' AND kanal = 'email' AND uidvalidity = :v
             ORDER BY id DESC LIMIT 200"
        );
        $offen->execute([':v' => $uidvalidity]);
        $zeilen = array_merge($wartend->fetchAll(\PDO::FETCH_ASSOC), $offen->fetchAll(\PDO::FETCH_ASSOC));
        if ($zeilen === []) {
            return [];
        }
        $flags = $postfach->flags(array_values(array_unique(array_map(static fn (array $z): int => (int) $z['uid'], $zeilen))));
        $geprueft = [];
        foreach ($zeilen as $zeile) {
            $uid = (int) $zeile['uid'];
            if (!array_key_exists($uid, $flags)) {
                // Nicht mehr im Posteingang (verschoben oder gelöscht): nicht ungeprüft an die KI.
                // Oft wurde die Mail im Mailprogramm beantwortet und dann abgelegt – das soll der
                // Mensch vor dem Senden wissen (und senden lässt es sich nur mit Bestätigung).
                self::nichtImPosteingang((int) $zeile['id'], (string) $zeile['status'], (string) ($zeile['status_grund'] ?? ''));
                continue;
            }
            if (is_array($flags[$uid]) && self::istBeantwortet($flags[$uid])) {
                self::markiereBeantwortet((int) $zeile['id'], (string) $zeile['status']);
            } elseif ($zeile['status'] === 'wartet_ki') {
                $geprueft[(int) $zeile['id']] = true;
            } elseif ((string) ($zeile['status_grund'] ?? '') === 'nicht_im_posteingang') {
                // Wieder da (zurückverschoben): Hinweis entfällt.
                $db->prepare("UPDATE nachricht SET status_grund = '' WHERE id = ? AND status = 'entwurf' AND status_grund = 'nicht_im_posteingang'")
                    ->execute([(int) $zeile['id']]);
            }
        }
        return $geprueft;
    }

    /**
     * Eine Nachricht ist nicht mehr im Posteingang zu finden. Offener Entwurf: Hinweis
     * „nicht_im_posteingang“ (keine Hinweis-Mail mehr dafür, Senden nur mit Bestätigung).
     * Wartet ein fertiger Entwurf auf das stärkere Modell: ohne Überarbeitung freigeben, mit
     * demselben Hinweis. Andere wartende Mails gibt gibZuAlteAb() nach 24 Stunden ab.
     */
    private static function nichtImPosteingang(int $id, string $status, string $grund): void
    {
        if ($status === 'entwurf' && $grund !== 'nicht_im_posteingang') {
            Speicher::db()->prepare("UPDATE nachricht SET status_grund = 'nicht_im_posteingang', aktualisiert_am = ?
                                     WHERE id = ? AND status = 'entwurf' AND status_grund = ''")
                ->execute([Umgebung::jetzt(), $id]);
        } elseif ($status === 'wartet_ki' && $grund === 'stark' && self::offenerEntwurf($id) !== null) {
            if (Speicher::wechsle('nachricht', $id, 'wartet_ki', 'entwurf', ['status_grund' => 'nicht_im_posteingang', 'versuche' => 0])) {
                Speicher::ereignis('nicht_im_posteingang', $id, 'lauf', []);
            }
        }
    }

    /**
     * Einzelprüfung an einem offenen Postfach: true = beantwortet, false = nicht beantwortet,
     * null = nicht prüfbar (kein Postfach, Postfach neu aufgebaut, Mail nicht mehr im Posteingang).
     *
     * @param array<string, mixed> $n Zeile der Tabelle nachricht
     */
    private static function beantwortetImPostfach(?Postfach $postfach, array $n): ?bool
    {
        if ($postfach === null || (int) ($postfach->status()['uidvalidity'] ?? -1) !== (int) $n['uidvalidity']) {
            return null;
        }
        $uid = (int) $n['uid'];
        $flags = $postfach->flags([$uid]);
        if (!array_key_exists($uid, $flags)) {
            return null;
        }
        return is_array($flags[$uid]) && self::istBeantwortet($flags[$uid]);
    }

    /** @param array<mixed> $flags */
    private static function istBeantwortet(array $flags): bool
    {
        foreach ($flags as $flag) {
            if (is_string($flag) && strtolower(ltrim(trim($flag), '\\')) === 'answered') {
                return true;
            }
        }
        return false;
    }

    private static function markiereBeantwortet(int $id, string $von): bool
    {
        if (!Speicher::wechsle('nachricht', $id, $von, 'mensch', ['status_grund' => 'beantwortet'])) {
            return false;
        }
        self::loeseEntwuerfeAb($id, 'ueberholt');
        Speicher::ereignis('selbst_beantwortet', $id, 'lauf', []);
        return true;
    }

    /**
     * Wartet eine Nachricht wegen Pause oder Limit länger als 24 Stunden, bekommt sie keinen
     * Entwurf mehr: Eine Antwort von gestern auf eine Frage von vorgestern hilft niemandem.
     */
    private static function gibZuAlteAb(int $jetzt): void
    {
        $suche = Speicher::db()->prepare(
            "SELECT id FROM nachricht WHERE status = 'wartet_ki' AND status_grund != 'stark'
               AND eingang_am < :grenze AND in_arbeit_bis <= :jetzt LIMIT 200"
        );
        $suche->execute([':grenze' => $jetzt - self::HOECHSTALTER_SEK, ':jetzt' => $jetzt]);
        foreach ($suche->fetchAll(\PDO::FETCH_COLUMN) as $id) {
            if (Speicher::wechsle('nachricht', (int) $id, 'wartet_ki', 'mensch', ['status_grund' => 'zu_alt'])) {
                self::loeseEntwuerfeAb((int) $id, 'ueberholt');
                Speicher::ereignis('zu_alt', (int) $id, 'lauf', []);
            }
        }
    }

    /**
     * KI-Phase: höchstens $max Aufrufe. Nachrichten, die auf das stärkere Modell warten, kommen
     * zuerst – ihr erster Entwurf liegt schon vor und soll nicht länger zurückgehalten werden.
     * Infrage kommen nur Nachrichten, deren Markierungen die Postfach-Phase gerade gelesen hat.
     *
     * @param array<string, mixed> $z
     * @param string[] $hinweise
     * @param array<int, true> $geprueft
     */
    private static function kiPhase(array &$z, array &$hinweise, float $beginn, float $grenze, string $ausloeser, array $geprueft): void
    {
        $jetzt = Umgebung::jetzt();
        $suche = Speicher::db()->prepare(
            "SELECT id FROM nachricht WHERE status = 'wartet_ki' AND in_arbeit_bis <= :jetzt
             ORDER BY (status_grund = 'stark') DESC, eingang_am ASC, id ASC LIMIT " . self::MAX_KANDIDATEN
        );
        $suche->execute([':jetzt' => $jetzt]);
        $alle = array_map('intval', $suche->fetchAll(\PDO::FETCH_COLUMN));
        $kandidaten = array_values(array_filter($alle, static fn (int $id): bool => isset($geprueft[$id])));
        if ($kandidaten === []) {
            if ($alle !== []) {
                $hinweise[] = 'KI wartet: Antwortstatus im Postfach nicht geprüft';
            }
            return;
        }
        $wissen = Wissen::laden();
        if ($wissen === null) {
            $z['ok'] = false;
            $z['fehler']++;
            $hinweise[] = 'Wissensbasis fehlt';
            return;
        }

        // Der Zeitauftrag macht einen Aufruf je Lauf; „Jetzt abrufen“ im Admin-Bereich bis zu drei.
        $max = $ausloeser === 'admin' ? 3 : max(1, min(3, (int) Speicher::einstellung('max_ki_je_lauf')));
        $aufrufe = 0;
        foreach ($kandidaten as $id) {
            if ($aufrufe >= $max || microtime(true) - $beginn >= $grenze) {
                break;
            }
            $r = self::schritt($id, false, $wissen, $geprueft);
            if ($r['aufruf']) {
                $aufrufe++;
                $z['mit_ki']++;
            }
            if ($r['entwurf']) {
                $z['entwuerfe']++;
            }
            if ($r['ok']) {
                continue;
            }
            $grund = $r['grund'];
            if (in_array($grund, self::GRUENDE_FUER_ALLE, true)) {
                self::markiereWartende($grund);
                $hinweise[] = 'KI: ' . self::grundText($grund);
                if ($grund === 'limit_monat') {
                    self::stoerung('limit_monat');
                }
                break;
            }
            if ($r['aufruf']) {
                // Ein gescheiterter Aufruf: nicht im selben Lauf gleich die nächste Mail hinterherschicken.
                $z['fehler']++;
                $hinweise[] = 'KI-Aufruf gescheitert (' . $grund . ')';
                break;
            }
        }
    }

    private static function markiereWartende(string $grund): void
    {
        Speicher::db()
            ->prepare("UPDATE nachricht SET status_grund = :g, aktualisiert_am = :j
                       WHERE status = 'wartet_ki' AND status_grund NOT IN ('stark', :bisher)")
            ->execute([':g' => $grund, ':bisher' => $grund, ':j' => Umgebung::jetzt()]);
    }

    private static function grundText(string $grund): string
    {
        return match ($grund) {
            'pausiert' => 'pausiert',
            'sperre' => 'gesperrt nach einem Fehler des Anbieters',
            'kein_schluessel' => 'kein API-Schlüssel hinterlegt',
            'limit_monat' => 'Monatslimit erreicht',
            'limit_tag' => 'Tageslimit erreicht',
            'limit_aufrufe' => 'Aufruflimit des Tages erreicht',
            'limit_absender' => 'Limit dieses Absenders erreicht',
            default => $grund,
        };
    }

    /** @param array<string, mixed> $z */
    private static function schreibeLauf(int $start, string $ausloeser, array $z, string $hinweis): void
    {
        try {
            Speicher::db()
                ->prepare('INSERT INTO lauf (start, ende, ausloeser, abgerufen, ohne_ki, mit_ki, entwuerfe, fehler, hinweis)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
                ->execute([
                    $start, max($start, Umgebung::jetzt()), $ausloeser, (int) $z['abgerufen'], (int) $z['ohne_ki'],
                    (int) $z['mit_ki'], (int) $z['entwuerfe'], (int) $z['fehler'], self::einzeilig($hinweis, 300),
                ]);
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    // =======================================================================================
    // KI-Schritt
    // =======================================================================================

    /**
     * Ein KI-Schritt für eine wartende Nachricht: höchstens ein Aufruf.
     *
     * @return array{ok: bool, grund: string}
     *         grund bei Erfolg: 'entwurf' | 'duplikat' | 'stark' (wartet auf das stärkere Modell) |
     *         'abgelehnt' (Modell hat verweigert, leerer Entwurf). Sonst der Grund, warum nichts
     *         entstand: ein status_grund aus Budget::darfAufrufen, eine Fehlerart von Claude::rufe,
     *         'status', 'in_arbeit', 'wissen_fehlt', 'nicht_gefunden', 'bibliotheken',
     *         'beantwortet' (inzwischen aus dem Postfach beantwortet) oder 'postfach' (das ließ
     *         sich nicht prüfen – dann kein Aufruf).
     */
    public static function verarbeite(int $nachrichtId): array
    {
        if (!Umgebung::$bibliotheken) {
            return ['ok' => false, 'grund' => 'bibliotheken'];
        }
        $n = self::nachricht($nachrichtId);
        if ($n === null) {
            return ['ok' => false, 'grund' => 'nicht_gefunden'];
        }
        if ($n['status'] !== 'wartet_ki') {
            return ['ok' => false, 'grund' => 'status'];
        }
        // Vor dem Aufruf: Hat inzwischen ein Mensch geantwortet? (Bauplan 7.3)
        $postfach = null;
        try {
            $postfach = self::postfach();
            $beantwortet = self::beantwortetImPostfach($postfach, $n);
        } catch (\Throwable $e) {
            self::protokolliere($e);
            $beantwortet = null;
        } finally {
            // Während des KI-Aufrufs bleibt keine Verbindung zum Postfach offen.
            self::schliesse($postfach);
        }
        if ($beantwortet === true) {
            self::markiereBeantwortet($nachrichtId, 'wartet_ki');
            return ['ok' => false, 'grund' => 'beantwortet'];
        }
        if ($beantwortet === null) {
            return ['ok' => false, 'grund' => 'postfach'];
        }
        $r = self::schritt($nachrichtId, false, null, null);
        return ['ok' => $r['ok'], 'grund' => $r['grund']];
    }

    /**
     * @param array<string, mixed>|null $wissen
     * @param array<int, true>|null $geprueft wartende Nachrichten, deren Antwortstatus gerade gelesen
     *        wurde (für den Cache); null = unbekannt (Aufruf aus dem Admin-Bereich)
     * @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool}
     */
    private static function schritt(int $id, bool $frisch, ?array $wissen, ?array $geprueft = null): array
    {
        $n = self::nachricht($id);
        if ($n === null) {
            return self::erg(false, 'nicht_gefunden');
        }
        if ($n['status'] !== 'wartet_ki') {
            return self::erg(false, 'status');
        }
        $wissen ??= Wissen::laden();
        if ($wissen === null) {
            return self::erg(false, 'wissen_fehlt');
        }
        if (!Speicher::belege($id)) {
            return self::erg(false, 'in_arbeit');
        }
        try {
            // Widerspruch und Sperre gelten auch für Mails, die schon warteten, als die
            // Absenderregel angelegt wurde (Art. 21 DSGVO): kein Aufruf, auch nicht für Sonnet.
            if (self::folgeAbsenderregel($n)) {
                return self::erg(false, 'absenderregel');
            }
            return (string) $n['status_grund'] === 'stark'
                ? self::schrittStark($n, $wissen, $geprueft)
                : self::schrittStandard($n, $wissen, $frisch, $geprueft);
        } finally {
            Speicher::gibFrei($id);
        }
    }

    /**
     * Gilt für den Absender eine Regel, wird die wartende Nachricht ihr entsprechend umgestellt:
     * „immer selbst“ → beim Menschen, „ignorieren“ → ohne KI. true, wenn eine Regel griff.
     *
     * @param array<string, mixed> $n
     */
    private static function folgeAbsenderregel(array $n): bool
    {
        $regel = Regeln::absenderRegel((string) $n['von_adresse']);
        if ($regel === null) {
            return false;
        }
        $id = (int) $n['id'];
        $gewechselt = $regel['art'] === 'ignorieren'
            ? Speicher::wechsle('nachricht', $id, 'wartet_ki', 'ohne_ki', ['status_grund' => '', 'regel_kategorie' => 'absenderregel',
                'regel_grund' => 'Absenderregel „ignorieren“ (' . $regel['muster'] . ')'])
            : Speicher::wechsle('nachricht', $id, 'wartet_ki', 'mensch', ['status_grund' => 'absenderregel']);
        if ($gewechselt) {
            self::loeseEntwuerfeAb($id, 'ueberholt');
            Speicher::ereignis('absenderregel', $id, 'lauf', ['art' => $regel['art']]);
        }
        return true;
    }

    /**
     * Wendet eine eben angelegte Absenderregel auf die Nachrichten an, die noch auf die KI oder
     * einen Menschen warten (Trefferlogik wie Regeln::absenderRegel: Adresse oder @domain). Offene
     * Entwürfe sind danach überholt. Gerade belegte Nachrichten (Versand läuft) bleiben.
     *
     * @return int Zahl der umgestellten Nachrichten
     */
    public static function wendeRegelAn(string $muster, string $art, string $nutzer): int
    {
        $muster = mb_strtolower(trim($muster));
        if ($muster === '' || !in_array($art, ['ignorieren', 'immer_mensch'], true)) {
            return 0;
        }
        $bedingung = str_starts_with($muster, '@') ? "lower(von_adresse) LIKE ? ESCAPE '\\'" : 'lower(von_adresse) = ?';
        $wert = str_starts_with($muster, '@') ? '%' . str_replace(['%', '_'], ['\\%', '\\_'], $muster) : $muster;
        $suche = Speicher::db()->prepare(
            "SELECT id, status FROM nachricht n WHERE {$bedingung}
               AND status IN ('wartet_ki', 'entwurf', 'fehler') AND COALESCE(in_arbeit_bis, 0) <= ?
               AND NOT EXISTS (SELECT 1 FROM entwurf w WHERE w.nachricht_id = n.id AND w.status IN ('sendet', 'unklar'))"
        );
        $suche->execute([$wert, Umgebung::jetzt()]);
        $anzahl = 0;
        foreach ($suche->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
            $id = (int) $zeile['id'];
            $gewechselt = $art === 'ignorieren'
                ? Speicher::wechsle('nachricht', $id, (string) $zeile['status'], 'ohne_ki', ['status_grund' => '',
                    'regel_kategorie' => 'absenderregel', 'regel_grund' => 'Absenderregel „ignorieren“ (' . $muster . ')'])
                : Speicher::wechsle('nachricht', $id, (string) $zeile['status'], 'mensch', ['status_grund' => 'absenderregel']);
            if ($gewechselt) {
                self::loeseEntwuerfeAb($id, 'ueberholt');
                Speicher::ereignis('absenderregel', $id, self::einzeilig($nutzer, 120), ['art' => $art, 'nachtraeglich' => true]);
                $anzahl++;
            }
        }
        return $anzahl;
    }

    /**
     * Erster Schritt mit dem Standardmodell: einordnen und Entwurf schreiben.
     *
     * @param array<string, mixed> $n
     * @param array<string, mixed> $wissen
     * @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool}
     */
    private static function schrittStandard(array $n, array $wissen, bool $frisch, ?array $geprueft = null): array
    {
        $id = (int) $n['id'];
        $jetzt = Umgebung::jetzt();
        $db = Speicher::db();
        $hash = Wissen::hash($wissen);

        // Ein früherer Schritt hat Einordnung und Entwurf schon gespeichert, kam aber nicht mehr
        // zum Statuswechsel: abschließen statt noch einmal zu bezahlen.
        if (!$frisch) {
            $alt = self::einordnung($id);
            $offen = self::offenerEntwurf($id);
            if ($alt !== null && $offen !== null
                && $alt['prompt_version'] === Prompt::VERSION && $alt['wissen_hash'] === $hash) {
                return self::schliesseAb($id, $alt, (string) $offen['text_vorlage'], false);
            }
        }

        $erlaubnis = Budget::darfAufrufen(self::absenderSchluessel($n));
        if (empty($erlaubnis['ok'])) {
            $grund = (string) ($erlaubnis['grund'] ?? '') ?: 'pausiert';
            self::setzeWarteGrund($id, $grund);
            return self::erg(false, $grund);
        }
        if ((int) $n['versuche'] >= self::MAX_VERSUCHE) {
            self::gibAuf($id, 'versuche');
            return self::erg(false, 'fehler');
        }

        $bisher = self::bisher($n);

        // Gleicher Text wird nicht zweimal bezahlt – aber nur ohne Verlauf, sonst passt die Antwort
        // der einen Unterhaltung nicht zur anderen.
        if (!$frisch && $bisher === '') {
            $quelle = self::duplikat($n, $hash, $jetzt);
            if ($quelle !== null) {
                $einordnung = $quelle['einordnung'];
                self::speichereEinordnung($id, $einordnung, (string) $einordnung['modell'], $hash, true);
                self::speichereEntwurf($id, $quelle['vorlage'], $einordnung, $quelle['modell'], $wissen, [], $quelle['sprache']);
                Speicher::wechsle('nachricht', $id, 'wartet_ki', 'entwurf', ['status_grund' => '', 'versuche' => 0]);
                Speicher::ereignis('duplikat', $id, 'lauf', ['quelle' => $quelle['nachricht_id']]);
                return self::erg(true, 'duplikat', false, true);
            }
        }

        $system = Prompt::system($wissen);
        $nutzer = Prompt::nutzer($n, $bisher);
        $cache = self::cacheLohnt($id, Claude::MODELL_STANDARD, false, $jetzt, $geprueft);

        // Der Versuch zählt, bevor der Aufruf läuft. Bricht der Webserver den Lauf währenddessen
        // ab, bleibt er gezählt – so sind es nie mehr als MAX_VERSUCHE Aufrufe je Nachricht.
        $zaehle = $db->prepare("UPDATE nachricht SET versuche = versuche + 1, status_grund = '', aktualisiert_am = ?
                                WHERE id = ? AND status = 'wartet_ki'");
        $zaehle->execute([$jetzt, $id]);
        if ($zaehle->rowCount() < 1) {
            return self::erg(false, 'status');
        }

        // Vorab gebucht: Beendet der Hoster den Prozess während des Aufrufs, steht der Höchstpreis
        // trotzdem in den Limits. Die Antwort ersetzt diese Zeile (keine zweite Buchung).
        $zeichen = mb_strlen($system) + mb_strlen($nutzer);
        $vorab = self::bucheVorab(Claude::MODELL_STANDARD, 'entwurf', $id, $zeichen, $cache);
        $antwort = Claude::rufe(Claude::MODELL_STANDARD, $system, $nutzer, Prompt::schema(), $cache);
        self::buche($antwort, Claude::MODELL_STANDARD, 'entwurf', $id, $zeichen, $cache, $vorab);

        if (empty($antwort['ok']) || !is_array($antwort['daten'] ?? null)) {
            return self::nachFehler($n, $antwort, $wissen, $hash);
        }

        $daten = self::ordneDaten($antwort['daten'], $wissen);
        self::speichereEinordnung($id, $daten, Claude::MODELL_STANDARD, $hash, false);
        self::speichereEntwurf($id, $daten['antwort'], $daten, Claude::MODELL_STANDARD, $wissen, [], $daten['sprache']);
        return self::schliesseAb($id, $daten, $daten['antwort'], true);
    }

    /** Schlüssel für die Grenze je Absender: die Absenderadresse, ohne sie die Antwortadresse. */
    private static function absenderSchluessel(array $n): string
    {
        $von = mb_strtolower(trim((string) ($n['von_adresse'] ?? '')));
        return $von !== '' ? $von : mb_strtolower(trim((string) ($n['antwort_an'] ?? '')));
    }

    /**
     * Statuswechsel nach gespeicherter Einordnung und gespeichertem Entwurf: entweder liegt der
     * Entwurf jetzt vor, oder die Nachricht wartet noch auf das stärkere Modell (Bauplan 7.9).
     *
     * Das stärkere Modell schreibt nur, wenn es etwas zu verbessern gibt: Muss ohnehin ein
     * Mensch übernehmen (Pruefer::mussMensch: Übergabe, Beschwerde, verärgerter Ton …) oder gibt es
     * keinen Antworttext, ersetzte es nur eine Zwischennachricht – zum 20-fachen Preis.
     *
     * @param array<string, mixed> $einordnung Felder des Modells oder Zeile der Tabelle einordnung
     * @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool}
     */
    private static function schliesseAb(int $id, array $einordnung, string $antwortText, bool $aufruf): array
    {
        if (self::lohntEskalation($einordnung, $antwortText)) {
            Speicher::db()
                ->prepare("UPDATE nachricht SET status_grund = 'stark', versuche = 0, aktualisiert_am = ?
                           WHERE id = ? AND status = 'wartet_ki'")
                ->execute([Umgebung::jetzt(), $id]);
            return self::erg(true, 'stark', $aufruf, false);
        }
        $gewechselt = Speicher::wechsle('nachricht', $id, 'wartet_ki', 'entwurf', ['status_grund' => '', 'versuche' => 0]);
        return self::erg(true, 'entwurf', $aufruf, $gewechselt);
    }

    /** @param array<string, mixed> $einordnung */
    private static function lohntEskalation(array $einordnung, string $antwortText): bool
    {
        $komplex = $einordnung['komplex'] ?? false;
        $komplex = is_string($komplex) ? in_array(strtolower($komplex), ['1', 'true'], true) : (bool) $komplex;
        return $komplex
            && trim($antwortText) !== ''
            && !Pruefer::mussMensch($einordnung)
            && Speicher::einstellung('eskalation_sonnet') === '1';
    }

    /**
     * Zweiter Schritt für komplexe Fälle: Das stärkere Modell schreibt die Antwort neu. Die
     * Einordnung des ersten Schritts bleibt. Scheitert oder verweigert das stärkere Modell,
     * bleibt der erste Entwurf – es gibt genau einen Versuch.
     *
     * @param array<string, mixed> $n
     * @param array<string, mixed> $wissen
     * @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool}
     */
    private static function schrittStark(array $n, array $wissen, ?array $geprueft = null): array
    {
        $id = (int) $n['id'];
        $jetzt = Umgebung::jetzt();
        $db = Speicher::db();
        $einordnung = self::einordnung($id);
        $ersterEntwurf = self::offenerEntwurf($id);

        $freigeben = static function (string $grund, bool $aufruf) use ($id): array {
            $gewechselt = Speicher::wechsle('nachricht', $id, 'wartet_ki', 'entwurf', ['status_grund' => '', 'versuche' => 0]);
            return self::erg(true, $grund, $aufruf, $gewechselt);
        };

        if ($einordnung === null || $ersterEntwurf === null) {
            // Der erste Entwurf fehlt (etwa nach „Neu erzeugen“): zurück in die normale Bearbeitung.
            $db->prepare("UPDATE nachricht SET status_grund = '', versuche = 0, aktualisiert_am = ?
                          WHERE id = ? AND status = 'wartet_ki'")->execute([$jetzt, $id]);
            return self::erg(false, 'status');
        }
        if ((int) $n['versuche'] >= 1 || !self::lohntEskalation($einordnung, (string) $ersterEntwurf['text_vorlage'])) {
            return $freigeben('entwurf', false);
        }
        $erlaubnis = Budget::darfAufrufen(self::absenderSchluessel($n));
        if (empty($erlaubnis['ok'])) {
            // Pause oder Limit: den vorhandenen Entwurf nicht zurückhalten.
            return $freigeben('entwurf', false);
        }

        $bisher = self::bisher($n);
        $system = Prompt::system($wissen);
        $nutzer = Prompt::nutzer($n, $bisher);
        $cache = self::cacheLohnt($id, Claude::MODELL_STARK, true, $jetzt, $geprueft);

        $zaehle = $db->prepare("UPDATE nachricht SET versuche = versuche + 1, aktualisiert_am = ?
                                WHERE id = ? AND status = 'wartet_ki' AND status_grund = 'stark'");
        $zaehle->execute([$jetzt, $id]);
        if ($zaehle->rowCount() < 1) {
            return self::erg(false, 'status');
        }

        $zeichen = mb_strlen($system) + mb_strlen($nutzer);
        $vorab = self::bucheVorab(Claude::MODELL_STARK, 'eskalation', $id, $zeichen, $cache);
        $antwort = Claude::rufe(Claude::MODELL_STARK, $system, $nutzer, Prompt::schema(), $cache);
        self::buche($antwort, Claude::MODELL_STARK, 'eskalation', $id, $zeichen, $cache, $vorab);

        $text = is_array($antwort['daten'] ?? null) ? self::antwortText($antwort['daten']['antwort'] ?? '') : '';
        if (!empty($antwort['ok']) && $text !== '') {
            // Nur das Feld „antwort“ wird ersetzt; geprüft wird gegen die Einordnung des ersten
            // Schritts, die Sprache bleibt die des ersten Entwurfs.
            self::speichereEntwurf($id, $text, $einordnung, Claude::MODELL_STARK, $wissen, [],
                self::sprache((string) ($ersterEntwurf['sprache'] ?? 'de')));
        } else {
            self::reagiereAufAnbieterfehler((string) ($antwort['fehler_art'] ?? ''));
            Speicher::ereignis('eskalation_gescheitert', $id, 'lauf', ['art' => (string) ($antwort['fehler_art'] ?? '')]);
        }
        return $freigeben('entwurf', true);
    }

    /**
     * Reaktion auf einen gescheiterten Aufruf des Standardmodells.
     *
     * @param array<string, mixed> $n
     * @param array<string, mixed> $antwort
     * @param array<string, mixed> $wissen
     * @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool}
     */
    private static function nachFehler(array $n, array $antwort, array $wissen, string $hash): array
    {
        $id = (int) $n['id'];
        $art = (string) ($antwort['fehler_art'] ?? '') ?: 'kein_json';
        $db = Speicher::db();

        if ($art === 'limit_anbieter' || $art === 'schluessel') {
            // Liegt nicht an dieser Nachricht: Versuch nicht anrechnen, alle Aufrufe sperren.
            $db->prepare("UPDATE nachricht SET versuche = MAX(0, versuche - 1), status_grund = 'sperre', aktualisiert_am = ?
                          WHERE id = ? AND status = 'wartet_ki'")->execute([Umgebung::jetzt(), $id]);
            self::reagiereAufAnbieterfehler($art);
            return self::erg(false, $art, true, false);
        }

        if ($art === 'abgelehnt') {
            // Für das Standardmodell gibt es bei einer Verweigerung kein Ausweichmodell und eine
            // Wiederholung brächte dasselbe: leerer Entwurf, ein Mensch antwortet.
            $einordnung = self::leereEinordnung('Die KI hat diese Nachricht nicht bearbeitet.');
            self::speichereEinordnung($id, $einordnung, Claude::MODELL_STANDARD, $hash, false);
            self::speichereEntwurf($id, '', $einordnung, Claude::MODELL_STANDARD, $wissen, [
                'Die KI hat diese Nachricht nicht bearbeitet. Bitte selbst beantworten.',
            ]);
            $gewechselt = Speicher::wechsle('nachricht', $id, 'wartet_ki', 'entwurf', ['status_grund' => '', 'versuche' => 0]);
            Speicher::ereignis('ki_verweigert', $id, 'lauf', []);
            return self::erg(true, 'abgelehnt', true, $gewechselt);
        }

        // voruebergehend, abgeschnitten, kein_json, anfrage: später noch einmal, höchstens dreimal.
        if ((int) $n['versuche'] + 1 >= self::MAX_VERSUCHE) {
            self::gibAuf($id, $art);
        }
        return self::erg(false, $art, true, false);
    }

    /** Sperrt weitere Aufrufe nach einem Fehler, der am Konto beim Anbieter liegt, und meldet ihn. */
    private static function reagiereAufAnbieterfehler(string $art): void
    {
        $jetzt = Umgebung::jetzt();
        if ($art === 'limit_anbieter') {
            $monatserster = (new \DateTimeImmutable('@' . $jetzt))
                ->setTimezone(new \DateTimeZone('Europe/Berlin'))
                ->modify('first day of next month')
                ->setTime(0, 0)
                ->getTimestamp();
            Budget::sperre('Ausgabenlimit bei Anthropic erreicht', $monatserster);
            self::stoerung('limit_anbieter');
        } elseif ($art === 'schluessel') {
            Budget::sperre('API-Schlüssel von Anthropic abgelehnt', $jetzt + 6 * 3600);
            self::stoerung('schluessel');
        }
    }

    private static function gibAuf(int $id, string $art): void
    {
        if (Speicher::wechsle('nachricht', $id, 'wartet_ki', 'fehler', ['status_grund' => $art])) {
            Speicher::ereignis('ki_fehler', $id, 'lauf', ['art' => $art]);
        }
    }

    private static function setzeWarteGrund(int $id, string $grund): void
    {
        Speicher::db()
            ->prepare("UPDATE nachricht SET status_grund = :g, aktualisiert_am = :j
                       WHERE id = :id AND status = 'wartet_ki' AND status_grund != :bisher")
            ->execute([':g' => $grund, ':bisher' => $grund, ':j' => Umgebung::jetzt(), ':id' => $id]);
    }

    /**
     * Bucht vor dem Aufruf den Höchstpreis (geschaetzt = 1). buche() ersetzt die Zeile danach
     * durch die echten Zahlen. Bricht der Prozess mitten im Aufruf ab, bleibt die Schätzung –
     * die Limits sehen den Aufruf also in jedem Fall. 0, wenn die Buchung scheitert.
     */
    private static function bucheVorab(string $modell, string $zweck, int $nachrichtId, int $zeichenEingabe, bool $cache): int
    {
        try {
            return Budget::buche([
                'zeit' => Umgebung::jetzt(), 'kanal' => 'email', 'zweck' => $zweck, 'modell' => $modell, 'nachricht_id' => $nachrichtId,
                'kosten_mikro_usd' => Budget::schaetzeHoechstpreis($modell, $zeichenEingabe, Claude::MAX_TOKENS, self::cacheArt($modell, $cache)),
                'geschaetzt' => 1, 'http_status' => 0, 'fehler' => 'Aufruf läuft – Höchstpreis vorab gebucht',
            ]);
        } catch (\Throwable $e) {
            self::protokolliere($e);
            return 0;
        }
    }

    /** Haltbarkeit des Cache-Eintrags: eine Stunde für Haiku, fünf Minuten für Sonnet, '' ohne Cache. */
    private static function cacheArt(string $modell, bool $cache): string
    {
        return !$cache ? '' : ($modell === Claude::MODELL_STANDARD ? '1h' : '5m');
    }

    /**
     * Bucht einen Aufruf. Kam keine Antwort (Zeitüberschreitung, Netzabbruch), wird der
     * Höchstpreis geschätzt – Anthropic rechnet solche Aufrufe unter Umständen trotzdem ab. Kam
     * nachweislich nichts bei Anthropic an (Verbindung abgelehnt, DNS), wird nichts geschätzt.
     * $vorab: Zeile aus bucheVorab(), die durch die erste Buchung ersetzt wird.
     *
     * @param array<string, mixed> $antwort Ergebnis von Claude::rufe
     */
    private static function buche(array $antwort, string $modell, string $zweck, int $nachrichtId, int $zeichenEingabe, bool $cache = false, int $vorab = 0): void
    {
        $jetzt = Umgebung::jetzt();
        $http = (int) ($antwort['http'] ?? 0);
        $art = (string) ($antwort['fehler_art'] ?? '');
        $usage = array_merge(Claude::leereUsage(), array_map('intval', (array) ($antwort['usage'] ?? [])));
        $basis = [
            'zeit' => $jetzt,
            'kanal' => 'email',
            'zweck' => $zweck,
            'modell' => $modell,
            'nachricht_id' => $nachrichtId,
        ];
        $ersetze = $vorab;
        $buche = static function (array $zeile) use (&$ersetze): void {
            if ($ersetze > 0) {
                Budget::ersetze($ersetze, $zeile);
                $ersetze = 0;
                return;
            }
            Budget::buche($zeile);
        };

        $ohneAntwort = max(0, (int) ($antwort['verlorene_versuche'] ?? 0));
        // Weiß die Leitung nicht, ob etwas abgeschickt wurde (Ersatz in Tests), gilt ein
        // vorübergehender Fehler ohne HTTP-Status als ein Versuch ohne Antwort.
        $abgeschickt = $antwort['abgeschickt'] ?? null;
        if ($http === 0 && $art === 'voruebergehend' && $abgeschickt === null) {
            $ohneAntwort = max(1, $ohneAntwort);
        }
        if ($http > 0 || $ohneAntwort === 0) {
            // Eine Antwort ist angekommen (oder es wurde gar nichts abgeschickt): echte Zahlen.
            $buche($basis + [
                'request_id' => (string) ($antwort['request_id'] ?? ''),
                'input_tokens' => $usage['input_tokens'],
                'cache_schreiben_5m' => $usage['cache_schreiben_5m'],
                'cache_schreiben_1h' => $usage['cache_schreiben_1h'],
                'cache_lesen' => $usage['cache_lesen'],
                'output_tokens' => $usage['output_tokens'],
                'denk_tokens' => $usage['denk_tokens'],
                'kosten_mikro_usd' => Budget::kostenMikroUsd($modell, $usage),
                'geschaetzt' => 0,
                'stop_reason' => (string) ($antwort['stop'] ?? ''),
                'http_status' => $http,
                'dauer_ms' => (int) ($antwort['dauer_ms'] ?? 0),
                'fehler' => self::einzeilig((string) ($antwort['fehler'] ?? ''), 200),
            ]);
        }
        for ($i = 0; $i < $ohneAntwort; $i++) {
            $buche($basis + [
                'kosten_mikro_usd' => Budget::schaetzeHoechstpreis($modell, $zeichenEingabe, Claude::MAX_TOKENS, self::cacheArt($modell, $cache)),
                'geschaetzt' => 1,
                'http_status' => 0,
                'dauer_ms' => (int) ($antwort['dauer_ms'] ?? 0),
                'fehler' => 'Keine Antwort erhalten – Höchstpreis geschätzt',
            ]);
        }
    }

    /**
     * Lohnt der Prompt-Cache? Der Zeitauftrag macht höchstens einen Aufruf je Lauf, und Läufe
     * kommen alle fünf Minuten oder später – ein 5-Minuten-Eintrag ist dann meist schon weg.
     * Haiku schreibt deshalb mit einer Stunde Haltbarkeit (Claude::rufe) und schaltet den Cache
     * ein, wenn eine weitere BEARBEITBARE Mail wartet (nicht an der Grenze ihres Absenders; aus
     * dem Lauf: auch geprüft – Gründe für alle wie Pause gelten nicht mehr, wenn gerade ein Aufruf
     * startet) oder der letzte Haiku-Aufruf vor weniger als einer Stunde begann.
     * Sonnet (selten, 1-Stunden-Schreiben doppelt so teuer) nur, wenn eine weitere bearbeitbare
     * Mail auf Sonnet wartet. Simulation des Kostenprüfers: 40 Mails je Werktag 2,21 → 0,81 USD.
     *
     * @param array<int, true>|null $geprueft null = unbekannt (dann zählt jede wartende Mail)
     */
    private static function cacheLohnt(int $id, string $modell, bool $stark, int $jetzt, ?array $geprueft = null): bool
    {
        $db = Speicher::db();
        $weitere = $db->prepare(
            "SELECT id FROM nachricht WHERE status = 'wartet_ki' AND id != ? AND in_arbeit_bis <= ? AND "
            . ($stark ? "status_grund = 'stark'" : "status_grund NOT IN ('stark', 'limit_absender')") . ' LIMIT 100'
        );
        $weitere->execute([$id, $jetzt]);
        foreach ($weitere->fetchAll(\PDO::FETCH_COLUMN) as $andere) {
            if ($geprueft === null || isset($geprueft[(int) $andere])) {
                return true;
            }
        }
        if ($stark) {
            return false;
        }
        // Beginn des letzten Haiku-Aufrufs = Buchungszeit minus Dauer.
        $kuerzlich = $db->prepare('SELECT 1 FROM verbrauch WHERE modell = ? AND http_status = 200
                                   AND zeit - (dauer_ms / 1000) >= ? AND zeit <= ? LIMIT 1');
        $kuerzlich->execute([$modell, $jetzt - 3600, $jetzt]);
        return $kuerzlich->fetchColumn() !== false;
    }

    /**
     * Verlauf für den Aufruf – ausschließlich aus der eigenen Datenbank. Zitate in der Mail
     * zählen nicht, eine gefälschte „frühere Zusage“ kommt so nicht als Verlauf an.
     *
     * @param array<string, mixed> $n
     */
    private static function bisher(array $n): string
    {
        $db = Speicher::db();
        $id = (int) $n['id'];
        $thread = (string) $n['thread_schluessel'];
        $teile = [];

        if ($thread !== '') {
            $frueher = $db->prepare(
                "SELECT e.zusammenfassung FROM nachricht m JOIN einordnung e ON e.nachricht_id = m.id
                 WHERE m.thread_schluessel = ? AND m.id < ? AND e.zusammenfassung != ''
                 ORDER BY m.id DESC LIMIT 3"
            );
            $frueher->execute([$thread, $id]);
            $zeilen = array_reverse($frueher->fetchAll(\PDO::FETCH_COLUMN));
            if ($zeilen !== []) {
                $teile[] = "Frühere Nachrichten in diesem Vorgang (Zusammenfassungen):\n"
                    . implode("\n", array_map(static fn (mixed $z): string => '- ' . self::einzeilig((string) $z, 300), $zeilen));
            }

            $gesendet = $db->prepare(
                "SELECT e.gesendet_text FROM entwurf e JOIN nachricht m ON m.id = e.nachricht_id
                 WHERE m.thread_schluessel = ? AND e.status = 'gesendet' AND e.gesendet_text != ''
                 ORDER BY e.freigegeben_am DESC, e.id DESC LIMIT 1"
            );
            $gesendet->execute([$thread]);
            $letzte = $gesendet->fetchColumn();
            if (is_string($letzte) && trim($letzte) !== '') {
                $teile[] = "Unsere letzte gesendete Antwort in diesem Vorgang:\n" . self::kuerze(trim($letzte), self::KUERZE_LETZTE_ANTWORT);
            }
        }

        // Mails, die in diese zusammengefasst wurden (gleicher Absender UND gleicher Empfänger
        // der Antwort, siehe fasseFruehereZusammen) – die Antwort soll sie mit abdecken.
        foreach (array_reverse(self::zusammengefasste($id, 2)) as $frueher) {
            $teile[] = "Vorherige, noch unbeantwortete Nachricht desselben Kunden:\n" . self::kuerze(trim($frueher['text']), self::KUERZE_FOLGE_MAIL);
        }
        return self::kuerze(implode("\n\n", $teile), self::KUERZE_VERLAUF);
    }

    /**
     * Die in $id zusammengefassten Mails, neueste zuerst – für den Verlauf des Aufrufs und für
     * die Einzelansicht (der Mensch soll sehen, was der Entwurf mit abdeckt).
     *
     * @return list<array{id: int, eingang_am: int, betreff: string, text: string}>
     */
    public static function zusammengefasste(int $id, int $hoechstens = 5): array
    {
        $suche = Speicher::db()->prepare(
            "SELECT id, eingang_am, betreff, text_bereinigt FROM nachricht
             WHERE zusammengefasst_in = ? AND status = 'zusammengefasst' AND text_bereinigt != ''
             ORDER BY id DESC LIMIT " . max(1, min(20, $hoechstens))
        );
        $suche->execute([$id]);
        $liste = [];
        foreach ($suche->fetchAll(\PDO::FETCH_ASSOC) as $z) {
            $liste[] = ['id' => (int) $z['id'], 'eingang_am' => (int) $z['eingang_am'], 'betreff' => (string) $z['betreff'], 'text' => (string) $z['text_bereinigt']];
        }
        return $liste;
    }

    /**
     * Sucht eine frühere Nachricht mit gleichem Text, deren Ergebnis übernommen werden kann:
     * Einordnung jünger als 30 Tage, gleiche Prompt-Version, gleicher Wissensstand, selbst ohne
     * Verlauf entstanden und mit einer Vorlage, die noch gespeichert ist.
     *
     * @param array<string, mixed> $n
     * @return array{nachricht_id: int, einordnung: array<string, mixed>, vorlage: string, modell: string, sprache: string}|null
     */
    private static function duplikat(array $n, string $hash, int $jetzt): ?array
    {
        $textHash = (string) $n['text_hash'];
        if ($textHash === '') {
            return null;
        }
        $db = Speicher::db();
        $suche = $db->prepare(
            "SELECT e.* FROM einordnung e JOIN nachricht m ON m.id = e.nachricht_id
             WHERE m.text_hash = ? AND m.id != ? AND m.status != 'wartet_ki' AND e.erstellt_am >= ?
               AND e.prompt_version = ? AND e.wissen_hash = ?
             ORDER BY e.id DESC LIMIT 5"
        );
        $suche->execute([$textHash, (int) $n['id'], $jetzt - self::DUPLIKAT_TAGE * 86400, Prompt::VERSION, $hash]);
        foreach ($suche->fetchAll(\PDO::FETCH_ASSOC) as $einordnung) {
            $quelleId = (int) $einordnung['nachricht_id'];
            $entwurf = $db->prepare('SELECT text_vorlage, modell, sprache FROM entwurf WHERE nachricht_id = ? ORDER BY version DESC, id DESC LIMIT 1');
            $entwurf->execute([$quelleId]);
            $zeile = $entwurf->fetch(\PDO::FETCH_ASSOC);
            if (!is_array($zeile) || trim((string) $zeile['text_vorlage']) === '') {
                continue;
            }
            $quelle = self::nachricht($quelleId);
            if ($quelle === null || self::bisher($quelle) !== '') {
                continue;
            }
            return [
                'nachricht_id' => $quelleId,
                'einordnung' => $einordnung,
                'vorlage' => (string) $zeile['text_vorlage'],
                'modell' => (string) $zeile['modell'],
                'sprache' => self::sprache((string) ($zeile['sprache'] ?? 'de')),
            ];
        }
        return null;
    }

    /**
     * Bringt die Felder des Modells in die gespeicherte Form: erlaubte Werte, begrenzte Längen,
     * Slug der Leistung so, wie er in der Wissensbasis steht.
     *
     * @param array<string, mixed> $daten
     * @param array<string, mixed> $wissen
     * @return array{anliegen: string, leistung: string, interessent: bool, dringlich: bool, stimmung: string,
     *               uebergabe: bool, uebergabe_grund: string, komplex: bool, manipulation: bool,
     *               zusammenfassung: string, fehlende_angabe: string, sprache: string, antwort: string}
     */
    private static function ordneDaten(array $daten, array $wissen): array
    {
        $anliegen = mb_strtolower(trim((string) ($daten['anliegen'] ?? '')));
        $stimmung = mb_strtolower(trim((string) ($daten['stimmung'] ?? '')));

        $leistung = Prompt::KEINE_LEISTUNG;
        $gesucht = str_replace('_', '-', mb_strtolower(trim((string) ($daten['leistung'] ?? ''))));
        foreach ((array) ($wissen['leistungen'] ?? []) as $eintrag) {
            $slug = is_array($eintrag) ? (string) ($eintrag['slug'] ?? '') : '';
            if ($slug !== '' && str_replace('_', '-', mb_strtolower($slug)) === $gesucht) {
                $leistung = $slug;
                break;
            }
        }

        $uebergabe = !empty($daten['uebergabe']);
        return [
            'anliegen' => in_array($anliegen, Prompt::ANLIEGEN, true) ? $anliegen : 'allgemein',
            'leistung' => $leistung,
            'interessent' => !empty($daten['interessent']),
            'dringlich' => !empty($daten['dringlich']),
            'stimmung' => in_array($stimmung, Prompt::STIMMUNG, true) ? $stimmung : 'neutral',
            'uebergabe' => $uebergabe,
            'uebergabe_grund' => $uebergabe ? self::einzeilig((string) ($daten['uebergabe_grund'] ?? ''), 300) : '',
            'komplex' => !empty($daten['komplex']),
            'manipulation' => !empty($daten['manipulation_verdacht'] ?? $daten['manipulation'] ?? false),
            'zusammenfassung' => self::einzeilig((string) ($daten['zusammenfassung'] ?? ''), 300),
            'fehlende_angabe' => self::einzeilig((string) ($daten['fehlende_angabe'] ?? ''), 200),
            'sprache' => self::sprache((string) ($daten['sprache'] ?? 'de')),
            'antwort' => self::antwortText($daten['antwort'] ?? ''),
        ];
    }

    /** Sprache am Entwurf: 'de', 'en' oder 'andere' (Anrede und Gruß auf Deutsch); Unbekanntes gilt als 'de'. */
    private static function sprache(string $wert): string
    {
        $wert = mb_strtolower(trim($wert));
        return in_array($wert, Prompt::SPRACHEN, true) ? $wert : 'de';
    }

    /** @return array<string, mixed> */
    private static function leereEinordnung(string $grund): array
    {
        return [
            'anliegen' => 'allgemein', 'leistung' => Prompt::KEINE_LEISTUNG, 'interessent' => false, 'dringlich' => false,
            'stimmung' => 'neutral', 'uebergabe' => true, 'uebergabe_grund' => $grund, 'komplex' => false,
            'manipulation' => false, 'zusammenfassung' => '', 'fehlende_angabe' => '', 'sprache' => 'de', 'antwort' => '',
        ];
    }

    private static function antwortText(mixed $wert): string
    {
        $text = is_string($wert) ? str_replace(["\r\n", "\r"], "\n", $wert) : '';
        return trim(mb_substr($text, 0, self::KUERZE_ANTWORT));
    }

    /** @param array<string, mixed> $e Felder wie in der Tabelle einordnung */
    private static function speichereEinordnung(int $nachrichtId, array $e, string $modell, string $wissenHash, bool $ausDuplikat): void
    {
        Speicher::db()->prepare(
            'INSERT OR REPLACE INTO einordnung (nachricht_id, anliegen, leistung, interessent, dringlich, stimmung, uebergabe,
                uebergabe_grund, komplex, manipulation, zusammenfassung, fehlende_angabe, modell, prompt_version, wissen_hash,
                aus_duplikat, erstellt_am)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([
            $nachrichtId,
            (string) ($e['anliegen'] ?? 'allgemein'),
            (string) ($e['leistung'] ?? Prompt::KEINE_LEISTUNG),
            empty($e['interessent']) ? 0 : 1,
            empty($e['dringlich']) ? 0 : 1,
            (string) ($e['stimmung'] ?? 'neutral'),
            empty($e['uebergabe']) ? 0 : 1,
            (string) ($e['uebergabe_grund'] ?? ''),
            empty($e['komplex']) ? 0 : 1,
            empty($e['manipulation']) ? 0 : 1,
            (string) ($e['zusammenfassung'] ?? ''),
            (string) ($e['fehlende_angabe'] ?? ''),
            $modell,
            Prompt::VERSION,
            $wissenHash,
            $ausDuplikat ? 1 : 0,
            Umgebung::jetzt(),
        ]);
    }

    /**
     * Füllt und prüft eine Vorlage und legt sie als neuen offenen Entwurf an; ein vorhandener
     * offener Entwurf wird „ueberholt“. Am Entwurf steht der Vergleichsstand der Wissensbasis
     * (Wissen::vergleichsStand: Hash samt abgelaufener Aktion und veralteter Wissensbasis) –
     * genau das, womit sende() vergleicht.
     *
     * @param array<string, mixed> $einordnung
     * @param array<string, mixed> $wissen
     * @param string[] $zusatzHinweise
     */
    private static function speichereEntwurf(
        int $nachrichtId,
        string $vorlage,
        array $einordnung,
        string $modell,
        array $wissen,
        array $zusatzHinweise,
        string $sprache = 'de',
    ): int {
        $pruefung = Pruefer::pruefeEntwurf($vorlage, $einordnung, $wissen);
        $hinweise = array_values(array_unique(array_merge($zusatzHinweise, $pruefung['hinweise'])));

        $db = Speicher::db();
        $version = $db->prepare('SELECT COALESCE(MAX(version), 0) + 1 FROM entwurf WHERE nachricht_id = ?');
        $version->execute([$nachrichtId]);
        self::loeseEntwuerfeAb($nachrichtId, 'ueberholt');
        $db->prepare(
            "INSERT INTO entwurf (nachricht_id, version, text_vorlage, text_final, pruef_status, pruef_hinweise, modell, status,
                gesendet_text, geaendert, freigegeben_von, freigegeben_am, gesendet_message_id, erstellt_am, wissen_hash, sprache)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'offen', '', 0, '', 0, '', ?, ?, ?)"
        )->execute([
            $nachrichtId,
            (int) $version->fetchColumn(),
            $vorlage,
            $pruefung['text'],
            $pruefung['status'],
            (string) json_encode($hinweise, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $modell,
            Umgebung::jetzt(),
            Wissen::vergleichsStand($wissen),
            self::sprache($sprache),
        ]);
        return (int) $db->lastInsertId();
    }

    /** Setzt alle offenen Entwürfe einer Nachricht auf $nach ('ueberholt' oder 'verworfen'). */
    private static function loeseEntwuerfeAb(int $nachrichtId, string $nach): void
    {
        Speicher::db()
            ->prepare("UPDATE entwurf SET status = ? WHERE nachricht_id = ? AND status = 'offen'")
            ->execute([$nach, $nachrichtId]);
    }

    // =======================================================================================
    // Aktionen aus dem Admin-Bereich
    // =======================================================================================

    /**
     * Sendet einen Entwurf – ausgelöst von einem Menschen, mit dem Text, den er gelesen hat.
     *
     * Reihenfolge: erst belegen und im Postfach nachsehen, ob schon jemand geantwortet hat (Bauplan
     * 7.3), dann prüfen. Lässt sich das Postfach nicht befragen (nicht erreichbar, Mail verschoben,
     * Postfach neu aufgebaut), ist das ein Hinweis wie jeder andere: Gesendet wird erst nach
     * ausdrücklicher Bestätigung – ein einziges „Trotzdem senden“ deckt alle Hinweise ab. Ebenso,
     * wenn die Antwort an eine andere Adresse ginge als an den Absender (Reply-To).
     *
     * @return array{ok: bool, meldung: string, warnungen: string[]}
     */
    public static function sende(int $entwurfId, string $text, string $nutzer, bool $trotzWarnung): array
    {
        $aus = static fn (bool $ok, string $meldung, array $warnungen = []): array
            => ['ok' => $ok, 'meldung' => $meldung, 'warnungen' => array_values(array_map('strval', $warnungen))];

        $nutzer = self::einzeilig($nutzer, 120);
        if ($nutzer === '') {
            return $aus(false, 'Ohne den Namen der bearbeitenden Person wird nicht gesendet.');
        }
        if (!Umgebung::$bibliotheken) {
            return $aus(false, 'Die Bibliotheken fehlen auf dem Server – so kann nicht gesendet werden.');
        }
        $db = Speicher::db();
        $suche = $db->prepare('SELECT * FROM entwurf WHERE id = ?');
        $suche->execute([$entwurfId]);
        $entwurf = $suche->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($entwurf)) {
            return $aus(false, 'Entwurf nicht gefunden.');
        }
        if ($entwurf['status'] !== 'offen') {
            return $aus(false, match ((string) $entwurf['status']) {
                'gesendet' => 'Dieser Entwurf wurde bereits gesendet.',
                'sendet' => 'Dieser Entwurf wird gerade gesendet.',
                'unklar' => 'Der Versand dieses Entwurfs ist unklar. Bitte im Gesendet-Ordner nachsehen – er wird nicht erneut gesendet.',
                default => 'Dieser Entwurf ist nicht mehr aktuell.',
            });
        }
        $nachrichtId = (int) $entwurf['nachricht_id'];
        $n = self::nachricht($nachrichtId);
        if ($n === null || $n['status'] !== 'entwurf') {
            return $aus(false, 'Diese Nachricht ist nicht mehr offen.');
        }

        $text = self::textForm($text);
        if ($text === '') {
            return $aus(false, 'Der Text ist leer.');
        }
        if (Pruefer::hatPlatzhalterReste($text)) {
            $namen = array_map(static fn (string $p): string => '{{' . $p . '}}', Pruefer::platzhalterIn($text));
            return $aus(false, 'Im Text stehen noch Platzhalter' . ($namen !== [] ? ' (' . implode(', ', $namen) . ')' : '')
                . '. Bitte ersetzen oder entfernen – so wird nicht gesendet.');
        }
        $wissen = Wissen::laden();
        if ($wissen === null) {
            return $aus(false, 'Die Wissensbasis fehlt. Ohne sie wird nicht gesendet.');
        }
        $einordnung = self::einordnung($nachrichtId) ?? [];
        $vorlage = (string) $entwurf['text_vorlage'];
        $geaendert = $text !== self::textForm((string) $entwurf['text_final']);
        $zusatz = [];

        if (!Speicher::belege($nachrichtId)) {
            return $aus(false, 'Diese Nachricht wird gerade bearbeitet. Bitte gleich noch einmal versuchen.');
        }
        $postfach = null;
        try {
            // Hat inzwischen jemand aus dem Mailprogramm geantwortet? null = nicht prüfbar.
            $beantwortet = null;
            try {
                $postfach = self::postfach();
                $beantwortet = self::beantwortetImPostfach($postfach, $n);
            } catch (\Throwable $e) {
                self::protokolliere($e);
                self::schliesse($postfach);
                $postfach = null;
            }
            if ($beantwortet === true) {
                self::markiereBeantwortet($nachrichtId, 'entwurf');
                return $aus(false, 'Auf diese Mail wurde inzwischen aus dem Postfach geantwortet. Der Entwurf wird nicht gesendet.');
            }
            if ($beantwortet === null) {
                $zusatz[] = self::HINWEIS_NICHT_GEPRUEFT;
            }
            $uidGilt = $beantwortet !== null;

            // Hat sich der Wissensstand seit dem Entwurf geändert – auch durch eine abgelaufene Aktion
            // oder eine veraltete Wissensbasis (Wissen::vergleichsStand) –, wird die Vorlage neu
            // gefüllt. Weicht das Ergebnis ab, soll ein Mensch den neuen Text erst lesen.
            $stand = Wissen::vergleichsStand($wissen);
            if ((string) $entwurf['wissen_hash'] !== $stand && $vorlage !== '') {
                $neu = Pruefer::pruefeEntwurf($vorlage, $einordnung, $wissen);
                if (self::textForm($neu['text']) === self::textForm((string) $entwurf['text_final'])) {
                    $db->prepare("UPDATE entwurf SET wissen_hash = ? WHERE id = ? AND status = 'offen'")->execute([$stand, $entwurfId]);
                } elseif (!$geaendert) {
                    $db->prepare("UPDATE entwurf SET text_final = ?, pruef_status = ?, pruef_hinweise = ?, wissen_hash = ?
                                  WHERE id = ? AND status = 'offen'")
                        ->execute([$neu['text'], $neu['status'], (string) json_encode($neu['hinweise'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), $stand, $entwurfId]);
                    return $aus(
                        false,
                        'Preise oder Angaben der Website haben sich seit dem Entwurf geändert. Der Entwurf wurde neu gefüllt – bitte noch einmal lesen und dann senden.',
                        ['Preise haben sich seit dem Entwurf geändert']
                    );
                } else {
                    $zusatz[] = 'Preise haben sich seit dem Entwurf geändert';
                }
            }

            if (Versand::empfaengerWeichtAb($n)) {
                $zusatz[] = 'Die Antwort geht an ' . Versand::empfaengerAdresse($n) . ', nicht an den Absender ' . (string) $n['von_adresse']
                    . ' (Antwortadresse der Mail). Absender lassen sich fälschen – bitte prüfen, ob diese Adresse wirklich zum Kunden gehört.';
            }

            $pruefung = Pruefer::pruefe($text, $einordnung, $wissen);
            if (!$geaendert && $vorlage !== '') {
                $pruefung = Pruefer::vereine(Pruefer::pruefeVorlage($vorlage, $einordnung, $wissen), $pruefung);
            }
            if ($zusatz !== []) {
                $pruefung = Pruefer::vereine($pruefung, ['status' => 'warnung', 'hinweise' => $zusatz]);
            }
            if ($pruefung['status'] === 'abgelehnt') {
                return $aus(false, 'Der Text kann so nicht gesendet werden.', $pruefung['hinweise']);
            }
            if ($pruefung['hinweise'] !== [] && !$trotzWarnung) {
                return $aus(false, 'Bitte die Hinweise prüfen und das Senden ausdrücklich bestätigen.', $pruefung['hinweise']);
            }

            $bau = Versand::baueAntwort($n, $text, $wissen, self::sprache((string) ($entwurf['sprache'] ?? 'de')));
            $roh = (string) ($bau['roh'] ?? '');
            $an = (string) ($bau['an'] ?? '');
            $messageId = (string) ($bau['message_id'] ?? '');
            if ($roh === '' || $an === '') {
                return $aus(false, 'Die Antwort konnte nicht aufgebaut werden (kein Empfänger).');
            }

            // Erst merken, dann senden: Der Entwurf steht auf „sendet“ und trägt die Message-ID,
            // bevor die erste Zeile an den Mailserver geht. Ein zweiter Klick findet ihn nicht mehr offen.
            if (!Speicher::wechsle('entwurf', $entwurfId, 'offen', 'sendet', ['gesendet_message_id' => $messageId])) {
                return $aus(false, 'Dieser Entwurf wird bereits gesendet oder ist nicht mehr aktuell.');
            }

            $serverAntwort = '';
            try {
                $ausgang = self::versende(Zugang::smtp() ?? [], $an, $roh, $serverAntwort);
            } catch (\Throwable $e) {
                // Mitten im Versand ist offen, was der Mailserver noch bekommen hat.
                self::protokolliere($e);
                $ausgang = 'unklar';
            }
            $jetzt = Umgebung::jetzt();
            $freigabe = [
                'gesendet_text' => $text,
                'geaendert' => $geaendert ? 1 : 0,
                'freigegeben_von' => $nutzer,
                'freigegeben_am' => $jetzt,
            ];

            if ($ausgang === 'gesendet') {
                Speicher::wechsle('entwurf', $entwurfId, 'sendet', 'gesendet', $freigabe);
                self::setzeStatusNachVersand($nachrichtId, 'gesendet', '');
                Speicher::ereignis('versand', $nachrichtId, $nutzer, [
                    'entwurf_id' => $entwurfId,
                    'geaendert' => $geaendert,
                    'hinweise_bestaetigt' => count($pruefung['hinweise']),
                ]);
                $nachtrag = self::legeAb($postfach, $uidGilt, $roh, (int) $n['uid'], (int) $n['uidvalidity']);
                return $aus(true, 'Gesendet an ' . $an . '.' . ($nachtrag !== '' ? ' Hinweis: ' . $nachtrag : ''));
            }

            if ($ausgang === 'unklar') {
                Speicher::wechsle('entwurf', $entwurfId, 'sendet', 'unklar', $freigabe);
                self::setzeStatusNachVersand($nachrichtId, 'mensch', 'versand_unklar');
                Speicher::ereignis('versand_unklar', $nachrichtId, $nutzer, ['entwurf_id' => $entwurfId]);
                return $aus(false, 'Der Versand ist unklar: Die Verbindung zum Mailserver brach nach der Übergabe der Mail ab. '
                    . 'Bitte im Gesendet-Ordner nachsehen, ob die Antwort angekommen ist. Sie wird nicht automatisch erneut gesendet.');
            }

            // Eindeutig nichts gesendet: Der Entwurf ist wieder offen.
            Speicher::wechsle('entwurf', $entwurfId, 'sendet', 'offen', ['gesendet_message_id' => '']);
            Speicher::ereignis('versand_fehlgeschlagen', $nachrichtId, $nutzer, ['entwurf_id' => $entwurfId]);
            return $aus(false, 'Der Mailserver hat die Nachricht nicht angenommen – es wurde nichts gesendet.'
                . ($serverAntwort !== '' ? ' Meldung: ' . self::einzeilig($serverAntwort, 200) : ''));
        } finally {
            self::schliesse($postfach);
            Speicher::gibFrei($nachrichtId);
        }
    }

    /**
     * @param array<string, mixed> $smtp
     * @return 'gesendet'|'abgelehnt'|'unklar'
     */
    private static function versende(array $smtp, string $an, string $roh, string &$antwort): string
    {
        $ausgang = self::$sendeErsatz !== null
            ? (self::$sendeErsatz)($smtp, $an, $roh, $antwort)
            : Versand::sende($smtp, $an, $roh, $antwort);
        // Alles Unbekannte gilt als unklar – im Zweifel wird nie von selbst erneut gesendet.
        return in_array($ausgang, ['gesendet', 'abgelehnt'], true) ? $ausgang : 'unklar';
    }

    /**
     * Nach dem Versand steht fest, was mit der Nachricht geschehen ist. Der Status wird deshalb
     * auch dann gesetzt, wenn ihn inzwischen etwas anderes verändert hat.
     */
    private static function setzeStatusNachVersand(int $nachrichtId, string $status, string $grund): void
    {
        if (Speicher::wechsle('nachricht', $nachrichtId, 'entwurf', $status, ['status_grund' => $grund])) {
            return;
        }
        Speicher::db()
            ->prepare('UPDATE nachricht SET status = ?, status_grund = ?, aktualisiert_am = ? WHERE id = ? AND status != ?')
            ->execute([$status, $grund, Umgebung::jetzt(), $nachrichtId, $status]);
    }

    /**
     * Kopie in „Gesendet“ ablegen und das Original als beantwortet markieren. Scheitert das, gilt
     * die Mail trotzdem als gesendet – zurück kommt nur ein Hinweis für die Meldung.
     */
    private static function legeAb(?Postfach &$postfach, bool $uidGilt, string $roh, int $uid, int $uidvalidity): string
    {
        $hinweise = [];
        try {
            if ($postfach === null) {
                $postfach = self::postfach();
                $uidGilt = $postfach !== null && (int) ($postfach->status()['uidvalidity'] ?? -1) === $uidvalidity;
            }
            if ($postfach === null) {
                return 'Das Postfach war nicht erreichbar – die Kopie liegt nicht in „Gesendet“, und das Original ist nicht als beantwortet markiert.';
            }
            try {
                if (!$postfach->legeInGesendet($roh)) {
                    $hinweise[] = 'Die Kopie konnte nicht in „Gesendet“ abgelegt werden.';
                }
            } catch (\Throwable $e) {
                self::protokolliere($e);
                $hinweise[] = 'Die Kopie konnte nicht in „Gesendet“ abgelegt werden.';
            }
            if ($uidGilt) {
                $postfach->markiereBeantwortet($uid);
            } else {
                $hinweise[] = 'Das Original konnte nicht als beantwortet markiert werden.';
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
            $hinweise[] = 'Das Original konnte nicht als beantwortet markiert werden.';
        }
        return implode(' ', array_unique($hinweise));
    }

    /**
     * Gründe beim Stand „mensch“, die noch unter „Zu erledigen“ stehen und sich mit „Ich antworte
     * selbst“ oder „Keine Antwort nötig“ abschließen lassen (Admin zeigt dieselben Knöpfe).
     */
    public const MENSCH_OFFEN = ['zu_alt', 'vorgaenger_offen'];

    /** true, wenn verwerfe()/uebernehme() diesen Stand annehmen. */
    public static function abschliessbar(string $status, string $grund): bool
    {
        return in_array($status, ['entwurf', 'wartet_ki', 'fehler'], true)
            || ($status === 'mensch' && in_array($grund, self::MENSCH_OFFEN, true));
    }

    /**
     * Verwirft eine Nachricht samt offenem Entwurf (keine Antwort nötig). Waren frühere Mails in
     * ihr zusammengefasst, sind die damit nicht beantwortet – sie kommen zurück in die Liste.
     */
    public static function verwerfe(int $nachrichtId, string $grund, string $nutzer): void
    {
        $n = self::nachricht($nachrichtId);
        if ($n === null || !self::abschliessbar((string) $n['status'], (string) $n['status_grund'])) {
            return;
        }
        if (!Speicher::wechsle('nachricht', $nachrichtId, (string) $n['status'], 'verworfen', ['status_grund' => ''])) {
            return;
        }
        self::loeseEntwuerfeAb($nachrichtId, 'verworfen');
        Speicher::ereignis('verworfen', $nachrichtId, self::einzeilig($nutzer, 120), ['grund' => self::einzeilig($grund, 120)]);
        self::holeZusammengefassteZurueck($nachrichtId, self::einzeilig($nutzer, 120));
    }

    /**
     * Ein Mitarbeiter antwortet selbst: Nachricht geht an ihn, ein offener Entwurf ist überholt.
     * Zusammengefasste frühere Mails kommen zurück in die Liste – im Mailprogramm sind es eigene Mails.
     */
    public static function uebernehme(int $nachrichtId, string $nutzer): void
    {
        $n = self::nachricht($nachrichtId);
        if ($n === null || !self::abschliessbar((string) $n['status'], (string) $n['status_grund'])) {
            return;
        }
        if (!Speicher::wechsle('nachricht', $nachrichtId, (string) $n['status'], 'mensch', ['status_grund' => 'uebernommen'])) {
            return;
        }
        self::loeseEntwuerfeAb($nachrichtId, 'ueberholt');
        Speicher::ereignis('uebernommen', $nachrichtId, self::einzeilig($nutzer, 120), []);
        self::holeZusammengefassteZurueck($nachrichtId, self::einzeilig($nutzer, 120));
    }

    /**
     * Erzeugt für eine Nachricht sofort einen frischen Entwurf (ein Aufruf, ohne Übernahme aus
     * einem Duplikat). Auch für Nachrichten, die die Regelstufe aussortiert oder wegen ihres
     * Alters abgegeben hat – ein Mensch darf das überstimmen.
     *
     * @return array{ok: bool, grund: string, meldung: string}
     */
    public static function neuErzeugen(int $nachrichtId, string $nutzer): array
    {
        $aus = static fn (bool $ok, string $grund, string $meldung): array => ['ok' => $ok, 'grund' => $grund, 'meldung' => $meldung];
        if (!Umgebung::$bibliotheken) {
            return $aus(false, 'bibliotheken', 'Die Bibliotheken fehlen auf dem Server – es kann kein Entwurf erzeugt werden.');
        }
        $n = self::nachricht($nachrichtId);
        if ($n === null) {
            return $aus(false, 'nicht_gefunden', 'Nachricht nicht gefunden.');
        }
        $status = (string) $n['status'];
        // Widerspruch gegen die KI-Bearbeitung (Absenderregel): auch auf Knopfdruck kein Aufruf.
        if (self::widerspruch($n)) {
            return $aus(false, 'absenderregel', 'Für diesen Absender gilt eine Absenderregel – seine Mails gehen nicht an die KI.');
        }
        if (!self::erzeugbar($n)) {
            return $aus(false, 'status', 'Für diese Nachricht kann kein neuer Entwurf erzeugt werden.');
        }
        if (trim((string) $n['text_bereinigt']) === '') {
            return $aus(false, 'kein_text', 'Der Text dieser Nachricht ist nicht (mehr) gespeichert.');
        }
        // Erst fragen, dann ändern: Ist gerade kein Aufruf möglich, bleibt alles, wie es ist.
        $erlaubnis = Budget::darfAufrufen(self::absenderSchluessel($n));
        if (empty($erlaubnis['ok'])) {
            $grund = (string) ($erlaubnis['grund'] ?? '') ?: 'pausiert';
            return $aus(false, $grund, 'Gerade ist kein KI-Aufruf möglich (' . self::grundText($grund) . '). Es wurde nichts geändert.');
        }

        // Hat inzwischen jemand aus dem Mailprogramm geantwortet? Ist das gerade nicht prüfbar,
        // entscheidet der Mensch, der den Knopf gedrückt hat – er sieht die Mail ja vor sich.
        $postfach = null;
        try {
            $postfach = self::postfach();
            if (self::beantwortetImPostfach($postfach, $n) === true && $status !== 'ohne_ki') {
                if ($status !== 'mensch') {
                    self::markiereBeantwortet($nachrichtId, $status);
                }
                return $aus(false, 'beantwortet', 'Auf diese Mail wurde bereits aus dem Postfach geantwortet.');
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
        } finally {
            self::schliesse($postfach);
        }

        $db = Speicher::db();
        if ($status === 'wartet_ki') {
            $db->prepare("UPDATE nachricht SET status_grund = '', versuche = 0, aktualisiert_am = ? WHERE id = ? AND status = 'wartet_ki'")
                ->execute([Umgebung::jetzt(), $nachrichtId]);
        } elseif (!Speicher::wechsle('nachricht', $nachrichtId, $status, 'wartet_ki', ['status_grund' => '', 'versuche' => 0])) {
            return $aus(false, 'status', 'Die Nachricht wurde gerade von jemand anderem bearbeitet.');
        }
        self::loeseEntwuerfeAb($nachrichtId, 'ueberholt');
        $db->prepare('DELETE FROM einordnung WHERE nachricht_id = ?')->execute([$nachrichtId]);
        Speicher::ereignis('neu_erzeugen', $nachrichtId, self::einzeilig($nutzer, 120), []);

        $r = self::schritt($nachrichtId, true, null);
        // Eine Mail, die älter als 24 Stunden ist, gibt der nächste Lauf wieder an den Menschen ab
        // (gibZuAlteAb) – dann verspricht die Meldung keinen automatischen neuen Versuch.
        $alt = Umgebung::jetzt() - (int) $n['eingang_am'] > self::HOECHSTALTER_SEK;
        $meldung = match (true) {
            $r['ok'] && $r['grund'] === 'stark' => 'Der Entwurf ist erzeugt; der nächste Lauf überarbeitet ihn mit dem stärkeren Modell.',
            $r['ok'] && $r['grund'] === 'abgelehnt' => 'Die KI hat diese Nachricht nicht bearbeitet. Bitte selbst beantworten.',
            $r['ok'] => 'Neuer Entwurf erzeugt.',
            in_array($r['grund'], self::GRUENDE_FUER_ALLE, true) || $r['grund'] === 'limit_absender'
                => 'Gerade ist kein KI-Aufruf möglich (' . self::grundText($r['grund']) . ').'
                    . ($alt ? ' Bitte später noch einmal „Neu erzeugen“ wählen.' : ' Die Nachricht wartet.'),
            $alt => 'Der Aufruf ist gescheitert (' . $r['grund'] . '). Bitte später noch einmal „Neu erzeugen“ wählen.',
            default => 'Der Aufruf ist gescheitert (' . $r['grund'] . '). Der nächste Lauf versucht es noch einmal.',
        };
        return $aus($r['ok'], $r['grund'], $meldung);
    }

    /**
     * Darf für diese Nachricht ein (neuer) Entwurf entstehen? Nie nach einem unklaren (auch einem
     * später geklärten) Versand oder während eines Versands: Die Antwort kann beim Kunden
     * angekommen sein, ein zweiter Versand wäre doppelt. Nie ohne Absenderadresse (nicht sendbar)
     * und nie für Formular- und eigene Mails (kein Text gespeichert). Admin::nachricht nutzt
     * dieselbe Prüfung für den Knopf.
     *
     * @param array<string, mixed> $n Zeile der Tabelle nachricht
     */
    public static function erzeugbar(array $n): bool
    {
        $status = (string) ($n['status'] ?? '');
        $grund = (string) ($n['status_grund'] ?? '');
        $kategorie = (string) ($n['regel_kategorie'] ?? '');
        $erlaubt = in_array($status, ['entwurf', 'fehler', 'wartet_ki'], true)
            || ($status === 'mensch' && !in_array($grund, ['versand_unklar', 'versand_geklaert', 'absenderregel'], true))
            || ($status === 'ohne_ki' && !in_array($kategorie, array_merge(self::OHNE_TEXT, ['kein_absender', 'absenderregel']), true));
        if (!$erlaubt) {
            return false;
        }
        $versand = Speicher::db()->prepare("SELECT 1 FROM entwurf WHERE nachricht_id = ? AND status IN ('sendet', 'unklar') LIMIT 1");
        $versand->execute([(int) ($n['id'] ?? 0)]);
        return $versand->fetchColumn() === false;
    }

    /**
     * true, wenn für den Absender eine Absenderregel gilt oder die Nachricht wegen einer solchen
     * Regel aussortiert wurde – dann geht sie nie an die KI (Widerspruch, Art. 21 DSGVO).
     *
     * @param array<string, mixed> $n
     */
    public static function widerspruch(array $n): bool
    {
        return (string) ($n['status_grund'] ?? '') === 'absenderregel'
            || in_array((string) ($n['regel_kategorie'] ?? ''), ['absenderregel', 'mensch'], true)
            || Regeln::absenderRegel((string) ($n['von_adresse'] ?? '')) !== null;
    }

    // =======================================================================================
    // Benachrichtigungen an das eigene Postfach
    // =======================================================================================

    /**
     * Merkt sich, seit wann ein Zustand anhält ($schluessel: Einstellung mit dem Zeitpunkt).
     * true, wenn er seit mindestens DAUERSTOERUNG_SEK besteht; ein beendeter Zustand wird gelöscht.
     * Fehler der Datenbank ändern nichts am Lauf.
     */
    private static function dauerzustand(string $schluessel, bool $aktiv): bool
    {
        try {
            $seit = Speicher::einstellung($schluessel);
            if (!$aktiv) {
                if ($seit !== '') {
                    Speicher::setze($schluessel, '', 'lauf');
                }
                return false;
            }
            $jetzt = Umgebung::jetzt();
            if ($seit === '' || (int) $seit > $jetzt) {
                Speicher::setze($schluessel, (string) $jetzt, 'lauf');
                return false;
            }
            return $jetzt - (int) $seit >= self::DAUERSTOERUNG_SEK;
        } catch (\Throwable $e) {
            self::protokolliere($e);
            return false;
        }
    }

    /**
     * Hinweis-Mail: nur Anzahl und Adresse des Admin-Bereichs, kein Kundeninhalt. Den Abstand von
     * 30 Minuten hält Versand::sendeIntern() ein; gezählt wird dort erst nach einem gelungenen
     * Versand, damit ein gescheiterter Versuch den nächsten Hinweis nicht unterdrückt.
     */
    private static function hinweisMail(): void
    {
        try {
            if (Speicher::einstellung('hinweis_mail') !== '1' || !Umgebung::$bibliotheken) {
                return;
            }
            // Gezählt werden offene Entwürfe – ohne die, deren Mail nicht mehr im Posteingang liegt
            // (meist im Mailprogramm erledigt). Eine Mail geht nur, wenn seit dem letzten Hinweis
            // ein neuer Entwurf dazukam.
            $zahlen = Speicher::db()->query(
                "SELECT COUNT(*) AS anzahl, COALESCE(MAX(w.erstellt_am), 0) AS neuester FROM nachricht n
                 JOIN entwurf w ON w.nachricht_id = n.id AND w.status = 'offen'
                 WHERE n.status = 'entwurf' AND COALESCE(n.status_grund, '') != 'nicht_im_posteingang'"
            )->fetch(\PDO::FETCH_ASSOC);
            $anzahl = (int) ($zahlen['anzahl'] ?? 0);
            $neuester = (int) ($zahlen['neuester'] ?? 0);
            if ($anzahl < 1 || $neuester <= (int) Speicher::einstellung('hinweis_letzter_entwurf')) {
                return;
            }
            $betreff = $anzahl === 1
                ? 'KI-Assistent: 1 Antwort-Entwurf wartet'
                : 'KI-Assistent: ' . $anzahl . ' Antwort-Entwürfe warten';
            $text = ($anzahl === 1
                    ? 'Im Admin-Bereich wartet ein Antwort-Entwurf darauf, gelesen und gesendet zu werden.'
                    : 'Im Admin-Bereich warten ' . $anzahl . ' Antwort-Entwürfe darauf, gelesen und gesendet zu werden.')
                . "\n\n" . self::adminAdresse()
                . "\n\nDiese Nachricht kommt höchstens alle 30 Minuten. Abschalten lässt sie sich im Admin-Bereich unter Einstellungen.";
            if (Versand::sendeIntern($betreff, $text, 'hinweis')) {
                Speicher::setze('hinweis_letzter_entwurf', (string) $neuester, 'lauf');
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    /**
     * Störungs-Mail in einfachen Sätzen: was ist passiert, was bedeutet das, was ist zu tun.
     * Je Ursache höchstens eine in zwölf Stunden: Die Ursache geht als Art an
     * Versand::sendeIntern(), das den Abstand je Art einhält (gezählt nach gelungenem Versand).
     *
     * @param 'limit_anbieter'|'schluessel'|'limit_monat'|'postfach'|'deploy'|'wissen'|'login' $ursache
     */
    public static function stoerung(string $ursache): void
    {
        try {
            if (!Umgebung::$bibliotheken) {
                return;
            }
            [$betreff, $passiert, $bedeutet, $tun] = match ($ursache) {
                'limit_anbieter' => [
                    'KI-Assistent: Ausgabenlimit bei Anthropic erreicht',
                    'Anthropic hat einen Aufruf abgelehnt, weil das Ausgabenlimit oder das Guthaben des Kontos erreicht ist.',
                    'Der Assistent schreibt bis zum Monatsanfang keine Antwort-Entwürfe mehr. Neue Mails werden weiter eingelesen.',
                    'Bitte in der Anthropic-Konsole Limit und Guthaben prüfen. Bis dahin eingehende Mails selbst beantworten.',
                ],
                'schluessel' => [
                    'KI-Assistent: API-Schlüssel abgelehnt',
                    'Anthropic hat den hinterlegten API-Schlüssel abgelehnt.',
                    'Der Assistent schreibt für sechs Stunden keine Antwort-Entwürfe und versucht es danach erneut. Neue Mails werden weiter eingelesen.',
                    'Bitte in der Anthropic-Konsole prüfen, ob der Schlüssel noch gültig ist, und bei Bedarf einen neuen hinterlegen. Bis dahin eingehende Mails selbst beantworten.',
                ],
                'limit_monat' => [
                    'KI-Assistent: eigenes Monatslimit erreicht',
                    'Die Kosten dieses Monats haben das im Admin-Bereich eingestellte Monatslimit erreicht.',
                    'Der Assistent schreibt bis zum Monatsanfang keine Antwort-Entwürfe mehr. Neue Mails werden weiter eingelesen.',
                    'Wenn weiter Entwürfe entstehen sollen, das Monatslimit im Admin-Bereich unter Einstellungen erhöhen. Sonst eingehende Mails selbst beantworten.',
                ],
                'deploy' => [
                    'KI-Assistent: Veröffentlichen unvollständig',
                    'Die Dateien des Assistenten auf dem Server passen seit über 30 Minuten nicht zusammen. Vermutlich ist das letzte Veröffentlichen der Website mittendrin abgebrochen.',
                    'Der Assistent liest so lange keine Mails ein und schreibt keine Antwort-Entwürfe. Im Mailprogramm kommen die Mails wie gewohnt an.',
                    'Bitte die Website neu veröffentlichen (bei GitHub den Ablauf „Build & Deploy“ erneut starten) und danach im Admin-Bereich den Selbsttest ansehen. Bis dahin eingehende Mails selbst beantworten.',
                ],
                'wissen' => [
                    'KI-Assistent: Wissensbasis veraltet',
                    'Die Website wurde veröffentlicht, der Assistent aber nicht mit aktualisiert. Er arbeitet noch mit den Preisen und Angaben des vorherigen Stands.',
                    'Antwort-Entwürfe, die einen Preis nennen würden, werden abgewiesen. Alle anderen Entwürfe entstehen weiter.',
                    'Bitte im letzten GitHub-Ablauf „Build & Deploy“ den Schritt „KI-Assistent prüfen …“ ansehen, die Ursache beheben und neu veröffentlichen.',
                ],
                'login' => [
                    'KI-Assistent: viele fehlgeschlagene Anmeldungen',
                    'In der letzten Stunde ist die Anmeldung am Admin-Bereich sehr oft mit falschem Passwort versucht worden, von verschiedenen Adressen.',
                    'Vermutlich versucht jemand, das Passwort zu erraten. Richtige Anmeldungen funktionieren weiter.',
                    'Wenn das Passwort nicht lang und zufällig ist (mindestens 16 Zeichen): bei GitHub das Secret ANALYTICS_PASSWORD ändern und die Website neu veröffentlichen (Betriebsanleitung Abschnitt 2).',
                ],
                default => [
                    'KI-Assistent: Postfach nicht erreichbar',
                    'Der Assistent konnte das Postfach dreimal nacheinander nicht abrufen.',
                    'Neue Mails werden derzeit nicht eingelesen, es entstehen keine Antwort-Entwürfe. Im Mailprogramm kommen die Mails wie gewohnt an.',
                    'Bitte prüfen, ob sich das Passwort des Postfachs geändert hat oder der Mailserver gestört ist. Der Selbsttest im Admin-Bereich zeigt, woran es liegt.',
                ],
            };
            $text = "Was ist passiert:\n" . $passiert . "\n\nWas bedeutet das:\n" . $bedeutet . "\n\nWas ist zu tun:\n" . $tun
                . "\n\n" . self::adminAdresse();
            if (Versand::sendeIntern($betreff, $text, 'stoerung_' . $ursache)) {
                Speicher::ereignis('stoerung', null, 'lauf', ['ursache' => $ursache]);
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    /** Dritter Ausfall des Postfachs in Folge (zwei frühere Läufe mit demselben Hinweis): melden. */
    private static function meldePostfachAusfall(): void
    {
        try {
            $letzte = Speicher::db()->query('SELECT hinweis FROM lauf ORDER BY id DESC LIMIT 2')->fetchAll(\PDO::FETCH_COLUMN);
            if (count($letzte) < 2) {
                return;
            }
            foreach ($letzte as $hinweis) {
                if (!str_contains((string) $hinweis, 'Postfach nicht erreichbar')) {
                    return;
                }
            }
            self::stoerung('postfach');
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    private static function adminAdresse(): string
    {
        return 'https://' . Umgebung::eigeneDomain() . '/assistent/';
    }

    // =======================================================================================
    // Selbsttest und Manifest
    // =======================================================================================

    /**
     * Selbsttest für den Admin-Bereich: kostenlos, ohne Inhalte und ohne Zugangsdaten.
     *
     * @return list<array{punkt: string, ok: bool, meldung: string}>
     */
    public static function selbsttest(): array
    {
        $liste = [];
        $punkt = static function (string $name, bool $ok, string $meldung) use (&$liste): void {
            $liste[] = ['punkt' => $name, 'ok' => $ok, 'meldung' => $meldung];
        };
        $versuche = static function (string $name, callable $pruefung) use ($punkt): void {
            try {
                [$ok, $meldung] = $pruefung();
                $punkt($name, (bool) $ok, (string) $meldung);
            } catch (\Throwable $e) {
                self::protokolliere($e);
                $punkt($name, false, 'Prüfung fehlgeschlagen (' . self::klasse($e) . ').');
            }
        };

        $laufzeit = (int) ini_get('max_execution_time');
        $punkt('PHP', version_compare(PHP_VERSION, '8.2.0', '>=') && ($laufzeit === 0 || $laufzeit >= 45),
            'PHP ' . PHP_VERSION . ', Laufzeitgrenze ' . ($laufzeit === 0 ? 'keine' : $laufzeit . ' Sekunden')
            . ($laufzeit > 0 && $laufzeit < 45 ? ' – für einen Lauf mit KI-Aufruf sollten es mindestens 45 sein' : ''));

        $punkt('Bibliotheken', Umgebung::$bibliotheken, Umgebung::$bibliotheken ? 'geladen' : 'fehlen – Postfach und KI sind nicht nutzbar');

        $versuche('Datenordner', static function (): array {
            $ordner = Umgebung::datenOrdner();
            $probe = $ordner . '/.schreibprobe';
            $ok = @file_put_contents($probe, '1') !== false;
            @unlink($probe);
            return [$ok, $ok ? 'schreibbar' : 'nicht schreibbar'];
        });
        $versuche('Datenbank', static function (): array {
            $zahl = (int) Speicher::db()->query('SELECT COUNT(*) FROM nachricht')->fetchColumn();
            return [true, 'SQLite erreichbar, ' . $zahl . ' Nachrichten gespeichert'];
        });

        $versuche('Wissensbasis', static function (): array {
            $wissen = Wissen::laden();
            if ($wissen === null) {
                return [false, 'fehlt oder ist unlesbar – es entstehen keine Entwürfe'];
            }
            $text = 'Stand ' . ((string) $wissen['stand'] ?: 'unbekannt') . ', ' . count($wissen['leistungen']) . ' Leistungen, '
                . count($wissen['platzhalter']) . ' Platzhalter';
            if (Wissen::veraltet($wissen)) {
                return [false, $text . ' – passt nicht zum Stand der Website: ' . Pruefer::HINWEIS_WISSEN_VERALTET];
            }
            if (Wissen::aktionAbgelaufen($wissen)) {
                return [false, $text . ' – ' . Pruefer::HINWEIS_AKTION_ABGELAUFEN];
            }
            return [true, $text];
        });

        // Löschfrist der Datenschutzerklärung: Der Löschlauf hängt an den Läufen.
        $versuche('Löschlauf', static function (): array {
            $db = Speicher::db();
            $letzter = (int) $db->query("SELECT COALESCE(MAX(zeit), 0) FROM ereignis WHERE art = 'aufraeumen'")->fetchColumn();
            $mails = (int) $db->query('SELECT COUNT(*) FROM nachricht')->fetchColumn();
            if ($letzter === 0) {
                return [$mails === 0, $mails === 0 ? 'noch keiner nötig' : 'noch nie gelaufen – läuft der Abruf?'];
            }
            $tage = (Umgebung::jetzt() - $letzter) / 86400;
            return [$tage <= 2, 'zuletzt ' . self::datumKurz($letzter)
                . ($tage > 2 ? ' – länger als zwei Tage her; ohne Abruf wird nichts gelöscht (Abschnitt 9 der Betriebsanleitung)' : '')];
        });

        $manifest = self::manifestStimmt();
        $punkt('Manifest', $manifest !== false, match ($manifest) {
            null => 'nicht vorhanden (lokale Umgebung) – Prüfung entfällt',
            true => 'alle Dateien passen zum letzten Deploy',
            false => 'Dateien passen nicht zusammen – läuft gerade ein Deploy?',
        });

        $versuche('Claude', static function (): array {
            if (Zugang::claude() === null) {
                return [false, 'Kein API-Schlüssel hinterlegt.'];
            }
            if (!Umgebung::$bibliotheken) {
                return [false, 'Schlüssel hinterlegt, aber die Bibliotheken fehlen – Anthropic ist so nicht erreichbar.'];
            }
            $r = Claude::modelleErreichbar();
            // Die zweite Sicherung lässt sich von hier aus nicht prüfen – also daran erinnern.
            return [!empty($r['ok']), self::einzeilig((string) ($r['meldung'] ?? ''), 300)
                . (!empty($r['ok']) ? ' Zweite Sicherung: Monatslimit des Arbeitsbereichs in der Anthropic-Console (Betriebsanleitung Abschnitt 8).' : '')];
        });

        $versuche('Postfach', static function (): array {
            [$postfach, $grund] = self::oeffnePostfach();
            if ($postfach === null) {
                return [false, match ($grund) {
                    'kein_zugang' => 'Kein Zugang zum Postfach hinterlegt.',
                    'bibliotheken' => 'Bibliotheken fehlen.',
                    default => 'Anmeldung am Postfach fehlgeschlagen.',
                }];
            }
            try {
                $t = $postfach->selbsttest();
            } finally {
                self::schliesse($postfach);
            }
            $zugang = Zugang::imap();
            $gesendet = self::einzeilig((string) ($t['gesendet'] ?? ''), 60);
            $text = (!empty($t['ok']) ? 'Anmeldung in Ordnung' : 'Anmeldung fehlgeschlagen')
                . ($zugang !== null ? ', Postfach ' . self::maskiereAdresse((string) ($zugang['user'] ?? '')) : '')
                . (!empty($t['ok']) ? ', ' . (int) ($t['posteingang'] ?? 0) . ' Mails im Posteingang' : '')
                . ($gesendet !== '' ? ', Gesendet-Ordner: ' . $gesendet : '');
            $meldung = self::einzeilig((string) ($t['meldung'] ?? ''), 200);
            return [!empty($t['ok']), $text . ($meldung !== '' ? ' – ' . $meldung : '')];
        });

        $versuche('Mailversand', static function (): array {
            if (Umgebung::lokal() && getenv('KZP_ASSISTENT_VERSAND') === 'datei') {
                return [true, 'Testbetrieb: Mails werden in den Ordner „ausgang“ geschrieben, nicht gesendet.'];
            }
            $smtp = Zugang::smtp();
            if ($smtp === null) {
                return [false, 'Kein Zugang zum Mailserver hinterlegt.'];
            }
            if (!Umgebung::$bibliotheken) {
                return [false, 'Bibliotheken fehlen – es kann nicht gesendet werden.'];
            }
            // Nur an- und abmelden, nichts senden (Versand kennt die SMTP-Sitzung).
            $r = Versand::pruefeAnmeldung($smtp);
            return [!empty($r['ok']), self::einzeilig((string) ($r['meldung'] ?? ''), 200)];
        });

        $punkt('Login', Zugang::admin() !== null, Zugang::admin() !== null ? 'Zugang zum Admin-Bereich ist hinterlegt' : 'Login-Datei fehlt');

        return $liste;
    }

    /**
     * Vergleicht die ausgelieferten Dateien mit intern/manifest.json (vom Deploy geschrieben).
     * null = kein Manifest (lokal), true = alles passt, false = mindestens eine Datei weicht ab.
     */
    private static function manifestStimmt(): ?bool
    {
        // Nur ein gutes Ergebnis merken: Ein laufender Deploy kann im selben Prozess fertig werden.
        static $gut = false;
        if ($gut) {
            return true;
        }
        $pfad = __DIR__ . '/manifest.json';
        $wurzel = dirname(__DIR__);
        // Nur lokal (Tests): ein Manifest an anderer Stelle, damit sich der Dauerzustand prüfen lässt.
        $probe = getenv('KZP_ASSISTENT_MANIFEST');
        if (Umgebung::lokal() && is_string($probe) && $probe !== '') {
            $pfad = $probe;
            $wurzel = dirname($probe, 2);
            return self::pruefeManifest($pfad, $wurzel);
        }
        $ergebnis = self::pruefeManifest($pfad, $wurzel);
        $gut = $ergebnis === true;
        return $ergebnis;
    }

    /**
     * Prüft ein Manifest in der Form, die scripts/assistent-bauen.mjs schreibt:
     * {"dateien": {"<Pfad relativ zu assistent/>": "<sha256 hex>", …}, "erzeugt": …, "vendor": …}.
     * Nur „dateien“ zählt. Ein Pfad mit „..“ oder ein absoluter Pfad gilt als Fehler, ebenso ein
     * leeres oder unlesbares Manifest – lieber einen Lauf aussetzen als mit halb hochgeladenen
     * Dateien arbeiten.
     */
    private static function pruefeManifest(string $pfad, string $wurzel): ?bool
    {
        if (!is_file($pfad)) {
            return null;
        }
        $manifest = json_decode((string) @file_get_contents($pfad), true);
        $dateien = is_array($manifest) ? ($manifest['dateien'] ?? null) : null;
        if (!is_array($dateien) || $dateien === []) {
            return false;
        }
        foreach ($dateien as $relativ => $soll) {
            $relativ = (string) $relativ;
            if (!is_string($soll) || $relativ === '' || str_contains($relativ, '..') || str_starts_with($relativ, '/')) {
                return false;
            }
            $datei = rtrim($wurzel, '/') . '/' . $relativ;
            if (!is_file($datei) || !hash_equals(strtolower(trim($soll)), (string) hash_file('sha256', $datei))) {
                return false;
            }
        }
        return true;
    }

    // =======================================================================================
    // Kleine Hilfen
    // =======================================================================================

    /** @return array<string, mixed>|null */
    private static function nachricht(int $id): ?array
    {
        $suche = Speicher::db()->prepare('SELECT * FROM nachricht WHERE id = ?');
        $suche->execute([$id]);
        $zeile = $suche->fetch(\PDO::FETCH_ASSOC);
        return is_array($zeile) ? $zeile : null;
    }

    /** @return array<string, mixed>|null */
    private static function einordnung(int $nachrichtId): ?array
    {
        $suche = Speicher::db()->prepare('SELECT * FROM einordnung WHERE nachricht_id = ?');
        $suche->execute([$nachrichtId]);
        $zeile = $suche->fetch(\PDO::FETCH_ASSOC);
        return is_array($zeile) ? $zeile : null;
    }

    /** @return array<string, mixed>|null */
    private static function offenerEntwurf(int $nachrichtId): ?array
    {
        $suche = Speicher::db()->prepare("SELECT * FROM entwurf WHERE nachricht_id = ? AND status = 'offen' ORDER BY version DESC, id DESC LIMIT 1");
        $suche->execute([$nachrichtId]);
        $zeile = $suche->fetch(\PDO::FETCH_ASSOC);
        return is_array($zeile) ? $zeile : null;
    }

    /** @return array{ok: bool, grund: string, aufruf: bool, entwurf: bool} */
    private static function erg(bool $ok, string $grund, bool $aufruf = false, bool $entwurf = false): array
    {
        return ['ok' => $ok, 'grund' => $grund, 'aufruf' => $aufruf, 'entwurf' => $entwurf];
    }

    private static function schliesse(?Postfach $postfach): void
    {
        try {
            $postfach?->schliessen();
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    /** Text so, wie er verglichen und gesendet wird: einheitliche Zeilenenden, ohne Rand. */
    private static function textForm(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = (string) preg_replace('/[ \t]+\n/u', "\n", $text);
        return trim($text);
    }

    private static function einzeilig(string $text, int $max): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        return mb_strlen($text) > $max ? mb_substr($text, 0, $max) : $text;
    }

    private static function kuerze(string $text, int $max): string
    {
        return mb_strlen($text) > $max ? rtrim(mb_substr($text, 0, $max)) . ' …' : $text;
    }

    private static function ohneKlammern(string $id): string
    {
        return trim($id, " \t\r\n<>");
    }

    /** „22.11.2026“ (Berliner Datum). */
    private static function datumKurz(int $zeit): string
    {
        return (new \DateTimeImmutable('@' . $zeit))->setTimezone(new \DateTimeZone('Europe/Berlin'))->format('d.m.Y');
    }

    /** Nur erster Buchstabe und Domain – die Adresse selbst gehört nicht in eine Statusanzeige. */
    private static function maskiereAdresse(string $adresse): string
    {
        $teile = explode('@', $adresse, 2);
        if (count($teile) !== 2 || $teile[0] === '') {
            return 'hinterlegt';
        }
        return mb_substr($teile[0], 0, 1) . '…@' . $teile[1];
    }

    private static function klasse(\Throwable $e): string
    {
        return substr((string) strrchr('\\' . $e::class, '\\'), 1);
    }

    /**
     * Fehler ins Server-Protokoll – nur Klasse und Fundstelle. Die Meldung einer Ausnahme kann
     * Teile einer Mail, eine Adresse oder eine Serverantwort enthalten und bleibt deshalb draußen.
     */
    private static function protokolliere(\Throwable $e): void
    {
        error_log('KZP-Assistent: ' . $e::class . ' in ' . basename($e->getFile()) . ':' . $e->getLine());
    }
}
