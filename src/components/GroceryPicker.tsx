import { useState } from 'react'
import { GROCERY_CATALOG, catalogByCategory, searchCatalog, type CatalogItem, type Amount } from '../lib/groceryCatalog'
import { getRecentNames, addRecentName } from '../lib/recentGroceries'
import { TextInput } from './ui'
import { ArrowLeftIcon } from '../icons'

/** Tipp-first Artikel-Auswahl (angelehnt an "Bring!"): ein kuratierter
 * Katalog gängiger Artikel als antippbare Kacheln statt Freitext-Tippen,
 * gruppiert nach Kategorie, mit Suche und einer "Zuletzt verwendet"-Reihe.
 * Freies Eintippen bleibt über den Link am Ende jederzeit erreichbar. */
export default function GroceryPicker({
  recentKey,
  onAdd,
  onManualFallback,
}: {
  recentKey: string
  onAdd: (item: { name: string; quantity: number | null; unit: string; category?: string }) => void
  onManualFallback: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<CatalogItem | null>(null)

  const commit = (item: { name: string; quantity: number | null; unit: string; category?: string }) => {
    addRecentName(recentKey, item.name)
    onAdd(item)
    setQuery('')
    setSelected(null)
  }

  const pickAmount = (item: CatalogItem, amount: Amount | null) => {
    commit({ name: item.name, quantity: amount?.quantity ?? null, unit: amount?.unit ?? '', category: item.category })
  }

  const recentNames = getRecentNames(recentKey)
  const results = query.trim() ? searchCatalog(query) : []
  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  if (selected) {
    return (
      <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
        <div className="mb-3 flex items-center gap-2.5">
          <button onClick={() => setSelected(null)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line text-cream-soft">
            <ArrowLeftIcon width={14} height={14} />
          </button>
          <div className="text-sm font-bold text-cream">
            {selected.emoji} {selected.name}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.amounts.map((a) => (
            <button
              key={`${a.quantity}${a.unit}`}
              onClick={() => pickAmount(selected, a)}
              className="rounded-full border border-line bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-cream"
            >
              {a.quantity} {a.unit}
            </button>
          ))}
          <button onClick={() => pickAmount(selected, null)} className="rounded-full border border-dashed border-rust px-3.5 py-2 text-[12.5px] font-semibold text-rust">
            Ohne Menge
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
      <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ich brauche…" className="mb-3" />

      {query.trim() ? (
        <>
          <TileGrid items={results} onPick={(item) => setSelected(item)} />
          {!exactMatch && (
            <button
              onClick={() => commit({ name: query.trim(), quantity: null, unit: '' })}
              className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-rust px-3.5 py-3 text-left text-[13px] font-semibold text-rust"
            >
              „{query.trim()}“ hinzufügen
            </button>
          )}
          {results.length === 0 && !query.trim() && <div className="text-[12px] text-cream-soft">Keine Treffer.</div>}
        </>
      ) : (
        <>
          {recentNames.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Zuletzt verwendet</div>
              <TileGrid
                items={recentNames.map((n) => GROCERY_CATALOG.find((c) => c.name === n) ?? { name: n, category: '', emoji: '🛒', amounts: [] })}
                onPick={(item) => (item.amounts.length > 0 ? setSelected(item) : commit({ name: item.name, quantity: null, unit: '' }))}
              />
            </div>
          )}
          {catalogByCategory().map(({ category, items }) => (
            <div key={category} className="mb-3">
              <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">{category}</div>
              <TileGrid items={items} onPick={(item) => setSelected(item)} />
            </div>
          ))}
        </>
      )}

      <button onClick={onManualFallback} className="mt-1 w-full text-center text-[11.5px] font-semibold text-cream-soft underline decoration-dotted">
        Lieber manuell eintippen (mit Menge &amp; Einheit)
      </button>
    </div>
  )
}

function TileGrid({ items, onPick }: { items: CatalogItem[]; onPick: (item: CatalogItem) => void }) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => onPick(item)}
          className="flex flex-col items-center gap-1 rounded-xl border border-line bg-surface-2 px-2 py-3 text-center"
        >
          <span className="text-[22px] leading-none">{item.emoji}</span>
          <span className="text-[11px] font-semibold leading-tight text-cream">{item.name}</span>
        </button>
      ))}
    </div>
  )
}
