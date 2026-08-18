import { repo } from '../data'
import type { PantryItem, ShoppingListItem } from '../db/types'

/**
 * Übernimmt einen als "gekauft" markierten Einkaufslisten-Eintrag in den
 * Vorrat. Gibt es dort schon eine Zutat mit gleichem Namen (Groß-/
 * Kleinschreibung egal) und gleicher Einheit, wird die Menge addiert statt
 * einen doppelten Eintrag anzulegen.
 */
export async function addPurchasedItemToPantry(item: ShoppingListItem): Promise<void> {
  const name = item.name.trim()
  if (!name) return

  const pantry = await repo.listPantry()
  const existing = pantry.find((p) => p.name.trim().toLowerCase() === name.toLowerCase() && (p.unit || '').trim().toLowerCase() === (item.unit || '').trim().toLowerCase())

  if (existing) {
    const merged: PantryItem = { ...existing, quantity: mergeQuantity(existing.quantity, item.quantity), updatedAt: Date.now() }
    await repo.savePantryItem(merged)
  } else {
    await repo.savePantryItem({
      id: crypto.randomUUID(),
      name,
      quantity: item.quantity,
      unit: item.unit,
      category: 'Sonstiges',
      updatedAt: Date.now(),
    })
  }
}

function mergeQuantity(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null
  return (a ?? 0) + (b ?? 0)
}
