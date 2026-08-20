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

/**
 * Erkennt Text aus mehreren Bildern nacheinander (z. B. den einzeln
 * gerenderten Seiten einer Foto-/Scan-PDF ohne eingebetteten Textlayer) mit
 * EINEM wiederverwendeten OCR-Worker, statt für jedes Bild das
 * Erkennungsmodell erneut zu laden – bei mehrseitigen Dokumenten spürbar
 * schneller als recognizeText() pro Seite einzeln aufzurufen.
 * `onProgress` liefert den Gesamtfortschritt über alle Bilder hinweg (0–100).
 */
export async function recognizeTextBatch(files: File[], onProgress?: (pct: number) => void): Promise<string[]> {
  if (files.length === 0) return []
  let currentIndex = 0
  const worker = await createWorker('deu', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(((currentIndex + m.progress) / files.length) * 100))
      }
    },
  })
  try {
    const results: string[] = []
    for (let i = 0; i < files.length; i++) {
      currentIndex = i
      const prepared = await preprocessForOcr(files[i]).catch(() => files[i])
      const {
        data: { text },
      } = await worker.recognize(prepared)
      results.push(text)
    }
    return results
  } finally {
    await worker.terminate()
  }
}
