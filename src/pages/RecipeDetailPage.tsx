import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import { timeLabel } from '../components/RecipeCard'
import { PrimaryButton, OutlineButton } from '../components/ui'
import {
  ArrowLeftIcon,
  BookmarkIcon,
  BookmarkFilledIcon,
  EditIcon,
  ShareIcon,
  PlayIcon,
  InstagramIcon,
  LinkIcon,
  ClockIcon,
  LevelIcon,
  LeafIcon,
} from '../icons'
import type { Member } from '../data/repo'

export default function RecipeDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [showPing, setShowPing] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [pingTo, setPingTo] = useState<string | null>(null)
  const [pingNote, setPingNote] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    repo.getRecipe(id).then((r) => setRecipe(r ?? null))
  }, [id])

  if (!recipe) {
    return <div className="p-6 text-center text-sm text-cream-soft">Lädt…</div>
  }

  const toggleFav = async () => {
    const updated = { ...recipe, favorite: !recipe.favorite, updatedAt: Date.now() }
    setRecipe(updated)
    await repo.saveRecipe(updated)
  }

  const toggleIngredient = (iid: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(iid)) next.delete(iid)
      else next.add(iid)
      return next
    })
  }

  const openPing = async () => {
    if (repo.mode !== 'cloud') {
      setStatus('„Markieren" ist nur im Verbunden-Modus verfügbar.')
      return
    }
    const m = await repo.listMembers()
    setMembers(m.filter((mm) => !mm.isYou))
    setShowPing(true)
  }

  const sendPing = async () => {
    try {
      await repo.pingRecipe(recipe.id, pingTo, pingNote)
      setStatus('Markiert! Die Person bekommt eine Benachrichtigung.')
      setShowPing(false)
      setPingNote('')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Fehler beim Markieren.')
    }
  }

  const shareLink = async () => {
    if (repo.mode !== 'cloud') {
      setStatus('Teilen-Links sind nur im Verbunden-Modus verfügbar.')
      return
    }
    try {
      const link = await repo.createShareLink(recipe.id)
      const url = `${window.location.origin}/teilen/${link.token}`
      await navigator.clipboard.writeText(url).catch(() => {})
      setStatus(`Link kopiert: ${url}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Fehler beim Erstellen des Links.')
    }
  }

  const img = recipe.images[0]?.dataUrl

  return (
    <div className="pb-8">
      <div
        className="relative flex h-[280px] items-end"
        style={{
          background: img ? `url(${img}) center/cover` : 'linear-gradient(150deg,#f3d3ba,#dd9a6c)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(15,9,4,0.75) 0%, rgba(15,9,4,0.15) 45%, transparent 62%)' }}
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/92 text-cream shadow-card-sm"
        >
          <ArrowLeftIcon width={16} height={16} />
        </button>
        <button
          onClick={() => navigate(`/rezepte/${recipe.id}/bearbeiten`)}
          className="absolute right-4 top-4 z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/92 text-cream shadow-card-sm"
        >
          <EditIcon width={16} height={16} />
        </button>
        <div className="relative z-10 w-full px-[18px] pb-[26px]">
          <div className="text-[10.5px] font-bold uppercase tracking-wider" style={{ color: '#ffcfa8' }}>
            {[recipe.category, recipe.cuisine].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-1.5 text-[25px] font-extrabold leading-tight tracking-tight text-white">{recipe.title}</div>
        </div>
      </div>

      <div className="relative -mt-[22px] rounded-t-[22px] bg-bg px-[18px] pb-2 pt-[22px]">
        <button
          onClick={toggleFav}
          className={`absolute -top-5 right-[18px] flex items-center gap-1.5 rounded-full bg-surface px-4 py-2.5 text-xs font-bold shadow-card ${recipe.favorite ? 'text-rust' : 'text-cream'}`}
        >
          {recipe.favorite ? <BookmarkFilledIcon width={15} height={15} /> : <BookmarkIcon width={15} height={15} />}
          {recipe.favorite ? 'Gespeichert' : 'Speichern'}
        </button>

        <div className="mb-4 mt-1 flex gap-[18px]">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-cream-soft">
            <ClockIcon width={15} height={15} className="text-rust" />
            {timeLabel(recipe) ?? '–'}
          </div>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-cream-soft">
            <LevelIcon width={15} height={15} className="text-rust" />
            {recipe.difficulty ?? '–'}
          </div>
        </div>

        {recipe.tags.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {recipe.tags.map((t) => (
              <div key={t} className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1.5 text-[11px] font-semibold text-cream-soft">
                <LeafIcon width={12} height={12} className="text-sage" />
                {t}
              </div>
            ))}
          </div>
        )}

        {recipe.description && <p className="mt-3.5 text-[13.5px] leading-relaxed text-cream-soft">{recipe.description}</p>}

        <div className="mb-3 mt-[22px] flex items-center justify-between">
          <h2 className="text-[17px] font-extrabold text-cream">Zutaten</h2>
          {recipe.servings ? (
            <div className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11.5px] font-bold text-cream-soft">{recipe.servings} Portionen</div>
          ) : null}
        </div>
        {recipe.ingredients.map((ing) => {
          const isChecked = checked.has(ing.id)
          return (
            <button
              key={ing.id}
              onClick={() => toggleIngredient(ing.id)}
              className="flex w-full items-center gap-3 py-2 text-left text-[13.5px] text-cream"
            >
              <span className={`mx-[3px] h-[7px] w-[7px] flex-shrink-0 rounded-full ${isChecked ? 'bg-sage' : 'bg-cream-soft/50'}`} />
              <span className="min-w-[58px] font-semibold text-cream-soft" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {ing.quantity ? `${ing.quantity} ${ing.unit}` : ing.unit}
              </span>
              <span className={isChecked ? 'text-cream-soft line-through' : ''}>
                {ing.name}
                {ing.note && <span className="text-cream-soft"> ({ing.note})</span>}
              </span>
            </button>
          )
        })}
        {recipe.ingredients.length === 0 && <div className="text-[12.5px] text-cream-soft">Keine Zutaten hinterlegt.</div>}

        <h2 className="mb-3 mt-[22px] text-[17px] font-extrabold text-cream">Zubereitung</h2>
        {recipe.steps.map((s, i) => (
          <div key={s.id} className="mb-2.5 flex gap-3 rounded-2xl bg-rust-solid px-4 py-3.5">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-white/25 text-[12.5px] font-extrabold text-white">
              {i + 1}
            </div>
            <div className="pt-0.5 text-[13.5px] font-medium leading-relaxed text-white">{s.text}</div>
          </div>
        ))}
        {recipe.steps.length === 0 && <div className="text-[12.5px] text-cream-soft">Keine Zubereitungsschritte hinterlegt.</div>}

        {(recipe.links.length > 0 || recipe.sourceUrl) && (
          <>
            <h2 className="mb-3 mt-[22px] text-[17px] font-extrabold text-cream">Quelle</h2>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[12.5px] text-cream-soft shadow-card-sm"
              >
                <LinkIcon width={16} height={16} className="flex-shrink-0" />
                <span className="min-w-0 truncate">{hostnameLabel(recipe.sourceUrl)}</span>
              </a>
            )}
            {recipe.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 py-3 text-[12.5px] text-cream-soft shadow-card-sm"
              >
                <span className="flex-shrink-0">
                  {l.label.toLowerCase().includes('insta') ? <InstagramIcon width={16} height={16} /> : <PlayIcon width={14} height={14} />}
                </span>
                <span className="min-w-0 truncate">{l.label}</span>
              </a>
            ))}
          </>
        )}

        {recipe.ingredients.length > 0 && (
          <button
            onClick={async () => {
              const items = await repo.listShoppingList()
              const existingNames = new Set(items.map((i) => i.name.toLowerCase()))
              for (const ing of recipe.ingredients) {
                if (existingNames.has(ing.name.toLowerCase())) continue
                await repo.saveShoppingItem({
                  id: crypto.randomUUID(),
                  name: ing.name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  checked: false,
                  fromRecipeIds: [recipe.id],
                  addedAt: Date.now(),
                })
              }
              setStatus('Zutaten zur Einkaufsliste hinzugefügt.')
            }}
            className="mt-6 w-full rounded-full border-[1.5px] border-dashed border-rust py-3 text-center text-[12.5px] font-bold text-rust"
          >
            + Zutaten zur Einkaufsliste hinzufügen
          </button>
        )}

        <div className="mt-3 flex gap-2">
          <OutlineButton className="flex-1" onClick={openPing}>
            <ShareIcon width={14} height={14} /> Markieren
          </OutlineButton>
          <OutlineButton className="flex-1" onClick={shareLink}>
            <ShareIcon width={14} height={14} /> Link teilen
          </OutlineButton>
        </div>
        <PrimaryButton className="mt-2.5 w-full" onClick={() => navigate(`/rezepte/${recipe.id}/kochen`)}>
          <PlayIcon width={13} height={13} /> Kochmodus starten
        </PrimaryButton>

        {status && <div className="mt-3 rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[12px] text-cream-soft shadow-card-sm break-all">{status}</div>}

        {showPing && (
          <div className="mt-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-cream-soft">An wen markieren?</div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setPingTo(null)}
                className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold ${pingTo === null ? 'border-rust-solid bg-rust-solid text-white' : 'border-line bg-bg text-cream-soft'}`}
              >
                Ganzer Haushalt
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPingTo(m.id)}
                  className={`rounded-full border px-3.5 py-2 text-[12.5px] font-semibold ${pingTo === m.id ? 'border-rust-solid bg-rust-solid text-white' : 'border-line bg-bg text-cream-soft'}`}
                >
                  {m.displayName}
                </button>
              ))}
            </div>
            <textarea
              value={pingNote}
              onChange={(e) => setPingNote(e.target.value)}
              placeholder="Kurze Notiz (optional)…"
              className="mt-3 w-full resize-none rounded-xl border border-line bg-bg px-3 py-2 text-[13px] text-cream placeholder:text-cream-soft/70 focus:outline-none"
              rows={2}
            />
            <PrimaryButton className="mt-3 w-full" onClick={sendPing}>
              Senden
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}

/** Zeigt bei Quellen-Links nur die Domain statt der vollen (oft langen) URL an,
 * damit die Karte nicht durch den Linktext gesprengt wird. */
function hostnameLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}
