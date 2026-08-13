/**
 * Die 7 Schritte des Zulassungsablaufs.
 * Gemeinsame Datenquelle für die animierte Timeline (components/ProcessTimeline.tsx)
 * und das HowTo-JSON-LD auf /ablauf.
 */
export const processSteps = [
  {
    title: "Dienstleistung auswählen",
    text: "Neuzulassung, Ummeldung, Abmeldung oder mehr – Sie wählen die passende Leistung und sehen sofort, welche Unterlagen benötigt werden.",
  },
  {
    title: "Daten eingeben & Dokumente hochladen",
    text: "Fahrzeug- und Kontaktdaten eintragen, Unterlagen als Foto oder Scan übermitteln – per Formular oder bequem über WhatsApp.",
  },
  {
    title: "Auftrag digital bestätigen",
    text: "Sie erhalten unsere Festpreis-Bestätigung samt Vollmacht digital. Eine Unterschrift – und wir legen los.",
  },
  {
    title: "Wir prüfen Ihre Unterlagen",
    text: "Ihre persönliche Ansprechperson kontrolliert alles auf Vollständigkeit und klärt offene Punkte direkt mit Ihnen.",
  },
  {
    title: "Zulassung wird durchgeführt",
    text: "Wir führen den Vorgang bei der zuständigen Zulassungsbehörde durch – digital über das i-Kfz-Verfahren oder, wo nötig, persönlich vor Ort.",
  },
  {
    title: "Kennzeichen & Dokumente kommen zu Ihnen",
    text: "Fertige Papiere und geprägte, gesiegelte Kennzeichen werden versichert versendet oder – regional – persönlich vorbeigebracht.",
  },
  {
    title: "Fertig – ohne einen einzigen Behördengang",
    text: "Sie erhalten die Abschlussbestätigung. Bei Abmeldungen ist das oft schon am selben Werktag der Fall.",
  },
] as const;
