import type { Ingredient, RecipeStep } from '../db/types'

const UNIT_WORDS = ['g', 'kg', 'ml', 'l', 'el', 'tl', 'stk', 'stück', 'prise', 'bund', 'dose', 'zehe', 'scheibe', 'päckchen', 'msp', 'tasse', 'becher']

/**
 * Heuristische Vorstrukturierung von eingefügtem Freitext (z. B. Social-Media-
 * Bildunterschrift oder OCR-Ergebnis) in Zutaten & Schritte. Kein Anspruch auf
 * Perfektion – dient als Startpunkt zum manuellen Nacharbeiten im Formular.
 */
export function parseFreeText(text: string): { ingredients: Ingredient[]; steps: RecipeStep[] } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)

  const ingredients: Ingredient[] = []
  const steps: RecipeStep[] = []

  for (const line of lines) {
    if (/^#/.test(line)) continue // Hashtags überspringen
    const lower = line.toLowerCase()
    const startsWithNumber = /^[\d½¼¾⅓⅔]/.test(line)
    const hasUnit = UNIT_WORDS.some((u) => new RegExp(`\\b${u}\\b`, 'i').test(lower))
    const looksLikeStepNumber = /^\d+[.)]\s/.test(line)
    const isLong = line.length > 70

    if (looksLikeStepNumber || isLong) {
      steps.push({ id: crypto.randomUUID(), text: line.replace(/^\d+[.)]\s*/, '') })
    } else if (startsWithNumber || hasUnit) {
      const m = line.match(/^([\d½¼¾⅓⅔.,/]+)\s*([a-zA-Zäöüß]*)\s+(.*)$/)
      if (m) {
        ingredients.push({ id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: m[2] || '', name: m[3] })
      } else {
        ingredients.push({ id: crypto.randomUUID(), quantity: null, unit: '', name: line })
      }
    } else if (line.length > 0) {
      steps.push({ id: crypto.randomUUID(), text: line })
    }
  }

  return { ingredients, steps }
}

function parseQty(raw: string): number | null {
  const map: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 }
  if (map[raw]) return map[raw]
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
