import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import type { Recipe } from '../db/types'
import { BookmarkIcon, BookmarkFilledIcon, ClockIcon } from '../icons'
import { repo } from '../data'

const TONES = [
  'linear-gradient(150deg,#ffd9b3,#ffb37a)',
  'linear-gradient(150deg,#dcead0,#b7d69a)',
  'linear-gradient(150deg,#ffe6b0,#ffc06e)',
  'linear-gradient(150deg,#f6d3d9,#e39aa8)',
  'linear-gradient(150deg,#f7efdd,#e8d8b0)',
  'linear-gradient(150deg,#f3d3ba,#dd9a6c)',
]

function toneFor(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return TONES[h % TONES.length]
}

export function timeLabel(r: Recipe) {
  const total = (r.prepTimeMinutes ?? 0) + (r.cookTimeMinutes ?? 0)
  if (!total) return null
  if (total >= 120) return `${Math.round(total / 60)} Std`
  return `${total} Min`
}

function FavButton({ recipe, size = 'sm' }: { recipe: Recipe; size?: 'sm' | 'lg' }) {
  const [fav, setFav] = useState(!!recipe.favorite)
  const dim = size === 'lg' ? 'h-[26px] w-[26px]' : 'h-6 w-6'
  const iconSize = size === 'lg' ? 13 : 11
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation()
        const next = !fav
        setFav(next)
        await repo.saveRecipe({ ...recipe, favorite: next, updatedAt: Date.now() })
      }}
      aria-label={fav ? 'Von Favoriten entfernen' : 'Zu Favoriten hinzufügen'}
      className={`absolute right-2 top-2 z-10 flex ${dim} items-center justify-center rounded-full bg-white/90 shadow-card-sm ${fav ? 'text-rust' : 'text-cream-soft/70'}`}
    >
      {fav ? <BookmarkFilledIcon width={iconSize} height={iconSize} /> : <BookmarkIcon width={iconSize} height={iconSize} />}
    </button>
  )
}

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const navigate = useNavigate()
  const img = recipe.images[0]?.dataUrl
  const bg = img ? undefined : toneFor(recipe.id)
  const t = timeLabel(recipe)

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-card-sm">
      <div
        onClick={() => navigate(`/rezepte/${recipe.id}`)}
        className="relative h-[118px] cursor-pointer bg-cover bg-center"
        style={{ background: bg, backgroundImage: img ? `url(${img})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <FavButton recipe={recipe} />
      </div>
      <div className="px-3 pb-3.5 pt-2.5">
        <div className="text-[13.5px] font-bold leading-tight text-cream">{recipe.title}</div>
        {t && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10.5px] text-cream-soft">
            <ClockIcon width={12} height={12} />
            {t}
          </div>
        )}
      </div>
    </div>
  )
}

export function HeroRecipeCard({
  recipe,
  badge,
  onClick,
}: {
  recipe: Recipe
  badge?: string
  onClick?: () => void
}) {
  const navigate = useNavigate()
  const img = recipe.images[0]?.dataUrl
  const bg = img ? undefined : toneFor(recipe.id)

  return (
    <div
      onClick={onClick ?? (() => navigate(`/rezepte/${recipe.id}`))}
      className="relative h-[200px] cursor-pointer overflow-hidden rounded-[20px] shadow-card"
      style={{ background: bg, backgroundImage: img ? `url(${img})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(20,12,5,0.82) 0%, rgba(20,12,5,0.15) 55%, transparent 78%)' }}
      />
      {badge && (
        <div className="absolute left-2.5 top-2.5 z-10 rounded-full bg-white/92 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-rust">
          {badge}
        </div>
      )}
      <FavButton recipe={recipe} size="lg" />
      <div className="absolute inset-x-0 bottom-0 z-10 px-3.5 pb-3.5 text-[20px] font-extrabold leading-tight text-white">
        {recipe.title}
      </div>
    </div>
  )
}
