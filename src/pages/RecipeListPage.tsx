import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import TopBar from '../components/TopBar'
import RecipeCard from '../components/RecipeCard'
import { Chip } from '../components/ui'
import { SearchIcon, PlusIcon, FilterIcon } from '../icons'
import { useCategories } from '../lib/useCategories'

export default function RecipeListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<string>(() => searchParams.get('filter') || 'Alle')
  const [sortAlpha, setSortAlpha] = useState(false)
  const { categories } = useCategories()

  // Ein direkter Link von woanders (z. B. „Favoriten" oben auf der
  // Startseite) kann den Filter über ?filter=... vorbelegen.
  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) setFilter(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('filter')])

  // Getippte Kategorie/Favoriten-Chip erneut antippen -> Auswahl aufheben,
  // zurück zu "Alle".
  const toggleFilter = (value: string) => setFilter((current) => (current === value ? 'Alle' : value))

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
    list = [...list]
    if (sortAlpha) list.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    else list.sort((a, b) => b.createdAt - a.createdAt)
    return list
  }, [recipes, filter, query, sortAlpha])

  return (
    <div className="relative pb-6">
      <TopBar title="Rezepte" />

      <div className="hide-scrollbar flex gap-2 overflow-x-auto px-[18px] pb-3.5 pt-1">
        <Chip selected={filter === 'Alle'} onClick={() => setFilter('Alle')}>
          Alle
        </Chip>
        {categories.map((c) => (
          <Chip key={c} selected={filter === c} onClick={() => toggleFilter(c)}>
            {c}
          </Chip>
        ))}
        <Chip selected={filter === 'Favoriten'} fav={filter !== 'Favoriten'} onClick={() => toggleFilter('Favoriten')}>
          Favoriten
        </Chip>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] pb-4">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5">
          <SearchIcon width={16} height={16} className="flex-shrink-0 text-cream-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept, Zutat oder Tag suchen…"
            className="w-full bg-transparent text-[13.5px] text-cream placeholder:text-cream-soft focus:outline-none"
          />
        </div>
        <button
          onClick={() => setSortAlpha((v) => !v)}
          aria-label="Sortierung umschalten"
          title={sortAlpha ? 'Sortiert A–Z – tippen für Neueste zuerst' : 'Sortiert nach Neueste – tippen für A–Z'}
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-card-sm ${sortAlpha ? 'text-rust' : 'text-cream'}`}
        >
          <FilterIcon width={15} height={15} />
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="mx-[18px] rounded-2xl border border-dashed border-line p-8 text-center text-[12.5px] text-cream-soft">
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
        className="fixed bottom-[92px] right-5 flex h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-rust-solid text-white shadow-[0_12px_26px_rgba(242,129,74,0.45)]"
      >
        <PlusIcon width={22} height={22} />
      </button>
    </div>
  )
}
