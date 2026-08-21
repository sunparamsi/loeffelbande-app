import type { Ingredient, RecipeStep } from '../db/types'
import { UNIT_WORDS } from './units'
import { isJunkStepLine } from './stepClean'
import { parseIngredientLine } from './ingredientParse'

// Nur am Zeilenanfang geprüft (\b statt $), damit auch Überschriften mit
// Zusatzinfo auf derselben Zeile erkannt werden (z. B. "Zutaten (4 Portionen)"
// oder "Zutaten (1 Menschen) 22" – Letzteres wie es z. B. beim OCR-Scan einer
// Foto-PDF entsteht, wenn ein Personen-Icon daneben als Zahl mitgelesen wird).
const INGREDIENTS_HEADER_RE = /^(ingredients?|zutaten(liste)?)\b/i
const METHOD_HEADER_RE = /^(method|instructions?|directions?|zubereitung|anweisung(en)?|schritte|preparation|steps?)\b/i
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

    const ingredients = splitMergedIngredientLines(reflowIngredientLines(ingredientZone.filter((l) => !SUB_HEADER_RE.test(l))))
      .map(parseIngredientLine)
      .filter((i) => i.name.trim().length > 0)
    const steps = reflowStepLines(stepZone).map((l) => ({ id: crypto.randomUUID(), text: l.replace(/^\d+[.)]\s*/, '') }))

    return { title, ingredients, steps }
  }

  // Kein klarer Zutaten-/Zubereitungs-Abschnitt gefunden (z. B. kurze
  // Social-Media-Bildunterschrift) – Fallback: zeilenweise entscheiden.
  const ingredientLines: string[] = []
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
      ingredientLines.push(line)
    } else if (line.length > 0) {
      rawStepLines.push(line)
    }
  }

  const ingredients = splitMergedIngredientLines(ingredientLines)
    .map(parseIngredientLine)
    .filter((i) => i.name.trim().length > 0)
  const steps = reflowStepLines(rawStepLines).map((l) => ({ id: crypto.randomUUID(), text: l.replace(/^\d+[.)]\s*/, '') }))

  return { title, ingredients, steps }
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

/**
 * Fügt Zutatenzeilen wieder zusammen, die beim Foto-/PDF-Scan mitten in
 * einer Klammer umgebrochen wurden (z. B. "... in verschiedenen Formen
 * (Ochsenherzen, Roma, Kirschtomaten," gefolgt von "usw.)" auf der
 * nächsten Zeile). Ohne diese Zusammenführung würde "usw.)" als eigene,
 * unsinnige Zutat gespeichert. Heuristik: Eine Zeile mit einer nicht
 * geschlossenen öffnenden Klammer "verschluckt" die nachfolgende(n)
 * Zeile(n), bis die Klammer wieder ausgeglichen ist.
 */
function reflowIngredientLines(lines: string[]): string[] {
  const merged: string[] = []
  let openParens = 0
  for (const line of lines) {
    if (openParens > 0 && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${line}`.trim()
    } else {
      merged.push(line)
    }
    openParens += countChar(line, '(') - countChar(line, ')')
    if (openParens < 0) openParens = 0
  }
  return merged
}

/**
 * Manche Foto-/PDF-Scans stellen Zutaten als zweispaltiges Kachel-Raster dar
 * (z. B. "1 Ei" neben "1 Scheibe Brot" in derselben Reihe). Bei nur wenigen
 * Zeilen erkennt die Texterkennung oft keine echte Spaltentrennung und liest
 * beide Kacheln einer Reihe als eine einzige Textzeile ein (z. B.
 * "1 Ei 1 Scheibe Brot") – ohne diese Aufteilung würde daraus eine einzige,
 * unsinnige Zutat. Heuristik: Taucht innerhalb einer Zeile – nach mindestens
 * einem Namens-/Einheitswort seit dem letzten Zutatenanfang – erneut eine
 * eigenständige Zahl auf (nicht innerhalb einer Klammer), beginnt dort
 * vermutlich eine zweite, mitgelesene Zutat; die Zeile wird dort geteilt.
 */
function splitMergedIngredientLines(lines: string[]): string[] {
  const QTY_TOKEN_RE = /^[\d½¼¾⅓⅔]+([.,]\d+)?$/
  const result: string[] = []
  for (const line of lines) {
    const tokens = line.split(/\s+/).filter(Boolean)
    const starts: number[] = []
    let parenDepth = 0
    let nameTokensSinceStart = 0
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]
      const isQtyToken = QTY_TOKEN_RE.test(t)
      if (i === 0 && isQtyToken) {
        starts.push(0)
        nameTokensSinceStart = 0
      } else if (isQtyToken && parenDepth <= 0 && nameTokensSinceStart > 0) {
        starts.push(i)
        nameTokensSinceStart = 0
      } else {
        nameTokensSinceStart++
      }
      parenDepth += countChar(t, '(') - countChar(t, ')')
      if (parenDepth < 0) parenDepth = 0
    }

    if (starts.length <= 1) {
      result.push(line)
      continue
    }
    for (let s = 0; s < starts.length; s++) {
      const from = starts[s]
      const to = s + 1 < starts.length ? starts[s + 1] : tokens.length
      const segment = tokens.slice(from, to).join(' ').trim()
      if (segment) result.push(segment)
    }
  }
  return result
}

function countChar(s: string, ch: string): number {
  let count = 0
  for (const c of s) if (c === ch) count++
  return count
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Manche PDFs (z. B. Screenshot-Exporte aus anderen Rezept-Apps) tragen den
 * Rezeptnamen NIRGENDS als sichtbaren Text auf der Seite - der Titel steht
 * dort nur "drumherum" (App-Titelleiste), die beim Export nicht mitgedruckt
 * wird. In diesem Fall liefert parseFreeText() bewusst keinen Titel (siehe
 * looksLikeTitle). Als besserer Ausgangspunkt als ein leeres Feld dient dann
 * der Dateiname, der den Rezeptnamen oft trägt (z. B. "Açorda Alentejana.pdf").
 * Rein generische Kamera-/Scan-Dateinamen (IMG_1234, Scan 2024-...) liefern
 * dabei bewusst keinen Vorschlag, da daraus kein sinnvoller Titel würde. */
export function titleFromFilename(fileName: string): string {
  const withoutExt = fileName.replace(/\.[a-z0-9]+$/i, '')
  const cleaned = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  if (/^(img|dsc|scan|dokument|document|pdf|datei|file)[\s_]?\d*$/i.test(cleaned)) return ''
  if (/^\d+$/.test(cleaned)) return ''
  return cleaned
}
