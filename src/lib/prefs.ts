const WAKE_LOCK_KEY = 'meine-rezepte-wakelock-pref'

export function getWakeLockPref(): boolean {
  const v = localStorage.getItem(WAKE_LOCK_KEY)
  return v === null ? true : v === '1'
}

export function setWakeLockPref(enabled: boolean) {
  localStorage.setItem(WAKE_LOCK_KEY, enabled ? '1' : '0')
}
