import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import { ArrowLeftIcon, EditIcon, SearchIcon, CameraIcon, FileIcon, PdfIcon, InstagramIcon } from '../icons'
import { PrimaryButton, TextInput, TextArea } from '../components/ui'
import { importFromUrl } from '../lib/urlImport'
import { mergeOcrTexts } from '../lib/mergeOcrText'
import { parseFreeText } from '../lib/textParse'
import { parseJsonFile, parseCsvFile } from '../lib/fileImport'
import { getFileImportPref } from '../lib/prefs'
import { useAuth } from '../lib/useAuth'
import type { Recipe } from '../db/types'

type Panel = null | 'url' | 'file' | 'social' | 'review'
type ReviewSource = 'photo' | 'pdf'

export default function NewRecipeChooserPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const [panel, setPanel] = useState<Panel>(null)
  const [urlValue, setUrlValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [socialUrl, setSocialUrl] = useState('')
  const [socialText, setSocialText] = useState('')
  const [socialTitle, setSocialTitle] = useState('')
  const [socialTitleTouched, setSocialTitleTouched] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewTitle, setReviewTitle] = useState('')
  const [reviewSource, setReviewSource] = useState<ReviewSource>('photo')
  const [fileImportEnabled] = useState(getFileImportPref())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const goToForm = (prefill: Partial<Recipe>) => navigate('/rezepte/neu/formular', { state: { prefill } })

  const doUrlImport = async () => {
    if (!urlValue.trim()) return
    setBusy(true)
    setError(null)
    try {
      const result = await importFromUrl(urlValue.trim())
      if (result) {
        goToForm(result)
      } else {
        setError('Automatischer Import hat nicht geklappt (Seite blockiert das oder liefert keine strukturierten Rezeptdaten). Du landest gleich im leeren Formular, die Quelle ist schon eingetragen.')
        setTimeout(() => goToForm({ sourceUrl: urlValue.trim() }), 2200)
      }
    } finally {
      setBusy(false)
    }
  }

  const doPhotoImport = async (files: File[]) => {
    if (files.length === 0) return
    setBusy(true)
    setProgress(0)
    setError(null)
    try {
      // Dynamisch geladen (statt statisch oben importiert): tesseract.js
      // bringt mehrere MB an JS+WASM mit, die sonst jede:r Nutzer:in beim
      // ersten Laden der App mitladen müsste, auch wenn "Foto scannen" nie
      // genutzt wird – genau wie pdfImport.ts weiter unten wird das Modul
      // erst geladen, wenn diese Funktion tatsächlich aufgerufen wird.
      const { recognizeText } = await import('../lib/ocr')
      const texts: string[] = []
      for (let i = 0; i < files.length; i++) {
        const text = await recognizeText(files[i], (pct) => setProgress(Math.round(((i + pct / 100) / files.length) * 100)))
        texts.push(text)
      }
      // Bei mehreren Fotos (z. B. mehrere Screenshots desselben Rezepts)
      // werden exakt doppelte Zeilen zusammengeführt/entfernt (etwa wenn sich
      // zwei Fotos überlappen oder ein Titel auf jedem Screenshot steht).
      const merged = mergeOcrTexts(texts)
      if (!merged.trim()) {
        setError(
          files.length > 1
            ? 'Es konnte kein Text in den Fotos erkannt werden. Achte auf gute Beleuchtung, scharfen Fokus und dass der Text möglichst gerade/frontal im Bild steht – oder trag das Rezept manuell ein.'
            : 'Es konnte kein Text im Foto erkannt werden. Achte auf gute Beleuchtung, scharfen Fokus und dass der Text möglichst gerade/frontal im Bild steht – oder trag das Rezept manuell ein.',
        )
        return
      }
      setReviewSource('photo')
      setReviewText(merged.trim())
      setReviewTitle(parseFreeText(merged.trim()).title)
      setPanel('review')
    } catch {
      setError('Texterkennung ist fehlgeschlagen. Bitte manuell eintragen.')
    } finally {
      setBusy(false)
    }
  }

  const doPdfImport = async (file: File) => {
    setBusy(true)
    setProgress(0)
    setError(null)
    try {
      const { extractTextFromPdf } = await import('../lib/pdfImport')
      const text = await extractTextFromPdf(file, setProgress)
      if (!text.trim()) {
        setError('In dieser PDF konnte kein Text gefunden werden – auch die automatische Texterkennung für gescannte Seiten hat nichts erkannt. Bitte prüfe, ob die Seiten lesbar sind, oder trag das Rezept manuell ein.')
        return
      }
      setReviewSource('pdf')
      setReviewText(text.trim())
      setReviewTitle(parseFreeText(text.trim()).title)
      setPanel('review')
    } catch {
      setError('PDF konnte nicht gelesen werden. Bitte eine normale, nicht passwortgeschützte PDF-Datei verwenden.')
    } finally {
      setBusy(false)
    }
  }

  const doFileImport = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const recipes = file.name.endsWith('.csv') ? await parseCsvFile(file) : await parseJsonFile(file)
      if (recipes.length === 0) {
        setError('Keine Rezepte in der Datei gefunden.')
        return
      }
      if (recipes.length === 1) {
        goToForm(recipes[0])
      } else {
        // Umgeht RecipeFormPage (die den Ersteller sonst beim Speichern
        // setzt), da hier mehrere Rezepte auf einmal ohne Formular-Umweg
        // direkt gespeichert werden -> Ersteller hier selbst stempeln.
        for (const r of recipes) {
          const toSave: Recipe = {
            ...(r as Recipe),
            createdByUserId: authState?.currentUserId ?? undefined,
            createdByName: authState?.currentMemberName ?? undefined,
          }
          await repo.saveRecipe(toSave)
        }
        navigate('/rezepte')
      }
    } catch {
      setError('Datei konnte nicht gelesen werden. Bitte gültiges JSON oder CSV verwenden.')
    } finally {
      setBusy(false)
    }
  }

  const onSocialTextChange = (value: string) => {
    setSocialText(value)
    // Solange der Titel nicht selbst bearbeitet wurde, live einen Vorschlag
    // aus dem eingefügten Text ableiten (ändert sich der Text, ändert sich
    // auch der Vorschlag) – sobald der Nutzer den Titel selbst anfasst, wird
    // dieser nicht mehr überschrieben.
    if (!socialTitleTouched) setSocialTitle(parseFreeText(value).title)
  }

  const doSocialImport = () => {
    const { ingredients, steps } = parseFreeText(socialText)
    const title = socialTitle.trim()
    goToForm({
      ...(title ? { title } : {}),
      ingredients,
      steps,
      links: socialUrl ? [{ id: crypto.randomUUID(), label: 'Instagram', url: socialUrl }] : [],
      sourceUrl: socialUrl || undefined,
    })
  }

  const doReviewImport = () => {
    const { ingredients, steps } = parseFreeText(reviewText)
    const title = reviewTitle.trim()
    goToForm({ ...(title ? { title } : {}), ingredients, steps, description: '' })
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between px-[18px] py-[18px]">
        <button onClick={() => navigate(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm">
          <ArrowLeftIcon width={16} height={16} />
        </button>
        <h1 className="text-lg font-extrabold text-cream">Neues Rezept</h1>
        <div className="w-[34px]" />
      </div>
      <div className="px-[18px] pb-3 text-[12.5px] text-cream-soft">Wie möchtest du das Rezept hinzufügen?</div>

      <ImportCard icon={<EditIcon width={20} height={20} />} title="Manuell eingeben" onClick={() => navigate('/rezepte/neu/formular')} highlight />

      <ImportCard icon={<SearchIcon width={20} height={20} />} title="Von Webseite importieren" onClick={() => setPanel(panel === 'url' ? null : 'url')}>
        Rezeptlink einfügen
      </ImportCard>
      {panel === 'url' && (
        <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://…" />
          <PrimaryButton className="mt-3 w-full" onClick={doUrlImport} disabled={busy}>
            {busy ? 'Importiere…' : 'Importieren'}
          </PrimaryButton>
        </div>
      )}

      <ImportCard icon={<CameraIcon width={20} height={20} />} title="Foto scannen" onClick={() => photoInputRef.current?.click()} />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0 && doPhotoImport(Array.from(e.target.files))}
      />

      <ImportCard icon={<PdfIcon width={20} height={20} />} title="Aus PDF importieren" onClick={() => pdfInputRef.current?.click()} />
      <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && doPdfImport(e.target.files[0])} />
      {busy && progress > 0 && <div className="mx-[18px] mb-3 text-[11px] text-cream-soft">Lese…{progress}%</div>}

      {fileImportEnabled && (
        <>
          <ImportCard icon={<FileIcon width={20} height={20} />} title="Aus Datei importieren" onClick={() => fileInputRef.current?.click()}>
            JSON- oder CSV-Datei mit einem oder mehreren Rezepten einlesen
          </ImportCard>
          <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && doFileImport(e.target.files[0])} />
        </>
      )}

      <ImportCard icon={<InstagramIcon width={20} height={20} />} title="Aus Social Media" onClick={() => setPanel(panel === 'social' ? null : 'social')}>
        Link + Bildunterschrift einfügen
      </ImportCard>
      {panel === 'social' && (
        <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="Link zum Beitrag (optional)" className="mb-2.5" />
          <TextArea rows={5} value={socialText} onChange={(e) => onSocialTextChange(e.target.value)} placeholder="Bildunterschrift/Text hier einfügen…" />
          <div className="mt-2.5">
            <div className="mb-1 text-[11px] font-bold text-cream">Titel{!socialTitle.trim() && ' (nicht erkannt – bitte eintragen)'}</div>
            <TextInput
              value={socialTitle}
              onChange={(e) => {
                setSocialTitleTouched(true)
                setSocialTitle(e.target.value)
              }}
              placeholder="Titel des Rezepts…"
            />
          </div>
          <PrimaryButton className="mt-3 w-full" onClick={doSocialImport}>
            Übernehmen
          </PrimaryButton>
        </div>
      )}

      {panel === 'review' && (
        <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <div className="mb-2.5 text-[12px] font-bold text-cream">
            {reviewSource === 'photo' ? 'Erkannter Text aus dem Foto' : 'Text aus der PDF'} – bitte kurz prüfen
          </div>
          <div className="mb-2.5 text-[11.5px] leading-relaxed text-cream-soft">
            Erkennung ist nicht immer perfekt. Korrigiere hier offensichtliche Fehler (z. B. verdrehte Zahlen/Einheiten), bevor daraus Zutaten &amp; Schritte gebaut werden – im nächsten Formular kannst du danach ohnehin noch alles anpassen.
          </div>
          <div className="mb-2.5">
            <div className="mb-1 text-[11px] font-bold text-cream">Titel{!reviewTitle.trim() && ' (nicht erkannt – bitte eintragen)'}</div>
            <TextInput value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Titel des Rezepts…" />
          </div>
          <TextArea rows={10} value={reviewText} onChange={(e) => setReviewText(e.target.value)} />
          <PrimaryButton className="mt-3 w-full" onClick={doReviewImport}>
            Übernehmen
          </PrimaryButton>
        </div>
      )}

      {error && <div className="mx-[18px] mt-2 rounded-2xl border border-rust/40 bg-rust/10 px-3.5 py-2.5 text-[12px] text-rust">{error}</div>}
    </div>
  )
}

function ImportCard({
  icon,
  title,
  children,
  onClick,
  highlight,
}: {
  icon: React.ReactNode
  title: string
  children?: React.ReactNode
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`mx-[18px] mb-3 flex w-[calc(100%-36px)] ${children ? 'items-start' : 'items-center'} gap-3.5 rounded-2xl border bg-surface p-4 text-left shadow-card-sm ${highlight ? 'border-rust' : 'border-line'}`}
    >
      <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-rust)_12%,white)] text-rust">{icon}</div>
      <div>
        <div className={children ? 'mb-0.5 text-sm font-bold text-cream' : 'text-sm font-bold text-cream'}>{title}</div>
        {children && <div className="text-[11.5px] leading-relaxed text-cream-soft">{children}</div>}
      </div>
    </button>
  )
}
