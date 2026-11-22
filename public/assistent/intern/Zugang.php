<?php
/**
 * KI-Assistent – Zugangsdaten für Claude, Postfach (IMAP und SMTP) und den Admin-Login.
 *
 * Nichts davon steht im Repository. Quellen:
 *
 *   Server  intern/zugang-daten.php     vom Deploy aus GitHub-Secrets geschrieben:
 *                                       ['anthropic_key' => '…', 'mail_user' => '', 'mail_pass' => '', 'mail_host' => '']
 *           api/mail-zugang.php         Postfach des Formulars (scripts/mail-zugang.mjs) – dasselbe Postfach
 *           api/analytics-zugang.php    Login des Analytics-Dashboards – derselbe Login
 *   Lokal   Umgebungsvariablen ANTHROPIC_API_KEY, ASSISTENT_MAIL_USER/_PASS/_HOST,
 *           ASSISTENT_ADMIN_USER/_PASS; für den Schlüssel ersatzweise die Zeile in .env.assistent
 *           (legt scripts/ki-schluessel-einrichten.sh an).
 *
 * Eine GESETZTE Umgebungsvariable gewinnt immer – auch wenn sie leer ist. Leer heißt dann
 * ausdrücklich „kein Zugang“: So lässt sich in Tests der Zustand ohne Schlüssel herstellen,
 * ohne dass die lokale .env.assistent einspringt, und ein Testlauf kann den echten Schlüssel
 * mit einem Platzhalter überdecken.
 *
 * Fehlt etwas, liefern alle Methoden null – nie eine Ausnahme. Werte werden nirgends
 * ausgegeben oder protokolliert.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Zugang
{
    /**
     * Mailserver des all-inkl-Vertrags für SMTP und IMAP. Derselbe Standard wie SMTP_HOST in
     * api/auftrag.php: mail-zugang.php enthält den Host nur, wenn das Secret SMTP_HOST gesetzt ist.
     */
    private const MAIL_HOST = 'w0216162.kasserver.com';
    private const SMTP_PORT = 587;   // STARTTLS, wie beim Formular
    private const IMAP_PORT = 993;   // TLS von Anfang an

    /** @var array<string,array<mixed>> Inhalt der Zugangsdateien je Pfad (ein Aufruf liest jede Datei nur einmal) */
    private static array $dateien = [];

    /** @var array<string,string> Werte aus .env-Dateien je Pfad und Name */
    private static array $envDateien = [];

    /**
     * Claude-Schlüssel. KZP_ASSISTENT_OHNE_SCHLUESSEL=1 schaltet ihn in jeder Umgebung ab – für
     * lokale Proben, in denen sicher kein bezahlter Aufruf möglich sein soll, ganz gleich, was
     * in .env.assistent oder zugang-daten.php steht.
     *
     * @return array{key:string}|null
     */
    public static function claude(): ?array
    {
        if (self::umgebung('KZP_ASSISTENT_OHNE_SCHLUESSEL') === '1') {
            return null;
        }
        $key = self::umgebung('ANTHROPIC_API_KEY');
        if ($key === null) {
            $key = self::feld(self::datei(__DIR__ . '/zugang-daten.php'), 'anthropic_key');
            if ($key === '') {
                $key = self::ausEnvDatei(Umgebung::wurzel() . '/.env.assistent', 'ANTHROPIC_API_KEY');
            }
        }
        $key = trim($key);
        // Ein Schlüssel mit Leer- oder Steuerzeichen ist beim Kopieren kaputtgegangen und würde nur Fehler erzeugen.
        if ($key === '' || preg_match('/[\s\x00-\x1F\x7F]/', $key) === 1) {
            return null;
        }
        return ['key' => $key];
    }

    /**
     * Zugang für den Versand. absender ist die Postfach-Adresse: all-inkl nimmt nach der
     * Anmeldung nur eigene Adressen als Absender an, und die Antwort soll aus dem Postfach
     * kommen, an das der Kunde geschrieben hat.
     *
     * @return array{host:string,port:int,user:string,pass:string,absender:string}|null
     */
    public static function smtp(): ?array
    {
        $mail = self::postfach();
        if ($mail === null) {
            return null;
        }
        // Kleingeschrieben, damit Vergleiche mit von_adresse (immer klein) ohne Umwege stimmen.
        $absender = filter_var($mail['user'], FILTER_VALIDATE_EMAIL) !== false
            ? strtolower($mail['user'])
            : 'info@' . Umgebung::eigeneDomain();
        return [
            'host'     => $mail['host'],
            'port'     => $mail['port'],
            'user'     => $mail['user'],
            'pass'     => $mail['pass'],
            'absender' => $absender,
        ];
    }

    /** @return array{host:string,port:int,user:string,pass:string}|null */
    public static function imap(): ?array
    {
        $mail = self::postfach();
        if ($mail === null) {
            return null;
        }
        return [
            'host' => $mail['host'],
            'port' => self::IMAP_PORT,
            'user' => $mail['user'],
            'pass' => $mail['pass'],
        ];
    }

    /**
     * Login für den Admin-Bereich – derselbe wie beim Analytics-Dashboard.
     *
     * @return array{user:string,pass:string}|null
     */
    public static function admin(): ?array
    {
        $user = self::umgebung('ASSISTENT_ADMIN_USER');
        $pass = self::umgebung('ASSISTENT_ADMIN_PASS');
        if ($user !== null || $pass !== null) {
            $user = trim((string) $user);
            $pass = (string) $pass;
            return ($user !== '' && $pass !== '') ? ['user' => $user, 'pass' => $pass] : null;
        }
        $z = self::datei(dirname(__DIR__, 2) . '/api/analytics-zugang.php');
        $user = self::feld($z, 'user');
        $pass = self::feld($z, 'pass');
        // Gleiche Mindestanforderung wie kzp_zugang() der Webanalyse.
        if ($user === '' || strlen($pass) < 10) {
            return null;
        }
        return ['user' => $user, 'pass' => $pass];
    }

    /**
     * Gemeinsame Grundlage für smtp() und imap(): Feld für Feld gilt die erste Quelle,
     * die etwas liefert – Umgebung, dann zugang-daten.php, dann mail-zugang.php des Formulars.
     *
     * @return array{host:string,port:int,user:string,pass:string}|null
     */
    private static function postfach(): ?array
    {
        $eigene = self::datei(__DIR__ . '/zugang-daten.php');
        $formular = self::datei(dirname(__DIR__, 2) . '/api/mail-zugang.php');

        $user = trim(self::erster(self::umgebung('ASSISTENT_MAIL_USER'), self::feld($eigene, 'mail_user'), self::feld($formular, 'user')));
        // Passwörter nicht beschneiden: Leerzeichen am Rand können dazugehören.
        $pass = self::erster(self::umgebung('ASSISTENT_MAIL_PASS'), self::feld($eigene, 'mail_pass'), self::feld($formular, 'pass'));
        $host = trim(self::erster(self::umgebung('ASSISTENT_MAIL_HOST'), self::feld($eigene, 'mail_host'), self::feld($formular, 'host')));
        if ($host === '') {
            $host = self::MAIL_HOST;
        }
        if ($user === '' || $pass === '' || preg_match('/^[A-Za-z0-9.-]{1,253}$/', $host) !== 1) {
            return null;
        }
        $port = (int) ($formular['port'] ?? 0);
        return [
            'host' => $host,
            'port' => ($port >= 1 && $port <= 65535) ? $port : self::SMTP_PORT,
            'user' => $user,
            'pass' => $pass,
        ];
    }

    /** Wert einer Umgebungsvariable; null nur, wenn sie gar nicht gesetzt ist. */
    private static function umgebung(string $name): ?string
    {
        $wert = getenv($name);
        return is_string($wert) ? $wert : null;
    }

    /** Die Umgebungsvariable, wenn gesetzt (auch leer); sonst der erste nicht leere weitere Wert. */
    private static function erster(?string $umgebung, string ...$weitere): string
    {
        if ($umgebung !== null) {
            return $umgebung;
        }
        foreach ($weitere as $wert) {
            if ($wert !== '') {
                return $wert;
            }
        }
        return '';
    }

    /** @param array<mixed> $daten */
    private static function feld(array $daten, string $name): string
    {
        $wert = $daten[$name] ?? '';
        return is_string($wert) ? $wert : '';
    }

    /**
     * Liest eine vom Deploy erzeugte PHP-Datei („return [ … ];“). Fehlt sie oder ist sie
     * beschädigt, gibt es ein leeres Feld. Der Ausgabepuffer stellt sicher, dass selbst eine
     * verstümmelte Datei (ohne „<?php“) ihren Inhalt nie an den Browser schickt.
     *
     * @return array<mixed>
     */
    private static function datei(string $pfad): array
    {
        if (!array_key_exists($pfad, self::$dateien)) {
            $inhalt = null;
            if (is_file($pfad)) {
                ob_start();
                try {
                    $inhalt = (static fn (string $p): mixed => include $p)($pfad);
                } catch (\Throwable) {
                    $inhalt = null;
                } finally {
                    ob_end_clean();
                }
            }
            self::$dateien[$pfad] = is_array($inhalt) ? $inhalt : [];
        }
        return self::$dateien[$pfad];
    }

    /**
     * Sucht in einer .env-Datei zeilenweise nach „NAME=wert“ und liefert nur diesen einen
     * Wert. Die Datei wird nicht als Ganzes eingelesen und nie in die Umgebung übernommen.
     */
    private static function ausEnvDatei(string $pfad, string $name): string
    {
        $merk = $pfad . "\0" . $name;
        if (!array_key_exists($merk, self::$envDateien)) {
            $wert = '';
            $datei = is_file($pfad) ? @fopen($pfad, 'r') : false;
            if ($datei !== false) {
                $muster = '/^\s*(?:export\s+)?' . preg_quote($name, '/') . '\s*=\s*(.*?)\s*$/';
                while (($zeile = fgets($datei, 4096)) !== false) {
                    if (preg_match($muster, $zeile, $m) === 1) {
                        $wert = $m[1];
                        if (strlen($wert) >= 2 && ($wert[0] === '"' || $wert[0] === "'") && $wert[strlen($wert) - 1] === $wert[0]) {
                            $wert = substr($wert, 1, -1);
                        }
                        break;
                    }
                }
                fclose($datei);
            }
            self::$envDateien[$merk] = $wert;
        }
        return self::$envDateien[$merk];
    }
}
