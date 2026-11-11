# Online-Zahlung mit Mollie – Architektur und Einführungsplan

Stand: 11.11.2026 · Branch `redesign/premium` · **Status: vorbereitet, nicht aktiv**

Es gibt derzeit keine Online-Zahlung. Kunden zahlen per Überweisung, nachdem sie
die Festpreis-Bestätigung erhalten haben. Die Website zeigt deshalb keine
Zahlungslogos und keine Zahlungsart, die nicht wirklich funktioniert.

Dieses Dokument beschreibt, was bereits vorbereitet ist und welche Schritte bis
zu einer echten Zahlung fehlen.

## 1. Was im Frontend vorbereitet ist

| Baustein | Datei | Aufgabe |
|---|---|---|
| Konfiguration | `lib/payment.ts` | Liste der geplanten Methoden, zwei Schalter, `startPayment()` |
| Anzeige | `components/checkout/PaymentMethods.tsx` | Zeigt im letzten Schritt des Auftragsassistenten, wie bezahlt wird |
| Preisberechnung | `lib/pricing.ts` → `calculateOrderPrice()` | Positionen und Gesamtbetrag aus `config/preise.json` |

Geplante Methoden: PayPal, Klarna, Kreditkarte (Visa, Mastercard), Apple Pay, Google Pay.

### Die zwei Schalter

Eine Methode erscheint nur, wenn **beide** Build-Variablen gesetzt sind:

```
NEXT_PUBLIC_CHECKOUT=1
NEXT_PUBLIC_PAYMENT_METHODS=paypal,creditcard
```

Ohne diese Variablen (Standard) zeigt `PaymentMethods` ausschließlich den Text
zur Überweisung. In `NEXT_PUBLIC_PAYMENT_METHODS` dürfen nur Methoden stehen, die
im Mollie-Dashboard freigeschaltet **und** mit einer Testzahlung geprüft sind.

**Wichtig:** Die Schalter dürfen erst gesetzt werden, wenn der Server-Endpunkt
aus Abschnitt 2 existiert. Sie schalten nur die Anzeige frei.

## 2. Was fehlt: der Server-Teil

Die Website ist ein statischer Export. Der einzige Server-Code ist
`public/api/auftrag.php` auf dem all-inkl-Webspace. Eine Zahlung braucht dort
zwei weitere Skripte und einen Speicher für Aufträge.

```
Browser                         all-inkl (PHP)                    Mollie
───────                         ──────────────                    ──────
Auftrag absenden      ──►  auftrag.php   speichert Auftrag,
                                         vergibt Referenz
Team bestätigt den Festpreis (wie heute, per E-Mail/WhatsApp)
Zahlungsart wählen    ──►  zahlung.php   liest Festpreis zur
                                         Referenz, legt Zahlung an  ──►  POST /v2/payments
                      ◄──  checkoutUrl                              ◄──  _links.checkout
Weiterleitung zu Mollie, Kunde zahlt
                           webhook.php   fragt Status bei Mollie ab ◄──  Webhook (nur ID)
                                         markiert Auftrag bezahlt
Rückkehr auf /auftrag/danke/?ref=…  (zeigt Status aus dem Speicher)
```

### Regeln, die nicht verhandelbar sind

1. **Der API-Schlüssel steht nie im Frontend.** Kein `NEXT_PUBLIC_…`, nicht im
   Repository. Ablage in einer PHP-Konfigurationsdatei außerhalb des Webroots
   oder als Umgebungsvariable im KAS.
2. **Der Betrag kommt vom Server.** `startPayment()` schickt nur Referenz und
   Methode. `zahlung.php` liest den bestätigten Festpreis selbst aus dem
   Auftragsspeicher. Ein vom Browser gesendeter Betrag wäre manipulierbar.
3. **Der Webhook entscheidet, nicht die Rückkehrseite.** Bezahlt ist ein Auftrag
   erst, wenn `webhook.php` den Status bei Mollie abgefragt hat. Die Rückkehr
   des Kunden auf die Website beweist nichts.
4. **Testmodus zuerst.** Mit `test_…`-Schlüssel alle Methoden und die Fälle
   bezahlt, abgebrochen, abgelaufen und fehlgeschlagen durchspielen.

### Benötigte Entscheidungen

| Frage | Warum |
|---|---|
| Zahlung vor oder nach der Festpreis-Bestätigung? | Heute entsteht der Auftrag erst mit der Bestätigung. Bei Zahlung direkt im Formular wird der Absende-Button zur zahlungspflichtigen Bestellung (§ 312j BGB: Beschriftung „zahlungspflichtig bestellen“, Pflichtangaben direkt darüber). |
| Wo werden Aufträge gespeichert? | `zahlung.php` und `webhook.php` brauchen den Auftrag zur Referenz. Naheliegend: MySQL-Datenbank bei all-inkl. Heute wird nichts gespeichert, die Anfrage geht nur per E-Mail raus. |
| Erstattung bei Ablehnung durch die Behörde? | Siehe `docs/seo/OWNER-DECISIONS.md`, Punkt B9. |
| Klarna | Braucht zusätzliche Angaben (Rechnungsadresse, Positionen) und eine eigene Freischaltung bei Mollie. |
| Apple Pay | Domain-Verifizierung über eine Datei unter `/.well-known/`. |

Diese Punkte brauchen eine rechtliche Prüfung (Widerruf, Button-Lösung, AGB),
bevor die Zahlung live geht.

## 3. Schritte bis zur ersten echten Zahlung

1. Mollie-Konto verifizieren, Methoden freischalten lassen.
2. Auftragsspeicher anlegen und `auftrag.php` um das Speichern erweitern.
3. `zahlung.php` und `webhook.php` schreiben (Mollie-PHP-Client oder direkte API).
4. Content-Security-Policy in `public/.htaccess` prüfen: Die Weiterleitung zu
   Mollie ist eine Navigation und braucht keine Freigabe. `form-action` muss
   erweitert werden, falls ein Formular direkt zu Mollie sendet.
5. Rückkehrseite `/auftrag/danke/` bauen, die den Status vom Server liest.
6. Datenschutzerklärung um Mollie und die genutzten Zahlungsanbieter ergänzen.
7. Im Testmodus alle Methoden prüfen.
8. Erst dann `NEXT_PUBLIC_CHECKOUT=1` und die geprüften Methoden im
   Deploy-Workflow setzen.

## 4. Was bewusst nicht gebaut wurde

- Kein Zahlungsformular, das Kartendaten annimmt. Kartendaten gehören auf die
  gehostete Seite des Zahlungsanbieters.
- Keine Platzhalter-Logos von PayPal, Klarna, Visa oder Mastercard.
- Kein simulierter Bezahlvorgang.
