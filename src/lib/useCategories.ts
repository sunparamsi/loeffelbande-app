import { useEffect, useState, useCallback } from 'react'
import { repo } from '../data'
import { DEFAULT_CATEGORIES } from '../db/types'

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  const refresh = useCallback(async () => {
    const [settings, recipes] = await Promise.all([repo.getSettings(), repo.listRecipes()])
    const used = new Set(recipes.flatMap((r) => r.categories).filter(Boolean))
    const hidden = new Set(settings.hiddenDefaultCategories)
    // Ausgeblendete Standard-Kategorien verschwinden aus der Auswahl, bleiben
    // aber sichtbar, solange noch ein Rezept sie trägt (sonst wäre dessen
    // Kategorie beim Bearbeiten plötzlich nicht mehr anwählbar).
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...settings.extraCategories, ...used])).filter(
      (c) => !hidden.has(c) || used.has(c),
    )
    setCategories(merged)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { categories, refresh }
}
