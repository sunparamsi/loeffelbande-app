import { useEffect, useState } from 'react'
import type { Recipe } from '../db/types'
import { HeroRecipeCard } from './RecipeCard'

const SLIDE_INTERVAL_MS = 2000

/**
 * Automatisch weiterschaltendes Karussell für die "Passend zum Saison"-
 * Sektion auf der Startseite. Zeigt zu jedem Zeitpunkt genau EIN Rezept in
 * voller Breite (bündig mit dem restlichen Seiten-Layout, kein seitliches
 * Anschneiden des nächsten Rezepts mehr wie bei der vorherigen frei
 * scrollbaren Kartenreihe) und wechselt automatisch alle 2 Sekunden mit
 * einer nach links gleitenden Animation zum nächsten - kein manuelles
 * Wischen nötig. Tippen auf das aktuell gezeigte Rezept öffnet es weiterhin
 * ganz normal (siehe HeroRecipeCard).
 */
export default function SeasonalCarousel({ recipes, badge }: { recipes: Recipe[]; badge?: string }) {
  const [index, setIndex] = useState(0)

  // Ändert sich die Rezeptliste (z. B. nach einem Reload mit anderen
  // saisonalen Treffern), auf die erste Folie zurücksetzen statt auf einen
  // nun ungültigen Index stehen zu bleiben.
  useEffect(() => {
    setIndex(0)
  }, [recipes])

  useEffect(() => {
    if (recipes.length <= 1) return
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % recipes.length)
    }, SLIDE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [recipes.length])

  return (
    <div className="relative overflow-hidden rounded-[20px]">
      <div className="flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${index * 100}%)` }}>
        {recipes.map((r) => (
          <div key={r.id} className="w-full flex-shrink-0">
            <HeroRecipeCard recipe={r} badge={badge} />
          </div>
        ))}
      </div>
      {recipes.length > 1 && (
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-20 flex gap-1.5">
          {recipes.map((r, i) => (
            <div key={r.id} className={`h-1.5 rounded-full bg-white transition-all duration-300 ${i === index ? 'w-4 opacity-100' : 'w-1.5 opacity-50'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
