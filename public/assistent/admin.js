/*
 * KI-Assistent – Oberfläche des Admin-Bereichs.
 *
 * Holt Daten von daten.php (nur lesen) und schickt Aktionen an aktion.php (POST mit JSON,
 * Kopfzeile X-KZP-CSRF). Die Wörter für Zustand, Marken und Hinweise kommen fertig vom Server
 * (intern/Admin.php); hier wird nur angezeigt.
 *
 * SICHERHEIT: Mailtexte, Betreffs, Namen und Entwürfe stammen von Unbekannten. Sie werden
 * ausschließlich als Text eingesetzt (textContent bzw. value) – in dieser Datei gibt es kein
 * innerHTML, keine Links aus Daten und keine Attribute, die Code ausführen könnten.
 * Die strenge Content-Security-Policy der Seite verbietet zusätzlich jedes Inline-Skript.
 *
 * WER BEARBEITET: Der Login ist für alle gleich. Deshalb fragt die Seite einmal nach dem Namen
 * der Person, merkt ihn im Browser (localStorage) und sendet ihn mit jeder Aktion als
 * „bearbeiter“ mit. Ohne Namen sendet der Server keine Antwort an Kunden.
 */
(function () {
  'use strict';

  var MERK_SCHLUESSEL = 'kzp-assistent-bearbeiter';
  var NEU_LADEN_MS = 60000;

  // Die Gründe beim Verwerfen kommen vom Server (Admin::VERWERF_GRUENDE, daten.php?was=start).
  // Nur falls diese Antwort einmal fehlt, gilt diese kurze Liste.
  var VERWERF_ERSATZ = [{ schluessel: 'keine_antwort', name: 'Keine Antwort nötig' }, { schluessel: 'anderes', name: 'Anderes' }];

  var LEER_TEXT = {
    offen: 'Nichts zu erledigen. Neue Entwürfe erscheinen hier von selbst.',
    alle: 'Noch keine Mails eingelesen.',
    ohne_ki: 'Bisher wurde nichts ohne KI aussortiert.'
  };

  var MONATE = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'];

  var zustand = {
    csrf: '',
    start: null,
    standZeit: 0,
    reiter: 'posteingang',
    filter: 'offen',
    seite: 1,
    detail: null,         // Antwort von daten.php?was=nachricht
    textOriginal: '',     // Entwurfstext, wie er vom Server kam
    ausListe: false,      // Detail wurde aus der Liste geöffnet (dann führt „Zurück“ über den Verlauf)
    bearbeiter: '',
    beschaeftigt: false,
    werte: {},            // Einstellungen, wie sie zuletzt vom Server kamen
    vorschauNr: 0
  };

  function $(id) { return document.getElementById(id); }

  // -- Bausteine für die Anzeige ----------------------------------------------

  /**
   * Erzeugt ein Element. Texte werden immer als Text eingesetzt; „kinder“ dürfen Elemente oder
   * Zeichenketten sein (Zeichenketten werden zu Textknoten).
   */
  function el(tag, eigenschaften, kinder) {
    var knoten = document.createElement(tag);
    var name, wert, k;
    for (name in eigenschaften || {}) {
      wert = eigenschaften[name];
      if (wert === null || wert === undefined || wert === false) { continue; }
      if (name === 'klasse') { knoten.className = wert; }
      else if (name === 'text') { knoten.textContent = wert; }
      else if (name === 'daten') { for (k in wert) { knoten.dataset[k] = wert[k]; } }
      else { knoten.setAttribute(name, wert === true ? '' : String(wert)); }
    }
    (kinder || []).forEach(function (kind) {
      if (kind !== null && kind !== undefined && kind !== false) { knoten.append(kind); }
    });
    return knoten;
  }

  function absatz(text, klasse) { return el('p', { text: text, klasse: klasse || null }); }

  function aufzaehlung(texte) {
    return el('ul', null, texte.map(function (t) { return el('li', { text: t }); }));
  }

  function marken(liste) {
    return el('span', { klasse: 'marken' }, (liste || []).map(function (m) {
      return el('span', { klasse: 'marke-klein', text: m.text, daten: { farbe: m.farbe || 'grau' } });
    }));
  }

  // -- Zahlen und Zeiten -------------------------------------------------------

  var GELD = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var GELD_FEIN = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD', minimumFractionDigits: 4, maximumFractionDigits: 4 });

  /** Dollarbetrag; kleine Beträge (unter 10 Cent) mit vier Nachkommastellen, sonst stünde dort 0,00. */
  function dollar(betrag) {
    var b = Number(betrag) || 0;
    return (b > 0 && b < 0.1 ? GELD_FEIN : GELD).format(b);
  }

  function zahl(n) { return (Number(n) || 0).toLocaleString('de-DE'); }

  function mehrzahl(n, eins, viele) { return zahl(n) + ' ' + (Number(n) === 1 ? eins : viele); }

  function zeitTeile(sekunden) {
    var d = new Date(sekunden * 1000);
    var ort = { timeZone: 'Europe/Berlin' };
    return {
      tag: d.toLocaleDateString('de-DE', Object.assign({ day: '2-digit', month: '2-digit', year: 'numeric' }, ort)),
      uhr: d.toLocaleTimeString('de-DE', Object.assign({ hour: '2-digit', minute: '2-digit' }, ort))
    };
  }

  /** Für die Liste: heute nur die Uhrzeit, sonst Tag und Uhrzeit. */
  function zeitKurz(sekunden) {
    if (!sekunden) { return ''; }
    var t = zeitTeile(sekunden);
    var heute = zeitTeile(Date.now() / 1000);
    return t.tag === heute.tag ? t.uhr : t.tag.slice(0, 6) + ' ' + t.uhr;
  }

  function zeitLang(sekunden) {
    if (!sekunden) { return ''; }
    var t = zeitTeile(sekunden);
    return t.tag + ', ' + t.uhr + ' Uhr';
  }

  /** „2026-11-22“ → „22.11.“, „2026-11“ → „Nov. 26“ */
  function achsenName(name) {
    var tag = /^(\d{4})-(\d{2})-(\d{2})$/.exec(name);
    if (tag) { return tag[3] + '.' + tag[2] + '.'; }
    var monat = /^(\d{4})-(\d{2})$/.exec(name);
    if (monat) { return (MONATE[Number(monat[2]) - 1] || monat[2]) + ' ' + monat[1].slice(2); }
    return name;
  }

  // -- Rückmeldungen -----------------------------------------------------------

  var meldungUhr = 0;

  /** Kurze Zeile am unteren Rand, verschwindet von selbst. */
  function melde(text, fehler) {
    var m = $('meldung');
    m.textContent = text;
    m.dataset.art = fehler ? 'fehler' : 'ok';
    m.hidden = false;
    window.clearTimeout(meldungUhr);
    meldungUhr = window.setTimeout(function () { m.hidden = true; }, fehler ? 8000 : 4000);
  }

  function rueckmeldung(knoten, text, fehler) {
    knoten.textContent = text;
    knoten.dataset.art = fehler ? 'fehler' : 'ok';
  }

  /**
   * Zeigt den Dialog und liefert den Wert des gewählten Knopfes (Escape: null).
   * knoepfe: [{ text, wert, art: 'haupt'|'rot', standard: true }] – der Standardknopf reagiert auf Enter.
   */
  function dialog(o) {
    return new Promise(function (fertig) {
      var d = $('dialog');
      var form = $('dialog-form');
      var erledigt = false;

      function schliesse(wert) {
        if (erledigt) { return; }
        erledigt = true;
        d.removeEventListener('cancel', abbruch);
        form.removeEventListener('submit', absenden);
        if (typeof d.close === 'function' && d.open) { d.close(); } else { d.removeAttribute('open'); }
        fertig(wert);
      }
      function abbruch(ereignis) { ereignis.preventDefault(); schliesse(null); }
      function absenden(ereignis) {
        ereignis.preventDefault();
        var standard = o.knoepfe.filter(function (k) { return k.standard; })[0];
        schliesse(standard ? standard.wert : null);
      }

      $('dialog-titel').textContent = o.titel;
      $('dialog-inhalt').replaceChildren.apply($('dialog-inhalt'), o.inhalt || []);
      var knoepfe = o.knoepfe.map(function (k) {
        var b = el('button', { type: k.standard ? 'submit' : 'button', klasse: 'knopf' + (k.art ? ' knopf--' + k.art : ''), text: k.text });
        if (!k.standard) { b.addEventListener('click', function () { schliesse(k.wert); }); }
        return b;
      });
      $('dialog-knoepfe').replaceChildren.apply($('dialog-knoepfe'), knoepfe);

      d.addEventListener('cancel', abbruch);
      form.addEventListener('submit', absenden);
      if (typeof d.showModal === 'function') { d.showModal(); } else { d.setAttribute('open', ''); }
      (o.fokus || knoepfe[0]).focus();
    });
  }

  /** Einfache Rückfrage: true, wenn bestätigt. */
  function rueckfrage(titel, texte, jaText, art) {
    return dialog({
      titel: titel,
      inhalt: texte.map(function (t) { return typeof t === 'string' ? absatz(t) : t; }),
      knoepfe: [
        { text: 'Abbrechen', wert: false },
        { text: jaText, wert: true, art: art || 'haupt', standard: true }
      ]
    }).then(function (wert) { return wert === true; });
  }

  // -- Verbindung zum Server ---------------------------------------------------

  function Fehler(text, status) {
    this.message = text;
    this.status = status || 0;
  }

  /** Ruft eine Adresse der eigenen Seite ab und liefert { status, daten }. Wirft Fehler mit einem Satz für Menschen. */
  function abruf(url, optionen) {
    return fetch(url, Object.assign({ credentials: 'same-origin', cache: 'no-store' }, optionen)).then(function (antwort) {
      var typ = antwort.headers.get('Content-Type') || '';
      if (typ.indexOf('application/json') === 0) {
        return antwort.json().then(function (daten) {
          if (!daten || typeof daten !== 'object') { throw new Fehler('Die Antwort des Servers war nicht lesbar.', antwort.status); }
          return { status: antwort.status, daten: daten };
        }, function () {
          throw new Fehler('Die Antwort des Servers war nicht lesbar.', antwort.status);
        });
      }
      // Kein JSON: Das ist die Login-Stufe (401, 429, 503) oder eine Störung des Servers.
      return antwort.text().then(function (text) {
        text = (text || '').trim();
        if (antwort.status === 401) { throw new Fehler('Die Anmeldung ist abgelaufen. Bitte die Seite neu laden und neu anmelden.', 401); }
        if ((antwort.status === 429 || antwort.status === 503) && text && text.length < 400) { throw new Fehler(text, antwort.status); }
        throw new Fehler('Der Server hat nicht wie erwartet geantwortet (Fehler ' + antwort.status + '). Bitte später noch einmal versuchen.', antwort.status);
      });
    }, function () {
      throw new Fehler('Keine Verbindung. Bitte das Internet prüfen und noch einmal versuchen.', 0);
    });
  }

  function hole(was, parameter) {
    var frage = new URLSearchParams(Object.assign({ was: was }, parameter || {}));
    return abruf('daten.php?' + frage.toString(), { headers: { Accept: 'application/json' } }).then(function (a) {
      if (a.daten.ok !== true) { throw new Fehler(a.daten.fehler || 'Die Daten konnten nicht geladen werden.', a.status); }
      return a.daten;
    });
  }

  /** POST mit JSON und CSRF-Token. Ist das Token abgelaufen, wird es einmal erneuert und wiederholt. */
  function schicke(ziel, koerper, zweiterVersuch) {
    return abruf(ziel, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-KZP-CSRF': zustand.csrf },
      body: JSON.stringify(koerper)
    }).then(function (a) {
      if (a.status === 403 && a.daten.neu_laden && !zweiterVersuch) {
        // Der Server hat die Aktion abgelehnt, bevor etwas geschah – ein zweiter Versuch ist gefahrlos.
        return ladeStart(true).then(function () { return schicke(ziel, koerper, true); });
      }
      return a.daten;
    });
  }

  function aktion(name, felder) {
    return schicke('aktion.php', Object.assign({ aktion: name, bearbeiter: zustand.bearbeiter }, felder || {}));
  }

  /**
   * Führt eine Aktion aus, während die Knöpfe gesperrt sind – ein Doppelklick sendet nichts doppelt.
   * Fehler landen als Meldung am Bildschirm.
   */
  function mitSperre(knoepfe, arbeit) {
    if (zustand.beschaeftigt) { return Promise.resolve(); }
    zustand.beschaeftigt = true;
    knoepfe = (knoepfe || []).filter(Boolean);
    var vorher = knoepfe.map(function (k) { return k.disabled; });
    knoepfe.forEach(function (k) { k.disabled = true; });
    return Promise.resolve().then(arbeit).catch(function (e) {
      melde(e && e.message ? e.message : 'Das hat nicht geklappt.', true);
    }).then(function () {
      zustand.beschaeftigt = false;
      knoepfe.forEach(function (k, i) { if (k.isConnected) { k.disabled = vorher[i]; } });
    });
  }

  // -- Wer bearbeitet ----------------------------------------------------------

  function leseBearbeiter() {
    try { return (window.localStorage.getItem(MERK_SCHLUESSEL) || '').trim().slice(0, 40); } catch (e) { return ''; }
  }

  function setzeBearbeiter(name) {
    zustand.bearbeiter = name;
    try { window.localStorage.setItem(MERK_SCHLUESSEL, name); } catch (e) { /* privater Modus: gilt dann nur bis zum Neuladen */ }
    $('wer-name').textContent = name || 'noch niemand';
  }

  /** Fragt nach dem Namen. Liefert true, wenn danach einer feststeht. */
  function frageNamen() {
    var eingabe = el('input', { klasse: 'eingabe', type: 'text', maxlength: '40', autocomplete: 'given-name', id: 'name-eingabe' });
    eingabe.value = zustand.bearbeiter;
    return dialog({
      titel: 'Wer bearbeitet?',
      inhalt: [
        absatz('Der Login ist für alle gleich. Damit später klar ist, wer eine Antwort freigegeben hat, steht Ihr Name an jeder Aktion. Er wird nur in diesem Browser gemerkt.'),
        el('label', { klasse: 'feld' }, [el('span', { klasse: 'feld__name', text: 'Ihr Name' }), eingabe])
      ],
      knoepfe: [
        { text: 'Später', wert: false },
        { text: 'Speichern', wert: true, art: 'haupt', standard: true }
      ],
      fokus: eingabe
    }).then(function (gespeichert) {
      var name = eingabe.value.replace(/\s+/g, ' ').trim().slice(0, 40);
      if (gespeichert === true && name !== '') { setzeBearbeiter(name); }
      return zustand.bearbeiter !== '';
    });
  }

  // -- Kopfbereich -------------------------------------------------------------

  function setzeBalken(id, anteil) {
    var balken = $(id);
    var prozent = Math.max(0, Math.min(100, anteil * 100));
    balken.firstElementChild.style.width = prozent + '%';
    balken.dataset.stufe = prozent >= 100 ? 'voll' : (prozent >= 80 ? 'knapp' : 'frei');
  }

  function anteilVon(wert, limit) {
    if (!(limit > 0)) { return 1; }
    return wert / limit;
  }

  function zeigeStand(d) {
    var v = d.verbrauch;
    $('stand').dataset.art = d.zustand.art;
    $('stand-satz').textContent = d.zustand.text;
    $('stand-zusatz').textContent = d.zustand.zusatz || '';

    var schalter = $('ki-schalter');
    schalter.setAttribute('aria-checked', d.ki_aktiv ? 'true' : 'false');
    schalter.disabled = false;
    $('ki-schalter-wort').textContent = d.ki_aktiv ? 'KI an' : 'KI aus';

    $('heute-wert').textContent = dollar(v.heute_usd) + ' von ' + dollar(v.limit_tag_usd) + ' · ' + mehrzahl(v.aufrufe_heute, 'Aufruf', 'Aufrufe');
    setzeBalken('heute-balken', anteilVon(v.heute_usd, v.limit_tag_usd));
    $('monat-wert').textContent = dollar(v.monat_usd) + ' von ' + dollar(v.limit_monat_usd);
    setzeBalken('monat-balken', anteilVon(v.monat_usd, v.limit_monat_usd));

    $('wartend').textContent = zahl(d.wartend);
    $('tab-posteingang').textContent = 'Posteingang' + (d.wartend > 0 ? ' (' + zahl(d.wartend) + ')' : '');
    document.title = (d.wartend > 0 ? '(' + zahl(d.wartend) + ') ' : '') + 'KI-Assistent · KFZ-Zulassungsprofis';

    $('k-sperre').hidden = !(d.sperre && d.sperre.aktiv);

    var unklar = Number(d.versand_unklar) || 0;
    $('unklar-banner').hidden = unklar === 0;
    $('unklar-text').textContent = unklar === 1
      ? ' Bei einer Mail ist offen, ob sie rausging. Bitte unter „Zu erledigen“ öffnen und im Gesendet-Ordner nachsehen.'
      : ' Bei ' + zahl(unklar) + ' Mails ist offen, ob sie rausgingen. Bitte unter „Zu erledigen“ öffnen und im Gesendet-Ordner nachsehen.';
  }

  /** Lädt den Kopfbereich. leise = im Hintergrund: Bei einem Fehler bleibt der alte Stand stehen, mit Vermerk. */
  function ladeStart(leise) {
    return hole('start').then(function (d) {
      zustand.start = d;
      zustand.csrf = d.csrf;
      zustand.standZeit = Date.now() / 1000;
      zeigeStand(d);
      return d;
    }, function (e) {
      if (zustand.start) {
        $('stand-zusatz').textContent = e.message + ' Angezeigt wird der Stand von ' + zeitTeile(zustand.standZeit).uhr + ' Uhr.';
        $('stand').dataset.art = 'achtung';
      } else {
        $('stand').dataset.art = 'gesperrt';
        $('stand-satz').textContent = 'Keine Daten';
        $('stand-zusatz').textContent = e.message;
      }
      if (!leise) { throw e; }
      return null;
    });
  }

  function schalteKi() {
    var schalter = $('ki-schalter');
    var laeuft = schalter.getAttribute('aria-checked') === 'true';
    var frage = Promise.resolve(true);
    if (!laeuft) {
      var v = zustand.start ? zustand.start.verbrauch : null;
      frage = rueckfrage('KI einschalten?', [
        'Ab jetzt entwirft die KI Antworten auf neue Kundenmails. Dabei entstehen Kosten'
          + (v ? ' – höchstens ' + dollar(v.limit_tag_usd) + ' am Tag und ' + dollar(v.limit_monat_usd) + ' im Monat.' : '.'),
        'Gesendet wird weiterhin nur, was Sie selbst lesen und freigeben.'
      ], 'KI einschalten');
    }
    frage.then(function (ja) {
      if (!ja) { return; }
      mitSperre([schalter], function () {
        // „pause an“ hält die KI an; läuft sie gerade, ist genau das gewünscht.
        return aktion('pause', { an: laeuft }).then(function (d) {
          if (!d.ok) { throw new Fehler(d.fehler || 'Das Umschalten hat nicht geklappt.'); }
          melde(d.meldung || 'Gespeichert.');
          return ladeStart(true);
        });
      });
    });
  }

  function sperreAufheben() {
    var knopf = $('k-sperre');
    rueckfrage('Sperre aufheben?', [
      'Die KI wurde nach einem Fehler beim Anbieter gesperrt (' + ((zustand.start && zustand.start.sperre && zustand.start.sperre.grund) || 'Fehler beim KI-Anbieter') + ').',
      'Bitte nur aufheben, wenn die Ursache behoben ist – etwa ein neuer Schlüssel oder ein höheres Limit bei Anthropic. Sonst sperrt der nächste Aufruf gleich wieder.'
    ], 'Sperre aufheben').then(function (ja) {
      if (!ja) { return; }
      mitSperre([knopf], function () {
        return aktion('sperre_aufheben', {}).then(function (a) {
          if (!a.ok) { throw new Fehler(a.fehler || 'Die Sperre ließ sich nicht aufheben.'); }
          melde(a.meldung || 'Sperre aufgehoben.');
          return ladeStart(true);
        });
      });
    });
  }

  // -- Reiter ------------------------------------------------------------------

  function zeigeReiter(name, fokus) {
    zustand.reiter = name;
    document.querySelectorAll('.reiter__knopf').forEach(function (knopf) {
      var aktiv = knopf.dataset.reiter === name;
      knopf.setAttribute('aria-selected', aktiv ? 'true' : 'false');
      knopf.tabIndex = aktiv ? 0 : -1;
      $('bereich-' + knopf.dataset.reiter).hidden = !aktiv;
      if (aktiv && fokus) { knopf.focus(); }
    });
    if (name === 'posteingang' && !zustand.detail) { ladeListe(true); }
    if (name === 'verbrauch') { ladeVerbrauch(); }
    if (name === 'einstellungen') { ladeEinstellungen(); }
  }

  function reiterTaste(ereignis) {
    var knoepfe = Array.prototype.slice.call(document.querySelectorAll('.reiter__knopf'));
    var stelle = knoepfe.indexOf(document.activeElement);
    if (stelle < 0) { return; }
    var ziel = -1;
    if (ereignis.key === 'ArrowRight') { ziel = (stelle + 1) % knoepfe.length; }
    if (ereignis.key === 'ArrowLeft') { ziel = (stelle - 1 + knoepfe.length) % knoepfe.length; }
    if (ziel >= 0) {
      ereignis.preventDefault();
      zeigeReiter(knoepfe[ziel].dataset.reiter, true);
    }
  }

  // -- Posteingang: Liste ------------------------------------------------------

  function listenEintrag(e) {
    var knopf = el('button', { type: 'button', klasse: 'eintrag' }, [
      el('span', { klasse: 'eintrag__von', text: e.von_name || e.von_adresse || 'Unbekannter Absender' }),
      el('span', { klasse: 'eintrag__zeit', text: zeitKurz(e.eingang_am) }),
      el('span', { klasse: 'eintrag__betreff', text: e.betreff || '(ohne Betreff)' }),
      e.zusammenfassung ? el('span', { klasse: 'eintrag__kurz', text: e.zusammenfassung }) : null,
      marken(e.marken)
    ]);
    knopf.addEventListener('click', function () {
      zustand.ausListe = true;
      window.location.hash = 'nachricht-' + e.id;
    });
    return el('li', null, [knopf]);
  }

  function zeigeListe(d) {
    $('liste').replaceChildren.apply($('liste'), d.eintraege.map(listenEintrag));
    var leer = $('liste-leer');
    leer.hidden = d.eintraege.length > 0;
    leer.textContent = d.seite > 1 ? 'Keine weiteren Mails.' : (LEER_TEXT[d.filter] || '');
    $('blaettern').hidden = d.seite === 1 && !d.weitere;
    $('liste-neuere').disabled = d.seite <= 1;
    $('liste-aeltere').disabled = !d.weitere;
    $('liste-seite').textContent = 'Seite ' + d.seite;
  }

  function ladeListe(leise) {
    var filter = zustand.filter;
    var seite = zustand.seite;
    return hole('liste', { filter: filter, seite: String(seite) }).then(function (d) {
      // Hat inzwischen jemand Filter oder Seite gewechselt, gehört diese Antwort nicht mehr auf den Bildschirm.
      if (filter === zustand.filter && seite === zustand.seite) { zeigeListe(d); }
    }, function (e) {
      if (leise) { return; }
      $('liste').replaceChildren();
      $('liste-leer').hidden = false;
      $('liste-leer').textContent = e.message;
    });
  }

  function setzeFilter(filter) {
    zustand.filter = filter;
    zustand.seite = 1;
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.dataset.filter === filter ? 'true' : 'false');
    });
    ladeListe(false);
  }

  // -- Posteingang: eine Nachricht --------------------------------------------

  function entwurfFeld() { return $('entwurf-text'); }

  function textGeaendert() {
    var feld = entwurfFeld();
    return !!(feld && zustand.detail && feld.value !== zustand.textOriginal);
  }

  /** Kasten unter den Knöpfen: warum nichts gesendet wurde, mit den Hinweisen des Prüfers. */
  function zeigeDetailFehler(text, hinweise, titel, farbe) {
    var ort = $('detail-fehler');
    if (!ort) { melde(text, true); return; }
    ort.replaceChildren(el('div', { klasse: 'kasten', role: 'alert', daten: { farbe: farbe || 'rot' } }, [
      el('strong', { text: titel || 'Nicht gesendet' }),
      text,
      hinweise && hinweise.length > 0 ? aufzaehlung(hinweise) : null
    ]));
    ort.scrollIntoView({ block: 'nearest' });
  }

  function mailBlock(d) {
    var n = d.nachricht;
    var erklaerung = !n.text_bereinigt ? null : (d.einordnung
      ? 'Genau so hat die KI die Mail bekommen: ohne Zitate, ohne Grußformel und Signatur (soweit erkennbar), lange Nummern unkenntlich. Name und Adresse des Absenders gehen nicht an die KI. Telefonnummer oder Anschrift aus der Signatur stehen in der Mail im Mailprogramm.'
      : 'Diese Mail ging bisher nicht an die KI. So ist sie gespeichert: ohne Zitate, ohne Grußformel und Signatur (soweit erkennbar), lange Nummern unkenntlich.');
    // Frühere Mails desselben Absenders, die mit dieser zusammengefasst sind: Der Entwurf soll sie
    // mit abdecken – also muss der Mensch sie sehen.
    var frueher = (n.zusammengefasst || []).map(function (z) {
      return el('div', { klasse: 'frueher' }, [
        absatz('Frühere Mail vom ' + zeitLang(z.eingang_am) + (z.betreff ? ' · ' + z.betreff : '') + ' – wird mit dieser beantwortet', 'merkzeile'),
        el('pre', { klasse: 'mailtext', text: z.text })
      ]);
    });
    return el('section', { klasse: 'feldblock' }, [
      el('h3', { text: 'Mail des Kunden' }),
      erklaerung ? absatz(erklaerung, 'klein') : null,
      n.text_bereinigt
        ? el('pre', { klasse: 'mailtext', text: n.text_bereinigt })
        : absatz(n.text_hinweis || 'Kein Text gespeichert.', 'mailtext mailtext--leer'),
      n.anhang_text ? absatz(n.anhang_text, 'anhang') : null,
      n.gekuerzt ? absatz('Die Mail war länger (' + zahl(n.zeichen_original) + ' Zeichen) und wurde für die KI gekürzt. Den ganzen Text finden Sie im Mailprogramm.', 'merkzeile') : null
    ].concat(frueher));
  }

  /** true, wenn ein offener Entwurf vorliegt, der ersetzt oder verworfen würde. */
  function hatEntwurf(d) {
    return !!(d.entwurf && d.entwurf.status === 'offen');
  }

  function antwortBlock(d) {
    var n = d.nachricht, w = d.entwurf, e = d.einordnung, darf = d.darf;
    if (!w && !darf.uebernehmen && !darf.neu_erzeugen && !darf.verwerfen) { return null; }

    var titel = darf.senden ? 'Antwort-Entwurf' : (w && w.status === 'gesendet' ? 'Gesendete Antwort' : (w ? 'Entwurf' : 'Noch kein Entwurf'));
    var teile = [el('h3', { text: titel })];

    if (e && (e.zusammenfassung || e.fehlende_angabe)) {
      teile.push(el('dl', { klasse: 'ki-meint' }, [
        e.zusammenfassung ? el('dt', { text: 'Die KI hat verstanden' }) : null,
        e.zusammenfassung ? el('dd', { text: e.zusammenfassung }) : null,
        e.fehlende_angabe ? el('dt', { text: 'Es fehlt noch' }) : null,
        e.fehlende_angabe ? el('dd', { text: e.fehlende_angabe }) : null
      ]));
    }
    if (w && w.pruef_hinweise.length > 0 && (darf.senden || w.status === 'offen')) {
      teile.push(el('div', { klasse: 'hinweise', role: 'note' }, [
        el('strong', { text: 'Bitte vor dem Senden prüfen' }),
        aufzaehlung(w.pruef_hinweise)
      ]));
    }

    if (darf.senden) {
      var feld = el('textarea', { klasse: 'eingabe entwurf-text', id: 'entwurf-text', rows: '14', maxlength: '10000', 'aria-label': 'Antworttext', spellcheck: 'true', lang: w.sprache === 'en' ? 'en' : 'de',
        placeholder: 'Hier die Antwort schreiben – ohne Anrede, Gruß und Fußzeile.' });
      feld.value = w.text;
      var vorschauText = el('pre', { klasse: 'mailtext', id: 'vorschau-text' });
      var vorschau = el('details', { klasse: 'vorschau', id: 'vorschau' }, [
        el('summary', { text: 'So geht die Mail raus' }),
        vorschauText,
        absatz('Mit Anrede, Gruß und Fußzeile – genau dieser Text wird gesendet.', 'merkzeile')
      ]);
      vorschau.addEventListener('toggle', function () { if (vorschau.open) { ladeVorschau(false); } });
      var uhr = 0;
      feld.addEventListener('input', function () {
        if (!vorschau.open) { return; }
        window.clearTimeout(uhr);
        uhr = window.setTimeout(function () { ladeVorschau(true); }, 700);
      });
      teile.push(feld);
      if (n.antwort_abweichend) {
        // Absender lassen sich fälschen: Weicht die Antwortadresse ab, deutlich zeigen (Senden fragt nach).
        teile.push(el('div', { klasse: 'kasten', role: 'alert', daten: { farbe: 'rot' } }, [
          el('strong', { text: 'Antwort geht an eine andere Adresse' }),
          'Geht an ' + n.geht_an + ' – nicht an den Absender ' + n.von_adresse + '. Bitte prüfen, ob diese Adresse wirklich zum Kunden gehört.'
        ]));
      }
      teile.push(absatz('Geht an ' + (n.geht_an || '(keine gültige Adresse)') + '. Anrede, Gruß und Fußzeile setzt das Programm dazu'
        + (w.sprache === 'en' ? ' – auf Englisch, weil die Mail englisch ist.' : '.'), 'merkzeile'));
      teile.push(vorschau);
    } else if (w && w.text) {
      teile.push(el('pre', { klasse: 'mailtext', text: w.text }));
      if (w.status === 'gesendet') { teile.push(absatz('Ohne Anrede, Gruß und Fußzeile – die hat das Programm ergänzt.', 'merkzeile')); }
    }

    var knoepfe = [];
    if (darf.senden) { knoepfe.push(el('button', { type: 'button', klasse: 'knopf knopf--haupt', id: 'k-senden', text: 'Senden' })); }
    if (darf.uebernehmen) { knoepfe.push(el('button', { type: 'button', klasse: 'knopf', id: 'k-selbst', text: 'Ich antworte selbst' })); }
    if (darf.neu_erzeugen) { knoepfe.push(el('button', { type: 'button', klasse: 'knopf', id: 'k-neu', text: hatEntwurf(d) ? 'Neu erzeugen' : 'Entwurf erzeugen' })); }
    if (darf.verwerfen) { knoepfe.push(el('button', { type: 'button', klasse: 'knopf knopf--leise', id: 'k-verwerfen', text: hatEntwurf(d) ? 'Verwerfen' : 'Keine Antwort nötig' })); }
    if (knoepfe.length > 0) { teile.push(el('div', { klasse: 'knoepfe detail__knoepfe' }, knoepfe)); }
    teile.push(el('div', { klasse: 'detail__fehler', id: 'detail-fehler' }));

    return el('section', { klasse: 'feldblock' }, teile);
  }

  function zeigeDetail(d) {
    var n = d.nachricht;
    zustand.detail = d;
    zustand.textOriginal = d.entwurf ? d.entwurf.text : '';

    var absender = n.von_name ? n.von_name + ' · ' + n.von_adresse : (n.von_adresse || 'Unbekannter Absender');
    var teile = [
      el('header', { klasse: 'detail__kopf' }, [
        el('h2', { text: n.betreff || '(ohne Betreff)' }),
        absatz('Von ' + absender + ' · ' + zeitLang(n.eingang_am), 'detail__von'),
        marken(d.marken)
      ])
    ];
    if (d.hinweis && d.hinweis.text) {
      teile.push(el('div', { klasse: 'kasten', daten: { farbe: d.hinweis.farbe || 'grau' }, role: d.hinweis.farbe === 'rot' ? 'alert' : null }, [
        d.hinweis.titel ? el('strong', { text: d.hinweis.titel }) : null,
        d.hinweis.text,
        d.darf.unklar_erledigt ? el('div', null, [el('button', { type: 'button', klasse: 'knopf knopf--klein', id: 'k-unklar', text: 'Ich habe nachgesehen – erledigt' })]) : null
      ]));
    }
    var antwort = antwortBlock(d);
    teile.push(el('div', { klasse: antwort ? 'spalten' : null }, [mailBlock(d), antwort]));

    var ort = $('detail');
    ort.replaceChildren.apply(ort, teile);
    verbindeDetailKnoepfe(d);

    $('liste-ansicht').hidden = true;
    $('detail-ansicht').hidden = false;
  }

  function verbindeDetailKnoepfe(d) {
    var id = d.nachricht.id;
    var alle = ['k-senden', 'k-selbst', 'k-neu', 'k-verwerfen', 'k-unklar'].map($).filter(Boolean);
    function bei(knopfId, arbeit) {
      var knopf = $(knopfId);
      if (knopf) { knopf.addEventListener('click', function () { arbeit(alle); }); }
    }
    bei('k-senden', function (k) { senden(d, false, k); });
    bei('k-selbst', function (k) {
      mitSperre(k, function () {
        return aktion('uebernehmen', { nachricht_id: id }).then(function (a) { return nachAktion(a, id); });
      });
    });
    bei('k-neu', function (k) {
      var ersetzt = hatEntwurf(d);
      rueckfrage(ersetzt ? 'Neuen Entwurf erzeugen?' : 'Entwurf erzeugen?', [
        ersetzt ? 'Die KI schreibt die Antwort noch einmal neu. Das kostet einen weiteren Aufruf.'
          : 'Die KI liest die Mail jetzt und schreibt einen Entwurf. Das kostet einen Aufruf.',
        ersetzt ? (textGeaendert() ? 'Ihre Änderungen am Text gehen dabei verloren.' : 'Der jetzige Entwurf wird ersetzt.')
          : 'Gesendet wird erst, wenn Sie den Entwurf gelesen und freigegeben haben.'
      ], ersetzt ? 'Neu erzeugen' : 'Entwurf erzeugen').then(function (ja) {
        if (!ja) { return; }
        mitSperre(k, function () {
          melde('Die KI schreibt … das kann bis zu einer halben Minute dauern.');
          return aktion('neu_erzeugen', { nachricht_id: id }).then(function (a) {
            if (!a.ok) {
              // Der Stand kann sich geändert haben (z. B. inzwischen beantwortet): neu zeigen.
              return Promise.all([ladeDetail(id), ladeStart(true)]).then(function () {
                throw new Fehler(a.fehler || 'Es ist kein neuer Entwurf entstanden.');
              });
            }
            melde(a.meldung || 'Der neue Entwurf ist da.');
            zustand.textOriginal = entwurfFeld() ? entwurfFeld().value : '';
            return Promise.all([ladeDetail(id), ladeStart(true)]);
          });
        });
      });
    });
    bei('k-verwerfen', function (k) { verwerfen(d, k); });
    bei('k-unklar', function (k) {
      rueckfrage('Versand geklärt?', [
        'Bitte nur bestätigen, wenn Sie im Gesendet-Ordner nachgesehen haben.',
        'Ging die Mail nicht raus, antworten Sie bitte im Mailprogramm selbst. Die Nachricht verschwindet danach aus „Zu erledigen“.'
      ], 'Ja, erledigt').then(function (ja) {
        if (!ja) { return; }
        mitSperre(k, function () {
          return aktion('unklar_erledigt', { nachricht_id: id }).then(function (a) { return nachAktion(a, id); });
        });
      });
    });
  }

  /** Nach einer Aktion, die eine Nachricht aus „Zu erledigen“ nimmt: Meldung, zurück zur Liste, Kopf neu. */
  function nachAktion(a, id) {
    if (!a.ok) {
      // Der Stand hat sich geändert (z. B. hat inzwischen jemand anderes gehandelt): neu zeigen.
      return ladeDetail(id).then(function () { throw new Fehler(a.fehler || 'Das hat nicht geklappt.'); });
    }
    melde(a.meldung || 'Erledigt.');
    zustand.textOriginal = entwurfFeld() ? entwurfFeld().value : '';
    zurueckZurListe();
    return ladeStart(true);
  }

  function senden(d, trotzWarnung, knoepfe) {
    var feld = entwurfFeld();
    var id = d.nachricht.id;
    if (!feld || feld.value.trim() === '') {
      zeigeDetailFehler('Der Text ist leer. Bitte erst eine Antwort schreiben.');
      return;
    }
    var name = zustand.bearbeiter !== '' ? Promise.resolve(true) : frageNamen();
    name.then(function (vorhanden) {
      if (!vorhanden) {
        zeigeDetailFehler('Ohne Namen wird nichts gesendet. Bitte oben rechts eintragen, wer bearbeitet.');
        return;
      }
      mitSperre(knoepfe, function () {
        var text = feld.value;
        return aktion('senden', { entwurf_id: d.entwurf.id, text: text, trotz_warnung: trotzWarnung }).then(function (a) {
          if (a.ok) { return nachAktion(a, id); }
          if (a.name_fehlt) {
            zeigeDetailFehler(a.fehler);
            return;
          }
          if (a.bestaetigen) {
            // Der Prüfer hat Bedenken: zeigen und ausdrücklich nachfragen. Erst die Sperre lösen, dann fragen.
            window.setTimeout(function () {
              dialog({
                titel: 'Trotzdem senden?',
                inhalt: [
                  absatz('Der Prüfer hat Hinweise zu diesem Text:'),
                  aufzaehlung(a.warnungen || []),
                  absatz('Bitte nur senden, wenn alles stimmt – die Mail geht so an den Kunden.')
                ],
                knoepfe: [
                  { text: 'Zurück zum Text', wert: false, standard: true },
                  { text: 'Trotzdem senden', wert: true, art: 'haupt' }
                ]
              }).then(function (ja) { if (ja === true) { senden(d, true, knoepfe); } });
            }, 0);
            return;
          }
          if (a.neu_gefuellt) {
            // Die Preise der Website haben sich geändert und der Entwurf wurde neu gefüllt:
            // den neuen Text zeigen. Nichts ist gesendet.
            return ladeDetail(id).then(function () {
              zeigeDetailFehler(a.fehler || 'Der Entwurf wurde neu gefüllt. Bitte noch einmal lesen.', a.warnungen, 'Bitte noch einmal lesen', 'gelb');
              return ladeStart(true);
            });
          }
          // Nicht gesendet. Der Stand kann sich geändert haben (Versand unklar, inzwischen beantwortet):
          // neu laden; bleibt der Entwurf offen, den getippten Text stehen lassen.
          return hole('nachricht', { id: String(id) }).then(function (neu) {
            if (!(neu.darf.senden && neu.entwurf && neu.entwurf.id === d.entwurf.id)) { zeigeDetail(neu); }
            zeigeDetailFehler(a.fehler || 'Die Mail wurde nicht gesendet.', a.warnungen);
            return ladeStart(true);
          });
        });
      });
    });
  }

  /**
   * Verwerfen. Mit Entwurf: Grund wählen (daraus lernt, wer die Regeln der KI nachschärft).
   * Ohne Entwurf (Mail wartet noch auf die KI): kurze Rückfrage, Grund „keine Antwort nötig“.
   */
  function verwerfen(d, knoepfe) {
    var id = d.nachricht.id;
    var gruende = (zustand.start && zustand.start.verwerf_gruende && zustand.start.verwerf_gruende.length)
      ? zustand.start.verwerf_gruende : VERWERF_ERSATZ;
    var frage;
    if (hatEntwurf(d)) {
      var wahl = gruende.map(function (g, i) {
        var radio = el('input', { type: 'radio', name: 'verwerf-grund', value: g.schluessel });
        radio.checked = i === gruende.length - 1;
        return el('label', { klasse: 'wahl' }, [radio, g.name]);
      });
      frage = dialog({
        titel: 'Entwurf verwerfen',
        inhalt: [absatz('Es geht keine Antwort raus. Was hat nicht gepasst?'), el('div', null, wahl)],
        knoepfe: [
          { text: 'Abbrechen', wert: false },
          { text: 'Verwerfen', wert: true, art: 'rot', standard: true }
        ]
      }).then(function (ja) {
        if (ja !== true) { return null; }
        var gewaehlt = document.querySelector('input[name="verwerf-grund"]:checked');
        return gewaehlt ? gewaehlt.value : 'anderes';
      });
    } else {
      frage = rueckfrage('Keine Antwort nötig?', [
        'Die Mail wird abgelegt, die KI schreibt dafür keinen Entwurf. Es geht keine Antwort raus.'
      ], 'Ablegen', 'rot').then(function (ja) { return ja ? 'keine_antwort' : null; });
    }
    frage.then(function (grund) {
      if (grund === null) { return; }
      mitSperre(knoepfe, function () {
        return aktion('verwerfen', { nachricht_id: id, grund: grund }).then(function (a) { return nachAktion(a, id); });
      });
    });
  }

  /** Vorschau der fertigen Mail. Unveränderter Text: die Vorschau vom Server; sonst neu berechnen lassen. */
  function ladeVorschau(nachTippen) {
    var feld = entwurfFeld();
    var ziel = $('vorschau-text');
    var d = zustand.detail;
    if (!feld || !ziel || !d) { return; }
    if (!nachTippen && feld.value === zustand.textOriginal && d.vorschau) {
      ziel.textContent = d.vorschau;
      return;
    }
    if (feld.value.trim() === '') {
      ziel.textContent = 'Noch kein Text.';
      return;
    }
    var nr = ++zustand.vorschauNr;
    schicke('daten.php?was=vorschau', { id: d.nachricht.id, text: feld.value }).then(function (a) {
      if (nr !== zustand.vorschauNr || !ziel.isConnected) { return; }
      ziel.textContent = a.ok ? (a.vorschau || 'Noch kein Text.') : (a.fehler || 'Die Vorschau ist gerade nicht möglich.');
    }, function (e) {
      if (nr === zustand.vorschauNr && ziel.isConnected) { ziel.textContent = e.message; }
    });
  }

  function ladeDetail(id) {
    return hole('nachricht', { id: String(id) }).then(function (d) {
      zeigeDetail(d);
      return d;
    });
  }

  function zeigeListenAnsicht() {
    zustand.detail = null;
    zustand.textOriginal = '';
    zustand.ausListe = false;
    $('detail').replaceChildren();
    $('detail-ansicht').hidden = true;
    $('liste-ansicht').hidden = false;
    ladeListe(false);
  }

  /** Verlässt die Detailansicht. Kam man aus der Liste, über den Verlauf – dann stimmt auch die Zurück-Taste des Handys. */
  function zurueckZurListe() {
    if (zustand.ausListe && window.history.length > 1) {
      zustand.ausListe = false;
      window.history.back();
      return;
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    zeigeListenAnsicht();
  }

  /** Die Adresszeile bestimmt, was zu sehen ist: #nachricht-12 öffnet die Nachricht, sonst die Liste. */
  function nachAdresse() {
    var treffer = /^#nachricht-(\d{1,15})$/.exec(window.location.hash);
    if (!treffer) {
      zeigeListenAnsicht();
      return;
    }
    if (zustand.reiter !== 'posteingang') { zeigeReiter('posteingang', false); }
    ladeDetail(Number(treffer[1])).then(function () {
      $('detail').focus({ preventScroll: true });
      window.scrollTo(0, Math.max(0, $('bereich-posteingang').offsetTop - 8));
    }, function (e) {
      melde(e.message, true);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      zeigeListenAnsicht();
    });
  }

  // -- Verbrauch ---------------------------------------------------------------

  function kennzahl(name, wert, zusatz) {
    return el('div', { klasse: 'kennzahl' }, [
      el('dt', { text: name }),
      el('dd', null, [wert, zusatz ? el('small', { text: zusatz }) : null])
    ]);
  }

  function anteile(titel, gruppen) {
    var summe = gruppen.reduce(function (s, g) { return s + g.usd; }, 0);
    var liste = gruppen.length === 0
      ? absatz('Noch kein Verbrauch.', 'klein')
      : el('ul', { klasse: 'anteile' }, gruppen.map(function (g) {
        var strich = el('i');
        strich.style.width = (summe > 0 ? Math.max(1, (g.usd / summe) * 100) : 0) + '%';
        return el('li', null, [
          el('div', { klasse: 'anteil__kopf' }, [el('span', { text: g.titel || g.name }), el('span', { text: dollar(g.usd) })]),
          el('span', { klasse: 'klein', text: mehrzahl(g.aufrufe, 'Aufruf', 'Aufrufe') }),
          el('span', { klasse: 'balken', 'aria-hidden': 'true' }, [strich])
        ]);
      }));
    return el('div', null, [el('h3', { text: titel }), liste]);
  }

  function saeulen(titel, reihe) {
    var hoechst = reihe.reduce(function (m, r) { return Math.max(m, r.usd); }, 0);
    var wahl = absatz('', 'saeulen__wahl');
    var feld = el('div', { klasse: 'saeulen', role: 'group', 'aria-label': titel });
    function beschreibe(r) { return achsenName(r.name) + ': ' + dollar(r.usd) + ' · ' + mehrzahl(r.aufrufe, 'Aufruf', 'Aufrufe'); }
    reihe.forEach(function (r) {
      var strich = el('i');
      strich.style.height = (hoechst > 0 && r.usd > 0 ? Math.max(2, (r.usd / hoechst) * 100) : 0) + '%';
      var knopf = el('button', { type: 'button', klasse: 'saeule', title: beschreibe(r), 'aria-label': beschreibe(r), 'aria-pressed': 'false', daten: { leer: r.usd > 0 ? '0' : '1' } }, [strich]);
      knopf.addEventListener('click', function () {
        feld.querySelectorAll('[aria-pressed="true"]').forEach(function (k) { k.setAttribute('aria-pressed', 'false'); });
        knopf.setAttribute('aria-pressed', 'true');
        wahl.textContent = beschreibe(r);
      });
      feld.append(knopf);
    });
    if (reihe.length > 0) { wahl.textContent = beschreibe(reihe[reihe.length - 1]); }
    return el('section', { klasse: 'abschnitt' }, [
      el('h2', { text: titel }),
      feld,
      el('div', { klasse: 'saeulen__achse', 'aria-hidden': 'true' }, [
        el('span', { text: reihe.length ? achsenName(reihe[0].name) : '' }),
        el('span', { text: reihe.length ? achsenName(reihe[reihe.length - 1].name) : '' })
      ]),
      wahl,
      absatz('Auf eine Säule tippen zeigt den Betrag.', 'klein')
    ]);
  }

  function zeigeVerbrauch(d) {
    var ort = $('verbrauch');
    ort.replaceChildren(
      el('dl', { klasse: 'kennzahlen' }, [
        kennzahl('Heute', dollar(d.heute.usd), mehrzahl(d.heute.aufrufe, 'Aufruf', 'Aufrufe') + ' · Limit ' + dollar(d.limits.tag_usd)),
        kennzahl('Dieser Monat', dollar(d.monat.usd), mehrzahl(d.monat.aufrufe, 'Aufruf', 'Aufrufe') + ' · Limit ' + dollar(d.limits.monat_usd)),
        kennzahl('Je bearbeiteter Anfrage', dollar(d.kosten_je_anfrage_usd), mehrzahl(d.bearbeitet_monat, 'Anfrage', 'Anfragen') + ' mit Entwurf, '
          + mehrzahl(d.ohne_ki_monat, 'Mail', 'Mails') + ' ohne KI aussortiert (kostenlos)'),
        kennzahl('Je KI-Aufruf', dollar(d.kosten_je_aufruf_usd), 'Durchschnitt in diesem Monat')
      ]),
      el('section', { klasse: 'abschnitt' }, [
        el('h2', { text: 'Aufteilung' }),
        el('div', { klasse: 'dreier' }, [
          anteile('Nach Kanal', d.je_kanal),
          anteile('Nach Modell', d.je_modell),
          anteile('Nach Zweck', d.je_zweck)
        ])
      ]),
      saeulen('Die letzten 30 Tage', d.je_tag),
      saeulen('Die letzten 12 Monate', d.je_monat),
      absatz('Schätzung aus den Token-Zahlen jeder Antwort; maßgeblich ist die Abrechnung bei Anthropic. Preise Stand ' + (d.preise_stand || 'unbekannt') + '.', 'fussnote')
    );
  }

  function ladeVerbrauch() {
    return hole('verbrauch').then(zeigeVerbrauch, function (e) {
      $('verbrauch').replaceChildren(absatz(e.message, 'leer'));
    });
  }

  // -- Einstellungen -----------------------------------------------------------

  /** Zahlen mit Komma zeigen, wie man sie hier schreibt; der Server nimmt Komma und Punkt. */
  function zeigeWert(schluessel, wert) {
    return /_usd$/.test(schluessel) ? String(wert).replace('.', ',') : String(wert);
  }

  function zeigeRegeln(regeln) {
    var ort = $('regeln');
    ort.replaceChildren.apply(ort, regeln.map(function (r) {
      var loeschen = el('button', { type: 'button', klasse: 'knopf knopf--klein', text: 'Löschen', 'aria-label': 'Regel für ' + r.muster + ' löschen' });
      loeschen.addEventListener('click', function () {
        rueckfrage('Regel löschen?', ['Mails von ' + r.muster + ' gehen danach wieder den normalen Weg.'], 'Löschen', 'rot').then(function (ja) {
          if (!ja) { return; }
          mitSperre([loeschen], function () {
            return aktion('absender_regel_loeschen', { id: r.id }).then(function (a) {
              rueckmeldung($('regel-rueckmeldung'), a.ok ? (a.meldung || 'Gelöscht.') : (a.fehler || 'Das hat nicht geklappt.'), !a.ok);
              return ladeEinstellungen();
            });
          });
        });
      });
      return el('li', null, [
        el('span', { klasse: 'regel__text' }, [el('b', { text: r.muster }),
          r.art_name + (r.notiz ? ' · ' + r.notiz : '') + (r.angelegt_am ? ' · seit ' + zeitTeile(r.angelegt_am).tag : '')]),
        loeschen
      ]);
    }));
  }

  function ladeEinstellungen() {
    return hole('einstellungen').then(function (d) {
      zustand.werte = d.werte;
      document.querySelectorAll('#bereich-einstellungen [data-schluessel]').forEach(function (feld) {
        var wert = d.werte[feld.dataset.schluessel];
        if (wert === undefined) { return; }
        if (feld.getAttribute('role') === 'switch') {
          feld.setAttribute('aria-checked', wert === '1' ? 'true' : 'false');
        } else if (document.activeElement !== feld) {
          feld.value = zeigeWert(feld.dataset.schluessel, wert);
          feld.removeAttribute('aria-invalid');
        }
      });
      zeigeRegeln(d.regeln);
      $('technik').textContent = 'Regelwerk der KI: Version ' + (d.prompt_version || 'unbekannt')
        + ' · Angaben der Website vom ' + (d.wissen_stand || 'unbekannt') + '.';
    }, function (e) {
      melde(e.message, true);
    });
  }

  /** Speichert alle geänderten Felder eines Formulars, eines nach dem anderen; beim ersten Fehler ist Schluss. */
  function speichereFormular(ereignis) {
    ereignis.preventDefault();
    var form = ereignis.currentTarget;
    var ausgabe = form.querySelector('.rueckmeldung');
    var knopf = form.querySelector('button[type="submit"]');
    var felder = Array.prototype.slice.call(form.querySelectorAll('[data-schluessel]')).filter(function (feld) {
      return feld.value !== zeigeWert(feld.dataset.schluessel, zustand.werte[feld.dataset.schluessel]);
    });
    form.querySelectorAll('[aria-invalid]').forEach(function (feld) { feld.removeAttribute('aria-invalid'); });
    if (felder.length === 0) {
      rueckmeldung(ausgabe, 'Nichts geändert.', false);
      return;
    }
    mitSperre([knopf], function () {
      var kette = Promise.resolve();
      felder.forEach(function (feld) {
        kette = kette.then(function () {
          return aktion('einstellung', { schluessel: feld.dataset.schluessel, wert: feld.value }).then(function (a) {
            if (!a.ok) {
              feld.setAttribute('aria-invalid', 'true');
              feld.focus();
              throw new Fehler(a.fehler || 'Dieser Wert wurde nicht angenommen.');
            }
            zustand.werte[a.schluessel] = a.wert;
            feld.value = zeigeWert(a.schluessel, a.wert);
          });
        });
      });
      return kette.then(function () {
        rueckmeldung(ausgabe, 'Gespeichert.', false);
        return ladeStart(true);
      }, function (e) {
        rueckmeldung(ausgabe, e.message, true);
      });
    });
  }

  function schalteEinstellung(ereignis) {
    var schalter = ereignis.currentTarget;
    var neu = schalter.getAttribute('aria-checked') !== 'true';
    mitSperre([schalter], function () {
      return aktion('einstellung', { schluessel: schalter.dataset.schluessel, wert: neu ? '1' : '0' }).then(function (a) {
        if (!a.ok) { throw new Fehler(a.fehler || 'Das Umschalten hat nicht geklappt.'); }
        zustand.werte[a.schluessel] = a.wert;
        schalter.setAttribute('aria-checked', a.wert === '1' ? 'true' : 'false');
        rueckmeldung($('schalter-rueckmeldung'), 'Gespeichert.', false);
      });
    });
  }

  function regelHinzufuegen(ereignis) {
    ereignis.preventDefault();
    var form = ereignis.currentTarget;
    var ausgabe = $('regel-rueckmeldung');
    mitSperre([form.querySelector('button[type="submit"]')], function () {
      return aktion('absender_regel', { muster: $('regel-muster').value, art: $('regel-art').value, notiz: $('regel-notiz').value }).then(function (a) {
        rueckmeldung(ausgabe, a.ok ? (a.meldung || 'Gespeichert.') : (a.fehler || 'Das hat nicht geklappt.'), !a.ok);
        if (!a.ok) { $('regel-muster').focus(); return; }
        $('regel-muster').value = '';
        $('regel-notiz').value = '';
        return ladeEinstellungen();
      });
    });
  }

  function kundeLoeschen(ereignis) {
    ereignis.preventDefault();
    var form = ereignis.currentTarget;
    var feld = $('loeschen-adresse');
    var ausgabe = $('loeschen-rueckmeldung');
    var adresse = feld.value.trim();
    if (adresse === '') {
      rueckmeldung(ausgabe, 'Bitte die E-Mail-Adresse des Kunden eingeben.', true);
      feld.focus();
      return;
    }
    rueckfrage('Daten wirklich löschen?', [
      'Alle gespeicherten Mails, Einordnungen und Entwürfe zu dieser Adresse werden aus dem Assistenten gelöscht:',
      el('p', null, [el('b', { text: adresse })]),
      'Das lässt sich nicht rückgängig machen.'
    ], 'Endgültig löschen', 'rot').then(function (ja) {
      if (!ja) { return; }
      mitSperre([form.querySelector('button[type="submit"]')], function () {
        return aktion('kunde_loeschen', { adresse: adresse }).then(function (a) {
          rueckmeldung(ausgabe, a.ok ? (a.meldung || 'Gelöscht.') : (a.fehler || 'Das hat nicht geklappt.'), !a.ok);
          if (a.ok) { feld.value = ''; }
          return ladeStart(true);
        });
      });
    });
  }

  function jetztAbrufen() {
    var ausgabe = $('abruf-rueckmeldung');
    rueckmeldung(ausgabe, 'Abruf läuft … das kann bis zu einer halben Minute dauern.', false);
    mitSperre([$('k-abrufen'), $('k-selbsttest')], function () {
      return aktion('jetzt_abrufen', {}).then(function (a) {
        if (a.fehler) {
          rueckmeldung(ausgabe, a.fehler, true);
          return;
        }
        var text = mehrzahl(a.abgerufen, 'neue Mail', 'neue Mails') + ' eingelesen, '
          + mehrzahl(a.ohne_ki, 'davon ohne KI aussortiert', 'davon ohne KI aussortiert') + ', '
          + mehrzahl(a.entwuerfe, 'Entwurf', 'Entwürfe') + ' entstanden.'
          + (a.hinweis ? ' Hinweis: ' + a.hinweis + '.' : '');
        rueckmeldung(ausgabe, text, !a.ok && !a.hinweis);
        return ladeStart(true);
      }, function (e) {
        rueckmeldung(ausgabe, e.message, true);
      });
    });
  }

  function selbsttest() {
    var ort = $('selbsttest');
    var ausgabe = $('abruf-rueckmeldung');
    rueckmeldung(ausgabe, 'Selbsttest läuft … das kann bis zu einer halben Minute dauern.', false);
    ort.replaceChildren();
    mitSperre([$('k-abrufen'), $('k-selbsttest')], function () {
      return hole('selbsttest').then(function (d) {
        rueckmeldung(ausgabe, d.alles_ok ? 'Alles in Ordnung.' : 'Mindestens ein Punkt ist nicht in Ordnung.', !d.alles_ok);
        ort.replaceChildren.apply(ort, d.punkte.map(function (p) {
          return el('li', { daten: { ok: p.ok ? '1' : '0' } }, [
            el('span', { klasse: 'pruefliste__marke', text: p.ok ? 'in Ordnung' : 'Fehler' }),
            el('div', null, [el('b', { text: p.punkt }), el('span', { text: p.meldung })])
          ]);
        }));
      }, function (e) {
        rueckmeldung(ausgabe, e.message, true);
      });
    });
  }

  // -- Leises Neuladen ---------------------------------------------------------

  /** true, während jemand tippt oder ein Dialog offen ist – dann wird nichts im Hintergrund neu gezeichnet. */
  function wirdGearbeitet() {
    var aktiv = document.activeElement;
    var tippt = !!aktiv && (aktiv.tagName === 'TEXTAREA' || aktiv.tagName === 'INPUT' || aktiv.tagName === 'SELECT');
    return tippt || $('dialog').hasAttribute('open') || zustand.beschaeftigt;
  }

  function leiseNeuLaden() {
    if (document.hidden || wirdGearbeitet()) { return; }
    ladeStart(true);
    if (zustand.reiter === 'posteingang' && !zustand.detail) { ladeListe(true); }
  }

  // -- Start -------------------------------------------------------------------

  function verbinde() {
    $('wer-knopf').addEventListener('click', frageNamen);
    $('ki-schalter').addEventListener('click', schalteKi);
    $('k-sperre').addEventListener('click', sperreAufheben);

    document.querySelectorAll('.reiter__knopf').forEach(function (knopf) {
      knopf.addEventListener('click', function () { zeigeReiter(knopf.dataset.reiter, false); });
      knopf.addEventListener('keydown', reiterTaste);
    });
    document.querySelectorAll('.chip').forEach(function (chip) {
      chip.addEventListener('click', function () { setzeFilter(chip.dataset.filter); });
    });
    $('liste-neuere').addEventListener('click', function () { zustand.seite = Math.max(1, zustand.seite - 1); ladeListe(false); });
    $('liste-aeltere').addEventListener('click', function () { zustand.seite += 1; ladeListe(false); });

    $('detail-zurueck').addEventListener('click', function () {
      if (!textGeaendert()) { zurueckZurListe(); return; }
      rueckfrage('Zurück zur Liste?', ['Ihre Änderungen am Text sind noch nicht gesendet und gehen verloren.'], 'Änderungen verwerfen', 'rot')
        .then(function (ja) { if (ja) { zurueckZurListe(); } });
    });

    ['f-grenzen', 'f-text', 'f-aufbewahrung'].forEach(function (id) { $(id).addEventListener('submit', speichereFormular); });
    document.querySelectorAll('#bereich-einstellungen .schalter').forEach(function (schalter) {
      schalter.addEventListener('click', schalteEinstellung);
    });
    $('f-regel').addEventListener('submit', regelHinzufuegen);
    $('f-loeschen').addEventListener('submit', kundeLoeschen);
    $('k-abrufen').addEventListener('click', jetztAbrufen);
    $('k-selbsttest').addEventListener('click', selbsttest);

    window.addEventListener('hashchange', nachAdresse);
    // Reload oder Tab schließen mit ungesendeten Änderungen: Der Browser fragt nach.
    window.addEventListener('beforeunload', function (ereignis) {
      if (textGeaendert()) { ereignis.preventDefault(); ereignis.returnValue = ''; }
    });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && Date.now() / 1000 - zustand.standZeit > 30) { leiseNeuLaden(); }
    });
    window.setInterval(leiseNeuLaden, NEU_LADEN_MS);
  }

  function los() {
    verbinde();
    setzeBearbeiter(leseBearbeiter());
    ladeStart(false).then(function () {
      nachAdresse();
      // Beim ersten Öffnen einmal fragen, wer am Bildschirm sitzt.
      if (zustand.bearbeiter === '') { frageNamen(); }
    }, function () {
      $('liste-leer').hidden = false;
      $('liste-leer').textContent = 'Die Daten konnten nicht geladen werden. Bitte die Seite neu laden.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', los);
  } else {
    los();
  }
}());
