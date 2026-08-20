import * as pdfjsLib from 'pdfjs-dist'
// Lässt Vite den Worker als eigenständige Datei bauen und liefert dessen URL,
// damit pdf.js ihn lokal im Browser laden kann (kein Server-Roundtrip nötig).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { recognizeTextBatch } from './ocr'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Ab dieser Menge eingebetteten Textes gehen wir davon aus, dass die PDF
// einen echten Textlayer hat (einzelne Seitenzahlen o. Ä. reichen nicht).
// Darunter greift automatisch der OCR-Fallback für Foto-/Scan-PDFs.
const MIN_EMBEDDED_TEXT_LENGTH = 40

async function extractEmbeddedText(pdf: pdfjsLib.PDFDocumentProxy, onProgress?: (pct: number) => void): Promise<string> {
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

/** Rendert eine PDF-Seite als Bild (Canvas -> PNG), damit sie wie ein Foto
 * per OCR erkannt werden kann. Skalierung bewusst über der Bildschirm-
 * auflösung (2,5x), das verbessert die Trefferquote von Tesseract spürbar. */
async function renderPageToImageFile(page: pdfjsLib.PDFPageProxy, pageNum: number): Promise<File> {
  const viewport = page.getViewport({ scale: 2.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas wird von diesem Browser nicht unterstützt.')
  await page.render({ canvasContext: ctx, viewport }).promise
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PDF-Seite konnte nicht als Bild gerendert werden.'))), 'image/png'),
  )
  return new File([blob], `pdf-seite-${pageNum}.png`, { type: 'image/png' })
}

/**
 * Liest den Text aus einer PDF-Datei aus – läuft komplett lokal im Browser.
 * Zwei Wege, automatisch gewählt:
 * 1. "Normale" PDFs mit eingebettetem Text (z. B. von einer Webseite
 *    gedruckt/exportiert) – schnelle direkte Textextraktion.
 * 2. Foto-/Scan-PDFs ohne eingebetteten Text (z. B. mit dem Handy
 *    abfotografierte oder eingescannte Kochbuchseiten) – liefert Weg 1 kaum
 *    Text, wird automatisch auf OCR umgeschaltet: jede Seite wird als Bild
 *    gerendert und wie beim Import über "Foto scannen" erkannt (dauert
 *    entsprechend länger, da pro Seite ein ganzes Bild erkannt wird).
 */
export async function extractTextFromPdf(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const embeddedText = await extractEmbeddedText(pdf, (pct) => onProgress?.(Math.round(pct * 0.3)))
  if (embeddedText.trim().length >= MIN_EMBEDDED_TEXT_LENGTH) return embeddedText

  // Fallback: vermutlich Foto-/Scan-PDF ohne nutzbaren Textlayer -> Seiten
  // als Bilder rendern und per OCR erkennen.
  const pageImages: File[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    pageImages.push(await renderPageToImageFile(page, pageNum))
    onProgress?.(30 + Math.round((pageNum / pdf.numPages) * 10))
  }
  const ocrTexts = await recognizeTextBatch(pageImages, (pct) => onProgress?.(40 + Math.round(pct * 0.6)))
  return ocrTexts.join('\n\n')
}
