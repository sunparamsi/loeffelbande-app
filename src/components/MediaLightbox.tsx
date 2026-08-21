import { useEffect, useState } from 'react'
import type { RecipeImage } from '../db/types'
import { isVideoMedia } from '../lib/media'
import { XIcon, ArrowLeftIcon, ArrowRightIcon } from '../icons'

/** Vollbild-Ansicht für Rezeptfotos/-videos: Titelbild antippen öffnet diese
 * Ansicht, bei mehreren Medien lässt sie sich per Pfeil/Punkt durchblättern.
 * Videos bekommen eigene Bedienelemente (nativer <video>-Player). */
export default function MediaLightbox({ media, startIndex, onClose }: { media: RecipeImage[]; startIndex: number; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + media.length) % media.length)
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % media.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [media.length, onClose])

  if (media.length === 0) return null
  const current = media[index]

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/95" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between px-4 pt-4">
        <div className="text-[12px] font-bold text-white/80">
          {media.length > 1 ? `${index + 1} / ${media.length}` : ''}
        </div>
        <button onClick={onClose} aria-label="Schließen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white">
          <XIcon width={16} height={16} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2">
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
        <div className="flex items-center justify-center gap-1.5 pb-6 pt-3">
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
