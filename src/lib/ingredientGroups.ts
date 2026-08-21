import type { Ingredient } from '../db/types'

export interface IngredientSegment {
  /** undefined = namenlose Hauptgruppe (keine Überschrift anzeigen) */
  groupName: string | undefined
  items: Ingredient[]
}

/** Liest den (getrimmten) Gruppennamen einer Zutat, oder undefined, wenn sie
 * zur namenlosen Hauptgruppe gehört (kein groupName oder nur Leerzeichen). */
export function ingredientGroupName(ing: Ingredient): string | undefined {
  return ing.groupName?.trim() || undefined
}

/**
 * Fasst eine geordnete Zutatenliste zu Abschnitten zusammen: aufeinander-
 * folgende Zutaten mit demselben Gruppennamen bilden einen Abschnitt. Dient
 * sowohl der Anzeige (RecipeDetailPage, SharedRecipePage, CookModePage) als
 * auch dem Bearbeiten-Formular (RecipeFormPage), damit "Für die Sauce"-artige
 * Unterrezepte dort einheitlich als eigener Block mit Überschrift erscheinen.
 * Zutaten ohne Gruppenname ergeben einen Abschnitt ohne sichtbare Überschrift
 * (falls durch benannte Abschnitte unterbrochen, ggf. mehrere solcher
 * Abschnitte hintereinander - macht optisch keinen Unterschied, da keiner
 * von ihnen eine Überschrift zeigt).
 */
export function segmentIngredients(ingredients: Ingredient[]): IngredientSegment[] {
  const segments: IngredientSegment[] = []
  for (const ing of ingredients) {
    const name = ingredientGroupName(ing)
    const last = segments[segments.length - 1]
    if (last && last.groupName === name) {
      last.items.push(ing)
    } else {
      segments.push({ groupName: name, items: [ing] })
    }
  }
  return segments
}
