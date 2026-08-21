/** Bekannte Mengeneinheiten (Deutsch + Englisch, da importierte/gescannte
 * Rezepte oft von englischsprachigen Quellen stammen). Zentral gepflegt,
 * damit URL-Import, Freitext-Parsing (Foto/PDF/Social) und ggf. weitere
 * Importwege dieselbe Erkennung nutzen. */
export const UNIT_WORDS = [
  // Deutsch (inkl. gängiger Pluralformen, da Freitext/OCR beide Formen liefert)
  'g', 'kg', 'ml', 'l', 'el', 'tl', 'stk', 'stück', 'stücke', 'prise', 'prisen', 'bund', 'bunde', 'dose', 'dosen', 'zehe', 'zehen',
  'scheibe', 'scheiben', 'päckchen', 'msp', 'tasse', 'tassen', 'becher', 'pck', 'pck.', 'packung', 'packungen',
  // Englisch
  'cup', 'cups', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds', 'tbsp', 'tbsp.', 'tablespoon', 'tablespoons', 'tsp', 'tsp.', 'teaspoon', 'teaspoons',
  'clove', 'cloves', 'can', 'cans', 'package', 'packages', 'pkg', 'slice', 'slices', 'pinch', 'bunch', 'stick', 'sticks', 'quart', 'quarts', 'pint', 'pints', 'gallon', 'gallons',
]

/** Nicht-metrische Maßeinheiten (US/UK), die automatisch nach Gramm/Kilo
 * (Gewicht) bzw. Milliliter/Liter (Volumen) umgerechnet werden, damit
 * importierte Rezepte aus englischsprachigen Quellen mit metrischen Angaben
 * angezeigt werden. Umgerechnet wird nur, was eindeutig ist (Gewicht bzw.
 * Volumen) – bei Volumeneinheiten wie "cup" bleibt es bei ml/l, da eine
 * Umrechnung in Gramm von der Dichte der jeweiligen Zutat abhinge (z. B. 1
 * Tasse Mehl ≠ 1 Tasse Zucker in Gramm) und ohne Zutaten-Datenbank nicht
 * zuverlässig möglich ist. */
const MASS_TO_GRAMS: Record<string, number> = {
  oz: 28.3495,
  ounce: 28.3495,
  ounces: 28.3495,
  lb: 453.592,
  lbs: 453.592,
  pound: 453.592,
  pounds: 453.592,
}

const VOLUME_TO_ML: Record<string, number> = {
  cup: 236.588,
  cups: 236.588,
  tbsp: 14.7868,
  'tbsp.': 14.7868,
  tablespoon: 14.7868,
  tablespoons: 14.7868,
  tsp: 4.92892,
  'tsp.': 4.92892,
  teaspoon: 4.92892,
  teaspoons: 4.92892,
  pint: 473.176,
  pints: 473.176,
  quart: 946.353,
  quarts: 946.353,
  gallon: 3785.41,
  gallons: 3785.41,
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Einheiten, die als feste Abkürzung immer großgeschrieben werden (deutsche
 * Konvention: "EL"/"TL" für Ess-/Teelöffel – anders als metrische Einheiten
 * wie "g"/"ml"/"kg", die klein bleiben). Wird sowohl beim Parsen als auch bei
 * der Anzeige angewendet, damit auch schon gespeicherte Rezepte (z. B. aus
 * älteren Imports mit "el"/"tl") korrekt dargestellt werden. */
const UPPERCASE_UNITS: Record<string, string> = { el: 'EL', tl: 'TL' }

/** Einheiten, die auf eine einheitliche Abkürzung normalisiert werden, damit
 * unterschiedliche Schreibweisen aus Imports/Freitext gleich dargestellt
 * werden - "Packung"/"Packungen" bzw. "Pck." werden auf die kurze Form "Pck"
 * normalisiert (statt ausgeschrieben), das ist die bevorzugte Darstellung. */
const EXPAND_UNITS: Record<string, string> = { pck: 'Pck', 'pck.': 'Pck', packung: 'Pck', packungen: 'Pck' }

/** Einheiten, die trotz kleingeschriebener Speicherung mit ihrer natürlichen
 * (groß geschriebenen) Form angezeigt werden sollen, z. B. "Prise"/"Prisen" -
 * anders als bei UPPERCASE_UNITS keine reine Abkürzung, sondern ein normales
 * Substantiv, das nur den ersten Buchstaben groß schreibt. */
const TITLECASE_UNITS: Record<string, string> = { prise: 'Prise', prisen: 'Prisen' }

export function formatUnit(unit: string): string {
  const trimmed = unit.trim()
  const lower = trimmed.toLowerCase()
  return UPPERCASE_UNITS[lower] ?? EXPAND_UNITS[lower] ?? TITLECASE_UNITS[lower] ?? trimmed
}

/** Erkennt eine Einheit robuster als ein reiner UNIT_WORDS-Abgleich, indem
 * eine häufige OCR-/Foto-Scan-Verwechslung mitbehandelt wird: ein
 * groß-"I" wird beim Scannen oft mit einem klein-"l" verwechselt (beide
 * Zeichen sehen sich in vielen – insbesondere serifenlosen – Schriften zum
 * Verwechseln ähnlich), sodass z. B. "lbs" als "Ibs" erkannt wird. Ohne diese
 * Korrektur würde "Ibs" nicht als Einheit erkannt und stattdessen in den
 * Zutatennamen rutschen. Liefert die kanonische (korrekt geschriebene)
 * Einheit zurück (für convertToMetric()) oder null, wenn keine Einheit
 * erkannt wurde. */
export function matchUnitWord(token: string): string | null {
  const raw = token.trim()
  if (!raw) return null
  const lower = raw.toLowerCase()
  if (UNIT_WORDS.includes(lower)) return lower
  if (raw[0] === 'I') {
    const corrected = `l${lower.slice(1)}`
    if (UNIT_WORDS.includes(corrected)) return corrected
  }
  return null
}

/** Rechnet Menge/Einheit einer Zutat auf metrische Einheiten um, falls die
 * Einheit eine bekannte nicht-metrische Gewichts- oder Volumeneinheit ist
 * (z. B. "1 lb" -> "453.6 g", "2 cups" -> "473.2 ml"). Unbekannte oder
 * bereits metrische Einheiten (g, kg, ml, l, Stück, …) bleiben unverändert. */
export function convertToMetric(quantity: number | null, unit: string): { quantity: number | null; unit: string } {
  if (quantity == null) return { quantity, unit }
  const key = unit.trim().toLowerCase()
  if (key in MASS_TO_GRAMS) {
    const grams = quantity * MASS_TO_GRAMS[key]
    return grams >= 1000 ? { quantity: round1(grams / 1000), unit: 'kg' } : { quantity: round1(grams), unit: 'g' }
  }
  if (key in VOLUME_TO_ML) {
    const ml = quantity * VOLUME_TO_ML[key]
    return ml >= 1000 ? { quantity: round1(ml / 1000), unit: 'l' } : { quantity: round1(ml), unit: 'ml' }
  }
  return { quantity, unit }
}
