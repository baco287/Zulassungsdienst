<?php
/**
 * Admin-Bereich des KI-Assistenten: Login, Schutz der schreibenden Aufrufe sowie alle Auskünfte
 * und Aktionen, die die Endpunkte (index.php, daten.php, aktion.php, lauf.php) brauchen.
 *
 * LOGIN: derselbe Zugang wie das Analytics-Dashboard (HTTP-Basic-Auth, Zugang::admin()).
 * Fehlversuche werden je Anschluss gezählt – der Schlüssel ist ein HMAC der IP-Adresse (bei IPv6
 * des /64-Netzes, das ein Anschluss bekommt), die Adresse selbst wird nie gespeichert. Gezählt wird
 * VOR dem Vergleich (gleichzeitige Versuche kommen so nicht an der Grenze vorbei); ein richtiger
 * Login nimmt seine Zählung zurück. Sehr viele Fehlversuche über alle Adressen lösen nur eine
 * Störungs-Mail aus – eine Sperre für alle würde den Inhaber und den Zeitauftrag aussperren.
 *
 * SCHREIBENDE AUFRUFE: Der Browser sendet Basic-Auth von selbst mit, auch wenn eine fremde
 * Seite den Aufruf auslöst. Deshalb verlangt jede Aktion zusätzlich ein Token in der Kopfzeile
 * X-KZP-CSRF (nur die eigene Oberfläche kennt es) UND eine passende Herkunft (Origin/Referer).
 *
 * AUSGABE: nur JSON. Fehlermeldungen und Protokolle enthalten nie Mailinhalt oder Zugangsdaten;
 * auch die Ereignisse, die jede Aktion schreibt, nennen nur Nummern und Schlüsselwörter.
 *
 * Die Wörter der Oberfläche (Marken, Hinweise, Zustand) entstehen hier und nicht im Browser:
 * So lassen sie sich ohne Webserver prüfen (tests/assistent/teil-d-test.php), und admin.js
 * setzt alles nur noch als Text ein.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Admin
{
    /** Fehlversuche beim Login je Anschluss: höchstens 10 in 15 Minuten (wie beim Analytics-Dashboard). */
    private const LOGIN_VERSUCHE = 10;
    private const LOGIN_FENSTER_SEK = 900;

    /** Ab so vielen Fehlversuchen in einer Stunde über alle Anschlüsse: Störungs-Mail (höchstens eine in 12 Stunden). */
    private const LOGIN_ALARM_JE_STUNDE = 100;

    /** Mail-Fuß aus den Einstellungen: Ohne diese Pflichtangaben (Geschäftsbrief, § 35a GmbHG) wird er nicht gespeichert. */
    private const FUSS_PFLICHT = ['HRB' => 'Registernummer (HRB)', 'Geschäftsführer' => 'Geschäftsführer',
        'haftungsbeschränkt' => 'Rechtsform (haftungsbeschränkt)', 'Sitz' => 'Sitz der Gesellschaft'];

    /** So lange stehen Mails „beim Menschen“ (zu alt, zurückgeholt) noch unter „Zu erledigen“. */
    private const OFFEN_BEIM_MENSCHEN_TAGE = 7;

    /** Einträge je Seite der Liste. */
    public const SEITENGROESSE = 25;

    /** Größter JSON-Körper einer Aktion – ein Entwurf ist wenige Kilobyte groß. */
    public const MAX_KOERPER_BYTES = 200000;

    /** Längster Antworttext, den die Oberfläche annimmt (der Prüfer warnt schon ab 1.500 Zeichen). */
    public const MAX_TEXT_ZEICHEN = 10000;

    /** So lange kein Abruf: Der Zeitauftrag (alle 5 Minuten) läuft offenbar nicht. */
    private const ABRUF_UEBERFAELLIG_SEK = 1800;

    /**
     * Strenge Content-Security-Policy der Oberfläche. Steht auch in public/assistent/.htaccess;
     * index.php sendet sie zusätzlich selbst, falls mod_headers einmal fehlt.
     */
    public const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
        . "connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";

    /**
     * Einstellungen, die die Oberfläche ändern darf, mit Art und Grenzen. Alles andere
     * (Zählerstände des Postfachs, Sperre, Pause-Schalter) ist über „einstellung“ nicht erreichbar;
     * die Pause hat ihre eigene Aktion.
     */
    public const EINSTELLUNGEN = [
        // Höchstens 50 USD: Das Claude-Budget von 200 USD im Monat teilen sich mehrere Projekte.
        'limit_monat_usd'        => ['art' => 'betrag',   'min' => 0, 'max' => 50],
        'limit_tag_usd'          => ['art' => 'betrag',   'min' => 0, 'max' => 50],
        'limit_aufrufe_tag'      => ['art' => 'ganzzahl', 'min' => 0, 'max' => 2000],
        'limit_je_absender_tag'  => ['art' => 'ganzzahl', 'min' => 0, 'max' => 100],
        'eskalation_sonnet'      => ['art' => 'schalter'],
        'hinweis_mail'           => ['art' => 'schalter'],
        // Höchstens 90: Die Datenschutzerklärung (Abschnitt 3b) sagt „nach spätestens 90 Tagen gelöscht“.
        'aufbewahrung_text_tage' => ['art' => 'ganzzahl', 'min' => 7, 'max' => Speicher::AUFBEWAHRUNG_TEXT_HOECHSTENS_TAGE],
        'gruss'                  => ['art' => 'zeile',    'min' => 1, 'max' => 80],
        'absender_name'          => ['art' => 'zeile',    'min' => 1, 'max' => 120],
        'fuss'                   => ['art' => 'text',     'min' => 0, 'max' => 1500],
    ];

    /**
     * Gründe beim Verwerfen – daraus lernt später, wer die Regeln der KI nachschärft. Die
     * Oberfläche bekommt die Liste über daten.php?was=start; der letzte Eintrag ist vorgewählt.
     */
    public const VERWERF_GRUENDE = [
        'keine_antwort'        => 'Keine Antwort nötig',
        'falscher_preis'       => 'Falscher Preis',
        'falsche_auskunft'     => 'Falsche Auskunft',
        'ton'                  => 'Ton passt nicht',
        'unnoetige_rueckfrage' => 'Unnötige Rückfrage',
        'anderes'              => 'Anderes',
    ];

    /**
     * Regel-Kategorien, deren Text der Kern aus Datensparsamkeit gar nicht speichert (wie
     * Kern::OHNE_TEXT). Für sie gibt es auch keinen Entwurf auf Knopfdruck.
     */
    private const OHNE_TEXT = ['formular', 'eigene'];

    /**
     * So lange gilt ein Entwurf im Stand „sendet“ als gerade im Versand (Kern::sende belegt die
     * Nachricht 120 Sekunden). Ist die Belegung abgelaufen und der Entwurf steht noch auf
     * „sendet“, ist der Versand unterwegs abgebrochen – also unklar (Bauplan 7.3).
     */
    private const SENDET_SEK = 120;

    public const REGEL_ARTEN = [
        'ignorieren'   => 'Ignorieren (kein Entwurf)',
        'immer_mensch' => 'Immer selbst beantworten',
    ];

    private const ANLIEGEN_NAMEN = [
        'neuzulassung'        => 'Neuzulassung',
        'ummeldung'           => 'Ummeldung',
        'abmeldung'           => 'Abmeldung',
        'halterwechsel'       => 'Halterwechsel',
        'wiederzulassung'     => 'Wiederzulassung',
        'adressaenderung'     => 'Adressänderung',
        'kurzzeitkennzeichen' => 'Kurzzeitkennzeichen',
        'saisonkennzeichen'   => 'Saisonkennzeichen',
        'wunschkennzeichen'   => 'Wunschkennzeichen',
        'ersatz_dokumente'    => 'Ersatzdokumente',
        'unterlagen'          => 'Unterlagen',
        'preis'               => 'Preisfrage',
        'bearbeitungszeit'    => 'Bearbeitungszeit',
        'auftragsstatus'      => 'Stand eines Auftrags',
        'versand'             => 'Versand',
        'beschwerde'          => 'Beschwerde',
        'gewerbe'             => 'Gewerbe',
        'allgemein'           => 'Allgemeine Frage',
        'kein_kundenanliegen' => 'Kein Kundenanliegen',
    ];

    /** Kategorien der Regelstufe (Bauplan 4.7 und 7.4) in Worten für die Liste. */
    private const KATEGORIE_NAMEN = [
        'formular'      => 'Auftrag über die Website',
        'eigene'        => 'Eigene Mail',
        'unzustellbar'  => 'Unzustellbar-Meldung',
        'automatisch'   => 'Automatische Antwort',
        'newsletter'    => 'Newsletter oder Werbung',
        'absenderregel' => 'Absenderregel: ignorieren',
        'mensch'        => 'Absenderregel: immer selbst',
        'beantwortet'   => 'Schon beantwortet',
        'nur_anhang'    => 'Nur Anhang, kaum Text',
        'kurz'          => 'Kurze Antwort ohne Frage',
        'kein_absender' => 'Ohne Absenderadresse',
        'schleife'      => 'Sehr viele Mails in kurzer Zeit',
        'kopie'         => 'Nur in Kopie erhalten',
        'spam'          => 'Spam',
        'zu_alt'        => 'Älter als 24 Stunden',
    ];

    /** Warum eine Nachricht auf die KI wartet (status_grund bei wartet_ki): [Marke, Satz]. */
    private const WARTE_GRUENDE = [
        ''                => ['Wartet auf die KI', 'Der Entwurf entsteht beim nächsten Abruf, meist innerhalb von fünf Minuten.'],
        'pausiert'        => ['Wartet – KI pausiert', 'Die KI ist pausiert. Wird sie innerhalb von 24 Stunden nach Eingang der Mail eingeschaltet, entsteht der Entwurf; danach bitte selbst antworten.'],
        'limit_tag'       => ['Wartet – Tageslimit', 'Das Tageslimit ist erreicht. Morgen geht es von selbst weiter – höchstens bis 24 Stunden nach Eingang, danach bitte selbst antworten.'],
        'limit_monat'     => ['Wartet – Monatslimit', 'Das Monatslimit ist erreicht. Eine Mail wartet höchstens 24 Stunden auf die KI, danach bitte selbst antworten.'],
        'limit_aufrufe'   => ['Wartet – Tagesgrenze', 'Die Tagesgrenze der KI-Aufrufe ist erreicht. Morgen geht es von selbst weiter – höchstens bis 24 Stunden nach Eingang, danach bitte selbst antworten.'],
        'limit_absender'  => ['Wartet – Grenze je Absender', 'Für diesen Absender ist die Tagesgrenze der KI-Aufrufe erreicht. Nach 24 Stunden bitte selbst antworten.'],
        'sperre'          => ['Wartet – KI gesperrt', 'Die KI ist nach einem Fehler vorübergehend gesperrt. Eine Mail wartet höchstens 24 Stunden, danach bitte selbst antworten.'],
        'kein_schluessel' => ['Wartet – Schlüssel fehlt', 'Der Schlüssel für die KI fehlt. Bitte den Selbsttest unter Einstellungen starten.'],
        'stark'           => ['Wird überarbeitet', 'Ein schwieriger Fall: Das stärkere Modell überarbeitet den Entwurf beim nächsten Abruf.'],
    ];

    private const KANAL_NAMEN = ['email' => 'E-Mail', 'whatsapp' => 'WhatsApp'];
    private const ZWECK_NAMEN = ['entwurf' => 'Entwurf', 'eskalation' => 'Stärkeres Modell', 'test' => 'Test'];
    private const MODELL_NAMEN = [
        'claude-haiku-5-5'  => 'Claude Haiku 5.5 (Standard)',
        'claude-sonnet-5-5' => 'Claude Sonnet 5.5 (stärker)',
    ];

    private const UNKLAR_SATZ = 'Bitte im Gesendet-Ordner nachsehen, ob die Mail rausging. '
        . 'Nicht noch einmal senden, bevor das klar ist.';

    /** Gründe beim Stand „mensch“ (status_grund, gesetzt vom Kern), in Worten: [Marke, Titel, Satz]. */
    private const MENSCH_GRUENDE = [
        'zu_alt'           => ['Zu alt für die KI – selbst antworten', 'Zu alt für die KI',
            'Diese Mail lag länger als 24 Stunden. So alte Mails holt die KI nicht nach – bitte im Mailprogramm selbst antworten.'],
        'beantwortet'      => ['Im Mailprogramm beantwortet', 'Im Mailprogramm beantwortet',
            'Auf diese Mail wurde aus dem Postfach geantwortet. Ein Entwurf ist damit überholt.'],
        'absenderregel'    => ['Absenderregel: immer selbst', 'Immer selbst beantworten',
            'Für diesen Absender gilt die Regel „Immer selbst beantworten“ (etwa nach einem Widerspruch). Seine Mails gehen nicht an die KI, auch nicht auf Knopfdruck.'],
        'vorgaenger_offen' => ['Noch offen – bitte beantworten', 'Noch nicht beantwortet',
            'Diese Mail war mit einer neueren desselben Absenders zusammengefasst. Die neuere wurde verworfen oder wird selbst beantwortet – diese hier ist damit noch offen. Bitte im Mailprogramm antworten.'],
        'uebernommen'      => ['Sie antworten selbst', 'Sie antworten selbst',
            'Jemand hat „Ich antworte selbst“ gewählt. Die Antwort entsteht im Mailprogramm.'],
        'versand_geklaert' => ['Versand geklärt', 'Versand geklärt',
            'Der unklare Versand wurde von Hand geprüft und abgehakt.'],
    ];

    private const BIBLIOTHEKEN_FEHLEN = 'Bibliotheken fehlen. Die Website muss neu veröffentlicht werden – '
        . 'bis dahin kann der Assistent nichts abrufen, entwerfen oder senden.';

    // -- Login ----------------------------------------------------------------

    /**
     * Gibt den Benutzernamen zurück oder beendet die Anfrage (401, 429 oder 503).
     * Die Antworten sind schlichter Text: Sie erscheinen auch dann lesbar, wenn noch gar
     * keine Oberfläche geladen ist.
     */
    public static function verlangeLogin(): string
    {
        header('X-Robots-Tag: noindex, nofollow');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');

        $zugang = Zugang::admin();
        if (!is_array($zugang) || !is_string($zugang['user'] ?? null) || !is_string($zugang['pass'] ?? null)
            || $zugang['user'] === '' || strlen($zugang['pass']) < 10) {
            self::text(503, "Zugang noch nicht eingerichtet.\n"
                . 'Der KI-Assistent nutzt den Login des Analytics-Dashboards. Bitte die GitHub-Secrets '
                . 'ANALYTICS_USER und ANALYTICS_PASSWORD (mind. 10 Zeichen) anlegen und neu veröffentlichen.');
        }

        // Ohne Zähler keine Drosselung – dann lieber gar kein Login als beliebig viele Versuche.
        $schluessel = self::anschlussSchluessel((string) ($_SERVER['REMOTE_ADDR'] ?? 'unbekannt'));
        [$nutzer, $passwort] = self::basicZugang();
        try {
            // Erst reservieren, dann vergleichen: Der Zähler steigt in einem Schritt, bevor das
            // Passwort geprüft wird. Parallel abgeschickte Versuche zählen so alle mit.
            $stand = $nutzer === null
                ? Speicher::zaehlerstand($schluessel, self::LOGIN_FENSTER_SEK)
                : Speicher::zaehle($schluessel, self::LOGIN_FENSTER_SEK) - 1;
        } catch (\Throwable $e) {
            self::protokolliere($e);
            self::text(503, 'Der Speicher des Assistenten ist gerade nicht erreichbar. Bitte in ein paar Minuten erneut versuchen.');
        }
        if ($stand >= self::LOGIN_VERSUCHE) {
            // Ohne Vergleich: Auch das richtige Passwort hilft in diesem Fenster nicht weiter.
            self::text(429, 'Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.');
        }

        if ($nutzer !== null && self::loginPasst($zugang, $nutzer, $passwort)) {
            try {
                Speicher::nimmZurueck($schluessel);
            } catch (\Throwable $e) {
                self::protokolliere($e);
            }
            return $nutzer;
        }
        if ($nutzer !== null) {
            self::meldeFehlversuch();
        }
        header('WWW-Authenticate: Basic realm="KFZ-Zulassungsprofis Assistent", charset="UTF-8"');
        self::text(401, 'Login erforderlich');
    }

    /**
     * Zählt einen Fehlversuch über alle Anschlüsse. Viele in einer Stunde (ein verteilter Rateversuch)
     * ergeben eine Störungs-Mail – gesperrt wird dabei niemand.
     */
    private static function meldeFehlversuch(): void
    {
        try {
            if (Speicher::zaehle('login:alle', 3600) === self::LOGIN_ALARM_JE_STUNDE + 1 && Umgebung::$bibliotheken) {
                Kern::stoerung('login');
            }
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }
    }

    /** true, wenn Benutzer und Passwort stimmen. Beide Vergleiche laufen immer, in gleicher Zeit. */
    public static function loginPasst(array $zugang, ?string $nutzer, ?string $passwort): bool
    {
        $nutzerOk = self::gleich((string) ($zugang['user'] ?? ''), (string) $nutzer);
        $passwortOk = self::gleich((string) ($zugang['pass'] ?? ''), (string) $passwort);
        return $nutzer !== null && $nutzer !== '' && $nutzerOk && $passwortOk;
    }

    /**
     * Schlüssel des Fehlversuch-Zählers für einen Anschluss. HMAC mit dem Geheimwert der
     * Installation: Aus dem gespeicherten Wert lässt sich die IP-Adresse nicht zurückrechnen.
     * IPv6 zählt je /64-Netz (so viel bekommt ein einzelner Anschluss; sonst hätte jede der
     * Milliarden Adressen darin eigene zehn Versuche), IPv4 je Adresse.
     */
    public static function anschlussSchluessel(string $ip): string
    {
        return 'login:' . substr(hash_hmac('sha256', 'login|' . self::anschluss($ip), Umgebung::geheimnis()), 0, 40);
    }

    /** Der Anschluss zu einer IP-Adresse: IPv4 unverändert, IPv6 als /64-Netz (IPv4 in IPv6 als IPv4). */
    public static function anschluss(string $ip): string
    {
        $bin = @inet_pton(trim($ip));
        if (!is_string($bin) || strlen($bin) !== 16) {
            return trim($ip);
        }
        if (str_starts_with($bin, str_repeat("\0", 10) . "\xff\xff")) {
            return (string) inet_ntop(substr($bin, 12));
        }
        return bin2hex(substr($bin, 0, 8)) . '/64';
    }

    /** Vergleich ohne Rückschluss auf Inhalt oder Länge (hash_equals über zwei HMACs gleicher Länge). */
    private static function gleich(string $soll, string $ist): bool
    {
        $einmal = random_bytes(32);
        return hash_equals(hash_hmac('sha256', $soll, $einmal, true), hash_hmac('sha256', $ist, $einmal, true));
    }

    /** Benutzer und Passwort aus dem Basic-Auth-Kopf; auch, wenn PHP als FastCGI läuft. */
    private static function basicZugang(): array
    {
        if (isset($_SERVER['PHP_AUTH_USER'])) {
            return [(string) $_SERVER['PHP_AUTH_USER'], (string) ($_SERVER['PHP_AUTH_PW'] ?? '')];
        }
        $kopf = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (stripos($kopf, 'basic ') === 0) {
            $klar = base64_decode(substr($kopf, 6), true);
            if (is_string($klar) && str_contains($klar, ':')) {
                [$nutzer, $passwort] = explode(':', $klar, 2);
                return [$nutzer, $passwort];
            }
        }
        return [null, null];
    }

    // -- Schutz der schreibenden Aufrufe --------------------------------------

    /** Token für die Kopfzeile X-KZP-CSRF: gilt für diesen Benutzer, heute und morgen noch. */
    public static function csrfToken(string $nutzer): string
    {
        return self::csrfTokenAm($nutzer, Umgebung::jetzt());
    }

    /** Token, wie es zum Zeitpunkt $zeit ausgegeben würde (HMAC über Geheimwert, Benutzer und Tag). */
    public static function csrfTokenAm(string $nutzer, int $zeit): string
    {
        return hash_hmac('sha256', 'csrf|' . $nutzer . '|' . self::tag($zeit, 0), Umgebung::geheimnis());
    }

    /**
     * Prüft ein Token gegen das von heute und das von gestern – eine über Nacht offene Seite
     * arbeitet am Morgen weiter, ein älteres Token nicht mehr.
     */
    public static function csrfGueltig(string $nutzer, string $token, ?int $jetzt = null): bool
    {
        if (preg_match('/^[a-f0-9]{64}$/D', $token) !== 1) {
            return false;
        }
        $jetzt ??= Umgebung::jetzt();
        $geheim = Umgebung::geheimnis();
        $heute = hash_equals(hash_hmac('sha256', 'csrf|' . $nutzer . '|' . self::tag($jetzt, 0), $geheim), $token);
        $gestern = hash_equals(hash_hmac('sha256', 'csrf|' . $nutzer . '|' . self::tag($jetzt, -1), $geheim), $token);
        return $heute || $gestern;
    }

    /**
     * true, wenn der Aufruf von der eigenen Seite kommt: Origin (ersatzweise Referer) nennt
     * dasselbe Schema-Host-Paar, unter dem der Server gerade angesprochen wird. Fehlen beide
     * Angaben, gilt der Aufruf als fremd – ein Browser sendet bei POST mindestens eine davon.
     * Ohne TLS nur in der lokalen Entwicklung.
     */
    public static function herkunftPasst(string $origin, string $referer, string $host, bool $lokal): bool
    {
        $quelle = trim($origin) !== '' ? trim($origin) : trim($referer);
        if ($quelle === '' || strtolower($quelle) === 'null') {
            return false;
        }
        $teile = parse_url($quelle);
        if (!is_array($teile) || !isset($teile['scheme'], $teile['host'])) {
            return false;
        }
        $schema = strtolower((string) $teile['scheme']);
        if ($schema !== 'https' && !($lokal && $schema === 'http')) {
            return false;
        }
        $standardPort = $schema === 'https' ? 443 : 80;
        $fremd = strtolower((string) $teile['host']);
        if (isset($teile['port']) && (int) $teile['port'] !== $standardPort) {
            $fremd .= ':' . (int) $teile['port'];
        }
        $eigen = strtolower(trim($host));
        if (str_ends_with($eigen, ':' . $standardPort)) {
            $eigen = substr($eigen, 0, -strlen(':' . $standardPort));
        }
        return $eigen !== '' && hash_equals($eigen, $fremd);
    }

    /**
     * Lesende Aufrufe (daten.php, lauf.php) brauchen kein Token, sollen aber nicht von einer
     * fremden Seite aus angestoßen werden können: Der Browser sendet den gemerkten Login auch
     * dann mit, wenn eine fremde Seite ein Bild oder Skript von hier lädt – so ließen sich sonst
     * Abrufe oder der Selbsttest (Anmeldung an Postfach und Mailserver) auslösen. Moderne
     * Browser sagen mit Sec-Fetch-Site, woher ein Aufruf kommt. Ohne die Kopfzeile (Zeitauftrag
     * mit curl, ältere Browser) und beim Aufruf aus der Adresszeile („none“) bleibt es beim Login.
     */
    public static function pruefeLeseHerkunft(): void
    {
        $quelle = strtolower(trim((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')));
        if ($quelle === 'cross-site' || $quelle === 'same-site') {
            self::json(['ok' => false, 'fehler' => 'Dieser Aufruf kam nicht von dieser Seite.'], 403);
        }
    }

    /** Beendet die Anfrage mit 403, wenn Token oder Herkunft nicht stimmen. */
    public static function pruefeCsrf(string $nutzer): void
    {
        $token = (string) ($_SERVER['HTTP_X_KZP_CSRF'] ?? '');
        $herkunft = self::herkunftPasst(
            (string) ($_SERVER['HTTP_ORIGIN'] ?? ''),
            (string) ($_SERVER['HTTP_REFERER'] ?? ''),
            (string) ($_SERVER['HTTP_HOST'] ?? ''),
            Umgebung::lokal()
        );
        // Neuere Browser sagen zusätzlich selbst, ob der Aufruf von derselben Seite stammt.
        $fetchSite = strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin'));
        if (!$herkunft || $fetchSite !== 'same-origin' || !self::csrfGueltig($nutzer, $token)) {
            self::json([
                'ok' => false,
                'neu_laden' => true,
                'fehler' => 'Die Seite war zu lange offen oder der Aufruf kam nicht von dieser Seite. Bitte die Seite neu laden.',
            ], 403);
        }
    }

    // -- Ausgabe ---------------------------------------------------------------

    /** Einzige Ausgabe der Endpunkte: JSON, nie zwischengespeichert, nie als etwas anderes gedeutet. */
    public static function json(mixed $daten, int $status = 200): never
    {
        $json = json_encode(
            $daten,
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_HEX_TAG
        );
        if ($json === false) {
            $status = 500;
            $json = '{"ok":false,"fehler":"Die Antwort konnte nicht erstellt werden."}';
        }
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
            header('X-Content-Type-Options: nosniff');
            header('X-Robots-Tag: noindex, nofollow');
        }
        echo $json;
        exit;
    }

    /** Kopfzeilen der Oberfläche (index.php), zusätzlich zu denen aus .htaccess. */
    public static function seitenKopf(): void
    {
        header('Content-Type: text/html; charset=utf-8');
        header('Cache-Control: no-store');
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Content-Security-Policy: ' . self::CSP);
    }

    /** JSON-Körper einer POST-Anfrage als Feld; null bei falschem Typ, Übergröße oder Unsinn. */
    public static function leseJsonKoerper(): ?array
    {
        // Nur application/json: Ein Formular einer fremden Seite kann diesen Typ nicht senden.
        $typ = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? ''));
        if (!str_starts_with($typ, 'application/json')) {
            return null;
        }
        $roh = file_get_contents('php://input', false, null, 0, self::MAX_KOERPER_BYTES + 1);
        if (!is_string($roh) || $roh === '' || strlen($roh) > self::MAX_KOERPER_BYTES) {
            return null;
        }
        try {
            $daten = json_decode($roh, true, 8, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        return is_array($daten) ? $daten : null;
    }

    /**
     * Fehler ins Server-Protokoll: nur Art und Fundstelle. Die Meldung selbst bleibt draußen,
     * weil sie bei Mail-Bibliotheken Teile einer Nachricht enthalten kann. Ausnahme: Meldungen
     * der Datenbank – sie nennen Tabellen und Spalten, keine Werte.
     */
    public static function protokolliere(\Throwable $e): void
    {
        $zeile = 'KI-Assistent (Admin): ' . get_class($e) . ' in ' . basename($e->getFile()) . ':' . $e->getLine();
        if ($e instanceof \PDOException) {
            $zeile .= ' – ' . mb_substr($e->getMessage(), 0, 200);
        }
        error_log($zeile);
    }

    /** Schlichte Textantwort der Login-Stufe. */
    private static function text(int $status, string $text): never
    {
        http_response_code($status);
        header('Content-Type: text/plain; charset=utf-8');
        echo $text;
        exit;
    }

    // -- Eingaben prüfen -------------------------------------------------------

    /**
     * Prüft eine Einstellung gegen die Erlaubnisliste und ihre Grenzen.
     * Gibt den bereinigten Wert zurück (so wird er gespeichert) oder null, wenn der Schlüssel
     * nicht erlaubt oder der Wert unzulässig ist.
     */
    public static function pruefeEinstellung(string $schluessel, string $wert): ?string
    {
        $regel = self::EINSTELLUNGEN[$schluessel] ?? null;
        if ($regel === null || preg_match('//u', $wert) !== 1) {
            return null;
        }
        switch ($regel['art']) {
            case 'betrag':
                // Dollar mit höchstens zwei Nachkommastellen; Komma oder Punkt. Am Rand nur
                // Leerzeichen kürzen (ein Zeilenumbruch hat in einem Zahlenfeld nichts zu suchen),
                // und „$“ mit D: sonst ließe der Ausdruck einen Umbruch am Ende durch.
                $w = trim($wert, " \t");
                if (preg_match('/^\d{1,3}(?:[.,]\d{1,2})?$/D', $w) !== 1) {
                    return null;
                }
                $zahl = (float) str_replace(',', '.', $w);
                if ($zahl < $regel['min'] || $zahl > $regel['max']) {
                    return null;
                }
                return rtrim(rtrim(number_format($zahl, 2, '.', ''), '0'), '.');

            case 'ganzzahl':
                $w = trim($wert, " \t");
                if (preg_match('/^\d{1,6}$/D', $w) !== 1) {
                    return null;
                }
                $zahl = (int) $w;
                return ($zahl < $regel['min'] || $zahl > $regel['max']) ? null : (string) $zahl;

            case 'schalter':
                return ($wert === '0' || $wert === '1') ? $wert : null;

            case 'zeile':
                $w = trim((string) preg_replace('/[\p{C}\s]+/u', ' ', $wert));
                $laenge = mb_strlen($w);
                return ($laenge < $regel['min'] || $laenge > $regel['max']) ? null : $w;

            case 'text':
                // Mehrzeilig: Zeilenenden vereinheitlichen, Steuerzeichen entfernen, Ränder kürzen.
                $w = str_replace(["\r\n", "\r"], "\n", $wert);
                $w = (string) preg_replace('/[^\P{C}\n]+/u', ' ', $w);
                $w = (string) preg_replace('/[ \t]+\n/', "\n", $w);
                $w = trim($w, "\n ");
                $laenge = mb_strlen($w);
                if ($laenge < $regel['min'] || $laenge > $regel['max'] || substr_count($w, "\n") > 24) {
                    return null;
                }
                // Ein eigener Mail-Fuß ersetzt den aus der Wissensbasis ganz – ohne die Pflichtangaben
                // gingen alle Kundenmails ohne sie hinaus. Leer bleibt erlaubt (dann gilt der Standard).
                if ($schluessel === 'fuss' && $w !== '' && self::fehlendePflichtangaben($w) !== []) {
                    return null;
                }
                return $w;
        }
        return null;
    }

    /** Satz für die Oberfläche, wenn pruefeEinstellung() einen Wert ablehnt. */
    public static function einstellungHinweis(string $schluessel): string
    {
        $regel = self::EINSTELLUNGEN[$schluessel] ?? null;
        if ($regel === null) {
            return 'Diese Einstellung lässt sich hier nicht ändern.';
        }
        return match ($regel['art']) {
            'betrag'   => 'Bitte einen Betrag von ' . $regel['min'] . ' bis ' . $regel['max'] . ' eingeben, höchstens zwei Stellen nach dem Komma.',
            'ganzzahl' => 'Bitte eine ganze Zahl von ' . $regel['min'] . ' bis ' . $regel['max'] . ' eingeben.',
            'schalter' => 'Bitte ein- oder ausschalten.',
            'zeile'    => 'Bitte einen Text mit ' . $regel['min'] . ' bis ' . $regel['max'] . ' Zeichen eingeben (eine Zeile).',
            default    => $schluessel === 'fuss'
                ? 'Die Fußzeile braucht alle Pflichtangaben: ' . implode(', ', array_values(self::FUSS_PFLICHT))
                    . ' – oder leer lassen (dann gelten die Angaben der Website). Höchstens ' . $regel['max'] . ' Zeichen und 25 Zeilen.'
                : 'Der Text ist zu lang (höchstens ' . $regel['max'] . ' Zeichen und 25 Zeilen).',
        };
    }

    /**
     * Pflichtangaben, die in einem eigenen Mail-Fuß fehlen (in Worten). Rechtlich nur eingeschätzt.
     *
     * @return string[]
     */
    public static function fehlendePflichtangaben(string $fuss): array
    {
        $fehlt = [];
        foreach (self::FUSS_PFLICHT as $wort => $name) {
            if (mb_stripos($fuss, $wort) === false) {
                $fehlt[] = $name;
            }
        }
        return $fehlt;
    }

    /** Vollständige E-Mail-Adresse in Kleinschreibung oder null. */
    public static function pruefeAdresse(string $adresse): ?string
    {
        $a = strtolower(trim($adresse));
        if ($a === '' || strlen($a) > 254 || filter_var($a, FILTER_VALIDATE_EMAIL) === false) {
            return null;
        }
        return $a;
    }

    /** Muster einer Absenderregel: ganze Adresse oder „@domain“, in Kleinschreibung; sonst null. */
    public static function pruefeMuster(string $muster): ?string
    {
        $m = strtolower(trim($muster));
        if (str_starts_with($m, '@')) {
            $domain = substr($m, 1);
            $ok = strlen($domain) <= 253
                && preg_match('/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/D', $domain) === 1;
            return $ok ? '@' . $domain : null;
        }
        return self::pruefeAdresse($m);
    }

    /** Name der Person am Bildschirm (Bauplan 7.8): nur Buchstaben, Ziffern, Leerzeichen, Punkt, Bindestrich. */
    public static function bearbeiter(mixed $roh): string
    {
        if (!is_string($roh)) {
            return '';
        }
        $name = preg_replace('/[^\p{L}\p{N} .\'-]+/u', ' ', $roh);
        $name = trim((string) preg_replace('/\s+/u', ' ', (string) $name));
        return mb_substr($name, 0, 40);
    }

    /** So steht die handelnde Person in Ereignissen und am Entwurf: „<login>:<bearbeiter>“. */
    public static function kennung(string $login, string $bearbeiter): string
    {
        return $bearbeiter === '' ? $login : $login . ':' . $bearbeiter;
    }

    /** Positive Nummer aus JSON oder Adresszeile; 0, wenn es keine ist. */
    public static function id(mixed $wert): int
    {
        if (is_int($wert)) {
            return $wert > 0 ? $wert : 0;
        }
        if (is_string($wert) && preg_match('/^[1-9]\d{0,14}$/D', $wert) === 1) {
            return (int) $wert;
        }
        return 0;
    }

    // -- Auskünfte (daten.php) -------------------------------------------------

    /** Kopfbereich: Zustand in einem Satz, Zähler, Verbrauch gegen die Limits, CSRF-Token. */
    public static function start(string $login): array
    {
        $jetzt = Umgebung::jetzt();
        $db = Speicher::db();
        // Die Löschfrist soll auch dann gelten, wenn der Zeitauftrag einmal ausfällt: Beim Öffnen
        // des Admin-Bereichs läuft der Löschlauf mit (wirkt höchstens einmal in 24 Stunden).
        try {
            Speicher::aufraeumen();
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }

        $zaehler = [];
        $st = $db->prepare('SELECT status, COUNT(*) AS anzahl FROM nachricht GROUP BY status');
        $st->execute();
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $zeile) {
            $zaehler[(string) $zeile['status']] = (int) $zeile['anzahl'];
        }
        // „Entwürfe warten“: offene Entwürfe – ohne die, die gerade gesendet werden oder deren
        // Versand unklar ist (die stehen im roten Hinweis).
        $st = $db->prepare("SELECT COUNT(*) FROM nachricht n WHERE n.status = 'entwurf'
                            AND NOT EXISTS (SELECT 1 FROM entwurf w WHERE w.nachricht_id = n.id AND w.status IN ('sendet', 'unklar'))");
        $st->execute();
        $wartend = (int) $st->fetchColumn();
        // Unklarer Versand: vom Kern so markiert – oder ein Versand, der unterwegs abgebrochen ist
        // (Entwurf steht noch auf „sendet“, die Belegung ist abgelaufen).
        $st = $db->prepare("SELECT COUNT(*) FROM nachricht n
                            WHERE (n.status = 'mensch' AND n.status_grund = 'versand_unklar')
                               OR (n.status = 'entwurf' AND COALESCE(n.in_arbeit_bis, 0) <= ?
                                   AND EXISTS (SELECT 1 FROM entwurf w WHERE w.nachricht_id = n.id AND w.status = 'sendet'))");
        $st->execute([$jetzt]);
        $unklar = (int) $st->fetchColumn();

        $st = $db->prepare('SELECT start, ende, ausloeser, abgerufen, ohne_ki, mit_ki, entwuerfe, fehler, hinweis
                            FROM lauf ORDER BY id DESC LIMIT 1');
        $st->execute();
        $lauf = $st->fetch(\PDO::FETCH_ASSOC);
        $letzterLauf = null;
        $letzterAbruf = 0;
        if (is_array($lauf)) {
            $letzterAbruf = max((int) ($lauf['ende'] ?? 0), (int) ($lauf['start'] ?? 0));
            $letzterLauf = [
                'zeit'      => $letzterAbruf,
                'ausloeser' => (string) ($lauf['ausloeser'] ?? ''),
                'abgerufen' => (int) ($lauf['abgerufen'] ?? 0),
                'ohne_ki'   => (int) ($lauf['ohne_ki'] ?? 0),
                'mit_ki'    => (int) ($lauf['mit_ki'] ?? 0),
                'entwuerfe' => (int) ($lauf['entwuerfe'] ?? 0),
                'fehler'    => (int) ($lauf['fehler'] ?? 0),
                'hinweis'   => self::einzeilig((string) ($lauf['hinweis'] ?? ''), 200),
            ];
        }

        // Limits, Sperre und Not-Aus so, wie Budget::darfAufrufen sie sieht – dieselben Zahlen,
        // dieselbe Deutung unlesbarer Werte.
        $stand = Budget::stand();
        $limits = is_array($stand['limits'] ?? null) ? $stand['limits'] : [];
        $sperreRoh = is_array($stand['sperre'] ?? null) ? $stand['sperre'] : [];
        $sperre = [
            'aktiv' => ($sperreRoh['aktiv'] ?? false) === true,
            'bis'   => (int) ($sperreRoh['bis'] ?? 0),
            'grund' => self::einzeilig((string) ($sperreRoh['grund'] ?? ''), 200),
        ];
        $kiAktiv = ($stand['ki_aktiv'] ?? false) === true;
        $stop = ($stand['stop_datei'] ?? false) === true;
        $verbrauch = [
            'heute_usd'         => round((float) ($stand['heute_usd'] ?? 0), 6),
            'monat_usd'         => round((float) ($stand['monat_usd'] ?? 0), 6),
            'aufrufe_heute'     => (int) ($stand['aufrufe_heute'] ?? 0),
            'limit_tag_usd'     => round((float) ($limits['limit_tag_usd'] ?? 0), 6),
            'limit_monat_usd'   => round((float) ($limits['limit_monat_usd'] ?? 0), 6),
            'limit_aufrufe_tag' => (int) ($limits['limit_aufrufe_tag'] ?? 0),
        ];

        $wissenStand = '';
        $wissenDa = false;
        $wissenVeraltet = false;
        try {
            $wissen = Wissen::laden();
            $wissenDa = is_array($wissen);
            $wissenStand = $wissenDa ? (string) ($wissen['stand'] ?? '') : '';
            $wissenVeraltet = $wissenDa && Wissen::veraltet($wissen);
        } catch (\Throwable $e) {
            self::protokolliere($e);
        }

        $zustand = self::zustand([
            'jetzt'           => $jetzt,
            'bibliotheken'    => Umgebung::$bibliotheken,
            'wissen'          => $wissenDa,
            'wissen_veraltet' => $wissenVeraltet,
            'stop'            => $stop,
            'ki_aktiv'        => $kiAktiv,
            'sperre_bis'      => $sperre['aktiv'] ? $sperre['bis'] : 0,
            'sperre_grund'    => $sperre['grund'],
            'schluessel'      => Zugang::claude() !== null,
            'letzter_abruf'   => $letzterAbruf,
            'letzter_fehler'  => $letzterLauf['fehler'] ?? 0,
            'letzter_hinweis' => $letzterLauf['hinweis'] ?? '',
        ] + $verbrauch);

        $gruende = [];
        foreach (self::VERWERF_GRUENDE as $schluessel => $name) {
            $gruende[] = ['schluessel' => $schluessel, 'name' => $name];
        }

        return [
            'ok'              => true,
            'jetzt'           => $jetzt,
            'csrf'            => self::csrfToken($login),
            'zustand'         => $zustand,
            'ki_aktiv'        => $kiAktiv,
            'not_aus'         => $stop,
            'sperre'          => $sperre,
            'bibliotheken'    => Umgebung::$bibliotheken,
            'letzter_lauf'    => $letzterLauf,
            // Leer als {} statt [] – die Oberfläche liest Zähler nach Status.
            'zaehler'         => $zaehler === [] ? new \stdClass() : $zaehler,
            'wartend'         => $wartend,
            'versand_unklar'  => $unklar,
            'verbrauch'       => $verbrauch,
            'budget'          => $stand,
            'verwerf_gruende' => $gruende,
            'prompt_version'  => Prompt::VERSION,
            'wissen_stand'    => $wissenStand,
        ];
    }

    /**
     * Der eine Satz im Kopf der Oberfläche samt Farbe. Reihenfolge wie Budget::darfAufrufen –
     * genannt wird der erste Grund, aus dem die KI gerade nicht arbeitet.
     * art: aktiv (grün) · pausiert (grau) · gesperrt (rot) · achtung (gelb).
     */
    public static function zustand(array $lage): array
    {
        $jetzt = (int) ($lage['jetzt'] ?? 0);
        $letzter = (int) ($lage['letzter_abruf'] ?? 0);
        $abruf = $letzter > 0 ? 'letzter Abruf ' . self::vorZeit($jetzt - $letzter) : 'noch kein Abruf';
        // Ein Problem beim letzten Abruf (Postfach nicht erreichbar, interner Fehler) in einem Satz.
        $problem = '';
        if ((int) ($lage['letzter_fehler'] ?? 0) > 0) {
            $hinweis = rtrim(self::einzeilig((string) ($lage['letzter_hinweis'] ?? ''), 160), '.');
            $problem = 'Beim letzten Abruf gab es ein Problem' . ($hinweis !== '' ? ': ' . $hinweis . '.' : '.');
        }

        if (($lage['bibliotheken'] ?? true) !== true) {
            return ['art' => 'gesperrt', 'text' => 'Störung: Programmteile fehlen',
                'zusatz' => 'Die Website muss neu veröffentlicht werden. Bis dahin entstehen keine Entwürfe.'];
        }
        if (($lage['wissen'] ?? true) !== true) {
            return ['art' => 'gesperrt', 'text' => 'Störung: Wissensbasis fehlt',
                'zusatz' => 'Ohne die Angaben der Website schreibt die KI nichts. Die Website muss neu veröffentlicht werden.'];
        }
        if (($lage['stop'] ?? false) === true) {
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: Not-Aus ist gesetzt',
                'zusatz' => 'Im Datenordner liegt die Datei STOP. Solange sie dort liegt, wird die KI nicht aufgerufen.'];
        }
        if (($lage['ki_aktiv'] ?? false) !== true) {
            return ['art' => 'pausiert', 'text' => 'KI pausiert',
                'zusatz' => trim('Neue Mails werden weiter eingelesen (' . $abruf . '). Es entstehen keine Entwürfe und keine Kosten. ' . $problem)];
        }
        if ((int) ($lage['sperre_bis'] ?? 0) > $jetzt) {
            $grund = trim((string) ($lage['sperre_grund'] ?? ''));
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: ' . ($grund !== '' ? $grund : 'Fehler beim KI-Anbieter'),
                'zusatz' => 'Die Sperre endet von selbst am ' . self::datum((int) $lage['sperre_bis']) . '. '
                    . 'Ist die Ursache schon behoben (etwa ein neuer Schlüssel oder ein höheres Limit bei Anthropic), lässt sie sich hier vorher aufheben.'];
        }
        if (($lage['schluessel'] ?? true) !== true) {
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: Schlüssel für die KI fehlt',
                'zusatz' => 'Bitte unter Einstellungen den Selbsttest starten.'];
        }
        if ((float) ($lage['monat_usd'] ?? 0) >= (float) ($lage['limit_monat_usd'] ?? 0)) {
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: Monatslimit erreicht',
                'zusatz' => 'Am Monatsersten geht es von selbst weiter. Das Limit steht unter Einstellungen.'];
        }
        if ((float) ($lage['heute_usd'] ?? 0) >= (float) ($lage['limit_tag_usd'] ?? 0)) {
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: Tageslimit erreicht',
                'zusatz' => 'Morgen geht es von selbst weiter. Das Limit steht unter Einstellungen.'];
        }
        if ((int) ($lage['aufrufe_heute'] ?? 0) >= (int) ($lage['limit_aufrufe_tag'] ?? 0)) {
            return ['art' => 'gesperrt', 'text' => 'Gesperrt: Tagesgrenze der KI-Aufrufe erreicht',
                'zusatz' => 'Morgen geht es von selbst weiter. Die Grenze steht unter Einstellungen.'];
        }
        if (($lage['wissen_veraltet'] ?? false) === true) {
            return ['art' => 'achtung', 'text' => 'KI aktiv – Wissensbasis veraltet',
                'zusatz' => 'Die Website wurde neu veröffentlicht, der Assistent aber nicht mit aktualisiert. Entwürfe mit Preisen werden abgewiesen, bis das Veröffentlichen vollständig klappt.'];
        }
        if ($letzter <= 0) {
            return ['art' => 'achtung', 'text' => 'KI aktiv – noch kein Abruf',
                'zusatz' => 'Der Abruf startet alle 5 Minuten von selbst. Unter Einstellungen geht es mit „Jetzt abrufen“ sofort.'];
        }
        if ($jetzt - $letzter > self::ABRUF_UEBERFAELLIG_SEK) {
            return ['art' => 'achtung', 'text' => 'KI aktiv, aber ' . $abruf,
                'zusatz' => trim('Der Abruf sollte alle 5 Minuten laufen. Bitte unter Einstellungen „Jetzt abrufen“ und den Selbsttest versuchen. ' . $problem)];
        }
        if ($problem !== '') {
            return ['art' => 'achtung', 'text' => 'KI aktiv – Problem beim letzten Abruf',
                'zusatz' => $problem . ' (' . self::grossAnfang($abruf) . '.) Der Selbsttest unter Einstellungen zeigt, woran es liegt.'];
        }
        return ['art' => 'aktiv', 'text' => 'KI aktiv – ' . $abruf, 'zusatz' => ''];
    }

    /** Liste des Posteingangs, neueste oben. filter: offen (zu erledigen) · alle · ohne_ki. */
    public static function liste(string $filter, int $seite): array
    {
        $filter = in_array($filter, ['offen', 'alle', 'ohne_ki'], true) ? $filter : 'offen';
        $seite = max(1, min(4000, $seite));
        // „Zu erledigen“: was auf den Menschen wartet oder gleich wartet. Dazu gehören auch
        // gescheiterte Entwürfe und ein unklarer Versand – beides darf nicht still verschwinden –
        // und Mails, die die KI nicht mehr übernimmt (zu alt) oder die nach dem Verwerfen ihrer
        // Folge-Mail wieder offen sind, eine Woche lang ab diesem Wechsel (danach nur noch unter „Alle“).
        $grenze = Umgebung::jetzt() - self::OFFEN_BEIM_MENSCHEN_TAGE * 86400;
        $wo = match ($filter) {
            'alle'    => '1 = 1',
            'ohne_ki' => "n.status = 'ohne_ki'",
            default   => "(n.status IN ('entwurf', 'wartet_ki', 'fehler')
                           OR (n.status = 'mensch' AND n.status_grund = 'versand_unklar')
                           OR (n.status = 'mensch' AND n.status_grund IN ('" . implode("', '", Kern::MENSCH_OFFEN) . "')
                               AND MAX(COALESCE(n.eingang_am, 0), COALESCE(n.aktualisiert_am, 0)) >= :grenze))",
        };
        $st = Speicher::db()->prepare("SELECT n.id, n.eingang_am, n.von_name, n.von_adresse, n.antwort_an, n.betreff, n.status,
                   n.status_grund, n.regel_kategorie, n.in_arbeit_bis,
                   e.anliegen, e.zusammenfassung, e.interessent, e.dringlich, e.uebergabe, e.stimmung, e.manipulation,
                   (SELECT w.pruef_status FROM entwurf w WHERE w.nachricht_id = n.id
                     ORDER BY w.version DESC, w.id DESC LIMIT 1) AS pruef_status,
                   (SELECT w.status FROM entwurf w WHERE w.nachricht_id = n.id
                     ORDER BY w.version DESC, w.id DESC LIMIT 1) AS entwurf_status
            FROM nachricht n
            LEFT JOIN einordnung e ON e.nachricht_id = n.id
            WHERE $wo
            ORDER BY n.eingang_am DESC, n.id DESC
            LIMIT :anzahl OFFSET :versatz");
        // Eine Zeile mehr als gezeigt wird: So ist klar, ob es eine weitere Seite gibt.
        $st->bindValue(':anzahl', self::SEITENGROESSE + 1, \PDO::PARAM_INT);
        $st->bindValue(':versatz', ($seite - 1) * self::SEITENGROESSE, \PDO::PARAM_INT);
        if ($filter === 'offen') {
            $st->bindValue(':grenze', $grenze, \PDO::PARAM_INT);
        }
        $st->execute();
        $zeilen = $st->fetchAll(\PDO::FETCH_ASSOC);
        $weitere = count($zeilen) > self::SEITENGROESSE;

        $eintraege = [];
        foreach (array_slice($zeilen, 0, self::SEITENGROESSE) as $z) {
            $eintraege[] = [
                'id'              => (int) $z['id'],
                'eingang_am'      => (int) $z['eingang_am'],
                'von_name'        => (string) ($z['von_name'] ?? ''),
                'von_adresse'     => (string) ($z['von_adresse'] ?? ''),
                'betreff'         => (string) ($z['betreff'] ?? ''),
                'status'          => (string) ($z['status'] ?? ''),
                'status_grund'    => (string) ($z['status_grund'] ?? ''),
                'regel_kategorie' => (string) ($z['regel_kategorie'] ?? ''),
                'anliegen'        => (string) ($z['anliegen'] ?? ''),
                'zusammenfassung' => (string) ($z['zusammenfassung'] ?? ''),
                'interessent'     => (int) ($z['interessent'] ?? 0) === 1,
                'dringlich'       => (int) ($z['dringlich'] ?? 0) === 1,
                'uebergabe'       => (int) ($z['uebergabe'] ?? 0) === 1,
                'pruef_status'    => (string) ($z['pruef_status'] ?? ''),
                'marken'          => self::marken($z),
            ];
        }
        return ['ok' => true, 'filter' => $filter, 'seite' => $seite, 'weitere' => $weitere, 'eintraege' => $eintraege];
    }

    /**
     * Marken eines Listeneintrags: erst der Stand, dann Anliegen, „Neukunde“, „eilt“,
     * „Bitte selbst prüfen“. farbe: blau · gruen · gelb · rot · grau.
     * $z ist eine Zeile der Liste (Nachricht mit Einordnung, dazu entwurf_status und
     * pruef_status des neuesten Entwurfs); optional 'jetzt' für Tests.
     */
    public static function marken(array $z): array
    {
        $status = (string) ($z['status'] ?? '');
        $grund = (string) ($z['status_grund'] ?? '');
        $kategorie = (string) ($z['regel_kategorie'] ?? '');
        $entwurf = (string) ($z['entwurf_status'] ?? '');
        $pruef = (string) ($z['pruef_status'] ?? '');
        $jetzt = (int) ($z['jetzt'] ?? Umgebung::jetzt());

        $marken = [];
        $marken[] = match (true) {
            $status === 'mensch' && $grund === 'versand_geklaert' => ['text' => self::MENSCH_GRUENDE['versand_geklaert'][0], 'farbe' => 'grau'],
            self::versandUnklar($status, $grund, $entwurf, (int) ($z['in_arbeit_bis'] ?? 0), $jetzt)
                                                                => ['text' => 'Versand unklar', 'farbe' => 'rot'],
            $entwurf === 'sendet' && $status === 'entwurf'      => ['text' => 'Wird gesendet', 'farbe' => 'gelb'],
            $status === 'entwurf' && $pruef === 'abgelehnt'     => ['text' => 'Bitte selbst beantworten', 'farbe' => 'rot'],
            $status === 'entwurf'                               => ['text' => 'Antwort-Entwurf', 'farbe' => 'blau'],
            $status === 'wartet_ki'                             => ['text' => (self::WARTE_GRUENDE[$grund] ?? self::WARTE_GRUENDE[''])[0], 'farbe' => 'grau'],
            $status === 'gesendet'                              => ['text' => 'Gesendet', 'farbe' => 'gruen'],
            $status === 'verworfen'                             => ['text' => 'Verworfen', 'farbe' => 'grau'],
            $status === 'fehler'                                => ['text' => 'KI-Fehler – bitte selbst antworten', 'farbe' => 'rot'],
            $status === 'zusammengefasst'                       => ['text' => 'Mit neuerer Mail beantwortet', 'farbe' => 'grau'],
            $status === 'ohne_ki'                               => ['text' => self::KATEGORIE_NAMEN[$kategorie] ?? 'Ohne KI aussortiert', 'farbe' => 'grau'],
            $status === 'mensch' && $grund === 'zu_alt'         => ['text' => self::MENSCH_GRUENDE['zu_alt'][0], 'farbe' => 'gelb'],
            $status === 'mensch' && $grund === 'vorgaenger_offen' => ['text' => self::MENSCH_GRUENDE['vorgaenger_offen'][0], 'farbe' => 'gelb'],
            $status === 'mensch'                                => ['text' => (self::MENSCH_GRUENDE[$grund] ?? self::MENSCH_GRUENDE['uebernommen'])[0], 'farbe' => 'grau'],
            default                                             => ['text' => 'Unbekannter Stand', 'farbe' => 'grau'],
        };

        $anliegen = (string) ($z['anliegen'] ?? '');
        if ($anliegen !== '' && isset(self::ANLIEGEN_NAMEN[$anliegen])) {
            $marken[] = ['text' => self::ANLIEGEN_NAMEN[$anliegen], 'farbe' => 'grau'];
        }
        // Die folgenden Marken helfen nur, solange noch etwas zu tun ist.
        if ($status === 'entwurf' || $status === 'wartet_ki') {
            // Reply-To weicht vom Absender ab: Absender lassen sich fälschen (Kern::sende fragt nach).
            if (Versand::empfaengerWeichtAb($z)) {
                $marken[] = ['text' => 'Antwort an andere Adresse', 'farbe' => 'rot'];
            }
            if ($status === 'entwurf' && $grund === 'nicht_im_posteingang') {
                $marken[] = ['text' => 'Nicht mehr im Posteingang', 'farbe' => 'gelb'];
            }
            if ((int) ($z['interessent'] ?? 0) === 1) {
                $marken[] = ['text' => 'Neukunde', 'farbe' => 'blau'];
            }
            if ((int) ($z['dringlich'] ?? 0) === 1) {
                $marken[] = ['text' => 'eilt', 'farbe' => 'gelb'];
            }
            if (self::selbstPruefen($z)) {
                $marken[] = ['text' => 'Bitte selbst prüfen', 'farbe' => 'rot'];
            }
        }
        return $marken;
    }

    /**
     * true, wenn offen ist, ob eine Antwort rausging (Bauplan 7.3): Der Kern hat den Versand als
     * unklar markiert, oder ein Entwurf steht noch auf „sendet“, obwohl die Belegung abgelaufen
     * ist – dann ist der Versand unterwegs abgebrochen. Nach „Versand geklärt“ nicht mehr.
     */
    public static function versandUnklar(string $status, string $grund, string $entwurfStatus, int $inArbeitBis, int $jetzt): bool
    {
        if ($status === 'mensch' && $grund === 'versand_geklaert') {
            return false;
        }
        if (($status === 'mensch' && $grund === 'versand_unklar') || $entwurfStatus === 'unklar') {
            return true;
        }
        return $status === 'entwurf' && $entwurfStatus === 'sendet' && $inArbeitBis <= $jetzt;
    }

    /**
     * true, wenn ein Mensch den Fall selbst entscheiden oder besonders genau hinsehen sollte:
     * dieselben Merkmale wie Pruefer::mussMensch (Bauplan 4.13) und zusätzlich Prüfhinweise am Entwurf.
     */
    public static function selbstPruefen(array $z): bool
    {
        return (int) ($z['uebergabe'] ?? 0) === 1
            || (int) ($z['manipulation'] ?? 0) === 1
            || in_array((string) ($z['anliegen'] ?? ''), ['beschwerde', 'auftragsstatus', 'kein_kundenanliegen'], true)
            || (string) ($z['stimmung'] ?? '') === 'veraergert'
            || in_array((string) ($z['pruef_status'] ?? ''), ['warnung', 'abgelehnt'], true);
    }

    /**
     * Alles zu einer Nachricht. Der Text ist genau der, den die KI bekommen hat (text_bereinigt:
     * ohne Zitate, mit unkenntlich gemachten Nummern) – nie die Rohmail.
     */
    public static function nachricht(int $id): ?array
    {
        $db = Speicher::db();
        $st = $db->prepare('SELECT * FROM nachricht WHERE id = ?');
        $st->execute([$id]);
        $n = $st->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($n)) {
            return null;
        }
        $st = $db->prepare('SELECT * FROM einordnung WHERE nachricht_id = ?');
        $st->execute([$id]);
        $e = $st->fetch(\PDO::FETCH_ASSOC);
        $e = is_array($e) ? $e : null;

        $st = $db->prepare('SELECT * FROM entwurf WHERE nachricht_id = ? ORDER BY version DESC, id DESC LIMIT 1');
        $st->execute([$id]);
        $w = $st->fetch(\PDO::FETCH_ASSOC);
        $w = is_array($w) ? $w : null;

        $jetzt = Umgebung::jetzt();
        $status = (string) ($n['status'] ?? '');
        $grund = (string) ($n['status_grund'] ?? '');
        $entwurfStatus = $w === null ? '' : (string) ($w['status'] ?? '');
        $inArbeit = (int) ($n['in_arbeit_bis'] ?? 0) > $jetzt;

        $anhaenge = json_decode((string) ($n['anhaenge'] ?? ''), true);
        $anhaenge = is_array($anhaenge) ? $anhaenge : [];

        $hinweise = [];
        $text = '';
        if ($w !== null) {
            $roh = json_decode((string) ($w['pruef_hinweise'] ?? ''), true);
            foreach (is_array($roh) ? $roh : [] as $h) {
                if (is_string($h) && trim($h) !== '') {
                    $hinweise[] = $h;
                }
            }
            $text = $entwurfStatus === 'gesendet' && (string) ($w['gesendet_text'] ?? '') !== ''
                ? (string) $w['gesendet_text']
                : (string) ($w['text_final'] ?? '');
        }

        $offen = $status === 'entwurf' && $entwurfStatus === 'offen';
        $wissen = null;
        try {
            $wissen = Wissen::laden();
        } catch (\Throwable $t) {
            self::protokolliere($t);
        }
        // Preise oder Zeiten der Website haben sich seit dem Entwurf geändert: Der Mensch soll
        // das wissen, bevor er freigibt (Bauplan 7.5, Wissensstand am Entwurf).
        if ($offen && is_array($wissen) && (string) ($w['wissen_hash'] ?? '') !== '') {
            try {
                if (!hash_equals(Wissen::vergleichsStand($wissen), (string) $w['wissen_hash'])) {
                    $hinweise[] = 'Die Angaben der Website haben sich seit diesem Entwurf geändert. '
                        . 'Bitte Preise und Zeiten im Text prüfen oder „Neu erzeugen“ wählen.';
                }
            } catch (\Throwable $t) {
                self::protokolliere($t);
            }
        }

        $vorschau = '';
        if ($offen && is_array($wissen) && trim($text) !== '') {
            try {
                $vorschau = Versand::vorschau($n, $text, $wissen, (string) ($w['sprache'] ?? 'de'));
            } catch (\Throwable $t) {
                self::protokolliere($t);
            }
        }

        $einordnung = null;
        if ($e !== null) {
            $anliegen = (string) ($e['anliegen'] ?? '');
            $einordnung = [
                'anliegen'        => $anliegen,
                'anliegen_name'   => self::ANLIEGEN_NAMEN[$anliegen] ?? $anliegen,
                'leistung'        => (string) ($e['leistung'] ?? ''),
                'interessent'     => (int) ($e['interessent'] ?? 0) === 1,
                'dringlich'       => (int) ($e['dringlich'] ?? 0) === 1,
                'stimmung'        => (string) ($e['stimmung'] ?? ''),
                'uebergabe'       => (int) ($e['uebergabe'] ?? 0) === 1,
                'uebergabe_grund' => (string) ($e['uebergabe_grund'] ?? ''),
                'komplex'         => (int) ($e['komplex'] ?? 0) === 1,
                'manipulation'    => (int) ($e['manipulation'] ?? 0) === 1,
                'zusammenfassung' => (string) ($e['zusammenfassung'] ?? ''),
                'fehlende_angabe' => (string) ($e['fehlende_angabe'] ?? ''),
                'modell'          => (string) ($e['modell'] ?? ''),
                'aus_duplikat'    => (int) ($e['aus_duplikat'] ?? 0) === 1,
                'erstellt_am'     => (int) ($e['erstellt_am'] ?? 0),
            ];
        }

        $entwurf = null;
        if ($w !== null) {
            $entwurf = [
                'id'              => (int) $w['id'],
                'version'         => (int) ($w['version'] ?? 1),
                'text'            => $text,
                'pruef_status'    => (string) ($w['pruef_status'] ?? ''),
                'pruef_hinweise'  => $hinweise,
                'modell'          => (string) ($w['modell'] ?? ''),
                'status'          => $entwurfStatus,
                'geaendert'       => (int) ($w['geaendert'] ?? 0) === 1,
                'freigegeben_von' => (string) ($w['freigegeben_von'] ?? ''),
                'freigegeben_am'  => (int) ($w['freigegeben_am'] ?? 0),
                'erstellt_am'     => (int) ($w['erstellt_am'] ?? 0),
                'sprache'         => (string) ($w['sprache'] ?? 'de'),
            ];
        }

        $kategorie = (string) ($n['regel_kategorie'] ?? '');
        $zeileFuerMarken = [
            'status' => $status, 'status_grund' => $grund, 'regel_kategorie' => $kategorie,
            'entwurf_status' => $entwurfStatus, 'pruef_status' => $w === null ? '' : (string) ($w['pruef_status'] ?? ''),
            'in_arbeit_bis' => (int) ($n['in_arbeit_bis'] ?? 0), 'jetzt' => $jetzt,
            'von_adresse' => (string) ($n['von_adresse'] ?? ''), 'antwort_an' => (string) ($n['antwort_an'] ?? ''),
        ] + ($e ?? []);
        $mailtext = (string) ($n['text_bereinigt'] ?? '');
        $unklar = self::versandUnklar($status, $grund, $entwurfStatus, (int) ($n['in_arbeit_bis'] ?? 0), $jetzt);
        $imVersand = $entwurfStatus === 'sendet';

        // „Neu erzeugen“ bzw. „Entwurf erzeugen“ – genau die Fälle, die Kern::neuErzeugen annimmt
        // (nicht nach einem unklaren Versand, nicht bei einer Absenderregel, nicht ohne Absender).
        // Ohne gespeicherten Text gibt es nichts zu entwerfen.
        $neuErzeugen = Kern::erzeugbar($n) && !Kern::widerspruch($n) && !$inArbeit && !$imVersand && !$unklar && trim($mailtext) !== '';
        $abschliessbar = Kern::abschliessbar($status, $grund) && !$imVersand;
        $zusammen = [];
        foreach (Kern::zusammengefasste((int) $n['id']) as $frueher) {
            $zusammen[] = ['id' => $frueher['id'], 'eingang_am' => $frueher['eingang_am'], 'betreff' => $frueher['betreff'], 'text' => $frueher['text']];
        }

        return [
            'ok' => true,
            'nachricht' => [
                'id'               => (int) $n['id'],
                'kanal'            => (string) ($n['kanal'] ?? 'email'),
                'eingang_am'       => (int) ($n['eingang_am'] ?? 0),
                'von_name'         => (string) ($n['von_name'] ?? ''),
                'von_adresse'      => (string) ($n['von_adresse'] ?? ''),
                // Dieselbe Regel wie beim Senden (Reply-To vor From, nie die eigene Adresse).
                'geht_an'          => Versand::empfaengerAdresse($n),
                'antwort_abweichend' => Versand::empfaengerWeichtAb($n),
                'betreff'          => (string) ($n['betreff'] ?? ''),
                'status'           => $status,
                'status_grund'     => $grund,
                'regel_kategorie'  => (string) ($n['regel_kategorie'] ?? ''),
                'text_bereinigt'   => $mailtext,
                'text_hinweis'     => self::textHinweis($mailtext, $kategorie),
                'gekuerzt'         => (int) ($n['gekuerzt'] ?? 0) === 1,
                'zeichen_original' => (int) ($n['zeichen_original'] ?? 0),
                'anhaenge'         => self::anhangListe($anhaenge),
                'anhang_text'      => self::anhangText($anhaenge),
                'versuche'         => (int) ($n['versuche'] ?? 0),
                // Frühere Mails desselben Absenders, die dieser Entwurf mit beantwortet.
                'zusammengefasst'  => $zusammen,
            ],
            'marken'     => self::marken($zeileFuerMarken),
            'hinweis'    => self::statusHinweis($n, $w, $jetzt, $e),
            'einordnung' => $einordnung,
            'entwurf'    => $entwurf,
            'vorschau'   => $vorschau,
            // Was die Oberfläche anbieten darf. Der Kern prüft bei jeder Aktion selbst noch einmal.
            'darf' => [
                'senden'          => $offen && !$inArbeit,
                // Auch ohne Entwurf: Eine wartende Mail, die keine Antwort braucht, kostet so keinen Aufruf.
                'verwerfen'       => !$inArbeit && ($offen || ($abschliessbar && $status !== 'entwurf')),
                'uebernehmen'     => $abschliessbar,
                'neu_erzeugen'    => $neuErzeugen,
                'unklar_erledigt' => $unklar,
            ],
        ];
    }

    /** Der Kasten über einer Nachricht: was ihr Stand bedeutet und was zu tun ist. */
    public static function statusHinweis(array $n, ?array $w, int $jetzt, ?array $e = null): array
    {
        $status = (string) ($n['status'] ?? '');
        $grund = (string) ($n['status_grund'] ?? '');
        $entwurf = $w === null ? '' : (string) ($w['status'] ?? '');

        if (self::versandUnklar($status, $grund, $entwurf, (int) ($n['in_arbeit_bis'] ?? 0), $jetzt)) {
            return $entwurf === 'sendet'
                ? ['farbe' => 'rot', 'titel' => 'Versand nicht sauber beendet', 'text' => 'Der Versand wurde unterwegs abgebrochen. ' . self::UNKLAR_SATZ]
                : ['farbe' => 'rot', 'titel' => 'Versand unklar', 'text' => self::UNKLAR_SATZ];
        }
        if ($entwurf === 'sendet' && $status === 'entwurf') {
            return ['farbe' => 'gelb', 'titel' => 'Wird gerade gesendet',
                'text' => 'Bitte einen Moment warten und die Nachricht dann neu öffnen.'];
        }
        switch ($status) {
            case 'entwurf':
                if ($w === null || (string) ($w['pruef_status'] ?? '') === 'abgelehnt' || trim((string) ($w['text_final'] ?? '')) === '') {
                    return ['farbe' => 'rot', 'titel' => 'Bitte selbst beantworten',
                        'text' => 'Die KI hat hier keinen brauchbaren Entwurf geliefert. Sie können den Text unten selbst schreiben oder im Mailprogramm antworten.'];
                }
                $gruende = self::pruefGruende($e);
                if ($grund === 'nicht_im_posteingang') {
                    array_unshift($gruende, 'Die Mail liegt nicht mehr im Posteingang – oft wurde sie im Mailprogramm beantwortet und abgelegt. Bitte dort nachsehen, bevor Sie senden.');
                }
                if (Versand::empfaengerWeichtAb($n)) {
                    $gruende[] = 'Die Antwort geht an ' . Versand::empfaengerAdresse($n) . ', nicht an den Absender. Absender lassen sich fälschen – bitte prüfen, ob die Adresse zum Kunden gehört.';
                }
                if ($gruende !== []) {
                    return ['farbe' => 'gelb', 'titel' => 'Bitte selbst prüfen', 'text' => implode(' ', $gruende)];
                }
                return ['farbe' => '', 'titel' => '', 'text' => ''];
            case 'wartet_ki':
                $warte = self::WARTE_GRUENDE[$grund] ?? self::WARTE_GRUENDE[''];
                return ['farbe' => 'grau', 'titel' => $warte[0], 'text' => $warte[1]];
            case 'gesendet':
                $von = $w === null ? '' : self::nurBearbeiter((string) ($w['freigegeben_von'] ?? ''));
                $am = $w === null ? 0 : (int) ($w['freigegeben_am'] ?? 0);
                return ['farbe' => 'gruen', 'titel' => 'Gesendet',
                    'text' => trim(($am > 0 ? 'Am ' . self::datum($am) : '') . ($von !== '' ? ' von ' . $von : '')) . '.'];
            case 'verworfen':
                return ['farbe' => 'grau', 'titel' => 'Verworfen', 'text' => 'Dieser Entwurf wurde verworfen. Es ging keine Antwort raus.'];
            case 'fehler':
                return ['farbe' => 'rot', 'titel' => 'Kein Entwurf möglich',
                    'text' => 'Die KI konnte nach mehreren Versuchen keinen Entwurf erstellen. Bitte selbst antworten oder „Neu erzeugen“ versuchen.'];
            case 'zusammengefasst':
                $neuere = (int) ($n['zusammengefasst_in'] ?? 0);
                return ['farbe' => 'grau', 'titel' => 'Mit neuerer Mail zusammengefasst',
                    'text' => 'Der Absender hat noch einmal geschrieben. Die Antwort auf die neuere Mail' . ($neuere > 0 ? ' (Nr. ' . $neuere . ')' : '')
                        . ' soll diese mit abdecken. Wird die neuere verworfen oder selbst beantwortet, erscheint diese wieder unter „Zu erledigen“.'];
            case 'ohne_ki':
                $kategorie = (string) ($n['regel_kategorie'] ?? '');
                if ($kategorie === 'formular') {
                    return ['farbe' => 'grau', 'titel' => self::KATEGORIE_NAMEN['formular'],
                        'text' => 'Ein Auftrag über das Formular der Website. Er wird wie gewohnt bearbeitet; die KI entwirft dafür nichts.'];
                }
                return ['farbe' => 'grau', 'titel' => self::KATEGORIE_NAMEN[$kategorie] ?? 'Ohne KI aussortiert',
                    'text' => 'Diese Mail wurde ohne KI aussortiert. Das hat nichts gekostet.'
                        . (in_array($kategorie, self::OHNE_TEXT, true) ? '' : ' War das ein Irrtum, lässt sich unten ein Entwurf erzeugen.')];
            case 'mensch':
                $mensch = self::MENSCH_GRUENDE[$grund] ?? ['', 'Sie antworten selbst', 'Diese Mail wird ohne KI im Mailprogramm beantwortet.'];
                return ['farbe' => in_array($grund, Kern::MENSCH_OFFEN, true) ? 'gelb' : 'grau', 'titel' => $mensch[1], 'text' => $mensch[2]];
        }
        return ['farbe' => 'grau', 'titel' => '', 'text' => ''];
    }

    /** Warum ein Mensch bei diesem Entwurf genau hinsehen soll – in Sätzen (Merkmale wie Pruefer::mussMensch). */
    private static function pruefGruende(?array $e): array
    {
        if ($e === null) {
            return [];
        }
        $gruende = [];
        if ((int) ($e['uebergabe'] ?? 0) === 1) {
            $grund = rtrim(trim((string) ($e['uebergabe_grund'] ?? '')), '.');
            $gruende[] = 'Das sollte ein Mensch entscheiden' . ($grund !== '' ? ': ' . $grund . '.' : '.');
        }
        if ((int) ($e['manipulation'] ?? 0) === 1) {
            $gruende[] = 'Die Mail versucht womöglich, Regeln zu umgehen oder Zusagen zu erzwingen.';
        }
        $anliegen = (string) ($e['anliegen'] ?? '');
        if ($anliegen === 'beschwerde') {
            $gruende[] = 'Es ist eine Beschwerde.';
        } elseif ($anliegen === 'auftragsstatus') {
            $gruende[] = 'Es geht um den Stand eines Auftrags – den kennt die KI nicht.';
        } elseif ($anliegen === 'kein_kundenanliegen') {
            $gruende[] = 'Das ist vermutlich kein Kundenanliegen.';
        }
        if ((string) ($e['stimmung'] ?? '') === 'veraergert') {
            $gruende[] = 'Der Absender wirkt verärgert.';
        }
        return $gruende;
    }

    /** Warum kein Mailtext zu sehen ist – leer, wenn es einen gibt. */
    public static function textHinweis(string $text, string $kategorie): string
    {
        if (trim($text) !== '') {
            return '';
        }
        if (in_array($kategorie, self::OHNE_TEXT, true)) {
            return 'Den Text von Formular-Aufträgen und eigenen Mails speichert der Assistent nicht. Bitte im Mailprogramm lesen.';
        }
        if ($kategorie === 'nur_anhang') {
            return 'Die Mail enthält kaum Text, nur Anhänge. Bitte im Mailprogramm ansehen.';
        }
        return 'Kein Text gespeichert – die Mail war leer oder die Aufbewahrungsfrist ist abgelaufen. Bitte im Mailprogramm lesen.';
    }

    /** „Anhänge: 2 Bilder (nicht an die KI gesendet)“ – leer, wenn es keine gibt. */
    public static function anhangText(array $anhaenge): string
    {
        $zahl = ['bild' => 0, 'pdf' => 0, 'sonst' => 0];
        foreach ($anhaenge as $a) {
            $art = is_array($a) ? (string) ($a['art'] ?? 'sonst') : 'sonst';
            $zahl[isset($zahl[$art]) ? $art : 'sonst']++;
        }
        $teile = [];
        if ($zahl['bild'] > 0) {
            $teile[] = $zahl['bild'] === 1 ? '1 Bild' : $zahl['bild'] . ' Bilder';
        }
        if ($zahl['pdf'] > 0) {
            $teile[] = $zahl['pdf'] === 1 ? '1 PDF' : $zahl['pdf'] . ' PDFs';
        }
        if ($zahl['sonst'] > 0) {
            $teile[] = $zahl['sonst'] === 1 ? '1 andere Datei' : $zahl['sonst'] . ' andere Dateien';
        }
        if ($teile === []) {
            return '';
        }
        return (array_sum($zahl) === 1 ? 'Anhang: ' : 'Anhänge: ') . implode(', ', $teile) . ' (nicht an die KI gesendet)';
    }

    /** Anhänge nur mit Art und Größe – mehr ist nie gespeichert. */
    private static function anhangListe(array $anhaenge): array
    {
        $liste = [];
        foreach ($anhaenge as $a) {
            if (is_array($a)) {
                $art = (string) ($a['art'] ?? 'sonst');
                $liste[] = ['art' => in_array($art, ['bild', 'pdf'], true) ? $art : 'sonst', 'bytes' => max(0, (int) ($a['bytes'] ?? 0))];
            }
        }
        return $liste;
    }

    /** Vorschau für einen in der Oberfläche geänderten Text: genau die Mail, die rausginge. */
    public static function vorschau(int $id, string $text): array
    {
        if (mb_strlen($text) > self::MAX_TEXT_ZEICHEN) {
            return ['ok' => false, 'fehler' => 'Der Text ist zu lang.'];
        }
        $st = Speicher::db()->prepare('SELECT * FROM nachricht WHERE id = ?');
        $st->execute([$id]);
        $n = $st->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($n)) {
            return ['ok' => false, 'fehler' => 'Diese Nachricht gibt es nicht mehr.'];
        }
        if (trim($text) === '') {
            return ['ok' => true, 'vorschau' => ''];
        }
        $st = Speicher::db()->prepare('SELECT sprache FROM entwurf WHERE nachricht_id = ? ORDER BY version DESC, id DESC LIMIT 1');
        $st->execute([$id]);
        $sprache = (string) ($st->fetchColumn() ?: 'de');
        try {
            $wissen = Wissen::laden();
            if (!is_array($wissen)) {
                return ['ok' => false, 'fehler' => 'Die Vorschau ist gerade nicht möglich: Die Wissensbasis fehlt.'];
            }
            return ['ok' => true, 'vorschau' => Versand::vorschau($n, $text, $wissen, $sprache)];
        } catch (\Throwable $t) {
            self::protokolliere($t);
            return ['ok' => false, 'fehler' => 'Die Vorschau ist gerade nicht möglich.'];
        }
    }

    /**
     * Verbrauch für den Reiter „Verbrauch“. Budget::uebersicht() liefert die Zahlen; hier bekommen
     * die Aufteilungen eine feste Form (Name, Betrag, Aufrufe) und die Reihen lückenlose Tage und
     * Monate, damit die Balken im Browser ohne Rechnen stimmen.
     */
    public static function verbrauch(): array
    {
        $u = Budget::uebersicht();
        $jetzt = Umgebung::jetzt();
        $limits = is_array($u['limits'] ?? null) ? $u['limits'] : [];
        $paar = static fn (mixed $p): array => [
            'usd'     => round((float) (is_array($p) ? ($p['usd'] ?? 0) : 0), 6),
            'aufrufe' => (int) (is_array($p) ? ($p['aufrufe'] ?? 0) : 0),
        ];
        return [
            'ok'      => true,
            'heute'   => $paar($u['heute'] ?? null),
            'monat'   => $paar($u['monat'] ?? null),
            // So, wie Budget::darfAufrufen die Grenzen liest (unlesbare Werte gelten als Standard).
            'limits'  => [
                'tag_usd'     => round((float) ($limits['limit_tag_usd'] ?? 0), 6),
                'monat_usd'   => round((float) ($limits['limit_monat_usd'] ?? 0), 6),
                'aufrufe_tag' => (int) ($limits['limit_aufrufe_tag'] ?? 0),
            ],
            'je_tag'    => self::reihe(self::gruppen($u['je_tag'] ?? null, 'tag'), self::letzteTage($jetzt, 30)),
            'je_monat'  => self::reihe(self::gruppen($u['je_monat'] ?? null, 'monat'), self::letzteMonate($jetzt, 12)),
            'je_kanal'  => self::benenne(self::gruppen($u['je_kanal'] ?? null, 'kanal'), self::KANAL_NAMEN),
            'je_modell' => self::benenne(self::gruppen($u['je_modell'] ?? null, 'modell'), self::MODELL_NAMEN),
            'je_zweck'  => self::benenne(self::gruppen($u['je_zweck'] ?? null, 'zweck'), self::ZWECK_NAMEN),
            'bearbeitet_monat'      => (int) ($u['bearbeitet_monat'] ?? 0),
            'ohne_ki_monat'         => (int) ($u['ohne_ki_monat'] ?? 0),
            'kosten_je_anfrage_usd' => round((float) ($u['kosten_je_anfrage_usd'] ?? 0), 6),
            'kosten_je_aufruf_usd'  => round((float) ($u['kosten_je_aufruf_usd'] ?? 0), 6),
            'preise_stand'          => self::datumKurz((string) ($u['preise_stand'] ?? (Budget::PREISE['stand'] ?? ''))),
        ];
    }

    /**
     * Bringt eine Aufteilung in die Form [['name','usd','aufrufe'], …]. Nimmt Listen von Zeilen
     * (Name im Feld $namensfeld) ebenso wie Zuordnungen „Name => Betrag“ oder „Name => Zeile“.
     */
    public static function gruppen(mixed $roh, string $namensfeld): array
    {
        if (!is_array($roh)) {
            return [];
        }
        $aus = [];
        foreach ($roh as $schluessel => $wert) {
            if (is_array($wert)) {
                $name = $wert[$namensfeld] ?? $wert['name'] ?? (is_string($schluessel) ? $schluessel : '');
                $usd = isset($wert['usd'])
                    ? (float) $wert['usd']
                    : (isset($wert['kosten_mikro_usd']) ? ((int) $wert['kosten_mikro_usd']) / 1000000 : 0.0);
                $aufrufe = (int) ($wert['aufrufe'] ?? $wert['anzahl'] ?? 0);
            } elseif (is_int($wert) || is_float($wert)) {
                $name = $schluessel;
                $usd = (float) $wert;
                $aufrufe = 0;
            } else {
                continue;
            }
            $name = is_scalar($name) ? trim((string) $name) : '';
            if ($name !== '') {
                $aus[] = ['name' => mb_substr($name, 0, 60), 'usd' => round($usd, 6), 'aufrufe' => $aufrufe];
            }
        }
        return $aus;
    }

    /** Legt die Werte auf eine lückenlose Folge von Tagen oder Monaten; Fehlendes zählt null. */
    private static function reihe(array $gruppen, array $folge): array
    {
        $nachName = [];
        foreach ($gruppen as $g) {
            $nachName[$g['name']] = $g;
        }
        $aus = [];
        foreach ($folge as $name) {
            $aus[] = ['name' => $name, 'usd' => $nachName[$name]['usd'] ?? 0.0, 'aufrufe' => $nachName[$name]['aufrufe'] ?? 0];
        }
        return $aus;
    }

    /** Ergänzt verständliche Namen (E-Mail statt email) und sortiert nach Kosten. */
    private static function benenne(array $gruppen, array $namen): array
    {
        foreach ($gruppen as &$g) {
            $g['titel'] = $namen[$g['name']] ?? $g['name'];
        }
        unset($g);
        usort($gruppen, static fn (array $a, array $b): int => [$b['usd'], $b['aufrufe']] <=> [$a['usd'], $a['aufrufe']]);
        return $gruppen;
    }

    /** Die letzten $anzahl Tage als JJJJ-MM-TT, ältester zuerst (Berliner Zeit). */
    private static function letzteTage(int $jetzt, int $anzahl): array
    {
        $tage = [];
        for ($i = $anzahl - 1; $i >= 0; $i--) {
            $tage[] = self::tag($jetzt, -$i);
        }
        return $tage;
    }

    /** Die letzten $anzahl Monate als JJJJ-MM, ältester zuerst (Berliner Zeit). */
    private static function letzteMonate(int $jetzt, int $anzahl): array
    {
        $erster = self::berlin($jetzt)->modify('first day of this month');
        $monate = [];
        for ($i = $anzahl - 1; $i >= 0; $i--) {
            $monate[] = $erster->modify('-' . $i . ' month')->format('Y-m');
        }
        return $monate;
    }

    /** Einstellungen der Oberfläche mit ihren Grenzen und die Absenderregeln. */
    public static function einstellungen(): array
    {
        $werte = [];
        foreach (array_keys(self::EINSTELLUNGEN) as $schluessel) {
            $werte[$schluessel] = Speicher::einstellung($schluessel);
        }
        $st = Speicher::db()->prepare('SELECT id, muster, art, notiz, angelegt_am FROM absender_regel ORDER BY muster');
        $st->execute();
        $regeln = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $r) {
            $art = (string) ($r['art'] ?? '');
            $regeln[] = [
                'id'          => (int) $r['id'],
                'muster'      => (string) ($r['muster'] ?? ''),
                'art'         => $art,
                'art_name'    => self::REGEL_ARTEN[$art] ?? $art,
                'notiz'       => (string) ($r['notiz'] ?? ''),
                'angelegt_am' => (int) ($r['angelegt_am'] ?? 0),
            ];
        }
        $wissenStand = '';
        try {
            $wissen = Wissen::laden();
            $wissenStand = is_array($wissen) ? (string) ($wissen['stand'] ?? '') : '';
        } catch (\Throwable $t) {
            self::protokolliere($t);
        }
        return [
            'ok'              => true,
            'werte'           => $werte,
            'grenzen'         => self::EINSTELLUNGEN,
            'regeln'          => $regeln,
            'regel_arten'     => self::REGEL_ARTEN,
            'verwerf_gruende' => self::VERWERF_GRUENDE,
            'prompt_version'  => Prompt::VERSION,
            'wissen_stand'    => self::datumKurz($wissenStand),
        ];
    }

    /** Selbsttest des Kerns als Liste [['punkt','ok','meldung'], …]; scheitert er, steht das als Punkt da. */
    public static function selbsttest(): array
    {
        $punkte = [];
        try {
            foreach (Kern::selbsttest() as $p) {
                if (is_array($p)) {
                    $punkte[] = [
                        'punkt'   => mb_substr((string) ($p['punkt'] ?? ''), 0, 120),
                        'ok'      => ($p['ok'] ?? false) === true,
                        'meldung' => mb_substr((string) ($p['meldung'] ?? ''), 0, 400),
                    ];
                }
            }
        } catch (\Throwable $t) {
            self::protokolliere($t);
            $punkte[] = ['punkt' => 'Selbsttest', 'ok' => false,
                'meldung' => Umgebung::$bibliotheken ? 'Der Selbsttest ist abgebrochen. Näheres steht im Fehlerprotokoll des Servers.' : self::BIBLIOTHEKEN_FEHLEN];
        }
        $alles = $punkte !== [];
        foreach ($punkte as $p) {
            $alles = $alles && $p['ok'];
        }
        return ['ok' => true, 'alles_ok' => $alles, 'punkte' => $punkte, 'zeit' => Umgebung::jetzt()];
    }

    // -- Aktionen (aktion.php) -------------------------------------------------

    /**
     * Führt eine Aktion der Oberfläche aus. $eingabe ist der JSON-Körper (aktion, bearbeiter und
     * die Felder der Aktion), $login der angemeldete Benutzer. Rückgabe: ['status' => HTTP-Status,
     * 'daten' => Antwort]. Jede Aktion schreibt ein Ereignis mit „<login>:<bearbeiter>“ – ohne
     * Mailinhalt und ohne Adressen.
     */
    public static function fuehreAus(array $eingabe, string $login): array
    {
        $aktion = is_string($eingabe['aktion'] ?? null) ? $eingabe['aktion'] : '';
        $bearbeiter = self::bearbeiter($eingabe['bearbeiter'] ?? '');
        $nutzer = self::kennung($login, $bearbeiter);

        return match ($aktion) {
            'senden'                 => self::aktionSenden($eingabe, $nutzer, $bearbeiter),
            'verwerfen'              => self::aktionVerwerfen($eingabe, $nutzer),
            'uebernehmen'            => self::aktionUebernehmen($eingabe, $nutzer),
            'neu_erzeugen'           => self::aktionNeuErzeugen($eingabe, $nutzer),
            'unklar_erledigt'        => self::aktionUnklarErledigt($eingabe, $nutzer),
            'pause'                  => self::aktionPause($eingabe, $nutzer),
            'einstellung'            => self::aktionEinstellung($eingabe, $nutzer),
            'jetzt_abrufen'          => self::aktionAbrufen($nutzer),
            'absender_regel'         => self::aktionRegel($eingabe, $nutzer),
            'absender_regel_loeschen' => self::aktionRegelLoeschen($eingabe, $nutzer),
            'kunde_loeschen'         => self::aktionKundeLoeschen($eingabe, $nutzer),
            'sperre_aufheben'        => self::aktionSperreAufheben($nutzer),
            default                  => self::abgelehnt('Diese Aktion gibt es nicht.'),
        };
    }

    /**
     * senden {entwurf_id, text, trotz_warnung}. Die Antwort sagt der Oberfläche, wie es weitergeht:
     *   ok = true                 gesendet (meldung kann einen Hinweis zum Ablegen enthalten)
     *   bestaetigen = true        der Prüfer hat Hinweise (warnungen) – erst nach ausdrücklicher
     *                             Bestätigung mit trotz_warnung = true wird gesendet
     *   neu_gefuellt = true       die Preise der Website haben sich geändert, der Kern hat den
     *                             Entwurf neu gefüllt – erst den neuen Text lesen
     *   sonst                     nicht gesendet; fehler und warnungen nennen den Grund
     */
    private static function aktionSenden(array $eingabe, string $nutzer, string $bearbeiter): array
    {
        // Bauplan 7.8: Der Login ist gemeinsam – ohne Namen wäre nicht nachvollziehbar, wer gesendet hat.
        if ($bearbeiter === '') {
            return self::abgelehnt('Bitte zuerst oben eintragen, wer bearbeitet. Ohne Namen wird nichts gesendet.', ['name_fehlt' => true]);
        }
        $entwurfId = self::id($eingabe['entwurf_id'] ?? null);
        $text = is_string($eingabe['text'] ?? null) ? $eingabe['text'] : '';
        if ($entwurfId === 0) {
            return self::abgelehnt('Der Entwurf fehlt. Bitte die Nachricht neu öffnen.');
        }
        if (trim($text) === '') {
            return self::abgelehnt('Der Text ist leer. Bitte erst eine Antwort schreiben.');
        }
        if (mb_strlen($text) > self::MAX_TEXT_ZEICHEN) {
            return self::abgelehnt('Der Text ist zu lang.');
        }
        if (!Umgebung::$bibliotheken) {
            return self::erledigt(['ok' => false, 'fehler' => self::BIBLIOTHEKEN_FEHLEN]);
        }
        $trotzWarnung = ($eingabe['trotz_warnung'] ?? false) === true;

        $vorher = self::entwurfStand($entwurfId);
        if ($vorher === null) {
            return self::erledigt(['ok' => false, 'fehler' => 'Diesen Entwurf gibt es nicht mehr. Bitte die Liste neu laden.']);
        }
        $nachrichtId = $vorher['nachricht_id'];

        try {
            $ergebnis = Kern::sende($entwurfId, $text, $nutzer, $trotzWarnung);
        } catch (\Throwable $t) {
            // Mitten im Versand abgebrochen: Niemand weiß, ob die Mail raus ist. Nicht zum
            // erneuten Senden einladen, sondern zum Nachsehen.
            self::protokolliere($t);
            self::merke('admin_senden', $nachrichtId, $nutzer, ['entwurf_id' => $entwurfId, 'ok' => false, 'abbruch' => true]);
            return self::erledigt(['ok' => false, 'warnungen' => [],
                'fehler' => 'Beim Senden ist ein Fehler aufgetreten. Bitte die Nachricht neu öffnen und den Stand prüfen, bevor Sie noch einmal senden.']);
        }
        $ok = ($ergebnis['ok'] ?? false) === true;
        $warnungen = [];
        foreach ((array) ($ergebnis['warnungen'] ?? []) as $warnung) {
            if (is_string($warnung) && trim($warnung) !== '') {
                $warnungen[] = $warnung;
            }
        }
        $meldung = (string) ($ergebnis['meldung'] ?? '');
        $nachher = self::entwurfStand($entwurfId);

        // Hat der Kern den Entwurf neu gefüllt (Wissensstand geändert, Bauplan 7.5), steht jetzt ein
        // anderer Text am Entwurf. Den soll ein Mensch erst lesen – nicht „trotzdem senden“.
        $neuGefuellt = !$ok && $nachher !== null && $nachher['status'] === 'offen'
            && ($nachher['text_final'] !== $vorher['text_final'] || $nachher['wissen_hash'] !== $vorher['wissen_hash']);
        // Bestätigen hilft nur, wenn der Entwurf noch offen ist und der Prüfer Hinweise hatte. Lehnt
        // der Kern den Text auch dann ab, kommt beim zweiten Versuch die Ablehnung mit ihren Gründen.
        $bestaetigen = !$ok && !$neuGefuellt && !$trotzWarnung && $warnungen !== []
            && $nachher !== null && $nachher['status'] === 'offen';

        self::merke('admin_senden', $nachrichtId, $nutzer, [
            'entwurf_id' => $entwurfId, 'ok' => $ok, 'trotz_warnung' => $trotzWarnung, 'warnungen' => count($warnungen),
            'neu_gefuellt' => $neuGefuellt,
        ]);
        if ($ok) {
            return self::erledigt(['ok' => true, 'meldung' => $meldung !== '' ? $meldung : 'Gesendet.', 'warnungen' => $warnungen]);
        }
        return self::erledigt([
            'ok'           => false,
            'bestaetigen'  => $bestaetigen,
            'neu_gefuellt' => $neuGefuellt,
            'warnungen'    => $warnungen,
            'fehler'       => $meldung !== '' ? $meldung : ($warnungen !== [] ? 'Der Prüfer hat Hinweise zu diesem Text.' : 'Die Mail wurde nicht gesendet.'),
        ]);
    }

    private static function aktionVerwerfen(array $eingabe, string $nutzer): array
    {
        $id = self::id($eingabe['nachricht_id'] ?? null);
        if ($id === 0) {
            return self::abgelehnt('Die Nachricht fehlt.');
        }
        $grund = is_string($eingabe['grund'] ?? null) && isset(self::VERWERF_GRUENDE[$eingabe['grund']]) ? $eingabe['grund'] : 'anderes';
        // Gewirkt hat nur, was den Stand wirklich geändert hat (Kern::verwerfe meldet nichts zurück).
        $vorher = self::statusVon($id);
        Kern::verwerfe($id, $grund, $nutzer);
        $ok = $vorher !== 'verworfen' && self::statusVon($id) === 'verworfen';
        self::merke('admin_verwerfen', $id, $nutzer, ['grund' => $grund, 'ok' => $ok]);
        return self::erledigt($ok
            ? ['ok' => true, 'meldung' => 'Verworfen.']
            : ['ok' => false, 'fehler' => 'Das ging nicht mehr: Die Nachricht hat inzwischen einen anderen Stand.']);
    }

    private static function aktionUebernehmen(array $eingabe, string $nutzer): array
    {
        $id = self::id($eingabe['nachricht_id'] ?? null);
        if ($id === 0) {
            return self::abgelehnt('Die Nachricht fehlt.');
        }
        $vorher = self::statusVon($id);
        Kern::uebernehme($id, $nutzer);
        $ok = $vorher !== 'mensch' && self::statusVon($id) === 'mensch';
        self::merke('admin_uebernehmen', $id, $nutzer, ['ok' => $ok]);
        return self::erledigt($ok
            ? ['ok' => true, 'meldung' => 'Übernommen. Bitte im Mailprogramm antworten.']
            : ['ok' => false, 'fehler' => 'Das ging nicht mehr: Die Nachricht hat inzwischen einen anderen Stand.']);
    }

    private static function aktionNeuErzeugen(array $eingabe, string $nutzer): array
    {
        $id = self::id($eingabe['nachricht_id'] ?? null);
        if ($id === 0) {
            return self::abgelehnt('Die Nachricht fehlt.');
        }
        if (!Umgebung::$bibliotheken) {
            return self::erledigt(['ok' => false, 'fehler' => self::BIBLIOTHEKEN_FEHLEN]);
        }
        $ergebnis = Kern::neuErzeugen($id, $nutzer);
        $ok = ($ergebnis['ok'] ?? false) === true;
        $grund = (string) ($ergebnis['grund'] ?? '');
        $meldung = trim((string) ($ergebnis['meldung'] ?? ''));
        self::merke('admin_neu_erzeugen', $id, $nutzer, ['ok' => $ok, 'grund' => mb_substr($grund, 0, 40)]);
        if ($ok) {
            return self::erledigt(['ok' => true, 'meldung' => $meldung !== '' ? $meldung : 'Der neue Entwurf ist da.']);
        }
        // Ohne eigenen Satz des Kerns: das Schlüsselwort (wie status_grund) in einen Satz übersetzen.
        if ($meldung === '') {
            $meldung = $grund !== '' && isset(self::WARTE_GRUENDE[$grund]) ? self::WARTE_GRUENDE[$grund][1] : 'Es ist kein neuer Entwurf entstanden.';
        }
        return self::erledigt(['ok' => false, 'fehler' => $meldung]);
    }

    /**
     * Ein unklarer Versand wurde von Hand geprüft: aus „Zu erledigen“ nehmen. Gesendet wird hier
     * nichts. Zwei Fälle, beide mit bedingtem UPDATE (Bauplan 7.3):
     *   - der Kern hat ihn als unklar markiert (mensch/versand_unklar) → Grund „versand_geklaert“;
     *   - der Versand ist unterwegs abgebrochen (Entwurf noch „sendet“, Belegung abgelaufen) →
     *     Entwurf „unklar“, Nachricht „mensch“ mit Grund „versand_geklaert“.
     */
    private static function aktionUnklarErledigt(array $eingabe, string $nutzer): array
    {
        $id = self::id($eingabe['nachricht_id'] ?? null);
        if ($id === 0) {
            return self::abgelehnt('Die Nachricht fehlt.');
        }
        $db = Speicher::db();
        $jetzt = Umgebung::jetzt();
        $st = $db->prepare("UPDATE nachricht SET status_grund = 'versand_geklaert', aktualisiert_am = ?
                            WHERE id = ? AND status = 'mensch' AND status_grund = 'versand_unklar'");
        $st->execute([$jetzt, $id]);
        $ok = $st->rowCount() === 1;

        if (!$ok) {
            $st = $db->prepare("SELECT w.id FROM entwurf w JOIN nachricht n ON n.id = w.nachricht_id
                                WHERE n.id = ? AND n.status = 'entwurf' AND COALESCE(n.in_arbeit_bis, 0) <= ? AND w.status = 'sendet'
                                ORDER BY w.version DESC, w.id DESC LIMIT 1");
            $st->execute([$id, $jetzt]);
            $entwurfId = (int) $st->fetchColumn();
            // Belegen, damit nicht gleichzeitig ein Lauf oder ein zweiter Klick an der Nachricht arbeitet.
            if ($entwurfId > 0 && Speicher::belege($id, 30)) {
                try {
                    if (Speicher::wechsle('entwurf', $entwurfId, 'sendet', 'unklar')) {
                        $ok = Speicher::wechsle('nachricht', $id, 'entwurf', 'mensch', ['status_grund' => 'versand_geklaert']);
                    }
                } finally {
                    Speicher::gibFrei($id);
                }
            }
        }
        self::merke('admin_unklar_erledigt', $id, $nutzer, ['ok' => $ok]);
        return self::erledigt($ok
            ? ['ok' => true, 'meldung' => 'Abgehakt.']
            : ['ok' => false, 'fehler' => 'Das ging nicht mehr: Die Nachricht hat inzwischen einen anderen Stand.']);
    }

    /**
     * Hebt eine automatische Sperre nach einem Fehler beim KI-Anbieter vorzeitig auf – etwa nach
     * einem neuen Schlüssel oder einem höheren Ausgabenlimit bei Anthropic. Ist die Ursache nicht
     * behoben, sperrt der nächste Aufruf von selbst wieder.
     */
    private static function aktionSperreAufheben(string $nutzer): array
    {
        $jetzt = Umgebung::jetzt();
        $bis = (int) Speicher::einstellung('sperre_bis');
        if ($bis <= $jetzt) {
            return self::erledigt(['ok' => false, 'fehler' => 'Es besteht gerade keine Sperre.']);
        }
        Budget::sperre('von Hand aufgehoben', 0);
        $ok = (int) Speicher::einstellung('sperre_bis') <= $jetzt;
        self::merke('admin_sperre_aufgehoben', null, $nutzer, ['ok' => $ok, 'bis_war' => $bis]);
        return self::erledigt($ok
            ? ['ok' => true, 'meldung' => 'Sperre aufgehoben. Der nächste Abruf versucht es wieder mit der KI.']
            : ['ok' => false, 'fehler' => 'Die Sperre ließ sich nicht aufheben.']);
    }

    /** pause {an}: an = true hält die KI an (ki_aktiv = 0), an = false schaltet sie ein. */
    private static function aktionPause(array $eingabe, string $nutzer): array
    {
        if (!is_bool($eingabe['an'] ?? null)) {
            return self::abgelehnt('Es fehlt die Angabe, ob die KI an oder aus sein soll.');
        }
        $pause = $eingabe['an'];
        Speicher::setze('ki_aktiv', $pause ? '0' : '1', $nutzer);
        self::merke('admin_pause', null, $nutzer, ['an' => $pause]);
        return self::erledigt(['ok' => true, 'ki_aktiv' => !$pause, 'meldung' => $pause ? 'KI pausiert.' : 'KI eingeschaltet.']);
    }

    private static function aktionEinstellung(array $eingabe, string $nutzer): array
    {
        $schluessel = is_string($eingabe['schluessel'] ?? null) ? $eingabe['schluessel'] : '';
        $roh = $eingabe['wert'] ?? null;
        $wert = match (true) {
            is_string($roh) => $roh,
            is_bool($roh)   => $roh ? '1' : '0',
            is_int($roh), is_float($roh) => (string) $roh,
            default         => null,
        };
        $bereinigt = $wert === null ? null : self::pruefeEinstellung($schluessel, $wert);
        if ($bereinigt === null) {
            return self::abgelehnt(self::einstellungHinweis($schluessel), ['schluessel' => $schluessel]);
        }
        Speicher::setze($schluessel, $bereinigt, $nutzer);
        // Freie Texte (Gruß, Fußzeile) stehen nicht im Ereignis; Zahlen und Schalter schon.
        $art = self::EINSTELLUNGEN[$schluessel]['art'];
        self::merke('admin_einstellung', null, $nutzer,
            ['schluessel' => $schluessel] + (in_array($art, ['zeile', 'text'], true) ? [] : ['wert' => $bereinigt]));
        return self::erledigt(['ok' => true, 'schluessel' => $schluessel, 'wert' => $bereinigt, 'meldung' => 'Gespeichert.']);
    }

    private static function aktionAbrufen(string $nutzer): array
    {
        if (!Umgebung::$bibliotheken) {
            return self::erledigt(['ok' => false, 'fehler' => self::BIBLIOTHEKEN_FEHLEN]);
        }
        $lauf = self::laufZahlen(Kern::lauf('admin'));
        self::merke('admin_abruf', null, $nutzer, ['abgerufen' => $lauf['abgerufen'], 'entwuerfe' => $lauf['entwuerfe']]);
        return self::erledigt($lauf);
    }

    private static function aktionRegel(array $eingabe, string $nutzer): array
    {
        $muster = self::pruefeMuster(is_string($eingabe['muster'] ?? null) ? $eingabe['muster'] : '');
        if ($muster === null) {
            return self::abgelehnt('Bitte eine vollständige Adresse (name@example.org) oder eine Domain mit @ davor (@example.org) eingeben.');
        }
        $art = is_string($eingabe['art'] ?? null) ? $eingabe['art'] : '';
        if (!isset(self::REGEL_ARTEN[$art])) {
            return self::abgelehnt('Bitte wählen, was mit Mails dieses Absenders geschehen soll.');
        }
        $notiz = is_string($eingabe['notiz'] ?? null) ? $eingabe['notiz'] : '';
        $notiz = mb_substr(trim((string) preg_replace('/[\p{C}\s]+/u', ' ', $notiz)), 0, 120);

        $st = Speicher::db()->prepare('INSERT INTO absender_regel (muster, art, notiz, angelegt_am) VALUES (?, ?, ?, ?)
                                       ON CONFLICT(muster) DO UPDATE SET art = excluded.art, notiz = excluded.notiz');
        $st->execute([$muster, $art, $notiz, Umgebung::jetzt()]);
        // Die Regel gilt sofort auch für Mails, die schon warten oder einen Entwurf haben (ein
        // Widerspruch wirkt nicht erst ab der nächsten Mail).
        $umgestellt = Kern::wendeRegelAn($muster, $art, $nutzer);
        // Das Muster ist eine Adresse – im Ereignis steht deshalb nur, welche Art Regel entstand.
        self::merke('admin_regel', null, $nutzer, ['art' => $art, 'bereich' => $muster[0] === '@' ? 'domain' : 'adresse', 'umgestellt' => $umgestellt]);
        return self::erledigt(['ok' => true, 'umgestellt' => $umgestellt, 'meldung' => 'Regel gespeichert.'
            . ($umgestellt > 0 ? ' ' . ($umgestellt === 1 ? 'Eine wartende Mail wurde' : $umgestellt . ' wartende Mails wurden') . ' danach umgestellt.' : '')]);
    }

    private static function aktionRegelLoeschen(array $eingabe, string $nutzer): array
    {
        $id = self::id($eingabe['id'] ?? null);
        if ($id === 0) {
            return self::abgelehnt('Die Regel fehlt.');
        }
        $st = Speicher::db()->prepare('DELETE FROM absender_regel WHERE id = ?');
        $st->execute([$id]);
        $ok = $st->rowCount() === 1;
        self::merke('admin_regel_geloescht', null, $nutzer, ['ok' => $ok]);
        return self::erledigt($ok
            ? ['ok' => true, 'meldung' => 'Regel gelöscht.']
            : ['ok' => false, 'fehler' => 'Diese Regel gibt es nicht mehr.']);
    }

    private static function aktionKundeLoeschen(array $eingabe, string $nutzer): array
    {
        $adresse = self::pruefeAdresse(is_string($eingabe['adresse'] ?? null) ? $eingabe['adresse'] : '');
        if ($adresse === null) {
            return self::abgelehnt('Bitte eine vollständige E-Mail-Adresse eingeben.');
        }
        return self::erledigt(self::kundeLoeschen($adresse, $nutzer));
    }

    /**
     * Löscht alle Nachrichten, Einordnungen und Entwürfe zu einer Adresse (Bauplan 7.7).
     * Verbrauchs- und Ereigniszeilen bleiben, verlieren aber den Bezug zur Nachricht. Das Ereignis
     * nennt nur die Anzahl, nie die Adresse. Das Postfach selbst bleibt unberührt.
     */
    public static function kundeLoeschen(string $adresse, string $nutzer): array
    {
        $adresse = self::pruefeAdresse($adresse);
        if ($adresse === null) {
            return ['ok' => false, 'geloescht' => 0, 'fehler' => 'Bitte eine vollständige E-Mail-Adresse eingeben.'];
        }
        $db = Speicher::db();
        $jetzt = Umgebung::jetzt();

        $st = $db->prepare('SELECT * FROM nachricht WHERE lower(von_adresse) = ? OR lower(antwort_an) = ?');
        $st->execute([$adresse, $adresse]);
        $ids = [];
        foreach ($st->fetchAll(\PDO::FETCH_ASSOC) as $n) {
            // Läuft gerade ein Versand oder KI-Schritt für diese Adresse, erst dessen Ende abwarten.
            if ((int) ($n['in_arbeit_bis'] ?? 0) > $jetzt) {
                return ['ok' => false, 'geloescht' => 0,
                    'fehler' => 'Für diese Adresse wird gerade etwas verarbeitet. Bitte in zwei Minuten noch einmal versuchen.'];
            }
            $ids[] = (int) $n['id'];
        }

        $st = $db->prepare('SELECT COUNT(*) FROM absender_regel WHERE muster = ?');
        $st->execute([$adresse]);
        $regel = (int) $st->fetchColumn() > 0;
        $regelSatz = $regel ? ' Zu dieser Adresse gibt es noch eine Absenderregel – bei Bedarf dort löschen.' : '';

        if ($ids === []) {
            return ['ok' => true, 'geloescht' => 0, 'regel_vorhanden' => $regel,
                'meldung' => 'Zu dieser Adresse ist nichts gespeichert.' . $regelSatz];
        }

        $ohneBezugVerbrauch = self::spalteDarfLeerSein($db, 'verbrauch') ? null : 0;
        $ohneBezugEreignis = self::spalteDarfLeerSein($db, 'ereignis') ? null : 0;

        $db->beginTransaction();
        try {
            foreach (array_chunk($ids, 400) as $teil) {
                $platz = implode(',', array_fill(0, count($teil), '?'));
                $db->prepare("DELETE FROM entwurf WHERE nachricht_id IN ($platz)")->execute($teil);
                $db->prepare("DELETE FROM einordnung WHERE nachricht_id IN ($platz)")->execute($teil);
                $db->prepare("UPDATE verbrauch SET nachricht_id = ? WHERE nachricht_id IN ($platz)")
                    ->execute(array_merge([$ohneBezugVerbrauch], $teil));
                $db->prepare("UPDATE ereignis SET nachricht_id = ? WHERE nachricht_id IN ($platz)")
                    ->execute(array_merge([$ohneBezugEreignis], $teil));
                $db->prepare("DELETE FROM nachricht WHERE id IN ($platz)")->execute($teil);
            }
            $db->commit();
        } catch (\Throwable $t) {
            $db->rollBack();
            throw $t;
        }
        // Gelöschtes soll nicht im Schreibprotokoll der Datenbank liegen bleiben (Bauplan 7.7).
        try {
            $st = $db->prepare('PRAGMA wal_checkpoint(TRUNCATE)');
            $st->execute();
            $st->closeCursor();
        } catch (\Throwable $t) {
            self::protokolliere($t);
        }

        $anzahl = count($ids);
        self::merke('kunde_geloescht', null, $nutzer, ['nachrichten' => $anzahl]);
        return ['ok' => true, 'geloescht' => $anzahl, 'regel_vorhanden' => $regel,
            'meldung' => ($anzahl === 1 ? '1 Nachricht' : $anzahl . ' Nachrichten')
                . ' samt Entwürfen gelöscht. Die Mails im Postfach selbst bleiben – dort bitte von Hand löschen.' . $regelSatz];
    }

    /** Zahlen eines Laufs für lauf.php und „Jetzt abrufen“: nur Zähler und ein kurzes Hinweiswort. */
    public static function laufZahlen(array $lauf): array
    {
        return [
            'ok'        => ($lauf['ok'] ?? false) === true,
            'abgerufen' => (int) ($lauf['abgerufen'] ?? 0),
            'ohne_ki'   => (int) ($lauf['ohne_ki'] ?? 0),
            'mit_ki'    => (int) ($lauf['mit_ki'] ?? 0),
            'entwuerfe' => (int) ($lauf['entwuerfe'] ?? 0),
            'fehler'    => (int) ($lauf['fehler'] ?? 0),
            // Hinweiswörter des Kerns („läuft bereits“, „Postfach nicht erreichbar; …“) – nie Mailinhalt.
            'hinweis'   => self::einzeilig((string) ($lauf['hinweis'] ?? ''), 200),
        ];
    }

    /** Antwort für lauf.php, wenn gar kein Lauf möglich war. */
    public static function laufOhneErgebnis(string $hinweis): array
    {
        return self::laufZahlen(['ok' => false, 'hinweis' => $hinweis]);
    }

    // -- Kleine Helfer ---------------------------------------------------------

    private static function erledigt(array $daten): array
    {
        return ['status' => 200, 'daten' => $daten];
    }

    private static function abgelehnt(string $fehler, array $mehr = []): array
    {
        return ['status' => 400, 'daten' => ['ok' => false, 'fehler' => $fehler] + $mehr];
    }

    /** Ereignis schreiben, ohne dass ein Fehler dabei die schon erledigte Aktion scheitern lässt. */
    private static function merke(string $art, ?int $nachrichtId, string $nutzer, array $details): void
    {
        try {
            Speicher::ereignis($art, $nachrichtId, $nutzer, $details);
        } catch (\Throwable $t) {
            self::protokolliere($t);
        }
    }

    /** Stand eines Entwurfs zum Vergleich vor und nach dem Senden; null, wenn es ihn nicht gibt. */
    private static function entwurfStand(int $entwurfId): ?array
    {
        $st = Speicher::db()->prepare('SELECT nachricht_id, status, text_final, wissen_hash FROM entwurf WHERE id = ?');
        $st->execute([$entwurfId]);
        $w = $st->fetch(\PDO::FETCH_ASSOC);
        if (!is_array($w) || (int) ($w['nachricht_id'] ?? 0) <= 0) {
            return null;
        }
        return [
            'nachricht_id' => (int) $w['nachricht_id'],
            'status'       => (string) ($w['status'] ?? ''),
            'text_final'   => (string) ($w['text_final'] ?? ''),
            'wissen_hash'  => (string) ($w['wissen_hash'] ?? ''),
        ];
    }

    /** Eine Zeile ohne Steuerzeichen, auf $max Zeichen gekürzt. */
    private static function einzeilig(string $text, int $max): string
    {
        return mb_substr(trim((string) preg_replace('/[\p{C}\s]+/u', ' ', $text)), 0, $max);
    }

    /** Erster Buchstabe groß („vor 3 Minuten“ → „Vor 3 Minuten“). */
    private static function grossAnfang(string $text): string
    {
        return mb_strtoupper(mb_substr($text, 0, 1)) . mb_substr($text, 1);
    }

    private static function statusVon(int $nachrichtId): string
    {
        $st = Speicher::db()->prepare('SELECT status FROM nachricht WHERE id = ?');
        $st->execute([$nachrichtId]);
        $status = $st->fetchColumn();
        return is_string($status) ? $status : '';
    }

    /** true, wenn nachricht_id in der Tabelle leer (NULL) sein darf; sonst wird 0 als „ohne Bezug“ gesetzt. */
    private static function spalteDarfLeerSein(\PDO $db, string $tabelle): bool
    {
        if (!in_array($tabelle, ['verbrauch', 'ereignis'], true)) {
            return false;
        }
        $st = $db->prepare('SELECT "notnull" FROM pragma_table_info(?) WHERE name = ?');
        $st->execute([$tabelle, 'nachricht_id']);
        $notnull = $st->fetchColumn();
        return $notnull !== false && (int) $notnull === 0;
    }

    /** Aus „<login>:<bearbeiter>“ nur den Namen der Person – der Login-Name gehört nicht auf den Bildschirm. */
    private static function nurBearbeiter(string $kennung): string
    {
        $pos = strpos($kennung, ':');
        return $pos === false ? '' : trim(substr($kennung, $pos + 1));
    }

    private static function berlin(int $zeit): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@' . $zeit))->setTimezone(new \DateTimeZone('Europe/Berlin'));
    }

    /** Kalendertag in Berlin, um $versatzTage verschoben (nach der Uhr, nicht nach 24 Stunden – Zeitumstellung). */
    private static function tag(int $zeit, int $versatzTage): string
    {
        $t = self::berlin($zeit);
        if ($versatzTage !== 0) {
            $t = $t->modify(($versatzTage > 0 ? '+' : '') . $versatzTage . ' day');
        }
        return $t->format('Y-m-d');
    }

    /** „22.11.2026, 14:05 Uhr“ */
    public static function datum(int $zeit): string
    {
        return self::berlin($zeit)->format('d.m.Y, H:i') . ' Uhr';
    }

    /** „2026-11-22“ → „22.11.2026“; anderes bleibt, wie es ist. */
    private static function datumKurz(string $iso): string
    {
        return preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m) === 1 ? $m[3] . '.' . $m[2] . '.' . $m[1] : $iso;
    }

    /** „gerade eben“, „vor 3 Minuten“, „vor 2 Stunden“, „vor 4 Tagen“ */
    public static function vorZeit(int $sekunden): string
    {
        if ($sekunden < 90) {
            return 'gerade eben';
        }
        if ($sekunden < 3600) {
            $n = (int) round($sekunden / 60);
            return 'vor ' . $n . ' Minuten';
        }
        if ($sekunden < 172800) {
            $n = (int) round($sekunden / 3600);
            return 'vor ' . ($n === 1 ? 'einer Stunde' : $n . ' Stunden');
        }
        return 'vor ' . (int) round($sekunden / 86400) . ' Tagen';
    }
}
