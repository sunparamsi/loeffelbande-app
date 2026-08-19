import { useEffect, useMemo, useState } from 'react'
import { repo } from '../data'
import type { PantryItem } from '../db/types'
import { PlusIcon, SearchIcon, TrashIcon } from '../icons'
import { TextInput, PrimaryButton } from '../components/ui'
import GroceryPicker from '../components/GroceryPicker'

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr)
  const now = new Date()
  d.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>([])
  const [query, setQuery] = useState('')
  const [adding, setAdding] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [form, setForm] = useState({ name: '', quantity: '', unit: '', category: '', expiryDate: '' })

  const load = () => repo.listPantry().then(setItems)
  useEffect(() => {
    load()
  }, [])

  const addQuick = async (item: { name: string; quantity: number | null; unit: string; category?: string }) => {
    await repo.savePantryItem({
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category || 'Sonstiges',
      updatedAt: Date.now(),
    })
    load()
  }

  const filtered = items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()))
  const groups = useMemo(() => {
    const map = new Map<string, PantryItem[]>()
    for (const item of filtered) {
      const key = item.category || 'Sonstiges'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }
    return Array.from(map.entries())
  }, [filtered])

  const save = async () => {
    if (!form.name.trim()) return
    await repo.savePantryItem({
      id: crypto.randomUUID(),
      name: form.name.trim(),
      quantity: form.quantity ? Number(form.quantity) : null,
      unit: form.unit,
      category: form.category || 'Sonstiges',
      expiryDate: form.expiryDate || undefined,
      updatedAt: Date.now(),
    })
    setForm({ name: '', quantity: '', unit: '', category: '', expiryDate: '' })
    setAdding(false)
    setManualMode(false)
    load()
  }

  const remove = async (id: string) => {
    await repo.deletePantryItem(id)
    load()
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Vorrat</h1>
        <button
          onClick={() => {
            setAdding((a) => !a)
            setManualMode(false)
          }}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm"
        >
          <PlusIcon />
        </button>
      </div>

      {adding && !manualMode && <GroceryPicker recentKey="pantry" onAdd={addQuick} onManualFallback={() => setManualMode(true)} />}

      {adding && manualMode && (
        <div className="mx-[18px] mb-4 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput className="mb-2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Zutat (z. B. Parmesan)" />
          <div className="mb-2 grid grid-cols-2 gap-2">
            <TextInput value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Menge" type="number" />
            <TextInput value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Einheit" />
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <TextInput value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="z. B. Kühlschrank" />
            <TextInput value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} type="date" />
          </div>
          <PrimaryButton className="w-full" onClick={save}>
            Hinzufügen
          </PrimaryButton>
          <button onClick={() => setManualMode(false)} className="mt-2 w-full text-center text-[11.5px] font-semibold text-cream-soft underline decoration-dotted">
            Zurück zur Schnellauswahl
          </button>
        </div>
      )}

      <div className="px-[18px] pb-3">
        <div className="flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2.5">
          <SearchIcon width={16} height={16} className="flex-shrink-0 text-cream-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zutat suchen…"
            className="w-full bg-transparent text-[13.5px] text-cream placeholder:text-cream-soft focus:outline-none"
          />
        </div>
      </div>

      {groups.length === 0 && <div className="mx-[18px] rounded-2xl border border-dashed border-line p-8 text-center text-[12.5px] text-cream-soft">Noch nichts im Vorrat.</div>}

      {groups.map(([cat, list]) => (
        <div key={cat}>
          <div className="px-[18px] pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-rust">{cat}</div>
          {list.map((item) => {
            const soon = item.expiryDate ? daysUntil(item.expiryDate) <= 5 : false
            return (
              <div key={item.id} className="mx-[18px] mb-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 text-[13.5px] text-cream shadow-card-sm">
                <div>
                  <div>{item.name}</div>
                  {item.expiryDate && <div className={`mt-0.5 text-[10.5px] font-bold ${soon ? 'text-rust' : 'text-cream-soft'}`}>läuft am {item.expiryDate} ab</div>}
                </div>
                <div className="flex items-center gap-2">
                  {(item.quantity || item.unit) && (
                    <div className="rounded-md bg-surface-2 px-2.5 py-1 text-[11.5px] font-semibold text-cream-soft">
                      {item.quantity ?? ''} {item.unit}
                    </div>
                  )}
                  <button onClick={() => remove(item.id)} className="text-cream-soft">
                    <TrashIcon width={15} height={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
