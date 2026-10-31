import { useEffect, useState, useCallback } from 'react'
import { useAuth as useClerkAuth, useUser } from '@clerk/react'

type AuthState = {
  token: string | undefined
  userId: string | undefined
  loading: boolean
  refreshToken: () => Promise<string | undefined>
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { user } = useUser()
  const [token, setToken] = useState<string | undefined>()

  const refreshToken = useCallback(async (): Promise<string | undefined> => {
    if (!isSignedIn) return undefined
    const t = await getToken()
    const resolved = t ?? undefined
    setToken(resolved)
    return resolved
  }, [isSignedIn, getToken])

  useEffect(() => {
    if (!isSignedIn) {
      setToken(undefined)
      return
    }
    void refreshToken()

    // Refresh 5 minutes before the 1-hour Clerk JWT expiry
    const interval = setInterval(() => void refreshToken(), 55 * 60 * 1000)

    // Refresh when the tab regains focus (handles stale tokens after device sleep)
    const handleFocus = () => void refreshToken()
    window.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', handleFocus)
    }
  }, [isSignedIn, refreshToken])

  return {
    token,
    userId: user?.id,
    loading: !isLoaded,
    refreshToken,
  }
}
