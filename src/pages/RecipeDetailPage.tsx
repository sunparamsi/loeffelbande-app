import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import { timeLabel } from '../components/RecipeCard'
import { Chip, PrimaryButton, OutlineButton } from '../components/ui'
import { ArrowLeftIcon, HeartIcon, HeartOutlineIcon, EditIcon, ShareIcon, PlayIcon, InstagramIcon, LinkIcon, CheckIcon } from '../icons'
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
        className="relative flex h-[220px] items-end"
        style={{
          background: img ? `url(${img}) center/cover` : 'linear-gradient(160deg,#8a5638,#3f2416)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,7,5,0.92) 0%, rgba(10,7,5,0.35) 50%, rgba(10,7,5,0.05) 75%)' }}
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/40 text-cream"
        >
          <ArrowLeftIcon />
        </button>
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button onClick={toggleFav} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/40 text-rust">
            {recipe.favorite ? <HeartIcon width={16} height={16} /> : <HeartOutlineIcon width={16} height={16} />}
          </button>
          <button
            onClick={() => navigate(`/rezepte/${recipe.id}/bearbeiten`)}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-black/40 text-cream"
          >
            <EditIcon width={16} height={16} />
          </button>
        </div>
        <div className="relative z-10 w-full px-[18px] pb-5 pt-5">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-rust">
            {[recipe.category, recipe.cuisine].filter(Boolean).join(' · ')}
          </div>
          <div className="mt-1.5 text-[26px] font-extrabold leading-tight tracking-tight text-cream">{recipe.title}</div>
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
        {recipe.ingredients.map((ing) => (
          <div key={ing.id} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px] text-cream">
            <button
              onClick={() => toggleIngredient(ing.id)}
              className={`flex h-[17px] w-[17px] flex-shrink-0 items-center justify-center rounded-[5px] border ${checked.has(ing.id) ? 'border-sage bg-sage text-bg' : 'border-rust'}`}
            >
              {checked.has(ing.id) && <CheckIcon width={11} height={11} />}
            </button>
            <div className="min-w-[62px] font-medium text-cream-soft">
              {ing.quantity ? `${ing.quantity} ${ing.unit}` : ing.unit}
            </div>
            <div className={checked.has(ing.id) ? 'line-through text-cream-soft' : ''}>
              {ing.name}
              {ing.note && <span className="text-cream-soft"> ({ing.note})</span>}
            </div>
          </div>
        ))}
        {recipe.ingredients.length === 0 && <div className="text-[12.5px] text-cream-soft">Keine Zutaten hinterlegt.</div>}

        <h2 className="mt-6 mb-3 text-[17px] font-bold text-cream">Zubereitung</h2>
        {recipe.steps.map((s, i) => (
          <div key={s.id} className="flex gap-3.5 py-3">
            <div className="mt-0.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-rust-solid text-[12px] font-bold text-bg">
              {i + 1}
            </div>
            <div className="pt-0.5 text-[13.5px] leading-relaxed text-cream">{s.text}</div>
          </div>
        ))}
        {recipe.steps.length === 0 && <div className="text-[12.5px] text-cream-soft">Keine Zubereitungsschritte hinterlegt.</div>}

        {(recipe.links.length > 0 || recipe.sourceUrl) && (
          <>
            <h2 className="mt-6 mb-3 text-[17px] font-bold text-cream">Quelle</h2>
            {recipe.sourceUrl && (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[12.5px] text-cream-soft"
              >
                <LinkIcon width={16} height={16} /> {recipe.sourceUrl}
              </a>
            )}
            {recipe.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-3.5 py-3 text-[12.5px] text-cream-soft"
              >
                {l.label.toLowerCase().includes('insta') ? <InstagramIcon width={16} height={16} /> : <PlayIcon width={14} height={14} />}
                {l.label}: {l.url}
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
            className="mt-6 w-full rounded-[10px] border border-dashed border-rust py-3 text-center text-[12.5px] font-semibold text-rust"
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

        {status && <div className="mt-3 rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-[12px] text-cream-soft break-all">{status}</div>}

        {showPing && (
          <div className="mt-3 rounded-xl border border-line bg-surface p-4">
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-cream-soft">An wen markieren?</div>
            <div className="flex flex-wrap gap-1.5">
              <Chip selected={pingTo === null} onClick={() => setPingTo(null)}>
                Ganzer Haushalt
              </Chip>
              {members.map((m) => (
                <Chip key={m.id} selected={pingTo === m.id} onClick={() => setPingTo(m.id)}>
                  {m.displayName}
                </Chip>
              ))}
            </div>
            <textarea
              value={pingNote}
              onChange={(e) => setPingNote(e.target.value)}
              placeholder="Kurze Notiz (optional)…"
              className="mt-3 w-full resize-none rounded-[10px] border border-line bg-bg px-3 py-2 text-[13px] text-cream placeholder:text-cream-soft/70 focus:outline-none"
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

function MetaCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 text-left">
      <div className="text-[9.5px] uppercase tracking-wider text-cream-soft">{label}</div>
      <div className="mt-1 text-[16px] font-bold text-cream">{value}</div>
    </div>
  )
}
