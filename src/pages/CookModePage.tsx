import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import { XIcon, SunIcon, PlusIcon, CheckIcon } from '../icons'
import { getWakeLockPref } from '../lib/prefs'
import { PrimaryButton, OutlineButton } from '../components/ui'

export default function CookModePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [awake, setAwake] = useState(false)
  const [addedToShoppingList, setAddedToShoppingList] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!id) return
    repo.getRecipe(id).then((r) => setRecipe(r ?? null))
  }, [id])

  // Direkt während des Kochens fehlende Zutaten nachbestellen können, ohne
  // das Rezept dafür verlassen zu müssen – dieselbe "alle Zutaten
  // hinzufügen"-Logik wie auf RecipeDetailPage, hier als kompakter Button.
  const addAllToShoppingList = async () => {
    if (!recipe) return
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
    setAddedToShoppingList(true)
  }

  useEffect(() => {
    let cancelled = false
    async function requestLock() {
      try {
        if (!getWakeLockPref()) return
        if ('wakeLock' in navigator) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lock = await (navigator as any).wakeLock.request('screen')
          if (cancelled) {
            lock.release()
            return
          }
          wakeLockRef.current = lock
          setAwake(true)
        }
      } catch {
        setAwake(false)
      }
    }
    requestLock()
    return () => {
      cancelled = true
      wakeLockRef.current?.release().catch(() => {})
    }
  }, [])

  if (!recipe) {
    return <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-cream-soft">Lädt…</div>
  }

  const steps = recipe.steps.length > 0 ? recipe.steps : [{ id: 'x', text: 'Keine Zubereitungsschritte hinterlegt.' }]
  const step = steps[stepIndex]

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex items-center justify-between px-[18px] py-5">
        <button onClick={() => navigate(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm">
          <XIcon width={15} height={15} />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cream-soft">
          <SunIcon width={13} height={13} className={awake ? 'text-sage' : ''} />
          {awake ? 'Bildschirm bleibt an' : 'Bildschirm-Sperre nicht verhindert'}
        </div>
        <div className="text-[13px] font-extrabold text-rust">
          {stepIndex + 1} / {steps.length}
        </div>
      </div>

      <div className="px-6 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-rust">
        {recipe.title} · Schritt {stepIndex + 1}
      </div>

      <div className="flex flex-1 items-center px-6 py-10">
        <div className="text-[32px] font-bold leading-snug text-cream">{step.text}</div>
      </div>

      {recipe.ingredients.length > 0 && (
        <div className="px-6 pb-3.5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rust">Zutaten im Überblick</div>
            <button
              onClick={addAllToShoppingList}
              disabled={addedToShoppingList}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                addedToShoppingList ? 'border-sage text-sage' : 'border-dashed border-rust text-rust'
              }`}
            >
              {addedToShoppingList ? <CheckIcon width={10} height={10} /> : <PlusIcon width={10} height={10} />}
              {addedToShoppingList ? 'Hinzugefügt' : 'Zur Einkaufsliste'}
            </button>
          </div>
          <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex-shrink-0 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] text-cream-soft shadow-card-sm">
                {ing.quantity ? `${ing.quantity} ${ing.unit} ` : ''}
                {ing.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 flex gap-2.5 px-[18px] pb-6 pt-4" style={{ background: 'linear-gradient(to top, var(--color-bg) 60%, transparent)' }}>
        <OutlineButton className="flex-1" onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>
          ← Zurück
        </OutlineButton>
        {stepIndex < steps.length - 1 ? (
          <PrimaryButton className="flex-[2]" onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}>
            Weiter →
          </PrimaryButton>
        ) : (
          <button
            onClick={() => navigate(`/rezepte/${recipe.id}`)}
            className="flex flex-[2] items-center justify-center gap-2 rounded-full border border-sage bg-sage py-3.5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(127,163,94,0.35)]"
          >
            Fertig ✓
          </button>
        )}
      </div>
    </div>
  )
}
