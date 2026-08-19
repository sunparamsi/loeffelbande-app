import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GROCERY_CATALOG, catalogByCategory, searchCatalog, type CatalogItem, type Amount } from '../lib/groceryCatalog'
import { CatalogIcon } from '../lib/catalogIcons'
import { TextInput } from './ui'
import { ArrowLeftIcon, ArrowRightIcon, PlusIcon, CheckIcon } from '../icons'

const FALLBACK_NAV_HEIGHT = 64

/** Misst die tatsächliche Höhe der unteren Tab-Leiste (BottomNav), damit die
 * schwebende Such-/Plus-Leiste exakt darüber sitzt statt sie zu überdecken –
 * robust gegenüber Safe-Area-Insets auf iPhones mit Home-Indicator. */
function useBottomNavHeight(): number {
  const [height, setHeight] = useState(FALLBACK_NAV_HEIGHT)
  useEffect(() => {
    const el = document.querySelector('nav')
    if (!el) return
    const measure = () => setHeight(el.getBoundingClientRect().height)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return height
}

/** Tipp-first Artikel-Auswahl (angelehnt an "Bring!"): eine schwebende
 * Such-/Plus-Leiste direkt über der unteren Tab-Leiste, darüber ein
 * ausklappbares Panel mit einem kuratierten Katalog gängiger Artikel als
 * antippbare (und nach Kategorie einklappbare) Kacheln statt Freitext-
 * Tippen, plus einer "Aktiv"-Reihe mit den Artikeln, die schon auf der Liste
 * stehen. Freies Eintippen bleibt über `renderManual` jederzeit erreichbar.
 * Ein aktiver Artikel wird nur noch in der "Aktiv"-Reihe angezeigt, nicht
 * mehr zusätzlich (invertiert) in der allgemeinen Kategorie-Auswahl darunter –
 * so gibt es keine verwirrende Dopplung mehr. */
export default function GroceryAddDock({
  selectedNames,
  onAdd,
  renderManual,
}: {
  /** Kleingeschriebene Namen, die bereits auf der Liste stehen – bestimmt,
   * welche Artikel in die "Aktiv"-Reihe wandern statt in die allgemeine
   * Kategorie-Auswahl. */
  selectedNames: Set<string>
  onAdd: (item: { name: string; quantity: number | null; unit: string; category?: string }) => void
  renderManual: (close: () => void) => ReactNode
}) {
  const navHeight = useBottomNavHeight()
  const [open, setOpen] = useState(false)
  const [manual, setManual] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const [searchHidden, setSearchHidden] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (y > lastScrollY.current + 6 && y > 40) setSearchHidden(true)
      else if (y < lastScrollY.current - 6 || y < 40) setSearchHidden(false)
      lastScrollY.current = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const closeAll = () => {
    setOpen(false)
    setManual(false)
    setQuery('')
    setSelectedItem(null)
  }

  const commit = (item: { name: string; quantity: number | null; unit: string; category?: string }) => {
    onAdd(item)
    setQuery('')
    setSelectedItem(null)
  }

  const pickAmount = (item: CatalogItem, amount: Amount | null) => {
    commit({ name: item.name, quantity: amount?.quantity ?? null, unit: amount?.unit ?? '', category: item.category })
  }

  const toggleCategory = (cat: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const activeItems = GROCERY_CATALOG.filter((c) => selectedNames.has(c.name.toLowerCase()))
  const results = query.trim() ? searchCatalog(query) : []
  const exactMatch = results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <>
      {open && (
        <div className="fixed inset-x-0 z-30 mx-auto max-w-[560px] px-[18px]" style={{ bottom: navHeight + 12 }}>
          <div className="max-h-[58vh] overflow-y-auto rounded-2xl border border-line bg-surface p-4 shadow-card">
            {manual ? (
              renderManual(closeAll)
            ) : selectedItem ? (
              <>
                <div className="mb-3 flex items-center gap-2.5">
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-line text-cream-soft"
                  >
                    <ArrowLeftIcon width={14} height={14} />
                  </button>
                  <div className="flex items-center gap-2 text-sm font-bold text-cream">
                    <CatalogIcon name={selectedItem.name} size={28} tone="orange" />
                    {selectedItem.name}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.amounts.map((a) => (
                    <button
                      key={`${a.quantity}${a.unit}`}
                      onClick={() => pickAmount(selectedItem, a)}
                      className="rounded-full border border-line bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-cream"
                    >
                      {a.quantity} {a.unit}
                    </button>
                  ))}
                  <button
                    onClick={() => pickAmount(selectedItem, null)}
                    className="rounded-full border border-dashed border-rust px-3.5 py-2 text-[12.5px] font-semibold text-rust"
                  >
                    Ohne Menge
                  </button>
                </div>
              </>
            ) : query.trim() ? (
              <>
                <TileGrid items={results} selectedNames={selectedNames} onPick={setSelectedItem} />
                {!exactMatch && (
                  <button
                    onClick={() => commit({ name: query.trim(), quantity: null, unit: '' })}
                    className="mt-2 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-rust px-3.5 py-3 text-left text-[13px] font-semibold text-rust"
                  >
                    „{query.trim()}“ hinzufügen
                  </button>
                )}
              </>
            ) : (
              <>
                {activeItems.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">Aktiv</div>
                    <TileGrid items={activeItems} selectedNames={selectedNames} onPick={setSelectedItem} />
                  </div>
                )}
                {catalogByCategory().map(({ category, items }) => {
                  const visibleItems = items.filter((i) => !selectedNames.has(i.name.toLowerCase()))
                  if (visibleItems.length === 0) return null
                  const isOpen = expandedCats.has(category)
                  return (
                    <div key={category} className="mb-1.5">
                      <button onClick={() => toggleCategory(category)} className="flex w-full items-center justify-between py-2 text-left">
                        <span className="text-[10.5px] font-bold uppercase tracking-wider text-cream-soft">{category}</span>
                        <ArrowRightIcon width={13} height={13} className={`text-cream-soft transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="pb-2 pt-1">
                          <TileGrid items={visibleItems} selectedNames={selectedNames} onPick={setSelectedItem} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}

            {!manual && (
              <button
                onClick={() => setManual(true)}
                className="mt-2 w-full text-center text-[11.5px] font-semibold text-cream-soft underline decoration-dotted"
              >
                Lieber manuell eintippen (mit Menge &amp; Einheit)
              </button>
            )}
          </div>
        </div>
      )}

      <div className="fixed inset-x-0 z-30 mx-auto max-w-[560px] px-[18px]" style={{ bottom: navHeight }}>
        <div className="flex items-center gap-2 pb-3">
          <div className={`overflow-hidden transition-all duration-200 ease-out ${searchHidden ? 'w-0 flex-none opacity-0' : 'flex-1 opacity-100'}`}>
            <TextInput
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedItem(null)
                setManual(false)
                if (!open) setOpen(true)
              }}
              onFocus={() => setOpen(true)}
              placeholder="Ich brauche…"
              className="shadow-card-sm"
            />
          </div>
          <button
            onClick={() => (open ? closeAll() : setOpen(true))}
            className="flex h-[46px] w-[46px] flex-shrink-0 items-center justify-center rounded-full border border-rust-solid bg-rust-solid text-white shadow-[0_10px_24px_rgba(242,129,74,0.35)]"
            aria-label={open ? 'Schließen' : 'Artikel hinzufügen'}
          >
            <PlusIcon width={20} height={20} className={`transition-transform ${open ? 'rotate-45' : ''}`} />
          </button>
        </div>
      </div>
    </>
  )
}

function TileGrid({
  items,
  selectedNames,
  onPick,
}: {
  items: CatalogItem[]
  selectedNames: Set<string>
  onPick: (item: CatalogItem) => void
}) {
  if (items.length === 0) return null
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => {
        const isSelected = selectedNames.has(item.name.toLowerCase())
        return (
          <button
            key={item.name}
            onClick={() => onPick(item)}
            className={`relative flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-4 text-center ${
              isSelected
                ? 'border-rust-solid bg-[color-mix(in_srgb,var(--color-rust-solid)_8%,white)]'
                : 'border-transparent bg-rust-solid'
            }`}
          >
            {isSelected && (
              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rust-solid text-white">
                <CheckIcon width={9} height={9} />
              </span>
            )}
            <CatalogIcon name={item.name} size={42} tone={isSelected ? 'orange' : 'white'} />
            <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-rust-dark' : 'text-white'}`}>
              {item.name}
            </span>
          </button>
        )
      })}
    </div>
  )
}
