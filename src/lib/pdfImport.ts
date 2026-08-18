import * as pdfjsLib from 'pdfjs-dist'
// Lässt Vite den Worker als eigenständige Datei bauen und liefert dessen URL,
// damit pdf.js ihn lokal im Browser laden kann (kein Server-Roundtrip nötig).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** Liest den reinen Text aus einer PDF-Datei aus – läuft komplett lokal im
 * Browser. Funktioniert für "normale" PDFs (Text eingebettet, z. B. von einer
 * Webseite gedruckt/exportiert). Bei reinen Bild-/Scan-PDFs ohne eingebetteten
 * Text kommt wenig bis nichts zurück – das wird vom Aufrufer abgefangen. */
export async function extractTextFromPdf(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    // PDFs speichern keine echten Zeilenumbrüche – wir rekonstruieren sie
    // anhand der Y-Position jedes Textfragments (neue Zeile bei Sprung nach unten),
    // sonst würde parseFreeText() später alles als eine einzige Zeile sehen.
    let lastY: number | null = null
    let line = ''
    const lines: string[] = []
    for (const item of content.items) {
      if (!('str' in item)) continue
      const y = item.transform[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      line += (line && !line.endsWith(' ') ? ' ' : '') + item.str
      lastY = y
    }
    if (line.trim()) lines.push(line.trim())
    pageTexts.push(lines.join('\n'))
    onProgress?.(Math.round((pageNum / pdf.numPages) * 100))
  }
  return pageTexts.join('\n\n')
}
