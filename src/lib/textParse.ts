import type { Ingredient, RecipeStep } from '../db/types'
import { UNIT_WORDS } from './units'

const INGREDIENTS_HEADER_RE = /^(ingredients?|zutaten)\s*:?$/i
const METHOD_HEADER_RE = /^(method|instructions?|directions?|zubereitung|preparation|steps?)\s*:?$/i
// Kurze Zwischenüberschriften innerhalb der Zutaten-/Zubereitungsliste
// (z. B. "For the pastry", "To finish", "Zum Garnieren") – bewusst eng
// gefasst (kurz, nur Buchstaben), damit ein echter Schritt wie "For the
// last 5 minutes, stir occasionally." nicht versehentlich verschluckt wird.
const SUB_HEADER_RE = /^(for the [a-zäöüß\s]{2,25}|für (den|die|das) [a-zäöüß\s]{2,25}|to finish|garnish(es)?|topping[s]?|serving suggestion|zum servieren|zum garnieren|for garnishing|to serve)\s*:?$/i

/**
 * Heuristische Vorstrukturierung von eingefügtem Freitext (Social-Media-
 * Bildunterschrift, OCR- oder PDF-Ergebnis) in Zutaten & Schritte. Kein
 * Anspruch auf Perfektion – dient als Startpunkt zum manuellen Nacharbeiten
 * im Formular.
 *
 * Wenn im Text klar erkennbare Abschnittsüberschriften vorkommen (z. B.
 * "Zutaten" … "Zubereitung" bzw. "Ingredients" … "Method"), wird strukturell
 * anhand dieser Abschnitte aufgeteilt: ALLES zwischen den Überschriften zählt
 * zur jeweiligen Kategorie, auch Zutaten ohne führende Zahl/Einheit (z. B.
 * "Flaky sea salt"), die sonst fälschlich als Zubereitungsschritt gelandet
 * wären. Ohne erkennbare Überschriften greift die alte zeilenweise Heuristik.
 */
export function parseFreeText(text: string): { ingredients: Ingredient[]; steps: RecipeStep[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)
    .filter((l) => !/^#/.test(l)) // Hashtags überspringen

  const ingredientsHeaderIdx = lines.findIndex((l) => INGREDIENTS_HEADER_RE.test(l))
  const methodSearchStart = ingredientsHeaderIdx >= 0 ? ingredientsHeaderIdx + 1 : 0
  const methodHeaderIdx = lines.findIndex((l, i) => i >= methodSearchStart && METHOD_HEADER_RE.test(l))

  if (methodHeaderIdx >= 0) {
    const ingredientZone = lines.slice(ingredientsHeaderIdx >= 0 ? ingredientsHeaderIdx + 1 : 0, methodHeaderIdx)
    const stepZone = lines.slice(methodHeaderIdx + 1)

    const ingredients = ingredientZone.filter((l) => !SUB_HEADER_RE.test(l)).map(parseIngredientLine)
    const steps = stepZone
      .filter((l) => !SUB_HEADER_RE.test(l))
      .map((l) => ({ id: crypto.randomUUID(), text: l.replace(/^\d+[.)]\s*/, '') }))

    return { ingredients, steps }
  }

  // Kein klarer Zutaten-/Zubereitungs-Abschnitt gefunden (z. B. kurze
  // Social-Media-Bildunterschrift) – Fallback: zeilenweise entscheiden.
  const ingredients: Ingredient[] = []
  const steps: RecipeStep[] = []

  for (const line of lines) {
    const lower = line.toLowerCase()
    const startsWithNumber = /^[\d½¼¾⅓⅔]/.test(line)
    const hasUnit = UNIT_WORDS.some((u) => new RegExp(`\\b${escapeRegExp(u)}\\b`, 'i').test(lower))
    const looksLikeStepNumber = /^\d+[.)]\s/.test(line)
    const isLong = line.length > 70

    if (looksLikeStepNumber || isLong) {
      steps.push({ id: crypto.randomUUID(), text: line.replace(/^\d+[.)]\s*/, '') })
    } else if (startsWithNumber || hasUnit) {
      ingredients.push(parseIngredientLine(line))
    } else if (line.length > 0) {
      steps.push({ id: crypto.randomUUID(), text: line })
    }
  }

  return { ingredients, steps }
}

/** Zerlegt eine Zutatenzeile in Menge/Einheit/Name. Das Wort nach der Zahl
 * wird nur dann als Einheit behandelt, wenn es in UNIT_WORDS vorkommt –
 * sonst gehört es zum Namen (verhindert z. B., dass bei "2 Zwiebeln"
 * "Zwiebeln" fälschlich als Einheit erkannt und der Name leer wird). Zeilen
 * ganz ohne führende Zahl (z. B. "Flaky sea salt") landen komplett im Namen. */
function parseIngredientLine(line: string): Ingredient {
  const m = line.match(/^([\d½¼¾⅓⅔.,/]+)\s*([a-zA-Zäöüß.]*)\s*(.*)$/)
  if (m && UNIT_WORDS.includes(m[2].toLowerCase())) {
    return { id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: m[2], name: m[3] }
  }
  if (m && m[2] && !m[3]) {
    return { id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: '', name: m[2] }
  }
  if (m && m[1] && (m[2] || m[3])) {
    return { id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: '', name: `${m[2]} ${m[3]}`.trim() }
  }
  return { id: crypto.randomUUID(), quantity: null, unit: '', name: line }
}

function parseQty(raw: string): number | null {
  const map: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 }
  if (map[raw]) return map[raw]
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
