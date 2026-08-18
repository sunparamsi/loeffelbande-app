import { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe, Ingredient, RecipeLink, RecipeImage, Difficulty } from '../db/types'
import { ArrowLeftIcon, CameraIcon, PlusIcon, XIcon, TrashIcon } from '../icons'
import { Chip, TextInput, TextArea, FormLabel } from '../components/ui'
import { useCategories } from '../lib/useCategories'
import { fileToCompressedDataUrl } from '../lib/image'
import { translateTexts } from '../lib/translate'

function emptyRecipe(): Recipe {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    category: 'Hauptgericht',
    cuisine: '',
    tags: [],
    ingredients: [],
    steps: [],
    images: [],
    links: [],
    favorite: false,
    createdAt: now,
    updatedAt: now,
  }
}

const uid = () => crypto.randomUUID()

export default function RecipeFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { prefill?: Partial<Recipe> } }
  const { categories, refresh: refreshCategories } = useCategories()
  const [recipe, setRecipe] = useState<Recipe>(emptyRecipe())
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateNote, setTranslateNote] = useState<string | null>(null)

  useEffect(() => {
    if (mode === 'edit' && id) {
      repo.getRecipe(id).then((r) => {
        if (r) setRecipe(r)
      })
    } else if (mode === 'create' && location.state?.prefill) {
      setRecipe((r) => ({ ...r, ...location.state!.prefill }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  const update = <K extends keyof Recipe>(key: K, value: Recipe[K]) => setRecipe((r) => ({ ...r, [key]: value }))

  const save = async () => {
    if (!recipe.title.trim()) {
      alert('Bitte einen Titel angeben.')
      return
    }
    setSaving(true)
    try {
      const isNew = mode === 'create'
      const toSave = { ...recipe, updatedAt: Date.now() }
      await repo.saveRecipe(toSave)
      if (isNew && repo.mode === 'cloud') {
        repo.announceNewRecipe(toSave.id).catch(() => {})
      }
      navigate(`/rezepte/${toSave.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const onPickImages = async (files: FileList | null) => {
    if (!files) return
    const newImages: RecipeImage[] = []
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const dataUrl = await fileToCompressedDataUrl(file)
        newImages.push({ id: uid(), dataUrl })
      } catch {
        /* Datei überspringen */
      }
    }
    update('images', [...recipe.images, ...newImages])
  }

  const addIngredient = () => update('ingredients', [...recipe.ingredients, { id: uid(), name: '', quantity: null, unit: '' }])
  const updateIngredient = (iid: string, patch: Partial<Ingredient>) =>
    update('ingredients', recipe.ingredients.map((i) => (i.id === iid ? { ...i, ...patch } : i)))
  const removeIngredient = (iid: string) => update('ingredients', recipe.ingredients.filter((i) => i.id !== iid))

  const addStep = () => update('steps', [...recipe.steps, { id: uid(), text: '' }])
  const updateStep = (sid: string, text: string) => update('steps', recipe.steps.map((s) => (s.id === sid ? { ...s, text } : s)))
  const removeStep = (sid: string) => update('steps', recipe.steps.filter((s) => s.id !== sid))

  const addLink = () => update('links', [...recipe.links, { id: uid(), label: 'Video', url: '' }])
  const updateLink = (lid: string, patch: Partial<RecipeLink>) =>
    update('links', recipe.links.map((l) => (l.id === lid ? { ...l, ...patch } : l)))
  const removeLink = (lid: string) => update('links', recipe.links.filter((l) => l.id !== lid))

  const doTranslate = async () => {
    setTranslating(true)
    setTranslateNote(null)
    try {
      // Reihenfolge merken: Titel, Beschreibung, dann alle Zutatennamen, dann
      // alle Schritte – so lassen sich die Übersetzungen hinterher wieder an
      // der gleichen Position einsetzen.
      const texts: string[] = [recipe.title, recipe.description ?? '', ...recipe.ingredients.map((i) => i.name), ...recipe.steps.map((s) => s.text)]
      const nonEmptyIdx = texts.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0)
      const toSend = nonEmptyIdx.map((i) => texts[i])
      if (toSend.length === 0) return

      const { translations, detectedLang } = await translateTexts(toSend, 'DE')
      if (detectedLang && detectedLang.toUpperCase() === 'DE') {
        setTranslateNote('Rezept scheint schon auf Deutsch zu sein – nichts geändert.')
        return
      }

      const result = [...texts]
      nonEmptyIdx.forEach((origIdx, sendIdx) => {
        result[origIdx] = translations[sendIdx] ?? texts[origIdx]
      })
      const [newTitle, newDescription, ...rest] = result
      const newIngredients = recipe.ingredients.map((ing, i) => ({ ...ing, name: rest[i] }))
      const newSteps = recipe.steps.map((s, i) => ({ ...s, text: rest[recipe.ingredients.length + i] }))

      setRecipe((r) => ({ ...r, title: newTitle, description: newDescription, ingredients: newIngredients, steps: newSteps }))
      setTranslateNote('Ins Deutsche übersetzt – bitte kurz gegenprüfen.')
    } catch (e) {
      setTranslateNote(e instanceof Error ? e.message : 'Übersetzung fehlgeschlagen.')
    } finally {
      setTranslating(false)
    }
  }

  return (
    <div className="pb-10">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg px-[18px] py-[18px]">
        <button onClick={() => navigate(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm">
          <ArrowLeftIcon width={16} height={16} />
        </button>
        <h1 className="text-lg font-extrabold text-cream">{mode === 'create' ? 'Neues Rezept' : 'Rezept bearbeiten'}</h1>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-full bg-rust-solid px-4 py-2.5 text-xs font-bold text-white shadow-[0_8px_18px_rgba(242,129,74,0.35)] disabled:opacity-50"
        >
          Speichern
        </button>
      </div>

      <div className="px-[18px] pt-[18px]">
        <FormLabel>Titel</FormLabel>
        <TextInput value={recipe.title} onChange={(e) => update('title', e.target.value)} placeholder="z. B. Pasta al Limone" />
      </div>

      {mode === 'create' && (
        <div className="px-[18px] pt-2.5">
          <button
            onClick={doTranslate}
            disabled={translating}
            className="rounded-full border border-dashed border-rust px-3.5 py-1.5 text-[11px] font-bold text-rust disabled:opacity-50"
          >
            {translating ? 'Übersetze…' : 'Ins Deutsche übersetzen'}
          </button>
          {translateNote && <div className="mt-1.5 text-[11px] text-cream-soft">{translateNote}</div>}
        </div>
      )}

      <div className="mx-[18px] mt-4 flex flex-wrap gap-2">
        {recipe.images.map((img) => (
          <div key={img.id} className="relative h-[70px] w-[70px] overflow-hidden rounded-[10px]">
            <img src={img.dataUrl} className="h-full w-full object-cover" alt="" />
            <button
              onClick={() => update('images', recipe.images.filter((i) => i.id !== img.id))}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-cream"
            >
              <XIcon width={11} height={11} />
            </button>
          </div>
        ))}
        <label className="flex h-[70px] w-[70px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line text-cream-soft">
          <CameraIcon width={18} height={18} />
          <span className="text-[9px]">Foto</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onPickImages(e.target.files)} />
        </label>
      </div>

      <div className="px-[18px] pt-4">
        <FormLabel>Kurzbeschreibung</FormLabel>
        <TextArea rows={2} value={recipe.description} onChange={(e) => update('description', e.target.value)} placeholder="Ein bis zwei Sätze, worum es geht…" />
      </div>

      <div className="px-[18px] pt-4">
        <FormLabel>Kategorie</FormLabel>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip key={c} selected={recipe.category === c} onClick={() => update('category', c)}>
              {c}
            </Chip>
          ))}
          {addingCategory ? (
            <input
              autoFocus
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newCategory.trim()) {
                  await repo.addCategory(newCategory.trim())
                  update('category', newCategory.trim())
                  setNewCategory('')
                  setAddingCategory(false)
                  refreshCategories()
                }
              }}
              onBlur={() => setAddingCategory(false)}
              placeholder="Name…"
              className="w-28 rounded-full border border-dashed border-rust bg-transparent px-3 py-1.5 text-xs text-cream focus:outline-none"
            />
          ) : (
            <Chip dashed onClick={() => setAddingCategory(true)}>
              + Neu
            </Chip>
          )}
        </div>
      </div>

      <div className="px-[18px] pt-4">
        <FormLabel>Tags</FormLabel>
        <div className="flex flex-wrap gap-2">
          {recipe.tags.map((t) => (
            <Chip key={t} selected onClick={() => update('tags', recipe.tags.filter((x) => x !== t))}>
              {t} ×
            </Chip>
          ))}
          {addingTag ? (
            <input
              autoFocus
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTag.trim()) {
                  update('tags', [...recipe.tags, newTag.trim()])
                  setNewTag('')
                  setAddingTag(false)
                }
              }}
              onBlur={() => setAddingTag(false)}
              placeholder="Tag…"
              className="w-24 rounded-full border border-dashed border-rust bg-transparent px-3 py-1.5 text-xs text-cream focus:outline-none"
            />
          ) : (
            <Chip dashed onClick={() => setAddingTag(true)}>
              + Tag
            </Chip>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-[18px] pt-4">
        <div>
          <FormLabel>Vorbereitung (Min)</FormLabel>
          <TextInput
            type="number"
            value={recipe.prepTimeMinutes ?? ''}
            onChange={(e) => update('prepTimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="10"
          />
        </div>
        <div>
          <FormLabel>Kochzeit (Min)</FormLabel>
          <TextInput
            type="number"
            value={recipe.cookTimeMinutes ?? ''}
            onChange={(e) => update('cookTimeMinutes', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="20"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5 px-[18px] pt-2.5">
        <div>
          <FormLabel>Portionen</FormLabel>
          <TextInput
            type="number"
            value={recipe.servings ?? ''}
            onChange={(e) => update('servings', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="2"
          />
        </div>
        <div>
          <FormLabel>Level</FormLabel>
          <select
            value={recipe.difficulty ?? ''}
            onChange={(e) => update('difficulty', (e.target.value || undefined) as Difficulty | undefined)}
            className="w-full rounded-[10px] border border-line bg-surface px-3.5 py-2.5 text-sm text-cream focus:outline-none"
          >
            <option value="">–</option>
            <option value="einfach">Einfach</option>
            <option value="mittel">Mittel</option>
            <option value="anspruchsvoll">Anspruchsvoll</option>
          </select>
        </div>
      </div>

      <h2 className="mx-[18px] mb-3 mt-6 text-[17px] font-bold text-cream">Zutaten</h2>
      {recipe.ingredients.map((ing) => (
        <div key={ing.id} className="mb-2 flex items-center gap-2 px-[18px]">
          <TextInput className="w-[62px] flex-shrink-0" value={ing.quantity ?? ''} onChange={(e) => updateIngredient(ing.id, { quantity: e.target.value ? Number(e.target.value) : null })} placeholder="250" />
          <TextInput className="w-[62px] flex-shrink-0" value={ing.unit} onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })} placeholder="g" />
          <TextInput className="min-w-0 flex-1" value={ing.name} onChange={(e) => updateIngredient(ing.id, { name: e.target.value })} placeholder="Spaghetti" />
          <button onClick={() => removeIngredient(ing.id)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-line text-cream-soft">
            <XIcon width={14} height={14} />
          </button>
        </div>
      ))}
      <button onClick={addIngredient} className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-rust py-2.5 text-xs font-bold text-rust">
        <PlusIcon width={14} height={14} /> Zutat hinzufügen
      </button>

      <h2 className="mx-[18px] mb-3 mt-6 text-[17px] font-bold text-cream">Zubereitung</h2>
      {recipe.steps.map((s, idx) => (
        <div key={s.id} className="mb-2.5 flex items-start gap-2.5 px-[18px]">
          <div className="mt-1.5 flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full bg-rust-solid text-xs font-bold text-bg">{idx + 1}</div>
          <TextArea rows={2} className="min-w-0 flex-1" value={s.text} onChange={(e) => updateStep(s.id, e.target.value)} placeholder="Beschreibung dieses Schritts…" />
          <button onClick={() => removeStep(s.id)} className="mt-1.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-line text-cream-soft">
            <XIcon width={14} height={14} />
          </button>
        </div>
      ))}
      <button onClick={addStep} className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-rust py-2.5 text-xs font-bold text-rust">
        <PlusIcon width={14} height={14} /> Schritt hinzufügen
      </button>

      <h2 className="mx-[18px] mb-3 mt-6 text-[17px] font-bold text-cream">Quelle &amp; Links</h2>
      {recipe.links.map((l) => (
        <div key={l.id} className="mb-2.5 flex items-center gap-2 px-[18px]">
          <select value={l.label} onChange={(e) => updateLink(l.id, { label: e.target.value })} className="w-[100px] flex-shrink-0 rounded-[10px] border border-line bg-surface px-2 py-2.5 text-xs text-cream focus:outline-none">
            <option>Video</option>
            <option>Instagram</option>
            <option>TikTok</option>
            <option>Webseite</option>
          </select>
          <TextInput className="min-w-0 flex-1" value={l.url} onChange={(e) => updateLink(l.id, { url: e.target.value })} placeholder="https://…" />
          <button onClick={() => removeLink(l.id)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-line text-cream-soft">
            <XIcon width={14} height={14} />
          </button>
        </div>
      ))}
      <button onClick={addLink} className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-rust py-2.5 text-xs font-bold text-rust">
        <PlusIcon width={14} height={14} /> Link hinzufügen
      </button>

      {mode === 'edit' && (
        <button
          onClick={async () => {
            if (confirm('Rezept wirklich löschen?')) {
              await repo.deleteRecipe(recipe.id)
              navigate('/rezepte', { replace: true })
            }
          }}
          className="mx-[18px] mt-8 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-line py-2.5 text-xs font-bold text-rust"
        >
          <TrashIcon width={14} height={14} /> Rezept löschen
        </button>
      )}
    </div>
  )
}
