<?php
/**
 * Schmale Schnittstelle zu Claude über das offizielle PHP-SDK von Anthropic.
 *
 * Alles, was der Assistent an die KI schickt, geht durch rufe(): ein Systemtext, eine
 * Nutzernachricht, ein Ausgabeschema – eine Antwort. Das Modell bekommt keine Werkzeuge und kann
 * nichts auslösen; es liefert nur ein JSON-Objekt, das der Aufrufer prüft.
 *
 * FESTE ANFRAGEFORM (Stand der API 22.11.2026): maxTokens 3000, strukturierte Ausgabe über
 * outputConfig.format, effort „medium“. Bewusst NICHT gesendet werden temperature, topP, topK,
 * tools, thinking und eine vorbefüllte Assistant-Nachricht – die aktuellen Modelle lehnen das mit
 * HTTP 400 ab bzw. denken von selbst (adaptiv).
 *
 * ZEIT: Der ganze Aufruf samt einer möglichen Wiederholung hat 20 Sekunden. Das SDK setzt selbst
 * kein Zeitlimit durch (das ist Sache des HTTP-Clients), deshalb steckt hier eine eigene kleine
 * Leitung um Guzzle: Sie gibt jedem Versuch nur die Restzeit, merkt sich Status und Request-ID
 * und verhindert, dass das SDK nach einem „Retry-After“ länger schläft, als der Lauf Zeit hat.
 *
 * KOSTEN: rufe() bucht nichts. Es gibt Token-Zahlen, HTTP-Status und die Zahl der Versuche ohne
 * Antwort zurück; gebucht wird im Kern (so sehen Tests mit dem Ersatz dieselbe Buchung).
 *
 * FEHLERTEXTE enthalten nie Mailinhalt und nie den Schlüssel: nur Art, HTTP-Status und die
 * Fehlerkennung der API.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Claude
{
    public const MODELL_STANDARD = 'claude-haiku-5-5';
    public const MODELL_STARK = 'claude-sonnet-5-5';

    /** Obergrenze der Ausgabe je Aufruf; auch Grundlage der Kostenschätzung bei ausbleibender Antwort. */
    public const MAX_TOKENS = 3000;

    /** Sekunden für einen Aufruf einschließlich Wiederholung (Bauplan 7.2). */
    public const ZEITLIMIT_SEK = 20;

    /** Sekunden für den kostenlosen Selbsttest. */
    private const ZEITLIMIT_SELBSTTEST_SEK = 8;

    /** Erlaubte Stufen für outputConfig.effort. Im Betrieb gilt immer „medium“ (Bauplan 4.12). */
    private const AUFWAND_STUFEN = ['low', 'medium', 'high'];
    private const API_ADRESSE = 'https://api.anthropic.com';

    /** Beta-Kennung für die Ausweichmodelle des Servers bei einer Verweigerung (nur starkes Modell). */
    private const BETA_AUSWEICHMODELLE = 'server-side-fallback-2026-07-01';

    /** So beginnt die Meldung, wenn das selbst gesetzte Ausgabenlimit des Workspace erreicht ist. */
    private const MELDUNG_EIGENES_LIMIT = 'you have reached your specified';

    /**
     * Für Tests ohne Netz: Ist die Eigenschaft gesetzt, ruft rufe() statt der API diese Funktion
     * mit denselben Parametern auf und gibt ihr Ergebnis zurück (fehlende Felder werden ergänzt).
     */
    public static ?\Closure $ersatz = null;

    /**
     * Denk-Aufwand (outputConfig.effort). Nur der Modell-Test stellt ihn um (--effort), um Stufen
     * zu vergleichen; der Betrieb lässt ihn auf „medium“. Ein unbekannter Wert gilt als „medium“.
     */
    public static string $aufwand = 'medium';

    /**
     * Ein Aufruf mit strukturierter Ausgabe.
     *
     * @param array<string, mixed> $schema JSON-Schema (siehe Prompt::schema())
     * @return array{ok: bool, daten: ?array<string, mixed>, usage: array<string, int>, stop: string,
     *               request_id: string, http: int, dauer_ms: int, fehler: string, fehler_art: string,
     *               verlorene_versuche: int, abgeschickt: ?int}
     *         verlorene_versuche: Versuche, die abgeschickt wurden, aber ohne Antwort blieben –
     *         Anthropic rechnet sie unter Umständen ab, der Kern bucht sie geschätzt.
     *         abgeschickt: Versuche, bei denen die Verbindung stand (also etwas bei Anthropic
     *         ankommen konnte); null, wenn unbekannt (Ersatz in Tests).
     */
    public static function rufe(string $modell, string $system, string $nutzer, array $schema, bool $cache): array
    {
        if (self::$ersatz !== null) {
            $ergebnis = (self::$ersatz)($modell, $system, $nutzer, $schema, $cache);
            return self::ergebnis(is_array($ergebnis)
                ? $ergebnis
                : ['fehler' => 'Der Ersatz hat kein Ergebnis geliefert.', 'fehler_art' => 'anfrage']);
        }

        $zugang = Zugang::claude();
        $schluessel = is_array($zugang) ? trim((string) ($zugang['key'] ?? '')) : '';
        if ($schluessel === '') {
            return self::ergebnis(['fehler' => 'Kein API-Schlüssel hinterlegt.', 'fehler_art' => 'schluessel']);
        }
        if (!self::bibliothekenDa()) {
            return self::ergebnis(['fehler' => 'Bibliotheken fehlen.', 'fehler_art' => 'anfrage']);
        }

        $start = hrtime(true);
        $leitung = self::leitung((float) self::ZEITLIMIT_SEK);
        try {
            $client = self::client($schluessel, $leitung, 1, (float) self::ZEITLIMIT_SEK);
            $antwort = self::sende($client, $modell, $system, $nutzer, $schema, $cache);
            return self::werteAus($antwort, $schema, $leitung, $start);
        } catch (\Throwable $e) {
            return self::fehler($e, $leitung, $start);
        }
    }

    /**
     * Kostenloser Selbsttest: Schlüssel gültig, API erreichbar, beide Modelle vorhanden.
     * Fragt nur die Modell-Auskunft ab (keine Tokens) und misst die Antwortzeit.
     *
     * @return array{ok: bool, meldung: string}
     */
    public static function modelleErreichbar(): array
    {
        if (self::$ersatz !== null) {
            return ['ok' => true, 'meldung' => 'Ersatz aktiv (Test) – kein Netzaufruf.'];
        }
        $zugang = Zugang::claude();
        $schluessel = is_array($zugang) ? trim((string) ($zugang['key'] ?? '')) : '';
        if ($schluessel === '') {
            return ['ok' => false, 'meldung' => 'Kein API-Schlüssel hinterlegt.'];
        }
        if (!self::bibliothekenDa()) {
            return ['ok' => false, 'meldung' => 'Bibliotheken fehlen.'];
        }

        $start = hrtime(true);
        $leitung = self::leitung((float) self::ZEITLIMIT_SELBSTTEST_SEK);
        $modell = self::MODELL_STANDARD;
        try {
            $client = self::client($schluessel, $leitung, 0, (float) self::ZEITLIMIT_SELBSTTEST_SEK);
            foreach ([self::MODELL_STANDARD, self::MODELL_STARK] as $modell) {
                $client->models->retrieve($modell);
            }
        } catch (\Throwable $e) {
            $fehler = self::fehler($e, $leitung, $start);
            $text = match (true) {
                $fehler['fehler_art'] === 'schluessel' => 'Der Schlüssel wird abgelehnt',
                $fehler['http'] === 404 => 'Modell ' . $modell . ' ist mit diesem Schlüssel nicht verfügbar',
                $fehler['http'] === 0 => 'Anthropic ist nicht erreichbar',
                default => 'Abfrage fehlgeschlagen',
            };
            return ['ok' => false, 'meldung' => $text . ' (' . $fehler['fehler'] . ').'];
        }
        $ms = (int) round((hrtime(true) - $start) / 1_000_000);
        return [
            'ok' => true,
            'meldung' => 'Schlüssel gültig, ' . self::MODELL_STANDARD . ' und ' . self::MODELL_STARK . ' verfügbar (' . $ms . ' ms).',
        ];
    }

    /**
     * Leere Token-Zählung mit den Schlüsseln, die Budget::kostenMikroUsd erwartet.
     *
     * @return array{input_tokens: int, output_tokens: int, cache_schreiben_5m: int,
     *               cache_schreiben_1h: int, cache_lesen: int, denk_tokens: int}
     */
    public static function leereUsage(): array
    {
        return [
            'input_tokens' => 0,
            'output_tokens' => 0,
            'cache_schreiben_5m' => 0,
            'cache_schreiben_1h' => 0,
            'cache_lesen' => 0,
            'denk_tokens' => 0,
        ];
    }

    private static function bibliothekenDa(): bool
    {
        return Umgebung::$bibliotheken
            && class_exists(\Anthropic\Client::class)
            && class_exists(\GuzzleHttp\Client::class);
    }

    /**
     * Adresse der API. Fest verdrahtet, damit der Schlüssel nie an einen anderen Rechner geht –
     * auch nicht, wenn auf dem Server zufällig ANTHROPIC_BASE_URL gesetzt wäre. Einzige Ausnahme
     * für Proben der Fehlerwege: in der lokalen Umgebung eine Attrappe auf dem eigenen Rechner.
     */
    private static function basisAdresse(): string
    {
        $probe = getenv('KZP_ASSISTENT_CLAUDE_URL');
        if (Umgebung::lokal() && is_string($probe) && preg_match('#^http://127\.0\.0\.1:\d{2,5}$#', $probe) === 1) {
            return $probe;
        }
        return self::API_ADRESSE;
    }

    private static function client(
        #[\SensitiveParameter] string $schluessel,
        \Psr\Http\Client\ClientInterface $leitung,
        int $wiederholungen,
        float $zeitlimit,
    ): \Anthropic\Client {
        return new \Anthropic\Client(
            apiKey: $schluessel,
            baseUrl: self::basisAdresse(),
            requestOptions: [
                // „timeout“ ist im SDK nur ein Richtwert; durchgesetzt wird die Zeit in der Leitung.
                'timeout' => $zeitlimit,
                'maxRetries' => $wiederholungen,
                'transporter' => $leitung,
            ],
            openTelemetry: false,
        );
    }

    /**
     * Schickt die Anfrage ab. Für das starke Modell über den Beta-Endpunkt mit den
     * Ausweichmodellen des Servers, sofern das installierte SDK ihn anbietet.
     *
     * @param array<string, mixed> $schema
     */
    private static function sende(
        \Anthropic\Client $client,
        string $modell,
        string $system,
        string $nutzer,
        array $schema,
        bool $cache,
    ): object {
        $systemBlock = ['type' => 'text', 'text' => $system];
        if ($cache) {
            // Haiku: eine Stunde. Der Zeitauftrag ruft höchstens einmal je Lauf (alle fünf Minuten
            // oder später) – ein 5-Minuten-Eintrag wäre beim nächsten Aufruf meist schon weg.
            // Sonnet bleibt bei fünf Minuten: Das 1-Stunden-Schreiben kostet dort das Doppelte der
            // Eingabe, und Eskalationen sind zu selten, als dass es sich lohnte.
            $systemBlock['cacheControl'] = $modell === self::MODELL_STANDARD
                ? ['type' => 'ephemeral', 'ttl' => '1h']
                : ['type' => 'ephemeral'];
        }
        $parameter = [
            'maxTokens' => self::MAX_TOKENS,
            'messages' => [['role' => 'user', 'content' => $nutzer]],
            'model' => $modell,
            'system' => [$systemBlock],
            'outputConfig' => [
                'effort' => in_array(self::$aufwand, self::AUFWAND_STUFEN, true) ? self::$aufwand : 'medium',
                'format' => ['type' => 'json_schema', 'schema' => $schema],
            ],
        ];

        if ($modell === self::MODELL_STARK && self::kenntAusweichmodelle($client)) {
            try {
                return $client->beta->messages->create(...($parameter + [
                    'fallbacks' => 'default',
                    'betas' => [self::BETA_AUSWEICHMODELLE],
                ]));
            } catch (\Anthropic\Core\Exceptions\BadRequestException $e) {
                // Nimmt die API den Beta-Zusatz nicht (mehr) an, bleibt der normale Aufruf.
                // Ein erreichtes Ausgabenlimit ist dagegen kein Formfehler und wird nicht umgangen.
                if (self::istAusgabenlimit($e)) {
                    throw $e;
                }
            }
        }
        return $client->messages->create(...$parameter);
    }

    private static function kenntAusweichmodelle(\Anthropic\Client $client): bool
    {
        try {
            if (!isset($client->beta) || !isset($client->beta->messages)) {
                return false;
            }
            $methode = new \ReflectionMethod($client->beta->messages, 'create');
            $namen = array_map(static fn (\ReflectionParameter $p): string => $p->getName(), $methode->getParameters());
            return in_array('fallbacks', $namen, true) && in_array('betas', $namen, true);
        } catch (\Throwable) {
            return false;
        }
    }

    /**
     * Macht aus der Antwort des SDK das Ergebnis von rufe().
     *
     * @param array<string, mixed> $schema
     * @return array<string, mixed>
     */
    private static function werteAus(object $antwort, array $schema, object $leitung, int|float $start): array
    {
        // Ausgewertet wird die Rohform der Antwort (so, wie die API sie schickt). Sie ist bei
        // beiden Endpunkten gleich und hängt nicht an den Eigenschaftsnamen einer SDK-Version.
        $roh = json_decode((string) json_encode($antwort), true);
        $roh = is_array($roh) ? $roh : [];

        $stop = self::alsText($roh['stop_reason'] ?? null);
        if ($stop === '') {
            $stop = self::alsText($antwort->stopReason ?? null);
        }
        $basis = [
            'usage' => self::usage($roh['usage'] ?? ($antwort->usage ?? null)),
            'stop' => $stop,
            'request_id' => (string) $leitung->requestId,
            'http' => $leitung->status > 0 ? (int) $leitung->status : 200,
            'dauer_ms' => self::dauerMs($start),
            'verlorene_versuche' => (int) $leitung->ohneAntwort,
            'abgeschickt' => (int) ($leitung->abgeschickt ?? 0),
        ];

        // Bei einer Verweigerung oder am Token-Limit kann das JSON unvollständig sein – nicht auswerten.
        if ($stop === 'refusal') {
            return self::ergebnis($basis + ['fehler' => 'Das Modell hat die Bearbeitung abgelehnt.', 'fehler_art' => 'abgelehnt']);
        }
        if ($stop === 'max_tokens') {
            return self::ergebnis($basis + ['fehler' => 'Die Antwort wurde am Token-Limit abgeschnitten.', 'fehler_art' => 'abgeschnitten']);
        }

        // Vor dem Textblock können Denk-Blöcke stehen; nur Textblöcke zählen.
        $text = '';
        foreach (is_array($roh['content'] ?? null) ? $roh['content'] : [] as $block) {
            if (is_array($block) && ($block['type'] ?? '') === 'text' && is_string($block['text'] ?? null)) {
                $text .= $block['text'];
            }
        }

        $daten = json_decode(trim($text), true);
        if (!is_array($daten)) {
            return self::ergebnis($basis + ['fehler' => 'Die Antwort ist kein JSON-Objekt.', 'fehler_art' => 'kein_json']);
        }
        $daten = self::nachSchema($daten, $schema);
        if ($daten === null) {
            return self::ergebnis($basis + ['fehler' => 'Die Antwort passt nicht zum Schema.', 'fehler_art' => 'kein_json']);
        }
        return self::ergebnis($basis + ['ok' => true, 'daten' => $daten]);
    }

    /**
     * Prüft die Antwort gegen das (flache) Schema und bringt Enum-Werte in die Schreibweise des
     * Schemas – das Modell darf „Neutral“ schreiben, gespeichert wird „neutral“. null, wenn ein
     * Pflichtfeld fehlt oder einen falschen Typ hat.
     *
     * @param array<mixed> $daten
     * @param array<string, mixed> $schema
     * @return array<string, mixed>|null
     */
    private static function nachSchema(array $daten, array $schema): ?array
    {
        $eigenschaften = is_array($schema['properties'] ?? null) ? $schema['properties'] : [];
        $sauber = [];
        foreach ($eigenschaften as $name => $regel) {
            if (!array_key_exists($name, $daten) || !is_array($regel)) {
                return null;
            }
            $wert = $daten[$name];
            $typ = (string) ($regel['type'] ?? 'string');
            if ($typ === 'boolean') {
                if (!is_bool($wert)) {
                    return null;
                }
            } elseif ($typ === 'string') {
                if (!is_string($wert)) {
                    return null;
                }
                if (is_array($regel['enum'] ?? null)) {
                    $treffer = null;
                    foreach ($regel['enum'] as $erlaubt) {
                        if (is_string($erlaubt) && mb_strtolower(trim($wert)) === mb_strtolower($erlaubt)) {
                            $treffer = $erlaubt;
                            break;
                        }
                    }
                    if ($treffer === null) {
                        return null;
                    }
                    $wert = $treffer;
                }
            } elseif ($typ === 'integer') {
                if (!is_int($wert)) {
                    return null;
                }
            } elseif ($typ === 'number') {
                if (!is_int($wert) && !is_float($wert)) {
                    return null;
                }
            }
            $sauber[(string) $name] = $wert;
        }
        return $sauber;
    }

    /**
     * Token-Zahlen der Antwort in den Schlüsseln der Verbrauchstabelle. Gelesen wird die
     * Rohform (json_encode der SDK-Zählung), weil dort die Aufteilung des Cache-Schreibens
     * nach Haltbarkeit und die Denk-Tokens stehen.
     *
     * @return array<string, int>
     */
    private static function usage(mixed $zaehlung, bool $mitVersuchen = true): array
    {
        $usage = self::leereUsage();
        $roh = is_array($zaehlung) ? $zaehlung : json_decode((string) json_encode($zaehlung), true);
        if (!is_array($roh)) {
            return $usage;
        }
        // Mit Ausweichmodell (Sonnet, fallbacks) gibt es je Versuch eine Zählung. Die oberste Zählung
        // beschreibt nur den Versuch, der die Antwort lieferte; ein mitten in der Ausgabe abgelehnter
        // Versuch wird trotzdem berechnet. Deshalb die Versuche summieren – statt, nicht zusätzlich.
        $versuche = $roh['iterations'] ?? null;
        if ($mitVersuchen && is_array($versuche) && $versuche !== [] && array_is_list($versuche)) {
            foreach ($versuche as $versuch) {
                foreach (self::usage($versuch, false) as $name => $wert) {
                    $usage[$name] += $wert;
                }
            }
            return $usage;
        }
        $zahl = static fn (mixed $w): int => is_int($w) || is_float($w) ? max(0, (int) $w) : 0;

        $usage['input_tokens'] = $zahl($roh['input_tokens'] ?? $roh['inputTokens'] ?? 0);
        $usage['output_tokens'] = $zahl($roh['output_tokens'] ?? $roh['outputTokens'] ?? 0);
        $usage['cache_lesen'] = $zahl($roh['cache_read_input_tokens'] ?? $roh['cacheReadInputTokens'] ?? 0);

        $schreiben = $roh['cache_creation'] ?? $roh['cacheCreation'] ?? null;
        $fuenfMin = is_array($schreiben) ? $zahl($schreiben['ephemeral_5m_input_tokens'] ?? $schreiben['ephemeral5mInputTokens'] ?? 0) : 0;
        $eineStd = is_array($schreiben) ? $zahl($schreiben['ephemeral_1h_input_tokens'] ?? $schreiben['ephemeral1hInputTokens'] ?? 0) : 0;
        $gesamt = $zahl($roh['cache_creation_input_tokens'] ?? $roh['cacheCreationInputTokens'] ?? 0);
        if ($fuenfMin + $eineStd === 0 && $gesamt > 0) {
            // Ohne Aufteilung gilt die Standard-Haltbarkeit von fünf Minuten.
            $fuenfMin = $gesamt;
        }
        $usage['cache_schreiben_5m'] = $fuenfMin;
        $usage['cache_schreiben_1h'] = $eineStd;

        $details = $roh['output_tokens_details'] ?? $roh['outputTokensDetails'] ?? null;
        $usage['denk_tokens'] = is_array($details) ? $zahl($details['thinking_tokens'] ?? $details['thinkingTokens'] ?? 0) : 0;
        return $usage;
    }

    /**
     * Ordnet eine Ausnahme einer Fehlerart zu.
     *
     * limit_anbieter  Ausgabenlimit oder Guthaben bei Anthropic erschöpft – nicht wiederholen
     * schluessel      Schlüssel oder Konto abgelehnt (401, 403, Organisation gesperrt)
     * voruebergehend  429, 5xx, 529, Zeitüberschreitung, Netz – später noch einmal
     * anfrage         sonstiges 4xx oder ein Fehler vor dem Absenden
     *
     * @return array<string, mixed>
     */
    private static function fehler(\Throwable $e, object $leitung, int|float $start): array
    {
        $basis = [
            'request_id' => (string) $leitung->requestId,
            'http' => 0,
            'dauer_ms' => self::dauerMs($start),
            'verlorene_versuche' => (int) $leitung->ohneAntwort,
            'abgeschickt' => (int) ($leitung->abgeschickt ?? 0),
        ];

        if ($e instanceof \Anthropic\Core\Exceptions\APIStatusException) {
            $status = (int) ($e->status ?? 0);
            $basis['http'] = $status;
            $anfrageId = $e->getRequestID();
            if (is_string($anfrageId) && $anfrageId !== '') {
                $basis['request_id'] = $anfrageId;
            }
            $kennung = self::kennung($e);
            $text = 'HTTP ' . $status . ($kennung !== '' ? ' ' . $kennung : '');

            $art = match (true) {
                self::istAusgabenlimit($e) => 'limit_anbieter',
                $e instanceof \Anthropic\Core\Exceptions\AuthenticationException,
                $e instanceof \Anthropic\Core\Exceptions\PermissionDeniedException,
                $e instanceof \Anthropic\OrganizationOnHoldException,
                $status === 401, $status === 403 => 'schluessel',
                $e instanceof \Anthropic\Core\Exceptions\RateLimitException,
                $e instanceof \Anthropic\Core\Exceptions\InternalServerException,
                $status === 408, $status === 409, $status === 429, $status >= 500 => 'voruebergehend',
                default => 'anfrage',
            };
            if ($art === 'limit_anbieter') {
                $text = 'Ausgabenlimit bei Anthropic erreicht (' . $text . ')';
            }
            return self::ergebnis($basis + ['fehler' => $text, 'fehler_art' => $art]);
        }

        if ($e instanceof \Anthropic\Core\Exceptions\APIConnectionException) {
            return self::ergebnis($basis + [
                'fehler' => 'Keine Antwort von Anthropic (Zeitüberschreitung oder Netzfehler).',
                'fehler_art' => 'voruebergehend',
            ]);
        }

        // Alles andere ist vor dem Absenden oder beim Auswerten passiert. Nur der Klassenname
        // geht in den Fehlertext – die Meldung einer Ausnahme kann Inhalte der Anfrage tragen.
        $klasse = substr((string) strrchr('\\' . $e::class, '\\'), 1);
        return self::ergebnis($basis + [
            'http' => (int) $leitung->status,
            'fehler' => 'Interner Fehler beim Aufruf (' . $klasse . ').',
            'fehler_art' => 'anfrage',
        ]);
    }

    /**
     * Ausgabenlimit erreicht? Dafür gibt es drei Formen: die eigenen Ausnahmen des SDK
     * (Tarif- oder Vertragslimit, HTTP 429), fehlendes Guthaben (HTTP 402) und das selbst gesetzte
     * Workspace-Limit, das als gewöhnlicher HTTP 400 mit einer festen Meldung kommt.
     */
    private static function istAusgabenlimit(\Throwable $e): bool
    {
        if ($e instanceof \Anthropic\EnforcedSpendLimitReachedException
            || $e instanceof \Anthropic\ContractSpendLimitReachedException
            || $e instanceof \Anthropic\LinkedOrganizationSpendLimitReachedException
            || $e instanceof \Anthropic\LinkedOrganizationBillingUnavailableException
            || $e instanceof \Anthropic\Core\Exceptions\PaymentRequiredException) {
            return true;
        }
        if (!$e instanceof \Anthropic\Core\Exceptions\APIStatusException) {
            return false;
        }
        if (str_contains(self::kennung($e), 'spend_limit')) {
            return true;
        }
        if ((int) ($e->status ?? 0) !== 400) {
            return false;
        }
        try {
            $meldung = (string) ($e->getAPIMessage() ?? '');
        } catch (\Throwable) {
            $meldung = '';
        }
        return str_starts_with(strtolower(ltrim($meldung)), self::MELDUNG_EIGENES_LIMIT);
    }

    /** Fehlertyp und Fehlerkennung der API, z. B. „rate_limit_error“ – beides feste Kennwörter. */
    private static function kennung(\Anthropic\Core\Exceptions\APIStatusException $e): string
    {
        $teile = [];
        try {
            $teile[] = (string) ($e->getType() ?? '');
            $teile[] = (string) ($e->getErrorCode() ?? '');
        } catch (\Throwable) {
            // Unlesbarer Fehlerkörper: dann bleibt es beim HTTP-Status.
        }
        $teile = array_filter($teile, static fn (string $t): bool => preg_match('/^[a-z0-9_]{1,60}$/', $t) === 1);
        return implode(' ', array_unique($teile));
    }

    /** Stop-Grund als Text – das SDK liefert je nach Version eine Zeichenkette oder ein Enum. */
    private static function alsText(mixed $wert): string
    {
        if ($wert instanceof \BackedEnum) {
            return (string) $wert->value;
        }
        return is_string($wert) ? $wert : '';
    }

    private static function dauerMs(int|float $start): int
    {
        return (int) round((hrtime(true) - $start) / 1_000_000);
    }

    /**
     * Ergänzt fehlende Felder, damit jeder Aufrufer dieselbe Form bekommt.
     *
     * @param array<string, mixed> $teil
     * @return array<string, mixed>
     */
    private static function ergebnis(array $teil): array
    {
        $usage = self::leereUsage();
        foreach ((array) ($teil['usage'] ?? []) as $name => $wert) {
            if (array_key_exists($name, $usage) && (is_int($wert) || is_float($wert))) {
                $usage[$name] = max(0, (int) $wert);
            }
        }
        $daten = $teil['daten'] ?? null;
        return [
            'ok' => !empty($teil['ok']) && is_array($daten),
            'daten' => is_array($daten) ? $daten : null,
            'usage' => $usage,
            'stop' => (string) ($teil['stop'] ?? ''),
            'request_id' => (string) ($teil['request_id'] ?? ''),
            'http' => (int) ($teil['http'] ?? 0),
            'dauer_ms' => max(0, (int) ($teil['dauer_ms'] ?? 0)),
            'fehler' => (string) ($teil['fehler'] ?? ''),
            'fehler_art' => (string) ($teil['fehler_art'] ?? ''),
            'verlorene_versuche' => max(0, (int) ($teil['verlorene_versuche'] ?? 0)),
            'abgeschickt' => isset($teil['abgeschickt']) && is_numeric($teil['abgeschickt']) ? max(0, (int) $teil['abgeschickt']) : null,
        ];
    }

    /**
     * HTTP-Leitung mit festem Zeitbudget für alle Versuche eines Aufrufs zusammen.
     *
     * - Jeder Versuch bekommt nur die Restzeit. Für eine Wiederholung müssen noch mindestens
     *   fünf Sekunden übrig sein, sonst lohnt sie nicht (eine Antwort braucht zwei bis drei).
     * - Verlangt der Server per „Retry-After“ eine Pause, die nicht mehr ins Budget passt, wird die
     *   Antwort als nicht wiederholbar markiert. Sonst schliefe das SDK beliebig lang und der
     *   Lauf liefe in das Zeitlimit des Webservers.
     * - Status und Request-ID der letzten Antwort bleiben für die Verbrauchszeile abrufbar.
     */
    private static function leitung(float $sekunden): \Psr\Http\Client\ClientInterface
    {
        return new class($sekunden) implements \Psr\Http\Client\ClientInterface {
            /** Mindestrest in Sekunden, damit ein weiterer Versuch beginnt. */
            private const REST_FUER_WIEDERHOLUNG = 5.0;

            public string $requestId = '';
            public int $status = 0;
            public int $versuche = 0;
            /** Abgeschickte Versuche, auf die keine Antwort kam. */
            public int $ohneAntwort = 0;
            /** Versuche, bei denen die Verbindung zustande kam (etwas konnte bei Anthropic ankommen). */
            public int $abgeschickt = 0;

            private float $ende;
            private \GuzzleHttp\Client $http;

            public function __construct(float $sekunden)
            {
                $this->ende = microtime(true) + $sekunden;
                $this->http = new \GuzzleHttp\Client();
            }

            public function sendRequest(\Psr\Http\Message\RequestInterface $request): \Psr\Http\Message\ResponseInterface
            {
                $rest = $this->ende - microtime(true);
                if ($this->versuche > 0 && $rest < self::REST_FUER_WIEDERHOLUNG) {
                    // Nichts abgeschickt: zählt nicht als verlorener Versuch.
                    throw new \GuzzleHttp\Exception\ConnectException('Zeitbudget aufgebraucht', $request);
                }
                $this->versuche++;
                $rest = max(1.0, $rest);
                try {
                    $antwort = $this->http->send($request, [
                        'timeout' => $rest,
                        'connect_timeout' => min(5.0, $rest),
                        'http_errors' => false,
                        // Weiterleitungen verfolgt das SDK selbst und nimmt dabei den Schlüssel heraus.
                        'allow_redirects' => false,
                    ]);
                } catch (\GuzzleHttp\Exception\ConnectException $e) {
                    // Verbindung abgelehnt, DNS-Fehler, Zeitüberschreitung beim Verbinden: Es kam
                    // nichts bei Anthropic an, also wird auch nichts berechnet.
                    throw $e;
                } catch (\GuzzleHttp\Exception\GuzzleException $e) {
                    // Verbunden, aber ohne Antwort (NetworkTimeoutException u. a.): kann berechnet werden.
                    $this->abgeschickt++;
                    $this->ohneAntwort++;
                    throw $e;
                }
                $this->abgeschickt++;

                $this->status = $antwort->getStatusCode();
                $this->requestId = substr($antwort->getHeaderLine('request-id'), 0, 80);

                $wiederholbar = in_array($this->status, [408, 409, 429], true) || $this->status >= 500;
                if ($wiederholbar) {
                    $rest = $this->ende - microtime(true);
                    if ($rest - $this->verlangtePause($antwort) < self::REST_FUER_WIEDERHOLUNG) {
                        $antwort = $antwort->withHeader('x-should-retry', 'false');
                    }
                }
                return $antwort;
            }

            /** Pause in Sekunden, die der Server vor einer Wiederholung verlangt (0 = keine Vorgabe). */
            private function verlangtePause(\Psr\Http\Message\ResponseInterface $antwort): float
            {
                $ms = $antwort->getHeaderLine('retry-after-ms');
                if (is_numeric($ms)) {
                    return max(0.0, (float) $ms / 1000);
                }
                $kopf = $antwort->getHeaderLine('retry-after');
                if (is_numeric($kopf)) {
                    return max(0.0, (float) $kopf);
                }
                if ($kopf !== '' && ($zeit = strtotime($kopf)) !== false) {
                    return max(0.0, (float) ($zeit - time()));
                }
                return 0.0;
            }
        };
    }
}
