import Dexie, { type Table } from 'dexie'
import type { Recipe, ShoppingListItem } from '../db/types'

/** Alt-Tabelle der inzwischen aus der App entfernten Vorrat-Funktion –
 * bewusst nicht mehr Teil der öffentlichen Datenmodelle (db/types.ts), aber
 * als Typ für Dexie hier lokal nachgebildet (siehe Kommentar im Konstruktor,
 * warum der Objectstore selbst bestehen bleibt). */
interface LegacyPantryItem {
  id: string
  name: string
  category: string
}

export class LocalDatabase extends Dexie {
  recipes!: Table<Recipe, string>
  pantryItems!: Table<LegacyPantryItem, string>
  shoppingListItems!: Table<ShoppingListItem, string>

  constructor() {
    super('meine-rezepte-db')
    // "pantryItems" bewusst NICHT entfernt, obwohl die Vorrat-Funktion aus
    // der App entfernt wurde: Dexie unterstützt das Entfernen eines
    // Objectstores nur über eine neue Versionsnummer mit explizitem
    // Migrationsschritt, nicht durch einfaches Weglassen unter derselben
    // Versionsnummer – das könnte bei bereits im Browser bestehenden
    // Datenbanken zu Inkonsistenzen führen. Der Store bleibt daher als
    // unbenutzte Alt-Tabelle bestehen, das ist für IndexedDB harmlos.
    this.version(1).stores({
      recipes: 'id, title, category, favorite, updatedAt',
      pantryItems: 'id, name, category',
      shoppingListItems: 'id, checked, addedAt',
    })
  }
}

export const localDb = new LocalDatabase()
