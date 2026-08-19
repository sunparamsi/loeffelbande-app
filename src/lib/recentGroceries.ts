/** Merkt sich zuletzt hinzugefügte Artikel (nur Namen, MRU-Reihenfolge)
 * lokal auf diesem Gerät – für eine "Zuletzt verwendet"-Kachelreihe beim
 * Hinzufügen (à la Bring!), damit häufig gekaufte/verbrauchte Dinge mit
 * einem Tipp wieder hinzugefügt werden können, ohne sie erneut einzutippen. */
const MAX_RECENT = 14

function key(storageKey: string) {
  return `loeffelbande-recent-${storageKey}`
}

export function getRecentNames(storageKey: string): string[] {
  try {
    const raw = localStorage.getItem(key(storageKey))
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export function addRecentName(storageKey: string, name: string) {
  if (!name.trim()) return
  const current = getRecentNames(storageKey)
  const next = [name, ...current.filter((n) => n.toLowerCase() !== name.toLowerCase())].slice(0, MAX_RECENT)
  try {
    localStorage.setItem(key(storageKey), JSON.stringify(next))
  } catch {
    /* Speicher voll o.ä. – nicht kritisch, einfach überspringen */
  }
}
