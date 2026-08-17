import { createWorker } from 'tesseract.js'

/** Texterkennung läuft vollständig lokal im Browser (WASM), es wird kein Foto hochgeladen. */
export async function recognizeText(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const worker = await createWorker('deu', undefined, {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(Math.round(m.progress * 100))
    },
  })
  try {
    const {
      data: { text },
    } = await worker.recognize(file)
    return text
  } finally {
    await worker.terminate()
  }
}
