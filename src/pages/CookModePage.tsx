import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe } from '../db/types'
import { XIcon, SunIcon } from '../icons'
import { getWakeLockPref } from '../lib/prefs'

export default function CookModePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  const [awake, setAwake] = useState(false)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!id) return
    repo.getRecipe(id).then((r) => setRecipe(r ?? null))
  }, [id])

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
    <div className="flex min-h-dvh flex-col bg-[#0e0b08]">
      <div className="flex items-center justify-between px-[18px] py-5">
        <button onClick={() => navigate(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-surface text-cream">
          <XIcon />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-cream-soft">
          <SunIcon width={13} height={13} className={awake ? 'text-sage' : ''} />
          {awake ? 'Bildschirm bleibt an' : 'Bildschirm-Sperre nicht verhindert'}
        </div>
        <div className="text-[13px] font-bold text-rust">
          {stepIndex + 1} / {steps.length}
        </div>
      </div>

      <div className="px-6 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-rust">
        {recipe.title} · Schritt {stepIndex + 1}
      </div>

      <div className="flex flex-1 items-center px-6 py-10">
        <div className="text-[32px] font-semibold leading-snug text-cream">{step.text}</div>
      </div>

      {recipe.ingredients.length > 0 && (
        <div className="px-6 pb-3.5">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-rust">Zutaten im Überblick</div>
          <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
            {recipe.ingredients.map((ing) => (
              <div key={ing.id} className="flex-shrink-0 rounded-full border border-line px-3 py-1.5 text-[11px] text-cream-soft">
                {ing.quantity ? `${ing.quantity} ${ing.unit} ` : ''}
                {ing.name}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 flex gap-2.5 px-[18px] pb-6 pt-4" style={{ background: 'linear-gradient(to top, #0e0b08 60%, transparent)' }}>
        <button
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
          className="flex-1 rounded-[3px] border border-cream py-3 text-center text-[11px] font-bold uppercase tracking-wider text-cream disabled:opacity-30"
        >
          ← Zurück
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
            className="flex-[2] rounded-[3px] border border-rust-solid bg-rust-solid py-3 text-center text-[11px] font-bold uppercase tracking-wider text-bg"
          >
            Weiter →
          </button>
        ) : (
          <button
            onClick={() => navigate(`/rezepte/${recipe.id}`)}
            className="flex-[2] rounded-[3px] border border-sage bg-sage py-3 text-center text-[11px] font-bold uppercase tracking-wider text-bg"
          >
            Fertig ✓
          </button>
        )}
      </div>
    </div>
  )
}
