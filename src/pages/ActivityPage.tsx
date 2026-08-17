import { useEffect, useState } from 'react'
import { repo } from '../data'
import type { ActivityPing } from '../db/types'

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const min = Math.round(diff / 60000)
  if (min < 1) return 'gerade eben'
  if (min < 60) return `vor ${min} Minute${min === 1 ? '' : 'n'}`
  const h = Math.round(min / 60)
  if (h < 24) return `vor ${h} Stunde${h === 1 ? '' : 'n'}`
  const d = Math.round(h / 24)
  return `vor ${d} Tag${d === 1 ? '' : 'en'}`
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityPing[]>([])

  useEffect(() => {
    if (repo.mode !== 'cloud') return
    const load = () => repo.listActivity().then(setItems)
    load()
    const unsub = repo.subscribeToChanges(load)
    return unsub
  }, [])

  return (
    <div className="pb-8">
      <div className="px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Aktivität</h1>
      </div>

      {repo.mode !== 'cloud' && (
        <div className="mx-[18px] rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Der Aktivitäts-Feed zeigt, was in deinem Haushalt passiert – dafür braucht es den Verbunden-Modus mit mindestens einem weiteren Mitglied.
        </div>
      )}

      {repo.mode === 'cloud' && items.length === 0 && (
        <div className="mx-[18px] rounded-xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Noch keine Aktivität. Sobald jemand ein Rezept hinzufügt oder markiert, taucht es hier auf.
        </div>
      )}

      {items.map((a) => (
        <div key={a.id} className="flex gap-3 border-b border-line px-[18px] py-3.5">
          <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-rust text-[13px] font-semibold text-rust">
            {(a.fromMemberName ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="text-[13px] leading-relaxed text-cream">
              <b>{a.fromMemberName ?? 'Jemand'}</b>{' '}
              {a.kind === 'new_recipe' ? (
                <>
                  hat ein neues Rezept hinzugefügt: <b>{a.recipeTitle ?? 'Rezept'}</b>
                </>
              ) : (
                <>
                  hat {a.toMemberName ? 'dich' : 'den ganzen Haushalt'} auf <b>{a.recipeTitle ?? 'ein Rezept'}</b> aufmerksam gemacht
                </>
              )}
            </div>
            {a.note && <div className="mt-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px] italic text-cream-soft">„{a.note}"</div>}
            <div className="mt-1 text-[10.5px] text-cream-soft">{timeAgo(a.createdAt)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
