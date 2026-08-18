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
