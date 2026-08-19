import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { repo } from '../data'
import type { ShoppingListItem, Recipe } from '../db/types'
import { PlusIcon, CheckIcon, TrashIcon } from '../icons'
import { TextInput, PrimaryButton } from '../components/ui'
import { addPurchasedItemToPantry } from '../lib/pantrySync'
import GroceryPicker from '../components/GroceryPicker'

export default function ShoppingListPage() {
  const [items, setItems] = useState<ShoppingListItem[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [adding, setAdding] = useState(false)
  const [manualMode, setManualMode] = useState(false)
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

  // Optimistisch (sofort im lokalen State ändern, dann erst im Hintergrund
  // speichern) statt nach jeder Aktion komplett neu zu laden – fühlt sich
  // beim An-/Abhaken sofort und "satt" an (ähnlich wie bei Bring!), statt
  // dass die App auf die Antwort der Datenbank wartet, bevor sich sichtbar
  // etwas tut. Im Verbunden-Modus sorgt subscribeToChanges weiterhin dafür,
  // dass Änderungen anderer Haushaltsmitglieder ankommen.
  const toggle = async (item: ShoppingListItem) => {
    const nextChecked = !item.checked
    const updated = { ...item, checked: nextChecked }
    setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    await repo.saveShoppingItem(updated)
    // Als "gekauft" markiert -> wandert automatisch in den Vorrat (gleicher
    // Name + Einheit wird zusammengeführt/addiert). Beim Zurücksetzen wird
    // nichts aus dem Vorrat entfernt, falls dort inzwischen manuell etwas
    // angepasst wurde.
    if (nextChecked) await addPurchasedItemToPantry(item)
  }

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await repo.deleteShoppingItem(id)
  }

  const addItem = async (item: { name: string; quantity: number | null; unit: string }) => {
    const newItem: ShoppingListItem = {
      id: crypto.randomUUID(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: false,
      fromRecipeIds: [],
      addedAt: Date.now(),
    }
    setItems((prev) => [...prev, newItem])
    await repo.saveShoppingItem(newItem)
  }

  const add = async () => {
    if (!name.trim()) return
    await addItem({ name: name.trim(), quantity: qty ? Number(qty) : null, unit })
    setName('')
    setQty('')
    setUnit('')
    setAdding(false)
    setManualMode(false)
  }

  const recipeTitle = (rid: string) => recipes.find((r) => r.id === rid)?.title

  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Einkaufsliste</h1>
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
      {repo.mode === 'cloud' && (
        <div className="px-[18px] pb-3 text-[11.5px] text-cream-soft">Alle Haushaltsmitglieder sehen diese Liste live in Echtzeit.</div>
      )}

      {adding && !manualMode && (
        <GroceryPicker recentKey="shopping" onAdd={addItem} onManualFallback={() => setManualMode(true)} />
      )}

      {adding && manualMode && (
        <div className="mx-[18px] mb-4 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput className="mb-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Was fehlt?" />
          <div className="mb-3 grid grid-cols-2 gap-2">
            <TextInput value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge" type="number" />
            <TextInput value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Einheit" />
          </div>
          <PrimaryButton className="w-full" onClick={add}>
            Hinzufügen
          </PrimaryButton>
          <button onClick={() => setManualMode(false)} className="mt-2 w-full text-center text-[11.5px] font-semibold text-cream-soft underline decoration-dotted">
            Zurück zur Schnellauswahl
          </button>
        </div>
      )}

      {items.length === 0 && <div className="mx-[18px] rounded-2xl border border-dashed border-line p-8 text-center text-[12.5px] text-cream-soft">Einkaufsliste ist leer.</div>}

      <AnimatePresence initial={false}>
        {open.map((item) => (
          <Row key={item.id} item={item} recipeTitle={recipeTitle} onToggle={toggle} onRemove={remove} />
        ))}
      </AnimatePresence>
      {done.length > 0 && <div className="px-[18px] pb-2 pt-4 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Erledigt</div>}
      <AnimatePresence initial={false}>
        {done.map((item) => (
          <Row key={item.id} item={item} recipeTitle={recipeTitle} onToggle={toggle} onRemove={remove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Zeile in der Einkaufsliste – angelehnt an das An-/Abhak-Gefühl von Bring!:
 * die ganze Zeile ist der Tap-Ziel (nicht nur der kleine Kreis), reagiert mit
 * einem kurzen "Zusammendrücken" auf den Tap, der Haken poppt beim Abhaken
 * spürbar rein, und die Zeile gleitet weich aus der offenen Liste raus (bzw.
 * beim Zurückholen wieder rein), statt abrupt zu verschwinden. */
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
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      onClick={() => onToggle(item)}
      className={`mx-[18px] mb-2 flex cursor-pointer items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card-sm ${item.checked ? 'opacity-45' : ''}`}
    >
      <span
        className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full border-2 ${item.checked ? 'border-sage bg-sage text-bg' : 'border-rust'}`}
      >
        <AnimatePresence>
          {item.checked && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 20 }}
            >
              <CheckIcon width={13} height={13} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div className="flex-1">
        <div className={`text-[13.5px] font-medium text-cream ${item.checked ? 'line-through' : ''}`}>{item.name}</div>
        <div className="mt-0.5 text-[11px] text-cream-soft">{fromLabel}</div>
      </div>
      <div className="text-[12px] text-cream-soft">
        {item.quantity ?? ''} {item.unit}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item.id)
        }}
        className="p-1 text-cream-soft"
        aria-label="Entfernen"
      >
        <TrashIcon width={14} height={14} />
      </button>
    </motion.div>
  )
}
