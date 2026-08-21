import { useEffect, useRef, useState } from 'react'
import type { RecipeImage } from '../db/types'
import { isVideoMedia } from '../lib/media'
import { XIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons'

// Ab dieser Wisch-Distanz (nach unten) gilt die Geste als "schließen", nicht
// mehr als "nur ein bisschen verrutscht".
const CLOSE_DRAG_THRESHOLD = 110

/** Vollbild-Ansicht für Rezeptfotos/-videos: Titelbild antippen öffnet diese
 * Ansicht, bei mehreren Medien lässt sie sich per Pfeil/Punkt durchblättern.
 * Videos bekommen eigene Bedienelemente (nativer <video>-Player). */
export default function MediaLightbox({ media, startIndex, onClose }: { media: RecipeImage[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex)
  // Runterwisch-Geste zum Schließen (wie in Foto-Apps üblich): die ganze
  // Ansicht folgt dem Finger nach unten und blendet dabei aus; wird die
  // Wisch-Distanz überschritten, schließt die Galerie beim Loslassen, sonst
  // federt sie zurück. Nur nach unten (nicht seitlich/oben), damit es nicht
  // mit Taps auf Buttons/Video-Bedienelemente kollidiert.
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const start = touchStartRef.current
    if (!start) return
    const dx = e.touches[0].clientX - start.x
    const dy = e.touches[0].clientY - start.y
    if (dy > 8 && dy > Math.abs(dx)) {
      setDragging(true)
      setDragY(dy)
    }
  }
  const onTouchEnd = () => {
    touchStartRef.current = null
    if (dragY > CLOSE_DRAG_THRESHOLD) {
      onClose()
      return
    }
    setDragging(false)
    setDragY(0)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + media.length) % media.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % media.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [media.length, onClose])

  // Solange die Galerie offen ist, darf die Seite dahinter nicht scrollen -
  // sonst wirkt es so, als würde sich "irgendwo" im Vollbild etwas bewegen
  // (bzw. auf iOS Safari: die Seite dahinter scrollt tatsächlich weiter und
  // wird unterhalb der eigentlich vollflächigen Galerie sichtbar). Reines
  // "overflow: hidden" auf <body> reicht dafür auf iOS Safari NICHT aus -
  // Touch-Scroll wird dort trotzdem durchgereicht. Robuster, plattform-
  // unabhängiger Trick: <body> selbst per position:fixed "einfrieren" (an
  // der aktuellen Scroll-Position) und beim Schließen wieder freigeben.
  useEffect(() => {
    const scrollY = window.scrollY
    const body = document.body
    const original = { position: body.style.position, top: body.style.top, left: body.style.left, right: body.style.right, width: body.style.width, overflow: body.style.overflow }
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    body.style.overflow = 'hidden'
    return () => {
      body.style.position = original.position
      body.style.top = original.top
      body.style.left = original.left
      body.style.right = original.right
      body.style.width = original.width
      body.style.overflow = original.overflow
      window.scrollTo(0, scrollY)
    }
  }, [])

  if (media.length === 0) return null
  const current = media[index]

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-black/95"
      style={{
        overscrollBehavior: 'contain',
        transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
        opacity: dragY > 0 ? Math.max(1 - dragY / 500, 0.35) : 1,
        transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
    >
      {/* Kopfzeile schwebt über dem Medium, statt eigenen Platz zu beanspruchen -
       * so bleibt das Bild/Video immer exakt in der Bildschirmmitte, egal ob
       * Fußzeile (Punkte) vorhanden ist oder nicht. */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
        <div className="text-[12px] font-bold text-white/80">
          {media.length > 1 ? `${index + 1} / ${media.length}` : ''}
        </div>
        <button onClick={onClose} aria-label="Schließen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
          <XIcon width={16} height={16} />
        </button>
      </div>

      <div className="absolute inset-0 flex items-center justify-center px-2 py-16">
        {media.length > 1 && (
          <button
            onClick={() => setIndex((i) => (i - 1 + media.length) % media.length)}
            aria-label="Vorheriges Medium"
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <ArrowLeftIcon width={18} height={18} />
          </button>
        )}

        {isVideoMedia(current) ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video key={current.id} src={current.dataUrl} controls autoPlay playsInline className="max-h-full max-w-full rounded-lg" />
        ) : (
          <img key={current.id} src={current.dataUrl} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        )}

        {media.length > 1 && (
          <button
            onClick={() => setIndex((i) => (i + 1) % media.length)}
            aria-label="Nächstes Medium"
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <ArrowRightIcon width={18} height={18} />
          </button>
        )}
      </div>

      {media.length > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-1.5 pb-6 pt-3">
          {media.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setIndex(i)}
              aria-label={`Medium ${i + 1} anzeigen`}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
