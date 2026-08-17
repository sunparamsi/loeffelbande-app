import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { repo } from '../data'
import type { AuthState } from '../data/repo'

interface Ctx {
  authState: AuthState | null
  loading: boolean
  refresh: () => Promise<void>
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

  useEffect(() => {
    refresh()
  }, [refresh])

  return <AuthCtx.Provider value={{ authState, loading, refresh }}>{children}</AuthCtx.Provider>
}

export function useAuth(): Ctx {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
