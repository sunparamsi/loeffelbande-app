import type { Ingredient } from '../db/types'

/**
 * Grobe, komplett offline arbeitende Heuristik, um aus der Zutatenliste einen
 * Vorschlag für Ernährungs-Tags ("Vegan"/"Vegetarisch") abzuleiten. Dient als
 * Startpunkt beim Import (Foto/PDF/Social/URL/manuell), den man beim Prüfen
 * der Zutaten ggf. korrigiert - kein Anspruch auf Vollständigkeit (z. B.
 * versteckte tierische Zusatzstoffe wie Gelatine in Fruchtgummi oder E120/
 * Karmin lassen sich aus Klartext-Zutatennamen nicht zuverlässig erkennen).
 *
 * Absichtlich per Wort-/Teilwort-Abgleich statt einer festen Zutatenliste,
 * damit auch deutsche Komposita erkannt werden (z. B. "Hähnchenbrust",
 * "Rinderhack", "Parmesan"). Sehr kurze oder mehrdeutige Stichwörter (z. B.
 * "ei", das in "Eis"/"Reis" steckt) werden nur bei exakter Wortübereinstimmung
 * geprüft, um Fehltreffer zu vermeiden.
 */

// Fleisch/Fisch/Meeresfrüchte - schließen sowohl "Vegetarisch" als auch
// "Vegan" aus.
const MEAT_FISH_KEYWORDS = [
  'fleisch', 'hackfleisch', 'hähnchen', 'huhn', 'hühner', 'hühnchen', 'pute', 'puten',
  'rind', 'rinder', 'schwein', 'schweine', 'speck', 'bacon', 'schinken', 'salami', 'wurst',
  'würstchen', 'würste', 'chorizo', 'lamm', 'lammfleisch', 'ente', 'enten', 'gans', 'gänse',
  'kalb', 'kalbs', 'leber', 'fisch', 'lachs', 'thunfisch', 'garnele', 'garnelen', 'shrimp',
  'shrimps', 'krabbe', 'krabben', 'muschel', 'muscheln', 'tintenfisch', 'kaviar', 'sardine',
  'sardinen', 'anchovis', 'sardelle', 'sardellen', 'gelatine', 'schmalz', 'forelle', 'kabeljau',
  'seelachs', 'scampi', 'hummer', 'surimi',
]

// Zusätzlich zu MEAT_FISH_KEYWORDS für "Vegan" ausgeschlossen (übrige
// tierische Erzeugnisse: Milchprodukte, Ei, Honig).
const OTHER_ANIMAL_KEYWORDS = [
  'milch', 'buttermilch', 'kondensmilch', 'sahne', 'rahm', 'schmand', 'crème fraîche',
  'creme fraiche', 'butter', 'käse', 'joghurt', 'quark', 'frischkäse', 'mascarpone', 'parmesan',
  'mozzarella', 'feta', 'ricotta', 'ei', 'eier', 'eigelb', 'eiweiß', 'honig',
]

// Sehr kurze/mehrdeutige Stichwörter: nur bei exaktem Wort-Treffer werten
// (nicht als Teilwort), da sie sonst in unverwandten Wörtern anschlagen
// würden (z. B. "ei" in "Reis"/"Eis", "wild" in "Wildreis").
const EXACT_ONLY_KEYWORDS = new Set(['ei', 'wild'])

// Pflanzliche Alternativen zu Milchprodukten (Kokosmilch, Hafersahne,
// Sojajoghurt, Cashewkäse, …) sollen NICHT als tierisches Milchprodukt
// gewertet werden - sonst würde ein rein pflanzliches Gericht fälschlich von
// "Vegan" auf "Vegetarisch" herabgestuft. Die betroffenen Wörter (milch,
// sahne, joghurt, quark, käse) werden bewusst als Teilwort geprüft, um auch
// echte Milchprodukt-Komposita wie "Buttermilch" oder "Frischkäse" zu
// erkennen - das lässt sich also nicht einfach per exakter Wortübereinstimmung
// lösen. Stattdessen werden bekannte pflanzliche Präfixe davor ausgeschlossen.
const PLANT_BASED_PREFIXES = [
  'kokos', 'kokosnuss', 'mandel', 'hafer', 'soja', 'reis', 'cashew', 'hanf',
  'lupinen', 'dinkel', 'hasel', 'haselnuss', 'erbsen', 'nuss',
]
const DAIRY_SUBSTRING_KEYWORDS = new Set(['milch', 'sahne', 'joghurt', 'quark', 'käse'])

function isPlantBasedException(token: string, keyword: string): boolean {
  if (!DAIRY_SUBSTRING_KEYWORDS.has(keyword)) return false
  const foldedKeyword = foldUmlauts(keyword)
  return PLANT_BASED_PREFIXES.some((p) => token.includes(foldUmlauts(p) + foldedKeyword))
}

// Umlaute vereinheitlichen (ä/ö/ü/ß -> a/o/u/ss) UND die gängige
// ASCII-Ersatzschreibweise dafür (ae/oe/ue -> a/o/u), auf beiden Seiten des
// Vergleichs (Stichwörter UND Zutatentext) angewendet - erkennt so "Hähnchen",
// "Haehnchen" und "Hahnchen" gleichermaßen, wie sie je nach OCR-Ergebnis oder
// Copy-Paste-Quelle vorkommen können.
function foldUmlauts(s: string): string {
  return s
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
}

function tokensOf(ing: Ingredient): string[] {
  return foldUmlauts(`${ing.name} ${ing.note ?? ''}`.toLowerCase())
    .replace(/[(),.;:!?]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

function matchesKeyword(tokens: string[], keyword: string): boolean {
  const folded = foldUmlauts(keyword)
  if (EXACT_ONLY_KEYWORDS.has(keyword)) return tokens.includes(folded)
  return tokens.some((t) => t.includes(folded) && !isPlantBasedException(t, keyword))
}

function hasAnyKeyword(ingredients: Ingredient[], keywords: string[]): boolean {
  return ingredients.some((ing) => {
    const tokens = tokensOf(ing)
    return keywords.some((k) => matchesKeyword(tokens, k))
  })
}

/**
 * Leitet aus den Zutatennamen einen Tag-Vorschlag ab: "Vegan", wenn keinerlei
 * tierische Zutat gefunden wurde, "Vegetarisch", wenn nur Fleisch/Fisch fehlt
 * (aber z. B. Milch/Ei vorkommt), oder [] (kein Vorschlag), wenn Fleisch/Fisch
 * gefunden wurde oder noch keine benannten Zutaten vorliegen.
 */
export function suggestDietTags(ingredients: Ingredient[]): string[] {
  const named = ingredients.filter((i) => i.name.trim().length > 0)
  if (named.length === 0) return []
  if (hasAnyKeyword(named, MEAT_FISH_KEYWORDS)) return []
  if (hasAnyKeyword(named, OTHER_ANIMAL_KEYWORDS)) return ['Vegetarisch']
  return ['Vegan']
}
