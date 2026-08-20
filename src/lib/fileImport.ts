import type { Ingredient, Recipe, RecipeStep } from '../db/types'
import { parseIngredientLine } from './ingredientParse'

function toIngredient(raw: unknown): Ingredient {
  if (typeof raw === 'string') {
    // Manche JSON/CSV-Exporte liefern Zutaten als reinen Freitext-String
    // (statt strukturierter quantity/unit/name-Felder) – dieselbe Erkennung
    // wie beim Freitext-/URL-Import nutzen, statt einer eigenen, schwächeren
    // Variante (die z. B. Einheiten nicht validierte und Brüche nicht kannte).
    return parseIngredientLine(raw)
  }
  const r = raw as Partial<Ingredient>
  return { id: crypto.randomUUID(), name: r.name ?? '', quantity: r.quantity ?? null, unit: r.unit ?? '', note: r.note }
}

function toStep(raw: unknown): RecipeStep {
  if (typeof raw === 'string') return { id: crypto.randomUUID(), text: raw }
  const r = raw as Partial<RecipeStep>
  return { id: crypto.randomUUID(), text: r.text ?? '' }
}

export function normalizeImportedRecipe(raw: Record<string, unknown>): Partial<Recipe> {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: String(raw.title ?? raw.name ?? 'Importiertes Rezept'),
    description: raw.description ? String(raw.description) : '',
    category: raw.category ? String(raw.category) : 'Sonstiges',
    cuisine: raw.cuisine ? String(raw.cuisine) : undefined,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : typeof raw.tags === 'string' ? raw.tags.split(/[;,]/).map((s) => s.trim()).filter(Boolean) : [],
    prepTimeMinutes: raw.prepTimeMinutes ? Number(raw.prepTimeMinutes) : undefined,
    cookTimeMinutes: raw.cookTimeMinutes ? Number(raw.cookTimeMinutes) : undefined,
    servings: raw.servings ? Number(raw.servings) : undefined,
    difficulty: raw.difficulty as Recipe['difficulty'],
    ingredients: Array.isArray(raw.ingredients)
      ? raw.ingredients.map(toIngredient)
      : typeof raw.ingredients === 'string'
        ? raw.ingredients.split(/[;|\n]/).map((s) => s.trim()).filter(Boolean).map(toIngredient)
        : [],
    steps: Array.isArray(raw.steps)
      ? raw.steps.map(toStep)
      : typeof raw.steps === 'string'
        ? raw.steps.split(/[;|\n]/).map((s) => s.trim()).filter(Boolean).map(toStep)
        : [],
    images: [],
    links: [],
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl) : undefined,
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

export async function parseJsonFile(file: File): Promise<Partial<Recipe>[]> {
  const text = await file.text()
  const json = JSON.parse(text)
  const arr = Array.isArray(json) ? json : [json]
  return arr.map(normalizeImportedRecipe)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}

export async function parseCsvFile(file: File): Promise<Partial<Recipe>[]> {
  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return []
  const headers = parseCsvLine(lines[0]).map((h) => h.trim())
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const raw: Record<string, unknown> = {}
    headers.forEach((h, i) => (raw[h] = cells[i] ?? ''))
    return normalizeImportedRecipe(raw)
  })
}
