import { useNavigate } from 'react-router-dom'
import type { Recipe } from '../db/types'
import { HeartIcon } from '../icons'

const TONES = [
  'linear-gradient(160deg,#7a5a35,#3c2c1a)',
  'linear-gradient(160deg,#5f6b45,#33391f)',
  'linear-gradient(160deg,#8a5638,#3f2416)',
  'linear-gradient(160deg,#725336,#2d2013)',
  'linear-gradient(160deg,#6b6250,#302a1f)',
  'linear-gradient(160deg,#8a6250,#3a2a20)',
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

export default function RecipeCard({ recipe, small }: { recipe: Recipe; small?: boolean }) {
  const navigate = useNavigate()
  const img = recipe.images[0]?.dataUrl
  const bg = img ? undefined : toneFor(recipe.id)
  const t = timeLabel(recipe)

  return (
    <div
      onClick={() => navigate(`/rezepte/${recipe.id}`)}
      className={`relative flex-shrink-0 cursor-pointer overflow-hidden rounded-xl shadow-lg ${small ? 'h-32 w-32' : 'h-[168px]'}`}
      style={{ background: bg, backgroundImage: img ? `url(${img})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(10,7,5,0.88) 0%, rgba(10,7,5,0.25) 55%, transparent 75%)' }}
      />
      {recipe.favorite && (
        <div className="absolute right-2 top-2 z-10 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-black/40 text-rust">
          <HeartIcon width={11} height={11} />
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-2">
        <div className={`font-bold leading-tight text-cream ${small ? 'text-xs' : 'text-[14.5px]'}`}>{recipe.title}</div>
        {!small && <div className="mt-1.5 h-0.5 w-5 bg-rust" />}
        {!small && (
          <div className="mt-1 text-[10.5px] text-cream-soft">
            {[t, recipe.difficulty].filter(Boolean).join(' · ')}
          </div>
        )}
      </div>
    </div>
  )
}
