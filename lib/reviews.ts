/**
 * Echte Kundenbewertungen.
 *
 * NUR ECHTE, ÜBERPRÜFBARE BEWERTUNGEN eintragen – z. B. aus dem
 * Google-Unternehmensprofil, mit Link zur Originalbewertung. Erfundene,
 * gekaufte oder als „Beispiel“ formulierte Stimmen sind unzulässig
 * (§ 5 und § 5b UWG). Solange die Liste leer ist, zeigt die Website KEINE
 * Bewertungen und KEINE Sterne an.
 *
 * Vor dem Eintragen: Zustimmung bzw. Nutzungsrechte prüfen (Google-Richtlinien
 * für die Anzeige von Rezensionen) und nur Vornamen oder Initialen verwenden.
 */
export interface Review {
  /** Vorname oder Initiale, wie in der Originalbewertung. */
  author: string;
  /** Sterne 1–5, wie in der Originalbewertung. */
  rating: 1 | 2 | 3 | 4 | 5;
  /** Wörtlicher Text der Originalbewertung (gekürzt nur mit „…“). */
  text: string;
  /** ISO-Datum der Originalbewertung. */
  date: string;
  /** Plattform, z. B. "Google". */
  source: string;
  /** Link zur Originalbewertung bzw. zum Profil. */
  url: string;
  /** Vorgang, falls aus der Bewertung erkennbar. */
  service?: string;
}

export const reviews: Review[] = [];

/**
 * Link zum Google-Unternehmensprofil (Rezensionen), sobald vorhanden.
 * Wird für den Bewertungs-Link in E-Mails und auf der Website genutzt.
 * Leer lassen, solange es kein Profil gibt.
 */
export const googleReviewUrl = process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL ?? "";

/** Durchschnitt nur aus echten Bewertungen; null, wenn keine vorhanden. */
export function averageRating(): { value: number; count: number } | null {
  if (reviews.length === 0) return null;
  const sum = reviews.reduce((s, r) => s + r.rating, 0);
  return { value: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}
