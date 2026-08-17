import { useEffect, useState, useCallback } from 'react'
import { repo } from '../data'
import { DEFAULT_CATEGORIES } from '../db/types'

export function useCategories() {
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  const refresh = useCallback(async () => {
    const [settings, recipes] = await Promise.all([repo.getSettings(), repo.listRecipes()])
    const used = new Set(recipes.map((r) => r.category).filter(Boolean))
    const merged = Array.from(new Set([...DEFAULT_CATEGORIES, ...settings.extraCategories, ...used]))
    setCategories(merged)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { categories, refresh }
}
