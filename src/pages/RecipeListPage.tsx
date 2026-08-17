import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import TopBar from '../components/TopBar'
import RecipeCard from '../components/RecipeCard'
import { Chip } from '../components/ui'
import { SearchIcon, PlusIcon } from '../icons'
import { useCategories } from '../lib/useCategories'

export default function RecipeListPage() {
  const navigate = useNavigate()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>('Alle')
  const { categories } = useCategories()

  useEffect(() => {
    repo.listRecipes().then(setRecipes)
  }, [])

  const filtered = useMemo(() => {
    let list = recipes
    if (filter === 'Favoriten') list = list.filter((r) => r.favorite)
    else if (filter !== 'Alle') list = list.filter((r) => r.category === filter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const hay = `${r.title} ${r.tags.join(' ')} ${r.ingredients.map((i) => i.name).join(' ')} ${r.category}`.toLowerCase()
        return hay.includes(q)
      })
    }
    return list
  }, [recipes, filter, query])

  return (
    <div className="relative pb-6">
      <TopBar title="Rezepte" />
      <div className="hide-scrollbar flex gap-2 overflow-x-auto px-[18px] pb-3.5">
        <Chip selected={filter === 'Alle'} onClick={() => setFilter('Alle')}>
          Alle
        </Chip>
        {categories.map((c) => (
          <Chip key={c} selected={filter === c} onClick={() => setFilter(c)}>
            {c}
          </Chip>
        ))}
        <Chip selected={filter === 'Favoriten'} onClick={() => setFilter('Favoriten')}>
          Favoriten
        </Chip>
      </div>
      <div className="px-[18px] pb-3.5">
        <div className="flex items-center justify-between border-b border-line pb-2.5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept, Zutat oder Tag suchen…"
            className="w-full bg-transparent text-[14.5px] text-cream placeholder:text-cream-soft focus:outline-none"
          />
          <SearchIcon className="text-rust flex-shrink-0" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-[18px] rounded-xl border border-dashed border-line p-8 text-center text-[12.5px] text-cream-soft">
          {recipes.length === 0 ? 'Noch keine Rezepte vorhanden.' : 'Keine Treffer für diese Suche/Filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-[18px]">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} />
          ))}
        </div>
      )}

      <button
        onClick={() => navigate('/rezepte/neu')}
        aria-label="Neues Rezept"
        className="fixed bottom-[92px] right-5 flex h-[50px] w-[50px] items-center justify-center rounded-2xl bg-rust-solid text-bg shadow-lg"
      >
        <PlusIcon width={22} height={22} />
      </button>
    </div>
  )
}
