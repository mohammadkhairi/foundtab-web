import { useState, useEffect, useCallback, useMemo } from 'react'

const TOKEN_KEY = 'ft-auth-token'

type JwtPayload = { sub: string; orgId?: string; email: string; role: string; exp: number }

function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as JwtPayload
  } catch { return null }
}

function isExpired(payload: JwtPayload): boolean {
  return payload.exp * 1000 < Date.now()
}

export function getStoredToken(): string | undefined {
  const t = localStorage.getItem(TOKEN_KEY)
  if (!t) return undefined
  const p = decodeJwt(t)
  if (!p || isExpired(p)) return undefined
  return t
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

type AuthState = {
  token: string | undefined
  userId: string | undefined
  loading: boolean
  refreshToken: () => Promise<string | undefined>
}

export function useAuth(): AuthState {
  const [token, setToken] = useState<string | undefined>(getStoredToken)

  const refreshToken = useCallback(async (): Promise<string | undefined> => {
    const t = getStoredToken()
    setToken(t)
    return t
  }, [])

  useEffect(() => {
    // Clean up any expired token sitting in storage on mount
    const raw = localStorage.getItem(TOKEN_KEY)
    if (raw) {
      const p = decodeJwt(raw)
      if (!p || isExpired(p)) localStorage.removeItem(TOKEN_KEY)
    }
  }, [])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return
      const fresh = getStoredToken()
      // Only update state when the value actually changed to avoid re-renders
      setToken((prev) => (prev === fresh ? prev : fresh))
    }
    window.addEventListener('visibilitychange', handleVisibility)
    return () => window.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const userId = useMemo(() => (token ? decodeJwt(token)?.sub : undefined), [token])

  return { token, userId, loading: false, refreshToken }
}
