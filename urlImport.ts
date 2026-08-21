import type { Ingredient, Recipe, RecipeStep } from '../db/types'
import { isJunkStepLine, stripInjectedContent } from './stepClean'
import { parseIngredientLines } from './ingredientParse'
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
    // Manche Seiten betten das Rezept nicht als Top-Level-Knoten oder in
    // "@graph" ein, sondern verschachtelt als "mainEntity" einer WebPage/
    // Article (typisch für einige CMS-Templates/Plugins) - z. B.
    // { "@type": "WebPage", "mainEntity": { "@type": "Recipe", ... } }.
    if (item.mainEntity) {
      const found = findRecipeNode(item.mainEntity)
      if (found) return found
    }
  }
  return null
}

/** Entfernt HTML-Tags und dekodiert HTML-Entities aus einem Text-Feld. Manche
 * Rezept-Plugins (v. a. ältere WordPress-Plugins) schreiben in JSON-LD-
 * Textfelder (Zutaten, Zubereitungsschritte, Beschreibung) nicht reinen Text,
 * sondern das gerenderte HTML-Fragment ("<p>Den Ofen auf 180°C
 * vorheizen.</p>" statt "Den Ofen auf 180°C vorheizen."). Ohne diese
 * Bereinigung tauchen die Tags/Entities (&amp;, &nbsp;, <strong> etc.) 1:1 im
 * importierten Rezept auf. "<br>"/"</p>"/"</li>" werden vorher durch
 * Zeilenumbrüche ersetzt, damit z. B. "Schritt 1.<br>Schritt 2." nicht zu
 * einem zusammenhangslosen "Schritt 1.Schritt 2." verschmilzt.
 */
function htmlToText(raw: string): string {
  if (!raw || !/[<&]/.test(raw)) return raw.trim()
  const withBreaks = raw.replace(/<\s*(br|\/p|\/li|\/div)\s*\/?>/gi, '\n')
  const el = document.createElement('div')
  el.innerHTML = withBreaks
  return (el.textContent ?? '').replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim()
}

/** Falls ein String mehrere HTML-Listenpunkte enthält (manche Seiten liefern
 * "recipeInstructions" nicht als Array, sondern als ein einziger String mit
 * eingebettetem "<ol><li>...</li><li>...</li></ol>"), wird er in einzelne
 * Schritte aufgeteilt statt als ein einziger Klumpen-Schritt zu landen. */
function splitHtmlListString(raw: string): string[] {
  if (/<li[\s>]/i.test(raw)) {
    const items = Array.from(raw.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((m) => htmlToText(m[1]))
    if (items.length > 1) return items.filter(Boolean)
  }
  return [htmlToText(raw)]
}

/**
 * "recipeInstructions" ist im schema.org-Standard uneinheitlich umgesetzt:
 * mal ein einzelner String, mal ein Array aus Strings, mal ein Array aus
 * HowToStep-Objekten ({ "@type": "HowToStep", "text": "..." }), mal - v. a.
 * bei Rezepten mit mehreren Komponenten (Hauptteil + Sauce/Topping/Füllung) -
 * ein Array aus HowToSection-Objekten, die selbst wieder eine verschachtelte
 * "itemListElement"-Liste aus HowToStep enthalten. Ohne Behandlung dieses
 * dritten Falls liefert `s.text || s.name` bei einer HowToSection nur ihren
 * Abschnittsnamen (oder nichts) zurück - die eigentlichen, verschachtelten
 * Zubereitungsschritte gehen komplett verloren. Das ist vermutlich die
 * häufigste Ursache dafür, dass der Import bei manchen Seiten (die Rezepte in
 * benannte Abschnitte gliedern) leer oder unvollständig aussieht.
 *
 * Rekursiv: jeder Knoten mit "itemListElement" wird als Container behandelt
 * und aufgelöst; hat er zusätzlich einen Namen (Abschnitts-Überschrift) und
 * gibt es mehr als einen Abschnitt, wird der Name als eigene, kurze
 * "Überschriften-Zeile" vor die zugehörigen Schritte gestellt (die App hat
 * für Zubereitungsschritte - anders als bei Zutaten - kein separates
 * Gruppierungsfeld, daher als normale Schritt-Zeile).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function flattenInstructions(raw: any): string[] {
  if (!raw) return []
  if (typeof raw === 'string') return splitHtmlListString(raw)
  const items = Array.isArray(raw) ? raw : [raw]
  const multipleSections = items.filter((it) => it && typeof it === 'object' && Array.isArray(it.itemListElement)).length > 1
  const out: string[] = []
  for (const item of items) {
    if (typeof item === 'string') {
      out.push(...splitHtmlListString(item))
      continue
    }
    if (!item || typeof item !== 'object') continue
    if (Array.isArray(item.itemListElement)) {
      // HowToSection (oder ähnlich verschachtelter Container).
      if (multipleSections && typeof item.name === 'string' && item.name.trim()) {
        out.push(htmlToText(item.name))
      }
      out.push(...flattenInstructions(item.itemListElement))
      continue
    }
    const text = (item.text as string | undefined) || (item.name as string | undefined) || ''
    if (text) out.push(...splitHtmlListString(text))
  }
  return out
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

  // parseIngredientLines() erkennt dabei auch eingestreute Abschnitts-
  // Überschriften wie "For the Basil Sauce" (typisch für Rezepte, die aus
  // mehreren Komponenten/Unterrezepten bestehen, z. B. WP-Recipe-Maker-artige
  // Plugins) und übernimmt sie als Ingredient.groupName statt sie als
  // sinnlose "Zutat ohne Menge" durchrutschen zu lassen.
  const rawIngredientList: unknown[] = Array.isArray(n.recipeIngredient)
    ? n.recipeIngredient
    : Array.isArray(n.ingredients)
      ? n.ingredients
      : []
  // htmlToText() räumt Fälle auf, in denen eine Quellseite statt reinem Text
  // gerenderte HTML-Fragmente in die Zutatenzeilen schreibt (z. B.
  // "<span>200 g</span> Mehl").
  const rawIngredients: Ingredient[] = parseIngredientLines(rawIngredientList.map((line) => htmlToText(String(line))))

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

  // flattenInstructions() behandelt dabei auch HowToSection-verschachtelte
  // Schritte (Rezepte mit mehreren Komponenten) und HTML-Fragmente in
  // Textfeldern - siehe Kommentar dort.
  const rawSteps: string[] = flattenInstructions(n.recipeInstructions)
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

  // "recipeYield" ist ebenfalls uneinheitlich: mal eine einzelne Zahl/String
  // ("4"), mal ein Array (["4", "4 Portionen"], manche Seiten geben Zahl UND
  // Beschreibung getrennt zurück), mal eine Spanne ("4-6 Portionen"). Bei
  // einem Array wird bewusst nur das erste Element ausgewertet statt der
  // gesamten (mit Komma verketteten) String-Darstellung, damit parseInt()
  // nicht versehentlich Ziffern aus einem zweiten Array-Element aufgreift.
  const rawYield = Array.isArray(n.recipeYield) ? n.recipeYield[0] : n.recipeYield
  const prepMinutes = isoDurationToMinutes(n.prepTime)
  const cookMinutes = isoDurationToMinutes(n.cookTime)
  // Manche Seiten liefern nur "totalTime" statt einer Aufteilung in
  // Vorbereitungs-/Kochzeit. Ohne Fallback käme sonst trotz vorhandener
  // Zeitangabe auf der Quellseite gar keine Zeit im importierten Rezept an.
  const totalMinutes = isoDurationToMinutes(n.totalTime)
  const fallbackCookMinutes = cookMinutes ?? (!prepMinutes ? totalMinutes : undefined)

  // "recipeCategory" ist teils ein einzelner String, teils bereits ein Array
  // mehrerer Kategorien - vorher wurde ein Array versehentlich über
  // String(array) zu EINER kommagetrennten "Kategorie" verklebt.
  const rawCategories: string[] = Array.isArray(n.recipeCategory)
    ? n.recipeCategory.map((c: unknown) => htmlToText(String(c))).filter(Boolean)
    : n.recipeCategory
      ? [htmlToText(String(n.recipeCategory))]
      : []
  const rawKeywords: string[] = Array.isArray(n.keywords)
    ? n.keywords.map((k: unknown) => htmlToText(String(k)))
    : n.keywords
      ? htmlToText(String(n.keywords)).split(',')
      : []

  return {
    title: n.name ? htmlToText(String(n.name)) : '',
    description: n.description ? htmlToText(String(n.description)) : '',
    prepTimeMinutes: prepMinutes,
    cookTimeMinutes: fallbackCookMinutes,
    servings: rawYield ? parseInt(String(rawYield), 10) || undefined : undefined,
    // Explizit auf ['Hauptgericht'] zurückfallen statt "categories: undefined"
    // zu liefern: beim Zusammenführen mit dem leeren Rezept-Grundgerüst in
    // RecipeFormPage.tsx (`{ ...emptyRecipe(), ...prefill }`) würde ein
    // vorhandener, aber undefined-wertiger "categories"-Schlüssel dessen
    // Default (['Hauptgericht']) überschreiben - und da überall im Code von
    // einem garantiert vorhandenen Array ausgegangen wird (.length, .includes,
    // .join), stürzt das Formular dann beim Rendern ab. Kommt in der Praxis
    // öfter vor, als man denkt: viele Rezeptseiten liefern gar kein
    // "recipeCategory"-Feld.
    categories: rawCategories.length > 0 ? rawCategories : ['Hauptgericht'],
    tags: rawKeywords.map((s) => s.trim()).filter(Boolean),
    ingredients,
    steps,
    images: imageDataUrl ? [{ id: crypto.randomUUID(), dataUrl: imageDataUrl }] : [],
    sourceUrl: url,
  }
}
