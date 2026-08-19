import { UNIT_WORDS } from './units'

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

export function isBoilerplateLine(line: string): boolean {
  const hasCta = CTA_COMMENT_RE.test(line)
  if (hasCta && (RECIPE_WORD_RE.test(line) || DM_WORD_RE.test(line))) return true
  return OTHER_BOILERPLATE_RE.test(line)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Erkennt Zeilen/Sätze, die eigentlich eine (fremde) Zutatenliste sind,
 * aber in den Zubereitungsschritten aufgetaucht sind (z. B. wenn eine
 * Quell-Webseite fehlerhafte structured data liefert, bei der sich zwei
 * Rezepte vermischen, oder eine Instagram-Bildunterschrift ein zweites,
 * komplett anderes Rezept erwähnt). Heuristik: mehrere "Zahl + Einheit"-
 * Treffer im selben Abschnitt sind in einem echten Zubereitungssatz
 * unüblich – ein normaler Schritt erwähnt selten mehr als zwei Zutaten mit
 * Menge in einem Satz. */
const UNIT_HIT_RE = new RegExp(`\\b\\d+[.,]?\\d*\\s*(${UNIT_WORDS.map(escapeRegExp).join('|')})\\b`, 'gi')

export function looksLikeForeignIngredientDump(line: string): boolean {
  const matches = line.match(UNIT_HIT_RE)
  return !!matches && matches.length >= 3
}

export function isJunkStepLine(line: string): boolean {
  return isBoilerplateLine(line) || looksLikeForeignIngredientDump(line)
}

/** Zerlegt einen (ggf. mehrsätzigen) Zubereitungsschritt in einzelne Sätze
 * und entfernt Sätze, die wie eine eingeschleuste Zutatenliste eines
 * anderen Rezepts oder wie Social-Media-Werbetext aussehen, bevor der Rest
 * wieder zusammengefügt wird. Wichtig für den URL-Import: manche
 * Quell-Webseiten liefern in ihren strukturierten Daten (JSON-LD)
 * fehlerhafte/inkonsistente Angaben, bei denen z. B. ein zweites Rezept
 * (etwa ein Beilagen-Rezept) mitten in einem Zubereitungsschritt des
 * Hauptrezepts landet. */
export function stripInjectedContent(text: string): string {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/).filter(Boolean)
  if (sentences.length <= 1) return isJunkStepLine(text) ? '' : text.trim()
  const kept = sentences.map((s) => s.trim()).filter((s) => s && !isJunkStepLine(s))
  return kept.join(' ').trim()
}
