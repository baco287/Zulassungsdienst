<?php
/**
 * Versand der freigegebenen Antworten und der internen Hinweis-Mails.
 *
 * Die KI schreibt, ein Mensch sendet: Diese Klasse wird nur vom Admin-Bereich aus
 * angestoßen (Kern::sende) – und für kurze Hinweise an das eigene Postfach (sendeIntern).
 *
 * DREI AUSGÄNGE (Bauplan 7.3): Beim Senden kann mehr passieren als „geklappt“ und
 * „gescheitert“. Bricht die Verbindung ab, nachdem die Mail schon übertragen wurde, weiß
 * niemand, ob der Kunde sie bekommt. Ein zweiter Versuch könnte dieselbe Antwort doppelt
 * zustellen. Deshalb unterscheidet sende():
 *   'gesendet'   der Mailserver hat die Einlieferung mit 250 bestätigt
 *   'abgelehnt'  eindeutiger Fehler, bevor oder als Antwort auf die Einlieferung –
 *                nichts ist rausgegangen, der Entwurf darf wieder „offen“ sein
 *   'unklar'     Verbindung nach Beginn der Übertragung ohne Antwort abgebrochen (oder eine
 *                Antwort, die weder 250 noch ein Fehlercode ist) – ein Mensch muss nachsehen,
 *                nie automatisch wiederholen
 *
 * Die SMTP-Sitzung folgt smtpSitzung() in public/api/auftrag.php (STARTTLS, Zertifikats-
 * prüfung, Anmeldung). Die Mail selbst baut symfony/mime: nur Text, UTF-8, mit Bezug auf
 * die Kundenmail (In-Reply-To, References), damit sie im Mailprogramm im selben Verlauf
 * erscheint. Kein „Auto-Submitted“ – hier antwortet ein Mensch.
 *
 * Meldungen in $antwort nennen den Schritt und die Antwort des Mailservers, nie Mailinhalt,
 * Zugangsdaten oder Adressen.
 */

declare(strict_types=1);

namespace KZP\Assistent;

use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;

final class Versand
{
    /** Anzeigename im Absender der Kundenantworten (Bauplan 4.9); auch die Zeile unter dem englischen Gruß. */
    private const ABSENDER_NAME = 'KFZ-Zulassungsprofis';

    /** Gruß einer englischen Antwort (Sprache „en“ am Entwurf). Anrede: „Hello <Name>,“ bzw. „Hello,“. */
    private const GRUSS_ENGLISCH = 'Kind regards';

    /** Anzeigename der internen Hinweis-Mails – im Posteingang sofort zu unterscheiden. */
    private const INTERN_NAME = 'KI-Assistent KFZ-Zulassungsprofis';

    /** Obergrenze für alles, was diese Klasse sendet (Kundenantworten und Hinweise). */
    private const MAX_JE_STUNDE = 40;

    /** Sekunden je SMTP-Schritt; nach der Übertragung wartet der Server länger (Spamprüfung). */
    private const SMTP_ZEITLIMIT = 15;
    private const SMTP_ZEITLIMIT_EINLIEFERUNG = 30;

    /** Höchstdauer aller Schritte vor der Übertragung zusammen (danach gilt „abgelehnt“). */
    private const SMTP_ZEITLIMIT_GESAMT = 45;

    /**
     * Abstände der internen Mails (Bauplan 7.6): Hinweis „Entwürfe warten“ höchstens alle
     * 30 Minuten, Störung je Ursache höchstens alle 12 Stunden. Diese Klasse ist die EINZIGE
     * Stelle, die das zählt (Kern ruft sendeIntern() ohne eigenen Zähler auf) – ein zweiter
     * Zähler beim Aufrufer würde die Fenster gegeneinander verschieben, und jeder zweite
     * Hinweis fiele aus.
     */
    private const FENSTER_HINWEIS_SEK = 1800;
    private const FENSTER_STOERUNG_SEK = 43200;

    /**
     * Wörter, die zeigen, dass der Anzeigename keine Person ist („Autohaus Beispiel GmbH“,
     * „Info Team“). Dann lautet die Anrede schlicht „Guten Tag,“.
     */
    private const KEINE_NAMEN = [
        'gmbh', 'mbh', 'ug', 'ag', 'kg', 'ohg', 'gbr', 'ev', 'e.v', 'co', 'inc', 'ltd', 'se',
        'team', 'info', 'service', 'kundenservice', 'kundendienst', 'support', 'autohaus', 'firma',
        'buchhaltung', 'office', 'büro', 'mail', 'kontakt', 'shop', 'vertrieb', 'zentrale',
        'verwaltung', 'newsletter', 'werkstatt', 'kfz', 'website', 'sekretariat', 'empfang',
        'praxis', 'kanzlei', 'via', 'und',
    ];

    /**
     * Baut die Antwort auf eine Kundenmail.
     *
     * $nachricht ist die neutrale Nachricht oder die Zeile aus der Tabelle `nachricht`
     * (gleiche Feldnamen). Gibt es keinen zulässigen Empfänger – Adresse fehlt, ist
     * ungültig oder wäre die eigene –, sind 'roh', 'message_id' und 'an' leer; sende()
     * lehnt eine solche Mail ab. Die Methode wirft nie.
     *
     * @param array<string,mixed> $nachricht
     * @param array<string,mixed> $wissen
     * @return array{roh: string, message_id: string, an: string, betreff: string}
     */
    public static function baueAntwort(array $nachricht, string $text, array $wissen, string $sprache = 'de'): array
    {
        $betreff = self::antwortBetreff((string) ($nachricht['betreff'] ?? ''));
        $leer = ['roh' => '', 'message_id' => '', 'an' => '', 'betreff' => $betreff];

        $an = self::empfaenger($nachricht);
        if ($an === null) {
            return $leer;
        }
        try {
            $id = bin2hex(random_bytes(16)) . '@' . Umgebung::eigeneDomain();
            $mail = (new Email())
                ->from(new Address(self::absender(), self::ABSENDER_NAME))
                ->to($an)
                ->subject($betreff)
                ->date(self::zeitpunkt())
                ->text(self::crlf(self::koerper($nachricht, $text, $wissen, $sprache)), 'utf-8');
            $kopf = $mail->getHeaders();
            $kopf->addIdHeader('Message-ID', $id);

            // Bezug zur Kundenmail als Textkopfzeile: Message-IDs von Kunden halten sich nicht
            // immer an die Norm, und eine strenge Prüfung würde den Versand verhindern.
            $bezug = self::ids((string) ($nachricht['message_id'] ?? ''));
            $kette = self::ids(trim((string) ($nachricht['verweise'] ?? '')) !== ''
                ? (string) $nachricht['verweise']
                : (string) ($nachricht['in_reply_to'] ?? ''));
            if ($bezug !== []) {
                $kopf->addTextHeader('In-Reply-To', $bezug[0]);
                $kette = array_values(array_unique(array_merge($kette, [$bezug[0]])));
            }
            if ($kette !== []) {
                $kopf->addTextHeader('References', implode(' ', array_slice($kette, -20)));
            }
            $kopf->addTextHeader('X-KZP-Assistent', 'freigegeben');

            return [
                'roh' => $mail->toString(),
                'message_id' => '<' . $id . '>',
                'an' => $an->getEncodedAddress(),
                'betreff' => $betreff,
            ];
        } catch (\Throwable) {
            return $leer;
        }
    }

    /**
     * Genau der Text, der gesendet würde: Anrede, Antwort, Gruß und Fußzeile.
     *
     * @param array<string,mixed> $nachricht
     * @param array<string,mixed> $wissen
     */
    public static function vorschau(array $nachricht, string $text, array $wissen, string $sprache = 'de'): string
    {
        return self::koerper($nachricht, $text, $wissen, $sprache);
    }

    /**
     * Die Adresse, an die eine Antwort auf diese Nachricht tatsächlich ginge (Reply-To vor dem
     * Absender, nie die eigene, nur eine gültige) – leer, wenn es keine gibt. Dieselbe Regel wie
     * beim Senden: Folge-Mails werden nur bei gleichem Empfänger zusammengefasst, und die
     * Oberfläche zeigt genau diese Adresse als „Geht an“.
     *
     * @param array<string,mixed> $nachricht
     */
    public static function empfaengerAdresse(array $nachricht): string
    {
        $an = self::empfaenger($nachricht);
        return $an === null ? '' : strtolower($an->getAddress());
    }

    /**
     * true, wenn die Antwort an eine andere Adresse ginge als an den Absender (Reply-To weicht
     * ab). Absender lassen sich fälschen; die Antwortadresse einer gefälschten Mail ist die des
     * Fälschers. Deshalb verlangt Kern::sende dann eine ausdrückliche Bestätigung.
     *
     * @param array<string,mixed> $nachricht
     */
    public static function empfaengerWeichtAb(array $nachricht): bool
    {
        $an = self::empfaengerAdresse($nachricht);
        $von = strtolower(trim((string) ($nachricht['von_adresse'] ?? '')));
        return $an !== '' && $von !== '' && $an !== $von;
    }

    /**
     * Sendet eine fertige Mail an genau einen Empfänger.
     *
     * Lokal mit KZP_ASSISTENT_VERSAND=datei wird nicht gesendet, sondern die Mail nach
     * <Datenordner>/ausgang/ geschrieben. Ohne diese Variable gilt auch lokal: nur mit
     * hinterlegtem SMTP-Zugang, sonst „abgelehnt“.
     *
     * @param array<string,mixed> $smtp ['host','port','user','pass','absender'] aus Zugang::smtp()
     * @return 'gesendet'|'abgelehnt'|'unklar'
     */
    public static function sende(array $smtp, string $an, string $roh, string &$antwort): string
    {
        $antwort = '';
        if (!self::adresseGueltig($an)) {
            $antwort = 'Keine gültige Empfängeradresse – nichts gesendet.';
            return 'abgelehnt';
        }
        if (trim($roh) === '') {
            $antwort = 'Leere Mail – nichts gesendet.';
            return 'abgelehnt';
        }
        try {
            $stand = Speicher::zaehle('smtp', 3600);
        } catch (\Throwable) {
            // Ohne Zähler lässt sich die Obergrenze nicht halten – dann lieber nicht senden.
            $antwort = 'Versandzähler nicht verfügbar – nichts gesendet.';
            return 'abgelehnt';
        }
        if ($stand > self::MAX_JE_STUNDE) {
            $antwort = 'Höchstens ' . self::MAX_JE_STUNDE . ' Sendungen je Stunde – bitte später erneut versuchen.';
            return 'abgelehnt';
        }

        $roh = (string) preg_replace('/\r\n|\r|\n/', "\r\n", $roh);

        if (Umgebung::lokal() && getenv('KZP_ASSISTENT_VERSAND') === 'datei') {
            return self::schreibeDatei($roh, $antwort);
        }

        $zugang = self::smtpZugang($smtp);
        if ($zugang === null) {
            $antwort = 'Kein SMTP-Zugang hinterlegt – nichts gesendet.';
            return 'abgelehnt';
        }
        return self::smtpSitzung($zugang, ['von' => $zugang['absender'], 'an' => $an, 'daten' => $roh], $antwort);
    }

    /**
     * Kurze Mail an das eigene Postfach (Bauplan 7.6): „Entwürfe warten“ ($art = 'hinweis')
     * oder eine Störung ($art = 'stoerung_<ursache>', z. B. 'stoerung_limit_monat'; auch
     * 'stoerung' allein). Nie mit Kundeninhalt – Betreff und Text stellt der Aufrufer aus
     * festen Sätzen und Zahlen zusammen.
     *
     * Kopfzeilen „Auto-Submitted: auto-generated“ (RFC 3834: kein Postfach antwortet
     * automatisch darauf) und „X-KZP-Assistent: hinweis“ (Störungen: „X-KZP-Assistent:
     * stoerung“, damit sich beide im Mailprogramm getrennt filtern lassen); dazu kommt die
     * eigene Adresse als Absender – die Regelstufe sortiert die Mail beim nächsten Abruf als
     * „eigene“ aus (jeder Wert der Kopfzeile genügt dafür).
     *
     * Versendet wird wie jede andere Mail über sende(): lokal mit KZP_ASSISTENT_VERSAND=datei
     * also in den Ordner „ausgang“, und die Obergrenze je Stunde gilt mit. true nur, wenn die
     * Mail eingeliefert (oder geschrieben) wurde. Wirft nie.
     *
     * Abstände: siehe FENSTER_HINWEIS_SEK. Störungen werden je Ursache gezählt – je Art und
     * zusätzlich je Betreff, damit auch zwei Ursachen mit derselben Art einander nicht
     * sperren. Gezählt wird erst nach erfolgreichem Versand, damit ein gescheiterter Versuch
     * den nächsten nicht unterdrückt.
     */
    public static function sendeIntern(string $betreff, string $text, string $art): bool
    {
        $art = strtolower((string) preg_replace('/[^A-Za-z0-9_\-]/', '', $art));
        $betreff = self::einzeilig($betreff, 200);
        if ($betreff === '') {
            $betreff = 'KI-Assistent';
        }
        $text = self::mehrzeilig($text);
        if ($art === '' || $text === '') {
            return false;
        }
        if ($art === 'hinweis') {
            $schluessel = 'intern:hinweis';
            $fenster = self::FENSTER_HINWEIS_SEK;
        } else {
            // Ziffern zählen nicht: „3 Versuche“ und „4 Versuche“ sind dieselbe Ursache.
            $ursache = mb_strtolower((string) preg_replace('/\d+/', '#', $betreff));
            $schluessel = 'intern:' . $art . ':' . substr(hash('sha256', $ursache), 0, 16);
            $fenster = self::FENSTER_STOERUNG_SEK;
        }
        try {
            if (Speicher::zaehlerstand($schluessel, $fenster) > 0) {
                return false;
            }
            $eigene = self::absender();
            $mail = (new Email())
                ->from(new Address($eigene, self::INTERN_NAME))
                ->to(new Address($eigene))
                ->subject($betreff)
                ->date(self::zeitpunkt())
                ->text(self::crlf($text . "\n"), 'utf-8');
            $kopf = $mail->getHeaders();
            $kopf->addIdHeader('Message-ID', bin2hex(random_bytes(16)) . '@' . Umgebung::eigeneDomain());
            $kopf->addTextHeader('Auto-Submitted', 'auto-generated');
            $kopf->addTextHeader('X-KZP-Assistent', $art === 'hinweis' ? 'hinweis' : 'stoerung');

            $antwort = '';
            if (self::sende(Zugang::smtp() ?? [], $eigene, $mail->toString(), $antwort) !== 'gesendet') {
                return false;
            }
            Speicher::zaehle($schluessel, $fenster);
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Meldet sich am Mailserver an und wieder ab, ohne etwas zu senden – für den Selbsttest.
     *
     * @param array<string,mixed> $smtp
     * @return array{ok: bool, meldung: string}
     */
    public static function pruefeAnmeldung(array $smtp): array
    {
        $zugang = self::smtpZugang($smtp);
        if ($zugang === null) {
            return ['ok' => false, 'meldung' => 'Kein SMTP-Zugang hinterlegt.'];
        }
        $antwort = '';
        $ok = self::smtpSitzung($zugang, null, $antwort) === 'gesendet';
        return ['ok' => $ok, 'meldung' => $ok ? 'Anmeldung am Mailserver erfolgreich.' : $antwort];
    }

    // -- Aufbau der Mail ------------------------------------------------------------------

    /**
     * Anrede, Antworttext, Gruß und Fußzeile – der Aufbau aus Bauplan 4.9.
     *
     * @param array<string,mixed> $nachricht
     * @param array<string,mixed> $wissen
     */
    private static function koerper(array $nachricht, string $text, array $wissen, string $sprache = 'de'): string
    {
        $text = self::mehrzeilig($text);
        // Englisch nur bei „en“; jede andere Sprache bekommt Anrede und Gruß auf Deutsch. Die
        // Fußzeile bleibt immer (Pflichtangaben).
        $englisch = $sprache === 'en';
        $gruss = $englisch ? self::GRUSS_ENGLISCH : self::einstellung('gruss', 'Freundliche Grüße');
        $name = $englisch ? self::ABSENDER_NAME : self::einstellung('absender_name', 'Ihr Team von ' . self::ABSENDER_NAME);
        $fuss = self::fuss($wissen);

        $koerper = self::anrede((string) ($nachricht['von_name'] ?? ''), $englisch) . "\n\n" . $text . "\n";
        $schluss = array_filter([$gruss, $name], static fn (string $zeile): bool => $zeile !== '');
        if ($schluss !== []) {
            $koerper .= "\n" . implode("\n", $schluss) . "\n";
        }
        if ($fuss !== '') {
            // „-- “ mit Leerzeichen ist der genormte Signaturtrenner: Mailprogramme blenden
            // alles darunter beim Antworten aus.
            $koerper .= "\n-- \n" . $fuss . "\n";
        }
        return $koerper;
    }

    /**
     * „Guten Tag Max Beispiel,“ nur, wenn der Anzeigename wie der Name einer Person aussieht:
     * zwei bis vier Wörter aus Buchstaben, Bindestrich und Punkt. Sonst neutral – eine
     * falsche Anrede ist peinlicher als eine schlichte.
     */
    private static function anrede(string $name, bool $englisch = false): string
    {
        $neutral = $englisch ? 'Hello,' : 'Guten Tag,';
        $name = trim((string) preg_replace('/\s+/u', ' ', $name));
        $woerter = $name === '' ? [] : explode(' ', $name);
        if (count($woerter) < 2 || count($woerter) > 4 || mb_strlen($name) > 60) {
            return $neutral;
        }
        // Durchgehend groß oder klein geschrieben ist meist ein Benutzername oder Formularfeld.
        if (mb_strtoupper($name) === $name || mb_strtolower($name) === $name) {
            return $neutral;
        }
        foreach ($woerter as $wort) {
            if (preg_match('/^\p{L}[\p{L}.\-]*$/u', $wort) !== 1
                || in_array(mb_strtolower(rtrim($wort, '.')), self::KEINE_NAMEN, true)) {
                return $neutral;
            }
        }
        return ($englisch ? 'Hello ' : 'Guten Tag ') . $name . ',';
    }

    /** „Re: …“ ohne die Kette „AW: Re: AW:“, die sich im Hin und Her sonst aufbaut. */
    private static function antwortBetreff(string $betreff): string
    {
        $kern = self::einzeilig($betreff, 200);
        $kern = trim((string) preg_replace('/^(?:\s*(?:re|aw|antw|antwort)\s*(?:\[\d+\])?\s*:)+\s*/iu', '', $kern));
        return 'Re: ' . ($kern !== '' ? $kern : 'Ihre Nachricht');
    }

    /**
     * Empfänger der Antwort: Reply-To, sonst Absender – aber nie die eigene Adresse und
     * immer nur eine. null, wenn keine brauchbare Adresse bleibt.
     *
     * @param array<string,mixed> $nachricht
     */
    private static function empfaenger(array $nachricht): ?Address
    {
        $eigene = Regeln::eigeneAdressen();
        foreach (['antwort_an', 'von_adresse'] as $feld) {
            $adresse = trim((string) ($nachricht[$feld] ?? ''));
            if ($adresse === '' || preg_match('/[\s,;<>"\x00-\x1F\x7F]/', $adresse) === 1) {
                continue;
            }
            if (in_array(strtolower($adresse), $eigene, true)) {
                continue;
            }
            try {
                $kandidat = new Address($adresse);
            } catch (\Throwable) {
                continue;
            }
            if (self::adresseGueltig($kandidat->getEncodedAddress())) {
                return $kandidat;
            }
        }
        return null;
    }

    /**
     * Fußzeile mit den Pflichtangaben: die Einstellung `fuss`, sonst aus der Wissensbasis.
     *
     * @param array<string,mixed> $wissen
     */
    private static function fuss(array $wissen): string
    {
        $eigen = self::mehrzeilig(self::einstellung('fuss', ''));
        if ($eigen !== '') {
            return $eigen;
        }
        $firma = is_array($wissen['firma'] ?? null) ? $wissen['firma'] : [];
        $wert = static fn (string $feld): string => is_scalar($firma[$feld] ?? null) ? self::mehrzeilig((string) $firma[$feld]) : '';

        $zeilen = [];
        // Sitz der Gesellschaft gehört zu den Pflichtangaben in Geschäftsbriefen (§ 35a GmbHG).
        foreach (['name', 'rechtsform', 'sitz', 'anschrift', 'register', 'vertretung'] as $feld) {
            if ($wert($feld) !== '') {
                $zeilen[] = $wert($feld);
            }
        }
        if ($wert('telefon') !== '') {
            $zeilen[] = (preg_match('/^(tel|fon|mobil)/iu', $wert('telefon')) === 1 ? '' : 'Telefon: ') . $wert('telefon');
        }
        if ($wert('email') !== '') {
            $zeilen[] = (preg_match('/^(e-?mail|mail)\b/iu', $wert('email')) === 1 ? '' : 'E-Mail: ') . $wert('email');
        }
        if ($wert('web') !== '') {
            $zeilen[] = $wert('web');
        }
        return implode("\n", $zeilen);
    }

    /**
     * Message-IDs aus einem Feld der Nachricht (dort stehen sie in spitzen Klammern, durch
     * Leerzeichen getrennt). Nur druckbares ASCII ohne Leerraum – sonst ließen sich über eine
     * präparierte Kundenmail Kopfzeilen einschleusen.
     *
     * @return string[]
     */
    private static function ids(string $feld): array
    {
        $ids = [];
        foreach (preg_split('/\s+/', trim($feld), -1, PREG_SPLIT_NO_EMPTY) ?: [] as $teil) {
            if (strlen($teil) <= 252 && preg_match('/^<[\x21-\x3B\x3D\x3F-\x7E]+>$/', $teil) === 1) {
                $ids[] = $teil;
            }
        }
        return $ids;
    }

    /** Absenderadresse: das Postfach des SMTP-Zugangs, ersatzweise info@<eigene Domain>. */
    private static function absender(): string
    {
        $absender = strtolower(trim((string) (Zugang::smtp()['absender'] ?? '')));
        return self::adresseGueltig($absender) ? $absender : 'info@' . Umgebung::eigeneDomain();
    }

    private static function zeitpunkt(): \DateTimeImmutable
    {
        return (new \DateTimeImmutable('@' . Umgebung::jetzt()))->setTimezone(new \DateTimeZone('Europe/Berlin'));
    }

    /** Eine einzelne Adresse in ASCII, wie sie in „RCPT TO“ stehen darf. */
    private static function adresseGueltig(string $adresse): bool
    {
        return $adresse !== ''
            && strlen($adresse) <= 254
            && preg_match('/[\s,;<>"\x00-\x1F\x7F]/', $adresse) !== 1
            && filter_var($adresse, FILTER_VALIDATE_EMAIL) !== false;
    }

    /** Einstellung aus der Datenbank; ist die nicht erreichbar, der feste Ersatzwert. */
    private static function einstellung(string $schluessel, string $ersatz): string
    {
        try {
            return self::mehrzeilig(Speicher::einstellung($schluessel));
        } catch (\Throwable) {
            return $ersatz;
        }
    }

    /** Text mit einheitlichen Zeilenenden, ohne Steuerzeichen und ohne Leerraum am Rand. */
    private static function mehrzeilig(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text) ?? $text;
        $text = preg_replace('/[ \t]+\n/', "\n", $text) ?? $text;
        return trim($text);
    }

    /**
     * Zeilenenden als CRLF, wie Mails sie verlangen. Schon vor der Kodierung nötig: PHP zählt
     * die Zeilenlänge für „quoted-printable“ nur nach CRLF neu und bräche sonst mitten im Wort um.
     */
    private static function crlf(string $text): string
    {
        return (string) preg_replace('/\r\n|\r|\n/', "\r\n", $text);
    }

    /** Eine Zeile für Kopfzeilen: keine Umbrüche (sonst wären eingeschleuste Kopfzeilen möglich). */
    private static function einzeilig(string $text, int $max): string
    {
        $text = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $text) ?? '';
        return mb_substr(trim($text), 0, $max);
    }

    // -- Zustellung -----------------------------------------------------------------------

    /**
     * Datei-Versand für Tests und lokale Vorschau.
     *
     * @return 'gesendet'|'abgelehnt'
     */
    private static function schreibeDatei(string $roh, string &$antwort): string
    {
        try {
            $ordner = Umgebung::datenOrdner() . '/ausgang';
            if (!is_dir($ordner) && !@mkdir($ordner, 0700, true) && !is_dir($ordner)) {
                throw new \RuntimeException('Ordner fehlt');
            }
            $name = Umgebung::jetzt() . '-' . bin2hex(random_bytes(4)) . '.eml';
            if (@file_put_contents($ordner . '/' . $name, $roh, LOCK_EX) === false) {
                throw new \RuntimeException('Schreiben fehlgeschlagen');
            }
            $antwort = 'Datei-Versand: ausgang/' . $name;
            return 'gesendet';
        } catch (\Throwable) {
            $antwort = 'Datei-Versand: Ausgangsordner nicht beschreibbar – nichts gesendet.';
            return 'abgelehnt';
        }
    }

    /**
     * Prüft den Zugang und bringt ihn in feste Form.
     *
     * @param array<string,mixed> $smtp
     * @return array{host: string, port: int, user: string, pass: string, absender: string}|null
     */
    private static function smtpZugang(array $smtp): ?array
    {
        $host = trim((string) ($smtp['host'] ?? ''));
        $user = (string) ($smtp['user'] ?? '');
        $pass = (string) ($smtp['pass'] ?? '');
        $absender = strtolower(trim((string) ($smtp['absender'] ?? '')));
        if ($host === '' || $user === '' || $pass === '' || !self::adresseGueltig($absender)
            || preg_match('/^[A-Za-z0-9.\-]+$/', $host) !== 1) {
            return null;
        }
        return ['host' => $host, 'port' => (int) ($smtp['port'] ?? 587) ?: 587, 'user' => $user, 'pass' => $pass, 'absender' => $absender];
    }

    /**
     * Eine SMTP-Sitzung: anmelden und – wenn $post gesetzt ist – genau eine Mail einliefern.
     * Ohne $post nur An- und Abmelden ('gesendet' heißt dann: Anmeldung in Ordnung).
     *
     * @param array{host: string, port: int, user: string, pass: string, absender: string} $z
     * @param array{von: string, an: string, daten: string}|null $post
     * @return 'gesendet'|'abgelehnt'|'unklar'
     */
    private static function smtpSitzung(array $z, ?array $post, string &$antwort): string
    {
        // Gesamtfrist für alles vor der Übertragung: Ein Server, der jeden Schritt knapp unter
        // dem Zeitlimit beantwortet, soll den Admin-Bereich nicht minutenlang aufhalten.
        $frist = microtime(true) + self::SMTP_ZEITLIMIT_GESAMT;
        $tlsDirekt = $z['port'] === 465;
        $kontext = stream_context_create(['ssl' => [
            'peer_name'        => $z['host'],
            'verify_peer'      => true,
            'verify_peer_name' => true,
            'SNI_enabled'      => true,
        ]]);
        $errno = 0;
        $errstr = '';
        $s = @stream_socket_client(
            ($tlsDirekt ? 'ssl://' : 'tcp://') . $z['host'] . ':' . $z['port'],
            $errno,
            $errstr,
            self::SMTP_ZEITLIMIT,
            STREAM_CLIENT_CONNECT,
            $kontext
        );
        if ($s === false) {
            $antwort = 'Verbindung zum Mailserver fehlgeschlagen.';
            return 'abgelehnt';
        }
        stream_set_timeout($s, self::SMTP_ZEITLIMIT);

        // Liest eine (auch mehrzeilige) Antwort. Code 0 heißt: keine vollständige Antwort.
        $lies = static function () use ($s): array {
            $text = '';
            $fertig = false;
            while (($zeile = fgets($s, 2048)) !== false) {
                $text .= $zeile;
                // „250-…“ geht weiter, „250 …“ ist die letzte Zeile.
                if (strlen($zeile) < 4 || $zeile[3] !== '-') {
                    $fertig = str_ends_with($zeile, "\n");
                    break;
                }
            }
            $code = ($fertig && preg_match('/^\d{3}/', $text) === 1) ? (int) substr($text, 0, 3) : 0;
            return [$code, self::ohneAdressen($text)];
        };
        $schritt = static function (?string $befehl, array $erwartet, string $name) use ($s, $lies, $frist, &$antwort): bool {
            $rest = $frist - microtime(true);
            if ($rest <= 0) {
                $antwort = $name . ': Zeitlimit für die Anmeldung am Mailserver überschritten';
                return false;
            }
            stream_set_timeout($s, (int) min(self::SMTP_ZEITLIMIT, max(1, ceil($rest))));
            if ($befehl !== null && @fwrite($s, $befehl . "\r\n") === false) {
                $antwort = $name . ': Schreiben fehlgeschlagen';
                return false;
            }
            [$code, $text] = $lies();
            $antwort = $name . ': ' . ($code === 0 ? 'keine Antwort des Mailservers' : $text);
            return in_array($code, $erwartet, true);
        };
        $ende = static function (string $ergebnis) use ($s, &$antwort): string {
            $letzte = $antwort;
            // Abmelden ist Höflichkeit; das Ergebnis steht vorher fest. Deshalb nur kurz warten.
            stream_set_timeout($s, 5);
            if (@fwrite($s, "QUIT\r\n") !== false) {
                @fgets($s, 2048);
            }
            @fclose($s);
            $antwort = $letzte;
            return $ergebnis;
        };

        $ehlo = 'EHLO ' . Umgebung::eigeneDomain();
        $ok = $schritt(null, [220], 'Begrüßung') && $schritt($ehlo, [250], 'EHLO');
        if ($ok && !$tlsDirekt) {
            // Ohne Verschlüsselung gehen keine Zugangsdaten über die Leitung.
            $ok = $schritt('STARTTLS', [220], 'STARTTLS');
            if ($ok && @stream_socket_enable_crypto($s, true, STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT) !== true) {
                $ok = false;
                $antwort = 'TLS-Aufbau fehlgeschlagen (Zertifikat oder Verschlüsselung)';
            }
            $ok = $ok && $schritt($ehlo, [250], 'EHLO nach STARTTLS');
        }
        $ok = $ok
            && $schritt('AUTH LOGIN', [334], 'AUTH')
            && $schritt(base64_encode($z['user']), [334], 'AUTH Benutzer')
            && $schritt(base64_encode($z['pass']), [235], 'AUTH Passwort');
        if (!$ok) {
            return $ende('abgelehnt');
        }
        if ($post === null) {
            return $ende('gesendet');
        }

        $ok = $schritt('MAIL FROM:<' . $post['von'] . '>', [250], 'MAIL FROM')
            && $schritt('RCPT TO:<' . $post['an'] . '>', [250, 251], 'RCPT TO')
            && $schritt('DATA', [354], 'DATA');
        if (!$ok) {
            // Bis hierher hat der Server noch keine Zeile der Mail gesehen.
            return $ende('abgelehnt');
        }

        // Ab jetzt gilt: Fehlt am Ende eine eindeutige Antwort, ist der Ausgang unklar.
        // Punkt am Zeilenanfang verdoppeln (RFC 5321, „dot-stuffing“).
        $daten = (string) preg_replace('/^\./m', '..', $post['daten']);
        if (!str_ends_with($daten, "\r\n")) {
            $daten .= "\r\n";
        }
        $daten .= ".\r\n";
        stream_set_timeout($s, self::SMTP_ZEITLIMIT_EINLIEFERUNG);
        $laenge = strlen($daten);
        for ($pos = 0; $pos < $laenge;) {
            $geschrieben = @fwrite($s, substr($daten, $pos, 65536));
            if ($geschrieben === false || $geschrieben === 0) {
                @fclose($s);
                $antwort = 'Einlieferung: Verbindung während der Übertragung abgebrochen';
                return 'unklar';
            }
            $pos += $geschrieben;
        }
        [$code, $text] = $lies();
        if ($code === 0) {
            @fclose($s);
            $antwort = 'Einlieferung: keine Antwort des Mailservers nach der Übertragung';
            return 'unklar';
        }
        $antwort = 'Einlieferung: ' . $text;
        // Nur 250 heißt angenommen, nur 4xx/5xx eindeutig abgelehnt. Alles andere (eine
        // ungewöhnliche Antwort wie „251“) lässt offen, ob die Mail unterwegs ist.
        return $ende(match (true) {
            $code === 250 => 'gesendet',
            $code >= 400 && $code < 600 => 'abgelehnt',
            default => 'unklar',
        });
    }

    /** Antwort des Mailservers in einer Zeile und ohne Mailadressen (die nennt er z. B. bei „RCPT TO“). */
    private static function ohneAdressen(string $text): string
    {
        $text = trim((string) preg_replace('/\s+/', ' ', $text));
        $text = (string) preg_replace('/<?[^\s<>@]+@[^\s<>@]+>?/', '[Adresse]', $text);
        return mb_substr($text, 0, 300);
    }
}
