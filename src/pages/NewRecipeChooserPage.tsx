import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import { ArrowLeftIcon, EditIcon, SearchIcon, CameraIcon, FileIcon, InstagramIcon } from '../icons'
import { PrimaryButton, TextInput, TextArea } from '../components/ui'
import { importFromUrl } from '../lib/urlImport'
import { recognizeText } from '../lib/ocr'
import { parseFreeText } from '../lib/textParse'
import { parseJsonFile, parseCsvFile } from '../lib/fileImport'
import type { Recipe } from '../db/types'

type Panel = null | 'url' | 'photo' | 'file' | 'social'

export default function NewRecipeChooserPage() {
  const navigate = useNavigate()
  const [panel, setPanel] = useState<Panel>(null)
  const [urlValue, setUrlValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [socialUrl, setSocialUrl] = useState('')
  const [socialText, setSocialText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

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

  const doPhotoImport = async (file: File) => {
    setBusy(true)
    setProgress(0)
    setError(null)
    try {
      const text = await recognizeText(file, setProgress)
      const { ingredients, steps } = parseFreeText(text)
      goToForm({ ingredients, steps, description: '' })
    } catch {
      setError('Texterkennung ist fehlgeschlagen. Bitte manuell eintragen.')
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
        for (const r of recipes) await repo.saveRecipe(r as Recipe)
        navigate('/rezepte')
      }
    } catch {
      setError('Datei konnte nicht gelesen werden. Bitte gültiges JSON oder CSV verwenden.')
    } finally {
      setBusy(false)
    }
  }

  const doSocialImport = () => {
    const { ingredients, steps } = parseFreeText(socialText)
    goToForm({
      ingredients,
      steps,
      links: socialUrl ? [{ id: crypto.randomUUID(), label: 'Instagram', url: socialUrl }] : [],
      sourceUrl: socialUrl || undefined,
    })
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

      <ImportCard icon={<EditIcon width={20} height={20} />} title="Manuell eingeben" onClick={() => navigate('/rezepte/neu/formular')} highlight>
        Titel, Zutaten und Zubereitung selbst eintippen – volle Kontrolle über jedes Detail.
      </ImportCard>

      <ImportCard icon={<SearchIcon width={20} height={20} />} title="Von Webseite importieren" onClick={() => setPanel(panel === 'url' ? null : 'url')}>
        Rezept-Link einfügen – wird automatisch übernommen, wenn die Seite das unterstützt.
      </ImportCard>
      {panel === 'url' && (
        <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://…" />
          <PrimaryButton className="mt-3 w-full" onClick={doUrlImport} disabled={busy}>
            {busy ? 'Importiere…' : 'Importieren'}
          </PrimaryButton>
        </div>
      )}

      <ImportCard icon={<CameraIcon width={20} height={20} />} title="Foto scannen" onClick={() => photoInputRef.current?.click()}>
        Foto von Kochbuch/handschriftlichem Rezept – Text wird direkt auf deinem Gerät erkannt.
      </ImportCard>
      <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && doPhotoImport(e.target.files[0])} />
      {busy && progress > 0 && <div className="mx-[18px] mb-3 text-[11px] text-cream-soft">Texterkennung läuft… {progress}%</div>}

      <ImportCard icon={<FileIcon width={20} height={20} />} title="Aus Datei importieren" onClick={() => fileInputRef.current?.click()}>
        JSON- oder CSV-Datei mit einem oder mehreren Rezepten auf einmal einlesen.
      </ImportCard>
      <input ref={fileInputRef} type="file" accept=".json,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && doFileImport(e.target.files[0])} />

      <ImportCard icon={<InstagramIcon width={20} height={20} />} title="Aus Social Media" onClick={() => setPanel(panel === 'social' ? null : 'social')}>
        Link + Bildunterschrift einfügen – wir strukturieren automatisch vor. Volles Auslesen der Plattformen ist technisch nicht möglich.
      </ImportCard>
      {panel === 'social' && (
        <div className="mx-[18px] mb-3 rounded-2xl border border-line bg-surface p-4 shadow-card-sm">
          <TextInput value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} placeholder="Link zum Beitrag (optional)" className="mb-2.5" />
          <TextArea rows={5} value={socialText} onChange={(e) => setSocialText(e.target.value)} placeholder="Bildunterschrift/Text hier einfügen…" />
          <PrimaryButton className="mt-3 w-full" onClick={doSocialImport}>
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
  children: React.ReactNode
  onClick: () => void
  highlight?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`mx-[18px] mb-3 flex w-[calc(100%-36px)] items-start gap-3.5 rounded-2xl border bg-surface p-4 text-left shadow-card-sm ${highlight ? 'border-rust' : 'border-line'}`}
    >
      <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-rust)_12%,white)] text-rust">{icon}</div>
      <div>
        <div className="mb-0.5 text-sm font-bold text-cream">{title}</div>
        <div className="text-[11.5px] leading-relaxed text-cream-soft">{children}</div>
      </div>
    </button>
  )
}
