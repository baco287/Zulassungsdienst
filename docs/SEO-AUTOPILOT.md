# SEO-Autopilot und SEO Center

Stand: 22.11.2026

## 1. Was der SEO-Autopilot macht

Der SEO-Autopilot prüft jeden Morgen automatisch die Live-Website
https://kfz-zulassungsprofis.de – so, wie eine Suchmaschine sie sieht. Er ruft alle Seiten
ab, vergleicht sie mit dem Vortag und mit den Sollwerten (Preise, Servicezeiten,
Firmendaten) und schreibt auf, was auffällt: kaputte Links, Seiten, die aus dem
Google-Index fallen würden, falsche oder abgelaufene Preise, alte Markennamen,
widersprüchliche Angaben und vieles mehr.

Das Ergebnis steht im **SEO Center**. Auf Wunsch kommt zusätzlich eine E-Mail.

**Wichtig:** Der Autopilot **ändert nichts** an der Website. Er liest nur, prüft und
berichtet. Jede Korrektur macht weiterhin ein Mensch (oder Claude auf Zuruf), und sie
geht über den normalen Deploy live.

## 2. Wo man das Ergebnis sieht

**SEO Center:** https://kfz-zulassungsprofis.de/seo/

- Gleicher Login wie das Analytics-Dashboard (`/analytics/`). Wer dort angemeldet ist,
  ist es in der Regel auch hier.
- In der Seitenleiste des SEO Centers führt ein Link zum Analytics-Dashboard.

| Ansicht | Zeigt |
|---|---|
| Übersicht | SEO-Status (0 bis 100), offene Punkte, Verlauf, die wichtigsten Maßnahmen |
| Hohe Priorität | alle kritischen und hohen Punkte |
| Freigabe nötig | Punkte, die eine Entscheidung brauchen (Inhalt, Preis, Recht) |
| Technisches SEO | Erreichbarkeit, Weiterleitungen, Indexierung, Titel, strukturierte Daten |
| Google Performance | Klicks und Suchanfragen aus der Search Console (erst nach Abschnitt 7) |
| Inhalte & FAQ | Texte, Preise, Marke, Werbeaussagen, FAQ |
| Optimierungsvorschläge | Chancen und konkrete Vorschläge je Punkt |
| Vorher/Nachher | Vergleich zweier Prüfläufe |
| Prüfhistorie | alle bisherigen Läufe |
| SEO-Berichte | Tages-, Wochen- und Monatsberichte zum Nachlesen |
| Automatisierung | Zeitplan, Benachrichtigungen, Stand der Verbindungen |

Steht dort „Noch kein Prüflauf vorhanden“, ist der Autopilot noch nie gelaufen:
einmal von Hand starten (Abschnitt 8).

## 3. Zeitplan

Der Autopilot läuft bei GitHub (Actions), nicht auf dem Webspace.

| Wann | Was |
|---|---|
| jeden Tag gegen 05:30 Uhr (im Sommer 06:30 Uhr) | **Tageslauf:** Technik, Titel und Beschreibungen, Preise, Marke |
| montags | **Wochenlauf** statt des Tageslaufs: alles vom Tageslauf, dazu Inhalte, FAQ, strukturierte Daten, Search Console, Chancen |
| am 1. des Monats | **Monatslauf** statt des Tages- oder Wochenlaufs: alles vom Wochenlauf, dazu der Monatsbericht |

Gut zu wissen:

- GitHub startet Zeitpläne oft einige Minuten später. Das ist normal.
- Läuft gerade ein Deploy der Website, wartet der Autopilot bis zu 25 Minuten. Während
  eines Deploys liegen alte und neue Dateien gemischt auf dem Server, eine Prüfung in
  diesem Moment würde Fehlalarme melden.
- Ein Lauf sollte nur wenige Minuten dauern; nach spätestens 30 Minuten bricht GitHub
  den Prüflauf ab.
- GitHub schaltet Zeitpläne in öffentlichen Repositories ab, wenn 60 Tage lang nichts
  am Repository geändert wurde. GitHub kündigt das per E-Mail an. Wieder einschalten:
  GitHub → **Actions** → links **SEO-Autopilot** → **Enable workflow**.

## 4. Was geprüft wird

| Bereich | Beispiele | Lauf |
|---|---|---|
| Erreichbarkeit | Seite nicht erreichbar, Serverfehler, Seite war gestern erreichbar und ist es heute nicht mehr, kaputte interne Links, kaputte Dateien (z. B. PDF) | täglich |
| Weiterleitungen | Ketten und Schleifen; Varianten mit `http://` und `www.` landen auf der richtigen Adresse; die alte Domain deutschezulassung.de leitet weiter auf die neue | täglich |
| Indexierung | robots.txt, Sitemap, ganze Website auf `noindex` (z. B. versehentlich ein Vorschau-Build live), `noindex` auf wichtigen Seiten, Seite fällt aus dem Index, auffälliger Rückgang indexierbarer Seiten, Sitemap und Indexierbarkeit passen nicht zusammen, Entwurfsseite versehentlich öffentlich, Canonical, verwaiste Seiten | täglich |
| Titel und Beschreibungen | Titel oder Beschreibung fehlt, doppelt, zu lang oder zu kurz; Hauptüberschrift fehlt oder mehrfach; Vorschaubild und -text für soziale Netzwerke | täglich |
| Preise | Preis auf der Website weicht von `config/preise.json` ab, alter Preis noch sichtbar, Aktionspreis abgelaufen oder läuft bald aus, Streichpreise, Widerspruch zwischen Servicepreis und Gebühren | täglich |
| Marke und Pflichtangaben | alter Name „DeutscheZulassung“ oder alte E-Mail-Adresse sichtbar, Platzhalter und Entwicklerhinweise im Text, Darstellungsfehler, Pflichtangaben im Impressum | täglich |
| Behördendaten | Prüfdatum der Zulassungsstellen-Daten wird zu alt (Vorwarnung, bevor die Seiten automatisch aus dem Index genommen werden) | täglich |
| Strukturierte Daten | fehlerhaftes JSON-LD, fehlende Felder, Bewertungen, Preise, FAQ, Brotkrumen, Firmendaten | wöchentlich |
| Inhalte | Aussagen mit Rechtsrisiko (wirkt wie eine Behörde, Zeitversprechen, unbelegte Zahlen, Behauptungen über Wartezeiten), abweichende Zeitangaben, fehlender Hinweis „keine Behörde“, veraltete Jahreszahlen und Stände, abgelaufene Fristen, sehr kurze Seiten, doppelte Inhalte, zwei Seiten zum selben Thema, schwache interne Verlinkung, Tippfehler | wöchentlich |
| FAQ | Widersprüche zwischen Seiten (Bearbeitungsdauer, Kennzeichen-Versand, Widerrufsfrist, Servicezeiten), FAQ passt nicht zur Widerrufsbelehrung, sehr knappe Antworten | wöchentlich |
| Google | Klicks, Impressionen, Klickrate, Position (7, 30 und 90 Tage), Suchanfragen, Gewinner und Verlierer – nur wenn die Search Console verbunden ist | wöchentlich |

Die Sollwerte für Preise und Zeiten stehen nicht im Autopiloten, sondern kommen aus der
Website selbst: Preise und Aktionszeitraum aus `config/preise.json`, Bearbeitungs-,
Versand- und Servicezeiten aus `config/betrieb.json`. Wer dort etwas ändert, muss am
Autopiloten nichts nachziehen. Nur die Firmendaten laut Impressum (Name, Anschrift,
Telefon, Register) stehen in `seo-autopilot/config.js`.

Angaben der Behörden auf den Seiten unter `/zulassungsstelle/` (deren Gebühren,
Öffnungszeiten, Zahlarten) gelten nicht als eigene Aussagen und werden nicht bemängelt.

Sind `config/preise.json` oder `config/betrieb.json` nicht lesbar, entfallen in diesem
Lauf die Abgleiche mit Preisen und Zeiten (Hinweis „Sollwerte nicht lesbar“). Offene
Punkte daraus bleiben offen und gelten nicht als behoben.

## 5. Was die Angaben bedeuten

**SEO-Status (0 bis 100):** eigene Kennzahl aus den offenen Punkten. Jeder kritische Punkt
zieht 10 ab (zusammen höchstens 30), jeder hohe 4 (höchstens 20), jeder mittlere 1
(höchstens 10), jeder niedrige 1 (höchstens 5). Ein gebündelter Punkt für viele Seiten zählt
dabei einmal; Punkte der Stufe „info“ zählen nicht. 100 heißt also: nichts offen außer reinen
Hinweisen. Der Wert ist eine grobe Orientierung – entscheidend sind die kritischen und hohen
Punkte, die im SEO Center und in den Mails daneben stehen.

**Schweregrad – wie dringend ist es?**

| Schweregrad | Bedeutung |
|---|---|
| kritisch | sofort ansehen: z. B. wichtige Seite nicht erreichbar, Seite fällt aus dem Index, falscher Preis |
| hoch | in den nächsten Tagen erledigen |
| mittel | einplanen |
| niedrig | Feinschliff, bei Gelegenheit |
| info | nur zur Kenntnis |

**Freigabestufe – wer muss zustimmen, bevor etwas geändert wird?**

| Freigabe | Bedeutung |
|---|---|
| `auto` | technische Korrektur ohne inhaltliche Entscheidung. Kann nach einem Test umgesetzt werden. |
| `manuell` | betrifft Texte oder Inhalte. Der Inhaber entscheidet. |
| `preis` | betrifft Preise. Änderung nur über `config/preise.json` mit Preisfreigabe. |
| `recht` | rechtlich heikel. Vor einer Änderung rechtlich prüfen lassen. |

„auto“ heißt nicht, dass der Autopilot es selbst behebt – er behebt nie etwas.

**Status (setzt der Autopilot selbst):** *offen* → *behoben*, sobald der Punkt bei einem
Lauf nicht mehr auftritt (Punkte aus den wöchentlichen Prüfungen frühestens beim nächsten
Wochenlauf). Taucht er später wieder auf: *wieder aufgetreten*. Störungen, die der
Autopilot im Vergleich mit dem Vortag erkennt („Seite nicht mehr erreichbar“, „Seite neu
auf noindex“, „Einbruch indexierbarer Seiten“), bleiben offen, solange der Zustand anhält.
Nur die Hinweise „Statuscode geändert“ und „Wichtige Seite geändert“ erscheinen einmal beim
Wechsel.

**Bearbeitungsstatus (setzt ihr im SEO Center):** Offen → In Prüfung → Lokal behoben →
Freigegeben, jeweils mit Notiz. Punkt anklicken, Status wählen, speichern. „Lokal
behoben“ heißt: korrigiert, aber noch nicht live. Nach dem Deploy stellt der Autopilot
den Punkt beim nächsten Lauf von selbst auf *behoben*.

## 6. Benachrichtigungen per E-Mail einschalten

Der Versand ist **aus**, bis er eingeschaltet wird.

1. GitHub öffnen → Repository → **Settings** → **Secrets and variables** → **Actions**.
2. Reiter **Variables** → **New repository variable**: Name `SEO_NOTIFY`, Wert `1` →
   **Add variable**.
3. Reiter **Secrets** → **New repository secret**: Name `SEO_NOTIFY_TO`, Wert = die
   Empfängeradresse (mehrere mit Komma trennen) → **Add secret**.

`SEO_NOTIFY_TO` ist bewusst ein **Secret**, keine Variable: Die Protokolle der Läufe sind
öffentlich, und GitHub blendet darin nur Secrets aus. Eine Variable mit diesem Namen wird
nicht gelesen. Wer sie früher angelegt hat, löscht sie unter **Variables** und legt den
Wert unter **Secrets** neu an.

Ohne `SEO_NOTIFY_TO` wird nichts verschickt. Ab dem nächsten Lauf gilt:

| E-Mail | Wann |
|---|---|
| Sofortmeldung | bei einem neuen kritischen Punkt, je Problem nur einmal |
| Tageszusammenfassung | nur wenn es etwas Neues gibt (neue kritische oder hohe Punkte, bekannte Punkte, die auf hoch oder kritisch gestiegen sind, wieder aufgetretene, behobene) |
| Wochenzusammenfassung | montags immer (fällt der 1. auf einen Montag, kommt stattdessen die Monatszusammenfassung) |
| Monatszusammenfassung | am 1. des Monats |

Mittlere und niedrige Einzelpunkte kommen nie per E-Mail. Verschickt wird über dasselbe
Postfach wie die Auftragsbestätigungen des Formulars (Secrets `SMTP_USER` und
`SMTP_PASSWORD`, bereits hinterlegt). Ausschalten: Variable `SEO_NOTIFY` löschen oder auf
`0` setzen.

Die E-Mails gehen am Ende des Prüflaufs hinaus, noch bevor das Ergebnis ins SEO Center
hochgeladen wird. So kommt eine kritische Meldung auch an, wenn das SEO Center gerade nicht
erreichbar ist. Scheitert das Hochladen auch im zweiten Versuch, kann dieselbe Meldung am
nächsten Tag noch einmal kommen.

## 7. Google Search Console verbinden (optional)

Ohne diese Verbindung arbeitet der Autopilot vollständig, nur die Ansicht „Google
Performance“ bleibt leer und „von Google indexiert“ ist unbekannt. Der Zugriff ist
**nur lesend**: Der Autopilot kann in der Search Console nichts ändern.

Diese Schritte erledigt die Geschäftsführung im eigenen Google-Konto (wie in
`docs/GOOGLE-EINRICHTUNG.md`).

1. **Property bestätigen.** Die Website muss in der Search Console bestätigt sein:
   `docs/GOOGLE-EINRICHTUNG.md`, Abschnitt 1, Schritt 1. Merken, welche Art gewählt
   wurde: **Domain-Property** (empfohlen) oder **URL-Präfix**.
2. **Google-Cloud-Projekt anlegen.** https://console.cloud.google.com → oben
   Projektauswahl → **Neues Projekt** (Name z. B. „KFZ-Zulassungsprofis SEO“).
3. **Schnittstelle einschalten.** Im Projekt: **APIs und Dienste** → **Bibliothek** →
   „Google Search Console API“ suchen → **Aktivieren**.
4. **Dienstkonto anlegen.** **APIs und Dienste** → **Anmeldedaten** → **Anmeldedaten
   erstellen** → **Dienstkonto**. Name z. B. „seo-autopilot“. Rollen werden nicht
   gebraucht → **Fertig**. Die angezeigte E-Mail-Adresse des Dienstkontos kopieren
   (endet auf `.iam.gserviceaccount.com`).
5. **Schlüssel herunterladen.** Dienstkonto anklicken → Reiter **Schlüssel** →
   **Schlüssel hinzufügen** → **Neuen Schlüssel erstellen** → **JSON**. Der Browser lädt
   eine `.json`-Datei herunter.
6. **Dienstkonto in der Search Console eintragen.** https://search.google.com/search-console
   → Property wählen → **Einstellungen** → **Nutzer und Berechtigungen** → **Nutzer
   hinzufügen** → E-Mail-Adresse des Dienstkontos einfügen, Berechtigung
   **Eingeschränkt** (reicht zum Lesen) → **Hinzufügen**.
7. **Schlüssel bei GitHub hinterlegen.** Repository → **Settings** → **Secrets and
   variables** → **Actions** → Reiter **Secrets** → **New repository secret**. Name
   `GSC_CREDENTIALS_JSON`. Die heruntergeladene Datei mit einem Texteditor öffnen, den
   **gesamten** Inhalt kopieren und als Wert einfügen → **Add secret**. (Auch der
   base64-kodierte Inhalt der Datei wird erkannt.)
8. **Nur bei URL-Präfix-Property:** Reiter **Variables** → **New repository variable**:
   Name `GSC_PROPERTY`, Wert `https://kfz-zulassungsprofis.de/` (mit Schrägstrich am
   Ende). Bei einer Domain-Property ist nichts zu tun, der Standard ist
   `sc-domain:kfz-zulassungsprofis.de`.
9. **Aufräumen.** Die heruntergeladene `.json`-Datei löschen oder im Passwortmanager
   ablegen. Sie gehört nie ins Repository, nicht in eine E-Mail und nicht in einen Chat.
10. **Prüfen.** Einen Wochenlauf von Hand starten (Abschnitt 8, Art `weekly`). Danach
    zeigt das SEO Center unter „Automatisierung“ die Search Console als verbunden und
    unter „Google Performance“ die ersten Zahlen.

Hinweise:

- Google liefert die Zahlen mit etwa drei Tagen Verzug.
- Die Domain ist erst seit dem 20.11.2026 live. Vergleiche mit der Vorperiode sind in
  den ersten Wochen deshalb nicht aussagekräftig.
- Die Property der alten Domain wird nicht abgefragt. Den Vergleich alt gegen neu
  weiterhin direkt in der Search Console ansehen (`docs/GOOGLE-EINRICHTUNG.md`).
- Zugang wieder entziehen: in der Search Console den Nutzer entfernen oder bei GitHub
  das Secret löschen.

## 8. Einen Lauf von Hand starten

1. GitHub → Repository → **Actions**.
2. Links **SEO-Autopilot** anklicken.
3. Rechts **Run workflow** → Branch `main` lassen.
4. **Art** wählen: `auto` (wie der Zeitplan), `daily`, `weekly` oder `monthly`.
5. **Run workflow** bestätigen.

Nach einigen Minuten steht ein grüner Haken am Lauf. Ein Klick darauf zeigt eine kurze
Zusammenfassung in Zahlen (Status, offene Punkte, neu, behoben). Die Einzelheiten stehen
nur im SEO Center, weil die GitHub-Protokolle öffentlich einsehbar sind.

## 9. Lokal ansehen und testen

Für den Alltag nicht nötig. Am einfachsten Claude bitten: „Starte das SEO Center lokal.“

| Befehl (im Projektordner) | Wirkung |
|---|---|
| `npm run seo:center` | SEO Center auf dem eigenen Rechner: http://localhost:3500/seo/ (ohne Login, nur von diesem Rechner erreichbar) |
| `npm run seo:daily` | Tageslauf vom eigenen Rechner gegen die Live-Website. Das Ergebnis bleibt lokal in `seo-autopilot/data/`. |
| `npm run seo:weekly` | Wochenlauf, sonst wie oben |
| `node seo-autopilot/bin/sync.js pull` | Stand des SEO Centers vom Server nach `seo-autopilot/data/` holen (Login als Umgebungsvariablen `SEO_CENTER_USER` und `SEO_CENTER_PASSWORD`). Ohne diesen Schritt ist ein lokaler Lauf ein Erstlauf, und alles gilt als neu. |
| `npm run build`, danach `node seo-autopilot/bin/local-check.js` | Vorher/Nachher vor einem Deploy: prüft den lokalen Build gegen die offenen Punkte der Live-Website in `seo-autopilot/data/` (vorher `sync.js pull`). Das Ergebnis steht im lokalen SEO Center unter „Vorher/Nachher“. |
| `node seo-autopilot/bin/preview-mails.js` | Vorschau der E-Mails als Textdateien in `seo-autopilot/data/previews/`. Verschickt nichts. |
| `npm run seo:test` | automatische Tests des Autopiloten (ohne Internet) |

Ein lokaler Lauf verändert weder die Website noch den Stand im SEO Center auf dem
Server, und er verschickt keine E-Mails (solange `SEO_NOTIFY` lokal nicht gesetzt ist).
Nur `node seo-autopilot/bin/sync.js push` ersetzt den Stand auf dem Server. Das macht im
Normalbetrieb allein der Zeitplan. Technische Einzelheiten: `seo-autopilot/README.md`.

## 10. Wo die Daten liegen und Datenschutz

- **Auf dem Webspace:** im Ordner `seo-daten` in der Kontowurzel, neben dem Ordner der
  Domain – wie `analytics-daten` und `formular-protokoll`. Der Ordner ist per
  Internetadresse nicht erreichbar. Als zweite Sicherung legt das SEO Center darin eine
  `.htaccess` an, die jeden Abruf sperrt. Nur das SEO Center liefert daraus aus, und nur
  nach dem Login. Der Deploy der Website fasst den Ordner nicht an.
- **Bei GitHub:** nur während eines Laufs auf dem Rechner von GitHub, danach ist alles
  weg. Es wird nichts als Artefakt gespeichert und nichts ins Repository geschrieben.
- **Lokal:** `seo-autopilot/data/`, von Git ausgeschlossen.
- **Nie im Repository.** Das Repository ist öffentlich. Befunde, Berichte und
  Search-Console-Zahlen dürfen dort nicht landen. Auch die Protokolle der Läufe sind
  öffentlich, deshalb stehen dort nur Zahlen.

**Datenschutz:** Der Autopilot verarbeitet nur, was ohnehin öffentlich auf der eigenen
Website steht, und – falls verbunden – die Zahlen aus der Search Console (Suchanfragen,
Klicks, Positionen; von Google zusammengefasst, ohne Bezug zu einzelnen Personen). Er
erfasst keine Besucher, setzt keine Cookies und liest keine Auftrags- oder
Formulardaten. In die Notizen im SEO Center bitte keine Kundendaten schreiben.

## 11. Was bei Fehlern passiert

| Was man sieht | Was es bedeutet | Was zu tun ist |
|---|---|---|
| Roter Lauf bei GitHub (Actions), dazu eine E-Mail von GitHub an das Konto, das den Zeitplan zuletzt geändert hat | Der Lauf ist abgebrochen. Bricht der Prüflauf selbst ab, bleibt im SEO Center der Stand vom letzten erfolgreichen Lauf. Scheitert nur das Hochladen (auch im zweiten Versuch), kann das SEO Center einen Teil des neuen Laufs zeigen; Befundstand und Vergleichsbasis kommen immer zuerst, welche Dateien fehlen, steht im Protokoll unter „Stand hochladen“. | Meist nichts: Am nächsten Morgen läuft er wieder. Bei wiederholtem Fehler Claude das Protokoll ansehen lassen. |
| Meldung „es fehlen die Secrets ANALYTICS_USER …“ | Der Login für `/analytics/` und `/seo/` ist bei GitHub nicht hinterlegt. | Secrets anlegen (Passwort mindestens 10 Zeichen, siehe `docs/TRACKING.md`, Einrichtung). Dann die Website neu deployen: GitHub → **Actions** → links **Build & Deploy** → **Run workflow** → Branch `main` → **Run workflow**. Erst nach dem grünen Haken den SEO-Lauf von Hand starten (Abschnitt 8). Vorher fehlt auf dem Webspace die Login-Datei, und der Lauf endet rot (HTTP 503, nächste Zeile). |
| Roter Lauf mit „SEO Center nicht eingerichtet oder nicht verfügbar (HTTP 503)“ | Die Secrets sind bei GitHub hinterlegt, auf dem Webspace fehlt aber die Login-Datei. Sie entsteht nur beim Deploy der Website. | Website neu deployen (Klickweg wie in der Zeile darüber), nach dem grünen Haken den Lauf von Hand starten. |
| Hinweis „Lauf unsicher“ im SEO Center | Der Lauf wich stark vom Vortag ab (z. B. Server kurz nicht erreichbar). Der Autopilot traut dem Ergebnis nicht: Er schließt nichts als behoben und schickt keine Sofortmeldung. Ist auch der nächste Lauf unsicher, kommt einmal ein Hinweis per E-Mail. | Nächsten Lauf abwarten oder einen Lauf von Hand starten. |
| Warnung „Nach 25 Minuten läuft immer noch ein Deploy“ | Der Autopilot hat trotz laufendem Deploy geprüft. Einzelne Punkte können Fehlalarme sein. | Verschwinden beim nächsten Lauf von selbst. |
| SEO Center: „Noch kein Prüflauf vorhanden“ | Es gibt noch keine Daten. | Lauf von Hand starten (Abschnitt 8). |
| SEO Center: Punkt „Prüfmodul … ist ausgefallen“ (hoch) | Ein Teil der Prüfungen ist wegen eines Programmfehlers ausgefallen. Dessen Regeln wurden in diesem Lauf nicht geprüft; ihre offenen Punkte bleiben unverändert stehen. | Claude den Fehler beheben lassen (die Fehlermeldung steht im Punkt). Der Punkt verschwindet beim nächsten Lauf, in dem genau dieses Modul wieder fehlerfrei läuft – bei den wöchentlichen Prüfungen (Inhalte, FAQ, strukturierte Daten) also frühestens beim nächsten Wochenlauf. |
| SEO Center: „Zugang … noch nicht eingerichtet“ | Die Login-Daten fehlten beim letzten Deploy. | wie oben: Secrets anlegen, dann die Website neu deployen (Klickweg in der Zeile „es fehlen die Secrets“). |
| SEO Center: Login wird abgelehnt oder „Zu viele Fehlversuche“ | falsches Passwort; nach zehn Fehlversuchen von derselben Internetadresse 15 Minuten Sperre, für `/seo/` und `/analytics/` gemeinsam | 15 Minuten warten, dann mit den richtigen Daten anmelden |
| Seit Tagen kein neuer Lauf | GitHub hat den Zeitplan abgeschaltet (60 Tage ohne Änderung am Repository) | Actions → SEO-Autopilot → **Enable workflow** |
| Keine E-Mails | Variable `SEO_NOTIFY` oder Secret `SEO_NOTIFY_TO` fehlt (eine Variable `SEO_NOTIFY_TO` zählt nicht), oder es gab nichts Neues | Abschnitt 6 prüfen; im SEO Center unter „Automatisierung“ steht, was vorbereitet und was gesendet wurde |

## 12. Grenzen

- **Prüft nur, ändert nichts.** Kein automatisches Korrigieren, kein Deploy, keine
  Änderung an Preisen oder Texten.
- **Kein Ersatz für Rechtsberatung.** Punkte mit Freigabe `recht` sind Hinweise, was
  jemand mit Fachkenntnis ansehen sollte – keine rechtliche Bewertung. Dass der
  Autopilot nichts meldet, heißt nicht, dass ein Text rechtlich in Ordnung ist.
- **Regeln, kein Verständnis.** Die Prüfungen arbeiten mit festen Mustern. Sie können
  etwas übersehen und gelegentlich falsch anschlagen. Fehlalarme bitte mit Notiz im
  SEO Center vermerken, dann wird die Regel nachgeschärft.
- **„Indexierbar“ ist nicht „indexiert“.** Der Autopilot prüft, ob Google eine Seite
  aufnehmen *darf*. Ob Google sie aufgenommen hat, zeigt nur die Search Console.
- **Behördendaten werden nicht inhaltlich geprüft.** Ob eine Adresse oder Öffnungszeit
  einer Zulassungsstelle noch stimmt, weiß der Autopilot nicht. Er warnt nur, wenn das
  Prüfdatum zu alt wird.
- **Kein Funktionstest.** Auftragsformular, Mailversand an Kunden und Bezahlung werden
  nicht ausprobiert.
- **Nur die eigene Website.** Keine Beobachtung von Mitbewerbern, keine Rangmessung
  außerhalb der Search Console.

## 13. Einstellungen bei GitHub im Überblick

GitHub → Repository → **Settings** → **Secrets and variables** → **Actions**. Secrets:
Reiter **Secrets** → **New repository secret** → Name und Wert → **Add secret** (der Wert
ist danach nicht mehr lesbar, nur überschreibbar). Variablen: Reiter **Variables** → **New
repository variable** → Name und Wert → **Add variable**.

| Name | Reiter | Nötig? | Zweck |
|---|---|---|---|
| `ANALYTICS_USER`, `ANALYTICS_PASSWORD` | Secrets | ja (vorhanden) | Login für `/analytics/` und `/seo/`. Mit diesem Login legt der Autopilot auch sein Ergebnis ab. |
| `SMTP_USER`, `SMTP_PASSWORD` | Secrets | für E-Mails (vorhanden) | Postfach, über das verschickt wird |
| `SMTP_HOST`, `SMTP_PORT` | Secrets | nein | nur bei abweichendem Mailserver; sonst gilt derselbe Standard wie beim Formular |
| `SEO_NOTIFY` | Variables | nein | `1` schaltet E-Mails ein |
| `SEO_NOTIFY_TO` | Secrets | für E-Mails | Empfängeradresse(n), mehrere mit Komma. Secret, damit die Adresse nicht im öffentlichen Protokoll steht |
| `GSC_CREDENTIALS_JSON` | Secrets | nein | Schlüssel des Google-Dienstkontos (Abschnitt 7) |
| `GSC_PROPERTY` | Variables | nein | nur bei URL-Präfix-Property |
| `SEO_CENTER_URL` | Variables | nein | nur falls das SEO Center unter einer anderen Adresse liegt |

Nicht angelegte Einstellungen stören nicht: Dann gelten die Standardwerte.

## 14. Wo was liegt (für die Technik)

| Teil | Datei |
|---|---|
| Zeitplan | `.github/workflows/seo-autopilot.yml` |
| Prüflogik, Regeln, Tests | `seo-autopilot/` (Kurzdoku: `seo-autopilot/README.md`) |
| Oberfläche | `public/seo/center.html`, ausgeliefert über `public/seo/index.php` nach dem Login |
| Daten-Schnittstelle auf dem Webspace | `public/seo/daten.php` |
| Login | `public/api/analytics-lib.php` (gemeinsam mit dem Analytics-Dashboard) |
| Sollwerte | `config/preise.json`, `config/betrieb.json` |

Ablauf eines Laufs: Stand vom Webspace holen → Live-Website prüfen, gegebenenfalls E-Mail
→ Ergebnis hochladen (bei einem Fehler nach zwei Minuten ein zweiter Versuch). Der
Webspace führt dabei kein Programm des Autopiloten aus, er bewahrt nur die Daten auf und
zeigt sie an.

## 15. Erste Inbetriebnahme (einmalig)

1. Den Stand mit dem SEO-Autopiloten nach `main` übernehmen. Der normale Deploy bringt
   das SEO Center unter `/seo/` auf den Webspace.
2. https://kfz-zulassungsprofis.de/seo/ öffnen und anmelden. Es erscheint „Noch kein
   Prüflauf vorhanden“.
3. Einen Lauf von Hand starten (Abschnitt 8, Art `weekly` für die volle Prüfung).
4. SEO Center neu laden und die Punkte unter „Hohe Priorität“ durchgehen.
5. Wenn gewünscht: E-Mails einschalten (Abschnitt 6) und die Search Console verbinden
   (Abschnitt 7).

Ab dann läuft alles von selbst nach Zeitplan.
