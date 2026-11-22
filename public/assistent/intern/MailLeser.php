<?php
/**
 * Zerlegt eine rohe E-Mail (RFC 5322 / MIME) in die „neutrale Nachricht“ des Assistenten.
 *
 * Dies ist der EINZIGE Ort, an dem Mails zerlegt werden. ImapPostfach (echtes Postfach) und
 * DateiPostfach (.eml-Dateien der Tests) rufen beide ausRoh() auf – die Tests prüfen damit
 * genau den Weg, den im Betrieb auch die Kundenmails nehmen.
 *
 * DATENSPARSAMKEIT: Von Anhängen bleiben nur Art und Größe, keine Dateinamen und kein
 * Inhalt. Von den Kopfzeilen wird nur behalten, was die Regelstufe braucht (keine
 * Received-Zeilen mit Serveradressen, keine Signaturen).
 *
 * ROBUSTHEIT: Kundenmails sind oft nicht normgerecht. Eine verstümmelte Mail darf den Lauf
 * nicht anhalten; ausRoh() wirft deshalb nie, sondern liefert, was sich lesen ließ.
 */

declare(strict_types=1);

namespace KZP\Assistent;

use ZBateson\MailMimeParser\Header\AddressHeader;
use ZBateson\MailMimeParser\Header\DateHeader;
use ZBateson\MailMimeParser\Header\IdHeader;
use ZBateson\MailMimeParser\Header\ReceivedHeader;
use ZBateson\MailMimeParser\IMessage;
use ZBateson\MailMimeParser\MailMimeParser;
use ZBateson\MailMimeParser\Message\IMessagePart;
use ZBateson\MailMimeParser\Message\IMimePart;

final class MailLeser
{
    /** Kopfzeilen, die in jeder neutralen Nachricht stehen (leer, wenn die Mail sie nicht hat). */
    private const KOPF_IMMER = [
        'auto-submitted', 'precedence', 'list-id', 'list-unsubscribe',
        'x-auto-response-suppress', 'return-path', 'content-type', 'x-kzp-assistent',
    ];

    /** Weitere Kopfzeilen für die Regelstufe; dazu kommen alle, die mit „list-“ beginnen. */
    private const KOPF_ZUSATZ = ['x-mailer', 'x-spam-flag', 'x-spam-status', 'x-autoreply', 'x-autorespond'];

    /** Obergrenzen, damit eine einzelne Riesenmail weder Speicher noch Datenbank sprengt. */
    private const MAX_TEXT_BYTES = 300000;
    private const MAX_KOPF_ZEICHEN = 300;
    private const MAX_ADRESSEN = 50;
    private const MAX_ANHAENGE = 30;
    private const MAX_VERWEISE = 30;

    private static ?MailMimeParser $zerleger = null;

    /**
     * @param string[] $flags IMAP-Flags der Nachricht, z. B. ['\\Seen', '\\Answered']
     * @return array<string,mixed> neutrale Nachricht (Bauplan 4.8 und 7.4)
     */
    public static function ausRoh(string $roh, int $uid, int $uidvalidity, array $flags): array
    {
        $n = [
            'uid' => $uid,
            'uidvalidity' => $uidvalidity,
            'message_id' => '',
            'in_reply_to' => '',
            'verweise' => '',
            'von_adresse' => '',
            'von_name' => '',
            'antwort_an' => '',
            'betreff' => '',
            'datum' => Umgebung::jetzt(),
            'kopf' => array_fill_keys(self::KOPF_IMMER, ''),
            'flags' => array_values(array_filter($flags, 'is_string')),
            'text' => '',
            'ist_html' => false,
            'anhaenge' => [],
            'groesse' => strlen($roh),
            'an' => [],
            'cc' => [],
        ];
        if (trim($roh) === '') {
            return $n;
        }

        // Jeder Abschnitt für sich: Scheitert z. B. das Lesen eines Anhangs, bleiben
        // Absender, Betreff und Text trotzdem erhalten.
        try {
            $mail = self::zerleger()->parse($roh, true);
        } catch (\Throwable) {
            return $n;
        }
        try {
            self::liesKopf($mail, $n);
        } catch (\Throwable) {
            // Kopfzeilen nur teilweise lesbar – was bis hierher eingetragen ist, bleibt.
        }
        try {
            self::liesText($mail, $n);
        } catch (\Throwable) {
            // Kein lesbarer Text: Die Regelstufe sortiert die Mail dann als „nur Anhang“ aus.
        }
        try {
            $n['anhaenge'] = self::liesAnhaenge($mail);
        } catch (\Throwable) {
            // Anhänge unlesbar: Die Liste bleibt leer, der Text zählt trotzdem.
        }
        return $n;
    }

    // -- Kopfzeilen -----------------------------------------------------------------------

    /** @param array<string,mixed> $n */
    private static function liesKopf(IMessage $mail, array &$n): void
    {
        $von = $mail->getHeader('From');
        if ($von instanceof AddressHeader) {
            $n['von_adresse'] = self::adresse((string) $von->getEmail());
            $name = self::einzeilig((string) $von->getPersonName(), 100);
            // Manche Programme tragen die Adresse noch einmal als Namen ein.
            $n['von_name'] = str_contains($name, '@') ? '' : trim($name, " \"'");
        }
        $antwort = $mail->getHeader('Reply-To');
        if ($antwort instanceof AddressHeader) {
            $n['antwort_an'] = self::adresse((string) $antwort->getEmail());
        }
        $n['an'] = self::adressen($mail->getHeader('To'));
        $n['cc'] = self::adressen($mail->getHeader('Cc'));
        $n['betreff'] = self::einzeilig((string) $mail->getSubject(), 250);

        $n['message_id'] = self::ids($mail->getHeader('Message-ID'))[0] ?? '';
        $n['in_reply_to'] = self::ids($mail->getHeader('In-Reply-To'))[0] ?? '';
        $verweise = self::ids($mail->getHeader('References'));
        if (count($verweise) > self::MAX_VERWEISE) {
            // Der Anfang nennt den Ursprung des Vorgangs, das Ende die jüngsten Mails.
            $verweise = array_merge([$verweise[0]], array_slice($verweise, 1 - self::MAX_VERWEISE));
        }
        $n['verweise'] = implode(' ', $verweise);

        $n['datum'] = self::eingang($mail, (int) $n['datum']);

        foreach ($mail->getRawHeaders() as $zeile) {
            $name = strtolower(trim((string) ($zeile[0] ?? '')));
            if ($name === '' || (!in_array($name, self::KOPF_IMMER, true)
                && !in_array($name, self::KOPF_ZUSATZ, true)
                && !str_starts_with($name, 'list-'))) {
                continue;
            }
            // Bei doppelten Kopfzeilen zählt die oberste (die hat der letzte Server gesetzt).
            if (($n['kopf'][$name] ?? '') === '') {
                $n['kopf'][$name] = self::einzeilig((string) ($zeile[1] ?? ''), self::MAX_KOPF_ZEICHEN);
            }
        }
    }

    /**
     * Zeitpunkt des Eingangs. Maßgeblich ist die oberste Received-Zeile (die schreibt der
     * eigene Mailserver); das Date-Feld stammt vom Absender und kann falsch gehen oder
     * gefälscht sein. Unbrauchbare Werte fallen auf $ersatz zurück.
     */
    private static function eingang(IMessage $mail, int $ersatz): int
    {
        $kandidaten = [];
        $erhalten = $mail->getHeader('Received');
        if ($erhalten instanceof ReceivedHeader) {
            $kandidaten[] = $erhalten->getDateTime();
        }
        $datum = $mail->getHeader('Date');
        if ($datum instanceof DateHeader) {
            $kandidaten[] = $datum->getDateTime();
        }
        foreach ($kandidaten as $zeit) {
            $sekunden = $zeit instanceof \DateTimeInterface ? $zeit->getTimestamp() : 0;
            // Vor 2000 oder mehr als einen Tag in der Zukunft: Uhr des Absenders geht falsch.
            if ($sekunden > 946684800 && $sekunden < $ersatz + 86400) {
                return $sekunden;
            }
        }
        return $ersatz;
    }

    /**
     * Message-IDs einer Kopfzeile, einheitlich in spitzen Klammern („<id@host>“).
     *
     * @return string[]
     */
    private static function ids(mixed $kopfzeile): array
    {
        if (!$kopfzeile instanceof IdHeader) {
            return [];
        }
        $ids = [];
        foreach ($kopfzeile->getIds() as $id) {
            $id = trim((string) $id, " \t\r\n<>");
            // Nur druckbares ASCII ohne Leerraum – alles andere könnte später Kopfzeilen
            // der Antwort verfälschen. Ohne Buchstabe oder Ziffer ist es keine Kennung,
            // sondern ein Rest aus einer kaputten Liste („<a@x>,<b@x>“ ergibt sonst „<,>“).
            if ($id !== '' && strlen($id) <= 250 && preg_match('/^[\x21-\x3B\x3D\x3F-\x7E]+$/', $id) === 1
                && preg_match('/[A-Za-z0-9]/', $id) === 1) {
                $ids['<' . $id . '>'] = true;
            }
        }
        return array_keys($ids);
    }

    /**
     * Alle Adressen einer Empfänger-Kopfzeile, klein geschrieben.
     *
     * @return string[]
     */
    private static function adressen(mixed $kopfzeile): array
    {
        if (!$kopfzeile instanceof AddressHeader) {
            return [];
        }
        $liste = [];
        foreach ($kopfzeile->getAddresses() as $teil) {
            $adresse = self::adresse((string) $teil->getEmail());
            if ($adresse !== '') {
                $liste[$adresse] = true;
            }
            if (count($liste) >= self::MAX_ADRESSEN) {
                break;
            }
        }
        return array_keys($liste);
    }

    /** Eine Adresse, klein geschrieben; leer, wenn sie nicht nach einer Adresse aussieht. */
    private static function adresse(string $roh): string
    {
        $adresse = strtolower(trim($roh, " \t\r\n<>\"'"));
        if (strlen($adresse) > 254 || preg_match('/^[^\s@<>()\[\],;:"\x00-\x1F\x7F]+@[^\s@<>()\[\],;:"\x00-\x1F\x7F]+$/', $adresse) !== 1) {
            return '';
        }
        return $adresse;
    }

    /** Eine Zeile ohne Steuerzeichen und Umbrüche, auf $max Zeichen begrenzt. */
    private static function einzeilig(string $wert, int $max): string
    {
        if (!mb_check_encoding($wert, 'UTF-8')) {
            $wert = mb_scrub($wert, 'UTF-8');
        }
        $wert = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $wert) ?? '';
        $wert = preg_replace('/ {2,}/', ' ', $wert) ?? $wert;
        return mb_substr(trim($wert), 0, $max);
    }

    // -- Text -----------------------------------------------------------------------------

    /**
     * Textteil der Mail; gibt es keinen (oder nur einen leeren), der HTML-Teil.
     *
     * @param array<string,mixed> $n
     */
    private static function liesText(IMessage $mail, array &$n): void
    {
        $text = self::sammle($mail, false);
        if (trim($text) !== '') {
            $n['text'] = $text;
            return;
        }
        $html = self::sammle($mail, true);
        if (trim($html) !== '') {
            $n['text'] = $html;
            $n['ist_html'] = true;
        }
    }

    /**
     * Fügt alle Text- bzw. HTML-Teile zusammen. Mehrere gibt es z. B., wenn Apple Mail ein
     * Foto mitten in den Text setzt: Text, Bild, Text.
     *
     * Ein Teil MIT Dateinamen ist ein Anhang, auch wenn er als „inline“ oder ganz ohne
     * Content-Disposition kommt (Apple Mail, manche Handys): Eine angehängte .txt-Datei mit
     * Ausweisdaten gehört nicht in den Mailtext und nicht zur KI. Er zählt in liesAnhaenge().
     */
    private static function sammle(IMessage $mail, bool $html): string
    {
        $anzahl = min(8, $html ? $mail->getHtmlPartCount() : $mail->getTextPartCount());
        $stuecke = [];
        $bytes = 0;
        for ($i = 0; $i < $anzahl && $bytes < self::MAX_TEXT_BYTES; $i++) {
            $teil = $html ? $mail->getHtmlPart($i) : $mail->getTextPart($i);
            if ($teil === null || self::istDatei($teil)) {
                continue;
            }
            $inhalt = self::inhalt($teil);
            if (trim($inhalt) === '') {
                continue;
            }
            $stuecke[] = $inhalt;
            $bytes += strlen($inhalt);
        }
        $gesamt = implode($html ? "\n<br>\n" : "\n\n", $stuecke);
        if (strlen($gesamt) > self::MAX_TEXT_BYTES) {
            // mb_strcut schneidet nie mitten in einem UTF-8-Zeichen.
            $gesamt = mb_strcut($gesamt, 0, self::MAX_TEXT_BYTES, 'UTF-8');
        }
        return $gesamt;
    }

    /**
     * Inhalt eines Textteils als UTF-8.
     *
     * Fehlt die Zeichensatz-Angabe, nimmt die Bibliothek nach RFC 2045 ISO-8859-1 an. In der
     * Praxis ist solcher Text meist UTF-8 – deshalb wird das zuerst geprüft, sonst würden aus
     * Umlauten Zeichenpaare wie „Ã¼“.
     */
    private static function inhalt(IMessagePart $teil): string
    {
        $ohneAngabe = !$teil instanceof IMimePart || $teil->getHeaderParameter('Content-Type', 'charset') === null;
        if ($ohneAngabe) {
            $binaer = (string) $teil->getBinaryContentStream()?->getContents();
            if (mb_check_encoding($binaer, 'UTF-8')) {
                return $binaer;
            }
            return mb_convert_encoding($binaer, 'UTF-8', 'Windows-1252');
        }
        try {
            $inhalt = (string) $teil->getContent();
        } catch (\Throwable) {
            // Unbekannter oder falsch benannter Zeichensatz: Bytes nehmen und reparieren.
            $inhalt = (string) $teil->getBinaryContentStream()?->getContents();
        }
        return mb_check_encoding($inhalt, 'UTF-8') ? $inhalt : mb_scrub($inhalt, 'UTF-8');
    }

    // -- Anhänge --------------------------------------------------------------------------

    /**
     * Art und Größe der Anhänge – mehr erfährt weder die Datenbank noch die KI.
     *
     * @return list<array{art: string, bytes: int}>
     */
    private static function liesAnhaenge(IMessage $mail): array
    {
        $liste = [];
        $teile = [];
        foreach ($mail->getAllAttachmentParts() as $teil) {
            $teile[spl_object_id($teil)] = $teil;
        }
        // Text- und HTML-Teile mit Dateinamen, die die Bibliothek nicht als Anhang führt (siehe sammle()).
        foreach ([false, true] as $html) {
            $anzahl = min(8, $html ? $mail->getHtmlPartCount() : $mail->getTextPartCount());
            for ($i = 0; $i < $anzahl; $i++) {
                $teil = $html ? $mail->getHtmlPart($i) : $mail->getTextPart($i);
                if ($teil !== null && self::istDatei($teil)) {
                    $teile[spl_object_id($teil)] ??= $teil;
                }
            }
        }
        foreach ($teile as $teil) {
            if (count($liste) >= self::MAX_ANHAENGE) {
                break;
            }
            $typ = strtolower($teil->getContentType('application/octet-stream'));
            $name = strtolower((string) $teil->getFilename());
            $art = match (true) {
                str_starts_with($typ, 'image/') => 'bild',
                $typ === 'application/pdf', str_ends_with($name, '.pdf') => 'pdf',
                (bool) preg_match('/\.(jpe?g|png|heic|heif|webp|gif)$/', $name) => 'bild',
                default => 'sonst',
            };
            $liste[] = ['art' => $art, 'bytes' => self::bytes($teil)];
        }
        return $liste;
    }

    /** true, wenn ein Teil einen Dateinamen trägt (filename in Content-Disposition oder name in Content-Type). */
    private static function istDatei(IMessagePart $teil): bool
    {
        try {
            return trim((string) $teil->getFilename()) !== '';
        } catch (\Throwable) {
            return false;
        }
    }

    /** Größe des entschlüsselten Anhangs, in Stücken gezählt (der Inhalt wird nicht behalten). */
    private static function bytes(IMessagePart $teil): int
    {
        try {
            $strom = $teil->getBinaryContentStream();
            if ($strom === null) {
                return 0;
            }
            $bytes = 0;
            while (!$strom->eof()) {
                $stueck = $strom->read(65536);
                if ($stueck === '') {
                    break;
                }
                $bytes += strlen($stueck);
            }
            return $bytes;
        } catch (\Throwable) {
            return 0;
        }
    }

    private static function zerleger(): MailMimeParser
    {
        return self::$zerleger ??= new MailMimeParser();
    }
}
