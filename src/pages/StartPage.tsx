import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import { currentSeason } from '../lib/season'
import type { Recipe, ActivityPing } from '../db/types'
import TopBar from '../components/TopBar'
import RecipeCard, { HeroRecipeCard } from '../components/RecipeCard'
import SeasonalCarousel from '../components/SeasonalCarousel'
import { PlusIcon, CartIcon } from '../icons'

export default function StartPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [openShopping, setOpenShopping] = useState(0)
  const [activity, setActivity] = useState<ActivityPing[]>([])

  useEffect(() => {
    Promise.all([repo.listRecipes(), repo.listShoppingList()]).then(([r, s]) => {
      setRecipes(r)
      setOpenShopping(s.filter((i) => !i.checked).length)
    })
    if (repo.mode === 'cloud') {
      repo.listActivity().then((a) => setActivity(a.slice(0, 2)))
    }
  }, [])

  const season = currentSeason()
  const seasonal = recipes.filter((r) => {
    const hay = `${r.title} ${r.categories.join(' ')} ${r.tags.join(' ')}`.toLowerCase()
    return season.keywords.some((k) => hay.includes(k))
  })
  const newest = [...recipes].sort((a, b) => b.createdAt - a.createdAt)
  const featured = seasonal[0] ?? newest[0] ?? null
  const featuredIsSeasonal = !!seasonal[0]
  // Bei mehreren saisonalen Treffern wird unten eine ganze Reihe (max. 5)
  // gezeigt statt nur der einen "featured"-Karte - diese müssen dann auch
  // alle aus "Neueste Rezepte" raus, sonst tauchen sie doppelt auf.
  const featuredIds = new Set(featuredIsSeasonal && seasonal.length > 1 ? seasonal.slice(0, 5).map((r) => r.id) : featured ? [featured.id] : [])
  const gridRecipes = newest.filter((r) => !featuredIds.has(r.id)).slice(0, 2)
  // Vom aktuell angemeldeten Mitglied selbst erstellte Rezepte - nur relevant
  // im Haushalt-/Cloud-Modus mit mehreren Mitgliedern (im lokalen Solo-Modus
  // gibt es keine currentUserId, die Section bleibt dann einfach leer/aus).
  const myRecipes = authState?.currentUserId ? newest.filter((r) => r.createdByUserId === authState.currentUserId).slice(0, 2) : []

  const name = authState?.currentMemberName ?? 'Koch:in'

  return (
    <div className="pb-6">
      <TopBar title={authState?.household?.name ?? 'Löffelbande'} />

      <div className="px-[18px] pb-1 pt-1 text-[23px] font-extrabold text-cream">Hallo {name} 👋</div>
      <div className="px-[18px] pb-5 text-[12.5px] text-cream-soft">Schön, dass du wieder da bist – hier ist dein Überblick.</div>

      <div className="flex gap-2.5 px-[18px] pb-6">
        <button
          onClick={() => navigate('/rezepte/neu')}
          className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-card-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-rust-solid text-white">
            <PlusIcon width={16} height={16} />
          </div>
          <div className="text-[12.5px] font-bold text-cream">Neues Rezept</div>
        </button>
        <button
          onClick={() => navigate('/einkauf')}
          className="flex flex-1 flex-col gap-2 rounded-2xl border border-line bg-surface p-3.5 text-left shadow-card-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-rust-solid text-white">
            <CartIcon width={16} height={16} />
          </div>
          <div className="text-[12.5px] font-bold text-cream">Einkaufsliste</div>
          <div className="text-[10.5px] text-cream-soft">{openShopping} offene Punkte</div>
        </button>
      </div>

      {featured && (
        <>
          <SectionHeader eyebrow={featuredIsSeasonal ? `Passend zum ${season.label}` : 'Für dich entdeckt'} onSeeAll={() => navigate('/rezepte?filter=Alle')} />
          {featuredIsSeasonal && seasonal.length > 1 ? (
            // Mehrere saisonal passende Rezepte -> automatisch weiterschal-
            // tendes Karussell statt einer frei scrollbaren Kartenreihe (bei
            // der links das nächste Rezept schon angeschnitten hereinragte
            // und dadurch nicht mit dem restlichen Seiten-Layout bündig war)
            // - auf maximal 5 begrenzt, damit die Runde nicht ausufert.
            <div className="mb-6 px-[18px]">
              <SeasonalCarousel recipes={seasonal.slice(0, 5)} badge="Saisonal" />
            </div>
          ) : (
            <div className="mb-6 px-[18px]">
              <HeroRecipeCard recipe={featured} badge={featuredIsSeasonal ? 'Saisonal' : undefined} />
            </div>
          )}
        </>
      )}

      {gridRecipes.length > 0 && (
        <>
          <SectionHeader eyebrow="Neueste Rezepte" onSeeAll={() => navigate('/rezepte?filter=Alle')} />
          <div className="grid grid-cols-2 gap-3 px-[18px] pb-6">
            {gridRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </>
      )}

      {myRecipes.length > 0 && (
        <>
          <SectionHeader eyebrow="Deine Rezepte" onSeeAll={() => navigate('/rezepte?filter=Alle')} />
          <div className="grid grid-cols-2 gap-3 px-[18px] pb-6">
            {myRecipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        </>
      )}

      {recipes.length === 0 && (
        <div className="mx-[18px] mb-6 rounded-2xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Noch keine Rezepte – leg mit „Neues Rezept" dein erstes an.
        </div>
      )}

      {activity.length > 0 && (
        <>
          <SectionHeader eyebrow="Neueste Aktivität" onSeeAll={() => navigate('/aktivitaet')} />
          {activity.map((a) => (
            <div
              key={a.id}
              role={a.recipeId ? 'button' : undefined}
              onClick={a.recipeId ? () => navigate(`/rezepte/${a.recipeId}`) : undefined}
              className={`flex gap-3 px-[18px] py-3 ${a.recipeId ? 'cursor-pointer' : ''}`}
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] border-rust-solid bg-[color-mix(in_srgb,var(--color-rust)_14%,var(--color-bg))] text-[13px] font-bold text-rust">
                {(a.fromMemberName ?? '?').charAt(0).toUpperCase()}
              </div>
              <div className="text-[13px] leading-relaxed text-cream">
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
            </div>
          ))}
        </>
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
