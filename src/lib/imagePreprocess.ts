/**
 * Bereitet ein Foto vor der Texterkennung (Tesseract) auf, um die Trefferquote
 * zu verbessern – komplett lokal per Canvas, keine KI/kein Training nötig:
 *
 * 1) Hochskalieren, falls das Foto zu klein ist (Texterkennung braucht genug
 *    Pixel pro Buchstabe – ein kleines Handyfoto liefert oft zu wenig Auflösung).
 * 2) In Graustufen wandeln + Kontrast/Helligkeit strecken (Histogram-Stretch),
 *    damit auch schlecht beleuchtete/blasse Fotos einen klaren Hell-Dunkel-
 *    Kontrast zwischen Text und Hintergrund bekommen, bevor Tesseract intern
 *    binarisiert.
 */
export async function preprocessForOcr(file: File): Promise<Blob> {
  const bitmap = await loadBitmap(file)

  const MAX_DIM = 2200
  const MIN_DIM = 1400
  const longEdge = Math.max(bitmap.width, bitmap.height)
  let scale = 1
  if (longEdge < MIN_DIM) scale = Math.min(2.5, MIN_DIM / longEdge)
  else if (longEdge > MAX_DIM) scale = MAX_DIM / longEdge

  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, width, height)

  const imgData = ctx.getImageData(0, 0, width, height)
  const { data } = imgData

  // Graustufen + Min/Max für Kontrast-Stretch ermitteln
  let min = 255
  let max = 0
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    gray[p] = g
    if (g < min) min = g
    if (g > max) max = g
  }
  const range = Math.max(1, max - min)

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const stretched = ((gray[p] - min) / range) * 255
    data[i] = data[i + 1] = data[i + 2] = stretched
  }
  ctx.putImageData(imgData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Bild konnte nicht verarbeitet werden.'))), 'image/png')
  })
}

function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    return createImageBitmap(file)
  }
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
    img.src = URL.createObjectURL(file)
  })
}
