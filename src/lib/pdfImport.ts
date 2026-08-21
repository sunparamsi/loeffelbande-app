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

// Skalierung für die Texterkennung: bewusst über der Bildschirmauflösung
// (2,5x), das verbessert die OCR-Trefferquote spürbar, ohne die Erkennung
// unnötig zu verlangsamen.
const OCR_RENDER_SCALE = 2.5
// Eigene, höhere Skalierung nur fürs Titelbild (siehe extractCoverPhoto) –
// die Seite wird dafür ein zweites Mal gerendert, damit das übernommene Foto
// in bestmöglicher Auflösung vorliegt, ohne die (auf allen Seiten laufende)
// Texterkennung durch generell größere Bilder zu verlangsamen.
const COVER_PHOTO_RENDER_SCALE = 4.5

/** Rendert eine PDF-Seite auf ein Canvas. */
async function renderPageCanvas(page: pdfjsLib.PDFPageProxy, scale: number = OCR_RENDER_SCALE): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale })
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
 * Erzeuger-Eigenheiten): Echte Fotos haben deutlich mehr Farbigkeit als Text
 * auf flächigem Hintergrund. Gemessen wird das über die "Chroma" jedes
 * Pixels (der Abstand zwischen dem hellsten und dunkelsten Farbkanal, absolut
 * auf einer 0–1-Skala – NICHT relativ zur Helligkeit). Das ist bewusst keine
 * echte HSV-Sättigung (die relativ zur Helligkeit rechnet): bei relativer
 * Sättigung wirken fast schwarze Pixel (z. B. ein dunkler App-Hintergrund
 * unterhalb des Fotos) durch das Teilen durch einen sehr kleinen Hellwert
 * numerisch instabil und erscheinen fälschlich "hochgesättigt", obwohl sie
 * für das Auge klar neutral/farblos sind. Mit absoluter Chroma bleiben sowohl
 * sehr helle (weiße Tischdecke) als auch sehr dunkle (schwarzer Hintergrund)
 * neutrale Flächen korrekt niedrig.
 *
 * Wir messen pro Bildzeile die durchschnittliche Chroma von oben nach unten.
 * Damit ein von Natur aus eher blasses/neutrales Element innerhalb des Fotos
 * selbst (z. B. eine helle Tischdecke oder ein weißer Teller am oberen Rand
 * des Fotos) nicht fälschlich schon als Fotoende gilt, wird zuerst gesucht,
 * wo das Foto überhaupt anfängt (erster nachhaltig farbiger Bereich) – erst
 * ab dort wird nach dem Übergang zu durchgehend "flach" (Text/UI) gesucht,
 * das ist dann die Unterkante des Titelbilds. Nur wenn dieser Übergang in
 * einem plausiblen Bereich liegt (nicht direkt am Anfang, nicht fast die
 * ganze Seite), wird ein Titelbild angenommen. Danach wird zusätzlich
 * innerhalb dieser Zeilen links/rechts nach demselben Prinzip geschnitten –
 * manche Quellen zentrieren das Foto in einem breiteren, einfarbigen (z. B.
 * schwarzen) Rahmen; ohne diesen zweiten Schnitt würde dieser Rahmen als
 * hässlicher Rand mit ins Titelbild übernommen.
 */
function detectPhotoBounds(canvas: HTMLCanvasElement): { x0: number; y0: number; x1: number; y1: number } | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { width, height } = canvas
  if (width === 0 || height === 0) return null

  const CHROMA_THRESHOLD = 0.09
  const SUSTAIN_ROWS = 24
  const SUSTAIN_COLS = 16
  const SAMPLE_STEP = 4

  let imageData: ImageData
  try {
    imageData = ctx.getImageData(0, 0, width, height)
  } catch {
    return null
  }
  const { data } = imageData

  const chromaAt = (x: number, y: number): number => {
    const i = (y * width + x) * 4
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    return (Math.max(r, g, b) - Math.min(r, g, b)) / 255
  }

  const rowChroma = new Float32Array(height)
  for (let y = 0; y < height; y++) {
    let sum = 0
    let n = 0
    for (let x = 0; x < width; x += SAMPLE_STEP) {
      sum += chromaAt(x, y)
      n++
    }
    rowChroma[y] = n > 0 ? sum / n : 0
  }

  // Erst den Fotoanfang suchen (erster nachhaltig farbiger Bereich) - siehe
  // Kommentar oben. Gibt es nirgends auf der Seite so einen Bereich, ist da
  // schlicht kein Foto zu finden.
  let y0 = -1
  let highStreak = 0
  for (let y = 0; y < height; y++) {
    if (rowChroma[y] >= CHROMA_THRESHOLD) {
      highStreak++
      if (highStreak === SUSTAIN_ROWS) {
        y0 = y - SUSTAIN_ROWS + 1
        break
      }
    } else {
      highStreak = 0
    }
  }
  if (y0 < 0) return null

  // Ab dem Fotoanfang nach dem Übergang zurück zu durchgehend "flach" suchen
  // - das ist die Unterkante des Titelbilds.
  let lowStreak = 0
  let transitionY = -1
  for (let y = y0; y < height; y++) {
    if (rowChroma[y] < CHROMA_THRESHOLD) {
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

  // Liegt der gefundene Fotoanfang ohnehin ganz oben (kein nennenswerter
  // blasser Rand davor), lohnt sich der Zuschnitt nicht - dann lieber ab 0.
  if (y0 < height * 0.03) y0 = 0

  // Links/rechts innerhalb der erkannten Fotozeilen (y0..transitionY) nach
  // demselben Prinzip einengen, um einfarbige Ränder (z. B. schwarze Balken
  // links/rechts) herauszuschneiden.
  const colChroma = new Float32Array(width)
  for (let x = 0; x < width; x++) {
    let sum = 0
    let n = 0
    for (let y = y0; y < transitionY; y += SAMPLE_STEP) {
      sum += chromaAt(x, y)
      n++
    }
    colChroma[x] = n > 0 ? sum / n : 0
  }

  let x0 = 0
  let streak = 0
  for (let x = 0; x < width; x++) {
    if (colChroma[x] >= CHROMA_THRESHOLD) {
      streak++
      if (streak === SUSTAIN_COLS) {
        x0 = x - SUSTAIN_COLS + 1
        break
      }
    } else {
      streak = 0
    }
  }

  let x1 = width
  streak = 0
  for (let x = width - 1; x >= 0; x--) {
    if (colChroma[x] >= CHROMA_THRESHOLD) {
      streak++
      if (streak === SUSTAIN_COLS) {
        x1 = x + SUSTAIN_COLS
        break
      }
    } else {
      streak = 0
    }
  }

  // Nur übernehmen, wenn dabei ein plausibel großer Bereich übrig bleibt –
  // sonst (z. B. Fehlmessung) lieber die volle Breite behalten, statt das
  // Foto kaputt zu schneiden.
  if (x1 - x0 < width * 0.3) {
    x0 = 0
    x1 = width
  }

  return { x0, y0, x1, y1: transitionY }
}

function cropCanvas(source: HTMLCanvasElement, x0: number, y0: number, x1: number, y1: number): HTMLCanvasElement {
  const w = Math.max(1, x1 - x0)
  const h = Math.max(1, y1 - y0)
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')
  if (ctx) ctx.drawImage(source, x0, y0, w, h, 0, 0, w, h)
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
 * (siehe detectPhotoBounds), daher unabhängig davon, ob die PDF eingebetteten
 * Text hat oder per OCR gelesen werden muss. Fehler hier sind bewusst nicht
 * fatal: ein nicht gefundenes Titelbild darf den eigentlichen Text-Import
 * nie verhindern. Gibt zusätzlich das (ggf. bereits gerenderte) Canvas der
 * ersten Seite (in OCR-Auflösung) zurück, damit es beim OCR-Fallback
 * wiederverwendet werden kann, statt die Seite dafür ein zweites Mal zu
 * rendern. Das Titelbild selbst wird für die Übernahme ins Rezept separat in
 * höherer Auflösung gerendert (siehe COVER_PHOTO_RENDER_SCALE), damit es
 * nicht unnötig unscharf aus der (fürs OCR-Tempo kleiner gehaltenen)
 * Standardauflösung stammt. */
async function extractCoverPhoto(pdf: pdfjsLib.PDFDocumentProxy): Promise<{ canvas: HTMLCanvasElement | null; band: { y0: number; y1: number } | null; dataUrl?: string }> {
  try {
    const page1 = await pdf.getPage(1)
    const canvas = await renderPageCanvas(page1)
    const bounds = detectPhotoBounds(canvas)
    if (!bounds) return { canvas, band: null }

    // Für ein schärferes Titelbild die Seite separat in höherer Auflösung
    // rendern und die erkannten Grenzen proportional umrechnen, statt aus
    // dem (kleineren) OCR-Canvas hochzuskalieren.
    const scaleFactor = COVER_PHOTO_RENDER_SCALE / OCR_RENDER_SCALE
    const hiResCanvas = await renderPageCanvas(page1, COVER_PHOTO_RENDER_SCALE)
    const cropped = cropCanvas(
      hiResCanvas,
      Math.round(bounds.x0 * scaleFactor),
      Math.round(bounds.y0 * scaleFactor),
      Math.round(bounds.x1 * scaleFactor),
      Math.round(bounds.y1 * scaleFactor),
    )
    const file = await canvasToImageFile(cropped, 'titelbild.png')
    // Höheres Limit + Qualität als der allgemeine Bild-Upload (dort geht es
    // um Fotos aus der Handykamera, hier um ein bereits kleines PDF-Element) –
    // "höchstmögliche Auflösung" im Rahmen dessen, was die PDF hergibt.
    const dataUrl = await fileToCompressedDataUrl(file, 2600, 0.92)
    // Fürs Ausblenden vor der Texterkennung bewusst immer ab 0 blanken (nicht
    // erst ab bounds.y0) – ein schmaler Rand über dem eigentlichen Foto soll
    // zwar nicht mit ins Titelbild, aber trotzdem nicht versehentlich als
    // Text erkannt werden.
    return { canvas, band: { y0: 0, y1: bounds.y1 }, dataUrl }
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
