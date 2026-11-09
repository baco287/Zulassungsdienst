/**
 * Zuletzt gewählte Leistung (Konfigurator, Leistungsseite) für die mobile
 * Aktionsleiste. Liegt nur in der Sitzung des Browsers; ist der Speicher
 * gesperrt (Privatmodus, Vorschau), führt die Leiste einfach ohne Vorauswahl
 * zum Formular.
 */
const KEY = "dz:leistung";

export function merkeLeistung(slug: string): void {
  try {
    sessionStorage.setItem(KEY, slug);
  } catch {
    /* Speicher nicht verfügbar */
  }
}

export function gemerkteLeistung(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
