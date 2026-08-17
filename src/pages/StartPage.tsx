import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import { currentSeason } from '../lib/season'
import type { Recipe, PantryItem, ActivityPing } from '../db/types'
import TopBar from '../components/TopBar'
import RecipeCard from '../components/RecipeCard'
import { PlusIcon, CartIcon } from '../icons'

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export default function StartPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [pantry, setPantry] = useState<PantryItem[]>([])
  const [openShopping, setOpenShopping] = useState(0)
  const [activity, setActivity] = useState<ActivityPing[]>([])

  useEffect(() => {
    Promise.all([repo.listRecipes(), repo.listPantry(), repo.listShoppingList()]).then(([r, p, s]) => {
      setRecipes(r)
      setPantry(p)
      setOpenShopping(s.filter((i) => !i.checked).length)
    })
    if (repo.mode === 'cloud') {
      repo.listActivity().then((a) => setActivity(a.slice(0, 2)))
    }
  }, [])

  const season = currentSeason()
  const seasonal = recipes
    .filter((r) => {
      const hay = `${r.title} ${r.category} ${r.tags.join(' ')}`.toLowerCase()
      return season.keywords.some((k) => hay.includes(k))
    })
    .slice(0, 5)
  const newest = [...recipes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const expiring = pantry
    .filter((p) => p.expiryDate && daysUntil(p.expiryDate) <= 7)
    .sort((a, b) => (a.expiryDate! < b.expiryDate! ? -1 : 1))
    .slice(0, 4)

  const name = authState?.currentMemberName ?? 'Koch:in'

  return (
    <div className="pb-6">
      <TopBar title={authState?.household?.name ?? 'Löffelbande'} />

      <div className="px-[18px] pb-1 pt-1 text-2xl font-extrabold text-cream">Hallo {name} 👋</div>
      <div className="px-[18px] pb-4 text-[12.5px] text-cream-soft">Schön, dass du wieder da bist – hier ist dein Überblick.</div>

      <div className="flex gap-2.5 px-[18px] pb-5">
        <button
          onClick={() => navigate('/rezepte/neu')}
          className="flex flex-1 flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 text-left"
        >
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-rust-solid text-bg">
            <PlusIcon width={16} height={16} />
          </div>
          <div className="text-[12.5px] font-bold text-cream">Neues Rezept</div>
        </button>
        <button
          onClick={() => navigate('/einkauf')}
          className="flex flex-1 flex-col gap-2 rounded-xl border border-line bg-surface p-3.5 text-left"
        >
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] bg-rust-solid text-bg">
            <CartIcon width={16} height={16} />
          </div>
          <div className="text-[12.5px] font-bold text-cream">Einkaufsliste</div>
          <div className="text-[10.5px] text-cream-soft">{openShopping} offene Punkte</div>
        </button>
      </div>

      {seasonal.length > 0 && (
        <>
          <SectionHeader eyebrow={`Passend zum ${season.label}`} onSeeAll={() => navigate('/rezepte')} />
          <div className="hide-scrollbar flex gap-2.5 overflow-x-auto px-[18px] pb-6">
            {seasonal.map((r) => (
              <RecipeCard key={r.id} recipe={r} small />
            ))}
          </div>
        </>
      )}

      {newest.length > 0 && (
        <>
          <SectionHeader eyebrow="Neueste Rezepte" onSeeAll={() => navigate('/rezepte')} />
          <div className="hide-scrollbar flex gap-2.5 overflow-x-auto px-[18px] pb-6">
            {newest.map((r) => (
              <RecipeCard key={r.id} recipe={r} small />
            ))}
          </div>
        </>
      )}

      {recipes.length === 0 && (
        <div className="mx-[18px] mb-6 rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Noch keine Rezepte – leg mit „Neues Rezept" dein erstes an.
        </div>
      )}

      {expiring.length > 0 && (
        <>
          <SectionHeader eyebrow="Läuft bald ab" seeAllLabel="Vorrat ansehen →" onSeeAll={() => navigate('/vorrat')} />
          {expiring.map((p) => {
            const d = daysUntil(p.expiryDate!)
            return (
              <div key={p.id} className="flex items-center justify-between border-b border-line px-[18px] py-2.5 text-[13px] text-cream">
                <div>
                  {p.name} {p.quantity ? `· ${p.quantity} ${p.unit}` : ''}
                </div>
                <div className="text-[10.5px] font-bold text-rust">{d <= 0 ? 'heute' : `in ${d} Tag${d === 1 ? '' : 'en'}`}</div>
              </div>
            )
          })}
        </>
      )}

      {activity.length > 0 && (
        <>
          <SectionHeader eyebrow="Neueste Aktivität" onSeeAll={() => navigate('/aktivitaet')} />
          {activity.map((a) => (
            <div key={a.id} className="px-[18px] py-3 text-[13px] text-cream">
              <b>{a.fromMemberName ?? 'Jemand'}</b>{' '}
              {a.kind === 'new_recipe' ? (
                <>
                  hat ein neues Rezept hinzugefügt: <b>{a.recipeTitle}</b>
                </>
              ) : (
                <>
                  hat dich auf <b>{a.recipeTitle}</b> aufmerksam gemacht
                </>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function SectionHeader({
  eyebrow,
  onSeeAll,
  seeAllLabel = 'Alle ansehen →',
}: {
  eyebrow: string
  onSeeAll: () => void
  seeAllLabel?: string
}) {
  return (
    <div className="flex items-baseline justify-between px-[18px] pb-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wider text-rust">{eyebrow}</div>
      <button onClick={onSeeAll} className="text-[11px] font-bold text-rust">
        {seeAllLabel}
      </button>
    </div>
  )
}
