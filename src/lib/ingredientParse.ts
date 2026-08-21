import type { Ingredient } from '../db/types'
import { matchUnitWord, convertToMetric, formatUnit } from './units'

/**
 * Ein paar Einheit+Name-Kombinationen liest man auf Deutsch natürlicher als
 * ein einziges zusammengesetztes Wort statt als "Menge Einheit Name" – z. B.
 * "Zehe(n) Knoblauch" -> "Knoblauchzehe(n)" oder "Scheibe(n) Brot" ->
 * "Brotscheibe(n)". Wird nach der normalen Einheiten-Erkennung angewendet,
 * verschiebt dafür den Namen in die zusammengesetzte Form und leert die
 * Einheit.
 *
 * Bewusst als feste Zuordnungstabelle statt als automatisches Zusammensetzen
 * beliebiger Wörter: deutsche Komposita brauchen oft ein Fugenzeichen (z. B.
 * "Tomate" + "Scheibe" -> "Tomatenscheibe", nicht "Tomatescheibe"), das sich
 * nicht zuverlässig algorithmisch herleiten lässt. Bei Bedarf hier einfach
 * weitere Einheit/Name-Paare ergänzen.
 */
const COMPOUND_UNIT_NAMES: Record<string, Record<string, string>> = {
  zehe: { knoblauch: 'Knoblauchzehe(n)' },
  scheibe: { brot: 'Brotscheibe(n)' },
}

function normalizeCompoundUnit(unit: string, name: string): { unit: string; name: string } {
  const stem = unit === 'zehen' ? 'zehe' : unit === 'scheiben' ? 'scheibe' : unit
  const byName = COMPOUND_UNIT_NAMES[stem]
  const lowerName = name.trim().toLowerCase()
  const matchKey = byName && Object.keys(byName).find((key) => lowerName.startsWith(key))
  if (matchKey) return { unit: '', name: byName[matchKey] }
  return { unit, name }
}

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
    const normalized = normalizeCompoundUnit(unit, m[3])
    return { id: crypto.randomUUID(), quantity, unit: formatUnit(normalized.unit), name: normalized.name }
  }
  if (m && m[2] && !m[3]) {
    return { id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: '', name: m[2] }
  }
  if (m && m[1] && (m[2] || m[3])) {
    return { id: crypto.randomUUID(), quantity: parseQty(m[1]), unit: '', name: `${m[2]} ${m[3]}`.trim() }
  }
  return { id: crypto.randomUUID(), quantity: null, unit: '', name: line }
}

// Einleitende Wendungen, die selbst NICHT Teil der angezeigten Überschrift
// sein sollen ("For the Basil Sauce" -> Überschrift nur "Basil Sauce") - der
// nachfolgende Teil muss mit einem Buchstaben beginnen (\p{L}), damit z. B.
// "For 4 servings" (Mengenangabe, keine Komponenten-Überschrift) nicht
// fälschlich matcht.
const GROUP_HEADER_PREFIX_RE = /^(for the|for|für (den|die|das)|zutaten für)\s+(\p{L}.*)$/iu
// Eigenständige Überschriften-Wendungen, die selbst schon der vollständige
// Anzeigename sind (kein Bezugswort danach zu entfernen).
const GROUP_HEADER_STANDALONE_RE =
  /^(to finish|garnish(es)?|topping[s]?|serving suggestion|zum servieren|zum garnieren|to serve|filling|füllung|belag|dressing|marinade)$/i

/**
 * Erkennt Zeilen, die statt einer echten Zutat eine Abschnitts-Überschrift
 * innerhalb der Zutatenliste sind (z. B. "For the Basil Sauce", "Für die
 * Sauce", "Basilikum-Sauce:") - typisch für Rezepte, die aus mehreren
 * Komponenten/Unterrezepten bestehen (Hauptgericht + Sauce/Füllung/Topping
 * etc., siehe z. B. https://www.inspiredwithatwist.com/home/pistachiocrustedsalmon/
 * mit Haupt-Zutaten + separatem "Basil Sauce"-Abschnitt). Gibt bei Erkennung
 * den bereinigten Gruppennamen zurück (einleitende Wendungen wie "For the"/
 * "Für die" werden dabei entfernt, sodass die Überschrift nur "Basil Sauce"
 * statt "For the Basil Sauce" lautet), sonst null.
 *
 * Drei Muster: (a) bekannte einleitende Wendungen mit Bezugswort danach -
 * das Bezugswort wird zum Gruppennamen, die Wendung selbst entfällt: (b)
 * eigenständige Wendungen, die schon für sich der volle Anzeigename sind
 * (z. B. "To Finish"); (c) eine kurze, für sich stehende Zeile, die NUR mit
 * einem Doppelpunkt endet und weder Komma noch Semikolon enthält (z. B.
 * "Basilikum-Sauce:") - viele Rezept-Plugins (z. B. WP Recipe Maker) geben
 * Abschnittsnamen in der exportierten Zutatenliste genau so aus, eingebettet
 * in eine ansonsten flache Liste von Zutatenzeilen (schema.org kennt für
 * Zutaten-Gruppen kein eigenes Feld). Bewusst kurz gehalten (max. 40 Zeichen,
 * keine Zahl am Anfang), damit eine echte Zutat mit Doppelpunkt (kommt
 * praktisch nicht vor) nicht fälschlich als Überschrift erkannt wird.
 */
export function extractGroupHeaderName(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 40) return null
  if (/^[\d½¼¾⅓⅔]/.test(trimmed)) return null // beginnt mit Menge -> echte Zutat
  const withoutColon = trimmed.replace(/:\s*$/, '').trim()
  if (!withoutColon) return null
  const prefixMatch = withoutColon.match(GROUP_HEADER_PREFIX_RE)
  if (prefixMatch) return capitalizeGroupName(prefixMatch[3].trim())
  if (GROUP_HEADER_STANDALONE_RE.test(withoutColon)) return capitalizeGroupName(withoutColon)
  if (/:$/.test(trimmed) && !/[,;]/.test(withoutColon) && withoutColon.split(/\s+/).length <= 5) {
    return capitalizeGroupName(withoutColon)
  }
  return null
}

function capitalizeGroupName(s: string): string {
  return s.replace(/^\p{L}/u, (c) => c.toUpperCase())
}

/**
 * Zerlegt eine geordnete Liste roher Zutatenzeilen (Freitext-, URL- oder
 * Datei-Import) in Ingredient[] und erkennt dabei Abschnitts-Überschriften
 * (siehe extractGroupHeaderName) - diese werden NICHT selbst als Zutat
 * übernommen, sondern als Ingredient.groupName an alle nachfolgenden Zeilen
 * bis zur nächsten Überschrift (oder dem Ende der Liste) angehängt. Zentral
 * hier gepflegt (statt separat in jedem Importweg), aus demselben Grund wie
 * parseIngredientLine() selbst: einheitliches Verhalten überall.
 */
export function parseIngredientLines(lines: string[]): Ingredient[] {
  const result: Ingredient[] = []
  let currentGroup: string | undefined
  for (const line of lines) {
    const groupName = extractGroupHeaderName(line)
    if (groupName) {
      currentGroup = groupName
      continue
    }
    const ing = parseIngredientLine(line)
    if (currentGroup) ing.groupName = currentGroup
    result.push(ing)
  }
  return result
}
