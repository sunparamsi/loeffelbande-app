import type { Ingredient, Recipe, RecipeStep } from '../db/types'
import { isJunkStepLine, stripInjectedContent } from './stepClean'
import { parseIngredientLine } from './ingredientParse'

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

  const rawIngredients: Ingredient[] = (n.recipeIngredient ?? n.ingredients ?? []).map((line: string) => parseIngredientLine(String(line)))

  // Manche Seiten liefern kaputte/inkonsistente Rezept-Strukturdaten (das
  // eingebettete JSON-LD stimmt nicht mit dem sichtbaren Text der Seite
  // überein – z. B. wenn ein Rezept-Plugin für die Nährwertberechnung
  // Mengen wie "250 g" pro Zutat einträgt statt der echten Zutatenzeile).
  // Erkennbar daran, dass mehrere Zutaten exakt dieselbe Menge/Einheit
  // haben und dabei kein Name übrig bleibt. In dem Fall ist die Zutatenliste
  // wertlos – dann lieber leer lassen, als falsche Zeilen anzuzeigen.
  const looksBroken =
    rawIngredients.length > 2 &&
    rawIngredients.every((i) => !i.name.trim()) &&
    new Set(rawIngredients.map((i) => `${i.quantity}|${i.unit}`)).size === 1
  // Zusätzlich (unabhängig vom obigen Fall): Einzelne Zeilen ganz ohne Namen
  // sind für sich genommen nutzlos (z. B. wenn die Quellseite nur "250 g"
  // ohne Zutatentext liefert) – so eine Zeile zeigt am Ende nur Menge/Einheit
  // ohne erkennbare Zutat an, was wie ein Darstellungsfehler aussieht. Lieber
  // weglassen, als eine leere "Geister-Zutat" anzuzeigen.
  const ingredients = (looksBroken ? [] : rawIngredients).filter((i) => i.name.trim().length > 0)

  let rawSteps: string[] = []
  if (Array.isArray(n.recipeInstructions)) {
    rawSteps = n.recipeInstructions.map((s: unknown) =>
      typeof s === 'string' ? s : (s as { text?: string; name?: string })?.text || (s as { name?: string })?.name || '',
    )
  } else if (typeof n.recipeInstructions === 'string') {
    rawSteps = n.recipeInstructions.split(/\n+/)
  }
  // Manche Quell-Webseiten liefern fehlerhafte/inkonsistente structured data,
  // bei der sich mehrere Rezepte vermischen (z. B. ein Beilagen-Rezept mitten
  // in einem Zubereitungsschritt des Hauptrezepts) oder bei der Social-Media-
  // Werbetext ("Kommentiere 'Rezept', ich schicke es dir per DM") als Schritt
  // durchrutscht. Pro Schritt bereinigen, komplett auf solchen Fremdinhalt
  // reduzierte Schritte danach ganz weglassen.
  const steps: RecipeStep[] = rawSteps
    .filter(Boolean)
    .map((text) => (isJunkStepLine(text) ? '' : stripInjectedContent(text)))
    .filter((text) => text.trim().length > 0)
    .map((text) => ({ id: crypto.randomUUID(), text }))

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
