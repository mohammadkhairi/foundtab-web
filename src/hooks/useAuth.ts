import { useEffect, useState } from 'react'

declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> }
      user?: { id: string }
    }
  }
}

type AuthState = {
  token: string | undefined
  userId: string | undefined
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ token: undefined, userId: undefined, loading: true })

  useEffect(() => {
    async function load() {
      const clerk = window.Clerk
      if (!clerk?.session) {
        setState({ token: undefined, userId: undefined, loading: false })
        return
      }
      const token = (await clerk.session.getToken()) ?? undefined
      setState({ token, userId: clerk.user?.id, loading: false })
    }

    // Clerk loads asynchronously — wait for it
    const interval = setInterval(() => {
      if (window.Clerk?.session !== undefined) {
        clearInterval(interval)
        void load()
      }
    }, 100)

    // Bail out after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(interval)
      setState({ token: undefined, userId: undefined, loading: false })
    }, 5_000)

    return () => {
      clearInterval(interval)
      clearTimeout(timeout)
    }
  }, [])

  return state
}
