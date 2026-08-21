import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import TopBar from '../components/TopBar'
import RecipeCard from '../components/RecipeCard'
import { Chip } from '../components/ui'
import { SearchIcon, PlusIcon, FilterIcon } from '../icons'
import { useCategories } from '../lib/useCategories'
import { useAuth } from '../lib/useAuth'
import { getRecipeListFilter, setRecipeListFilter, getRecipeListOnlyMine, setRecipeListOnlyMine } from '../lib/prefs'

export default function RecipeListPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { authState } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [query, setQuery] = useState('')
  // Zuletzt gewählter Filter wird gemerkt (lib/prefs.ts), damit er beim
  // Wechsel auf einen anderen Tab und zurück erhalten bleibt, statt sich
  // beim Neu-Mounten dieser Seite immer auf "Alle" zurückzusetzen. Ein
  // expliziter ?filter=... in der URL (z. B. vom „Favoriten"-Link auf der
  // Startseite) hat trotzdem Vorrang vor dem gemerkten Wert.
  const [filter, setFilterState] = useState<string>(() => searchParams.get('filter') || getRecipeListFilter() || 'Alle')
  const [onlyMine, setOnlyMineState] = useState<boolean>(() => getRecipeListOnlyMine())
  const [sortAlpha, setSortAlpha] = useState(false)
  const { categories } = useCategories()

  const applyFilter = (value: string) => {
    setFilterState(value)
    setRecipeListFilter(value)
  }

  // Ein direkter Link von woanders (z. B. „Favoriten" oben auf der
  // Startseite) kann den Filter über ?filter=... vorbelegen.
  useEffect(() => {
    const f = searchParams.get('filter')
    if (f) applyFilter(f)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('filter')])

  // Getippte Kategorie/Favoriten-Chip erneut antippen -> Auswahl aufheben,
  // zurück zu "Alle".
  const toggleFilter = (value: string) => applyFilter(filter === value ? 'Alle' : value)

  const toggleOnlyMine = () => {
    setOnlyMineState((v) => {
      const next = !v
      setRecipeListOnlyMine(next)
      return next
    })
  }

  useEffect(() => {
    repo.listRecipes().then(setRecipes)
  }, [])

  const filtered = useMemo(() => {
    let list = recipes
    if (filter === 'Favoriten') list = list.filter((r) => r.favorite)
    else if (filter !== 'Alle') list = list.filter((r) => r.categories.includes(filter))
    if (onlyMine) list = list.filter((r) => r.createdByUserId && r.createdByUserId === authState?.currentUserId)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter((r) => {
        const hay = `${r.title} ${r.tags.join(' ')} ${r.ingredients.map((i) => i.name).join(' ')} ${r.categories.join(' ')}`.toLowerCase()
        return hay.includes(q)
      })
    }
    list = [...list]
    if (sortAlpha) list.sort((a, b) => a.title.localeCompare(b.title, 'de'))
    else list.sort((a, b) => b.createdAt - a.createdAt)
    return list
  }, [recipes, filter, onlyMine, authState, query, sortAlpha])

  return (
    <div className="relative pb-6">
      <TopBar title="Rezepte" />

      <div className="hide-scrollbar flex gap-2 overflow-x-auto px-[18px] pb-3.5 pt-1">
        <Chip selected={filter === 'Alle'} onClick={() => applyFilter('Alle')}>
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
        {repo.mode === 'cloud' && (
          <Chip selected={onlyMine} onClick={toggleOnlyMine}>
            Nur meine
          </Chip>
        )}
      </div>

      <div className="flex items-center gap-2.5 px-[18px] pb-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5">
          <SearchIcon width={16} height={16} className="flex-shrink-0 text-cream-soft" />
          <input
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rezept, Zutat oder Tag suchen…"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-cream placeholder:text-cream-soft focus:outline-none"
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
