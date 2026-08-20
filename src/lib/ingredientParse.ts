import type { Ingredient } from '../db/types'
import { matchUnitWord, convertToMetric } from './units'

/** Wandelt rohe Mengenangaben (inkl. Unicode-Bruchzeichen und deutschem
 * Dezimalkomma) in eine Zahl um. Zentral hier, da sowohl Freitext- als auch
 * URL-/Datei-Import Mengenangaben parsen müssen. */
export function parseQty(raw: string): number | null {
  const map: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.33, '⅔': 0.67 }
  if (map[raw]) return map[raw]
  const n = Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/**
 * Zerlegt eine einzelne Zutatenzeile (aus Freitext-, URL- oder Datei-Import)
 * in Menge/Einheit/Name. Zentral gepflegt, damit alle Importwege dasselbe
 * Verhalten haben – früher gab es hier drei fast identische, aber leicht
 * abweichende Implementierungen (textParse.ts, urlImport.ts, fileImport.ts),
 * die mit der Zeit auseinanderdriften konnten.
 *
 * Das Wort nach der Zahl wird nur dann als Einheit behandelt, wenn
 * matchUnitWord() es erkennt (inkl. OCR-Korrektur wie "Ibs" -> "lbs") – sonst
 * gehört es zum Namen (verhindert z. B., dass bei "2 Zwiebeln" "Zwiebeln"
 * fälschlich als Einheit erkannt und der Name leer wird). Bekannte
 * nicht-metrische Einheiten (lb, cup, tbsp, …) werden automatisch nach
 * Gramm/ml umgerechnet. Zeilen ganz ohne führende Zahl (z. B. "Flaky sea
 * salt") landen komplett im Namen.
 */
export function parseIngredientLine(line: string): Ingredient {
  const m = line.match(/^([\d½¼¾⅓⅔.,/]+)\s*([a-zA-Zäöüß.]*)\s*(.*)$/)
  const matchedUnit = m ? matchUnitWord(m[2]) : null
  if (m && matchedUnit) {
    const { quantity, unit } = convertToMetric(parseQty(m[1]), matchedUnit)
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
