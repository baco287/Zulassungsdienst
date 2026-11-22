<?php
/**
 * Textaufbereitung für den KI-Assistenten.
 *
 * Aus der rohen Kundenmail wird der Text, den die KI (und der Mitarbeiter im Admin-Bereich)
 * zu sehen bekommt: HTML wird zu Text, Zitate früherer Mails, Signaturen und – soweit erkennbar –
 * die Grußformel mit Name und Kontaktdaten darunter fallen weg, Kontonummern und
 * Fahrgestellnummern werden unkenntlich gemacht, überlange Mails gekürzt.
 *
 * WARUM so streng: Jedes Zeichen kostet beim Modell Geld, und was die KI nicht braucht, soll
 * sie auch nicht bekommen (Datensparsamkeit). Zitierte alte Antworten zählen zudem nicht als
 * Verlauf – der kommt ausschließlich aus der eigenen Datenbank (Bauplan 7.5), damit sich
 * niemand mit einer gefälschten „früheren Zusage“ im Zitat etwas erschleichen kann.
 *
 * Zitate gehen nie mit: Bleibt nach dem Entfernen fast nichts übrig („Ja, bitte.“), bleibt es
 * bei diesem kurzen eigenen Text. Das Zitat enthielte Namen, Adressen und unsere frühere Antwort –
 * die Datenschutzerklärung verspricht „ohne zitierte frühere Nachrichten“. Eine so kurze Mail
 * sortiert die Regelstufe ohne KI aus (Kategorie „kurz“); ein Mensch entscheidet.
 *
 * Die Klasse kennt weder Datenbank noch Netz und protokolliert nichts.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Text
{
    /** Bleibt nach dem Entfernen der Zitate weniger übrig, gilt der ungekürzte Text. */
    public const MINDEST_ZEICHEN = 15;

    /** Steht am Ende eines gekürzten Textes, damit KI und Mitarbeiter wissen, dass etwas fehlt. */
    private const KUERZ_HINWEIS = "\n[… gekürzt]";

    /** Blöcke, deren Inhalt ein Leser der Mail nie zu sehen bekommt. */
    private const UNSICHTBARE_BLOECKE = ['head', 'style', 'script', 'title', 'noscript', 'template', 'svg', 'object', 'iframe'];

    /**
     * Stilangaben, mit denen HTML-Mails Text vor dem Leser verbergen (Vorschautext von
     * Newslettern, untergeschobene Anweisungen). „font-size:0“ und „opacity:0“ nur mit einer
     * Null, nach der keine weitere Ziffer kommt – „font-size:0.9em“ ist sichtbar.
     */
    private const VERSTECKT = '(?:display\s*:\s*none|visibility\s*:\s*hidden|mso-hide\s*:\s*all|font-size\s*:\s*0(?![\d.])|opacity\s*:\s*0(?![\d.]))';

    /** Elemente ohne schließendes Tag: Versteckt wird hier nur das Tag selbst. */
    private const LEERE_ELEMENTE = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];

    /** Platzhalter für Anfang und Ende eines HTML-Zitats, solange noch Tags im Text stehen. */
    private const ZITAT_AUF = "\x02";
    private const ZITAT_ZU  = "\x03";

    /** Platzhalter für die Grenze eines Absatzes oder Blocks (wird später zum Zeilenwechsel). */
    private const BLOCK = "\x04";

    /** Kopfzeilen-Namen, mit denen Outlook, GMX und Web.de den zitierten Vorgänger einleiten. */
    private const KOPFBLOCK_ZEILE = '/^[*_]{0,2}(Von|From|Gesendet|Sent|Datum|Date|An|To|Cc|Kopie|Betreff|Subject)[*_]{0,2}:[*_]{0,2}(\s|$)/iu';

    /**
     * Grußformeln am Ende einer Mail (deutsch und englisch), am Zeilenanfang, auch mit Namen
     * dahinter („LG Erika“, „Viele Grüße, Max Beispiel“).
     */
    private const GRUSS = '/^(?:(?:vielen\s+)?dank(?:e)?\s*(?:und|&|\+)\s*)?(?:(?:viele|liebe|beste|herzliche|schöne|freundliche|sonnige|mit\s+freundlichen|mit\s+besten|mit\s+herzlichen)\s+grü(?:ß|ss)e|mit\s+freundlichem\s+gru(?:ß|ss)|(?:viele|liebe|beste|herzliche)\s+gr(?:ü|ue)(?:ß|ss)e|grü(?:ß|ss)e|gru(?:ß|ss)|mfg|lg|vg|bg|(?:best|kind|warm|kindest)\s+regards|regards|best\s+wishes|(?:yours\s+)?sincerely|cheers|thanks(?:\s+a\s+lot)?|thank\s+you|many\s+thanks|(?:vielen\s+)?dank(?:e)?(?:\s+im\s+voraus)?|danke\s+schön|besten\s+dank)(?![\p{L}])[\s,.!]*(?:[\p{L}][\p{L}.\-\' ]{0,40})?$/iu';

    /** Längste Zeile, die unter einer Grußformel noch als Signatur gilt (Name, Anschrift, Telefon). */
    private const SIGNATUR_ZEILE_MAX = 70;

    /** Handy-Signaturen: nur diese eine Zeile fällt weg, nie der Text davor oder danach. */
    private const HANDY_SIGNATUR = '/^(Von meinem .{2,40} gesendet|Gesendet von meinem .{2,60}|Gesendet mit der .{2,60}|Diese Nachricht wurde von meinem .{2,90} gesendet|Sent from my .{2,40}|Get Outlook for .{2,20}|Outlook für .{2,20}(herunterladen|holen).{0,40})\.?$/iu';

    /**
     * Wandelt den HTML-Teil einer Mail in lesbaren Text.
     *
     * Bewusst ohne DOM-Erweiterung: Mail-HTML ist oft kaputt, und auf dem Webspace soll nichts
     * von einer zusätzlichen PHP-Erweiterung abhängen. Zitate (<blockquote>) werden zu Zeilen
     * mit „>“, damit ohneZitate() sie genauso erkennt wie in reinen Textmails.
     */
    public static function htmlZuText(string $html): string
    {
        $html = self::gueltigesUtf8($html);
        $html = str_replace(["\r\n", "\r"], "\n", $html);
        $html = str_replace([self::ZITAT_AUF, self::ZITAT_ZU, self::BLOCK], '', $html);

        // Was der Leser nicht sieht, soll auch die KI nicht lesen: Kommentare, Stilangaben,
        // Skripte – und versteckte Elemente, in denen Newsletter ihren Vorschautext und
        // Angreifer ihre Anweisungen unterbringen.
        $html = self::ohneAbschnitte($html, '<!--', '-->');
        foreach (self::UNSICHTBARE_BLOECKE as $tag) {
            $html = self::ohneBlock($html, $tag);
        }
        $html = self::ohneVersteckte($html);

        // Zeilenumbrüche aus dem Quelltext bedeuten in HTML nichts; die echten Umbrüche
        // entstehen erst aus den Tags. Ausnahme <pre>: Dort zählt jeder Umbruch (so senden
        // manche Programme reinen Text als HTML, und Thunderbird setzt die Signatur hinein).
        $html = (string) (preg_replace_callback(
            '#<pre\b[^>]*>.*?(?:</pre\s*>|$)#is',
            static fn (array $t): string => str_replace("\n", '<br>', $t[0]),
            $html
        ) ?? $html);
        $html = self::ersetze('/[ \t]*\n[ \t]*/', ' ', $html);

        // Zitate merken, bevor die Tags verschwinden.
        $html = self::ersetze('#<blockquote\b[^>]*>#i', self::BLOCK . self::ZITAT_AUF . self::BLOCK, $html);
        $html = self::ersetze('#</blockquote\s*>#i', self::BLOCK . self::ZITAT_ZU . self::BLOCK, $html);
        $html = self::ersetze('#<br\b[^>]*>#i', "\n", $html);
        $html = self::ersetze('#<li\b[^>]*>#i', self::BLOCK . '- ', $html);
        $html = self::ersetze('#</(td|th)\s*>#i', ' ', $html);
        $html = self::ersetze(
            '#</?(p|div|tr|table|tbody|thead|ul|ol|h[1-6]|section|article|header|footer|address|pre|dl|dt|dd|center|hr|form|figure)\b[^>]*>#i',
            self::BLOCK,
            $html
        );

        $text = strip_tags($html);
        // Ende eines Absatzes und Anfang des nächsten sind EIN Zeilenwechsel – sonst stünde
        // bei Outlook (jede Zeile ein eigener Absatz) zwischen allen Zeilen eine Leerzeile.
        // Gewollte Leerzeilen (<p>&nbsp;</p>, <div><br></div>) bleiben, weil dort etwas
        // zwischen den Grenzen steht.
        $text = self::ersetze('/' . self::BLOCK . '(?:[ \t]*' . self::BLOCK . ')+/', self::BLOCK, $text);
        $text = str_replace(self::BLOCK, "\n", $text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        // Zitat-Marken in „>“ am Zeilenanfang übersetzen (auch verschachtelt).
        $tiefe = 0;
        $zeilen = [];
        foreach (explode("\n", $text) as $zeile) {
            $auf = substr_count($zeile, self::ZITAT_AUF);
            $zu  = substr_count($zeile, self::ZITAT_ZU);
            if ($auf > 0 || $zu > 0) {
                $tiefe = max(0, $tiefe + $auf - $zu);
                $zeile = str_replace([self::ZITAT_AUF, self::ZITAT_ZU], '', $zeile);
                if (trim($zeile) === '') {
                    continue;
                }
            }
            $zeilen[] = $tiefe > 0 ? '> ' . ltrim($zeile) : $zeile;
        }

        return self::normalisiere(implode("\n", $zeilen));
    }

    /**
     * Entfernt, was nicht vom Absender dieser Mail stammt: zitierte Vorgänger, deren
     * Einleitungszeilen und die Signatur.
     *
     * Erkannt werden: Zeilen mit „>“, „Am … schrieb …:“ / „On … wrote:“ (auch über zwei Zeilen
     * umbrochen), „-----Ursprüngliche Nachricht-----“, Kopfblöcke „Von: / Gesendet: / An: /
     * Betreff:“ (Outlook, GMX, Web.de) und alles ab dem Signaturtrenner „-- “.
     */
    public static function ohneZitate(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", self::gueltigesUtf8($text));
        $zeilen = explode("\n", $text);
        $anzahl = count($zeilen);

        $schnitt = $anzahl;      // ab dieser Zeile fällt alles weg
        $streichen = [];         // einzelne Einleitungszeilen vor einem „>“-Zitat

        for ($i = 0; $i < $anzahl; $i++) {
            $zeile = rtrim($zeilen[$i]);
            $kern = trim($zeile);
            if ($kern === '') {
                continue;
            }
            // Signaturtrenner nach RFC 3676 ist „-- “; viele Programme schneiden das
            // Leerzeichen am Ende ab, deshalb gilt auch „--“ allein.
            if ($zeile === '--') {
                $schnitt = $i;
                break;
            }
            if (self::istTrennzeile($kern) || self::istKopfblock($zeilen, $i)) {
                $schnitt = $i;
                break;
            }
            $laenge = self::zitatEinleitung($zeilen, $i);
            if ($laenge === 0) {
                continue;
            }
            $danach = self::naechsteZeile($zeilen, $i + $laenge);
            if ($danach !== null && str_starts_with($danach, '>')) {
                // Das Zitat ist mit „>“ markiert: nur die Einleitung streichen. Was der Kunde
                // zwischen oder unter die zitierten Zeilen schreibt, bleibt erhalten.
                for ($k = 0; $k < $laenge; $k++) {
                    $streichen[$i + $k] = true;
                }
                $i += $laenge - 1;
                continue;
            }
            if (str_contains(implode(' ', array_slice($zeilen, $i, $laenge)), '@')) {
                // Einleitung mit Mailadresse, aber Zitat ohne „>“ (manche Webmailer):
                // Hier lässt sich eigener Text nicht mehr vom Zitat trennen – abschneiden.
                $schnitt = $i;
                break;
            }
            // Sonst ist es vermutlich ein Satz des Kunden („Am 10.11. schrieb ich Ihnen:“).
        }

        $bleibt = [];
        for ($i = 0; $i < $schnitt; $i++) {
            if (isset($streichen[$i])) {
                continue;
            }
            $kern = trim($zeilen[$i]);
            if (str_starts_with($kern, '>')) {
                continue;
            }
            if ($kern !== '' && preg_match(self::HANDY_SIGNATUR, $kern) === 1) {
                continue;
            }
            $bleibt[] = $zeilen[$i];
        }
        // Trennlinien, die vor einem abgeschnittenen Block standen („________________“).
        while ($bleibt !== [] && preg_match('/^[\s_\-=*]*$/u', (string) end($bleibt)) === 1) {
            array_pop($bleibt);
        }

        // Auch wenn fast nichts übrig bleibt („Ja, bitte.“): nur der eigene Text. Das Zitat
        // enthielte Namen, Mailadressen und frühere Antworten (Datenschutzerklärung: „ohne
        // zitierte frühere Nachrichten“); die Regelstufe gibt so kurze Mails an einen Menschen.
        return self::normalisiere(implode("\n", $bleibt));
    }

    /**
     * Entfernt eine abschließende Grußformel samt den kurzen Zeilen darunter (Name, Telefon,
     * Anschrift, Firma) – Mailprogramme setzen ihre Signatur meist ohne Trenner „-- “.
     *
     * Vorsichtig: Die Grußformel muss in den letzten acht nicht leeren Zeilen stehen, danach
     * dürfen höchstens sechs kurze Zeilen folgen, keine davon eine Frage oder ein „PS“. Es wird
     * nie mehr als die Hälfte des Textes entfernt, und bleiben weniger als MINDEST_ZEICHEN
     * übrig, bleibt alles stehen. Namen, die im Text selbst stehen, bleiben.
     */
    public static function ohneGruss(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $zeilen = explode("\n", $text);
        $nichtLeer = [];
        foreach ($zeilen as $i => $zeile) {
            if (trim($zeile) !== '') {
                $nichtLeer[] = $i;
            }
        }
        $anzahl = count($nichtLeer);
        if ($anzahl < 2) {
            return $text;
        }
        // Die oberste passende Grußformel im Fenster der letzten acht Zeilen.
        foreach (array_slice($nichtLeer, max(0, $anzahl - 8)) as $platz => $i) {
            $folgende = array_slice($nichtLeer, max(0, $anzahl - 8) + $platz + 1);
            if (count($folgende) > 6 || preg_match(self::GRUSS, trim($zeilen[$i])) !== 1) {
                continue;
            }
            $alleKurz = true;
            foreach ($folgende as $k) {
                $zeile = trim($zeilen[$k]);
                if (mb_strlen($zeile) > self::SIGNATUR_ZEILE_MAX || str_ends_with($zeile, '?')
                    || preg_match('/^(?:p\.?\s?s\.?|nachtrag|ps:)/iu', $zeile) === 1) {
                    $alleKurz = false;
                    break;
                }
            }
            if (!$alleKurz) {
                continue;
            }
            $rest = rtrim(implode("\n", array_slice($zeilen, 0, $i)));
            $weg = mb_strlen(trim($text)) - mb_strlen(trim($rest));
            if (mb_strlen(trim($rest)) < self::MINDEST_ZEICHEN || $weg * 2 > mb_strlen(trim($text))) {
                return $text;
            }
            return $rest;
        }
        return $text;
    }

    /**
     * Macht Bank- und Fahrzeugdaten unkenntlich, bevor der Text das Haus verlässt.
     *
     * IBAN → [IBAN], Fahrzeug-Identnummer (17 Zeichen ohne I, O, Q, mindestens eine Ziffer)
     * → [FIN], Ziffernfolgen ab 12 Stellen (auch in Vierergruppen) → [NUMMER]. Kennzeichen, Referenznummern
     * (KZP-…), Telefonnummern unter 12 Ziffern und Nummern mit führendem „+“ bleiben
     * lesbar – die braucht der Mitarbeiter, um den Vorgang zuzuordnen und zurückzurufen.
     */
    public static function maskiere(string $text): string
    {
        $text = self::gueltigesUtf8($text);

        // IBAN: Ländercode, zwei Prüfziffern, dann 11 bis 30 Zeichen – am Stück oder in
        // Vierergruppen. Die Zusatzprüfung „mindestens 10 Ziffern“ verhindert, dass eine
        // zufällige Folge kurzer Wörter („KW47 2026 kann mein Auto“) als IBAN gilt.
        $text = preg_replace_callback(
            '/(?<![A-Za-z0-9])(?:[A-Z]{2}\d{2}(?:[ \x{00A0}]?[A-Z0-9]{4}){2,7}(?:[ \x{00A0}]?[A-Z0-9]{1,3})?|[a-z]{2}\d{2}(?:[ \x{00A0}]?\d{4}){2,7}(?:[ \x{00A0}]?\d{1,3})?)(?![A-Za-z0-9])/u',
            static function (array $t): string {
                $kompakt = (string) preg_replace('/[^A-Za-z0-9]/', '', $t[0]);
                $ziffern = strlen((string) preg_replace('/\D/', '', $kompakt));
                return (strlen($kompakt) >= 15 && strlen($kompakt) <= 34 && $ziffern >= 10) ? '[IBAN]' : $t[0];
            },
            $text
        ) ?? $text;

        // FIN: genau 17 Zeichen, eigenständig (nicht mitten in einer Webadresse oder einer
        // längeren Kennung), mit mindestens einer Ziffer – sonst wäre jedes 17-Buchstaben-Wort
        // betroffen.
        $text = preg_replace_callback(
            '/(?<![A-Za-z0-9\/=_@.\-])[A-HJ-NPR-Za-hj-npr-z0-9]{17}(?![A-Za-z0-9_@\-])/',
            static fn (array $t): string => preg_match('/\d/', $t[0]) === 1 ? '[FIN]' : $t[0],
            $text
        ) ?? $text;
        // Gegliederte FIN („WVW ZZZ 1JZ 3W 386752“) nur mit Stichwort davor (FIN, VIN,
        // Fahrgestell…, Fahrzeug-Ident…, höchstens 20 Zeichen Abstand): Ohne Stichwort sähen
        // Kennzeichen samt Referenznummer genauso aus, und die braucht der Mitarbeiter.
        $text = preg_replace_callback(
            '/(?<![\p{L}])(?:FIN|VIN|Fahrgestell[\p{L}\-]*|Fahrzeug-?[Ii]dent[\p{L}\-]*|Identifi[\p{L}\-]*nummer)(?![\p{L}])[^\n\[\]]{0,20}?\K(?<![A-Za-z0-9])[A-HJ-NPR-Z0-9]{1,17}(?:[ \-][A-HJ-NPR-Z0-9]{1,17}){1,6}(?![A-Za-z0-9])/u',
            static function (array $t): string {
                // Die ersten Gruppen, die zusammen genau 17 Zeichen ergeben, sind die FIN; was danach
                // kommt (etwa ein Wort in Großbuchstaben), bleibt stehen.
                $teile = preg_split('/([ \-])/', $t[0], -1, PREG_SPLIT_DELIM_CAPTURE) ?: [];
                $kompakt = '';
                for ($i = 0; $i < count($teile); $i += 2) {
                    $kompakt .= $teile[$i];
                    if (strlen($kompakt) === 17) {
                        return preg_match('/\d/', $kompakt) === 1 ? '[FIN]' . implode('', array_slice($teile, $i + 1)) : $t[0];
                    }
                    if (strlen($kompakt) > 17) {
                        break;
                    }
                }
                return $t[0];
            },
            $text
        ) ?? $text;
        // Ohne Stichwort nur die enge Form mit Bindestrichen: nur Großbuchstaben, höchstens drei
        // Trenner, erster Teil mindestens drei Zeichen und nicht „KZP“ (Referenz), am Ende
        // mindestens drei Ziffern – „WVW-ZZZ1JZ3W386752“, aber nie „HH-AB 1234“.
        $text = preg_replace_callback(
            '/(?<![A-Za-z0-9\-])[A-HJ-NPR-Z0-9]{3,}(?:-[A-HJ-NPR-Z0-9]+){1,3}(?![A-Za-z0-9\-])/',
            static function (array $t): string {
                $kompakt = str_replace('-', '', $t[0]);
                return strlen($kompakt) === 17 && !str_starts_with($t[0], 'KZP') && !str_starts_with($t[0], 'DZ-')
                    && preg_match('/\d{3}$/', $kompakt) === 1 ? '[FIN]' : $t[0];
            },
            $text
        ) ?? $text;

        // Kartennummern werden meist in Vierergruppen geschrieben („4111 1111 1111 1111“) und
        // sind so keine durchgehende Ziffernfolge. Verlangt werden mindestens drei volle
        // Vierergruppen; Telefonnummern („030 1234 5678“, „0170 0000000“) sehen anders aus.
        $text = self::ersetze('/(?<![\d+])\d{4}(?:[ \-]\d{4}){2,4}(?:[ \-]\d{1,4})?(?![\d])/', '[NUMMER]', $text);

        // Lange Ziffernfolgen: Kartennummern, Kontonummern, Ausweis- und Steuernummern.
        // Ausnahme „+49…“: Das ist eine Telefonnummer in internationaler Schreibweise, und die
        // braucht der Mitarbeiter für den Rückruf.
        return self::ersetze('/(?<![\d+])\d{12,}(?!\d)/', '[NUMMER]', $text);
    }

    /**
     * Kürzt auf höchstens $max Zeichen. Behalten wird der Anfang: Das Anliegen steht fast
     * immer oben, lange Mails sind unten Verlauf, Rechtstexte oder eingefügte Dokumente.
     *
     * @return array{text: string, gekuerzt: bool}
     */
    public static function kuerze(string $text, int $max = 6000): array
    {
        $max = max(1, $max);
        if (mb_strlen($text) <= $max) {
            return ['text' => $text, 'gekuerzt' => false];
        }
        $platz = $max - mb_strlen(self::KUERZ_HINWEIS);
        if ($platz < 1) {
            return ['text' => mb_substr($text, 0, $max), 'gekuerzt' => true];
        }
        $teil = mb_substr($text, 0, $platz);
        // Nicht mitten im Wort enden, wenn in der Nähe eine Wortgrenze liegt.
        $grenze = max((int) mb_strrpos($teil, ' '), (int) mb_strrpos($teil, "\n"));
        if ($grenze > $platz - 200 && $grenze > 0) {
            $teil = mb_substr($teil, 0, $grenze);
        }
        return ['text' => rtrim($teil) . self::KUERZ_HINWEIS, 'gekuerzt' => true];
    }

    /**
     * Der ganze Weg von der rohen Mail zum Text für die KI.
     *
     * `zeichen_original` zählt den lesbaren Text vor dem Entfernen der Zitate (bei HTML also
     * nach der Umwandlung, ohne Tags) – so lässt sich im Admin-Bereich ablesen, wie viel
     * weggefallen ist.
     *
     * @return array{text: string, gekuerzt: bool, zeichen_original: int}
     */
    public static function bereinige(string $roh, bool $html): array
    {
        $text = $html ? self::htmlZuText($roh) : self::normalisiere(self::gueltigesUtf8($roh));
        $zeichen = mb_strlen($text);

        $text = self::ohneZitate($text);
        $text = self::ohneGruss($text);
        $text = self::maskiere($text);
        $gekuerzt = self::kuerze($text);

        return ['text' => $gekuerzt['text'], 'gekuerzt' => $gekuerzt['gekuerzt'], 'zeichen_original' => $zeichen];
    }

    /**
     * Fingerabdruck einer Anfrage: Gleicher Betreff und gleicher Text sollen nicht zweimal
     * bezahlt werden. Groß-/Kleinschreibung, Leerraum und „AW:/Re:/WG:“ zählen nicht.
     */
    public static function hash(string $betreff, string $text): string
    {
        $betreff = self::ersetze('/^(?:\s*(?:re|aw|antw|antwort|wg|fwd?|tr)\s*(?:\[\d+\])?\s*:)+/iu', '', self::gueltigesUtf8($betreff));
        $glatt = static fn (string $s): string => trim(self::ersetze('/\s+/u', ' ', mb_strtolower($s)));
        return hash('sha256', $glatt($betreff) . "\n" . $glatt(self::gueltigesUtf8($text)));
    }

    // -- Hilfen ---------------------------------------------------------------------------

    /**
     * Einheitlicher Leerraum: Zeilenenden als \n, keine Steuerzeichen, keine unsichtbaren
     * Unicode-Zeichen (damit lässt sich Text vor dem Leser verstecken, vor der KI aber nicht),
     * höchstens eine Leerzeile hintereinander.
     */
    private static function normalisiere(string $text): string
    {
        $text = str_replace(["\r\n", "\r"], "\n", $text);
        $text = self::ersetze('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/', '', $text);
        $text = self::ersetze('/[\x{00A0}\x{2007}\x{202F}\x{3000}\t]/u', ' ', $text);
        $text = self::ersetze('/[\x{00AD}\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2069}\x{FEFF}\x{E0000}-\x{E007F}]/u', '', $text);
        $text = self::ersetze('/ {2,}/', ' ', $text);
        $text = self::ersetze('/ +\n/', "\n", $text);
        $text = self::ersetze('/\n /', "\n", $text);
        $text = self::ersetze('/\n{3,}/', "\n\n", $text);
        return trim($text);
    }

    /** Mailtexte kommen in jeder Kodierung an; die Datenbank und das Modell wollen UTF-8. */
    private static function gueltigesUtf8(string $text): string
    {
        return mb_check_encoding($text, 'UTF-8') ? $text : mb_scrub($text, 'UTF-8');
    }

    /** preg_replace, das bei einem internen Fehler (Rückgabe null) den Text unverändert lässt. */
    private static function ersetze(string $muster, string $ersatz, string $text): string
    {
        return preg_replace($muster, $ersatz, $text) ?? $text;
    }

    /**
     * Entfernt alles zwischen zwei Marken (z. B. HTML-Kommentare). Ohne regulären Ausdruck,
     * weil Newsletter-HTML mehrere hundert Kilobyte groß sein kann.
     */
    private static function ohneAbschnitte(string $text, string $auf, string $zu): string
    {
        $ergebnis = '';
        $pos = 0;
        while (($start = strpos($text, $auf, $pos)) !== false) {
            $ergebnis .= substr($text, $pos, $start - $pos) . ' ';
            $ende = strpos($text, $zu, $start + strlen($auf));
            if ($ende === false) {
                return $ergebnis;   // nie geschlossen: der Rest wäre ohnehin unsichtbar
            }
            $pos = $ende + strlen($zu);
        }
        return $ergebnis . substr($text, $pos);
    }

    /** Entfernt <tag …>…</tag> samt Inhalt (Stilangaben, Skripte, Kopfbereich). */
    private static function ohneBlock(string $html, string $tag): string
    {
        $klein = strtolower($html);   // rechnet nur ASCII um, die Positionen bleiben gleich
        $ergebnis = '';
        $pos = 0;
        $laenge = strlen($tag);
        while (($start = strpos($klein, '<' . $tag, $pos)) !== false) {
            $folge = $klein[$start + 1 + $laenge] ?? '';
            if ($folge !== '' && !in_array($folge, ['>', ' ', "\n", "\t", '/'], true)) {
                // z. B. <header> bei der Suche nach <head>: kein Treffer, weitersuchen
                $ergebnis .= substr($html, $pos, $start + 1 - $pos);
                $pos = $start + 1;
                continue;
            }
            $ergebnis .= substr($html, $pos, $start - $pos) . ' ';
            $ende = strpos($klein, '</' . $tag, $start);
            if ($ende === false) {
                return $ergebnis;
            }
            $schluss = strpos($klein, '>', $ende);
            if ($schluss === false) {
                return $ergebnis;
            }
            $pos = $schluss + 1;
        }
        return $ergebnis . substr($html, $pos);
    }

    /**
     * Entfernt Elemente, die per Stilangabe unsichtbar sind, samt Inhalt – auch wenn darin
     * weitere Elemente gleichen Namens stecken (<div style="display:none"><div>…</div>…</div>).
     * Ein nie geschlossenes Element verbirgt im Mailprogramm den ganzen Rest; dann fällt der
     * Rest auch hier weg.
     */
    private static function ohneVersteckte(string $html): string
    {
        $oeffnend = '#<([a-z][a-z0-9]*)\b[^>]*?\bstyle\s*=\s*(?:"[^"]*' . self::VERSTECKT . '[^"]*"|\'[^\']*' . self::VERSTECKT . '[^\']*\')[^>]*>#i';
        $ergebnis = '';
        $pos = 0;
        $laenge = strlen($html);
        while ($pos < $laenge && preg_match($oeffnend, $html, $t, PREG_OFFSET_CAPTURE, $pos) === 1) {
            $start = (int) $t[0][1];
            $nach = $start + strlen($t[0][0]);
            $tag = strtolower($t[1][0]);
            $ergebnis .= substr($html, $pos, $start - $pos) . ' ';
            if (in_array($tag, self::LEERE_ELEMENTE, true) || str_ends_with($t[0][0], '/>')) {
                $pos = $nach;
                continue;
            }
            // Passendes schließendes Tag suchen, gleichnamige innere Elemente mitzählen.
            $tiefe = 1;
            $suche = $nach;
            $ende = null;
            while (preg_match('#<(/?)' . preg_quote($tag, '#') . '\b[^>]*>#i', $html, $u, PREG_OFFSET_CAPTURE, $suche) === 1) {
                $suche = (int) $u[0][1] + strlen($u[0][0]);
                if ($u[1][0] === '/') {
                    $tiefe--;
                } elseif (!str_ends_with($u[0][0], '/>')) {
                    $tiefe++;
                }
                if ($tiefe === 0) {
                    $ende = $suche;
                    break;
                }
            }
            if ($ende === null) {
                return $ergebnis;
            }
            $pos = $ende;
        }
        return $ergebnis . substr($html, $pos);
    }

    /**
     * „-----Ursprüngliche Nachricht-----“ und Verwandte. Eine Weiterleitung („Weitergeleitete
     * Nachricht“) ist hier bewusst kein Schnitt; folgt ihr allerdings ein Kopfblock „Von: /
     * Gesendet: / Betreff:“, endet der Text dort (istKopfblock) – lieber zu wenig als zu viel.
     */
    private static function istTrennzeile(string $kern): bool
    {
        return preg_match(
            '/^-{2,}\s*(Ursprüngliche Nachricht|Ursprüngliche Mail|Originalnachricht|Original-Nachricht|Original Message|Original Nachricht)\s*-{2,}$/iu',
            $kern
        ) === 1;
    }

    /**
     * Beginnt hier der Kopfblock eines zitierten Vorgängers? Verlangt werden Absender und
     * Betreff sowie Datum oder Empfänger dicht beieinander – eine einzelne Zeile „Von: …“
     * im Text des Kunden reicht nicht.
     *
     * @param string[] $zeilen
     */
    private static function istKopfblock(array $zeilen, int $i): bool
    {
        $erste = trim($zeilen[$i]);
        if (preg_match(self::KOPFBLOCK_ZEILE, $erste) !== 1) {
            return false;
        }
        // Alles in einer Zeile (manche Umwandlungen von HTML nach Text).
        if (preg_match('/^[*_]{0,2}(Von|From)[*_]{0,2}:.+\b(Gesendet|Sent|Datum|Date)[*_]{0,2}:.+\b(Betreff|Subject)[*_]{0,2}:/iu', $erste) === 1) {
            return true;
        }
        $gefunden = [];
        $gesehen = 0;
        for ($k = $i; $k < count($zeilen) && $gesehen < 6; $k++) {
            $kern = trim($zeilen[$k]);
            if ($kern === '') {
                continue;
            }
            $gesehen++;
            if (preg_match(self::KOPFBLOCK_ZEILE, $kern, $t) !== 1) {
                continue;
            }
            $gefunden[match (mb_strtolower($t[1])) {
                'von', 'from' => 'von',
                'gesendet', 'sent', 'datum', 'date' => 'datum',
                'an', 'to' => 'an',
                'betreff', 'subject' => 'betreff',
                default => 'kopie',
            }] = true;
        }
        return isset($gefunden['von'], $gefunden['betreff']) && (isset($gefunden['datum']) || isset($gefunden['an']));
    }

    /**
     * Prüft, ob bei Zeile $i die Einleitung eines Zitats steht, und liefert, über wie viele
     * Zeilen sie reicht (0 = keine). Mailprogramme brechen die Zeile gern um, deshalb werden
     * bis zu drei Zeilen zusammen betrachtet. Ohne Ziffer (Datum, Uhrzeit) gilt nichts als
     * Einleitung – „Am Montag schrieb ich Ihnen:“ ist ein Satz des Kunden.
     *
     * @param string[] $zeilen
     */
    private static function zitatEinleitung(array $zeilen, int $i): int
    {
        $zusammen = '';
        for ($laenge = 1; $laenge <= 3 && $i + $laenge - 1 < count($zeilen); $laenge++) {
            $teil = trim($zeilen[$i + $laenge - 1]);
            if ($teil === '' || str_starts_with($teil, '>')) {
                return 0;
            }
            $zusammen = trim($zusammen . ' ' . $teil);
            if (mb_strlen($zusammen) > 400) {
                return 0;
            }
            if (!str_ends_with($zusammen, ':') || preg_match('/\d/', $zusammen) !== 1) {
                continue;
            }
            if (preg_match('/^(Am|On)\s.{4,300}\s(schrieb|wrote)\b.{0,200}:$/iu', $zusammen) === 1
                || preg_match('/^.{1,200}\s(schrieb am|wrote on)\s.{4,200}:$/iu', $zusammen) === 1
                || preg_match('/^.{1,200}\shat am\s.{4,200}\sgeschrieben:$/iu', $zusammen) === 1) {
                return $laenge;
            }
        }
        return 0;
    }

    /**
     * Die nächste nicht leere Zeile ab $ab (ohne Leerraum am Rand) oder null.
     *
     * @param string[] $zeilen
     */
    private static function naechsteZeile(array $zeilen, int $ab): ?string
    {
        for ($k = $ab; $k < count($zeilen); $k++) {
            $kern = trim($zeilen[$k]);
            if ($kern !== '') {
                return $kern;
            }
        }
        return null;
    }
}
