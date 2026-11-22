<?php
/**
 * Wissensbasis des KI-Assistenten.
 *
 * Die KI darf nur sagen, was die Website sagt. Deshalb erzeugt der Build aus denselben Quellen wie
 * die Seiten (config/preise.json, config/betrieb.json, lib/services.ts, lib/faq.ts) eine Datei
 * wissen.json; der Deploy legt sie neben diese Klasse. Aus ihr entstehen der System-Prompt, die
 * Platzhalter-Werte und die Vergleichslisten des Prüfers – es gibt keine zweite Preisquelle.
 *
 * SUCHREIHENFOLGE: Umgebungsvariable KZP_ASSISTENT_WISSEN (Pfad, für Tests) → intern/wissen.json
 * (Server) → tests/assistent/wissen-test.json (lokale Entwicklung ohne Build). Auf dem Server gibt
 * es den Test-Ordner nicht; dort zählt also nur die vom Deploy erzeugte Datei.
 *
 * Die Klasse liest nur. Fehlt die Datei oder ist sie unbrauchbar, liefert laden() null – der
 * Aufrufer lässt dann die KI-Schritte aus, statt mit halbem Wissen zu antworten.
 *
 * VERALTET: Scheitert beim Veröffentlichen nur der Assistenten-Schritt, geht die Website mit neuen
 * Preisen live, während hier die alte wissen.json liegen bleibt. Deshalb legt der Deploy neben die
 * Website (außerhalb von assistent/, also immer mit hochgeladen) die Datei assistent-stand.txt mit
 * dem Fingerabdruck der Wissensbasis dieses Builds; dieselbe Zahl steht in wissen.json unter
 * „fingerabdruck“. Weichen beide ab, gilt die Wissensbasis als veraltet (veraltet()), und der Prüfer
 * sperrt alle Preise. Fehlt die Datei (lokal, Tests), findet kein Abgleich statt.
 */

declare(strict_types=1);

namespace KZP\Assistent;

final class Wissen
{
    /** Größer wird eine echte Wissensbasis nie; alles darüber ist ein Versehen oder ein Angriff. */
    private const MAX_BYTES = 2_000_000;

    /** @var array{pfad: string, marke: string, daten: array<string, mixed>}|null */
    private static ?array $zwischenspeicher = null;

    /**
     * Lädt die Wissensbasis. null, wenn keine Datei da ist, sie sich nicht lesen lässt oder die
     * Pflichtteile fehlen.
     *
     * @return array<string, mixed>|null
     */
    public static function laden(): ?array
    {
        $pfad = self::pfad();
        if ($pfad === null) {
            return null;
        }
        clearstatcache(true, $pfad);
        $groesse = @filesize($pfad);
        $zeit = @filemtime($pfad);
        if ($groesse === false || $zeit === false || $groesse > self::MAX_BYTES) {
            return null;
        }
        $marke = $groesse . ':' . $zeit;
        if (self::$zwischenspeicher !== null
            && self::$zwischenspeicher['pfad'] === $pfad
            && self::$zwischenspeicher['marke'] === $marke) {
            return self::$zwischenspeicher['daten'];
        }
        $roh = @file_get_contents($pfad);
        if (!is_string($roh) || $roh === '') {
            return null;
        }
        try {
            $daten = json_decode($roh, true, 32, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return null;
        }
        if (!is_array($daten)) {
            return null;
        }
        $daten = self::ordne($daten);
        if ($daten === null) {
            return null;
        }
        self::$zwischenspeicher = ['pfad' => $pfad, 'marke' => $marke, 'daten' => $daten];
        return $daten;
    }

    /**
     * Pfad der Datei, die laden() nimmt – die erste vorhandene der Suchreihenfolge. Für den
     * Selbsttest; null, wenn es keine gibt.
     */
    public static function pfad(): ?string
    {
        $kandidaten = [];
        $umgebung = getenv('KZP_ASSISTENT_WISSEN');
        if (is_string($umgebung) && $umgebung !== '') {
            $kandidaten[] = $umgebung;
        }
        $kandidaten[] = __DIR__ . '/wissen.json';
        $kandidaten[] = dirname(__DIR__, 3) . '/tests/assistent/wissen-test.json';
        foreach ($kandidaten as $kandidat) {
            if (is_file($kandidat) && is_readable($kandidat)) {
                return $kandidat;
            }
        }
        return null;
    }

    /**
     * Fingerabdruck des Wissensstands. Steht an jeder Einordnung und jedem Entwurf, damit sich
     * erkennen lässt, ob sich Preise oder Texte seither geändert haben.
     *
     * Das Feld „stand“ zählt nicht mit: Es wechselt mit jedem Build, auch wenn inhaltlich alles
     * gleich bleibt – sonst gälte nach jedem Deploy jeder Entwurf als veraltet. Die Reihenfolge
     * der Schlüssel spielt keine Rolle, die Reihenfolge von Listen schon (sie bestimmt den Prompt).
     *
     * @param array<string, mixed> $w
     */
    public static function hash(array $w): string
    {
        unset($w['stand'], $w['fingerabdruck']);
        $json = json_encode(self::sortiert($w), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PARTIAL_OUTPUT_ON_ERROR);
        return hash('sha256', is_string($json) ? $json : serialize($w));
    }

    /**
     * true, wenn die Aktion der Wissensbasis ein Enddatum hat und dieses nach Berliner Datum
     * vorbei ist. Die statische Website stellt Preise nicht von selbst um; bis jemand sie
     * aktualisiert, dürfen die Aktionspreise deshalb in keinem Entwurf mehr stehen.
     *
     * @param array<string, mixed> $w
     */
    public static function aktionAbgelaufen(array $w): bool
    {
        $aktion = $w['aktion'] ?? null;
        if (!is_array($aktion)) {
            return false;
        }
        $bis = trim((string) ($aktion['gueltig_bis'] ?? ''));
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $bis) !== 1) {
            return false;
        }
        $heute = (new \DateTimeImmutable('@' . Umgebung::jetzt()))
            ->setTimezone(new \DateTimeZone('Europe/Berlin'))
            ->format('Y-m-d');
        // Der letzte gültige Tag gehört noch zur Aktion.
        return $heute > $bis;
    }

    /**
     * true, wenn die Website mit einem anderen Stand veröffentlicht wurde als dem dieser
     * Wissensbasis (siehe Kopfkommentar). Ohne Stand-Datei: false.
     *
     * @param array<string, mixed> $w
     */
    public static function veraltet(array $w): bool
    {
        $datei = self::standDatei();
        if ($datei === null) {
            return false;
        }
        $stand = trim((string) @file_get_contents($datei));
        if (preg_match('/^[a-f0-9]{16,128}$/', $stand) !== 1) {
            // Unlesbar oder leer: lieber kein Abgleich als ein Fehlalarm.
            return false;
        }
        $eigener = is_string($w['fingerabdruck'] ?? null) ? strtolower(trim($w['fingerabdruck'])) : '';
        return !hash_equals($stand, $eigener);
    }

    /**
     * Vergleichsstand für das Senden: der Hash und dazu, ob die Aktion abgelaufen oder die
     * Wissensbasis veraltet ist. Beides ändert den Hash nicht, verlangt aber ein neues Füllen der
     * Vorlage (Bauplan 7.5) – sonst ginge ein Aktionspreis vom 31.12. am 1.1. nach einer bloßen
     * Warnung hinaus. Nur für den Vergleich am Entwurf; die Duplikat-Suche nimmt hash().
     *
     * @param array<string, mixed> $w
     */
    public static function vergleichsStand(array $w): string
    {
        return self::hash($w) . (self::aktionAbgelaufen($w) ? ':abgelaufen' : '') . (self::veraltet($w) ? ':veraltet' : '');
    }

    /** Pfad der Stand-Datei der Website oder null (KZP_ASSISTENT_STAND für Tests). */
    private static function standDatei(): ?string
    {
        $umgebung = getenv('KZP_ASSISTENT_STAND');
        $pfad = is_string($umgebung) && $umgebung !== '' ? $umgebung : dirname(__DIR__, 2) . '/assistent-stand.txt';
        clearstatcache(true, $pfad);
        return is_file($pfad) && is_readable($pfad) ? $pfad : null;
    }

    /**
     * Slugs der Leistungen, deren Preis an der Aktion hängt (leer, wenn keine Aktion läuft).
     *
     * @param array<string, mixed> $w
     * @return string[]
     */
    public static function aktionsLeistungen(array $w): array
    {
        $aktion = $w['aktion'] ?? null;
        if (!is_array($aktion) || !is_array($aktion['leistungen'] ?? null)) {
            return [];
        }
        $slugs = [];
        foreach ($aktion['leistungen'] as $slug) {
            if (is_string($slug) && $slug !== '') {
                $slugs[] = $slug;
            }
        }
        return array_values(array_unique($slugs));
    }

    /**
     * Eine Leistung nach ihrem Slug, sonst null.
     *
     * @param array<string, mixed> $w
     * @return array<string, mixed>|null
     */
    public static function leistung(array $w, string $slug): ?array
    {
        foreach ((array) ($w['leistungen'] ?? []) as $leistung) {
            if (is_array($leistung) && ($leistung['slug'] ?? null) === $slug) {
                return $leistung;
            }
        }
        return null;
    }

    /**
     * Prüft die Pflichtteile und ergänzt fehlende optionale Teile mit leeren Werten, damit die
     * übrigen Klassen nicht an jeder Stelle nachfragen müssen.
     *
     * @param array<mixed> $d
     * @return array<string, mixed>|null
     */
    private static function ordne(array $d): ?array
    {
        if (!is_array($d['firma'] ?? null) || !is_array($d['leistungen'] ?? null)
            || !is_array($d['platzhalter'] ?? null) || !is_array($d['links'] ?? null)) {
            return null;
        }
        $leistungen = [];
        foreach ($d['leistungen'] as $leistung) {
            if (!is_array($leistung) || !is_string($leistung['slug'] ?? null) || $leistung['slug'] === '') {
                return null;
            }
            $leistungen[] = $leistung;
        }
        if ($leistungen === []) {
            return null;
        }
        $d['leistungen'] = $leistungen;

        // Platzhalter und Links müssen Text sein – sie landen unverändert in Kundenmails.
        foreach (['platzhalter', 'links'] as $teil) {
            $sauber = [];
            foreach ($d[$teil] as $schluessel => $wert) {
                if (!is_string($wert)) {
                    return null;
                }
                $sauber[(string) $schluessel] = $wert;
            }
            $d[$teil] = $sauber;
        }

        $d['stand'] = is_string($d['stand'] ?? null) ? $d['stand'] : '';
        foreach (['zusatz', 'nicht_zusagen', 'faq'] as $liste) {
            $d[$liste] = is_array($d[$liste] ?? null) ? array_values($d[$liste]) : [];
        }
        $d['zeiten'] = is_array($d['zeiten'] ?? null) ? $d['zeiten'] : [];
        $d['aktion'] = is_array($d['aktion'] ?? null) ? $d['aktion'] : null;
        return $d;
    }

    /** Sortiert Schlüssel von Objekten rekursiv; Listen behalten ihre Reihenfolge. */
    private static function sortiert(mixed $wert): mixed
    {
        if (!is_array($wert)) {
            return $wert;
        }
        $liste = array_is_list($wert);
        $neu = [];
        foreach ($wert as $schluessel => $eintrag) {
            $neu[$schluessel] = self::sortiert($eintrag);
        }
        if (!$liste) {
            ksort($neu, SORT_STRING);
        }
        return $neu;
    }
}
