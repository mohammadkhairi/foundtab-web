import { useEffect, useState } from 'react'
import { useAuth as useClerkAuth, useUser } from '@clerk/react'

type AuthState = {
  token: string | undefined
  userId: string | undefined
  loading: boolean
}

export function useAuth(): AuthState {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth()
  const { user } = useUser()
  const [token, setToken] = useState<string | undefined>()

  useEffect(() => {
    if (!isSignedIn) {
      setToken(undefined)
      return
    }
    void getToken().then((t) => setToken(t ?? undefined))
  }, [isSignedIn, getToken])

  return {
    token,
    userId: user?.id,
    loading: !isLoaded,
  }
}
