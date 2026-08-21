import type { Ingredient, Recipe } from '../db/types'

// Schlägt bereits im eigenen Rezeptbestand verwendete Tags vor, basierend
// darauf, wie ähnlich die Zutatenliste des aktuellen Rezepts der Zutatenliste
// anderer, bereits getaggter Rezepte ist. Reiner Vorschlag zum Antippen -
// nichts wird automatisch gesetzt (siehe dietTags.ts für die separate,
// eigenständige Vegan/Vegetarisch-Erkennung).
//
// Heuristik: pro Kandidaten-Rezept wird die Überschneidung der (normalisierten)
// Zutatennamen gezählt. Erst ab einer Mindestanzahl gemeinsamer Zutaten UND
// einem Mindest-Überschneidungsanteil zählt ein Tag als Treffer - sonst würden
// z. B. zwei Rezepte, die zufällig beide "Salz" enthalten, schon als "ähnlich"
// gelten. Der höchste Überschneidungsanteil über alle Rezepte mit diesem Tag
// bestimmt die Rangfolge der Vorschläge.
const MIN_SHARED_INGREDIENTS = 2
const MIN_OVERLAP_RATIO = 0.34
const MAX_SUGGESTIONS = 5

function normalizeIngredientName(name: string): string {
  return name.trim().toLowerCase()
}

function ingredientNameSet(ingredients: Ingredient[]): Set<string> {
  return new Set(ingredients.map((i) => normalizeIngredientName(i.name)).filter(Boolean))
}

export function suggestExistingTags(
  ingredients: Ingredient[],
  otherRecipes: Recipe[],
  excludeTags: string[] = [],
): string[] {
  const current = ingredientNameSet(ingredients)
  if (current.size === 0) return []
  const exclude = new Set(excludeTags)

  const bestRatioByTag = new Map<string, number>()

  for (const candidate of otherRecipes) {
    if (candidate.tags.length === 0) continue
    const other = ingredientNameSet(candidate.ingredients)
    if (other.size === 0) continue

    let shared = 0
    for (const name of other) {
      if (current.has(name)) shared++
    }
    if (shared < MIN_SHARED_INGREDIENTS) continue

    const ratio = shared / Math.min(current.size, other.size)
    if (ratio < MIN_OVERLAP_RATIO) continue

    for (const tag of candidate.tags) {
      if (exclude.has(tag)) continue
      const prevBest = bestRatioByTag.get(tag) ?? 0
      if (ratio > prevBest) bestRatioByTag.set(tag, ratio)
    }
  }

  return Array.from(bestRatioByTag.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_SUGGESTIONS)
    .map(([tag]) => tag)
}
