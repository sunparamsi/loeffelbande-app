// Zentrale Datenmodelle der App

export type Difficulty = 'einfach' | 'mittel' | 'anspruchsvoll'

export interface Ingredient {
  id: string
  name: string
  quantity: number | null
  unit: string
  note?: string
}

export interface RecipeStep {
  id: string
  text: string
}

export interface RecipeImage {
  id: string
  /** Base64 data URL, lokal in IndexedDB gespeichert */
  dataUrl: string
}

export interface RecipeLink {
  id: string
  /** z.B. 'YouTube', 'Instagram', 'TikTok', 'Webseite' */
  label: string
  url: string
}

export interface Recipe {
  id: string
  title: string
  description?: string
  category: string
  cuisine?: string
  tags: string[]
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  servings?: number
  difficulty?: Difficulty
  ingredients: Ingredient[]
  steps: RecipeStep[]
  images: RecipeImage[]
  links: RecipeLink[]
  sourceUrl?: string
  favorite: boolean
  /** Wer das Rezept angelegt hat (Cloud: auth.users-ID, Solo: fester 'solo'-
   * Wert) – wird einmalig bei der Erstellung gesetzt und danach nie mehr
   * verändert, auch nicht beim Bearbeiten durch andere Haushaltsmitglieder.
   * Bestimmt zusammen mit createdByName Bearbeitungsrecht + Filter/Label. */
  createdByUserId?: string
  /** Anzeigename des Erstellers zum Zeitpunkt der Erstellung (Snapshot, damit
   * das Label auch dann stimmt, wenn die Person sich später umbenennt oder
   * den Haushalt verlässt). */
  createdByName?: string
  createdAt: number
  updatedAt: number
}

export interface ShoppingListItem {
  id: string
  name: string
  quantity: number | null
  unit: string
  checked: boolean
  /** IDs der Rezepte, aus denen dieser Eintrag stammt (leer = manuell hinzugefügt) */
  fromRecipeIds: string[]
  addedAt: number
}

export interface ActivityPing {
  id: string
  recipeId: string | null
  recipeTitle?: string
  kind: 'ping' | 'new_recipe'
  fromMemberId: string
  fromMemberName?: string
  toMemberId: string | null
  toMemberName?: string
  note?: string
  createdAt: number
}

export interface ShareLink {
  id: string
  token: string
  recipeId: string
  viewCount: number
  createdAt: number
}

export interface HouseholdSettings {
  logoDataUrl: string | null
  extraCategories: string[]
  /** Standard-Kategorien (aus DEFAULT_CATEGORIES), die ausgeblendet wurden. */
  hiddenDefaultCategories: string[]
}

export const DEFAULT_CATEGORIES = [
  'Vorspeise',
  'Hauptgericht',
  'Dessert',
  'Backen',
  'Salat',
  'Suppe',
  'Getränk',
  'Frühstück',
  'Snack',
  'Sonstiges',
]
