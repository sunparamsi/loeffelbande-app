import type { Ingredient, Recipe, RecipeStep } from '../db/types'
import { isJunkStepLine, stripInjectedContent } from './stepClean'
import { parseIngredientLine } from './ingredientParse'
import { fileToCompressedDataUrl } from './image'

/**
 * Zieht die Bild-URL aus dem schema.org "image"-Feld. Das Feld ist in freier
 * Wildbahn uneinheitlich: mal ein einzelner String, mal ein ImageObject
 * ({ "@type": "ImageObject", url: "..." }), mal ein Array aus einem der
 * beiden - manchmal sogar verschachtelt. Ohne diese Fallunterscheidung landet
 * bei einem ImageObject/Array-von-ImageObjects ein rohes JS-Objekt in
 * String(...), also der Text "[object Object]" statt einer echten URL - das
 * Bild erscheint dann im Formular als kaputtes Bild-Icon.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractImageUrl(image: any): string | undefined {
  if (!image) return undefined
  if (Array.isArray(image)) return extractImageUrl(image[0])
  if (typeof image === 'string') return image
  if (typeof image === 'object') {
    if (typeof image.url === 'string') return image.url
    if (typeof image['@id'] === 'string') return image['@id']
  }
  return undefined
}

/** Löst eine (ggf. relative oder protokoll-relative) Bild-URL gegen die
 * Quellseiten-URL auf. Manche Seiten liefern nur einen Pfad statt einer
 * vollständigen URL. */
function resolveImageUrl(maybeRelative: string, pageUrl: string): string | undefined {
  try {
    return new URL(maybeRelative, pageUrl).href
  } catch {
    return undefined
  }
}

/** Lädt das Bild herunter und speichert es als komprimierte Data-URL - genau
 * wie bei manuell hochgeladenen Fotos (image.ts) - statt nur einen externen
 * Link zu merken. So bleibt das importierte Rezept auch offline nutzbar und
 * unabhängig davon, ob das Bild auf der Quellseite später verschwindet.
 * Klappt der Download nicht (z. B. weil der Bild-Host kein CORS erlaubt),
 * wird die aufgelöste URL direkt zurückgegeben - im Browser online zeigt ein
 * <img src="..."> sie meist trotzdem an, offline dann eben nicht. Besser als
 * ein von vornherein kaputtes Bild. */
async function fetchImageAsDataUrl(imageUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(imageUrl, { mode: 'cors' })
    if (!res.ok) return imageUrl
    const blob = await res.blob()
    if (!blob.type.startsWith('image/')) return imageUrl
    return await fileToCompressedDataUrl(blob)
  } catch {
    return imageUrl
  }
}

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

  const rawImageUrl = extractImageUrl(n.image)
  const resolvedImageUrl = rawImageUrl ? resolveImageUrl(rawImageUrl, url) : undefined
  const imageDataUrl = resolvedImageUrl ? await fetchImageAsDataUrl(resolvedImageUrl) : undefined

  return {
    title: n.name ?? '',
    description: n.description ?? '',
    prepTimeMinutes: isoDurationToMinutes(n.prepTime),
    cookTimeMinutes: isoDurationToMinutes(n.cookTime),
    servings: n.recipeYield ? parseInt(String(n.recipeYield), 10) || undefined : undefined,
    // Explizit auf ['Hauptgericht'] zurückfallen statt "categories: undefined"
    // zu liefern: beim Zusammenführen mit dem leeren Rezept-Grundgerüst in
    // RecipeFormPage.tsx (`{ ...emptyRecipe(), ...prefill }`) würde ein
    // vorhandener, aber undefined-wertiger "categories"-Schlüssel dessen
    // Default (['Hauptgericht']) überschreiben - und da überall im Code von
    // einem garantiert vorhandenen Array ausgegangen wird (.length, .includes,
    // .join), stürzt das Formular dann beim Rendern ab. Kommt in der Praxis
    // öfter vor, als man denkt: viele Rezeptseiten liefern gar kein
    // "recipeCategory"-Feld.
    categories: n.recipeCategory ? [String(n.recipeCategory)] : ['Hauptgericht'],
    tags: n.keywords ? String(n.keywords).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    ingredients,
    steps,
    images: imageDataUrl ? [{ id: crypto.randomUUID(), dataUrl: imageDataUrl }] : [],
    sourceUrl: url,
  }
}
