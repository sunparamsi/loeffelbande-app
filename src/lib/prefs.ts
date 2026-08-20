const WAKE_LOCK_KEY = 'meine-rezepte-wakelock-pref'

export function getWakeLockPref(): boolean {
  const v = localStorage.getItem(WAKE_LOCK_KEY)
  return v === null ? true : v === '1'
}

export function setWakeLockPref(enabled: boolean) {
  localStorage.setItem(WAKE_LOCK_KEY, enabled ? '1' : '0')
}

/** Profilbild pro Person — bewusst nur lokal auf diesem Gerät gespeichert (kein
 * Sync über Haushalte hinweg), damit dafür keine Schema-Änderung in Supabase
 * nötig ist. `key` sollte Haushalt+Name (oder 'solo') eindeutig identifizieren. */
function avatarKey(key: string) {
  return `loeffelbande-avatar-${key}`
}

export function getMemberAvatar(key: string): string | null {
  return localStorage.getItem(avatarKey(key))
}

export function setMemberAvatar(key: string, dataUrl: string | null) {
  if (dataUrl) localStorage.setItem(avatarKey(key), dataUrl)
  else localStorage.removeItem(avatarKey(key))
}

export function memberAvatarKey(householdId: string | null | undefined, memberName: string | null | undefined) {
  return `${householdId ?? 'solo'}::${memberName ?? 'me'}`
}

/** Anzeigename im Solo-Modus — es gibt dort keine Haushaltsmitglieder-Tabelle,
 * daher nur lokal auf diesem Gerät gespeichert. */
const SOLO_NAME_KEY = 'loeffelbande-solo-name'

export function getSoloDisplayName(): string | null {
  return localStorage.getItem(SOLO_NAME_KEY)
}

export function setSoloDisplayName(name: string | null) {
  if (name && name.trim()) localStorage.setItem(SOLO_NAME_KEY, name.trim())
  else localStorage.removeItem(SOLO_NAME_KEY)
}

/** Der JSON/CSV-Datei-Import ist ein Nischen-Feature (Massenimport aus
 * anderen Rezept-Apps oder eigenen Tabellen) und für die meisten Nutzer nicht
 * relevant — daher standardmäßig ausgeblendet in "Neues Rezept" und nur nach
 * bewusstem Einschalten in den Einstellungen sichtbar. */
const FILE_IMPORT_KEY = 'loeffelbande-file-import-pref'

export function getFileImportPref(): boolean {
  return localStorage.getItem(FILE_IMPORT_KEY) === '1'
}

export function setFileImportPref(enabled: boolean) {
  localStorage.setItem(FILE_IMPORT_KEY, enabled ? '1' : '0')
}

/** Zuletzt gewählter Kategorie-/Favoriten-Filter auf der Rezepte-Übersicht –
 * gemerkt, damit er beim Wechsel auf einen anderen Tab und zurück erhalten
 * bleibt, statt sich beim Neu-Mounten der Seite immer auf "Alle" zurückzusetzen. */
const RECIPE_LIST_FILTER_KEY = 'loeffelbande-recipe-list-filter'

export function getRecipeListFilter(): string | null {
  return localStorage.getItem(RECIPE_LIST_FILTER_KEY)
}

export function setRecipeListFilter(filter: string) {
  localStorage.setItem(RECIPE_LIST_FILTER_KEY, filter)
}

/** "Nur meine Rezepte"-Filter auf der Rezepte-Übersicht, ebenfalls gemerkt. */
const RECIPE_LIST_ONLY_MINE_KEY = 'loeffelbande-recipe-list-only-mine'

export function getRecipeListOnlyMine(): boolean {
  return localStorage.getItem(RECIPE_LIST_ONLY_MINE_KEY) === '1'
}

export function setRecipeListOnlyMine(enabled: boolean) {
  localStorage.setItem(RECIPE_LIST_ONLY_MINE_KEY, enabled ? '1' : '0')
}
