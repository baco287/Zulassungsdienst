# KI-Assistent für E-Mail – Betrieb

Diese Anleitung ist für alle, die mit dem Assistenten arbeiten. Sie kommt ohne
Technik-Wissen aus. Wie der Assistent gebaut ist, steht in `BAUPLAN.md`.

**Zugangsdaten stehen hier bewusst nicht** – das Repository ist öffentlich.

## 1. Was der Assistent tut – und was nicht

Der Assistent liest neue E-Mails im Postfach `info@kfz-zulassungsprofis.de`, ordnet sie ein
und schreibt für echte Kundenfragen einen **Antwort-Entwurf**.

- **Die KI schreibt, ein Mensch sendet.** Es geht nie eine Mail von selbst an Kunden. Jede
  Antwort wird im Admin-Bereich gelesen, bei Bedarf geändert und per Klick gesendet.
- **Die KI sagt nur, was die Website sagt.** Preise, Unterlagenlisten, Zeiten und Links kommen
  aus einer Wissensbasis, die bei jedem Veröffentlichen der Website neu aus den Website-Daten
  entsteht. Soll der Assistent etwas anderes sagen, wird die Website geändert und neu
  veröffentlicht – nicht der Assistent.
- **Das Postfach bleibt, wie es ist.** Der Assistent liest nur. Er verschiebt nichts, löscht
  nichts und markiert nichts als gelesen. Nur nach einem Versand aus dem Admin-Bereich legt er
  die Kopie in „Gesendet“ ab und markiert die Kundenmail als beantwortet.
- **Vieles kostet nichts.** Formular-Mails von der Website, Newsletter, automatische
  Antworten, Unzustellbarkeitsmeldungen, bereits beantwortete Mails und ganz kurze Antworten wie
  „Danke“ oder „Ja, bitte“ sortiert eine Regelstufe ohne KI aus.
- **Heikles geht an einen Menschen.** Bei Beschwerden, Fragen zum Stand eines Auftrags,
  verärgertem Ton oder dem Versuch, der KI Zusagen abzuringen, steht am Entwurf deutlich
  „Bitte selbst prüfen“ oder es gibt gar keinen Entwurf.
- **Anhänge sieht die KI nie** – auch angehängte Textdateien nicht. Sie erfährt nur, dass ein Bild
  oder PDF dabei ist. Kontonummern, Fahrzeug-Identifizierungsnummern und lange Ziffernfolgen
  werden vorher unkenntlich gemacht; Name und E-Mail-Adresse des Absenders werden nicht
  mitgeschickt, Grußformel und Signatur am Ende der Mail (Name, Anschrift, Telefon) entfernt der
  Assistent vorher, soweit er sie erkennt. Deshalb fehlen sie auch in der Ansicht im Admin-Bereich –
  eine Rückrufnummer aus der Signatur steht in der Mail im Mailprogramm.

## 2. Der Admin-Bereich

Adresse: **https://kfz-zulassungsprofis.de/assistent/**

Der Login ist derselbe wie beim Analytics-Dashboard (`/analytics/`). Er schützt alle Kundenmails
und den Versand vom Firmenpostfach. **Das Passwort (GitHub-Secret `ANALYTICS_PASSWORD`) muss
zufällig erzeugt sein und mindestens 16 Zeichen haben** – etwa aus einem Passwort-Manager. Nach
zehn Fehlversuchen von einem Anschluss ist er 15 Minuten gesperrt; sehr viele Fehlversuche von
verschiedenen Adressen melden sich als Störungs-Mail. (Technisch verlangt der Assistent heute
mindestens 10 Zeichen; die Grenze wird erst angehoben, wenn das Secret geändert ist, sonst wären
Admin-Bereich und Abruf gesperrt.) Beim ersten Öffnen fragt die Seite einmal nach Ihrem Namen. Er wird im Browser gemerkt und bei jedem Versand mitgespeichert –
so bleibt nachvollziehbar, wer eine Antwort freigegeben hat. Ohne Namen lässt sich nichts senden.

Oben steht immer der Stand – zum Beispiel „KI aktiv – letzter Abruf vor 3 Minuten“, „KI
pausiert“ oder „Gesperrt: …“ mit einem Satz, was zu tun ist. Daneben der Schalter **„KI an“ /
„KI aus“**, der Verbrauch heute und im Monat gegen das Limit und die Zahl der wartenden Entwürfe.
Ist die KI nach einem Fehler beim Anbieter gesperrt, erscheint dort zusätzlich der Knopf
**„Sperre aufheben“**. Darunter drei Reiter:

| Reiter | Inhalt |
|---|---|
| **Posteingang** | Liste der Mails, umschaltbar zwischen „Zu erledigen“, „Alle“ und „Ohne KI aussortiert“. Ein Klick zeigt links die Kundenmail, rechts den Entwurf. Unter „Zu erledigen“ stehen auch Mails, die die KI nicht mehr übernimmt (älter als 24 Stunden) – eine Woche lang, danach nur noch unter „Alle“. |
| **Verbrauch** | Kosten je Tag und Monat, Zahl der Aufrufe, Kosten je bearbeiteter Mail und je Aufruf, Aufteilung nach Modell und Zweck. |
| **Einstellungen** | „Kosten begrenzen“ (Limits), „Arbeitsweise“ (Schalter für das stärkere Modell und die Hinweis-Mail), „Gruß und Absender“, „Aufbewahrung“, „Absenderregeln“, „Abruf und Selbsttest“ (Knöpfe „Jetzt abrufen“ und „Selbsttest starten“) und „Daten eines Kunden löschen“. |

## 3. Einschalten

Der Assistent wird **pausiert** ausgeliefert. Er liest und sortiert dann schon Mails, ruft die KI
aber nicht auf – es entstehen keine Kosten.

1. Admin-Bereich öffnen, anmelden, Namen eintragen.
2. **Einstellungen → Selbsttest** starten. Er prüft kostenlos: Server, Speicher, Wissensbasis,
   Claude-Schlüssel, Postfach (Anmeldung, Zahl der Mails, Gesendet-Ordner) und Mailversand.
   Angezeigt werden nur Ergebnisse, keine Inhalte und keine Zugangsdaten.
3. Sind alle Punkte grün: oben den Schalter auf **„KI an“** stellen und die Rückfrage
   „KI einschalten?“ bestätigen. Der Stand zeigt danach „KI aktiv“.
4. Ab jetzt bekommt jede neue Kundenfrage einen Entwurf. Mails, die schon vor dem ersten Abruf
   im Postfach lagen, fasst der Assistent nicht an („ab jetzt“).

Ist ein Punkt im Selbsttest rot, steht daneben, was fehlt. Typisch beim ersten Mal: Der
Claude-Schlüssel ist noch nicht hinterlegt (siehe Abschnitt 8).

## 4. Tägliche Arbeit

Liegen neue Entwürfe bereit, kommt eine kurze Hinweis-Mail ins eigene Postfach
(„KI-Assistent: … Antwort-Entwürfe warten“) – höchstens eine je halbe Stunde und ohne
Kundeninhalt. Sie lässt sich in den Einstellungen abschalten.

Im **Posteingang** je Mail:

1. **Kundenmail lesen** (links). Dort steht genau der Text, den auch die KI bekommen hat.
2. **Entwurf lesen** (rechts). Der Text lässt sich frei ändern. Darunter zeigt die Vorschau die
   fertige Mail mit Anrede, Gruß und Fußzeile.
3. **Prüfhinweise beachten.** Eine Warnung erscheint zum Beispiel, wenn im Text ein Betrag, ein
   Link, eine Kontonummer oder eine Telefonnummer steht, die die Website nicht kennt, eine Zusage
   wie „noch heute“ – oder wenn sich vor dem Senden nicht prüfen ließ, ob schon jemand aus dem
   Mailprogramm geantwortet hat. Mit einer Warnung fragt „Senden“ noch einmal nach („Trotzdem
   senden?“). „Bitte selbst prüfen“ steht bei Beschwerden, Fragen zum Auftragsstand, verärgertem
   Ton und Manipulationsversuchen.
   **Rote Marke „Antwort an andere Adresse“:** Die Mail nennt eine Antwortadresse, die nicht der
   Absender ist. Absender lassen sich fälschen – vor dem Senden prüfen, ob die Adresse wirklich zum
   Kunden gehört (im Zweifel im Mailprogramm an den Absender antworten).
4. Entscheiden:
   - **Senden** – die Antwort geht vom Firmenpostfach an den Kunden und liegt danach wie
     gewohnt im Ordner „Gesendet“; die Kundenmail ist als beantwortet markiert.
   - **Ich antworte selbst** – Sie beantworten die Mail wie bisher im Mailprogramm. Das gilt auch
     für Mails „zu alt für die KI“; danach verschwinden sie aus „Zu erledigen“.
   - **Neu erzeugen** – die KI schreibt einen neuen Entwurf (kostet einen weiteren Aufruf).
     Gibt es noch keinen Entwurf – etwa bei einer Mail, die ohne KI aussortiert wurde oder zu
     lange gewartet hat –, heißt der Knopf **„Entwurf erzeugen“**.
   - **Verwerfen** – keine Antwort nötig (zum Beispiel Werbung). Ohne Entwurf heißt der Knopf
     **„Keine Antwort nötig“**.

Gut zu wissen:

- Haben sich seit dem Entwurf die Preise der Website geändert, füllt der Assistent einen
  unveränderten Entwurf beim Klick auf „Senden“ neu und zeigt ihn noch einmal an – nichts geht
  ungelesen hinaus. Dann bitte erneut lesen und senden.
- Beantworten Sie eine Mail direkt im Mailprogramm, merkt der Assistent das beim nächsten Abruf
  und zieht seinen Entwurf zurück. Legen Sie die Mail danach gleich in einem anderen Ordner ab,
  kann er das nicht mehr sehen: Der Entwurf zeigt dann „Nicht mehr im Posteingang“, und „Senden“
  fragt ausdrücklich nach. Dasselbe gilt, wenn das Postfach beim Senden nicht erreichbar ist. Bitte
  dann im Mailprogramm nachsehen, ob schon geantwortet wurde.
- Schreibt ein Kunde erneut, bevor seine erste Mail beantwortet ist, fasst der Assistent beide
  Mails zusammen und macht einen gemeinsamen Entwurf – aber nur, wenn die Antwort an dieselbe
  Adresse ginge. Die frühere Mail steht in der Ansicht unter der neueren. Wird die neuere
  verworfen oder selbst beantwortet, erscheint die frühere wieder unter „Zu erledigen“
  („Noch offen – bitte beantworten“).
- Formular-Aufträge von der Website erscheinen als „Auftrag über die Website“ – ohne Entwurf.
- In den Einstellungen lassen sich **Absenderregeln** anlegen: Mails einer Adresse oder einer
  ganzen Domain „ignorieren“ oder „immer an einen Menschen“ geben. Letzteres ist auch der Weg,
  wenn ein Kunde der KI-Bearbeitung widerspricht. Die Regel gilt sofort, auch für Mails, die schon
  warten; „Entwurf erzeugen“ gibt es für solche Absender nicht. In die Notiz keine Namen oder
  Inhalte schreiben.

## 5. Kosten, Limits und Pause

**Kosten:** Der Assistent arbeitet mit Claude Haiku 5.5. Gemessen am 22.11.2026 mit den
Beispiel-Mails: Eine bearbeitete Mail kostet **rund 0,0007 US-Dollar**, wenn innerhalb der letzten
Stunde schon ein Aufruf lief (der lange, immer gleiche Anweisungstext liegt dann eine Stunde im
Zwischenspeicher von Anthropic), sonst **rund 0,002 bis 0,004 US-Dollar**. Ein Aufruf dauert meist
2 bis 5 Sekunden, selten bis 13. Geschätzt im Monat (Haiku): bei 2 Kundenfragen je Werktag rund
0,10, bei 10 rund 0,50, bei 40 rund 0,75 US-Dollar. Stuft Haiku eine Mail als schwierig ein und
muss nicht ohnehin ein Mensch übernehmen (Beschwerde, Übergabe, verärgerter Ton), schreibt
zusätzlich Claude Sonnet 5.5 den Entwurf; ein solcher Aufruf kostet rund 0,05 US-Dollar (im
letzten Test traf das 0 bis 1 von 15 Mails). Bei 40 Kundenfragen je Werktag und 5 % solcher Fälle
kämen gut 2 US-Dollar im Monat dazu. Das lässt sich in den Einstellungen abschalten („Stärkeres
Modell bei schwierigen Fällen“). Der Reiter „Verbrauch“ zeigt die tatsächlichen Zahlen – jede
Antwort der KI wird mit ihren Kosten gebucht.

**Eigene Limits** (in den Einstellungen änderbar; die Geldlimits von 0 bis 50 US-Dollar – das
Claude-Budget teilt sich der Assistent mit anderen Projekten):

| Limit | Auslieferung |
|---|---|
| Monatslimit | 10 US-Dollar |
| Tageslimit | 1 US-Dollar |
| KI-Aufrufe je Tag | 150 |
| KI-Aufrufe je Absender und Tag | 6 |

Ist ein Limit erreicht, ruft der Assistent die KI nicht mehr auf. Die Mails bleiben in der Liste
und warten. Wartet eine Mail länger als 24 Stunden, übergibt der Assistent sie an einen Menschen:
Sie steht dann als „Zu alt für die KI – selbst antworten“ eine Woche lang unter „Zu erledigen“.

**Pause:** Der Schalter oben („KI aus“) stellt auf „KI pausiert“. Mails werden weiter eingelesen und
sortiert, aber nicht mehr an die KI gegeben. Nach dem Wiedereinschalten holt der Assistent nur
die Mails der letzten 24 Stunden nach; ältere übergibt er an einen Menschen – auf eine Mail von
vorgestern soll nicht erst heute ein Entwurf entstehen.

## 6. Not-Aus

Zwei Wege, beide wirken sofort:

1. **Schalter** im Admin-Bereich auf „KI aus“ (der Stand zeigt dann „KI pausiert“).
2. **Datei `STOP`** im Datenordner des Assistenten anlegen (eine leere Datei genügt). Der
   Datenordner heißt `assistent-daten` und liegt auf dem Webspace neben dem Ordner der Domain,
   also außerhalb der Website. Anlegen lässt sich die Datei mit einem FTP-Programm oder über
   den Dateimanager im all-inkl-KAS. Dieser Weg funktioniert auch, wenn der Admin-Bereich
   einmal nicht erreichbar ist. Datei wieder löschen = Not-Aus aufgehoben.

Beides stoppt die KI-Aufrufe. Das Einlesen der Mails in die Liste läuft weiter und kostet
nichts. Soll auch das ruhen, den Abruf abschalten (Abschnitt 9).

## 7. Wenn etwas hakt

Bei den wichtigen Störungen schickt der Assistent von selbst eine kurze Mail ans eigene
Postfach (höchstens eine je Ursache in zwölf Stunden).

| Anzeige | Was es bedeutet | Was zu tun ist |
|---|---|---|
| **Versand unklar** – „Bitte im Gesendet-Ordner nachsehen“ (rotes Band oben, rote Marke an der Mail) | Die Verbindung zum Mailserver ist genau beim Absenden abgebrochen. Es steht nicht fest, ob die Mail rausging. | Im Mailprogramm im Ordner „Gesendet“ nachsehen. Liegt die Antwort dort oder hat der Kunde sie bekommen: erledigt. Wenn nicht: die Mail im Mailprogramm selbst beantworten. Danach an der Mail **„Ich habe nachgesehen – erledigt“** klicken. Der Assistent sendet in diesem Fall **nie** von selbst ein zweites Mal, auch keinen neuen Entwurf. |
| **Limit erreicht** (Tag, Monat, Aufrufe oder Absender) | Das eigene Limit ist ausgeschöpft. Neue Mails warten ohne Entwurf. | Abwarten (Tageslimits gelten bis Mitternacht, das Monatslimit bis zum Monatsersten) oder das Limit in den Einstellungen anheben. Dringende Mails selbst beantworten. Kommt das öfter vor: im Reiter „Verbrauch“ nachsehen, woher die Aufrufe stammen. |
| **Schlüssel abgelehnt** | Anthropic nimmt den Claude-Schlüssel nicht an (gelöscht, gesperrt oder falsch hinterlegt). Der Assistent sperrt die KI für sechs Stunden. | Schlüssel tauschen (Abschnitt 8), dann oben **„Sperre aufheben“**. Bis dahin Mails selbst beantworten. |
| **Ausgabenlimit bei Anthropic erreicht** | Das Monatslimit im Anthropic-Konto ist ausgeschöpft. Der Assistent sperrt die KI bis zum Monatsersten. | In der Anthropic-Console prüfen, ob das Limit des Arbeitsbereichs passt (Abschnitt 8). Ist es erhöht, oben **„Sperre aufheben“** – sonst bleibt die KI bis zum Monatsersten gesperrt. |
| **Postfach nicht erreichbar** | Der Assistent konnte sich mehrfach nicht am Postfach anmelden. | Prüfen, ob das Postfach-Passwort geändert wurde. Dann müssen die hinterlegten Zugangsdaten angepasst und die Website neu veröffentlicht werden. |
| **Aktionspreis abgelaufen** | Eine befristete Preisaktion ist vorbei, die Website zeigt aber noch den Aktionspreis. Ein Entwurf von vorher wird beim Senden neu gefüllt und abgewiesen. | Preise der Website aktualisieren und neu veröffentlichen (Abschnitt 11). |
| **Wissensbasis veraltet** (Stand oben, Selbsttest, Störungs-Mail) | Die Website wurde veröffentlicht, der Assistent aber nicht mit aktualisiert (sein Schritt beim Veröffentlichen ist gescheitert). Entwürfe mit Preisen werden abgewiesen. | Im letzten GitHub-Ablauf „Build & Deploy“ den Schritt „KI-Assistent prüfen …“ ansehen, Ursache beheben, neu veröffentlichen. Preisfragen bis dahin selbst beantworten. |
| **Nicht mehr im Posteingang** / „Konnte nicht prüfen, ob schon jemand geantwortet hat“ | Die Mail wurde im Mailprogramm verschoben (oft nach einer Antwort) oder das Postfach war beim Senden nicht erreichbar. | Im Mailprogramm nachsehen, ob schon geantwortet wurde. Nur dann „Trotzdem senden“. |
| **Antwort an andere Adresse** (rote Marke) | Die Antwortadresse der Mail ist nicht der Absender – bei gefälschten Mails die Adresse des Fälschers. | Prüfen, ob die Adresse zum Kunden gehört; im Zweifel im Mailprogramm an den Absender antworten. |
| **Veröffentlichen unvollständig** (Störungs-Mail, Abruf bei GitHub rot mit HTTP 503) | Die Dateien des Assistenten passen seit über 30 Minuten nicht zusammen – ein Veröffentlichen ist mittendrin abgebrochen. Es werden keine Mails eingelesen. | Bei GitHub „Build & Deploy“ erneut starten, danach Selbsttest. |
| **Viele fehlgeschlagene Anmeldungen** (Störungs-Mail) | Jemand versucht vermutlich, das Passwort zu erraten. Richtige Anmeldungen klappen weiter. | Ist das Passwort nicht zufällig und mindestens 16 Zeichen lang: Secret `ANALYTICS_PASSWORD` ändern, neu veröffentlichen. |
| **Preise haben sich seit dem Entwurf geändert** | Zwischen Entwurf und Versand wurde die Website mit neuen Preisen veröffentlicht. | Beträge im Text prüfen, dann senden – oder „Neu erzeugen“. |
| **Bibliotheken fehlen** / **Deploy läuft** | Die Website wird gerade veröffentlicht; der Assistent wartet, bis alle Dateien vollständig da sind. | Einige Minuten warten. Nach einer halben Stunde meldet sich der Assistent von selbst („Veröffentlichen unvollständig“). |
| Kein Entwurf, Hinweis **„Bitte selbst beantworten“** | Die KI hat die Antwort verweigert oder ist dreimal gescheitert. | Mail selbst beantworten. |

## 8. Claude-Schlüssel und zweite Sicherung bei Anthropic

**Eigener Arbeitsbereich mit Monatslimit.** Die Limits im Admin-Bereich sind die erste
Sicherung. Die zweite liegt bei Anthropic selbst und greift auch dann, wenn unsere Software
einen Fehler hätte:

1. In der Anthropic-Console einen eigenen Arbeitsbereich (Workspace) nur für
   KFZ-Zulassungsprofis anlegen.
2. Den Schlüssel für den Assistenten **in diesem Arbeitsbereich** erzeugen.
3. Unter **Console → Spend limits → Workspace limits** für den Arbeitsbereich ein Monatslimit
   setzen, das über dem eigenen Limit im Admin-Bereich liegt (zum Beispiel das Doppelte).

So kann der Assistent im schlimmsten Fall nie mehr ausgeben als dieses Limit, und andere
Projekte im selben Anthropic-Konto sind nicht betroffen.

**Schlüssel einrichten oder tauschen:**

1. Im Projektordner ausführen: `bash scripts/ki-schluessel-einrichten.sh`
   Das Skript fragt nach dem Schlüssel (er wird nicht angezeigt), legt ihn für lokale Tests
   und bei GitHub als Secret ab und prüft kostenlos, ob Anthropic ihn annimmt.
2. **Danach die Website neu veröffentlichen.** Erst beim Veröffentlichen gelangt der Schlüssel
   in eine gesperrte Datei auf dem Webspace.
3. Den alten Schlüssel in der Anthropic-Console löschen.
4. Im Admin-Bereich den Selbsttest starten.

Der Schlüssel gehört nie in eine E-Mail, einen Chat oder eine Datei im Repository.

## 9. Abruf: wie oft der Assistent ins Postfach schaut

**Standard: GitHub.** Ein geplanter Ablauf bei GitHub (`.github/workflows/assistent-abruf.yml`)
ruft alle fünf Minuten die Adresse `/assistent/lauf.php` auf. Je Aufruf liest der Assistent
neue Mails ein und lässt höchstens einen Entwurf schreiben. Zwei Eigenheiten:

- GitHub startet geplante Abläufe oft **mit Verspätung** – zu Stoßzeiten auch deutlich später
  als nach fünf Minuten.
- GitHub **schaltet geplante Abläufe ab, wenn im Repository 60 Tage lang nichts geändert
  wurde.** In der Regel kommt dazu eine Mail von GitHub. Wieder einschalten: im Repository
  unter „Actions“ den Ablauf „KI-Assistent – Postfach abrufen“ öffnen und „Enable workflow“
  wählen. Bleiben Entwürfe aus, obwohl Mails eingehen, zuerst hier nachsehen.

**Schneller und zuverlässiger: Cronjob im all-inkl-KAS.** Empfohlen, sobald der Assistent im
Alltag läuft:

1. Im KAS einen neuen Cronjob anlegen (Menü „Tools“ → „Cronjobs“; die Bezeichnungen können
   leicht abweichen).
2. Adresse: `https://kfz-zulassungsprofis.de/assistent/lauf.php`
3. Beim Verzeichnisschutz den Login des Admin-Bereichs eintragen.
4. Ausführung: alle 5 Minuten.
5. **Ergebnis-Mail ausschalten** – sonst kommt alle fünf Minuten eine Mail.

Der GitHub-Ablauf darf daneben weiterlaufen: Der Assistent lässt nie zwei Läufe gleichzeitig zu
und hält zwischen zwei Abrufen mindestens 50 Sekunden Abstand. Wer ihn abschalten möchte:
im Repository unter „Actions“ den Ablauf öffnen und „Disable workflow“ wählen.

Jederzeit von Hand: Knopf **„Jetzt abrufen“** in den Einstellungen.

Antwortet der Assistent beim Abruf mit **HTTP 503**, wird der Ablauf bei GitHub rot und GitHub
schickt eine Mail: Das Veröffentlichen ist dann unvollständig (Abschnitt 7). Der Abruf selbst
löscht auch alte Mails (Abschnitt 12) – fällt er länger aus, holt das Öffnen des Admin-Bereichs
den Löschlauf nach.

## 10. Veröffentlichen der Website

Der Assistent wird zusammen mit der Website veröffentlicht. Dabei entsteht die Wissensbasis
neu, die kostenlosen Tests laufen, und der Claude-Schlüssel wird abgelegt.

- **Schlägt etwas am Assistenten fehl, geht die Website trotzdem live.** Der Assistent bleibt
  dann auf dem Server, wie er war – mit der bisherigen Wissensbasis. Im Ablauf bei GitHub steht
  dazu ein roter Hinweis „KI-Assistent wurde nicht aktualisiert“.
- Wurden Preise geändert, nach dem Veröffentlichen kurz nachsehen: Im GitHub-Ablauf muss im
  Schritt „Per FTPS zu all-inkl deployen“ die Zeile „KI-Assistent: wird mit hochgeladen“ stehen,
  und im Admin-Bereich beim Stand der Wissensbasis das neue Datum. Passt die Wissensbasis nicht zur
  Website, merkt der Assistent das inzwischen selbst („Wissensbasis veraltet“) und sperrt die Preise.
- Nur der Zweig `main` wird veröffentlicht – ein Ablauf, der von Hand auf einem anderen Zweig
  gestartet wird, überspringt beide Veröffentlichungen.
- Daten des Assistenten (Liste der Mails, Entwürfe, Verbrauch, Einstellungen) liegen im Ordner
  `assistent-daten` außerhalb der Website. Das Veröffentlichen fasst sie nicht an.

## 11. Preiswechsel zum 01.01.2027

Der Gründerrabatt gilt bis **31.12.2026**. Die Website stellt nicht von selbst um, und der
Assistent kennt das Enddatum:

- **Ab dem 01.01.2027 nennt der Assistent für die vier Aktions-Leistungen (Neuzulassung,
  Ummeldung, Halterwechsel, Wiederzulassung) keinen Preis mehr.** Entwürfe, die einen dieser
  Preise bräuchten, werden abgewiesen mit dem Hinweis „Aktionspreis abgelaufen – bitte Preise
  auf der Website aktualisieren“. Diese Mails müssen solange von Hand beantwortet werden.
- Alle übrigen Preise (zum Beispiel Abmeldung, Adressänderung, Kennzeichenschilder) nennt er
  weiter.
- **Aufgehoben wird die Sperre nur durch die Website:** In `config/preise.json` die vier Preise
  auf den regulären Preis setzen, den Block `aktion` entfernen, `stand` und `freigabe`
  aktualisieren – dann neu veröffentlichen. Danach stimmen Website und Assistent wieder
  überein.

Am besten wird die Umstellung in den letzten Dezembertagen vorbereitet und am 1. Januar
veröffentlicht. Danach im GitHub-Ablauf prüfen, dass „KI-Assistent: wird mit hochgeladen“ steht,
und im Admin-Bereich, dass die Wissensbasis den neuen Stand zeigt. (Die kostenlosen Tests laufen
mit fester Uhr und scheitern am 1. Januar nicht mehr.)

## 12. Datenschutz in Kürze

- An die KI (Anthropic, Verarbeitung in den USA) gehen Betreff und bereinigter Text der Mail –
  ohne Zitate, ohne erkennbare Grußformel und Signatur. Keine Anhänge, kein Absendername aus der
  Kopfzeile, keine E-Mail-Adresse; Kontonummern, Fahrzeug-Identifizierungsnummern und lange
  Ziffernfolgen sind unkenntlich gemacht. Namen, die im Text selbst stehen, können mitgehen.
- Absender, Betreff, bereinigter Text, Einordnung und Entwürfe werden auf dem eigenen
  Webserver gespeichert. Spätestens nach 90 Tagen löscht der Assistent alles zu einer Mail
  vollständig (der Löschlauf wirkt einmal täglich und nimmt Mails ab dem 89. Tag mit).
  Die Frist lässt sich unter Einstellungen → „Aufbewahrung“ verkürzen (7 bis 90 Tage), aber
  nicht verlängern – die Datenschutzerklärung sagt „spätestens nach 90 Tagen“. Verbrauchszahlen
  und das Protokoll der Aktionen bleiben rund zwei Jahre – ohne Mailinhalt und ohne Bezug zur
  gelöschten Mail.
- Die Datenschutzerklärung der Website beschreibt das im Abschnitt „KI-gestützte Bearbeitung
  von E-Mail-Anfragen“. Ändert sich am Ablauf etwas (anderer Anbieter, andere Frist), muss der
  Text dort mit geändert werden.
- **Widerspricht ein Kunde:** in den Einstellungen eine Absenderregel „immer an einen Menschen“
  für seine Adresse anlegen. Seine Mails gehen dann nie mehr an die KI – auch die, die schon
  warten, und auch nicht über „Entwurf erzeugen“. Die Adresse bleibt dafür in der Regelliste
  gespeichert (so steht es auch in der Datenschutzerklärung).
- **Verlangt ein Kunde die Löschung:** Einstellungen → „Daten eines Kunden löschen“, Adresse
  eingeben. Das löscht alle gespeicherten Mails, Einordnungen und Entwürfe zu dieser Adresse aus
  dem Assistenten (nicht rückgängig zu machen). Die Mails im Postfach selbst bleiben – dort von
  Hand löschen. Eine Absenderregel zur Adresse bleibt bestehen, bis sie gelöscht wird.

## 13. Was Version 1 bewusst nicht kann

- **Kein automatischer Versand an Kunden.** Das würde einen KI-Hinweis in jeder Mail und eine
  eigene Freigabe je Art von Anliegen verlangen.
- **Keine Entwürfe im Entwürfe-Ordner des Mailprogramms.** Das arbeitet in Apple Mail nicht
  zuverlässig; Entwürfe gibt es nur im Admin-Bereich.
- **Keine eigenen Benutzerkonten und kein zweiter Faktor.** Es gibt einen gemeinsamen Login;
  wer gesendet hat, steht über den eingetragenen Namen im Protokoll.
- **Keine automatische Eingangsbestätigung für das Bestellformular.** Das Formular prüft die
  E-Mail-Adresse nicht; eine automatische Bestätigung ließe sich zum Versenden von Spam
  missbrauchen.
- **Kein WhatsApp.** Der Assistent bearbeitet nur E-Mail.

## 14. Für die Technik

| Zweck | Befehl oder Datei |
|---|---|
| Kostenlose Tests (ohne Netz, ohne KI) | `php tests/assistent/regeln-test.php` |
| Modell-Test mit echten Aufrufen (kostet wenige Cent, nur von Hand) | `php tests/assistent/modell-test.php --max=5` (Schlüssel aus `.env.assistent`; `--nur=01,09`, `--modell=sonnet --ja`, `--effort=low`; die Kosten zählen auf das Limit des Arbeitsbereichs bei Anthropic, nicht auf die Limits im Admin-Bereich) |
| Wissensbasis nach einem Build prüfen | `npm run build`, dann `node scripts/assistent-bauen.mjs out` |
| Quelle der Wissensbasis | `app/assistent-wissen.json/route.ts` |
| Ablauf beim Veröffentlichen | `.github/workflows/deploy.yml` (Job `deploy-allinkl`, Schritt „KI-Assistent …“) |
| Geplanter Abruf | `.github/workflows/assistent-abruf.yml` |
| Aufbau, Datenformen, Festlegungen | `docs/ki-assistent/BAUPLAN.md` |

`node scripts/assistent-bauen.mjs out` entfernt den Assistenten aus dem Build-Ordner (so wie
für die Vorschau auf GitHub Pages). Das Paket für den Webspace baut nur der Zusatz
`--produktion`; er läuft beim Veröffentlichen von selbst.
