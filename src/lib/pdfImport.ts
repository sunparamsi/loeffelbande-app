import * as pdfjsLib from 'pdfjs-dist'
// Lässt Vite den Worker als eigenständige Datei bauen und liefert dessen URL,
// damit pdf.js ihn lokal im Browser laden kann (kein Server-Roundtrip nötig).
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { recognizeTextBatch } from './ocr'
import { fileToCompressedDataUrl } from './image'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

// Ab dieser Menge eingebetteten Textes gehen wir davon aus, dass die PDF
// einen echten Textlayer hat (einzelne Seitenzahlen o. Ä. reichen nicht).
// Darunter greift automatisch der OCR-Fallback für Foto-/Scan-PDFs.
const MIN_EMBEDDED_TEXT_LENGTH = 40

export interface PdfImportResult {
  text: string
  /** Größtes erkanntes Titelbild oben auf der ersten Seite (z. B. das Foto
   * des fertigen Gerichts bei als PDF gespeicherten Rezept-Webseiten) – als
   * fertige Data-URL, falls eines gefunden wurde. */
  coverImageDataUrl?: string
}

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

/** Rendert eine PDF-Seite auf ein Canvas. Skalierung bewusst über der
 * Bildschirmauflösung (2,5x), das verbessert die OCR-Trefferquote spürbar. */
async function renderPageCanvas(page: pdfjsLib.PDFPageProxy): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale: 2.5 })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas wird von diesem Browser nicht unterstützt.')
  await page.render({ canvasContext: ctx, viewport }).promise
  return canvas
}

function canvasToImageFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/png' })) : reject(new Error('PDF-Seite konnte nicht als Bild gerendert werden.'))), 'image/png'),
  )
}

/**
 * Manche Rezept-Webseiten werden als PDF ohne echten Textlayer "gedruckt"
 * (z. B. über die Browser-Druckfunktion einer dunklen Web-Ansicht) – Titel,
 * Zutaten und Zubereitung liegen dann komplett als Bilder vor, obendrauf oft
 * mit einem großen Foto des fertigen Gerichts. Dieses Foto per OCR "lesen"
 * zu wollen, erzeugt keinen sinnvollen Text, sondern zufälliges Zeichen-
 * Kauderwelsch aus Bildrauschen/Strukturen – das landete bisher als
 * Fantasie-Titel und Fantasie-erster-Schritt im importierten Rezept.
 *
 * Heuristik, komplett ohne PDF-Strukturanalyse (robust gegenüber beliebigen
 * Erzeuger-Eigenheiten): Echte Fotos haben deutlich mehr Farbsättigung als
 * Text auf flächigem Hintergrund. Wir messen pro Bildzeile die durchschnitt-
 * liche Sättigung von oben nach unten und suchen den Übergang von "farbig"
 * (Foto) zu durchgehend "flach" (Text/UI) – das ist die Unterkante des
 * Titelbilds. Nur wenn dieser Übergang in einem plausiblen Bereich liegt
 * (nicht direkt am Anfang, nicht fast die ganze Seite), wird ein Titelbild
 * angenommen.
 */
function detectTopPhotoBand(canvas: HTMLCanvasElement): { y0: number; y1: number } | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  if (width === 0 || height === 0) return null

  const SAT_THRESHOLD = 0.09
  const SUSTAIN_ROWS = 24
  const SAMPLE_STEP_X = 4

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, width, height)
  } catch {
    return null
  }
  const { data } = imageData

  const rowSat = new Float32Array(height)
  for (let y = 0; y < height; y++) {
    let sum = 0
    let n = 0
    const rowStart = y * width * 4
    for (let x = 0; x < width; x += SAMPLE_STEP_X) {
      const i = rowStart + x * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      const max = Math.max(r, g, b)
      const min = Math.min(r, g, b)
      sum += max > 0 ? (max - min) / max : 0
      n++
    }
    rowSat[y] = n > 0 ? sum / n : 0
  }

  let lowStreak = 0
  let transitionY = -1
  for (let y = 0; y < height; y++) {
    if (rowSat[y] < SAT_THRESHOLD) {
      lowStreak++
      if (lowStreak === SUSTAIN_ROWS) {
        transitionY = y - SUSTAIN_ROWS + 1
        break
      }
    } else {
      lowStreak = 0
    }
  }

  if (transitionY <= 0) return null
  const heightFrac = transitionY / height
  // Zu klein: vermutlich kein echtes Foto, nur ein paar farbige Pixel oben.
  // Zu groß: vermutlich die ganze Seite ist ein einziges Foto (z. B. eine
  // abfotografierte Kochbuchseite) – dort NICHT maskieren, sonst bleibt
  // nichts zum Erkennen übrig.
  if (heightFrac < 0.05 || heightFrac > 0.85) return null

  return { y0: 0, y1: transitionY }
}

function cropCanvas(source: HTMLCanvasElement, y0: number, y1: number): HTMLCanvasElement {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = Math.max(1, y1 - y0)
  const ctx = out.getContext('2d')
  if (ctx) ctx.drawImage(source, 0, y0, source.width, y1 - y0, 0, 0, source.width, y1 - y0)
  return out
}

/** Blendet einen Bildbereich weiß aus – verhindert, dass die Texterkennung
 * im fotografischen Bereich (Titelbild) sinnlose Zeichen "erkennt". */
function blankRegion(canvas: HTMLCanvasElement, y0: number, y1: number) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, y0, canvas.width, y1 - y0)
}

/** Versucht, aus der ersten Seite ein Titelbild zu gewinnen – rein bildbasiert
 * (siehe detectTopPhotoBand), daher unabhängig davon, ob die PDF eingebetteten
 * Text hat oder per OCR gelesen werden muss. Fehler hier sind bewusst nicht
 * fatal: ein nicht gefundenes Titelbild darf den eigentlichen Text-Import
 * nie verhindern. Gibt zusätzlich das (ggf. bereits gerenderte) Canvas der
 * ersten Seite zurück, damit es beim OCR-Fallback wiederverwendet werden
 * kann, statt die Seite ein zweites Mal zu rendern. */
async function extractCoverPhoto(pdf: pdfjsLib.PDFDocumentProxy): Promise<{ canvas: HTMLCanvasElement | null; band: { y0: number; y1: number } | null; dataUrl?: string }> {
  try {
    const page1 = await pdf.getPage(1)
    const canvas = await renderPageCanvas(page1)
    const band = detectTopPhotoBand(canvas)
    if (!band) return { canvas, band: null }
    const cropped = cropCanvas(canvas, band.y0, band.y1)
    const file = await canvasToImageFile(cropped, 'titelbild.png')
    const dataUrl = await fileToCompressedDataUrl(file, 1280, 0.75)
    return { canvas, band, dataUrl }
  } catch {
    return { canvas: null, band: null }
  }
}

/**
 * Liest den Text (und ggf. ein Titelbild) aus einer PDF-Datei aus – läuft
 * komplett lokal im Browser. Zwei Wege für den Text, automatisch gewählt:
 * 1. "Normale" PDFs mit eingebettetem Text (z. B. von einer Webseite
 *    gedruckt/exportiert) – schnelle direkte Textextraktion.
 * 2. Foto-/Scan-PDFs ohne eingebetteten Text (z. B. mit dem Handy
 *    abfotografierte oder eingescannte Kochbuchseiten, oder Webseiten, die
 *    als Bilder statt echtem Text "gedruckt" wurden) – liefert Weg 1 kaum
 *    Text, wird automatisch auf OCR umgeschaltet: jede Seite wird als Bild
 *    gerendert und wie beim Import über "Foto scannen" erkannt (dauert
 *    entsprechend länger, da pro Seite ein ganzes Bild erkannt wird). Ein
 *    erkanntes Titelbild wird dabei vor der Texterkennung ausgeblendet,
 *    damit daraus kein sinnloser Text entsteht (siehe detectTopPhotoBand).
 */
export async function extractTextFromPdf(file: File, onProgress?: (pct: number) => void): Promise<PdfImportResult> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const { canvas: page1Canvas, band: coverBand, dataUrl: coverImageDataUrl } = await extractCoverPhoto(pdf)

  const embeddedText = await extractEmbeddedText(pdf, (pct) => onProgress?.(Math.round(pct * 0.3)))
  if (embeddedText.trim().length >= MIN_EMBEDDED_TEXT_LENGTH) {
    onProgress?.(100)
    return { text: embeddedText, coverImageDataUrl }
  }

  // Fallback: vermutlich Foto-/Scan-PDF ohne nutzbaren Textlayer -> Seiten
  // als Bilder rendern und per OCR erkennen. Seite 1 wurde für das Titelbild
  // oben schon gerendert – hier wiederverwenden statt doppelt zu rendern,
  // und das erkannte Titelbild vor der Texterkennung ausblenden.
  const pageImages: File[] = []
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    let canvas: HTMLCanvasElement
    if (pageNum === 1 && page1Canvas) {
      canvas = page1Canvas
      if (coverBand) blankRegion(canvas, coverBand.y0, coverBand.y1)
    } else {
      canvas = await renderPageCanvas(await pdf.getPage(pageNum))
    }
    pageImages.push(await canvasToImageFile(canvas, `pdf-seite-${pageNum}.png`))
    onProgress?.(30 + Math.round((pageNum / pdf.numPages) * 10))
  }
  const ocrTexts = await recognizeTextBatch(pageImages, (pct) => onProgress?.(40 + Math.round(pct * 0.6)))
  return { text: ocrTexts.join('\n\n'), coverImageDataUrl }
}
