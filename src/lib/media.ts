import type { RecipeImage } from '../db/types'

/** Ob ein Rezept-Medium ein Video ist. `type` fehlt bei älteren, vor
 * Einführung von Video gespeicherten Einträgen -> dann als Foto behandeln. */
export function isVideoMedia(img: RecipeImage): boolean {
  return img.type === 'video'
}

// Videos werden (wie Fotos) als Base64-Data-URL lokal in IndexedDB abgelegt –
// ohne serverseitigen Speicher gibt es keine sinnvolle Alternative. Damit das
// nicht zu riesigen, die App verlangsamenden Datensätzen führt, ist die
// Dateigröße hier gedeckelt (deutlich großzügiger als Fotos, da Video-Dateien
// naturgemäß viel größer sind).
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024

/** Liest eine Videodatei unverändert als Data-URL ein (anders als Fotos wird
 * nichts serverlos "komprimiert" – dafür bräuchte es Video-Encoding im
 * Browser, das ist hier bewusst außen vor gelassen). Wirft, wenn die Datei
 * das Größenlimit überschreitet. */
export function fileToVideoDataUrl(file: File): Promise<string> {
  if (file.size > MAX_VIDEO_BYTES) {
    return Promise.reject(new Error(`Video ist zu groß (max. ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB).`))
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Video konnte nicht gelesen werden.'))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}
