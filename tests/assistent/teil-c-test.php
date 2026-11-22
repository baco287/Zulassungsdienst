<?php
/**
 * Tests Baustein C – KI-Kern: Wissen, Prompt, Claude (ohne Netz), Prüfer und Kern.
 *
 * Wird von regeln-test.php eingebunden (dort stehen Prüfhilfe, Datenordner, Test-Wissensbasis
 * und start.php). Kostenlos: kein Netz, kein echter Claude-Aufruf – Claude::$ersatz liefert
 * die Antworten, Kern::$sendeErsatz stellt die Ausgänge des Mailservers nach.
 *
 * Der Ablauf-Test arbeitet in einem eigenen Unterordner des Test-Datenordners (frische
 * Datenbank) und mit einer KOPIE von tests/assistent/mails: Das Datei-Postfach schreibt seinen
 * Zustand (.zustand.json, gesendet/) neben die Mails, und das soll nie im Repository landen.
 * Am Ende sind Uhr, Ordner, Wissensbasis, Postfach und Ersatz-Funktionen wiederhergestellt.
 *
 * Beträge, Links und Texte kommen immer aus der Wissensbasis, nie fest aus diesem Test – so
 * bleibt er richtig, wenn sich Preise oder Seiten ändern.
 */

declare(strict_types=1);

use KZP\Assistent\Budget;
use KZP\Assistent\Claude;
use KZP\Assistent\Kern;
use KZP\Assistent\Prompt;
use KZP\Assistent\Pruefer;
use KZP\Assistent\Speicher;
use KZP\Assistent\Text;
use KZP\Assistent\Umgebung;
use KZP\Assistent\Wissen;

(static function (): void {
    $basis = rtrim((string) getenv('KZP_ASSISTENT_DIR'), '/');
    abschnitt('C · Vorbereitung');
    pruefe($basis !== '' && is_dir($basis), 'Der Testlauf hat einen eigenen Datenordner');
    $wissen = Wissen::laden();
    pruefe($wissen !== null, 'Test-Wissensbasis lässt sich laden');
    if ($basis === '' || !is_dir($basis) || $wissen === null) {
        return;
    }

    // -- Was am Ende wiederhergestellt wird ----------------------------------------
    $namen = ['KZP_ASSISTENT_DIR', 'KZP_ASSISTENT_JETZT', 'KZP_ASSISTENT_POSTFACH', 'KZP_ASSISTENT_WISSEN', 'KZP_ASSISTENT_VERSAND', 'ANTHROPIC_API_KEY'];
    $vorher = [];
    foreach ($namen as $name) {
        $vorher[$name] = getenv($name);
    }
    $ersatzVorher = Claude::$ersatz;
    $sendeVorher = Kern::$sendeErsatz;
    $mailsOriginal = dirname(__FILE__) . '/mails';
    $originalZustand = is_file($mailsOriginal . '/.zustand.json');
    $originalGesendet = is_dir($mailsOriginal . '/gesendet');

    // Nie mit einem echten Schlüssel: Budget::darfAufrufen braucht nur irgendeinen.
    if (!is_string($vorher['ANTHROPIC_API_KEY']) || $vorher['ANTHROPIC_API_KEY'] === '') {
        putenv('ANTHROPIC_API_KEY=test-schluessel-kein-echter');
    }

    // -- Hilfen ------------------------------------------------------------------------
    $berlin = new DateTimeZone('Europe/Berlin');
    $zeit = static fn (string $wann): int => (new DateTimeImmutable($wann, $berlin))->getTimestamp();
    $uhr = static function (?int $t): void {
        putenv($t === null ? 'KZP_ASSISTENT_JETZT' : 'KZP_ASSISTENT_JETZT=' . $t);
    };
    $alleTexte = static function (array $w): string {
        $teile = [];
        array_walk_recursive($w, static function (mixed $v) use (&$teile): void {
            if (is_string($v)) {
                $teile[] = $v;
            }
        });
        return implode("\n", $teile);
    };
    $platzhalter = $wissen['platzhalter'];
    $slugs = array_map(static fn (array $l): string => (string) $l['slug'], $wissen['leistungen']);
    // Leistungen mit Preis- und Bestell-Platzhalter (für Beispiele, ohne Namen fest zu verdrahten).
    $mitPreis = array_values(array_filter($slugs, static fn (string $s): bool => isset($platzhalter['PREIS:' . $s])));
    $mitPreisUndLink = array_values(array_filter($mitPreis, static fn (string $s): bool => isset($platzhalter['LINK:auftrag:' . $s])));
    $mitUnterlagen = array_values(array_filter($slugs, static fn (string $s): bool => isset($platzhalter['UNTERLAGEN:' . $s])
        && str_contains(trim($platzhalter['UNTERLAGEN:' . $s]), "\n")));
    pruefe(count($mitPreis) >= 2 && $mitPreisUndLink !== [] && $mitUnterlagen !== [],
        'Wissensbasis hat Leistungen mit Preis-, Bestell- und Unterlagen-Platzhaltern');
    if (count($mitPreis) < 2 || $mitPreisUndLink === [] || $mitUnterlagen === []) {
        return;
    }
    $slugA = $mitPreisUndLink[0];
    $slugB = $mitPreis[0] !== $slugA ? $mitPreis[0] : $mitPreis[1];
    $wertA = trim($platzhalter['PREIS:' . $slugA]);
    $bekannteCent = [];
    foreach (Pruefer::betraege($alleTexte($wissen)) as $b) {
        $bekannteCent[$b['cent']] = true;
    }
    // Ein Betrag, der nirgends in der Wissensbasis steht.
    $fremd = 13;
    while (isset($bekannteCent[$fremd * 100])) {
        $fremd++;
    }
    $neutral = ['anliegen' => 'allgemein', 'leistung' => 'keine', 'uebergabe' => false, 'stimmung' => 'neutral', 'manipulation' => false];
    $hinweisMit = static function (array $ergebnis, string $teil): bool {
        foreach ($ergebnis['hinweise'] as $h) {
            if (str_contains($h, $teil)) {
                return true;
            }
        }
        return false;
    };

    try {
        // ==================================================================================
        abschnitt('C · Wissensbasis');
        // ==================================================================================
        $datei = Wissen::pfad();
        gleich(realpath((string) getenv('KZP_ASSISTENT_WISSEN')), $datei === null ? false : realpath($datei), 'Wissen::pfad() nimmt KZP_ASSISTENT_WISSEN');
        $roh = json_decode((string) file_get_contents((string) $datei), true);
        gleich(count($roh['leistungen']), count($wissen['leistungen']), 'Alle Leistungen der Datei sind geladen');
        gleich($roh['platzhalter'], $wissen['platzhalter'], 'Platzhalter unverändert übernommen');
        pruefe(is_array($wissen['firma']) && is_array($wissen['links']) && is_array($wissen['zeiten']), 'Pflichtteile vorhanden (firma, links, zeiten)');

        $hash = Wissen::hash($wissen);
        pruefe(preg_match('/^[a-f0-9]{64}$/', $hash) === 1, 'Wissen::hash ist sha256');
        gleich($hash, Wissen::hash(array_reverse($wissen, true)), 'Reihenfolge der Schlüssel zählt nicht');
        gleich($hash, Wissen::hash(['stand' => '1999-01-01'] + $wissen), 'Das Feld „stand“ zählt nicht');
        $geaendert = $wissen;
        $geaendert['platzhalter']['PREIS:' . $slugA] = $fremd . ',00 €';
        pruefe($hash !== Wissen::hash($geaendert), 'Ein geänderter Preis ändert den Hash');

        $fehlerhaft = [];
        foreach ($wissen['leistungen'] as $l) {
            if (!empty($l['preis_auf_anfrage']) && isset($platzhalter['PREIS:' . $l['slug']])) {
                $fehlerhaft[] = $l['slug'];
            }
        }
        gleich([], $fehlerhaft, 'Leistungen mit Preis auf Anfrage haben keinen PREIS-Platzhalter');
        $ohneUtm = [];
        $linkWerte = array_flip(array_values($wissen['links']));
        $fremdeLinks = [];
        foreach ($platzhalter as $k => $v) {
            if (str_starts_with($k, 'LINK:auftrag') && !str_contains($v, 'utm_source=email-assistent')) {
                $ohneUtm[] = $k;
            }
            if (str_starts_with($k, 'LINK:') && !isset($linkWerte[$v])) {
                $fremdeLinks[] = $k;
            }
        }
        gleich([], $ohneUtm, 'Bestell-Links tragen utm_source=email-assistent (Bauplan 7.5)');
        gleich([], $fremdeLinks, 'Jeder LINK-Platzhalter steht auch unter wissen.links');

        $kaputt = $basis . '/teil-c-wissen-kaputt.json';
        file_put_contents($kaputt, '{"firma": {');
        putenv('KZP_ASSISTENT_WISSEN=' . $kaputt);
        gleich(null, Wissen::laden(), 'Unlesbare Wissensbasis → null');
        file_put_contents($kaputt, json_encode(['firma' => [], 'leistungen' => [], 'platzhalter' => [], 'links' => []]));
        gleich(null, Wissen::laden(), 'Wissensbasis ohne Leistungen → null');
        file_put_contents($kaputt, json_encode(['firma' => [], 'leistungen' => [['slug' => 'x']], 'platzhalter' => ['A' => 1], 'links' => []]));
        gleich(null, Wissen::laden(), 'Platzhalter, die kein Text sind → null');
        putenv('KZP_ASSISTENT_WISSEN=' . $vorher['KZP_ASSISTENT_WISSEN']);
        pruefe(Wissen::laden() !== null, 'Zurück auf der Test-Wissensbasis');

        // Aktion: wird nach dem letzten gültigen Tag (Berliner Datum) gesperrt.
        $mitAktion = $wissen;
        $aktionsSlug = $mitPreis[0];
        $mitAktion['aktion'] = is_array($wissen['aktion'])
            ? $wissen['aktion']
            : ['name' => 'Testaktion', 'gueltig_bis' => '2026-12-31', 'text' => 'Testaktion', 'leistungen' => [$aktionsSlug]];
        $mitAktion['aktion']['leistungen'] = array_values(array_unique(array_merge((array) ($mitAktion['aktion']['leistungen'] ?? []), [$aktionsSlug])));
        $bis = (string) $mitAktion['aktion']['gueltig_bis'];
        $uhr($zeit($bis . ' 23:30:00'));
        pruefe(!Wissen::aktionAbgelaufen($mitAktion), 'Aktion gilt am letzten Tag bis Mitternacht (Berliner Zeit)');
        $uhr($zeit($bis . ' 23:59:59') + 2);
        pruefe(Wissen::aktionAbgelaufen($mitAktion), 'Aktion ist am Folgetag abgelaufen');
        $uhr(null);
        $ohneAktion = $wissen;
        $ohneAktion['aktion'] = null;
        pruefe(!Wissen::aktionAbgelaufen($ohneAktion) && Wissen::aktionsLeistungen($ohneAktion) === [], 'Ohne Aktion: nichts gesperrt');

        // ==================================================================================
        abschnitt('C · Prompt');
        // ==================================================================================
        $system = Prompt::system($wissen);
        gleich($system, Prompt::system($wissen), 'Systemtext ist bei gleichem Wissen gleich (Cache-fähig)');
        $uhr($zeit('2027-03-01 08:00:00'));
        gleich($system, Prompt::system($wissen), 'Systemtext hängt nicht vom Datum ab');
        $uhr(null);
        $fehlend = [];
        foreach (array_keys($platzhalter) as $k) {
            if (!str_contains($system, '{{' . $k . '}}')) {
                $fehlend[] = $k;
            }
        }
        gleich([], $fehlend, 'Jeder Platzhalter der Wissensbasis steht im Systemtext');
        preg_match_all('/\{\{([^{}]+)\}\}/u', $system, $m);
        $erfunden = array_values(array_unique(array_filter($m[1], static fn (string $k): bool => !isset($platzhalter[$k]))));
        gleich([], $erfunden, 'Der Systemtext nennt keinen Platzhalter, den es nicht gibt (auch nicht in den Beispielen)');
        $ohneSlug = array_values(array_filter($slugs, static fn (string $s): bool => !str_contains($system, '(Slug: ' . $s . ')')));
        gleich([], $ohneSlug, 'Jede Leistung steht mit ihrem Slug im Systemtext');
        $imPrompt = array_values(array_filter($wissen['faq'], static fn (array $f): bool => ($f['im_prompt'] ?? true) !== false));
        $weg = array_values(array_filter($wissen['faq'], static fn (array $f): bool => ($f['im_prompt'] ?? true) === false));
        $frage = trim((string) preg_replace('/\s+/u', ' ', (string) ($imPrompt[0]['frage'] ?? '')));
        pruefe($frage !== '' && str_contains($system, $frage), 'Häufige Fragen stehen im Systemtext');
        $wegFrage = trim((string) preg_replace('/\s+/u', ' ', (string) ($weg[0]['frage'] ?? '')));
        pruefe($weg !== [] && !str_contains($system, $wegFrage), 'Häufige Fragen mit im_prompt = false fehlen im Systemtext (F7: stehen schon an anderer Stelle)');
        foreach ($wissen['leistungen'] as $l) {
            $beschreibung = trim((string) preg_replace('/\s+/u', ' ', (string) ($l['beschreibung'] ?? '')));
            $kurzText = trim((string) preg_replace('/\s+/u', ' ', (string) ($l['kurz'] ?? '')));
            if ($beschreibung !== '' && $beschreibung !== $kurzText) {
                enthaelt_nicht($beschreibung, $system, 'Lange Beschreibung der Leistung (Werbetext) steht nicht im Systemtext (F7)');
                enthaelt($kurzText, $system, 'Kurzbeschreibung der Leistung steht im Systemtext');
                break;
            }
        }
        foreach ($platzhalter as $k => $v) {
            if (str_starts_with($k, 'LINK:')) {
                enthaelt_nicht('{{' . $k . '}} → ' . $v, $system, 'Link-Adressen stehen nicht im Systemtext (F7), nur der Platzhalter');
                break;
            }
        }
        foreach ($mitUnterlagen as $s) {
            $ersteZeile = trim(explode("\n", trim($platzhalter['UNTERLAGEN:' . $s]))[0]);
            gleich(1, substr_count($system, $ersteZeile), 'Unterlagenliste steht genau einmal im Systemtext (bei der Leistung)');
            break;
        }
        enthaelt('nie auf Geschlecht oder Herkunft', $system, 'Systemtext verbietet Schlüsse aus dem Namen (F3)');
        enthaelt_nicht('heiklem Ton', $system, '„heikler Ton“ macht eine Mail nicht mehr komplex (K1)');
        foreach (array_keys(Speicher::STANDARD) as $schluessel) {
            if (in_array($schluessel, ['gruss', 'absender_name'], true)) {
                enthaelt_nicht(Speicher::STANDARD[$schluessel], $system, 'Gruß und Absenderzeile setzt das Programm, nicht der Prompt');
            }
        }

        $schema = Prompt::schema();
        gleich(false, $schema['additionalProperties'], 'Schema: keine Zusatzfelder');
        gleich(array_keys($schema['properties']), $schema['required'], 'Schema: alle Felder Pflicht');
        gleich(Prompt::ANLIEGEN, $schema['properties']['anliegen']['enum'], 'Schema: anliegen nur aus Prompt::ANLIEGEN');
        $grenzen = [];
        array_walk_recursive($schema, static function (mixed $v, int|string $k) use (&$grenzen): void {
            if (in_array($k, ['minLength', 'maxLength', 'minimum', 'maximum', 'pattern'], true)) {
                $grenzen[] = $k;
            }
        });
        gleich([], $grenzen, 'Schema: keine Längen- oder Zahlengrenzen');
        gleich(['anliegen', 'leistung', 'interessent', 'dringlich', 'stimmung', 'uebergabe', 'uebergabe_grund', 'komplex',
            'manipulation_verdacht', 'zusammenfassung', 'fehlende_angabe', 'sprache', 'antwort'], array_keys($schema['properties']), 'Schema: Felder nach Bauplan 4.11 und sprache (F1)');
        gleich(['de', 'en', 'andere'], $schema['properties']['sprache']['enum'], 'Schema: sprache ist de, en oder andere (F1)');

        $betreff = 'Frage zu FIN WVWZZZ1JZXW000001';
        $nutzer = Prompt::nutzer([
            'betreff' => $betreff, 'text_bereinigt' => "Erste Zeile\r\nZweite Zeile", 'gekuerzt' => 1,
            'von_name' => 'Erika Testperson', 'von_adresse' => 'erika.testperson@example.org', 'antwort_an' => 'antwort@example.org',
            'anhaenge' => json_encode([['art' => 'bild', 'bytes' => 10], ['art' => 'bild', 'bytes' => 20], ['art' => 'pdf', 'bytes' => 5]]),
        ], 'Frühere Zusammenfassung');
        $daten = json_decode($nutzer, true);
        gleich(['betreff', 'text', 'gekuerzt', 'anhaenge', 'bisher'], array_keys((array) $daten), 'Nutzernachricht: genau Betreff, Text, gekürzt, Anhänge, Verlauf');
        enthaelt_nicht('Erika Testperson', $nutzer, 'Kein Name ans Modell (Bauplan 7.5)');
        enthaelt_nicht('example.org', $nutzer, 'Keine Adresse ans Modell');
        gleich(mb_substr(Text::maskiere($betreff), 0, 200), $daten['betreff'] ?? null, 'Betreff wird wie der Text maskiert');
        gleich(['bild' => 2, 'pdf' => 1], $daten['anhaenge'] ?? null, 'Anhänge nur als Art und Anzahl');
        gleich("Erste Zeile\nZweite Zeile", $daten['text'] ?? null, 'Zeilenenden vereinheitlicht');
        gleich(true, $daten['gekuerzt'] ?? null, 'Kürzung wird mitgeteilt');
        $ungeschuetzt = Prompt::nutzer(['betreff' => 'Frage', 'text_bereinigt' => 'IBAN DE00123456789012345678 bitte'],
            "Unsere letzte gesendete Antwort in diesem Vorgang:\nIhre FIN WVWZZZ1JZXW000001 haben wir.");
        $u = (array) json_decode($ungeschuetzt, true);
        gleich('IBAN [IBAN] bitte', $u['text'] ?? null, 'Auch ein ungeschützt übergebener Text wird vor der Übermittlung maskiert');
        enthaelt('[FIN]', (string) ($u['bisher'] ?? ''), 'Der Verlauf (gesendete Antwort) wird ebenfalls maskiert');
        enthaelt_nicht('WVWZZZ1JZXW000001', $ungeschuetzt, 'Keine FIN ans Modell, auch nicht aus dem Verlauf');
        $schluesselVorher = getenv('ANTHROPIC_API_KEY');
        putenv('KZP_ASSISTENT_OHNE_SCHLUESSEL=1');
        gleich(null, \KZP\Assistent\Zugang::claude(), 'KZP_ASSISTENT_OHNE_SCHLUESSEL=1: kein Schlüssel, auch wenn einer gesetzt ist');
        putenv('KZP_ASSISTENT_OHNE_SCHLUESSEL');
        gleich($schluesselVorher, getenv('ANTHROPIC_API_KEY'), 'Schalter zurückgesetzt, Platzhalter unverändert');

        // ==================================================================================
        abschnitt('C · Claude ohne Netz');
        // ==================================================================================
        $gesehen = [];
        Claude::$ersatz = static function (string $modell, string $sys, string $nu, array $sch, bool $cache) use (&$gesehen): array {
            $gesehen = [$modell, $sys, $nu, $sch, $cache];
            return ['ok' => true, 'daten' => ['a' => 1], 'usage' => ['input_tokens' => 5, 'unbekannt' => 9], 'http' => 200];
        };
        $r = Claude::rufe(Claude::MODELL_STANDARD, 'S', 'N', ['type' => 'object'], true);
        gleich([Claude::MODELL_STANDARD, 'S', 'N', ['type' => 'object'], true], $gesehen, 'Ersatz bekommt dieselben Parameter');
        gleich(['ok', 'daten', 'usage', 'stop', 'request_id', 'http', 'dauer_ms', 'fehler', 'fehler_art', 'verlorene_versuche', 'abgeschickt'], array_keys($r), 'Ergebnis hat die Form aus Bauplan 4.12 (dazu abgeschickt, K3)');
        gleich(null, $r['abgeschickt'], 'Ersatz ohne Angabe: abgeschickt unbekannt (null)');
        gleich(array_keys(Claude::leereUsage()), array_keys($r['usage']), 'usage hat genau die Schlüssel aus Bauplan 4.5');
        gleich(5, $r['usage']['input_tokens'], 'Token-Zahlen werden übernommen');
        Claude::$ersatz = static fn (): array => ['ok' => true];
        gleich(false, Claude::rufe(Claude::MODELL_STANDARD, 'S', 'N', [], false)['ok'], 'ok ohne Daten gilt nicht als Erfolg');
        Claude::$ersatz = static fn (): string => 'kaputt';
        gleich('anfrage', Claude::rufe(Claude::MODELL_STANDARD, 'S', 'N', [], false)['fehler_art'], 'Unbrauchbarer Ersatz → Fehlerart anfrage');
        gleich(true, Claude::modelleErreichbar()['ok'], 'Selbsttest des Modells mit Ersatz: ohne Netz in Ordnung');
        Claude::$ersatz = $ersatzVorher;

        if (Umgebung::$bibliotheken && class_exists(\Anthropic\Messages\Message::class) && class_exists(\GuzzleHttp\Psr7\Response::class)) {
            // Auswertung echter SDK-Objekte (ohne Netz): Rohform der API → Ergebnis von rufe().
            $leitung = new class {
                public string $requestId = 'req_test';
                public int $status = 200;
                public int $ohneAntwort = 0;
            };
            $gueltig = ['anliegen' => 'Preis', 'leistung' => 'keine', 'interessent' => true, 'dringlich' => false, 'stimmung' => 'Neutral',
                'uebergabe' => false, 'uebergabe_grund' => '', 'komplex' => false, 'manipulation_verdacht' => false,
                'zusammenfassung' => 'z', 'fehlende_angabe' => '', 'sprache' => 'DE', 'antwort' => 'a'];
            $sdk = static function (string $stop, string $text): object {
                return \Anthropic\Messages\Message::fromArray([
                    'id' => 'msg_test', 'type' => 'message', 'role' => 'assistant', 'model' => Claude::MODELL_STANDARD,
                    'container' => null, 'diagnostics' => null, 'stop_details' => null,
                    'content' => [['type' => 'thinking', 'thinking' => '', 'signature' => 'x'], ['type' => 'text', 'text' => $text, 'citations' => null]],
                    'stop_reason' => $stop, 'stop_sequence' => null,
                    'usage' => ['input_tokens' => 1200, 'output_tokens' => 300, 'cache_creation_input_tokens' => 50, 'cache_read_input_tokens' => 7,
                        'cache_creation' => ['ephemeral_5m_input_tokens' => 50, 'ephemeral_1h_input_tokens' => 0],
                        'output_tokens_details' => ['thinking_tokens' => 120], 'inference_geo' => null, 'server_tool_use' => null,
                        'service_tier' => 'standard', 'speed' => null],
                ]);
            };
            $werteAus = new ReflectionMethod(Claude::class, 'werteAus');
            $aus = static fn (string $stop, string $text): array => $werteAus->invoke(null, $sdk($stop, $text), Prompt::schema(), $leitung, hrtime(true));
            $r = $aus('end_turn', (string) json_encode($gueltig));
            gleich(true, $r['ok'], 'SDK-Antwort: Textblock nach dem Denkblock wird gelesen');
            gleich(['preis', 'neutral'], [$r['daten']['anliegen'] ?? '', $r['daten']['stimmung'] ?? ''], 'Enum-Werte ohne Rücksicht auf Groß-/Kleinschreibung');
            gleich(['input_tokens' => 1200, 'output_tokens' => 300, 'cache_schreiben_5m' => 50, 'cache_schreiben_1h' => 0, 'cache_lesen' => 7, 'denk_tokens' => 120],
                $r['usage'], 'Token-Zahlen samt Cache-Schreiben und Denk-Tokens');
            gleich(['req_test', 200], [$r['request_id'], $r['http']], 'Request-ID und HTTP-Status aus der Leitung');
            gleich('abgelehnt', $aus('refusal', (string) json_encode($gueltig))['fehler_art'], 'stop_reason refusal → abgelehnt');
            gleich('abgeschnitten', $aus('max_tokens', (string) json_encode($gueltig))['fehler_art'], 'stop_reason max_tokens → abgeschnitten');
            $ohneFeld = $gueltig;
            unset($ohneFeld['antwort']);
            gleich('kein_json', $aus('end_turn', (string) json_encode($ohneFeld))['fehler_art'], 'Fehlendes Pflichtfeld → kein_json');
            gleich('kein_json', $aus('end_turn', (string) json_encode(['anliegen' => 'erfunden'] + $gueltig))['fehler_art'], 'Unbekannter Enum-Wert → kein_json');
            gleich('kein_json', $aus('end_turn', 'Hier ist Ihre Antwort')['fehler_art'], 'Kein JSON → kein_json');

            $fehler = new ReflectionMethod(Claude::class, 'fehler');
            $anfrage = new \GuzzleHttp\Psr7\Request('POST', 'https://api.anthropic.com/v1/messages');
            $statusFehler = static function (int $status, string $typ, string $meldung) use ($anfrage): \Throwable {
                $koerper = (string) json_encode(['type' => 'error', 'error' => ['type' => $typ, 'message' => $meldung]]);
                return \Anthropic\Core\Exceptions\APIStatusException::from(
                    $anfrage,
                    new \GuzzleHttp\Psr7\Response($status, ['request-id' => 'req_f', 'content-type' => 'application/json'], $koerper)
                );
            };
            $art = static fn (\Throwable $e): array => $fehler->invoke(null, $e, $leitung, hrtime(true));
            gleich('limit_anbieter', $art($statusFehler(400, 'invalid_request_error', 'You have reached your specified workspace API usage limits.'))['fehler_art'],
                'HTTP 400 „You have reached your specified …“ → limit_anbieter');
            gleich('limit_anbieter', $art($statusFehler(402, 'billing_error', 'x'))['fehler_art'], 'HTTP 402 → limit_anbieter');
            gleich('schluessel', $art($statusFehler(401, 'authentication_error', 'x'))['fehler_art'], 'HTTP 401 → schluessel');
            gleich('schluessel', $art($statusFehler(403, 'permission_error', 'x'))['fehler_art'], 'HTTP 403 → schluessel');
            gleich('voruebergehend', $art($statusFehler(429, 'rate_limit_error', 'x'))['fehler_art'], 'HTTP 429 → voruebergehend');
            gleich('voruebergehend', $art($statusFehler(529, 'overloaded_error', 'x'))['fehler_art'], 'HTTP 529 → voruebergehend');
            $sonst = $art($statusFehler(400, 'invalid_request_error', 'Geheimer Mailtext Beispiel'));
            gleich(['anfrage', 400, 'req_f'], [$sonst['fehler_art'], $sonst['http'], $sonst['request_id']], 'Sonstiges 4xx → anfrage, mit Status und Request-ID');
            enthaelt_nicht('Geheimer Mailtext', $sonst['fehler'], 'Fehlertext enthält die Meldung der API nicht');
            gleich('voruebergehend', $art(new \Anthropic\Core\Exceptions\APIConnectionException($anfrage, null, 'Zeitüberschreitung'))['fehler_art'], 'Netzfehler → voruebergehend');
            $intern = $art(new RuntimeException('Inhalt einer Mail'));
            gleich('anfrage', $intern['fehler_art'], 'Unerwartete Ausnahme → anfrage');
            enthaelt_nicht('Inhalt einer Mail', $intern['fehler'], 'Meldung einer fremden Ausnahme bleibt draußen');

            // Die Leitung schickt keinen zweiten Versuch, wenn das Zeitbudget nicht mehr reicht.
            $baue = new ReflectionMethod(Claude::class, 'leitung');
            $knapp = $baue->invoke(null, 1.0);
            $knapp->versuche = 1;
            $geworfen = false;
            try {
                $knapp->sendRequest(new \GuzzleHttp\Psr7\Request('POST', 'http://127.0.0.1:9/'));
            } catch (\GuzzleHttp\Exception\ConnectException) {
                $geworfen = true;
            }
            pruefe($geworfen && $knapp->ohneAntwort === 0, 'Kein weiterer Versuch ohne Zeitbudget – und er zählt nicht als verloren');
        } else {
            pruefe(false, 'Bibliotheken für die SDK-Prüfungen geladen');
        }

        // ==================================================================================
        abschnitt('C · Prüfer: Platzhalter füllen');
        // ==================================================================================
        // Feste Uhr innerhalb einer laufenden Aktion der Test-Wissensbasis: Mit der echten Uhr
        // schlügen diese Prüfungen ab dem Tag nach dem Aktionsende fehl (der Aktionspreis gilt dann
        // als unbekannt) – und jeder Deploy ließe den Assistenten auf dem alten Stand (B1).
        $mitten = $zeit('2026-12-01 12:00:00');
        if (is_array($wissen['aktion']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($wissen['aktion']['gueltig_bis'] ?? '')) === 1) {
            $mitten = min($mitten, $zeit((string) $wissen['aktion']['gueltig_bis'] . ' 12:00:00'));
        }
        $uhr($mitten);
        pruefe(!Wissen::aktionAbgelaufen($wissen), 'Prüfer-Tests laufen mit einer Uhr innerhalb der Aktion');
        $f = Pruefer::fuelle('Das kostet {{PREIS:' . $slugA . '}}.', $wissen);
        gleich(['Das kostet ' . $wertA . '.', []], [$f['text'], $f['unbekannt']], 'Preis-Platzhalter wird mit dem Wert der Wissensbasis gefüllt');
        $f = Pruefer::fuelle('Das kostet {{ ' . mb_strtolower('PREIS:' . $slugA) . ' }}.', $wissen);
        gleich('Das kostet ' . $wertA . '.', $f['text'], 'Schreibweise und Leerzeichen im Platzhalter spielen keine Rolle');
        $f = Pruefer::fuelle('Das kostet {{PREIS:gibt-es-nicht}} und {{FOO}}.', $wissen);
        gleich(['PREIS:gibt-es-nicht', 'FOO'], $f['unbekannt'], 'Unbekannte Platzhalter werden gemeldet');
        enthaelt('{{PREIS:gibt-es-nicht}}', $f['text'], 'Unbekannter Platzhalter bleibt im Text stehen');
        $p = Pruefer::pruefe($f['text'], $neutral, $wissen);
        pruefe($p['status'] === 'abgelehnt' && $hinweisMit($p, 'Unbekannter Platzhalter'), 'Unbekannter Platzhalter → abgelehnt');

        $liste = 'UNTERLAGEN:' . $mitUnterlagen[0];
        $f = Pruefer::fuelle('Wir brauchen: {{' . $liste . '}}. Fotos genügen.', $wissen);
        $zeilen = explode("\n", $f['text']);
        $erwartet = array_map('trim', explode("\n", trim(str_replace(["\r\n", "\r"], "\n", $platzhalter[$liste]))));
        pruefe(array_slice($zeilen, 1, count($erwartet)) === $erwartet, 'Unterlagenliste steht Zeile für Zeile im Text');
        gleich('Fotos genügen.', end($zeilen), 'Nach der Liste geht der Satz in einer eigenen Zeile weiter');
        gleich('Wir brauchen:', $zeilen[0], 'Vor der Liste endet die Zeile');

        $nichtOk = [];
        foreach (array_keys($platzhalter) as $k) {
            $e = Pruefer::pruefeEntwurf('Vielen Dank für Ihre Nachricht. {{' . $k . '}}', $neutral, $wissen);
            if ($e['status'] !== 'ok' || $e['unbekannt'] !== [] || Pruefer::hatPlatzhalterReste($e['text'])) {
                $nichtOk[$k] = $e['hinweise'];
            }
        }
        gleich([], $nichtOk, 'Jeder Platzhalter der Wissensbasis ergibt gefüllt einen Entwurf ohne Hinweis');

        // ==================================================================================
        abschnitt('C · Prüfer: Hinweise');
        // ==================================================================================
        $p = Pruefer::pruefe('Das kostet ' . $fremd . ' €.', $neutral, $wissen);
        pruefe($p['status'] === 'warnung' && $hinweisMit($p, 'steht nicht in der Wissensbasis'), 'Fremder Betrag → Warnung');
        $p = Pruefer::pruefe('Das kostet ' . $fremd . ',00 EUR.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'steht nicht in der Wissensbasis'), 'Fremder Betrag auch mit Nachkommastellen und „EUR“');
        $centA = Pruefer::betraege($wertA)[0]['cent'] ?? -1;
        $kurzA = $centA % 100 === 0 ? intdiv($centA, 100) . ' €' : $wertA;
        $p = Pruefer::pruefe('Das kostet ' . $kurzA . '.', $neutral, $wissen);
        gleich('ok', $p['status'], 'Betrag aus der Wissensbasis, kurz geschrieben („34 €“ = „34,00 €“), ist kein Fund');
        $v = Pruefer::pruefeVorlage('Das kostet ' . $wertA . '.', $neutral, $wissen);
        pruefe($v['status'] === 'warnung' && $hinweisMit($v, 'statt eines Platzhalters'), 'Betrag in der Vorlage des Modells → Warnung (Bauplan 7.5)');
        $p = Pruefer::pruefe('Das kostet neunzig Euro.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'Betrag in Worten'), 'Betrag in Worten → Warnung');

        $p = Pruefer::pruefe('Mehr dazu unter https://angebot.example/seite.', $neutral, $wissen);
        pruefe($p['status'] === 'warnung' && $hinweisMit($p, 'gehört nicht zu den Links'), 'Fremder Link → Warnung');
        $p = Pruefer::pruefe('Mehr dazu unter angebot-beispiel.example/preise.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'gehört nicht zu den Links'), 'Fremde Domain ohne https → Warnung');
        $einLink = (string) array_values($wissen['links'])[0];
        gleich('ok', Pruefer::pruefe('Hier entlang: ' . $einLink . '.', $neutral, $wissen)['status'], 'Link aus wissen.links ist erlaubt');
        $v = Pruefer::pruefeVorlage('Hier entlang: ' . $einLink, $neutral, $wissen);
        pruefe($hinweisMit($v, 'statt eines Platzhalters'), 'Selbst ausgeschriebener Link in der Vorlage → Warnung');
        $p = Pruefer::pruefe('Schreiben Sie an jemand@example.org.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'nicht die eigene Adresse'), 'Fremde E-Mail-Adresse → Warnung');
        gleich('ok', Pruefer::pruefe('Schreiben Sie an ' . $wissen['firma']['email'] . '.', $neutral, $wissen)['status'], 'Eigene E-Mail-Adresse ist erlaubt');
        gleich('ok', Pruefer::pruefe('Die Unterlagen liegen als scan.pdf vor.', $neutral, $wissen)['status'], 'Dateiname ist keine Domain');
        $zeitMitWort = '';
        foreach ((array) $wissen['platzhalter'] as $s => $w) {
            if (str_starts_with((string) $s, 'ZEIT:') && preg_match('/^(\p{Ll}{3,})\s/u', (string) $w, $erstes) === 1) {
                $zeitMitWort = (string) $s;
                break;
            }
        }
        if ($zeitMitWort !== '') {
            $f = Pruefer::fuelle('Die Bearbeitung dauert ' . $erstes[1] . ' {{' . $zeitMitWort . '}}.', $wissen);
            $p = Pruefer::pruefe($f['text'], $neutral, $wissen);
            pruefe($hinweisMit($p, 'Doppeltes Wort'), 'Doppeltes Wort nach dem Füllen („' . $erstes[1] . ' ' . $erstes[1] . '“) → Warnung');
        }
        gleich('ok', Pruefer::pruefe('Kunden, die die Abmeldung beauftragen, laden die Unterlagen hoch.', $neutral, $wissen)['status'], '„die die“ ist richtiges Deutsch, keine Warnung');

        foreach (['heute noch', 'noch heute', 'morgen', 'sofort', 'umgehend', 'garantiert', 'auf jeden Fall', 'versprochen', 'verbindlich', 'in jedem Fall', 'spätestens'] as $wort) {
            $p = Pruefer::pruefe('Wir erledigen das ' . $wort . ' für Sie.', $neutral, $wissen);
            pruefe($p['status'] === 'warnung' && $hinweisMit($p, 'Zusage'), 'Zusage-Wort „' . $wort . '“ → Warnung');
        }
        gleich('ok', Pruefer::pruefe('Guten Morgen, vielen Dank für Ihre Nachricht.', $neutral, $wissen)['status'], '„Guten Morgen“ ist keine Zusage');
        foreach ($wissen['zeiten'] as $schluessel => $zeitWert) {
            if (isset($platzhalter['ZEIT:' . $schluessel])) {
                $e = Pruefer::pruefeEntwurf('Das dauert {{ZEIT:' . $schluessel . '}}.', $neutral, $wissen);
                gleich('ok', $e['status'], 'Zeitangabe aus der Wissensbasis (ZEIT:' . $schluessel . ') ist keine Zusage');
            }
        }
        $wissensText = mb_strtolower($alleTexte($wissen));
        $stunden = 37;
        while (str_contains($wissensText, $stunden . ' stunden')) {
            $stunden++;
        }
        $p = Pruefer::pruefe('Das erledigen wir innerhalb von ' . $stunden . ' Stunden.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'Zeitangabe'), 'Zeitspanne, die nicht in der Wissensbasis steht → Warnung');

        $p = Pruefer::pruefe('Wir gewähren Ihnen einen Rabatt.', $neutral, $wissen);
        pruefe($hinweisMit($p, 'Rabatt'), 'Rabatt → Warnung');
        if (is_array($wissen['aktion']) && (string) ($wissen['aktion']['name'] ?? '') !== '' && !Wissen::aktionAbgelaufen($wissen)) {
            $p = Pruefer::pruefe('Es gilt unser ' . $wissen['aktion']['name'] . '.', $neutral, $wissen);
            pruefe(!$hinweisMit($p, 'Rabatt'), 'Name der laufenden Aktion ist kein unzulässiger Rabatt');
        }
        pruefe($hinweisMit(Pruefer::pruefe('Nach § 13 gilt das.', $neutral, $wissen), 'Paragraph'), 'Paragraph → Warnung');
        pruefe($hinweisMit(Pruefer::pruefe('Ich bin eine KI und helfe gern.', $neutral, $wissen), 'KI oder Assistent'), 'Selbstbezeichnung als KI → Warnung');
        pruefe($hinweisMit(Pruefer::pruefe('Ich bin ein echter Mensch.', $neutral, $wissen), 'als Mensch'), 'Selbstbezeichnung als Mensch → Warnung');
        pruefe($hinweisMit(Pruefer::pruefe('Kannst du mir die Unterlagen schicken?', $neutral, $wissen), 'Du-Form'), 'Du-Form → Warnung');
        pruefe($hinweisMit(Pruefer::pruefe('**Wichtig:** bitte lesen.', $neutral, $wissen), 'Formatierungszeichen'), 'Sternchen-Formatierung → Warnung');
        pruefe($hinweisMit(Pruefer::pruefe(str_repeat('Vielen Dank für Ihre Nachricht. ', 60), $neutral, $wissen), 'Sehr langer Text'), 'Mehr als 1.500 Zeichen → Warnung');
        $p = Pruefer::pruefe("  \n ", $neutral, $wissen);
        pruefe($p['status'] === 'abgelehnt' && in_array(Pruefer::HINWEIS_LEER, $p['hinweise'], true), 'Leerer Text → abgelehnt');
        pruefe(Pruefer::pruefe('Das kostet {{PREIS:' . $slugA, $neutral, $wissen)['status'] === 'abgelehnt', 'Reste von Platzhalter-Klammern → abgelehnt');

        foreach ([
            'uebergabe' => ['uebergabe' => true],
            'manipulation' => ['manipulation' => 1],
            'manipulation_verdacht' => ['manipulation_verdacht' => true],
            'beschwerde' => ['anliegen' => 'beschwerde'],
            'auftragsstatus' => ['anliegen' => 'auftragsstatus'],
            'kein_kundenanliegen' => ['anliegen' => 'kein_kundenanliegen'],
            'veraergert' => ['stimmung' => 'veraergert'],
        ] as $fall => $felder) {
            pruefe(Pruefer::mussMensch($felder + $neutral), 'mussMensch: ' . $fall);
        }
        pruefe(!Pruefer::mussMensch($neutral), 'mussMensch: neutrale Anfrage nicht');
        $p = Pruefer::pruefe('Vielen Dank für Ihre Nachricht.', ['uebergabe' => true, 'uebergabe_grund' => 'Grund aus dem Test'] + $neutral, $wissen);
        pruefe($p['status'] === 'warnung' && $hinweisMit($p, 'Bitte selbst prüfen: Grund aus dem Test'), 'Übergabefall → „Bitte selbst prüfen“ mit Grund');

        // Preis-Platzhalter, der nicht zur eingeordneten Leistung passt (Bauplan 7.5)
        $v = Pruefer::pruefeVorlage('Das kostet {{PREIS:' . $slugB . '}}.', ['leistung' => $slugA] + $neutral, $wissen);
        pruefe($v['status'] === 'warnung' && $hinweisMit($v, 'Preise anderer Leistungen'), 'Nur Preis einer anderen Leistung → Warnung');
        $v = Pruefer::pruefeVorlage('Das kostet {{PREIS:' . $slugA . '}} plus {{PREIS:' . $slugB . '}}.', ['leistung' => $slugA] + $neutral, $wissen);
        pruefe(!$hinweisMit($v, 'Preise anderer Leistungen'), 'Eigener Preis dabei → kein Hinweis');
        $v = Pruefer::pruefeVorlage('Das kostet {{PREIS:' . $slugB . '}}.', $neutral, $wissen);
        gleich('ok', $v['status'], 'Ohne bestimmte Leistung → kein Hinweis');

        $uhr(null);

        // Abgelaufene Aktion über die Uhr (KZP_ASSISTENT_JETZT)
        $aktionsPreis = 'PREIS:' . $aktionsSlug;
        $uhr($zeit($bis . ' 12:00:00'));
        $e = Pruefer::pruefeEntwurf('Das kostet {{' . $aktionsPreis . '}}.', $neutral, $mitAktion);
        gleich(['ok', []], [$e['status'], $e['unbekannt']], 'Während der Aktion: Aktionspreis wird gefüllt');
        $uhr($zeit($bis . ' 12:00:00') + 86400);
        $e = Pruefer::pruefeEntwurf('Das kostet {{' . $aktionsPreis . '}}.', $neutral, $mitAktion);
        gleich([$aktionsPreis], $e['unbekannt'], 'Nach Ablauf gilt der Aktionspreis als unbekannt');
        pruefe($e['status'] === 'abgelehnt' && in_array(Pruefer::HINWEIS_AKTION_ABGELAUFEN, $e['hinweise'], true), 'Nach Ablauf: abgelehnt mit Hinweis „Aktionspreis abgelaufen“');
        $andere = array_values(array_diff($mitPreis, (array) $mitAktion['aktion']['leistungen']));
        if ($andere !== []) {
            gleich('ok', Pruefer::pruefeEntwurf('Das kostet {{PREIS:' . $andere[0] . '}}.', $neutral, $mitAktion)['status'], 'Preise ohne Aktion bleiben nach Ablauf gültig');
        }
        $uhr(null);

        $gesamt = Pruefer::vereine(['status' => 'ok', 'hinweise' => ['a']], ['status' => 'abgelehnt', 'hinweise' => ['a', 'b']], ['status' => 'warnung', 'hinweise' => []]);
        gleich(['status' => 'abgelehnt', 'hinweise' => ['a', 'b']], $gesamt, 'vereine: strengster Status, Hinweise ohne Doppelte');

        // ==================================================================================
        // Ablauf mit Datei-Postfach und Claude-Ersatz
        // ==================================================================================
        abschnitt('C · Ablauf: Vorbereitung');
        pruefe(Umgebung::$bibliotheken, 'Bibliotheken geladen (Datei-Postfach, Versand und Claude brauchen sie)');
        if (!Umgebung::$bibliotheken) {
            return;
        }
        $datenOrdner = $basis . '/teil-c';
        $postfach = $basis . '/teil-c-mails';
        mkdir($datenOrdner, 0700, true);
        mkdir($postfach, 0700, true);
        foreach (glob($mailsOriginal . '/*.eml') ?: [] as $eml) {
            copy($eml, $postfach . '/' . basename($eml));
        }
        putenv('KZP_ASSISTENT_DIR=' . $datenOrdner);
        putenv('KZP_ASSISTENT_POSTFACH=datei:' . $postfach);
        putenv('KZP_ASSISTENT_VERSAND=datei');
        $t0 = $zeit('2026-11-22 09:00:00');   // nach den Testmails (22.11.2026 früh)
        $jetzt = $t0;
        $uhr($jetzt);
        $db = Speicher::db();
        gleich(0, (int) $db->query('SELECT COUNT(*) FROM nachricht')->fetchColumn(), 'Eigene, frische Datenbank');

        $wert = static function (string $sql, array $p = []) use ($db): mixed {
            $s = $db->prepare($sql);
            $s->execute($p);
            return $s->fetchColumn();
        };
        $zeile = static function (string $sql, array $p = []) use ($db): array {
            $s = $db->prepare($sql);
            $s->execute($p);
            $z = $s->fetch(\PDO::FETCH_ASSOC);
            return is_array($z) ? $z : [];
        };
        $lauf = static function (string $ausloeser = 'test') use (&$jetzt, $uhr): array {
            $jetzt += 60;
            $uhr($jetzt);
            return Kern::lauf($ausloeser);
        };
        $reihenfolge = "status = 'wartet_ki' ORDER BY (status_grund = 'stark') DESC, eingang_am ASC, id ASC";
        $naechste = static fn (int $platz = 0): int => (int) $wert("SELECT id FROM nachricht WHERE {$reihenfolge} LIMIT 1 OFFSET {$platz}");
        $nachricht = static fn (int $id): array => $zeile('SELECT * FROM nachricht WHERE id = ?', [$id]);
        $offen = static fn (int $id): array => $zeile("SELECT * FROM entwurf WHERE nachricht_id = ? AND status = 'offen' ORDER BY id DESC LIMIT 1", [$id]);
        $ausgang = static fn (): array => glob($datenOrdner . '/ausgang/*.eml') ?: [];
        $ausgangMit = static function (string $kopf) use ($ausgang): array {
            return array_values(array_filter($ausgang(), static fn (string $d): bool => str_contains((string) file_get_contents($d), $kopf)));
        };
        $markiere = static function (int $uid) use ($postfach): void {
            $pfad = $postfach . '/.zustand.json';
            $zustand = is_file($pfad) ? (array) json_decode((string) file_get_contents($pfad), true) : [];
            $zustand['flags'][(string) $uid] = array_values(array_unique(array_merge((array) ($zustand['flags'][(string) $uid] ?? []), ['\\Answered'])));
            file_put_contents($pfad, json_encode($zustand, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        };
        $eml = static function (int $uid, string $name, string $von, string $betreff, string $text, int $datum) use ($postfach): void {
            $kopf = "From: <{$von}>\r\nTo: info@kfz-zulassungsprofis.de\r\nSubject: {$betreff}\r\n"
                . 'Date: ' . gmdate('D, d M Y H:i:s', $datum) . " +0000\r\n"
                . 'Message-ID: <teil-c-' . $uid . "@example.org>\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n"
                . "Content-Transfer-Encoding: 8bit\r\n\r\n";
            file_put_contents($postfach . '/' . sprintf('%02d', $uid) . '-' . $name . '.eml', $kopf . str_replace("\n", "\r\n", $text) . "\r\n");
        };

        // Gleiche Mail wie Nr. 01 von einem anderen Absender: für die Duplikat-Prüfung.
        $vorlage01 = glob($postfach . '/01-*.eml') ?: [];
        pruefe($vorlage01 !== [], 'Testmail 01 vorhanden');
        $hoechste = max(array_map(static fn (string $p): int => (int) basename($p), glob($postfach . '/*.eml') ?: [0]));
        $uidDuplikat = $hoechste + 1;
        $roh01 = (string) file_get_contents($vorlage01[0] ?? '/dev/null');
        $roh01 = (string) preg_replace('/^(From|Return-Path):.*$/mi', '$1: <doppelt.gefragt@example.org>', $roh01);
        $roh01 = (string) preg_replace('/^Message-ID:.*$/mi', 'Message-ID: <teil-c-duplikat@example.org>', $roh01);
        $roh01 = (string) preg_replace('/^Date:.*$/mi', 'Date: ' . gmdate('D, d M Y H:i:s', $t0 - 1800) . ' +0000', $roh01);
        file_put_contents($postfach . '/' . $uidDuplikat . '-duplikat.eml', $roh01);
        $anzahlMails = count(glob($postfach . '/*.eml') ?: []);

        // Claude-Ersatz: Antworten aus einer Warteschlange, sonst eine neutrale Standardantwort.
        $aufrufe = [];
        $warteschlange = [];
        $antwort = static function (array $felder = [], array $mehr = []): array {
            return $mehr + [
                'ok' => true,
                'daten' => $felder + [
                    'anliegen' => 'allgemein', 'leistung' => 'keine', 'interessent' => false, 'dringlich' => false,
                    'stimmung' => 'neutral', 'uebergabe' => false, 'uebergabe_grund' => '', 'komplex' => false,
                    'manipulation_verdacht' => false, 'zusammenfassung' => 'Testanfrage', 'fehlende_angabe' => '',
                    'antwort' => 'Vielen Dank für Ihre Nachricht. Wir melden uns bei Ihnen.',
                ],
                'usage' => ['input_tokens' => 1000, 'output_tokens' => 200],
                'stop' => 'end_turn', 'http' => 200, 'request_id' => 'req_teil_c', 'dauer_ms' => 5,
            ];
        };
        Claude::$ersatz = static function (string $modell, string $sys, string $nu, array $sch, bool $cache) use (&$aufrufe, &$warteschlange, $antwort): array {
            $aufrufe[] = ['modell' => $modell, 'system' => $sys, 'nutzer' => $nu, 'cache' => $cache];
            return array_shift($warteschlange) ?? $antwort();
        };

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: erster Lauf setzt nur die Startmarke');
        $r = $lauf();
        enthaelt('Startmarke', $r['hinweis'], 'Hinweis „Startmarke gesetzt“');
        gleich([true, 0, 0], [$r['ok'], $r['abgerufen'], $r['mit_ki']], 'Nichts eingelesen, kein Aufruf');
        gleich(0, (int) $db->query('SELECT COUNT(*) FROM nachricht')->fetchColumn(), 'Keine Nachricht gespeichert');
        gleich([(string) ($hoechste + 1), (string) ($hoechste + 1)], [Speicher::einstellung('start_uid'), Speicher::einstellung('letzte_uid')], 'start_uid = letzte_uid = uidnext − 1');
        gleich(0, $lauf()['abgerufen'], 'Zweiter Lauf: nichts Neues');
        enthaelt('zu früh', Kern::lauf('cron')['hinweis'], 'Zeitauftrag hält 50 Sekunden Abstand zum letzten Lauf');
        $sperre = fopen($datenOrdner . '/lauf.lock', 'c');
        flock($sperre, LOCK_EX);
        gleich('läuft bereits', Kern::lauf('test')['hinweis'], 'Läuft schon ein Lauf, endet der zweite sofort');
        flock($sperre, LOCK_UN);
        fclose($sperre);

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Einlesen und Regelstufe bei pausierter KI');
        Speicher::setze('start_uid', '0', 'test');
        Speicher::setze('letzte_uid', '0', 'test');
        $r1 = $lauf();
        $r2 = $lauf();
        gleich([15, $anzahlMails - 15], [$r1['abgerufen'], $r2['abgerufen']], 'Höchstens 15 Mails je Lauf, der Rest im nächsten');
        gleich($anzahlMails, (int) $db->query('SELECT COUNT(*) FROM nachricht')->fetchColumn(), 'Alle Mails gespeichert');
        gleich((string) $uidDuplikat, Speicher::einstellung('letzte_uid'), 'letzte_uid ist fortgeschrieben');
        $nachUid = static fn (int $uid): array => $zeile('SELECT * FROM nachricht WHERE uid = ?', [$uid]);
        $kategorie = static function (string $muster) use ($postfach, $nachUid): array {
            $datei = glob($postfach . '/' . $muster) ?: [];
            return $datei === [] ? [] : $nachUid((int) basename($datei[0]));
        };
        $n = $kategorie('*-newsletter.eml');
        gleich(['ohne_ki', 'newsletter'], [$n['status'] ?? '', $n['regel_kategorie'] ?? ''], 'Newsletter: ohne KI');
        $n = $kategorie('*-formular-*.eml');
        gleich(['ohne_ki', 'formular', ''], [$n['status'] ?? '', $n['regel_kategorie'] ?? '', $n['text_bereinigt'] ?? null], 'Eigene Formular-Mail: ohne KI, Text nicht gespeichert');
        $n = $kategorie('*-hinweis-eigene.eml');
        gleich(['ohne_ki', 'eigene'], [$n['status'] ?? '', $n['regel_kategorie'] ?? ''], 'Hinweis-Mail des Assistenten: ohne KI');
        $n = $kategorie('01-*.eml');
        gleich('wartet_ki', $n['status'] ?? '', 'Preisfrage wartet auf die KI');
        $wartend = (int) $wert("SELECT COUNT(*) FROM nachricht WHERE status = 'wartet_ki'");
        pruefe($wartend >= 8, 'Genug Kundenmails warten für die folgenden Schritte (' . $wartend . ')');
        gleich($wartend, (int) $wert("SELECT COUNT(*) FROM nachricht WHERE status = 'wartet_ki' AND status_grund = 'pausiert'"), 'Pausierte KI: alle wartenden mit status_grund „pausiert“');
        gleich([[], 0], [$aufrufe, (int) $wert('SELECT COUNT(*) FROM verbrauch')], 'Kein KI-Aufruf, nichts gebucht');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: eingeschaltet – höchstens ein Entwurf je Lauf');
        Speicher::setze('ki_aktiv', '1', 'test');
        $erste = $naechste();
        $warteschlange[] = $antwort([
            'anliegen' => 'preis', 'leistung' => $slugA, 'interessent' => true, 'zusammenfassung' => 'Fragt nach dem Preis.',
            'antwort' => 'Vielen Dank für Ihre Nachricht. Das kostet bei uns {{PREIS:' . $slugA . '}}. Beauftragen können Sie uns hier: {{LINK:auftrag:' . $slugA . '}}',
        ]);
        $r = $lauf();
        gleich([1, 1, 1], [count($aufrufe), $r['mit_ki'], $r['entwuerfe']], 'Genau ein Aufruf und ein Entwurf');
        gleich(Claude::MODELL_STANDARD, $aufrufe[0]['modell'] ?? '', 'Standardmodell');
        gleich(true, $aufrufe[0]['cache'] ?? null, 'Weitere Mails warten → Prompt-Cache eingeschaltet');
        gleich(Prompt::system($wissen), $aufrufe[0]['system'] ?? '', 'Systemtext aus Prompt::system');
        $n = $nachricht($erste);
        // Steht der Name im Mailtext selbst (Signatur), gehört er zum Text – geprüft wird nur, dass
        // die Kopfzeilen-Angaben nicht zusätzlich mitgehen.
        foreach (['von_adresse' => 'Absenderadresse', 'von_name' => 'Absendername'] as $feld => $was) {
            $angabe = trim((string) $n[$feld]);
            if ($angabe !== '' && !str_contains((string) $n['text_bereinigt'] . (string) $n['betreff'], $angabe)) {
                enthaelt_nicht($angabe, (string) ($aufrufe[0]['nutzer'] ?? ''), $was . ' geht nicht ans Modell');
            }
        }
        gleich('entwurf', $n['status'], 'Die älteste wartende Mail hat jetzt einen Entwurf');
        $e = $offen($erste);
        enthaelt($wertA, (string) ($e['text_final'] ?? ''), 'Preis aus der Wissensbasis eingesetzt');
        enthaelt($platzhalter['LINK:auftrag:' . $slugA], (string) ($e['text_final'] ?? ''), 'Bestell-Link eingesetzt');
        gleich(['ok', Claude::MODELL_STANDARD, Wissen::hash($wissen)], [$e['pruef_status'] ?? '', $e['modell'] ?? '', $e['wissen_hash'] ?? ''], 'Entwurf geprüft, mit Modell und Wissensstand');
        $ein = $zeile('SELECT * FROM einordnung WHERE nachricht_id = ?', [$erste]);
        gleich(['preis', $slugA, Prompt::VERSION, 0], [$ein['anliegen'] ?? '', $ein['leistung'] ?? '', $ein['prompt_version'] ?? '', (int) ($ein['aus_duplikat'] ?? -1)], 'Einordnung gespeichert');
        $buchung = $zeile('SELECT * FROM verbrauch WHERE nachricht_id = ?', [$erste]);
        gleich(['entwurf', Claude::MODELL_STANDARD, Budget::kostenMikroUsd(Claude::MODELL_STANDARD, ['input_tokens' => 1000, 'output_tokens' => 200]), 0],
            [$buchung['zweck'] ?? '', $buchung['modell'] ?? '', (int) ($buchung['kosten_mikro_usd'] ?? -1), (int) ($buchung['geschaetzt'] ?? -1)], 'Aufruf mit seinen Kosten gebucht');
        $hinweis = $ausgangMit('X-KZP-Assistent: hinweis');
        gleich(1, count($hinweis), 'Hinweis-Mail ans eigene Postfach');
        $inhalt = (string) file_get_contents($hinweis[0] ?? '/dev/null');
        enthaelt('Auto-Submitted: auto-generated', $inhalt, 'Hinweis-Mail ist als automatisch gekennzeichnet');
        enthaelt_nicht((string) $n['von_adresse'], $inhalt, 'Hinweis-Mail ohne Kundenadresse');
        enthaelt_nicht(mb_substr(trim((string) $n['text_bereinigt']), 0, 30), quoted_printable_decode($inhalt), 'Hinweis-Mail ohne Kundentext');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: gleicher Text wird nicht zweimal bezahlt');
        $duplikat = (int) $wert('SELECT id FROM nachricht WHERE text_hash = ? AND id != ?', [(string) $nachricht($erste)['text_hash'], $erste]);
        pruefe($duplikat > 0, 'Die Kopie von Mail 01 hat denselben Text-Hash');
        $r = Kern::verarbeite($duplikat);
        gleich(['ok' => true, 'grund' => 'duplikat'], $r, 'Duplikat erkannt');
        gleich(1, count($aufrufe), 'Kein zweiter Aufruf');
        gleich(1, (int) $wert('SELECT aus_duplikat FROM einordnung WHERE nachricht_id = ?', [$duplikat]), 'Einordnung als Duplikat markiert');
        gleich($offen($erste)['text_vorlage'] ?? 'a', $offen($duplikat)['text_vorlage'] ?? 'b', 'Vorlage übernommen');
        gleich('entwurf', $nachricht($duplikat)['status'], 'Duplikat hat einen Entwurf');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Limit erreicht – kein Aufruf');
        Speicher::setze('limit_aufrufe_tag', '1', 'test');
        $r = $lauf();
        gleich([1, 0], [count($aufrufe), $r['mit_ki']], 'Kein Aufruf bei erreichtem Aufruflimit');
        gleich('limit_aufrufe', (string) $nachricht($naechste())['status_grund'], 'Wartende Mail nennt den Grund');
        Speicher::setze('limit_aufrufe_tag', Speicher::STANDARD['limit_aufrufe_tag'], 'test');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Folge-Mail desselben Absenders');
        $quelle = (int) $wert("SELECT id FROM nachricht m WHERE status = 'wartet_ki' AND von_adresse != '' AND text_bereinigt != ''
            AND (SELECT COUNT(*) FROM nachricht x WHERE x.von_adresse = m.von_adresse) = 1 ORDER BY eingang_am DESC LIMIT 1");
        $q = $nachricht($quelle);
        pruefe($quelle > 0, 'Eine wartende Mail als Vorgänger gewählt');
        Speicher::setze('ki_aktiv', '0', 'test');
        $eml($uidDuplikat + 1, 'folge', (string) ($q['von_adresse'] ?? 'leer@example.org'), 'Nachtrag zu meiner Anfrage',
            "Guten Tag,\nich habe noch eine Frage: Kann ich die Unterlagen auch als PDF senden?\nDanke", $jetzt - 120);
        $r = $lauf();
        gleich(1, $r['abgerufen'], 'Folge-Mail eingelesen');
        $folge = (int) $wert('SELECT id FROM nachricht WHERE uid = ?', [$uidDuplikat + 1]);
        gleich(['zusammengefasst', 'folge_mail'], [$nachricht($quelle)['status'], $nachricht($quelle)['status_grund']], 'Frühere Mail ist „zusammengefasst“');
        gleich('wartet_ki', $nachricht($folge)['status'], 'Neue Mail wartet');
        Speicher::setze('ki_aktiv', '1', 'test');
        $vorherAufrufe = count($aufrufe);
        $r = Kern::verarbeite($folge);
        gleich([true, $vorherAufrufe + 1], [$r['ok'], count($aufrufe)], 'Ein Aufruf für die Folge-Mail');
        $bisher = (string) (json_decode((string) ($aufrufe[count($aufrufe) - 1]['nutzer'] ?? ''), true)['bisher'] ?? '');
        enthaelt(mb_substr(trim(str_replace(["\r\n", "\r"], "\n", (string) $q['text_bereinigt'])), 0, 40), $bisher, 'Text der früheren Mail steht im Verlauf (bisher)');
        enthaelt_nicht((string) $q['von_adresse'], $bisher, 'Verlauf ohne Absenderadresse');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: komplexer Fall – stärkeres Modell im nächsten Lauf');
        $zweite = $naechste();
        $warteschlange[] = $antwort(['komplex' => true, 'antwort' => 'Vielen Dank für Ihre Nachricht. Das prüfen wir.']);
        $r = $lauf();
        gleich(['wartet_ki', 'stark'], [$nachricht($zweite)['status'], $nachricht($zweite)['status_grund']], 'Komplex: wartet auf das stärkere Modell');
        gleich([Claude::MODELL_STANDARD, 0], [$offen($zweite)['modell'] ?? '', $r['entwuerfe']], 'Haiku-Entwurf liegt bereit, zählt aber noch nicht');
        $warteschlange[] = $antwort(['anliegen' => 'beschwerde', 'antwort' => 'Vielen Dank für Ihre ausführliche Nachricht. Wir sehen uns das genau an.']);
        $r = $lauf();
        gleich(Claude::MODELL_STARK, $aufrufe[count($aufrufe) - 1]['modell'] ?? '', 'Nächster Lauf ruft Sonnet');
        gleich(['entwurf', ''], [$nachricht($zweite)['status'], $nachricht($zweite)['status_grund']], 'Danach liegt der Entwurf vor');
        $e = $offen($zweite);
        gleich([Claude::MODELL_STARK, 'Vielen Dank für Ihre ausführliche Nachricht. Wir sehen uns das genau an.'], [$e['modell'] ?? '', $e['text_final'] ?? ''], 'Sonnet ersetzt die Antwort');
        gleich(['allgemein', Claude::MODELL_STANDARD], [$zeile('SELECT anliegen, modell FROM einordnung WHERE nachricht_id = ?', [$zweite])['anliegen'] ?? '',
            $zeile('SELECT modell FROM einordnung WHERE nachricht_id = ?', [$zweite])['modell'] ?? ''], 'Die Einordnung von Haiku bleibt');
        gleich(1, (int) $wert("SELECT COUNT(*) FROM entwurf WHERE nachricht_id = ? AND status = 'ueberholt'", [$zweite]), 'Haiku-Entwurf ist überholt');
        gleich(1, (int) $wert("SELECT COUNT(*) FROM verbrauch WHERE nachricht_id = ? AND zweck = 'eskalation'", [$zweite]), 'Sonnet-Aufruf mit Zweck „eskalation“ gebucht');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Fehler und Verweigerung');
        $dritte = $naechste();
        $warteschlange[] = ['ok' => false, 'fehler' => 'Keine Antwort', 'fehler_art' => 'voruebergehend', 'http' => 0, 'verlorene_versuche' => 1];
        $r = $lauf();
        gleich(['wartet_ki', 1], [$nachricht($dritte)['status'], (int) $nachricht($dritte)['versuche']], 'Vorübergehender Fehler: Versuch gezählt, wartet weiter');
        $letzter = $aufrufe[count($aufrufe) - 1];
        $schaetzung = $zeile('SELECT * FROM verbrauch WHERE nachricht_id = ? AND geschaetzt = 1', [$dritte]);
        gleich(Budget::schaetzeHoechstpreis(Claude::MODELL_STANDARD, mb_strlen($letzter['system']) + mb_strlen($letzter['nutzer']), Claude::MAX_TOKENS, $letzter['cache'] ? '1h' : ''),
            (int) ($schaetzung['kosten_mikro_usd'] ?? -1), 'Ausgebliebene Antwort: Höchstpreis geschätzt gebucht (Bauplan 7.2)');
        gleich(1, (int) $wert('SELECT COUNT(*) FROM verbrauch WHERE nachricht_id = ?', [$dritte]), 'Vorab-Buchung ersetzt, keine zweite Zeile (B9)');
        gleich(1, $r['fehler'], 'Lauf zählt den Fehler');
        $warteschlange[] = $antwort([], ['ok' => false, 'daten' => null, 'stop' => 'refusal', 'fehler' => 'abgelehnt', 'fehler_art' => 'abgelehnt']);
        $lauf();
        $e = $offen($dritte);
        gleich(['entwurf', '', 'abgelehnt'], [$nachricht($dritte)['status'], $e['text_final'] ?? 'x', $e['pruef_status'] ?? ''], 'Verweigerung: leerer Entwurf, Senden gesperrt');
        enthaelt('Bitte selbst beantworten', (string) ($e['pruef_hinweise'] ?? ''), 'Hinweis „Bitte selbst beantworten“');

        $vierte = $naechste();
        $vorherAusgang = count($ausgang());
        $warteschlange[] = ['ok' => false, 'fehler' => 'Ausgabenlimit', 'fehler_art' => 'limit_anbieter', 'http' => 400];
        $lauf();
        $monatsanfang = Budget::monatsbeginn(Budget::monatsbeginn($jetzt) + 40 * 86400);
        gleich((string) $monatsanfang, Speicher::einstellung('sperre_bis'), 'Ausgabenlimit bei Anthropic: Sperre bis zum Monatsersten');
        gleich(['wartet_ki', 'sperre', 0], [$nachricht($vierte)['status'], $nachricht($vierte)['status_grund'], (int) $nachricht($vierte)['versuche']], 'Mail wartet ohne angerechneten Versuch');
        $stoerung = $ausgangMit('X-KZP-Assistent: stoerung');
        gleich([1, $vorherAusgang + 1], [count($stoerung), count($ausgang())], 'Genau eine Störungs-Mail');
        enthaelt('Auto-Submitted: auto-generated', (string) file_get_contents($stoerung[0] ?? '/dev/null'), 'Störungs-Mail ist als automatisch gekennzeichnet');
        $vorherAufrufe = count($aufrufe);
        $lauf();
        gleich($vorherAufrufe, count($aufrufe), 'Während der Sperre kein Aufruf');
        Budget::sperre('Test', 0);

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: menschliche Antwort vor dem KI-Aufruf');
        $beantwortet = $naechste();
        $sechste = $naechste(1);
        $markiere((int) $nachricht($beantwortet)['uid']);
        $markiere((int) $nachricht($zweite)['uid']);
        $buchungenVorher = (int) $wert('SELECT COUNT(*) FROM verbrauch WHERE nachricht_id = ?', [$beantwortet]);
        $warteschlange[] = $antwort(['leistung' => $slugA, 'antwort' => 'Vielen Dank für Ihre Nachricht. Das kostet {{PREIS:' . $slugA . '}}.']);
        $lauf();
        gleich(['mensch', 'beantwortet'], [$nachricht($beantwortet)['status'], $nachricht($beantwortet)['status_grund']], '\\Answered am Original: Mail geht an den Menschen');
        gleich($buchungenVorher, (int) $wert('SELECT COUNT(*) FROM verbrauch WHERE nachricht_id = ?', [$beantwortet]), 'Für sie gab es keinen Aufruf');
        gleich('entwurf', $nachricht($sechste)['status'], 'Der Aufruf ging an die nächste Mail');
        gleich(['mensch', []], [$nachricht($zweite)['status'], $offen($zweite)], 'Auch ein offener Entwurf wird überholt, wenn jemand selbst geantwortet hat');
        $nichtGeprueft = $naechste();
        $markiere((int) $nachricht($nichtGeprueft)['uid']);
        gleich(['ok' => false, 'grund' => 'beantwortet'], Kern::verarbeite($nichtGeprueft), 'Kern::verarbeite prüft ebenfalls vorher');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Senden');
        $e = $offen($erste);
        $text = (string) $e['text_final'];
        $vorherAusgang = count($ausgang());
        $r = Kern::sende((int) $e['id'], $text . ' Zusätzlich {{PREIS:' . $slugA . '}}.', 'tester:Test', true);
        pruefe(!$r['ok'] && str_contains($r['meldung'], 'Platzhalter'), 'Platzhalter übrig → Abbruch');
        gleich(false, Kern::sende((int) $e['id'], $text, '  ', true)['ok'], 'Ohne Namen der bearbeitenden Person kein Versand');
        $mitBetrag = $text . ' Zusätzlich fallen ' . $fremd . ' € an.';
        $r = Kern::sende((int) $e['id'], $mitBetrag, 'tester:Test', false);
        pruefe(!$r['ok'] && $r['warnungen'] !== [], 'Warnung ohne Bestätigung → kein Versand, Warnungen zurück');
        gleich([$vorherAusgang, 'offen'], [count($ausgang()), $zeile('SELECT status FROM entwurf WHERE id = ?', [$e['id']])['status'] ?? ''], 'Nichts gesendet, Entwurf bleibt offen');
        $r = Kern::sende((int) $e['id'], $mitBetrag, 'tester:Test', true);
        gleich(true, $r['ok'], 'Mit Bestätigung gesendet');
        $neu = array_values(array_diff($ausgang(), $ausgangMit('X-KZP-Assistent: hinweis'), $ausgangMit('X-KZP-Assistent: stoerung')));
        gleich(1, count($neu), 'Eine Kundenmail im Ausgang');
        $mail = (string) file_get_contents($neu[0] ?? '/dev/null');
        $n = $nachricht($erste);
        enthaelt((string) ($n['antwort_an'] !== '' ? $n['antwort_an'] : $n['von_adresse']), $mail, 'An den Absender der Kundenmail');
        enthaelt('X-KZP-Assistent: freigegeben', $mail, 'Kopfzeile „freigegeben“');
        $e = $zeile('SELECT * FROM entwurf WHERE id = ?', [$e['id']]);
        gleich(['gesendet', $mitBetrag, 1, 'tester:Test'], [$e['status'], $e['gesendet_text'], (int) $e['geaendert'], $e['freigegeben_von']], 'Entwurf: gesendet, mit Text, geändert, freigegeben von');
        pruefe($e['gesendet_message_id'] !== '' && str_contains($mail, trim((string) $e['gesendet_message_id'], '<>')), 'Message-ID vorher gespeichert und in der Mail');
        gleich('gesendet', $nachricht($erste)['status'], 'Nachricht: gesendet');
        gleich(1, count(glob($postfach . '/gesendet/*.eml') ?: []), 'Kopie im Gesendet-Ordner');
        $zustand = (array) json_decode((string) @file_get_contents($postfach . '/.zustand.json'), true);
        pruefe(in_array('\\Answered', (array) ($zustand['flags'][(string) $n['uid']] ?? []), true), 'Original als beantwortet markiert');
        gleich(1, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'versand' AND nachricht_id = ?", [$erste]), 'Ereignis „versand“');
        $zweiterVersuch = Kern::sende((int) $e['id'], $mitBetrag, 'tester:Test', true);
        pruefe(!$zweiterVersuch['ok'] && count($ausgang()) === $vorherAusgang + 1, 'Zweites Senden unmöglich');

        $e = $offen($duplikat);
        Kern::$sendeErsatz = static function (array $smtp, string $an, string $roh, string &$antwortText): string {
            $antwortText = 'Verbindung nach DATA abgebrochen';
            return 'unklar';
        };
        $r = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true);
        pruefe(!$r['ok'] && str_contains($r['meldung'], 'Gesendet-Ordner'), 'Unklarer Versand: deutlicher Hinweis');
        $e = $zeile('SELECT * FROM entwurf WHERE id = ?', [$e['id']]);
        gleich(['unklar', true], [$e['status'], $e['gesendet_message_id'] !== ''], 'Entwurf „unklar“ mit gemerkter Message-ID');
        gleich(['mensch', 'versand_unklar'], [$nachricht($duplikat)['status'], $nachricht($duplikat)['status_grund']], 'Nachricht geht an den Menschen');
        gleich(false, Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true)['ok'], 'Kein automatisches zweites Senden');
        gleich('status', Kern::neuErzeugen($duplikat, 'tester:Test')['grund'], 'Nach unklarem Versand auch kein neuer Entwurf');

        $e = $offen($folge);
        Kern::$sendeErsatz = static function (array $smtp, string $an, string $roh, string &$antwortText): string {
            $antwortText = '550 Empfänger abgelehnt';
            return 'abgelehnt';
        };
        $r = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true);
        gleich(false, $r['ok'], 'Eindeutig abgelehnt: nicht gesendet');
        $e = $zeile('SELECT * FROM entwurf WHERE id = ?', [$e['id']]);
        gleich(['offen', '', 'entwurf'], [$e['status'], $e['gesendet_message_id'], $nachricht($folge)['status']], 'Entwurf ist wieder offen');
        Kern::$sendeErsatz = $sendeVorher;

        Kern::verwerfe($folge, 'kein_bedarf', 'tester:Test');
        gleich(['verworfen', 'verworfen'], [$nachricht($folge)['status'], $zeile('SELECT status FROM entwurf WHERE id = ?', [$e['id']])['status'] ?? ''], 'Verwerfen: Nachricht und Entwurf verworfen');
        Kern::uebernehme($dritte, 'tester:Test');
        gleich(['mensch', 'uebernommen', []], [$nachricht($dritte)['status'], $nachricht($dritte)['status_grund'], $offen($dritte)], 'Übernehmen: Mensch antwortet, Entwurf überholt');
        Kern::verwerfe($erste, 'kein_bedarf', 'tester:Test');
        gleich('gesendet', $nachricht($erste)['status'], 'Eine gesendete Nachricht lässt sich nicht mehr verwerfen');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: Wissensstand ändert sich bis zum Senden');
        $e = $offen($sechste);
        enthaelt($wertA, (string) ($e['text_final'] ?? ''), 'Entwurf mit Preis aus der Wissensbasis');
        $neuerPreis = $fremd . ',00 €';
        $geaendertDatei = $basis . '/teil-c-wissen-neu.json';
        file_put_contents($geaendertDatei, json_encode($geaendert, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        putenv('KZP_ASSISTENT_WISSEN=' . $geaendertDatei);
        $r = Kern::sende((int) $e['id'], (string) $e['text_final'] . ' Danke.', 'tester:Test', false);
        pruefe(!$r['ok'] && in_array('Preise haben sich seit dem Entwurf geändert', $r['warnungen'], true), 'Geänderter Text: Warnung „Preise haben sich seit dem Entwurf geändert“');
        $r = Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true);
        gleich(false, $r['ok'], 'Unveränderter Entwurf wird nicht ungelesen gesendet');
        $e = $offen($sechste);
        enthaelt($neuerPreis, (string) ($e['text_final'] ?? ''), 'sondern aus der Vorlage mit dem neuen Preis gefüllt');
        gleich(Wissen::hash($geaendert), $e['wissen_hash'] ?? '', 'Entwurf trägt den neuen Wissensstand');
        gleich(true, Kern::sende((int) $e['id'], (string) $e['text_final'], 'tester:Test', true)['ok'], 'Danach lässt er sich senden');
        putenv('KZP_ASSISTENT_WISSEN=' . $vorher['KZP_ASSISTENT_WISSEN']);

        // ----------------------------------------------------------------------------------
        abschnitt('C · Ablauf: zu alte Mails gehen an den Menschen');
        Speicher::setze('ki_aktiv', '0', 'test');
        $eml($uidDuplikat + 2, 'alt', 'spaet.gelesen@example.org', 'Alte Frage', "Guten Tag,\nwas kostet eine Abmeldung bei Ihnen?\nDanke", $t0 - 2 * 86400);
        $lauf();
        $alt = $nachUid($uidDuplikat + 2);
        gleich(['mensch', 'zu_alt'], [$alt['status'] ?? '', $alt['status_grund'] ?? ''], 'Beim Einlesen älter als 24 Stunden → Mensch');
        $nochWartend = (int) $wert("SELECT COUNT(*) FROM nachricht WHERE status = 'wartet_ki'");
        pruefe($nochWartend > 0, 'Es warten noch Mails (' . $nochWartend . ')');
        $vorherAufrufe = count($aufrufe);
        $jetzt = $t0 + 25 * 3600;
        $lauf();
        gleich(0, (int) $wert("SELECT COUNT(*) FROM nachricht WHERE status = 'wartet_ki'"), 'Nach 24 Stunden Pause wartet keine mehr');
        gleich($nochWartend, (int) $wert("SELECT COUNT(*) FROM nachricht WHERE status = 'mensch' AND status_grund = 'zu_alt' AND uid != ?", [$uidDuplikat + 2]),
            'Sie sind jetzt „zu alt“ beim Menschen');
        gleich($vorherAufrufe, count($aufrufe), 'Kein Aufruf');
        gleich(2, (int) $wert("SELECT COUNT(*) FROM ereignis WHERE art = 'aufraeumen'"), 'Aufräumen höchstens einmal täglich (zwei Tage, zwei Läufe)');
        gleich(1, count($ausgangMit('X-KZP-Assistent: hinweis')), 'Höchstens eine Hinweis-Mail in 30 Minuten');
        gleich(1, count($ausgangMit('X-KZP-Assistent: stoerung')), 'Keine weitere Störungs-Mail');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Selbsttest');
        $liste = Kern::selbsttest();
        $punkte = [];
        foreach ($liste as $punkt) {
            pruefe(array_keys($punkt) === ['punkt', 'ok', 'meldung'] && is_bool($punkt['ok']), 'Punkt „' . ($punkt['punkt'] ?? '?') . '“ hat die Form punkt/ok/meldung');
            $punkte[$punkt['punkt']] = $punkt;
        }
        foreach (['PHP', 'Bibliotheken', 'Datenordner', 'Datenbank', 'Wissensbasis', 'Manifest', 'Claude', 'Postfach', 'Mailversand', 'Login'] as $name) {
            pruefe(isset($punkte[$name]), 'Selbsttest prüft: ' . $name);
        }
        foreach (['Datenordner', 'Datenbank', 'Wissensbasis', 'Manifest', 'Claude', 'Postfach', 'Mailversand'] as $name) {
            gleich(true, $punkte[$name]['ok'] ?? null, 'Selbsttest in Ordnung: ' . $name);
        }
        enthaelt((string) count($wissen['leistungen']) . ' Leistungen', (string) ($punkte['Wissensbasis']['meldung'] ?? ''), 'Selbsttest nennt die Zahl der Leistungen');
        $ausgabe = (string) json_encode($liste, JSON_UNESCAPED_UNICODE);
        enthaelt_nicht((string) getenv('ANTHROPIC_API_KEY'), $ausgabe, 'Kein Schlüssel in der Ausgabe');
        enthaelt_nicht($datenOrdner, $ausgabe, 'Kein Pfad des Datenordners in der Ausgabe');

        // ----------------------------------------------------------------------------------
        abschnitt('C · Manifest des Deploys (Form wie scripts/assistent-bauen.mjs)');
        $manifest = new ReflectionMethod(Kern::class, 'pruefeManifest');
        $ablage = $basis . '/teil-c-ablage';
        mkdir($ablage . '/intern', 0700, true);
        file_put_contents($ablage . '/lauf.php', "<?php // Probe\n");
        file_put_contents($ablage . '/intern/Kern.php', "<?php // Probe\n");
        $schreibe = static function (array $inhalt) use ($ablage): string {
            file_put_contents($ablage . '/intern/manifest.json', json_encode($inhalt, JSON_UNESCAPED_SLASHES));
            return $ablage . '/intern/manifest.json';
        };
        $richtig = ['erzeugt' => '2026-11-22T08:00:00Z', 'vendor' => ['datei' => 'intern/vendor-0.zip', 'bytes' => 1, 'sha256' => str_repeat('0', 64)],
            'dateien' => ['lauf.php' => hash_file('sha256', $ablage . '/lauf.php'), 'intern/Kern.php' => strtoupper((string) hash_file('sha256', $ablage . '/intern/Kern.php'))]];
        gleich(null, $manifest->invoke(null, $ablage . '/intern/fehlt.json', $ablage), 'Kein Manifest (lokal): Prüfung entfällt');
        gleich(true, $manifest->invoke(null, $schreibe($richtig), $ablage), 'Alle Dateien passen (Zusatzschlüssel erzeugt/vendor zählen nicht)');
        file_put_contents($ablage . '/intern/Kern.php', "<?php // halb hochgeladen\n");
        gleich(false, $manifest->invoke(null, $schreibe($richtig), $ablage), 'Geänderte Datei → Deploy läuft');
        unlink($ablage . '/lauf.php');
        gleich(false, $manifest->invoke(null, $schreibe(['dateien' => ['lauf.php' => str_repeat('a', 64)]]), $ablage), 'Fehlende Datei → Deploy läuft');
        gleich(false, $manifest->invoke(null, $schreibe(['dateien' => ['../geheim.txt' => str_repeat('a', 64)]]), $ablage), 'Pfad mit „..“ → abgelehnt');
        gleich(false, $manifest->invoke(null, $schreibe(['dateien' => []]), $ablage), 'Leeres Manifest → abgelehnt');
    } finally {
        // Alles zurück für die folgenden Testteile.
        Claude::$ersatz = $ersatzVorher;
        Kern::$sendeErsatz = $sendeVorher;
        foreach ($vorher as $name => $alterWert) {
            if ($name === 'ANTHROPIC_API_KEY' && (!is_string($alterWert) || $alterWert === '')) {
                continue;   // Platzhalter bleibt: sonst griffe ein späterer Teil auf .env.assistent zurück
            }
            putenv($alterWert === false ? $name : $name . '=' . $alterWert);
        }
    }

    abschnitt('C · Aufgeräumt');
    gleich($vorher['KZP_ASSISTENT_DIR'], getenv('KZP_ASSISTENT_DIR'), 'Datenordner wiederhergestellt');
    gleich($vorher['KZP_ASSISTENT_POSTFACH'], getenv('KZP_ASSISTENT_POSTFACH'), 'Postfach wiederhergestellt');
    gleich($vorher['KZP_ASSISTENT_JETZT'], getenv('KZP_ASSISTENT_JETZT'), 'Uhr wiederhergestellt');
    gleich([$originalZustand, $originalGesendet], [is_file($mailsOriginal . '/.zustand.json'), is_dir($mailsOriginal . '/gesendet')],
        'tests/assistent/mails unberührt (kein .zustand.json, kein gesendet/)');
})();
