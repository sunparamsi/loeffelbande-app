import type { Ingredient, Recipe, RecipeStep } from '../db/types'

function isoDurationToMinutes(iso?: string): number | undefined {
  if (!iso) return undefined
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!m) return undefined
  const h = m[1] ? Number(m[1]) : 0
  const min = m[2] ? Number(m[2]) : 0
  return h * 60 + min || undefined
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findRecipeNode(json: any): any | null {
  if (!json) return null
  const arr = Array.isArray(json) ? json : [json]
  for (const item of arr) {
    if (!item) continue
    const type = item['@type']
    const types = Array.isArray(type) ? type : [type]
    if (types.includes('Recipe')) return item
    if (item['@graph']) {
      const found = findRecipeNode(item['@graph'])
      if (found) return found
    }
  }
  return null
}

/**
 * Versucht, ein Rezept per schema.org/Recipe (JSON-LD) von einer Webseiten-URL
 * zu importieren. Funktioniert nur bei Seiten, die (a) strukturierte
 * Rezeptdaten einbetten und (b) den Cross-Origin-Zugriff aus dem Browser
 * erlauben (CORS) – andernfalls wird null zurückgegeben und der Nutzer landet
 * im leeren, manuellen Formular mit vorausgefüllter Quelle.
 */
export async function importFromUrl(url: string): Promise<Partial<Recipe> | null> {
  let html: string
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    html = await res.text()
  } catch {
    return null
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  const scripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))
  let node: unknown = null
  for (const script of scripts) {
    try {
      const json = JSON.parse(script.textContent ?? '')
      node = findRecipeNode(json)
      if (node) break
    } catch {
      /* ungültiges JSON überspringen */
    }
  }
  if (!node) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const n = node as any

  const ingredients: Ingredient[] = (n.recipeIngredient ?? n.ingredients ?? []).map((line: string) => {
    const m = String(line).match(/^([\d½¼¾⅓⅔.,/]+)\s*([a-zA-Zäöüß]*)\s+(.*)$/)
    if (m) return { id: crypto.randomUUID(), quantity: Number(m[1].replace(',', '.')) || null, unit: m[2] || '', name: m[3] }
    return { id: crypto.randomUUID(), quantity: null, unit: '', name: String(line) }
  })

  let rawSteps: string[] = []
  if (Array.isArray(n.recipeInstructions)) {
    rawSteps = n.recipeInstructions.map((s: unknown) =>
      typeof s === 'string' ? s : (s as { text?: string; name?: string })?.text || (s as { name?: string })?.name || '',
    )
  } else if (typeof n.recipeInstructions === 'string') {
    rawSteps = n.recipeInstructions.split(/\n+/)
  }
  const steps: RecipeStep[] = rawSteps.filter(Boolean).map((text) => ({ id: crypto.randomUUID(), text }))

  const image = Array.isArray(n.image) ? n.image[0] : typeof n.image === 'object' ? n.image?.url : n.image

  return {
    title: n.name ?? '',
    description: n.description ?? '',
    prepTimeMinutes: isoDurationToMinutes(n.prepTime),
    cookTimeMinutes: isoDurationToMinutes(n.cookTime),
    servings: n.recipeYield ? parseInt(String(n.recipeYield), 10) || undefined : undefined,
    category: n.recipeCategory ? String(n.recipeCategory) : undefined,
    tags: n.keywords ? String(n.keywords).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    ingredients,
    steps,
    images: image ? [{ id: crypto.randomUUID(), dataUrl: String(image) }] : [],
    sourceUrl: url,
  }
}
