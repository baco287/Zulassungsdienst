<?php
/**
 * KI-Assistent – Budget: was ein Claude-Aufruf kostet und ob noch einer erlaubt ist.
 *
 * Jede API-Antwort wird mit ihren Token-Zahlen in der Tabelle verbrauch gebucht (buche()).
 * Vor jedem Aufruf fragt der Kern darfAufrufen(): Pause-Schalter, Not-Aus-Datei, Sperre nach
 * harten Fehlern, eigenes Monats- und Tageslimit, Zahl der Aufrufe je Tag und je Absender.
 * Diese Limits sind die zweite Sicherung neben dem Ausgabenlimit im Anthropic-Konto – sie
 * greifen auch dann, wenn dort nichts eingestellt ist.
 *
 * Geld wird als ganze Zahl in Millionstel US-Dollar gerechnet (kosten_mikro_usd), damit
 * sich beim Summieren keine Rundungsfehler ansammeln. Tages- und Monatsgrenzen gelten nach
 * Berliner Zeit.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Budget
{
    /**
     * Preise in US-Dollar je 1 Million Tokens (Anthropic-Preisseite, Stand siehe 'stand').
     * Ändert Anthropic die Preise, hier anpassen und 'stand' fortschreiben.
     */
    public const PREISE = [
        'claude-haiku-5-5'  => ['eingabe' => 0.10, 'ausgabe' => 0.50, 'cache_5m' => 0.125, 'cache_1h' => 0.20, 'cache_lesen' => 0.01],
        'claude-sonnet-5-5' => ['eingabe' => 2.00, 'ausgabe' => 10.00, 'cache_5m' => 2.50, 'cache_1h' => 4.00, 'cache_lesen' => 0.10],
        'stand'             => '2026-11-22',
    ];

    /** Mit diesen Preisen wird ein unbekanntes Modell gerechnet – lieber zu hoch als zu niedrig. */
    private const MODELL_UNBEKANNT = 'claude-sonnet-5-5';

    /**
     * Haiku 5.5 kostet bei Prompts über 100.000 Tokens das Fünffache (0,50 / 2,50 USD).
     * Der Assistent kommt nie in diese Größe (Mailtext ist auf 6.000 Zeichen gekürzt); die
     * Regel steht hier, damit die Buchung auch dann nicht zu niedrig ausfällt.
     */
    private const LANGER_PROMPT = [
        'claude-haiku-5-5' => ['ab_tokens' => 100000, 'faktor' => 5],
    ];

    /**
     * Umrechnung für die Schätzung ohne Antwort. Gemessen (Modell-Test 22.11.2026): 41.515 Zeichen
     * Systemtext = 22.809 Tokens, also 1,82 Zeichen je Token (Platzhalter, Umlaute, Listen). 1,8
     * schätzt knapp darüber. Der Aufschlag für das Schreiben in den Cache wird eigens gerechnet.
     */
    private const ZEICHEN_JE_TOKEN = 1.8;

    private const ZONE = 'Europe/Berlin';

    /**
     * Kosten eines Aufrufs in Millionstel US-Dollar, auf den nächsten ganzen Wert aufgerundet.
     * input_tokens zählt nur die nicht gecachte Eingabe; Cache-Schreiben und Cache-Lesen
     * meldet die API getrennt. Denk-Tokens stecken schon in output_tokens.
     *
     * @param array<string,mixed> $usage input_tokens, output_tokens, cache_schreiben_5m, cache_schreiben_1h, cache_lesen, denk_tokens
     */
    public static function kostenMikroUsd(string $modell, array $usage): int
    {
        $bekannt = self::bekanntesModell($modell);
        $preise = self::PREISE[$bekannt];
        $eingabe = self::ganzzahl($usage, 'input_tokens');
        $cache5m = self::ganzzahl($usage, 'cache_schreiben_5m');
        $cache1h = self::ganzzahl($usage, 'cache_schreiben_1h');
        $cacheLesen = self::ganzzahl($usage, 'cache_lesen');
        $ausgabe = self::ganzzahl($usage, 'output_tokens');

        // USD je 1 Mio. Tokens ist dasselbe wie Mikro-USD je Token. Gerechnet wird in Tausendstel
        // davon und mit ganzen Zahlen: So ergibt 0,125 keine krummen Gleitkomma-Summen.
        $tausendstel = static fn (string $art): int => (int) round($preise[$art] * 1000);
        $summe = $eingabe * $tausendstel('eingabe')
            + $cache5m * $tausendstel('cache_5m')
            + $cache1h * $tausendstel('cache_1h')
            + $cacheLesen * $tausendstel('cache_lesen')
            + $ausgabe * $tausendstel('ausgabe');

        $stufe = self::LANGER_PROMPT[$bekannt] ?? null;
        if ($stufe !== null && $eingabe + $cache5m + $cache1h + $cacheLesen > $stufe['ab_tokens']) {
            $summe *= $stufe['faktor'];
        }
        return intdiv($summe + 999, 1000);
    }

    /**
     * Höchstpreis eines Aufrufs, dessen Antwort ausgeblieben ist (Zeitüberschreitung,
     * Netzabbruch) oder noch aussteht (Vorab-Buchung). Anthropic rechnet solche Aufrufe unter
     * Umständen trotzdem ab; gebucht wird deshalb die geschätzte Eingabe plus die volle erlaubte
     * Ausgabe – mit Cache die ganze Eingabe zum Preis des Cache-Schreibens ($cache '5m' oder '1h'),
     * denn der ist der höchste, der anfallen kann.
     *
     * @param int $zeichenEingabe Zeichenzahl von System- und Nutzertext zusammen
     */
    public static function schaetzeHoechstpreis(string $modell, int $zeichenEingabe, int $maxTokens, string $cache = ''): int
    {
        $tokens = (int) ceil(max(0, $zeichenEingabe) / self::ZEICHEN_JE_TOKEN);
        $art = match ($cache) {
            '1h' => 'cache_schreiben_1h',
            '5m' => 'cache_schreiben_5m',
            default => 'input_tokens',
        };
        return self::kostenMikroUsd($modell, [$art => $tokens, 'output_tokens' => max(0, $maxTokens)]);
    }

    /**
     * Darf jetzt ein Claude-Aufruf für eine Mail dieses Absenders starten? Geprüft wird in
     * fester Reihenfolge, genannt wird der erste Grund (er wird status_grund der Nachricht).
     *
     * @return array{ok:bool,grund:string}
     */
    public static function darfAufrufen(string $absenderAdresse): array
    {
        $jetzt = Umgebung::jetzt();
        // Not-Aus zuerst: Die Datei wirkt auch dann, wenn die Einstellung „aktiv“ sagt.
        if (self::stopDatei() || Speicher::einstellung('ki_aktiv') !== '1') {
            return ['ok' => false, 'grund' => 'pausiert'];
        }
        if ((int) Speicher::einstellung('sperre_bis') > $jetzt) {
            return ['ok' => false, 'grund' => 'sperre'];
        }
        if (Zugang::claude() === null) {
            return ['ok' => false, 'grund' => 'kein_schluessel'];
        }
        $limits = self::limits();
        $tagesbeginn = self::tagesbeginn($jetzt);
        if (self::summe(self::monatsbeginn($jetzt))['mikro'] >= self::mikro($limits['limit_monat_usd'])) {
            return ['ok' => false, 'grund' => 'limit_monat'];
        }
        $heute = self::summe($tagesbeginn);
        if ($heute['mikro'] >= self::mikro($limits['limit_tag_usd'])) {
            return ['ok' => false, 'grund' => 'limit_tag'];
        }
        if ($heute['aufrufe'] >= $limits['limit_aufrufe_tag']) {
            return ['ok' => false, 'grund' => 'limit_aufrufe'];
        }
        // Schutz vor einem einzelnen Absender, der mit vielen Mails Kosten auslöst. Mails ganz ohne
        // Adresse zählen gemeinsam als ein Absender (eine Flut kaputter Automaten-Mails).
        $adresse = strtolower(trim($absenderAdresse));
        if (self::aufrufeDesAbsenders($adresse, $tagesbeginn) >= $limits['limit_je_absender_tag']) {
            return ['ok' => false, 'grund' => 'limit_absender'];
        }
        return ['ok' => true, 'grund' => ''];
    }

    /**
     * Bucht einen Aufruf – auch einen gescheiterten (dann Kosten 0 und fehler gesetzt) und
     * einen geschätzten (geschaetzt = 1). Felder wie die Tabelle verbrauch; fehlende werden
     * 0 bzw. leer. Fehlt kosten_mikro_usd, wird aus Modell und Token-Zahlen gerechnet.
     *
     * Damit sich das Ergebnis von Claude::rufe ohne Umbauen buchen lässt, werden auch dessen
     * Namen verstanden: Token-Zahlen gesammelt unter 'usage', 'http' für http_status, 'stop'
     * für stop_reason und – wenn kein Fehlertext da ist – 'fehler_art' als fehler.
     *
     * Rückgabe: Nummer der Zeile (für ersetze()).
     *
     * @param array<string,mixed> $zeile
     */
    public static function buche(array $zeile): int
    {
        $werte = self::zeilenWerte($zeile);
        Speicher::db()->prepare(
            'INSERT INTO verbrauch (zeit, kanal, zweck, modell, nachricht_id, request_id, input_tokens,
                 cache_schreiben_5m, cache_schreiben_1h, cache_lesen, output_tokens, denk_tokens,
                 kosten_mikro_usd, geschaetzt, stop_reason, http_status, dauer_ms, fehler)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute($werte);
        return (int) Speicher::db()->lastInsertId();
    }

    /**
     * Ersetzt eine Buchung (die Vorab-Schätzung vor dem Aufruf) durch die echten Zahlen – keine
     * zweite Zeile. Gibt es die Zeile nicht mehr, wird neu gebucht.
     *
     * @param array<string,mixed> $zeile
     */
    public static function ersetze(int $id, array $zeile): void
    {
        $werte = self::zeilenWerte($zeile);
        $werte[] = $id;
        $st = Speicher::db()->prepare(
            'UPDATE verbrauch SET zeit = ?, kanal = ?, zweck = ?, modell = ?, nachricht_id = ?, request_id = ?, input_tokens = ?,
                 cache_schreiben_5m = ?, cache_schreiben_1h = ?, cache_lesen = ?, output_tokens = ?, denk_tokens = ?,
                 kosten_mikro_usd = ?, geschaetzt = ?, stop_reason = ?, http_status = ?, dauer_ms = ?, fehler = ?
             WHERE id = ?'
        );
        $st->execute($werte);
        if ($st->rowCount() < 1) {
            self::buche($zeile);
        }
    }

    /**
     * Die Werte einer Buchung in der Spaltenfolge von INSERT und UPDATE.
     *
     * @param array<string,mixed> $zeile
     * @return list<mixed>
     */
    private static function zeilenWerte(array $zeile): array
    {
        if (isset($zeile['usage']) && is_array($zeile['usage'])) {
            $zeile += $zeile['usage'];
        }
        $zeile += [
            'http_status' => $zeile['http'] ?? 0,
            'stop_reason' => $zeile['stop'] ?? '',
        ];
        if (self::kurz($zeile['fehler'] ?? '', 10) === '') {
            $zeile['fehler'] = $zeile['fehler_art'] ?? '';
        }
        $modell = self::kurz($zeile['modell'] ?? '', 80);
        $kosten = (array_key_exists('kosten_mikro_usd', $zeile) && is_numeric($zeile['kosten_mikro_usd']))
            ? max(0, (int) $zeile['kosten_mikro_usd'])
            : self::kostenMikroUsd($modell, $zeile);
        $zeit = self::ganzzahl($zeile, 'zeit');
        $nachrichtId = self::ganzzahl($zeile, 'nachricht_id');

        return [
            $zeit > 0 ? $zeit : Umgebung::jetzt(),
            self::kurz($zeile['kanal'] ?? '', 20) ?: 'email',
            self::kurz($zeile['zweck'] ?? '', 20) ?: 'entwurf',
            $modell,
            $nachrichtId > 0 ? $nachrichtId : null,
            self::kurz($zeile['request_id'] ?? '', 120),
            self::ganzzahl($zeile, 'input_tokens'),
            self::ganzzahl($zeile, 'cache_schreiben_5m'),
            self::ganzzahl($zeile, 'cache_schreiben_1h'),
            self::ganzzahl($zeile, 'cache_lesen'),
            self::ganzzahl($zeile, 'output_tokens'),
            self::ganzzahl($zeile, 'denk_tokens'),
            $kosten,
            empty($zeile['geschaetzt']) ? 0 : 1,
            self::kurz($zeile['stop_reason'] ?? '', 40),
            self::ganzzahl($zeile, 'http_status'),
            self::ganzzahl($zeile, 'dauer_ms'),
            // Letzte Sicherung: Sollte ein Fehlertext doch einen Schlüssel enthalten, wird er nicht gespeichert.
            self::kurz(preg_replace('/sk-ant-[A-Za-z0-9_-]+/', '[Schlüssel]', self::kurz($zeile['fehler'] ?? '', 2000)) ?? '', 300),
        ];
    }

    /**
     * Sperrt KI-Aufrufe bis $bis (Unix-Sekunden) – nach harten Fehlern wie „Ausgabenlimit bei
     * Anthropic erreicht“ oder „Schlüssel abgelehnt“. Eine laufende, längere Sperre wird nicht
     * verkürzt. $bis in der Vergangenheit (z. B. 0) hebt die Sperre auf.
     */
    public static function sperre(string $grund, int $bis): void
    {
        $jetzt = Umgebung::jetzt();
        $grund = self::kurz($grund, 200);
        if ($bis <= $jetzt) {
            Speicher::setze('sperre_bis', '0', 'system');
            Speicher::setze('sperre_grund', '', 'system');
            Speicher::ereignis('sperre_aufgehoben', null, 'system', ['grund' => $grund]);
            return;
        }
        $bisher = (int) Speicher::einstellung('sperre_bis');
        if ($bisher > $jetzt && $bisher >= $bis) {
            Speicher::ereignis('sperre', null, 'system', ['grund' => $grund, 'bis' => $bisher, 'hinweis' => 'längere Sperre bleibt']);
            return;
        }
        Speicher::setze('sperre_bis', (string) $bis, 'system');
        Speicher::setze('sperre_grund', $grund, 'system');
        Speicher::ereignis('sperre', null, 'system', ['grund' => $grund, 'bis' => $bis]);
    }

    /**
     * Kurzer Stand für den Kopf des Admin-Bereichs.
     *
     * @return array{heute_usd:float,monat_usd:float,aufrufe_heute:int,limits:array<string,float|int>,ki_aktiv:bool,sperre:array{aktiv:bool,bis:int,grund:string},stop_datei:bool}
     */
    public static function stand(): array
    {
        $jetzt = Umgebung::jetzt();
        $heute = self::summe(self::tagesbeginn($jetzt));
        $monat = self::summe(self::monatsbeginn($jetzt));
        $sperreBis = (int) Speicher::einstellung('sperre_bis');
        $gesperrt = $sperreBis > $jetzt;
        return [
            'heute_usd'     => self::usd($heute['mikro']),
            'monat_usd'     => self::usd($monat['mikro']),
            'aufrufe_heute' => $heute['aufrufe'],
            'limits'        => self::limits(),
            'ki_aktiv'      => Speicher::einstellung('ki_aktiv') === '1',
            'sperre'        => [
                'aktiv' => $gesperrt,
                'bis'   => $gesperrt ? $sperreBis : 0,
                'grund' => $gesperrt ? Speicher::einstellung('sperre_grund') : '',
            ],
            // Die Not-Aus-Datei pausiert unabhängig vom Schalter; die Oberfläche soll das erklären können.
            'stop_datei'    => self::stopDatei(),
        ];
    }

    /**
     * Zahlen für den Reiter „Verbrauch“. Die Reihen je_tag (30 Tage) und je_monat (12 Monate)
     * sind lückenlos und aufsteigend, damit die Oberfläche sie ohne Nacharbeit als Balken
     * zeichnen kann. je_kanal, je_modell und je_zweck beziehen sich auf den laufenden Monat.
     *
     * @return array<string,mixed>
     */
    public static function uebersicht(): array
    {
        $db = Speicher::db();
        $jetzt = Umgebung::jetzt();
        $zone = new \DateTimeZone(self::ZONE);
        $heuteFrueh = (new \DateTimeImmutable('@' . $jetzt))->setTimezone($zone)->setTime(0, 0);
        $monatsErster = $heuteFrueh->modify('first day of this month');
        $monatsbeginn = $monatsErster->getTimestamp();

        $heute = self::summe($heuteFrueh->getTimestamp());
        $monat = self::summe($monatsbeginn);

        $jeTag = [];
        for ($i = 29; $i >= 0; $i--) {
            // Mit Kalendertagen rechnen, nicht mit 86.400 Sekunden: Tage mit Zeitumstellung sind 23 oder 25 Stunden lang.
            $beginn = $heuteFrueh->modify('-' . $i . ' days');
            $summe = self::summe($beginn->getTimestamp(), $beginn->modify('+1 day')->getTimestamp());
            $jeTag[] = ['tag' => $beginn->format('Y-m-d'), 'usd' => self::usd($summe['mikro']), 'aufrufe' => $summe['aufrufe']];
        }
        $jeMonat = [];
        for ($i = 11; $i >= 0; $i--) {
            $beginn = $monatsErster->modify('-' . $i . ' months');
            $summe = self::summe($beginn->getTimestamp(), $beginn->modify('+1 month')->getTimestamp());
            $jeMonat[] = ['monat' => $beginn->format('Y-m'), 'usd' => self::usd($summe['mikro']), 'aufrufe' => $summe['aufrufe']];
        }

        // Bearbeitete Anfragen: Entwürfe aus den Läufen (die Tabelle lauf bleibt gut zwei Jahre),
        // mindestens die noch gespeicherten Entwürfe. Nur aus entwurf gezählt, schrumpfte der
        // Nenner mit einer kurzen Aufbewahrungsfrist, und die Kosten je Anfrage wären zu hoch.
        $stmt = $db->prepare('SELECT COUNT(DISTINCT nachricht_id) FROM entwurf WHERE COALESCE(erstellt_am, 0) >= ?');
        $stmt->execute([$monatsbeginn]);
        $gespeichert = (int) $stmt->fetchColumn();
        $stmt = $db->prepare('SELECT COALESCE(SUM(entwuerfe), 0) FROM lauf WHERE COALESCE(start, 0) >= ?');
        $stmt->execute([$monatsbeginn]);
        $bearbeitet = max($gespeichert, (int) $stmt->fetchColumn());

        // Von der Regelstufe erledigt (Formular-Mails, Newsletter, Autoresponder …) – dafür fiel kein Aufruf an.
        $stmt = $db->prepare(
            "SELECT COUNT(*) FROM nachricht
             WHERE COALESCE(regel_kategorie, '') <> ''
               AND (CASE WHEN COALESCE(erstellt_am, 0) > 0 THEN erstellt_am ELSE COALESCE(eingang_am, 0) END) >= ?"
        );
        $stmt->execute([$monatsbeginn]);
        $ohneKi = (int) $stmt->fetchColumn();

        return [
            'heute'                 => ['usd' => self::usd($heute['mikro']), 'aufrufe' => $heute['aufrufe']],
            'monat'                 => ['usd' => self::usd($monat['mikro']), 'aufrufe' => $monat['aufrufe']],
            'limits'                => self::limits(),
            'je_tag'                => $jeTag,
            'je_monat'              => $jeMonat,
            'je_kanal'              => self::gruppiert('kanal', $monatsbeginn),
            'je_modell'             => self::gruppiert('modell', $monatsbeginn),
            'je_zweck'              => self::gruppiert('zweck', $monatsbeginn),
            'bearbeitet_monat'      => $bearbeitet,
            'kosten_je_anfrage_usd' => $bearbeitet > 0 ? self::usd(intdiv($monat['mikro'], $bearbeitet)) : 0.0,
            'kosten_je_aufruf_usd'  => $monat['aufrufe'] > 0 ? self::usd(intdiv($monat['mikro'], $monat['aufrufe'])) : 0.0,
            'ohne_ki_monat'         => $ohneKi,
            'preise_stand'          => self::PREISE['stand'],
        ];
    }

    /** Beginn des Tages (0 Uhr Berliner Zeit), in dem $zeit liegt – ohne Angabe: heute. */
    public static function tagesbeginn(?int $zeit = null): int
    {
        return (new \DateTimeImmutable('@' . ($zeit ?? Umgebung::jetzt())))
            ->setTimezone(new \DateTimeZone(self::ZONE))
            ->setTime(0, 0)
            ->getTimestamp();
    }

    /** Beginn des Monats (Erster, 0 Uhr Berliner Zeit), in dem $zeit liegt – ohne Angabe: dieser Monat. */
    public static function monatsbeginn(?int $zeit = null): int
    {
        return (new \DateTimeImmutable('@' . ($zeit ?? Umgebung::jetzt())))
            ->setTimezone(new \DateTimeZone(self::ZONE))
            ->modify('first day of this month')
            ->setTime(0, 0)
            ->getTimestamp();
    }

    /** Not-Aus unabhängig von der Datenbank: Liegt die Datei STOP im Datenordner, ruft niemand die KI auf. */
    private static function stopDatei(): bool
    {
        return file_exists(Umgebung::datenOrdner() . '/STOP');
    }

    /**
     * Die vier Limits als Zahlen; die Schlüssel heißen wie die Einstellungen.
     *
     * @return array{limit_monat_usd:float,limit_tag_usd:float,limit_aufrufe_tag:int,limit_je_absender_tag:int}
     */
    private static function limits(): array
    {
        return [
            'limit_monat_usd'       => self::zahl('limit_monat_usd'),
            'limit_tag_usd'         => self::zahl('limit_tag_usd'),
            'limit_aufrufe_tag'     => (int) self::zahl('limit_aufrufe_tag'),
            'limit_je_absender_tag' => (int) self::zahl('limit_je_absender_tag'),
        ];
    }

    /**
     * Einstellung als Zahl ≥ 0. Steht dort etwas Unlesbares, gilt der Standard – die
     * Standard-Limits sind niedrig, ein Tippfehler öffnet also nichts.
     */
    private static function zahl(string $schluessel): float
    {
        $wert = str_replace(',', '.', trim(Speicher::einstellung($schluessel)));
        if (!is_numeric($wert)) {
            $wert = Speicher::STANDARD[$schluessel] ?? '0';
        }
        return max(0.0, (float) $wert);
    }

    /**
     * Summe der Kosten und Zahl der Aufrufe in einem Zeitraum (alle Zwecke, auch Fehlversuche
     * und geschätzte Buchungen – jede Zeile ist ein Aufruf).
     *
     * @return array{mikro:int,aufrufe:int}
     */
    private static function summe(int $von, int $bis = PHP_INT_MAX): array
    {
        $stmt = Speicher::db()->prepare(
            'SELECT COALESCE(SUM(kosten_mikro_usd), 0) AS mikro, COUNT(*) AS aufrufe FROM verbrauch WHERE zeit >= ? AND zeit < ?'
        );
        $stmt->execute([$von, $bis]);
        $zeile = $stmt->fetch() ?: [];
        return ['mikro' => (int) ($zeile['mikro'] ?? 0), 'aufrufe' => (int) ($zeile['aufrufe'] ?? 0)];
    }

    /** Aufrufe seit $von für Nachrichten dieses Absenders (Adresse klein; ohne From zählt die Antwortadresse). */
    private static function aufrufeDesAbsenders(string $adresse, int $von): int
    {
        $stmt = Speicher::db()->prepare(
            "SELECT COUNT(*) FROM verbrauch v JOIN nachricht n ON n.id = v.nachricht_id
             WHERE v.zeit >= ? AND (CASE WHEN COALESCE(n.von_adresse, '') != '' THEN lower(n.von_adresse)
                                         ELSE lower(COALESCE(n.antwort_an, '')) END) = ?"
        );
        $stmt->execute([$von, $adresse]);
        return (int) $stmt->fetchColumn();
    }

    /**
     * Kosten und Aufrufe seit $von, aufgeteilt nach einer Spalte der Tabelle verbrauch.
     *
     * @return list<array<string,string|float|int>>
     */
    private static function gruppiert(string $spalte, int $von): array
    {
        // Spaltennamen lassen sich nicht binden: nur diese drei festen Abfragen.
        $sql = match ($spalte) {
            'kanal'  => 'SELECT kanal AS name, COALESCE(SUM(kosten_mikro_usd), 0) AS mikro, COUNT(*) AS aufrufe FROM verbrauch WHERE zeit >= ? GROUP BY kanal',
            'modell' => 'SELECT modell AS name, COALESCE(SUM(kosten_mikro_usd), 0) AS mikro, COUNT(*) AS aufrufe FROM verbrauch WHERE zeit >= ? GROUP BY modell',
            'zweck'  => 'SELECT zweck AS name, COALESCE(SUM(kosten_mikro_usd), 0) AS mikro, COUNT(*) AS aufrufe FROM verbrauch WHERE zeit >= ? GROUP BY zweck',
        };
        $stmt = Speicher::db()->prepare($sql . ' ORDER BY mikro DESC, name');
        $stmt->execute([$von]);
        $liste = [];
        foreach ($stmt as $zeile) {
            $liste[] = [$spalte => (string) $zeile['name'], 'usd' => self::usd((int) $zeile['mikro']), 'aufrufe' => (int) $zeile['aufrufe']];
        }
        return $liste;
    }

    /**
     * Modellname, unter dem die Preise stehen. Die API nennt in der Antwort mitunter eine
     * datierte Fassung („claude-haiku-5-5-20261101“); sie zählt zum gleichnamigen Modell.
     */
    private static function bekanntesModell(string $modell): string
    {
        $modell = strtolower(trim($modell));
        $treffer = '';
        foreach (self::PREISE as $name => $preise) {
            if (!is_array($preise)) {
                continue;
            }
            if ($modell === $name) {
                return $name;
            }
            if ((str_starts_with($modell, $name . '-') || str_starts_with($modell, $name . '@')) && strlen($name) > strlen($treffer)) {
                $treffer = $name;
            }
        }
        return $treffer !== '' ? $treffer : self::MODELL_UNBEKANNT;
    }

    /**
     * Ganze Zahl ≥ 0 aus einem Feld; alles andere zählt als 0.
     *
     * @param array<string,mixed> $werte
     */
    private static function ganzzahl(array $werte, string $feld): int
    {
        $wert = $werte[$feld] ?? 0;
        return is_numeric($wert) ? max(0, (int) $wert) : 0;
    }

    /** Einzeiliger Text ohne Steuerzeichen, auf $max Zeichen begrenzt. */
    private static function kurz(mixed $wert, int $max): string
    {
        if (!is_scalar($wert)) {
            return '';
        }
        $text = preg_replace('/[\x00-\x1F\x7F]+/', ' ', (string) $wert) ?? '';
        return mb_substr(trim($text), 0, $max);
    }

    private static function mikro(float $usd): int
    {
        return (int) round($usd * 1000000);
    }

    private static function usd(int $mikro): float
    {
        return round($mikro / 1000000, 6);
    }
}
