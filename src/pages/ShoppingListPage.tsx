import { useEffect, useState } from 'react'
import { repo } from '../data'
import type { ShoppingListItem, Recipe } from '../db/types'
import { PlusIcon, CheckIcon, TrashIcon } from '../icons'
import { TextInput, PrimaryButton } from '../components/ui'

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('')

  const load = () => {
    repo.listShoppingList().then(setItems)
    repo.listRecipes().then(setRecipes)
  }

  useEffect(() => {
    load()
    const unsub = repo.subscribeToChanges(load)
    return unsub
  }, [])

  const toggle = async (item: ShoppingListItem) => {
    await repo.saveShoppingItem({ ...item, checked: !item.checked })
    load()
  }

  const remove = async (id: string) => {
    await repo.deleteShoppingItem(id)
    load()
  }

  const add = async () => {
    if (!name.trim()) return
    await repo.saveShoppingItem({
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: qty ? Number(qty) : null,
      unit,
      checked: false,
      fromRecipeIds: [],
      addedAt: Date.now(),
    })
    setName('')
    setQty('')
    setUnit('')
    setAdding(false)
    load()
  }

  const recipeTitle = (rid: string) => recipes.find((r) => r.id === rid)?.title

  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Einkaufsliste</h1>
        <button onClick={() => setAdding((a) => !a)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm">
          <PlusIcon />
        </button>
      </div>
      {repo.mode === 'cloud' && (
        <div className="px-[18px] pb-3 text-[11.5px] text-cream-soft">Alle Haushaltsmitglieder sehen diese Liste live in Echtzeit.</div>
      )}

      {adding && (
        <div className="mx-[18px] mb-4 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput className="mb-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Was fehlt?" />
          <div className="mb-3 grid grid-cols-2 gap-2">
            <TextInput value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge" type="number" />
            <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Einheit" />
          </div>
          <PrimaryButton className="w-full" onClick={add}>
            Hinzufügen
          </PrimaryButton>
        </div>
      )}

      {items.length === 0 && <div className="mx-[18px] rounded-2xl border border-dashed border-line p-8 text-center text-[12.5px] text-cream-soft">Einkaufsliste ist leer.</div>}

      {open.map((item) => (
        <Row key={item.id} item={item} recipeTitle={recipeTitle} onToggle={toggle} onRemove={remove} />
      ))}
      {done.length > 0 && <div className="px-[18px] pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Erledigt</div>}
      {done.map((item) => (
        <Row key={item.id} item={item} recipeTitle={recipeTitle} onToggle={toggle} onRemove={remove} />
      ))}
    </div>
  )
}

function Row({
  item,
  recipeTitle,
  onToggle,
  onRemove,
}: {
  item: ShoppingListItem
  recipeTitle: (id: string) => string | undefined
  onToggle: (i: ShoppingListItem) => void
  onRemove: (id: string) => void
}) {
  const fromLabel = item.fromRecipeIds.length > 0 ? `für ${item.fromRecipeIds.map(recipeTitle).filter(Boolean).join(', ')}` : 'manuell hinzugefügt'
  return (
    <div className={`mx-[18px] mb-2 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card-sm ${item.checked ? 'opacity-45' : ''}`}>
      <button
        onClick={() => onToggle(item)}
        className={`flex h-[19px] w-[19px] flex-shrink-0 items-center justify-center rounded-full border ${item.checked ? 'border-sage bg-sage text-bg' : 'border-rust'}`}
      >
        {item.checked && <CheckIcon width={11} height={11} />}
      </button>
      <div className="flex-1">
        <div className={`text-[13.5px] font-medium text-cream ${item.checked ? 'line-through' : ''}`}>{item.name}</div>
        <div className="mt-0.5 text-[11px] text-cream-soft">{fromLabel}</div>
      </div>
      <div className="text-[12px] text-cream-soft">
        {item.quantity ?? ''} {item.unit}
      </div>
      <button onClick={() => onRemove(item.id)} className="text-cream-soft">
        <TrashIcon width={14} height={14} />
      </button>
    </div>
  )
}
