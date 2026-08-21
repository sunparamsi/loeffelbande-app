/**
 * Rezepte hatten früher genau eine Kategorie (Feld "category", einzelner
 * String). Seit der Mehrfach-Kategorien-Unterstützung ist "categories" (ein
 * Array) die eigentliche Quelle. Diese Funktion liest robust beide Formen -
 * gebraucht an den Stellen, wo Rohdaten (aus IndexedDB, Supabase oder einem
 * älteren JSON-/CSV-Export) in ein Recipe-Objekt übersetzt werden - damit der
 * Rest der App sich immer auf "categories: string[]" verlassen kann, ohne an
 * jeder Anzeige-/Filterstelle erneut auf das alte Feld Rücksicht nehmen zu
 * müssen.
 */
export function normalizeCategories(raw: { categories?: unknown; category?: unknown }): string[] {
  if (Array.isArray(raw.categories)) {
    const cleaned = raw.categories.map(String).map((c) => c.trim()).filter(Boolean)
    if (cleaned.length > 0) return cleaned
  }
  if (typeof raw.category === 'string' && raw.category.trim()) return [raw.category.trim()]
  return []
}

/** Kategorien für die Anzeige zusammenfassen (z. B. "Hauptgericht, Suppe"). */
export function formatCategories(categories: string[]): string {
  return categories.join(', ')
}
