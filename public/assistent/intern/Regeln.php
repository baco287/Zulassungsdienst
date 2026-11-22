<?php
/**
 * Regelstufe des KI-Assistenten – entscheidet OHNE KI, welche Mails gar nicht erst zum
 * Modell gehen.
 *
 * WARUM eine eigene Stufe: Der größte Teil des Posteingangs sind keine Kundenfragen
 * (Aufträge aus dem eigenen Formular, Newsletter, Abwesenheitsnotizen, Unzustellbarkeits-
 * meldungen). Dafür einen bezahlten Modellaufruf zu machen, wäre Verschwendung – und auf
 * eine automatische Mail einen Antwort-Entwurf zu legen, ist der erste Schritt in eine
 * Mail-Schleife (RFC 3834). Deshalb gilt: im Zweifel aussortieren und dem Menschen zeigen.
 *
 * Geprüft wird in fester Reihenfolge, die erste zutreffende Regel gewinnt (Bauplan 4.7
 * und 7.4). Leere Kategorie heißt: echte Anfrage, die KI darf einen Entwurf schreiben.
 *
 * Der Grund ist ein fester Satz für die Liste im Admin-Bereich – nie Mailinhalt.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Regeln
{
    /** Referenznummer des Website-Formulars (api/auftrag.php), dazu das frühere Präfix „DZ“. */
    private const REFERENZ = '/\b(?:KZP|DZ)-\d{8}-[A-Z0-9]{4}\b/';

    /** X-Mailer der eigenen Formular-Mails (api/auftrag.php, sendMail). */
    private const FORMULAR_MAILER = 'kfz-zulassungsprofis-form';

    /**
     * Frühere Domain des Betriebs. Mails dorthin sind an uns gerichtet und deshalb keine
     * „Kopie“. Als Absender zählt sie bewusst nicht zu den eigenen Adressen.
     */
    private const WEITERE_DOMAINS = ['deutschezulassung.de'];

    /** Mehr Mails desselben Absenders in diesem Fenster gelten als Schleife. */
    private const SCHLEIFE_MAX = 8;
    private const SCHLEIFE_FENSTER_SEK = 3600;

    /** Ältere Mails beantwortet die KI nicht mehr von sich aus (z. B. nach einer Pause). */
    private const ZU_ALT_SEK = 86400;

    /** Ab so vielen Empfängern ist es ein Rundschreiben und keine Anfrage an uns. */
    private const MAX_EMPFAENGER = 3;

    /** Betreff-Anfänge automatischer Antworten. */
    private const AUTO_BETREFF = [
        'automatische antwort', 'abwesenheit', 'out of office', 'auto:',
        'automatic reply', 'autoreply', 'auto-reply', 'auto reply',
    ];

    /**
     * @param array<string,mixed> $mail neutrale Nachricht (Bauplan 4.8 und 7.4)
     * @return array{kategorie: string, grund: string}
     */
    public static function pruefe(array $mail, string $bereinigterText): array
    {
        $von = strtolower(trim((string) ($mail['von_adresse'] ?? '')));
        $lokal = (string) strstr($von . '@', '@', true);
        $betreff = trim((string) ($mail['betreff'] ?? ''));
        $betreffKlein = mb_strtolower($betreff);
        $kopf = self::kopf($mail);
        $eigene = self::eigeneAdressen();
        $vonEigener = $von !== '' && in_array($von, $eigene, true);

        // 1. Auftrag aus dem eigenen Website-Formular. Der Kunde steht dort nur im Reply-To;
        //    ein Entwurf darauf wäre eine Antwort an uns selbst. Der X-Mailer des Formulars
        //    zählt mit, falls das Formular über ein anderes Konto der eigenen Domain sendet als
        //    das, das der Assistent liest – aber nur dann: Eine Kopfzeile allein kann jeder setzen.
        $vonEigenerDomain = $von !== '' && str_ends_with($von, '@' . strtolower(Umgebung::eigeneDomain()));
        if (preg_match(self::REFERENZ, $betreff) === 1
            && ($vonEigener || ($vonEigenerDomain && strtolower($kopf['x-mailer']) === self::FORMULAR_MAILER))) {
            return self::treffer('formular', 'Auftrag über die Website (Formular mit Referenznummer)');
        }

        // 2. Alles Übrige vom eigenen Postfach und die Hinweis-Mails des Assistenten.
        if ($vonEigener) {
            return self::treffer('eigene', 'Absender ist das eigene Postfach');
        }
        if ($kopf['x-kzp-assistent'] !== '') {
            return self::treffer('eigene', 'Vom Assistenten selbst erzeugte Mail');
        }

        // 3. Unzustellbarkeitsmeldungen. Der leere Return-Path allein steht weiter unten:
        //    Auch Abwesenheitsnotizen tragen ihn, und die sollen in der Liste nicht als
        //    „unzustellbar“ erscheinen – sonst sucht der Mitarbeiter einen Adressfehler.
        $inhaltstyp = strtolower($kopf['content-type']);
        if (in_array($lokal, ['mailer-daemon', 'postmaster'], true)) {
            return self::treffer('unzustellbar', 'Meldung des Mailservers (Absender ' . $lokal . ')');
        }
        if (str_starts_with($inhaltstyp, 'multipart/report') && !str_contains($inhaltstyp, 'disposition-notification')) {
            return self::treffer('unzustellbar', 'Zustellbericht eines Mailservers');
        }

        // 4. Automatische Antworten (Abwesenheit, Autoresponder, Lesebestätigung).
        $auto = strtolower(trim((string) strtok($kopf['auto-submitted'] . ';', ';')));
        if ($auto !== '' && $auto !== 'no') {
            return self::treffer('automatisch', 'Automatisch erzeugte Mail (Auto-Submitted)');
        }
        // Diese Kopfzeile setzen Exchange und viele Systeme an eigene Automatik-Mails (Abwesenheit,
        // Benachrichtigungen); Mailprogramme setzen sie an gewöhnliche Mails nicht.
        if ($kopf['x-auto-response-suppress'] !== '') {
            return self::treffer('automatisch', 'Automatisch erzeugte Mail (X-Auto-Response-Suppress)');
        }
        $vorrang = strtolower(trim($kopf['precedence']));
        if ($vorrang === 'auto_reply' || $kopf['x-autoreply'] !== '' || $kopf['x-autorespond'] !== '') {
            return self::treffer('automatisch', 'Automatische Antwort (Kopfzeile des Absenders)');
        }
        if (str_contains($inhaltstyp, 'disposition-notification')) {
            return self::treffer('automatisch', 'Lesebestätigung');
        }
        foreach (self::AUTO_BETREFF as $anfang) {
            if (str_starts_with($betreffKlein, $anfang)) {
                return self::treffer('automatisch', 'Automatische Antwort (Betreff)');
            }
        }
        if (trim($kopf['return-path']) === '<>') {
            return self::treffer('unzustellbar', 'Meldung eines Mailservers (leerer Return-Path)');
        }

        // 5. Newsletter, Rundschreiben und Systemmeldungen.
        foreach ($kopf as $name => $wert) {
            if ($wert !== '' && str_starts_with($name, 'list-')) {
                return self::treffer('newsletter', 'Verteilerliste oder Newsletter (' . $name . ')');
            }
        }
        if (in_array($vorrang, ['bulk', 'list', 'junk'], true)) {
            return self::treffer('newsletter', 'Massenmail (Precedence: ' . $vorrang . ')');
        }
        if (preg_match('/(^|[._+\-])(no-?reply|do-?not-?reply|newsletter|mailer|notifications?)($|[._+\-])/', $lokal) === 1) {
            return self::treffer('newsletter', 'Absender nimmt keine Antworten an (' . $lokal . '@…)');
        }

        // 5b. Ohne jede Antwortadresse (kein From, kein Reply-To): Ein Entwurf ließe sich gar
        //     nicht senden – und ohne Absender greifen weder Absendergrenze noch Schleifenschutz.
        $antwortAn = strtolower(trim((string) ($mail['antwort_an'] ?? '')));
        if ($von === '' && $antwortAn === '') {
            return self::treffer('kein_absender', 'Mail ohne Absenderadresse – eine Antwort ist nicht möglich');
        }

        // 6. und 7. Vom Inhaber festgelegte Absenderregeln.
        $regel = self::absenderRegel($von);
        if ($regel !== null && $regel['art'] === 'ignorieren') {
            return self::treffer('absenderregel', 'Absenderregel „ignorieren“ (' . $regel['muster'] . ')');
        }
        if ($regel !== null && $regel['art'] === 'immer_mensch') {
            return self::treffer('mensch', 'Absenderregel „immer selbst beantworten“ (' . $regel['muster'] . ')');
        }

        // 8. Im Mailprogramm schon beantwortet.
        foreach ((array) ($mail['flags'] ?? []) as $flag) {
            if (is_string($flag) && strcasecmp($flag, '\\Answered') === 0) {
                return self::treffer('beantwortet', 'Im Postfach bereits als beantwortet markiert');
            }
        }

        // 9. Nur in Kopie oder Rundmail (Bauplan 7.4). Ohne Empfängerliste lässt sich das
        //    nicht beurteilen – dann greift die Regel nicht.
        if (is_array($mail['an'] ?? null)) {
            $an = array_map(static fn ($a): string => strtolower(trim((string) $a)), $mail['an']);
            $cc = array_map(static fn ($a): string => strtolower(trim((string) $a)), (array) ($mail['cc'] ?? []));
            if (count(array_unique(array_merge($an, $cc))) > self::MAX_EMPFAENGER) {
                return self::treffer('kopie', 'Rundmail an mehr als ' . self::MAX_EMPFAENGER . ' Empfänger');
            }
            if (!self::anUns($an, $eigene)) {
                return self::treffer('kopie', 'Nur in Kopie erhalten (eigene Adresse steht nicht im An-Feld)');
            }
        }

        // 10. Vom Mailserver als Spam markiert.
        if (strtolower(trim($kopf['x-spam-flag'])) === 'yes'
            || str_starts_with(strtolower(ltrim($kopf['x-spam-status'])), 'yes')
            || str_starts_with($betreff, '***SPAM***')) {
            return self::treffer('spam', 'Vom Mailserver als Spam markiert');
        }

        // 11. Zu alt für eine Antwort der KI – ein Mensch entscheidet, ob noch geantwortet wird.
        $datum = (int) ($mail['datum'] ?? 0);
        if ($datum > 0 && Umgebung::jetzt() - $datum > self::ZU_ALT_SEK) {
            return self::treffer('zu_alt', 'Mail ist älter als 24 Stunden');
        }

        // 12. Kein verwertbarer Text: leer (nur Anhang) oder nur eine kurze Antwort wie „Ja,
        //     bitte.“ oder „Danke!“ – das Zitat, ohne das sie nicht verständlich wäre, geht nie
        //     an die KI. Ein Mensch sieht die Mail und entscheidet.
        $eigenerText = trim($bereinigterText);
        if ($eigenerText === '') {
            return self::treffer('nur_anhang', 'Kein Text – nur Anhang oder leere Mail');
        }
        if (mb_strlen($eigenerText) < Text::MINDEST_ZEICHEN) {
            return self::treffer('kurz', 'Nur eine kurze Antwort (etwa „Danke“ oder „Ja, bitte“)');
        }

        // 13. Schleifenschutz: Wer in einer Stunde mehr als acht Mails schickt, ist ein
        //     Automat oder ein Ping-Pong mit einem fremden Autoresponder. Gezählt wird erst
        //     hier, also nur, was sonst wirklich zur KI ginge. Ohne From zählt die Antwortadresse.
        $schleife = $von !== '' ? $von : $antwortAn;
        if ($schleife !== '' && self::zaehleAbsender($schleife) > self::SCHLEIFE_MAX) {
            return self::treffer('schleife', 'Mehr als ' . self::SCHLEIFE_MAX . ' Mails dieses Absenders in 60 Minuten');
        }

        return ['kategorie' => '', 'grund' => ''];
    }

    /**
     * Adressen, unter denen der Betrieb selbst sendet (klein geschrieben): das Postfach des
     * Assistenten, der Absender des SMTP-Zugangs und info@<eigene Domain>. Auch der Versand
     * nutzt die Liste, damit nie eine Antwort an uns selbst geht.
     *
     * @return string[]
     */
    public static function eigeneAdressen(): array
    {
        $liste = ['info@' . strtolower(Umgebung::eigeneDomain())];
        $kandidaten = [(string) (Zugang::smtp()['absender'] ?? ''), (string) (Zugang::imap()['user'] ?? '')];
        foreach ($kandidaten as $adresse) {
            $adresse = strtolower(trim($adresse));
            if ($adresse !== '' && filter_var($adresse, FILTER_VALIDATE_EMAIL) !== false) {
                $liste[] = $adresse;
            }
        }
        return array_values(array_unique($liste));
    }

    // -- Hilfen ---------------------------------------------------------------------------

    /** @return array{kategorie: string, grund: string} */
    private static function treffer(string $kategorie, string $grund): array
    {
        return ['kategorie' => $kategorie, 'grund' => $grund];
    }

    /**
     * Kopfzeilen mit kleingeschriebenen Namen; die hier abgefragten sind immer vorhanden
     * (leer, wenn die Mail sie nicht trägt), damit die Regeln ohne isset() auskommen.
     *
     * @param array<string,mixed> $mail
     * @return array<string,string>
     */
    private static function kopf(array $mail): array
    {
        $kopf = [
            'auto-submitted' => '', 'precedence' => '', 'x-auto-response-suppress' => '',
            'return-path' => '', 'content-type' => '', 'x-kzp-assistent' => '', 'x-mailer' => '',
            'x-spam-flag' => '', 'x-spam-status' => '', 'x-autoreply' => '', 'x-autorespond' => '',
        ];
        foreach ((array) ($mail['kopf'] ?? []) as $name => $wert) {
            if (is_string($name) && is_scalar($wert)) {
                $kopf[strtolower($name)] = trim((string) $wert);
            }
        }
        return $kopf;
    }

    /**
     * Steht im An-Feld eine unserer Adressen oder eine Adresse unserer Domains?
     *
     * @param string[] $an
     * @param string[] $eigene
     */
    private static function anUns(array $an, array $eigene): bool
    {
        $domains = array_merge([strtolower(Umgebung::eigeneDomain())], self::WEITERE_DOMAINS);
        foreach ($eigene as $adresse) {
            $domains[] = substr((string) strrchr($adresse, '@'), 1);
        }
        foreach ($an as $adresse) {
            if (in_array($adresse, $eigene, true)) {
                return true;
            }
            $domain = substr((string) strrchr($adresse, '@'), 1);
            if ($domain !== '' && in_array($domain, $domains, true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Sucht die passende Absenderregel. Eine Regel für die genaue Adresse geht einer Regel
     * für die ganze Domain vor (die genauere Angabe gewinnt). Öffentlich, weil der Kern sie vor
     * jedem KI-Aufruf noch einmal prüft: Ein Widerspruch gilt auch für schon wartende Mails.
     *
     * @return array{art: string, muster: string}|null
     */
    public static function absenderRegel(string $von): ?array
    {
        $von = strtolower(trim($von));
        $domain = strrchr($von, '@');
        if ($von === '' || $domain === false) {
            return null;
        }
        try {
            $abfrage = Speicher::db()->prepare(
                'SELECT muster, art FROM absender_regel WHERE lower(muster) IN (?, ?)'
            );
            $abfrage->execute([$von, strtolower($domain)]);
            $zeilen = $abfrage->fetchAll(\PDO::FETCH_ASSOC);
        } catch (\Throwable) {
            // Ohne Datenbank gibt es keine Regeln; der Lauf scheitert dann ohnehin beim Speichern.
            return null;
        }
        $gefunden = null;
        foreach ($zeilen as $zeile) {
            $muster = strtolower((string) $zeile['muster']);
            $regel = ['art' => (string) $zeile['art'], 'muster' => (string) $zeile['muster']];
            if ($muster === $von) {
                return $regel;
            }
            $gefunden ??= $regel;
        }
        return $gefunden;
    }

    /**
     * Zählt diese Mail für den Schleifenschutz und liefert den Stand im laufenden Fenster.
     * Im Zähler steht nur ein Fingerabdruck der Adresse, nicht die Adresse selbst.
     */
    private static function zaehleAbsender(string $von): int
    {
        try {
            return Speicher::zaehle('schleife:' . substr(hash('sha256', $von), 0, 24), self::SCHLEIFE_FENSTER_SEK);
        } catch (\Throwable) {
            return 0;
        }
    }
}
