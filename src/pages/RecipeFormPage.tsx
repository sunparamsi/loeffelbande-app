import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { repo } from '../data'
import type { Recipe, Ingredient, RecipeLink, RecipeImage, Difficulty } from '../db/types'
import { ArrowLeftIcon, CameraIcon, PlusIcon, XIcon, TrashIcon } from '../icons'
import { Chip, TextInput, TextArea, FormLabel } from '../components/ui'
import ConfirmModal from '../components/ConfirmModal'
import { useCategories } from '../lib/useCategories'
import { useAuth } from '../lib/useAuth'
import { fileToCompressedDataUrl } from '../lib/image'
import { fileToVideoDataUrl, isVideoMedia } from '../lib/media'
import { translateTexts } from '../lib/translate'
import { canEditRecipe } from '../lib/recipePermissions'
import { formatUnit } from '../lib/units'
import { suggestDietTags } from '../lib/dietTags'
import { suggestExistingTags } from '../lib/tagSuggest'
import { segmentIngredients, ingredientGroupName } from '../lib/ingredientGroups'
import { VideoIcon } from '../icons'

function emptyRecipe(): Recipe {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: '',
    description: '',
    categories: ['Hauptgericht'],
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
  const { authState } = useAuth()
  const { categories, refresh: refreshCategories } = useCategories()
  const [recipe, setRecipe] = useState<Recipe>(emptyRecipe())
  const [newCategory, setNewCategory] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [saving, setSaving] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [translateNote, setTranslateNote] = useState<string | null>(null)
  const [loadedForEdit, setLoadedForEdit] = useState(mode !== 'edit')
  const [titleMissing, setTitleMissing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mediaError, setMediaError] = useState<string | null>(null)
  const [otherRecipes, setOtherRecipes] = useState<Recipe[]>([])

  useEffect(() => {
    if (mode === 'edit' && id) {
      repo.getRecipe(id).then((r) => {
        if (r) setRecipe(r)
        setLoadedForEdit(true)
      })
    } else if (mode === 'create' && location.state?.prefill) {
      const base: Recipe = { ...emptyRecipe(), ...location.state!.prefill }
      // Anhand der importierten Zutaten schon mal einen Ernährungs-Tag
      // vorschlagen ("Vegan"/"Vegetarisch") - nur wenn noch keine Tags
      // gesetzt sind, damit ein Vorschlag nie manuell gesetzte Tags
      // überschreibt. Reiner Vorschlag zum Prüfen, siehe dietTags.ts.
      if (base.tags.length === 0 && base.ingredients.length > 0) {
        base.tags = suggestDietTags(base.ingredients)
      }
      setRecipe(base)
      // Importierte Rezepte (Foto/PDF/Webseite/Social) sind oft englisch –
      // automatisch ins Deutsche übersetzen, statt darauf zu warten, dass
      // der Nutzer manuell auf "Ins Deutsche übersetzen" tippt. Der Button
      // bleibt trotzdem sichtbar (z. B. um es nach eigenen Änderungen erneut
      // anzustoßen oder falls die Übersetzung fehlschlägt).
      const hasImportedContent = base.ingredients.length > 0 || base.steps.length > 0 || !!base.title.trim()
      if (hasImportedContent) translateRecipe(base)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, id])

  // Für Tag-Vorschläge (siehe unten) einmal alle anderen Rezepte laden - das
  // aktuell bearbeitete Rezept selbst wird ausgeschlossen, damit es beim
  // Bearbeiten nicht immer 1:1 (und damit trivial) auf sich selbst matcht.
  useEffect(() => {
    repo.listRecipes().then((all) => setOtherRecipes(all.filter((r) => r.id !== id)))
  }, [id])

  const suggestedTags = useMemo(
    () => suggestExistingTags(recipe.ingredients, otherRecipes, recipe.tags),
    [recipe.ingredients, otherRecipes, recipe.tags],
  )

  const update = <K extends keyof Recipe>(key: K, value: Recipe[K]) => setRecipe((r) => ({ ...r, [key]: value }))

  const save = async () => {
    if (!recipe.title.trim()) {
      setTitleMissing(true)
      return
    }
    setSaving(true)
    try {
      const isNew = mode === 'create'
      const toSave = { ...recipe, updatedAt: Date.now() }
      // Ersteller einmalig bei der Erstellung setzen (nie beim Bearbeiten
      // überschreiben, auch nicht wenn eine andere Person später speichert) –
      // siehe recipePermissions.ts für die Bearbeitungsrechte, die darauf
      // aufbauen, und supabase/schema.sql für die serverseitige Durchsetzung.
      if (isNew && authState) {
        toSave.createdByUserId = authState.currentUserId ?? undefined
        toSave.createdByName = authState.currentMemberName ?? undefined
      }
      await repo.saveRecipe(toSave)
      if (isNew && repo.mode === 'cloud') {
        repo.announceNewRecipe(toSave.id).catch(() => {})
      }
      navigate(`/rezepte/${toSave.id}`, { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const deleteRecipe = async () => {
    await repo.deleteRecipe(recipe.id)
    navigate('/rezepte', { replace: true })
  }

  const onPickImages = async (files: FileList | null) => {
    if (!files) return
    setMediaError(null)
    const newImages: RecipeImage[] = []
    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const dataUrl = await fileToCompressedDataUrl(file)
        newImages.push({ id: uid(), dataUrl, type: 'image' })
      } catch {
        /* Datei überspringen */
      }
    }
    update('images', [...recipe.images, ...newImages])
  }

  const onPickVideos = async (files: FileList | null) => {
    if (!files) return
    setMediaError(null)
    const newVideos: RecipeImage[] = []
    for (const file of Array.from(files).slice(0, 2)) {
      try {
        const dataUrl = await fileToVideoDataUrl(file)
        newVideos.push({ id: uid(), dataUrl, type: 'video' })
      } catch (e) {
        setMediaError(e instanceof Error ? e.message : 'Video konnte nicht hinzugefügt werden.')
      }
    }
    update('images', [...recipe.images, ...newVideos])
  }

  // Zutaten können in benannte Abschnitte/Unterrezepte gruppiert sein (z. B.
  // "Für die Sauce" bei einem Rezept mit Hauptgericht + Sauce) - siehe
  // Ingredient.groupName (db/types.ts) und segmentIngredients() (lib/
  // ingredientGroups.ts). Damit das im Array sinnvoll bleibt, müssen Zutaten
  // derselben Gruppe direkt aufeinanderfolgen; addIngredient() fügt eine neue
  // Zutat deshalb gezielt an der richtigen Stelle ein statt immer ans Ende.
  const ingredientSegments = useMemo(() => segmentIngredients(recipe.ingredients), [recipe.ingredients])

  const addIngredient = (groupName?: string) => {
    const newIng: Ingredient = { id: uid(), name: '', quantity: null, unit: '', groupName }
    if (groupName === undefined) {
      // Namenlose Hauptgruppe: direkt vor dem ersten benannten Abschnitt
      // einfügen (oder ganz ans Ende, falls es noch keinen gibt) - so bleiben
      // ungruppierte Zutaten oben, benannte Abschnitte darunter.
      const firstGroupedIdx = recipe.ingredients.findIndex((i) => ingredientGroupName(i) !== undefined)
      const insertAt = firstGroupedIdx === -1 ? recipe.ingredients.length : firstGroupedIdx
      const next = [...recipe.ingredients]
      next.splice(insertAt, 0, newIng)
      update('ingredients', next)
    } else {
      // Benannter Abschnitt: direkt nach der letzten Zutat dieses Abschnitts
      // einfügen, damit die Gruppe zusammenhängend bleibt.
      let lastIdxOfGroup = -1
      recipe.ingredients.forEach((i, idx) => {
        if (ingredientGroupName(i) === groupName) lastIdxOfGroup = idx
      })
      const insertAt = lastIdxOfGroup === -1 ? recipe.ingredients.length : lastIdxOfGroup + 1
      const next = [...recipe.ingredients]
      next.splice(insertAt, 0, newIng)
      update('ingredients', next)
    }
  }
  const updateIngredient = (iid: string, patch: Partial<Ingredient>) =>
    update('ingredients', recipe.ingredients.map((i) => (i.id === iid ? { ...i, ...patch } : i)))
  const removeIngredient = (iid: string) => update('ingredients', recipe.ingredients.filter((i) => i.id !== iid))

  // Neuen, leeren Abschnitt anlegen (mit eindeutigem Vorschlagsnamen) und
  // gleich die erste Zutat dafür anlegen - ein Abschnitt ohne Zutaten ergibt
  // sich in diesem Modell nicht von selbst (siehe segmentIngredients()), da
  // Gruppen rein aus den Zutaten selbst abgeleitet werden.
  const addSection = () => {
    const existing = new Set(recipe.ingredients.map((i) => ingredientGroupName(i)).filter(Boolean))
    let name = 'Abschnitt'
    let n = 2
    while (existing.has(name)) {
      name = `Abschnitt ${n}`
      n++
    }
    addIngredient(name)
  }
  // Alle Zutaten eines Abschnitts umbenennen (sie teilen sich denselben
  // groupName-String).
  const renameGroup = (oldName: string, newName: string) =>
    update('ingredients', recipe.ingredients.map((i) => (ingredientGroupName(i) === oldName ? { ...i, groupName: newName } : i)))
  // Abschnitt entfernen, OHNE die Zutaten selbst zu löschen - sie werden nur
  // ungruppiert (weniger destruktiv; einzelne Zutaten lassen sich bei Bedarf
  // weiterhin über ihr eigenes X entfernen).
  const ungroupSection = (name: string) =>
    update('ingredients', recipe.ingredients.map((i) => (ingredientGroupName(i) === name ? { ...i, groupName: undefined } : i)))

  const addStep = () => update('steps', [...recipe.steps, { id: uid(), text: '' }])
  const updateStep = (sid: string, text: string) => update('steps', recipe.steps.map((s) => (s.id === sid ? { ...s, text } : s)))
  const removeStep = (sid: string) => update('steps', recipe.steps.filter((s) => s.id !== sid))

  const addLink = () => update('links', [...recipe.links, { id: uid(), label: 'Video', url: '' }])
  const updateLink = (lid: string, patch: Partial<RecipeLink>) =>
    update('links', recipe.links.map((l) => (l.id === lid ? { ...l, ...patch } : l)))
  const removeLink = (lid: string) => update('links', recipe.links.filter((l) => l.id !== lid))

  // Nimmt einen Rezept-Snapshot (Titel, Beschreibung, Zutatennamen,
  // Zubereitungsschritte – inkl. Kochanweisung) und übersetzt alle
  // nicht-leeren Felder gemeinsam ins Deutsche. Wird sowohl automatisch
  // direkt nach einem Import aufgerufen als auch über den manuellen Button.
  const translateRecipe = async (base: Recipe) => {
    setTranslating(true)
    setTranslateNote(null)
    try {
      // Reihenfolge merken: Titel, Beschreibung, dann alle Zutatennamen, dann
      // alle Schritte (Kochanweisung) – so lassen sich die Übersetzungen
      // hinterher wieder an der gleichen Position einsetzen.
      const texts: string[] = [base.title, base.description ?? '', ...base.ingredients.map((i) => i.name), ...base.steps.map((s) => s.text)]
      const nonEmptyIdx = texts.map((t, i) => (t.trim() ? i : -1)).filter((i) => i >= 0)
      const toSend = nonEmptyIdx.map((i) => texts[i])
      if (toSend.length === 0) return

      const { translations, detectedLangs } = await translateTexts(toSend, 'DE')
      // Nur überspringen, wenn WIRKLICH jeder gesendete Text schon als
      // Deutsch erkannt wurde. Ein importiertes Rezept ist oft sprachlich
      // gemischt (z. B. Titel bereits eingedeutscht, Zutaten/Schritte aber
      // noch englisch) – ein einzelner deutscher Titel darf die Übersetzung
      // von Zutaten und Kochanweisung nicht verhindern (das war der Grund,
      // warum bisher nach dem Import oft nur der Titel übersetzt wurde).
      const allAlreadyGerman = detectedLangs.length > 0 && detectedLangs.every((l) => l?.toUpperCase() === 'DE')
      if (allAlreadyGerman) {
        setTranslateNote('Rezept scheint schon auf Deutsch zu sein – nichts geändert.')
        return
      }

      const result = [...texts]
      nonEmptyIdx.forEach((origIdx, sendIdx) => {
        result[origIdx] = translations[sendIdx] ?? texts[origIdx]
      })
      const [newTitle, newDescription, ...rest] = result
      const newIngredients = base.ingredients.map((ing, i) => ({ ...ing, name: rest[i] }))
      const newSteps = base.steps.map((s, i) => ({ ...s, text: rest[base.ingredients.length + i] }))

      setRecipe((r) => ({ ...r, title: newTitle, description: newDescription, ingredients: newIngredients, steps: newSteps }))
      setTranslateNote('Ins Deutsche übersetzt – bitte kurz gegenprüfen.')
    } catch (e) {
      setTranslateNote(e instanceof Error ? e.message : 'Übersetzung fehlgeschlagen.')
    } finally {
      setTranslating(false)
    }
  }

  // Bearbeitungsrecht erst prüfen, sobald das Rezept im Edit-Modus geladen
  // ist (sonst würde kurz das leere emptyRecipe() fälschlich "erlaubt" sein).
  if (mode === 'edit' && loadedForEdit && !canEditRecipe(recipe, authState)) {
    return (
      <div className="pb-10">
        <div className="flex items-center justify-between px-[18px] py-[18px]">
          <button onClick={() => navigate(-1)} className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface text-cream shadow-card-sm">
            <ArrowLeftIcon width={16} height={16} />
          </button>
          <h1 className="text-lg font-extrabold text-cream">Rezept bearbeiten</h1>
          <div className="w-[34px]" />
        </div>
        <div className="mx-[18px] rounded-2xl border border-dashed border-line p-6 text-center text-[12.5px] text-cream-soft">
          Nur {recipe.createdByName ? <b className="text-cream">{recipe.createdByName}</b> : 'die Person, die dieses Rezept angelegt hat'} oder der Besitzer des Haushalts
          können dieses Rezept bearbeiten oder löschen.
        </div>
      </div>
    )
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
            onClick={() => translateRecipe(recipe)}
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
          <div key={img.id} className="relative h-[70px] w-[70px] overflow-hidden rounded-[10px] bg-surface-2">
            {isVideoMedia(img) ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={img.dataUrl} className="h-full w-full object-cover" muted playsInline />
            ) : (
              <img src={img.dataUrl} className="h-full w-full object-cover" alt="" />
            )}
            {isVideoMedia(img) && (
              <div className="pointer-events-none absolute bottom-1 left-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white">
                <VideoIcon width={9} height={9} />
              </div>
            )}
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
        <label className="flex h-[70px] w-[70px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line text-cream-soft">
          <VideoIcon width={18} height={18} />
          <span className="text-[9px]">Video</span>
          <input type="file" accept="video/*" multiple className="hidden" onChange={(e) => onPickVideos(e.target.files)} />
        </label>
      </div>
      {mediaError && <div className="mx-[18px] mt-2 rounded-xl border border-rust/40 bg-rust/10 px-3.5 py-2.5 text-[11.5px] text-rust">{mediaError}</div>}

      <div className="px-[18px] pt-4">
        <FormLabel>Kurzbeschreibung</FormLabel>
        <TextArea rows={2} value={recipe.description} onChange={(e) => update('description', e.target.value)} placeholder="Ein bis zwei Sätze, worum es geht…" />
      </div>

      <div className="px-[18px] pt-4">
        <FormLabel>Kategorie{recipe.categories.length > 1 ? ` (${recipe.categories.length} ausgewählt)` : ''}</FormLabel>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Chip
              key={c}
              selected={recipe.categories.includes(c)}
              onClick={() => {
                const has = recipe.categories.includes(c)
                if (has && recipe.categories.length === 1) return // mindestens eine Kategorie muss bestehen bleiben
                update('categories', has ? recipe.categories.filter((x) => x !== c) : [...recipe.categories, c])
              }}
            >
              {c}
            </Chip>
          ))}
          {addingCategory ? (
            <input
              autoFocus
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newCategory.trim()) {
                  await repo.addCategory(newCategory.trim())
                  update('categories', [...recipe.categories, newCategory.trim()])
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
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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
        {suggestedTags.length > 0 && (
          <div className="mt-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wider text-cream-soft">
              Vorschläge aufgrund der Zutaten
            </div>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {suggestedTags.map((t) => (
                <Chip key={t} onClick={() => update('tags', [...recipe.tags, t])}>
                  + {t}
                </Chip>
              ))}
            </div>
          </div>
        )}
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
      {ingredientSegments.map((seg, segIdx) => (
        <div key={seg.groupName ?? `__main_${segIdx}`}>
          {seg.groupName && (
            <div className="mx-[18px] mb-2 mt-4 flex items-center gap-2">
              <input
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                value={seg.groupName}
                onChange={(e) => renameGroup(seg.groupName!, e.target.value)}
                placeholder="Abschnittsname…"
                className="min-w-0 flex-1 border-b border-dashed border-rust bg-transparent py-1 text-[12px] font-bold uppercase tracking-wide text-rust focus:outline-none"
              />
              <button
                onClick={() => ungroupSection(seg.groupName!)}
                aria-label={`Abschnitt „${seg.groupName}" entfernen`}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-line text-cream-soft"
              >
                <XIcon width={12} height={12} />
              </button>
            </div>
          )}
          {seg.items.map((ing) => (
            <div key={ing.id} className="mb-2 flex items-center gap-2 px-[18px]">
              <TextInput className="w-[62px] flex-shrink-0" value={ing.quantity ?? ''} onChange={(e) => updateIngredient(ing.id, { quantity: e.target.value ? Number(e.target.value) : null })} placeholder="250" />
              <TextInput
                className="w-[62px] flex-shrink-0"
                value={ing.unit}
                onChange={(e) => updateIngredient(ing.id, { unit: e.target.value })}
                onBlur={(e) => updateIngredient(ing.id, { unit: formatUnit(e.target.value) })}
                placeholder="g"
              />
              <TextInput className="min-w-0 flex-1" value={ing.name} onChange={(e) => updateIngredient(ing.id, { name: e.target.value })} placeholder="Spaghetti" />
              <button onClick={() => removeIngredient(ing.id)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border border-line text-cream-soft">
                <XIcon width={14} height={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => addIngredient(seg.groupName)}
            className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-rust py-2.5 text-xs font-bold text-rust"
          >
            <PlusIcon width={14} height={14} /> Zutat{seg.groupName ? ` zu „${seg.groupName}"` : ''} hinzufügen
          </button>
        </div>
      ))}
      {recipe.ingredients.length === 0 && (
        <button onClick={() => addIngredient()} className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-rust py-2.5 text-xs font-bold text-rust">
          <PlusIcon width={14} height={14} /> Zutat hinzufügen
        </button>
      )}
      <button onClick={addSection} className="mx-[18px] mb-2 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-line py-2.5 text-xs font-bold text-cream-soft">
        <PlusIcon width={14} height={14} /> Abschnitt hinzufügen (z. B. „Für die Sauce")
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
          onClick={() => setConfirmDelete(true)}
          className="mx-[18px] mt-8 flex w-[calc(100%-36px)] items-center justify-center gap-1.5 rounded-[10px] border border-line py-2.5 text-xs font-bold text-rust"
        >
          <TrashIcon width={14} height={14} /> Rezept löschen
        </button>
      )}

      {titleMissing && <ConfirmModal title="Titel fehlt" message="Bitte einen Titel angeben." confirmLabel="OK" onConfirm={() => setTitleMissing(false)} />}

      {confirmDelete && (
        <ConfirmModal
          title="Rezept löschen"
          message="Rezept wirklich löschen? Das kann nicht rückgängig gemacht werden."
          confirmLabel="Löschen"
          danger
          onConfirm={deleteRecipe}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
