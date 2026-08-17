import Dexie, { type Table } from 'dexie'
import type { Recipe, PantryItem, ShoppingListItem } from '../db/types'

export class LocalDatabase extends Dexie {
  recipes!: Table<Recipe, string>
  pantryItems!: Table<PantryItem, string>
  shoppingListItems!: Table<ShoppingListItem, string>

  constructor() {
    super('meine-rezepte-db')
    this.version(1).stores({
      recipes: 'id, title, category, favorite, updatedAt',
      pantryItems: 'id, name, category',
      shoppingListItems: 'id, checked, addedAt',
    })
  }
}

export const localDb = new LocalDatabase()
