import { useCallback, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { getCroppedImageDataUrl } from '../lib/cropImage'
import { XIcon, CheckIcon } from '../icons'

/** Modal zum Zuschneiden eines hochgeladenen Bildes auf einen frei wählbaren
 * Ausschnitt (per Ziehen/Zoomen), bevor es als rundes Profilbild gespeichert
 * wird – statt das ganze Bild ungefragt zu verwenden. */
export default function AvatarCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  onCancel: () => void
  onConfirm: (dataUrl: string) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [busy, setBusy] = useState(false)

  const onCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  const confirm = async () => {
    if (!croppedAreaPixels) return
    setBusy(true)
    try {
      const dataUrl = await getCroppedImageDataUrl(imageSrc, croppedAreaPixels)
      onConfirm(dataUrl)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-[18px] py-[18px]">
        <button onClick={onCancel} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white/20 bg-white/10 text-white">
          <XIcon width={16} height={16} />
        </button>
        <h1 className="text-sm font-bold text-white">Ausschnitt wählen</h1>
        <button
          onClick={confirm}
          disabled={busy || !croppedAreaPixels}
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-rust-solid text-white disabled:opacity-50"
        >
          <CheckIcon width={16} height={16} />
        </button>
      </div>

      <div className="relative flex-1">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      <div className="px-[24px] pb-[calc(24px+env(safe-area-inset-bottom))] pt-4">
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-rust"
          aria-label="Zoom"
        />
        <div className="mt-3 text-center text-[11.5px] text-white/70">Ziehen zum Verschieben, Regler zum Zoomen</div>
      </div>
    </div>
  )
}
