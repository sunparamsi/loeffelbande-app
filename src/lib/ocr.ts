import { createWorker } from 'tesseract.js'
import { preprocessForOcr } from './imagePreprocess'

/** Texterkennung läuft vollständig lokal im Browser (WASM), es wird kein Foto hochgeladen.
 * Das Foto wird vorher clientseitig aufbereitet (hochskaliert + Kontrast gestreckt),
 * das verbessert die Trefferquote von Tesseract spürbar – siehe imagePreprocess.ts. */
export async function recognizeText(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const worker = await createWorker('deu', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100))
    },
  })
  try {
    const prepared = await preprocessForOcr(file).catch(() => file)
    const {
      data: { text },
    } = await worker.recognize(prepared)
    return text
  } finally {
    await worker.terminate()
  }
}
