# Integrationen — Stand und Ausbaupfad

## Was heute produktiv läuft

Der Online-Auftrag und der Unterlagen-Upload werden über ein PHP-Skript auf dem
all-inkl-Webspace zugestellt:

| Baustein | Datei | Zweck |
|---|---|---|
| Endpoint | `public/api/auftrag.php` | nimmt Formular + Dateien an, mailt sie an das Postfach aus `RECIPIENT` (derzeit `info@deutschezulassung.de`, siehe `docs/migration/MIGRATION.md`) |
| Client | `lib/order.ts` | Absenden, Referenznummer, Fallback-Kanäle |
| Auftragsformular | `components/AuftragForm.tsx` | Leistung → Details → Kontakt → Unterlagen |
| Upload-Seite | `app/unterlagen/page.tsx` | Nachreichen zu einer Referenz (`/unterlagen/?ref=KZP-…`, alte `DZ-…`-Nummern bleiben gültig) |
| Datei-Auswahl | `components/DocumentUpload.tsx` | Fotos/PDF, Checkliste je Leistung |

Die Website bleibt dabei ein statischer Export — `public/api/auftrag.php` wird
beim Build unverändert nach `out/api/auftrag.php` kopiert und vom
Deploy-Workflow mit hochgeladen. Apache führt es auf all-inkl aus.

### Ablauf einer Anfrage

1. Kunde füllt das Formular aus, optional mit Unterlagen.
2. `submitOrder()` sendet alles als `multipart/form-data` an `/api/auftrag.php`.
3. Das Skript prüft die Eingaben, vergibt eine Referenz (`KZP-JJJJMMTT-XXXX`)
   und stellt die Anfrage samt Anhängen an das Postfach zu.
4. Der Kunde sieht die Referenz und einen Button in den WhatsApp-Chat —
   die Nachricht enthält die Referenz, sodass Chat und Posteingang zusammenfinden.

WhatsApp bleibt damit der Hauptkanal, ohne dass eine Anfrage am Posteingang
vorbeiläuft.

### Datenschutz

Hochgeladene Dateien werden **nicht** auf dem Webspace gespeichert. Sie gehen
direkt in die Anhänge der E-Mail; PHP löscht die Temp-Dateien am Requestende.
Damit existiert kein Dokumentenarchiv auf dem Webserver. Die
Datenschutzerklärung beschreibt das in Abschnitt 3.

### Schutzmechanismen im Endpoint

- Header-Injection: alle Kopfzeilenwerte werden von Steuerzeichen befreit (`clean()`)
- Dateitypen: Endung **und** tatsächlicher Inhaltstyp (`finfo`) werden geprüft
- Größen: 10 MB je Datei, 25 MB je Anfrage, höchstens 12 Dateien
- Spam: unsichtbares Honeypot-Feld plus Mindest-Ausfüllzeit von 3 Sekunden
- Drosselung: 5 Anfragen je IP und 10 Minuten
- CORS: `kfz-zulassungsprofis.de` (mit und ohne `www`) sowie die frühere Domain

### Fallback

Schlägt die Zustellung fehl (Netzfehler, PHP deaktiviert, Staging auf GitHub
Pages), zeigt das Formular die bisherigen Direktkanäle: vorbefüllte
WhatsApp-Nachricht und `mailto:`. Auf GitHub Pages greift das sofort, weil dort
kein PHP läuft (`NEXT_PUBLIC_STAGING=1`).

## Einmalige Einrichtung auf dem Server

Vor dem ersten Livegang im all-inkl-KAS zu prüfen:

1. **Absender-Postfach anlegen** (derzeit `no-reply@deutschezulassung.de`, später `no-reply@kfz-zulassungsprofis.de`) (oder als Alias auf
   `info@` einrichten). Der Absender muss auf der eigenen Domain liegen, sonst
   greifen SPF/DMARC nicht und die Mails landen im Spam.
2. **PHP-Version** der Domain auf 8.0 oder neuer stellen — das Skript nutzt
   `declare(strict_types=1)` und typisierte Signaturen.
3. **Upload-Limits** prüfen: `post_max_size` und `upload_max_filesize` müssen
   mindestens 25 MB zulassen, sonst greift die 413-Meldung im Skript.
4. **Testlauf**: einmal über das Formular absenden und prüfen, ob die Mail mit
   Anhang in `info@` ankommt und der Absender nicht im Spam landet.

Empfängeradresse und Limits stehen als Konstanten am Kopf von
`public/api/auftrag.php`.

## KI-Assistent für eingehende E-Mails

Seit November 2026 liest ein Assistent das Postfach mit, ordnet Mails ein und bereitet
Antwort-Entwürfe vor. Er sendet nie von selbst: Jede Antwort wird im Admin-Bereich
(`/assistent/`) gelesen und per Klick freigegeben.

| Baustein | Ort | Zweck |
|---|---|---|
| Admin-Bereich und Endpunkte | `public/assistent/` | Oberfläche, Verarbeitungslauf (`lauf.php`), Logik unter `intern/` (per `.htaccess` gesperrt) |
| Wissensbasis | `app/assistent-wissen.json/route.ts` | Preise, Unterlagen, Zeiten, FAQ und Links aus denselben Quellen wie die Seiten |
| Bau-Skript | `scripts/assistent-bauen.mjs` | prüft die Wissensbasis, legt Zugang und Bibliotheken ab, schreibt das Manifest |
| Bibliotheken | `server/assistent/` | Composer-Paketliste (Claude-SDK, IMAP); `vendor/` wird nicht eingecheckt, der Deploy holt es per Composer |
| Abruf | `.github/workflows/assistent-abruf.yml` | stößt alle fünf Minuten den Verarbeitungslauf an |

Formular-Mails aus `auftrag.php` erkennt der Assistent an Absender und Referenz; sie gehen
nicht an die KI. Anhänge werden weder an die KI übermittelt noch vom Assistenten gespeichert –
die Aussage oben zum Dokumentenarchiv gilt unverändert. Gespeichert werden gekürzte Mailtexte
und Entwürfe in einer SQLite-Datei außerhalb des Webroots (`assistent-daten/`), befristet auf
90 Tage. Die Datenschutzerklärung beschreibt das in Abschnitt 3a.

Betrieb: `docs/ki-assistent/BETRIEB.md` · Aufbau: `docs/ki-assistent/BAUPLAN.md`

## Geplante Ausbaustufen

| Modul | Datei | Zweck |
|---|---|---|
| WhatsApp Business API | `whatsapp.ts` | Auftragsbestätigungen, Statusbenachrichtigungen |
| E-Mail-Versand | `email.ts` | Transaktionsmails (Bestätigung, Status, Rechnung) |
| Zahlungen | `payment.ts` | Online-Bezahlung (z. B. Stripe/PayPal/Mollie) |
| Auftrags-Backend | `orders.ts` | Persistenz, Status-Workflow, Kundenkonto |
| CRM | `crm.ts` | Kunden- und Händlerverwaltung |

Die Interfaces in `index.ts` sind die Verträge dafür; jeder Aufruf wirft heute
`NotImplementedError`, damit ein versehentlicher Produktiv-Aufruf sofort auffällt.

### Migrationspfad (statisch → dynamisch)

Nötig, sobald Kundenkonto, Auftragsstatus oder eine mobile App dazukommen:

1. `output: "export"` aus `next.config.ts` entfernen und auf einen Node-Host wechseln.
2. `app/api/auftrag/route.ts` anlegen und die Logik aus `auftrag.php` übernehmen —
   `lib/order.ts` muss dafür nur die `ENDPOINT`-Konstante ändern.
3. `OrderChannel`-Implementierungen registrieren (WhatsApp/E-Mail/DB).
4. Kundenkonto & Statusseite: Auth (z. B. Auth.js) plus `orders.ts`-Backend.
5. DSGVO: Auftragsverarbeitungsverträge mit allen Anbietern, Löschkonzept,
   Verzeichnis von Verarbeitungstätigkeiten.

Eine mobile App würde denselben Endpoint nutzen — `ALLOWED_ORIGINS` in
`auftrag.php` müsste dann um das App-Schema erweitert werden.
