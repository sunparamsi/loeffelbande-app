import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSharedRecipePublic } from '../data'
import type { Recipe } from '../db/types'
import { timeLabel } from '../components/RecipeCard'
import { Chip } from '../components/ui'
import { formatCategories } from '../lib/recipeCategories'
import { segmentIngredients } from '../lib/ingredientGroups'

export default function SharedRecipePage() {
  const { token } = useParams()
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined)

  useEffect(() => {
    if (!token) return
    getSharedRecipePublic(token).then((r) => setRecipe(r ?? null))
  }, [token])

  if (recipe === undefined) {
    return <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-cream-soft">Lädt…</div>
  }
  if (recipe === null) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-cream">
        <div className="text-lg font-bold">Rezept nicht gefunden</div>
        <div className="text-[13px] text-cream-soft">Der Link ist ungültig oder wurde zurückgezogen.</div>
      </div>
    )
  }

  const img = recipe.images[0]?.dataUrl

  return (
    <div className="mx-auto min-h-dvh max-w-[560px] bg-bg pb-10">
      <div className="border-b border-line bg-surface px-[18px] py-2.5 text-center text-[12px] text-cream-soft">
        Geteiltes Rezept · <Link to="/" className="font-bold text-rust">Eigene Rezeptsammlung starten →</Link>
      </div>
      <div
        className="relative flex h-[220px] items-end"
        style={{ background: img ? `url(${img}) center/cover` : 'linear-gradient(160deg,#8a5638,#3f2416)' }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(10,7,5,0.92), transparent 75%)' }} />
        <div className="relative z-10 w-full px-[18px] pb-5 pt-5">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-rust">{[formatCategories(recipe.categories), recipe.cuisine].filter(Boolean).join(' · ')}</div>
          <div className="mt-1.5 text-[26px] font-extrabold leading-tight text-cream">{recipe.title}</div>
        </div>
      </div>
      <div className="px-[18px] pt-5">
        <div className="flex border-y border-line py-3.5">
          <MetaCol label="Zeit" value={timeLabel(recipe) ?? '–'} />
          <MetaCol label="Portionen" value={recipe.servings ? String(recipe.servings) : '–'} />
          <MetaCol label="Level" value={recipe.difficulty ?? '–'} />
        </div>
        {recipe.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {recipe.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </div>
        )}
        {recipe.description && <p className="mt-4 text-[13.5px] leading-relaxed text-cream-soft">{recipe.description}</p>}

        <h2 className="mt-6 mb-3 text-[17px] font-bold text-cream">Zutaten</h2>
        {segmentIngredients(recipe.ingredients).map((seg, segIdx) => (
          <div key={seg.groupName ?? `main-${segIdx}`}>
            {seg.groupName && (
              <div className={`text-[11.5px] font-bold uppercase tracking-wide text-rust ${segIdx === 0 ? 'pb-1.5' : 'pb-1.5 pt-3'}`}>{seg.groupName}</div>
            )}
            {seg.items.map((ing) => (
              <div key={ing.id} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px] text-cream">
                <div className="min-w-[62px] font-medium text-cream-soft">{ing.quantity ? `${ing.quantity} ${ing.unit}` : ing.unit}</div>
                <div>{ing.name}</div>
              </div>
            ))}
          </div>
        ))}

        <h2 className="mt-6 mb-3 text-[17px] font-bold text-cream">Zubereitung</h2>
        {recipe.steps.map((s, i) => (
          <div key={s.id} className="flex gap-3.5 py-3">
            <div className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-rust-solid text-[12px] font-bold text-bg">{i + 1}</div>
            <div className="pt-0.5 text-[13.5px] leading-relaxed text-cream">{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-left">
      <div className="text-[9.5px] uppercase tracking-wider text-cream-soft">{label}</div>
      <div className="mt-1 text-[16px] font-bold text-cream">{value}</div>
    </div>
  )
}
