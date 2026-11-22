<?php
/**
 * Prüfer: füllt Platzhalter und kontrolliert jeden Entwurf, bevor ein Mensch ihn sieht – und
 * noch einmal, bevor er gesendet wird.
 *
 * WARUM: Das Modell soll Preise, Unterlagen, Zeiten und Links nie selbst ausschreiben, sondern
 * Platzhalter wie {{PREIS:abmeldung}} setzen. Dieser Code trägt die Werte aus der Wissensbasis
 * ein. So kann ein veralteter oder erfundener Betrag gar nicht erst in eine Kundenmail geraten,
 * ohne dass es auffällt. Der Prüfer arbeitet ohne KI und rein mit Textvergleich.
 *
 * ERGEBNIS einer Prüfung:
 *   abgelehnt  Entwurf ist so nicht verwendbar (leerer Text, unbekannter oder nicht gefüllter
 *              Platzhalter, abgelaufener Aktionspreis). Senden ist gesperrt.
 *   warnung    Etwas muss ein Mensch ausdrücklich bestätigen (fremder Betrag, fremde Adresse,
 *              Wort, das nach Zusage klingt, Übergabefall …).
 *   ok         nichts gefunden.
 *
 * ZWEI EBENEN: pruefeVorlage() sieht den Text des Modells vor dem Füllen (steht dort schon ein
 * Betrag oder eine Adresse, hat das Modell am Platzhalter vorbeigeschrieben). pruefe() sieht den
 * fertigen Text – auch den, den ein Mensch im Admin-Bereich geändert hat. pruefeEntwurf() macht
 * beides in einem Schritt.
 *
 * Die Prüfung ist bewusst streng: Eine Warnung zu viel kostet einen Klick, eine falsche Zusage
 * an einen Kunden kostet Vertrauen.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Pruefer
{
    /** Ab dieser Länge ist eine Antwort für eine Kundenmail verdächtig lang. */
    public const MAX_ZEICHEN = 1500;

    public const HINWEIS_AKTION_ABGELAUFEN = 'Aktionspreis abgelaufen – bitte Preise auf der Website aktualisieren';
    public const HINWEIS_WISSEN_VERALTET = 'Wissensbasis des Assistenten ist veraltet (letztes Veröffentlichen nicht vollständig) – Preise gesperrt';
    public const HINWEIS_LEER = 'Kein Antworttext – bitte selbst beantworten oder verwerfen.';

    /** {{SCHLUESSEL}} – innen alles außer Klammern. */
    private const MUSTER_PLATZHALTER = '/\{\{([^{}]*)\}\}/u';

    /** Leerraum einschließlich der geschützten Leerzeichen, die Preisangaben oft enthalten. */
    private const RAUM = '[\s\x{00A0}\x{202F}\x{2009}]';

    /** Zahl mit optionalen Tausender-Trennern und bis zu zwei Nachkommastellen. */
    private const ZAHL = '\d+(?:[.\'\x{00A0}\x{202F}\x{2009}]\d{3})*(?:[.,]\d{1,2})?';

    /** Währungsangabe; „Euro“ nur als ganzes Wort (nicht „Europa“). */
    private const WAEHRUNG = '(?:€|(?<![\p{L}])(?:EUR|Euros?)(?![\p{L}]))';

    /** Dateiendungen, die wie eine Domain aussehen, aber keine sind. */
    private const DATEIENDUNGEN = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'gif', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv', 'eml'];

    /**
     * Häufige Endungen. Eine Endung wie „Danach“ (groß, dann klein, ohne „/“ dahinter) ist
     * meist ein fehlendes Leerzeichen nach dem Satzpunkt – steht sie in dieser Liste, gilt sie
     * trotzdem als Adresse („Beispiel.De“).
     */
    private const BEKANNTE_ENDUNGEN = [
        'de', 'com', 'net', 'org', 'eu', 'info', 'biz', 'io', 'at', 'ch', 'nl', 'be', 'fr', 'it', 'es', 'pl', 'uk', 'us',
        'co', 'me', 'tv', 'cc', 'ws', 'online', 'shop', 'store', 'top', 'xyz', 'app', 'dev', 'site', 'website', 'berlin',
        'email', 'link', 'click', 'live', 'pro', 'mobi', 'name', 'ru', 'cn', 'tk', 'ly', 'gl', 'sh', 'to', 'pay', 'bank',
    ];

    /** Längen der IBAN je Land (häufige Länder); sonst gelten 15 bis 34 Zeichen. */
    private const IBAN_LAENGEN = [
        'DE' => 22, 'AT' => 20, 'CH' => 21, 'NL' => 18, 'BE' => 16, 'FR' => 27, 'IT' => 27, 'ES' => 24, 'PL' => 28,
        'GB' => 22, 'LU' => 20, 'DK' => 18, 'LI' => 21, 'CZ' => 24, 'TR' => 26,
    ];

    /** Weibliche Formen, die ohne Doppelform („Halterin oder Halter“) ein Geschlecht voraussetzen. */
    private const PERSON_FORMEN = '(?:Halterin|Kundin|Käuferin|Verkäuferin|Eigentümerin|Inhaberin|Besitzerin|Fahrerin|Antragstellerin)';

    /**
     * Wörter, die nach einer Zusage klingen (Bauplan 4.13 und 7.5). Schlüssel = Muster ohne
     * Begrenzer, Wert = so steht es im Hinweis.
     */
    private const ZUSAGE_WOERTER = [
        '(?<![\p{L}])heute\s+noch(?![\p{L}])' => 'heute noch',
        '(?<![\p{L}])noch\s+heute(?![\p{L}])' => 'noch heute',
        '(?<![\p{L}])(?<!guten\s)(?:über)?morgen(?![\p{L}])' => 'morgen',
        '(?<![\p{L}])sofort(?:ige[mnrs]?)?(?![\p{L}])' => 'sofort',
        '(?<![\p{L}])umgehend(?:e[mnrs]?)?(?![\p{L}])' => 'umgehend',
        '(?<![\p{L}])unverzüglich(?![\p{L}])' => 'unverzüglich',
        'garanti' => 'garantiert/Garantie',
        '(?<![\p{L}])auf\s+jeden\s+fall(?![\p{L}])' => 'auf jeden Fall',
        '(?<![\p{L}])in\s+jedem\s+fall(?![\p{L}])' => 'in jedem Fall',
        '(?<![\p{L}])versproch|(?<![\p{L}])versprech' => 'versprochen',
        '(?<![\p{L}])verbindlich' => 'verbindlich',
        '(?<![\p{L}])spätestens(?![\p{L}])' => 'spätestens',
        '(?<![\p{L}])bis\s+(?:montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|ende\s+der\s+woche|zum\s+\d)' => 'Termin („bis …“)',
        '(?<![\p{L}])(?:am\s+selben|am\s+gleichen|noch\s+am)\s+tag(?![\p{L}])' => 'am selben Tag',
    ];

    /** Geld-Zusagen, die nur ein Mitarbeiter machen darf. */
    private const GELD_WOERTER = [
        'rabatt' => 'Rabatt',
        '(?<![\p{L}])nachlass|(?<![\p{L}])nachlässe' => 'Nachlass',
        'gutschein' => 'Gutschein',
        'gutschrift' => 'Gutschrift',
        '(?<![\p{L}])erstatt|rückerstatt' => 'Erstattung',
        'kulanz' => 'Kulanz',
        'entschädig' => 'Entschädigung',
    ];

    private const SELBSTBEZEICHNUNG = [
        '/(?<![\p{L}])(?:KI|AI)(?![\p{L}])/u' => 'KI',
        '/künstliche[rnms]?\s+intelligenz|artificial\s+intelligence|sprachmodell|language\s+model|chat-?bot|(?<![\p{L}])bot(?![\p{L}])/iu' => 'KI',
        '/virtuelle[rnms]?\s+(?:assistent|mitarbeiter)|digitale[rnms]?\s+assistent|als\s+assistent|automatisch\s+(?:erstellt|erzeugt|generiert|verfasst)/iu' => 'Assistent',
        '/(?:bin|sind)\s+(?:k?eine?)\s+(?:mensch|roboter|maschine|computer|programm)|echter?\s+(?:mensch|mitarbeiter)|als\s+mensch(?![\p{L}])|menschliche[rnms]?\s+mitarbeiter/iu' => 'Mensch',
    ];

    /**
     * Ersetzt {{SCHLUESSEL}} durch den Wert aus wissen.platzhalter.
     *
     * Unbekannte Platzhalter bleiben stehen und werden gemeldet. Gesperrte Platzhalter (Preise
     * einer abgelaufenen Aktion) gelten als unbekannt. Mehrzeilige Werte (Unterlagenlisten)
     * bekommen eine eigene Zeile, auch wenn das Modell sie mitten in einen Satz gesetzt hat.
     *
     * @param array<string, mixed> $wissen
     * @return array{text: string, unbekannt: string[]}
     */
    public static function fuelle(string $vorlage, array $wissen): array
    {
        $vorlage = self::zeilenenden($vorlage);
        $werte = self::platzhalterWerte($wissen);
        $gesperrt = self::gesperrtePlatzhalter($wissen);
        $unbekannt = [];

        if (preg_match_all(self::MUSTER_PLATZHALTER, $vorlage, $treffer, PREG_OFFSET_CAPTURE | PREG_SET_ORDER) === false) {
            return ['text' => trim($vorlage), 'unbekannt' => []];
        }
        $text = '';
        $pos = 0;
        foreach ($treffer as $t) {
            [$ganz, $start] = $t[0];
            $text .= substr($vorlage, $pos, $start - $pos);
            $pos = $start + strlen($ganz);

            $schluessel = self::aufloesen($t[1][0], $werte);
            if ($schluessel === null || isset($gesperrt[$schluessel])) {
                $name = $schluessel ?? self::schluesselForm($t[1][0]);
                $unbekannt[$name] = true;
                $text .= '{{' . $name . '}}';
                continue;
            }
            $wert = trim(self::zeilenenden($werte[$schluessel]));
            if (!str_contains($wert, "\n")) {
                $text .= $wert;
                continue;
            }
            // Liste: eigene Zeile davor und danach; ein Satzzeichen direkt dahinter entfällt.
            if ($text !== '' && !str_ends_with($text, "\n")) {
                $text = rtrim($text, " \t") . "\n";
            }
            $text .= $wert;
            $rest = substr($vorlage, $pos);
            $ohneZeichen = ltrim($rest, " \t.,;:");
            if ($ohneZeichen !== '' && !str_starts_with($ohneZeichen, "\n")) {
                $text .= "\n";
            }
            $pos += strlen($rest) - strlen($ohneZeichen);
        }
        $text .= substr($vorlage, $pos);

        return ['text' => self::aufgeraeumt($text), 'unbekannt' => array_map('strval', array_keys($unbekannt))];
    }

    /**
     * Prüft einen fertigen Antworttext (nach dem Füllen bzw. nach der Bearbeitung durch einen
     * Menschen).
     *
     * @param array<string, mixed> $einordnung Zeile der Tabelle einordnung oder die Felder des Modells
     * @param array<string, mixed> $wissen
     * @return array{status: 'ok'|'warnung'|'abgelehnt', hinweise: string[]}
     */
    public static function pruefe(string $text, array $einordnung, array $wissen): array
    {
        $text = self::aufgeraeumt($text);
        $ablehnungen = [];
        $warnungen = [];

        if ($text === '') {
            $ablehnungen[] = self::HINWEIS_LEER;
        }

        // Platzhalter, die noch im Text stehen
        $werte = self::platzhalterWerte($wissen);
        $gesperrt = self::gesperrtePlatzhalter($wissen);
        foreach (self::platzhalterIn($text) as $roh) {
            $schluessel = self::aufloesen($roh, $werte);
            if ($schluessel !== null && isset($gesperrt[$schluessel])) {
                $ablehnungen[] = $gesperrt[$schluessel];
            } elseif ($schluessel !== null) {
                $ablehnungen[] = 'Platzhalter {{' . $schluessel . '}} ist nicht ausgefüllt.';
            } else {
                $ablehnungen[] = 'Unbekannter Platzhalter {{' . self::kurz(self::schluesselForm($roh), 60) . '}} – diesen Wert gibt es in der Wissensbasis nicht.';
            }
        }
        $ohnePlatzhalter = (string) preg_replace(self::MUSTER_PLATZHALTER, ' ', $text);
        if (str_contains($ohnePlatzhalter, '{{') || str_contains($ohnePlatzhalter, '}}')) {
            $ablehnungen[] = 'Im Text stehen Reste von Platzhalter-Klammern ({{ oder }}).';
        }

        // Beträge, die nicht in der Wissensbasis stehen
        $bekannt = self::bekannteBetraege($wissen);
        foreach (self::betraege($ohnePlatzhalter) as $betrag) {
            if (!isset($bekannt[$betrag['cent']])) {
                $warnungen[] = 'Betrag „' . $betrag['roh'] . '“ steht nicht in der Wissensbasis.';
            }
        }
        if (preg_match('/(?<![\p{L}])(?:ein(?:e[nmrs]?)?|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|\p{L}*(?:zehn|zig|ßig|hundert|tausend))' . self::RAUM . '+' . self::WAEHRUNG . '/iu', $ohnePlatzhalter, $m) === 1) {
            $warnungen[] = 'Betrag in Worten („' . self::kurz($m[0], 40) . '“) – bitte prüfen.';
        }
        $heuhaufen = self::wissenstext($wissen);
        if (preg_match_all('/(?<![\d.,])\d+(?:[.,]\d+)?' . self::RAUM . '*(?:%|Prozent(?![\p{L}]))/iu', $ohnePlatzhalter, $m) > 0) {
            foreach (array_unique($m[0]) as $prozent) {
                if (!str_contains($heuhaufen, self::vergleichsform($prozent))) {
                    $warnungen[] = 'Prozentangabe „' . self::kurz($prozent, 20) . '“ steht nicht in der Wissensbasis.';
                }
            }
        }

        // Kontonummern und Telefonnummern, die nicht aus der Wissensbasis stammen. Eine fremde IBAN
        // oder Rufnummer in einer Mail vom eigenen Postfach wäre der Kern eines Betrugsversuchs.
        foreach (self::ibans($ohnePlatzhalter) as $iban) {
            if (!str_contains(self::kompakt(self::alleTexte($wissen)), $iban)) {
                $warnungen[] = 'Kontonummer (IBAN) „' . self::kurz(substr($iban, 0, 4) . ' …', 20) . '“ steht nicht in der Wissensbasis – bitte prüfen.';
            }
        }
        $bekannteNummern = array_flip(array_column(self::telefonnummern(self::alleTexte($wissen)), 'ziffern'));
        foreach (self::telefonnummern($ohnePlatzhalter) as $nummer) {
            if (!isset($bekannteNummern[$nummer['ziffern']])) {
                $warnungen[] = 'Telefonnummer „' . self::kurz($nummer['roh'], 30) . '“ ist nicht die eigene – bitte prüfen.';
            }
        }

        // Adressen außerhalb der Links der Website
        $erlaubt = self::erlaubteAdressen($wissen);
        $eigeneMail = mb_strtolower(trim((string) (is_array($wissen['firma'] ?? null) ? ($wissen['firma']['email'] ?? '') : '')));
        foreach (self::adressen($ohnePlatzhalter) as $adresse) {
            if ($adresse['art'] === 'email') {
                if ($eigeneMail === '' || mb_strtolower($adresse['roh']) !== $eigeneMail) {
                    $warnungen[] = 'E-Mail-Adresse „' . self::kurz($adresse['roh'], 60) . '“ ist nicht die eigene Adresse.';
                }
            } elseif (!isset($erlaubt[self::adressForm($adresse['roh'])])) {
                $warnungen[] = 'Adresse „' . self::kurz($adresse['roh'], 80) . '“ gehört nicht zu den Links der Website.';
            }
        }

        // Zusagen: Zeitwörter, Geldwörter, Paragraphen, Zeitspannen
        $ohneZeiten = self::ohneZeitangabenDerWebsite($ohnePlatzhalter, $wissen);
        foreach (self::ZUSAGE_WOERTER as $muster => $wort) {
            if (preg_match('/' . $muster . '/iu', $ohneZeiten) === 1) {
                $warnungen[] = 'Klingt nach einer Zusage: „' . $wort . '“.';
            }
        }
        $ohneAktion = self::ohneAktionswortlaut($ohnePlatzhalter, $wissen);
        foreach (self::GELD_WOERTER as $muster => $wort) {
            if (preg_match('/' . $muster . '/iu', $ohneAktion) === 1) {
                $warnungen[] = '„' . $wort . '“ darf nur ein Mitarbeiter zusagen.';
            }
        }
        if (preg_match('/§|(?<![\p{L}])paragra(?:ph|f)/iu', $ohnePlatzhalter) === 1) {
            $warnungen[] = 'Paragraph oder Rechtsauskunft im Text – bitte prüfen.';
        }
        $spannenDerWebsite = self::zeitspannen($heuhaufen);
        foreach (self::zeitspannen(self::vergleichsform($ohneZeiten)) as $spanne => $roh) {
            if (!isset($spannenDerWebsite[$spanne])) {
                $warnungen[] = 'Zeitangabe „' . $roh . '“ steht nicht in der Wissensbasis.';
            }
        }

        // Form
        foreach (self::SELBSTBEZEICHNUNG as $muster => $was) {
            if (preg_match($muster, $ohnePlatzhalter) === 1) {
                $warnungen[] = $was === 'Mensch'
                    ? 'Der Text bezeichnet den Absender ausdrücklich als Mensch – bitte prüfen.'
                    : 'Der Text bezeichnet den Absender als KI oder Assistent – bitte prüfen.';
            }
        }
        if (preg_match('/(?<![\p{L}])(?:du|dir|dich|dein(?:e[mnrs]?)?|euch|euer|eure[mnrs]?)(?![\p{L}])/iu', $ohnePlatzhalter) === 1) {
            $warnungen[] = 'Anrede in der Du-Form – Kunden werden gesiezt.';
        }
        // Doppelte Wörter entstehen meist beim Füllen („dauert meist {{ZEIT:…}}“ → „meist meist“).
        // Geprüft wird der gefüllte Text: Erst dort steht, was der Kunde liest.
        // „die die“, „der der“ … sind richtiges Deutsch („Kunden, die die Abmeldung beauftragen“).
        if (preg_match_all('/(?<![\p{L}])(\p{L}{3,})[ \t]+\1(?![\p{L}])/iu', $text, $treffer, PREG_SET_ORDER) > 0) {
            foreach ($treffer as $m) {
                if (!in_array(mb_strtolower($m[1]), ['die', 'der', 'das', 'den', 'dem', 'des', 'sie'], true)) {
                    $warnungen[] = 'Doppeltes Wort „' . self::kurz($m[0], 40) . '“ – bitte glätten.';
                    break;
                }
            }
        }
        // Aus einem Namen auf das Geschlecht schließen („auf Sie als neue Halterin“) – die
        // Doppelform der Website („die neue Halterin oder den neuen Halter“) ist neutral.
        if (preg_match_all('/(?<![\p{L}])' . self::PERSON_FORMEN . '(?![\p{L}])/u', $ohnePlatzhalter, $formen, PREG_OFFSET_CAPTURE) > 0) {
            foreach ($formen[0] as [$wort, $stelle]) {
                $davor = substr($ohnePlatzhalter, max(0, $stelle - 40), min(40, $stelle));
                $danach = substr($ohnePlatzhalter, $stelle + strlen($wort), 12);
                if (preg_match('/oder\s+(?:\p{L}+\s+){0,2}$/u', $davor) !== 1 && preg_match('/^\s+oder\s/u', $danach) !== 1) {
                    $warnungen[] = '„' . $wort . '“ setzt ein Geschlecht voraus – bitte neutral formulieren (etwa „auf Sie“).';
                    break;
                }
            }
        }
        if (preg_match('/\*\*|^#{1,6}\s|```/mu', $ohnePlatzhalter) === 1) {
            $warnungen[] = 'Formatierungszeichen im Text (Sternchen oder Rauten) – in der Mail erscheinen sie wörtlich.';
        }
        if (mb_strlen($text) > self::MAX_ZEICHEN) {
            $warnungen[] = 'Sehr langer Text (' . mb_strlen($text) . ' Zeichen, üblich sind unter ' . self::MAX_ZEICHEN . ').';
        }

        if (self::mussMensch($einordnung)) {
            $warnungen[] = 'Bitte selbst prüfen: ' . self::grundMensch($einordnung);
        }

        return self::ergebnis($ablehnungen, $warnungen);
    }

    /**
     * Prüft die Vorlage des Modells vor dem Füllen: Dort darf kein Betrag und keine Adresse im
     * freien Text stehen, und Preis-Platzhalter müssen zur eingeordneten Leistung passen.
     * Unbekannte Platzhalter meldet pruefe() am gefüllten Text.
     *
     * @param array<string, mixed> $einordnung
     * @param array<string, mixed> $wissen
     * @return array{status: 'ok'|'warnung'|'abgelehnt', hinweise: string[]}
     */
    public static function pruefeVorlage(string $vorlage, array $einordnung, array $wissen): array
    {
        $vorlage = self::zeilenenden($vorlage);
        $frei = (string) preg_replace(self::MUSTER_PLATZHALTER, ' ', $vorlage);
        $warnungen = [];

        foreach (self::betraege($frei) as $betrag) {
            $warnungen[] = 'Betrag „' . $betrag['roh'] . '“ hat das Modell selbst geschrieben statt eines Platzhalters.';
        }
        $gemeldet = [];
        foreach (self::adressen($frei) as $adresse) {
            $warnungen[] = 'Adresse „' . self::kurz($adresse['roh'], 80) . '“ hat das Modell selbst geschrieben statt eines Platzhalters.';
            $gemeldet[mb_strtolower($adresse['roh'])] = true;
        }
        // Strenger als pruefe(): Links kommen nur über Platzhalter. Jedes „wort.wort“ ohne
        // Leerzeichen kann eine Adresse sein, die ein Mailprogramm verlinkt – ein Fehlalarm kostet
        // nur einen Klick.
        if (preg_match_all('/(?<![\p{L}\d@.\-])[\p{L}\d][\p{L}\d\-]*(?:\.[\p{L}\d\-]+)*\.(\p{L}{2,})(?![\p{L}\d])/u', $frei, $treffer, PREG_SET_ORDER) > 0) {
            foreach ($treffer as $t) {
                $wort = $t[0];
                $schon = false;
                foreach (array_keys($gemeldet) as $g) {
                    $schon = $schon || str_contains((string) $g, mb_strtolower($wort));
                }
                if (!$schon && !in_array(mb_strtolower($t[1]), self::DATEIENDUNGEN, true)) {
                    $warnungen[] = '„' . self::kurz($wort, 60) . '“ sieht aus wie eine Internetadresse – Links nur über Platzhalter.';
                    $gemeldet[mb_strtolower($wort)] = true;
                }
            }
        }

        // Preis-Platzhalter anderer Leistungen
        $leistung = self::slugForm((string) ($einordnung['leistung'] ?? ''));
        $slugs = [];
        foreach ((array) ($wissen['leistungen'] ?? []) as $eintrag) {
            if (is_array($eintrag) && is_string($eintrag['slug'] ?? null)) {
                $slugs[self::slugForm($eintrag['slug'])] = $eintrag['slug'];
            }
        }
        if ($leistung !== '' && isset($slugs[$leistung])) {
            $werte = self::platzhalterWerte($wissen);
            $genannt = [];
            foreach (self::platzhalterIn($vorlage) as $roh) {
                $schluessel = self::aufloesen($roh, $werte) ?? self::schluesselForm($roh);
                if (stripos($schluessel, 'PREIS:') !== 0) {
                    continue;
                }
                $slug = self::slugForm(substr($schluessel, 6));
                if (isset($slugs[$slug])) {
                    $genannt[$slug] = $slugs[$slug];
                }
            }
            if ($genannt !== [] && !isset($genannt[$leistung])) {
                $warnungen[] = 'Der Entwurf nennt nur Preise anderer Leistungen (' . implode(', ', $genannt)
                    . '), eingeordnet wurde „' . $slugs[$leistung] . '“.';
            }
        }

        return self::ergebnis([], $warnungen);
    }

    /**
     * Füllen und beide Prüfungen in einem Schritt – so entsteht ein neuer Entwurf.
     *
     * @param array<string, mixed> $einordnung
     * @param array<string, mixed> $wissen
     * @return array{text: string, unbekannt: string[], status: 'ok'|'warnung'|'abgelehnt', hinweise: string[]}
     */
    public static function pruefeEntwurf(string $vorlage, array $einordnung, array $wissen): array
    {
        $gefuellt = self::fuelle($vorlage, $wissen);
        $gesamt = self::vereine(
            self::pruefeVorlage($vorlage, $einordnung, $wissen),
            self::pruefe($gefuellt['text'], $einordnung, $wissen)
        );
        return [
            'text' => $gefuellt['text'],
            'unbekannt' => $gefuellt['unbekannt'],
            'status' => $gesamt['status'],
            'hinweise' => $gesamt['hinweise'],
        ];
    }

    /**
     * Fasst mehrere Prüfergebnisse zusammen: der strengste Status gewinnt, Hinweise ohne Doppelte.
     *
     * @param array{status?: string, hinweise?: mixed} ...$ergebnisse
     * @return array{status: 'ok'|'warnung'|'abgelehnt', hinweise: string[]}
     */
    public static function vereine(array ...$ergebnisse): array
    {
        $rang = ['ok' => 0, 'warnung' => 1, 'abgelehnt' => 2];
        $status = 'ok';
        $hinweise = [];
        foreach ($ergebnisse as $ergebnis) {
            $s = (string) ($ergebnis['status'] ?? 'ok');
            if (($rang[$s] ?? 0) > $rang[$status]) {
                $status = $s;
            }
            foreach ((array) ($ergebnis['hinweise'] ?? []) as $hinweis) {
                if (is_string($hinweis) && $hinweis !== '') {
                    $hinweise[$hinweis] = true;
                }
            }
        }
        return ['status' => $status, 'hinweise' => array_map('strval', array_keys($hinweise))];
    }

    /**
     * Muss ein Mitarbeiter selbst entscheiden? Gilt bei Übergabe, Manipulationsverdacht,
     * Beschwerde, Frage zum Auftragsstand, fehlendem Kundenanliegen und verärgertem Ton.
     *
     * @param array<string, mixed> $einordnung
     */
    public static function mussMensch(array $einordnung): bool
    {
        if (self::wahr($einordnung['uebergabe'] ?? false)
            || self::wahr($einordnung['manipulation'] ?? false)
            || self::wahr($einordnung['manipulation_verdacht'] ?? false)) {
            return true;
        }
        $anliegen = mb_strtolower(trim((string) ($einordnung['anliegen'] ?? '')));
        if (in_array($anliegen, ['beschwerde', 'auftragsstatus', 'kein_kundenanliegen'], true)) {
            return true;
        }
        return mb_strtolower(trim((string) ($einordnung['stimmung'] ?? ''))) === 'veraergert';
    }

    /**
     * Die Platzhalter-Namen, die in einem Text stehen (roh, in der Reihenfolge des Auftretens,
     * ohne Doppelte). Leer heißt: nichts mehr zu füllen.
     *
     * @return string[]
     */
    public static function platzhalterIn(string $text): array
    {
        if (preg_match_all(self::MUSTER_PLATZHALTER, $text, $m) < 1) {
            return [];
        }
        $namen = [];
        foreach ($m[1] as $roh) {
            $namen[trim($roh)] = true;
        }
        return array_map('strval', array_keys($namen));
    }

    /** true, wenn im Text noch Platzhalter oder einzelne Platzhalter-Klammern stehen. */
    public static function hatPlatzhalterReste(string $text): bool
    {
        return str_contains($text, '{{') || str_contains($text, '}}');
    }

    /**
     * Eurobeträge eines Textes: „34 €“, „34,00 €“, „34,- €“, „34 Euro“, „EUR 34“, „€34“,  (preis-ok: Formbeispiele, keine Preisangabe)
     * „1.234,50 €“ und beide Enden einer Spanne („12,80 – 23,72 €“).
     *
     * @return list<array{cent: int, roh: string}>
     */
    public static function betraege(string $text): array
    {
        $z = self::ZAHL;
        $w = self::WAEHRUNG;
        $r = self::RAUM;
        $strich = '(?:[.,](?:-{1,2}|–|—))?';
        $muster = [
            // Zahl vor Währung
            '/(?<![\d.,])(' . $z . ')' . $strich . $r . '*' . $w . '/iu',
            // Währung vor Zahl – nur „€“ und „EUR“; „Euro 6“ ist eine Abgasnorm, kein Betrag
            '/(?:€|(?<![\p{L}])EUR(?![\p{L}]))' . $r . '*(' . $z . ')(?![\d])/u',
            // Anfang einer Spanne
            '/(?<![\d.,])(' . $z . ')' . $r . '*(?:–|—|-|bis)' . $r . '*' . $z . $strich . $r . '*' . $w . '/iu',
        ];
        $gefunden = [];
        foreach ($muster as $nr => $ausdruck) {
            if (preg_match_all($ausdruck, $text, $m, PREG_SET_ORDER) < 1) {
                continue;
            }
            foreach ($m as $t) {
                $cent = self::cent($t[1]);
                if ($cent === null) {
                    continue;
                }
                $roh = $nr === 2 ? $t[1] . ' €' : trim((string) preg_replace('/' . $r . '+/u', ' ', $t[0]));
                $gefunden[$cent] ??= ['cent' => $cent, 'roh' => self::kurz($roh, 30)];
            }
        }
        return array_values($gefunden);
    }

    /**
     * Internetadressen und E-Mail-Adressen eines Textes: http(s)-Adressen, „www.…“ und nackte
     * Domains wie „beispiel.de/seite“.
     *
     * @return list<array{art: 'email'|'url'|'domain', roh: string}>
     */
    public static function adressen(string $text): array
    {
        $gefunden = [];
        $merke = static function (string $art, string $roh) use (&$gefunden): void {
            $gefunden[$art . ':' . mb_strtolower($roh)] ??= ['art' => $art, 'roh' => $roh];
        };
        $rest = (string) preg_replace_callback(
            '/[\p{L}\d._%+\-]+@[\p{L}\d.\-]+\.\p{L}{2,}/u',
            static function (array $m) use ($merke): string {
                $merke('email', rtrim($m[0], '.'));
                return ' ';
            },
            $text
        );
        $rest = (string) preg_replace_callback(
            '~(?:https?://|www\.)[^\s<>"\'“”„«»]+~iu',
            static function (array $m) use ($merke): string {
                $roh = rtrim($m[0], '.,;:!?)]}…');
                if ($roh !== '') {
                    $merke('url', $roh);
                }
                return ' ';
            },
            $rest
        );
        // Nackte Domain, Endung in jeder Schreibweise – Mailprogramme verlinken auch „BEISPIEL.DE“.
        // Ausgenommen ist nur das Muster eines fehlenden Leerzeichens nach dem Satzpunkt: Endung
        // groß, dann klein („Ende.Danach“), kein Pfad dahinter und keine bekannte Endung. Davor darf
        // alles stehen außer Buchstaben, Ziffern und „@“ (auch „-“ oder „/“).
        $muster = '~(?<![\p{L}\d@])((?:[\p{L}\d](?:[\p{L}\d\-]{0,61}[\p{L}\d])?\.)+([A-Za-z]{2,24}))(?![\p{L}\d\-])((?:/[^\s<>"\'“”„«»]*)?)~u';
        if (preg_match_all($muster, $rest, $m, PREG_SET_ORDER) > 0) {
            foreach ($m as $t) {
                $endung = strtolower($t[2]);
                if (in_array($endung, self::DATEIENDUNGEN, true)) {
                    continue;
                }
                $satzanfang = preg_match('/^[A-Z][a-z]+$/', $t[2]) === 1 && $t[3] === '' && !in_array($endung, self::BEKANNTE_ENDUNGEN, true);
                if ($satzanfang) {
                    continue;
                }
                $merke('domain', rtrim($t[1] . $t[3], '.,;:!?)]}…'));
            }
        }
        return array_values($gefunden);
    }

    /**
     * IBANs eines Textes (auch mit Leerzeichen oder Bindestrichen geschrieben), kompakt und groß.
     * Nur, was die Prüfsumme (mod 97) besteht und mindestens zehn Ziffern hat.
     *
     * @return string[]
     */
    public static function ibans(string $text): array
    {
        $gefunden = [];
        if (preg_match_all('/(?<![A-Za-z0-9])[A-Za-z][ \-]{0,3}[A-Za-z](?:[ \-]{0,3}\d){2}(?:[ \-]{0,3}[A-Za-z0-9]){11,30}/', $text, $m) < 1) {
            return [];
        }
        foreach ($m[0] as $roh) {
            $kompakt = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $roh));
            $land = substr($kompakt, 0, 2);
            $laengen = isset(self::IBAN_LAENGEN[$land]) ? [self::IBAN_LAENGEN[$land]] : range(min(34, strlen($kompakt)), 15);
            foreach ($laengen as $laenge) {
                $kandidat = substr($kompakt, 0, $laenge);
                if (strlen($kandidat) === $laenge && preg_match_all('/\d/', $kandidat) >= 10 && self::ibanGueltig($kandidat)) {
                    $gefunden[$kandidat] = true;
                    break;
                }
            }
        }
        return array_map('strval', array_keys($gefunden));
    }

    /**
     * Telefonnummern eines Textes (beginnend mit 0, 00 oder +, 7 bis 15 Ziffern). „ziffern“ ist die
     * Vergleichsform: nur Ziffern, Ländervorwahl +49/0049 als führende 0.
     *
     * @return list<array{roh: string, ziffern: string}>
     */
    public static function telefonnummern(string $text): array
    {
        $gefunden = [];
        if (preg_match_all('~(?<![\p{L}\d+\-/.,:])(?:\+|00)?\d(?:[ \t/\-()]{0,3}\d){6,}~u', $text, $m) < 1) {
            return [];
        }
        foreach ($m[0] as $roh) {
            $roh = trim($roh);
            if (!str_starts_with($roh, '0') && !str_starts_with($roh, '+')) {
                continue;
            }
            $ziffern = (string) preg_replace('/\D/', '', $roh);
            if (str_starts_with($roh, '+')) {
                $ziffern = str_starts_with($ziffern, '49') ? '0' . substr($ziffern, 2) : '00' . $ziffern;
            } elseif (str_starts_with($ziffern, '0049')) {
                $ziffern = '0' . substr($ziffern, 4);
            }
            $anzahl = strlen($ziffern);
            if ($anzahl < 7 || $anzahl > 16) {
                continue;
            }
            $gefunden[$ziffern] ??= ['roh' => $roh, 'ziffern' => $ziffern];
        }
        return array_values($gefunden);
    }

    // ---------------------------------------------------------------------------------------
    // Hilfen
    // ---------------------------------------------------------------------------------------

    /** IBAN-Prüfsumme nach ISO 13616 (mod 97 = 1), ohne große Zahlen. */
    private static function ibanGueltig(string $iban): bool
    {
        if (preg_match('/^[A-Z]{2}\d{2}[A-Z0-9]+$/', $iban) !== 1) {
            return false;
        }
        $umgestellt = substr($iban, 4) . substr($iban, 0, 4);
        $rest = 0;
        foreach (str_split($umgestellt) as $zeichen) {
            $wert = ctype_digit($zeichen) ? $zeichen : (string) (ord($zeichen) - 55);
            foreach (str_split($wert) as $ziffer) {
                $rest = ($rest * 10 + (int) $ziffer) % 97;
            }
        }
        return $rest === 1;
    }

    /** Nur Buchstaben und Ziffern, groß – zum Vergleich von Kontonummern. */
    private static function kompakt(string $text): string
    {
        return strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', $text));
    }

    /**
     * @param string[] $ablehnungen
     * @param string[] $warnungen
     * @return array{status: 'ok'|'warnung'|'abgelehnt', hinweise: string[]}
     */
    private static function ergebnis(array $ablehnungen, array $warnungen): array
    {
        $hinweise = array_values(array_unique(array_merge($ablehnungen, $warnungen)));
        $status = $ablehnungen !== [] ? 'abgelehnt' : ($warnungen !== [] ? 'warnung' : 'ok');
        return ['status' => $status, 'hinweise' => $hinweise];
    }

    /**
     * @param array<string, mixed> $wissen
     * @return array<string, string>
     */
    private static function platzhalterWerte(array $wissen): array
    {
        $werte = [];
        foreach ((array) ($wissen['platzhalter'] ?? []) as $schluessel => $wert) {
            if (is_string($wert) && (string) $schluessel !== '') {
                $werte[(string) $schluessel] = $wert;
            }
        }
        return $werte;
    }

    /**
     * Preis-Platzhalter, die nicht mehr gefüllt werden dürfen, mit dem Grund: die Preise einer
     * abgelaufenen Aktion – und alle Preise, wenn die Wissensbasis veraltet ist (Wissen::veraltet).
     *
     * @param array<string, mixed> $wissen
     * @return array<string, string> Schlüssel → Hinweis
     */
    private static function gesperrtePlatzhalter(array $wissen): array
    {
        $gesperrt = [];
        if (Wissen::veraltet($wissen)) {
            foreach (array_keys(self::platzhalterWerte($wissen)) as $schluessel) {
                if (str_starts_with($schluessel, 'PREIS:')) {
                    $gesperrt[$schluessel] = self::HINWEIS_WISSEN_VERALTET;
                }
            }
            return $gesperrt;
        }
        if (!Wissen::aktionAbgelaufen($wissen)) {
            return [];
        }
        foreach (Wissen::aktionsLeistungen($wissen) as $slug) {
            $gesperrt['PREIS:' . $slug] = self::HINWEIS_AKTION_ABGELAUFEN;
        }
        return $gesperrt;
    }

    /**
     * Findet zu einem geschriebenen Platzhalter den Schlüssel der Wissensbasis. Groß-/Klein-
     * schreibung und Leerzeichen spielen keine Rolle, damit „{{ preis:Abmeldung }}“ nicht an
     * einer Äußerlichkeit scheitert.
     *
     * @param array<string, string> $werte
     */
    private static function aufloesen(string $roh, array $werte): ?string
    {
        $form = self::schluesselForm($roh);
        if ($form === '') {
            return null;
        }
        if (isset($werte[$form])) {
            return $form;
        }
        $klein = mb_strtolower($form);
        foreach ($werte as $schluessel => $unbenutzt) {
            if (mb_strtolower((string) $schluessel) === $klein) {
                return (string) $schluessel;
            }
        }
        return null;
    }

    private static function schluesselForm(string $roh): string
    {
        return (string) preg_replace('/\s+/u', '', trim($roh));
    }

    /** Slug zum Vergleichen: klein, Unterstrich wie Bindestrich (ersatz_dokumente = ersatz-dokumente). */
    private static function slugForm(string $slug): string
    {
        $slug = mb_strtolower(trim($slug));
        return $slug === 'keine' ? '' : str_replace('_', '-', $slug);
    }

    /** Betrag in Cent; null, wenn die Zeichenfolge keine sinnvolle Zahl ist. */
    private static function cent(string $zahl): ?int
    {
        $zahl = (string) preg_replace('/[\'\x{00A0}\x{202F}\x{2009}\s]/u', '', $zahl);
        $punkt = strrpos($zahl, '.');
        $komma = strrpos($zahl, ',');
        $dezimal = null;
        if ($punkt !== false && $komma !== false) {
            $dezimal = max($punkt, $komma);
        } elseif ($punkt !== false || $komma !== false) {
            $stelle = (int) ($punkt !== false ? $punkt : $komma);
            $trenner = $zahl[$stelle];
            $nachkomma = strlen($zahl) - $stelle - 1;
            // Ein einzelner Trenner mit genau drei Ziffern dahinter ist ein Tausender-Trenner.
            if (substr_count($zahl, $trenner) === 1 && $nachkomma <= 2) {
                $dezimal = $stelle;
            }
        }
        if ($dezimal === null) {
            $ganz = (string) preg_replace('/\D/', '', $zahl);
            $bruch = '';
        } else {
            $ganz = (string) preg_replace('/\D/', '', substr($zahl, 0, $dezimal));
            $bruch = (string) preg_replace('/\D/', '', substr($zahl, $dezimal + 1));
        }
        if ($ganz === '' || strlen($ganz) > 9) {
            return null;
        }
        return (int) $ganz * 100 + (int) str_pad(substr($bruch, 0, 2), 2, '0');
    }

    /**
     * Alle Beträge, die irgendwo in der Wissensbasis stehen (in Cent). Ist die Aktion abgelaufen,
     * zählen ihre Preise nicht mehr dazu – es sei denn, derselbe Betrag gilt regulär für etwas
     * anderes.
     *
     * @param array<string, mixed> $wissen
     * @return array<int, true>
     */
    private static function bekannteBetraege(array $wissen): array
    {
        // Veraltete Wissensbasis: Kein Betrag gilt als bestätigt – jeder braucht einen Blick.
        if (Wissen::veraltet($wissen)) {
            return [];
        }
        $bekannt = [];
        foreach (self::betraege(self::alleTexte($wissen)) as $betrag) {
            $bekannt[$betrag['cent']] = true;
        }
        if (!Wissen::aktionAbgelaufen($wissen)) {
            return $bekannt;
        }
        $aktion = array_flip(Wissen::aktionsLeistungen($wissen));
        $abgelaufen = [];
        $regulaer = [];
        foreach ((array) ($wissen['leistungen'] ?? []) as $leistung) {
            if (!is_array($leistung) || !empty($leistung['preis_auf_anfrage'])) {
                continue;
            }
            foreach (self::betraege((string) ($leistung['preis'] ?? '')) as $betrag) {
                if (isset($aktion[(string) ($leistung['slug'] ?? '')])) {
                    $abgelaufen[$betrag['cent']] = true;
                } else {
                    $regulaer[$betrag['cent']] = true;
                }
            }
        }
        foreach ((array) ($wissen['zusatz'] ?? []) as $zusatz) {
            foreach (self::betraege(is_array($zusatz) ? (string) ($zusatz['preis'] ?? '') : '') as $betrag) {
                $regulaer[$betrag['cent']] = true;
            }
        }
        foreach (array_keys($abgelaufen) as $cent) {
            if (!isset($regulaer[$cent])) {
                unset($bekannt[$cent]);
            }
        }
        return $bekannt;
    }

    /**
     * Erlaubte Adressen in Vergleichsform: die Links der Wissensbasis, die Website selbst und
     * ihre nackte Domain.
     *
     * @param array<string, mixed> $wissen
     * @return array<string, true>
     */
    private static function erlaubteAdressen(array $wissen): array
    {
        $erlaubt = [];
        foreach ((array) ($wissen['links'] ?? []) as $link) {
            if (is_string($link) && trim($link) !== '') {
                $erlaubt[self::adressForm($link)] = true;
            }
        }
        $web = is_array($wissen['firma'] ?? null) ? trim((string) ($wissen['firma']['web'] ?? '')) : '';
        if ($web !== '') {
            $form = self::adressForm($web);
            $erlaubt[$form] = true;
            $erlaubt[explode('/', $form)[0]] = true;
        }
        return $erlaubt;
    }

    /** Adresse zum Vergleichen: klein, ohne http(s)://, ohne „www.“, ohne Schrägstrich am Ende. */
    private static function adressForm(string $adresse): string
    {
        $adresse = mb_strtolower(trim($adresse));
        $adresse = (string) preg_replace('~^https?://~', '', $adresse);
        $adresse = (string) preg_replace('~^www\.~', '', $adresse);
        return rtrim($adresse, '/');
    }

    /**
     * Alle Texte der Wissensbasis hintereinander (für „steht das wörtlich auf der Website?“).
     *
     * @param array<mixed> $wissen
     */
    private static function alleTexte(array $wissen): string
    {
        $teile = [];
        array_walk_recursive($wissen, static function (mixed $wert) use (&$teile): void {
            if (is_string($wert) && $wert !== '') {
                $teile[] = $wert;
            }
        });
        return implode("\n", $teile);
    }

    /** @param array<string, mixed> $wissen */
    private static function wissenstext(array $wissen): string
    {
        return self::vergleichsform(self::alleTexte($wissen));
    }

    /** Klein, Striche vereinheitlicht, Leerraum (auch geschützter) zu einem Leerzeichen. */
    private static function vergleichsform(string $text): string
    {
        $text = mb_strtolower($text);
        $text = str_replace(['–', '—', '‑', '−'], '-', $text);
        return trim((string) preg_replace('/' . self::RAUM . '+/u', ' ', $text));
    }

    /**
     * Zeitspannen eines Textes in Vergleichsform, z. B. „10-30|minute“ → „10-30 minuten“.
     * Der Text muss schon in Vergleichsform sein.
     *
     * @return array<string, string>
     */
    private static function zeitspannen(string $text): array
    {
        $einheiten = [
            'minute' => 'minuten?', 'stunde' => 'stunden?', 'werktag' => 'werktag(?:en|e|s)?',
            'tag' => 'tag(?:en|e|s)?', 'woche' => 'wochen?', 'monat' => 'monat(?:en|e|s)?',
        ];
        $spannen = [];
        foreach ($einheiten as $stamm => $muster) {
            $ausdruck = '/(?<![\d.,:])(\d+(?: ?- ?\d+)?) ?(' . $muster . ')(?![\p{L}])/u';
            if (preg_match_all($ausdruck, $text, $m, PREG_SET_ORDER) < 1) {
                continue;
            }
            foreach ($m as $t) {
                $zahl = str_replace(' ', '', $t[1]);
                $spannen[$zahl . '|' . $stamm] ??= $zahl . ' ' . $t[2];
            }
        }
        return $spannen;
    }

    /**
     * Entfernt die Zeitangaben, die wörtlich in wissen.zeiten stehen – darin dürfen Wörter wie
     * „innerhalb“ vorkommen, ohne dass sie als Zusage gelten.
     *
     * @param array<string, mixed> $wissen
     */
    private static function ohneZeitangabenDerWebsite(string $text, array $wissen): string
    {
        foreach ((array) ($wissen['zeiten'] ?? []) as $wert) {
            if (is_string($wert) && trim($wert) !== '') {
                $text = str_ireplace(trim($wert), ' ', $text);
            }
        }
        return $text;
    }

    /**
     * Entfernt Namen und Wortlaut der laufenden Aktion („Gründerrabatt“ ist dann kein
     * unzulässiger Rabatt). Bei abgelaufener Aktion bleibt alles stehen.
     *
     * @param array<string, mixed> $wissen
     */
    private static function ohneAktionswortlaut(string $text, array $wissen): string
    {
        $aktion = $wissen['aktion'] ?? null;
        if (!is_array($aktion) || Wissen::aktionAbgelaufen($wissen)) {
            return $text;
        }
        foreach (['text', 'name'] as $feld) {
            $wert = trim((string) ($aktion[$feld] ?? ''));
            if ($wert !== '') {
                $text = str_ireplace($wert, ' ', $text);
            }
        }
        return $text;
    }

    /** @param array<string, mixed> $einordnung */
    private static function grundMensch(array $einordnung): string
    {
        $gruende = [];
        if (self::wahr($einordnung['manipulation'] ?? false) || self::wahr($einordnung['manipulation_verdacht'] ?? false)) {
            $gruende[] = 'Verdacht auf Manipulationsversuch';
        }
        $anliegen = mb_strtolower(trim((string) ($einordnung['anliegen'] ?? '')));
        $texte = [
            'beschwerde' => 'Beschwerde',
            'auftragsstatus' => 'Frage zum Stand eines Auftrags',
            'kein_kundenanliegen' => 'kein Kundenanliegen erkannt',
        ];
        if (isset($texte[$anliegen])) {
            $gruende[] = $texte[$anliegen];
        }
        if (mb_strtolower(trim((string) ($einordnung['stimmung'] ?? ''))) === 'veraergert') {
            $gruende[] = 'verärgerter Ton';
        }
        $grund = rtrim(trim((string) preg_replace('/\s+/u', ' ', (string) ($einordnung['uebergabe_grund'] ?? ''))), '.');
        $schon = array_map('mb_strtolower', $gruende);
        if ($grund !== '' && !in_array(mb_strtolower($grund), $schon, true)) {
            // Der Grund des Modells nur, wenn er mehr sagt als die schon genannten Merkmale.
            $gruende[] = self::kurz($grund, 200);
        } elseif ($gruende === []) {
            $gruende[] = 'Übergabe an einen Mitarbeiter';
        }
        return implode('; ', $gruende) . '.';
    }

    private static function wahr(mixed $wert): bool
    {
        if (is_string($wert)) {
            return in_array(mb_strtolower(trim($wert)), ['1', 'true', 'ja'], true);
        }
        return (bool) $wert;
    }

    private static function kurz(string $text, int $max): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        return mb_strlen($text) > $max ? mb_substr($text, 0, $max - 1) . '…' : $text;
    }

    private static function zeilenenden(string $text): string
    {
        return str_replace(["\r\n", "\r"], "\n", $text);
    }

    /** Einheitliche Zeilenenden, keine Leerzeichen am Zeilenende, höchstens eine Leerzeile. */
    private static function aufgeraeumt(string $text): string
    {
        $text = self::zeilenenden($text);
        $text = (string) preg_replace('/[ \t]+\n/u', "\n", $text);
        $text = (string) preg_replace('/\n{3,}/u', "\n\n", $text);
        return trim($text);
    }
}
