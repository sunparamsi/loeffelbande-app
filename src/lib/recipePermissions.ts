import type { Recipe } from '../db/types'
import type { AuthState } from '../data/repo'

/**
 * Bestimmt, ob die aktuell angemeldete Person ein Rezept bearbeiten/löschen
 * darf: entweder sie hat es selbst erstellt, oder sie ist "Besitzer:in" des
 * Haushalts (kann so aufräumen, auch wenn sie das Rezept nicht selbst
 * angelegt hat). Rezepte ohne bekannten Ersteller (angelegt, bevor es dieses
 * Feld gab) bleiben bewusst für alle bearbeitbar, statt plötzlich niemanden
 * mehr ranzulassen. Die serverseitige Durchsetzung für den Cloud-Modus liegt
 * zusätzlich in den RLS-Policies in supabase/schema.sql (recipes_update_...
 * und recipes_delete_...) – diese Funktion ist die client-seitige
 * UI-Spiegelung davon, nicht die einzige Absicherung.
 */
export function canEditRecipe(recipe: Recipe, authState: AuthState | null): boolean {
  if (!authState) return false
  if (authState.currentRole === 'owner') return true
  if (!recipe.createdByUserId) return true
  return recipe.createdByUserId === authState.currentUserId
}
