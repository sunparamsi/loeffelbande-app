import type { Ingredient, RecipeStep } from '../db/types'
import { UNIT_WORDS, convertToMetric } from './units'

const INGREDIENTS_HEADER_RE = /^(ingredients?|zutaten)\s*:?$/i
const METHOD_HEADER_RE = /^(method|instructions?|directions?|zubereitung|preparation|steps?)\s*:?$/i
// Kurze Zwischenüberschriften innerhalb der Zutaten-/Zubereitungsliste
// (z. B. "For the pastry", "To finish", "Zum Garnieren") – bewusst eng
// gefasst (kurz, nur Buchstaben), damit ein echter Schritt wie "For the
// last 5 minutes, stir occasionally." nicht versehentlich verschluckt wird.
const SUB_HEADER_RE = /^(for the [a-zäöüß\s]{2,25}|für (den|die|das) [a-zäöüß\s]{2,25}|to finish|garnish(es)?|topping[s]?|serving suggestion|zum servieren|zum garnieren|for garnishing|to serve)\s*:?$/i

// Social-Media-Bildunterschriften enthalten oft Interaktions-Aufrufe statt
// echter Rezeptschritte ("Schreibe 'Rezept' in die Kommentare, dann schicke
// ich es dir per Direktnachricht.", "Commente «recette» et je t'enverrai la
// recette en DM."). Erkennung bewusst mehrsprachig (DE/EN/FR) über die
// Kombination "Kommentar-Aufforderung" + "Rezept-Wort" bzw. "DM/Nachricht",
// damit ein echter Zubereitungsschritt wie "Kommentiere die Konsistenz kurz"
// nicht fälschlich als Boilerplate erkannt wird (dafür müsste er zusätzlich
// das Wort "Rezept"/"recipe"/"recette" o. ä. enthalten).
const CTA_COMMENT_RE = /(kommentier|kommentar|comment|commente|coment)/i
const RECIPE_WORD_RE = /(rezept|recipe|recette|ricetta|receta)/i
const DM_WORD_RE = /(direktnachricht|per\s*dm\b|\bdm\b|message\s*priv|nachricht\s*schick)/i
const OTHER_BOILERPLATE_RE = /(link in bio|linkinbio|swipe up|double tap|follow (us|me|@)|folge (uns|mir) für)/i

function isBoilerplateLine(line: string): boolean {
  const hasCta = CTA_COMMENT_RE.test(line)
  if (hasCta && (RECIPE_WORD_RE.test(line) || DM_WORD_RE.test(line))) return true
  return OTHER_BOILERPLATE_RE.test(line)
}

/** Erkennt Zeilen, die eigentlich eine (fremde) Zutatenliste sind, aber in
 * den Zubereitungsschritten aufgetaucht sind (z. B. wenn eine Instagram-
 * Bildunterschrift ein zweites, komplett anderes Rezept verlinkt/erwähnt und
 * dessen Zutaten mit im Text stehen). Heuristik: mehrere "Zahl + Einheit"-
 * Treffer in derselben Zeile sind in einem echten Zubereitungssatz
 * unüblich – ein normaler Schritt erwähnt selten mehr als zwei Zutaten mit
 * Menge in einem Satz. */
const UNIT_HIT_RE = new RegExp(`\\b\\d+[.,]?\\d*\\s*(${UNIT_WORDS.map(escapeRegExp).join('|')})\\b`, 'gi')

function looksLikeForeignIngredientDump(line: string): boolean {
  const matches = line.match(UNIT_HIT_RE)
  return !!matches && matches.length >= 3
}

function isJunkStepLine(line: string): boolean {
  return isBoilerplateLine(line) || looksLikeForeignIngredientDump(line)
}

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
export function parseFreeText(text: string): { title: string; ingredients: Ingredient[]; steps: RecipeStep[] } {
  const allLines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*]+/, '').trim())
    .filter(Boolean)
    .filter((l) => !/^#/.test(l)) // Hashtags überspringen

  // Die erste Zeile ist bei gescannten/eingefügten Rezepten so gut wie immer
  // der Titel (Rezeptname steht auf Fotos/Webseiten/PDFs praktisch immer
  // oben). Nur übernehmen, wenn sie nicht selbst wie eine Zutat oder eine
  // Abschnittsüberschrift aussieht – sonst lieber keinen Titel raten.
  const titleCandidate = allLines[0]
  const hasTitle = allLines.length > 1 && titleCandidate && looksLikeTitle(titleCandidate)
  const title = hasTitle ? titleCandidate : ''
  const lines = hasTitle ? allLines.slice(1) : allLines

  const ingredientsHeaderIdx = lines.findIndex((l) => INGREDIENTS_HEADER_RE.test(l))
  const methodSearchStart = ingredientsHeaderIdx >= 0 ? ingredientsHeaderIdx + 1 : 0
  const methodHeaderIdx = lines.findIndex((l, i) => i >= methodSearchStart && METHOD_HEADER_RE.test(l))

  if (methodHeaderIdx >= 0) {
    const ingredientZone = lines.slice(ingredientsHeaderIdx >= 0 ? ingredientsHeaderIdx + 1 : 0, methodHeaderIdx)
    const stepZone = lines.slice(methodHeaderIdx + 1).filter((l) => !SUB_HEADER_RE.test(l) && !isJunkStepLine(l))

    const ingredients = ingredientZone
      .filter((l) => !SUB_HEADER_RE.test(l))
      .map(parseIngredientLine)
      .filter((i) => i.name.trim().length > 0)
    const steps = reflowStepLines(stepZone).map((l) => ({ id: crypto.randomUUID(), text: l.replace(/^\d+[.)]\s*/, '') }))

    return { title, ingredients, steps }
  }

  // Kein klarer Zutaten-/Zubereitungs-Abschnitt gefunden (z. B. kurze
  // Social-Media-Bildunterschrift) – Fallback: zeilenweise entscheiden.
  const ingredients: Ingredient[] = []
  const rawStepLines: string[] = []

  for (const line of lines) {
    if (isJunkStepLine(line)) continue

    const lower = line.toLowerCase()
    const startsWithNumber = /^[\d½¼¾⅓⅔]/.test(line)
    const hasUnit = UNIT_WORDS.some((u) => new RegExp(`\\b${escapeRegExp(u)}\\b`, 'i').test(lower))
    const looksLikeStepNumber = /^\d+[.)]\s/.test(line)
    const isLong = line.length > 70

    if (looksLikeStepNumber || isLong) {
      rawStepLines.push(line)
    } else if (startsWithNumber || hasUnit) {
      ingredients.push(parseIngredientLine(line))
    } else if (line.length > 0) {
      rawStepLines.push(line)
    }
  }

  const steps = reflowStepLines(rawStepLines).map((l) => ({ id: crypto.randomUUID(), text: l.replace(/^\d+[.)]\s*/, '') }))

  return { title, ingredients: ingredients.filter((i) => i.name.trim().length > 0), steps }
}

/**
 * Fügt Zeilen wieder zu ganzen Zubereitungsschritten zusammen. OCR/PDF-
 * Extraktion liefert pro gedruckter (umgebrochener) Zeile eine eigene
 * Textzeile – ein einzelner Schritt-Absatz landet dadurch auf mehreren
 * Zeilen, die sonst fälschlich als mehrere Schritte gespeichert würden.
 * Heuristik: Eine neue Zeile beginnt einen NEUEN Schritt, wenn sie explizit
 * nummeriert ist ("1. …") oder wenn die vorherige Zeile bereits mit einem
 * Satzende (. ! ? :) abgeschlossen wurde UND die neue Zeile groß beginnt.
 * Sonst wird sie an den vorherigen Schritt angehängt (Zeilenumbruch mitten
 * im Satz).
 */
function reflowStepLines(lines: string[]): string[] {
  const merged: string[] = []
  for (const line of lines) {
    const prev = merged[merged.length - 1]
    const isNumberedStart = /^\d+[.)]\s/.test(line)
    const prevEndsSentence = !prev || /[.!?:]["'”’)]?$/.test(prev.trim())
    const startsUpper = /^[A-ZÄÖÜ]/.test(line)
    const startsNew = !prev || isNumberedStart || (prevEndsSentence && startsUpper)
    if (startsNew) {
      merged.push(line)
    } else {
      merged[merged.length - 1] = `${prev} ${line}`.trim()
    }
  }
  return merged
}

/** Grobe Prüfung, ob eine Zeile als Rezepttitel taugt: keine Abschnitts-
 * überschrift, keine Zutatenzeile (führende Zahl) und nicht zu lang. */
function looksLikeTitle(line: string): boolean {
  if (INGREDIENTS_HEADER_RE.test(line) || METHOD_HEADER_RE.test(line) || SUB_HEADER_RE.test(line)) return false
  if (/^[\d½¼¾⅓⅔]/.test(line)) return false
  if (line.length > 90) return false
  if (isJunkStepLine(line)) return false
  return true
}

/** Zerlegt eine Zutatenzeile in Menge/Einheit/Name. Das Wort nach der Zahl
 * wird nur dann als Einheit behandelt, wenn es in UNIT_WORDS vorkommt –
 * sonst gehört es zum Namen (verhindert z. B., dass bei "2 Zwiebeln"
 * "Zwiebeln" fälschlich als Einheit erkannt und der Name leer wird). Zeilen
 * ganz ohne führende Zahl (z. B. "Flaky sea salt") landen komplett im Namen. */
function parseIngredientLine(line: string): Ingredient {
  const m = line.match(/^([\d½¼¾⅓⅔.,/]+)\s*([a-zA-Zäöüß.]*)\s*(.*)$/)
  if (m && UNIT_WORDS.includes(m[2].toLowerCase())) {
    const { quantity, unit } = convertToMetric(parseQty(m[1]), m[2])
    return { id: crypto.randomUUID(), quantity, unit, name: m[3] }
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
