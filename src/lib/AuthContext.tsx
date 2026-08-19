import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { repo } from '../data'
import type { AuthState } from '../data/repo'

interface Ctx {
  authState: AuthState | null
  loading: boolean
  refresh: () => Promise<void>
  refreshSilently: () => Promise<void>
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const s = await repo.getAuthState()
      setAuthState(s)
    } finally {
      setLoading(false)
    }
  }, [])

  // Aktualisiert den Auth-Status im Hintergrund, OHNE `loading` kurz auf
  // true zu setzen. `loading=true` blendet in App.tsx die komplette Shell
  // (samt Seiteninhalt + BottomNav) aus, bis sie wieder auf false springt –
  // das reißt die App bei jedem Aufruf einmal komplett neu auf (Scroll-
  // Position geht verloren, "die Sicht springt"). Für kleine Änderungen wie
  // "Name gespeichert" reicht ein stiller Refresh, der nur den Zustand
  // aktualisiert, ohne die Seite neu zu mounten. `refresh()` (mit Ladezustand)
  // bleibt für echte Zustandswechsel wie Login/Logout reserviert, bei denen
  // ohnehin die ganze Ansicht wechselt (z. B. Onboarding <-> App).
  const refreshSilently = useCallback(async () => {
    const s = await repo.getAuthState()
    setAuthState(s)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return <AuthCtx.Provider value={{ authState, loading, refresh, refreshSilently }}>{children}</AuthCtx.Provider>
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
