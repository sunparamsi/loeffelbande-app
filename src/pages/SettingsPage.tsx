import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { repo } from '../data'
import { useAuth } from '../lib/useAuth'
import { useCategories } from '../lib/useCategories'
import { getWakeLockPref, setWakeLockPref, getFileImportPref, setFileImportPref, getMemberAvatar, setMemberAvatar, memberAvatarKey, getThemePref, setThemePref, type ThemePref } from '../lib/prefs'
import { applyThemePref } from '../lib/theme'
import { fileToCompressedDataUrl, fileToDataUrl } from '../lib/image'
import { GroupLabel, RowCard, Chip } from '../components/ui'
import { XIcon, PlusIcon, CameraIcon, LogoutIcon } from '../icons'
import AvatarCropModal from '../components/AvatarCropModal'

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-[22px] w-[38px] flex-shrink-0 rounded-full border transition-colors ${on ? 'border-sage bg-sage' : 'border-line bg-surface-2'}`}
    >
      <span className={`absolute top-[2px] h-[16px] w-[16px] rounded-full bg-bg transition-all ${on ? 'right-[2px]' : 'left-[2px]'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { authState, refresh, refreshSilently } = useAuth()
  const { categories, refresh: refreshCategories } = useCategories()
  const [logo, setLogo] = useState<string | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const [pushOn, setPushOn] = useState(false)
  const [wakeLock, setWakeLock] = useState(getWakeLockPref())
  const [fileImport, setFileImport] = useState(getFileImportPref())
  const [pushStatus, setPushStatus] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [savingName, setSavingName] = useState(false)
  const [avatarToCrop, setAvatarToCrop] = useState<string | null>(null)
  const scrollBeforeEditRef = useRef<number | null>(null)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const [themePref, setThemePrefState] = useState<ThemePref>(getThemePref())

  // Lädt alle Rezepte als eine JSON-Datei herunter - dient als Sicherung,
  // insbesondere im Solo-Modus, wo die Rezepte nur lokal auf diesem Gerät
  // liegen (z. B. iOS löscht die App-Daten oft, wenn man das Homescreen-Icon
  // entfernt und neu hinzufügt). Das exportierte Format entspricht genau dem,
  // was "Aus Datei importieren" (JSON) wieder einliest - also ein echtes
  // Backup/Restore-Paar, keine Einbahnstraße.
  const exportRecipes = async () => {
    setExportStatus('Rezepte werden vorbereitet…')
    try {
      const recipes = await repo.listRecipes()
      if (recipes.length === 0) {
        setExportStatus('Keine Rezepte zum Sichern vorhanden.')
        return
      }
      const blob = new Blob([JSON.stringify(recipes, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateLabel = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `loeffelbande-rezepte-${dateLabel}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setExportStatus(`${recipes.length} Rezepte heruntergeladen.`)
    } catch {
      setExportStatus('Sicherung ist fehlgeschlagen. Bitte erneut versuchen.')
    }
  }

  const avatarKey = memberAvatarKey(authState?.household?.id, authState?.currentMemberName)

  useEffect(() => {
    repo.getSettings().then((s) => setLogo(s.logoDataUrl))
    if (repo.mode === 'cloud') repo.isPushSubscribed().then(setPushOn)
  }, [])

  useEffect(() => {
    setAvatar(getMemberAvatar(avatarKey))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avatarKey])

  const onPickLogo = async (file: File) => {
    const dataUrl = await fileToCompressedDataUrl(file, 512, 0.85)
    await repo.setLogo(dataUrl)
    setLogo(dataUrl)
  }

  const removeLogo = async () => {
    await repo.setLogo(null)
    setLogo(null)
  }

  const onPickAvatar = async (file: File) => {
    // Bild unverändert (in voller Auflösung) einlesen und erst im
    // Zuschneide-Dialog anzeigen, statt es ungefragt komplett zu übernehmen –
    // so kann der gewünschte Ausschnitt frei gewählt werden.
    const dataUrl = await fileToDataUrl(file)
    setAvatarToCrop(dataUrl)
  }

  const onCropConfirm = (croppedDataUrl: string) => {
    setMemberAvatar(avatarKey, croppedDataUrl)
    setAvatar(croppedDataUrl)
    setAvatarToCrop(null)
  }

  const removeAvatar = () => {
    setMemberAvatar(avatarKey, null)
    setAvatar(null)
  }

  const addCategory = async () => {
    if (!newCat.trim()) return
    await repo.addCategory(newCat.trim())
    setNewCat('')
    refreshCategories()
  }

  const removeCategory = async (c: string) => {
    await repo.removeCategory(c)
    refreshCategories()
  }

  const togglePush = async () => {
    if (pushOn) {
      await repo.unsubscribeFromPush()
      setPushOn(false)
    } else {
      const res = await repo.subscribeToPush()
      if (res.ok) setPushOn(true)
      else setPushStatus(res.error)
    }
  }

  const chooseTheme = (pref: ThemePref) => {
    setThemePrefState(pref)
    setThemePref(pref)
    applyThemePref()
  }

  const toggleWakeLock = () => {
    const next = !wakeLock
    setWakeLock(next)
    setWakeLockPref(next)
  }

  const toggleFileImport = () => {
    const next = !fileImport
    setFileImport(next)
    setFileImportPref(next)
  }

  // Das Eingabefeld beim Bearbeiten hat autoFocus, wodurch der Browser die
  // Ansicht zum Feld hin scrollt ("springt die Sicht ran") – Scroll-Position
  // davor merken, damit wir nach dem Speichern/Abbrechen wieder genau dorthin
  // zurückspringen können, statt dass die Ansicht oben "hängen bleibt".
  const startEditName = () => {
    scrollBeforeEditRef.current = window.scrollY
    setNameDraft(authState?.currentMemberName ?? '')
    setNameError(null)
    setEditingName(true)
  }

  const restoreScrollAfterEdit = () => {
    const y = scrollBeforeEditRef.current
    if (y == null) return
    scrollBeforeEditRef.current = null
    // Erst im nächsten Frame zurückspringen, damit das DOM schon auf die
    // (kürzere) Nicht-Editier-Ansicht umgestellt ist.
    requestAnimationFrame(() => window.scrollTo(0, y))
  }

  const cancelEditName = () => {
    setEditingName(false)
    restoreScrollAfterEdit()
  }

  const saveName = async () => {
    if (!nameDraft.trim()) {
      setNameError('Bitte einen Namen angeben.')
      return
    }
    setSavingName(true)
    setNameError(null)
    try {
      const res = await repo.updateDisplayName(nameDraft.trim())
      if (res.ok) {
        setEditingName(false)
        // Still (ohne Lade-/Splash-Zustand) aktualisieren, damit die Seite
        // nicht komplett neu mountet und die Ansicht nach oben springt.
        await refreshSilently()
        restoreScrollAfterEdit()
      } else {
        setNameError(res.error)
      }
    } finally {
      setSavingName(false)
    }
  }

  const logout = async () => {
    await repo.logout()
    await refresh()
    navigate('/')
  }

  return (
    <div className="pb-10">
      <div className="px-[18px] pb-2.5 pt-5">
        <h1 className="text-[21px] font-extrabold text-cream">Einstellungen</h1>
      </div>

      <GroupLabel>Erscheinungsbild</GroupLabel>
      <div className="mx-[18px] mb-1 flex gap-2">
        <Chip selected={themePref === 'system'} onClick={() => chooseTheme('system')}>
          System
        </Chip>
        <Chip selected={themePref === 'light'} onClick={() => chooseTheme('light')}>
          Hell
        </Chip>
        <Chip selected={themePref === 'dark'} onClick={() => chooseTheme('dark')}>
          Dunkel
        </Chip>
      </div>
      <div className="mx-[18px] mb-1 pb-2 text-[11px] text-cream-soft">
        "System" folgt automatisch der Einstellung deines Geräts.
      </div>

      <GroupLabel>App-Logo</GroupLabel>
      <RowCard>
        <div className="flex items-center gap-3">
          {logo ? (
            <img src={logo} className="h-11 w-11 rounded-xl object-cover" alt="Logo" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 text-cream-soft">
              <CameraIcon width={20} height={20} />
            </div>
          )}
          <div className="text-xs text-cream-soft">{logo ? 'Aktuelles Logo' : 'Noch kein Logo hochgeladen'}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <label className="cursor-pointer text-xs font-bold text-rust">
            Hochladen
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPickLogo(e.target.files[0])} />
          </label>
          {logo && (
            <button onClick={removeLogo} className="text-[11px] text-cream-soft">
              Entfernen
            </button>
          )}
        </div>
      </RowCard>
      <div className="mx-[18px] mb-1 pb-2 text-[11px] text-cream-soft">
        Erscheint oben in der App{repo.mode === 'cloud' ? ' und ist für alle Haushaltsmitglieder sichtbar.' : '.'}
      </div>

      <GroupLabel>Profil</GroupLabel>
      {editingName ? (
        <div className="mx-[18px] mb-2 rounded-[10px] border border-dashed border-rust px-3 py-2.5">
          <input
            autoFocus
            autoCorrect="off"
            autoCapitalize="words"
            spellCheck={false}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && saveName()}
            placeholder="Dein Name…"
            className="w-full min-w-0 bg-transparent text-[13px] text-cream placeholder:text-rust/70 focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={saveName}
              disabled={savingName}
              className="rounded-full bg-rust-solid px-3.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {savingName ? 'Speichere…' : 'Speichern'}
            </button>
            <button onClick={cancelEditName} className="rounded-full border border-line px-3.5 py-1.5 text-[11px] font-bold text-cream-soft">
              Abbrechen
            </button>
          </div>
          {nameError && <div className="mt-1.5 text-[11px] text-rust">{nameError}</div>}
        </div>
      ) : (
        <RowCard onClick={startEditName}>
          <div>
            {authState?.currentMemberName ?? 'Du'} {repo.mode === 'cloud' && <span className="text-cream-soft">· {authState?.currentRole === 'owner' ? 'Besitzer' : authState?.currentRole === 'editor' ? 'Bearbeiter' : 'Betrachter'}</span>}
          </div>
          {repo.mode === 'cloud' && <div className="rounded-md bg-surface-2 px-2.5 py-1 text-[11.5px] text-cream-soft">{authState?.household?.name}</div>}
          <div className="text-[11px] font-bold text-rust">Bearbeiten</div>
        </RowCard>
      )}

      <GroupLabel>Dein Profilbild</GroupLabel>
      <RowCard>
        <div className="flex items-center gap-3">
          {avatar ? (
            <img src={avatar} className="h-11 w-11 rounded-full border-2 border-rust object-cover" alt="Profilbild" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-rust bg-[color-mix(in_srgb,var(--color-rust)_14%,var(--color-surface))] text-sm font-bold text-rust">
              {(authState?.currentMemberName ?? '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-xs text-cream-soft">{avatar ? 'Dein aktuelles Foto' : 'Noch kein Profilbild'}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <label className="cursor-pointer text-xs font-bold text-rust">
            Hochladen
            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onPickAvatar(e.target.files[0])} />
          </label>
          {avatar && (
            <button onClick={removeAvatar} className="text-[11px] text-cream-soft">
              Entfernen
            </button>
          )}
        </div>
      </RowCard>
      <div className="mx-[18px] mb-1 pb-2 text-[11px] text-cream-soft">
        Erscheint oben in der App neben deinem Namen. Wird nur auf diesem Gerät gespeichert, nicht mit anderen Haushaltsmitgliedern synchronisiert.
      </div>

      <GroupLabel>Kategorien verwalten</GroupLabel>
      {categories.map((c) => (
        <RowCard key={c}>
          <div>{c}</div>
          <button onClick={() => removeCategory(c)} className="text-cream-soft">
            <XIcon width={15} height={15} />
          </button>
        </RowCard>
      ))}
      <div className="mx-[18px] mb-2 flex items-center gap-2 rounded-[10px] border border-dashed border-rust px-3 py-2.5">
        <input
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addCategory()}
          placeholder="Neue Kategorie…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-cream placeholder:text-rust/70 focus:outline-none"
        />
        <button onClick={addCategory} className="text-rust">
          <PlusIcon width={16} height={16} />
        </button>
      </div>

      <GroupLabel>Benachrichtigungen</GroupLabel>
      <RowCard>
        <div>
          <div>Push-Benachrichtigungen</div>
          <div className="mt-0.5 text-[11px] text-cream-soft">z. B. wenn dich jemand auf ein Rezept markiert</div>
        </div>
        <Toggle on={pushOn} onClick={togglePush} />
      </RowCard>
      {pushStatus && <div className="mx-[18px] mb-2 text-[11px] text-cream-soft">{pushStatus}</div>}
      {repo.mode !== 'cloud' && <div className="mx-[18px] mb-2 text-[11px] text-cream-soft">Nur im Verbunden-Modus verfügbar.</div>}

      <GroupLabel>Kochmodus</GroupLabel>
      <RowCard>
        <div>
          <div>Bildschirm bleibt an</div>
          <div className="mt-0.5 text-[11px] text-cream-soft">Verhindert Sperrbildschirm während des Kochens</div>
        </div>
        <Toggle on={wakeLock} onClick={toggleWakeLock} />
      </RowCard>

      <GroupLabel>Rezept-Import</GroupLabel>
      <RowCard>
        <div>
          <div>Aus Datei importieren</div>
          <div className="mt-0.5 text-[11px] text-cream-soft">Zeigt bei "Neues Rezept" die Option, Rezepte aus einer JSON- oder CSV-Datei einzulesen (z. B. Export aus einer anderen Rezept-App)</div>
        </div>
        <Toggle on={fileImport} onClick={toggleFileImport} />
      </RowCard>

      <GroupLabel>Sicherung</GroupLabel>
      <RowCard onClick={exportRecipes}>
        <div>
          <div>Alle Rezepte als Datei sichern</div>
          <div className="mt-0.5 text-[11px] text-cream-soft">
            {repo.mode === 'cloud'
              ? 'Lädt alle Rezepte als Datei herunter, z. B. als zusätzliche Sicherung.'
              : 'Im Solo-Modus liegen deine Rezepte nur auf diesem Gerät. Lädt sie als Datei herunter (später über "Aus Datei importieren" wiederherstellbar) – z. B. bevor du das App-Icon vom Homescreen entfernst, da dabei auf dem iPhone alle Daten der App verloren gehen können.'}
          </div>
        </div>
      </RowCard>
      {exportStatus && <div className="mx-[18px] mb-2 text-[11px] text-cream-soft">{exportStatus}</div>}

      <GroupLabel>Haushalt &amp; Modus</GroupLabel>
      <RowCard>
        <div>Modus</div>
        <div className="rounded-md bg-surface-2 px-2.5 py-1 text-[11.5px] text-cream-soft">{repo.mode === 'cloud' ? 'Verbunden (Cloud)' : 'Solo (lokal)'}</div>
      </RowCard>
      {repo.mode === 'cloud' && (
        <RowCard onClick={logout}>
          <div className="flex items-center gap-2 text-rust">
            <LogoutIcon width={15} height={15} /> Abmelden
          </div>
        </RowCard>
      )}

      <GroupLabel>Über die App</GroupLabel>
      <RowCard>
        <div>Version</div>
        <div className="rounded-md bg-surface-2 px-2.5 py-1 text-[11.5px] text-cream-soft">1.0.0</div>
      </RowCard>

      {avatarToCrop && <AvatarCropModal imageSrc={avatarToCrop} onCancel={() => setAvatarToCrop(null)} onConfirm={onCropConfirm} />}
    </div>
  )
}
