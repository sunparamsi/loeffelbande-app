/** Wandelt einen von react-easy-crop gelieferten Ausschnitt (Pixel-Koordinaten
 * im Originalbild) in ein neues, quadratisches Bild um. Wird für den
 * Profilbild-Zuschnitt in den Einstellungen verwendet. */

export type CropPixels = { x: number; y: number; width: number; height: number }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Bild konnte nicht geladen werden.'))
    img.src = src
  })
}

export async function getCroppedImageDataUrl(imageSrc: string, crop: CropPixels, outputSize = 480, quality = 0.85): Promise<string> {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas nicht verfügbar.')
  ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, 0, 0, outputSize, outputSize)
  return canvas.toDataURL('image/jpeg', quality)
}
